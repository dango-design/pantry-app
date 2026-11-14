# Open questions

Each question has the cautious default the build uses until someone decides. The first group is from
the build plan; the rest came up while building.

## From the build plan

| Question | Needed before | Current default |
| --- | --- | --- |
| Profiles to seed: each family member's allergens, severity, and whether they avoid "may contain" | Daily use | None seeded. Add people in the app. Severe allergens avoid "may contain" by default. |
| Sign-in: email code, or Sign in with Apple and Google | Daily use | Email one-time code. The Supabase email template must include `{{ .Token }}` (see README). |
| Highly refined oils: keep yellow, or let a profile treat them as green | Daily use | Yellow for everyone. No per-profile switch yet. |
| Lazy cache vs bulk import of USDA and Open Food Facts | Discovery gets heavy use | Lazy cache. Searches also store their results, so the cache grows with use. |
| Store availability ("which store carries it") | After v1 | Not built. |
| Contributing photos back to Open Food Facts (makes them public) | After v1 | Not built. Photos stay in the private bucket. |
| Imported products with non-US labels | Daily use | A label from outside the US is never green (yellow at least), and vague words flag majors on it. |
| Chef card languages | Daily use | Spanish is on by default; 12 languages offered in Settings. |

## New

| Question | Current default |
| --- | --- |
| Review the terms Claude added to the dictionary (marked `claude`, `reviewed: false`) | They count only as "check" and guards among them hide nothing. Mark reviewed ones `"reviewed": true` in `packages/verdict-engine/data/dictionary.json`, then run `pnpm gen:dictionary`. |
| Plain "lecithin": flag egg as well as soy? | Yes, both "possible" (FARE lists lecithin as a sometimes-source of egg). |
| Plain "soy sauce": flag wheat? | Yes, "possible" (FARE). Tamari is usually wheat-free but is not exempted. |
| "Coconut cream", "yam flour", "rice pasta" and similar | Coconut cream is a sourced milk guard. Yam flour has no source yet, so plain "flour" in it still flags wheat. |
| FSIS recall API blocks automated requests (HTTP 403) | The daily job skips FSIS and says so in its result. Check from the deployed Edge Function; if it is still blocked, ask FSIS for API access or use their RSS feed. |
| Android build | Kotlin for the OCR module was only checked against stubs; there is no Android SDK on this Mac. Build with EAS or Android Studio and test a portrait photo (EXIF rotation). |
| Push notifications need an EAS project id | Without `eas init`, alerts still appear in the Alerts tab but no push is sent. |
