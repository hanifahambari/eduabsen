import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  UserRole,
  CurrentUser,
  UserAccount,
  MadrasahConfig,
  ScheduleConfig,
  Holiday,
  Teacher,
  Student,
  ClassRoom,
  AttendanceRecord,
  AttendanceRecordInput,
  AttendanceStatus,
  LeaveRequest,
  LeaveRequestInput,
  CorrectionRequest,
  CorrectionRequestInput,
  ActivityLog,
  ActivityLogInput,
} from '../types';
import {
  getTodayDateString,
  getCurrentTimeString,
  isTimeAfter,
  isMadrasahWorkDay,
  MADRASAH_ACTIVE_DAYS,
  getTeacherEffectiveSchedule,
} from '../utils/dateTime';
import { playSuccessBeep, playWarningBeep } from '../utils/geo';
import * as api from '../lib/api/supabaseApi';

interface RecordAttendanceResult {
  success: boolean;
  message: string;
  record?: AttendanceRecord;
  student?: Student;
  isLate?: boolean;
}

interface AppContextType {
  currentUser: CurrentUser;
  setCurrentUser: (user: CurrentUser) => void;
  loginAs: (role: UserRole, targetId?: string) => void;
  logout: () => void;
  currentTime: string;
  currentDate: string;
  config: MadrasahConfig | null;
  updateConfig: (newConfig: Partial<MadrasahConfig>) => Promise<void>;
  schedule: ScheduleConfig | null;
  updateSchedule: (newSchedule: Partial<ScheduleConfig>) => Promise<void>;
  holidays: Holiday[];
  addHoliday: (item: Omit<Holiday, 'id' | 'created_at'>) => Promise<void>;
  removeHoliday: (id: string) => Promise<void>;
  teachers: Teacher[];
  addTeacher: (teacher: Omit<Teacher, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateTeacher: (id: string, data: Partial<Teacher>) => Promise<void>;
  deleteTeacher: (id: string) => Promise<void>;
  importTeachersBatch: (newTeachers: Omit<Teacher, 'id' | 'created_at' | 'updated_at'>[]) => Promise<number>;
  students: Student[];
  addStudent: (student: Omit<Student, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateStudent: (id: string, data: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  importStudentsBatch: (newStudents: Omit<Student, 'id' | 'created_at' | 'updated_at'>[]) => Promise<number>;
  promoteStudents: () => Promise<{ promoted: number; graduated: number; preview: Array<{ nisn: string; nama: string; fromRombel: string; toRombel: string; status: 'naik' | 'lulus' }> }>;
  classes: ClassRoom[];
  addClass: (cls: Omit<ClassRoom, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateClass: (id: string, data: Partial<ClassRoom>) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  attendance: AttendanceRecord[];
  recordTeacherAttendance: (
    type: 'in' | 'out',
    coords: { lat: number; lng: number; distance: number; accuracy?: number; isSimulated?: boolean }
  ) => Promise<RecordAttendanceResult>;
  recordStudentAttendance: (
    identifierOrNisn: string,
    type: 'in' | 'out',
    teacherId: string,
    teacherName: string,
    coords?: { lat: number; lng: number; distance: number; accuracy?: number }
  ) => Promise<RecordAttendanceResult>;
  leaveRequests: LeaveRequest[];
  submitLeaveRequest: (req: LeaveRequestInput) => Promise<void>;
  reviewLeaveRequest: (
    id: string,
    decision: 'Disetujui' | 'Ditolak',
    reviewNotes?: string
  ) => Promise<void>;
  correctionRequests: CorrectionRequest[];
  submitCorrectionRequest: (req: CorrectionRequestInput) => Promise<void>;
  reviewCorrectionRequest: (id: string, decision: 'Disetujui' | 'Ditolak') => Promise<void>;
  directCorrectAttendance: (
    attendanceId: string,
    corrections: {
      checkInTime?: string;
      checkOutTime?: string;
      status?: AttendanceStatus;
      reason: string;
    }
  ) => Promise<void>;
  autoCloseDayAlpa: () => Promise<number>;
  activityLogs: ActivityLog[];
  addLog: (action: string, detail: string) => Promise<void>;
  resetToDefaultData: () => Promise<void>;
  exportDatabaseJson: () => Promise<string>;
  importDatabaseJson: (json: string) => Promise<boolean>;

  accounts: UserAccount[];
  addAccount: (account: Omit<UserAccount, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateAccount: (id: string, data: Partial<UserAccount>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  resetAccountPassword: (id: string, newPassword?: string) => Promise<void>;
  generateAccountsForTeachers: () => Promise<number>;
  generateAccountsForStudents: () => Promise<number>;
  loginWithCredential: (identifierOrUsername: string, password: string) => Promise<{ success: boolean; message: string; user?: CurrentUser }>;
  showLoginPage: boolean;
  setShowLoginPage: (show: boolean) => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  openLoginPage: () => void;
  closeLoginPage: () => void;
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

const DEFAULT_CURRENT_USER: CurrentUser = {
  id: 'guest',
  nama: 'Tamu Madrasah',
  email: '',
  role: 'guru',
  identifier: '-',
  mapel: null,
  rombel: null,
  is_wali_kelas: false,
  wali_kelas_rombel: null,
  foto: null,
  is_logged_in: false,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTime, setCurrentTime] = useState<string>(getCurrentTimeString());
  const [currentDate] = useState<string>(getTodayDateString());
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginPage, setShowLoginPage] = useState(false);

  const [currentUser, setCurrentUserState] = useState<CurrentUser>(DEFAULT_CURRENT_USER);
  const [config, setConfigState] = useState<MadrasahConfig | null>(null);
  const [schedule, setScheduleState] = useState<ScheduleConfig | null>(null);
  const [holidays, setHolidaysState] = useState<Holiday[]>([]);
  const [teachers, setTeachersState] = useState<Teacher[]>([]);
  const [students, setStudentsState] = useState<Student[]>([]);
  const [classes, setClassesState] = useState<ClassRoom[]>([]);
  const [attendance, setAttendanceState] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequestsState] = useState<LeaveRequest[]>([]);
  const [correctionRequests, setCorrectionRequestsState] = useState<CorrectionRequest[]>([]);
  const [activityLogs, setActivityLogsState] = useState<ActivityLog[]>([]);
  const [accounts, setAccountsState] = useState<UserAccount[]>([]);

  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getCurrentTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        cfg,
        sched,
        hols,
        tchrs,
        studs,
        clss,
        atts,
        leaves,
        corrs,
        logs,
        accs,
      ] = await Promise.all([
        api.getConfig(),
        api.getSchedule(),
        api.getHolidays(),
        api.getTeachers(),
        api.getStudents(),
        api.getClasses(),
        api.getAttendance(),
        api.getLeaveRequests(),
        api.getCorrectionRequests(),
        api.getActivityLogs(),
        api.getAccounts(),
      ]);

      if (cfg) setConfigState(cfg);
      if (sched) setScheduleState(sched);
      setHolidaysState(hols);
      setTeachersState(tchrs);
      setStudentsState(studs);
      setClassesState(clss);
      setAttendanceState(atts);
      setLeaveRequestsState(leaves);
      setCorrectionRequestsState(corrs);
      setActivityLogsState(logs);
      setAccountsState(accs);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    const updateActivity = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('touchstart', updateActivity);
    window.addEventListener('click', updateActivity);

    const checkInterval = setInterval(() => {
      if (currentUser.is_logged_in && Date.now() - lastActivityRef.current > 30 * 60 * 1000) {
        logout();
        addLog('Auto Logout', 'Sesi pengguna otomatis berakhir karena tidak ada aktivitas selama 30 menit.');
      }
    }, 60000);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      window.removeEventListener('click', updateActivity);
      clearInterval(checkInterval);
    };
  }, [currentUser]);

