import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { FoodCategory, FoodItem, FoodRole, QuantityUnit, Staple } from '@/types'
import { foodWords, lookupFood } from './foodDatabase'
import { convertQuantity } from './units'

// Food roles, servings, last-touched dates and household size.
//
// This is the one module to import for these. It holds:
// - FoodRole, FOOD_ROLES, FOOD_ROLE_LABELS: the roles and their labels
// - guessRole(name, category) and getRole(item): the role of an item
// - estimateServings(item): rough servings left in an item
// - getTouchedAt(item) and daysSinceTouched(item): when a person last did something with an item
// - DEFAULT_HOUSEHOLD_SIZE and clampHouseholdSize(): "people eating at home"
//
// A role says what a food does in a meal. A category says what it is. Eggs
// are filed under dairy but eaten as a main; peanut butter is a pantry good
// but eaten at breakfast.

export type { FoodRole }

/** Every role, in the order the app lists them */
export const FOOD_ROLES: FoodRole[] = ['main', 'base', 'produce', 'breakfast', 'snack', 'flavor', 'drink']

export const FOOD_ROLE_LABELS: Record<FoodRole, string> = {
  main: 'Main',
  base: 'Base',
  produce: 'Veg & fruit',
  breakfast: 'Breakfast & dairy',
  snack: 'Snack',
  flavor: 'Flavor',
  drink: 'Drink',
}

/** One line on what each role covers, for a picker */
export const FOOD_ROLE_DESCRIPTIONS: Record<FoodRole, string> = {
  main: 'Protein or a ready meal',
  base: 'Rice, pasta, bread, tortillas, grains',
  produce: 'Vegetables and fruit',
  breakfast: 'Breakfast foods and dairy',
  snack: 'Snacks and sweets',
  flavor: 'Oils, spices, sauces, baking basics',
  drink: 'Drinks',
}

export function isFoodRole(value: unknown): value is FoodRole {
  return typeof value === 'string' && (FOOD_ROLES as string[]).includes(value)
}

// ---------------------------------------------------------------------------
// Guessing a role
// ---------------------------------------------------------------------------

// The usual role for each category. 'other' becomes a snack: an unknown item
// should stay visible, but it must not count toward "Dinners on hand".
const CATEGORY_ROLES: Record<FoodCategory, FoodRole> = {
  produce: 'produce',
  dairy: 'breakfast',
  meat: 'main',
  seafood: 'main',
  bakery: 'base',
  frozen: 'main',
  pantry: 'base',
  beverages: 'drink',
  condiments: 'flavor',
  snacks: 'snack',
  prepared: 'main',
  other: 'snack',
}

/**
 * Foods in the food table (src/utils/foodTable.ts) whose role is not their
 * category's usual role. Keys are the table's names in lowercase. A test checks
 * that every key is still in the table.
 *
 * Peanut butter (and the other spreads) is breakfast, not main. It is mostly
 * eaten on toast, in sandwiches or with fruit, and counting a jar as dinners
 * would make "Dinners on hand" look better than it is.
 */
