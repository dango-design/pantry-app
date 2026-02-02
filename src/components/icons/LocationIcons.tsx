// Simple line-style location icons matching the reference design

interface LocationIconProps {
  className?: string
  size?: number
}

// Pantry - simple shelf/grid icon (horizontal lines with border)
export function PantryIcon({ className, size = 24 }: LocationIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      {/* Outer frame */}
      <rect x="4" y="3" width="16" height="18" rx="1" />
      {/* Shelf lines */}
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
    </svg>
  )
}

// Fridge - simple thermometer icon
export function FridgeIcon({ className, size = 24 }: LocationIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      {/* Thermometer body */}
      <path d="M12 3C10.5 3 9.5 4 9.5 5.5V14.5C8 15.5 7 17 7 18.5C7 21 9.5 23 12 23C14.5 23 17 21 17 18.5C17 17 16 15.5 14.5 14.5V5.5C14.5 4 13.5 3 12 3Z" />
      {/* Temperature marks */}
      <line x1="9.5" y1="7" x2="11" y2="7" />
      <line x1="9.5" y1="10" x2="11" y2="10" />
      {/* Bulb fill indicator */}
      <circle cx="12" cy="18.5" r="2" fill="currentColor" />
    </svg>
  )
}

// Freezer - simple snowflake icon
export function FreezerIcon({ className, size = 24 }: LocationIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      {/* Vertical line */}
      <line x1="12" y1="2" x2="12" y2="22" />
      {/* Horizontal line */}
      <line x1="2" y1="12" x2="22" y2="12" />
      {/* Diagonal lines */}
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
      {/* Small branches */}
      <line x1="12" y1="5" x2="9" y2="8" />
      <line x1="12" y1="5" x2="15" y2="8" />
      <line x1="12" y1="19" x2="9" y2="16" />
      <line x1="12" y1="19" x2="15" y2="16" />
    </svg>
  )
}

// Counter - simple countertop icon
export function CounterIcon({ className, size = 24 }: LocationIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      {/* Counter surface */}
      <line x1="2" y1="10" x2="22" y2="10" />
      {/* Cabinet below */}
      <rect x="3" y="10" width="18" height="11" rx="1" />
      {/* Cabinet door divider */}
      <line x1="12" y1="10" x2="12" y2="21" />
    </svg>
  )
}

// Spice Rack - simple rack with bottles
export function SpiceRackIcon({ className, size = 24 }: LocationIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      {/* Rack shelf */}
      <line x1="2" y1="20" x2="22" y2="20" />
      {/* Bottles */}
      <rect x="4" y="10" width="4" height="10" rx="1" />
      <rect x="10" y="8" width="4" height="12" rx="1" />
      <rect x="16" y="12" width="4" height="8" rx="1" />
    </svg>
  )
}

// Map storage location keys to icons
const locationIconMap: Record<string, React.FC<LocationIconProps>> = {
  refrigerator: FridgeIcon,
  fridge: FridgeIcon,
  freezer: FreezerIcon,
  pantry: PantryIcon,
  counter: CounterIcon,
  spice_rack: SpiceRackIcon,
}

export function getLocationIcon(location: string): React.FC<LocationIconProps> | null {
  const normalizedLocation = location.toLowerCase().trim()
  return locationIconMap[normalizedLocation] || null
}

export { type LocationIconProps }
