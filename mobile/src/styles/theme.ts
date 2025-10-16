import { DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';

export const colors = {
  background: '#f8fafc',
  surface: '#ffffff',
  primary: '#0f172a',
  accent: '#6366f1'
};

export const theme = {
  navigationTheme: {
    ...NavigationDefaultTheme,
    colors: {
      ...NavigationDefaultTheme.colors,
      background: colors.background,
      card: colors.surface,
      primary: colors.primary,
      text: '#0f172a',
      border: '#e2e8f0'
    }
  }
};

