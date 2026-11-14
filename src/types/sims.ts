export type AttendanceStatus = 'H' | 'S' | 'I' | 'A' | '';

export type DocStatus = 'MISSING' | 'UPLOADED' | 'VERIFIED';

export type ThemeMode = 'auto' | 'light' | 'dark';

export type TabKey = 'dash' | 'input' | 'surat' | 'data' | 'rekap' | 'set';

export type DataSubTab = 'st' | 'gr' | 'kl';

export type SuratFilter = 'miss' | 'arc';

export type RecapPeriod = 'day' | 'week' | 'month';

export interface Signatory {
  n: string;
  nip: string;
}

export interface SchoolSettings {
  nama: string;
  alamat: string;
  kota: string;
  tahun: string;
  kepsek: Signatory;
  wakasek: Signatory;
  ikhwan: Signatory;
  akhwat: Signatory;
}

export interface ClassRoom {
  id: number;
  n: string;
  w: number | null;
}

export interface Teacher {
  id: number;
  n: string;
  nip: string;
}

export interface Student {
  id: number;
  n: string;
  nis: string;
  g: 'L' | 'P' | '';
  c: number;
}

export interface CoreData {
  s: SchoolSettings;
  c: ClassRoom[];
  t: Teacher[];
  st: Student[];
  q: number;
  demo?: number;
}

export interface ExtraEntry {
  n?: string;
  ds?: DocStatus;
  p?: string;
  k?: number;
  nm?: string;
  o?: number;
}

export interface MonthData {
  a: Record<string, string>;
  x: Record<string, ExtraEntry>;
}

export type MonthMap = Record<string, MonthData>;

export interface DraftDoc {
  pid?: string;
  n?: string;
  k?: number;
  o?: number;
}

export interface DraftRow {
  st: AttendanceStatus;
  note: string;
  doc: DraftDoc | null;
  defer: boolean;
}

export type DraftMap = Record<number, DraftRow>;

export interface EncryptedPayload {
  i: string;
  c: string;
}

export interface AccountRecord {
  s: string;
  k: EncryptedPayload;
}

export interface RecapRow {
  s: Student;
  v: AttendanceStatus[];
  c: Record<'H' | 'S' | 'I' | 'A', number>;
  t: number;
  p: number | null;
}

export interface RecapResult {
  W: string[];
  rows: RecapRow[];
  T2: { H: number; S: number; I: number; A: number; t: number };
  days: number;
  p: number | null;
}

export interface ToastMessage {
  text: string;
  bad: boolean;
}
