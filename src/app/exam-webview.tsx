import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  BackHandler,
  Alert,
  AppState,
  AppStateStatus,
  ActivityIndicator,
  StatusBar,
  Platform,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as ScreenCapture from 'expo-screen-capture';
import { StorageService } from '@/services/storage';
import { Siswa } from '@/services/supabase';

export default function ExamWebviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawUrl = params.url as string;
  const examId = params.examId as string;
  
  // Safe URL Decode
  const getDecodedUrl = (input: string) => {
    if (!input) return '';
    try {
      return decodeURIComponent(input);
    } catch (e) {
      return input;
    }
  };

  // Google Forms URL Normalizer (Force Iframe-safe embedding)
  const normalizeExamUrl = (rawUrlStr: string) => {
    let processed = getDecodedUrl(rawUrlStr).trim();
    if (!processed) return '';

    // If it's a Google Forms link, ensure it is iframe-embeddable
    if (processed.includes('docs.google.com/forms')) {
      // Convert /edit to /viewform
      if (processed.includes('/edit')) {
        processed = processed.replace(/\/edit(\?.*)?$/, '/viewform');
      }
      
      // Ensure embedded=true parameter exists
      if (!processed.includes('embedded=true')) {
        if (processed.includes('?')) {
          processed = `${processed}&embedded=true`;
        } else {
          processed = `${processed}?embedded=true`;
        }
      }
    }
    return processed;
  };

  const url = normalizeExamUrl(rawUrl);
  const mapelName = params.mapelName as string;
  const enableBlockingParam = params.enableBlocking as string;
  
  const [isBlockingEnabled, setIsBlockingEnabled] = useState(false);
  const [isLoadingWeb, setIsLoadingWeb] = useState(true);
  const appState = useRef(AppState.currentState);
  const [studentSession, setStudentSession] = useState<Siswa | null>(null);

  // Fetch active student session on mount
  useEffect(() => {
    const loadSession = async () => {
      const session = await StorageService.getStudentSession();
      setStudentSession(session);
    };
    loadSession();
  }, []);

  // Custom Modal States
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'info' | 'warning';
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'Ya',
    cancelText: 'Batal',
    onConfirm: () => {},
  });

  const showCustomConfirm = (
    title: string,
    message: string,
    type: 'info' | 'warning',
    confirmText: string,
    cancelText: string,
    onConfirm: () => void
  ) => {
    setModalConfig({
      visible: true,
      title,
      message,
      type,
      confirmText,
      cancelText,
      onConfirm: () => {
        setModalConfig(prev => ({ ...prev, visible: false }));
        onConfirm();
      },
    });
  };

  const showCustomAlert = (
    title: string,
    message: string,
    type: 'info' | 'warning',
    onConfirm?: () => void
  ) => {
    setModalConfig({
      visible: true,
      title,
      message,
      type,
      confirmText: 'Mengerti',
      cancelText: '',
      onConfirm: () => {
        setModalConfig(prev => ({ ...prev, visible: false }));
        if (onConfirm) onConfirm();
      },
    });
  };

  // Initialize blocking state by checking both local exam param and global cheat blocking setting
  useEffect(() => {
    const checkBlocking = async () => {
      const globalBlocking = await StorageService.getCachedCheatBlocking();
      const examBlocking = enableBlockingParam !== 'false';
      setIsBlockingEnabled(globalBlocking && examBlocking);
    };
    checkBlocking();
  }, [enableBlockingParam]);

  // Enable Screen Security & Listen to App State Transitions
  useEffect(() => {
    // 1. Prevent Screenshots & Screen Recording
    const enableSecurity = async () => {
      if (Platform.OS === 'web') return;
      try {
        if (isBlockingEnabled) {
          await ScreenCapture.preventScreenCaptureAsync();
        } else {
          await ScreenCapture.allowScreenCaptureAsync();
        }
      } catch (e) {
        console.error('Failed to adjust screen capture protection:', e);
      }
    };
    enableSecurity();

    // 2. Intercept Android Back Button
    const onBackPress = () => {
      if (!isBlockingEnabled) {
        showCustomConfirm(
          'Keluar Ujian?',
          'Apakah Anda yakin ingin keluar dari halaman ujian ini?',
          'info',
          'Keluar',
          'Batal',
          () => {
            router.replace('/');
          }
        );
        return true;
      }

      showCustomConfirm(
        'Peringatan Keras!',
        'Menutup halaman ini secara manual akan MEMBLOKIR aplikasi dan Anda memerlukan PIN pengawas untuk membukanya kembali.',
        'warning',
        'Keluar & Blokir',
        'Batal',
        async () => {
          await StorageService.setBlocked(true, 'Menutup halaman ujian secara paksa (tombol kembali)');
          router.replace('/blocked');
        }
      );
      return true; // Intercept
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    // 3. Monitor App Lifecycle (Focus Loss / Minimize / Notification Draw)
    let subscription: any;
    if (isBlockingEnabled) {
      const handleAppStateChange = async (nextAppState: AppStateStatus) => {
        console.log('App state changed to:', nextAppState);
        
        if (
          appState.current === 'active' && 
          (nextAppState === 'background' || nextAppState === 'inactive')
        ) {
          console.log('Cheat detected: App went to background/inactive');
          
          await StorageService.setBlocked(
            true,
            'Membuka aplikasi lain, membagi layar, atau membuka panel notifikasi'
          );
          
          backHandler.remove();
          if (subscription) subscription.remove();
          
          router.replace('/blocked');
        }
        appState.current = nextAppState;
      };

      subscription = AppState.addEventListener('change', handleAppStateChange);
    }

    return () => {
      // Allow screen capture again when exiting the exam screen
      if (Platform.OS !== 'web') {
        ScreenCapture.allowScreenCaptureAsync().catch(() => {});
      }
      backHandler.remove();
      if (subscription) subscription.remove();
    };
  }, [isBlockingEnabled]);

  // Web browser protection listeners (tab switching, window blurring/minimizing)
  useEffect(() => {
    if (Platform.OS !== 'web' || !isBlockingEnabled) return;

    let isBlockedActionFired = false;

    const blockUser = async (reasonText: string) => {
      if (isBlockedActionFired) return;
      isBlockedActionFired = true;
      console.log(`Cheat detected on Web: ${reasonText}`);
      await StorageService.setBlocked(true, reasonText);
      router.replace('/blocked');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        blockUser('Membuka tab lain, jendela lain, atau memperkecil browser');
      }
    };

    const handleBlur = () => {
      // Small timeout to prevent false positives when clicking inside iframe
      setTimeout(() => {
        if (document.activeElement?.tagName !== 'IFRAME' && !isBlockedActionFired) {
          blockUser('Pindah fokus jendela browser (klik di luar area ujian)');
        }
      }, 300);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isBlockingEnabled]);

  const handleEndExam = () => {
    // Phase 1: Critical warning checking Google Forms submission
    showCustomConfirm(
      'Perhatian Penting! ⚠️',
      'Aplikasi ini hanyalah pengaman ujian. Menekan tombol selesai di sini TIDAK otomatis mengirimkan jawaban Anda.\n\nPastikan Anda sudah mengklik tombol "KIRIM" (SUBMIT) di bagian paling bawah lembar soal Google Form Anda terlebih dahulu!',
      'warning',
      'Sudah Kirim di G-Form',
      'Periksa Kembali',
      () => {
        // Phase 2: Final confirmation to close session with premium fade transition
        setTimeout(() => {
          showCustomConfirm(
            'Konfirmasi Keluar',
            'Apakah Anda sudah sangat yakin jawaban Anda terkirim di Google Form dan ingin menutup halaman ujian ini?',
            'info',
            'Ya, Keluar',
            'Batal',
            () => {
              if (examId) {
                const studentId = studentSession?.id || 'guest';
                StorageService.markExamAsCompleted(examId, studentId).then(() => {
                  router.replace('/');
                }).catch((err) => {
                  console.error('Failed to mark exam as completed:', err);
                  router.replace('/');
                });
              } else {
                router.replace('/');
              }
            }
          );
        }, 150);
      }
    );
  };

  // Restrict navigation to prevent students from googling or navigating to external sites
  const handleShouldStartLoad = (request: any) => {
    const targetUrl = request.url.toLowerCase();
    
    // Allowed domains: Google Forms, Google login/auth pages
    const isAllowed = 
      targetUrl.includes('docs.google.com/forms') || 
      targetUrl.includes('accounts.google.com') ||
      targetUrl.includes('google.com/accounts') ||
      targetUrl.includes('ssl.gstatic.com') || // Google resources
      targetUrl.includes('lh3.googleusercontent.com'); // Google user content

    if (!isAllowed) {
      showCustomAlert(
        'Akses Diblokir!',
        'Anda tidak diizinkan membuka link di luar Google Form ujian!',
        'warning'
      );
      return false; // Blocks navigation
    }
    return true; // Allows navigation
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />
      
      {/* Secure Exam Header */}
      <View style={styles.header}>
        <View style={[styles.secureBadge, !isBlockingEnabled && { borderColor: '#94A3B8', backgroundColor: 'rgba(148, 163, 184, 0.1)' }]}>
          <Text style={styles.secureIcon}>{isBlockingEnabled ? '🔒' : '🔓'}</Text>
          <Text style={[styles.secureText, !isBlockingEnabled && { color: '#94A3B8' }]}>
            {isBlockingEnabled ? 'Secure Browser' : 'Standard Browser'}
          </Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {mapelName}
        </Text>
        <TouchableOpacity style={styles.endButton} onPress={handleEndExam}>
          <Text style={styles.endButtonText}>Selesai</Text>
        </TouchableOpacity>
      </View>

      {/* WebView Loader */}
      {isLoadingWeb && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loaderText}>Memuat Halaman Soal...</Text>
        </View>
      )}

      {/* Embedded Google Form Component */}
      {Platform.OS === 'web' ? (
        <iframe
          src={url}
          style={{
            flex: 1,
            borderWidth: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#FFFFFF',
          }}
          onLoad={() => setIsLoadingWeb(false)}
          title={mapelName || 'Ujian'}
        />
      ) : (
        <WebView
          source={{ uri: url }}
          style={styles.webview}
          onLoadStart={() => setIsLoadingWeb(true)}
          onLoadEnd={() => setIsLoadingWeb(false)}
          allowsBackForwardNavigationGestures={false} // Prevent swiping back on iOS
          domStorageEnabled={true}
          javaScriptEnabled={true}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          // Force desktop viewport or customized settings if needed, here standard responsive mobile is best for forms
          mixedContentMode="always"
          incognito={true} // Runs in private session to prevent cookie leakage
        />
      )}

      {/* Custom Premium Modal Dialog */}
      <Modal
        transparent={true}
        visible={modalConfig.visible}
        animationType="fade"
        onRequestClose={() => setModalConfig(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalCard,
            modalConfig.type === 'warning' ? styles.modalCardWarning : styles.modalCardInfo
          ]}>
            {/* Header Icon Badge */}
            <View style={[
              styles.modalIconBadge,
              modalConfig.type === 'warning' ? styles.modalIconBadgeWarning : styles.modalIconBadgeInfo
            ]}>
              <Text style={styles.modalIconText}>
                {modalConfig.type === 'warning' ? '🚨' : '✅'}
              </Text>
            </View>

            {/* Title */}
            <Text style={[
              styles.modalTitleText,
              modalConfig.type === 'warning' ? styles.modalTitleWarning : styles.modalTitleInfo
            ]}>
              {modalConfig.title}
            </Text>

            {/* Message */}
            <Text style={styles.modalMessageText}>
              {modalConfig.message}
            </Text>

            {/* Action Buttons Row */}
            <View style={styles.modalButtonsRow}>
              {/* Cancel Button */}
              {!!modalConfig.cancelText && (
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setModalConfig(prev => ({ ...prev, visible: false }))}
                >
                  <Text style={styles.modalCancelButtonText}>{modalConfig.cancelText}</Text>
                </TouchableOpacity>
              )}

              {/* Confirm Button */}
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  modalConfig.type === 'warning' ? styles.modalConfirmButtonWarning : styles.modalConfirmButtonInfo
                ]}
                onPress={modalConfig.onConfirm}
              >
                <Text style={styles.modalConfirmButtonText}>{modalConfig.confirmText}</Text>
              </TouchableOpacity>
            </View>
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
  header: {
    height: 60,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  secureIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  secureText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 10,
  },
  endButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  endButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loaderText: {
    color: '#94A3B8',
    marginTop: 15,
    fontSize: 14,
    fontWeight: '600',
  },
  // Custom Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 15, 30, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalCardInfo: {
    borderColor: '#10B981',
    shadowColor: '#10B981',
  },
  modalCardWarning: {
    borderColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  modalIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
  },
  modalIconBadgeInfo: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  modalIconBadgeWarning: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  modalIconText: {
    fontSize: 24,
  },
  modalTitleText: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  modalTitleInfo: {
    color: '#10B981',
  },
  modalTitleWarning: {
    color: '#EF4444',
  },
  modalMessageText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  modalCancelButtonText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  modalConfirmButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmButtonInfo: {
    backgroundColor: '#10B981',
  },
  modalConfirmButtonWarning: {
    backgroundColor: '#EF4444',
  },
  modalConfirmButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

