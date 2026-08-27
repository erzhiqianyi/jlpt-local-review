'use client';

import { useEffect, useMemo, useState } from 'react';

type Deck = 'n1_vocab' | 'name_reading' | 'grammar_expression';
type QuestionKind = 'moji_goi' | 'meaning' | 'kana_to_kanji' | 'kanji_to_kana';
type Locale = 'zh-CN' | 'ja' | 'en';
type AppView = 'home' | 'vocabulary' | 'grammar' | 'listening' | 'reading' | 'mixed' | 'drafts' | 'about' | 'settings';
type StudyPage = 'questions' | 'words';
type AppRoute = { view: AppView; page: StudyPage };
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
type AuthUser = { id: number; username: string };
type StudyState = { answers: AnswerState; progress: ProgressState; settings: DisplaySettings };
type DraftSummary = { id: string; title: string; status: string; created_at: string; updated_at: string };
type DraftAnnotation = { id: string; body: string; created_at: string };
type ReviewPackDraft = DraftSummary & { content: unknown; annotations: DraftAnnotation[] };
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
  prompt: string;
  choices: string[];
  answer: string;
  context: string;
  correctReason: string;
  memoryPoint: string;
  choiceAnalysis: { choice: string; correct: boolean; explanation: string }[];
};

const STORAGE_TOKEN = 'jlpt-auth-token-v1';
const QUESTION_KIND_ORDER: QuestionKind[] = ['moji_goi', 'meaning', 'kana_to_kanji', 'kanji_to_kana'];

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
    items: '词条',
    questions: '题目',
    answered: '已作答',
    correct: '正确',
    mastered: '掌握',
    reviewCount: '复习',
    nextReview: '下次复习',
    wordDetail: '词条详情',
    questionPage: '题目练习',
    wordPage: '词条页面',
    page: '页面',
    filters: '筛选',
    hideFilters: '收起筛选',
    showFilters: '展开筛选',
    settings: '设置',
    account: '用户',
    currentUser: '当前用户',
    logout: '退出登录',
    skillTitle: '两种技能工作流',
    skillBody: '使用 jlpt-chat-review 技能，把聊天里的单词、句子、语法疑问和完整题目整理成按月归档的 review-data JSON。技能会记录输入时间、输出多语言说明、生成 JLPT 题型，并把假名标注放在可控制的 ruby_terms 中。',
    generatorSkillBody: '没有自己的输入内容时，使用 jlpt-study-generator。它会根据目标级别、备考天数、每日时间和训练模块生成通用计划及首周学习内容。AI 生成材料不是 JLPT 官方内容，读音、含义、答案和级别需要你自行核对。',
    mcpTitle: '接入 MCP',
    mcpBody: '本地 MCP server 使用同一个 JSON 资料层和 SQLite 学习记录。启动命令是 npm run mcp，在 MCP 客户端里把 command 指向 node，args 指向 server/mcp-server.mjs。',
    mcpAuth: '认证方式：先调用 login，输入这个应用里的本地账号名和密码，后续工具传入返回的 token。',
    mcpTools: '当前工具：get_review_data、get_study_record、list_due_reviews、analyze_weak_points、generate_daily_review_pack、create_review_pack_draft、get_draft_revision_context。写入先进入草稿，用户可预览和批注。',
    mcpCodexGuideTitle: '以 Codex 接入为例',
    mcpCodexGuideBody: 'Codex 通过 STDIO 启动这个本地 MCP server。它不会直接连正式题库文件，而是通过工具读取 JSON 资料、SQLite 学习记录和草稿批注。',
    mcpFlowTitle: '工作流',
    mcpFlowApp: '本地应用',
    mcpFlowAppBody: '注册账号、练习、预览草稿、写批注。',
    mcpFlowBackend: '本地后台',
    mcpFlowBackendBody: '读取 JSON 资料，保存 SQLite 用户数据。',
    mcpFlowMcp: 'MCP Server',
    mcpFlowMcpBody: '把学习记录、弱点分析、草稿上下文暴露给 Codex。',
    mcpFlowCodex: 'Codex',
    mcpFlowCodexBody: '生成复习草稿，根据用户批注优化下一版。',
    mcpSetupTitle: '接入步骤',
    mcpStepOne: '1. 在这个 worktree 运行 npm install，并用 npm run dev 启动前端和后台。',
    mcpStepTwo: '2. 打开应用，创建一个本地账号和密码；MCP 的 login 工具会复用这个账号。',
    mcpStepThree: '3. 在 Codex 的 config.toml 里加入 jlpt_review MCP server 配置。',
    mcpStepFour: '4. 重启 Codex，在输入框使用 /mcp 确认 jlpt_review 已连接。',
    mcpStepFive: '5. 让 Codex 调用 generate_daily_review_pack 或 create_review_pack_draft；然后回到草稿页预览、批注，再用 get_draft_revision_context 继续优化。',
    mcpConfigTitle: 'Codex config.toml 示例',
    mcpPromptTitle: '可以这样对 Codex 说',
    mcpPromptExample: '请使用 jlpt_review MCP，登录我的本地 JLPT 账号，读取 get_study_record，分析弱点，创建一个 30 分钟的 daily review pack 草稿。不要直接改月度归档 JSON。',
    mcpImplementationTitle: 'MCP 是怎么实现的',
    mcpImplementationServer: 'server/mcp-server.mjs 是一个 STDIO MCP server，接收 JSON-RPC 消息，响应 initialize、tools/list 和 tools/call。',
    mcpImplementationStorage: 'server/storage.mjs 是共享数据层：题库资源从 public/data/review-data/YYYY/MM.json 聚合读取，用户、会话、进度、草稿和批注写入 SQLite。',
    mcpImplementationAuth: 'MCP 工具不直接信任调用方。先用 login 换取本地 session token，其他工具必须带 token 才能读取个人学习数据。',
    mcpImplementationDraft: 'agent 生成内容先保存为 review_pack_drafts。用户在草稿页预览并写批注后，get_draft_revision_context 会把草稿、批注和学习记录合成下一轮优化输入。',
    navDrafts: '草稿',
    draftsTitle: '复习草稿',
    draftsBody: 'MCP 或后台生成的复习资料先进入草稿。你可以在这里预览、写批注，再让 agent 根据批注优化下一版。',
    createDailyDraft: '生成今日草稿',
    noDrafts: '还没有草稿',
    noDraftsBody: '先生成一个今日草稿，或让 MCP 调用 create_review_pack_draft 保存 agent 生成内容。',
    draftPreview: '草稿预览',
    draftAnnotations: '用户批注',
    addAnnotation: '添加批注',
    annotationPlaceholder: '写下需要调整的地方，例如题量太多、解释不够细、例句不自然、想按语法点重排。',
    saveAnnotation: '保存批注',
    revisionContext: '复制优化上下文',
    revisionContextCopied: '优化上下文已复制，可以交给 Codex 或 MCP agent 继续改。',
    draftStatus: '状态',
    updatedAt: '更新',
    aiGeneratedLabel: 'AI 生成',
    unverifiedContentNotice: '这项内容由 AI 生成且尚未核对，请自行判断读音、含义、答案和 JLPT 级别。',
    workflowTitle: '推荐使用流程',
    workflowCapture: '1. 选择入口：输入自己的疑问，或只提供目标级别、备考天数和重点模块。',
    workflowGenerate: '2. 用 jlpt-chat-review 整理个人内容，或用 jlpt-study-generator 生成通用计划和材料。',
    workflowPractice: '3. 在网页里按单词、语法、听力、阅读、综合模块复习。',
    workflowExport: '4. 在草稿页预览 MCP 生成结果，写批注，再让 Codex 读取 revision context 优化下一版。',
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
    heroBody: '聊天负责输入和整理，后台负责账号、学习记录和个性化数据，网页负责分模块复习。',
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
    aboutBody: '这是一个本地优先的 JLPT 学习工具。你可以整理自己的疑问，也可以只提供目标级别和备考时间，让 AI 生成通用学习计划。后台负责资料读取、账号、判分记录和复习进度。',
    deployTitle: '自己部署',
    deployBody: 'Fork GitHub 仓库，选择使用示例数据或 npm run data:blank 创建空白数据，然后部署到 Cloudflare Pages。',
    deck: 'Deck',
    questionType: '题型',
    display: '显示设置',
    language: '界面语言',
    reviewRuby: '复习显示假名',
    explanationRuby: '解析显示假名',
    noQuestion: '没有可练习题目',
    noQuestionBody: '当前筛选条件下没有题目。',
    meaningTitle: '言い換え類義',
    meaningPrompt: '次の文の「{word}」に最も近い意味を選んでください。{sentence}',
    kanaToKanjiTitle: '表記',
    kanaToKanjiPrompt: '次の文の「{reading}」を漢字で書くと、最もよいものはどれですか。{sentence}',
    kanjiToKanaTitle: '漢字読み',
    kanjiToKanaPrompt: '次の文の「{word}」の読み方として、最もよいものはどれですか。{sentence}',
    nameReadingTitle: '人名読み',
    nameReadingPrompt: '「{word}」作为人名或地名时，读法是什么？{sentence}',
    mojiGoiTitle: 'JLPT 文字・語彙',
    mojiGoiMeaningPrompt: '中文意思「{meaning}」对应哪一个日语词？',
    yourAnswer: '你的答案',
    rightAnswer: '正确答案',
    wrong: '错误',
    prev: '上一题',
    next: '下一题',
    analysis: '解析',
    contextLabel: '完整语境',
    correctReasonLabel: '正确理由',
    choiceAnalysisLabel: '选项分析',
    memoryPointLabel: '记忆重点',
    choiceFits: '符合',
    choiceDoesNotFit: '不符合',
    contact: '联系',
    intro: '使用 Codex 或 Claude Code 整理自己的学习记录，通过本地后台练习 JLPT 文字・語彙、言い換え類義、表記和漢字読み。',
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
    items: '項目',
    questions: '問題',
    answered: '回答済み',
    correct: '正解',
    mastered: '習得',
    reviewCount: '復習',
    nextReview: '次回復習',
    wordDetail: '語彙詳細',
    questionPage: '問題練習',
    wordPage: '語彙ページ',
    page: 'ページ',
    filters: 'フィルター',
    hideFilters: 'フィルターを閉じる',
    showFilters: 'フィルターを開く',
    settings: '設定',
    account: 'ユーザー',
    currentUser: '現在のユーザー',
    logout: 'ログアウト',
    skillTitle: '2つのスキル',
    skillBody: 'jlpt-chat-review スキルで、チャット内の語彙・文・文法の疑問・問題を月別アーカイブの review-data JSON に整理します。入力時刻、多言語説明、JLPT 形式の問題、表示制御できる ruby_terms を扱います。',
    generatorSkillBody: '自分の入力素材がない場合は jlpt-study-generator を使います。目標レベル、日数、1日の学習時間、重点分野から一般的な計画と最初の7日分の教材を作ります。AI生成教材はJLPT公式ではないため、読み・意味・答え・レベルを自分で確認してください。',
    mcpTitle: 'MCP 接続',
    mcpBody: 'ローカル MCP server は同じ JSON 教材層と SQLite 学習記録を使います。起動コマンドは npm run mcp です。MCP クライアントでは command を node、args を server/mcp-server.mjs に設定します。',
    mcpAuth: '認証方法：まず login を呼び、このアプリのローカルユーザー名とパスワードを入力します。以後のツールには返された token を渡します。',
    mcpTools: '現在のツール：get_review_data、get_study_record、list_due_reviews、analyze_weak_points、generate_daily_review_pack、create_review_pack_draft、get_draft_revision_context。書き込みはまずドラフトに入り、ユーザーがプレビューとコメントを行えます。',
    mcpCodexGuideTitle: 'Codex 接続例',
    mcpCodexGuideBody: 'Codex は STDIO でこのローカル MCP server を起動します。正式な問題データを直接編集せず、ツール経由で JSON 教材、SQLite 学習記録、ドラフトコメントを読みます。',
    mcpFlowTitle: 'ワークフロー',
    mcpFlowApp: 'ローカルアプリ',
    mcpFlowAppBody: 'アカウント作成、練習、ドラフトプレビュー、コメント入力。',
    mcpFlowBackend: 'ローカルバックエンド',
    mcpFlowBackendBody: 'JSON 教材を読み、SQLite にユーザーデータを保存。',
    mcpFlowMcp: 'MCP Server',
    mcpFlowMcpBody: '学習記録、弱点分析、ドラフト文脈を Codex に公開。',
    mcpFlowCodex: 'Codex',
    mcpFlowCodexBody: '復習ドラフトを作成し、ユーザーコメントから次版を改善。',
    mcpSetupTitle: '接続手順',
    mcpStepOne: '1. この worktree で npm install を実行し、npm run dev でフロントエンドとバックエンドを起動します。',
    mcpStepTwo: '2. アプリを開いてローカルユーザー名とパスワードを作成します。MCP の login ツールも同じアカウントを使います。',
    mcpStepThree: '3. Codex の config.toml に jlpt_review MCP server 設定を追加します。',
    mcpStepFour: '4. Codex を再起動し、入力欄で /mcp を使って jlpt_review の接続を確認します。',
    mcpStepFive: '5. Codex に generate_daily_review_pack または create_review_pack_draft を呼ばせます。その後ドラフト画面でプレビューとコメントを行い、get_draft_revision_context で改善を続けます。',
    mcpConfigTitle: 'Codex config.toml 例',
    mcpPromptTitle: 'Codex への依頼例',
    mcpPromptExample: 'jlpt_review MCP を使って、私のローカル JLPT アカウントにログインし、get_study_record を読んで弱点を分析し、30分の daily review pack ドラフトを作ってください。月別アーカイブ JSON は直接変更しないでください。',
    mcpImplementationTitle: 'MCP の実装',
    mcpImplementationServer: 'server/mcp-server.mjs は STDIO MCP server で、JSON-RPC メッセージを受け取り、initialize、tools/list、tools/call に応答します。',
    mcpImplementationStorage: 'server/storage.mjs は共有データ層です。問題データは public/data/review-data/YYYY/MM.json から集約し、ユーザー、セッション、進捗、ドラフト、コメントは SQLite に保存します。',
    mcpImplementationAuth: 'MCP ツールは呼び出し元をそのまま信頼しません。まず login でローカル session token を取得し、他のツールは token 付きで個人学習データを読みます。',
    mcpImplementationDraft: 'agent の生成内容はまず review_pack_drafts に保存されます。ユーザーがドラフト画面でプレビューとコメントを行うと、get_draft_revision_context がドラフト、コメント、学習記録を次の改善入力にまとめます。',
    navDrafts: 'ドラフト',
    draftsTitle: '復習ドラフト',
    draftsBody: 'MCP またはバックエンドが生成した復習教材はまずドラフトに入ります。ここでプレビューし、コメントを書き、agent に次の版を改善させます。',
    createDailyDraft: '今日のドラフトを作成',
    noDrafts: 'ドラフトがありません',
    noDraftsBody: '今日のドラフトを作成するか、MCP の create_review_pack_draft で agent の生成内容を保存します。',
    draftPreview: 'ドラフトプレビュー',
    draftAnnotations: 'ユーザーコメント',
    addAnnotation: 'コメントを追加',
    annotationPlaceholder: '調整したい点を書きます。例：問題数が多すぎる、説明を詳しくしたい、例文が不自然、文法項目別に並べたい。',
    saveAnnotation: 'コメントを保存',
    revisionContext: '改善用コンテキストをコピー',
    revisionContextCopied: '改善用コンテキストをコピーしました。Codex または MCP agent に渡して続けられます。',
    draftStatus: '状態',
    updatedAt: '更新',
    aiGeneratedLabel: 'AI生成',
    unverifiedContentNotice: 'この内容はAIが生成した未確認の教材です。読み・意味・答え・JLPTレベルを自分で確認してください。',
    workflowTitle: 'おすすめの使い方',
    workflowCapture: '1. 自分の疑問を入力するか、目標レベル・日数・重点分野だけを指定するか選びます。',
    workflowGenerate: '2. 個人素材は jlpt-chat-review、一般計画と教材は jlpt-study-generator で作成します。',
    workflowPractice: '3. Web で語彙・文法・聴解・読解・総合のモジュール別に復習します。',
    workflowExport: '4. ドラフト画面で MCP の生成結果をプレビューし、コメントを書き、Codex に revision context を読ませて次版を改善します。',
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
    heroBody: 'チャットで入力と整理を行い、バックエンドでアカウントと学習記録を管理し、Web アプリで分野別に復習します。',
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
    aboutBody: 'これはローカル優先の JLPT 学習ツールです。自分の疑問を整理する方法と、目標レベルと期間から一般的な計画を生成する方法があります。バックエンドが教材読み込み、アカウント、採点記録、復習進捗を担当します。',
    deployTitle: '自分でデプロイ',
    deployBody: 'GitHub リポジトリを fork し、サンプルデータを使うか npm run data:blank で空データを作成して、Cloudflare Pages にデプロイします。',
    deck: 'Deck',
    questionType: '問題形式',
    display: '表示設定',
    language: '表示言語',
    reviewRuby: '復習にふりがな',
    explanationRuby: '解説にふりがな',
    noQuestion: '問題がありません',
    noQuestionBody: '現在の条件では問題がありません。',
    meaningTitle: '言い換え類義',
    meaningPrompt: '次の文の「{word}」に最も近い意味を選んでください。{sentence}',
    kanaToKanjiTitle: '表記',
    kanaToKanjiPrompt: '次の文の「{reading}」を漢字で書くと、最もよいものはどれですか。{sentence}',
    kanjiToKanaTitle: '漢字読み',
    kanjiToKanaPrompt: '次の文の「{word}」の読み方として、最もよいものはどれですか。{sentence}',
    nameReadingTitle: '人名読み',
    nameReadingPrompt: '「{word}」を人名または地名として読む場合、最も適切な読みはどれですか。{sentence}',
    mojiGoiTitle: 'JLPT 文字・語彙',
    mojiGoiMeaningPrompt: '意味「{meaning}」に対応する日本語を選んでください。',
    yourAnswer: 'あなたの答え',
    rightAnswer: '正解',
    wrong: '不正解',
    prev: '前へ',
    next: '次へ',
    analysis: '解説',
    contextLabel: '文脈',
    correctReasonLabel: '正解の理由',
    choiceAnalysisLabel: '選択肢の分析',
    memoryPointLabel: '覚えるポイント',
    choiceFits: '適切',
    choiceDoesNotFit: '不適切',
    contact: '連絡先',
    intro: 'Codex や Claude Code で整理した学習記録を使い、ローカルバックエンドで JLPT 文字・語彙・言い換え類義・表記・漢字読みを復習します。',
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
    items: 'Items',
    questions: 'Questions',
    answered: 'Answered',
    correct: 'Correct',
    mastered: 'Mastered',
    reviewCount: 'Reviews',
    nextReview: 'Next Review',
    wordDetail: 'Word Detail',
    questionPage: 'Practice Questions',
    wordPage: 'Word Page',
    page: 'Page',
    filters: 'Filters',
    hideFilters: 'Hide Filters',
    showFilters: 'Show Filters',
    settings: 'Settings',
    account: 'User',
    currentUser: 'Current User',
    logout: 'Logout',
    skillTitle: 'Two Skill Workflows',
    skillBody: 'Use the jlpt-chat-review skill to turn words, sentences, grammar questions, and full JLPT problems from chat into monthly review-data JSON archives. The skill records input time, multilingual explanations, JLPT question types, and display-controlled ruby_terms.',
    generatorSkillBody: 'When you have no source material, use jlpt-study-generator. It creates a general plan and the first seven days of content from your target level, available days, daily time, and focus modules. AI-generated material is not official JLPT content; verify readings, meanings, answers, and level assignments yourself.',
    mcpTitle: 'Connect MCP',
    mcpBody: 'The local MCP server uses the same JSON resource layer and SQLite study records as the app. Start it with npm run mcp. In an MCP client, set command to node and args to server/mcp-server.mjs.',
    mcpAuth: 'Auth flow: call login first with the local username and password from this app, then pass the returned token to the other tools.',
    mcpTools: 'Current tools: get_review_data, get_study_record, list_due_reviews, analyze_weak_points, generate_daily_review_pack, create_review_pack_draft, and get_draft_revision_context. Writes land in drafts first so the user can preview and annotate them.',
    mcpCodexGuideTitle: 'Codex Example',
    mcpCodexGuideBody: 'Codex starts this local MCP server over STDIO. It does not directly edit the official deck. It reads JSON resources, SQLite study records, and draft annotations through tools.',
    mcpFlowTitle: 'Workflow',
    mcpFlowApp: 'Local App',
    mcpFlowAppBody: 'Create an account, practice, preview drafts, and add annotations.',
    mcpFlowBackend: 'Local Backend',
    mcpFlowBackendBody: 'Read JSON resources and store user data in SQLite.',
    mcpFlowMcp: 'MCP Server',
    mcpFlowMcpBody: 'Expose study records, weak-point analysis, and draft context to Codex.',
    mcpFlowCodex: 'Codex',
    mcpFlowCodexBody: 'Generate review drafts and improve the next version from user comments.',
    mcpSetupTitle: 'Setup Steps',
    mcpStepOne: '1. Run npm install in this worktree, then run npm run dev to start the frontend and backend.',
    mcpStepTwo: '2. Open the app and create a local username and password. The MCP login tool uses the same account.',
    mcpStepThree: '3. Add the jlpt_review MCP server to Codex config.toml.',
    mcpStepFour: '4. Restart Codex and use /mcp in the composer to confirm jlpt_review is connected.',
    mcpStepFive: '5. Ask Codex to call generate_daily_review_pack or create_review_pack_draft. Preview and annotate it in Drafts, then use get_draft_revision_context for the next revision.',
    mcpConfigTitle: 'Codex config.toml Example',
    mcpPromptTitle: 'Example Codex Prompt',
    mcpPromptExample: 'Use the jlpt_review MCP server, log in to my local JLPT account, read get_study_record, analyze weak points, and create a 30-minute daily review pack draft. Do not directly edit monthly resource JSON.',
    mcpImplementationTitle: 'How MCP Works',
    mcpImplementationServer: 'server/mcp-server.mjs is a STDIO MCP server. It reads JSON-RPC messages and responds to initialize, tools/list, and tools/call.',
    mcpImplementationStorage: 'server/storage.mjs is the shared data layer. Deck resources are aggregated from public/data/review-data/YYYY/MM.json, while users, sessions, progress, drafts, and annotations are stored in SQLite.',
    mcpImplementationAuth: 'MCP tools do not trust callers by default. Call login first to receive a local session token, then pass that token to tools that read personal study data.',
    mcpImplementationDraft: 'Agent output is saved into review_pack_drafts first. After the user previews and annotates it, get_draft_revision_context combines the draft, annotations, and study record for the next optimization pass.',
    navDrafts: 'Drafts',
    draftsTitle: 'Review Drafts',
    draftsBody: 'Review material generated by MCP or the backend lands here first. Preview it, add comments, then ask the agent to optimize the next revision from those annotations.',
    createDailyDraft: 'Generate Today Draft',
    noDrafts: 'No drafts yet',
    noDraftsBody: 'Generate a daily draft, or ask MCP to call create_review_pack_draft with agent-generated content.',
    draftPreview: 'Draft Preview',
    draftAnnotations: 'User Annotations',
    addAnnotation: 'Add Annotation',
    annotationPlaceholder: 'Write what should change, such as fewer questions, deeper explanations, more natural examples, or grouping by grammar point.',
    saveAnnotation: 'Save Annotation',
    revisionContext: 'Copy Revision Context',
    revisionContextCopied: 'Revision context copied. Give it to Codex or an MCP agent to continue refining.',
    draftStatus: 'Status',
    updatedAt: 'Updated',
    aiGeneratedLabel: 'AI generated',
    unverifiedContentNotice: 'This item was generated by AI and has not been verified. Check its reading, meaning, answer, and JLPT level yourself.',
    workflowTitle: 'Recommended Flow',
    workflowCapture: '1. Choose an entry point: provide your own questions, or only a target level, study days, and focus modules.',
    workflowGenerate: '2. Use jlpt-chat-review for personal material, or jlpt-study-generator for a general plan and content.',
    workflowPractice: '3. Review by vocabulary, grammar, listening, reading, and mixed modules in the web app.',
    workflowExport: '4. Preview MCP output in Drafts, add annotations, then ask Codex to read the revision context and improve the next version.',
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
    heroBody: 'Use chat for capture and structuring, the backend for accounts and study records, and the web app for module-based review.',
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
    aboutBody: 'This is a local-first JLPT study tool. You can structure your own questions or generate a general plan from a target level and study duration. The backend handles resource loading, accounts, scoring records, and review progress.',
    deployTitle: 'Deploy Your Own',
    deployBody: 'Fork the GitHub repo, keep the sample data or run npm run data:blank, then deploy it to Cloudflare Pages.',
    deck: 'Deck',
    questionType: 'Question Type',
    display: 'Display',
    language: 'Language',
    reviewRuby: 'Show furigana in review',
    explanationRuby: 'Show furigana in explanations',
    noQuestion: 'No questions',
    noQuestionBody: 'No questions match the current filters.',
    meaningTitle: 'Paraphrase',
    meaningPrompt: 'Choose the closest meaning of "{word}" in the sentence. {sentence}',
    kanaToKanjiTitle: 'Orthography',
    kanaToKanjiPrompt: 'Which kanji form best matches "{reading}" in the sentence? {sentence}',
    kanjiToKanaTitle: 'Kanji Reading',
    kanjiToKanaPrompt: 'Choose the best reading of "{word}" in the sentence. {sentence}',
    nameReadingTitle: 'Name Reading',
    nameReadingPrompt: 'How is "{word}" read when used as a personal or place name? {sentence}',
    mojiGoiTitle: 'JLPT Vocabulary',
    mojiGoiMeaningPrompt: 'Which Japanese word matches the meaning "{meaning}"?',
    yourAnswer: 'Your answer',
    rightAnswer: 'Correct answer',
    wrong: 'Incorrect',
    prev: 'Previous',
    next: 'Next',
    analysis: 'Analysis',
    contextLabel: 'Full Context',
    correctReasonLabel: 'Why It Is Correct',
    choiceAnalysisLabel: 'Choice Analysis',
    memoryPointLabel: 'Memory Point',
    choiceFits: 'Fits',
    choiceDoesNotFit: 'Does not fit',
    contact: 'Contact',
    intro: 'Turn your Codex or Claude Code study chats into a local backend-powered deck for JLPT vocabulary, paraphrase, orthography, and kanji-reading practice.',
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
  const [authToken, setAuthToken] = useState<string>(() => (typeof window === 'undefined' ? '' : localStorage.getItem(STORAGE_TOKEN) ?? ''));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [activeDraft, setActiveDraft] = useState<ReviewPackDraft | null>(null);
  const [draftAnnotation, setDraftAnnotation] = useState('');
  const [selectedDeck, setSelectedDeck] = useState<Deck | 'all'>('all');
  const [selectedKind, setSelectedKind] = useState<QuestionKind>('moji_goi');
  const [activeIndex, setActiveIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [progress, setProgress] = useState<ProgressState>({});
  const [settings, setSettings] = useState<DisplaySettings>(defaultSettings);
  const [route, setRoute] = useState<AppRoute>(() => routeFromHash(typeof window === 'undefined' ? '' : window.location.hash));
  const [filtersCollapsed, setFiltersCollapsed] = useState(() => shouldCollapseFilters());
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
        const [reviewData, studyState, draftList] = await Promise.all([
          apiRequest<ReviewData>('/api/review-data', { token: authToken }),
          apiRequest<StudyState>('/api/study-state', { token: authToken }),
          apiRequest<{ drafts: DraftSummary[] }>('/api/drafts', { token: authToken }),
        ]);
        if (cancelled) {
          return;
        }
        setUser(me.user);
        setData(reviewData);
        applyStudyState(studyState);
        setDrafts(draftList.drafts ?? []);
        setAuthError('');
      } catch (error) {
        if (!cancelled) {
          localStorage.removeItem(STORAGE_TOKEN);
          setAuthToken('');
          setUser(null);
          setAuthError(error instanceof Error ? error.message : 'Session expired');
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [authToken]);

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
  const allQuestions = useMemo(() => buildQuestions(items, locale), [items, locale]);
  const availableKinds = useMemo(
    () => QUESTION_KIND_ORDER.filter((kind) => allQuestions.some((question) => question.kind === kind)),
    [allQuestions],
  );
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
  const hasStudySidebar = activeView === 'vocabulary' || activeView === 'grammar' || activeView === 'mixed';

  useEffect(() => {
    setActiveIndex(0);
    setWordIndex(0);
  }, [activeView, selectedDeck, selectedKind]);

  useEffect(() => {
    if (availableKinds.length && !availableKinds.includes(selectedKind)) {
      setSelectedKind(availableKinds[0]);
    }
  }, [availableKinds, selectedKind]);

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
    if (authToken) {
      apiRequest<StudyState>('/api/answers', {
        method: 'POST',
        token: authToken,
        body: {
          questionId: question.id,
          itemId: question.itemId,
          selected,
          correct,
          progressEntry: nextProgress[question.itemId],
        },
      })
        .then(applyStudyState)
        .catch((error) => setAuthError(error instanceof Error ? error.message : 'Failed to save answer'));
    }
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

  function updateSettings(nextSettings: DisplaySettings) {
    const normalized = normalizeSettings(nextSettings);
    setSettings(normalized);
    if (authToken) {
      apiRequest<{ settings: DisplaySettings }>('/api/study-state/settings', { method: 'PUT', token: authToken, body: normalized })
        .then((response) => setSettings(normalizeSettings(response.settings)))
        .catch((error) => setAuthError(error instanceof Error ? error.message : 'Failed to save settings'));
    }
  }

  function applyStudyState(studyState: StudyState) {
    setAnswers(studyState.answers ?? {});
    setProgress(studyState.progress ?? {});
    setSettings(normalizeSettings(studyState.settings));
  }

  async function handleAuth(mode: 'login' | 'register', username: string, password: string) {
    setAuthLoading(true);
    setAuthError('');
    try {
      const session = await apiRequest<{ user: AuthUser; token: string }>(`/api/auth/${mode}`, {
        method: 'POST',
        body: { username, password },
      });
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
    if (authToken) {
      apiRequest('/api/auth/logout', { method: 'POST', token: authToken }).catch(() => undefined);
    }
    localStorage.removeItem(STORAGE_TOKEN);
    setAuthToken('');
    setUser(null);
    setData(fallbackData);
    setAnswers({});
    setProgress({});
    setSettings(defaultSettings);
    setDrafts([]);
    setActiveDraft(null);
  }

  async function refreshDrafts(selectId?: string) {
    if (!authToken) {
      return;
    }
    const list = await apiRequest<{ drafts: DraftSummary[] }>('/api/drafts', { token: authToken });
    setDrafts(list.drafts ?? []);
    const nextId = selectId ?? activeDraft?.id ?? list.drafts?.[0]?.id;
    if (nextId) {
      const response = await apiRequest<{ draft: ReviewPackDraft }>(`/api/drafts/${nextId}`, { token: authToken });
      setActiveDraft(response.draft);
    }
  }

  async function createDailyDraft() {
    if (!authToken) {
      return;
    }
    try {
      const response = await apiRequest<{ draft: ReviewPackDraft }>('/api/drafts', {
        method: 'POST',
        token: authToken,
        body: { kind: 'daily_review_pack', minutes: 30 },
      });
      setActiveDraft(response.draft);
      setDraftAnnotation('');
      await refreshDrafts(response.draft.id);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to create draft');
    }
  }

  async function selectDraft(id: string) {
    if (!authToken) {
      return;
    }
    try {
      const response = await apiRequest<{ draft: ReviewPackDraft }>(`/api/drafts/${id}`, { token: authToken });
      setActiveDraft(response.draft);
      setDraftAnnotation('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to load draft');
    }
  }

  async function saveDraftAnnotation() {
    if (!authToken || !activeDraft || !draftAnnotation.trim()) {
      return;
    }
    try {
      const response = await apiRequest<{ draft: ReviewPackDraft }>(`/api/drafts/${activeDraft.id}/annotations`, {
        method: 'POST',
        token: authToken,
        body: { body: draftAnnotation },
      });
      setActiveDraft(response.draft);
      setDraftAnnotation('');
      await refreshDrafts(response.draft.id);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to save annotation');
    }
  }

  async function copyDraftRevisionContext() {
    if (!authToken || !activeDraft) {
      return;
    }
    try {
      const context = await apiRequest<Record<string, unknown>>(`/api/drafts/${activeDraft.id}/revision-context`, { token: authToken });
      await navigator.clipboard.writeText(JSON.stringify(context, null, 2));
      setAuthError(labels.revisionContextCopied);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to copy revision context');
    }
  }

  if (authLoading && !user) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoginScreen error={authError} loading={authLoading} onSubmit={handleAuth} />;
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
        </div>
      </header>

      {authError ? (
        <div className="mx-auto mt-3 w-full max-w-7xl px-4 md:px-8 lg:px-10">
          <p className="rounded-md border border-[#d5a95f] bg-[#fff4d8] p-3 text-sm font-semibold text-[#6f4a16]">{authError}</p>
        </div>
      ) : null}

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
        </>
      ) : null}

      {activeView !== 'home' ? (
        <section className={`mx-auto grid w-full max-w-7xl min-w-0 flex-1 gap-5 px-4 py-4 md:px-8 md:py-5 lg:px-10 ${hasStudySidebar ? (filtersCollapsed ? 'lg:grid-cols-[72px_minmax(0,1fr)]' : 'lg:grid-cols-[280px_minmax(0,1fr)]') : ''}`}>
          {hasStudySidebar ? (
            <aside className="space-y-4">
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

              {!filtersCollapsed ? (
              <Panel title={labels.page}>
                <div className="grid gap-2">
                  <SegmentButton active={studyPage === 'questions'} onClick={() => navigateTo(activeView, 'questions')}>
                    {labels.questionPage}
                  </SegmentButton>
                  <SegmentButton active={studyPage === 'words'} onClick={() => navigateTo(activeView, 'words')}>
                    {labels.wordPage}
                  </SegmentButton>
                </div>
              </Panel>
              ) : null}

              {!filtersCollapsed && studyPage === 'questions' ? (
                <Panel title={labels.questionType}>
                  <div className="grid grid-cols-2 gap-2">
                    {availableKinds.map((kind) => (
                      <SegmentButton key={kind} active={selectedKind === kind} onClick={() => setSelectedKind(kind)}>
                        {kindLabels[kind]}
                      </SegmentButton>
                    ))}
                  </div>
                </Panel>
              ) : null}
            </aside>
          ) : null}

          <div className={hasStudySidebar ? 'min-w-0 space-y-5' : 'min-w-0'}>
            {activeView === 'about' ? <AboutPanel labels={labels} /> : null}
            {activeView === 'drafts' ? (
              <DraftsPanel
                labels={labels}
                drafts={drafts}
                activeDraft={activeDraft}
                annotation={draftAnnotation}
                onAnnotationChange={setDraftAnnotation}
                onCreateDailyDraft={createDailyDraft}
                onSelectDraft={selectDraft}
                onSaveAnnotation={saveDraftAnnotation}
                onCopyRevisionContext={copyDraftRevisionContext}
              />
            ) : null}
            {activeView === 'settings' ? (
              <SettingsView
                labels={labels}
                settings={settings}
                username={user.username}
                onLogout={handleLogout}
                onUpdateSettings={updateSettings}
              />
            ) : null}
            {activeView === 'listening' || activeView === 'reading' ? <EmptyModule labels={labels} /> : null}
            {activeView !== 'about' && activeView !== 'drafts' && activeView !== 'settings' && activeView !== 'listening' && activeView !== 'reading' ? (
              studyPage === 'questions' ? (
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
              ) : (
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
    const meaning = itemMeaning(item, locale);
    const example = item.examples?.[0]?.ja;
    const sentence = questionSentence(item);
    const kanaSentence = item.reading ? questionSentence(item, item.reading) : sentence;
    const context = example ?? sentence;
    const meaningAnswer = shortMeaning(meaning);
    if (allowedKinds.has('meaning')) {
      const meaningChoices = choices(
        meaningAnswer,
        questionPool(item, 'meaning', items, locale),
        index + 1,
      );
      questions.push({
        id: `${item.id}-meaning`,
        itemId: item.id,
        kind: 'meaning',
        title: labels.meaningTitle,
        prompt: template(labels.meaningPrompt, { word: item.original, sentence }),
        choices: meaningChoices,
        answer: meaningAnswer,
        ...buildQuestionExplanation(item, meaningChoices, 'meaning', items, locale, context),
      });
    }

    if (item.reading && allowedKinds.has('kana_to_kanji')) {
      const kanaToKanjiChoices = choices(
        item.original,
        questionPool(item, 'kana_to_kanji', items, locale),
        index + 2,
      );
      questions.push({
        id: `${item.id}-kana-to-kanji`,
        itemId: item.id,
        kind: 'kana_to_kanji',
        title: labels.kanaToKanjiTitle,
        prompt: template(labels.kanaToKanjiPrompt, { reading: item.reading, sentence: kanaSentence }),
        choices: kanaToKanjiChoices,
        answer: item.original,
        ...buildQuestionExplanation(item, kanaToKanjiChoices, 'kana_to_kanji', items, locale, context),
      });
    }

    if (item.reading && allowedKinds.has('kanji_to_kana')) {
      const kanjiToKanaChoices = choices(
        item.reading,
        questionPool(item, 'kanji_to_kana', items, locale),
        index + 3,
      );
      const isProperName = item.deck === 'name_reading' || item.type === 'proper_name';
      questions.push({
        id: `${item.id}-kanji-to-kana`,
        itemId: item.id,
        kind: 'kanji_to_kana',
        title: isProperName ? labels.nameReadingTitle : labels.kanjiToKanaTitle,
        prompt: template(isProperName ? labels.nameReadingPrompt : labels.kanjiToKanaPrompt, { word: item.original, sentence }),
        choices: kanjiToKanaChoices,
        answer: item.reading,
        ...buildQuestionExplanation(item, kanjiToKanaChoices, 'kanji_to_kana', items, locale, context),
      });
    }

    if (allowedKinds.has('moji_goi')) {
      questions.push(buildMojiGoiQuestion(item, items, index, locale));
    }
  });

  return questions;
}

function questionKindsForItem(item: VocabItem): QuestionKind[] {
  if (item.question_kinds !== undefined) {
    return unique(item.question_kinds);
  }

  if (item.deck === 'name_reading' || item.type === 'proper_name') {
    return [];
  }

  if (item.deck === 'grammar_expression' || item.type === 'verb_form' || item.type === 'expression') {
    return ['moji_goi', 'meaning'];
  }

  const kinds: QuestionKind[] = ['moji_goi', 'meaning'];
  if (item.reading && containsKanji(item.original)) {
    kinds.push('kana_to_kanji', 'kanji_to_kana');
  }
  return kinds;
}

function containsKanji(value: string) {
  return /[\u3400-\u9fff々〆ヵヶ]/u.test(value);
}

function questionPool(item: VocabItem, kind: QuestionKind, items: VocabItem[], locale: Locale) {
  const controlledDistractors = item.question_distractors?.[kind];
  if (controlledDistractors) {
    return controlledDistractors;
  }

  const suitableItems = items.filter((candidate) =>
    candidate.id !== item.id && questionKindsForItem(candidate).includes(kind));
  const sameDeckItems = suitableItems.filter((candidate) => candidate.deck === item.deck);
  const candidates = sameDeckItems.length >= 3 ? sameDeckItems : suitableItems;

  if (kind === 'meaning') {
    return candidates.map((candidate) => shortMeaning(itemMeaning(candidate, locale)));
  }
  if (kind === 'kanji_to_kana') {
    return candidates.map((candidate) => candidate.reading).filter(Boolean) as string[];
  }
  return candidates.map((candidate) => candidate.original);
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
  const otherSurfaces = questionPool(item, 'moji_goi', allItems, locale);
  const prompt = example
    ? example.replace(item.original, '＿＿')
    : template(labels.mojiGoiMeaningPrompt, { meaning: shortMeaning(meaning) });
  const choiceList = choices(answer, otherSurfaces, index + 4);
  const context = example ?? `「${item.original}」`;

  return {
    id: `${item.id}-moji-goi`,
    itemId: item.id,
    kind: 'moji_goi',
    title: labels.mojiGoiTitle,
    prompt,
    choices: choiceList,
    answer,
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
    return shortMeaning(itemMeaning(item, locale));
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
    if (locale === 'ja') return `この項目では「${item.original}」という人名・地名のまとまりを「${reading}」と読みます。人名の読みは漢字一字ずつの音読み・訓読みから一意に決められないため、教材・音声・本人の表記など、信頼できる出典で確認した読みを答えます。`;
    if (locale === 'en') return `In this entry, the full personal or place name “${item.original}” is read “${reading}.” Name readings cannot always be derived uniquely from each kanji, so the answer must follow a reliable source such as the textbook, audio, or the person's own notation.`;
    return `本词条记录的整体人名或地名「${item.original}」读作「${reading}」。人名读音通常不能按每个汉字的音读、训读机械拼接，因此本题以教材、音频或本人标注等可靠来源确认的整体读法为答案。`;
  }

  if (locale === 'ja') {
    if (kind === 'meaning') return `「${item.original}」は「${meaning}」という意味です。「${context}」でもこの意味で使われているため、この言い換えが最も適切です。`;
    if (kind === 'kana_to_kanji') return `「${reading}」の表記は「${item.original}」です。「${context}」の語彙と一致し、意味は「${meaning}」です。`;
    if (kind === 'kanji_to_kana') return `「${item.original}」の読みは「${reading}」です。文中でも意味は「${meaning}」で、読み方は変わりません。`;
    return `「${item.original}」は「${meaning}」を表します。「${collocation}」のような結び付きが自然で、文脈に最も合います。`;
  }

  if (locale === 'en') {
    if (kind === 'meaning') return `“${item.original}” means “${meaning}.” It keeps that meaning in “${context},” so this is the closest paraphrase.`;
    if (kind === 'kana_to_kanji') return `The kana “${reading}” is written “${item.original}.” It matches the word used in “${context}” and means “${meaning}.”`;
    if (kind === 'kanji_to_kana') return `“${item.original}” is read “${reading}.” The reading stays the same in this context, where the word means “${meaning}.”`;
    return `“${item.original}” means “${meaning}.” It forms a natural expression such as “${collocation},” which fits the sentence context.`;
  }

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
    if (isProperNameReading) {
      if (locale === 'ja') return `この項目に記録されている「${target.original}」全体の読みです。`;
      if (locale === 'en') return `This is the reading recorded for the full name “${target.original}” in this entry.`;
      return `这是本词条为「${target.original}」记录的整体读法。`;
    }
    if (locale === 'ja') return kind === 'kanji_to_kana' ? `「${target.original}」の正しい読みです。` : `対象語の意味・表記・文脈に一致する正解です。`;
    if (locale === 'en') return kind === 'kanji_to_kana' ? `This is the correct reading of “${target.original}.”` : `This matches the target word's meaning, form, and context.`;
    return kind === 'kanji_to_kana' ? `这是「${target.original}」的正确读音。` : `这个选项与目标词的词义、表记和语境一致。`;
  }

  const candidate = itemForChoice(choice, kind, allItems, locale);
  if (!candidate) {
    if (isProperNameReading) {
      if (locale === 'ja') return `「${choice}」は、この項目で確認された「${target.original}」全体の読みではありません。人名は漢字を一字ずつ機械的に読まず、出典で確認します。`;
      if (locale === 'en') return `“${choice}” is not the recorded reading of the full name “${target.original}.” Do not derive a name mechanically one kanji at a time; verify it from the source.`;
      return `「${choice}」不是本词条记录的「${target.original}」整体读法。人名不能只按单个汉字机械拼读，应以教材、音频或本人标注为准。`;
    }
    if (locale === 'ja') return `対象語の意味または読みと一致しません。`;
    if (locale === 'en') return `This does not match the target word's meaning or reading.`;
    return `这个选项与目标词要求的词义或读音不一致。`;
  }

  const candidateMeaning = itemMeaning(candidate, locale);
  const candidateCollocation = candidate.collocations?.find((value) => value.includes(candidate.original));

  if (locale === 'ja') {
    if (kind === 'kana_to_kanji') return `「${candidate.original}」の読みは「${candidate.reading ?? '不明'}」で、「${target.reading}」の表記ではありません。`;
    if (kind === 'kanji_to_kana') return isProperNameReading
      ? `「${choice}」は別の項目「${candidate.original}」の読みです。この項目で確認された「${target.original}」全体の読みとは異なります。`
      : `「${choice}」は「${candidate.original}」の読みであり、「${target.original}」の読みではありません。`;
    if (kind === 'meaning') return `この意味は「${candidate.original}」（${candidateMeaning}）に近く、「${target.original}」の中心的な意味とは異なります。`;
    return `「${candidate.original}」は「${candidateMeaning}」を表し${candidateCollocation ? `、「${candidateCollocation}」のように使います` : 'ます'}。本問の意味と結び付きません。`;
  }

  if (locale === 'en') {
    if (kind === 'kana_to_kanji') return `“${candidate.original}” is read “${candidate.reading ?? 'unknown'},” so it is not the spelling of “${target.reading}.”`;
    if (kind === 'kanji_to_kana') return isProperNameReading
      ? `“${choice}” is recorded for a different entry, “${candidate.original},” not for the full name “${target.original}.”`
      : `“${choice}” is the reading of “${candidate.original},” not “${target.original}.”`;
    if (kind === 'meaning') return `This meaning is closer to “${candidate.original}” (${candidateMeaning}), not the core meaning of “${target.original}.”`;
    return `“${candidate.original}” means “${candidateMeaning}”${candidateCollocation ? ` and is used in expressions such as “${candidateCollocation}”` : ''}. It does not fit this sentence.`;
  }

  if (kind === 'kana_to_kanji') return `「${candidate.original}」读作「${candidate.reading ?? 'unknown'}」，不是假名「${target.reading}」对应的表记。`;
  if (kind === 'kanji_to_kana') return isProperNameReading
    ? `「${choice}」是另一个词条「${candidate.original}」记录的读音，不是本词条中「${target.original}」的整体读法。`
    : `「${choice}」是「${candidate.original}」的读音，不是「${target.original}」的读音。`;
  if (kind === 'meaning') return `这个释义更接近「${candidate.original}」（${candidateMeaning}），与「${target.original}」的核心意思不同。`;
  return `「${candidate.original}」表示“${candidateMeaning}”${candidateCollocation ? `，常见搭配是「${candidateCollocation}」` : ''}，与本句需要表达的意思不符。`;
}

function itemForChoice(choice: string, kind: QuestionKind, items: VocabItem[], locale: Locale) {
  if (kind === 'meaning') {
    return items.find((item) => shortMeaning(itemMeaning(item, locale)) === choice);
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

function routeFromHash(hash: string): AppRoute {
  const [viewValue, pageValue] = hash.replace(/^#\/?/, '').split('/');
  const view = isAppView(viewValue) ? viewValue : 'home';
  const page = pageValue === 'words' ? 'words' : 'questions';
  return { view, page: supportsStudyPage(view) ? page : 'questions' };
}

function routeHash(view: AppView, page: StudyPage) {
  return supportsStudyPage(view) ? `#/${view}/${page}` : `#/${view}`;
}

function supportsStudyPage(view: AppView) {
  return view === 'vocabulary' || view === 'grammar' || view === 'mixed';
}

function isAppView(value: string): value is AppView {
  return ['home', 'vocabulary', 'grammar', 'listening', 'reading', 'mixed', 'drafts', 'about', 'settings'].includes(value);
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

async function apiRequest<T = unknown>(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof json.error === 'string' ? json.error : `Request failed: ${response.status}`);
  }
  return json as T;
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
  if (view === 'home') {
    return items;
  }
  if (view === 'grammar') {
    return items.filter((item) => item.deck === 'grammar_expression');
  }
  if (view === 'listening' || view === 'reading' || view === 'drafts' || view === 'about' || view === 'settings') {
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
    { view: 'drafts' as const, label: labels.navDrafts },
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

function DraftsPanel({
  labels,
  drafts,
  activeDraft,
  annotation,
  onAnnotationChange,
  onCreateDailyDraft,
  onSelectDraft,
  onSaveAnnotation,
  onCopyRevisionContext,
}: {
  labels: Record<string, string>;
  drafts: DraftSummary[];
  activeDraft: ReviewPackDraft | null;
  annotation: string;
  onAnnotationChange: (value: string) => void;
  onCreateDailyDraft: () => void;
  onSelectDraft: (id: string) => void;
  onSaveAnnotation: () => void;
  onCopyRevisionContext: () => void;
}) {
  return (
    <section className="min-w-0 space-y-4">
      <div className="min-w-0 rounded-lg border border-[#d7dfd6] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{labels.draftsTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[#5f625b]">{labels.draftsBody}</p>
          </div>
          <button type="button" onClick={onCreateDailyDraft} className="h-11 rounded-md bg-[#173d35] px-4 text-sm font-semibold text-white">
            {labels.createDailyDraft}
          </button>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-lg border border-[#d8cdbc] bg-[#fffaf4] p-4 shadow-sm">
          <h3 className="text-base font-semibold">{labels.draftsTitle}</h3>
          <div className="mt-4 grid gap-2">
            {drafts.length ? drafts.map((draft) => (
              <button
                type="button"
                key={draft.id}
                onClick={() => onSelectDraft(draft.id)}
                className={`min-w-0 rounded-md border p-3 text-left text-sm ${
                  activeDraft?.id === draft.id ? 'border-[#24473f] bg-[#e7f0eb]' : 'border-[#d9d0c3] bg-white hover:bg-[#f6eee3]'
                }`}
              >
                <span className="block truncate font-semibold">{draft.title}</span>
                <span className="mt-2 block text-xs text-[#62645f]">{labels.draftStatus}: {draft.status}</span>
                <span className="mt-1 block text-xs text-[#62645f]">{labels.updatedAt}: {formatDate(draft.updated_at, 'zh-CN')}</span>
              </button>
            )) : (
              <p className="rounded-md bg-white p-3 text-sm leading-6 text-[#5f625b]">{labels.noDraftsBody}</p>
            )}
          </div>
        </aside>

        <article className="min-w-0 rounded-lg border border-[#d7dfd6] bg-white p-5 shadow-sm">
          {activeDraft ? (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#856033]">{labels.draftPreview}</p>
                  <h3 className="mt-1 text-2xl font-semibold">{activeDraft.title}</h3>
                </div>
                <button type="button" onClick={onCopyRevisionContext} className="h-10 rounded-md border border-[#cbd6cf] bg-white px-3 text-sm font-semibold text-[#24473f]">
                  {labels.revisionContext}
                </button>
              </div>

              <pre className="mt-4 max-h-[520px] overflow-auto rounded-md bg-[#f5f7f3] p-4 text-xs leading-5 text-[#27312c]">
                {JSON.stringify(activeDraft.content, null, 2)}
              </pre>

              <section className="mt-5 border-t border-[#e2ddd3] pt-4">
                <h4 className="text-base font-semibold">{labels.draftAnnotations}</h4>
                <div className="mt-3 grid gap-2">
                  {activeDraft.annotations.length ? activeDraft.annotations.map((item) => (
                    <p key={item.id} className="rounded-md bg-[#fffaf4] p-3 text-sm leading-6 text-[#4f5b55]">
                      {item.body}
                    </p>
                  )) : (
                    <p className="rounded-md bg-[#f5f7f3] p-3 text-sm leading-6 text-[#5f625b]">{labels.addAnnotation}</p>
                  )}
                </div>
                <textarea
                  value={annotation}
                  onChange={(event) => onAnnotationChange(event.target.value)}
                  placeholder={labels.annotationPlaceholder}
                  className="mt-4 min-h-28 w-full rounded-md border border-[#c8bcae] bg-white p-3 text-sm leading-6"
                />
                <button type="button" onClick={onSaveAnnotation} className="mt-3 h-10 rounded-md bg-[#173d35] px-4 text-sm font-semibold text-white">
                  {labels.saveAnnotation}
                </button>
              </section>
            </>
          ) : (
            <div className="rounded-md bg-[#f5f7f3] p-4">
              <h3 className="text-xl font-semibold">{labels.noDrafts}</h3>
              <p className="mt-2 text-sm leading-6 text-[#5f625b]">{labels.noDraftsBody}</p>
            </div>
          )}
        </article>
      </div>
    </section>
  );
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

function SettingsView({
  labels,
  settings,
  username,
  onLogout,
  onUpdateSettings,
}: {
  labels: Record<string, string>;
  settings: DisplaySettings;
  username: string;
  onLogout: () => void;
  onUpdateSettings: (settings: DisplaySettings) => void;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-[#dfe5dc] bg-[#fbfcf8] p-5 shadow-sm md:p-6">
      <h2 className="text-2xl font-semibold text-[#27312c]">{labels.settings}</h2>
      <div className="mt-5 divide-y divide-[#e4e7df]">
        <SettingsRow title={labels.account}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-[#68716b]">{labels.currentUser}</span>
            <span className="rounded-md bg-[#eef3ed] px-3 py-2 text-sm font-semibold text-[#31564c]">{username}</span>
            <button type="button" onClick={onLogout} className="h-10 rounded-md border border-[#d1d8cf] bg-white px-4 text-sm font-semibold text-[#3f5f56] hover:bg-[#f3f6f1]">
              {labels.logout}
            </button>
          </div>
        </SettingsRow>
        <SettingsRow title={labels.language}>
          <LanguageSelect value={settings.locale} onChange={(locale) => onUpdateSettings({ ...settings, locale })} />
        </SettingsRow>
        <SettingsRow title={labels.display}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle checked={settings.showReviewRuby} label={labels.reviewRuby} onChange={(checked) => onUpdateSettings({ ...settings, showReviewRuby: checked })} />
            <Toggle checked={settings.showExplanationRuby} label={labels.explanationRuby} onChange={(checked) => onUpdateSettings({ ...settings, showExplanationRuby: checked })} />
          </div>
        </SettingsRow>
      </div>
    </section>
  );
}

function SettingsRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 py-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-start">
      <h3 className="text-sm font-semibold text-[#46514c]">{title}</h3>
      <div className="min-w-0">{children}</div>
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
        <h2 className="text-2xl font-semibold">{labels.mcpTitle}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {[labels.mcpBody, labels.mcpAuth, labels.mcpTools].map((text) => (
            <p key={text} className="rounded-md bg-[#f5f7f3] p-3 text-sm leading-6 text-[#4f5b55]">
              {text}
            </p>
          ))}
        </div>
        <CodexMcpGuide labels={labels} />
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
    </section>
  );
}

function CodexMcpGuide({ labels }: { labels: Record<string, string> }) {
  const flow = [
    { title: labels.mcpFlowApp, body: labels.mcpFlowAppBody },
    { title: labels.mcpFlowBackend, body: labels.mcpFlowBackendBody },
    { title: labels.mcpFlowMcp, body: labels.mcpFlowMcpBody },
    { title: labels.mcpFlowCodex, body: labels.mcpFlowCodexBody },
  ];
  const steps = [labels.mcpStepOne, labels.mcpStepTwo, labels.mcpStepThree, labels.mcpStepFour, labels.mcpStepFive];
  const implementation = [
    labels.mcpImplementationServer,
    labels.mcpImplementationStorage,
    labels.mcpImplementationAuth,
    labels.mcpImplementationDraft,
  ];
  const config = [
    '[mcp_servers.jlpt_review]',
    'command = "node"',
    'args = ["server/mcp-server.mjs"]',
    'cwd = "/Users/itsuki/Documents/ChatGPT/JLPT-local-backend-auth-mcp"',
    'startup_timeout_sec = 20',
    'tool_timeout_sec = 60',
  ].join('\n');

  return (
    <div className="mt-5 border-t border-[#e2ddd3] pt-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="min-w-0">
          <p className="text-sm font-semibold text-[#856033]">{labels.mcpCodexGuideTitle}</p>
          <p className="mt-2 text-sm leading-7 text-[#5f625b]">{labels.mcpCodexGuideBody}</p>
          <h3 className="mt-5 text-base font-semibold">{labels.mcpFlowTitle}</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            {flow.map((item, index) => (
              <div key={item.title} className="relative min-w-0 rounded-md border border-[#d7dfd6] bg-[#f5f7f3] p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#173d35] text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <h4 className="mt-3 text-sm font-semibold">{item.title}</h4>
                <p className="mt-2 text-xs leading-5 text-[#5f625b]">{item.body}</p>
                {index < flow.length - 1 ? (
                  <span className="pointer-events-none absolute -right-3 top-6 hidden h-6 w-6 items-center justify-center rounded-full border border-[#cbd6cf] bg-white text-[#24473f] md:flex">
                    →
                  </span>
                ) : null}
              </div>
            ))}
          </div>
          <h3 className="mt-5 text-base font-semibold">{labels.mcpSetupTitle}</h3>
          <div className="mt-3 grid gap-2">
            {steps.map((step) => (
              <p key={step} className="rounded-md bg-[#fffaf4] p-3 text-sm leading-6 text-[#4f5b55]">
                {step}
              </p>
            ))}
          </div>
          <h3 className="mt-5 text-base font-semibold">{labels.mcpImplementationTitle}</h3>
          <div className="mt-3 grid gap-2">
            {implementation.map((item) => (
              <p key={item} className="rounded-md bg-[#f8faf5] p-3 text-sm leading-6 text-[#4f5b55]">
                {item}
              </p>
            ))}
          </div>
        </section>
        <aside className="min-w-0 rounded-md border border-[#d8cdbc] bg-[#fffaf4] p-4">
          <h3 className="text-base font-semibold">{labels.mcpConfigTitle}</h3>
          <pre className="mt-3 overflow-x-auto rounded-md bg-[#1f2522] p-4 text-xs leading-5 text-[#f5f7f3]">
            {config}
          </pre>
          <h3 className="mt-5 text-base font-semibold">{labels.mcpPromptTitle}</h3>
          <p className="mt-3 rounded-md bg-white p-3 text-sm leading-6 text-[#4f5b55]">{labels.mcpPromptExample}</p>
        </aside>
      </div>
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

function LanguageSelect({ value, onChange }: { value: Locale; onChange: (locale: Locale) => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as Locale)}
      className="h-11 rounded-md border border-[#d1d8cf] bg-white px-3 text-sm font-semibold text-[#46514c]"
      aria-label="Language"
    >
      <option value="zh-CN">简体中文</option>
      <option value="ja">日本語</option>
      <option value="en">English</option>
    </select>
  );
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-[#d7ded5] bg-white px-3 py-2 text-sm font-semibold text-[#4f5651]">
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
    return null;
  }

  const sourceItem = items.find((item) => item.id === question.itemId);
  const needsHumanReview = sourceItem?.content_origin === 'ai_generated' && sourceItem.verification_status !== 'verified';

  return (
    <div className={`mt-5 rounded-lg border p-4 ${answer.correct ? 'border-[#3d735f] bg-[#e8f3ec]' : 'border-[#b65842] bg-[#fae9e2]'}`}>
      <p className="text-sm font-semibold">{answer.correct ? labels.correct : labels.wrong}</p>
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
            {question.choiceAnalysis.map((choice) => (
              <div key={choice.choice} className="grid gap-2 py-3 sm:grid-cols-[minmax(90px,auto)_1fr] sm:items-start sm:gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[#27312c]">{choice.choice}</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${choice.correct ? 'bg-[#d5eadc] text-[#285d47]' : 'bg-white/70 text-[#7b4a3b]'}`}>
                    {choice.correct ? labels.choiceFits : labels.choiceDoesNotFit}
                  </span>
                </div>
                <p className="text-sm leading-6 text-[#4b534e]">
                  <RubyText text={choice.explanation} items={items} enabled={showRuby} />
                </p>
              </div>
            ))}
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
      className="min-w-0"
      onTouchStart={(event) => setTouchStart(event.changedTouches[0]?.clientX ?? null)}
      onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#856033]">{labels.wordDetail}</p>
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
    <article className="min-w-0 rounded-lg border border-[#d8cdbc] bg-white p-4 shadow-sm md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-[#24473f] px-2 py-1 text-xs font-semibold text-white">{deckLabels[item.deck]}</span>
        <span className="rounded bg-[#ead9c7] px-2 py-1 text-xs font-semibold text-[#6f412d]">{item.jlpt_level ?? 'unknown'}</span>
        <span className="rounded bg-[#edf0e9] px-2 py-1 text-xs font-semibold text-[#52645c]">{progress?.status ?? 'new'}</span>
        {item.content_origin === 'ai_generated' ? (
          <span className="rounded bg-[#fff0c7] px-2 py-1 text-xs font-semibold text-[#765016]">{labels.aiGeneratedLabel}</span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#62645f]">
        <span className="rounded bg-[#f8f3eb] px-2 py-1">{labels.reviewCount}: {progress?.reviewCount ?? 0}</span>
        <span className="rounded bg-[#f8f3eb] px-2 py-1">{labels.nextReview}: {formatDate(progress?.nextReviewAt, locale)}</span>
      </div>
      <h3 className="mt-3 text-2xl font-semibold">
        <RubyText text={item.original} items={[item]} enabled={showRuby} />
      </h3>
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
