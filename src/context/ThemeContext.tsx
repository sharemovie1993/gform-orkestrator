import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/theme';

export type ThemeSetting = 'system' | 'light' | 'dark';
export type ActiveTheme = 'light' | 'dark';

interface ThemeContextType {
  themeSetting: ThemeSetting;
  activeTheme: ActiveTheme;
  colors: typeof Colors.light;
  setThemeSetting: (setting: ThemeSetting) => Promise<void>;
  isLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@app_theme_preference';

export function ThemeContextProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useRNColorScheme();
  const [themeSetting, setThemeSettingState] = useState<ThemeSetting>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved preference from AsyncStorage
  useEffect(() => {
    async function loadThemePreference() {
      try {
        const savedPref = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedPref === 'light' || savedPref === 'dark' || savedPref === 'system') {
          setThemeSettingState(savedPref);
        }
      } catch (error) {
        console.warn('Failed to load theme preference from AsyncStorage:', error);
      } finally {
        setIsLoaded(true);
      }
    }
    loadThemePreference();
  }, []);

  // Compute the active theme based on setting and system scheme
  const activeTheme: ActiveTheme = React.useMemo(() => {
    if (themeSetting === 'system') {
      return systemScheme === 'dark' ? 'dark' : 'light';
    }
    return themeSetting;
  }, [themeSetting, systemScheme]);

  // Expose color tokens based on active theme
  const colors = React.useMemo(() => {
    return Colors[activeTheme] as typeof Colors.light;
  }, [activeTheme]);

  // Set theme preference
  const setThemeSetting = async (setting: ThemeSetting) => {
    try {
      setThemeSettingState(setting);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, setting);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ themeSetting, activeTheme, colors, setThemeSetting, isLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeContextProvider');
  }
  return context;
}
