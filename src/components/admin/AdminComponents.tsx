import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';

// ==========================================
// 1. ADMIN TITLE
// ==========================================
interface AdminTitleProps {
  title: string;
  subtitle: string;
}

export function AdminTitle({ title, subtitle }: AdminTitleProps) {
  const theme = useTheme();
  return (
    <View style={titleStyles.container}>
      <Text style={[titleStyles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[titleStyles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
    </View>
  );
}

const titleStyles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
});


// ==========================================
// 2. ANALYTIC CARD
// ==========================================
interface AnalyticCardProps {
  title: string;
  value: string | number;
  icon: string;
  color?: string;
  onPress?: () => void;
}

export function AnalyticCard({ title, value, icon, color = '#3B82F6', onPress }: AnalyticCardProps) {
  const theme = useTheme();
  return (
    <TouchableOpacity 
      style={[cardStyles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border, borderLeftColor: color }]} 
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={[cardStyles.iconContainer, { backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)' }]}>
        <Text style={cardStyles.icon}>{icon}</Text>
      </View>
      <View style={cardStyles.content}>
        <Text style={[cardStyles.cardTitle, { color: theme.textMuted }]}>{title}</Text>
        <Text style={[cardStyles.cardValue, { color: theme.text }]}>{value}</Text>
      </View>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    flex: 1,
    minWidth: 140,
    marginHorizontal: 6,
    marginVertical: 6,
    borderWidth: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
});


// ==========================================
// 3. ADMIN TOOLBAR
// ==========================================
interface AdminToolbarProps {
  searchValue: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder: string;
  onAddPress: () => void;
  addLabel: string;
  onImportPress?: () => void;
  importLabel?: string;
  onDownloadTemplatePress?: () => void;
  downloadTemplateLabel?: string;
  onRefreshPress?: () => void;
  children?: React.ReactNode; // Extra filter elements
}

export function AdminToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  onAddPress,
  addLabel,
  onImportPress,
  importLabel = 'Import Excel 📥',
  onDownloadTemplatePress,
  downloadTemplateLabel = 'Unduh Template 📄',
  onRefreshPress,
  children,
}: AdminToolbarProps) {
  const theme = useTheme();
  return (
    <View style={[toolbarStyles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={toolbarStyles.leftSection}>
        <View style={[toolbarStyles.searchWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Text style={toolbarStyles.searchIcon}>🔍</Text>
          <TextInput
            style={[toolbarStyles.searchInput, { color: theme.text }]}
            placeholder={searchPlaceholder}
            placeholderTextColor={theme.textMuted}
            value={searchValue}
            onChangeText={onSearchChange}
          />
          {searchValue !== '' && (
            <TouchableOpacity style={toolbarStyles.clearBtn} onPress={() => onSearchChange('')}>
              <Text style={toolbarStyles.clearText}>✖</Text>
            </TouchableOpacity>
          )}
        </View>
        {children && <View style={toolbarStyles.filtersContainer}>{children}</View>}
      </View>

      <View style={toolbarStyles.actions}>
        {onRefreshPress && (
          <TouchableOpacity 
            style={[toolbarStyles.refreshBtn, { backgroundColor: theme.activeTheme === 'light' ? 'rgba(6, 182, 212, 0.08)' : 'rgba(6, 182, 212, 0.15)', borderColor: '#06B6D4' }]} 
            onPress={onRefreshPress}
          >
            <Text style={toolbarStyles.refreshBtnText}>🔄 Segarkan</Text>
          </TouchableOpacity>
        )}
        {onDownloadTemplatePress && (
          <TouchableOpacity 
            style={[toolbarStyles.downloadBtn, { backgroundColor: theme.activeTheme === 'light' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.15)', borderColor: '#F59E0B' }]} 
            onPress={onDownloadTemplatePress}
          >
            <Text style={toolbarStyles.downloadBtnText}>{downloadTemplateLabel}</Text>
          </TouchableOpacity>
        )}
        {onImportPress && (
          <TouchableOpacity 
            style={[toolbarStyles.importBtn, { backgroundColor: theme.activeTheme === 'light' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.15)', borderColor: theme.success }]} 
            onPress={onImportPress}
          >
            <Text style={[toolbarStyles.importBtnText, { color: theme.success }]}>{importLabel}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[toolbarStyles.addBtn, { backgroundColor: theme.primary }]} onPress={onAddPress}>
          <Text style={toolbarStyles.addBtnText}>➕ {addLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const toolbarStyles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    gap: 12,
  },
  leftSection: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  searchWrapper: {
    flex: 1,
    minWidth: 200,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
    padding: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  clearBtn: {
    padding: 6,
  },
  clearText: {
    fontSize: 10,
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    ...Platform.select({
      web: {
        marginLeft: 'auto',
      },
    }),
  },
  addBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    height: 42,
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  importBtn: {
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    height: 42,
    justifyContent: 'center',
  },
  importBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
  downloadBtn: {
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    height: 42,
    justifyContent: 'center',
  },
  downloadBtnText: {
    color: '#F59E0B',
    fontWeight: '700',
    fontSize: 13,
  },
  refreshBtn: {
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    height: 42,
    justifyContent: 'center',
  },
  refreshBtnText: {
    color: '#06B6D4',
    fontWeight: '700',
    fontSize: 13,
  },
});


// ==========================================
// 4. ADMIN PAGINATION
// ==========================================
interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  onItemsPerPageChange?: (limit: number) => void;
}

export function AdminPagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  onItemsPerPageChange,
}: AdminPaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  const theme = useTheme();

  return (
    <View style={paginationStyles.container}>
      <View style={paginationStyles.leftCol}>
        <Text style={[paginationStyles.infoText, { color: theme.textSecondary }]}>
          Menampilkan {startItem}-{endItem} dari {totalItems} data
        </Text>
        
        {onItemsPerPageChange && (
          <View style={paginationStyles.limitContainer}>
            <Text style={[paginationStyles.limitLabel, { color: theme.textSecondary }]}>Baris:</Text>
            {[5, 10, 25, 50, 100].map((limit) => (
              <TouchableOpacity
                key={limit}
                style={[
                  paginationStyles.limitChip,
                  { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
                  itemsPerPage === limit && [paginationStyles.limitChipActive, { backgroundColor: theme.primary, borderColor: theme.primary }],
                ]}
                onPress={() => onItemsPerPageChange(limit)}
              >
                <Text
                  style={[
                    paginationStyles.limitChipText,
                    { color: theme.textSecondary },
                    itemsPerPage === limit && [paginationStyles.limitChipTextActive, { color: '#FFFFFF' }],
                  ]}
                >
                  {limit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      
      {totalPages > 1 && (
        <View style={paginationStyles.btnRow}>
          <TouchableOpacity
            style={[
              paginationStyles.btn,
              { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
              currentPage === 1 && paginationStyles.btnDisabled
            ]}
            disabled={currentPage === 1}
            onPress={() => onPageChange(currentPage - 1)}
          >
            <Text style={[
              paginationStyles.btnText,
              { color: theme.textSecondary },
              currentPage === 1 && { color: theme.textMuted }
            ]}>
              Sebelumnya
            </Text>
          </TouchableOpacity>
          
          <View style={[paginationStyles.pageIndicator, { backgroundColor: theme.activeTheme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(37, 99, 235, 0.08)', borderColor: theme.primary + '40' }]}>
            <Text style={[paginationStyles.pageText, { color: theme.primary }]}>
              {currentPage} / {totalPages}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              paginationStyles.btn,
              { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
              currentPage === totalPages && paginationStyles.btnDisabled
            ]}
            disabled={currentPage === totalPages}
            onPress={() => onPageChange(currentPage + 1)}
          >
            <Text style={[
              paginationStyles.btnText,
              { color: theme.textSecondary },
              currentPage === totalPages && { color: theme.textMuted }
            ]}>
              Selanjutnya
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const paginationStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    gap: 10,
  },
  leftCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  limitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  limitLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginRight: 2,
  },
  limitChip: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6,
    borderWidth: 1,
  },
  limitChipActive: {},
  limitChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  limitChipTextActive: {},
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btn: {
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    fontWeight: '700',
    fontSize: 12,
  },
  btnTextDisabled: {},
  pageIndicator: {
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  pageText: {
    fontWeight: '800',
    fontSize: 12,
  },
});


// ==========================================
// 5. ADMIN MODAL
// ==========================================
interface AdminModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function AdminModal({ visible, onClose, title, children }: AdminModalProps) {
  const theme = useTheme();
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[modalStyles.overlay, { backgroundColor: theme.activeTheme === 'dark' ? 'rgba(15, 23, 42, 0.85)' : 'rgba(15, 23, 42, 0.5)' }]}>
        <View style={[modalStyles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          {/* Modal Header */}
          <View style={[modalStyles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.border }]}>
            <Text style={[modalStyles.title, { color: theme.text }]}>{title}</Text>
            <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
              <Text style={[modalStyles.closeBtnText, { color: theme.textSecondary }]}>✖</Text>
            </TouchableOpacity>
          </View>
          
          {/* Modal Content */}
          <ScrollView
            style={[modalStyles.body, { backgroundColor: theme.backgroundElement }]}
            contentContainerStyle={modalStyles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    borderRadius: 20,
    width: '100%',
    maxWidth: 550,
    maxHeight: '90%',
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
  },
});


// ==========================================
// 6. CONFIRMATION DIALOG (DELETE)
// ==========================================
interface ConfirmDialogProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  disabled?: boolean;
}

export function ConfirmDialog({
  visible,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Hapus',
  cancelText = 'Batal',
  disabled = false,
}: ConfirmDialogProps) {
  const theme = useTheme();
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={disabled ? undefined : onCancel}
    >
      <View style={[confirmStyles.overlay, { backgroundColor: theme.activeTheme === 'dark' ? 'rgba(15, 23, 42, 0.85)' : 'rgba(15, 23, 42, 0.5)' }]}>
        <View style={[confirmStyles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={[confirmStyles.iconWrapper, { backgroundColor: theme.activeTheme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)' }]}>
            <Text style={confirmStyles.warningIcon}>⚠️</Text>
          </View>
          
          <Text style={[confirmStyles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[confirmStyles.message, { color: theme.textSecondary }]}>{message}</Text>
          
          <View style={confirmStyles.actions}>
            <TouchableOpacity 
              style={[confirmStyles.cancelBtn, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }, disabled && { opacity: 0.5 }]} 
              onPress={onCancel}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <Text style={[confirmStyles.cancelBtnText, { color: theme.textSecondary }]}>{cancelText}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[confirmStyles.confirmBtn, { backgroundColor: theme.danger }, disabled && { opacity: 0.7 }]} 
              onPress={onConfirm}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <Text style={confirmStyles.confirmBtnText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const confirmStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  warningIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
});


// ==========================================
// 7. BULK ACTION BAR (Bulk Delete)
// ==========================================
interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDeleteSelected: () => void;
  isAllSelected: boolean;
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDeleteSelected,
  isAllSelected,
}: BulkActionBarProps) {
  const theme = useTheme();
  if (selectedCount === 0) return null;

  return (
    <View style={[bulkBarStyles.container, { backgroundColor: theme.activeTheme === 'dark' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(220, 38, 38, 0.05)', borderColor: theme.activeTheme === 'dark' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(220, 38, 38, 0.25)' }]}>
      <View style={bulkBarStyles.left}>
        <TouchableOpacity
          style={bulkBarStyles.checkboxArea}
          onPress={isAllSelected ? onDeselectAll : onSelectAll}
        >
          <View style={[bulkBarStyles.checkbox, { borderColor: theme.danger }, isAllSelected && [bulkBarStyles.checkboxChecked, { backgroundColor: theme.danger }]]}>
            {isAllSelected && <Text style={bulkBarStyles.checkmark}>✓</Text>}
          </View>
          <Text style={[bulkBarStyles.selectedLabel, { color: theme.activeTheme === 'dark' ? '#FCA5A5' : '#DC2626' }]}>
            {selectedCount} dari {totalCount} dipilih
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[bulkBarStyles.deselectBtn, { borderColor: theme.activeTheme === 'dark' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(220, 38, 38, 0.3)' }]} onPress={onDeselectAll}>
          <Text style={[bulkBarStyles.deselectText, { color: theme.activeTheme === 'dark' ? '#F87171' : '#DC2626' }]}>Batalkan Pilihan</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={[bulkBarStyles.deleteBtn, { backgroundColor: theme.danger }]} onPress={onDeleteSelected}>
        <Text style={bulkBarStyles.deleteBtnText}>🗑️ Hapus {selectedCount} Data</Text>
      </TouchableOpacity>
    </View>
  );
}

const bulkBarStyles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 10,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
  },
  checkboxArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {},
  checkmark: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
  },
  selectedLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  deselectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  deselectText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deleteBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
