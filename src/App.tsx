import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { DashboardView } from './components/DashboardView';
import { DataView } from './components/DataView';
import { Header } from './components/Header';
import { InputView } from './components/InputView';
import { EditStudentModal, PhotoPreviewModal } from './components/Modals';
import { RekapView } from './components/RekapView';
import { SettingsView } from './components/SettingsView';
import { SuratView } from './components/SuratView';
import type {
  AccountRecord,
  CoreData,
  DraftMap,
  DraftRow,
  EncryptedPayload,
  ExtraEntry,
  MonthMap,
  Student,
  TabKey,
  ThemeMode,
  ToastMessage,
} from './types/sims';
import {
  compressImageFile,
  deriveAesKey,
  fromBase64,
  hashAccountId,
  openPayload,
  sealPayload,
  simsStorage,
  toBase64,
} from './utils/cryptoStorage';
import {
  buildDraftRow,
  consecutiveSickDays,
  createEmptyCoreData,
  createSeedData,
  ensureClass,
  ensureTeacher,
  generateAutoNis,
  getDefaultSchoolDate,
  getExtra,
  getMissingDocs,
  getStatus,
  inferGender,
  isWeekday,
  needsLetter,
  normalizeText,
  parseBulkLine,
  parseDate,
  PHOTO_PLACEHOLDER,
  purgeStudentAttendance,
  putAttendance,
} from './utils/simsLogic';

function applyThemeMode(mode: ThemeMode): void {
  localStorage.setItem('sims_theme', mode);
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldBeDark = mode === 'dark' || (mode === 'auto' && prefersDark);
  document.documentElement.classList.toggle('dark', shouldBeDark);
}

