-- Harden the SECURITY DEFINER functions left over from 001
--
-- 1. get_user_household_id(p_user_id) took any user's id and returned their
--    household id, bypassing RLS. Supabase grants EXECUTE on public functions
--    to anon, so anyone with a user's UUID could look up their household over
--    RPC. Nothing in the app calls it, so it's dropped.
--
-- 2. handle_new_user() runs as its owner on every sign-up but had no fixed
--    search_path, so it resolved names using the caller's. It now sets an
--    empty search_path; it already qualifies every table as public.*, and the
--    rest of the body only uses built-ins. The body is otherwise unchanged.

-- ============================================================================
-- get_user_household_id
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_user_household_id(UUID);

-- ============================================================================
-- handle_new_user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_household_id UUID;
BEGIN
    -- Create user profile
    INSERT INTO public.user_profiles (id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

    -- Create default household
    INSERT INTO public.households (name, owner_id)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)) || '''s Household', NEW.id)
    RETURNING id INTO v_household_id;

    -- Add user as household owner
    INSERT INTO public.household_members (household_id, user_id, role)
    VALUES (v_household_id, NEW.id, 'owner');

    -- Create default shopping list
    INSERT INTO public.shopping_lists (household_id, name, is_default)
    VALUES (v_household_id, 'Grocery List', TRUE);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
