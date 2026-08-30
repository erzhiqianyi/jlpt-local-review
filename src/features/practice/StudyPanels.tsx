import { ChevronLeft, ChevronRight, ExternalLink, Lightbulb, Plus, RotateCcw, ScrollText, Target } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { defaultRubyTerms } from '../../data/rubyTerms';
import { localized } from '../../domain/items';
import type { AnswerState, DisplaySettings, FeedbackMode, LearningCaptureCategory, Locale, PracticeAttempt, ProgressState, Question, QuestionKind, ReviewStatus, VocabItem } from '../../types';

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
const QUESTION_KIND_LABEL_KEYS: Record<QuestionKind, string> = {
  grammar: 'grammar',
  meaning: 'meaning',
  moji_goi: 'mojiGoi',
  kana_to_kanji: 'kanaToKanji',
  kanji_to_kana: 'kanjiToKana',
};

function safeIndex(index: number, total: number) {
  return total ? ((index % total) + total) % total : 0;
}

function isTextEntryTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

function entryTags(item: VocabItem, labels: Record<string, string>) {
  const tags = new Set<string>();
  item.practice_questions?.forEach((question) => {
    if (question.kind) tags.add(question.kind);
  });
  item.question_kinds?.forEach((kind) => {
    tags.add(labels[QUESTION_KIND_LABEL_KEYS[kind]] ?? kind);
  });
  item.tags?.forEach((tag) => {
    if (tag === 'mcp-draft') tags.add(labels.entryTagDraft);
    if (tag === 'codex-chat-review') tags.add(labels.entryTagChatReview);
  });
  if (item.content_origin === 'ai_generated') tags.add(labels.entryGenerated);
  return [...tags].filter(Boolean).slice(0, 3);
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
  onRestart,
  onReview,
}: {
  activeQuestion?: Question;
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
  onRestart: () => void;
  onReview: () => void;
}) {
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

  return (
    <section className="cute-practice-card min-w-0 border px-4 pb-6 pt-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0d4dd] pb-4">
        <p className="text-sm font-bold text-[#a84269]">{questionTypeLabel}</p>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {questionsLength > 1 ? <ArrowButton label={labels.prev} direction="left" shortcut="ArrowLeft" onClick={onPrev} /> : null}
          <div className="flex min-h-10 min-w-24 flex-col items-center justify-center rounded-2xl bg-[#fff0f5] px-2 py-1 text-[#a84269] sm:min-w-32 sm:px-3">
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
                    onClick={() => onAnswer(activeQuestion, choice)}
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
              <button type="button" onClick={onReview} className="cute-button-primary h-10 rounded-full px-4 text-sm font-bold text-white">
                {labels.reviewPage}
              </button>
            </div>
          ) : null}
          {feedbackMode === 'immediate' && answers[activeQuestion.id] ? (
            <>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#f0d4dd] pt-4 lg:hidden">
                <p role="status" className={`text-sm font-bold ${answers[activeQuestion.id].correct ? 'text-[#356146]' : 'text-[#a84269]'}`}>
                  {answers[activeQuestion.id].correct ? labels.correct : labels.wrong}
                </p>
                <button type="button" onClick={onReview} className="cute-button-primary h-10 rounded-full px-4 text-sm font-bold text-white">
                  {labels.reviewPage}
                </button>
              </div>
              <div className="hidden lg:block">
                <AnswerPanel
                  question={activeQuestion}
                  answer={answers[activeQuestion.id]}
                  items={items}
                  showRuby={settings.showExplanationRuby}
                  labels={labels}
                  locale={settings.locale}
                />
              </div>
            </>
          ) : null}
        </>
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

