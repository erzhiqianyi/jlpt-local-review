import type { Locale } from '../types';

export type OfficialSampleModule = 'grammar' | 'reading' | 'listening';
type Localized = Record<Locale, string>;

export type OfficialModuleSample = {
  id: string;
  module: OfficialSampleModule;
  questionTypeId: string;
  officialName: string;
  sourceKind?: 'original' | 'local_official';
  sourceLabel?: Localized;
  title: Localized;
  summary: Localized;
  estimatedMinutes: number;
  instruction: string;
  stimulus?: Array<{ label?: string; text: string }>;
  question: string;
  choices: string[];
  answerIndex: number;
  explanation: Localized;
  ttsText?: string;
  audioUrl?: string;
  questionPdfUrl?: string;
  answerPdfUrl?: string;
  transcriptPdfUrl?: string;
  subQuestions?: Array<{
    id: string;
    label: string;
    choices: string[];
    answerIndex: number;
  }>;
};

export type OfficialModuleMeta = {
  title: Localized;
  body: Localized;
  officialTypeCount: number;
  officialTiming: Localized;
};

const text = (zh: string, ja: string, en: string): Localized => ({ 'zh-CN': zh, ja, en });

export const officialModuleMeta: Record<OfficialSampleModule, OfficialModuleMeta> = {
  grammar: {
    title: text('N1 语法题型样例', 'N1 文法問題形式サンプル', 'N1 Grammar Format Samples'),
    body: text('官方结构包含语法形式判断、句子排列和篇章语法；当前先用前两类原创题验证练习页面结构。', '公式構成は文法形式判断・文の組み立て・文章の文法の3種類です。現在は最初の2種類のオリジナル問題で画面構成を確認できます。', 'The official structure has grammar-form, sentence-composition, and text-grammar items; the current original samples validate the first two formats.'),
    officialTypeCount: 3,
    officialTiming: text('与词汇、阅读合计 110 分钟', '語彙・読解と合わせて110分', '110 minutes combined with vocabulary and reading'),
  },
  reading: {
    title: text('N1 阅读题型样例', 'N1 読解問題形式サンプル', 'N1 Reading Format Samples'),
    body: text('先用短篇和信息检索验证阅读、条件标记与答题解析的页面结构，后续再扩展到长篇和综合理解。', '短文と情報検索から、本文・条件整理・解説の画面構成を確認します。', 'Start with short-passage and information-retrieval samples to validate passage, condition, and explanation layouts.'),
    officialTypeCount: 6,
    officialTiming: text('与词汇、语法合计 110 分钟', '語彙・文法と合わせて110分', '110 minutes combined with vocabulary and grammar'),
  },
  listening: {
    title: text('N1 听力题型样例', 'N1 聴解問題形式サンプル', 'N1 Listening Format Samples'),
    body: text('使用原创台词和浏览器日语语音合成验证播放、作答和听力稿复盘流程，不包含官方音频。', 'オリジナル原稿とブラウザ音声合成で、再生・解答・スクリプト確認の流れを検証します。', 'Original scripts and browser speech synthesis validate playback, answering, and transcript-review flow without official audio.'),
    officialTypeCount: 5,
    officialTiming: text('听力考试 55 分钟', '聴解は55分', '55-minute listening section'),
  },
};

