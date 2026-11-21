import { useEffect } from 'react'
import { useDemoStore } from '@/stores/demoStore'

/**
 * Keeps low staples on the shopping list. Checks when the app opens, when the
 * pantry or the staples change, and when the tab is shown again: an estimate
 * goes down with time, so a staple can become low while the app is closed.
 *
 * syncStapleList only changes state when it has something to add or clear, so
 * the effect below does not trigger itself.
 */
export function useStapleAutoAdd(): void {
  const inventory = useDemoStore((state) => state.inventory)
  const staples = useDemoStore((state) => state.staples)
  const syncStapleList = useDemoStore((state) => state.syncStapleList)

  useEffect(() => {
    syncStapleList()
  }, [inventory, staples, syncStapleList])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncStapleList()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [syncStapleList])
}
