export const todayTasks = [
  { id: 1, time: "09:50", duration: 12, title: "弱类型汉字・读音专项", module: "词汇", reason: "近 7 天在「汉字读音 N1」中错误 6 次，主要集中于「矩・纏・腫」。", source: "学习记录（8/24–8/30）", tone: "green" },
  { id: 2, time: "10:02", duration: 13, title: "N1 语法对比复习", module: "语法", reason: "「～ざるを得ない」与「～しかない」上次练习错误 3/10，需巩固用法差异。", source: "专项练习（8/29）", tone: "indigo" },
  { id: 3, time: "10:15", duration: 13, title: "听力影子跟读", module: "听力", reason: "8/28 听力短对话正确率 72%，建议跟读提升语速与信息捕捉。", source: "听力练习（8/28）", tone: "amber" },
];

export const vocabRows = [
  ["年々", "ねんねん", "年复一年；逐年", "N1 汉字读音", "明天"],
  ["纏う", "まとう", "缠绕；披在身上", "新完全マスター N1 語彙", "今天"],
  ["甚だしい", "はなはだしい", "非常严重", "N1 高频形容词", "今天"],
  ["滞る", "とどこおる", "停滞；拖延", "新完全マスター N1 語彙", "9月2日"],
  ["強ち", "あながち", "未必；不一定", "Agent 同步词汇", "9月3日"],
];

export const grammarRows = [
  ["が早いか", "Vる＋が早いか", "刚一……就……", "书面・叙述", "待复习"],
  ["や否や", "Vる＋や否や", "一……立刻……", "正式・书面", "学习中"],
  ["そばから", "Vる／Vた＋そばから", "刚……又……", "反复・困扰", "已掌握"],
  ["～ざるを得ない", "Vない形＋ざるを得ない", "不得不……", "正式", "待复习"],
  ["～にひきかえ", "N／普通形＋にひきかえ", "与……相反", "对照", "学习中"],
];

export const captureRows = [
  { source: "Codex 对话", type: "语法", content: "が早いか / や否や 的使用限制", time: "今天 09:14", state: "待整理" },
  { source: "练习错题", type: "词汇", content: "年々 的汉字读音", time: "今天 08:32", state: "待整理" },
  { source: "听力标记", type: "听力", content: "主讲人态度判断失败", time: "昨天 21:07", state: "已提出结构" },
  { source: "手动记录", type: "阅读", content: "撮影・写真 相关词汇整理", time: "8月29日 17:48", state: "已入库" },
];

export const historyRows = [
  ["今天 08:32", "汉字读音 N1", "6 / 10", "8分12秒", "词汇"],
  ["8月30日 21:18", "即时应答", "8 / 10", "12分04秒", "听力"],
  ["8月29日 19:40", "时间关系", "7 / 10", "10分28秒", "语法"],
  ["8月28日 20:05", "短篇理解", "4 / 5", "14分51秒", "阅读"],
  ["8月27日 22:10", "综合复习包", "17 / 22", "31分09秒", "综合"],
];

export const memoryRows = [
  { title: "「が早いか」「や否や」的使用限制", kind: "语法规则", source: "Codex 对话", date: "今天 09:28", status: "等待确认", evidence: "对话 1 条・错题 3 题", use: "加入时间关系复习包" },
  { title: "汉字读音的高频错字", kind: "薄弱点", source: "练习记录", date: "今天 08:40", status: "已确认", evidence: "近 7 天错题 6 题", use: "未来 3 次复习优先" },
  { title: "听力态度题先抓语气转折", kind: "解题策略", source: "听力标记", date: "昨天 21:18", status: "已确认", evidence: "练习 2 次・笔记 1 条", use: "听力提示卡" },
  { title: "工作日最多学习 45 分钟", kind: "计划约束", source: "计划设置", date: "8月30日", status: "已确认", evidence: "用户设置", use: "计划时长校验" },
];

export const mockExams = [
  { level: "N1", title: "原创模拟试卷 第1回", questions: 65, minutes: 170, progress: 38 },
  { level: "N1", title: "原创模拟试卷 第2回", questions: 64, minutes: 170, progress: 0 },
  { level: "N2", title: "原创模拟试卷 第1回", questions: 61, minutes: 155, progress: 100 },
  { level: "N2", title: "原创模拟试卷 第2回", questions: 60, minutes: 155, progress: 0 },
  { level: "N3", title: "原创模拟试卷 第1回", questions: 58, minutes: 140, progress: 0 },
];

export const week = [
  { day: "一", date: 24, state: "done" }, { day: "二", date: 25, state: "done" },
  { day: "三", date: 26, state: "done" }, { day: "四", date: 27, state: "done" },
  { day: "五", date: 28, state: "done" }, { day: "六", date: 29, state: "today" },
  { day: "日", date: 30, state: "open" },
];
