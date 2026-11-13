import { SchoolPrintProfile } from '../types';

export interface PrintColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  isTextCode?: boolean; // Prevent Excel from turning NIP/UID into scientific notation
}

export interface PrintSummaryItem {
  label: string;
  value: string | number;
}

export interface PrintableReportPayload {
  fileNameBase: string;
  title: string;
  subtitle: string;
  periodLabel: string;
  signatureDateLabel: string;
  summaries: PrintSummaryItem[];
  columns: PrintColumn[];
  rows: Record<string, string | number>[];
}

export function formatIndonesianDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dateObj = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);
}

export function formatShortIndonesianDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dateObj = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);
}

export function formatMonthYearLabel(monthStr: string): string {
  if (!monthStr || monthStr === 'ALL') return 'Semua Periode Tercatat';
  const [y, m] = monthStr.split('-').map(Number);
  if (!y || !m) return monthStr;
  const dateObj = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(dateObj);
}

function escapeHtml(val: string | number | undefined | null): string {
  const str = String(val ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function triggerFileDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadExcelReport(
  payload: PrintableReportPayload,
  profile: SchoolPrintProfile
) {
  const colSpan = payload.columns.length;
  const summaryText = payload.summaries
    .map((s) => `${s.label}: ${s.value}`)
    .join('   |   ');

  const headerCells = payload.columns
    .map(
      (col) =>
        `<th style="background-color:#e2e8f0;color:#0f172a;font-weight:bold;border:1px solid #475569;padding:6px 8px;text-align:${
          col.align || 'left'
        };">${escapeHtml(col.label)}</th>`
    )
    .join('');

  const bodyRows = payload.rows
    .map((row) => {
      const cells = payload.columns
        .map((col) => {
          const rawVal = row[col.key] ?? '-';
          const style = col.isTextCode
            ? `mso-number-format:'\\@';border:1px solid #94a3b8;padding:5px 8px;text-align:${
                col.align || 'left'
              };`
            : `border:1px solid #94a3b8;padding:5px 8px;text-align:${
                col.align || 'left'
              };`;
          return `<td style="${style}">${escapeHtml(rawVal)}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const leftSignCol = Math.max(1, Math.floor(colSpan / 2));
  const rightSignCol = Math.max(1, colSpan - leftSignCol);

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(payload.title)}</title>
</head>
<body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;">
  <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;">
    <tr>
      <td colspan="${colSpan}" style="font-size:14pt;font-weight:bold;text-align:center;">${escapeHtml(
        profile.schoolName.toUpperCase()
      )}</td>
    </tr>
    <tr>
      <td colspan="${colSpan}" style="font-size:10pt;text-align:center;">${escapeHtml(
        profile.schoolSubtitle
      )}</td>
    </tr>
    <tr>
      <td colspan="${colSpan}" style="font-size:9pt;text-align:center;border-bottom:2px solid #000000;padding-bottom:6px;">${escapeHtml(
        profile.schoolAddress
      )}</td>
    </tr>
    <tr><td colspan="${colSpan}" style="height:10px;"></td></tr>
    <tr>
      <td colspan="${colSpan}" style="font-size:12pt;font-weight:bold;text-align:center;">${escapeHtml(
        payload.title
      )}</td>
    </tr>
    <tr>
      <td colspan="${colSpan}" style="font-size:10pt;text-align:center;">${escapeHtml(
        payload.periodLabel
      )}</td>
    </tr>
    <tr>
      <td colspan="${colSpan}" style="font-size:9pt;text-align:center;padding-bottom:8px;">${escapeHtml(
        summaryText
      )}</td>
    </tr>
    <thead>
      <tr>${headerCells}</tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
    <tr><td colspan="${colSpan}" style="height:18px;"></td></tr>
    <tr>
      <td colspan="${leftSignCol}" style="text-align:center;">Mengetahui,</td>
      <td colspan="${rightSignCol}" style="text-align:center;">${escapeHtml(
        profile.city
      )}, ${escapeHtml(payload.signatureDateLabel)}</td>
    </tr>
    <tr>
      <td colspan="${leftSignCol}" style="text-align:center;">Kepala Sekolah</td>
      <td colspan="${rightSignCol}" style="text-align:center;">${escapeHtml(
        profile.operatorRole
      )}</td>
    </tr>
    <tr>
      <td colspan="${leftSignCol}" style="height:48px;"></td>
      <td colspan="${rightSignCol}" style="height:48px;"></td>
    </tr>
    <tr>
      <td colspan="${leftSignCol}" style="text-align:center;font-weight:bold;text-decoration:underline;">${escapeHtml(
        profile.principalName
      )}</td>
      <td colspan="${rightSignCol}" style="text-align:center;font-weight:bold;text-decoration:underline;">${escapeHtml(
        profile.operatorName
      )}</td>
    </tr>
    <tr>
      <td colspan="${leftSignCol}" style="text-align:center;font-size:9pt;">NIP. ${escapeHtml(
        profile.principalNip
      )}</td>
      <td colspan="${rightSignCol}" style="text-align:center;font-size:9pt;"></td>
    </tr>
  </table>
</body>
</html>`;

  const blob = new Blob(['\ufeff', html], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });
  triggerFileDownload(blob, `${payload.fileNameBase}.xls`);
}

export function downloadPrintableHtml(
  payload: PrintableReportPayload,
  profile: SchoolPrintProfile
) {
  const headerCells = payload.columns
    .map(
      (col) =>
        `<th style="text-align:${col.align || 'left'};">${escapeHtml(
          col.label
        )}</th>`
    )
    .join('');

  const bodyRows = payload.rows
    .map((row) => {
      const cells = payload.columns
        .map(
          (col) =>
            `<td style="text-align:${col.align || 'left'};${
              col.isTextCode ? "font-family:'Courier New',monospace;" : ''
            }">${escapeHtml(row[col.key] ?? '-')}</td>`
        )
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const summaryItems = payload.summaries
    .map(
      (s) =>
        `<div class="summary-item"><span>${escapeHtml(
          s.label
        )}:</span> <strong>${escapeHtml(s.value)}</strong></div>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(payload.title)} — ${escapeHtml(profile.schoolName)}</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #0f172a;
      background: #f1f5f9;
      margin: 0;
      padding: 20px;
      font-size: 11px;
      line-height: 1.4;
    }
    .toolbar {
      max-width: 210mm;
      margin: 0 auto 14px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 12px;
    }
    .toolbar button {
      background: #4f46e5;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
    }
    .sheet {
      max-width: 210mm;
      margin: 0 auto;
      background: #ffffff;
      padding: 14mm 16mm;
      box-shadow: 0 2px 12px rgba(15, 23, 42, 0.08);
    }
    .kop {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      text-align: center;
      border-bottom: 3px double #0f172a;
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .kop-logo {
      width: 64px;
      height: 64px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .kop-text { flex: 1; }
    .kop h1 { margin: 0; font-size: 16px; letter-spacing: 0.4px; text-transform: uppercase; }
    .kop .sub { margin: 2px 0; font-size: 11px; font-weight: 600; color: #334155; }
    .kop .addr { margin: 2px 0 0 0; font-size: 10px; color: #475569; }
    .doc-title { text-align: center; margin-bottom: 12px; }
    .doc-title h2 { margin: 0; font-size: 13px; text-transform: uppercase; text-decoration: underline; }
    .doc-title p { margin: 4px 0 0 0; font-size: 11px; color: #334155; }
    .summary-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 20px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      padding: 8px 12px;
      margin-bottom: 12px;
      font-size: 10.5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    th, td {
      border: 1px solid #334155;
      padding: 5px 6px;
      vertical-align: top;
    }
    th {
      background: #e2e8f0;
      font-weight: 700;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 28px;
      page-break-inside: avoid;
      font-size: 11px;
    }
    .sig-box {
      width: 42%;
      text-align: center;
    }
    .sig-space {
      height: 62px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sig-space img {
      max-height: 58px;
      max-width: 170px;
      object-fit: contain;
    }
    .sig-name { font-weight: 700; text-decoration: underline; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .toolbar { display: none !important; }
      .sheet { box-shadow: none; padding: 0; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span>Dokumen Siap Cetak A4 — ${escapeHtml(payload.title)}</span>
    <button type="button" onclick="window.print()">Cetak / Simpan PDF</button>
  </div>
  <div class="sheet">
    <div class="kop">
      ${
        profile.logoDataUrl
          ? `<img class="kop-logo" src="${profile.logoDataUrl}" alt="Logo Sekolah" />`
          : ''
      }
      <div class="kop-text">
        <h1>${escapeHtml(profile.schoolName)}</h1>
        <div class="sub">${escapeHtml(profile.schoolSubtitle)}</div>
        <div class="addr">${escapeHtml(profile.schoolAddress)}</div>
      </div>
    </div>
    <div class="doc-title">
      <h2>${escapeHtml(payload.title)}</h2>
      <p>${escapeHtml(payload.periodLabel)}</p>
    </div>
    <div class="summary-bar">
      ${summaryItems}
    </div>
    <table>
      <thead>
        <tr>${headerCells}</tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>
    <div class="signatures">
      <div class="sig-box">
        <div>Mengetahui,</div>
        <div>Kepala Sekolah</div>
        <div class="sig-space">
          ${
            profile.principalSignatureDataUrl
              ? `<img src="${profile.principalSignatureDataUrl}" alt="TTD Kepala Sekolah" />`
              : ''
          }
        </div>
        <div class="sig-name">${escapeHtml(profile.principalName)}</div>
        <div>NIP. ${escapeHtml(profile.principalNip)}</div>
      </div>
      <div class="sig-box">
        <div>${escapeHtml(profile.city)}, ${escapeHtml(
          payload.signatureDateLabel
        )}</div>
        <div>${escapeHtml(profile.operatorRole)}</div>
        <div class="sig-space">
          ${
            profile.operatorSignatureDataUrl
              ? `<img src="${profile.operatorSignatureDataUrl}" alt="TTD Petugas" />`
              : ''
          }
        </div>
        <div class="sig-name">${escapeHtml(profile.operatorName)}</div>
      </div>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  triggerFileDownload(blob, `${payload.fileNameBase}_Siap_Cetak.html`);
}
