-- Household membership rules
--
-- 1. Invite codes. The column default made 12-character lowercase hex codes,
--    but the app only lets people type 8 characters and uppercases them, and
--    join_household_by_invite() compared exactly. Households created at
--    sign-up couldn't be joined. Codes now have one format, 8 characters from
--    the alphabet the app already used (no 0/O or 1/I), generated in the
--    database. Existing codes in any other format are replaced, and joining
--    ignores case, spaces and dashes.
--
-- 2. Ownership and roles. "Owners can update household" checks the new row
--    too, so an owner couldn't hand owner_id to someone else, and
--    household_members has no UPDATE policy, so role changes matched 0 rows.
--    Both now go through owner-only functions: transfer_household_ownership()
--    and set_household_member_role(). Leaving a household is one function,
--    leave_household(), so ownership passes on in the same transaction.
--
-- 3. One household per user. Owners and admins could add any user without
--    their consent, and joining by code never took you out of your current
--    household. Either way the user ended up in two households. Direct adds
--    are gone; the invite code is the only way in, and joining moves you out
--    of your current household. A unique index on user_id enforces this.
--
-- 4. Removing members. Admins could remove the owner, and the owner could
--    delete their own row without handing over the household. Now the owner
--    can remove anyone else, admins can remove plain members, and members can
--    leave. The owner leaves through leave_household().

-- ============================================================================
-- INVITE CODES
-- ============================================================================

-- gen_random_uuid() is core Postgres, so this doesn't depend on the schema
-- pgcrypto lives in. Bytes 6 and 8 hold the UUID version and variant bits;
-- the bytes used here are fully random, and 256 is a multiple of 32.
CREATE OR REPLACE FUNCTION private.generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    v_chars CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    v_bytes BYTEA := uuid_send(gen_random_uuid());
    v_code TEXT := '';
    i INT;
BEGIN
    FOREACH i IN ARRAY ARRAY[0, 1, 2, 3, 4, 5, 9, 10] LOOP
        v_code := v_code || substr(v_chars, get_byte(v_bytes, i) % 32 + 1, 1);
    END LOOP;
    RETURN v_code;
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = '';

-- The column default runs as whoever inserts the household
REVOKE ALL ON FUNCTION private.generate_invite_code() FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO service_role;
GRANT EXECUTE ON FUNCTION private.generate_invite_code() TO authenticated, service_role;

ALTER TABLE public.households
    ALTER COLUMN invite_code SET DEFAULT private.generate_invite_code();

-- Sign-up households have lowercase hex codes nobody could type in. Codes the
-- app generated already match and are kept.
UPDATE public.households
SET invite_code = private.generate_invite_code()
WHERE invite_code !~ '^[A-HJ-NP-Z2-9]{8}$';

ALTER TABLE public.households
    ADD CONSTRAINT households_invite_code_format
    CHECK (invite_code ~ '^[A-HJ-NP-Z2-9]{8}$');

-- Only the owner can update the household, so this returns null for anyone else
CREATE OR REPLACE FUNCTION public.regenerate_invite_code(p_household_id UUID)
RETURNS TEXT AS $$
    UPDATE public.households
    SET invite_code = private.generate_invite_code()
    WHERE id = p_household_id
    RETURNING invite_code;
$$ LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = '';

-- ============================================================================
-- ONE HOUSEHOLD PER USER
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.household_members GROUP BY user_id HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Some users belong to more than one household. Remove the extra memberships before applying this migration.';
    END IF;
END $$;

CREATE UNIQUE INDEX household_members_one_per_user ON public.household_members(user_id);
DROP INDEX IF EXISTS public.idx_household_members_user;

-- Takes the current user out of their household. If they own it, ownership
-- passes to the member who joined first. If nobody else is left, the
-- household is deleted along with its items, lists and recipes.
CREATE OR REPLACE FUNCTION private.leave_current_household()
RETURNS VOID AS $$
DECLARE
    v_user UUID := (SELECT auth.uid());
    v_membership public.household_members%ROWTYPE;
    v_next public.household_members%ROWTYPE;
BEGIN
    SELECT * INTO v_membership FROM public.household_members WHERE user_id = v_user;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Serialize with other members leaving at the same time
    PERFORM 1 FROM public.households WHERE id = v_membership.household_id FOR UPDATE;

    SELECT * INTO v_next
    FROM public.household_members
    WHERE household_id = v_membership.household_id AND user_id <> v_user
    ORDER BY joined_at, id
    LIMIT 1;

    IF NOT FOUND THEN
        DELETE FROM public.households WHERE id = v_membership.household_id;
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.households
        WHERE id = v_membership.household_id AND owner_id = v_user
    ) THEN
        UPDATE public.households SET owner_id = v_next.user_id WHERE id = v_membership.household_id;
        UPDATE public.household_members SET role = 'owner' WHERE id = v_next.id;
    END IF;

    DELETE FROM public.household_members WHERE id = v_membership.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Only the functions below call this
REVOKE ALL ON FUNCTION private.leave_current_household() FROM PUBLIC;

-- Same as before, but joining moves you out of your current household,
-- and the code is matched however it was typed
CREATE OR REPLACE FUNCTION public.join_household_by_invite(p_invite_code TEXT)
RETURNS UUID AS $$
DECLARE
    v_user UUID := (SELECT auth.uid());
    v_household_id UUID;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT id INTO v_household_id
    FROM public.households
    WHERE invite_code = upper(regexp_replace(p_invite_code, '[^A-Za-z0-9]', '', 'g'));

    IF v_household_id IS NULL THEN
        RAISE EXCEPTION 'Invalid invite code';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.household_members
        WHERE household_id = v_household_id AND user_id = v_user
    ) THEN
        RAISE EXCEPTION 'Already a member of this household';
    END IF;

    PERFORM private.leave_current_household();

    INSERT INTO public.household_members (household_id, user_id, role)
    VALUES (v_household_id, v_user, 'member');

    RETURN v_household_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Leaves the current household and starts a new personal one. Returns its id.
