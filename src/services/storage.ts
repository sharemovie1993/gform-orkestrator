import AsyncStorage from '@react-native-async-storage/async-storage';
import { Siswa } from './supabase';

const KEYS = {
  IS_BLOCKED: '@gform_orkestrator_is_blocked',
  BLOCKED_REASON: '@gform_orkestrator_blocked_reason',
  CACHED_PINS: '@gform_orkestrator_cached_pins',
  SELECTED_CLASS: '@gform_orkestrator_selected_class',
  STUDENT_SESSION: '@gform_orkestrator_student_session',
  CLASSES_CACHE: '@gform_orkestrator_classes_cache',
  LOGIN_MODE_CACHE: '@gform_orkestrator_login_mode_cache',
  CHEAT_BLOCKING_CACHE: '@gform_orkestrator_cheat_blocking_cache',
  TENANT_CACHE: '@gform_orkestrator_tenant_cache',
};

export class StorageService {
  /**
   * Check if the device/student is currently blocked from exams
   */
  static async isBlocked(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(KEYS.IS_BLOCKED);
      return val === 'true';
    } catch (e) {
      console.error('Failed to read block state:', e);
      return false;
    }
  }

  /**
   * Set the block state (true = blocked, false = unblocked)
   */
  static async setBlocked(blocked: boolean, reason: string = ''): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.IS_BLOCKED, blocked ? 'true' : 'false');
      await AsyncStorage.setItem(KEYS.BLOCKED_REASON, reason);
    } catch (e) {
      console.error('Failed to save block state:', e);
    }
  }

  /**
   * Get the reason why the student was blocked
   */
  static async getBlockedReason(): Promise<string> {
    try {
      return (await AsyncStorage.getItem(KEYS.BLOCKED_REASON)) || 'Membuka aplikasi lain';
    } catch (e) {
      return '';
    }
  }

  /**
   * Cache supervisor PINs from the database locally
   */
  static async cachePins(pins: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.CACHED_PINS, JSON.stringify(pins));
    } catch (e) {
      console.error('Failed to cache PINs:', e);
    }
  }

  /**
   * Validate if a PIN is correct (checks against cached PINs, with fallback to '1234')
   */
  static async validatePin(pin: string): Promise<boolean> {
    try {
      const cached = await AsyncStorage.getItem(KEYS.CACHED_PINS);
      let pins: string[] = ['1234']; // default fallback PIN
      if (cached) {
        pins = JSON.parse(cached);
      }
      return pins.includes(pin);
    } catch (e) {
      return pin === '1234';
    }
  }

  /**
   * Save selected class info so students don't have to navigate every time
   */
  static async saveSelectedClass(classId: string, className: string): Promise<void> {
    try {
      await AsyncStorage.setItem(
        KEYS.SELECTED_CLASS,
        JSON.stringify({ id: classId, name: className })
      );
    } catch (e) {
      console.error('Failed to save selected class:', e);
    }
  }

  /**
   * Get selected class info
   */
  static async getSelectedClass(): Promise<{ id: string; name: string } | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.SELECTED_CLASS);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Clear selected class (for logout/change class)
   */
  static async clearSelectedClass(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.SELECTED_CLASS);
    } catch (e) {
      console.error('Failed to clear selected class:', e);
    }
  }

  /**
   * Save logged-in student's full session info
   */
  static async saveStudentSession(student: Siswa): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.STUDENT_SESSION, JSON.stringify(student));
    } catch (e) {
      console.error('Failed to save student session:', e);
    }
  }

  /**
   * Get logged-in student's full session info
   */
  static async getStudentSession(): Promise<Siswa | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.STUDENT_SESSION);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Failed to retrieve student session:', e);
      return null;
    }
  }

  /**
   * Clear student session info (Logout)
   */
  static async clearStudentSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.STUDENT_SESSION);
    } catch (e) {
      console.error('Failed to clear student session:', e);
    }
  }

  /**
   * Cache active classes locally for instant student welcome screen loading
   */
  static async cacheClasses(classes: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.CLASSES_CACHE, JSON.stringify(classes));
    } catch (e) {
      console.error('Failed to cache classes:', e);
    }
  }

  /**
   * Retrieve cached active classes
   */
  static async getCachedClasses(): Promise<any[] | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.CLASSES_CACHE);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Cache active login mode locally
   */
  static async cacheLoginMode(mode: 'simple' | 'login'): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.LOGIN_MODE_CACHE, mode);
    } catch (e) {
      console.error('Failed to cache login mode:', e);
    }
  }

  /**
   * Retrieve cached login mode
   */
  static async getCachedLoginMode(): Promise<'simple' | 'login' | null> {
    try {
      const mode = await AsyncStorage.getItem(KEYS.LOGIN_MODE_CACHE);
      return (mode === 'simple' || mode === 'login') ? mode : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Cache global cheat blocking state
   */
  static async cacheCheatBlocking(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.CHEAT_BLOCKING_CACHE, enabled ? 'true' : 'false');
    } catch (e) {
      console.error('Failed to cache cheat blocking state:', e);
    }
  }

  /**
   * Retrieve cached global cheat blocking state (defaults to true if not set)
   */
  static async getCachedCheatBlocking(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(KEYS.CHEAT_BLOCKING_CACHE);
      return val !== 'false'; // defaults to true
    } catch (e) {
      return true;
    }
  }

  /**
   * Cache school/tenant profile branding locally
   */
  static async cacheTenant(tenant: any): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.TENANT_CACHE, JSON.stringify(tenant));
    } catch (e) {
      console.error('Failed to cache tenant profile:', e);
    }
  }

  /**
   * Retrieve cached school/tenant profile branding
   */
  static async getCachedTenant(): Promise<any | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.TENANT_CACHE);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Mark an exam as completed by saving its unique link_soal ID to device storage under a student-specific key
   */
  static async markExamAsCompleted(examId: string, studentId: string = 'guest'): Promise<void> {
    try {
      const key = `@gform_orkestrator_completed_exams_${studentId}`;
      const cached = await AsyncStorage.getItem(key);
      let completedIds: string[] = [];
      if (cached) {
        completedIds = JSON.parse(cached);
      }
      if (!completedIds.includes(examId)) {
        completedIds.push(examId);
        await AsyncStorage.setItem(key, JSON.stringify(completedIds));
      }
    } catch (e) {
      console.error('Failed to mark exam as completed:', e);
    }
  }

  /**
   * Retrieve all completed exam IDs from local device storage for a specific student
   */
  static async getCompletedExams(studentId: string = 'guest'): Promise<string[]> {
    try {
      const key = `@gform_orkestrator_completed_exams_${studentId}`;
      const cached = await AsyncStorage.getItem(key);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  }
}
