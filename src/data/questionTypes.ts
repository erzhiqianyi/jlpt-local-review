import type { Locale, QuestionTypeSection } from '../types';

export type { QuestionTypeSection } from '../types';

export type OfficialQuestionType = {
  id: string;
  section: QuestionTypeSection;
  officialName: string;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  defaultTip: Record<Locale, string>;
};

const text = (zh: string, ja: string, en: string): Record<Locale, string> => ({ 'zh-CN': zh, ja, en });

export const officialN1QuestionTypes: OfficialQuestionType[] = [
  {
    id: 'vocabulary-kanji-reading', section: 'vocabulary', officialName: '漢字読み',
    name: text('汉字读音', '漢字読み', 'Kanji reading'),
    description: text('判断用汉字书写的词语在句子中的正确读音。', '文中の漢字語の正しい読み方を判断する問題です。', 'Choose the correct reading of a kanji word in context.'),
    defaultTip: text('先看词在句中的含义和词性，再排除长音、促音、浊音及音读训读不合适的选项。', '文中の意味と品詞を確認し、長音・促音・濁音・音訓が合わない選択肢を除きます。', 'Use context and part of speech first, then eliminate choices with implausible long vowels, gemination, voicing, or on/kun readings.'),
  },
  {
    id: 'vocabulary-context', section: 'vocabulary', officialName: '文脈規定',
    name: text('语境规定', '文脈規定', 'Contextually-defined expressions'),
    description: text('从选项中选择最符合句子语境的词语。', '文脈に最も合う語を選ぶ問題です。', 'Choose the word or expression that best fits the sentence context.'),
    defaultTip: text('同时检查搭配、语体、感情色彩和前后逻辑；意思接近但搭配不自然的选项也要排除。', '意味だけでなく、コロケーション・文体・評価・前後関係を確認します。', 'Check collocation, register, connotation, and sentence logic; reject semantically close choices that do not combine naturally.'),
  },
  {
    id: 'vocabulary-paraphrase', section: 'vocabulary', officialName: '言い換え類義',
    name: text('近义改写', '言い換え類義', 'Paraphrases'),
    description: text('选择与句中划线词语意思最接近的表达。', '下線部と最も近い意味の表現を選ぶ問題です。', 'Choose the expression closest in meaning to the underlined word or phrase.'),
    defaultTip: text('把原词放回完整句子后再替换，比较语气强弱、范围、褒贬和使用对象是否一致。', '文全体で置き換え、強さ・範囲・評価・対象が一致するか比べます。', 'Substitute each choice into the full sentence and compare intensity, scope, connotation, and target.'),
  },
  {
    id: 'vocabulary-usage', section: 'vocabulary', officialName: '用法',
    name: text('用法', '用法', 'Usage'),
    description: text('判断目标词在哪一个句子中的用法正确。', '提示された語の使い方が正しい文を選ぶ問題です。', 'Choose the sentence that uses the target word correctly.'),
    defaultTip: text('逐项检查词性、助词、常见搭配、使用主体和语体，不要只看中文意思是否说得通。', '品詞・助詞・コロケーション・主体・文体を一つずつ確認します。', 'Check part of speech, particles, collocation, subject, and register rather than relying only on translated meaning.'),
  },
  {
    id: 'grammar-form', section: 'grammar', officialName: '文の文法1（文法形式の判断）',
    name: text('句子语法 1：语法形式判断', '文の文法1（文法形式の判断）', 'Sentential grammar 1: Selecting grammar form'),
    description: text('选择最适合放入句中空格的语法形式。', '文中の空所に最も適切な文法形式を選ぶ問題です。', 'Choose the grammar form that best completes the sentence.'),
    defaultTip: text('先锁定接续形式，再看时间关系、说话人立场和句末语气；接续不成立的选项优先排除。', 'まず接続を確認し、次に時間関係・話者の立場・文末の意味を見ます。', 'Check grammatical connection first, then time relations, speaker stance, and sentence-final nuance.'),
  },
  {
    id: 'grammar-composition', section: 'grammar', officialName: '文の文法2（文の組み立て）',
    name: text('句子语法 2：句子排列', '文の文法2（文の組み立て）', 'Sentential grammar 2: Sentence composition'),
    description: text('把给出的片段排列成语法和意义都成立的句子，并回答指定位置。', '語句を並べ、文法的・意味的に正しい文を作る問題です。', 'Arrange fragments into a grammatically and semantically correct sentence.'),
    defaultTip: text('先找固定搭配和必须相邻的语块，再确定谓语及其修饰范围，最后检查整句助词链。', '固定表現と隣接する語句を先に作り、述語と修飾範囲、助詞のつながりを確認します。', 'Build fixed chunks first, identify the predicate and modifier scope, then verify the particle chain.'),
  },
  {
    id: 'grammar-text', section: 'grammar', officialName: '文章の文法',
    name: text('篇章语法', '文章の文法', 'Text grammar'),
    description: text('在一段文章中判断符合上下文衔接和篇章逻辑的语法表达。', '文章全体の流れに合う文法表現を判断する問題です。', 'Choose grammar that maintains cohesion and logic across a text.'),
    defaultTip: text('不要只看空格所在句；标记指示词、接续词、时态和叙述视角，至少读前后各一句。', '空所の文だけでなく、指示語・接続・時制・視点を前後の文から確認します。', 'Read beyond the blank and track demonstratives, connectors, tense, and narrative viewpoint.'),
  },
  {
    id: 'reading-short', section: 'reading', officialName: '内容理解（短文）',
    name: text('内容理解：短篇', '内容理解（短文）', 'Comprehension: Short passages'),
    description: text('阅读较短文章，理解其中的主旨、理由或具体内容。', '短い文章の主旨・理由・具体的内容を理解する問題です。', 'Understand the main point, reason, or specific content of a short passage.'),
    defaultTip: text('先读问题确定目标，再找转折、因果和作者判断；答案必须能被原文直接支持。', '先に設問を読み、逆接・因果・筆者の判断を探し、本文の根拠で選びます。', 'Read the question first, then locate contrast, causality, and author judgment; require direct textual support.'),
  },
  {
    id: 'reading-mid', section: 'reading', officialName: '内容理解（中文）',
    name: text('内容理解：中篇', '内容理解（中文）', 'Comprehension: Mid-size passages'),
    description: text('阅读中等长度文章，理解段落关系、论点和细节。', '中程度の文章で段落関係・論点・詳細を理解する問題です。', 'Understand paragraph relationships, arguments, and details in a mid-size passage.'),
    defaultTip: text('每段用一句话概括功能，区分作者观点、他人观点和例子，回答时回到对应段落定位。', '各段落の役割を一言で整理し、筆者の意見・他者の意見・例を区別します。', 'Summarize each paragraph’s role and separate the author’s view, others’ views, and examples.'),
  },
  {
    id: 'reading-long', section: 'reading', officialName: '内容理解（長文）',
    name: text('内容理解：长篇', '内容理解（長文）', 'Comprehension: Long passages'),
    description: text('阅读长文章，综合理解结构、主张、理由和细节。', '長い文章の構成・主張・理由・詳細を総合的に理解する問題です。', 'Understand structure, claims, reasons, and details across a long passage.'),
    defaultTip: text('先建立段落地图，记录“问题—转折—主张—结论”，细节题再定点回读，避免反复全文扫描。', '「問題・転換・主張・結論」の段落地図を作り、詳細問題は該当箇所だけ読み直します。', 'Map problem, shift, claim, and conclusion; return only to the relevant section for detail questions.'),
  },
  {
    id: 'reading-integrated', section: 'reading', officialName: '統合理解',
    name: text('综合理解', '統合理解', 'Integrated comprehension'),
    description: text('比较两篇或多篇材料，理解共同点、差异和各自立场。', '複数の文章を比較し、共通点・相違点・立場を理解する問題です。', 'Compare multiple texts to identify shared points, differences, and positions.'),
    defaultTip: text('用同一组比较轴整理每篇材料，例如结论、理由、对象和条件，避免凭整体印象选择。', '結論・理由・対象・条件など同じ比較軸で各文章を整理します。', 'Use the same comparison axes for every text, such as conclusion, reason, target, and conditions.'),
  },
  {
    id: 'reading-thematic', section: 'reading', officialName: '主張理解（長文）',
    name: text('主张理解：长篇', '主張理解（長文）', 'Thematic comprehension: Long passages'),
    description: text('从长篇论述中把握作者整体主张、态度和论证方向。', '長い論述から筆者全体の主張・態度・論の方向を捉える問題です。', 'Identify the author’s overall claim, stance, and argumentative direction in a long text.'),
    defaultTip: text('重点关注开头提出的问题、反复出现的评价词、转折后的观点以及结尾总结。', '問題提起、繰り返される評価語、逆接後の意見、結論に注目します。', 'Focus on the opening issue, repeated evaluative language, claims after contrasts, and the conclusion.'),
  },
  {
    id: 'reading-information', section: 'reading', officialName: '情報検索',
    name: text('信息检索', '情報検索', 'Information retrieval'),
    description: text('从公告、广告、指南等实用材料中找出满足条件的信息。', '案内・広告・ガイドなどから条件に合う情報を探す問題です。', 'Retrieve information that satisfies stated conditions from notices, ads, guides, or similar material.'),
    defaultTip: text('先把人物条件、时间、费用和限制写成清单，再扫描标题和表格；所有条件都满足才选。', '人物条件・時間・料金・制限を一覧にし、見出しや表を走査して全条件を照合します。', 'List person, time, cost, and restriction conditions, then scan headings and tables and verify every condition.'),
  },
  {
    id: 'listening-task', section: 'listening', officialName: '課題理解',
    name: text('任务理解', '課題理解', 'Task-based comprehension'),
    description: text('听取完成某项任务所需的信息，判断接下来应该做什么。', '課題を達成するために必要な情報を聞き、次の行動を判断する問題です。', 'Listen for information needed to complete a task and decide the next action.'),
    defaultTip: text('播放前先看选项，预测任务和差异；听时记录目标、条件、顺序以及最后被否定或修改的方案。', '選択肢から課題と差を予測し、目的・条件・順序・最後に変更された案をメモします。', 'Preview choices, predict the task, and note goals, conditions, sequence, and any plan changed or rejected at the end.'),
  },
  {
    id: 'listening-points', section: 'listening', officialName: 'ポイント理解',
    name: text('要点理解', 'ポイント理解', 'Comprehension of key points'),
    description: text('带着预先给出的重点问题，听取所需的具体信息。', 'あらかじめ示されたポイントに必要な具体情報を聞き取る問題です。', 'Listen for specific information required by a stated question.'),
    defaultTip: text('先确认问题问的是谁、何时、为何或哪一个；只记录与该焦点有关的信息，警惕说话人后续修正。', '設問が人・時・理由・選択のどれを問うか確認し、焦点に関係する情報と訂正を聞きます。', 'Identify whether the question asks who, when, why, or which; listen only for that focus and later corrections.'),
  },
  {
    id: 'listening-outline', section: 'listening', officialName: '概要理解',
    name: text('概要理解', '概要理解', 'Comprehension of general outline'),
    description: text('理解一段完整发言的主题、说话人意图、态度或整体结论。', 'まとまった話の主題・意図・態度・全体的な結論を理解する問題です。', 'Understand the topic, intent, attitude, or overall conclusion of an extended utterance.'),
    defaultTip: text('不要追逐所有细节；抓住开头主题、语气变化、重复评价和结尾结论，区分事实与说话人态度。', '細部を追いすぎず、冒頭の主題・調子の変化・評価の反復・結論を捉えます。', 'Do not chase every detail; track the opening topic, tone shifts, repeated evaluations, and final conclusion.'),
  },
  {
    id: 'listening-quick', section: 'listening', officialName: '即時応答',
    name: text('即时应答', '即時応答', 'Quick response'),
    description: text('听一个简短话语，立即选择最自然的回应。', '短い発話を聞き、最も自然な応答を選ぶ問題です。', 'Hear a short utterance and choose the most natural immediate response.'),
    defaultTip: text('先判断功能：请求、拒绝、道歉、确认、推测或反问；再检查敬语关系和固定回应，避免只匹配关键词。', '依頼・断り・謝罪・確認・推量など発話機能を判断し、敬語関係と定型応答を確認します。', 'Identify the speech function first, then check politeness relationships and conventional responses instead of matching keywords.'),
  },
  {
    id: 'listening-integrated', section: 'listening', officialName: '統合理解',
    name: text('综合理解', '統合理解', 'Integrated comprehension'),
    description: text('综合较长对话或多位说话人的信息、意见和条件作出判断。', '長めの会話や複数話者の情報・意見・条件を統合して判断する問題です。', 'Integrate information, opinions, and conditions from a longer conversation or multiple speakers.'),
    defaultTip: text('给每位说话人分栏记录立场、条件和最终选择；遇到方案变化时划掉旧信息，最后按问题重新整合。', '話者ごとに立場・条件・最終選択を分け、変更前の情報を消して設問に合わせて統合します。', 'Track each speaker’s stance, conditions, and final choice separately; discard superseded plans and integrate only what the question asks.'),
  },
];
