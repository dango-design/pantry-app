// Minimalist food icons with clean, simple designs
// Uses soft colors with blue outlines for consistency

interface FoodIconProps {
  className?: string
  size?: number
}

// === FRUITS ===

export function AppleIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path
        d="M32 18C22 18 16 28 16 38C16 50 24 54 32 54C40 54 48 50 48 38C48 28 42 18 32 18Z"
        fill="#EF4444"
        stroke="#2563EB"
        strokeWidth="2"
      />
      <path d="M32 14V10" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M34 12C38 10 40 12 38 16" fill="#22C55E" stroke="#2563EB" strokeWidth="1.5" />
      <ellipse cx="26" cy="32" rx="4" ry="3" fill="white" opacity="0.3" />
    </svg>
  )
}

export function BananaIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path
        d="M18 48C14 44 12 34 18 26C24 18 36 14 48 18C50 19 50 22 48 24C42 32 30 42 18 48Z"
        fill="#FDE047"
        stroke="#2563EB"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M48 18C50 16 52 16 52 18" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function OrangeIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <circle cx="32" cy="34" r="18" fill="#FB923C" stroke="#2563EB" strokeWidth="2" />
      <path d="M32 16V12" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
      <path d="M30 14C28 12 30 10 34 12" fill="#22C55E" />
      <circle cx="32" cy="34" r="12" stroke="#EA580C" strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
    </svg>
  )
}

export function LemonIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <ellipse cx="32" cy="34" rx="16" ry="14" fill="#FDE047" stroke="#2563EB" strokeWidth="2" />
      <path d="M16 34C14 32 14 30 16 28" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
      <path d="M48 34C50 32 50 30 48 28" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function GrapesIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <circle cx="26" cy="30" r="8" fill="#A855F7" stroke="#2563EB" strokeWidth="1.5" />
      <circle cx="38" cy="30" r="8" fill="#A855F7" stroke="#2563EB" strokeWidth="1.5" />
      <circle cx="32" cy="40" r="8" fill="#A855F7" stroke="#2563EB" strokeWidth="1.5" />
      <circle cx="24" cy="44" r="6" fill="#A855F7" stroke="#2563EB" strokeWidth="1.5" />
      <circle cx="40" cy="44" r="6" fill="#A855F7" stroke="#2563EB" strokeWidth="1.5" />
      <path d="M32 22V14" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
      <path d="M30 16C26 14 26 10 32 12" stroke="#22C55E" strokeWidth="1.5" />
    </svg>
  )
}

export function StrawberryIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path
        d="M32 16C22 16 16 28 18 42C20 52 28 56 32 56C36 56 44 52 46 42C48 28 42 16 32 16Z"
        fill="#EF4444"
        stroke="#2563EB"
        strokeWidth="2"
      />
      <path d="M26 14C28 10 36 10 38 14" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="28" cy="28" r="1.5" fill="#FDE047" />
      <circle cx="36" cy="32" r="1.5" fill="#FDE047" />
      <circle cx="30" cy="40" r="1.5" fill="#FDE047" />
      <circle cx="38" cy="44" r="1.5" fill="#FDE047" />
      <circle cx="26" cy="48" r="1.5" fill="#FDE047" />
    </svg>
  )
}

export function BlueberryIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <circle cx="24" cy="36" r="10" fill="#6366F1" stroke="#2563EB" strokeWidth="1.5" />
      <circle cx="40" cy="36" r="10" fill="#6366F1" stroke="#2563EB" strokeWidth="1.5" />
      <circle cx="32" cy="26" r="10" fill="#6366F1" stroke="#2563EB" strokeWidth="1.5" />
      <circle cx="24" cy="36" r="3" fill="#312E81" opacity="0.3" />
      <circle cx="40" cy="36" r="3" fill="#312E81" opacity="0.3" />
      <circle cx="32" cy="26" r="3" fill="#312E81" opacity="0.3" />
    </svg>
  )
}

export function WatermelonIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path d="M12 40C12 24 22 14 40 14L52 40C52 52 40 56 32 56C20 56 12 52 12 40Z" fill="#22C55E" stroke="#2563EB" strokeWidth="2" />
      <path d="M16 40C16 28 24 20 38 20L46 40C46 48 38 52 32 52C22 52 16 48 16 40Z" fill="#FCA5A5" />
      <path d="M18 40C18 30 25 24 36 24L42 40C42 46 36 50 32 50C24 50 18 46 18 40Z" fill="#EF4444" />
      <ellipse cx="28" cy="38" rx="2" ry="3" fill="#1F2937" />
      <ellipse cx="36" cy="36" rx="2" ry="3" fill="#1F2937" />
      <ellipse cx="32" cy="44" rx="2" ry="3" fill="#1F2937" />
    </svg>
  )
}

export function PeachIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path
        d="M32 18C22 18 16 28 16 40C16 52 24 54 32 54C40 54 48 52 48 40C48 28 42 18 32 18Z"
        fill="#FDBA74"
        stroke="#2563EB"
        strokeWidth="2"
      />
      <path d="M30 18C28 18 26 22 28 26C32 22 30 18 30 18Z" fill="#F97316" opacity="0.5" />
      <path d="M32 14V10" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
      <path d="M34 12C38 10 40 14 36 16" fill="#22C55E" />
    </svg>
  )
}

export function PearIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path
        d="M32 14C28 14 26 20 26 26C24 30 18 36 18 44C18 52 24 56 32 56C40 56 46 52 46 44C46 36 40 30 38 26C38 20 36 14 32 14Z"
        fill="#BEF264"
        stroke="#2563EB"
        strokeWidth="2"
      />
      <path d="M32 10V6" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function CherryIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <circle cx="24" cy="44" r="12" fill="#DC2626" stroke="#2563EB" strokeWidth="2" />
      <circle cx="42" cy="40" r="10" fill="#DC2626" stroke="#2563EB" strokeWidth="2" />
      <path d="M24 32C24 20 32 12 36 12" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
      <path d="M42 30C42 22 38 14 36 12" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="20" cy="40" rx="3" ry="2" fill="white" opacity="0.3" />
    </svg>
  )
}

