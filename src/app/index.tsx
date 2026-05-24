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
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DbService, Jurusan, Kelas, Siswa, isSupabaseConfigured, supabase } from '@/services/supabase';
import { StorageService } from '@/services/storage';

export default function HomeScreen() {
  const router = useRouter();

  // Student Login States
  const [studentSession, setStudentSession] = useState<Siswa | null>(null);
  const [activeTab, setActiveTab] = useState<'student' | 'guest'>('student');
  const [nisn, setNisn] = useState('');
  const [isNisnFocused, setIsNisnFocused] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

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

  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const checkDatabaseConnection = async () => {
    setConnectionStatus('checking');
    setConnectionError(null);
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase URL atau Anon Key tidak terkonfigurasi di bundel aplikasi.');
      }
      
      const { data, error } = await supabase!
        .from('settings')
        .select('value')
        .eq('key', 'login_mode')
        .maybeSingle();

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
    checkDatabaseConnection();
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
    }

    // 3. Load cached class
    const savedClass = await StorageService.getSelectedClass();
    if (savedClass) {
      setCachedClass(savedClass);
    }

    // 4. Load cached login mode & classrooms for instant startup rendering
    const cachedMode = await StorageService.getCachedLoginMode();
    if (cachedMode) {
      setLoginMode(cachedMode);
    }

    const cachedClasses = await StorageService.getCachedClasses();
    if (cachedClasses && cachedClasses.length > 0) {
      setKelasList(cachedClasses);
      setLoading(false); // Instantly show cached UI!
    }

    // 5. Fetch fresh data from Supabase in background (Stale-While-Revalidate)
    try {
      let freshMode: 'simple' | 'login' = 'simple';
      try {
        const mode = await DbService.getSetting('login_mode');
        freshMode = mode as 'simple' | 'login';
        setLoginMode(freshMode);
        await StorageService.cacheLoginMode(freshMode);
      } catch (settingError) {
        console.warn('Could not load portal settings, using fallback/cached mode:', settingError);
      }

      // Fetch global cheat blocking configuration
      try {
        const blockVal = await DbService.getSetting('cheat_blocking_enabled');
        await StorageService.cacheCheatBlocking(blockVal === 'true');
      } catch (blockError) {
        console.warn('Could not load global cheat blocking configuration:', blockError);
      }

      // Fetch fresh school/tenant profile branding (SaaS Multi-tenant ready)
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

      const classesData = await DbService.getKelas(undefined, true);
      if (classesData && classesData.length > 0) {
        setKelasList(classesData);
        await StorageService.cacheClasses(classesData);
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

  useEffect(() => {
    initApp();
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

  const handleStudentLogin = async () => {
    if (!nisn.trim()) {
      setLoginError('Harap masukkan NISN Anda.');
      return;
    }

    setLoginLoading(true);
    setLoginError('');

    try {
      const student = await DbService.loginSiswa(nisn.trim());
      if (student) {
        await StorageService.saveStudentSession(student);
        setStudentSession(student);
        setNisn('');
      } else {
        setLoginError('NISN tidak terdaftar! Harap hubungi pengawas.');
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
      await StorageService.saveStudentSession(student);
      await StorageService.saveSelectedClass(student.kelas_id, student.kelas_nama || 'Kelas');
      setStudentSession(student);
      setStudentModalVisible(false);
      
      router.push({
        pathname: '/exam-list',
        params: { kelasId: student.kelas_id, kelasName: student.kelas_nama || 'Kelas' },
      });
    } catch (e) {
      console.error('Failed to select student:', e);
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
      <StatusBar barStyle="light-content" />
      
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
        
        {/* School Branding Header */}
        <View style={styles.headerSection}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.schoolLogo} resizeMode="contain" />
          ) : (
            <View style={styles.fallbackLogoContainer}>
              <Text style={styles.fallbackLogoText}>
                {schoolName ? schoolName.split(' ').filter(word => word.length > 0).map(n => n[0]).join('').substring(0, 3).toUpperCase() : 'SCH'}
              </Text>
            </View>
          )}
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
                <Text style={styles.studentInfoLabel}>NISN</Text>
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
            >
              <Text style={styles.goToExamsText}>🚀 BUKA DAFTAR UJIAN</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleStudentLogout}
            >
              <Text style={styles.logoutText}>🚪 Keluar Akun</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ========================================================
             LOGIN / ACCESS GUEST STATE
             ======================================================== */
          <>
            {loginMode === 'simple' ? (
              /* ========================================================
                 ⚡ ACCESS DIRECT SIMPLE TABULAR MODE
                 ======================================================== */
              <View style={styles.selectionCard}>
                <Text style={styles.simpleTitle}>Pilih Kelas Ujian Anda</Text>
                
                {/* Tingkat Tab Switcher */}
                <View style={styles.tingkatGroup}>
                  {(['X', 'XI', 'XII'] as const).map((tingkat) => (
                    <TouchableOpacity
                      key={tingkat}
                      style={[
                        styles.tingkatButton,
                        activeTingkatTab === tingkat && styles.tingkatButtonActive,
                      ]}
                      onPress={() => {
                        setActiveTingkatTab(tingkat);
                      }}
                    >
                      <Text
                        style={[
                          styles.tingkatButtonText,
                          activeTingkatTab === tingkat && styles.tingkatButtonTextActive,
                        ]}
                      >
                        KELAS {tingkat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Class Search Query */}
                <TextInput
                  style={[
                    styles.searchBarInput,
                    Platform.select({
                      web: { outlineStyle: 'none' } as any
                    })
                  ]}
                  placeholder="🔍 Cari nama kelas Anda..."
                  placeholderTextColor="#64748B"
                  value={classSearchQuery}
                  onChangeText={setClassSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                />

                {/* Active Classes Grid */}
                <View style={styles.classesGridContainer}>
                  {filteredClassesForSimpleMode.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>Tidak ada kelas yang cocok.</Text>
                    </View>
                  ) : (
                    <View style={styles.classesGrid}>
                      {filteredClassesForSimpleMode.map((k) => (
                        <TouchableOpacity
                          key={k.id}
                          style={styles.classCard}
                          onPress={() => handleSelectClassInSimpleMode(k.id, k.nama_kelas)}
                        >
                          <Text style={styles.classCardText}>{k.nama_kelas}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ) : (
              /* ========================================================
                 🔒 SECURE NISN LOGIN PORTAL MODE
                 ======================================================== */
              <View style={styles.selectionCard}>
                {/* Segmented Switch Tab */}
                <View style={styles.segmentTabBar}>
                  <TouchableOpacity
                    style={[
                      styles.segmentTab,
                      activeTab === 'student' && styles.segmentTabActive
                    ]}
                    onPress={() => {
                      setActiveTab('student');
                      setLoginError('');
                    }}
                  >
                    <Text style={[
                      styles.segmentTabText,
                      activeTab === 'student' && styles.segmentTabTextActive
                    ]}>🔑 Login Siswa</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.segmentTab,
                      activeTab === 'guest' && styles.segmentTabActive
                    ]}
                    onPress={() => {
                      setActiveTab('guest');
                      setLoginError('');
                    }}
                  >
                    <Text style={[
                      styles.segmentTabText,
                      activeTab === 'guest' && styles.segmentTabTextActive
                    ]}>🌐 Akses Tamu</Text>
                  </TouchableOpacity>
                </View>

                {activeTab === 'student' ? (
                  /* student LOGIN FORM */
                  <View style={styles.formContainer}>
                    <Text style={styles.label}>NISN SISWA</Text>
                    <TextInput
                      style={[
                        styles.nisnInput,
                        isNisnFocused && styles.nisnInputFocused,
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
                      placeholder="Masukkan NISN Anda"
                      placeholderTextColor="#64748B"
                      keyboardType="number-pad"
                      maxLength={15}
                      autoCapitalize="none"
                      autoCorrect={false}
                      spellCheck={false}
                    />

                    {loginError ? (
                      <Text style={styles.loginErrorText}>⚠️ {loginError}</Text>
                    ) : null}

                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        !nisn.trim() && styles.submitButtonDisabled
                      ]}
                      disabled={loginLoading || !nisn.trim()}
                      onPress={handleStudentLogin}
                    >
                      {loginLoading ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.submitButtonText}>MASUK PORTAL</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* GUEST DIRECT TABULAR ACCESS */
                  <View style={styles.formContainer}>
                    {/* Tingkat Tab Switcher */}
                    <View style={styles.tingkatGroup}>
                      {(['X', 'XI', 'XII'] as const).map((tingkat) => (
                        <TouchableOpacity
                          key={tingkat}
                          style={[
                            styles.tingkatButton,
                            activeTingkatTab === tingkat && styles.tingkatButtonActive,
                          ]}
                          onPress={() => {
                            setActiveTingkatTab(tingkat);
                          }}
                        >
                          <Text
                            style={[
                              styles.tingkatButtonText,
                              activeTingkatTab === tingkat && styles.tingkatButtonTextActive,
                            ]}
                          >
                            KELAS {tingkat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Class Search Query */}
                    <TextInput
                      style={[
                        styles.searchBarInput,
                        Platform.select({
                          web: { outlineStyle: 'none' } as any
                        }),
                        { marginBottom: 15 }
                      ]}
                      placeholder="🔍 Cari nama kelas Anda..."
                      placeholderTextColor="#64748B"
                      value={classSearchQuery}
                      onChangeText={setClassSearchQuery}
                      autoCapitalize="none"
                      autoCorrect={false}
                      spellCheck={false}
                    />

                    {/* Active Classes Grid */}
                    <View style={styles.classesGridContainer}>
                      {filteredClassesForSimpleMode.length === 0 ? (
                        <View style={styles.emptyContainer}>
                          <Text style={styles.emptyText}>Tidak ada kelas yang cocok.</Text>
                        </View>
                      ) : (
                        <View style={styles.classesGrid}>
                          {filteredClassesForSimpleMode.map((k) => (
                            <TouchableOpacity
                              key={k.id}
                              style={styles.classCard}
                              onPress={() => handleSelectClassInSimpleMode(k.id, k.nama_kelas)}
                            >
                              <Text style={styles.classCardText}>{k.nama_kelas}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}
          </>
        )}

        {/* Database Connection Indicator Card */}
        <View style={styles.connectionCard}>
          <View style={styles.connectionRow}>
            <View style={[
              styles.connectionStatusDot,
              connectionStatus === 'connected' && styles.connectionStatusDotConnected,
              connectionStatus === 'error' && styles.connectionStatusDotError,
              connectionStatus === 'checking' && styles.connectionStatusDotChecking,
            ]} />
            <Text style={styles.connectionStatusText}>
              {connectionStatus === 'connected' && '🟢 Database Terhubung'}
              {connectionStatus === 'checking' && '🟡 Memeriksa Koneksi Database...'}
              {connectionStatus === 'error' && '🔴 Koneksi Database Terputus'}
            </Text>
            {connectionStatus !== 'checking' && (
              <TouchableOpacity onPress={checkDatabaseConnection} style={styles.reconnectBtn}>
                <Text style={styles.reconnectBtnText}>🔄 Cek Ulang</Text>
              </TouchableOpacity>
            )}
          </View>
          {connectionStatus === 'error' && connectionError && (
            <Text style={styles.connectionErrorText} numberOfLines={4}>
              {connectionError}
            </Text>
          )}
        </View>

        {/* Footer Admin Entry & Check Update Button */}
        <View style={styles.footerButtonsRow}>
          <TouchableOpacity
            style={styles.teacherLink}
            onPress={() => router.push('/teacher/login')}
          >
            <Text style={styles.teacherLinkText}>🔑 Panel Guru</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.checkUpdateBtn, checkingUpdate && styles.checkUpdateBtnDisabled]}
            disabled={checkingUpdate}
            onPress={handleManualCheckUpdate}
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
      </ScrollView>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
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
    color: '#94A3B8',
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
    color: '#3B82F6', // Vibrant blue
    letterSpacing: 4,
  },
  headerSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
    letterSpacing: 2,
    marginTop: -2,
  },
  badge: {
    backgroundColor: '#1E293B',
    borderColor: '#3B82F6',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 10,
  },
  badgeText: {
    color: '#3B82F6',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  // Cached Class Quick Navigation
  cachedCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 16,
    borderColor: '#3B82F6',
    borderWidth: 1,
    padding: 16,
    marginBottom: 25,
  },
  cachedTitle: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  cachedButton: {
    backgroundColor: '#3B82F6',
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
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  copyrightText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 25,
    alignSelf: 'center',
    letterSpacing: 0.5,
  },
  versionText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    alignSelf: 'center',
  },
  // Main Selection Box Card
  selectionCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 5,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F1F5F9',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 20,
  },
  // Form container
  formContainer: {
    width: '100%',
  },
  label: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 12,
  },
  // Segmented control switcher tab styles
  segmentTabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
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
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
  },
  segmentTabText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  segmentTabTextActive: {
    color: '#3B82F6',
  },
  // NISN Input specific styles
  nisnInput: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 3,
  },
  nisnInputFocused: {
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  loginErrorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  // Guest Dropdowns
  dropdownButton: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '600',
  },
  placeholderText: {
    color: '#64748B',
    fontSize: 15,
  },
  dropdownArrow: {
    color: '#64748B',
    fontSize: 12,
  },
  tingkatGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  tingkatButton: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  tingkatButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  tingkatButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  tingkatButtonTextActive: {
    color: '#FFF',
  },
  // Submit Portal Button
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 25,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    width: '100%',
  },
  submitButtonDisabled: {
    backgroundColor: '#334155',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  // Student Dashboard logged in card
  dashboardCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 5,
    borderColor: '#10B981',
    borderWidth: 1.5,
  },
  emojiIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  dashboardHeader: {
    fontSize: 20,
    fontWeight: '900',
    color: '#10B981', // Emerald green
    letterSpacing: 2,
    marginBottom: 20,
  },
  studentInfoBox: {
    backgroundColor: '#0F172A',
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
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  studentInfoValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  studentDivider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 6,
  },
  goToExamsButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
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
    borderColor: '#EF4444',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    width: '100%',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  // Teacher link footer
  teacherLink: {
    padding: 10,
  },
  teacherLinkText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  footerButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
    marginTop: 40,
  },
  checkUpdateBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkUpdateBtnDisabled: {
    opacity: 0.6,
  },
  checkUpdateBtnText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
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
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  closeButton: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  modalItem: {
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#273549',
  },
  modalItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  modalItemText: {
    fontSize: 15,
    color: '#F1F5F9',
    fontWeight: '600',
  },
  emptyView: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
  },
  simpleTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 15,
  },
  searchBarInput: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 15,
    color: '#FFF',
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
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
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
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    width: '100%',
  },
  schoolLogo: {
    width: 80,
    height: 80,
    marginBottom: 15,
  },
  fallbackLogoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E293B',
    borderColor: '#3B82F6',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  fallbackLogoText: {
    color: '#3B82F6',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  // Student modal styles
  studentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 15, 30, 0.75)',
    justifyContent: 'flex-end',
  },
  studentModalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '80%',
    width: '100%',
    borderColor: '#334155',
    borderTopWidth: 1.5,
  },
  studentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  studentModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F1F5F9',
    flex: 1,
  },
  studentModalCloseText: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: 'bold',
    marginLeft: 15,
  },
  studentModalSearchBar: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 15,
    color: '#FFF',
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
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 5,
  },
  studentModalEmptySubtext: {
    color: '#64748B',
    fontSize: 12,
  },
  studentModalItem: {
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#273549',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    marginBottom: 8,
    borderColor: '#1E293B',
    borderWidth: 1,
  },
  studentModalItemText: {
    fontSize: 15,
    color: '#F1F5F9',
    fontWeight: '700',
  },
  studentModalItemNisn: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  connectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#334155',
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
    backgroundColor: '#10B981',
  },
  connectionStatusDotError: {
    backgroundColor: '#EF4444',
  },
  connectionStatusDotChecking: {
    backgroundColor: '#F59E0B',
  },
  connectionStatusText: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  reconnectBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  reconnectBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  connectionErrorText: {
    color: '#FCA5A5',
    fontSize: 11,
    marginTop: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  refreshFloatingBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 10 : 20,
    right: 20,
    zIndex: 999,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshFloatingIcon: {
    fontSize: 14,
  },
});
