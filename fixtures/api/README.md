# Recorded API responses

Real responses saved for backend tests. All fetched on 2026-11-08. Bodies are saved as
returned, pretty-printed (JSON) where noted. Requests to Open Food Facts sent the header
`User-Agent: FamilyAllergyCheck/0.1 (dev fixtures)`.

## off/ (Open Food Facts)

### Product reads

URL: `https://world.openfoodfacts.org/api/v2/product/<barcode>?fields=code,product_name,product_name_en,brands,ingredients_text,ingredients_text_en,allergens_tags,traces_tags,countries_tags,last_modified_t,categories_tags,image_front_small_url,quantity`

| File | HTTP | Product | What it covers |
| --- | --- | --- | --- |
| `product-0044000037451.json` | 200 | Nutter Butter | peanut, wheat, soy; Contains line inside `ingredients_text` |
| `product-0040000424314.json` | 200 | Snickers | milk, egg, peanut, soy; no Contains line |
| `product-0051600000013.json` | 200 | Lea & Perrins Worcestershire | fish (anchovies) |
| `product-0096619267934.json` | 200 | Kirkland tempura shrimp | shellfish, wheat, soy |
| `product-0040822346108.json` | 200 | Sabra classic hummus | sesame; soybean oil (soy possible) |
| `product-0009800895250.json` | 200 | Nutella | tree nut (hazelnut), milk, soy |
| `product-0028400199148.json` | 200 | Lay's Classic | soybean oil only (soy possible) |
| `product-0879890002995.json` | 200 | Crunchmaster 6-seed crackers | sesame, soy; "Produced in a facility" line |
| `product-notfound.json` (+ `.status`) | 200 | made-up `0000000000017` | OFF does not return 404 here. It strips the leading zeros and answers `{"code":"00000017","status":0,"status_verbose":"no code or invalid code"}` with HTTP 200. |
| `product-notfound-valid-checksum.json` (+ `.status`) | 404 | made-up `0099999999990` (valid UPC check digit) | The real "not found" case: HTTP 404, `"status_verbose":"product not found"`. |

All 8 products also have a label fixture in `fixtures/labels/`.

### Search

`search-granola.json`: HTTP 200.
URL: `https://world.openfoodfacts.org/cgi/search.pl?search_terms=granola&tagtype_0=countries&tag_contains_0=contains&tag_0=united-states&json=1&page_size=10&fields=code,product_name,brands,ingredients_text_en,ingredients_text,allergens_tags,traces_tags,countries_tags,last_modified_t`

`count` is 6219 and `products` has 10 entries. The country filter means "sold in the US",
so some results are non-US products that are also sold in the US.

The search endpoint often answered HTTP 503 ("Service Temporarily Unavailable") on
2026-11-08, even at one call every 12 seconds. This file's first attempt was a 503; a
retry 30 seconds later returned 200. A client needs retry with backoff.

## usda/ (FoodData Central, Branded Foods)

URL: `https://api.nal.usda.gov/fdc/v1/foods/search?query=<UPC>&dataType=Branded&pageSize=5&api_key=DEMO_KEY`

All calls returned HTTP 200. The responses do not echo the key.

| File | Query | Hits | Matched? |
| --- | --- | --- | --- |
| `search-028400199148.json` | Lay's Classic, 12-digit | 1 | Yes, `gtinUpc` 028400199148 |
| `search-810291001002.json` | Tate's chocolate chip cookies, 12-digit | 1 | Yes, `gtinUpc` 810291001002 |
| `search-014100085478.json` | Goldfish Cheddar, 12-digit | 0 | No |
| `search-00014100085478.json` | Goldfish Cheddar, 14-digit | 1 | Yes, `gtinUpc` 00014100085478 |
| `search-044000037451.json` | Nutter Butter, 12-digit | 0 | No |
| `search-00044000037451.json` | Nutter Butter, 14-digit | 1 | Yes, `gtinUpc` 00044000037451 (FDC lists it as the 1.9 oz lunchbox pack) |
| `search-044000004637.json` | Honey Maid grahams, 12-digit | 0 | No |
| `search-0044000004637.json` | Honey Maid grahams, 13-digit | 0 | No. The 14-digit form was not tried because the key's hourly limit ran out. |
| `search-notfound.json` | made-up `000000000017` | 2516 | No. See below. |

Matched: 4 of 5 products (Lay's, Tate's, Goldfish, Nutter Butter). Honey Maid did not match.

Two things a client must handle:

- Some products are stored under the 14-digit GTIN, so a 12-digit search finds nothing.
  Try 12-digit first, then the 14-digit form (two leading zeros added to the 12-digit UPC).
- The search is full-text, not an exact barcode lookup. The made-up UPC returned 2516
  unrelated foods (ketchup, steak sauce, ...), not zero. Always check that a result's
  `gtinUpc` equals the code you searched. Real-but-missing UPCs, such as
  `search-044000037451.json`, return `totalHits: 0`.

DEMO_KEY limit: the response headers showed `x-ratelimit-limit: 10` per hour (not 30).
9 of the 10 calls were used.

## openfda/ (FDA food enforcement reports)

| File | HTTP | URL | What it covers |
| --- | --- | --- | --- |
| `enforcement-allergen.json` | 200 | `https://api.fda.gov/food/enforcement.json?search=reason_for_recall:"undeclared"+AND+report_date:[20260801+TO+20261108]&limit=20` | 20 of 112 matching recalls (milk, soy, wheat, egg, peanut, sesame, almond, and some undeclared food colors). `meta.last_updated` is 2026-10-28. |
| `enforcement-empty.json` (+ `.status`) | 404 | `https://api.fda.gov/food/enforcement.json?search=reason_for_recall:"zzqxnotarealallergen"&limit=5` | No results. openFDA answers HTTP 404 with `{"error":{"code":"NOT_FOUND","message":"No matches found!"}}`, not an empty list. |

With curl, the `[ ... TO ... ]` range needs `-g` (turn off URL globbing), or curl sends nothing.

## fsis/ (USDA FSIS recalls)

`recalls-sample.json` was **not** saved. The endpoint blocked every request:

- URL: `https://www.fsis.usda.gov/fsis/api/recall/v/1`
- Plain curl: HTTP 403, Akamai "Access Denied" page.
- With `Accept: text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7`: HTTP 403.
- With `Accept: application/json`: HTTP 403.
- A browser User-Agent was not tried; that would mean disguising the client to get past
  bot protection.

The 403 body is saved as `recalls-403.html` (status in `recalls-403.status`) so a test can
cover the blocked case. No recall records were invented. The FSIS data will need to come
from a server-side fetch that FSIS allows, or from another source.

## Licenses

- Open Food Facts data: Open Database License (ODbL), openfoodfacts.org.
- FoodData Central and openFDA: US government data, public domain.
