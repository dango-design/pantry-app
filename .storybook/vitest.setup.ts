import * as a11yAddonAnnotations from '@storybook/addon-a11y/preview'
import { setProjectAnnotations } from '@storybook/react-vite'
import * as projectAnnotations from './preview'

// Applies the same decorators and parameters as Storybook itself when stories run under Vitest
setProjectAnnotations([a11yAddonAnnotations, projectAnnotations])
