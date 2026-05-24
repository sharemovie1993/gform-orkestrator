import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface RowCheckboxProps {
  selected: boolean;
  onToggle: () => void;
}

export const RowCheckbox = React.memo(function RowCheckbox({
  selected,
  onToggle,
}: RowCheckboxProps) {
  return (
    <TouchableOpacity style={styles.rowCheckboxCell} onPress={onToggle} activeOpacity={0.7}>
      <View style={[styles.rowCheckbox, selected && styles.rowCheckboxChecked]}>
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
  return (
    <View style={styles.actionsCell}>
      <TouchableOpacity style={styles.actionEdit} onPress={onEdit} activeOpacity={0.7}>
        <Text style={styles.actionBtnIcon}>✏️</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionDelete} onPress={onDelete} activeOpacity={0.7}>
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
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  rowCheckboxChecked: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
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
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: '#3B82F6',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
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
