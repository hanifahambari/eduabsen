import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Teacher, TeacherDaySchedule } from '../types';
import {
  Calendar as CalendarIcon,
  Clock,
  Trash2,
  Save,
  CheckCircle,
  Lock,
  Sun,
  Coffee,
  Sliders,
  X,
  Search,
  Filter,
  Edit,
  RotateCcw,
} from 'lucide-react';
import {
  formatIndonesianDate,
  MADRASAH_DAYS_CONFIG,
  isWeeklyHoliday,
  getDayNameFromDate,
  getTeacherEffectiveSchedule,
  DAYS_ID,
} from '../utils/dateTime';

export const ScheduleView: React.FC = () => {
  const {
    currentUser,
    currentDate,
    schedule,
    updateSchedule,
    holidays,
    addHoliday,
    removeHoliday,
    teachers,
    updateTeacher,
  } = useApp();

  // Tab State
  const [activeTab, setActiveTab] = useState<'standar' | 'guru'>('standar');

  // Strictly Admin can edit schedule and calendar
  const isEditable = currentUser.role === 'admin';

  // Schedule form state
  const [jam_masuk_guru, setjam_masuk_guru] = useState(schedule?.jam_masuk_guru);
  const [batas_terlambat_guru, setbatas_terlambat_guru] = useState(schedule?.batas_terlambat_guru);
  const [jam_pulang_guru, setjam_pulang_guru] = useState(schedule?.jam_pulang_guru);
  const [jam_masuk_siswa, setjam_masuk_siswa] = useState(schedule?.jam_masuk_siswa);
  const [batas_terlambat_siswa, setbatas_terlambat_siswa] = useState(schedule?.batas_terlambat_siswa);
  const [jam_pulang_siswa, setjam_pulang_siswa] = useState(schedule?.jam_pulang_siswa);

  // Active days: [6, 0, 1, 2, 3, 4] (Sabtu, Ahad, Senin, Selasa, Rabu, Kamis)
  const [hari_kerja, sethari_kerja] = useState<number[]>(
    schedule?.hari_kerja || [6, 0, 1, 2, 3, 4]
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  // New Holiday state
  const [newHolDate, setNewHolDate] = useState('');
  const [newHolKet, setNewHolKet] = useState('');
  const [newHolJenis, setNewHolJenis] = useState<'nasional' | 'madrasah'>('madrasah');

  // Teacher Schedule Override Management State
  const [searchTeacher, setSearchTeacher] = useState('');
  const [filterOverride, setFilterOverride] = useState<'ALL' | 'OVERRIDE_ONLY' | 'STANDARD_ONLY'>('ALL');
  const [selectedTeacherForEdit, setSelectedTeacherForEdit] = useState<Teacher | null>(null);
  const [editingSchedules, setEditingSchedules] = useState<TeacherDaySchedule[]>([]);
  const [teacherSaveSuccess, setTeacherSaveSuccess] = useState<string | null>(null);

  // Active madrasah work day indices in sequence: Sabtu(6), Ahad(0), Senin(1), Selasa(2), Rabu(3), Kamis(4)
  const MADRASAH_WORK_DAYS = [6, 0, 1, 2, 3, 4];

  const toggleDay = (day_index: number) => {
    if (!isEditable) return;
    sethari_kerja((prev) =>
      prev.includes(day_index)
        ? prev.filter((d) => d !== day_index)
        : [...prev, day_index]
    );
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditable) return;
    updateSchedule({
      jam_masuk_guru,
      batas_terlambat_guru,
      jam_pulang_guru,
      jam_masuk_siswa,
      batas_terlambat_siswa,
      jam_pulang_siswa,
      hari_kerja,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const todayday_name = getDayNameFromDate(currentDate);
  const isTodayJumat = isWeeklyHoliday(currentDate);

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditable || !newHolDate || !newHolKet.trim()) return;
    addHoliday({
      tanggal: newHolDate,
      keterangan: newHolKet,
      jenis: newHolJenis,
    });
    setNewHolDate('');
    setNewHolKet('');
  };

  // Open Teacher Schedule Editor Modal
  const handleOpenEditTeacher = (teacher: Teacher) => {
    setSelectedTeacherForEdit(teacher);
    // Build schedules for all 6 active days
    const current = teacher.jadwal_khusus || [];
    const populated: TeacherDaySchedule[] = MADRASAH_WORK_DAYS.map((dayIdx) => {
      const existing = current.find((c) => c.day_index === dayIdx);
      if (existing) {
        return { ...existing };
      }
      return {
        day_index: dayIdx,
        aktif: true,
        is_override: false,
        jam_masuk: schedule?.jam_masuk_guru || null,
        batas_terlambat: schedule?.batas_terlambat_guru || null,
        jam_pulang: schedule?.jam_pulang_guru || null,
      };
    });
    setEditingSchedules(populated);
  };

  // Modify schedule item in modal
  const handleUpdateEditingDay = (day_index: number, updates: Partial<TeacherDaySchedule>) => {
    setEditingSchedules((prev) =>
      prev.map((item) => (item.day_index === day_index ? { ...item, ...updates } : item))
    );
  };

  // Quick reset all days to standard
  const handleResetEditingToStandard = () => {
    setEditingSchedules((prev) =>
      prev.map((item) => ({
        ...item,
        aktif: true,
        is_override: false,
        jam_masuk: schedule?.jam_masuk_guru || null,
        batas_terlambat: schedule?.batas_terlambat_guru || null,
        jam_pulang: schedule?.jam_pulang_guru || null,
      }))
    );
  };

  // Save Teacher Schedules
  const handleSaveTeacherSchedule = () => {
    if (!selectedTeacherForEdit || !isEditable) return;
    updateTeacher(selectedTeacherForEdit.id, {
      jadwal_khusus: editingSchedules,
    });
    setTeacherSaveSuccess(`Jadwal kerja untuk ${selectedTeacherForEdit.nama} berhasil diperbarui.`);
    setSelectedTeacherForEdit(null);
    setTimeout(() => setTeacherSaveSuccess(null), 4000);
  };

  // Filter teachers list
  const filteredTeachers = teachers.filter((t) => {
    const matchSearch =
      t.nama.toLowerCase().includes(searchTeacher.toLowerCase()) ||
      t.nip.includes(searchTeacher) ||
      t.mapel.toLowerCase().includes(searchTeacher.toLowerCase());
    if (!matchSearch) return false;

    if (filterOverride === 'OVERRIDE_ONLY') {
      const hasOverride = t.jadwal_khusus?.some((j) => j.is_override || !j.aktif);
      return Boolean(hasOverride);
    }
    if (filterOverride === 'STANDARD_ONLY') {
      const hasOverride = t.jadwal_khusus?.some((j) => j.is_override || !j.aktif);
      return !hasOverride;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Mode Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Pengaturan Jadwal & Kalender Operasional
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola jadwal operasional madrasah, jam kehadiran siswa, kalender libur, serta penjadwalan khusus guru (override).
          </p>
        </div>
        {!isEditable && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 self-start sm:self-auto">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Mode Informasi (Lihat Saja)</span>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('standar')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'standar'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Jadwal Standar Madrasah & Libur</span>
        </button>
        <button
          onClick={() => setActiveTab('guru')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'guru'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Penjadwalan Guru (Override & Hari Mengajar)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-mono">
            {teachers.length} Guru
          </span>
        </button>
      </div>

      {/* Today's Day Status Banner */}
      <div
        className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs ${
          isTodayJumat
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}
      >
        <div className="flex items-center gap-2">
          {isTodayJumat ? (
            <Coffee className="w-4 h-4 text-amber-700 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
          )}
          <span>
            <strong>Status Hari Ini ({todayday_name}):</strong>{' '}
            {isTodayJumat
              ? "Hari Libur Rutin Mingguan Madrasah (Jum'at). Presensi tidak diwajibkan dan proses tutup hari tidak membuat Alpa otomatis."
              : 'Hari Aktif Madrasah (Sabtu s.d. Kamis). Presensi guru & siswa aktif sesuai jadwal masing-masing.'}
          </span>
        </div>
        <span className="font-semibold text-[11px] px-2.5 py-0.5 rounded-full bg-white border border-current shrink-0 self-start sm:self-auto">
          {isTodayJumat ? "Libur Mingguan (Jum'at)" : 'Hari Aktif Madrasah'}
        </span>
      </div>

      {teacherSaveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{teacherSaveSuccess}</span>
        </div>
      )}

      {/* TAB 1: JADWAL STANDAR MADRASAH & LIBUR */}
      {activeTab === 'standar' && (
        <>
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Pengaturan jam operasional dan jendela absensi berhasil diperbarui.</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Jam Kerja Guru & Siswa */}
            <div className="lg:col-span-6 space-y-6">
              <form onSubmit={handleSaveSchedule} className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-700" />
                    <span>Jadwal Operasional Standar Guru & Pegawai</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Berlaku sebagai jadwal default jika guru tidak memiliki pengaturan override khusus.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Jam Mulai Masuk
                    </label>
                    <input
                      type="time"
                      disabled={!isEditable}
                      value={jam_masuk_guru}
                      onChange={(e) => setjam_masuk_guru(e.target.value)}
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Batas Terlambat
                    </label>
                    <input
                      type="time"
                      disabled={!isEditable}
                      value={batas_terlambat_guru}
                      onChange={(e) => setbatas_terlambat_guru(e.target.value)}
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-50 text-red-600 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Jam Kepulangan
                    </label>
                    <input
                      type="time"
                      disabled={!isEditable}
                      value={jam_pulang_guru}
                      onChange={(e) => setjam_pulang_guru(e.target.value)}
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-50"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-700" />
                    <span>Jadwal Operasional Siswa</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 mb-3">
                    Digunakan saat pemindaian kartu QR atau NISN oleh guru piket/wali kelas.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Jam Mulai Masuk
                      </label>
                      <input
                        type="time"
                        disabled={!isEditable}
                        value={jam_masuk_siswa}
                        onChange={(e) => setjam_masuk_siswa(e.target.value)}
                        className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Batas Terlambat
                      </label>
                      <input
                        type="time"
                        disabled={!isEditable}
                        value={batas_terlambat_siswa}
                        onChange={(e) => setbatas_terlambat_siswa(e.target.value)}
                        className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-50 text-red-600 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Jam Kepulangan
                      </label>
                      <input
                        type="time"
                        disabled={!isEditable}
                        value={jam_pulang_siswa}
                        onChange={(e) => setjam_pulang_siswa(e.target.value)}
                        className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Konfigurasi Hari Aktif & Libur Mingguan Madrasah */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-emerald-700" />
                        <span>Hari Aktif & Libur Mingguan Madrasah</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Hari Aktif: <strong className="text-slate-800">Sabtu, Ahad, Senin, Selasa, Rabu, Kamis</strong>. Hari Libur: <strong className="text-amber-800">Jum'at</strong>.
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {hari_kerja.length} Hari Aktif
                    </span>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 pt-1">
                    {MADRASAH_DAYS_CONFIG.map((day) => {
                      const isActive = hari_kerja.includes(day.dayIndex);
                      const isJumat = day.dayIndex === 5;
                      return (
                        <button
                          type="button"
                          key={day.dayIndex}
                          disabled={!isEditable}
                          onClick={() => toggleDay(day.dayIndex)}
                          className={`p-2 rounded-lg text-center transition-all flex flex-col items-center justify-center border ${
                            isActive
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                              : isJumat
                              ? 'bg-amber-50/70 border-amber-300 text-amber-900 font-medium'
                              : 'bg-slate-50 border-slate-200 text-slate-400'
                          } ${isEditable ? 'cursor-pointer hover:shadow-xs' : 'cursor-default'}`}
                        >
                          <span className="text-xs">{day.name}</span>
                          <span
                            className={`text-[9px] mt-1 px-1 rounded uppercase tracking-wider font-semibold ${
                              isActive
                                ? 'bg-emerald-700 text-white'
                                : isJumat
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isActive ? 'Aktif' : isJumat ? 'Libur' : 'Off'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                    <Sun className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">Ketentuan Presensi Hari Aktif:</span>
                      <p className="text-slate-500 mt-0.5">
                        Guru dan siswa hadir pada hari <strong>Sabtu, Ahad, Senin, Selasa, Rabu, dan Kamis</strong>. Pada hari <strong>Jum'at</strong>, madrasah libur rutin sehingga sistem tidak menandai siswa Alpa otomatis.
                      </p>
                    </div>
                  </div>
                </div>

                {isEditable && (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Perubahan Jadwal</span>
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Right Column: Kalender Hari Libur */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-emerald-700" />
                      <span>Kalender Libur & Hari Khusus</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pada hari libur, absensi tidak dihitung alpa otomatis.
                    </p>
                  </div>
                </div>

                {isEditable && (
                  <form onSubmit={handleAddHoliday} className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Tanggal Libur
                        </label>
                        <input
                          type="date"
                          required
                          value={newHolDate}
                          onChange={(e) => setNewHolDate(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Jenis Libur
                        </label>
                        <select
                          value={newHolJenis}
                          onChange={(e) => setNewHolJenis(e.target.value as 'nasional' | 'madrasah')}
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                        >
                          <option value="madrasah">Libur Khusus Madrasah</option>
                          <option value="nasional">Libur Nasional</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                        Keterangan
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Libur Hari Santri / Milad Madrasah"
                          value={newHolKet}
                          onChange={(e) => setNewHolKet(e.target.value)}
                          className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold whitespace-nowrap cursor-pointer"
                        >
                          + Tambah
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
                  {holidays.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">
                      Belum ada daftar hari libur yang ditambahkan.
                    </div>
                  ) : (
                    holidays.map((hol) => (
                      <div
                        key={hol.id}
                        className="py-2.5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{hol.keterangan}</p>
                          <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                            {formatIndonesianDate(hol.tanggal)} •{' '}
                            <span className="capitalize text-emerald-800 font-sans font-semibold">
                              Libur {hol.jenis}
                            </span>
                          </p>
                        </div>
                        {isEditable && (
                          <button
                            onClick={() => removeHoliday(hol.id)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded cursor-pointer transition-colors"
                            title="Hapus hari libur"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: PENJADWALAN GURU (OVERRIDE & HARI MENGAJAR) */}
      {activeTab === 'guru' && (
        <div className="space-y-5">
          {/* Information & Explanation Box */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-700" />
                  <span>Manajemen Penjadwalan Kerja & Override Guru</span>
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                  Di madrasah, jam tugas masing-masing guru seringkali bervariasi sesuai SK Pembagian Tugas Mengajar. Fitur ini memungkinkan pengaturan
                  <strong> hari aktif bertugas/mengajar</strong> serta <strong>override jam masuk & pulang khusus</strong> untuk setiap guru pada hari Sabtu, Ahad, Senin, Selasa, Rabu, dan Kamis.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  Standar Madrasah: <strong className="text-slate-800 font-mono">{schedule?.jam_masuk_guru} - {schedule?.jam_pulang_guru} WIB</strong>
                </span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari nama guru atau mapel..."
                    value={searchTeacher}
                    onChange={(e) => setSearchTeacher(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterOverride}
                  onChange={(e) => setFilterOverride(e.target.value as any)}
                  className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700"
                >
                  <option value="ALL">Semua Guru ({teachers.length})</option>
                  <option value="OVERRIDE_ONLY">Hanya Guru dg Jadwal Khusus</option>
                  <option value="STANDARD_ONLY">Hanya Guru Jadwal Standar</option>
                </select>
              </div>
            </div>
          </div>

          {/* Master Table Matrix */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Matriks Jadwal Kerja & Override Guru
                </h4>
                <p className="text-[11px] text-slate-500">
                  Sabtu, Ahad, Senin, Selasa, Rabu, Kamis (Hari Libur Rutin: Jum'at)
                </p>
              </div>
              <span className="text-[11px] font-mono font-medium text-slate-500">
                Menampilkan {filteredTeachers.length} guru
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold text-[11px]">
                  <tr>
                    <th className="py-3 px-4 w-56">Guru / Identitas</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3">Hari Aktif</th>
                    <th className="py-3 px-3">Jadwal Standar</th>
                    <th className="py-3 px-3">Masuk</th>
                    <th className="py-3 px-3">Pulang</th>
                    <th className="py-3 px-3 text-center">Override</th>
                    {isEditable && <th className="py-3 px-4 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTeachers.map((teacher, tIdx) => {
                    const daysSchedules = MADRASAH_WORK_DAYS.map((dayIdx) =>
                      getTeacherEffectiveSchedule(teacher, dayIdx, schedule)
                    );
                    const totalActiveDays = daysSchedules.filter((d) => d.aktif).length;
                    const hasAnyOverride = daysSchedules.some((d) => d.is_override || !d.aktif);

                    return (
                      <React.Fragment key={teacher.id}>
                        {daysSchedules.map((daySched, dIdx) => {
                          const isFirstDay = dIdx === 0;
                          return (
                            <tr
                              key={`${teacher.id}-${daySched.day_index}`}
                              className={`hover:bg-slate-50/70 transition-colors ${
                                isFirstDay && tIdx > 0 ? 'border-t-2 border-slate-200' : ''
                              }`}
                            >
                              {/* Kolom Guru hanya di-render sekali per blok guru */}
                              {isFirstDay && (
                                <td
                                  rowSpan={6}
                                  className="py-4 px-4 align-top bg-white border-r border-slate-100"
                                >
                                  <div className="space-y-1">
                                    <p className="font-bold text-slate-900 text-xs">{teacher.nama}</p>
                                    <p className="text-[11px] text-slate-500 font-mono">{teacher.nip}</p>
                                    <p className="text-[11px] text-emerald-800 font-medium">{teacher.mapel}</p>
                                    <div className="pt-2 flex flex-wrap gap-1">
                                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        {totalActiveDays} Hari Aktif / Pekan
                                      </span>
                                      {hasAnyOverride && (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                                          Ada Override
                                        </span>
                                      )}
                                    </div>
                                    {isEditable && (
                                      <div className="pt-3">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditTeacher(teacher)}
                                          className="w-full px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                        >
                                          <Edit className="w-3 h-3" />
                                          <span>Ubah Jadwal</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              )}

                              {/* Aktif? */}
                              <td className="py-2.5 px-3 text-center">
                                {daySched.aktif ? (
                                  <span
                                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs"
                                    title="Aktif Bertugas / Mengajar"
                                  >
                                    ✓
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-800 font-bold text-xs"
                                    title="Tidak Ada Jadwal Mengajar (Off)"
                                  >
                                    ✕
                                  </span>
                                )}
                              </td>

                              {/* Hari Aktif */}
                              <td className="py-2.5 px-3 font-semibold text-slate-900">
                                {daySched.day_name}
                              </td>

                              {/* Jadwal Standar */}
                              <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                                {schedule?.jam_masuk_guru} - {schedule?.jam_pulang_guru} WIB
                              </td>

                              {/* Masuk */}
                              <td className="py-2.5 px-3 font-mono font-bold">
                                {daySched.aktif ? (
                                  <span
                                    className={
                                      daySched.is_override ? 'text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded' : 'text-slate-800'
                                    }
                                  >
                                    {daySched.jam_masuk} WIB
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-normal">-</span>
                                )}
                              </td>

                              {/* Pulang */}
                              <td className="py-2.5 px-3 font-mono font-bold">
                                {daySched.aktif ? (
                                  <span
                                    className={
                                      daySched.is_override ? 'text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded' : 'text-slate-800'
                                    }
                                  >
                                    {daySched.jam_pulang} WIB
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-normal">-</span>
                                )}
                              </td>

                              {/* Override? */}
                              <td className="py-2.5 px-3 text-center">
                                {daySched.is_override ? (
                                  <span className="inline-flex items-center gap-1 font-bold text-indigo-700 text-xs">
                                    <span>★</span>
                                    <span className="text-[10px] hidden sm:inline">Khusus</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">
                                    {daySched.aktif ? 'Standar' : '-'}
                                  </span>
                                )}
                              </td>

                              {/* Aksi Baris Pertama Saja */}
                              {isEditable && isFirstDay && (
                                <td rowSpan={6} className="py-4 px-4 align-top text-right bg-white border-l border-slate-100">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditTeacher(teacher)}
                                    className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Edit className="w-3 h-3 text-slate-500" />
                                    <span>Edit</span>
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITOR JADWAL GURU (ADMIN ONLY) */}
      {selectedTeacherForEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 p-5 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider block">
                  Penjadwalan Khusus & Override Guru
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {selectedTeacherForEdit.nama}
                </h3>
                <p className="text-xs text-emerald-200 font-mono">
                  {selectedTeacherForEdit.nip} • {selectedTeacherForEdit.mapel}
                </p>
              </div>
              <button
                onClick={() => setSelectedTeacherForEdit(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-600">
                  Jadwal Standar Madrasah: <strong className="font-mono text-slate-900">{schedule?.jam_masuk_guru} - {schedule?.jam_pulang_guru} WIB</strong>
                </span>
                <button
                  type="button"
                  onClick={handleResetEditingToStandard}
                  className="text-emerald-700 hover:text-emerald-800 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Set Semua Hari Standar</span>
                </button>
              </div>

              {/* Day-by-Day Schedule Form */}
              <div className="space-y-3">
                {editingSchedules.map((item) => {
                  const day_name = DAYS_ID[item.day_index];
                  return (
                    <div
                      key={item.day_index}
                      className={`p-3.5 rounded-xl border transition-all ${
                        !item.aktif
                          ? 'bg-slate-50/70 border-slate-200 opacity-75'
                          : item.is_override
                          ? 'bg-indigo-50/40 border-indigo-200 shadow-2xs'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-20 font-bold text-xs text-slate-900">
                            {day_name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateEditingDay(item.day_index, { aktif: !item.aktif })}
                            className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                              item.aktif
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                          >
                            <span>{item.aktif ? '✓ Aktif Mengajar' : '✕ Bebas Tugas / Off'}</span>
                          </button>
                        </div>

                        {item.aktif && (
                          <div className="flex items-center gap-3 text-xs">
                            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                              <input
                                type="radio"
                                name={`override-${item.day_index}`}
                                checked={!item.is_override}
                                onChange={() => handleUpdateEditingDay(item.day_index, { is_override: false })}
                                className="text-emerald-600 focus:ring-emerald-500"
                              />
                              <span>Jadwal Standar</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-indigo-700">
                              <input
                                type="radio"
                                name={`override-${item.day_index}`}
                                checked={item.is_override}
                                onChange={() =>
                                  handleUpdateEditingDay(item.day_index, {
                                    is_override: true,
                                    jam_masuk: item.jam_masuk || '08:00',
                                    batas_terlambat: item.batas_terlambat || '08:15',
                                    jam_pulang: item.jam_pulang || '13:00',
                                  })
                                }
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>Override Jam Khusus</span>
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Override Inputs */}
                      {item.aktif && item.is_override ? (
                        <div className="mt-2.5 grid grid-cols-3 gap-2.5 pt-1">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                              Jam Masuk (WIB)
                            </label>
                            <input
                              type="time"
                              value={item.jam_masuk || schedule?.jam_masuk_guru}
                              onChange={(e) =>
                                handleUpdateEditingDay(item.day_index, { jam_masuk: e.target.value })
                              }
                              className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                              Batas Terlambat
                            </label>
                            <input
                              type="time"
                              value={item.batas_terlambat || schedule?.batas_terlambat_guru}
                              onChange={(e) =>
                                handleUpdateEditingDay(item.day_index, { batas_terlambat: e.target.value })
                              }
                              className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-red-600"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                              Jam Pulang (WIB)
                            </label>
                            <input
                              type="time"
                              value={item.jam_pulang || schedule?.jam_pulang_guru}
                              onChange={(e) =>
                                handleUpdateEditingDay(item.day_index, { jam_pulang: e.target.value })
                              }
                              className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold text-slate-800"
                            />
                          </div>
                        </div>
                      ) : item.aktif ? (
                        <div className="mt-1.5 text-[11px] text-slate-500 flex items-center justify-between">
                          <span>Mengikuti jadwal standar madrasah</span>
                          <span className="font-mono">{schedule?.jam_masuk_guru} - {schedule?.jam_pulang_guru} WIB (Batas: {schedule?.batas_terlambat_guru})</span>
                        </div>
                      ) : (
                        <div className="mt-1 text-[11px] text-slate-400 italic">
                          Guru tidak memiliki kewajiban hadir di madrasah pada hari ini.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Perubahan langsung berlaku pada presensi geo-tagging guru.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTeacherForEdit(null)}
                  className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveTeacherSchedule}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Jadwal Guru</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
