import { type ReactNode } from 'react';
import type { LearningCapture, LearningCaptureStatus, Locale, PracticeAttempt, Question } from '../../types';
import { HistoryPanel } from '../history/HistoryPanel';

export type DataTab = 'captures' | 'practice' | 'drafts' | 'settings';

export function DataManagementPanel({ labels, locale, captures, attempts, questions, draftsContent, settingsContent, activeTab, activeCaptureId, onActiveCaptureChange, activeAttemptId, onActiveAttemptChange, attemptQuestionDetailOpen, onAttemptQuestionDetailChange, onCaptureStatus }: {
  labels: Record<string, string>;
  locale: Locale;
  captures: LearningCapture[];
  attempts: PracticeAttempt[];
  questions: Question[];
  draftsContent: ReactNode;
  settingsContent?: ReactNode;
  activeTab: DataTab;
  activeCaptureId?: string | null;
  onActiveCaptureChange?: (id: string | null) => void;
  activeAttemptId?: string | null;
  onActiveAttemptChange?: (id: string | null) => void;
  attemptQuestionDetailOpen?: boolean;
  onAttemptQuestionDetailChange?: (open: boolean) => void;
  onCaptureStatus: (id: string, status: LearningCaptureStatus) => Promise<void>;
}) {
  return (
    <section className="data-management-panel mx-auto w-full max-w-5xl py-2 md:py-5">
      {activeTab === 'captures' ? <HistoryPanel labels={labels} locale={locale} captures={captures} attempts={attempts} questions={questions} onCaptureStatus={onCaptureStatus} embedded mode="captures" selectedCaptureId={activeCaptureId} onSelectedCaptureChange={onActiveCaptureChange} /> : null}
      {activeTab === 'practice' ? <HistoryPanel labels={labels} locale={locale} captures={captures} attempts={attempts} questions={questions} onCaptureStatus={onCaptureStatus} embedded mode="practice" selectedAttemptId={activeAttemptId} onSelectedAttemptChange={onActiveAttemptChange} attemptQuestionDetailOpen={attemptQuestionDetailOpen} onAttemptQuestionDetailChange={onAttemptQuestionDetailChange} /> : null}
      {activeTab === 'drafts' ? <div className="pt-5">{draftsContent}</div> : null}
      {activeTab === 'settings' ? <div className="pt-5">{settingsContent}</div> : null}
    </section>
  );
}
