import React, { useState } from 'react';
import { AlertTriangle, CheckCheck, Search, Upload } from 'lucide-react';
import type {
  AttendanceStatus,
  CoreData,
  DraftMap,
  DraftRow,
  MonthMap,
  TabKey,
} from '../types/sims';
import {
  buildDraftRow,
  consecutiveSickDays,
  formatLongDate,
  isWeekday,
  needsLetter,
  normalizeText,
  parseDate,
  STATUS_LABELS,
} from '../utils/simsLogic';

interface InputViewProps {
  core: CoreData;
  months: MonthMap;
  todayStr: string;
  selectedClassId: number;
  selectedDate: string;
  drafts: DraftMap;
  feedback: { text: string; bad: boolean } | null;
  onChangeClass: (classId: number) => void;
  onChangeDate: (dateStr: string) => void;
  onSelectStatus: (studentId: number, status: 'H' | 'S' | 'I' | 'A') => void;
  onChangeNote: (studentId: number, note: string) => void;
  onToggleDefer: (studentId: number, defer: boolean) => void;
  onUploadPhoto: (studentId: number, file: File) => Promise<void>;
  onFillAllPresent: () => void;
  onSave: () => void;
  onNavigateTab: (tab: TabKey) => void;
  onPreviewPhoto: (pid: string | undefined, caption: string) => void;
}

const STATUS_STYLE: Record<'H' | 'S' | 'I' | 'A', { active: string; hover: string }> = {
  H: {
    active: 'bg-[var(--h-btn)] text-white border-transparent shadow-xs',
    hover: 'hover:border-[var(--h)] hover:text-[var(--h)]',
  },
  S: {
    active: 'bg-[var(--s-btn)] text-white border-transparent shadow-xs',
    hover: 'hover:border-[var(--s)] hover:text-[var(--s)]',
  },
  I: {
    active: 'bg-[var(--i-btn)] text-white border-transparent shadow-xs',
    hover: 'hover:border-[var(--i)] hover:text-[var(--i)]',
  },
  A: {
    active: 'bg-[var(--a-btn)] text-white border-transparent shadow-xs',
    hover: 'hover:border-[var(--a)] hover:text-[var(--a)]',
  },
};

