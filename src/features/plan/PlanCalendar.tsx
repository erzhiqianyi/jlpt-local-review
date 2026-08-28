import { useMemo, useState } from 'react';
import { calendarDays, localDateString, tasksForDate } from '../../domain/studyPlan';
import type { Locale, StudyDailySummary, StudyPlanTask, StudyPlanTaskStatus } from '../../types';

export function PlanCalendar({ labels, locale, tasks, summaries, onTaskStatus }: { labels: Record<string, string>; locale: Locale; tasks: StudyPlanTask[]; summaries: StudyDailySummary[]; onTaskStatus: (id: string, status: StudyPlanTaskStatus) => Promise<void> }) {
  const initialDate = tasks.find((task) => task.date >= localDateString(new Date()))?.date ?? tasks[0]?.date ?? localDateString(new Date());
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [month, setMonth] = useState(() => new Date(`${initialDate.slice(0, 7)}-01T00:00:00`));
  const [updatingId, setUpdatingId] = useState('');
  const days = useMemo(() => calendarDays(month), [month]);
  const selectedTasks = tasksForDate(tasks, selectedDate);
  const selectedSummary = summaries.find((summary) => summary.date === selectedDate);
  const weekdays = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2026, 7, 23 + index)));

  async function update(id: string, status: StudyPlanTaskStatus) {
    setUpdatingId(id);
    try { await onTaskStatus(id, status); } finally { setUpdatingId(''); }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <button type="button" aria-label={labels.planPreviousMonth} title={labels.planPreviousMonth} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className={iconButtonClass}>‹</button>
          <h2 className="text-lg font-semibold text-[#27312c]">{new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(month)}</h2>
          <button type="button" aria-label={labels.planNextMonth} title={labels.planNextMonth} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className={iconButtonClass}>›</button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <div className="grid min-w-[700px] grid-cols-7 border-l border-t border-[#d7dfd6]">
            {weekdays.map((weekday) => <div key={weekday} className="border-b border-r border-[#d7dfd6] bg-[#f2f5f0] px-2 py-2 text-center text-xs font-semibold text-[#68716b]">{weekday}</div>)}
            {days.map((date, index) => {
              const dayTasks = date ? tasksForDate(tasks, date) : [];
              const completed = dayTasks.filter((task) => task.status === 'completed').length;
              const selected = date === selectedDate;
              return date ? (
                <button key={date} type="button" onClick={() => setSelectedDate(date)} className={`aspect-[1.25] min-h-24 border-b border-r border-[#d7dfd6] p-2 text-left align-top ${selected ? 'bg-[#e9f1ec] ring-2 ring-inset ring-[#31564c]' : 'bg-white hover:bg-[#f7f9f5]'}`}>
                  <span className="text-sm font-semibold text-[#27312c]">{Number(date.slice(-2))}</span>
                  {dayTasks.length ? <span className="mt-2 block text-xs font-semibold text-[#31564c]">{completed}/{dayTasks.length} {labels.planCalendarTasks}</span> : null}
                  <span className="mt-2 flex gap-1">{dayTasks.slice(0, 4).map((task) => <i key={task.id} className={`h-1.5 w-1.5 rounded-full ${task.status === 'completed' ? 'bg-[#4f7b60]' : task.status === 'missed' ? 'bg-[#a65c4c]' : 'bg-[#c3a45b]'}`} />)}</span>
                </button>
              ) : <div key={`empty-${index}`} className="aspect-[1.25] min-h-24 border-b border-r border-[#d7dfd6] bg-[#f7f8f5]" />;
            })}
          </div>
        </div>
      </section>

      <aside className="min-w-0 border-l border-[#dfe5dc] pl-0 xl:pl-5">
        <h2 className="text-lg font-semibold text-[#27312c]">{formatFullDate(selectedDate, locale)}</h2>
        {selectedSummary ? <DailySummary labels={labels} summary={selectedSummary} /> : null}
        <div className="mt-4 divide-y divide-[#dfe5dc] border-y border-[#dfe5dc]">
          {selectedTasks.length ? selectedTasks.map((task) => (
            <article key={task.id} className="py-4">
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={task.status === 'completed'} disabled={updatingId === task.id} onChange={(event) => update(task.id, event.target.checked ? 'completed' : 'pending')} className="mt-1 h-5 w-5 shrink-0 accent-[#31564c]" />
                <div className="min-w-0 flex-1">
                  <h3 className={`text-sm font-semibold ${task.status === 'completed' ? 'text-[#7a807b] line-through' : 'text-[#27312c]'}`}>{task.title}</h3>
                  <p className="mt-1 text-xs text-[#68716b]">{labels[`planModule_${task.module}`]} · {task.minutes} {labels.minutes}</p>
                  {task.detail ? <p className="mt-2 text-sm leading-6 text-[#4f5b55]">{task.detail}</p> : null}
                  <button type="button" disabled={updatingId === task.id} onClick={() => update(task.id, task.status === 'skipped' ? 'pending' : 'skipped')} className="mt-2 text-xs font-semibold text-[#7a5d43] hover:underline">{task.status === 'skipped' ? labels.planRestoreTask : labels.planSkipTask}</button>
                </div>
              </div>
            </article>
          )) : <p className="py-5 text-sm text-[#68716b]">{labels.planNoTasksForDay}</p>}
        </div>
      </aside>
    </div>
  );
}

function DailySummary({ labels, summary }: { labels: Record<string, string>; summary: StudyDailySummary }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 border-y border-[#dfe5dc] py-3 text-sm">
      <p><span className="text-[#68716b]">{labels.planTaskProgress}</span><strong className="ml-2 text-[#27312c]">{summary.completedTasks}/{summary.plannedTasks}</strong></p>
      <p><span className="text-[#68716b]">{labels.answered}</span><strong className="ml-2 text-[#27312c]">{summary.attempted}</strong></p>
      <p><span className="text-[#68716b]">{labels.accuracy}</span><strong className="ml-2 text-[#27312c]">{summary.accuracy === null ? '-' : `${Math.round(summary.accuracy * 100)}%`}</strong></p>
      <p><span className="text-[#68716b]">{labels.planPracticeMinutes}</span><strong className="ml-2 text-[#27312c]">{summary.practiceMinutes}</strong></p>
      <p className="col-span-2 text-xs font-semibold text-[#4f5b55]">{labels[`planSummary_${summary.note}`]}</p>
    </div>
  );
}

function formatFullDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(`${value}T00:00:00`));
}

const iconButtonClass = 'h-10 w-10 rounded-md border border-[#c8d1c8] bg-white text-xl font-semibold text-[#31564c] hover:bg-[#f3f6f1]';
