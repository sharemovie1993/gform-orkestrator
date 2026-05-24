import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DbService, LinkSoal, Siswa } from '@/services/supabase';
import { StorageService } from '@/services/storage';
import { useTheme } from '@/hooks/use-theme';

export default function ExamListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const params = useLocalSearchParams();
  const kelasId = params.kelasId as string;
  const kelasName = params.kelasName as string;

  const [exams, setExams] = useState<LinkSoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentSession, setStudentSession] = useState<Siswa | null>(null);
  const [displayedKelasName, setDisplayedKelasName] = useState<string>(kelasName || 'Daftar Ujian');
  const [isNavigating, setIsNavigating] = useState(false);
  const [completedExams, setCompletedExams] = useState<string[]>([]);

  const [refreshing, setRefreshing] = useState(false);

  const fetchExams = async () => {
    setIsNavigating(false); // Reset lock on mount
    const blocked = await StorageService.isBlocked();
    if (blocked) {
      router.replace('/blocked');
      return;
    }

    // Load student session if logged in
    const student = await StorageService.getStudentSession();
    setStudentSession(student);

    let activeKelasId = kelasId;
    let activeKelasName = kelasName;

    if (student) {
      // Enforce Route Security: Compare routing param kelasId with student's registered kelas_id
      if (student.kelas_id !== kelasId) {
        activeKelasId = student.kelas_id;
        activeKelasName = student.kelas_nama || 'Kelas';
        // Silently cache the student's correct class
        await StorageService.saveSelectedClass(activeKelasId, activeKelasName);
      }
    }

    setDisplayedKelasName(activeKelasName);

    try {
      // Fetch completed exam IDs from local storage (multi-tenant and guest simple mode compatible)
      const studentId = student?.id || 'guest';
      const completed = await StorageService.getCompletedExams(studentId);
      setCompletedExams(completed);

      const data = await DbService.getLinkSoal(activeKelasId);
      // Filter only active exam links
      const activeExams = data.filter(exam => exam.is_active !== false);
      setExams(activeExams);
    } catch (e) {
      console.error('Failed to load exams:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleReload = async () => {
    setLoading(true);
    await fetchExams();
  };

  const handlePullToRefresh = async () => {
    setRefreshing(true);
    await fetchExams();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchExams();
  }, [kelasId]);

  const handleStartExam = (exam: LinkSoal) => {
    if (isNavigating) return;
    setIsNavigating(true);

    try {
      router.push({
        pathname: '/exam-webview',
        params: { 
          examId: exam.id,
          url: encodeURIComponent(exam.google_form_link), 
          mapelName: exam.mapel_nama || 'Ujian',
          enableBlocking: String(exam.enable_blocking !== false)
        },
      });
    } catch (err) {
      console.error(err);
    } finally {
      // Safety unlock after 2 seconds
      setTimeout(() => setIsNavigating(false), 2000);
    }
  };

  const isExamAvailable = (exam: LinkSoal): boolean => {
    try {
      const dateParts = exam.tanggal_ujian.split('-');
      const timeParts = exam.waktu_ujian.split(':');
      
      if (dateParts.length !== 3 || timeParts.length < 2) {
        return true;
      }
      
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const day = parseInt(dateParts[2], 10);
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      const seconds = timeParts.length === 3 ? parseInt(timeParts[2], 10) : 0;
      
      const examDateTime = new Date(year, month, day, hours, minutes, seconds);
      const now = new Date();
      
      return now.getTime() >= examDateTime.getTime();
    } catch (e) {
      return true;
    }
  };

  const formatIndonesianDate = (dateStr: string): string => {
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      
      const dateObj = new Date(year, month, day);
      
      const namaHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const namaBulan = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      
      const hari = namaHari[dateObj.getDay()];
      const bulan = namaBulan[month];
      
      return `${hari}, ${day} ${bulan} ${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const renderExamItem = ({ item }: { item: LinkSoal }) => {
    const available = isExamAvailable(item);
    const isCompleted = completedExams.includes(item.id);

    return (
      <View style={styles.examCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.subjectIcon}>📝</Text>
          <View style={styles.subjectInfo}>
            <Text style={styles.subjectName}>{item.mapel_nama || 'Mata Pelajaran'}</Text>
            <Text style={styles.teacherName}>Oleh: {item.guru_nama || 'Guru Pengampu'}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.examDateTime}>
                📅 {formatIndonesianDate(item.tanggal_ujian)}  |  🕒 {item.waktu_ujian.substring(0, 5)}
              </Text>
              <View style={[
                styles.badge, 
                item.enable_blocking !== false ? styles.badgeLocked : styles.badgeUnlocked
              ]}>
                <Text style={[
                  styles.badgeText,
                  { color: item.enable_blocking !== false ? theme.success : theme.danger }
                ]}>
                  {item.enable_blocking !== false ? '🔒 Terkunci' : '🔓 Bebas'}
                </Text>
              </View>
              {!available && (
                <View style={[styles.badge, styles.badgeNotStarted]}>
                  <Text style={styles.badgeNotStartedText}>⏳ Belum Waktunya</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        {isCompleted ? (
          <TouchableOpacity
            style={[styles.startButton, styles.startButtonCompleted]}
            onPress={() => handleStartExam(item)}
          >
            <Text style={styles.startButtonTextCompleted}>✅ UJIAN SELESAI (Buka Kembali)</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.startButton, !available && styles.startButtonDisabled]}
            onPress={() => handleStartExam(item)}
            disabled={!available}
          >
            <Text style={[styles.startButtonText, !available && styles.startButtonTextDisabled]}>
              {available ? '🚀 MULAI UJIAN' : '⏳ BELUM DIMULAI'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.activeTheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')}>
          <Text style={styles.backButtonText}>◀ Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{displayedKelasName}</Text>
        <TouchableOpacity style={styles.reloadButton} onPress={handleReload}>
          <Text style={styles.reloadButtonText}>🔄 Segarkan</Text>
        </TouchableOpacity>
      </View>

      {/* Student Welcome Banner */}
      {studentSession && (
        <View style={styles.studentBanner}>
          <Text style={styles.studentAvatar}>👤</Text>
          <View style={styles.studentDetails}>
            <Text style={styles.studentNameText}>{studentSession.nama_siswa}</Text>
            <Text style={styles.studentMetaText}>NISN: {studentSession.nisn}  •  Kelas: {studentSession.kelas_nama || 'Aktif'}</Text>
          </View>
          <View style={styles.studentBadge}>
            <Text style={styles.studentBadgeText}>TERVERIFIKASI</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={[styles.container, styles.center]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Memuat Daftar Ujian...</Text>
        </View>
      ) : (
        <FlatList
          data={exams}
          keyExtractor={(item) => item.id}
          renderItem={renderExamItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handlePullToRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyView}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTextTitle}>Tidak Ada Ujian Aktif</Text>
              <Text style={styles.emptyTextSub}>
                Belum ada jadwal ujian Google Form yang aktif untuk kelas ini saat ini.
              </Text>
            </View>
          }
        />
      )}
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
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.backgroundElement,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.backgroundSelected,
  },
  backButtonText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  reloadButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: theme.backgroundSelected,
  },
  reloadButtonText: {
    color: theme.success,
    fontSize: 12,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
  },
  loadingText: {
    marginTop: 15,
    color: theme.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
  },
  examCard: {
    backgroundColor: theme.backgroundElement,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      web: {
        shadowColor: theme.cardShadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
    }),
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  subjectIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 4,
  },
  teacherName: {
    fontSize: 13,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 8,
  },
  examDateTime: {
    fontSize: 12,
    color: theme.primary,
    fontWeight: '700',
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeLocked: {
    backgroundColor: theme.activeTheme === 'light' ? 'rgba(5, 150, 105, 0.08)' : 'rgba(16, 185, 129, 0.1)',
    borderColor: theme.success,
  },
  badgeUnlocked: {
    backgroundColor: theme.activeTheme === 'light' ? 'rgba(220, 38, 38, 0.08)' : 'rgba(239, 68, 68, 0.1)',
    borderColor: theme.danger,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  startButton: {
    backgroundColor: theme.success, // Solid emerald green for "Start"
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
  emptyView: {
    marginTop: 100,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTextTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 8,
  },
  emptyTextSub: {
    fontSize: 14,
    color: theme.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  studentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.backgroundElement,
    borderColor: theme.success,
    borderBottomWidth: 2,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  studentAvatar: {
    fontSize: 24,
  },
  studentDetails: {
    flex: 1,
  },
  studentNameText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '800',
  },
  studentMetaText: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  studentBadge: {
    backgroundColor: theme.activeTheme === 'light' ? 'rgba(5, 150, 105, 0.08)' : 'rgba(16, 185, 129, 0.1)',
    borderColor: theme.success,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  studentBadgeText: {
    color: theme.success,
    fontSize: 9,
    fontWeight: '800',
  },
  startButtonDisabled: {
    backgroundColor: theme.backgroundSelected,
    elevation: 0,
  },
  startButtonTextDisabled: {
    color: theme.textMuted,
  },
  badgeNotStarted: {
    backgroundColor: theme.activeTheme === 'light' ? 'rgba(217, 119, 6, 0.08)' : 'rgba(245, 158, 11, 0.1)',
    borderColor: theme.warning,
  },
  badgeNotStartedText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.warning,
  },
  startButtonCompleted: {
    backgroundColor: theme.background,
    borderColor: theme.success,
    borderWidth: 1.5,
    elevation: 0,
  },
  startButtonTextCompleted: {
    color: theme.success,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
