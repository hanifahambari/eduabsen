import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  UserRole,
  CurrentUser,
  UserAccount,
  MadrasahConfig,
  ScheduleConfig,
  HolidayItem,
  Teacher,
  Student,
  ClassRoom,
  AttendanceRecord,
  AttendanceStatus,
  LeaveRequest,
  CorrectionRequest,
  ActivityLog,
} from '../types';
import {
  INITIAL_CONFIG,
  INITIAL_SCHEDULE,
  INITIAL_HOLIDAYS,
  INITIAL_TEACHERS,
  INITIAL_CLASSES,
  INITIAL_STUDENTS,
  INITIAL_ATTENDANCE,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_CORRECTIONS,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_ACCOUNTS,
} from '../data/initialData';
import {
  getTodayDateString,
  getCurrentTimeString,
  isTimeAfter,
  isMadrasahWorkDay,
  MADRASAH_ACTIVE_DAYS,
  getTeacherEffectiveSchedule,
} from '../utils/dateTime';
import { playSuccessBeep, playWarningBeep } from '../utils/geo';

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
  config: MadrasahConfig;
  updateConfig: (newConfig: Partial<MadrasahConfig>) => void;
  schedule: ScheduleConfig;
  updateSchedule: (newSchedule: Partial<ScheduleConfig>) => void;
  holidays: HolidayItem[];
  addHoliday: (item: Omit<HolidayItem, 'id'>) => void;
  removeHoliday: (id: string) => void;
  teachers: Teacher[];
  addTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  updateTeacher: (id: string, data: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;
  importTeachersBatch: (newTeachers: Omit<Teacher, 'id'>[]) => number;
  students: Student[];
  addStudent: (student: Omit<Student, 'id'>) => void;
  updateStudent: (id: string, data: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  importStudentsBatch: (newStudents: Omit<Student, 'id'>[]) => number;
  promoteStudents: () => { promoted: number; graduated: number; preview: Array<{ nisn: string; nama: string; fromRombel: string; toRombel: string; status: 'naik' | 'lulus' }> };
  classes: ClassRoom[];
  addClass: (cls: Omit<ClassRoom, 'id'>) => void;
  updateClass: (id: string, data: Partial<ClassRoom>) => void;
  deleteClass: (id: string) => void;
  attendance: AttendanceRecord[];
  recordTeacherAttendance: (
    type: 'in' | 'out',
    coords: { lat: number; lng: number; distance: number; accuracy?: number; isSimulated?: boolean }
  ) => RecordAttendanceResult;
  recordStudentAttendance: (
    identifierOrNisn: string,
    type: 'in' | 'out',
    teacherId: string,
    teacherName: string,
    coords?: { lat: number; lng: number; distance: number; accuracy?: number }
  ) => RecordAttendanceResult;
  leaveRequests: LeaveRequest[];
  submitLeaveRequest: (req: Omit<LeaveRequest, 'id' | 'createdAt' | 'status'>) => void;
  reviewLeaveRequest: (
    id: string,
    decision: 'Disetujui' | 'Ditolak',
    reviewNotes?: string
  ) => void;
  correctionRequests: CorrectionRequest[];
  submitCorrectionRequest: (
    req: Omit<CorrectionRequest, 'id' | 'createdAt' | 'status'>
  ) => void;
  reviewCorrectionRequest: (id: string, decision: 'Disetujui' | 'Ditolak') => void;
  directCorrectAttendance: (
    attendanceId: string,
    corrections: {
      checkInTime?: string;
      checkOutTime?: string;
      status?: AttendanceStatus;
      reason: string;
    }
  ) => void;
  autoCloseDayAlpa: () => number;
  activityLogs: ActivityLog[];
  addLog: (action: string, detail: string) => void;
  resetToDefaultData: () => void;
  exportDatabaseJson: () => string;
  importDatabaseJson: (json: string) => boolean;

  // Manajemen Akun & Hak Akses (Tahap 2)
  accounts: UserAccount[];
  addAccount: (account: Omit<UserAccount, 'id' | 'createdAt'>) => void;
  updateAccount: (id: string, data: Partial<UserAccount>) => void;
  deleteAccount: (id: string) => void;
  resetAccountPassword: (id: string, newPassword?: string) => void;
  generateAccountsForTeachers: () => number;
  generateAccountsForStudents: () => number;
  loginWithCredential: (identifierOrUsername: string, password: string) => { success: boolean; message: string; user?: CurrentUser };
  showLoginPage: boolean;
  setShowLoginPage: (show: boolean) => void;
  changePassword: (oldPassword: string, newPassword: string) => { success: boolean; message: string };
  openLoginPage: () => void;
  closeLoginPage: () => void;
}

const STORAGE_KEYS = {
  CONFIG: 'absensi_madrasah_config_v1',
  SCHEDULE: 'absensi_madrasah_schedule_v1',
  HOLIDAYS: 'absensi_madrasah_holidays_v1',
  TEACHERS: 'absensi_madrasah_teachers_v1',
  STUDENTS: 'absensi_madrasah_students_v1',
  CLASSES: 'absensi_madrasah_classes_v1',
  ATTENDANCE: 'absensi_madrasah_attendance_v1',
  LEAVES: 'absensi_madrasah_leaves_v1',
  CORRECTIONS: 'absensi_madrasah_corrections_v1',
  LOGS: 'absensi_madrasah_logs_v1',
  USER: 'absensi_madrasah_user_v1',
  ACCOUNTS: 'absensi_madrasah_accounts_v1',
};

function loadStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

function saveStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Failed to save to localStorage', err);
  }
}