export const ROLE_BY_FOOD: Record<string, FoodRole> = {
  // Produce that is eaten as a main, or used only for flavor
  'tofu': 'main',
  'garlic': 'flavor',
  'ginger': 'flavor',
  'basil': 'flavor',
  'cilantro': 'flavor',
  'dill': 'flavor',
  'mint': 'flavor',
  'parsley': 'flavor',
  'rosemary': 'flavor',
  'thyme': 'flavor',
  'herbs': 'flavor',

  // Dairy
  'eggs': 'main',
  'egg whites': 'main',
  'eggnog': 'drink',
  'butter': 'flavor',
  'margarine': 'flavor',

  // Meat
  'bacon': 'breakfast',

  // Bakery
  'bagels': 'breakfast',
  'english muffins': 'breakfast',
  'croissants': 'breakfast',
  'muffins': 'breakfast',
  'cinnamon rolls': 'breakfast',
  'donuts': 'breakfast',
  'brownies': 'snack',
  'cake': 'snack',
  'cheesecake': 'snack',
  'pie': 'snack',
  'cookie dough': 'snack',

  // Frozen (the usual role is main)
  'edamame': 'produce',
  'frozen fruit': 'produce',
  'frozen vegetables': 'produce',
  'peas': 'produce',
  'french fries': 'base',
  'tater tots': 'base',
  'garlic bread': 'base',
  'hash browns': 'breakfast',
  'waffles': 'breakfast',
  'ice cream': 'snack',
  'popsicles': 'snack',
  'mozzarella sticks': 'snack',
  'onion rings': 'snack',

  // Pantry (the usual role is base)
  'beans': 'main',
  'lentils': 'main',
  'tuna': 'main',
  'sardines': 'main',
  'soup': 'main',
  'chili': 'main',
  'mac and cheese': 'main',
  'instant noodles': 'main',
  'cereal': 'breakfast',
  'oats': 'breakfast',
  'granola': 'breakfast',
  'pancake mix': 'breakfast',
  'syrup': 'breakfast',
  'peanut butter': 'breakfast',
  'almond butter': 'breakfast',
  'nutella': 'breakfast',
  'spread': 'breakfast',
  'honey': 'breakfast',
  'chia seeds': 'breakfast',
  'applesauce': 'snack',
  'baby food': 'snack',
  'cake mix': 'snack',
  'baby formula': 'drink',
  'protein powder': 'drink',
  'baking powder': 'flavor',
  'baking soda': 'flavor',
  'bay leaves': 'flavor',
  'black pepper': 'flavor',
  'bread crumbs': 'flavor',
  'broth': 'flavor',
  'cayenne': 'flavor',
  'chili powder': 'flavor',
  'chocolate chips': 'flavor',
  'cinnamon': 'flavor',
  'cocoa powder': 'flavor',
  'condensed milk': 'flavor',
  'cornmeal': 'flavor',
  'cornstarch': 'flavor',
  'croutons': 'flavor',
  'cumin': 'flavor',
  'curry powder': 'flavor',
  'diced tomatoes': 'flavor',
  'evaporated milk': 'flavor',
  'flour': 'flavor',
  'garlic powder': 'flavor',
  'ghee': 'flavor',
  'ground ginger': 'flavor',
  'italian seasoning': 'flavor',
  'nutmeg': 'flavor',
  'onion powder': 'flavor',
  'oregano': 'flavor',
  'paprika': 'flavor',
  'pasta sauce': 'flavor',
  'red pepper flakes': 'flavor',
  'salt': 'flavor',
  'seasoning': 'flavor',
  'sugar': 'flavor',
  'tahini': 'flavor',
  'tomato paste': 'flavor',
  'tomato sauce': 'flavor',
  'turmeric': 'flavor',
  'vanilla extract': 'flavor',
  'yeast': 'flavor',

  // Condiments (the usual role is flavor)
  'hummus': 'snack',
  'guacamole': 'snack',
  'dip': 'snack',
  'jam': 'breakfast',

  // Snacks
  'toaster pastries': 'breakfast',

  // Prepared (the usual role is main)
  'fruit salad': 'produce',
  'coleslaw': 'produce',
  'mashed potatoes': 'base',
  'potato salad': 'base',
  'pasta salad': 'base',
  'fresh pasta': 'base',
}

// Words that name a role when the food table knows none of the words in the
// name. Checked from the last word back, so "Sesame oil" is flavor and
// "Tempeh crumbles" is main.
const ROLE_WORDS: Record<string, FoodRole> = Object.fromEntries(
  Object.entries<FoodRole>({
    tempeh: 'main', seitan: 'main', chickpea: 'main', garbanzo: 'main', entree: 'main', meal: 'main',
    dinner: 'main', lasagna: 'main', pizza: 'main', stew: 'main', curry: 'main', falafel: 'main',
    oil: 'flavor', vinegar: 'flavor', marinade: 'flavor', spice: 'flavor', extract: 'flavor',
    sriracha: 'flavor', worcestershire: 'flavor', miso: 'flavor', gochujang: 'flavor', vanilla: 'flavor',
    oatmeal: 'breakfast', pancake: 'breakfast',
  }).map(([word, role]) => [foodWords(word)[0], role])
)

