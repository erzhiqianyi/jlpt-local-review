import { ChevronLeft, ChevronRight, ExternalLink, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { officialN1QuestionTypes, type QuestionTypeSection } from '../../data/questionTypes';
import type { CustomQuestionTypeTip, Locale } from '../../types';

const sections: QuestionTypeSection[] = ['vocabulary', 'grammar', 'reading', 'listening'];
const QUESTION_TYPE_PAGE_SIZE = 8;

type QuestionTypeGuideProps = {
  labels: Record<string, string>;
  locale: Locale;
  customTips: Record<string, string>;
  customTipEntries: CustomQuestionTypeTip[];
  section?: QuestionTypeSection;
  onOpen: (id: string) => void;
  onCreateCustomTip: (input: { section: QuestionTypeSection; title: string; description: string; tip: string }) => string;
};

export function QuestionTypeGuide({ labels, locale, customTips, customTipEntries, section, onOpen, onCreateCustomTip }: QuestionTypeGuideProps) {
  const [activeSection, setActiveSection] = useState<QuestionTypeSection>(section ?? 'vocabulary');
  const selectedSection = section ?? activeSection;
  const [pageIndex, setPageIndex] = useState(0);
  const [adding, setAdding] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftTip, setDraftTip] = useState('');
  const [mobileVisibleCount, setMobileVisibleCount] = useState(QUESTION_TYPE_PAGE_SIZE);
  const mobileLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const visibleTypes = useMemo(
    () => [
      ...officialN1QuestionTypes
        .filter((item) => item.section === selectedSection)
        .map((item) => ({
          id: item.id,
          title: item.name[locale],
          subtitle: item.officialName,
          tip: customTips[item.id] || item.defaultTip[locale],
          status: customTips[item.id] ? labels.questionTypePersonalized : labels.questionTypeDefaultTip,
          statusClassName: customTips[item.id] ? 'bg-[#e7f0eb] text-[#31564c]' : 'bg-[#f1eee8] text-[#665f55]',
        })),
      ...customTipEntries
        .filter((item) => item.section === selectedSection)
        .map((item) => ({
          id: item.id,
          title: item.title,
          subtitle: labels.questionTypeCustomTip,
          tip: item.tip,
          status: labels.questionTypeCustomTip,
          statusClassName: 'bg-[#e8eef4] text-[#2f526a]',
        })),
    ],
    [customTipEntries, customTips, labels, locale, selectedSection],
  );
  const pageCount = Math.max(1, Math.ceil(visibleTypes.length / QUESTION_TYPE_PAGE_SIZE));
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const pageStart = currentPage * QUESTION_TYPE_PAGE_SIZE;
  const pageItems = visibleTypes.slice(pageStart, pageStart + QUESTION_TYPE_PAGE_SIZE);
  const mobileItems = visibleTypes.slice(0, mobileVisibleCount);
  const pageEnd = pageStart + pageItems.length;
  const mobilePageEnd = Math.min(mobileVisibleCount, visibleTypes.length);

  useEffect(() => {
    setPageIndex(0);
    setMobileVisibleCount(QUESTION_TYPE_PAGE_SIZE);
  }, [selectedSection]);

  useEffect(() => {
    setPageIndex((index) => Math.min(index, pageCount - 1));
  }, [pageCount]);

  useEffect(() => {
    const sentinel = mobileLoadMoreRef.current;
    if (!sentinel || mobileVisibleCount >= visibleTypes.length) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setMobileVisibleCount((count) => Math.min(count + QUESTION_TYPE_PAGE_SIZE, visibleTypes.length));
    }, { rootMargin: '240px 0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [mobileVisibleCount, visibleTypes.length]);

  function resetForm() {
    setDraftTitle('');
    setDraftDescription('');
    setDraftTip('');
  }

  function submitCustomTip() {
    const title = draftTitle.trim();
    const tip = draftTip.trim();
    if (!title || !tip) return;
    const id = onCreateCustomTip({
      section: selectedSection,
      title,
      description: draftDescription.trim(),
      tip,
    });
    resetForm();
    setAdding(false);
    onOpen(id);
  }

  return (
    <section className="min-w-0">
      <div className="mobile-action-header flex flex-wrap items-center justify-between gap-3 border-b border-[#d7dfd6] py-4">
        {!section ? <div className="mobile-segment-scroll flex max-w-full gap-2 overflow-x-auto">
          {sections.map((candidate) => (
            <button
              key={candidate}
              type="button"
              onClick={() => setActiveSection(candidate)}
              className={`h-10 shrink-0 rounded-md px-4 text-sm font-semibold ${activeSection === candidate ? 'bg-[#31564c] text-white' : 'border border-[#d7dfd6] bg-white text-[#4f5b55] hover:bg-[#f3f6f1]'}`}
            >
              {labels[`questionTypeSection_${candidate}`]}
            </button>
          ))}
        </div> : <p className="text-sm font-semibold text-[#59645e]">{labels[`questionTypeSection_${selectedSection}`]}</p>}
        <button type="button" onClick={() => setAdding((value) => !value)} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#b9c9c1] bg-white px-3 text-sm font-semibold text-[#31564c] hover:bg-[#f3f6f1]">
          {adding ? <X size={17} /> : <Plus size={17} />}
          {adding ? labels.questionTypeCancel : labels.questionTypeAddCustom}
        </button>
      </div>

      {adding ? (
        <div className="border-b border-[#dfe5dc] bg-[#f8faf7] px-4 py-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <label className="min-w-0 text-sm font-semibold text-[#34443c]">
              <span className="mb-1 block">{labels.questionTypeCustomTitle}</span>
              <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} maxLength={80} className="h-10 w-full rounded-md border border-[#c8d1c8] bg-white px-3 text-sm font-normal text-[#27312c]" />
            </label>
            <label className="min-w-0 text-sm font-semibold text-[#34443c]">
              <span className="mb-1 block">{labels.questionTypeCustomDescription}</span>
              <input value={draftDescription} onChange={(event) => setDraftDescription(event.target.value)} maxLength={200} className="h-10 w-full rounded-md border border-[#c8d1c8] bg-white px-3 text-sm font-normal text-[#27312c]" />
            </label>
          </div>
          <label className="mt-3 block min-w-0 text-sm font-semibold text-[#34443c]">
            <span className="mb-1 block">{labels.questionTypeTipEditor}</span>
            <textarea value={draftTip} onChange={(event) => setDraftTip(event.target.value)} maxLength={2000} className="min-h-28 w-full rounded-md border border-[#c8d1c8] bg-white p-3 text-sm font-normal leading-6 text-[#27312c]" />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={submitCustomTip} disabled={!draftTitle.trim() || !draftTip.trim()} className="h-10 rounded-md bg-[#31564c] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">{labels.questionTypeSaveTip}</button>
            <button type="button" onClick={() => { resetForm(); setAdding(false); }} className="h-10 rounded-md border border-[#d7dfd6] bg-white px-4 text-sm font-semibold text-[#4f5b55]">{labels.questionTypeCancel}</button>
          </div>
        </div>
      ) : null}

      <div className="min-w-0">
        <div className="mobile-list border-b border-[#dfe5dc] md:hidden">
          {mobileItems.map((item) => (
            <button key={item.id} type="button" onClick={() => onOpen(item.id)} className="mobile-list-item mobile-list-link cute-focus" aria-label={`${labels.entryOpen}: ${item.title}`}>
              <span className="mobile-list-main">
                <span className="mobile-list-title">{item.title}</span>
                <span className="mobile-list-subtitle">{item.subtitle}</span>
              </span>
              <span className="mobile-list-note line-clamp-3">{item.tip}</span>
              <span className="mobile-list-tags">
                <span className={`rounded px-2 py-1 text-xs font-semibold ${item.statusClassName}`}>{item.status}</span>
              </span>
              <ChevronRight className="mobile-list-cue" size={18} aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5ddd1] px-4 py-3 text-sm text-[#59645e] md:hidden">
          <span className="font-semibold">{mobilePageEnd} / {visibleTypes.length} {labels.questionType}</span>
          <div ref={mobileLoadMoreRef} className="mobile-load-state">
            {mobilePageEnd >= visibleTypes.length ? labels.mobileNoMore : null}
          </div>
        </div>
        <div className="hidden min-w-0 overflow-x-auto border-b border-[#dfe5dc] md:block md:overflow-x-visible">
          <table className="w-full min-w-[560px] table-fixed border-collapse text-left text-sm md:min-w-0">
            <thead className="bg-[#f3f6f1] text-xs font-semibold text-[#5b665f]">
              <tr>
                <th className="w-[32%] px-4 py-3">{labels.questionType}</th>
                <th className="w-[42%] px-3 py-3">{labels.questionTypeTipPreview}</th>
                <th className="w-[18%] px-3 py-3">{labels.entryColumnStatus}</th>
                <th className="w-[8%] px-4 py-3 text-right"><span className="sr-only">{labels.entryOpen}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dfe5dc]">
              {pageItems.map((item) => {
                return (
                  <tr key={item.id} className="bg-white hover:bg-[#f7f9f5]">
                    <td className="px-4 py-3 align-top">
                      <button type="button" onClick={() => onOpen(item.id)} className="block min-w-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31564c]">
                        <span className="block break-words text-base font-semibold text-[#27312c]">{item.title}</span>
                        <span className="mt-1 block break-words text-xs font-semibold text-[#7d6032]">{item.subtitle}</span>
                      </button>
                    </td>
                    <td className="px-3 py-3 align-top text-[#4f5b55]">
                      <button type="button" onClick={() => onOpen(item.id)} className="line-clamp-2 text-left text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31564c]">
                        {item.tip}
                      </button>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <span className={`rounded px-2 py-1 text-xs font-semibold ${item.statusClassName}`}>{item.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <button type="button" aria-label={`${labels.entryOpen}: ${item.title}`} title={labels.entryOpen} onClick={() => onOpen(item.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#b9c9c1] bg-white text-[#24473f] hover:bg-[#f2f6f1]">
                        <ExternalLink size={17} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e5ddd1] px-4 py-3 text-sm text-[#59645e]">
            <span className="font-semibold">{pageStart + 1}-{pageEnd} / {visibleTypes.length} {labels.questionType}</span>
            <div className="flex items-center gap-2">
              <button type="button" aria-label={labels.entryPagePrev} title={labels.entryPagePrev} disabled={currentPage === 0} onClick={() => setPageIndex((index) => Math.max(0, index - 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#c8bcae] bg-white text-[#24473f] hover:bg-[#f2f6f1] disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft size={18} />
              </button>
              <span className="min-w-14 text-center font-semibold text-[#34443c]">{currentPage + 1} / {pageCount}</span>
              <button type="button" aria-label={labels.entryPageNext} title={labels.entryPageNext} disabled={currentPage >= pageCount - 1} onClick={() => setPageIndex((index) => Math.min(pageCount - 1, index + 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#c8bcae] bg-white text-[#24473f] hover:bg-[#f2f6f1] disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
