// The allergy data for demo mode: a zustand store saved to localStorage, like src/stores/demoStore.ts.
//
// This is the demo version of the allergy data module. Step 3 of docs/ALLERGY_INTEGRATION.md adds a
// Supabase version (allergy_profiles, products, saved_products, scans) behind the same hooks.
//
// This file imports no engine code, so pages in the main bundle can read it cheaply.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useMemo } from 'react'
import { DEMO_HOUSEHOLD } from '@/stores/demoStore'
import type { AllergyProfile, AllergyProfileInput, SavedList, SavedProduct, ScanEntry, StoredRecord } from './types'

// Increment when the saved shape changes. A mismatch resets the allergy data only.
const ALLERGY_STORE_VERSION = 1

const MAX_SCANS = 50

interface AllergyState {
  profiles: AllergyProfile[]
  /** Who the Check page and chef card are for. null means everyone. */
  selectedProfileIds: string[] | null
  /** Product records by key ("off:<code>"). */
  products: Record<string, StoredRecord>
  saved: SavedProduct[]
  scans: ScanEntry[]

  addProfile: (input: AllergyProfileInput) => AllergyProfile
  updateProfile: (id: string, input: AllergyProfileInput) => AllergyProfile | null
  deleteProfile: (id: string) => void
  setSelectedProfileIds: (ids: string[] | null) => void

  cacheRecords: (records: StoredRecord[]) => void
  saveProduct: (entry: { gtin: string; list: SavedList; name: string | null; brand: string | null }) => void
  removeSaved: (gtin: string) => void
  addScan: (entry: Omit<ScanEntry, 'id' | 'scannedAt'>) => void
}

const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const emptyState = {
  profiles: [] as AllergyProfile[],
  selectedProfileIds: null as string[] | null,
  products: {} as Record<string, StoredRecord>,
  saved: [] as SavedProduct[],
  scans: [] as ScanEntry[],
}

export const useAllergyStore = create<AllergyState>()(
  persist(
    (set, get) => ({
      ...emptyState,

      addProfile: (input) => {
        const now = new Date().toISOString()
        const profile: AllergyProfile = {
          ...input,
          id: newId('person'),
          householdId: DEMO_HOUSEHOLD.id,
          createdAt: now,
          updatedAt: now,
        }
        set((s) => ({
          profiles: [...s.profiles, profile],
          // A new person is checked for straight away.
          selectedProfileIds: s.selectedProfileIds === null ? null : [...s.selectedProfileIds, profile.id],
        }))
        return profile
      },

      updateProfile: (id, input) => {
        const existing = get().profiles.find((p) => p.id === id)
        if (!existing) return null
        const updated: AllergyProfile = { ...existing, ...input, updatedAt: new Date().toISOString() }
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? updated : p)) }))
        return updated
      },

      deleteProfile: (id) => {
        set((s) => ({
          profiles: s.profiles.filter((p) => p.id !== id),
          selectedProfileIds: s.selectedProfileIds?.filter((x) => x !== id) ?? null,
        }))
      },

      setSelectedProfileIds: (ids) => set({ selectedProfileIds: ids }),

      cacheRecords: (records) => {
        if (records.length === 0) return
        set((s) => {
          const products = { ...s.products }
          for (const r of records) products[r.key] = r
          return { products }
        })
      },

      saveProduct: (entry) => {
        const item: SavedProduct = { ...entry, id: newId('saved'), createdAt: new Date().toISOString() }
        // One list per product: saving as Safe replaces Avoid and the other way round.
        set((s) => ({ saved: [item, ...s.saved.filter((x) => x.gtin !== entry.gtin)] }))
      },

      removeSaved: (gtin) => set((s) => ({ saved: s.saved.filter((x) => x.gtin !== gtin) })),

      addScan: (entry) => {
        const scan: ScanEntry = { ...entry, id: newId('scan'), scannedAt: new Date().toISOString() }
        set((s) => ({ scans: [scan, ...s.scans.filter((x) => x.gtin !== entry.gtin)].slice(0, MAX_SCANS) }))
      },
    }),
    {
      name: 'pantry-allergy-store',
      version: ALLERGY_STORE_VERSION,
      migrate: (persisted, version) => {
        if (version !== ALLERGY_STORE_VERSION) {
          console.log('Allergy store version mismatch, resetting allergy data')
          return { ...emptyState }
        }
        return persisted as typeof emptyState
      },
    },
  ),
)

/** The cached records for one barcode. */
export function recordsForGtin(products: Record<string, StoredRecord>, gtin: string | null | undefined): StoredRecord[] {
  if (!gtin) return []
  return Object.values(products).filter((r) => r.gtin === gtin)
}

/** Hook form of recordsForGtin. Recomputes only when the cache changes. */
export function useRecordsForGtin(gtin: string | null | undefined): StoredRecord[] {
  const products = useAllergyStore((s) => s.products)
  return useMemo(() => recordsForGtin(products, gtin), [products, gtin])
}

/** Everyone in the household, and the people currently selected. */
export function useSelectedProfiles(): { profiles: AllergyProfile[]; selected: AllergyProfile[]; selectedIds: string[] } {
  const profiles = useAllergyStore((s) => s.profiles)
  const selectedProfileIds = useAllergyStore((s) => s.selectedProfileIds)
  return useMemo(() => {
    const selectedIds = selectedProfileIds ?? profiles.map((p) => p.id)
    return { profiles, selected: profiles.filter((p) => selectedIds.includes(p.id)), selectedIds }
  }, [profiles, selectedProfileIds])
}
