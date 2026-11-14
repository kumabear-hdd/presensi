import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRecap,
  buildRecapTsv,
  consecutiveSickDays,
  createEmptyCoreData,
  createSeedData,
  formatDate,
  generateAutoNis,
  getMissingDocs,
  getStatus,
  inferGender,
  isWeekday,
  needsLetter,
  parseBulkLine,
  parseDate,
  prevSchoolDay,
  purgeStudentAttendance,
  putAttendance,
} from './simsLogic';
import {
  deriveAesKey,
  hashAccountId,
  openPayload,
  sealPayload,
} from './cryptoStorage';
import type { MonthMap } from '../types/sims';

test('prevSchoolDay skips Saturday and Sunday', () => {
  const monday = parseDate('2026-11-16');
  const prev = prevSchoolDay(monday);
  assert.equal(formatDate(prev), '2026-11-13'); // Friday
  assert.equal(isWeekday(parseDate('2026-11-14')), false); // Saturday
  assert.equal(isWeekday(parseDate('2026-11-15')), false); // Sunday
  assert.equal(isWeekday(parseDate('2026-11-13')), true); // Friday
});

test('needsLetter enforces Izin always and Sakit > 1 consecutive school day', () => {
  assert.equal(needsLetter('H', 0), false);
  assert.equal(needsLetter('A', 0), false);
  assert.equal(needsLetter('I', 0), true);
  assert.equal(needsLetter('S', 1), false);
  assert.equal(needsLetter('S', 2), true);
  assert.equal(needsLetter('S', 5), true);
});

test('consecutiveSickDays counts across weekends correctly', () => {
  const months: MonthMap = {};
  putAttendance(months, 1, '2026-11-12', 'S'); // Thursday
  putAttendance(months, 1, '2026-11-13', 'S'); // Friday
  // Monday 2026-11-16 should see 2 prior consecutive sick days
  assert.equal(consecutiveSickDays(months, 1, '2026-11-16'), 2);
  // Tuesday 2026-11-17 without Monday attendance sees 0
  assert.equal(consecutiveSickDays(months, 1, '2026-11-17'), 0);
});

test('createSeedData sets Budi Santoso sick on previous school day and populates missing docs', () => {
  const base = createEmptyCoreData();
  const { core, months } = createSeedData(base, '2026-11-13');
  assert.equal(core.st.length, 16);
  assert.equal(core.c.length, 2);
  assert.equal(core.t.length, 2);

  // Budi Santoso (id: 2) is S on previous school day (2026-11-12)
  assert.equal(getStatus(months, 2, '2026-11-12'), 'S');
  assert.equal(consecutiveSickDays(months, 2, '2026-11-13') + 1, 2);

  // Missing docs exist from seed overrides
  const missing = getMissingDocs(months);
  assert.ok(missing.length >= 2);
});

test('purgeStudentAttendance removes student records from all months', () => {
  const months: MonthMap = {};
  putAttendance(months, 7, '2026-10-30', 'I', { ds: 'MISSING' });
  putAttendance(months, 7, '2026-11-02', 'H');
  putAttendance(months, 8, '2026-11-02', 'H');

  purgeStudentAttendance(months, 7);
  assert.equal(getStatus(months, 7, '2026-10-30'), '');
  assert.equal(getStatus(months, 7, '2026-11-02'), '');
  assert.equal(getMissingDocs(months).length, 0);
  assert.equal(getStatus(months, 8, '2026-11-02'), 'H');
});

test('parseBulkLine, inferGender, and generateAutoNis work cleanly', () => {
  assert.deepEqual(parseBulkLine('Ahmad Fauzi;198001;X Ikhwan 1'), [
    'Ahmad Fauzi',
    '198001',
    'X Ikhwan 1',
  ]);
  assert.deepEqual(parseBulkLine('Citra Lestari,26001003,P'), [
    'Citra Lestari',
    '26001003',
    'P',
  ]);
  assert.equal(inferGender('X Akhwat 1'), 'P');
  assert.equal(inferGender('XI Ikhwan 2'), 'L');
  assert.equal(inferGender('XII IPA 1'), '');

  const core = createEmptyCoreData();
  const nis1 = generateAutoNis(core);
  core.st.push({ id: 1, n: 'Test', nis: nis1, g: 'L', c: 1 });
  const nis2 = generateAutoNis(core);
  assert.notEqual(nis1, nis2);
  assert.ok(nis1.startsWith('26'));
});

test('buildRecap and buildRecapTsv aggregate weekly attendance and preserve NIS prefix', () => {
  const core = createEmptyCoreData();
  core.s.nama = 'SMA Nusantara';
  core.c = [{ id: 1, n: 'X Ikhwan 1', w: null }];
  core.st = [{ id: 1, n: 'Andi', nis: '26001001', g: 'L', c: 1 }];
  const months: MonthMap = {};
  putAttendance(months, 1, '2026-11-09', 'H');
  putAttendance(months, 1, '2026-11-10', 'H');
  putAttendance(months, 1, '2026-11-11', 'S');
  putAttendance(months, 1, '2026-11-12', 'H');

  const recap = buildRecap(core, months, 1, '2026-11-13');
  assert.equal(recap.W.length, 6);
  assert.equal(recap.W[0], '2026-11-09');
  assert.equal(recap.W[5], '2026-11-14');
  assert.equal(recap.rows[0].c.H, 3);
  assert.equal(recap.rows[0].c.S, 1);
  assert.equal(recap.rows[0].t, 4);
  assert.equal(recap.rows[0].p, 75);
  assert.equal(recap.days, 4);

  const tsv = buildRecapTsv(core, recap);
  assert.ok(tsv.includes("'26001001"));
  assert.ok(tsv.includes('75%'));
});

test('WebCrypto PBKDF2 + AES-GCM sealPayload/openPayload roundtrip works', async () => {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveAesKey('rahasia123', salt);
  const payload = { ok: 1, school: 'SMA Nusantara' };
  const sealed = await sealPayload(key, payload);
  const opened = await openPayload<typeof payload>(key, sealed);
  assert.deepEqual(opened, payload);

  const acctId = await hashAccountId('tatausaha@sekolah.sch.id');
  assert.equal(acctId.length, 24);

  const wrongKey = await deriveAesKey('salahpass1', salt);
  await assert.rejects(() => openPayload(wrongKey, sealed));
});
