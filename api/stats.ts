import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [
      { count: totalTeachers },
      { count: totalStudents },
      { count: totalClasses },
      { count: totalAccounts },
      { data: todayAttendance },
    ] = await Promise.all([
      supabaseAdmin.from('teachers').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('students').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('classes').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('user_accounts').select('*', { count: 'exact', head: true }),
      supabaseAdmin
        .from('attendance')
        .select('target_type, status, flags')
        .eq('date', new Date().toISOString().split('T')[0]),
    ]);

    const attendanceStats = {
      guru_masuk: todayAttendance?.filter((a: any) => a.target_type === 'guru' && a.status === 'Hadir').length || 0,
      guru_terlambat: todayAttendance?.filter((a: any) => a.target_type === 'guru' && a.status === 'Hadir' && a.flags?.includes('Terlambat')).length || 0,
      siswa_hadir: todayAttendance?.filter((a: any) => a.target_type === 'siswa' && a.status === 'Hadir').length || 0,
      siswa_terlambat: todayAttendance?.filter((a: any) => a.target_type === 'siswa' && a.status === 'Hadir' && a.flags?.includes('Terlambat')).length || 0,
      siswa_izin: todayAttendance?.filter((a: any) => a.target_type === 'siswa' && ['Izin', 'Sakit', 'Dinas Luar'].includes(a.status)).length || 0,
      siswa_alpa: todayAttendance?.filter((a: any) => a.target_type === 'siswa' && a.status === 'Alpa').length || 0,
    };

    return res.status(200).json({
      totalTeachers: totalTeachers || 0,
      totalStudents: totalStudents || 0,
      totalClasses: totalClasses || 0,
      totalAccounts: totalAccounts || 0,
      attendance: attendanceStats,
    });
  } catch (error) {
    console.error('[GET /api/stats] Unexpected error:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
}