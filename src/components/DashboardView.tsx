import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { CoreData, MonthMap, TabKey } from '../types/sims';
import {
  formatLongDate,
  getMissingDocs,
  getStatus,
  STATUS_LABELS,
} from '../utils/simsLogic';

interface DashboardViewProps {
  core: CoreData;
  months: MonthMap;
  todayStr: string;
  onNavigateTab: (tab: TabKey) => void;
  onQuickInputClass: (classId: number) => void;
  onLoadSeed: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  core,
  months,
  todayStr,
  onNavigateTab,
  onQuickInputClass,
  onLoadSeed,
}) => {
  if (!core.st.length) {
    return (
      <section className="bg-[var(--sf)] border border-[var(--ln)] rounded-xl p-10 text-center shadow-sm">
        <h2 className="text-xl font-extrabold tracking-tight">
          Selamat datang di SIMS Absensi
        </h2>
        <p className="text-sm text-[var(--mu)] max-w-md mx-auto mt-2 mb-6 leading-relaxed">
          Belum ada data siswa terdaftar. Mulai dengan menambahkan data sekolah
          &amp; siswa, atau muat data contoh untuk mencoba seluruh fitur.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateTab('data')}
            className="min-h-[40px] rounded-lg bg-[var(--pri-btn)] text-white px-4 py-2 text-sm font-semibold hover:brightness-105 transition cursor-pointer whitespace-nowrap"
          >
            Tambah data siswa
          </button>
          <button
            type="button"
            onClick={onLoadSeed}
            className="min-h-[40px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] text-[var(--ink)] px-4 py-2 text-sm font-semibold hover:bg-[var(--sf2)] transition cursor-pointer whitespace-nowrap"
          >
            Muat data contoh
          </button>
        </div>
      </section>
    );
  }

  const counts = { H: 0, S: 0, I: 0, A: 0 };
  core.st.forEach((s) => {
    const v = getStatus(months, s.id, todayStr);
    if (v) counts[v]++;
  });

  const total = core.st.length;
  const blank = total - counts.H - counts.S - counts.I - counts.A;
  const filled = total - blank;
  const missingCount = getMissingDocs(months).length;
  const attendancePct = filled ? `${Math.round((counts.H / filled) * 100)}%` : '-';

  const segments: Array<{
    key: 'H' | 'S' | 'I' | 'A' | 'B';
    label: string;
    value: number;
    colorClass: string;
  }> = [
    { key: 'H', label: STATUS_LABELS.H, value: counts.H, colorClass: 'bg-[var(--h)]' },
    { key: 'S', label: STATUS_LABELS.S, value: counts.S, colorClass: 'bg-[var(--s)]' },
    { key: 'I', label: STATUS_LABELS.I, value: counts.I, colorClass: 'bg-[var(--i)]' },
    { key: 'A', label: STATUS_LABELS.A, value: counts.A, colorClass: 'bg-[var(--a)]' },
    { key: 'B', label: 'Belum diinput', value: blank, colorClass: 'bg-[var(--ln)]' },
  ];

  return (
    <div className="space-y-4">
      {missingCount > 0 && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--a)]/35 bg-[var(--ab)] px-4 py-3"
        >
          <div className="flex items-center gap-2.5 text-sm">
            <AlertTriangle className="w-4 h-4 text-[var(--a)] shrink-0" aria-hidden="true" />
            <span>
              <strong className="font-bold text-[var(--a)]">
                {missingCount} surat kurang
              </strong>{' '}
              — Ada siswa sakit lebih dari 1 hari atau izin yang belum melampirkan foto surat.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('surat')}
            className="rounded-lg bg-[var(--a-btn)] text-white px-3 py-1.5 text-xs font-semibold hover:brightness-105 transition cursor-pointer whitespace-nowrap"
          >
            Lengkapi surat
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Dashboard Kehadiran
          </h1>
          <p className="text-sm text-[var(--mu)]">{formatLongDate(todayStr)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('input')}
            className="min-h-[40px] rounded-lg bg-[var(--pri-btn)] text-white px-4 py-2 text-sm font-semibold hover:brightness-105 transition cursor-pointer whitespace-nowrap"
          >
            Input Absensi
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('rekap')}
            className="min-h-[40px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] text-[var(--ink)] px-4 py-2 text-sm font-semibold hover:bg-[var(--sf2)] transition cursor-pointer whitespace-nowrap"
          >
            Lihat Rekap
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[var(--sf)] border border-[var(--ln)] rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-[var(--mu)]">
            Total Siswa Aktif
          </div>
          <div className="text-2xl font-extrabold tracking-tight mt-1 font-mono-num">
            {total}
          </div>
          <div className="text-xs text-[var(--mu)] mt-0.5">
            {core.c.length} rombongan belajar
          </div>
        </div>

        <div className="bg-[var(--sf)] border border-[var(--ln)] rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-[var(--mu)]">
            Tingkat Hadir Hari Ini
          </div>
          <div className="text-2xl font-extrabold tracking-tight mt-1 text-[var(--h)] font-mono-num">
            {attendancePct}
          </div>
          <div className="text-xs text-[var(--mu)] mt-0.5">
            {counts.H} hadir dari {filled} terinput
          </div>
        </div>

        <div className="bg-[var(--sf)] border border-[var(--ln)] rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-[var(--mu)]">
            Surat Perlu Dilengkapi
          </div>
          <div
            className={`text-2xl font-extrabold tracking-tight mt-1 font-mono-num ${
              missingCount > 0 ? 'text-[var(--a)]' : 'text-[var(--ink)]'
            }`}
          >
            {missingCount}
          </div>
          <div className="text-xs text-[var(--mu)] mt-0.5">
            {missingCount > 0 ? 'Menunggu foto susulan' : 'Semua surat lengkap'}
          </div>
        </div>

        <div className="bg-[var(--sf)] border border-[var(--ln)] rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-[var(--mu)]">
            Belum Diinput Hari Ini
          </div>
          <div className="text-2xl font-extrabold tracking-tight mt-1 font-mono-num">
            {blank}
          </div>
          <div className="text-xs text-[var(--mu)] mt-0.5">
            {blank > 0 ? 'Siswa belum diabsen' : 'Seluruh kelas sudah diabsen'}
          </div>
        </div>
      </div>

      <section className="bg-[var(--sf)] border border-[var(--ln)] rounded-xl p-4 sm:p-5 shadow-sm">
        <h2 className="text-base font-bold">Komposisi Kehadiran Hari Ini</h2>
        <div
          role="img"
          aria-label="Komposisi kehadiran hari ini"
          className="flex h-4 rounded-md overflow-hidden bg-[var(--ln2)] my-3.5 gap-0.5"
        >
          {segments.map((seg) =>
            seg.value > 0 ? (
              <div
                key={seg.key}
                className={`${seg.colorClass} transition-all duration-300`}
                style={{ width: `${(seg.value / total) * 100}%` }}
                title={`${seg.label}: ${seg.value}`}
              />
            ) : null
          )}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {segments.map((seg) => (
            <div key={seg.key} className="inline-flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-xs ${seg.colorClass}`}
                aria-hidden="true"
              />
              <span className="text-[var(--ink)]">
                {seg.label}{' '}
                <strong className="font-bold font-mono-num">{seg.value}</strong>{' '}
                <span className="text-[var(--mu)] text-xs font-mono-num">
                  ({Math.round((seg.value / total) * 100)}%)
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="bg-[var(--sf)] border border-[var(--ln)] rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--sf2)] border-b border-[var(--ln2)] text-xs font-bold text-[var(--mu)]">
              <th className="text-left px-4 py-3">Kelas &amp; Wali</th>
              <th className="text-right px-4 py-3">Siswa</th>
              <th className="text-right px-4 py-3">Hadir</th>
              <th className="text-right px-4 py-3">Sakit</th>
              <th className="text-right px-4 py-3">Izin</th>
              <th className="text-right px-4 py-3">Alpa</th>
              <th className="text-left px-4 py-3">Status Hari Ini</th>
              <th className="text-right px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ln2)]">
            {core.c.map((cl) => {
              const students = core.st.filter((s) => s.c === cl.id);
              const cc = { H: 0, S: 0, I: 0, A: 0, B: 0 };
              students.forEach((s) => {
                const v = getStatus(months, s.id, todayStr);
                if (v) cc[v]++;
                else cc.B++;
              });
              const wali = core.t.find((t) => t.id === cl.w)?.n || '-';

              return (
                <tr key={cl.id} className="hover:bg-[var(--pri-b)]/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold">{cl.n}</div>
                    <div className="text-xs text-[var(--mu)]">Wali: {wali}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono-num">{students.length}</td>
                  <td className="px-4 py-3 text-right font-mono-num font-semibold text-[var(--h)]">
                    {cc.H}
                  </td>
                  <td className="px-4 py-3 text-right font-mono-num">{cc.S}</td>
                  <td className="px-4 py-3 text-right font-mono-num">{cc.I}</td>
                  <td className="px-4 py-3 text-right font-mono-num">{cc.A}</td>
                  <td className="px-4 py-3">
                    {cc.B > 0 ? (
                      <span className="inline-block rounded-md px-2 py-0.5 text-xs font-semibold bg-[var(--sb)] text-[var(--s)]">
                        {cc.B} belum
                      </span>
                    ) : (
                      <span className="inline-block rounded-md px-2 py-0.5 text-xs font-semibold bg-[var(--hb)] text-[var(--h)]">
                        Lengkap
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onQuickInputClass(cl.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--sf2)] transition cursor-pointer whitespace-nowrap"
                    >
                      <span>Input</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