export const officialModuleSamples: OfficialModuleSample[] = [
  {
    id: 'grammar-form-01',
    module: 'grammar',
    questionTypeId: 'grammar-form',
    officialName: '文の文法1（文法形式の判断）',
    title: text('根据上下文选择语法形式', '文脈に合う文法形式を選ぶ', 'Select a grammar form in context'),
    summary: text('检查接续、逻辑关系和书面语语感。', '接続・論理関係・文体を判断します。', 'Checks connection, logical relation, and written register.'),
    estimatedMinutes: 2,
    instruction: '次の文の（　　）に入れるのに最もよいものを、1・2・3・4から一つ選びなさい。',
    question: 'この研究は従来の方法を否定するものではなく、その限界を明らかにした（　　）、新たな視点を提案するものである。',
    choices: ['うえで', 'そばから', 'きり', 'ところを'],
    answerIndex: 0,
    explanation: text('「明らかにしたうえで」は“先明确其局限，再提出新视角”。前后动作有明确顺序和论证关系。', '「明らかにしたうえで」は、限界を確認した後に新しい視点を提案する順序を表します。', '“明らかにしたうえで” expresses establishing the limits first and then proposing a new perspective.'),
  },
  {
    id: 'grammar-composition-01',
    module: 'grammar',
    questionTypeId: 'grammar-composition',
    officialName: '文の文法2（文の組み立て）',
    title: text('句子排列中的星号位置', '文の組み立てと★の位置', 'Sentence composition and the starred slot'),
    summary: text('先组成固定语块，再判断星号位置的片段。', '語句のまとまりを作ってから★の位置を判断します。', 'Build syntactic chunks before selecting the starred fragment.'),
    estimatedMinutes: 3,
    instruction: '次の文の＿＿＿ ＿＿＿ ★ ＿＿＿に入る最もよいものを、1・2・3・4から一つ選びなさい。',
    question: '地域の課題を解決するには、＿＿＿ ＿＿＿ ★ ＿＿＿必要がある。',
    choices: ['住民だけでなく', '行政や企業とも', '継続的に', '協力していく'],
    answerIndex: 2,
    explanation: text('完整顺序是「住民だけでなく／行政や企業とも／継続的に／協力していく」。星号处是「継続的に」。', '正しい順序は「住民だけでなく／行政や企業とも／継続的に／協力していく」で、★は「継続的に」です。', 'The full order is “住民だけでなく / 行政や企業とも / 継続的に / 協力していく,” so the starred fragment is “継続的に.”'),
  },
  {
    id: 'reading-short-01',
    module: 'reading',
    questionTypeId: 'reading-short',
    officialName: '内容理解（短文）',
    title: text('从短篇说明中判断作者主张', '短い説明文から筆者の主張を捉える', 'Identify the claim in a short passage'),
    summary: text('约 200 字场景，定位转折后的中心观点。', '約200字の文章で、逆接後の中心意見を読み取ります。', 'A roughly 200-character passage focused on the claim after a contrast.'),
    estimatedMinutes: 4,
    instruction: '次の文章を読んで、後の問いに対する答えとして最もよいものを選びなさい。',
    stimulus: [{ text: '職場で情報を共有するとき、内容を詳しく書けばよいとは限らない。説明が長すぎると、受け手は何が重要なのか判断できず、確認に時間がかかるからだ。大切なのは、結論と対応期限を最初に示し、その後に判断の根拠を必要な範囲で添えることである。情報量を増やすことより、相手が次に何をすべきかを明確にすることが、実務では優先される。' }],
    question: '筆者が最も言いたいことは何か。',
    choices: ['情報共有では、できるだけ多くの根拠を書くべきだ。', '情報共有では、受け手の次の行動が分かる構成を優先すべきだ。', '説明が長いほど、職場での確認時間を短縮できる。', '結論より先に、判断に至った経緯を詳しく説明すべきだ。'],
    answerIndex: 1,
    explanation: text('末句明确对比“增加信息量”和“让对方清楚下一步行动”，作者优先后者。', '最終文で「情報量を増やすこと」より「次に何をすべきかを明確にすること」を優先しています。', 'The final sentence explicitly prioritizes making the recipient’s next action clear over increasing information volume.'),
  },
  {
    id: 'reading-information-01',
    module: 'reading',
    questionTypeId: 'reading-information',
    officialName: '情報検索',
    title: text('根据多个条件检索通知信息', '複数条件から案内情報を探す', 'Retrieve information using multiple conditions'),
    summary: text('把时间、对象和费用条件逐项匹配。', '時間・対象・費用の条件を照合します。', 'Matches time, eligibility, and fee conditions.'),
    estimatedMinutes: 5,
    instruction: '次の案内を読んで、問いに対する答えとして最もよいものを選びなさい。',
    stimulus: [
      { label: '市民講座の案内', text: 'A データ整理入門：土曜10時、初心者対象、参加費500円、パソコン持参。\nB 発表資料の作り方：土曜14時、経験不問、参加費無料、機器貸出あり。\nC 統計実践：日曜10時、基礎経験者対象、参加費800円、パソコン持参。\nD 写真編集：日曜14時、初心者対象、参加費無料、機器貸出あり。' },
    ],
    question: '佐藤さんは土曜日の午後に参加でき、経験はなく、機器を借りたい。どの講座を選べばよいか。',
    choices: ['A', 'B', 'C', 'D'],
    answerIndex: 1,
    explanation: text('“周六下午”“经验不限”“可借设备”三个条件只有 B 同时满足。', '「土曜午後」「経験不問」「機器貸出あり」の三条件をすべて満たすのはBです。', 'Only B satisfies all three conditions: Saturday afternoon, no experience required, and equipment available.'),
  },
  {
    id: 'listening-quick-01',
    module: 'listening',
    questionTypeId: 'listening-quick',
    officialName: '即時応答',
    title: text('听短句选择自然回应', '短い発話への自然な応答', 'Choose a natural quick response'),
    summary: text('先判断抱怨和遗憾的语用功能。', '不満と残念な気持ちに合う応答を選びます。', 'Recognizes a complaint and selects an appropriate response.'),
    estimatedMinutes: 1,
    instruction: '話を聞いて、最もよい応答を一つ選びなさい。',
    ttsText: '昨日の資料、もう少し早く送ってくれればよかったのに。',
    question: '最も自然な応答はどれか。',
    choices: ['すみません。次から気をつけます。', 'ええ、早く届いてよかったです。', 'では、資料は必要ありません。', '昨日は資料を読まないでしょう。'],
    answerIndex: 0,
    explanation: text('说话人用「〜てくれればよかったのに」表达不满和遗憾，最自然的是道歉并承诺改善。', '「〜てくれればよかったのに」は不満・残念さを表すため、謝罪して改善を約束する応答が自然です。', 'The utterance expresses complaint and regret, so apologizing and promising improvement is the natural response.'),
  },
  {
    id: 'listening-task-01',
    module: 'listening',
    questionTypeId: 'listening-task',
    officialName: '課題理解',
    title: text('整合条件判断接下来的行动', '条件を整理して次の行動を判断する', 'Determine the next action from conditions'),
    summary: text('听取截止时间、缺失内容和修改顺序。', '締切・不足情報・修正順序を聞き取ります。', 'Tracks deadline, missing information, and action order.'),
    estimatedMinutes: 3,
    instruction: '話を聞いて、女の人がこの後まず何をするか選びなさい。',
    ttsText: '男の人：報告書、グラフは分かりやすくなりました。ただ、先月との比較がまだ入っていません。会議は三時からなので、二時半までに追加して、印刷は私に送ってからにしてください。女の人：分かりました。比較を加えて、確認をお願いしてから印刷します。',
    question: '女の人は、この後まず何をするか。',
    choices: ['報告書を印刷する。', '会議の時間を変更する。', '先月との比較を追加する。', 'グラフを最初から作り直す。'],
    answerIndex: 2,
    explanation: text('男方要求先补上“与上月比较”，发送确认后再打印；女方也复述了这个顺序。', 'まず先月との比較を追加し、確認を依頼してから印刷する順序です。', 'She must first add the comparison with last month, send it for confirmation, and only then print.'),
  },
];

export function samplesForModule(module: OfficialSampleModule) {
  return officialModuleSamples.filter((sample) => sample.module === module);
}

export function sampleById(module: OfficialSampleModule, id: string) {
  return officialModuleSamples.find((sample) => sample.module === module && sample.id === id);
}
