import { Teacher, TeacherAttendanceRecord, DaySchedule } from '../types';

export const INITIAL_WEEKLY_SCHEDULE: DaySchedule[] = [
  { dayIndex: 1, dayName: 'Senin', isActive: true, checkInTime: '07:00', checkOutTime: '15:00' },
  { dayIndex: 2, dayName: 'Selasa', isActive: true, checkInTime: '07:00', checkOutTime: '15:00' },
  { dayIndex: 3, dayName: 'Rabu', isActive: true, checkInTime: '07:00', checkOutTime: '15:00' },
  { dayIndex: 4, dayName: 'Kamis', isActive: true, checkInTime: '07:00', checkOutTime: '15:00' },
  { dayIndex: 5, dayName: 'Jumat', isActive: true, checkInTime: '07:00', checkOutTime: '11:30' },
  { dayIndex: 6, dayName: 'Sabtu', isActive: true, checkInTime: '07:15', checkOutTime: '13:00' },
];

export const getScheduleForDate = (
  dateStr: string,
  weeklySchedule: DaySchedule[]
): DaySchedule => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const localDate = y && m && d ? new Date(y, m - 1, d) : new Date();
  const dayIdx = localDate.getDay(); // 0 = Minggu, 1..6 = Senin..Sabtu

  const found = weeklySchedule.find((item) => item.dayIndex === dayIdx);
  if (found) return found;

  return {
    dayIndex: 0,
    dayName: 'Minggu',
    isActive: false,
    checkInTime: '07:00',
    checkOutTime: '15:00',
  };
};

export const ROLE_LIST = [
  'Guru Matematika',
  'Guru Fisika',
  'Guru Informatika & TIK',
  'Guru Biologi',
  'Guru Bahasa Indonesia',
  'Guru Bahasa Inggris',
  'Guru BK / Konseling',
  'Waka Kurikulum',
  'Waka Kesiswaan',
  'Kepala Tata Usaha',
];

export const getTodayDateString = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const timeToMinutes = (hhmm: string): number => {
  const parts = hhmm.split(':').map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  return h * 60 + m;
};

export const calculateLateMinutes = (
  checkInTime: string,
  thresholdTime: string
): number => {
  const inMins = timeToMinutes(checkInTime.slice(0, 5));
  const threshMins = timeToMinutes(thresholdTime.slice(0, 5));
  return Math.max(0, inMins - threshMins);
};

export const calculateWorkDuration = (
  checkInTime: string | null,
  checkOutTime: string | null
): string | null => {
  if (!checkInTime || !checkOutTime) return null;
  const start = timeToMinutes(checkInTime.slice(0, 5));
  const end = timeToMinutes(checkOutTime.slice(0, 5));
  const diff = end - start;
  if (diff <= 0) return '0j 0m';
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hours}j ${mins}m`;
};

export const INITIAL_TEACHERS: Teacher[] = [];

export const getInitialTeacherAttendance = (): TeacherAttendanceRecord[] => {
  return [];
};