// Prefixes the food table adds for words such as "frozen" and "canned":
// "frozen peas" in the result is the food "peas"
const MODIFIER_PREFIX = /^(frozen|canned|dried|cooked) /

// The food table's role for a food name it returned, if the table lists one
function roleForFoodName(foodName: string): FoodRole | undefined {
  return ROLE_BY_FOOD[foodName] ?? ROLE_BY_FOOD[foodName.replace(MODIFIER_PREFIX, '')]
}

/**
 * The role a new item probably has, from its name and category.
 *
 * 1. A food the food table finds in the name decides: "Large brown eggs" is
 *    eggs, so main; "Peanut butter cookies" is cookies, so snack. A food with
 *    no entry in ROLE_BY_FOOD takes its own category's usual role.
 * 2. A food name the table does not know is checked for words such as "oil"
 *    or "tempeh".
 * 3. Otherwise the item's category decides. 'other' gives 'snack'.
 *
 * Frozen and canned versions keep the food's role: frozen spinach is still
 * veg, canned black beans are still a main. A frozen or canned food the table
 * does not know ("Frozen meal") is a main.
 */
export function guessRole(name: string, category: FoodCategory): FoodRole {
  const food = lookupFood(name)
  if (food) {
    const listed = roleForFoodName(food.name)
    if (listed) return listed
    if (food.name === 'frozen food' || food.name === 'canned food' || food.name === 'leftovers') return 'main'
    // A modifier can change the food's category: frozen chicken is 'frozen'
    // but still a main. Use the plain food's category when there is one.
    const plain = MODIFIER_PREFIX.test(food.name) ? lookupFood(food.name.replace(MODIFIER_PREFIX, '')) : undefined
    return CATEGORY_ROLES[(plain ?? food).category]
  }

  const words = foodWords(name)
  for (let i = words.length - 1; i >= 0; i--) {
    const role = ROLE_WORDS[words[i]]
    if (role) return role
  }

  return CATEGORY_ROLES[category] ?? 'snack'
}

/**
 * The role of an item or staple: the one stored on it, or a guess for
 * items saved before roles existed. Always use this rather than reading
 * `item.role`.
 */
export function getRole(item: Pick<FoodItem, 'name' | 'category' | 'role'> | Pick<Staple, 'name' | 'category' | 'role'>): FoodRole {
  return isFoodRole(item.role) ? item.role : guessRole(item.name, item.category)
}

// ---------------------------------------------------------------------------
// Servings
// ---------------------------------------------------------------------------
//
// Rough servings, so the app can say "about 5 dinners". These are typical US
// label serving sizes, rounded. They are estimates and the UI should say so.
//
// By weight (grams per serving):
//   main 113 g (4 oz: 1 lb of meat ≈ 4), base 75 g, veg & fruit 113 g,
//   breakfast & dairy 40 g, snack 28 g (1 oz), flavor 15 g, drink 240 g.
//   Dry pasta and noodles 56 g (1 lb ≈ 8), dry rice and grains 45 g
//   (1 lb ≈ 10), canned beans 130 g, mac and cheese 70 g, soup and chili 245 g.
// By volume (ml per serving):
//   1 cup (240 ml) for drinks, milk, soup and most foods; 15 ml (1 tbsp) for
//   flavor; 120 ml for snacks and veg & fruit; 170 ml for yogurt.
// By count (servings in one): 1, except eggs 0.5 (2 eggs a serving), a can
//   of beans 3, a can of soup or chili 2, a frozen pizza 3, a loaf of bread 8,
//   a carton of milk or juice 8, chicken thighs and drumsticks 0.5, and a few more.
// By container (unit, pack, bunch; servings in one):
//   main 4 (a 1 lb pack), base 8, veg & fruit 4, breakfast & dairy 6,
//   snack 6, flavor 24, drink 6. Pasta 8, rice 10, a bag of tortillas 5, a
//   frozen dinner 1, and a few more.

const GRAMS_BY_ROLE: Record<FoodRole, number> = {
  main: 113, base: 75, produce: 113, breakfast: 40, snack: 28, flavor: 15, drink: 240,
}

