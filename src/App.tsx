/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Monitor,
  Radio,
  ClipboardList,
  Users,
  BarChart3,
  Sun,
  Moon,
  RotateCcw,
  Settings,
} from 'lucide-react';
import {
  Teacher,
  TeacherAttendanceRecord,
  TerminalScanMode,
  ScanEventResult,
  AttendanceStatus,
  DaySchedule,
  AttendancePolicy,
  SchoolPrintProfile,
  GoogleSheetsConfig,
  SyncOperation,
} from './types';
import {
  INITIAL_TEACHERS,
  INITIAL_WEEKLY_SCHEDULE,
  getScheduleForDate,
  getInitialTeacherAttendance,
  getTodayDateString,
  calculateLateMinutes,
  calculateWorkDuration,
  timeToMinutes,
} from './data/seedData';
import { soundEngine } from './utils/sound';
import {
  stripImageFields,
  sendSyncOperation,
  pullAllFromSheets,
} from './utils/googleSheetsSync';
import { KioskModeView } from './components/KioskModeView';
import { RfidTerminalView } from './components/RfidTerminalView';
import { AttendanceRecapView } from './components/AttendanceRecapView';
import { StudentRfidDirectoryView } from './components/StudentRfidDirectoryView';
import { TeacherScheduleJournalView } from './components/TeacherScheduleJournalView';
import { SettingsView } from './components/SettingsView';

type ActiveTab =
  | 'kiosk'
  | 'terminal'
  | 'recap'
  | 'teachers'
  | 'analytics'
  | 'settings';

const STORAGE_KEYS = {
  TEACHERS: 'hadirtap_guru_list_v3',
  ATTENDANCE: 'hadirtap_guru_attendance_v3',
  SCHEDULE: 'hadirtap_weekly_schedule_v1',
  POLICY: 'hadirtap_attendance_policy_v1',
  SCHOOL_PROFILE: 'hadirtap_school_profile_v1',
  SHEETS_CONFIG: 'hadirtap_gsheets_config_v1',
  SYNC_QUEUE: 'hadirtap_gsheets_queue_v1',
  THEME: 'hadirtap_theme_v1',
};

const DEFAULT_ATTENDANCE_POLICY: AttendancePolicy = {
  lockEarlyCheckout: true,
  minCheckoutDelayMinutes: 30,
};

const DEFAULT_SCHOOL_PROFILE: SchoolPrintProfile = {
  schoolName: 'SMA NEGERI HARAPAN BANGSA',
  schoolSubtitle: 'PEMERINTAH PROVINSI · DINAS PENDIDIKAN DAN KEBUDAYAAN',
  schoolAddress: 'Jl. Pendidikan No. 45, Kec. Sukamaju · Telp. (021) 555-0192',
  city: 'Jakarta',
  principalName: 'Drs. H. Ahmad Fauzan, M.Pd.',
  principalNip: '196805121994031005',
  operatorName: 'Bagian Tata Usaha / Piket',
  operatorRole: 'Petugas / Operator Absensi',
};

