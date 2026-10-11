import { supabase } from '../supabase/client';
import type {
  MadrasahConfig,
  ScheduleConfig,
  Holiday,
  Teacher,
  Student,
  ClassRoom,
  AttendanceRecord,
  LeaveRequest,
  CorrectionRequest,
  ActivityLog,
  UserAccount,
  CurrentUser,
  RecordAttendanceResult,
  PromoteResult,
  LoginResult,
  ChangePasswordResult,
} from '../../types';

class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function apiRequest<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const responseText = response.status === 204 ? '' : await response.text();
  let result: { error?: string; code?: string } | T | null = null;
  if (responseText) {
    try {
      result = JSON.parse(responseText) as { error?: string; code?: string } | T;
    } catch {
      result = null;
    }
  }
  if (!response.ok) {
    const failure = result && typeof result === 'object' && 'error' in result ? result : null;
    const message = failure?.error || `Request failed with status ${response.status}`;
    console.error('api.mutation_failed', {
      path,
      method,
      status: response.status,
      code: failure?.code,
      message,
    });
    throw new ApiRequestError(message, response.status);
  }
  return result as T;
}

async function apiRead<T>(path: string, unauthenticatedValue: T): Promise<T> {
  try {
    return await apiRequest<T>(path, 'GET');
  } catch (error) {
    if (error instanceof ApiRequestError && [401, 403].includes(error.status)) {
      return unauthenticatedValue;
    }
    throw error;
  }
}

function withId(path: string, id: string): string {
  return `${path}${path.includes('?') ? '&' : '?'}id=${encodeURIComponent(id)}`;
}

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function getCurrentTimeString(): string {
  return new Date().toTimeString().split(' ')[0];
}

