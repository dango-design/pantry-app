// How this device shows the Pantry tab: row density, how "Everything else" is
// grouped, and which groups are open. Saved to localStorage on its own key.
//
// This is kept apart from src/stores/demoStore.ts on purpose. These are
// per-device display choices, not pantry data, so they should not move to
// Supabase with the rest of the data or be reset with the demo data.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { groupStateKey, type Grouping } from './pantryOverview'

/** compact: 42 px rows (the default). comfortable: today's large cards. */
export type Density = 'compact' | 'comfortable'

interface PantryViewState {
  density: Density
  grouping: Grouping
  /** Keys from groupStateKey() for the groups that are open. Groups start closed. */
  openGroups: string[]

  setDensity: (density: Density) => void
  setGrouping: (grouping: Grouping) => void
  setGroupOpen: (grouping: Grouping, groupKey: string, open: boolean) => void
}

export const usePantryView = create<PantryViewState>()(
  persist(
    (set) => ({
      density: 'compact',
      grouping: 'place',
      openGroups: [],

      setDensity: (density) => set({ density }),
      setGrouping: (grouping) => set({ grouping }),
      setGroupOpen: (grouping, groupKey, open) =>
        set((state) => {
          const key = groupStateKey(grouping, groupKey)
          const others = state.openGroups.filter((k) => k !== key)
          return { openGroups: open ? [...others, key] : others }
        }),
    }),
    { name: 'pantry-view', version: 1 }
  )
)
