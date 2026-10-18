// Placeholder food icons: Lucide line icons picked from the item name, falling back to the item's category
import {
  Apple,
  Banana,
  Bean,
  Beef,
  Beer,
  CakeSlice,
  Candy,
  Carrot,
  Cherry,
  Citrus,
  Coffee,
  Cookie,
  CookingPot,
  Croissant,
  CupSoda,
  Cylinder,
  Donut,
  Droplet,
  Drumstick,
  Egg,
  Fish,
  GlassWater,
  Grape,
  Ham,
  IceCreamBowl,
  IceCreamCone,
  LeafyGreen,
  Milk,
  Nut,
  Package,
  Pizza,
  Popcorn,
  Popsicle,
  Salad,
  Sandwich,
  Shell,
  Snowflake,
  Soup,
  UtensilsCrossed,
  Vegan,
  Wheat,
  Wine,
  type LucideIcon,
} from 'lucide-react'
import type { FoodCategory } from '@/types'

export type FoodIcon = LucideIcon

// Used when no keyword matches the item name
const CATEGORY_ICONS: Record<FoodCategory, LucideIcon> = {
  produce: Carrot,
  dairy: Milk,
  meat: Beef,
  seafood: Fish,
  bakery: Croissant,
  frozen: Snowflake,
  pantry: Package,
  beverages: CupSoda,
  condiments: Droplet,
  snacks: Cookie,
  prepared: CookingPot,
  other: UtensilsCrossed,
}