export async function getConfig(): Promise<MadrasahConfig | null> {
  const { data, error } = await supabase.from('madrasah_config').select('*').single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateConfig(config: Partial<MadrasahConfig>): Promise<MadrasahConfig> {
  return apiRequest('/api/config?type=madrasah', 'PUT', config);
}

export async function getSchedule(): Promise<ScheduleConfig | null> {
  const { data, error } = await supabase.from('schedule_config').select('*').single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateSchedule(schedule: Partial<ScheduleConfig>): Promise<ScheduleConfig> {
  return apiRequest('/api/config?type=schedule', 'PUT', schedule);
}

export async function getHolidays(): Promise<Holiday[]> {
  const { data, error } = await supabase.from('holidays').select('*').order('tanggal', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addHoliday(holiday: Omit<Holiday, 'id' | 'created_at'>): Promise<Holiday> {
  return apiRequest('/api/config?type=holidays', 'POST', holiday);
}

export async function removeHoliday(id: string): Promise<void> {
  await apiRequest<void>(withId('/api/config?type=holidays', id), 'DELETE');
}

export async function getTeachers(): Promise<Teacher[]> {
  const { data, error } = await supabase.from('teachers').select('*').order('nama', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addTeacher(teacher: Omit<Teacher, 'id' | 'created_at' | 'updated_at'>): Promise<Teacher> {
  return apiRequest('/api/teachers', 'POST', teacher);
}

export async function updateTeacher(id: string, updates: Partial<Teacher>): Promise<Teacher> {
  return apiRequest(withId('/api/teachers', id), 'PATCH', updates);
}

export async function deleteTeacher(id: string): Promise<void> {
  await apiRequest<void>(withId('/api/teachers', id), 'DELETE');
}

export async function importTeachersBatch(teachers: Omit<Teacher, 'id' | 'created_at' | 'updated_at'>[]): Promise<number> {
  const data = await apiRequest<Teacher[]>('/api/teachers', 'POST', teachers);
  return data?.length || 0;
}

export async function getStudents(): Promise<Student[]> {
  const { data, error } = await supabase.from('students').select('*').order('nama', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addStudent(student: Omit<Student, 'id' | 'created_at' | 'updated_at'>): Promise<Student> {
  return apiRequest('/api/students', 'POST', student);
}

export async function updateStudent(id: string, updates: Partial<Student>): Promise<Student> {
  return apiRequest(withId('/api/students', id), 'PATCH', updates);
}

export async function deleteStudent(id: string): Promise<void> {
  await apiRequest<void>(withId('/api/students', id), 'DELETE');
}

export async function importStudentsBatch(students: Omit<Student, 'id' | 'created_at' | 'updated_at'>[]): Promise<number> {
  const data = await apiRequest<Student[]>('/api/students', 'POST', students);
  return data?.length || 0;
}

export async function getClasses(): Promise<ClassRoom[]> {
  const { data, error } = await supabase.from('classes').select('*').order('nama', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addClass(cls: Omit<ClassRoom, 'id' | 'created_at' | 'updated_at'>): Promise<ClassRoom> {
  return apiRequest('/api/classes', 'POST', cls);
}

export async function updateClass(id: string, updates: Partial<ClassRoom>): Promise<ClassRoom> {
  return apiRequest(withId('/api/classes', id), 'PATCH', updates);
}

export async function deleteClass(id: string): Promise<void> {
  await apiRequest<void>(withId('/api/classes', id), 'DELETE');
}

export async function getAttendance(filters?: {
  target_type?: 'guru' | 'siswa';
  target_id?: string;
  date?: string;
  rombel?: string;
}): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams();
  if (filters?.target_type) params.set('target_type', filters.target_type);
  if (filters?.target_id) params.set('target_id', filters.target_id);
  if (filters?.date) params.set('date', filters.date);
  if (filters?.rombel) params.set('rombel', filters.rombel);
  const suffix = params.size ? `?${params.toString()}` : '';
  return apiRead(`/api/attendance${suffix}`, []);
}

export async function recordAttendance(record: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'>): Promise<AttendanceRecord> {
  return apiRequest('/api/attendance', 'POST', record);
}

export async function getLeaveRequests(filters?: {
  target_type?: 'guru' | 'siswa';
  target_id?: string;
  status?: string;
}): Promise<LeaveRequest[]> {
  const params = new URLSearchParams();
  if (filters?.target_type) params.set('target_type', filters.target_type);
  if (filters?.target_id) params.set('target_id', filters.target_id);
  if (filters?.status) params.set('status', filters.status);
  const suffix = params.size ? `?${params.toString()}` : '';
  return apiRead(`/api/leaves${suffix}`, []);
}

export async function submitLeaveRequest(request: Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at'>): Promise<LeaveRequest> {
  return apiRequest('/api/leaves', 'POST', request);
}

export async function reviewLeaveRequest(id: string, decision: 'Disetujui' | 'Ditolak', reviewerId: string, reviewNotes?: string): Promise<LeaveRequest> {
  return apiRequest(withId('/api/leaves', id), 'PATCH', { decision, reviewer_id: reviewerId, review_notes: reviewNotes });
}

export async function getCorrectionRequests(filters?: {
  target_type?: 'guru' | 'siswa';
  target_id?: string;
  status?: string;
}): Promise<CorrectionRequest[]> {
  const params = new URLSearchParams();
  if (filters?.target_type) params.set('target_type', filters.target_type);
  if (filters?.target_id) params.set('target_id', filters.target_id);
  if (filters?.status) params.set('status', filters.status);
  const suffix = params.size ? `?${params.toString()}` : '';
  return apiRead(`/api/corrections${suffix}`, []);
}

export async function submitCorrectionRequest(request: Omit<CorrectionRequest, 'id' | 'created_at' | 'updated_at'>): Promise<CorrectionRequest> {
  return apiRequest('/api/corrections', 'POST', request);
}

export async function reviewCorrectionRequest(id: string, decision: 'Disetujui' | 'Ditolak', reviewerId: string): Promise<CorrectionRequest> {
  return apiRequest(withId('/api/corrections', id), 'PATCH', { decision, reviewer_id: reviewerId });
}

export async function getActivityLogs(limit = 100): Promise<ActivityLog[]> {
  return apiRead(`/api/logs?limit=${encodeURIComponent(String(limit))}`, []);
}

export async function addLog(log: Omit<ActivityLog, 'id' | 'created_at'>): Promise<ActivityLog> {
  return apiRequest('/api/logs', 'POST', log);
}

export async function getAccounts(): Promise<UserAccount[]> {
  return apiRead('/api/accounts', []);
}

export async function getAccountByIdentifier(identifier: string): Promise<UserAccount | null> {
  const { data, error } = await supabase.from('user_accounts').select('*').or(`username.ilike.${identifier},identifier.ilike.${identifier},email.ilike.${identifier}`).maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function addAccount(account: Omit<UserAccount, 'id' | 'created_at' | 'updated_at'>): Promise<UserAccount> {
  return apiRequest('/api/accounts', 'POST', account);
}

export async function updateAccount(id: string, updates: Partial<UserAccount>): Promise<UserAccount> {
  return apiRequest(withId('/api/accounts', id), 'PATCH', updates);
}

export async function deleteAccount(id: string): Promise<void> {
  await apiRequest<void>(withId('/api/accounts', id), 'DELETE');
}

export async function resetAccountPassword(id: string, newPasswordHash: string): Promise<UserAccount> {
  return updateAccount(id, { password_hash: newPasswordHash });
}

export async function updateLastLogin(id: string): Promise<void> {
  await apiRequest<void>(withId('/api/accounts', id), 'PATCH', { last_login: new Date().toISOString() });
}

export async function promoteStudents(): Promise<PromoteResult> {
  const [students, classes] = await Promise.all([getStudents(), getClasses()]);
  const tingkatOrder: Array<'X' | 'XI' | 'XII'> = ['X', 'XI', 'XII'];
  const classByTingkat: Record<string, string[]> = { X: [], XI: [], XII: [] };
  classes.forEach((c) => { if (classByTingkat[c.tingkat]) classByTingkat[c.tingkat].push(c.nama); });

  const preview: PromoteResult['preview'] = [];
  let promotedCount = 0, graduatedCount = 0;

  for (const student of students) {
    const currentClass = classes.find((c) => c.nama === student.rombel);
    if (!currentClass) continue;
    const currentIndex = tingkatOrder.indexOf(currentClass.tingkat);
    if (currentIndex === -1) continue;

    if (currentIndex < tingkatOrder.length - 1) {
      const nextTingkat = tingkatOrder[currentIndex + 1];
      const nextClasses = classByTingkat[nextTingkat];
      if (nextClasses.length > 0) {
        const targetClass = nextClasses[promotedCount % nextClasses.length];
        await updateStudent(student.id, { rombel: targetClass });
        promotedCount++;
        preview.push({ nisn: student.nisn, nama: student.nama, fromRombel: student.rombel, toRombel: targetClass, status: 'naik' });
      }
    } else {
      await updateStudent(student.id, { rombel: 'LULUS' });
      graduatedCount++;
      preview.push({ nisn: student.nisn, nama: student.nama, fromRombel: student.rombel, toRombel: 'LULUS', status: 'lulus' });
    }
  }

  if (graduatedCount > 0) {
    const graduatedNisns = preview.filter((p) => p.status === 'lulus').map((p) => p.nisn);
    const accounts = await getAccounts();
    for (const acc of accounts) {
      if (acc.role === 'siswa' && graduatedNisns.includes(acc.identifier)) {
        await updateAccount(acc.id, { status: 'nonaktif' });
      }
    }
  }
  return { promoted: promotedCount, graduated: graduatedCount, preview };
}

export async function autoCloseDayAlpa(): Promise<number> {
  const today = getTodayDateString();
  const holidays = await getHolidays();
  const schedule = await getSchedule();
  const isHolidayToday = holidays.some((h) => h.tanggal === today);
  const isWorkDayToday = schedule?.hari_kerja?.includes(new Date(today).getDay()) ?? false;
  if (isHolidayToday || !isWorkDayToday) return -1;

  const [students, attendanceToday] = await Promise.all([getStudents(), getAttendance({ target_type: 'siswa', date: today })]);
  const existingStudentIds = new Set(attendanceToday.map((a) => a.target_id));
  let count = 0;

  for (const student of students) {
    if (!existingStudentIds.has(student.id)) {
      await recordAttendance({
        target_type: 'siswa',
        target_id: student.id,
        target_name: student.nama,
        target_identifier: student.nisn,
        rombel: student.rombel,
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
        status: 'Alpa',
        flags: [],
        notes: 'Otomatis dihitung Alpa saat Tutup Hari karena tidak ada absensi atau izin tercatat.',
        is_corrected: false,
        corrected_by: null,
        corrected_at: null,
        correction_reason: null,
      });
      count++;
    }
  }
  return count;
}

export async function loginWithCredential(identifier: string, password: string): Promise<LoginResult> {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.user) return { success: false, message: data.error || 'Login gagal' };
    return { success: true, message: `Selamat datang, ${data.user.nama}!`, user: data.user };
  } catch {
    return { success: false, message: 'Terjadi kesalahan jaringan. Silakan coba lagi.' };
  }
}