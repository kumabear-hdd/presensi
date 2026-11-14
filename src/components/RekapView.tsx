import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Printer } from 'lucide-react';
import type { CoreData, MonthMap, RecapPeriod } from '../types/sims';
import {
  addDays,
  buildRecap,
  buildRecapTsv,
  dayLabel,
  formatDate,
  formatLocaleDate,
  formatLongDate,
  formatPercent,
  getClassName,
  getJakartaNow,
  pad2,
  parseDate,
  shiftMonth,
} from '../utils/simsLogic';

interface RekapViewProps {
  core: CoreData;
  months: MonthMap;
  todayStr: string;
  onNotify: (text: string, bad?: boolean) => void;
}

const PERIOD_OPTIONS: Array<{ id: RecapPeriod; label: string }> = [
  { id: 'day', label: 'Harian' },
  { id: 'week', label: 'Mingguan' },
  { id: 'month', label: 'Bulanan' },
];

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.cssText = 'position:fixed;opacity:0';
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

export const RekapView: React.FC<RekapViewProps> = ({
  core,
  months,
  todayStr,
  onNotify,
}) => {
  const [period, setPeriod] = useState<RecapPeriod>('week');
  const [classId, setClassId] = useState(0);
  const [refDate, setRefDate] = useState(todayStr);

  if (!core.st.length) {
    return (
      <section className="bg-[var(--sf)] border border-[var(--ln)] rounded-xl p-8 shadow-sm">
        <h1 className="text-xl font-extrabold tracking-tight">Rekap Absensi</h1>
        <p className="text-sm text-[var(--mu)] mt-1.5">
          Belum ada siswa. Tambahkan data terlebih dahulu di menu Data.
        </p>
      </section>
    );
  }

  const recap = buildRecap(core, months, classId, refDate, period);
  const s = core.s;
  const now = getJakartaNow();
  const shortDate = (idx: number) =>
    formatLocaleDate(recap.W[idx], {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  const monthYm = refDate.slice(0, 7);
  const monthLabel = formatLocaleDate(`${monthYm}-01`, {
    month: 'long',
    year: 'numeric',
  });
  const scopeLabel = classId ? getClassName(core, classId) : 'Seluruh Siswa Sekolah';

  const headingTitle =
    period === 'day'
      ? 'Rekap Absensi Harian'
      : period === 'month'
        ? 'Rekap Absensi Bulanan'
        : 'Rekap Absensi Mingguan';
  const categoryLabel =
    period === 'day'
      ? 'Laporan Harian'
      : period === 'month'
        ? 'Laporan Bulanan'
        : 'Laporan Mingguan';
  const periodSubtitle =
    period === 'day'
      ? formatLongDate(recap.W[0])
      : period === 'month'
        ? `${monthLabel} (${recap.W.length} hari sekolah)`
        : `${shortDate(0)} – ${shortDate(recap.W.length - 1)}`;
  const sheetPeriodCell =
    period === 'day'
      ? `Harian (${formatLongDate(recap.W[0])})`
      : period === 'month'
        ? `Bulanan (${monthLabel})`
        : `Mingguan (${shortDate(0)} - ${shortDate(recap.W.length - 1)})`;

  const navLabels =
    period === 'day'
      ? { prev: 'Hari lalu', current: 'Hari ini' }
      : period === 'month'
        ? { prev: 'Bulan lalu', current: 'Bulan ini' }
        : { prev: 'Minggu lalu', current: 'Minggu ini' };

  const handleStep = (delta: number) => {
    if (period === 'day') {
      setRefDate(formatDate(addDays(parseDate(refDate), delta)));
    } else if (period === 'month') {
      setRefDate(`${shiftMonth(monthYm, delta)}-01`);
    } else {
      setRefDate(formatDate(addDays(parseDate(refDate), delta * 7)));
    }
  };

  const signatories = [
    ['Mengetahui / Mengesahkan:', 'Kepala Sekolah,', s.kepsek],
    ['Diverifikasi Oleh:', 'Wakil Kesiswaan,', s.wakasek],
    ['Disusun Oleh (Putra):', 'Wali Kelas / Koordinator Ikhwan,', s.ikhwan],
    ['Disusun Oleh (Putri):', 'Wali Kelas / Koordinator Akhwat,', s.akhwat],
  ] as const;

  const handleCopy = async () => {
    const tsv = buildRecapTsv(core, recap, period);
    const ok = await copyTextToClipboard(tsv);
    onNotify(
      ok
        ? 'Tabel disalin. Tempel di Excel atau Google Sheets (NIS tetap utuh).'
        : 'Gagal menyalin. Izinkan akses clipboard di browser.',
      !ok
    );
  };

  const sheetClass =
    period === 'month'
      ? 'sims-sheet is-monthly shadow-sm'
      : period === 'day'
        ? 'sims-sheet is-daily shadow-sm'
        : 'sims-sheet shadow-sm';

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{headingTitle}</h1>
          <p className="text-sm text-[var(--mu)]">
            Periode {periodSubtitle} · {scopeLabel}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-1.5 min-h-[40px] rounded-lg bg-[var(--pri-btn)] text-white px-4 py-2 text-sm font-semibold hover:brightness-105 transition cursor-pointer whitespace-nowrap"
          >
            <Copy className="w-4 h-4" aria-hidden="true" />
            <span>Salin ke Excel/Sheets</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 min-h-[40px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] text-[var(--ink)] px-4 py-2 text-sm font-semibold hover:bg-[var(--sf2)] transition cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            <span>Cetak Laporan (A4)</span>
          </button>
        </div>
      </div>

      <div className="no-print flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[var(--mu)]">Periode Rekap</span>
          <div
            role="tablist"
            aria-label="Periode rekap"
            className="inline-flex min-h-[40px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] p-1 gap-1"
          >
            {PERIOD_OPTIONS.map((opt) => {
              const active = period === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPeriod(opt.id)}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[var(--pri-btn)] text-white shadow-xs'
                      : 'text-[var(--mu)] hover:text-[var(--ink)] hover:bg-[var(--sf2)]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--mu)]">
          Kelas
          <select
            value={classId}
            onChange={(e) => setClassId(Number(e.target.value))}
            className="min-h-[40px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-2 text-sm text-[var(--ink)]"
          >
            <option value={0}>Seluruh siswa</option>
            {core.c.map((c) => (
              <option key={c.id} value={c.id}>
                {c.n}
              </option>
            ))}
          </select>
        </label>

        {period === 'month' ? (
          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--mu)]">
            Bulan
            <input
              type="month"
              value={monthYm}
              onChange={(e) => {
                if (e.target.value) setRefDate(`${e.target.value}-01`);
              }}
              className="min-h-[40px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-2 text-sm text-[var(--ink)]"
            />
          </label>
        ) : (
          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--mu)]">
            {period === 'day' ? 'Tanggal' : 'Minggu yang memuat tanggal'}
            <input
              type="date"
              value={refDate}
              onChange={(e) => {
                if (e.target.value) setRefDate(e.target.value);
              }}
              className="min-h-[40px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-2 text-sm text-[var(--ink)]"
            />
          </label>
        )}

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => handleStep(-1)}
            className="inline-flex items-center gap-1 min-h-[40px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] text-[var(--ink)] px-3 py-2 text-sm font-semibold hover:bg-[var(--sf2)] transition cursor-pointer whitespace-nowrap"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            <span>{navLabels.prev}</span>
          </button>
          <button
            type="button"
            onClick={() => setRefDate(todayStr)}
            className="min-h-[40px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] text-[var(--ink)] px-3 py-2 text-sm font-semibold hover:bg-[var(--sf2)] transition cursor-pointer whitespace-nowrap"
          >
            {navLabels.current}
          </button>
          <button
            type="button"
            onClick={() => handleStep(1)}
            className="inline-flex items-center gap-1 min-h-[40px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] text-[var(--ink)] px-3 py-2 text-sm font-semibold hover:bg-[var(--sf2)] transition cursor-pointer whitespace-nowrap"
          >
            <span>Berikutnya</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className={sheetClass}>
        <div className="kop">
          <b>{s.nama || 'Nama sekolah belum diisi'}</b>
          <div>{s.alamat}</div>
        </div>

        <table className="inf">
          <tbody>
            <tr>
              <td>Jenis Pos</td>
              <td>Presensi Harian Seluruh Siswa Sekolah (Bukan Per-Mapel)</td>
              <td>Tahun Ajaran</td>
              <td>{s.tahun || '-'}</td>
            </tr>
            <tr>
              <td>Kategori</td>
              <td>{categoryLabel}</td>
              <td>Cakupan</td>
              <td>{scopeLabel}</td>
            </tr>
            <tr>
              <td>Periode</td>
              <td>{sheetPeriodCell}</td>
              <td>Tanggal Cetak</td>
              <td>
                {formatLongDate(formatDate(now))} (Pukul {pad2(now.getHours())}.
                {pad2(now.getMinutes())}.{pad2(now.getSeconds())} WIB)
              </td>
            </tr>
            <tr>
              <td>Sifat Dokumen</td>
              <td>DOKUMEN RESMI TATA USAHA &amp; KESISWAAN</td>
              <td>Status Verifikasi</td>
              <td>TERVERIFIKASI SISTEM SIMS</td>
            </tr>
          </tbody>
        </table>

        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>NIS</th>
              <th>Nama Siswa</th>
              <th>L/P</th>
              <th>Ruangan Kelas</th>
              {recap.W.map((d) =>
                period === 'month' ? (
                  <th key={d} className="col-day" title={dayLabel(d)}>
                    <div>{Number(d.slice(8))}</div>
                    <div className="text-[10px] font-normal opacity-85">
                      {dayLabel(d).split(' ')[0]}
                    </div>
                  </th>
                ) : (
                  <th key={d}>{dayLabel(d)}</th>
                )
              )}
              <th>Hadir (H)</th>
              <th>Sakit (S)</th>
              <th>Izin (I)</th>
              <th>Alpa (A)</th>
              <th>Total Hari</th>
              <th>% Kehadiran</th>
            </tr>
          </thead>
          <tbody>
            {recap.rows.map((r, idx) => (
              <tr key={r.s.id}>
                <td>{idx + 1}</td>
                <td className="whitespace-nowrap">{r.s.nis}</td>
                <td className="l whitespace-nowrap">{r.s.n}</td>
                <td>{r.s.g || '-'}</td>
                <td className="whitespace-nowrap">{getClassName(core, r.s.c)}</td>
                {r.v.map((val, di) => (
                  <td key={recap.W[di]} className={val ? `st-${val}` : 'st-z'}>
                    {val || '-'}
                  </td>
                ))}
                <td>{r.c.H}</td>
                <td>{r.c.S}</td>
                <td>{r.c.I}</td>
                <td>{r.c.A}</td>
                <td>{r.t}</td>
                <td>{formatPercent(r.p)}</td>
              </tr>
            ))}
            <tr className="tot">
              <td>RATA-RATA</td>
              <td>{recap.rows.length} Siswa</td>
              <td className="l">Akumulasi Keseluruhan Siswa</td>
              <td>-</td>
              <td>-</td>
              {recap.W.map((d) => (
                <td key={d}>-</td>
              ))}
              <td>{recap.T2.H}</td>
              <td>{recap.T2.S}</td>
              <td>{recap.T2.I}</td>
              <td>{recap.T2.A}</td>
              <td>{recap.days}</td>
              <td>{formatPercent(recap.p)}</td>
            </tr>
          </tbody>
        </table>

        <h4 className="text-center">
          LEMBAR PENGESAHAN LAPORAN PRESENSI SISWA SEKOLAH
        </h4>
        <p className="text-center">
          <i>
            Ditetapkan di: {s.kota || '-'} | Pada Tanggal:{' '}
            {formatLongDate(formatDate(now))}
          </i>
        </p>
        <div className="sgs">
          {signatories.map(([line1, line2, person]) => (
            <div key={line2}>
              <div>{line1}</div>
              <b>{line2}</b>
              <div className="sp" />
              <u>
                <b>{person.n || '(nama belum diisi)'}</b>
              </u>
              <div>{person.nip ? `NIP. ${person.nip}` : ''}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
