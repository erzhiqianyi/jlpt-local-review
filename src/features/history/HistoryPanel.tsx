import { useState } from 'react';
import type { LearningCapture, LearningCaptureStatus, Locale, PracticeAttempt } from '../../types';

export function HistoryPanel({ labels, locale, captures, attempts, onCaptureStatus, embedded = false, mode = 'both' }: {
  labels: Record<string, string>;
  locale: Locale;
  captures: LearningCapture[];
  attempts: PracticeAttempt[];
  onCaptureStatus: (id: string, status: LearningCaptureStatus) => Promise<void>;
  embedded?: boolean;
  mode?: 'both' | 'captures' | 'practice';
}) {
  const [view, setView] = useState<'captures' | 'practice'>('captures');
  const activeView = mode === 'both' ? view : mode;

  return (
    <section className={embedded ? 'py-2' : 'mx-auto w-full max-w-4xl py-2 md:py-5'}>
      {!embedded ? <><p className="text-sm font-semibold text-[#7d6032]">{labels.historyEyebrow}</p><h1 className="mt-1 text-2xl font-semibold text-[#27312c]">{labels.historyPageTitle}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#68716b]">{labels.historyPageBody}</p></> : null}

      {mode === 'both' ? <div className="mt-5 flex border-b border-[#d7dfd6]" role="tablist">
        <HistoryTab active={view === 'captures'} label={`${labels.historyCaptureTab} ${captures.length}`} onClick={() => setView('captures')} />
        <HistoryTab active={view === 'practice'} label={`${labels.historyPracticeTab} ${attempts.length}`} onClick={() => setView('practice')} />
      </div> : null}

      {activeView === 'captures' ? (
        captures.length ? <div className="divide-y divide-[#dfe5df] border-b border-[#dfe5df]">
          {captures.map((capture) => (
            <article key={capture.id} className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-[#7d6032]">{labels[`captureCategory_${capture.category}`]}</span>
                    <span className="text-[#7a807b]">{formatDate(capture.createdAt, locale)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-base leading-7 text-[#34413b]">{capture.body}</p>
                </div>
                <button type="button" onClick={() => onCaptureStatus(capture.id, capture.status === 'processed' ? 'inbox' : 'processed')} className="min-h-10 shrink-0 rounded-md border border-[#c8d1c8] bg-white px-3 text-xs font-semibold text-[#31564c]">
                  {capture.status === 'processed' ? labels.captureMarkInbox : labels.captureMarkProcessed}
                </button>
              </div>
            </article>
          ))}
        </div> : <Empty text={labels.historyNoCaptures} />
      ) : attempts.length ? (
        <div className="divide-y divide-[#dfe5df] border-b border-[#dfe5df]">
          {attempts.map((attempt) => (
            <article key={attempt.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-sm font-semibold text-[#34413b]">{labels[`nav${viewName(attempt.view)}`] ?? attempt.view}</p>
                <p className="mt-1 text-xs text-[#7a807b]">{formatDate(attempt.completedAt ?? attempt.startedAt, locale)}</p>
              </div>
              <p className="text-sm text-[#4f5b55]">{attempt.summary?.correct ?? 0} / {attempt.summary?.total ?? attempt.answers.length} · {Math.round((attempt.summary?.accuracy ?? 0) * 100)}%</p>
            </article>
          ))}
        </div>
      ) : <Empty text={labels.historyNoPractice} />}
    </section>
  );
}

function HistoryTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`min-h-11 border-b-2 px-4 text-sm font-semibold ${active ? 'border-[#31564c] text-[#31564c]' : 'border-transparent text-[#707a74]'}`}>{label}</button>;
}

function Empty({ text }: { text: string }) {
  return <p className="py-12 text-center text-sm text-[#7a807b]">{text}</p>;
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'zh-CN' ? 'zh-CN' : locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function viewName(view: PracticeAttempt['view']) {
  return view.charAt(0).toUpperCase() + view.slice(1);
}
