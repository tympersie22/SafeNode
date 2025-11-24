/**
 * SafeNode Mobile Theme System
 * Complete theme configuration with light/dark mode support
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useColorScheme as useRNColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { colors, type ColorMode, type ColorPalette } from './colors'
import { typography } from './typography'
import { spacing } from './spacing'
import { shadows } from './shadows'
import { components } from './components'

const THEME_STORAGE_KEY = '@safenode:theme'

export interface Theme {
  mode: ColorMode
  colors: ColorPalette
  typography: typeof typography
  spacing: typeof spacing
  shadows: typeof shadows
  components: typeof components
  toggleTheme: () => void
  setTheme: (mode: ColorMode) => void
}

const ThemeContext = createContext<Theme | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
  defaultMode?: ColorMode | 'system'
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  defaultMode = 'system' 
}) => {
  const systemColorScheme = useRNColorScheme()
  const [themeMode, setThemeMode] = useState<ColorMode | 'system'>('system')
  const [isLoading, setIsLoading] = useState(true)

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY)
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')) {
          setThemeMode(savedTheme as ColorMode | 'system')
        } else {
          setThemeMode(defaultMode)
        }
      } catch (error) {
        console.error('Failed to load theme:', error)
        setThemeMode(defaultMode)
      } finally {
        setIsLoading(false)
      }
    }
    loadTheme()
  }, [defaultMode])

  // Determine actual color mode
  const actualMode: ColorMode = themeMode === 'system' 
    ? (systemColorScheme === 'dark' ? 'dark' : 'light')
    : themeMode

  const toggleTheme = async () => {
    const newMode: ColorMode = actualMode === 'light' ? 'dark' : 'light'
    setThemeMode(newMode)
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode)
    } catch (error) {
      console.error('Failed to save theme:', error)
    }
  }

  const setTheme = async (mode: ColorMode | 'system') => {
    setThemeMode(mode)
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode)
    } catch (error) {
      console.error('Failed to save theme:', error)
    }
  }

  const theme: Theme = {
    mode: actualMode,
    colors: colors[actualMode],
    typography,
    spacing,
    shadows,
    components,
    toggleTheme,
    setTheme,
  }

  if (isLoading) {
    return null // Or a loading spinner
  }

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): Theme => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Export all theme tokens
export { colors, typography, spacing, shadows, components }
export type { ColorMode, ColorPalette }

