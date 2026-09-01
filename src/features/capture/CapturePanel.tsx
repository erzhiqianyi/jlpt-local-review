import { useState, type KeyboardEvent } from 'react';
import type { Deck, LearningCaptureCategory, Wordbook } from '../../types';

export function CapturePanel({ labels, deckLabels, wordbooks, onSave, onCreateWordbook, onOpenHistory }: {
  labels: Record<string, string>;
  deckLabels: Record<Deck | 'all', string>;
  wordbooks: Wordbook[];
  onSave: (input: { body: string; category: LearningCaptureCategory; targetDeck?: Deck; targetWordbookId?: string }) => Promise<void>;
  onCreateWordbook: (title: string) => Promise<Wordbook | null>;
  onOpenHistory: () => void;
}) {
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<LearningCaptureCategory>('unsure');
  const [targetWordbookId, setTargetWordbookId] = useState('n1_vocab');
  const [newWordbookTitle, setNewWordbookTitle] = useState('');
  const [creatingWordbook, setCreatingWordbook] = useState(false);
  const [wordbookError, setWordbookError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const vocabularyWordbooks = wordbooks.filter((wordbook) => wordbook.deck !== 'grammar_expression');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim() || saving) return;
    setSaving(true);
    setSaved(false);
    try {
      const targetWordbook = vocabularyWordbooks.find((wordbook) => wordbook.id === targetWordbookId);
      await onSave({
        body: body.trim(),
        category,
        targetDeck: category === 'word' ? targetWordbook?.deck ?? 'n1_vocab' : undefined,
        targetWordbookId: category === 'word' ? targetWordbook?.id ?? 'n1_vocab' : undefined,
      });
      setBody('');
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  function submitWordCaptureOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (category !== 'word') return;
    if (event.key !== 'Enter' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  async function createWordbook() {
    if (!newWordbookTitle.trim() || creatingWordbook) return;
    setCreatingWordbook(true);
    setWordbookError('');
    try {
      const wordbook = await onCreateWordbook(newWordbookTitle.trim());
      if (wordbook) {
        setTargetWordbookId(wordbook.id);
        setNewWordbookTitle('');
      }
    } catch (error) {
      setWordbookError(error instanceof Error ? error.message : labels.wordbookCreateFailed);
    } finally {
      setCreatingWordbook(false);
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
            onKeyDown={submitWordCaptureOnEnter}
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
          {category === 'word' ? (
            <label className="text-sm font-semibold text-[#4f5b55]">
              {labels.captureTargetDeck}
              <select value={targetWordbookId} onChange={(event) => setTargetWordbookId(event.target.value)} className="mt-2 block h-11 min-w-48 rounded-md border border-[#c8d1c8] bg-white px-3 text-sm">
                {vocabularyWordbooks.map((wordbook) => <option key={wordbook.id} value={wordbook.id}>{wordbook.title}</option>)}
              </select>
            </label>
          ) : null}
          <button type="submit" disabled={!body.trim() || saving} className="h-11 rounded-md bg-[#31564c] px-6 text-sm font-semibold text-white disabled:opacity-45">
            {saving ? labels.captureSaving : labels.captureSave}
          </button>
        </div>
      </form>

      {category === 'word' ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-sm font-semibold text-[#4f5b55]">
            {labels.wordbookNewName}
            <input
              value={newWordbookTitle}
              onChange={(event) => setNewWordbookTitle(event.target.value)}
              maxLength={60}
              placeholder={labels.wordbookCreatePlaceholder}
              className="mt-2 h-10 w-full rounded-md border border-[#c8d1c8] bg-white px-3 text-sm outline-none focus:border-[#31564c]"
            />
          </label>
          <button type="button" onClick={createWordbook} disabled={!newWordbookTitle.trim() || creatingWordbook} className="h-10 rounded-md border border-[#c8d1c8] bg-white px-4 text-sm font-semibold text-[#31564c] disabled:cursor-wait disabled:opacity-50">
            {creatingWordbook ? labels.processing : labels.wordbookCreate}
          </button>
          {wordbookError ? <p role="alert" className="text-sm font-semibold text-[#8f3d2e]">{wordbookError}</p> : null}
        </div>
      ) : null}

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