export function MangoIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <ellipse cx="32" cy="36" rx="14" ry="18" fill="#FBBF24" stroke="#2563EB" strokeWidth="2" />
      <path d="M32 18C32 14 34 12 38 14" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="28" cy="32" rx="4" ry="3" fill="#F97316" opacity="0.3" />
    </svg>
  )
}

export function PineappleIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <ellipse cx="32" cy="40" rx="14" ry="16" fill="#FBBF24" stroke="#2563EB" strokeWidth="2" />
      <path d="M24 12C28 16 36 16 40 12" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
      <path d="M26 16C28 20 36 20 38 16" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
      <path d="M28 20C30 24 34 24 36 20" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 34L40 46M24 46L40 34" stroke="#D97706" strokeWidth="1.5" />
      <path d="M24 40L40 40M32 30L32 50" stroke="#D97706" strokeWidth="1.5" />
    </svg>
  )
}

export function KiwiIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <ellipse cx="32" cy="34" rx="16" ry="18" fill="#92400E" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="32" cy="34" rx="12" ry="14" fill="#84CC16" />
      <ellipse cx="32" cy="34" rx="4" ry="4" fill="#FEF3C7" />
      <path d="M32 24L32 20M32 48L32 44M24 34L20 34M44 34L40 34M26 28L22 24M38 28L42 24M26 40L22 44M38 40L42 44" stroke="#365314" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

export function AvocadoIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <ellipse cx="32" cy="36" rx="14" ry="18" fill="#84CC16" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="32" cy="40" rx="8" ry="10" fill="#BEF264" />
      <circle cx="32" cy="42" r="5" fill="#92400E" />
    </svg>
  )
}

// === VEGETABLES ===

export function CarrotIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path
        d="M32 16L24 56L40 56L32 16Z"
        fill="#FB923C"
        stroke="#2563EB"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M28 14C24 10 26 6 32 10C38 6 40 10 36 14" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M28 28L36 28M26 40L38 40" stroke="#EA580C" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

export function BroccoliIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="28" y="40" width="8" height="16" rx="2" fill="#65A30D" stroke="#2563EB" strokeWidth="1.5" />
      <circle cx="24" cy="28" r="10" fill="#22C55E" stroke="#2563EB" strokeWidth="2" />
      <circle cx="40" cy="28" r="10" fill="#22C55E" stroke="#2563EB" strokeWidth="2" />
      <circle cx="32" cy="22" r="10" fill="#22C55E" stroke="#2563EB" strokeWidth="2" />
      <circle cx="28" cy="34" r="6" fill="#22C55E" stroke="#2563EB" strokeWidth="1.5" />
      <circle cx="36" cy="34" r="6" fill="#22C55E" stroke="#2563EB" strokeWidth="1.5" />
    </svg>
  )
}

export function TomatoIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <circle cx="32" cy="36" r="16" fill="#EF4444" stroke="#2563EB" strokeWidth="2" />
      <path d="M24 20C28 24 36 24 40 20" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 20V14" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="26" cy="32" rx="4" ry="3" fill="white" opacity="0.25" />
    </svg>
  )
}

export function OnionIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <ellipse cx="32" cy="40" rx="16" ry="14" fill="#FDE68A" stroke="#2563EB" strokeWidth="2" />
      <path d="M32 26C32 18 34 12 36 12" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 36C28 34 36 34 40 36" stroke="#F59E0B" strokeWidth="1" opacity="0.5" />
      <path d="M22 42C28 40 36 40 42 42" stroke="#F59E0B" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

export function PotatoIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <ellipse cx="32" cy="36" rx="18" ry="14" fill="#D4A373" stroke="#2563EB" strokeWidth="2" />
      <circle cx="24" cy="32" r="2" fill="#92400E" opacity="0.4" />
      <circle cx="38" cy="36" r="2" fill="#92400E" opacity="0.4" />
      <circle cx="30" cy="42" r="1.5" fill="#92400E" opacity="0.4" />
      <circle cx="42" cy="32" r="1.5" fill="#92400E" opacity="0.4" />
    </svg>
  )
}

export function SpinachIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path
        d="M32 52C32 52 14 44 14 30C14 18 22 14 32 14C42 14 50 18 50 30C50 44 32 52 32 52Z"
        fill="#22C55E"
        stroke="#2563EB"
        strokeWidth="2"
      />
      <path d="M32 14V52" stroke="#15803D" strokeWidth="2" />
      <path d="M22 24L32 32L22 40" stroke="#15803D" strokeWidth="1.5" opacity="0.6" />
      <path d="M42 24L32 32L42 40" stroke="#15803D" strokeWidth="1.5" opacity="0.6" />
    </svg>
  )
}

export function LettuceIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <ellipse cx="32" cy="38" rx="18" ry="14" fill="#86EFAC" stroke="#2563EB" strokeWidth="2" />
      <path d="M20 32C24 28 32 28 38 34C44 28 48 32 46 38" stroke="#22C55E" strokeWidth="2" />
      <path d="M24 38C28 34 36 34 40 38" stroke="#22C55E" strokeWidth="1.5" />
    </svg>
  )
}

export function CucumberIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="18" y="24" width="28" height="16" rx="8" fill="#22C55E" stroke="#2563EB" strokeWidth="2" />
      <circle cx="26" cy="32" r="2" fill="#15803D" opacity="0.3" />
      <circle cx="34" cy="32" r="2" fill="#15803D" opacity="0.3" />
      <circle cx="42" cy="32" r="2" fill="#15803D" opacity="0.3" />
    </svg>
  )
}

