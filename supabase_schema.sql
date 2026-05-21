-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    google_form_link TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    kelas_id UUID REFERENCES kelas(id) ON DELETE CASCADE,
    guru_id UUID REFERENCES guru(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS (Row Level Security) - For simplicity in a public exam environment, 
-- we will disable RLS or create policies allowing public read on JURUSAN, KELAS, and MAPEL.
ALTER TABLE jurusan ENABLE ROW LEVEL SECURITY;
ALTER TABLE kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE mapel ENABLE ROW LEVEL SECURITY;

-- Allow public read access to JURUSAN, KELAS, MAPEL, and SISWA
CREATE POLICY "Allow public read access to jurusan" ON jurusan FOR SELECT USING (true);
CREATE POLICY "Allow public read access to kelas" ON kelas FOR SELECT USING (true);
CREATE POLICY "Allow public read access to siswa" ON siswa FOR SELECT USING (true);
CREATE POLICY "Allow public read access to mapel" ON mapel FOR SELECT USING (true);

-- Allow all actions for authenticated users (Guru)
CREATE POLICY "Allow full access to authenticated users on jurusan" ON jurusan FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users on kelas" ON kelas FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users on siswa" ON siswa FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users on guru" ON guru FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users on mapel" ON mapel FOR ALL TO authenticated USING (true);

-- Insert Mock Data
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
('1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 'Budi Santoso', 'budi', 'pbkdf2_sha256$260000$mockhash$budi', '1234')
ON CONFLICT DO NOTHING;

-- 4. Insert Mapel (Exams)
INSERT INTO mapel (id, nama_mapel, google_form_link, is_active, kelas_id, guru_id) VALUES
('5a6b7c8d-9e0f-1a2b-3c4d-5e6f7a8b9c0d', 'Ujian Harian Matematika', 'https://docs.google.com/forms/d/e/1FAIpQLSf4uG5h28s-j5tJtN55j-P9BvX_Qc7pPZ3U_R8Tq7bW-wKjCw/viewform', true, 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d'),
('6b7c8d9e-0f1a-2b3c-4d5e-6f7a8b9c0d1e', 'Ujian Produktif Web', 'https://docs.google.com/forms/d/e/1FAIpQLScXw1O7U8N9M9v7G3H2t8hU_T6YwD6vF7fV-S8p8r9s0t_uQw/viewform', true, 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d')
ON CONFLICT DO NOTHING;
