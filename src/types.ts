export type Deck = 'n1_vocab' | 'name_reading' | 'grammar_expression';
export type QuestionKind = 'grammar' | 'moji_goi' | 'meaning' | 'kana_to_kanji' | 'kanji_to_kana';
export type Locale = 'zh-CN' | 'ja' | 'en';
export type AppView = 'capture' | 'home' | 'history' | 'insights' | 'plan' | 'question-types' | 'vocabulary' | 'grammar' | 'listening' | 'reading' | 'mixed' | 'drafts' | 'about' | 'settings';
export type StudyPage = 'questions' | 'words' | 'review' | 'samples';
export type AppRoute = { view: AppView; page: StudyPage; itemId?: string };
export type AnswerRecord = { selected: string; correct: boolean; answeredAt?: string; elapsedMs?: number; attemptId?: string };
export type AnswerState = Record<string, AnswerRecord>;
export type ReviewStatus = 'new' | 'learning' | 'review' | 'mastered';

export type SearchResult = {
  item: VocabItem;
  title: string;
  subtitle: string;
  moduleLabel: string;
  matches: string[];
  score: number;
};

export type ProgressEntry = {
  correct: number;
  wrong: number;
  status: ReviewStatus;
  firstSeenAt?: string;
  lastReviewedAt?: string;
  reviewCount?: number;
  ease?: number;
  intervalDays?: number;
  nextReviewAt?: string;
};

export type ProgressState = Record<string, ProgressEntry>;
export type FeedbackMode = 'immediate' | 'batch';
export type FontSize = 'small' | 'standard' | 'large';

export type AttemptAnswer = {
  questionId: string;
  itemId: string;
  kind: QuestionKind;
  selected: string;
  correct: boolean;
  answeredAt: string;
  elapsedMs: number;
};

export type PracticeAttempt = {
  id: string;
  startedAt: string;
  completedAt?: string;
  view: AppView;
  deck: Deck | 'all';
  questionIds: string[];
  answers: AttemptAnswer[];
  summary?: {
    total: number;
    correct: number;
    wrong: number;
    accuracy: number;
    elapsedMs: number;
  };
};

export type DisplaySettings = {
  showReviewRuby: boolean;
  showExplanationRuby: boolean;
  locale: Locale;
  fontSize: FontSize;
  feedbackMode: FeedbackMode;
  questionTypeTips: Record<string, string>;
};

export type AuthUser = { id: number; username: string };

export type StudyState = {
  answers: AnswerState;
  progress: ProgressState;
  settings: DisplaySettings;
  attemptHistory: PracticeAttempt[];
  activeAttempt: PracticeAttempt | null;
};

export type DraftSummary = { id: string; title: string; status: string; created_at: string; updated_at: string };
export type DraftAnnotation = { id: string; body: string; created_at: string };
export type ReviewPackDraft = DraftSummary & { content: unknown; annotations: DraftAnnotation[] };

export type LearningCaptureCategory = 'word' | 'grammar' | 'sentence' | 'listening' | 'reading' | 'unsure';
export type LearningCaptureStatus = 'inbox' | 'processed' | 'archived';
export type LearningCapture = {
  id: string;
  body: string;
  category: LearningCaptureCategory;
  context: string;
  status: LearningCaptureStatus;
  createdAt: string;
  updatedAt: string;
};

export type ListeningQuestion = {
  id: string;
  title: string;
  question: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  audioFileName: string;
  audioMime: string;
  audioSize: number;
  createdAt: string;
};

export type ListeningQuestionInput = Omit<ListeningQuestion, 'id' | 'audioSize' | 'createdAt'> & { audioBase64: string };

export type StudyPlanModule = 'grammar' | 'reading' | 'listening' | 'vocabulary' | 'other';
export type StudyPlanMaterial = {
  id: string;
  title: string;
  module: StudyPlanModule;
  currentPosition?: string;
};
export type StudyPlanProfile = {
  level: 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
  startDate: string;
  examDate: string;
  studyDaysPerWeek: number;
  dailyMinutes: number;
  materials: StudyPlanMaterial[];
  goal?: string;
};
export type StudyPlanTaskStatus = 'pending' | 'completed' | 'skipped' | 'missed';
export type StudyPlanTask = {
  id: string;
  date: string;
  title: string;
  module: StudyPlanModule;
  minutes: number;
  detail?: string;
  materialId?: string;
  status: StudyPlanTaskStatus;
  completedAt?: string;
};
export type StudyDailySummary = {
  date: string;
  attempted: number;
  correct: number;
  accuracy: number | null;
  practiceMinutes: number;
  plannedTasks: number;
  completedTasks: number;
  plannedMinutes: number;
  completedMinutes: number;
  note: string;
};
export type StudyPlanDocument = {
  profile: StudyPlanProfile;
  status: 'profile_only' | 'ready' | 'needs_refresh';
  tasks: StudyPlanTask[];
  dailySummaries: StudyDailySummary[];
  generatedAt?: string;
  updatedAt?: string;
};
export type RubyTerm = { text: string; reading: string };

export type LocalizedText = {
  meaning?: string;
  core_memory?: string;
  analysis?: string;
};

export type PracticeQuestionSeed = {
  id?: string;
  kind?: string;
  prompt?: string;
  choices?: string[];
  answer?: string;
};

export type VocabItem = {
  id: string;
  date: string;
  input_at?: string;
  deck: Deck;
  type: string;
  jlpt_level?: string;
  original: string;
  reading?: string;
  meaning_ja?: string;
  paraphrase_ja?: string;
  meaning_zh: string;
  core_memory: string;
  part_of_speech?: string;
  collocations?: string[];
  examples?: { ja: string; zh: string }[];
  comparisons?: { target: string; difference_zh: string }[];
  analysis?: string;
  localizations?: Partial<Record<Locale | string, LocalizedText>>;
  ruby_terms?: RubyTerm[];
  tags?: string[];
  content_origin?: 'user_provided' | 'ai_generated';
  verification_status?: 'unverified' | 'needs_review' | 'verified';
  level_confidence?: 'low' | 'medium' | 'high';
  question_kinds?: QuestionKind[];
  question_distractors?: Partial<Record<QuestionKind, string[]>>;
  source_original_sentence?: string;
  source_grammar_point?: string;
  grammar_forms?: unknown[];
  grammar_features?: unknown[];
  practice_questions?: PracticeQuestionSeed[];
};

export type ReviewData = {
  generated_at: string;
  items: VocabItem[];
};

export type Question = {
  id: string;
  itemId: string;
  kind: QuestionKind;
  title: string;
  instruction?: string;
  prompt: string;
  promptTarget?: string;
  choices: string[];
  answer: string;
  context: string;
  correctReason: string;
  memoryPoint: string;
  choiceAnalysis: { choice: string; correct: boolean; explanation: string }[];
};