// Whole-word keywords per icon. The longest matching keyword wins, so "almond milk" beats "almond"
// and "tortilla chips" beats "tortilla". Plurals are spelled out because each word must match exactly.
const KEYWORD_GROUPS: [LucideIcon, string[]][] = [
  // Produce
  [Apple, ['apple', 'apples', 'pear', 'pears', 'peach', 'peaches', 'nectarine', 'nectarines', 'plum', 'plums', 'mango', 'mangos', 'mangoes', 'kiwi', 'kiwis', 'pineapple', 'melon', 'watermelon', 'cantaloupe', 'avocado', 'avocados', 'tomato', 'tomatoes', 'fruit']],
  [Banana, ['banana', 'bananas', 'plantain', 'plantains']],
  [Citrus, ['orange', 'oranges', 'lemon', 'lemons', 'lime', 'limes', 'grapefruit', 'clementine', 'clementines', 'mandarin', 'mandarins', 'tangerine', 'tangerines']],
  [Grape, ['grape', 'grapes', 'raisins']],
  [Cherry, ['cherry', 'cherries', 'strawberry', 'strawberries', 'blueberry', 'blueberries', 'raspberry', 'raspberries', 'blackberry', 'blackberries', 'berries', 'cranberries']],
  [Carrot, ['carrot', 'carrots']],
  [LeafyGreen, ['spinach', 'kale', 'lettuce', 'romaine', 'arugula', 'cabbage', 'chard', 'greens', 'bok choy', 'broccoli', 'celery', 'herbs', 'basil', 'cilantro', 'parsley', 'mint', 'asparagus', 'zucchini', 'cucumber', 'cucumbers']],
  [Bean, ['bean', 'beans', 'peas', 'edamame', 'lentils', 'chickpeas', 'hummus']],
  [Salad, ['salad', 'slaw', 'coleslaw']],
  // Dairy and eggs
  [Milk, ['milk', 'almond milk', 'oat milk', 'soy milk', 'coconut milk', 'cream', 'half and half', 'creamer', 'kefir']],
  [Egg, ['egg', 'eggs']],
  [IceCreamBowl, ['yogurt', 'yoghurt']],
  // Meat, seafood, and protein
  [Drumstick, ['chicken', 'turkey', 'wings', 'drumsticks', 'duck']],
  [Beef, ['beef', 'steak', 'brisket', 'lamb', 'veal', 'meatballs']],
  [Ham, ['pork', 'ham', 'bacon', 'sausage', 'sausages', 'prosciutto', 'salami', 'pepperoni', 'hot dogs', 'chorizo']],
  [Vegan, ['tofu', 'tempeh', 'seitan']],
  [Fish, ['fish', 'salmon', 'tuna', 'cod', 'tilapia', 'trout', 'halibut', 'sardines', 'anchovies']],
  [Shell, ['shrimp', 'prawns', 'crab', 'lobster', 'scallops', 'mussels', 'clams', 'oysters']],
  // Bakery and grains
  [Croissant, ['bread', 'sourdough', 'baguette', 'bagel', 'bagels', 'bun', 'buns', 'rolls', 'croissant', 'croissants', 'tortilla', 'tortillas', 'pita', 'naan', 'english muffins']],
  [CakeSlice, ['cake', 'muffin', 'muffins', 'pie', 'brownies']],
  [Donut, ['donut', 'donuts', 'doughnut', 'doughnuts']],
  [Wheat, ['rice', 'pasta', 'spaghetti', 'penne', 'macaroni', 'noodles', 'flour', 'oats', 'oatmeal', 'cereal', 'granola', 'quinoa', 'couscous', 'barley', 'cornmeal']],
  [Cylinder, ['canned', 'canned tomatoes', 'diced tomatoes', 'crushed tomatoes', 'tomato sauce', 'tomato paste', 'canned beans', 'canned tuna', 'broth', 'chicken broth', 'beef broth', 'stock', 'chicken stock']],
  [Nut, ['nut', 'nuts', 'almond', 'almonds', 'peanut', 'peanuts', 'walnuts', 'cashews', 'pecans', 'pistachios', 'peanut butter', 'almond butter']],
  // Condiments
  [Droplet, ['oil', 'olive oil', 'vinegar', 'soy sauce', 'sauce', 'hot sauce', 'sriracha', 'ketchup', 'mustard', 'mayo', 'mayonnaise', 'salsa', 'dressing', 'honey', 'syrup', 'maple syrup', 'jam', 'jelly']],
  // Drinks
  [CupSoda, ['juice', 'apple juice', 'orange juice', 'soda', 'cola', 'lemonade', 'kombucha', 'smoothie']],
  [Coffee, ['coffee', 'espresso', 'tea']],
  [Wine, ['wine']],
  [Beer, ['beer', 'cider']],
  [GlassWater, ['water', 'sparkling water', 'seltzer']],
  // Snacks and frozen
  [Cookie, ['cookie', 'cookies', 'crackers', 'biscuits']],
  [Popcorn, ['popcorn', 'chips', 'pretzels', 'tortilla chips']],
  [Candy, ['candy', 'chocolate', 'gummies']],
  [IceCreamCone, ['ice cream', 'gelato', 'sorbet']],
  [Popsicle, ['popsicle', 'popsicles', 'ice pops']],
  // Prepared food
  [Pizza, ['pizza']],
  [Soup, ['soup', 'chicken soup', 'stew', 'chili', 'curry', 'ramen', 'gyoza', 'dumpling', 'dumplings']],
  [Sandwich, ['sandwich', 'sandwiches', 'burger', 'burgers', 'wrap', 'wraps']],
  [CookingPot, ['leftovers', 'casserole', 'lasagna']],
]

const KEYWORD_ICONS: [string, LucideIcon][] = KEYWORD_GROUPS
  .flatMap(([icon, words]) => words.map((word): [string, LucideIcon] => [word, icon]))
  .sort((a, b) => b[0].length - a[0].length)

export function getFoodIcon(foodName: string, category?: FoodCategory): LucideIcon {
  // Pad with spaces so keywords only match whole words ("egg" shouldn't match "eggplant")
  const name = ` ${foodName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `
  const match = KEYWORD_ICONS.find(([word]) => name.includes(` ${word} `))
  if (match) return match[1]

  return category ? CATEGORY_ICONS[category] : UtensilsCrossed
}
