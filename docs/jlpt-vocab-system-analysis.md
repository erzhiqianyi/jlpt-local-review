# JLPT 单词学习系统分析

分析对象：`/Users/itsuki/Downloads/N1 学习聊天记录.md`

## 内容判断

这份资料目前是解释型词条，不是可直接练习的题库。每个条目基本由“用户输入一个词或名字”开始，然后给出读音、核心记忆点、中文解释、例句、近义词区别、常见搭配和考场快速判断。

现有 17 个条目：

- 核心词汇：測定、認定、年々、経過、概観、養成、踏んで、豊富、遥、辛抱、目次
- 人名/姓氏读法：服部、智里、佐野、智子、新谷、新谷遥

实现时应该把“JLPT 核心词汇”和“人名读法”分成不同 deck。人名读法对听力、阅读中的固有名词识别有帮助，但不能和 N1 高频词用同一个记忆优先级。

## 数据生产方式

输入不放在网页里。输入发生在 Codex 聊天中：

1. 用户把不懂的单词、句子、题目发给 Codex。
2. `jlpt-chat-review` 技能把聊天内容抽取成结构化 JSONL。
3. 每天根据前一天新增 JSONL 生成复习包。
4. 本地网页读取导出的 JSON，浏览器本地保存学习进度。

这样做的好处是网页可以保持静态，后续部署到 Cloudflare Pages/Workers 时不需要用户系统和数据库。

## 建议数据模型

内容数据和学习进度要分开。

内容数据来自 Codex 技能，可随发布更新：

```ts
type VocabItem = {
  id: string;
  sourceDate: string;
  deck: "n1_vocab" | "name_reading" | "grammar_expression";
  type: "word" | "proper_name" | "expression" | "verb_form";
  surface: string;
  reading?: string;
  partOfSpeech?: string;
  jlptLevel?: "N1" | "N2" | "unknown";
  meaningZh: string;
  coreMemory: string;
  examples: { ja: string; zh: string }[];
  collocations: string[];
  comparisons: { target: string; differenceZh: string }[];
  rubyTerms: { text: string; reading: string }[];
  examHint?: string;
  tags: string[];
};
```

学习进度只存在浏览器本地：

```ts
type ReviewState = {
  itemId: string;
  status: "new" | "learning" | "review" | "mastered";
  dueAt: string;
  intervalDays: number;
  ease: number;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt?: string;
  mistakeNotes: string[];
};
```

## 词条拆分规则

不要把聊天解释整段原文保存到网页主数据。应该拆成这些字段：

- `surface`: 原词，例如 `測定`
- `reading`: 读音，例如 `そくてい`
- `meaningZh`: 一句话中文核心义
- `coreMemory`: 记忆钩子，例如“按标准、用仪器测出客观数据”
- `examples`: 2 到 3 个例句
- `collocations`: 高频搭配，例如 `測定結果`、`血圧を測定する`
- `comparisons`: 易混词区别，例如 `測定・計測・測量`
- `examHint`: 考场快速判断
- `deck`: 学习分组
- `tags`: `漢語`、`正式語`、`人名`、`比較` 等
- `rubyTerms`: 所有含汉字日语片段的假名读音，用于页面开关式显示 ruby

## 练习系统

练习题不要只做“看中文选日语”。当前第一阶段适合生成 4 类题：

1. JLPT 文字・語彙：模拟语言知识中的词汇选择题，例如给句子空格，在 4 个选项中选择最自然的词。
2. 言い換え類義：在句子上下文中判断目标词最接近的意思。
3. 表記：在句子上下文中看到假名，选择正确汉字表记。
4. 漢字読み：在句子上下文中看到汉字，选择正确假名读音。

“考场快速判断”不作为独立题型。它应该进入解析字段，用来解释为什么答案正确、为什么干扰项不合适。
搭配和易混辨析也优先进入词条说明和答题解析，不在第一阶段作为独立题型。
题目、选项、用户答案和正确答案不显示假名标注，避免在作答时泄露读音提示；假名标注只用于复习卡片和解析。

每个题型都必须有：

- 作答后的 `正确/错误` 判定。
- 用户选择和正确答案。
- 中文完整解析。
- 与词条主信息、搭配或易混区别相连的依据。

人名 deck 单独练：

- 看到 `服部` 选 `はっとり`
- 看到 `新谷` 时提示“可能有特殊读法”，避免强行唯一化
- 姓/名组合拆分，例如 `新谷遥` -> `新谷 / 遥`

## 复习调度

第一版可以不用复杂算法，浏览器本地实现轻量间隔复习：

- 新词当天进入 `new`
- 答对：间隔变成 1、3、7、14、30 天
- 答错：回到 1 天，并记录错因
- 连续答对 4 次进入 `mastered`
- 今日复习 = `dueAt <= today` 的项目 + 昨日新增项目

后续如果题量上来，再考虑 FSRS/SM-2。第一版重点是让你每天能看见“昨天聊过什么，今天该复习什么”。

## 页面结构

本地网页建议做成 4 个主视图：

- 今日复习：按 due item 出题，支持显示答案、答对/答错。
- 单词库：按 deck、标签、日期、掌握状态筛选。
- 易混对比：集中复习 `測定・計測・測量`、`認定・認証・承認` 这类内容。
- 数据管理：导入 Codex 生成的 JSON、导出浏览器学习进度、清空本地进度。
- 显示设置：分别控制复习卡片和题目解析是否显示假名标注。

## 本地存储方案

第一版使用浏览器本地数据即可：

- 内容数据：`public/data/review-data.json` 作为默认种子数据。
- 用户进度：`localStorage` 或 `IndexedDB`。
- 手动导入：用户可以导入新的 JSON 数据文件。
- 手动导出：定期导出学习进度 JSON，避免换浏览器后丢失。

数据量小于几千条时 `localStorage` 足够。若后续加入大量题目、音频、图片或错题历史，再切到 `IndexedDB`。

## 当前资料的实现优先级

第一阶段先做单词系统：

1. 把 17 个条目抽取成结构化 `vocab-items.json`。
2. 把 `人名/姓氏读法` 分 deck。
3. 做今日复习、单词库、答对/答错、本地进度。
4. 为每个词自动生成文字・語彙、言い換え類義、表記、漢字読み练习题。

第二阶段再做题目系统：

1. 支持完整 JLPT 选择题导入。
2. 保存选项、答案、错误选项解释。
3. 根据错题生成二次练习。

第三阶段再考虑 Cloudflare：

1. 静态部署到 Cloudflare Pages。
2. 数据仍由浏览器本地保存。
3. 只把内容种子 JSON 跟随网站版本发布。
4. 不引入用户系统，除非需要跨设备同步。

## 结论

这个学习系统的核心不是“聊天 UI”，而是“Codex 技能作为整理器，本地网页作为复习器”。当前资料已经足够支撑第一版单词复习系统，但需要先结构化，不要直接把 Markdown 原文当数据库。
