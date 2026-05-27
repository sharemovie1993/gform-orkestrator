import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
  StatusBar,
  TextInput,
  Platform,
  Image,
  Alert,
  RefreshControl,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DbService, Jurusan, Kelas, Siswa, isSupabaseConfigured, supabase } from '@/services/supabase';
import { StorageService } from '@/services/storage';
import { useTheme } from '@/hooks/use-theme';
import { LicenseBlocker } from '../utils/LicenseBlocker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  // Animated values for premium entry transitions
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  // Student Login States
  const [studentSession, setStudentSession] = useState<Siswa | null>(null);
  const [activeTab, setActiveTab] = useState<'student' | 'guest'>('student');
  const [nisn, setNisn] = useState('');
  const [isNisnFocused, setIsNisnFocused] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [downloadCount, setDownloadCount] = useState<number | null>(null);

  // System mode setting
  const [loginMode, setLoginMode] = useState<'simple' | 'login'>('simple');
  // Simple Mode selections
  const [activeTingkatTab, setActiveTingkatTab] = useState<'X' | 'XI' | 'XII'>('XII');
  const [classSearchQuery, setClassSearchQuery] = useState('');

  // Selections (Guest Mode / Fallback)
  const [kelasList, setKelasList] = useState<Kelas[]>([]);

  // Cached Class (Guest Mode)
  const [cachedClass, setCachedClass] = useState<{ id: string; name: string } | null>(null);

  // Loading state
  const [loading, setLoading] = useState(true);

  // Navigation lock (Double-tap protection)
  const [isNavigating, setIsNavigating] = useState(false);

  // School Profile & Branding States
  const [schoolName, setSchoolName] = useState('SMK Negeri 1 G-Form');
  const [examEvent, setExamEvent] = useState('Ujian Akhir Semester Genap');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Student selection in simple mode states
  const [studentModalVisible, setStudentModalVisible] = useState(false);
  const [selectedClassForStudentList, setSelectedClassForStudentList] = useState<{ id: string; name: string } | null>(null);
  const [classStudents, setClassStudents] = useState<Siswa[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  const [refreshing, setRefreshing] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  // Tenant Domain States (Mobile)
  const [showDomainInput, setShowDomainInput] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [domainError, setDomainError] = useState('');
  const [domainLoading, setDomainLoading] = useState(false);

  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const checkDatabaseConnection = async () => {
    setConnectionStatus('checking');
    setConnectionError(null);
    try {
      const { isSupabaseConfigured: currentConfigured, supabase: currentSupabase } = require('@/services/supabase');
      if (!currentConfigured || !currentSupabase) {
        throw new Error('Supabase URL atau Anon Key tidak terkonfigurasi di bundel aplikasi.');
      }
      
      const { data, error } = await currentSupabase
        .from('tenants')
        .select('id')
        .limit(1);

      if (error) {
        throw error;
      }

      setConnectionStatus('connected');
    } catch (err: any) {
      console.warn('Database ping failed:', err);
      setConnectionStatus('error');
      setConnectionError(err.message || 'Gagal terhubung ke database. Periksa jaringan.');
    }
  };

  const handleManualCheckUpdate = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Pembaruan', 'Pembaruan OTA hanya didukung pada aplikasi mobile Android/iOS.');
      return;
    }
    
    setCheckingUpdate(true);
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert(
          'Pembaruan Ditemukan',
          'Versi baru terdeteksi di server. Mulai mengunduh pembaruan sekarang...',
          [{ text: 'Unduh & Terapkan', onPress: async () => {
            try {
              setCheckingUpdate(true);
              await Updates.fetchUpdateAsync();
              Alert.alert(
                'Sukses',
                'Pembaruan berhasil diunduh. Aplikasi akan dimuat ulang sekarang.',
                [{ text: 'Muat Ulang', onPress: async () => {
                  await Updates.reloadAsync();
                }}]
              );
            } catch (err: any) {
              Alert.alert('Gagal Mengunduh', err.message || 'Koneksi bermasalah saat mengunduh pembaruan.');
            } finally {
              setCheckingUpdate(false);
            }
          }}]
        );
      } else {
        Alert.alert(
          'Aplikasi Terbaru',
          'Aplikasi Anda sudah menggunakan versi terbaru dan paling mutakhir.',
          [{ text: 'OK' }]
        );
      }
    } catch (err: any) {
      console.warn('Gagal memeriksa pembaruan:', err);
      Alert.alert(
        'Koneksi Gagal',
        'Tidak dapat memeriksa pembaruan. Silakan periksa koneksi internet Anda.',
        [{ text: 'OK' }]
      );
    } finally {
      setCheckingUpdate(false);
    }
  };

  const initApp = async () => {
    setIsNavigating(false); // Reset lock on mount

    // SaaS Multi-Tenancy Dynamic Tenant Routing
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const hostname = window.location.hostname;
        const searchParams = new URLSearchParams(window.location.search);
        const tenantParam = searchParams.get('tenant');
        
        let slug = '';
        if (tenantParam) {
          slug = tenantParam.trim();
        } else {
          const parts = hostname.split('.');
          // Support wildcard subdomains (e.g. smkn1pld.absenta.id)
          if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'api' && parts[0] !== 'localhost') {
            slug = parts[0];
          }
        }
        if (!slug && (hostname === 'absenta.id' || hostname === 'www.absenta.id')) {
          console.log('[Tenant Routing] Direct portal access detected. Redirecting to landing page...');
          window.location.replace('/landing.html');
          return;
        }
        if (slug) {
          console.log('[Tenant Routing] Detected school slug:', slug);
          const tenant = await DbService.getTenantProfileBySlug(slug);
          if (tenant) {
            console.log('[Tenant Routing] Setting active tenant ID:', tenant.id, 'for school:', tenant.name);
            const { setActiveTenantId, initializeDynamicSupabase } = require('@/services/supabase');
            setActiveTenantId(tenant.id);

            if (tenant.supabase_url && tenant.supabase_anon_key) {
              console.log('[Tenant Routing] Re-initializing dynamic Supabase client for private database:', tenant.name);
              initializeDynamicSupabase(tenant.supabase_url, tenant.supabase_anon_key);
            } else {
              console.log('[Tenant Routing] Using shared database for tenant:', tenant.name);
              // Ensure dynamic Supabase points to master database and reset previous private clients
              initializeDynamicSupabase('https://xjnctgbzilrhbzsbrtpu.supabase.co', 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg');
            }
          } else {
            console.warn('[Tenant Routing] Tenant profile not found for slug:', slug);
          }
        }
      } catch (err) {
        console.error('[Tenant Routing] Failed to parse or route tenant:', err);
      }
    }

    checkDatabaseConnection();
    
    // Platform Mobile Domain Restriction Check
    if (Platform.OS !== 'web') {
      try {
        const savedDomain = await StorageService.getSavedDomain();
        if (!savedDomain) {
          setShowDomainInput(true);
          setLoading(false);
          return;
        } else {
          setShowDomainInput(false);
          // Set active tenant ID dynamically based on saved domain
          let cleanDomain = savedDomain.replace(/(^\w+:|^)\/\//, '').trim();
          const parts = cleanDomain.split('.');
          let slug = parts[0];
          
          const tenant = await DbService.getTenantProfileBySlug(slug);
          if (tenant) {
            const { setActiveTenantId } = require('@/services/supabase');
            setActiveTenantId(tenant.id);
          }
        }
      } catch (err) {
        console.warn('Failed to verify saved domain on startup:', err);
      }
    }

    // 1. Check if blocked
    const blocked = await StorageService.isBlocked();
    if (blocked) {
      router.replace('/blocked');
      return;
    }

    // 2. Load student session if logged in
    const savedStudent = await StorageService.getStudentSession();
    if (savedStudent) {
      setStudentSession(savedStudent);
      // Bind active tenant ID
      const { setActiveTenantId } = require('@/services/supabase');
      setActiveTenantId(savedStudent.tenant_id);

      // Auto-redirect directly to exam list to bypass intermediate portal and prevent accidental logout
      router.replace({
        pathname: '/exam-list',
        params: { kelasId: savedStudent.kelas_id, kelasName: savedStudent.kelas_nama || 'Kelas' },
      });
      return;
    }

    // 3. Fetch fresh tenant profile and configuration in background
    try {
      // Fetch school/tenant branding
      try {
        const tenant = await DbService.getTenantProfile();
        if (tenant) {
          setSchoolName(tenant.name);
          setExamEvent(tenant.exam_event_title);
          setLogoUrl(tenant.logo_url);
          await StorageService.cacheTenant(tenant);
        }
      } catch (tenantErr) {
        console.warn('Could not load school profile branding:', tenantErr);
      }

      // If student is logged in, sync tenant-specific configurations
      if (savedStudent) {
        try {
          const blockVal = await DbService.getSetting('cheat_blocking_enabled');
          await StorageService.cacheCheatBlocking(blockVal === 'true');
        } catch (blockError) {
          console.warn('Could not load global cheat blocking configuration:', blockError);
        }
      }
    } catch (e) {
      console.error('Failed to load initial welcome screen data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleReload = async () => {
    setLoading(true);
    await initApp();
  };

  const handlePullToRefresh = async () => {
    setRefreshing(true);
    await initApp();
    setRefreshing(false);
  };

  const handleSaveDomain = async () => {
    if (!domainInput.trim()) {
      setDomainError('Alamat domain sekolah tidak boleh kosong.');
      return;
    }

    setDomainLoading(true);
    setDomainError('');

    try {
      // Bersihkan domain input dari http/https dan slashes
      let cleanDomain = domainInput.replace(/(^\w+:|^)\/\//, '').trim().toLowerCase();
      const parts = cleanDomain.split('.');
      let slug = parts[0]; // e.g. 'smkn1pld' dari 'smkn1pld.absenta.id'

      console.log('[Domain Validation] Checking slug:', slug);
      const tenant = await DbService.getTenantProfileBySlug(slug);
      
      if (tenant) {
        // Simpan domain terpilih
        await StorageService.saveSavedDomain(cleanDomain);
        
        // Bind tenant ID secara dinamis
        const { setActiveTenantId } = require('@/services/supabase');
        setActiveTenantId(tenant.id);
        
        // Reset status input dan refresh data
        setShowDomainInput(false);
        setLoading(true);
        await initApp();
      } else {
        setDomainError('Domain sekolah tidak terdaftar atau tidak aktif. Periksa kembali ejaannya.');
      }
    } catch (err: any) {
      console.warn('Gagal memverifikasi domain:', err);
      setDomainError('Gagal memvalidasi domain. Pastikan Anda terhubung ke internet.');
    } finally {
      setDomainLoading(false);
    }
  };

  const handleResetDomain = async () => {
    Alert.alert(
      'Ganti Sekolah',
      'Apakah Anda yakin ingin memutus koneksi dan mengganti sekolah/domain Anda?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Ganti',
          style: 'destructive',
          onPress: async () => {
            await StorageService.clearSavedDomain();
            const { setActiveTenantId } = require('@/services/supabase');
            setActiveTenantId(null);
            setDomainInput('');
            setShowDomainInput(true);
          }
        }
      ]
    );
  };

  useEffect(() => {
    initApp();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Ambil data jumlah unduhan APK secara dinamis dari API (Khusus platform Web)
  useEffect(() => {
    if (Platform.OS === 'web') {
      fetch('https://api.absenta.id/api/license/download-stats')
        .then(res => res.json())
        .then(data => {
          if (data.success && typeof data.download_count === 'number') {
            setDownloadCount(data.download_count);
          }
        })
        .catch(err => console.warn('Gagal memuat statistik unduhan:', err));
    }
  }, []);

  // Check for OTA Updates on mount (for production release)
  useEffect(() => {
    const checkOtaUpdates = async () => {
      if (Platform.OS === 'web' || __DEV__) return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          // Fetch the update
          await Updates.fetchUpdateAsync();
          // Alert and force reload
          Alert.alert(
            'Pembaruan Aplikasi',
            'Sistem mendeteksi pembaruan baru. Aplikasi akan dimuat ulang untuk menerapkan pembaruan.',
            [
              {
                text: 'OK',
                onPress: async () => {
                  await Updates.reloadAsync();
                },
              },
            ],
            { cancelable: false }
          );
        }
      } catch (err) {
        console.warn('Gagal memeriksa update otomatis:', err);
      }
    };

    checkOtaUpdates();
  }, []);

  // Filter classes based on Tab and Search Query (Memoized for peak low-end device performance)
  const filteredClassesForSimpleMode = React.useMemo(() => {
    return kelasList.filter((k) => {
      // Filter by active tingkat tab
      const matchesTingkat = k.tingkat && k.tingkat.trim().toUpperCase() === activeTingkatTab;
      
      // Filter by search query (case-insensitive)
      const matchesQuery = classSearchQuery.trim() === '' 
        || (k.nama_kelas && k.nama_kelas.toLowerCase().includes(classSearchQuery.toLowerCase()))
        || (k.jurusan_nama && k.jurusan_nama.toLowerCase().includes(classSearchQuery.toLowerCase()));
        
      return matchesTingkat && matchesQuery;
    });
  }, [kelasList, activeTingkatTab, classSearchQuery]);

  const checkAndActivateLicenseForStudent = async (student: any): Promise<boolean> => {
    try {
      const tenantId = student.tenant_id;
      if (!tenantId) {
        console.warn('[License Activation] Student does not have a tenant_id. Skipping license validation.');
        return true;
      }

      const { setActiveTenantId } = require('@/services/supabase');
      setActiveTenantId(tenantId);

      const tenant = await DbService.getTenantProfile();
      if (!tenant) {
        throw new Error('Profil sekolah Anda tidak ditemukan di database.');
      }

      const { initializeDynamicSupabase } = require('@/services/supabase');
      const tenantData: any = tenant;
      if (tenantData.supabase_url && tenantData.supabase_anon_key) {
        initializeDynamicSupabase(tenantData.supabase_url, tenantData.supabase_anon_key);
      }

      // Skip license activation and blocking check for universal login
      console.log('[Background Licensing] Universal login active, bypassing blocking license verification.');
      return true;
    } catch (err: any) {
      console.warn('[Background Licensing] Activation check failed:', err.message);
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('@license_token');
      await StorageService.clearStudentSession();
      throw err;
    }
  };

  const handleStudentLogin = async () => {
    if (!nisn.trim()) {
      setLoginError('Harap masukkan NIS Anda.');
      return;
    }

    setLoginLoading(true);
    setLoginError('');

    try {
      const student = await DbService.loginSiswa(nisn.trim());
      if (student) {
        // Perform license validation before completing login session
        await checkAndActivateLicenseForStudent(student);

        await StorageService.saveStudentSession(student);
        setStudentSession(student);
        setNisn('');
      } else {
        setLoginError('NIS tidak terdaftar! Harap hubungi pengawas.');
      }
    } catch (e: any) {
      console.error(e);
      setLoginError(e.message || 'Koneksi bermasalah. Coba lagi.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleStudentLogout = async () => {
    await StorageService.clearStudentSession();
    setStudentSession(null);
  };

  const handleOpenExamList = async (kelasId: string, className: string) => {
    if (isNavigating) return;
    setIsNavigating(true);

    try {
      // Cache the selected class
      await StorageService.saveSelectedClass(kelasId, className);
      
      // Warm-up local cache of teacher PINs in the background to ensure offline unblocking works
      try {
        const pins = await DbService.getAllGuruPins();
        if (pins && pins.length > 0) {
          await StorageService.cachePins(pins);
        }
      } catch (e) {
        console.warn('Could not cache current unblock PINs, using local fallback:', e);
      }

      router.push({
        pathname: '/exam-list',
        params: { kelasId, kelasName: className },
      });
    } catch (err) {
      console.error(err);
    } finally {
      // Safety unlock after 2 seconds to allow re-navigation if needed
      setTimeout(() => setIsNavigating(false), 2000);
    }
  };

  const handleSelectClassInSimpleMode = async (kelasId: string, className: string) => {
    setSelectedClassForStudentList({ id: kelasId, name: className });
    setStudentModalVisible(true);
    setLoadingStudents(true);
    setClassStudents([]);
    setStudentSearchQuery('');

    try {
      const list = await DbService.getSiswaByKelas(kelasId);
      setClassStudents(list);
    } catch (err) {
      console.error('Failed to load class students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleSelectStudent = async (student: Siswa) => {
    try {
      setStudentModalVisible(false);
      setLoading(true);
      
      // Perform license validation before completing login session
      await checkAndActivateLicenseForStudent(student);

      await StorageService.saveStudentSession(student);
      await StorageService.saveSelectedClass(student.kelas_id, student.kelas_nama || 'Kelas');
      setStudentSession(student);
      
      router.push({
        pathname: '/exam-list',
        params: { kelasId: student.kelas_id, kelasName: student.kelas_nama || 'Kelas' },
      });
    } catch (e: any) {
      console.error('Failed to select student:', e);
      Alert.alert(
        'Aktivasi Lisensi Gagal',
        e.message || 'Terjadi kesalahan saat memverifikasi lisensi sekolah Anda. Silakan hubungi proktor.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = React.useMemo(() => {
    return classStudents.filter(s => 
      s.nama_siswa.toLowerCase().includes(studentSearchQuery.toLowerCase())
    );
  }, [classStudents, studentSearchQuery]);

  if (loading && kelasList.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Menyiapkan Sistem...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.activeTheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Floating Refresh Button */}
      <TouchableOpacity 
        style={styles.refreshFloatingBtn} 
        onPress={handleReload}
        activeOpacity={0.7}
      >
        <Text style={styles.refreshFloatingIcon}>🔄</Text>
      </TouchableOpacity>

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
        <Animated.View style={[styles.animatedContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          
          {/* School Branding Header */}
          <View style={styles.headerSection}>
            <View style={styles.logoWrapper}>
              {logoUrl ? (
                <Image source={{ uri: logoUrl }} style={styles.schoolLogo} resizeMode="contain" />
              ) : (
                <View style={styles.fallbackLogoContainer}>
                  <Text style={styles.fallbackLogoText}>
                    {schoolName ? schoolName.split(' ').filter(word => word.length > 0).map(n => n[0]).join('').substring(0, 3).toUpperCase() : 'SCH'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.headerTitle}>{schoolName}</Text>
            <Text style={styles.headerSubtitle}>{examEvent}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>SEB Secure Mode</Text>
            </View>
          </View>

          {studentSession ? (
            /* ========================================================
               STUDENT DASHBOARD (LOGGED IN STATE)
               ======================================================== */
            <View style={styles.dashboardCard}>
              <Text style={styles.emojiIcon}>🎓</Text>
              <Text style={styles.dashboardHeader}>PORTAL SISWA</Text>
              
              <View style={styles.studentInfoBox}>
                <View style={styles.studentInfoRow}>
                  <Text style={styles.studentInfoLabel}>NAMA</Text>
                  <Text style={styles.studentInfoValue}>{studentSession.nama_siswa}</Text>
                </View>
                <View style={styles.studentDivider} />
                <View style={styles.studentInfoRow}>
                  <Text style={styles.studentInfoLabel}>NIS</Text>
                  <Text style={styles.studentInfoValue}>{studentSession.nisn}</Text>
                </View>
                <View style={styles.studentDivider} />
                <View style={styles.studentInfoRow}>
                  <Text style={styles.studentInfoLabel}>KELAS</Text>
                  <Text style={styles.studentInfoValue}>{studentSession.kelas_nama || 'Kelas Aktif'}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.goToExamsButton}
                onPress={() => handleOpenExamList(studentSession.kelas_id, studentSession.kelas_nama || 'Kelas')}
                activeOpacity={0.8}
              >
                <Text style={styles.goToExamsText}>🚀 BUKA DAFTAR UJIAN</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleStudentLogout}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutText}>🚪 Keluar Akun</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ========================================================
               🔒 SECURE NIS LOGIN PORTAL MODE
               ======================================================== */
            <View style={styles.selectionCard}>
              <Text style={styles.simpleTitle}>🔑 PORTAL LOGIN SISWA</Text>
              
              <View style={styles.formContainer}>
                <Text style={styles.label}>NIS SISWA</Text>
                
                <View style={[
                  styles.inputContainer,
                  isNisnFocused && styles.inputContainerFocused,
                ]}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    style={[
                      styles.nisInput,
                      Platform.select({
                        web: {
                          outlineStyle: 'none',
                        } as any,
                      }),
                    ]}
                    value={nisn}
                    onChangeText={(text) => {
                      setNisn(text.replace(/[^0-9]/g, ''));
                      setLoginError('');
                    }}
                    onFocus={() => setIsNisnFocused(true)}
                    onBlur={() => setIsNisnFocused(false)}
                    placeholder="Masukkan NIS Anda"
                    placeholderTextColor="#64748B"
                    keyboardType="number-pad"
                    maxLength={15}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    onSubmitEditing={handleStudentLogin}
                  />
                </View>

                {loginError ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>⚠️ {loginError}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!nisn.trim() || loginLoading) && styles.submitButtonDisabled
                  ]}
                  disabled={loginLoading || !nisn.trim()}
                  onPress={handleStudentLogin}
                  activeOpacity={0.8}
                >
                  {loginLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>MASUK PORTAL</Text>
                  )}
                </TouchableOpacity>
              </View>

              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={styles.changeSchoolLink}
                  onPress={handleResetDomain}
                  activeOpacity={0.7}
                >
                  <Text style={styles.changeSchoolLinkText}>🏢 Hubungkan ke Sekolah Lain</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── APK Download Banner (Web Only) ── */}
          {Platform.OS === 'web' && (
            <View style={styles.apkDownloadSection}>
              <View style={styles.apkDownloadCard}>
                <View style={styles.apkDownloadLeft}>
                  <Text style={styles.apkAndroidIcon}>🤖</Text>
                  <View>
                    <Text style={styles.apkDownloadTitle}>Pakai Aplikasi Android</Text>
                    <Text style={styles.apkDownloadDesc}>Lebih cepat & stabil saat ujian berlangsung</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.apkDownloadBtn}
                  onPress={() => {
                    if (typeof window !== 'undefined') {
                      window.open('https://api.absenta.id/download-apk', '_blank');
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.apkDownloadBtnText}>⬇ Unduh APK</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.apkDownloadNote}>
                ✦ APK terbaru {downloadCount !== null ? `· Diunduh ${downloadCount} kali ` : ''}· Otomatis update dari cloud
              </Text>
            </View>
          )}

          {/* Footer Admin Entry & Check Update Button */}
          <View style={styles.footerButtonsRow}>
            <TouchableOpacity
              style={styles.teacherLink}
              onPress={() => router.push('/teacher/login')}
              activeOpacity={0.7}
            >
              <Text style={styles.teacherLinkText}>🔑 Panel Guru</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.checkUpdateBtn, checkingUpdate && styles.checkUpdateBtnDisabled]}
              disabled={checkingUpdate}
              onPress={handleManualCheckUpdate}
              activeOpacity={0.7}
            >
              {checkingUpdate ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <Text style={styles.checkUpdateBtnText}>🔄 Cek Update</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.copyrightText}>powered by BARAYA TEKNOLOGI</Text>
          <Text style={styles.versionText}>v1.0.1 (OTA)</Text>
        </Animated.View>
      </ScrollView>

      {/* ── Mobile Domain Input Modal Overlay (Premium) ── */}
      <Modal
        visible={showDomainInput && Platform.OS !== 'web'}
        transparent={false}
        animationType="fade"
      >
        <SafeAreaView style={[styles.container, styles.domainContainer]}>
          <StatusBar barStyle={theme.activeTheme === 'dark' ? 'light-content' : 'dark-content'} />
          <ScrollView contentContainerStyle={styles.domainScroll} keyboardShouldPersistTaps="handled">
            <Animated.View style={[styles.domainCard, { opacity: fadeAnim }]}>
              <Text style={styles.domainEmoji}>🌐</Text>
              <Text style={styles.domainTitle}>Portal Ujian Bersama</Text>
              <Text style={styles.domainSubtitle}>Masukkan alamat domain server sekolah Anda untuk memulai ujian.</Text>
              
              <View style={styles.domainInputWrapper}>
                <Text style={styles.domainInputLabel}>Domain / Alamat Sekolah</Text>
                <TextInput
                  style={[
                    styles.domainInputText,
                    Platform.select({ web: { outlineStyle: 'none' } as any }),
                  ]}
                  value={domainInput}
                  onChangeText={(text) => {
                    setDomainInput(text);
                    setDomainError('');
                  }}
                  placeholder="Contoh: smkn1plered.absenta.id"
                  placeholderTextColor="#64748B"
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  onSubmitEditing={handleSaveDomain}
                />
              </View>

              {domainError ? (
                <View style={styles.domainErrorBox}>
                  <Text style={styles.domainErrorText}>⚠️ {domainError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.domainSubmitBtn, domainLoading && styles.domainSubmitBtnDisabled]}
                onPress={handleSaveDomain}
                disabled={domainLoading}
                activeOpacity={0.8}
              >
                {domainLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.domainSubmitText}>HUBUNGKAN SEKARANG</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
            <Text style={styles.copyrightText}>powered by BARAYA TEKNOLOGI</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Student Selection Modal (For Simple Mode / Guest name picking) */}
      <Modal
        visible={studentModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setStudentModalVisible(false)}
      >
        <View style={styles.studentModalOverlay}>
          <View style={styles.studentModalContent}>
            <View style={styles.studentModalHeader}>
              <Text style={styles.studentModalTitle} numberOfLines={1}>
                Pilih Nama Anda ({selectedClassForStudentList?.name})
              </Text>
              <TouchableOpacity onPress={() => setStudentModalVisible(false)}>
                <Text style={styles.studentModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.studentModalSearchBar,
                Platform.select({ web: { outlineStyle: 'none' } as any })
              ]}
              placeholder="🔍 Ketik nama Anda di sini..."
              placeholderTextColor="#64748B"
              value={studentSearchQuery}
              onChangeText={setStudentSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
            />

            {loadingStudents ? (
              <ActivityIndicator size="large" color="#3B82F6" style={{ marginVertical: 40 }} />
            ) : filteredStudents.length === 0 ? (
              <View style={styles.studentModalEmptyContainer}>
                <Text style={styles.studentModalEmptyText}>Nama siswa tidak ditemukan.</Text>
                <Text style={styles.studentModalEmptySubtext}>Coba ketik nama lain atau periksa kelas Anda.</Text>
              </View>
            ) : (
              <FlatList
                data={filteredStudents}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.studentModalItem}
                    onPress={() => handleSelectStudent(item)}
                  >
                    <Text style={styles.studentModalItemText}>{item.nama_siswa}</Text>
                    <Text style={styles.studentModalItemNisn}>NISN: {item.nisn}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 40,
    width: '100%',
  },
  loadingText: {
    marginTop: 15,
    color: theme.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: theme.primary, // Vibrant blue
    letterSpacing: 4,
  },
  headerSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
    letterSpacing: 2,
    marginTop: -2,
  },
  badge: {
    backgroundColor: theme.backgroundElement,
    borderColor: theme.primary,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 10,
  },
  badgeText: {
    color: theme.primary,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  // Cached Class Quick Navigation
  cachedCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(37, 99, 235, 0.05)',
    borderRadius: 16,
    borderColor: theme.primary,
    borderWidth: 1,
    padding: 16,
    marginBottom: 25,
  },
  cachedTitle: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  cachedButton: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cachedButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  arrowIcon: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  clearCachedButton: {
    marginTop: 10,
    alignSelf: 'center',
  },
  clearCachedText: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  copyrightText: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 25,
    alignSelf: 'center',
    letterSpacing: 0.5,
  },
  versionText: {
    color: theme.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    alignSelf: 'center',
  },
  animatedContent: {
    width: '100%',
    alignItems: 'center',
  },
  // Main Selection Box Card (Glassmorphic)
  selectionCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(30, 41, 59, 0.75)' : 'rgba(255, 255, 255, 0.85)',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      }
    }),
    elevation: 6,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 20,
  },
  // Form container
  formContainer: {
    width: '100%',
  },
  label: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 12,
  },
  // Segmented control switcher tab styles
  segmentTabBar: {
    flexDirection: 'row',
    backgroundColor: theme.background,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  segmentTabActive: {
    backgroundColor: theme.backgroundElement,
    borderColor: theme.border,
    borderWidth: 1,
  },
  segmentTabText: {
    color: theme.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  segmentTabTextActive: {
    color: theme.primary,
  },
  // Premium input container styles
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(241, 245, 249, 0.8)',
    borderColor: theme.border,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
  },
  inputContainerFocused: {
    borderColor: theme.primary,
    ...Platform.select({
      web: {
        boxShadow: `0 0 0 3px ${theme.primary}30`,
      } as any,
    }),
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 12,
    opacity: 0.8,
  },
  nisInput: {
    flex: 1,
    color: theme.text,
    fontSize: 16,
    fontWeight: '700',
    height: '100%',
    letterSpacing: 2,
  },
  errorBanner: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(220, 38, 38, 0.08)',
    borderColor: theme.danger,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorBannerText: {
    color: theme.danger,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  // Submit Portal Button
  submitButton: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
    ...Platform.select({
      web: {
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      } as any,
      default: {
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      }
    }),
    elevation: 4,
    width: '100%',
  },
  submitButtonDisabled: {
    backgroundColor: theme.backgroundSelected,
    opacity: 0.6,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  // Student Dashboard logged in card
  dashboardCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.backgroundElement,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      web: {
        shadowColor: theme.cardShadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
      },
    }),
    elevation: 5,
    borderColor: theme.success,
    borderWidth: 1.5,
  },
  emojiIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  dashboardHeader: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.success, // Emerald green
    letterSpacing: 2,
    marginBottom: 20,
  },
  studentInfoBox: {
    backgroundColor: theme.background,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  studentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  studentInfoLabel: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  studentInfoValue: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
  },
  studentDivider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 6,
  },
  goToExamsButton: {
    backgroundColor: theme.success,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    elevation: 4,
    width: '100%',
    marginBottom: 12,
  },
  goToExamsText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
  logoutButton: {
    borderColor: theme.danger,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    width: '100%',
  },
  logoutText: {
    color: theme.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  // Teacher link footer
  teacherLink: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    borderColor: theme.border,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherLinkText: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  // ── APK Download Banner (Web Only) ──
  apkDownloadSection: {
    marginTop: 24,
    marginBottom: 4,
    paddingHorizontal: 0,
  },
  apkDownloadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.activeTheme === 'dark'
      ? 'rgba(52, 211, 153, 0.08)'
      : 'rgba(5, 150, 105, 0.07)',
    borderWidth: 1,
    borderColor: theme.activeTheme === 'dark'
      ? 'rgba(52, 211, 153, 0.25)'
      : 'rgba(5, 150, 105, 0.2)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  apkDownloadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  apkAndroidIcon: {
    fontSize: 28,
  },
  apkDownloadTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.activeTheme === 'dark' ? '#34D399' : '#065F46',
    letterSpacing: 0.3,
  },
  apkDownloadDesc: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 2,
  },
  apkDownloadBtn: {
    backgroundColor: theme.activeTheme === 'dark' ? '#10B981' : '#059669',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  apkDownloadBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  apkDownloadNote: {
    textAlign: 'center',
    fontSize: 10,
    color: theme.textSecondary,
    marginTop: 6,
    letterSpacing: 0.3,
  },
  footerButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
    marginTop: 20,
  },
  checkUpdateBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: theme.activeTheme === 'light' ? 'rgba(5, 150, 105, 0.08)' : 'rgba(16, 185, 129, 0.15)',
    borderColor: theme.success,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkUpdateBtnDisabled: {
    opacity: 0.6,
  },
  checkUpdateBtnText: {
    color: theme.success,
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(15, 23, 42, 0.75)' : 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.backgroundElement,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 45,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
  },
  closeButton: {
    fontSize: 18,
    color: theme.textSecondary,
    fontWeight: 'bold',
  },
  modalItem: {
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  modalItemActive: {
    backgroundColor: theme.backgroundSelected,
  },
  modalItemText: {
    fontSize: 15,
    color: theme.text,
    fontWeight: '600',
  },
  emptyView: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  simpleTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 15,
  },
  searchBarInput: {
    backgroundColor: theme.background,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 15,
    color: theme.text,
    fontSize: 14,
    marginBottom: 20,
    width: '100%',
  },
  classesGridContainer: {
    width: '100%',
    marginTop: 15,
  },
  classesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  classCard: {
    backgroundColor: theme.background,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    width: '48%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  classCardText: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    width: '100%',
  },
  logoWrapper: {
    padding: 6,
    borderRadius: 50,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(37, 99, 235, 0.05)',
    borderColor: theme.activeTheme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(37, 99, 235, 0.1)',
    borderWidth: 1.5,
    marginBottom: 15,
    ...Platform.select({
      web: {
        boxShadow: `0 0 15px ${theme.primary}20`,
      } as any,
    }),
  },
  schoolLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  fallbackLogoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.backgroundElement,
    borderColor: theme.primary,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  fallbackLogoText: {
    color: theme.primary,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  // Student modal styles
  studentModalOverlay: {
    flex: 1,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(9, 15, 30, 0.75)' : 'rgba(9, 15, 30, 0.4)',
    justifyContent: 'flex-end',
  },
  studentModalContent: {
    backgroundColor: theme.backgroundElement,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '80%',
    width: '100%',
    borderColor: theme.border,
    borderTopWidth: 1.5,
  },
  studentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  studentModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
    flex: 1,
  },
  studentModalCloseText: {
    fontSize: 18,
    color: theme.textSecondary,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  studentModalSearchBar: {
    backgroundColor: theme.background,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 15,
    color: theme.text,
    fontSize: 14,
    marginBottom: 15,
    width: '100%',
  },
  studentModalEmptyContainer: {
    paddingVertical: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentModalEmptyText: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 5,
  },
  studentModalEmptySubtext: {
    color: theme.textMuted,
    fontSize: 12,
  },
  studentModalItem: {
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.background,
    borderRadius: 12,
    marginBottom: 8,
    borderColor: theme.border,
    borderWidth: 1,
  },
  studentModalItemText: {
    fontSize: 15,
    color: theme.text,
    fontWeight: '700',
  },
  studentModalItemNisn: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 4,
    fontWeight: '600',
  },
  connectionCard: {
    backgroundColor: theme.backgroundElement,
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectionStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  connectionStatusDotConnected: {
    backgroundColor: theme.success,
  },
  connectionStatusDotError: {
    backgroundColor: theme.danger,
  },
  connectionStatusDotChecking: {
    backgroundColor: theme.warning,
  },
  connectionStatusText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  reconnectBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: theme.backgroundSelected,
    borderWidth: 1,
    borderColor: theme.border,
  },
  reconnectBtnText: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  connectionErrorText: {
    color: theme.danger,
    fontSize: 11,
    marginTop: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: theme.activeTheme === 'light' ? 'rgba(220, 38, 38, 0.05)' : 'rgba(239, 68, 68, 0.08)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.activeTheme === 'light' ? 'rgba(220, 38, 38, 0.15)' : 'rgba(239, 68, 68, 0.15)',
  },
  refreshFloatingBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 10 : 20,
    right: 20,
    zIndex: 999,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.backgroundSelected,
    borderWidth: 1,
    borderColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshFloatingIcon: {
    fontSize: 14,
  },

  // ── Domain Input Styles ──
  domainContainer: {
    backgroundColor: theme.background,
    justifyContent: 'center',
  },
  domainScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  domainCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 30,
    backgroundColor: theme.backgroundElement,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    ...Platform.select({
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      }
    }),
  },
  domainEmoji: {
    fontSize: 54,
    marginBottom: 16,
  },
  domainTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.primary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  domainSubtitle: {
    fontSize: 13,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    fontWeight: '600',
  },
  domainInputWrapper: {
    width: '100%',
    marginBottom: 18,
  },
  domainInputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  domainInputText: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(241, 245, 249, 0.8)',
    paddingHorizontal: 16,
    color: theme.text,
    fontSize: 15,
    fontWeight: '600',
  },
  domainErrorBox: {
    width: '100%',
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(220, 38, 38, 0.08)',
    borderColor: theme.danger,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  domainErrorText: {
    color: theme.danger,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  domainSubmitBtn: {
    width: '100%',
    backgroundColor: theme.primary,
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  domainSubmitBtnDisabled: {
    opacity: 0.6,
  },
  domainSubmitText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  changeSchoolLink: {
    marginTop: 18,
    alignSelf: 'center',
    padding: 8,
  },
  changeSchoolLinkText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
});
