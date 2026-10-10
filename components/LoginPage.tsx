import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  LogIn,
  KeyRound,
  User,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Check,
} from 'lucide-react';

const REMEMBER_ME_KEY = 'absensi_remember_me';

export const LoginPage: React.FC = () => {
  const {
    loginWithCredential,
    config,
  } = useApp();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetSubmitted, setResetSubmitted] = useState(false);
  const [authTab, setAuthTab] = useState<'credential' | 'lupa'>('credential');
  const [rememberMe, setRememberMe] = useState(false);

  // Load remembered identifier on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_ME_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.identifier && parsed.remember) {
          setIdentifier(parsed.identifier);
          setRememberMe(true);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const saveRememberMe = () => {
    try {
      if (rememberMe && identifier.trim()) {
        localStorage.setItem(REMEMBER_ME_KEY, JSON.stringify({
          identifier: identifier.trim(),
          remember: true,
        }));
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  };

  const handleCredentialLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!identifier.trim()) {
      setErrorMessage('Silakan masukkan NIP, NISN, atau Username akun Anda.');
      return;
    }
    if (!password) {
      setErrorMessage('Silakan masukkan kata sandi.');
      return;
    }

    saveRememberMe();

    setLoading(true);
    const result = loginWithCredential(identifier, password);
    setLoading(false);

    if (result.success) {
      setSuccessMessage(result.message);
    } else {
      setErrorMessage(result.message);
    }
  };

  const handleLupaPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetIdentifier.trim()) return;
    setResetSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col animate-in fade-in duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-6 text-white">
          <div className="flex items-center gap-3 justify-center">
            <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-xs">
              {config.logo ? (
                <img
                  src={config.logo}
                  alt={config.nama}
                  className="w-full h-full object-contain p-1 rounded-xl bg-white"
                />
              ) : (
                <GraduationCap className="w-7 h-7 text-emerald-200" />
              )}
            </div>
            <div className="text-center">
              <h1 className="font-bold text-lg text-white tracking-tight leading-tight">
                Portal Masuk Madrasah
              </h1>
              <p className="text-xs text-emerald-100 font-normal mt-0.5">
                {config.nama}
              </p>
</div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Notification Alerts */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* CREDENTIAL LOGIN */}
          {authTab === 'credential' && (
            <form onSubmit={handleCredentialLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NIP / NISN / Email / Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Contoh: NIP Guru (198103...) atau NISN Siswa (007123...)"
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                    required
                    autoComplete="username"
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Guru & Admin gunakan NIP/Email/admin, Siswa gunakan NISN.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('lupa');
                      setResetSubmitted(false);
                      setResetIdentifier(identifier);
                    }}
                    className="text-[11px] text-emerald-700 hover:underline font-semibold cursor-pointer"
                  >
                    Lupa Kata Sandi?
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi akun"
                    className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`flex items-center justify-center w-5 h-5 rounded border-2 transition-colors cursor-pointer ${
                    rememberMe
                      ? 'bg-emerald-600 border-emerald-600'
                      : 'border-slate-300 hover:border-emerald-400'
                  }`}
                  aria-label="Ingat saya"
                >
                  {rememberMe && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
                <label className="text-xs text-slate-600 cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                  Ingat Saya
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Memverifikasi...' : 'Masuk ke Aplikasi'}</span>
              </button>
            </form>
          )}

          {/* LUPA KATA SANDI */}
          {authTab === 'lupa' && (
            <div className="space-y-4 py-1">
              <div className="border-b border-slate-100 pb-2">
                <h4 className="font-bold text-xs text-slate-900">Bantuan Lupa Kata Sandi</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Sesuai kebijakan madrasah, reset kata sandi dapat dilakukan langsung oleh Administrator Madrasah.
                </p>
              </div>

              {!resetSubmitted ? (
                <form onSubmit={handleLupaPassword} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Masukkan NIP atau NISN Anda
                    </label>
                    <input
                      type="text"
                      required
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                      placeholder="Contoh: 198103122006042005"
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                    />
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
                    <p className="font-semibold">Informasi:</p>
                    <p>
                      Kata sandi standar untuk guru adalah <code className="font-mono font-bold">guru123</code> dan untuk siswa adalah <code className="font-mono font-bold">siswa123</code>.
                    </p>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setAuthTab('credential')}
                      className="flex-1 py-2.5 px-3 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Kembali ke Login
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold cursor-pointer"
                    >
                      Minta Reset Sandi
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <p className="text-sm font-bold text-emerald-950">
                    Permintaan Reset Dicatat
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Akun dengan ID <strong>{resetIdentifier}</strong> dapat direset kembali ke sandi awal (<code className="font-mono font-bold">guru123</code> / <code className="font-mono font-bold">siswa123</code>) melalui menu <em>Master Data &gt; Akun Pengguna</em> oleh Admin Madrasah.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAuthTab('credential')}
                    className="mt-2 text-sm font-semibold text-emerald-700 hover:underline cursor-pointer block mx-auto"
                  >
                    Kembali ke Halaman Login
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px]">Database Cloud: Firestore Online</span>
          </div>
          <span className="text-[10px]">v2.0.0</span>
        </div>
      </div>
    </div>
  );
};
