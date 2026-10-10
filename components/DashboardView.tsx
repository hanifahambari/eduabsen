import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  formatIndonesianDate,
  formatShortDate,
  getTeacherEffectiveSchedule,
} from '../utils/dateTime';
import QRCode from 'qrcode';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  MapPin,
  QrCode,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  GraduationCap,
  Printer,
  Download,
  User,
  Mail,
  Phone,
  Home,
  Calendar,
} from 'lucide-react';

interface DashboardViewProps {
  setActiveTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ setActiveTab }) => {
  const {
    currentUser,
    currentTime,
    currentDate,
    config,
    schedule,
    teachers,
    students,
    classes,
    attendance,
    autoCloseDayAlpa,
  } = useApp();

  const [tutupHariAlert, setTutupHariAlert] = useState<string | null>(null);
  const [studentQrUrl, setStudentQrUrl] = useState<string>('');

  // If role is Siswa, find matching student profile and generate QR
  const currentStudent = students.find((s) => s.id === currentUser.id) || students[0];

  useEffect(() => {
    if (currentUser.role === 'siswa' && currentStudent) {
      QRCode.toDataURL(
        currentStudent.nisn,
        {
          width: 240,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
        },
        (err, url) => {
          if (!err && url) {
            setStudentQrUrl(url);
          }
        }
      );
    }
  }, [currentUser.role, currentStudent]);

  // Today's attendance calculation
  const todayAttendance = attendance.filter((a) => a.date === currentDate);
  const teacherTodayAtt = todayAttendance.filter((a) => a.targetType === 'guru');
  const studentTodayAtt = todayAttendance.filter((a) => a.targetType === 'siswa');

  const todayDayIndex = new Date().getDay();
  const teachersScheduledToday = teachers.filter(
    (t) => getTeacherEffectiveSchedule(t, todayDayIndex, schedule).aktif
  );
  const totalTeachersActiveToday = teachersScheduledToday.length;
  const totalTeachers = teachers.length;
  const teachersPresent = teacherTodayAtt.filter((a) => a.status === 'Hadir').length;
  const teachersLate = teacherTodayAtt.filter((a) => a.flags.includes('Terlambat')).length;
  const teachersLeave = teacherTodayAtt.filter(
    (a) => a.status === 'Izin' || a.status === 'Sakit' || a.status === 'Dinas Luar'
  ).length;

  const totalStudents = students.length;
  const studentsPresent = studentTodayAtt.filter((a) => a.status === 'Hadir').length;
  const studentsLate = studentTodayAtt.filter((a) => a.flags.includes('Terlambat')).length;
  const studentsLeave = studentTodayAtt.filter(
    (a) => a.status === 'Izin' || a.status === 'Sakit'
  ).length;
  const studentsAlpa = studentTodayAtt.filter((a) => a.status === 'Alpa').length;

  const teacherPercent =
    totalTeachersActiveToday > 0
      ? Math.round((teachersPresent / totalTeachersActiveToday) * 100)
      : totalTeachers > 0
      ? Math.round((teachersPresent / totalTeachers) * 100)
      : 0;

  const studentPercent = totalStudents > 0 ? Math.round((studentsPresent / totalStudents) * 100) : 0;

  // Current user's own status today
  const myRecord = todayAttendance.find(
    (a) =>
      a.targetId === currentUser.id &&
      a.targetType === (currentUser.role === 'siswa' ? 'siswa' : 'guru')
  );

  const handleTutupHari = () => {
    const alpaCreated = autoCloseDayAlpa();
    if (alpaCreated === -1) {
      setTutupHariAlert(
        "Hari ini adalah hari libur madrasah (atau libur mingguan Jum'at). Proses tutup hari tidak membuat status Alpa."
      );
    } else {
      setTutupHariAlert(
        `Proses Tutup Hari Selesai. Sebanyak ${alpaCreated} siswa yang belum absen/izin berhasil ditandai Alpa otomatis.`
      );
    }
    setTimeout(() => setTutupHariAlert(null), 6000);
  };

  // Student specific statistics
  const myAttendanceHistory = attendance
    .filter((a) => a.targetType === 'siswa' && a.targetId === (currentStudent?.id || currentUser.id))
    .sort((a, b) => b.date.localeCompare(a.date));

  // If role is Siswa, show dedicated Student-First Portal
  if (currentUser.role === 'siswa') {
    return (
      <div className="space-y-6">
        {/* Student Welcome Header */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-700 animate-pulse"></span>
                <span>Portal Presensi Digital Siswa • {config.nama}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                Halo, {currentStudent.nama}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-600">
                <span className="font-semibold text-emerald-800">{currentStudent.rombel}</span>
                <span aria-hidden="true">•</span>
                <span className="font-mono text-slate-900 tabular-nums">NISN: {currentStudent.nisn}</span>
                <span aria-hidden="true">•</span>
                <span>{formatIndonesianDate(currentDate)}</span>
                <span aria-hidden="true">•</span>
                <span className="font-mono font-medium text-slate-900">{currentTime} WIB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Student Primary Grid: Digital QR Card (Left) & Profile (Right) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Digital QR Attendance Card */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className="w-full bg-white border-2 border-slate-300 rounded-2xl overflow-hidden shadow-lg card-print">
              <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 p-4 text-white text-center relative">
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-1 border border-white/20">
                  <GraduationCap className="w-5 h-5 text-emerald-200" />
                </div>
                <h3 className="text-xs font-bold tracking-tight uppercase">
                  {config.nama}
                </h3>
                <p className="text-[10px] text-emerald-200 font-medium">
                  KARTU TANDA PRESENSI SISWA
                </p>
              </div>
              <div className="p-5 text-center flex flex-col items-center">
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-xs inline-block my-1">
                  {studentQrUrl ? (
                    <img
                      src={studentQrUrl}
                      alt={`QR Code ${currentStudent.nama}`}
                      className="w-40 h-40 object-contain"
                    />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center text-xs text-slate-400">
                      Membuat QR...
                    </div>
                  )}
                </div>
                <div className="mt-2 text-center w-full">
                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {currentStudent.nama}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    <span className="font-semibold text-emerald-800">{currentStudent.rombel}</span> •{' '}
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      {currentStudent.nisn}
                    </span>
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 w-full text-[10px] text-slate-400 font-mono flex justify-between">
                  <span>NSM: {config.nsm}</span>
                  <span>TAP & SCAN</span>
                  <span>TP 2026/2027</span>
                </div>
              </div>
            </div>
            <p className="text-center text-[11px] text-slate-500 mt-3 no-print">
              💡 Tunjukkan layar ini ke Guru / Petugas Piket saat masuk dan pulang madrasah.
            </p>
          </div>

          {/* Right Column: Status Hari Ini & Data Pribadi Siswa */}
          <div className="md:col-span-7 space-y-4">
            {/* Today's Status Box */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Presensi Hari Ini ({formatShortDate(currentDate)})
              </span>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                  <span className="text-[10px] font-medium text-slate-500 block">Absen Masuk</span>
                  <span className="font-mono text-lg font-bold text-slate-900 tabular-nums mt-0.5 block">
                    {myRecord?.checkInTime ? `${myRecord.checkInTime.substring(0, 5)} WIB` : 'Belum Absen'}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 mt-1 block">
                    {myRecord?.checkInTime
                      ? myRecord.flags.includes('Terlambat')
                        ? '⚠️ Terlambat Masuk'
                        : '✓ Tepat Waktu'
                      : `Batas: ${schedule.batasTerlambatSiswa} WIB`}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                  <span className="text-[10px] font-medium text-slate-500 block">Absen Pulang</span>
                  <span className="font-mono text-lg font-bold text-slate-900 tabular-nums mt-0.5 block">
                    {myRecord?.checkOutTime ? `${myRecord.checkOutTime.substring(0, 5)} WIB` : 'Belum Absen'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {myRecord?.checkOutTime ? '✓ Tercatat Pulang' : `Jam Pulang: ${schedule.jamPulangSiswa} WIB`}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Information */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider text-slate-500">
                <User className="w-3.5 h-3.5 text-emerald-700" />
                <span>Informasi Data Pribadi Siswa</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Nama Lengkap</span>
                  <span className="font-bold text-slate-900">{currentStudent.nama}</span>
                </div>
                <div className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">NISN / Nomor Induk</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">{currentStudent.nisn}</span>
                </div>
                <div className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Rombel / Kelas</span>
                  <span className="font-bold text-emerald-800">{currentStudent.rombel}</span>
                </div>
                <div className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Nama Orang Tua / Wali</span>
                  <span className="font-semibold text-slate-800">{currentStudent.namaWali || '-'}</span>
                </div>
                <div className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">WhatsApp Wali</span>
                  <span className="font-mono text-slate-800">{currentStudent.noWa || '-'}</span>
                </div>
                <div className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Email Siswa</span>
                  <span className="text-slate-800 truncate block">{currentStudent.email}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Teacher / Kepala / Admin Dashboard View
  const isWali = currentUser.role === 'guru' && currentUser.isWaliKelas;
  const waliClassStudents = isWali
    ? students.filter((s) => s.rombel === currentUser.waliKelasRombel)
    : [];
  const waliClassTodayAtt = isWali
    ? todayAttendance.filter((a) => a.targetType === 'siswa' && a.rombel === currentUser.waliKelasRombel)
    : [];
  const waliHadir = waliClassTodayAtt.filter((a) => a.status === 'Hadir').length;

  return (
    <div className="space-y-6">
      {/* Top Banner: Date, Server Clock, & Quick Status */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-700 animate-pulse"></span>
              <span>Sistem Absensi Online • Zona {config.zonaWaktu}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Selamat datang, {currentUser.nama}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-600">
              <span>{formatIndonesianDate(currentDate)}</span>
              <span aria-hidden="true">•</span>
              <span className="font-mono font-medium text-slate-900">{currentTime} WIB</span>
              <span aria-hidden="true">•</span>
              <span>{config.nama}</span>
              <span aria-hidden="true">•</span>
              <span>Radius Toleransi {config.radiusMeter}m</span>
            </div>
          </div>

          {/* Quick Action Box depending on role */}
          <div className="flex flex-wrap items-center gap-2.5">
            {currentUser.role === 'guru' || currentUser.role === 'kepala' ? (
              <>
                <button
                  onClick={() => setActiveTab('absen-guru')}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-2xs cursor-pointer"
                  title="Pintas Absen Guru (GPS)"
                >
                  <MapPin className="w-4 h-4" />
                  <span>
                    {!myRecord?.checkInTime
                      ? 'Pintas Absen Masuk (GPS)'
                      : !myRecord.checkOutTime
                      ? 'Pintas Absen Pulang (GPS)'
                      : 'Presensi Lengkap Hari Ini'}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('scan-siswa')}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-2xs cursor-pointer"
                  title="Pintas Pemindai Siswa (QR)"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Pintas Pemindai QR Siswa</span>
                </button>
              </>
            ) : (
              // Admin
              <button
                onClick={handleTutupHari}
                className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Tutup absensi hari ini dan buat status Alpa untuk siswa yang belum absen"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>Tutup Hari (Otomatis Alpa)</span>
              </button>
            )}
          </div>
        </div>

        {tutupHariAlert && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
            <span>{tutupHariAlert}</span>
            <button
              onClick={() => setTutupHariAlert(null)}
              className="text-amber-700 font-bold ml-2 hover:underline cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}
      </div>

      {/* Special Banner for Wali Kelas */}
      {isWali && (
        <div className="bg-emerald-800 text-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-200">
              <GraduationCap className="w-4 h-4" />
              <span>Kelas Binaan Anda: {currentUser.waliKelasRombel}</span>
            </div>
            <p className="text-xs text-emerald-100 mt-0.5">
              Kehadiran hari ini: <span className="font-mono font-bold">{waliHadir}</span> dari{' '}
              <span className="font-mono font-bold">{waliClassStudents.length}</span> siswa hadir.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('izin-koreksi')}
              className="px-3 py-1.5 bg-white text-emerald-900 hover:bg-emerald-50 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Cek Izin Siswa Kelas
            </button>
            <button
              onClick={() => setActiveTab('scan-siswa')}
              className="px-3 py-1.5 bg-emerald-900/80 hover:bg-emerald-900 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              Pindai Rombel Ini
            </button>
          </div>
        </div>
      )}

      {/* Metric Stat Cards Grid */}
      {currentUser.role === 'admin' || currentUser.role === 'kepala' ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Guru Hadir */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Guru Hadir Hari Ini</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tabular-nums">
                {teachersPresent}
              </span>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                / {totalTeachersActiveToday} guru aktif ({teacherPercent}%)
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-2">
              <span>Terlambat: {teachersLate}</span>
              <span aria-hidden="true">•</span>
              <span>Izin/Dinas: {teachersLeave}</span>
              <span aria-hidden="true">•</span>
              <span>Total: {totalTeachers} guru</span>
            </div>
          </div>

          {/* Siswa Hadir */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Siswa Hadir Hari Ini</span>
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tabular-nums">
                {studentsPresent}
              </span>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                / {totalStudents} siswa ({studentPercent}%)
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-2">
              <span>Terlambat: {studentsLate}</span>
              <span aria-hidden="true">•</span>
              <span>Alpa: {studentsAlpa}</span>
            </div>
          </div>

          {/* Izin & Sakit */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Izin / Sakit</span>
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tabular-nums">
                {teachersLeave + studentsLeave}
              </span>
              <span className="text-xs text-slate-500">orang tercatat</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-2">
              <span>Siswa: {studentsLeave}</span>
              <span aria-hidden="true">•</span>
              <span>Guru: {teachersLeave}</span>
            </div>
          </div>

          {/* Status Jam Kerja */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Jendela Waktu Presensi</span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="mt-2">
              <div className="text-sm font-semibold text-slate-800">
                Masuk: <span className="font-mono text-slate-900">{schedule.jamMasukGuru}</span> s.d.{' '}
                <span className="font-mono text-red-600">{schedule.batasTerlambatGuru}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Pulang: <span className="font-mono text-slate-900">{schedule.jamPulangGuru} WIB</span>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-emerald-700 font-medium flex items-center justify-between">
              <span>Toleransi 15 mnt</span>
              <span className="font-semibold text-slate-700">Hari Aktif: Sab - Kam • Libur: Jum'at</span>
            </div>
          </div>
        </div>
      ) : (
        /* Guru & Wali Kelas: Status Jam Kerja & Kehadiran Mandiri */
        (() => {
          const myTeacherObj = teachers.find((t) => t.id === currentUser.id);
          const myEffSched = getTeacherEffectiveSchedule(myTeacherObj, todayDayIndex, schedule);
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">
                    Jadwal Kerja Saya Hari Ini
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      !myEffSched.aktif
                        ? 'bg-amber-100 text-amber-800'
                        : myEffSched.isOverride
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {!myEffSched.aktif
                      ? 'Off / Bebas Mengajar'
                      : myEffSched.isOverride
                      ? 'Override Khusus'
                      : 'Standar Madrasah'}
                  </span>
                </div>
                <div className="mt-2">
                  {!myEffSched.aktif ? (
                    <div className="text-sm font-semibold text-slate-700">
                      Tidak ada jam tatap muka hari ini
                    </div>
                  ) : (
                    <>
                      <div className="text-sm font-semibold text-slate-800">
                        Masuk: <span className="font-mono text-slate-900">{myEffSched.jamMasuk}</span>{' '}
                        s.d. Batas:{' '}
                        <span className="font-mono text-red-600">{myEffSched.batasTerlambat}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Pulang: <span className="font-mono text-slate-900">{myEffSched.jamPulang} WIB</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-2 text-[11px] text-emerald-700 font-medium flex items-center justify-between">
                  <span>{myEffSched.keterangan}</span>
                  <span className="font-semibold text-slate-700">Hari Aktif: Sab - Kam</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Status Presensi Saya Hari Ini</span>
                  <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-base sm:text-lg font-bold text-slate-900">
                    {myRecord?.checkInTime
                      ? `Masuk: ${myRecord.checkInTime.substring(0, 5)} WIB`
                      : 'Belum Presensi Masuk'}
                  </span>
                  {myRecord?.checkOutTime && (
                    <span className="text-xs text-slate-600">
                      • Pulang: {myRecord.checkOutTime.substring(0, 5)} WIB
                    </span>
                  )}
                </div>
                <div className="mt-2 text-[11px]">
                  {myRecord?.checkInTime ? (
                    <span
                      className={`font-semibold ${
                        myRecord.flags.includes('Terlambat') ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      {myRecord.flags.includes('Terlambat') ? '⚠️ Terlambat Masuk' : '✓ Hadir Tepat Waktu'}{' '}
                      (GPS: {myRecord.checkInDistance}m)
                    </span>
                  ) : (
                    <span className="text-slate-500">
                      Gunakan tombol "Pintas Absen Masuk (GPS)" di atas untuk presensi.
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* Main Content: Rombel Breakdown & Riwayat Terkini */}
      <div
        className={`grid grid-cols-1 ${
          currentUser.role === 'admin' || currentUser.role === 'kepala' ? 'lg:grid-cols-3' : ''
        } gap-6`}
      >
        {/* Left Column: Rekap Kehadiran Siswa Per Rombel */}
        <div
          className={`space-y-4 ${
            currentUser.role === 'admin' || currentUser.role === 'kepala'
              ? 'lg:col-span-2'
              : 'w-full'
          }`}
        >
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Rekap Kehadiran Siswa Per Rombel
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pemantauan real-time kelas aktif hari ini
                </p>
              </div>
              {(currentUser.role === 'admin' || currentUser.role === 'kepala') && (
                <button
                  onClick={() => setActiveTab('laporan')}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Lihat Laporan Lengkap</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-y border-slate-200 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Kelas / Rombel</th>
                    <th className="py-2.5 px-3">Wali Kelas</th>
                    <th className="py-2.5 px-3 text-center">Total Siswa</th>
                    <th className="py-2.5 px-3 text-center">Hadir</th>
                    <th className="py-2.5 px-3 text-center">Terlambat</th>
                    <th className="py-2.5 px-3 text-center">Izin / Sakit</th>
                    <th className="py-2.5 px-3 text-center">Alpa</th>
                    <th className="py-2.5 px-3 text-right">Persentase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classes.map((cls) => {
                    const classStudents = students.filter((s) => s.rombel === cls.nama);
                    const classTodayAtt = todayAttendance.filter(
                      (a) => a.targetType === 'siswa' && a.rombel === cls.nama
                    );
                    const present = classTodayAtt.filter((a) => a.status === 'Hadir').length;
                    const late = classTodayAtt.filter((a) => a.flags.includes('Terlambat')).length;
                    const leave = classTodayAtt.filter(
                      (a) => a.status === 'Izin' || a.status === 'Sakit'
                    ).length;
                    const alpa = classTodayAtt.filter((a) => a.status === 'Alpa').length;
                    const total = classStudents.length;
                    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
                    const isMyAssignedClass =
                      currentUser.isWaliKelas && currentUser.waliKelasRombel === cls.nama;

                    return (
                      <tr
                        key={cls.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isMyAssignedClass ? 'bg-emerald-50/40 font-medium' : ''
                        }`}
                      >
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {cls.nama}{' '}
                          {isMyAssignedClass && (
                            <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100/80 px-1.5 py-0.5 rounded ml-1">
                              Binaan Anda
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600 truncate max-w-[130px]">
                          {cls.waliKelasNama}
                        </td>
                        <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-700">
                          {total}
                        </td>
                        <td className="py-3 px-3 text-center font-mono tabular-nums font-bold text-emerald-700">
                          {present}
                        </td>
                        <td className="py-3 px-3 text-center font-mono tabular-nums text-amber-700">
                          {late}
                        </td>
                        <td className="py-3 px-3 text-center font-mono tabular-nums text-blue-700">
                          {leave}
                        </td>
                        <td className="py-3 px-3 text-center font-mono tabular-nums text-red-600">
                          {alpa}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="font-mono font-bold tabular-nums text-slate-900">
                            {pct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Riwayat Terkini (HANYA ADMIN & KEPALA) */}
        {(currentUser.role === 'admin' || currentUser.role === 'kepala') && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Riwayat Terkini</h3>
                  <p className="text-xs text-slate-500">Aktivitas absensi hari ini</p>
                </div>
                <span className="font-mono text-xs text-emerald-700 font-bold tabular-nums">
                  {todayAttendance.length} Entri
                </span>
              </div>
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {todayAttendance.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Belum ada catatan absensi hari ini.
                  </div>
                ) : (
                  todayAttendance.slice(0, 8).map((record) => {
                    const isGuru = record.targetType === 'guru';
                    const isLate = record.flags.includes('Terlambat');
                    return (
                      <div
                        key={record.id}
                        className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-100/60 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {record.targetName}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {isGuru ? 'Guru' : record.rombel || 'Siswa'} • {record.targetIdentifier}
                            </p>
                          </div>
                          <span className="font-mono text-[11px] font-semibold text-slate-700 shrink-0 tabular-nums">
                            {record.checkInTime ? record.checkInTime.substring(0, 5) : '-'} WIB
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-600">
                          <span
                            className={`font-semibold ${
                              record.status === 'Hadir'
                                ? isLate
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                                : 'text-blue-700'
                            }`}
                          >
                            {record.status} {isLate ? '(Terlambat)' : ''}
                          </span>
                          {record.checkInDistance !== undefined && (
                            <span className="text-slate-400 font-mono tabular-nums">
                              GPS: {record.checkInDistance}m
                            </span>
                          )}
                          {record.checkInScannedByName && (
                            <span className="text-slate-500 truncate max-w-[110px]">
                              oleh {record.checkInScannedByName.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
