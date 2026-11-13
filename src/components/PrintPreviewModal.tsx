import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  FileSpreadsheet,
  FileDown,
  X,
  Settings2,
} from 'lucide-react';
import { SchoolPrintProfile } from '../types';
import {
  PrintableReportPayload,
  downloadExcelReport,
  downloadPrintableHtml,
} from '../utils/exportPrint';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: PrintableReportPayload;
  schoolProfile: SchoolPrintProfile;
  setSchoolProfile: React.Dispatch<React.SetStateAction<SchoolPrintProfile>>;
}

const PrintableSheetBody: React.FC<{
  payload: PrintableReportPayload;
  schoolProfile: SchoolPrintProfile;
}> = ({ payload, schoolProfile }) => {
  return (
    <div className="bg-white text-slate-900 font-sans text-xs leading-normal">
      {/* Kop Surat Sekolah */}
      <div className="flex items-center justify-center gap-4 border-b-2 border-slate-900 pb-3 mb-4">
        {schoolProfile.logoDataUrl && (
          <img
            src={schoolProfile.logoDataUrl}
            alt="Logo Sekolah"
            className="w-16 h-16 object-contain shrink-0"
          />
        )}
        <div className="flex-1 text-center">
          <div className="text-base font-bold uppercase tracking-wide text-slate-900">
            {schoolProfile.schoolName}
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

      {/* Judul Laporan */}
      <div className="text-center mb-3">
        <div className="text-sm font-bold uppercase underline underline-offset-4 text-slate-900">
          {payload.title}
        </div>
        <div className="text-xs text-slate-700 mt-1">{payload.periodLabel}</div>
      </div>

      {/* Ringkasan */}
      {payload.summaries.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border border-slate-300 bg-slate-50 px-3 py-2 mb-3 text-[11px] text-slate-800">
          {payload.summaries.map((item) => (
            <span key={item.label}>
              {item.label}:{' '}
              <strong className="font-mono tabular-nums">{item.value}</strong>
            </span>
          ))}
        </div>
      )}

      {/* Tabel Data Bergaris Resmi */}
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-slate-200 text-slate-900">
            {payload.columns.map((col) => (
              <th
                key={col.key}
                className={`border border-slate-700 px-2 py-1.5 font-bold ${
                  col.align === 'center'
                    ? 'text-center'
                    : col.align === 'right'
                    ? 'text-right'
                    : 'text-left'
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {payload.rows.map((row, idx) => (
            <tr key={idx}>
              {payload.columns.map((col) => (
                <td
                  key={col.key}
                  className={`border border-slate-400 px-2 py-1.5 align-top text-slate-900 ${
                    col.isTextCode ? 'font-mono tabular-nums' : ''
                  } ${
                    col.align === 'center'
                      ? 'text-center'
                      : col.align === 'right'
                      ? 'text-right'
                      : 'text-left'
                  }`}
                >
                  {row[col.key] ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Blok Tanda Tangan */}
      <div className="grid grid-cols-2 gap-8 mt-8 text-xs text-slate-900 break-inside-avoid">
        <div className="text-center">
          <div>Mengetahui,</div>
          <div>Kepala Sekolah</div>
          <div className="h-16 flex items-center justify-center my-1">
            {schoolProfile.principalSignatureDataUrl && (
              <img
                src={schoolProfile.principalSignatureDataUrl}
                alt="Tanda Tangan Kepala Sekolah"
                className="max-h-16 max-w-[160px] object-contain"
              />
            )}
          </div>
          <div className="font-bold underline underline-offset-2">
            {schoolProfile.principalName}
          </div>
          <div className="font-mono tabular-nums text-[11px] mt-0.5">
            NIP. {schoolProfile.principalNip}
          </div>
        </div>

        <div className="text-center">
          <div>
            {schoolProfile.city}, {payload.signatureDateLabel}
          </div>
          <div>{schoolProfile.operatorRole}</div>
          <div className="h-16 flex items-center justify-center my-1">
            {schoolProfile.operatorSignatureDataUrl && (
              <img
                src={schoolProfile.operatorSignatureDataUrl}
                alt="Tanda Tangan Petugas"
                className="max-h-16 max-w-[160px] object-contain"
              />
            )}
          </div>
          <div className="font-bold underline underline-offset-2">
            {schoolProfile.operatorName}
          </div>
        </div>
      </div>
    </div>
  );
};

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  payload,
  schoolProfile,
  setSchoolProfile,
}) => {
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  if (!isOpen) return null;

  const updateField = (field: keyof SchoolPrintProfile, value: string) => {
    setSchoolProfile((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      {/* Interactive Modal (Hidden during window.print()) */}
      <div className="print:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-xl">
          {/* Modal Toolbar */}
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Pratinjau Dokumen Siap Cetak (A4)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cetak langsung ke PDF/printer atau unduh file siap cetak &amp; Excel terformat.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowProfileEditor(!showProfileEditor)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  showProfileEditor
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 text-indigo-700 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Settings2 className="w-4 h-4" />
                <span>Atur Kop &amp; TTD</span>
              </button>

              <button
                type="button"
                onClick={() => downloadExcelReport(payload, schoolProfile)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Unduh Excel (.xls)</span>
              </button>

              <button
                type="button"
                onClick={() => downloadPrintableHtml(payload, schoolProfile)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <FileDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Unduh Siap Cetak (.html)</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors whitespace-nowrap shrink-0"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Simpan PDF</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup pratinjau cetak"
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Collapsible Letterhead & Signatory Editor */}
          {showProfileEditor && (
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Nama Sekolah
                </label>
                <input
                  type="text"
                  value={schoolProfile.schoolName}
                  onChange={(e) => updateField('schoolName', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Sub-Kop / Dinas Pendidikan
                </label>
                <input
                  type="text"
                  value={schoolProfile.schoolSubtitle}
                  onChange={(e) =>
                    updateField('schoolSubtitle', e.target.value)
                  }
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Alamat &amp; Kontak Sekolah
                </label>
                <input
                  type="text"
                  value={schoolProfile.schoolAddress}
                  onChange={(e) => updateField('schoolAddress', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Kota Penetapan
                </label>
                <input
                  type="text"
                  value={schoolProfile.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Nama Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={schoolProfile.principalName}
                  onChange={(e) => updateField('principalName', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                  NIP Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={schoolProfile.principalNip}
                  onChange={(e) => updateField('principalNip', e.target.value)}
                  className="w-full px-2.5 py-1.5 font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Nama Petugas / Operator
                </label>
                <input
                  type="text"
                  value={schoolProfile.operatorName}
                  onChange={(e) => updateField('operatorName', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          {/* Simulated A4 Paper Preview */}
          <div className="flex-1 overflow-y-auto bg-slate-200 dark:bg-slate-950 p-4 sm:p-8">
            <div className="max-w-[210mm] mx-auto bg-white p-6 sm:p-10 shadow-md border border-slate-300">
              <PrintableSheetBody
                payload={payload}
                schoolProfile={schoolProfile}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Native Print Portal (Visible ONLY during window.print()) */}
      {createPortal(
        <div className="hidden print:block bg-white text-slate-900">
          <PrintableSheetBody
            payload={payload}
            schoolProfile={schoolProfile}
          />
        </div>,
        document.body
      )}
    </>
  );
};
