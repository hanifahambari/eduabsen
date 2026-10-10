import React, { useState, useEffect, useRef } from 'react';
import {
  HelpCircle,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Download,
  MonitorSmartphone,
  X,
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export const HelpView: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const installBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallBtn(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
      setDeferredPrompt(null);
    }
  };

  const faqs = [
    {
      q: 'Bagaimana cara mengatasi error "Izin Lokasi (GPS) Ditolak"?',
      a: 'Pada Google Chrome atau browser HP Anda, klik ikon gembok/setelan di samping bilah URL (alamat situs), pilih "Izin Situs" atau "Permissions", lalu ubah Lokasi/Location menjadi "Izinkan (Allow)". Setelah itu muat ulang (refresh) halaman aplikasi.',
    },
    {
      q: 'Mengapa absensi ditolak karena "Di Luar Radius"?',
      a: 'Madrasah menetapkan batas toleransi radius (misalnya 100 meter dari titik pusat gedung). Pastikan Anda sudah tiba di lingkungan madrasah. Jika GPS HP Anda sedang kurang akurat, cobalah keluar ke area terbuka sebentar dan tekan tombol "Perbarui GPS".',
    },
    {
      q: 'Bagaimana jika kamera HP guru tidak dapat membuka pemindai QR?',
      a: 'Pastikan browser telah diberi izin mengakses kamera. Jika kamera bermasalah, guru dapat menggunakan opsi "Input NISN Cepat" atau menggunakan tombol "+ Hadir" pada Roster Kelas Siswa yang disediakan tanpa perlu kamera.',
    },
    {
      q: 'Berapa ketukan untuk melakukan absensi?',
      a: 'Cukup 1 ketukan! Buka menu "Absen Guru (GPS)", periksa jarak pada radar, lalu tekan tombol "Absen Masuk Sekarang" atau "Absen Pulang Sekarang". Sistem langsung mencatat waktu resmi server WIB.',
    },
    {
      q: 'Bagaimana cara memasang aplikasi di HP tanpa Google Play Store (PWA)?',
      a: 'Aplikasi ini menggunakan teknologi PWA (Progressive Web App). Cukup buka situs ini di Chrome atau Safari HP Anda, lalu pilih menu "Tambahkan ke Layar Utama" (Add to Home Screen) di peramban browser Anda. Aplikasi akan terpasang di HP secara otomatis!',
    },
    {
      q: 'Bagaimana jika guru atau siswa lupa melakukan absensi kemarin?',
      a: 'Guru dapat mengajukan koreksi mandiri melalui menu "Ajukan Koreksi Lupa Absen" di halaman Absen Guru. Permohonan akan diverifikasi dan disetujui oleh Kepala Madrasah atau Administrator.',
    },
    {
      q: 'Kapan status "Alpa" otomatis dibuat untuk siswa?',
      a: 'Pada akhir jam pelajaran madrasah, Admin atau guru piket dapat menekan tombol "Tutup Hari". Siswa yang belum tercatat presensi dan tidak memiliki izin/sakit otomatis akan dijadikan Alpa sesuai aturan madrasah. Pada hari libur mingguan (Jum\'at) atau libur kalender, sistem aman dan tidak akan membuat Alpa.',
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Pusat Bantuan & Panduan Pengguna
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Petunjuk praktis penggunaan presensi geo-tagging, pemindai QR, PWA, dan solusi kendala teknis.
          </p>
        </div>
      </div>

      {/* 3 Step Simple Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
            1
          </div>
          <h3 className="text-sm font-bold text-slate-900">Absensi Guru Cepat</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pastikan berada dalam radius madrasah, buka aplikasi di HP, tekan tombol "Absen Masuk" saat pagi dan "Absen Pulang" saat usai tugas.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
            2
          </div>
          <h3 className="text-sm font-bold text-slate-900">Pemindaian QR Siswa</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Guru piket mengarahkan kamera ke Kartu QR siswa dengan mode beruntun aktif. Pemindaian selesai dalam tempo kurang dari 3 detik per siswa.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-sm">
            3
          </div>
          <h3 className="text-sm font-bold text-slate-900">Izin & Rekapitulasi</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pengajuan izin atau sakit diverifikasi langsung oleh Kepala Madrasah/Wali Kelas. Laporan bulanan dapat diunduh ke Excel dalam sekejap.
          </p>
        </div>
      </div>

      {/* PWA Install Feature */}
      {!isInstalled && showInstallBtn && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-5 shadow-lg space-y-3 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <MonitorSmartphone className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-sm">
                Pasang Aplikasi ke Layar Utama (PWA)
              </h3>
              <p className="text-emerald-100 text-xs mt-0.5 leading-relaxed">
                Instal aplikasi ini langsung di HP Anda tanpa melalui Play Store / App Store. Akses cepat offline, notifikasi, dan performa seperti aplikasi native.
              </p>
            </div>
            <button
              ref={installBtnRef}
              onClick={handleInstallClick}
              className="shrink-0 px-4 py-2 bg-white text-emerald-700 font-semibold text-xs rounded-lg shadow-md hover:bg-emerald-50 active:bg-emerald-100 transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Pasang Sekarang</span>
            </button>
          </div>
          <p className="text-emerald-100 text-[10px] border-t border-white/20 pt-2">
            <strong>Tip:</strong> Jika tombol tidak muncul, gunakan menu browser: Chrome (⋮) → "Tambahkan ke Layar Utama" / Safari (📤) → "Tambahkan ke Layar Utama".
          </p>
        </div>
      )}

      {isInstalled && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-2xs space-y-3 animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <MonitorSmartphone className="w-5 h-5 text-emerald-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-emerald-900 text-sm">
                Aplikasi Sudah Terpasang ✓
              </h3>
              <p className="text-emerald-700 text-xs mt-0.5 leading-relaxed">
                Aplikasi presensi geo-tagging sudah terpasang di perangkat Anda. Buka langsung dari layar utama untuk akses cepat offline dan performa optimal.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Device Permission Guides */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-emerald-700" />
          <span>Panduan Izin Akses Perangkat (GPS & Kamera)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
            <p className="font-bold text-slate-900">Pengguna Android (Chrome):</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600">
              <li>Tekan ikon 🔒 (Gembok / Setelan) di bilah alamat web.</li>
              <li>Pilih <strong>Setelan Situs</strong> (Site Settings).</li>
              <li>Pastikan <strong>Lokasi</strong> dan <strong>Kamera</strong> disetel ke <strong>Izinkan</strong>.</li>
              <li>Kembali ke browser dan lakukan Refresh halaman.</li>
            </ol>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
            <p className="font-bold text-slate-900">Pengguna iPhone / iOS (Safari):</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600">
              <li>Buka <strong>Pengaturan iPhone</strong> &gt; <strong>Safari</strong>.</li>
              <li>Gulir ke bawah ke bagian <strong>Lokasi</strong> dan pilih <strong>Izinkan</strong>.</li>
              <li>Bagian <strong>Kamera</strong> juga pilih <strong>Izinkan</strong>.</li>
              <li>Buka kembali Safari dan muat ulang halaman absensi.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
          <HelpCircle className="w-4 h-4 text-emerald-700" />
          <span>Pertanyaan Yang Sering Diajukan (FAQ)</span>
        </h3>
        <div className="divide-y divide-slate-100">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="py-3">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-900 hover:text-emerald-800 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed pl-1">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