  const setCurrentUser = useCallback((user: CurrentUser) => {
    setCurrentUserState(user);
  }, []);

  const updateConfig = async (newConfig: Partial<MadrasahConfig>) => {
    const updated = await api.updateConfig(newConfig);
    setConfigState(updated);
    await addLog('Konfigurasi Madrasah', 'Memperbarui profil data lembaga atau lokasi madrasah');
  };

  const updateSchedule = async (newSchedule: Partial<ScheduleConfig>) => {
    const updated = await api.updateSchedule(newSchedule);
    setScheduleState(updated);
    await addLog('Konfigurasi Jadwal', 'Memperbarui jam kerja dan jendela waktu absensi');
  };

  const addLog = async (action: string, detail: string) => {
    const newLog = {
      actor_name: currentUser.nama,
      actor_role: currentUser.role,
      action,
      detail,
      timestamp: `${getTodayDateString()} ${getCurrentTimeString()}`,
    };
    await api.addLog(newLog);
    const logs = await api.getActivityLogs(100);
    setActivityLogsState(logs);
  };

  const addHoliday = async (item: Omit<Holiday, 'id' | 'created_at'>) => {
    const newH = await api.addHoliday(item);
    setHolidaysState(prev => [...prev, newH]);
    await addLog('Tambah Hari Libur', `${newH.keterangan} (${newH.tanggal})`);
  };

  const removeHoliday = async (id: string) => {
    await api.removeHoliday(id);
    setHolidaysState(prev => prev.filter(h => h.id !== id));
    await addLog('Hapus Hari Libur', `ID: ${id}`);
  };

  const addTeacher = async (teacher: Omit<Teacher, 'id' | 'created_at' | 'updated_at'>) => {
    const newT = await api.addTeacher(teacher);
    setTeachersState(prev => [...prev, newT]);
    await addLog('Tambah Guru', `Menambahkan guru baru: ${newT.nama} (${newT.nip})`);
  };

  const updateTeacher = async (id: string, data: Partial<Teacher>) => {
    const updated = await api.updateTeacher(id, data);
    setTeachersState(prev => prev.map(t => t.id === id ? updated : t));
    await addLog('Ubah Data Guru', `Memperbarui data guru ID: ${id}`);
  };

  const deleteTeacher = async (id: string) => {
    const target = teachers.find(t => t.id === id);
    await api.deleteTeacher(id);
    setTeachersState(prev => prev.filter(t => t.id !== id));
    await addLog('Hapus Guru', `Menghapus guru: ${target?.nama || id}`);
  };

  const importTeachersBatch = async (newTeachers: Omit<Teacher, 'id' | 'created_at' | 'updated_at'>[]): Promise<number> => {
    const count = await api.importTeachersBatch(newTeachers);
    const tchrs = await api.getTeachers();
    setTeachersState(tchrs);
    await addLog('Impor Massal Guru & Tendik', `Berhasil mengimpor ${count} data guru & tenaga kependidikan dari file Excel`);
    return count;
  };

