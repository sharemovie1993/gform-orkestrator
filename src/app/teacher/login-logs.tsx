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

interface LoginLog {
  id: string;
  nama_siswa: string;
  kelas_nama: string;
  platform: string;
  ip_address: string;
  created_at: string;
}

export default function LoginLogsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'android' | 'web'>('all');

  const loadLogs = async () => {
    try {
      const list = await DbService.getLoginLogs();
      setLogs(list);
    } catch (err) {
      console.error('Failed to load login logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePullToRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Filter logs dynamically
  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch = log.nama_siswa.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            log.kelas_nama.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTab = activeTab === 'all' || 
                         (activeTab === 'android' && log.platform === 'android') ||
                         (activeTab === 'web' && log.platform === 'web');
      
      return matchesSearch && matchesTab;
    });
  }, [logs, searchQuery, activeTab]);

  // Calculations for stats
  const stats = React.useMemo(() => {
    const total = logs.length;
    const android = logs.filter(l => l.platform === 'android').length;
    const web = logs.filter(l => l.platform === 'web').length;
    return { total, android, web };
  }, [logs]);

  const formatTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      // Format as DD-MM-YYYY HH:mm:ss in local time
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch {
      return isoString;
    }
  };

  const renderLogItem = ({ item }: { item: LoginLog }) => {
    const isAndroid = item.platform === 'android';
    return (
      <View style={styles.logCard}>
        <View style={styles.logHeader}>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{item.nama_siswa}</Text>
            <Text style={styles.studentClass}>Kelas: {item.kelas_nama}</Text>
          </View>
          <View style={[styles.platformBadge, isAndroid ? styles.androidBadge : styles.webBadge]}>
            <Text style={[styles.platformText, isAndroid ? styles.androidText : styles.webText]}>
              {isAndroid ? '🤖 Android (Aman)' : '🌐 Web Browser'}
            </Text>
          </View>
        </View>
        
        <View style={styles.logFooter}>
          <Text style={styles.deviceText}>Perangkat: {item.ip_address}</Text>
          <Text style={styles.timeText}>⏰ {formatTime(item.created_at)}</Text>
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
        <Text style={styles.navTitle}>Log Aktivitas Siswa</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadLogs}>
          <Text style={styles.refreshBtnText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Main Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Login</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: theme.success }]}>{stats.android}</Text>
          <Text style={[styles.statLabel, { color: theme.success }]}>Android (Aman)</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#EF4444' }]}>{stats.web}</Text>
          <Text style={[styles.statLabel, { color: '#EF4444' }]}>Web (Kerentanan)</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, Platform.select({ web: { outlineStyle: 'none' } as any })]}
          placeholder="Cari nama siswa atau kelas..."
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
          <Text style={[styles.tabBtnText, activeTab === 'all' && styles.tabBtnTextActive]}>Semua</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'android' && styles.tabBtnActive]}
          onPress={() => setActiveTab('android')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'android' && styles.tabBtnTextActive]}>🤖 Android</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'web' && styles.tabBtnActive]}
          onPress={() => setActiveTab('web')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'web' && styles.tabBtnTextActive]}>🌐 Web</Text>
        </TouchableOpacity>
      </View>

      {/* List content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Memuat Log Aktivitas...</Text>
        </View>
      ) : filteredLogs.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.centerContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handlePullToRefresh} />}
        >
          <Text style={styles.emptyText}>Tidak ada aktivitas login yang terekam.</Text>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredLogs}
          keyExtractor={(item) => item.id}
          renderItem={renderLogItem}
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
      height: 56,
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
    navTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.text,
      fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : undefined,
    },
    refreshBtn: {
      padding: 6,
    },
    refreshBtnText: {
      fontSize: 18,
    },
    statsCard: {
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
      fontSize: 20,
      fontWeight: '900',
      color: theme.text,
      fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : undefined,
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textMuted || '#94A3B8',
      marginTop: 4,
    },
    statDivider: {
      width: 1,
      height: 30,
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
      gap: 8,
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
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.text,
    },
    tabBtnTextActive: {
      color: '#FFFFFF',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    logCard: {
      backgroundColor: theme.backgroundElement,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    logHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 10,
      flexWrap: 'wrap',
      gap: 8,
    },
    studentInfo: {
      flex: 1,
      minWidth: 150,
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
    platformBadge: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
      alignSelf: 'flex-start',
    },
    androidBadge: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    webBadge: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    platformText: {
      fontSize: 10,
      fontWeight: 'bold',
    },
    androidText: {
      color: theme.success || '#10B981',
    },
    webText: {
      color: '#EF4444',
    },
    logFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingTop: 8,
      flexWrap: 'wrap',
      gap: 6,
    },
    deviceText: {
      fontSize: 11,
      color: theme.textMuted || '#64748B',
    },
    timeText: {
      fontSize: 11,
      color: theme.textMuted || '#64748B',
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