export default function App() {
  const todayStr = useMemo(() => getDefaultSchoolDate(), []);

  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('sims_theme');
    return saved === 'light' || saved === 'dark' || saved === 'auto'
      ? saved
      : 'auto';
  });

  const [ready, setReady] = useState(false);
  const [authMode, setAuthMode] = useState<'reg' | 'in'>('reg');
  const [authError, setAuthError] = useState('');

  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [acctId, setAcctId] = useState('');
  const [email, setEmail] = useState('');

  const [core, setCore] = useState<CoreData>(() => createEmptyCoreData());
  const [months, setMonths] = useState<MonthMap>({});
  const [activeTab, setActiveTab] = useState<TabKey>('dash');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Input attendance state
  const [inputClassId, setInputClassId] = useState(0);
  const [inputDate, setInputDate] = useState(todayStr);
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [inputFeedback, setInputFeedback] = useState<{ text: string; bad: boolean } | null>(null);

  // Decrypted photo cache & modals
  const [photoCache, setPhotoCache] = useState<Record<string, string>>({});
  const [previewPhoto, setPreviewPhoto] = useState<{ src: string; caption: string } | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Toast
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Refs for reliable debounced encrypted flush
  const dirtyRef = useRef<Set<string>>(new Set());
  const flushTimerRef = useRef<number | null>(null);
  const flushingRef = useRef(false);
  const stateRef = useRef({ cryptoKey, acctId, core, months });
  stateRef.current = { cryptoKey, acctId, core, months };

  const showToast = useCallback((text: string, bad = false) => {
    setToast({ text, bad });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3600);
  }, []);

  useEffect(() => {
    applyThemeMode(theme);
    if (theme !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyThemeMode('auto');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  useEffect(() => {
    let active = true;
    simsStorage
      .hasAnyAccount()
      .then((has) => {
        if (active) {
          setAuthMode(has ? 'in' : 'reg');
          setReady(true);
        }
      })
      .catch(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const cycleTheme = useCallback(() => {
    const order: ThemeMode[] = ['auto', 'light', 'dark'];
    setTheme((prev) => order[(order.indexOf(prev) + 1) % order.length]);
  }, []);

  const flushDirty = useCallback(async () => {
    if (flushingRef.current) return;
    const { cryptoKey: k, acctId: id } = stateRef.current;
    if (!k || !id) return;

    flushingRef.current = true;
    let currentKey: string | undefined;
    try {
      while (dirtyRef.current.size > 0) {
        currentKey = [...dirtyRef.current][0];
        dirtyRef.current.delete(currentKey);
        const latest = stateRef.current;
        const payload =
          currentKey === 'core'
            ? latest.core
            : latest.months[currentKey.slice(2)] || { a: {}, x: {} };
        const sealed = await sealPayload(k, payload);
        await simsStorage.set(`d_${id}`, currentKey, sealed);
      }
      setSaveStatus('saved');
    } catch {
      if (currentKey) dirtyRef.current.add(currentKey);
      setSaveStatus('error');
    } finally {
      flushingRef.current = false;
    }
  }, []);

  const markDirty = useCallback(
    (keys: string | string[]) => {
      const list = Array.isArray(keys) ? keys : [keys];
      list.forEach((k) => dirtyRef.current.add(k));
      setSaveStatus('saving');
      if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = window.setTimeout(() => {
        void flushDirty();
      }, 650);
    },
    [flushDirty]
  );

  const handleAuthSubmit = async (rawEmail: string, pw: string, pw2: string) => {
    const cleanEmail = rawEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setAuthError('Masukkan alamat email yang valid.');
      return;
    }
    if (pw.length < 8) {
      setAuthError('Password minimal 8 karakter.');
      return;
    }
    if (!globalThis.crypto?.subtle) {
      setAuthError('Browser ini tidak mendukung enkripsi. Gunakan browser modern.');
      return;
    }

    setAuthError('');
    try {
      const id = await hashAccountId(cleanEmail);
      const existing = await simsStorage.get<AccountRecord>('accts', id);

      if (authMode === 'reg') {
        if (existing) {
          setAuthError('Email ini sudah terdaftar. Pilih Sudah punya akun.');
          return;
        }
        if (pw !== pw2) {
          setAuthError('Ulangi password tidak sama.');
          return;
        }
        const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
        const key = await deriveAesKey(pw, salt);
        const verifier = await sealPayload(key, { ok: 1 });
        await simsStorage.set<AccountRecord>('accts', id, {
          s: toBase64(salt),
          k: verifier,
        });

        const freshCore = createEmptyCoreData();
        setCryptoKey(key);
        setAcctId(id);
        setEmail(cleanEmail);
        setCore(freshCore);
        setMonths({});
        setActiveTab('dash');
        setSaveStatus('idle');
        stateRef.current = { cryptoKey: key, acctId: id, core: freshCore, months: {} };
        markDirty('core');
      } else {
        if (!existing) {
          setAuthError('Akun tidak ditemukan. Periksa email atau buat akun baru.');
          return;
        }
        const key = await deriveAesKey(pw, fromBase64(existing.s));
        try {
          await openPayload(key, existing.k);
        } catch {
          setAuthError('Email atau password salah.');
          return;
        }

        const storedEntries = await simsStorage.list<EncryptedPayload>(`d_${id}`);
        let loadedCore = createEmptyCoreData();
        const loadedMonths: MonthMap = {};
        for (const [docKey, encrypted] of storedEntries) {
          if (docKey === 'core') {
            loadedCore = await openPayload<CoreData>(key, encrypted);
          } else if (docKey.startsWith('m-')) {
            loadedMonths[docKey.slice(2)] = await openPayload(key, encrypted);
          }
        }

        setCryptoKey(key);
        setAcctId(id);
        setEmail(cleanEmail);
        setCore(loadedCore);
        setMonths(loadedMonths);
        setInputClassId(loadedCore.c[0]?.id || 0);
        setDrafts({});
        setActiveTab('dash');
        setSaveStatus('idle');
      }
    } catch {
      setAuthError('Gagal terhubung ke penyimpanan. Coba lagi.');
    }
  };

  const handleLogout = async () => {
    if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
    await flushDirty();
    dirtyRef.current.clear();
    setCryptoKey(null);
    setAcctId('');
    setEmail('');
    setCore(createEmptyCoreData());
    setMonths({});
    setDrafts({});
    setPhotoCache({});
    setInputFeedback(null);
    setSaveStatus('idle');
    setAuthMode('in');
    setAuthError('');
  };

  const handleLoadSeed = () => {
    const { core: seededCore, months: seededMonths, touchedMonths } =
      createSeedData(core, todayStr);
    setCore(seededCore);
    setMonths(seededMonths);
    setInputClassId(seededCore.c[0]?.id || 0);
    setDrafts({});
    stateRef.current = {
      ...stateRef.current,
      core: seededCore,
      months: seededMonths,
    };
    markDirty(['core', ...touchedMonths]);
    showToast('Data contoh berhasil dimuat.');
  };

  // Ensure inputClassId stays valid when core.c changes
  const effectiveInputClassId = useMemo(() => {
    if (core.c.some((c) => c.id === inputClassId)) return inputClassId;
    return core.c[0]?.id || 0;
  }, [core.c, inputClassId]);

  const getMergedDraft = useCallback(
    (student: Student, dateStr: string, draftMap: DraftMap): DraftRow =>
      draftMap[student.id] || buildDraftRow(months, student, dateStr),
    [months]
  );

  const handleSelectStatus = (studentId: number, status: 'H' | 'S' | 'I' | 'A') => {
    const student = core.st.find((s) => s.id === studentId);
    if (!student) return;
    setDrafts((prev) => {
      const base = getMergedDraft(student, inputDate, prev);
      return {
        ...prev,
        [studentId]: {
          ...base,
          st: status,
          defer: status !== 'S' && status !== 'I' ? false : base.defer,
        },
      };
    });
    setInputFeedback(null);
  };

  const handleChangeNote = (studentId: number, note: string) => {
    const student = core.st.find((s) => s.id === studentId);
    if (!student) return;
    setDrafts((prev) => {
      const base = getMergedDraft(student, inputDate, prev);
      return { ...prev, [studentId]: { ...base, note } };
    });
  };

  const handleToggleDefer = (studentId: number, defer: boolean) => {
    const student = core.st.find((s) => s.id === studentId);
    if (!student) return;
    setDrafts((prev) => {
      const base = getMergedDraft(student, inputDate, prev);
      return { ...prev, [studentId]: { ...base, defer } };
    });
  };

  const handleFillAllPresent = () => {
    const studentsInClass = core.st.filter((s) => s.c === effectiveInputClassId);
    setDrafts((prev) => {
      const next = { ...prev };
      studentsInClass.forEach((s) => {
        const cur = getMergedDraft(s, inputDate, next);
        if (!cur.st) next[s.id] = { ...cur, st: 'H' };
      });
      return next;
    });
    showToast('Seluruh siswa yang belum dipilih diisi Hadir.');
  };

  const handleUploadInputPhoto = async (studentId: number, file: File) => {
    if (!cryptoKey || !acctId) return;
    const student = core.st.find((s) => s.id === studentId);
    if (!student) return;
    try {
      const compressed = await compressImageFile(file);
      const pid =
        'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const sealed = await sealPayload(cryptoKey, { u: compressed.u });
      await simsStorage.set(`ph_${acctId}`, pid, sealed);
      setPhotoCache((prev) => ({ ...prev, [pid]: compressed.u }));
      setDrafts((prev) => {
        const cur = getMergedDraft(student, inputDate, prev);
        return {
          ...prev,
          [studentId]: {
            ...cur,
            doc: { pid, n: compressed.n, k: compressed.k, o: compressed.o },
            defer: false,
          },
        };
      });
      showToast(`Foto surat dikompresi & diunggah (${compressed.k} KB).`);
    } catch {
      const msg = 'Gagal memproses foto. Pilih file JPG, PNG, atau WebP lalu coba lagi.';
      setInputFeedback({ text: msg, bad: true });
      showToast(msg, true);
    }
  };

  const handleSaveAttendance = () => {
    if (!isWeekday(parseDate(inputDate))) {
      const msg =
        'Tanggal ini bukan hari sekolah (Sabtu/Minggu). Pilih hari Senin sampai Jumat.';
      setInputFeedback({ text: msg, bad: true });
      showToast(msg, true);
      return;
    }

    const studentsInClass = core.st.filter((s) => s.c === effectiveInputClassId);
    const rowsToSave = studentsInClass
      .map((s) => ({ s, row: getMergedDraft(s, inputDate, drafts) }))
      .filter(({ row }) => Boolean(row.st));

    if (!rowsToSave.length) {
      const msg = 'Belum ada status kehadiran yang dipilih.';
      setInputFeedback({ text: msg, bad: true });
      showToast(msg, true);
      return;
    }

    const errors: string[] = [];
    rowsToSave.forEach(({ s, row }) => {
      const streak =
        row.st === 'S' ? consecutiveSickDays(months, s.id, inputDate) + 1 : 0;
      if (needsLetter(row.st, streak) && !row.doc && !row.defer) {
        errors.push(
          `${s.n}: ${row.st === 'I' ? 'izin' : `sakit hari ke-${streak}`} wajib surat.`
        );
      }
    });

    if (errors.length) {
      const msg = errors.join(' | ');
      setInputFeedback({ text: msg, bad: true });
      showToast(msg, true);
      return;
    }

    const nextMonths: MonthMap = structuredClone(months);
    const touched = new Set<string>();
    let missingCount = 0;

    rowsToSave.forEach(({ s, row }) => {
      const streak =
        row.st === 'S' ? consecutiveSickDays(nextMonths, s.id, inputDate) + 1 : 0;
      const prevExtra = getExtra(nextMonths, s.id, inputDate);
      const extra: ExtraEntry = {};
      if (row.note) extra.n = row.note;

      if (needsLetter(row.st, streak)) {
        if (row.doc) {
          extra.ds =
            prevExtra.ds === 'VERIFIED' && prevExtra.p === row.doc.pid
              ? 'VERIFIED'
              : 'UPLOADED';
          extra.p = row.doc.pid;
          extra.k = row.doc.k;
          extra.nm = row.doc.n;
          extra.o = row.doc.o;
        } else {
          extra.ds = 'MISSING';
          missingCount++;
        }
      }
      touched.add(putAttendance(nextMonths, s.id, inputDate, row.st, extra));
    });

    setMonths(nextMonths);
    stateRef.current = { ...stateRef.current, months: nextMonths };
    markDirty([...touched]);

    const okMsg =
      `Tersimpan: ${rowsToSave.length} siswa.` +
      (missingCount ? ` ${missingCount} surat menyusul masuk daftar peringatan.` : '');
    setInputFeedback({ text: okMsg, bad: false });
    showToast(okMsg);
  };

  const loadPhotoFromStorage = useCallback(
    async (pid: string): Promise<string | null> => {
      if (photoCache[pid]) return photoCache[pid];
      if (!cryptoKey || !acctId) return null;
      try {
        const encrypted = await simsStorage.get<EncryptedPayload>(
          `ph_${acctId}`,
          pid
        );
        if (!encrypted) return null;
        const opened = await openPayload<{ u: string }>(cryptoKey, encrypted);
        setPhotoCache((prev) => ({ ...prev, [pid]: opened.u }));
        return opened.u;
      } catch {
        return null;
      }
    },
    [acctId, cryptoKey, photoCache]
  );

  const handlePreviewPhoto = async (pid: string | undefined, caption: string) => {
    if (!pid) {
      setPreviewPhoto({ src: PHOTO_PLACEHOLDER, caption });
      return;
    }
    const cached = photoCache[pid] || (await loadPhotoFromStorage(pid));
    setPreviewPhoto({ src: cached || PHOTO_PLACEHOLDER, caption });
  };

  const handleUploadFollowUp = async (entryKey: string, file: File) => {
    if (!cryptoKey || !acctId) return;
    try {
      const compressed = await compressImageFile(file);
      const pid =
        'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const sealed = await sealPayload(cryptoKey, { u: compressed.u });
      await simsStorage.set(`ph_${acctId}`, pid, sealed);
      setPhotoCache((prev) => ({ ...prev, [pid]: compressed.u }));

      const [sidStr, dateStr] = entryKey.split('|');
      const nextMonths: MonthMap = structuredClone(months);
      const curStatus = getStatus(nextMonths, sidStr, dateStr);
      const curExtra = getExtra(nextMonths, sidStr, dateStr);
      const mKey = putAttendance(nextMonths, sidStr, dateStr, curStatus, {
        ...curExtra,
        ds: 'UPLOADED',
        p: pid,
        k: compressed.k,
        nm: compressed.n,
        o: compressed.o,
      });

      setMonths(nextMonths);
      stateRef.current = { ...stateRef.current, months: nextMonths };
      markDirty(mKey);
      showToast(`Foto surat dikompresi & diunggah (${compressed.k} KB).`);
    } catch {
      showToast(
        'Gagal memproses foto. Pilih file JPG, PNG, atau WebP lalu coba lagi.',
        true
      );
    }
  };

  const handleVerifyLetter = (entryKey: string) => {
    const [sidStr, dateStr] = entryKey.split('|');
    const nextMonths: MonthMap = structuredClone(months);
    const curStatus = getStatus(nextMonths, sidStr, dateStr);
    const curExtra = getExtra(nextMonths, sidStr, dateStr);
    const mKey = putAttendance(nextMonths, sidStr, dateStr, curStatus, {
      ...curExtra,
      ds: 'VERIFIED',
    });
    setMonths(nextMonths);
    stateRef.current = { ...stateRef.current, months: nextMonths };
    markDirty(mKey);
    showToast('Surat ditandai terverifikasi.');
  };

  // Master Data CRUD handlers
  const updateCore = (mutator: (draft: CoreData) => string | void) => {
    const nextCore: CoreData = structuredClone(core);
    const error = mutator(nextCore);
    if (error) {
      showToast(error, true);
      return;
    }
    setCore(nextCore);
    stateRef.current = { ...stateRef.current, core: nextCore };
    markDirty('core');
  };

  const handleAddStudent = (
    name: string,
    nis: string,
    className: string,
    gender: string
  ) => {
    const cleanName = name.trim();
    const cleanClass = className.trim();
    if (!cleanName || !cleanClass) {
      showToast('Isi nama siswa dan nama kelas.', true);
      return;
    }
    updateCore((d) => {
      const finalNis = nis.trim() || generateAutoNis(d);
      if (d.st.some((s) => s.nis === finalNis)) {
        return `NIS ${finalNis} sudah dipakai.`;
      }
      const cls = ensureClass(d, cleanClass);
      const g =
        gender === 'L' || gender === 'P' ? gender : inferGender(cls.n);
      d.st.push({ id: d.q++, n: cleanName, nis: finalNis, g, c: cls.id });
    });
    if (cleanName && cleanClass) showToast('Siswa ditambahkan.');
  };

  const handleBulkAddStudents = (
    className: string,
    waliName: string,
    text: string
  ) => {
    const cleanClass = className.trim();
    const rows = text
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);
    if (!cleanClass || !rows.length) {
      showToast('Isi nama kelas dan daftar siswa.', true);
      return;
    }

    let ok = 0;
    let skipped = 0;
    updateCore((d) => {
      const cls = ensureClass(d, cleanClass);
      if (waliName.trim()) cls.w = ensureTeacher(d, waliName.trim()).id;
      rows.forEach((line) => {
        let [n, nis, g] = parseBulkLine(line);
        if (nis && /^[LP]$/i.test(nis)) {
          g = nis;
          nis = '';
        }
        const finalNis = nis || generateAutoNis(d);
        if (!n || d.st.some((s) => s.nis === finalNis)) {
          skipped++;
          return;
        }
        const finalGender = /^[LP]$/i.test(g || '')
          ? (g.toUpperCase() as 'L' | 'P')
          : inferGender(cls.n);
        d.st.push({
          id: d.q++,
          n,
          nis: finalNis,
          g: finalGender,
          c: cls.id,
        });
        ok++;
      });
    });
    showToast(
      `${ok} siswa ditambahkan ke ${cleanClass}.` +
        (skipped ? ` ${skipped} baris dilewati.` : '')
    );
  };

  const handleSaveEditedStudent = (
    studentId: number,
    updates: { n: string; nis: string; c: number; g: 'L' | 'P' | '' }
  ) => {
    updateCore((d) => {
      const st = d.st.find((x) => x.id === studentId);
      if (!st) return;
      st.n = updates.n;
      st.nis = updates.nis;
      st.c = updates.c;
      st.g = updates.g;
    });
    setEditingStudent(null);
    showToast('Data siswa diperbarui.');
  };

  const handleDeleteStudent = (studentId: number) => {
    const nextCore: CoreData = structuredClone(core);
    nextCore.st = nextCore.st.filter((s) => s.id !== studentId);
    const nextMonths: MonthMap = structuredClone(months);
    const touchedMonths = purgeStudentAttendance(nextMonths, studentId);

    setCore(nextCore);
    setMonths(nextMonths);
    stateRef.current = { ...stateRef.current, core: nextCore, months: nextMonths };
    markDirty(['core', ...touchedMonths]);
    showToast('Data siswa berhasil dihapus.');
  };

  const handleAddTeacher = (name: string, nip: string, className: string) => {
    const cleanName = name.trim();
    if (!cleanName) {
      showToast('Isi nama guru.', true);
      return;
    }
    updateCore((d) => {
      const t = ensureTeacher(d, cleanName, nip.trim());
      if (nip.trim()) t.nip = nip.trim();
      if (className.trim()) ensureClass(d, className.trim()).w = t.id;
    });
    showToast('Guru ditambahkan.');
  };

  const handleBulkAddTeachers = (text: string) => {
    const rows = text
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);
    if (!rows.length) {
      showToast('Isi daftar guru.', true);
      return;
    }
    updateCore((d) => {
      rows.forEach((line) => {
        const [n, nip, clsName] = parseBulkLine(line);
        if (!n) return;
        const t = ensureTeacher(d, n, nip);
        if (nip) t.nip = nip;
        if (clsName) ensureClass(d, clsName).w = t.id;
      });
    });
    showToast(`${rows.length} baris guru diproses.`);
  };

  const handleDeleteTeacher = (teacherId: number) => {
    updateCore((d) => {
      d.t = d.t.filter((t) => t.id !== teacherId);
      d.c.forEach((c) => {
        if (c.w === teacherId) c.w = null;
      });
    });
    showToast('Data guru berhasil dihapus.');
  };

  const handleRenameClass = (classId: number, rawName: string) => {
    const clean = rawName.trim().replace(/\s+/g, ' ');
    if (!clean) return;
    if (core.c.some((o) => o.id !== classId && normalizeText(o.n) === normalizeText(clean))) {
      showToast('Nama kelas sudah dipakai.', true);
      return;
    }
    updateCore((d) => {
      const cls = d.c.find((c) => c.id === classId);
      if (cls) cls.n = clean;
    });
    showToast('Nama kelas diperbarui.');
  };

  const handleChangeClassWali = (classId: number, rawWali: string) => {
    const clean = rawWali.trim();
    updateCore((d) => {
      const cls = d.c.find((c) => c.id === classId);
      if (!cls) return;
      cls.w = clean ? ensureTeacher(d, clean).id : null;
    });
    showToast('Wali kelas diperbarui.');
  };

  const handleDeleteClass = (classId: number) => {
    updateCore((d) => {
      d.c = d.c.filter((c) => c.id !== classId);
    });
    showToast('Kelas berhasil dihapus.');
  };

  const handleUpdateSettingField = (path: string, value: string) => {
    updateCore((d) => {
      const [key, sub] = path.split('.');
      if (sub === 'n' || sub === 'nip') {
        const target = d.s[key as 'kepsek' | 'wakasek' | 'ikhwan' | 'akhwat'];
        target[sub] = value;
      } else {
        (d.s[key as 'nama' | 'alamat' | 'kota' | 'tahun'] as string) = value;
      }
    });
  };

  if (!ready) {
    return (
      <div className="max-w-[1160px] mx-auto px-5 py-12 text-sm text-[var(--mu)]">
        Memuat aplikasi...
      </div>
    );
  }

  if (!cryptoKey) {
    return (
      <AuthScreen
        mode={authMode}
        error={authError}
        theme={theme}
        onToggleMode={() => {
          setAuthMode((m) => (m === 'reg' ? 'in' : 'reg'));
          setAuthError('');
        }}
        onCycleTheme={cycleTheme}
        onSubmit={handleAuthSubmit}
      />
    );
  }

  const missingCount = getMissingDocs(months).length;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <Header
        schoolName={core.s.nama}
        schoolYear={core.s.tahun}
        email={email}
        activeTab={activeTab}
        missingCount={missingCount}
        saveStatus={saveStatus}
        theme={theme}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'input') {
            setDrafts({});
            setInputFeedback(null);
          }
        }}
        onCycleTheme={cycleTheme}
        onLogout={() => void handleLogout()}
      />

      <main className="max-w-[1160px] mx-auto px-4 sm:px-5 py-6 pb-16">
        {activeTab === 'dash' && (
          <DashboardView
            core={core}
            months={months}
            todayStr={todayStr}
            onNavigateTab={setActiveTab}
            onQuickInputClass={(classId) => {
              setInputClassId(classId);
              setDrafts({});
              setInputFeedback(null);
              setActiveTab('input');
            }}
            onLoadSeed={handleLoadSeed}
          />
        )}

        {activeTab === 'input' && (
          <InputView
            core={core}
            months={months}
            todayStr={todayStr}
            selectedClassId={effectiveInputClassId}
            selectedDate={inputDate}
            drafts={drafts}
            feedback={inputFeedback}
            onChangeClass={(cid) => {
              setInputClassId(cid);
              setDrafts({});
              setInputFeedback(null);
            }}
            onChangeDate={(dt) => {
              setInputDate(dt);
              setDrafts({});
              setInputFeedback(null);
            }}
            onSelectStatus={handleSelectStatus}
            onChangeNote={handleChangeNote}
            onToggleDefer={handleToggleDefer}
            onUploadPhoto={handleUploadInputPhoto}
            onFillAllPresent={handleFillAllPresent}
            onSave={handleSaveAttendance}
            onNavigateTab={setActiveTab}
            onPreviewPhoto={(pid, caption) => void handlePreviewPhoto(pid, caption)}
          />
        )}

        {activeTab === 'surat' && (
          <SuratView
            core={core}
            months={months}
            photoCache={photoCache}
            onLoadPhoto={loadPhotoFromStorage}
            onUploadFollowUp={handleUploadFollowUp}
            onVerify={handleVerifyLetter}
            onPreviewPhoto={(pid, caption) => void handlePreviewPhoto(pid, caption)}
          />
        )}

        {activeTab === 'data' && (
          <DataView
            core={core}
            onAddStudent={handleAddStudent}
            onBulkAddStudents={handleBulkAddStudents}
            onEditStudent={setEditingStudent}
            onDeleteStudent={handleDeleteStudent}
            onAddTeacher={handleAddTeacher}
            onBulkAddTeachers={handleBulkAddTeachers}
            onDeleteTeacher={handleDeleteTeacher}
            onRenameClass={handleRenameClass}
            onChangeClassWali={handleChangeClassWali}
            onDeleteClass={handleDeleteClass}
          />
        )}

        {activeTab === 'rekap' && (
          <RekapView
            core={core}
            months={months}
            todayStr={todayStr}
            onNotify={showToast}
          />
        )}

        {activeTab === 'set' && (
          <SettingsView
            settings={core.s}
            theme={theme}
            onUpdateField={handleUpdateSettingField}
            onCycleTheme={cycleTheme}
          />
        )}
      </main>

      <PhotoPreviewModal
        open={Boolean(previewPhoto)}
        src={previewPhoto?.src || ''}
        caption={previewPhoto?.caption || ''}
        onClose={() => setPreviewPhoto(null)}
      />

      <EditStudentModal
        student={editingStudent}
        classes={core.c}
        existingStudents={core.st}
        onClose={() => setEditingStudent(null)}
        onSave={handleSaveEditedStudent}
      />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`no-print fixed bottom-5 left-4 right-4 sm:left-auto sm:right-5 sm:max-w-sm z-50 rounded-xl px-4 py-3 text-sm font-semibold shadow-xl ${
            toast.bad ? 'bg-[var(--a-btn)] text-white' : 'bg-[var(--h-btn)] text-white'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