export function CornIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <ellipse cx="32" cy="34" rx="10" ry="18" fill="#FDE047" stroke="#2563EB" strokeWidth="2" />
      <path d="M24 20C20 16 20 12 24 10" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 18C32 14 34 10 38 10" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 22C44 18 48 18 48 22" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
      <circle cx="28" cy="28" r="2" fill="#F59E0B" />
      <circle cx="36" cy="28" r="2" fill="#F59E0B" />
      <circle cx="28" cy="36" r="2" fill="#F59E0B" />
      <circle cx="36" cy="36" r="2" fill="#F59E0B" />
      <circle cx="32" cy="44" r="2" fill="#F59E0B" />
    </svg>
  )
}

export function PepperIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path
        d="M32 16C26 16 22 24 22 36C22 48 26 54 32 54C38 54 42 48 42 36C42 24 38 16 32 16Z"
        fill="#EF4444"
        stroke="#2563EB"
        strokeWidth="2"
      />
      <path d="M32 16C32 12 34 10 38 12" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="28" cy="30" rx="3" ry="4" fill="white" opacity="0.25" />
    </svg>
  )
}

export function GarlicIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <ellipse cx="32" cy="40" rx="14" ry="12" fill="#F5F5F4" stroke="#2563EB" strokeWidth="2" />
      <path d="M32 28C32 22 34 18 36 18" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
      <path d="M26 36L26 44M32 34L32 46M38 36L38 44" stroke="#D6D3D1" strokeWidth="1.5" />
    </svg>
  )
}

export function MushroomIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path d="M28 36H36V52H28V36Z" fill="#FEF3C7" stroke="#2563EB" strokeWidth="2" />
      <path
        d="M14 36C14 24 22 16 32 16C42 16 50 24 50 36H14Z"
        fill="#D4A373"
        stroke="#2563EB"
        strokeWidth="2"
      />
      <ellipse cx="24" cy="28" rx="3" ry="2" fill="#FEF3C7" opacity="0.5" />
      <ellipse cx="38" cy="26" rx="4" ry="3" fill="#FEF3C7" opacity="0.5" />
    </svg>
  )
}

export function ZucchiniIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <ellipse cx="32" cy="34" rx="8" ry="20" fill="#22C55E" stroke="#2563EB" strokeWidth="2" transform="rotate(-15 32 34)" />
      <path d="M28 14C26 12 28 10 32 12" stroke="#FDE047" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function CeleryIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path d="M26 56L28 20C28 16 30 14 32 14C34 14 36 16 36 20L38 56" fill="#86EFAC" stroke="#2563EB" strokeWidth="2" />
      <path d="M24 16C22 12 24 8 28 10" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 16C42 12 40 8 36 10" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
      <path d="M30 24L30 50M34 24L34 50" stroke="#22C55E" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

export function AsparagusIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path d="M24 56L26 24L28 12M32 56L32 24L32 10M40 56L38 24L36 12" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="26" cy="14" rx="3" ry="6" fill="#15803D" />
      <ellipse cx="32" cy="12" rx="3" ry="6" fill="#15803D" />
      <ellipse cx="38" cy="14" rx="3" ry="6" fill="#15803D" />
    </svg>
  )
}

export function CabbageIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <circle cx="32" cy="36" r="18" fill="#86EFAC" stroke="#2563EB" strokeWidth="2" />
      <circle cx="32" cy="36" r="12" fill="#4ADE80" stroke="#22C55E" strokeWidth="1" />
      <circle cx="32" cy="36" r="6" fill="#22C55E" />
    </svg>
  )
}

// === DAIRY ===

export function MilkIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path
        d="M20 20L24 12H40L44 20V52H20V20Z"
        fill="#F8FAFC"
        stroke="#2563EB"
        strokeWidth="2"
      />
      <path d="M20 20H44" stroke="#2563EB" strokeWidth="2" />
      <rect x="24" y="28" width="16" height="16" rx="2" fill="#3B82F6" />
      <path d="M28 34L32 38L36 34" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function CheeseIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path
        d="M12 46L32 18L52 46H12Z"
        fill="#FDE047"
        stroke="#2563EB"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 46H52V50H12V46Z" fill="#FACC15" stroke="#2563EB" strokeWidth="2" />
      <circle cx="24" cy="40" r="3" fill="#F59E0B" />
      <circle cx="38" cy="42" r="2.5" fill="#F59E0B" />
      <circle cx="30" cy="34" r="2" fill="#F59E0B" />
    </svg>
  )
}

export function EggIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <ellipse
        cx="32"
        cy="36"
        rx="14"
        ry="18"
        fill="#FEF3C7"
        stroke="#2563EB"
        strokeWidth="2"
      />
      <ellipse cx="28" cy="32" rx="5" ry="4" fill="white" opacity="0.5" />
    </svg>
  )
}

export function ButterIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="14" y="28" width="36" height="18" rx="2" fill="#FDE68A" stroke="#2563EB" strokeWidth="2" />
      <rect x="14" y="24" width="36" height="8" rx="2" fill="#FBBF24" stroke="#2563EB" strokeWidth="2" />
    </svg>
  )
}

export function YogurtIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path
        d="M20 20H44L42 52H22L20 20Z"
        fill="#F8FAFC"
        stroke="#2563EB"
        strokeWidth="2"
      />
      <path d="M20 20H44V26H20V20Z" fill="#A78BFA" stroke="#2563EB" strokeWidth="2" />
      <path d="M26 36C28 40 36 40 38 36" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function CreamCheeseIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="14" y="24" width="36" height="24" rx="4" fill="#F8FAFC" stroke="#2563EB" strokeWidth="2" />
      <rect x="18" y="28" width="28" height="8" rx="2" fill="#E5E7EB" />
      <path d="M22 40H42" stroke="#E5E7EB" strokeWidth="2" />
    </svg>
  )
}

