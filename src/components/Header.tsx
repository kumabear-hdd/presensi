import React from 'react';
import {
  AlertCircle,
  Check,
  CheckSquare,
  Loader2,
  LogOut,
  Monitor,
  Moon,
  Sun,
} from 'lucide-react';
import type { TabKey, ThemeMode } from '../types/sims';

interface HeaderProps {
  schoolName: string;
  schoolYear: string;
  email: string;
  activeTab: TabKey;
  missingCount: number;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  theme: ThemeMode;
  onSelectTab: (tab: TabKey) => void;
  onCycleTheme: () => void;
  onLogout: () => void;
}

const NAV_ITEMS: Array<{ key: TabKey; label: string }> = [
  { key: 'dash', label: 'Dashboard' },
  { key: 'input', label: 'Input Absensi' },
  { key: 'surat', label: 'Surat' },
  { key: 'data', label: 'Data' },
  { key: 'rekap', label: 'Rekap' },
  { key: 'set', label: 'Pengaturan' },
];

const themeLabels: Record<ThemeMode, string> = {
  auto: 'Otomatis',
  light: 'Terang',
  dark: 'Gelap',
};

export const Header: React.FC<HeaderProps> = ({
  schoolName,
  schoolYear,
  email,
  activeTab,
  missingCount,
  saveStatus,
  theme,
  onSelectTab,
  onCycleTheme,
  onLogout,
}) => {
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <header className="no-print sticky top-0 z-30 bg-[var(--sf)]/95 backdrop-blur-md border-b border-[var(--ln)]">
      <div className="max-w-[1160px] mx-auto px-4 sm:px-5">
        <div className="flex items-center justify-between gap-2.5 py-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[var(--ink)] text-[var(--bg)] grid place-items-center shrink-0">
              <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-extrabold tracking-tight leading-tight truncate">
                SIMS Absensi
              </div>
              <div className="text-[11px] sm:text-xs text-[var(--mu)] truncate">
                {schoolName || 'Nama sekolah belum diisi'}
                {schoolYear ? ` · ${schoolYear}` : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {saveStatus !== 'idle' && (
              <span
                role="status"
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] sm:text-xs font-semibold whitespace-nowrap ${
                  saveStatus === 'saved'
                    ? 'bg-[var(--hb)] text-[var(--h)]'
                    : saveStatus === 'error'
                      ? 'bg-[var(--ab)] text-[var(--a)]'
                      : 'bg-[var(--sf2)] text-[var(--mu)] border border-[var(--ln)]'
                }`}
              >
                {saveStatus === 'saving' && (
                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                )}
                {saveStatus === 'saved' && (
                  <Check className="w-3 h-3" aria-hidden="true" />
                )}
                {saveStatus === 'error' && (
                  <AlertCircle className="w-3 h-3" aria-hidden="true" />
                )}
                <span className="hidden sm:inline">
                  {saveStatus === 'saving'
                    ? 'Menyimpan...'
                    : saveStatus === 'saved'
                      ? 'Tersimpan'
                      : 'Gagal menyimpan'}
                </span>
              </span>
            )}

            <span className="hidden md:inline text-xs text-[var(--mu)] truncate max-w-[200px]">
              {email}
            </span>

            <button
              type="button"
              onClick={onCycleTheme}
              title="Ubah tema tampilan"
              aria-label={`Ubah tema tampilan (saat ini ${themeLabels[theme]})`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ln)] bg-[var(--sf2)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ink)] hover:border-[var(--mu)] transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <ThemeIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{themeLabels[theme]}</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              aria-label="Keluar"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--sf2)] transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>

        <nav aria-label="Menu utama" className="flex gap-1 overflow-x-auto -mb-px">
          {NAV_ITEMS.map(({ key, label }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onSelectTab(key)}
                className={`inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-[var(--pri)] text-[var(--pri)]'
                    : 'border-transparent text-[var(--mu)] hover:text-[var(--ink)]'
                }`}
              >
                <span>{label}</span>
                {key === 'surat' && missingCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-md bg-[var(--a-btn)] text-white text-[11px] font-bold font-mono-num">
                    {missingCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
