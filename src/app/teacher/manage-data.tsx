import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Platform,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as XLSX from 'xlsx';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DbService, Jurusan, Kelas, Siswa, Guru, Mapel, LinkSoal } from '@/services/supabase';
import AdminLayout, { AdminTab } from '@/components/admin/AdminLayout';
import {
  AdminTitle,
  AnalyticCard,
  AdminToolbar,
  AdminPagination,
  AdminModal,
  ConfirmDialog,
  BulkActionBar,
} from '@/components/admin/AdminComponents';
import AdminTable from '@/components/admin/AdminTable';
import { FormInput, FormSelect, FormSwitch } from '@/components/admin/AdminForm';
import { ImportProgressModal } from '@/components/admin/ImportProgressModal';
import { DateTimePicker } from '@/components/admin/DateTimePicker';

import { JurusanForm } from '@/components/admin/forms/JurusanForm';
import { KelasForm } from '@/components/admin/forms/KelasForm';
import { SiswaForm } from '@/components/admin/forms/SiswaForm';
import { GuruForm } from '@/components/admin/forms/GuruForm';
import { MapelForm } from '@/components/admin/forms/MapelForm';
import { LinkSoalForm } from '@/components/admin/forms/LinkSoalForm';

import { JurusanRow } from '@/components/admin/table/JurusanRow';
import { KelasRow } from '@/components/admin/table/KelasRow';
import { SiswaRow } from '@/components/admin/table/SiswaRow';
import { GuruRow } from '@/components/admin/table/GuruRow';
import { MapelRow } from '@/components/admin/table/MapelRow';
import { LinkSoalRow } from '@/components/admin/table/LinkSoalRow';