export function SourCreamIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <ellipse cx="32" cy="40" rx="18" ry="10" fill="#F8FAFC" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="32" cy="36" rx="18" ry="10" fill="#F1F5F9" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="32" cy="32" rx="18" ry="10" fill="#F8FAFC" stroke="#2563EB" strokeWidth="2" />
    </svg>
  )
}

// === MEAT & PROTEIN ===

export function ChickenIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <ellipse cx="32" cy="36" rx="16" ry="12" fill="#FECACA" stroke="#2563EB" strokeWidth="2" />
      <path d="M16 32C12 28 12 24 16 22" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M48 32C52 28 52 24 48 22" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="32" cy="36" rx="8" ry="6" fill="#FEE2E2" opacity="0.5" />
    </svg>
  )
}

export function BeefIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <ellipse cx="32" cy="36" rx="18" ry="12" fill="#FCA5A5" stroke="#2563EB" strokeWidth="2" />
      <path d="M20 32C26 36 38 36 44 32" stroke="#EF4444" strokeWidth="2" />
      <path d="M18 38C26 42 38 42 46 38" stroke="#EF4444" strokeWidth="1.5" />
      <circle cx="28" cy="34" r="2" fill="#DC2626" opacity="0.5" />
      <circle cx="38" cy="38" r="2" fill="#DC2626" opacity="0.5" />
    </svg>
  )
}

export function PorkIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="14" y="24" width="36" height="20" rx="4" fill="#FECDD3" stroke="#2563EB" strokeWidth="2" />
      <path d="M14 32H50" stroke="#FB7185" strokeWidth="1.5" />
      <path d="M14 38H50" stroke="#FB7185" strokeWidth="1.5" />
      <rect x="18" y="28" width="8" height="12" rx="2" fill="#FCA5A5" opacity="0.5" />
    </svg>
  )
}

export function BaconIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path d="M12 28C18 24 24 32 32 28C40 24 46 32 52 28V36C46 40 40 32 32 36C24 40 18 32 12 36V28Z" fill="#DC2626" stroke="#2563EB" strokeWidth="2" />
      <path d="M12 36C18 32 24 40 32 36C40 32 46 40 52 36V44C46 48 40 40 32 44C24 48 18 40 12 44V36Z" fill="#FECDD3" stroke="#2563EB" strokeWidth="2" />
    </svg>
  )
}

export function SausageIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="12" y="28" width="40" height="12" rx="6" fill="#B45309" stroke="#2563EB" strokeWidth="2" />
      <path d="M20 28V40M32 28V40M44 28V40" stroke="#92400E" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

export function FishIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <ellipse cx="34" cy="32" rx="18" ry="12" fill="#93C5FD" stroke="#2563EB" strokeWidth="2" />
      <path d="M12 32L20 24V40L12 32Z" fill="#93C5FD" stroke="#2563EB" strokeWidth="2" />
      <circle cx="44" cy="30" r="2" fill="#1E40AF" />
      <path d="M28 28C32 32 32 36 28 40" stroke="#60A5FA" strokeWidth="1.5" />
      <path d="M34 28C38 32 38 36 34 40" stroke="#60A5FA" strokeWidth="1.5" />
    </svg>
  )
}

export function ShrimpIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path d="M44 24C52 28 52 40 44 44C36 48 28 44 24 36C20 28 24 20 32 16C40 12 48 16 48 24" fill="#FDA4AF" stroke="#2563EB" strokeWidth="2" />
      <path d="M32 16L28 12M32 16L36 10" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
      <circle cx="40" cy="28" r="2" fill="#1F2937" />
    </svg>
  )
}

export function TofuIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="16" y="24" width="32" height="24" rx="2" fill="#FEF3C7" stroke="#2563EB" strokeWidth="2" />
      <path d="M16 36H48" stroke="#F59E0B" strokeWidth="1" opacity="0.3" />
      <path d="M32 24V48" stroke="#F59E0B" strokeWidth="1" opacity="0.3" />
    </svg>
  )
}

// === GRAINS & BREAD ===

export function BreadIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path
        d="M12 32C12 24 20 20 32 20C44 20 52 24 52 32V44C52 48 44 52 32 52C20 52 12 48 12 44V32Z"
        fill="#F59E0B"
        stroke="#2563EB"
        strokeWidth="2"
      />
      <path d="M12 32C12 36 20 40 32 40C44 40 52 36 52 32" stroke="#D97706" strokeWidth="2" />
    </svg>
  )
}

export function RiceIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path
        d="M18 24L22 16H42L46 24V48C46 50 44 52 42 52H22C20 52 18 50 18 48V24Z"
        fill="#F8FAFC"
        stroke="#2563EB"
        strokeWidth="2"
      />
      <path d="M18 24H46" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="28" cy="34" rx="2" ry="3" fill="#E5E7EB" />
      <ellipse cx="36" cy="32" rx="2" ry="3" fill="#E5E7EB" />
      <ellipse cx="32" cy="40" rx="2" ry="3" fill="#E5E7EB" />
    </svg>
  )
}

export function PastaIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="20" y="16" width="24" height="36" rx="2" fill="#FEF3C7" stroke="#2563EB" strokeWidth="2" />
      <path d="M24 24H40M24 30H40M24 36H40M24 42H40" stroke="#F59E0B" strokeWidth="2" />
    </svg>
  )
}

export function CerealIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="16" y="12" width="32" height="44" rx="2" fill="#FDE68A" stroke="#2563EB" strokeWidth="2" />
      <rect x="20" y="24" width="24" height="20" rx="2" fill="#F59E0B" />
      <circle cx="28" cy="32" r="3" fill="#FDE68A" />
      <circle cx="36" cy="36" r="3" fill="#FDE68A" />
      <circle cx="32" cy="40" r="2" fill="#FDE68A" />
    </svg>
  )
}

