export type UserRole = 'admin' | 'kepala' | 'guru' | 'siswa';

export type AttendanceStatus = 'Hadir' | 'Izin' | 'Sakit' | 'Dinas Luar' | 'Alpa';

export type AttendanceFlag =
  | 'Tepat Waktu'
  | 'Terlambat'
  | 'Pulang Awal'
  | 'Dikoreksi'
  | 'Lokasi Mencurigakan'
  | 'Di Luar Radius';

export interface MadrasahConfig {
  nama: string;
  nsm: string;
  npsn: string;
  npsm?: string; // Nomor Pokok Sekolah/Madrasah (alias untuk NPSN)
  alamat: string;
  telepon: string;
  email: string;
  kepalaMadrasah: string;
  nipKepala: string;
  latitude: number;
  longitude: number;
  radiusMeter: number;
  accuracyThresholdMeter: number; // Batas maksimal akurasi GPS (meter) untuk absensi valid
  zonaWaktu: 'WIB' | 'WITA' | 'WIT';
  logo?: string; // Base64 data URL atau image URL logo madrasah
}

export interface ScheduleConfig {
  jamMasukGuru: string; // "07:00"
  batasTerlambatGuru: string; // "07:15"
  jamPulangGuru: string; // "14:30"
  jamMasukSiswa: string; // "07:00"
  batasTerlambatSiswa: string; // "07:15"
  jamPulangSiswa: string; // "14:00"
  hariKerja: number[]; // [6, 0, 1, 2, 3, 4] (6=Sabtu, 0=Ahad, 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis). Hari Libur Mingguan: 5=Jum'at
}

export interface HolidayItem {
  id: string;
  tanggal: string; // YYYY-MM-DD
  keterangan: string;
  jenis: 'nasional' | 'madrasah';
}

export interface TeacherDaySchedule {
  dayIndex: number; // 6=Sabtu, 0=Ahad, 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis
  aktif: boolean; // Apakah guru aktif/wajib hadir pada hari ini
  isOverride: boolean; // false = ikuti jadwal standar; true = override kustom
  jamMasuk?: string; // e.g. "09:00"
  batasTerlambat?: string; // e.g. "09:15"
  jamPulang?: string; // e.g. "12:30"
}

export interface Teacher {
  id: string;
  nip: string;
  nama: string;
  email: string;
  password?: string;
  mapel: string;
  noWa: string;
  alamat: string;
  foto?: string;
  isWaliKelas?: boolean;
  waliKelasRombel?: string;
  jadwalKhusus?: TeacherDaySchedule[];
}

export interface Student {
  id: string;
  nisn: string;
  nama: string;
  email: string;
  password?: string;
  rombel: string;
  noWa: string;
  alamat: string;
  foto?: string;
  namaWali?: string;
}

export interface ClassRoom {
  id: string;
  nama: string; // "X-A", "XI-IPA 1", "XII-MIPA 1"
  tingkat: 'X' | 'XI' | 'XII';
  waliKelasId: string;
  waliKelasNama: string;
  jumlahSiswa?: number;
}

export interface AttendanceRecord {
  id: string;
  targetType: 'guru' | 'siswa';
  targetId: string;
  targetName: string;
  targetIdentifier: string; // NIP or NISN
  rombel?: string; // only for siswa
  date: string; // YYYY-MM-DD
  // Check-In
  checkInTime?: string; // HH:mm:ss
  checkInLat?: number;
  checkInLng?: number;
  checkInDistance?: number; // meters from madrasah
  checkInAccuracy?: number; // GPS accuracy in meters
  checkInScannedBy?: string; // 'self' or teacher id
  checkInScannedByName?: string;
  // Check-Out
  checkOutTime?: string; // HH:mm:ss
  checkOutLat?: number;
  checkOutLng?: number;
  checkOutDistance?: number;
  checkOutAccuracy?: number; // GPS accuracy in meters
  checkOutScannedBy?: string;
  checkOutScannedByName?: string;
  status: AttendanceStatus;
  flags: AttendanceFlag[];
  notes?: string;
  isCorrected?: boolean;
  correctedBy?: string;
  correctedAt?: string;
  correctionReason?: string;
}

export interface LeaveRequest {
  id: string;
  targetType: 'guru' | 'siswa';
  targetId: string;
  targetName: string;
  targetIdentifier: string;
  rombel?: string;
  type: 'Izin' | 'Sakit' | 'Dinas Luar';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  attachmentName?: string;
  status: 'Menunggu' | 'Disetujui' | 'Ditolak';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
}

export interface CorrectionRequest {
  id: string;
  attendanceId?: string;
  targetType: 'guru' | 'siswa';
  targetId: string;
  targetName: string;
  targetIdentifier: string;
  rombel?: string;
  date: string; // YYYY-MM-DD
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  requestedStatus: AttendanceStatus;
  reason: string;
  status: 'Menunggu' | 'Disetujui' | 'Ditolak';
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  detail: string;
  timestamp: string;
}

export interface UserAccount {
  id: string;
  username: string; // NIP / NISN / admin username
  email: string;
  nama: string;
  role: UserRole; // 'admin' | 'kepala' | 'guru' | 'siswa'
  status: 'aktif' | 'nonaktif';
  password?: string;
  identifier: string; // NIP, NISN, atau "ADMIN-01"
  targetId?: string; // id di teachers atau students
  mapel?: string;
  rombel?: string;
  isWaliKelas?: boolean;
  waliKelasRombel?: string;
  lastLogin?: string;
  createdAt: string;
}

export interface CurrentUser {
  id: string;
  nama: string;
  email: string;
  role: UserRole;
  identifier: string; // NIP or NISN or "ADMIN"
  mapel?: string;
  rombel?: string;
  isWaliKelas?: boolean;
  waliKelasRombel?: string;
  foto?: string;
  isLoggedIn?: boolean;
}