CREATE OR REPLACE FUNCTION public.leave_household()
RETURNS UUID AS $$
DECLARE
    v_user UUID := (SELECT auth.uid());
    v_household_id UUID;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Leaving would only delete the household and start an empty one
    SELECT household_id INTO v_household_id FROM public.household_members WHERE user_id = v_user;
    IF FOUND AND NOT EXISTS (
        SELECT 1 FROM public.household_members
        WHERE household_id = v_household_id AND user_id <> v_user
    ) THEN
        RAISE EXCEPTION 'You are the only member of this household';
    END IF;

    PERFORM private.leave_current_household();

    INSERT INTO public.households (name, owner_id)
    VALUES ('My household', v_user)
    RETURNING id INTO v_household_id;

    INSERT INTO public.household_members (household_id, user_id, role)
    VALUES (v_household_id, v_user, 'owner');

    INSERT INTO public.shopping_lists (household_id, name, is_default)
    VALUES (v_household_id, 'Shopping list', TRUE);

    RETURN v_household_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================================
-- OWNERSHIP AND ROLES
-- ============================================================================

-- Makes another member the owner. The old owner becomes an admin.
CREATE OR REPLACE FUNCTION public.transfer_household_ownership(p_member_id UUID)
RETURNS public.household_members AS $$
DECLARE
    v_user UUID := (SELECT auth.uid());
    v_member public.household_members%ROWTYPE;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT hm.* INTO v_member
    FROM public.household_members hm
    JOIN public.households h ON h.id = hm.household_id
    WHERE hm.id = p_member_id AND h.owner_id = v_user
    FOR UPDATE OF h;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Only the household owner can transfer ownership';
    END IF;

    IF v_member.user_id = v_user THEN
        RAISE EXCEPTION 'You already own this household';
    END IF;

    UPDATE public.households SET owner_id = v_member.user_id WHERE id = v_member.household_id;

    UPDATE public.household_members SET role = 'admin'
    WHERE household_id = v_member.household_id AND user_id = v_user;

    UPDATE public.household_members SET role = 'owner'
    WHERE id = p_member_id
    RETURNING * INTO v_member;

    RETURN v_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Makes another member an admin or a plain member
CREATE OR REPLACE FUNCTION public.set_household_member_role(p_member_id UUID, p_role TEXT)
RETURNS public.household_members AS $$
DECLARE
    v_user UUID := (SELECT auth.uid());
    v_member public.household_members%ROWTYPE;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_role IS NULL OR p_role NOT IN ('admin', 'member') THEN
        RAISE EXCEPTION 'Role must be admin or member. Use transfer_household_ownership() to change the owner.';
    END IF;

    SELECT hm.* INTO v_member
    FROM public.household_members hm
    JOIN public.households h ON h.id = hm.household_id
    WHERE hm.id = p_member_id AND h.owner_id = v_user;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Only the household owner can change roles';
    END IF;

    IF v_member.user_id = v_user THEN
        RAISE EXCEPTION 'Transfer ownership before changing your own role';
    END IF;

    UPDATE public.household_members SET role = p_role
    WHERE id = p_member_id
    RETURNING * INTO v_member;

    RETURN v_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Supabase grants EXECUTE on new public functions to anon by default
REVOKE ALL ON FUNCTION public.regenerate_invite_code(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_household_by_invite(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.leave_household() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transfer_household_ownership(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_household_member_role(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.regenerate_invite_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_household_by_invite(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_household() TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_household_ownership(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_household_member_role(UUID, TEXT) TO authenticated;

-- ============================================================================
-- POLICIES
-- ============================================================================

-- Same rule as before, made explicit: the owner can't hand owner_id to someone
-- else with a plain update. That goes through transfer_household_ownership().
DROP POLICY IF EXISTS "Owners can update household" ON public.households;
CREATE POLICY "Owners can update household" ON public.households
    FOR UPDATE TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Owners and admins can no longer add other people. What's left is the owner
-- adding their own row to a household they just created, which the unique
-- index only allows when they aren't in a household already.
DROP POLICY IF EXISTS "Owners/admins can add members" ON public.household_members;
CREATE POLICY "Owners can add themselves to a new household" ON public.household_members
    FOR INSERT TO authenticated WITH CHECK (
        user_id = auth.uid()
        AND role = 'owner'
        AND private.owns_household(household_id)
    );

-- household_members still has no UPDATE policy. Roles change through
-- set_household_member_role() and transfer_household_ownership().

-- Like the SELECT policy, keep this free of subqueries
DROP POLICY IF EXISTS "Owners/admins can remove members" ON public.household_members;
CREATE POLICY "Owners/admins can remove members" ON public.household_members
    FOR DELETE TO authenticated USING (
        -- Members can leave; the owner leaves through leave_household()
        (user_id = auth.uid() AND NOT private.owns_household(household_id))
        -- The owner can remove anyone else
        OR (user_id <> auth.uid() AND private.owns_household(household_id))
        -- Admins can remove plain members
        OR (role = 'member' AND private.is_household_admin(household_id))
    );
