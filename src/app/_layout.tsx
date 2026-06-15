import { Stack } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { 
  ThemeProvider, 
  DarkTheme as NavDarkTheme, 
  DefaultTheme as NavDefaultTheme 
} from '@react-navigation/native';
import { ThemeContextProvider, useThemeContext } from '@/context/ThemeContext';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  ActivityIndicator, 
  ScrollView, 
  Platform, 
  StatusBar 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { LicenseBlocker } from '../utils/LicenseBlocker';
import { styles } from '../constants/_layout.styles';

// E2E Licensing Server Configuration (Testing on port 5001)
const getLicenseServerUrl = () => {
  const debuggerHost = Constants.expoConfig?.hostUri;
  const hostIp = debuggerHost ? debuggerHost.split(':')[0] : null;
  if (hostIp) {
    return `http://${hostIp}:5001`;
  }
  return Platform.OS === 'android' 
    ? 'http://10.0.2.2:5001' 
    : 'http://localhost:5001';
};

const LICENSE_SERVER_URL = __DEV__
  ? getLicenseServerUrl()
  : 'https://api.absenta.id';

// Configure modular license blocker for G-Form
LicenseBlocker.configure({
  serverUrl: LICENSE_SERVER_URL,
  productId: 'gform-orkestrator',
  deviceId: 'DEV-MOBILE-TEST-2026' // or dynamically fetched Device UUID
});

// Robust fetch wrapper with automatic timeout protection (abort controller)
const fetchWithTimeout = async (url: string, options: any = {}, timeoutMs: number = 8000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

// Pure JS Base64 JWT Decoder (Graceful Offline Expiration Fallback)
function decodeJWT(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
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
  } catch (e) {
    return null;
  }
}

// Premium visual licensing packages fallback (Offline Safety Guarantee)
const FALLBACK_PACKAGES = [
  {
    id: 'monthly',
    title: 'Bulanan',
    price: 'Rp 299.000',
    duration: '30 Hari',
    device_limit: 0,
    is_unlimited: 1,
    badge: null,
  },
  {
    id: 'semester',
    title: 'Semesteran',
    price: 'Rp 699.000',
    duration: '180 Hari',
    device_limit: 0,
    is_unlimited: 1,
    badge: 'Terpopuler',
  },
  {
    id: 'annual',
    title: 'Tahunan',
    price: 'Rp 1.199.000',
    duration: '365 Hari',
    device_limit: 0,
    is_unlimited: 1,
    badge: 'Terbaik',
  }
] as const;

