import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeContext } from '@/context/ThemeContext';

export function useTheme() {
  try {
    const context = useThemeContext();
    return {
      ...context.colors,
      activeTheme: context.activeTheme,
    };
  } catch {
    const scheme = useColorScheme();
    const theme = scheme === 'unspecified' ? 'light' : scheme;
    return {
      ...Colors[theme],
      activeTheme: theme as 'light' | 'dark',
    };
  }
}
