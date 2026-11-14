# Label fixtures

65 real US packaged-food labels from Open Food Facts (OFF), each with a hand-written
allergen answer key. Use them to test the verdict engine. The answers were written from
the rules below and the label text only, without looking at the engine code.

Fetched on 2026-11-08 from the OFF v2 product API
(`https://world.openfoodfacts.org/api/v2/product/<barcode>`).

## File format

One file per product, named `<category>-<short-name>-<12-digit-UPC>.json`.

| Field | Meaning |
| --- | --- |
| `id` | `off-` plus the 13-digit barcode |
| `name`, `brand` | From OFF (`product_name`, first entry of `brands`). Typos are OFF's own. |
| `gtin` | 13-digit barcode as OFF stores it |
| `source`, `sourceUrl` | Always `off` and the OFF product page |
| `labelRegion` | Always `us` |
| `ingredientsText` | The ingredient list, without the Contains and May-contain sentences |
| `containsStatement` | The "Contains ..." sentence as printed, or `null` |
| `mayContainStatement` | The precautionary sentence(s) as printed, or `null` |
| `offAllergenTags`, `offTraceTags` | OFF's own tags, copied for comparison. They are often wrong; do not use them as the answer. |
| `expected` | The answer: one value per allergen (see below) |
| `notes` | One line on any judgment call, or `""` |

The 9 keys in `expected` are `milk`, `egg`, `peanut`, `tree_nut`, `wheat`, `soy`,
`fish`, `shellfish`, `sesame`. Each value is one of `contains`, `may_contain`,
`possible`, `none`.

## Labeling rules (short version)

Each allergen gets the strongest value that applies: contains > may_contain > possible > none.

- **contains**: an ingredient or sub-ingredient is the allergen or is made from it
  (FARE's derived names: whey, casein, semolina, spelt, tahini, soy lecithin, anchovy, ...),
  or the Contains line names it.
  - Shellfish means crustaceans only (shrimp, crab, lobster, crawfish, prawns, krill).
    Clams, oysters, mussels, squid and cuttlefish are molluscs and do not count.
  - Tree nuts are the 12 in FDA's January 2025 guidance. Coconut is not a tree nut,
    unless the label's own Contains line says "tree nuts (coconut)".
  - Cold-pressed or expeller-pressed peanut oil counts as peanut.
- **may_contain**: only a precautionary line names it ("may contain", "made in a
  facility that ...", "processed on equipment that ..."). "Tree nuts" in general
  marks tree_nut.
- **possible**: only an ambiguous ingredient points to it: a highly refined oil
  (soybean oil, "vegetable oil (soybean and/or canola)", plain peanut oil), "lecithin"
  with no source, or hydrolyzed vegetable protein with no source. "Natural flavors" and
  "spices" are never possible, because US law requires allergens in them to be declared.
- **none**: everything else. These look risky but are not: cocoa butter, nutmeg, water
  chestnut, buckwheat, cream of tartar, lactic acid, calcium lactate, coconut, sunflower
  lecithin.

## Coverage

| allergen | contains | may_contain | possible | none |
| --- | ---: | ---: | ---: | ---: |
| milk | 17 | 3 | 0 | 45 |
| egg | 8 | 1 | 0 | 56 |
| peanut | 8 | 4 | 2 | 51 |
| tree_nut | 14 | 3 | 0 | 48 |
| wheat | 22 | 3 | 0 | 40 |
| soy | 23 | 4 | 7 | 31 |
| fish | 12 | 0 | 0 | 53 |
| shellfish | 4 | 2 | 0 | 59 |
| sesame | 8 | 3 | 0 | 54 |

Other counts:

- 11 fixtures have a may-contain / facility / shared-equipment statement.
- 8 fixtures get `possible` from a highly refined oil: soybean oil (Lay's, Sabra,
  Trident fish sticks, Duke's mayo, Valued Naturals sesame sticks, Jif) and plain peanut
  oil (Kirkland cashews, LouAna peanut oil). Kinder Bueno gets soy `possible` from
  unlabeled "lecithin".
- 7 fixtures have no major allergen at all (every value `none`).
- 46 fixtures have no Contains line, so the answer comes from the ingredient list alone.
- Look-alike words covered: cocoa butter (many), nutmeg (365 Worcestershire), water
  chestnuts (Ajinomoto yakisoba), buckwheat (Simple Mills cashew cookies, Dave's Killer
  Bread), cream of tartar (Simple Mills almond cookies), coconut (many), "nuts" in a name
  (Grape-Nuts), "lobster"/"shrimp" in a name with no shellfish (Red Lobster mix, Immi).
- Molluscs without crustaceans: Bar Harbor and Blount clam chowders. Nongshim lobster
  bowl has both.

Categories: baby food 2, bread 2, candy 2, canned fish 5, cereal 6, chips 2, chocolate 2,
cookies 6, crackers 3, frozen seafood 3, hummus 3, tahini 1, ice cream 1, nut butters 1,
nuts 1, oils 3, pasta 3, plant milk 2, sauces and dressings 8, snack bars 3, other snacks 1,
soups 5.

## Judgment calls worth checking

These are the cases where a reasonable engine could disagree. Each file's `notes` says why.

- `soups-immi-tom-yum-shrimp-ramen`: Contains line says "Tree Nuts (Coconut)", so
  tree_nut is `contains` (the printed statement wins).
- `baby-food-once-upon-a-farm-...`: Contains line says only "COCONUT", so tree_nut is `none`.
- `sauces-365-organic-caesar`: expeller-pressed soybean oil treated as not highly
  refined (soy `contains`); "natural anchovy flavor" treated as fish `contains`.
- `oils-spectrum-unrefined-peanut-oil` and `oils-spectrum-organic-expeller-pressed-peanut-oil`:
  peanut `contains`. The second label says both "expeller pressed" and "refined".
- `crackers-honey-maid-graham`: OFF lost the word CONTAINS; the trailing "WHEAT, SOY."
  was moved to `containsStatement`. The OFF photo confirms the printed line.
- `canned-fish-chicken-of-the-sea-chunk-light`: "(CONTAINS SOY)" sits inside the
  ingredient list, so it stays in `ingredientsText`.

## Known gaps between OFF text and the real package

The answers follow the OFF text. For three products the OFF photo shows more than the
text, so the real package would get a different answer:

- Snickers: photo adds "MAY CONTAIN ALMONDS." (tree_nut would be `may_contain`).
- Kinder Bueno: photo shows "LECITHIN AS EMULSIFIER (SOY)" and a Contains line (soy would be `contains`).
- Red Lobster biscuit mix: photo adds "May contain eggs and tree nuts."

## Text edits

- Contains and May-contain sentences were moved out of `ingredientsText` with their
  wording kept. Trailing commas were removed.
- Removed from `ingredientsText` because they are not ingredients: "contains a
  bioengineered food ingredient" (Nutter Butter, Maruchan chicken), "Packed in Thailand"
  (Safe Catch), a garbled address (Immi), and the address and package codes printed
  after the statements (Once Upon A Farm). Each is noted in the file.
- Nothing else was changed. OFF typos ("sunfluwer", "NACIN") are kept.

## License

Product data comes from Open Food Facts (openfoodfacts.org) and is available under the
Open Database License (ODbL). Product images are CC BY-SA 3.0, Open Food Facts contributors.
