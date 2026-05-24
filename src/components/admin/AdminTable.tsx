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
  const TableContent = () => (
    <View style={{ minWidth }}>
      {/* Table Header */}
      <View style={styles.headerRow}>
        {/* Checkbox "Pilih Semua" di header */}
        {showCheckbox && (
          <TouchableOpacity
            style={styles.headerCheckboxCell}
            onPress={onToggleSelectAll}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, isAllSelected && styles.checkboxChecked]}>
              {isAllSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>
        )}
        {headers.map((header, idx) => (
          <Text key={idx} style={[styles.headerCell, idx === headers.length - 1 && styles.textRight]}>
            {header}
          </Text>
        ))}
      </View>

      {/* Table Body */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.loadingText}>Memuat data...</Text>
        </View>
      ) : data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>⚠️ {emptyMessage}</Text>
        </View>
      ) : (
        <View style={styles.body}>
          {data.map((item, index) => renderRow(item, index))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
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
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    marginBottom: 10,
  },
  webHorizontalScroll: {
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
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
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  checkmark: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
  headerCell: {
    flex: 1,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  textRight: {
    textAlign: 'right',
  },
  body: {
    backgroundColor: '#1E293B',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94A3B8',
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
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});
