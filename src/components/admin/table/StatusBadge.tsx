import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface StatusBadgeProps {
  active: boolean;
  activeText?: string;
  inactiveText?: string;
}

export const StatusBadge = React.memo(function StatusBadge({
  active,
  activeText = 'Aktif',
  inactiveText = 'Nonaktif',
}: StatusBadgeProps) {
  const theme = useTheme();
  
  const badgeStyle = active 
    ? { backgroundColor: theme.activeTheme === 'light' ? 'rgba(5, 150, 105, 0.08)' : 'rgba(16, 185, 129, 0.1)', borderColor: theme.success }
    : { backgroundColor: theme.activeTheme === 'light' ? 'rgba(220, 38, 38, 0.08)' : 'rgba(239, 68, 68, 0.1)', borderColor: theme.danger };

  const textStyle = active 
    ? { color: theme.success }
    : { color: theme.danger };

  return (
    <View style={[styles.badge, badgeStyle]}>
      <Text style={[styles.text, textStyle]}>
        {active ? activeText : inactiveText}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
});
