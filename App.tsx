/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { TeacherAttendanceView } from './components/TeacherAttendanceView';
import { StudentScannerView } from './components/StudentScannerView';
import { StudentCardView } from './components/StudentCardView';
import { LeaveAndCorrectionView } from './components/LeaveAndCorrectionView';
import { ScheduleView } from './components/ScheduleView';
import { ReportView } from './components/ReportView';
import { MasterDataView } from './components/MasterDataView';
import { SettingsView } from './components/SettingsView';
import { HelpView } from './components/HelpView';
import { LoginPage } from './components/LoginPage';

function MainLayout() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const { config } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Page Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'dashboard' && <DashboardView setActiveTab={setActiveTab} />}
          {activeTab === 'absen-guru' && <TeacherAttendanceView />}
          {activeTab === 'scan-siswa' && <StudentScannerView />}
          {activeTab === 'kartu-qr' && <StudentCardView />}
          {activeTab === 'izin-koreksi' && <LeaveAndCorrectionView />}
          {activeTab === 'jadwal' && <ScheduleView />}
          {activeTab === 'laporan' && <ReportView />}
          {activeTab === 'master-data' && <MasterDataView />}
          {activeTab === 'pengaturan' && <SettingsView />}
          {activeTab === 'bantuan' && <HelpView />}
        </main>

        {/* Footer */}
        <footer className="no-print mt-auto border-t border-slate-200 bg-white py-4 lg:ml-64">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">{config.nama}</span>
              <span aria-hidden="true">•</span>
              <span>NSM: {config.nsm}</span>
              <span aria-hidden="true">•</span>
              <span>NPSM: {config.npsm || config.npsn}</span>
            </div>
            <div className="flex items-center gap-3">
              <span>Sederhana • Cepat • Akurat • Tercatat • Mudah Dipantau</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function AppContent() {
  const { currentUser, showLoginPage } = useApp();

  if (showLoginPage || !currentUser.isLoggedIn) {
    return <LoginPage />;
  }

  return <MainLayout />;
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
