import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Mapel } from '@/services/supabase';
import { RowCheckbox, RowActions } from './RowComponents';
import { StatusBadge } from './StatusBadge';

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
  return (
    <View style={[styles.rowItem, selected && styles.rowSelected]}>
      <RowCheckbox selected={selected} onToggle={onToggleSelect} />
      <Text style={[styles.cellText, { flex: 1.5, color: '#FFF', fontWeight: '700' }]}>{item.nama_mapel}</Text>
      <Text style={styles.cellText}>{item.singkatan}</Text>
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
    borderBottomColor: '#263347',
    alignItems: 'center',
  },
  rowSelected: {
    backgroundColor: 'rgba(239, 68, 68, 0.07)',
  },
  cellText: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
});
