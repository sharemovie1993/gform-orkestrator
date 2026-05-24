import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface RowCheckboxProps {
  selected: boolean;
  onToggle: () => void;
}

export const RowCheckbox = React.memo(function RowCheckbox({
  selected,
  onToggle,
}: RowCheckboxProps) {
  const theme = useTheme();
  return (
    <TouchableOpacity style={styles.rowCheckboxCell} onPress={onToggle} activeOpacity={0.7}>
      <View style={[styles.rowCheckbox, { borderColor: theme.textSecondary }, selected && [styles.rowCheckboxChecked, { backgroundColor: theme.danger, borderColor: theme.danger }]]}>
        {selected && <Text style={styles.rowCheckmark}>✓</Text>}
      </View>
    </TouchableOpacity>
  );
});

interface RowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
}

export const RowActions = React.memo(function RowActions({
  onEdit,
  onDelete,
}: RowActionsProps) {
  const theme = useTheme();
  return (
    <View style={styles.actionsCell}>
      <TouchableOpacity style={[styles.actionEdit, { backgroundColor: theme.activeTheme === 'light' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.15)', borderColor: theme.primary }]} onPress={onEdit} activeOpacity={0.7}>
        <Text style={styles.actionBtnIcon}>✏️</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionDelete, { backgroundColor: theme.activeTheme === 'light' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.15)', borderColor: theme.danger }]} onPress={onDelete} activeOpacity={0.7}>
        <Text style={styles.actionBtnIcon}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  rowCheckboxCell: {
    width: 36,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  rowCheckboxChecked: {},
  rowCheckmark: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
  actionsCell: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionEdit: {
    borderWidth: 1,
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionDelete: {
    borderWidth: 1,
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnIcon: {
    fontSize: 13,
  },
});
