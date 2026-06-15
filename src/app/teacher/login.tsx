import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  FlatList,
  Animated,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from '@/services/storage';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DbService, Guru } from '@/services/supabase';
import { useTheme } from '@/hooks/use-theme';

export default function TeacherLoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  // Animated values for premium entry transitions
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  useEffect(() => {
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

  // Dropdown state
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [selectedGuru, setSelectedGuru] = useState<Guru | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingGuru, setLoadingGuru] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  // Form state
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const pinInputRef = useRef<TextInput>(null);

  // Fetch daftar guru saat komponen mount
  useEffect(() => {
    (async () => {
      try {
        setLoadingGuru(true);
        // Pastikan activeTenantId dimuat berbasis domain tersimpan saat mobile startup
        // Resolve tenant ID for both web and mobile to prevent race conditions
        let slug = '';
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const hostname = window.location.hostname;
          const searchParams = new URLSearchParams(window.location.search);
          const tenantParam = searchParams.get('tenant');
          if (tenantParam) {
            slug = tenantParam.trim();
          } else {
            const parts = hostname.split('.');
            if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'api' && parts[0] !== 'localhost') {
              slug = parts[0];
            }
          }
        } else {
          const savedDomain = await StorageService.getSavedDomain();
          if (savedDomain) {
            let cleanDomain = savedDomain.replace(/(^\w+:|^)\/\//, '').trim();
            const parts = cleanDomain.split('.');
            slug = parts[0];
          }
        }
        
        if (slug) {
          const tenant = await DbService.getTenantProfileBySlug(slug);
          if (tenant) {
            const { setActiveTenantId } = require('@/services/supabase');
            setActiveTenantId(tenant.id);
          }
        }
        
        let list = await DbService.getGuru(true); // activeOnly = true
        if (list.length === 0) {
          list = [{
            id: 'new-tenant-admin',
            nama_guru: 'Admin Utama (Default)',
            username: 'admin',
            pin_pengawas: '123456',
            password_hash: '',
            is_active: true,
            created_at: new Date().toISOString()
          } as any];
        }
        setGuruList(list);
        if (list.length === 1) {
          setSelectedGuru(list[0]);
        }
      } catch (e) {
        console.error('Gagal memuat daftar guru:', e);
        setError('Gagal memuat daftar guru. Periksa koneksi.');
      } finally {
        setLoadingGuru(false);
      }
    })();
  }, []);

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
            router.replace('/');
          }
        }
      ]
    );
  };

  const filteredGuruList = guruList.filter(g =>
    g.nama_guru.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDropdown = () => {
    setSearchQuery('');
    setDropdownOpen(true);
    // fokus ke search setelah modal terbuka
    setTimeout(() => searchInputRef.current?.focus(), 200);
  };

  const handleSelectGuru = (guru: Guru) => {
    setSelectedGuru(guru);
    setDropdownOpen(false);
    setSearchQuery('');
    setError('');
    // Auto-fokus ke PIN setelah pilih guru
    setTimeout(() => pinInputRef.current?.focus(), 150);
  };

  const handleLogin = async () => {
    if (!selectedGuru) {
      setError('Harap pilih nama guru terlebih dahulu.');
      return;
    }
    if (!pin) {
      setError('Harap masukkan PIN pengawas.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const guru = await DbService.loginGuru(selectedGuru.username, pin);
      if (guru) {
        setSuccessMsg(`Selamat datang, ${guru.nama_guru}! Mengalihkan...`);
        setTimeout(() => {
          router.replace({
            pathname: '/teacher/dashboard',
            params: { guruId: guru.id, guruNama: guru.nama_guru },
          });
        }, 800);
      } else {
        setError('Nama guru atau PIN salah!');
      }
    } catch (e: any) {
      console.error(e);
      if (e?.message?.includes('dinonaktifkan')) {
        setError(e.message);
      } else {
        setError('Terjadi kesalahan koneksi.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.activeTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back to student entry */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')} activeOpacity={0.7}>
              <Text style={styles.backText}>◀ Portal Siswa</Text>
            </TouchableOpacity>
          </View>

          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.loginCard}>
              <Text style={styles.emoji}>🔐</Text>
              <Text style={styles.title}>PANEL GURU</Text>
              <Text style={styles.subtitle}>Kelola Ujian &amp; Struktur Kelas</Text>

              <View style={styles.inputGroup}>
                {/* ── Dropdown Nama Guru ── */}
                <Text style={styles.label}>Nama Guru</Text>

                {loadingGuru ? (
                  <View style={styles.loadingDropdown}>
                    <ActivityIndicator size="small" color={theme.primary} />
                    <Text style={styles.loadingDropdownText}>Memuat daftar guru...</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.dropdownTrigger}
                    onPress={handleOpenDropdown}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.dropdownTriggerText,
                        !selectedGuru && styles.dropdownPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {selectedGuru ? selectedGuru.nama_guru : 'Pilih nama guru...'}
                    </Text>
                    <Text style={styles.dropdownArrow}>{dropdownOpen ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                )}

                {/* ── Input PIN ── */}
                <Text style={[styles.label, { marginTop: 16 }]}>PIN Pengawas</Text>
                <View style={styles.passwordContainer}>
                  <Text style={styles.inputIcon}>🔑</Text>
                  <TextInput
                    ref={pinInputRef}
                    style={[
                      styles.passwordInput,
                      Platform.select({
                        web: { outlineStyle: 'none' } as any,
                      }),
                    ]}
                    value={pin}
                    onChangeText={(text) => {
                      setPin(text);
                      setError('');
                    }}
                    placeholder="Masukkan PIN"
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry={!showPin}
                    maxLength={20}
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                    keyboardType="number-pad"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPin(!showPin)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                  >
                    <Text style={styles.eyeIcon}>{showPin ? '👁️' : '🙈'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>⚠️ {error}</Text>
                </View>
              ) : null}
              {successMsg ? (
                <View style={styles.successBanner}>
                  <Text style={styles.successBannerText}>✅ {successMsg}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.loginButton, (loading || !selectedGuru) && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={loading || !selectedGuru}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.loginButtonText}>MASUK</Text>
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
            <Text style={styles.copyrightText}>powered by BARAYA TEKNOLOGI</Text>
            <Text style={styles.versionText}>v1.0.1 (OTA)</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Dropdown Modal ── */}
      <Modal
        visible={dropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDropdownOpen(false)}
        >
          <View style={styles.dropdownModal}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownHeaderTitle}>Pilih Nama Guru</Text>
              <TouchableOpacity onPress={() => setDropdownOpen(false)}>
                <Text style={styles.dropdownClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search input */}
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                ref={searchInputRef}
                style={[
                  styles.searchInput,
                  Platform.select({ web: { outlineStyle: 'none' } as any }),
                ]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Cari nama guru..."
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.searchClear}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {guruList.length === 0 ? (
              <View style={styles.emptyDropdown}>
                <Text style={styles.emptyDropdownText}>Tidak ada data guru aktif.</Text>
              </View>
            ) : filteredGuruList.length === 0 ? (
              <View style={styles.emptyDropdown}>
                <Text style={styles.emptyDropdownText}>Guru "{searchQuery}" tidak ditemukan.</Text>
              </View>
            ) : (
              <FlatList
                data={filteredGuruList}
                keyExtractor={(item) => item.id}
                style={styles.dropdownList}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.dropdownItem,
                      selectedGuru?.id === item.id && styles.dropdownItemSelected,
                    ]}
                    onPress={() => handleSelectGuru(item)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selectedGuru?.id === item.id && styles.dropdownItemTextSelected,
                      ]}
                    >
                      {item.nama_guru}
                    </Text>
                    {selectedGuru?.id === item.id && (
                      <Text style={styles.checkIcon}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    padding: 15,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderColor: theme.border,
    borderWidth: 1,
  },
  backText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
    width: '100%',
  },
  loginCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(30, 41, 59, 0.75)' : 'rgba(255, 255, 255, 0.85)',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
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
  emoji: {
    fontSize: 48,
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.primary,
    letterSpacing: 2,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '600',
    marginBottom: 25,
    textAlign: 'center',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 15,
  },
  label: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  // Loading dropdown placeholder
  loadingDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    borderColor: theme.border,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 10,
  },
  loadingDropdownText: {
    color: theme.textMuted,
    fontSize: 14,
  },
  // Dropdown trigger button
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(241, 245, 249, 0.8)',
    borderColor: theme.border,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dropdownTriggerActive: {
    borderColor: theme.primary,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  dropdownTriggerText: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: theme.textMuted,
    fontWeight: '400',
  },
  dropdownArrow: {
    color: theme.textMuted,
    fontSize: 11,
    marginLeft: 8,
  },
  // Password input container
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(241, 245, 249, 0.8)',
    borderColor: theme.border,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 12,
    opacity: 0.8,
  },
  passwordInput: {
    flex: 1,
    color: theme.text,
    fontSize: 16,
    fontWeight: '700',
    height: '100%',
    letterSpacing: 2,
  },
  eyeButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    fontSize: 18,
  },
  // Feedback
  errorBanner: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(220, 38, 38, 0.08)',
    borderColor: theme.danger,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  errorBannerText: {
    color: theme.danger,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  successBanner: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(5, 150, 105, 0.1)',
    borderColor: theme.activeTheme === 'dark' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(5, 150, 105, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  successBannerText: {
    color: theme.success,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  // Login button
  loginButton: {
    width: '100%',
    backgroundColor: theme.primary,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
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
  },
  loginButtonDisabled: {
    backgroundColor: theme.backgroundSelected,
    opacity: 0.6,
    elevation: 0,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
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

  // ── Dropdown Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dropdownModal: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: theme.backgroundElement,
    borderRadius: 18,
    overflow: 'hidden',
    maxHeight: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomColor: theme.border,
    borderBottomWidth: 1,
  },
  dropdownHeaderTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700',
  },
  dropdownClose: {
    color: theme.textMuted,
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  dropdownList: {
    maxHeight: 340,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  dropdownItemSelected: {
    backgroundColor: theme.backgroundSelected,
  },
  dropdownItemText: {
    color: theme.textSecondary,
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: theme.primary,
    fontWeight: '700',
  },
  checkIcon: {
    color: theme.primary,
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: theme.border,
    marginHorizontal: 12,
  },
  emptyDropdown: {
    padding: 30,
    alignItems: 'center',
  },
  emptyDropdownText: {
    color: theme.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  // Search bar inside dropdown
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    borderColor: theme.border,
    borderWidth: 1.5,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: theme.text,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 10,
  },
  searchClear: {
    color: theme.textMuted,
    fontSize: 16,
    fontWeight: '700',
    paddingLeft: 8,
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
