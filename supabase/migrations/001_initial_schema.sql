-- Pantry App Initial Schema
-- This migration creates all tables, indexes, RLS policies, and functions

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Households
CREATE TABLE public.households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
    owner_id UUID NOT NULL REFERENCES public.user_profiles(id),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Household members (junction table)
CREATE TABLE public.household_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(household_id, user_id)
);

-- Food items (inventory)
CREATE TABLE public.food_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,

    quantity DECIMAL NOT NULL,
    quantity_unit TEXT NOT NULL,
    original_quantity DECIMAL NOT NULL,

    storage_location TEXT NOT NULL,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE NOT NULL,
    expiration_source TEXT NOT NULL CHECK (expiration_source IN ('scanned', 'calculated', 'manual')),
    freshness_score INTEGER DEFAULT 100,

    barcode TEXT,
    brand TEXT,
    product_id TEXT,

    image_url TEXT,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',

    added_by UUID NOT NULL REFERENCES public.user_profiles(id),
    added_via TEXT NOT NULL CHECK (added_via IN ('photo', 'receipt', 'barcode', 'manual', 'voice')),

    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'expired', 'discarded')),
    consumed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shopping lists
CREATE TABLE public.shopping_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shopping list items
CREATE TABLE public.shopping_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopping_list_id UUID NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    quantity DECIMAL,
    quantity_unit TEXT,
    notes TEXT,

    source TEXT NOT NULL CHECK (source IN ('manual', 'low_stock', 'expiring', 'recipe', 'pattern')),
    source_item_id UUID,

    is_checked BOOLEAN DEFAULT FALSE,
    checked_by UUID REFERENCES public.user_profiles(id),
    checked_at TIMESTAMPTZ,

    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    store TEXT,
    aisle TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Food usage log (for analytics and patterns)
CREATE TABLE public.food_usage_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    food_item_id UUID NOT NULL REFERENCES public.food_items(id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),

    action TEXT NOT NULL CHECK (action IN ('consumed', 'partial_use', 'discarded', 'expired', 'frozen')),
    quantity_changed DECIMAL NOT NULL,
    quantity_remaining DECIMAL NOT NULL,

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_food_items_household ON public.food_items(household_id);
CREATE INDEX idx_food_items_status ON public.food_items(status);
CREATE INDEX idx_food_items_expiration ON public.food_items(expiration_date);
CREATE INDEX idx_food_items_category ON public.food_items(category);
CREATE INDEX idx_food_items_storage ON public.food_items(storage_location);
CREATE INDEX idx_food_items_barcode ON public.food_items(barcode);

CREATE INDEX idx_shopping_list_items_list ON public.shopping_list_items(shopping_list_id);
CREATE INDEX idx_shopping_list_items_checked ON public.shopping_list_items(is_checked);

CREATE INDEX idx_household_members_user ON public.household_members(user_id);
CREATE INDEX idx_household_members_household ON public.household_members(household_id);

CREATE INDEX idx_food_usage_log_item ON public.food_usage_log(food_item_id);
CREATE INDEX idx_food_usage_log_household ON public.food_usage_log(household_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_usage_log ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Households Policies
CREATE POLICY "Members can view household" ON public.households
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.household_members
            WHERE household_id = households.id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create households" ON public.households
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update household" ON public.households
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete household" ON public.households
    FOR DELETE USING (owner_id = auth.uid());

-- Household Members Policies
CREATE POLICY "Members can view household members" ON public.household_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.household_members hm
            WHERE hm.household_id = household_members.household_id AND hm.user_id = auth.uid()
        )
    );

CREATE POLICY "Owners/admins can add members" ON public.household_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.household_members hm
            WHERE hm.household_id = household_members.household_id
            AND hm.user_id = auth.uid()
            AND hm.role IN ('owner', 'admin')
        )
        OR user_id = auth.uid()
    );

CREATE POLICY "Owners/admins can remove members" ON public.household_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.household_members hm
            WHERE hm.household_id = household_members.household_id
            AND hm.user_id = auth.uid()
            AND hm.role IN ('owner', 'admin')
        )
        OR user_id = auth.uid()
    );

-- Food Items Policies
CREATE POLICY "Members can view food items" ON public.food_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.household_members
            WHERE household_id = food_items.household_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Members can insert food items" ON public.food_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.household_members
            WHERE household_id = food_items.household_id AND user_id = auth.uid()
        )
        AND added_by = auth.uid()
    );

CREATE POLICY "Members can update food items" ON public.food_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.household_members
            WHERE household_id = food_items.household_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Members can delete food items" ON public.food_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.household_members
            WHERE household_id = food_items.household_id AND user_id = auth.uid()
        )
    );

