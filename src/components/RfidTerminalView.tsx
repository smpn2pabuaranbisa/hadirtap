import React, { useState, useEffect } from 'react';
import {
  Radio,
  CheckCircle2,
  Clock,
  UserPlus,
  CreditCard,
  Volume2,
  VolumeX,
  CornerDownLeft,
  LogIn,
  LogOut,
  Trash2,
  ShieldAlert,
  Timer,
  CalendarDays,
  Copy,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import {
  Teacher,
  TeacherAttendanceRecord,
  TerminalScanMode,
  ScanEventResult,
  DaySchedule,
  AttendancePolicy,
} from '../types';

interface RfidTerminalViewProps {
  teachers: Teacher[];
  attendance: TeacherAttendanceRecord[];
  scanMode: TerminalScanMode;
  setScanMode: (mode: TerminalScanMode) => void;
  weeklySchedule: DaySchedule[];
  activeDaySchedule: DaySchedule;
  onUpdateDaySchedule: (dayIndex: number, updates: Partial<DaySchedule>) => void;
  onApplyMondayToAll: () => void;
  onResetWeeklySchedule: () => void;
  attendancePolicy: AttendancePolicy;
  setAttendancePolicy: React.Dispatch<React.SetStateAction<AttendancePolicy>>;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  lastScan: ScanEventResult | null;
  onTriggerScan: (
    uid: string,
    customTime?: string,
    forcedDirection?: 'in' | 'out'
  ) => void;
  onOpenRegisterModalWithUid: (uid: string) => void;
  onDeleteAttendance: (id: string) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

export const RfidTerminalView: React.FC<RfidTerminalViewProps> = ({
  teachers,
  attendance,
  scanMode,
  setScanMode,
  weeklySchedule,
  activeDaySchedule,
  onUpdateDaySchedule,
  onApplyMondayToAll,
  onResetWeeklySchedule,
  attendancePolicy,
  setAttendancePolicy,
  soundEnabled,
  setSoundEnabled,
  lastScan,
  onTriggerScan,
  onOpenRegisterModalWithUid,
  onDeleteAttendance,
  selectedDate,
  setSelectedDate,
}) => {
  const [manualUid, setManualUid] = useState('');
  const [simulatedTimeOverride, setSimulatedTimeOverride] = useState<string>('');
  const [liveClock, setLiveClock] = useState<string>('');

  const checkInThreshold = activeDaySchedule.checkInTime;
  const checkOutThreshold = activeDaySchedule.checkOutTime;

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setLiveClock(`${hh}:${mm}:${ss}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayRecords = attendance.filter((a) => a.date === selectedDate);

  const checkedInCount = todayRecords.filter(
    (r) => r.checkInTime !== null
  ).length;
  const lateCount = todayRecords.filter((r) => r.status === 'Terlambat').length;
  const checkedOutCount = todayRecords.filter(
    (r) => r.checkOutTime !== null
  ).length;
  const notYetArrivedCount = Math.max(0, teachers.length - todayRecords.length);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = manualUid.trim().toUpperCase();
    if (!cleaned) return;
    onTriggerScan(cleaned, simulatedTimeOverride || undefined);
    setManualUid('');
  };

  const handleSimulateUnregistered = () => {
    const randomHex = () =>
      Math.floor(16 + Math.random() * 239)
        .toString(16)
        .toUpperCase()
        .padStart(2, '0');
    const unknownUid = `04:${randomHex()}:${randomHex()}:FE`;
    onTriggerScan(unknownUid, simulatedTimeOverride || undefined);
  };

  return (
    <div className="space-y-6">
      {/* Top Terminal Control & Shift Rules */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Terminal Absensi RFID Guru — Datang &amp; Pulang
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Tempelkan kartu RFID guru pada pemindai USB untuk mencatat jam datang (masuk) dan jam pulang secara otomatis.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-2 text-xs font-mono tabular-nums font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0">
              Jam Server: {liveClock} WIB
            </div>

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Beep Aktif</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-400" />
                  <span>Beep Nonaktif</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSimulateUnregistered}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Simulasi Kartu Baru</span>
            </button>
          </div>
        </div>

        {/* Shift & Mode Configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Mode Pembacaan Terminal RFID
            </label>
            <select
              value={scanMode}
              onChange={(e) => setScanMode(e.target.value as TerminalScanMode)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Otomatis">
                Otomatis (Tap 1: Datang · Tap 2: Pulang)
              </option>
              <option value="Absen Datang">Khusus Absen Datang (Check-In)</option>
              <option value="Absen Pulang">Khusus Absen Pulang (Check-Out)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Tanggal Aktif / Hari Uji
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Jadwal Berlaku ({activeDaySchedule.dayName})
            </label>
            <div className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 flex items-center justify-between">
              {activeDaySchedule.isActive ? (
                <>
                  <span>
                    {checkInThreshold} – {checkOutThreshold} WIB
                  </span>
                  <span className="text-xs font-sans font-medium text-emerald-600 dark:text-emerald-400">
                    Aktif
                  </span>
                </>
              ) : (
                <span className="font-sans text-rose-600 dark:text-rose-400 font-medium">
                  Hari Libur (Non-Aktif)
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Simulasi Jam Tap (Untuk Pengujian)
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="time"
                value={simulatedTimeOverride}
                onChange={(e) => setSimulatedTimeOverride(e.target.value)}
                className="w-full px-2.5 py-2 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {simulatedTimeOverride && (
                <button
                  type="button"
                  onClick={() => setSimulatedTimeOverride('')}
                  className="px-2.5 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Time Preset Buttons for Testing Check-In & Check-Out */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            Pintasan Uji Jam Tap:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { label: '06:50 (Datang Tepat)', val: '06:50' },
              { label: '07:25 (Datang Terlambat)', val: '07:25' },
              { label: '11:45 (Pulang Jumat)', val: '11:45' },
              { label: '15:15 (Pulang Normal)', val: '15:15' },
              { label: 'Gunakan Jam Server', val: '' },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setSimulatedTimeOverride(preset.val)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                  simulatedTimeOverride === preset.val
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Weekly Monday–Saturday Schedule Configuration */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-2.5">
            <CalendarDays className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Pengaturan Jam Masuk &amp; Jam Pulang (Senin – Sabtu)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sesuaikan batas jam masuk dan jam pulang untuk masing-masing hari kerja. Hari aktif ({activeDaySchedule.dayName}) diterapkan otomatis pada tap kartu RFID.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onApplyMondayToAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Samakan dengan Senin</span>
            </button>
            <button
              type="button"
              onClick={onResetWeeklySchedule}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Jadwal Default</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pt-4">
          {weeklySchedule.map((day) => {
            const isCurrentDay = day.dayIndex === activeDaySchedule.dayIndex;
            return (
              <div
                key={day.dayIndex}
                className={`p-3.5 rounded-xl border transition-colors ${
                  isCurrentDay
                    ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-200/70 dark:border-slate-700/70">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {day.dayName}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateDaySchedule(day.dayIndex, {
                        isActive: !day.isActive,
                      })
                    }
                    className={`px-2 py-0.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      day.isActive
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {day.isActive ? 'Aktif' : 'Libur'}
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Jam Masuk
                    </label>
                    <input
                      type="time"
                      value={day.checkInTime}
                      disabled={!day.isActive}
                      onChange={(e) =>
                        onUpdateDaySchedule(day.dayIndex, {
                          checkInTime: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Jam Pulang
                    </label>
                    <input
                      type="time"
                      value={day.checkOutTime}
                      disabled={!day.isActive}
                      onChange={(e) =>
                        onUpdateDaySchedule(day.dayIndex, {
                          checkOutTime: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security & Checkout Restriction Controls */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={attendancePolicy.lockEarlyCheckout}
              onChange={(e) =>
                setAttendancePolicy((prev) => ({
                  ...prev,
                  lockEarlyCheckout: e.target.checked,
                }))
              }
              className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Kunci Absen Pulang Sebelum Jam Pulang</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Jika aktif, tap kartu pulang ditolak otomatis sebelum jadwal jam pulang hari berjalan (kecuali input izin manual oleh Admin).
              </p>
            </div>
          </label>

          <div className="flex items-center gap-3 shrink-0">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
              Jeda Anti-Double Tap:
            </label>
            <select
              value={attendancePolicy.minCheckoutDelayMinutes}
              onChange={(e) =>
                setAttendancePolicy((prev) => ({
                  ...prev,
                  minCheckoutDelayMinutes: Number(e.target.value),
                }))
              }
              className="px-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={0}>Nonaktif (0 menit)</option>
              <option value={15}>15 menit setelah datang</option>
              <option value={30}>30 menit setelah datang</option>
              <option value={60}>60 menit setelah datang</option>
            </select>
          </div>
        </div>
      </section>

      {/* KPI Summary Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Guru &amp; Staf Terdaftar
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {teachers.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              Belum Datang: {notYetArrivedCount}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Sudah Tap Absen Datang
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {checkedInCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              Batas {checkInThreshold}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Datang Terlambat (&gt; {checkInThreshold})
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {lateCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Guru
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Sudah Tap Absen Pulang
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
              {checkedOutCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              Jadwal {checkOutThreshold}
            </span>
          </div>
        </div>
      </section>

      {/* Main Split: Hardware RFID Reader Monitor & Teacher Card Deck Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: RFID Reader Hardware Terminal */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-6 flex flex-col justify-between flex-1">
            <div>
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Radio className="w-5 h-5 text-indigo-400" />
                  <span className="text-sm font-semibold tracking-tight">
                    RFID Reader Guru · 13.56 MHz
                  </span>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-400">
                  Mode: {scanMode}
                </span>
              </div>

              {/* Latest Scan Card Display */}
              <div className="my-6">
                {!lastScan ? (
                  <div className="border border-dashed border-slate-700 rounded-xl p-8 text-center">
                    <CreditCard className="w-10 h-10 text-slate-400 mx-auto mb-3 stroke-[1.5]" />
                    <div className="text-base font-semibold text-slate-200">
                      Siap Menerima Tap Kartu RFID Guru
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      Tap pertama mencatat <strong>Absen Datang</strong>, dan tap kedua pada hari yang sama otomatis mencatat <strong>Absen Pulang</strong>.
                    </p>
                  </div>
                ) : lastScan.type === 'unregistered' ? (
                  <div className="bg-rose-950/50 border border-rose-800/80 rounded-xl p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 text-rose-300 text-xs font-medium">
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        <span>Kartu RFID Belum Terdaftar</span>
                      </div>
                      <span className="text-xs font-mono tabular-nums text-rose-300">
                        {lastScan.timestamp} WIB
                      </span>
                    </div>
                    <div className="mt-3 font-mono text-xl font-bold tracking-wider text-white tabular-nums">
                      UID: {lastScan.uid}
                    </div>
                    <p className="mt-1 text-xs text-rose-200/90">
                      {lastScan.message}
                    </p>
                    <div className="mt-4 pt-3 border-t border-rose-800/60 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => onOpenRegisterModalWithUid(lastScan.uid)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Daftarkan Kartu ke Guru</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`rounded-xl p-5 border ${
                      lastScan.type === 'checkout-blocked'
                        ? 'bg-rose-950/50 border-rose-700'
                        : lastScan.type === 'checkin-ok'
                        ? 'bg-emerald-950/40 border-emerald-800/80'
                        : lastScan.type === 'checkin-late' ||
                          lastScan.type === 'checkout-early'
                        ? 'bg-amber-950/40 border-amber-800/80'
                        : 'bg-indigo-950/50 border-indigo-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold ${
                          lastScan.type === 'checkout-blocked'
                            ? 'text-rose-300'
                            : lastScan.type === 'checkin-ok'
                            ? 'text-emerald-300'
                            : lastScan.type === 'checkin-late' ||
                              lastScan.type === 'checkout-early'
                            ? 'text-amber-300'
                            : 'text-indigo-300'
                        }`}
                      >
                        {lastScan.type === 'checkout-blocked' ? (
                          <ShieldAlert className="w-4 h-4" />
                        ) : lastScan.actionLabel === 'ABSEN PULANG' ? (
                          <LogOut className="w-4 h-4" />
                        ) : (
                          <LogIn className="w-4 h-4" />
                        )}
                        <span>
                          {lastScan.actionLabel} · {lastScan.message}
                        </span>
                      </span>
                      <span className="font-mono tabular-nums text-slate-300">
                        {lastScan.timestamp} WIB
                      </span>
                    </div>

                    {lastScan.teacher && (
                      <div className="mt-3">
                        <div className="text-lg font-bold text-white">
                          {lastScan.teacher.name}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                          <span className="font-mono tabular-nums">
                            NIP {lastScan.teacher.nip}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{lastScan.teacher.role}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            UID {lastScan.uid}
                          </span>
                        </div>

                        {lastScan.record && (
                          <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
                            <div>
                              <span className="text-slate-400 block font-sans">
                                Jam Datang
                              </span>
                              <span className="text-emerald-300 font-semibold">
                                {lastScan.record.checkInTime || '-'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-sans">
                                Jam Pulang
                              </span>
                              <span className="text-indigo-300 font-semibold">
                                {lastScan.record.checkOutTime || 'Belum Pulang'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-sans">
                                Durasi Kerja
                              </span>
                              <span className="text-white font-semibold">
                                {lastScan.record.workDuration || '-'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Direct UID Input Form */}
            <form
              onSubmit={handleManualSubmit}
              className="pt-4 border-t border-slate-800"
            >
              <label className="block text-xs font-medium text-slate-400 mb-2">
                Input UID Manual / Fokus Pemindai USB Keyboard Wedge
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={manualUid}
                  onChange={(e) => setManualUid(e.target.value)}
                  placeholder="Ketik / Scan UID (mis: 04:A3:9F:2B) lalu Enter"
                  className="flex-1 px-3.5 py-2 text-sm font-mono tabular-nums bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Proses Tap</span>
                  <CornerDownLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Interactive Teacher RFID Card Simulator */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Simulator Tap Kartu RFID Guru ({teachers.length} Guru)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Klik tombol <strong>Tap Datang</strong> atau <strong>Tap Pulang</strong> pada kartu guru di bawah untuk menguji absensi otomatis.
                </p>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                Datang: {checkedInCount} · Pulang: {checkedOutCount}
              </span>
            </div>

            {teachers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
                Belum ada data guru terdaftar. Tambahkan atau upload massal data guru di menu <strong>Kartu Guru</strong>, atau tarik data dari <strong>Google Spreadsheet</strong>.
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 max-h-[380px] overflow-y-auto pr-1">
              {teachers.map((teacher) => {
                const rec = todayRecords.find((r) => r.teacherId === teacher.id);
                const hasCheckedIn = Boolean(rec?.checkInTime);
                const hasCheckedOut = Boolean(rec?.checkOutTime);

                return (
                  <div
                    key={teacher.id}
                    className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {teacher.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {teacher.role}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        <span className="text-indigo-600 dark:text-indigo-400">
                          {teacher.rfidUid}
                        </span>
                        {rec?.checkInTime && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                rec.status === 'Terlambat'
                                  ? 'text-amber-600 dark:text-amber-400 font-medium'
                                  : 'text-emerald-600 dark:text-emerald-400 font-medium'
                              }
                            >
                              Masuk {rec.checkInTime.slice(0, 5)}
                            </span>
                          </>
                        )}
                        {rec?.checkOutTime && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                              Pulang {rec.checkOutTime.slice(0, 5)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!hasCheckedIn ? (
                        <button
                          type="button"
                          onClick={() =>
                            onTriggerScan(
                              teacher.rfidUid,
                              simulatedTimeOverride || undefined,
                              'in'
                            )
                          }
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>Tap Datang</span>
                        </button>
                      ) : !hasCheckedOut ? (
                        <button
                          type="button"
                          onClick={() =>
                            onTriggerScan(
                              teacher.rfidUid,
                              simulatedTimeOverride || undefined,
                              'out'
                            )
                          }
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Tap Pulang</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            onTriggerScan(
                              teacher.rfidUid,
                              simulatedTimeOverride || undefined,
                              'out'
                            )
                          }
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
                        >
                          <Timer className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Update Pulang</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Mendukung semua USB RFID Reader Keyboard Wedge tanpa instalasi driver tambahan.
            </span>
            <span className="font-mono tabular-nums">
              Tanggal: {selectedDate}
            </span>
          </div>
        </div>
      </div>

      {/* Live Daily Teacher Attendance Log Table */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Log Absensi Datang &amp; Pulang Guru Hari Ini ({selectedDate})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Daftar guru yang telah melakukan tap kartu RFID datang maupun pulang.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            Total Tercatat: {todayRecords.length} dari {teachers.length} Guru
          </span>
        </div>

        {todayRecords.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Belum ada guru yang melakukan tap kartu RFID pada tanggal {selectedDate}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-800/40">
                  <th className="py-3 px-4">Nama Guru</th>
                  <th className="py-3 px-4">NIP · UID RFID</th>
                  <th className="py-3 px-4">Jam Datang</th>
                  <th className="py-3 px-4">Status Datang</th>
                  <th className="py-3 px-4">Jam Pulang</th>
                  <th className="py-3 px-4">Durasi Kerja</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {todayRecords.map((rec) => (
                  <tr
                    key={rec.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {rec.teacherName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {rec.role}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      <span>{rec.nip}</span>
                      <span className="mx-1.5">·</span>
                      <span className="text-indigo-600 dark:text-indigo-400">
                        {rec.rfidUid}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {rec.checkInTime || '-'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          rec.status === 'Hadir'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : rec.status === 'Terlambat'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {rec.status === 'Hadir' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {rec.status}
                          {rec.lateMinutes > 0
                            ? ` (+${rec.lateMinutes}m)`
                            : ''}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-xs whitespace-nowrap">
                      {rec.checkOutTime ? (
                        <div>
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                            {rec.checkOutTime}
                          </span>
                          {rec.checkoutStatus && (
                            <span className="ml-1.5 text-slate-500 dark:text-slate-400 font-sans">
                              · {rec.checkoutStatus}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-sans">
                          Belum Tap Pulang
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {rec.workDuration || '-'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onDeleteAttendance(rec.id)}
                        title="Reset absensi guru ini"
                        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
