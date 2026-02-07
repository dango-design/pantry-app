// Location icons using MUI icons to match Figma design

import ViewWeekOutlined from '@mui/icons-material/ViewWeekOutlined'
import KitchenOutlined from '@mui/icons-material/KitchenOutlined'
import AcUnitOutlined from '@mui/icons-material/AcUnitOutlined'
import CountertopsOutlined from '@mui/icons-material/CountertopsOutlined'
import LocalFireDepartmentOutlined from '@mui/icons-material/LocalFireDepartmentOutlined'

interface LocationIconProps {
  className?: string
  size?: number
}

export function PantryIcon({ className, size = 24 }: LocationIconProps) {
  return <ViewWeekOutlined className={className} style={{ fontSize: size, transform: 'rotate(-90deg)' }} />
}

export function FridgeIcon({ className, size = 24 }: LocationIconProps) {
  return <KitchenOutlined className={className} style={{ fontSize: size }} />
}

export function FreezerIcon({ className, size = 24 }: LocationIconProps) {
  return <AcUnitOutlined className={className} style={{ fontSize: size }} />
}

export function CounterIcon({ className, size = 24 }: LocationIconProps) {
  return <CountertopsOutlined className={className} style={{ fontSize: size }} />
}

export function SpiceRackIcon({ className, size = 24 }: LocationIconProps) {
  return <LocalFireDepartmentOutlined className={className} style={{ fontSize: size }} />
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
