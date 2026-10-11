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
  const { data, error } = await supabase.from('madrasah_config').upsert(config).select().single();
  if (error) throw error;
  return data;
}

export async function getSchedule(): Promise<ScheduleConfig | null> {
  const { data, error } = await supabase.from('schedule_config').select('*').single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateSchedule(schedule: Partial<ScheduleConfig>): Promise<ScheduleConfig> {
  const { data, error } = await supabase.from('schedule_config').upsert(schedule).select().single();
  if (error) throw error;
  return data;
}

export async function getHolidays(): Promise<Holiday[]> {
  const { data, error } = await supabase.from('holidays').select('*').order('tanggal', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addHoliday(holiday: Omit<Holiday, 'id' | 'created_at'>): Promise<Holiday> {
  const { data, error } = await supabase.from('holidays').insert(holiday).select().single();
  if (error) throw error;
  return data;
}

export async function removeHoliday(id: string): Promise<void> {
  const { error } = await supabase.from('holidays').delete().eq('id', id);
  if (error) throw error;
}

export async function getTeachers(): Promise<Teacher[]> {
  const { data, error } = await supabase.from('teachers').select('*').order('nama', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addTeacher(teacher: Omit<Teacher, 'id' | 'created_at' | 'updated_at'>): Promise<Teacher> {
  const { data, error } = await supabase.from('teachers').insert(teacher).select().single();
  if (error) throw error;
  return data;
}

export async function updateTeacher(id: string, updates: Partial<Teacher>): Promise<Teacher> {
  const { data, error } = await supabase.from('teachers').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTeacher(id: string): Promise<void> {
  const { error } = await supabase.from('teachers').delete().eq('id', id);
  if (error) throw error;
}

export async function importTeachersBatch(teachers: Omit<Teacher, 'id' | 'created_at' | 'updated_at'>[]): Promise<number> {
  const { data, error } = await supabase.from('teachers').upsert(teachers, { onConflict: 'nip', ignoreDuplicates: true }).select();
  if (error) throw error;
  return data?.length || 0;
}

export async function getStudents(): Promise<Student[]> {
  const { data, error } = await supabase.from('students').select('*').order('nama', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addStudent(student: Omit<Student, 'id' | 'created_at' | 'updated_at'>): Promise<Student> {
  const { data, error } = await supabase.from('students').insert(student).select().single();
  if (error) throw error;
  return data;
}

export async function updateStudent(id: string, updates: Partial<Student>): Promise<Student> {
  const { data, error } = await supabase.from('students').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) throw error;
}

export async function importStudentsBatch(students: Omit<Student, 'id' | 'created_at' | 'updated_at'>[]): Promise<number> {
  const { data, error } = await supabase.from('students').upsert(students, { onConflict: 'nisn', ignoreDuplicates: true }).select();
  if (error) throw error;
  return data?.length || 0;
}

export async function getClasses(): Promise<ClassRoom[]> {
  const { data, error } = await supabase.from('classes').select('*').order('nama', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addClass(cls: Omit<ClassRoom, 'id' | 'created_at' | 'updated_at'>): Promise<ClassRoom> {
  const { data, error } = await supabase.from('classes').insert(cls).select().single();
  if (error) throw error;
  return data;
}

export async function updateClass(id: string, updates: Partial<ClassRoom>): Promise<ClassRoom> {
  const { data, error } = await supabase.from('classes').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteClass(id: string): Promise<void> {
  const { error } = await supabase.from('classes').delete().eq('id', id);
  if (error) throw error;
}

export async function getAttendance(filters?: {
  target_type?: 'guru' | 'siswa';
  target_id?: string;
  date?: string;
  rombel?: string;
}): Promise<AttendanceRecord[]> {
  let query = supabase.from('attendance').select('*');
  if (filters?.target_type) query = query.eq('target_type', filters.target_type);
  if (filters?.target_id) query = query.eq('target_id', filters.target_id);
  if (filters?.date) query = query.eq('date', filters.date);
  if (filters?.rombel) query = query.eq('rombel', filters.rombel);
  query = query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function recordAttendance(record: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'>): Promise<AttendanceRecord> {
  const { data, error } = await supabase.from('attendance').upsert(record, { onConflict: 'target_type,target_id,date' }).select().single();
  if (error) throw error;
  return data;
}

export async function getLeaveRequests(filters?: {
  target_type?: 'guru' | 'siswa';
  target_id?: string;
  status?: string;
}): Promise<LeaveRequest[]> {
  let query = supabase.from('leave_requests').select('*');
  if (filters?.target_type) query = query.eq('target_type', filters.target_type);
  if (filters?.target_id) query = query.eq('target_id', filters.target_id);
  if (filters?.status) query = query.eq('status', filters.status);
  query = query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function submitLeaveRequest(request: Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at'>): Promise<LeaveRequest> {
  const { data, error } = await supabase.from('leave_requests').insert(request).select().single();
  if (error) throw error;
  return data;
}

export async function reviewLeaveRequest(id: string, decision: 'Disetujui' | 'Ditolak', reviewerId: string, reviewNotes?: string): Promise<LeaveRequest> {
  const { data, error } = await supabase.from('leave_requests').update({
    status: decision, reviewed_by: reviewerId, reviewed_at: new Date().toISOString(), review_notes: reviewNotes
  }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function getCorrectionRequests(filters?: {
  target_type?: 'guru' | 'siswa';
  target_id?: string;
  status?: string;
}): Promise<CorrectionRequest[]> {
  let query = supabase.from('correction_requests').select('*');
  if (filters?.target_type) query = query.eq('target_type', filters.target_type);
  if (filters?.target_id) query = query.eq('target_id', filters.target_id);
  if (filters?.status) query = query.eq('status', filters.status);
  query = query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function submitCorrectionRequest(request: Omit<CorrectionRequest, 'id' | 'created_at' | 'updated_at'>): Promise<CorrectionRequest> {
  const { data, error } = await supabase.from('correction_requests').insert(request).select().single();
  if (error) throw error;
  return data;
}

export async function reviewCorrectionRequest(id: string, decision: 'Disetujui' | 'Ditolak', reviewerId: string): Promise<CorrectionRequest> {
  const { data, error } = await supabase.from('correction_requests').update({
    status: decision, reviewed_by: reviewerId, reviewed_at: new Date().toISOString()
  }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function getActivityLogs(limit = 100): Promise<ActivityLog[]> {
  const { data, error } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

export async function addLog(log: Omit<ActivityLog, 'id' | 'created_at'>): Promise<ActivityLog> {
  const { data, error } = await supabase.from('activity_logs').insert(log).select().single();
  if (error) throw error;
  return data;
}

export async function getAccounts(): Promise<UserAccount[]> {
  const { data, error } = await supabase.from('user_accounts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAccountByIdentifier(identifier: string): Promise<UserAccount | null> {
  const { data, error } = await supabase.from('user_accounts').select('*').or(`username.ilike.${identifier},identifier.ilike.${identifier},email.ilike.${identifier}`).maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function addAccount(account: Omit<UserAccount, 'id' | 'created_at' | 'updated_at'>): Promise<UserAccount> {
  const { data, error } = await supabase.from('user_accounts').insert(account).select().single();
  if (error) throw error;
  return data;
}

export async function updateAccount(id: string, updates: Partial<UserAccount>): Promise<UserAccount> {
  const { data, error } = await supabase.from('user_accounts').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase.from('user_accounts').delete().eq('id', id);
  if (error) throw error;
}

export async function resetAccountPassword(id: string, newPasswordHash: string): Promise<UserAccount> {
  return updateAccount(id, { password_hash: newPasswordHash });
}

export async function updateLastLogin(id: string): Promise<void> {
  await supabase.from('user_accounts').update({ last_login: new Date().toISOString() }).eq('id', id);
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
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json();
    if (!data.user) return { success: false, message: data.error || 'Login gagal' };
    return { success: true, message: `Selamat datang, ${data.user.nama}!`, user: data.user };
  } catch {
    return { success: false, message: 'Terjadi kesalahan jaringan. Silakan coba lagi.' };
  }
}