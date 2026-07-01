import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DbService } from '@/services/supabase';
import { useTheme } from '@/hooks/use-theme';

interface BlockedStudent {
  id: string;
  nisn: string;
  nama_siswa: string;
  kelas_id: string;
  kelas?: {
    nama_kelas: string;
  };
}

export default function BlockedStudentsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [students, setStudents] = useState<BlockedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const loadBlockedStudents = async () => {
    try {
      const list = await DbService.getBlockedSiswa();
      setStudents(list);
      // Clean selectedIds of any IDs that are no longer in the blocked list
      const listIds = list.map((s: any) => s.id);
      setSelectedIds((prev) => prev.filter((id) => listIds.includes(id)));
    } catch (err) {
      console.error('Failed to load blocked students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePullToRefresh = async () => {
    setRefreshing(true);
    await loadBlockedStudents();
    setRefreshing(false);
  };

  useEffect(() => {
    loadBlockedStudents();
  }, []);

  // Filter students based on search query
  const filteredStudents = React.useMemo(() => {
    return students.filter((s) => {
      const className = s.kelas?.nama_kelas || 'Tanpa Kelas';
      return (
        s.nama_siswa.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nisn.includes(searchQuery) ||
        className.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [students, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleUnblock = async (ids: string[]) => {
    if (ids.length === 0) return;
    
    setActionLoading(true);
    try {
      await DbService.bulkUnblockSiswa(ids);
      
      const successMsg = `Berhasil membuka kunci ${ids.length} siswa terpilih. HP siswa akan otomatis terbuka kembali secara instan!`;
      if (Platform.OS === 'web') {
        alert(successMsg);
      } else {
        Alert.alert('Sukses', successMsg);
      }
      
      await loadBlockedStudents();
    } catch (err) {
      console.error('Unblock failed:', err);
      const errMsg = 'Gagal membuka blokir siswa. Silakan coba lagi.';
      if (Platform.OS === 'web') {
        alert(errMsg);
      } else {
        Alert.alert('Error', errMsg);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockAll = () => {
    if (students.length === 0) return;
    
    const allIds = students.map((s) => s.id);
    const triggerUnblock = () => handleUnblock(allIds);

    if (Platform.OS === 'web') {
      if (confirm(`Apakah Anda yakin ingin membuka kunci SEMUA (${students.length}) siswa yang sedang terkunci?`)) {
        triggerUnblock();
      }
    } else {
      Alert.alert(
        'Buka Semua Kunci',
        `Apakah Anda yakin ingin membuka kunci SEMUA (${students.length}) siswa yang sedang terkunci?`,
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Buka Kunci', style: 'destructive', onPress: triggerUnblock },
        ]
      );
    }
  };

  const renderStudentItem = ({ item }: { item: BlockedStudent }) => {
    const isSelected = selectedIds.includes(item.id);
    const className = item.kelas?.nama_kelas || 'Tanpa Kelas';
    
    return (
      <TouchableOpacity 
        style={[styles.studentCard, isSelected && styles.studentCardSelected]} 
        onPress={() => toggleSelect(item.id)}
      >
        <View style={styles.cardHeader}>
          <TouchableOpacity 
            style={[styles.checkbox, isSelected && styles.checkboxChecked]}
            onPress={() => toggleSelect(item.id)}
          >
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
          
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{item.nama_siswa}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>NISN: {item.nisn}</Text>
              <Text style={styles.metaDivider}>•</Text>
              <Text style={styles.metaText}>{className}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.singleUnblockBtn, actionLoading && { opacity: 0.6 }]}
            onPress={() => handleUnblock([item.id])}
            disabled={actionLoading}
          >
            <Text style={styles.singleUnblockBtnText}>🔓 Buka</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.activeTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.backgroundElement} />
      
      {/* Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>⬅️ Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Siswa Terkunci (Anti-Cheat)</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadBlockedStudents} disabled={loading || actionLoading}>
          <Text style={styles.refreshBtnText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Action Banner */}
      {students.length > 0 && (
        <View style={styles.actionBanner}>
          <TouchableOpacity 
            style={[styles.bannerBtn, styles.bannerBtnOutline]} 
            onPress={toggleSelectAll}
          >
            <Text style={styles.bannerBtnOutlineText}>
              {selectedIds.length === filteredStudents.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.bannerBtn, 
              styles.bannerBtnUnblock, 
              (selectedIds.length === 0 || actionLoading) && styles.bannerBtnDisabled
            ]} 
            onPress={() => handleUnblock(selectedIds)}
            disabled={selectedIds.length === 0 || actionLoading}
          >
            <Text style={styles.bannerBtnText}>
              Buka Terpilih ({selectedIds.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.bannerBtn, styles.bannerBtnUnblockAll, actionLoading && styles.bannerBtnDisabled]} 
            onPress={handleUnblockAll}
            disabled={actionLoading}
          >
            <Text style={styles.bannerBtnText}>Buka Semua</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, Platform.select({ web: { outlineStyle: 'none' } as any })]}
          placeholder="Cari siswa terblokir..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Memuat Siswa Terkunci...</Text>
        </View>
      ) : students.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.centerContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handlePullToRefresh} />}
        >
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTextHeader}>Semua Aman!</Text>
          <Text style={styles.emptyText}>Tidak ada siswa yang terblokir saat ini.</Text>
        </ScrollView>
      ) : filteredStudents.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Tidak ada siswa terblokir yang cocok dengan pencarian Anda.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.id}
          renderItem={renderStudentItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handlePullToRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    navbar: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      backgroundColor: theme.backgroundElement,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backBtn: {
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    backBtnText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.primary,
    },
    navTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.text,
      fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : undefined,
    },
    refreshBtn: {
      padding: 6,
    },
    refreshBtnText: {
      fontSize: 18,
    },
    actionBanner: {
      flexDirection: 'row',
      gap: 10,
      padding: 16,
      backgroundColor: theme.backgroundElement,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    bannerBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bannerBtnOutline: {
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    bannerBtnOutlineText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.textSecondary,
    },
    bannerBtnUnblock: {
      backgroundColor: theme.success,
    },
    bannerBtnUnblockAll: {
      backgroundColor: theme.danger,
    },
    bannerBtnDisabled: {
      opacity: 0.4,
    },
    bannerBtnText: {
      fontSize: 12,
      fontWeight: '900',
      color: '#FFFFFF',
    },
    searchContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    searchInput: {
      backgroundColor: theme.backgroundElement,
      borderColor: theme.border,
      borderWidth: 1.5,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: theme.text,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
      paddingTop: 8,
    },
    studentCard: {
      backgroundColor: theme.backgroundElement,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    studentCardSelected: {
      borderColor: theme.success,
      borderWidth: 1.5,
      backgroundColor: theme.activeTheme === 'dark' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.02)',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: theme.border,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.background,
    },
    checkboxChecked: {
      backgroundColor: theme.success,
      borderColor: theme.success,
    },
    checkmark: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: 'bold',
    },
    studentInfo: {
      flex: 1,
    },
    studentName: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metaText: {
      fontSize: 11,
      color: theme.textMuted || '#94A3B8',
      fontWeight: '600',
    },
    metaDivider: {
      fontSize: 11,
      color: theme.border,
    },
    singleUnblockBtn: {
      backgroundColor: theme.backgroundSelected,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    singleUnblockBtnText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.success,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: theme.textMuted || '#94A3B8',
      fontWeight: '500',
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 12,
    },
    emptyTextHeader: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 6,
    },
    emptyText: {
      fontSize: 14,
      color: theme.textMuted || '#94A3B8',
      fontWeight: '500',
      textAlign: 'center',
      lineHeight: 20,
    },
  });