export const InputView: React.FC<InputViewProps> = ({
  core,
  months,
  todayStr,
  selectedClassId,
  selectedDate,
  drafts,
  feedback,
  onChangeClass,
  onChangeDate,
  onSelectStatus,
  onChangeNote,
  onToggleDefer,
  onUploadPhoto,
  onFillAllPresent,
  onSave,
  onNavigateTab,
  onPreviewPhoto,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!core.c.length) {
    return (
      <section className="bg-[var(--sf)] border border-[var(--ln)] rounded-xl p-8 shadow-sm">
        <h1 className="text-xl font-extrabold tracking-tight">Input Absensi Harian</h1>
        <p className="text-sm text-[var(--mu)] mt-1.5 mb-5">
          Belum ada kelas. Tambahkan siswa dan kelas terlebih dahulu di menu Data.
        </p>
        <button
          type="button"
          onClick={() => onNavigateTab('data')}
          className="min-h-[40px] rounded-lg bg-[var(--pri-btn)] text-white px-4 py-2 text-sm font-semibold hover:brightness-105 transition cursor-pointer"
        >
          Buka menu Data
        </button>
      </section>
    );
  }

  const allInClass = core.st.filter((s) => s.c === selectedClassId);
  const q = normalizeText(searchQuery);
  const filtered = q
    ? allInClass.filter(
        (s) =>
          normalizeText(s.n).includes(q) || s.nis.toLowerCase().includes(q)
      )
    : allInClass;

  const getDraft = (studentId: number): DraftRow => {
    if (drafts[studentId]) return drafts[studentId];
    const student = allInClass.find((s) => s.id === studentId);
    if (!student) return { st: '', note: '', doc: null, defer: false };
    return buildDraftRow(months, student, selectedDate);
  };

  const filledCount = allInClass.filter((s) => Boolean(getDraft(s.id).st)).length;
  const isSchoolDay = isWeekday(parseDate(selectedDate));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Input Absensi Harian
          </h1>
          <p className="text-sm text-[var(--mu)]">
            {formatLongDate(selectedDate)} ·{' '}
            <strong className="text-[var(--ink)] font-mono-num">
              {filledCount}/{allInClass.length}
            </strong>{' '}
            siswa dipilih
          </p>
        </div>

        <button
          type="button"
          onClick={onFillAllPresent}
          className="inline-flex items-center gap-1.5 min-h-[40px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] text-[var(--ink)] px-4 py-2 text-sm font-semibold hover:bg-[var(--sf2)] transition cursor-pointer whitespace-nowrap"
        >
          <CheckCheck className="w-4 h-4 text-[var(--h)]" aria-hidden="true" />
          <span>Isi semua hadir</span>
        </button>
      </div>

      {Boolean(core.demo) && (
        <div className="rounded-xl border border-[var(--s)]/35 bg-[var(--sb)] px-4 py-3 text-sm">
          <strong>Tips data contoh:</strong> Coba ubah status{' '}
          <strong>Budi Santoso</strong> (X Ikhwan 1) menjadi <strong>S</strong>{' '}
          (Sakit). Karena di hari sekolah sebelumnya ia sudah sakit, sistem
          otomatis mewajibkan foto surat.
        </div>
      )}

      {!isSchoolDay && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-xl border border-[var(--a)]/35 bg-[var(--ab)] px-4 py-3 text-sm"
        >
          <AlertTriangle className="w-4 h-4 text-[var(--a)] shrink-0" aria-hidden="true" />
          <span>
            <strong>Perhatian:</strong> Tanggal yang dipilih adalah akhir pekan
            (Sabtu/Minggu). Pilih hari Senin–Jumat untuk menyimpan absensi.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--mu)]">
          Kelas
          <select
            value={selectedClassId}
            onChange={(e) => onChangeClass(Number(e.target.value))}
            className="min-h-[40px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-2 text-sm text-[var(--ink)] font-medium focus:outline-none focus:border-[var(--pri)]"
          >
            {core.c.map((c) => (
              <option key={c.id} value={c.id}>
                {c.n}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--mu)]">
          Tanggal
          <input
            type="date"
            value={selectedDate}
            max={todayStr}
            onChange={(e) => {
              if (e.target.value) onChangeDate(e.target.value);
            }}
            className="min-h-[40px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-2 text-sm text-[var(--ink)] font-medium focus:outline-none focus:border-[var(--pri)]"
          />
        </label>

        <label className="flex-1 min-w-[210px] flex flex-col gap-1 text-xs font-semibold text-[var(--mu)]">
          Cari siswa
          <div className="relative">
            <Search
              className="w-4 h-4 text-[var(--mu)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ketik nama atau NIS..."
              className="w-full min-h-[40px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] pl-9 pr-3 py-2 text-sm text-[var(--ink)] font-medium focus:outline-none focus:border-[var(--pri)]"
            />
          </div>
        </label>
      </div>

      <div className="bg-[var(--sf)] border border-[var(--ln)] rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full min-w-[740px] border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--sf2)] border-b border-[var(--ln2)] text-xs font-bold text-[var(--mu)]">
              <th className="text-left px-4 py-3">NIS</th>
              <th className="text-left px-4 py-3">Nama Siswa</th>
              <th className="text-left px-4 py-3">Status (H/S/I/A)</th>
              <th className="text-left px-4 py-3">Dokumen Surat</th>
              <th className="text-left px-4 py-3">Catatan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ln2)]">
            {filtered.map((s) => {
              const row = getDraft(s.id);
              const sickStreak =
                row.st === 'S'
                  ? consecutiveSickDays(months, s.id, selectedDate) + 1
                  : 0;
              const requiresLetter = needsLetter(row.st, sickStreak);
              const doc = row.doc;

              return (
                <tr key={s.id} className="hover:bg-[var(--pri-b)]/30 transition-colors">
                  <td className="px-4 py-3 text-[var(--mu)] font-mono-num whitespace-nowrap">
                    {s.nis}
                  </td>
                  <td className="px-4 py-3 font-bold">{s.n}</td>
                  <td className="px-4 py-3">
                    <div className="inline-flex gap-1.5" role="group" aria-label={`Status kehadiran ${s.n}`}>
                      {(['H', 'S', 'I', 'A'] as const).map((code) => {
                        const pressed = row.st === code;
                        return (
                          <button
                            key={code}
                            type="button"
                            aria-pressed={pressed}
                            title={STATUS_LABELS[code]}
                            aria-label={`${STATUS_LABELS[code]}: ${s.n}`}
                            onClick={() => onSelectStatus(s.id, code)}
                            className={`w-10 h-9 rounded-lg border font-bold text-sm transition cursor-pointer ${
                              pressed
                                ? STATUS_STYLE[code].active
                                : `border-[var(--ln)] bg-[var(--sf)] text-[var(--ink)] ${STATUS_STYLE[code].hover}`
                            }`}
                          >
                            {code}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {requiresLetter ? (
                      <div className="space-y-1.5">
                        <span className="inline-block rounded-md bg-[var(--ab)] border border-[var(--a)]/35 text-[var(--a)] px-2 py-0.5 text-xs font-bold">
                          {row.st === 'I'
                            ? 'Izin: wajib surat'
                            : `Sakit hari ke-${sickStreak}: wajib surat`}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          {doc ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  onPreviewPhoto(
                                    doc.pid,
                                    `${s.n}, ${formatLongDate(selectedDate)}`
                                  )
                                }
                                className="inline-flex items-center rounded-md bg-[var(--hb)] text-[var(--h)] px-2 py-0.5 text-xs font-semibold hover:underline cursor-pointer"
                              >
                                {doc.n || 'foto surat'} ({doc.k} KB
                                {doc.o
                                  ? `, hemat ${Math.max(
                                      0,
                                      Math.round(100 - (doc.k! / doc.o) * 100)
                                    )}%`
                                  : ''}
                                )
                              </button>
                              <label className="inline-flex items-center gap-1 rounded-md border border-dashed border-[var(--pri)] bg-[var(--pri-b)] text-[var(--pri)] px-2.5 py-1 text-xs font-semibold cursor-pointer hover:brightness-95">
                                <Upload className="w-3 h-3" aria-hidden="true" />
                                <span>Ganti foto</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="sr-only"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) void onUploadPhoto(s.id, file);
                                  }}
                                />
                              </label>
                            </>
                          ) : (
                            <>
                              <label className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-[var(--pri)] bg-[var(--pri-b)] text-[var(--pri)] px-2.5 py-1 text-xs font-semibold cursor-pointer hover:brightness-95">
                                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Unggah foto surat</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="sr-only"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) void onUploadPhoto(s.id, file);
                                  }}
                                />
                              </label>
                              <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ink)] cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={row.defer}
                                  onChange={(e) => onToggleDefer(s.id, e.target.checked)}
                                  className="w-4 h-4 accent-[var(--pri)] cursor-pointer"
                                />
                                <span>Menyusul</span>
                              </label>
                            </>
                          )}
                        </div>
                      </div>
                    ) : row.st === 'S' ? (
                      <span className="text-xs text-[var(--mu)]">
                        Sakit hari ke-1, surat belum wajib
                      </span>
                    ) : row.st ? (
                      <span className="text-xs text-[var(--mu)]">Tidak perlu surat</span>
                    ) : (
                      <span className="text-xs text-[var(--mu)]">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.note}
                      onChange={(e) => onChangeNote(s.id, e.target.value)}
                      placeholder="Catatan opsional..."
                      aria-label={`Catatan ${s.n}`}
                      className="w-full min-w-[140px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-2.5 py-1.5 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--pri)]"
                    />
                  </td>
                </tr>
              );
            })}

            {!filtered.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--mu)]">
                  Tidak ada siswa yang sesuai.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div role="status" className="text-sm font-semibold">
          {feedback && (
            <span className={feedback.bad ? 'text-[var(--a)]' : 'text-[var(--h)]'}>
              {feedback.text}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onSave}
          className="min-h-[42px] rounded-lg bg-[var(--pri-btn)] text-white px-5 py-2 text-sm font-semibold hover:brightness-105 active:translate-y-px transition cursor-pointer whitespace-nowrap"
        >
          Simpan absensi
        </button>
      </div>
    </div>
  );
};
