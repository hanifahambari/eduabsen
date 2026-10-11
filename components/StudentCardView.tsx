import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import QRCode from 'qrcode';
import {
  Printer,
  Download,
  GraduationCap,
} from 'lucide-react';

export const StudentCardView: React.FC = () => {
  const { currentUser, students, classes, config } = useApp();

  // Selected student
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    currentUser.role === 'siswa' ? currentUser.id : students[0]?.id || ''
  );
  const [selectedRombel, setSelectedRombel] = useState<string>('XII-MIPA 1');
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const currentStudent =
    students.find((s) => s.id === selectedStudentId) || students[0];

  // Generate QR Code for single view
  useEffect(() => {
    if (currentStudent) {
      QRCode.toDataURL(
        currentStudent.nisn,
        {
          width: 256,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (err, url) => {
          if (!err && url) {
            setQrDataUrl(url);
          }
        }
      );
    }
  }, [currentStudent]);

  // Batch QR data map for bulk print mode
  const [batchQrMap, setBatchQrMap] = useState<Record<string, string>>({});
  useEffect(() => {
    if (isBatchMode) {
      const rombelStudents = students.filter(
        (s) => selectedRombel === 'ALL' || s.rombel === selectedRombel
      );
      rombelStudents.forEach((st) => {
        QRCode.toDataURL(
          st.nisn,
          {
            width: 180,
            margin: 1,
            color: { dark: '#0f172a', light: '#ffffff' },
          },
          (err, url) => {
            if (!err && url) {
              setBatchQrMap((prev) => ({ ...prev, [st.id]: url }));
            }
          }
        );
      });
    }
  }, [isBatchMode, selectedRombel, students]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadSingleCard = () => {
    const link = document.createElement('a');
    link.download = `Kartu_QR_${currentStudent.nisn}_${currentStudent.nama.replace(/\s+/g, '_')}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const rombelStudentsForPrint = students.filter(
    (s) => selectedRombel === 'ALL' || s.rombel === selectedRombel
  );

  return (
    <div className="space-y-6">
      {/* Header & Controls (Hidden during print) */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Kartu Presensi QR Siswa
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kartu digital dengan QR Code unik NISN untuk pemindaian presensi harian di madrasah.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsBatchMode(!isBatchMode)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isBatchMode
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {isBatchMode ? 'Tampilan Kartu Tunggal' : 'Mode Cetak Massal Rombel'}
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Kartu (A4)</span>
          </button>
        </div>
      </div>

      {/* Selector Toolbar (No-Print) */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {!isBatchMode ? (
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <span className="text-xs font-semibold text-slate-700">Pilih Siswa:</span>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-emerald-700 cursor-pointer min-w-[240px]"
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.nama} — {st.rombel} (NISN: {st.nisn})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <span className="text-xs font-semibold text-slate-700">Pilih Rombel Kelas:</span>
              <select
                value={selectedRombel}
                onChange={(e) => setSelectedRombel(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-1 focus:ring-emerald-700 cursor-pointer"
              >
                <option value="ALL">Semua Kelas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.nama}>
                    {c.nama} ({c.tingkat})
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500">
                {rombelStudentsForPrint.length} kartu siap cetak
              </span>
            </div>
          )}
        </div>
      </div>

      {/* View 1: Single Card Presentation */}
      {!isBatchMode ? (
        <div className="max-w-md mx-auto">
          <div className="bg-white border-2 border-slate-300 rounded-2xl overflow-hidden shadow-lg card-print">
            <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 p-4 text-white text-center relative">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto mb-1.5 border-2 border-white/40 shadow-xs overflow-hidden p-1">
                {config?.logo ? (
                  <img
                    src={config?.logo}
                    alt={config?.nama}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <GraduationCap className="w-6 h-6 text-emerald-800" />
                )}
              </div>
              <h3 className="text-sm font-bold tracking-tight uppercase">
                {config?.nama}
              </h3>
              <p className="text-[10px] text-emerald-200 font-medium">
                KARTU TANDA PRESENSI SISWA • TP 2026/2027
              </p>
              <p className="text-[9px] text-emerald-300/80 mt-0.5 truncate">
                {config?.alamat}
              </p>
            </div>

            <div className="p-6 text-center flex flex-col items-center">
              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs inline-block my-2">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code ${currentStudent.nama}`}
                    className="w-44 h-44 object-contain"
                  />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">
                    Membuat QR...
                  </div>
                )}
              </div>

              <div className="mt-3 space-y-1">
                <h4 className="text-base font-bold text-slate-900">
                  {currentStudent.nama}
                </h4>
                <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
                  <span className="font-semibold text-emerald-800">
                    {currentStudent.rombel}
                  </span>
                  <span aria-hidden="true">•</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    NISN: {currentStudent.nisn}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  Wali Murid: {currentStudent.nama_wali || '-'}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 w-full flex items-center justify-between text-[9px] text-slate-400 font-mono">
                <span>NSM: {config?.nsm}</span>
                <span>AUTHENTIC DIGITAL ID</span>
                <span>NPSM: {config?.npsm || config?.npsn}</span>
              </div>
            </div>
          </div>

          <div className="no-print mt-4 flex items-center justify-center gap-3">
            <button
              onClick={handleDownloadSingleCard}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Unduh File QR</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Kartu Siswa Ini</span>
            </button>
          </div>
          <p className="no-print text-center text-[11px] text-slate-500 mt-2">
            Tip: Siswa dapat membuka layar ini di HP masing-masing untuk dipindai oleh guru.
          </p>
        </div>
      ) : (
        /* View 2: Bulk Print Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rombelStudentsForPrint.map((st) => (
            <div
              key={st.id}
              className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden shadow-2xs card-print flex flex-col justify-between"
            >
              <div className="bg-emerald-800 p-2 text-white text-center flex items-center justify-center gap-2">
                {config?.logo && (
                  <img
                    src={config?.logo}
                    alt="Logo"
                    className="w-6 h-6 object-contain bg-white rounded-full p-0.5 shrink-0"
                  />
                )}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-tight leading-tight">
                    {config?.nama}
                  </p>
                  <p className="text-[9px] text-emerald-200">
                    KARTU PRESENSI • {st.rombel}
                  </p>
                </div>
              </div>
              <div className="p-4 text-center flex flex-col items-center">
                <div className="p-1.5 bg-white border border-slate-200 rounded-lg inline-block my-1">
                  {batchQrMap[st.id] ? (
                    <img
                      src={batchQrMap[st.id]}
                      alt={st.nama}
                      className="w-28 h-28 object-contain"
                    />
                  ) : (
                    <div className="w-28 h-28 flex items-center justify-center text-[10px] text-slate-400">
                      QR Code
                    </div>
                  )}
                </div>
                <div className="mt-2 text-center w-full">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {st.nama}
                  </p>
                  <p className="font-mono text-[11px] font-semibold text-slate-700 tabular-nums">
                    NISN: {st.nisn}
                  </p>
                </div>
              </div>
              <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-center text-[9px] text-slate-500 font-mono">
                {config?.nsm} • T.P 2026/2027
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
