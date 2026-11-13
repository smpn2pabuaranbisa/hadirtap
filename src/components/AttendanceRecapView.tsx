import React, { useState } from 'react';
import {
  Download,
  Search,
  CheckCircle2,
  Clock,
  FileText,
  Stethoscope,
  XCircle,
  Briefcase,
  Calendar,
  LogOut,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';
import {
  Teacher,
  TeacherAttendanceRecord,
  AttendanceStatus,
  SchoolPrintProfile,
} from '../types';
import { PrintPreviewModal } from './PrintPreviewModal';
import {
  PrintableReportPayload,
  downloadExcelReport,
  formatIndonesianDate,
  formatShortIndonesianDate,
} from '../utils/exportPrint';

interface AttendanceRecapViewProps {
  teachers: Teacher[];
  attendance: TeacherAttendanceRecord[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  onManualSetStatus: (
    teacher: Teacher,
    status: AttendanceStatus,
    notes?: string
  ) => void;
  onBatchCheckoutAllPresent: () => void;
  schoolProfile: SchoolPrintProfile;
  setSchoolProfile: React.Dispatch<React.SetStateAction<SchoolPrintProfile>>;
}

const STATUS_OPTIONS: AttendanceStatus[] = [
  'Hadir',
  'Terlambat',
  'Dinas Luar',
  'Izin',
  'Sakit',
  'Alpa',
];

export const AttendanceRecapView: React.FC<AttendanceRecapViewProps> = ({
  teachers,
  attendance,
  selectedDate,
  setSelectedDate,
  onManualSetStatus,
  onBatchCheckoutAllPresent,
  schoolProfile,
  setSchoolProfile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [editingNoteTeacherId, setEditingNoteTeacherId] = useState<
    string | null
  >(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const dateRecords = attendance.filter((a) => a.date === selectedDate);

  const mergedRows = teachers.map((teacher) => {
    const rec = dateRecords.find((r) => r.teacherId === teacher.id);
    return {
      teacher,
      record: rec || null,
      status: rec ? rec.status : ('Belum Tap' as const),
    };
  });

  const filteredRows = mergedRows.filter((row) => {
    const matchesSearch =
      row.teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.teacher.nip.includes(searchQuery) ||
      row.teacher.rfidUid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.teacher.role.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'Semua' || row.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const countByStatus = (st: AttendanceStatus | 'Belum Tap') =>
    mergedRows.filter((r) => r.status === st).length;

  const pendingCheckoutCount = dateRecords.filter(
    (r) =>
      (r.status === 'Hadir' || r.status === 'Terlambat') &&
      r.checkInTime &&
      !r.checkOutTime
  ).length;

  const handleExportCsv = () => {
    const headers = [
      'No',
      'Tanggal',
      'NIP / NUPTK',
      'Nama Guru',
      'Jabatan / Mapel',
      'UID RFID',
      'Jam Datang',
      'Jam Pulang',
      'Durasi Kerja',
      'Status Kehadiran',
      'Keterlambatan (Menit)',
      'Keterangan Pulang',
      'Catatan',
    ];

    const rows = mergedRows.map((row, idx) => [
      idx + 1,
      selectedDate,
      `'${row.teacher.nip}`,
      `"${row.teacher.name}"`,
      `"${row.teacher.role}"`,
      row.teacher.rfidUid,
      row.record?.checkInTime || '-',
      row.record?.checkOutTime || '-',
      row.record?.workDuration || '-',
      row.status,
      row.record?.lateMinutes || 0,
      row.record?.checkoutStatus || '-',
      `"${row.record?.notes || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Absensi_Guru_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const dailyPrintPayload: PrintableReportPayload = {
    fileNameBase: `Daftar_Hadir_Guru_${selectedDate}`,
    title: 'DAFTAR HADIR DATANG & PULANG GURU',
    subtitle: 'Rekapitulasi Kehadiran Harian via RFID',
    periodLabel: `Hari / Tanggal: ${formatIndonesianDate(selectedDate)}${
      statusFilter !== 'Semua' ? ` · Filter Status: ${statusFilter}` : ''
    }`,
    signatureDateLabel: formatShortIndonesianDate(selectedDate),
    summaries: [
      { label: 'Total Guru', value: mergedRows.length },
      { label: 'Hadir Tepat Waktu', value: countByStatus('Hadir') },
      { label: 'Terlambat', value: countByStatus('Terlambat') },
      {
        label: 'Dinas / Izin / Sakit',
        value:
          countByStatus('Dinas Luar') +
          countByStatus('Izin') +
          countByStatus('Sakit'),
      },
      { label: 'Alpa / Belum Tap', value: countByStatus('Alpa') + countByStatus('Belum Tap') },
    ],
    columns: [
      { key: 'no', label: 'No', align: 'center' },
      { key: 'nip', label: 'NIP / NUPTK', isTextCode: true },
      { key: 'name', label: 'Nama Guru' },
      { key: 'role', label: 'Jabatan / Mapel' },
      { key: 'checkIn', label: 'Jam Datang', align: 'center', isTextCode: true },
      { key: 'checkOut', label: 'Jam Pulang', align: 'center', isTextCode: true },
      { key: 'duration', label: 'Durasi', align: 'center', isTextCode: true },
      { key: 'status', label: 'Status' },
      { key: 'notes', label: 'Keterangan' },
    ],
    rows: filteredRows.map((row, index) => ({
      no: index + 1,
      nip: row.teacher.nip,
      name: row.teacher.name,
      role: row.teacher.role,
      checkIn: row.record?.checkInTime ? row.record.checkInTime.slice(0, 5) : '-',
      checkOut: row.record?.checkOutTime ? row.record.checkOutTime.slice(0, 5) : '-',
      duration: row.record?.workDuration || '-',
      status:
        row.status === 'Terlambat' && (row.record?.lateMinutes || 0) > 0
          ? `Terlambat (+${row.record?.lateMinutes}m)`
          : row.status,
      notes:
        row.record?.notes ||
        (row.record?.checkoutStatus === 'Pulang Cepat'
          ? 'Pulang Cepat'
          : '-'),
    })),
  };

  const renderStatusLabel = (
    status: AttendanceStatus | 'Belum Tap',
    lateMinutes = 0
  ) => {
    switch (status) {
      case 'Hadir':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Hadir</span>
          </span>
        );
      case 'Terlambat':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Terlambat {lateMinutes > 0 ? `(+${lateMinutes}m)` : ''}
            </span>
          </span>
        );
      case 'Dinas Luar':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Dinas Luar</span>
          </span>
        );
      case 'Izin':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
            <FileText className="w-3.5 h-3.5" />
            <span>Izin</span>
          </span>
        );
      case 'Sakit':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Sakit</span>
          </span>
        );
      case 'Alpa':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <XCircle className="w-3.5 h-3.5" />
            <span>Alpa</span>
          </span>
        );
      default:
        return (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Belum Tap
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Buku Rekapitulasi Absensi Datang &amp; Pulang Guru
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Pantau jam kedatangan, jam kepulangan, durasi jam kerja, status dinas luar/izin, dan unduh laporan CSV.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pendingCheckoutCount > 0 && (
              <button
                type="button"
                onClick={onBatchCheckoutAllPresent}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <LogOut className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>
                  Tap Pulang Massal ({pendingCheckoutCount} Guru)
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={() => downloadExcelReport(dailyPrintPayload, schoolProfile)}
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

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Tanggal Kehadiran
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Cari Nama Guru / NIP / UID
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, NIP, atau jabatan..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Segmented Filter Tabs */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {[
              { label: 'Semua', count: mergedRows.length },
              { label: 'Hadir', count: countByStatus('Hadir') },
              { label: 'Terlambat', count: countByStatus('Terlambat') },
              { label: 'Dinas Luar', count: countByStatus('Dinas Luar') },
              { label: 'Izin', count: countByStatus('Izin') },
              { label: 'Sakit', count: countByStatus('Sakit') },
              { label: 'Alpa', count: countByStatus('Alpa') },
              { label: 'Belum Tap', count: countByStatus('Belum Tap') },
            ].map((tab) => (
              <button
                key={tab.label}
                type="button"
                onClick={() => setStatusFilter(tab.label)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === tab.label
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* High-Density Teacher Attendance Sheet */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-800/40">
                <th className="py-3 px-4 w-10">No</th>
                <th className="py-3 px-4">Nama Guru &amp; Jabatan</th>
                <th className="py-3 px-4">NIP · UID RFID</th>
                <th className="py-3 px-4">Jam Datang</th>
                <th className="py-3 px-4">Jam Pulang · Durasi</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Set Status Manual</th>
                <th className="py-3 px-4">Keterangan / Surat Tugas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    Tidak ada data guru yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map(({ teacher, record, status }, index) => (
                  <tr
                    key={teacher.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-400">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {teacher.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {teacher.role}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      <span>{teacher.nip}</span>
                      <span className="mx-1.5 text-slate-300 dark:text-slate-600">
                        ·
                      </span>
                      <span className="text-indigo-600 dark:text-indigo-400">
                        {teacher.rfidUid}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-xs whitespace-nowrap">
                      {record?.checkInTime ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {record.checkInTime}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-xs whitespace-nowrap">
                      {record?.checkOutTime ? (
                        <div>
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                            {record.checkOutTime}
                          </span>
                          {record.workDuration && (
                            <span className="ml-1.5 text-slate-500 dark:text-slate-400">
                              · {record.workDuration}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {renderStatusLabel(status, record?.lateMinutes || 0)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        {STATUS_OPTIONS.map((opt) => {
                          const isActive = status === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() =>
                                onManualSetStatus(teacher, opt, record?.notes)
                              }
                              className={`px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                                isActive
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-4 min-w-[190px]">
                      {editingNoteTeacherId === teacher.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            placeholder="Ketik keterangan..."
                            className="w-full px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const targetStatus: AttendanceStatus =
                                status === 'Belum Tap' ? 'Hadir' : status;
                              onManualSetStatus(
                                teacher,
                                targetStatus,
                                noteDraft
                              );
                              setEditingNoteTeacherId(null);
                            }}
                            className="px-2.5 py-1 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-500 whitespace-nowrap shrink-0"
                          >
                            Simpan
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                            {record?.notes || '-'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNoteTeacherId(teacher.id);
                              setNoteDraft(record?.notes || '');
                            }}
                            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap shrink-0"
                          >
                            {record?.notes ? 'Ubah' : '+ Catatan'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <PrintPreviewModal
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        payload={dailyPrintPayload}
        schoolProfile={schoolProfile}
        setSchoolProfile={setSchoolProfile}
      />
    </div>
  );
};
