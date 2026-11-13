import React, { useState, useRef } from 'react';
import {
  Building2,
  Upload,
  Trash2,
  PenTool,
  RotateCcw,
  CheckCircle2,
  Image as ImageIcon,
  Database,
  RefreshCw,
  CloudUpload,
  CloudDownload,
  Copy,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import { SchoolPrintProfile, GoogleSheetsConfig } from '../types';
import { processUploadedImage } from '../utils/imageUpload';
import {
  testSheetsConnection,
  generateAppsScriptCode,
} from '../utils/googleSheetsSync';

interface SettingsViewProps {
  schoolProfile: SchoolPrintProfile;
  setSchoolProfile: React.Dispatch<React.SetStateAction<SchoolPrintProfile>>;
  onResetProfile: () => void;
  sheetsConfig: GoogleSheetsConfig;
  setSheetsConfig: React.Dispatch<React.SetStateAction<GoogleSheetsConfig>>;
  pendingQueueCount: number;
  onPushAllToSheets: () => Promise<{ ok: boolean; message: string }>;
  onPullFromSheets: () => Promise<{ ok: boolean; message: string }>;
  onFlushSyncQueue: () => Promise<{ ok: boolean; message: string }>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  schoolProfile,
  setSchoolProfile,
  onResetProfile,
  sheetsConfig,
  setSheetsConfig,
  pendingQueueCount,
  onPushAllToSheets,
  onPullFromSheets,
  onFlushSyncQueue,
}) => {
  const [settingsTab, setSettingsTab] = useState<'identity' | 'sheets'>(
    'identity'
  );
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const principalSigInputRef = useRef<HTMLInputElement>(null);
  const operatorSigInputRef = useRef<HTMLInputElement>(null);

  const updateField = (field: keyof SchoolPrintProfile, value: string) => {
    setSchoolProfile((prev) => ({ ...prev, [field]: value }));
  };

  const showSavedFeedback = (msg: string) => {
    setErrorMsg(null);
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const showErrorFeedback = (msg: string) => {
    setFeedbackMsg(null);
    setErrorMsg(msg);
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'logoDataUrl' | 'principalSignatureDataUrl' | 'operatorSignatureDataUrl',
    label: string
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showErrorFeedback(
        'Format file harus berupa gambar (PNG, JPG, WEBP, atau SVG).'
      );
      return;
    }

    try {
      const maxDim = field === 'logoDataUrl' ? 320 : 420;
      const dataUrl = await processUploadedImage(file, maxDim);
      setSchoolProfile((prev) => ({ ...prev, [field]: dataUrl }));
      showSavedFeedback(`${label} berhasil diunggah dan disimpan.`);
    } catch (err) {
      showErrorFeedback(
        err instanceof Error ? err.message : 'Gagal memproses gambar.'
      );
    }
  };

  const handleClearImage = (
    field: 'logoDataUrl' | 'principalSignatureDataUrl' | 'operatorSignatureDataUrl',
    label: string
  ) => {
    setSchoolProfile((prev) => ({ ...prev, [field]: undefined }));
    showSavedFeedback(`${label} dihapus.`);
  };

  const handleGenerateRandomToken = () => {
    const randomPart = Math.random().toString(36).slice(2, 10).toUpperCase();
    setSheetsConfig((prev) => ({
      ...prev,
      secretToken: `HADIRTAP-${randomPart}`,
    }));
  };

  const handleTestConnection = async () => {
    setIsBusy(true);
    const res = await testSheetsConnection(sheetsConfig);
    setIsBusy(false);
    if (res.ok) {
      showSavedFeedback(res.message);
    } else {
      showErrorFeedback(res.message);
    }
  };

  const handlePushAll = async () => {
    setIsBusy(true);
    const res = await onPushAllToSheets();
    setIsBusy(false);
    if (res.ok) {
      showSavedFeedback(res.message);
    } else {
      showErrorFeedback(res.message);
    }
  };

  const handlePullAll = async () => {
    setIsBusy(true);
    const res = await onPullFromSheets();
    setIsBusy(false);
    if (res.ok) {
      showSavedFeedback(res.message);
    } else {
      showErrorFeedback(res.message);
    }
  };

  const handleFlushQueue = async () => {
    setIsBusy(true);
    const res = await onFlushSyncQueue();
    setIsBusy(false);
    if (res.ok) {
      showSavedFeedback(res.message);
    } else {
      showErrorFeedback(res.message);
    }
  };

  const appsScriptCode = generateAppsScriptCode(sheetsConfig.secretToken);

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(appsScriptCode);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
    } catch {
      showErrorFeedback('Gagal menyalin otomatis. Silakan blok dan salin manual.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header & Sub-Tab Switcher */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Pengaturan Sekolah &amp; Integrasi Database
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Kelola identitas sekolah, logo, tanda tangan cetak, serta koneksi database Google Spreadsheet.
            </p>
          </div>

          {settingsTab === 'identity' && (
            <button
              type="button"
              onClick={() => {
                onResetProfile();
                showSavedFeedback('Identitas sekolah dikembalikan ke bawaan awal.');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default</span>
            </button>
          )}
        </div>

        {/* Sub-tab buttons */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSettingsTab('identity')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              settingsTab === 'identity'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Identitas, Logo &amp; Tanda Tangan</span>
          </button>

          <button
            type="button"
            onClick={() => setSettingsTab('sheets')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              settingsTab === 'sheets'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Database Google Spreadsheet (GAS)</span>
          </button>
        </div>

        {(feedbackMsg || errorMsg) && (
          <div
            className={`mt-4 px-4 py-2.5 rounded-lg border text-xs font-medium flex items-center gap-2 ${
              errorMsg
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            {errorMsg ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{errorMsg || feedbackMsg}</span>
          </div>
        )}
      </section>

      {settingsTab === 'identity' && (
        <>

      {/* Section 1: School Identity & Logo Upload */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Identitas Sekolah &amp; Logo Kop Surat
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Perubahan tersimpan otomatis di perangkat Anda. Disarankan logo berformat PNG transparan.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
          {/* Logo Upload Box */}
          <div className="lg:col-span-4 flex flex-col justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
            <div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Logo Sekolah
              </div>
              <div className="w-full h-40 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white flex items-center justify-center p-3 overflow-hidden">
                {schoolProfile.logoDataUrl ? (
                  <img
                    src={schoolProfile.logoDataUrl}
                    alt="Logo Sekolah"
                    className="max-h-32 max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center text-slate-400">
                    <ImageIcon className="w-8 h-8 mx-auto mb-1.5 stroke-[1.5]" />
                    <div className="text-xs">Belum ada logo sekolah</div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) =>
                  handleImageUpload(e, 'logoDataUrl', 'Logo sekolah')
                }
                className="hidden"
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors whitespace-nowrap shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {schoolProfile.logoDataUrl ? 'Ganti Logo' : 'Unggah Logo'}
                </span>
              </button>
              {schoolProfile.logoDataUrl && (
                <button
                  type="button"
                  onClick={() =>
                    handleClearImage('logoDataUrl', 'Logo sekolah')
                  }
                  className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors whitespace-nowrap shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              )}
            </div>
          </div>

          {/* School Identity Form Fields */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Nama Sekolah / Lembaga
              </label>
              <input
                type="text"
                value={schoolProfile.schoolName}
                onChange={(e) => updateField('schoolName', e.target.value)}
                placeholder="Mis: SMA NEGERI 1 HARAPAN BANGSA"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Sub-Kop / Instansi Naungan (Dinas / Yayasan)
              </label>
              <input
                type="text"
                value={schoolProfile.schoolSubtitle}
                onChange={(e) => updateField('schoolSubtitle', e.target.value)}
                placeholder="Mis: PEMERINTAH PROVINSI · DINAS PENDIDIKAN"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Alamat Lengkap, Telepon &amp; Website/Email
              </label>
              <input
                type="text"
                value={schoolProfile.schoolAddress}
                onChange={(e) => updateField('schoolAddress', e.target.value)}
                placeholder="Mis: Jl. Pendidikan No. 45 · Telp. (021) 555-0192"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Kota / Kabupaten Penetapan Laporan
              </label>
              <input
                type="text"
                value={schoolProfile.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="Mis: Bandung"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Signatures & Signatory Officials */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <PenTool className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Pejabat Penandatangan &amp; Upload Tanda Tangan
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Unggah scan/foto tanda tangan (format PNG transparan disarankan) untuk ditampilkan otomatis di bagian bawah laporan cetak.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-5">
          {/* Principal (Kepala Sekolah) */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              1. Kepala Sekolah (Kolom Kiri)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Nama Kepala Sekolah &amp; Gelar
                </label>
                <input
                  type="text"
                  value={schoolProfile.principalName}
                  onChange={(e) => updateField('principalName', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  NIP Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={schoolProfile.principalNip}
                  onChange={(e) => updateField('principalNip', e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Gambar Tanda Tangan Kepala Sekolah
              </div>
              <div className="w-full h-28 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white flex items-center justify-center p-2 overflow-hidden">
                {schoolProfile.principalSignatureDataUrl ? (
                  <img
                    src={schoolProfile.principalSignatureDataUrl}
                    alt="Tanda Tangan Kepala Sekolah"
                    className="max-h-24 max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-slate-400">
                    Belum ada gambar tanda tangan (kosong untuk tanda tangan basah)
                  </span>
                )}
              </div>

              <div className="mt-2.5 flex items-center gap-2">
                <input
                  ref={principalSigInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) =>
                    handleImageUpload(
                      e,
                      'principalSignatureDataUrl',
                      'Tanda tangan Kepala Sekolah'
                    )
                  }
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => principalSigInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors whitespace-nowrap shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {schoolProfile.principalSignatureDataUrl
                      ? 'Ganti Tanda Tangan'
                      : 'Unggah Tanda Tangan'}
                  </span>
                </button>
                {schoolProfile.principalSignatureDataUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      handleClearImage(
                        'principalSignatureDataUrl',
                        'Tanda tangan Kepala Sekolah'
                      )
                    }
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Operator / Petugas Absensi */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              2. Petugas / Operator Absensi (Kolom Kanan)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Nama Petugas / Operator
                </label>
                <input
                  type="text"
                  value={schoolProfile.operatorName}
                  onChange={(e) => updateField('operatorName', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Label Jabatan di Laporan
                </label>
                <input
                  type="text"
                  value={schoolProfile.operatorRole}
                  onChange={(e) => updateField('operatorRole', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Gambar Tanda Tangan Petugas / Operator
              </div>
              <div className="w-full h-28 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white flex items-center justify-center p-2 overflow-hidden">
                {schoolProfile.operatorSignatureDataUrl ? (
                  <img
                    src={schoolProfile.operatorSignatureDataUrl}
                    alt="Tanda Tangan Petugas"
                    className="max-h-24 max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-slate-400">
                    Belum ada gambar tanda tangan (kosong untuk tanda tangan basah)
                  </span>
                )}
              </div>

              <div className="mt-2.5 flex items-center gap-2">
                <input
                  ref={operatorSigInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) =>
                    handleImageUpload(
                      e,
                      'operatorSignatureDataUrl',
                      'Tanda tangan petugas'
                    )
                  }
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => operatorSigInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors whitespace-nowrap shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {schoolProfile.operatorSignatureDataUrl
                      ? 'Ganti Tanda Tangan'
                      : 'Unggah Tanda Tangan'}
                  </span>
                </button>
                {schoolProfile.operatorSignatureDataUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      handleClearImage(
                        'operatorSignatureDataUrl',
                        'Tanda tangan petugas'
                      )
                    }
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Live Letterhead & Signature Preview */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Pratinjau Kop Surat &amp; Blok Tanda Tangan Saat Dicetak
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tampilan aktual logo, identitas sekolah, dan tanda tangan pada dokumen cetak A4.
          </p>
        </div>

        <div className="mt-4 bg-white text-slate-900 border border-slate-300 rounded-lg p-6 sm:p-8 max-w-3xl mx-auto">
          {/* Kop Surat */}
          <div className="flex items-center justify-center gap-4 border-b-2 border-slate-900 pb-3 mb-6">
            {schoolProfile.logoDataUrl && (
              <img
                src={schoolProfile.logoDataUrl}
                alt="Logo Sekolah"
                className="w-16 h-16 object-contain shrink-0"
              />
            )}
            <div className="flex-1 text-center">
              <div className="text-base font-bold uppercase tracking-wide text-slate-900">
                {schoolProfile.schoolName || 'NAMA SEKOLAH'}
              </div>
              {schoolProfile.schoolSubtitle && (
                <div className="text-xs font-semibold text-slate-700 mt-0.5">
                  {schoolProfile.schoolSubtitle}
                </div>
              )}
              {schoolProfile.schoolAddress && (
                <div className="text-[11px] text-slate-600 mt-0.5">
                  {schoolProfile.schoolAddress}
                </div>
              )}
            </div>
          </div>

          <div className="text-center text-xs text-slate-400 italic py-4 border-y border-dashed border-slate-200">
            [ Isi Tabel Laporan Kehadiran Guru ]
          </div>

          {/* Tanda Tangan */}
          <div className="grid grid-cols-2 gap-8 mt-6 text-xs text-slate-900">
            <div className="text-center">
              <div>Mengetahui,</div>
              <div>Kepala Sekolah</div>
              <div className="h-16 flex items-center justify-center my-1">
                {schoolProfile.principalSignatureDataUrl && (
                  <img
                    src={schoolProfile.principalSignatureDataUrl}
                    alt="TTD Kepala Sekolah"
                    className="max-h-16 max-w-[160px] object-contain"
                  />
                )}
              </div>
              <div className="font-bold underline underline-offset-2">
                {schoolProfile.principalName || '-'}
              </div>
              <div className="font-mono tabular-nums text-[11px] mt-0.5">
                NIP. {schoolProfile.principalNip || '-'}
              </div>
            </div>

            <div className="text-center">
              <div>{schoolProfile.city || 'Kota'}, 12 November 2026</div>
              <div>{schoolProfile.operatorRole || 'Petugas Absensi'}</div>
              <div className="h-16 flex items-center justify-center my-1">
                {schoolProfile.operatorSignatureDataUrl && (
                  <img
                    src={schoolProfile.operatorSignatureDataUrl}
                    alt="TTD Petugas"
                    className="max-h-16 max-w-[160px] object-contain"
                  />
                )}
              </div>
              <div className="font-bold underline underline-offset-2">
                {schoolProfile.operatorName || '-'}
              </div>
            </div>
          </div>
        </div>
      </section>
        </>
      )}

      {settingsTab === 'sheets' && (
        <>
          {/* Connection Configuration */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-2.5">
                <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Koneksi Google Apps Script (Web App API)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Kiosk tetap memindai kartu secara instan dari cache lokal, lalu menyinkronkan data ke Google Spreadsheet di latar belakang.
                  </p>
                </div>
              </div>

              {sheetsConfig.lastSyncedAt && (
                <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                  Sinkron terakhir: {sheetsConfig.lastSyncedAt}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  URL Web App Google Apps Script
                </label>
                <input
                  type="url"
                  value={sheetsConfig.webAppUrl}
                  onChange={(e) =>
                    setSheetsConfig((prev) => ({
                      ...prev,
                      webAppUrl: e.target.value,
                    }))
                  }
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="w-full px-3.5 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="lg:col-span-4">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Secret Token (Harus Sama dengan Code.gs)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={sheetsConfig.secretToken}
                    onChange={(e) =>
                      setSheetsConfig((prev) => ({
                        ...prev,
                        secretToken: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateRandomToken}
                    title="Buat token acak baru"
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Acak</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sheetsConfig.enabled}
                  onChange={(e) =>
                    setSheetsConfig((prev) => ({
                      ...prev,
                      enabled: e.target.checked,
                    }))
                  }
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Aktifkan Database Google Spreadsheet
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Gunakan Google Sheets sebagai penyimpanan pusat lintas komputer.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sheetsConfig.autoSync}
                  onChange={(e) =>
                    setSheetsConfig((prev) => ({
                      ...prev,
                      autoSync: e.target.checked,
                    }))
                  }
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Sinkron Otomatis Saat Tap &amp; Buka Aplikasi
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Tap RFID otomatis dikirim ke Sheets (atau masuk antrean jika offline).
                  </div>
                </div>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={isBusy}
                onClick={handleTestConnection}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isBusy ? 'animate-spin' : ''}`} />
                <span>Uji Koneksi &amp; Buat 4 Tab Sheet</span>
              </button>

              <button
                type="button"
                disabled={isBusy}
                onClick={handlePushAll}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                <CloudUpload className="w-4 h-4" />
                <span>Kirim Semua Data Lokal ke Sheet</span>
              </button>

              <button
                type="button"
                disabled={isBusy}
                onClick={handlePullAll}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                <CloudDownload className="w-4 h-4" />
                <span>Tarik Data dari Sheet</span>
              </button>

              {pendingQueueCount > 0 && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleFlushQueue}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                >
                  <CloudUpload className="w-4 h-4" />
                  <span>Kirim Antrean Tertunda ({pendingQueueCount})</span>
                </button>
              )}
            </div>
          </section>

          {/* Setup Guide & Copyable Code.gs */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Kode Google Apps Script (`Code.gs`) Siap Pakai
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Salin kode di bawah ini ke Google Spreadsheet Anda. Token keamanan sudah disesuaikan otomatis dengan input di atas.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyScript}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-indigo-600 text-white hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
              >
                <Copy className="w-4 h-4" />
                <span>
                  {copiedScript ? 'Kode Tersalin!' : 'Salin Kode Code.gs'}
                </span>
              </button>
            </div>

            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li>
                Buat file <strong>Google Spreadsheet</strong> baru di Google Drive sekolah.
              </li>
              <li>
                Klik menu <strong>Extensions (Ekstensi) &rarr; Apps Script</strong>, hapus kode bawaan, lalu tempel seluruh kode <code>Code.gs</code> di bawah ini dan klik <strong>Save</strong>.
              </li>
              <li>
                Klik <strong>Deploy &rarr; New deployment &rarr; Select type: Web app</strong>, atur <em>Execute as</em>: <strong>Me</strong> dan <em>Who has access</em>: <strong>Anyone</strong>, lalu klik <strong>Deploy</strong>.
              </li>
              <li>
                Salin <strong>Web app URL</strong> (<code>https://script.google.com/macros/s/.../exec</code>), tempel pada kolom di atas, klik <strong>Uji Koneksi</strong>, lalu klik <strong>Kirim Semua Data Lokal ke Sheet</strong>.
              </li>
            </ol>

            <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 text-xs font-mono overflow-x-auto max-h-80 overflow-y-auto border border-slate-800">
              <code>{appsScriptCode}</code>
            </pre>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Catatan: Identitas sekolah, logo sekolah, gambar tanda tangan, daftar guru, jadwal Senin–Sabtu, dan log absensi tersinkron otomatis ke Google Sheets (gambar dikompresi otomatis agar tetap muat di sel Google Sheets dan tampil di semua browser).
            </p>
          </section>
        </>
      )}
    </div>
  );
};
