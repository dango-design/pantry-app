// Supabase Database Types
// These types match the database schema for type-safe queries

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      food_items: {
        Row: {
          id: string
          household_id: string
          name: string
          category: string
          subcategory: string | null
          quantity: number
          quantity_unit: string
          original_quantity: number
          storage_location: string
          purchase_date: string
          expiration_date: string
          expiration_source: string
          freshness_score: number
          barcode: string | null
          brand: string | null
          product_id: string | null
          image_url: string | null
          notes: string | null
          tags: string[]
          added_by: string
          added_via: string
          status: string
          consumed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          category: string
          subcategory?: string | null
          quantity: number
          quantity_unit: string
          original_quantity: number
          storage_location: string
          purchase_date?: string
          expiration_date: string
          expiration_source: string
          freshness_score?: number
          barcode?: string | null
          brand?: string | null
          product_id?: string | null
          image_url?: string | null
          notes?: string | null
          tags?: string[]
          added_by: string
          added_via: string
          status?: string
          consumed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          category?: string
          subcategory?: string | null
          quantity?: number
          quantity_unit?: string
          original_quantity?: number
          storage_location?: string
          purchase_date?: string
          expiration_date?: string
          expiration_source?: string
          freshness_score?: number
          barcode?: string | null
          brand?: string | null
          product_id?: string | null
          image_url?: string | null
          notes?: string | null
          tags?: string[]
          added_by?: string
          added_via?: string
          status?: string
          consumed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      food_usage_log: {
        Row: {
          id: string
          food_item_id: string
          household_id: string
          user_id: string
          action: string
          quantity_changed: number
          quantity_remaining: number
          notes: string | null
          recipe_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          food_item_id: string
          household_id: string
          user_id: string
          action: string
          quantity_changed: number
          quantity_remaining: number
          notes?: string | null
          recipe_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          food_item_id?: string
          household_id?: string
          user_id?: string
          action?: string
          quantity_changed?: number
          quantity_remaining?: number
          notes?: string | null
          recipe_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          id: string
          household_id: string | null
          name: string
          description: string | null
          ingredients: Json
          instructions: string[]
          prep_time_minutes: number | null
          cook_time_minutes: number | null
          servings: number | null
          difficulty: string | null
          cuisine: string | null
          tags: string[]
          dietary_info: string[]
          image_url: string | null
          source_url: string | null
          is_favorite: boolean
          times_cooked: number
          last_cooked_at: string | null
          rating: number | null
          notes: string | null
          source: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id?: string | null
          name: string
          description?: string | null
          ingredients?: Json
          instructions?: string[]
          prep_time_minutes?: number | null
          cook_time_minutes?: number | null
          servings?: number | null
          difficulty?: string | null
          cuisine?: string | null
          tags?: string[]
          dietary_info?: string[]
          image_url?: string | null
          source_url?: string | null
          is_favorite?: boolean
          times_cooked?: number
          last_cooked_at?: string | null
          rating?: number | null
          notes?: string | null
          source?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string | null
          name?: string
          description?: string | null
          ingredients?: Json
          instructions?: string[]
          prep_time_minutes?: number | null
          cook_time_minutes?: number | null
          servings?: number | null
          difficulty?: string | null
          cuisine?: string | null
          tags?: string[]
          dietary_info?: string[]
          image_url?: string | null
          source_url?: string | null
          is_favorite?: boolean
          times_cooked?: number
          last_cooked_at?: string | null
          rating?: number | null
          notes?: string | null
          source?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      household_members: {
        Row: {
          id: string
          household_id: string
          user_id: string
          role: string
          joined_at: string
        }
        Insert: {
          id?: string
          household_id: string
          user_id: string
          role: string
          joined_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          user_id?: string
          role?: string
          joined_at?: string
        }
        Relationships: []
      }
      households: {
        Row: {
          id: string
          name: string
          invite_code: string
          owner_id: string
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          invite_code?: string
          owner_id: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          invite_code?: string
          owner_id?: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      shopping_list_items: {
        Row: {
          id: string
          shopping_list_id: string
          name: string
          category: string | null
          quantity: number | null
          quantity_unit: string | null
          notes: string | null
          source: string
          source_item_id: string | null
          is_checked: boolean
          checked_by: string | null
          checked_at: string | null
          priority: string
          store: string | null
          aisle: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shopping_list_id: string
          name: string
          category?: string | null
          quantity?: number | null
          quantity_unit?: string | null
          notes?: string | null
          source: string
          source_item_id?: string | null
          is_checked?: boolean
          checked_by?: string | null
          checked_at?: string | null
          priority?: string
          store?: string | null
          aisle?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shopping_list_id?: string
          name?: string
          category?: string | null
          quantity?: number | null
          quantity_unit?: string | null
          notes?: string | null
          source?: string
          source_item_id?: string | null
          is_checked?: boolean
          checked_by?: string | null
          checked_at?: string | null
          priority?: string
          store?: string | null
          aisle?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      shopping_lists: {
        Row: {
          id: string
          household_id: string
          name: string
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          avatar_url?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_freshness_score: {
        Args: {
          purchase_date: string
          expiration_date: string
        }
        Returns: number
      }
      get_user_household_id: {
        Args: {
          p_user_id: string
        }
        Returns: string
      }
      join_household_by_invite: {
        Args: {
          p_invite_code: string
        }
        Returns: string
      }
      update_all_freshness_scores: {
        Args: Record<string, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
