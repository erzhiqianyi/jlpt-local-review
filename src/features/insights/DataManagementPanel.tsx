import { useState } from 'react';
import type { LearningCapture, LearningCaptureStatus, Locale, PracticeAttempt, ProgressState, StudyDailySummary } from '../../types';
import { HistoryPanel } from '../history/HistoryPanel';
import { InsightsPanel } from './InsightsPanel';

type DataTab = 'overview' | 'captures' | 'practice';

export function DataManagementPanel({ labels, locale, captures, attempts, progress, summaries, initialTab = 'overview', onCaptureStatus }: {
  labels: Record<string, string>;
  locale: Locale;
  captures: LearningCapture[];
  attempts: PracticeAttempt[];
  progress: ProgressState;
  summaries: StudyDailySummary[];
  initialTab?: DataTab;
  onCaptureStatus: (id: string, status: LearningCaptureStatus) => Promise<void>;
}) {
  const [tab, setTab] = useState<DataTab>(initialTab);
  const tabs: Array<{ value: DataTab; label: string; count?: number }> = [
    { value: 'overview', label: labels.dataOverviewTab },
    { value: 'captures', label: labels.dataCapturesTab, count: captures.length },
    { value: 'practice', label: labels.dataPracticeTab, count: attempts.length },
  ];

  return (
    <section className="mx-auto w-full max-w-5xl py-2 md:py-5">
      <p className="text-sm font-semibold text-[#7d6032]">{labels.insightsEyebrow}</p>
      <h1 className="mt-1 text-2xl font-semibold text-[#27312c]">{labels.dataManagementTitle}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68716b]">{labels.dataManagementBody}</p>

      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-[#d7dfd6]" role="tablist">
        {tabs.map((item) => (
          <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} onClick={() => setTab(item.value)} className={`min-h-11 shrink-0 border-b-2 px-4 text-sm font-semibold ${tab === item.value ? 'border-[#31564c] text-[#31564c]' : 'border-transparent text-[#707a74]'}`}>
            {item.label}{item.count === undefined ? '' : ` ${item.count}`}
          </button>
        ))}
      </div>

      {tab === 'overview' ? <InsightsPanel labels={labels} captures={captures} attempts={attempts} progress={progress} summaries={summaries} embedded /> : null}
      {tab === 'captures' ? <HistoryPanel labels={labels} locale={locale} captures={captures} attempts={attempts} onCaptureStatus={onCaptureStatus} embedded mode="captures" /> : null}
      {tab === 'practice' ? <HistoryPanel labels={labels} locale={locale} captures={captures} attempts={attempts} onCaptureStatus={onCaptureStatus} embedded mode="practice" /> : null}
    </section>
  );
}