const DEFAULT_SHEETS_CONFIG: GoogleSheetsConfig = {
  enabled: false,
  webAppUrl: '',
  secretToken: 'HADIRTAP-2026',
  autoSync: true,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('kiosk');
  const [isFullscreenKiosk, setIsFullscreenKiosk] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return saved ? saved === 'dark' : false;
  });

  // Persistent Teacher & Attendance State
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TEACHERS);
      return saved ? JSON.parse(saved) : INITIAL_TEACHERS;
    } catch {
      return INITIAL_TEACHERS;
    }
  });

  const [attendance, setAttendance] = useState<TeacherAttendanceRecord[]>(
    () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
        return saved ? JSON.parse(saved) : getInitialTeacherAttendance();
      } catch {
        return getInitialTeacherAttendance();
      }
    }
  );

  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
      return saved ? JSON.parse(saved) : INITIAL_WEEKLY_SCHEDULE;
    } catch {
      return INITIAL_WEEKLY_SCHEDULE;
    }
  });

  const [attendancePolicy, setAttendancePolicy] = useState<AttendancePolicy>(
    () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.POLICY);
        return saved ? JSON.parse(saved) : DEFAULT_ATTENDANCE_POLICY;
      } catch {
        return DEFAULT_ATTENDANCE_POLICY;
      }
    }
  );

  const [schoolProfile, setSchoolProfile] = useState<SchoolPrintProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SCHOOL_PROFILE);
      return saved ? JSON.parse(saved) : DEFAULT_SCHOOL_PROFILE;
    } catch {
      return DEFAULT_SCHOOL_PROFILE;
    }
  });

  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SHEETS_CONFIG);
      return saved ? JSON.parse(saved) : DEFAULT_SHEETS_CONFIG;
    } catch {
      return DEFAULT_SHEETS_CONFIG;
    }
  });

  const [pendingQueue, setPendingQueue] = useState<SyncOperation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Active RFID Kiosk Configuration
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [scanMode, setScanMode] = useState<TerminalScanMode>('Otomatis');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastScan, setLastScan] = useState<ScanEventResult | null>(null);
  const [pendingUidToRegister, setPendingUidToRegister] = useState<
    string | null
  >(null);

  const activeDaySchedule = getScheduleForDate(selectedDate, weeklySchedule);
  const checkInThreshold = activeDaySchedule.checkInTime;
  const checkOutThreshold = activeDaySchedule.checkOutTime;

  // Sync Dark Mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(STORAGE_KEYS.THEME, 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.removeItem('hadirtap_guru_list_v2');
    localStorage.removeItem('hadirtap_guru_attendance_v2');
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(weeklySchedule));
  }, [weeklySchedule]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.POLICY, JSON.stringify(attendancePolicy));
  }, [attendancePolicy]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.SCHOOL_PROFILE,
      JSON.stringify(schoolProfile)
    );
  }, [schoolProfile]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.SHEETS_CONFIG,
      JSON.stringify(sheetsConfig)
    );
  }, [sheetsConfig]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(pendingQueue));
  }, [pendingQueue]);

  const sheetsConfigRef = useRef(sheetsConfig);
  sheetsConfigRef.current = sheetsConfig;

  const enqueueOrSync = useCallback(async (op: SyncOperation) => {
    const cfg = sheetsConfigRef.current;
    if (!cfg.enabled || !cfg.autoSync || !cfg.webAppUrl.trim()) return;

    const result = await sendSyncOperation(cfg, op);
    if (result.ok) {
      setSheetsConfig((prev) => ({
        ...prev,
        lastSyncedAt: new Date().toLocaleTimeString('id-ID'),
      }));
    } else {
      setPendingQueue((prev) => [...prev, op]);
    }
  }, []);

  const handleFlushSyncQueue = useCallback(async (): Promise<{
    ok: boolean;
    message: string;
  }> => {
    const cfg = sheetsConfigRef.current;
    if (!cfg.enabled || !cfg.webAppUrl.trim()) {
      return { ok: false, message: 'Sinkronisasi Google Sheets belum aktif.' };
    }
    if (pendingQueue.length === 0) {
      return { ok: true, message: 'Tidak ada antrean yang tertunda.' };
    }

    let sentCount = 0;
    const remaining: SyncOperation[] = [];
    let failed = false;

    for (const op of pendingQueue) {
      if (failed) {
        remaining.push(op);
        continue;
      }
      const res = await sendSyncOperation(cfg, op);
      if (res.ok) {
        sentCount++;
      } else {
        failed = true;
        remaining.push(op);
      }
    }

    setPendingQueue(remaining);
    if (sentCount > 0) {
      setSheetsConfig((prev) => ({
        ...prev,
        lastSyncedAt: new Date().toLocaleTimeString('id-ID'),
      }));
    }

    if (remaining.length === 0) {
      return {
        ok: true,
        message: `${sentCount} antrean berhasil dikirim ke Google Sheets.`,
      };
    }
    return {
      ok: false,
      message: `${sentCount} terkirim, ${remaining.length} masih tertunda (cek koneksi).`,
    };
  }, [pendingQueue]);

  const handlePullFromSheets = useCallback(async (): Promise<{
    ok: boolean;
    message: string;
  }> => {
    const cfg = sheetsConfigRef.current;
    const res = await pullAllFromSheets(cfg);
    if (!res.ok || !res.data) {
      return { ok: false, message: res.message };
    }

    const { data } = res;
    if (data.teachers && data.teachers.length > 0) {
      setTeachers(data.teachers);
    }
    if (data.attendance) {
      setAttendance(data.attendance);
    }
    if (data.weeklySchedule && data.weeklySchedule.length > 0) {
      setWeeklySchedule(data.weeklySchedule);
    }
    if (data.policy) {
      setAttendancePolicy((prev) => ({ ...prev, ...data.policy }));
    }
    if (data.schoolProfile) {
      setSchoolProfile((prev) => ({ ...prev, ...data.schoolProfile }));
    }

    setSheetsConfig((prev) => ({
      ...prev,
      lastSyncedAt: new Date().toLocaleTimeString('id-ID'),
    }));
    return { ok: true, message: res.message };
  }, []);

  const handlePushAllToSheets = useCallback(async (): Promise<{
    ok: boolean;
    message: string;
  }> => {
    const cfg = sheetsConfigRef.current;
    if (!cfg.webAppUrl.trim()) {
      return { ok: false, message: 'URL Web App Google Apps Script belum diisi.' };
    }
    const res = await sendSyncOperation(cfg, {
      action: 'pushAll',
      teachers,
      attendance,
      weeklySchedule,
      policy: attendancePolicy,
      schoolProfile: stripImageFields(schoolProfile),
    });

    if (res.ok) {
      setPendingQueue([]);
      setSheetsConfig((prev) => ({
        ...prev,
        lastSyncedAt: new Date().toLocaleTimeString('id-ID'),
      }));
    }
    return res;
  }, [teachers, attendance, weeklySchedule, attendancePolicy, schoolProfile]);

  // Auto-pull on startup & flush queue when back online
  const didInitialPullRef = useRef(false);
  useEffect(() => {
    if (didInitialPullRef.current) return;
    didInitialPullRef.current = true;
    if (sheetsConfig.enabled && sheetsConfig.autoSync && sheetsConfig.webAppUrl.trim()) {
      void handlePullFromSheets();
    }
  }, [sheetsConfig.enabled, sheetsConfig.autoSync, sheetsConfig.webAppUrl, handlePullFromSheets]);

  useEffect(() => {
    const onOnline = () => {
      if (sheetsConfigRef.current.enabled && pendingQueue.length > 0) {
        void handleFlushSyncQueue();
      }
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [pendingQueue.length, handleFlushSyncQueue]);

  // Debounced sync for policy & school text identity edits
  const didMountSettingsSyncRef = useRef(false);
  useEffect(() => {
    if (!didMountSettingsSyncRef.current) {
      didMountSettingsSyncRef.current = true;
      return;
    }
    if (
      !sheetsConfig.enabled ||
      !sheetsConfig.autoSync ||
      !sheetsConfig.webAppUrl.trim()
    ) {
      return;
    }
    const timer = setTimeout(() => {
      void enqueueOrSync({
        action: 'syncSettings',
        policy: attendancePolicy,
        schoolProfile: stripImageFields(schoolProfile),
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [
    attendancePolicy,
    schoolProfile.schoolName,
    schoolProfile.schoolSubtitle,
    schoolProfile.schoolAddress,
    schoolProfile.city,
    schoolProfile.principalName,
    schoolProfile.principalNip,
    schoolProfile.operatorName,
    schoolProfile.operatorRole,
    sheetsConfig.enabled,
    sheetsConfig.autoSync,
    sheetsConfig.webAppUrl,
    enqueueOrSync,
  ]);

  // Core RFID Check-In (Datang) & Check-Out (Pulang) Engine
  const handleTriggerScan = useCallback(
    (
      rawUid: string,
      customTime?: string,
      forcedDirection?: 'in' | 'out'
    ) => {
      const cleanedUid = rawUid.trim().toUpperCase();
      if (!cleanedUid) return;

      const now = new Date();
      const currentTimeStr = customTime
        ? `${customTime}:00`
        : [
            String(now.getHours()).padStart(2, '0'),
            String(now.getMinutes()).padStart(2, '0'),
            String(now.getSeconds()).padStart(2, '0'),
          ].join(':');

      const matchedTeacher = teachers.find(
        (t) => t.rfidUid.toUpperCase() === cleanedUid
      );

      if (!matchedTeacher) {
        soundEngine.playErrorBeep(soundEnabled);
        setLastScan({
          type: 'unregistered',
          actionLabel: 'KARTU ASING',
          uid: cleanedUid,
          timestamp: currentTimeStr,
          message:
            'Kartu RFID belum terdaftar pada data guru mana pun. Klik tombol di bawah untuk mendaftarkan kartu ini.',
        });
        return;
      }

      const existing = attendance.find(
        (a) => a.date === selectedDate && a.teacherId === matchedTeacher.id
      );

      // Determine whether this scan is ABSEN DATANG or ABSEN PULANG
      let direction: 'in' | 'out' = 'in';
      if (forcedDirection) {
        direction = forcedDirection;
      } else if (scanMode === 'Absen Datang') {
        direction = 'in';
      } else if (scanMode === 'Absen Pulang') {
        direction = 'out';
      } else {
        // Otomatis: if teacher already has checkInTime today, second tap is Absen Pulang!
        direction = existing && existing.checkInTime ? 'out' : 'in';
      }

      if (direction === 'in') {
        const lateMins = calculateLateMinutes(currentTimeStr, checkInThreshold);
        const computedStatus: AttendanceStatus =
          lateMins > 0 ? 'Terlambat' : 'Hadir';

        if (existing) {
          const updated: TeacherAttendanceRecord = {
            ...existing,
            checkInTime: currentTimeStr,
            status: computedStatus,
            lateMinutes: lateMins,
            workDuration: calculateWorkDuration(
              currentTimeStr,
              existing.checkOutTime
            ),
            method: 'RFID Otomatis',
          };

          setAttendance((prev) =>
            prev.map((item) => (item.id === existing.id ? updated : item))
          );
          void enqueueOrSync({ action: 'upsertAttendance', record: updated });

          if (lateMins > 0) {
            soundEngine.playLateBeep(soundEnabled);
          } else {
            soundEngine.playSuccessBeep(soundEnabled);
          }

          setLastScan({
            type: lateMins > 0 ? 'checkin-late' : 'checkin-ok',
            actionLabel: 'ABSEN DATANG',
            uid: cleanedUid,
            timestamp: currentTimeStr,
            teacher: matchedTeacher,
            record: updated,
            message:
              lateMins > 0
                ? `Datang Terlambat ${lateMins} menit (Batas ${checkInThreshold})`
                : 'Absen Datang Berhasil — Hadir Tepat Waktu',
          });
          return;
        }

        const newRecord: TeacherAttendanceRecord = {
          id: `tatt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          teacherId: matchedTeacher.id,
          teacherName: matchedTeacher.name,
          nip: matchedTeacher.nip,
          role: matchedTeacher.role,
          rfidUid: matchedTeacher.rfidUid,
          date: selectedDate,
          checkInTime: currentTimeStr,
          checkOutTime: null,
          status: computedStatus,
          lateMinutes: lateMins,
          workDuration: null,
          checkoutStatus: null,
          method: 'RFID Otomatis',
        };

        setAttendance((prev) => [newRecord, ...prev]);
        void enqueueOrSync({ action: 'upsertAttendance', record: newRecord });

        if (lateMins > 0) {
          soundEngine.playLateBeep(soundEnabled);
        } else {
          soundEngine.playSuccessBeep(soundEnabled);
        }

        setLastScan({
          type: lateMins > 0 ? 'checkin-late' : 'checkin-ok',
          actionLabel: 'ABSEN DATANG',
          uid: cleanedUid,
          timestamp: currentTimeStr,
          teacher: matchedTeacher,
          record: newRecord,
          message:
            lateMins > 0
              ? `Datang Terlambat ${lateMins} menit (Batas ${checkInThreshold})`
              : 'Absen Datang Berhasil — Hadir Tepat Waktu',
        });
      } else {
        // Direction === 'out' (ABSEN PULANG)
        // 1. Guard: Anti-Double Tap Cooldown after Check-In
        if (
          existing?.checkInTime &&
          attendancePolicy.minCheckoutDelayMinutes > 0
        ) {
          const checkInMins = timeToMinutes(existing.checkInTime.slice(0, 5));
          const tapMins = timeToMinutes(currentTimeStr.slice(0, 5));
          const elapsedMins = tapMins - checkInMins;

          if (
            elapsedMins >= 0 &&
            elapsedMins < attendancePolicy.minCheckoutDelayMinutes
          ) {
            soundEngine.playErrorBeep(soundEnabled);
            setLastScan({
              type: 'checkout-blocked',
              actionLabel: 'BELUM WAKTUNYA',
              uid: cleanedUid,
              timestamp: currentTimeStr,
              teacher: matchedTeacher,
              record: existing,
              message: `Tap ganda diabaikan. Baru absen datang pukul ${existing.checkInTime.slice(
                0,
                5
              )} WIB (jeda minimal absen pulang ${
                attendancePolicy.minCheckoutDelayMinutes
              } menit).`,
            });
            return;
          }
        }

        // 2. Guard: Lock Early Check-Out Before Daily Scheduled Check-Out Time
        const isEarlyCheckout =
          currentTimeStr.slice(0, 5) < checkOutThreshold.slice(0, 5);

        if (
          attendancePolicy.lockEarlyCheckout &&
          activeDaySchedule.isActive &&
          isEarlyCheckout
        ) {
          soundEngine.playErrorBeep(soundEnabled);
          setLastScan({
            type: 'checkout-blocked',
            actionLabel: 'BELUM WAKTUNYA',
            uid: cleanedUid,
            timestamp: currentTimeStr,
            teacher: matchedTeacher,
            record: existing,
            message: `Absen pulang ditolak karena belum waktunya pulang. Jadwal pulang hari ${activeDaySchedule.dayName} pukul ${checkOutThreshold} WIB.`,
          });
          return;
        }

        const checkoutSt: 'Tepat Waktu' | 'Pulang Cepat' = isEarlyCheckout
          ? 'Pulang Cepat'
          : 'Tepat Waktu';

        if (existing) {
          const checkInRef = existing.checkInTime || checkInThreshold + ':00';
          const duration = calculateWorkDuration(checkInRef, currentTimeStr);

          const updated: TeacherAttendanceRecord = {
            ...existing,
            checkInTime: existing.checkInTime || checkInRef,
            checkOutTime: currentTimeStr,
            workDuration: duration,
            checkoutStatus: checkoutSt,
            method: 'RFID Otomatis',
          };

          setAttendance((prev) =>
            prev.map((item) => (item.id === existing.id ? updated : item))
          );
          void enqueueOrSync({ action: 'upsertAttendance', record: updated });

          if (isEarlyCheckout) {
            soundEngine.playLateBeep(soundEnabled);
          } else {
            soundEngine.playSuccessBeep(soundEnabled);
          }

          setLastScan({
            type: isEarlyCheckout ? 'checkout-early' : 'checkout-ok',
            actionLabel: 'ABSEN PULANG',
            uid: cleanedUid,
            timestamp: currentTimeStr,
            teacher: matchedTeacher,
            record: updated,
            message: isEarlyCheckout
              ? `Pulang Cepat sebelum ${checkOutThreshold} · Durasi Kerja ${duration || '-'}`
              : `Absen Pulang Selesai · Total Jam Kerja ${duration || '-'}`,
          });
          return;
        }

        const defaultCheckIn = `${checkInThreshold}:00`;
        const duration = calculateWorkDuration(defaultCheckIn, currentTimeStr);
        const newRecord: TeacherAttendanceRecord = {
          id: `tatt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          teacherId: matchedTeacher.id,
          teacherName: matchedTeacher.name,
          nip: matchedTeacher.nip,
          role: matchedTeacher.role,
          rfidUid: matchedTeacher.rfidUid,
          date: selectedDate,
          checkInTime: defaultCheckIn,
          checkOutTime: currentTimeStr,
          status: 'Hadir',
          lateMinutes: 0,
          workDuration: duration,
          checkoutStatus: checkoutSt,
          method: 'RFID Otomatis',
        };

        setAttendance((prev) => [newRecord, ...prev]);
        void enqueueOrSync({ action: 'upsertAttendance', record: newRecord });
        soundEngine.playSuccessBeep(soundEnabled);

        setLastScan({
          type: isEarlyCheckout ? 'checkout-early' : 'checkout-ok',
          actionLabel: 'ABSEN PULANG',
          uid: cleanedUid,
          timestamp: currentTimeStr,
          teacher: matchedTeacher,
          record: newRecord,
          message: `Absen Pulang Tercatat · Durasi Kerja ${duration || '-'}`,
        });
      }
    },
    [
      teachers,
      attendance,
      selectedDate,
      scanMode,
      checkInThreshold,
      checkOutThreshold,
      activeDaySchedule.isActive,
      activeDaySchedule.dayName,
      attendancePolicy,
      soundEnabled,
      enqueueOrSync,
    ]
  );

  // Global USB Keyboard Wedge RFID Reader Listener
  const keyBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTimeRef.current > 150) {
        keyBufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (keyBufferRef.current.length >= 4) {
          const capturedUid = keyBufferRef.current;
          keyBufferRef.current = '';
          handleTriggerScan(capturedUid);
        }
      } else if (e.key.length === 1) {
        keyBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleTriggerScan]);

  // Manual Recap Handlers
  const handleManualSetStatus = (
    teacher: Teacher,
    status: AttendanceStatus,
    notes?: string
  ) => {
    const now = new Date();
    const currentTimeStr = [
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join(':');

    const existing = attendance.find(
      (a) => a.date === selectedDate && a.teacherId === teacher.id
    );

    if (existing) {
      const updatedRec: TeacherAttendanceRecord = {
        ...existing,
        status,
        notes: notes !== undefined ? notes : existing.notes,
      };
      setAttendance((prev) =>
        prev.map((item) => (item.id === existing.id ? updatedRec : item))
      );
      void enqueueOrSync({ action: 'upsertAttendance', record: updatedRec });
      return;
    }

    const isPresentOrLate = status === 'Hadir' || status === 'Terlambat';
    const newRec: TeacherAttendanceRecord = {
      id: `tatt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      teacherId: teacher.id,
      teacherName: teacher.name,
      nip: teacher.nip,
      role: teacher.role,
      rfidUid: teacher.rfidUid,
      date: selectedDate,
      checkInTime: isPresentOrLate ? currentTimeStr : null,
      checkOutTime: null,
      status,
      lateMinutes:
        status === 'Terlambat'
          ? Math.max(5, calculateLateMinutes(currentTimeStr, checkInThreshold))
          : 0,
      workDuration: null,
      checkoutStatus: null,
      method: 'Input Manual',
      notes,
    };
    setAttendance((prev) => [newRec, ...prev]);
    void enqueueOrSync({ action: 'upsertAttendance', record: newRec });
  };

  const handleBatchCheckoutAllPresent = () => {
    const checkoutTimeStr = `${checkOutThreshold}:00`;
    const updatedToSync: TeacherAttendanceRecord[] = [];
    const nextAttendance = attendance.map((rec) => {
      if (
        rec.date === selectedDate &&
        rec.checkInTime &&
        !rec.checkOutTime &&
        (rec.status === 'Hadir' || rec.status === 'Terlambat')
      ) {
        const updated: TeacherAttendanceRecord = {
          ...rec,
          checkOutTime: checkoutTimeStr,
          workDuration: calculateWorkDuration(rec.checkInTime, checkoutTimeStr),
          checkoutStatus: 'Tepat Waktu',
        };
        updatedToSync.push(updated);
        return updated;
      }
      return rec;
    });
    setAttendance(nextAttendance);
    updatedToSync.forEach((rec) => {
      void enqueueOrSync({ action: 'upsertAttendance', record: rec });
    });
  };

  const handleDeleteAttendance = (id: string) => {
    setAttendance((prev) => prev.filter((a) => a.id !== id));
    void enqueueOrSync({ action: 'deleteAttendance', id });
  };

  const handleSaveTeacher = (teacher: Teacher) => {
    const exists = teachers.some((t) => t.id === teacher.id);
    const nextTeachers = exists
      ? teachers.map((t) => (t.id === teacher.id ? teacher : t))
      : [...teachers, teacher];
    setTeachers(nextTeachers);
    void enqueueOrSync({ action: 'syncTeachers', teachers: nextTeachers });
  };

  const handleBulkImportTeachers = (
    incomingTeachers: Teacher[],
    duplicateMode: 'skip' | 'overwrite'
  ) => {
    const nextTeachers = [...teachers];
    incomingTeachers.forEach((inc) => {
      const matchIdx = nextTeachers.findIndex(
        (t) =>
          (inc.nip && t.nip === inc.nip) ||
          t.rfidUid.toUpperCase() === inc.rfidUid.toUpperCase()
      );

      if (matchIdx >= 0) {
        if (duplicateMode === 'overwrite') {
          nextTeachers[matchIdx] = {
            ...inc,
            id: nextTeachers[matchIdx].id,
            cardRegisteredAt: nextTeachers[matchIdx].cardRegisteredAt,
          };
        }
      } else {
        nextTeachers.push(inc);
      }
    });
    setTeachers(nextTeachers);
    void enqueueOrSync({ action: 'syncTeachers', teachers: nextTeachers });
  };

  const handleDeleteTeacher = (id: string) => {
    const nextTeachers = teachers.filter((t) => t.id !== id);
    setTeachers(nextTeachers);
    setAttendance((prev) => prev.filter((a) => a.teacherId !== id));
    void enqueueOrSync({ action: 'syncTeachers', teachers: nextTeachers });
  };

  const handleOpenRegisterModalWithUid = (uid: string) => {
    setIsFullscreenKiosk(false);
    setPendingUidToRegister(uid);
    setActiveTab('teachers');
  };

  const handleUpdateDaySchedule = (
    dayIndex: number,
    updates: Partial<DaySchedule>
  ) => {
    const nextSchedule = weeklySchedule.map((day) =>
      day.dayIndex === dayIndex ? { ...day, ...updates } : day
    );
    setWeeklySchedule(nextSchedule);
    void enqueueOrSync({ action: 'syncSchedule', weeklySchedule: nextSchedule });
  };

  const handleApplyMondayToAll = () => {
    const monday = weeklySchedule.find((d) => d.dayIndex === 1);
    if (!monday) return;
    const nextSchedule = weeklySchedule.map((day) => ({
      ...day,
      checkInTime: monday.checkInTime,
      checkOutTime: monday.checkOutTime,
    }));
    setWeeklySchedule(nextSchedule);
    void enqueueOrSync({ action: 'syncSchedule', weeklySchedule: nextSchedule });
  };

  const handleResetWeeklySchedule = () => {
    setWeeklySchedule(INITIAL_WEEKLY_SCHEDULE);
    void enqueueOrSync({
      action: 'syncSchedule',
      weeklySchedule: INITIAL_WEEKLY_SCHEDULE,
    });
  };

  const handleResetDemoData = () => {
    setTeachers([]);
    setAttendance([]);
    setPendingQueue([]);
    setLastScan(null);
  };

  const handleResetSchoolProfile = () => {
    setSchoolProfile(DEFAULT_SCHOOL_PROFILE);
  };

  const handleClearLastScan = useCallback(() => {
    setLastScan(null);
  }, []);

  return (
    <div className="print:hidden min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Bar Contract: 3-Zone Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#kiosk"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('kiosk');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
        >
          HadirTap Guru
        </a>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <button
            type="button"
            onClick={() => setActiveTab('kiosk')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'kiosk'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold underline underline-offset-8'
                : ''
            }`}
          >
            Layar Kiosk
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('terminal')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'terminal'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold underline underline-offset-8'
                : ''
            }`}
          >
            Terminal Admin
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recap')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'recap'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold underline underline-offset-8'
                : ''
            }`}
          >
            Rekap Kehadiran
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('teachers')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'teachers'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold underline underline-offset-8'
                : ''
            }`}
          >
            Kartu Guru
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'analytics'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold underline underline-offset-8'
                : ''
            }`}
          >
            Laporan Kerja
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'settings'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold underline underline-offset-8'
                : ''
            }`}
          >
            Pengaturan
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('kiosk');
              setIsFullscreenKiosk(true);
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors whitespace-nowrap shrink-0"
          >
            Buka Kiosk Penuh
          </button>
        </div>
      </header>

      {/* Workspace Body: Sidebar + Main Viewport */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1440px] w-full mx-auto">
        {/* Left Sidebar Navigation */}
        <aside className="w-full lg:w-64 shrink-0 bg-white dark:bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-6">
          <div className="space-y-6">
            {/* Active Shift Summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Jadwal Hari {activeDaySchedule.dayName}
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5 font-mono tabular-nums">
                {activeDaySchedule.isActive
                  ? `${checkInThreshold} – ${checkOutThreshold} WIB`
                  : 'Hari Libur (Non-Aktif)'}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Mode Reader</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {scanMode}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Kunci Pulang Awal</span>
                  <span
                    className={`font-semibold ${
                      attendancePolicy.lockEarlyCheckout
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {attendancePolicy.lockEarlyCheckout ? 'Aktif' : 'Bebas'}
                  </span>
                </div>
              </div>
            </div>

            {/* Sidebar Menu Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('kiosk')}
                className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'kiosk'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Monitor className="w-4 h-4 shrink-0" />
                <span>Layar Kiosk Mandiri</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('terminal')}
                className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'terminal'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Radio className="w-4 h-4 shrink-0" />
                <span>Terminal Admin RFID</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('recap')}
                className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'recap'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ClipboardList className="w-4 h-4 shrink-0" />
                <span>Rekap Datang &amp; Pulang</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('teachers')}
                className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'teachers'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Data Guru &amp; Kartu RFID</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'analytics'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Laporan Jam Kerja</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'settings'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Pengaturan Sekolah</span>
              </button>
            </div>
          </div>

          {/* Utility Controls: Theme & Demo Reset */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex lg:flex-col items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <span>Mode Tampilan</span>
              <span className="inline-flex items-center gap-1.5 text-slate-900 dark:text-slate-200">
                {darkMode ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Gelap</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>Terang</span>
                  </>
                )}
              </span>
            </button>

            <button
              type="button"
              onClick={handleResetDemoData}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <span>Kosongkan Data Lokal</span>
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>

        {/* Main Viewport Content */}
        <main className="flex-1 p-5 lg:p-8 min-w-0">
          {activeTab === 'kiosk' && (
            <KioskModeView
              teachers={teachers}
              attendance={attendance}
              scanMode={scanMode}
              setScanMode={setScanMode}
              activeDaySchedule={activeDaySchedule}
              attendancePolicy={attendancePolicy}
              schoolProfile={schoolProfile}
              soundEnabled={soundEnabled}
              setSoundEnabled={setSoundEnabled}
              lastScan={lastScan}
              onClearLastScan={handleClearLastScan}
              onTriggerScan={handleTriggerScan}
              selectedDate={selectedDate}
              isFullscreenKiosk={isFullscreenKiosk}
              setIsFullscreenKiosk={setIsFullscreenKiosk}
            />
          )}

          {activeTab === 'terminal' && (
            <RfidTerminalView
              teachers={teachers}
              attendance={attendance}
              scanMode={scanMode}
              setScanMode={setScanMode}
              weeklySchedule={weeklySchedule}
              activeDaySchedule={activeDaySchedule}
              onUpdateDaySchedule={handleUpdateDaySchedule}
              onApplyMondayToAll={handleApplyMondayToAll}
              onResetWeeklySchedule={handleResetWeeklySchedule}
              attendancePolicy={attendancePolicy}
              setAttendancePolicy={setAttendancePolicy}
              soundEnabled={soundEnabled}
              setSoundEnabled={setSoundEnabled}
              lastScan={lastScan}
              onTriggerScan={handleTriggerScan}
              onOpenRegisterModalWithUid={handleOpenRegisterModalWithUid}
              onDeleteAttendance={handleDeleteAttendance}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
            />
          )}

          {activeTab === 'recap' && (
            <AttendanceRecapView
              teachers={teachers}
              attendance={attendance}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              onManualSetStatus={handleManualSetStatus}
              onBatchCheckoutAllPresent={handleBatchCheckoutAllPresent}
              schoolProfile={schoolProfile}
              setSchoolProfile={setSchoolProfile}
            />
          )}

          {activeTab === 'teachers' && (
            <StudentRfidDirectoryView
              teachers={teachers}
              onSaveTeacher={handleSaveTeacher}
              onBulkImportTeachers={handleBulkImportTeachers}
              onDeleteTeacher={handleDeleteTeacher}
              pendingUidToRegister={pendingUidToRegister}
              onClearPendingUid={() => setPendingUidToRegister(null)}
            />
          )}

          {activeTab === 'analytics' && (
            <TeacherScheduleJournalView
              teachers={teachers}
              attendance={attendance}
              weeklySchedule={weeklySchedule}
              schoolProfile={schoolProfile}
              setSchoolProfile={setSchoolProfile}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              schoolProfile={schoolProfile}
              setSchoolProfile={setSchoolProfile}
              onResetProfile={handleResetSchoolProfile}
              sheetsConfig={sheetsConfig}
              setSheetsConfig={setSheetsConfig}
              pendingQueueCount={pendingQueue.length}
              onPushAllToSheets={handlePushAllToSheets}
              onPullFromSheets={handlePullFromSheets}
              onFlushSyncQueue={handleFlushSyncQueue}
            />
          )}
        </main>
      </div>
    </div>
  );
}
