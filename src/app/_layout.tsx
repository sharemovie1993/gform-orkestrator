import { Stack } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { 
  ThemeProvider, 
  DarkTheme as NavDarkTheme, 
  DefaultTheme as NavDefaultTheme 
} from '@react-navigation/native';
import { ThemeContextProvider, useThemeContext } from '@/context/ThemeContext';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  ActivityIndicator, 
  ScrollView, 
  Platform, 
  StatusBar 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// E2E Licensing Server Configuration (Testing on port 5001)
const LICENSE_SERVER_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:5001' 
  : 'http://localhost:5001';

// Pure JS Base64 JWT Decoder (Graceful Offline Expiration Fallback)
function decodeJWT(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = base64.replace(/=+$/, '');
    let output = '';
    
    let buffer = 0;
    for (let bc = 0, idx = 0; idx < str.length; ) {
      const char = str.charAt(idx++);
      const charIdx = chars.indexOf(char);
      if (charIdx === -1) continue;
      buffer = bc % 4 ? buffer * 64 + charIdx : charIdx;
      if (bc++ % 4) {
        output += String.fromCharCode(255 & (buffer >> ((-2 * bc) & 6)));
      }
    }
    return JSON.parse(output);
  } catch (e) {
    return null;
  }
}

function InnerLayout() {
  const { activeTheme } = useThemeContext();

  // Licensing States
  const [licenseStatus, setLicenseStatus] = useState<'checking' | 'locked' | 'unlocked'>('checking');
  const [pendingKey, setPendingKey] = useState<string>('');
  
  // Inputs
  const [requestSchoolName, setRequestSchoolName] = useState<string>('');
  const [manualKeyInput, setManualKeyInput] = useState<string>('');
  
  // Visual states
  const [isRequesting, setIsRequesting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [schoolBoundName, setSchoolBoundName] = useState<string>('');
  const [licenseExpiry, setLicenseExpiry] = useState<string>('');

  // 1. Initial Check on Mount
  useEffect(() => {
    checkLicense();
  }, []);

  const checkLicense = async () => {
    try {
      const token = await AsyncStorage.getItem('@license_token');
      if (token) {
        // Try online validation
        try {
          const res = await fetch(`${LICENSE_SERVER_URL}/api/license/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
          });
          const data = await res.json();
          
          if (data.success) {
            setSchoolBoundName(data.data.school_name || '');
            setLicenseExpiry(data.data.expires_at || '');
            setLicenseStatus('unlocked');
            return;
          }
        } catch (onlineErr) {
          // Offline Fallback check expiration in JWT payload locally
          const decoded = decodeJWT(token);
          if (decoded && decoded.expires_at) {
            const todayStr = new Date().toISOString().slice(0, 10);
            if (decoded.expires_at >= todayStr) {
              setSchoolBoundName(decoded.school_name || '');
              setLicenseExpiry(decoded.expires_at || '');
              setLicenseStatus('unlocked');
              return;
            }
          }
        }
      }

      // Check if waiting for pending approval
      const savedPendingKey = await AsyncStorage.getItem('@license_pending_key');
      if (savedPendingKey) {
        setPendingKey(savedPendingKey);
      }
      setLicenseStatus('locked');
    } catch (err) {
      setLicenseStatus('locked');
    }
  };

  // 2. Polling for Pending QRIS approval
  useEffect(() => {
    let intervalId: any = null;
    
    if (pendingKey) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`${LICENSE_SERVER_URL}/api/license/check/${pendingKey}`);
          const data = await res.json();
          
          if (data.success && data.status === 'active' && data.token) {
            // Unlocked via Admin Dashboard! Save Token!
            await AsyncStorage.setItem('@license_token', data.token);
            await AsyncStorage.removeItem('@license_pending_key');
            setPendingKey('');
            setLicenseStatus('unlocked');
            alert('Aktivasi Sukses! Pembayaran QRIS Anda disetujui Admin. Aplikasi terbuka.');
            clearInterval(intervalId);
          }
        } catch (err) {
          console.log('[POLLING ERROR]', err);
        }
      }, 5000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [pendingKey]);

  // 3. Action Handlers
  const handleRequestActivation = async () => {
    if (!requestSchoolName.trim()) {
      setErrorMessage('Nama Sekolah / Lembaga wajib diisi.');
      return;
    }
    
    setIsRequesting(true);
    setErrorMessage('');
    
    try {
      const res = await fetch(`${LICENSE_SERVER_URL}/api/license/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_name: requestSchoolName.trim(),
          device_limit: 50 // default limit devices
        })
      });
      const data = await res.json();
      
      if (data.success && data.data) {
        const generatedKey = data.data.license_key;
        await AsyncStorage.setItem('@license_pending_key', generatedKey);
        setPendingKey(generatedKey);
      } else {
        setErrorMessage(data.message || 'Gagal memproses permintaan.');
      }
    } catch (err) {
      setErrorMessage('Gagal menghubungi Server Lisensi. Cek jaringan Anda.');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleManualActivate = async () => {
    if (!manualKeyInput.trim()) {
      setErrorMessage('Masukkan Kunci Lisensi Anda.');
      return;
    }
    
    setIsRequesting(true);
    setErrorMessage('');
    
    try {
      const res = await fetch(`${LICENSE_SERVER_URL}/api/license/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: manualKeyInput.trim(),
          device_id: 'DEV-MOBILE-TEST-2026'
        })
      });
      const data = await res.json();
      
      if (data.success && data.token) {
        await AsyncStorage.setItem('@license_token', data.token);
        await AsyncStorage.removeItem('@license_pending_key');
        setLicenseStatus('unlocked');
        alert('Aktivasi manual sukses! Lisensi Anda aktif.');
      } else {
        setErrorMessage(data.message || 'Kunci lisensi tidak ditemukan atau kuota HP penuh.');
      }
    } catch (err) {
      setErrorMessage('Gagal memverifikasi lisensi secara online.');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (Platform.OS === 'web') {
      if (confirm('Batalkan antrean pembayaran QRIS saat ini?')) {
        await AsyncStorage.removeItem('@license_pending_key');
        setPendingKey('');
      }
    } else {
      await AsyncStorage.removeItem('@license_pending_key');
      setPendingKey('');
    }
  };

  // 4. Render Locked Screens
  if (licenseStatus === 'checking') {
    return (
      <View style={styles.lockContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.lockSubtitle}>Mempersiapkan Aplikasi...</Text>
      </View>
    );
  }

  if (licenseStatus === 'locked') {
    return (
      <View style={styles.lockContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          
          <View style={styles.card}>
            <Text style={styles.lockEmoji}>🛡️</Text>
            <Text style={styles.lockTitle}>ORKESTRA UJIAN</Text>
            <Text style={styles.lockSubtitle}>Sistem Proteksi Lisensi</Text>

            {pendingKey ? (
              // ── QRIS PAYMENT SCREEN ──
              <View style={styles.innerView}>
                <View style={styles.badgePending}>
                  <Text style={styles.badgePendingText}>Menunggu Pembayaran</Text>
                </View>
                
                <Text style={styles.description}>
                  Permintaan dikirim. Silakan selesaikan pembayaran QRIS berikut. Sistem akan terbuka otomatis setelah disetujui Admin.
                </Text>

                <View style={styles.keyContainer}>
                  <Text style={styles.label}>KUNCI LISENSI ANDA:</Text>
                  <Text style={styles.keyText}>{pendingKey}</Text>
                </View>

                {/* Live Static QRIS Image from Server */}
                <Image 
                  source={{ uri: `${LICENSE_SERVER_URL}/qris.png?t=${Date.now()}` }} 
                  style={styles.qrisImage}
                  resizeMode="contain"
                />

                <View style={styles.statusTextContainer}>
                  <ActivityIndicator size="small" color="#F59E0B" />
                  <Text style={styles.statusText}>Mengecek pembayaran otomatis...</Text>
                </View>

                <TouchableOpacity style={styles.btnSecondary} onPress={handleCancelRequest}>
                  <Text style={styles.btnSecondaryText}>✕ Batal &amp; Kembali</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // ── REQUEST & MANUAL INPUT FORM SCREEN ──
              <View style={styles.innerView}>
                <Text style={styles.description}>
                  Aplikasi ini terkunci. Silakan ajukan permintaan lisensi baru atau masukkan kunci lisensi manual untuk menggunakan.
                </Text>

                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                {/* Form A: Request QRIS Activation */}
                <View style={styles.formSection}>
                  <Text style={styles.sectionHeader}>1. Ajukan Aktivasi Baru</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Nama Sekolah / Lembaga" 
                    placeholderTextColor="#64748B"
                    value={requestSchoolName}
                    onChangeText={setRequestSchoolName}
                  />
                  <TouchableOpacity 
                    style={styles.btnPrimary} 
                    onPress={handleRequestActivation}
                    disabled={isRequesting}
                  >
                    {isRequesting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.btnPrimaryText}>MINTA QRIS AKTIVASI</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>ATAU</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Form B: Enter Manual Key */}
                <View style={styles.formSection}>
                  <Text style={styles.sectionHeader}>2. Aktivasi Kunci Manual</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="ORK-XXXX-XXXX-XXXX" 
                    placeholderTextColor="#64748B"
                    autoCapitalize="characters"
                    value={manualKeyInput}
                    onChangeText={setManualKeyInput}
                  />
                  <TouchableOpacity 
                    style={[styles.btnPrimary, { backgroundColor: '#10B981' }]} 
                    onPress={handleManualActivate}
                    disabled={isRequesting}
                  >
                    {isRequesting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.btnPrimaryText}>AKTIFKAN SEKARANG</Text>
                    )}
                  </TouchableOpacity>
                </View>

              </View>
            )}

            <Text style={styles.brandFooter}>powered by BARAYA TEKNOLOGI</Text>
          </View>
          
        </ScrollView>
      </View>
    );
  }

  // 5. Normal Stack Render (Unlocked)
  return (
    <ThemeProvider value={activeTheme === 'dark' ? NavDarkTheme : NavDefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="exam-list" />
        <Stack.Screen name="exam-webview" />
        <Stack.Screen name="blocked" />
        <Stack.Screen name="teacher/login" />
        <Stack.Screen name="teacher/dashboard" />
        <Stack.Screen name="teacher/create-exam" />
        <Stack.Screen name="teacher/manage-data" />
        <Stack.Screen name="teacher/settings" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeContextProvider>
      <InnerLayout />
    </ThemeContextProvider>
  );
}

// Premium visual locking stylesheets
const styles = StyleSheet.create({
  lockContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 32,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1E293B',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  lockEmoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#3B82F6',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed',
  },
  lockSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginTop: 4,
  },
  innerView: {
    width: '100%',
    alignItems: 'center',
  },
  description: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 18,
  },
  formSection: {
    width: '100%',
    marginTop: 16,
    gap: 10,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3B82F6',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: '#F8FAFC',
    fontWeight: '600',
  },
  btnPrimary: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerText: {
    color: '#475569',
    paddingHorizontal: 12,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
  },
  
  // Pending approvals QRIS styling
  badgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 14,
  },
  badgePendingText: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  keyContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 10,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: '#334155',
    width: '100%',
    alignItems: 'center',
  },
  label: {
    fontSize: 8,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  keyText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  qrisImage: {
    width: 210,
    height: 280,
    borderRadius: 18,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  statusText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  btnSecondary: {
    backgroundColor: '#334155',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    width: '100%',
  },
  btnSecondaryText: {
    color: '#CBD5E1',
    fontWeight: '800',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  brandFooter: {
    fontSize: 8,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 24,
  }
});
