import { useMemo, useState } from 'react';
import { officialN1QuestionTypes, type QuestionTypeSection } from '../../data/questionTypes';
import type { Locale } from '../../types';

const OFFICIAL_SOURCE_URL = 'https://www.jlpt.jp/e/guideline/testsections.html';
const sections: QuestionTypeSection[] = ['vocabulary', 'grammar', 'reading', 'listening'];

type QuestionTypeGuideProps = {
  labels: Record<string, string>;
  locale: Locale;
  customTips: Record<string, string>;
  onOpen: (id: string) => void;
};

export function QuestionTypeGuide({ labels, locale, customTips, onOpen }: QuestionTypeGuideProps) {
  const [activeSection, setActiveSection] = useState<QuestionTypeSection>('vocabulary');
  const visibleTypes = useMemo(
    () => officialN1QuestionTypes.filter((item) => item.section === activeSection),
    [activeSection],
  );

  return (
    <section className="min-w-0">
      <div className="flex flex-col gap-3 border-b border-[#d7dfd6] pb-5 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-[#7d6032]">JLPT N1</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#27312c]">{labels.questionTypeGuideTitle}</h1>
          <p className="mt-2 text-sm leading-6 text-[#68716b]">{labels.questionTypeGuideBody}</p>
        </div>
        <a href={OFFICIAL_SOURCE_URL} target="_blank" rel="noreferrer" className="min-h-10 shrink-0 py-2 text-sm font-semibold text-[#31564c] underline-offset-4 hover:underline">
          {labels.questionTypeOfficialSource}
        </a>
      </div>

      <div className="flex max-w-full gap-2 overflow-x-auto border-b border-[#d7dfd6] py-4">
        {sections.map((section) => (
          <button
            key={section}
            type="button"
            onClick={() => setActiveSection(section)}
            className={`h-10 shrink-0 rounded-md px-4 text-sm font-semibold ${activeSection === section ? 'bg-[#31564c] text-white' : 'border border-[#d7dfd6] bg-white text-[#4f5b55] hover:bg-[#f3f6f1]'}`}
          >
            {labels[`questionTypeSection_${section}`]}
          </button>
        ))}
      </div>

      <div className="divide-y divide-[#dfe5dc] border-b border-[#dfe5dc]">
        {visibleTypes.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(item.id)}
            className="group flex min-h-24 w-full items-center gap-4 py-4 text-left hover:bg-[#f7f9f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31564c]"
          >
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold text-[#27312c]">{item.name[locale]}</span>
                <span className="text-xs font-semibold text-[#7d6032]">{item.officialName}</span>
                {customTips[item.id] ? <span className="rounded bg-[#e7f0eb] px-2 py-1 text-xs font-semibold text-[#31564c]">{labels.questionTypePersonalized}</span> : null}
              </span>
              <span className="mt-1 block text-sm leading-6 text-[#68716b]">{item.description[locale]}</span>
            </span>
            <span aria-hidden="true" className="shrink-0 text-xl text-[#7b8780] transition-transform group-hover:translate-x-1">→</span>
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs leading-5 text-[#7a807b]">{labels.questionTypeTipNotice}</p>
    </section>
  );
}
