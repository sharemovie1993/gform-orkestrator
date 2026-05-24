import { Stack } from 'expo-router';
import React from 'react';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { ThemeContextProvider, useThemeContext } from '@/context/ThemeContext';

function InnerLayout() {
  const { activeTheme } = useThemeContext();

  return (
    <ThemeProvider value={activeTheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="exam-list" />
        <Stack.Screen name="exam-webview" />
        <Stack.Screen name="blocked" />
        <Stack.Screen name="teacher/login" />
        <Stack.Screen name="teacher/dashboard" />
        <Stack.Screen name="teacher/create-exam" />
        <Stack.Screen name="teacher/manage-data" />
        <Stack.Screen name="teacher/settings" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeContextProvider>
      <InnerLayout />
    </ThemeContextProvider>
  );
}

