import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Mapel } from '@/services/supabase';
import { RowCheckbox, RowActions } from './RowComponents';
import { StatusBadge } from './StatusBadge';
import { useTheme } from '@/hooks/use-theme';

interface MapelRowProps {
  item: Mapel;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const MapelRow = React.memo(function MapelRow({
  item,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
}: MapelRowProps) {
  const theme = useTheme();
  return (
    <View style={[
      styles.rowItem, 
      { borderBottomColor: theme.border },
      selected && { backgroundColor: theme.activeTheme === 'dark' ? 'rgba(239, 68, 68, 0.07)' : 'rgba(220, 38, 38, 0.04)' }
    ]}>
      <RowCheckbox selected={selected} onToggle={onToggleSelect} />
      <Text style={[styles.cellText, { flex: 1.5, color: theme.text, fontWeight: '700' }]}>{item.nama_mapel}</Text>
      <Text style={[styles.cellText, { color: theme.textSecondary }]}>{item.singkatan}</Text>
      <View style={[styles.cellText, { flex: 0.8 }]}>
        <StatusBadge active={!!item.is_active} />
      </View>
      <RowActions onEdit={onEdit} onDelete={onDelete} />
    </View>
  );
});

const styles = StyleSheet.create({
  rowItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  cellText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
});
