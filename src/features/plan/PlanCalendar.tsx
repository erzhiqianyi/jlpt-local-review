import { BookAudio, BookOpenText, ChevronLeft, ChevronRight, ClipboardList, FileStack, ListChecks } from 'lucide-react';
import { useMemo, useState } from 'react';
import { calendarDays, localDateString, tasksForDate } from '../../domain/studyPlan';
import type { Locale, StudyDailySummary, StudyPlanDayEvidence, StudyPlanTask, StudyPlanTaskStatus } from '../../types';

export function PlanCalendar({
  labels,
  locale,
  tasks,
  summaries,
  evidence,
  onTaskStatus,
}: {
  labels: Record<string, string>;
  locale: Locale;
  tasks: StudyPlanTask[];
  summaries: StudyDailySummary[];
  evidence: StudyPlanDayEvidence[];
  onTaskStatus: (id: string, status: StudyPlanTaskStatus) => Promise<void>;
}) {
  const today = localDateString(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [month, setMonth] = useState(() => new Date(`${today.slice(0, 7)}-01T00:00:00`));
  const [updatingId, setUpdatingId] = useState('');
  const days = useMemo(() => calendarDays(month), [month]);
  const selectedTasks = tasksForDate(tasks, selectedDate);
  const selectedSummary = summaries.find((summary) => summary.date === selectedDate);
  const selectedEvidence = evidence.find((item) => item.date === selectedDate) ?? emptyEvidence(selectedDate);
  const weekdays = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2026, 7, 23 + index)));

  async function update(id: string, status: StudyPlanTaskStatus) {
    setUpdatingId(id);
    try {
      await onTaskStatus(id, status);
    } finally {
      setUpdatingId('');
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
      <section className="min-w-0 space-y-5">
        <DayFocus
          labels={labels}
          locale={locale}
          date={selectedDate}
          today={today}
          tasks={selectedTasks}
          summary={selectedSummary}
          evidence={selectedEvidence}
          updatingId={updatingId}
          onTaskStatus={update}
        />
      </section>

      <aside className="min-w-0 rounded-lg border border-[#dfe5dc] bg-[#fbfcf8] p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <button type="button" aria-label={labels.planPreviousMonth} title={labels.planPreviousMonth} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className={iconButtonClass}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="min-w-0 text-center">
            <p className="text-xs font-semibold text-[#7d6032]">{labels.planMiniCalendar}</p>
            <h2 className="truncate text-base font-semibold text-[#27312c]">{new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(month)}</h2>
          </div>
          <button type="button" aria-label={labels.planNextMonth} title={labels.planNextMonth} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className={iconButtonClass}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <button type="button" onClick={() => { setSelectedDate(today); setMonth(new Date(`${today.slice(0, 7)}-01T00:00:00`)); }} className="mt-3 h-9 w-full rounded-md border border-[#c8d1c8] bg-white px-3 text-sm font-semibold text-[#31564c] hover:bg-[#f3f6f1]">
          {labels.planJumpToday}
        </button>

        <div className="mt-3 grid grid-cols-7 border-l border-t border-[#d7dfd6]">
          {weekdays.map((weekday) => (
            <div key={weekday} className="border-b border-r border-[#d7dfd6] bg-[#f2f5f0] px-1 py-1.5 text-center text-[11px] font-semibold text-[#68716b]">{weekday}</div>
          ))}
          {days.map((date, index) => {
            const dayTasks = date ? tasksForDate(tasks, date) : [];
            const completed = dayTasks.filter((task) => task.status === 'completed').length;
            const selected = date === selectedDate;
            const isToday = date === today;
            return date ? (
              <button key={date} type="button" onClick={() => setSelectedDate(date)} className={`min-h-11 border-b border-r border-[#d7dfd6] p-1 text-center ${selected ? 'bg-[#e9f1ec] ring-2 ring-inset ring-[#31564c]' : isToday ? 'bg-[#fff8df] hover:bg-[#fff3c4]' : 'bg-white hover:bg-[#f7f9f5]'}`}>
                <span className="block text-xs font-semibold text-[#27312c]">{Number(date.slice(-2))}</span>
                {dayTasks.length ? <span className="mt-0.5 block text-[10px] font-semibold text-[#31564c]">{completed}/{dayTasks.length}</span> : null}
              </button>
            ) : <div key={`empty-${index}`} className="min-h-11 border-b border-r border-[#d7dfd6] bg-[#f7f8f5]" />;
          })}
        </div>
      </aside>
    </div>
  );
}

