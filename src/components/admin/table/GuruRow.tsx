import React from 'react';
import { View, Text, Switch, ActivityIndicator, StyleSheet } from 'react-native';
import { Guru } from '@/services/supabase';
import { RowCheckbox, RowActions } from './RowComponents';

interface GuruRowProps {
  item: Guru;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isToggling: boolean;
  onToggleActive: (val: boolean) => void;
}

export const GuruRow = React.memo(function GuruRow({
  item,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
  isToggling,
  onToggleActive,
}: GuruRowProps) {
  return (
    <View style={[styles.rowItem, selected && styles.rowSelected]}>
      <RowCheckbox selected={selected} onToggle={onToggleSelect} />
      <Text style={[styles.cellText, { flex: 1.5 }]}>{item.nama_guru}</Text>
      <Text style={styles.cellText}>{item.username}</Text>
      <Text style={styles.cellText}>{item.pin_pengawas}</Text>
      
      {/* Switch aktif/nonaktif */}
      <View style={[styles.cellText, { flex: 0.9, alignItems: 'center' }]}>
        {isToggling ? (
          <ActivityIndicator size="small" color="#3B82F6" />
        ) : (
          <View style={styles.toggleWrapper}>
            <Switch
              value={item.is_active}
              onValueChange={onToggleActive}
              trackColor={{ false: '#334155', true: 'rgba(16,185,129,0.4)' }}
              thumbColor={item.is_active ? '#10B981' : '#64748B'}
              ios_backgroundColor="#334155"
            />
            <Text style={[styles.toggleLabel, item.is_active ? styles.toggleLabelActive : styles.toggleLabelInactive]}>
              {item.is_active ? 'Aktif' : 'Nonaktif'}
            </Text>
          </View>
        )}
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
  toggleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  toggleLabelActive: {
    color: '#10B981',
  },
  toggleLabelInactive: {
    color: '#64748B',
  },
});
