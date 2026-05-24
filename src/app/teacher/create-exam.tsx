import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DbService, Jurusan, Kelas, Guru, Mapel } from '@/services/supabase';
import { DateTimePicker } from '@/components/admin/DateTimePicker';
import { useTheme } from '@/hooks/use-theme';

export default function CreateExamScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const params = useLocalSearchParams();
  const guruId = params.guruId as string;
  const guruNama = params.guruNama as string;

  // Form states
  const [selectedMapel, setSelectedMapel] = useState<Mapel | null>(null);
  const [link, setLink] = useState('');
  
  // Dynamic current date and time default values
  const [tanggalUjian, setTanggalUjian] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });
  const [waktuUjian, setWaktuUjian] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });

  // Dropdown / list states
  const [jurusans, setJurusans] = useState<Jurusan[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [selectedKelasIds, setSelectedKelasIds] = useState<string[]>([]);
  const [activeTingkat, setActiveTingkat] = useState<string>('');

  const [mapels, setMapels] = useState<Mapel[]>([]);
  const [gurus, setGurus] = useState<Guru[]>([]);
  const [selectedGuru, setSelectedGuru] = useState<Guru | null>(null);

  // Modals visibility for Mapel & Guru (Mobile fallback)
  const [mapelModalVisible, setMapelModalVisible] = useState(false);
  const [guruModalVisible, setGuruModalVisible] = useState(false);
  const [guruSearchQuery, setGuruSearchQuery] = useState('');

  // Custom picker modal states
  const [dateTimePickerVisible, setDateTimePickerVisible] = useState(false);

  const [loading, setLoading] = useState(false);

  // Load all required master data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jList, mList, gList, kList] = await Promise.all([
          DbService.getJurusan(true),
          DbService.getMapel(true),
          DbService.getGuru(true),
          DbService.getKelas(undefined, true)
        ]);
        setJurusans(jList);
        setMapels(mList);
        setGurus(gList);
        setKelasList(kList);
        
        if (guruId) {
          const found = gList.find(g => g.id === guruId);
          if (found) setSelectedGuru(found);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, [guruId]);

  // Compute unique grade levels (tingkat)
  const uniqueTingkats = React.useMemo(() => {
    return Array.from(new Set(kelasList.map(k => k.tingkat))).sort((a, b) => {
      const romanWeights: Record<string, number> = { 'X': 10, 'XI': 11, 'XII': 12 };
      const wA = romanWeights[a.toUpperCase()] || parseInt(a) || 0;
      const wB = romanWeights[b.toUpperCase()] || parseInt(b) || 0;
      if (wA !== 0 && wB !== 0) return wA - wB;
      return a.localeCompare(b);
    });
  }, [kelasList]);

  // Set default tab on load once classes are loaded
  useEffect(() => {
    if (uniqueTingkats.length > 0 && !activeTingkat) {
      setActiveTingkat(uniqueTingkats[0]);
    }
  }, [uniqueTingkats, activeTingkat]);

  // Filter classes by active tab (tingkat)
  const filteredClasses = React.useMemo(() => {
    return kelasList.filter(k => k.tingkat === activeTingkat);
  }, [kelasList, activeTingkat]);

  // Helpers for class selection matrix
  const toggleKelas = (id: string) => {
    setSelectedKelasIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const activeClassIds = React.useMemo(() => {
    return filteredClasses.map(k => k.id);
  }, [filteredClasses]);

  const isAllActiveSelected = React.useMemo(() => {
    return activeClassIds.length > 0 && activeClassIds.every(id => selectedKelasIds.includes(id));
  }, [activeClassIds, selectedKelasIds]);

  const toggleSelectAllTingkat = () => {
    if (isAllActiveSelected) {
      setSelectedKelasIds(prev => prev.filter(id => !activeClassIds.includes(id)));
    } else {
      setSelectedKelasIds(prev => {
        const filtered = prev.filter(id => !activeClassIds.includes(id));
        return [...filtered, ...activeClassIds];
      });
    }
  };

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
    } catch (e) {
      return dateStr;
    }
  };

  const handleConfirmDateTime = (dateStr: string, timeStr: string) => {
    setTanggalUjian(dateStr);
    setWaktuUjian(timeStr);
    setDateTimePickerVisible(false);
  };

  const handleSave = async () => {
    if (!selectedMapel || !selectedGuru || !link || selectedKelasIds.length === 0 || !tanggalUjian || !waktuUjian) {
      Alert.alert('Gagal', 'Harap lengkapi semua isian formulir dan pilih minimal satu kelas.');
      return;
    }

    if (!link.startsWith('http://') && !link.startsWith('https://')) {
      Alert.alert('Gagal', 'Link harus dimulai dengan http:// atau https://');
      return;
    }

    setLoading(true);

    try {
      // Create separate records concurrently for each selected class
      await Promise.all(
        selectedKelasIds.map(kelasId =>
          DbService.addLinkSoal(
            kelasId,
            selectedMapel.id,
            selectedGuru.id,
            tanggalUjian,
            waktuUjian,
            link,
            true // enableBlocking by default
          )
        )
      );

      const successMsg = `Berhasil mempublikasikan ujian untuk ${selectedKelasIds.length} kelas!`;

      if (Platform.OS === 'web') {
        alert(successMsg);
        router.replace({
          pathname: '/teacher/dashboard',
          params: { guruId, guruNama },
        });
      } else {
        Alert.alert('Berhasil', successMsg, [
          {
            text: 'OK',
            onPress: () => {
              router.replace({
                pathname: '/teacher/dashboard',
                params: { guruId, guruNama },
              });
            },
          },
        ]);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Gagal', 'Terjadi kesalahan sistem saat menyimpan jadwal ujian.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.activeTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.backgroundElement} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.replace({
              pathname: '/teacher/dashboard',
              params: { guruId, guruNama },
            })}
          >
            <Text style={styles.backButtonText}>◀ Dashboard</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>BUAT UJIAN BARU</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Input Card */}
        <View style={styles.formCard}>
          
          <Text style={styles.label}>Mata Pelajaran</Text>
          {Platform.OS === 'web' ? (
            <div style={{ position: 'relative', width: '100%', pointerEvents: 'auto' }}>
              <select
                value={selectedMapel?.id || ''}
                onChange={(e) => {
                  const found = mapels.find(m => m.id === e.target.value);
                  setSelectedMapel(found || null);
                }}
                style={{
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  borderWidth: '1.5px',
                  borderStyle: 'solid',
                  borderRadius: '12px',
                  color: theme.text,
                  padding: '12px 36px 12px 16px',
                  fontSize: '15px',
                  fontWeight: '600',
                  height: '46px',
                  width: '100%',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  pointerEvents: 'auto',
                }}
              >
                <option value="" disabled style={{ backgroundColor: theme.backgroundElement, color: theme.textMuted }}>Pilih Mapel</option>
                {mapels.map((item, idx) => (
                  <option key={`${item.id}-${idx}`} value={item.id} style={{ backgroundColor: theme.backgroundElement, color: theme.text }}>
                    {item.nama_mapel} ({item.singkatan})
                  </option>
                ))}
              </select>
              <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: theme.textMuted, fontSize: '12px', pointerEvents: 'none' }}>▼</span>
            </div>
          ) : (
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setMapelModalVisible(true)}
            >
              <Text style={selectedMapel ? styles.dropdownText : styles.placeholderText}>
                {selectedMapel ? `${selectedMapel.nama_mapel} (${selectedMapel.singkatan})` : 'Pilih Mapel'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.label}>Guru Pengampu</Text>
          {Platform.OS === 'web' ? (
            <div style={{ position: 'relative', width: '100%', pointerEvents: 'auto' }}>
              <select
                value={selectedGuru?.id || ''}
                onChange={(e) => {
                  const found = gurus.find(g => g.id === e.target.value);
                  setSelectedGuru(found || null);
                }}
                style={{
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  borderWidth: '1.5px',
                  borderStyle: 'solid',
                  borderRadius: '12px',
                  color: theme.text,
                  padding: '12px 36px 12px 16px',
                  fontSize: '15px',
                  fontWeight: '600',
                  height: '46px',
                  width: '100%',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  pointerEvents: 'auto',
                }}
              >
                <option value="" disabled style={{ backgroundColor: theme.backgroundElement, color: theme.textMuted }}>Pilih Guru</option>
                {gurus.map((item, idx) => (
                  <option key={`${item.id}-${idx}`} value={item.id} style={{ backgroundColor: theme.backgroundElement, color: theme.text }}>
                    {item.nama_guru}
                  </option>
                ))}
              </select>
              <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: theme.textMuted, fontSize: '12px', pointerEvents: 'none' }}>▼</span>
            </div>
          ) : (
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => {
                setGuruSearchQuery('');
                setGuruModalVisible(true);
              }}
            >
              <Text style={selectedGuru ? styles.dropdownText : styles.placeholderText}>
                {selectedGuru ? selectedGuru.nama_guru : 'Pilih Guru'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.label}>Link Google Form</Text>
          <TextInput
            style={styles.input}
            value={link}
            onChangeText={setLink}
            placeholder="https://docs.google.com/forms/d/..."
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            keyboardType="url"
          />

          <Text style={styles.label}>Tanggal Ujian</Text>
          {Platform.OS === 'web' ? (
            <div style={{ position: 'relative', width: '100%', pointerEvents: 'auto', marginBottom: 16 }}>
              <input
                type="date"
                value={tanggalUjian}
                onChange={(e) => setTanggalUjian(e.target.value)}
                style={{
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  borderWidth: '1.5px',
                  borderStyle: 'solid',
                  borderRadius: '12px',
                  color: theme.text,
                  padding: '12px 16px',
                  fontSize: '15px',
                  fontWeight: '600',
                  height: '46px',
                  width: '100%',
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                  colorScheme: theme.activeTheme === 'dark' ? 'dark' : 'light',
                }}
              />
            </div>
          ) : (
            <TouchableOpacity 
              style={styles.pickerButton} 
              onPress={() => setDateTimePickerVisible(true)}
            >
              <Text style={styles.pickerButtonText}>
                📅 {tanggalUjian ? formatIndonesianDate(tanggalUjian) : 'Pilih Tanggal'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.label}>Waktu Ujian</Text>
          {Platform.OS === 'web' ? (
            <div style={{ position: 'relative', width: '100%', pointerEvents: 'auto', marginBottom: 16 }}>
              <input
                type="time"
                value={waktuUjian}
                onChange={(e) => setWaktuUjian(e.target.value)}
                style={{
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  borderWidth: '1.5px',
                  borderStyle: 'solid',
                  borderRadius: '12px',
                  color: theme.text,
                  padding: '12px 16px',
                  fontSize: '15px',
                  fontWeight: '600',
                  height: '46px',
                  width: '100%',
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                  colorScheme: theme.activeTheme === 'dark' ? 'dark' : 'light',
                }}
              />
            </div>
          ) : (
            <TouchableOpacity 
              style={styles.pickerButton} 
              onPress={() => setDateTimePickerVisible(true)}
            >
              <Text style={styles.pickerButtonText}>
                🕒 {waktuUjian ? waktuUjian.substring(0, 5) : 'Pilih Waktu'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          )}

          {/* Tabular Matrix Checklist Kelas */}
          <Text style={styles.label}>Target Kelas (Pilih Banyak)</Text>
          <View style={styles.matrixContainer}>
            
            {/* Tab Bar Tingkat */}
            {uniqueTingkats.length > 0 && (
              <View style={styles.tabBar}>
                {uniqueTingkats.map((tingkat) => {
                  const isActive = activeTingkat === tingkat;
                  const selectedCount = kelasList.filter(
                    k => k.tingkat === tingkat && selectedKelasIds.includes(k.id)
                  ).length;

                  return (
                    <TouchableOpacity
                      key={tingkat}
                      style={[
                        styles.tabButton,
                        isActive && styles.tabButtonActive
                      ]}
                      onPress={() => setActiveTingkat(tingkat)}
                    >
                      <Text style={[
                        styles.tabText,
                        isActive && styles.tabTextActive
                      ]}>
                        Tingkat {tingkat}
                      </Text>
                      {selectedCount > 0 && (
                        <View style={styles.tabBadge}>
                          <Text style={styles.tabBadgeText}>{selectedCount}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Select All active tingkat */}
            {filteredClasses.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.globalSelectButton,
                  isAllActiveSelected && styles.globalSelectButtonActive
                ]}
                onPress={toggleSelectAllTingkat}
              >
                <Text style={[
                  styles.globalSelectText,
                  isAllActiveSelected && styles.globalSelectTextActive
                ]}>
                  {isAllActiveSelected 
                    ? `☑ Batalkan Semua Pilihan Tingkat ${activeTingkat}` 
                    : `☐ Pilih Semua Kelas Tingkat ${activeTingkat}`}
                </Text>
              </TouchableOpacity>
            )}

            {/* Checkbox grid direct list for active tingkat */}
            <View style={styles.classGrid}>
              {filteredClasses.map((kelas) => {
                const isSelected = selectedKelasIds.includes(kelas.id);
                return (
                  <TouchableOpacity
                    key={kelas.id}
                    style={[
                      styles.classChip,
                      isSelected && styles.classChipSelected
                    ]}
                    onPress={() => toggleKelas(kelas.id)}
                  >
                    <View style={styles.chipCheckboxRow}>
                      <View style={[
                        styles.customCheckboxIndicator,
                        isSelected && styles.customCheckboxIndicatorActive
                      ]}>
                        {isSelected && <Text style={styles.checkmarkIcon}>✓</Text>}
                      </View>
                      <Text style={[
                        styles.classChipText,
                        isSelected && styles.classChipTextSelected
                      ]}>
                        {kelas.nama_kelas}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Publish Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!selectedMapel || !selectedGuru || !link || selectedKelasIds.length === 0 || !tanggalUjian || !waktuUjian) && styles.submitButtonDisabled,
            ]}
            disabled={loading || !selectedMapel || !selectedGuru || !link || selectedKelasIds.length === 0 || !tanggalUjian || !waktuUjian}
            onPress={handleSave}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>PUBLIKASIKAN UJIAN</Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* MAPEL PICKER MODAL */}
      <Modal
        visible={mapelModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMapelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Mata Pelajaran</Text>
              <TouchableOpacity onPress={() => setMapelModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={mapels}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedMapel?.id === item.id && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setSelectedMapel(item);
                    setMapelModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.nama_mapel} ({item.singkatan})</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* GURU PICKER MODAL */}
      <Modal
        visible={guruModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setGuruModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Guru Pengampu</Text>
              <TouchableOpacity onPress={() => setGuruModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalSearchInput}
              value={guruSearchQuery}
              onChangeText={setGuruSearchQuery}
              placeholder="Cari nama guru..."
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
            />
            <FlatList
              data={gurus.filter((g) => g.nama_guru.toLowerCase().includes(guruSearchQuery.toLowerCase()))}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedGuru?.id === item.id && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setSelectedGuru(item);
                    setGuruModalVisible(false);
                    setGuruSearchQuery('');
                  }}
                >
                  <Text style={styles.modalItemText}>{item.nama_guru}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: theme.textMuted, fontSize: 14 }}>Tidak ada guru yang cocok.</Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
      {/* DateTime Picker Modal */}
      <DateTimePicker
        visible={dateTimePickerVisible}
        onClose={() => setDateTimePickerVisible(false)}
        onConfirm={handleConfirmDateTime}
        currentDate={tanggalUjian}
        currentTime={waktuUjian}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 40,
    width: '100%',
  },
  headerBar: {
    width: '100%',
    maxWidth: 600,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: theme.backgroundSelected,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  backButtonText: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: 1,
  },
  formCard: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: theme.backgroundElement,
    borderRadius: 24,
    padding: 24,
    shadowColor: theme.cardShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
    borderWidth: 1,
    borderColor: theme.border,
  },
  label: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 15,
  },
  input: {
    backgroundColor: theme.background,
    borderColor: theme.border,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: theme.text,
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownButton: {
    backgroundColor: theme.background,
    borderColor: theme.border,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '600',
  },
  placeholderText: {
    color: theme.textMuted,
    fontSize: 15,
  },
  dropdownArrow: {
    color: theme.textMuted,
    fontSize: 12,
  },
  submitButton: {
    backgroundColor: theme.success,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 30,
    shadowColor: theme.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: theme.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
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
    borderWidth: 1,
    borderColor: theme.border,
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
    color: theme.textMuted,
    fontWeight: 'bold',
  },
  modalSearchInput: {
    backgroundColor: theme.background,
    borderColor: theme.border,
    borderWidth: 1.5,
    borderRadius: 10,
    color: theme.text,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 15,
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
    color: theme.textSecondary,
    fontWeight: '600',
  },
  // Tab Bar specific styles
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.background,
    borderRadius: 14,
    padding: 6,
    marginBottom: 20,
    gap: 6,
    width: '100%',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'transparent',
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: theme.backgroundSelected,
    borderColor: theme.border,
    borderWidth: 1,
  },
  tabText: {
    color: theme.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: theme.success,
  },
  tabBadge: {
    backgroundColor: theme.success,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
  // Checkbox Matrix specific styles
  matrixContainer: {
    width: '100%',
    marginTop: 10,
  },
  globalSelectButton: {
    backgroundColor: theme.background,
    borderColor: theme.border,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  globalSelectButtonActive: {
    borderColor: theme.success,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(5, 150, 105, 0.08)',
  },
  globalSelectText: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  globalSelectTextActive: {
    color: theme.success,
  },
  majorSection: {
    backgroundColor: theme.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderColor: theme.border,
    borderWidth: 1,
  },
  majorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 8,
  },
  majorTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  majorSelectAllBtn: {
    backgroundColor: theme.backgroundSelected,
    borderColor: theme.border,
    borderWidth: 1.2,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  majorSelectAllBtnActive: {
    backgroundColor: theme.success,
    borderColor: theme.success,
  },
  majorSelectAllText: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  majorSelectAllTextActive: {
    color: '#FFF',
  },
  classGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  classChip: {
    backgroundColor: theme.background,
    borderColor: theme.border,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: '29%',
    flexGrow: 1,
    marginBottom: 4,
  },
  classChipSelected: {
    borderColor: theme.success,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(5, 150, 105, 0.08)',
  },
  chipCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customCheckboxIndicator: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  customCheckboxIndicatorActive: {
    borderColor: theme.success,
    backgroundColor: theme.success,
  },
  checkmarkIcon: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
  },
  classChipText: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  classChipTextSelected: {
    color: theme.text,
  },
  pickerButton: {
    backgroundColor: theme.background,
    borderColor: theme.border,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    height: 48,
    marginBottom: 16,
  },
  pickerButtonText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '600',
  },
  pickerSubLabel: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerYearRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  pickerYearBtn: {
    flex: 1,
    backgroundColor: theme.background,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  pickerMonthBtn: {
    width: '23%',
    backgroundColor: theme.background,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  pickerDayBtn: {
    width: '12%',
    backgroundColor: theme.background,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  pickerHourBtn: {
    width: '14.5%',
    backgroundColor: theme.background,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  pickerMinuteBtn: {
    width: '23%',
    backgroundColor: theme.background,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  pickerBtnActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  pickerBtnText: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  pickerBtnTextActive: {
    color: '#FFF',
    fontWeight: '800',
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  pickerGridDay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  pickerGridHour: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  pickerGridMinute: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  pickerCancelBtn: {
    flex: 1,
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(220, 38, 38, 0.08)',
    borderColor: theme.danger,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  pickerCancelBtnText: {
    color: theme.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  pickerConfirmBtn: {
    flex: 1,
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  pickerConfirmBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  timePreviewContainer: {
    backgroundColor: theme.background,
    borderColor: theme.primary,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  timePreviewText: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  fineTuneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.background,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  fineTuneBtn: {
    backgroundColor: theme.backgroundSelected,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  fineTuneBtnText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  fineTuneValue: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '800',
  },
});
