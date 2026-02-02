import type { Preview } from '@storybook/react-vite'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import React from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { FlyToCartProvider } from '@/components/common/FlyToCartAnimation'
import '@/styles/index.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'centered',
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f9fafb' },
        { name: 'white', value: '#ffffff' },
        { name: 'dark', value: '#1f2937' },
      ],
    },
  },
  decorators: [
    (Story, context) => {
      // Allow stories to customize the router via parameters
      const { reactRouter } = context.parameters
      const initialPath = reactRouter?.initialPath || '/'
      const routePath = reactRouter?.routePath || '*'

      return (
        <AuthProvider>
          <FlyToCartProvider>
            <MemoryRouter initialEntries={[initialPath]}>
              <Routes>
                <Route path={routePath} element={<Story />} />
              </Routes>
            </MemoryRouter>
          </FlyToCartProvider>
        </AuthProvider>
      )
    },
  ],
}

export default preview
