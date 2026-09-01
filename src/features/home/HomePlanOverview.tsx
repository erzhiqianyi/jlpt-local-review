import { ArrowRight, CalendarDays, Check, Clock3 } from 'lucide-react';
import { localDateString, tasksForDate } from '../../domain/studyPlan';
import type { Locale, StudyPlanDocument, StudyPlanTask } from '../../types';

export function HomePlanOverview({ labels, locale, plan, onOpenPlan }: {
  labels: Record<string, string>;
  locale: Locale;
  plan: StudyPlanDocument;
  onOpenPlan: () => void;
}) {
  const today = localDateString(new Date());
  const todayTasks = tasksForDate(plan.tasks, today);
  const completedToday = todayTasks.filter((task) => task.status === 'completed').length;
  const completedTotal = plan.tasks.filter((task) => task.status === 'completed').length;
  const completionRate = plan.tasks.length ? Math.round((completedTotal / plan.tasks.length) * 100) : 0;
  const ready = plan.status === 'ready' && plan.tasks.length > 0;
  const dateLabel = new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date());

  return (
    <section className="min-w-0 p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7d6032]"><CalendarDays size={14} />{labels.homePlanEyebrow}</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#27312c]">{ready ? labels.homePlanToday : labels.homePlanTitle}</h1>
          <p className="mt-1 text-sm text-[#68716b]">{ready ? dateLabel : `JLPT ${plan.profile.level}`}</p>
        </div>
        <button type="button" onClick={onOpenPlan} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border border-[#bdc9c0] bg-white px-3 text-sm font-semibold text-[#31564c] hover:bg-[#f3f6f2]">
          {ready ? labels.homePlanOpen : labels.homePlanSetup}<ArrowRight size={16} />
        </button>
      </div>

      {ready ? (
        <>
          <div className="mt-6 grid gap-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-end">
            <div>
              <p className="text-4xl font-semibold text-[#27312c]">{completionRate}<span className="ml-1 text-base text-[#65716b]">%</span></p>
              <p className="mt-1 text-xs font-semibold text-[#68716b]">{labels.homePlanOverallProgress}</p>
            </div>
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-[#e5ebe6]" aria-label={labels.homePlanOverallProgress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={completionRate} role="progressbar">
                <div className="h-full rounded-full bg-[#5f8275]" style={{ width: `${completionRate}%` }} />
              </div>
              <p className="mt-2 text-xs text-[#68716b]">{completedTotal} / {plan.tasks.length} {labels.homePlanTasksCompleted}</p>
            </div>
          </div>

          <div className="mt-6 border-t border-[#dde4de] pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#34413b]">{labels.homePlanTodayProgress}</p>
              <p className="text-sm font-semibold text-[#31564c]">{completedToday} / {todayTasks.length}</p>
            </div>
            {todayTasks.length ? (
              <div className="mt-2 divide-y divide-[#e3e8e3]">
                {todayTasks.slice(0, 3).map((task) => <TodayTask key={task.id} labels={labels} task={task} />)}
              </div>
            ) : <p className="mt-3 text-sm text-[#68716b]">{labels.homePlanNoTasks}</p>}
          </div>
        </>
      ) : (
        <div className="mt-7 border-t border-[#dde4de] pt-5">
          <p className="text-base font-semibold text-[#34413b]">{labels.homePlanNotReady}</p>
          <p className="mt-2 text-sm text-[#68716b]">{labels.homePlanNotReadyMeta.replace('{days}', String(plan.profile.studyDaysPerWeek)).replace('{minutes}', String(plan.profile.dailyMinutes))}</p>
        </div>
      )}
    </section>
  );
}

function TodayTask({ labels, task }: { labels: Record<string, string>; task: StudyPlanTask }) {
  const completed = task.status === 'completed';
  return (
    <div className="flex min-h-12 items-center gap-3 py-2.5">
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${completed ? 'border-[#5f8275] bg-[#5f8275] text-white' : 'border-[#b8c4bc] text-transparent'}`}>
        <Check size={14} />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#3f4b45]">{task.title}</span>
      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-[#68716b]"><Clock3 size={14} />{task.minutes} {labels.minutes}</span>
    </div>
  );
}
