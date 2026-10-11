import { Teacher, ScheduleConfig } from '../types';

/**
 * Date and Time utilities for WIB (Western Indonesia Time / UTC+7)
 * Sesuai kalender Madrasah:
 * Hari Aktif: Sabtu, Ahad, Senin, Selasa, Rabu, Kamis (6 hari)
 * Hari Libur Mingguan: Jum'at
 */

// Index: 0=Ahad, 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jum'at, 6=Sabtu
export const DAYS_ID = [
  'Ahad',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  "Jum'at",
  'Sabtu',
];

/**
 * Hari Aktif Madrasah default:
 * Sabtu (6), Ahad (0), Senin (1), Selasa (2), Rabu (3), Kamis (4)
 */
export const MADRASAH_ACTIVE_DAYS = [6, 0, 1, 2, 3, 4];

/**
 * Hari Libur Rutin Mingguan Madrasah:
 * Jum'at (5)
 */
export const MADRASAH_WEEKLY_HOLIDAY = 5;

export interface DayInfo {
  dayIndex: number;
  name: string;
  isWorkDay: boolean;
  isWeeklyHoliday: boolean;
}

export const MADRASAH_DAYS_CONFIG: DayInfo[] = [
  { dayIndex: 6, name: 'Sabtu', isWorkDay: true, isWeeklyHoliday: false },
  { dayIndex: 0, name: 'Ahad', isWorkDay: true, isWeeklyHoliday: false },
  { dayIndex: 1, name: 'Senin', isWorkDay: true, isWeeklyHoliday: false },
  { dayIndex: 2, name: 'Selasa', isWorkDay: true, isWeeklyHoliday: false },
  { dayIndex: 3, name: 'Rabu', isWorkDay: true, isWeeklyHoliday: false },
  { dayIndex: 4, name: 'Kamis', isWorkDay: true, isWeeklyHoliday: false },
  { dayIndex: 5, name: "Jum'at", isWorkDay: false, isWeeklyHoliday: true },
];

export const MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/** Returns current date string formatted as YYYY-MM-DD in local time */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

/** Returns current time formatted as HH:mm:ss */
export function getCurrentTimeString(): string {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/** Mendapatkan nama hari dari format YYYY-MM-DD */
export function getDayNameFromDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, monthIdx, day);
  return DAYS_ID[d.getDay()] || '';
}

/** Cek apakah tanggal tertentu merupakan hari libur mingguan (Jum'at) */
export function isWeeklyHoliday(dateStr: string): boolean {
  if (!dateStr) return false;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, monthIdx, day);
  return d.getDay() === MADRASAH_WEEKLY_HOLIDAY;
}

/** Cek apakah tanggal tertentu merupakan hari aktif madrasah */
export function isMadrasahWorkDay(dateStr: string, activeDays: number[] = MADRASAH_ACTIVE_DAYS): boolean {
  if (!dateStr) return true;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return true;
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, monthIdx, day);
  return activeDays.includes(d.getDay());
}

/** Formats YYYY-MM-DD into "Rabu, 7 Oktober 2026" atau "Ahad, 11 Oktober 2026" */
export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, monthIdx, day);
  const dayName = DAYS_ID[d.getDay()];
  const monthName = MONTHS_ID[monthIdx];
  return `${dayName}, ${day} ${monthName} ${year}`;
}

