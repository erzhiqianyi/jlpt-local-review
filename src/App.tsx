'use client';

import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { itemAnalysis, itemMeaning, itemMemory } from './domain/items';
import { defaultMemoryCardBackFields, defaultMemoryCardFrontFields, normalizeMemoryCardFields } from './domain/memoryCards';
import { buildQuestions, deckLabelsFor } from './domain/questions';
import { createDefaultStudyPlanProfile } from './domain/studyPlan';
import type { OfficialSampleModule } from './data/officialModuleSamples';
import { AboutPanel } from './features/about/AboutPanel';
import { CapturePanel } from './features/capture/CapturePanel';
import { DraftsPanel } from './features/drafts/DraftsPanel';
import { HomeDashboard } from './features/home/HomeDashboard';
import { DataManagementPanel, type DataTab } from './features/insights/DataManagementPanel';
import { ListeningPanel } from './features/listening/ListeningPanel';
import { DesktopSidebarNavigation, MobileAppHeader, MobileStudyControls, type MobileStudyPanel } from './features/navigation/MobileNavigation';
import { OfficialModuleSamples } from './features/official-samples/OfficialModuleSamples';
import { StudyPlanPanel } from './features/plan/StudyPlanPanel';
import { MixedEntryIndexPanel, MixedPracticeHub } from './features/practice/MixedPracticeHub';
import { MockExamCatalog } from './features/practice/MockExamCatalog';
import { MockExamPanel } from './features/practice/MockExamPanel';
import { PracticePanel, PracticeReviewPanel, WordDetailPanel, WordbookManagerPanel, WordIndexPanel } from './features/practice/StudyPanels';
import { QuestionTypeGuide } from './features/question-types/QuestionTypeGuide';
import { QuestionTypeDetail } from './features/question-types/QuestionTypeDetail';
import { ReadingPanel } from './features/reading/ReadingPanel';
import { FocusedMemoryReview, type MemoryRating } from './features/review/FocusedMemoryReview';
import { RecordsOverview } from './features/overview/RecordsOverview';
import { SettingsView } from './features/settings/SettingsView';
import { translations } from './i18n/translations';
import { apiRequest } from './lib/api';
import type {
  AnswerState,
  AppRoute,
  AppView,
  AttemptAnswer,
  AuthUser,
  CustomQuestionTypeTip,
  DailyPractice,
  DailyPracticeSummary,
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
  QuestionTypeSection,
  ReadingQuestion,
  ReadingQuestionInput,
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
  Wordbook,
} from './types';

const STORAGE_TOKEN = 'jlpt-auth-token-v1';
const MEMORY_CARD_FRONT_COMPAT_KEY = '_memory_card_front_fields';
const MEMORY_CARD_BACK_COMPAT_KEY = '_memory_card_back_fields';

const fallbackData: ReviewData = {
  generated_at: '2026-08-27T20:20:00+09:00',
  items: [],
};

const fallbackWordbooks: Wordbook[] = [
  { id: 'n1_vocab', title: 'N1/N2 词汇', deck: 'n1_vocab', builtIn: true },
  { id: 'name_reading', title: '补充・人名读法', deck: 'name_reading', builtIn: true },
];

const defaultSettings: DisplaySettings = {
  showReviewRuby: true,
  showExplanationRuby: true,
  locale: 'zh-CN',
  fontSize: 'standard',
  memoryCardFrontFields: defaultMemoryCardFrontFields,
  memoryCardBackFields: defaultMemoryCardBackFields,
  feedbackMode: 'immediate',
  questionTypeTips: {},
  customQuestionTypeTips: [],
};

const NEXT_JLPT_AT = '2026-12-06T09:00:00+09:00';

type AppRouteNavItem = {
  view: AppView;
  label: string;
  page?: StudyPage;
  activeViews?: AppView[];
  children?: AppRouteNavItem[];
  group?: 'study' | 'review' | 'record' | 'manage';
};

