import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DbService } from '@/services/supabase';
import { useTheme } from '@/hooks/use-theme';

interface ActiveSession {
  id: string;
  nama_siswa: string;
  kelas_nama: string;
  platform: string;
  ip_address: string;
  status: 'active' | 'completed' | 'logged_out' | 'blocked';
  created_at: string;
}

export default function ProctorMonitorScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'blocked' | 'offline'>('all');

  const loadSessions = async () => {
    try {
      const list = await DbService.getActiveSessions();
      setSessions(list);
    } catch (err) {
      console.error('Failed to load active sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePullToRefresh = async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  };

  useEffect(() => {
    loadSessions();
    // Real-time auto-refresh every 5 seconds for live proctor room monitoring!
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filter sessions dynamically
  const filteredSessions = React.useMemo(() => {
    return sessions.filter((s) => {
      const matchesSearch = s.nama_siswa.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.kelas_nama.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTab = activeTab === 'all' || 
                         (activeTab === 'active' && s.status === 'active') ||
                         (activeTab === 'blocked' && s.status === 'blocked') ||
                         (activeTab === 'offline' && (s.status === 'completed' || s.status === 'logged_out'));
      
      return matchesSearch && matchesTab;
    });
  }, [sessions, searchQuery, activeTab]);

  // Calculations for active stats
  const stats = React.useMemo(() => {
    const totalActive = sessions.filter(s => s.status === 'active').length;
    const androidActive = sessions.filter(s => s.status === 'active' && s.platform === 'android').length;
    const webActive = sessions.filter(s => s.status === 'active' && s.platform === 'web').length;
    return { totalActive, androidActive, webActive };
  }, [sessions]);

  const formatTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    } catch {
      return isoString;
    }
  };

  const renderSessionItem = ({ item }: { item: ActiveSession }) => {
    const isAndroid = item.platform === 'android';
    
    // Status style and label mappings
    let statusLabel = '🟢 ONLINE';
    let statusBadgeStyle = styles.onlineStatus;
    let statusTextStyle = styles.onlineText;
    
    if (item.status === 'blocked') {
      statusLabel = '🚨 TERKUNCI';
      statusBadgeStyle = styles.blockedStatus;
      statusTextStyle = styles.blockedText;
    } else if (item.status === 'completed' || item.status === 'logged_out') {
      statusLabel = item.status === 'completed' ? '⚪ OFFLINE (SELESAI)' : '⚪ OFFLINE (KELUAR)';
      statusBadgeStyle = styles.offlineStatus;
      statusTextStyle = styles.offlineText;
    }

    return (
      <View style={[styles.card, item.status === 'blocked' && styles.cardBlocked]}>
        <View style={styles.cardHeader}>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{item.nama_siswa}</Text>
            <Text style={styles.studentClass}>Kelas: {item.kelas_nama}</Text>
          </View>
          
          <View style={[styles.statusBadge, statusBadgeStyle]}>
            <Text style={[styles.statusText, statusTextStyle]}>{statusLabel}</Text>
          </View>
        </View>
        
        <View style={styles.cardFooter}>
          <View style={styles.platformContainer}>
            <Text style={styles.platformIcon}>{isAndroid ? '🤖' : '🌐'}</Text>
            <Text style={styles.platformText}>
              {isAndroid ? 'Android App' : 'Web Browser'}
            </Text>
          </View>
          <Text style={styles.timeText}>Terakhir Aktif: {formatTime(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.activeTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.backgroundElement} />
      
      {/* Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>⬅️ Kembali</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.navTitle}>Pemantauan Siswa Aktif</Text>
          <Text style={styles.navSub}>Ruang Proktor Live (Auto-Refresh 5s)</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadSessions}>
          <Text style={styles.refreshBtnText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Live Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: theme.success }]}>{stats.totalActive}</Text>
          <Text style={styles.statLabel}>🟢 Total Aktif</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: theme.primary }]}>{stats.androidActive}</Text>
          <Text style={styles.statLabel}>🤖 Android</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#EF4444' }]}>{stats.webActive}</Text>
          <Text style={styles.statLabel}>🌐 Web Browser</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, Platform.select({ web: { outlineStyle: 'none' } as any })]}
          placeholder="Cari siswa yang sedang online..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'all' && styles.tabBtnTextActive]}>Semua Sesi</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'active' && styles.tabBtnActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'active' && styles.tabBtnTextActive]}>🟢 Aktif</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'blocked' && styles.tabBtnActive]}
          onPress={() => setActiveTab('blocked')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'blocked' && styles.tabBtnTextActive]}>🚨 Terkunci</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'offline' && styles.tabBtnActive]}
          onPress={() => setActiveTab('offline')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'offline' && styles.tabBtnTextActive]}>⚪ Selesai</Text>
        </TouchableOpacity>
      </View>

      {/* Session List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Menghubungkan ke Ruang Proktor...</Text>
        </View>
      ) : filteredSessions.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.centerContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handlePullToRefresh} />}
        >
          <Text style={styles.emptyText}>Tidak ada aktivitas siswa aktif yang sesuai filter.</Text>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredSessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSessionItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handlePullToRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    navbar: {
      height: 60,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      backgroundColor: theme.backgroundElement,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backBtn: {
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    backBtnText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.primary,
    },
    titleContainer: {
      alignItems: 'center',
      flex: 1,
    },
    navTitle: {
      fontSize: 15,
      fontWeight: 'bold',
      color: theme.text,
      fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : undefined,
    },
    navSub: {
      fontSize: 10,
      color: theme.textMuted || '#94A3B8',
      fontWeight: '600',
      marginTop: 2,
    },
    refreshBtn: {
      padding: 6,
    },
    refreshBtnText: {
      fontSize: 18,
    },
    statsContainer: {
      flexDirection: 'row',
      backgroundColor: theme.backgroundElement,
      margin: 16,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    statBox: {
      alignItems: 'center',
      flex: 1,
    },
    statNum: {
      fontSize: 22,
      fontWeight: '900',
      fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : undefined,
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textMuted || '#94A3B8',
      marginTop: 4,
    },
    statDivider: {
      width: 1,
      height: 32,
      backgroundColor: theme.border,
    },
    searchContainer: {
      marginHorizontal: 16,
      marginBottom: 12,
    },
    searchInput: {
      backgroundColor: theme.backgroundElement,
      borderColor: theme.border,
      borderWidth: 1.5,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: theme.text,
    },
    tabsContainer: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginBottom: 16,
      gap: 6,
    },
    tabBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 8,
      backgroundColor: theme.backgroundElement,
      borderWidth: 1,
      borderColor: theme.border,
    },
    tabBtnActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    tabBtnText: {
      fontSize: 11,
      fontWeight: 'bold',
      color: theme.textSecondary,
    },
    tabBtnTextActive: {
      color: '#FFFFFF',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    card: {
      backgroundColor: theme.backgroundElement,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
    },
    cardBlocked: {
      borderColor: '#EF4444',
      backgroundColor: theme.activeTheme === 'dark' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.02)',
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    studentInfo: {
      flex: 1,
    },
    studentName: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 2,
    },
    studentClass: {
      fontSize: 11,
      color: theme.textMuted || '#94A3B8',
      fontWeight: '600',
    },
    statusBadge: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
    },
    statusText: {
      fontSize: 10,
      fontWeight: '900',
    },
    onlineStatus: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    onlineText: {
      color: theme.success || '#10B981',
    },
    blockedStatus: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    blockedText: {
      color: '#EF4444',
    },
    offlineStatus: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    offlineText: {
      color: theme.textMuted || '#94A3B8',
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingTop: 8,
    },
    platformContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    platformIcon: {
      fontSize: 12,
    },
    platformText: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    timeText: {
      fontSize: 11,
      color: theme.textMuted || '#94A3B8',
      fontWeight: '500',
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: theme.textMuted || '#94A3B8',
      fontWeight: '500',
    },
    emptyText: {
      fontSize: 14,
      color: theme.textMuted || '#94A3B8',
      fontWeight: '500',
      textAlign: 'center',
    },
  });
