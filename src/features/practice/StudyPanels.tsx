import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { defaultRubyTerms } from '../../data/rubyTerms';
import { localized } from '../../domain/items';
import type { AnswerState, DisplaySettings, FeedbackMode, Locale, PracticeAttempt, Question, QuestionKind, VocabItem } from '../../types';

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[#d7ccb9] bg-white px-4 py-3">
      <p className="text-xs font-semibold text-[#6b6a64]">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
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

function safeIndex(index: number, total: number) {
  return total ? ((index % total) + total) % total : 0;
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
      <section className="min-w-0 bg-white px-4 pb-6 pt-5 lg:hidden">
        {mobileQuestion && mobileAnswer ? (
          <>
            <button type="button" onClick={() => setMobileAnswerId(null)} className="flex min-h-10 items-center gap-1 text-sm font-semibold text-[#31564c]">
              <ChevronLeft size={18} /> {labels.reviewSummaryTitle}
            </button>
            <div className="mt-3 border-b border-[#dfe5df] pb-5">
              <p className="text-xs font-semibold text-[#856033]">{mobileQuestion.title}</p>
              <h2 className="mt-2 text-xl font-semibold leading-8 text-[#27312c]"><QuestionPrompt text={mobileQuestion.prompt} target={mobileQuestion.promptTarget} /></h2>
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
            <header className="border-b border-[#dfe5df] pb-5">
              <p className="text-xs font-semibold text-[#856033]">{labels.latestAttempt}</p>
              <h2 className="mt-1 text-2xl font-semibold text-[#27312c]">{labels.reviewSummaryTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-[#68716c]">{labels.reviewSummaryBody}</p>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={onBackToPractice} className="h-10 flex-1 rounded-md border border-[#c8bcae] bg-white px-3 text-sm font-semibold text-[#24473f]">{labels.backToPractice}</button>
                <button type="button" onClick={onRestart} className="h-10 flex-1 rounded-md bg-[#31564c] px-3 text-sm font-semibold text-white">{labels.restartPractice}</button>
              </div>
            </header>

            <div className="grid grid-cols-2 border-b border-[#dfe5df] py-4">
              <div className="border-r border-[#dfe5df] pr-4">
                <p className="text-xs text-[#707a74]">{labels.correct}</p>
                <p className="mt-1 text-xl font-semibold text-[#27312c]">{summary.correct} / {summary.total}</p>
              </div>
              <div className="pl-4">
                <p className="text-xs text-[#707a74]">{labels.accuracy}</p>
                <p className="mt-1 text-xl font-semibold text-[#27312c]">{Math.round(summary.accuracy * 100)}%</p>
              </div>
            </div>

            <div className="pt-4">
              <h3 className="text-sm font-semibold text-[#27312c]">{labels.reviewPage}</h3>
              {reviewAnswers.length ? (
                <div className="mt-2 divide-y divide-[#dfe5df] border-y border-[#dfe5df]">
                  {reviewAnswers.map((answer, index) => {
                    const question = questionMap.get(answer.questionId);
                    return question ? (
                      <button key={answer.questionId} type="button" onClick={() => setMobileAnswerId(answer.questionId)} className="flex min-h-16 w-full items-center gap-3 py-3 text-left">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#edf2ed] text-sm font-semibold text-[#31564c]">{index + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-[#34413b]">{question.title}</span>
                          <span className="mt-1 block truncate text-xs text-[#707a74]">{question.prompt}</span>
                        </span>
                        <span className={`shrink-0 text-xs font-semibold ${answer.correct ? 'text-[#356146]' : 'text-[#8a493c]'}`}>{answer.correct ? labels.correct : labels.wrong}</span>
                        <ChevronRight size={17} className="shrink-0 text-[#758079]" />
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
      <div className="rounded-lg border border-[#d8cdbc] bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#856033]">{labels.latestAttempt}</p>
            <h2 className="mt-2 text-2xl font-semibold">{labels.reviewSummaryTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-[#5f625b]">{labels.reviewSummaryBody}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onBackToPractice} className="h-10 rounded-md border border-[#c8bcae] bg-white px-3 text-sm font-semibold text-[#24473f] hover:bg-[#f2f6f1]">
              {labels.backToPractice}
            </button>
            <button type="button" onClick={onRestart} className="h-10 rounded-md bg-[#173d35] px-3 text-sm font-semibold text-white">
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
          <div className="rounded-md border border-[#e1d7c9] bg-[#fffaf4] p-3">
            <p className="text-sm font-semibold text-[#313934]">{labels.historyTitle}</p>
            <p className="mt-2 text-sm leading-6 text-[#5f625b]">
              {labels.startedAt}: {formatDateTime(attempt?.startedAt, locale)}
              <br />
              {labels.completedAt}: {formatDateTime(attempt?.completedAt, locale)}
            </p>
          </div>
          <div className="rounded-md border border-[#cbd6cf] bg-[#f3f7f2] p-3">
            <p className="text-sm font-semibold text-[#313934]">{labels.suggestionLabel}</p>
            <p className="mt-2 text-sm leading-6 text-[#4f5b55]">{attemptSuggestion(attempt, labels)}</p>
          </div>
        </div>

        {attempt ? (
          <details className="mt-4 rounded-md border border-[#d9d0c3] bg-[#fffdfa] p-3">
            <summary className="cursor-pointer text-sm font-semibold text-[#24473f]">{labels.aiSuggestionPromptLabel}</summary>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-[#f5f7f3] p-3 text-xs leading-5 text-[#313934]">{aiPromptSeed(attempt, questions)}</pre>
          </details>
        ) : null}
      </div>

      {!reviewAnswers.length ? (
        <div className="rounded-lg border border-dashed border-[#bac8c0] bg-white p-6 shadow-sm">
          <p className="text-sm leading-6 text-[#5f625b]">{labels.noAttemptHistory}</p>
        </div>
      ) : null}

      {wrongAnswers.length ? (
        <div className="rounded-lg border border-[#d8cdbc] bg-white p-4 shadow-sm md:p-5">
          <h3 className="text-lg font-semibold">{labels.wrongQuestions}</h3>
          <div className="mt-3 space-y-4">
            {wrongAnswers.map((answer) => {
              const question = questionMap.get(answer.questionId);
              return question ? (
                <div key={answer.questionId} className="rounded-md border border-[#e1d7c9] bg-[#fffaf4] p-3">
                  <p className="text-sm font-semibold text-[#856033]">{question.title}</p>
                  <p className="mt-2 text-base leading-7 text-[#353b37]"><QuestionPrompt text={question.prompt} target={question.promptTarget} /></p>
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
            <div key={answer.questionId} className="rounded-lg border border-[#d8cdbc] bg-white p-4 shadow-sm md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#856033]">{question.title}</p>
                  <p className="mt-2 text-base leading-7 text-[#353b37]"><QuestionPrompt text={question.prompt} target={question.promptTarget} /></p>
                </div>
                <span className={`rounded px-2 py-1 text-sm font-semibold ${answer.correct ? 'bg-[#d5eadc] text-[#285d47]' : 'bg-[#faf0df] text-[#665d4b]'}`}>
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
  return (
    <section className="min-w-0 border-y border-[#d8cdbc] bg-white px-4 pb-6 pt-4 md:rounded-lg md:border md:p-5 md:shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2ddd4] pb-4">
        <p className="text-sm font-semibold text-[#856033]">{questionTypeLabel}</p>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {questionsLength > 1 ? <ArrowButton label={labels.prev} direction="left" onClick={onPrev} /> : null}
          <div className="flex min-h-10 min-w-24 flex-col items-center justify-center rounded-md bg-[#e8f0eb] px-2 py-1 text-[#24473f] sm:min-w-32 sm:px-3">
            <span className="text-sm font-semibold">{questionsLength ? `${activeIndex + 1} / ${questionsLength}` : '0 / 0'}</span>
            <span className="text-xs">{labels.completed} {answeredCount} / {questionsLength}</span>
          </div>
          {answeredCount > 0 ? (
            <button type="button" onClick={onRestart} aria-label={labels.restartPractice} title={labels.restartPractice} className="flex h-10 w-10 items-center justify-center rounded-md border border-[#c8bcae] bg-white text-[#24473f] hover:bg-[#f2f6f1] sm:w-auto sm:px-3">
              <RotateCcw size={17} />
              <span className="ml-2 hidden text-sm font-semibold sm:inline">{labels.restartPractice}</span>
            </button>
          ) : null}
          {questionsLength > 1 ? (
            <ArrowButton label={labels.next} direction="right" onClick={onNext} />
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <h2 className="text-2xl font-semibold">{activeQuestion?.title ?? labels.noQuestion}</h2>
        {activeQuestion?.instruction ? (
          <p className="mt-3 text-sm leading-6 text-[#68716c]">{activeQuestion.instruction}</p>
        ) : null}
        <p className={`${activeQuestion?.instruction ? 'mt-4' : 'mt-3'} break-words text-lg leading-8 text-[#353b37]`}>
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
                const shouldReveal = complete || feedbackMode === 'immediate';
                const color = !answered
                  ? 'border-[#ddd4c8] bg-[#fffaf3] hover:bg-[#f5eadf]'
                  : shouldReveal
                    ? isAnswer
                      ? 'border-[#3d735f] bg-[#e5f2ea]'
                      : isSelected
                        ? 'border-[#b59a66] bg-[#f6f0e2]'
                        : 'border-[#ddd4c8] bg-[#f8f3eb] opacity-70'
                    : isSelected
                      ? 'border-[#9ca7a2] bg-[#eef2ef]'
                      : 'border-[#ddd4c8] bg-[#fffaf3]';
                return (
                  <button
                    type="button"
                    key={choice}
                    disabled={Boolean(answered)}
                    onClick={() => onAnswer(activeQuestion, choice)}
                    className={`flex min-h-14 min-w-0 items-start gap-3 rounded-md border px-4 py-3 text-left text-base font-semibold break-words disabled:cursor-default ${color}`}
                  >
                    <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-current text-xs">
                      {choiceIndex + 1}
                    </span>
                    <span className="min-w-0 pt-0.5">{choice}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {(feedbackMode === 'immediate' || complete) && answers[activeQuestion.id] ? (
            <>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#dfe5df] pt-4 lg:hidden">
                <p role="status" className={`text-sm font-semibold ${answers[activeQuestion.id].correct ? 'text-[#356146]' : 'text-[#8a493c]'}`}>
                  {answers[activeQuestion.id].correct ? labels.correct : labels.wrong}
                </p>
                <button type="button" onClick={onReview} className="h-10 rounded-md bg-[#31564c] px-4 text-sm font-semibold text-white">
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
    ? 'border-[#8eb3a1] bg-[#f1f7f3] text-[#285d47]'
    : 'border-[#cdbd98] bg-[#faf7ef] text-[#665d4b]';

  return (
    <div className={`mt-5 rounded-lg border p-4 ${statusStyle}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="rounded bg-white/70 px-2 py-1 text-sm font-semibold">{answer.correct ? labels.correct : labels.wrong}</p>
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
        <p className="mt-3 rounded-md border border-[#d5a95f] bg-[#fff4d8] p-3 text-sm leading-6 text-[#6f4a16]">
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

export function WordIndexPanel({ items, labels, locale, onOpen }: {
  items: VocabItem[];
  labels: Record<string, string>;
  locale: Locale;
  onOpen: (id: string) => void;
}) {
  return (
    <section className="min-w-0 bg-white px-4 py-5 md:rounded-lg md:border md:border-[#d8cdbc] md:p-5">
      <h2 className="text-2xl font-semibold text-[#27312c]">{labels.entryListTitle}</h2>
      <p className="mt-2 text-sm leading-6 text-[#68716b]">{labels.entryListBody}</p>
      {items.length ? (
        <div className="mt-5 divide-y divide-[#dfe5df] border-y border-[#dfe5df]">
          {items.map((item) => (
            <button key={item.id} type="button" onClick={() => onOpen(item.id)} className="flex min-h-24 w-full items-center gap-4 py-4 text-left hover:bg-[#f8faf7]">
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold text-[#27312c]">{item.original}</span>
                {item.reading ? <span className="mt-1 block text-sm text-[#7d6032]">{item.reading}</span> : null}
                <span className="mt-2 block text-sm leading-6 text-[#68716b]">{localized(item, locale, 'meaning') ?? item.meaning_zh}</span>
              </span>
              <ChevronRight size={19} className="shrink-0 text-[#758079]" />
            </button>
          ))}
        </div>
      ) : <EmptyModule labels={labels} />}
    </section>
  );
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
      <button type="button" onClick={onBack} className="mb-4 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-[#31564c] hover:underline">
        <ChevronLeft size={18} /> {labels.backToEntryList}
      </button>
      <div className="mb-3 border-b border-[#dfe5df] pb-3">
        <p className="text-sm font-semibold text-[#856033]">{labels.wordDetail}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CompactToggle checked={showRuby} label={labels.furigana} onChange={onShowRubyChange} />
          {total > 1 ? <ArrowButton label={labels.prev} direction="left" onClick={onPrevious} /> : null}
          <span className="min-w-20 rounded-md bg-[#e8f0eb] px-3 py-2 text-center text-sm font-semibold text-[#24473f]">
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
    <section className="min-w-0 rounded-lg border border-dashed border-[#bac8c0] bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">{labels.moduleEmptyTitle}</h2>
      <p className="mt-3 text-sm leading-7 text-[#5f625b]">{labels.moduleEmptyBody}</p>
    </section>
  );
}

function CompactToggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-[#c8bcae] bg-white px-3 text-sm font-semibold text-[#24473f]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#24473f]"
      />
      <span>{label}</span>
    </label>
  );
}

function ArrowButton({ label, direction, onClick }: { label: string; direction: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-md border border-[#c8bcae] bg-white text-[#24473f] hover:bg-[#f2f6f1]"
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
    <article className="min-w-0 rounded-lg border border-[#d8cdbc] bg-white p-4 shadow-sm md:p-6">
      <h3 className="text-3xl font-semibold">
        <RubyText text={item.original} items={[item]} enabled={showRuby} />
      </h3>
      <div className="mt-5 space-y-5 border-t border-[#e5ddd1] pt-5">
        <section>
          <h4 className="text-xs font-semibold text-[#856033]">{labels.japaneseMeaning}</h4>
          <p className="mt-2 text-sm leading-7 text-[#313934]">
            <RubyText text={item.meaning_ja ?? '-'} items={[item]} enabled={showRuby} />
          </p>
        </section>
        {locale !== 'ja' ? (
          <section className="border-t border-[#e5ddd1] pt-5">
            <h4 className="text-xs font-semibold text-[#856033]">{labels.localizedMeaning}</h4>
            <p className="mt-2 text-sm leading-7 text-[#313934]">{meaning}</p>
          </section>
        ) : null}
      </div>
      <section className="mt-5 border-t border-[#e5ddd1] pt-5">
        <h4 className="text-xs font-semibold text-[#856033]">{labels.examQuickNote}</h4>
        <p className="mt-2 text-sm leading-7 text-[#313934]">{coreMemory}</p>
      </section>
      {item.collocations?.length ? (
        <section className="mt-5 border-t border-[#e5ddd1] pt-5">
          <h4 className="text-xs font-semibold text-[#856033]">{labels.collocationsLabel}</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.collocations.slice(0, 4).map((collocation) => (
              <span key={collocation} className="rounded-md bg-[#f4eee6] px-2 py-1 text-xs text-[#554f48]">
                <RubyText text={collocation} items={[item]} enabled={showRuby} />
              </span>
            ))}
          </div>
        </section>
      ) : null}
      {analysis ? (
        <section className="mt-5 border-t border-[#e5ddd1] pt-5">
          <h4 className="text-xs font-semibold text-[#856033]">{labels.analysis}</h4>
          <p className="mt-2 text-sm leading-7 text-[#5f625b]">
            <RubyText text={analysis} items={[item]} enabled={showRuby} />
          </p>
        </section>
      ) : null}
      {item.content_origin === 'ai_generated' && item.verification_status !== 'verified' ? (
        <p className="mt-3 rounded-md border border-[#d5a95f] bg-[#fff4d8] p-3 text-xs leading-5 text-[#6f4a16]">
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
