import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  MapPin,
  Save,
  CheckCircle,
  Download,
  Upload,
  RefreshCw,
  Shield,
  FileText,
  AlertTriangle,
  Globe,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { getCurrentPosition } from '../utils/geo';

export const SettingsView: React.FC = () => {
  const {
    config,
    updateConfig,
    activityLogs,
    resetToDefaultData,
    exportDatabaseJson,
    importDatabaseJson,
  } = useApp();

  // Settings form state (GPS/Geofencing only - School identity moved to MasterDataView > Data Lembaga)
  const [latitude, setLatitude] = useState(config?.latitude?.toString() ?? '-6.2088');
  const [longitude, setLongitude] = useState(config?.longitude?.toString() ?? '106.8456');
  const [radius_meter, setradius_meter] = useState(config?.radius_meter?.toString() ?? '100');
  const [saveAlert, setSaveAlert] = useState(false);

  React.useEffect(() => {
    setLatitude(config?.latitude?.toString() ?? '-6.2088');
    setLongitude(config?.longitude?.toString() ?? '106.8456');
    setradius_meter(config?.radius_meter?.toString() ?? '100');
  }, [config]);

  // GPS detection state
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsDetectMessage, setGpsDetectMessage] = useState<string | null>(null);

  // Backup & Restore
  const [restoreJson, setRestoreJson] = useState('');
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const rad = parseInt(radius_meter, 10);
    updateConfig({
      latitude: isNaN(lat) ? (config?.latitude ?? -6.2088) : lat,
      longitude: isNaN(lng) ? (config?.longitude ?? 106.8456) : lng,
      radius_meter: isNaN(rad) ? (config?.radius_meter ?? 100) : rad,
    });
    setSaveAlert(true);
    setTimeout(() => setSaveAlert(false), 3000);
  };

  const handleDetectCenterGps = async () => {
    setDetectingGps(true);
    setGpsDetectMessage(null);
    try {
      const pos = await getCurrentPosition();
      setLatitude(pos.latitude.toFixed(6));
      setLongitude(pos.longitude.toFixed(6));
      setGpsDetectMessage(
        `Berhasil membaca lokasi saat ini: Lat ${pos.latitude.toFixed(6)}, Lng ${pos.longitude.toFixed(6)} (Akurasi ±${pos.accuracy}m)`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membaca GPS.';
      setGpsDetectMessage(`Gagal: ${msg}`);
    } finally {
      setDetectingGps(false);
    }
  };

  const handleDownloadBackup = async () => {
    const jsonStr = await exportDatabaseJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Absensi_${config?.nama?.replace(/\s+/g, '_') || 'Madrasah'}_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
  };

  const handleExecuteRestore = async () => {
    if (!restoreJson.trim()) return;
    const ok = await importDatabaseJson(restoreJson);
    if (ok) {
      alert('Pemulihan database berhasil!');
      setShowRestoreModal(false);
      setRestoreJson('');
      window.location.reload();
    } else {
      alert('Format JSON file cadangan tidak valid.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Pengaturan Sistem & Log Aktivitas
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Kelola titik koordinat madrasah, radius Geofencing, dan konfigurasi hosting/PWA.
        </p>
      </div>

      {saveAlert && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Pengaturan dan koordinat GPS madrasah berhasil disimpan.</span>
        </div>
      )}

      {/* Grid Utama */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kolom Kiri: Geofencing & Identitas (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* TAHAP 3: Menentukan Titik GPS Madrasah (Geofencing) */}
          <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-700" />
                <span>Titik Koordinat & Radius Geofencing</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Titik pusat gerbang/kantor madrasah. Presensi guru di luar radius toleransi akan otomatis ditolak.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Latitude
                </label>
                <input
                  type="text"
                  required
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Longitude
                </label>
                <input
                  type="text"
                  required
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Radius Toleransi (Meter)
                </label>
                <input
                  type="number"
                  min="20"
                  max="500"
                  required
                  value={radius_meter}
                  onChange={(e) => setradius_meter(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg font-bold text-emerald-800"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleDetectCenterGps}
                disabled={detectingGps}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${detectingGps ? 'animate-spin' : ''}`} />
                <span>{detectingGps ? 'Mendeteksi...' : 'Ambil Koordinat dari Posisi Saya Sekarang'}</span>
              </button>

              <span className="text-[11px] text-slate-400">
                Pilihan radius umum: 50 meter (ketat) atau 100 meter (standar madrasah)
              </span>
            </div>

            {gpsDetectMessage && (
              <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {gpsDetectMessage}
              </p>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Pengaturan Geofencing</span>
              </button>
            </div>
          </form>

          {/* TAHAP 4: Hosting, HTTPS & Progressive Web App (PWA) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-700" />
                <span>Hosting, SSL & PWA (Install di HP)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Aplikasi siap diakses publik dengan enkripsi aman HTTPS dan dapat di-install langsung di HP guru/siswa.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Sertifikat SSL / HTTPS Otomatis</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Koneksi terenkripsi penuh (SSL grade A). Wajib aktif agar peramban mengizinkan akses GPS & Kamera ponsel.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Fitur PWA (Install Tanpa Play Store)</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Guru & siswa tidak perlu membayar akun developer store. Cukup buka link web lalu ketuk "Tambahkan ke Layar Utama".
                </p>
              </div>
            </div>
          </div>

          {/* Backup & Restore */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-700" />
              <span>Pencadangan & Pemulihan Basis Data</span>
            </h3>
            <p className="text-xs text-slate-500">
              Unduh cadangan data lengkap (guru, siswa, presensi, konfigurasi) atau pulihkan dari file JSON sebelumnya.
            </p>
            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                onClick={handleDownloadBackup}
                className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Cadangan (Backup JSON)</span>
              </button>
              <button
                onClick={() => setShowRestoreModal(true)}
                className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Pulihkan Cadangan (Restore)</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Apakah Anda yakin ingin mengembalikan semua data ke pengaturan awal madrasah?')) {
                    resetToDefaultData();
                    alert('Sistem berhasil direset ke data default.');
                    window.location.reload();
                  }
                }}
                className="px-3.5 py-2 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Reset ke Data Awal</span>
              </button>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Log Aktivitas Audit Trail (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span>Log Aktivitas (Audit Trail)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Mencatat setiap tindakan penting pengguna secara transparan.
                </p>
              </div>
              <span className="font-mono text-xs font-bold text-slate-600 tabular-nums">
                {activityLogs.length} Log
              </span>
            </div>

            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
              {activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-900">{log.action}</span>
                    <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                      {log.timestamp}
                    </span>
                  </div>
                  <p className="text-slate-700 text-[11px] leading-relaxed">
                    {log.detail}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Oleh: <span className="font-medium text-slate-600">{log.actor_name}</span> (
                    {log.actor_role.toUpperCase()})
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Restore JSON Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900">
              Pulihkan Data dari JSON
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Tempel isi file cadangan JSON yang telah diunduh sebelumnya.
            </p>
            <textarea
              rows={8}
              value={restoreJson}
              onChange={(e) => setRestoreJson(e.target.value)}
              placeholder='{"config": {...}, "teachers": [...]}'
              className="mt-3 w-full text-xs font-mono p-3 border border-slate-300 rounded-lg"
            ></textarea>
            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                className="px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg cursor-pointer"
              >
                Terapkan Pemulihan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
