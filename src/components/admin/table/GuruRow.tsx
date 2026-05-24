import React from 'react';
import { View, Text, Switch, ActivityIndicator, StyleSheet } from 'react-native';
import { Guru } from '@/services/supabase';
import { RowCheckbox, RowActions } from './RowComponents';
import { useTheme } from '@/hooks/use-theme';

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
  const theme = useTheme();
  
  return (
    <View style={[
      styles.rowItem, 
      { borderBottomColor: theme.border },
      selected && { backgroundColor: theme.activeTheme === 'dark' ? 'rgba(239, 68, 68, 0.07)' : 'rgba(220, 38, 38, 0.04)' }
    ]}>
      <RowCheckbox selected={selected} onToggle={onToggleSelect} />
      <Text style={[styles.cellText, { flex: 1.5, color: theme.text, fontWeight: '700' }]}>{item.nama_guru}</Text>
      <Text style={[styles.cellText, { color: theme.textSecondary }]}>{item.username}</Text>
      <Text style={[styles.cellText, { color: theme.textSecondary }]}>{item.pin_pengawas}</Text>
      
      {/* Switch aktif/nonaktif */}
      <View style={[styles.cellText, { flex: 0.9, alignItems: 'center' }]}>
        {isToggling ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <View style={styles.toggleWrapper}>
            <Switch
              value={item.is_active}
              onValueChange={onToggleActive}
              trackColor={{ false: theme.border, true: theme.activeTheme === 'light' ? 'rgba(5, 150, 105, 0.4)' : 'rgba(16, 185, 129, 0.4)' }}
              thumbColor={item.is_active ? theme.success : theme.textSecondary}
            />
            <Text style={[styles.toggleLabel, { color: item.is_active ? theme.success : theme.textMuted }]}>
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
    alignItems: 'center',
  },
  cellText: {
    flex: 1,
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
});
