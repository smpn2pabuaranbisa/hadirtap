export type AttendanceStatus =
  | 'Hadir'
  | 'Terlambat'
  | 'Dinas Luar'
  | 'Izin'
  | 'Sakit'
  | 'Alpa';

export type TerminalScanMode = 'Otomatis' | 'Absen Datang' | 'Absen Pulang';

export interface DaySchedule {
  dayIndex: number; // 1 = Senin, 2 = Selasa, ..., 6 = Sabtu
  dayName: string;
  isActive: boolean;
  checkInTime: string; // HH:mm
  checkOutTime: string; // HH:mm
}

export interface Teacher {
  id: string;
  nip: string;
  name: string;
  role: string; // Mata Pelajaran / Jabatan
  rfidUid: string;
  gender: 'L' | 'P';
  phone: string;
  cardRegisteredAt: string;
}

export interface TeacherAttendanceRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  nip: string;
  role: string;
  rfidUid: string;
  date: string; // YYYY-MM-DD
  checkInTime: string | null; // HH:mm:ss
  checkOutTime: string | null; // HH:mm:ss
  status: AttendanceStatus;
  lateMinutes: number;
  workDuration: string | null;
  checkoutStatus: 'Tepat Waktu' | 'Pulang Cepat' | null;
  method: 'RFID Otomatis' | 'Input Manual';
  notes?: string;
}

export interface SchoolPrintProfile {
  schoolName: string;
  schoolSubtitle: string;
  schoolAddress: string;
  city: string;
  principalName: string;
  principalNip: string;
  operatorName: string;
  operatorRole: string;
  logoDataUrl?: string;
  principalSignatureDataUrl?: string;
  operatorSignatureDataUrl?: string;
}

export interface AttendancePolicy {
  lockEarlyCheckout: boolean;
  minCheckoutDelayMinutes: number;
}

export interface ScanEventResult {
  type:
    | 'checkin-ok'
    | 'checkin-late'
    | 'checkout-ok'
    | 'checkout-early'
    | 'checkout-blocked'
    | 'unregistered'
    | 'info';
  actionLabel:
    | 'ABSEN DATANG'
    | 'ABSEN PULANG'
    | 'BELUM WAKTUNYA'
    | 'KARTU ASING'
    | 'INFO';
  uid: string;
  timestamp: string;
  teacher?: Teacher;
  record?: TeacherAttendanceRecord;
  message: string;
}

export interface GoogleSheetsConfig {
  enabled: boolean;
  webAppUrl: string;
  secretToken: string;
  autoSync: boolean;
  lastSyncedAt?: string;
}

export type SchoolIdentityTextOnly = Omit<
  SchoolPrintProfile,
  'logoDataUrl' | 'principalSignatureDataUrl' | 'operatorSignatureDataUrl'
>;

export type SyncOperation =
  | { action: 'upsertAttendance'; record: TeacherAttendanceRecord }
  | { action: 'deleteAttendance'; id: string }
  | { action: 'syncTeachers'; teachers: Teacher[] }
  | { action: 'syncSchedule'; weeklySchedule: DaySchedule[] }
  | {
      action: 'syncSettings';
      policy: AttendancePolicy;
      schoolProfile: SchoolIdentityTextOnly;
    }
  | {
      action: 'pushAll';
      teachers: Teacher[];
      attendance: TeacherAttendanceRecord[];
      weeklySchedule: DaySchedule[];
      policy: AttendancePolicy;
      schoolProfile: SchoolIdentityTextOnly;
    };

