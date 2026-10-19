import type { Meta, StoryObj } from '@storybook/react-vite'
import { FoodThumbnail } from '@/components/icons/FoodThumbnail'
import { CATEGORIES } from '@/utils/constants'
import type { FoodCategory } from '@/types'
import {
  getLocationIcon,
  FridgeIcon,
  FreezerIcon,
  PantryIcon,
  CounterIcon,
  SpiceRackIcon,
} from '@/components/icons/LocationIcons'

const meta = {
  title: 'Atoms/Icons',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Food placeholders (Lucide line icons on a category tint) and storage location icons.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta

export default meta
type Story = StoryObj

export const FoodIcons: Story = {
  render: () => (
    <div className="grid grid-cols-5 gap-6 p-4">
      {[
        { name: 'Banana', category: 'produce' },
        { name: 'Spinach', category: 'produce' },
        { name: 'Almond Milk', category: 'dairy' },
        { name: 'Eggs', category: 'dairy' },
        { name: 'Chicken Thighs', category: 'meat' },
        { name: 'Salmon', category: 'seafood' },
        { name: 'Bread', category: 'bakery' },
        { name: 'Spaghetti Pasta', category: 'pantry' },
        { name: 'Olive Oil', category: 'condiments' },
        { name: 'Greek Yogurt', category: 'dairy' },
      ].map(({ name, category }) => (
        <div key={name} className="flex flex-col items-center gap-2">
          <FoodThumbnail name={name} category={category as FoodCategory} iconSize={28} className="w-16 h-16 rounded-xl" />
          <span className="text-xs text-gray-500">{name}</span>
        </div>
      ))}
    </div>
  ),
}

// Shown when no keyword matches the item name
export const CategoryFallbacks: Story = {
  render: () => (
    <div className="grid grid-cols-6 gap-6 p-4">
      {(Object.keys(CATEGORIES) as FoodCategory[]).map((category) => (
        <div key={category} className="flex flex-col items-center gap-2">
          <FoodThumbnail name="" category={category} iconSize={28} className="w-16 h-16 rounded-xl" />
          <span className="text-xs text-gray-500">{CATEGORIES[category].label}</span>
        </div>
      ))}
    </div>
  ),
}

export const FoodThumbnailSizes: Story = {
  render: () => (
    <div className="flex items-end gap-4 p-4">
      {[
        { box: 'w-10 h-10 rounded-lg', iconSize: 20, label: '40px' },
        { box: 'w-16 h-16 rounded-xl', iconSize: 32, label: '64px' },
        { box: 'w-20 h-20 rounded-2xl', iconSize: 36, label: '80px' },
      ].map(({ box, iconSize, label }) => (
        <div key={label} className="flex flex-col items-center gap-1">
          <FoodThumbnail name="Banana" category="produce" iconSize={iconSize} className={box} />
          <span className="text-xs text-gray-500">{label}</span>
        </div>
      ))}
    </div>
  ),
}

export const LocationIcons: Story = {
  render: () => (
    <div className="flex gap-6 p-4">
      {[
        { Icon: FridgeIcon, name: 'Fridge' },
        { Icon: FreezerIcon, name: 'Freezer' },
        { Icon: PantryIcon, name: 'Pantry' },
        { Icon: CounterIcon, name: 'Counter' },
        { Icon: SpiceRackIcon, name: 'Spice rack' },
      ].map(({ Icon, name }) => (
        <div key={name} className="flex flex-col items-center gap-2">
          <Icon size={24} className="text-gray-600" />
          <span className="text-xs text-gray-500">{name}</span>
        </div>
      ))}
    </div>
  ),
}

export const DynamicLocationIcon: Story = {
  render: () => {
    const locations = ['refrigerator', 'freezer', 'pantry', 'counter', 'spice_rack']
    return (
      <div className="flex gap-4 p-4">
        {locations.map((location) => {
          const Icon = getLocationIcon(location)
          if (!Icon) return null
          return (
            <div key={location} className="flex flex-col items-center gap-2">
              <Icon size={24} className="text-gray-600" />
              <span className="text-xs text-gray-500 text-center">{location}</span>
            </div>
          )
        })}
      </div>
    )
  },
}
