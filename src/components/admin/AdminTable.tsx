import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface AdminTableProps {
  headers: string[];
  data: any[];
  renderRow: (item: any, index: number) => React.ReactNode;
  loading: boolean;
  emptyMessage?: string;
  minWidth?: number;
  // Checkbox / Bulk Select props (optional)
  showCheckbox?: boolean;
  isAllSelected?: boolean;
  onToggleSelectAll?: () => void;
}

export default function AdminTable({
  headers,
  data,
  renderRow,
  loading,
  emptyMessage = 'Tidak ada data ditemukan.',
  minWidth = 600,
  showCheckbox = false,
  isAllSelected = false,
  onToggleSelectAll,
}: AdminTableProps) {
  const theme = useTheme();
  
  const TableContent = () => (
    <View style={{ minWidth }}>
      {/* Table Header */}
      <View style={[styles.headerRow, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        {/* Checkbox "Pilih Semua" di header */}
        {showCheckbox && (
          <TouchableOpacity
            style={styles.headerCheckboxCell}
            onPress={onToggleSelectAll}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, { borderColor: theme.textSecondary }, isAllSelected && [styles.checkboxChecked, { backgroundColor: theme.danger, borderColor: theme.danger }]]}>
              {isAllSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>
        )}
        {headers.map((header, idx) => (
          <Text key={idx} style={[styles.headerCell, { color: theme.textMuted }, idx === headers.length - 1 && styles.textRight]}>
            {header}
          </Text>
        ))}
      </View>

      {/* Table Body */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Memuat data...</Text>
        </View>
      ) : data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>⚠️ {emptyMessage}</Text>
        </View>
      ) : (
        <View style={[styles.body, { backgroundColor: theme.backgroundElement }]}>
          {data.map((item, index) => renderRow(item, index))}
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {Platform.OS === 'web' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={styles.webHorizontalScroll}>
          <TableContent />
        </ScrollView>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <TableContent />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 10,
  },
  webHorizontalScroll: {
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headerCheckboxCell: {
    width: 36,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {},
  checkmark: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
  headerCell: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  textRight: {
    textAlign: 'right',
  },
  body: {},
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    marginTop: 10,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
