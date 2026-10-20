-- Tighten household membership RLS
--
-- 1. "Owners/admins can add members" ended in `OR user_id = auth.uid()`, so any
--    signed-in user could insert themselves into any household they knew the
--    UUID of, with any role including 'owner', and skip the invite code. A
--    self-insert is now only allowed for the household's owner adding their
--    own 'owner' row right after creating it. Joining by invite goes through
--    join_household_by_invite(), which is SECURITY DEFINER and doesn't need it.
--
-- 2. "Members can view household members" queried household_members inside its
--    own policy, which Postgres rejects with "infinite recursion detected in
--    policy for relation household_members". Every policy that checks
--    membership (households, food items, shopping lists, recipes) failed the
--    same way. Membership checks now go through SECURITY DEFINER helpers that
--    read the table without RLS.
--
-- 3. "Members can view household" only matched existing members, so creating a
--    household with insert().select() failed: the creator isn't a member until
--    the next request. Owners can now always see their own household.

-- ============================================================================
-- HELPERS
-- ============================================================================

-- Not in the API's exposed schemas, so these can't be called over RPC
CREATE SCHEMA IF NOT EXISTS private;

-- Whether the current user belongs to the household
CREATE OR REPLACE FUNCTION private.is_household_member(p_household_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.household_members
        WHERE household_id = p_household_id AND user_id = (SELECT auth.uid())
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

-- Whether the current user is an owner or admin of the household
CREATE OR REPLACE FUNCTION private.is_household_admin(p_household_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.household_members
        WHERE household_id = p_household_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

-- Whether the current user is households.owner_id. Reads past the households
-- SELECT policy, so it works before the owner has a membership row.
CREATE OR REPLACE FUNCTION private.owns_household(p_household_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.households
        WHERE id = p_household_id AND owner_id = (SELECT auth.uid())
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION private.is_household_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_household_admin(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.owns_household(UUID) FROM PUBLIC;

-- Policies run as the querying role, so it needs to be able to call these
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_household_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_household_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.owns_household(UUID) TO authenticated;

-- ============================================================================
-- POLICIES
-- ============================================================================

-- Keep this policy free of subqueries. The DELETE policy on household_members
-- still looks up household_members, and Postgres raises infinite recursion if
-- the SELECT policy it triggers contains a subquery too.
DROP POLICY IF EXISTS "Members can view household members" ON public.household_members;
CREATE POLICY "Members can view household members" ON public.household_members
    FOR SELECT TO authenticated USING (
        user_id = auth.uid()
        OR private.is_household_member(household_id)
    );

DROP POLICY IF EXISTS "Owners/admins can add members" ON public.household_members;
CREATE POLICY "Owners/admins can add members" ON public.household_members
    FOR INSERT TO authenticated WITH CHECK (
        private.is_household_admin(household_id)
        OR (
            user_id = auth.uid()
            AND role = 'owner'
            AND private.owns_household(household_id)
        )
    );

DROP POLICY IF EXISTS "Members can view household" ON public.households;
CREATE POLICY "Members can view household" ON public.households
    FOR SELECT TO authenticated USING (
        owner_id = auth.uid()
        OR private.is_household_member(id)
    );