export function OatmealIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path d="M16 28H48L44 52H20L16 28Z" fill="#D4A373" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="32" cy="28" rx="16" ry="4" fill="#E5D5C3" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="26" cy="38" rx="3" ry="2" fill="#A3896D" opacity="0.5" />
      <ellipse cx="38" cy="42" rx="3" ry="2" fill="#A3896D" opacity="0.5" />
    </svg>
  )
}

export function TortillaIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <circle cx="32" cy="32" r="18" fill="#FDE68A" stroke="#2563EB" strokeWidth="2" />
      <circle cx="32" cy="32" r="12" stroke="#D97706" strokeWidth="1" opacity="0.3" />
      <circle cx="32" cy="32" r="6" stroke="#D97706" strokeWidth="1" opacity="0.3" />
    </svg>
  )
}

// === CONDIMENTS & SAUCES ===

export function KetchupIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path d="M28 16H36V22L40 28V52H24V28L28 22V16Z" fill="#EF4444" stroke="#2563EB" strokeWidth="2" />
      <rect x="26" y="10" width="12" height="8" rx="2" fill="#DC2626" stroke="#2563EB" strokeWidth="2" />
    </svg>
  )
}

export function MustardIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path d="M28 16H36V22L40 28V52H24V28L28 22V16Z" fill="#FDE047" stroke="#2563EB" strokeWidth="2" />
      <rect x="26" y="10" width="12" height="8" rx="2" fill="#FACC15" stroke="#2563EB" strokeWidth="2" />
    </svg>
  )
}

export function MayoIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path d="M22 20H42L40 52H24L22 20Z" fill="#F8FAFC" stroke="#2563EB" strokeWidth="2" />
      <rect x="24" y="12" width="16" height="10" rx="2" fill="#3B82F6" stroke="#2563EB" strokeWidth="2" />
    </svg>
  )
}

export function SalsaIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="20" y="12" width="24" height="8" rx="2" fill="#78716C" stroke="#2563EB" strokeWidth="2" />
      <path d="M18 20H46V48C46 50 44 52 42 52H22C20 52 18 50 18 48V20Z" fill="#FCA5A5" stroke="#2563EB" strokeWidth="2" />
      <circle cx="26" cy="32" r="3" fill="#EF4444" />
      <circle cx="38" cy="36" r="2" fill="#22C55E" />
      <circle cx="32" cy="44" r="2" fill="#EF4444" />
    </svg>
  )
}

export function SoySauceIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path d="M26 16H38L40 52H24L26 16Z" fill="#451A03" stroke="#2563EB" strokeWidth="2" />
      <rect x="28" y="10" width="8" height="8" rx="2" fill="#78350F" stroke="#2563EB" strokeWidth="2" />
      <rect x="28" y="24" width="8" height="12" rx="1" fill="#EF4444" />
    </svg>
  )
}

export function OilIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path d="M28 16H36V22H28V16Z" fill="#A3E635" stroke="#2563EB" strokeWidth="2" />
      <path d="M24 22H40L42 52H22L24 22Z" fill="#BEF264" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="32" cy="40" rx="6" ry="4" fill="#84CC16" opacity="0.5" />
    </svg>
  )
}

export function VinegarIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path d="M28 16H36V22H28V16Z" fill="#78716C" stroke="#2563EB" strokeWidth="2" />
      <path d="M24 22H40L42 52H22L24 22Z" fill="#FEF3C7" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="32" cy="38" rx="8" ry="6" fill="#FDE68A" opacity="0.5" />
    </svg>
  )
}

export function HoneyIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path d="M20 24H44V48C44 50 42 52 40 52H24C22 52 20 50 20 48V24Z" fill="#FBBF24" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="32" cy="24" rx="12" ry="4" fill="#F59E0B" stroke="#2563EB" strokeWidth="2" />
      <path d="M32 12L32 20" stroke="#92400E" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function PeanutButterIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="18" y="18" width="28" height="36" rx="4" fill="#92400E" stroke="#2563EB" strokeWidth="2" />
      <rect x="22" y="14" width="20" height="8" rx="2" fill="#78350F" stroke="#2563EB" strokeWidth="2" />
      <rect x="22" y="28" width="20" height="12" rx="2" fill="#FDE68A" />
    </svg>
  )
}

export function JamIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="18" y="22" width="28" height="32" rx="4" fill="#DC2626" stroke="#2563EB" strokeWidth="2" />
      <rect x="20" y="14" width="24" height="10" rx="2" fill="#78716C" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="32" cy="38" rx="8" ry="6" fill="#EF4444" opacity="0.5" />
    </svg>
  )
}

// === BEVERAGES ===

export function JuiceIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path d="M22 16H42L40 52H24L22 16Z" fill="#FB923C" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="32" cy="16" rx="10" ry="3" fill="#FDBA74" stroke="#2563EB" strokeWidth="2" />
      <circle cx="28" cy="28" r="3" fill="#FED7AA" opacity="0.5" />
      <circle cx="36" cy="36" r="2" fill="#FED7AA" opacity="0.5" />
    </svg>
  )
}

export function CoffeeIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="16" y="12" width="28" height="40" rx="2" fill="#78350F" stroke="#2563EB" strokeWidth="2" />
      <rect x="20" y="20" width="20" height="24" rx="2" fill="#92400E" />
      <path d="M28 10C28 6 32 4 36 8" stroke="#D6D3D1" strokeWidth="2" strokeLinecap="round" />
      <path d="M44 24C50 24 52 32 48 36H44" stroke="#2563EB" strokeWidth="2" />
    </svg>
  )
}

