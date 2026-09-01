import { ChevronLeft, ChevronRight, ExternalLink, House, Lightbulb, LoaderCircle, Plus, RotateCcw, ScrollText, Target, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode, type TouchEvent as ReactTouchEvent } from 'react';
import { defaultRubyTerms } from '../../data/rubyTerms';
import { localized } from '../../domain/items';
import type { AnswerState, Deck, DisplaySettings, FeedbackMode, LearningCaptureCategory, Locale, PracticeAttempt, ProgressState, Question, QuestionKind, ReviewStatus, VocabItem, Wordbook } from '../../types';

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#f0d4dd] bg-white/85 px-4 py-3 shadow-sm">
      <p className="text-xs font-bold text-[#8f6f7b]">{label}</p>
      <p className="journal-number mt-1 text-2xl font-black text-[#3d3036]">{value}</p>
    </div>
  );
}

function QuestionPrompt({ text, target }: { text: string; target?: string }) {
  if (!target) return text;
  const targetIndex = text.indexOf(target);
  if (targetIndex < 0) return text;
  return <>{text.slice(0, targetIndex)}<span className="font-semibold underline decoration-2 underline-offset-4">{target}</span>{text.slice(targetIndex + target.length)}</>;
}

function attemptSuggestion(attempt: PracticeAttempt | undefined, labels: Record<string, string>) {
  if (!attempt?.summary) return labels.noAttemptHistory;
  if (attempt.summary.wrong === 0) return labels.suggestionAllCorrect;
  if (attempt.summary.accuracy < 0.7) return labels.suggestionLowAccuracy;
  return labels.suggestionReviewWrong;
}

function aiPromptSeed(attempt: PracticeAttempt, questions: Question[]) {
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const misses = attempt.answers.filter((answer) => !answer.correct).map((answer) => {
    const question = questionMap.get(answer.questionId);
    return { kind: answer.kind, prompt: question?.prompt, selected: answer.selected, answer: question?.answer, correct_reason: question?.correctReason };
  });
  return JSON.stringify({ task: 'Analyze this JLPT practice attempt and propose focused review plus similar questions.', summary: attempt.summary, misses }, null, 2);
}

function formatDateTime(value: string | undefined, locale: Locale) {
  return value ? new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '-';
}

