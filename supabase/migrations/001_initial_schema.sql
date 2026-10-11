-- EduAbsen Supabase Database Schema
-- Run this migration to create all required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- MADRASAH CONFIG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.madrasah_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama TEXT NOT NULL,
    nsm TEXT NOT NULL,
    npsn TEXT NOT NULL,
    npsm TEXT,
    alamat TEXT NOT NULL,
    telepon TEXT,
    email TEXT,
    kepala_madrasah TEXT,
    nip_kepala TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meter INTEGER NOT NULL DEFAULT 100,
    accuracy_threshold_meter INTEGER NOT NULL DEFAULT 30,
    zona_waktu TEXT NOT NULL DEFAULT 'WIB' CHECK (zona_waktu IN ('WIB', 'WITA', 'WIT')),
    logo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SCHEDULE CONFIG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.schedule_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jam_masuk_guru TIME NOT NULL DEFAULT '07:00',
    batas_terlambat_guru TIME NOT NULL DEFAULT '07:15',
    jam_pulang_guru TIME NOT NULL DEFAULT '15:00',
    jam_masuk_siswa TIME NOT NULL DEFAULT '07:00',
    batas_terlambat_siswa TIME NOT NULL DEFAULT '07:15',
    jam_pulang_siswa TIME NOT NULL DEFAULT '14:30',
    hari_kerja INTEGER[] NOT NULL DEFAULT ARRAY[6, 0, 1, 2, 3, 4],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- HOLIDAYS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tanggal DATE NOT NULL,
    keterangan TEXT NOT NULL,
    jenis TEXT NOT NULL CHECK (jenis IN ('nasional', 'madrasah')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_holidays_tanggal ON public.holidays(tanggal);

-- ============================================
-- TEACHERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nip TEXT NOT NULL UNIQUE,
    nama TEXT NOT NULL,
    email TEXT NOT NULL,
    mapel TEXT NOT NULL,
    no_wa TEXT NOT NULL,
    alamat TEXT NOT NULL,
    foto TEXT,
    is_wali_kelas BOOLEAN NOT NULL DEFAULT FALSE,
    wali_kelas_rombel TEXT,
    jadwal_khusus JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teachers_nip ON public.teachers(nip);
CREATE INDEX idx_teachers_email ON public.teachers(email);

-- ============================================
-- STUDENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nisn TEXT NOT NULL UNIQUE,
    nama TEXT NOT NULL,
    email TEXT NOT NULL,
    rombel TEXT NOT NULL,
    no_wa TEXT NOT NULL,
    alamat TEXT NOT NULL,
    foto TEXT,
    nama_wali TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_students_nisn ON public.students(nisn);
CREATE INDEX idx_students_rombel ON public.students(rombel);
CREATE INDEX idx_students_email ON public.students(email);

-- ============================================
-- CLASSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama TEXT NOT NULL UNIQUE,
    tingkat TEXT NOT NULL CHECK (tingkat IN ('X', 'XI', 'XII')),
    wali_kelas_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    wali_kelas_nama TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_classes_wali_kelas_id ON public.classes(wali_kelas_id);

-- ============================================
-- ATTENDANCE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_type TEXT NOT NULL CHECK (target_type IN ('guru', 'siswa')),
    target_id UUID NOT NULL,
    target_name TEXT NOT NULL,
    target_identifier TEXT NOT NULL,
    rombel TEXT,
    date DATE NOT NULL,
    check_in_time TIME,
    check_in_lat DOUBLE PRECISION,
    check_in_lng DOUBLE PRECISION,
    check_in_distance DOUBLE PRECISION,
    check_in_accuracy DOUBLE PRECISION,
    check_in_scanned_by UUID,
    check_in_scanned_by_name TEXT,
    check_out_time TIME,
    check_out_lat DOUBLE PRECISION,
    check_out_lng DOUBLE PRECISION,
    check_out_distance DOUBLE PRECISION,
    check_out_accuracy DOUBLE PRECISION,
    check_out_scanned_by UUID,
    check_out_scanned_by_name TEXT,
    status TEXT NOT NULL CHECK (status IN ('Hadir', 'Izin', 'Sakit', 'Dinas Luar', 'Alpa')) DEFAULT 'Hadir',
    flags TEXT[] NOT NULL DEFAULT '{}',
    notes TEXT,
    is_corrected BOOLEAN NOT NULL DEFAULT FALSE,
    corrected_by UUID,
    corrected_at TIMESTAMPTZ,
    correction_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attendance_target_date ON public.attendance(target_id, date);
CREATE INDEX idx_attendance_date_type ON public.attendance(date, target_type);
CREATE INDEX idx_attendance_rombel_date ON public.attendance(rombel, date);

-- ============================================
-- LEAVE REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_type TEXT NOT NULL CHECK (target_type IN ('guru', 'siswa')),
    target_id UUID NOT NULL,
    target_name TEXT NOT NULL,
    target_identifier TEXT NOT NULL,
    rombel TEXT,
    type TEXT NOT NULL CHECK (type IN ('Izin', 'Sakit', 'Dinas Luar')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    attachment_name TEXT,
    status TEXT NOT NULL CHECK (status IN ('Menunggu', 'Disetujui', 'Ditolak')) DEFAULT 'Menunggu',
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leave_requests_target_status ON public.leave_requests(target_id, status);
CREATE INDEX idx_leave_requests_date_range ON public.leave_requests(start_date, end_date);

-- ============================================
-- CORRECTION REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.correction_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_id UUID REFERENCES public.attendance(id) ON DELETE SET NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('guru', 'siswa')),
    target_id UUID NOT NULL,
    target_name TEXT NOT NULL,
    target_identifier TEXT NOT NULL,
    rombel TEXT,
    date DATE NOT NULL,
    requested_check_in TIME,
    requested_check_out TIME,
    requested_status TEXT NOT NULL CHECK (requested_status IN ('Hadir', 'Izin', 'Sakit', 'Dinas Luar', 'Alpa')),
    reason TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Menunggu', 'Disetujui', 'Ditolak')) DEFAULT 'Menunggu',
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_correction_requests_target_status ON public.correction_requests(target_id, status);
CREATE INDEX idx_correction_requests_attendance ON public.correction_requests(attendance_id);

-- ============================================
-- ACTIVITY LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL CHECK (actor_role IN ('admin', 'kepala', 'guru', 'siswa')),
    action TEXT NOT NULL,
    detail TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);

