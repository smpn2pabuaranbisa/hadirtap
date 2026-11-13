import {
  Teacher,
  TeacherAttendanceRecord,
  DaySchedule,
  AttendancePolicy,
  GoogleSheetsConfig,
  SchoolIdentityTextOnly,
  SchoolPrintProfile,
  SyncOperation,
} from '../types';

import { fitImageForSheets } from './imageUpload';

export interface PulledSheetsData {
  teachers?: Teacher[];
  attendance?: TeacherAttendanceRecord[];
  weeklySchedule?: DaySchedule[];
  policy?: AttendancePolicy;
  schoolProfile?: Partial<SchoolPrintProfile>;
}

export function stripImageFields(
  profile: SchoolPrintProfile
): SchoolIdentityTextOnly {
  return {
    schoolName: profile.schoolName,
    schoolSubtitle: profile.schoolSubtitle,
    schoolAddress: profile.schoolAddress,
    city: profile.city,
    principalName: profile.principalName,
    principalNip: profile.principalNip,
    operatorName: profile.operatorName,
    operatorRole: profile.operatorRole,
  };
}

export async function prepareSchoolProfileForSheets(
  profile: SchoolPrintProfile
): Promise<SchoolPrintProfile> {
  const safeLogo = profile.logoDataUrl
    ? await fitImageForSheets(profile.logoDataUrl, 320).catch(() => '')
    : '';
  const safePrincipalSig = profile.principalSignatureDataUrl
    ? await fitImageForSheets(profile.principalSignatureDataUrl, 360).catch(() => '')
    : '';
  const safeOperatorSig = profile.operatorSignatureDataUrl
    ? await fitImageForSheets(profile.operatorSignatureDataUrl, 360).catch(() => '')
    : '';

  return {
    ...stripImageFields(profile),
    logoDataUrl: safeLogo,
    principalSignatureDataUrl: safePrincipalSig,
    operatorSignatureDataUrl: safeOperatorSig,
  };
}

export async function testSheetsConnection(
  config: GoogleSheetsConfig
): Promise<{ ok: boolean; message: string; spreadsheetName?: string }> {
  const url = config.webAppUrl.trim();
  if (!url) {
    return { ok: false, message: 'URL Web App Google Apps Script belum diisi.' };
  }

  try {
    const endpoint = `${url}${url.includes('?') ? '&' : '?'}action=ping&token=${encodeURIComponent(
      config.secretToken.trim()
    )}&_ts=${Date.now()}`;
    const res = await fetch(endpoint, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
    });
    if (!res.ok) {
      return {
        ok: false,
        message: `Server merespons status ${res.status}. Pastikan Web App di-deploy dengan akses "Anyone".`,
      };
    }
    const json = await res.json();
    if (!json.ok) {
      return {
        ok: false,
        message: json.error || 'Token tidak cocok atau script menolak akses.',
      };
    }
    return {
      ok: true,
      spreadsheetName: json.spreadsheetName,
      message: `Terhubung ke "${json.spreadsheetName || 'Google Spreadsheet'}". 4 tab database siap digunakan.`,
    };
  } catch {
    return {
      ok: false,
      message:
        'Gagal terhubung ke URL Web App. Periksa URL deployment atau koneksi internet.',
    };
  }
}

export async function pullAllFromSheets(
  config: GoogleSheetsConfig
): Promise<{ ok: boolean; data?: PulledSheetsData; message: string }> {
  const url = config.webAppUrl.trim();
  if (!url) {
    return { ok: false, message: 'URL Web App belum diisi.' };
  }

  try {
    const endpoint = `${url}${url.includes('?') ? '&' : '?'}action=pullAll&token=${encodeURIComponent(
      config.secretToken.trim()
    )}&_ts=${Date.now()}`;
    const res = await fetch(endpoint, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
    });
    if (!res.ok) {
      return {
        ok: false,
        message: `Gagal menarik data (HTTP ${res.status}).`,
      };
    }
    const json = await res.json();
    if (!json.ok) {
      return {
        ok: false,
        message: json.error || 'Token ditolak oleh Apps Script.',
      };
    }
    return {
      ok: true,
      data: json.data as PulledSheetsData,
      message: 'Data berhasil ditarik dari Google Spreadsheet.',
    };
  } catch {
    return {
      ok: false,
      message: 'Koneksi ke Google Apps Script gagal. Periksa internet atau URL Web App.',
    };
  }
}

