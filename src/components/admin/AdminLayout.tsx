import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  SafeAreaView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export type AdminTab = 'jurusan' | 'kelas' | 'siswa' | 'guru' | 'mapel' | 'link_soal';

interface AdminLayoutProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onBackPress: () => void;
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export default function AdminLayout({
  activeTab,
  onTabChange,
  onBackPress,
  children,
  onRefresh,
  refreshing = false,
}: AdminLayoutProps) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const theme = useTheme();
  
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const tabs: { id: AdminTab; label: string; emoji: string }[] = [
    { id: 'jurusan', label: 'Jurusan', emoji: '🏫' },
    { id: 'kelas', label: 'Kelas', emoji: '👥' },
    { id: 'siswa', label: 'Siswa', emoji: '👨‍🎓' },
    { id: 'guru', label: 'Guru', emoji: '👨‍🏫' },
    { id: 'mapel', label: 'Master Mapel', emoji: '📚' },
    { id: 'link_soal', label: 'Link Soal', emoji: '🔗' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, isLargeScreen ? styles.row : styles.column]}>
        
        {/* SIDEBAR FOR DESKTOP / WEB */}
        {isLargeScreen ? (
          <View style={[styles.sidebar, Platform.OS === 'web' ? { position: 'sticky' as any, top: 0, height: '100vh' as any } : null]}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>Admin Console</Text>
              <Text style={styles.sidebarSubtitle}>E-Exam Orchestrator</Text>
            </View>

            <View style={styles.navGroup}>
              <Text style={styles.navLabel}>NAVIGASI</Text>
              <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
                <Text style={styles.backButtonText}>⬅️ Kembali ke Dashboard</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.navGroup}>
              <Text style={styles.navLabel}>DATA MASTER</Text>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.sidebarTab, isActive && styles.sidebarTabActive]}
                    onPress={() => onTabChange(tab.id)}
                  >
                    <Text style={tabIconStyle(isActive, theme)}>{tab.emoji}</Text>
                    <Text style={[styles.sidebarTabText, isActive && styles.sidebarTabTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : (
          /* TOP HEADER & TABS FOR MOBILE */
          <View style={styles.mobileHeader}>
            <View style={styles.mobileTopRow}>
              <TouchableOpacity style={styles.mobileBackBtn} onPress={onBackPress}>
                <Text style={styles.mobileBackBtnText}>⬅️ Dashboard</Text>
              </TouchableOpacity>
              <Text style={styles.mobileTitle}>Console Admin</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mobileTabsContainer}
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.mobileTab, isActive && styles.mobileTabActive]}
                    onPress={() => onTabChange(tab.id)}
                  >
                    <Text style={styles.mobileTabEmoji}>{tab.emoji}</Text>
                    <Text style={[styles.mobileTabText, isActive && styles.mobileTabTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* MAIN CONTENT AREA */}
        <View style={styles.contentArea}>
          <ScrollView 
            contentContainerStyle={styles.contentScroll}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.primary}
                  colors={[theme.primary]}
                />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        </View>

      </View>
    </SafeAreaView>
  );
}

// Extra helper for tab icons to maintain nice alignment
const tabIconStyle = (isActive: boolean, theme: any) => {
  return {
    fontSize: 16,
    marginRight: 12,
    opacity: isActive ? 1.0 : 0.7,
  };
};

const createStyles = (theme: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.background,
  },
  container: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
  },
  column: {
    flexDirection: 'column',
  },
  
  // Sidebar styles (Desktop/Web)
  sidebar: {
    width: 260,
    backgroundColor: theme.backgroundElement,
    borderRightWidth: 1,
    borderRightColor: theme.border,
    padding: 20,
    height: '100%',
  },
  sidebarHeader: {
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 15,
  },
  sidebarTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sidebarSubtitle: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  navGroup: {
    marginBottom: 25,
  },
  navLabel: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.backgroundSelected,
    marginBottom: 5,
  },
  backButtonText: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  sidebarTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
  },
  sidebarTabActive: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(37, 99, 235, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: theme.primary,
  },
  sidebarTabText: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  sidebarTabTextActive: {
    color: theme.primary,
    fontWeight: '700',
  },

  // Mobile navigation styles (Mobile)
  mobileHeader: {
    backgroundColor: theme.backgroundElement,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingTop: 10,
  },
  mobileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  mobileBackBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: theme.backgroundSelected,
  },
  mobileBackBtnText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  mobileTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800',
  },
  mobileTabsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  mobileTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: theme.backgroundSelected,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: theme.border,
  },
  mobileTabActive: {
    backgroundColor: theme.activeTheme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(37, 99, 235, 0.08)',
    borderColor: theme.primary,
  },
  mobileTabEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  mobileTabText: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  mobileTabTextActive: {
    color: theme.primary,
    fontWeight: '700',
  },

  // Content Area
  contentArea: {
    flex: 1,
    backgroundColor: theme.background,
  },
  contentScroll: {
    padding: 20,
    paddingBottom: 40,
  },
});