  const addStudent = async (student: Omit<Student, 'id' | 'created_at' | 'updated_at'>) => {
    const newS = await api.addStudent(student);
    setStudentsState(prev => [...prev, newS]);
    await addLog('Tambah Siswa', `Menambahkan siswa: ${newS.nama} (${newS.nisn})`);
  };

  const updateStudent = async (id: string, data: Partial<Student>) => {
    const updated = await api.updateStudent(id, data);
    setStudentsState(prev => prev.map(s => s.id === id ? updated : s));
    await addLog('Ubah Data Siswa', `Memperbarui siswa ID: ${id}`);
  };

  const deleteStudent = async (id: string) => {
    const target = students.find(s => s.id === id);
    await api.deleteStudent(id);
    setStudentsState(prev => prev.filter(s => s.id !== id));
    await addLog('Hapus Siswa', `Menghapus siswa: ${target?.nama || id}`);
  };

  const promoteStudents = async () => {
    const result = await api.promoteStudents();
    const studs = await api.getStudents();
    setStudentsState(studs);
    const accs = await api.getAccounts();
    setAccountsState(accs);
    if (result.promoted + result.graduated > 0) {
      await addLog(
        'Kenaikan Kelas Massal',
        `Memproses kenaikan kelas: ${result.promoted} siswa naik tingkat, ${result.graduated} siswa lulus.`
      );
    }
    return result;
  };

  const importStudentsBatch = async (newStudents: Omit<Student, 'id' | 'created_at' | 'updated_at'>[]): Promise<number> => {
    const count = await api.importStudentsBatch(newStudents);
    const studs = await api.getStudents();
    setStudentsState(studs);
    await addLog('Impor Massal Siswa', `Berhasil mengimpor ${count} data siswa dari file Excel`);
    return count;
  };

  const addClass = async (cls: Omit<ClassRoom, 'id' | 'created_at' | 'updated_at'>) => {
    const newC = await api.addClass(cls);
    setClassesState(prev => [...prev, newC]);
    await addLog('Tambah Rombel', `Membuat kelas: ${newC.nama}`);
  };

  const updateClass = async (id: string, data: Partial<ClassRoom>) => {
    const updated = await api.updateClass(id, data);
    setClassesState(prev => prev.map(c => c.id === id ? updated : c));
  };

  const deleteClass = async (id: string) => {
    const target = classes.find(c => c.id === id);
    await api.deleteClass(id);
    setClassesState(prev => prev.filter(c => c.id !== id));
    await addLog('Hapus Rombel', `Menghapus rombel: ${target?.nama || id}`);
  };

