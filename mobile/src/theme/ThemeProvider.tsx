import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { dark, light, type Palette } from './tokens';

type Theme = { t: Palette; isDark: boolean };

const ThemeContext = createContext<Theme>({ t: light, isDark: false });

// Follows the phone's light/dark setting.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const isDark = useColorScheme() === 'dark';
  return <ThemeContext.Provider value={{ t: isDark ? dark : light, isDark }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
