import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Switch,
  Alert,
  TextInput,
  Image,
  ScrollView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DbService, Tenant } from '@/services/supabase';
import { StorageService } from '@/services/storage';
import { useTheme } from '@/hooks/use-theme';
import { useThemeContext } from '@/context/ThemeContext';

export default function SystemSettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { themeSetting, setThemeSetting } = useThemeContext();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const params = useLocalSearchParams();
  const paramGuruId = params.guruId as string;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginMode, setLoginMode] = useState<'simple' | 'login'>('simple');
  const [cheatBlocking, setCheatBlocking] = useState(true);
  const [maxViolations, setMaxViolations] = useState('5');
  
  // School Profile & Branding States
  const [tenantProfile, setTenantProfile] = useState<Tenant | null>(null);
  const [schoolNameInput, setSchoolNameInput] = useState('');
  const [examEventInput, setExamEventInput] = useState('');
  const [logoUrlInput, setLogoUrlInput] = useState('');

  const [updatingMode, setUpdatingMode] = useState(false);
  const [updatingCheat, setUpdatingCheat] = useState(false);
  const [updatingViolations, setUpdatingViolations] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const loadSettings = async () => {
    try {
      console.log('[SystemSettingsScreen] Authenticating user, paramGuruId:', paramGuruId);
      let loggedInGuruId: string | null = paramGuruId;
      
      if (!loggedInGuruId) {
        loggedInGuruId = await AsyncStorage.getItem('@logged_in_guru_id');
        console.log('[SystemSettingsScreen] Retrieved loggedInGuruId from AsyncStorage:', loggedInGuruId);
      } else {
        console.log('[SystemSettingsScreen] Saving @logged_in_guru_id to AsyncStorage:', loggedInGuruId);
        await AsyncStorage.setItem('@logged_in_guru_id', loggedInGuruId);
      }

      if (!loggedInGuruId) {
        console.warn('[SystemSettingsScreen] No guru ID found. Redirecting to login.');
        Alert.alert('Akses Ditolak', 'Sesi Anda telah berakhir. Silakan masuk kembali.');
        router.replace('/teacher/login');
        return;
      }

      const gurus = await DbService.getGuru();
      const currentGuru = gurus.find(g => g.id === loggedInGuruId);
      console.log('[SystemSettingsScreen] Current logged-in guru details:', currentGuru);

      if (!currentGuru || currentGuru.username.toLowerCase() !== 'admin') {
        console.warn('[SystemSettingsScreen] Access denied. User is not admin.');
        Alert.alert('Akses Ditolak', 'Halaman ini hanya dapat diakses oleh Administrator utama.');
        router.replace('/teacher/dashboard');
        return;
      }

      setIsAdmin(true);

      // Fetch configs from Supabase
      const mode = await DbService.getSetting('login_mode');
      setLoginMode(mode as 'simple' | 'login');

      const blockVal = await DbService.getSetting('cheat_blocking_enabled');
      setCheatBlocking(blockVal === 'true');

      const violationsVal = await DbService.getSetting('max_violations');
      setMaxViolations(violationsVal || '5');

      // Fetch school profile branding (SaaS ready)
      const tenant = await DbService.getTenantProfile();
      if (tenant) {
        setTenantProfile(tenant);
        setSchoolNameInput(tenant.name);
        setExamEventInput(tenant.exam_event_title);
        setLogoUrlInput(tenant.logo_url || '');
      }

    } catch (e) {
      console.error('Failed to load system settings:', e);
      Alert.alert('Gagal Memuat Data', 'Tidak dapat memuat konfigurasi dari database Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMaxViolations = async () => {
    const val = parseInt(maxViolations, 10);
    if (isNaN(val) || val < 1 || val > 50) {
      Alert.alert('Batas Tidak Valid', 'Batas toleransi pelanggaran harus berupa angka antara 1 sampai 50.');
      return;
    }

    setUpdatingViolations(true);
    try {
      await DbService.updateSetting('max_violations', String(val));
      await StorageService.cacheMaxViolations(val);
      Alert.alert('Sukses', `Batas toleransi pelanggaran siswa berhasil diubah menjadi ${val} kali.`);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Gagal Menyimpan', err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setUpdatingViolations(false);
    }
  };

  const handleReload = async () => {
    setLoading(true);
    await loadSettings();
  };

  const handlePullToRefresh = async () => {
    setRefreshing(true);
    await loadSettings();
    setRefreshing(false);
  };

  // Authenticate user is admin and load settings
  useEffect(() => {
    loadSettings();
  }, [paramGuruId]);

  const handleToggleLoginMode = async () => {
    const targetMode = loginMode === 'simple' ? 'login' : 'simple';
    const modeTitle = targetMode === 'simple' ? 'Mode Simple (Tabular)' : 'Mode Login (NIS)';
    const alertTitle = 'Ubah Mode Akses Siswa?';
    const alertMessage = `Apakah Anda yakin ingin beralih ke ${modeTitle}? Halaman siswa akan berubah seketika di hari H.`;

    const performToggle = async () => {
      setUpdatingMode(true);
      try {
        await DbService.updateSetting('login_mode', targetMode);
        await StorageService.cacheLoginMode(targetMode);
        setLoginMode(targetMode);
        Alert.alert('Sukses', `Mode akses portal siswa berhasil diubah ke ${modeTitle}.`);
      } catch (err: any) {
        console.error(err);
        Alert.alert('Gagal Mengubah', err.message || 'Terjadi kesalahan jaringan.');
      } finally {
        setUpdatingMode(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`${alertTitle}\n\n${alertMessage}`);
      if (confirmed) {
        await performToggle();
      }
    } else {
      Alert.alert(
        alertTitle,
        alertMessage,
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Ya, Ubah', onPress: performToggle },
        ]
      );
    }
  };

  const handleToggleCheatBlocking = async () => {
    const targetState = !cheatBlocking;
    const stateTitle = targetState ? 'AKTIF (Siswa Keluar App = Blokir)' : 'NONAKTIF (Bebas Keluar App)';
    const alertTitle = targetState ? 'Aktifkan Sistem Blokir?' : 'Nonaktifkan Sistem Blokir?';
    const alertMessage = `Apakah Anda yakin ingin membuat sistem blokir kecurangan menjadi ${stateTitle}? Ini berlaku global untuk seluruh ujian.`;

    const performToggle = async () => {
      setUpdatingCheat(true);
      try {
        const stateStr = targetState ? 'true' : 'false';
        await DbService.updateSetting('cheat_blocking_enabled', stateStr);
        await StorageService.cacheCheatBlocking(targetState);
        setCheatBlocking(targetState);
        Alert.alert('Sukses', `Sistem blokir kecurangan global berhasil diubah ke ${stateTitle}.`);
      } catch (err: any) {
        console.error(err);
        Alert.alert('Gagal Mengubah', err.message || 'Terjadi kesalahan jaringan.');
      } finally {
        setUpdatingCheat(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`${alertTitle}\n\n${alertMessage}`);
      if (confirmed) {
        await performToggle();
      }
    } else {
      Alert.alert(
        alertTitle,
        alertMessage,
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Ya, Ubah', onPress: performToggle },
        ]
      );
    }
  };

  const handleSaveSchoolProfile = async () => {
    if (!schoolNameInput.trim()) {
      Alert.alert('Input Mismatch', 'Nama Sekolah tidak boleh kosong.');
      return;
    }

    if (!examEventInput.trim()) {
      Alert.alert('Input Mismatch', 'Nama Ujian / Acara tidak boleh kosong.');
      return;
    }

    if (!tenantProfile) {
      Alert.alert('Kesalahan Sistem', 'Data profil sekolah tidak terdeteksi.');
      return;
    }

    setSavingProfile(true);
    try {
      const finalLogoUrl = logoUrlInput.trim() || null;
      await DbService.updateTenantProfile(
        tenantProfile.id,
        schoolNameInput.trim(),
        examEventInput.trim(),
        finalLogoUrl
      );

      // Fetch freshly updated profile and update local SWR Cache
      const freshTenant = {
        ...tenantProfile,
        name: schoolNameInput.trim(),
        exam_event_title: examEventInput.trim(),
        logo_url: finalLogoUrl,
      };
      
      setTenantProfile(freshTenant);
      await StorageService.cacheTenant(freshTenant);

      Alert.alert('Sukses', 'Profil & Branding sekolah berhasil disimpan dan akan langsung diterapkan pada portal siswa!');
    } catch (err: any) {
      console.error(err);
      Alert.alert('Gagal Menyimpan', err.message || 'Terjadi masalah koneksi jaringan.');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading || !isAdmin) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Menyiapkan Keamanan Panel...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.activeTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.backgroundElement} />

      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/teacher/dashboard')}>
          <Text style={styles.backButtonText}>◀ Dasbor</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pengaturan Sistem</Text>
        <TouchableOpacity style={styles.reloadButton} onPress={handleReload}>
          <Text style={styles.reloadButtonText}>🔄 Segarkan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullToRefresh}
            tintColor="#3B82F6"
            colors={["#3B82F6"]}
          />
        }
      >
        
        {/* ========================================================
           SECTION 1: SCHOOL PROFILE & BRANDING (SAAS READY)
           ======================================================== */}
        <Text style={styles.subHeader}>PROFIL & BRANDING SEKOLAH</Text>
        <Text style={styles.explanation}>
          Sesuaikan identitas sekolah dan acara ujian untuk mempersonalisasi branding portal siswa di hari H.
        </Text>

        <View style={styles.card}>
          <Text style={styles.inputLabel}>NAMA SEKOLAH</Text>
          <TextInput
            style={styles.textInput}
            value={schoolNameInput}
            onChangeText={setSchoolNameInput}
            placeholder="Contoh: SMKN 1 Bandung"
            placeholderTextColor="#64748B"
          />

          <Text style={styles.inputLabel}>NAMA ACARA UJIAN</Text>
          <TextInput
            style={styles.textInput}
            value={examEventInput}
            onChangeText={setExamEventInput}
            placeholder="Contoh: Ujian Akhir Semester Genap"
            placeholderTextColor="#64748B"
          />

          <Text style={styles.inputLabel}>URL LOGO SEKOLAH (OPSIONAL)</Text>
          <TextInput
            style={styles.textInput}
            value={logoUrlInput}
            onChangeText={setLogoUrlInput}
            placeholder="Contoh: https://link-web-sekolah/logo.png"
            placeholderTextColor="#64748B"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Real-time Branding Live Preview */}
          <Text style={styles.previewHeader}>PRATINJAU TAMPILAN SISWA (LIVE):</Text>
          <View style={styles.previewBox}>
            {logoUrlInput.trim() ? (
              <Image source={{ uri: logoUrlInput.trim() }} style={styles.previewLogo} resizeMode="contain" />
            ) : (
              <View style={styles.previewFallbackLogo}>
                <Text style={styles.previewFallbackLogoText}>
                  {schoolNameInput ? schoolNameInput.split(' ').filter(w => w.length > 0).map(n => n[0]).join('').substring(0, 3).toUpperCase() : 'SCH'}
                </Text>
              </View>
            )}
            <Text style={styles.previewSchoolName}>{schoolNameInput || 'Nama Sekolah'}</Text>
            <Text style={styles.previewExamEvent}>{examEventInput || 'Nama Acara Ujian'}</Text>
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>SEB Secure Mode</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, savingProfile && { opacity: 0.6 }]}
            onPress={handleSaveSchoolProfile}
            disabled={savingProfile}
          >
            {savingProfile ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>💾 SIMPAN PROFIL SEKOLAH</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ========================================================
           SECTION 1.5: SCHOOL LICENSE & BILLING (SAAS READY)
           ======================================================== */}
        <Text style={[styles.subHeader, { marginTop: 15 }]}>STATUS LISENSI &amp; BILLING SEKOLAH</Text>
        <Text style={styles.explanation}>
          Pantau status paket langganan aktif, daur hidup lisensi sekolah, dan riwayat tagihan invoice resmi.
        </Text>

        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 24, marginRight: 12 }}>🧾</Text>
            <View>
              <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800' }}>Detail Tagihan &amp; Invoice</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 2 }}>
                Pengelolaan Riwayat Transaksi Lembaga
              </Text>
            </View>
          </View>

          <Text style={styles.explanation}>
            Klik tombol di bawah untuk menampilkan seluruh detail transaksi pembayaran, tagihan invoice BOS, dan status paket langganan aktif untuk sekolah Anda.
          </Text>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: '#3B82F6', marginTop: 10 }]}
            onPress={() => {
              const { DeviceEventEmitter } = require('react-native');
              DeviceEventEmitter.emit('openBillingModal');
            }}
          >
            <Text style={styles.saveButtonText}>📋 LIHAT DETAIL BILLING &amp; INVOICE</Text>
          </TouchableOpacity>
        </View>

        {/* ========================================================
           SECTION 2: GLOBAL PORTAL ACCESS MODE
           ======================================================== */}
        <Text style={[styles.subHeader, { marginTop: 15 }]}>KONFIGURASI PORTAL GLOBAL</Text>
        
        {/* 1. Portal Access Mode Switch Card */}
        <View style={[styles.card, loginMode === 'simple' ? styles.cardSimple : styles.cardLogin]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardEmoji}>🔑</Text>
            <View style={styles.cardHeaderTexts}>
              <Text style={styles.cardTitle}>Mode Akses Portal Siswa</Text>
              <Text style={styles.cardStatusLabel}>
                STATUS AKTIF: {loginMode === 'simple' ? '⚡ SIMPLE (TABULAR)' : '🔒 LOGIN NIS'}
              </Text>
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchDescription}>
              {loginMode === 'simple'
                ? 'Siswa bebas memilih tingkat & kelas untuk langsung melihat soal. Tanpa NIS. Sangat disarankan untuk kelancaran besok lusa.'
                : 'Siswa wajib memasukkan NIS yang terdaftar di database sebelum dapat melihat jadwal atau soal.'}
            </Text>
            <View style={styles.actionContainer}>
              {updatingMode ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <Switch
                  trackColor={{ false: '#334155', true: '#1E3A8A' }}
                  thumbColor={loginMode === 'simple' ? '#3B82F6' : '#94A3B8'}
                  ios_backgroundColor="#334155"
                  onValueChange={handleToggleLoginMode}
                  value={loginMode === 'simple'}
                />
              )}
            </View>
          </View>
        </View>

        {/* 2. Global Cheat Blocking Switch Card */}
        <View style={[styles.card, cheatBlocking ? styles.cardBlockActive : styles.cardBlockDisabled]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardEmoji}>🛡️</Text>
            <View style={styles.cardHeaderTexts}>
              <Text style={styles.cardTitle}>Sistem Kunci Keamanan Global</Text>
              <Text style={styles.cardStatusLabel}>
                STATUS AKTIF: {cheatBlocking ? '🔴 PENGASWASAN KETAT' : '🟢 BEBAS / UJI COBA'}
              </Text>
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchDescription}>
              {cheatBlocking
                ? 'Jika aktif, siswa yang keluar dari aplikasi (split-screen, buka panel notifikasi, screenshot) saat ujian diset "🔒 Terkunci" akan otomatis diblokir.'
                : 'Jika dinonaktifkan, siswa bebas keluar-masuk aplikasi meskipun ujian diset "🔒 Terkunci". Berguna untuk darurat kompatibilitas.'}
            </Text>
            <View style={styles.actionContainer}>
              {updatingCheat ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Switch
                  trackColor={{ false: '#334155', true: '#991B1B' }}
                  thumbColor={cheatBlocking ? '#EF4444' : '#94A3B8'}
                  ios_backgroundColor="#334155"
                  onValueChange={handleToggleCheatBlocking}
                  value={cheatBlocking}
                />
              )}
            </View>
          </View>
        </View>

        {/* 2.5. Batas Toleransi Pelanggaran Siswa */}
        {cheatBlocking && (
          <View style={[styles.card, { borderColor: theme.warning }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardEmoji}>⚠️</Text>
              <View style={styles.cardHeaderTexts}>
                <Text style={styles.cardTitle}>Toleransi Pelanggaran Siswa</Text>
                <Text style={styles.cardStatusLabel}>
                  BATAS AKTIF: {maxViolations} KALI
                </Text>
              </View>
            </View>

            <Text style={styles.explanation}>
              Siswa diperbolehkan keluar layar ujian sebanyak maksimal batas di bawah ini. Jika melewati batas ini, aplikasi siswa akan terkunci total secara otomatis.
            </Text>

            <Text style={styles.inputLabel}>BATAS MAKSIMAL KELUAR LAYAR (1 - 50)</Text>
            <TextInput
              style={styles.textInput}
              value={maxViolations}
              onChangeText={(text) => setMaxViolations(text.replace(/[^0-9]/g, ''))}
              placeholder="Contoh: 5"
              placeholderTextColor="#64748B"
              keyboardType="number-pad"
            />

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.warning }, updatingViolations && { opacity: 0.6 }]}
              onPress={handleSaveMaxViolations}
              disabled={updatingViolations}
            >
              {updatingViolations ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>⚡ SIMPAN BATAS TOLERANSI</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* 3. Application Color Theme Card */}
        <Text style={[styles.subHeader, { marginTop: 15 }]}>TEMA TAMPILAN APLIKASI</Text>
        <Text style={styles.explanation}>
          Pilih tema tampilan yang paling nyaman untuk mata Anda baik saat siang maupun malam hari.
        </Text>

        <View style={styles.card}>
          <View style={styles.themeOptionsRow}>
            {(['system', 'light', 'dark'] as const).map((mode) => {
              const isActive = themeSetting === mode;
              const modeLabel = mode === 'system' ? '💻 Sistem' : mode === 'light' ? '☀️ Terang' : '🌙 Gelap';
              return (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.themeBtn,
                    isActive && [styles.themeBtnActive, { backgroundColor: theme.primary, borderColor: theme.primary }]
                  ]}
                  onPress={() => setThemeSetting(mode)}
                >
                  <Text style={[
                    styles.themeBtnText,
                    { color: theme.textSecondary },
                    isActive && { color: '#FFF', fontWeight: '800' }
                  ]}>
                    {modeLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    color: theme.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.backgroundElement,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.backgroundSelected,
  },
  backButtonText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  reloadButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.backgroundSelected,
  },
  reloadButtonText: {
    color: theme.success,
    fontSize: 12,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  subHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  explanation: {
    fontSize: 13,
    color: theme.textMuted,
    lineHeight: 18,
    marginBottom: 20,
  },
  card: {
    backgroundColor: theme.backgroundElement,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      web: {
        shadowColor: theme.cardShadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
    }),
    elevation: 3,
    borderColor: theme.border,
  },
  cardSimple: {
    borderColor: theme.primary,
  },
  cardLogin: {
    borderColor: theme.border,
  },
  cardBlockActive: {
    borderColor: theme.danger,
  },
  cardBlockDisabled: {
    borderColor: theme.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 15,
    marginBottom: 15,
  },
  cardEmoji: {
    fontSize: 28,
    marginRight: 15,
  },
  cardHeaderTexts: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 4,
  },
  cardStatusLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.textSecondary,
    letterSpacing: 0.5,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 15,
  },
  switchDescription: {
    flex: 1,
    fontSize: 12,
    color: theme.textSecondary,
    lineHeight: 16,
  },
  actionContainer: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Form elements inside card
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: theme.background,
    borderColor: theme.border,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 15,
    color: theme.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 18,
  },
  saveButton: {
    backgroundColor: theme.success,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 15,
    elevation: 3,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // Real-time branding preview styling
  previewHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.textSecondary,
    marginTop: 10,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  previewBox: {
    backgroundColor: theme.background,
    borderColor: theme.border,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  previewLogo: {
    width: 60,
    height: 60,
    marginBottom: 10,
  },
  previewFallbackLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.backgroundElement,
    borderColor: theme.primary,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  previewFallbackLogoText: {
    color: theme.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  previewSchoolName: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 2,
  },
  previewExamEvent: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  previewBadge: {
    backgroundColor: theme.backgroundElement,
    borderColor: theme.primary,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  previewBadgeText: {
    color: theme.primary,
    fontSize: 9,
    fontWeight: '800',
  },
  // Theme options selector
  themeOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    width: '100%',
  },
  themeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.background,
    alignItems: 'center',
  },
  themeBtnActive: {
    borderWidth: 1.5,
  },
  themeBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