export default function ManageDataScreen() {
  const router = useRouter();

  // Navigation & Tab State
  const [activeTab, setActiveTab] = useState<AdminTab>('jurusan');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Master Data State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handlePullToRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [jurusans, setJurusans] = useState<Jurusan[]>([]);
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [siswas, setSiswas] = useState<Siswa[]>([]);
  const [gurus, setGurus] = useState<Guru[]>([]);
  const [mapels, setMapels] = useState<Mapel[]>([]);
  const [linkSoals, setLinkSoals] = useState<LinkSoal[]>([]);

  // Statistics State
  const [stats, setStats] = useState({
    jurusan: 0,
    kelas: 0,
    siswa: 0,
    guru: 0,
    mapel: 0,
    link_soal: 0,
  });

  // Modal & Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Delete State
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Bulk Select State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirmVisible, setBulkDeleteConfirmVisible] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Toggle aktif/nonaktif guru langsung dari baris tabel
  const [togglingGuruId, setTogglingGuruId] = useState<string | null>(null);

  // Import State
  const [importVisible, setImportVisible] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  // Import Progress State
  const [importProgressVisible, setImportProgressVisible] = useState(false);
  const [importProgressCurrent, setImportProgressCurrent] = useState(0);
  const [importProgressTotal, setImportProgressTotal] = useState(0);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success', duration = 3500) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ message, type });
    toastTimeout.current = setTimeout(() => setToast(null), duration);
  };

  // Form Fields State
  // Jurusan Fields
  const [jurusanNama, setJurusanNama] = useState('');
  // Kelas Fields
  const [kelasTingkat, setKelasTingkat] = useState('XII');
  const [kelasNama, setKelasNama] = useState('');
  const [kelasJurusanId, setKelasJurusanId] = useState('');
  // Siswa Fields
  const [siswaNisn, setSiswaNisn] = useState('');
  const [siswaNama, setSiswaNama] = useState('');
  const [siswaKelasId, setSiswaKelasId] = useState('');
  // Guru Fields
  const [guruNama, setGuruNama] = useState('');
  const [guruUsername, setGuruUsername] = useState('');
  const [guruPin, setGuruPin] = useState('');
  
  // Mapel Fields (Master)
  const [mapelNama, setMapelNama] = useState('');
  const [mapelSingkatan, setMapelSingkatan] = useState('');

  // Link Soal Fields
  const [linkSoalKelasId, setLinkSoalKelasId] = useState('');
  const [linkSoalMapelId, setLinkSoalMapelId] = useState('');
  const [linkSoalGuruId, setLinkSoalGuruId] = useState('');
  const [linkSoalTanggalUjian, setLinkSoalTanggalUjian] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });
  const [linkSoalWaktuUjian, setLinkSoalWaktuUjian] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });
  const [linkSoalLink, setLinkSoalLink] = useState('');
  const [linkSoalIsActive, setLinkSoalIsActive] = useState(true);
  const [linkSoalEnableBlocking, setLinkSoalEnableBlocking] = useState(true);
  const [isActive, setIsActive] = useState(true);

  // ── Date/Time Picker States ──
  const [dateTimePickerVisible, setDateTimePickerVisible] = useState(false);

  const formatIndonesianDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      return `${day} ${months[monthIdx]} ${year}`;
    } catch { return dateStr; }
  };

  const handleConfirmDateTime = (dateStr: string, timeStr: string) => {
    setLinkSoalTanggalUjian(dateStr);
    setLinkSoalWaktuUjian(timeStr);
    setDateTimePickerVisible(false);
  };

  // Load Data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [jList, kList, sList, gList, mList, lList] = await Promise.all([
        DbService.getJurusan(),
        DbService.getKelas(),
        DbService.getSiswa(),
        DbService.getGuru(),
        DbService.getMapel(),
        DbService.getLinkSoal(),
      ]);

      setJurusans(jList);
      setKelas(kList);
      setSiswas(sList);
      setGurus(gList);
      setMapels(mList);
      setLinkSoals(lList);

      setStats({
        jurusan: jList.length,
        kelas: kList.length,
        siswa: sList.length,
        guru: gList.length,
        mapel: mList.length,
        link_soal: lList.length,
      });
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat data master dari server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const cachedId = await AsyncStorage.getItem('@logged_in_guru_id');
        if (!cachedId) {
          showToast('Akses ditolak. Silakan login terlebih dahulu.', 'error');
          router.replace('/teacher/login');
          return;
        }

        const gurusList = await DbService.getGuru();
        const currentGuru = gurusList.find(g => g.id === cachedId);

        if (!currentGuru || currentGuru.username.toLowerCase() !== 'admin') {
          showToast('Akses ditolak. Halaman ini hanya untuk Administrator.', 'error');
          router.replace('/teacher/dashboard');
          return;
        }

        // Verified as admin!
        setIsAdmin(true);
        loadAllData();
      } catch (e) {
        console.error('Failed to verify admin status:', e);
        router.replace('/teacher/login');
      }
    };

    verifyAdmin();
  }, []);

  // Reset page and selection when switching tabs or typing search query
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [activeTab, searchQuery]);

  // Form Reset
  const resetForm = () => {
    setEditingId(null);
    setErrors({});
    
    // Jurusan
    setJurusanNama('');
    // Kelas
    setKelasTingkat('XII');
    setKelasNama('');
    setKelasJurusanId(jurusans[0]?.id || '');
    // Siswa
    setSiswaNisn('');
    setSiswaNama('');
    setSiswaKelasId(kelas[0]?.id || '');
    // Guru
    setGuruNama('');
    setGuruUsername('');
    setGuruPin('');
    // Mapel
    setMapelNama('');
    setMapelSingkatan('');
    // Link Soal
    setLinkSoalKelasId(kelas[0]?.id || '');
    setLinkSoalMapelId(mapels[0]?.id || '');
    setLinkSoalGuruId(gurus[0]?.id || '');
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setLinkSoalTanggalUjian(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
    setLinkSoalWaktuUjian(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
    setLinkSoalLink('');
    setLinkSoalIsActive(true);
    setLinkSoalEnableBlocking(true);
    setIsActive(true);
  };

  // Trigger Create Modal
  const handleOpenAdd = () => {
    resetForm();
    setModalMode('create');
    setModalVisible(true);
  };

  // Trigger Edit Modal
  const handleOpenEdit = (item: any) => {
    try {
      resetForm();
      setModalMode('edit');
      setEditingId(item.id);
      
      if (activeTab === 'jurusan') {
        const j = item as Jurusan;
        setJurusanNama(j.nama_jurusan || '');
        setIsActive(j.is_active !== false);
      } else if (activeTab === 'kelas') {
        const k = item as Kelas;
        setKelasTingkat(k.tingkat || 'XII');
        setKelasNama(k.nama_kelas || '');
        setKelasJurusanId(k.jurusan_id || '');
        setIsActive(k.is_active !== false);
      } else if (activeTab === 'siswa') {
        const s = item as Siswa;
        setSiswaNisn(s.nisn || '');
        setSiswaNama(s.nama_siswa || '');
        setSiswaKelasId(s.kelas_id || '');
        setIsActive(s.is_active !== false);
      } else if (activeTab === 'guru') {
        const g = item as Guru;
        setGuruNama(g.nama_guru || '');
        setGuruUsername(g.username || '');
        setGuruPin(g.pin_pengawas || '');
        setIsActive(g.is_active !== false);
      } else if (activeTab === 'mapel') {
        const m = item as Mapel;
        setMapelNama(m.nama_mapel || '');
        setMapelSingkatan(m.singkatan || '');
        setIsActive(m.is_active !== false);
      } else if (activeTab === 'link_soal') {
        const l = item as LinkSoal;
        setLinkSoalKelasId(l.kelas_id || '');
        setLinkSoalMapelId(l.mapel_id || '');
        setLinkSoalGuruId(l.guru_id || '');
        setLinkSoalTanggalUjian(l.tanggal_ujian || '');
        setLinkSoalWaktuUjian(l.waktu_ujian || '');
        setLinkSoalLink(l.google_form_link || '');
        setLinkSoalIsActive(l.is_active !== false);
        setLinkSoalEnableBlocking(l.enable_blocking !== false);
      }
      
      setModalVisible(true);
    } catch (err: any) {
      console.error('Error opening edit form:', err);
      Alert.alert('Gagal Membuka Form', err.message || 'Terjadi kesalahan saat memuat data edit.');
    }
  };

  // Submit Form Handler
  const handleSave = async () => {
    const errs: Record<string, string> = {};
    let success = false;

    try {
      if (activeTab === 'jurusan') {
        if (!jurusanNama.trim()) errs.nama = 'Nama jurusan tidak boleh kosong';
        if (Object.keys(errs).length > 0) {
          setErrors(errs);
          return;
        }

        setIsSaving(true);
        if (modalMode === 'create') {
          await DbService.addJurusan(jurusanNama.trim());
        } else if (editingId) {
          await DbService.updateJurusan(editingId, jurusanNama.trim(), isActive);
        }
        success = true;

      } else if (activeTab === 'kelas') {
        if (!kelasNama.trim()) errs.nama = 'Nama kelas tidak boleh kosong';
        if (!kelasJurusanId) errs.jurusan = 'Silakan pilih jurusan';
        if (Object.keys(errs).length > 0) {
          setErrors(errs);
          return;
        }

        setIsSaving(true);
        if (modalMode === 'create') {
          await DbService.addKelas(kelasTingkat, kelasNama.trim(), kelasJurusanId);
        } else if (editingId) {
          await DbService.updateKelas(editingId, kelasTingkat, kelasNama.trim(), kelasJurusanId, isActive);
        }
        success = true;

      } else if (activeTab === 'siswa') {
        if (!siswaNisn.trim()) errs.nisn = 'NISN tidak boleh kosong';
        if (!siswaNama.trim()) errs.nama = 'Nama siswa tidak boleh kosong';
        if (!siswaKelasId) errs.kelas = 'Silakan pilih kelas';
        if (Object.keys(errs).length > 0) {
          setErrors(errs);
          return;
        }

        setIsSaving(true);
        if (modalMode === 'create') {
          await DbService.addSiswa(siswaNisn.trim(), siswaNama.trim(), siswaKelasId);
        } else if (editingId) {
          await DbService.updateSiswa(editingId, siswaNisn.trim(), siswaNama.trim(), siswaKelasId, isActive);
        }
        success = true;

      } else if (activeTab === 'guru') {
        if (!guruNama.trim()) errs.nama = 'Nama guru tidak boleh kosong';
        if (!guruUsername.trim()) errs.username = 'Username tidak boleh kosong';
        if (!guruPin.trim()) errs.pin = 'PIN tidak boleh kosong';
        else if (guruPin.trim().length < 4) errs.pin = 'PIN minimal 4 karakter';
        
        if (Object.keys(errs).length > 0) {
          setErrors(errs);
          return;
        }

        setIsSaving(true);
        if (modalMode === 'create') {
          await DbService.addGuru(guruNama.trim(), guruUsername.trim().toLowerCase(), guruPin.trim());
        } else if (editingId) {
          await DbService.updateGuru(editingId, guruNama.trim(), guruUsername.trim().toLowerCase(), guruPin.trim(), isActive);
        }
        success = true;

      } else if (activeTab === 'mapel') {
        if (!mapelNama.trim()) errs.nama = 'Nama mata pelajaran tidak boleh kosong';
        if (!mapelSingkatan.trim()) errs.singkatan = 'Singkatan mata pelajaran tidak boleh kosong';
        
        if (Object.keys(errs).length > 0) {
          setErrors(errs);
          return;
        }

        setIsSaving(true);
        if (modalMode === 'create') {
          await DbService.addMapel(mapelNama.trim(), mapelSingkatan.trim());
        } else if (editingId) {
          await DbService.updateMapel(editingId, mapelNama.trim(), mapelSingkatan.trim(), isActive);
        }
        success = true;

      } else if (activeTab === 'link_soal') {
        if (!linkSoalKelasId) errs.kelas = 'Pilih target kelas';
        if (!linkSoalMapelId) errs.mapel = 'Pilih mata pelajaran';
        if (!linkSoalGuruId) errs.guru = 'Pilih guru pengampu';
        if (!linkSoalTanggalUjian.trim()) errs.tanggal = 'Tanggal ujian tidak boleh kosong';
        if (!linkSoalWaktuUjian.trim()) errs.waktu = 'Waktu ujian tidak boleh kosong';
        if (!linkSoalLink.trim()) errs.link = 'Link Google Form tidak boleh kosong';
        else if (!linkSoalLink.trim().startsWith('http')) errs.link = 'Masukkan link URL yang valid';

        if (Object.keys(errs).length > 0) {
          setErrors(errs);
          return;
        }

        setIsSaving(true);
        if (modalMode === 'create') {
          await DbService.addLinkSoal(
            linkSoalKelasId,
            linkSoalMapelId,
            linkSoalGuruId,
            linkSoalTanggalUjian.trim(),
            linkSoalWaktuUjian.trim(),
            linkSoalLink.trim(),
            linkSoalEnableBlocking
          );
        } else if (editingId) {
          await DbService.updateLinkSoal(
            editingId,
            linkSoalKelasId,
            linkSoalMapelId,
            linkSoalGuruId,
            linkSoalTanggalUjian.trim(),
            linkSoalWaktuUjian.trim(),
            linkSoalLink.trim(),
            linkSoalIsActive,
            linkSoalEnableBlocking
          );
        }
        success = true;
      }

      if (success) {
        setIsSaving(false);
        setModalVisible(false);
        showToast('Data berhasil disimpan!', 'success');
        loadAllData();
      }
    } catch (e: any) {
      setIsSaving(false);
      console.error(e);
      showToast(e.message || 'Terjadi kesalahan sistem.', 'error');
    }
  };

  // Trigger Delete Confirmation
  const handleOpenDelete = (id: string) => {
    setDeletingId(id);
    setConfirmVisible(true);
  };

  // Delete Action
  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);

    try {
      let success = false;
      if (activeTab === 'jurusan') {
        success = await DbService.deleteJurusan(deletingId);
      } else if (activeTab === 'kelas') {
        success = await DbService.deleteKelas(deletingId);
      } else if (activeTab === 'siswa') {
        success = await DbService.deleteSiswa(deletingId);
      } else if (activeTab === 'guru') {
        success = await DbService.deleteGuru(deletingId);
      } else if (activeTab === 'mapel') {
        success = await DbService.deleteMapel(deletingId);
      } else if (activeTab === 'link_soal') {
        success = await DbService.deleteLinkSoal(deletingId);
      }

      if (success) {
        showToast('Data berhasil dihapus.', 'success');
        setConfirmVisible(false);
        loadAllData();
      } else {
        showToast('Data gagal dihapus.', 'error');
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Terjadi kesalahan saat menghapus data.', 'error');
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  // ==========================================
  // BULK SELECT & BULK DELETE
  // ==========================================
  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = filteredData.map((item: any) => item.id);
    setSelectedIds(new Set(allIds));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    setBulkDeleteConfirmVisible(false);
    const ids = Array.from(selectedIds);
    let successCount = 0;
    let failCount = 0;
    try {
      for (const id of ids) {
        try {
          let ok = false;
          if (activeTab === 'jurusan') ok = await DbService.deleteJurusan(id);
          else if (activeTab === 'kelas') ok = await DbService.deleteKelas(id);
          else if (activeTab === 'siswa') ok = await DbService.deleteSiswa(id);
          else if (activeTab === 'guru') ok = await DbService.deleteGuru(id);
          else if (activeTab === 'mapel') ok = await DbService.deleteMapel(id);
          else if (activeTab === 'link_soal') ok = await DbService.deleteLinkSoal(id);
          if (ok) successCount++; else failCount++;
        } catch { failCount++; }
      }
      setSelectedIds(new Set());
      await loadAllData();
      if (failCount === 0) {
        showToast(`${successCount} data berhasil dihapus.`, 'success');
      } else {
        showToast(`${successCount} berhasil, ${failCount} gagal dihapus.`, 'info');
      }
    } catch (e: any) {
      showToast(e.message || 'Terjadi kesalahan saat bulk delete.', 'error');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // ==========================================
  // EXCEL & TEXT IMPORT LOGIC
  // ==========================================
  const triggerFilePickerWeb = () => {
    if (Platform.OS !== 'web') {
      // For mobile, show copy-paste modal instead
      setImportText('');
      setImportError('');
      setImportVisible(true);
      return;
    }

    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx, .xls, .csv';
      
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt: any) => {
          try {
            const data = evt.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);
            await processImportData(json);
          } catch (err: any) {
            console.error(err);
            showToast('Format berkas Excel tidak valid.', 'error');
          }
        };
        reader.readAsBinaryString(file);
      };

      input.click();
    } catch (err) {
      console.error(err);
      // Fallback in case of elements restriction on Web
      setImportVisible(true);
    }
  };

  const processImportData = async (rawList: any[]) => {
    if (!rawList || rawList.length === 0) {
      throw new Error('Data yang diimpor kosong.');
    }

    // Tampilkan progress modal
    setImportProgressCurrent(0);
    setImportProgressTotal(rawList.length);
    setImportProgressVisible(true);

    const onProgress = (current: number, total: number) => {
      setImportProgressCurrent(current);
      setImportProgressTotal(total);
    };

    let success = false;
    if (activeTab === 'jurusan') {
      success = await DbService.importJurusans(rawList, onProgress);
    } else if (activeTab === 'kelas') {
      success = await DbService.importKelas(rawList, onProgress);
    } else if (activeTab === 'siswa') {
      success = await DbService.importSiswa(rawList, onProgress);
    } else if (activeTab === 'guru') {
      success = await DbService.importGuru(rawList, onProgress);
    } else if (activeTab === 'mapel') {
      success = await DbService.importMapel(rawList, onProgress);
    } else if (activeTab === 'link_soal') {
      success = await DbService.importLinkSoal(rawList, onProgress);
    }

    if (success) {
      // Tahan sebentar di 100% agar user melihat selesai
      setImportProgressCurrent(rawList.length);
      await new Promise(r => setTimeout(r, 1200));
      setImportProgressVisible(false);
      showToast(`${rawList.length} data berhasil diimpor.`, 'success');
      setImportVisible(false);
      loadAllData();
    } else {
      setImportProgressVisible(false);
      throw new Error('Terjadi kegagalan saat memasukkan data ke penyimpanan.');
    }
  };

  // Helper parser for custom input (CSV & JSON Fallback for mobile)
  const handleProcessTextImport = async () => {
    setImportError('');
    const text = importText.trim();
    if (!text) {
      setImportError('Teks data tidak boleh kosong.');
      return;
    }

    try {
      let parsedData: any[] = [];
      if (text.startsWith('[')) {
        // Parse as JSON array
        parsedData = JSON.parse(text);
      } else {
        // Parse as CSV
        const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
        if (lines.length === 0) throw new Error('Format CSV tidak terbaca.');

        // Autodetect delimiter
        const firstLine = lines[0];
        let delimiter = ',';
        if (firstLine.includes(';')) delimiter = ';';
        else if (firstLine.includes('\t')) delimiter = '\t';

        const headers = firstLine.split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(delimiter).map((v) => v.trim().replace(/^["']|["']$/g, ''));
          const rowObj: Record<string, string> = {};
          headers.forEach((header, idx) => {
            rowObj[header] = values[idx] || '';
          });
          parsedData.push(rowObj);
        }
      }

      await processImportData(parsedData);
    } catch (err: any) {
      console.error(err);
      setImportError(err.message || 'Gagal memproses data. Periksa kembali format input.');
    }
  };

  const handleDownloadTemplate = () => {
    let headers: string[] = [];
    let sampleData: Record<string, any>[] = [];
    const fileName = `template_${activeTab}.xlsx`;

    if (activeTab === 'jurusan') {
      headers = ['nama_jurusan'];
      sampleData = [
        { nama_jurusan: 'Rekayasa Perangkat Lunak (RPL)' },
        { nama_jurusan: 'Teknik Jaringan Akses (TJA)' },
      ];
    } else if (activeTab === 'kelas') {
      headers = ['tingkat', 'nama_kelas', 'nama_jurusan'];
      sampleData = [
        { tingkat: 'XI', nama_kelas: 'XI RPL 1', nama_jurusan: 'Rekayasa Perangkat Lunak (RPL)' },
        { tingkat: 'XI', nama_kelas: 'XI TJA 1', nama_jurusan: 'Teknik Jaringan Akses (TJA)' },
      ];
    } else if (activeTab === 'siswa') {
      headers = ['nisn', 'nama_siswa', 'nama_kelas'];
      sampleData = [
        { nisn: '0054321001', nama_siswa: 'Andi Saputra', nama_kelas: 'XI RPL 1' },
        { nisn: '0054321002', nama_siswa: 'Budi Santoso', nama_kelas: 'XI TJA 1' },
      ];
    } else if (activeTab === 'guru') {
      headers = ['nama_guru', 'username', 'pin_pengawas'];
      sampleData = [
        { nama_guru: 'Ani Wijaya, S.Pd.', username: 'aniwijaya', pin_pengawas: '1234' },
        { nama_guru: 'Budi Raharjo, S.T.', username: 'budiraharjo', pin_pengawas: '5678' },
      ];
    } else if (activeTab === 'mapel') {
      headers = ['nama_mapel', 'singkatan'];
      sampleData = [
        { nama_mapel: 'Matematika', singkatan: 'MTK' },
        { nama_mapel: 'Fisika', singkatan: 'FIS' },
      ];
    } else if (activeTab === 'link_soal') {
      headers = ['nama_kelas', 'nama_mapel', 'nama_guru', 'tanggal_ujian', 'waktu_ujian', 'google_form_link', 'enable_blocking'];
      sampleData = [
        {
          nama_kelas: 'XI RPL 1',
          nama_mapel: 'Matematika',
          nama_guru: 'Ani Wijaya, S.Pd.',
          tanggal_ujian: '2026-05-22',
          waktu_ujian: '08:00',
          google_form_link: 'https://forms.gle/yAPo1YgvEzghYcX8A',
          enable_blocking: 'true',
        },
        {
          nama_kelas: 'XI TJA 1',
          nama_mapel: 'Fisika',
          nama_guru: 'Budi Raharjo, S.T.',
          tanggal_ujian: '2026-05-22',
          waktu_ujian: '10:00',
          google_form_link: 'https://forms.gle/yAPo1YgvEzghYcX8A',
          enable_blocking: 'false',
        },
      ];
    }

    try {
      if (Platform.OS === 'web') {
        const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
        XLSX.writeFile(workbook, fileName);
      } else {
        const colsInfo = headers.join(', ');
        const rowsInfo = sampleData.map((row) =>
          headers.map((h) => row[h]).join(', ')
        ).join('\n');
        showToast(`Format: ${colsInfo}`, 'info', 5000);
      }
    } catch (err: any) {
      console.error(err);
      showToast('Terjadi kesalahan saat membuat template Excel.', 'error');
    }
  };

  // ==========================================
  // SEARCH & FILTERING LOGIC
  // ==========================================
  const getFilteredData = () => {
    const q = searchQuery.toLowerCase().trim();

    if (activeTab === 'jurusan') {
      return jurusans.filter((j) => j.nama_jurusan.toLowerCase().includes(q));
    }
    if (activeTab === 'kelas') {
      return kelas.filter(
        (k) =>
          k.nama_kelas.toLowerCase().includes(q) ||
          k.tingkat.toLowerCase().includes(q) ||
          (k.jurusan_nama && k.jurusan_nama.toLowerCase().includes(q))
      );
    }
    if (activeTab === 'siswa') {
      return siswas.filter(
        (s) =>
          s.nama_siswa.toLowerCase().includes(q) ||
          s.nisn.includes(q) ||
          (s.kelas_nama && s.kelas_nama.toLowerCase().includes(q))
      );
    }
    if (activeTab === 'guru') {
      return gurus.filter(
        (g) =>
          g.nama_guru.toLowerCase().includes(q) ||
          g.username.toLowerCase().includes(q)
      );
    }
    if (activeTab === 'mapel') {
      return mapels.filter(
        (m) =>
          m.nama_mapel.toLowerCase().includes(q) ||
          m.singkatan.toLowerCase().includes(q)
      );
    }
    if (activeTab === 'link_soal') {
      return linkSoals.filter(
        (l) =>
          (l.mapel_nama && l.mapel_nama.toLowerCase().includes(q)) ||
          (l.kelas_nama && l.kelas_nama.toLowerCase().includes(q)) ||
          (l.guru_nama && l.guru_nama.toLowerCase().includes(q)) ||
          l.google_form_link.toLowerCase().includes(q)
      );
    }
    return [];
  };

  const filteredData = getFilteredData();
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  // Slice data for active page
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const isAllPageSelected = paginatedData.length > 0 && paginatedData.every((item: any) => selectedIds.has(item.id));
  const isAllFilteredSelected = filteredData.length > 0 && filteredData.every((item: any) => selectedIds.has(item.id));

  // Custom cell values based on columns
  const getTableHeaders = () => {
    switch (activeTab) {
      case 'jurusan':
        return ['Nama Jurusan', 'ID', 'Status', 'Aksi'];
      case 'kelas':
        return ['Tingkat', 'Nama Kelas', 'Jurusan', 'Jumlah Siswa', 'Status', 'Aksi'];
      case 'siswa':
        return ['NISN', 'Nama Lengkap', 'Kelas', 'Status', 'Aksi'];
      case 'guru':
        return ['Nama Guru', 'Username', 'PIN Pengawas', 'Status', 'Aksi'];
      case 'mapel':
        return ['Nama Mapel', 'Singkatan', 'Status', 'Aksi'];
      case 'link_soal':
        return ['Mata Pelajaran', 'Target Kelas', 'Guru Pengampu', 'Tanggal', 'Waktu', 'Link Google Form', 'Proteksi', 'Status', 'Aksi'];
    }
  };

  if (isAdmin !== true) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ color: '#94A3B8', marginTop: 15, fontSize: 16, fontWeight: '600' }}>
          Memverifikasi Hak Akses...
        </Text>
      </View>
    );
  }

  return (
    <AdminLayout
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);
        setSearchQuery('');
      }}
      onBackPress={() => router.replace('/teacher/dashboard')}
      onRefresh={handlePullToRefresh}
      refreshing={refreshing}
    >
      {/* ==========================================
          IMPORT PROGRESS MODAL
      ========================================== */}
      <ImportProgressModal
        visible={importProgressVisible}
        current={importProgressCurrent}
        total={importProgressTotal}
        label={activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('_', ' ')}
      />

      {/* ==========================================
          TOAST NOTIFICATION
      ========================================== */}
      {toast && (
        <View style={[
          styles.toast,
          toast.type === 'success' && styles.toastSuccess,
          toast.type === 'error' && styles.toastError,
          toast.type === 'info' && styles.toastInfo,
        ]}>
          <Text style={styles.toastIcon}>
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
          </Text>
          <Text style={styles.toastText}>{toast.message}</Text>
          <TouchableOpacity onPress={() => setToast(null)} style={styles.toastClose}>
            <Text style={styles.toastCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Title */}
      <AdminTitle
        title={`Kelola Data ${activeTab.toUpperCase()}`}
        subtitle={`Operasi CRUD dan manajemen impor data excel untuk tabel ${activeTab}.`}
      />

      {/* Analytics Cards Header */}
      <View style={styles.statsRow}>
        <AnalyticCard title="Total Jurusan" value={stats.jurusan} icon="🏫" color="#3B82F6" onPress={() => setActiveTab('jurusan')} />
        <AnalyticCard title="Total Kelas" value={stats.kelas} icon="👥" color="#10B981" onPress={() => setActiveTab('kelas')} />
        <AnalyticCard title="Total Siswa" value={stats.siswa} icon="👨‍🎓" color="#8B5CF6" onPress={() => setActiveTab('siswa')} />
        <AnalyticCard title="Total Guru" value={stats.guru} icon="👨‍🏫" color="#F59E0B" onPress={() => setActiveTab('guru')} />
        <AnalyticCard title="Master Mapel" value={stats.mapel} icon="📚" color="#EC4899" onPress={() => setActiveTab('mapel')} />
        <AnalyticCard title="Link Soal" value={stats.link_soal} icon="🔗" color="#06B6D4" onPress={() => setActiveTab('link_soal')} />
      </View>

      {/* Toolbar (Cari, Tambah, Import) */}
      <AdminToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={`Cari data ${activeTab}...`}
        addLabel={`Tambah ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
        onAddPress={handleOpenAdd}
        onImportPress={triggerFilePickerWeb}
        importLabel={Platform.OS === 'web' ? 'Import Excel 📥' : 'Import Teks 📥'}
        onDownloadTemplatePress={handleDownloadTemplate}
        downloadTemplateLabel={Platform.OS === 'web' ? 'Unduh Template 📄' : 'Format Template 📄'}
        onRefreshPress={loadAllData}
      />

      {/* Bulk Action Bar — muncul jika ada item dipilih */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        totalCount={filteredData.length}
        isAllSelected={isAllFilteredSelected}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onDeleteSelected={() => setBulkDeleteConfirmVisible(true)}
      />

      {/* Responsive Table */}
      <AdminTable
        headers={getTableHeaders()}
        data={paginatedData}
        loading={loading}
        minWidth={activeTab === 'link_soal' ? 1150 : activeTab === 'mapel' ? 720 : activeTab === 'guru' ? 820 : 760}
        showCheckbox={true}
        isAllSelected={isAllPageSelected}
        onToggleSelectAll={() => {
          if (isAllPageSelected) {
            setSelectedIds(prev => {
              const next = new Set(prev);
              paginatedData.forEach((item: any) => next.delete(item.id));
              return next;
            });
          } else {
            setSelectedIds(prev => {
              const next = new Set(prev);
              paginatedData.forEach((item: any) => next.add(item.id));
              return next;
            });
          }
        }}
        renderRow={(item, idx) => {
          const selected = selectedIds.has(item.id);
          const onToggleSelect = () => toggleSelectItem(item.id);
          const onEdit = () => handleOpenEdit(item);
          const onDelete = () => handleOpenDelete(item.id);

          switch (activeTab) {
            case 'jurusan':
              return (
                <JurusanRow
                  item={item as Jurusan}
                  selected={selected}
                  onToggleSelect={onToggleSelect}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              );
            case 'kelas':
              return (
                <KelasRow
                  item={item as Kelas}
                  selected={selected}
                  onToggleSelect={onToggleSelect}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  studentCount={siswas.filter((s) => s.kelas_id === item.id).length}
                />
              );
            case 'siswa':
              return (
                <SiswaRow
                  item={item as Siswa}
                  selected={selected}
                  onToggleSelect={onToggleSelect}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              );
            case 'guru': {
              const g = item as Guru;
              return (
                <GuruRow
                  item={g}
                  selected={selected}
                  onToggleSelect={onToggleSelect}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  isToggling={togglingGuruId === g.id}
                  onToggleActive={async (val) => {
                    setTogglingGuruId(g.id);
                    try {
                      await DbService.updateGuru(g.id, g.nama_guru, g.username, g.pin_pengawas, val);
                      setGurus(prev => prev.map(x => x.id === g.id ? { ...x, is_active: val } : x));
                      showToast(`${g.nama_guru} ${val ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
                    } catch (e: any) {
                      showToast('Gagal mengubah status guru', 'error');
                    } finally {
                      setTogglingGuruId(null);
                    }
                  }}
                />
              );
            }
            case 'mapel':
              return (
                <MapelRow
                  item={item as Mapel}
                  selected={selected}
                  onToggleSelect={onToggleSelect}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              );
            case 'link_soal':
              return (
                <LinkSoalRow
                  item={item as LinkSoal}
                  selected={selected}
                  onToggleSelect={onToggleSelect}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              );
            default:
              return null;
          }
        }}
      />

      {/* Pagination Controls */}
      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={(limit) => {
          setItemsPerPage(limit);
          setCurrentPage(1);
        }}
      />

      {/* Konfirmasi Bulk Delete */}
      <ConfirmDialog
        visible={bulkDeleteConfirmVisible}
        onCancel={() => !isBulkDeleting && setBulkDeleteConfirmVisible(false)}
        onConfirm={handleBulkDelete}
        title="Hapus Data Terpilih?"
        message={`Anda akan menghapus ${selectedIds.size} data ${activeTab} secara permanen. Tindakan ini tidak dapat dibatalkan.`}
        confirmText={isBulkDeleting ? 'Menghapus...' : `Hapus ${selectedIds.size} Data`}
        disabled={isBulkDeleting}
      />

      {/* ==========================================
          MODAL FORM INPUT (TAMBAH / EDIT)
      ========================================== */}
      <AdminModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={modalMode === 'create' ? `Tambah ${activeTab.toUpperCase()}` : `Edit ${activeTab.toUpperCase()}`}
      >
        {(() => {
          switch (activeTab) {
            case 'jurusan':
              return (
                <JurusanForm
                  nama={jurusanNama}
                  onChangeNama={setJurusanNama}
                  isActive={isActive}
                  onChangeIsActive={setIsActive}
                  error={errors.nama}
                />
              );
            case 'kelas':
              return (
                <KelasForm
                  tingkat={kelasTingkat}
                  onChangeTingkat={setKelasTingkat}
                  nama={kelasNama}
                  onChangeNama={setKelasNama}
                  jurusanId={kelasJurusanId}
                  onChangeJurusanId={setKelasJurusanId}
                  jurusans={jurusans}
                  isActive={isActive}
                  onChangeIsActive={setIsActive}
                  errors={errors}
                />
              );
            case 'siswa':
              return (
                <SiswaForm
                  nisn={siswaNisn}
                  onChangeNisn={setSiswaNisn}
                  nama={siswaNama}
                  onChangeNama={setSiswaNama}
                  kelasId={siswaKelasId}
                  onChangeKelasId={setSiswaKelasId}
                  kelas={kelas}
                  isActive={isActive}
                  onChangeIsActive={setIsActive}
                  errors={errors}
                />
              );
            case 'guru':
              return (
                <GuruForm
                  nama={guruNama}
                  onChangeNama={setGuruNama}
                  username={guruUsername}
                  onChangeUsername={setGuruUsername}
                  pin={guruPin}
                  onChangePin={setGuruPin}
                  isActive={isActive}
                  onChangeIsActive={setIsActive}
                  errors={errors}
                />
              );
            case 'mapel':
              return (
                <MapelForm
                  nama={mapelNama}
                  onChangeNama={setMapelNama}
                  singkatan={mapelSingkatan}
                  onChangeSingkatan={setMapelSingkatan}
                  isActive={isActive}
                  onChangeIsActive={setIsActive}
                  errors={errors}
                />
              );
            case 'link_soal':
              return (
                <LinkSoalForm
                  kelasId={linkSoalKelasId}
                  onChangeKelasId={setLinkSoalKelasId}
                  kelas={kelas}
                  mapelId={linkSoalMapelId}
                  onChangeMapelId={setLinkSoalMapelId}
                  mapels={mapels}
                  guruId={linkSoalGuruId}
                  onChangeGuruId={setLinkSoalGuruId}
                  gurus={gurus}
                  tanggalUjian={linkSoalTanggalUjian}
                  onChangeTanggalUjian={setLinkSoalTanggalUjian}
                  waktuUjian={linkSoalWaktuUjian}
                  onChangeWaktuUjian={setLinkSoalWaktuUjian}
                  link={linkSoalLink}
                  onChangeLink={setLinkSoalLink}
                  isActive={linkSoalIsActive}
                  onChangeIsActive={setLinkSoalIsActive}
                  enableBlocking={linkSoalEnableBlocking}
                  onChangeEnableBlocking={setLinkSoalEnableBlocking}
                  errors={errors}
                  onOpenDateTimePicker={() => setDateTimePickerVisible(true)}
                  formatIndonesianDate={formatIndonesianDate}
                />
              );
            default:
              return null;
          }
        })()}

        {/* Modal Submit Buttons */}
        <View style={styles.modalActions}>
          <TouchableOpacity 
            style={[styles.modalCancel, isSaving && { opacity: 0.5 }]} 
            onPress={() => !isSaving && setModalVisible(false)}
            disabled={isSaving}
          >
            <Text style={styles.modalCancelText}>Batal</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modalSubmit, isSaving && { opacity: 0.7 }]} 
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.modalSubmitText}>Simpan Data</Text>
            )}
          </TouchableOpacity>
        </View>
      </AdminModal>

      {/* ==========================================
          FALLBACK TEXT IMPORT MODAL (MOBILE / ALT)
      ========================================== */}
      <AdminModal
        visible={importVisible}
        onClose={() => setImportVisible(false)}
        title={`Import Data ${activeTab.toUpperCase()}`}
      >
        <Text style={styles.importDesc}>
          Tempelkan teks dalam format **JSON Array** atau **CSV** (dengan baris pertama adalah judul kolom) 
          yang sesuai dengan skema tabel **{activeTab}** di bawah ini.
        </Text>
        
        <FormInput
          label={`Teks Data (${activeTab})`}
          value={importText}
          onChangeText={setImportText}
          placeholder={
            activeTab === 'jurusan' 
              ? 'nama_jurusan\nRekayasa Perangkat Lunak (RPL)\nTeknik Jaringan Komputer'
              : activeTab === 'siswa'
              ? 'nama_siswa,nisn,nama_kelas\nAndi Saputra,0054321001,XII RPL 1\nCitra Lestari,0054321002,XII RPL 1'
              : activeTab === 'mapel'
              ? 'nama_mapel,singkatan\nMatematika,MTK\nFisika,FIS'
              : activeTab === 'link_soal'
              ? 'nama_kelas,nama_mapel,nama_guru,tanggal_ujian,waktu_ujian,google_form_link,enable_blocking\nXII RPL 1,Matematika,Ani Wijaya, S.Pd.,2026-05-22,08:00,https://forms.gle/xyz,true'
              : 'Tempel teks CSV / JSON Anda di sini...'
          }
        />

        {importError !== '' && <Text style={styles.importErrorText}>{importError}</Text>}

        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.modalCancel} onPress={() => setImportVisible(false)}>
            <Text style={styles.modalCancelText}>Batal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalImportBtn} onPress={handleProcessTextImport}>
            <Text style={styles.modalImportText}>Proses Impor</Text>
          </TouchableOpacity>
        </View>
      </AdminModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        visible={confirmVisible}
        title="Hapus Data Master?"
        message={`Apakah Anda yakin ingin menghapus data ini dari tabel ${activeTab}? Tindakan ini bersifat permanen.`}
        onConfirm={handleDelete}
        onCancel={() => !isDeleting && setConfirmVisible(false)}
        confirmText={isDeleting ? 'Menghapus...' : 'Hapus'}
        disabled={isDeleting}
      />

      {/* DateTime Picker Modal */}
      <DateTimePicker
        visible={dateTimePickerVisible}
        onClose={() => setDateTimePickerVisible(false)}
        onConfirm={handleConfirmDateTime}
        currentDate={linkSoalTanggalUjian}
        currentTime={linkSoalWaktuUjian}
      />

    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 15,
  },
  rowItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#263347',
    alignItems: 'center',
  },
  rowSelected: {
    backgroundColor: 'rgba(239, 68, 68, 0.07)',
  },
  rowCheckboxCell: {
    width: 36,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  rowCheckboxChecked: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  rowCheckmark: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
  cellText: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  mapelBold: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  mapelLinkSub: {
    color: '#64748B',
    fontSize: 11,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
  },
  statusInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#EF4444',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextActive: {
    color: '#10B981',
  },
  statusTextInactive: {
    color: '#EF4444',
  },
  actionsCell: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionEdit: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: '#3B82F6',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnIcon: {
    fontSize: 13,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    marginTop: 10,
  },
  switchLabel: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 16,
  },
  modalCancel: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderColor: '#334155',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: 'center',
  },
  modalCancelText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 13,
  },
  modalSubmit: {
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: 'center',
  },
  modalSubmitText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  importDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  importErrorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  modalImportBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: 'center',
  },
  modalImportText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  // ==========================================
  // TOAST STYLES
  // ==========================================
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      },
    }),
  },
  toastSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  toastError: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  toastInfo: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  toastIcon: {
    fontSize: 16,
  },
  toastText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  toastClose: {
    padding: 4,
  },
  toastCloseText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  // ── Guru toggle switch styles ──
  toggleWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  toggleLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toggleLabelActive: {
    color: '#10B981',
  },
  toggleLabelInactive: {
    color: '#64748B',
  },
  // ── Date/Time Picker Styles ──
  formLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerBtn: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    height: 44,
  },
  pickerBtnError: {
    borderColor: '#EF4444',
  },
  pickerBtnText: {
    color: '#FFF',
    fontSize: 14,
  },
  pickerBtnArrow: {
    color: '#64748B',
    fontSize: 12,
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerModalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerModalTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  pickerSubLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  pickerYearRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pickerYearBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pickerMonthBtn: {
    backgroundColor: '#0F172A',
    width: '23%',
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pickerDayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pickerDayBtn: {
    backgroundColor: '#0F172A',
    width: '12%',
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pickerBtnActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  pickerBtnTxt: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  pickerBtnTxtActive: {
    color: '#FFF',
  },
  pickerModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  cancelEditBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelEditText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  saveEditBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveEditText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  editModalClose: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '700',
  },
  timePreview: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  timePreviewText: {
    color: '#3B82F6',
    fontSize: 18,
    fontWeight: '800',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11,
    marginTop: -4,
    marginBottom: 8,
    fontWeight: '600',
  },
});

