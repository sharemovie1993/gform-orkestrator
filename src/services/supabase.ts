import { createClient } from '@supabase/supabase-js';

// Define Types
export interface Tenant {
  id: string;
  name: string;
  exam_event_title: string;
  logo_url: string | null;
  domain_or_slug: string;
  is_active: boolean;
  created_at?: string;
}

export interface Jurusan {
  id: string;
  nama_jurusan: string;
  is_active: boolean;
  created_at?: string;
}

export interface Kelas {
  id: string;
  tingkat: string;
  nama_kelas: string;
  jurusan_id: string;
  jurusan_nama?: string;
  is_active: boolean;
  created_at?: string;
}

export interface Siswa {
  id: string;
  nisn: string;
  nama_siswa: string;
  kelas_id: string;
  kelas_nama?: string;
  is_active: boolean;
  created_at?: string;
}

export interface Guru {
  id: string;
  nama_guru: string;
  username: string;
  pin_pengawas: string;
  is_active: boolean;
  created_at?: string;
}

export interface Mapel {
  id: string;
  nama_mapel: string;
  singkatan: string;
  is_active: boolean;
  created_at?: string;
}

export interface LinkSoal {
  id: string;
  kelas_id: string;
  kelas_nama?: string;
  mapel_id: string;
  mapel_nama?: string;
  guru_id: string;
  guru_nama?: string;
  tanggal_ujian: string;
  waktu_ujian: string;
  google_form_link: string;
  is_active: boolean;
  enable_blocking: boolean;
  created_at?: string;
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://xjnctgbzilrhbzsbrtpu.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_V-cqiwiR7AleBLJuILePTg_-CWhSAgg';

export const isSupabaseConfigured = supabaseUrl !== '' && supabaseAnonKey !== '';
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Debug log
console.log('[Supabase] isSupabaseConfigured =', isSupabaseConfigured, '| URL =', supabaseUrl ? supabaseUrl.substring(0, 40) + '...' : 'KOSONG');

// Helper to ensure Supabase is configured
const checkConfig = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Please define EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment variables.');
  }
};

// --- DB Service Methods ---
export class DbService {
  
