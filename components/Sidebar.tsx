import React from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import {
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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser, config } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'kepala', 'guru', 'siswa'] },
    { id: 'absen-guru', label: 'Absen Guru (GPS)', icon: MapPin, roles: ['admin', 'kepala', 'guru'] },
    { id: 'scan-siswa', label: 'Pemindai Siswa (QR)', icon: QrCode, roles: ['admin', 'kepala', 'guru'] },
    { id: 'kartu-qr', label: 'Kartu QR Siswa', icon: IdCard, roles: ['admin'] },
    { id: 'izin-koreksi', label: 'Izin & Koreksi', icon: FileText, roles: ['admin', 'kepala', 'guru'] },
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

  const visibleNavItems = navItems.filter((item) => item.roles.includes(currentUser.role));

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

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-slate-200 flex flex-col no-print lg:block hidden">
      {/* Sidebar Header - Brand */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-200 shrink-0">
        <div className="w-10 h-10 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold text-lg shadow-xs shrink-0">
          {config.logo ? (
            <img src={config.logo} alt={config.nama} className="w-full h-full object-contain p-1 rounded bg-white" />
          ) : (
            <span className="font-serif">M</span>
          )}
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <h1 className="text-sm font-bold text-slate-900 truncate">{config.nama}</h1>
          <p className="text-[10px] text-slate-500 truncate">Presensi Digital Geo-tagging</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {visibleNavItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer - User Info */}
      <div className="p-3 border-t border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
            {currentUser.nama.charAt(0)}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="text-xs font-semibold text-slate-900 truncate">{currentUser.nama.split(' ')[0]}</p>
            <p className="text-[10px] text-emerald-700 font-medium truncate">{getRoleBadge(currentUser.role)}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};