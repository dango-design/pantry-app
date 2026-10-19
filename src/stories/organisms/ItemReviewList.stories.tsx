import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { ItemReviewList, type ReviewItem } from '@/components/smart-input/ItemReviewList'

const meta = {
  title: 'Organisms/ItemReviewList',
  component: ItemReviewList,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Review and edit items detected from photos or receipts before adding to inventory.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ItemReviewList>

export default meta
// Every story renders a stateful demo wrapper instead of using args
type Story = StoryObj

// Sample detected items
const sampleItems: ReviewItem[] = [
  {
    id: '1',
    name: 'Organic Whole Milk',
    category: 'dairy',
    quantity: 1,
    quantityUnit: 'gal',
    storageLocation: 'refrigerator',
    brand: 'Horizon',
    selected: true,
  },
  {
    id: '2',
    name: 'Bananas',
    category: 'produce',
    quantity: 6,
    quantityUnit: 'count',
    storageLocation: 'counter',
    selected: true,
  },
  {
    id: '3',
    name: 'Chicken Breast',
    category: 'meat',
    quantity: 1.5,
    quantityUnit: 'lb',
    storageLocation: 'refrigerator',
    selected: true,
  },
  {
    id: '4',
    name: 'Greek Yogurt',
    category: 'dairy',
    quantity: 4,
    quantityUnit: 'count',
    storageLocation: 'refrigerator',
    brand: 'Chobani',
    selected: true,
  },
  {
    id: '5',
    name: 'Spinach',
    category: 'produce',
    quantity: 1,
    quantityUnit: 'pack',
    storageLocation: 'refrigerator',
    selected: false, // One item deselected
  },
]

// Interactive wrapper
function ItemReviewListDemo({
  initialItems,
  ...props
}: Omit<React.ComponentProps<typeof ItemReviewList>, 'items' | 'onItemsChange'> & {
  initialItems: ReviewItem[]
}) {
  const [items, setItems] = useState(initialItems)
  return <ItemReviewList {...props} items={items} onItemsChange={setItems} />
}

export const MultipleItems: Story = {
  render: () => (
    <ItemReviewListDemo
      initialItems={sampleItems}
      onConfirm={(items) => console.log('Confirmed items:', items)}
      onCancel={() => console.log('Cancelled')}
    />
  ),
}

export const SingleItem: Story = {
  render: () => (
    <ItemReviewListDemo
      initialItems={[sampleItems[0]]}
      onConfirm={(items) => console.log('Confirmed items:', items)}
      onCancel={() => console.log('Cancelled')}
    />
  ),
}

export const NoItems: Story = {
  render: () => (
    <ItemReviewListDemo
      initialItems={[]}
      onConfirm={(items) => console.log('Confirmed items:', items)}
      onCancel={() => console.log('Cancelled')}
    />
  ),
}

export const Loading: Story = {
  render: () => (
    <ItemReviewListDemo
      initialItems={sampleItems}
      onConfirm={(items) => console.log('Confirmed items:', items)}
      onCancel={() => console.log('Cancelled')}
      loading={true}
    />
  ),
}

export const FromReceipt: Story = {
  render: () => (
    <ItemReviewListDemo
      initialItems={[
        {
          id: '1',
          name: '2% Milk',
          category: 'dairy',
          quantity: 1,
          quantityUnit: 'gal',
          storageLocation: 'refrigerator',
          selected: true,
        },
        {
          id: '2',
          name: 'Eggs Large',
          category: 'dairy',
          quantity: 12,
          quantityUnit: 'count',
          storageLocation: 'refrigerator',
          selected: true,
        },
        {
          id: '3',
          name: 'Bread Whole Wheat',
          category: 'bakery',
          quantity: 1,
          quantityUnit: 'count',
          storageLocation: 'counter',
          selected: true,
        },
        {
          id: '4',
          name: 'Butter Unsalted',
          category: 'dairy',
          quantity: 1,
          quantityUnit: 'count',
          storageLocation: 'refrigerator',
          brand: 'Kerrygold',
          selected: true,
        },
      ]}
      onConfirm={(items) => console.log('Confirmed items:', items)}
      onCancel={() => console.log('Cancelled')}
      title="Review receipt items"
    />
  ),
}