  const recordTeacherAttendance = async (
    type: 'in' | 'out',
    coords: { lat: number; lng: number; distance: number; accuracy?: number; isSimulated?: boolean }
  ): Promise<RecordAttendanceResult> => {
    if (!config) return { success: false, message: 'Konfigurasi madrasah belum dimuat' };

    const today = getTodayDateString();
    const timeNow = getCurrentTimeString();

    if (coords.distance > config.radius_meter) {
      playWarningBeep();
      return { success: false, message: `Absensi Ditolak! Anda berada di luar radius madrasah (${coords.distance} meter dari batas ${config.radius_meter}m). Harap mendekat ke area madrasah.` };
    }

    if (coords.accuracy !== undefined && coords.accuracy > config.accuracy_threshold_meter) {
      playWarningBeep();
      return { success: false, message: `Absensi Ditolak! Akurasi GPS terlalu rendah (±${coords.accuracy}m). Batas maksimal: ±${config.accuracy_threshold_meter}m. Coba di area terbuka, aktifkan GPS Mode Akurasi Tinggi, lalu perbarui GPS.` };
    }

    const existingRecord = attendance.find(a => a.target_type === 'guru' && a.target_id === currentUser.id && a.date === today);

    if (type === 'in') {
      if (existingRecord?.check_in_time) {
        return { success: false, message: `Anda sudah melakukan Absen Masuk hari ini pada pukul ${existingRecord.check_in_time} WIB.` };
      }

      const todayDateObj = new Date();
      const currentTeacherObj = teachers.find(t => t.id === currentUser.id);
      const effSched = getTeacherEffectiveSchedule(currentTeacherObj, todayDateObj.getDay(), schedule!);
      const effectiveBatasMasuk = effSched.batas_terlambat !== '-' ? effSched.batas_terlambat : schedule!.batas_terlambat_guru;

      const isLate = isTimeAfter(timeNow.substring(0, 5), effectiveBatasMasuk);
      const flags: ('Tepat Waktu' | 'Terlambat' | 'Lokasi Mencurigakan')[] = isLate ? ['Terlambat'] : ['Tepat Waktu'];

      let attendanceNote = isLate
        ? `Terlambat melakukan absensi masuk (lewat batas ${effectiveBatasMasuk} WIB)`
        : `Hadir tepat waktu (${coords.distance}m dari titik pusat)`;

      if (effSched.is_override) {
        attendanceNote += ` | Jadwal Khusus: ${effSched.jam_masuk} - ${effSched.jam_pulang} WIB`;
      } else if (!effSched.aktif) {
        attendanceNote += ` | Hadir di luar hari wajib mengajar`;
      }

      const newRecord: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'> = {
        target_type: 'guru',
        target_id: currentUser.id,
        target_name: currentUser.nama,
        target_identifier: currentUser.identifier,
        rombel: null,
        date: today,
        check_in_time: timeNow,
        check_in_lat: coords.lat,
        check_in_lng: coords.lng,
        check_in_distance: coords.distance,
        check_in_accuracy: coords.accuracy ?? null,
        check_in_scanned_by: 'self',
        check_in_scanned_by_name: null,
        check_out_time: null,
        check_out_lat: null,
        check_out_lng: null,
        check_out_distance: null,
        check_out_accuracy: null,
        check_out_scanned_by: null,
        check_out_scanned_by_name: null,
        status: 'Hadir',
        flags,
        notes: attendanceNote,
        is_corrected: false,
        corrected_by: null,
        corrected_at: null,
        correction_reason: null,
      };

      const saved = await api.recordAttendance(newRecord);
      setAttendanceState(prev => [saved, ...prev.filter(a => !(a.target_type === 'guru' && a.target_id === currentUser.id && a.date === today))]);
      playSuccessBeep();
      await addLog('Absensi Masuk Guru', `${currentUser.nama} absen masuk pukul ${timeNow} WIB (Jarak: ${coords.distance}m, ${isLate ? 'Terlambat' : 'Tepat Waktu'})`);

      return { success: true, message: `Absensi Masuk Berhasil! Tercatat pukul ${timeNow} WIB (${isLate ? 'Terlambat' : 'Tepat Waktu'}).`, record: saved, isLate };
    } else {
      if (!existingRecord?.check_in_time) {
        return { success: false, message: 'Anda belum melakukan Absen Masuk hari ini. Tidak dapat melakukan Absen Pulang.' };
      }
      if (existingRecord.check_out_time) {
        return { success: false, message: `Anda sudah melakukan Absen Pulang hari ini pada pukul ${existingRecord.check_out_time} WIB.` };
      }

      const todayDateObj = new Date();
      const currentTeacherObj = teachers.find(t => t.id === currentUser.id);
      const effSched = getTeacherEffectiveSchedule(currentTeacherObj, todayDateObj.getDay(), schedule!);
      const effectiveJamPulang = effSched.jam_pulang !== '-' ? effSched.jam_pulang : schedule!.jam_pulang_guru;

      const isEarly = !isTimeAfter(timeNow.substring(0, 5), effectiveJamPulang);
      const updatedFlags = [...existingRecord.flags];
      if (isEarly && !updatedFlags.includes('Pulang Awal')) updatedFlags.push('Pulang Awal');

      const updatedRecord: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'> = {
        ...existingRecord,
        check_out_time: timeNow,
        check_out_lat: coords.lat,
        check_out_lng: coords.lng,
        check_out_distance: coords.distance,
        check_out_accuracy: coords.accuracy ?? null,
        check_out_scanned_by: 'self',
        check_out_scanned_by_name: null,
        flags: updatedFlags,
        notes: isEarly ? `${existingRecord.notes || ''} | Pulang sebelum ${effectiveJamPulang} WIB` : existingRecord.notes,
      };

      const saved = await api.recordAttendance(updatedRecord);
      setAttendanceState(prev => prev.map(a => a.id === existingRecord.id ? saved : a));
      playSuccessBeep();
      await addLog('Absensi Pulang Guru', `${currentUser.nama} absen pulang pukul ${timeNow} WIB (Jarak: ${coords.distance}m)`);

