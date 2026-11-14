import React, { useEffect, useRef, useState } from 'react';
import type { ClassRoom, Student } from '../types/sims';
import { PHOTO_PLACEHOLDER } from '../utils/simsLogic';

interface PhotoPreviewModalProps {
  open: boolean;
  src: string;
  caption: string;
  onClose: () => void;
}

export const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  open,
  src,
  caption,
  onClose,
}) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto rounded-2xl border border-[var(--ln)] bg-[var(--sf)] text-[var(--ink)] p-5 w-[min(480px,92vw)] max-w-[92vw] shadow-2xl"
    >
      <h2 className="text-base font-bold mb-3">Pratinjau Foto Surat</h2>
      <img
        src={src || PHOTO_PLACEHOLDER}
        alt={caption || 'Foto surat'}
        className="max-w-full max-h-[68vh] block mx-auto mb-3 rounded-lg border border-[var(--ln)]"
      />
      <div className="text-xs text-[var(--mu)] text-center mb-4">{caption}</div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-4 py-2 text-sm font-semibold hover:bg-[var(--sf2)] transition cursor-pointer"
        >
          Tutup
        </button>
      </div>
    </dialog>
  );
};

interface EditStudentModalProps {
  student: Student | null;
  classes: ClassRoom[];
  existingStudents: Student[];
  onClose: () => void;
  onSave: (
    studentId: number,
    updates: { n: string; nis: string; c: number; g: 'L' | 'P' | '' }
  ) => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  student,
  classes,
  existingStudents,
  onClose,
  onSave,
}) => {
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState('');
  const [nis, setNis] = useState('');
  const [classId, setClassId] = useState(0);
  const [gender, setGender] = useState<'L' | 'P' | ''>('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (student) {
      setName(student.n);
      setNis(student.nis);
      setClassId(student.c);
      setGender(student.g || '');
      setErr('');
    }
  }, [student]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (student && !dialog.open) dialog.showModal();
    else if (!student && dialog.open) dialog.close();
  }, [student]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    const cleanName = name.trim();
    const cleanNis = nis.trim();
    if (!cleanName || !cleanNis) {
      setErr('Nama dan NIS wajib diisi.');
      return;
    }
    if (
      existingStudents.some((o) => o.id !== student.id && o.nis === cleanNis)
    ) {
      setErr('NIS sudah dipakai siswa lain.');
      return;
    }
    onSave(student.id, {
      n: cleanName,
      nis: cleanNis,
      c: classId,
      g: gender,
    });
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto rounded-2xl border border-[var(--ln)] bg-[var(--sf)] text-[var(--ink)] p-5 w-[min(460px,92vw)] max-w-[92vw] shadow-2xl"
    >
      <h2 className="text-base font-bold mb-3">Edit Data Siswa</h2>
      <form onSubmit={handleSave} className="space-y-3">
        <label className="block text-xs font-semibold text-[var(--mu)]">
          Nama siswa
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full min-h-[38px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-1.5 text-sm text-[var(--ink)]"
          />
        </label>
        <label className="block text-xs font-semibold text-[var(--mu)]">
          NIS
          <input
            value={nis}
            onChange={(e) => setNis(e.target.value)}
            className="mt-1 w-full min-h-[38px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-1.5 text-sm text-[var(--ink)] font-mono-num"
          />
        </label>
        <label className="block text-xs font-semibold text-[var(--mu)]">
          Kelas
          <select
            value={classId}
            onChange={(e) => setClassId(Number(e.target.value))}
            className="mt-1 w-full min-h-[38px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-1.5 text-sm text-[var(--ink)]"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.n}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-[var(--mu)]">
          L/P
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as 'L' | 'P' | '')}
            className="mt-1 w-full min-h-[38px] rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-3 py-1.5 text-sm text-[var(--ink)]"
          >
            <option value="">-</option>
            <option value="L">L (Laki-laki)</option>
            <option value="P">P (Perempuan)</option>
          </select>
        </label>

        {err && (
          <div role="alert" className="text-xs font-semibold text-[var(--a)]">
            {err}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--ln)] bg-[var(--sf)] px-4 py-2 text-sm font-semibold hover:bg-[var(--sf2)] transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            className="rounded-lg bg-[var(--pri-btn)] text-white px-4 py-2 text-sm font-semibold hover:brightness-105 transition cursor-pointer"
          >
            Simpan perubahan
          </button>
        </div>
      </form>
    </dialog>
  );
};
