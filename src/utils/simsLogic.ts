import type {
  AttendanceStatus,
  ClassRoom,
  CoreData,
  DraftRow,
  ExtraEntry,
  MonthData,
  MonthMap,
  RecapResult,
  Student,
  Teacher,
} from '../types/sims';

export const STATUS_LABELS: Record<'H' | 'S' | 'I' | 'A', string> = {
  H: 'Hadir',
  S: 'Sakit',
  I: 'Izin',
  A: 'Alpa',
};

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const PHOTO_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150"><rect width="120" height="150" fill="#f4f1e8"/><path d="M18 24h84M18 44h84M18 64h60M18 84h84M18 104h50" stroke="#9aa" stroke-width="3"/><text x="60" y="136" font-size="11" text-anchor="middle" fill="#667" font-family="sans-serif">Memuat foto</text></svg>'
  );

export const pad2 = (n: number): string => String(n).padStart(2, '0');

export const formatDate = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const parseDate = (s: string): Date => {
  const [a, b, c] = s.split('-');
  return new Date(Number(a), Number(b) - 1, Number(c));
};

export const addDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const isWeekday = (d: Date): boolean => d.getDay() % 6 !== 0;

export const prevSchoolDay = (d: Date): Date => {
  let x = addDays(d, -1);
  while (!isWeekday(x)) x = addDays(x, -1);
  return x;
};

export const normalizeText = (s: string): string =>
  s.trim().replace(/\s+/g, ' ').toLowerCase();

export const getJakartaNow = (now: Date = new Date()): Date =>
  new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));

export const getDefaultSchoolDate = (now: Date = new Date()): string => {
  let d = getJakartaNow(now);
  d.setHours(0, 0, 0, 0);
  while (!isWeekday(d)) d = addDays(d, -1);
  return formatDate(d);
};

export const formatLocaleDate = (
  dateStr: string,
  options: Intl.DateTimeFormatOptions
): string => parseDate(dateStr).toLocaleDateString('id-ID', options);

