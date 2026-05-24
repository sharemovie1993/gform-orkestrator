import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinkSoal } from '@/services/supabase';
import { RowCheckbox, RowActions } from './RowComponents';
import { StatusBadge } from './StatusBadge';

interface LinkSoalRowProps {
  item: LinkSoal;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const LinkSoalRow = React.memo(function LinkSoalRow({
  item,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
}: LinkSoalRowProps) {
  const isProtected = item.enable_blocking !== false;
  return (
    <View style={[styles.rowItem, selected && styles.rowSelected]}>
      <RowCheckbox selected={selected} onToggle={onToggleSelect} />
      <Text style={[styles.cellText, { color: '#FFF', fontWeight: '700' }]}>{item.mapel_nama || 'Tidak ada'}</Text>
      <Text style={styles.cellText}>{item.kelas_nama || 'Tidak ada'}</Text>
      <Text style={styles.cellText}>{item.guru_nama || 'Tidak ada'}</Text>
      <Text style={styles.cellText}>{item.tanggal_ujian}</Text>
      <Text style={styles.cellText}>{item.waktu_ujian}</Text>
      <Text style={[styles.cellText, { flex: 1.5, color: '#3B82F6' }]} numberOfLines={1}>{item.google_form_link}</Text>
      <View style={[styles.cellText, { flex: 0.8 }]}>
        <StatusBadge active={isProtected} activeText="🔒 Kunci" inactiveText="🔓 Bebas" />
      </View>
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
