import { ArrowRight, CalendarClock, Plus } from 'lucide-react';
import { QuestionTypePreview } from '../question-types/QuestionTypePreview';
import type { AppView, Locale } from '../../types';

type Countdown = { days: number; hours: number; minutes: number };
type HomeMetric = { label: string; value: string };
type HomeModule = { view: AppView; title: string; body: string; count: number };

export function HomeDashboard({ labels, locale, countdown, metrics, modules, onNavigate }: {
  labels: Record<string, string>;
  locale: Locale;
  countdown: Countdown;
  metrics: HomeMetric[];
  modules: HomeModule[];
  onNavigate: (view: AppView) => void;
}) {
  const phase = countdown.days <= 30 ? 'final' : countdown.days <= 90 ? 'sprint' : countdown.days <= 180 ? 'build' : 'foundation';
  const countdownTone = phase === 'final'
    ? 'border-[#dfc4bd] bg-[#fbf1ee] text-[#70483f]'
    : phase === 'sprint'
      ? 'border-[#dfd1ae] bg-[#faf6e9] text-[#725d2d]'
      : phase === 'build'
        ? 'border-[#c9d8dc] bg-[#eff6f7] text-[#3f626a]'
        : 'border-[#cddbcf] bg-[#f0f6f0] text-[#46644e]';

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 px-4 py-5 md:px-8 md:py-8 lg:px-10">
      <section className="grid gap-7 border-b border-[#d7dfd6] pb-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="flex min-h-full items-center">
          <div className="flex w-full flex-col gap-3 border-l-2 border-[#8aa797] pl-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#27312c]">{labels.homeCaptureTitle}</h2>
              <p className="mt-1 text-sm leading-6 text-[#68716b]">{labels.homeCaptureBody}</p>
            </div>
            <button type="button" onClick={() => onNavigate('capture')} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-[#31564c] px-4 text-sm font-semibold text-white">
              <Plus size={17} /> {labels.homeCaptureAction}
            </button>
          </div>
        </div>

        <aside className={`border p-5 ${countdownTone}`}>
          <div className="flex items-center gap-2 text-sm font-semibold"><CalendarClock size={17} /> {labels.countdownTitle}</div>
          <p className="mt-3 text-lg font-semibold">{labels.countdownDate}</p>
          <p className="mt-1 text-3xl font-semibold">{countdown.days} <span className="text-sm">{labels.days}</span></p>
          <p className="mt-3 text-sm leading-6">{labels[`countdownPhaseBody_${phase}`]}</p>
        </aside>
      </section>

      <section className="grid grid-cols-2 border-b border-[#d7dfd6] py-5 sm:grid-cols-5">
        {metrics.map((metric, index) => <Metric key={metric.label} metric={metric} first={index === 0} />)}
      </section>

      <section className="pt-7">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#7d6032]">{labels.homeStudyArea}</p>
            <h2 className="mt-1 text-xl font-semibold text-[#27312c]">{labels.homeModulesTitle}</h2>
          </div>
          <button type="button" onClick={() => onNavigate('mixed')} className="hidden min-h-10 text-sm font-semibold text-[#31564c] hover:underline sm:block">{labels.reviewStart} →</button>
        </div>
        <div className="mt-4 divide-y divide-[#dfe5df] border-y border-[#dfe5df]">
          {modules.map((module) => (
            <button key={module.view} type="button" onClick={() => onNavigate(module.view)} className="flex min-h-16 w-full items-center gap-4 py-3 text-left hover:bg-[#f8faf7]">
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-[#34413b]">{module.title}</span>
                <span className="mt-1 block truncate text-sm text-[#707a74]">{module.body}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-[#52645c]">{module.count}</span>
              <ArrowRight size={18} className="shrink-0 text-[#758079]" />
            </button>
          ))}
        </div>
      </section>

      <div className="pt-8">
        <QuestionTypePreview labels={labels} locale={locale} />
      </div>
    </div>
  );
}

function Metric({ metric, first }: { metric: HomeMetric; first: boolean }) {
  return <div className={`min-w-0 px-3 py-2 sm:py-0 ${first ? '' : 'border-l border-[#dfe5df]'}`}><p className="truncate text-xs text-[#707a74]">{metric.label}</p><p className="mt-1 text-xl font-semibold text-[#27312c]">{metric.value}</p></div>;
}