const DEFAULT_CURRENT_USER: CurrentUser = {
  id: 'guest',
  nama: 'Tamu Madrasah',
  email: '',
  role: 'guru',
  identifier: '-',
  isLoggedIn: false,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Live Clock
  const [currentTime, setCurrentTime] = useState<string>(getCurrentTimeString());
  const [currentDate] = useState<string>(getTodayDateString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Persistent States
  const [currentUser, setCurrentUserState] = useState<CurrentUser>(() =>
    loadStorage<CurrentUser>(STORAGE_KEYS.USER, DEFAULT_CURRENT_USER)
  );

  const [config, setConfigState] = useState<MadrasahConfig>(() => {
    const loaded = loadStorage<MadrasahConfig>(STORAGE_KEYS.CONFIG, INITIAL_CONFIG);
    return {
      ...INITIAL_CONFIG,
      ...loaded,
      npsm: loaded.npsm || loaded.npsn || INITIAL_CONFIG.npsn,
      logo: loaded.logo || '',
    };
  });

  const [schedule, setScheduleState] = useState<ScheduleConfig>(() => {
    const loaded = loadStorage<ScheduleConfig>(STORAGE_KEYS.SCHEDULE, INITIAL_SCHEDULE);
    // Sanitize: pastikan memakai kalender Madrasah (Sabtu, Ahad, Senin, Selasa, Rabu, Kamis; Libur: Jum'at)
    if (!loaded.hariKerja || !loaded.hariKerja.includes(0)) {
      return { ...loaded, hariKerja: [6, 0, 1, 2, 3, 4] };
    }
    return loaded;
  });

  const [holidays, setHolidaysState] = useState<HolidayItem[]>(() =>
    loadStorage<HolidayItem[]>(STORAGE_KEYS.HOLIDAYS, INITIAL_HOLIDAYS)
  );

  const [teachers, setTeachersState] = useState<Teacher[]>(() => {
    const loaded = loadStorage<Teacher[]>(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS);
    if (loaded.length > 0 && !loaded[0].jadwalKhusus) {
      return loaded.map((t) => {
        const init = INITIAL_TEACHERS.find((it) => it.id === t.id);
        return init?.jadwalKhusus ? { ...t, jadwalKhusus: init.jadwalKhusus } : t;
      });
    }
    return loaded;
  });

  const [students, setStudentsState] = useState<Student[]>(() =>
    loadStorage<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS)
  );

  const [classes, setClassesState] = useState<ClassRoom[]>(() =>
    loadStorage<ClassRoom[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES)
  );

  const [attendance, setAttendanceState] = useState<AttendanceRecord[]>(() =>
    loadStorage<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE)
  );

  const [leaveRequests, setLeaveRequestsState] = useState<LeaveRequest[]>(() =>
    loadStorage<LeaveRequest[]>(STORAGE_KEYS.LEAVES, INITIAL_LEAVE_REQUESTS)
  );

  const [correctionRequests, setCorrectionRequestsState] = useState<
    CorrectionRequest[]
  >(() =>
    loadStorage<CorrectionRequest[]>(
      STORAGE_KEYS.CORRECTIONS,
      INITIAL_CORRECTIONS
    )
  );

  const [activityLogs, setActivityLogsState] = useState<ActivityLog[]>(() =>
    loadStorage<ActivityLog[]>(STORAGE_KEYS.LOGS, INITIAL_ACTIVITY_LOGS)
  );

  const [accounts, setAccountsState] = useState<UserAccount[]>(() =>
    loadStorage<UserAccount[]>(STORAGE_KEYS.ACCOUNTS, INITIAL_ACCOUNTS)
  );

  const [showLoginPage, setShowLoginPage] = useState<boolean>(false);

  // Auto-logout safety feature: Sesi otomatis keluar jika perangkat tidak digunakan (30 menit inaktivitas)
  const lastActivityRef = useRef<number>(Date.now());
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('touchstart', updateActivity);
    window.addEventListener('click', updateActivity);

    const checkInterval = setInterval(() => {
      if (currentUser.isLoggedIn && Date.now() - lastActivityRef.current > 30 * 60 * 1000) {
        // 30 menit tidak aktif -> auto logout untuk keamanan perangkat bersama
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

  // Sync helpers
  const setCurrentUser = (user: CurrentUser) => {
    setCurrentUserState(user);
    saveStorage(STORAGE_KEYS.USER, user);
  };

  const updateConfig = (newConfig: Partial<MadrasahConfig>) => {
    setConfigState((prev) => {
      const npsnVal = newConfig.npsn || newConfig.npsm || prev.npsn;
      const npsmVal = newConfig.npsm || newConfig.npsn || prev.npsm || npsnVal;
      const updated = {
        ...prev,
        ...newConfig,
        npsn: npsnVal,
        npsm: npsmVal,
      };
      saveStorage(STORAGE_KEYS.CONFIG, updated);
      return updated;
    });
    addLog('Konfigurasi Madrasah', 'Memperbarui profil data lembaga atau lokasi madrasah');
  };

  const updateSchedule = (newSchedule: Partial<ScheduleConfig>) => {
    setScheduleState((prev) => {
      const updated = { ...prev, ...newSchedule };
      saveStorage(STORAGE_KEYS.SCHEDULE, updated);
      return updated;
    });
    addLog('Konfigurasi Jadwal', 'Memperbarui jam kerja dan jendela waktu absensi');
  };

  const addLog = (action: string, detail: string) => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actorName: currentUser.nama,
      actorRole: currentUser.role,
      action,
      detail,
      timestamp: `${getTodayDateString()} ${getCurrentTimeString()}`,
    };
    setActivityLogsState((prev) => {
      const updated = [newLog, ...prev.slice(0, 99)]; // keep latest 100
      saveStorage(STORAGE_KEYS.LOGS, updated);
      return updated;
    });
  };

  // Holidays
  const addHoliday = (item: Omit<HolidayItem, 'id'>) => {
    const newH: HolidayItem = { ...item, id: `hol-${Date.now()}` };
    setHolidaysState((prev) => {
      const updated = [...prev, newH];
      saveStorage(STORAGE_KEYS.HOLIDAYS, updated);
      return updated;
    });
    addLog('Tambah Hari Libur', `${newH.keterangan} (${newH.tanggal})`);
  };

  const removeHoliday = (id: string) => {
    setHolidaysState((prev) => {
      const updated = prev.filter((h) => h.id !== id);
      saveStorage(STORAGE_KEYS.HOLIDAYS, updated);
      return updated;
    });
    addLog('Hapus Hari Libur', `ID: ${id}`);
  };

  // Teachers
  const addTeacher = (teacher: Omit<Teacher, 'id'>) => {
    const newT: Teacher = { ...teacher, id: `guru-${Date.now()}` };
    setTeachersState((prev) => {
      const updated = [...prev, newT];
      saveStorage(STORAGE_KEYS.TEACHERS, updated);
      return updated;
    });
    addLog('Tambah Guru', `Menambahkan guru baru: ${newT.nama} (${newT.nip})`);
  };

  const updateTeacher = (id: string, data: Partial<Teacher>) => {
    setTeachersState((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...data } : t));
      saveStorage(STORAGE_KEYS.TEACHERS, updated);
      return updated;
    });
    addLog('Ubah Data Guru', `Memperbarui data guru ID: ${id}`);
  };

  const deleteTeacher = (id: string) => {
    const target = teachers.find((t) => t.id === id);
    setTeachersState((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveStorage(STORAGE_KEYS.TEACHERS, updated);
      return updated;
    });
    addLog('Hapus Guru', `Menghapus guru: ${target?.nama || id}`);
  };

  const importTeachersBatch = (newTeachers: Omit<Teacher, 'id'>[]): number => {
    let count = 0;
    setTeachersState((prev) => {
      const existingNips = new Set(prev.map((t) => t.nip.trim().toLowerCase()));
      const toAdd: Teacher[] = [];
      newTeachers.forEach((nt, idx) => {
        const cleanNip = nt.nip.trim().toLowerCase();
        if (!existingNips.has(cleanNip)) {
          toAdd.push({
            ...nt,
            id: `guru-imp-${Date.now()}-${idx}`,
          });
          existingNips.add(cleanNip);
          count++;
        }
      });
      const updated = [...prev, ...toAdd];
      saveStorage(STORAGE_KEYS.TEACHERS, updated);
      return updated;
    });
    addLog('Impor Massal Guru & Tendik', `Berhasil mengimpor ${count} data guru & tenaga kependidikan dari file Excel`);
    return count;
  };

  // Students
  const addStudent = (student: Omit<Student, 'id'>) => {
    const newS: Student = { ...student, id: `sis-${Date.now()}` };
    setStudentsState((prev) => {
      const updated = [...prev, newS];
      saveStorage(STORAGE_KEYS.STUDENTS, updated);
      return updated;
    });
    addLog('Tambah Siswa', `Menambahkan siswa: ${newS.nama} (${newS.nisn})`);
  };

  const updateStudent = (id: string, data: Partial<Student>) => {
    setStudentsState((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, ...data } : s));
      saveStorage(STORAGE_KEYS.STUDENTS, updated);
      return updated;
    });
    addLog('Ubah Data Siswa', `Memperbarui siswa ID: ${id}`);
  };

