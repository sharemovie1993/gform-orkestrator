/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0F172A', // Slate 900
    background: '#F8FAFC', // Slate 50
    backgroundElement: '#FFFFFF', // White card
    backgroundSelected: '#F1F5F9', // Slate 100
    textSecondary: '#475569', // Slate 600
    textMuted: '#64748B', // Slate 500
    border: '#E2E8F0', // Slate 200
    primary: '#2563EB', // Blue 600
    success: '#059669', // Emerald 600
    danger: '#DC2626', // Red 600
    warning: '#D97706', // Amber 600
    cardShadow: 'rgba(15, 23, 42, 0.05)',
  },
  dark: {
    text: '#FFFFFF', // White
    background: '#0F172A', // Slate 900
    backgroundElement: '#1E293B', // Slate 800
    backgroundSelected: '#2D3748',
    textSecondary: '#94A3B8', // Slate 400
    textMuted: '#64748B', // Slate 500
    border: '#334155', // Slate 700
    primary: '#3B82F6', // Blue 500
    success: '#10B981', // Emerald 500
    danger: '#EF4444', // Red 500
    warning: '#F59E0B', // Amber 500
    cardShadow: 'rgba(0, 0, 0, 0.3)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
