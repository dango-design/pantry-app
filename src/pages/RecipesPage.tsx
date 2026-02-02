import { UtensilsCrossed } from 'lucide-react'
import { Header } from '@/components/layout'
import { Card, CardContent } from '@/components/common'

export function RecipesPage() {
  return (
    <div className="min-h-screen">
      <Header title="Recipes" showAdd />

      <div className="p-4">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UtensilsCrossed className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Recipes coming soon
            </h3>
            <p className="text-gray-500 max-w-xs mx-auto">
              We're working on recipe integration. Soon you'll be able to find recipes
              based on what's in your pantry.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