-- ============================================
-- USER ACCOUNTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    nama TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'kepala', 'guru', 'siswa')),
    status TEXT NOT NULL CHECK (status IN ('aktif', 'nonaktif')) DEFAULT 'aktif',
    password_hash TEXT,
    identifier TEXT NOT NULL,
    target_id UUID,
    mapel TEXT,
    rombel TEXT,
    is_wali_kelas BOOLEAN NOT NULL DEFAULT FALSE,
    wali_kelas_rombel TEXT,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_accounts_username ON public.user_accounts(username);
CREATE INDEX idx_user_accounts_email ON public.user_accounts(email);
CREATE INDEX idx_user_accounts_identifier ON public.user_accounts(identifier);
CREATE INDEX idx_user_accounts_target_id ON public.user_accounts(target_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.madrasah_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.correction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

-- Policies for madrasah_config (public read, admin write)
CREATE POLICY "Public can read madrasah_config" ON public.madrasah_config FOR SELECT USING (true);
CREATE POLICY "Admin can manage madrasah_config" ON public.madrasah_config FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
);

-- Policies for schedule_config (public read, admin write)
CREATE POLICY "Public can read schedule_config" ON public.schedule_config FOR SELECT USING (true);
CREATE POLICY "Admin can manage schedule_config" ON public.schedule_config FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
);

-- Policies for holidays (public read, admin write)
CREATE POLICY "Public can read holidays" ON public.holidays FOR SELECT USING (true);
CREATE POLICY "Admin can manage holidays" ON public.holidays FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
);

-- Policies for teachers (public read, admin write)
CREATE POLICY "Public can read teachers" ON public.teachers FOR SELECT USING (true);
CREATE POLICY "Admin can manage teachers" ON public.teachers FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
);

-- Policies for students (public read, admin write)
CREATE POLICY "Public can read students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Admin can manage students" ON public.students FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
);

-- Policies for classes (public read, admin write)
CREATE POLICY "Public can read classes" ON public.classes FOR SELECT USING (true);
CREATE POLICY "Admin can manage classes" ON public.classes FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
);

