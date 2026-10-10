import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileSpreadsheet,
  Printer,
  Filter,
} from 'lucide-react';
import { formatIndonesianDate, formatShortDate } from '../utils/dateTime';

export const ReportView: React.FC = () => {
  const {
    currentUser,
    config,
    attendance,
    students,
    classes,
    currentDate,
  } = useApp();

  // Filters
  const [filterType, setFilterType] = useState<'ALL' | 'guru' | 'siswa'>('ALL');
  const [filterRombel, setFilterRombel] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>(currentDate);
  const [endDate, setEndDate] = useState<string>(currentDate);
  const [searchName, setSearchName] = useState<string>('');

  // Role scoping
  const isStudent = currentUser.role === 'siswa';
  const isGuru = currentUser.role === 'guru';
  const currentStudent = students.find((s) => s.id === currentUser.id) || students[0];

  // Filter records
  const filteredRecords = attendance.filter((rec) => {
    // Siswa only sees their own records
    if (isStudent && rec.targetId !== currentUser.id) {
      return false;
    }
    // Guru scoping
    if (isGuru) {
      if (currentUser.isWaliKelas) {
        const isOwnRecord = rec.targetId === currentUser.id;
        const isClassRecord = rec.targetType === 'siswa' && rec.rombel === currentUser.waliKelasRombel;
        if (!isOwnRecord && !isClassRecord) {
          return false;
        }
      } else {
        if (rec.targetId !== currentUser.id) {
          return false;
        }
      }
    }

    if (filterType !== 'ALL' && rec.targetType !== filterType) {
      return false;
    }
    if (filterRombel !== 'ALL' && rec.rombel !== filterRombel) {
      return false;
    }
    if (filterStatus !== 'ALL' && rec.status !== filterStatus) {
      return false;
    }
    if (startDate && rec.date < startDate) {
      return false;
    }
    if (endDate && rec.date > endDate) {
      return false;
    }
    if (
      searchName.trim() &&
      !rec.targetName.toLowerCase().includes(searchName.toLowerCase()) &&
      !rec.targetIdentifier.includes(searchName)
    ) {
      return false;
    }
    return true;
  });

  // Calculate statistics
  const total = filteredRecords.length;
  const hadirCount = filteredRecords.filter((r) => r.status === 'Hadir').length;
  const terlambatCount = filteredRecords.filter((r) => r.flags.includes('Terlambat')).length;
  const izinCount = filteredRecords.filter((r) => r.status === 'Izin').length;
  const sakitCount = filteredRecords.filter((r) => r.status === 'Sakit').length;
  const alpaCount = filteredRecords.filter((r) => r.status === 'Alpa').length;
  const hadirPct = total > 0 ? Math.round((hadirCount / total) * 100) : 0;

  // Export to Excel / CSV format
  const handleExportCsv = () => {
    const headers = isStudent
      ? ['No', 'Tanggal', 'Jam Masuk', 'Jam Pulang', 'Status Kehadiran', 'Penanda', 'Keterangan']
      : [
          'No',
          'Tanggal',
          'Tipe',
          'Nama Lengkap',
          'NIP/NISN',
          'Rombel/Kelas',
          'Jam Masuk',
          'Jarak GPS Masuk (m)',
          'Jam Pulang',
          'Jarak GPS Pulang (m)',
          'Status Kehadiran',
          'Penanda',
          'Keterangan',
          'Pemindai / Petugas',
        ];

    const rows = filteredRecords.map((r, idx) =>
      isStudent
        ? [
            idx + 1,
            r.date,
            r.checkInTime || '-',
            r.checkOutTime || '-',
            r.status,
            `"${r.flags.join(', ')}"`,
            `"${(r.notes || '').replace(/"/g, '""')}"`,
          ]
        : [
            idx + 1,
            r.date,
            r.targetType.toUpperCase(),
            `"${r.targetName.replace(/"/g, '""')}"`,
            `'${r.targetIdentifier}`,
            r.rombel || '-',
            r.checkInTime || '-',
            r.checkInDistance !== undefined ? r.checkInDistance : '-',
            r.checkOutTime || '-',
            r.checkOutDistance !== undefined ? r.checkOutDistance : '-',
            r.status,
            `"${r.flags.join(', ')}"`,
            `"${(r.notes || '').replace(/"/g, '""')}"`,
            `"${r.checkInScannedByName || (r.checkInScannedBy === 'self' ? 'Mandiri' : '-')}"`,
          ]
    );

    const csvContent =
      '\uFEFF' + // UTF-8 BOM so Excel opens accents and symbols perfectly
      [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      isStudent
        ? `Rekap_Presensi_Pribadi_${currentStudent.nisn}_${startDate}_sd_${endDate}.csv`
        : `Rekap_Presensi_${config.nama.replace(/\s+/g, '_')}_${startDate}_sd_${endDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {isStudent ? 'Laporan & Rekap Kehadiran Pribadi Siswa' : 'Laporan & Rekapitulasi Presensi'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isStudent
              ? `Rekapitulasi riwayat presensi harian untuk ananda ${currentStudent.nama} (${currentStudent.rombel} • NISN: ${currentStudent.nisn}).`
              : 'Unduh laporan kehadiran harian, mingguan, atau bulanan dalam format Excel dan cetak PDF resmi.'}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isStudent ? 'Ekspor Excel Rekap Saya (.CSV)' : 'Ekspor Excel (.CSV)'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isStudent ? 'Cetak Rekap Saya' : 'Cetak Dokumen'}</span>
          </button>
        </div>
      </div>

      {/* Filter Card (No Print) */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <Filter className="w-3.5 h-3.5 text-emerald-700" />
          <span>{isStudent ? 'Saring Periode Rekap Pribadi' : 'Filter Laporan'}</span>
        </div>
        <div
          className={`grid gap-2.5 ${
            isStudent ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
          }`}
        >
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          {!isStudent && (
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                Kategori
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'ALL' | 'guru' | 'siswa')}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="ALL">Semua (Guru & Siswa)</option>
                <option value="guru">Khusus Guru & Pegawai</option>
                <option value="siswa">Khusus Siswa</option>
              </select>
            </div>
          )}
          {!isStudent && (
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                Kelas / Rombel
              </label>
              <select
                value={filterRombel}
                onChange={(e) => setFilterRombel(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="ALL">Semua Kelas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.nama}>
                    {c.nama}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
              Status Presensi
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">Semua Status</option>
              <option value="Hadir">Hadir</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
              {!isStudent && <option value="Dinas Luar">Dinas Luar</option>}
              <option value="Alpa">Alpa</option>
            </select>
          </div>
          {!isStudent && (
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                Cari Nama / ID
              </label>
              <input
                type="text"
                placeholder="Ketik nama..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              />
            </div>
          )}
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Hari Rekap
          </span>
          <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">
            {total}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider block">
            Hadir ({hadirPct}%)
          </span>
          <span className="font-mono text-xl font-bold text-emerald-700 tabular-nums">
            {hadirCount}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider block">
            Terlambat
          </span>
          <span className="font-mono text-xl font-bold text-amber-700 tabular-nums">
            {terlambatCount}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider block">
            Izin
          </span>
          <span className="font-mono text-xl font-bold text-blue-700 tabular-nums">
            {izinCount}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <span className="text-[10px] font-semibold text-purple-700 uppercase tracking-wider block">
            Sakit
          </span>
          <span className="font-mono text-xl font-bold text-purple-700 tabular-nums">
            {sakitCount}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wider block">
            Alpa
          </span>
          <span className="font-mono text-xl font-bold text-red-600 tabular-nums">
            {alpaCount}
          </span>
        </div>
      </div>

      {/* Official Madrasah Letterhead for Printing */}
      <div className="print-only hidden p-4 border-b-2 border-slate-900 mb-4">
        <div className="flex items-center justify-center gap-4 text-center">
          {config.logo && (
            <img
              src={config.logo}
              alt="Logo Madrasah"
              className="w-16 h-16 object-contain shrink-0"
            />
          )}
          <div>
            <h2 className="text-base font-bold uppercase tracking-tight">
              KEMENTERIAN AGAMA REPUBLIK INDONESIA
            </h2>
            <h1 className="text-lg font-bold uppercase tracking-tight">{config.nama}</h1>
            <p className="text-xs text-slate-600 mt-0.5">
              {config.alamat} • Telp: {config.telepon} • NSM: {config.nsm} • NPSN/NPSM: {config.npsm || config.npsn}
            </p>
          </div>
        </div>
        <p className="text-xs font-semibold mt-2 underline text-center">
          {isStudent
            ? `LEMBAR REKAPITULASI PRESENSI SISWA: ${currentStudent.nama} (${currentStudent.rombel} / NISN: ${currentStudent.nisn})`
            : `LAPORAN REKAPITULASI PRESENSI KEHADIRAN (PERIODE: ${formatShortDate(startDate)} s.d. ${formatShortDate(endDate)})`}
        </p>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs card-print">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-[10px] uppercase">
              <tr>
                <th className="py-2.5 px-3">Tanggal</th>
                {!isStudent && <th className="py-2.5 px-3">Nama Lengkap</th>}
                {!isStudent && <th className="py-2.5 px-3">Identitas / Rombel</th>}
                <th className="py-2.5 px-3">Jam Masuk</th>
                <th className="py-2.5 px-3">Jam Pulang</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Penanda</th>
                <th className="py-2.5 px-3">{isStudent ? 'Keterangan' : 'Keterangan / Scanner'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={isStudent ? 6 : 8} className="py-8 text-center text-slate-400">
                    Tidak ditemukan data presensi pada rentang tanggal ini.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isLate = r.flags.includes('Terlambat');
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 tabular-nums">
                        {r.date}
                      </td>
                      {!isStudent && (
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {r.targetName}
                        </td>
                      )}
                      {!isStudent && (
                        <td className="py-2.5 px-3 text-slate-600">
                          <span className="font-semibold text-slate-800">
                            {r.targetType === 'guru' ? 'Guru' : r.rombel || 'Siswa'}
                          </span>{' '}
                          • <span className="font-mono text-[11px] tabular-nums">{r.targetIdentifier}</span>
                        </td>
                      )}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-800 tabular-nums">
                        {r.checkInTime ? r.checkInTime.substring(0, 5) : '-'}
                        {!isStudent && r.checkInDistance !== undefined && (
                          <span className="text-[10px] text-slate-400 block">
                            {r.checkInDistance}m
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-800 tabular-nums">
                        {r.checkOutTime ? r.checkOutTime.substring(0, 5) : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold">
                        <span
                          className={
                            r.status === 'Hadir'
                              ? isLate
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                              : r.status === 'Alpa'
                              ? 'text-red-600 font-bold'
                              : 'text-blue-700'
                          }
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-600">
                        {r.flags.length > 0 ? r.flags.join(', ') : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-500 max-w-xs truncate">
                        {r.notes || (r.checkInScannedByName ? `Scan: ${r.checkInScannedByName}` : '-')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Print Signature Box */}
        <div className="print-only hidden p-6 mt-8">
          <div className="flex justify-between text-xs text-center">
            <div className="w-56">
              <p>Mengetahui,</p>
              <p className="font-bold">Kepala Madrasah</p>
              <div className="h-16"></div>
              <p className="font-bold underline">{config.kepalaMadrasah}</p>
              <p className="text-[11px] font-mono">NIP. {config.nipKepala}</p>
            </div>
            <div className="w-56">
              <p>Jakarta, {formatIndonesianDate(currentDate)}</p>
              <p className="font-bold">
                {isStudent ? 'Wali Kelas' : 'Koordinator Presensi / Tata Usaha'}
              </p>
              <div className="h-16"></div>
              <p className="font-bold underline">Hj. Siti Rahma, S.Pd</p>
              <p className="text-[11px] font-mono">NIP. 198103122006042005</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
