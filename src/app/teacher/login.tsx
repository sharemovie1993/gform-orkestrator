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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DbService, Guru } from '@/services/supabase';

export default function TeacherLoginScreen() {
  const router = useRouter();

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
        const list = await DbService.getGuru(true); // activeOnly = true
        setGuruList(list);
      } catch (e) {
        console.error('Gagal memuat daftar guru:', e);
        setError('Gagal memuat daftar guru. Periksa koneksi.');
      } finally {
        setLoadingGuru(false);
      }
    })();
  }, []);

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
      <StatusBar barStyle="light-content" />
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
            <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')}>
              <Text style={styles.backText}>◀ Portal Siswa</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.loginCard}>
              <Text style={styles.emoji}>🔐</Text>
              <Text style={styles.title}>PANEL GURU</Text>
              <Text style={styles.subtitle}>Kelola Ujian &amp; Struktur Kelas</Text>

              <View style={styles.inputGroup}>
                {/* ── Dropdown Nama Guru ── */}
                <Text style={styles.label}>Nama Guru</Text>

                {loadingGuru ? (
                  <View style={styles.loadingDropdown}>
                    <ActivityIndicator size="small" color="#3B82F6" />
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
                    placeholderTextColor="#64748B"
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

              {error ? <Text style={styles.errorText}>⚠️ {error}</Text> : null}
              {successMsg ? (
                <View style={styles.successBanner}>
                  <Text style={styles.successText}>✅ {successMsg}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.loginButton, (loading || !selectedGuru) && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={loading || !selectedGuru}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.loginButtonText}>MASUK</Text>
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.copyrightText}>powered by BARAYA TEKNOLOGI</Text>
            <Text style={styles.versionText}>v1.0.1 (OTA)</Text>
          </View>
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
                placeholderTextColor="#475569"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    padding: 15,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  backText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loginCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 6,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#3B82F6',
    letterSpacing: 2,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 25,
    textAlign: 'center',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 15,
  },
  label: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  // Loading dropdown placeholder
  loadingDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 10,
  },
  loadingDropdownText: {
    color: '#64748B',
    fontSize: 14,
  },
  // Dropdown trigger button
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  dropdownTriggerActive: {
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  dropdownTriggerText: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#64748B',
    fontWeight: '400',
  },
  dropdownArrow: {
    color: '#64748B',
    fontSize: 11,
    marginLeft: 8,
  },
  // Password input
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingRight: 14,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
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
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  successBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    width: '100%',
  },
  successText: {
    color: '#34D399',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Login button
  loginButton: {
    width: '100%',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 10,
  },
  loginButtonDisabled: {
    backgroundColor: '#1E3A5F',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
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
    backgroundColor: '#1E293B',
    borderRadius: 18,
    overflow: 'hidden',
    maxHeight: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomColor: '#334155',
    borderBottomWidth: 1,
  },
  dropdownHeaderTitle: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '700',
  },
  dropdownClose: {
    color: '#64748B',
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
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  dropdownItemText: {
    color: '#CBD5E1',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  checkIcon: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#1E293B',
    marginHorizontal: 12,
  },
  emptyDropdown: {
    padding: 30,
    alignItems: 'center',
  },
  emptyDropdownText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },
  // Search bar inside dropdown
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#334155',
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
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 10,
  },
  searchClear: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '700',
    paddingLeft: 8,
  },
});
