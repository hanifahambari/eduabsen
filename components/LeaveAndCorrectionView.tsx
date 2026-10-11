import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Send,
  Calendar,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  Save,
} from 'lucide-react';
import { formatShortDate } from '../utils/dateTime';
import type { AttendanceRecord } from '../types';

export const LeaveAndCorrectionView: React.FC = () => {
  const {
    currentUser,
    students,
    teachers,
    attendance,
    leaveRequests,
    submitLeaveRequest,
    reviewLeaveRequest,
    correctionRequests,
    reviewCorrectionRequest,
    directCorrectAttendance,
    currentDate,
  } = useApp();

  const isAdminOrKepala = currentUser.role === 'admin' || currentUser.role === 'kepala';
  const isWaliKelas = currentUser.role === 'guru' && currentUser.is_wali_kelas;
  const canDirectCorrect = isAdminOrKepala || isWaliKelas;

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<string>(
    isAdminOrKepala ? 'izin-guru' : 'pengajuan-saya'
  );
  const [showNewLeaveModal, setShowNewLeaveModal] = useState(false);

  // Direct Correction Modal State
  const [showDirectCorrectModal, setShowDirectCorrectModal] = useState(false);
  const [directCorrectTarget, setDirectCorrectTarget] = useState<AttendanceRecord | null>(null);
  const [dcCheckInTime, setDcCheckInTime] = useState('');
  const [dcCheckOutTime, setDcCheckOutTime] = useState('');
  const [dcStatus, setDcStatus] = useState<'Hadir' | 'Izin' | 'Sakit' | 'Dinas Luar' | 'Alpa'>('Hadir');
  const [dcReason, setDcReason] = useState('');

  // Leave Form state
  const [leaveTargetType, setLeaveTargetType] = useState<'guru' | 'siswa'>(
    currentUser.role === 'siswa' ? 'siswa' : 'guru'
  );

  // If wali kelas, filter selectable students strictly to their rombel
  const selectableStudents = isWaliKelas
    ? students.filter((s) => s.rombel === currentUser.wali_kelas_rombel)
    : students;
  const [selectedStudentId, setSelectedStudentId] = useState(selectableStudents[0]?.id || '');
  const [leaveType, setLeaveType] = useState<'Izin' | 'Sakit' | 'Dinas Luar'>('Izin');
  const [startDate, setStartDate] = useState(currentDate);
  const [endDate, setEndDate] = useState(currentDate);
  const [reason, setReason] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  const handleCreateLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    try {
      if (leaveTargetType === 'guru') {
        submitLeaveRequest({
          target_type: 'guru',
          target_id: currentUser.id,
          target_name: currentUser.nama,
          target_identifier: currentUser.identifier,
          rombel: null,
          type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason,
          attachment_name: attachmentName || 'Surat_Keterangan.pdf',
        });
      } else {
        // Siswa
        const st = students.find((s) => s.id === selectedStudentId) || selectableStudents[0];
        submitLeaveRequest({
          target_type: 'siswa',
          target_id: st.id,
          target_name: st.nama,
          target_identifier: st.nisn,
          rombel: st.rombel,
          type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason,
          attachment_name: attachmentName || 'Surat_Izin_Orang_Tua.jpg',
        });
      }
      setShowNewLeaveModal(false);
      setReason('');
      setAttachmentName('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengajukan izin.';
      alert(msg);
    }
  };

  const handleOpenDirectCorrect = (record: AttendanceRecord) => {
    setDirectCorrectTarget(record);
    setDcCheckInTime(record.check_in_time ? record.check_in_time.substring(0, 5) : '');
    setDcCheckOutTime(record.check_out_time ? record.check_out_time.substring(0, 5) : '');
    setDcStatus(record.status);
    setDcReason('');
    setShowDirectCorrectModal(true);
  };

  const handleDirectCorrectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dcReason.trim()) {
      alert('Alasan koreksi wajib diisi.');
      return;
    }
    if (!directCorrectTarget) return;

    try {
      directCorrectAttendance(directCorrectTarget.id, {
        checkInTime: dcCheckInTime ? dcCheckInTime + ':00' : undefined,
        checkOutTime: dcCheckOutTime ? dcCheckOutTime + ':00' : undefined,
        status: dcStatus,
        reason: dcReason.trim(),
      });
      setShowDirectCorrectModal(false);
      setDirectCorrectTarget(null);
      alert('Koreksi langsung berhasil disimpan.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal melakukan koreksi langsung.';
      alert(msg);
    }
  };

  // Data sets partitioned by role & responsibility
  const teacherLeaves = leaveRequests.filter((r) => r.target_type === 'guru');
  const studentLeaves = isWaliKelas && !isAdminOrKepala
    ? leaveRequests.filter((r) => r.target_type === 'siswa' && r.rombel === currentUser.wali_kelas_rombel)
    : leaveRequests.filter((r) => r.target_type === 'siswa');
  const myLeaves = leaveRequests.filter(
    (r) => r.target_id === currentUser.id && r.target_type === (currentUser.role === 'siswa' ? 'siswa' : 'guru')
  );
  const myCorrections = correctionRequests.filter(
    (c) => c.target_id === currentUser.id && c.target_type === (currentUser.role === 'siswa' ? 'siswa' : 'guru')
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {isAdminOrKepala
              ? 'Verifikasi & Persetujuan Izin / Koreksi'
              : isWaliKelas
              ? 'Pengajuan Izin Guru & Persetujuan Siswa Kelas'
              : 'Pengajuan Izin & Koreksi Mandiri'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdminOrKepala
              ? 'Kepala Madrasah & Administrator memverifikasi permohonan dinas, sakit, dan koreksi presensi.'
              : isWaliKelas
              ? `Kelola izin pribadi Anda dan verifikasi izin siswa untuk kelas ${currentUser.wali_kelas_rombel}.`
              : 'Ajukan permohonan izin dinas luar, sakit, atau koreksi lupa presensi ke pimpinan madrasah.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (isWaliKelas) {
                setLeaveTargetType('guru');
              }
              setShowNewLeaveModal(true);
            }}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              {isWaliKelas ? 'Input Izin Baru (Guru/Siswa)' : 'Ajukan Izin / Sakit Baru'}
            </span>
          </button>
        </div>
      </div>

      {/* Tabs based on Role */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200">
        {isAdminOrKepala ? (
          <>
            <button
              onClick={() => setActiveTab('izin-guru')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'izin-guru'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Persetujuan Izin Guru ({teacherLeaves.filter((r) => r.status === 'Menunggu').length} Menunggu)
            </button>
            <button
              onClick={() => setActiveTab('izin-siswa')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'izin-siswa'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Persetujuan Izin Siswa ({studentLeaves.filter((r) => r.status === 'Menunggu').length} Menunggu)
            </button>
            <button
              onClick={() => setActiveTab('koreksi')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'koreksi'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Persetujuan Koreksi Absen ({correctionRequests.filter((c) => c.status === 'Menunggu').length} Menunggu)
            </button>
            <button
              onClick={() => setActiveTab('koreksi-langsung')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'koreksi-langsung'
                  ? 'border-blue-700 text-blue-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Koreksi Langsung Absensi
            </button>
          </>
        ) : isWaliKelas ? (
          <>
            <button
              onClick={() => setActiveTab('pengajuan-saya')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'pengajuan-saya'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Pengajuan Izin Mandiri Saya ({myLeaves.length})
            </button>
            <button
              onClick={() => setActiveTab('koreksi-saya')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'koreksi-saya'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Pengajuan Koreksi Saya ({myCorrections.length})
            </button>
            <button
              onClick={() => setActiveTab('izin-siswa-binaan')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'izin-siswa-binaan'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Persetujuan Izin Siswa ({currentUser.wali_kelas_rombel}) ({studentLeaves.filter((r) => r.status === 'Menunggu').length} Menunggu)
            </button>
            <button
              onClick={() => setActiveTab('koreksi-langsung')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'koreksi-langsung'
                  ? 'border-blue-700 text-blue-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Koreksi Langsung Siswa
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('pengajuan-saya')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'pengajuan-saya'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Pengajuan Izin Mandiri Saya ({myLeaves.length})
            </button>
            <button
              onClick={() => setActiveTab('koreksi-saya')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'koreksi-saya'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Pengajuan Koreksi Saya ({myCorrections.length})
            </button>
          </>
        )}
      </div>

      {/* Tab: Persetujuan Izin Guru (Admin / Kepala) */}
      {isAdminOrKepala && activeTab === 'izin-guru' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span>Daftar Permohonan Izin / Dinas Luar Guru</span>
            <span className="text-[11px] text-slate-500 font-normal">
              Kepala Madrasah & Admin berwenang memberikan persetujuan resmi.
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/50 text-slate-600 border-b border-slate-200 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="py-3 px-4">Nama Guru</th>
                  <th className="py-3 px-4">Jenis Izin</th>
                  <th className="py-3 px-4">Rentang Waktu</th>
                  <th className="py-3 px-4">Alasan & Lampiran</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reviewer</th>
                  <th className="py-3 px-4 text-right">Tindakan Persetujuan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teacherLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Tidak ada permohonan izin guru saat ini.
                    </td>
                  </tr>
                ) : (
                  teacherLeaves.map((req) => {
                    const isPending = req.status === 'Menunggu';
                    return (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{req.target_name}</p>
                          <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                            NIP. {req.target_identifier}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-semibold ${
                              req.type === 'Sakit'
                                ? 'text-amber-700'
                                : req.type === 'Dinas Luar'
                                ? 'text-purple-700'
                                : 'text-blue-700'
                            }`}
                          >
                            {req.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-700 tabular-nums">
                          {formatShortDate(req.start_date)} s.d. {formatShortDate(req.end_date)}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <p className="text-slate-800 line-clamp-2">{req.reason}</p>
                          {req.attachment_name && (
                            <span className="text-[10px] text-emerald-700 underline font-medium block mt-0.5">
                              📎 {req.attachment_name}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          <span
                            className={
                              req.status === 'Disetujui'
                                ? 'text-emerald-700'
                                : req.status === 'Ditolak'
                                ? 'text-red-600'
                                : 'text-amber-600'
                            }
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-500">
                          {req.reviewed_by || '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => reviewLeaveRequest(req.id, 'Disetujui')}
                                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                Setujui
                              </button>
                              <button
                                onClick={() => reviewLeaveRequest(req.id, 'Ditolak')}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">Selesai</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Persetujuan Izin Siswa (Admin & Kepala Madrasah) */}
      {isAdminOrKepala && activeTab === 'izin-siswa' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span>Daftar Permohonan Izin / Sakit Seluruh Siswa</span>
            <span className="text-[11px] text-slate-500 font-normal">
              Data terintegrasi dari laporan orang tua dan wali kelas.
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/50 text-slate-600 border-b border-slate-200 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="py-3 px-4">Nama Siswa & Rombel</th>
                  <th className="py-3 px-4">Jenis</th>
                  <th className="py-3 px-4">Rentang Waktu</th>
                  <th className="py-3 px-4">Alasan & Dokumen</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Pemeriksa</th>
                  <th className="py-3 px-4 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Tidak ada permohonan izin siswa saat ini.
                    </td>
                  </tr>
                ) : (
                  studentLeaves.map((req) => {
                    const isPending = req.status === 'Menunggu';
                    return (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{req.target_name}</p>
                          <p className="text-[11px] text-emerald-800 font-semibold">
                            {req.rombel} • <span className="font-mono text-slate-500 font-normal">NISN: {req.target_identifier}</span>
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-semibold ${
                              req.type === 'Sakit' ? 'text-amber-700' : 'text-blue-700'
                            }`}
                          >
                            {req.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-700 tabular-nums">
                          {formatShortDate(req.start_date)} s.d. {formatShortDate(req.end_date)}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <p className="text-slate-800 line-clamp-2">{req.reason}</p>
                          {req.attachment_name && (
                            <span className="text-[10px] text-emerald-700 underline font-medium block mt-0.5">
                              📎 {req.attachment_name}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          <span
                            className={
                              req.status === 'Disetujui'
                                ? 'text-emerald-700'
                                : req.status === 'Ditolak'
                                ? 'text-red-600'
                                : 'text-amber-600'
                            }
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-500">
                          {req.reviewed_by || '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => reviewLeaveRequest(req.id, 'Disetujui')}
                                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                Setujui
                              </button>
                              <button
                                onClick={() => reviewLeaveRequest(req.id, 'Ditolak')}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">Selesai</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Persetujuan Izin Siswa Kelas Binaan (Wali Kelas) */}
      {!isAdminOrKepala && isWaliKelas && activeTab === 'izin-siswa-binaan' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-3.5 bg-emerald-50 border-b border-emerald-200 text-xs font-semibold text-emerald-950 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-700" />
              <span>Verifikasi Izin Siswa Kelas Binaan: {currentUser.wali_kelas_rombel}</span>
            </span>
            <span className="text-[11px] text-emerald-800 font-normal">
              Sebagai wali kelas, Anda berwenang menyetujui izin siswa di rombel ini.
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">Jenis</th>
                  <th className="py-3 px-4">Rentang Waktu</th>
                  <th className="py-3 px-4">Alasan & Keterangan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Pemeriksa</th>
                  <th className="py-3 px-4 text-right">Tindakan Wali Kelas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Tidak ada permohonan izin untuk kelas {currentUser.wali_kelas_rombel}.
                    </td>
                  </tr>
                ) : (
                  studentLeaves.map((req) => {
                    const isPending = req.status === 'Menunggu';
                    return (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{req.target_name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">NISN: {req.target_identifier}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-semibold ${
                              req.type === 'Sakit' ? 'text-amber-700' : 'text-blue-700'
                            }`}
                          >
                            {req.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-700 tabular-nums">
                          {formatShortDate(req.start_date)} s.d. {formatShortDate(req.end_date)}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <p className="text-slate-800 line-clamp-2">{req.reason}</p>
                          {req.attachment_name && (
                            <span className="text-[10px] text-emerald-700 underline font-medium block mt-0.5">
                              📎 {req.attachment_name}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          <span
                            className={
                              req.status === 'Disetujui'
                                ? 'text-emerald-700'
                                : req.status === 'Ditolak'
                                ? 'text-red-600'
                                : 'text-amber-600'
                            }
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-500">
                          {req.reviewed_by || '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => reviewLeaveRequest(req.id, 'Disetujui')}
                                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                Setujui
                              </button>
                              <button
                                onClick={() => reviewLeaveRequest(req.id, 'Ditolak')}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">Selesai</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Pengajuan Izin Mandiri Saya (Guru) */}
      {!isAdminOrKepala && activeTab === 'pengajuan-saya' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span>Riwayat Pengajuan Izin / Dinas Luar Mandiri</span>
            <span className="text-[11px] text-slate-500 font-normal">
              Status diverifikasi oleh Kepala Madrasah / Admin.
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/50 text-slate-600 border-b border-slate-200 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="py-3 px-4">Jenis Permohonan</th>
                  <th className="py-3 px-4">Rentang Waktu</th>
                  <th className="py-3 px-4">Alasan & Dokumen</th>
                  <th className="py-3 px-4">Status Pengajuan</th>
                  <th className="py-3 px-4">Catatan Pimpinan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Anda belum pernah mengajukan izin atau dinas luar.
                    </td>
                  </tr>
                ) : (
                  myLeaves.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {req.type}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-700 tabular-nums">
                        {formatShortDate(req.start_date)} s.d. {formatShortDate(req.end_date)}
                      </td>
                      <td className="py-3 px-4 max-w-xs text-slate-700">
                        <p>{req.reason}</p>
                        {req.attachment_name && (
                          <span className="text-[10px] text-emerald-700 underline font-medium block mt-0.5">
                            📎 {req.attachment_name}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        <span
                          className={
                            req.status === 'Disetujui'
                              ? 'text-emerald-700'
                              : req.status === 'Ditolak'
                              ? 'text-red-600'
                              : 'text-amber-600'
                          }
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-500">
                        {req.reviewed_by ? (
                          <>
                            <p className="text-slate-800 font-semibold">{req.reviewed_by}</p>
                            <p className="text-slate-500 italic mt-0.5">{req.review_notes || '-'}</p>
                          </>
                        ) : (
                          <span className="text-slate-400 italic">Menunggu Keputusan</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Pengajuan Koreksi Saya (Guru) */}
      {!isAdminOrKepala && activeTab === 'koreksi-saya' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span>Riwayat Koreksi Lupa Presensi Pribadi</span>
            <span className="text-[11px] text-slate-500 font-normal">
              Diverifikasi oleh Kepala Madrasah.
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/50 text-slate-600 border-b border-slate-200 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="py-3 px-4">Tanggal Koreksi</th>
                  <th className="py-3 px-4">Jam Masuk / Pulang Diajukan</th>
                  <th className="py-3 px-4">Alasan Kendala</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Pemeriksa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myCorrections.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Anda belum memiliki riwayat pengajuan koreksi presensi.
                    </td>
                  </tr>
                ) : (
                  myCorrections.map((cor) => (
                    <tr key={cor.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] font-bold text-slate-900 tabular-nums">
                        {cor.date}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-700 tabular-nums">
                        {cor.requested_check_in?.substring(0, 5) || '-'} s.d.{' '}
                        {cor.requested_check_out?.substring(0, 5) || '-'} WIB
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs">
                        {cor.reason}
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        <span
                          className={
                            cor.status === 'Disetujui'
                              ? 'text-emerald-700'
                              : cor.status === 'Ditolak'
                              ? 'text-red-600'
                              : 'text-amber-600'
                          }
                        >
                          {cor.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-500">
                        {cor.reviewed_by || 'Menunggu verifikasi pimpinan'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Persetujuan Koreksi Absensi (Admin & Kepala) */}
      {isAdminOrKepala && activeTab === 'koreksi' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span>Daftar Pengajuan Koreksi Presensi Guru & Siswa</span>
            <span className="text-[11px] text-slate-500 font-normal">
              Menyetujui akan langsung mengubah data historis dengan penanda "Dikoreksi".
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/50 text-slate-600 border-b border-slate-200 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="py-3 px-4">Nama Pemohon</th>
                  <th className="py-3 px-4">Tanggal Diubah</th>
                  <th className="py-3 px-4">Jam Masuk / Pulang</th>
                  <th className="py-3 px-4">Alasan Pengajuan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Pemeriksa</th>
                  <th className="py-3 px-4 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {correctionRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Tidak ada pengajuan koreksi presensi saat ini.
                    </td>
                  </tr>
                ) : (
                  correctionRequests.map((cor) => {
                    const isPending = cor.status === 'Menunggu';
                    return (
                      <tr key={cor.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{cor.target_name}</p>
                          <p className="text-[11px] text-slate-500">
                            {cor.target_type === 'guru' ? 'Guru' : cor.rombel} • {cor.target_identifier}
                          </p>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-800 tabular-nums">
                          {cor.date}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-700 tabular-nums">
                          {cor.requested_check_in?.substring(0, 5) || '-'} s.d.{' '}
                          {cor.requested_check_out?.substring(0, 5) || '-'} WIB
                        </td>
                        <td className="py-3 px-4 text-slate-700 max-w-xs">
                          {cor.reason}
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          <span
                            className={
                              cor.status === 'Disetujui'
                                ? 'text-emerald-700'
                                : cor.status === 'Ditolak'
                                ? 'text-red-600'
                                : 'text-amber-600'
                            }
                          >
                            {cor.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-500">
                          {cor.reviewed_by || '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => reviewCorrectionRequest(cor.id, 'Disetujui')}
                                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                Setujui
                              </button>
                              <button
                                onClick={() => reviewCorrectionRequest(cor.id, 'Ditolak')}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">Selesai</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Koreksi Langsung Absensi (Admin & Kepala) */}
      {isAdminOrKepala && activeTab === 'koreksi-langsung' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-3.5 bg-blue-50 border-b border-slate-200 text-xs font-semibold text-blue-800 flex items-center justify-between">
            <span>Koreksi Langsung Absensi (Semua Guru & Siswa)</span>
            <span className="text-[11px] text-blue-600 font-normal">
              Perubahan langsung terekam di riwayat dengan penanda "Koreksi Langsung Admin/Kepala".
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/50 text-slate-600 border-b border-slate-200 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="py-3 px-4">Nama</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Jam Masuk</th>
                  <th className="py-3 px-4">Jam Pulang</th>
                  <th className="py-3 px-4">Status Saat Ini</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Rombel</th>
                  <th className="py-3 px-4 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Tidak ada data absensi.
                    </td>
                  </tr>
                ) : (
                  attendance
                    .slice()
                    .sort((a, b) => (b.date + (b.check_in_time || '')).localeCompare(a.date + (a.check_in_time || '')))
                    .map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{rec.target_name}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-800 tabular-nums">{rec.date}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-700 tabular-nums">{rec.check_in_time?.substring(0, 5) || '-'}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-700 tabular-nums">{rec.check_out_time?.substring(0, 5) || '-'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={
                              rec.status === 'Hadir'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rec.status === 'Izin'
                                ? 'bg-blue-100 text-blue-800'
                                : rec.status === 'Sakit'
                                ? 'bg-amber-100 text-amber-800'
                                : rec.status === 'Dinas Luar'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-500 capitalize">{rec.target_type}</td>
                        <td className="py-3 px-4 text-[11px] text-slate-500">{rec.rombel || '-'}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenDirectCorrect(rec)}
                            className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Koreksi
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Koreksi Langsung Siswa (Wali Kelas) */}
      {isWaliKelas && activeTab === 'koreksi-langsung' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-3.5 bg-blue-50 border-b border-slate-200 text-xs font-semibold text-blue-800 flex items-center justify-between">
            <span>Koreksi Langsung Absensi Siswa Kelas {currentUser.wali_kelas_rombel}</span>
            <span className="text-[11px] text-blue-600 font-normal">
              Perubahan langsung terekam di riwayat dengan penanda "Koreksi Langsung Wali Kelas".
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/50 text-slate-600 border-b border-slate-200 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Jam Masuk</th>
                  <th className="py-3 px-4">Jam Pulang</th>
                  <th className="py-3 px-4">Status Saat Ini</th>
                  <th className="py-3 px-4 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendance
                  .filter((a) => a.target_type === 'siswa' && a.rombel === currentUser.wali_kelas_rombel)
                  .slice()
                  .sort((a, b) => (b.date + (b.check_in_time || '')).localeCompare(a.date + (a.check_in_time || '')))
                  .map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{rec.target_name}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-800 tabular-nums">{rec.date}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-700 tabular-nums">{rec.check_in_time?.substring(0, 5) || '-'}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-700 tabular-nums">{rec.check_out_time?.substring(0, 5) || '-'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={
                            rec.status === 'Hadir'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.status === 'Izin'
                              ? 'bg-blue-100 text-blue-800'
                              : rec.status === 'Sakit'
                              ? 'bg-amber-100 text-amber-800'
                              : rec.status === 'Dinas Luar'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenDirectCorrect(rec)}
                          className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Koreksi
                        </button>
                      </td>
                    </tr>
                  ))
                  .length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Tidak ada data absensi siswa untuk kelas ini.
                      </td>
                    </tr>
                  ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Pengajuan Izin Baru */}
      {showNewLeaveModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900">
              Formulir Permohonan Izin / Sakit / Dinas Luar
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Data izin yang disetujui akan secara otomatis memperbarui status kehadiran pada hari bersangkutan.
            </p>

            <form onSubmit={handleCreateLeave} className="space-y-4 mt-4">
              {/* Target Selector */}
              {isWaliKelas && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Pemohon
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLeaveTargetType('guru')}
                      className={`p-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        leaveTargetType === 'guru'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Diri Sendiri (Guru)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaveTargetType('siswa')}
                      className={`p-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        leaveTargetType === 'siswa'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Siswa Kelas ({currentUser.wali_kelas_rombel})
                    </button>
                  </div>
                </div>
              )}

              {isAdminOrKepala && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Pemohon
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLeaveTargetType('guru')}
                      className={`p-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        leaveTargetType === 'guru'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Guru / Pegawai
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaveTargetType('siswa')}
                      className={`p-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        leaveTargetType === 'siswa'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Siswa Madrasah
                    </button>
                  </div>
                </div>
              )}

              {leaveTargetType === 'siswa' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih Siswa
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {selectableStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.nama} ({st.rombel}) - NISN: {st.nisn}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jenis Izin
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLeaveType('Izin')}
                    className={`p-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      leaveType === 'Izin'
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Izin Pribadi
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaveType('Sakit')}
                    className={`p-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      leaveType === 'Sakit'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Sakit
                  </button>
                  {leaveTargetType === 'guru' && (
                    <button
                      type="button"
                      onClick={() => setLeaveType('Dinas Luar')}
                      className={`p-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        leaveType === 'Dinas Luar'
                          ? 'bg-purple-50 text-purple-800 border-purple-300'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Dinas Luar
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan / Keterangan Lengkap
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Jelaskan alasan izin, sakit, atau tugas dinas luar..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-700"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Dokumen Lampiran (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Surat_Keterangan_Dokter.pdf atau Surat_Tugas_Balai.pdf"
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewLeaveModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Permohonan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Koreksi Langsung Absensi */}
      {showDirectCorrectModal && directCorrectTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900">
              Koreksi Langsung Absensi
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Perubahan akan langsung terekam di riwayat dengan penanda koreksi langsung.
            </p>

            <form onSubmit={handleDirectCorrectSubmit} className="space-y-4 mt-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-900">{directCorrectTarget.target_name}</p>
                <p className="text-[11px] text-slate-500">
                  {directCorrectTarget.target_type === 'guru' ? 'Guru' : 'Siswa'} {directCorrectTarget.target_type === 'siswa' ? '• ' + directCorrectTarget.rombel : ''} • {directCorrectTarget.date}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jam Masuk
                  </label>
                  <input
                    type="time"
                    value={dcCheckInTime}
                    onChange={(e) => setDcCheckInTime(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jam Pulang
                  </label>
                  <input
                    type="time"
                    value={dcCheckOutTime}
                    onChange={(e) => setDcCheckOutTime(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Kehadiran
                </label>
                <select
                  value={dcStatus}
                  onChange={(e) => setDcStatus(e.target.value as 'Hadir' | 'Izin' | 'Sakit' | 'Dinas Luar' | 'Alpa')}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Hadir">Hadir</option>
                  <option value="Izin">Izin</option>
                  <option value="Sakit">Sakit</option>
                  <option value="Dinas Luar">Dinas Luar</option>
                  <option value="Alpa">Alpa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Koreksi <span className="text-red-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Jelaskan alasan koreksi langsung ini..."
                  value={dcReason}
                  onChange={(e) => setDcReason(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-700"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDirectCorrectModal(false);
                    setDirectCorrectTarget(null);
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Koreksi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
