import type { FoodCategory, StorageLocation, QuantityUnit } from '@/types'

// Category configuration with colors and icons
export const CATEGORIES: Record<FoodCategory, { label: string; color: string; icon: string }> = {
  produce: { label: 'Produce', color: '#22C55E', icon: 'leaf' },
  dairy: { label: 'Dairy', color: '#3B82F6', icon: 'milk' },
  meat: { label: 'Meat', color: '#EF4444', icon: 'beef' },
  seafood: { label: 'Seafood', color: '#06B6D4', icon: 'fish' },
  bakery: { label: 'Bakery', color: '#F59E0B', icon: 'croissant' },
  frozen: { label: 'Frozen', color: '#6366F1', icon: 'snowflake' },
  pantry: { label: 'Pantry', color: '#8B5CF6', icon: 'package' },
  beverages: { label: 'Beverages', color: '#EC4899', icon: 'cup-soda' },
  condiments: { label: 'Condiments', color: '#F97316', icon: 'droplet' },
  snacks: { label: 'Snacks', color: '#84CC16', icon: 'cookie' },
  prepared: { label: 'Prepared', color: '#14B8A6', icon: 'utensils' },
  other: { label: 'Other', color: '#6B7280', icon: 'box' },
}

// Storage location configuration
export const STORAGE_LOCATIONS: Record<StorageLocation, { label: string; color: string; icon: string }> = {
  refrigerator: { label: 'Refrigerator', color: '#3B82F6', icon: 'refrigerator' },
  freezer: { label: 'Freezer', color: '#6366F1', icon: 'snowflake' },
  pantry: { label: 'Pantry', color: '#8B5CF6', icon: 'archive' },
  counter: { label: 'Counter', color: '#F59E0B', icon: 'layout-grid' },
  spice_rack: { label: 'Spice Rack', color: '#EC4899', icon: 'flame' },
}

// Quantity units with labels
export const QUANTITY_UNITS: Record<QuantityUnit, { label: string; shortLabel: string }> = {
  count: { label: 'Count', shortLabel: '' },
  oz: { label: 'Ounces', shortLabel: 'oz' },
  lb: { label: 'Pounds', shortLabel: 'lb' },
  g: { label: 'Grams', shortLabel: 'g' },
  kg: { label: 'Kilograms', shortLabel: 'kg' },
  ml: { label: 'Milliliters', shortLabel: 'ml' },
  l: { label: 'Liters', shortLabel: 'L' },
  gal: { label: 'Gallons', shortLabel: 'gal' },
  cup: { label: 'Cups', shortLabel: 'cup' },
  tbsp: { label: 'Tablespoons', shortLabel: 'tbsp' },
  tsp: { label: 'Teaspoons', shortLabel: 'tsp' },
  unit: { label: 'Unit', shortLabel: '' },
  pack: { label: 'Pack', shortLabel: 'pk' },
  bunch: { label: 'Bunch', shortLabel: 'bunch' },
  dozen: { label: 'Dozen', shortLabel: 'dz' },
}

// Default expiration days by category and storage location
export const DEFAULT_EXPIRATION_DAYS: Record<FoodCategory, Record<string, number>> = {
  produce: { refrigerator: 7, counter: 5, freezer: 180 },
  dairy: { refrigerator: 14, freezer: 90 },
  meat: { refrigerator: 3, freezer: 180 },
  seafood: { refrigerator: 2, freezer: 180 },
  bakery: { counter: 5, refrigerator: 10, freezer: 90 },
  frozen: { freezer: 180 },
  pantry: { pantry: 365, refrigerator: 365 },
  beverages: { refrigerator: 30, pantry: 180 },
  condiments: { refrigerator: 180, pantry: 365 },
  snacks: { pantry: 90 },
  prepared: { refrigerator: 4, freezer: 90 },
  other: { refrigerator: 7, pantry: 30, freezer: 90 },
}

// Freshness thresholds
export const FRESHNESS_THRESHOLDS = {
  fresh: 50, // > 50% of shelf life remaining
  useSoon: 25, // 25-50% remaining
  expiring: 0, // < 3 days or < 25% remaining
}
