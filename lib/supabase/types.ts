export type UserRole = 'admin' | 'kepala' | 'guru' | 'siswa';
export type AttendanceStatus = 'Hadir' | 'Izin' | 'Sakit' | 'Dinas Luar' | 'Alpa';
export type AttendanceFlag = 'Tepat Waktu' | 'Terlambat' | 'Pulang Awal' | 'Dikoreksi' | 'Lokasi Mencurigakan' | 'Di Luar Radius';
export type LeaveType = 'Izin' | 'Sakit' | 'Dinas Luar';
export type LeaveStatus = 'Menunggu' | 'Disetujui' | 'Ditolak';
export type CorrectionStatus = 'Menunggu' | 'Disetujui' | 'Ditolak';
export type AccountStatus = 'aktif' | 'nonaktif';
export type HolidayType = 'nasional' | 'madrasah';

export interface MadrasahConfig {
  id: string;
  nama: string;
  nsm: string;
  npsn: string;
  npsm: string | null;
  alamat: string;
  telepon: string | null;
  email: string | null;
  kepala_madrasah: string | null;
  nip_kepala: string | null;
  latitude: number;
  longitude: number;
  radius_meter: number;
  accuracy_threshold_meter: number;
  zona_waktu: 'WIB' | 'WITA' | 'WIT';
  logo: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleConfig {
  id: string;
  jam_masuk_guru: string;
  batas_terlambat_guru: string;
  jam_pulang_guru: string;
  jam_masuk_siswa: string;
  batas_terlambat_siswa: string;
  jam_pulang_siswa: string;
  hari_kerja: number[];
  created_at: string;
  updated_at: string;
}

export interface Holiday {
  id: string;
  tanggal: string;
  keterangan: string;
  jenis: HolidayType;
  created_at: string;
}

export interface TeacherDaySchedule {
  day_index: number;
  aktif: boolean;
  is_override: boolean;
  jam_masuk: string | null;
  batas_terlambat: string | null;
  jam_pulang: string | null;
}

export interface Teacher {
  id: string;
  nip: string;
  nama: string;
  email: string;
  mapel: string;
  no_wa: string;
  alamat: string;
  foto: string | null;
  is_wali_kelas: boolean;
  wali_kelas_rombel: string | null;
  jadwal_khusus: TeacherDaySchedule[] | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  nisn: string;
  nama: string;
  email: string;
  rombel: string;
  no_wa: string;
  alamat: string;
  foto: string | null;
  nama_wali: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassRoom {
  id: string;
  nama: string;
  tingkat: 'X' | 'XI' | 'XII';
  wali_kelas_id: string | null;
  wali_kelas_nama: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  target_type: 'guru' | 'siswa';
  target_id: string;
  target_name: string;
  target_identifier: string;
  rombel: string | null;
  date: string;
  check_in_time: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_in_distance: number | null;
  check_in_accuracy: number | null;
  check_in_scanned_by: string | null;
  check_in_scanned_by_name: string | null;
  check_out_time: string | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  check_out_distance: number | null;
  check_out_accuracy: number | null;
  check_out_scanned_by: string | null;
  check_out_scanned_by_name: string | null;
  status: AttendanceStatus;
  flags: AttendanceFlag[];
  notes: string | null;
  is_corrected: boolean;
  corrected_by: string | null;
  corrected_at: string | null;
  correction_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: string;
  target_type: 'guru' | 'siswa';
  target_id: string;
  target_name: string;
  target_identifier: string;
  rombel: string | null;
  type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
  attachment_name: string | null;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CorrectionRequest {
  id: string;
  attendance_id: string | null;
  target_type: 'guru' | 'siswa';
  target_id: string;
  target_name: string;
  target_identifier: string;
  rombel: string | null;
  date: string;
  requested_check_in: string | null;
  requested_check_out: string | null;
  requested_status: AttendanceStatus;
  reason: string;
  status: CorrectionStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  actor_name: string;
  actor_role: UserRole;
  action: string;
  detail: string;
  timestamp: string;
  created_at: string;
}

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  nama: string;
  role: UserRole;
  status: AccountStatus;
  password_hash: string | null;
  identifier: string;
  target_id: string | null;
  mapel: string | null;
  rombel: string | null;
  is_wali_kelas: boolean;
  wali_kelas_rombel: string | null;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface CurrentUser {
  id: string;
  nama: string;
  email: string;
  role: UserRole;
  identifier: string;
  mapel: string | null;
  rombel: string | null;
  is_wali_kelas: boolean;
  wali_kelas_rombel: string | null;
  foto: string | null;
  is_logged_in: boolean;
}

export interface Database {
  public: {
    Tables: {
      madrasah_config: {
        Row: MadrasahConfig;
        Insert: Omit<MadrasahConfig, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<MadrasahConfig, 'id' | 'created_at' | 'updated_at'>>;
      };
      schedule_config: {
        Row: ScheduleConfig;
        Insert: Omit<ScheduleConfig, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ScheduleConfig, 'id' | 'created_at' | 'updated_at'>>;
      };
      holidays: {
        Row: Holiday;
        Insert: Omit<Holiday, 'id' | 'created_at'>;
        Update: Partial<Omit<Holiday, 'id' | 'created_at'>>;
      };
      teachers: {
        Row: Teacher;
        Insert: Omit<Teacher, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Teacher, 'id' | 'created_at' | 'updated_at'>>;
      };
      students: {
        Row: Student;
        Insert: Omit<Student, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Student, 'id' | 'created_at' | 'updated_at'>>;
      };
      classes: {
        Row: ClassRoom;
        Insert: Omit<ClassRoom, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ClassRoom, 'id' | 'created_at' | 'updated_at'>>;
      };
      attendance: {
        Row: AttendanceRecord;
        Insert: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'>>;
      };
      leave_requests: {
        Row: LeaveRequest;
        Insert: Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at'>>;
      };
      correction_requests: {
        Row: CorrectionRequest;
        Insert: Omit<CorrectionRequest, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CorrectionRequest, 'id' | 'created_at' | 'updated_at'>>;
      };
      activity_logs: {
        Row: ActivityLog;
        Insert: Omit<ActivityLog, 'id' | 'created_at'>;
        Update: Partial<Omit<ActivityLog, 'id' | 'created_at'>>;
      };
      user_accounts: {
        Row: UserAccount;
        Insert: Omit<UserAccount, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserAccount, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}