# Pantry - Food Inventory & Management App

## Product & Technical Specification Document

**Version:** 1.0  
**Last Updated:** January 2026  
**Target Platform:** Web (Vite + React + TypeScript), with future React Native mobile support

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Goals](#2-product-vision--goals)
3. [Core User Workflows](#3-core-user-workflows)
4. [Feature Specifications](#4-feature-specifications)
5. [Technical Architecture](#5-technical-architecture)
6. [Data Models](#6-data-models)
7. [API Specifications](#7-api-specifications)
8. [UI/UX Guidelines](#8-uiux-guidelines)
9. [Implementation Phases](#9-implementation-phases)
10. [Testing Strategy](#10-testing-strategy)

---

## 1. Executive Summary

### What is Pantry?

Pantry is a household food inventory management application designed to help families track what food they have, prevent food waste through expiration tracking, and streamline grocery shopping by maintaining a living shopping list.

### Core Problems Solved

| Problem | How Pantry Solves It |
|---------|---------------------|
| "Do I need to buy milk?" - Uncertainty about home inventory while shopping | Real-time inventory tracking accessible from anywhere |
| "I want to make chicken pesto pasta but don't know what ingredients I need or have" | Recipe integration with automatic ingredient checking against inventory |
| "My avocados went bad before I remembered to eat them" | Proactive expiration notifications and freshness tracking |
| "What can I make with what I have?" | Smart recipe suggestions based on current inventory |
| Manual tracking is tedious and error-prone | Multiple frictionless input methods (photos, receipts, barcodes) |

### Key Differentiators

- **Frictionless Input**: Multiple ways to add items (photo AI, receipt scanning, barcode, manual)
- **Smart Expiration**: Learns typical shelf life and predicts expiration based on storage location
- **Living Grocery List**: Automatically suggests items to buy based on usage patterns
- **Household Sharing**: Multiple family members can access and update the same inventory

---

## 2. Product Vision & Goals

### Vision Statement

Pantry eliminates food waste and grocery shopping uncertainty by making household food inventory as easy to check as your bank balance.

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Food Waste Reduction | 30% reduction in user-reported food waste | User surveys at 30/60/90 days |
| Inventory Accuracy | >85% accuracy when users verify | Periodic accuracy checks |
| User Engagement | 3+ inventory updates per week per household | Analytics tracking |
| Time Saved | 15+ minutes saved per grocery trip | User surveys |
| Retention | 60% 30-day retention | Cohort analysis |

### Design Principles

1. **Speed Over Perfection**: Fast, approximate inventory is better than perfect, tedious inventory
2. **Intelligent Defaults**: System should make smart assumptions (e.g., milk expires in ~2 weeks)
3. **Graceful Degradation**: App should work well even with incomplete data
4. **Household-First**: Designed for families, not just individuals
5. **Privacy-Conscious**: Food data is sensitive; users control their data

---

## 3. Core User Workflows

### 3.1 Adding Food After Grocery Shopping (Primary Flow)

This is the most common workflow - a user returns from grocery shopping and wants to log their purchases.

```
┌─────────────────────────────────────────────────────────────────┐
│                    POST-SHOPPING ENTRY FLOW                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐     ┌──────────────┐     ┌────────────────────┐   │
│  │  User    │     │  Choose      │     │  Review & Confirm  │   │
│  │  Opens   │────▶│  Input       │────▶│  Detected Items    │   │
│  │  App     │     │  Method      │     │  (Edit if needed)  │   │
│  └──────────┘     └──────────────┘     └────────────────────┘   │
│                          │                        │              │
│                          ▼                        ▼              │
│              ┌───────────────────────┐   ┌───────────────┐      │
│              │ Input Methods:        │   │ Items Added   │      │
│              │ • Photo of groceries  │   │ to Inventory  │      │
│              │ • Photo of receipt    │   │ with:         │      │
│              │ • Barcode scan        │   │ • Auto dates  │      │
│              │ • Manual entry        │   │ • Quantities  │      │
│              │ • Voice input         │   │ • Location    │      │
│              └───────────────────────┘   └───────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Detailed Steps:**

1. **User opens app** → Sees prominent "Add Items" button on home screen
2. **Selects input method:**
   - **Photo of Groceries** (recommended): Take photo of items on counter → AI identifies items → User confirms/edits
   - **Receipt Scan**: Take photo of receipt → OCR extracts items → User confirms/edits
   - **Barcode Scan**: Point camera at barcode → Item identified from database → Add quantity
   - **Manual Entry**: Search for item or type name → Add details
   - **Voice Input**: "Add 2 gallons of milk and a dozen eggs"
3. **Review detected items**: List shows all detected items with:
   - Item name (editable)
   - Quantity (editable)
   - Suggested storage location (fridge/freezer/pantry)
   - Auto-calculated expiration date
4. **Confirm and save**: Items added to inventory

**Input Method Comparison:**

| Method | Speed | Accuracy | Best For |
|--------|-------|----------|----------|
| Grocery Photo | Fast | Good (70-85%) | Large hauls, produce |
| Receipt Scan | Fast | Very Good (85-95%) | Packaged goods |
| Barcode Scan | Medium | Excellent (99%) | Single items with UPC |
| Manual Entry | Slow | Perfect | Custom items, bulk goods |
| Voice Input | Fast | Good (80%) | Quick additions on the go |

---

### 3.2 Checking Inventory While Shopping

User is at the grocery store and needs to know what they have at home.

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHOPPING CHECK FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  At Store                 Quick Actions                          │
│  ┌────────┐              ┌─────────────────────────────────┐    │
│  │ "Do I  │              │                                 │    │
│  │ need   │──────────────▶  Search: "milk"                │    │
│  │ milk?" │              │                                 │    │
│  └────────┘              │  Result:                        │    │
│                          │  ┌─────────────────────────┐    │    │
│                          │  │ 🥛 Whole Milk           │    │    │
│                          │  │    Qty: 0.5 gal         │    │    │
│                          │  │    Expires: 3 days      │    │    │
│                          │  │    Location: Fridge     │    │    │
│                          │  └─────────────────────────┘    │    │
│                          │                                 │    │
│                          │  💡 Recommendation: BUY MORE    │    │
│                          └─────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Features for Shopping Mode:**

1. **Quick Search**: Search bar at top of home screen, instant results
2. **Smart Suggestions**: Based on expiration dates and typical purchase patterns, shows "Recommended to Buy"
3. **Shopping List View**: One-tap access to items marked as "need to buy"
4. **Offline Mode**: Core inventory data cached for poor connectivity in stores
5. **Category Browse**: Browse by category (Dairy, Produce, Meat, etc.)

---

### 3.3 Using Food (Consumption Tracking)

Tracking when food is used or consumed to keep inventory accurate.

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONSUMPTION TRACKING                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Option A: Quick Use                   Option B: Recipe Mode     │
│  ┌────────────────────┐               ┌────────────────────┐    │
│  │ Select item from   │               │ Select "I made     │    │
│  │ inventory          │               │ [Recipe]"          │    │
│  │        │           │               │        │           │    │
│  │        ▼           │               │        ▼           │    │
│  │ Tap "Use" button   │               │ Auto-deduct all    │    │
│  │        │           │               │ recipe ingredients │    │
│  │        ▼           │               │        │           │    │
│  │ Select amount:     │               │        ▼           │    │
│  │ • Use all          │               │ Review deductions  │    │
│  │ • Use half         │               │ (adjust if needed) │    │
│  │ • Custom amount    │               │                    │    │
│  │ • Mark as expired  │               │                    │    │
│  └────────────────────┘               └────────────────────┘    │
│                                                                  │
│  Option C: Smart Deduction (Passive)                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ System learns usage patterns and auto-suggests           │   │
│  │ deductions: "Did you use the eggs this week?"            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Consumption Tracking Methods:**

| Method | User Effort | Accuracy | Use Case |
|--------|-------------|----------|----------|
| Quick Use | Low (2 taps) | High | Individual items |
| Recipe Mode | Low (1 tap) | High | Cooking meals |
| Smart Suggestions | Very Low | Medium | Passive tracking |
| Manual Adjustment | Medium | Perfect | Corrections |

---

### 3.4 Expiration Prevention Flow

How the app helps users avoid food waste through expiration tracking.

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXPIRATION PREVENTION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Timeline                          Notifications                 │
│                                                                  │
│  ──●────────●────────●────────●────────●──▶                     │
│    │        │        │        │        │                        │
│  Added    7 days   3 days   1 day   Expired                     │
│            │        │        │                                  │
│            │        │        └─ "Chicken expires TOMORROW!      │
│            │        │            Recipe ideas: [...]"           │
│            │        │                                           │
│            │        └───── "3 items expiring this week"         │
│            │                                                    │
│            └──────────── Weekly summary email (optional)        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Home Screen "Expiring Soon" Widget                        │   │
│  │ ┌─────────────────────────────────────────────────────┐  │   │
│  │ │ ⚠️ EXPIRING SOON                                     │  │   │
│  │ │                                                      │  │   │
│  │ │ 🍗 Chicken Breast    │ Tomorrow │ [Use] [Freeze]    │  │   │
│  │ │ 🥛 Milk              │ 3 days   │ [Use] [Toss]      │  │   │
│  │ │ 🥬 Spinach           │ 4 days   │ [Use]             │  │   │
│  │ └─────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Expiration Intelligence Features:**

1. **Smart Expiration Dates**: System knows typical shelf life by food type and storage location
2. **Freshness Decay Model**: Visual indicator showing freshness (green → yellow → red)
3. **Freeze Suggestion**: Before expiration, suggests freezing to extend life
4. **Recipe Integration**: Suggests recipes that use expiring ingredients first
5. **Notification Preferences**: User controls frequency and timing of alerts

---

### 3.5 Recipe Discovery & Meal Planning

Finding recipes based on available inventory.

```
┌─────────────────────────────────────────────────────────────────┐
│                    RECIPE DISCOVERY FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐     ┌─────────────────┐     ┌───────────────┐  │
│  │ User wants  │     │ Recipe Search   │     │ Recipe Detail │  │
│  │ to cook     │────▶│ & Filter        │────▶│ & Ingredient  │  │
│  │             │     │                 │     │ Check         │  │
│  └─────────────┘     └─────────────────┘     └───────────────┘  │
│                              │                       │          │
│                              ▼                       ▼          │
│              ┌───────────────────────────┐  ┌──────────────┐   │
│              │ Filter Options:           │  │ You have:    │   │
│              │ • "Use what I have"       │  │ ✅ Pasta     │   │
│              │ • "Use expiring items"    │  │ ✅ Chicken   │   │
│              │ • Cuisine type            │  │ ✅ Garlic    │   │
│              │ • Cooking time            │  │ ❌ Pesto     │   │
│              │ • Dietary restrictions    │  │              │   │
│              └───────────────────────────┘  │ Missing 1    │   │
│                                             │ [Add to List]│   │
│                                             └──────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ "I Made This" Button                                      │   │
│  │ → Auto-deducts all used ingredients from inventory        │   │
│  │ → Saves recipe to favorites                               │   │
│  │ → Learns preference for future suggestions                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3.6 Shopping List Management

The ever-evolving grocery list based on inventory and preferences.

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHOPPING LIST FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Sources for Shopping List Items:                                │
│                                                                  │
│  ┌─────────────────┐   ┌─────────────────┐   ┌───────────────┐  │
│  │ Manual Add      │   │ Auto-Suggested  │   │ Recipe-Based  │  │
│  │ "Add butter     │   │ "You're low on  │   │ "For Pasta:   │  │
│  │  to list"       │   │  eggs (2 left)" │   │  need pesto"  │  │
│  └────────┬────────┘   └────────┬────────┘   └───────┬───────┘  │
│           │                     │                    │          │
│           └─────────────────────┼────────────────────┘          │
│                                 ▼                               │
│                    ┌────────────────────────┐                   │
│                    │    SHOPPING LIST       │                   │
│                    │                        │                   │
│                    │ Produce                │                   │
│                    │ ☐ Avocados (3)        │                   │
│                    │ ☐ Spinach             │                   │
│                    │                        │                   │
│                    │ Dairy                  │                   │
│                    │ ☐ Eggs (1 dozen) 🔄   │                   │
│                    │ ☐ Butter              │                   │
│                    │                        │                   │
│                    │ 🔄 = Auto-suggested    │                   │
│                    └────────────────────────┘                   │
│                                 │                               │
│                                 ▼                               │
│                    ┌────────────────────────┐                   │
│                    │ At checkout:           │                   │
│                    │ "Mark all as bought?"  │                   │
│                    │ → Adds to inventory    │                   │
│                    │ → Clears from list     │                   │
│                    └────────────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Feature Specifications

### 4.1 Food Entry Methods

#### 4.1.1 Photo Recognition (AI-Powered)

**Description:** User takes a photo of groceries spread out on counter; AI identifies items.

**Technical Requirements:**
- Integration with vision AI model (OpenAI Vision API or similar)
- Image preprocessing for optimal recognition
- Confidence scoring for each detected item
- Fallback to manual entry for low-confidence items

**User Flow:**
1. Tap "Add by Photo" button
2. Camera opens with guidelines overlay ("Spread items out, good lighting")
3. Take photo or select from gallery
4. Loading state: "Identifying items..."
5. Results screen shows detected items in editable list
6. User confirms, edits, or removes items
7. Save to inventory

**AI Prompt Strategy:**
```
Analyze this image of groceries and return a JSON array of detected food items.
For each item include:
- name: Common food item name
- quantity: Estimated count/amount
- category: (produce/dairy/meat/bakery/pantry/frozen/beverages/other)
- confidence: 0-1 confidence score
- storage_suggestion: (refrigerator/freezer/pantry)
```

**Edge Cases:**
- Multiple of same item → Combine with quantity
- Partially visible items → Flag for user review
- Non-food items → Ignore or flag
- Poor lighting → Prompt user to retake

---

#### 4.1.2 Receipt Scanning (OCR)

**Description:** User photographs store receipt; OCR extracts line items.

**Technical Requirements:**
- OCR integration (Tesseract or cloud OCR service)
- Receipt parsing logic for various store formats
- Product database matching
- Price extraction (optional, for expense tracking)

**Supported Receipt Formats:**
- Standard printed receipts
- Digital receipts (screenshot support)
- Itemized grocery lists

**Parsing Logic:**
```
Input: "ORGANIC WHOLE MLK 64OZ    $5.99"
Output: {
  name: "Organic Whole Milk",
  quantity: "64 oz",
  price: 5.99,
  category: "dairy",
  matched_product_id: "milk_whole_organic"
}
```

---

#### 4.1.3 Barcode Scanning

**Description:** Scan UPC barcode to identify specific product.

**Technical Requirements:**
- Camera barcode detection (ZXing or similar library)
- Product database integration (Open Food Facts API)
- Fallback manual entry for unknown barcodes
- Offline barcode cache for common items

**Workflow:**
1. Tap "Scan Barcode"
2. Point camera at barcode
3. Auto-detect and lookup
4. Show product match for confirmation
5. Add quantity and save

**Unknown Barcode Handling:**
- Prompt user to enter item name
- Save barcode-to-name mapping for future use
- Option to "Teach" the app new products

---

#### 4.1.4 Manual Entry

**Description:** Traditional search-and-add workflow.

**Features:**
- Search-as-you-type with autocomplete
- Recently added items quick-add
- Frequently purchased items section
- Custom item creation for unique foods
- Bulk add mode for multiple items

**Quick Add Categories:**
- "Staples" - customizable list of always-needed items
- "Recent" - last 20 items added
- "Frequent" - statistically most-added items

---

#### 4.1.5 Voice Input

**Description:** Natural language voice commands to add items.

**Supported Commands:**
- "Add 2 gallons of milk"
- "Add eggs, butter, and bread"
- "I bought chicken and vegetables"

**Technical Requirements:**
- Web Speech API or similar
- Natural language parsing
- Quantity extraction
- Confirmation before adding

---

### 4.2 Inventory Management

#### 4.2.1 Storage Locations

**Predefined Locations:**
| Location | Typical Items | Default Expiration Modifier |
|----------|--------------|----------------------------|
| Refrigerator | Dairy, produce, leftovers | Standard |
| Freezer | Frozen goods, meat for storage | Extended (3-6 months) |
| Pantry | Dry goods, canned items, snacks | Extended (6-12 months) |
| Counter | Fruits, bread, snacks | Shortened |
| Spice Rack | Spices, seasonings | Very extended (1-2 years) |

**Custom Locations:**
- Users can create custom locations (e.g., "Garage Freezer", "Wine Fridge")
- Each location has configurable expiration modifiers

---

#### 4.2.2 Expiration Tracking

**Expiration Date Sources (Priority Order):**
1. User-entered explicit date
2. Scanned from packaging (via photo/OCR)
3. Calculated from category + storage location defaults
4. Learned from user's historical patterns

**Default Expiration Database:**
```typescript
interface ExpirationDefault {
  category: FoodCategory;
  storageLocation: StorageLocation;
  defaultDays: number;
  varianceRange: [number, number]; // min/max days
}

// Examples:
{ category: 'dairy_milk', storageLocation: 'refrigerator', defaultDays: 14, varianceRange: [7, 21] }
{ category: 'produce_leafy', storageLocation: 'refrigerator', defaultDays: 5, varianceRange: [3, 7] }
{ category: 'meat_chicken', storageLocation: 'refrigerator', defaultDays: 3, varianceRange: [2, 5] }
{ category: 'meat_chicken', storageLocation: 'freezer', defaultDays: 180, varianceRange: [90, 365] }
```

**Freshness Indicators:**
- 🟢 Fresh (>50% of shelf life remaining)
- 🟡 Use Soon (25-50% remaining)
- 🟠 Expiring (< 3 days)
- 🔴 Expired

---

#### 4.2.3 Quantity Tracking

**Quantity Types:**
| Type | Example | Deduction Options |
|------|---------|-------------------|
| Count | "12 eggs" | 1, 2, 3... or custom |
| Volume | "1 gallon milk" | 1/4, 1/2, 3/4, full |
| Weight | "2 lbs chicken" | 0.25, 0.5, 1 lb increments |
| Unit | "1 loaf bread" | Partial or full |

**Partial Use Tracking:**
- Slider interface for approximate remaining amount
- Quick buttons: "Used half", "Used most", "Finished"
- Visual indicator of remaining quantity

---

### 4.3 Shopping List

#### 4.3.1 List Sources

**Manual Additions:**
- Add any item via search
- Quick-add from inventory (tap → "Add to list")
- Voice additions

**Smart Suggestions:**
- Items below user-defined threshold
- Items approaching expiration (buy replacement)
- Pattern-based (usually buy milk every 2 weeks)
- Recipe-triggered (missing ingredients)

**Suggestion Settings:**
```typescript
interface ShoppingListSettings {
  autoSuggestLowStock: boolean;
  lowStockThreshold: 'empty' | 'almost_empty' | 'half';
  autoSuggestExpiring: boolean;
  expiringLeadTimeDays: number;
  enablePatternSuggestions: boolean;
}
```

---

#### 4.3.2 List Organization

**Grouping Options:**
- By store aisle/category (default)
- By store (for multi-store shopping)
- By priority/urgency
- Custom order

**Sharing:**
- Household members see same list
- Real-time sync across devices
- Check-off notifications to other members

---

### 4.4 Recipe Integration

#### 4.4.1 Recipe Sources

**Built-in Recipes:**
- Curated database of ~500 common recipes
- Categorized by cuisine, time, difficulty

**User Recipes:**
- Add custom recipes manually
- Import from URL (supported sites)
- Save from AI-generated suggestions

**AI-Generated Recipes:**
- "What can I make with [inventory items]?"
- "Suggest a quick dinner using chicken and pasta"
- Generated recipes can be saved

---

#### 4.4.2 Inventory Matching

**Ingredient Matching Logic:**
```typescript
interface RecipeMatch {
  recipe: Recipe;
  matchScore: number; // 0-100%
  availableIngredients: Ingredient[];
  missingIngredients: Ingredient[];
  expiringIngredientsUsed: Ingredient[];
}
```

**Matching Priority:**
1. Recipes using expiring ingredients
2. Recipes with 100% ingredient match
3. Recipes with 80%+ match
4. Recipes matching user's taste preferences

---

### 4.5 Notifications

#### 4.5.1 Notification Types

| Type | Trigger | Default Timing | User Configurable |
|------|---------|----------------|-------------------|
| Expiring Soon | Item < 3 days to expiration | Morning | Yes |
| Expired | Item past expiration | Immediate | Yes |
| Low Stock | Item below threshold | Weekly summary | Yes |
| Shopping Reminder | Weekly routine | Configurable day/time | Yes |
| Recipe Suggestion | Expiring items available | Evening before expiration | Yes |

#### 4.5.2 Notification Channels

- Push notifications (web + mobile)
- Email digest (daily/weekly summary)
- In-app notification center
- SMS (optional, for critical alerts)

---

### 4.6 Household & Sharing

#### 4.6.1 Household Model

```typescript
interface Household {
  id: string;
  name: string;
  members: HouseholdMember[];
  inventory: FoodItem[];
  shoppingLists: ShoppingList[];
  recipes: Recipe[];
  settings: HouseholdSettings;
}

interface HouseholdMember {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  permissions: Permission[];
  joinedAt: Date;
}
```

**Permissions:**
- View inventory
- Add items
- Remove/use items
- Manage shopping list
- Invite members
- Manage settings

---

## 5. Technical Architecture

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────┐          ┌─────────────────────┐           │
│  │   Web Application   │          │   Mobile App        │           │
│  │   (Vite + React)    │          │   (React Native)    │           │
│  │                     │          │   [Future]          │           │
│  └──────────┬──────────┘          └──────────┬──────────┘           │
│             │                                │                       │
│             └────────────────┬───────────────┘                       │
│                              │                                       │
│                    ┌─────────▼─────────┐                            │
│                    │  Shared Package   │                            │
│                    │  (Types, Utils,   │                            │
│                    │   API Client)     │                            │
│                    └─────────┬─────────┘                            │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────────┐
│                        API LAYER                                      │
├──────────────────────────────┼───────────────────────────────────────┤
│                              │                                       │
│                    ┌─────────▼─────────┐                            │
│                    │    Supabase       │                            │
│                    │                   │                            │
│                    │ ┌───────────────┐ │                            │
│                    │ │ Auth          │ │                            │
│                    │ └───────────────┘ │                            │
│                    │ ┌───────────────┐ │                            │
│                    │ │ Database      │ │                            │
│                    │ │ (PostgreSQL)  │ │                            │
│                    │ └───────────────┘ │                            │
│                    │ ┌───────────────┐ │                            │
│                    │ │ Storage       │ │                            │
│                    │ │ (Images)      │ │                            │
│                    │ └───────────────┘ │                            │
│                    │ ┌───────────────┐ │                            │
│                    │ │ Edge          │ │                            │
│                    │ │ Functions     │ │                            │
│                    │ └───────────────┘ │                            │
│                    │ ┌───────────────┐ │                            │
│                    │ │ Realtime      │ │                            │
│                    │ └───────────────┘ │                            │
│                    └─────────┬─────────┘                            │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────────┐
│                    EXTERNAL SERVICES                                  │
├──────────────────────────────┼───────────────────────────────────────┤
│                              │                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ OpenAI API  │  │ Open Food   │  │ Recipe API  │  │ Push        │ │
│  │ (Vision +   │  │ Facts       │  │ (Spoonacular│  │ Notification│ │
│  │  Text)      │  │ (Barcodes)  │  │  or custom) │  │ Service     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.2 Project Structure

```
pantry/
├── apps/
│   ├── web/                          # Vite + React web app
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── components/           # React components
│   │   │   │   ├── common/           # Shared UI components
│   │   │   │   ├── inventory/        # Inventory-related components
│   │   │   │   ├── shopping/         # Shopping list components
│   │   │   │   ├── recipes/          # Recipe components
│   │   │   │   └── layout/           # Layout components
│   │   │   ├── pages/                # Page components (routes)
│   │   │   ├── hooks/                # Custom React hooks
│   │   │   ├── contexts/             # React contexts
│   │   │   ├── services/             # API service layer
│   │   │   ├── utils/                # Utility functions
│   │   │   ├── styles/               # Global styles
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── mobile/                       # React Native app (future)
│       └── [structure TBD]
│
├── packages/
│   ├── shared/                       # Shared code between web & mobile
│   │   ├── src/
│   │   │   ├── types/                # TypeScript type definitions
│   │   │   │   ├── food.ts
│   │   │   │   ├── inventory.ts
│   │   │   │   ├── recipe.ts
│   │   │   │   ├── shopping.ts
│   │   │   │   ├── user.ts
│   │   │   │   └── index.ts
│   │   │   ├── constants/            # Shared constants
│   │   │   │   ├── categories.ts
│   │   │   │   ├── expirationDefaults.ts
│   │   │   │   └── index.ts
│   │   │   ├── utils/                # Shared utilities
│   │   │   │   ├── dateUtils.ts
│   │   │   │   ├── quantityUtils.ts
│   │   │   │   └── index.ts
│   │   │   └── api/                  # API client
│   │   │       ├── supabaseClient.ts
│   │   │       ├── inventoryApi.ts
│   │   │       ├── shoppingApi.ts
│   │   │       ├── recipeApi.ts
│   │   │       └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── ui/                           # Shared UI components (future)
│       └── [for React Native sharing]
│
├── supabase/
│   ├── migrations/                   # Database migrations
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_households.sql
│   │   └── ...
│   ├── functions/                    # Edge functions
│   │   ├── process-image/
│   │   ├── process-receipt/
│   │   ├── barcode-lookup/
│   │   └── generate-recipe/
│   ├── seed.sql                      # Seed data
│   └── config.toml
│
├── docs/                             # Documentation
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── CONTRIBUTING.md
│
├── package.json                      # Root package.json (monorepo)
├── pnpm-workspace.yaml               # pnpm workspace config
├── tsconfig.base.json                # Base TypeScript config
└── README.md
```

### 5.3 Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend Framework** | React 18+ | Industry standard, excellent ecosystem |
| **Build Tool** | Vite | Fast dev server, optimized builds |
| **Language** | TypeScript | Type safety, better DX |
| **Styling** | Tailwind CSS | Rapid UI development, consistent design |
| **State Management** | TanStack Query + Zustand | Server state + client state separation |
| **Routing** | React Router v6 | Standard for React SPAs |
| **Forms** | React Hook Form + Zod | Performant forms with validation |
| **Backend** | Supabase | Auth, DB, Storage, Realtime, Edge Functions |
| **Database** | PostgreSQL (via Supabase) | Robust, relational, good for inventory |
| **AI/ML** | OpenAI API | Vision for photo recognition, text for NLP |
| **Barcode DB** | Open Food Facts API | Free, comprehensive product database |
| **Testing** | Vitest + Testing Library | Fast, modern testing tools |
| **Mobile (Future)** | React Native | Code sharing with web app |

### 5.4 Key Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@supabase/supabase-js": "^2.38.0",
    "@tanstack/react-query": "^5.8.0",
    "zustand": "^4.4.0",
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0",
    "date-fns": "^2.30.0",
    "lucide-react": "^0.292.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.1.0",
    "eslint": "^8.54.0",
    "prettier": "^3.1.0"
  }
}
```

---

## 6. Data Models

### 6.1 Core Entities

#### User

```typescript
interface User {
  id: string;                          // UUID
  email: string;
  displayName: string;
  avatarUrl?: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

interface UserPreferences {
  defaultStorageLocation: StorageLocation;
  notificationSettings: NotificationSettings;
  dietaryRestrictions: DietaryRestriction[];
  measurementSystem: 'metric' | 'imperial';
  language: string;
  timezone: string;
}

interface NotificationSettings {
  expirationWarnings: boolean;
  expirationLeadDays: number;        // How many days before to warn
  shoppingReminders: boolean;
  shoppingReminderDay: number;       // 0-6, Sunday-Saturday
  weeklyDigest: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
}
```

#### Household

```typescript
interface Household {
  id: string;                          // UUID
  name: string;
  inviteCode: string;                  // For joining household
  ownerId: string;                     // User ID of owner
  settings: HouseholdSettings;
  createdAt: Date;
  updatedAt: Date;
}

interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
}

interface HouseholdSettings {
  defaultExpirationLeadDays: number;
  autoSuggestShoppingItems: boolean;
  sharedRecipes: boolean;
}
```

#### Food Item (Inventory)

```typescript
interface FoodItem {
  id: string;                          // UUID
  householdId: string;
  name: string;
  category: FoodCategory;
  subcategory?: string;
  
  // Quantity tracking
  quantity: number;
  quantityUnit: QuantityUnit;
  originalQuantity: number;            // For tracking usage
  
  // Storage & freshness
  storageLocation: StorageLocation;
  purchaseDate: Date;
  expirationDate: Date;
  expirationSource: 'scanned' | 'calculated' | 'manual';
  freshnessScore: number;              // 0-100, calculated
  
  // Product identification
  barcode?: string;
  brand?: string;
  productId?: string;                  // Reference to product database
  
  // Media
  imageUrl?: string;
  
  // Metadata
  notes?: string;
  tags: string[];
  addedBy: string;                     // User ID
  addedVia: 'photo' | 'receipt' | 'barcode' | 'manual' | 'voice';
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  consumedAt?: Date;                   // When fully used/discarded
  status: 'active' | 'consumed' | 'expired' | 'discarded';
}

type FoodCategory = 
  | 'produce'
  | 'dairy'
  | 'meat'
  | 'seafood'
  | 'bakery'
  | 'frozen'
  | 'pantry'
  | 'beverages'
  | 'condiments'
  | 'snacks'
  | 'prepared'
  | 'other';

type StorageLocation = 
  | 'refrigerator'
  | 'freezer'
  | 'pantry'
  | 'counter'
  | 'spice_rack'
  | string;                            // Custom locations

type QuantityUnit = 
  | 'count'
  | 'oz'
  | 'lb'
  | 'g'
  | 'kg'
  | 'ml'
  | 'l'
  | 'gal'
  | 'cup'
  | 'tbsp'
  | 'tsp'
  | 'unit'
  | 'pack'
  | 'bunch'
  | 'dozen';
```

#### Shopping List

```typescript
interface ShoppingList {
  id: string;
  householdId: string;
  name: string;                        // e.g., "Weekly Groceries"
  isDefault: boolean;
  items: ShoppingListItem[];
  createdAt: Date;
  updatedAt: Date;
}

interface ShoppingListItem {
  id: string;
  shoppingListId: string;
  name: string;
  category: FoodCategory;
  quantity?: number;
  quantityUnit?: QuantityUnit;
  notes?: string;
  
  // Source tracking
  source: 'manual' | 'low_stock' | 'expiring' | 'recipe' | 'pattern';
  sourceItemId?: string;               // Reference to FoodItem or Recipe
  
  // Status
  isChecked: boolean;
  checkedBy?: string;                  // User ID
  checkedAt?: Date;
  
  // Organization
  priority: 'low' | 'normal' | 'high';
  store?: string;                      // Optional store assignment
  aisle?: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

#### Recipe

```typescript
interface Recipe {
  id: string;
  householdId?: string;                // null for global recipes
  name: string;
  description?: string;
  
  // Content
  ingredients: RecipeIngredient[];
  instructions: string[];
  
  // Metadata
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  tags: string[];
  dietaryInfo: DietaryRestriction[];
  
  // Media
  imageUrl?: string;
  sourceUrl?: string;                  // If imported
  
  // User interaction
  isFavorite: boolean;
  timesCooked: number;
  lastCookedAt?: Date;
  rating?: number;                     // 1-5
  notes?: string;
  
  // Source
  source: 'builtin' | 'imported' | 'user' | 'ai_generated';
  createdBy?: string;                  // User ID for user-created
  
  createdAt: Date;
  updatedAt: Date;
}

interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: QuantityUnit;
  preparation?: string;                // e.g., "diced", "minced"
  isOptional: boolean;
  substitutes?: string[];
}

type DietaryRestriction = 
  | 'vegetarian'
  | 'vegan'
  | 'gluten_free'
  | 'dairy_free'
  | 'nut_free'
  | 'low_carb'
  | 'keto'
  | 'halal'
  | 'kosher';
```

### 6.2 Database Schema (PostgreSQL)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Indexes for food_items
CREATE INDEX idx_food_items_household ON public.food_items(household_id);
CREATE INDEX idx_food_items_status ON public.food_items(status);
CREATE INDEX idx_food_items_expiration ON public.food_items(expiration_date);
CREATE INDEX idx_food_items_category ON public.food_items(category);
CREATE INDEX idx_food_items_storage ON public.food_items(storage_location);
CREATE INDEX idx_food_items_barcode ON public.food_items(barcode);

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

-- Recipes
CREATE TABLE public.recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    
    ingredients JSONB NOT NULL DEFAULT '[]',
    instructions TEXT[] NOT NULL DEFAULT '{}',
    
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER,
    servings INTEGER,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    cuisine TEXT,
    tags TEXT[] DEFAULT '{}',
    dietary_info TEXT[] DEFAULT '{}',
    
    image_url TEXT,
    source_url TEXT,
    
    is_favorite BOOLEAN DEFAULT FALSE,
    times_cooked INTEGER DEFAULT 0,
    last_cooked_at TIMESTAMPTZ,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    
    source TEXT NOT NULL CHECK (source IN ('builtin', 'imported', 'user', 'ai_generated')),
    created_by UUID REFERENCES public.user_profiles(id),
    
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
    
    recipe_id UUID REFERENCES public.recipes(id),
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_usage_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Policy: Users can only access households they belong to
CREATE POLICY "Members can view household" ON public.households
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.household_members
            WHERE household_id = households.id AND user_id = auth.uid()
        )
    );

-- Policy: Users can only access food items in their households
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
    );

CREATE POLICY "Members can update food items" ON public.food_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.household_members
            WHERE household_id = food_items.household_id AND user_id = auth.uid()
        )
    );

-- Similar policies for other tables...

-- Functions for common operations
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

-- Trigger to update freshness scores daily (run via cron)
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

-- Realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.food_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_list_items;
```

---

## 7. API Specifications

### 7.1 Supabase Client Setup

```typescript
// packages/shared/src/api/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
```

### 7.2 Inventory API

```typescript
// packages/shared/src/api/inventoryApi.ts
import { supabase } from './supabaseClient';
import type { FoodItem, FoodItemInsert, FoodItemUpdate } from '../types';

export const inventoryApi = {
  // Get all active items for a household
  async getItems(householdId: string): Promise<FoodItem[]> {
    const { data, error } = await supabase
      .from('food_items')
      .select('*')
      .eq('household_id', householdId)
      .eq('status', 'active')
      .order('expiration_date', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Get items by category
  async getItemsByCategory(
    householdId: string, 
    category: string
  ): Promise<FoodItem[]> {
    const { data, error } = await supabase
      .from('food_items')
      .select('*')
      .eq('household_id', householdId)
      .eq('category', category)
      .eq('status', 'active')
      .order('expiration_date', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Get items by storage location
  async getItemsByLocation(
    householdId: string, 
    location: string
  ): Promise<FoodItem[]> {
    const { data, error } = await supabase
      .from('food_items')
      .select('*')
      .eq('household_id', householdId)
      .eq('storage_location', location)
      .eq('status', 'active')
      .order('expiration_date', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Get expiring items (within N days)
  async getExpiringItems(
    householdId: string, 
    withinDays: number = 3
  ): Promise<FoodItem[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + withinDays);
    
    const { data, error } = await supabase
      .from('food_items')
      .select('*')
      .eq('household_id', householdId)
      .eq('status', 'active')
      .lte('expiration_date', futureDate.toISOString().split('T')[0])
      .order('expiration_date', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Search items
  async searchItems(
    householdId: string, 
    query: string
  ): Promise<FoodItem[]> {
    const { data, error } = await supabase
      .from('food_items')
      .select('*')
      .eq('household_id', householdId)
      .eq('status', 'active')
      .ilike('name', `%${query}%`)
      .order('name');
    
    if (error) throw error;
    return data;
  },

  // Add single item
  async addItem(item: FoodItemInsert): Promise<FoodItem> {
    const { data, error } = await supabase
      .from('food_items')
      .insert(item)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Add multiple items (batch)
  async addItems(items: FoodItemInsert[]): Promise<FoodItem[]> {
    const { data, error } = await supabase
      .from('food_items')
      .insert(items)
      .select();
    
    if (error) throw error;
    return data;
  },

  // Update item
  async updateItem(
    id: string, 
    updates: FoodItemUpdate
  ): Promise<FoodItem> {
    const { data, error } = await supabase
      .from('food_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Use item (reduce quantity or mark consumed)
  async useItem(
    id: string, 
    quantityUsed: number, 
    userId: string,
    recipeId?: string
  ): Promise<FoodItem> {
    // Get current item
    const { data: item, error: fetchError } = await supabase
      .from('food_items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    const newQuantity = Math.max(0, item.quantity - quantityUsed);
    const newStatus = newQuantity === 0 ? 'consumed' : 'active';
    
    // Update item
    const { data: updatedItem, error: updateError } = await supabase
      .from('food_items')
      .update({
        quantity: newQuantity,
        status: newStatus,
        consumed_at: newStatus === 'consumed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    // Log usage
    await supabase.from('food_usage_log').insert({
      food_item_id: id,
      household_id: item.household_id,
      user_id: userId,
      action: newStatus === 'consumed' ? 'consumed' : 'partial_use',
      quantity_changed: quantityUsed,
      quantity_remaining: newQuantity,
      recipe_id: recipeId,
    });
    
    return updatedItem;
  },

  // Discard item (mark as discarded)
  async discardItem(
    id: string, 
    userId: string, 
    reason: 'expired' | 'spoiled' | 'other'
  ): Promise<void> {
    const { data: item, error: fetchError } = await supabase
      .from('food_items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    await supabase
      .from('food_items')
      .update({
        status: 'discarded',
        consumed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    
    // Log discard
    await supabase.from('food_usage_log').insert({
      food_item_id: id,
      household_id: item.household_id,
      user_id: userId,
      action: 'discarded',
      quantity_changed: item.quantity,
      quantity_remaining: 0,
      notes: reason,
    });
  },

  // Subscribe to realtime changes
  subscribeToChanges(
    householdId: string, 
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`food_items:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_items',
          filter: `household_id=eq.${householdId}`,
        },
        callback
      )
      .subscribe();
  },
};
```

### 7.3 Shopping List API

```typescript
// packages/shared/src/api/shoppingApi.ts
import { supabase } from './supabaseClient';
import type { ShoppingList, ShoppingListItem } from '../types';

export const shoppingApi = {
  // Get default shopping list for household
  async getDefaultList(householdId: string): Promise<ShoppingList> {
    const { data, error } = await supabase
      .from('shopping_lists')
      .select(`
        *,
        items:shopping_list_items(*)
      `)
      .eq('household_id', householdId)
      .eq('is_default', true)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get all shopping lists for household
  async getLists(householdId: string): Promise<ShoppingList[]> {
    const { data, error } = await supabase
      .from('shopping_lists')
      .select(`
        *,
        items:shopping_list_items(*)
      `)
      .eq('household_id', householdId)
      .order('is_default', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Add item to list
  async addItem(
    listId: string, 
    item: Omit<ShoppingListItem, 'id' | 'shopping_list_id' | 'created_at' | 'updated_at'>
  ): Promise<ShoppingListItem> {
    const { data, error } = await supabase
      .from('shopping_list_items')
      .insert({ ...item, shopping_list_id: listId })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Toggle item checked status
  async toggleItemChecked(
    itemId: string, 
    userId: string
  ): Promise<ShoppingListItem> {
    const { data: item, error: fetchError } = await supabase
      .from('shopping_list_items')
      .select('is_checked')
      .eq('id', itemId)
      .single();
    
    if (fetchError) throw fetchError;
    
    const { data, error } = await supabase
      .from('shopping_list_items')
      .update({
        is_checked: !item.is_checked,
        checked_by: !item.is_checked ? userId : null,
        checked_at: !item.is_checked ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Remove item from list
  async removeItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('shopping_list_items')
      .delete()
      .eq('id', itemId);
    
    if (error) throw error;
  },

  // Clear checked items and optionally add to inventory
  async clearCheckedItems(
    listId: string, 
    addToInventory: boolean = false,
    householdId?: string,
    userId?: string
  ): Promise<void> {
    // Get checked items
    const { data: checkedItems, error: fetchError } = await supabase
      .from('shopping_list_items')
      .select('*')
      .eq('shopping_list_id', listId)
      .eq('is_checked', true);
    
    if (fetchError) throw fetchError;
    
    if (addToInventory && householdId && userId) {
      // Add to inventory (simplified - would need proper mapping)
      const inventoryItems = checkedItems.map(item => ({
        household_id: householdId,
        name: item.name,
        category: item.category || 'other',
        quantity: item.quantity || 1,
        quantity_unit: item.quantity_unit || 'unit',
        original_quantity: item.quantity || 1,
        storage_location: 'pantry', // Default, user can change
        purchase_date: new Date().toISOString().split('T')[0],
        expiration_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 7 days
        expiration_source: 'calculated',
        added_by: userId,
        added_via: 'manual',
      }));
      
      await supabase.from('food_items').insert(inventoryItems);
    }
    
    // Delete checked items
    const { error } = await supabase
      .from('shopping_list_items')
      .delete()
      .eq('shopping_list_id', listId)
      .eq('is_checked', true);
    
    if (error) throw error;
  },

  // Generate smart suggestions based on inventory
  async generateSuggestions(householdId: string): Promise<ShoppingListItem[]> {
    // Get low stock items
    const { data: lowStockItems, error } = await supabase
      .from('food_items')
      .select('*')
      .eq('household_id', householdId)
      .eq('status', 'active')
      .lt('quantity', 2); // Threshold for "low"
    
    if (error) throw error;
    
    // Get recently consumed items (might want to restock)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentlyConsumed, error: consumedError } = await supabase
      .from('food_items')
      .select('*')
      .eq('household_id', householdId)
      .eq('status', 'consumed')
      .gte('consumed_at', thirtyDaysAgo.toISOString());
    
    if (consumedError) throw consumedError;
    
    // Convert to shopping list item format
    const suggestions: Partial<ShoppingListItem>[] = [
      ...lowStockItems.map(item => ({
        name: item.name,
        category: item.category,
        quantity: item.original_quantity - item.quantity,
        quantity_unit: item.quantity_unit,
        source: 'low_stock' as const,
        source_item_id: item.id,
        priority: 'normal' as const,
      })),
      ...recentlyConsumed.map(item => ({
        name: item.name,
        category: item.category,
        quantity: item.original_quantity,
        quantity_unit: item.quantity_unit,
        source: 'pattern' as const,
        source_item_id: item.id,
        priority: 'low' as const,
      })),
    ];
    
    return suggestions as ShoppingListItem[];
  },

  // Subscribe to realtime changes
  subscribeToChanges(listId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`shopping_list_items:${listId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_list_items',
          filter: `shopping_list_id=eq.${listId}`,
        },
        callback
      )
      .subscribe();
  },
};
```

### 7.4 Edge Functions

#### Image Processing Function

```typescript
// supabase/functions/process-image/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

interface DetectedItem {
  name: string;
  quantity: number;
  quantityUnit: string;
  category: string;
  confidence: number;
  storageSuggestion: string;
}

serve(async (req) => {
  try {
    const { imageBase64, householdId, userId } = await req.json();
    
    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'system',
          content: `You are a food identification assistant. Analyze the image of groceries and identify all food items visible.
          
For each item, provide:
- name: Common food item name (e.g., "Whole Milk", "Granny Smith Apples")
- quantity: Estimated count or amount (number)
- quantityUnit: Unit of measurement (count, lb, oz, gal, etc.)
- category: One of: produce, dairy, meat, seafood, bakery, frozen, pantry, beverages, condiments, snacks, prepared, other
- confidence: Your confidence level 0-1
- storageSuggestion: One of: refrigerator, freezer, pantry, counter

Return a JSON array of objects. Only include food items you can clearly identify.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
            {
              type: 'text',
              text: 'Identify all food items in this image.',
            },
          ],
        },
      ],
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });
    
    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);
    const items: DetectedItem[] = parsed.items || [];
    
    return new Response(
      JSON.stringify({
        success: true,
        items,
        rawResponse: content,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing image:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
```

#### Receipt Processing Function

```typescript
// supabase/functions/process-receipt/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import OpenAI from 'https://esm.sh/openai@4';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

serve(async (req) => {
  try {
    const { imageBase64 } = await req.json();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'system',
          content: `You are a receipt parsing assistant. Extract all food items from the grocery receipt image.
          
For each line item, provide:
- name: Clean product name (expand abbreviations, remove store codes)
- quantity: Amount purchased (number)
- quantityUnit: Unit if specified (lb, oz, each, etc.)
- price: Price paid (number, without currency symbol)
- category: Best guess category (produce, dairy, meat, seafood, bakery, frozen, pantry, beverages, condiments, snacks, prepared, other)

Return a JSON object with:
- storeName: Name of the store
- date: Purchase date if visible (ISO format)
- items: Array of items
- subtotal: Subtotal if visible
- total: Total if visible

Skip non-food items like bags, coupons, etc.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
            {
              type: 'text',
              text: 'Parse this grocery receipt and extract all food items.',
            },
          ],
        },
      ],
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });
    
    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);
    
    return new Response(
      JSON.stringify({
        success: true,
        ...parsed,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing receipt:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
```

#### Barcode Lookup Function

```typescript
// supabase/functions/barcode-lookup/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  try {
    const { barcode } = await req.json();
    
    // Try Open Food Facts API
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );
    
    const data = await response.json();
    
    if (data.status === 1 && data.product) {
      const product = data.product;
      
      return new Response(
        JSON.stringify({
          success: true,
          found: true,
          product: {
            name: product.product_name || product.product_name_en,
            brand: product.brands,
            category: mapCategory(product.categories_tags?.[0]),
            quantity: product.quantity,
            imageUrl: product.image_url,
            nutritionGrade: product.nutrition_grades,
            ingredients: product.ingredients_text,
            allergens: product.allergens_tags,
          },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        found: false,
        barcode,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error looking up barcode:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

function mapCategory(openFoodFactsCategory?: string): string {
  if (!openFoodFactsCategory) return 'other';
  
  const category = openFoodFactsCategory.toLowerCase();
  
  if (category.includes('dairy') || category.includes('milk')) return 'dairy';
  if (category.includes('meat') || category.includes('poultry')) return 'meat';
  if (category.includes('fish') || category.includes('seafood')) return 'seafood';
  if (category.includes('fruit') || category.includes('vegetable')) return 'produce';
  if (category.includes('bread') || category.includes('bakery')) return 'bakery';
  if (category.includes('frozen')) return 'frozen';
  if (category.includes('beverage') || category.includes('drink')) return 'beverages';
  if (category.includes('snack')) return 'snacks';
  if (category.includes('sauce') || category.includes('condiment')) return 'condiments';
  
  return 'pantry';
}
```

---

## 8. UI/UX Guidelines

### 8.1 Design Principles

1. **Speed First**: Every common action should be achievable in ≤3 taps
2. **Visual Clarity**: Color-coded freshness indicators, clear category icons
3. **Forgiving Interface**: Easy undo, edit, and delete operations
4. **Offline Capable**: Core features work without internet
5. **Accessibility**: WCAG 2.1 AA compliant

### 8.2 Color System

```typescript
// Freshness colors
const freshnessColors = {
  fresh: '#22C55E',      // Green - >50% life remaining
  useSoon: '#EAB308',    // Yellow - 25-50% remaining
  expiring: '#F97316',   // Orange - <3 days
  expired: '#EF4444',    // Red - past expiration
};

// Category colors
const categoryColors = {
  produce: '#22C55E',
  dairy: '#3B82F6',
  meat: '#EF4444',
  seafood: '#06B6D4',
  bakery: '#F59E0B',
  frozen: '#6366F1',
  pantry: '#8B5CF6',
  beverages: '#EC4899',
  condiments: '#F97316',
  snacks: '#84CC16',
  prepared: '#14B8A6',
  other: '#6B7280',
};

// Storage location colors
const locationColors = {
  refrigerator: '#3B82F6',
  freezer: '#6366F1',
  pantry: '#8B5CF6',
  counter: '#F59E0B',
  spice_rack: '#EC4899',
};
```

### 8.3 Component Library

Key UI components to build:

| Component | Description | Priority |
|-----------|-------------|----------|
| `FoodItemCard` | Compact card showing food item with freshness indicator | P0 |
| `FreshnessIndicator` | Visual freshness bar/badge | P0 |
| `CategoryIcon` | Icon for each food category | P0 |
| `QuantitySelector` | Increment/decrement control | P0 |
| `StorageLocationPicker` | Radio/segment control for storage | P0 |
| `ItemSearchBar` | Search with autocomplete | P0 |
| `PhotoCapture` | Camera interface for photos | P0 |
| `BarcodeScanner` | Camera-based barcode scanning | P1 |
| `RecipeCard` | Recipe preview with ingredient match | P1 |
| `ShoppingListItem` | Checkable list item | P0 |
| `ExpirationBanner` | Alert for expiring items | P1 |

### 8.4 Screen Layouts

#### Home Screen (Inventory Overview)

```
┌────────────────────────────────────────┐
│ [☰]  Pantry           [🔍] [+]        │
├────────────────────────────────────────┤
│                                        │
│ ⚠️ EXPIRING SOON (3)                  │
│ ┌────────────────────────────────────┐ │
│ │ 🍗 Chicken Breast  │ Tomorrow │    │ │
│ │ 🥛 Milk           │ 2 days   │    │ │
│ │ 🥬 Spinach        │ 3 days   │    │ │
│ └────────────────────────────────────┘ │
│                                        │
│ 📍 BY LOCATION                        │
│ ┌──────────┐ ┌──────────┐            │
│ │ 🧊       │ │ ❄️       │            │
│ │ Fridge   │ │ Freezer  │            │
│ │ 24 items │ │ 12 items │            │
│ └──────────┘ └──────────┘            │
│ ┌──────────┐ ┌──────────┐            │
│ │ 📦       │ │ 🍎       │            │
│ │ Pantry   │ │ Counter  │            │
│ │ 45 items │ │ 8 items  │            │
│ └──────────┘ └──────────┘            │
│                                        │
├────────────────────────────────────────┤
│ [🏠 Home] [📝 List] [🍳 Recipes] [⚙️] │
└────────────────────────────────────────┘
```

#### Add Items Screen

```
┌────────────────────────────────────────┐
│ [←]  Add Items                         │
├────────────────────────────────────────┤
│                                        │
│        How would you like to add?      │
│                                        │
│  ┌─────────────────────────────────┐  │
│  │  📷  Take Photo of Groceries    │  │
│  │  Best for produce, multiple items│  │
│  └─────────────────────────────────┘  │
│                                        │
│  ┌─────────────────────────────────┐  │
│  │  🧾  Scan Receipt               │  │
│  │  Best for packaged goods        │  │
│  └─────────────────────────────────┘  │
│                                        │
│  ┌─────────────────────────────────┐  │
│  │  ▦  Scan Barcode               │  │
│  │  For individual items           │  │
│  └─────────────────────────────────┘  │
│                                        │
│  ┌─────────────────────────────────┐  │
│  │  ✏️  Manual Entry               │  │
│  │  Search and add items           │  │
│  └─────────────────────────────────┘  │
│                                        │
│                                        │
│  ─────── Quick Add ───────            │
│  [🥛 Milk] [🥚 Eggs] [🍞 Bread]      │
│  [🧀 Cheese] [🍌 Bananas] [+]        │
│                                        │
└────────────────────────────────────────┘
```

#### Shopping List Screen

```
┌────────────────────────────────────────┐
│ [←]  Shopping List        [•••]        │
├────────────────────────────────────────┤
│ ┌────────────────────────────────────┐ │
│ │ 🔍 Add item...                     │ │
│ └────────────────────────────────────┘ │
│                                        │
│ 💡 SUGGESTED (3)                       │
│   ☐ Eggs (low stock)                  │
│   ☐ Milk (expiring soon)              │
│   ☐ Bread (usually buy weekly)        │
│                                        │
│ 🥬 PRODUCE                             │
│   ☐ Avocados (3)                      │
│   ☐ Spinach                           │
│   ☐ Tomatoes                          │
│                                        │
│ 🥛 DAIRY                               │
│   ☑ Butter (2)                        │
│   ☐ Greek Yogurt                      │
│                                        │
│ 🥩 MEAT                                │
│   ☐ Chicken Breast (2 lb)             │
│                                        │
│ ─────────────────────────────────────  │
│ ☑ 1 item checked                      │
│                                        │
├────────────────────────────────────────┤
│ [🏠 Home] [📝 List] [🍳 Recipes] [⚙️] │
└────────────────────────────────────────┘
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Weeks 1-3)

**Goals:** Basic infrastructure, authentication, core inventory CRUD

**Deliverables:**
- [ ] Project setup (Vite, React, TypeScript, Tailwind)
- [ ] Supabase project configuration
- [ ] Authentication flow (sign up, sign in, password reset)
- [ ] Database schema implementation
- [ ] Basic navigation structure
- [ ] User profile management
- [ ] Household creation and joining
- [ ] Manual item entry (search, add, edit, delete)
- [ ] Basic inventory list view
- [ ] Storage location filtering

**Key Files:**
```
apps/web/src/
├── pages/
│   ├── LoginPage.tsx
│   ├── SignupPage.tsx
│   ├── HomePage.tsx
│   └── InventoryPage.tsx
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   └── Navigation.tsx
│   ├── inventory/
│   │   ├── FoodItemCard.tsx
│   │   ├── FoodItemForm.tsx
│   │   └── InventoryList.tsx
│   └── common/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Modal.tsx
```

### Phase 2: Smart Input (Weeks 4-6)

**Goals:** AI-powered food entry methods

**Deliverables:**
- [ ] Photo capture component
- [ ] OpenAI Vision integration for grocery photos
- [ ] Receipt scanning with OCR
- [ ] Barcode scanning integration
- [ ] Open Food Facts API integration
- [ ] Item review and confirmation flow
- [ ] Batch item addition
- [ ] Quick-add favorites

**Key Files:**
```
apps/web/src/
├── pages/
│   └── AddItemsPage.tsx
├── components/
│   ├── add-items/
│   │   ├── PhotoCapture.tsx
│   │   ├── ReceiptScanner.tsx
│   │   ├── BarcodeScanner.tsx
│   │   └── ItemReviewList.tsx
supabase/functions/
├── process-image/
├── process-receipt/
└── barcode-lookup/
```

### Phase 3: Expiration & Notifications (Weeks 7-8)

**Goals:** Expiration tracking and alert system

**Deliverables:**
- [ ] Expiration date calculation logic
- [ ] Default expiration database
- [ ] Freshness score calculation
- [ ] Expiring soon dashboard widget
- [ ] Push notification setup (web)
- [ ] Email digest integration
- [ ] Notification preferences UI
- [ ] Freeze/extend life suggestions

**Key Files:**
```
apps/web/src/
├── components/
│   ├── inventory/
│   │   ├── FreshnessIndicator.tsx
│   │   └── ExpiringItemsWidget.tsx
│   └── settings/
│       └── NotificationSettings.tsx
packages/shared/src/
├── utils/
│   └── expirationUtils.ts
└── constants/
    └── expirationDefaults.ts
```

### Phase 4: Shopping List (Weeks 9-10)

**Goals:** Complete shopping list functionality

**Deliverables:**
- [ ] Shopping list CRUD
- [ ] Item checking/unchecking
- [ ] Category-based organization
- [ ] Smart suggestions engine
- [ ] Realtime sync between household members
- [ ] "Add to inventory" from checked items
- [ ] Multiple list support
- [ ] Share list view

**Key Files:**
```
apps/web/src/
├── pages/
│   └── ShoppingListPage.tsx
├── components/
│   └── shopping/
│       ├── ShoppingList.tsx
│       ├── ShoppingListItem.tsx
│       ├── AddItemToList.tsx
│       └── SuggestedItems.tsx
```

### Phase 5: Recipes & Consumption (Weeks 11-13)

**Goals:** Recipe integration and usage tracking

**Deliverables:**
- [ ] Recipe database schema
- [ ] Recipe CRUD
- [ ] Ingredient matching against inventory
- [ ] "What can I make?" feature
- [ ] "I made this" consumption flow
- [ ] Recipe import from URL
- [ ] AI recipe suggestions
- [ ] Recipe favorites and history

**Key Files:**
```
apps/web/src/
├── pages/
│   ├── RecipesPage.tsx
│   └── RecipeDetailPage.tsx
├── components/
│   └── recipes/
│       ├── RecipeCard.tsx
│       ├── RecipeDetail.tsx
│       ├── IngredientMatch.tsx
│       └── RecipeForm.tsx
supabase/functions/
└── generate-recipe/
```

### Phase 6: Polish & Optimization (Weeks 14-16)

**Goals:** Performance, UX refinements, and launch prep

**Deliverables:**
- [ ] Offline mode (service worker)
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] Loading states and skeletons
- [ ] Onboarding flow
- [ ] Analytics integration
- [ ] Bug fixes and edge cases
- [ ] Documentation
- [ ] Production deployment

---

## 10. Testing Strategy

### 10.1 Testing Pyramid

```
              /\
             /  \
            / E2E\       ← Playwright (critical user flows)
           /______\
          /        \
         /Integration\   ← Vitest + MSW (API integration)
        /______________\
       /                \
      /    Unit Tests    \  ← Vitest (utilities, hooks, components)
     /____________________\
```

### 10.2 Test Coverage Goals

| Layer | Target Coverage | Focus Areas |
|-------|-----------------|-------------|
| Unit | 80% | Utilities, hooks, business logic |
| Integration | 60% | API calls, state management |
| E2E | Critical paths | Auth, add items, use items, shopping list |

### 10.3 Example Tests

```typescript
// Unit test example: expirationUtils.test.ts
import { describe, it, expect } from 'vitest';
import { calculateFreshnessScore, getDefaultExpiration } from './expirationUtils';

describe('calculateFreshnessScore', () => {
  it('returns 100 for items purchased today with future expiration', () => {
    const today = new Date();
    const expiration = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    expect(calculateFreshnessScore(today, expiration)).toBe(100);
  });
  
  it('returns 0 for expired items', () => {
    const today = new Date();
    const expiration = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000);
    
    expect(calculateFreshnessScore(today, expiration)).toBe(0);
  });
  
  it('returns 50 for items at half their shelf life', () => {
    const today = new Date();
    const purchased = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
    const expiration = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    expect(calculateFreshnessScore(purchased, expiration, today)).toBe(50);
  });
});

describe('getDefaultExpiration', () => {
  it('returns correct expiration for milk in refrigerator', () => {
    const result = getDefaultExpiration('dairy_milk', 'refrigerator');
    expect(result.defaultDays).toBe(14);
  });
  
  it('returns extended expiration for meat in freezer', () => {
    const result = getDefaultExpiration('meat_chicken', 'freezer');
    expect(result.defaultDays).toBeGreaterThan(90);
  });
});
```

```typescript
// Integration test example: inventoryApi.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { inventoryApi } from './inventoryApi';

const server = setupServer(
  http.get('*/rest/v1/food_items*', () => {
    return HttpResponse.json([
      { id: '1', name: 'Milk', category: 'dairy', quantity: 1 },
      { id: '2', name: 'Eggs', category: 'dairy', quantity: 12 },
    ]);
  })
);

beforeEach(() => server.listen());
afterEach(() => server.resetHandlers());

describe('inventoryApi', () => {
  describe('getItems', () => {
    it('fetches items for a household', async () => {
      const items = await inventoryApi.getItems('household-123');
      
      expect(items).toHaveLength(2);
      expect(items[0].name).toBe('Milk');
    });
  });
});
```

```typescript
// E2E test example: add-item.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Add Item Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/');
  });
  
  test('can add item manually', async ({ page }) => {
    // Navigate to add items
    await page.click('[data-testid="add-items-button"]');
    await page.click('[data-testid="manual-entry-option"]');
    
    // Fill in item details
    await page.fill('[data-testid="item-name-input"]', 'Organic Milk');
    await page.selectOption('[data-testid="category-select"]', 'dairy');
    await page.fill('[data-testid="quantity-input"]', '1');
    await page.selectOption('[data-testid="location-select"]', 'refrigerator');
    
    // Save
    await page.click('[data-testid="save-item-button"]');
    
    // Verify item appears in inventory
    await page.waitForURL('/');
    await expect(page.getByText('Organic Milk')).toBeVisible();
  });
  
  test('can search existing inventory', async ({ page }) => {
    await page.fill('[data-testid="search-input"]', 'milk');
    await page.keyboard.press('Enter');
    
    await expect(page.getByText('Organic Milk')).toBeVisible();
  });
});
```

---

## Appendix A: Expiration Defaults Database

```typescript
// packages/shared/src/constants/expirationDefaults.ts

export interface ExpirationDefault {
  category: string;
  subcategory?: string;
  storageLocation: string;
  defaultDays: number;
  varianceRange: [number, number];
}

export const EXPIRATION_DEFAULTS: ExpirationDefault[] = [
  // Dairy
  { category: 'dairy', subcategory: 'milk_whole', storageLocation: 'refrigerator', defaultDays: 14, varianceRange: [7, 21] },
  { category: 'dairy', subcategory: 'milk_skim', storageLocation: 'refrigerator', defaultDays: 14, varianceRange: [7, 21] },
  { category: 'dairy', subcategory: 'yogurt', storageLocation: 'refrigerator', defaultDays: 21, varianceRange: [14, 30] },
  { category: 'dairy', subcategory: 'cheese_hard', storageLocation: 'refrigerator', defaultDays: 60, varianceRange: [30, 90] },
  { category: 'dairy', subcategory: 'cheese_soft', storageLocation: 'refrigerator', defaultDays: 14, varianceRange: [7, 21] },
  { category: 'dairy', subcategory: 'butter', storageLocation: 'refrigerator', defaultDays: 90, varianceRange: [60, 120] },
  { category: 'dairy', subcategory: 'eggs', storageLocation: 'refrigerator', defaultDays: 35, varianceRange: [21, 45] },
  
  // Produce - Fruits
  { category: 'produce', subcategory: 'apples', storageLocation: 'refrigerator', defaultDays: 30, varianceRange: [21, 45] },
  { category: 'produce', subcategory: 'bananas', storageLocation: 'counter', defaultDays: 5, varianceRange: [3, 7] },
  { category: 'produce', subcategory: 'berries', storageLocation: 'refrigerator', defaultDays: 5, varianceRange: [3, 7] },
  { category: 'produce', subcategory: 'citrus', storageLocation: 'refrigerator', defaultDays: 21, varianceRange: [14, 30] },
  { category: 'produce', subcategory: 'avocado', storageLocation: 'counter', defaultDays: 4, varianceRange: [2, 7] },
  { category: 'produce', subcategory: 'avocado', storageLocation: 'refrigerator', defaultDays: 7, varianceRange: [5, 10] },
  
  // Produce - Vegetables
  { category: 'produce', subcategory: 'leafy_greens', storageLocation: 'refrigerator', defaultDays: 5, varianceRange: [3, 7] },
  { category: 'produce', subcategory: 'tomatoes', storageLocation: 'counter', defaultDays: 5, varianceRange: [3, 7] },
  { category: 'produce', subcategory: 'carrots', storageLocation: 'refrigerator', defaultDays: 21, varianceRange: [14, 30] },
  { category: 'produce', subcategory: 'broccoli', storageLocation: 'refrigerator', defaultDays: 7, varianceRange: [5, 10] },
  { category: 'produce', subcategory: 'onions', storageLocation: 'pantry', defaultDays: 30, varianceRange: [21, 45] },
  { category: 'produce', subcategory: 'potatoes', storageLocation: 'pantry', defaultDays: 21, varianceRange: [14, 30] },
  
  // Meat
  { category: 'meat', subcategory: 'chicken_raw', storageLocation: 'refrigerator', defaultDays: 2, varianceRange: [1, 3] },
  { category: 'meat', subcategory: 'chicken_raw', storageLocation: 'freezer', defaultDays: 270, varianceRange: [180, 365] },
  { category: 'meat', subcategory: 'beef_raw', storageLocation: 'refrigerator', defaultDays: 4, varianceRange: [3, 5] },
  { category: 'meat', subcategory: 'beef_raw', storageLocation: 'freezer', defaultDays: 180, varianceRange: [120, 365] },
  { category: 'meat', subcategory: 'ground_meat', storageLocation: 'refrigerator', defaultDays: 2, varianceRange: [1, 2] },
  { category: 'meat', subcategory: 'ground_meat', storageLocation: 'freezer', defaultDays: 120, varianceRange: [90, 150] },
  { category: 'meat', subcategory: 'deli_meat', storageLocation: 'refrigerator', defaultDays: 5, varianceRange: [3, 7] },
  
  // Seafood
  { category: 'seafood', subcategory: 'fish_raw', storageLocation: 'refrigerator', defaultDays: 2, varianceRange: [1, 2] },
  { category: 'seafood', subcategory: 'fish_raw', storageLocation: 'freezer', defaultDays: 180, varianceRange: [90, 270] },
  { category: 'seafood', subcategory: 'shrimp_raw', storageLocation: 'refrigerator', defaultDays: 2, varianceRange: [1, 2] },
  { category: 'seafood', subcategory: 'shrimp_raw', storageLocation: 'freezer', defaultDays: 180, varianceRange: [90, 270] },
  
  // Bakery
  { category: 'bakery', subcategory: 'bread', storageLocation: 'counter', defaultDays: 5, varianceRange: [3, 7] },
  { category: 'bakery', subcategory: 'bread', storageLocation: 'refrigerator', defaultDays: 10, varianceRange: [7, 14] },
  { category: 'bakery', subcategory: 'bread', storageLocation: 'freezer', defaultDays: 90, varianceRange: [60, 180] },
  { category: 'bakery', subcategory: 'tortillas', storageLocation: 'pantry', defaultDays: 30, varianceRange: [21, 45] },
  
  // Pantry
  { category: 'pantry', subcategory: 'pasta_dry', storageLocation: 'pantry', defaultDays: 730, varianceRange: [365, 1095] },
  { category: 'pantry', subcategory: 'rice', storageLocation: 'pantry', defaultDays: 730, varianceRange: [365, 1095] },
  { category: 'pantry', subcategory: 'canned_goods', storageLocation: 'pantry', defaultDays: 730, varianceRange: [365, 1825] },
  { category: 'pantry', subcategory: 'cereal', storageLocation: 'pantry', defaultDays: 180, varianceRange: [120, 270] },
  { category: 'pantry', subcategory: 'chips', storageLocation: 'pantry', defaultDays: 60, varianceRange: [30, 90] },
  
  // Condiments
  { category: 'condiments', subcategory: 'ketchup', storageLocation: 'refrigerator', defaultDays: 180, varianceRange: [120, 365] },
  { category: 'condiments', subcategory: 'mustard', storageLocation: 'refrigerator', defaultDays: 365, varianceRange: [180, 730] },
  { category: 'condiments', subcategory: 'mayo', storageLocation: 'refrigerator', defaultDays: 60, varianceRange: [30, 90] },
  { category: 'condiments', subcategory: 'salsa', storageLocation: 'refrigerator', defaultDays: 14, varianceRange: [7, 21] },
  
  // Beverages
  { category: 'beverages', subcategory: 'juice', storageLocation: 'refrigerator', defaultDays: 10, varianceRange: [7, 14] },
  { category: 'beverages', subcategory: 'soda', storageLocation: 'pantry', defaultDays: 180, varianceRange: [90, 270] },
  
  // Frozen
  { category: 'frozen', subcategory: 'ice_cream', storageLocation: 'freezer', defaultDays: 60, varianceRange: [30, 90] },
  { category: 'frozen', subcategory: 'frozen_vegetables', storageLocation: 'freezer', defaultDays: 240, varianceRange: [180, 365] },
  { category: 'frozen', subcategory: 'frozen_meals', storageLocation: 'freezer', defaultDays: 90, varianceRange: [60, 180] },
];

// Fallback defaults by category and location
export const CATEGORY_DEFAULTS: Record<string, Record<string, number>> = {
  produce: { refrigerator: 7, counter: 5, freezer: 180 },
  dairy: { refrigerator: 14, freezer: 90 },
  meat: { refrigerator: 3, freezer: 180 },
  seafood: { refrigerator: 2, freezer: 180 },
  bakery: { counter: 5, refrigerator: 10, freezer: 90 },
  pantry: { pantry: 180 },
  frozen: { freezer: 120 },
  beverages: { refrigerator: 14, pantry: 90 },
  condiments: { refrigerator: 90, pantry: 180 },
  snacks: { pantry: 60 },
  prepared: { refrigerator: 4, freezer: 60 },
  other: { refrigerator: 7, pantry: 30, freezer: 90 },
};
```

---

## Appendix B: Environment Variables

```bash
# .env.example

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# OpenAI (for edge functions, set in Supabase dashboard)
OPENAI_API_KEY=sk-...

# Optional: Analytics
VITE_POSTHOG_KEY=phc_...
VITE_POSTHOG_HOST=https://app.posthog.com

# Optional: Error tracking
VITE_SENTRY_DSN=https://...@sentry.io/...
```

---

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| **Household** | A group of users sharing the same inventory (typically a family) |
| **Freshness Score** | 0-100 score indicating how fresh an item is based on purchase and expiration dates |
| **Storage Location** | Where an item is stored (refrigerator, freezer, pantry, etc.) |
| **Quick Add** | Feature allowing rapid addition of frequently purchased items |
| **Smart Suggestion** | System-generated shopping list item based on patterns or low stock |
| **Usage Log** | Record of how items are consumed/discarded over time |
| **Ingredient Match** | Percentage of recipe ingredients available in inventory |

---

*End of Specification Document*