function formatDuration(ms: number | undefined) {
  const totalSeconds = Math.max(0, Math.round((ms ?? 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function wordDetailHref(item: VocabItem) {
  const view = item.deck === 'grammar_expression' ? 'grammar' : 'vocabulary';
  return `#/${view}/words/${encodeURIComponent(item.id)}`;
}

const WORD_INDEX_PAGE_SIZE = 8;
type WordIndexSortKey = 'created-asc' | 'created-desc' | 'level-asc' | 'level-desc' | 'kana-asc' | 'kana-desc' | 'questions-desc' | 'progress-asc';
function safeIndex(index: number, total: number) {
  return total ? ((index % total) + total) % total : 0;
}

function isTextEntryTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

function entryTags(item: VocabItem) {
  const tags = new Set<string>();
  item.tags?.forEach((tag) => {
    if (tag !== 'mcp-draft' && tag !== 'codex-chat-review') {
      tags.add(tag);
    }
  });
  return [...tags].filter(Boolean).slice(0, 3);
}

function reviewItemTime(item: VocabItem) {
  const value = Date.parse(item.input_at ?? item.date);
  return Number.isFinite(value) ? value : 0;
}

function readingSortValue(item: VocabItem) {
  return item.reading || item.original;
}

function levelSortValue(level: string | undefined) {
  const matches = [...String(level ?? '').matchAll(/N([1-5])/g)].map((match) => Number(match[1]));
  return matches.length ? Math.min(...matches) : 99;
}

function sortLabel(key: WordIndexSortKey, labels: Record<string, string>) {
  return labels[`entrySort_${key}`] ?? key;
}

export function PracticeReviewPanel({
  attempt,
  questions,
  answers,
  items,
  labels,
  locale,
  showRuby,
  onRestart,
  onBackToPractice,
}: {
  attempt?: PracticeAttempt;
  questions: Question[];
  answers: AnswerState;
  items: VocabItem[];
  labels: Record<string, string>;
  locale: Locale;
  showRuby: boolean;
  onRestart: () => void;
  onBackToPractice: () => void;
}) {
  const [mobileAnswerId, setMobileAnswerId] = useState<string | null>(null);
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const reviewAnswers = attempt?.answers.length
    ? attempt.answers
    : questions
      .filter((question) => answers[question.id])
      .map((question) => ({
        questionId: question.id,
        itemId: question.itemId,
        kind: question.kind,
        selected: answers[question.id].selected,
        correct: answers[question.id].correct,
        answeredAt: answers[question.id].answeredAt ?? '',
        elapsedMs: answers[question.id].elapsedMs ?? 0,
      }));
  const summary = attempt?.summary ?? {
    total: questions.length,
    correct: reviewAnswers.filter((answer) => answer.correct).length,
    wrong: reviewAnswers.filter((answer) => !answer.correct).length,
    accuracy: reviewAnswers.length ? reviewAnswers.filter((answer) => answer.correct).length / reviewAnswers.length : 0,
    elapsedMs: reviewAnswers.at(-1)?.elapsedMs ?? 0,
  };
  const wrongAnswers = reviewAnswers.filter((answer) => !answer.correct);
  const mobileAnswer = reviewAnswers.find((answer) => answer.questionId === mobileAnswerId);
  const mobileQuestion = mobileAnswer ? questionMap.get(mobileAnswer.questionId) : undefined;

  return (
    <>
      <section className="cute-practice-card min-w-0 border px-4 pb-6 pt-5 lg:hidden">
        {mobileQuestion && mobileAnswer ? (
          <>
            <button type="button" onClick={() => setMobileAnswerId(null)} className="flex min-h-10 items-center gap-1 text-sm font-bold text-[#a84269]">
              <ChevronLeft size={18} /> {labels.reviewSummaryTitle}
            </button>
            <div className="mt-3 border-b border-[#f0d4dd] pb-5">
              <p className="text-xs font-bold text-[#a84269]">{mobileQuestion.title}</p>
              <h2 className="mt-2 text-xl font-black leading-8 text-[#3d3036]"><QuestionPrompt text={mobileQuestion.prompt} target={mobileQuestion.promptTarget} /></h2>
            </div>
            <AnswerPanel
              question={mobileQuestion}
              answer={mobileAnswer}
              items={items}
              showRuby={showRuby}
              labels={labels}
              locale={locale}
            />
          </>
        ) : (
          <>
            <header className="border-b border-[#f0d4dd] pb-5">
              <p className="text-xs font-bold text-[#a84269]">{labels.latestAttempt}</p>
              <h2 className="mt-1 text-2xl font-black text-[#3d3036]">{labels.reviewSummaryTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-[#74646b]">{labels.reviewSummaryBody}</p>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={onBackToPractice} className="cute-button-secondary h-10 flex-1 rounded-full border px-3 text-sm font-bold">{labels.backToPractice}</button>
                <button type="button" onClick={onRestart} className="cute-button-primary h-10 flex-1 rounded-full px-3 text-sm font-bold text-white">{labels.restartPractice}</button>
              </div>
            </header>

            <div className="grid grid-cols-2 border-b border-[#f0d4dd] py-4">
              <div className="border-r border-[#f0d4dd] pr-4">
                <p className="text-xs text-[#8f6f7b]">{labels.correct}</p>
                <p className="mt-1 text-xl font-black text-[#3d3036]">{summary.correct} / {summary.total}</p>
              </div>
              <div className="pl-4">
                <p className="text-xs text-[#8f6f7b]">{labels.accuracy}</p>
                <p className="mt-1 text-xl font-black text-[#3d3036]">{Math.round(summary.accuracy * 100)}%</p>
              </div>
            </div>

            <div className="pt-4">
              <h3 className="text-sm font-bold text-[#3d3036]">{labels.reviewPage}</h3>
              {reviewAnswers.length ? (
                <div className="mt-2 divide-y divide-[#f0d4dd] border-y border-[#f0d4dd]">
                  {reviewAnswers.map((answer, index) => {
                    const question = questionMap.get(answer.questionId);
                    return question ? (
                      <button key={answer.questionId} type="button" onClick={() => setMobileAnswerId(answer.questionId)} className="flex min-h-16 w-full items-center gap-3 py-3 text-left">
                        <span className="journal-number flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff0f5] text-sm font-bold text-[#a84269]">{index + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-[#4b3b42]">{question.title}</span>
                          <span className="mt-1 block truncate text-xs text-[#7a6a70]">{question.prompt}</span>
                        </span>
                        <span className={`shrink-0 text-xs font-semibold ${answer.correct ? 'text-[#356146]' : 'text-[#8a493c]'}`}>{answer.correct ? labels.correct : labels.wrong}</span>
                        <ChevronRight size={17} className="shrink-0 text-[#b98598]" />
                      </button>
                    ) : null;
                  })}
                </div>
              ) : <p className="mt-3 text-sm text-[#68716c]">{labels.noAttemptHistory}</p>}
            </div>
          </>
        )}
      </section>

      <section className="hidden min-w-0 space-y-5 lg:block">
      <div className="cute-practice-card border p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[#a84269]">{labels.latestAttempt}</p>
            <h2 className="mt-2 text-2xl font-black text-[#3d3036]">{labels.reviewSummaryTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-[#74646b]">{labels.reviewSummaryBody}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onBackToPractice} className="cute-button-secondary h-10 rounded-full border px-3 text-sm font-bold">
              {labels.backToPractice}
            </button>
            <button type="button" onClick={onRestart} className="cute-button-primary h-10 rounded-full px-3 text-sm font-bold text-white">
              {labels.restartPractice}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label={labels.correct} value={`${summary.correct} / ${summary.total}`} />
          <Metric label={labels.accuracy} value={`${Math.round(summary.accuracy * 100)}%`} />
          <Metric label={labels.wrongQuestions} value={summary.wrong.toString()} />
          <Metric label={labels.elapsed} value={formatDuration(summary.elapsedMs)} />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-[#f0dfaa] bg-[#fff9df] p-3">
            <p className="text-sm font-bold text-[#3d3036]">{labels.historyTitle}</p>
            <p className="mt-2 text-sm leading-6 text-[#74646b]">
              {labels.startedAt}: {formatDateTime(attempt?.startedAt, locale)}
              <br />
              {labels.completedAt}: {formatDateTime(attempt?.completedAt, locale)}
            </p>
          </div>
          <div className="rounded-2xl border border-[#ccebd8] bg-[#f3fff7] p-3">
            <p className="text-sm font-bold text-[#3d3036]">{labels.suggestionLabel}</p>
            <p className="mt-2 text-sm leading-6 text-[#4f5b55]">{attemptSuggestion(attempt, labels)}</p>
          </div>
        </div>

        {attempt ? (
          <details className="mt-4 rounded-2xl border border-[#f0d4dd] bg-white/75 p-3">
            <summary className="cursor-pointer text-sm font-bold text-[#a84269]">{labels.aiSuggestionPromptLabel}</summary>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-[#f5f7f3] p-3 text-xs leading-5 text-[#313934]">{aiPromptSeed(attempt, questions)}</pre>
          </details>
        ) : null}
      </div>

      {!reviewAnswers.length ? (
        <div className="cute-practice-card border border-dashed p-6">
          <p className="text-sm leading-6 text-[#5f625b]">{labels.noAttemptHistory}</p>
        </div>
      ) : null}

      {wrongAnswers.length ? (
        <div className="cute-practice-card border p-4 md:p-5">
          <h3 className="text-lg font-black text-[#3d3036]">{labels.wrongQuestions}</h3>
          <div className="mt-3 space-y-4">
            {wrongAnswers.map((answer) => {
              const question = questionMap.get(answer.questionId);
              return question ? (
                <div key={answer.questionId} className="rounded-2xl border border-[#f0dfaa] bg-[#fff9df] p-3">
                  <p className="text-sm font-bold text-[#a84269]">{question.title}</p>
                  <p className="mt-2 text-base leading-7 text-[#3d3036]"><QuestionPrompt text={question.prompt} target={question.promptTarget} /></p>
                  <AnswerPanel
                    question={question}
                    answer={answer}
                    items={items}
                    showRuby={showRuby}
                    labels={labels}
                    locale={locale}
                  />
                </div>
              ) : null;
            })}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {reviewAnswers.map((answer) => {
          const question = questionMap.get(answer.questionId);
          return question ? (
            <div key={answer.questionId} className="cute-practice-card border p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#a84269]">{question.title}</p>
                  <p className="mt-2 text-base leading-7 text-[#3d3036]"><QuestionPrompt text={question.prompt} target={question.promptTarget} /></p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-bold ${answer.correct ? 'bg-[#d5eadc] text-[#285d47]' : 'bg-[#fff8df] text-[#775516]'}`}>
                  {answer.correct ? labels.correct : labels.wrong}
                </span>
              </div>
              <AnswerPanel
                question={question}
                answer={answer}
                items={items}
                showRuby={showRuby}
                labels={labels}
                locale={locale}
              />
            </div>
          ) : null;
        })}
      </div>
      </section>
    </>
  );
}

export function PracticePanel({
  activeQuestion,
  questions,
  questionsLength,
  activeIndex,
  answeredCount,
  complete,
  feedbackMode,
  answers,
  items,
  labels,
  questionTypeLabel,
  settings,
  onAnswer,
  onPrev,
  onNext,
  onJump,
  onRestart,
  onPracticeHome,
  onPrepareReview,
  onReview,
  analysisStatus,
}: {
  activeQuestion?: Question;
  questions: Question[];
  questionsLength: number;
  activeIndex: number;
  answeredCount: number;
  complete: boolean;
  feedbackMode: FeedbackMode;
  answers: AnswerState;
  items: VocabItem[];
  labels: Record<string, string>;
  questionTypeLabel: string;
  settings: DisplaySettings;
  onAnswer: (question: Question, selected: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onJump: (index: number) => void;
  onRestart: () => void;
  onPracticeHome: () => void;
  onPrepareReview: () => Promise<void>;
  onReview: () => void;
  analysisStatus: PracticeAttempt['analysisStatus'];
}) {
  const [answerSheetOpen, setAnswerSheetOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewPreparing, setReviewPreparing] = useState(false);
  const practiceCardRef = useRef<HTMLElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  function navigateFromSwipe(direction: 'prev' | 'next') {
    if (direction === 'prev') onPrev();
    else onNext();
    window.requestAnimationFrame(() => {
      practiceCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function handleTouchStart(event: ReactTouchEvent<HTMLElement>) {
    if (
      event.touches.length !== 1
      || questionsLength <= 1
      || !activeQuestion
      || !answers[activeQuestion.id]
      || window.matchMedia('(min-width: 768px)').matches
    ) {
      touchStartRef.current = null;
      return;
    }
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: ReactTouchEvent<HTMLElement>) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || event.changedTouches.length !== 1) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 56 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;

    navigateFromSwipe(deltaX > 0 ? 'prev' : 'next');
  }

  async function requestReview() {
    if (reviewPreparing) return;
    setReviewDialogOpen(true);
    if (analysisStatus === 'processing' || analysisStatus === 'completed') return;
    setReviewPreparing(true);
    try {
      await onPrepareReview();
    } finally {
      setReviewPreparing(false);
    }
  }

  function runReviewDialogAction(action: () => void) {
    setReviewDialogOpen(false);
    action();
  }

  function answerOnMobile(question: Question, choice: string) {
    const alreadyAnswered = Boolean(answers[question.id]);
    if (feedbackMode === 'immediate' && alreadyAnswered) return;

    onAnswer(question, choice);

    const nextAnsweredCount = answeredCount + (alreadyAnswered ? 0 : 1);
    const currentQuestionIndex = questions.findIndex((candidate) => candidate.id === question.id);
    const baseIndex = currentQuestionIndex >= 0 ? currentQuestionIndex : activeIndex;
    let nextUnansweredIndex = -1;
    for (let offset = 1; offset <= questions.length; offset += 1) {
      const candidateIndex = (baseIndex + offset) % questions.length;
      const candidate = questions[candidateIndex];
      if (candidate.id !== question.id && !answers[candidate.id]) {
        nextUnansweredIndex = candidateIndex;
        break;
      }
    }
    const shouldAutoAdvance = typeof window !== 'undefined'
      && feedbackMode === 'batch'
      && window.matchMedia('(max-width: 767px)').matches
      && questionsLength > 1
      && nextAnsweredCount < questionsLength
      && nextUnansweredIndex >= 0;

    if (shouldAutoAdvance) {
      window.setTimeout(() => {
        onJump(nextUnansweredIndex);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, feedbackMode === 'immediate' ? 550 : 180);
    }
  }

  useEffect(() => {
    if (!activeQuestion) return;
    const currentQuestion = activeQuestion;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (isTextEntryTarget(event.target)) return;

      if (event.key === 'ArrowLeft' && questionsLength > 1) {
        event.preventDefault();
        onPrev();
        return;
      }

      if (event.key === 'ArrowRight' && questionsLength > 1) {
        event.preventDefault();
        onNext();
        return;
      }

      if (/^[1-4]$/.test(event.key)) {
        const choice = currentQuestion.choices[Number(event.key) - 1];
        const alreadyAnswered = Boolean(answers[currentQuestion.id]);
        if (!choice || (feedbackMode === 'immediate' && alreadyAnswered)) return;
        event.preventDefault();
        onAnswer(currentQuestion, choice);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeQuestion, answers, feedbackMode, onAnswer, onNext, onPrev, questionsLength]);

  useEffect(() => {
    if (!reviewDialogOpen) return;
    function handleDialogKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setReviewDialogOpen(false);
    }
    window.addEventListener('keydown', handleDialogKeyDown);
    return () => window.removeEventListener('keydown', handleDialogKeyDown);
  }, [reviewDialogOpen]);

  return (
    <section
      ref={practiceCardRef}
      className="cute-practice-card practice-swipe-surface min-w-0 border px-4 pb-6 pt-4 md:p-5"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => { touchStartRef.current = null; }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0d4dd] pb-4">
        <p className="text-sm font-bold text-[#a84269]">{questionTypeLabel}</p>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {questionsLength > 1 ? <ArrowButton label={labels.prev} direction="left" shortcut="ArrowLeft" onClick={onPrev} /> : null}
          <button
            type="button"
            onClick={() => setAnswerSheetOpen(true)}
            aria-label={labels.practiceAnswerSheet}
            className="flex min-h-10 min-w-24 flex-col items-center justify-center rounded-2xl bg-[#fff0f5] px-2 py-1 text-[#a84269] transition hover:bg-[#ffe6ef] md:hidden"
          >
            <span className="journal-number text-sm font-black">{questionsLength ? `${activeIndex + 1} / ${questionsLength}` : '0 / 0'}</span>
            <span className="text-xs">{labels.completed} {answeredCount} / {questionsLength}</span>
          </button>
          <div className="hidden min-h-10 min-w-32 flex-col items-center justify-center rounded-2xl bg-[#fff0f5] px-3 py-1 text-[#a84269] md:flex">
            <span className="journal-number text-sm font-black">{questionsLength ? `${activeIndex + 1} / ${questionsLength}` : '0 / 0'}</span>
            <span className="text-xs">{labels.completed} {answeredCount} / {questionsLength}</span>
          </div>
          {answeredCount > 0 ? (
            <button type="button" onClick={onRestart} aria-label={labels.restartPractice} title={labels.restartPractice} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f0c9d4] bg-white text-[#a84269] hover:bg-[#fff0f5] sm:w-auto sm:px-3">
              <RotateCcw size={17} />
              <span className="ml-2 hidden text-sm font-semibold sm:inline">{labels.restartPractice}</span>
            </button>
          ) : null}
          {questionsLength > 1 ? (
            <ArrowButton label={labels.next} direction="right" shortcut="ArrowRight" onClick={onNext} />
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <h2 className="text-2xl font-black text-[#3d3036]">{activeQuestion?.title ?? labels.noQuestion}</h2>
        {activeQuestion?.instruction ? (
          <p className="mt-3 text-sm leading-6 text-[#74646b]">{activeQuestion.instruction}</p>
        ) : null}
        <p className={`${activeQuestion?.instruction ? 'mt-4' : 'mt-3'} break-words text-lg leading-8 text-[#3d3036]`}>
          {activeQuestion ? <QuestionPrompt text={activeQuestion.prompt} target={activeQuestion.promptTarget} /> : labels.noQuestionBody}
        </p>
      </div>

      {activeQuestion ? (
        <>
          {activeQuestion ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {activeQuestion.choices.map((choice, choiceIndex) => {
                const answered = answers[activeQuestion.id];
                const isSelected = answered?.selected === choice;
                const isAnswer = choice === activeQuestion.answer;
                const shouldReveal = feedbackMode === 'immediate';
                const color = !answered
                  ? 'border-[#f0d4dd] bg-white hover:bg-[#fff7fb]'
                  : shouldReveal
                    ? isAnswer
                      ? 'border-[#65a37c] bg-[#f0fff5]'
                      : isSelected
                        ? 'border-[#d95f8a] bg-[#fff0f5]'
                        : 'border-[#f0d4dd] bg-[#fffafc] opacity-70'
                    : isSelected
                      ? 'border-[#d95f8a] bg-[#fff0f5]'
                      : 'border-[#f0d4dd] bg-white';
                return (
                  <button
                    type="button"
                    key={choice}
                    disabled={feedbackMode === 'immediate' && Boolean(answered)}
                    aria-keyshortcuts={String(choiceIndex + 1)}
                    onClick={() => answerOnMobile(activeQuestion, choice)}
                    className={`cute-choice flex min-h-14 min-w-0 items-start gap-3 border px-4 py-3 text-left text-base font-bold break-words disabled:cursor-default ${color}`}
                  >
                    <span aria-hidden="true" className="journal-number flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs">
                      {choiceIndex + 1}
                    </span>
                    <span className="min-w-0 pt-0.5">{choice}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {feedbackMode === 'batch' && complete ? (
            <div className="mt-5 flex items-center justify-end gap-3 border-t border-[#f0d4dd] pt-4">
              <button type="button" onClick={requestReview} disabled={reviewPreparing} className="cute-button-primary h-10 rounded-full px-4 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-70">
                {reviewPreparing ? labels.reviewPreparing : analysisStatus === 'processing' ? labels.analysisProcessing : analysisStatus === 'completed' ? labels.analysisCompleted : labels.reviewPage}
              </button>
            </div>
          ) : null}
          {feedbackMode === 'immediate' && answers[activeQuestion.id] ? (
            <AnswerPanel
              question={activeQuestion}
              answer={answers[activeQuestion.id]}
              items={items}
              showRuby={settings.showExplanationRuby}
              labels={labels}
              locale={settings.locale}
            />
          ) : null}
        </>
      ) : null}
      {answerSheetOpen ? (
        <div className="fixed inset-0 z-50 bg-[#2d2328]/30 px-4 py-5 md:hidden" role="dialog" aria-modal="true" aria-labelledby="practice-answer-sheet-title">
          <button type="button" className="absolute inset-0 h-full w-full cursor-default" aria-label={labels.close} onClick={() => setAnswerSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[78vh] overflow-y-auto rounded-t-3xl border border-[#f0d4dd] bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 id="practice-answer-sheet-title" className="text-lg font-black text-[#3d3036]">{labels.practiceAnswerSheet}</h3>
                <p className="mt-1 text-xs font-semibold text-[#74646b]">{labels.completed} {answeredCount} / {questionsLength}</p>
              </div>
              <button type="button" onClick={() => setAnswerSheetOpen(false)} className="h-10 rounded-full border border-[#f0c9d4] px-4 text-sm font-bold text-[#a84269]">
                {labels.close}
              </button>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {questions.map((question, index) => {
                const answered = Boolean(answers[question.id]);
                const current = index === activeIndex;
                const stateClass = current
                  ? 'border-[#a84269] bg-[#fff0f5] text-[#a84269]'
                  : answered
                    ? 'border-[#9bd8b0] bg-[#f2fff6] text-[#285d47]'
                    : 'border-[#eadfe3] bg-white text-[#74646b]';
                const stateLabel = current
                  ? labels.practiceCurrent
                  : answered
                    ? labels.practiceAnswered
                    : labels.practiceUnanswered;
                return (
                  <button
                    type="button"
                    key={question.id}
                    onClick={() => {
                      onJump(index);
                      setAnswerSheetOpen(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    aria-label={`${stateLabel}: ${index + 1}`}
                    className={`journal-number h-11 rounded-2xl border text-sm font-black ${stateClass}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#74646b]">
              <span className="rounded-full border border-[#a84269] bg-[#fff0f5] px-3 py-1 text-[#a84269]">{labels.practiceCurrent}</span>
              <span className="rounded-full border border-[#9bd8b0] bg-[#f2fff6] px-3 py-1 text-[#285d47]">{labels.practiceAnswered}</span>
              <span className="rounded-full border border-[#eadfe3] bg-white px-3 py-1">{labels.practiceUnanswered}</span>
            </div>
          </div>
        </div>
      ) : null}
      {reviewDialogOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#2d2328]/45 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-6 sm:items-center sm:pb-6" role="dialog" aria-modal="true" aria-labelledby="review-processing-title" aria-describedby="review-processing-description">
          <button type="button" className="absolute inset-0 h-full w-full cursor-default" aria-label={labels.close} onClick={() => setReviewDialogOpen(false)} />
          <div className="relative w-full max-w-md rounded-[28px] border border-[#f0d4dd] bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff0f5] text-[#a84269]">
                <ScrollText size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="review-processing-title" className="text-lg font-black text-[#3d3036]">{labels.reviewProcessingTitle}</h2>
                <p id="review-processing-description" className="mt-2 text-sm leading-6 text-[#74646b]">{labels.reviewProcessingNotice}</p>
              </div>
              <button type="button" onClick={() => setReviewDialogOpen(false)} aria-label={labels.close} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#8f6f7b] hover:bg-[#fff0f5]">
                <X size={19} />
              </button>
            </div>
            {reviewPreparing || analysisStatus === 'processing' ? (
              <p role="status" className="mt-4 flex items-center gap-2 rounded-2xl bg-[#fff7fb] px-4 py-3 text-xs font-bold text-[#a84269]">
                <LoaderCircle size={16} className="animate-spin" /> {labels.analysisProcessing}
              </p>
            ) : analysisStatus === 'completed' ? <p role="status" className="mt-4 rounded-2xl bg-[#f2fff6] px-4 py-3 text-xs font-bold text-[#285d47]">{labels.analysisCompleted}</p> : null}
            <div className="mt-5 grid gap-2.5">
              <button type="button" onClick={() => runReviewDialogAction(onReview)} className="cute-button-primary flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-white">
                <ScrollText size={18} /> {labels.reviewViewHistory}
              </button>
              <button type="button" onClick={() => runReviewDialogAction(onPracticeHome)} className="cute-button-secondary flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-bold">
                <House size={18} /> {labels.reviewBackToPracticeHome}
              </button>
              <button type="button" onClick={() => runReviewDialogAction(onRestart)} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-[#a84269] hover:bg-[#fff7fb]">
                <RotateCcw size={17} /> {labels.restartPractice}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AnswerPanel({
  question,
  answer,
  items,
  showRuby,
  labels,
  locale,
}: {
  question: Question;
  answer?: { selected: string; correct: boolean };
  items: VocabItem[];
  showRuby: boolean;
  labels: Record<string, string>;
  locale: Locale;
}) {
  if (!answer) {
    return null;
  }

  const sourceItem = items.find((item) => item.id === question.itemId);
  const needsHumanReview = sourceItem?.content_origin === 'ai_generated' && sourceItem.verification_status !== 'verified';
  const statusStyle = answer.correct
    ? 'border-[#9bd8b0] bg-[#f2fff6] text-[#285d47]'
    : 'border-[#f0c9d4] bg-[#fff7fb] text-[#8f365b]';

  return (
    <div className={`cute-answer-note mt-5 border p-4 ${statusStyle}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="rounded-full bg-white/75 px-3 py-1 text-sm font-bold">{answer.correct ? labels.correct : labels.wrong}</p>
        {sourceItem ? (
          <EntryLink item={sourceItem} label={`${labels.viewEntry}: ${sourceItem.original}`} />
        ) : null}
      </div>
      <p className="mt-2 text-sm">{labels.yourAnswer}：{answer.selected}</p>
      <p className="mt-1 text-sm">{labels.rightAnswer}：{question.answer}</p>
      <div className="mt-4 border-t border-black/10">
        <ExplanationSection label={labels.contextLabel}>
          <RubyText text={question.context} items={items} enabled={showRuby} />
        </ExplanationSection>
        {question.translationZh ? (
          <ExplanationSection label={labels.fullChineseTranslation ?? '完整中文翻译'}>
            {question.translationZh}
          </ExplanationSection>
        ) : null}
        <ExplanationSection label={labels.correctReasonLabel}>
          <RubyText text={question.correctReason} items={items} enabled={showRuby} />
        </ExplanationSection>
        <section className="border-t border-black/10 py-4">
          <h3 className="text-sm font-semibold text-[#313934]">{labels.choiceAnalysisLabel}</h3>
          <div className="mt-2 divide-y divide-black/10">
            {question.choiceAnalysis.map((choice) => {
              const linkedItem = choice.correct ? sourceItem : itemForChoice(choice.choice, question.kind, items);
              return (
                <div key={choice.choice} className="grid gap-2 py-3 sm:grid-cols-[minmax(110px,auto)_1fr] sm:items-start sm:gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {linkedItem ? (
                      <EntryLink item={linkedItem} label={choice.choice} compact />
                    ) : (
                      <span className="font-semibold text-[#27312c]">{choice.choice}</span>
                    )}
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${choice.correct ? 'bg-[#d5eadc] text-[#285d47]' : 'bg-white/70 text-[#665d4b]'}`}>
                      {choice.correct ? labels.choiceFits : labels.choiceDoesNotFit}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-[#4b534e]">
                    <RubyText text={choice.explanation} items={items} enabled={showRuby} />
                  </p>
                </div>
              );
            })}
          </div>
        </section>
        <ExplanationSection label={labels.memoryPointLabel}>
          <RubyText text={question.memoryPoint} items={items} enabled={showRuby} />
        </ExplanationSection>
      </div>
      {needsHumanReview ? (
        <p className="mt-3 rounded-2xl border border-[#f0cf80] bg-[#fff8df] p-3 text-sm leading-6 text-[#775516]">
          {labels.unverifiedContentNotice}
        </p>
      ) : null}
    </div>
  );
}

function itemForChoice(choice: string, kind: QuestionKind, items: VocabItem[]) {
  if (kind === 'meaning') return items.find((item) => item.paraphrase_ja === choice);
  if (kind === 'kanji_to_kana') return items.find((item) => item.reading === choice);
  return items.find((item) => item.original === choice);
}

function EntryLink({ item, label, compact = false }: { item: VocabItem; label: string; compact?: boolean }) {
  return (
    <a
      href={wordDetailHref(item)}
      target="_blank"
      rel="noreferrer"
      className={`font-semibold text-[#24473f] underline decoration-[#9ab0a7] underline-offset-4 hover:decoration-[#24473f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24473f] ${compact ? 'break-words' : 'rounded-md border border-[#b9c9c1] bg-white/80 px-3 py-2 text-sm no-underline'}`}
    >
      {label}
    </a>
  );
}

function ExplanationSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="border-t border-black/10 py-4 first:border-t-0">
      <h3 className="text-sm font-semibold text-[#313934]">{label}</h3>
      <p className="mt-2 text-sm leading-6 text-[#4b534e]">{children}</p>
    </section>
  );
}

export function WordIndexPanel({ items, questions, answers, progress, labels, locale, deckLabels, wordbooks, selectedWordbookId = 'all', captureCategory, defaultTargetDeck = 'n1_vocab', pendingCaptureCount = 0, onOpen, onPractice, onTips, onReview, onManageWordbooks, onOpenPendingCaptures, onSaveCapture, onCreateWordbook, onWordbookChange }: {
  items: VocabItem[];
  questions: Question[];
  answers: AnswerState;
  progress: ProgressState;
  labels: Record<string, string>;
  locale: Locale;
  deckLabels: Record<Deck | 'all', string>;
  wordbooks: Wordbook[];
  selectedWordbookId?: string;
  captureCategory?: LearningCaptureCategory;
  defaultTargetDeck?: Deck;
  pendingCaptureCount?: number;
  onOpen: (id: string) => void;
  onPractice?: () => void;
  onTips?: () => void;
  onReview?: () => void;
  onManageWordbooks?: () => void;
  onOpenPendingCaptures?: () => void;
  onSaveCapture?: (input: { body: string; category: LearningCaptureCategory; context?: string; targetDeck?: Deck; targetWordbookId?: string }) => Promise<void>;
  onCreateWordbook?: (title: string) => Promise<Wordbook | null>;
  onWordbookChange?: (wordbookId: string) => void;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [sortKey, setSortKey] = useState<WordIndexSortKey>('created-asc');
  const [showCaptureForm, setShowCaptureForm] = useState(false);
  const [captureBody, setCaptureBody] = useState('');
  const [captureContext, setCaptureContext] = useState('');
  const [targetWordbookId, setTargetWordbookId] = useState(defaultTargetDeck);
  const [newWordbookTitle, setNewWordbookTitle] = useState('');
  const [creatingWordbook, setCreatingWordbook] = useState(false);
  const [wordbookError, setWordbookError] = useState('');
  const [captureSaving, setCaptureSaving] = useState(false);
  const [captureSaved, setCaptureSaved] = useState(false);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(WORD_INDEX_PAGE_SIZE);
  const mobileLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const vocabularyWordbooks = wordbooks.filter((wordbook) => wordbook.deck !== 'grammar_expression');
  const questionsByItem = useMemo(() => questions.reduce<Record<string, Question[]>>((groups, question) => {
    groups[question.itemId] = [...(groups[question.itemId] ?? []), question];
    return groups;
  }, {}), [questions]);
  const sortedItems = useMemo(() => [...items].sort((left, right) => {
    const leftQuestions = questionsByItem[left.id]?.length ?? 0;
    const rightQuestions = questionsByItem[right.id]?.length ?? 0;
    const leftAnswered = questionsByItem[left.id]?.filter((question) => answers[question.id]).length ?? 0;
    const rightAnswered = questionsByItem[right.id]?.filter((question) => answers[question.id]).length ?? 0;
    const leftProgress = leftQuestions ? leftAnswered / leftQuestions : 0;
    const rightProgress = rightQuestions ? rightAnswered / rightQuestions : 0;
    const fallback = reviewItemTime(left) - reviewItemTime(right) || readingSortValue(left).localeCompare(readingSortValue(right), 'ja');
    if (sortKey === 'created-desc') return reviewItemTime(right) - reviewItemTime(left) || fallback;
    if (sortKey === 'level-asc') return levelSortValue(left.jlpt_level) - levelSortValue(right.jlpt_level) || fallback;
    if (sortKey === 'level-desc') return levelSortValue(right.jlpt_level) - levelSortValue(left.jlpt_level) || fallback;
    if (sortKey === 'kana-asc') return readingSortValue(left).localeCompare(readingSortValue(right), 'ja') || fallback;
    if (sortKey === 'kana-desc') return readingSortValue(right).localeCompare(readingSortValue(left), 'ja') || fallback;
    if (sortKey === 'questions-desc') return rightQuestions - leftQuestions || fallback;
    if (sortKey === 'progress-asc') return leftProgress - rightProgress || fallback;
    return fallback;
  }), [answers, items, questionsByItem, sortKey]);
  const pageCount = Math.max(1, Math.ceil(sortedItems.length / WORD_INDEX_PAGE_SIZE));
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const pageStart = currentPage * WORD_INDEX_PAGE_SIZE;
  const pageItems = sortedItems.slice(pageStart, pageStart + WORD_INDEX_PAGE_SIZE);
  const mobileItems = sortedItems.slice(0, mobileVisibleCount);
  const pageEnd = pageStart + pageItems.length;
  const mobilePageEnd = Math.min(mobileVisibleCount, sortedItems.length);

  useEffect(() => {
    setPageIndex((index) => Math.min(index, pageCount - 1));
  }, [pageCount]);

  useEffect(() => {
    setPageIndex(0);
    setMobileVisibleCount(WORD_INDEX_PAGE_SIZE);
  }, [sortKey]);

  useEffect(() => {
    setMobileVisibleCount(WORD_INDEX_PAGE_SIZE);
  }, [items, questions, answers]);

  useEffect(() => {
    setTargetWordbookId(defaultTargetDeck);
  }, [defaultTargetDeck]);

  useEffect(() => {
    const sentinel = mobileLoadMoreRef.current;
    if (!sentinel || mobileVisibleCount >= sortedItems.length) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setMobileVisibleCount((count) => Math.min(count + WORD_INDEX_PAGE_SIZE, sortedItems.length));
    }, { rootMargin: '240px 0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [mobileVisibleCount, sortedItems.length]);

  async function saveCapture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!captureBody.trim() || !captureCategory || !onSaveCapture || captureSaving) return;
    setCaptureSaving(true);
    setCaptureSaved(false);
    try {
      const targetWordbook = vocabularyWordbooks.find((wordbook) => wordbook.id === targetWordbookId);
      await onSaveCapture({
        body: captureBody.trim(),
        category: captureCategory,
        context: captureContext.trim() || labels.entryCaptureContextDefault,
        targetDeck: captureCategory === 'word' ? targetWordbook?.deck ?? 'n1_vocab' : undefined,
        targetWordbookId: captureCategory === 'word' ? targetWordbook?.id ?? 'n1_vocab' : undefined,
      });
      setCaptureBody('');
      setCaptureContext('');
      setCaptureSaved(true);
    } finally {
      setCaptureSaving(false);
    }
  }

  function submitWordCaptureOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (captureCategory !== 'word') return;
    if (event.key !== 'Enter' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  async function createWordbook() {
    if (!newWordbookTitle.trim() || creatingWordbook || !onCreateWordbook) return;
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
    <section className="min-w-0 overflow-hidden bg-white md:rounded-lg md:border md:border-[#d8cdbc] md:shadow-sm">
      <div className="border-b border-[#e5ddd1] px-4 py-4 md:px-5">
        <div className="mobile-action-header flex flex-wrap items-center justify-between gap-3">
          <div className="hidden flex-wrap items-center justify-end gap-2 md:flex">
            {captureCategory && onSaveCapture ? (
              <ModuleAction label={captureCategory === 'grammar' ? labels.entryAddGrammar : labels.entryAddWord} onClick={() => { setShowCaptureForm((value) => !value); setCaptureSaved(false); }}>
                <Plus size={16} />
              </ModuleAction>
            ) : null}
            {onPractice ? <ModuleAction label={labels.questionPage} onClick={onPractice}><Target size={16} /></ModuleAction> : null}
            {onTips ? <ModuleAction label={labels.navQuestionTypes} onClick={onTips}><Lightbulb size={16} /></ModuleAction> : null}
            {onReview ? <ModuleAction label={labels.reviewPage} onClick={onReview}><ScrollText size={16} /></ModuleAction> : null}
          </div>
          <div className="mobile-filter-row flex flex-wrap items-center gap-2">
            {captureCategory === 'word' && onWordbookChange ? (
              <label className="hidden min-w-0 items-center gap-2 text-sm font-semibold text-[#59645e] md:flex">
                <span className="shrink-0">{labels.wordbookFilter}</span>
                <select
                  value={selectedWordbookId}
                  onChange={(event) => onWordbookChange(event.target.value)}
                  aria-label={labels.wordbookFilter}
                  className="h-9 max-w-56 rounded-md border border-[#d9d0c3] bg-white px-2 text-sm font-semibold text-[#34443c] outline-none focus:border-[#24473f]"
                >
                  <option value="all">{labels.wordbookAll}</option>
                  {vocabularyWordbooks.map((wordbook) => (
                    <option key={wordbook.id} value={wordbook.id}>{wordbook.title}</option>
                  ))}
                </select>
              </label>
            ) : null}
            {captureCategory === 'word' && onManageWordbooks ? (
              <button
                type="button"
                onClick={onManageWordbooks}
                className="h-9 rounded-md border border-[#d9d0c3] bg-white px-3 text-sm font-semibold text-[#34443c] hover:bg-[#f7f4ef]"
              >
                {labels.wordbookManage}
              </button>
            ) : null}
            <label className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[#59645e]">
              <span className="shrink-0">{labels.entrySort}</span>
              <select
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as WordIndexSortKey)}
                className="h-9 max-w-48 rounded-md border border-[#d9d0c3] bg-white px-2 text-sm font-semibold text-[#34443c] outline-none focus:border-[#24473f]"
              >
                {(['created-asc', 'created-desc', 'level-asc', 'level-desc', 'kana-asc', 'kana-desc', 'questions-desc', 'progress-asc'] as WordIndexSortKey[]).map((key) => (
                  <option key={key} value={key}>{sortLabel(key, labels)}</option>
                ))}
              </select>
            </label>
            {captureCategory && pendingCaptureCount ? (
              <button
                type="button"
                onClick={onOpenPendingCaptures}
                className="rounded-md bg-[#fff8df] px-3 py-1 text-sm font-semibold text-[#775516] ring-1 ring-[#eadb9b] hover:bg-[#fff1bd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b98718] disabled:cursor-default"
                disabled={!onOpenPendingCaptures}
              >
                {labels.entryPendingCapture}: {pendingCaptureCount}
              </button>
            ) : null}
            <span className="rounded-md bg-[#e8f0eb] px-3 py-1 text-sm font-semibold text-[#24473f]">{items.length} {labels.items}</span>
          </div>
        </div>
      </div>
      {showCaptureForm && captureCategory && onSaveCapture ? (
        <form onSubmit={saveCapture} className="grid gap-3 border-b border-[#e5ddd1] bg-[#fffafc] px-4 py-4 md:px-5">
          <label className="block text-sm font-semibold text-[#4b3b42]">
            {captureCategory === 'grammar' ? labels.entryAddGrammarInput : labels.entryAddWordInput}
            <textarea
              value={captureBody}
              onChange={(event) => { setCaptureBody(event.target.value); setCaptureSaved(false); }}
              onKeyDown={submitWordCaptureOnEnter}
              maxLength={5000}
              autoFocus
              placeholder={captureCategory === 'grammar' ? labels.entryAddGrammarPlaceholder : labels.entryAddWordPlaceholder}
              className="mt-2 min-h-28 w-full resize-y rounded-md border border-[#e2c8d3] bg-white p-3 text-base leading-7 text-[#27312c] outline-none focus:border-[#d95f8a]"
            />
          </label>
          <label className="block text-sm font-semibold text-[#4b3b42]">
            {labels.entryAddContext}
            <input
              value={captureContext}
              onChange={(event) => setCaptureContext(event.target.value)}
              maxLength={2000}
              placeholder={labels.entryAddContextPlaceholder}
              className="mt-2 h-10 w-full rounded-md border border-[#e2c8d3] bg-white px-3 text-sm text-[#27312c] outline-none focus:border-[#d95f8a]"
            />
          </label>
          {captureCategory === 'word' ? (
            <label className="block text-sm font-semibold text-[#4b3b42]">
              {labels.entryAddTargetDeck}
              <select
                value={targetWordbookId}
                onChange={(event) => setTargetWordbookId(event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-[#e2c8d3] bg-white px-3 text-sm text-[#27312c] outline-none focus:border-[#d95f8a]"
              >
                {vocabularyWordbooks.map((wordbook) => (
                  <option key={wordbook.id} value={wordbook.id}>{wordbook.title}</option>
                ))}
              </select>
            </label>
          ) : null}
          {captureCategory === 'word' && onCreateWordbook ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1 text-sm font-semibold text-[#4b3b42]">
                {labels.wordbookNewName}
                <input
                  value={newWordbookTitle}
                  onChange={(event) => setNewWordbookTitle(event.target.value)}
                  maxLength={60}
                  placeholder={labels.wordbookCreatePlaceholder}
                  className="mt-2 h-10 w-full rounded-md border border-[#e2c8d3] bg-white px-3 text-sm text-[#27312c] outline-none focus:border-[#d95f8a]"
                />
              </label>
              <button type="button" onClick={createWordbook} disabled={!newWordbookTitle.trim() || creatingWordbook} className="h-10 rounded-md border border-[#e2c8d3] bg-white px-4 text-sm font-bold text-[#a84269] disabled:cursor-wait disabled:opacity-50">
                {creatingWordbook ? labels.processing : labels.wordbookCreate}
              </button>
              {wordbookError ? <p role="alert" className="text-sm font-semibold text-[#8f3d2e]">{wordbookError}</p> : null}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={!captureBody.trim() || captureSaving} className="h-10 rounded-md bg-[#d95f8a] px-4 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-50">
              {captureSaving ? labels.captureSaving : labels.entryAddSave}
            </button>
            {captureSaved ? <p role="status" className="text-sm font-semibold text-[#356146]">{labels.entryAddSaved}</p> : null}
          </div>
        </form>
      ) : null}
      {items.length ? (
        <>
        <div className="mobile-list md:hidden">
          {mobileItems.map((item) => {
            const itemQuestions = questionsByItem[item.id] ?? [];
            const itemAnswers = itemQuestions.filter((question) => answers[question.id]);
            const itemProgress = progress[item.id];
            const tags = entryTags(item);
            return (
              <button key={item.id} type="button" onClick={() => onOpen(item.id)} className="mobile-list-item mobile-list-link cute-focus" aria-label={`${labels.entryOpen}: ${item.original}`}>
                <span className="mobile-list-main">
                  <span className="mobile-list-title">{item.original}</span>
                  {item.reading ? <span className="mobile-list-subtitle">{item.reading}</span> : null}
                </span>
                <span className="mobile-list-progress">
                  <span>{itemQuestions.length ? `${itemAnswers.length}/${itemQuestions.length}` : labels.entryNoProgress}</span>
                  <StatusPill status={itemProgress?.status ?? 'new'} labels={labels} />
                </span>
                <span className="mobile-list-tags">
                  <span className="mobile-list-pill">{item.jlpt_level ?? '-'}</span>
                  {tags.slice(0, 2).map((tag) => <span key={tag} className="mobile-list-pill is-soft">{tag}</span>)}
                </span>
                <span className="mobile-list-note">{itemProgress?.nextReviewAt ? `${labels.nextReview}: ${formatDateTime(itemProgress.nextReviewAt, locale)}` : formatDateTime(item.input_at ?? item.date, locale)}</span>
                <ChevronRight className="mobile-list-cue" size={18} aria-hidden="true" />
              </button>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto md:block md:overflow-x-visible">
	          <table className="w-full min-w-[680px] table-fixed border-collapse text-left text-sm md:min-w-0">
	            <thead className="bg-[#f3f6f1] text-xs font-semibold text-[#5b665f]">
	              <tr>
	                <th className="w-[26%] px-4 py-3">{labels.entryColumnItem}</th>
	                <th className="w-[17%] px-3 py-3">{labels.entryColumnCreated}</th>
	                <th className="w-[8%] px-3 py-3">{labels.entryColumnLevel}</th>
	                <th className="w-[17%] px-3 py-3">{labels.entryColumnTags}</th>
	                <th className="w-[8%] px-3 py-3">{labels.entryColumnQuestions}</th>
	                <th className="w-[16%] px-3 py-3">{labels.entryColumnProgress}</th>
	                <th className="w-[8%] px-3 py-3 text-right">
	                  <span className="sr-only">{labels.entryOpen}</span>
	                </th>
	              </tr>
            </thead>
            <tbody className="divide-y divide-[#ece4d8]">
	              {pageItems.map((item) => {
	                const itemQuestions = questionsByItem[item.id] ?? [];
	                const itemAnswers = itemQuestions.filter((question) => answers[question.id]);
	                const itemProgress = progress[item.id];
	                const tags = entryTags(item);
	                return (
	                  <tr key={item.id} className="bg-white hover:bg-[#fbf8f2]">
                    <td className="px-4 py-3 align-top">
                      <button type="button" onClick={() => onOpen(item.id)} className="block min-w-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24473f]">
                        <span className="block break-words text-base font-semibold text-[#173d35]">{item.original}</span>
                        {item.reading ? <span className="mt-1 block text-xs font-semibold text-[#856033]">{item.reading}</span> : null}
                      </button>
                    </td>
                    <td className="px-3 py-3 align-top text-[#4d5751]">{formatDateTime(item.input_at ?? item.date, locale)}</td>
	                    <td className="px-3 py-3 align-top">
	                      <span className="rounded bg-[#f1eee8] px-2 py-1 text-xs font-semibold text-[#584f43]">{item.jlpt_level ?? '-'}</span>
	                    </td>
	                    <td className="px-3 py-3 align-top">
	                      <div className="flex min-w-0 flex-wrap gap-1.5">
	                        {tags.length ? tags.map((tag) => (
	                          <span key={tag} className="max-w-full truncate rounded bg-[#e8f0eb] px-2 py-1 text-xs font-semibold text-[#31564c]" title={tag}>{tag}</span>
	                        )) : <span className="text-xs font-semibold text-[#8a8175]">-</span>}
	                      </div>
	                    </td>
	                    <td className="px-3 py-3 align-top font-semibold text-[#3f4b45]">
	                      {itemQuestions.length}
	                    </td>
                    <td className="px-3 py-3 align-top text-[#3f4b45]">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="font-semibold">{itemQuestions.length ? `${itemAnswers.length}/${itemQuestions.length}` : labels.entryNoProgress}</span>
                        <StatusPill status={itemProgress?.status ?? 'new'} labels={labels} />
                      </div>
                      {itemProgress?.nextReviewAt ? (
                        <span className="mt-1 block break-words text-xs text-[#6c746f]">{labels.nextReview}: {formatDateTime(itemProgress.nextReviewAt, locale)}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex justify-end gap-1">
                        <IconAction label={`${labels.entryOpen}: ${item.original}`} title={labels.entryOpen} onClick={() => onOpen(item.id)}><ExternalLink size={16} /></IconAction>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e5ddd1] px-4 py-3 text-sm text-[#59645e] md:px-5">
          <span className="font-semibold">
            <span className="md:hidden">{mobilePageEnd} / {items.length} {labels.items}</span>
            <span className="hidden md:inline">{pageStart + 1}-{pageEnd} / {items.length} {labels.items}</span>
          </span>
          <div ref={mobileLoadMoreRef} className="mobile-load-state md:hidden">
            {mobilePageEnd >= items.length ? labels.mobileNoMore : null}
          </div>
          <div className="hidden items-center gap-2 md:flex">
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
        </>
      ) : <EmptyModule labels={labels} />}
    </section>
  );
}

function ModuleAction({ label, children, onClick }: { label: string; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#ead1dc] bg-white px-3 text-sm font-bold text-[#a84269] hover:bg-[#fff0f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95f8a]">
      {children}
      <span>{label}</span>
    </button>
  );
}

function IconAction({ label, title, children, onClick }: { label: string; title: string; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={title} onClick={onClick} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#ead1dc] bg-white text-[#a84269] hover:bg-[#fff0f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95f8a]">
      {children}
    </button>
  );
}

export function WordbookManagerPanel({ labels, wordbooks, onRenameWordbook, onBack }: {
  labels: Record<string, string>;
  wordbooks: Wordbook[];
  onRenameWordbook: (id: string, title: string) => Promise<Wordbook | null>;
  onBack: () => void;
}) {
  const [editingWordbookId, setEditingWordbookId] = useState<string | null>(null);
  const [editingWordbookTitle, setEditingWordbookTitle] = useState('');
  const [renamingWordbook, setRenamingWordbook] = useState(false);
  const [renameWordbookError, setRenameWordbookError] = useState('');
  const vocabularyWordbooks = wordbooks.filter((wordbook) => wordbook.deck !== 'grammar_expression');

  function startRenamingWordbook(wordbook: Wordbook) {
    setEditingWordbookId(wordbook.id);
    setEditingWordbookTitle(wordbook.title);
    setRenameWordbookError('');
  }

  async function renameWordbook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingWordbookId || !editingWordbookTitle.trim() || renamingWordbook) return;
    setRenamingWordbook(true);
    setRenameWordbookError('');
    try {
      const wordbook = await onRenameWordbook(editingWordbookId, editingWordbookTitle.trim());
      if (wordbook) {
        setEditingWordbookId(null);
        setEditingWordbookTitle('');
      }
    } catch (error) {
      setRenameWordbookError(error instanceof Error ? error.message : labels.wordbookRenameFailed);
    } finally {
      setRenamingWordbook(false);
    }
  }

  return (
    <section className="min-w-0 overflow-hidden bg-white md:rounded-lg md:border md:border-[#d8cdbc] md:shadow-sm">
      <div className="border-b border-[#e5ddd1] px-4 py-4 md:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#26352f]">{labels.wordbookManage}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#68736d]">{labels.wordbookManageHint}</p>
          </div>
          <button type="button" onClick={onBack} className="h-9 rounded-md border border-[#d9d0c3] bg-white px-3 text-sm font-semibold text-[#34443c] hover:bg-[#f7f4ef]">
            {labels.backToEntryList}
          </button>
        </div>
      </div>
      <div className="grid gap-3 px-4 py-4 md:px-5">
        {vocabularyWordbooks.length ? vocabularyWordbooks.map((wordbook) => (
          <div key={wordbook.id} className="rounded-md border border-[#dce4de] bg-[#fbfdfb] px-3 py-3">
            {editingWordbookId === wordbook.id ? (
              <form onSubmit={renameWordbook} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={editingWordbookTitle}
                  onChange={(event) => setEditingWordbookTitle(event.target.value)}
                  maxLength={60}
                  autoFocus
                  aria-label={labels.wordbookRenameTitle}
                  className="h-10 min-w-0 flex-1 rounded-md border border-[#c8d1c8] bg-white px-3 text-sm outline-none focus:border-[#24473f]"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={!editingWordbookTitle.trim() || renamingWordbook} className="h-10 rounded-md bg-[#24473f] px-4 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-50">
                    {renamingWordbook ? labels.processing : labels.draftEditSave}
                  </button>
                  <button type="button" onClick={() => { setEditingWordbookId(null); setRenameWordbookError(''); }} className="h-10 rounded-md border border-[#d9d0c3] bg-white px-4 text-sm font-semibold text-[#59645e]">
                    {labels.draftEditCancel}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-base font-semibold text-[#34443c]">{wordbook.title}</span>
                <button type="button" onClick={() => startRenamingWordbook(wordbook)} className="shrink-0 rounded-md border border-[#d9d0c3] bg-white px-3 py-2 text-sm font-semibold text-[#31564c] hover:bg-[#f7f4ef]">
                  {labels.wordbookRename}
                </button>
              </div>
            )}
          </div>
        )) : <p className="rounded-md border border-[#dce4de] bg-[#fbfdfb] px-3 py-3 text-sm text-[#68736d]">{labels.wordbookManageEmpty}</p>}
        {renameWordbookError ? <p role="alert" className="text-sm font-semibold text-[#8f3d2e]">{renameWordbookError}</p> : null}
      </div>
    </section>
  );
}

function StatusPill({ status, labels }: { status: ReviewStatus; labels: Record<string, string> }) {
  const text = status === 'mastered'
    ? labels.statusMastered
    : status === 'review'
      ? labels.statusReview
      : status === 'learning'
        ? labels.statusLearning
        : labels.statusNew;
  const color = status === 'mastered'
    ? 'bg-[#d5eadc] text-[#285d47]'
    : status === 'review'
      ? 'bg-[#e8f0eb] text-[#24473f]'
      : status === 'learning'
        ? 'bg-[#f8ead6] text-[#73532b]'
        : 'bg-[#f1eee8] text-[#665f55]';
  return <span className={`whitespace-nowrap rounded px-2 py-1 text-xs font-semibold ${color}`}>{text}</span>;
}

export function WordDetailPanel({
  item,
  index,
  total,
  showRuby,
  labels,
  locale,
  onShowRubyChange,
  onPrevious,
  onNext,
  onBack,
}: {
  item?: VocabItem;
  index: number;
  total: number;
  showRuby: boolean;
  labels: Record<string, string>;
  locale: Locale;
  onShowRubyChange: (checked: boolean) => void;
  onPrevious: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [touchStart, setTouchStart] = useState<number | null>(null);

  if (!item) {
    return <EmptyModule labels={labels} />;
  }

  function handleTouchEnd(x: number) {
    if (touchStart === null) {
      return;
    }
    const delta = x - touchStart;
    setTouchStart(null);
    if (Math.abs(delta) < 48) {
      return;
    }
    if (delta > 0) {
      onPrevious();
    } else {
      onNext();
    }
  }

  return (
    <section
      className="min-w-0"
      onTouchStart={(event) => setTouchStart(event.changedTouches[0]?.clientX ?? null)}
      onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
    >
      <button type="button" onClick={onBack} className="mb-4 hidden min-h-10 items-center gap-1 text-sm font-bold text-[#a84269] hover:underline md:inline-flex">
        <ChevronLeft size={18} /> {labels.backToEntryList}
      </button>
      <div className="sticky top-12 z-20 mb-3 -mx-4 border-y border-[#f0d4dd] bg-[#fffdf9]/95 px-4 py-2.5 shadow-[0_6px_16px_rgba(79,48,63,0.04)] backdrop-blur md:static md:mx-0 md:border-x-0 md:border-t-0 md:bg-transparent md:px-0 md:pb-3 md:pt-0 md:shadow-none">
        <p className="hidden text-sm font-bold text-[#a84269] md:block">{labels.wordDetail}</p>
        <div className="flex items-center justify-between gap-3 md:mt-3 md:justify-start">
          <CompactToggle checked={showRuby} label={labels.furigana} onChange={onShowRubyChange} />
          <div className="grid shrink-0 grid-cols-[2.75rem_minmax(4.75rem,auto)_2.75rem] items-center gap-1.5" aria-label={labels.wordDetail}>
            <ArrowButton label={labels.prev} direction="left" onClick={onPrevious} disabled={total <= 1} />
            <span className="journal-number rounded-full bg-[#fff0f5] px-2.5 py-2 text-center text-sm font-bold tabular-nums text-[#a84269]" aria-live="polite">
              {total ? `${safeIndex(index, total) + 1} / ${total}` : '0 / 0'}
            </span>
            <ArrowButton label={labels.next} direction="right" onClick={onNext} disabled={total <= 1} />
          </div>
        </div>
      </div>
      <VocabCard
        item={item}
        showRuby={showRuby}
        labels={labels}
        locale={locale}
      />
    </section>
  );
}

function EmptyModule({ labels }: { labels: Record<string, string> }) {
  return (
    <section className="cute-practice-card min-w-0 border border-dashed p-6">
      <h2 className="text-2xl font-black text-[#3d3036]">{labels.moduleEmptyTitle}</h2>
      <p className="mt-3 text-sm leading-7 text-[#74646b]">{labels.moduleEmptyBody}</p>
    </section>
  );
}

function CompactToggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-bold transition-colors ${checked ? 'border-[#d95f8a] bg-[#fff0f5] text-[#a84269]' : 'border-[#d7dfd6] bg-white text-[#68716b]'}`}>
      <span className={`relative h-5 w-9 rounded-full transition-colors ${checked ? 'bg-[#d95f8a]' : 'bg-[#cbd2cc]'}`} aria-hidden="true">
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-[1.125rem]' : 'translate-x-0.5'}`} />
      </span>
      <span>{label}</span>
    </button>
  );
}

function ArrowButton({ label, direction, shortcut, onClick, disabled = false }: { label: string; direction: 'left' | 'right'; shortcut?: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-keyshortcuts={shortcut}
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-[#f0c9d4] bg-white text-[#a84269] hover:bg-[#fff0f5] disabled:cursor-not-allowed disabled:border-[#e3e8e2] disabled:text-[#b8beb9]"
    >
      {direction === 'left' ? <ChevronLeft size={19} /> : <ChevronRight size={19} />}
    </button>
  );
}

function VocabCard({
  item,
  showRuby,
  labels,
  locale,
}: {
  item: VocabItem;
  showRuby: boolean;
  labels: Record<string, string>;
  locale: Locale;
}) {
  const meaning = localized(item, locale, 'meaning') ?? item.meaning_zh;
  const coreMemory = localized(item, locale, 'core_memory') ?? item.core_memory;
  const analysis = localized(item, locale, 'analysis') ?? item.analysis;
  const isGrammarEntry = item.deck === 'grammar_expression';
  const grammarForms = item.grammar_forms?.filter((form) => form.form || form.example || form.meaning_zh || form.connection_zh) ?? [];
  const grammarFeatures = item.grammar_features?.filter((feature) => feature.feature || feature.detail_zh) ?? [];
  const examples = item.examples?.filter((example) => example.ja || example.zh || example.analysis_zh || example.form_analysis_zh) ?? [];
  const inflectionClass = resolvedInflectionClass(item);
  const baseForm = item.base_form ?? (inflectionClass === 'suru' && item.original.endsWith('する') ? item.original : undefined);
  const conjugations = resolvedConjugations(item, inflectionClass, baseForm);
  const everydayAlternatives = item.everyday_alternatives?.filter((alternative) => alternative.ja || alternative.zh) ?? [];
  const registerLabel = item.usage_register
    ? labels[`usageRegister_${item.usage_register}`] ?? item.usage_register
    : null;
  const comparisonNotes = [
    ...(item.comparison_notes ?? []),
    ...(item.comparisons ?? []),
  ].filter((comparison) => comparison.target || comparison.difference_zh);
  const practiceQuestions = item.practice_questions?.filter((question) => question.prompt || question.answer) ?? [];
  return (
    <article className="cute-practice-card min-w-0 border p-4 md:p-6">
      <h3 className="text-3xl font-black text-[#3d3036]">
        <RubyText text={item.original} items={[item]} enabled={showRuby} />
      </h3>
      <div className="mt-5 space-y-5 border-t border-[#f0d4dd] pt-5">
        <section>
          <h4 className="text-xs font-bold text-[#a84269]">{labels.japaneseMeaning}</h4>
          <p className="mt-2 text-sm leading-7 text-[#3d3036]">
            <RubyText text={item.meaning_ja ?? '-'} items={[item]} enabled={showRuby} />
          </p>
        </section>
        {locale !== 'ja' ? (
          <section className="border-t border-[#f0d4dd] pt-5">
            <h4 className="text-xs font-bold text-[#a84269]">{labels.localizedMeaning}</h4>
            <p className="mt-2 text-sm leading-7 text-[#3d3036]">{meaning}</p>
          </section>
        ) : null}
      </div>
      <section className="mt-5 border-t border-[#f0d4dd] pt-5">
        <h4 className="text-xs font-bold text-[#a84269]">{labels.examQuickNote}</h4>
        <p className="mt-2 text-sm leading-7 text-[#3d3036]">{coreMemory}</p>
      </section>
      {item.collocations?.length ? (
        <section className="mt-5 border-t border-[#f0d4dd] pt-5">
          <h4 className="text-xs font-bold text-[#a84269]">{labels.collocationsLabel}</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.collocations.slice(0, 4).map((collocation) => (
              <span key={collocation} className="rounded-full bg-[#fff0f5] px-3 py-1 text-xs font-semibold text-[#8f365b]">
                <RubyText text={collocation} items={[item]} enabled={showRuby} />
              </span>
            ))}
          </div>
        </section>
      ) : null}
      {!isGrammarEntry && examples.length ? (
        <section className="mt-5 border-t border-[#f0d4dd] pt-5">
          <h4 className="text-xs font-bold text-[#a84269]">{labels.vocabularyExamples}</h4>
          <ol className="mt-3 space-y-4">
            {examples.slice(0, 2).map((example, exampleIndex) => (
              <li key={`${example.ja}-${exampleIndex}`} className="border-l-2 border-[#f0c9d4] pl-3">
                {example.ja ? (
                  <p className="text-sm font-bold leading-7 text-[#3d3036]">
                    <span className="journal-number mr-2 text-[#a84269]">{exampleIndex + 1}.</span>
                    <RubyText text={example.ja} items={[item]} enabled={showRuby} />
                  </p>
                ) : null}
                {example.zh ? <p className="mt-1 text-sm leading-6 text-[#74646b]">{example.zh}</p> : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {!isGrammarEntry && conjugations.length ? (
        <section className="mt-5 border-t border-[#f0d4dd] pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="text-xs font-bold text-[#a84269]">{labels.conjugationsLabel}</h4>
            <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
              {inflectionClass ? (
                <span className="rounded-full bg-[#fff0f5] px-2.5 py-1 font-bold text-[#8f365b]">
                  {labels.inflectionClassLabel}：{labels[`inflectionClass_${inflectionClass}`] ?? inflectionClass}
                </span>
              ) : null}
              {baseForm ? <span className="text-[#74646b]">{labels.baseFormLabel}：{baseForm}</span> : null}
            </div>
          </div>
          <dl className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {conjugations.map((conjugation, conjugationIndex) => (
              <div key={`${conjugation.kind}-${conjugation.form}-${conjugationIndex}`} className="border-b border-[#f5e1e7] pb-2">
                <dt className="text-xs font-semibold text-[#8f365b]">{labels[`conjugation_${conjugation.kind}`] ?? conjugation.kind}</dt>
                <dd className="mt-1 text-sm font-bold text-[#3d3036]">
                  <RubyText text={conjugation.form} items={[item]} enabled={showRuby} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      {isGrammarEntry && grammarForms.length ? (
        <section className="mt-5 border-t border-[#f0d4dd] pt-5">
          <h4 className="text-xs font-bold text-[#a84269]">{labels.grammarConnection ?? '接续格式'}</h4>
          <div className="mt-3 space-y-3">
            {grammarForms.map((form, formIndex) => (
              <div key={`${form.form ?? 'form'}-${formIndex}`} className="border-l-2 border-[#f0c9d4] pl-3">
                {form.form ? <p className="text-sm font-bold leading-7 text-[#3d3036]">{form.form}</p> : null}
                {form.connection_zh ? <p className="mt-1 text-sm leading-6 text-[#74646b]">{form.connection_zh}</p> : null}
                {form.example ? (
                  <p className="mt-1 text-sm leading-7 text-[#3d3036]">
                    <RubyText text={form.example} items={[item]} enabled={showRuby} />
                  </p>
                ) : null}
                {form.meaning_zh ? <p className="mt-1 text-sm leading-6 text-[#74646b]">{form.meaning_zh}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {isGrammarEntry && grammarFeatures.length ? (
        <section className="mt-5 border-t border-[#f0d4dd] pt-5">
          <h4 className="text-xs font-bold text-[#a84269]">{labels.grammarTips ?? '用法技巧'}</h4>
          <div className="mt-3 divide-y divide-[#f0d4dd] border-y border-[#f0d4dd]">
            {grammarFeatures.map((feature, featureIndex) => (
              <div key={`${feature.feature ?? 'feature'}-${featureIndex}`} className="py-3">
                {feature.feature ? <p className="text-sm font-bold leading-6 text-[#3d3036]">{feature.feature}</p> : null}
                {feature.detail_zh ? <p className="mt-1 text-sm leading-6 text-[#74646b]">{feature.detail_zh}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {isGrammarEntry && examples.length ? (
        <section className="mt-5 border-t border-[#f0d4dd] pt-5">
          <h4 className="text-xs font-bold text-[#a84269]">{labels.exampleAnalysis ?? '例句分析'}</h4>
          <div className="mt-3 space-y-4">
            {examples.map((example, exampleIndex) => (
              <div key={`${example.ja}-${exampleIndex}`} className="border-l-2 border-[#f0c9d4] pl-3">
                {example.ja ? (
                  <p className="text-sm font-bold leading-7 text-[#3d3036]">
                    <RubyText text={example.ja} items={[item]} enabled={showRuby} />
                  </p>
                ) : null}
                {example.zh ? <p className="mt-1 text-sm leading-6 text-[#74646b]">{example.zh}</p> : null}
                {example.form_analysis_zh ? <p className="mt-2 text-sm leading-6 text-[#8f365b]">{example.form_analysis_zh}</p> : null}
                {example.analysis_zh ? <p className="mt-1 text-sm leading-6 text-[#74646b]">{example.analysis_zh}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {isGrammarEntry && (registerLabel || item.usage_register_zh || item.exam_register_zh || everydayAlternatives.length) ? (
        <section className="mt-5 border-t border-[#f0d4dd] pt-5">
          <h4 className="text-xs font-bold text-[#a84269]">{labels.grammarRegister ?? '语体与口语说法'}</h4>
          <div className="mt-3 space-y-3">
            {registerLabel ? (
              <div className="flex flex-wrap items-start gap-2">
                <span className="rounded-full bg-[#fff0f5] px-3 py-1 text-xs font-bold text-[#8f365b]">{registerLabel}</span>
                {item.usage_register_zh ? <p className="min-w-0 flex-1 text-sm leading-6 text-[#3d3036]">{item.usage_register_zh}</p> : null}
              </div>
            ) : item.usage_register_zh ? (
              <p className="text-sm leading-6 text-[#3d3036]">{item.usage_register_zh}</p>
            ) : null}
            {item.exam_register_zh ? (
              <p className="rounded-xl bg-[#fffaf5] px-3 py-2 text-sm leading-6 text-[#74646b]">
                <span className="font-bold text-[#8f365b]">{labels.examRegisterNote ?? '考试提示'}：</span>
                {item.exam_register_zh}
              </p>
            ) : null}
            {everydayAlternatives.length ? (
              <div>
                <p className="text-xs font-bold text-[#8f365b]">{labels.spokenAlternatives ?? '口语一般这样说'}</p>
                <div className="mt-2 space-y-2">
                  {everydayAlternatives.map((alternative, alternativeIndex) => (
                    <div key={`${alternative.ja ?? 'alt'}-${alternativeIndex}`} className="border-l-2 border-[#f0c9d4] pl-3">
                      {alternative.ja ? <p className="text-sm font-bold leading-6 text-[#3d3036]">{alternative.ja}</p> : null}
                      {alternative.zh ? <p className="mt-0.5 text-sm leading-6 text-[#74646b]">{alternative.zh}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
      {isGrammarEntry && comparisonNotes.length ? (
        <section className="mt-5 border-t border-[#f0d4dd] pt-5">
          <h4 className="text-xs font-bold text-[#a84269]">{labels.comparisonNotes ?? '近义辨析'}</h4>
          <div className="mt-3 divide-y divide-[#f0d4dd] border-y border-[#f0d4dd]">
            {comparisonNotes.map((comparison, comparisonIndex) => (
              <div key={`${comparison.target ?? 'comparison'}-${comparisonIndex}`} className="py-3">
                {comparison.target ? <p className="text-sm font-bold leading-6 text-[#3d3036]">{comparison.target}</p> : null}
                {comparison.difference_zh ? <p className="mt-1 text-sm leading-6 text-[#74646b]">{comparison.difference_zh}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {isGrammarEntry && practiceQuestions.length ? (
        <section className="mt-5 border-t border-[#f0d4dd] pt-5">
          <h4 className="text-xs font-bold text-[#a84269]">{labels.practiceQuestionAnalysis ?? '模拟题解析'}</h4>
          <div className="mt-3 space-y-4">
            {practiceQuestions.map((question, questionIndex) => (
              <div key={question.id ?? `${question.prompt}-${questionIndex}`} className="border-l-2 border-[#f0c9d4] pl-3">
                {question.prompt ? (
                  <p className="text-sm font-bold leading-7 text-[#3d3036]">
                    <span className="journal-number mr-2 text-[#a84269]">{questionIndex + 1}.</span>
                    <RubyText text={question.prompt} items={[item]} enabled={showRuby} />
                  </p>
                ) : null}
                {question.choices?.length ? (
                  <div className="mt-2 grid gap-1 text-sm leading-6 text-[#74646b] sm:grid-cols-2">
                    {question.choices.map((choice, choiceIndex) => (
                      <span key={`${choice}-${choiceIndex}`}>{choiceIndex + 1}. {choice}</span>
                    ))}
                  </div>
                ) : null}
                {question.answer ? <p className="mt-2 text-sm font-bold leading-6 text-[#3d3036]">正确答案：{question.answer}</p> : null}
                {question.translation_zh ? (
                  <p className="mt-2 rounded-xl bg-[#fffaf5] px-3 py-2 text-sm leading-6 text-[#3d3036]">
                    <span className="font-bold text-[#8f365b]">{labels.fullChineseTranslation ?? '完整中文翻译'}：</span>
                    {question.translation_zh}
                  </p>
                ) : null}
                {question.form_analysis_zh ? <p className="mt-1 text-sm leading-6 text-[#8f365b]">{question.form_analysis_zh}</p> : null}
                {question.explanation_zh ? <p className="mt-1 text-sm leading-6 text-[#74646b]">{question.explanation_zh}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {analysis ? (
        <section className="mt-5 border-t border-[#f0d4dd] pt-5">
          <h4 className="text-xs font-bold text-[#a84269]">{labels.analysis}</h4>
          <p className="mt-2 text-sm leading-7 text-[#74646b]">
            <RubyText text={analysis} items={[item]} enabled={showRuby} />
          </p>
        </section>
      ) : null}
      {item.content_origin === 'ai_generated' && item.verification_status !== 'verified' ? (
        <p className="mt-3 rounded-2xl border border-[#f0cf80] bg-[#fff8df] p-3 text-xs leading-5 text-[#775516]">
          {labels.unverifiedContentNotice}
        </p>
      ) : null}
    </article>
  );
}

function resolvedInflectionClass(item: VocabItem) {
  if (item.inflection_class) return item.inflection_class;
  if (/動詞|动词|verb/iu.test(`${item.type} ${item.part_of_speech ?? ''}`) && item.original.endsWith('する')) return 'suru' as const;
  return undefined;
}

function resolvedConjugations(item: VocabItem, inflectionClass: VocabItem['inflection_class'], baseForm?: string) {
  const stored = item.conjugations?.filter((conjugation) => conjugation.kind && conjugation.form) ?? [];
  if (stored.length || inflectionClass !== 'suru' || !baseForm?.endsWith('する')) return stored;
  const stem = baseForm.slice(0, -2);
  return [
    { kind: 'dictionary', form: baseForm },
    { kind: 'polite', form: `${stem}します` },
    { kind: 'negative', form: `${stem}しない` },
    { kind: 'past', form: `${stem}した` },
    { kind: 'te', form: `${stem}して` },
    { kind: 'conditional', form: `${stem}すれば` },
  ];
}

function RubyText({ text, items, enabled }: { text: string; items: VocabItem[]; enabled: boolean }) {
  if (!enabled) {
    return <>{text}</>;
  }

  const terms = rubyTermsForItems(items);
  if (!terms.length) {
    return <>{text}</>;
  }

  const parts: ReactNode[] = [];
  let index = 0;
  while (index < text.length) {
    const term = terms.find((candidate) => text.startsWith(candidate.surface, index));
    if (!term) {
      parts.push(text[index]);
      index += 1;
      continue;
    }
    parts.push(
      <ruby key={`${term.surface}-${index}`}>
        {term.surface}
        <rp>(</rp>
        <rt>{term.reading}</rt>
        <rp>)</rp>
      </ruby>,
    );
    index += term.surface.length;
  }
  return <>{parts}</>;
}

function rubyTermsForItems(items: VocabItem[]) {
  const fromItems = items.flatMap((item) => [
    ...(item.reading ? [{ text: item.original, reading: item.reading }] : []),
    ...(item.ruby_terms ?? []),
  ]);
  const seen = new Set<string>();
  return [...fromItems, ...defaultRubyTerms]
    .filter((term) => {
      const key = `${term.text}\u0000${term.reading}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .map((term) => ({ surface: term.text, reading: term.reading }))
    .sort((a, b) => b.surface.length - a.surface.length);
}
