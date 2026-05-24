import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Animated,
} from 'react-native';

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
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header Icon */}
          <Animated.View style={[styles.iconWrapper, { opacity: isDone ? 1 : pulseAnim }]}>
            <Text style={styles.icon}>{isDone ? '✅' : '📥'}</Text>
          </Animated.View>

          {/* Title */}
          <Text style={styles.title}>
            {isDone ? 'Import Selesai!' : `Mengimpor ${label}...`}
          </Text>

          {/* Count info */}
          <Text style={styles.countText}>
            {current} <Text style={styles.countSep}>/</Text> {total} baris
          </Text>

          {/* Progress Bar Track */}
          <View style={styles.barTrack}>
            <Animated.View
              style={[
                styles.barFill,
                { width: barWidth },
                isDone && styles.barFillDone,
              ]}
            />
          </View>

          {/* Percent label */}
          <Text style={[styles.percentText, isDone && styles.percentDone]}>
            {percent}%
          </Text>

          {/* Status text */}
          {statusText ? (
            <Text style={styles.statusText}>{statusText}</Text>
          ) : (
            <Text style={styles.statusText}>
              {isDone
                ? 'Semua data berhasil disimpan ke database.'
                : 'Mohon tunggu, jangan tutup halaman ini...'}
            </Text>
          )}

          {/* Shimmer Steps */}
          <View style={styles.stepsRow}>
            {['Baca File', 'Validasi', 'Simpan ke DB', 'Selesai'].map((step, idx) => {
              const stepPercent = idx * 33;
              const isActive = percent >= stepPercent;
              return (
                <View key={idx} style={styles.stepItem}>
                  <View style={[styles.stepDot, isActive && styles.stepDotActive]}>
                    {isActive && <Text style={styles.stepCheck}>✓</Text>}
                  </View>
                  <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>
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
    backgroundColor: 'rgba(10, 16, 30, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    elevation: 20,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  icon: {
    fontSize: 30,
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  countText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 18,
  },
  countSep: {
    color: '#334155',
  },
  barTrack: {
    width: '100%',
    height: 10,
    backgroundColor: '#0F172A',
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#253047',
  },
  barFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: '#6366F1',
  },
  barFillDone: {
    backgroundColor: '#10B981',
  },
  percentText: {
    color: '#3B82F6',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  percentDone: {
    color: '#10B981',
  },
  statusText: {
    color: '#64748B',
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
    borderTopColor: '#253047',
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
    borderColor: '#334155',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  stepCheck: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
  },
  stepLabel: {
    color: '#475569',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  stepLabelActive: {
    color: '#94A3B8',
  },
});
