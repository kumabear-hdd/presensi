import React, { useState } from 'react';
import { Pencil, Search, Trash2 } from 'lucide-react';
import type { CoreData, DataSubTab, Student } from '../types/sims';
import { getClassName, normalizeText } from '../utils/simsLogic';

interface DataViewProps {
  core: CoreData;
  onAddStudent: (name: string, nis: string, className: string, gender: string) => void;
  onBulkAddStudents: (className: string, waliName: string, text: string) => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (studentId: number) => void;
  onAddTeacher: (name: string, nip: string, className: string) => void;
  onBulkAddTeachers: (text: string) => void;
  onDeleteTeacher: (teacherId: number) => void;
  onRenameClass: (classId: number, newName: string) => void;
  onChangeClassWali: (classId: number, waliName: string) => void;
  onDeleteClass: (classId: number) => void;
}

export const DataView: React.FC<DataViewProps> = ({
  core,
  onAddStudent,
  onBulkAddStudents,
  onEditStudent,
  onDeleteStudent,
  onAddTeacher,
  onBulkAddTeachers,
  onDeleteTeacher,
  onRenameClass,
  onChangeClassWali,
  onDeleteClass,
}) => {
  const [subTab, setSubTab] = useState<DataSubTab>('st');
  const [pendingDelete, setPendingDelete] = useState<string>('');

  // Student single & bulk state
  const [sName, setSName] = useState('');
  const [sNis, setSNis] = useState('');
  const [sClass, setSClass] = useState('');
  const [sGender, setSGender] = useState('');
  const [bClass, setBClass] = useState('');
  const [bWali, setBWali] = useState('');
  const [bText, setBText] = useState('');
  const [filterClassId, setFilterClassId] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Teacher single & bulk state
  const [tName, setTName] = useState('');
  const [tNip, setTNip] = useState('');
  const [tClass, setTClass] = useState('');
  const [tBulk, setTBulk] = useState('');

  const handleDeleteClick = (type: 's' | 'g' | 'c', id: number) => {
    const key = `${type}-${id}`;
    if (pendingDelete !== key) {
      setPendingDelete(key);
      return;
    }
    setPendingDelete('');
    if (type === 's') onDeleteStudent(id);
    else if (type === 'g') onDeleteTeacher(id);
    else onDeleteClass(id);
  };

  const q = normalizeText(searchQuery);
  const visibleStudents = core.st
    .filter(
      (s) =>
        (!filterClassId || s.c === filterClassId) &&
        (!q || normalizeText(s.n).includes(q) || s.nis.toLowerCase().includes(q))
    )
    .slice()
    .sort(
      (a, b) =>
        getClassName(core, a.c).localeCompare(getClassName(core, b.c)) ||
        a.nis.localeCompare(b.nis)
    );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Data Siswa, Guru, &amp; Kelas
        </h1>
        <p className="text-sm text-[var(--mu)]">
          Kelola master data sekolah Anda.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Submenu data master"
        className="inline-flex rounded-lg border border-[var(--ln)] bg-[var(--sf2)] p-1 gap-1"
      >
        {(
          [
            ['st', `Siswa (${core.st.length})`],
            ['gr', `Guru (${core.t.length})`],
            ['kl', `Kelas (${core.c.length})`],
          ] as Array<[DataSubTab, string]>
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={subTab === k}
            onClick={() => {
              setSubTab(k);
              setPendingDelete('');
            }}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              subTab === k
                ? 'bg-[var(--sf)] text-[var(--ink)] shadow-xs'
                : 'text-[var(--mu)] hover:text-[var(--ink)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <datalist id="cl">
        {core.c.map((c) => (
          <option key={c.id} value={c.n} />
        ))}
      </datalist>
      <datalist id="tl">
        {core.t.map((t) => (
          <option key={t.id} value={t.n} />
        ))}
      </datalist>

      {subTab === 'st' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <section className="bg-[var(--sf)] border border-[var(--ln)] rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
              <h2 className="text-base font-bold">Tambah Satu Siswa</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-[var(--mu)]">
                  Nama siswa
                  <input
                    value={sName}
                    onChange={(e) => setSName(e.target.value)}
                    placeholder="Contoh: Andi Pratama"
                    className="mt-1 w-full min-h-[38px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-1.5 text-sm text-[var(--ink)]"
                  />
                </label>
                <label className="text-xs font-semibold text-[var(--mu)]">
                  NIS (kosongkan = otomatis)
                  <input
                    value={sNis}
                    onChange={(e) => setSNis(e.target.value)}
                    placeholder="26001001"
                    className="mt-1 w-full min-h-[38px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-1.5 text-sm text-[var(--ink)]"
                  />
                </label>
                <label className="text-xs font-semibold text-[var(--mu)]">
                  Kelas (ketik atau pilih)
                  <input
                    list="cl"
                    value={sClass}
                    onChange={(e) => setSClass(e.target.value)}
                    placeholder="X Ikhwan 1"
                    className="mt-1 w-full min-h-[38px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-1.5 text-sm text-[var(--ink)]"
                  />
                </label>
                <label className="text-xs font-semibold text-[var(--mu)]">
                  L/P
                  <select
                    value={sGender}
                    onChange={(e) => setSGender(e.target.value)}
                    className="mt-1 w-full min-h-[38px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-1.5 text-sm text-[var(--ink)]"
                  >
                    <option value="">Otomatis dari kelas</option>
                    <option value="L">L</option>
                    <option value="P">P</option>
                  </select>
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  onAddStudent(sName, sNis, sClass, sGender);
                  if (sName.trim() && sClass.trim()) {
                    setSName('');
                    setSNis('');
                  }
                }}
                className="min-h-[38px] rounded-lg bg-[var(--pri-btn)] text-white px-4 py-2 text-sm font-semibold hover:brightness-105 transition cursor-pointer"
              >
                Tambah siswa
              </button>
            </section>

            <section className="bg-[var(--sf)] border border-[var(--ln)] rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
              <h2 className="text-base font-bold">Tambah Massal</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-[var(--mu)]">
                  Kelas
                  <input
                    list="cl"
                    value={bClass}
                    onChange={(e) => setBClass(e.target.value)}
                    placeholder="X Ikhwan 1"
                    className="mt-1 w-full min-h-[38px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-1.5 text-sm text-[var(--ink)]"
                  />
                </label>
                <label className="text-xs font-semibold text-[var(--mu)]">
                  Wali kelas (opsional)
                  <input
                    list="tl"
                    value={bWali}
                    onChange={(e) => setBWali(e.target.value)}
                    placeholder="Nama wali kelas"
                    className="mt-1 w-full min-h-[38px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-1.5 text-sm text-[var(--ink)]"
                  />
                </label>
              </div>
              <label className="block text-xs text-[var(--mu)]">
                Satu siswa per baris: <strong>Nama</strong> atau{' '}
                <strong>Nama,NIS</strong> (boleh tambah <strong>,L</strong> atau{' '}
                <strong>,P</strong>). Gunakan titik koma (;) jika nama
                mengandung koma.
                <textarea
                  value={bText}
                  onChange={(e) => setBText(e.target.value)}
                  rows={4}
                  placeholder={'Andi Pratama\nBudi Santoso,26001002\nCitra Lestari,26001003,P'}
                  className="mt-1.5 w-full rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-2 text-sm text-[var(--ink)]"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  onBulkAddStudents(bClass, bWali, bText);
                  if (bClass.trim() && bText.trim()) setBText('');
                }}
                className="min-h-[38px] rounded-lg bg-[var(--pri-btn)] text-white px-4 py-2 text-sm font-semibold hover:brightness-105 transition cursor-pointer"
              >
                Tambah massal
              </button>
            </section>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--mu)]">
                Filter kelas
                <select
                  value={filterClassId}
                  onChange={(e) => setFilterClassId(Number(e.target.value))}
                  className="min-h-[40px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-2 text-sm text-[var(--ink)]"
                >
                  <option value={0}>Semua kelas ({core.st.length})</option>
                  {core.c.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.n}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--mu)]">
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
                    placeholder="Nama atau NIS..."
                    className="min-h-[40px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] pl-9 pr-3 py-2 text-sm text-[var(--ink)]"
                  />
                </div>
              </label>
            </div>
            <div className="text-xs text-[var(--mu)]">
              Menampilkan <strong className="font-mono-num">{visibleStudents.length}</strong> siswa
            </div>
          </div>

          <div className="bg-[var(--sf)] border border-[var(--ln)] rounded-xl overflow-x-auto shadow-sm">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--sf2)] border-b border-[var(--ln2)] text-xs font-bold text-[var(--mu)]">
                  <th className="text-left px-4 py-3">NIS</th>
                  <th className="text-left px-4 py-3">Nama</th>
                  <th className="text-left px-4 py-3">L/P</th>
                  <th className="text-left px-4 py-3">Kelas</th>
                  <th className="text-right px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ln2)]">
                {visibleStudents.map((s) => {
                  const delKey = `s-${s.id}`;
                  const confirming = pendingDelete === delKey;
                  return (
                    <tr key={s.id} className="hover:bg-[var(--pri-b)]/30">
                      <td className="px-4 py-2.5 text-[var(--mu)] font-mono-num">
                        {s.nis}
                      </td>
                      <td className="px-4 py-2.5 font-bold">{s.n}</td>
                      <td className="px-4 py-2.5">{s.g || '-'}</td>
                      <td className="px-4 py-2.5">{getClassName(core, s.c)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEditStudent(s)}
                            aria-label={`Edit ${s.n}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-2.5 py-1 text-xs font-semibold hover:bg-[var(--sf2)] transition cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" aria-hidden="true" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick('s', s.id)}
                            aria-label={`Hapus ${s.n}`}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                              confirming
                                ? 'bg-[var(--a-btn)] text-white'
                                : 'border border-[var(--ln)] bg-[var(--sf)] text-[var(--ink)] hover:bg-[var(--sf2)]'
                            }`}
                          >
                            <Trash2 className="w-3 h-3" aria-hidden="true" />
                            <span>{confirming ? 'Yakin hapus?' : 'Hapus'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!visibleStudents.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--mu)]">
                      Belum ada siswa yang sesuai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'gr' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <section className="bg-[var(--sf)] border border-[var(--ln)] rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
              <h2 className="text-base font-bold">Tambah Satu Guru</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-[var(--mu)]">
                  Nama guru
                  <input
                    value={tName}
                    onChange={(e) => setTName(e.target.value)}
                    placeholder="Ahmad Fauzi, S.Pd"
                    className="mt-1 w-full min-h-[38px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-1.5 text-sm text-[var(--ink)]"
                  />
                </label>
                <label className="text-xs font-semibold text-[var(--mu)]">
                  NIP (opsional)
                  <input
                    value={tNip}
                    onChange={(e) => setTNip(e.target.value)}
                    placeholder="198001012005..."
                    className="mt-1 w-full min-h-[38px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-1.5 text-sm text-[var(--ink)]"
                  />
                </label>
                <label className="sm:col-span-2 text-xs font-semibold text-[var(--mu)]">
                  Wali kelas untuk (opsional)
                  <input
                    list="cl"
                    value={tClass}
                    onChange={(e) => setTClass(e.target.value)}
                    placeholder="X Ikhwan 1"
                    className="mt-1 w-full min-h-[38px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-1.5 text-sm text-[var(--ink)]"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  onAddTeacher(tName, tNip, tClass);
                  if (tName.trim()) {
                    setTName('');
                    setTNip('');
                    setTClass('');
                  }
                }}
                className="min-h-[38px] rounded-lg bg-[var(--pri-btn)] text-white px-4 py-2 text-sm font-semibold hover:brightness-105 transition cursor-pointer"
              >
                Tambah guru
              </button>
            </section>

            <section className="bg-[var(--sf)] border border-[var(--ln)] rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
              <h2 className="text-base font-bold">Tambah Guru Massal</h2>
              <label className="block text-xs text-[var(--mu)]">
                Satu guru per baris: <strong>Nama</strong>,{' '}
                <strong>Nama,NIP</strong>, atau <strong>Nama,NIP,Kelas wali</strong>.
                Pakai titik koma (;) jika nama mengandung koma.
                <textarea
                  value={tBulk}
                  onChange={(e) => setTBulk(e.target.value)}
                  rows={4}
                  placeholder={'Ahmad Fauzi;198001012005;X Ikhwan 1\nSiti Aminah;;X Akhwat 1'}
                  className="mt-1.5 w-full rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-2 text-sm text-[var(--ink)]"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  onBulkAddTeachers(tBulk);
                  if (tBulk.trim()) setTBulk('');
                }}
                className="min-h-[38px] rounded-lg bg-[var(--pri-btn)] text-white px-4 py-2 text-sm font-semibold hover:brightness-105 transition cursor-pointer"
              >
                Tambah guru massal
              </button>
            </section>
          </div>

          <div className="bg-[var(--sf)] border border-[var(--ln)] rounded-xl overflow-x-auto shadow-sm">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--sf2)] border-b border-[var(--ln2)] text-xs font-bold text-[var(--mu)]">
                  <th className="text-left px-4 py-3">Nama Guru</th>
                  <th className="text-left px-4 py-3">NIP</th>
                  <th className="text-left px-4 py-3">Wali Kelas</th>
                  <th className="text-right px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ln2)]">
                {core.t.map((t) => {
                  const delKey = `g-${t.id}`;
                  const confirming = pendingDelete === delKey;
                  const waliOf = core.c
                    .filter((c) => c.w === t.id)
                    .map((c) => c.n)
                    .join(', ');

                  return (
                    <tr key={t.id} className="hover:bg-[var(--pri-b)]/30">
                      <td className="px-4 py-2.5 font-bold">{t.n}</td>
                      <td className="px-4 py-2.5 text-[var(--mu)] font-mono-num">
                        {t.nip || '-'}
                      </td>
                      <td className="px-4 py-2.5">{waliOf || '-'}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteClick('g', t.id)}
                          aria-label={`Hapus ${t.n}`}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                            confirming
                              ? 'bg-[var(--a-btn)] text-white'
                              : 'border border-[var(--ln)] bg-[var(--sf)] text-[var(--ink)] hover:bg-[var(--sf2)]'
                          }`}
                        >
                          <Trash2 className="w-3 h-3" aria-hidden="true" />
                          <span>{confirming ? 'Yakin hapus?' : 'Hapus'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!core.t.length && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[var(--mu)]">
                      Belum ada guru.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'kl' && (
        <div className="space-y-4">
          <div className="bg-[var(--sf)] border border-[var(--ln)] rounded-xl p-4 text-sm text-[var(--mu)] shadow-sm">
            Ketik langsung lalu keluar dari kolom untuk mengubah nama kelas atau
            wali kelas. Kelas baru dibuat otomatis saat Anda menambahkan siswa
            atau guru.
          </div>

          <div className="bg-[var(--sf)] border border-[var(--ln)] rounded-xl overflow-x-auto shadow-sm">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--sf2)] border-b border-[var(--ln2)] text-xs font-bold text-[var(--mu)]">
                  <th className="text-left px-4 py-3">Nama Kelas</th>
                  <th className="text-left px-4 py-3">Wali Kelas</th>
                  <th className="text-left px-4 py-3">Jumlah Siswa</th>
                  <th className="text-right px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ln2)]">
                {core.c.map((c) => {
                  const count = core.st.filter((s) => s.c === c.id).length;
                  const waliName = core.t.find((t) => t.id === c.w)?.n || '';
                  const delKey = `c-${c.id}`;
                  const confirming = pendingDelete === delKey;

                  return (
                    <tr key={c.id} className="hover:bg-[var(--pri-b)]/30">
                      <td className="px-4 py-2.5">
                        <input
                          defaultValue={c.n}
                          key={`cn-${c.id}-${c.n}`}
                          aria-label={`Nama kelas ${c.n}`}
                          onBlur={(e) => {
                            if (e.target.value.trim() !== c.n) {
                              onRenameClass(c.id, e.target.value);
                            }
                          }}
                          className="w-full min-w-[140px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-2.5 py-1.5 text-sm font-medium"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          list="tl"
                          defaultValue={waliName}
                          key={`cw-${c.id}-${waliName}`}
                          aria-label={`Wali kelas ${c.n}`}
                          placeholder="Pilih atau ketik nama guru"
                          onBlur={(e) => {
                            if (e.target.value.trim() !== waliName) {
                              onChangeClassWali(c.id, e.target.value);
                            }
                          }}
                          className="w-full min-w-[170px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-2.5 py-1.5 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2.5 font-mono-num">
                        <strong>{count}</strong> siswa
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {count > 0 ? (
                          <span className="text-xs text-[var(--mu)]">
                            Kosongkan siswa dulu
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteClick('c', c.id)}
                            aria-label={`Hapus kelas ${c.n}`}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                              confirming
                                ? 'bg-[var(--a-btn)] text-white'
                                : 'border border-[var(--ln)] bg-[var(--sf)] text-[var(--ink)] hover:bg-[var(--sf2)]'
                            }`}
                          >
                            <Trash2 className="w-3 h-3" aria-hidden="true" />
                            <span>{confirming ? 'Yakin hapus?' : 'Hapus'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!core.c.length && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[var(--mu)]">
                      Belum ada kelas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
