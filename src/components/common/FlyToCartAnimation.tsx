import { useEffect, useState, useCallback, createContext, useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CART_TARGET_ATTR } from '@/components/layout/navItems'

interface AnimationItem {
  id: string
  startX: number
  startY: number
  icon: ReactNode
}

interface FlyToCartContextType {
  triggerAnimation: (startElement: HTMLElement, icon: ReactNode) => void
}

const FlyToCartContext = createContext<FlyToCartContextType | null>(null)

export function useFlyToCart() {
  const context = useContext(FlyToCartContext)
  if (!context) {
    throw new Error('useFlyToCart must be used within FlyToCartProvider')
  }
  return context
}

interface FlyToCartProviderProps {
  children: ReactNode
}

// Animation duration (1333ms - was 2000ms, now 1.5x faster)
const FLY_DURATION = 1333
const CART_ANIMATION_DURATION = 600

export function FlyToCartProvider({ children }: FlyToCartProviderProps) {
  const [animations, setAnimations] = useState<AnimationItem[]>([])
  const [cartBounce, setCartBounce] = useState(false)

  const triggerAnimation = useCallback((startElement: HTMLElement, icon: ReactNode) => {
    const rect = startElement.getBoundingClientRect()
    const id = `fly-${Date.now()}`

    setAnimations(prev => [...prev, {
      id,
      startX: rect.left + rect.width / 2,
      startY: rect.top + rect.height / 2,
      icon,
    }])

    // Trigger cart bounce when item arrives
    setTimeout(() => {
      setCartBounce(true)
      setTimeout(() => setCartBounce(false), CART_ANIMATION_DURATION)
    }, FLY_DURATION - 100)

    // Remove animation after it completes (with some buffer)
    setTimeout(() => {
      setAnimations(prev => prev.filter(a => a.id !== id))
    }, FLY_DURATION + 200)
  }, [])

  return (
    <FlyToCartContext.Provider value={{ triggerAnimation }}>
      {children}
      {animations.map(animation => (
        <FlyingIcon key={animation.id} {...animation} />
      ))}
      {/* Cart bounce effect overlay */}
      {cartBounce && <CartBounceEffect />}
    </FlyToCartContext.Provider>
  )
}

// The shopping tab's icon in whichever nav is showing: the bottom nav on phones, the side nav on wider screens
function getCartPosition(): { x: number; y: number } {
  for (const el of document.querySelectorAll<HTMLElement>(`[${CART_TARGET_ATTR}]`)) {
    const rect = el.getBoundingClientRect()
    if (rect.width > 0) return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }
  // No nav on screen: aim for the bottom right corner
  return { x: window.innerWidth - 40, y: window.innerHeight - 32 }
}

type FlyingIconProps = AnimationItem

function FlyingIcon({ startX, startY, icon }: FlyingIconProps) {
  const [style, setStyle] = useState({
    left: startX,
    top: startY,
    transform: 'translate(-50%, -50%) scale(1)',
    opacity: 1,
  })

  useEffect(() => {
    const { x: cartX, y: cartY } = getCartPosition()

    // Start the animation after a small delay
    requestAnimationFrame(() => {
      setStyle({
        left: cartX,
        top: cartY,
        transform: 'translate(-50%, -50%) scale(0.3)',
        opacity: 0,
      })
    })
  }, [startX, startY])

  return createPortal(
    <div
      className="fixed pointer-events-none z-[100] ease-in-out"
      style={{
        left: style.left,
        top: style.top,
        transform: style.transform,
        opacity: style.opacity,
        transition: `all ${FLY_DURATION}ms ease-in-out`,
      }}
    >
      <div className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center">
        {icon}
      </div>
    </div>,
    document.body
  )
}

// Cart bounce/pulse effect when item arrives
function CartBounceEffect() {
  const { x: cartX, y: cartY } = getCartPosition()

  return createPortal(
    <div
      className="fixed pointer-events-none z-[99]"
      style={{ left: cartX, top: cartY, transform: 'translate(-50%, -50%)' }}
    >
      {/* Expanding ring 1 */}
      <div
        className="absolute inset-0 rounded-full animate-ping"
        style={{
          width: 48,
          height: 48,
          marginLeft: -24,
          marginTop: -24,
          backgroundColor: 'rgba(20, 184, 166, 0.4)',
          animationDuration: '600ms',
        }}
      />
      {/* Expanding ring 2 (delayed) */}
      <div
        className="absolute inset-0 rounded-full animate-ping"
        style={{
          width: 48,
          height: 48,
          marginLeft: -24,
          marginTop: -24,
          backgroundColor: 'rgba(20, 184, 166, 0.3)',
          animationDuration: '600ms',
          animationDelay: '100ms',
        }}
      />
      {/* Sparkles */}
      <div className="absolute" style={{ width: 80, height: 80, marginLeft: -40, marginTop: -40 }}>
        <svg viewBox="0 0 80 80" className="w-full h-full animate-pulse">
          {/* Star sparkles around the cart */}
          <g fill="#14B8A6">
            <circle cx="10" cy="40" r="3" className="animate-ping" style={{ animationDelay: '0ms' }} />
            <circle cx="70" cy="40" r="3" className="animate-ping" style={{ animationDelay: '100ms' }} />
            <circle cx="40" cy="10" r="3" className="animate-ping" style={{ animationDelay: '200ms' }} />
            <circle cx="40" cy="70" r="3" className="animate-ping" style={{ animationDelay: '150ms' }} />
            <circle cx="18" cy="18" r="2" className="animate-ping" style={{ animationDelay: '50ms' }} />
            <circle cx="62" cy="18" r="2" className="animate-ping" style={{ animationDelay: '250ms' }} />
            <circle cx="18" cy="62" r="2" className="animate-ping" style={{ animationDelay: '300ms' }} />
            <circle cx="62" cy="62" r="2" className="animate-ping" style={{ animationDelay: '75ms' }} />
          </g>
        </svg>
      </div>
    </div>,
    document.body
  )
}