const ML_BY_ROLE: Record<FoodRole, number> = {
  main: 240, base: 240, produce: 120, breakfast: 240, snack: 120, flavor: 15, drink: 240,
}

// Servings in one of a counted item ('count', or 12 per 'dozen')
const EACH_BY_ROLE: Record<FoodRole, number> = {
  main: 1, base: 1, produce: 1, breakfast: 1, snack: 1, flavor: 12, drink: 1,
}

// Servings in one 'unit', 'pack' or 'bunch'
const CONTAINER_BY_ROLE: Record<FoodRole, number> = {
  main: 4, base: 8, produce: 4, breakfast: 6, snack: 6, flavor: 24, drink: 6,
}

/** Per-food serving sizes, keyed by the food table's lowercase names. A test checks every key is in the table */
export const SERVINGS_BY_FOOD: Record<string, { grams?: number; ml?: number; each?: number; container?: number }> = {
  'pasta': { grams: 56, container: 8 },
  'noodles': { grams: 56, container: 8 },
  'fresh pasta': { grams: 113, container: 3 },
  'rice': { grams: 45, container: 10 },
  'brown rice': { grams: 45, container: 10 },
  'quinoa': { grams: 45, container: 8 },
  'couscous': { grams: 45, container: 8 },
  'oats': { grams: 40, container: 15 },
  'cereal': { grams: 35, container: 10 },
  'granola': { grams: 45, container: 8 },
  'lentils': { grams: 45, each: 3, container: 10 },
  'beans': { grams: 130, each: 3, container: 3 },
  'soup': { grams: 245, each: 2, container: 2 },
  'chili': { grams: 245, each: 2, container: 2 },
  'tuna': { each: 1, container: 4 },
  'sardines': { each: 1, container: 4 },
  'mac and cheese': { grams: 70, each: 3, container: 3 },
  'instant noodles': { grams: 85, each: 1, container: 1 },
  'eggs': { each: 0.5, container: 6 },
  'chicken thighs': { each: 0.5 },
  'chicken drumsticks': { each: 0.5 },
  'chicken wings': { each: 0.25 },
  'hot dogs': { each: 0.5, container: 4 },
  'sausage': { each: 0.5 },
  'bread': { grams: 50, each: 8, container: 8 },
  'tortillas': { each: 0.5, container: 5 },
  'taco shells': { each: 0.33, container: 4 },
  'bagels': { each: 1, container: 6 },
  'english muffins': { each: 1, container: 6 },
  'frozen dinners': { each: 1, container: 1 },
  'frozen pizza': { each: 3, container: 3 },
  'burritos': { each: 1, container: 4 },
  'pork gyoza': { container: 4 },
  'dumplings': { container: 4 },
  'milk': { each: 8 },
  'almond milk': { each: 8 },
  'oat milk': { each: 8 },
  'soy milk': { each: 8 },
  'juice': { each: 8 },
  'orange juice': { each: 8 },
  'apple juice': { each: 8 },
  'yogurt': { ml: 170 },
  'greek yogurt': { ml: 170 },
  'cheddar cheese': { grams: 28, container: 8 },
  'cheese': { grams: 28, container: 8 },
  'spinach': { container: 3 },
  'salad': { container: 3 },
  'lettuce': { each: 3 },
  'broccoli': { each: 3 },
  'cauliflower': { each: 4 },
  'cabbage': { each: 6 },
  'butternut squash': { each: 4 },
  'pineapple': { each: 6 },
  'cantaloupe': { each: 6 },
  'watermelon': { each: 15 },
}

/**
 * Fruit people mostly eat on its own, keyed by the food table's lowercase
 * names. It still counts as "Veg & fruit" in the role bar, but the dinner
 * count leaves it out: a bag of apples does not make a dinner. Fruit that
 * goes into cooking (tomatoes, avocados, plantains) is not listed, so it
 * still counts as dinner veg. A test checks every key is in the table.
 */
export const SNACKING_FRUIT: ReadonlySet<string> = new Set([
  'apples', 'bananas', 'oranges', 'clementines', 'grapefruit', 'strawberries', 'blueberries',
  'raspberries', 'blackberries', 'berries', 'cranberries', 'grapes', 'cherries', 'peaches',
  'nectarines', 'plums', 'pears', 'mangoes', 'pineapple', 'watermelon', 'cantaloupe', 'honeydew',
  'kiwis', 'pomegranates', 'dates', 'fruit',
])

