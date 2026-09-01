import { BookOpenCheck, CalendarRange, Clock3, School, Target } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { localDateString, resolvePlanPhases, type PlanPhaseView } from '../../domain/studyPlan';
import type {
  DraftSummary,
  LearningCapture,
  ListeningQuestion,
  Locale,
  PracticeAttempt,
  ReadingQuestion,
  StudyPlanDayEvidence,
  StudyPlanDocument,
  StudyPlanProfile,
  StudyPlanTask,
  StudyPlanTaskStatus,
} from '../../types';
import { PlanCalendar } from './PlanCalendar';
import { PlanSetupForm } from './PlanSetupForm';

type StudyPlanPanelProps = {
  labels: Record<string, string>;
  locale: Locale;
  plan: StudyPlanDocument;
  drafts: DraftSummary[];
  captures: LearningCapture[];
  attempts: PracticeAttempt[];
  listeningQuestions: ListeningQuestion[];
  readingQuestions: ReadingQuestion[];
  onSaveProfile: (profile: StudyPlanProfile) => Promise<void>;
  onTaskStatus: (id: string, status: StudyPlanTaskStatus) => Promise<void>;
};

export function StudyPlanPanel({
  labels,
  locale,
  plan,
  drafts,
  captures,
  attempts,
  listeningQuestions,
  readingQuestions,
  onSaveProfile,
  onTaskStatus,
}: StudyPlanPanelProps) {
  const [profileMode, setProfileMode] = useState<'read' | 'edit'>('read');
  const [copied, setCopied] = useState(false);
  const prompt = labels.planMcpPrompt.replace('{level}', plan.profile.level);
  const evidence = buildDayEvidence(drafts, captures, attempts, listeningQuestions, readingQuestions);
  const phases = useMemo(() => resolvePlanPhases(plan), [plan]);

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  async function saveProfile(profile: StudyPlanProfile) {
    await onSaveProfile(profile);
    setProfileMode('read');
  }

  return (
    <div className="space-y-5">
      <section className="border-b border-[#d7dfd6] pb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#7d6032]">JLPT {plan.profile.level}</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#27312c]">{labels.planTitle}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`w-fit rounded px-2 py-1 text-xs font-semibold ${plan.status === 'ready' ? 'bg-[#e7f0eb] text-[#31564c]' : 'bg-[#f3eddc] text-[#765c25]'}`}>{labels[`planStatus_${plan.status}`]}</span>
            <button type="button" onClick={() => setProfileMode(profileMode === 'edit' ? 'read' : 'edit')} className="h-10 rounded-md bg-[#31564c] px-4 text-sm font-semibold text-white hover:bg-[#27483f]">
              {profileMode === 'edit' ? labels.planCancelEdit : labels.planEditProfile}
            </button>
          </div>
        </div>
      </section>

      {profileMode === 'edit' ? (
        <PlanSetupForm labels={labels} profile={plan.profile} onSave={saveProfile} onCancel={() => setProfileMode('read')} />
      ) : (
        <>
          <PlanOverviewPanel labels={labels} locale={locale} plan={plan} phases={phases} />
          {plan.tasks.length ? (
            <PlanCalendar labels={labels} locale={locale} tasks={plan.tasks} summaries={plan.dailySummaries} evidence={evidence} onTaskStatus={onTaskStatus} />
          ) : <p className="py-10 text-center text-sm text-[#68716b]">{labels.planNoGeneratedPlan}</p>}
          <PlanReferencePanel labels={labels} locale={locale} plan={plan} phases={phases} />
        </>
      )}

      {plan.status !== 'ready' ? (
        <section className="border-l-2 border-[#c3a45b] bg-[#fbfaf4] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#51482f]">{labels.planMcpRequired}</h2>
          <p className="mt-1 text-sm leading-6 text-[#6d674f]">{labels.planMcpRequiredBody}</p>
          <button type="button" onClick={copyPrompt} className="mt-2 h-10 rounded-md border border-[#c9b97b] bg-white px-3 text-sm font-semibold text-[#5c522f] hover:bg-[#f7f2df]">{copied ? labels.planPromptCopied : labels.planCopyPrompt}</button>
        </section>
      ) : null}

    </div>
  );
}

