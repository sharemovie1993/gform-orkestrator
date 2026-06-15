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
  tenant_id?: string;
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

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://supabaselocal.absenta.id';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

// Master Supabase client is always bound to the local database gateway now
export const masterSupabase = createClient(
  'https://supabaselocal.absenta.id',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'
);

export let isSupabaseConfigured = supabaseUrl !== '' && supabaseAnonKey !== '';
export let supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Helper function to re-initialize Supabase client dynamically for a tenant
export function initializeDynamicSupabase(url: string, key: string) {
  console.log('[Supabase] Re-initializing dynamic Supabase client for tenant with URL:', url);
  supabase = createClient(url, key);
  isSupabaseConfigured = true;
}

export let activeTenantId: string | null = null;

export function setActiveTenantId(id: string | null) {
  console.log('[Supabase] Setting active tenant ID:', id);
  activeTenantId = id;
}

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
    const targetTenantId = activeTenantId || '00000000-0000-0000-0000-000000000001';
    query = query.eq('tenant_id', targetTenantId);
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
    const payload: any = { nama_jurusan: nama, is_active: true };
    if (activeTenantId) {
      payload.tenant_id = activeTenantId;
    }
    const { data, error } = await supabase!.from('jurusan').insert([payload]).select().single();
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
    let query = supabase!
      .from('kelas')
      .select('id, tingkat, nama_kelas, jurusan_id, is_active, jurusan(nama_jurusan)');
    const targetTenantId = activeTenantId || '00000000-0000-0000-0000-000000000001';
    query = query.eq('tenant_id', targetTenantId);
    if (jurusanId) query = query.eq('jurusan_id', jurusanId);
    if (activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((k: any) => ({
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
    const payload: any = { tingkat, nama_kelas: nama, jurusan_id: jurusanId, is_active: true };
    if (activeTenantId) {
      payload.tenant_id = activeTenantId;
    }
    const { data, error } = await supabase!.from('kelas').insert([payload]).select().single();
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
    const targetTenantId = activeTenantId || '00000000-0000-0000-0000-000000000001';
    query = query.eq('tenant_id', targetTenantId);
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

  static async getSiswaCount(): Promise<number> {
    checkConfig();
    const targetTenantId = activeTenantId || '00000000-0000-0000-0000-000000000001';
    const { count, error } = await supabase!
      .from('siswa')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', targetTenantId);
    if (error) throw error;
    return count || 0;
  }

  static async getSiswaByKelas(kelasId: string, activeOnly: boolean = true): Promise<Siswa[]> {
    checkConfig();
    let query = supabase!
      .from('siswa')
      .select('*, kelas(nama_kelas)')
      .eq('kelas_id', kelasId);
    const targetTenantId = activeTenantId || '00000000-0000-0000-0000-000000000001';
    query = query.eq('tenant_id', targetTenantId);
    if (activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query.order('nama_siswa');
    if (error) throw error;
    return (data || []).map(s => ({
      id: s.id,
      nisn: s.nisn,
      nama_siswa: s.nama_siswa,
      kelas_id: s.kelas_id,
      kelas_nama: s.kelas?.nama_kelas || 'Tanpa Kelas',
      tenant_id: s.tenant_id,
      is_active: s.is_active !== false
    }));
  }

  static async addSiswa(nisn: string, nama: string, kelasId: string): Promise<Siswa> {
    checkConfig();
    const payload: any = { nisn: nisn.trim(), nama_siswa: nama, kelas_id: kelasId, is_active: true };
    if (activeTenantId) {
      payload.tenant_id = activeTenantId;
    }
    const { data, error } = await supabase!.from('siswa').insert([payload]).select().single();
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
  static async getGuru(activeOnly: boolean = true): Promise<Guru[]> {
    checkConfig();
    let query = supabase!.from('guru').select('*');
    // Selalu filter tenant: gunakan activeTenantId atau default tenant ID jika null untuk mencegah kueri global lintas tenant
    const targetTenantId = activeTenantId || '00000000-0000-0000-0000-000000000001';
    query = query.eq('tenant_id', targetTenantId);
    
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
    const payload: any = { nama_guru: nama, username, pin_pengawas: pin, password_hash: 'pbkdf2_sha256$260000$mockhash$' + username, is_active: true };
    if (activeTenantId) {
      payload.tenant_id = activeTenantId;
    }
    const { data, error } = await supabase!.from('guru').insert([payload]).select().single();
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
    const targetTenantId = activeTenantId || '00000000-0000-0000-0000-000000000001';
    query = query.eq('tenant_id', targetTenantId);
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
    const payload: any = { nama_mapel: namaMapel, singkatan: singkatan, is_active: true };
    if (activeTenantId) {
      payload.tenant_id = activeTenantId;
    }
    const { error } = await supabase!.from('mapel').insert([payload]);
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
  static async getLinkSoal(kelasId?: string, activeOnly: boolean = false): Promise<LinkSoal[]> {
    checkConfig();
    let query = supabase!
      .from('link_soal')
      .select('id, kelas_id, mapel_id, guru_id, tanggal_ujian, waktu_ujian, google_form_link, is_active, enable_blocking, created_at, kelas(nama_kelas), mapel(nama_mapel), guru(nama_guru)');
    const targetTenantId = activeTenantId || '00000000-0000-0000-0000-000000000001';
    query = query.eq('tenant_id', targetTenantId);
    if (kelasId) query = query.eq('kelas_id', kelasId);
    if (activeOnly) {
      query = query.eq('is_active', true);
      // Filter tanggal ujian: hari ini ke belakang
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const localTodayStr = `${year}-${month}-${day}`;
      query = query.lte('tanggal_ujian', localTodayStr);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((l: any) => ({
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
    const payload: any = {
      kelas_id: kelasId,
      mapel_id: mapelId,
      guru_id: guruId,
      tanggal_ujian: tanggalUjian,
      waktu_ujian: waktuUjian,
      google_form_link: link,
      is_active: true,
      enable_blocking: enableBlocking
    };
    if (activeTenantId) {
      payload.tenant_id = activeTenantId;
    }
    const { error } = await supabase!.from('link_soal').insert([payload]);
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

  static async deleteBulk(table: string, ids: string[]): Promise<boolean> {
    checkConfig();
    const { error } = await supabase!.from(table).delete().in('id', ids);
    if (error) throw error;
    return true;
  }


  // ==========================================
  // BULK EXCEL IMPORTS
  // ==========================================

  /** Normalisasi string untuk pencocokan fuzzy: lowercase, hapus spasi & tanda baca */
  private static normalizeName(s: string): string {
    return s.toLowerCase().replace(/[\s\-_.,()]+/g, '');
  }

  /** Fuzzy match: exact → includes → normalizeName exact → normalizeName includes */
  private static fuzzyFind<T extends { [key: string]: any }>(list: T[], field: string, input: string): T | undefined {
    const inp = input.trim();
    const inpNorm = this.normalizeName(inp);
    // 1. Exact
    let found = list.find(item => item[field].trim() === inp);
    // 2. Case-insensitive exact
    if (!found) found = list.find(item => item[field].toLowerCase() === inp.toLowerCase());
    // 3. Normalized exact
    if (!found) found = list.find(item => this.normalizeName(item[field]) === inpNorm);
    // 4. Normalized includes (input inside db value)
    if (!found) found = list.find(item => this.normalizeName(item[field]).includes(inpNorm));
    // 5. Normalized includes (db value inside input)
    if (!found) found = list.find(item => inpNorm.includes(this.normalizeName(item[field])));
    return found;
  }

  static async importJurusans(
    data: any[],
    onProgress?: (current: number, total: number) => void
  ): Promise<{ imported: number; skipped: number; failed: number }> {
    checkConfig();
    // Tangkap tenant_id sekali di awal — tidak bergantung pada global mid-loop
    const tenantId = activeTenantId;
    if (!tenantId) throw new Error('Sesi tenant tidak aktif. Silakan refresh halaman dan coba lagi.');

    const total = data.length;
    let skipped = 0, failed = 0;

    // Bangun payload secara eksplisit dengan tenant_id
    const payloads: any[] = [];
    for (let i = 0; i < total; i++) {
      const row = data[i];
      const nama = (row.nama_jurusan || row.Nama || row.NAMA || row.jurusan || '')?.toString().trim();
      if (!nama) { skipped++; continue; }
      payloads.push({ nama_jurusan: nama, tenant_id: tenantId, is_active: true });
    }

    if (payloads.length === 0) return { imported: 0, skipped, failed };

    // Bulk insert per batch 100
    const chunkSize = 100;
    let imported = 0;
    for (let i = 0; i < payloads.length; i += chunkSize) {
      const chunk = payloads.slice(i, i + chunkSize);
      const { error } = await supabase!.from('jurusan').insert(chunk);
      if (error) { console.error('[importJurusans] chunk error:', error); failed += chunk.length; }
      else { imported += chunk.length; }
      onProgress?.(Math.min(i + chunkSize, payloads.length), payloads.length);
    }
    return { imported, skipped, failed };
  }

  static async importKelas(
    data: any[],
    onProgress?: (current: number, total: number) => void
  ): Promise<{ imported: number; skipped: number; failed: number }> {
    checkConfig();
    const tenantId = activeTenantId;
    if (!tenantId) throw new Error('Sesi tenant tidak aktif. Silakan refresh halaman dan coba lagi.');

    // Ambil jurusan MILIK tenant ini saja
    const jurusans = await this.getJurusan();
    const total = data.length;
    let skipped = 0, failed = 0;

    const payloads: any[] = [];
    for (let i = 0; i < total; i++) {
      const row = data[i];
      const tingkat = String(row.tingkat || row.Tingkat || row.TINGKAT || 'XII').trim();
      const nama = (row.nama_kelas || row.Nama || row.NAMA || '')?.toString().trim();
      const jurusanNamaInput = (row.nama_jurusan || row.Jurusan || row.JURUSAN || '')?.toString().trim();
      if (!nama) { skipped++; continue; }

      let jid: string | undefined;
      if (jurusanNamaInput) {
        const found = this.fuzzyFind(jurusans, 'nama_jurusan', jurusanNamaInput);
        if (found) jid = found.id;
      }
      if (!jid) {
        console.warn(`[importKelas] Jurusan tidak ditemukan untuk kelas "${nama}", input: "${jurusanNamaInput}"`);
        skipped++;
        continue;
      }

      // Payload dengan tenant_id eksplisit — tidak pakai global
      payloads.push({ tingkat, nama_kelas: nama, jurusan_id: jid, tenant_id: tenantId, is_active: true });
    }

    if (payloads.length === 0) return { imported: 0, skipped, failed };

    const chunkSize = 100;
    let imported = 0;
    for (let i = 0; i < payloads.length; i += chunkSize) {
      const chunk = payloads.slice(i, i + chunkSize);
      const { error } = await supabase!.from('kelas').insert(chunk);
      if (error) { console.error('[importKelas] chunk error:', error); failed += chunk.length; }
      else { imported += chunk.length; }
      onProgress?.(Math.min(i + chunkSize, payloads.length), payloads.length);
    }
    return { imported, skipped, failed };
  }

  static async importSiswa(
    data: any[],
    onProgress?: (current: number, total: number) => void
  ): Promise<{ imported: number; skipped: number; failed: number }> {
    checkConfig();
    if (!activeTenantId) throw new Error('Sesi tenant tidak aktif. Silakan refresh halaman dan coba lagi.');
    const classes = await this.getKelas();
    const total = data.length;
    let skipped = 0, failed = 0;

    // Siapkan payloads untuk bulk insert dengan fuzzy matching
    const payloads: any[] = [];
    for (let i = 0; i < total; i++) {
      const row = data[i];
      const nisn = String(row.nisn || row.NISN || row.NIS || row.nis || '').trim() ||
                   String(Math.floor(Math.random() * 100000000));
      const nama = (row.nama_siswa || row.Nama || row.NAMA || row.nama || row.NamaSiswa || '')?.toString().trim();
      const kelasNamaInput = (row.nama_kelas || row.Kelas || row.KELAS || row.kelas || '')?.toString().trim();

      if (!nama) { skipped++; continue; }

      let kid: string | undefined;
      if (kelasNamaInput) {
        const found = this.fuzzyFind(classes, 'nama_kelas', kelasNamaInput);
        if (found) kid = found.id;
      }

      if (!kid) {
        console.warn(`[importSiswa] Kelas tidak ditemukan untuk siswa "${nama}", input kelas: "${kelasNamaInput}"`);
        skipped++;
        continue;
      }

      payloads.push({
        nisn,
        nama_siswa: nama,
        kelas_id: kid,
        tenant_id: activeTenantId,
        is_active: true,
      });
    }

    if (payloads.length === 0) return { imported: 0, skipped, failed };

    // Bulk insert per batch 200 data
    const chunkSize = 200;
    let imported = 0;
    for (let i = 0; i < payloads.length; i += chunkSize) {
      const chunk = payloads.slice(i, i + chunkSize);
      const { error } = await supabase!.from('siswa').insert(chunk);
      if (error) {
        console.error('[importSiswa] Error inserting chunk:', error);
        failed += chunk.length;
      } else {
        imported += chunk.length;
      }
      onProgress?.(Math.min(i + chunkSize, payloads.length), payloads.length);
    }

    return { imported, skipped, failed };
  }


  static async importGuru(
    data: any[],
    onProgress?: (current: number, total: number) => void
  ): Promise<{ imported: number; skipped: number; failed: number }> {
    checkConfig();
    const tenantId = activeTenantId;
    if (!tenantId) throw new Error('Sesi tenant tidak aktif. Silakan refresh halaman dan coba lagi.');

    const total = data.length;
    let skipped = 0, failed = 0;

    const payloads: any[] = [];
    for (let i = 0; i < total; i++) {
      const row = data[i];
      const nama = (row.nama_guru || row.Nama || row.NAMA || row.guru || '')?.toString().trim();
      if (!nama) { skipped++; continue; }
      const username = (row.username || row.Username || nama.split(' ')[0] || `guru_${i}`)
        .toString().toLowerCase().replace(/\s+/g, '');
      const pin = String(row.pin_pengawas || row.pin || row.PIN || '1234').trim();
      // Payload dengan tenant_id eksplisit
      payloads.push({
        nama_guru: nama,
        username,
        pin_pengawas: pin,
        password_hash: 'pbkdf2_sha256$260000$mockhash$' + username,
        tenant_id: tenantId,
        is_active: true,
      });
    }

    if (payloads.length === 0) return { imported: 0, skipped, failed };

    const chunkSize = 100;
    let imported = 0;
    for (let i = 0; i < payloads.length; i += chunkSize) {
      const chunk = payloads.slice(i, i + chunkSize);
      const { error } = await supabase!.from('guru').insert(chunk);
      if (error) { console.error('[importGuru] chunk error:', error); failed += chunk.length; }
      else { imported += chunk.length; }
      onProgress?.(Math.min(i + chunkSize, payloads.length), payloads.length);
    }
    return { imported, skipped, failed };
  }

  static async importMapel(
    data: any[],
    onProgress?: (current: number, total: number) => void
  ): Promise<{ imported: number; skipped: number; failed: number }> {
    checkConfig();
    const tenantId = activeTenantId;
    if (!tenantId) throw new Error('Sesi tenant tidak aktif. Silakan refresh halaman dan coba lagi.');

    const total = data.length;
    let skipped = 0, failed = 0;

    const payloads: any[] = [];
    for (let i = 0; i < total; i++) {
      const row = data[i];
      const nama = (row.nama_mapel || row.Nama || row.NAMA || row.mapel || row.subject || '')?.toString().trim();
      const singkatan = (row.singkatan || row.Singkatan || row.SINGKATAN || row.code || row.Kode || '')?.toString().trim();
      if (!nama || !singkatan) { skipped++; continue; }
      // Payload dengan tenant_id eksplisit
      payloads.push({ nama_mapel: nama, singkatan, tenant_id: tenantId, is_active: true });
    }

    if (payloads.length === 0) return { imported: 0, skipped, failed };

    const chunkSize = 100;
    let imported = 0;
    for (let i = 0; i < payloads.length; i += chunkSize) {
      const chunk = payloads.slice(i, i + chunkSize);
      const { error } = await supabase!.from('mapel').insert(chunk);
      if (error) { console.error('[importMapel] chunk error:', error); failed += chunk.length; }
      else { imported += chunk.length; }
      onProgress?.(Math.min(i + chunkSize, payloads.length), payloads.length);
    }
    return { imported, skipped, failed };
  }

  static async importLinkSoal(
    data: any[],
    onProgress?: (current: number, total: number) => void
  ): Promise<{ imported: number; skipped: number; failed: number }> {
    if (!activeTenantId) throw new Error('Sesi tenant tidak aktif. Silakan refresh halaman dan coba lagi.');
    const classes = await this.getKelas();
    const mapels = await this.getMapel();
    const gurus = await this.getGuru();
    const total = data.length;
    let imported = 0, skipped = 0, failed = 0;

    for (let i = 0; i < total; i++) {
      const row = data[i];
      const kelasNamaInput = (row.nama_kelas || row.Kelas || row.KELAS || row.kelas || '')?.toString().trim();
      const mapelNamaInput = (row.nama_mapel || row.Mapel || row.MAPEL || row.mapel || row.nama_mata_pelajaran || row.singkatan || row.Singkatan || '')?.toString().trim();
      const guruNamaInput = (row.nama_guru || row.Guru || row.GURU || row.guru || '')?.toString().trim();
      const tanggalUjian = (row.tanggal_ujian || row.Tanggal || row.TANGGAL || row.tanggal || '2026-05-22').toString().trim();
      const waktuUjian = (row.waktu_ujian || row.Waktu || row.WAKTU || row.waktu || '08:00:00').toString().trim();
      const link = (row.google_form_link || row.link || row.URL || row.url || row.Link || '')?.toString().trim();

      // Fuzzy match kelas
      let kid: string | undefined;
      if (kelasNamaInput) {
        const found = this.fuzzyFind(classes, 'nama_kelas', kelasNamaInput);
        if (found) kid = found.id;
      }

      // Fuzzy match mapel (nama atau singkatan)
      let mid: string | undefined;
      if (mapelNamaInput) {
        const normInput = this.normalizeName(mapelNamaInput);
        const found = mapels.find(m =>
          this.normalizeName(m.nama_mapel).includes(normInput) ||
          normInput.includes(this.normalizeName(m.nama_mapel)) ||
          this.normalizeName(m.singkatan) === normInput
        );
        if (found) mid = found.id;
      }

      // Fuzzy match guru
      let gid: string | undefined;
      if (guruNamaInput) {
        const found = this.fuzzyFind(gurus, 'nama_guru', guruNamaInput);
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
        try {
          await this.addLinkSoal(kid, mid, gid, tanggalUjian, waktuUjian, link, enableBlocking);
          imported++;
        } catch (e) {
          console.warn('[importLinkSoal] Failed row:', row, e);
          failed++;
        }
      } else {
        console.warn(`[importLinkSoal] Skip row ${i + 1}: kelas=${kid ? '✓' : '✗'} mapel=${mid ? '✓' : '✗'} guru=${gid ? '✓' : '✗'} link=${link ? '✓' : '✗'}`);
        skipped++;
      }
      onProgress?.(i + 1, total);
    }
    return { imported, skipped, failed };
  }

  // Helper method for PIN unblocking
  static async getAllGuruPins(): Promise<string[]> {
    const list = await this.getGuru();
    return list.map(g => g.pin_pengawas);
  }

  static async loginGuru(username: string, pin: string): Promise<Guru | null> {
    let gurus = await this.getGuru();
    if (gurus.length === 0) {
      console.log('[Supabase] No guru records found for tenant:', activeTenantId, '. Auto-seeding default admin...');
      const profile = await this.getTenantProfile();
      const schoolName = profile?.name || 'Sekolah';
      const defaultAdmin = await this.addGuru('Admin ' + schoolName, 'admin', '123456');
      gurus = [defaultAdmin];
    }

    const found = gurus.find(g => g.username === username.toLowerCase() && g.pin_pengawas === pin);
    if (found) {
      if (found.is_active === false) {
        throw new Error('Akun Anda dinonaktifkan. Silakan hubungi administrator.');
      }
      return found;
    }

    // If they typed wrong credentials but they are a brand new tenant
    if (gurus.length === 1 && gurus[0].username === 'admin') {
      throw new Error('Username atau PIN salah. Silakan login menggunakan username: admin dan PIN: 123456.');
    }

    return null;
  }

  static async loginSiswa(nisn: string, platform: string = 'web'): Promise<Siswa | null> {
    checkConfig();
    let query = supabase!
      .from('siswa')
      .select('*, kelas(nama_kelas)')
      .eq('nisn', nisn.trim());
    if (activeTenantId) {
      query = query.eq('tenant_id', activeTenantId);
    }
    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    if (!data) return null;

    if (data.is_active === false) {
      throw new Error('Akun Anda dinonaktifkan. Silakan hubungi admin/pengawas.');
    }

    // Catat riwayat login secara asynchronous (tidak memperlambat loading masuk portal)
    supabase!
      .from('login_logs')
      .insert([
        {
          tenant_id: data.tenant_id,
          siswa_id: data.id,
          nama_siswa: data.nama_siswa,
          kelas_nama: data.kelas?.nama_kelas || 'Tanpa Kelas',
          platform: platform,
          ip_address: platform === 'web' ? 'Web Browser' : 'Android App'
        }
      ])
      .then(({ error: logError }) => {
        if (logError) console.warn('[Log Login Error]', logError);
      });

    return {
      id: data.id,
      nisn: data.nisn,
      nama_siswa: data.nama_siswa,
      kelas_id: data.kelas_id,
      kelas_nama: data.kelas?.nama_kelas || 'Tanpa Kelas',
      tenant_id: data.tenant_id,
      is_active: data.is_active !== false
    };
  }

  // ==========================================
  // SYSTEM SETTINGS
  // ==========================================
  static async getSetting(key: string): Promise<string> {
    checkConfig();
    let query = supabase!
      .from('settings')
      .select('value')
      .eq('key', key);
    if (activeTenantId) {
      query = query.eq('tenant_id', activeTenantId);
    }
    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    if (data?.value) return data.value;
    if (key === 'cache_version') return '1';
    if (key === 'max_violations') return '5';
    if (key === 'cheat_blocking_enabled') return 'true';
    return 'simple';
  }

  static async updateSetting(key: string, value: string): Promise<boolean> {
    checkConfig();
    const payload: any = { key, value, updated_at: new Date().toISOString() };
    if (activeTenantId) {
      payload.tenant_id = activeTenantId;
    }
    const { error } = await supabase!
      .from('settings')
      .upsert(payload);

    if (error) throw error;
    return true;
  }

  static async incrementCacheVersion(): Promise<void> {
    checkConfig();
    try {
      const current = await this.getSetting('cache_version');
      const nextVer = String(parseInt(current || '1', 10) + 1);
      await this.updateSetting('cache_version', nextVer);
      console.log('[CACHE MANAGER] Cache version global incremented to:', nextVer);
    } catch (e) {
      console.warn('Failed to increment cache version:', e);
    }
  }

  // ==========================================
  // TENANTS / BRANDING CRUD
  // ==========================================
  static async getTenantProfile(): Promise<Tenant | null> {
    checkConfig();
    let query = supabase!.from('tenants').select('*');
    if (activeTenantId) {
      query = query.eq('id', activeTenantId);
    } else {
      query = query.eq('domain_or_slug', 'default');
    }
    const { data, error } = await query.limit(1).maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getTenantProfileBySlug(slug: string): Promise<any | null> {
    // Queries the central/master database for the school subdomain configuration
    const { data, error } = await masterSupabase
      .from('tenants')
      .select('*')
      .eq('domain_or_slug', slug)
      .maybeSingle();

    if (error) {
      console.error('[Supabase] Error fetching tenant profile by slug:', error);
      throw error;
    }
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

  // ==========================================
  // LOG LOGIN / AKTIVITAS SISWA
  // ==========================================
  static async getLoginLogs(): Promise<any[]> {
    checkConfig();
    let query = supabase!
      .from('login_logs')
      .select('*');
    if (activeTenantId) {
      query = query.eq('tenant_id', activeTenantId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  // ==========================================
  // BLOCKED SISWA / REMOTE CONTROL
  // ==========================================
  static async setSiswaActiveStatus(id: string, isActive: boolean): Promise<void> {
    checkConfig();
    const { error } = await supabase!
      .from('siswa')
      .update({ is_active: isActive })
      .eq('id', id);
    if (error) {
      console.warn('[Supabase] Failed to set siswa active status:', error);
      throw error;
    }
  }

  static async getSiswaActiveStatus(id: string): Promise<boolean> {
    checkConfig();
    const { data, error } = await supabase!
      .from('siswa')
      .select('is_active')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.warn('[Supabase] Failed to get siswa active status:', error);
      return true; // Default to active if lookup fails to prevent permanent lockouts
    }
    return data?.is_active !== false;
  }

  static async getBlockedSiswa(): Promise<any[]> {
    checkConfig();
    let query = supabase!
      .from('siswa')
      .select('*, kelas(nama_kelas)')
      .eq('is_active', false);
    if (activeTenantId) {
      query = query.eq('tenant_id', activeTenantId);
    }
    const { data, error } = await query.order('nama_siswa', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  static async bulkUnblockSiswa(ids: string[]): Promise<boolean> {
    checkConfig();
    if (!ids || ids.length === 0) return true;
    const { error } = await supabase!
      .from('siswa')
      .update({ is_active: true })
      .in('id', ids);
    if (error) throw error;
    return true;
  }

  // ==========================================
  // REAL-TIME ACTIVE SESSIONS MONITOR
  // ==========================================
  static async updateLatestLoginLogStatus(siswaId: string, status: string): Promise<void> {
    checkConfig();
    try {
      // Find the latest login log for this student
      const { data: latestLog, error: fetchError } = await supabase!
        .from('login_logs')
        .select('id')
        .eq('siswa_id', siswaId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!latestLog) return;

      // Update the status of this log
      const { error: updateError } = await supabase!
        .from('login_logs')
        .update({ status: status })
        .eq('id', latestLog.id);

      if (updateError) throw updateError;
      console.log(`[Supabase] Updated student session ${siswaId} status to: ${status}`);
    } catch (err) {
      console.warn('[Supabase] Failed to update latest login log status:', err);
    }
  }

  static async getActiveSessions(): Promise<any[]> {
    checkConfig();
    let query = supabase!
      .from('login_logs')
      .select('*');
    if (activeTenantId) {
      query = query.eq('tenant_id', activeTenantId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    
    // Group by student to show their latest session status
    const uniqueSessions: any[] = [];
    const seenSiswaIds = new Set<string>();
    
    if (data) {
      for (const log of data) {
        if (!seenSiswaIds.has(log.siswa_id)) {
          seenSiswaIds.add(log.siswa_id);
          uniqueSessions.push({
            ...log,
            status: log.status || 'active' // Fallback if column is not added yet
          });
        }
      }
    }
    return uniqueSessions;
  }
}
