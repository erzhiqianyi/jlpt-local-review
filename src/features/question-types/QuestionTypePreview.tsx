import { officialN1QuestionTypes, type QuestionTypeSection } from '../../data/questionTypes';
import type { Locale } from '../../types';

const sections: QuestionTypeSection[] = ['vocabulary', 'grammar', 'reading', 'listening'];

export function QuestionTypePreview({ labels, locale }: { labels: Record<string, string>; locale: Locale }) {
  return (
    <section className="min-w-0 border-y border-[#d4ddd4] py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-[#7d6032]">JLPT N1</p>
          <h2 className="mt-1 text-2xl font-semibold text-[#27312c]">{labels.questionTypeGuideTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-[#68716b]">{labels.questionTypePreviewBody}</p>
        </div>
        <a href="#/question-types" className="inline-flex min-h-10 shrink-0 items-center text-sm font-semibold text-[#31564c] hover:underline">
          {labels.questionTypeOpenGuide} →
        </a>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sections.map((section) => {
          const types = officialN1QuestionTypes.filter((item) => item.section === section);
          return (
            <div key={section} className="min-w-0 border-l-2 border-[#c8d1c8] py-1 pl-3">
              <span className="block text-sm font-semibold text-[#27312c]">{labels[`questionTypeSection_${section}`]}</span>
              <span className="mt-1 block text-xs leading-5 text-[#68716b]">{labels.questionTypeCount.replace('{count}', String(types.length))} · {types[0]?.name[locale]}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
