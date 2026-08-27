'use client';

import { useEffect, useMemo, useState } from 'react';

type Deck = 'n1_vocab' | 'name_reading' | 'grammar_expression';
type QuestionKind = 'grammar' | 'moji_goi' | 'meaning' | 'kana_to_kanji' | 'kanji_to_kana';
type Locale = 'zh-CN' | 'ja' | 'en';
type AppView = 'home' | 'vocabulary' | 'grammar' | 'listening' | 'reading' | 'mixed' | 'about' | 'settings';
type StudyPage = 'questions' | 'words' | 'review';
type AppRoute = { view: AppView; page: StudyPage; itemId?: string };
type AnswerRecord = { selected: string; correct: boolean; answeredAt?: string; elapsedMs?: number; attemptId?: string };
type AnswerState = Record<string, AnswerRecord>;
type ReviewStatus = 'new' | 'learning' | 'review' | 'mastered';
type SearchResult = {
  item: VocabItem;
  title: string;
  subtitle: string;
  moduleLabel: string;
  matches: string[];
  score: number;
};
type ProgressEntry = {
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
type ProgressState = Record<string, ProgressEntry>;
type FeedbackMode = 'immediate' | 'batch';
type AttemptAnswer = {
  questionId: string;
  itemId: string;
  kind: QuestionKind;
  selected: string;
  correct: boolean;
  answeredAt: string;
  elapsedMs: number;
};
type PracticeAttempt = {
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
type DisplaySettings = {
  showReviewRuby: boolean;
  showExplanationRuby: boolean;
  locale: Locale;
  feedbackMode: FeedbackMode;
};
type RubyTerm = { text: string; reading: string };
type LocalizedText = {
  meaning?: string;
  core_memory?: string;
  analysis?: string;
};

type VocabItem = {
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
};

type ReviewData = {
  generated_at: string;
  items: VocabItem[];
};

type Question = {
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

const STORAGE_PROGRESS = 'jlpt-vocab-progress-v1';
const STORAGE_ANSWERS = 'jlpt-vocab-answers-jlpt-v2';
const STORAGE_SETTINGS = 'jlpt-display-settings-v1';
const STORAGE_ATTEMPT_HISTORY = 'jlpt-practice-attempt-history-v1';
const STORAGE_ACTIVE_ATTEMPT = 'jlpt-active-practice-attempt-v1';

const translations = {
  'zh-CN': {
    deckAll: '全部',
    deckN1: 'N1/N2 词汇',
    deckExpression: '表达/活用',
    deckName: '补充・人名读法',
    meaning: '言い換え類義',
    kanaToKanji: '表記',
    kanjiToKana: '漢字読み',
    mojiGoi: '文脈規定',
    reset: '重置本地进度',
    resetProgressBody: '清除当前浏览器中的答题记录、复习次数和下次复习时间。词库内容和显示设置不会被删除。',
    resetConfirm: '确定要清除当前浏览器中的全部学习进度吗？此操作无法撤销。',
    items: '词条',
    questions: '题目',
    answered: '已作答',
    correct: '正确',
    mastered: '掌握',
    reviewCount: '复习',
    nextReview: '下次复习',
    wordDetail: '词条详情',
    questionPage: '练习',
    wordPage: '阅读',
    reviewPage: '解析',
    studyMode: '学习模式',
    completed: '已完成',
    restartPractice: '重新练习',
    viewEntry: '打开词条',
    searchPlaceholder: '查找单词、语法、技巧',
    searchResults: '搜索结果',
    noSearchResults: '没有找到匹配内容',
    searchOpen: '打开搜索',
    searchClear: '清空搜索',
    searchModuleVocabulary: '单词',
    searchModuleGrammar: '语法',
    searchModuleTip: '技巧',
    filters: '筛选',
    hideFilters: '收起筛选',
    showFilters: '展开筛选',
    settings: '设置',
    exportStudyRecord: '导出学习记录',
    exportStudyRecordBody: '下载当前浏览器里的答题记录、复习次数、下次复习时间和 AI 分析提示。把 JSON 给 Codex 或 Claude Code 后，可以分析弱点、生成 7 天学习计划和新的复习内容。',
    exportStudyRecordButton: '导出 JSON',
    exportForAI: '给 AI 分析',
    skillTitle: '两种技能工作流',
    skillBody: '使用 jlpt-chat-review 技能，把聊天里的单词、句子、语法疑问和完整题目整理成 review-data.json。技能会记录输入时间、输出多语言说明、生成 JLPT 题型，并把假名标注放在可控制的 ruby_terms 中。',
    generatorSkillBody: '没有自己的输入内容时，使用 jlpt-study-generator。它会根据目标级别、备考天数、每日时间和训练模块生成通用计划及首周学习内容。AI 生成材料不是 JLPT 官方内容，读音、含义、答案和级别需要你自行核对。',
    aiGeneratedLabel: 'AI 生成',
    unverifiedContentNotice: '这项内容由 AI 生成且尚未核对，请自行判断读音、含义、答案和 JLPT 级别。',
    workflowTitle: '推荐使用流程',
    workflowCapture: '1. 选择入口：输入自己的疑问，或只提供目标级别、备考天数和重点模块。',
    workflowGenerate: '2. 用 jlpt-chat-review 整理个人内容，或用 jlpt-study-generator 生成通用计划和材料。',
    workflowPractice: '3. 在网页里按单词、语法、听力、阅读、综合模块复习。',
    workflowExport: '4. 从设置导出学习记录，再交给 AI 分析弱点、安排下一轮复习和生成新题。',
    brand: 'JLPT Review',
    navHome: '首页',
    navVocabulary: '单词',
    navGrammar: '语法',
    navListening: '听力',
    navReading: '阅读',
    navMixed: '综合',
    navAbout: '介绍',
    countdownTitle: '下一次 JLPT',
    countdownDate: '2026年12月6日',
    countdownSource: '日期来自 JLPT 官方 2026 年考试安排。',
    days: '天',
    hours: '小时',
    minutes: '分钟',
    heroTitle: '把每天的日语疑问变成可复习的 JLPT 题库',
    heroBody: '聊天负责输入和整理，网页负责分模块复习。现在先做本地浏览器版，后续可以接账号系统。',
    moduleVocabularyTitle: '单词模块',
    moduleVocabularyBody: '处理 JLPT 文字・語彙、言い換え類義、表記、漢字読み。',
    moduleGrammarTitle: '语法模块',
    moduleGrammarBody: '处理句型、接续、语感差异和例句解析。',
    moduleListeningTitle: '听力模块',
    moduleListeningBody: '预留给音频、关键词、场景判断和听解错题。',
    moduleReadingTitle: '阅读模块',
    moduleReadingBody: '预留给短文结构、指示词、主旨和细节题。',
    moduleMixedTitle: '综合练习',
    moduleMixedBody: '混合所有模块，适合考前复盘和弱项检查。',
    moduleEmptyTitle: '这个模块还没有内容',
    moduleEmptyBody: '后续用技能输入对应材料后，这里会单独生成练习和解析。',
    aboutTitle: '应用介绍',
    aboutBody: '这是一个本地优先的 JLPT 学习工具。你可以整理自己的疑问，也可以只提供目标级别和备考时间，让 AI 生成通用学习计划。网页负责复习、判分和浏览器本地进度。',
    deployTitle: '自己部署',
    deployBody: 'Fork GitHub 仓库，选择使用示例数据或 npm run data:blank 创建空白数据，然后部署到 Cloudflare Pages。',
    deck: 'Deck',
    meaningTypeTitle: 'JLPT 题型',
    meaningTypeIntroTitle: 'JLPT题型说明',
    meaningTypeIntroBody: '练习按 JLPT 文字・語彙和文法的常见形式混合出题，不需要手动选择题型。系统会根据词条内容自动生成 文脈規定、言い換え類義、漢字読み，合适时加入 表記；语法项使用 文の文法1。',
    answerFeedbackMode: '答案反馈方式',
    feedbackModeImmediate: '每题答完立即显示',
    feedbackModeBatch: '全部作答后统一显示',
    display: '显示设置',
    language: '界面语言',
    reviewRuby: '复习显示假名',
    explanationRuby: '解析显示假名',
    furigana: '假名',
    japaneseMeaning: '日语解释',
    localizedMeaning: '中文解释',
    examQuickNote: '考场快速记录',
    collocationsLabel: '常用搭配',
    noQuestion: '没有可练习题目',
    noQuestionBody: '当前筛选条件下没有题目。',
    meaningTitle: '言い換え類義',
    meaningInstruction: '下線の言葉に意味が最も近いものを、１・２・３・４から一つ選びなさい。',
    kanaToKanjiTitle: '表記',
    kanaToKanjiInstruction: '下線の言葉を漢字で書くとき、最もよいものを、１・２・３・４から一つ選びなさい。',
    kanjiToKanaTitle: '漢字読み',
    kanjiToKanaInstruction: '下線の言葉の読み方として最もよいものを、１・２・３・４から一つ選びなさい。',
    nameReadingTitle: '補充・人名読み',
    nameReadingInstruction: '下線の人名・地名の読み方として、最もよいものを一つ選んでください。',
    grammar: '文の文法1',
    grammarTitle: '文の文法1',
    grammarInstruction: '次の文の（　）に入れるのに最もよいものを、１・２・３・４から一つ選びなさい。',
    mojiGoiTitle: '文脈規定',
    mojiGoiInstruction: '（　）に入れるのに最もよいものを、１・２・３・４から一つ選びなさい。',
    yourAnswer: '你的答案',
    rightAnswer: '正确答案',
    wrong: '错误',
    prev: '上一题',
    next: '下一题',
    analysis: '解析',
    reviewSummaryTitle: '本次解析',
    reviewSummaryBody: '完成全部题目后再看答案时，这里集中展示每题解析、历史记录和下一轮建议。',
    historyTitle: '做题历史',
    latestAttempt: '最近一次',
    startedAt: '开始时间',
    completedAt: '完成时间',
    elapsed: '用时',
    accuracy: '正确率',
    wrongQuestions: '错题',
    suggestionLabel: '建议',
    suggestionAllCorrect: '本轮全对。下一轮可以混合其他模块，或延后复习以检查长期记忆。',
    suggestionReviewWrong: '先复盘错题的正确理由和选项差异，再把错题导出给 AI 生成相似题。',
    suggestionLowAccuracy: '正确率偏低。建议先回到阅读页复习相关词条，再做一轮同模块练习。',
    noAttemptHistory: '还没有完成的练习记录。',
    backToPractice: '返回练习',
    aiSuggestionPromptLabel: '给 AI 的建议输入',
    contextLabel: '完整语境',
    correctReasonLabel: '正确理由',
    choiceAnalysisLabel: '选项分析',
    memoryPointLabel: '记忆重点',
    choiceFits: '符合',
    choiceDoesNotFit: '不符合',
    contact: '联系',
    intro: '使用 Codex 或 Claude Code 整理自己的学习记录，在浏览器本地练习 JLPT 文字・語彙、言い換え類義、表記和漢字読み。',
  },
  ja: {
    deckAll: 'すべて',
    deckN1: 'N1/N2 語彙',
    deckExpression: '表現・活用',
    deckName: '補充・人名読み',
    meaning: '言い換え類義',
    kanaToKanji: '表記',
    kanjiToKana: '漢字読み',
    mojiGoi: '文脈規定',
    reset: 'ローカル進捗をリセット',
    resetProgressBody: 'このブラウザ内の回答履歴、復習回数、次回復習日を削除します。語彙データと表示設定は残ります。',
    resetConfirm: 'このブラウザ内の学習進捗をすべて削除しますか？この操作は取り消せません。',
    items: '項目',
    questions: '問題',
    answered: '回答済み',
    correct: '正解',
    mastered: '習得',
    reviewCount: '復習',
    nextReview: '次回復習',
    wordDetail: '語彙詳細',
    questionPage: '練習',
    wordPage: '閲覧',
    reviewPage: '解説',
    studyMode: '学習モード',
    completed: '完了',
    restartPractice: 'もう一度練習',
    viewEntry: '項目を開く',
    searchPlaceholder: '語彙・文法・コツを検索',
    searchResults: '検索結果',
    noSearchResults: '一致する内容がありません',
    searchOpen: '検索を開く',
    searchClear: '検索を消去',
    searchModuleVocabulary: '語彙',
    searchModuleGrammar: '文法',
    searchModuleTip: 'コツ',
    filters: 'フィルター',
    hideFilters: 'フィルターを閉じる',
    showFilters: 'フィルターを開く',
    settings: '設定',
    exportStudyRecord: '学習記録を書き出す',
    exportStudyRecordBody: 'このブラウザ内の回答履歴、復習回数、次回復習日、AI 分析用プロンプトを JSON で保存します。JSON を Codex や Claude Code に渡すと、弱点分析、7日間の学習計画、新しい復習内容の作成に使えます。',
    exportStudyRecordButton: 'JSON を書き出す',
    exportForAI: 'AI に分析させる',
    skillTitle: '2つのスキル',
    skillBody: 'jlpt-chat-review スキルで、チャット内の語彙・文・文法の疑問・問題を review-data.json に整理します。入力時刻、多言語説明、JLPT 形式の問題、表示制御できる ruby_terms を扱います。',
    generatorSkillBody: '自分の入力素材がない場合は jlpt-study-generator を使います。目標レベル、日数、1日の学習時間、重点分野から一般的な計画と最初の7日分の教材を作ります。AI生成教材はJLPT公式ではないため、読み・意味・答え・レベルを自分で確認してください。',
    aiGeneratedLabel: 'AI生成',
    unverifiedContentNotice: 'この内容はAIが生成した未確認の教材です。読み・意味・答え・JLPTレベルを自分で確認してください。',
    workflowTitle: 'おすすめの使い方',
    workflowCapture: '1. 自分の疑問を入力するか、目標レベル・日数・重点分野だけを指定するか選びます。',
    workflowGenerate: '2. 個人素材は jlpt-chat-review、一般計画と教材は jlpt-study-generator で作成します。',
    workflowPractice: '3. Web で語彙・文法・聴解・読解・総合のモジュール別に復習します。',
    workflowExport: '4. 設定から学習記録を書き出し、AI に弱点分析と次の復習計画を作らせます。',
    brand: 'JLPT Review',
    navHome: 'ホーム',
    navVocabulary: '語彙',
    navGrammar: '文法',
    navListening: '聴解',
    navReading: '読解',
    navMixed: '総合',
    navAbout: '紹介',
    countdownTitle: '次の JLPT',
    countdownDate: '2026年12月6日',
    countdownSource: '日付は JLPT 公式の 2026 年試験日程に基づきます。',
    days: '日',
    hours: '時間',
    minutes: '分',
    heroTitle: '毎日の疑問を復習できる JLPT デッキへ',
    heroBody: 'チャットで入力と整理を行い、Web アプリで分野別に復習します。今はローカルブラウザ版で、将来はアカウント連携も想定しています。',
    moduleVocabularyTitle: '語彙モジュール',
    moduleVocabularyBody: 'JLPT 文字・語彙、言い換え類義、表記、漢字読みを扱います。',
    moduleGrammarTitle: '文法モジュール',
    moduleGrammarBody: '文型、接続、ニュアンス差、例文解説を扱います。',
    moduleListeningTitle: '聴解モジュール',
    moduleListeningBody: '音声、キーワード、場面判断、聴解の誤答を扱う予定です。',
    moduleReadingTitle: '読解モジュール',
    moduleReadingBody: '文章構造、指示語、主旨、細部問題を扱う予定です。',
    moduleMixedTitle: '総合練習',
    moduleMixedBody: 'すべての分野を混ぜて、試験前の復習や弱点確認に使います。',
    moduleEmptyTitle: 'このモジュールにはまだ内容がありません',
    moduleEmptyBody: '該当する学習素材をスキルで入力すると、ここに練習と解説が生成されます。',
    aboutTitle: 'アプリ紹介',
    aboutBody: 'これはローカル優先の JLPT 学習ツールです。自分の疑問を整理する方法と、目標レベルと期間から一般的な計画を生成する方法があります。Web アプリが復習・採点・ブラウザ内の進捗を担当します。',
    deployTitle: '自分でデプロイ',
    deployBody: 'GitHub リポジトリを fork し、サンプルデータを使うか npm run data:blank で空データを作成して、Cloudflare Pages にデプロイします。',
    deck: 'Deck',
    meaningTypeTitle: 'JLPTの問題形式',
    meaningTypeIntroTitle: 'JLPT問題形式',
    meaningTypeIntroBody: 'JLPT の文字・語彙と文法の形式を混ぜて出題します。問題形式は手動で選ばず、項目に応じて 文脈規定・言い換え類義・漢字読み・表記、文法項目は 文の文法1 を使います。',
    answerFeedbackMode: '回答フィードバック',
    feedbackModeImmediate: '回答後すぐ採点',
    feedbackModeBatch: '全問題回答後に表示',
    display: '表示設定',
    language: '表示言語',
    reviewRuby: '復習にふりがな',
    explanationRuby: '解説にふりがな',
    furigana: 'ふりがな',
    japaneseMeaning: '日本語の説明',
    localizedMeaning: '意味',
    examQuickNote: '試験直前メモ',
    collocationsLabel: 'よく使う組み合わせ',
    noQuestion: '問題がありません',
    noQuestionBody: '現在の条件では問題がありません。',
    meaningTitle: '言い換え類義',
    meaningInstruction: '下線の言葉に意味が最も近いものを、１・２・３・４から一つ選びなさい。',
    kanaToKanjiTitle: '表記',
    kanaToKanjiInstruction: '下線の言葉を漢字で書くとき、最もよいものを、１・２・３・４から一つ選びなさい。',
    kanjiToKanaTitle: '漢字読み',
    kanjiToKanaInstruction: '下線の言葉の読み方として最もよいものを、１・２・３・４から一つ選びなさい。',
    nameReadingTitle: '補充・人名読み',
    nameReadingInstruction: '下線の人名・地名の読み方として、最もよいものを一つ選んでください。',
    grammar: '文の文法1',
    grammarTitle: '文の文法1',
    grammarInstruction: '次の文の（　）に入れるのに最もよいものを、１・２・３・４から一つ選びなさい。',
    mojiGoiTitle: '文脈規定',
    mojiGoiInstruction: '（　）に入れるのに最もよいものを、１・２・３・４から一つ選びなさい。',
    yourAnswer: 'あなたの答え',
    rightAnswer: '正解',
    wrong: '不正解',
    prev: '前へ',
    next: '次へ',
    analysis: '解説',
    reviewSummaryTitle: '今回の解説',
    reviewSummaryBody: '全問回答後に答えを見る場合、各問の解説、履歴、次回への提案をまとめて表示します。',
    historyTitle: '回答履歴',
    latestAttempt: '最新',
    startedAt: '開始',
    completedAt: '完了',
    elapsed: '所要時間',
    accuracy: '正答率',
    wrongQuestions: '誤答',
    suggestionLabel: '提案',
    suggestionAllCorrect: '今回は全問正解です。次は他の分野を混ぜるか、少し間を空けて定着を確認してください。',
    suggestionReviewWrong: 'まず誤答の正解理由と選択肢の違いを復習し、AI に類題を作らせるのがよいです。',
    suggestionLowAccuracy: '正答率が低めです。関連項目を閲覧ページで確認してから、同じ分野をもう一度練習してください。',
    noAttemptHistory: '完了した練習記録はまだありません。',
    backToPractice: '練習に戻る',
    aiSuggestionPromptLabel: 'AI への入力',
    contextLabel: '文脈',
    correctReasonLabel: '正解の理由',
    choiceAnalysisLabel: '選択肢の分析',
    memoryPointLabel: '覚えるポイント',
    choiceFits: '適切',
    choiceDoesNotFit: '不適切',
    contact: '連絡先',
    intro: 'Codex や Claude Code で整理した学習記録を使い、JLPT 文字・語彙・言い換え類義・表記・漢字読みをブラウザ内で復習します。',
  },
  en: {
    deckAll: 'All',
    deckN1: 'N1/N2 Vocab',
    deckExpression: 'Expressions',
    deckName: 'Supplement: Name Readings',
    meaning: 'Paraphrase',
    kanaToKanji: 'Orthography',
    kanjiToKana: 'Kanji Reading',
    mojiGoi: 'Contextual Vocabulary',
    reset: 'Reset local progress',
    resetProgressBody: 'Clear answer history, review counts, and next-review times from this browser. Deck content and display settings are kept.',
    resetConfirm: 'Clear all study progress from this browser? This action cannot be undone.',
    items: 'Items',
    questions: 'Questions',
    answered: 'Answered',
    correct: 'Correct',
    mastered: 'Mastered',
    reviewCount: 'Reviews',
    nextReview: 'Next Review',
    wordDetail: 'Word Detail',
    questionPage: 'Practice',
    wordPage: 'Read',
    reviewPage: 'Review',
    studyMode: 'Study Mode',
    completed: 'Completed',
    restartPractice: 'Practice Again',
    viewEntry: 'Open Entry',
    searchPlaceholder: 'Search words, grammar, tips',
    searchResults: 'Search Results',
    noSearchResults: 'No matching content',
    searchOpen: 'Open search',
    searchClear: 'Clear search',
    searchModuleVocabulary: 'Vocabulary',
    searchModuleGrammar: 'Grammar',
    searchModuleTip: 'Tip',
    filters: 'Filters',
    hideFilters: 'Hide Filters',
    showFilters: 'Show Filters',
    settings: 'Settings',
    exportStudyRecord: 'Export Study Record',
    exportStudyRecordBody: 'Download answers, review counts, next-review times, and an AI analysis prompt from this browser. Give the JSON to Codex or Claude Code to analyze weak points, create a 7-day plan, and generate new review content.',
    exportStudyRecordButton: 'Export JSON',
    exportForAI: 'Analyze With AI',
    skillTitle: 'Two Skill Workflows',
    skillBody: 'Use the jlpt-chat-review skill to turn words, sentences, grammar questions, and full JLPT problems from chat into review-data.json. The skill records input time, multilingual explanations, JLPT question types, and display-controlled ruby_terms.',
    generatorSkillBody: 'When you have no source material, use jlpt-study-generator. It creates a general plan and the first seven days of content from your target level, available days, daily time, and focus modules. AI-generated material is not official JLPT content; verify readings, meanings, answers, and level assignments yourself.',
    aiGeneratedLabel: 'AI generated',
    unverifiedContentNotice: 'This item was generated by AI and has not been verified. Check its reading, meaning, answer, and JLPT level yourself.',
    workflowTitle: 'Recommended Flow',
    workflowCapture: '1. Choose an entry point: provide your own questions, or only a target level, study days, and focus modules.',
    workflowGenerate: '2. Use jlpt-chat-review for personal material, or jlpt-study-generator for a general plan and content.',
    workflowPractice: '3. Review by vocabulary, grammar, listening, reading, and mixed modules in the web app.',
    workflowExport: '4. Export the study record from Settings, then ask AI to analyze weak points, plan the next review, and generate new content.',
    brand: 'JLPT Review',
    navHome: 'Home',
    navVocabulary: 'Vocabulary',
    navGrammar: 'Grammar',
    navListening: 'Listening',
    navReading: 'Reading',
    navMixed: 'Mixed',
    navAbout: 'About',
    countdownTitle: 'Next JLPT',
    countdownDate: 'December 6, 2026',
    countdownSource: 'Date based on the official 2026 JLPT schedule.',
    days: 'days',
    hours: 'hours',
    minutes: 'minutes',
    heroTitle: 'Turn daily Japanese questions into a reviewable JLPT deck',
    heroBody: 'Use chat for capture and structuring, then use the web app for module-based review. It is local-first now and ready for accounts later.',
    moduleVocabularyTitle: 'Vocabulary Module',
    moduleVocabularyBody: 'JLPT vocabulary, paraphrase, orthography, and kanji-reading questions.',
    moduleGrammarTitle: 'Grammar Module',
    moduleGrammarBody: 'Patterns, connections, nuance differences, and sentence explanations.',
    moduleListeningTitle: 'Listening Module',
    moduleListeningBody: 'Reserved for audio, keywords, scene judgment, and listening mistakes.',
    moduleReadingTitle: 'Reading Module',
    moduleReadingBody: 'Reserved for passage structure, references, main ideas, and detail questions.',
    moduleMixedTitle: 'Mixed Practice',
    moduleMixedBody: 'Mix all modules for exam review and weak-point checks.',
    moduleEmptyTitle: 'No content in this module yet',
    moduleEmptyBody: 'Add matching study material through the skill, then this area will generate practice and explanations.',
    aboutTitle: 'About This App',
    aboutBody: 'This is a local-first JLPT study tool. You can structure your own questions or generate a general plan from a target level and study duration. The web app handles review, scoring, and browser-local progress.',
    deployTitle: 'Deploy Your Own',
    deployBody: 'Fork the GitHub repo, keep the sample data or run npm run data:blank, then deploy it to Cloudflare Pages.',
    deck: 'Deck',
    meaningTypeTitle: 'JLPT Question Type',
    meaningTypeIntroTitle: 'JLPT Question Type',
    meaningTypeIntroBody: 'Practice mixes common JLPT vocabulary and grammar formats automatically. The app generates contextual vocabulary, paraphrase, kanji-reading, suitable orthography questions, and sentence grammar questions when the item supports them.',
    answerFeedbackMode: 'Answer Feedback',
    feedbackModeImmediate: 'Show result right after each answer',
    feedbackModeBatch: 'Show results after completing all answers',
    display: 'Display',
    language: 'Language',
    reviewRuby: 'Show furigana in review',
    explanationRuby: 'Show furigana in explanations',
    furigana: 'Furigana',
    japaneseMeaning: 'Japanese definition',
    localizedMeaning: 'English definition',
    examQuickNote: 'Exam quick note',
    collocationsLabel: 'Common combinations',
    noQuestion: 'No questions',
    noQuestionBody: 'No questions match the current filters.',
    meaningTitle: 'Paraphrase',
    meaningInstruction: '下線の言葉に意味が最も近いものを、１・２・３・４から一つ選びなさい。',
    kanaToKanjiTitle: 'Orthography',
    kanaToKanjiInstruction: '下線の言葉を漢字で書くとき、最もよいものを、１・２・３・４から一つ選びなさい。',
    kanjiToKanaTitle: 'Kanji Reading',
    kanjiToKanaInstruction: '下線の言葉の読み方として最もよいものを、１・２・３・４から一つ選びなさい。',
    nameReadingTitle: 'Supplement: Name Reading',
    nameReadingInstruction: 'Choose the best recorded reading of the underlined personal or place name.',
    grammar: 'Sentence Grammar 1',
    grammarTitle: 'Sentence Grammar 1',
    grammarInstruction: '次の文の（　）に入れるのに最もよいものを、１・２・３・４から一つ選びなさい。',
    mojiGoiTitle: 'Contextual Vocabulary',
    mojiGoiInstruction: '（　）に入れるのに最もよいものを、１・２・３・４から一つ選びなさい。',
    yourAnswer: 'Your answer',
    rightAnswer: 'Correct answer',
    wrong: 'Incorrect',
    prev: 'Previous',
    next: 'Next',
    analysis: 'Analysis',
    reviewSummaryTitle: 'Attempt Review',
    reviewSummaryBody: 'When answers are hidden until completion, this page collects per-question explanations, history, and next-step suggestions.',
    historyTitle: 'Attempt History',
    latestAttempt: 'Latest',
    startedAt: 'Started',
    completedAt: 'Completed',
    elapsed: 'Time',
    accuracy: 'Accuracy',
    wrongQuestions: 'Missed',
    suggestionLabel: 'Suggestion',
    suggestionAllCorrect: 'Perfect round. Mix in another module next, or review later to check long-term recall.',
    suggestionReviewWrong: 'Review why each missed choice fails, then export the misses for AI-generated similar practice.',
    suggestionLowAccuracy: 'Accuracy is low. Revisit the related entries in Read mode before repeating this module.',
    noAttemptHistory: 'No completed practice attempts yet.',
    backToPractice: 'Back to Practice',
    aiSuggestionPromptLabel: 'AI Prompt Seed',
    contextLabel: 'Full Context',
    correctReasonLabel: 'Why It Is Correct',
    choiceAnalysisLabel: 'Choice Analysis',
    memoryPointLabel: 'Memory Point',
    choiceFits: 'Fits',
    choiceDoesNotFit: 'Does not fit',
    contact: 'Contact',
    intro: 'Turn your Codex or Claude Code study chats into a local browser deck for JLPT vocabulary, paraphrase, orthography, and kanji-reading practice.',
  },
} satisfies Record<Locale, Record<string, string>>;

const fallbackData: ReviewData = {
  generated_at: '2026-08-27T20:20:00+09:00',
  items: [],
};

const defaultSettings: DisplaySettings = {
  showReviewRuby: true,
  showExplanationRuby: true,
  locale: 'zh-CN',
  feedbackMode: 'immediate',
};

const NEXT_JLPT_AT = '2026-12-06T09:00:00+09:00';
const JLPT_OFFICIAL_URL = 'https://www.jlpt.jp/e/';

const defaultRubyTerms: RubyTerm[] = [
  { text: '一定', reading: 'いってい' },
  { text: '方法', reading: 'ほうほう' },
  { text: '器具', reading: 'きぐ' },
  { text: '使って', reading: 'つかって' },
  { text: '数値', reading: 'すうち' },
  { text: '正確', reading: 'せいかく' },
  { text: '調べる', reading: 'しらべる' },
  { text: '照らして', reading: 'てらして' },
  { text: '認める', reading: 'みとめる' },
  { text: '年を追う', reading: 'としをおう' },
  { text: '進む', reading: 'すすむ' },
  { text: '時間', reading: 'じかん' },
  { text: '過ぎる', reading: 'すぎる' },
  { text: '物事', reading: 'ものごと' },
  { text: '進んで', reading: 'すすんで' },
  { text: '後', reading: 'ご' },
  { text: '様子', reading: 'ようす' },
  { text: '大まか', reading: 'おおまか' },
  { text: '見渡す', reading: 'みわたす' },
  { text: '教育', reading: 'きょういく' },
  { text: '訓練', reading: 'くんれん' },
  { text: '能力', reading: 'のうりょく' },
  { text: '育てる', reading: 'そだてる' },
  { text: 'て形', reading: 'てけい' },
  { text: '押す', reading: 'おす' },
  { text: '実際', reading: 'じっさい' },
  { text: '経る', reading: 'へる' },
  { text: '数量', reading: 'すうりょう' },
  { text: '多く', reading: 'おおく' },
  { text: '十分', reading: 'じゅうぶん' },
  { text: '日本人', reading: 'にほんじん' },
  { text: '日本', reading: 'にほん' },
  { text: '使われる', reading: 'つかわれる' },
  { text: '姓名', reading: 'せいめい' },
  { text: '姓', reading: 'せい' },
  { text: '一般', reading: 'いっぱん' },
  { text: '読み方', reading: 'よみかた' },
  { text: '読む', reading: 'よむ' },
  { text: '名前', reading: 'なまえ' },
  { text: '女性名', reading: 'じょせいめい' },
  { text: '地名', reading: 'ちめい' },
  { text: '表記', reading: 'ひょうき' },
  { text: '候補', reading: 'こうほ' },
  { text: '距離', reading: 'きょり' },
  { text: '程度', reading: 'ていど' },
  { text: '非常', reading: 'ひじょう' },
  { text: '離れて', reading: 'はなれて' },
  { text: '人名', reading: 'じんめい' },
  { text: '苦しさ', reading: 'くるしさ' },
  { text: '不便', reading: 'ふべん' },
  { text: '耐える', reading: 'たえる' },
  { text: '書籍', reading: 'しょせき' },
  { text: '一覧', reading: 'いちらん' },
  { text: '並べた', reading: 'ならべた' },
  { text: '章', reading: 'しょう' },
  { text: '順', reading: 'じゅん' },
  { text: '測定機器', reading: 'そくていきき' },
  { text: '日本経済', reading: 'にほんけいざい' },
  { text: '近代文学', reading: 'きんだいぶんがく' },
  { text: '海外経験', reading: 'かいがいけいけん' },
  { text: '安全基準', reading: 'あんぜんきじゅん' },
  { text: '調査結果', reading: 'ちょうさけっか' },
  { text: '測定結果', reading: 'そくていけっか' },
  { text: '測定値', reading: 'そくていち' },
  { text: '専門家', reading: 'せんもんか' },
  { text: '三時間', reading: 'さんじかん' },
  { text: '十年', reading: 'じゅうねん' },
  { text: '治療後', reading: 'ちりょうご' },
  { text: '手術後', reading: 'しゅじゅつご' },
  { text: '専門的', reading: 'せんもんてき' },
  { text: '判断力', reading: 'はんだんりょく' },
  { text: '指導者', reading: 'しどうしゃ' },
  { text: '手続き', reading: 'てつづき' },
  { text: '必要', reading: 'ひつよう' },
  { text: '正式', reading: 'せいしき' },
  { text: '手順', reading: 'てじゅん' },
  { text: '決定', reading: 'けってい' },
  { text: '段階', reading: 'だんかい' },
  { text: '学習', reading: 'がくしゅう' },
  { text: '今後', reading: 'こんご' },
  { text: '方針', reading: 'ほうしん' },
  { text: '地域', reading: 'ちいき' },
  { text: '自然', reading: 'しぜん' },
  { text: '種類', reading: 'しゅるい' },
  { text: '知識', reading: 'ちしき' },
  { text: '資源', reading: 'しげん' },
  { text: '栄養', reading: 'えいよう' },
  { text: '語彙', reading: 'ごい' },
  { text: '遠く', reading: 'とおく' },
  { text: '予想', reading: 'よそう' },
  { text: '上回る', reading: 'うわまわる' },
  { text: '苦しい', reading: 'くるしい' },
  { text: '時期', reading: 'じき' },
  { text: '我慢', reading: 'がまん' },
  { text: '忍耐', reading: 'にんたい' },
  { text: '文書', reading: 'ぶんしょ' },
  { text: '内容', reading: 'ないよう' },
  { text: '項目', reading: 'こうもく' },
  { text: '順番', reading: 'じゅんばん' },
  { text: '詳しい', reading: 'くわしい' },
  { text: '索引', reading: 'さくいん' },
  { text: '血圧', reading: 'けつあつ' },
  { text: '温度', reading: 'おんど' },
  { text: '室内', reading: 'しつない' },
  { text: '機械', reading: 'きかい' },
  { text: '性能', reading: 'せいのう' },
  { text: '結果', reading: 'けっか' },
  { text: '製品', reading: 'せいひん' },
  { text: '基準', reading: 'きじゅん' },
  { text: '資格', reading: 'しかく' },
  { text: '事実', reading: 'じじつ' },
  { text: '状態', reading: 'じょうたい' },
  { text: '認証', reading: 'にんしょう' },
  { text: '承認', reading: 'しょうにん' },
  { text: '指定', reading: 'してい' },
  { text: '物価', reading: 'ぶっか' },
  { text: '上昇', reading: 'じょうしょう' },
  { text: '人口', reading: 'じんこう' },
  { text: '減少', reading: 'げんしょう' },
  { text: '技術', reading: 'ぎじゅつ' },
  { text: '進歩', reading: 'しんぽ' },
  { text: '毎年', reading: 'まいとし' },
  { text: '徐々', reading: 'じょじょ' },
  { text: '経過', reading: 'けいか' },
  { text: '事故', reading: 'じこ' },
  { text: '事件', reading: 'じけん' },
  { text: '過程', reading: 'かてい' },
  { text: '経緯', reading: 'けいい' },
  { text: '病気', reading: 'びょうき' },
  { text: '順調', reading: 'じゅんちょう' },
  { text: '概観', reading: 'がいかん' },
  { text: '歴史', reading: 'れきし' },
  { text: '本章', reading: 'ほんしょう' },
  { text: '全体', reading: 'ぜんたい' },
  { text: '動向', reading: 'どうこう' },
  { text: '状況', reading: 'じょうきょう' },
  { text: '概要', reading: 'がいよう' },
  { text: '概略', reading: 'がいりゃく' },
  { text: '概況', reading: 'がいきょう' },
  { text: '養成', reading: 'ようせい' },
  { text: '読書', reading: 'どくしょ' },
  { text: '習慣', reading: 'しゅうかん' },
  { text: '人材', reading: 'じんざい' },
  { text: '講座', reading: 'こうざ' },
  { text: '育成', reading: 'いくせい' },
  { text: '養う', reading: 'やしなう' },
  { text: '踏んで', reading: 'ふんで' },
  { text: '踏む', reading: 'ふむ' },
  { text: '犬', reading: 'いぬ' },
  { text: '足', reading: 'あし' },
  { text: '申請', reading: 'しんせい' },
  { text: '豊富', reading: 'ほうふ' },
  { text: '遥か', reading: 'はるか' },
  { text: '遥', reading: 'はるか' },
  { text: '昔', reading: 'むかし' },
  { text: '出来事', reading: 'できごと' },
  { text: '辛抱', reading: 'しんぼう' },
  { text: '目次', reading: 'もくじ' },
  { text: '服部', reading: 'はっとり' },
  { text: '智里', reading: 'ちさと' },
  { text: '佐野', reading: 'さの' },
  { text: '智子', reading: 'ともこ' },
  { text: '新谷', reading: 'しんたに' },
];

export default function App() {
  const [data, setData] = useState<ReviewData>(fallbackData);
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
  const [filtersCollapsed, setFiltersCollapsed] = useState(() => shouldCollapseFilters());
  const [countdown, setCountdown] = useState(() => getCountdown(NEXT_JLPT_AT));
  const activeView = route.view;
  const studyPage = route.page;

  useEffect(() => {
    fetch('/data/review-data.json')
      .then((response) => response.json())
      .then((json: ReviewData) => setData(json))
      .catch(() => setData(fallbackData));

    setProgress(readStorage(STORAGE_PROGRESS, {}));
    setAnswers(readStorage(STORAGE_ANSWERS, {}));
    setAttemptHistory(readStorage(STORAGE_ATTEMPT_HISTORY, []));
    setActiveAttempt(readStorage(STORAGE_ACTIVE_ATTEMPT, null));
    setSettings(normalizeSettings(readStorage(STORAGE_SETTINGS, defaultSettings)));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setCountdown(getCountdown(NEXT_JLPT_AT)), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, '', routeHash('home', 'questions'));
    }

    function handleHashChange() {
      setRoute(routeFromHash(window.location.hash));
      setFiltersCollapsed(shouldCollapseFilters());
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
  const questionTypeIntros = [{ title: labels.meaningTypeTitle, instruction: labels.meaningTypeIntroBody }];
  const hasStudySidebar = activeView === 'vocabulary' || activeView === 'grammar' || activeView === 'mixed';
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
      if (studyPage !== 'words' || activeView === 'home' || activeView === 'about' || activeView === 'settings' || activeView === 'listening' || activeView === 'reading') {
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
    setAnswers(nextAnswers);
    setProgress(nextProgress);
    writeStorage(STORAGE_ANSWERS, nextAnswers);
    writeStorage(STORAGE_PROGRESS, nextProgress);

    const completed = questions.length > 0 && questions.every((candidate) => Boolean(nextAnswers[candidate.id]));
    if (completed) {
      const completedAttempt = completeAttempt(nextAttempt, nextAnswers, questions, now);
      const nextHistory = upsertAttemptHistory(attemptHistory, completedAttempt);
      setActiveAttempt(null);
      setAttemptHistory(nextHistory);
      localStorage.removeItem(STORAGE_ACTIVE_ATTEMPT);
      writeStorage(STORAGE_ATTEMPT_HISTORY, nextHistory);
      if (settings.feedbackMode === 'batch' && supportsStudyPage(activeView)) {
        window.location.hash = routeHash(activeView, 'review');
      }
      return;
    }

    setActiveAttempt(nextAttempt);
    writeStorage(STORAGE_ACTIVE_ATTEMPT, nextAttempt);
  }

  function restartPractice() {
    const questionIds = new Set(questions.map((question) => question.id));
    const nextAnswers = Object.fromEntries(
      Object.entries(answers).filter(([questionId]) => !questionIds.has(questionId)),
    );
    const nextAttempt = createPracticeAttempt(activeView, selectedDeck, questions, new Date());
    setAnswers(nextAnswers);
    setActiveAttempt(nextAttempt);
    writeStorage(STORAGE_ANSWERS, nextAnswers);
    writeStorage(STORAGE_ACTIVE_ATTEMPT, nextAttempt);
    setActiveIndex(0);
    if (supportsStudyPage(activeView)) {
      window.location.hash = routeHash(activeView, 'questions');
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }

  function navigateTo(view: AppView, page: StudyPage = studyPage) {
    const nextRoute = { view, page: supportsStudyPage(view) ? page : 'questions' as StudyPage };
    const nextHash = routeHash(nextRoute.view, nextRoute.page);
    if (window.location.hash === nextHash) {
      setRoute(nextRoute);
      setFiltersCollapsed(shouldCollapseFilters());
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

  function resetLocalProgress() {
    if (!window.confirm(labels.resetConfirm)) {
      return;
    }
    setAnswers({});
    setProgress({});
    setAttemptHistory([]);
    setActiveAttempt(null);
    localStorage.removeItem(STORAGE_ANSWERS);
    localStorage.removeItem(STORAGE_PROGRESS);
    localStorage.removeItem(STORAGE_ATTEMPT_HISTORY);
    localStorage.removeItem(STORAGE_ACTIVE_ATTEMPT);
  }

  function updateSettings(nextSettings: DisplaySettings) {
    const normalized = normalizeSettings(nextSettings);
    setSettings(normalized);
    writeStorage(STORAGE_SETTINGS, normalized);
  }

  function exportStudyRecord() {
    const exportedAt = new Date().toISOString();
    const payload = {
      exported_at: exportedAt,
      app: 'JLPT Review',
      data_generated_at: data.generated_at,
      locale,
      summary: {
        items: data.items.length,
        questions: allQuestions.length,
        answered: answeredCount,
        correct: correctCount,
        mastered: masteredCount,
      },
      items: data.items.map((item) => ({
        id: item.id,
        deck: item.deck,
        type: item.type,
        jlpt_level: item.jlpt_level,
        original: item.original,
        reading: item.reading,
        meaning_ja: item.meaning_ja,
        meaning: itemMeaning(item, locale),
        input_at: item.input_at,
      })),
      answers,
      progress,
      attempt_history: attemptHistory,
      settings,
      ai_prompt: [
        '请分析这份 JLPT 学习记录。',
        '请找出我的薄弱模块、容易错的题型、需要提前复习的词条。',
        '请按照 Anki/遗忘曲线思想，为接下来 7 天生成复习计划。',
        '请基于错题和即将到期的 nextReviewAt，生成新的 JLPT 练习题和解析。',
      ].join('\n'),
    };
    downloadJSON(`jlpt-study-record-${exportedAt.slice(0, 10)}.json`, payload);
  }

  return (
    <main className="flex min-h-screen max-w-full flex-col overflow-x-hidden bg-[#f5f7f3] text-[#1f2522]">
      <header className="sticky top-0 z-20 border-b border-[#d7dfd6] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl min-w-0 flex-col gap-3 px-4 py-3 md:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => navigateTo('home')} className="text-lg font-semibold tracking-normal text-[#173d35]">
              {labels.brand}
            </button>
            <a className="rounded-md border border-[#d7dfd6] px-3 py-2 text-sm font-semibold text-[#24473f] lg:hidden" href="https://github.com/erzhiqianyi/jlpt-master-deck" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
          <nav className="flex min-w-0 max-w-full gap-2 overflow-x-auto pb-1 lg:pb-0">
            {navItems(labels).map((item) => (
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
        </div>
      </header>

      {activeView === 'home' ? (
        <>
          <section className="mx-auto grid max-w-7xl min-w-0 gap-4 px-4 py-5 md:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-10">
            <div className="min-w-0 rounded-lg border border-[#d7dfd6] bg-white p-5 shadow-sm md:p-6">
              <p className="text-sm font-semibold text-[#7d6032]">Local-first JLPT system</p>
              <h1 className="mt-2 max-w-3xl text-3xl font-semibold leading-tight md:text-4xl">{labels.heroTitle}</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-[#5f625b]">{labels.heroBody}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Metric label={labels.items} value={data.items.length.toString()} />
                <Metric label={labels.questions} value={allQuestions.length.toString()} />
                <Metric label={labels.answered} value={answeredCount.toString()} />
                <Metric label={labels.correct} value={correctCount.toString()} />
                <Metric label={labels.mastered} value={masteredCount.toString()} />
              </div>
            </div>
            <CountdownCard countdown={countdown} labels={labels} />
          </section>

          <section className="mx-auto grid max-w-7xl min-w-0 gap-4 px-4 pb-5 md:grid-cols-2 md:px-8 lg:grid-cols-5 lg:px-10">
            {moduleStats.map((module) => (
              <ModuleCard key={module.view} module={module} active={false} onClick={() => navigateTo(module.view)} />
            ))}
          </section>
          <section className="mx-auto max-w-7xl min-w-0 px-4 pb-8 md:px-8 lg:px-10">
            <Panel title={labels.meaningTypeIntroTitle}>
              <p className="text-sm text-[#68716c]">{labels.meaningTypeIntroBody}</p>
              <div className="mt-4">
                {questionTypeIntros.map((intro) => (
                  <div key={intro.title} className="rounded-md border border-[#d9d0c3] bg-[#fffdfa] p-3">
                    <p className="text-sm font-semibold text-[#24473f]">{intro.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[#5f625b]">{intro.instruction}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </section>
        </>
      ) : null}

      {activeView !== 'home' ? (
        <section className={`mx-auto grid w-full max-w-7xl min-w-0 flex-1 gap-5 px-4 py-4 md:px-8 md:py-5 lg:px-10 ${hasStudySidebar ? (filtersCollapsed ? 'lg:grid-cols-[72px_minmax(0,1fr)]' : 'lg:grid-cols-[280px_minmax(0,1fr)]') : ''}`}>
          {hasStudySidebar ? (
            <aside className="space-y-4">
              <div className={filtersCollapsed ? 'lg:hidden' : ''}>
                <StudyModeSwitch
                  mode={studyPage}
                  labels={labels}
                  onChange={(page) => navigateTo(activeView, page)}
                />
              </div>

              <button
                type="button"
                onClick={() => setFiltersCollapsed((value) => !value)}
                className="h-10 w-full rounded-md border border-[#c8bcae] bg-white px-3 text-sm font-semibold text-[#24473f] shadow-sm hover:bg-[#f2f6f1]"
              >
                {filtersCollapsed ? labels.filters : labels.hideFilters}
              </button>

              {!filtersCollapsed && (activeView === 'vocabulary' || activeView === 'mixed') ? (
                <Panel title={labels.deck}>
                  <div className="grid gap-2">
                    {(Object.keys(deckLabels) as (Deck | 'all')[]).map((deck) => (
                      <SegmentButton key={deck} active={selectedDeck === deck} onClick={() => setSelectedDeck(deck)}>
                        {deckLabels[deck]}
                      </SegmentButton>
                    ))}
                  </div>
                </Panel>
              ) : null}

              
            </aside>
          ) : null}

          <div className={hasStudySidebar ? 'min-w-0 space-y-5' : 'min-w-0'}>
            {activeView === 'about' ? <AboutPanel labels={labels} /> : null}
            {activeView === 'settings' ? (
              <Panel title={labels.settings}>
                <div className="grid gap-4 md:grid-cols-2">
                  <SettingBlock title={labels.language}>
                    <LanguageSelect value={settings.locale} onChange={(locale) => updateSettings({ ...settings, locale })} />
                  </SettingBlock>
                <SettingBlock title={labels.display}>
                  <div className="space-y-3">
                    <Toggle checked={settings.showReviewRuby} label={labels.reviewRuby} onChange={(checked) => updateSettings({ ...settings, showReviewRuby: checked })} />
                    <Toggle checked={settings.showExplanationRuby} label={labels.explanationRuby} onChange={(checked) => updateSettings({ ...settings, showExplanationRuby: checked })} />
                  </div>
                </SettingBlock>
                <SettingBlock title={labels.answerFeedbackMode}>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateSettings({ ...settings, feedbackMode: 'immediate' })}
                      className={`h-11 rounded-md border px-3 text-sm font-semibold ${
                        settings.feedbackMode === 'immediate' ? 'border-[#24473f] bg-[#24473f] text-white' : 'border-[#d9d0c3] bg-white text-[#4f5651]'
                      }`}
                    >
                      {labels.feedbackModeImmediate}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSettings({ ...settings, feedbackMode: 'batch' })}
                      className={`h-11 rounded-md border px-3 text-sm font-semibold ${
                        settings.feedbackMode === 'batch' ? 'border-[#24473f] bg-[#24473f] text-white' : 'border-[#d9d0c3] bg-white text-[#4f5651]'
                      }`}
                    >
                      {labels.feedbackModeBatch}
                    </button>
                  </div>
                </SettingBlock>
                  <SettingBlock title={labels.exportStudyRecord}>
                    <p className="text-sm leading-6 text-[#5f625b]">{labels.exportStudyRecordBody}</p>
                    <button type="button" onClick={exportStudyRecord} className="mt-4 rounded-md bg-[#173d35] px-4 py-2 text-sm font-semibold text-white">
                      {labels.exportStudyRecordButton}
                    </button>
                  </SettingBlock>
                  <SettingBlock title={labels.reset}>
                    <p className="text-sm leading-6 text-[#5f625b]">{labels.resetProgressBody}</p>
                    <button type="button" onClick={resetLocalProgress} className="mt-4 rounded-md border border-[#b65842] bg-white px-4 py-2 text-sm font-semibold text-[#9b412e] hover:bg-[#fae9e2]">
                      {labels.reset}
                    </button>
                  </SettingBlock>
                </div>
              </Panel>
            ) : null}
            {activeView === 'listening' || activeView === 'reading' ? <EmptyModule labels={labels} /> : null}
            {activeView !== 'about' && activeView !== 'settings' && activeView !== 'listening' && activeView !== 'reading' ? (
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
                />
              ) : studyPage === 'words' ? (
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

function buildQuestions(items: VocabItem[], locale: Locale): Question[] {
  const labels = translations[locale];
  const questions: Question[] = [];

  items.forEach((item, index) => {
    const allowedKinds = new Set(questionKindsForItem(item));
    const example = item.examples?.[0]?.ja;
    const sentence = questionSentence(item);
    const kanaSentence = item.reading ? questionSentence(item, item.reading) : sentence;
    const context = example ?? sentence;

    if (allowedKinds.has('grammar')) {
      questions.push(buildGrammarQuestion(item, items, index, locale));
    }

    if (allowedKinds.has('moji_goi')) {
      questions.push(buildMojiGoiQuestion(item, items, index, locale));
    }

    if (allowedKinds.has('meaning')) {
      const meaningAnswer = item.paraphrase_ja ?? item.meaning_ja;
      if (!meaningAnswer) {
        return;
      }
      const meaningChoices = choices(meaningAnswer, questionPool(item, 'meaning', items), index + 1, fallbackChoicesForKind(item, 'meaning'));
      questions.push({
        id: `${item.id}-meaning-jlpt-v1`,
        itemId: item.id,
        kind: 'meaning',
        title: labels.meaningTitle,
        instruction: labels.meaningInstruction,
        prompt: sentence,
        promptTarget: item.original,
        choices: meaningChoices,
        answer: meaningAnswer,
        ...buildQuestionExplanation(item, meaningChoices, 'meaning', items, locale, context),
      });
    }

    if (item.reading && allowedKinds.has('kanji_to_kana')) {
      const isProperName = item.deck === 'name_reading' || item.type === 'proper_name';
      const kanjiToKanaChoices = choices(item.reading, questionPool(item, 'kanji_to_kana', items), index + 3, fallbackChoicesForKind(item, 'kanji_to_kana'));
      questions.push({
        id: isProperName ? `${item.id}-name-reading-v1` : `${item.id}-kanji-to-kana-jlpt-v1`,
        itemId: item.id,
        kind: 'kanji_to_kana',
        title: isProperName ? labels.nameReadingTitle : labels.kanjiToKanaTitle,
        instruction: isProperName ? labels.nameReadingInstruction : labels.kanjiToKanaInstruction,
        prompt: sentence,
        promptTarget: item.original,
        choices: kanjiToKanaChoices,
        answer: item.reading,
        ...buildQuestionExplanation(item, kanjiToKanaChoices, 'kanji_to_kana', items, locale, context),
      });
    }

    if (item.reading && allowedKinds.has('kana_to_kanji')) {
      const kanaToKanjiChoices = choices(item.original, questionPool(item, 'kana_to_kanji', items), index + 2, fallbackChoicesForKind(item, 'kana_to_kanji'));
      questions.push({
        id: `${item.id}-kana-to-kanji-jlpt-v1`,
        itemId: item.id,
        kind: 'kana_to_kanji',
        title: labels.kanaToKanjiTitle,
        instruction: labels.kanaToKanjiInstruction,
        prompt: kanaSentence,
        promptTarget: item.reading,
        choices: kanaToKanjiChoices,
        answer: item.original,
        ...buildQuestionExplanation(item, kanaToKanjiChoices, 'kana_to_kanji', items, locale, context),
      });
    }
  });

  return questions;
}

function questionKindsForItem(item: VocabItem): QuestionKind[] {
  if (item.deck === 'name_reading' || item.type === 'proper_name') {
    return item.reading && containsKanji(item.original) && fallbackChoicesForKind(item, 'kanji_to_kana').length >= 3
      ? ['kanji_to_kana']
      : [];
  }

  const hasContext = hasUsableQuestionContext(item);
  const isGrammarItem = item.deck === 'grammar_expression' || item.type === 'verb_form' || item.type === 'expression';
  const inferredKinds: QuestionKind[] = [];

  if (isGrammarItem) {
    if (hasContext) {
      inferredKinds.push('grammar');
    }
    if (item.paraphrase_ja || item.meaning_ja) {
      inferredKinds.push('meaning');
    }
  } else {
    if (hasContext) {
      inferredKinds.push('moji_goi');
    }
    if (item.paraphrase_ja || item.meaning_ja) {
      inferredKinds.push('meaning');
    }
    if (hasContext && item.reading && containsKanji(item.original) && questionPool(item, 'kanji_to_kana', [item]).length >= 3) {
      inferredKinds.push('kanji_to_kana');
      if (['N2', 'N3', 'N4', 'N5'].includes(item.jlpt_level ?? '')) {
        inferredKinds.push('kana_to_kanji');
      }
    }
  }

  const listedKinds = item.question_kinds ?? [];
  return unique([...inferredKinds, ...listedKinds]).filter((kind) => {
    if (kind === 'grammar') return isGrammarItem && hasContext;
    if (kind === 'moji_goi') return hasContext;
    if (kind === 'meaning') return Boolean(item.paraphrase_ja || item.meaning_ja);
    if (kind === 'kana_to_kanji') return hasContext && Boolean(item.reading) && containsKanji(item.original) && item.jlpt_level !== 'N1';
    if (kind === 'kanji_to_kana') return hasContext && Boolean(item.reading) && containsKanji(item.original) && questionPool(item, 'kanji_to_kana', [item]).length >= 3;
    return false;
  });
}

function hasUsableQuestionContext(item: VocabItem) {
  return Boolean(
    item.examples?.some((candidate) => candidate.ja.includes(item.original))
    || item.collocations?.some((candidate) => candidate.includes(item.original)),
  );
}

function containsKanji(value: string) {
  return /[\u3400-\u9fff々〆ヵヶ]/u.test(value);
}

function questionPool(item: VocabItem, kind: QuestionKind, items: VocabItem[]) {
  const controlledDistractors = item.question_distractors?.[kind];
  if (controlledDistractors) {
    return controlledDistractors;
  }

  const suitableItems = items.filter(
    (candidate) => candidate.id !== item.id && questionKindsForItem(candidate).includes(kind),
  );
  const sameDeckItems = suitableItems.filter((candidate) => candidate.deck === item.deck);
  const candidates = sameDeckItems.length >= 3 ? sameDeckItems : suitableItems;

  if (kind === 'meaning') {
    return candidates.map((candidate) => candidate.paraphrase_ja).filter(Boolean) as string[];
  }
  if (kind === 'kanji_to_kana') {
    const nameReadingFallback = item.deck === 'name_reading' || item.type === 'proper_name'
      ? ['さとう', 'たなか', 'やまだ', 'すずき', 'はるか', 'ともこ', 'ちさと', 'しんたに', 'はっとり']
      : [];
    return unique([...readingDistractors(item.reading ?? ''), ...nameReadingFallback]).filter((choice) => choice !== item.reading);
  }
  return candidates.map((candidate) => candidate.original);
}

function readingDistractors(reading: string) {
  const replacements: [string, string][] = [
    ['てい', 'たい'],
    ['せい', 'しょう'],
    ['せい', 'さい'],
    ['せい', 'せ'],
    ['しょう', 'せい'],
    ['こう', 'こ'],
    ['そう', 'そ'],
    ['けい', 'け'],
    ['ぼう', 'ほう'],
    ['ほう', 'ぼう'],
    ['かん', 'がん'],
    ['にん', 'じん'],
    ['く', 'っ'],
    ['っ', 'く'],
  ];
  const variants = replacements
    .map(([source, target]) => reading.includes(source) ? reading.replace(source, target) : '')
    .filter(Boolean);
  const synthetic = [
    reading.replace(/う$/u, ''),
    reading.replace(/(.)\1/u, '$1'),
    reading.replace('ん', 'っ'),
    reading.replace('ん', 'い'),
    reading.replace('ん', 'んで'),
    reading.length > 2 ? `${reading.slice(0, -1)}い` : '',
    `${reading.slice(0, Math.max(1, reading.length - 1))}ん`,
  ];
  return unique([...variants, ...synthetic].filter((value) => value && value !== reading)).slice(0, 6);
}

function deckLabelsFor(locale: Locale): Record<Deck | 'all', string> {
  const labels = translations[locale];
  return {
    all: labels.deckAll,
    n1_vocab: labels.deckN1,
    grammar_expression: labels.deckExpression,
    name_reading: labels.deckName,
  };
}

function buildGrammarQuestion(item: VocabItem, allItems: VocabItem[], index: number, locale: Locale): Question {
  const labels = translations[locale];
  const example = item.examples?.find((candidate) => candidate.ja.includes(item.original))?.ja;
  const context = example ?? questionSentence(item);
  const prompt = example ? example.replace(item.original, '（　）') : questionSentence(item, '（　）');
  const choiceList = choices(item.original, questionPool(item, 'grammar', allItems), index + 5, fallbackChoicesForKind(item, 'grammar'));

  return {
    id: `${item.id}-grammar-jlpt-v1`,
    itemId: item.id,
    kind: 'grammar',
    title: labels.grammarTitle,
    instruction: labels.grammarInstruction,
    prompt,
    choices: choiceList,
    answer: item.original,
    ...buildQuestionExplanation(item, choiceList, 'grammar', allItems, locale, context),
  };
}

function buildMojiGoiQuestion(item: VocabItem, allItems: VocabItem[], index: number, locale: Locale): Question {
  const labels = translations[locale];
  const example = item.examples?.find((candidate) => candidate.ja.includes(item.original))?.ja;
  const context = example ?? questionSentence(item);
  const prompt = context.replace(item.original, '（　）');
  const choiceList = choices(item.original, questionPool(item, 'moji_goi', allItems), index + 4, fallbackChoicesForKind(item, 'moji_goi'));

  return {
    id: `${item.id}-moji-goi-jlpt-v1`,
    itemId: item.id,
    kind: 'moji_goi',
    title: labels.mojiGoiTitle,
    instruction: labels.mojiGoiInstruction,
    prompt,
    choices: choiceList,
    answer: item.original,
    ...buildQuestionExplanation(item, choiceList, 'moji_goi', allItems, locale, context),
  };
}

function buildQuestionExplanation(
  item: VocabItem,
  choiceList: string[],
  kind: QuestionKind,
  allItems: VocabItem[],
  locale: Locale,
  context: string,
): Pick<Question, 'context' | 'correctReason' | 'memoryPoint' | 'choiceAnalysis'> {
  const answer = answerForKind(item, kind, locale);
  return {
    context,
    correctReason: correctReasonFor(item, kind, locale, context),
    memoryPoint: memoryPointFor(item, locale),
    choiceAnalysis: choiceList.map((choice) => ({
      choice,
      correct: choice === answer,
      explanation: choiceExplanationFor(choice, choice === answer, item, kind, allItems, locale),
    })),
  };
}

function answerForKind(item: VocabItem, kind: QuestionKind, locale: Locale) {
  if (kind === 'meaning') {
    return item.paraphrase_ja ?? shortMeaning(itemMeaning(item, locale));
  }
  if (kind === 'kanji_to_kana') {
    return item.reading ?? '';
  }
  return item.original;
}

function correctReasonFor(item: VocabItem, kind: QuestionKind, locale: Locale, context: string) {
  const meaning = itemMeaning(item, locale);
  const reading = item.reading ?? '';
  const collocation = item.collocations?.find((value) => value.includes(item.original)) ?? context;
  const isProperNameReading = kind === 'kanji_to_kana' && (item.deck === 'name_reading' || item.type === 'proper_name');

  if (isProperNameReading) {
    if (locale === 'ja') return `この項目では「${item.original}」という人名・地名のまとまりを「${reading}」と読みます。人名の読みは漢字一字ずつから一意に決められないため、教材・音声・本人の表記など、信頼できる出典に基づく読みを答えます。`;
    if (locale === 'en') return `In this entry, the full personal or place name “${item.original}” is read “${reading}.” Name readings cannot always be derived uniquely from each kanji, so the answer follows the reading established by the source.`;
    return `本词条记录的整体人名或地名「${item.original}」读作「${reading}」。人名读音通常不能按单个汉字机械拼接，因此应以教材、音频或本人标注等可靠来源为准。`;
  }

  if (locale === 'ja') {
    if (kind === 'grammar') return `「${context}」では、手順や手続きを実際に経ることを表す「${item.original}」が文の接続と意味に合います。${itemAnalysis(item, locale)}`;
    if (kind === 'meaning') return `「${item.original}」は「${meaning}」という意味です。「${context}」でもこの意味で使われているため、この言い換えが最も適切です。`;
    if (kind === 'kana_to_kanji') return `「${reading}」の表記は「${item.original}」です。「${context}」の語彙と一致し、意味は「${meaning}」です。`;
    if (kind === 'kanji_to_kana') return `「${item.original}」の読みは「${reading}」です。文中でも意味は「${meaning}」で、読み方は変わりません。`;
    return `「${item.original}」は「${meaning}」を表します。「${collocation}」のような結び付きが自然で、文脈に最も合います。`;
  }

  if (locale === 'en') {
    if (kind === 'grammar') return `In “${context},” “${item.original}” fits both the sentence connection and the intended function of actually going through a step or procedure. ${itemAnalysis(item, locale)}`;
    if (kind === 'meaning') return `“${item.original}” means “${meaning}.” It keeps that meaning in “${context},” so this is the closest paraphrase.`;
    if (kind === 'kana_to_kanji') return `The kana “${reading}” is written “${item.original}.” It matches the word used in “${context}” and means “${meaning}.”`;
    if (kind === 'kanji_to_kana') return `“${item.original}” is read “${reading}.” The reading stays the same in this context, where the word means “${meaning}.”`;
    return `“${item.original}” means “${meaning}.” It forms a natural expression such as “${collocation},” which fits the sentence context.`;
  }

  if (kind === 'grammar') return `在「${context}」中，需要表达实际经过步骤或手续，「${item.original}」在接续形式和语义功能上都成立。${itemAnalysis(item, locale)}`;
  if (kind === 'meaning') return `「${item.original}」的意思是“${meaning}”。在「${context}」中仍然使用这个核心义，因此该释义最接近原词。`;
  if (kind === 'kana_to_kanji') return `假名「${reading}」对应的正确表记是「${item.original}」。它与「${context}」中的词一致，意思是“${meaning}”。`;
  if (kind === 'kanji_to_kana') return `「${item.original}」读作「${reading}」。它在本句中的意思是“${meaning}”，语境不会改变这个读音。`;
  return `「${item.original}」表示“${meaning}”。它可以形成「${collocation}」这样的自然搭配，词义和句子结构都符合本题语境。`;
}

function choiceExplanationFor(
  choice: string,
  correct: boolean,
  target: VocabItem,
  kind: QuestionKind,
  allItems: VocabItem[],
  locale: Locale,
) {
  const isProperNameReading = kind === 'kanji_to_kana' && (target.deck === 'name_reading' || target.type === 'proper_name');

  if (correct) {
    if (kind === 'grammar') {
      if (locale === 'ja') return `文の接続、意味、自然な組み合わせのすべてに合う表現です。`;
      if (locale === 'en') return `This expression matches the sentence connection, meaning, and natural usage.`;
      return `这个表达同时符合句子接续、语义功能和自然搭配。`;
    }
    if (isProperNameReading) {
      if (locale === 'ja') return `この項目に記録されている「${target.original}」全体の読みです。`;
      if (locale === 'en') return `This is the reading recorded for the full name “${target.original}” in this entry.`;
      return `这是本词条为「${target.original}」记录的整体读法。`;
    }
    if (locale === 'ja') return kind === 'kanji_to_kana' ? `「${target.original}」の正しい読みです。` : `対象語の意味・表記・文脈に一致する正解です。`;
    if (locale === 'en') return kind === 'kanji_to_kana' ? `This is the correct reading of “${target.original}.”` : `This matches the target word's meaning, form, and context.`;
    return kind === 'kanji_to_kana' ? `这是「${target.original}」的正确读音。` : `这个选项与目标词的词义、表记和语境一致。`;
  }

  const candidate = itemForChoice(choice, kind, allItems);
  if (!candidate) {
    const comparison = kind === 'grammar' ? target.comparisons?.find((entry) => entry.target === choice) : undefined;
    if (comparison && locale === 'zh-CN') {
      const difference = comparison.difference_zh.replace(/[。！？!?]$/u, '');
      return `「${choice}」${difference}，但本句需要表达实际经过「手続き」，不是把某项信息作为判断依据。`;
    }
    if (kind === 'grammar') {
      if (locale === 'ja') return `「${choice}」は、この文が求める接続または「手順・手続きを実際に経る」という意味に合いません。`;
      if (locale === 'en') return `“${choice}” does not match the required connection or the meaning of actually going through a step or procedure.`;
      return `「${choice}」不符合本句需要的接续形式，或不能表达实际经过步骤、手续的含义。`;
    }
    if (isProperNameReading) {
      if (locale === 'ja') return `「${choice}」は、この項目に記録された「${target.original}」全体の読みではありません。人名は漢字を一字ずつ機械的に読みません。`;
      if (locale === 'en') return `“${choice}” is not the recorded reading of the full name “${target.original}.” A name should not be derived mechanically one kanji at a time.`;
      return `「${choice}」不是本词条记录的「${target.original}」整体读法。人名不能只按单个汉字机械拼读。`;
    }
    if (kind === 'kana_to_kanji') {
      if (locale === 'ja') return `「${choice}」は「${target.reading}」の標準的な表記ではありません。文中の意味に合う漢字は「${target.original}」です。`;
      if (locale === 'en') return `“${choice}” is not the standard spelling of “${target.reading}” in this context. The matching kanji form is “${target.original}.”`;
      return `「${choice}」不是假名「${target.reading}」在该语境中的正确表记；符合词义的汉字是「${target.original}」。`;
    }
    if (kind === 'kanji_to_kana') {
      if (locale === 'ja') return `「${choice}」は「${target.original}」の読みではありません。音読み・訓読みや濁音、長音の形に惑わされないことがポイントです。`;
      if (locale === 'en') return `“${choice}” is not the reading of “${target.original}.” It is a distractor based on a plausible on/kun, voicing, or vowel-length confusion.`;
      return `「${choice}」不是「${target.original}」的读音，它是利用音读、训读、浊音或长音混淆设置的干扰项。`;
    }
    if (kind === 'meaning') {
      if (locale === 'ja') return `「${choice}」は、この文で使われている「${target.original}」の中心的な意味の言い換えにはなりません。`;
      if (locale === 'en') return `“${choice}” is not the closest Japanese paraphrase of “${target.original}” as used in this sentence.`;
      return `「${choice}」不是「${target.original}」在本句语境中最接近的日语言い換え。`;
    }
    if (kind === 'moji_goi') {
      if (locale === 'ja') return `「${choice}」では文の意味、品詞、または自然な語の結び付きが合いません。`;
      if (locale === 'en') return `“${choice}” does not fit the sentence's meaning, part of speech, or natural word combination.`;
      return `「${choice}」不符合本句需要的词义、词性或自然搭配。`;
    }
    if (locale === 'ja') return `対象語の意味または読みと一致しません。`;
    if (locale === 'en') return `This does not match the target word's meaning or reading.`;
    return `这个选项与目标词要求的词义或读音不一致。`;
  }

  const candidateMeaning = itemMeaning(candidate, locale);
  const candidateCollocation = candidate.collocations?.find((value) => value.includes(candidate.original));

  if (locale === 'ja') {
    if (kind === 'kana_to_kanji') return `「${candidate.original}」の読みは「${candidate.reading ?? '不明'}」で、「${target.reading}」の表記ではありません。`;
    if (kind === 'kanji_to_kana') return isProperNameReading ? `「${choice}」は別の項目「${candidate.original}」の読みで、「${target.original}」全体の読みとは異なります。` : `「${choice}」は「${candidate.original}」の読みであり、「${target.original}」の読みではありません。`;
    if (kind === 'meaning') return `この意味は「${candidate.original}」（${candidateMeaning}）に近く、「${target.original}」の中心的な意味とは異なります。`;
    return `「${candidate.original}」は「${candidateMeaning}」を表し${candidateCollocation ? `、「${candidateCollocation}」のように使います` : 'ます'}。本問の意味と結び付きません。`;
  }

  if (locale === 'en') {
    if (kind === 'kana_to_kanji') return `“${candidate.original}” is read “${candidate.reading ?? 'unknown'},” so it is not the spelling of “${target.reading}.”`;
    if (kind === 'kanji_to_kana') return isProperNameReading ? `“${choice}” belongs to a different entry, “${candidate.original},” not to the full name “${target.original}.”` : `“${choice}” is the reading of “${candidate.original},” not “${target.original}.”`;
    if (kind === 'meaning') return `This meaning is closer to “${candidate.original}” (${candidateMeaning}), not the core meaning of “${target.original}.”`;
    return `“${candidate.original}” means “${candidateMeaning}”${candidateCollocation ? ` and is used in expressions such as “${candidateCollocation}”` : ''}. It does not fit this sentence.`;
  }

  if (kind === 'kana_to_kanji') return `「${candidate.original}」读作「${candidate.reading ?? 'unknown'}」，不是假名「${target.reading}」对应的表记。`;
  if (kind === 'kanji_to_kana') return isProperNameReading ? `「${choice}」是另一个词条「${candidate.original}」的读音，不是「${target.original}」的整体读法。` : `「${choice}」是「${candidate.original}」的读音，不是「${target.original}」的读音。`;
  if (kind === 'meaning') return `这个释义更接近「${candidate.original}」（${candidateMeaning}），与「${target.original}」的核心意思不同。`;
  return `「${candidate.original}」表示“${candidateMeaning}”${candidateCollocation ? `，常见搭配是「${candidateCollocation}」` : ''}，与本句需要表达的意思不符。`;
}

function itemForChoice(choice: string, kind: QuestionKind, items: VocabItem[]) {
  if (kind === 'meaning') {
    return items.find((item) => item.paraphrase_ja === choice);
  }
  if (kind === 'kanji_to_kana') {
    return items.find((item) => item.reading === choice);
  }
  return items.find((item) => item.original === choice);
}

function memoryPointFor(item: VocabItem, locale: Locale) {
  const points = [itemMemory(item, locale), itemAnalysis(item, locale)];
  if (locale === 'zh-CN') {
    points.push(...(item.comparisons?.slice(0, 2).map((comparison) => `与「${comparison.target}」相比：${comparison.difference_zh}`) ?? []));
  }
  return unique(points.filter(Boolean) as string[]).join(' ');
}

function choices(answer: string, pool: string[], salt: number, fallback: string[] = []) {
  const distractors = unique([...pool, ...fallback].filter((item) => item && item !== answer)).slice(0, 12);
  const selected = [answer, ...rotate(distractors, salt).slice(0, 3)];
  return rotate(unique(selected), salt % 4);
}

function fallbackChoicesForKind(item: VocabItem, kind: QuestionKind) {
  if (kind === 'kanji_to_kana') {
    return readingDistractors(item.reading ?? '');
  }
  if (kind === 'kana_to_kanji' || kind === 'moji_goi' || kind === 'grammar') {
    return ['測定', '認定', '養成', '豊富', '概観', '経過', '辛抱', '目次'].filter((choice) => choice !== item.original);
  }
  return [
    '一定の基準に基づいて正式に認めること。',
    '数量や種類が多く十分にあること。',
    '物事の全体を大まかに見渡すこと。',
    '苦しさや不便を我慢して耐えること。',
    '時間が過ぎ、物事がある段階まで進むこと。',
    '能力や人材を時間をかけて育てること。',
  ].filter((choice) => choice !== item.paraphrase_ja && choice !== item.meaning_ja);
}

function rotate<T>(items: T[], count: number) {
  if (!items.length) {
    return items;
  }
  const offset = count % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function routeFromHash(hash: string): AppRoute {
  const [viewValue, pageValue, itemValue] = hash.replace(/^#\/?/, '').split('/');
  const view = isAppView(viewValue) ? viewValue : 'home';
  const page = pageValue === 'words' || pageValue === 'review' ? pageValue : 'questions';
  const itemId = page === 'words' && itemValue ? decodeURIComponent(itemValue) : undefined;
  return { view, page: supportsStudyPage(view) ? page : 'questions', itemId };
}

function routeHash(view: AppView, page: StudyPage, itemId?: string) {
  if (!supportsStudyPage(view)) {
    return `#/${view}`;
  }
  return itemId && page === 'words' ? `#/${view}/${page}/${encodeURIComponent(itemId)}` : `#/${view}/${page}`;
}

function wordDetailHref(item: VocabItem) {
  const view: AppView = item.deck === 'grammar_expression' ? 'grammar' : 'vocabulary';
  return routeHash(view, 'words', item.id);
}

function supportsStudyPage(view: AppView) {
  return view === 'vocabulary' || view === 'grammar' || view === 'mixed';
}

function isAppView(value: string): value is AppView {
  return ['home', 'vocabulary', 'grammar', 'listening', 'reading', 'mixed', 'about', 'settings'].includes(value);
}

function shouldCollapseFilters() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;
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

function safeIndex(index: number, total: number) {
  return total ? ((index % total) + total) % total : 0;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function shortMeaning(meaning: string) {
  return meaning.split('，')[0].split('。')[0];
}

function questionSentence(item: VocabItem, replacement = item.original) {
  const example = item.examples?.find((candidate) => candidate.ja.includes(item.original))?.ja;
  if (example) {
    return example.replace(item.original, replacement);
  }
  if (item.deck === 'name_reading' || item.type === 'proper_name') {
    return `${replacement}さんは会議に出席しました。`;
  }
  const collocation = item.collocations?.find((candidate) => candidate.includes(item.original));
  if (collocation) {
    return collocation.replace(item.original, replacement);
  }
  return `「${replacement}」`;
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
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

function attemptSuggestion(attempt: PracticeAttempt | undefined, labels: Record<string, string>) {
  if (!attempt?.summary) {
    return labels.noAttemptHistory;
  }
  if (attempt.summary.wrong === 0) {
    return labels.suggestionAllCorrect;
  }
  if (attempt.summary.accuracy < 0.7) {
    return labels.suggestionLowAccuracy;
  }
  return labels.suggestionReviewWrong;
}

function aiPromptSeed(attempt: PracticeAttempt, questions: Question[]) {
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const misses = attempt.answers
    .filter((answer) => !answer.correct)
    .map((answer) => {
      const question = questionMap.get(answer.questionId);
      return {
        kind: answer.kind,
        prompt: question?.prompt,
        selected: answer.selected,
        answer: question?.answer,
        correct_reason: question?.correctReason,
      };
    });
  return JSON.stringify({
    task: 'Analyze this JLPT practice attempt and propose focused review plus similar questions.',
    summary: attempt.summary,
    misses,
  }, null, 2);
}

function formatDateTime(value: string | undefined, locale: Locale) {
  if (!value) {
    return '-';
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function formatDuration(ms: number | undefined) {
  const totalSeconds = Math.max(0, Math.round((ms ?? 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function downloadJSON(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function normalizeSettings(value: Partial<DisplaySettings> | undefined): DisplaySettings {
  return {
    ...defaultSettings,
    ...(value ?? {}),
    locale: normalizeLocale(value?.locale),
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
  if (view === 'listening' || view === 'reading' || view === 'about' || view === 'settings') {
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
  return [
    { view: 'home' as const, label: labels.navHome },
    { view: 'vocabulary' as const, label: labels.navVocabulary },
    { view: 'grammar' as const, label: labels.navGrammar },
    { view: 'listening' as const, label: labels.navListening },
    { view: 'reading' as const, label: labels.navReading },
    { view: 'mixed' as const, label: labels.navMixed },
    { view: 'about' as const, label: labels.navAbout },
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
    .filter(Boolean)
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[#d7ccb9] bg-white px-4 py-3">
      <p className="text-xs font-semibold text-[#6b6a64]">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
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

function StudyModeSwitch({
  mode,
  labels,
  onChange,
}: {
  mode: StudyPage;
  labels: Record<string, string>;
  onChange: (mode: StudyPage) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg border border-[#c8bcae] bg-[#e9eee9] p-1 shadow-sm" role="group" aria-label={labels.studyMode}>
      <button
        type="button"
        onClick={() => onChange('questions')}
        aria-pressed={mode === 'questions'}
        className={`h-10 rounded-md px-3 text-sm font-semibold transition ${
          mode === 'questions' ? 'bg-[#173d35] text-white shadow-sm' : 'text-[#53605a] hover:bg-white/70'
        }`}
      >
        {labels.questionPage}
      </button>
      <button
        type="button"
        onClick={() => onChange('words')}
        aria-pressed={mode === 'words'}
        className={`h-10 rounded-md px-3 text-sm font-semibold transition ${
          mode === 'words' ? 'bg-[#173d35] text-white shadow-sm' : 'text-[#53605a] hover:bg-white/70'
        }`}
      >
        {labels.wordPage}
      </button>
      <button
        type="button"
        onClick={() => onChange('review')}
        aria-pressed={mode === 'review'}
        className={`h-10 rounded-md px-3 text-sm font-semibold transition ${
          mode === 'review' ? 'bg-[#173d35] text-white shadow-sm' : 'text-[#53605a] hover:bg-white/70'
        }`}
      >
        {labels.reviewPage}
      </button>
    </div>
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

function CountdownCard({ countdown, labels }: { countdown: { days: number; hours: number; minutes: number }; labels: Record<string, string> }) {
  return (
    <aside className="min-w-0 rounded-lg border border-[#cbd6cf] bg-[#173d35] p-5 text-white shadow-sm md:p-6">
      <p className="text-sm font-semibold text-[#cfe0d7]">{labels.countdownTitle}</p>
      <p className="mt-2 text-xl font-semibold">{labels.countdownDate}</p>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <TimeBox value={countdown.days} label={labels.days} />
        <TimeBox value={countdown.hours} label={labels.hours} />
        <TimeBox value={countdown.minutes} label={labels.minutes} />
      </div>
      <a className="mt-4 block text-sm font-semibold text-[#dfe9df] underline-offset-4 hover:underline" href={JLPT_OFFICIAL_URL} target="_blank" rel="noreferrer">
        {labels.countdownSource}
      </a>
    </aside>
  );
}

function TimeBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-md bg-white/10 px-3 py-3 text-center">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs font-semibold text-[#cfe0d7]">{label}</p>
    </div>
  );
}

function ModuleCard({
  module,
  active,
  onClick,
}: {
  module: { view: AppView; title: string; body: string; count: number };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-36 min-w-0 rounded-lg border p-4 text-left shadow-sm transition ${
        active ? 'border-[#173d35] bg-[#e7f0eb]' : 'border-[#d7dfd6] bg-white hover:bg-[#f7faf6]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{module.title}</h2>
        <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-[#52645c]">{module.count}</span>
      </div>
      <p className="mt-3 break-words text-sm leading-6 text-[#626c66]">{module.body}</p>
    </button>
  );
}

function AboutPanel({ labels }: { labels: Record<string, string> }) {
  return (
    <section className="grid min-w-0 gap-4 lg:grid-cols-2">
      <article className="min-w-0 rounded-lg border border-[#d7dfd6] bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-semibold">{labels.aboutTitle}</h2>
        <p className="mt-3 text-sm leading-7 text-[#5f625b]">{labels.aboutBody}</p>
      </article>
      <article className="min-w-0 rounded-lg border border-[#d7dfd6] bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-semibold">{labels.skillTitle}</h2>
        <p className="mt-3 text-sm leading-7 text-[#5f625b]">{labels.skillBody}</p>
        <p className="mt-3 border-t border-[#e2ddd3] pt-3 text-sm leading-7 text-[#5f625b]">{labels.generatorSkillBody}</p>
      </article>
      <article className="min-w-0 rounded-lg border border-[#d7dfd6] bg-white p-5 shadow-sm lg:col-span-2">
        <h2 className="text-2xl font-semibold">{labels.workflowTitle}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[labels.workflowCapture, labels.workflowGenerate, labels.workflowPractice, labels.workflowExport].map((step) => (
            <p key={step} className="rounded-md bg-[#f5f7f3] p-3 text-sm leading-6 text-[#4f5b55]">
              {step}
            </p>
          ))}
        </div>
      </article>
      <article className="min-w-0 rounded-lg border border-[#d7dfd6] bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-semibold">{labels.deployTitle}</h2>
        <p className="mt-3 text-sm leading-7 text-[#5f625b]">{labels.deployBody}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a className="rounded-md bg-[#173d35] px-4 py-2 text-sm font-semibold text-white" href="https://github.com/erzhiqianyi/jlpt-master-deck" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a className="rounded-md border border-[#cbd6cf] bg-white px-4 py-2 text-sm font-semibold text-[#24473f]" href="https://github.com/erzhiqianyi/jlpt-master-deck/blob/main/README.md" target="_blank" rel="noreferrer">
            README
          </a>
        </div>
      </article>
      <article className="min-w-0 rounded-lg border border-[#d7dfd6] bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-semibold">{labels.exportForAI}</h2>
        <p className="mt-3 text-sm leading-7 text-[#5f625b]">{labels.exportStudyRecordBody}</p>
      </article>
    </section>
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

function LanguageSelect({ value, onChange }: { value: Locale; onChange: (locale: Locale) => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as Locale)}
      className="h-11 rounded-md border border-[#c8bcae] bg-white px-3 text-sm font-semibold text-[#574f48]"
      aria-label="Language"
    >
      <option value="zh-CN">简体中文</option>
      <option value="ja">日本語</option>
      <option value="en">English</option>
    </select>
  );
}

function SettingBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#e1d7c9] bg-white p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-[#d9d0c3] bg-white px-3 py-2 text-sm font-semibold text-[#4f5651]">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-[#24473f]"
      />
    </label>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-lg border border-[#d8cdbc] bg-[#fffaf4] p-4 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function QuestionPrompt({ text, target }: { text: string; target?: string }) {
  if (!target) {
    return text;
  }

  const targetIndex = text.indexOf(target);
  if (targetIndex < 0) {
    return text;
  }

  return (
    <>
      {text.slice(0, targetIndex)}
      <span className="font-semibold underline decoration-2 underline-offset-4">{target}</span>
      {text.slice(targetIndex + target.length)}
    </>
  );
}

function PracticeReviewPanel({
  attempt,
  questions,
  answers,
  items,
  labels,
  locale,
  showRuby,
  onRestart,
  onBackToPractice,
}: {
  attempt?: PracticeAttempt;
  questions: Question[];
  answers: AnswerState;
  items: VocabItem[];
  labels: Record<string, string>;
  locale: Locale;
  showRuby: boolean;
  onRestart: () => void;
  onBackToPractice: () => void;
}) {
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const reviewAnswers = attempt?.answers.length
    ? attempt.answers
    : questions
      .filter((question) => answers[question.id])
      .map((question) => ({
        questionId: question.id,
        itemId: question.itemId,
        kind: question.kind,
        selected: answers[question.id].selected,
        correct: answers[question.id].correct,
        answeredAt: answers[question.id].answeredAt ?? '',
        elapsedMs: answers[question.id].elapsedMs ?? 0,
      }));
  const summary = attempt?.summary ?? {
    total: questions.length,
    correct: reviewAnswers.filter((answer) => answer.correct).length,
    wrong: reviewAnswers.filter((answer) => !answer.correct).length,
    accuracy: reviewAnswers.length ? reviewAnswers.filter((answer) => answer.correct).length / reviewAnswers.length : 0,
    elapsedMs: reviewAnswers.at(-1)?.elapsedMs ?? 0,
  };
  const wrongAnswers = reviewAnswers.filter((answer) => !answer.correct);

  return (
    <section className="min-w-0 space-y-5">
      <div className="rounded-lg border border-[#d8cdbc] bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#856033]">{labels.latestAttempt}</p>
            <h2 className="mt-2 text-2xl font-semibold">{labels.reviewSummaryTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-[#5f625b]">{labels.reviewSummaryBody}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onBackToPractice} className="h-10 rounded-md border border-[#c8bcae] bg-white px-3 text-sm font-semibold text-[#24473f] hover:bg-[#f2f6f1]">
              {labels.backToPractice}
            </button>
            <button type="button" onClick={onRestart} className="h-10 rounded-md bg-[#173d35] px-3 text-sm font-semibold text-white">
              {labels.restartPractice}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label={labels.correct} value={`${summary.correct} / ${summary.total}`} />
          <Metric label={labels.accuracy} value={`${Math.round(summary.accuracy * 100)}%`} />
          <Metric label={labels.wrongQuestions} value={summary.wrong.toString()} />
          <Metric label={labels.elapsed} value={formatDuration(summary.elapsedMs)} />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-[#e1d7c9] bg-[#fffaf4] p-3">
            <p className="text-sm font-semibold text-[#313934]">{labels.historyTitle}</p>
            <p className="mt-2 text-sm leading-6 text-[#5f625b]">
              {labels.startedAt}: {formatDateTime(attempt?.startedAt, locale)}
              <br />
              {labels.completedAt}: {formatDateTime(attempt?.completedAt, locale)}
            </p>
          </div>
          <div className="rounded-md border border-[#cbd6cf] bg-[#f3f7f2] p-3">
            <p className="text-sm font-semibold text-[#313934]">{labels.suggestionLabel}</p>
            <p className="mt-2 text-sm leading-6 text-[#4f5b55]">{attemptSuggestion(attempt, labels)}</p>
          </div>
        </div>

        {attempt ? (
          <details className="mt-4 rounded-md border border-[#d9d0c3] bg-[#fffdfa] p-3">
            <summary className="cursor-pointer text-sm font-semibold text-[#24473f]">{labels.aiSuggestionPromptLabel}</summary>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-[#f5f7f3] p-3 text-xs leading-5 text-[#313934]">{aiPromptSeed(attempt, questions)}</pre>
          </details>
        ) : null}
      </div>

      {!reviewAnswers.length ? (
        <div className="rounded-lg border border-dashed border-[#bac8c0] bg-white p-6 shadow-sm">
          <p className="text-sm leading-6 text-[#5f625b]">{labels.noAttemptHistory}</p>
        </div>
      ) : null}

      {wrongAnswers.length ? (
        <div className="rounded-lg border border-[#d8cdbc] bg-white p-4 shadow-sm md:p-5">
          <h3 className="text-lg font-semibold">{labels.wrongQuestions}</h3>
          <div className="mt-3 space-y-4">
            {wrongAnswers.map((answer) => {
              const question = questionMap.get(answer.questionId);
              return question ? (
                <div key={answer.questionId} className="rounded-md border border-[#e1d7c9] bg-[#fffaf4] p-3">
                  <p className="text-sm font-semibold text-[#856033]">{question.title}</p>
                  <p className="mt-2 text-base leading-7 text-[#353b37]"><QuestionPrompt text={question.prompt} target={question.promptTarget} /></p>
                  <AnswerPanel
                    question={question}
                    answer={answer}
                    items={items}
                    showRuby={showRuby}
                    labels={labels}
                    locale={locale}
                  />
                </div>
              ) : null;
            })}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {reviewAnswers.map((answer) => {
          const question = questionMap.get(answer.questionId);
          return question ? (
            <div key={answer.questionId} className="rounded-lg border border-[#d8cdbc] bg-white p-4 shadow-sm md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#856033]">{question.title}</p>
                  <p className="mt-2 text-base leading-7 text-[#353b37]"><QuestionPrompt text={question.prompt} target={question.promptTarget} /></p>
                </div>
                <span className={`rounded px-2 py-1 text-sm font-semibold ${answer.correct ? 'bg-[#d5eadc] text-[#285d47]' : 'bg-[#faf0df] text-[#665d4b]'}`}>
                  {answer.correct ? labels.correct : labels.wrong}
                </span>
              </div>
              <AnswerPanel
                question={question}
                answer={answer}
                items={items}
                showRuby={showRuby}
                labels={labels}
                locale={locale}
              />
            </div>
          ) : null;
        })}
      </div>
    </section>
  );
}

function PracticePanel({
  activeQuestion,
  questionsLength,
  activeIndex,
  answeredCount,
  complete,
  feedbackMode,
  answers,
  items,
  labels,
  questionTypeLabel,
  settings,
  onAnswer,
  onPrev,
  onNext,
  onRestart,
}: {
  activeQuestion?: Question;
  questionsLength: number;
  activeIndex: number;
  answeredCount: number;
  complete: boolean;
  feedbackMode: FeedbackMode;
  answers: AnswerState;
  items: VocabItem[];
  labels: Record<string, string>;
  questionTypeLabel: string;
  settings: DisplaySettings;
  onAnswer: (question: Question, selected: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onRestart: () => void;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-[#d8cdbc] bg-white p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2ddd4] pb-4">
        <p className="text-sm font-semibold text-[#856033]">{questionTypeLabel}</p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {questionsLength > 1 ? <ArrowButton label={labels.prev} direction="left" onClick={onPrev} /> : null}
          <div className="flex min-h-10 min-w-32 flex-col items-center justify-center rounded-md bg-[#e8f0eb] px-3 py-1 text-[#24473f]">
            <span className="text-sm font-semibold">{questionsLength ? `${activeIndex + 1} / ${questionsLength}` : '0 / 0'}</span>
            <span className="text-xs">{labels.completed} {answeredCount} / {questionsLength}</span>
          </div>
          {answeredCount > 0 ? (
            <button type="button" onClick={onRestart} className="h-10 rounded-md border border-[#c8bcae] bg-white px-3 text-sm font-semibold text-[#24473f] hover:bg-[#f2f6f1]">
              {labels.restartPractice}
            </button>
          ) : null}
          {questionsLength > 1 ? (
            <ArrowButton label={labels.next} direction="right" onClick={onNext} />
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <h2 className="text-2xl font-semibold">{activeQuestion?.title ?? labels.noQuestion}</h2>
        {activeQuestion?.instruction ? (
          <p className="mt-3 text-sm leading-6 text-[#68716c]">{activeQuestion.instruction}</p>
        ) : null}
        <p className={`${activeQuestion?.instruction ? 'mt-4' : 'mt-3'} break-words text-lg leading-8 text-[#353b37]`}>
          {activeQuestion ? <QuestionPrompt text={activeQuestion.prompt} target={activeQuestion.promptTarget} /> : labels.noQuestionBody}
        </p>
      </div>

      {activeQuestion ? (
        <>
          {activeQuestion ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {activeQuestion.choices.map((choice, choiceIndex) => {
                const answered = answers[activeQuestion.id];
                const isSelected = answered?.selected === choice;
                const isAnswer = choice === activeQuestion.answer;
                const shouldReveal = complete || feedbackMode === 'immediate';
                const color = !answered
                  ? 'border-[#ddd4c8] bg-[#fffaf3] hover:bg-[#f5eadf]'
                  : shouldReveal
                    ? isAnswer
                      ? 'border-[#3d735f] bg-[#e5f2ea]'
                      : isSelected
                        ? 'border-[#b59a66] bg-[#f6f0e2]'
                        : 'border-[#ddd4c8] bg-[#f8f3eb] opacity-70'
                    : isSelected
                      ? 'border-[#9ca7a2] bg-[#eef2ef]'
                      : 'border-[#ddd4c8] bg-[#fffaf3]';
                return (
                  <button
                    type="button"
                    key={choice}
                    disabled={Boolean(answered)}
                    onClick={() => onAnswer(activeQuestion, choice)}
                    className={`flex min-h-14 min-w-0 items-start gap-3 rounded-md border px-4 py-3 text-left text-base font-semibold break-words disabled:cursor-default ${color}`}
                  >
                    <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-current text-xs">
                      {choiceIndex + 1}
                    </span>
                    <span className="min-w-0 pt-0.5">{choice}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {(feedbackMode === 'immediate' || complete) && answers[activeQuestion.id] ? (
            <AnswerPanel
              question={activeQuestion}
              answer={answers[activeQuestion.id]}
              items={items}
              showRuby={settings.showExplanationRuby}
              labels={labels}
              locale={normalizeLocale(settings.locale)}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function AnswerPanel({
  question,
  answer,
  items,
  showRuby,
  labels,
  locale,
}: {
  question: Question;
  answer?: { selected: string; correct: boolean };
  items: VocabItem[];
  showRuby: boolean;
  labels: Record<string, string>;
  locale: Locale;
}) {
  if (!answer) {
    return null;
  }

  const sourceItem = items.find((item) => item.id === question.itemId);
  const needsHumanReview = sourceItem?.content_origin === 'ai_generated' && sourceItem.verification_status !== 'verified';
  const statusStyle = answer.correct
    ? 'border-[#8eb3a1] bg-[#f1f7f3] text-[#285d47]'
    : 'border-[#cdbd98] bg-[#faf7ef] text-[#665d4b]';

  return (
    <div className={`mt-5 rounded-lg border p-4 ${statusStyle}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="rounded bg-white/70 px-2 py-1 text-sm font-semibold">{answer.correct ? labels.correct : labels.wrong}</p>
        {sourceItem ? (
          <EntryLink item={sourceItem} label={`${labels.viewEntry}: ${sourceItem.original}`} />
        ) : null}
      </div>
      <p className="mt-2 text-sm">{labels.yourAnswer}：{answer.selected}</p>
      <p className="mt-1 text-sm">{labels.rightAnswer}：{question.answer}</p>
      <div className="mt-4 border-t border-black/10">
        <ExplanationSection label={labels.contextLabel}>
          <RubyText text={question.context} items={items} enabled={showRuby} />
        </ExplanationSection>
        <ExplanationSection label={labels.correctReasonLabel}>
          <RubyText text={question.correctReason} items={items} enabled={showRuby} />
        </ExplanationSection>
        <section className="border-t border-black/10 py-4">
          <h3 className="text-sm font-semibold text-[#313934]">{labels.choiceAnalysisLabel}</h3>
          <div className="mt-2 divide-y divide-black/10">
            {question.choiceAnalysis.map((choice) => {
              const linkedItem = choice.correct ? sourceItem : itemForChoice(choice.choice, question.kind, items);
              return (
                <div key={choice.choice} className="grid gap-2 py-3 sm:grid-cols-[minmax(110px,auto)_1fr] sm:items-start sm:gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {linkedItem ? (
                      <EntryLink item={linkedItem} label={choice.choice} compact />
                    ) : (
                      <span className="font-semibold text-[#27312c]">{choice.choice}</span>
                    )}
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${choice.correct ? 'bg-[#d5eadc] text-[#285d47]' : 'bg-white/70 text-[#665d4b]'}`}>
                      {choice.correct ? labels.choiceFits : labels.choiceDoesNotFit}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-[#4b534e]">
                    <RubyText text={choice.explanation} items={items} enabled={showRuby} />
                  </p>
                </div>
              );
            })}
          </div>
        </section>
        <ExplanationSection label={labels.memoryPointLabel}>
          <RubyText text={question.memoryPoint} items={items} enabled={showRuby} />
        </ExplanationSection>
      </div>
      {needsHumanReview ? (
        <p className="mt-3 rounded-md border border-[#d5a95f] bg-[#fff4d8] p-3 text-sm leading-6 text-[#6f4a16]">
          {labels.unverifiedContentNotice}
        </p>
      ) : null}
    </div>
  );
}

function EntryLink({ item, label, compact = false }: { item: VocabItem; label: string; compact?: boolean }) {
  return (
    <a
      href={wordDetailHref(item)}
      target="_blank"
      rel="noreferrer"
      className={`font-semibold text-[#24473f] underline decoration-[#9ab0a7] underline-offset-4 hover:decoration-[#24473f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24473f] ${compact ? 'break-words' : 'rounded-md border border-[#b9c9c1] bg-white/80 px-3 py-2 text-sm no-underline'}`}
    >
      {label}
    </a>
  );
}

function ExplanationSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-black/10 py-4 first:border-t-0">
      <h3 className="text-sm font-semibold text-[#313934]">{label}</h3>
      <p className="mt-2 text-sm leading-6 text-[#4b534e]">{children}</p>
    </section>
  );
}

function WordDetailPanel({
  item,
  index,
  total,
  showRuby,
  labels,
  locale,
  onShowRubyChange,
  onPrevious,
  onNext,
}: {
  item?: VocabItem;
  index: number;
  total: number;
  showRuby: boolean;
  labels: Record<string, string>;
  locale: Locale;
  onShowRubyChange: (checked: boolean) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const [touchStart, setTouchStart] = useState<number | null>(null);

  if (!item) {
    return <EmptyModule labels={labels} />;
  }

  function handleTouchEnd(x: number) {
    if (touchStart === null) {
      return;
    }
    const delta = x - touchStart;
    setTouchStart(null);
    if (Math.abs(delta) < 48) {
      return;
    }
    if (delta > 0) {
      onPrevious();
    } else {
      onNext();
    }
  }

  return (
    <section
      className="min-w-0"
      onTouchStart={(event) => setTouchStart(event.changedTouches[0]?.clientX ?? null)}
      onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#856033]">{labels.wordDetail}</p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <CompactToggle checked={showRuby} label={labels.furigana} onChange={onShowRubyChange} />
          {total > 1 ? <ArrowButton label={labels.prev} direction="left" onClick={onPrevious} /> : null}
          <span className="min-w-20 rounded-md bg-[#e8f0eb] px-3 py-2 text-center text-sm font-semibold text-[#24473f]">
            {total ? `${safeIndex(index, total) + 1} / ${total}` : '0 / 0'}
          </span>
          {total > 1 ? <ArrowButton label={labels.next} direction="right" onClick={onNext} /> : null}
        </div>
      </div>
      <VocabCard
        item={item}
        showRuby={showRuby}
        labels={labels}
        locale={locale}
      />
    </section>
  );
}

function CompactToggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-[#c8bcae] bg-white px-3 text-sm font-semibold text-[#24473f]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#24473f]"
      />
      <span>{label}</span>
    </label>
  );
}

function ArrowButton({ label, direction, onClick }: { label: string; direction: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-md border border-[#c8bcae] bg-white text-xl font-semibold text-[#24473f] hover:bg-[#f2f6f1]"
    >
      {direction === 'left' ? '‹' : '›'}
    </button>
  );
}

function VocabCard({
  item,
  showRuby,
  labels,
  locale,
}: {
  item: VocabItem;
  showRuby: boolean;
  labels: Record<string, string>;
  locale: Locale;
}) {
  const meaning = localized(item, locale, 'meaning') ?? item.meaning_zh;
  const coreMemory = localized(item, locale, 'core_memory') ?? item.core_memory;
  const analysis = localized(item, locale, 'analysis') ?? item.analysis;
  return (
    <article className="min-w-0 rounded-lg border border-[#d8cdbc] bg-white p-4 shadow-sm md:p-6">
      <h3 className="text-3xl font-semibold">
        <RubyText text={item.original} items={[item]} enabled={showRuby} />
      </h3>
      <div className="mt-5 grid gap-5 border-t border-[#e5ddd1] pt-5 md:grid-cols-2">
        <section>
          <h4 className="text-xs font-semibold text-[#856033]">{labels.japaneseMeaning}</h4>
          <p className="mt-2 text-sm leading-7 text-[#313934]">
            <RubyText text={item.meaning_ja ?? '-'} items={[item]} enabled={showRuby} />
          </p>
        </section>
        {locale !== 'ja' ? (
          <section>
            <h4 className="text-xs font-semibold text-[#856033]">{labels.localizedMeaning}</h4>
            <p className="mt-2 text-sm leading-7 text-[#313934]">{meaning}</p>
          </section>
        ) : null}
      </div>
      <section className="mt-5 border-t border-[#e5ddd1] pt-5">
        <h4 className="text-xs font-semibold text-[#856033]">{labels.examQuickNote}</h4>
        <p className="mt-2 text-sm leading-7 text-[#313934]">{coreMemory}</p>
      </section>
      {item.collocations?.length ? (
        <section className="mt-5 border-t border-[#e5ddd1] pt-5">
          <h4 className="text-xs font-semibold text-[#856033]">{labels.collocationsLabel}</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.collocations.slice(0, 4).map((collocation) => (
              <span key={collocation} className="rounded-md bg-[#f4eee6] px-2 py-1 text-xs text-[#554f48]">
                <RubyText text={collocation} items={[item]} enabled={showRuby} />
              </span>
            ))}
          </div>
        </section>
      ) : null}
      {analysis ? (
        <section className="mt-5 border-t border-[#e5ddd1] pt-5">
          <h4 className="text-xs font-semibold text-[#856033]">{labels.analysis}</h4>
          <p className="mt-2 text-sm leading-7 text-[#5f625b]">
            <RubyText text={analysis} items={[item]} enabled={showRuby} />
          </p>
        </section>
      ) : null}
      {item.content_origin === 'ai_generated' && item.verification_status !== 'verified' ? (
        <p className="mt-3 rounded-md border border-[#d5a95f] bg-[#fff4d8] p-3 text-xs leading-5 text-[#6f4a16]">
          {labels.unverifiedContentNotice}
        </p>
      ) : null}
    </article>
  );
}

function localized(item: VocabItem, locale: Locale, key: keyof LocalizedText) {
  return item.localizations?.[locale]?.[key];
}

function itemMeaning(item: VocabItem, locale: Locale) {
  return localized(item, locale, 'meaning') ?? item.meaning_zh;
}

function itemMemory(item: VocabItem, locale: Locale) {
  return localized(item, locale, 'core_memory') ?? item.core_memory;
}

function itemAnalysis(item: VocabItem, locale: Locale) {
  return localized(item, locale, 'analysis') ?? item.analysis;
}

function template(value: string, variables: Record<string, string>) {
  return Object.entries(variables).reduce((text, [key, replacement]) => text.replaceAll(`{${key}}`, replacement), value);
}

function RubyText({ text, items, enabled }: { text: string; items: VocabItem[]; enabled: boolean }) {
  if (!enabled) {
    return <>{text}</>;
  }

  const terms = rubyTermsForItems(items);
  if (!terms.length) {
    return <>{text}</>;
  }

  const parts: React.ReactNode[] = [];
  let index = 0;
  while (index < text.length) {
    const term = terms.find((candidate) => text.startsWith(candidate.surface, index));
    if (!term) {
      parts.push(text[index]);
      index += 1;
      continue;
    }
    parts.push(
      <ruby key={`${term.surface}-${index}`}>
        {term.surface}
        <rp>(</rp>
        <rt>{term.reading}</rt>
        <rp>)</rp>
      </ruby>,
    );
    index += term.surface.length;
  }
  return <>{parts}</>;
}

function rubyTermsForItems(items: VocabItem[]) {
  const fromItems = items.flatMap((item) => [
    ...(item.reading ? [{ text: item.original, reading: item.reading }] : []),
    ...(item.ruby_terms ?? []),
  ]);
  const seen = new Set<string>();
  return [...fromItems, ...defaultRubyTerms]
    .filter((term) => {
      const key = `${term.text}\u0000${term.reading}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .map((term) => ({ surface: term.text, reading: term.reading }))
    .sort((a, b) => b.surface.length - a.surface.length);
}