export const formatLongDate = (dateStr: string): string =>
  formatLocaleDate(dateStr, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export const formatShortDate = (dateStr: string): string =>
  formatLocaleDate(dateStr, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

export const dayLabel = (dateStr: string): string => {
  const x = parseDate(dateStr);
  return `${DAY_NAMES[x.getDay()]} ${x.getDate()}/${x.getMonth() + 1}`;
};

export const formatPercent = (p: number | null): string =>
  p === null ? '-' : `${+p.toFixed(1)}%`;

export const createEmptyCoreData = (): CoreData => ({
  s: {
    nama: '',
    alamat: '',
    kota: '',
    tahun: '',
    kepsek: { n: '', nip: '' },
    wakasek: { n: '', nip: '' },
    ikhwan: { n: '', nip: '' },
    akhwat: { n: '', nip: '' },
  },
  c: [],
  t: [],
  st: [],
  q: 1,
});

export const getMonthKey = (dateStr: string): string => dateStr.slice(0, 7);

export const ensureMonth = (months: MonthMap, dateStr: string): MonthData => {
  const key = getMonthKey(dateStr);
  if (!months[key]) months[key] = { a: {}, x: {} };
  return months[key];
};

export const getStatus = (
  months: MonthMap,
  studentId: number | string,
  dateStr: string
): AttendanceStatus => {
  const row = months[getMonthKey(dateStr)]?.a[String(studentId)];
  const ch = row ? row[Number(dateStr.slice(8)) - 1] : '';
  return ch && ch !== '.' ? (ch as AttendanceStatus) : '';
};

export const getExtra = (
  months: MonthMap,
  studentId: number | string,
  dateStr: string
): ExtraEntry => months[getMonthKey(dateStr)]?.x[`${studentId}|${dateStr}`] || {};

export const collectDocEntries = (
  months: MonthMap,
  predicate: (x: ExtraEntry) => boolean
): Array<[string, ExtraEntry]> =>
  Object.values(months).flatMap((m) =>
    Object.entries(m.x).filter(([, x]) => predicate(x))
  );

export const getMissingDocs = (months: MonthMap): Array<[string, ExtraEntry]> =>
  collectDocEntries(months, (x) => x.ds === 'MISSING');

export const needsLetter = (
  status: AttendanceStatus,
  sickDayStreak: number
): boolean => status === 'I' || (status === 'S' && sickDayStreak > 1);

export const consecutiveSickDays = (
  months: MonthMap,
  studentId: number | string,
  dateStr: string
): number => {
  let n = 0;
  let x = prevSchoolDay(parseDate(dateStr));
  while (getStatus(months, studentId, formatDate(x)) === 'S' && n < 40) {
    n++;
    x = prevSchoolDay(x);
  }
  return n;
};

export const getClassName = (core: CoreData, classId: number): string =>
  core.c.find((c) => c.id === classId)?.n || '';

export const ensureClass = (core: CoreData, name: string): ClassRoom => {
  const clean = name.trim().replace(/\s+/g, ' ');
  const existing = core.c.find((c) => normalizeText(c.n) === normalizeText(clean));
  if (existing) return existing;
  const created: ClassRoom = { id: core.q++, n: clean, w: null };
  core.c.push(created);
  return created;
};

export const ensureTeacher = (
  core: CoreData,
  name: string,
  nip?: string
): Teacher => {
  const existing = core.t.find((t) => normalizeText(t.n) === normalizeText(name));
  if (existing) return existing;
  const created: Teacher = { id: core.q++, n: name.trim(), nip: nip || '' };
  core.t.push(created);
  return created;
};

export const inferGender = (className: string): 'L' | 'P' | '' =>
  /akhwat|putri|perempuan/i.test(className)
    ? 'P'
    : /ikhwan|putra|laki/i.test(className)
      ? 'L'
      : '';

export const generateAutoNis = (core: CoreData): string => {
  let nis: string;
  do {
    nis = '26' + String(core.q++).padStart(6, '0');
  } while (core.st.some((s) => s.nis === nis));
  return nis;
};

export const parseBulkLine = (line: string): string[] => {
  const trimmed = line.replace(/^[(\[]\s*|\s*[)\]]$/g, '');
  return (/[;\t|]/.test(trimmed) ? trimmed.split(/[;\t|]/) : trimmed.split(',')).map(
    (x) => x.trim()
  );
};

export const putAttendance = (
  months: MonthMap,
  studentId: number | string,
  dateStr: string,
  status: AttendanceStatus,
  extra?: ExtraEntry
): string => {
  const m = ensureMonth(months, dateStr);
  const idx = Number(dateStr.slice(8)) - 1;
  const sid = String(studentId);
  const base = (m.a[sid] || '').padEnd(31, '.');
  m.a[sid] = base.slice(0, idx) + (status || '.') + base.slice(idx + 1);
  const key = `${sid}|${dateStr}`;
  if (extra && Object.keys(extra).length) m.x[key] = extra;
  else delete m.x[key];
  return `m-${getMonthKey(dateStr)}`;
};

export const purgeStudentAttendance = (
  months: MonthMap,
  studentId: number
): string[] => {
  const touched: string[] = [];
  const prefix = `${studentId}|`;
  Object.entries(months).forEach(([ym, v]) => {
    delete v.a[String(studentId)];
    Object.keys(v.x).forEach((k) => {
      if (k.startsWith(prefix)) delete v.x[k];
    });
    touched.push(`m-${ym}`);
  });
  return touched;
};

export const buildDraftRow = (
  months: MonthMap,
  student: Student,
  dateStr: string
): DraftRow => {
  const x = getExtra(months, student.id, dateStr);
  return {
    st: getStatus(months, student.id, dateStr),
    note: x.n || '',
    doc:
      x.ds === 'UPLOADED' || x.ds === 'VERIFIED'
        ? { pid: x.p, n: x.nm, k: x.k, o: x.o }
        : null,
    defer: x.ds === 'MISSING',
  };
};

export const createSeedData = (
  baseCore: CoreData,
  todayStr: string
): { core: CoreData; months: MonthMap; touchedMonths: string[] } => {
  const core: CoreData = structuredClone(baseCore);
  const months: MonthMap = {};
  const names =
    'Andi Pratama,Budi Santoso,Dimas Saputra,Eko Wahyudi,Fajar Nugroho,Gilang Ramadhan,Hafidz Kurniawan,Indra Kusuma,Citra Lestari,Dewi Anggraini,Fitri Handayani,Hana Permata,Jihan Maharani,Laras Setiawati,Nadia Safitri,Putri Wulandari'.split(
      ','
    );

  core.c = [
    { id: 1, n: 'X Ikhwan 1', w: 1 },
    { id: 2, n: 'X Akhwat 1', w: 2 },
  ];
  core.t = [
    { id: 1, n: 'Ahmad Fauzi, S.Pd', nip: '' },
    { id: 2, n: 'Siti Aminah, S.Pd', nip: '' },
  ];
  core.st = names.map((n, i) => ({
    id: i + 1,
    n,
    nis: String(26001001 + i),
    g: i < 8 ? 'L' : 'P',
    c: i < 8 ? 1 : 2,
  }));
  core.q = 100;
  core.demo = 1;

  if (!core.s.nama) {
    core.s = {
      nama: 'SMA Islam Terpadu Nusantara',
      alamat: 'Jl. Pendidikan No. 45, Kota Harapan',
      kota: 'Kota Harapan',
      tahun: '2026/2027 Ganjil',
      kepsek: { n: 'Drs. H. Abdul Rahman', nip: '197204122000031002' },
      wakasek: { n: 'Ustadz Ridwan, M.Pd', nip: '198508192010011005' },
      ikhwan: { n: 'Ahmad Fauzi, S.Pd', nip: '' },
      akhwat: { n: 'Siti Aminah, S.Pd', nip: '' },
    };
  }

  const dates: string[] = [todayStr];
  let d = parseDate(todayStr);
  for (let k = 1; k <= 25; k++) {
    d = prevSchoolDay(d);
    dates[k] = formatDate(d);
  }

  const overrides: Record<string, [AttendanceStatus, ExtraEntry['ds']?]> = {
    '2|1': ['S'],
    '5|2': ['S'],
    '5|1': ['S', 'UPLOADED'],
    '3|4': ['I', 'MISSING'],
    '11|3': ['S'],
    '11|2': ['S', 'MISSING'],
    '12|6': ['I', 'VERIFIED'],
    '10|0': ['S'],
    '13|0': ['I', 'UPLOADED'],
    '15|0': ['A'],
  };

  const touchedSet = new Set<string>();
  core.st.forEach((s) => {
    for (let k = 0; k <= 25; k++) {
      if (k === 0 && s.c === 1) continue;
      const ov = overrides[`${s.id}|${k}`];
      let st: AttendanceStatus;
      const x: ExtraEntry = {};
      if (ov) {
        st = ov[0];
        if (ov[1]) x.ds = ov[1];
      } else {
        const h = (s.id * 7 + k * 13) % 29;
        st = h === 0 ? 'S' : h === 1 ? 'I' : h === 2 ? 'A' : 'H';
        if (st === 'I') x.ds = 'UPLOADED';
      }
      if (x.ds === 'UPLOADED' || x.ds === 'VERIFIED') {
        x.k = 110 + s.id * 6;
        x.nm = `surat-${s.id}.webp`;
      }
      touchedSet.add(putAttendance(months, s.id, dates[k], st, x));
    }
  });

  return { core, months, touchedMonths: [...touchedSet] };
};

export const buildRecap = (
  core: CoreData,
  months: MonthMap,
  classId: number,
  refDateStr: string
): RecapResult => {
  const ref = parseDate(refDateStr);
  const monday = addDays(ref, -((ref.getDay() + 6) % 7));
  const W = [0, 1, 2, 3, 4, 5].map((i) => formatDate(addDays(monday, i)));

  const rows = core.st
    .filter((s) => !classId || s.c === classId)
    .slice()
    .sort(
      (a, b) =>
        getClassName(core, a.c).localeCompare(getClassName(core, b.c)) ||
        a.nis.localeCompare(b.nis)
    )
    .map((s) => {
      const v = W.map((d) => getStatus(months, s.id, d));
      const c = { H: 0, S: 0, I: 0, A: 0 };
      v.forEach((x) => {
        if (x) c[x]++;
      });
      const t = c.H + c.S + c.I + c.A;
      return { s, v, c, t, p: t ? (c.H / t) * 100 : null };
    });

  const T2 = { H: 0, S: 0, I: 0, A: 0, t: 0 };
  rows.forEach((r) => {
    T2.H += r.c.H;
    T2.S += r.c.S;
    T2.I += r.c.I;
    T2.A += r.c.A;
    T2.t += r.t;
  });

  return {
    W,
    rows,
    T2,
    days: W.filter((d) => rows.some((r) => getStatus(months, r.s.id, d))).length,
    p: T2.t ? (T2.H / T2.t) * 100 : null,
  };
};

export const buildRecapTsv = (core: CoreData, recap: RecapResult): string => {
  const headers = [
    'No',
    'NIS',
    'Nama Siswa',
    'L/P',
    'Ruangan Kelas',
    ...recap.W.map(dayLabel),
    'Hadir (H)',
    'Sakit (S)',
    'Izin (I)',
    'Alpa (A)',
    'Total Hari',
    '% Kehadiran',
  ];
  const body = recap.rows
    .map((r, i) =>
      [
        i + 1,
        `'${r.s.nis}`,
        r.s.n,
        r.s.g || '-',
        getClassName(core, r.s.c),
        ...r.v.map((x) => x || '-'),
        r.c.H,
        r.c.S,
        r.c.I,
        r.c.A,
        r.t,
        formatPercent(r.p),
      ].join('\t')
    )
    .join('\n');

  return `${core.s.nama}\tLaporan Mingguan ${recap.W[0]} sampai ${recap.W[5]}\n\n${headers.join('\t')}\n${body}`;
};
