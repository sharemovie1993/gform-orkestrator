-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create roles if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
    END IF;
END
$$;

-- Table JURUSAN
CREATE TABLE IF NOT EXISTS jurusan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_jurusan VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table KELAS
CREATE TABLE IF NOT EXISTS kelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tingkat VARCHAR(10) NOT NULL, -- e.g. X, XI, XII
    nama_kelas VARCHAR(100) NOT NULL, -- e.g. XI RPL 1
    jurusan_id UUID REFERENCES jurusan(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table SISWA
CREATE TABLE IF NOT EXISTS siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nisn VARCHAR(50) UNIQUE,
    nama_siswa VARCHAR(255) NOT NULL,
    kelas_id UUID REFERENCES kelas(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table GURU
CREATE TABLE IF NOT EXISTS guru (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_guru VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    pin_pengawas VARCHAR(6) DEFAULT '1234' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table MAPEL
CREATE TABLE IF NOT EXISTS mapel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_mapel VARCHAR(255) NOT NULL,
    singkatan VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table LINK_SOAL
CREATE TABLE IF NOT EXISTS link_soal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kelas_id UUID REFERENCES kelas(id) ON DELETE CASCADE,
    mapel_id UUID REFERENCES mapel(id) ON DELETE CASCADE,
    guru_id UUID REFERENCES guru(id) ON DELETE SET NULL,
    tanggal_ujian DATE NOT NULL DEFAULT CURRENT_DATE,
    waktu_ujian TIME NOT NULL DEFAULT '08:00:00',
    google_form_link TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    enable_blocking BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Disable RLS (Row Level Security) agar anon key bisa melakukan CRUD tanpa Supabase Auth session
ALTER TABLE jurusan DISABLE ROW LEVEL SECURITY;
ALTER TABLE kelas DISABLE ROW LEVEL SECURITY;
ALTER TABLE siswa DISABLE ROW LEVEL SECURITY;
ALTER TABLE guru DISABLE ROW LEVEL SECURITY;
ALTER TABLE mapel DISABLE ROW LEVEL SECURITY;
ALTER TABLE link_soal DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Insert Seed Data (hanya dijalankan sekali, ON CONFLICT DO NOTHING)
-- Semua ID menggunakan format UUID yang valid (8-4-4-4-12)
-- ============================================================

-- 1. Insert Jurusan
INSERT INTO jurusan (id, nama_jurusan) VALUES
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Rekayasa Perangkat Lunak'),
('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'Teknik Komputer dan Jaringan'),
('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'Multimedia')
ON CONFLICT DO NOTHING;

-- 2. Insert Kelas
INSERT INTO kelas (id, tingkat, nama_kelas, jurusan_id) VALUES
('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'XII', 'XII RPL 1', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'),
('e5f6a7b8-c90d-1e2f-3a4b-5c6d7e8f9a0b', 'XII', 'XII RPL 2', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'),
('f6a7b8c9-0d1e-2f3a-4b5c-6d7e8f9a0b1c', 'XI', 'XI TKJ 1', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e')
ON CONFLICT DO NOTHING;

-- 3. Insert Guru
INSERT INTO guru (id, nama_guru, username, password_hash, pin_pengawas) VALUES
('1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 'Budi Santoso', 'budi', 'pbkdf2_sha256$260000$mockhash$budi', '1234'),
('2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', 'Ani Wijaya', 'ani', 'pbkdf2_sha256$260000$mockhash$ani', '5678'),
('3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f', 'Asep Suryadi', 'asep', 'pbkdf2_sha256$260000$mockhash$asep', '1111')
ON CONFLICT DO NOTHING;

-- 4. Insert Siswa
INSERT INTO siswa (id, nisn, nama_siswa, kelas_id) VALUES
('1112b3c4-5e6f-7a8b-9c0d-1e2f3a4b5c6d', '0054321001', 'Adi Wijaya', 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a'),
('2223c4d5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', '0054321002', 'Budi Hartono', 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a'),
('3334d5e6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', '0054321003', 'Citra Kirana', 'e5f6a7b8-c90d-1e2f-3a4b-5c6d7e8f9a0b'),
('4445e6f7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', '0054321004', 'Dian Sasmita', 'f6a7b8c9-0d1e-2f3a-4b5c-6d7e8f9a0b1c'),
('5556f7a8-c90d-1e2f-3a4b-5c6d7e8f9a0b', '0054321005', 'Eka Saputra', 'f6a7b8c9-0d1e-2f3a-4b5c-6d7e8f9a0b1c'),
('6667a8b9-0d1e-2f3a-4b5c-6d7e8f9a0b1c', '0054321006', 'Farhan Maulana', 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a')
ON CONFLICT DO NOTHING;

-- 5. Insert Mapel (Master Data)
-- UUID format valid: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
INSERT INTO mapel (id, nama_mapel, singkatan) VALUES
('aa000001-0000-0000-0000-000000000001', 'Matematika', 'MTK'),
('aa000002-0000-0000-0000-000000000002', 'Pemrograman Web', 'WEB'),
('aa000003-0000-0000-0000-000000000003', 'Fisika', 'FIS'),
('aa000004-0000-0000-0000-000000000004', 'Produktif TKJ', 'TKJ'),
('aa000005-0000-0000-0000-000000000005', 'UTBK', 'UTBK')
ON CONFLICT DO NOTHING;

-- 6. Insert Link Soal (Data Transaksi/Jadwal Ujian)
INSERT INTO link_soal (id, kelas_id, mapel_id, guru_id, tanggal_ujian, waktu_ujian, google_form_link, is_active, enable_blocking) VALUES
('bb000001-0000-0000-0000-000000000001', 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'aa000001-0000-0000-0000-000000000001', '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', '2026-05-22', '08:00:00', 'https://docs.google.com/forms/d/e/1FAIpQLSf4uG5h28s-j5tJtN55j-P9BvX_Qc7pPZ3U_R8Tq7bW-wKjCw/viewform', true, true),
('bb000002-0000-0000-0000-000000000002', 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'aa000002-0000-0000-0000-000000000002', '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', '2026-05-22', '10:00:00', 'https://docs.google.com/forms/d/e/1FAIpQLScXw1O7U8N9M9v7G3H2t8hU_T6YwD6vF7fV-S8p8r9s0t_uQw/viewform', true, true),
('bb000003-0000-0000-0000-000000000003', 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'aa000003-0000-0000-0000-000000000003', '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', '2026-05-23', '08:00:00', 'https://docs.google.com/forms/d/e/1FAIpQLSdO7q4a-W_d8zP7gXv_W-hW_Qc7pPZ3U_R8Tq7bW-wKjCw/viewform', true, true),
('bb000004-0000-0000-0000-000000000004', 'f6a7b8c9-0d1e-2f3a-4b5c-6d7e8f9a0b1c', 'aa000004-0000-0000-0000-000000000004', '3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f', '2026-05-22', '08:00:00', 'https://docs.google.com/forms/d/e/1FAIpQLSf9tJtN55j-P9BvX_Qc7pPZ3U_R8Tq7bW-wKjCw/viewform', true, true),
('bb000005-0000-0000-0000-000000000005', 'e5f6a7b8-c90d-1e2f-3a4b-5c6d7e8f9a0b', 'aa000005-0000-0000-0000-000000000005', '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', '2026-05-22', '08:00:00', 'https://docs.google.com/forms/d/e/1FAIpQLSf2uG5h28s-j5tJtN55j-P9BvX_Qc7pPZ3U_R8Tq7bW-wKjCw/viewform', true, true)
ON CONFLICT DO NOTHING;