function PlanOverviewPanel({ labels, locale, plan, phases }: { labels: Record<string, string>; locale: Locale; plan: StudyPlanDocument; phases: PlanPhaseView[] }) {
  const today = localDateString(new Date());
  const activePhase = phases.find((phase) => phase.status === 'active') ?? phases.find((phase) => phase.status === 'upcoming') ?? phases[phases.length - 1];
  const totalCompleted = plan.tasks.filter((task) => task.status === 'completed').length;
  const totalRate = plan.tasks.length ? Math.round((totalCompleted / plan.tasks.length) * 100) : 0;
  const nextTasks = plan.tasks
    .filter((task) => task.date >= today && task.status !== 'completed' && task.status !== 'skipped')
    .sort((left, right) => left.date.localeCompare(right.date) || left.title.localeCompare(right.title))
    .slice(0, 5);
  const allocations = plan.profile.materials.map((material) => {
    const materialTasks = plan.tasks.filter((task) => task.materialId === material.id);
    return {
      id: material.id,
      title: material.title,
      tasks: materialTasks.length,
      minutes: materialTasks.reduce((sum, task) => sum + task.minutes, 0),
      nextTask: materialTasks.find((task) => task.date >= today && task.status !== 'completed' && task.status !== 'skipped'),
    };
  });

  return (
    <section className="rounded-lg border border-[#dfe5dc] bg-white p-5 shadow-sm md:p-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#7d6032]">{labels.planOverviewEyebrow}</p>
          <h2 className="mt-1 text-2xl font-semibold text-[#27312c]">{labels.planOverviewTitle}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5c675f]">
            {labels.planOverviewBody
              .replace('{phase}', activePhase?.focus || labels.planNoValue)
              .replace('{date}', activePhase ? formatDateRange(activePhase.startDate, activePhase.endDate, locale) : formatDateRange(plan.profile.startDate, plan.profile.examDate, locale))}
          </p>
        </div>
        <div className="rounded-md bg-[#edf4ef] p-4">
          <p className="text-xs font-semibold text-[#68716b]">{labels.planCompletionRate}</p>
          <p className="mt-1 text-3xl font-semibold text-[#31564c]">{totalRate}%</p>
          <p className="mt-2 text-xs font-semibold text-[#68716b]">{totalCompleted} / {plan.tasks.length} {labels.planCalendarTasks}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
            <span className="block h-full rounded-full bg-[#31564c]" style={{ width: `${totalRate}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <OverviewBlock title={labels.planWhenTitle}>
          <div className="space-y-2">
            {phases.map((phase, index) => (
              <div key={phase.id} className={`rounded-md border px-3 py-2 ${phase.status === 'active' ? 'border-[#7aa08f] bg-[#f3f8f5]' : 'border-[#e0e6dd] bg-[#fbfcf8]'}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-sm font-semibold text-[#27312c]">{labels.planPhaseLabel.replace('{number}', String(index + 1))}: {phase.focus || labels.planNoValue}</p>
                  <span className="shrink-0 text-xs font-semibold text-[#31564c]">{labels[`planPhaseStatus_${phase.status}`]}</span>
                </div>
                <p className="mt-1 text-xs text-[#68716b]">{formatDateRange(phase.startDate, phase.endDate, locale)} · {phase.completedTasks}/{phase.totalTasks}</p>
              </div>
            ))}
          </div>
        </OverviewBlock>

        <OverviewBlock title={labels.planWhatTitle}>
          <div className="divide-y divide-[#e3e8e3]">
            {nextTasks.length ? nextTasks.map((task) => <NextTaskRow key={task.id} labels={labels} locale={locale} task={task} />) : <p className="py-3 text-sm text-[#68716b]">{labels.planNoTasksForDay}</p>}
          </div>
        </OverviewBlock>

        <OverviewBlock title={labels.planOutcomeTitle}>
          <div className="space-y-3">
            <p className="text-sm font-semibold leading-6 text-[#27312c]">{activePhase?.focus || labels.planNoValue}</p>
            {activePhase?.points.length ? (
              <div className="flex flex-wrap gap-1.5">
                {activePhase.points.slice(0, 5).map((point) => <span key={point} className="rounded bg-[#f3f7f3] px-2 py-1 text-xs font-semibold text-[#4f5b55] ring-1 ring-[#dce4dd]">{point}</span>)}
              </div>
            ) : null}
            <div className="border-t border-[#e3e8e3] pt-3">
              <p className="text-xs font-semibold text-[#68716b]">{labels.planMaterialAllocation}</p>
              <div className="mt-2 space-y-2">
                {allocations.map((item) => (
                  <p key={item.id} className="flex items-start justify-between gap-3 text-xs">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-[#27312c]">{item.title}</span>
                      <span className="mt-0.5 block truncate text-[#68716b]">{item.nextTask?.title ?? labels.planNoValue}</span>
                    </span>
                    <strong className="shrink-0 text-[#31564c]">{item.tasks} / {item.minutes}</strong>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </OverviewBlock>
      </div>
    </section>
  );
}

function OverviewBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-[#dfe5dc] bg-[#fbfcf8] p-4">
      <h3 className="text-sm font-semibold text-[#46514c]">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function NextTaskRow({ labels, locale, task }: { labels: Record<string, string>; locale: Locale; task: StudyPlanTask }) {
  return (
    <div className="py-3">
      <p className="text-xs font-semibold text-[#7d6032]">{formatFullDate(task.date, locale)}</p>
      <p className="mt-1 text-sm font-semibold leading-5 text-[#27312c]">{task.title}</p>
      <p className="mt-1 text-xs text-[#68716b]">{labels[`planModule_${task.module}`]} · {task.minutes} {labels.minutes}</p>
    </div>
  );
}

function PlanReferencePanel({ labels, locale, plan, phases }: { labels: Record<string, string>; locale: Locale; plan: StudyPlanDocument; phases: PlanPhaseView[] }) {
  return (
    <section className="rounded-lg border border-[#dfe5dc] bg-[#fbfcf8] p-3 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2">
        <details className="rounded-md border border-[#dfe5dc] bg-white p-4">
          <summary className="flex cursor-pointer list-none items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#edf4ef] text-[#31564c]">
              <CalendarRange className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-semibold text-[#27312c]">{labels.planPhaseTracker}</span>
              <span className="mt-0.5 block text-xs font-semibold text-[#68716b]">{labels.planOpenReference}</span>
            </span>
          </summary>
          <div className="mt-4 flex items-start gap-3 border-t border-[#edf1ec] pt-4">
            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#edf4ef] text-[#31564c] sm:inline-flex">
              <CalendarRange className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[#27312c]">{labels.planPhaseTracker}</h2>
              <p className="mt-1 text-sm leading-6 text-[#68716b]">{labels.planPhaseTrackerBody}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {phases.map((phase, index) => (
              <article key={phase.id} className={`rounded-md border p-4 ${phase.status === 'active' ? 'border-[#7aa08f] bg-[#f3f8f5]' : 'border-[#e0e6dd] bg-[#fbfcf8]'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#7d6032]">{labels.planPhaseLabel.replace('{number}', String(index + 1))}</p>
                    <h3 className="mt-1 text-sm font-semibold leading-5 text-[#27312c]">{phase.focus || labels.planNoValue}</h3>
                  </div>
                  <span className={`shrink-0 rounded px-2 py-1 text-[11px] font-semibold ${phase.status === 'active' ? 'bg-[#31564c] text-white' : phase.status === 'done' ? 'bg-[#e2ebe6] text-[#31564c]' : 'bg-[#f3eddc] text-[#765c25]'}`}>
                    {labels[`planPhaseStatus_${phase.status}`]}
                  </span>
                </div>
                <p className="mt-3 text-xs font-semibold text-[#68716b]">{formatDateRange(phase.startDate, phase.endDate, locale)}</p>
                {phase.goal ? <p className="mt-2 text-xs leading-5 text-[#5c675f]">{phase.goal}</p> : null}
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e5ebe6]" aria-label={labels.planPhaseProgress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={phase.totalTasks ? Math.round((phase.completedTasks / phase.totalTasks) * 100) : 0} role="progressbar">
                  <span className="block h-full rounded-full bg-[#31564c]" style={{ width: `${phase.totalTasks ? Math.round((phase.completedTasks / phase.totalTasks) * 100) : 0}%` }} />
                </div>
                <p className="mt-2 text-xs text-[#68716b]">{phase.completedTasks} / {phase.totalTasks} {labels.planCalendarTasks}</p>
                {phase.points.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {phase.points.slice(0, 4).map((point) => <span key={point} className="rounded bg-white px-2 py-1 text-xs font-semibold text-[#4f5b55] ring-1 ring-[#dce4dd]">{point}</span>)}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </details>

        <details className="rounded-md border border-[#dfe5dc] bg-white p-4">
          <summary className="flex cursor-pointer list-none items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#edf4ef] text-[#31564c]">
              <Target className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-semibold text-[#27312c]">{labels.planBasicInfo}</span>
              <span className="mt-0.5 block text-xs font-semibold text-[#68716b]">{labels.planOpenReference}</span>
            </span>
          </summary>
          <div className="mt-4 border-t border-[#edf1ec] pt-4">
            <div className="space-y-3 text-sm">
              <SnapshotRow icon={Target} label={labels.planLevel} value={`JLPT ${plan.profile.level}`} />
              <SnapshotRow icon={CalendarRange} label={labels.planExamDate} value={formatDateRange(plan.profile.startDate, plan.profile.examDate, locale)} />
              <SnapshotRow icon={Clock3} label={labels.planDailyMinutes} value={`${plan.profile.studyDaysPerWeek} ${labels.planDaysUnit} · ${plan.profile.dailyMinutes} ${labels.minutes}`} />
              <SnapshotRow icon={School} label={labels.planFixedSchedule} value={plan.profile.fixedSchedule || labels.planNoValue} />
              <SnapshotRow icon={BookOpenCheck} label={labels.planMaterials} value={`${plan.profile.materials.length} ${labels.planMaterialsUnit}`} />
            </div>
            <p className="mt-4 border-t border-[#dfe5dc] pt-3 text-xs font-semibold leading-5 text-[#4f5b55]">{labels.planWeekdaySchoolRule}</p>
          </div>
        </details>
      </div>
    </section>
  );
}

function SnapshotRow({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return (
    <p className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#6f7d73]" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-[#68716b]">{label}</span>
        <strong className="mt-0.5 block break-words font-semibold text-[#27312c]">{value}</strong>
      </span>
    </p>
  );
}

function buildDayEvidence(
  drafts: DraftSummary[],
  captures: LearningCapture[],
  attempts: PracticeAttempt[],
  listeningQuestions: ListeningQuestion[],
  readingQuestions: ReadingQuestion[],
): StudyPlanDayEvidence[] {
  const byDate = new Map<string, StudyPlanDayEvidence>();

  function entry(date: string) {
    const current = byDate.get(date);
    if (current) return current;
    const next: StudyPlanDayEvidence = {
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
    byDate.set(date, next);
    return next;
  }

  for (const draft of drafts) {
    const day = entry(dateKey(draft.updated_at));
    day.drafts += 1;
    if (draft.status === 'confirmed' || draft.status === 'approved' || draft.status === 'processed') {
      day.confirmedDrafts += 1;
    }
  }
  for (const capture of captures) {
    const day = entry(dateKey(capture.updatedAt || capture.createdAt));
    day.captures += 1;
    if (capture.status === 'processed') day.processedCaptures += 1;
  }
  for (const attempt of attempts) {
    if (!attempt.completedAt) continue;
    const day = entry(dateKey(attempt.completedAt));
    day.practiceAttempts += 1;
    day.practiceQuestions += attempt.summary?.total ?? attempt.answers.length;
  }
  for (const question of listeningQuestions) {
    entry(dateKey(question.createdAt)).mediaDrafts += 1;
  }
  for (const question of readingQuestions) {
    entry(dateKey(question.createdAt)).readingDrafts += 1;
  }

  return [...byDate.values()].sort((left, right) => right.date.localeCompare(left.date));
}

function dateKey(value: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}

function formatDateRange(startDate: string, endDate: string, locale: Locale) {
  const formatter = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
  return `${formatter.format(new Date(`${startDate}T00:00:00`))} - ${formatter.format(new Date(`${endDate}T00:00:00`))}`;
}

function formatFullDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(`${value}T00:00:00`));
}