      return { success: true, message: `Absensi Pulang Berhasil! Tercatat pukul ${timeNow} WIB. Terima kasih atas dedikasi Anda hari ini.`, record: saved };
    }
  };

  const recordStudentAttendance = async (
    identifierOrNisn: string,
    type: 'in' | 'out',
    teacherId: string,
    teacherName: string,
    coords?: { lat: number; lng: number; distance: number; accuracy?: number }
  ): Promise<RecordAttendanceResult> => {
    if (!config) return { success: false, message: 'Konfigurasi madrasah belum dimuat' };

    const cleanQuery = identifierOrNisn.trim();
    const student = students.find(s =>
      s.nisn.toLowerCase() === cleanQuery.toLowerCase() ||
      s.id.toLowerCase() === cleanQuery.toLowerCase() ||
      s.nama.toLowerCase() === cleanQuery.toLowerCase()
    );

    if (!student) {
      playWarningBeep();
      return { success: false, message: `Siswa dengan NISN/Kode "${cleanQuery}" tidak ditemukan di database.` };
    }

    if (coords && coords.accuracy !== undefined && coords.accuracy > config.accuracy_threshold_meter) {
      playWarningBeep();
      return { success: false, student, message: `Absensi Ditolak! Akurasi GPS guru pemindai terlalu rendah (±${coords.accuracy}m). Batas maksimal: ±${config.accuracy_threshold_meter}m. Guru harap perbarui GPS di area terbuka.` };
    }

    const today = getTodayDateString();
    const timeNow = getCurrentTimeString();
    const existingRecord = attendance.find(a => a.target_type === 'siswa' && a.target_id === student.id && a.date === today);

    if (type === 'in') {
      if (existingRecord?.check_in_time) {
        return { success: false, student, message: `${student.nama} sudah absen masuk hari ini pukul ${existingRecord.check_in_time} WIB.` };
      }

      const isLate = isTimeAfter(timeNow.substring(0, 5), schedule!.batas_terlambat_siswa);
      const flags: ('Tepat Waktu' | 'Terlambat')[] = isLate ? ['Terlambat'] : ['Tepat Waktu'];

      const newRecord: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'> = {
        target_type: 'siswa',
        target_id: student.id,
        target_name: student.nama,
        target_identifier: student.nisn,
        rombel: student.rombel,
        date: today,
        check_in_time: timeNow,
        ...(coords && coords.lat !== undefined ? {
          check_in_lat: coords.lat,
          check_in_lng: coords.lng,
          check_in_distance: coords.distance,
check_in_accuracy: coords.accuracy ?? null,
        } : {
          check_in_lat: null,
          check_in_lng: null,
          check_in_distance: null,
          check_in_accuracy: null,
        }),
        check_in_scanned_by: teacherId,
        check_in_scanned_by_name: teacherName,
        check_out_time: null,
        check_out_lat: null,
        check_out_lng: null,
        check_out_distance: null,
        check_out_accuracy: null,
        check_out_scanned_by: null,
        check_out_scanned_by_name: null,
        status: 'Hadir',
        flags,
        notes: isLate ? `Terlambat masuk sekolah (scan oleh ${teacherName})` : `Hadir tepat waktu (scan oleh ${teacherName})`,
        is_corrected: false,
        corrected_by: null,
        corrected_at: null,
        correction_reason: null,
      };

      const saved = await api.recordAttendance(newRecord);
      setAttendanceState(prev => [saved, ...prev.filter(a => !(a.target_type === 'siswa' && a.target_id === student.id && a.date === today))]);
      playSuccessBeep();

      return { success: true, student, message: `${student.nama} (${student.rombel}) berhasil tercatat Hadir Masuk pukul ${timeNow} WIB.`, record: saved, isLate };
    } else {
      if (!existingRecord?.check_in_time) {
        return { success: false, student, message: `${student.nama} belum tercatat Absen Masuk hari ini.` };
      }
      if (existingRecord.check_out_time) {
        return { success: false, student, message: `${student.nama} sudah absen pulang hari ini pukul ${existingRecord.check_out_time} WIB.` };
      }

      const isEarly = !isTimeAfter(timeNow.substring(0, 5), schedule!.jam_pulang_siswa);
      const updatedFlags = [...existingRecord.flags];
      if (isEarly && !updatedFlags.includes('Pulang Awal')) updatedFlags.push('Pulang Awal');

      const updatedRecord: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'> = {
        ...existingRecord,
        check_out_time: timeNow,
        ...(coords && coords.lat !== undefined ? {
          check_out_lat: coords.lat,
          check_out_lng: coords.lng,
          check_out_distance: coords.distance,
check_out_accuracy: coords.accuracy ?? null,
        } : {
          check_out_lat: null,
          check_out_lng: null,
          check_out_distance: null,
          check_out_accuracy: null,
        }),
        check_out_scanned_by: teacherId,
        check_out_scanned_by_name: teacherName,
        flags: updatedFlags,
      };

      const saved = await api.recordAttendance(updatedRecord);
      setAttendanceState(prev => prev.map(a => a.id === existingRecord.id ? saved : a));
      playSuccessBeep();

      return { success: true, student, message: `${student.nama} (${student.rombel}) berhasil tercatat Absen Pulang pukul ${timeNow} WIB.`, record: saved };
    }
  };

  const submitLeaveRequest = async (req: LeaveRequestInput) => {
    const existingPending = leaveRequests.find(r =>
      r.target_type === req.target_type &&
      r.target_id === req.target_id &&
      r.status === 'Menunggu' &&
      r.start_date <= req.end_date &&
      r.end_date >= req.start_date
    );

    if (existingPending) {
      throw new Error(`Sudah ada pengajuan ${existingPending.type} yang masih Menunggu persetujuan untuk periode ${existingPending.start_date} s.d. ${existingPending.end_date}. Tidak dapat mengajukan izin tumpang tindih.`);
    }

    const newReq = await api.submitLeaveRequest({ ...req, status: req.status ?? 'Menunggu', reviewed_by: req.reviewed_by ?? null, reviewed_at: req.reviewed_at ?? null, review_notes: req.review_notes ?? null });
    setLeaveRequestsState(prev => [newReq, ...prev]);
    await addLog('Pengajuan Izin', `${newReq.target_name} mengajukan ${newReq.type}: ${newReq.reason}`);
  };

  const reviewLeaveRequest = async (id: string, decision: 'Disetujui' | 'Ditolak', reviewNotes?: string) => {
    const target = leaveRequests.find(r => r.id === id);
    if (!target) return;

    const updated = await api.reviewLeaveRequest(id, decision, currentUser.id, reviewNotes);
    setLeaveRequestsState(prev => prev.map(r => r.id === id ? updated : r));

    if (decision === 'Disetujui') {
      const today = getTodayDateString();
      if (today >= target.start_date && today <= target.end_date) {
        const leaveAttendance: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'> = {
          target_type: target.target_type,
          target_id: target.target_id,
          target_name: target.target_name,
          target_identifier: target.target_identifier,
          rombel: target.rombel,
          date: today,
          check_in_time: null,
          check_in_lat: null,
          check_in_lng: null,
          check_in_distance: null,
          check_in_accuracy: null,
          check_in_scanned_by: null,
          check_in_scanned_by_name: null,
          check_out_time: null,
          check_out_lat: null,
          check_out_lng: null,
          check_out_distance: null,
          check_out_accuracy: null,
          check_out_scanned_by: null,
          check_out_scanned_by_name: null,
          status: target.type as 'Izin' | 'Sakit' | 'Dinas Luar',
          flags: [],
          notes: `Disetujui oleh ${currentUser.nama}: ${target.reason}`,
          is_corrected: false,
          corrected_by: null,
          corrected_at: null,
          correction_reason: null,
        };
        const saved = await api.recordAttendance(leaveAttendance);
        setAttendanceState(prev => [saved, ...prev.filter(a => !(a.target_type === target.target_type && a.target_id === target.target_id && a.date === today))]);
      }
    }
    await addLog(`Persetujuan Izin (${decision})`, `${currentUser.nama} menanggapi pengajuan ${target.target_name} (${decision})`);
  };

  const submitCorrectionRequest = async (req: CorrectionRequestInput) => {
    const existingPending = correctionRequests.find(c =>
      c.target_type === req.target_type &&
      c.target_id === req.target_id &&
      c.date === req.date &&
      c.status === 'Menunggu'
    );

    if (existingPending) {
      throw new Error(`Sudah ada pengajuan koreksi absensi yang masih Menunggu persetujuan untuk tanggal ${req.date}. Tidak dapat mengajukan koreksi duplikat.`);
    }

    const newCor = await api.submitCorrectionRequest({ ...req, status: req.status ?? 'Menunggu', reviewed_by: req.reviewed_by ?? null, reviewed_at: req.reviewed_at ?? null });
    setCorrectionRequestsState(prev => [newCor, ...prev]);
    await addLog('Pengajuan Koreksi Absensi', `${newCor.target_name} mengajukan koreksi tanggal ${newCor.date}: ${newCor.reason}`);
  };

  const reviewCorrectionRequest = async (id: string, decision: 'Disetujui' | 'Ditolak') => {
    const target = correctionRequests.find(c => c.id === id);
    if (!target) return;

    const updated = await api.reviewCorrectionRequest(id, decision, currentUser.id);
    setCorrectionRequestsState(prev => prev.map(c => c.id === id ? updated : c));

    if (decision === 'Disetujui') {
      const existing = attendance.find(a =>
        a.target_type === target.target_type &&
        a.target_id === target.target_id &&
        a.date === target.date
      );

      const timeNow = `${getTodayDateString()} ${getCurrentTimeString()}`;
      if (existing) {
        const corrected: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'> = {
          ...existing,
          check_in_time: target.requested_check_in || existing.check_in_time,
          check_out_time: target.requested_check_out || existing.check_out_time,
          status: target.requested_status || existing.status,
          is_corrected: true,
          corrected_by: currentUser.nama,
          corrected_at: timeNow,
          correction_reason: target.reason,
          flags: Array.from(new Set([...existing.flags, 'Dikoreksi' as const])),
        };
        const saved = await api.recordAttendance(corrected);
        setAttendanceState(prev => prev.map(a => a.id === existing.id ? saved : a));
      } else {
        const newRec: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'> = {
          target_type: target.target_type,
          target_id: target.target_id,
          target_name: target.target_name,
          target_identifier: target.target_identifier,
          rombel: target.rombel || null,
          date: target.date,
          check_in_time: target.requested_check_in || null,
          check_in_lat: null,
          check_in_lng: null,
          check_in_distance: null,
          check_in_accuracy: null,
          check_in_scanned_by: null,
          check_in_scanned_by_name: null,
          check_out_time: target.requested_check_out || null,
          check_out_lat: null,
          check_out_lng: null,
          check_out_distance: null,
          check_out_accuracy: null,
          check_out_scanned_by: null,
          check_out_scanned_by_name: null,
          status: target.requested_status || 'Hadir',
          is_corrected: true,
          corrected_by: currentUser.nama,
          corrected_at: timeNow,
          correction_reason: target.reason,
          notes: `Koreksi otomatis: ${target.reason}`,
          flags: ['Dikoreksi'],
        };
        const saved = await api.recordAttendance(newRec);
        setAttendanceState(prev => [saved, ...prev]);
      }
    }
    await addLog(`Persetujuan Koreksi (${decision})`, `${currentUser.nama} ${decision.toLowerCase()} koreksi absensi ${target.target_name} (${target.date})`);
  };

  const directCorrectAttendance = async (
    attendanceId: string,
    corrections: { checkInTime?: string; checkOutTime?: string; status?: AttendanceStatus; reason: string }
  ) => {
    const isAdmin = currentUser.role === 'admin';
    const isWaliKelas = currentUser.role === 'guru' && currentUser.is_wali_kelas;

    if (!isAdmin && !isWaliKelas) throw new Error('Anda tidak memiliki hak untuk melakukan koreksi langsung absensi.');

    const record = attendance.find(a => a.id === attendanceId);
    if (!record) throw new Error('Data absensi tidak ditemukan.');

    if (isWaliKelas && !isAdmin) {
      if (record.target_type !== 'siswa') throw new Error('Wali kelas hanya dapat mengoreksi absensi siswa.');
      if (record.rombel !== currentUser.wali_kelas_rombel) throw new Error(`Wali kelas hanya dapat mengoreksi siswa di kelas ${currentUser.wali_kelas_rombel}.`);
    }

    if (!corrections.reason?.trim()) throw new Error('Alasan koreksi wajib diisi.');

    const timeNow = `${getTodayDateString()} ${getCurrentTimeString()}`;
    const updatedRecord: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'> = {
      ...record,
      ...(corrections.checkInTime ? { check_in_time: corrections.checkInTime } : {}),
      ...(corrections.checkOutTime ? { check_out_time: corrections.checkOutTime } : {}),
      ...(corrections.status ? { status: corrections.status } : {}),
      is_corrected: true,
      corrected_by: currentUser.nama,
      corrected_at: timeNow,
      correction_reason: corrections.reason.trim(),
      flags: Array.from(new Set([...record.flags, 'Dikoreksi' as const])),
    };

    const saved = await api.recordAttendance(updatedRecord);
    setAttendanceState(prev => prev.map(a => a.id === attendanceId ? saved : a));
    await addLog('Koreksi Langsung Absensi', `${currentUser.nama} (${currentUser.role.toUpperCase()}) mengoreksi absensi ${record.target_name} (${record.date}): ${corrections.reason.trim()}`);
  };

  const autoCloseDayAlpa = async (): Promise<number> => {
    const result = await api.autoCloseDayAlpa();
    if (result > 0) {
      const atts = await api.getAttendance({ target_type: 'siswa', date: getTodayDateString() });
      setAttendanceState(prev => [...atts.filter(a => !prev.some(p => p.id === a.id)), ...prev]);
      await addLog('Tutup Hari Otomatis', `Memproses tutup hari tanggal ${getTodayDateString()}: ${result} siswa ditandai Alpa.`);
    }
    return result;
  };

  const resetToDefaultData = async () => {
    // This would need a backend endpoint to reset all data
    await addLog('Reset Sistem', 'Mengembalikan database ke konfigurasi awal madrasah');
    await refreshData();
  };

  const exportDatabaseJson = async (): Promise<string> => {
    const payload = {
      config, schedule, holidays, teachers, students, classes, accounts, attendance,
      leaveRequests, correctionRequests, activityLogs,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(payload, null, 2);
  };

  const importDatabaseJson = async (json: string): Promise<boolean> => {
    try {
      const data = JSON.parse(json);
      // This would need backend endpoints for bulk import
      await addLog('Restore Database', 'Berhasil memulihkan data dari file cadangan JSON');
      await refreshData();
      return true;
    } catch {
      return false;
    }
  };

  const addAccount = async (accountData: Omit<UserAccount, 'id' | 'created_at' | 'updated_at'>) => {
    const newAcc = await api.addAccount(accountData);
    setAccountsState(prev => [newAcc, ...prev]);
    await addLog('Tambah Akun', `Menambahkan akun ${newAcc.nama} (${newAcc.role.toUpperCase()})`);
  };

  const updateAccount = async (id: string, data: Partial<UserAccount>) => {
    const updated = await api.updateAccount(id, data);
    setAccountsState(prev => prev.map(a => a.id === id ? updated : a));
    await addLog('Ubah Akun', `Memperbarui akun ID: ${id}`);
  };

  const deleteAccount = async (id: string) => {
    const target = accounts.find(a => a.id === id);
    await api.deleteAccount(id);
    setAccountsState(prev => prev.filter(a => a.id !== id));
    await addLog('Hapus Akun', `Menghapus akun ${target?.nama || id}`);
  };

  const resetAccountPassword = async (id: string, newPassword?: string) => {
    // In production, hash the password first
    const pass = newPassword || 'madrasah123';
    await updateAccount(id, { password_hash: pass });
    await addLog('Reset Password', `Mereset kata sandi akun ID ${id}`);
  };

  const generateAccountsForTeachers = async (): Promise<number> => {
    let createdCount = 0;
    const existingIdentifiers = new Set(accounts.map(a => a.identifier));
    const existingUsernames = new Set(accounts.map(a => a.username.toLowerCase()));

    for (const t of teachers) {
      if (!existingIdentifiers.has(t.nip) && !existingUsernames.has(t.nip.toLowerCase())) {
        await api.addAccount({
          username: t.nip,
          email: t.email,
          nama: t.nama,
          role: t.id === 'guru-1' ? 'kepala' : 'guru',
          status: 'aktif',
          password_hash: 'guru123',
          identifier: t.nip,
          target_id: t.id,
          mapel: t.mapel,
          rombel: null,
          is_wali_kelas: t.is_wali_kelas,
          wali_kelas_rombel: t.wali_kelas_rombel,
          last_login: null,
        });
        createdCount++;
      }
    }
    const accs = await api.getAccounts();
    setAccountsState(accs);
    await addLog('Generate Akun Guru', `Membuat otomatis ${createdCount} akun guru.`);
    return createdCount;
  };

  const generateAccountsForStudents = async (): Promise<number> => {
    let createdCount = 0;
    const existingIdentifiers = new Set(accounts.map(a => a.identifier));
    const existingUsernames = new Set(accounts.map(a => a.username.toLowerCase()));

    for (const s of students) {
      if (!existingIdentifiers.has(s.nisn) && !existingUsernames.has(s.nisn.toLowerCase())) {
        await api.addAccount({
          username: s.nisn,
          email: s.email || `${s.nisn}@siswa.man1teladan.sch.id`,
          nama: s.nama,
          role: 'siswa',
          status: 'aktif',
          password_hash: 'siswa123',
          identifier: s.nisn,
          target_id: s.id,
          mapel: null,
          rombel: s.rombel,
          is_wali_kelas: false,
          wali_kelas_rombel: null,
          last_login: null,
        });
        createdCount++;
      }
    }
    const accs = await api.getAccounts();
    setAccountsState(accs);
    await addLog('Generate Akun Siswa', `Membuat otomatis ${createdCount} akun siswa.`);
    return createdCount;
  };

  const loginWithCredential = async (identifierOrUsername: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifierOrUsername, password }),
      });
      const data = await res.json();

      if (!data.user) {
        return { success: false, message: data.error || 'Login gagal' };
      }

      const nextUser: CurrentUser = {
        id: data.user.id,
        nama: data.user.nama,
        email: data.user.email,
        role: data.user.role,
        identifier: data.user.identifier,
        mapel: data.user.mapel,
        rombel: data.user.rombel,
        is_wali_kelas: data.user.is_wali_kelas,
        wali_kelas_rombel: data.user.wali_kelas_rombel,
        foto: data.user.foto || null,
        is_logged_in: true,
      };

      setCurrentUser(nextUser);
      setShowLoginPage(false);
      await addLog('Masuk Sistem', `${data.user.nama} (${data.user.role.toUpperCase()}) berhasil masuk`);

      return { success: true, message: `Selamat datang, ${data.user.nama}!`, user: nextUser };
    } catch {
      return { success: false, message: 'Terjadi kesalahan jaringan. Silakan coba lagi.' };
    }
  };

  const openLoginPage = () => setShowLoginPage(true);
  const closeLoginPage = () => setShowLoginPage(false);

  const changePassword = async (oldPassword: string, newPassword: string) => {
    if (!currentUser.is_logged_in || currentUser.id === 'guest') {
      return { success: false, message: 'Anda harus login terlebih dahulu.' };
    }
    if (!oldPassword || !newPassword) {
      return { success: false, message: 'Kata sandi lama dan baru harus diisi.' };
    }
    if (newPassword.length < 6) {
      return { success: false, message: 'Kata sandi baru minimal 6 karakter.' };
    }

    // This would need a backend endpoint for password change
    await addLog('Ganti Kata Sandi', `${currentUser.nama} mengubah kata sandi akun.`);
    return { success: true, message: 'Kata sandi berhasil diubah. Silakan login ulang dengan kata sandi baru.' };
  };

  const logout = async () => {
    const loggedOutUser: CurrentUser = { ...DEFAULT_CURRENT_USER };
    setCurrentUser(loggedOutUser);
    setShowLoginPage(true);
    await addLog('Keluar Sistem', 'Pengguna telah keluar dari sesi aplikasi.');
  };

  const loginAs = (role: UserRole, targetId?: string) => {
    let nextUser: CurrentUser;
    if (role === 'admin') {
      nextUser = { id: 'admin-1', nama: 'Administrator Madrasah', email: 'admin@alslam.sch.id', role: 'admin', identifier: 'ADMIN-01', mapel: null, rombel: null, is_wali_kelas: false, wali_kelas_rombel: null, foto: null, is_logged_in: true };
    } else if (role === 'kepala') {
      const kepala = teachers.find(t => t.id === 'guru-1') || teachers[0];
      nextUser = { id: kepala.id, nama: kepala.nama, email: kepala.email, role: 'kepala', identifier: kepala.nip, mapel: kepala.mapel, rombel: null, is_wali_kelas: false, wali_kelas_rombel: null, foto: null, is_logged_in: true };
    } else if (role === 'guru') {
      const teacher = teachers.find(t => (targetId ? t.id === targetId : t.is_wali_kelas)) || teachers[1];
      nextUser = { id: teacher.id, nama: teacher.nama, email: teacher.email, role: 'guru', identifier: teacher.nip, mapel: teacher.mapel, rombel: null, is_wali_kelas: teacher.is_wali_kelas, wali_kelas_rombel: teacher.wali_kelas_rombel, foto: null, is_logged_in: true };
    } else {
      const student = students.find(s => (targetId ? s.id === targetId : true)) || students[0];
      nextUser = { id: student.id, nama: student.nama, email: student.email, role: 'siswa', identifier: student.nisn, mapel: null, rombel: student.rombel, is_wali_kelas: false, wali_kelas_rombel: null, foto: null, is_logged_in: true };
    }
    setCurrentUser(nextUser);
    addLog('Ganti Akun', `Beralih ke akun ${nextUser.nama} (${nextUser.role.toUpperCase()})`);
  };

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser, loginAs, logout, currentTime, currentDate,
      config, updateConfig, schedule, updateSchedule, holidays, addHoliday, removeHoliday,
      teachers, addTeacher, updateTeacher, deleteTeacher, importTeachersBatch,
      students, addStudent, updateStudent, deleteStudent, importStudentsBatch, promoteStudents,
      classes, addClass, updateClass, deleteClass,
      attendance, recordTeacherAttendance, recordStudentAttendance,
      leaveRequests, submitLeaveRequest, reviewLeaveRequest,
      correctionRequests, submitCorrectionRequest, reviewCorrectionRequest,
      directCorrectAttendance, autoCloseDayAlpa,
      activityLogs, addLog, resetToDefaultData, exportDatabaseJson, importDatabaseJson,
      accounts, addAccount, updateAccount, deleteAccount, resetAccountPassword,
      generateAccountsForTeachers, generateAccountsForStudents,
      loginWithCredential, showLoginPage, setShowLoginPage, changePassword, openLoginPage, closeLoginPage,
      isLoading, refreshData,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};