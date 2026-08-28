import { useEffect, useState } from 'react';
import type { Locale, StudyPlanDocument, StudyPlanProfile, StudyPlanTaskStatus } from '../../types';
import { PlanCalendar } from './PlanCalendar';
import { PlanSetupForm } from './PlanSetupForm';

type StudyPlanPanelProps = {
  labels: Record<string, string>;
  locale: Locale;
  plan: StudyPlanDocument;
  onSaveProfile: (profile: StudyPlanProfile) => Promise<void>;
  onTaskStatus: (id: string, status: StudyPlanTaskStatus) => Promise<void>;
};

export function StudyPlanPanel({ labels, locale, plan, onSaveProfile, onTaskStatus }: StudyPlanPanelProps) {
  const [view, setView] = useState<'calendar' | 'profile'>(plan.tasks.length ? 'calendar' : 'profile');
  const [copied, setCopied] = useState(false);
  const completed = plan.tasks.filter((task) => task.status === 'completed').length;
  const prompt = labels.planMcpPrompt.replace('{level}', plan.profile.level);

  useEffect(() => {
    if (plan.generatedAt && plan.tasks.length) {
      setView('calendar');
    }
  }, [plan.generatedAt, plan.tasks.length]);

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="space-y-5">
      <section className="border-b border-[#d7dfd6] pb-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#7d6032]">JLPT {plan.profile.level}</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#27312c]">{labels.planTitle}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#68716b]">{labels.planAgentBody}</p>
          </div>
          <span className={`w-fit rounded px-2 py-1 text-xs font-semibold ${plan.status === 'ready' ? 'bg-[#e7f0eb] text-[#31564c]' : 'bg-[#f3eddc] text-[#765c25]'}`}>{labels[`planStatus_${plan.status}`]}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setView('calendar')} className={tabClass(view === 'calendar')}>{labels.planCalendar}</button>
          <button type="button" onClick={() => setView('profile')} className={tabClass(view === 'profile')}>{labels.planBasicInfo}</button>
        </div>
      </section>

      {plan.status !== 'ready' ? (
        <section className="border-l-2 border-[#c3a45b] bg-[#fbfaf4] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#51482f]">{labels.planMcpRequired}</h2>
          <p className="mt-1 text-sm leading-6 text-[#6d674f]">{labels.planMcpRequiredBody}</p>
          <button type="button" onClick={copyPrompt} className="mt-2 h-10 rounded-md border border-[#c9b97b] bg-white px-3 text-sm font-semibold text-[#5c522f] hover:bg-[#f7f2df]">{copied ? labels.planPromptCopied : labels.planCopyPrompt}</button>
        </section>
      ) : null}

      {view === 'profile' ? <PlanSetupForm labels={labels} profile={plan.profile} onSave={onSaveProfile} /> : null}
      {view === 'calendar' ? (
        plan.tasks.length ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label={labels.planTotalTasks} value={String(plan.tasks.length)} />
              <Metric label={labels.planCompletedTasks} value={String(completed)} />
              <Metric label={labels.planCompletionRate} value={`${Math.round((completed / plan.tasks.length) * 100)}%`} />
            </div>
            <PlanCalendar labels={labels} locale={locale} tasks={plan.tasks} summaries={plan.dailySummaries} onTaskStatus={onTaskStatus} />
          </>
        ) : <p className="py-10 text-center text-sm text-[#68716b]">{labels.planNoGeneratedPlan}</p>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="border-l-2 border-[#c8d1c8] pl-3"><p className="text-xs font-semibold text-[#68716b]">{label}</p><p className="mt-1 text-xl font-semibold text-[#27312c]">{value}</p></div>;
}

function tabClass(active: boolean) {
  return `h-10 rounded-md px-4 text-sm font-semibold ${active ? 'bg-[#31564c] text-white' : 'border border-[#c8d1c8] bg-white text-[#4f5b55]'}`;
}
