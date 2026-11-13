import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Upload,
  Search,
  CreditCard,
  Edit3,
  Trash2,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Teacher } from '../types';
import {
  ROLE_LIST,
  getTodayDateString,
} from '../data/seedData';
import { BulkImportTeacherModal } from './BulkImportTeacherModal';

interface StudentRfidDirectoryViewProps {
  teachers: Teacher[];
  onSaveTeacher: (teacher: Teacher) => void;
  onBulkImportTeachers: (
    teachers: Teacher[],
    duplicateMode: 'skip' | 'overwrite'
  ) => void;
  onDeleteTeacher: (id: string) => void;
  pendingUidToRegister: string | null;
  onClearPendingUid: () => void;
}

export const StudentRfidDirectoryView: React.FC<
  StudentRfidDirectoryViewProps
> = ({
  teachers,
  onSaveTeacher,
  onBulkImportTeachers,
  onDeleteTeacher,
  pendingUidToRegister,
  onClearPendingUid,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkSuccessMessage, setBulkSuccessMessage] = useState<string | null>(
    null
  );
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [role, setRole] = useState(ROLE_LIST[0]);
  const [rfidUid, setRfidUid] = useState('');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (pendingUidToRegister) {
      setEditingTeacher(null);
      setName('');
      setNip('');
      setRole(ROLE_LIST[0]);
      setRfidUid(pendingUidToRegister);
      setGender('L');
      setPhone('0812-');
      setFormError(null);
      setIsModalOpen(true);
    }
  }, [pendingUidToRegister]);

  const generateRandomUid = (): string => {
    const hex = () =>
      Math.floor(16 + Math.random() * 239)
        .toString(16)
        .toUpperCase()
        .padStart(2, '0');
    return `04:${hex()}:${hex()}:${hex()}`;
  };

  const openAddModal = () => {
    setEditingTeacher(null);
    setName('');
    setNip('');
    setRole(ROLE_LIST[0]);
    setRfidUid(generateRandomUid());
    setGender('L');
    setPhone('0812-');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setName(teacher.name);
    setNip(teacher.nip);
    setRole(teacher.role);
    setRfidUid(teacher.rfidUid);
    setGender(teacher.gender);
    setPhone(teacher.phone);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTeacher(null);
    setFormError(null);
    if (pendingUidToRegister) {
      onClearPendingUid();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedName = name.trim();
    const cleanedNip = nip.trim();
    const cleanedUid = rfidUid.trim().toUpperCase();

    if (!cleanedName || !cleanedNip || !cleanedUid) {
      setFormError('Nama lengkap guru, NIP/NUPTK, dan UID Kartu RFID wajib diisi.');
      return;
    }

    const duplicateUidOwner = teachers.find(
      (t) =>
        t.rfidUid.toUpperCase() === cleanedUid &&
        t.id !== (editingTeacher?.id || '')
    );

    if (duplicateUidOwner) {
      setFormError(
        `UID ${cleanedUid} sudah terdaftar atas nama ${duplicateUidOwner.name} (${duplicateUidOwner.role}).`
      );
      return;
    }

    const payload: Teacher = {
      id: editingTeacher ? editingTeacher.id : `tch-${Date.now()}`,
      name: cleanedName,
      nip: cleanedNip,
      role: role.trim() || 'Guru Mata Pelajaran',
      rfidUid: cleanedUid,
      gender,
      phone: phone.trim() || '-',
      cardRegisteredAt: editingTeacher
        ? editingTeacher.cardRegisteredAt
        : getTodayDateString(),
    };

    onSaveTeacher(payload);
    closeModal();
  };

  const filteredTeachers = teachers.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.nip.includes(searchQuery) ||
      t.rfidUid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.role.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Filter Controls */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Direktori Guru &amp; Registrasi Kartu RFID Pegawai
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Kelola data guru &amp; tenaga kependidikan, pasangkan UID kartu RFID baru, atau ganti kartu yang hilang.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Upload Massal (CSV)</span>
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors whitespace-nowrap shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Guru &amp; Kartu RFID</span>
            </button>
          </div>
        </div>

        {bulkSuccessMessage && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2 text-xs text-emerald-700 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{bulkSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setBulkSuccessMessage(null)}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
            >
              Tutup
            </button>
          </div>
        )}

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Menampilkan {filteredTeachers.length} dari {teachers.length} Guru Terdaftar
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama guru, NIP, jabatan, atau UID..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </section>

      {/* Teachers Table */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-800/40">
                <th className="py-3 px-4">Nama Lengkap &amp; Gelar</th>
                <th className="py-3 px-4">NIP / NUPTK</th>
                <th className="py-3 px-4">Jabatan / Mata Pelajaran</th>
                <th className="py-3 px-4">UID Kartu RFID</th>
                <th className="py-3 px-4">No. Telepon / WA</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    Tidak ada data guru yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => (
                  <tr
                    key={teacher.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {teacher.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {teacher.gender === 'L' ? 'Laki-laki' : 'Perempuan'} · Terdaftar {teacher.cardRegisteredAt}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300">
                      {teacher.nip}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                      {teacher.role}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-xs">
                      <span className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{teacher.rfidUid}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
                      {teacher.phone}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openEditModal(teacher)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit / UID</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTeacher(teacher.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Form Registrasi / Edit Guru & Pairing Kartu RFID */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {editingTeacher
                    ? 'Edit Data Guru & Kartu RFID'
                    : 'Registrasi Guru & Pairing Kartu RFID'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tempelkan kartu pada USB Reader saat kursor di kolom UID atau klik tombol Simulasi UID.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {pendingUidToRegister && !editingTeacher && (
                <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    UID Kartu <strong>{pendingUidToRegister}</strong> tertangkap dari Terminal dan siap dihubungkan ke guru baru.
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Guru &amp; Gelar
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Drs. Hendra Wijaya, M.Pd."
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    NIP / NUPTK
                  </label>
                  <input
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="Contoh: 198504122010011008"
                    required
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Jabatan / Guru Mata Pelajaran
                  </label>
                  <input
                    type="text"
                    list="role-suggestions"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Contoh: Guru Matematika / Waka Kurikulum"
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <datalist id="role-suggestions">
                    {ROLE_LIST.map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Kode UID Kartu RFID Pegawai (13.56MHz / 125kHz)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={rfidUid}
                    onChange={(e) => setRfidUid(e.target.value.toUpperCase())}
                    placeholder="04:A1:B2:C3"
                    required
                    className="flex-1 px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-indigo-600 dark:text-indigo-400 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setRfidUid(generateRandomUid())}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Simulasi Tap UID Baru</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'L' | 'P')}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    No. WhatsApp Aktif
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0812-3456-7890"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
                >
                  Simpan Data Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Upload Massal Data Guru */}
      <BulkImportTeacherModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        existingTeachers={teachers}
        onImport={(importedTeachers, duplicateMode) => {
          onBulkImportTeachers(importedTeachers, duplicateMode);
          setBulkSuccessMessage(
            `Berhasil mengimpor ${importedTeachers.length} data guru ke direktori RFID.`
          );
        }}
      />
    </div>
  );
};