/** Formats YYYY-MM-DD into "07 Okt 2026" */
export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parts[2];
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${day} ${shortMonths[monthIdx]} ${year}`;
}

/**
 * Compares "HH:mm" with another "HH:mm"
 * returns true if timeA is after timeB
 */
export function isTimeAfter(timeA: string, timeB: string): boolean {
  const [hA, mA] = timeA.split(':').map((x) => parseInt(x, 10));
  const [hB, mB] = timeB.split(':').map((x) => parseInt(x, 10));
  const minA = hA * 60 + (mA || 0);
  const minB = hB * 60 + (mB || 0);
  return minA > minB;
}

/** Formats minutes difference into friendly Indonesian text */
export function getMinutesLate(checkInTime: string, limitTime: string): number {
  const [hA, mA] = checkInTime.split(':').map((x) => parseInt(x, 10));
  const [hB, mB] = limitTime.split(':').map((x) => parseInt(x, 10));
  const minA = hA * 60 + (mA || 0);
  const minB = hB * 60 + (mB || 0);
  return Math.max(0, minA - minB);
}

export interface EffectiveTeacherSchedule {
  day_index: number;
  day_name: string;
  aktif: boolean;
  is_override: boolean;
  jam_masuk: string;
  batas_terlambat: string;
  jam_pulang: string;
  keterangan: string;
}

/**
 * Mendapatkan jadwal efektif guru pada hari tertentu dengan memperhitungkan
 * status aktif, override jam kustom, dan jadwal standar madrasah.
 */
export function getTeacherEffectiveSchedule(
  teacher: Teacher | undefined | null,
  dayIndex: number,
  defaultSchedule: ScheduleConfig | null | undefined
): EffectiveTeacherSchedule {
  const dayName = DAYS_ID[dayIndex] || '';
  const isJumat = dayIndex === MADRASAH_WEEKLY_HOLIDAY;

  // Jika hari Jum'at, selalu libur rutin mingguan
  if (isJumat) {
    return {
      day_index: dayIndex,
      day_name: dayName,
      aktif: false,
      is_override: false,
      jam_masuk: defaultSchedule?.jam_masuk_guru || '07:00',
      batas_terlambat: defaultSchedule?.batas_terlambat_guru || '07:15',
      jam_pulang: defaultSchedule?.jam_pulang_guru || '15:00',
      keterangan: "Hari Libur Rutin Jum'at",
    };
  }

  const custom = teacher?.jadwal_khusus?.find((j) => j.day_index === dayIndex);

  // Jika belum ada konfigurasi kustom, ikuti default madrasah
  if (!custom) {
    const isMadrasahActive = defaultSchedule?.hari_kerja?.includes(dayIndex) ?? true;
    return {
      day_index: dayIndex,
      day_name: dayName,
      aktif: isMadrasahActive,
      is_override: false,
      jam_masuk: defaultSchedule?.jam_masuk_guru || '07:00',
      batas_terlambat: defaultSchedule?.batas_terlambat_guru || '07:15',
      jam_pulang: defaultSchedule?.jam_pulang_guru || '15:00',
      keterangan: isMadrasahActive ? 'Jadwal Standar Madrasah' : 'Bebas Tugas',
    };
  }

  // Jika guru diatur TIDAK AKTIF (bebas tugas / tidak ada jam mengajar pada hari tsb)
  if (!custom.aktif) {
    return {
      day_index: dayIndex,
      day_name: dayName,
      aktif: false,
      is_override: custom.is_override,
      jam_masuk: '-',
      batas_terlambat: '-',
      jam_pulang: '-',
      keterangan: 'Tidak Ada Jadwal Mengajar (Off)',
    };
  }

  // Jika aktif dan menggunakan OVERRIDE (jam khusus)
  if (custom.is_override) {
    const jamMasuk = custom.jam_masuk || defaultSchedule?.jam_masuk_guru || '07:00';
    const jamPulang = custom.jam_pulang || defaultSchedule?.jam_pulang_guru || '15:00';
    let batasTerlambat = custom.batas_terlambat;
    if (!batasTerlambat) {
      // Hitung toleransi otomatis 15 menit dari jam masuk kustom
      const [h, m] = jamMasuk.split(':').map((x) => parseInt(x, 10));
      const totalMin = (h || 7) * 60 + (m || 0) + 15;
      const bH = String(Math.floor(totalMin / 60)).padStart(2, '0');
      const bM = String(totalMin % 60).padStart(2, '0');
      batasTerlambat = `${bH}:${bM}`;
    }

    return {
      day_index: dayIndex,
      day_name: dayName,
      aktif: true,
      is_override: true,
      jam_masuk: jamMasuk,
      batas_terlambat: batasTerlambat,
      jam_pulang: jamPulang,
      keterangan: 'Override Jadwal Khusus',
    };
  }

  // Jika aktif dan menggunakan jadwal standar
  return {
    day_index: dayIndex,
    day_name: dayName,
    aktif: true,
    is_override: false,
    jam_masuk: defaultSchedule?.jam_masuk_guru || '07:00',
    batas_terlambat: defaultSchedule?.batas_terlambat_guru || '07:15',
    jam_pulang: defaultSchedule?.jam_pulang_guru || '15:00',
    keterangan: 'Jadwal Standar Madrasah',
  };
}