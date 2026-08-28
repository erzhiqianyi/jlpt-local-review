'use client';

import { useEffect, useMemo, useState } from 'react';
import { itemAnalysis, itemMeaning, itemMemory } from './domain/items';
import { buildQuestions, deckLabelsFor } from './domain/questions';
import { createDefaultStudyPlanProfile } from './domain/studyPlan';
import type { OfficialSampleModule } from './data/officialModuleSamples';
import { AboutPanel } from './features/about/AboutPanel';
import { CapturePanel } from './features/capture/CapturePanel';
import { DraftsPanel } from './features/drafts/DraftsPanel';
import { HomeDashboard } from './features/home/HomeDashboard';
import { DataManagementPanel } from './features/insights/DataManagementPanel';
import { ListeningPanel } from './features/listening/ListeningPanel';
import { DesktopStudyToolbar, DesktopUtilityMenu, MobileHeader, MobileStudyControls } from './features/navigation/MobileNavigation';
import { OfficialModuleSamples, OfficialSampleEntry } from './features/official-samples/OfficialModuleSamples';
import { StudyPlanPanel } from './features/plan/StudyPlanPanel';
import { PracticePanel, PracticeReviewPanel, WordDetailPanel, WordIndexPanel } from './features/practice/StudyPanels';
import { QuestionTypeGuide } from './features/question-types/QuestionTypeGuide';
import { QuestionTypeDetail } from './features/question-types/QuestionTypeDetail';
import { SettingsView } from './features/settings/SettingsView';
import { translations } from './i18n/translations';
import { apiRequest } from './lib/api';
import type {
  AnswerState,
  AppRoute,
  AppView,
  AttemptAnswer,
  AuthUser,
  Deck,
  DisplaySettings,
  DraftSummary,
  ListeningQuestion,
  ListeningQuestionInput,
  LearningCapture,
  LearningCaptureCategory,
  LearningCaptureStatus,
  Locale,
  PracticeAttempt,
  ProgressEntry,
  ProgressState,
  Question,
  QuestionKind,
  ReviewData,
  ReviewPackDraft,
  ReviewStatus,
  SearchResult,
  StudyPage,
  StudyPlanDocument,
  StudyPlanProfile,
  StudyPlanTaskStatus,
  StudyState,
  VocabItem,
} from './types';

const STORAGE_TOKEN = 'jlpt-auth-token-v1';

const fallbackData: ReviewData = {
  generated_at: '2026-08-27T20:20:00+09:00',
  items: [],
};

const defaultSettings: DisplaySettings = {
  showReviewRuby: true,
  showExplanationRuby: true,
  locale: 'zh-CN',
  fontSize: 'standard',
  feedbackMode: 'immediate',
  questionTypeTips: {},
};

const NEXT_JLPT_AT = '2026-12-06T09:00:00+09:00';

