import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Refrigerator, Snowflake, Package, Apple, Plus } from 'lucide-react'
import { Header } from '@/components/layout'
import { Card, CardContent, Badge } from '@/components/common'
import { FoodItemCard } from '@/components/inventory'
import { useDemoStore } from '@/stores/demoStore'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/utils/cn'
import { getDaysUntilExpiration } from '@/utils/freshness'
import type { StorageLocation } from '@/types'

const locationConfig = [
  { key: 'refrigerator' as const, label: 'Fridge', icon: Refrigerator, color: '#3B82F6' },
  { key: 'freezer' as const, label: 'Freezer', icon: Snowflake, color: '#6366F1' },
  { key: 'pantry' as const, label: 'Pantry', icon: Package, color: '#8B5CF6' },
  { key: 'counter' as const, label: 'Counter', icon: Apple, color: '#F59E0B' },
]

export function HomePage() {
  const navigate = useNavigate()
  const { isDemoMode } = useAuth()
  const { inventory } = useDemoStore()

  // Filter active items and sort by expiration
  const activeItems = useMemo(() => {
    return inventory
      .filter((item) => item.status === 'active')
      .sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime())
  }, [inventory])

  // Get expiring items (within 7 days)
  const expiringItems = useMemo(() => {
    return activeItems.filter((item) => getDaysUntilExpiration(item.expirationDate) <= 7)
  }, [activeItems])

  // Count items by location
  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    activeItems.forEach((item) => {
      counts[item.storageLocation] = (counts[item.storageLocation] || 0) + 1
    })
    return counts
  }, [activeItems])

  const handleAddClick = () => {
    navigate('/add')
  }

  const handleSearchClick = () => {
    navigate('/inventory')
  }

  const handleLocationClick = (location: StorageLocation) => {
    navigate(`/inventory?location=${location}`)
  }

  const handleItemClick = (itemId: string) => {
    navigate(`/item/${itemId}`)
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Pantry"
        onAddClick={handleAddClick}
        onSearchClick={handleSearchClick}
      />

      <div className="p-4 space-y-6">
        {/* Demo Mode Banner */}
        {isDemoMode && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-3 rounded-xl text-sm flex items-center justify-between">
            <span>Demo Mode - Changes are saved locally</span>
            <Badge variant="success" size="sm" className="bg-white/20 text-white">
              {activeItems.length} items
            </Badge>
          </div>
        )}

        {/* Quick Add Button */}
        <button
          onClick={handleAddClick}
          className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Food Items
        </button>

        {/* Expiring Soon Section */}
        {expiringItems.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <h2 className="font-semibold text-gray-900">
                Expiring Soon ({expiringItems.length})
              </h2>
            </div>
            <div className="space-y-2">
              {expiringItems.slice(0, 5).map((item) => (
                <div key={item.id} onClick={() => handleItemClick(item.id)} className="cursor-pointer">
                  <FoodItemCard item={item} />
                </div>
              ))}
              {expiringItems.length > 5 && (
                <button
                  onClick={() => navigate('/inventory?filter=expiring')}
                  className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all {expiringItems.length} expiring items
                </button>
              )}
            </div>
          </section>
        )}

        {/* By Location Section */}
        <section>
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-lg">📍</span> By Location
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {locationConfig.map((location) => (
              <Card
                key={location.key}
                className={cn(
                  'cursor-pointer hover:shadow-md transition-shadow',
                  'active:scale-[0.98]'
                )}
                onClick={() => handleLocationClick(location.key)}
              >
                <CardContent className="p-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-2"
                    style={{ backgroundColor: `${location.color}15` }}
                  >
                    <location.icon
                      className="h-5 w-5"
                      style={{ color: location.color }}
                    />
                  </div>
                  <h3 className="font-medium text-gray-900">{location.label}</h3>
                  <p className="text-sm text-gray-500">
                    {locationCounts[location.key] || 0} items
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Empty State */}
        {activeItems.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Your pantry is empty
              </h3>
              <p className="text-gray-500 mb-4">
                Start by adding some food items to track
              </p>
              <button
                onClick={handleAddClick}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Items
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
