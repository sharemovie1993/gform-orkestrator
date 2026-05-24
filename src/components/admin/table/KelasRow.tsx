import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Kelas } from '@/services/supabase';
import { RowCheckbox, RowActions } from './RowComponents';
import { StatusBadge } from './StatusBadge';

interface KelasRowProps {
  item: Kelas;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  studentCount: number;
}

export const KelasRow = React.memo(function KelasRow({
  item,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
  studentCount,
}: KelasRowProps) {
  return (
    <View style={[styles.rowItem, selected && styles.rowSelected]}>
      <RowCheckbox selected={selected} onToggle={onToggleSelect} />
      <Text style={[styles.cellText, { flex: 0.5 }]}>{item.tingkat}</Text>
      <Text style={styles.cellText}>{item.nama_kelas}</Text>
      <Text style={[styles.cellText, { flex: 1.5 }]}>{item.jurusan_nama || 'Tidak ada'}</Text>
      <Text style={[styles.cellText, { flex: 1.0 }]}>{studentCount} Siswa</Text>
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