export function WordIndexPanel({ items, questions, answers, progress, labels, locale, captureCategory, pendingCaptureCount = 0, onOpen, onPractice, onTips, onReview, onSaveCapture }: {
  items: VocabItem[];
  questions: Question[];
  answers: AnswerState;
  progress: ProgressState;
  labels: Record<string, string>;
  locale: Locale;
  captureCategory?: LearningCaptureCategory;
  pendingCaptureCount?: number;
  onOpen: (id: string) => void;
  onPractice?: () => void;
  onTips?: () => void;
  onReview?: () => void;
  onSaveCapture?: (input: { body: string; category: LearningCaptureCategory; context?: string }) => Promise<void>;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [showCaptureForm, setShowCaptureForm] = useState(false);
  const [captureBody, setCaptureBody] = useState('');
  const [captureContext, setCaptureContext] = useState('');
  const [captureSaving, setCaptureSaving] = useState(false);
  const [captureSaved, setCaptureSaved] = useState(false);
  const questionsByItem = questions.reduce<Record<string, Question[]>>((groups, question) => {
    groups[question.itemId] = [...(groups[question.itemId] ?? []), question];
    return groups;
  }, {});
  const pageCount = Math.max(1, Math.ceil(items.length / WORD_INDEX_PAGE_SIZE));
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const pageStart = currentPage * WORD_INDEX_PAGE_SIZE;
  const pageItems = items.slice(pageStart, pageStart + WORD_INDEX_PAGE_SIZE);
  const pageEnd = pageStart + pageItems.length;

  useEffect(() => {
    setPageIndex((index) => Math.min(index, pageCount - 1));
  }, [pageCount]);

  async function saveCapture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!captureBody.trim() || !captureCategory || !onSaveCapture || captureSaving) return;
    setCaptureSaving(true);
    setCaptureSaved(false);
    try {
      await onSaveCapture({
        body: captureBody.trim(),
        category: captureCategory,
        context: captureContext.trim() || labels.entryCaptureContextDefault,
      });
      setCaptureBody('');
      setCaptureContext('');
      setCaptureSaved(true);
    } finally {
      setCaptureSaving(false);
    }
  }

  return (
    <section className="min-w-0 overflow-hidden bg-white md:rounded-lg md:border md:border-[#d8cdbc] md:shadow-sm">
      <div className="border-b border-[#e5ddd1] px-4 py-4 md:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {captureCategory && onSaveCapture ? (
              <ModuleAction label={captureCategory === 'grammar' ? labels.entryAddGrammar : labels.entryAddWord} onClick={() => { setShowCaptureForm((value) => !value); setCaptureSaved(false); }}>
                <Plus size={16} />
              </ModuleAction>
            ) : null}
            {onPractice ? <ModuleAction label={labels.questionPage} onClick={onPractice}><Target size={16} /></ModuleAction> : null}
            {onTips ? <ModuleAction label={labels.navQuestionTypes} onClick={onTips}><Lightbulb size={16} /></ModuleAction> : null}
            {onReview ? <ModuleAction label={labels.reviewPage} onClick={onReview}><ScrollText size={16} /></ModuleAction> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {captureCategory && pendingCaptureCount ? <span className="rounded-md bg-[#fff8df] px-3 py-1 text-sm font-semibold text-[#775516]">{labels.entryPendingCapture}: {pendingCaptureCount}</span> : null}
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
        <div className="overflow-x-auto md:overflow-x-visible">
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
	                const tags = entryTags(item, labels);
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
            {pageStart + 1}-{pageEnd} / {items.length} {labels.items}
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
      <button type="button" onClick={onBack} className="mb-4 inline-flex min-h-10 items-center gap-1 text-sm font-bold text-[#a84269] hover:underline">
        <ChevronLeft size={18} /> {labels.backToEntryList}
      </button>
      <div className="mb-3 border-b border-[#f0d4dd] pb-3">
        <p className="text-sm font-bold text-[#a84269]">{labels.wordDetail}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CompactToggle checked={showRuby} label={labels.furigana} onChange={onShowRubyChange} />
          {total > 1 ? <ArrowButton label={labels.prev} direction="left" onClick={onPrevious} /> : null}
          <span className="journal-number min-w-20 rounded-full bg-[#fff0f5] px-3 py-2 text-center text-sm font-bold text-[#a84269]">
            {total ? `${safeIndex(index, total) + 1} / ${total}` : '0 / 0'}
          </span>
          {total > 1 ? <ArrowButton label={labels.next} direction="right" onClick={onNext} /> : null}
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
    <label className="flex h-10 cursor-pointer items-center gap-2 rounded-full border border-[#f0c9d4] bg-white px-3 text-sm font-bold text-[#a84269]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#d95f8a]"
      />
      <span>{label}</span>
    </label>
  );
}

function ArrowButton({ label, direction, shortcut, onClick }: { label: string; direction: 'left' | 'right'; shortcut?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-keyshortcuts={shortcut}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f0c9d4] bg-white text-[#a84269] hover:bg-[#fff0f5]"
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
