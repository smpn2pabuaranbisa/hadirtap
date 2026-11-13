import React, { useState, useEffect } from 'react';
import {
  Radio,
  LogIn,
  LogOut,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  CreditCard,
  CornerDownLeft,
} from 'lucide-react';
import {
  Teacher,
  TeacherAttendanceRecord,
  TerminalScanMode,
  ScanEventResult,
  DaySchedule,
  AttendancePolicy,
  SchoolPrintProfile,
} from '../types';

interface KioskModeViewProps {
  teachers: Teacher[];
  attendance: TeacherAttendanceRecord[];
  scanMode: TerminalScanMode;
  setScanMode: (mode: TerminalScanMode) => void;
  activeDaySchedule: DaySchedule;
  attendancePolicy: AttendancePolicy;
  schoolProfile: SchoolPrintProfile;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  lastScan: ScanEventResult | null;
  onClearLastScan: () => void;
  onTriggerScan: (
    uid: string,
    customTime?: string,
    forcedDirection?: 'in' | 'out'
  ) => void;
  selectedDate: string;
  isFullscreenKiosk: boolean;
  setIsFullscreenKiosk: (val: boolean) => void;
}

export const KioskModeView: React.FC<KioskModeViewProps> = ({
  teachers,
  attendance,
  scanMode,
  setScanMode,
  activeDaySchedule,
  attendancePolicy,
  schoolProfile,
  soundEnabled,
  setSoundEnabled,
  lastScan,
  onClearLastScan,
  onTriggerScan,
  selectedDate,
  isFullscreenKiosk,
  setIsFullscreenKiosk,
}) => {
  const [liveTime, setLiveTime] = useState<string>('');
  const [liveDateLabel, setLiveDateLabel] = useState<string>('');
  const [manualUid, setManualUid] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setLiveTime(`${hh}:${mm}:${ss}`);

      const formattedDate = new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now);
      setLiveDateLabel(formattedDate);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-reset active scan card after 8 seconds on Kiosk so next teacher gets a ready screen
  useEffect(() => {
    if (!lastScan) return;
    const timer = setTimeout(() => {
      onClearLastScan();
    }, 8000);
    return () => clearTimeout(timer);
  }, [lastScan, onClearLastScan]);

  const todayRecords = attendance.filter((a) => a.date === selectedDate);
  const checkedInCount = todayRecords.filter((r) => r.checkInTime !== null).length;
  const checkedOutCount = todayRecords.filter((r) => r.checkOutTime !== null).length;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = manualUid.trim().toUpperCase();
    if (!cleaned) return;
    onTriggerScan(cleaned);
    setManualUid('');
  };

  const getInitials = (fullName: string) => {
    const clean = fullName.replace(/(Drs\.|Hj\.|H\.|S\.Pd\.|M\.Pd\.|S\.Kom\.|M\.T\.|M\.Si\.|S\.Psi\.|S\.E\.|,)/gi, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'GR';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <div
      className={`${
        isFullscreenKiosk
          ? 'fixed inset-0 z-50 bg-slate-950 text-white overflow-y-auto p-6 lg:p-10'
          : 'space-y-6'
      }`}
    >
      <div className="max-w-[1360px] mx-auto space-y-6">
        {/* Top Kiosk Bar */}
        <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {schoolProfile.logoDataUrl ? (
              <div className="w-11 h-11 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src={schoolProfile.logoDataUrl}
                  alt="Logo Sekolah"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
                <Radio className="w-6 h-6 text-indigo-400" />
              </div>
            )}
            <div>
              <div className="text-base font-bold tracking-tight text-white">
                {schoolProfile.schoolName} · KIOSK RFID GURU
              </div>
              <div className="text-xs text-slate-400">
                {liveDateLabel} ·{' '}
                {activeDaySchedule.isActive
                  ? `Jam Masuk ${activeDaySchedule.checkInTime} WIB · Jam Pulang ${activeDaySchedule.checkOutTime} WIB`
                  : 'Hari Libur (Tidak Ada Jadwal Aktif)'}
              </div>
            </div>
          </div>

          {/* Mode Selector & Fullscreen Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-lg border border-slate-700">
              {(
                ['Otomatis', 'Absen Datang', 'Absen Pulang'] as TerminalScanMode[]
              ).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setScanMode(mode)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    scanMode === mode
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>Suara Aktif</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-400" />
                  <span>Suara Mati</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreenKiosk(!isFullscreenKiosk)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors whitespace-nowrap shrink-0"
            >
              {isFullscreenKiosk ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span>Keluar Layar Penuh</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span>Mode Layar Penuh</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Kiosk Split: Left Giant Reader Screen + Right Recent Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left 7 Columns: Primary Kiosk Display */}
          <div className="lg:col-span-7 bg-slate-900 text-white border border-slate-800 rounded-xl p-6 lg:p-8 flex flex-col justify-between">
            {/* Digital Clock & Live Counter Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <div className="text-xs font-medium text-slate-400">
                  WAKTU SERVER SAAT INI
                </div>
                <div className="text-4xl sm:text-5xl font-bold font-mono tabular-nums tracking-tight text-white mt-1">
                  {liveTime}{' '}
                  <span className="text-lg font-normal text-slate-400">WIB</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-right">
                  <div className="text-xs text-slate-400">Sudah Datang</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-emerald-400">
                    {checkedInCount} / {teachers.length}
                  </div>
                </div>
                <div className="px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-right">
                  <div className="text-xs text-slate-400">Sudah Pulang</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-indigo-400">
                    {checkedOutCount} / {teachers.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Center Tap Display Zone */}
            <div className="my-8">
              {!lastScan ? (
                <div className="border-2 border-dashed border-slate-700 bg-slate-950/50 rounded-2xl p-10 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto mb-5">
                    <CreditCard className="w-10 h-10 text-indigo-400 stroke-[1.5]" />
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight text-balance">
                    Tempelkan Kartu RFID Guru Anda
                  </h2>
                  <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                    Sistem mendeteksi otomatis <strong>Absen Datang</strong> pada tap pertama dan <strong>Absen Pulang</strong> pada tap kedua.
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 text-xs font-mono tabular-nums text-slate-400 bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg">
                    <Radio className="w-4 h-4 text-emerald-400" />
                    <span>
                      USB RFID Reader Siap Memindai
                      {attendancePolicy.lockEarlyCheckout
                        ? ` · Pulang Dibuka ${activeDaySchedule.checkOutTime} WIB`
                        : ''}
                    </span>
                  </div>
                </div>
              ) : lastScan.type === 'unregistered' ? (
                <div className="rounded-2xl bg-rose-950/60 border-2 border-rose-700 p-7 text-center">
                  <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto mb-3" />
                  <div className="text-xs font-mono tabular-nums text-rose-300">
                    KARTU TIDAK DIKENALI · {lastScan.timestamp} WIB
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-white mt-1">
                    UID: {lastScan.uid}
                  </div>
                  <p className="text-sm text-rose-200 mt-2 max-w-md mx-auto">
                    Kartu RFID ini belum terdaftar pada database guru. Silakan hubungi operator atau daftarkan melalui menu Kartu RFID Guru.
                  </p>
                </div>
              ) : lastScan.type === 'checkout-blocked' ? (
                <div className="rounded-2xl bg-rose-950/60 border-2 border-rose-600 p-6 lg:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-rose-800/60">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-rose-300">
                      <ShieldAlert className="w-5 h-5" />
                      <span>{lastScan.actionLabel}</span>
                    </span>
                    <span className="text-sm font-mono tabular-nums text-rose-200">
                      Waktu Tap: {lastScan.timestamp} WIB
                    </span>
                  </div>

                  {lastScan.teacher && (
                    <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-rose-900/60 border border-rose-700 flex items-center justify-center text-xl font-bold text-white shrink-0 font-mono">
                        {getInitials(lastScan.teacher.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-2xl font-bold text-white truncate">
                          {lastScan.teacher.name}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-rose-200">
                          <span className="font-mono tabular-nums">
                            NIP {lastScan.teacher.nip}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{lastScan.teacher.role}</span>
                        </div>
                        <div className="mt-2 text-sm font-medium text-rose-100">
                          {lastScan.message}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`rounded-2xl p-6 lg:p-7 border-2 transition-all ${
                    lastScan.type === 'checkin-ok'
                      ? 'bg-emerald-950/50 border-emerald-600'
                      : lastScan.type === 'checkin-late' ||
                        lastScan.type === 'checkout-early'
                      ? 'bg-amber-950/50 border-amber-600'
                      : 'bg-indigo-950/60 border-indigo-500'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/10">
                    <span
                      className={`inline-flex items-center gap-2 text-sm font-bold ${
                        lastScan.type === 'checkin-ok'
                          ? 'text-emerald-300'
                          : lastScan.type === 'checkin-late' ||
                            lastScan.type === 'checkout-early'
                          ? 'text-amber-300'
                          : 'text-indigo-300'
                      }`}
                    >
                      {lastScan.actionLabel === 'ABSEN PULANG' ? (
                        <LogOut className="w-5 h-5" />
                      ) : (
                        <LogIn className="w-5 h-5" />
                      )}
                      <span>{lastScan.actionLabel}</span>
                    </span>
                    <span className="text-sm font-mono tabular-nums text-slate-200">
                      Waktu Tap: {lastScan.timestamp} WIB
                    </span>
                  </div>

                  {lastScan.teacher && (
                    <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-xl font-bold text-white shrink-0 font-mono">
                        {getInitials(lastScan.teacher.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-2xl font-bold text-white truncate">
                          {lastScan.teacher.name}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                          <span className="font-mono tabular-nums">
                            NIP {lastScan.teacher.nip}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{lastScan.teacher.role}</span>
                        </div>
                        <div className="mt-2 text-sm font-medium text-white">
                          {lastScan.message}
                        </div>
                      </div>
                    </div>
                  )}

                  {lastScan.record && (
                    <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-xl bg-slate-900/70 border border-white/10">
                        <div className="text-xs text-slate-400">Jam Datang</div>
                        <div className="text-lg font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
                          {lastScan.record.checkInTime || '-'}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/70 border border-white/10">
                        <div className="text-xs text-slate-400">Jam Pulang</div>
                        <div className="text-lg font-bold font-mono tabular-nums text-indigo-400 mt-0.5">
                          {lastScan.record.checkOutTime || 'Belum Pulang'}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/70 border border-white/10">
                        <div className="text-xs text-slate-400">Durasi Kerja</div>
                        <div className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
                          {lastScan.record.workDuration || '-'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Manual / USB Scanner Input Bar */}
            <form
              onSubmit={handleManualSubmit}
              className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
            >
              <input
                type="text"
                value={manualUid}
                onChange={(e) => setManualUid(e.target.value)}
                placeholder="Tempel kartu pada USB Reader atau ketik UID RFID lalu tekan Enter..."
                className="flex-1 px-4 py-2.5 text-sm font-mono tabular-nums bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Scan UID</span>
                <CornerDownLeft className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Right 5 Columns: Live Recent Activity Queue */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Antrean Tap RFID Terkini
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Riwayat kedatangan dan kepulangan guru hari ini ({selectedDate}).
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {todayRecords.length} Guru
                </span>
              </div>

              {todayRecords.length === 0 ? (
                <div className="py-16 text-center">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2 stroke-[1.5]" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Belum ada aktivitas tap kartu RFID hari ini.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2 max-h-[420px] overflow-y-auto pr-1">
                  {todayRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="py-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {rec.teacherName}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {rec.role} · UID {rec.rfidUid}
                        </div>
                      </div>

                      <div className="text-right font-mono tabular-nums text-xs shrink-0">
                        {rec.checkOutTime ? (
                          <div className="text-indigo-600 dark:text-indigo-400 font-semibold">
                            Pulang {rec.checkOutTime.slice(0, 5)}
                          </div>
                        ) : (
                          <div
                            className={
                              rec.status === 'Terlambat'
                                ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                : 'text-emerald-600 dark:text-emerald-400 font-semibold'
                            }
                          >
                            Datang {rec.checkInTime?.slice(0, 5) || '-'}
                          </div>
                        )}
                        <div className="text-slate-400 dark:text-slate-500 mt-0.5 font-sans">
                          {rec.checkOutTime
                            ? `Durasi ${rec.workDuration || '-'}`
                            : rec.status === 'Terlambat'
                            ? `Terlambat +${rec.lateMinutes}m`
                            : 'Hadir Tepat Waktu'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Status Kiosk: Aktif Memindai</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Siap Tap</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