-- Policies for attendance (users can read their own, admin/guru can read all, admin write)
CREATE POLICY "Users can read own attendance" ON public.attendance FOR SELECT USING (
    auth.uid() = target_id OR auth.jwt() ->> 'role' IN ('admin', 'kepala', 'guru')
);
CREATE POLICY "Admin can manage attendance" ON public.attendance FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
);
CREATE POLICY "Guru can insert attendance for students" ON public.attendance FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' IN ('admin', 'guru')
);

-- Policies for leave_requests (users can read own, admin/guru can read all, users can insert own)
CREATE POLICY "Users can read own leave requests" ON public.leave_requests FOR SELECT USING (
    auth.uid() = target_id OR auth.jwt() ->> 'role' IN ('admin', 'kepala', 'guru')
);
CREATE POLICY "Users can insert own leave requests" ON public.leave_requests FOR INSERT WITH CHECK (
    auth.uid() = target_id
);
CREATE POLICY "Admin/kepala can update leave requests" ON public.leave_requests FOR UPDATE USING (
    auth.jwt() ->> 'role' IN ('admin', 'kepala')
);

-- Policies for correction_requests (similar to leave_requests)
CREATE POLICY "Users can read own correction requests" ON public.correction_requests FOR SELECT USING (
    auth.uid() = target_id OR auth.jwt() ->> 'role' IN ('admin', 'kepala', 'guru')
);
CREATE POLICY "Users can insert own correction requests" ON public.correction_requests FOR INSERT WITH CHECK (
    auth.uid() = target_id
);
CREATE POLICY "Admin/kepala/guru can update correction requests" ON public.correction_requests FOR UPDATE USING (
    auth.jwt() ->> 'role' IN ('admin', 'kepala', 'guru')
);

-- Policies for activity_logs (admin/kepala can read all, admin write)
CREATE POLICY "Admin/kepala can read activity logs" ON public.activity_logs FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'kepala')
);
CREATE POLICY "Admin can insert activity logs" ON public.activity_logs FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
);

-- Policies for user_accounts (admin can read all, users can read own)
CREATE POLICY "Admin can read all accounts" ON public.user_accounts FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
);
CREATE POLICY "Users can read own account" ON public.user_accounts FOR SELECT USING (
    auth.uid() = id
);
CREATE POLICY "Admin can manage accounts" ON public.user_accounts FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_madrasah_config_updated_at BEFORE UPDATE ON public.madrasah_config
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedule_config_updated_at BEFORE UPDATE ON public.schedule_config
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON public.teachers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_correction_requests_updated_at BEFORE UPDATE ON public.correction_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_accounts_updated_at BEFORE UPDATE ON public.user_accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert default config
INSERT INTO public.madrasah_config (id, nama, nsm, npsn, npsm, alamat, telepon, email, kepala_madrasah, nip_kepala, latitude, longitude, radius_meter, accuracy_threshold_meter, zona_waktu, logo)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'MA Al-Islam',
    '131235020021',
    '20579358',
    '20579358',
    'Jl. Madura, Ds. Joresan, Kec. Mlarak, Kab. Ponorogo, Kode Pos: 63472',
    '',
    '',
    '',
    '',
    -7.931000,
    111.509700,
    100,
    30,
    'WIB',
    ''
) ON CONFLICT (id) DO NOTHING;

-- Insert default schedule
INSERT INTO public.schedule_config (id, jam_masuk_guru, batas_terlambat_guru, jam_pulang_guru, jam_masuk_siswa, batas_terlambat_siswa, jam_pulang_siswa, hari_kerja)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '07:00', '07:15', '15:00',
    '07:00', '07:15', '14:30',
    ARRAY[6, 0, 1, 2, 3, 4]
) ON CONFLICT (id) DO NOTHING;

-- Insert holidays
INSERT INTO public.holidays (tanggal, keterangan, jenis) VALUES
    ('2026-08-17', 'HUT Proklamasi Kemerdekaan RI', 'nasional'),
    ('2026-10-22', 'Hari Santri Nasional', 'madrasah'),
    ('2026-11-25', 'Hari Guru Nasional & Milad Madrasah', 'madrasah')
ON CONFLICT DO NOTHING;

-- Insert admin account
INSERT INTO public.user_accounts (id, username, email, nama, role, status, password_hash, identifier, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin',
    'admin@alslam.sch.id',
    'Administrator Madrasah',
    'admin',
    'aktif',
    '$2a$10$placeholder_hash', -- Replace with actual bcrypt hash
    'ADMIN-01',
    NOW()
) ON CONFLICT (username) DO NOTHING;