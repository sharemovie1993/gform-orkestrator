import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LicenseConfig {
  serverUrl: string;
  productId: string;
  deviceId: string;
}

export interface LicenseInfo {
  school_name: string;
  expires_at: string;
  device_id: string;
  product_id: string;
  license_key?: string;
}

// Pure JS Base64 JWT Decoder
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    if (typeof atob === 'function') {
      return JSON.parse(atob(base64));
    }
    
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
  } catch (err) {
    return null;
  }
}

export class LicenseBlocker {
  private static config: LicenseConfig;

  public static configure(config: LicenseConfig) {
    this.config = config;
  }

  /**
   * Performs a license verification.
   * Checks online first, falls back to local decoded JWT payload validation if offline.
   */
  public static async verifyLicense(): Promise<{ success: boolean; message: string; data?: LicenseInfo }> {
    if (!this.config) {
      throw new Error('LicenseBlocker is not configured. Call configure() first.');
    }

    const { serverUrl, productId } = this.config;

    try {
      const token = await AsyncStorage.getItem('@license_token');
      if (!token) {
        return { success: false, message: 'Tidak ada lisensi terdaftar.' };
      }

      const decoded = decodeJWT(token);
      const licenseKey = decoded ? decoded.license_key : undefined;

      // 1. Try Online Validation
      try {
        const res = await fetch(`${serverUrl}/api/license/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await res.json();
        
        if (data.success && data.data) {
          // Safety Check: Verify product matches current configured product
          if (data.data.product_id !== productId) {
            return { success: false, message: 'Lisensi ini diterbitkan untuk produk/aplikasi yang berbeda.' };
          }
          return {
            success: true,
            message: 'Lisensi valid (Online)',
            data: {
              ...data.data,
              license_key: licenseKey
            }
          };
        } else {
          return { success: false, message: data.message || 'Lisensi tidak aktif atau dibatalkan.' };
        }
      } catch (onlineErr) {
        // 2. Offline Fallback (Verify expiry in local JWT payload)
        console.log('[LICENSE] Offline mode, checking token locally...');
        if (decoded) {
          if (decoded.product_id !== productId) {
            return { success: false, message: 'Lisensi ini diterbitkan untuk produk/aplikasi yang berbeda.' };
          }
          
          const todayStr = new Date().toISOString().slice(0, 10);
          if (decoded.expires_at >= todayStr) {
            return {
              success: true,
              message: 'Lisensi valid (Offline Grace Period)',
              data: {
                school_name: decoded.school_name,
                expires_at: decoded.expires_at,
                device_id: decoded.device_id,
                product_id: decoded.product_id,
                license_key: licenseKey
              }
            };
          } else {
            return { success: false, message: 'Masa aktif lisensi offline telah kedaluwarsa.' };
          }
        }
        return { success: false, message: 'Format token lisensi lokal tidak valid.' };
      }
    } catch (err) {
      return { success: false, message: 'Kesalahan sistem saat membaca lisensi.' };
    }
  }

  /**
   * Activate a license key with the server.
   */
  public static async activateLicense(licenseKey: string): Promise<{ success: boolean; message: string }> {
    if (!this.config) {
      throw new Error('LicenseBlocker is not configured.');
    }

    const { serverUrl, productId, deviceId } = this.config;

    try {
      const res = await fetch(`${serverUrl}/api/license/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: licenseKey.trim(),
          device_id: deviceId,
          product_id: productId
        })
      });
      const data = await res.json();
      
      if (data.success && data.token) {
        await AsyncStorage.setItem('@license_token', data.token);
        await AsyncStorage.removeItem('@license_pending_key');
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Gagal mengaktifkan lisensi.' };
      }
    } catch (err) {
      return { success: false, message: 'Gagal memverifikasi lisensi secara online. Periksa jaringan Anda.' };
    }
  }
}
