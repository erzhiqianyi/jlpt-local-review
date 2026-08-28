import { useState } from 'react';
import type { LearningCaptureCategory } from '../../types';

export function CapturePanel({ labels, onSave, onOpenHistory }: {
  labels: Record<string, string>;
  onSave: (input: { body: string; category: LearningCaptureCategory }) => Promise<void>;
  onOpenHistory: () => void;
}) {
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<LearningCaptureCategory>('unsure');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim() || saving) return;
    setSaving(true);
    setSaved(false);
    try {
      await onSave({ body: body.trim(), category });
      setBody('');
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl py-2 md:py-5">
      <p className="text-sm font-semibold text-[#7d6032]">{labels.captureEyebrow}</p>
      <h1 className="mt-1 text-2xl font-semibold text-[#27312c]">{labels.captureTitle}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68716b]">{labels.captureBody}</p>

      <form onSubmit={submit} className="mt-6 border-y border-[#d7dfd6] py-5">
        <label className="block text-sm font-semibold text-[#34413b]">
          {labels.captureInputLabel}
          <textarea
            value={body}
            onChange={(event) => { setBody(event.target.value); setSaved(false); }}
            maxLength={5000}
            autoFocus
            placeholder={labels.capturePlaceholder}
            className="mt-3 min-h-44 w-full resize-y rounded-md border border-[#c8d1c8] bg-white p-4 text-base leading-7 text-[#27312c] outline-none focus:border-[#31564c]"
          />
        </label>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="text-sm font-semibold text-[#4f5b55]">
            {labels.captureCategory}
            <select value={category} onChange={(event) => setCategory(event.target.value as LearningCaptureCategory)} className="mt-2 block h-11 min-w-48 rounded-md border border-[#c8d1c8] bg-white px-3 text-sm">
              {(['unsure', 'word', 'grammar', 'sentence', 'listening', 'reading'] as LearningCaptureCategory[]).map((value) => <option key={value} value={value}>{labels[`captureCategory_${value}`]}</option>)}
            </select>
          </label>
          <button type="submit" disabled={!body.trim() || saving} className="h-11 rounded-md bg-[#31564c] px-6 text-sm font-semibold text-white disabled:opacity-45">
            {saving ? labels.captureSaving : labels.captureSave}
          </button>
        </div>
      </form>

      {saved ? (
        <div role="status" className="mt-5 border-l-2 border-[#7fa18a] pl-4">
          <p className="text-sm font-semibold text-[#356146]">{labels.captureSaved}</p>
          <p className="mt-1 text-sm leading-6 text-[#68716b]">{labels.captureSavedBody}</p>
          <button type="button" onClick={onOpenHistory} className="mt-2 min-h-10 text-sm font-semibold text-[#31564c] hover:underline">{labels.captureOpenHistory}</button>
        </div>
      ) : null}
    </section>
  );
}