-- Shopping Lists Policies
CREATE POLICY "Members can view shopping lists" ON public.shopping_lists
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.household_members
            WHERE household_id = shopping_lists.household_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Members can create shopping lists" ON public.shopping_lists
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.household_members
            WHERE household_id = shopping_lists.household_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Members can update shopping lists" ON public.shopping_lists
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.household_members
            WHERE household_id = shopping_lists.household_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Members can delete shopping lists" ON public.shopping_lists
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.household_members
            WHERE household_id = shopping_lists.household_id AND user_id = auth.uid()
        )
    );

-- Shopping List Items Policies
CREATE POLICY "Members can view shopping list items" ON public.shopping_list_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.shopping_lists sl
            JOIN public.household_members hm ON hm.household_id = sl.household_id
            WHERE sl.id = shopping_list_items.shopping_list_id AND hm.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can insert shopping list items" ON public.shopping_list_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.shopping_lists sl
            JOIN public.household_members hm ON hm.household_id = sl.household_id
            WHERE sl.id = shopping_list_items.shopping_list_id AND hm.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can update shopping list items" ON public.shopping_list_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.shopping_lists sl
            JOIN public.household_members hm ON hm.household_id = sl.household_id
            WHERE sl.id = shopping_list_items.shopping_list_id AND hm.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can delete shopping list items" ON public.shopping_list_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.shopping_lists sl
            JOIN public.household_members hm ON hm.household_id = sl.household_id
            WHERE sl.id = shopping_list_items.shopping_list_id AND hm.user_id = auth.uid()
        )
    );

-- Food Usage Log Policies
CREATE POLICY "Members can view usage log" ON public.food_usage_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.household_members
            WHERE household_id = food_usage_log.household_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Members can insert usage log" ON public.food_usage_log
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.household_members
            WHERE household_id = food_usage_log.household_id AND user_id = auth.uid()
        )
        AND user_id = auth.uid()
    );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Calculate freshness score based on purchase and expiration dates
CREATE OR REPLACE FUNCTION public.calculate_freshness_score(
    purchase_date DATE,
    expiration_date DATE
) RETURNS INTEGER AS $$
DECLARE
    total_days INTEGER;
    days_remaining INTEGER;
    score INTEGER;
BEGIN
    total_days := expiration_date - purchase_date;
    days_remaining := expiration_date - CURRENT_DATE;

    IF days_remaining <= 0 THEN
        RETURN 0;
    END IF;

    IF total_days <= 0 THEN
        RETURN 100;
    END IF;

    score := (days_remaining::DECIMAL / total_days * 100)::INTEGER;
    RETURN GREATEST(0, LEAST(100, score));
END;
$$ LANGUAGE plpgsql;

-- Update all freshness scores (to be called daily via cron)
CREATE OR REPLACE FUNCTION public.update_all_freshness_scores()
RETURNS void AS $$
BEGIN
    UPDATE public.food_items
    SET
        freshness_score = public.calculate_freshness_score(purchase_date, expiration_date),
        updated_at = NOW()
    WHERE status = 'active';

    -- Auto-expire items past expiration date
    UPDATE public.food_items
    SET
        status = 'expired',
        updated_at = NOW()
    WHERE status = 'active' AND expiration_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get user's household ID
CREATE OR REPLACE FUNCTION public.get_user_household_id(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_household_id UUID;
BEGIN
    SELECT household_id INTO v_household_id
    FROM public.household_members
    WHERE user_id = p_user_id
    LIMIT 1;

    RETURN v_household_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new user with household (called after signup)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile and household on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to join household via invite code
CREATE OR REPLACE FUNCTION public.join_household_by_invite(p_invite_code TEXT)
RETURNS UUID AS $$
DECLARE
    v_household_id UUID;
    v_existing_membership UUID;
BEGIN
    -- Find household by invite code
    SELECT id INTO v_household_id
    FROM public.households
    WHERE invite_code = p_invite_code;

    IF v_household_id IS NULL THEN
        RAISE EXCEPTION 'Invalid invite code';
    END IF;

    -- Check if already a member
    SELECT id INTO v_existing_membership
    FROM public.household_members
    WHERE household_id = v_household_id AND user_id = auth.uid();

    IF v_existing_membership IS NOT NULL THEN
        RAISE EXCEPTION 'Already a member of this household';
    END IF;

    -- Add as member
    INSERT INTO public.household_members (household_id, user_id, role)
    VALUES (v_household_id, auth.uid(), 'member');

    RETURN v_household_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- REALTIME
-- ============================================================================

-- Enable realtime for tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.food_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_list_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.household_members;

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_households_updated_at
    BEFORE UPDATE ON public.households
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_food_items_updated_at
    BEFORE UPDATE ON public.food_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shopping_lists_updated_at
    BEFORE UPDATE ON public.shopping_lists
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shopping_list_items_updated_at
    BEFORE UPDATE ON public.shopping_list_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