export function TeaIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="14" y="12" width="30" height="40" rx="2" fill="#FDE68A" stroke="#2563EB" strokeWidth="2" />
      <rect x="18" y="20" width="22" height="24" rx="2" fill="#22C55E" opacity="0.3" />
      <path d="M44 24C50 24 52 32 48 36H44" stroke="#2563EB" strokeWidth="2" />
    </svg>
  )
}

export function SodaIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path d="M24 20H40L38 52H26L24 20Z" fill="#EF4444" stroke="#2563EB" strokeWidth="2" />
      <rect x="26" y="12" width="12" height="10" rx="2" fill="#B91C1C" stroke="#2563EB" strokeWidth="2" />
      <rect x="28" y="28" width="8" height="16" rx="1" fill="white" opacity="0.3" />
    </svg>
  )
}

export function WaterIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path d="M26 16H38L40 52H24L26 16Z" fill="#BFDBFE" stroke="#2563EB" strokeWidth="2" />
      <rect x="28" y="10" width="8" height="8" rx="2" fill="#93C5FD" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="32" cy="38" rx="6" ry="8" fill="#60A5FA" opacity="0.3" />
    </svg>
  )
}

// === FROZEN ===

export function IceCreamIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path d="M24 32L32 56L40 32" fill="#FDE68A" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="32" cy="28" rx="14" ry="10" fill="#FECACA" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="26" cy="26" rx="3" ry="2" fill="white" opacity="0.4" />
    </svg>
  )
}

export function GyozaIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path
        d="M16 36C16 28 24 24 32 24C40 24 48 28 48 36C48 44 40 44 32 44C24 44 16 44 16 36Z"
        fill="#FEF3C7"
        stroke="#2563EB"
        strokeWidth="2"
      />
      <path d="M20 32C28 28 40 28 44 32" stroke="#F59E0B" strokeWidth="2" />
      <path d="M24 28L28 34M32 26L32 34M40 28L36 34" stroke="#D97706" strokeWidth="1.5" />
    </svg>
  )
}

export function PizzaIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path d="M32 12L52 52H12L32 12Z" fill="#FDE68A" stroke="#2563EB" strokeWidth="2" />
      <path d="M32 12L48 44H16L32 12Z" fill="#EF4444" opacity="0.8" />
      <circle cx="28" cy="32" r="4" fill="#FDE047" />
      <circle cx="38" cy="38" r="4" fill="#FDE047" />
      <circle cx="32" cy="44" r="3" fill="#FDE047" />
    </svg>
  )
}

export function FrozenVeggiesIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="16" y="16" width="32" height="36" rx="2" fill="#86EFAC" stroke="#2563EB" strokeWidth="2" />
      <circle cx="26" cy="28" r="4" fill="#22C55E" />
      <circle cx="38" cy="32" r="4" fill="#FB923C" />
      <circle cx="28" cy="40" r="4" fill="#FDE047" />
      <circle cx="40" cy="44" r="3" fill="#22C55E" />
    </svg>
  )
}

// === SNACKS ===

export function ChipsIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <path d="M20 14L18 52H46L44 14C44 14 40 18 32 18C24 18 20 14 20 14Z" fill="#FDE047" stroke="#2563EB" strokeWidth="2" />
      <path d="M24 26C28 28 36 28 40 26" stroke="#F59E0B" strokeWidth="1.5" />
      <path d="M22 38C28 40 36 40 42 38" stroke="#F59E0B" strokeWidth="1.5" />
    </svg>
  )
}

export function CrackerIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="16" y="20" width="32" height="28" rx="2" fill="#FDE68A" stroke="#2563EB" strokeWidth="2" />
      <circle cx="24" cy="28" r="2" fill="#D97706" opacity="0.5" />
      <circle cx="40" cy="28" r="2" fill="#D97706" opacity="0.5" />
      <circle cx="32" cy="34" r="2" fill="#D97706" opacity="0.5" />
      <circle cx="24" cy="40" r="2" fill="#D97706" opacity="0.5" />
      <circle cx="40" cy="40" r="2" fill="#D97706" opacity="0.5" />
    </svg>
  )
}

export function NutsIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <ellipse cx="24" cy="32" rx="8" ry="6" fill="#D4A373" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="40" cy="30" rx="8" ry="6" fill="#D4A373" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="32" cy="42" rx="8" ry="6" fill="#D4A373" stroke="#2563EB" strokeWidth="2" />
    </svg>
  )
}

export function ChocolateIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="14" y="20" width="36" height="28" rx="2" fill="#78350F" stroke="#2563EB" strokeWidth="2" />
      <path d="M14 32H50M26 20V48M38 20V48" stroke="#451A03" strokeWidth="1.5" />
    </svg>
  )
}

export function CookieIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <circle cx="32" cy="32" r="18" fill="#D4A373" stroke="#2563EB" strokeWidth="2" />
      <circle cx="26" cy="28" r="3" fill="#78350F" />
      <circle cx="38" cy="32" r="3" fill="#78350F" />
      <circle cx="30" cy="40" r="3" fill="#78350F" />
    </svg>
  )
}

export function GranolaIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="16" y="20" width="32" height="28" rx="4" fill="#92400E" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="24" cy="30" rx="4" ry="3" fill="#FDE68A" />
      <ellipse cx="38" cy="34" rx="4" ry="3" fill="#D4A373" />
      <ellipse cx="30" cy="40" rx="3" ry="2" fill="#FDE68A" />
      <circle cx="42" cy="28" r="2" fill="#22C55E" />
    </svg>
  )
}

// === CANNED GOODS ===

export function CannedTomatoIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="18" y="18" width="28" height="32" rx="2" fill="#EF4444" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="32" cy="18" rx="14" ry="4" fill="#DC2626" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="32" cy="50" rx="14" ry="4" fill="#DC2626" stroke="#2563EB" strokeWidth="2" />
      <rect x="22" y="28" width="20" height="12" rx="2" fill="white" opacity="0.2" />
    </svg>
  )
}

