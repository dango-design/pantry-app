// How wide a page's content gets on big screens. Headers use the same width
// as the body below them so their edges line up.
export type PageWidth = 'wide' | 'regular' | 'narrow'

export const PAGE_WIDTHS: Record<PageWidth, string> = {
  wide: 'max-w-7xl', // card grids and the week board
  regular: 'max-w-4xl', // two-column detail pages, the shopping list
  narrow: 'max-w-2xl', // forms, settings, single items
}

/** Page body container: phone gutters, wider gutters on desktop, centered at the page width */
export function pageContainer(width: PageWidth): string {
  return `mx-auto w-full ${PAGE_WIDTHS[width]} px-4 md:px-8`
}

/** Cards in as many columns as fit at 21rem or wider: one on phones, two or three on desktop */
export const CARD_GRID = 'grid gap-2 md:gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,21rem),1fr))]'
