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

// Softer per-category tones for item cards and image placeholders (the vibrant CATEGORIES colors stay on chips/badges).
// strip: card color strip, tint: placeholder tile background, ink: placeholder icon (at least 4.5:1 on tint)
export const CATEGORY_TONES: Record<FoodCategory, { strip: string; tint: string; ink: string }> = {
  produce: { strip: '#48dc8d', tint: '#E6F7EC', ink: '#1E7A4A' },
  dairy: { strip: '#a2b8f1', tint: '#EDF1FD', ink: '#3557B7' },
  meat: { strip: '#f4a4a4', tint: '#FDEEEE', ink: '#A8433B' },
  seafood: { strip: '#88d4e8', tint: '#E7F6FA', ink: '#1C6F86' },
  bakery: { strip: '#f0cc88', tint: '#FCF4E4', ink: '#8A5A12' },
  frozen: { strip: '#b0b4f8', tint: '#EEEFFE', ink: '#4549B5' },
  pantry: { strip: '#c4b0f8', tint: '#F2EEFE', ink: '#6345B8' },
  beverages: { strip: '#f0a8c8', tint: '#FCEEF4', ink: '#A33A6A' },
  condiments: { strip: '#f4b888', tint: '#FDF1E7', ink: '#9A4F17' },
  snacks: { strip: '#b8dc78', tint: '#F1F8E4', ink: '#4F7215' },
  prepared: { strip: '#88d8c8', tint: '#E6F7F3', ink: '#1D7465' },
  other: { strip: '#b8bcc4', tint: '#F1F2F4', ink: '#4B5160' },
}

// Storage location configuration
export const STORAGE_LOCATIONS: Record<StorageLocation, { label: string; color: string; icon: string }> = {
  refrigerator: { label: 'Refrigerator', color: '#3B82F6', icon: 'refrigerator' },
  freezer: { label: 'Freezer', color: '#6366F1', icon: 'snowflake' },
  pantry: { label: 'Pantry', color: '#8B5CF6', icon: 'archive' },
  counter: { label: 'Counter', color: '#F59E0B', icon: 'layout-grid' },
  spice_rack: { label: 'Spice rack', color: '#EC4899', icon: 'flame' },
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

// Default storage location by category
export const DEFAULT_STORAGE_LOCATIONS: Record<FoodCategory, StorageLocation> = {
  produce: 'refrigerator',
  dairy: 'refrigerator',
  meat: 'refrigerator',
  seafood: 'refrigerator',
  bakery: 'counter',
  frozen: 'freezer',
  pantry: 'pantry',
  beverages: 'refrigerator',
  condiments: 'refrigerator',
  snacks: 'pantry',
  prepared: 'refrigerator',
  other: 'refrigerator',
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
