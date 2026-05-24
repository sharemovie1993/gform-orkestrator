import { Stack } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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

