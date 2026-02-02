import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  getFoodIcon,
  BananaIcon,
  AppleIcon,
  MilkIcon,
  EggIcon,
  ChickenIcon,
  ButterIcon,
  BreadIcon,
  CheeseIcon,
  SpinachIcon,
  YogurtIcon,
} from '@/components/icons/FoodIcons'
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
        component: 'Custom SVG icons for food items and storage locations.',
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
        { Icon: BananaIcon, name: 'Banana' },
        { Icon: AppleIcon, name: 'Apple' },
        { Icon: MilkIcon, name: 'Milk' },
        { Icon: EggIcon, name: 'Egg' },
        { Icon: ChickenIcon, name: 'Chicken' },
        { Icon: ButterIcon, name: 'Butter' },
        { Icon: BreadIcon, name: 'Bread' },
        { Icon: CheeseIcon, name: 'Cheese' },
        { Icon: SpinachIcon, name: 'Spinach' },
        { Icon: YogurtIcon, name: 'Yogurt' },
      ].map(({ Icon, name }) => (
        <div key={name} className="flex flex-col items-center gap-2">
          <Icon size={48} />
          <span className="text-xs text-gray-500">{name}</span>
        </div>
      ))}
    </div>
  ),
}

export const FoodIconSizes: Story = {
  render: () => (
    <div className="flex items-end gap-4 p-4">
      <div className="flex flex-col items-center gap-1">
        <BananaIcon size={24} />
        <span className="text-xs text-gray-500">24px</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <BananaIcon size={36} />
        <span className="text-xs text-gray-500">36px</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <BananaIcon size={48} />
        <span className="text-xs text-gray-500">48px</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <BananaIcon size={64} />
        <span className="text-xs text-gray-500">64px</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <BananaIcon size={96} />
        <span className="text-xs text-gray-500">96px</span>
      </div>
    </div>
  ),
}

export const DynamicFoodIcon: Story = {
  render: () => {
    const foodNames = ['banana', 'milk', 'chicken', 'bread', 'yogurt', 'spinach', 'unknown item']
    return (
      <div className="flex gap-4 p-4">
        {foodNames.map((name) => {
          const Icon = getFoodIcon(name)
          return (
            <div key={name} className="flex flex-col items-center gap-2">
              <Icon size={48} />
              <span className="text-xs text-gray-500 text-center">{name}</span>
            </div>
          )
        })}
      </div>
    )
  },
}

export const LocationIcons: Story = {
  render: () => (
    <div className="flex gap-6 p-4">
      {[
        { Icon: FridgeIcon, name: 'Fridge' },
        { Icon: FreezerIcon, name: 'Freezer' },
        { Icon: PantryIcon, name: 'Pantry' },
        { Icon: CounterIcon, name: 'Counter' },
        { Icon: SpiceRackIcon, name: 'Spice Rack' },
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
