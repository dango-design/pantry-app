// Types for the allergy checker. The engine's own types come from @allergy/verdict-engine.

import type { Profile, ProductRecord, Verdict } from '@allergy/verdict-engine'

export type { Verdict }

/** A person the household protects. They may have no account, for example a child. */
export interface AllergyProfile extends Profile {
  householdId: string
  /** Shown as a dot next to their name. */
  color: string
  createdAt: string
  updatedAt: string
}

/** What the profile editor saves. */
export type AllergyProfileInput = Pick<AllergyProfile, 'name' | 'color' | 'allergens' | 'customAvoids'>

/** One product record kept in the local cache. key is "<source>:<source id>". */
export interface StoredRecord extends ProductRecord {
  key: string
  /** 14 digits. */
  gtin: string | null
  imageUrl?: string | null
  /** Open Food Facts category tags, such as "en:snacks". Used to guess pantry's category. */
  categories?: string[]
  quantity?: string | null
  fetchedAt: string
}

export type SavedList = 'safe' | 'avoid'

export interface SavedProduct {
  id: string
  gtin: string
  list: SavedList
  name: string | null
  brand: string | null
  createdAt: string
}

export interface ScanEntry {
  id: string
  gtin: string
  overall: Verdict
  name: string | null
  brand: string | null
  scannedAt: string
}

export const PROFILE_COLORS = ['#3E7CB1', '#C2410C', '#7C3AED', '#0F766E', '#BE185D', '#4D7C0F', '#B45309', '#1D4ED8']
