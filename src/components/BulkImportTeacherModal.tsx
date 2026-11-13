import React, { useState, useRef, useMemo } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { Teacher } from '../types';
import { getTodayDateString } from '../data/seedData';

interface BulkImportTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingTeachers: Teacher[];
  onImport: (teachers: Teacher[], duplicateMode: 'skip' | 'overwrite') => void;
}

interface ParsedRow {
  rowNumber: number;
  teacher: Teacher;
  status: 'valid' | 'duplicate-existing' | 'duplicate-batch' | 'error';
  message: string;
}

const detectDelimiter = (text: string): string => {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) || '';
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;

  if (tabCount >= semiCount && tabCount >= commaCount && tabCount > 0) {
    return '\t';
  }
  if (semiCount > commaCount) {
    return ';';
  }
  return ',';
};

const parseDelimitedLine = (line: string, delimiter: string): string[] => {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
};

const normalizeGender = (raw: string): 'L' | 'P' => {
  const val = raw.trim().toUpperCase();
  if (val.startsWith('P') || val.startsWith('W')) return 'P';
  return 'L';
};

const generateUniqueUid = (usedUids: Set<string>): string => {
  let uid = '';
  let attempts = 0;
  do {
    const hex = () =>
      Math.floor(16 + Math.random() * 239)
        .toString(16)
        .toUpperCase()
        .padStart(2, '0');
    uid = `04:${hex()}:${hex()}:${hex()}`;
    attempts++;
  } while (usedUids.has(uid) && attempts < 100);
  usedUids.add(uid);
  return uid;
};