function DayFocus({ labels, locale, date, today, tasks, summary, evidence, updatingId, onTaskStatus }: {
  labels: Record<string, string>;
  locale: Locale;
  date: string;
  today: string;
  tasks: StudyPlanTask[];
  summary?: StudyDailySummary;
  evidence: StudyPlanDayEvidence;
  updatingId: string;
  onTaskStatus: (id: string, status: StudyPlanTaskStatus) => Promise<void>;
}) {
  const completedTasks = tasks.filter((task) => task.status === 'completed');
  const completionRate = tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
  const isToday = date === today;
  return (
    <section className="rounded-lg border border-[#dfe5dc] bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#7d6032]">{formatFullDate(date, locale)}</p>
          <h2 className="mt-1 text-2xl font-semibold text-[#27312c]">{isToday ? labels.planTodayFocus : labels.planSelectedDayTasks}</h2>
        </div>
        <div className="min-w-[9rem] rounded-md bg-[#edf4ef] px-3 py-2 text-right">
          <p className="text-xs font-semibold text-[#68716b]">{isToday ? labels.planTodayCompletionRate : labels.planDayCompletionRate}</p>
          <p className="text-xl font-semibold text-[#31564c]">{completionRate}%</p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e5ebe6]" aria-label={isToday ? labels.planTodayCompletionRate : labels.planDayCompletionRate} aria-valuemin={0} aria-valuemax={100} aria-valuenow={completionRate} role="progressbar">
        <span className="block h-full rounded-full bg-[#31564c]" style={{ width: `${completionRate}%` }} />
      </div>

      <div className="mt-5 min-w-0">
        <h3 className="text-sm font-semibold text-[#46514c]">{labels.planTodayTasks}</h3>
        <TaskList labels={labels} tasks={tasks} updatingId={updatingId} onTaskStatus={onTaskStatus} />
      </div>

      <div className="mt-5 min-w-0 rounded-lg border border-[#e4e7df] bg-[#fbfcf8] p-4">
        <h3 className="text-sm font-semibold text-[#46514c]">{isToday ? labels.planTodayDone : labels.planDayDone}</h3>
        <DoneList labels={labels} tasks={completedTasks} evidence={evidence} />
        <DailySummary labels={labels} summary={summary} evidence={evidence} tasks={tasks} compact />
      </div>
    </section>
  );
}

function TaskList({ labels, tasks, updatingId, onTaskStatus }: {
  labels: Record<string, string>;
  tasks: StudyPlanTask[];
  updatingId: string;
  onTaskStatus: (id: string, status: StudyPlanTaskStatus) => Promise<void>;
}) {
  return (
    <div className="mt-3 divide-y divide-[#dfe5dc] border-y border-[#dfe5dc]">
      {tasks.length ? tasks.map((task) => (
        <article key={task.id} className="py-4">
          <div className="flex items-start gap-3">
            <input type="checkbox" checked={task.status === 'completed'} disabled={updatingId === task.id} onChange={(event) => onTaskStatus(task.id, event.target.checked ? 'completed' : 'pending')} className="mt-1 h-5 w-5 shrink-0 accent-[#31564c]" />
            <div className="min-w-0 flex-1">
              <h3 className={`text-sm font-semibold ${task.status === 'completed' ? 'text-[#7a807b] line-through' : 'text-[#27312c]'}`}>{task.title}</h3>
              <p className="mt-1 text-xs text-[#68716b]">{labels[`planModule_${task.module}`]} · {task.minutes} {labels.minutes}</p>
              {task.detail ? <p className="mt-2 text-sm leading-6 text-[#4f5b55]">{task.detail}</p> : null}
              <button type="button" disabled={updatingId === task.id} onClick={() => onTaskStatus(task.id, task.status === 'skipped' ? 'pending' : 'skipped')} className="mt-2 text-xs font-semibold text-[#7a5d43] hover:underline">{task.status === 'skipped' ? labels.planRestoreTask : labels.planSkipTask}</button>
            </div>
          </div>
        </article>
      )) : <p className="py-5 text-sm text-[#68716b]">{labels.planNoTasksForDay}</p>}
    </div>
  );
}

function DoneList({ labels, tasks, evidence }: { labels: Record<string, string>; tasks: StudyPlanTask[]; evidence: StudyPlanDayEvidence }) {
  const hasEvidence = evidenceCount(evidence) > 0;
  if (!tasks.length && !hasEvidence) {
    return <p className="mt-3 text-sm text-[#68716b]">{labels.planSummary_not_started}</p>;
  }

  return (
    <div className="mt-3 space-y-3">
      {tasks.length ? (
        <div className="space-y-2">
          {tasks.slice(0, 4).map((task) => (
            <p key={task.id} className="flex items-start gap-2 text-sm font-semibold text-[#31564c]">
              <ListChecks className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0">{task.title}</span>
            </p>
          ))}
        </div>
      ) : null}
      {hasEvidence ? (
        <div className="grid gap-2 text-xs font-semibold text-[#4f5b55]">
          <EvidenceRow icon={FileStack} label={labels.planEvidenceDrafts} value={evidence.drafts} emphasis={evidence.confirmedDrafts} />
          <EvidenceRow icon={ClipboardList} label={labels.planEvidenceCaptures} value={evidence.captures} emphasis={evidence.processedCaptures} />
          <EvidenceRow icon={ListChecks} label={labels.planEvidencePractice} value={evidence.practiceAttempts} emphasis={evidence.practiceQuestions} />
          <EvidenceRow icon={BookAudio} label={labels.planEvidenceMedia} value={evidence.mediaDrafts} />
          <EvidenceRow icon={BookOpenText} label={labels.planEvidenceReading} value={evidence.readingDrafts} />
        </div>
      ) : null}
    </div>
  );
}