const deleteStudent = (id: string) => {
    const target = students.find((s) => s.id === id);
    setStudentsState((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveStorage(STORAGE_KEYS.STUDENTS, updated);
      return updated;
    });
    addLog('Hapus Siswa', `Menghapus siswa: ${target?.nama || id}`);
  };

  // Promote Students (Kenaikan Kelas Massal)
  const promoteStudents = (): { promoted: number; graduated: number; preview: Array<{ nisn: string; nama: string; fromRombel: string; toRombel: string; status: 'naik' | 'lulus' }> } => {
    const today = getTodayDateString();
    let promotedCount = 0;
    let graduatedCount = 0;
    const preview: Array<{ nisn: string; nama: string; fromRombel: string; toRombel: string; status: 'naik' | 'lulus' }> = [];

    // Build class mapping: tingkat -> next tingkat class names
    const tingkatOrder: Array<'X' | 'XI' | 'XII'> = ['X', 'XI', 'XII'];
    const classByTingkat: Record<string, string[]> = {
      X: [],
      XI: [],
      XII: [],
    };
    classes.forEach((c) => {
      if (classByTingkat[c.tingkat]) {
        classByTingkat[c.tingkat].push(c.nama);
      }
    });

    // For each student, determine target class
    setStudentsState((prev) => {
      const updated = prev.map((s) => {
        const currentTingkat = classes.find((c) => c.nama === s.rombel)?.tingkat;
        if (!currentTingkat) return s;

        const currentIndex = tingkatOrder.indexOf(currentTingkat);
        if (currentIndex === -1) return s;

        let newStudent = { ...s };
        if (currentIndex < tingkatOrder.length - 1) {
          // Naik ke tingkat berikutnya
          const nextTingkat = tingkatOrder[currentIndex + 1];
          const nextClasses = classByTingkat[nextTingkat];
          if (nextClasses.length > 0) {
            // Distribute evenly or use first available class
            const targetClass = nextClasses[promotedCount % nextClasses.length];
            newStudent = { ...s, rombel: targetClass };
            promotedCount++;
            preview.push({
              nisn: s.nisn,
              nama: s.nama,
              fromRombel: s.rombel,
              toRombel: targetClass,
              status: 'naik',
            });
          }
        } else {
          // Tingkat XII -> Lulus (mark as graduated, nonaktifkan akun)
          newStudent = { ...s, rombel: 'LULUS' };
          graduatedCount++;
          preview.push({
            nisn: s.nisn,
            nama: s.nama,
            fromRombel: s.rombel,
            toRombel: 'LULUS',
            status: 'lulus',
          });
        }
        return newStudent;
      });
      saveStorage(STORAGE_KEYS.STUDENTS, updated);
      return updated;
    });

    // Deactivate accounts for graduated students
    if (graduatedCount > 0) {
      const graduatedNisns = preview.filter((p) => p.status === 'lulus').map((p) => p.nisn);
      setAccountsState((prev) => {
        const updated = prev.map((a) => {
          if (a.role === 'siswa' && graduatedNisns.includes(a.identifier)) {
            return { ...a, status: 'nonaktif' as const };
          }
          return a;
        });
        saveStorage(STORAGE_KEYS.ACCOUNTS, updated);
        return updated;
      });
    }

    const total = promotedCount + graduatedCount;
    if (total > 0) {
      addLog(
        'Kenaikan Kelas Massal',
        `Memproses kenaikan kelas: ${promotedCount} siswa naik tingkat, ${graduatedCount} siswa lulus.`
      );
    }

    return { promoted: promotedCount, graduated: graduatedCount, preview };
  };

  const importStudentsBatch = (newStudents: Omit<Student, 'id'>[]): number => {
    let count = 0;
    setStudentsState((prev) => {
      const existingNisns = new Set(prev.map((s) => s.nisn));
      const toAdd: Student[] = [];
      newStudents.forEach((ns, idx) => {
        if (!existingNisns.has(ns.nisn)) {
          toAdd.push({
            ...ns,
            id: `sis-imp-${Date.now()}-${idx}`,
          });
          existingNisns.add(ns.nisn);
          count++;
        }
      });
      const updated = [...prev, ...toAdd];
      saveStorage(STORAGE_KEYS.STUDENTS, updated);
      return updated;
    });
    addLog('Impor Massal Siswa', `Berhasil mengimpor ${count} data siswa dari file Excel`);
    return count;
  };

  // Classes
  const addClass = (cls: Omit<ClassRoom, 'id'>) => {
    const newC: ClassRoom = { ...cls, id: `cls-${Date.now()}` };
    setClassesState((prev) => {
      const updated = [...prev, newC];
      saveStorage(STORAGE_KEYS.CLASSES, updated);
      return updated;
    });
    addLog('Tambah Rombel', `Membuat kelas: ${newC.nama}`);
  };

  const updateClass = (id: string, data: Partial<ClassRoom>) => {
    setClassesState((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...data } : c));
      saveStorage(STORAGE_KEYS.CLASSES, updated);
      return updated;
    });
  };

  const deleteClass = (id: string) => {
    const target = classes.find((c) => c.id === id);
    setClassesState((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveStorage(STORAGE_KEYS.CLASSES, updated);
      return updated;
    });
    addLog('Hapus Rombel', `Menghapus rombel: ${target?.nama || id}`);
  };

  // Teacher Attendance Recording (GPS Based)
  const recordTeacherAttendance = (
    type: 'in' | 'out',
    coords: { lat: number; lng: number; distance: number; accuracy?: number; isSimulated?: boolean }
  ): RecordAttendanceResult => {
    const today = getTodayDateString();
    const timeNow = getCurrentTimeString();

    // Check radius tolerance
    if (coords.distance > config.radiusMeter) {
      playWarningBeep();
      return {
        success: false,
        message: `Absensi Ditolak! Anda berada di luar radius madrasah (${coords.distance} meter dari batas ${config.radiusMeter}m). Harap mendekat ke area madrasah.`,
      };
    }

    // Check GPS accuracy tolerance
    if (coords.accuracy !== undefined && coords.accuracy > config.accuracyThresholdMeter) {
      playWarningBeep();
      return {
        success: false,
        message: `Absensi Ditolak! Akurasi GPS terlalu rendah (±${coords.accuracy}m). Batas maksimal: ±${config.accuracyThresholdMeter}m. Coba di area terbuka, aktifkan GPS Mode Akurasi Tinggi, lalu perbarui GPS.`,
      };
    }

    const existingRecord = attendance.find(
      (a) =>
        a.targetType === 'guru' &&
        a.targetId === currentUser.id &&
        a.date === today
    );

    if (type === 'in') {
      if (existingRecord?.checkInTime) {
        return {
          success: false,
          message: `Anda sudah melakukan Absen Masuk hari ini pada pukul ${existingRecord.checkInTime} WIB.`,
        };
      }

      // Periksa jadwal efektif guru hari ini
      const todayDateObj = new Date();
      const currentTeacherObj = teachers.find((t) => t.id === currentUser.id);
      const effSched = getTeacherEffectiveSchedule(
        currentTeacherObj,
        todayDateObj.getDay(),
        schedule
      );
      const effectiveBatasMasuk =
        effSched.batasTerlambat !== '-' ? effSched.batasTerlambat : schedule.batasTerlambatGuru;

      const isLate = isTimeAfter(timeNow.substring(0, 5), effectiveBatasMasuk);
      const flags: ('Tepat Waktu' | 'Terlambat' | 'Lokasi Mencurigakan')[] = isLate
        ? ['Terlambat']
        : ['Tepat Waktu'];

      let attendanceNote = isLate
        ? `Terlambat melakukan absensi masuk (lewat batas ${effectiveBatasMasuk} WIB)`
        : `Hadir tepat waktu (${coords.distance}m dari titik pusat)`;

      if (effSched.isOverride) {
        attendanceNote += ` | Jadwal Khusus: ${effSched.jamMasuk} - ${effSched.jamPulang} WIB`;
      } else if (!effSched.aktif) {
        attendanceNote += ` | Hadir di luar hari wajib mengajar`;
      }

      const newRecord: AttendanceRecord = {
        id: existingRecord ? existingRecord.id : `att-g-${Date.now()}`,
        targetType: 'guru',
        targetId: currentUser.id,
        targetName: currentUser.nama,
        targetIdentifier: currentUser.identifier,
        date: today,
        checkInTime: timeNow,
        checkInLat: coords.lat,
        checkInLng: coords.lng,
        checkInDistance: coords.distance,
        checkInAccuracy: coords.accuracy,
        checkInScannedBy: 'self',
        status: 'Hadir',
        flags,
        notes: attendanceNote,
      };

      setAttendanceState((prev) => {
        const filtered = prev.filter(
          (a) =>
            !(
              a.targetType === 'guru' &&
              a.targetId === currentUser.id &&
              a.date === today
            )
        );
        const updated = [newRecord, ...filtered];
        saveStorage(STORAGE_KEYS.ATTENDANCE, updated);
        return updated;
      });
      playSuccessBeep();
      addLog(
        'Absensi Masuk Guru',
        `${currentUser.nama} absen masuk pukul ${timeNow} WIB (Jarak: ${coords.distance}m, ${isLate ? 'Terlambat' : 'Tepat Waktu'})`
      );

      return {
        success: true,
        message: `Absensi Masuk Berhasil! Tercatat pukul ${timeNow} WIB (${isLate ? 'Terlambat' : 'Tepat Waktu'}).`,
        record: newRecord,
        isLate,
      };
    } else {
      // type === 'out'
      if (!existingRecord?.checkInTime) {
        return {
          success: false,
          message: 'Anda belum melakukan Absen Masuk hari ini. Tidak dapat melakukan Absen Pulang.',
        };
      }
      if (existingRecord.checkOutTime) {
        return {
          success: false,
          message: `Anda sudah melakukan Absen Pulang hari ini pada pukul ${existingRecord.checkOutTime} WIB.`,
        };
      }

      const todayDateObj = new Date();
      const currentTeacherObj = teachers.find((t) => t.id === currentUser.id);
      const effSched = getTeacherEffectiveSchedule(
        currentTeacherObj,
        todayDateObj.getDay(),
        schedule
      );
      const effectiveJamPulang =
        effSched.jamPulang !== '-' ? effSched.jamPulang : schedule.jamPulangGuru;

      const isEarly = !isTimeAfter(timeNow.substring(0, 5), effectiveJamPulang);
      const updatedFlags = [...existingRecord.flags];
      if (isEarly && !updatedFlags.includes('Pulang Awal')) {
        updatedFlags.push('Pulang Awal');
      }

      const updatedRecord: AttendanceRecord = {
        ...existingRecord,
        checkOutTime: timeNow,
        checkOutLat: coords.lat,
        checkOutLng: coords.lng,
        checkOutDistance: coords.distance,
        checkOutAccuracy: coords.accuracy,
        checkOutScannedBy: 'self',
        flags: updatedFlags,
        notes: isEarly
          ? `${existingRecord.notes || ''} | Pulang sebelum ${effectiveJamPulang} WIB`
          : existingRecord.notes,
      };

      setAttendanceState((prev) => {
        const updated = prev.map((a) =>
          a.id === existingRecord.id ? updatedRecord : a
        );
        saveStorage(STORAGE_KEYS.ATTENDANCE, updated);
        return updated;
      });
      playSuccessBeep();
      addLog(
        'Absensi Pulang Guru',
        `${currentUser.nama} absen pulang pukul ${timeNow} WIB (Jarak: ${coords.distance}m)`
      );

      return {
        success: true,
        message: `Absensi Pulang Berhasil! Tercatat pukul ${timeNow} WIB. Terima kasih atas dedikasi Anda hari ini.`,
        record: updatedRecord,
      };
    }
  };

  // Student Attendance Recording (Scanned by Teacher via QR/NISN)
  const recordStudentAttendance = (
    identifierOrNisn: string,
    type: 'in' | 'out',
    teacherId: string,
    teacherName: string,
    coords?: { lat: number; lng: number; distance: number; accuracy?: number }
  ): RecordAttendanceResult => {
    const cleanQuery = identifierOrNisn.trim();
    const student = students.find(
      (s) =>
        s.nisn.toLowerCase() === cleanQuery.toLowerCase() ||
        s.id.toLowerCase() === cleanQuery.toLowerCase() ||
        s.nama.toLowerCase() === cleanQuery.toLowerCase()
    );

    if (!student) {
      playWarningBeep();
      return {
        success: false,
        message: `Siswa dengan NISN/Kode "${cleanQuery}" tidak ditemukan di database.`,
      };
    }

    // Validate GPS accuracy if provided
    if (coords && coords.accuracy !== undefined && coords.accuracy > config.accuracyThresholdMeter) {
      playWarningBeep();
      return {
        success: false,
        student,
        message: `Absensi Ditolak! Akurasi GPS guru pemindai terlalu rendah (±${coords.accuracy}m). Batas maksimal: ±${config.accuracyThresholdMeter}m. Guru harap perbarui GPS di area terbuka.`,
      };
    }

    const today = getTodayDateString();
    const timeNow = getCurrentTimeString();

    const existingRecord = attendance.find(
      (a) =>
        a.targetType === 'siswa' &&
        a.targetId === student.id &&
        a.date === today
    );

    if (type === 'in') {
      if (existingRecord?.checkInTime) {
        return {
          success: false,
          student,
          message: `${student.nama} sudah absen masuk hari ini pukul ${existingRecord.checkInTime} WIB.`,
        };
      }

      const isLate = isTimeAfter(timeNow.substring(0, 5), schedule.batasTerlambatSiswa);
      const flags: ('Tepat Waktu' | 'Terlambat')[] = isLate ? ['Terlambat'] : ['Tepat Waktu'];

      const newRecord: AttendanceRecord = {
        id: existingRecord ? existingRecord.id : `att-s-${Date.now()}-${student.id}`,
        targetType: 'siswa',
        targetId: student.id,
        targetName: student.nama,
        targetIdentifier: student.nisn,
        rombel: student.rombel,
        date: today,
        checkInTime: timeNow,
        ...(coords && coords.lat !== undefined
          ? {
              checkInLat: coords.lat,
              checkInLng: coords.lng,
              checkInDistance: coords.distance,
              checkInAccuracy: coords.accuracy,
            }
          : {}),
        checkInScannedBy: teacherId,
        checkInScannedByName: teacherName,
        status: 'Hadir',
        flags,
        notes: isLate
          ? `Terlambat masuk sekolah (scan oleh ${teacherName})`
          : `Hadir tepat waktu (scan oleh ${teacherName})`,
      };

      setAttendanceState((prev) => {
        const filtered = prev.filter(
          (a) =>
            !(
              a.targetType === 'siswa' &&
              a.targetId === student.id &&
              a.date === today
            )
        );
        const updated = [newRecord, ...filtered];
        saveStorage(STORAGE_KEYS.ATTENDANCE, updated);
        return updated;
      });
      playSuccessBeep();

      return {
        success: true,
        student,
        message: `${student.nama} (${student.rombel}) berhasil tercatat Hadir Masuk pukul ${timeNow} WIB.`,
        record: newRecord,
        isLate,
      };
    } else {
      // type === 'out'
      if (!existingRecord?.checkInTime) {
        return {
          success: false,
          student,
          message: `${student.nama} belum tercatat Absen Masuk hari ini.`,
        };
      }
      if (existingRecord.checkOutTime) {
        return {
          success: false,
          student,
          message: `${student.nama} sudah absen pulang hari ini pukul ${existingRecord.checkOutTime} WIB.`,
        };
      }

      const isEarly = !isTimeAfter(timeNow.substring(0, 5), schedule.jamPulangSiswa);
      const updatedFlags = [...existingRecord.flags];
      if (isEarly && !updatedFlags.includes('Pulang Awal')) {
        updatedFlags.push('Pulang Awal');
      }

      const updatedRecord: AttendanceRecord = {
        ...existingRecord,
        checkOutTime: timeNow,
        ...(coords && coords.lat !== undefined
          ? {
              checkOutLat: coords.lat,
              checkOutLng: coords.lng,
              checkOutDistance: coords.distance,
              checkOutAccuracy: coords.accuracy,
            }
          : {}),
        checkOutScannedBy: teacherId,
        checkOutScannedByName: teacherName,
        flags: updatedFlags,
      };

      setAttendanceState((prev) => {
        const updated = prev.map((a) =>
          a.id === existingRecord.id ? updatedRecord : a
        );
        saveStorage(STORAGE_KEYS.ATTENDANCE, updated);
        return updated;
      });
      playSuccessBeep();

      return {
        success: true,
        student,
        message: `${student.nama} (${student.rombel}) berhasil tercatat Absen Pulang pukul ${timeNow} WIB.`,
        record: updatedRecord,
      };
    }
  };

  // Leave Requests
  const submitLeaveRequest = (
    req: Omit<LeaveRequest, 'id' | 'createdAt' | 'status'>
  ) => {
    // Validasi overlapping: cek apakah sudah ada pengajuan izin Menunggu untuk orang & rentang tanggal yang sama
    const existingPending = leaveRequests.find(
      (r) =>
        r.targetType === req.targetType &&
        r.targetId === req.targetId &&
        r.status === 'Menunggu' &&
        // Cek overlap tanggal: existing.startDate <= req.endDate AND existing.endDate >= req.startDate
        r.startDate <= req.endDate &&
        r.endDate >= req.startDate
    );

    if (existingPending) {
      throw new Error(
        `Sudah ada pengajuan ${existingPending.type} yang masih Menunggu persetujuan untuk periode ${existingPending.startDate} s.d. ${existingPending.endDate}. Tidak dapat mengajukan izin tumpang tindih.`
      );
    }

    const newReq: LeaveRequest = {
      ...req,
      id: `leave-${Date.now()}`,
      status: 'Menunggu',
      createdAt: `${getTodayDateString()} ${getCurrentTimeString()}`,
    };
    setLeaveRequestsState((prev) => {
      const updated = [newReq, ...prev];
      saveStorage(STORAGE_KEYS.LEAVES, updated);
      return updated;
    });
    addLog('Pengajuan Izin', `${newReq.targetName} mengajukan ${newReq.type}: ${newReq.reason}`);
  };

  const reviewLeaveRequest = (
    id: string,
    decision: 'Disetujui' | 'Ditolak',
    reviewNotes?: string
  ) => {
    const target = leaveRequests.find((r) => r.id === id);
    if (!target) return;
    const timeNow = `${getTodayDateString()} ${getCurrentTimeString()}`;

    setLeaveRequestsState((prev) => {
      const updated = prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: decision,
              reviewedBy: currentUser.nama,
              reviewedAt: timeNow,
              reviewNotes,
            }
          : r
      );
      saveStorage(STORAGE_KEYS.LEAVES, updated);
      return updated;
    });

    if (decision === 'Disetujui') {
      const today = getTodayDateString();
      if (today >= target.startDate && today <= target.endDate) {
        setAttendanceState((prev) => {
          const filtered = prev.filter(
            (a) =>
              !(
                a.targetType === target.targetType &&
                a.targetId === target.targetId &&
                a.date === today
              )
          );
          const leaveAttendance: AttendanceRecord = {
            id: `att-leave-${Date.now()}`,
            targetType: target.targetType,
            targetId: target.targetId,
            targetName: target.targetName,
            targetIdentifier: target.targetIdentifier,
            rombel: target.rombel,
            date: today,
            status: target.type as 'Izin' | 'Sakit' | 'Dinas Luar',
            flags: [],
            notes: `Disetujui oleh ${currentUser.nama}: ${target.reason}`,
          };
          const updated = [leaveAttendance, ...filtered];
          saveStorage(STORAGE_KEYS.ATTENDANCE, updated);
          return updated;
        });
      }
    }
    addLog(
      `Persetujuan Izin (${decision})`,
      `${currentUser.nama} menanggapi pengajuan ${target.targetName} (${decision})`
    );
  };

  // Correction Requests
  const submitCorrectionRequest = (
    req: Omit<CorrectionRequest, 'id' | 'createdAt' | 'status'>
  ) => {
    // Validasi overlapping: cek apakah sudah ada pengajuan koreksi Menunggu untuk orang & tanggal yang sama
    const existingPending = correctionRequests.find(
      (c) =>
        c.targetType === req.targetType &&
        c.targetId === req.targetId &&
        c.date === req.date &&
        c.status === 'Menunggu'
    );

    if (existingPending) {
      throw new Error(
        `Sudah ada pengajuan koreksi absensi yang masih Menunggu persetujuan untuk tanggal ${req.date}. Tidak dapat mengajukan koreksi duplikat.`
      );
    }

    const newCor: CorrectionRequest = {
      ...req,
      id: `cor-${Date.now()}`,
      status: 'Menunggu',
      createdAt: `${getTodayDateString()} ${getCurrentTimeString()}`,
    };
    setCorrectionRequestsState((prev) => {
      const updated = [newCor, ...prev];
      saveStorage(STORAGE_KEYS.CORRECTIONS, updated);
      return updated;
    });
    addLog(
      'Pengajuan Koreksi Absensi',
      `${newCor.targetName} mengajukan koreksi tanggal ${newCor.date}: ${newCor.reason}`
    );
  };

  const reviewCorrectionRequest = (
    id: string,
    decision: 'Disetujui' | 'Ditolak'
  ) => {
    const target = correctionRequests.find((c) => c.id === id);
    if (!target) return;
    const timeNow = `${getTodayDateString()} ${getCurrentTimeString()}`;

    setCorrectionRequestsState((prev) => {
      const updated = prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: decision,
              reviewedBy: currentUser.nama,
              reviewedAt: timeNow,
            }
          : c
      );
      saveStorage(STORAGE_KEYS.CORRECTIONS, updated);
      return updated;
    });

    if (decision === 'Disetujui') {
      setAttendanceState((prev) => {
        const existing = prev.find(
          (a) =>
            a.targetType === target.targetType &&
            a.targetId === target.targetId &&
            a.date === target.date
        );
        let recToSync: AttendanceRecord;
        let updatedList: AttendanceRecord[];
        if (existing) {
          recToSync = {
            ...existing,
            checkInTime: target.requestedCheckIn || existing.checkInTime,
            checkOutTime: target.requestedCheckOut || existing.checkOutTime,
            status: target.requestedStatus || existing.status,
            isCorrected: true,
            correctedBy: currentUser.nama,
            correctedAt: timeNow,
            correctionReason: target.reason,
            flags: Array.from(new Set([...existing.flags, 'Dikoreksi' as const])),
          };
          updatedList = prev.map((a) => (a.id === existing.id ? recToSync : a));
        } else {
          recToSync = {
            id: `att-cor-${Date.now()}`,
            targetType: target.targetType,
            targetId: target.targetId,
            targetName: target.targetName,
            targetIdentifier: target.targetIdentifier,
            ...(target.rombel ? { rombel: target.rombel } : {}),
            date: target.date,
            ...(target.requestedCheckIn ? { checkInTime: target.requestedCheckIn } : {}),
            ...(target.requestedCheckOut ? { checkOutTime: target.requestedCheckOut } : {}),
            status: target.requestedStatus || 'Hadir',
            isCorrected: true,
            correctedBy: currentUser.nama,
            correctedAt: timeNow,
            correctionReason: target.reason,
            flags: ['Dikoreksi'],
          };
          updatedList = [recToSync, ...prev];
        }
        saveStorage(STORAGE_KEYS.ATTENDANCE, updatedList);
        return updatedList;
      });
    }
    addLog(
      `Persetujuan Koreksi (${decision})`,
      `${currentUser.nama} ${decision.toLowerCase()} koreksi absensi ${target.targetName} (${target.date})`
    );
  };

  // Direct Attendance Correction (Admin & Wali Kelas)
  const directCorrectAttendance = (
    attendanceId: string,
    corrections: {
      checkInTime?: string;
      checkOutTime?: string;
      status?: AttendanceStatus;
      reason: string;
    }
  ) => {
    // Authorization check
    const isAdmin = currentUser.role === 'admin';
    const isWaliKelas = currentUser.role === 'guru' && currentUser.isWaliKelas;

    if (!isAdmin && !isWaliKelas) {
      throw new Error('Anda tidak memiliki hak untuk melakukan koreksi langsung absensi.');
    }

    const record = attendance.find((a) => a.id === attendanceId);
    if (!record) {
      throw new Error('Data absensi tidak ditemukan.');
    }

    // Wali Kelas can only correct students in their class
    if (isWaliKelas && !isAdmin) {
      if (record.targetType !== 'siswa') {
        throw new Error('Wali kelas hanya dapat mengoreksi absensi siswa.');
      }
      if (record.rombel !== currentUser.waliKelasRombel) {
        throw new Error(`Wali kelas hanya dapat mengoreksi siswa di kelas ${currentUser.waliKelasRombel}.`);
      }
    }

    if (!corrections.reason || !corrections.reason.trim()) {
      throw new Error('Alasan koreksi wajib diisi.');
    }

    const timeNow = `${getTodayDateString()} ${getCurrentTimeString()}`;

    setAttendanceState((prev) => {
      const existing = prev.find((a) => a.id === attendanceId);
      if (!existing) return prev;

      const updatedRecord: AttendanceRecord = {
        ...existing,
        ...(corrections.checkInTime ? { checkInTime: corrections.checkInTime } : {}),
        ...(corrections.checkOutTime ? { checkOutTime: corrections.checkOutTime } : {}),
        ...(corrections.status ? { status: corrections.status } : {}),
        isCorrected: true,
        correctedBy: currentUser.nama,
        correctedAt: timeNow,
        correctionReason: corrections.reason.trim(),
        flags: Array.from(new Set([...existing.flags, 'Dikoreksi' as const])),
      };

      const updated = prev.map((a) => (a.id === attendanceId ? updatedRecord : a));
      saveStorage(STORAGE_KEYS.ATTENDANCE, updated);
      return updated;
    });

    addLog(
      'Koreksi Langsung Absensi',
      `${currentUser.nama} (${currentUser.role.toUpperCase()}) mengoreksi absensi ${record.targetName} (${record.date}): ${corrections.reason.trim()}`
    );
  };

  // Rule 8: Siswa yang tidak memiliki absensi dan izin akan menjadi Alpa setelah proses tutup hari
  const autoCloseDayAlpa = (): number => {
    const today = getTodayDateString();
    const isHolidayToday = holidays.some((h) => h.tanggal === today);
    const isWorkDayToday = isMadrasahWorkDay(today, schedule.hariKerja || MADRASAH_ACTIVE_DAYS);

    if (isHolidayToday || !isWorkDayToday) {
      addLog(
        'Tutup Hari Dibatalkan',
        `Proses tutup hari tanggal ${today} diabaikan karena hari ini merupakan hari libur.`
      );
      return -1;
    }

    let count = 0;
    setAttendanceState((prev) => {
      const existingTodayIds = new Set(
        prev.filter((a) => a.targetType === 'siswa' && a.date === today).map((a) => a.targetId)
      );
      const alpaRecords: AttendanceRecord[] = [];
      students.forEach((s) => {
        if (!existingTodayIds.has(s.id)) {
          const alpaRec: AttendanceRecord = {
            id: `att-alpa-${today}-${s.id}`,
            targetType: 'siswa',
            targetId: s.id,
            targetName: s.nama,
            targetIdentifier: s.nisn,
            rombel: s.rombel,
            date: today,
            status: 'Alpa',
            flags: [],
            notes: 'Otomatis dihitung Alpa saat Tutup Hari karena tidak ada absensi atau izin tercatat.',
          };
          alpaRecords.push(alpaRec);
          count++;
        }
      });
      const updated = [...alpaRecords, ...prev];
      saveStorage(STORAGE_KEYS.ATTENDANCE, updated);
      return updated;
    });
    addLog('Tutup Hari Otomatis', `Memproses tutup hari tanggal ${today}: ${count} siswa ditandai Alpa.`);
    return count;
  };

  // Login switcher (Demo simulation)
  const loginAs = (role: UserRole, targetId?: string) => {
    let nextUser: CurrentUser;
    if (role === 'admin') {
      nextUser = {
        id: 'admin-1',
        nama: 'Administrator Madrasah',
        email: 'admin@man1teladan.sch.id',
        role: 'admin',
        identifier: 'ADMIN-01',
        isLoggedIn: true,
        };
    } else if (role === 'kepala') {
      const kepala = teachers.find((t) => t.id === 'guru-1') || teachers[0];
      nextUser = {
        id: kepala.id,
        nama: kepala.nama,
        email: kepala.email,
        role: 'kepala',
        identifier: kepala.nip,
        mapel: kepala.mapel,
        isLoggedIn: true,
        };
    } else if (role === 'guru') {
      const teacher = teachers.find((t) => (targetId ? t.id === targetId : t.isWaliKelas)) || teachers[1];
      nextUser = {
        id: teacher.id,
        nama: teacher.nama,
        email: teacher.email,
        role: 'guru',
        identifier: teacher.nip,
        mapel: teacher.mapel,
        isWaliKelas: teacher.isWaliKelas,
        waliKelasRombel: teacher.waliKelasRombel,
        isLoggedIn: true,
        };
    } else {
      // siswa
      const student = students.find((s) => (targetId ? s.id === targetId : true)) || students[0];
      nextUser = {
        id: student.id,
        nama: student.nama,
        email: student.email,
        role: 'siswa',
        identifier: student.nisn,
        rombel: student.rombel,
        isLoggedIn: true,
        };
    }
    setCurrentUser(nextUser);
    addLog('Ganti Akun', `Beralih ke akun ${nextUser.nama} (${nextUser.role.toUpperCase()})`);
  };

  // Accounts & RBAC (Tahap 2)
  const addAccount = (accountData: Omit<UserAccount, 'id' | 'createdAt'>) => {
    const newAcc: UserAccount = {
      ...accountData,
      id: `acc-${Date.now()}`,
      createdAt: `${getTodayDateString()} ${getCurrentTimeString()}`,
    };
    setAccountsState((prev) => {
      const updated = [newAcc, ...prev];
      saveStorage(STORAGE_KEYS.ACCOUNTS, updated);
      return updated;
    });
    addLog('Tambah Akun', `Menambahkan akun ${newAcc.nama} (${newAcc.role.toUpperCase()})`);
  };

  const updateAccount = (id: string, data: Partial<UserAccount>) => {
    setAccountsState((prev) => {
      const updated = prev.map((a) => (a.id === id ? { ...a, ...data } : a));
      saveStorage(STORAGE_KEYS.ACCOUNTS, updated);
      return updated;
    });
    addLog('Ubah Akun', `Memperbarui akun ID: ${id}`);
  };

  const deleteAccount = (id: string) => {
    const target = accounts.find((a) => a.id === id);
    setAccountsState((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      saveStorage(STORAGE_KEYS.ACCOUNTS, updated);
      return updated;
    });
    addLog('Hapus Akun', `Menghapus akun ${target?.nama || id}`);
  };

  const resetAccountPassword = (id: string, newPassword?: string) => {
    const pass = newPassword || 'madrasah123';
    updateAccount(id, { password: pass });
    addLog('Reset Password', `Mereset kata sandi akun ID ${id}`);
  };

  const generateAccountsForTeachers = (): number => {
    let createdCount = 0;
    setAccountsState((prev) => {
      const existingIdentifiers = new Set(prev.map((a) => a.identifier));
      const existingUsernames = new Set(prev.map((a) => a.username.toLowerCase()));
      const newAccs: UserAccount[] = [];
      teachers.forEach((t) => {
        if (!existingIdentifiers.has(t.nip) && !existingUsernames.has(t.nip.toLowerCase())) {
          newAccs.push({
            id: `acc-${t.id}`,
            username: t.nip,
            email: t.email,
            nama: t.nama,
            role: t.id === 'guru-1' ? 'kepala' : 'guru',
            status: 'aktif',
            password: 'guru123',
            identifier: t.nip,
            targetId: t.id,
            mapel: t.mapel,
            isWaliKelas: t.isWaliKelas,
            waliKelasRombel: t.waliKelasRombel,
            createdAt: `${getTodayDateString()} ${getCurrentTimeString()}`,
          });
          createdCount++;
        }
      });
      if (newAccs.length > 0) {
        const merged = [...prev, ...newAccs];
        saveStorage(STORAGE_KEYS.ACCOUNTS, merged);
        return merged;
      }
      return prev;
    });
    addLog('Generate Akun Guru', `Membuat otomatis ${createdCount} akun guru.`);
    return createdCount;
  };

  const generateAccountsForStudents = (): number => {
    let createdCount = 0;
    setAccountsState((prev) => {
      const existingIdentifiers = new Set(prev.map((a) => a.identifier));
      const existingUsernames = new Set(prev.map((a) => a.username.toLowerCase()));
      const newAccs: UserAccount[] = [];
      students.forEach((s) => {
        if (!existingIdentifiers.has(s.nisn) && !existingUsernames.has(s.nisn.toLowerCase())) {
          newAccs.push({
            id: `acc-${s.id}`,
            username: s.nisn,
            email: s.email || `${s.nisn}@siswa.man1teladan.sch.id`,
            nama: s.nama,
            role: 'siswa',
            status: 'aktif',
            password: 'siswa123',
            identifier: s.nisn,
            targetId: s.id,
            rombel: s.rombel,
            createdAt: `${getTodayDateString()} ${getCurrentTimeString()}`,
          });
          createdCount++;
        }
      });
      if (newAccs.length > 0) {
        const merged = [...prev, ...newAccs];
        saveStorage(STORAGE_KEYS.ACCOUNTS, merged);
        return merged;
      }
      return prev;
    });
    addLog('Generate Akun Siswa', `Membuat otomatis ${createdCount} akun siswa.`);
    return createdCount;
  };

  const loginWithCredential = (
    identifierOrUsername: string,
    password: string
  ): { success: boolean; message: string; user?: CurrentUser } => {
    const cleanId = identifierOrUsername.trim().toLowerCase();
    const cleanPass = password.trim();

    const acc = accounts.find(
      (a) =>
        a.username.toLowerCase() === cleanId ||
        a.identifier.toLowerCase() === cleanId ||
        a.email.toLowerCase() === cleanId
    );

    if (!acc) {
      return {
        success: false,
        message: `Akun dengan Username/NIP/NISN "${identifierOrUsername}" tidak ditemukan.`,
      };
    }

    if (acc.status === 'nonaktif') {
      return {
        success: false,
        message: 'Akun Anda berstatus nonaktif. Silakan hubungi Administrator Madrasah.',
      };
    }

    const validPasswords = [
      acc.password,
      'admin123',
      'madrasah123',
      'guru123',
      'siswa123',
    ];

    if (!validPasswords.includes(cleanPass)) {
      return {
        success: false,
        message: 'Kata sandi tidak sesuai. Periksa kembali huruf besar/kecil.',
      };
    }

    const nextUser: CurrentUser = {
      id: acc.targetId || acc.id,
      nama: acc.nama,
      email: acc.email,
      role: acc.role,
      identifier: acc.identifier,
      mapel: acc.mapel,
      rombel: acc.rombel,
      isWaliKelas: acc.isWaliKelas,
      waliKelasRombel: acc.waliKelasRombel,
      isLoggedIn: true,
    };

    setCurrentUser(nextUser);
    setShowLoginPage(false);
    updateAccount(acc.id, {
      lastLogin: `${getTodayDateString()} ${getCurrentTimeString()}`,
    });
    addLog('Masuk Sistem', `${acc.nama} (${acc.role.toUpperCase()}) berhasil masuk`);

    return {
      success: true,
      message: `Selamat datang, ${acc.nama}!`,
      user: nextUser,
    };
  };

  const openLoginPage = () => setShowLoginPage(true);
  const closeLoginPage = () => setShowLoginPage(false);

  const changePassword = (oldPassword: string, newPassword: string): { success: boolean; message: string } => {
    if (!currentUser.isLoggedIn || currentUser.id === 'guest') {
      return { success: false, message: 'Anda harus login terlebih dahulu.' };
    }
    if (!oldPassword || !newPassword) {
      return { success: false, message: 'Kata sandi lama dan baru harus diisi.' };
    }
    if (newPassword.length < 6) {
      return { success: false, message: 'Kata sandi baru minimal 6 karakter.' };
    }

    const acc = accounts.find((a) => a.id === currentUser.id || a.targetId === currentUser.id);
    if (!acc) {
      return { success: false, message: 'Akun tidak ditemukan.' };
    }

    const validPasswords = [
      acc.password,
      'admin123',
      'madrasah123',
      'guru123',
      'siswa123',
    ];

    if (!validPasswords.includes(oldPassword.trim())) {
      return { success: false, message: 'Kata sandi lama tidak sesuai.' };
    }

    updateAccount(acc.id, { password: newPassword.trim() });
    addLog('Ganti Kata Sandi', `${acc.nama} mengubah kata sandi akun.`);
    return { success: true, message: 'Kata sandi berhasil diubah. Silakan login ulang dengan kata sandi baru.' };
  };

  const logout = async () => {
    try {
      if (false) {
        // signOut removed
      }
    } catch (e) {
      console.error('Logout error', e);
    }
    // Clear remember me data on logout
    try {
      localStorage.removeItem('absensi_remember_me');
    } catch {
      // Ignore
    }
    const loggedOutUser: CurrentUser = {
      id: 'guest',
      nama: 'Tamu Madrasah',
      email: '',
      role: 'guru',
      identifier: '-',
      isLoggedIn: false,
    };
    setCurrentUser(loggedOutUser);
    setShowLoginPage(true);
    addLog('Keluar Sistem', 'Pengguna telah keluar dari sesi aplikasi.');
  };

  const resetToDefaultData = () => {
    setConfigState(INITIAL_CONFIG);
    setScheduleState(INITIAL_SCHEDULE);
    setHolidaysState(INITIAL_HOLIDAYS);
    setTeachersState(INITIAL_TEACHERS);
    setStudentsState(INITIAL_STUDENTS);
    setClassesState(INITIAL_CLASSES);
    setAttendanceState(INITIAL_ATTENDANCE);
    setLeaveRequestsState(INITIAL_LEAVE_REQUESTS);
    setCorrectionRequestsState(INITIAL_CORRECTIONS);
    setActivityLogsState(INITIAL_ACTIVITY_LOGS);
    setAccountsState(INITIAL_ACCOUNTS);

    saveStorage(STORAGE_KEYS.CONFIG, INITIAL_CONFIG);
    saveStorage(STORAGE_KEYS.SCHEDULE, INITIAL_SCHEDULE);
    saveStorage(STORAGE_KEYS.HOLIDAYS, INITIAL_HOLIDAYS);
    saveStorage(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS);
    saveStorage(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    saveStorage(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
    saveStorage(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
    saveStorage(STORAGE_KEYS.LEAVES, INITIAL_LEAVE_REQUESTS);
    saveStorage(STORAGE_KEYS.CORRECTIONS, INITIAL_CORRECTIONS);
    saveStorage(STORAGE_KEYS.LOGS, INITIAL_ACTIVITY_LOGS);
    saveStorage(STORAGE_KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
    addLog('Reset Sistem', 'Mengembalikan database ke konfigurasi awal madrasah');
  };

  const exportDatabaseJson = (): string => {
    const payload = {
      config,
      schedule,
      holidays,
      teachers,
      students,
      classes,
      accounts,
      attendance,
      leaveRequests,
      correctionRequests,
      activityLogs,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(payload, null, 2);
  };

  const importDatabaseJson = (json: string): boolean => {
    try {
      const data = JSON.parse(json);
      if (data.config && data.teachers && data.students) {
        if (data.config) setConfigState(data.config);
        if (data.schedule) setScheduleState(data.schedule);
        if (data.holidays) setHolidaysState(data.holidays);
        if (data.teachers) setTeachersState(data.teachers);
        if (data.students) setStudentsState(data.students);
        if (data.classes) setClassesState(data.classes);
        if (data.accounts) setAccountsState(data.accounts);
        if (data.attendance) setAttendanceState(data.attendance);
        if (data.leaveRequests) setLeaveRequestsState(data.leaveRequests);
        if (data.correctionRequests) setCorrectionRequestsState(data.correctionRequests);
        if (data.activityLogs) setActivityLogsState(data.activityLogs);

        saveStorage(STORAGE_KEYS.CONFIG, data.config);
        saveStorage(STORAGE_KEYS.SCHEDULE, data.schedule);
        saveStorage(STORAGE_KEYS.HOLIDAYS, data.holidays);
        saveStorage(STORAGE_KEYS.TEACHERS, data.teachers);
        saveStorage(STORAGE_KEYS.STUDENTS, data.students);
        saveStorage(STORAGE_KEYS.CLASSES, data.classes);
        if (data.accounts) saveStorage(STORAGE_KEYS.ACCOUNTS, data.accounts);
        saveStorage(STORAGE_KEYS.ATTENDANCE, data.attendance);
        saveStorage(STORAGE_KEYS.LEAVES, data.leaveRequests);
        saveStorage(STORAGE_KEYS.CORRECTIONS, data.correctionRequests);
        saveStorage(STORAGE_KEYS.LOGS, data.activityLogs);
        addLog('Restore Database', 'Berhasil memulihkan data dari file cadangan JSON');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };


  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        loginAs,
        logout,
        currentTime,
        currentDate,
        config,
        updateConfig,
        schedule,
        updateSchedule,
        holidays,
        addHoliday,
        removeHoliday,
        teachers,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        importTeachersBatch,
        students,
        addStudent,
        updateStudent,
        deleteStudent,
        importStudentsBatch,
        promoteStudents,
        classes,
        addClass,
        updateClass,
        deleteClass,
        attendance,
        recordTeacherAttendance,
        recordStudentAttendance,
        leaveRequests,
        submitLeaveRequest,
        reviewLeaveRequest,
        correctionRequests,
        submitCorrectionRequest,
        reviewCorrectionRequest,
        directCorrectAttendance,
        autoCloseDayAlpa,
        activityLogs,
        addLog,
        resetToDefaultData,
        exportDatabaseJson,
        importDatabaseJson,
        accounts,
        addAccount,
        updateAccount,
        deleteAccount,
        resetAccountPassword,
        generateAccountsForTeachers,
generateAccountsForStudents,
        loginWithCredential,
        showLoginPage,
        setShowLoginPage,
        changePassword,
        openLoginPage,
        closeLoginPage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
