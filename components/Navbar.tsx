import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import {
  Clock,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Key,
  AlertCircle,
  LayoutDashboard,
  MapPin,
  QrCode,
  IdCard,
  FileText,
  Calendar,
  BarChart2,
  Building2,
  Settings,
  HelpCircle,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const {
    currentUser,
    logout,
    currentTime,
    config,
    changePassword,
    showLoginPage,
    setShowLoginPage,
  } = useApp();

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changePasswordForm, setChangePasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  const userDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'kepala':
        return 'Kepala Madrasah';
      case 'guru':
        return currentUser.isWaliKelas
          ? `Guru / Wali Kelas ${currentUser.waliKelasRombel || ''}`
          : 'Guru Mapel';
      case 'siswa':
        return `Siswa (${currentUser.rombel || ''})`;
      default:
        return role;
    }
  };

  // Navigation items for mobile drawer
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'kepala', 'guru', 'siswa'] },
    { id: 'absen-guru', label: 'Absen Guru (GPS)', icon: MapPin, roles: ['admin', 'kepala', 'guru'] },
    { id: 'scan-siswa', label: 'Pemindai Siswa (QR)', icon: QrCode, roles: ['admin', 'kepala', 'guru'] },
    { id: 'kartu-qr', label: 'Kartu QR Siswa', icon: IdCard, roles: ['admin'] },
    { id: 'izin-korecki', label: 'Izin & Koreksi', icon: FileText, roles: ['admin', 'kepala', 'guru'] },
    { id: 'jadwal', label: 'Jadwal & Kalender', icon: Calendar, roles: ['admin', 'kepala', 'guru'] },
    {
      id: 'laporan',
      label: currentUser.role === 'siswa' ? 'Laporan & Rekap Pribadi' : 'Laporan & Rekap',
      icon: BarChart2,
      roles: ['admin', 'kepala', 'siswa'],
    },
    { id: 'master-data', label: 'Data Madrasah', icon: Building2, roles: ['admin'] },
    { id: 'pengaturan', label: 'Pengaturan & Log', icon: Settings, roles: ['admin'] },
    { id: 'bantuan', label: 'Bantuan', icon: HelpCircle, roles: ['admin', 'kepala', 'guru', 'siswa'] },
  ];

  const visibleNavItems = navItems.filter((item) =>
    item.roles.includes(currentUser.role)
  );

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs no-print lg:ml-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Brand Title & Logo */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink lg:hidden">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="text-left group cursor-pointer focus:outline-hidden min-w-0 flex items-center gap-2 sm:gap-2.5 overflow-hidden"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-xs group-hover:bg-emerald-800 transition-colors overflow-hidden shrink-0">
                {config.logo ? (
                  <img
                    src={config.logo}
                    alt={config.nama}
                    className="w-full h-full object-contain p-0.5 bg-white"
                  />
                ) : (
                  <span className="font-serif">M</span>
                )}
              </div>
              <div className="min-w-0 flex flex-col justify-center overflow-hidden">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-snug group-hover:text-emerald-700 transition-colors truncate">
                  {config.nama}
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-500 font-normal leading-tight truncate hidden sm:block">
                  Presensi Digital Berbasis Geotagging
                </p>
              </div>
            </button>
          </div>

          {/* Actions: Clock + User Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Live Clock WIB */}
            <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-md border border-slate-200/60 text-slate-700">
              <Clock className="w-3.5 h-3.5 text-emerald-700" />
              <span className="font-mono text-xs font-semibold tabular-nums">
                {currentTime}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">WIB</span>
            </div>

            {/* User Dropdown Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 pr-2 sm:pr-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer shadow-2xs"
                title="Kelola Akun & Hak Akses"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                  {currentUser.nama.charAt(0)}
                </div>
                <div className="text-left hidden sm:block max-w-[100px] md:max-w-[120px] truncate">
                  <div className="text-xs font-semibold text-slate-900 truncate leading-tight">
                    {currentUser.nama.split(' ')[0]} {currentUser.nama.split(' ')[1] || ''}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-medium truncate">
                    {getRoleBadge(currentUser.role)}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {/* Quick Role Switcher Dropdown */}
              {showUserDropdown && (
                <div
                  ref={userDropdownRef}
                  className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                        Akun Aktif Saat Ini
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 mt-0.5 truncate">
                      {currentUser.nama}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {currentUser.identifier} • {getRoleBadge(currentUser.role)}
                    </p>
                  </div>

                  <div className="px-2 py-1">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        setShowChangePasswordModal(true);
                        setChangePasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                        setChangePasswordError(null);
                      }}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>Ganti Kata Sandi</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        logout();
                      }}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 text-red-600 hover:bg-red-50 text-xs font-semibold cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1"
        >
          <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg mb-2">
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <Clock className="w-4 h-4 text-emerald-700" />
              <span className="font-mono font-bold tabular-nums">{currentTime} WIB</span>
            </div>
            <div className="text-xs font-semibold text-emerald-800">
              {getRoleBadge(currentUser.role)}
            </div>
          </div>
          <nav className="space-y-1">
            {visibleNavItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-4 text-white relative">
              <button
                onClick={() => setShowChangePasswordModal(false)}
                className="absolute top-3 right-3 text-emerald-100 hover:text-white hover:bg-emerald-700/50 p-1 rounded-lg transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-xs">
                  <Key className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white tracking-tight">Ganti Kata Sandi</h3>
                  <p className="text-xs text-emerald-100 font-normal mt-0.5">Masukkan kata sandi lama dan baru</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {changePasswordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{changePasswordError}</span>
                </div>
              )}

              <form onSubmit={(e) => {
                e.preventDefault();
                if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
                  setChangePasswordError('Konfirmasi kata sandi baru tidak cocok.');
                  return;
                }
                setChangePasswordLoading(true);
                const result = changePassword(changePasswordForm.oldPassword, changePasswordForm.newPassword);
                setChangePasswordLoading(false);
                if (result.success) {
                  setShowChangePasswordModal(false);
                  setShowLoginPage(true);
                } else {
                  setChangePasswordError(result.message);
                }
              }} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kata Sandi Lama</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={changePasswordForm.oldPassword}
                      onChange={(e) => setChangePasswordForm(prev => ({ ...prev, oldPassword: e.target.value }))}
                      placeholder="Masukkan kata sandi saat ini"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kata Sandi Baru</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={changePasswordForm.newPassword}
                      onChange={(e) => setChangePasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Minimal 6 karakter"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                      required
                      minLength={6}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Minimal 6 karakter</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Konfirmasi Kata Sandi Baru</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={changePasswordForm.confirmPassword}
                      onChange={(e) => setChangePasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Ulangi kata sandi baru"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={changePasswordLoading}
                  className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Key className="w-4 h-4" />
                  <span>{changePasswordLoading ? 'Mengubah...' : 'Simpan Perubahan'}</span>
                </button>
              </form>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
              <p>Setelah berhasil, Anda akan diarahkan ke halaman login untuk masuk dengan kata sandi baru.</p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};