/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Category colors (from Figma/spec)
        category: {
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
        },
        // Freshness colors
        freshness: {
          fresh: '#22C55E',
          useSoon: '#EAB308',
          expiring: '#F97316',
          expired: '#EF4444',
        },
        // Storage location colors
        location: {
          refrigerator: '#3B82F6',
          freezer: '#6366F1',
          pantry: '#8B5CF6',
          counter: '#F59E0B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
