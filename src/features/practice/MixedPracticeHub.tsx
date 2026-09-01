import { ArrowRight, BarChart3, BookOpenText, Brain, ChevronLeft, ChevronRight, Clock3, FileCheck2, Headphones, Inbox, Languages, Layers3, ListChecks, NotebookTabs, RotateCcw, Target, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AppView, DraftSummary, LearningCapture, ListeningQuestion, PracticeAttempt, ProgressState, Question, ReadingQuestion, StudyPlanDocument, VocabItem } from '../../types';

type ModuleSummary = { view: AppView; title: string; body: string; count: number };
const MIXED_ENTRY_PAGE_SIZE = 8;

export function MixedPracticeHub({
  labels,
  questions,
  items,
  progress,
  latestAttempt,
  modules,
  captures,
  drafts,
  listeningQuestions,
  readingQuestions,
  studyPlan,
  answeredCount,
  correctCount,
  onStart,
  onStartMock,
  onOpenAllEntries,
  onReview,
  onNavigate,
}: {
  labels: Record<string, string>;
  questions: Question[];
  items: VocabItem[];
  progress: ProgressState;
  latestAttempt?: PracticeAttempt;
  modules: ModuleSummary[];
  captures: LearningCapture[];
  drafts: DraftSummary[];
  listeningQuestions: ListeningQuestion[];
  readingQuestions: ReadingQuestion[];
  studyPlan: StudyPlanDocument;
  answeredCount: number;
  correctCount: number;
  onStart: () => void;
  onStartMock: () => void;
  onOpenAllEntries: () => void;
  onReview: () => void;
  onNavigate: (view: AppView) => void;
}) {
  const dueCount = Object.values(progress).filter((item) => !item.nextReviewAt || item.nextReviewAt <= new Date().toISOString()).length;
  const weakCount = Object.values(progress).filter((item) => item.wrong > item.correct || item.status === 'learning').length;
  const latestAccuracy = latestAttempt?.summary ? Math.round(latestAttempt.summary.accuracy * 100) : null;
  const grammarCount = items.filter((item) => item.deck === 'grammar_expression').length;
  const vocabularyCount = items.filter((item) => item.deck !== 'grammar_expression').length;
  const progressCount = Object.keys(progress).length;
  const pendingCaptureCount = captures.filter((capture) => capture.status === 'inbox').length;
  const processedCaptureCount = captures.filter((capture) => capture.status === 'processed').length;
  const activeDraftCount = drafts.filter((draft) => draft.status !== 'archived').length;
  const archivedDraftCount = drafts.filter((draft) => draft.status === 'archived').length;
  const plannedTaskCount = studyPlan.tasks.length;
  const doneTaskCount = studyPlan.tasks.filter((task) => task.status === 'done').length;

  return (
    <main className="ledger-mixed">
      <header className="ledger-mixed-heading">
        <div>
          <p>{labels.navMixed}&nbsp; / &nbsp;{labels.mixedHubEyebrow}</p>
          <h1>{labels.mixedHubTitle}</h1>
          <span>{labels.mixedHubBody}</span>
        </div>
        <button type="button" onClick={onOpenAllEntries} className="ledger-mixed-link">
          <NotebookTabs size={17} />{labels.mixedHubAllEntries}<ArrowRight size={15} />
        </button>
      </header>

      <section className="ledger-mixed-focus">
        <header>
          <div><span className="ledger-step">1</span><div><h2>{labels.mixedHubStart}</h2><p>{labels.navVocabulary} {vocabularyCount} · {labels.navGrammar} {grammarCount}</p></div></div>
          <button type="button" onClick={onStart} className="ledger-primary-button"><RotateCcw size={17} />{labels.mixedHubStart}</button>
        </header>
        <div className="ledger-mixed-metrics">
          <MixedMetric icon={Layers3} label={labels.mixedHubTotalQuestions} value={questions.length} />
          <MixedMetric icon={BarChart3} label={labels.dueReview} value={dueCount} tone="green" />
          <MixedMetric icon={Target} label={labels.mixedHubWeakItems} value={weakCount} tone="attention" />
        </div>
      </section>

      <div className="ledger-mixed-secondary">
        <section className="ledger-mixed-result">
          <header><div><span className="ledger-step is-outline">2</span><div><h2>{labels.mixedHubLastTitle}</h2><p>{labels.mixedHubReviewLast}</p></div></div></header>
          {latestAttempt?.summary ? (
            <div className="ledger-mixed-result-body"><strong>{latestAccuracy}%</strong><div><p>{labels.correct}: {latestAttempt.summary.correct} / {latestAttempt.summary.total}</p><i><span style={{ width: `${latestAccuracy ?? 0}%` }} /></i></div></div>
          ) : (
            <p className="ledger-mixed-empty">{labels.mixedHubLastEmpty}</p>
          )}
          <footer><button type="button" onClick={onReview}>{labels.mixedHubReviewLast}<ArrowRight size={15} /></button><button type="button" onClick={() => onNavigate('insights')}>{labels.mixedHubManageData}<ArrowRight size={15} /></button></footer>
        </section>

        <section className="ledger-mixed-mock">
          <header><FileCheck2 size={20} /><div><h2>{labels.navMockExams}</h2><p>N1-N5 · 2套/级</p></div></header>
          <div><p>外部 Agent 写回练习题 · 非官方真题 · 系统合成听力</p><strong>文字词汇 · 语法 · 阅读 · 听力</strong></div>
          <button type="button" onClick={onStartMock} className="ledger-primary-button"><Clock3 size={17} />进入</button>
        </section>
      </div>

      <section className="ledger-mixed-inventory">
        <header><div><p>{labels.mixedHubAllDataEyebrow}</p><h2>{labels.mixedHubAllDataTitle}</h2></div><button type="button" onClick={() => onNavigate('insights')}>{labels.mixedHubManageData}<ArrowRight size={15} /></button></header>
        <div className="ledger-inventory-grid">
          <InventoryTile icon={Layers3} label={labels.mixedHubDataEntries} value={items.length} detail={`${labels.navGrammar} ${grammarCount} / ${labels.navVocabulary} ${vocabularyCount}`} />
          <InventoryTile icon={BarChart3} label={labels.mixedHubDataPractice} value={questions.length} detail={`${labels.answered} ${answeredCount} / ${labels.correct} ${correctCount}`} />
          <InventoryTile icon={Inbox} label={labels.mixedHubDataWorkflow} value={captures.length + drafts.length} detail={`${labels.dataCapturesTab} ${pendingCaptureCount + processedCaptureCount} / ${labels.dataDraftsTab} ${drafts.length}`} />
          <InventoryTile icon={NotebookTabs} label={labels.mixedHubDataBanks} value={listeningQuestions.length + readingQuestions.length} detail={`${labels.navReading} ${readingQuestions.length} / ${labels.navListening} ${listeningQuestions.length}`} />
        </div>
        <dl className="ledger-inventory-lines">
          <InventoryLine label={labels.mixedHubDataProgress} value={`${progressCount}`} detail={`${labels.mixedHubWeakItems} ${weakCount}`} />
          <InventoryLine label={labels.mixedHubDataDrafts} value={`${activeDraftCount}/${drafts.length}`} detail={`${labels.mixedHubDataArchived}: ${archivedDraftCount}`} />
          <InventoryLine label={labels.mixedHubDataPlan} value={`${doneTaskCount}/${plannedTaskCount}`} detail={studyPlan.status} />
        </dl>
      </section>

      <section className="ledger-mixed-sources">
        <header><p>{labels.mixedHubSourceModules}</p><h2>{labels.mixedHubChooseSource}</h2></header>
        <div>
          {modules.filter((module) => module.view !== 'mixed').map((module) => {
            const Icon = moduleIcon(module.view);
            return (
              <button key={module.view} type="button" onClick={() => onNavigate(module.view)}>
                <span><Icon size={19} /></span><span><strong>{module.title}</strong><small>{module.body}</small></span><b>{module.count}</b><ArrowRight size={16} />
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

type CombinedEntry = {
  id: string;
  module: AppView;
  title: string;
  subtitle?: string;
  createdAt?: string;
  level?: string;
  tags: string[];
  questionCount: number;
};

export function MixedEntryIndexPanel({
  labels,
  locale,
  items,
  listeningQuestions,
  readingQuestions,
  onOpenModule,
}: {
  labels: Record<string, string>;
  locale: string;
  items: VocabItem[];
  listeningQuestions: ListeningQuestion[];
  readingQuestions: ReadingQuestion[];
  onOpenModule: (view: AppView) => void;
}) {
  const entries = combinedEntries(items, listeningQuestions, readingQuestions, labels);
  const [pageIndex, setPageIndex] = useState(0);
  const pageCount = Math.max(1, Math.ceil(entries.length / MIXED_ENTRY_PAGE_SIZE));
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const pageStart = currentPage * MIXED_ENTRY_PAGE_SIZE;
  const pageItems = entries.slice(pageStart, pageStart + MIXED_ENTRY_PAGE_SIZE);
  const pageEnd = pageStart + pageItems.length;
  const counts = {
    vocabulary: entries.filter((entry) => entry.module === 'vocabulary').length,
    grammar: entries.filter((entry) => entry.module === 'grammar').length,
    listening: entries.filter((entry) => entry.module === 'listening').length,
    reading: entries.filter((entry) => entry.module === 'reading').length,
  };

  useEffect(() => {
    setPageIndex((index) => Math.min(index, pageCount - 1));
  }, [pageCount]);

  return (
    <section className="min-w-0 overflow-hidden bg-white md:rounded-lg md:border md:border-[#d8cdbc] md:shadow-sm">
      <div className="border-b border-[#e5ddd1] px-4 py-4 md:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#a84269]">{labels.navMixed}</p>
            <h2 className="text-xl font-black text-[#27312c]">{labels.mixedHubAllEntries}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CountPill label={labels.navVocabulary} value={counts.vocabulary} />
            <CountPill label={labels.navGrammar} value={counts.grammar} />
            <CountPill label={labels.navListening} value={counts.listening} />
            <CountPill label={labels.navReading} value={counts.reading} />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed border-collapse text-left text-sm">
          <thead className="bg-[#f3f6f1] text-xs font-semibold text-[#5b665f]">
            <tr>
              <th className="w-[12%] px-4 py-3">{labels.mixedHubEntryColumnModule}</th>
              <th className="w-[28%] px-3 py-3">{labels.entryColumnItem}</th>
              <th className="w-[17%] px-3 py-3">{labels.entryColumnCreated}</th>
              <th className="w-[9%] px-3 py-3">{labels.entryColumnLevel}</th>
              <th className="w-[20%] px-3 py-3">{labels.entryColumnTags}</th>
              <th className="w-[7%] px-3 py-3">{labels.entryColumnQuestions}</th>
              <th className="w-[7%] px-3 py-3 text-right"><span className="sr-only">{labels.entryOpen}</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ece4d8]">
            {pageItems.map((entry) => (
              <tr key={`${entry.module}-${entry.id}`} className="bg-white hover:bg-[#fbf8f2]">
                <td className="px-4 py-3 align-top">
                  <ModuleBadge module={entry.module} labels={labels} />
                </td>
                <td className="px-3 py-3 align-top">
                  <button type="button" onClick={() => onOpenModule(entry.module)} className="block min-w-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24473f]">
                    <span className="block break-words text-base font-semibold text-[#173d35]">{entry.title}</span>
                    {entry.subtitle ? <span className="mt-1 block break-words text-xs font-semibold text-[#856033]">{entry.subtitle}</span> : null}
                  </button>
                </td>
                <td className="px-3 py-3 align-top text-[#4d5751]">{formatEntryDate(entry.createdAt, locale)}</td>
                <td className="px-3 py-3 align-top">
                  <span className="rounded bg-[#f1eee8] px-2 py-1 text-xs font-semibold text-[#584f43]">{entry.level ?? '-'}</span>
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    {entry.tags.length ? entry.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="max-w-full truncate rounded bg-[#e8f0eb] px-2 py-1 text-xs font-semibold text-[#31564c]" title={tag}>{tag}</span>
                    )) : <span className="text-xs font-semibold text-[#8a8175]">-</span>}
                  </div>
                </td>
                <td className="px-3 py-3 align-top font-semibold text-[#3f4b45]">{entry.questionCount}</td>
                <td className="px-3 py-3 align-top text-right">
                  <button type="button" onClick={() => onOpenModule(entry.module)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#ead1dc] bg-white text-[#a84269] hover:bg-[#fff0f5]" aria-label={`${labels.entryOpen}: ${entry.title}`} title={labels.entryOpen}>
                    <ArrowRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e5ddd1] px-4 py-3 text-sm text-[#59645e] md:px-5">
        <span className="font-semibold">
          {entries.length ? `${pageStart + 1}-${pageEnd}` : '0'} / {entries.length} {labels.items}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={labels.entryPagePrev}
            title={labels.entryPagePrev}
            disabled={currentPage === 0}
            onClick={() => setPageIndex((index) => Math.max(0, index - 1))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#c8bcae] bg-white text-[#24473f] hover:bg-[#f2f6f1] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-14 text-center font-semibold text-[#34443c]">{currentPage + 1} / {pageCount}</span>
          <button
            type="button"
            aria-label={labels.entryPageNext}
            title={labels.entryPageNext}
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPageIndex((index) => Math.min(pageCount - 1, index + 1))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#c8bcae] bg-white text-[#24473f] hover:bg-[#f2f6f1] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}

function combinedEntries(items: VocabItem[], listeningQuestions: ListeningQuestion[], readingQuestions: ReadingQuestion[], labels: Record<string, string>) {
  const itemEntries: CombinedEntry[] = items.map((item) => {
    const module = item.deck === 'grammar_expression' ? 'grammar' : 'vocabulary';
    return {
      id: item.id,
      module,
      title: item.original,
      subtitle: item.reading,
      createdAt: item.input_at ?? item.date,
      level: item.jlpt_level,
      tags: [
        ...(item.question_kinds ?? []).map((kind) => questionKindLabel(kind, labels)),
        ...(item.tags ?? []).map((tag) => tag === 'mcp-draft' ? labels.entryTagDraft : tag === 'codex-chat-review' ? labels.entryTagChatReview : tag),
      ].filter(Boolean),
      questionCount: item.question_kinds?.length || item.practice_questions?.length || 0,
    };
  });
  const listeningEntries: CombinedEntry[] = listeningQuestions.map((question) => ({
    id: question.id,
    module: 'listening',
    title: question.title,
    subtitle: question.question,
    createdAt: question.createdAt,
    tags: [question.questionTypeId],
    questionCount: 1,
  }));
  const readingEntries: CombinedEntry[] = readingQuestions.map((question) => ({
    id: question.id,
    module: 'reading',
    title: question.title,
    subtitle: question.question,
    createdAt: question.createdAt,
    tags: [labels.navReading],
    questionCount: 1,
  }));
  return [...itemEntries, ...listeningEntries, ...readingEntries]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || a.title.localeCompare(b.title, 'ja'));
}

function questionKindLabel(kind: string, labels: Record<string, string>) {
  if (kind === 'grammar') return labels.grammar;
  if (kind === 'meaning') return labels.meaning;
  if (kind === 'moji_goi') return labels.mojiGoi;
  if (kind === 'kana_to_kanji') return labels.kanaToKanji;
  if (kind === 'kanji_to_kana') return labels.kanjiToKana;
  return kind;
}

function formatEntryDate(value: string | undefined, locale: string) {
  return value ? new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '-';
}

function CountPill({ label, value }: { label: string; value: number }) {
  return <span className="rounded-md bg-[#e8f0eb] px-3 py-1 text-sm font-semibold text-[#24473f]">{label}: {value}</span>;
}

function ModuleBadge({ module, labels }: { module: AppView; labels: Record<string, string> }) {
  const text = module === 'grammar'
    ? labels.navGrammar
    : module === 'listening'
      ? labels.navListening
      : module === 'reading'
        ? labels.navReading
        : labels.navVocabulary;
  return <span className="rounded bg-[#fff8df] px-2 py-1 text-xs font-bold text-[#775516]">{text}</span>;
}

function MixedMetric({ icon: Icon, label, value, tone = 'indigo' }: { icon: LucideIcon; label: string; value: number; tone?: 'indigo' | 'green' | 'attention' }) {
  return <div className={`ledger-mixed-metric is-${tone}`}><Icon size={18} /><span><strong>{value}</strong><small>{label}</small></span></div>;
}

function InventoryTile({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: number; detail: string }) {
  return <article><span><Icon size={18} /></span><strong>{value}</strong><h3>{label}</h3><p>{detail}</p></article>;
}

function InventoryLine({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div><dt>{label}<small>{detail}</small></dt><dd>{value}</dd></div>;
}

function moduleIcon(view: AppView) {
  if (view === 'vocabulary') return Languages;
  if (view === 'grammar') return Brain;
  if (view === 'listening') return Headphones;
  if (view === 'reading') return BookOpenText;
  return Layers3;
}
