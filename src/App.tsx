'use client';

import { useEffect, useMemo, useState } from 'react';

type Deck = 'n1_vocab' | 'name_reading' | 'grammar_expression';
type QuestionKind = 'moji_goi' | 'meaning' | 'kana_to_kanji' | 'kanji_to_kana';
type Locale = 'zh-CN' | 'ja' | 'en';
type AppView = 'vocabulary' | 'grammar' | 'listening' | 'reading' | 'mixed' | 'about' | 'settings';
type AnswerState = Record<string, { selected: string; correct: boolean }>;
type ReviewStatus = 'new' | 'learning' | 'review' | 'mastered';
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
type DisplaySettings = { showReviewRuby: boolean; showExplanationRuby: boolean; locale: Locale };
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
  prompt: string;
  choices: string[];
  answer: string;
  explanation: string;
};

const STORAGE_PROGRESS = 'jlpt-vocab-progress-v1';
const STORAGE_ANSWERS = 'jlpt-vocab-answers-v1';
const STORAGE_SETTINGS = 'jlpt-display-settings-v1';

const translations = {
  'zh-CN': {
    deckAll: '全部',
    deckN1: 'N1/N2 词汇',
    deckExpression: '表达/活用',
    deckName: '人名读法',
    meaning: '言い換え類義',
    kanaToKanji: '表記',
    kanjiToKana: '漢字読み',
    mojiGoi: 'JLPT 語彙',
    reset: '重置本地进度',
    items: '词条',
    questions: '题目',
    answered: '已作答',
    correct: '正确',
    mastered: '掌握',
    reviewCount: '复习',
    nextReview: '下次复习',
    wordDetail: '词条详情',
    swipeHint: '移动端左右滑动切换，电脑端可用箭头或键盘方向键。',
    practice: '今日练习',
    library: '词库',
    settings: '设置',
    brand: 'JLPT Review',
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
    aboutBody: '这是一个本地优先的 JLPT 学习工具。你在 Codex 或 Claude Code 里输入不懂的内容，技能把内容整理成结构化数据，网页只负责复习、判分和本地进度。',
    deployTitle: '自己部署',
    deployBody: 'Fork GitHub 仓库，选择使用示例数据或 npm run data:blank 创建空白数据，然后部署到 Cloudflare Pages。',
    practiceTitle: '开始一组复习',
    practiceCopy: '按题型练习，作答后看对错和完整解析。',
    libraryTitle: '查看整理好的词条',
    libraryCopy: '按 deck 查看词义、搭配、例句和解析。',
    settingsTitle: '调整学习显示',
    settingsCopy: '控制语言和假名标注。',
    deck: 'Deck',
    questionType: '题型',
    display: '显示设置',
    language: '界面语言',
    reviewRuby: '复习显示假名',
    explanationRuby: '解析显示假名',
    rules: '练习规则',
    ruleJudge: '选择答案后立即判分。',
    ruleExplain: '每题显示正确答案和解析，题干和选项不显示假名提示。',
    ruleLocal: '答题记录写入浏览器本地。',
    ruleExam: '考场判断作为解析材料，不单独出题。',
    noQuestion: '没有可练习题目',
    noQuestionBody: '当前筛选条件下没有题目。',
    beforeAnswer: '作答后会显示对错评判、正确答案和完整解析。',
    meaningTitle: '言い換え類義',
    meaningPrompt: '次の文の「{word}」に最も近い意味を選んでください。{sentence}',
    kanaToKanjiTitle: '表記',
    kanaToKanjiPrompt: '次の文の「{reading}」を漢字で書くと、最もよいものはどれですか。{sentence}',
    kanjiToKanaTitle: '漢字読み',
    kanjiToKanaPrompt: '次の文の「{word}」の読み方として、最もよいものはどれですか。{sentence}',
    mojiGoiTitle: 'JLPT 文字・語彙',
    mojiGoiMeaningPrompt: '中文意思「{meaning}」对应哪一个日语词？',
    originalSentence: '原句是',
    coreMeaning: '核心意思是',
    readAs: '读作',
    yourAnswer: '你的答案',
    rightAnswer: '正确答案',
    wrong: '错误',
    prev: '上一题',
    next: '下一题',
    analysis: '解析',
    contact: '联系',
    intro: '使用 Codex 或 Claude Code 整理自己的学习记录，在浏览器本地练习 JLPT 文字・語彙、言い換え類義、表記和漢字読み。',
  },
  ja: {
    deckAll: 'すべて',
    deckN1: 'N1/N2 語彙',
    deckExpression: '表現・活用',
    deckName: '人名読み',
    meaning: '言い換え類義',
    kanaToKanji: '表記',
    kanjiToKana: '漢字読み',
    mojiGoi: 'JLPT 語彙',
    reset: 'ローカル進捗をリセット',
    items: '項目',
    questions: '問題',
    answered: '回答済み',
    correct: '正解',
    mastered: '習得',
    reviewCount: '復習',
    nextReview: '次回復習',
    wordDetail: '語彙詳細',
    swipeHint: 'モバイルでは左右スワイプ、PC では矢印またはキーボードで切り替えます。',
    practice: '今日の復習',
    library: '語彙帳',
    settings: '設定',
    brand: 'JLPT Review',
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
    aboutBody: 'これはローカル優先の JLPT 学習ツールです。Codex や Claude Code に分からない内容を入力し、スキルが構造化データに変換し、Web アプリが復習・採点・ローカル進捗を担当します。',
    deployTitle: '自分でデプロイ',
    deployBody: 'GitHub リポジトリを fork し、サンプルデータを使うか npm run data:blank で空データを作成して、Cloudflare Pages にデプロイします。',
    practiceTitle: '復習を始める',
    practiceCopy: '問題に答えて、判定と解説を確認します。',
    libraryTitle: '整理済みの語彙を見る',
    libraryCopy: 'Deck ごとに意味、連語、例文、解説を確認します。',
    settingsTitle: '表示を調整',
    settingsCopy: '言語とふりがな表示を切り替えます。',
    deck: 'Deck',
    questionType: '問題形式',
    display: '表示設定',
    language: '表示言語',
    reviewRuby: '復習にふりがな',
    explanationRuby: '解説にふりがな',
    rules: '練習ルール',
    ruleJudge: '選択後すぐに判定します。',
    ruleExplain: '正解と解説を表示します。問題文と選択肢にはふりがなを出しません。',
    ruleLocal: '回答履歴はブラウザに保存されます。',
    ruleExam: '試験用の判断材料は解説に含めます。',
    noQuestion: '問題がありません',
    noQuestionBody: '現在の条件では問題がありません。',
    beforeAnswer: '回答後、判定・正解・解説が表示されます。',
    meaningTitle: '言い換え類義',
    meaningPrompt: '次の文の「{word}」に最も近い意味を選んでください。{sentence}',
    kanaToKanjiTitle: '表記',
    kanaToKanjiPrompt: '次の文の「{reading}」を漢字で書くと、最もよいものはどれですか。{sentence}',
    kanjiToKanaTitle: '漢字読み',
    kanjiToKanaPrompt: '次の文の「{word}」の読み方として、最もよいものはどれですか。{sentence}',
    mojiGoiTitle: 'JLPT 文字・語彙',
    mojiGoiMeaningPrompt: '意味「{meaning}」に対応する日本語を選んでください。',
    originalSentence: '元の文',
    coreMeaning: '中心的な意味',
    readAs: '読み',
    yourAnswer: 'あなたの答え',
    rightAnswer: '正解',
    wrong: '不正解',
    prev: '前へ',
    next: '次へ',
    analysis: '解説',
    contact: '連絡先',
    intro: 'Codex や Claude Code で整理した学習記録を使い、JLPT 文字・語彙・言い換え類義・表記・漢字読みをブラウザ内で復習します。',
  },
  en: {
    deckAll: 'All',
    deckN1: 'N1/N2 Vocab',
    deckExpression: 'Expressions',
    deckName: 'Name Readings',
    meaning: 'Paraphrase',
    kanaToKanji: 'Orthography',
    kanjiToKana: 'Kanji Reading',
    mojiGoi: 'JLPT Vocabulary',
    reset: 'Reset local progress',
    items: 'Items',
    questions: 'Questions',
    answered: 'Answered',
    correct: 'Correct',
    mastered: 'Mastered',
    reviewCount: 'Reviews',
    nextReview: 'Next Review',
    wordDetail: 'Word Detail',
    swipeHint: 'Swipe on mobile, or use arrows and keyboard arrow keys on desktop.',
    practice: 'Practice',
    library: 'Library',
    settings: 'Settings',
    brand: 'JLPT Review',
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
    aboutBody: 'This is a local-first JLPT study tool. You enter confusing material in Codex or Claude Code, the skill turns it into structured data, and the web app handles review, scoring, and browser-local progress.',
    deployTitle: 'Deploy Your Own',
    deployBody: 'Fork the GitHub repo, keep the sample data or run npm run data:blank, then deploy it to Cloudflare Pages.',
    practiceTitle: 'Start a review set',
    practiceCopy: 'Practice by question type, then review scoring and explanations.',
    libraryTitle: 'Browse structured entries',
    libraryCopy: 'Review meanings, collocations, examples, and notes by deck.',
    settingsTitle: 'Tune study display',
    settingsCopy: 'Control language and furigana support.',
    deck: 'Deck',
    questionType: 'Question Type',
    display: 'Display',
    language: 'Language',
    reviewRuby: 'Show furigana in review',
    explanationRuby: 'Show furigana in explanations',
    rules: 'Rules',
    ruleJudge: 'Answers are scored immediately.',
    ruleExplain: 'Each question shows the answer and explanation, without furigana hints in prompts or choices.',
    ruleLocal: 'Progress is saved in this browser.',
    ruleExam: 'Exam heuristics appear in explanations only.',
    noQuestion: 'No questions',
    noQuestionBody: 'No questions match the current filters.',
    beforeAnswer: 'After answering, scoring, the correct answer, and explanation will appear.',
    meaningTitle: 'Paraphrase',
    meaningPrompt: 'Choose the closest meaning of "{word}" in the sentence. {sentence}',
    kanaToKanjiTitle: 'Orthography',
    kanaToKanjiPrompt: 'Which kanji form best matches "{reading}" in the sentence? {sentence}',
    kanjiToKanaTitle: 'Kanji Reading',
    kanjiToKanaPrompt: 'Choose the best reading of "{word}" in the sentence. {sentence}',
    mojiGoiTitle: 'JLPT Vocabulary',
    mojiGoiMeaningPrompt: 'Which Japanese word matches the meaning "{meaning}"?',
    originalSentence: 'Original sentence',
    coreMeaning: 'Core meaning',
    readAs: 'is read as',
    yourAnswer: 'Your answer',
    rightAnswer: 'Correct answer',
    wrong: 'Incorrect',
    prev: 'Previous',
    next: 'Next',
    analysis: 'Analysis',
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
};

const NEXT_JLPT_AT = '2026-12-06T09:00:00+09:00';
const JLPT_OFFICIAL_URL = 'https://www.jlpt.jp/e/';

const defaultRubyTerms: RubyTerm[] = [
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
  const [selectedKind, setSelectedKind] = useState<QuestionKind>('moji_goi');
  const [activeIndex, setActiveIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [progress, setProgress] = useState<ProgressState>({});
  const [settings, setSettings] = useState<DisplaySettings>(defaultSettings);
  const [activeView, setActiveView] = useState<AppView>('vocabulary');
  const [countdown, setCountdown] = useState(() => getCountdown(NEXT_JLPT_AT));

  useEffect(() => {
    fetch('/data/review-data.json')
      .then((response) => response.json())
      .then((json: ReviewData) => setData(json))
      .catch(() => setData(fallbackData));

    setProgress(readStorage(STORAGE_PROGRESS, {}));
    setAnswers(readStorage(STORAGE_ANSWERS, {}));
    setSettings(normalizeSettings(readStorage(STORAGE_SETTINGS, defaultSettings)));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setCountdown(getCountdown(NEXT_JLPT_AT)), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const items = useMemo(() => moduleItems(data.items, activeView, selectedDeck), [activeView, data.items, selectedDeck]);

  const locale = normalizeLocale(settings.locale);
  const allQuestions = useMemo(() => buildQuestions(items, locale), [items, locale]);
  const questions = useMemo(
    () => allQuestions.filter((question) => question.kind === selectedKind),
    [allQuestions, selectedKind],
  );
  const activeQuestion = questions[activeIndex % Math.max(questions.length, 1)];
  const activeWord = items[wordIndex % Math.max(items.length, 1)];
  const answeredCount = Object.keys(answers).length;
  const correctCount = Object.values(answers).filter((answer) => answer.correct).length;
  const masteredCount = Object.values(progress).filter((item) => item.status === 'mastered').length;
  const labels = translations[locale];
  const deckLabels = deckLabelsFor(locale);
  const kindLabels = kindLabelsFor(locale);
  const moduleStats = moduleSummaries(data.items, labels);

  useEffect(() => {
    setActiveIndex(0);
    setWordIndex(0);
  }, [activeView, selectedDeck, selectedKind]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (activeView === 'about' || activeView === 'settings' || activeView === 'listening' || activeView === 'reading') {
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
  }, [activeView, items.length]);

  function answerQuestion(question: Question, selected: string) {
    const correct = selected === question.answer;
    const now = new Date();
    const nextAnswers = {
      ...answers,
      [question.id]: { selected, correct },
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
  }

  function resetLocalProgress() {
    setAnswers({});
    setProgress({});
    localStorage.removeItem(STORAGE_ANSWERS);
    localStorage.removeItem(STORAGE_PROGRESS);
  }

  function updateSettings(nextSettings: DisplaySettings) {
    const normalized = normalizeSettings(nextSettings);
    setSettings(normalized);
    writeStorage(STORAGE_SETTINGS, normalized);
  }

  return (
    <main className="min-h-screen max-w-full overflow-x-hidden bg-[#f5f7f3] text-[#1f2522]">
      <header className="sticky top-0 z-20 border-b border-[#d7dfd6] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl min-w-0 flex-col gap-3 px-4 py-3 md:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => setActiveView('vocabulary')} className="text-lg font-semibold tracking-normal text-[#173d35]">
              {labels.brand}
            </button>
            <a className="rounded-md border border-[#d7dfd6] px-3 py-2 text-sm font-semibold text-[#24473f] lg:hidden" href="https://github.com/erzhiqianyi/jlpt-master-deck" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
          <nav className="flex min-w-0 max-w-full gap-2 overflow-x-auto pb-1 lg:pb-0">
            {navItems(labels).map((item) => (
              <NavButton key={item.view} active={activeView === item.view} onClick={() => setActiveView(item.view)}>
                {item.label}
              </NavButton>
            ))}
          </nav>
          <div className="flex flex-wrap gap-2">
            <LanguageSelect value={settings.locale} onChange={(locale) => updateSettings({ ...settings, locale })} />
            <button type="button" onClick={resetLocalProgress} className="h-10 rounded-md border border-[#cbd6cf] bg-white px-3 text-sm font-semibold text-[#574f48] hover:bg-[#f2f6f1]">
              {labels.reset}
            </button>
          </div>
        </div>
      </header>

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
          <ModuleCard key={module.view} module={module} active={activeView === module.view} onClick={() => setActiveView(module.view)} />
        ))}
      </section>

      <section className="mx-auto grid max-w-7xl min-w-0 gap-5 px-4 pb-5 md:px-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-10">
        {activeView !== 'about' && activeView !== 'settings' ? (
          <aside className="space-y-4">
            {(activeView === 'vocabulary' || activeView === 'mixed') ? (
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

            <Panel title={labels.questionType}>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(kindLabels) as QuestionKind[]).map((kind) => (
                  <SegmentButton key={kind} active={selectedKind === kind} onClick={() => setSelectedKind(kind)}>
                    {kindLabels[kind]}
                  </SegmentButton>
                ))}
              </div>
            </Panel>

            <Panel title={labels.display}>
              <div className="space-y-3">
                <Toggle checked={settings.showReviewRuby} label={labels.reviewRuby} onChange={(checked) => updateSettings({ ...settings, showReviewRuby: checked })} />
                <Toggle checked={settings.showExplanationRuby} label={labels.explanationRuby} onChange={(checked) => updateSettings({ ...settings, showExplanationRuby: checked })} />
              </div>
            </Panel>
          </aside>
        ) : null}

        <div className={activeView === 'about' ? 'min-w-0 lg:col-span-2' : 'min-w-0 space-y-5'}>
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
              </div>
            </Panel>
          ) : null}
          {activeView === 'listening' || activeView === 'reading' ? <EmptyModule labels={labels} /> : null}
          {activeView !== 'about' && activeView !== 'settings' && activeView !== 'listening' && activeView !== 'reading' ? (
            <>
              <PracticePanel
                activeQuestion={activeQuestion}
                questionsLength={questions.length}
                activeIndex={activeIndex}
                answers={answers}
                items={data.items}
                labels={labels}
                kindLabels={kindLabels}
                settings={settings}
                onAnswer={answerQuestion}
                onPrev={() => setActiveIndex((index) => Math.max(index - 1, 0))}
                onNext={() => setActiveIndex((index) => (questions.length ? (index + 1) % questions.length : 0))}
              />
              <WordDetailPanel
                item={activeWord}
                index={wordIndex}
                total={items.length}
                progress={activeWord ? progress[activeWord.id] : undefined}
                showRuby={settings.showReviewRuby}
                labels={labels}
                deckLabels={deckLabels}
                locale={locale}
                onPrevious={() => setWordIndex((index) => previousIndex(index, items.length))}
                onNext={() => setWordIndex((index) => nextIndex(index, items.length))}
              />
            </>
          ) : null}
        </div>
      </section>

      <footer className="border-t border-[#d9d0c3] bg-[#fffaf2]">
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
  const readings = unique(items.map((item) => item.reading).filter(Boolean) as string[]);
  const meanings = unique(items.map((item) => shortMeaning(itemMeaning(item, locale))));
  const surfaces = unique(items.map((item) => item.original));
  const questions: Question[] = [];

  items.forEach((item, index) => {
    const meaning = itemMeaning(item, locale);
    const memory = itemMemory(item, locale);
    const analysis = itemAnalysis(item, locale);
    const example = item.examples?.[0]?.ja;
    const sentence = questionSentence(item);
    const kanaSentence = item.reading ? questionSentence(item, item.reading) : sentence;

    questions.push({
      id: `${item.id}-meaning`,
      itemId: item.id,
      kind: 'meaning',
      title: labels.meaningTitle,
      prompt: template(labels.meaningPrompt, { word: item.original, sentence }),
      choices: choices(shortMeaning(meaning), meanings, index + 1),
      answer: shortMeaning(meaning),
      explanation: `${labels.originalSentence}「${example ?? sentence}」。${labels.coreMeaning}：${meaning} ${analysis ?? memory}`,
    });

    if (item.reading) {
      questions.push({
        id: `${item.id}-kana-to-kanji`,
        itemId: item.id,
        kind: 'kana_to_kanji',
        title: labels.kanaToKanjiTitle,
        prompt: template(labels.kanaToKanjiPrompt, { reading: item.reading, sentence: kanaSentence }),
        choices: choices(item.original, surfaces, index + 2),
        answer: item.original,
        explanation: `${labels.originalSentence}「${example ?? sentence}」。空欄の語は「${item.original}」で、${labels.readAs}「${item.reading}」。${meaning} ${analysis ?? memory}`,
      });
      questions.push({
        id: `${item.id}-kanji-to-kana`,
        itemId: item.id,
        kind: 'kanji_to_kana',
        title: labels.kanjiToKanaTitle,
        prompt: template(labels.kanjiToKanaPrompt, { word: item.original, sentence }),
        choices: choices(item.reading, readings, index + 3),
        answer: item.reading,
        explanation: `${labels.originalSentence}「${example ?? sentence}」。「${item.original}」${labels.readAs}「${item.reading}」。${meaning} ${analysis ?? memory}`,
      });
    }

    questions.push(buildMojiGoiQuestion(item, items, index, locale));
  });

  return questions;
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

function kindLabelsFor(locale: Locale): Record<QuestionKind, string> {
  const labels = translations[locale];
  return {
    moji_goi: labels.mojiGoi,
    meaning: labels.meaning,
    kana_to_kanji: labels.kanaToKanji,
    kanji_to_kana: labels.kanjiToKana,
  };
}

function buildMojiGoiQuestion(item: VocabItem, allItems: VocabItem[], index: number, locale: Locale): Question {
  const labels = translations[locale];
  const example = item.examples?.[0]?.ja;
  const answer = item.original;
  const meaning = itemMeaning(item, locale);
  const memory = itemMemory(item, locale);
  const analysis = itemAnalysis(item, locale);
  const otherSurfaces = allItems
    .filter((candidate) => candidate.id !== item.id && candidate.deck === item.deck)
    .map((candidate) => candidate.original);
  const prompt = example
    ? example.replace(item.original, '＿＿')
    : template(labels.mojiGoiMeaningPrompt, { meaning: shortMeaning(meaning) });

  return {
    id: `${item.id}-moji-goi`,
    itemId: item.id,
    kind: 'moji_goi',
    title: labels.mojiGoiTitle,
    prompt,
    choices: choices(answer, otherSurfaces.length >= 3 ? otherSurfaces : allItems.map((candidate) => candidate.original), index + 4),
    answer,
    explanation: example
      ? `${labels.originalSentence}「${example}」。${labels.coreMeaning}：${meaning} ${analysis ?? ''}`
      : `「${item.original}」${labels.coreMeaning}：${meaning} ${memory}`,
  };
}

function choices(answer: string, pool: string[], salt: number) {
  const distractors = unique(pool.filter((item) => item && item !== answer)).slice(0, 12);
  const selected = [answer, ...rotate(distractors, salt).slice(0, 3)];
  return rotate(unique(selected), salt % 4);
}

function rotate<T>(items: T[], count: number) {
  if (!items.length) {
    return items;
  }
  const offset = count % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function nextIndex(index: number, total: number) {
  return total ? (index + 1) % total : 0;
}

function previousIndex(index: number, total: number) {
  return total ? (index - 1 + total) % total : 0;
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

function formatDate(value: string | undefined, locale: Locale) {
  if (!value) {
    return '-';
  }
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(value));
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
    { view: 'vocabulary' as const, label: labels.navVocabulary },
    { view: 'grammar' as const, label: labels.navGrammar },
    { view: 'listening' as const, label: labels.navListening },
    { view: 'reading' as const, label: labels.navReading },
    { view: 'mixed' as const, label: labels.navMixed },
    { view: 'about' as const, label: labels.navAbout },
    { view: 'settings' as const, label: labels.settings },
  ];
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

function PracticePanel({
  activeQuestion,
  questionsLength,
  activeIndex,
  answers,
  items,
  labels,
  kindLabels,
  settings,
  onAnswer,
  onPrev,
  onNext,
}: {
  activeQuestion?: Question;
  questionsLength: number;
  activeIndex: number;
  answers: AnswerState;
  items: VocabItem[];
  labels: Record<string, string>;
  kindLabels: Record<QuestionKind, string>;
  settings: DisplaySettings;
  onAnswer: (question: Question, selected: string) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-[#d8cdbc] bg-white p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#856033]">{activeQuestion ? kindLabels[activeQuestion.kind] : labels.questionType}</p>
          <h2 className="mt-2 text-2xl font-semibold">{activeQuestion?.title ?? labels.noQuestion}</h2>
          <p className="mt-3 break-words text-lg leading-8 text-[#353b37]">
            {activeQuestion ? activeQuestion.prompt : labels.noQuestionBody}
          </p>
        </div>
        <div className="flex h-10 min-w-28 items-center justify-center rounded-md bg-[#e8f0eb] px-3 text-sm font-semibold text-[#24473f]">
          {questionsLength ? `${activeIndex + 1} / ${questionsLength}` : '0 / 0'}
        </div>
      </div>

      {activeQuestion ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {activeQuestion.choices.map((choice) => {
              const answered = answers[activeQuestion.id];
              const isSelected = answered?.selected === choice;
              const isAnswer = choice === activeQuestion.answer;
              const color = !answered
                ? 'border-[#ddd4c8] bg-[#fffaf3] hover:bg-[#f5eadf]'
                : isAnswer
                  ? 'border-[#3d735f] bg-[#e5f2ea]'
                  : isSelected
                    ? 'border-[#b65842] bg-[#fae8e1]'
                    : 'border-[#ddd4c8] bg-[#f8f3eb] opacity-70';
              return (
                <button
                  type="button"
                  key={choice}
                  onClick={() => onAnswer(activeQuestion, choice)}
                  className={`min-h-14 min-w-0 rounded-md border px-4 py-3 text-left text-base font-semibold break-words ${color}`}
                >
                  {choice}
                </button>
              );
            })}
          </div>

          <AnswerPanel question={activeQuestion} answer={answers[activeQuestion.id]} items={items} showRuby={settings.showExplanationRuby} labels={labels} />

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={onPrev} className="h-10 rounded-md border border-[#c8bcae] bg-white px-4 text-sm font-semibold">
              {labels.prev}
            </button>
            <button type="button" onClick={onNext} className="h-10 rounded-md bg-[#24473f] px-4 text-sm font-semibold text-white">
              {labels.next}
            </button>
          </div>
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
}: {
  question: Question;
  answer?: { selected: string; correct: boolean };
  items: VocabItem[];
  showRuby: boolean;
  labels: Record<string, string>;
}) {
  if (!answer) {
    return (
      <div className="mt-5 rounded-lg border border-[#ded5c7] bg-[#fffaf4] p-4 text-sm leading-6 text-[#62645f]">
        {labels.beforeAnswer}
      </div>
    );
  }

  return (
    <div className={`mt-5 rounded-lg border p-4 ${answer.correct ? 'border-[#3d735f] bg-[#e8f3ec]' : 'border-[#b65842] bg-[#fae9e2]'}`}>
      <p className="text-sm font-semibold">{answer.correct ? labels.correct : labels.wrong}</p>
      <p className="mt-2 text-sm">{labels.yourAnswer}：{answer.selected}</p>
      <p className="mt-1 text-sm">{labels.rightAnswer}：{question.answer}</p>
      <p className="mt-3 text-sm leading-6 text-[#3f4641]">
        <RubyText text={question.explanation} items={items} enabled={showRuby} />
      </p>
    </div>
  );
}

function WordDetailPanel({
  item,
  index,
  total,
  progress,
  showRuby,
  labels,
  deckLabels,
  locale,
  onPrevious,
  onNext,
}: {
  item?: VocabItem;
  index: number;
  total: number;
  progress?: ProgressState[string];
  showRuby: boolean;
  labels: Record<string, string>;
  deckLabels: Record<Deck | 'all', string>;
  locale: Locale;
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
      className="min-w-0 rounded-lg border border-[#d8cdbc] bg-[#fffaf4] p-4 shadow-sm md:p-5"
      onTouchStart={(event) => setTouchStart(event.changedTouches[0]?.clientX ?? null)}
      onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#856033]">{labels.wordDetail}</p>
          <h2 className="mt-1 text-2xl font-semibold">{item.original}</h2>
          <p className="mt-1 text-sm text-[#62645f]">{labels.swipeHint}</p>
        </div>
        <div className="flex items-center gap-2">
          <ArrowButton label={labels.prev} direction="left" onClick={onPrevious} />
          <span className="min-w-20 rounded-md bg-[#e8f0eb] px-3 py-2 text-center text-sm font-semibold text-[#24473f]">
            {total ? `${safeIndex(index, total) + 1} / ${total}` : '0 / 0'}
          </span>
          <ArrowButton label={labels.next} direction="right" onClick={onNext} />
        </div>
      </div>
      <VocabCard
        item={item}
        progress={progress}
        showRuby={showRuby}
        labels={labels}
        deckLabels={deckLabels}
        locale={locale}
      />
    </section>
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
  progress,
  showRuby,
  labels,
  deckLabels,
  locale,
}: {
  item: VocabItem;
  progress?: ProgressState[string];
  showRuby: boolean;
  labels: Record<string, string>;
  deckLabels: Record<Deck | 'all', string>;
  locale: Locale;
}) {
  const meaning = localized(item, locale, 'meaning') ?? item.meaning_zh;
  const coreMemory = localized(item, locale, 'core_memory') ?? item.core_memory;
  const analysis = localized(item, locale, 'analysis') ?? item.analysis;
  return (
    <article className="min-w-0 rounded-lg border border-[#d8cdbc] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-[#24473f] px-2 py-1 text-xs font-semibold text-white">{deckLabels[item.deck]}</span>
        <span className="rounded bg-[#ead9c7] px-2 py-1 text-xs font-semibold text-[#6f412d]">{item.jlpt_level ?? 'unknown'}</span>
        <span className="rounded bg-[#edf0e9] px-2 py-1 text-xs font-semibold text-[#52645c]">{progress?.status ?? 'new'}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#62645f]">
        <span className="rounded bg-[#f8f3eb] px-2 py-1">{labels.reviewCount}: {progress?.reviewCount ?? 0}</span>
        <span className="rounded bg-[#f8f3eb] px-2 py-1">{labels.nextReview}: {formatDate(progress?.nextReviewAt, locale)}</span>
      </div>
      <h3 className="mt-3 text-2xl font-semibold">
        <RubyText text={item.original} items={[item]} enabled={showRuby} />
      </h3>
      {item.reading ? <p className="mt-1 text-sm font-semibold text-[#8c5a3d]">{item.reading}</p> : null}
      <p className="mt-3 text-sm font-semibold">{meaning}</p>
      <p className="mt-2 text-sm leading-6 text-[#5f625b]">{coreMemory}</p>
      {item.collocations?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.collocations.slice(0, 4).map((collocation) => (
            <span key={collocation} className="rounded-md bg-[#f4eee6] px-2 py-1 text-xs text-[#554f48]">
              <RubyText text={collocation} items={[item]} enabled={showRuby} />
            </span>
          ))}
        </div>
      ) : null}
      {analysis ? (
        <p className="mt-3 rounded-md bg-[#f8f3eb] p-3 text-xs leading-5 text-[#62645f]">
          {labels.analysis}：<RubyText text={analysis} items={[item]} enabled={showRuby} />
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
