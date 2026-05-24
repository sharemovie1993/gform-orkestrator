import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Siswa } from '@/services/supabase';
import { RowCheckbox, RowActions } from './RowComponents';
import { StatusBadge } from './StatusBadge';

interface SiswaRowProps {
  item: Siswa;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const SiswaRow = React.memo(function SiswaRow({
  item,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
}: SiswaRowProps) {
  return (
    <View style={[styles.rowItem, selected && styles.rowSelected]}>
      <RowCheckbox selected={selected} onToggle={onToggleSelect} />
      <Text style={styles.cellText}>{item.nisn}</Text>
      <Text style={[styles.cellText, { flex: 1.5 }]}>{item.nama_siswa}</Text>
      <Text style={styles.cellText}>{item.kelas_nama || 'Tidak ada'}</Text>
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
