import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])

  return matches
}

/**
 * Tablets and desktops (Tailwind `md`, 768px and up): the side nav replaces the
 * bottom nav, and sheets open as centered dialogs instead of sliding up.
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)')
}
