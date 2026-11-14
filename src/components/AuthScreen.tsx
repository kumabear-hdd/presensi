import React, { useState } from 'react';
import { CheckSquare, Lock, Moon, Sun, Monitor } from 'lucide-react';
import type { ThemeMode } from '../types/sims';

interface AuthScreenProps {
  mode: 'reg' | 'in';
  error: string;
  theme: ThemeMode;
  onToggleMode: () => void;
  onCycleTheme: () => void;
  onSubmit: (email: string, pw: string, pw2: string) => Promise<void>;
}

const themeLabels: Record<ThemeMode, string> = {
  auto: 'Tema: Otomatis',
  light: 'Tema: Terang',
  dark: 'Tema: Gelap',
};

export const AuthScreen: React.FC<AuthScreenProps> = ({
  mode,
  error,
  theme,
  onToggleMode,
  onCycleTheme,
  onSubmit,
}) => {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(email, pw, pw2);
    } finally {
      setSubmitting(false);
    }
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <div className="min-h-screen grid place-items-center px-4 py-8 bg-[var(--bg)] text-[var(--ink)]">
      <div className="w-full max-w-[440px] bg-[var(--sf)] border border-[var(--ln)] rounded-2xl p-7 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--ink)] text-[var(--bg)] grid place-items-center shrink-0">
            <CheckSquare className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight leading-tight">
              SIMS Absensi
            </h1>
            <p className="text-xs text-[var(--mu)]">
              Sistem Presensi &amp; Arsip Surat Siswa
            </p>
          </div>
        </div>

        <p className="text-sm text-[var(--mu)] leading-relaxed mb-3">
          {mode === 'reg'
            ? 'Buat akun sekolah baru untuk memulai. Seluruh data dienkripsi di browser sebelum disimpan.'
            : 'Masuk menggunakan email dan password akun sekolah Anda.'}
        </p>

        <div className="rounded-lg bg-[var(--sf2)] border border-[var(--ln)] px-3 py-2.5 text-xs text-[var(--mu)] mb-4 flex items-start gap-2">
          <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--pri)]" aria-hidden="true" />
          <span>
            Mode penyimpanan lokal aktif: data tersimpan terenkripsi AES-256-GCM di perangkat ini.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
          <label className="block text-xs font-semibold text-[var(--mu)]">
            Email sekolah
            <input
              id="em"
              type="email"
              autoComplete="username"
              placeholder="tatausaha@sekolah.sch.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-2 text-sm text-[var(--ink)] font-medium focus:outline-none focus:border-[var(--pri)] focus:ring-2 focus:ring-[var(--pri-b)]"
            />
          </label>

          <label className="block text-xs font-semibold text-[var(--mu)]">
            Password
            <input
              id="pw"
              type="password"
              autoComplete={mode === 'reg' ? 'new-password' : 'current-password'}
              placeholder="Minimal 8 karakter"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-2 text-sm text-[var(--ink)] font-medium focus:outline-none focus:border-[var(--pri)] focus:ring-2 focus:ring-[var(--pri-b)]"
            />
          </label>

          {mode === 'reg' && (
            <>
              <label className="block text-xs font-semibold text-[var(--mu)]">
                Ulangi password
                <input
                  id="pw2"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Ketik ulang password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-2 text-sm text-[var(--ink)] font-medium focus:outline-none focus:border-[var(--pri)] focus:ring-2 focus:ring-[var(--pri-b)]"
                />
              </label>
              <div className="rounded-lg bg-[var(--sf2)] border border-[var(--ln)] px-3 py-2 text-xs text-[var(--mu)]">
                Password tidak dapat dipulihkan jika lupa karena enkripsi bersifat{' '}
                <em>zero-knowledge</em>. Simpan password di tempat aman.
              </div>
            </>
          )}

          {error && (
            <div role="alert" className="text-xs font-semibold text-[var(--a)] pt-0.5">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 min-h-[40px] rounded-lg bg-[var(--pri-btn)] text-white px-4 py-2 text-sm font-semibold hover:brightness-105 active:translate-y-px transition cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              {submitting ? 'Memproses...' : mode === 'reg' ? 'Buat akun' : 'Masuk'}
            </button>
            <button
              type="button"
              onClick={onToggleMode}
              className="min-h-[40px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] text-[var(--ink)] px-3.5 py-2 text-sm font-semibold hover:bg-[var(--sf2)] transition cursor-pointer whitespace-nowrap"
            >
              {mode === 'reg' ? 'Sudah punya akun' : 'Buat akun baru'}
            </button>
          </div>
        </form>

        <div className="mt-5 pt-3 border-t border-[var(--ln2)] flex justify-end">
          <button
            type="button"
            onClick={onCycleTheme}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ln)] bg-[var(--sf2)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ink)] hover:border-[var(--mu)] transition cursor-pointer whitespace-nowrap"
          >
            <ThemeIcon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{themeLabels[theme]}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
