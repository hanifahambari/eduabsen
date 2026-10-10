import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  calculateDistanceInMeters,
  getCurrentPosition,
} from '../utils/geo';
import {
  formatIndonesianDate,
  isWeeklyHoliday,
  getTeacherEffectiveSchedule,
} from '../utils/dateTime';
import {
  MapPin,
  Navigation,
  Clock,
  CheckCircle,
  AlertCircle,
  RotateCw,
  Info,
  Calendar,
  Send,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const TeacherAttendanceView: React.FC = () => {
  const {
    currentUser,
    config,
    schedule,
    teachers,
    currentTime,
    currentDate,
    attendance,
    recordTeacherAttendance,
    submitCorrectionRequest,
  } = useApp();

  // Jadwal efektif guru aktif hari ini
  const todayDateObj = new Date();
  const currentTeacherObj = teachers.find((t) => t.id === currentUser.id);
  const myScheduleToday = getTeacherEffectiveSchedule(
    currentTeacherObj,
    todayDateObj.getDay(),
    schedule
  );

  // Location state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
    distance: number;
    source: 'device' | 'preset';
    label: string;
  }>({
    lat: config.latitude + 0.0001,
    lng: config.longitude + 0.0001,
    distance: 18,
    accuracy: 12,
    source: 'preset',
    label: 'Area Madrasah (Titik Utama)',
  });

  const [locationError, setLocationError] = useState<string | null>(null);
  const [actionAlert, setActionAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Correction Modal State
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [corDate, setCorDate] = useState(currentDate);
  const [corInTime, setCorInTime] = useState('06:55');
  const [corOutTime, setCorOutTime] = useState('15:05');
  const [corReason, setCorReason] = useState('');
  const [corSuccess, setCorSuccess] = useState(false);

  // Attendance Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAttendanceType, setPendingAttendanceType] = useState<'in' | 'out' | null>(null);

  // Today's attendance for the active teacher
  const todayRecord = attendance.find(
    (a) =>
      a.targetType === 'guru' &&
      a.targetId === currentUser.id &&
      a.date === currentDate
  );

  // All history for this teacher
  const teacherHistory = attendance
    .filter((a) => a.targetType === 'guru' && a.targetId === currentUser.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  // Fetch real device GPS
  const fetchRealGps = async () => {
    setGpsLoading(true);
    setLocationError(null);
    try {
      const pos = await getCurrentPosition();
      const dist = calculateDistanceInMeters(
        pos.latitude,
        pos.longitude,
        config.latitude,
        config.longitude
      );
      setCurrentCoords({
        lat: pos.latitude,
        lng: pos.longitude,
        accuracy: pos.accuracy,
        distance: dist,
        source: 'device',
        label: `GPS Perangkat Aktual (Akurasi ±${pos.accuracy}m)`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengakses GPS perangkat.';
      setLocationError(msg);
    } finally {
      setGpsLoading(false);
    }
  };

  // Set location preset (helpful for simulation / testing on desktop)
  const applyPresetLocation = (type: 'in-radius' | 'near-gate' | 'out-radius') => {
    setLocationError(null);
    if (type === 'in-radius') {
      const dist = 22;
      setCurrentCoords({
        lat: config.latitude + 0.00015,
        lng: config.longitude + 0.00012,
        accuracy: 8,
        distance: dist,
        source: 'preset',
        label: 'Ruang Guru & Tata Usaha (Dalam Radius)',
      });
    } else if (type === 'near-gate') {
      const dist = 48;
      setCurrentCoords({
        lat: config.latitude + 0.00035,
        lng: config.longitude + 0.00025,
        accuracy: 10,
        distance: dist,
        source: 'preset',
        label: 'Gerbang Masuk Madrasah (Dalam Radius)',
      });
    } else {
      const dist = 380;
      setCurrentCoords({
        lat: config.latitude + 0.003,
        lng: config.longitude + 0.003,
        accuracy: 15,
        distance: dist,
        source: 'preset',
        label: 'Di Luar Area Madrasah (Jarak 380 meter)',
      });
    }
  };

  const isWithinRadius = currentCoords.distance <= config.radiusMeter;

  // Open confirmation modal for attendance
  const openAttendanceConfirm = (type: 'in' | 'out') => {
    setPendingAttendanceType(type);
    setShowConfirmModal(true);
  };

  // Execute attendance after confirmation
  const executeAttendance = (type: 'in' | 'out') => {
    setActionAlert(null);
    const result = recordTeacherAttendance(type, {
      lat: currentCoords.lat,
      lng: currentCoords.lng,
      distance: currentCoords.distance,
      accuracy: currentCoords.accuracy,
      isSimulated: currentCoords.source === 'preset',
    });

    if (result.success) {
      setActionAlert({
        type: 'success',
        message: result.message,
      });
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
    } else {
      setActionAlert({
        type: 'error',
        message: result.message,
      });
    }
    setShowConfirmModal(false);
    setPendingAttendanceType(null);
  };

  const handleCorrectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!corReason.trim()) return;

    try {
      submitCorrectionRequest({
        targetType: 'guru',
        targetId: currentUser.id,
        targetName: currentUser.nama,
        targetIdentifier: currentUser.identifier,
        date: corDate,
        requestedCheckIn: corInTime + ':00',
        requestedCheckOut: corOutTime + ':00',
        requestedStatus: 'Hadir',
        reason: corReason,
      });

      setCorSuccess(true);
      setTimeout(() => {
        setCorSuccess(false);
        setShowCorrectionModal(false);
        setCorReason('');
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengajukan koreksi.';
      alert(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Presensi Mandiri Guru Berbasis Geo-Tagging
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mencatat kehadiran guru secara cepat dan akurat menggunakan verifikasi koordinat GPS.
          </p>
        </div>
        <button
          onClick={() => setShowCorrectionModal(true)}
          className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>Ajukan Koreksi Lupa Absen</span>
        </button>
      </div>

      {actionAlert && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start gap-3 transition-all ${
            actionAlert.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {actionAlert.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {actionAlert.type === 'success' ? 'Presensi Berhasil' : 'Presensi Ditolak'}
            </p>
            <p className="mt-0.5 text-slate-700">{actionAlert.message}</p>
          </div>
          <button
            onClick={() => setActionAlert(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: GPS Radar & 1-Tap Attendance Action */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Radar & GPS Status - 5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-emerald-700" />
                <span>Status Geo-Tagging Lokasi</span>
              </h3>
              <button
                onClick={fetchRealGps}
                disabled={gpsLoading}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Perbarui koordinat dari GPS HP"
              >
                <RotateCw className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
                <span>{gpsLoading ? 'Mencari...' : 'Perbarui GPS'}</span>
              </button>
            </div>

            {/* Visual Radar Gauge */}
            <div className="relative my-6 flex flex-col items-center justify-center">
              <div
                className={`relative w-44 h-44 rounded-full border-2 flex items-center justify-center transition-all ${
                  isWithinRadius
                    ? 'border-emerald-300 bg-emerald-50/50'
                    : 'border-red-300 bg-red-50/50'
                }`}
              >
                <div
                  className={`absolute w-32 h-32 rounded-full border border-dashed ${
                    isWithinRadius ? 'border-emerald-200' : 'border-red-200'
                  }`}
                ></div>
                <div
                  className={`absolute w-20 h-20 rounded-full border ${
                    isWithinRadius ? 'border-emerald-300/60' : 'border-red-300/60'
                  }`}
                ></div>
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm text-white ${
                    isWithinRadius ? 'bg-emerald-600' : 'bg-red-500'
                  }`}
                >
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="absolute -bottom-3 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-xs text-center">
                  <span className="font-mono font-bold text-xs tabular-nums text-slate-900">
                    {currentCoords.distance} meter
                  </span>
                  <span className="text-[10px] text-slate-500 ml-1">dari madrasah</span>
                </div>
              </div>
            </div>

            {/* Radius Badge & Location Details */}
            <div className="space-y-2.5 mt-2">
              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                  isWithinRadius
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-red-50/80 border-red-200 text-red-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      isWithinRadius ? 'bg-emerald-600' : 'bg-red-600'
                    }`}
                  ></div>
                  <span className="font-bold">
                    {isWithinRadius ? 'Di Dalam Radius Madrasah' : 'Di Luar Radius (Ditolak)'}
                  </span>
                </div>
                <span className="font-mono text-[11px] font-semibold tabular-nums">
                  Batas Max: {config.radiusMeter}m
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Titik Madrasah:</span>
                  <span className="font-mono text-[11px] text-slate-800">
                    {config.latitude.toFixed(5)}, {config.longitude.toFixed(5)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Posisi Anda:</span>
                  <span className="font-mono text-[11px] text-slate-800">
                    {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Keterangan:</span>
                  <span className="text-slate-800 font-medium truncate max-w-[180px]">
                    {currentCoords.label}
                  </span>
                </div>
                {currentCoords.accuracy !== undefined && (
                  <div className="flex justify-between border-t border-slate-200/80 pt-1.5">
                    <span className="text-slate-500">Akurasi GPS:</span>
                    <span className={`font-mono text-[11px] font-semibold ${currentCoords.accuracy <= config.accuracyThresholdMeter ? 'text-emerald-700' : 'text-amber-700'}`}>
                      ±{currentCoords.accuracy}m {currentCoords.accuracy <= config.accuracyThresholdMeter ? '(Valid)' : '(Di Atas Batas)'}
                    </span>
                  </div>
                )}
              </div>

              {locationError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold">Perhatian GPS:</p>
                      <p className="text-[11px] text-amber-800 mt-0.5">{locationError}</p>
                    </div>
                  </div>
                  <div className="p-2.5 bg-white border border-amber-100 rounded-lg space-y-1.5">
                    <p className="font-semibold text-slate-800 text-[11px]">Solusi Cepat:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] text-slate-700">
                      <div className="flex items-start gap-1">
                        <span className="text-emerald-600 shrink-0">✓</span>
                        <span><strong>Android (Chrome):</strong> 🔒 di bilah URL → Setelan Situs → Lokasi → "Izinkan" → Refresh</span>
                      </div>
                      <div className="flex items-start gap-1">
                        <span className="text-emerald-600 shrink-0">✓</span>
                        <span><strong>iPhone (Safari):</strong> Pengaturan → Safari → Lokasi → "Izinkan" → Refresh Safari</span>
                      </div>
                      <div className="flex items-start gap-1">
                        <span className="text-emerald-600 shrink-0">✓</span>
                        <span><strong>Aktifkan GPS HP</strong> (Mode Akurasi Tinggi), bukan hanya jaringan seluler/Wi-Fi</span>
                      </div>
                      <div className="flex items-start gap-1">
                        <span className="text-emerald-600 shrink-0">✓</span>
                        <span><strong>Keluar area terbuka</strong> sebentar untuk kunci satelit GPS, lalu tekan "Perbarui GPS"</span>
                      </div>
                    </div>
                    <p className="font-semibold text-slate-800 text-[11px] pt-1 border-t border-amber-100">Uji Coba Desktop:</p>
                    <p className="text-[10px] text-amber-700">Gunakan tombol simulasi di bawah (Ruang Guru / Gerbang / Luar Area) untuk menguji tanpa GPS fisik.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Testing Simulator Presets */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Simulasi Titik Lokasi (Uji Coba Pengujian):
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPresetLocation('in-radius')}
                  className="px-2 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 rounded text-[11px] font-medium text-slate-700 transition-colors cursor-pointer text-center"
                >
                  Ruang Guru (22m)
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetLocation('near-gate')}
                  className="px-2 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 rounded text-[11px] font-medium text-slate-700 transition-colors cursor-pointer text-center"
                >
                  Gerbang (48m)
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetLocation('out-radius')}
                  className="px-2 py-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-800 hover:border-red-300 border border-slate-200 rounded text-[11px] font-medium text-slate-700 transition-colors cursor-pointer text-center"
                >
                  Luar Area (380m)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1-Tap Primary Action & Attendance Status - 7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Presensi Hari Ini
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="text-base font-bold text-slate-900">
                    {formatIndonesianDate(currentDate)}
                  </h3>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isWeeklyHoliday(currentDate)
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isWeeklyHoliday(currentDate) ? "Libur Jum'at" : 'Hari Aktif'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Jam Resmi Server
                </span>
                <span className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {currentTime} WIB
                </span>
              </div>
            </div>

            {/* Personalized Teacher Schedule Banner Today */}
            <div
              className={`mt-3 p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                !myScheduleToday.aktif
                  ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                  : myScheduleToday.isOverride
                  ? 'bg-indigo-50/80 border-indigo-200 text-indigo-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock
                  className={`w-4 h-4 shrink-0 ${
                    !myScheduleToday.aktif
                      ? 'text-amber-600'
                      : myScheduleToday.isOverride
                      ? 'text-indigo-600'
                      : 'text-emerald-600'
                  }`}
                />
                <div>
                  <span className="font-bold">
                    {!myScheduleToday.aktif
                      ? 'Hari Bebas Mengajar / Off'
                      : myScheduleToday.isOverride
                      ? 'Jadwal Khusus Mengajar (Override)'
                      : 'Jadwal Standar Madrasah'}
                    :
                  </span>{' '}
                  <span>
                    {!myScheduleToday.aktif
                      ? 'Hari ini Anda tidak memiliki jadwal tugas mengajar. Presensi bersifat opsional.'
                      : `Masuk: ${myScheduleToday.jamMasuk} s.d. Pulang: ${myScheduleToday.jamPulang} WIB (Batas Masuk: ${myScheduleToday.batasTerlambat} WIB)`}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white border border-current shrink-0">
                {!myScheduleToday.aktif
                  ? 'Off'
                  : myScheduleToday.isOverride
                  ? 'Override'
                  : 'Standar'}
              </span>
            </div>

            {/* Teacher Today's Status Card */}
            <div className="my-5 grid grid-cols-2 gap-4">
              {/* Check-In Card */}
              <div
                className={`p-4 rounded-xl border ${
                  todayRecord?.checkInTime
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium">Absen Masuk</span>
                  {todayRecord?.checkInTime ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="mt-2">
                  <span className="font-mono text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
                    {todayRecord?.checkInTime || '--:--'}
                  </span>
                  <span className="text-xs text-slate-500 ml-1">WIB</span>
                </div>
                <div className="mt-1 text-[11px]">
                  {todayRecord?.checkInTime ? (
                    <span
                      className={`font-semibold ${
                        todayRecord.flags.includes('Terlambat')
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {todayRecord.flags.includes('Terlambat')
                        ? 'Terlambat'
                        : 'Tepat Waktu'}{' '}
                      • {todayRecord.checkInDistance}m
                    </span>
                  ) : (
                    <span className="text-slate-500">
                      Batas tepat waktu:{' '}
                      {myScheduleToday.batasTerlambat !== '-'
                        ? myScheduleToday.batasTerlambat
                        : schedule.batasTerlambatGuru}{' '}
                      WIB
                    </span>
                  )}
                </div>
              </div>

              {/* Check-Out Card */}
              <div
                className={`p-4 rounded-xl border ${
                  todayRecord?.checkOutTime
                    ? 'bg-blue-50/50 border-blue-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium">Absen Pulang</span>
                  {todayRecord?.checkOutTime ? (
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="mt-2">
                  <span className="font-mono text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
                    {todayRecord?.checkOutTime || '--:--'}
                  </span>
                  <span className="text-xs text-slate-500 ml-1">WIB</span>
                </div>
                <div className="mt-1 text-[11px]">
                  {todayRecord?.checkOutTime ? (
                    <span className="text-blue-700 font-semibold">
                      Tercatat Pulang • {todayRecord.checkOutDistance}m
                    </span>
                  ) : (
                    <span className="text-slate-500">
                      Jam kepulangan:{' '}
                      {myScheduleToday.jamPulang !== '-'
                        ? myScheduleToday.jamPulang
                        : schedule.jamPulangGuru}{' '}
                      WIB
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 1-Tap Attendance Primary Buttons */}
            <div className="space-y-3">
              {!todayRecord?.checkInTime ? (
                <button
                  type="button"
                  onClick={() => openAttendanceConfirm('in')}
                  disabled={!isWithinRadius}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                    isWithinRadius
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <MapPin className="w-5 h-5" />
                  <span>
                    {isWithinRadius
                      ? 'Absen Masuk Sekarang (1-Ketukan)'
                      : `Tidak Bisa Absen (Di Luar Radius: ${currentCoords.distance}m)`}
                  </span>
                </button>
              ) : !todayRecord?.checkOutTime ? (
                <button
                  type="button"
                  onClick={() => openAttendanceConfirm('out')}
                  disabled={!isWithinRadius}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                    isWithinRadius
                      ? 'bg-blue-700 hover:bg-blue-800 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <MapPin className="w-5 h-5" />
                  <span>
                    {isWithinRadius
                      ? 'Absen Pulang Sekarang (1-Ketukan)'
                      : `Tidak Bisa Absen Pulang (Di Luar Radius: ${currentCoords.distance}m)`}
                  </span>
                </button>
              ) : (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-900 font-semibold flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-700" />
                  <span>Kehadiran Anda hari ini telah lengkap (Masuk & Pulang tercatat).</span>
                </div>
              )}
              <p className="text-[11px] text-slate-500 text-center">
                Lokasi GPS hanya diperiksa saat tombol ditekan dan tidak dilacak terus-menerus.
              </p>
            </div>
          </div>

          {/* Teacher Attendance History */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Riwayat Kehadiran Saya
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-y border-slate-200 font-semibold text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Jam Masuk</th>
                    <th className="py-2.5 px-3">Jam Pulang</th>
                    <th className="py-2.5 px-3">Jarak</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teacherHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        Belum ada riwayat absensi.
                      </td>
                    </tr>
                  ) : (
                    teacherHistory.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {rec.date}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-800">
                          {rec.checkInTime ? rec.checkInTime.substring(0, 5) : '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-800">
                          {rec.checkOutTime ? rec.checkOutTime.substring(0, 5) : '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600">
                          {rec.checkInDistance !== undefined ? `${rec.checkInDistance}m` : '-'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold">
                          <span
                            className={
                              rec.status === 'Hadir'
                                ? rec.flags.includes('Terlambat')
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                                : 'text-blue-700'
                            }
                          >
                            {rec.status}
                            {rec.isCorrected ? ' (Dikoreksi)' : ''}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 truncate max-w-[150px]">
                          {rec.notes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Pengajuan Koreksi */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900">
              Pengajuan Koreksi Absensi Guru
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Gunakan formulir ini apabila lupa melakukan presensi atau kendala teknis perangkat pada hari sebelumnya.
            </p>

            {corSuccess ? (
              <div className="my-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs text-center">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="font-bold">Pengajuan Koreksi Berhasil Terkirim!</p>
                <p className="text-slate-600 mt-0.5">
                  Menunggu verifikasi dan persetujuan dari Kepala Madrasah atau Administrator.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCorrectionSubmit} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Yang Dikoreksi
                  </label>
                  <input
                    type="date"
                    required
                    value={corDate}
                    onChange={(e) => setCorDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Jam Masuk Sebenarnya
                    </label>
                    <input
                      type="time"
                      required
                      value={corInTime}
                      onChange={(e) => setCorInTime(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-700 focus:outline-hidden font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Jam Pulang Sebenarnya
                    </label>
                    <input
                      type="time"
                      required
                      value={corOutTime}
                      onChange={(e) => setCorOutTime(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-700 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alasan Koreksi
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Contoh: HP kehabisan baterai saat akan melakukan absensi pulang di madrasah..."
                    value={corReason}
                    onChange={(e) => setCorReason(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-700 focus:outline-hidden"
                  ></textarea>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCorrectionModal(false)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Pengajuan</span>
                  </button>
                </div>
              </form>
            )}
</div>
        </div>
      )}

      {showConfirmModal && pendingAttendanceType && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className={`p-4 rounded-t-2xl flex items-center gap-3 ${
              pendingAttendanceType === 'in' ? 'bg-emerald-700' : 'bg-blue-700'
            }`}>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                {pendingAttendanceType === 'in' ? (
                  <MapPin className="w-5 h-5 text-white" />
                ) : (
                  <Clock className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-white font-bold text-base">
                  {pendingAttendanceType === 'in' ? 'Konfirmasi Absen Masuk' : 'Konfirmasi Absen Pulang'}
                </h3>
                <p className="text-white/90 text-xs">
                  {pendingAttendanceType === 'in' 
                    ? `Yakin ingin mencatat absen masuk jam ${currentTime} WIB?`
                    : `Yakin ingin mencatat absen pulang jam ${currentTime} WIB?`}
                </p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Lokasi GPS</span>
                  <span className="font-semibold text-slate-900">{currentCoords.label}</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-500">Jarak ke Madrasah</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {currentCoords.distance} meter
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-500">Akurasi GPS</span>
                  <span className={`font-bold tabular-nums ${
                    currentCoords.accuracy && currentCoords.accuracy <= config.accuracyThresholdMeter
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}>
                    ±{currentCoords.accuracy || '-'} meter
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-500">Radius Toleransi</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {config.radiusMeter} meter
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-500">Batas Akurasi</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {config.accuracyThresholdMeter} meter
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmModal(false);
                    setPendingAttendanceType(null);
                  }}
                  className="flex-1 py-2.5 px-4 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => executeAttendance(pendingAttendanceType)}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                    pendingAttendanceType === 'in'
                      ? 'bg-emerald-700 hover:bg-emerald-800'
                      : 'bg-blue-700 hover:bg-blue-800'
                  }`}
                >
                  {pendingAttendanceType === 'in' ? (
                    <>
                      <MapPin className="w-4 h-4" />
                      <span>Ya, Absen Masuk</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4" />
                      <span>Ya, Absen Pulang</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                Data GPS hanya dicatat saat tombol ditekan, tidak dilacak terus-menerus.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
