import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Timer,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';
import {
  Teacher,
  TeacherAttendanceRecord,
  DaySchedule,
  SchoolPrintProfile,
} from '../types';
import { timeToMinutes, getTodayDateString } from '../data/seedData';
import { PrintPreviewModal } from './PrintPreviewModal';
import {
  PrintableReportPayload,
  downloadExcelReport,
  formatMonthYearLabel,
  formatShortIndonesianDate,
} from '../utils/exportPrint';

interface TeacherDisciplineSummaryViewProps {
  teachers: Teacher[];
  attendance: TeacherAttendanceRecord[];
  weeklySchedule: DaySchedule[];
  schoolProfile: SchoolPrintProfile;
  setSchoolProfile: React.Dispatch<React.SetStateAction<SchoolPrintProfile>>;
}

export const TeacherScheduleJournalView: React.FC<
  TeacherDisciplineSummaryViewProps
> = ({
  teachers,
  attendance,
  weeklySchedule,
  schoolProfile,
  setSchoolProfile,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const availableMonths = Array.from(
    new Set(attendance.map((a) => a.date.slice(0, 7)))
  )
    .sort()
    .reverse();

  const filteredAttendance =
    selectedMonth === 'ALL'
      ? attendance
      : attendance.filter((a) => a.date.startsWith(selectedMonth));

  const teacherStats = teachers.map((teacher) => {
    const records = filteredAttendance.filter((a) => a.teacherId === teacher.id);
    const totalPresent = records.filter((r) => r.status === 'Hadir').length;
    const totalLate = records.filter((r) => r.status === 'Terlambat').length;
    const totalDinas = records.filter((r) => r.status === 'Dinas Luar').length;
    const totalPermit = records.filter(
      (r) => r.status === 'Izin' || r.status === 'Sakit'
    ).length;
    const totalCheckedOut = records.filter((r) => r.checkOutTime !== null).length;
    const totalLateMins = records.reduce(
      (acc, cur) => acc + (cur.lateMinutes || 0),
      0
    );

    // Compute total working minutes across all completed check-in/out logs
    const totalWorkMins = records.reduce((acc, cur) => {
      if (!cur.checkInTime || !cur.checkOutTime) return acc;
      const diff =
        timeToMinutes(cur.checkOutTime.slice(0, 5)) -
        timeToMinutes(cur.checkInTime.slice(0, 5));
      return acc + Math.max(0, diff);
    }, 0);

    const workHours = Math.floor(totalWorkMins / 60);
    const workRemMins = totalWorkMins % 60;

    return {
      teacher,
      totalLogs: records.length,
      totalPresent,
      totalLate,
      totalDinas,
      totalPermit,
      totalCheckedOut,
      totalLateMins,
      formattedTotalWork: `${workHours}j ${workRemMins}m`,
    };
  });

  const totalLateEvents = filteredAttendance.filter(
    (a) => a.status === 'Terlambat'
  ).length;
  const totalCompletedCheckouts = filteredAttendance.filter(
    (a) => a.checkInTime && a.checkOutTime
  ).length;

  const periodPrintPayload: PrintableReportPayload = {
    fileNameBase: `Rekap_Jam_Kerja_Guru_${
      selectedMonth === 'ALL' ? 'Semua_Periode' : selectedMonth
    }`,
    title: 'REKAPITULASI KEHADIRAN & JAM KERJA GURU',
    subtitle: 'Akumulasi Kedisiplinan Absensi Datang & Pulang',
    periodLabel: `Periode Laporan: ${formatMonthYearLabel(selectedMonth)}`,
    signatureDateLabel: formatShortIndonesianDate(getTodayDateString()),
    summaries: [
      { label: 'Jumlah Guru', value: teachers.length },
      { label: 'Total Log Kehadiran', value: filteredAttendance.length },
      { label: 'Sesi Datang & Pulang Lengkap', value: totalCompletedCheckouts },
      { label: 'Kejadian Terlambat', value: totalLateEvents },
    ],
    columns: [
      { key: 'no', label: 'No', align: 'center' },
      { key: 'nip', label: 'NIP / NUPTK', isTextCode: true },
      { key: 'name', label: 'Nama Guru' },
      { key: 'role', label: 'Jabatan / Mapel' },
      { key: 'present', label: 'Tepat Waktu', align: 'center' },
      { key: 'late', label: 'Terlambat', align: 'center' },
      { key: 'lateMins', label: 'Menit Telat', align: 'center' },
      { key: 'permit', label: 'Dinas/Izin/Sakit', align: 'center' },
      { key: 'checkouts', label: 'Tap Pulang', align: 'center' },
      { key: 'totalWork', label: 'Total Jam Kerja', align: 'center', isTextCode: true },
    ],
    rows: teacherStats.map((row, idx) => ({
      no: idx + 1,
      nip: row.teacher.nip,
      name: row.teacher.name,
      role: row.teacher.role,
      present: `${row.totalPresent} hr`,
      late: `${row.totalLate} hr`,
      lateMins: `${row.totalLateMins} mnt`,
      permit: `${row.totalDinas + row.totalPermit} hr`,
      checkouts: `${row.totalCheckedOut}x`,
      totalWork: row.formattedTotalWork,
    })),
  };

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="flex flex-col gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Laporan Jam Kerja &amp; Kedisiplinan Absensi Guru
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Akumulasi ketepatan waktu datang, kepulangan, dan total jam kerja efektif berdasarkan jadwal harian Senin – Sabtu.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Periode Tercatat</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    Bulan {formatMonthYearLabel(m)}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() =>
                  downloadExcelReport(periodPrintPayload, schoolProfile)
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Unduh Excel (.xls)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPrintPreview(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors whitespace-nowrap shrink-0"
              >
                <Printer className="w-4 h-4" />
                <span>Siap Cetak / PDF</span>
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums">
            {weeklySchedule.map((day) => (
              <span key={day.dayIndex}>
                <strong className="font-sans font-semibold text-slate-800 dark:text-slate-200">
                  {day.dayName}:
                </strong>{' '}
                {day.isActive
                  ? `${day.checkInTime}–${day.checkOutTime}`
                  : 'Libur'}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Total Log Kehadiran Tercatat</span>
            </div>
            <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {filteredAttendance.length}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Timer className="w-4 h-4 text-indigo-500" />
              <span>Sesi Lengkap (Sudah Tap Datang &amp; Pulang)</span>
            </div>
            <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
              {totalCompletedCheckouts}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Total Kejadian Terlambat Datang</span>
            </div>
            <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {totalLateEvents}
            </div>
          </div>
        </div>
      </section>

      {/* Per-Teacher Working Hours & Punctuality Table */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Matriks Akumulasi Kehadiran &amp; Jam Kerja Per Guru
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-800/40">
                <th className="py-3 px-4">Nama Guru</th>
                <th className="py-3 px-4">NIP / NUPTK</th>
                <th className="py-3 px-4">Tepat Waktu</th>
                <th className="py-3 px-4">Terlambat</th>
                <th className="py-3 px-4">Total Menit Terlambat</th>
                <th className="py-3 px-4">Dinas / Izin / Sakit</th>
                <th className="py-3 px-4">Tap Pulang</th>
                <th className="py-3 px-4">Total Jam Kerja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {teacherStats.map((row) => (
                <tr
                  key={row.teacher.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {row.teacher.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {row.teacher.role}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
                    {row.teacher.nip}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {row.totalPresent} hari
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-xs font-semibold text-amber-600 dark:text-amber-400">
                    {row.totalLate} hari
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300">
                    {row.totalLateMins > 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{row.totalLateMins} menit</span>
                      </span>
                    ) : (
                      <span>0 menit</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300">
                    {row.totalDinas + row.totalPermit} hari
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-xs text-indigo-600 dark:text-indigo-400">
                    {row.totalCheckedOut} kali
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {row.formattedTotalWork}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <PrintPreviewModal
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        payload={periodPrintPayload}
        schoolProfile={schoolProfile}
        setSchoolProfile={setSchoolProfile}
      />
    </div>
  );
};