  // ==========================================
  // JURUSAN CRUD
  // ==========================================
  static async getJurusan(activeOnly: boolean = false): Promise<Jurusan[]> {
    checkConfig();
    let query = supabase!.from('jurusan').select('*');
    if (activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query.order('nama_jurusan');
    if (error) throw error;
    return (data || []).map(j => ({
      ...j,
      is_active: j.is_active !== false
    }));
  }

  static async addJurusan(nama: string): Promise<Jurusan> {
    checkConfig();
    const { data, error } = await supabase!.from('jurusan').insert([{ nama_jurusan: nama, is_active: true }]).select().single();
    if (error) throw error;
    return {
      ...data,
      is_active: data.is_active !== false
    };
  }

  static async updateJurusan(id: string, nama: string, isActive: boolean): Promise<boolean> {
    checkConfig();
    const { error } = await supabase!.from('jurusan').update({ nama_jurusan: nama, is_active: isActive }).eq('id', id);
    if (error) throw error;
    return true;
  }

  static async deleteJurusan(id: string): Promise<boolean> {
    checkConfig();
    const { error } = await supabase!.from('jurusan').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  // ==========================================
  // KELAS CRUD
  // ==========================================
  static async getKelas(jurusanId?: string, activeOnly: boolean = false): Promise<Kelas[]> {
    checkConfig();
    let query = supabase!.from('kelas').select('*, jurusan(nama_jurusan)');
    if (jurusanId) query = query.eq('jurusan_id', jurusanId);
    if (activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(k => ({
      id: k.id,
      tingkat: k.tingkat,
      nama_kelas: k.nama_kelas,
      jurusan_id: k.jurusan_id,
      jurusan_nama: k.jurusan?.nama_jurusan || 'Tanpa Jurusan',
      is_active: k.is_active !== false
    }));
  }

  static async addKelas(tingkat: string, nama: string, jurusanId: string): Promise<Kelas> {
    checkConfig();
    const { data, error } = await supabase!.from('kelas').insert([
      { tingkat, nama_kelas: nama, jurusan_id: jurusanId, is_active: true }
    ]).select().single();
    if (error) throw error;
    return {
      ...data,
      is_active: data.is_active !== false
    };
  }

  static async updateKelas(id: string, tingkat: string, nama: string, jurusanId: string, isActive: boolean): Promise<boolean> {
    checkConfig();
    const { error } = await supabase!.from('kelas').update({ tingkat, nama_kelas: nama, jurusan_id: jurusanId, is_active: isActive }).eq('id', id);
    if (error) throw error;
    return true;
  }

  static async deleteKelas(id: string): Promise<boolean> {
    checkConfig();
    const { error } = await supabase!.from('kelas').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  // ==========================================
  // SISWA CRUD
  // ==========================================
  static async getSiswa(activeOnly: boolean = false): Promise<Siswa[]> {
    checkConfig();
    let query = supabase!.from('siswa').select('*, kelas(nama_kelas)');
    if (activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query.order('nama_siswa');
    if (error) throw error;
    return (data || []).map(s => ({
      id: s.id,
      nisn: s.nisn,
      nama_siswa: s.nama_siswa,
      kelas_id: s.kelas_id,
      kelas_nama: s.kelas?.nama_kelas || 'Tanpa Kelas',
      is_active: s.is_active !== false
    }));
  }

  static async getSiswaByKelas(kelasId: string, activeOnly: boolean = true): Promise<Siswa[]> {
    checkConfig();
    let query = supabase!
      .from('siswa')
      .select('*, kelas(nama_kelas)')
      .eq('kelas_id', kelasId);
    if (activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query.order('nama_siswa');
    if (error) throw error;
    return (data || []).map(s => ({
      id: s.id,
      nisn: s.nisn,
      nama_siswa: s.nama_siswa,
      kelas_id: s.kelas_id,
      kelas_nama: s.kelas?.nama_kelas || 'Tanpa Kelas',
      is_active: s.is_active !== false
    }));
  }

  static async addSiswa(nisn: string, nama: string, kelasId: string): Promise<Siswa> {
    checkConfig();
    const { data, error } = await supabase!.from('siswa').insert([
      { nisn, nama_siswa: nama, kelas_id: kelasId, is_active: true }
    ]).select().single();
    if (error) throw error;
    return {
      ...data,
      is_active: data.is_active !== false
    };
  }

  static async updateSiswa(id: string, nisn: string, nama: string, kelasId: string, isActive: boolean): Promise<boolean> {
    checkConfig();
    const { error } = await supabase!.from('siswa').update({ nisn, nama_siswa: nama, kelas_id: kelasId, is_active: isActive }).eq('id', id);
    if (error) throw error;
    return true;
  }

  static async deleteSiswa(id: string): Promise<boolean> {
    checkConfig();
    const { error } = await supabase!.from('siswa').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  // ==========================================
  // GURU CRUD
  // ==========================================
  static async getGuru(activeOnly: boolean = false): Promise<Guru[]> {
    checkConfig();
    let query = supabase!.from('guru').select('*');
    if (activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query.order('nama_guru');
    if (error) throw error;
    return (data || []).map(g => ({
      ...g,
      is_active: g.is_active !== false
    }));
  }

  static async addGuru(nama: string, username: string, pin: string): Promise<Guru> {
    checkConfig();
    const { data, error } = await supabase!.from('guru').insert([
      { nama_guru: nama, username, pin_pengawas: pin, password_hash: 'pbkdf2_sha256$260000$mockhash$' + username, is_active: true }
    ]).select().single();
    if (error) throw error;
    return {
      ...data,
      is_active: data.is_active !== false
    };
  }

  static async updateGuru(id: string, nama: string, username: string, pin: string, isActive: boolean): Promise<boolean> {
    checkConfig();
    const { error } = await supabase!.from('guru').update({ nama_guru: nama, username, pin_pengawas: pin, is_active: isActive }).eq('id', id);
    if (error) throw error;
    return true;
  }

  static async deleteGuru(id: string): Promise<boolean> {
    checkConfig();
    const { error } = await supabase!.from('guru').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  // ==========================================
  // MAPEL CRUD
  // ==========================================
  static async getMapel(activeOnly: boolean = false): Promise<Mapel[]> {
    checkConfig();
    let query = supabase!.from('mapel').select('id, nama_mapel, singkatan, created_at, is_active');
    if (activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query.order('nama_mapel');
    if (error) throw error;
    return (data || []).map(m => ({
      ...m,
      is_active: m.is_active !== false
    }));
  }

  static async addMapel(namaMapel: string, singkatan: string): Promise<boolean> {
    checkConfig();
    const { error } = await supabase!.from('mapel').insert([
      { nama_mapel: namaMapel, singkatan: singkatan, is_active: true }
    ]);
    if (error) throw error;
    return true;
  }

  static async updateMapel(id: string, namaMapel: string, singkatan: string, isActive: boolean): Promise<boolean> {
    checkConfig();
    const { error } = await supabase!.from('mapel').update({
      nama_mapel: namaMapel,
      singkatan: singkatan,
      is_active: isActive
    }).eq('id', id);
    if (error) throw error;
    return true;
  }

  static async deleteMapel(id: string): Promise<boolean> {
    checkConfig();
    const { error } = await supabase!.from('mapel').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  // ==========================================
  // LINK SOAL CRUD
  // ==========================================
  static async getLinkSoal(kelasId?: string): Promise<LinkSoal[]> {
    checkConfig();
    let query = supabase!.from('link_soal').select('*, kelas(nama_kelas), mapel(nama_mapel), guru(nama_guru)');
    if (kelasId) query = query.eq('kelas_id', kelasId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(l => ({
      id: l.id,
      kelas_id: l.kelas_id,
      kelas_nama: l.kelas?.nama_kelas || 'Tanpa Kelas',
      mapel_id: l.mapel_id,
      mapel_nama: l.mapel?.nama_mapel || 'Tanpa Mapel',
      guru_id: l.guru_id,
      guru_nama: l.guru?.nama_guru || 'Tanpa Guru',
      tanggal_ujian: l.tanggal_ujian,
      waktu_ujian: l.waktu_ujian,
      google_form_link: l.google_form_link,
      is_active: l.is_active,
      enable_blocking: l.enable_blocking !== false,
      created_at: l.created_at
    }));
  }

  static async addLinkSoal(
    kelasId: string,
    mapelId: string,
    guruId: string,
    tanggalUjian: string,
    waktuUjian: string,
    link: string,
    enableBlocking: boolean = true
  ): Promise<boolean> {
    checkConfig();
    const { error } = await supabase!.from('link_soal').insert([
      {
        kelas_id: kelasId,
        mapel_id: mapelId,
        guru_id: guruId,
        tanggal_ujian: tanggalUjian,
        waktu_ujian: waktuUjian,
        google_form_link: link,
        is_active: true,
        enable_blocking: enableBlocking
      }
    ]);
    if (error) throw error;
    return true;
  }

  static async updateLinkSoal(
    id: string,
    kelasId: string,
    mapelId: string,
    guruId: string,
    tanggalUjian: string,
    waktuUjian: string,
    link: string,
    isActive: boolean,
    enableBlocking: boolean = true
  ): Promise<boolean> {
    checkConfig();
    const { error } = await supabase!.from('link_soal').update({
      kelas_id: kelasId,
      mapel_id: mapelId,
      guru_id: guruId,
      tanggal_ujian: tanggalUjian,
      waktu_ujian: waktuUjian,
      google_form_link: link,
      is_active: isActive,
      enable_blocking: enableBlocking
    }).eq('id', id);
    if (error) throw error;
    return true;
  }

  static async deleteLinkSoal(id: string): Promise<boolean> {
    checkConfig();
    const { error } = await supabase!.from('link_soal').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  // ==========================================
  // BULK EXCEL IMPORTS
  // ==========================================
  static async importJurusans(data: any[], onProgress?: (current: number, total: number) => void): Promise<boolean> {
    const total = data.length;
    for (let i = 0; i < total; i++) {
      const row = data[i];
      const nama = row.nama_jurusan || row.Nama || row.NAMA;
      if (nama) await this.addJurusan(nama);
      onProgress?.(i + 1, total);
    }
    return true;
  }

  static async importKelas(data: any[], onProgress?: (current: number, total: number) => void): Promise<boolean> {
    const jurusans = await this.getJurusan();
    const total = data.length;
    for (let i = 0; i < total; i++) {
      const row = data[i];
      const tingkat = String(row.tingkat || row.Tingkat || row.TINGKAT || 'XII');
      const nama = row.nama_kelas || row.Nama || row.NAMA;
      const jurusanNamaInput = row.nama_jurusan || row.Jurusan || row.JURUSAN;
      let jid = jurusans[0]?.id;
      if (jurusanNamaInput) {
        const found = jurusans.find(j => j.nama_jurusan.toLowerCase().includes(jurusanNamaInput.toLowerCase()));
        if (found) jid = found.id;
      }
      if (nama && jid) await this.addKelas(tingkat, nama, jid);
      onProgress?.(i + 1, total);
    }
    return true;
  }

  static async importSiswa(data: any[], onProgress?: (current: number, total: number) => void): Promise<boolean> {
    const classes = await this.getKelas();
    const total = data.length;
    for (let i = 0; i < total; i++) {
      const row = data[i];
      const nisn = String(row.nisn || row.NISN || Math.floor(Math.random() * 100000000));
      const nama = row.nama_siswa || row.Nama || row.NAMA || row.nama || row.NamaSiswa;
      const kelasNamaInput = row.nama_kelas || row.Kelas || row.KELAS || row.kelas;
      let kid = classes[0]?.id;
      if (kelasNamaInput) {
        const found = classes.find(c => c.nama_kelas.toLowerCase().replace(/\s+/g, '') === kelasNamaInput.toLowerCase().replace(/\s+/g, ''));
        if (found) kid = found.id;
      }
      if (nama && kid) await this.addSiswa(nisn, nama, kid);
      onProgress?.(i + 1, total);
    }
    return true;
  }

  static async importGuru(data: any[], onProgress?: (current: number, total: number) => void): Promise<boolean> {
    const total = data.length;
    for (let i = 0; i < total; i++) {
      const row = data[i];
      const nama = row.nama_guru || row.Nama || row.NAMA || row.guru;
      const username = (row.username || row.Username || nama?.split(' ')[0] || `guru_${Date.now()}_${Math.floor(Math.random() * 1000)}`).toLowerCase();
      const pin = String(row.pin_pengawas || row.pin || row.PIN || '1234');
      if (nama) await this.addGuru(nama, username, pin);
      onProgress?.(i + 1, total);
    }
    return true;
  }

  static async importMapel(data: any[], onProgress?: (current: number, total: number) => void): Promise<boolean> {
    const total = data.length;
    for (let i = 0; i < total; i++) {
      const row = data[i];
      const nama = row.nama_mapel || row.Nama || row.NAMA || row.mapel || row.subject;
      const singkatan = row.singkatan || row.Singkatan || row.SINGKATAN || row.code || row.Kode;
      if (nama && singkatan) await this.addMapel(nama, singkatan);
      onProgress?.(i + 1, total);
    }
    return true;
  }

  static async importLinkSoal(data: any[], onProgress?: (current: number, total: number) => void): Promise<boolean> {
    const classes = await this.getKelas();
    const mapels = await this.getMapel();
    const gurus = await this.getGuru();
    const total = data.length;

    for (let i = 0; i < total; i++) {
      const row = data[i];
      const kelasNamaInput = row.nama_kelas || row.Kelas || row.KELAS || row.kelas;
      const mapelNamaInput = row.nama_mapel || row.Mapel || row.MAPEL || row.mapel || row.nama_mata_pelajaran || row.singkatan || row.Singkatan;
      const guruNamaInput = row.nama_guru || row.Guru || row.GURU || row.guru;
      const tanggalUjian = row.tanggal_ujian || row.Tanggal || row.TANGGAL || row.tanggal || '2026-05-22';
      const waktuUjian = row.waktu_ujian || row.Waktu || row.WAKTU || row.waktu || '08:00:00';
      const link = row.google_form_link || row.link || row.URL || row.url || row.Link;

      let kid = classes[0]?.id;
      if (kelasNamaInput) {
        const found = classes.find(c => c.nama_kelas.toLowerCase().replace(/\s+/g, '') === kelasNamaInput.toLowerCase().replace(/\s+/g, ''));
        if (found) kid = found.id;
      }

      let mid = mapels[0]?.id;
      if (mapelNamaInput) {
        const found = mapels.find(m =>
          m.nama_mapel.toLowerCase().includes(mapelNamaInput.toLowerCase()) ||
          m.singkatan.toLowerCase() === mapelNamaInput.toLowerCase()
        );
        if (found) mid = found.id;
      }

      let gid = gurus[0]?.id;
      if (guruNamaInput) {
        const found = gurus.find(g => g.nama_guru.toLowerCase().includes(guruNamaInput.toLowerCase()));
        if (found) gid = found.id;
      }

      let enableBlocking = true;
      const blockingVal = row.enable_blocking ?? row.enableBlocking ?? row.blocking ?? row.proteksi ?? row.Proteksi ?? row.Blocking;
      if (blockingVal !== undefined) {
        if (typeof blockingVal === 'boolean') {
          enableBlocking = blockingVal;
        } else if (typeof blockingVal === 'string') {
          const lower = blockingVal.toLowerCase().trim();
          if (lower === 'false' || lower === '0' || lower === 'no' || lower === 'tidak' || lower === 'off' || lower === 'disabled') {
            enableBlocking = false;
          }
        } else if (typeof blockingVal === 'number') {
          enableBlocking = blockingVal !== 0;
        }
      }

      if (kid && mid && gid && link) {
        await this.addLinkSoal(kid, mid, gid, tanggalUjian, waktuUjian, link, enableBlocking);
      }
      onProgress?.(i + 1, total);
    }
    return true;
  }

  // Helper method for PIN unblocking
  static async getAllGuruPins(): Promise<string[]> {
    const list = await this.getGuru();
    return list.map(g => g.pin_pengawas);
  }

  static async loginGuru(username: string, pin: string): Promise<Guru | null> {
    const gurus = await this.getGuru();
    const found = gurus.find(g => g.username === username.toLowerCase() && g.pin_pengawas === pin);
    if (found && found.is_active === false) {
      throw new Error('Akun Anda dinonaktifkan. Silakan hubungi administrator.');
    }
    return found || null;
  }

  static async loginSiswa(nisn: string): Promise<Siswa | null> {
    checkConfig();
    const { data, error } = await supabase!
      .from('siswa')
      .select('*, kelas(nama_kelas)')
      .eq('nisn', nisn.trim())
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    if (data.is_active === false) {
      throw new Error('Akun Anda dinonaktifkan. Silakan hubungi admin/pengawas.');
    }

    return {
      id: data.id,
      nisn: data.nisn,
      nama_siswa: data.nama_siswa,
      kelas_id: data.kelas_id,
      kelas_nama: data.kelas?.nama_kelas || 'Tanpa Kelas',
      is_active: data.is_active !== false
    };
  }

  // ==========================================
  // SYSTEM SETTINGS
  // ==========================================
  static async getSetting(key: string): Promise<string> {
    checkConfig();
    const { data, error } = await supabase!
      .from('settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error) throw error;
    return data?.value || 'simple';
  }

  static async updateSetting(key: string, value: string): Promise<boolean> {
    checkConfig();
    const { error } = await supabase!
      .from('settings')
      .upsert({ key, value, updated_at: new Date().toISOString() });

    if (error) throw error;
    return true;
  }

  // ==========================================
  // TENANTS / BRANDING CRUD
  // ==========================================
  static async getTenantProfile(): Promise<Tenant | null> {
    checkConfig();
    const { data, error } = await supabase!
      .from('tenants')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async updateTenantProfile(id: string, name: string, examEventTitle: string, logoUrl: string | null): Promise<boolean> {
    checkConfig();
    const { error } = await supabase!
      .from('tenants')
      .update({ name, exam_event_title: examEventTitle, logo_url: logoUrl })
      .eq('id', id);

    if (error) throw error;
    return true;
  }
}