/** True for fruit people mostly eat on its own (see SNACKING_FRUIT). "Frozen blueberries" counts too. */
export function isSnackingFruit(name: string): boolean {
  const foodName = lookupFood(name)?.name
  if (!foodName) return false
  return SNACKING_FRUIT.has(foodName) || SNACKING_FRUIT.has(foodName.replace(MODIFIER_PREFIX, ''))
}

type ServingsInput = Pick<FoodItem, 'name' | 'category' | 'quantity' | 'quantityUnit'> &
  Partial<Pick<FoodItem, 'role' | 'servings'>>

/**
 * Rough servings left in an item: the `servings` a person typed, or an
 * estimate from quantity, unit and role (see the table above). Rounded to one
 * decimal. 0 for an item with nothing left.
 */
export function estimateServings(item: ServingsInput): number {
  if (typeof item.servings === 'number' && Number.isFinite(item.servings)) return Math.max(0, item.servings)
  if (!(item.quantity > 0)) return 0

  const role = getRole(item)
  // "frozen pizza" is its own entry; "frozen spinach" uses spinach's
  const foodName = lookupFood(item.name)?.name
  const food = foodName ? SERVINGS_BY_FOOD[foodName] ?? SERVINGS_BY_FOOD[foodName.replace(MODIFIER_PREFIX, '')] : undefined
  const unit: QuantityUnit = item.quantityUnit

  let servings: number
  const grams = convertQuantity(item.quantity, unit, 'g')
  const ml = grams === null ? convertQuantity(item.quantity, unit, 'ml') : null
  const each = grams === null && ml === null ? convertQuantity(item.quantity, unit, 'count') : null

  if (grams !== null) {
    servings = grams / (food?.grams ?? GRAMS_BY_ROLE[role])
  } else if (ml !== null) {
    servings = ml / (food?.ml ?? ML_BY_ROLE[role])
  } else if (each !== null) {
    servings = each * (food?.each ?? EACH_BY_ROLE[role])
  } else {
    // 'unit', 'pack', 'bunch' and anything unknown
    servings = item.quantity * (food?.container ?? CONTAINER_BY_ROLE[role])
  }

  return Math.round(servings * 10) / 10
}

// ---------------------------------------------------------------------------
// Last touched
// ---------------------------------------------------------------------------

/**
 * When a person last used, counted, adjusted or edited the item. Items saved
 * before `touchedAt` existed fall back to the start of their purchase day,
 * then to when the row was created.
 */
export function getTouchedAt(item: Pick<FoodItem, 'touchedAt' | 'purchaseDate' | 'createdAt'>): Date {
  if (item.touchedAt) {
    const touched = new Date(item.touchedAt)
    if (!Number.isNaN(touched.getTime())) return touched
  }
  // purchaseDate is a local yyyy-MM-dd date; parseISO reads it as local midnight
  if (item.purchaseDate) {
    const purchased = parseISO(item.purchaseDate)
    if (!Number.isNaN(purchased.getTime())) return purchased
  }
  return new Date(item.createdAt)
}

/** Whole calendar days since the item was last touched. 0 for today */
export function daysSinceTouched(item: Pick<FoodItem, 'touchedAt' | 'purchaseDate' | 'createdAt'>, now: Date = new Date()): number {
  return Math.max(0, differenceInCalendarDays(now, getTouchedAt(item)))
}

// ---------------------------------------------------------------------------
// Household size
// ---------------------------------------------------------------------------

/** "People eating at home" when nobody has set it */
export const DEFAULT_HOUSEHOLD_SIZE = 2
export const MAX_HOUSEHOLD_SIZE = 20

/** A whole number from 1 to MAX_HOUSEHOLD_SIZE. Anything that is not a number gives the default */
export function clampHouseholdSize(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return DEFAULT_HOUSEHOLD_SIZE
  return Math.min(MAX_HOUSEHOLD_SIZE, Math.max(1, Math.round(number)))
}