function InnerLayout() {
  const { activeTheme } = useThemeContext();

  // Licensing States
  const [licenseStatus, setLicenseStatus] = useState<'checking' | 'locked' | 'unlocked'>('unlocked');
  const [pendingKey, setPendingKey] = useState<string>('');
  const [selectedPackage, setSelectedPackage] = useState<string>('monthly');
  const [packagesList, setPackagesList] = useState<any[]>([]);
  
  // Inputs
  const [requestSchoolName, setRequestSchoolName] = useState<string>('');
  const [manualKeyInput, setManualKeyInput] = useState<string>('');
  
  // Visual states
  const [isRequesting, setIsRequesting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [schoolBoundName, setSchoolBoundName] = useState<string>('');
  const [licenseExpiry, setLicenseExpiry] = useState<string>('');
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [isLicenseExpired, setIsLicenseExpired] = useState<boolean>(false);

  // Billing States
  const [showBillingModal, setShowBillingModal] = useState<boolean>(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState<boolean>(false);
  const [mySubscriptions, setMySubscriptions] = useState<any[]>([]);
  const [myInvoices, setMyInvoices] = useState<any[]>([]);
  const [isLoadingBilling, setIsLoadingBilling] = useState<boolean>(false);
  const [billingError, setBillingError] = useState<string>('');
  const [activePolicyTab, setActivePolicyTab] = useState<string | null>(null);
  
  // Tripay Payment Gateway States
  const [paymentChannels, setPaymentChannels] = useState<any[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('QRIS2');
  const [pendingQrUrl, setPendingQrUrl] = useState<string>('');
  const [pendingPayCode, setPendingPayCode] = useState<string>('');
  const [pendingInstructions, setPendingInstructions] = useState<any[]>([]);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<string>('');
  const [pendingAmount, setPendingAmount] = useState<number>(0);

  const fetchMyBillingInfo = async () => {
    setIsLoadingBilling(true);
    setBillingError('');
    setMySubscriptions([]);
    setMyInvoices([]);
    setShowBillingModal(true);

    try {
      let key = '';
      
      const token = await AsyncStorage.getItem('@license_token');
      if (token) {
        const decoded = decodeJWT(token);
        if (decoded && decoded.license_key) {
          key = decoded.license_key;
        }
      }

      if (!key) {
        key = pendingKey;
      }

      if (!key) {
        const savedPendingKey = await AsyncStorage.getItem('@license_pending_key');
        if (savedPendingKey) {
          key = savedPendingKey;
        }
      }

      // Auto-resolve license key from school subdomain/slug on web
      if (!key && Platform.OS === 'web' && typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const searchParams = new URLSearchParams(window.location.search);
        const tenantParam = searchParams.get('tenant');
        
        let slug = '';
        if (tenantParam) {
          slug = tenantParam.trim();
        } else {
          const parts = hostname.split('.');
          if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'api' && parts[0] !== 'localhost') {
            slug = parts[0];
          }
        }
        if (slug && slug !== 'default') {
          try {
            const { masterSupabase } = require('../services/supabase');
            const { data: tenant } = await masterSupabase
              .from('tenants')
              .select('license_key')
              .eq('domain_or_slug', slug)
              .maybeSingle();
            if (tenant && tenant.license_key) {
              key = tenant.license_key;
            }
          } catch (err) {
            console.log('[Billing API] Error fetching license key from tenant slug:', err);
          }
        }
      }

      if (!key) {
        setBillingError('Tidak ada Kunci Lisensi terdeteksi untuk perangkat ini. Silakan ajukan aktivasi baru atau masukkan kunci lisensi.');
        setIsLoadingBilling(false);
        return;
      }

      // Fetch subscriptions
      const subRes = await fetchWithTimeout(`${LICENSE_SERVER_URL}/api/license/my-subscriptions/${key}`);
      const subData = await subRes.json();
      
      // Fetch invoices
      const invRes = await fetchWithTimeout(`${LICENSE_SERVER_URL}/api/license/my-invoices/${key}`);
      const invData = await invRes.json();

      if (subData.success && Array.isArray(subData.data)) {
        setMySubscriptions(subData.data);
      }
      
      if (invData.success && Array.isArray(invData.data)) {
        setMyInvoices(invData.data);
      }

      if (!subData.success && !invData.success) {
        setBillingError(subData.message || invData.message || 'Gagal mengambil data billing dari server.');
      }
    } catch (err) {
      setBillingError('Kesalahan jaringan. Tidak dapat terhubung ke server lisensi.');
    } finally {
      setIsLoadingBilling(false);
    }
  };

  // Prefill school name for renewal
  useEffect(() => {
    if (schoolBoundName && !requestSchoolName) {
      setRequestSchoolName(schoolBoundName);
    }
  }, [schoolBoundName]);

  // Fetch dynamic pricing packages from server API on mount
  useEffect(() => {
    fetchPackages();
    fetchPaymentChannels();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await fetchWithTimeout(`${LICENSE_SERVER_URL}/api/license/packages`);
      const data = await res.json();
      if (data.success && data.data) {
        setPackagesList(data.data);
        return;
      }
    } catch (err) {
      console.log('[FETCH PACKAGES ERROR]', err);
    }
    // Safe Offline fallback
    setPackagesList(Array.from(FALLBACK_PACKAGES));
  };

  const fetchPaymentChannels = async () => {
    try {
      const res = await fetchWithTimeout(`${LICENSE_SERVER_URL}/api/license/payment-channels`);
      const data = await res.json();
      if (data.success && data.data) {
        setPaymentChannels(data.data);
        // Default select to QRIS2 if exists, otherwise first active channel
        const qrisExists = data.data.some((c: any) => c.code === 'QRIS2');
        if (qrisExists) {
          setSelectedChannel('QRIS2');
        } else if (data.data.length > 0) {
          setSelectedChannel(data.data[0].code);
        }
        return;
      }
    } catch (err) {
      console.log('[FETCH CHANNELS ERROR]', err);
    }
  };

  // Custom Dialog Modal State
  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    type: 'alert',
    title: '',
    message: '',
  });

  const showDialog = (type: 'alert' | 'confirm', title: string, message: string, onConfirm?: () => void) => {
    setDialogConfig({
      visible: true,
      type,
      title,
      message,
      onConfirm,
    });
  };

  const closeDialog = () => {
    setDialogConfig(prev => ({ ...prev, visible: false }));
  };

  // 1. Initial Check on Mount
  useEffect(() => {
    checkLicense();
  }, []);

  const checkLicense = async () => {
    try {
      let activeTenant: any = null;
      
      // Set active tenant ID dynamically on startup for isolation consistency
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const searchParams = new URLSearchParams(window.location.search);
        const tenantParam = searchParams.get('tenant');
        
        let slug = '';
        if (tenantParam) {
          slug = tenantParam.trim();
        } else {
          const parts = hostname.split('.');
          if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'api' && parts[0] !== 'localhost') {
            slug = parts[0];
          }
        }
        if (slug && slug !== 'default') {
          try {
            const { masterSupabase, setActiveTenantId } = require('../services/supabase');
            const { data: tenant } = await masterSupabase
              .from('tenants')
              .select('id, license_key')
              .eq('domain_or_slug', slug)
              .maybeSingle();
            if (tenant) {
              activeTenant = tenant;
              setActiveTenantId(tenant.id);
            }
          } catch (err) {}
        }
      } else {
        // Platform Mobile: Dapatkan domain sekolah yang tersimpan di storage
        try {
          const savedDomain = await AsyncStorage.getItem('@gform_orkestrator_saved_domain');
          if (savedDomain) {
            // Hilangkan protokol jika ada, ambil subdomain/slug
            let cleanDomain = savedDomain.replace(/(^\w+:|^)\/\//, '').trim();
            const parts = cleanDomain.split('.');
            let slug = parts[0]; // e.g. 'smkn1pld' dari 'smkn1pld.absenta.id'
            
            const { masterSupabase, setActiveTenantId } = require('../services/supabase');
            const { data: tenant } = await masterSupabase
              .from('tenants')
              .select('id, license_key')
              .eq('domain_or_slug', slug)
              .maybeSingle();
            if (tenant) {
              activeTenant = tenant;
              setActiveTenantId(tenant.id);
            }
          }
        } catch (mobileErr) {
          console.warn('[Layout Startup] Gagal memuat domain tersimpan:', mobileErr);
        }
      }

      const token = await AsyncStorage.getItem('@license_token');
      const savedPendingKey = await AsyncStorage.getItem('@license_pending_key');

      const result = await LicenseBlocker.verifyLicense();
      if (result.success && result.data) {
        setSchoolBoundName(result.data.school_name || '');
        setLicenseExpiry(result.data.expires_at || '');
        
        // Resolve tenant ID dynamically from Supabase using the verified license key!
        if (result.data.license_key) {
          try {
            const { masterSupabase, setActiveTenantId } = require('../services/supabase');
            const { data: tenant } = await masterSupabase
              .from('tenants')
              .select('id')
              .eq('license_key', result.data.license_key)
              .maybeSingle();
            if (tenant) {
              console.log('[Licensing Startup] Resolved active tenant ID from verified license key:', tenant.id);
              setActiveTenantId(tenant.id);
            }
          } catch (resolveErr) {
            console.warn('[Licensing Startup] Failed to resolve tenant ID from license key:', resolveErr);
          }
        }

        // Calculate remaining days
        const today = new Date();
        const expiry = new Date(result.data.expires_at);
        today.setHours(0,0,0,0);
        expiry.setHours(0,0,0,0);
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysRemaining(diffDays);
        setIsLicenseExpired(false);

        setLicenseStatus('unlocked');
      } else {
        // Multi-tenant direct login bypass: If there is no local license token and no pending payment,
        // we allow access to the application so that the student can see the NISN login screen.
        // Once they login, we will fetch their tenant details and run activation dynamically.
        if (!token && !savedPendingKey) {
          console.log('[Licensing] No local token and no pending key. Allowing access to login screen.');
          setSchoolBoundName('');
          setLicenseExpiry('');
          setDaysRemaining(null);
          setIsLicenseExpired(false);
          setLicenseStatus('unlocked');
          return;
        }

        // Zero-Touch SaaS Dynamic Auto-Licensing Activation Check
        if (activeTenant && activeTenant.license_key) {
          console.log('[Zero-Touch Activation] Found license key in master database. Triggering automatic background activation...');
          const actResult = await LicenseBlocker.activateLicense(activeTenant.license_key);
          if (actResult.success) {
            console.log('[Zero-Touch Activation] Background activation successful! Re-verifying license...');
            const retryResult = await LicenseBlocker.verifyLicense();
            if (retryResult.success && retryResult.data) {
              setSchoolBoundName(retryResult.data.school_name || '');
              setLicenseExpiry(retryResult.data.expires_at || '');
              
              const today = new Date();
              const expiry = new Date(retryResult.data.expires_at);
              today.setHours(0,0,0,0);
              expiry.setHours(0,0,0,0);
              const diffTime = expiry.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              setDaysRemaining(diffDays);
              setIsLicenseExpired(false);

              setLicenseStatus('unlocked');
              console.log('[Zero-Touch Activation] App successfully unlocked!');
              return; // EXIT and prevent setting locked status!
            }
          } else {
            console.warn('[Zero-Touch Activation] Background activation failed:', actResult.message);
          }
        }

        // Check if waiting for pending approval
        if (savedPendingKey) {
          setPendingKey(savedPendingKey);
        }

        // Check if expired message is returned
        if (result.message && (result.message.toLowerCase().includes('kedaluwarsa') || result.message.toLowerCase().includes('expired'))) {
          setIsLicenseExpired(true);
          // Try to decode expired token payload to show name
          try {
            if (token) {
              const parts = token.split('.');
              if (parts.length === 3) {
                const base64Url = parts[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                
                // Helper to decode base64 across environments
                let decodedStr = '';
                if (typeof atob === 'function') {
                  decodedStr = atob(base64);
                } else {
                  // Fallback
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
                  decodedStr = output;
                }
                const decoded = JSON.parse(decodedStr);
                if (decoded && decoded.school_name) {
                  setSchoolBoundName(decoded.school_name);
                  setLicenseExpiry(decoded.expires_at);
                }
              }
            }
          } catch(e) {}
        } else {
          setIsLicenseExpired(false);
        }
        // Always remain unlocked for universal login
        setLicenseStatus('unlocked');
      }
    } catch (err) {
      setLicenseStatus('unlocked');
    }
  };

  // 2. Polling for Pending QRIS approval
  useEffect(() => {
    let intervalId: any = null;
    
    if (pendingKey) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetchWithTimeout(`${LICENSE_SERVER_URL}/api/license/check/${pendingKey}?device_id=DEV-MOBILE-TEST-2026`);
          const data = await res.json();
          
          if (data.success) {
            if (data.status === 'active' && data.token) {
              // Unlocked via Admin Dashboard! Save Token!
              await AsyncStorage.setItem('@license_token', data.token);
              await AsyncStorage.removeItem('@license_pending_key');
              setPendingKey('');
              showDialog('alert', 'Aktivasi Sukses', 'Pembayaran QRIS Anda telah disetujui oleh Admin. Aplikasi kini terbuka sepenuhnya!', () => {
                setLicenseStatus('unlocked');
                setShowPurchaseModal(false);
              });
              clearInterval(intervalId);
            } else if (data.status === 'pending') {
              if (data.qr_url) setPendingQrUrl(data.qr_url);
              if (data.pay_code) setPendingPayCode(data.pay_code);
              if (data.amount) setPendingAmount(data.amount);
              if (data.instructions) setPendingInstructions(data.instructions);
              if (data.payment_method) setPendingPaymentMethod(data.payment_method);
            }
          } else {
            // License was rejected or deleted by Admin on the server!
            await AsyncStorage.removeItem('@license_pending_key');
            setPendingKey('');
            showDialog('alert', 'Aktivasi Ditolak', 'Permintaan aktivasi QRIS Anda ditolak atau dihapus oleh Administrator. Silakan ajukan kembali.', () => {
              setShowPurchaseModal(false);
            });
            clearInterval(intervalId);
          }
        } catch (err) {
          console.log('[POLLING ERROR]', err);
        }
      }, 5000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [pendingKey]);

  // 3. Periodic background verification when unlocked (reactivity to admin revokes/deletes)
  useEffect(() => {
    let intervalId: any = null;
    
    if (licenseStatus === 'unlocked') {
      intervalId = setInterval(async () => {
        try {
          const token = await AsyncStorage.getItem('@license_token');
          if (!token) {
            return; // No license token saved yet, bypass checking
          }
          const result = await LicenseBlocker.verifyLicense();
          if (!result.success) {
            // License revoked or expired - no longer locks the app for universal login
            console.log('[License Periodic Check] License not active, keeping unlocked for universal login.');
          } else if (result.data) {
            // Recalculate remaining days in background
            const today = new Date();
            const expiry = new Date(result.data.expires_at);
            today.setHours(0,0,0,0);
            expiry.setHours(0,0,0,0);
            const diffTime = expiry.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setDaysRemaining(diffDays);
            setIsLicenseExpired(false);
          }
        } catch (err) {
          // Network errors won't lock out the user (preserves offline grace period during exams)
          console.log('[LICENSE] Periodic verification network fallback, keeping unlocked.');
        }
      }, 10000); // Check every 10 seconds for real-time reactivity
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [licenseStatus]);

  // Listen for openBillingModal from other sub-screens (e.g. settings)
  useEffect(() => {
    const { DeviceEventEmitter } = require('react-native');
    const subscription = DeviceEventEmitter.addListener('openBillingModal', () => {
      fetchMyBillingInfo();
    });
    return () => {
      subscription.remove();
    };
  }, []);

  const getSelectedPlanAmountAndFee = () => {
    const activePack = packagesList.find(p => p.id === selectedPackage) || packagesList[0] || FALLBACK_PACKAGES[0];
    const amount = activePack ? (parseInt(activePack.price.replace(/[^\d]/g, ''), 10) || 299000) : 299000;
    
    const channel = paymentChannels.find(c => c.code === selectedChannel);
    let fee = 0;
    if (channel) {
      fee = channel.fee_flat + Math.round(amount * (channel.fee_percent / 100));
    }
    
    return {
      amount,
      fee,
      total: amount + fee,
      packageName: activePack ? activePack.title : 'Bulanan'
    };
  };

  const formatChannelFee = (channel: any) => {
    if (!channel) return 'Rp 0';
    const flat = channel.fee_flat || 0;
    const pct = channel.fee_percent || 0;
    
    if (flat > 0 && pct > 0) {
      return `Rp ${flat.toLocaleString('id-ID')} + ${pct}%`;
    } else if (pct > 0) {
      return `${pct}%`;
    } else if (flat > 0) {
      return `Rp ${flat.toLocaleString('id-ID')}`;
    }
    return 'Gratis';
  };

  // 3. Action Handlers
  const handleRequestActivation = async () => {
    if (!requestSchoolName.trim()) {
      setErrorMessage('Nama Sekolah / Lembaga wajib diisi.');
      return;
    }
    
    setIsRequesting(true);
    setErrorMessage('');
    const activePack = packagesList.find(p => p.id === selectedPackage) || packagesList[0] || FALLBACK_PACKAGES[0];
    
    const isUnlimited = activePack.is_unlimited === 1 || activePack.device_limit === 0 || activePack.limit === 0;
    const finalLimit = isUnlimited ? 99999 : (activePack.device_limit ?? activePack.limit ?? 50);

    try {
      const res = await fetchWithTimeout(`${LICENSE_SERVER_URL}/api/license/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_name: `${requestSchoolName.trim()} (${activePack.title})`,
          device_limit: finalLimit,
          is_unlimited: isUnlimited ? 1 : 0,
          product_id: 'gform-orkestrator',
          plan_id: activePack.id,
          payment_method: selectedChannel
        })
      });
      const data = await res.json();
      
      if (data.success && data.data) {
        const generatedKey = data.data.license_key;
        await AsyncStorage.setItem('@license_pending_key', generatedKey);
        
        // Update local state with dynamic billing details from Tripay
        setPendingQrUrl(data.data.qr_url || '');
        setPendingPayCode(data.data.pay_code || '');
        setPendingAmount(data.data.amount || 0);
        setPendingInstructions(data.data.instructions || []);
        setPendingPaymentMethod(data.data.payment_method || 'QRIS');
        
        setPendingKey(generatedKey);
      } else {
        setErrorMessage(data.message || 'Gagal memproses permintaan.');
      }
    } catch (err) {
      setErrorMessage('Gagal menghubungi Server Lisensi. Cek jaringan Anda.');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleManualActivate = async () => {
    if (!manualKeyInput.trim()) {
      setErrorMessage('Masukkan Kunci Lisensi Anda.');
      return;
    }
    
    setIsRequesting(true);
    setErrorMessage('');
    
    try {
      const result = await LicenseBlocker.activateLicense(manualKeyInput);
      if (result.success) {
        showDialog('alert', 'Aktivasi Sukses', 'Kunci lisensi manual Anda berhasil diverifikasi. Selamat mencoba!', () => {
          checkLicense();
        });
      } else {
        setErrorMessage(result.message);
      }
    } catch (err) {
      setErrorMessage('Gagal memverifikasi lisensi secara online.');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleCancelRequest = async () => {
    showDialog('confirm', 'Batalkan Permintaan', 'Apakah Anda yakin ingin membatalkan antrean permintaan lisensi Anda?', async () => {
      await AsyncStorage.removeItem('@license_pending_key');
      setPendingKey('');
      setPendingQrUrl('');
      setPendingPayCode('');
      setPendingAmount(0);
      setPendingInstructions([]);
      setPendingPaymentMethod('');
    });
  };

  // 4. Custom Dialog Render Helper
  const renderPremiumDialog = () => {
    if (!dialogConfig.visible) return null;

    const isConfirm = dialogConfig.type === 'confirm';
    let icon = '✔️';
    let iconBg = 'rgba(16, 185, 129, 0.1)';
    let iconBorder = 'rgba(16, 185, 129, 0.2)';
    let iconColor = '#10B981';

    if (isConfirm) {
      icon = '❓';
      iconBg = 'rgba(245, 158, 11, 0.1)';
      iconBorder = 'rgba(245, 158, 11, 0.2)';
      iconColor = '#F59E0B';
    } else if (dialogConfig.title.toLowerCase().includes('gagal') || dialogConfig.title.toLowerCase().includes('error') || dialogConfig.title.toLowerCase().includes('batal')) {
      icon = '⚠️';
      iconBg = 'rgba(239, 68, 68, 0.1)';
      iconBorder = 'rgba(239, 68, 68, 0.2)';
      iconColor = '#EF4444';
    }

    return (
      <View style={styles.dialogOverlay}>
        <View style={styles.dialogCard}>
          <View style={[styles.dialogIconBox, { backgroundColor: iconBg, borderColor: iconBorder }]}>
            <Text style={[styles.dialogIconText, { color: iconColor }]}>{icon}</Text>
          </View>
          
          <Text style={styles.dialogTitleText}>{dialogConfig.title}</Text>
          <Text style={styles.dialogMessageText}>{dialogConfig.message}</Text>
          
          <View style={styles.dialogActionsBox}>
            {isConfirm ? (
              <>
                <TouchableOpacity style={styles.dialogBtnCancel} onPress={closeDialog}>
                  <Text style={styles.dialogBtnCancelText}>BATAL</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.dialogBtnConfirm} 
                  onPress={() => {
                    closeDialog();
                    if (dialogConfig.onConfirm) dialogConfig.onConfirm();
                  }}
                >
                  <Text style={styles.dialogBtnConfirmText}>YA, SETUJU</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity 
                style={styles.dialogBtnOk} 
                onPress={() => {
                  closeDialog();
                  if (dialogConfig.onConfirm) dialogConfig.onConfirm();
                }}
              >
                <Text style={styles.dialogBtnOkText}>OK, SAYA PAHAM</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderPolicyModal = () => {
    if (!activePolicyTab) return null;

    let title = '';
    let content = null;

    if (activePolicyTab === 'privacy') {
      title = '🛡️ KEBIJAKAN PRIVASI';
      content = (
        <View style={{ gap: 12 }}>
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>1. Pengumpulan Informasi</Text>
          <Text style={{ color: '#94A3B8', fontSize: 10, lineHeight: 14 }}>
            Orkestra Ujian (Baraya Teknologi) mengumpulkan data berupa nama sekolah/lembaga, data perangkat (device ID/limit HP) untuk keperluan validasi lisensi, serta data transaksi pembayaran. Kami tidak menyebarkan data ini kepada pihak ketiga selain mitra pemroses pembayaran kami (Tripay).
          </Text>
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>2. Keamanan Data</Text>
          <Text style={{ color: '#94A3B8', fontSize: 10, lineHeight: 14 }}>
            Seluruh data lisensi dan kunci aktivasi dilindungi dengan enkripsi tanda tangan kriptografi RS256 yang aman. Transaksi pembayaran Anda diproses menggunakan koneksi terenkripsi SSL/HTTPS secara langsung oleh Payment Gateway resmi (Tripay).
          </Text>
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>3. Kontak Keamanan</Text>
          <Text style={{ color: '#94A3B8', fontSize: 10, lineHeight: 14 }}>
            Jika Anda memiliki pertanyaan mengenai privasi data Anda, silakan hubungi kami melalui email: support@absenta.id.
          </Text>
        </View>
      );
    } else if (activePolicyTab === 'terms') {
      title = '📄 SYARAT & KETENTUAN';
      content = (
        <View style={{ gap: 12 }}>
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>1. Lisensi Penggunaan</Text>
          <Text style={{ color: '#94A3B8', fontSize: 10, lineHeight: 14 }}>
            Lisensi diberikan per sekolah/lembaga terdaftar dan dibatasi sesuai paket yang dibeli (Limit HP atau Unlimited). Dilarang menyalahgunakan, meretas, memodifikasi kunci lisensi, atau menggunakan aplikasi untuk tujuan yang melanggar hukum.
          </Text>
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>2. Tanggung Jawab Pengguna</Text>
          <Text style={{ color: '#94A3B8', fontSize: 10, lineHeight: 14 }}>
            Pihak proktor/sekolah bertanggung jawab atas penggunaan aplikasi pada saat ujian berlangsung. Kami tidak bertanggung jawab atas kegagalan koneksi internet lokal atau penyalahgunaan akun di luar kendali sistem kami.
          </Text>
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>3. Perubahan Layanan</Text>
          <Text style={{ color: '#94A3B8', fontSize: 10, lineHeight: 14 }}>
            Kami berhak memperbarui fitur aplikasi sewaktu-waktu guna meningkatkan keamanan sistem ujian.
          </Text>
        </View>
      );
    } else if (activePolicyTab === 'refund') {
      title = '🔄 KEBIJAKAN REFUND';
      content = (
        <View style={{ gap: 12 }}>
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>1. Sifat Produk Digital (SaaS)</Text>
          <Text style={{ color: '#94A3B8', fontSize: 10, lineHeight: 14 }}>
            Karena sistem lisensi sekolah kami adalah produk digital SaaS yang langsung aktif secara otomatis setelah pembayaran sukses dideteksi oleh webhook Tripay, maka seluruh pembelian bersifat final dan tidak dapat dikembalikan (non-refundable).
          </Text>
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>2. Pengecualian Sistem Ganda</Text>
          <Text style={{ color: '#94A3B8', fontSize: 10, lineHeight: 14 }}>
            Refund hanya dapat diajukan jika terjadi kesalahan sistem ganda (misal: saldo terpotong namun status invoice tetap gagal dan tidak dapat diaktifkan setelah 3x24 jam pemeriksaan manual oleh dukungan teknis kami).
          </Text>
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>3. Prosedur Klaim</Text>
          <Text style={{ color: '#94A3B8', fontSize: 10, lineHeight: 14 }}>
            Klaim kendala pembayaran dapat dikirimkan ke support@absenta.id dengan menyertakan bukti pembayaran Tripay resmi dan nomor invoice Anda.
          </Text>
        </View>
      );
    } else if (activePolicyTab === 'contact') {
      title = '📞 HUBUNGI KAMI';
      content = (
        <View style={{ gap: 12 }}>
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Dukungan Pelanggan</Text>
          <Text style={{ color: '#94A3B8', fontSize: 10, lineHeight: 14 }}>
            Kami siap membantu Anda jika terjadi kendala pada lisensi sekolah atau pembayaran:
          </Text>
          <View style={{ backgroundColor: '#0F172A', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#334155', gap: 4 }}>
            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '600' }}>🏢 Developer: Baraya Teknologi</Text>
            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '600' }}>📧 Email: support@absenta.id</Text>
            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '600' }}>💬 Telegram: @baraya_teknologi</Text>
            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '600' }}>🌐 Website: https://absenta.id</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.dialogOverlay}>
        <View style={[styles.card, { maxHeight: '80%', width: '90%', maxWidth: 420 }]}>
          <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={[styles.lockTitle, { fontSize: 13 }]}>{title}</Text>
            <TouchableOpacity 
              style={{ backgroundColor: '#334155', padding: 8, borderRadius: 10, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }} 
              onPress={() => setActivePolicyTab(null)}
            >
              <Text style={{ color: '#94A3B8', fontWeight: 'bold', fontSize: 14 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ width: '100%' }} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
            {content}
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderBillingModal = () => {
    if (!showBillingModal) return null;

    return (
      <View style={styles.dialogOverlay}>
        <View style={[styles.card, { maxHeight: '85%', width: '95%', maxWidth: 450 }]}>
          {/* Header */}
          <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View>
              <Text style={styles.lockTitle}>📋 BILLING SEKOLAH</Text>
              <Text style={[styles.lockSubtitle, { fontSize: 8 }]}>Detail Lisensi &amp; Riwayat Invoice</Text>
            </View>
            <TouchableOpacity 
              style={{ backgroundColor: '#334155', padding: 8, borderRadius: 10, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }} 
              onPress={() => setShowBillingModal(false)}
            >
              <Text style={{ color: '#94A3B8', fontWeight: 'bold', fontSize: 14 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ width: '100%', flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
            {isLoadingBilling ? (
              <View style={{ paddingVertical: 40, alignItems: 'center', gap: 10 }}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '700' }}>Mengambil Data Billing...</Text>
              </View>
            ) : billingError ? (
              <View style={{ paddingVertical: 20, alignItems: 'center', width: '100%' }}>
                <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 18, marginBottom: 20 }}>{billingError}</Text>
                
                {/* Input Manual Kunci Lisensi di Billing Modal */}
                <View style={{ width: '100%', backgroundColor: '#1E293B', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155', gap: 12, marginBottom: 16 }}>
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>🔑 Hubungkan Lisensi Secara Manual</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 10, lineHeight: 14 }}>
                    Jika Anda memiliki Kunci Lisensi (format ORK-XXXX-XXXX-XXXX), masukkan di bawah ini untuk menghubungkan perangkat Anda dengan billing sekolah secara instan.
                  </Text>
                  <TextInput
                    placeholder="Contoh: ORK-ABCD-EF12-G345"
                    placeholderTextColor="#475569"
                    style={{
                      backgroundColor: '#0F172A',
                      borderRadius: 12,
                      padding: 14,
                      color: '#FFF',
                      fontSize: 12,
                      fontWeight: '700',
                      borderWidth: 1,
                      borderColor: '#475569',
                      width: '100%',
                      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                    }}
                    value={manualKeyInput}
                    onChangeText={setManualKeyInput}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={[styles.btnPrimary, { width: '100%', paddingVertical: 14 }]}
                    onPress={async () => {
                      if (!manualKeyInput.trim()) {
                        setBillingError('Silakan masukkan Kunci Lisensi Anda.');
                        return;
                      }
                      setIsLoadingBilling(true);
                      setBillingError('');
                      try {
                        const result = await LicenseBlocker.activateLicense(manualKeyInput.trim());
                        if (result.success) {
                          // Lisensi berhasil diaktifkan secara lokal, muat ulang info billing!
                          await fetchMyBillingInfo();
                        } else {
                          setBillingError(`Gagal aktivasi: ${result.message}`);
                        }
                      } catch (err) {
                        setBillingError('Gagal memverifikasi lisensi secara online.');
                      } finally {
                        setIsLoadingBilling(false);
                      }
                    }}
                  >
                    <Text style={styles.btnPrimaryText}>⚡ HUBUNGKAN LISENSI</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.btnSecondary, { width: '100%' }]} onPress={fetchMyBillingInfo}>
                  <Text style={styles.btnSecondaryText}>🔄 COBA LAGI</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                {/* School Info Section */}
                <View style={{ backgroundColor: '#0F172A', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#334155' }}>
                  <Text style={[styles.sectionHeader, { marginBottom: 8, fontSize: 10 }]}>Sekolah Terdaftar</Text>
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '900' }}>{schoolBoundName || 'Lembaga / Sekolah Anda'}</Text>
                  
                  <View style={{ height: 1, backgroundColor: '#334155', marginVertical: 10 }} />
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600' }}>Status Aktif:</Text>
                    <Text style={{ color: isLicenseExpired ? '#EF4444' : '#10B981', fontSize: 11, fontWeight: '800' }}>
                      {isLicenseExpired ? 'EXPIRED' : 'AKTIF'}
                    </Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600' }}>Berakhir Pada:</Text>
                    <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>{licenseExpiry || '-'}</Text>
                  </View>

                  {daysRemaining !== null && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600' }}>Sisa Masa Aktif:</Text>
                      <Text style={{ color: daysRemaining <= 7 ? '#F59E0B' : '#60A5FA', fontSize: 11, fontWeight: '800' }}>
                        {daysRemaining < 0 ? 'Sudah habis' : `${daysRemaining} Hari`}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Subscriptions Section */}
                <View>
                  <Text style={[styles.sectionHeader, { marginBottom: 8, fontSize: 11 }]}>💳 Paket Langganan Aktif</Text>
                  {!mySubscriptions || !Array.isArray(mySubscriptions) || mySubscriptions.length === 0 ? (
                    <Text style={{ color: '#64748B', fontSize: 11, fontStyle: 'italic', paddingLeft: 4 }}>Belum ada data paket langganan.</Text>
                  ) : (
                    mySubscriptions.map((sub, idx) => {
                      if (!sub) return null;
                      const isActive = sub.status === 'active';
                      const isExpired = sub.status === 'expired';
                      const statusColor = isActive ? '#10B981' : isExpired ? '#EF4444' : '#F59E0B';
                      
                      return (
                        <View key={sub.id || idx} style={{ backgroundColor: '#1E293B', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: isActive ? 'rgba(16, 185, 129, 0.3)' : '#334155', marginBottom: 8 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '800', textTransform: 'uppercase' }}>
                              {sub.plan_id === 'monthly' ? 'Paket Bulanan' : sub.plan_id === 'semester' ? 'Paket Semesteran' : sub.plan_id === 'annual' ? 'Paket Tahunan' : String(sub.plan_id || '')}
                            </Text>
                            <View style={{ backgroundColor: `${statusColor}15`, borderColor: `${statusColor}30`, borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                              <Text style={{ color: statusColor, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' }}>{String(sub.status || '')}</Text>
                            </View>
                          </View>
                          <View style={{ height: 1, backgroundColor: '#334155', marginVertical: 8 }} />
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '600' }}>Mulai:</Text>
                            <Text style={{ color: '#CBD5E1', fontSize: 10, fontWeight: '700' }}>{String(sub.start_date || '-')}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '600' }}>Berakhir:</Text>
                            <Text style={{ color: '#CBD5E1', fontSize: 10, fontWeight: '700' }}>{String(sub.end_date || '-')}</Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>

                {/* Invoices Section */}
                <View>
                  <Text style={[styles.sectionHeader, { marginBottom: 8, fontSize: 11 }]}>🧾 Riwayat Invoice &amp; Pembayaran</Text>
                  {!myInvoices || !Array.isArray(myInvoices) || myInvoices.length === 0 ? (
                    <Text style={{ color: '#64748B', fontSize: 11, fontStyle: 'italic', paddingLeft: 4 }}>Belum ada riwayat pembayaran.</Text>
                  ) : (
                    myInvoices.map((inv, idx) => {
                      if (!inv) return null;
                      const isPaid = inv.status === 'paid';
                      const isFailed = inv.status === 'failed';
                      const statusColor = isPaid ? '#10B981' : isFailed ? '#EF4444' : '#F59E0B';
                      const amountFormatted = typeof inv.amount === 'number' 
                        ? `Rp ${inv.amount.toLocaleString('id-ID')}` 
                        : (inv.amount ? `Rp ${inv.amount}` : 'Rp 0');

                      return (
                        <View key={inv.id || idx} style={{ backgroundColor: '#0F172A', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#334155', marginBottom: 8 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '900' }}>{String(inv.invoice_number || '')}</Text>
                            <View style={{ backgroundColor: `${statusColor}15`, borderColor: `${statusColor}30`, borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                              <Text style={{ color: statusColor, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' }}>
                                {inv.status === 'paid' ? 'PAID' : inv.status === 'unpaid' ? 'PENDING' : String(inv.status || '')}
                              </Text>
                            </View>
                          </View>
                          
                          <View style={{ height: 1, backgroundColor: '#334155', marginVertical: 8 }} />
                          
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '600' }}>Layanan / Paket:</Text>
                            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>{String(inv.plan_title || '')}</Text>
                          </View>
                          
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '600' }}>Total Bayar:</Text>
                            <Text style={{ color: '#60A5FA', fontSize: 10, fontWeight: '800' }}>{amountFormatted}</Text>
                          </View>

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '600' }}>Metode Pembayaran:</Text>
                            <Text style={{ color: '#CBD5E1', fontSize: 10, fontWeight: '700' }}>{String(inv.payment_method || 'QRIS')}</Text>
                          </View>

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '600' }}>Tanggal:</Text>
                            <Text style={{ color: '#CBD5E1', fontSize: 10, fontWeight: '700' }}>{inv.created_at ? String(inv.created_at).substring(0, 19) : '-'}</Text>
                          </View>

                          {isPaid && inv.paid_at && (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                              <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '600' }}>Waktu Lunas:</Text>
                              <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '700' }}>{String(inv.paid_at).substring(0, 19)}</Text>
                            </View>
                          )}

                          <TouchableOpacity 
                            style={{ 
                              flexDirection: 'row', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                              borderColor: 'rgba(59, 130, 246, 0.3)', 
                              borderWidth: 1, 
                              borderRadius: 10, 
                              paddingVertical: 8, 
                              marginTop: 10,
                              gap: 6
                            }} 
                            onPress={async () => {
                              const { Linking } = require('react-native');
                              const url = `${LICENSE_SERVER_URL}/api/license/print-invoice/${inv.invoice_number}`;
                              try {
                                const supported = await Linking.canOpenURL(url);
                                if (supported) {
                                  await Linking.openURL(url);
                                } else {
                                  showDialog('alert', 'Error', 'Tidak dapat membuka halaman cetak invoice.');
                                }
                              } catch (e) {
                                showDialog('alert', 'Error', 'Kesalahan koneksi saat membuka invoice.');
                              }
                            }}
                          >
                            <Text style={{ color: '#60A5FA', fontSize: 10, fontWeight: '800' }}>📄 CETAK INVOICE SPJ (BOS)</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}
                </View>

                {/* Navigation to Renewal / Purchase Modal */}
                <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 16 }}>
                  <Text style={[styles.sectionHeader, { marginBottom: 8, fontSize: 11, color: '#3B82F6' }]}>
                    ⚡ LAYANAN MANDIRI SEKOLAH
                  </Text>
                  <Text style={{ color: '#94A3B8', fontSize: 10, lineHeight: 14, marginBottom: 12 }}>
                    Ingin memperpanjang masa aktif langganan atau mengaktifkan paket harga lain secara mandiri? Klik tombol di bawah.
                  </Text>
                  <TouchableOpacity 
                    style={[styles.btnPrimary, { backgroundColor: '#F59E0B', shadowColor: '#F59E0B' }]} 
                    onPress={() => {
                      setShowBillingModal(false);
                      setShowPurchaseModal(true);
                    }}
                  >
                    <Text style={styles.btnPrimaryText}>⚡ PERPANJANG / BELI PAKET BARU</Text>
                  </TouchableOpacity>
                </View>

              </View>
            )}
          </ScrollView>

          <Text style={{ color: '#475569', fontSize: 7, fontWeight: '800', textAlign: 'center', marginTop: 8 }}>
            VERSI BUNDLE: V1.0.2-SECURE-REV2
          </Text>

          <TouchableOpacity style={[styles.btnSecondary, { marginTop: 6 }]} onPress={() => setShowBillingModal(false)}>
            <Text style={styles.btnSecondaryText}>Tutup Billing</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPurchaseModal = () => {
    if (!showPurchaseModal) return null;

    return (
      <View style={styles.dialogOverlay}>
        <View style={[styles.card, { maxHeight: '85%', width: '95%', maxWidth: 450 }]}>
          {/* Header */}
          <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View>
              <Text style={[styles.lockTitle, { color: '#F59E0B' }]}>⚡ BELI PAKET &amp; PERPANJANG</Text>
              <Text style={[styles.lockSubtitle, { fontSize: 8 }]}>Pilih Paket Lisensi Sekolah</Text>
            </View>
            <TouchableOpacity 
              style={{ backgroundColor: '#334155', padding: 8, borderRadius: 10, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }} 
              onPress={() => setShowPurchaseModal(false)}
            >
              <Text style={{ color: '#94A3B8', fontWeight: 'bold', fontSize: 14 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ width: '100%', flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
            {pendingKey ? (
              // ── TRIPAY DYNAMIC PAYMENT RENEWAL BOX ──
              <View style={{ backgroundColor: '#0F172A', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#F59E0B', alignItems: 'center' }}>
                <View style={[styles.badgePending, { marginTop: 0 }]}>
                  <Text style={styles.badgePendingText}>Menunggu Pembayaran Perpanjangan</Text>
                </View>
                
                <Text style={[styles.description, { fontSize: 10, marginTop: 8, textAlign: 'center' }]}>
                  Silakan selesaikan pembayaran menggunakan metode {pendingPaymentMethod || 'QRIS'} berikut untuk memperpanjang lisensi sekolah Anda.
                </Text>

                <View style={[styles.keyContainer, { marginVertical: 8 }]}>
                  <Text style={styles.label}>KUNCI PERPANJANGAN:</Text>
                  <Text style={[styles.keyText, { fontSize: 11 }]}>{pendingKey}</Text>
                </View>

                {/* Dynamic Price Aggregate Box */}
                {pendingAmount > 0 && (
                  <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)', width: '100%', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ color: '#94A3B8', fontSize: 8, fontWeight: '700' }}>TOTAL NOMINAL TRANSFER:</Text>
                    <Text style={{ color: '#F59E0B', fontSize: 16, fontWeight: '900', marginTop: 2 }}>
                      Rp {pendingAmount.toLocaleString('id-ID')}
                    </Text>
                    <Text style={{ color: '#64748B', fontSize: 6.5, marginTop: 2, textAlign: 'center' }}>
                      *Mohon bayar dengan nominal presisi agar sistem mendeteksi otomatis.
                    </Text>
                  </View>
                )}

                {/* Conditional Payment Method Rendering */}
                {(!pendingPayCode || pendingPaymentMethod === 'QRIS' || pendingPaymentMethod === 'QRIS2') ? (
                  <Image 
                    source={{ uri: pendingQrUrl || `${LICENSE_SERVER_URL}/qris.png?t=${Date.now()}` }} 
                    style={[styles.qrisImage, { width: 170, height: 230, borderRadius: 14 }]}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={{ width: '100%', gap: 8, marginVertical: 8, alignItems: 'center' }}>
                    <Text style={{ color: '#94A3B8', fontSize: 9, fontWeight: '800' }}>
                      {pendingPaymentMethod.includes('VA') ? 'NOMOR VIRTUAL ACCOUNT' : 'KODE PEMBAYARAN KASIR'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#020617', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#334155', width: '100%', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1, flex: 1 }}>
                        {pendingPayCode}
                      </Text>
                      <TouchableOpacity
                        style={{ backgroundColor: '#1E293B', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#475569' }}
                        onPress={() => {
                          const { Clipboard } = require('react-native');
                          Clipboard.setString(pendingPayCode);
                          showDialog('alert', 'Teks Disalin', 'Kode pembayaran telah berhasil disalin ke clipboard.');
                        }}
                      >
                        <Text style={{ color: '#3B82F6', fontSize: 8, fontWeight: '900' }}>📋 SALIN</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Dynamic Step-by-Step Payment Instructions */}
                {pendingInstructions && pendingInstructions.length > 0 && (
                  <View style={{ width: '100%', gap: 4, marginTop: 8, alignSelf: 'stretch' }}>
                    <Text style={{ color: '#94A3B8', fontSize: 8.5, fontWeight: '800' }}>💡 PANDUAN CARA PEMBAYARAN:</Text>
                    <View style={{ backgroundColor: '#0F172A', borderRadius: 12, padding: 10, gap: 8, borderWidth: 1, borderColor: '#334155' }}>
                      {pendingInstructions.slice(0, 2).map((inst: any, idx: number) => (
                        <View key={idx} style={{ gap: 2 }}>
                          <Text style={{ color: '#F59E0B', fontSize: 8.5, fontWeight: '800' }}>
                            {idx + 1}. {inst.title}
                          </Text>
                          {inst.steps && inst.steps.slice(0, 4).map((step: string, sidx: number) => (
                            <Text key={sidx} style={{ color: '#CBD5E1', fontSize: 7.5, lineHeight: 11, paddingLeft: 6 }}>
                              • {step.replace(/<\/?[^>]+(>|$)/g, "")}
                            </Text>
                          ))}
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View style={[styles.statusTextContainer, { marginTop: 10 }]}>
                  <ActivityIndicator size="small" color="#F59E0B" />
                  <Text style={[styles.statusText, { fontSize: 9 }]}>Mengecek pembayaran otomatis...</Text>
                </View>

                <TouchableOpacity 
                  style={[styles.btnSecondary, { marginTop: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', borderWidth: 1 }]} 
                  onPress={handleCancelRequest}
                >
                  <Text style={[styles.btnSecondaryText, { color: '#EF4444', fontSize: 9 }]}>✕ Batalkan Pembayaran</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // ── FORM PILIH PAKET & REQUEST QRIS ──
              <View style={{ gap: 12 }}>
                <Text style={{ color: '#94A3B8', fontSize: 11, lineHeight: 16 }}>
                  Pilih paket lisensi sekolah di bawah ini dan isi nama sekolah untuk meminta kode QRIS perpanjangan atau masukkan kunci manual.
                </Text>

                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                {/* Pricing Packages List */}
                <View style={{ gap: 8 }}>
                  {packagesList.map((pkg) => {
                    const isSelected = selectedPackage === pkg.id;
                    return (
                      <TouchableOpacity 
                        key={pkg.id}
                        style={[
                          { 
                            flexDirection: 'row', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            backgroundColor: '#0F172A', 
                            borderWidth: 1.5, 
                            borderColor: '#334155', 
                            borderRadius: 14, 
                            padding: 12 
                          }, 
                          isSelected && { borderColor: '#3B82F6', backgroundColor: 'rgba(59, 130, 246, 0.05)' }
                        ]}
                        onPress={() => setSelectedPackage(pkg.id)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>
                            {pkg.title} {pkg.badge ? `(${pkg.badge})` : ''}
                          </Text>
                          <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '700', marginTop: 2 }}>
                            Durasi: {pkg.duration} | {pkg.is_unlimited === 1 || pkg.device_limit === 0 || pkg.limit === 0 || (pkg.device_limit >= 9999) || (pkg.limit >= 9999) ? 'Unlimited HP' : `Limit ${pkg.device_limit ?? pkg.limit} HP`}
                          </Text>
                        </View>
                        <Text style={{ color: '#3B82F6', fontSize: 13, fontWeight: '900' }}>{pkg.price}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Pilih Metode Pembayaran */}
                <View style={{ gap: 6 }}>
                  <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '800' }}>METODE PEMBAYARAN</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {paymentChannels.length > 0 ? (
                      paymentChannels.map((channel) => {
                        const isSelected = selectedChannel === channel.code;
                        return (
                          <TouchableOpacity
                            key={channel.code}
                            style={[
                              {
                                paddingVertical: 8,
                                paddingHorizontal: 12,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: '#334155',
                                backgroundColor: '#0F172A',
                                minWidth: '47%',
                                flexGrow: 1,
                                justifyContent: 'center'
                              },
                              isSelected && { borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.05)' }
                            ]}
                            onPress={() => setSelectedChannel(channel.code)}
                            activeOpacity={0.8}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              {channel.icon_url ? (
                                <Image 
                                  source={{ uri: channel.icon_url }} 
                                  style={{ width: 40, height: 25, borderRadius: 4, backgroundColor: '#FFF' }}
                                  resizeMode="contain"
                                />
                              ) : null}
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: isSelected ? '#F59E0B' : '#FFF', fontSize: 10, fontWeight: '800' }}>
                                  {channel.name}
                                </Text>
                                <Text style={{ color: '#64748B', fontSize: 8, fontWeight: '700', marginTop: 2 }}>
                                  Biaya: {formatChannelFee(channel)}
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    ) : (
                      <View style={{ padding: 12, width: '100%', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="#F59E0B" />
                        <Text style={{ color: '#64748B', fontSize: 8, marginTop: 4 }}>Memuat pilihan pembayaran...</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Input School Name */}
                <View style={{ gap: 4 }}>
                  <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '800' }}>NAMA SEKOLAH / LEMBAGA</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Nama Sekolah / Lembaga" 
                    placeholderTextColor="#64748B"
                    value={requestSchoolName}
                    onChangeText={setRequestSchoolName}
                  />
                </View>

                {/* Rincian Pembayaran */}
                {(() => {
                  const { amount, fee, total, packageName } = getSelectedPlanAmountAndFee();
                  return (
                    <View style={{ backgroundColor: '#020617', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#334155', gap: 6 }}>
                      <Text style={{ color: '#F59E0B', fontSize: 9, fontWeight: '800' }}>📋 RINCIAN BIAYA PEMBAYARAN</Text>
                      
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#94A3B8', fontSize: 9 }}>Harga Paket ({packageName}):</Text>
                        <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800' }}>Rp {amount.toLocaleString('id-ID')}</Text>
                      </View>
                      
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#94A3B8', fontSize: 9 }}>Biaya Layanan (Tripay):</Text>
                        <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800' }}>Rp {fee.toLocaleString('id-ID')}</Text>
                      </View>
                      
                      <View style={{ height: 1, backgroundColor: '#334155', marginVertical: 2 }} />
                      
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>Total Pembayaran:</Text>
                        <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '900' }}>Rp {total.toLocaleString('id-ID')}</Text>
                      </View>
                    </View>
                  );
                })()}

                <TouchableOpacity 
                  style={styles.btnPrimary} 
                  onPress={handleRequestActivation}
                  disabled={isRequesting}
                >
                  {isRequesting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>⚡ PROSES PEMBAYARAN TRIPAY</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>ATAU KUNCI MANUAL</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Manual Key Section */}
                <View style={{ gap: 4 }}>
                  <TextInput 
                    style={styles.input} 
                    placeholder="ORK-XXXX-XXXX-XXXX" 
                    placeholderTextColor="#64748B"
                    autoCapitalize="characters"
                    value={manualKeyInput}
                    onChangeText={setManualKeyInput}
                  />
                  <TouchableOpacity 
                    style={[styles.btnPrimary, { backgroundColor: '#10B981' }]} 
                    onPress={handleManualActivate}
                    disabled={isRequesting}
                  >
                    {isRequesting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.btnPrimaryText}>AKTIFKAN SEKARANG</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 12 }}>
            <TouchableOpacity 
              style={[styles.btnSecondary, { flex: 1, marginTop: 0 }]} 
              onPress={() => {
                setShowPurchaseModal(false);
                setShowBillingModal(true);
              }}
            >
              <Text style={styles.btnSecondaryText}>◀ Info Billing</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.btnSecondary, { flex: 1, marginTop: 0, backgroundColor: '#334155' }]} 
              onPress={() => setShowPurchaseModal(false)}
            >
              <Text style={styles.btnSecondaryText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // 5. Render Locked Screens
  if (licenseStatus === 'checking') {
    return (
      <View style={styles.lockContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.lockSubtitle}>Mempersiapkan Aplikasi...</Text>
      </View>
    );
  }

  if (licenseStatus === 'locked') {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.lockContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          
          <View style={styles.card}>
            <Text style={styles.lockEmoji}>🛡️</Text>
            <Text style={styles.lockTitle}>ORKESTRA UJIAN</Text>
            <Text style={styles.lockSubtitle}>Sistem Proteksi Lisensi</Text>

            {isLicenseExpired && (
              <View style={styles.expiredAlert}>
                <Text style={styles.expiredAlertText}>❌ LISENSI KEDALUWARSA</Text>
                <Text style={{ color: '#F87171', fontSize: 10, fontWeight: '700', marginTop: 6, textAlign: 'center', lineHeight: 14 }}>
                  Masa langganan sekolah ({schoolBoundName || 'Anda'}) telah berakhir pada {licenseExpiry}. Hubungi proktor atau lakukan pembayaran paket di bawah untuk mengaktifkan kembali.
                </Text>
                <TouchableOpacity 
                  style={[styles.btnSecondary, { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.4)', borderWidth: 1, marginTop: 10, paddingVertical: 8 }]} 
                  onPress={fetchMyBillingInfo}
                >
                  <Text style={[styles.btnSecondaryText, { color: '#FCA5A5', fontSize: 10 }]}>📋 DETAIL BILLING SEKOLAH</Text>
                </TouchableOpacity>
              </View>
            )}

            {pendingKey ? (
              // ── TRIPAY DYNAMIC PAYMENT SCREEN ──
              <View style={styles.innerView}>
                <View style={styles.badgePending}>
                  <Text style={styles.badgePendingText}>Menunggu Pembayaran</Text>
                </View>
                
                <Text style={styles.description}>
                  Permintaan dikirim. Silakan selesaikan pembayaran menggunakan metode {pendingPaymentMethod || 'QRIS'} berikut. Aplikasi akan terbuka secara otomatis begitu pembayaran lunas terdeteksi.
                </Text>

                <View style={styles.keyContainer}>
                  <Text style={styles.label}>KUNCI LISENSI ANDA:</Text>
                  <Text style={styles.keyText}>{pendingKey}</Text>
                </View>

                {/* Dynamic Price Aggregate Box */}
                {pendingAmount > 0 && (
                  <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)', width: '100%', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ color: '#94A3B8', fontSize: 9, fontWeight: '700' }}>TOTAL NOMINAL TRANSFER:</Text>
                    <Text style={{ color: '#F59E0B', fontSize: 18, fontWeight: '900', marginTop: 2 }}>
                      Rp {pendingAmount.toLocaleString('id-ID')}
                    </Text>
                    <Text style={{ color: '#64748B', fontSize: 7, marginTop: 2, textAlign: 'center' }}>
                      *Mohon transfer dengan nominal tepat agar sistem mendeteksi secara otomatis.
                    </Text>
                  </View>
                )}

                {/* Conditional Payment Method Rendering */}
                {(!pendingPayCode || pendingPaymentMethod === 'QRIS' || pendingPaymentMethod === 'QRIS2') ? (
                  <Image 
                    source={{ uri: pendingQrUrl || `${LICENSE_SERVER_URL}/qris.png?t=${Date.now()}` }} 
                    style={styles.qrisImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={{ width: '100%', gap: 8, marginVertical: 8, alignItems: 'center' }}>
                    <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '800' }}>
                      {pendingPaymentMethod.includes('VA') ? 'NOMOR VIRTUAL ACCOUNT' : 'KODE PEMBAYARAN KASIR'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#020617', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#334155', width: '100%', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 1, flex: 1 }}>
                        {pendingPayCode}
                      </Text>
                      <TouchableOpacity
                        style={{ backgroundColor: '#1E293B', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#475569' }}
                        onPress={() => {
                          const { Clipboard } = require('react-native');
                          Clipboard.setString(pendingPayCode);
                          showDialog('alert', 'Teks Disalin', 'Kode pembayaran telah berhasil disalin ke clipboard.');
                        }}
                      >
                        <Text style={{ color: '#3B82F6', fontSize: 8, fontWeight: '900' }}>📋 SALIN</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Dynamic Step-by-Step Payment Instructions */}
                {pendingInstructions && pendingInstructions.length > 0 && (
                  <View style={{ width: '100%', gap: 4, marginTop: 8, alignSelf: 'stretch' }}>
                    <Text style={{ color: '#94A3B8', fontSize: 9, fontWeight: '800' }}>💡 PANDUAN CARA PEMBAYARAN:</Text>
                    <View style={{ backgroundColor: '#0F172A', borderRadius: 12, padding: 12, gap: 10, borderWidth: 1, borderColor: '#334155' }}>
                      {pendingInstructions.slice(0, 2).map((inst: any, idx: number) => (
                        <View key={idx} style={{ gap: 2 }}>
                          <Text style={{ color: '#F59E0B', fontSize: 9, fontWeight: '800' }}>
                            {idx + 1}. {inst.title}
                          </Text>
                          {inst.steps && inst.steps.slice(0, 4).map((step: string, sidx: number) => (
                            <Text key={sidx} style={{ color: '#CBD5E1', fontSize: 8, lineHeight: 12, paddingLeft: 6 }}>
                              • {step.replace(/<\/?[^>]+(>|$)/g, "")}
                            </Text>
                          ))}
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.statusTextContainer}>
                  <ActivityIndicator size="small" color="#F59E0B" />
                  <Text style={styles.statusText}>Mengecek pembayaran otomatis...</Text>
                </View>

                <TouchableOpacity 
                  style={[styles.btnSecondary, { borderColor: '#475569', borderWidth: 1, backgroundColor: 'transparent', marginTop: 12 }]} 
                  onPress={fetchMyBillingInfo}
                >
                  <Text style={[styles.btnSecondaryText, { color: '#CBD5E1', fontSize: 10 }]}>📋 DETAIL BILLING SEKOLAH</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.btnSecondary} onPress={handleCancelRequest}>
                  <Text style={styles.btnSecondaryText}>✕ Batal &amp; Kembali</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // ── REQUEST & MANUAL INPUT FORM SCREEN ──
              <View style={styles.innerView}>
                <Text style={styles.description}>
                  Aplikasi ini terkunci. Silakan ajukan permintaan lisensi baru atau masukkan kunci lisensi manual untuk menggunakan.
                </Text>

                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                {/* Modern Pricing List Section */}
                <View style={styles.formSection}>
                  <Text style={styles.pricingTitle}>Pilih Paket Lisensi Sekolah:</Text>
                  <View style={styles.pricingGrid}>
                    {packagesList.map((pkg) => {
                      const isSelected = selectedPackage === pkg.id;
                      return (
                        <TouchableOpacity 
                          key={pkg.id}
                          style={[styles.priceCard, isSelected && styles.priceCardSelected]}
                          onPress={() => setSelectedPackage(pkg.id)}
                          activeOpacity={0.8}
                        >
                          {pkg.badge ? (
                            <View style={styles.priceBadge}>
                              <Text style={styles.priceBadgeText}>{pkg.badge}</Text>
                            </View>
                          ) : null}
                          <Text style={styles.pricePackTitle}>{pkg.title}</Text>
                          <Text style={styles.priceText}>{pkg.price}</Text>
                          <Text style={styles.priceSub}>/ {pkg.duration}</Text>
                          
                          <Text style={[styles.priceLimit, isSelected && styles.priceLimitSelected]}>
                             {pkg.is_unlimited === 1 || pkg.device_limit === 0 || pkg.limit === 0 || (pkg.device_limit >= 9999) || (pkg.limit >= 9999)
                               ? 'HP: Unlimited'
                               : `Limit ${pkg.device_limit ?? pkg.limit} HP`}
                           </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Form A: Request QRIS Activation */}
                <View style={styles.formSection}>
                  <Text style={styles.sectionHeader}>1. Ajukan Aktivasi Baru</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Nama Sekolah / Lembaga" 
                    placeholderTextColor="#64748B"
                    value={requestSchoolName}
                    onChangeText={setRequestSchoolName}
                  />

                  {/* Payment Channel Selector */}
                  <View style={{ gap: 4, marginTop: 4 }}>
                    <Text style={{ color: '#94A3B8', fontSize: 9, fontWeight: '800' }}>PILIH METODE PEMBAYARAN:</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {paymentChannels.length > 0 ? (
                        paymentChannels.map((channel) => {
                          const isSelected = selectedChannel === channel.code;
                          return (
                            <TouchableOpacity
                              key={channel.code}
                              style={[
                                {
                                  paddingVertical: 6,
                                  paddingHorizontal: 10,
                                  borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor: '#334155',
                                  backgroundColor: '#0F172A',
                                  minWidth: '47%',
                                  flexGrow: 1,
                                  justifyContent: 'center'
                                },
                                isSelected && { borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.05)' }
                              ]}
                              onPress={() => setSelectedChannel(channel.code)}
                              activeOpacity={0.8}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                {channel.icon_url ? (
                                  <Image 
                                    source={{ uri: channel.icon_url }} 
                                    style={{ width: 35, height: 22, borderRadius: 4, backgroundColor: '#FFF' }}
                                    resizeMode="contain"
                                  />
                                ) : null}
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: isSelected ? '#F59E0B' : '#FFF', fontSize: 9, fontWeight: '800' }}>
                                    {channel.name}
                                  </Text>
                                  <Text style={{ color: '#64748B', fontSize: 7, fontWeight: '700', marginTop: 1 }}>
                                    Biaya: {formatChannelFee(channel)}
                                  </Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        })
                      ) : (
                        <View style={{ padding: 8, width: '100%', alignItems: 'center' }}>
                          <ActivityIndicator size="small" color="#F59E0B" />
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Dynamic Cost Breakdown */}
                  <View style={{ marginTop: 6, marginBottom: 2 }}>
                    {(() => {
                      const { amount, fee, total, packageName } = getSelectedPlanAmountAndFee();
                      return (
                        <View style={{ backgroundColor: '#020617', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#334155', gap: 4 }}>
                          <Text style={{ color: '#F59E0B', fontSize: 8, fontWeight: '800' }}>📋 RINCIAN BIAYA PEMBAYARAN</Text>
                          
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: '#94A3B8', fontSize: 8 }}>Harga Paket ({packageName}):</Text>
                            <Text style={{ color: '#FFF', fontSize: 8, fontWeight: '800' }}>Rp {amount.toLocaleString('id-ID')}</Text>
                          </View>
                          
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: '#94A3B8', fontSize: 8 }}>Biaya Layanan (Tripay):</Text>
                            <Text style={{ color: '#FFF', fontSize: 8, fontWeight: '800' }}>Rp {fee.toLocaleString('id-ID')}</Text>
                          </View>
                          
                          <View style={{ height: 1, backgroundColor: '#334155', marginVertical: 1 }} />
                          
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800' }}>Total Pembayaran:</Text>
                            <Text style={{ color: '#3B82F6', fontSize: 10, fontWeight: '900' }}>Rp {total.toLocaleString('id-ID')}</Text>
                          </View>
                        </View>
                      );
                    })()}
                  </View>

                  <TouchableOpacity 
                    style={styles.btnPrimary} 
                    onPress={handleRequestActivation}
                    disabled={isRequesting}
                  >
                    {isRequesting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.btnPrimaryText}>⚡ PROSES PEMBAYARAN TRIPAY</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>ATAU</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Form B: Enter Manual Key */}
                <View style={styles.formSection}>
                  <Text style={styles.sectionHeader}>2. Aktivasi Kunci Manual</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="ORK-XXXX-XXXX-XXXX" 
                    placeholderTextColor="#64748B"
                    autoCapitalize="characters"
                    value={manualKeyInput}
                    onChangeText={setManualKeyInput}
                  />
                  <TouchableOpacity 
                    style={[styles.btnPrimary, { backgroundColor: '#10B981' }]} 
                    onPress={handleManualActivate}
                    disabled={isRequesting}
                  >
                    {isRequesting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.btnPrimaryText}>AKTIFKAN SEKARANG</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={[styles.btnSecondary, { borderColor: '#475569', borderWidth: 1, backgroundColor: 'transparent', marginTop: 16 }]} 
                  onPress={fetchMyBillingInfo}
                >
                  <Text style={[styles.btnSecondaryText, { color: '#CBD5E1', fontSize: 10 }]}>📋 DETAIL BILLING SEKOLAH</Text>
                </TouchableOpacity>

              </View>
            )}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12, marginBottom: 4 }}>
              <TouchableOpacity onPress={() => setActivePolicyTab('privacy')}>
                <Text style={{ color: '#3B82F6', fontSize: 9, fontWeight: '700', textDecorationLine: 'underline' }}>Kebijakan Privasi</Text>
              </TouchableOpacity>
              <Text style={{ color: '#475569', fontSize: 9 }}>•</Text>
              <TouchableOpacity onPress={() => setActivePolicyTab('terms')}>
                <Text style={{ color: '#3B82F6', fontSize: 9, fontWeight: '700', textDecorationLine: 'underline' }}>Ketentuan Layanan</Text>
              </TouchableOpacity>
              <Text style={{ color: '#475569', fontSize: 9 }}>•</Text>
              <TouchableOpacity onPress={() => setActivePolicyTab('refund')}>
                <Text style={{ color: '#3B82F6', fontSize: 9, fontWeight: '700', textDecorationLine: 'underline' }}>Kebijakan Refund</Text>
              </TouchableOpacity>
              <Text style={{ color: '#475569', fontSize: 9 }}>•</Text>
              <TouchableOpacity onPress={() => setActivePolicyTab('contact')}>
                <Text style={{ color: '#3B82F6', fontSize: 9, fontWeight: '700', textDecorationLine: 'underline' }}>Hubungi Kami</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.brandFooter, { marginTop: 4 }]}>powered by BARAYA TEKNOLOGI</Text>
          </View>
          
        </ScrollView>
      </View>
      {renderBillingModal()}
      {renderPurchaseModal()}
      {renderPremiumDialog()}
      {renderPolicyModal()}
    </View>
  );
}

  // 6. Normal Stack Render (Unlocked)
  return (
    <ThemeProvider value={activeTheme === 'dark' ? NavDarkTheme : NavDefaultTheme}>
      <View style={{ flex: 1 }}>
        {daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0 && (
          <TouchableOpacity activeOpacity={0.8} onPress={fetchMyBillingInfo} style={styles.warningBanner}>
            <Text style={styles.warningBannerText}>
              ⚠️ PERINGATAN: Masa aktif langganan sekolah ({schoolBoundName}) akan habis dalam {daysRemaining} hari lagi ({licenseExpiry}). Klik di sini untuk melihat detail billing / perpanjangan!
            </Text>
          </TouchableOpacity>
        )}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="exam-list" />
          <Stack.Screen name="exam-webview" />
          <Stack.Screen name="blocked" />
          <Stack.Screen name="teacher/login" />
          <Stack.Screen name="teacher/dashboard" />
          <Stack.Screen name="teacher/create-exam" />
          <Stack.Screen name="teacher/manage-data" />
          <Stack.Screen name="teacher/settings" />
        </Stack>
        {renderBillingModal()}
        {renderPurchaseModal()}
        {renderPremiumDialog()}
      </View>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeContextProvider>
      <InnerLayout />
    </ThemeContextProvider>
  );
}

// Styles are imported from './_layout.styles' at the top of this file.
