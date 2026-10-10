import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  QrCode,
  Camera,
  Search,
  CheckCircle,
  AlertCircle,
  Users,
  Clock,
  RotateCcw,
  FlipHorizontal,
  Upload,
  Sparkles,
  Zap,
  Volume2,
  Navigation,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import jsQR from 'jsqr';
import {
  playSuccessBeep,
  playWarningBeep,
  getCurrentPosition,
  calculateDistanceInMeters,
} from '../utils/geo';

export const StudentScannerView: React.FC = () => {
  const {
    currentUser,
    config,
    students,
    classes,
    attendance,
    recordStudentAttendance,
    currentDate,
    currentTime,
  } = useApp();

  // Mode: Masuk or Pulang
  const [scanType, setScanType] = useState<'in' | 'out'>('in');
  const [selectedClass, setSelectedClass] = useState<string>(
    currentUser.waliKelasRombel || 'XII-MIPA 1'
  );
  const [continuousScan, setContinuousScan] = useState<boolean>(true);

  // Manual search by NISN / name
  const [searchQuery, setSearchQuery] = useState('');
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    studentName?: string;
    nisn?: string;
    rombel?: string;
    message: string;
    time: string;
    isLate?: boolean;
  } | null>(null);

  // Teacher GPS location (for geo-tagging student attendance)
  const [teacherGps, setTeacherGps] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    distance: number;
    timestamp: number;
  } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Camera video and canvas elements
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Alternative input methods
  const [showManualNisn, setShowManualNisn] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [showQrUpload, setShowQrUpload] = useState(false);
  const [manualNisn, setManualNisn] = useState('');

  // Cooldown tracker to prevent duplicate rapid scans of the same code
  const lastScannedCodeRef = useRef<{ code: string; timestamp: number } | null>(null);

  // Live session scanned list
  const [sessionScanned, setSessionScanned] = useState<
    Array<{
      id: string;
      nama: string;
      nisn: string;
      rombel: string;
      time: string;
      type: 'in' | 'out';
      isLate?: boolean;
    }>
  >([]);

  // Hidden image file upload ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Process student attendance record
  const executeScan = useCallback((identifier: string) => {
    const cleanId = identifier.trim();
    if (!cleanId) return;

    const res = recordStudentAttendance(
      cleanId,
      scanType,
      currentUser.id,
      currentUser.nama,
      teacherGps
        ? {
            lat: teacherGps.lat,
            lng: teacherGps.lng,
            distance: teacherGps.distance,
            accuracy: teacherGps.accuracy,
          }
        : undefined
    );
    const now = currentTime;

    if (res.success && res.student) {
      playSuccessBeep();
      setScanResult({
        success: true,
        studentName: res.student.nama,
        nisn: res.student.nisn,
        rombel: res.student.rombel,
        message: res.message,
        time: now,
        isLate: res.isLate,
      });

      setSessionScanned((prev) => [
        {
          id: `scan-${Date.now()}`,
          nama: res.student!.nama,
          nisn: res.student!.nisn,
          rombel: res.student!.rombel,
          time: now,
          type: scanType,
          isLate: res.isLate,
        },
        ...prev,
      ]);

      try {
        confetti({
          particleCount: 25,
          spread: 40,
          origin: { y: 0.7 },
        });
      } catch {
        // ignore
      }

      if (continuousScan) {
        setTimeout(() => {
          setScanResult((prev) => (prev?.nisn === res.student?.nisn ? null : prev));
        }, 3000);
      }
    } else {
      playWarningBeep();
      setScanResult({
        success: false,
        message: res.message,
        time: now,
      });
    }
    setSearchQuery('');
  }, [recordStudentAttendance, scanType, currentUser.id, currentUser.nama, currentTime, continuousScan, teacherGps]);

  // Real-time video frame scanning loop via jsQR
  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && video.readyState >= video.HAVE_CURRENT_DATA && canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            const rawData = code.data.trim();
            const now = Date.now();

            // Debounce: prevent repeatedly scanning the EXACT same QR within 3 seconds
            const isSameRecentCode =
              lastScannedCodeRef.current &&
              lastScannedCodeRef.current.code === rawData &&
              now - lastScannedCodeRef.current.timestamp < 3000;

            if (!isSameRecentCode) {
              lastScannedCodeRef.current = { code: rawData, timestamp: now };
              executeScan(rawData);
            }
          }
        } catch {
          // ignore transient frame read errors
        }
      }
    }

    animationFrameIdRef.current = requestAnimationFrame(tick);
  }, [executeScan]);

  // Fetch teacher GPS location for geo-tagging student attendance
  const fetchTeacherGps = async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const pos = await getCurrentPosition();
      const dist = calculateDistanceInMeters(
        pos.latitude,
        pos.longitude,
        config.latitude,
        config.longitude
      );
      setTeacherGps({
        lat: pos.latitude,
        lng: pos.longitude,
        accuracy: pos.accuracy,
        distance: dist,
        timestamp: pos.timestamp,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membaca lokasi GPS guru.';
      setGpsError(msg);
      setTeacherGps(null);
    } finally {
      setGpsLoading(false);
    }
  };

  // Start real device camera
  const startCamera = async (overrideFacing?: 'environment' | 'user') => {
    setCameraError(null);
    setIsCameraLoading(true);

    const targetFacing = overrideFacing || facingMode;

    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Peramban web ini tidak mendukung akses kamera langsung (getUserMedia).');
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback constraint if environment camera is not available (e.g. desktop webcam)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.muted = true;
        setIsCameraActive(true);

        // Wait for video stream ready state
        if (video.readyState < 2) {
          await new Promise<void>((resolve) => {
            const onLoaded = () => {
              video.removeEventListener('loadeddata', onLoaded);
              resolve();
            };
            video.addEventListener('loadeddata', onLoaded);
            setTimeout(resolve, 500);
          });
        }

        try {
          await video.play();
        } catch (playErr) {
          console.warn('Video play warning:', playErr);
        }

        // Fetch teacher GPS when camera starts
        await fetchTeacherGps();

        // Start decoding loop
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
        }
        animationFrameIdRef.current = requestAnimationFrame(tick);
      }
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      let msg = 'Kamera tidak dapat diakses.';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = 'Izin kamera ditolak. Klik ikon 🔒 di bilah alamat → Setelan Situs → Kamera → "Izinkan", lalu refresh halaman.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          msg = 'Kamera tidak ditemukan. Pastikan perangkat memiliki kamera dan tidak digunakan aplikasi lain.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          msg = 'Kamera digunakan aplikasi lain (Zoom, Meet, dll). Tutup aplikasi lain lalu coba lagi.';
        } else if (err.message.includes('getUserMedia')) {
          msg = 'Browser tidak mendukung akses kamera langsung. Gunakan Chrome/Firefox/Safari terbaru, atau coba alternatif di bawah.';
        } else {
          msg = err.message;
        }
      }
      setCameraError(msg);
      setIsCameraActive(false);
    } finally {
      setIsCameraLoading(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Flip Camera (Front <-> Back)
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (isCameraActive) {
      startCamera(nextMode);
    }
  };

  // Scan QR from static Image File / Gallery
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            executeScan(code.data.trim());
          } else {
            setCameraError('Tidak ditemukan kode QR yang jelas pada berkas gambar yang diunggah. Pastikan gambar tidak buram.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Filter students for the class roster
  const filteredStudents = students.filter((s) => {
    const matchClass = selectedClass === 'ALL' || s.rombel === selectedClass;
    const matchQuery =
      searchQuery.trim() === '' ||
      s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nisn.includes(searchQuery);
    return matchClass && matchQuery;
  });

  return (
    <div className="space-y-6">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden file input for image QR scanning */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Top Header & Mode Selectors */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Pemindai Presensi Siswa (QR Code & NISN)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pindai kartu QR siswa secara beruntun (≤ 3 detik per siswa) atau input manual NISN.
          </p>
        </div>

        {/* Toggle Mode: Masuk vs Pulang */}
        <div className="flex items-center gap-2">
          <div className="p-1 bg-slate-200/80 rounded-lg flex items-center">
            <button
              onClick={() => setScanType('in')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                scanType === 'in'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Presensi Masuk
            </button>
            <button
              onClick={() => setScanType('out')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                scanType === 'out'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Presensi Pulang
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Scanner Box (Left) + Roster & Recent Scans (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Scanner & Camera Viewfinder - 6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-emerald-700" />
                <span>Pemindai Kamera Live</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setContinuousScan(!continuousScan)}
                  className={`text-[11px] font-medium px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    continuousScan
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                  title="Scan Beruntun: otomatis siap pindai siswa berikutnya tanpa jeda"
                >
                  ⚡ Scan Beruntun {continuousScan ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>
            </div>

            {/* Viewfinder Camera Area */}
            <div className="relative aspect-4/3 w-full bg-slate-950 rounded-xl overflow-hidden flex flex-col items-center justify-center border border-slate-800">
              {/* VIDEO ELEMENT IS ALWAYS IN THE DOM TO AVOID NULL REF RACE CONDITION */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  isCameraActive ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'
                }`}
              ></video>

              {/* Viewfinder Reticle Overlay when camera is active */}
              {isCameraActive && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-52 h-52 sm:w-60 sm:h-60 border-2 border-emerald-400/80 rounded-2xl relative shadow-2xl">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1"></div>
                    {/* Laser scanning line */}
                    <div className="absolute inset-x-2 top-1/2 h-0.5 bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse"></div>
                  </div>
                </div>
              )}

              {/* Inactive or Loading State Overlay */}
              {!isCameraActive && (
                <div className="text-center p-6 text-slate-400 z-10">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-500">
                    <Camera className="w-8 h-8" />
                  </div>
                  <p className="text-xs font-semibold text-slate-300">
                    {isCameraLoading ? 'Menghubungkan ke sensor kamera...' : 'Kamera HP / Komputer Siap Digunakan'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    Arahkan kartu QR siswa ke kamera untuk pemindaian instan otomatis.
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      disabled={isCameraLoading}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{isCameraLoading ? 'Mengaktifkan...' : 'Nyalakan Kamera Sekarang'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-700 flex items-center gap-1.5"
                      title="Pindai file foto QR dari galeri atau komputer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Scan dari File / Foto</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Active Camera Floating Bar Controls */}
              {isCameraActive && (
                <div className="absolute bottom-3 inset-x-3 flex flex-col gap-2 bg-black/75 backdrop-blur-xs px-3.5 py-2 rounded-xl text-white text-[11px] z-20">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                      <span className="font-medium">Kamera Aktif • Sensor Memindai...</span>
                    </span>
                    {/* GPS Status */}
                    <div className="flex items-center gap-2">
                      {teacherGps ? (
                        <>
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                            teacherGps.accuracy <= config.accuracyThresholdMeter
                              ? 'bg-emerald-600/90 text-white'
                              : 'bg-amber-600/90 text-white'
                          }`}>
                            <Navigation className="w-3 h-3" />
                            GPS: ±{teacherGps.accuracy}m ({teacherGps.distance}m)
                          </span>
                          <button
                            type="button"
                            onClick={fetchTeacherGps}
                            disabled={gpsLoading}
                            className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                            title="Perbarui lokasi GPS guru"
                          >
                            <RotateCcw className={`w-3 h-3 ${gpsLoading ? 'animate-spin' : ''}`} />
                            <span>Refresh GPS</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-600/90 text-white">
                            <Navigation className="w-3 h-3" />
                            GPS: Belum tersedia
                          </span>
                          <button
                            type="button"
                            onClick={fetchTeacherGps}
                            disabled={gpsLoading}
                            className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                            title="Dapatkan lokasi GPS guru"
                          >
                            <RotateCcw className={`w-3 h-3 ${gpsLoading ? 'animate-spin' : ''}`} />
                            <span>Ambil GPS</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Ganti kamera depan / belakang"
                    >
                      <FlipHorizontal className="w-3 h-3" />
                      <span>{facingMode === 'environment' ? 'Kamera Depan' : 'Kamera Belakang'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-2 py-1 bg-rose-600/80 hover:bg-rose-600 rounded-md text-white text-[10px] font-semibold cursor-pointer transition-colors"
                    >
                      Matikan
                    </button>
                  </div>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Kendala Akses Kamera:</span>
                </div>
                <p className="pl-5.5 text-slate-700">{cameraError}</p>
                <div className="p-2.5 bg-white border border-amber-100 rounded-lg space-y-1.5">
                  <p className="font-semibold text-slate-800 text-[11px]">Solusi Cepat:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] text-slate-700">
                    <div className="flex items-start gap-1">
                      <span className="text-emerald-600 shrink-0">✓</span>
                      <span><strong>Android (Chrome):</strong> 🔒 di bilah URL → Setelan Situs → Kamera → "Izinkan" → Refresh</span>
                    </div>
                    <div className="flex items-start gap-1">
                      <span className="text-emerald-600 shrink-0">✓</span>
                      <span><strong>iPhone (Safari):</strong> Pengaturan → Safari → Kamera → "Izinkan" → Refresh Safari</span>
                    </div>
                    <div className="flex items-start gap-1">
                      <span className="text-emerald-600 shrink-0">✓</span>
                      <span><strong>Tutup aplikasi lain</strong> yang pakai kamera (Zoom, Meet, WhatsApp, dll)</span>
                    </div>
                    <div className="flex items-start gap-1">
                      <span className="text-emerald-600 shrink-0">✓</span>
                      <span><strong>Gunakan Chrome/Firefox/Safari terbaru</strong> (browser bawaan lama kadang tidak support)</span>
                    </div>
                  </div>
                  <p className="font-semibold text-slate-800 text-[11px] pt-1 border-t border-amber-100">Alternatif Tanpa Kamera:</p>
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setShowManualNisn(true)}
                      className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 rounded text-xs font-medium transition-colors cursor-pointer"
                    >
                      Input NISN Manual
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRoster(true)}
                      className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300 rounded text-xs font-medium transition-colors cursor-pointer"
                    >
                      Roster Siswa (+ Hadir)
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQrUpload(true)}
                      className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300 rounded text-xs font-medium transition-colors cursor-pointer"
                    >
                      Unggah Gambar QR
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Instant Scan Simulator Bar */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Simulasi Scan Cepat (Pilih Siswa):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {students.slice(0, 5).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => executeScan(s.nisn)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 rounded text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                  >
                    Scan: {s.nama.split(' ')[0]} ({s.rombel})
                  </button>
                ))}
              </div>
            </div>

            {/* Manual NISN Search / Barcode Gun Input */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchQuery.trim()) {
                    executeScan(searchQuery.trim());
                  }
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Ketik NISN / Barcode Scanner / Nama Siswa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer"
                >
                  Catat Hadir
                </button>
              </form>
              <p className="text-[10px] text-slate-400 mt-1">
                Mendukung alat USB/Bluetooth Barcode Scanner fisik madrasah.
              </p>
            </div>
          </div>

          {/* Flash Feedback Banner */}
          {scanResult && (
            <div
              className={`p-4 rounded-xl border text-xs animate-in zoom-in-95 duration-150 ${
                scanResult.success
                  ? scanResult.isLate
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}
            >
              <div className="flex items-start gap-3">
                {scanResult.success ? (
                  <CheckCircle
                    className={`w-5 h-5 shrink-0 mt-0.5 ${
                      scanResult.isLate ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm">
                      {scanResult.studentName || 'Hasil Pemindaian'}
                    </p>
                    <span className="font-mono text-xs font-semibold tabular-nums">
                      {scanResult.time} WIB
                    </span>
                  </div>
                  <p className="text-slate-700 mt-0.5">{scanResult.message}</p>
                  {scanResult.rombel && (
                    <div className="mt-1 text-[11px] text-slate-500">
                      Rombel: {scanResult.rombel} • NISN: {scanResult.nisn}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setScanResult(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold ml-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Class Roster & Recent Scans - 6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Quick Roster Click Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Daftar Siswa Kelas (Roster Cepat)
                </h3>
                <p className="text-xs text-slate-500">
                  Klik tombol pada siswa jika tidak membawa kartu QR
                </p>
              </div>

              {/* Class Filter */}
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-1 focus:ring-emerald-700 cursor-pointer"
              >
                <option value="ALL">Semua Kelas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.nama}>
                    {c.nama} ({c.tingkat})
                  </option>
                ))}
              </select>
            </div>

            {/* Student List */}
            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Tidak ada data siswa yang cocok.
                </div>
              ) : (
                filteredStudents.map((st) => {
                  const todayAtt = attendance.find(
                    (a) =>
                      a.targetType === 'siswa' &&
                      a.targetId === st.id &&
                      a.date === currentDate
                  );
                  const isCheckedIn = !!todayAtt?.checkInTime;
                  const isCheckedOut = !!todayAtt?.checkOutTime;

                  return (
                    <div
                      key={st.id}
                      className="py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/80 px-2 rounded-lg transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {st.nama}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          NISN: {st.nisn} • {st.rombel}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {scanType === 'in' ? (
                          isCheckedIn ? (
                            <span className="text-[11px] font-semibold text-emerald-700 font-mono tabular-nums bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Hadir {todayAtt.checkInTime?.substring(0, 5)}
                            </span>
                          ) : (
                            <button
                              onClick={() => executeScan(st.nisn)}
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              + Hadir
                            </button>
                          )
                        ) : isCheckedOut ? (
                          <span className="text-[11px] font-semibold text-blue-700 font-mono tabular-nums bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            Pulang {todayAtt.checkOutTime?.substring(0, 5)}
                          </span>
                        ) : !isCheckedIn ? (
                          <span className="text-[10px] text-slate-400 italic">
                            Belum Masuk
                          </span>
                        ) : (
                          <button
                            onClick={() => executeScan(st.nisn)}
                            className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            + Pulang
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Session History Log */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Siswa Terpindai Sesi Ini
              </h3>
              <span className="font-mono text-xs font-bold text-slate-700 tabular-nums">
                {sessionScanned.length} Siswa
              </span>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {sessionScanned.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  Belum ada siswa yang dipindai pada sesi ini.
                </div>
              ) : (
                sessionScanned.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{item.nama}</p>
                      <p className="text-[10px] text-slate-500">
                        {item.rombel} • NISN {item.nisn}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-[11px] text-emerald-700 tabular-nums block">
                        {item.time} WIB
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {item.type === 'in' ? 'Masuk' : 'Pulang'}{' '}
                        {item.isLate ? '(Terlambat)' : ''}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Modal: Input NISN Manual
  if (showManualNisn) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Input NISN Manual</h3>
            <button onClick={() => setShowManualNisn(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <p className="text-xs text-slate-500">Masukkan NISN siswa untuk mencatat kehadiran tanpa kamera.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualNisn.trim()) {
                executeScan(manualNisn.trim());
                setShowManualNisn(false);
                setManualNisn('');
              }
            }}
            className="space-y-3"
          >
            <input
              type="text"
              value={manualNisn}
              onChange={(e) => setManualNisn(e.target.value)}
              placeholder="Contoh: 007123456789"
              className="w-full px-4 py-3 text-base border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              autoFocus
              required
            />
            <button type="submit" className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl">Catat Kehadiran</button>
          </form>
        </div>
      </div>
    );
  }

  // Modal: Roster Siswa
  if (showRoster) {
    const classStudents = students.filter(s => selectedClass === 'ALL' || s.rombel === selectedClass);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 flex flex-col max-h-[80vh]">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Roster Siswa — {selectedClass === 'ALL' ? 'Semua Kelas' : selectedClass}</h3>
            <button onClick={() => setShowRoster(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="p-4 border-b border-slate-200">
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-700">
              <option value="ALL">Semua Kelas</option>
              {classes.map((c) => <option key={c.id} value={c.nama}>{c.nama} ({c.tingkat})</option>)}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-4">
            {classStudents.map((st) => {
              const todayAtt = attendance.find(a => a.targetType === 'siswa' && a.targetId === st.id && a.date === currentDate);
              const isCheckedIn = !!todayAtt?.checkInTime;
              const isCheckedOut = !!todayAtt?.checkOutTime;
              return (
                <div key={st.id} className="py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/80 px-2 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{st.nama}</p>
                    <p className="text-xs text-slate-500 truncate">NISN: {st.nisn} • {st.rombel}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {scanType === 'in' ? isCheckedIn ? (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Hadir {todayAtt.checkInTime?.substring(0,5)}</span>
                    ) : (
                      <button onClick={() => { executeScan(st.nisn); setShowRoster(false); }} className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-sm font-semibold">+ Hadir</button>
                    ) : isCheckedOut ? (
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">Pulang {todayAtt.checkOutTime?.substring(0,5)}</span>
                    ) : !isCheckedIn ? (
                      <span className="text-xs text-slate-400 italic">Belum Masuk</span>
                    ) : (
                      <button onClick={() => { executeScan(st.nisn); setShowRoster(false); }} className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-sm font-semibold">+ Pulang</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Modal: Upload QR Image
  if (showQrUpload) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Unggah Gambar QR Code</h3>
            <button onClick={() => setShowQrUpload(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <p className="text-xs text-slate-500">Pilih file gambar QR Code siswa (JPG/PNG) untuk dipindai secara manual.</p>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = async () => {
                  const img = new Image();
                  img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      ctx.drawImage(img, 0, 0);
                      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                      const code = jsQR(imageData.data, imageData.width, imageData.height);
                      if (code) {
                        executeScan(code.data);
                        setShowQrUpload(false);
                      } else {
                        alert('QR Code tidak terdeteksi di gambar. Coba gambar yang lebih jelas.');
                      }
                    }
                  };
                  img.src = reader.result as string;
                };
                reader.readAsDataURL(file);
              }
            }}
            className="w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl text-center text-sm text-slate-600 hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer"
          >
            Klik atau seret gambar QR di sini
          </input>
        </div>
      </div>
    );
  }

};
