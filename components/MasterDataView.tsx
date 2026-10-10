import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Teacher, Student, ClassRoom, UserAccount, UserRole } from '../types';
import {
  Building2,
  Users,
  GraduationCap,
  Plus,
  Trash2,
  Edit,
  Upload,
  Download,
  Search,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  UploadCloud,
  Save,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  Layers,
  KeyRound,
  Shield,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const MasterDataView: React.FC = () => {
  const {
    config,
    updateConfig,
    teachers,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    importTeachersBatch,
    students,
    addStudent,
    updateStudent,
    deleteStudent,
    importStudentsBatch,
    promoteStudents,
    classes,
    addClass,
    updateClass,
    deleteClass,
    accounts,
    addAccount,
    updateAccount,
    deleteAccount,
    resetAccountPassword,
    generateAccountsForTeachers,
    generateAccountsForStudents,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'lembaga' | 'guru' | 'siswa' | 'kelas' | 'akun'>('lembaga');

  // State Form Data Lembaga
  const [lNama, setLNama] = useState(config.nama);
  const [lNsm, setLNsm] = useState(config.nsm);
  const [lNpsm, setLNpsm] = useState(config.npsm || config.npsn);
  const [lAlamat, setLAlamat] = useState(config.alamat);
  const [lLogo, setLLogo] = useState(config.logo || '');
  const [lTelepon, setLTelepon] = useState(config.telepon || '');
  const [lEmail, setLEmail] = useState(config.email || '');
  const [lKepala, setLKepala] = useState(config.kepalaMadrasah || '');
  const [lNipKepala, setLNipKepala] = useState(config.nipKepala || '');
  const [showKontakLembaga, setShowKontakLembaga] = useState(false);
  const [saveLembagaSuccess, setSaveLembagaSuccess] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const fileExcelInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state if config changes
  useEffect(() => {
    setLNama(config.nama);
    setLNsm(config.nsm);
    setLNpsm(config.npsm || config.npsn);
    setLAlamat(config.alamat);
    setLLogo(config.logo || '');
    setLTelepon(config.telepon || '');
    setLEmail(config.email || '');
    setLKepala(config.kepalaMadrasah || '');
    setLNipKepala(config.nipKepala || '');
  }, [config]);

  // Handler for Logo Upload & Compression
  const handleLogoFile = (file: File) => {
    setLogoUploadError(null);
    if (!file.type.startsWith('image/')) {
      setLogoUploadError('Format berkas tidak valid. Harap pilih gambar PNG, JPG, JPEG, WEBP, atau SVG.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadError('Ukuran gambar terlalu besar (maksimal 5MB).');
      return;
    }

    setIsProcessingLogo(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        setIsProcessingLogo(false);
        setLogoUploadError('Gagal memuat berkas gambar.');
        return;
      }
      if (file.type === 'image/svg+xml') {
        setLLogo(dataUrl);
        setIsProcessingLogo(false);
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 360;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, w, h);
            const optimized = canvas.toDataURL('image/png', 0.92);
            setLLogo(optimized);
          } else {
            setLLogo(dataUrl);
          }
        } catch {
          setLLogo(dataUrl);
        } finally {
          setIsProcessingLogo(false);
        }
      };
      img.onerror = () => {
        setIsProcessingLogo(false);
        setLogoUploadError('Gagal memproses gambar logo.');
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setIsProcessingLogo(false);
      setLogoUploadError('Gagal membaca berkas unggahan.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLembaga = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lNama.trim()) {
      alert('Nama Madrasah wajib diisi.');
      return;
    }
    if (!lNsm.trim()) {
      alert('NSM wajib diisi.');
      return;
    }
    if (!lNpsm.trim()) {
      alert('NPSM / NPSN wajib diisi.');
      return;
    }
    if (!lAlamat.trim()) {
      alert('Alamat Madrasah wajib diisi.');
      return;
    }
    updateConfig({
      nama: lNama.trim(),
      nsm: lNsm.trim(),
      npsm: lNpsm.trim(),
      npsn: lNpsm.trim(),
      alamat: lAlamat.trim(),
      logo: lLogo,
      telepon: lTelepon.trim(),
      email: lEmail.trim(),
      kepalaMadrasah: lKepala.trim(),
      nipKepala: lNipKepala.trim(),
    });
    setSaveLembagaSuccess(true);
    setTimeout(() => {
      setSaveLembagaSuccess(false);
    }, 4000);
  };

  const handleResetLembaga = () => {
    setLNama(config.nama);
    setLNsm(config.nsm);
    setLNpsm(config.npsm || config.npsn);
    setLAlamat(config.alamat);
    setLLogo(config.logo || '');
    setLTelepon(config.telepon || '');
    setLEmail(config.email || '');
    setLKepala(config.kepalaMadrasah || '');
    setLNipKepala(config.nipKepala || '');
    setLogoUploadError(null);
  };

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRombel, setFilterRombel] = useState('ALL');

  // Modal State for Teacher
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [teacherEditing, setTeacherEditing] = useState<Teacher | null>(null);
  const [tNama, setTNama] = useState('');
  const [tNip, setTNip] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [tMapel, setTMapel] = useState('');
  const [tNoWa, setTNoWa] = useState('');
  const [tAlamat, setTAlamat] = useState('');
  const [tIsWali, setTIsWali] = useState(false);
  const [tWaliRombel, setTWaliRombel] = useState('');

  // Modal State for Student
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentEditing, setStudentEditing] = useState<Student | null>(null);
  const [sNama, setSNama] = useState('');
  const [sNisn, setSNisn] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sRombel, setSRombel] = useState('XII-MIPA 1');
  const [sNoWa, setSNoWa] = useState('');
  const [sAlamat, setSAlamat] = useState('');
  const [sNamaWali, setSNamaWali] = useState('');

  // Modal State for Class (Rombel)
  const [showClassModal, setShowClassModal] = useState(false);
  const [classEditing, setClassEditing] = useState<ClassRoom | null>(null);
  const [cNama, setCNama] = useState('');
  const [cTingkat, setCTingkat] = useState<'X' | 'XI' | 'XII'>('X');
  const [cWaliKelasId, setCWaliKelasId] = useState('');

  // Modal State for Account
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountEditing, setAccountEditing] = useState<UserAccount | null>(null);
  const [aNama, setANama] = useState('');
  const [aUsername, setAUsername] = useState('');
  const [aEmail, setAEmail] = useState('');
  const [aRole, setARole] = useState<UserRole>('guru');
  const [aStatus, setAStatus] = useState<'aktif' | 'nonaktif'>('aktif');
  const [aPassword, setAPassword] = useState('');
  const [aIdentifier, setAIdentifier] = useState('');
  const [aTargetId, setATargetId] = useState('');
  const [aMapel, setAMapel] = useState('');
  const [aRombel, setARombel] = useState('');
  const [aIsWaliKelas, setAIsWaliKelas] = useState(false);
  const [aWaliKelasRombel, setAWaliKelasRombel] = useState('');

  // Modal State for Excel Import
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importSummary, setImportSummary] = useState<string | null>(null);

  // Modal State for Teacher Excel Import
  const [showTeacherImportModal, setShowTeacherImportModal] = useState(false);
  const [teacherCsvText, setTeacherCsvText] = useState('');
  const [teacherImportSummary, setTeacherImportSummary] = useState<string | null>(null);
  const [teacherImportError, setTeacherImportError] = useState<string | null>(null);
  const fileTeacherExcelInputRef = useRef<HTMLInputElement | null>(null);

  // Modal State for Student Promotion (Kenaikan Kelas)
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promotePreview, setPromotePreview] = useState<Array<{
    nisn: string;
    nama: string;
    fromRombel: string;
    toRombel: string;
    status: 'naik' | 'lulus';
  }> | null>(null);
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoteResult, setPromoteResult] = useState<{ promoted: number; graduated: number } | null>(null);

  const openTeacherModal = (teacher?: Teacher) => {
    if (teacher) {
      setTeacherEditing(teacher);
      setTNama(teacher.nama);
      setTNip(teacher.nip);
      setTEmail(teacher.email);
      setTMapel(teacher.mapel);
      setTNoWa(teacher.noWa);
      setTAlamat(teacher.alamat);
      setTIsWali(!!teacher.isWaliKelas);
      setTWaliRombel(teacher.waliKelasRombel || '');
    } else {
      setTeacherEditing(null);
      setTNama('');
      setTNip('');
      setTEmail('');
      setTMapel('');
      setTNoWa('');
      setTAlamat('');
      setTIsWali(false);
      setTWaliRombel('');
    }
    setShowTeacherModal(true);
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (teacherEditing) {
      updateTeacher(teacherEditing.id, {
        nama: tNama,
        nip: tNip,
        email: tEmail,
        mapel: tMapel,
        noWa: tNoWa,
        alamat: tAlamat,
        isWaliKelas: tIsWali,
        waliKelasRombel: tIsWali ? tWaliRombel : undefined,
      });
    } else {
      addTeacher({
        nama: tNama,
        nip: tNip,
        email: tEmail,
        mapel: tMapel,
        noWa: tNoWa,
        alamat: tAlamat,
        isWaliKelas: tIsWali,
        waliKelasRombel: tIsWali ? tWaliRombel : undefined,
      });
    }
    setShowTeacherModal(false);
  };

  const openStudentModal = (student?: Student) => {
    if (student) {
      setStudentEditing(student);
      setSNama(student.nama);
      setSNisn(student.nisn);
      setSEmail(student.email);
      setSRombel(student.rombel);
      setSNoWa(student.noWa);
      setSAlamat(student.alamat);
      setSNamaWali(student.namaWali || '');
    } else {
      setStudentEditing(null);
      setSNama('');
      setSNisn('');
      setSEmail('');
      setSRombel(classes[0]?.nama || 'X-A');
      setSNoWa('');
      setSAlamat('');
      setSNamaWali('');
    }
    setShowStudentModal(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentEditing) {
      updateStudent(studentEditing.id, {
        nama: sNama,
        nisn: sNisn,
        email: sEmail,
        rombel: sRombel,
        noWa: sNoWa,
        alamat: sAlamat,
        namaWali: sNamaWali,
      });
    } else {
      addStudent({
        nama: sNama,
        nisn: sNisn,
        email: sEmail,
        rombel: sRombel,
        noWa: sNoWa,
        alamat: sAlamat,
        namaWali: sNamaWali,
      });
    }
    setShowStudentModal(false);
  };

  // Class (Rombel) Modal Handlers
  const openClassModal = (cls?: ClassRoom) => {
    if (cls) {
      setClassEditing(cls);
      setCNama(cls.nama);
      setCTingkat(cls.tingkat);
      setCWaliKelasId(cls.waliKelasId || '');
    } else {
      setClassEditing(null);
      setCNama('');
      setCTingkat('X');
      setCWaliKelasId('');
    }
    setShowClassModal(true);
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cNama.trim()) {
      alert('Nama Rombel wajib diisi.');
      return;
    }
    if (classEditing) {
      updateClass(classEditing.id, {
        nama: cNama,
        tingkat: cTingkat,
        waliKelasId: cWaliKelasId || undefined,
        waliKelasNama: teachers.find((t) => t.id === cWaliKelasId)?.nama || '',
      });
    } else {
      addClass({
        nama: cNama,
        tingkat: cTingkat,
        waliKelasId: cWaliKelasId || '',
        waliKelasNama: teachers.find((t) => t.id === cWaliKelasId)?.nama || '',
      });
    }
    setShowClassModal(false);
  };

  // Account Modal Handlers
  const openAccountModal = (acc?: UserAccount) => {
    if (acc) {
      setAccountEditing(acc);
      setANama(acc.nama);
      setAUsername(acc.username);
      setAEmail(acc.email);
      setARole(acc.role);
      setAStatus(acc.status);
      setAPassword(acc.password || '');
      setAIdentifier(acc.identifier);
      setATargetId(acc.targetId || '');
      setAMapel(acc.mapel || '');
      setARombel(acc.rombel || '');
      setAIsWaliKelas(!!acc.isWaliKelas);
      setAWaliKelasRombel(acc.waliKelasRombel || '');
    } else {
      setAccountEditing(null);
      setANama('');
      setAUsername('');
      setAEmail('');
      setARole('guru');
      setAStatus('aktif');
      setAPassword('madrasah123');
      setAIdentifier('');
      setATargetId('');
      setAMapel('');
      setARombel('');
      setAIsWaliKelas(false);
      setAWaliKelasRombel('');
    }
    setShowAccountModal(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aNama.trim() || !aUsername.trim() || !aEmail.trim() || !aIdentifier.trim()) {
      alert('Nama, Username, Email, dan Identifier wajib diisi.');
      return;
    }
    if (accountEditing) {
      updateAccount(accountEditing.id, {
        nama: aNama,
        username: aUsername,
        email: aEmail,
        role: aRole,
        status: aStatus,
        password: aPassword || undefined,
        identifier: aIdentifier,
        targetId: aTargetId || undefined,
        mapel: aMapel || undefined,
        rombel: aRombel || undefined,
        isWaliKelas: aIsWaliKelas,
        waliKelasRombel: aIsWaliKelas ? aWaliKelasRombel : undefined,
      });
    } else {
      addAccount({
        username: aUsername,
        email: aEmail,
        nama: aNama,
        role: aRole,
        status: aStatus,
        password: aPassword,
        identifier: aIdentifier,
        targetId: aTargetId || undefined,
        mapel: aMapel || undefined,
        rombel: aRombel || undefined,
        isWaliKelas: aIsWaliKelas,
        waliKelasRombel: aIsWaliKelas ? aWaliKelasRombel : undefined,
      });
    }
    setShowAccountModal(false);
  };

  // Unduh Template Excel Guru & Tendik (.xlsx & .csv)
  const handleDownloadTeacherExcelTemplate = () => {
    const templateData = [
      {
        NIP: '197904152005011004',
        'Nama Lengkap': 'NAMA GURU LENGKAP DENGAN GELAR',
        'Mata Pelajaran / Tugas': 'MATA PELAJARAN / JABATAN',
        'Email Guru': 'email.guru@madrasah.sch.id',
        'Nomor WhatsApp': '08xxxxxxxxxx',
        Alamat: 'ALAMAT LENGKAP GURU',
        'Wali Kelas': 'Ya / Tidak',
        'Rombel Binaan': 'NAMA ROMBEL (jika wali kelas)',
      },
      {
        NIP: '198402202008012003',
        'Nama Lengkap': 'NAMA GURU LENGKAP DENGAN GELAR',
        'Mata Pelajaran / Tugas': 'MATA PELAJARAN / JABATAN',
        'Email Guru': 'email.guru@madrasah.sch.id',
        'Nomor WhatsApp': '08xxxxxxxxxx',
        Alamat: 'ALAMAT LENGKAP GURU',
        'Wali Kelas': 'Tidak',
        'Rombel Binaan': '',
      },
    ];

    try {
      const ws = XLSX.utils.json_to_sheet(templateData);
      ws['!cols'] = [
        { wch: 22 }, // NIP
        { wch: 32 }, // Nama Lengkap
        { wch: 30 }, // Mapel / Tugas
        { wch: 30 }, // Email Guru
        { wch: 18 }, // Nomor WhatsApp
        { wch: 45 }, // Alamat
        { wch: 14 }, // Wali Kelas
        { wch: 16 }, // Rombel Binaan
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template_Guru_Tendik');
      XLSX.writeFile(wb, 'Template_Impor_Guru_Tendik_Madrasah.xlsx');
    } catch {
      // Fallback CSV download
      const headers = ['NIP', 'Nama Lengkap', 'Mata Pelajaran / Tugas', 'Email Guru', 'Nomor WhatsApp', 'Alamat', 'Wali Kelas', 'Rombel Binaan'];
      const rows = templateData.map((d) => [
        d.NIP,
        `"${d['Nama Lengkap']}"`,
        `"${d['Mata Pelajaran / Tugas']}"`,
        d['Email Guru'],
        d['Nomor WhatsApp'],
        `"${d.Alamat}"`,
        `"${d['Wali Kelas']}"`,
        `"${d['Rombel Binaan']}"`,
      ]);
      const csv = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Template_Impor_Guru_Tendik_Madrasah.csv';
      a.click();
    }
  };

  // Upload Excel File Guru & Tendik (.xlsx / .xls / .csv)
  const handleUploadTeacherExcelFile = (file: File) => {
    setTeacherImportError(null);
    setTeacherImportSummary(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet);

        const parsedTeachers: Omit<Teacher, 'id'>[] = [];
        jsonRows.forEach((row) => {
          const nip = String(row['NIP'] || row['nip'] || row['NUPTK'] || row['PegID'] || row['ID'] || '').trim();
          const nama = String(row['Nama Lengkap'] || row['Nama'] || row['nama'] || '').trim();
          const mapel = String(
            row['Mata Pelajaran / Tugas'] ||
            row['Mata Pelajaran'] ||
            row['Mapel'] ||
            row['Tugas'] ||
            row['mapel'] ||
            'Guru Mapel'
          ).trim();
          const email = String(
            row['Email Guru'] ||
            row['Email'] ||
            row['email'] ||
            `${nip ? nip.toLowerCase().replace(/[^a-z0-9]/g, '') : 'guru'}@madrasah.sch.id`
          ).trim();
          const noWa = String(
            row['Nomor WhatsApp'] ||
            row['WhatsApp'] ||
            row['No WA'] ||
            row['noWa'] ||
            '081200000000'
          ).trim();
          const alamat = String(row['Alamat'] || row['alamat'] || 'Alamat Madrasah').trim();
          const isWaliRaw = String(row['Wali Kelas'] || row['isWaliKelas'] || '').trim().toLowerCase();
          const isWaliKelas =
            isWaliRaw === 'ya' || isWaliRaw === 'yes' || isWaliRaw === 'true' || isWaliRaw === '1' || isWaliRaw === 'y';
          const waliKelasRombel = String(row['Rombel Binaan'] || row['Rombel'] || row['waliKelasRombel'] || '').trim();

          if (nip && nama) {
            parsedTeachers.push({
              nip,
              nama,
              mapel,
              email,
              noWa,
              alamat,
              isWaliKelas,
              waliKelasRombel: isWaliKelas ? waliKelasRombel : undefined,
            });
          }
        });

        if (parsedTeachers.length > 0) {
          const added = importTeachersBatch(parsedTeachers);
          setTeacherImportSummary(`Berhasil mengimpor ${added} data guru & tendik baru dari berkas Excel tanpa duplikasi NIP.`);
          setTimeout(() => {
            setTeacherImportSummary(null);
            setShowTeacherImportModal(false);
          }, 3000);
        } else {
          setTeacherImportError('Tidak ditemukan data guru yang valid dalam berkas Excel ini. Pastikan kolom NIP dan Nama Lengkap terisi.');
        }
      } catch (err) {
        console.error('Error reading excel file', err);
        setTeacherImportError('Gagal membaca berkas Excel. Pastikan format file .xlsx atau .csv');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Import Batch Process Guru via Text
  const handleBatchTeacherImport = () => {
    if (!teacherCsvText.trim()) return;
    setTeacherImportError(null);
    setTeacherImportSummary(null);
    const lines = teacherCsvText.trim().split('\n');
    const parsedTeachers: Omit<Teacher, 'id'>[] = [];

    lines.forEach((line) => {
      const parts = line.split(/[;,]/).map((p) => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 2 && parts[0] && parts[1]) {
        if (parts[0].toLowerCase().includes('nip') || parts[1].toLowerCase().includes('nama')) {
          return;
        }
        const nip = parts[0];
        const nama = parts[1];
        const mapel = parts[2] || 'Guru Mapel';
        const email = parts[3] || `${nip.toLowerCase().replace(/[^a-z0-9]/g, '')}@madrasah.sch.id`;
        const noWa = parts[4] || '081200000000';
        const alamat = parts[5] || 'Alamat Madrasah';
        const isWaliRaw = (parts[6] || '').toLowerCase();
        const isWaliKelas =
          isWaliRaw === 'ya' || isWaliRaw === 'yes' || isWaliRaw === 'true' || isWaliRaw === '1' || isWaliRaw === 'y';
        const waliKelasRombel = isWaliKelas ? (parts[7] || '') : undefined;

        parsedTeachers.push({
          nip,
          nama,
          mapel,
          email,
          noWa,
          alamat,
          isWaliKelas,
          waliKelasRombel,
        });
      }
    });

    if (parsedTeachers.length > 0) {
      const added = importTeachersBatch(parsedTeachers);
      setTeacherImportSummary(`Berhasil mengimpor ${added} data guru & tendik baru tanpa duplikasi NIP.`);
      setTimeout(() => {
        setTeacherImportSummary(null);
        setShowTeacherImportModal(false);
      }, 3000);
    } else {
      setTeacherImportError('Format teks tidak valid. Pastikan format: NIP;Nama Lengkap;Mapel;Email;NoWA;Alamat;WaliKelas;Rombel');
    }
  };

  // Unduh Template Excel Resmi Siswa (.xlsx & .csv)
  const handleDownloadExcelTemplate = () => {
    const templateData = [
      {
        NISN: '0071234511',
        'Nama Siswa': 'NAMA SISWA LENGKAP',
        'Rombel / Kelas': 'NAMA ROMBEL (contoh: X-A, XI-MIPA 1, XII-MIPA 1)',
        'Email Siswa': 'email.siswa@madrasah.sch.id',
        'WhatsApp Orang Tua': '08xxxxxxxxxx',
        Alamat: 'ALAMAT LENGKAP SISWA',
        'Nama Orang Tua / Wali': 'NAMA ORANG TUA / WALI',
      },
      {
        NISN: '0071234512',
        'Nama Siswa': 'NAMA SISWA LENGKAP',
        'Rombel / Kelas': 'NAMA ROMBEL (contoh: X-A, XI-MIPA 1, XII-MIPA 1)',
        'Email Siswa': 'email.siswa@madrasah.sch.id',
        'WhatsApp Orang Tua': '08xxxxxxxxxx',
        Alamat: 'ALAMAT LENGKAP SISWA',
        'Nama Orang Tua / Wali': 'NAMA ORANG TUA / WALI',
      },
    ];

    try {
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template_Siswa');
      XLSX.writeFile(wb, 'Template_Impor_Siswa_Madrasah.xlsx');
    } catch {
      // Fallback CSV download
      const headers = ['NISN', 'Nama Siswa', 'Rombel', 'Email Siswa', 'WhatsApp Wali', 'Alamat', 'Nama Wali'];
      const rows = templateData.map((d) => [
        d.NISN,
        `"${d['Nama Siswa']}"`,
        `"${d['Rombel / Kelas']}"`,
        d['Email Siswa'],
        d['WhatsApp Orang Tua'],
        `"${d.Alamat}"`,
        `"${d['Nama Orang Tua / Wali']}"`,
      ]);
      const csv = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Template_Impor_Siswa_Madrasah.csv';
      a.click();
    }
  };

  // Upload Excel File (.xlsx / .xls / .csv)
  const handleUploadExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet);

        const parsedStudents: Omit<Student, 'id'>[] = [];
        jsonRows.forEach((row) => {
          const nisn = String(row['NISN'] || row['nisn'] || '').trim();
          const nama = String(row['Nama Siswa'] || row['Nama'] || row['nama'] || '').trim();
          const rombel = String(row['Rombel / Kelas'] || row['Rombel'] || row['Kelas'] || row['rombel'] || 'X-A').trim();
          const email = String(row['Email Siswa'] || row['Email'] || row['email'] || `${nisn}@siswa.madrasah.sch.id`).trim();
          const noWa = String(row['WhatsApp Orang Tua'] || row['No WA'] || row['noWa'] || '0812000000').trim();
          const alamat = String(row['Alamat'] || row['alamat'] || 'Alamat Madrasah').trim();
          const namaWali = String(row['Nama Orang Tua / Wali'] || row['Nama Wali'] || row['namaWali'] || 'Wali Murid').trim();

          if (nisn && nama) {
            parsedStudents.push({
              nisn,
              nama,
              rombel,
              email,
              noWa,
              alamat,
              namaWali,
            });
          }
        });

        if (parsedStudents.length > 0) {
          const added = importStudentsBatch(parsedStudents);
          setImportSummary(`Berhasil mengimpor ${added} data siswa baru dari berkas Excel tanpa duplikasi NISN.`);
          setTimeout(() => {
            setImportSummary(null);
            setShowImportModal(false);
          }, 3000);
        } else {
          alert('Tidak ditemukan data siswa yang valid dalam berkas Excel ini. Pastikan kolom NISN dan Nama Siswa terisi.');
        }
      } catch (err) {
        console.error('Error reading excel file', err);
        alert('Gagal membaca berkas Excel. Pastikan format file .xlsx atau .csv');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Import Batch Process via Text
  const handleBatchImport = () => {
    if (!csvText.trim()) return;
    const lines = csvText.trim().split('\n');
    const parsedStudents: Omit<Student, 'id'>[] = [];

    lines.forEach((line) => {
      const parts = line.split(/[;,]/).map((p) => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 2 && parts[0] && parts[1]) {
        if (parts[0].toLowerCase().includes('nisn') || parts[1].toLowerCase().includes('nama')) {
          return;
        }
        parsedStudents.push({
          nisn: parts[0],
          nama: parts[1],
          rombel: parts[2] || 'X-A',
          email: parts[3] || `${parts[0]}@siswa.madrasah.sch.id`,
          noWa: parts[4] || '0812000000',
          alamat: parts[5] || 'Alamat Madrasah',
          namaWali: parts[6] || 'Wali Murid',
        });
      }
    });

    if (parsedStudents.length > 0) {
      const added = importStudentsBatch(parsedStudents);
      setImportSummary(`Berhasil mengimpor ${added} data siswa baru tanpa duplikasi NISN.`);
      setTimeout(() => {
        setImportSummary(null);
        setShowImportModal(false);
        setCsvText('');
      }, 2500);
    } else {
      alert('Format teks atau file CSV tidak valid. Pastikan format: NISN;Nama;Rombel;Email');
    }
  };

  // Promotion Modal Handlers
  const handleOpenPromoteModal = () => {
    // Build preview first (dry run)
    const tingkatOrder: Array<'X' | 'XI' | 'XII'> = ['X', 'XI', 'XII'];
    const classByTingkat: Record<string, string[]> = { X: [], XI: [], XII: [] };
    classes.forEach((c) => {
      if (classByTingkat[c.tingkat]) classByTingkat[c.tingkat].push(c.nama);
    });

    const preview: Array<{ nisn: string; nama: string; fromRombel: string; toRombel: string; status: 'naik' | 'lulus' }> = [];
    let promoteIdx = 0;

    students.forEach((s) => {
      const currentTingkat = classes.find((c) => c.nama === s.rombel)?.tingkat;
      if (!currentTingkat) return;
      const currentIndex = tingkatOrder.indexOf(currentTingkat);
      if (currentIndex === -1) return;

      if (currentIndex < tingkatOrder.length - 1) {
        const nextTingkat = tingkatOrder[currentIndex + 1];
        const nextClasses = classByTingkat[nextTingkat];
        if (nextClasses.length > 0) {
          const targetClass = nextClasses[promoteIdx % nextClasses.length];
          preview.push({ nisn: s.nisn, nama: s.nama, fromRombel: s.rombel, toRombel: targetClass, status: 'naik' });
          promoteIdx++;
        }
      } else {
        preview.push({ nisn: s.nisn, nama: s.nama, fromRombel: s.rombel, toRombel: 'LULUS', status: 'lulus' });
      }
    });

    setPromotePreview(preview);
    setPromoteResult(null);
    setShowPromoteModal(true);
  };

  const handleConfirmPromote = () => {
    setPromoteLoading(true);
    try {
      const result = promoteStudents();
      setPromoteResult({ promoted: result.promoted, graduated: result.graduated });
      setPromotePreview(null);
    } catch (err) {
      console.error('Promote error:', err);
      alert('Gagal memproses kenaikan kelas.');
    } finally {
      setPromoteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Pengelolaan Data Master Madrasah
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola profil lembaga, data guru, data siswa, rombel kelas, serta akun otorisasi login.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'lembaga' && (
            <button
              onClick={() => logoInputRef.current?.click()}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Unggah Logo</span>
            </button>
          )}
          {activeTab === 'guru' && (
            <>
              <button
                type="button"
                onClick={handleDownloadTeacherExcelTemplate}
                className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Unduh format tabel Excel (.xlsx) kosong untuk data guru & tendik"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Unduh Format Excel</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTeacherImportSummary(null);
                  setTeacherImportError(null);
                  setShowTeacherImportModal(true);
                }}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Unggah berkas Excel (.xlsx / .csv) data guru & tendik"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Import Excel</span>
              </button>
              <button
                type="button"
                onClick={() => openTeacherModal()}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Guru Manual</span>
              </button>
            </>
          )}
          {activeTab === 'siswa' && (
            <>
              <button
                onClick={handleDownloadExcelTemplate}
                className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Unduh format tabel Excel kosong untuk diisi"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Unduh Format Excel</span>
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Impor Excel Siswa</span>
              </button>
              <button
                onClick={() => openStudentModal()}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Siswa Manual</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenPromoteModal()}
                className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Kenaikan kelas massal: X→XI, XI→XII, XII→Lulus"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Kenaikan Kelas</span>
              </button>
            </>
          )}
          {activeTab === 'akun' && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const count = generateAccountsForTeachers();
                  alert(`Berhasil generate ${count} akun guru baru.`);
                }}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Generate Akun Guru
              </button>
              <button
                onClick={() => {
                  const count = generateAccountsForStudents();
                  alert(`Berhasil generate ${count} akun siswa baru.`);
                }}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Generate Akun Siswa
              </button>
              <button
                type="button"
                onClick={() => openAccountModal()}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Akun Manual</span>
              </button>
            </div>
          )}
          {activeTab === 'kelas' && (
            <button
              type="button"
              onClick={() => openClassModal()}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Rombel</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('lembaga')}
          className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'lembaga'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Data Lembaga (Profil)</span>
        </button>
        <button
          onClick={() => setActiveTab('guru')}
          className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'guru'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Data Guru & Tendik ({teachers.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('siswa')}
          className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'siswa'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Data Siswa ({students.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('kelas')}
          className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'kelas'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Rombel Kelas ({classes.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('akun')}
          className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'akun'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Manajemen Akun & Hak Akses ({accounts.length})</span>
        </button>
      </div>

      {/* Tab: DATA LEMBAGA */}
      {activeTab === 'lembaga' && (
        <div className="space-y-6">
          {saveLembagaSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <span className="font-bold">Data Lembaga Berhasil Disimpan!</span>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Nama madrasah, NSM, NPSM, alamat, dan logo telah diperbarui secara otomatis.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSaveLembagaSuccess(false)}
                className="p-1 hover:bg-emerald-100 rounded-md text-emerald-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-700" />
                  <span>Formulir Data Lembaga Madrasah</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Atur identitas resmi madrasah, nomor statistik, dan logo untuk kartu tanda siswa & administrasi presensi.
                </p>
              </div>

              <form onSubmit={handleSaveLembaga} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Nama Madrasah <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lNama}
                    onChange={(e) => setLNama(e.target.value)}
                    placeholder="Contoh: MAN 1 Teladan Jakarta"
                    className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      NSM (Nomor Statistik Madrasah) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={lNsm}
                      onChange={(e) => setLNsm(e.target.value)}
                      placeholder="Contoh: 131131710001"
                      className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      NPSM / NPSN <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={lNpsm}
                      onChange={(e) => setLNpsm(e.target.value)}
                      placeholder="Contoh: 20108876"
                      className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Alamat Lengkap Madrasah <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={lAlamat}
                    onChange={(e) => setLAlamat(e.target.value)}
                    placeholder="Contoh: Jl. Lapangan Banteng Barat No. 3-4, Sawah Besar, Jakarta Pusat"
                    className="w-full px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                  />
                </div>

                {/* Logo Upload Zone */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-slate-900">
                        Logo Lembaga Madrasah
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Unggah logo resmi madrasah (PNG, JPG, JPEG, SVG).
                      </p>
                    </div>
                    {lLogo && (
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                        Logo Aktif
                      </span>
                    )}
                  </div>

                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoFile(file);
                      e.target.value = '';
                    }}
                  />

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingLogo(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDraggingLogo(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingLogo(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleLogoFile(file);
                    }}
                    className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                      isDraggingLogo
                        ? 'border-emerald-600 bg-emerald-50/80 scale-[1.01]'
                        : 'border-slate-300 bg-white hover:border-emerald-500 hover:bg-slate-50/50'
                    }`}
                  >
                    {lLogo ? (
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-2">
                        <div className="w-20 h-20 rounded-full border-2 border-emerald-600/30 bg-white p-1 shadow-xs flex items-center justify-center overflow-hidden shrink-0">
                          <img
                            src={lLogo}
                            alt="Pratinjau Logo"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="text-left space-y-1.5">
                          <div className="text-xs font-semibold text-slate-800">
                            Berkas Logo Telah Siap
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => logoInputRef.current?.click()}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-[11px] font-semibold cursor-pointer"
                            >
                              Ganti Logo
                            </button>
                            <button
                              type="button"
                              onClick={() => setLLogo('')}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-[11px] font-semibold cursor-pointer"
                            >
                              Hapus Logo
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 space-y-2">
                        <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-semibold text-slate-800">
                          Klik tombol di bawah atau seret gambar logo ke sini
                        </p>
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Pilih Berkas Logo
                        </button>
                      </div>
                    )}
                  </div>
                  {logoUploadError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{logoUploadError}</span>
                    </div>
                  )}
                </div>

                {/* Additional Info Expandable */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowKontakLembaga(!showKontakLembaga)}
                    className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    <span>Informasi Tambahan (Pimpinan & Kontak Madrasah)</span>
                    {showKontakLembaga ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showKontakLembaga && (
                    <div className="p-4 bg-white space-y-3 border-t border-slate-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Kepala Madrasah
                          </label>
                          <input
                            type="text"
                            value={lKepala}
                            onChange={(e) => setLKepala(e.target.value)}
                            placeholder="Dr. H. Ahmad Fauzi, M.Pd"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            NIP Kepala Madrasah
                          </label>
                          <input
                            type="text"
                            value={lNipKepala}
                            onChange={(e) => setLNipKepala(e.target.value)}
                            placeholder="197205141998031002"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Telepon Lembaga
                          </label>
                          <input
                            type="text"
                            value={lTelepon}
                            onChange={(e) => setLTelepon(e.target.value)}
                            placeholder="(021) 3811642"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Email Madrasah
                          </label>
                          <input
                            type="email"
                            value={lEmail}
                            onChange={(e) => setLEmail(e.target.value)}
                            placeholder="admin@man1teladan.sch.id"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleResetLembaga}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Semula</span>
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Data Lembaga</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Live Preview Panel */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Pratinjau Identitas Lembaga
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                    Live Preview
                  </span>
                </div>
                <div className="flex items-start gap-3.5">
                  <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-1.5 overflow-hidden shadow-2xs shrink-0">
                    {lLogo ? (
                      <img src={lLogo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full bg-emerald-700 rounded-lg flex items-center justify-center text-white font-serif font-bold text-xl">
                        M
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">
                      {lNama || 'Nama Madrasah'}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                      {lAlamat || 'Alamat Lembaga'}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        NSM: {lNsm || '-'}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        NPSM: {lNpsm || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: GURU */}
      {activeTab === 'guru' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          {/* Quick Action & Stats Toolbar */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-900">Total Terdaftar:</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md">{teachers.length} Guru & Tendik</span>
              <span className="hidden sm:inline text-slate-400">•</span>
              <span className="hidden sm:inline text-slate-500">Mendukung impor massal dari berkas Excel (.xlsx / .csv)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadTeacherExcelTemplate}
                className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Unduh format tabel Excel kosong untuk diisi"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Unduh Format Excel</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTeacherImportSummary(null);
                  setTeacherImportError(null);
                  setShowTeacherImportModal(true);
                }}
                className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Impor data guru dari file Excel"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Import Excel</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">NIP / ID</th>
                  <th className="py-3 px-4">Mata Pelajaran / Tugas</th>
                  <th className="py-3 px-4">Wali Kelas</th>
                  <th className="py-3 px-4">Kontak WhatsApp</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {t.nama}
                      <span className="text-[11px] text-slate-500 font-normal block">
                        {t.email}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800 tabular-nums">
                      {t.nip}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{t.mapel}</td>
                    <td className="py-3 px-4">
                      {t.isWaliKelas ? (
                        <span className="text-emerald-800 font-semibold">
                          Wali {t.waliKelasRombel}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{t.noWa}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openTeacherModal(t)}
                          className="text-slate-500 hover:text-slate-900 cursor-pointer p-1"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Yakin ingin menghapus guru ${t.nama}?`)) {
                              deleteTeacher(t.id);
                            }
                          }}
                          className="text-slate-400 hover:text-red-600 cursor-pointer p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: SISWA */}
      {activeTab === 'siswa' && (
        <div className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari siswa nama atau NISN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Filter Rombel:</span>
              <select
                value={filterRombel}
                onChange={(e) => setFilterRombel(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white cursor-pointer"
              >
                <option value="ALL">Semua Kelas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.nama}>
                    {c.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-[10px] uppercase">
                  <tr>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4">NISN</th>
                    <th className="py-3 px-4">Rombel Kelas</th>
                    <th className="py-3 px-4">Nama Wali</th>
                    <th className="py-3 px-4">WhatsApp Wali</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students
                    .filter((s) => {
                      const matchClass = filterRombel === 'ALL' || s.rombel === filterRombel;
                      const matchQ =
                        !searchQuery.trim() ||
                        s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.nisn.includes(searchQuery);
                      return matchClass && matchQ;
                    })
                    .map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {s.nama}
                          <span className="text-[11px] text-slate-500 font-normal block">
                            {s.email}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800 tabular-nums">
                          {s.nisn}
                        </td>
                        <td className="py-3 px-4 font-semibold text-emerald-800">
                          {s.rombel}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{s.namaWali || '-'}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{s.noWa}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openStudentModal(s)}
                              className="text-slate-500 hover:text-slate-900 cursor-pointer p-1"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Yakin ingin menghapus siswa ${s.nama}?`)) {
                                  deleteStudent(s.id);
                                }
                              }}
                              className="text-slate-400 hover:text-red-600 cursor-pointer p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: KELAS */}
      {activeTab === 'kelas' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-700" />
                <span>Data Rombel Kelas</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola rombel kelas, tingkat, dan wali kelas.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
              Total {classes.length} Rombel
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-[10px] uppercase">
                  <tr>
                    <th className="py-3 px-4">Nama Rombel</th>
                    <th className="py-3 px-4">Tingkat</th>
                    <th className="py-3 px-4">Wali Kelas</th>
                    <th className="py-3 px-4">Jumlah Siswa</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classes.map((cls) => {
                    const count = students.filter((s) => s.rombel === cls.nama).length;
                    return (
                      <tr key={cls.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{cls.nama}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                            Tingkat {cls.tingkat}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{cls.waliKelasNama || '-'}</td>
                        <td className="py-3 px-4 font-mono text-slate-500 tabular-nums">{count} Siswa</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openClassModal(cls)}
                              className="text-slate-500 hover:text-slate-900 cursor-pointer p-1"
                              title="Edit Rombel"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Yakin ingin menghapus rombel ${cls.nama}?`)) {
                                  deleteClass(cls.id);
                                }
                              }}
                              className="text-slate-400 hover:text-red-600 cursor-pointer p-1"
                              title="Hapus Rombel"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: MANAJEMEN AKUN & HAK AKSES */}
      {activeTab === 'akun' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-700" />
                <span>Daftar Akun Pengguna & Hak Akses (RBAC)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola hak akses untuk Administrator, Kepala Madrasah, Guru/Wali Kelas, dan Siswa.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
              Total {accounts.length} Akun Terdaftar
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-[10px] uppercase">
                  <tr>
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-4">Username / ID</th>
                    <th className="py-3 px-4">Peran (Role)</th>
                    <th className="py-3 px-4">Kata Sandi</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {acc.nama}
                        <span className="text-[11px] text-slate-500 font-normal block">
                          {acc.email}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-800">
                        {acc.username}
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            acc.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : acc.role === 'kepala'
                              ? 'bg-blue-100 text-blue-800'
                              : acc.role === 'guru'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {acc.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {acc.password || '******'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            acc.status === 'aktif'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {acc.status}
                        </span>
                      </td>
<td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openAccountModal(acc)}
                              className="px-2 py-1 text-[11px] border border-slate-300 hover:bg-slate-100 rounded text-emerald-700 font-semibold cursor-pointer"
                              title="Edit Akun"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newPass = prompt(`Masukkan kata sandi baru untuk ${acc.nama}:`, 'madrasah123');
                                if (newPass) {
                                  resetAccountPassword(acc.id, newPass);
                                  alert('Kata sandi berhasil direset.');
                                }
                              }}
                              className="px-2 py-1 text-[11px] border border-slate-300 hover:bg-slate-100 rounded text-slate-700 font-semibold cursor-pointer"
                              title="Reset Kata Sandi"
                            >
                              Reset Sandi
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                updateAccount(acc.id, {
                                  status: acc.status === 'aktif' ? 'nonaktif' : 'aktif',
                                });
                              }}
                              className="px-2 py-1 text-[11px] border border-slate-300 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                            >
                              {acc.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Yakin ingin menghapus akun ${acc.nama}?`)) {
                                  deleteAccount(acc.id);
                                }
                              }}
                              className="px-2 py-1 text-[11px] border border-slate-300 hover:bg-rose-100 rounded text-rose-600 cursor-pointer"
                              title="Hapus Akun"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Teacher Add / Edit */}
      {showTeacherModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900">
              {teacherEditing ? 'Perbarui Data Guru' : 'Tambah Guru Baru'}
            </h3>
            <form onSubmit={handleSaveTeacher} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  required
                  value={tNama}
                  onChange={(e) => setTNama(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">NIP / ID Pendidik</label>
                  <input
                    type="text"
                    required
                    value={tNip}
                    onChange={(e) => setTNip(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">No. WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={tNoWa}
                    onChange={(e) => setTNoWa(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Email Resmi</label>
                <input
                  type="email"
                  required
                  value={tEmail}
                  onChange={(e) => setTEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Mata Pelajaran / Posisi</label>
                <input
                  type="text"
                  required
                  value={tMapel}
                  onChange={(e) => setTMapel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tIsWali}
                    onChange={(e) => setTIsWali(e.target.checked)}
                    className="rounded text-emerald-700 focus:ring-emerald-700"
                  />
                  <span className="font-semibold text-slate-800">Ditunjuk Sebagai Wali Kelas</span>
                </label>
                {tIsWali && (
                  <input
                    type="text"
                    placeholder="Nama Kelas (Contoh: XII-MIPA 1)"
                    value={tWaliRombel}
                    onChange={(e) => setTWaliRombel(e.target.value)}
                    className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                )}
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTeacherModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Student Add / Edit */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900">
              {studentEditing ? 'Perbarui Data Siswa' : 'Tambah Siswa Baru'}
            </h3>
            <form onSubmit={handleSaveStudent} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  required
                  value={sNama}
                  onChange={(e) => setSNama(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">NISN (10 Digit)</label>
                  <input
                    type="text"
                    required
                    value={sNisn}
                    onChange={(e) => setSNisn(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Rombel Kelas</label>
                  <select
                    value={sRombel}
                    onChange={(e) => setSRombel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.nama}>
                        {c.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Email Siswa</label>
                <input
                  type="email"
                  required
                  value={sEmail}
                  onChange={(e) => setSEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Nama Orang Tua / Wali</label>
                  <input
                    type="text"
                    value={sNamaWali}
                    onChange={(e) => setSNamaWali(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">No. WhatsApp Wali</label>
                  <input
                    type="text"
                    value={sNoWa}
                    onChange={(e) => setSNoWa(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Class (Rombel) Add / Edit */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900">
              {classEditing ? 'Perbarui Data Rombel' : 'Tambah Rombel Baru'}
            </h3>
            <form onSubmit={handleSaveClass} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Nama Rombel</label>
                <input
                  type="text"
                  required
                  value={cNama}
                  onChange={(e) => setCNama(e.target.value)}
                  placeholder="Contoh: XII-MIPA 1, XI-IPA 2, X-A"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Tingkat</label>
                  <select
                    value={cTingkat}
                    onChange={(e) => setCTingkat(e.target.value as 'X' | 'XI' | 'XII')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="X">X</option>
                    <option value="XI">XI</option>
                    <option value="XII">XII</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Wali Kelas</label>
                  <select
                    value={cWaliKelasId}
                    onChange={(e) => setCWaliKelasId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- Pilih Wali Kelas --</option>
                    {teachers
                      .filter((t) => t.isWaliKelas)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nama} ({t.nip})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold"
                >
                  Simpan Rombel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Account Add / Edit */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">
              {accountEditing ? 'Perbarui Data Akun' : 'Tambah Akun Baru'}
            </h3>
            <form onSubmit={handleSaveAccount} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={aNama}
                  onChange={(e) => setANama(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Username / ID Login</label>
                  <input
                    type="text"
                    required
                    value={aUsername}
                    onChange={(e) => setAUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Identifier (NIP/NISN)</label>
                  <input
                    type="text"
                    required
                    value={aIdentifier}
                    onChange={(e) => setAIdentifier(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Email</label>
                <input
                  type="email"
                  required
                  value={aEmail}
                  onChange={(e) => setAEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Peran (Role)</label>
                  <select
                    value={aRole}
                    onChange={(e) => setARole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="admin">Admin</option>
                    <option value="kepala">Kepala Madrasah</option>
                    <option value="guru">Guru</option>
                    <option value="siswa">Siswa</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Status</label>
                  <select
                    value={aStatus}
                    onChange={(e) => setAStatus(e.target.value as 'aktif' | 'nonaktif')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Kata Sandi (kosongkan jika tidak ingin mengubah)</label>
                <input
                  type="password"
                  value={aPassword}
                  onChange={(e) => setAPassword(e.target.value)}
                  placeholder="madrasah123"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Mata Pelajaran (Guru)</label>
                  <input
                    type="text"
                    value={aMapel}
                    onChange={(e) => setAMapel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Rombel (Siswa/Wali Kelas)</label>
                  <select
                    value={aRombel}
                    onChange={(e) => setARombel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- Pilih Rombel --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.nama}>
                        {c.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aIsWaliKelas}
                    onChange={(e) => setAIsWaliKelas(e.target.checked)}
                    className="rounded text-emerald-700 focus:ring-emerald-700"
                  />
                  <span className="font-semibold text-slate-800">Wali Kelas</span>
                </label>
                {aIsWaliKelas && (
                  <input
                    type="text"
                    placeholder="Rombel Binaan (Contoh: XII-MIPA 1)"
                    value={aWaliKelasRombel}
                    onChange={(e) => setAWaliKelasRombel(e.target.value)}
                    className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                )}
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Impor Excel Guru & Tendik */}
      {showTeacherImportModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                <span>Impor Data Guru & Tendik dari Excel</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowTeacherImportModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mt-2">
              Unggah berkas Excel (.xlsx / .xls / .csv) hasil unduhan template, atau tempelkan baris data guru langsung.
            </p>

            {teacherImportSummary && (
              <div className="my-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{teacherImportSummary}</span>
              </div>
            )}

            {teacherImportError && (
              <div className="my-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{teacherImportError}</span>
              </div>
            )}

            {/* Opsi 1: Upload File Excel */}
            <div className="mt-4 p-4 border-2 border-dashed border-emerald-300 bg-emerald-50/40 rounded-xl text-center space-y-2">
              <input
                ref={fileTeacherExcelInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadTeacherExcelFile(file);
                  e.target.value = '';
                }}
              />
              <UploadCloud className="w-8 h-8 text-emerald-700 mx-auto" />
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Opsi 1: Unggah Berkas File Excel (.xlsx / .csv)
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Sekali klik, seluruh dewan guru & tendik langsung terdaftar di sistem madrasah!
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileTeacherExcelInputRef.current?.click()}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Pilih Berkas Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTeacherExcelTemplate}
                  className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Unduh Format Excel</span>
                </button>
              </div>
            </div>

            {/* Opsi 2: Tempel teks CSV */}
            <div className="mt-4 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Opsi 2: Tempel Data Baris Teks Manual
              </label>
              <textarea
                rows={4}
                value={teacherCsvText}
                onChange={(e) => setTeacherCsvText(e.target.value)}
                placeholder="197904152005011004;Drs. H. Mulyanto, M.Pd.I;Bahasa Arab;mulyanto@man1teladan.sch.id;081234567891;Jakarta;Ya;XII-MIPA 2&#10;198402202008012003;Fatimah Az-Zahra, S.Pd;Biologi;fatimah.zahra@man1teladan.sch.id;081298765432;Jakarta;Tidak;"
                className="w-full text-xs font-mono p-3 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-700"
              ></textarea>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setTeacherCsvText(
                      '198501012010012001;Ahmad Syafi\'i, M.Pd;Bahasa Inggris;syafii@man1teladan.sch.id;081233445566;Jakarta Pusat;Ya;XI-IPA 1\n199203152020121008;Nurul Hidayati, S.Si;Kimia;nurul.h@man1teladan.sch.id;081377889900;Jakarta Selatan;Tidak;'
                    );
                  }}
                  className="text-xs text-emerald-700 hover:underline font-semibold cursor-pointer"
                >
                  Muat Contoh Baris Teks
                </button>
                <button
                  type="button"
                  onClick={handleBatchTeacherImport}
                  className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Proses Baris Teks</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Batch Import Excel / CSV */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                <span>Impor Massal Data Siswa dari Excel</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mt-2">
              Unggah berkas Excel (.xlsx / .xls / .csv) hasil unduhan template, atau tempelkan baris data langsung.
            </p>

            {importSummary && (
              <div className="my-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold">
                {importSummary}
              </div>
            )}

            {/* Opsi 1: Upload File Excel */}
            <div className="mt-4 p-4 border-2 border-dashed border-emerald-300 bg-emerald-50/40 rounded-xl text-center space-y-2">
              <input
                ref={fileExcelInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadExcelFile(file);
                  e.target.value = '';
                }}
              />
              <UploadCloud className="w-8 h-8 text-emerald-700 mx-auto" />
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Opsi 1: Unggah Berkas File Excel (.xlsx / .csv)
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Sekali klik, ribuan siswa langsung terdaftar lengkap dengan kode QR otomatis!
                </p>
              </div>
              <div className="flex justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileExcelInputRef.current?.click()}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  Pilih Berkas Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={handleDownloadExcelTemplate}
                  className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Unduh Template
                </button>
              </div>
            </div>

            {/* Opsi 2: Tempel teks CSV */}
            <div className="mt-4 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Opsi 2: Tempel Data Baris Teks Manual
              </label>
              <textarea
                rows={4}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="0071234509;Faris Abdul Hakim;XII-MIPA 1;faris@siswa.man1teladan.sch.id;081299112233;Jakarta;H. Hakim&#10;0071234510;Dina Permata;XII-MIPA 1;dina@siswa.man1teladan.sch.id;081299112244;Jakarta;Ir. Permadi"
                className="w-full text-xs font-mono p-3 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-700"
              ></textarea>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setCsvText(
                      '0071234511;Salma Kamila;XII-MIPA 1;salma@siswa.man1teladan.sch.id;081211112222;Jakarta;Drs. Kamili\n0071234512;Yusuf Mansur;XI-MIPA 1;yusuf@siswa.man1teladan.sch.id;081233334444;Jakarta;H. Mansur'
                    );
                  }}
                  className="text-xs text-emerald-700 hover:underline font-semibold cursor-pointer"
                >
                  Muat Contoh Baris Teks
                </button>
                <button
                  type="button"
                  onClick={handleBatchImport}
                  className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"
                >
                  Proses Baris Teks
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Kenaikan Kelas Massal (Promosi Siswa) */}
      {showPromoteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-700" />
                <span>Kenaikan Kelas Massal</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPromoteModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {promoteResult ? (
                // Result view
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-center">
                    <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                    <p className="font-bold text-base">Kenaikan Kelas Berhasil Diproses!</p>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-white p-3 rounded-lg border border-emerald-200">
                        <p className="text-emerald-700 font-semibold">{promoteResult.promoted}</p>
                        <p className="text-xs text-emerald-600">Siswa Naik Tingkat</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-emerald-200">
                        <p className="text-blue-700 font-semibold">{promoteResult.graduated}</p>
                        <p className="text-xs text-blue-600">Siswa Lulus (XII)</p>
                      </div>
                    </div>
                    <p className="text-xs text-emerald-700 mt-3">
                      Riwayat absensi siswa tetap tercatat pada kelas asalnya saat kejadian.
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => { setShowPromoteModal(false); setPromoteResult(null); }}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              ) : (
                // Preview view
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs">
                    <p className="font-semibold">Pratinjau Kenaikan Kelas</p>
                    <p className="mt-1">
                      Sistem akan memindahkan siswa ke tingkat berikutnya berdasarkan rombel saat ini:
                      <strong className="ml-2">X → XI</strong>, <strong className="ml-2">XI → XII</strong>, <strong className="ml-2">XII → LULUS</strong>.
                    </p>
                    <p className="mt-1 text-amber-800">
                      <strong>Perhatian:</strong> Pastikan rombel kelas tujuan (XI, XII) sudah dibuat di tab Rombel Kelas.
                      Siswa XII akan ditandai "LULUS", akun login mereka dinonaktifkan, dan rombel berubah ke "LULUS".
                    </p>
                  </div>

                  {promotePreview && promotePreview.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">
                          Total {promotePreview.length} siswa akan diproses:
                        </span>
                        <span className="text-xs font-mono text-slate-500">
                          {promotePreview.filter(p => p.status === 'naik').length} Naik, {promotePreview.filter(p => p.status === 'lulus').length} Lulus
                        </span>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                            <tr>
                              <th className="py-2 px-3 font-semibold text-slate-600 uppercase text-[10px]">NISN</th>
                              <th className="py-2 px-3 font-semibold text-slate-600 uppercase text-[10px]">Nama Siswa</th>
                              <th className="py-2 px-3 font-semibold text-slate-600 uppercase text-[10px]">Dari Rombel</th>
                              <th className="py-2 px-3 font-semibold text-slate-600 uppercase text-[10px]">Ke Rombel</th>
                              <th className="py-2 px-3 font-semibold text-slate-600 uppercase text-[10px]">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {promotePreview.map((p, idx) => (
                              <tr key={`${p.nisn}-${idx}`} className="hover:bg-slate-50/50">
                                <td className="py-2 px-3 font-mono text-slate-800">{p.nisn}</td>
                                <td className="py-2 px-3 font-medium text-slate-900">{p.nama}</td>
                                <td className="py-2 px-3 text-emerald-700 font-medium">{p.fromRombel}</td>
                                <td className="py-2 px-3 text-blue-700 font-medium">{p.toRombel}</td>
                                <td className="py-2 px-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    p.status === 'naik'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {p.status === 'naik' ? 'Naik Tingkat' : 'Lulus'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      Tidak ada siswa yang memenuhi syarat kenaikan kelas.
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setShowPromoteModal(false)}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmPromote}
                      disabled={promoteLoading}
                      className="px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      {promoteLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                          Memproses...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Konfirmasi & Jalankan Kenaikan</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
