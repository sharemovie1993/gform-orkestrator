import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface ImportProgressModalProps {
  visible: boolean;
  current: number;       // jumlah baris yang sudah diproses
  total: number;         // total baris
  label?: string;        // nama modul, e.g. "Siswa"
  statusText?: string;   // pesan tambahan, e.g. "Menyimpan baris ke 50..."
}

export function ImportProgressModal({
  visible,
  current,
  total,
  label = 'Data',
  statusText,
}: ImportProgressModalProps) {
  const theme = useTheme();
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const percent = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;

  // Animate progress bar width
  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: percent,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [percent]);

  // Pulse animation for the glow effect
  useEffect(() => {
    if (!visible) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [visible]);

  const barWidth = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const isDone = percent >= 100;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: theme.activeTheme === 'dark' ? 'rgba(10, 16, 30, 0.88)' : 'rgba(10, 16, 30, 0.5)' }]}>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          {/* Header Icon */}
          <Animated.View style={[
            styles.iconWrapper, 
            { 
              opacity: isDone ? 1 : pulseAnim,
              backgroundColor: theme.activeTheme === 'dark' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(37, 99, 235, 0.08)',
              borderColor: theme.activeTheme === 'dark' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(37, 99, 235, 0.2)'
            }
          ]}>
            <Text style={styles.icon}>{isDone ? '✅' : '📥'}</Text>
          </Animated.View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.text }]}>
            {isDone ? 'Import Selesai!' : `Mengimpor ${label}...`}
          </Text>

          {/* Count info */}
          <Text style={[styles.countText, { color: theme.textSecondary }]}>
            {current} <Text style={{ color: theme.border }}>/</Text> {total} baris
          </Text>

          {/* Progress Bar Track */}
          <View style={[styles.barTrack, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Animated.View
              style={[
                styles.barFill,
                { width: barWidth, backgroundColor: theme.primary },
                isDone && { backgroundColor: theme.success },
              ]}
            />
          </View>

          {/* Percent label */}
          <Text style={[styles.percentText, { color: theme.primary }, isDone && { color: theme.success }]}>
            {percent}%
          </Text>

          {/* Status text */}
          {statusText ? (
            <Text style={[styles.statusText, { color: theme.textMuted }]}>{statusText}</Text>
          ) : (
            <Text style={[styles.statusText, { color: theme.textMuted }]}>
              {isDone
                ? 'Semua data berhasil disimpan ke database.'
                : 'Mohon tunggu, jangan tutup halaman ini...'}
            </Text>
          )}

          {/* Shimmer Steps */}
          <View style={[styles.stepsRow, { borderTopColor: theme.border }]}>
            {['Baca File', 'Validasi', 'Simpan ke DB', 'Selesai'].map((step, idx) => {
              const stepPercent = idx * 33;
              const isActive = percent >= stepPercent;
              return (
                <View key={idx} style={styles.stepItem}>
                  <View style={[
                    styles.stepDot, 
                    { borderColor: theme.border },
                    isActive && [styles.stepDotActive, { backgroundColor: theme.primary, borderColor: theme.primary }]
                  ]}>
                    {isActive && <Text style={styles.stepCheck}>✓</Text>}
                  </View>
                  <Text style={[
                    styles.stepLabel, 
                    { color: theme.textMuted },
                    isActive && [styles.stepLabelActive, { color: theme.text }]
                  ]}>
                    {step}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 20,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  icon: {
    fontSize: 30,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 18,
  },
  barTrack: {
    width: '100%',
    height: 10,
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
  },
  barFill: {
    height: '100%',
    borderRadius: 99,
  },
  percentText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 4,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {},
  stepCheck: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  stepLabelActive: {},
});
