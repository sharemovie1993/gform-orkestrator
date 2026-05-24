import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  BackHandler,
  Alert,
  Keyboard,
  Vibration,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StorageService } from '@/services/storage';
import { useTheme } from '@/hooks/use-theme';

export default function BlockedScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [reason, setReason] = useState('Membuka aplikasi lain / Keluar halaman ujian');
  const [isFocused, setIsFocused] = useState(false);

  // Disable hardware back button on Android
  useEffect(() => {
    const onBackPress = () => {
      // Return true to prevent default back action
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    // Fetch the block reason
    StorageService.getBlockedReason().then((res) => {
      if (res) setReason(res);
    });

    return () => {
      backHandler.remove();
    };
  }, []);

  const handleUnlock = async () => {
    if (pin.length < 4) {
      setError('PIN harus minimal 4 digit.');
      return;
    }

    Keyboard.dismiss();
    const isValid = await StorageService.validatePin(pin);

    if (isValid) {
      // Reset blocking status
      await StorageService.setBlocked(false);
      if (Platform.OS === 'web') {
        alert('Aplikasi telah dibuka kunci. Silakan melanjutkan.');
        router.replace('/');
      } else {
        Alert.alert('Berhasil', 'Aplikasi telah dibuka kunci. Silakan melanjutkan.', [
          { text: 'OK', onPress: () => router.replace('/') },
        ]);
      }
    } else {
      Vibration.vibrate(200);
      setError('PIN Pengawas Salah!');
      setPin('');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.danger }]}>
        <View style={[styles.iconContainer, { backgroundColor: theme.activeTheme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(220, 38, 38, 0.08)' }]}>
          <Text style={styles.icon}>⚠️</Text>
        </View>

        <Text style={[styles.title, { color: theme.danger }]}>UJIAN TERKUNCI</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Terdeteksi Percobaan Keluar Aplikasi</Text>

        <View style={[styles.reasonBox, { backgroundColor: theme.background, borderLeftColor: theme.danger }]}>
          <Text style={[styles.reasonLabel, { color: theme.textMuted }]}>Penyebab Kunci:</Text>
          <Text style={[styles.reasonText, { color: theme.text }]}>{reason}</Text>
        </View>

        <Text style={[styles.instruction, { color: theme.textSecondary }]}>
          Hubungi Pengawas Ujian untuk memasukkan PIN pembuka langsung di perangkat ini.
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.pinInput,
              { backgroundColor: theme.background, borderColor: theme.border, color: theme.text },
              isFocused && [styles.pinInputFocused, { borderColor: theme.danger }],
              Platform.select({
                web: {
                  outlineStyle: 'none',
                } as any,
              }),
            ]}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            value={pin}
            onChangeText={(text) => {
              setPin(text.replace(/[^0-9]/g, ''));
              setError('');
            }}
            placeholder="Masukkan PIN Pengawas"
            placeholderTextColor={theme.textMuted}
            keyboardType="number-pad"
            maxLength={6}
            secureTextEntry={true}
          />
        </View>

        {error ? <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text> : null}

        <TouchableOpacity style={[styles.unlockButton, { backgroundColor: theme.danger }]} onPress={handleUnlock}>
          <Text style={styles.unlockButtonText}>BUKA KUNCI</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
    }),
    elevation: 8,
    borderWidth: 1,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 25,
    textAlign: 'center',
  },
  reasonBox: {
    width: '100%',
    borderRadius: 12,
    padding: 15,
    marginBottom: 25,
    borderLeftWidth: 4,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  instruction: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 10,
  },
  pinInput: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 8,
  },
  pinInputFocused: {
    ...Platform.select({
      web: {
        boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.25)',
      } as any,
    }),
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  unlockButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
    marginTop: 10,
  },
  unlockButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