export async function sendSyncOperation(
  config: GoogleSheetsConfig,
  operation: SyncOperation
): Promise<{ ok: boolean; message: string }> {
  const url = config.webAppUrl.trim();
  if (!url) {
    return { ok: false, message: 'URL Web App belum dikonfigurasi.' };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        // text/plain prevents CORS preflight OPTIONS on Google Apps Script Web Apps
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        token: config.secretToken.trim(),
        ...operation,
      }),
      redirect: 'follow',
    });

    if (!res.ok) {
      return { ok: false, message: `HTTP Error ${res.status}` };
    }

    const json = await res.json();
    if (!json.ok) {
      return {
        ok: false,
        message: json.error || 'Gagal menyimpan ke Google Spreadsheet.',
      };
    }

    return { ok: true, message: json.message || 'Tersinkron ke Google Spreadsheet.' };
  } catch {
    return {
      ok: false,
      message: 'Gagal mengirim data ke Google Apps Script.',
    };
  }
}

export function generateAppsScriptCode(secretToken: string): string {
  const safeToken = (secretToken || 'HADIRTAP-2026').replace(/'/g, "\\'");
  return `/**
 * HadirTap Guru — Backend Database Google Apps Script
 * Tempel seluruh kode ini ke Extensions > Apps Script di Google Spreadsheet sekolah.
 * Lalu klik Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 */

var SECRET_TOKEN = '${safeToken}';

var SHEET_NAMES = {
  TEACHERS: 'Guru',
  ATTENDANCE: 'Absensi',
  SCHEDULE: 'Jadwal',
  SETTINGS: 'Pengaturan'
};

var HEADERS = {
  Guru: ['id', 'nip', 'name', 'role', 'rfidUid', 'gender', 'phone', 'cardRegisteredAt'],
  Absensi: ['id', 'date', 'teacherId', 'teacherName', 'nip', 'role', 'rfidUid', 'checkInTime', 'checkOutTime', 'status', 'lateMinutes', 'workDuration', 'checkoutStatus', 'method', 'notes'],
  Jadwal: ['dayIndex', 'dayName', 'isActive', 'checkInTime', 'checkOutTime'],
  Pengaturan: ['key', 'value']
};

function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    if (!isAuthorized_(params.token)) {
      return jsonResponse_({ ok: false, error: 'Token keamanan tidak valid.' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheets_(ss);

    var action = params.action || 'ping';
    if (action === 'ping') {
      return jsonResponse_({
        ok: true,
        spreadsheetName: ss.getName(),
        sheets: [SHEET_NAMES.TEACHERS, SHEET_NAMES.ATTENDANCE, SHEET_NAMES.SCHEDULE, SHEET_NAMES.SETTINGS]
      });
    }

    if (action === 'pullAll') {
      return jsonResponse_({
        ok: true,
        data: pullAllData_(ss)
      });
    }

    return jsonResponse_({ ok: false, error: 'Action GET tidak dikenali: ' + action });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var payload = JSON.parse(raw);

    if (!isAuthorized_(payload.token)) {
      return jsonResponse_({ ok: false, error: 'Token keamanan tidak valid.' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheets_(ss);

    var action = payload.action;

    if (action === 'upsertAttendance' && payload.record) {
      upsertAttendance_(ss, payload.record);
      return jsonResponse_({ ok: true, message: 'Absensi tersimpan.' });
    }

    if (action === 'deleteAttendance' && payload.id) {
      deleteAttendance_(ss, payload.id);
      return jsonResponse_({ ok: true, message: 'Log absensi dihapus.' });
    }

    if (action === 'syncTeachers' && payload.teachers) {
      replaceTeachers_(ss, payload.teachers);
      return jsonResponse_({ ok: true, message: 'Data guru disinkronkan.' });
    }

    if (action === 'syncSchedule' && payload.weeklySchedule) {
      replaceSchedule_(ss, payload.weeklySchedule);
      return jsonResponse_({ ok: true, message: 'Jadwal Senin-Sabtu disinkronkan.' });
    }

    if (action === 'syncSettings') {
      replaceSettings_(ss, payload.policy, payload.schoolProfile);
      return jsonResponse_({ ok: true, message: 'Pengaturan disinkronkan.' });
    }

    if (action === 'pushAll') {
      if (payload.teachers) replaceTeachers_(ss, payload.teachers);
      if (payload.attendance) replaceAttendanceAll_(ss, payload.attendance);
      if (payload.weeklySchedule) replaceSchedule_(ss, payload.weeklySchedule);
      replaceSettings_(ss, payload.policy, payload.schoolProfile);
      return jsonResponse_({ ok: true, message: 'Seluruh data berhasil dikirim ke Google Sheets.' });
    }

    return jsonResponse_({ ok: false, error: 'Action POST tidak dikenali: ' + action });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function isAuthorized_(token) {
  if (!SECRET_TOKEN) return true;
  return String(token || '').trim() === String(SECRET_TOKEN).trim();
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureSheets_(ss) {
  Object.keys(HEADERS).forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    if (sheet.getLastRow() === 0) {
      var cols = HEADERS[name];
      sheet.getRange(1, 1, 1, cols.length).setValues([cols]);
      sheet.getRange(1, 1, 1, cols.length).setFontWeight('bold').setBackground('#e2e8f0');
      sheet.setFrozenRows(1);
    }
  });
}

function upsertAttendance_(ss, rec) {
  var sheet = ss.getSheetByName(SHEET_NAMES.ATTENDANCE);
  var lastRow = sheet.getLastRow();
  var rowValues = [[
    String(rec.id || ''),
    String(rec.date || ''),
    String(rec.teacherId || ''),
    String(rec.teacherName || ''),
    String(rec.nip || ''),
    String(rec.role || ''),
    String(rec.rfidUid || ''),
    rec.checkInTime ? String(rec.checkInTime) : '',
    rec.checkOutTime ? String(rec.checkOutTime) : '',
    String(rec.status || 'Hadir'),
    Number(rec.lateMinutes || 0),
    rec.workDuration ? String(rec.workDuration) : '',
    rec.checkoutStatus ? String(rec.checkoutStatus) : '',
    String(rec.method || 'RFID Otomatis'),
    rec.notes ? String(rec.notes) : ''
  ]];

  if (lastRow > 1) {
    var data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    for (var i = 0; i < data.length; i++) {
      var rowId = String(data[i][0]);
      var rowDate = formatCellDate_(data[i][1]);
      var rowTeacherId = String(data[i][2]);
      if (rowId === String(rec.id) || (rowDate === String(rec.date) && rowTeacherId === String(rec.teacherId))) {
        var targetRange = sheet.getRange(i + 2, 1, 1, HEADERS.Absensi.length);
        targetRange.setNumberFormat('@');
        targetRange.setValues(rowValues);
        return;
      }
    }
  }

  var appendRowIdx = Math.max(2, lastRow + 1);
  var newRange = sheet.getRange(appendRowIdx, 1, 1, HEADERS.Absensi.length);
  newRange.setNumberFormat('@');
  newRange.setValues(rowValues);
}

function deleteAttendance_(ss, id) {
  var sheet = ss.getSheetByName(SHEET_NAMES.ATTENDANCE);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]) === String(id)) {
      sheet.deleteRow(i + 2);
    }
  }
}

function replaceTeachers_(ss, teachers) {
  var sheet = ss.getSheetByName(SHEET_NAMES.TEACHERS);
  clearBody_(sheet);
  if (!teachers || teachers.length === 0) return;

  var rows = teachers.map(function (t) {
    return [
      String(t.id || ''),
      String(t.nip || ''),
      String(t.name || ''),
      String(t.role || ''),
      String(t.rfidUid || ''),
      String(t.gender || 'L'),
      String(t.phone || ''),
      String(t.cardRegisteredAt || '')
    ];
  });
  var range = sheet.getRange(2, 1, rows.length, HEADERS.Guru.length);
  range.setNumberFormat('@');
  range.setValues(rows);
}

function replaceAttendanceAll_(ss, attendance) {
  var sheet = ss.getSheetByName(SHEET_NAMES.ATTENDANCE);
  clearBody_(sheet);
  if (!attendance || attendance.length === 0) return;

  var rows = attendance.map(function (rec) {
    return [
      String(rec.id || ''),
      String(rec.date || ''),
      String(rec.teacherId || ''),
      String(rec.teacherName || ''),
      String(rec.nip || ''),
      String(rec.role || ''),
      String(rec.rfidUid || ''),
      rec.checkInTime ? String(rec.checkInTime) : '',
      rec.checkOutTime ? String(rec.checkOutTime) : '',
      String(rec.status || 'Hadir'),
      Number(rec.lateMinutes || 0),
      rec.workDuration ? String(rec.workDuration) : '',
      rec.checkoutStatus ? String(rec.checkoutStatus) : '',
      String(rec.method || 'RFID Otomatis'),
      rec.notes ? String(rec.notes) : ''
    ];
  });
  var range = sheet.getRange(2, 1, rows.length, HEADERS.Absensi.length);
  range.setNumberFormat('@');
  range.setValues(rows);
}

function replaceSchedule_(ss, schedule) {
  var sheet = ss.getSheetByName(SHEET_NAMES.SCHEDULE);
  clearBody_(sheet);
  if (!schedule || schedule.length === 0) return;

  var rows = schedule.map(function (d) {
    return [
      Number(d.dayIndex),
      String(d.dayName || ''),
      d.isActive ? 'TRUE' : 'FALSE',
      String(d.checkInTime || '07:00'),
      String(d.checkOutTime || '15:00')
    ];
  });
  var range = sheet.getRange(2, 1, rows.length, HEADERS.Jadwal.length);
  range.setNumberFormat('@');
  range.setValues(rows);
}

function replaceSettings_(ss, policy, schoolProfile) {
  var sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  clearBody_(sheet);
  var rows = [];
  if (policy) {
    rows.push(['lockEarlyCheckout', policy.lockEarlyCheckout ? 'TRUE' : 'FALSE']);
    rows.push(['minCheckoutDelayMinutes', String(policy.minCheckoutDelayMinutes || 0)]);
  }
  if (schoolProfile) {
    Object.keys(schoolProfile).forEach(function (k) {
      rows.push(['school_' + k, String(schoolProfile[k] || '')]);
    });
  }
  if (rows.length > 0) {
    var range = sheet.getRange(2, 1, rows.length, 2);
    range.setNumberFormat('@');
    range.setValues(rows);
  }
}

function pullAllData_(ss) {
  var result = {};

  var teacherRows = readBody_(ss.getSheetByName(SHEET_NAMES.TEACHERS));
  result.teachers = teacherRows.map(function (r) {
    return {
      id: String(r[0]),
      nip: String(r[1]),
      name: String(r[2]),
      role: String(r[3]),
      rfidUid: String(r[4]),
      gender: String(r[5]) === 'P' ? 'P' : 'L',
      phone: String(r[6]),
      cardRegisteredAt: String(r[7])
    };
  });

  var attRows = readBody_(ss.getSheetByName(SHEET_NAMES.ATTENDANCE));
  result.attendance = attRows.map(function (r) {
    return {
      id: String(r[0]),
      date: formatCellDate_(r[1]),
      teacherId: String(r[2]),
      teacherName: String(r[3]),
      nip: String(r[4]),
      role: String(r[5]),
      rfidUid: String(r[6]),
      checkInTime: formatCellTime_(r[7]),
      checkOutTime: formatCellTime_(r[8]),
      status: String(r[9] || 'Hadir'),
      lateMinutes: Number(r[10] || 0),
      workDuration: r[11] ? String(r[11]) : null,
      checkoutStatus: r[12] ? String(r[12]) : null,
      method: String(r[13]) === 'Input Manual' ? 'Input Manual' : 'RFID Otomatis',
      notes: r[14] ? String(r[14]) : undefined
    };
  });

  var schedRows = readBody_(ss.getSheetByName(SHEET_NAMES.SCHEDULE));
  if (schedRows.length > 0) {
    result.weeklySchedule = schedRows.map(function (r) {
      return {
        dayIndex: Number(r[0]),
        dayName: String(r[1]),
        isActive: String(r[2]).toUpperCase() === 'TRUE' || r[2] === true,
        checkInTime: formatCellHHmm_(r[3], '07:00'),
        checkOutTime: formatCellHHmm_(r[4], '15:00')
      };
    });
  }

  var setRows = readBody_(ss.getSheetByName(SHEET_NAMES.SETTINGS));
  if (setRows.length > 0) {
    var policy = {};
    var schoolProfile = {};
    setRows.forEach(function (r) {
      var key = String(r[0]);
      var val = String(r[1]);
      if (key === 'lockEarlyCheckout') {
        policy.lockEarlyCheckout = val.toUpperCase() === 'TRUE';
      } else if (key === 'minCheckoutDelayMinutes') {
        policy.minCheckoutDelayMinutes = Number(val || 0);
      } else if (key.indexOf('school_') === 0) {
        schoolProfile[key.replace('school_', '')] = val;
      }
    });
    if (Object.keys(policy).length > 0) result.policy = policy;
    if (Object.keys(schoolProfile).length > 0) result.schoolProfile = schoolProfile;
  }

  return result;
}

function clearBody_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
}

function readBody_(sheet) {
  if (!sheet || sheet.getLastRow() <= 1) return [];
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  return rows.filter(function (r) {
    return r.some(function (cell) {
      return String(cell || '').trim() !== '';
    });
  });
}

function formatCellDate_(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(val || '');
}

function formatCellTime_(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'HH:mm:ss');
  }
  return String(val);
}

function formatCellHHmm_(val, fallback) {
  if (!val) return fallback;
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'HH:mm');
  }
  return String(val).slice(0, 5);
}
`;
}
