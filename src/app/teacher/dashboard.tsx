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
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DbService, LinkSoal, Mapel, Kelas, Guru } from '@/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConfirmDialog } from '@/components/admin/AdminComponents';
import { DateTimePicker } from '@/components/admin/DateTimePicker';
import { useTheme } from '@/hooks/use-theme';

export default function TeacherDashboard() {
  const router = useRouter();
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const params = useLocalSearchParams();
  const guruId = params.guruId as string;
  const guruNama = params.guruNama as string;

  const [guruIdState, setGuruIdState] = useState(guruId || '');
  const [guruNamaState, setGuruNamaState] = useState(guruNama || '');
  const [exams, setExams] = useState<LinkSoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinVisible, setPinVisible] = useState(false);
  const [pin, setPin] = useState('••••');
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginMode, setLoginMode] = useState<'simple' | 'login'>('simple');
  const [updatingMode, setUpdatingMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Filter and Pagination states ──
  const [gurusList, setGurusList] = useState<any[]>([]);
  const [selectedGuruFilter, setSelectedGuruFilter] = useState('all');
  const [selectedKelasFilter, setSelectedKelasFilter] = useState('all');
  const [selectedMapelFilter, setSelectedMapelFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // ── Bulk delete state ──
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteVisible, setBulkDeleteVisible] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // ── Edit modal state ──
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingExam, setEditingExam] = useState<LinkSoal | null>(null);
  const [editLink, setEditLink] = useState('');
  const [editTanggal, setEditTanggal] = useState('');
  const [editWaktu, setEditWaktu] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [mapels, setMapels] = useState<Mapel[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [editMapelId, setEditMapelId] = useState('');
  const [editKelasId, setEditKelasId] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // ── DateTime picker state ──
  const [dateTimePickerVisible, setDateTimePickerVisible] = useState(false);

  // ── Delete single confirm ──
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletingSingle, setDeletingSingle] = useState(false);

  const loadDashboardData = async () => {
    try {
      let activeGuruId = guruId || guruIdState;
      let activeGuruNama = guruNama || guruNamaState;

      if (!activeGuruId) {
        const cachedId = await AsyncStorage.getItem('@logged_in_guru_id');
        const cachedNama = await AsyncStorage.getItem('@logged_in_guru_nama');
        if (cachedId) { activeGuruId = cachedId; setGuruIdState(cachedId); }
        if (cachedNama) { activeGuruNama = cachedNama; setGuruNamaState(cachedNama); }
      } else {
        await AsyncStorage.setItem('@logged_in_guru_id', activeGuruId);
        if (activeGuruNama) await AsyncStorage.setItem('@logged_in_guru_nama', activeGuruNama);
      }

      // --- Caching Strategy Opsi B: Cache Versioning ---
      let dbCacheVersion = '1';
      try {
        dbCacheVersion = await DbService.getSetting('cache_version');
      } catch (e) {
        console.warn('[CACHE MANAGER] Failed to fetch cache_version, defaulting to 1', e);
      }

      const localCacheVersion = await AsyncStorage.getItem('@cache_version');
      let gurusListLocal: Guru[] = [];
      let mapelsLocal: Mapel[] = [];
      let kelasListLocal: Kelas[] = [];
      let loadedFromCache = false;

      if (dbCacheVersion && dbCacheVersion === localCacheVersion) {
        try {
          const cachedGurus = await AsyncStorage.getItem('@cached_gurus');
          const cachedMapels = await AsyncStorage.getItem('@cached_mapels');
          const cachedKelas = await AsyncStorage.getItem('@cached_kelas');

          if (cachedGurus && cachedMapels && cachedKelas) {
            gurusListLocal = JSON.parse(cachedGurus);
            mapelsLocal = JSON.parse(cachedMapels);
            kelasListLocal = JSON.parse(cachedKelas);
            loadedFromCache = true;
            console.log('[CACHE MANAGER] Successfully loaded all master data from local cache (version:', dbCacheVersion, ')');
          }
        } catch (err) {
          console.warn('[CACHE MANAGER] Failed to parse cached master data:', err);
        }
      }

      if (!loadedFromCache) {
        console.log('[CACHE MANAGER] Cache miss/stale. Fetching fresh master data from Supabase...');
        try {
          const [freshGurus, freshMapels, freshKelas] = await Promise.all([
            DbService.getGuru(true), // active only
            DbService.getMapel(true), // active only
            DbService.getKelas(undefined, true), // active only
          ]);

          gurusListLocal = freshGurus;
          mapelsLocal = freshMapels;
          kelasListLocal = freshKelas;

          // Save to LocalStorage
          await AsyncStorage.setItem('@cached_gurus', JSON.stringify(freshGurus));
          await AsyncStorage.setItem('@cached_mapels', JSON.stringify(freshMapels));
          await AsyncStorage.setItem('@cached_kelas', JSON.stringify(freshKelas));
          await AsyncStorage.setItem('@cache_version', dbCacheVersion);
          console.log('[CACHE MANAGER] Fresh master data cached successfully (version:', dbCacheVersion, ')');
        } catch (err) {
          console.error('[CACHE MANAGER] Failed to load/cache fresh master data:', err);
          // Fallback if network fails completely and we have some old cache
          try {
            const cachedGurus = await AsyncStorage.getItem('@cached_gurus');
            const cachedMapels = await AsyncStorage.getItem('@cached_mapels');
            const cachedKelas = await AsyncStorage.getItem('@cached_kelas');
            if (cachedGurus) gurusListLocal = JSON.parse(cachedGurus);
            if (cachedMapels) mapelsLocal = JSON.parse(cachedMapels);
            if (cachedKelas) kelasListLocal = JSON.parse(cachedKelas);
          } catch (fallbackErr) {
            console.warn('[CACHE MANAGER] Fallback parser failed:', fallbackErr);
          }
        }
      }

      let isUserAdmin = false;
      const gurus = gurusListLocal;
      setGurusList(gurus);

      if (activeGuruId) {
        const currentGuru = gurus.find(g => g.id === activeGuruId);
        if (currentGuru) {
          setPin(currentGuru.pin_pengawas);
          isUserAdmin = currentGuru.username.toLowerCase() === 'admin';
          setIsAdmin(isUserAdmin);
          if (!activeGuruNama) {
            activeGuruNama = currentGuru.nama_guru;
            setGuruNamaState(currentGuru.nama_guru);
            await AsyncStorage.setItem('@logged_in_guru_nama', currentGuru.nama_guru);
          }
        }
      }

      try {
        const modeVal = await DbService.getSetting('login_mode');
        setLoginMode(modeVal as 'simple' | 'login');
      } catch (err) {
        console.warn('Failed to load login_mode:', err);
      }

      // LinkSoal is dynamic and changes continuously, so we fetch it freshly every time
      const [list] = await Promise.all([
        DbService.getLinkSoal(),
      ]);

      const myExams = isUserAdmin
        ? list
        : activeGuruId
        ? list.filter(exam => exam.guru_id === activeGuruId)
        : list;

      setExams(myExams);
      setMapels(mapelsLocal);
      setKelasList(kelasListLocal);
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleReload = async () => {
    setLoading(true);
    setSelectedIds([]);
    await loadDashboardData();
  };

  const handlePullToRefresh = async () => {
    setRefreshing(true);
    setSelectedIds([]);
    await loadDashboardData();
    setRefreshing(false);
  };

  useEffect(() => { loadDashboardData(); }, [guruId]);

  // ── Toggle checkbox ──
  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // ── Filter and Pagination logic ──
  const filteredExams = React.useMemo(() => {
    let result = [...exams];
    if (selectedGuruFilter && selectedGuruFilter !== 'all') {
      result = result.filter(x => x.guru_id === selectedGuruFilter);
    }
    if (selectedKelasFilter && selectedKelasFilter !== 'all') {
      result = result.filter(x => x.kelas_id === selectedKelasFilter);
    }
    if (selectedMapelFilter && selectedMapelFilter !== 'all') {
      result = result.filter(x => x.mapel_id === selectedMapelFilter);
    }
    return result;
  }, [exams, selectedGuruFilter, selectedKelasFilter, selectedMapelFilter]);

  const totalPages = Math.max(Math.ceil(filteredExams.length / pageSize), 1);

  const paginatedExams = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredExams.slice(startIndex, startIndex + pageSize);
  }, [filteredExams, currentPage]);

  const allSelectedOnPage = paginatedExams.length > 0 && paginatedExams.every(e => selectedIds.includes(e.id));
  const someSelectedOnPage = paginatedExams.some(e => selectedIds.includes(e.id));

  const toggleSelectAll = () => {
    if (allSelectedOnPage) {
      setSelectedIds(prev => prev.filter(id => !paginatedExams.some(e => e.id === id)));
    } else {
      setSelectedIds(prev => {
        const otherPagesSelected = prev.filter(id => !paginatedExams.some(e => e.id === id));
        return [...otherPagesSelected, ...paginatedExams.map(e => e.id)];
      });
    }
  };

  // ── Bulk delete ──
  const handleBulkDelete = async () => {
    setDeletingBulk(true);
    try {
      await Promise.all(selectedIds.map(id => DbService.deleteLinkSoal(id)));
      setExams(prev => prev.filter(e => !selectedIds.includes(e.id)));
      setSelectedIds([]);
      setBulkDeleteVisible(false);
    } catch (e: any) {
      Alert.alert('Gagal', 'Terjadi kesalahan saat menghapus ujian.');
    } finally {
      setDeletingBulk(false);
    }
  };

  // ── Single delete ──
  const handleDeleteSingle = async () => {
    if (!deleteTargetId) return;
    setDeletingSingle(true);
    try {
      await DbService.deleteLinkSoal(deleteTargetId);
      setExams(prev => prev.filter(e => e.id !== deleteTargetId));
      setSelectedIds(prev => prev.filter(id => id !== deleteTargetId));
      setDeleteTargetId(null);
    } catch (e: any) {
      Alert.alert('Gagal', 'Terjadi kesalahan saat menghapus ujian.');
    } finally {
      setDeletingSingle(false);
    }
  };

  // ── Open edit modal ──
  const formatIndonesianDate = (dateStr: string): string => {
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const day = parseInt(parts[2], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[0], 10);
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      return `${day} ${months[monthIdx]} ${year}`;
    } catch { return dateStr; }
  };

  const handleConfirmDateTime = (dateStr: string, timeStr: string) => {
    setEditTanggal(dateStr);
    setEditWaktu(timeStr);
    setDateTimePickerVisible(false);
  };

  const handleOpenEdit = (exam: LinkSoal) => {
    setEditingExam(exam);
    setEditLink(exam.google_form_link || '');
    setEditTanggal(exam.tanggal_ujian || '');
    setEditWaktu((exam.waktu_ujian || '').substring(0, 5));
    setEditIsActive(exam.is_active !== false);
    setEditMapelId(exam.mapel_id || '');
    setEditKelasId(exam.kelas_id || '');
    setEditModalVisible(true);
  };

  // ── Save edit ──
  const handleSaveEdit = async () => {
    if (!editingExam) return;
    if (!editLink || !editTanggal || !editWaktu || !editMapelId || !editKelasId) {
      Alert.alert('Gagal', 'Harap lengkapi semua field.');
      return;
    }
    setSavingEdit(true);
    try {
      await DbService.updateLinkSoal(
        editingExam.id,
        editKelasId,
        editMapelId,
        editingExam.guru_id,
        editTanggal,
        editWaktu.length === 5 ? editWaktu + ':00' : editWaktu,
        editLink,
        editIsActive,
        true
      );
      // Refresh list
      await loadDashboardData();
      setEditModalVisible(false);
      setEditingExam(null);
    } catch (e: any) {
      Alert.alert('Gagal', 'Terjadi kesalahan saat menyimpan perubahan.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleLogout = () => setLogoutVisible(true);

  const toggleLoginMode = async () => {
    if (updatingMode) return;
    setUpdatingMode(true);
    const nextMode = loginMode === 'simple' ? 'login' : 'simple';
    try {
      await DbService.updateSetting('login_mode', nextMode);
      setLoginMode(nextMode);
      Alert.alert(
        'Mode Akses Diperbarui',
        `Mode akses berhasil diubah menjadi: ${nextMode === 'simple' ? 'MODE SIMPLE' : 'MODE LOGIN'}`
      );
    } catch (err: any) {
      Alert.alert('Gagal', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setUpdatingMode(false);
    }
  };

  const allSelected = allSelectedOnPage;
  const someSelected = selectedIds.length > 0;

  // ── Render each exam row ──
  const renderExamItem = ({ item }: { item: LinkSoal }) => {
    const isSelected = selectedIds.includes(item.id);
    return (
      <View style={[styles.examRow, isSelected && styles.examRowSelected]}>
        {/* Checkbox */}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => toggleSelect(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
            {isSelected && <Text style={styles.checkboxTick}>✓</Text>}
          </View>
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.examInfo}>
          <Text style={styles.examName}>{item.mapel_nama || 'Mata Pelajaran'}</Text>
          <Text style={styles.examMeta}>
            Kelas: {item.kelas_nama || 'Semua'}  |  📅 {item.tanggal_ujian}  |  🕒 {item.waktu_ujian.substring(0, 5)}
          </Text>
          <Text style={styles.examLink} numberOfLines={1}>{item.google_form_link}</Text>
        </View>

        {/* Status badge */}
        <View style={[styles.statusBadge, !item.is_active && styles.statusBadgeInactive]}>
          <Text style={[styles.statusText, !item.is_active && styles.statusTextInactive]}>
            {item.is_active ? 'Aktif' : 'Nonaktif'}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionBtns}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => handleOpenEdit(item)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={styles.editBtnText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => setDeleteTargetId(item.id)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={styles.deleteBtnText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.activeTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.backgroundElement} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullToRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.welcomeText}>Selamat Datang,</Text>
            <Text style={styles.guruName} numberOfLines={1}>{guruNamaState || 'Memuat...'}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.reloadButton} onPress={handleReload}>
              <Text style={styles.reloadButtonText}>🔄 Segarkan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Keluar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* PIN Info Card */}
        <View style={styles.pinCard}>
          <Text style={styles.pinTitle}>PIN Pengawas Anda (Buka Kunci HP Siswa):</Text>
          <View style={styles.pinRow}>
            <Text style={styles.pinValue}>{pinVisible ? pin : '••••'}</Text>
            <TouchableOpacity style={styles.pinShowButton} onPress={() => setPinVisible(!pinVisible)}>
              <Text style={styles.pinShowText}>{pinVisible ? 'Sembunyikan' : 'Tampilkan'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.pinHint}>
            PIN ini digunakan untuk membuka layar siswa yang terkunci karena keluar aplikasi.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>MENU UTAMA</Text>

          {!isAdmin && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push({ pathname: '/teacher/create-exam', params: { guruId, guruNama } })}
            >
              <Text style={styles.actionButtonEmoji}>➕</Text>
              <View style={styles.actionButtonTexts}>
                <Text style={styles.actionButtonTitle}>Buat Ujian Baru</Text>
                <Text style={styles.actionButtonSub}>Upload link Google Form untuk kelas</Text>
              </View>
            </TouchableOpacity>
          )}

          {isAdmin && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, { borderLeftWidth: 4, borderLeftColor: theme.success }]}
                onPress={() => router.push({ pathname: '/teacher/manage-data', params: { guruId, guruNama } })}
              >
                <Text style={styles.actionButtonEmoji}>⚙️</Text>
                <View style={styles.actionButtonTexts}>
                  <Text style={styles.actionButtonTitle}>Kelola Data Master</Text>
                  <Text style={styles.actionButtonSub}>CRUD Jurusan, Kelas, Siswa, Guru, &amp; Mapel</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { marginTop: 12, borderLeftWidth: 4, borderLeftColor: theme.primary }]}
                onPress={() => router.push({ pathname: '/teacher/settings', params: { guruId: guruIdState || guruId, guruNama: guruNamaState || guruNama } })}
              >
                <Text style={styles.actionButtonEmoji}>🔧</Text>
                <View style={styles.actionButtonTexts}>
                  <Text style={styles.actionButtonTitle}>Pengaturan Sistem</Text>
                  <Text style={styles.actionButtonSub}>Ubah Mode Login &amp; Sistem Blokir Curang Global</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { marginTop: 12, borderLeftWidth: 4, borderLeftColor: '#8B5CF6' }]}
                onPress={() => router.push({ pathname: '/teacher/login-logs', params: { guruId: guruIdState || guruId, guruNama: guruNamaState || guruNama } })}
              >
                <Text style={styles.actionButtonEmoji}>📊</Text>
                <View style={styles.actionButtonTexts}>
                  <Text style={styles.actionButtonTitle}>Log Aktivitas Siswa</Text>
                  <Text style={styles.actionButtonSub}>Pantau platform login (Web vs Android) siswa secara real-time</Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Exam List Section */}
        <View style={styles.examsSection}>
          {/* Section header with bulk actions */}
          <View style={styles.examsSectionHeader}>
            <Text style={styles.sectionTitle}>
              {isAdmin ? 'DAFTAR SEMUA JADWAL UJIAN' : 'DAFTAR JADWAL UJIAN ANDA'}
            </Text>
            {someSelected && (
              <TouchableOpacity
                style={styles.bulkDeleteButton}
                onPress={() => setBulkDeleteVisible(true)}
              >
                <Text style={styles.bulkDeleteText}>🗑️ Hapus ({selectedIds.length})</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 20 }} />
          ) : exams.length === 0 ? (
            <Text style={styles.emptyText}>Belum ada ujian yang dibuat.</Text>
          ) : (
            <>
              {/* Dropdown Filters (Admin Only) */}
              {isAdmin && (
                <View style={styles.filterContainer}>
                  <Text style={styles.filterTitle}>🔍 Filter Ujian</Text>
                  <View style={styles.filterRow}>
                    {/* Filter Guru */}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.filterLabel}>Guru Pembuat</Text>
                      {Platform.OS === 'web' ? (
                        <select
                          value={selectedGuruFilter}
                          onChange={(e) => {
                            setSelectedGuruFilter(e.target.value);
                            setCurrentPage(1);
                          }}
                          style={{
                            backgroundColor: theme.background, borderColor: theme.border,
                            borderWidth: '1.5px', borderStyle: 'solid', borderRadius: '8px',
                            color: theme.text, padding: '8px 10px', fontSize: '12px',
                            width: '100%', outline: 'none', cursor: 'pointer',
                          } as any}
                        >
                          <option value="all">🌐 Semua Guru</option>
                          {gurusList.map(g => (
                            <option key={g.id} value={g.id}>{g.nama_guru}</option>
                          ))}
                        </select>
                      ) : (
                        <TextInput
                          style={[styles.filterInput, Platform.select({ web: { outlineStyle: 'none' } as any })]}
                          placeholder="Semua Guru"
                          value={selectedGuruFilter}
                          onChangeText={(t) => { setSelectedGuruFilter(t); setCurrentPage(1); }}
                        />
                      )}
                    </View>

                    {/* Filter Kelas */}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.filterLabel}>Target Kelas</Text>
                      {Platform.OS === 'web' ? (
                        <select
                          value={selectedKelasFilter}
                          onChange={(e) => {
                            setSelectedKelasFilter(e.target.value);
                            setCurrentPage(1);
                          }}
                          style={{
                            backgroundColor: theme.background, borderColor: theme.border,
                            borderWidth: '1.5px', borderStyle: 'solid', borderRadius: '8px',
                            color: theme.text, padding: '8px 10px', fontSize: '12px',
                            width: '100%', outline: 'none', cursor: 'pointer',
                          } as any}
                        >
                          <option value="all">🌐 Semua Kelas</option>
                          {kelasList.map(k => (
                            <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                          ))}
                        </select>
                      ) : (
                        <TextInput
                          style={[styles.filterInput, Platform.select({ web: { outlineStyle: 'none' } as any })]}
                          placeholder="Semua Kelas"
                          value={selectedKelasFilter}
                          onChangeText={(t) => { setSelectedKelasFilter(t); setCurrentPage(1); }}
                        />
                      )}
                    </View>

                    {/* Filter Mapel */}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.filterLabel}>Mata Pelajaran</Text>
                      {Platform.OS === 'web' ? (
                        <select
                          value={selectedMapelFilter}
                          onChange={(e) => {
                            setSelectedMapelFilter(e.target.value);
                            setCurrentPage(1);
                          }}
                          style={{
                            backgroundColor: theme.background, borderColor: theme.border,
                            borderWidth: '1.5px', borderStyle: 'solid', borderRadius: '8px',
                            color: theme.text, padding: '8px 10px', fontSize: '12px',
                            width: '100%', outline: 'none', cursor: 'pointer',
                          } as any}
                        >
                          <option value="all">🌐 Semua Mapel</option>
                          {mapels.map(m => (
                            <option key={m.id} value={m.id}>{m.nama_mapel}</option>
                          ))}
                        </select>
                      ) : (
                        <TextInput
                          style={[styles.filterInput, Platform.select({ web: { outlineStyle: 'none' } as any })]}
                          placeholder="Semua Mapel"
                          value={selectedMapelFilter}
                          onChangeText={(t) => { setSelectedMapelFilter(t); setCurrentPage(1); }}
                        />
                      )}
                    </View>
                  </View>
                </View>
              )}

              {filteredExams.length === 0 ? (
                <Text style={styles.emptyText}>Tidak ada jadwal ujian yang cocok dengan filter.</Text>
              ) : (
                <>
                  {/* Select all row */}
                  <TouchableOpacity style={styles.selectAllRow} onPress={toggleSelectAll}>
                    <View style={[styles.checkbox, allSelected && styles.checkboxChecked]}>
                      {allSelected && <Text style={styles.checkboxTick}>✓</Text>}
                      {!allSelected && someSelected && <Text style={styles.checkboxDash}>–</Text>}
                    </View>
                    <Text style={styles.selectAllText}>
                      {allSelected ? 'Batalkan Semua' : someSelected ? `${selectedIds.length} dipilih` : 'Pilih Semua'}
                    </Text>
                  </TouchableOpacity>

                  <FlatList
                    data={paginatedExams}
                    keyExtractor={(item) => item.id}
                    renderItem={renderExamItem}
                    scrollEnabled={false}
                  />

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <View style={styles.paginationRow}>
                      <TouchableOpacity
                        style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                        disabled={currentPage === 1}
                        onPress={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      >
                        <Text style={[styles.pageBtnText, currentPage === 1 && styles.pageBtnTextDisabled]}>◀️ Sebelumnya</Text>
                      </TouchableOpacity>

                      <Text style={styles.pageInfoText}>
                        Halaman {currentPage} dari {totalPages}
                      </Text>

                      <TouchableOpacity
                        style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                        disabled={currentPage === totalPages}
                        onPress={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      >
                        <Text style={[styles.pageBtnText, currentPage === totalPages && styles.pageBtnTextDisabled]}>Selanjutnya ▶️</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* ── Logout confirm ── */}
      <ConfirmDialog
        visible={logoutVisible}
        title="Keluar Panel Guru"
        message="Apakah Anda yakin ingin keluar dari Panel Guru?"
        confirmText="Keluar"
        cancelText="Batal"
        onConfirm={async () => {
          setLogoutVisible(false);
          await AsyncStorage.removeItem('@logged_in_guru_id');
          await AsyncStorage.removeItem('@logged_in_guru_nama');
          router.replace('/');
        }}
        onCancel={() => setLogoutVisible(false)}
      />

      {/* DateTime Picker Modal */}
      <DateTimePicker
        visible={dateTimePickerVisible}
        onClose={() => setDateTimePickerVisible(false)}
        onConfirm={handleConfirmDateTime}
        currentDate={editTanggal}
        currentTime={editWaktu}
      />

      {/* ── Bulk delete confirm ── */}
      <ConfirmDialog
        visible={bulkDeleteVisible}
        title="Hapus Ujian Terpilih"
        message={`Hapus ${selectedIds.length} jadwal ujian? Tindakan ini tidak dapat dibatalkan.`}
        confirmText={deletingBulk ? 'Menghapus...' : 'Hapus'}
        cancelText="Batal"
        onConfirm={handleBulkDelete}
        onCancel={() => !deletingBulk && setBulkDeleteVisible(false)}
        disabled={deletingBulk}
      />

      {/* ── Single delete confirm ── */}
      <ConfirmDialog
        visible={!!deleteTargetId}
        title="Hapus Ujian"
        message="Hapus jadwal ujian ini? Tindakan ini tidak dapat dibatalkan."
        confirmText={deletingSingle ? 'Menghapus...' : 'Hapus'}
        cancelText="Batal"
        onConfirm={handleDeleteSingle}
        onCancel={() => !deletingSingle && setDeleteTargetId(null)}
        disabled={deletingSingle}
      />

      {/* ── Edit Modal ── */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalCard}>
            {/* Header */}
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>✏️ Edit Jadwal Ujian</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.editModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.editModalBody}>
              {/* Mata Pelajaran */}
              <Text style={styles.editLabel}>Mata Pelajaran</Text>
              {Platform.OS === 'web' ? (
                <div style={{ marginBottom: 12 }}>
                  <select
                    value={editMapelId}
                    onChange={(e) => setEditMapelId(e.target.value)}
                    style={{
                      backgroundColor: theme.background, borderColor: theme.border,
                      borderWidth: '1.5px', borderStyle: 'solid', borderRadius: '10px',
                      color: theme.text, padding: '10px 14px', fontSize: '14px',
                      width: '100%', outline: 'none', cursor: 'pointer',
                    } as any}
                  >
                    <option value="">Pilih Mapel</option>
                    {mapels.map(m => (
                      <option key={m.id} value={m.id}>{m.nama_mapel} ({m.singkatan})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {mapels.map(m => (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.chipOption, editMapelId === m.id && styles.chipOptionActive]}
                        onPress={() => setEditMapelId(m.id)}
                      >
                        <Text style={[styles.chipOptionText, editMapelId === m.id && styles.chipOptionTextActive]}>
                          {m.nama_mapel}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}

              {/* Kelas */}
              <Text style={styles.editLabel}>Kelas</Text>
              {Platform.OS === 'web' ? (
                <div style={{ marginBottom: 12 }}>
                  <select
                    value={editKelasId}
                    onChange={(e) => setEditKelasId(e.target.value)}
                    style={{
                      backgroundColor: theme.background, borderColor: theme.border,
                      borderWidth: '1.5px', borderStyle: 'solid', borderRadius: '10px',
                      color: theme.text, padding: '10px 14px', fontSize: '14px',
                      width: '100%', outline: 'none', cursor: 'pointer',
                    } as any}
                  >
                    <option value="">Pilih Kelas</option>
                    {kelasList.map(k => (
                      <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {kelasList.map(k => (
                      <TouchableOpacity
                        key={k.id}
                        style={[styles.chipOption, editKelasId === k.id && styles.chipOptionActive]}
                        onPress={() => setEditKelasId(k.id)}
                      >
                        <Text style={[styles.chipOptionText, editKelasId === k.id && styles.chipOptionTextActive]}>
                          {k.nama_kelas}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}

              {/* Link Google Form */}
              <Text style={styles.editLabel}>Link Google Form</Text>
              <TextInput
                style={[styles.editInput, Platform.select({ web: { outlineStyle: 'none' } as any })]}
                value={editLink}
                onChangeText={setEditLink}
                placeholder="https://docs.google.com/forms/..."
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                keyboardType="url"
              />

              {/* Tanggal */}
              <Text style={styles.editLabel}>Tanggal Ujian</Text>
              {Platform.OS === 'web' ? (
                <div style={{ marginBottom: 8 }}>
                  <input
                    type="date"
                    value={editTanggal}
                    onChange={(e) => setEditTanggal(e.target.value)}
                    style={{
                      backgroundColor: theme.background, borderColor: theme.border,
                      borderWidth: '1.5px', borderStyle: 'solid', borderRadius: '10px',
                      color: theme.text, padding: '10px 14px', fontSize: '14px',
                      width: '100%', outline: 'none', boxSizing: 'border-box',
                      cursor: 'pointer', colorScheme: theme.activeTheme === 'dark' ? 'dark' : 'light',
                    } as any}
                  />
                </div>
              ) : (
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => setDateTimePickerVisible(true)}
                >
                  <Text style={styles.pickerBtnText}>
                    📅 {editTanggal ? formatIndonesianDate(editTanggal) : 'Pilih Tanggal'}
                  </Text>
                  <Text style={styles.pickerBtnArrow}>▼</Text>
                </TouchableOpacity>
              )}

              {/* Waktu */}
              <Text style={styles.editLabel}>Waktu Ujian</Text>
              {Platform.OS === 'web' ? (
                <div style={{ marginBottom: 8 }}>
                  <input
                    type="time"
                    value={editWaktu}
                    onChange={(e) => setEditWaktu(e.target.value)}
                    style={{
                      backgroundColor: theme.background, borderColor: theme.border,
                      borderWidth: '1.5px', borderStyle: 'solid', borderRadius: '10px',
                      color: theme.text, padding: '10px 14px', fontSize: '14px',
                      width: '100%', outline: 'none', boxSizing: 'border-box',
                      cursor: 'pointer', colorScheme: theme.activeTheme === 'dark' ? 'dark' : 'light',
                    } as any}
                  />
                </div>
              ) : (
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => setDateTimePickerVisible(true)}
                >
                  <Text style={styles.pickerBtnText}>
                    🕒 {editWaktu ? editWaktu.substring(0, 5) : 'Pilih Waktu'}
                  </Text>
                  <Text style={styles.pickerBtnArrow}>▼</Text>
                </TouchableOpacity>
              )}

              {/* Status aktif */}
              <Text style={styles.editLabel}>Status</Text>
              <View style={styles.statusToggleRow}>
                <TouchableOpacity
                  style={[styles.statusToggleBtn, editIsActive && styles.statusToggleBtnActive]}
                  onPress={() => setEditIsActive(true)}
                >
                  <Text style={[styles.statusToggleText, editIsActive && styles.statusToggleTextActive]}>
                    ✅ Aktif
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusToggleBtn, !editIsActive && styles.statusToggleBtnInactive]}
                  onPress={() => setEditIsActive(false)}
                >
                  <Text style={[styles.statusToggleText, !editIsActive && styles.statusToggleTextInactive]}>
                    ❌ Nonaktif
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Footer buttons */}
            <View style={styles.editModalFooter}>
              <TouchableOpacity
                style={styles.cancelEditBtn}
                onPress={() => setEditModalVisible(false)}
                disabled={savingEdit}
              >
                <Text style={styles.cancelEditText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveEditBtn, savingEdit && styles.saveEditBtnDisabled]}
                onPress={handleSaveEdit}
                disabled={savingEdit}
              >
                {savingEdit
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={styles.saveEditText}>Simpan Perubahan</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  filterContainer: {
    backgroundColor: theme.background, borderRadius: 12, padding: 12,
    marginBottom: 15, borderWidth: 1, borderColor: theme.border,
  },
  filterTitle: { color: theme.text, fontSize: 13, fontWeight: '800', marginBottom: 8 },
  filterRow: { flexDirection: 'row', gap: 10 },
  filterLabel: { color: theme.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  filterInput: {
    backgroundColor: theme.backgroundElement, borderColor: theme.border,
    borderWidth: 1, borderRadius: 8, padding: 6, fontSize: 12, color: theme.text
  },
  paginationRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 15, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border,
  },
  pageBtn: {
    backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border,
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8,
  },
  pageBtnDisabled: { backgroundColor: theme.border, borderColor: theme.border },
  pageBtnText: { color: theme.primary, fontSize: 12, fontWeight: '700' },
  pageBtnTextDisabled: { color: theme.textMuted },
  pageInfoText: { color: theme.text, fontSize: 12, fontWeight: '700' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  welcomeText: { color: theme.textSecondary, fontSize: 14, fontWeight: '600' },
  guruName: { color: theme.text, fontSize: 20, fontWeight: '800' },
  logoutButton: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(220, 38, 38, 0.08)',
    borderColor: theme.danger,
    borderWidth: 1, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8,
  },
  reloadButton: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(37, 99, 230, 0.08)',
    borderColor: theme.primary,
    borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  reloadButtonText: { color: theme.primary, fontSize: 12, fontWeight: '700' },
  logoutText: { color: theme.danger, fontSize: 12, fontWeight: '700' },

  pinCard: {
    backgroundColor: theme.backgroundElement, borderRadius: 20, padding: 20,
    marginBottom: 25, borderLeftWidth: 4, borderLeftColor: theme.primary,
    borderWidth: 1, borderColor: theme.border,
  },
  pinTitle: { color: theme.textSecondary, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 },
  pinRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  pinValue: { color: theme.text, fontSize: 28, fontWeight: '900', letterSpacing: 4 },
  pinShowButton: {
    backgroundColor: theme.background, paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 8, borderWidth: 1, borderColor: theme.border,
  },
  pinShowText: { color: theme.primary, fontSize: 12, fontWeight: '700' },
  pinHint: { color: theme.textMuted, fontSize: 12, lineHeight: 16 },

  actionSection: { marginBottom: 25 },
  sectionTitle: { color: theme.textSecondary, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  actionButton: {
    backgroundColor: theme.backgroundElement, borderRadius: 20, padding: 20,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.border,
  },
  actionButtonEmoji: { fontSize: 28, marginRight: 15 },
  actionButtonTexts: { flex: 1 },
  actionButtonTitle: { color: theme.text, fontSize: 16, fontWeight: '800', marginBottom: 2 },
  actionButtonSub: { color: theme.textSecondary, fontSize: 12, fontWeight: '500' },

  // ── Exam list ──
  examsSection: {
    backgroundColor: theme.backgroundElement, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: theme.border,
  },
  examsSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  bulkDeleteButton: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(220, 38, 38, 0.08)',
    borderColor: theme.danger,
    borderWidth: 1, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8,
  },
  bulkDeleteText: { color: theme.danger, fontSize: 12, fontWeight: '700' },

  selectAllRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: theme.border, marginBottom: 4,
  },
  selectAllText: { color: theme.textSecondary, fontSize: 13, fontWeight: '600', marginLeft: 10 },

  // ── Row ──
  examRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  examRowSelected: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(59,130,246,0.07)' : 'rgba(37, 99, 230, 0.05)',
    borderRadius: 8,
  },

  // ── Checkbox ──
  checkboxContainer: { marginRight: 10, padding: 2 },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 2,
    borderColor: theme.border, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: { backgroundColor: theme.primary, borderColor: theme.primary },
  checkboxTick: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  checkboxDash: { color: '#FFF', fontSize: 14, fontWeight: '800' },

  examInfo: { flex: 1, marginRight: 8 },
  examName: { color: theme.text, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  examMeta: { color: theme.primary, fontSize: 11, fontWeight: '700', marginTop: 2, marginBottom: 3 },
  examLink: { color: theme.textMuted, fontSize: 11 },

  statusBadge: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(16,185,129,0.1)' : 'rgba(5, 150, 105, 0.08)',
    borderColor: theme.success,
    borderWidth: 1, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6, marginRight: 6,
  },
  statusBadgeInactive: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(239,68,68,0.1)' : 'rgba(220, 38, 38, 0.08)',
    borderColor: theme.danger,
  },
  statusText: { color: theme.success, fontSize: 10, fontWeight: '700' },
  statusTextInactive: { color: theme.danger },

  actionBtns: { flexDirection: 'column', gap: 4 },
  editBtn: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(59,130,246,0.15)' : 'rgba(37, 99, 230, 0.08)',
    borderRadius: 6,
    padding: 5, alignItems: 'center', justifyContent: 'center',
  },
  editBtnText: { fontSize: 14 },
  deleteBtn: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(239,68,68,0.15)' : 'rgba(220, 38, 38, 0.08)',
    borderRadius: 6,
    padding: 5, alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 14 },

  emptyText: { color: theme.textMuted, fontSize: 14, textAlign: 'center', marginTop: 10 },

  // ── Edit Modal ──
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  editModalCard: {
    backgroundColor: theme.backgroundElement, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%', paddingBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.2, shadowRadius: 15, elevation: 10,
    borderWidth: 1, borderColor: theme.border,
  },
  editModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  editModalTitle: { color: theme.text, fontSize: 17, fontWeight: '800' },
  editModalClose: { color: theme.textMuted, fontSize: 20, fontWeight: '700', paddingHorizontal: 6 },
  editModalBody: { paddingHorizontal: 20, paddingTop: 16 },
  editLabel: {
    color: theme.textSecondary, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', marginBottom: 6, marginTop: 12,
  },
  editInput: {
    backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1.5,
    borderRadius: 10, paddingVertical: 11, paddingHorizontal: 14,
    color: theme.text, fontSize: 14, fontWeight: '600', marginBottom: 4,
  },
  chipOption: {
    backgroundColor: theme.background, borderWidth: 1.5, borderColor: theme.border,
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12,
  },
  chipOptionActive: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(59,130,246,0.2)' : 'rgba(37, 99, 230, 0.08)',
    borderColor: theme.primary,
  },
  chipOptionText: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
  chipOptionTextActive: { color: theme.primary },
  statusToggleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statusToggleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
    borderColor: theme.border, alignItems: 'center', backgroundColor: theme.background,
  },
  statusToggleBtnActive: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(16,185,129,0.15)' : 'rgba(5, 150, 105, 0.08)',
    borderColor: theme.success,
  },
  statusToggleBtnInactive: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(239,68,68,0.15)' : 'rgba(220, 38, 38, 0.08)',
    borderColor: theme.danger,
  },
  statusToggleText: { color: theme.textSecondary, fontSize: 13, fontWeight: '700' },
  statusToggleTextActive: { color: theme.success },
  statusToggleTextInactive: { color: theme.danger },
  editModalFooter: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: theme.border,
  },
  cancelEditBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5,
    borderColor: theme.border, alignItems: 'center', backgroundColor: theme.background,
  },
  cancelEditText: { color: theme.textSecondary, fontSize: 15, fontWeight: '700' },
  saveEditBtn: {
    flex: 2, paddingVertical: 13, borderRadius: 12,
    backgroundColor: theme.primary, alignItems: 'center',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveEditBtnDisabled: {
    backgroundColor: theme.activeTheme === 'dark' ? '#1E3A5F' : '#93C5FD',
    shadowOpacity: 0, elevation: 0,
  },
  saveEditText: { color: '#FFF', fontSize: 15, fontWeight: '800' },

  // ── Picker button (date/time) ──
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1.5,
    borderRadius: 10, paddingVertical: 11, paddingHorizontal: 14, marginBottom: 4,
  },
  pickerBtnText: { color: theme.text, fontSize: 14, fontWeight: '600', flex: 1 },
  pickerBtnArrow: { color: theme.textMuted, fontSize: 11 },

  // ── Picker Modals ──
  pickerModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  pickerModalCard: {
    width: '100%', maxWidth: 380, backgroundColor: theme.backgroundElement,
    borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
    borderWidth: 1, borderColor: theme.border,
  },
  pickerModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomColor: theme.border, borderBottomWidth: 1,
  },
  pickerModalTitle: { color: theme.text, fontSize: 16, fontWeight: '700' },
  pickerModalFooter: {
    flexDirection: 'row', gap: 12, padding: 16,
    borderTopWidth: 1, borderTopColor: theme.border,
  },
  pickerSubLabel: {
    color: theme.textSecondary, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', marginTop: 14, marginBottom: 8,
    marginHorizontal: 16,
  },
  pickerYearRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  pickerYearBtn: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8,
    backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border,
  },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  pickerMonthBtn: {
    width: 56, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
    backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border,
  },
  pickerDayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingBottom: 16 },
  pickerDayBtn: {
    width: 40, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border,
  },
  pickerBtnActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  pickerBtnTxt: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
  pickerBtnTxtActive: { color: '#FFF', fontWeight: '800' },
  timePreview: {
    alignItems: 'center', paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.border, marginBottom: 4,
  },
  timePreviewText: { color: theme.primary, fontSize: 28, fontWeight: '900', letterSpacing: 2 },

  // Unused legacy styles kept for TS compat
  modeCard: { backgroundColor: theme.backgroundElement, borderRadius: 20, padding: 20, marginBottom: 25, borderLeftWidth: 4, borderColor: theme.border, borderWidth: 1 },
  modeCardSimple: { borderLeftColor: theme.success },
  modeCardLogin: { borderLeftColor: theme.primary },
  modeCardTitle: { color: theme.textSecondary, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12 },
  modeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 },
  modeDetails: { flex: 1, minWidth: 150 },
  modeStatusLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '800', marginBottom: 4 },
  modeBadge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' },
  modeBadgeSimple: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  modeBadgeLogin: { backgroundColor: 'rgba(139, 92, 246, 0.15)' },
  modeBadgeText: { fontSize: 11, fontWeight: '800', color: '#FFF' },
  modeSwitchButton: { backgroundColor: theme.background, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: theme.border, minWidth: 150, alignItems: 'center', justifyContent: 'center' },
  modeSwitchButtonText: { color: theme.primary, fontSize: 11, fontWeight: '800' },
  modeHint: { color: theme.textMuted, fontSize: 11, lineHeight: 16 },
});
