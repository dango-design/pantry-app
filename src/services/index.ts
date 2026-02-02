// Supabase client
export { supabase, isDemoMode } from './supabase'
export type { Database, Tables, InsertTables, UpdateTables } from './supabase'

// Inventory API
export {
  getInventory,
  getFoodItem,
  addFoodItem,
  updateFoodItem,
  deleteFoodItem,
  consumeFoodItem,
  subscribeToInventory,
  getExpiringItems,
  searchInventory,
  getUserHouseholdId,
} from './inventoryApi'
export type { FoodItemRow, FoodItemInsert, FoodItemUpdate } from './inventoryApi'

// Shopping API
export {
  getDefaultShoppingList,
  getShoppingLists,
  getShoppingListItems,
  getDefaultShoppingListItems,
  addShoppingListItem,
  updateShoppingListItem,
  toggleShoppingItemChecked,
  deleteShoppingListItem,
  moveCheckedToInventory,
  clearCheckedItems,
  subscribeToShoppingList,
  createShoppingList,
} from './shoppingApi'
export type {
  ShoppingListRow,
  ShoppingListItemRow,
  ShoppingListItemInsert,
  ShoppingListItemUpdate,
} from './shoppingApi'

// Household API
export {
  getCurrentHousehold,
  getHouseholdMembers,
  updateHousehold,
  regenerateInviteCode,
  joinHouseholdByInvite,
  leaveHousehold,
  removeHouseholdMember,
  updateMemberRole,
  subscribeToHouseholdMembers,
} from './householdApi'
export type {
  HouseholdRow,
  HouseholdMemberRow,
  UserProfileRow,
  HouseholdMemberWithProfile,
} from './householdApi'

// AI API (Edge Functions)
export {
  processGroceryImage,
  processGroceryImageUrl,
  processReceipt,
  processReceiptUrl,
  lookupBarcode,
  fileToBase64,
} from './aiApi'
export type {
  DetectedItem,
  ReceiptItem,
  BarcodeProduct,
  ProcessImageResult,
  ProcessReceiptResult,
  BarcodeLookupResult,
} from './aiApi'
