import React, { useEffect, useState } from 'react';
import { CheckCircle2, Search, Upload } from 'lucide-react';
import type { CoreData, MonthMap, SuratFilter } from '../types/sims';
import {
  collectDocEntries,
  consecutiveSickDays,
  formatShortDate,
  getClassName,
  getMissingDocs,
  getStatus,
  normalizeText,
  PHOTO_PLACEHOLDER,
} from '../utils/simsLogic';

interface SuratViewProps {
  core: CoreData;
  months: MonthMap;
  photoCache: Record<string, string>;
  onLoadPhoto: (pid: string) => Promise<string | null>;
  onUploadFollowUp: (entryKey: string, file: File) => Promise<void>;
  onVerify: (entryKey: string) => void;
  onPreviewPhoto: (pid: string | undefined, caption: string) => void;
}

export const SuratView: React.FC<SuratViewProps> = ({
  core,
  months,
  photoCache,
  onLoadPhoto,
  onUploadFollowUp,
  onVerify,
  onPreviewPhoto,
}) => {
  const [filter, setFilter] = useState<SuratFilter>('miss');
  const [searchQuery, setSearchQuery] = useState('');

  const missingCount = getMissingDocs(months).length;
  const entries = collectDocEntries(months, (x) =>
    filter === 'miss'
      ? x.ds === 'MISSING'
      : x.ds === 'UPLOADED' || x.ds === 'VERIFIED'
  ).sort((a, b) => b[0].split('|')[1].localeCompare(a[0].split('|')[1]));

  const q = normalizeText(searchQuery);
  const filtered = entries.filter(([key]) => {
    const [sidStr] = key.split('|');
    const student = core.st.find((s) => s.id === Number(sidStr));
    if (!student) return false;
    if (!q) return true;
    return (
      normalizeText(student.n).includes(q) ||
      normalizeText(getClassName(core, student.c)).includes(q)
    );
  });

  useEffect(() => {
    if (filter !== 'arc') return;
    filtered.forEach(([, x]) => {
      if (x.p && !photoCache[x.p]) {
        void onLoadPhoto(x.p);
      }
    });
  }, [filter, filtered, photoCache, onLoadPhoto]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Manajemen Surat</h1>
        <p className="text-sm text-[var(--mu)]">
          Kelola bukti surat izin &amp; surat keterangan dokter siswa.
        </p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div
          role="tablist"
          aria-label="Filter status surat"
          className="inline-flex rounded-lg border border-[var(--ln)] bg-[var(--sf2)] p-1 gap-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'miss'}
            onClick={() => setFilter('miss')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              filter === 'miss'
                ? 'bg-[var(--sf)] text-[var(--ink)] shadow-xs'
                : 'text-[var(--mu)] hover:text-[var(--ink)]'
            }`}
          >
            Perlu dilengkapi ({missingCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'arc'}
            onClick={() => setFilter('arc')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              filter === 'arc'
                ? 'bg-[var(--sf)] text-[var(--ink)] shadow-xs'
                : 'text-[var(--mu)] hover:text-[var(--ink)]'
            }`}
          >
            Arsip
          </button>
        </div>

        <label className="min-w-[220px] flex flex-col gap-1 text-xs font-semibold text-[var(--mu)]">
          Cari siswa / kelas
          <div className="relative">
            <Search
              className="w-4 h-4 text-[var(--mu)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau kelas..."
              className="w-full min-h-[40px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] pl-9 pr-3 py-2 text-sm text-[var(--ink)] font-medium focus:outline-none focus:border-[var(--pri)]"
            />
          </div>
        </label>
      </div>

      <div className="bg-[var(--sf)] border border-[var(--ln)] rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--sf2)] border-b border-[var(--ln2)] text-xs font-bold text-[var(--mu)]">
              <th className="text-left px-4 py-3">Siswa</th>
              <th className="text-left px-4 py-3">Tanggal</th>
              <th className="text-left px-4 py-3">Keterangan</th>
              <th className="text-left px-4 py-3">
                {filter === 'miss' ? 'Dokumen' : 'Foto Surat'}
              </th>
              <th className="text-left px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ln2)]">
            {filtered.map(([key, x]) => {
              const [sidStr, dateStr] = key.split('|');
              const student = core.st.find((s) => s.id === Number(sidStr));
              if (!student) return null;

              const status = getStatus(months, sidStr, dateStr);
              const streak =
                status === 'S'
                  ? consecutiveSickDays(months, sidStr, dateStr) + 1
                  : 0;
              const imgSrc = (x.p && photoCache[x.p]) || PHOTO_PLACEHOLDER;

              return (
                <tr key={key} className="hover:bg-[var(--pri-b)]/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold">{student.n}</div>
                    <div className="text-xs text-[var(--mu)]">
                      {getClassName(core, student.c)}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatShortDate(dateStr)}
                  </td>
                  <td className="px-4 py-3">
                    {status === 'I' ? (
                      <span className="inline-block rounded-md bg-[var(--ib)] text-[var(--i)] px-2 py-0.5 text-xs font-semibold">
                        Izin
                      </span>
                    ) : (
                      <span className="inline-block rounded-md bg-[var(--sb)] text-[var(--s)] px-2 py-0.5 text-xs font-semibold">
                        Sakit hari ke-{streak}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {filter === 'miss' ? (
                      <span className="inline-block rounded-md bg-[var(--ab)] border border-[var(--a)]/35 text-[var(--a)] px-2 py-0.5 text-xs font-bold">
                        Belum ada foto
                      </span>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            onPreviewPhoto(
                              x.p,
                              `${student.n}, ${formatShortDate(dateStr)}`
                            )
                          }
                          title="Perbesar foto surat"
                          className="p-0.5 border border-[var(--ln)] rounded-md bg-[var(--sf)] hover:scale-105 transition cursor-pointer shrink-0"
                        >
                          <img
                            src={imgSrc}
                            alt={`Foto surat ${student.n}`}
                            className="w-12 h-15 object-cover rounded-xs block"
                          />
                        </button>
                        <span className="text-xs text-[var(--mu)]">
                          {x.nm || 'foto-surat'}
                          {x.k ? ` · ${x.k} KB` : ''}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {filter === 'miss' ? (
                      <label className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-[var(--pri)] bg-[var(--pri-b)] text-[var(--pri)] px-2.5 py-1.5 text-xs font-semibold cursor-pointer hover:brightness-95 whitespace-nowrap">
                        <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Unggah susulan</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void onUploadFollowUp(key, file);
                          }}
                        />
                      </label>
                    ) : x.ds === 'VERIFIED' ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--hb)] text-[var(--h)] px-2.5 py-1 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Terverifikasi</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onVerify(key)}
                        className="rounded-lg bg-[var(--pri-btn)] text-white px-3 py-1.5 text-xs font-semibold hover:brightness-105 transition cursor-pointer whitespace-nowrap"
                      >
                        Verifikasi
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {!filtered.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--mu)]">
                  {filter === 'miss'
                    ? 'Semua surat sudah lengkap.'
                    : 'Belum ada surat di arsip.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