export const BulkImportTeacherModal: React.FC<BulkImportTeacherModalProps> = ({
  isOpen,
  onClose,
  existingTeachers,
  onImport,
}) => {
  const [rawInput, setRawInput] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [autoGenerateEmptyUid, setAutoGenerateEmptyUid] = useState(true);
  const [duplicateMode, setDuplicateMode] = useState<'skip' | 'overwrite'>(
    'skip'
  );
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const parsedRows = useMemo<ParsedRow[]>(() => {
    if (!rawInput.trim()) return [];

    const delimiter = detectDelimiter(rawInput);
    const lines = rawInput
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return [];

    // Check if first row is a header row
    const firstCells = parseDelimitedLine(lines[0], delimiter).map((c) =>
      c.toLowerCase()
    );
    const looksLikeHeader = firstCells.some(
      (c) =>
        c.includes('nama') ||
        c.includes('nip') ||
        c.includes('nuptk') ||
        c.includes('jabatan') ||
        c.includes('rfid')
    );

    const dataLines = looksLikeHeader ? lines.slice(1) : lines;
    const today = getTodayDateString();

    const existingNipMap = new Map<string, Teacher>();
    const existingUidMap = new Map<string, Teacher>();
    const usedUids = new Set<string>();

    existingTeachers.forEach((t) => {
      if (t.nip) existingNipMap.set(t.nip.trim(), t);
      if (t.rfidUid) {
        const upperUid = t.rfidUid.toUpperCase();
        existingUidMap.set(upperUid, t);
        usedUids.add(upperUid);
      }
    });

    const batchNips = new Set<string>();
    const batchUids = new Set<string>();

    return dataLines.map((line, index) => {
      const cols = parseDelimitedLine(line, delimiter);
      const rowNumber = looksLikeHeader ? index + 2 : index + 1;

      const name = (cols[0] || '').trim();
      const nip = (cols[1] || '').replace(/^'+/, '').trim();
      const role = (cols[2] || '').trim() || 'Guru Mata Pelajaran';
      let rfidUid = (cols[3] || '').trim().toUpperCase();
      const gender = normalizeGender(cols[4] || 'L');
      const phone = (cols[5] || '').trim() || '-';

      if (!rfidUid && autoGenerateEmptyUid) {
        rfidUid = generateUniqueUid(usedUids);
      }

      const teacher: Teacher = {
        id: `tch-bulk-${Date.now()}-${index}`,
        name,
        nip,
        role,
        rfidUid,
        gender,
        phone,
        cardRegisteredAt: today,
      };

      if (!name || !nip) {
        return {
          rowNumber,
          teacher,
          status: 'error',
          message: !name ? 'Nama guru kosong' : 'NIP / NUPTK kosong',
        };
      }

      if (!rfidUid) {
        return {
          rowNumber,
          teacher,
          status: 'error',
          message: 'UID Kartu RFID kosong',
        };
      }

      if (batchNips.has(nip) || batchUids.has(rfidUid)) {
        return {
          rowNumber,
          teacher,
          status: 'duplicate-batch',
          message: batchNips.has(nip)
            ? `NIP ${nip} duplikat di file ini`
            : `UID ${rfidUid} duplikat di file ini`,
        };
      }

      batchNips.add(nip);
      batchUids.add(rfidUid);

      const matchedExisting =
        existingNipMap.get(nip) || existingUidMap.get(rfidUid);

      if (matchedExisting) {
        return {
          rowNumber,
          teacher,
          status: 'duplicate-existing',
          message: `Cocok dengan data lama (${matchedExisting.name})`,
        };
      }

      return {
        rowNumber,
        teacher,
        status: 'valid',
        message: 'Siap diimpor',
      };
    });
  }, [rawInput, existingTeachers, autoGenerateEmptyUid]);

  if (!isOpen) return null;

  const validCount = parsedRows.filter((r) => r.status === 'valid').length;
  const duplicateExistingCount = parsedRows.filter(
    (r) => r.status === 'duplicate-existing'
  ).length;
  const errorCount = parsedRows.filter(
    (r) => r.status === 'error' || r.status === 'duplicate-batch'
  ).length;

  const importableRows = parsedRows.filter((r) => {
    if (r.status === 'valid') return true;
    if (r.status === 'duplicate-existing' && duplicateMode === 'overwrite') {
      return true;
    }
    return false;
  });

  const handleDownloadTemplate = () => {
    const csvRows = [
      [
        'Nama Lengkap & Gelar',
        'NIP / NUPTK',
        'Jabatan / Mata Pelajaran',
        'UID Kartu RFID',
        'Jenis Kelamin (L/P)',
        'No. Telepon / WA',
      ],
      [
        '"Dra. Endang Sulistyowati, M.Pd."',
        "'197905142006042009",
        'Guru Kimia',
        '04:AA:11:22',
        'P',
        '0812-7700-1122',
      ],
      [
        '"Fajar Nugroho, S.Pd."',
        "'199403102023211008",
        'Guru Penjaskes',
        '',
        'L',
        '0813-8811-3344',
      ],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      csvRows.map((row) => row.join(',')).join('\n');

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', 'Template_Data_Guru_RFID.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileLoad = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || '');
      setRawInput(content);
      setFileName(file.name);
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileLoad(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileLoad(file);
    }
  };

  const handleConfirmImport = () => {
    if (importableRows.length === 0) return;
    onImport(
      importableRows.map((r) => r.teacher),
      duplicateMode
    );
    setRawInput('');
    setFileName(null);
    onClose();
  };

  const handleLoadSamplePaste = () => {
    setFileName('Contoh_Data_Excel.csv');
    setRawInput(
      [
        'Nama Lengkap\tNIP\tJabatan / Mapel\tUID RFID\tJK\tNo. WA',
        'Dra. Endang Sulistyowati, M.Pd.\t197905142006042009\tGuru Kimia\t04:AA:11:22\tP\t0812-7700-1122',
        'Fajar Nugroho, S.Pd.\t199403102023211008\tGuru Penjaskes\t\tL\t0813-8811-3344',
        'Larasati Dewi, S.Pd.\t199711052024012019\tGuru Seni Budaya\t04:CC:33:44\tP\t0815-6600-9900',
      ].join('\n')
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Upload Massal Data Guru &amp; Kartu RFID
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Unggah file CSV dari Excel/Google Sheets atau salin-tempel langsung baris tabel data guru.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Unduh Template CSV</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* File Upload Dropzone & Paste Input */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`lg:col-span-5 border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                  : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/60 dark:bg-slate-800/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <Upload className="w-7 h-7 text-indigo-600 dark:text-indigo-400 mb-2 stroke-[1.5]" />
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {fileName ? fileName : 'Pilih atau Tarik File CSV ke Sini'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Mendukung pemisah koma (,), titik koma (;) dari Excel Indonesia, atau tab.
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLoadSamplePaste();
                }}
                className="mt-3 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Muat Contoh Data Excel (3 Guru)
              </button>
            </div>

            <div className="lg:col-span-7 flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Atau Tempel (Paste) Langsung Baris dari Excel / Spreadsheet
                </label>
                {rawInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setRawInput('');
                      setFileName(null);
                    }}
                    className="text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                  >
                    Bersihkan
                  </button>
                )}
              </div>
              <textarea
                rows={5}
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder={
                  'Format urutan kolom:\nNama Lengkap, NIP/NUPTK, Jabatan/Mapel, UID RFID (opsional), L/P, No. WA'
                }
                className="w-full flex-1 px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Import Options Strip */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoGenerateEmptyUid}
                onChange={(e) => setAutoGenerateEmptyUid(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>
                Buat UID kartu sementara otomatis jika kolom UID RFID dikosongkan
              </span>
            </label>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Jika NIP / UID sudah ada:
              </span>
              <select
                value={duplicateMode}
                onChange={(e) =>
                  setDuplicateMode(e.target.value as 'skip' | 'overwrite')
                }
                className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="skip">Lewati data duplikat</option>
                <option value="overwrite">Perbarui data yang sudah ada</option>
              </select>
            </div>
          </div>

          {/* Validation Summary & Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Pratinjau Data ({parsedRows.length} Baris)</span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {validCount} Baru Siap Impor
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-slate-300 dark:text-slate-700"
                  >
                    ·
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    {duplicateExistingCount} Sudah Terdaftar
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-slate-300 dark:text-slate-700"
                  >
                    ·
                  </span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">
                    {errorCount} Tidak Valid
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="py-2.5 px-3">Baris</th>
                        <th className="py-2.5 px-3">Nama Guru</th>
                        <th className="py-2.5 px-3">NIP / NUPTK</th>
                        <th className="py-2.5 px-3">Jabatan / Mapel</th>
                        <th className="py-2.5 px-3">UID RFID</th>
                        <th className="py-2.5 px-3">Validasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                      {parsedRows.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                        >
                          <td className="py-2 px-3 font-mono tabular-nums text-slate-400">
                            #{row.rowNumber}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                            {row.teacher.name || '-'}
                          </td>
                          <td className="py-2 px-3 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                            {row.teacher.nip || '-'}
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                            {row.teacher.role}
                          </td>
                          <td className="py-2 px-3 font-mono tabular-nums text-indigo-600 dark:text-indigo-400 font-semibold">
                            {row.teacher.rfidUid || '-'}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {row.status === 'valid' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{row.message}</span>
                              </span>
                            ) : row.status === 'duplicate-existing' ? (
                              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>{row.message}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>{row.message}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0 bg-slate-50/50 dark:bg-slate-900">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {importableRows.length > 0
              ? `${importableRows.length} data guru siap disimpan ke direktori.`
              : 'Unggah file CSV atau tempel data terlebih dahulu.'}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={importableRows.length === 0}
              onClick={handleConfirmImport}
              className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
            >
              Impor {importableRows.length} Data Guru
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
