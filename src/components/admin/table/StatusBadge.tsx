import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
  return (
    <View style={[styles.badge, active ? styles.active : styles.inactive]}>
      <Text style={[styles.text, active ? styles.textActive : styles.textInactive]}>
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
  active: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
  },
  inactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#EF4444',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
  textActive: {
    color: '#10B981',
  },
  textInactive: {
    color: '#EF4444',
  },
});