export default function App() {
  const [data, setData] = useState<ReviewData>(fallbackData);
  const [authToken, setAuthToken] = useState<string>(() => (typeof window === 'undefined' ? '' : localStorage.getItem(STORAGE_TOKEN) ?? ''));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [activeDraft, setActiveDraft] = useState<ReviewPackDraft | null>(null);
  const [draftAnnotation, setDraftAnnotation] = useState('');
  const [listeningQuestions, setListeningQuestions] = useState<ListeningQuestion[]>([]);
  const [captures, setCaptures] = useState<LearningCapture[]>([]);
  const [studyPlan, setStudyPlan] = useState<StudyPlanDocument>(() => ({ profile: createDefaultStudyPlanProfile(), status: 'profile_only', tasks: [], dailySummaries: [] }));
  const [selectedDeck, setSelectedDeck] = useState<Deck | 'all'>('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [progress, setProgress] = useState<ProgressState>({});
  const [attemptHistory, setAttemptHistory] = useState<PracticeAttempt[]>([]);
  const [activeAttempt, setActiveAttempt] = useState<PracticeAttempt | null>(null);
  const [settings, setSettings] = useState<DisplaySettings>(defaultSettings);
  const [searchQuery, setSearchQuery] = useState('');
  const [route, setRoute] = useState<AppRoute>(() => routeFromHash(typeof window === 'undefined' ? '' : window.location.hash));
  const [countdown, setCountdown] = useState(() => getCountdown(NEXT_JLPT_AT));
  const activeView = route.view;
  const studyPage = route.page;

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (!authToken) {
        setAuthLoading(false);
        return;
      }
      try {
        const me = await apiRequest<{ user: AuthUser }>('/api/me', { token: authToken });
        const [reviewData, studyState, draftList, listeningList, savedPlan, captureList] = await Promise.all([
          apiRequest<ReviewData>('/api/review-data', { token: authToken }),
          apiRequest<StudyState>('/api/study-state', { token: authToken }),
          apiRequest<{ drafts: DraftSummary[] }>('/api/drafts', { token: authToken }),
          apiRequest<{ questions: ListeningQuestion[] }>('/api/listening-questions', { token: authToken }),
          apiRequest<{ plan: StudyPlanDocument }>('/api/study-plan', { token: authToken }),
          apiRequest<{ captures: LearningCapture[] }>('/api/captures', { token: authToken }),
        ]);
        if (cancelled) return;
        setUser(me.user);
        setData(reviewData);
        applyStudyState(studyState);
        setDrafts(draftList.drafts ?? []);
        setListeningQuestions(listeningList.questions ?? []);
        setStudyPlan(savedPlan.plan ?? { profile: createDefaultStudyPlanProfile(), status: 'profile_only', tasks: [], dailySummaries: [] });
        setCaptures(captureList.captures ?? []);
        setAuthError('');
      } catch (error) {
        if (!cancelled) {
          localStorage.removeItem(STORAGE_TOKEN);
          setAuthToken('');
          setUser(null);
          setAuthError(error instanceof Error ? error.message : 'Session expired');
        }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }

    restoreSession();
    return () => { cancelled = true; };
  }, [authToken]);

  useEffect(() => {
    const timer = window.setInterval(() => setCountdown(getCountdown(NEXT_JLPT_AT)), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.fontSize = settings.fontSize;
    return () => {
      delete document.documentElement.dataset.fontSize;
    };
  }, [settings.fontSize]);

  useEffect(() => {
    if (activeView !== 'plan' || !authToken) return;
    let cancelled = false;
    async function refreshPlan() {
      try {
        const response = await apiRequest<{ plan: StudyPlanDocument }>('/api/study-plan', { token: authToken });
        if (!cancelled) setStudyPlan(response.plan);
      } catch {
        // The main session restore flow owns authentication errors.
      }
    }
    refreshPlan();
    const timer = window.setInterval(refreshPlan, 20_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [activeView, authToken]);

  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, '', routeHash('home', 'questions'));
    }

    function handleHashChange() {
      setRoute(routeFromHash(window.location.hash));
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const items = useMemo(() => moduleItems(data.items, activeView, selectedDeck), [activeView, data.items, selectedDeck]);

  const locale = normalizeLocale(settings.locale);
  const questionItems = useMemo(
    () => selectedDeck === 'all' ? items.filter((item) => item.deck !== 'name_reading' && item.type !== 'proper_name') : items,
    [items, selectedDeck],
  );
  const allQuestions = useMemo(() => buildQuestions(questionItems, locale), [questionItems, locale]);
  const questions = allQuestions;
  const activeQuestion = questions[activeIndex % Math.max(questions.length, 1)];
  const practiceAnsweredCount = questions.filter((question) => Boolean(answers[question.id])).length;
  const practiceComplete = questions.length > 0 && practiceAnsweredCount === questions.length;
  const activeWord = items[wordIndex % Math.max(items.length, 1)];
  const answeredCount = Object.keys(answers).length;
  const correctCount = Object.values(answers).filter((answer) => answer.correct).length;
  const masteredCount = Object.values(progress).filter((item) => item.status === 'mastered').length;
  const labels = translations[locale];
  const deckLabels = deckLabelsFor(locale);
  const moduleStats = moduleSummaries(data.items, labels);
  const dueCount = Object.values(progress).filter((item) => !item.nextReviewAt || item.nextReviewAt <= new Date().toISOString()).length;
  const hasStudyControls = studyPage !== 'samples' && (activeView === 'vocabulary' || activeView === 'grammar' || activeView === 'mixed');
  const searchResults = useMemo(() => searchItems(data.items, searchQuery, locale, labels), [data.items, labels, locale, searchQuery]);
  const reviewAttempt = useMemo(
    () => latestAttemptFor(attemptHistory, activeView, selectedDeck, questions),
    [activeView, attemptHistory, questions, selectedDeck],
  );

  useEffect(() => {
    setActiveIndex(0);
    setWordIndex(0);
  }, [activeView, selectedDeck]);

  useEffect(() => {
    if (studyPage !== 'words' || !route.itemId) {
      return;
    }
    const requestedIndex = items.findIndex((item) => item.id === route.itemId);
    if (requestedIndex >= 0) {
      setWordIndex(requestedIndex);
    }
  }, [items, route.itemId, studyPage]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (studyPage !== 'words' || activeView === 'home' || activeView === 'about' || activeView === 'settings' || activeView === 'drafts' || activeView === 'listening' || activeView === 'reading') {
        return;
      }
      if (event.key === 'ArrowLeft') {
        setWordIndex((index) => previousIndex(index, items.length));
      }
      if (event.key === 'ArrowRight') {
        setWordIndex((index) => nextIndex(index, items.length));
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, items.length, studyPage]);

  function answerQuestion(question: Question, selected: string) {
    if (answers[question.id]) {
      return;
    }
    const correct = selected === question.answer;
    const now = new Date();
    const attempt = currentAttemptFor(activeAttempt, activeView, selectedDeck, questions, now);
    const elapsedMs = Math.max(0, now.getTime() - new Date(attempt.startedAt).getTime());
    const nextAttemptAnswer: AttemptAnswer = {
      questionId: question.id,
      itemId: question.itemId,
      kind: question.kind,
      selected,
      correct,
      answeredAt: now.toISOString(),
      elapsedMs,
    };
    const nextAttempt = appendAttemptAnswer(attempt, nextAttemptAnswer);
    const nextAnswers = {
      ...answers,
      [question.id]: { selected, correct, answeredAt: now.toISOString(), elapsedMs, attemptId: nextAttempt.id },
    };
    const current = progress[question.itemId] ?? { correct: 0, wrong: 0, status: 'new' as const };
    const nextCorrect = current.correct + (correct ? 1 : 0);
    const nextWrong = current.wrong + (correct ? 0 : 1);
    const schedule = nextSchedule(current, correct, now);
    const status = nextStatus(nextCorrect, nextWrong, schedule.reviewCount);
    const nextProgress = {
      ...progress,
      [question.itemId]: {
        ...current,
        correct: nextCorrect,
        wrong: nextWrong,
        status,
        ...schedule,
      },
    };
    const completed = questions.length > 0 && questions.every((candidate) => Boolean(nextAnswers[candidate.id]));
    const nextHistory = completed ? upsertAttemptHistory(attemptHistory, completeAttempt(nextAttempt, nextAnswers, questions, now)) : attemptHistory;
    const nextActiveAttempt = completed ? null : nextAttempt;
    setAnswers(nextAnswers);
    setProgress(nextProgress);
    setAttemptHistory(nextHistory);
    setActiveAttempt(nextActiveAttempt);

    if (authToken) {
      apiRequest<StudyState>('/api/answers', {
        method: 'POST',
        token: authToken,
        body: { questionId: question.id, itemId: question.itemId, selected, correct, answerRecord: nextAnswers[question.id], progressEntry: nextProgress[question.itemId], attemptHistory: nextHistory, activeAttempt: nextActiveAttempt },
      }).then(applyStudyState).catch((error) => setAuthError(error instanceof Error ? error.message : 'Failed to save answer'));
    }

    if (completed && settings.feedbackMode === 'batch' && supportsStudyPage(activeView)) {
      window.location.hash = routeHash(activeView, 'review');
    }
  }

  function restartPractice() {
    const questionIds = new Set(questions.map((question) => question.id));
    const nextAnswers = Object.fromEntries(
      Object.entries(answers).filter(([questionId]) => !questionIds.has(questionId)),
    );
    const nextAttempt = createPracticeAttempt(activeView, selectedDeck, questions, new Date());
    setAnswers(nextAnswers);
    setActiveAttempt(nextAttempt);
    if (authToken) {
      apiRequest<StudyState>('/api/study-state/practice', { method: 'PUT', token: authToken, body: { answers: nextAnswers, attemptHistory, activeAttempt: nextAttempt } })
        .then(applyStudyState)
        .catch((error) => setAuthError(error instanceof Error ? error.message : 'Failed to restart practice'));
    }
    setActiveIndex(0);
    if (supportsStudyPage(activeView)) {
      window.location.hash = routeHash(activeView, 'questions');
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }

  function navigateTo(view: AppView, page?: StudyPage) {
    const requestedPage = page ?? (view === 'reading' ? 'samples' : 'questions');
    const nextRoute = { view, page: supportsStudyPage(view) || isOfficialSampleModule(view) ? requestedPage : 'questions' as StudyPage };
    const nextHash = routeHash(nextRoute.view, nextRoute.page);
    if (window.location.hash === nextHash) {
      setRoute(nextRoute);
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      return;
    }
    window.location.hash = nextHash;
  }

  function openSearchResult(item: VocabItem) {
    const view: AppView = item.deck === 'grammar_expression' ? 'grammar' : 'vocabulary';
    if (view === 'vocabulary') {
      setSelectedDeck('all');
    }
    setSearchQuery('');
    window.location.hash = routeHash(view, 'words', item.id);
  }

  function openQuestionType(id: string) {
    window.location.hash = routeHash('question-types', 'questions', id);
  }

  function openOfficialSamples(module: OfficialSampleModule, id?: string) {
    window.location.hash = routeHash(module, 'samples', id);
  }

  function updateSettings(nextSettings: DisplaySettings) {
    const normalized = normalizeSettings(nextSettings);
    setSettings(normalized);
    if (authToken) {
      apiRequest<{ settings: DisplaySettings }>('/api/study-state/settings', { method: 'PUT', token: authToken, body: normalized })
        .then((response) => setSettings(normalizeSettings(response.settings)))
        .catch((error) => setAuthError(error instanceof Error ? error.message : 'Failed to save settings'));
    }
  }

  function updateQuestionTypeTip(id: string, tip: string) {
    const nextTips = { ...settings.questionTypeTips };
    if (tip) {
      nextTips[id] = tip;
    } else {
      delete nextTips[id];
    }
    updateSettings({ ...settings, questionTypeTips: nextTips });
  }

  function applyStudyState(studyState: StudyState) {
    setAnswers(studyState.answers ?? {});
    setProgress(studyState.progress ?? {});
    setAttemptHistory(studyState.attemptHistory ?? []);
    setActiveAttempt(studyState.activeAttempt ?? null);
    setSettings(normalizeSettings(studyState.settings));
  }

  async function handleAuth(mode: 'login' | 'register', username: string, password: string) {
    setAuthLoading(true);
    setAuthError('');
    try {
      const session = await apiRequest<{ user: AuthUser; token: string }>(`/api/auth/${mode}`, { method: 'POST', body: { username, password } });
      localStorage.setItem(STORAGE_TOKEN, session.token);
      setAuthToken(session.token);
      setUser(session.user);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    if (authToken) apiRequest('/api/auth/logout', { method: 'POST', token: authToken }).catch(() => undefined);
    localStorage.removeItem(STORAGE_TOKEN);
    setAuthToken('');
    setUser(null);
    setData(fallbackData);
    setAnswers({});
    setProgress({});
    setAttemptHistory([]);
    setActiveAttempt(null);
    setSettings(defaultSettings);
    setDrafts([]);
    setActiveDraft(null);
    setListeningQuestions([]);
  }

  async function refreshDrafts(selectId?: string) {
    if (!authToken) return;
    const list = await apiRequest<{ drafts: DraftSummary[] }>('/api/drafts', { token: authToken });
    setDrafts(list.drafts ?? []);
    const nextId = selectId ?? activeDraft?.id ?? list.drafts?.[0]?.id;
    if (nextId) {
      const response = await apiRequest<{ draft: ReviewPackDraft }>(`/api/drafts/${nextId}`, { token: authToken });
      setActiveDraft(response.draft);
    }
  }

  async function createDailyDraft() {
    if (!authToken) return;
    try {
      const response = await apiRequest<{ draft: ReviewPackDraft }>('/api/drafts', { method: 'POST', token: authToken, body: { kind: 'daily_review_pack', minutes: 30 } });
      setActiveDraft(response.draft);
      setDraftAnnotation('');
      await refreshDrafts(response.draft.id);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to create draft');
    }
  }

  async function selectDraft(id: string) {
    if (!authToken) return;
    try {
      const response = await apiRequest<{ draft: ReviewPackDraft }>(`/api/drafts/${id}`, { token: authToken });
      setActiveDraft(response.draft);
      setDraftAnnotation('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to load draft');
    }
  }

  async function saveDraftAnnotation() {
    if (!authToken || !activeDraft || !draftAnnotation.trim()) return;
    try {
      const response = await apiRequest<{ draft: ReviewPackDraft }>(`/api/drafts/${activeDraft.id}/annotations`, { method: 'POST', token: authToken, body: { body: draftAnnotation } });
      setActiveDraft(response.draft);
      setDraftAnnotation('');
      await refreshDrafts(response.draft.id);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to save annotation');
    }
  }

  async function copyDraftRevisionContext() {
    if (!authToken || !activeDraft) return;
    try {
      const context = await apiRequest<Record<string, unknown>>(`/api/drafts/${activeDraft.id}/revision-context`, { token: authToken });
      await navigator.clipboard.writeText(JSON.stringify(context, null, 2));
      setAuthError(labels.revisionContextCopied);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to copy revision context');
    }
  }

  async function createListeningQuestion(input: ListeningQuestionInput) {
    if (!authToken) return;
    const response = await apiRequest<{ question: ListeningQuestion }>('/api/listening-questions', {
      method: 'POST',
      token: authToken,
      body: input,
    });
    setListeningQuestions((current) => [response.question, ...current]);
  }

  async function removeListeningQuestion(id: string) {
    if (!authToken) return;
    await apiRequest(`/api/listening-questions/${id}`, { method: 'DELETE', token: authToken });
    setListeningQuestions((current) => current.filter((question) => question.id !== id));
  }

  async function saveStudyPlanProfile(profile: StudyPlanProfile) {
    if (!authToken) return;
    const response = await apiRequest<{ plan: StudyPlanDocument }>('/api/study-plan/profile', { method: 'PUT', token: authToken, body: profile });
    setStudyPlan(response.plan);
  }

  async function updateStudyPlanTask(id: string, status: StudyPlanTaskStatus) {
    if (!authToken) return;
    const response = await apiRequest<{ plan: StudyPlanDocument }>(`/api/study-plan/tasks/${id}`, { method: 'PATCH', token: authToken, body: { status } });
    setStudyPlan(response.plan);
  }

  async function createCapture(input: { body: string; category: LearningCaptureCategory }) {
    if (!authToken) return;
    const response = await apiRequest<{ capture: LearningCapture }>('/api/captures', { method: 'POST', token: authToken, body: input });
    setCaptures((current) => [response.capture, ...current]);
  }

  async function updateCaptureStatus(id: string, status: LearningCaptureStatus) {
    if (!authToken) return;
    const response = await apiRequest<{ capture: LearningCapture }>(`/api/captures/${id}`, { method: 'PATCH', token: authToken, body: { status } });
    setCaptures((current) => current.map((capture) => capture.id === id ? response.capture : capture));
  }

  if (authLoading && !user) return <LoadingScreen />;
  if (!user) return <LoginScreen error={authError} loading={authLoading} onSubmit={handleAuth} />;

  return (
    <main className="flex min-h-screen max-w-full flex-col overflow-x-hidden bg-[#f5f7f3] text-[#1f2522]">
      <header className="sticky top-0 z-20 border-b border-[#d7dfd6] bg-white">
        <div className="mx-auto max-w-7xl min-w-0 px-4 md:px-8 lg:px-10">
          <MobileHeader
            brand={labels.brand}
            activeView={activeView}
            items={navItems(labels)}
            labels={labels}
            searchContent={(
              <GlobalSearch
                query={searchQuery}
                results={searchResults}
                labels={labels}
                onQueryChange={setSearchQuery}
                onOpenResult={openSearchResult}
              />
            )}
            onHome={() => navigateTo('home')}
            onNavigate={navigateTo}
          />
          <div className="hidden min-w-0 items-center justify-between gap-5 py-3 lg:flex">
            <button type="button" onClick={() => navigateTo('home')} className="text-lg font-semibold tracking-normal text-[#173d35]">
              {labels.brand}
            </button>
            <nav className="flex min-w-0 max-w-full gap-2 overflow-x-auto">
              {primaryNavItems(labels).map((item) => (
                <NavButton key={item.view} active={activeView === item.view} onClick={() => navigateTo(item.view)}>
                  {item.label}
                </NavButton>
              ))}
            </nav>
            <GlobalSearch
              query={searchQuery}
              results={searchResults}
              labels={labels}
              onQueryChange={setSearchQuery}
              onOpenResult={openSearchResult}
            />
            <DesktopUtilityMenu activeView={activeView} items={secondaryNavItems(labels)} labels={labels} onNavigate={navigateTo} />
          </div>
        </div>
      </header>

      {authError ? (
        <div className="mx-auto mt-3 w-full max-w-7xl px-4 md:px-8 lg:px-10">
          <p className="rounded-md border border-[#d5a95f] bg-[#fff4d8] p-3 text-sm font-semibold text-[#6f4a16]">{authError}</p>
        </div>
      ) : null}

      {activeView === 'home' ? (
        <HomeDashboard
          labels={labels}
          locale={locale}
          countdown={countdown}
          metrics={[
            { label: labels.insightsPending, value: captures.filter((capture) => capture.status === 'inbox').length.toString() },
            { label: labels.dueReview, value: dueCount.toString() },
            { label: labels.answered, value: answeredCount.toString() },
            { label: labels.correct, value: correctCount.toString() },
            { label: labels.mastered, value: masteredCount.toString() },
          ]}
          modules={moduleStats}
          onNavigate={navigateTo}
        />
      ) : null}

      {activeView !== 'home' ? (
        <section className={`mx-auto w-full min-w-0 flex-1 ${hasStudyControls ? 'max-w-5xl px-0 py-0 md:px-8 md:py-5 lg:px-10' : 'max-w-7xl px-4 py-4 md:px-8 md:py-5 lg:px-10'}`}>
          <div className={hasStudyControls || activeView === 'listening' ? 'min-w-0 space-y-5' : 'min-w-0'}>
            {activeView === 'capture' ? <CapturePanel labels={labels} onSave={createCapture} onOpenHistory={() => navigateTo('insights')} /> : null}
            {activeView === 'history' || activeView === 'insights' ? <DataManagementPanel key={activeView} labels={labels} locale={locale} captures={captures} attempts={attemptHistory} progress={progress} summaries={studyPlan.dailySummaries} initialTab={activeView === 'history' ? 'captures' : 'overview'} onCaptureStatus={updateCaptureStatus} /> : null}
            {hasStudyControls ? (
              <DesktopStudyToolbar
                mode={studyPage}
                labels={labels}
                deckLabels={deckLabels}
                selectedDeck={selectedDeck}
                allowDeckFilter={activeView === 'vocabulary' || activeView === 'mixed'}
                onModeChange={(page) => navigateTo(activeView, page)}
                onDeckChange={setSelectedDeck}
              />
            ) : null}
            {hasStudyControls ? (
              <MobileStudyControls
                mode={studyPage}
                labels={labels}
                deckLabels={deckLabels}
                selectedDeck={selectedDeck}
                allowDeckFilter={activeView === 'vocabulary' || activeView === 'mixed'}
                onModeChange={(page) => navigateTo(activeView, page)}
                onDeckChange={setSelectedDeck}
              />
            ) : null}
            {activeView === 'about' ? <AboutPanel labels={labels} /> : null}
            {activeView === 'plan' ? <StudyPlanPanel labels={labels} locale={locale} plan={studyPlan} onSaveProfile={saveStudyPlanProfile} onTaskStatus={updateStudyPlanTask} /> : null}
            {activeView === 'question-types' ? (
              route.itemId ? (
                <QuestionTypeDetail id={route.itemId} labels={labels} locale={locale} customTip={settings.questionTypeTips[route.itemId]} onBack={() => navigateTo('question-types')} onUpdateTip={updateQuestionTypeTip} />
              ) : (
                <QuestionTypeGuide labels={labels} locale={locale} customTips={settings.questionTypeTips} onOpen={openQuestionType} />
              )
            ) : null}
            {activeView === 'drafts' ? (
              <DraftsPanel labels={labels} drafts={drafts} activeDraft={activeDraft} annotation={draftAnnotation} onAnnotationChange={setDraftAnnotation} onCreateDailyDraft={createDailyDraft} onSelectDraft={selectDraft} onSaveAnnotation={saveDraftAnnotation} onCopyRevisionContext={copyDraftRevisionContext} />
            ) : null}
            {activeView === 'settings' ? (
              <SettingsView labels={labels} settings={settings} username={user.username} onLogout={handleLogout} onUpdateSettings={updateSettings} />
            ) : null}
            {isOfficialSampleModule(activeView) && studyPage === 'samples' ? (
              <OfficialModuleSamples
                module={activeView}
                sampleId={route.itemId}
                labels={labels}
                locale={locale}
                onOpen={(id) => openOfficialSamples(activeView, id)}
                onBack={() => openOfficialSamples(activeView)}
              />
            ) : null}
            {activeView === 'listening' && studyPage !== 'samples' ? <OfficialSampleEntry module="listening" labels={labels} locale={locale} onOpen={() => openOfficialSamples('listening')} /> : null}
            {activeView === 'listening' && studyPage !== 'samples' ? (
              <ListeningPanel
                labels={labels}
                locale={locale}
                token={authToken}
                questions={listeningQuestions}
                onCreate={createListeningQuestion}
                onDelete={removeListeningQuestion}
              />
            ) : null}
            {activeView === 'reading' && studyPage !== 'samples' ? <EmptyModule labels={labels} /> : null}
            {studyPage !== 'samples' && activeView !== 'capture' && activeView !== 'history' && activeView !== 'insights' && activeView !== 'about' && activeView !== 'plan' && activeView !== 'question-types' && activeView !== 'drafts' && activeView !== 'settings' && activeView !== 'listening' && activeView !== 'reading' ? (
              studyPage === 'questions' ? (
                <PracticePanel
                  activeQuestion={activeQuestion}
                  questionsLength={questions.length}
                  activeIndex={activeIndex}
                  answeredCount={practiceAnsweredCount}
                  complete={practiceComplete}
                  feedbackMode={settings.feedbackMode}
                  answers={answers}
                  items={data.items}
                  labels={labels}
                  questionTypeLabel={labels.meaningTypeTitle}
                  settings={settings}
                  onAnswer={answerQuestion}
                  onPrev={() => setActiveIndex((index) => Math.max(index - 1, 0))}
                  onNext={() => setActiveIndex((index) => nextPracticeIndex(index, questions, answers))}
                  onRestart={restartPractice}
                  onReview={() => navigateTo(activeView, 'review')}
                />
              ) : studyPage === 'words' && route.itemId ? (
                <WordDetailPanel
                  item={activeWord}
                  index={wordIndex}
                  total={items.length}
                  showRuby={settings.showReviewRuby}
                  labels={labels}
                  locale={locale}
                  onShowRubyChange={(checked) => updateSettings({ ...settings, showReviewRuby: checked })}
                  onPrevious={() => setWordIndex((index) => previousIndex(index, items.length))}
                  onNext={() => setWordIndex((index) => nextIndex(index, items.length))}
                  onBack={() => navigateTo(activeView, 'words')}
                />
              ) : studyPage === 'words' ? (
                <WordIndexPanel
                  items={items}
                  questions={questions}
                  answers={answers}
                  progress={progress}
                  labels={labels}
                  locale={locale}
                  onOpen={(id) => { window.location.hash = routeHash(activeView, 'words', id); }}
                />
              ) : (
                <PracticeReviewPanel
                  attempt={reviewAttempt}
                  questions={questions}
                  answers={answers}
                  items={data.items}
                  labels={labels}
                  locale={locale}
                  showRuby={settings.showExplanationRuby}
                  onRestart={restartPractice}
                  onBackToPractice={() => navigateTo(activeView, 'questions')}
                />
              )
            ) : null}
          </div>
        </section>
      ) : null}

      <footer className="mt-auto border-t border-[#d9d0c3] bg-[#fffaf2]">
        <div className="mx-auto flex max-w-7xl min-w-0 flex-col gap-2 px-5 py-5 text-sm text-[#5f625b] md:flex-row md:items-center md:justify-between md:px-8 lg:px-10">
          <p>© 2026 Itsuki. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <a className="font-semibold text-[#24473f] hover:underline" href="https://x.com/itsuki_maer" target="_blank" rel="noreferrer">
              X @itsuki_maer
            </a>
            <a className="font-semibold text-[#24473f] hover:underline" href="mailto:jlpt@erzhiqian.cc">
              jlpt@erzhiqian.cc
            </a>
            <a className="font-semibold text-[#24473f] hover:underline" href="https://github.com/erzhiqianyi/jlpt-master-deck" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function routeFromHash(hash: string): AppRoute {
  const [viewValue, pageValue, itemValue] = hash.replace(/^#\/?/, '').split('/');
  const view = isAppView(viewValue) ? viewValue : 'home';
  if (view === 'question-types') {
    return { view, page: 'questions', itemId: pageValue ? decodeURIComponent(pageValue) : undefined };
  }
  if (isOfficialSampleModule(view) && pageValue === 'samples') {
    return { view, page: 'samples', itemId: itemValue ? decodeURIComponent(itemValue) : undefined };
  }
  if (view === 'reading' && !pageValue) {
    return { view, page: 'samples' };
  }
  const page = pageValue === 'words' || pageValue === 'review' ? pageValue : 'questions';
  const itemId = page === 'words' && itemValue ? decodeURIComponent(itemValue) : undefined;
  return { view, page: supportsStudyPage(view) ? page : 'questions', itemId };
}

function routeHash(view: AppView, page: StudyPage, itemId?: string) {
  if (view === 'question-types') {
    return itemId ? `#/question-types/${encodeURIComponent(itemId)}` : '#/question-types';
  }
  if (isOfficialSampleModule(view) && page === 'samples') {
    return itemId ? `#/${view}/samples/${encodeURIComponent(itemId)}` : `#/${view}/samples`;
  }
  if (!supportsStudyPage(view)) {
    return `#/${view}`;
  }
  return itemId && page === 'words' ? `#/${view}/${page}/${encodeURIComponent(itemId)}` : `#/${view}/${page}`;
}

function supportsStudyPage(view: AppView) {
  return view === 'vocabulary' || view === 'grammar' || view === 'mixed';
}

function isOfficialSampleModule(view: AppView): view is OfficialSampleModule {
  return view === 'grammar' || view === 'reading' || view === 'listening';
}

function isAppView(value: string): value is AppView {
  return ['capture', 'home', 'history', 'insights', 'plan', 'question-types', 'vocabulary', 'grammar', 'listening', 'reading', 'mixed', 'drafts', 'about', 'settings'].includes(value);
}

function nextIndex(index: number, total: number) {
  return total ? (index + 1) % total : 0;
}

function previousIndex(index: number, total: number) {
  return total ? (index - 1 + total) % total : 0;
}

function nextPracticeIndex(index: number, questions: Question[], answers: AnswerState) {
  if (!questions.length) {
    return 0;
  }
  for (let offset = 1; offset <= questions.length; offset += 1) {
    const candidate = (index + offset) % questions.length;
    if (!answers[questions[candidate].id]) {
      return candidate;
    }
  }
  return nextIndex(index, questions.length);
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function createPracticeAttempt(view: AppView, deck: Deck | 'all', questions: Question[], now: Date): PracticeAttempt {
  return {
    id: `attempt-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    startedAt: now.toISOString(),
    view,
    deck,
    questionIds: questions.map((question) => question.id),
    answers: [],
  };
}

function currentAttemptFor(
  attempt: PracticeAttempt | null,
  view: AppView,
  deck: Deck | 'all',
  questions: Question[],
  now: Date,
) {
  const questionIds = questions.map((question) => question.id);
  const sameQuestionSet = attempt
    && attempt.view === view
    && attempt.deck === deck
    && attempt.questionIds.length === questionIds.length
    && attempt.questionIds.every((id, index) => id === questionIds[index])
    && !attempt.completedAt;
  return sameQuestionSet ? attempt : createPracticeAttempt(view, deck, questions, now);
}

function appendAttemptAnswer(attempt: PracticeAttempt, answer: AttemptAnswer): PracticeAttempt {
  return {
    ...attempt,
    answers: [...attempt.answers.filter((item) => item.questionId !== answer.questionId), answer],
  };
}

function completeAttempt(attempt: PracticeAttempt, answers: AnswerState, questions: Question[], now: Date): PracticeAttempt {
  const completedAnswers = questions.map((question) => {
    const existing = attempt.answers.find((answer) => answer.questionId === question.id);
    const stored = answers[question.id];
    return existing ?? {
      questionId: question.id,
      itemId: question.itemId,
      kind: question.kind,
      selected: stored?.selected ?? '',
      correct: Boolean(stored?.correct),
      answeredAt: stored?.answeredAt ?? now.toISOString(),
      elapsedMs: stored?.elapsedMs ?? Math.max(0, now.getTime() - new Date(attempt.startedAt).getTime()),
    };
  });
  const correct = completedAnswers.filter((answer) => answer.correct).length;
  const elapsedMs = Math.max(0, now.getTime() - new Date(attempt.startedAt).getTime());
  return {
    ...attempt,
    completedAt: now.toISOString(),
    answers: completedAnswers,
    summary: {
      total: questions.length,
      correct,
      wrong: questions.length - correct,
      accuracy: questions.length ? correct / questions.length : 0,
      elapsedMs,
    },
  };
}

function upsertAttemptHistory(history: PracticeAttempt[], attempt: PracticeAttempt) {
  return [attempt, ...history.filter((item) => item.id !== attempt.id)].slice(0, 50);
}

function latestAttemptFor(history: PracticeAttempt[], view: AppView, deck: Deck | 'all', questions: Question[]) {
  const questionIds = new Set(questions.map((question) => question.id));
  return history.find((attempt) => (
    attempt.view === view
    && attempt.deck === deck
    && attempt.completedAt
    && attempt.questionIds.some((id) => questionIds.has(id))
  ));
}

function normalizeSettings(value: Partial<DisplaySettings> | undefined): DisplaySettings {
  return {
    ...defaultSettings,
    ...(value ?? {}),
    locale: normalizeLocale(value?.locale),
    fontSize: value?.fontSize === 'small' || value?.fontSize === 'large' ? value.fontSize : defaultSettings.fontSize,
    questionTypeTips: value?.questionTypeTips && typeof value.questionTypeTips === 'object' ? value.questionTypeTips : {},
  };
}

function normalizeLocale(value: unknown): Locale {
  return value === 'ja' || value === 'en' || value === 'zh-CN' ? value : defaultSettings.locale;
}

function nextStatus(correct: number, wrong: number, reviewCount: number): ReviewStatus {
  if (correct >= 4 && wrong <= 1 && reviewCount >= 4) {
    return 'mastered';
  }
  if (correct >= 2) {
    return 'review';
  }
  if (correct + wrong > 0) {
    return 'learning';
  }
  return 'new';
}

function nextSchedule(current: ProgressEntry, correct: boolean, now: Date) {
  const previousEase = current.ease ?? 2.5;
  const previousInterval = current.intervalDays ?? 0;
  const reviewCount = (current.reviewCount ?? 0) + 1;
  const ease = correct ? Math.min(previousEase + 0.15, 3.2) : Math.max(previousEase - 0.2, 1.3);
  const intervalDays = correct
    ? nextCorrectInterval(reviewCount, previousInterval, ease)
    : 1;
  return {
    firstSeenAt: current.firstSeenAt ?? now.toISOString(),
    lastReviewedAt: now.toISOString(),
    reviewCount,
    ease,
    intervalDays,
    nextReviewAt: addDays(now, intervalDays).toISOString(),
  };
}

function nextCorrectInterval(reviewCount: number, previousInterval: number, ease: number) {
  if (reviewCount <= 1) {
    return 1;
  }
  if (reviewCount === 2) {
    return 3;
  }
  return Math.max(4, Math.round(Math.max(previousInterval, 3) * ease));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getCountdown(target: string) {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  const totalMinutes = Math.floor(diff / 60_000);
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  };
}

function moduleItems(items: VocabItem[], view: AppView, selectedDeck: Deck | 'all') {
  if (view === 'home') {
    return items;
  }
  if (view === 'grammar') {
    return items.filter((item) => item.deck === 'grammar_expression');
  }
  if (view === 'capture' || view === 'history' || view === 'insights' || view === 'plan' || view === 'question-types' || view === 'listening' || view === 'reading' || view === 'drafts' || view === 'about' || view === 'settings') {
    return [];
  }
  if (view === 'vocabulary') {
    const vocabItems = items.filter((item) => item.deck !== 'grammar_expression');
    if (selectedDeck === 'all' || selectedDeck === 'grammar_expression') {
      return vocabItems;
    }
    return vocabItems.filter((item) => item.deck === selectedDeck);
  }
  if (selectedDeck === 'all') {
    return items;
  }
  return items.filter((item) => item.deck === selectedDeck);
}

function navItems(labels: Record<string, string>) {
  return [...primaryNavItems(labels), ...secondaryNavItems(labels)];
}

function primaryNavItems(labels: Record<string, string>) {
  return [
    { view: 'home' as const, label: labels.navHome },
    { view: 'vocabulary' as const, label: labels.navVocabulary },
    { view: 'grammar' as const, label: labels.navGrammar },
    { view: 'listening' as const, label: labels.navListening },
    { view: 'reading' as const, label: labels.navReading },
    { view: 'mixed' as const, label: labels.navMixed },
    { view: 'insights' as const, label: labels.navInsights },
  ];
}

function secondaryNavItems(labels: Record<string, string>) {
  return [
    { view: 'plan' as const, label: labels.navPlan },
    { view: 'question-types' as const, label: labels.navQuestionTypes },
    { view: 'drafts' as const, label: labels.navDrafts },
    { view: 'settings' as const, label: labels.settings },
  ];
}

function searchItems(items: VocabItem[], query: string, locale: Locale, labels: Record<string, string>): SearchResult[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return [];
  }

  return items
    .map((item) => {
      const moduleLabel = item.deck === 'grammar_expression' ? labels.searchModuleGrammar : labels.searchModuleVocabulary;
      const primaryFields = [item.original, item.reading, item.meaning_ja, item.paraphrase_ja, itemMeaning(item, locale)];
      const secondaryFields = [
        itemMemory(item, locale),
        itemAnalysis(item, locale),
        item.jlpt_level,
        item.part_of_speech,
        item.type,
        ...(item.collocations ?? []),
        ...(item.tags ?? []),
        ...(item.examples?.flatMap((example) => [example.ja, example.zh]) ?? []),
        ...(item.comparisons?.flatMap((comparison) => [comparison.target, comparison.difference_zh]) ?? []),
      ];
      const fields = [...primaryFields, ...secondaryFields].filter(Boolean) as string[];
      const matches = fields.filter((field) => normalizeSearchText(field).includes(normalizedQuery));
      if (!matches.length) {
        return null;
      }

      const original = normalizeSearchText(item.original);
      const reading = normalizeSearchText(item.reading ?? '');
      const score =
        original === normalizedQuery || reading === normalizedQuery
          ? 100
          : original.startsWith(normalizedQuery) || reading.startsWith(normalizedQuery)
            ? 80
            : primaryFields.some((field) => field && normalizeSearchText(field).includes(normalizedQuery))
              ? 60
              : 30;

      return {
        item,
        title: item.original,
        subtitle: itemMeaning(item, locale),
        moduleLabel,
        matches: unique(matches).slice(0, 3),
        score,
      };
    })
    .filter((result): result is SearchResult => Boolean(result))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'ja'))
    .slice(0, 12) as SearchResult[];
}

function normalizeSearchText(value: string) {
  return katakanaToHiragana(value.normalize('NFKC'))
    .toLocaleLowerCase()
    .replace(/\s+/g, '')
    .trim();
}

function katakanaToHiragana(value: string) {
  return value.replace(/[\u30a1-\u30f6]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

function moduleSummaries(items: VocabItem[], labels: Record<string, string>) {
  return [
    {
      view: 'vocabulary' as const,
      title: labels.moduleVocabularyTitle,
      body: labels.moduleVocabularyBody,
      count: items.filter((item) => item.deck !== 'grammar_expression').length,
    },
    {
      view: 'grammar' as const,
      title: labels.moduleGrammarTitle,
      body: labels.moduleGrammarBody,
      count: items.filter((item) => item.deck === 'grammar_expression').length,
    },
    {
      view: 'listening' as const,
      title: labels.moduleListeningTitle,
      body: labels.moduleListeningBody,
      count: 0,
    },
    {
      view: 'reading' as const,
      title: labels.moduleReadingTitle,
      body: labels.moduleReadingBody,
      count: 0,
    },
    {
      view: 'mixed' as const,
      title: labels.moduleMixedTitle,
      body: labels.moduleMixedBody,
      count: items.length,
    },
  ];
}

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7f3] px-4 text-[#1f2522]">
      <div className="w-full max-w-md rounded-lg border border-[#d7dfd6] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-[#7d6032]">JLPT Review</p>
        <h1 className="mt-2 text-2xl font-semibold">Loading local backend data</h1>
      </div>
    </main>
  );
}

function LoginScreen({
  error,
  loading,
  onSubmit,
}: {
  error: string;
  loading: boolean;
  onSubmit: (mode: 'login' | 'register', username: string, password: string) => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(mode, username, password);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7f3] px-4 text-[#1f2522]">
      <section className="w-full max-w-md rounded-lg border border-[#d7dfd6] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-[#7d6032]">Local Backend</p>
        <h1 className="mt-2 text-2xl font-semibold">JLPT Review Login</h1>
        <p className="mt-3 text-sm leading-6 text-[#5f625b]">
          Create any local username and password. Personal progress is stored in SQLite on this machine.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <SegmentButton active={mode === 'login'} onClick={() => setMode('login')}>
            Login
          </SegmentButton>
          <SegmentButton active={mode === 'register'} onClick={() => setMode('register')}>
            Register
          </SegmentButton>
        </div>

        <form className="mt-5 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-semibold text-[#4f5651]">
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-[#c8bcae] bg-white px-3 text-base"
              autoComplete="username"
              pattern="[A-Za-z0-9_-]{3,32}"
              required
            />
          </label>
          <label className="block text-sm font-semibold text-[#4f5651]">
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-[#c8bcae] bg-white px-3 text-base"
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              minLength={4}
              required
            />
          </label>
          {error ? <p className="rounded-md border border-[#d5a95f] bg-[#fff4d8] p-3 text-sm font-semibold text-[#6f4a16]">{error}</p> : null}
          <button type="submit" disabled={loading} className="h-11 w-full rounded-md bg-[#173d35] px-4 text-sm font-semibold text-white disabled:opacity-60">
            {loading ? 'Processing...' : mode === 'register' ? 'Create account' : 'Login'}
          </button>
        </form>
      </section>
    </main>
  );
}

function SegmentButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 min-w-0 rounded-md border px-3 py-2 text-sm font-semibold break-words ${
        active ? 'border-[#24473f] bg-[#24473f] text-white' : 'border-[#d9d0c3] bg-white text-[#4f5651] hover:bg-[#f6eee3]'
      }`}
    >
      {children}
    </button>
  );
}

function NavButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 shrink-0 rounded-md px-3 text-sm font-semibold transition ${
        active ? 'bg-[#173d35] text-white' : 'text-[#53605a] hover:bg-[#eef4ee] hover:text-[#173d35]'
      }`}
    >
      {children}
    </button>
  );
}

function GlobalSearch({
  query,
  results,
  labels,
  onQueryChange,
  onOpenResult,
}: {
  query: string;
  results: SearchResult[];
  labels: Record<string, string>;
  onQueryChange: (query: string) => void;
  onOpenResult: (item: VocabItem) => void;
}) {
  const hasQuery = query.trim().length > 0;

  return (
    <div className="relative min-w-0 lg:w-[22rem]">
      <div className="flex h-10 min-w-0 items-center rounded-md border border-[#c8d4cd] bg-[#f8faf7] px-3 focus-within:border-[#24473f] focus-within:bg-white">
        <span aria-hidden="true" className="mr-2 shrink-0 text-[#6b766f]">⌕</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              onQueryChange('');
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-sm text-[#26332e] outline-none placeholder:text-[#7f8984]"
          placeholder={labels.searchPlaceholder}
          aria-label={labels.searchOpen}
        />
        {hasQuery ? (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label={labels.searchClear}
            title={labels.searchClear}
            className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-lg leading-none text-[#68716c] hover:bg-[#e8f0eb] hover:text-[#173d35]"
          >
            ×
          </button>
        ) : null}
      </div>

      {hasQuery ? (
        <div className="absolute left-0 right-0 top-12 z-30 max-h-[min(70vh,520px)] overflow-y-auto rounded-lg border border-[#cbd6cf] bg-white p-2 shadow-xl">
          <p className="px-2 py-1 text-xs font-semibold text-[#7d6032]">{labels.searchResults}</p>
          {results.length ? (
            <div className="mt-1 grid gap-1">
              {results.map((result) => (
                <button
                  type="button"
                  key={result.item.id}
                  onClick={() => onOpenResult(result.item)}
                  className="min-w-0 rounded-md px-3 py-3 text-left hover:bg-[#f3f7f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24473f]"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-base font-semibold text-[#173d35]">{result.title}</p>
                      {result.item.reading ? <p className="mt-1 text-xs font-semibold text-[#856033]">{result.item.reading}</p> : null}
                    </div>
                    <span className="shrink-0 rounded bg-[#e8f0eb] px-2 py-1 text-xs font-semibold text-[#24473f]">{result.moduleLabel}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-[#4f5b55]">{result.subtitle}</p>
                  {result.matches.length ? (
                    <p className="mt-2 line-clamp-2 break-words text-xs leading-5 text-[#747b76]">{result.matches.join(' / ')}</p>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <p className="px-3 py-5 text-sm text-[#68716c]">{labels.noSearchResults}</p>
          )}
        </div>
      ) : null}
    </div>
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

function HomeAction({
  active,
  eyebrow,
  title,
  body,
  onClick,
}: {
  active: boolean;
  eyebrow: string;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-4 text-left shadow-sm transition ${
        active ? 'border-[#24473f] bg-[#e7f0eb]' : 'border-[#d8cdbc] bg-white hover:bg-[#fffaf4]'
      }`}
    >
      <p className="text-xs font-semibold uppercase text-[#856033]">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#62645f]">{body}</p>
    </button>
  );
}