export function CannedBeansIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="18" y="18" width="28" height="32" rx="2" fill="#78350F" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="32" cy="18" rx="14" ry="4" fill="#92400E" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="32" cy="50" rx="14" ry="4" fill="#92400E" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="26" cy="32" rx="3" ry="4" fill="#D4A373" />
      <ellipse cx="38" cy="36" rx="3" ry="4" fill="#D4A373" />
    </svg>
  )
}

export function SoupCanIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="18" y="18" width="28" height="32" rx="2" fill="#DC2626" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="32" cy="18" rx="14" ry="4" fill="#B91C1C" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="32" cy="50" rx="14" ry="4" fill="#B91C1C" stroke="#2563EB" strokeWidth="2" />
      <circle cx="32" cy="34" r="8" fill="white" />
      <circle cx="32" cy="34" r="5" fill="#DC2626" />
    </svg>
  )
}

export function TunaCanIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <ellipse cx="32" cy="32" rx="18" ry="8" fill="#60A5FA" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="32" cy="36" rx="18" ry="8" fill="#3B82F6" stroke="#2563EB" strokeWidth="2" />
      <ellipse cx="32" cy="32" rx="12" ry="5" fill="#93C5FD" opacity="0.5" />
    </svg>
  )
}

// === BAKING ===

export function FlourIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="16" y="16" width="32" height="36" rx="2" fill="#F5F5F4" stroke="#2563EB" strokeWidth="2" />
      <rect x="20" y="24" width="24" height="16" rx="2" fill="#E5E7EB" />
      <path d="M28 30H36M28 36H36" stroke="#9CA3AF" strokeWidth="1.5" />
    </svg>
  )
}

export function SugarIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="16" y="16" width="32" height="36" rx="2" fill="#F5F5F4" stroke="#2563EB" strokeWidth="2" />
      <rect x="20" y="24" width="24" height="16" rx="2" fill="#FEF3C7" />
      <ellipse cx="28" cy="32" rx="2" ry="3" fill="white" />
      <ellipse cx="36" cy="34" rx="2" ry="3" fill="white" />
    </svg>
  )
}

export function BakingPowderIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <rect x="20" y="16" width="24" height="36" rx="4" fill="#FB923C" stroke="#2563EB" strokeWidth="2" />
      <rect x="24" y="10" width="16" height="8" rx="2" fill="#EA580C" stroke="#2563EB" strokeWidth="2" />
      <rect x="24" y="26" width="16" height="16" rx="2" fill="white" opacity="0.3" />
    </svg>
  )
}

// Generic food placeholder
export function FoodPlaceholderIcon({ className, size = 48 }: FoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} fill="none">
      <circle cx="32" cy="32" r="20" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="2" strokeDasharray="4 2" />
      <path d="M24 28L32 36L40 28" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 36V44" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// Map food names to icons (comprehensive mapping)