function DailySummary({ labels, summary, evidence, tasks, compact = false }: { labels: Record<string, string>; summary?: StudyDailySummary; evidence: StudyPlanDayEvidence; tasks: StudyPlanTask[]; compact?: boolean }) {
  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const attempted = summary?.attempted ?? evidence.practiceQuestions;
  const accuracy = summary?.accuracy ?? null;
  const practiceMinutes = summary?.practiceMinutes ?? 0;
  return (
    <div className={`${compact ? 'mt-4 border-t' : 'mt-3 border-y'} border-[#dfe5dc] py-3`}>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <p><span className="text-[#68716b]">{labels.planTaskProgress}</span><strong className="ml-2 text-[#27312c]">{completedTasks}/{tasks.length}</strong></p>
        <p><span className="text-[#68716b]">{labels.answered}</span><strong className="ml-2 text-[#27312c]">{attempted}</strong></p>
        <p><span className="text-[#68716b]">{labels.accuracy}</span><strong className="ml-2 text-[#27312c]">{accuracy === null ? '-' : `${Math.round(accuracy * 100)}%`}</strong></p>
        <p><span className="text-[#68716b]">{labels.planPracticeMinutes}</span><strong className="ml-2 text-[#27312c]">{practiceMinutes}</strong></p>
      </div>
      {compact ? null : <div className="mt-3 grid gap-2 text-xs font-semibold text-[#4f5b55]">
        <EvidenceRow icon={FileStack} label={labels.planEvidenceDrafts} value={evidence.drafts} emphasis={evidence.confirmedDrafts} />
        <EvidenceRow icon={ClipboardList} label={labels.planEvidenceCaptures} value={evidence.captures} emphasis={evidence.processedCaptures} />
        <EvidenceRow icon={ListChecks} label={labels.planEvidencePractice} value={evidence.practiceAttempts} emphasis={evidence.practiceQuestions} />
        <EvidenceRow icon={BookAudio} label={labels.planEvidenceMedia} value={evidence.mediaDrafts} />
        <EvidenceRow icon={BookOpenText} label={labels.planEvidenceReading} value={evidence.readingDrafts} />
      </div>}
      <p className="mt-3 text-xs font-semibold text-[#4f5b55]">{labels[`planSummary_${summary?.note ?? dayStatus(tasks, summary, evidence)}`]}</p>
    </div>
  );
}

function EvidenceRow({ icon: Icon, label, value, emphasis }: { icon: typeof FileStack; label: string; value: number; emphasis?: number }) {
  return (
    <p className="flex items-center justify-between gap-3">
      <span className="inline-flex min-w-0 items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-[#7a807b]" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </span>
      <strong className="shrink-0 text-[#27312c]">{emphasis ? `${emphasis}/${value}` : value}</strong>
    </p>
  );
}

function dayStatus(tasks: StudyPlanTask[], summary: StudyDailySummary | undefined, evidence: StudyPlanDayEvidence) {
  if (summary?.note) return summary.note;
  if (!tasks.length && !evidenceCount(evidence)) return 'no_activity';
  if (tasks.length && tasks.every((task) => task.status === 'completed')) return 'complete';
  if (tasks.some((task) => task.status === 'completed') || evidenceCount(evidence)) return 'partial';
  return 'not_started';
}

function evidenceCount(evidence: StudyPlanDayEvidence) {
  return evidence.drafts + evidence.captures + evidence.practiceAttempts + evidence.mediaDrafts + evidence.readingDrafts;
}

function emptyEvidence(date: string): StudyPlanDayEvidence {
  return {
    date,
    drafts: 0,
    confirmedDrafts: 0,
    captures: 0,
    processedCaptures: 0,
    practiceAttempts: 0,
    practiceQuestions: 0,
    mediaDrafts: 0,
    readingDrafts: 0,
  };
}

function formatFullDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(`${value}T00:00:00`));
}

const iconButtonClass = 'inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#c8d1c8] bg-white text-[#31564c] hover:bg-[#f3f6f1]';
