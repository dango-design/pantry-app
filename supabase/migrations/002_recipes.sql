-- Recipes table
CREATE TABLE public.recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  instructions TEXT[] NOT NULL DEFAULT '{}',

  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  servings INTEGER,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  cuisine TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  dietary_info TEXT[] NOT NULL DEFAULT '{}',

  image_url TEXT,
  source_url TEXT,

  is_favorite BOOLEAN NOT NULL DEFAULT false,
  times_cooked INTEGER NOT NULL DEFAULT 0,
  last_cooked_at TIMESTAMPTZ,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,

  source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('builtin', 'imported', 'user', 'ai_generated')),
  created_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add recipe_id to food_usage_log
ALTER TABLE public.food_usage_log ADD COLUMN recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_recipes_household_id ON public.recipes(household_id);
CREATE INDEX idx_recipes_cuisine ON public.recipes(cuisine) WHERE cuisine IS NOT NULL;
CREATE INDEX idx_recipes_difficulty ON public.recipes(difficulty) WHERE difficulty IS NOT NULL;
CREATE INDEX idx_recipes_is_favorite ON public.recipes(is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_food_usage_log_recipe_id ON public.food_usage_log(recipe_id) WHERE recipe_id IS NOT NULL;

-- Updated at trigger (reuses existing function)
CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Household members can view their own recipes
CREATE POLICY "Household members can view recipes"
  ON public.recipes FOR SELECT
  USING (
    household_id IS NULL -- builtin recipes readable by all authenticated
    OR household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

-- Household members can insert recipes
CREATE POLICY "Household members can insert recipes"
  ON public.recipes FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

-- Household members can update their recipes
CREATE POLICY "Household members can update recipes"
  ON public.recipes FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

-- Household members can delete their recipes
CREATE POLICY "Household members can delete recipes"
  ON public.recipes FOR DELETE
  USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.recipes;