const foodIconMap: Record<string, React.FC<FoodIconProps>> = {
  // Fruits
  apple: AppleIcon,
  apples: AppleIcon,
  'honeycrisp apple': AppleIcon,
  'granny smith': AppleIcon,
  'red apple': AppleIcon,
  'green apple': AppleIcon,
  banana: BananaIcon,
  bananas: BananaIcon,
  orange: OrangeIcon,
  oranges: OrangeIcon,
  'navel orange': OrangeIcon,
  lemon: LemonIcon,
  lemons: LemonIcon,
  lime: LemonIcon,
  limes: LemonIcon,
  grape: GrapesIcon,
  grapes: GrapesIcon,
  strawberry: StrawberryIcon,
  strawberries: StrawberryIcon,
  blueberry: BlueberryIcon,
  blueberries: BlueberryIcon,
  raspberry: BlueberryIcon,
  raspberries: BlueberryIcon,
  blackberry: BlueberryIcon,
  blackberries: BlueberryIcon,
  watermelon: WatermelonIcon,
  peach: PeachIcon,
  peaches: PeachIcon,
  nectarine: PeachIcon,
  pear: PearIcon,
  pears: PearIcon,
  cherry: CherryIcon,
  cherries: CherryIcon,
  mango: MangoIcon,
  mangos: MangoIcon,
  mangoes: MangoIcon,
  pineapple: PineappleIcon,
  kiwi: KiwiIcon,
  avocado: AvocadoIcon,
  avocados: AvocadoIcon,

  // Vegetables
  carrot: CarrotIcon,
  carrots: CarrotIcon,
  broccoli: BroccoliIcon,
  tomato: TomatoIcon,
  tomatoes: TomatoIcon,
  'cherry tomato': TomatoIcon,
  'cherry tomatoes': TomatoIcon,
  onion: OnionIcon,
  onions: OnionIcon,
  'yellow onion': OnionIcon,
  'red onion': OnionIcon,
  potato: PotatoIcon,
  potatoes: PotatoIcon,
  'sweet potato': PotatoIcon,
  spinach: SpinachIcon,
  kale: SpinachIcon,
  lettuce: LettuceIcon,
  'romaine lettuce': LettuceIcon,
  'iceberg lettuce': LettuceIcon,
  cucumber: CucumberIcon,
  cucumbers: CucumberIcon,
  corn: CornIcon,
  'sweet corn': CornIcon,
  pepper: PepperIcon,
  peppers: PepperIcon,
  'bell pepper': PepperIcon,
  'red pepper': PepperIcon,
  'green pepper': PepperIcon,
  garlic: GarlicIcon,
  mushroom: MushroomIcon,
  mushrooms: MushroomIcon,
  zucchini: ZucchiniIcon,
  celery: CeleryIcon,
  asparagus: AsparagusIcon,
  cabbage: CabbageIcon,
  'green cabbage': CabbageIcon,

  // Dairy
  milk: MilkIcon,
  'whole milk': MilkIcon,
  '2% milk': MilkIcon,
  'skim milk': MilkIcon,
  'almond milk': MilkIcon,
  'oat milk': MilkIcon,
  'soy milk': MilkIcon,
  cheese: CheeseIcon,
  'cheddar cheese': CheeseIcon,
  'mozzarella': CheeseIcon,
  'parmesan': CheeseIcon,
  'swiss cheese': CheeseIcon,
  egg: EggIcon,
  eggs: EggIcon,
  butter: ButterIcon,
  yogurt: YogurtIcon,
  'greek yogurt': YogurtIcon,
  'cream cheese': CreamCheeseIcon,
  'sour cream': SourCreamIcon,

  // Meat & Protein
  chicken: ChickenIcon,
  'chicken breast': ChickenIcon,
  'chicken thighs': ChickenIcon,
  'chicken thigh': ChickenIcon,
  'chicken wings': ChickenIcon,
  'rotisserie chicken': ChickenIcon,
  beef: BeefIcon,
  'ground beef': BeefIcon,
  steak: BeefIcon,
  'beef steak': BeefIcon,
  pork: PorkIcon,
  'pork chop': PorkIcon,
  'pork tenderloin': PorkIcon,
  bacon: BaconIcon,
  sausage: SausageIcon,
  'italian sausage': SausageIcon,
  fish: FishIcon,
  salmon: FishIcon,
  tilapia: FishIcon,
  cod: FishIcon,
  tuna: FishIcon,
  shrimp: ShrimpIcon,
  tofu: TofuIcon,
  'turkey': ChickenIcon,
  'ground turkey': ChickenIcon,
  'turkey breast': ChickenIcon,

  // Grains & Bread
  bread: BreadIcon,
  'white bread': BreadIcon,
  'wheat bread': BreadIcon,
  'sourdough': BreadIcon,
  rice: RiceIcon,
  'white rice': RiceIcon,
  'brown rice': RiceIcon,
  'jasmine rice': RiceIcon,
  pasta: PastaIcon,
  spaghetti: PastaIcon,
  'dried spaghetti': PastaIcon,
  'dried penne': PastaIcon,
  penne: PastaIcon,
  cereal: CerealIcon,
  oatmeal: OatmealIcon,
  oats: OatmealIcon,
  tortilla: TortillaIcon,
  tortillas: TortillaIcon,

  // Condiments
  ketchup: KetchupIcon,
  mustard: MustardIcon,
  mayo: MayoIcon,
  mayonnaise: MayoIcon,
  salsa: SalsaIcon,
  'soy sauce': SoySauceIcon,
  oil: OilIcon,
  'olive oil': OilIcon,
  'vegetable oil': OilIcon,
  vinegar: VinegarIcon,
  honey: HoneyIcon,
  'peanut butter': PeanutButterIcon,
  'almond butter': PeanutButterIcon,
  jam: JamIcon,
  jelly: JamIcon,

  // Beverages
  juice: JuiceIcon,
  'orange juice': JuiceIcon,
  'apple juice': JuiceIcon,
  coffee: CoffeeIcon,
  tea: TeaIcon,
  'green tea': TeaIcon,
  soda: SodaIcon,
  'coca-cola': SodaIcon,
  water: WaterIcon,
  'sparkling water': WaterIcon,

  // Frozen
  'ice cream': IceCreamIcon,
  gyoza: GyozaIcon,
  'pork gyoza': GyozaIcon,
  dumpling: GyozaIcon,
  dumplings: GyozaIcon,
  pizza: PizzaIcon,
  'frozen pizza': PizzaIcon,
  'frozen vegetables': FrozenVeggiesIcon,
  'frozen peas': FrozenVeggiesIcon,

  // Snacks
  chips: ChipsIcon,
  'potato chips': ChipsIcon,
  cracker: CrackerIcon,
  crackers: CrackerIcon,
  nuts: NutsIcon,
  almonds: NutsIcon,
  peanuts: NutsIcon,
  walnuts: NutsIcon,
  chocolate: ChocolateIcon,
  'dark chocolate': ChocolateIcon,
  cookie: CookieIcon,
  cookies: CookieIcon,
  granola: GranolaIcon,
  'granola bar': GranolaIcon,

  // Canned
  'canned tomatoes': CannedTomatoIcon,
  'diced tomatoes': CannedTomatoIcon,
  'tomato sauce': CannedTomatoIcon,
  'canned beans': CannedBeansIcon,
  'black beans': CannedBeansIcon,
  'kidney beans': CannedBeansIcon,
  soup: SoupCanIcon,
  'canned soup': SoupCanIcon,
  'chicken soup': SoupCanIcon,
  'canned tuna': TunaCanIcon,

  // Baking
  flour: FlourIcon,
  'all-purpose flour': FlourIcon,
  sugar: SugarIcon,
  'brown sugar': SugarIcon,
  'baking powder': BakingPowderIcon,
  'baking soda': BakingPowderIcon,
}

export function getFoodIcon(foodName: string): React.FC<FoodIconProps> {
  const normalizedName = foodName.toLowerCase().trim()

  // Direct match
  if (foodIconMap[normalizedName]) {
    return foodIconMap[normalizedName]
  }

  // Partial match - check if food name contains a known key
  // Sort by key length descending to prefer more specific matches
  const sortedEntries = Object.entries(foodIconMap).sort((a, b) => b[0].length - a[0].length)

  for (const [key, icon] of sortedEntries) {
    if (key.length >= 4 && normalizedName.includes(key)) {
      return icon
    }
  }

  return FoodPlaceholderIcon
}

export { type FoodIconProps }