export default function App() {
  const [data, setData] = useState<ReviewData>(fallbackData);
  const [authToken, setAuthToken] = useState<string>(() => (typeof window === 'undefined' ? '' : localStorage.getItem(STORAGE_TOKEN) ?? ''));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [dailyPractices, setDailyPractices] = useState<DailyPracticeSummary[]>([]);
  const [dailyPracticeDetails, setDailyPracticeDetails] = useState<DailyPractice[]>([]);
  const [activeDailyPractice, setActiveDailyPractice] = useState<DailyPractice | null>(null);
  const [activeDraft, setActiveDraft] = useState<ReviewPackDraft | null>(null);
  const [draftAnnotation, setDraftAnnotation] = useState('');
  const [listeningQuestions, setListeningQuestions] = useState<ListeningQuestion[]>([]);
  const [readingQuestions, setReadingQuestions] = useState<ReadingQuestion[]>([]);
  const [captures, setCaptures] = useState<LearningCapture[]>([]);
  const [wordbooks, setWordbooks] = useState<Wordbook[]>(fallbackWordbooks);
  const [studyPlan, setStudyPlan] = useState<StudyPlanDocument>(() => ({ profile: createDefaultStudyPlanProfile(), status: 'profile_only', tasks: [], phases: [], dailySummaries: [] }));
  const [selectedDeck, setSelectedDeck] = useState<Deck | 'all'>('all');
  const [selectedWordbookId, setSelectedWordbookId] = useState('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [questionShuffleSeed, setQuestionShuffleSeed] = useState(() => Math.random());
  const [answers, setAnswers] = useState<AnswerState>({});
  const [progress, setProgress] = useState<ProgressState>({});
  const [attemptHistory, setAttemptHistory] = useState<PracticeAttempt[]>([]);
  const [activeAttempt, setActiveAttempt] = useState<PracticeAttempt | null>(null);
  const [settings, setSettings] = useState<DisplaySettings>(defaultSettings);
  const [searchQuery, setSearchQuery] = useState('');
  const [route, setRoute] = useState<AppRoute>(() => routeFromHash(typeof window === 'undefined' ? '' : window.location.hash));
  const [dataTab, setDataTab] = useState<DataTab>(() => dataTabForRoute(route.view));
  const [activeCaptureDetailId, setActiveCaptureDetailId] = useState<string | null>(null);
  const [activeDraftDetailId, setActiveDraftDetailId] = useState<string | null>(null);
  const [activeAttemptDetailId, setActiveAttemptDetailId] = useState<string | null>(null);
  const [attemptQuestionDetailOpen, setAttemptQuestionDetailOpen] = useState(false);
  const [countdown, setCountdown] = useState(() => getCountdown(NEXT_JLPT_AT));
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileStudyPanel, setMobileStudyPanel] = useState<MobileStudyPanel>(null);
  const lastPracticeEntryKey = useRef<string | null>(null);
  const processingAttemptIds = useRef(new Set<string>());
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
        const [reviewData, studyState, draftList, dailyPracticeList, listeningList, readingList, savedPlan, captureList, wordbookList] = await Promise.all([
          apiRequest<ReviewData>('/api/review-data', { token: authToken }),
          apiRequest<StudyState>('/api/study-state', { token: authToken }),
          apiRequest<{ drafts: DraftSummary[] }>('/api/drafts', { token: authToken }),
          apiRequest<{ practices: DailyPracticeSummary[] }>('/api/daily-practices', { token: authToken }),
          apiRequest<{ questions: ListeningQuestion[] }>('/api/listening-questions', { token: authToken }),
          apiRequest<{ questions: ReadingQuestion[] }>('/api/reading-questions', { token: authToken }),
          apiRequest<{ plan: StudyPlanDocument }>('/api/study-plan', { token: authToken }),
          apiRequest<{ captures: LearningCapture[] }>('/api/captures', { token: authToken }),
          apiRequest<{ wordbooks: Wordbook[] }>('/api/wordbooks', { token: authToken }),
        ]);
        if (cancelled) return;
        setUser(me.user);
        setData(normalizeReviewData(reviewData));
        applyStudyState(studyState);
        setDrafts(draftList.drafts ?? []);
        setDailyPractices(dailyPracticeList.practices ?? []);
        const dailyPracticeDetails = await Promise.all((dailyPracticeList.practices ?? []).map(async (practice) => {
          const response = await apiRequest<{ practice: DailyPractice }>(`/api/daily-practices/${practice.id}`, { token: authToken });
          return response.practice;
        }));
        if (!cancelled) {
          setDailyPracticeDetails(dailyPracticeDetails);
          setActiveDailyPractice(dailyPracticeDetails[0] ?? null);
        }
        setListeningQuestions(listeningList.questions ?? []);
        setReadingQuestions(readingList.questions ?? []);
        setStudyPlan(savedPlan.plan ?? { profile: createDefaultStudyPlanProfile(), status: 'profile_only', tasks: [], phases: [], dailySummaries: [] });
        setCaptures(captureList.captures ?? []);
        setWordbooks(normalizeWordbooks(wordbookList.wordbooks));
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
    if (activeView !== 'daily-practice' || !authToken || activeDailyPractice) return;
    refreshDailyPractices().catch((error) => setAuthError(error instanceof Error ? error.message : 'Failed to load daily practice'));
  }, [activeDailyPractice, activeView, authToken]);

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

  const items = useMemo(
    () => moduleItems(data.items, activeView, selectedDeck, activeView === 'vocabulary' ? selectedWordbookId : 'all'),
    [activeView, data.items, selectedDeck, selectedWordbookId],
  );

  const locale = normalizeLocale(settings.locale);
  const questionItems = useMemo(
    () => selectedDeck === 'all' ? items.filter((item) => item.deck !== 'name_reading' && item.type !== 'proper_name') : items,
    [items, selectedDeck],
  );
  const allQuestions = useMemo(() => buildQuestions(questionItems, locale), [questionItems, locale]);
  const historyQuestions = useMemo(() => uniqueById([
    ...buildQuestions(data.items, locale),
    ...dailyPracticeDetails.flatMap((practice) => practice.questions ?? []),
  ]), [dailyPracticeDetails, data.items, locale]);
  const questions = useMemo(
    () => {
      if (activeView === 'daily-practice') {
        return activeDailyPractice?.questions ?? [];
      }
      return activeView === 'vocabulary' ? shuffledBySeed(allQuestions, questionShuffleSeed) : allQuestions;
    },
    [activeDailyPractice, activeView, allQuestions, questionShuffleSeed],
  );
  const activeQuestion = questions[activeIndex % Math.max(questions.length, 1)];
  const practiceAnsweredCount = questions.filter((question) => Boolean(answers[question.id])).length;
  const practiceComplete = questions.length > 0 && practiceAnsweredCount === questions.length;
  const effectiveFeedbackMode = activeView === 'mixed' ? 'batch' : settings.feedbackMode;
  const activeWord = items[wordIndex % Math.max(items.length, 1)];
  const answeredCount = Object.keys(answers).length;
  const correctCount = Object.values(answers).filter((answer) => answer.correct).length;
  const masteredCount = Object.values(progress).filter((item) => item.status === 'mastered').length;
  const labels = translations[locale];
  const deckLabels = deckLabelsFor(locale);
  const moduleStats = moduleSummaries(data.items, labels);
  const memoryReviewItems = useMemo(() => {
    const now = new Date().toISOString();
    return data.items
      .filter((item) => item.deck === 'grammar_expression' || item.deck === 'n1_vocab' || item.deck === 'name_reading')
      .filter((item) => !progress[item.id]?.nextReviewAt || (progress[item.id]?.nextReviewAt ?? '') <= now)
      .sort((left, right) => (progress[left.id]?.nextReviewAt ?? '9999').localeCompare(progress[right.id]?.nextReviewAt ?? '9999'));
  }, [data.items, progress]);
  const hasStudyControls = !['samples', 'wordbooks'].includes(studyPage) && supportsStudyPage(activeView) && activeView !== 'mixed' && activeView !== 'daily-practice';
  const hasLibraryPage = activeView === 'vocabulary' || activeView === 'grammar' || activeView === 'listening' || activeView === 'reading';
  const libraryPageLabel = activeView === 'listening' || activeView === 'reading' ? labels.questionBankPage : labels.wordPage;
  const searchResults = useMemo(() => searchItems(data.items, searchQuery, locale, labels), [data.items, labels, locale, searchQuery]);
  const reviewAttempt = useMemo(
    () => latestAttemptFor(attemptHistory, activeView, selectedDeck, questions),
    [activeView, attemptHistory, questions, selectedDeck],
  );
  const practiceEntryKey = `${activeView}:${studyPage}:${selectedDeck}:${locale}:${activeDailyPractice?.id ?? ''}:${questions.length}:${activeView === 'vocabulary' ? questionShuffleSeed : ''}`;

  useEffect(() => {
    setWordIndex(0);
    if (activeView === 'vocabulary') {
      setQuestionShuffleSeed(Math.random());
    }
  }, [activeView, selectedDeck, selectedWordbookId, locale]);

  useEffect(() => {
    if (selectedWordbookId === 'all') return;
    if (!wordbooks.some((wordbook) => wordbook.id === selectedWordbookId && wordbook.deck !== 'grammar_expression')) {
      setSelectedWordbookId('all');
    }
  }, [selectedWordbookId, wordbooks]);

  useEffect(() => {
    if (authLoading || lastPracticeEntryKey.current === practiceEntryKey) return;
    lastPracticeEntryKey.current = practiceEntryKey;
    if (studyPage !== 'questions') return;

    const firstUnansweredIndex = questions.findIndex((question) => !answers[question.id]);
    setActiveIndex(firstUnansweredIndex >= 0 ? firstUnansweredIndex : 0);
  }, [answers, authLoading, practiceEntryKey, questions, studyPage]);

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
    if (isDataManagementView(route.view)) {
      setDataTab(dataTabForRoute(route.view));
    } else {
      setActiveCaptureDetailId(null);
      setActiveDraftDetailId(null);
      setActiveAttemptDetailId(null);
      setAttemptQuestionDetailOpen(false);
    }
  }, [route.view]);

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
    const correct = selected === question.answer;
    const now = new Date();
    const attempt = currentAttemptFor(activeAttempt, attemptHistory, activeView, selectedDeck, questions, now);
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
    const nextAttemptHistory = upsertAttemptHistory(attemptHistory, nextAttempt);
    const nextAnswers = {
      ...answers,
      [question.id]: { selected, correct, answeredAt: now.toISOString(), elapsedMs, attemptId: nextAttempt.id },
    };
    if (effectiveFeedbackMode === 'batch') {
      setAnswers(nextAnswers);
      setActiveAttempt(nextAttempt);
      setAttemptHistory(nextAttemptHistory);
      if (authToken) {
        apiRequest<StudyState>('/api/study-state/practice', {
          method: 'PUT',
          token: authToken,
          body: { answers: nextAnswers, attemptHistory: nextAttemptHistory, activeAttempt: nextAttempt },
        }).then(applyStudyState).catch((error) => setAuthError(error instanceof Error ? error.message : 'Failed to save answer'));
      }
      return;
    }

    if (answers[question.id]) {
      return;
    }

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
    const nextHistory = completed ? upsertAttemptHistory(nextAttemptHistory, completeAttempt(nextAttempt, nextAnswers, questions, now)) : nextAttemptHistory;
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
  }

  async function submitPracticeReview(navigateToReview = true) {
    const now = new Date();
    const attempt = attemptForReviewSubmission(activeAttempt, attemptHistory, answers, activeView, selectedDeck, questions, now);
    if (attempt.analysisStatus === 'processing' || attempt.analysisStatus === 'completed' || processingAttemptIds.current.has(attempt.id)) {
      if (navigateToReview) window.location.hash = routeHash(activeView, 'review');
      return;
    }
    processingAttemptIds.current.add(attempt.id);
    const completedAttempt = completeAttempt(attempt, answers, questions, now);
    const processingAttempt: PracticeAttempt = {
      ...completedAttempt,
      analysisStatus: 'processing',
      analysisStartedAt: now.toISOString(),
      analysisCompletedAt: undefined,
    };
    const nextHistory = upsertAttemptHistory(attemptHistory, processingAttempt);
    const nextProgress = progressAfterAttempt(progress, answers, questions, now);
    setProgress(nextProgress);
    setAttemptHistory(nextHistory);
    setActiveAttempt(null);

    try {
      if (authToken) {
        await apiRequest<StudyState>('/api/study-state/practice', {
          method: 'PUT',
          token: authToken,
          body: { answers, attemptHistory: nextHistory, activeAttempt: null },
        });
        let latestState: StudyState | null = null;
        for (const question of questions) {
          const answer = answers[question.id];
          if (!answer) continue;
          latestState = await apiRequest<StudyState>('/api/answers', {
            method: 'POST',
            token: authToken,
            body: { questionId: question.id, itemId: question.itemId, selected: answer.selected, correct: answer.correct, answerRecord: answer, progressEntry: nextProgress[question.itemId], attemptHistory: nextHistory, activeAttempt: null },
          });
        }
        if (latestState) {
          applyStudyState(latestState);
        }
      }

      const analyzedAttempt: PracticeAttempt = {
        ...processingAttempt,
        analysisStatus: 'completed',
        analysisCompletedAt: new Date().toISOString(),
      };
      const analyzedHistory = upsertAttemptHistory(nextHistory, analyzedAttempt);
      setAttemptHistory(analyzedHistory);
      if (authToken) {
        const saved = await apiRequest<StudyState>('/api/study-state/practice', {
          method: 'PUT',
          token: authToken,
          body: { attemptHistory: analyzedHistory, activeAttempt: null },
        });
        applyStudyState(saved);
      }
    } catch (error) {
      const retryAttempt: PracticeAttempt = { ...processingAttempt, analysisStatus: 'idle', analysisCompletedAt: undefined };
      const retryHistory = upsertAttemptHistory(nextHistory, retryAttempt);
      setAttemptHistory(retryHistory);
      setAuthError(error instanceof Error ? error.message : 'Failed to save practice review');
      if (authToken) {
        apiRequest<StudyState>('/api/study-state/practice', {
          method: 'PUT',
          token: authToken,
          body: { attemptHistory: retryHistory, activeAttempt: null },
        }).then(applyStudyState).catch(() => undefined);
      }
    } finally {
      processingAttemptIds.current.delete(attempt.id);
    }

    if (navigateToReview) {
      window.location.hash = routeHash(activeView, 'review');
    }
  }

  function restartPractice() {
    const questionIds = new Set(questions.map((question) => question.id));
    const nextAnswers = Object.fromEntries(
      Object.entries(answers).filter(([questionId]) => !questionIds.has(questionId)),
    );
    const nextAttempt = createPracticeAttempt(activeView, selectedDeck, questions, new Date());
    const nextHistory = upsertAttemptHistory(
      activeAttempt ? attemptHistory.filter((attempt) => attempt.id !== activeAttempt.id || Boolean(attempt.completedAt)) : attemptHistory,
      nextAttempt,
    );
    setAnswers(nextAnswers);
    setActiveAttempt(nextAttempt);
    setAttemptHistory(nextHistory);
    if (authToken) {
      apiRequest<StudyState>('/api/study-state/practice', { method: 'PUT', token: authToken, body: { answers: nextAnswers, attemptHistory: nextHistory, activeAttempt: nextAttempt } })
        .then(applyStudyState)
        .catch((error) => setAuthError(error instanceof Error ? error.message : 'Failed to restart practice'));
    }
    setActiveIndex(0);
    if (activeView === 'vocabulary') {
      setQuestionShuffleSeed(Math.random());
    }
    if (supportsStudyPage(activeView)) {
      window.location.hash = routeHash(activeView, 'questions');
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }

  function navigateTo(view: AppView, page?: StudyPage) {
    const requestedPage = page ?? (view === 'daily-practice' ? 'questions' : supportsStudyPage(view) ? 'tips' : 'questions');
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

  function openMockExam(examId?: string) {
    window.location.hash = examId ? `#/mock-exams/${encodeURIComponent(examId)}` : '#/mock-exams';
  }

  function updateSettings(nextSettings: DisplaySettings) {
    const normalized = normalizeSettings(nextSettings);
    setSettings(normalized);
    if (authToken) {
      const compatibleSettings = {
        ...normalized,
        questionTypeTips: {
          ...normalized.questionTypeTips,
          [MEMORY_CARD_FRONT_COMPAT_KEY]: normalized.memoryCardFrontFields.join(','),
          [MEMORY_CARD_BACK_COMPAT_KEY]: normalized.memoryCardBackFields.join(','),
        },
      };
      apiRequest<{ settings: DisplaySettings }>('/api/study-state/settings', { method: 'PUT', token: authToken, body: compatibleSettings })
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

  function createCustomQuestionTypeTip(input: { section: QuestionTypeSection; title: string; description: string; tip: string }) {
    const now = new Date().toISOString();
    const id = createCustomQuestionTypeTipId(settings.customQuestionTypeTips);
    const nextEntry: CustomQuestionTypeTip = {
      id,
      section: input.section,
      title: input.title.trim().slice(0, 80),
      description: input.description.trim().slice(0, 200),
      tip: input.tip.trim().slice(0, 2000),
      createdAt: now,
      updatedAt: now,
    };
    updateSettings({ ...settings, customQuestionTypeTips: [...settings.customQuestionTypeTips, nextEntry] });
    return id;
  }

  function updateCustomQuestionTypeTip(id: string, input: { title: string; description: string; tip: string }) {
    const now = new Date().toISOString();
    const nextEntries = settings.customQuestionTypeTips.map((entry) => entry.id === id ? {
      ...entry,
      title: input.title.trim().slice(0, 80) || entry.title,
      description: input.description.trim().slice(0, 200),
      tip: input.tip.trim().slice(0, 2000),
      updatedAt: now,
    } : entry);
    updateSettings({ ...settings, customQuestionTypeTips: nextEntries });
  }

  function deleteCustomQuestionTypeTip(id: string) {
    updateSettings({
      ...settings,
      customQuestionTypeTips: settings.customQuestionTypeTips.filter((entry) => entry.id !== id),
    });
  }

  function applyStudyState(studyState: StudyState) {
    setAnswers(Object.fromEntries(Object.entries(studyState.answers ?? {}).filter(([id]) => !id.startsWith('memory-card:'))));
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
    setDailyPractices([]);
    setDailyPracticeDetails([]);
    setActiveDailyPractice(null);
    setActiveDraft(null);
    setListeningQuestions([]);
    setWordbooks(fallbackWordbooks);
  }

  async function refreshDailyPractices(selectId?: string) {
    if (!authToken) return;
    const list = await apiRequest<{ practices: DailyPracticeSummary[] }>('/api/daily-practices', { token: authToken });
    const nextPractices = list.practices ?? [];
    setDailyPractices(nextPractices);
    const nextDetails = await Promise.all(nextPractices.map(async (practice) => {
      const response = await apiRequest<{ practice: DailyPractice }>(`/api/daily-practices/${practice.id}`, { token: authToken });
      return response.practice;
    }));
    setDailyPracticeDetails(nextDetails);
    const nextId = selectId ?? activeDailyPractice?.id ?? nextPractices[0]?.id;
    const selectedPractice = nextDetails.find((practice) => practice.id === nextId) ?? nextDetails[0] ?? null;
    if (selectedPractice) {
      setActiveDailyPractice(selectedPractice);
    } else {
      setActiveDailyPractice(null);
    }
  }

  async function createDailyPracticeAndStart() {
    if (!authToken) return;
    try {
      const response = await apiRequest<{ practice: DailyPractice }>('/api/daily-practices', { method: 'POST', token: authToken, body: { minutes: 30 } });
      setActiveDailyPractice(response.practice);
      await refreshDailyPractices(response.practice.id);
      window.location.hash = routeHash('daily-practice', 'questions');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to create daily practice');
    }
  }

  async function openDailyPractice(id?: string) {
    if (!authToken) return;
    const todayPractice = activeDailyPractice?.date === todayDateKey()
      ? activeDailyPractice
      : dailyPractices.find((practice) => practice.date === todayDateKey());
    const practiceId = id ?? todayPractice?.id;
    if (!practiceId) {
      await createDailyPracticeAndStart();
      return;
    }
    try {
      const response = await apiRequest<{ practice: DailyPractice }>(`/api/daily-practices/${practiceId}`, { token: authToken });
      setActiveDailyPractice(response.practice);
      window.location.hash = routeHash('daily-practice', 'questions');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to open daily practice');
    }
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

  async function removeDraft(id: string) {
    if (!authToken) return;
    try {
      await apiRequest(`/api/drafts/${id}`, { method: 'DELETE', token: authToken });
      const list = await apiRequest<{ drafts: DraftSummary[] }>('/api/drafts', { token: authToken });
      const nextDrafts = list.drafts ?? [];
      setDrafts(nextDrafts);
      setDraftAnnotation('');
      if (activeDraft?.id === id) {
        const nextId = nextDrafts.find((draft) => draft.id !== id)?.id;
        if (nextId) {
          const response = await apiRequest<{ draft: ReviewPackDraft }>(`/api/drafts/${nextId}`, { token: authToken });
          setActiveDraft(response.draft);
        } else {
          setActiveDraft(null);
        }
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to delete draft');
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

  async function publishDraftAsDailyPractice(id: string) {
    if (!authToken) return;
    try {
      const response = await apiRequest<{ practice: DailyPractice }>(`/api/drafts/${id}/publish-daily-practice`, {
        method: 'POST',
        token: authToken,
        body: { date: todayDateKey() },
      });
      setActiveDailyPractice(response.practice);
      await Promise.all([refreshDailyPractices(response.practice.id), refreshDrafts(id)]);
      window.location.hash = routeHash('daily-practice', 'questions');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : labels.publishDraftFailed);
    }
  }

  async function createDraftFromSelection(ids: string[]) {
    if (!authToken || !ids.length) return null;
    try {
      const selectedDrafts = await Promise.all(ids.map(async (id) => {
        const response = await apiRequest<{ draft: ReviewPackDraft }>(`/api/drafts/${id}`, { token: authToken });
        return response.draft;
      }));
      const createdAt = new Date().toISOString();
      const response = await apiRequest<{ draft: ReviewPackDraft }>('/api/drafts', {
        method: 'POST',
        token: authToken,
        body: {
          title: `${labels.organizedDraftTitle} ${new Intl.DateTimeFormat(locale).format(new Date())}`,
          content: {
            kind: 'organized_review_pack',
            generated_at: createdAt,
            source_draft_ids: ids,
            sections: [
              {
                title: labels.organizedDraftSourceSection,
                body: labels.organizedDraftSourceBody,
                items: selectedDrafts.map((draft) => ({ id: draft.id, title: draft.title, status: draft.status, updated_at: draft.updated_at })),
              },
            ],
            source_drafts: selectedDrafts.map((draft) => ({
              id: draft.id,
              title: draft.title,
              content: draft.content,
              annotations: draft.annotations,
            })),
          },
        },
      });
      setActiveDraft(response.draft);
      setDraftAnnotation('');
      await refreshDrafts(response.draft.id);
      setActiveDraftDetailId(response.draft.id);
      return response.draft.id;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to organize selected drafts');
      return null;
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

  async function updateDraft(id: string, input: { title: string; content: unknown }) {
    if (!authToken) return;
    try {
      const response = await apiRequest<{ draft: ReviewPackDraft }>(`/api/drafts/${id}`, {
        method: 'PATCH',
        token: authToken,
        body: input,
      });
      setActiveDraft(response.draft);
      setDraftAnnotation('');
      await refreshDrafts(response.draft.id);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to update draft');
      throw error;
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

  async function confirmDraftForAgent(id: string, input: { unknownWords: string }) {
    if (!authToken) return;
    try {
      const context = await apiRequest<{ agent_message?: string }>(`/api/drafts/${id}/confirm`, {
        method: 'POST',
        token: authToken,
        body: input,
      });
      if (context.agent_message) {
        await navigator.clipboard.writeText(context.agent_message);
      }
      await refreshDrafts(id);
      setAuthError(labels.draftAgentPromptCopied);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to confirm draft');
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

  async function createReadingQuestion(input: ReadingQuestionInput) {
    if (!authToken) return;
    const response = await apiRequest<{ question: ReadingQuestion }>('/api/reading-questions', {
      method: 'POST',
      token: authToken,
      body: input,
    });
    setReadingQuestions((current) => [response.question, ...current]);
  }

  async function removeReadingQuestion(id: string) {
    if (!authToken) return;
    await apiRequest(`/api/reading-questions/${id}`, { method: 'DELETE', token: authToken });
    setReadingQuestions((current) => current.filter((question) => question.id !== id));
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

  async function rateMemoryItem(item: VocabItem, rating: MemoryRating) {
    const now = new Date();
    const current = progress[item.id] ?? { correct: 0, wrong: 0, status: 'new' as const };
    const intervals: Record<MemoryRating, number> = { forgot: 0, hard: 1, remembered: 3, easy: 7 };
    const easeDelta: Record<MemoryRating, number> = { forgot: -0.2, hard: -0.05, remembered: 0.05, easy: 0.15 };
    const nextDate = new Date(now);
    if (rating === 'forgot') nextDate.setMinutes(nextDate.getMinutes() + 10);
    else nextDate.setDate(nextDate.getDate() + intervals[rating]);
    const nextEntry: ProgressEntry = {
      ...current,
      correct: current.correct + (rating === 'forgot' ? 0 : 1),
      wrong: current.wrong + (rating === 'forgot' ? 1 : 0),
      status: rating === 'forgot' ? 'learning' : (current.reviewCount ?? 0) >= 4 ? 'mastered' : 'review',
      firstSeenAt: current.firstSeenAt ?? now.toISOString(),
      lastReviewedAt: now.toISOString(),
      reviewCount: (current.reviewCount ?? 0) + 1,
      ease: Math.max(1.3, Math.min(3, (current.ease ?? 2.5) + easeDelta[rating])),
      intervalDays: intervals[rating],
      nextReviewAt: nextDate.toISOString(),
    };
    setProgress((state) => ({ ...state, [item.id]: nextEntry }));
    if (authToken) {
      const nextState = await apiRequest<StudyState>('/api/answers', {
        method: 'POST', token: authToken,
        body: { questionId: `memory-card:${item.id}`, itemId: item.id, selected: rating, correct: rating !== 'forgot', progressEntry: nextEntry },
      });
      applyStudyState(nextState);
    }
  }

  async function createCapture(input: { body: string; category: LearningCaptureCategory; context?: string; targetDeck?: Deck; targetWordbookId?: string }) {
    if (!authToken) return;
    const response = await apiRequest<{ capture: LearningCapture }>('/api/captures', { method: 'POST', token: authToken, body: input });
    setCaptures((current) => [response.capture, ...current]);
  }

  async function createWordbook(title: string) {
    if (!authToken) return null;
    const response = await apiRequest<{ wordbook: Wordbook }>('/api/wordbooks', {
      method: 'POST',
      token: authToken,
      body: { title, deck: 'n1_vocab' },
    });
    setWordbooks((current) => normalizeWordbooks([...current.filter((wordbook) => wordbook.id !== response.wordbook.id), response.wordbook]));
    return response.wordbook;
  }

  async function renameWordbook(id: string, title: string) {
    if (!authToken) return null;
    const response = await apiRequest<{ wordbook: Wordbook }>(`/api/wordbooks/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      token: authToken,
      body: { title },
    });
    setWordbooks((current) => normalizeWordbooks(current.map((wordbook) => wordbook.id === response.wordbook.id ? response.wordbook : wordbook)));
    return response.wordbook;
  }

  async function updateCaptureStatus(id: string, status: LearningCaptureStatus) {
    if (!authToken) return;
    const response = await apiRequest<{ capture: LearningCapture }>(`/api/captures/${id}`, { method: 'PATCH', token: authToken, body: { status } });
    setCaptures((current) => current.map((capture) => capture.id === id ? response.capture : capture));
  }

  function openPendingCaptures() {
    setDataTab('captures');
    navigateTo('insights');
  }

  if (authLoading && !user) return <LoadingScreen />;
  if (!user) return <LoginScreen error={authError} loading={authLoading} onSubmit={handleAuth} />;
  if (activeView === 'memory-review') return <FocusedMemoryReview items={memoryReviewItems} locale={locale} frontFields={settings.memoryCardFrontFields} backFields={settings.memoryCardBackFields} onExit={() => navigateTo('home')} onRate={rateMemoryItem} />;

  const captureDetailOpen = isDataManagementView(activeView) && dataTab === 'captures' && Boolean(activeCaptureDetailId);
  const draftDetailOpen = isDataManagementView(activeView) && dataTab === 'drafts' && Boolean(activeDraftDetailId);
  const attemptDetailOpen = isDataManagementView(activeView) && dataTab === 'practice' && Boolean(activeAttemptDetailId);
  const questionDetailOpen = attemptDetailOpen && attemptQuestionDetailOpen;
  const dataDetailOpen = captureDetailOpen || draftDetailOpen || attemptDetailOpen;
  const showMobileBackHeader = !isMobileTabRoute(route) || dataDetailOpen;
  const mobileBackRouteValue = mobileBackRoute(route);
  const desktopBackRouteValue = desktopBackRoute(route);
  const defaultDataTab = dataTabForRoute(activeView);
  const dataManagementBackAction = dataDetailOpen
    ? () => {
        if (questionDetailOpen) {
          setAttemptQuestionDetailOpen(false);
          return;
        }
        setActiveCaptureDetailId(null);
        setActiveDraftDetailId(null);
        setActiveAttemptDetailId(null);
      }
    : isDataManagementView(activeView) && dataTab !== defaultDataTab
      ? () => setDataTab(defaultDataTab)
      : undefined;
  const dataManagementBackLabel = questionDetailOpen ? labels.historyBackToAttemptQuestions : captureDetailOpen ? labels.historyBackToCaptures : draftDetailOpen ? labels.draftBackToList : attemptDetailOpen ? labels.historyBackToAttempts : dataTabLabel(dataTab, labels);
  const mobileStudyModeLabel = studyPage === 'tips'
    ? labels.navQuestionTypes
    : studyPage === 'words'
      ? libraryPageLabel
      : studyPage === 'review'
        ? labels.reviewPage
        : labels.questionPage;
  const selectedMobileWordbook = wordbooks.find((wordbook) => wordbook.id === selectedWordbookId && wordbook.deck !== 'grammar_expression');
  const studyItemDetailOpen = studyPage === 'words' && Boolean(route.itemId);
  const mobileFilterLabel = selectedWordbookId !== 'all' && selectedMobileWordbook
    ? selectedMobileWordbook.title
    : deckLabels[selectedDeck];
  const showMobileStudyFilter = hasStudyControls && activeView === 'vocabulary' && !studyItemDetailOpen;
  const mobileHeaderBackLabel = questionDetailOpen
    ? labels.historyBackToAttemptQuestions
    : studyItemDetailOpen
      ? labels.backToEntryList
      : route.view === 'vocabulary' && route.page === 'wordbooks'
        ? labels.backToEntryList
      : dataDetailOpen
        ? dataManagementBackLabel
        : labels.navHome;

  return (
    <main className="cute-shell flex min-h-[100dvh] max-w-full flex-col overflow-x-hidden text-[#28312d]">
      <MobileAppHeader
        title={mobileAppTitle(route, labels, isDataManagementView(activeView) ? dataTab : undefined, {
          capture: captureDetailOpen,
          draft: draftDetailOpen,
          attempt: attemptDetailOpen,
          question: questionDetailOpen,
        })}
        backLabel={mobileHeaderBackLabel}
        showBack={showMobileBackHeader}
        navOpen={mobileSidebarOpen}
        navLabel={labels.mobileMenu}
        navCloseLabel={labels.mobileClose}
        onNavToggle={() => setMobileSidebarOpen((value) => !value)}
        onBack={() => {
          if (dataManagementBackAction) {
            dataManagementBackAction();
            return;
          }
          window.location.hash = routeHash(mobileBackRouteValue.view, mobileBackRouteValue.page, mobileBackRouteValue.itemId);
        }}
        actionLabel={route.view === 'settings' ? labels.logout : undefined}
        onAction={route.view === 'settings' ? handleLogout : undefined}
        studyActionLabel={hasStudyControls && !studyItemDetailOpen ? mobileStudyModeLabel : undefined}
        studyActionAriaLabel={hasStudyControls && !studyItemDetailOpen ? labels.mobileSwitchTask : undefined}
        onStudyAction={hasStudyControls && !studyItemDetailOpen ? () => setMobileStudyPanel('task') : undefined}
        filterActionLabel={showMobileStudyFilter ? mobileFilterLabel : undefined}
        filterActionAriaLabel={showMobileStudyFilter ? `${labels.filters}: ${deckLabels[selectedDeck]}; ${labels.wordbookFilter}: ${selectedMobileWordbook ? selectedMobileWordbook.title : labels.wordbookAll}` : undefined}
        onFilterAction={showMobileStudyFilter ? () => setMobileStudyPanel('filter') : undefined}
      />
      <div className="app-frame flex min-w-0 flex-1 md:items-stretch">
        <DesktopSidebarNavigation
          brand="JLPT N1"
          items={desktopSidebarNavItems(labels)}
          route={route}
          labels={labels}
          username={user.username}
          collapsed={desktopSidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          onNavigate={navigateTo}
          onSettings={() => navigateTo('settings')}
          onLogout={handleLogout}
          onToggle={() => setDesktopSidebarCollapsed((value) => !value)}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        <div className="app-content flex min-w-0 flex-1 flex-col">
          <div className="hidden border-b border-[#f0d4dd] bg-white/70 px-4 py-3 md:block">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-5">
              <DesktopLocationBar
                route={route}
                labels={labels}
                backRoute={desktopBackRouteValue}
                backLabel={dataManagementBackLabel}
                backAction={dataManagementBackAction}
                activeDataTab={isDataManagementView(activeView) ? dataTab : undefined}
                activeDraftTitle={draftDetailOpen ? activeDraft?.title : undefined}
                onNavigate={(nextRoute) => {
                  window.location.hash = routeHash(nextRoute.view, nextRoute.page, nextRoute.itemId);
                }}
              />
              <div className="ledger-top-status"><span><i />MCP 连接正常</span><button type="button" onClick={() => navigateTo('captures')}>待处理 {captures.filter((capture) => capture.status === 'inbox').length}</button></div>
              <GlobalSearch
                query={searchQuery}
                results={searchResults}
                labels={labels}
                onQueryChange={setSearchQuery}
                onOpenResult={openSearchResult}
              />
            </div>
          </div>

          {authError ? (
            <div className="mx-auto mt-3 w-full max-w-7xl px-4 md:px-8 lg:px-10">
              <p className="rounded-2xl border border-[#f0cf80] bg-[#fff8df] p-3 text-sm font-semibold text-[#775516]">{authError}</p>
            </div>
          ) : null}

          {activeView === 'home' ? (
            <HomeDashboard
              labels={labels}
              locale={locale}
              countdown={countdown}
              metrics={[
                { label: labels.insightsPending, value: captures.filter((capture) => capture.status === 'inbox').length.toString() },
                { label: labels.dueReview, value: memoryReviewItems.length.toString() },
                { label: labels.answered, value: answeredCount.toString() },
                { label: labels.correct, value: correctCount.toString() },
                { label: labels.mastered, value: masteredCount.toString() },
              ]}
              modules={moduleStats}
              plan={studyPlan}
              dailyPractice={(activeDailyPractice?.date === todayDateKey() ? activeDailyPractice : dailyPractices.find((practice) => practice.date === todayDateKey())) ?? null}
              dailyPractices={dailyPractices}
              onNavigate={navigateTo}
              onStartDailyPractice={openDailyPractice}
              onCreateDailyPractice={createDailyPracticeAndStart}
              onStartMock={() => openMockExam()}
              onStartMemoryReview={() => navigateTo('memory-review')}
              onTaskStatus={updateStudyPlanTask}
            />
          ) : null}

          {activeView !== 'home' ? (
            <section className={`mx-auto w-full min-w-0 flex-1 ${hasStudyControls ? 'max-w-6xl px-0 py-0 md:px-8 md:py-5 lg:px-10' : 'max-w-7xl px-4 py-4 md:px-8 md:py-5 lg:px-10'}`}>
          <div className={hasStudyControls || activeView === 'listening' ? 'min-w-0 space-y-5' : 'min-w-0'}>
            {activeView === 'capture' ? <CapturePanel labels={labels} deckLabels={deckLabels} wordbooks={wordbooks} onSave={createCapture} onCreateWordbook={createWordbook} onOpenHistory={() => navigateTo('insights')} /> : null}
            {activeView === 'history' || activeView === 'insights' || activeView === 'captures' || activeView === 'drafts' ? (
              <DataManagementPanel
                key={activeView}
                labels={labels}
                locale={locale}
                captures={captures}
                attempts={attemptHistory}
                questions={historyQuestions}
                draftsContent={<DraftsPanel embedded labels={labels} drafts={drafts} activeDraft={activeDraft} annotation={draftAnnotation} onAnnotationChange={setDraftAnnotation} onCreateDailyDraft={createDailyDraft} onSelectDraft={selectDraft} onSaveAnnotation={saveDraftAnnotation} onCopyRevisionContext={copyDraftRevisionContext} onCreateDraftFromSelection={createDraftFromSelection} onDeleteDraft={removeDraft} onConfirmDraft={confirmDraftForAgent} onPublishDraft={publishDraftAsDailyPractice} onUpdateDraft={updateDraft} detailDraftId={activeDraftDetailId} onDetailDraftChange={setActiveDraftDetailId} />}
                settingsContent={<SettingsView labels={labels} settings={settings} username={user.username} onLogout={handleLogout} onUpdateSettings={updateSettings} />}
                activeTab={dataTab}
                activeCaptureId={activeCaptureDetailId}
                onActiveCaptureChange={setActiveCaptureDetailId}
                activeAttemptId={activeAttemptDetailId}
                onActiveAttemptChange={(id) => {
                  setActiveAttemptDetailId(id);
                  setAttemptQuestionDetailOpen(false);
                }}
                attemptQuestionDetailOpen={attemptQuestionDetailOpen}
                onAttemptQuestionDetailChange={setAttemptQuestionDetailOpen}
                onCaptureStatus={updateCaptureStatus}
              />
            ) : null}
            {activeView === 'mistakes' || activeView === 'memory' || activeView === 'data' || activeView === 'mcp' ? <RecordsOverview view={activeView} items={data.items} progress={progress} attempts={attemptHistory} questions={historyQuestions} locale={locale} onOpenMemoryReview={() => navigateTo('memory-review')} onOpenSettings={() => navigateTo('settings')} /> : null}
            {hasStudyControls ? (
              <MobileStudyControls
                mode={studyPage}
                labels={labels}
                deckLabels={deckLabels}
                selectedDeck={selectedDeck}
                wordbooks={wordbooks}
                selectedWordbookId={selectedWordbookId}
                allowDeckFilter={activeView === 'vocabulary'}
                allowWordbookFilter={activeView === 'vocabulary'}
                allowWords={hasLibraryPage}
                wordsLabel={libraryPageLabel}
                panel={mobileStudyPanel}
                onPanelChange={setMobileStudyPanel}
                onModeChange={(page) => navigateTo(activeView, page)}
                onDeckChange={setSelectedDeck}
                onWordbookChange={setSelectedWordbookId}
              />
            ) : null}
            {activeView === 'about' ? (
              <AboutPanel
                labels={labels}
                user={user}
                activeSection={route.itemId}
                onBack={() => navigateTo('about')}
                onOpen={(section) => { window.location.hash = routeHash('about', 'questions', section); }}
              />
            ) : null}
            {activeView === 'plan' ? (
              <StudyPlanPanel
                labels={labels}
                locale={locale}
                plan={studyPlan}
                drafts={drafts}
                captures={captures}
                attempts={attemptHistory}
                listeningQuestions={listeningQuestions}
                readingQuestions={readingQuestions}
                onSaveProfile={saveStudyPlanProfile}
                onTaskStatus={updateStudyPlanTask}
              />
            ) : null}
            {activeView === 'mock-exams' ? (
              route.itemId ? <MockExamPanel key={route.itemId} examId={route.itemId} locale={locale} onBack={() => openMockExam()} /> : <MockExamCatalog locale={locale} onOpen={openMockExam} />
            ) : null}
            {activeView === 'question-types' ? (
              route.itemId ? (
                <QuestionTypeDetail id={route.itemId} labels={labels} locale={locale} customTip={settings.questionTypeTips[route.itemId]} customTipEntry={settings.customQuestionTypeTips.find((entry) => entry.id === route.itemId)} onBack={() => navigateTo('question-types')} onUpdateTip={updateQuestionTypeTip} onUpdateCustomTip={updateCustomQuestionTypeTip} onDeleteCustomTip={deleteCustomQuestionTypeTip} />
              ) : (
                <QuestionTypeGuide labels={labels} locale={locale} customTips={settings.questionTypeTips} customTipEntries={settings.customQuestionTypeTips} onOpen={openQuestionType} onCreateCustomTip={createCustomQuestionTypeTip} />
              )
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
                token={authToken}
                onOpen={(id) => openOfficialSamples(activeView, id)}
                onBack={() => openOfficialSamples(activeView)}
              />
            ) : null}
            {activeView === 'mixed' && studyPage === 'tips' ? (
              <MixedPracticeHub
                labels={labels}
                questions={questions}
                items={data.items}
	                progress={progress}
	                latestAttempt={reviewAttempt}
	                modules={moduleStats}
	                captures={captures}
	                drafts={drafts}
	                listeningQuestions={listeningQuestions}
	                readingQuestions={readingQuestions}
	                studyPlan={studyPlan}
	                answeredCount={answeredCount}
	                correctCount={correctCount}
	                onStart={() => navigateTo('mixed', 'questions')}
	                onStartMock={() => openMockExam()}
	                onOpenAllEntries={() => navigateTo('mixed', 'words')}
	                onReview={() => navigateTo('mixed', 'review')}
	                onNavigate={navigateTo}
	              />
	            ) : null}
	            {activeView === 'mixed' && studyPage === 'words' ? (
	              <MixedEntryIndexPanel
	                labels={labels}
	                locale={locale}
	                items={data.items}
	                listeningQuestions={listeningQuestions}
	                readingQuestions={readingQuestions}
	                onOpenModule={(view) => navigateTo(view, 'words')}
	              />
	            ) : null}
            {activeView === 'mixed' && studyPage === 'mock' ? (
              <MockExamPanel examId="n1-ai-demo-001" locale={locale} onBack={() => openMockExam()} />
            ) : null}
            {studyPage === 'tips' && route.itemId ? (
              <QuestionTypeDetail id={route.itemId} labels={labels} locale={locale} customTip={settings.questionTypeTips[route.itemId]} customTipEntry={settings.customQuestionTypeTips.find((entry) => entry.id === route.itemId)} onBack={() => navigateTo(activeView, 'tips')} onUpdateTip={updateQuestionTypeTip} onUpdateCustomTip={updateCustomQuestionTypeTip} onDeleteCustomTip={deleteCustomQuestionTypeTip} />
            ) : studyPage === 'tips' && supportsStudyPage(activeView) && activeView !== 'mixed' ? (
              <QuestionTypeGuide labels={labels} locale={locale} customTips={settings.questionTypeTips} customTipEntries={settings.customQuestionTypeTips} section={questionTypeSectionFor(activeView)} onOpen={(id) => { window.location.hash = routeHash(activeView, 'tips', id); }} onCreateCustomTip={createCustomQuestionTypeTip} />
            ) : null}
            {activeView === 'listening' && studyPage === 'questions' ? (
              <ListeningPanel
                mode="practice"
                labels={labels}
                locale={locale}
                token={authToken}
                questions={listeningQuestions}
                onCreate={createListeningQuestion}
                onDelete={removeListeningQuestion}
                onOpenLibrary={() => navigateTo('listening', 'words')}
                onPractice={() => navigateTo('listening', 'questions')}
                onTips={() => navigateTo('listening', 'tips')}
                onReview={() => navigateTo('listening', 'review')}
              />
            ) : null}
            {activeView === 'listening' && studyPage === 'words' ? (
              <ListeningPanel
                mode="library"
                labels={labels}
                locale={locale}
                token={authToken}
                questions={listeningQuestions}
                onCreate={createListeningQuestion}
                onDelete={removeListeningQuestion}
                onPractice={() => navigateTo('listening', 'questions')}
                onTips={() => navigateTo('listening', 'tips')}
                onReview={() => navigateTo('listening', 'review')}
                activeQuestionId={route.itemId}
                onOpenQuestion={(id) => { window.location.hash = routeHash('listening', 'words', id); }}
                onBackToLibrary={() => navigateTo('listening', 'words')}
              />
            ) : null}
            {activeView === 'reading' && studyPage === 'questions' ? (
              <ReadingPanel
                mode="practice"
                labels={labels}
                locale={locale}
                questions={readingQuestions}
                onCreate={createReadingQuestion}
                onDelete={removeReadingQuestion}
                onOpenLibrary={() => navigateTo('reading', 'words')}
                onPractice={() => navigateTo('reading', 'questions')}
                onTips={() => navigateTo('reading', 'tips')}
                onReview={() => navigateTo('reading', 'review')}
              />
            ) : null}
            {activeView === 'reading' && studyPage === 'words' ? (
              <ReadingPanel
                mode="library"
                labels={labels}
                locale={locale}
                questions={readingQuestions}
                onCreate={createReadingQuestion}
                onDelete={removeReadingQuestion}
                onPractice={() => navigateTo('reading', 'questions')}
                onTips={() => navigateTo('reading', 'tips')}
                onReview={() => navigateTo('reading', 'review')}
              />
            ) : null}
	            {studyPage !== 'samples' && studyPage !== 'tips' && studyPage !== 'mock' && !(activeView === 'mixed' && studyPage === 'words') && activeView !== 'capture' && activeView !== 'captures' && activeView !== 'history' && activeView !== 'insights' && activeView !== 'mistakes' && activeView !== 'memory' && activeView !== 'data' && activeView !== 'mcp' && activeView !== 'about' && activeView !== 'plan' && activeView !== 'question-types' && activeView !== 'mock-exams' && activeView !== 'drafts' && activeView !== 'settings' && activeView !== 'listening' && activeView !== 'reading' ? (
              studyPage === 'questions' ? (
                <PracticePanel
                  activeQuestion={activeQuestion}
                  questions={questions}
                  questionsLength={questions.length}
                  activeIndex={activeIndex}
                  answeredCount={practiceAnsweredCount}
                  complete={practiceComplete}
                  feedbackMode={effectiveFeedbackMode}
                  answers={answers}
                  items={data.items}
                  labels={labels}
                  questionTypeLabel={activeView === 'daily-practice' ? labels.dailyPracticeTitle : labels.meaningTypeTitle}
                  settings={settings}
                  onAnswer={answerQuestion}
                  onPrev={() => setActiveIndex((index) => Math.max(index - 1, 0))}
                  onNext={() => setActiveIndex((index) => nextPracticeIndex(index, questions, answers))}
                  onJump={(index) => setActiveIndex(index)}
                  onRestart={restartPractice}
                  onPracticeHome={() => navigateTo('mixed', 'tips')}
                  onPrepareReview={() => submitPracticeReview(false)}
                  onReview={() => navigateTo(activeView, 'review')}
                  analysisStatus={activeAttempt?.analysisStatus ?? reviewAttempt?.analysisStatus ?? 'idle'}
                />
              ) : studyPage === 'wordbooks' && activeView === 'vocabulary' ? (
                <WordbookManagerPanel
                  labels={labels}
                  wordbooks={wordbooks}
                  onRenameWordbook={renameWordbook}
                  onBack={() => navigateTo(activeView, 'words')}
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
                  deckLabels={deckLabels}
                  wordbooks={wordbooks}
                  selectedWordbookId={selectedWordbookId}
                  onWordbookChange={setSelectedWordbookId}
                  onOpen={(id) => { window.location.hash = routeHash(activeView, 'words', id); }}
                  onPractice={() => navigateTo(activeView, 'questions')}
                  onTips={() => navigateTo(activeView, 'tips')}
                  onReview={() => navigateTo(activeView, 'review')}
                  captureCategory={activeView === 'vocabulary' ? 'word' : activeView === 'grammar' ? 'grammar' : undefined}
                  defaultTargetDeck={selectedDeck === 'name_reading' ? 'name_reading' : activeView === 'grammar' ? 'grammar_expression' : 'n1_vocab'}
                  pendingCaptureCount={captures.filter((capture) => capture.status === 'inbox' && capture.category === (activeView === 'grammar' ? 'grammar' : 'word')).length}
                  onOpenPendingCaptures={openPendingCaptures}
                  onSaveCapture={createCapture}
                  onCreateWordbook={createWordbook}
                  onManageWordbooks={() => navigateTo(activeView, 'wordbooks')}
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

          <footer className="mt-auto hidden border-t border-[#f0d4dd] bg-white/70 md:block">
            <div className="mx-auto flex max-w-7xl min-w-0 flex-col gap-2 px-5 py-5 text-sm text-[#6b5a61] md:flex-row md:items-center md:justify-between md:px-8 lg:px-10">
              <p>© 2026 Itsuki. All rights reserved.</p>
              <div className="flex flex-wrap gap-4">
                <a className="font-semibold text-[#a84269] hover:underline" href="https://x.com/itsuki_maer" target="_blank" rel="noreferrer">
                  X @itsuki_maer
                </a>
                <a className="font-semibold text-[#a84269] hover:underline" href="mailto:jlpt@erzhiqian.cc">
                  jlpt@erzhiqian.cc
                </a>
                <a className="font-semibold text-[#a84269] hover:underline" href="https://github.com/erzhiqianyi/jlpt-master-deck" target="_blank" rel="noreferrer">
                  GitHub
                </a>
              </div>
            </div>
          </footer>
        </div>
      </div>

    </main>
  );
}

function routeFromHash(hash: string): AppRoute {
  const [viewValue, pageValue, itemValue] = hash.replace(/^#\/?/, '').split('/');
  const view = isAppView(viewValue) ? viewValue : 'home';
  if (view === 'question-types') {
    return { view, page: 'questions', itemId: pageValue ? decodeURIComponent(pageValue) : undefined };
  }
  if (view === 'mock-exams') {
    return { view, page: 'questions', itemId: pageValue ? decodeURIComponent(pageValue) : undefined };
  }
  if (view === 'about') {
    return { view, page: 'questions', itemId: pageValue ? decodeURIComponent(pageValue) : undefined };
  }
  if (isOfficialSampleModule(view) && pageValue === 'samples') {
    return { view, page: 'samples', itemId: itemValue ? decodeURIComponent(itemValue) : undefined };
  }
  if (view === 'mixed') {
    const page = pageValue === 'questions' || pageValue === 'review' || pageValue === 'mock' || pageValue === 'words' ? pageValue : 'tips';
    const itemId = page === 'words' && itemValue ? decodeURIComponent(itemValue) : undefined;
    return { view, page, itemId };
  }
  if (view === 'daily-practice') {
    const page = pageValue === 'review' ? 'review' : 'questions';
    return { view, page };
  }
  if (supportsStudyPage(view) && !pageValue) {
    return { view, page: 'tips' };
  }
  const page = pageValue === 'tips' || pageValue === 'words' || pageValue === 'wordbooks' || pageValue === 'review' ? pageValue : 'questions';
  const itemId = (page === 'tips' || page === 'words') && itemValue ? decodeURIComponent(itemValue) : undefined;
  return { view, page: supportsStudyPage(view) && (page !== 'wordbooks' || view === 'vocabulary') ? page : 'questions', itemId };
}

function routeHash(view: AppView, page: StudyPage, itemId?: string) {
  if (view === 'question-types') {
    return itemId ? `#/question-types/${encodeURIComponent(itemId)}` : '#/question-types';
  }
  if (view === 'mock-exams') {
    return itemId ? `#/mock-exams/${encodeURIComponent(itemId)}` : '#/mock-exams';
  }
  if (view === 'about') {
    return itemId ? `#/about/${encodeURIComponent(itemId)}` : '#/about';
  }
  if (isOfficialSampleModule(view) && page === 'samples') {
    return itemId ? `#/${view}/samples/${encodeURIComponent(itemId)}` : `#/${view}/samples`;
  }
  if (!supportsStudyPage(view)) {
    return `#/${view}`;
  }
  return itemId && (page === 'tips' || page === 'words') ? `#/${view}/${page}/${encodeURIComponent(itemId)}` : `#/${view}/${page}`;
}

function supportsStudyPage(view: AppView) {
  return view === 'vocabulary' || view === 'grammar' || view === 'mixed' || view === 'daily-practice' || view === 'reading' || view === 'listening';
}

function questionTypeSectionFor(view: AppView) {
  if (view === 'vocabulary') return 'vocabulary' as const;
  if (view === 'grammar') return 'grammar' as const;
  if (view === 'reading') return 'reading' as const;
  if (view === 'listening') return 'listening' as const;
  return undefined;
}

function isOfficialSampleModule(view: AppView): view is OfficialSampleModule {
  return view === 'grammar' || view === 'reading' || view === 'listening';
}

function isAppView(value: string): value is AppView {
  return ['capture', 'captures', 'home', 'memory-review', 'history', 'mistakes', 'memory', 'data', 'mcp', 'insights', 'plan', 'question-types', 'vocabulary', 'grammar', 'listening', 'reading', 'mixed', 'daily-practice', 'mock-exams', 'drafts', 'about', 'settings'].includes(value);
}

function nextIndex(index: number, total: number) {
  return total ? (index + 1) % total : 0;
}

function previousIndex(index: number, total: number) {
  return total ? (index - 1 + total) % total : 0;
}

function shuffledBySeed<T>(items: T[], seed: number) {
  const result = [...items];
  let state = Math.max(1, Math.floor(seed * 2_147_483_647));
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (state * 48_271) % 2_147_483_647;
    const swapIndex = state % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
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

function uniqueById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function todayDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function createPracticeAttempt(view: AppView, deck: Deck | 'all', questions: Question[], now: Date): PracticeAttempt {
  return {
    id: `attempt-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    startedAt: now.toISOString(),
    analysisStatus: 'idle',
    view,
    deck,
    questionIds: questions.map((question) => question.id),
    answers: [],
  };
}

function currentAttemptFor(
  attempt: PracticeAttempt | null,
  history: PracticeAttempt[],
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
  if (sameQuestionSet) return attempt;
  const resumable = history.find((candidate) => (
    !candidate.completedAt
    && candidate.view === view
    && candidate.deck === deck
    && candidate.questionIds.length === questionIds.length
    && candidate.questionIds.every((id, index) => id === questionIds[index])
  ));
  return resumable ?? createPracticeAttempt(view, deck, questions, now);
}

function attemptForReviewSubmission(
  activeAttempt: PracticeAttempt | null,
  history: PracticeAttempt[],
  answers: AnswerState,
  view: AppView,
  deck: Deck | 'all',
  questions: Question[],
  now: Date,
) {
  const answerAttemptIds = new Set(questions.map((question) => answers[question.id]?.attemptId).filter(Boolean));
  const recorded = history.find((attempt) => answerAttemptIds.has(attempt.id));
  if (recorded) return recorded;
  const questionIds = questions.map((question) => question.id);
  const matchingCompletedAttempt = history.find((attempt) => (
    Boolean(attempt.completedAt)
    && attempt.view === view
    && attempt.deck === deck
    && attempt.questionIds.length === questionIds.length
    && attempt.questionIds.every((id, index) => id === questionIds[index])
    && questions.every((question) => {
      const stored = answers[question.id];
      const attemptAnswer = attempt.answers.find((answer) => answer.questionId === question.id);
      return Boolean(stored && attemptAnswer && stored.selected === attemptAnswer.selected && stored.correct === attemptAnswer.correct);
    })
  ));
  return matchingCompletedAttempt ?? currentAttemptFor(activeAttempt, history, view, deck, questions, now);
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

function progressAfterAttempt(progress: ProgressState, answers: AnswerState, questions: Question[], now: Date): ProgressState {
  return questions.reduce<ProgressState>((nextProgress, question) => {
    const answer = answers[question.id];
    if (!answer) {
      return nextProgress;
    }
    const current = nextProgress[question.itemId] ?? { correct: 0, wrong: 0, status: 'new' as const };
    const nextCorrect = current.correct + (answer.correct ? 1 : 0);
    const nextWrong = current.wrong + (answer.correct ? 0 : 1);
    const schedule = nextSchedule(current, answer.correct, now);
    return {
      ...nextProgress,
      [question.itemId]: {
        ...current,
        correct: nextCorrect,
        wrong: nextWrong,
        status: nextStatus(nextCorrect, nextWrong, schedule.reviewCount),
        ...schedule,
      },
    };
  }, { ...progress });
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
  const rawQuestionTypeTips = value?.questionTypeTips && typeof value.questionTypeTips === 'object' ? value.questionTypeTips : {};
  const questionTypeTips = Object.fromEntries(Object.entries(rawQuestionTypeTips).filter(([key]) => key !== MEMORY_CARD_FRONT_COMPAT_KEY && key !== MEMORY_CARD_BACK_COMPAT_KEY));
  return {
    ...defaultSettings,
    ...(value ?? {}),
    locale: normalizeLocale(value?.locale),
    fontSize: value?.fontSize === 'small' || value?.fontSize === 'large' ? value.fontSize : defaultSettings.fontSize,
    memoryCardFrontFields: normalizeMemoryCardFields(value?.memoryCardFrontFields ?? compatibilityMemoryCardFields(rawQuestionTypeTips[MEMORY_CARD_FRONT_COMPAT_KEY]), defaultMemoryCardFrontFields),
    memoryCardBackFields: normalizeMemoryCardFields(value?.memoryCardBackFields ?? compatibilityMemoryCardFields(rawQuestionTypeTips[MEMORY_CARD_BACK_COMPAT_KEY]), defaultMemoryCardBackFields),
    questionTypeTips,
    customQuestionTypeTips: normalizeCustomQuestionTypeTips(value?.customQuestionTypeTips),
  };
}

function compatibilityMemoryCardFields(value: unknown) {
  return typeof value === 'string' ? value.split(',').filter(Boolean) : undefined;
}

function normalizeCustomQuestionTypeTips(value: unknown): CustomQuestionTypeTip[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is Partial<CustomQuestionTypeTip> => Boolean(item) && typeof item === 'object')
    .map((item, index) => {
      const section = item.section === 'vocabulary' || item.section === 'grammar' || item.section === 'reading' || item.section === 'listening' ? item.section : 'vocabulary';
      const id = typeof item.id === 'string' && /^custom-tip-[a-z0-9_-]{1,80}$/i.test(item.id) ? item.id : `custom-tip-legacy-${index}`;
      return {
        id,
        section,
        title: String(item.title ?? '').trim().slice(0, 80),
        description: String(item.description ?? '').trim().slice(0, 200),
        tip: String(item.tip ?? '').trim().slice(0, 2000),
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
      };
    })
    .filter((item) => item.title && item.tip)
    .slice(0, 80);
}

function createCustomQuestionTypeTipId(entries: CustomQuestionTypeTip[]) {
  const existingIds = new Set(entries.map((entry) => entry.id));
  let id = `custom-tip-${Date.now().toString(36)}`;
  let index = 1;
  while (existingIds.has(id)) {
    id = `custom-tip-${Date.now().toString(36)}-${index}`;
    index += 1;
  }
  return id;
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

function moduleItems(items: VocabItem[], view: AppView, selectedDeck: Deck | 'all', selectedWordbookId = 'all') {
  if (view === 'home') {
    return items;
  }
  if (view === 'grammar') {
    return items.filter((item) => item.deck === 'grammar_expression');
  }
  if (view === 'capture' || view === 'history' || view === 'insights' || view === 'plan' || view === 'question-types' || view === 'listening' || view === 'reading' || view === 'daily-practice' || view === 'drafts' || view === 'about' || view === 'settings') {
    return [];
  }
  if (view === 'vocabulary') {
    const vocabItems = items.filter((item) => item.deck !== 'grammar_expression');
    const deckItems = selectedDeck === 'all' || selectedDeck === 'grammar_expression'
      ? vocabItems
      : vocabItems.filter((item) => item.deck === selectedDeck);
    if (selectedWordbookId === 'all') return deckItems;
    return deckItems.filter((item) => item.wordbook_ids?.includes(selectedWordbookId) || (!item.wordbook_ids?.length && item.deck === selectedWordbookId));
  }
  if (selectedDeck === 'all') {
    return items;
  }
  return items.filter((item) => item.deck === selectedDeck);
}

function navItems(labels: Record<string, string>) {
  return routeNavItems(labels);
}

function routeNavItems(labels: Record<string, string>): AppRouteNavItem[] {
  return [
    { view: 'home' as const, label: labels.navHome },
    {
      view: 'mixed' as const,
      label: labels.questionPage,
      activeViews: ['vocabulary', 'grammar', 'listening', 'reading', 'question-types'] as AppView[],
      children: [
        { view: 'vocabulary' as const, label: labels.navVocabulary, children: studyModeNavItems('vocabulary', labels, true, labels.wordPage) },
        { view: 'grammar' as const, label: labels.navGrammar, children: studyModeNavItems('grammar', labels, true, labels.wordPage) },
        { view: 'listening' as const, label: labels.navListening, children: studyModeNavItems('listening', labels, true, labels.questionBankPage) },
        { view: 'reading' as const, label: labels.navReading, children: studyModeNavItems('reading', labels, true, labels.questionBankPage) },
        { view: 'question-types' as const, label: labels.navQuestionTypes },
      ],
    },
    { view: 'plan' as const, label: labels.navPlan },
    { view: 'insights' as const, label: labels.navMine, activeViews: ['history', 'drafts', 'settings'] as AppView[] },
  ];
}

function desktopSidebarNavItems(labels: Record<string, string>): AppRouteNavItem[] {
  return [
    { view: 'home' as const, label: labels.navHome },
    { view: 'vocabulary' as const, page: 'words' as const, label: labels.navVocabulary, group: 'study' },
    { view: 'grammar' as const, page: 'words' as const, label: labels.navGrammar, group: 'study' },
    { view: 'listening' as const, page: 'words' as const, label: labels.navListening, group: 'study' },
    { view: 'reading' as const, page: 'words' as const, label: labels.navReading, group: 'study' },
    { view: 'question-types' as const, label: labels.navQuestionTypes, group: 'study' },
    { view: 'mixed' as const, label: '综合练习', group: 'review' },
    { view: 'mock-exams' as const, label: labels.navMockExams, group: 'review' },
    { view: 'drafts' as const, label: '复习草稿', group: 'review' },
    { view: 'plan' as const, label: labels.navPlan, group: 'review' },
    { view: 'captures' as const, label: 'Agent 同步', group: 'record' },
    { view: 'history' as const, label: labels.dataPracticeTab, group: 'record' },
    { view: 'mistakes' as const, label: '错题', group: 'record' },
    { view: 'memory' as const, label: '学习记忆', group: 'manage' },
    { view: 'data' as const, label: '数据', group: 'manage' },
    { view: 'mcp' as const, label: 'MCP 设置', group: 'manage' },
  ];
}

function studyModeNavItems(view: AppView, labels: Record<string, string>, allowLibrary: boolean, libraryLabel?: string): AppRouteNavItem[] {
  return [
    { view, page: 'tips', label: labels.navQuestionTypes },
    { view, page: 'questions', label: labels.questionPage },
    ...(allowLibrary ? [{ view, page: 'words' as const, label: libraryLabel ?? labels.wordPage }] : []),
    { view, page: 'review', label: labels.reviewPage },
  ];
}

function mobileAppTitle(route: AppRoute, labels: Record<string, string>, activeDataTab?: DataTab, detail?: { capture: boolean; draft: boolean; attempt: boolean; question: boolean }) {
  const activeView = route.view;
  if (route.page === 'words' && route.itemId && ['vocabulary', 'grammar'].includes(activeView)) return labels.wordDetail;
  if (detail?.question) return labels.historyAttemptQuestionDetail;
  if (detail?.attempt) return labels.historyAttemptDetail;
  if (detail?.capture) return labels.captureDetailTitle;
  if (detail?.draft) return labels.draftPreview;
  if (isDataManagementView(activeView)) {
    const visibleTab = activeDataTab ?? dataTabForRoute(activeView);
    if (visibleTab === 'captures') return labels.historyCaptureTab;
    if (visibleTab === 'practice') return labels.historyPracticeTab;
    return dataTabLabel(visibleTab, labels);
  }
  if (activeView === 'daily-practice') {
    return labels.dailyPracticeTitle;
  }
  if (activeView === 'question-types') {
    return labels.navQuestionTypes;
  }
  if (['vocabulary', 'grammar', 'listening', 'reading', 'mixed'].includes(activeView)) {
    return studyPageLabelFor(activeView, route.page, labels);
  }
  if (activeView === 'mock-exams') {
    return labels.navMockExams;
  }
  return navItems(labels).find((item) => item.view === activeView)?.label ?? labels.brand;
}

function isMobileTabRoute(route: AppRoute) {
  if (route.view === 'home' || route.view === 'plan' || route.view === 'insights') {
    return true;
  }
  if (route.view === 'mixed') {
    return route.page === 'tips' && !route.itemId;
  }
  return false;
}

function mobileBackRoute(route: AppRoute): AppRoute {
  if (route.view === 'mock-exams' && route.itemId) {
    return { view: 'mock-exams', page: 'questions' };
  }
  if (route.view === 'mock-exams') {
    return { view: 'home', page: 'questions' };
  }
  if (route.view === 'mixed' && route.page !== 'tips') {
    return { view: 'home', page: 'questions' };
  }
  if (route.view === 'daily-practice') {
    return { view: 'home', page: 'questions' };
  }
  if (route.view === 'vocabulary' && route.page === 'wordbooks') {
    return { view: 'vocabulary', page: 'words' };
  }
  if (route.itemId && route.page === 'words' && ['vocabulary', 'grammar'].includes(route.view)) {
    return { view: route.view, page: 'words' };
  }
  if (['vocabulary', 'grammar', 'listening', 'reading', 'question-types'].includes(route.view)) {
    return { view: 'home', page: 'questions' };
  }
  if (['history', 'drafts', 'settings'].includes(route.view)) {
    return { view: 'insights', page: 'questions' };
  }
  return { view: 'home', page: 'questions' };
}

function isDataManagementView(view: AppView) {
  return view === 'insights' || view === 'captures' || view === 'history' || view === 'drafts' || view === 'settings';
}

function dataTabForRoute(view: AppView): DataTab {
  if (view === 'history') return 'practice';
  if (view === 'drafts') return 'drafts';
  if (view === 'settings') return 'settings';
  return 'captures';
}

function desktopBackRoute(route: AppRoute): AppRoute | null {
  if (route.view === 'home') {
    return null;
  }
  if (route.itemId) {
    return { view: route.view, page: route.page };
  }
  if (supportsStudyPage(route.view) && route.page !== defaultDesktopStudyPage(route.view)) {
    return { view: route.view, page: defaultDesktopStudyPage(route.view) };
  }
  if (['vocabulary', 'grammar', 'listening', 'reading', 'mixed', 'daily-practice'].includes(route.view)) {
    return { view: 'home', page: 'questions' };
  }
  if (route.view === 'question-types') {
    return { view: 'home', page: 'questions' };
  }
  if (route.view === 'mock-exams') {
    return { view: 'home', page: 'questions' };
  }
  if (['history', 'drafts', 'settings'].includes(route.view)) {
    return { view: 'insights', page: 'questions' };
  }
  return { view: 'home', page: 'questions' };
}

function defaultDesktopStudyPage(view: AppView): StudyPage {
  if (view === 'daily-practice') return 'questions';
  return view === 'vocabulary' || view === 'grammar' || view === 'listening' || view === 'reading' ? 'words' : 'tips';
}

function routeBreadcrumbs(route: AppRoute, labels: Record<string, string>, activeDataTab?: DataTab, activeDraftTitle?: string): Array<{ label: string; route?: AppRoute }> {
  const crumbs: Array<{ label: string; route?: AppRoute }> = [
    { label: labels.navHome, route: { view: 'home', page: 'questions' } },
  ];

  if (['vocabulary', 'grammar', 'listening', 'reading', 'mixed', 'daily-practice', 'question-types'].includes(route.view)) {
    if (route.view === 'question-types') {
      crumbs.push({ label: labels.navQuestionTypes });
      return crumbs;
    }
    crumbs.push({ label: moduleLabelFor(route.view, labels), route: { view: route.view, page: defaultDesktopStudyPage(route.view) } });
    if (supportsStudyPage(route.view)) {
      crumbs.push({ label: studyPageLabelFor(route.view, route.page, labels) });
    }
    return crumbs;
  }

  if (route.view === 'mock-exams') {
    crumbs.push({ label: labels.navMockExams });
    return crumbs;
  }

  if (['history', 'drafts', 'settings', 'insights'].includes(route.view)) {
    crumbs.push({ label: labels.navMine, route: { view: 'insights', page: 'questions' } });
    const visibleTab = activeDataTab ?? dataTabForRoute(route.view);
    if (route.view !== 'insights' || visibleTab !== 'captures') {
      crumbs.push({ label: dataTabLabel(visibleTab, labels) });
    }
    if (visibleTab === 'drafts' && activeDraftTitle) {
      crumbs.push({ label: labels.draftPreview });
    }
    return crumbs;
  }

  crumbs.push({ label: moduleLabelFor(route.view, labels) });
  return crumbs;
}

function dataTabLabel(tab: DataTab, labels: Record<string, string>) {
  if (tab === 'captures') return labels.dataCapturesTab;
  if (tab === 'practice') return labels.dataPracticeTab;
  if (tab === 'drafts') return labels.dataDraftsTab;
  return labels.settings;
}

function moduleLabelFor(view: AppView, labels: Record<string, string>) {
    switch (view) {
    case 'vocabulary':
      return labels.navVocabulary;
    case 'grammar':
      return labels.navGrammar;
    case 'listening':
      return labels.navListening;
    case 'reading':
      return labels.navReading;
    case 'mixed':
      return labels.navMixed;
    case 'daily-practice':
      return labels.dailyPracticeTitle;
    case 'plan':
      return labels.navPlan;
    case 'capture':
      return labels.navCapture;
    case 'about':
      return labels.aboutTitle ?? labels.brand;
    default:
      return labels.brand;
  }
}

function studyPageLabelFor(view: AppView, page: StudyPage, labels: Record<string, string>) {
  if (page === 'tips') return labels.navQuestionTypes;
  if (page === 'questions') return labels.questionPage;
  if (page === 'review') return labels.reviewPage;
  if (page === 'wordbooks') return labels.wordbookManage;
  if (page === 'words') return view === 'mixed' ? labels.mixedHubAllEntries : view === 'listening' || view === 'reading' ? labels.questionBankPage : labels.wordPage;
  return labels.questionPage;
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

function normalizeReviewData(data: ReviewData): ReviewData {
  return {
    ...data,
    items: data.items.map((item) => ({
      ...item,
      collocations: normalizeCollocations(item.collocations),
    })),
  };
}

function normalizeCollocations(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => typeof entry === 'string' ? entry : isRecord(entry) ? entry.text : undefined)
    .map((entry) => typeof entry === 'string' ? entry.trim() : '')
    .filter(Boolean);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
  ];
}

function LoadingScreen() {
  return (
    <main className="cute-shell flex min-h-[100dvh] items-center justify-center px-5 text-[#28312d]" aria-label="Loading">
      <p className="cute-brand text-xl">JLPT Review</p>
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
    <main className="cute-shell flex min-h-[100dvh] items-start justify-center px-5 py-10 text-[#28312d] sm:items-center sm:px-8 sm:py-12 lg:px-12">
      <section className="cute-card w-full max-w-md bg-transparent sm:max-w-[420px] sm:border sm:p-8 lg:max-w-sm">
        <h1 className="cute-brand text-2xl">JLPT Review</h1>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <SegmentButton active={mode === 'login'} onClick={() => setMode('login')}>
            Login
          </SegmentButton>
          <SegmentButton active={mode === 'register'} onClick={() => setMode('register')}>
            Register
          </SegmentButton>
        </div>

        <form className="mt-6 space-y-5" onSubmit={submit}>
          <label className="block text-sm font-semibold text-[#654e58]">
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-[#efd1db] bg-white/90 px-3 text-base outline-none focus:border-[#d95f8a]"
              autoComplete="username"
              pattern="[A-Za-z0-9_\-]{3,32}"
              required
            />
          </label>
          <label className="block text-sm font-semibold text-[#654e58]">
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-[#efd1db] bg-white/90 px-3 text-base outline-none focus:border-[#d95f8a]"
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              minLength={4}
              required
            />
          </label>
          {error ? <p className="rounded-2xl border border-[#f0cf80] bg-[#fff8df] p-3 text-sm font-semibold text-[#775516]">{error}</p> : null}
          <button type="submit" disabled={loading} className="cute-button-primary h-12 w-full rounded-2xl px-4 text-sm font-semibold text-white disabled:opacity-60">
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
        active ? 'border-[#d95f8a] bg-[#d95f8a] text-white' : 'border-[#efd1db] bg-white text-[#654e58] hover:bg-[#fff0f5]'
      }`}
    >
      {children}
    </button>
  );
}

function DesktopLocationBar({
  route,
  labels,
  backRoute,
  backLabel: explicitBackLabel,
  backAction,
  activeDataTab,
  activeDraftTitle,
  onNavigate,
}: {
  route: AppRoute;
  labels: Record<string, string>;
  backRoute: AppRoute | null;
  backLabel?: string;
  backAction?: () => void;
  activeDataTab?: DataTab;
  activeDraftTitle?: string;
  onNavigate: (route: AppRoute) => void;
}) {
  const crumbs = routeBreadcrumbs(route, labels, activeDataTab, activeDraftTitle);
  const dataContextLabels = isDataManagementView(route.view)
    ? [dataTabLabel(activeDataTab ?? dataTabForRoute(route.view), labels), activeDraftTitle ? labels.draftPreview : undefined].filter(Boolean)
    : null;
  const backLabel = explicitBackLabel ?? (crumbs.length > 1 ? crumbs[crumbs.length - 2].label : labels.navHome);
  const canGoBack = Boolean(backRoute || backAction);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <button
        type="button"
        disabled={!canGoBack}
        onClick={() => {
          if (backAction) {
            backAction();
            return;
          }
          if (backRoute) onNavigate(backRoute);
        }}
        aria-label={backLabel}
        title={backLabel}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#a84269] hover:bg-[#fff0f5] disabled:cursor-not-allowed disabled:text-[#cbb6bf] disabled:hover:bg-transparent"
      >
        <ArrowLeft size={18} />
      </button>
      <nav className="flex min-w-0 items-center gap-1 text-sm font-semibold" aria-label={labels.mobileNavigation}>
        {dataContextLabels ? dataContextLabels.map((label, index) => {
          const isLast = index === dataContextLabels.length - 1;
          return (
            <span key={`${label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 ? <span className="text-[#c8aebb]">/</span> : null}
              <span className={`truncate px-1.5 py-1 ${isLast ? 'max-w-40 text-[#3d3036]' : 'max-w-32 text-[#7a6a70]'}`} aria-current={isLast ? 'page' : undefined}>
                {label}
              </span>
            </span>
          );
        }) : crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <span key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 ? <span className="text-[#c8aebb]">/</span> : null}
              {crumb.route && !isLast ? (
                <button
                  type="button"
                  onClick={() => onNavigate(crumb.route as AppRoute)}
                  className="max-w-32 truncate rounded-md px-1.5 py-1 text-[#7a6a70] hover:bg-[#fff0f5] hover:text-[#a84269]"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="max-w-40 truncate px-1.5 py-1 text-[#3d3036]" aria-current="page">
                  {crumb.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>
    </div>
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
    <div className="relative min-w-0 lg:w-[19rem] xl:w-[22rem]">
      <div className="flex h-10 min-w-0 items-center rounded-full border border-[#efd1db] bg-white/85 px-3 shadow-sm focus-within:border-[#d95f8a] focus-within:bg-white">
        <span aria-hidden="true" className="mr-2 shrink-0 text-[#a84269]">⌕</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              onQueryChange('');
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-sm text-[#3d3036] outline-none placeholder:text-[#987986]"
          placeholder={labels.searchPlaceholder}
          aria-label={labels.searchOpen}
        />
        {hasQuery ? (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label={labels.searchClear}
            title={labels.searchClear}
            className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg leading-none text-[#987986] hover:bg-[#fff0f5] hover:text-[#a84269]"
          >
            ×
          </button>
        ) : null}
      </div>

      {hasQuery ? (
        <div className="absolute left-0 right-0 top-12 z-30 max-h-[min(70vh,520px)] overflow-y-auto rounded-2xl border border-[#efd1db] bg-white p-2 shadow-xl">
          <p className="px-2 py-1 text-xs font-semibold text-[#a84269]">{labels.searchResults}</p>
          {results.length ? (
            <div className="mt-1 grid gap-1">
              {results.map((result) => (
                <button
                  type="button"
                  key={result.item.id}
                  onClick={() => onOpenResult(result.item)}
                  className="min-w-0 rounded-2xl px-3 py-3 text-left hover:bg-[#fff7fb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95f8a]"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-base font-semibold text-[#8f365b]">{result.title}</p>
                      {result.item.reading ? <p className="mt-1 text-xs font-semibold text-[#856033]">{result.item.reading}</p> : null}
                    </div>
                    <span className="shrink-0 rounded-full bg-[#eef9f2] px-2 py-1 text-xs font-semibold text-[#3e755c]">{result.moduleLabel}</span>
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

function normalizeWordbooks(value: Wordbook[] | undefined) {
  const seen = new Set<string>();
  return [...(value?.length ? value : fallbackWordbooks)]
    .filter((wordbook) => wordbook?.id && wordbook.title && (wordbook.deck === 'n1_vocab' || wordbook.deck === 'name_reading' || wordbook.deck === 'grammar_expression'))
    .filter((wordbook) => {
      if (seen.has(wordbook.id)) return false;
      seen.add(wordbook.id);
      return true;
    });
}

function EmptyModule({ labels }: { labels: Record<string, string> }) {
  return (
    <section className="cute-card min-w-0 border border-dashed p-6">
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
      className={`rounded-2xl border p-4 text-left shadow-sm transition ${
        active ? 'border-[#d95f8a] bg-[#fff0f5]' : 'border-[#efd1db] bg-white hover:bg-[#fff7fb]'
      }`}
    >
      <p className="text-xs font-semibold uppercase text-[#856033]">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#62645f]">{body}</p>
    </button>
  );
}
