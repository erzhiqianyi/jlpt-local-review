import { useEffect, useState } from 'react';
import { officialN1QuestionTypes } from '../../data/questionTypes';
import type { Locale } from '../../types';

const OFFICIAL_SOURCE_URL = 'https://www.jlpt.jp/e/guideline/testsections.html';

type QuestionTypeDetailProps = {
  id: string;
  labels: Record<string, string>;
  locale: Locale;
  customTip?: string;
  onBack: () => void;
  onUpdateTip: (id: string, tip: string) => void;
};

export function QuestionTypeDetail({ id, labels, locale, customTip, onBack, onUpdateTip }: QuestionTypeDetailProps) {
  const item = officialN1QuestionTypes.find((candidate) => candidate.id === id);
  const [editing, setEditing] = useState(false);
  const [draftTip, setDraftTip] = useState('');

  useEffect(() => {
    setEditing(false);
    setDraftTip('');
  }, [id]);

  if (!item) {
    return (
      <section className="py-10">
        <p className="text-sm text-[#68716b]">{labels.questionTypeNotFound}</p>
        <button type="button" onClick={onBack} className="mt-4 min-h-10 text-sm font-semibold text-[#31564c] hover:underline">← {labels.questionTypeBackToList}</button>
      </section>
    );
  }

  const displayedTip = customTip || item.defaultTip[locale];

  function startEditing() {
    setDraftTip(displayedTip);
    setEditing(true);
  }

  function saveTip() {
    onUpdateTip(id, draftTip.trim());
    setEditing(false);
  }

  return (
    <article className="min-w-0">
      <button type="button" onClick={onBack} className="min-h-10 text-sm font-semibold text-[#31564c] hover:underline">← {labels.questionTypeBackToList}</button>

      <header className="mt-3 border-b border-[#d7dfd6] pb-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#7d6032]">JLPT N1 · {labels[`questionTypeSection_${item.section}`]}</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#27312c]">{item.name[locale]}</h1>
            <p className="mt-1 text-sm font-semibold text-[#7d6032]">{item.officialName}</p>
          </div>
          {customTip ? <span className="w-fit rounded bg-[#e7f0eb] px-2 py-1 text-xs font-semibold text-[#31564c]">{labels.questionTypePersonalized}</span> : null}
        </div>
      </header>

      <section className="border-b border-[#dfe5dc] py-6">
        <p className="text-xs font-semibold text-[#6b746e]">{labels.questionTypeQuestionForm}</p>
        <p className="mt-2 max-w-3xl text-base leading-7 text-[#3f5149]">{item.description[locale]}</p>
      </section>

      <section className="py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#6b746e]">{customTip ? labels.questionTypeMyTip : labels.questionTypeDefaultTip}</p>
            <h2 className="mt-1 text-lg font-semibold text-[#27312c]">{labels.questionTypeSolvingApproach}</h2>
          </div>
          {!editing ? <button type="button" onClick={startEditing} className="h-10 rounded-md border border-[#c8d1c8] bg-white px-4 text-sm font-semibold text-[#31564c] hover:bg-[#f3f6f1]">{labels.questionTypeEditTip}</button> : null}
        </div>

        {editing ? (
          <div className="mt-4 max-w-3xl">
            <textarea aria-label={labels.questionTypeTipEditor} value={draftTip} onChange={(event) => setDraftTip(event.target.value)} maxLength={2000} className="min-h-44 w-full rounded-md border border-[#c8d1c8] bg-white p-4 text-base leading-7" />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={saveTip} className="h-10 rounded-md bg-[#31564c] px-4 text-sm font-semibold text-white">{labels.questionTypeSaveTip}</button>
              <button type="button" onClick={() => setEditing(false)} className="h-10 rounded-md border border-[#d7dfd6] bg-white px-4 text-sm font-semibold text-[#4f5b55]">{labels.questionTypeCancel}</button>
              {customTip ? <button type="button" onClick={() => { onUpdateTip(id, ''); setEditing(false); }} className="h-10 rounded-md border border-[#d9c9c3] bg-white px-4 text-sm font-semibold text-[#7a4d42]">{labels.questionTypeResetTip}</button> : null}
            </div>
          </div>
        ) : (
          <p className="mt-4 max-w-3xl whitespace-pre-wrap border-l-2 border-[#c3a45b] pl-4 text-base leading-7 text-[#3f5149]">{displayedTip}</p>
        )}
      </section>

      <footer className="border-t border-[#dfe5dc] pt-4">
        <p className="text-xs leading-5 text-[#7a807b]">{labels.questionTypeTipNotice}</p>
        <a href={OFFICIAL_SOURCE_URL} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-[#31564c] hover:underline">{labels.questionTypeOfficialSource} ↗</a>
      </footer>
    </article>
  );
}
