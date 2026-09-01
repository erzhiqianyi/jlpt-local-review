import { getDb, getStudyPlan } from '../server/storage.mjs';

const username = process.argv[2] ?? '1234';

const grammar = [
  '第1部 文の文法1：1課 時間関係',
  '第1部 文の文法1：2課 範囲の始まり・限度',
  '第1部 文の文法1：3課 限定・非限定・付加',
  '第1部 文の文法1：4課 例示',
  '第1部 文の文法1：5課 関連・無関係',
  '第1部 文の文法1：6課 様子',
  '第1部 文の文法1：7課 付随行動',
  '第1部 文の文法1：8課 逆接',
  '第1部 文の文法1：9課 条件',
  '第1部 文の文法1：10課 逆接条件',
  '第1部 文の文法1：11課 目的・手段',
  '第1部 文の文法1：12課 原因・理由',
  '第1部 文の文法1：13課 可能・不可能・禁止',
  '第1部 文の文法1：14課 話題・評価の基準',
  '第1部 文の文法1：15課 比較対照',
  '第1部 文の文法1：16課 結末・最終の状態',
  '第1部 文の文法1：17課 強調',
  '第1部 文の文法1：18課 主張・断定',
  '第1部 文の文法1：19課 評価・感想',
  '第1部 文の文法1：20課 心情・強制的思い',
  '第1部 問題（1課-20課）：文法形式の選択と並べ替え',
  '第1部 文法形式の整理：動詞の意味に着目1-2',
  '第1部 文法形式の整理：古い言葉、もの・こと・ところ、二語セット、助詞・複合助詞',
  '第2部 文の文法2：文の組み立て1 決まった形',
  '第2部 文の文法2：文の組み立て2 名詞を説明する形式',
  '第2部 文の文法2：文の組み立て3 接続に注意',
  '第3部 文章の文法：1課 時制',
  '第3部 文章の文法：2課 条件を表す文',
  '第3部 文章の文法：3-6課 視点を動かさない手段',
  '第3部 文章の文法：7課 指示表現「こ・そ・あ」',
  '第3部 文章の文法：8課 「は・が」の使い分け',
  '第3部 文章の文法：9課 接続表現',
  '第3部 文章の文法：10課 省略・繰り返し・言い換え',
  '第3部 文章の文法：11課 文体の一貫性',
  '第3部 文章の文法：12課 話の流れを考える',
  '文法 模擬試験 第1回・第2回',
];

const reading = [
  '第1部 評論・解説・エッセイ：文章全体の意味を捉える練習',
  '第1部 意味理解：対比、言い換え、比喩、疑問提示文',
  '第1部 細部理解：指示語、だれが/何を、下線部の意味',
  '第1部 細部理解：理由を問う、例を問う',
  '第2部 広告・お知らせ・説明書き：全体をつかむ',
  '第2部 情報を探し出す：広告・お知らせ',
  '第2部 情報を探し出す：説明書き・表・リスト',
  '第3部 実戦問題：内容理解（中文）',
  '第3部 実戦問題：内容理解（長文）',
  '第3部 実戦問題：主張理解（長文）',
  '第3部 実戦問題：総合理解',
  '第3部 実戦問題：情報検索',
  '読解 模擬試験',
];

const listening = [
  '音声の特徴：似ている音の聞き分け',
  '音声の特徴：音の変化や縮約形',
  '即時応答：最初の文を理解する 1-A だれがするか',
  '即時応答：1-B 話し手はどう思っているか',
  '即時応答：1-C 起こったか/起こっていないか',
  '即時応答：1-D イントネーションに注意',
  '即時応答：1-E 会話表現に注意',
  '即時応答：返事の文を考える・確認問題',
  '課題理解：するべきことを理解する',
  '課題理解：優先される課題を判断する',
  '課題理解：条件を整理しながら聞く・確認問題',
  'ポイント理解：話し手の意図を判断する',
  'ポイント理解：言い換え、必要情報、多情報から拾う',
  '概要理解：例と言葉をまとめる',
  '概要理解：キーワード、構造、主題、意見を聞き取る',
  '統合理解：2人以上の話を整理する',
  '統合理解：2種類の話を整理する',
  '聴解 模擬試験',
];

const materialNotes = {
  'shin-kanzen-grammar':
    '从第 1 部 文の文法1 开始：ことがらを説明する、時間関係、範囲の始まり・限度、例示、関連・無関係、様子、付随行動、逆接、条件、目的・手段、原因・理由、可能・不可能・禁止、話題・評価、比較対照、結果・最終状態、強調、主張・断定、評価・感想、心情・強制的思い；之后整理文法形式、第 2 部 文の文法2、第 3 部 文章の文法。',
  'shin-kanzen-reading':
    '从第 1 部 評論・解説・エッセイなど 开始：文章全体の意味、対比、言い換え、比喩、疑問提示文、指示語、だれが/何を、下線部の意味、理由、例；之后广告/通知/说明书/表・リスト，最后实战问题。',
  'shin-kanzen-listening':
    '从音声の特徴开始：似ている音、音の変化や縮約形；之后即時応答、課題理解、ポイント理解、概要理解、統合理解，并在各技能后做確認問題和模擬試験。',
};

const db = getDb();
const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username);
if (!user) {
  throw new Error(`User not found: ${username}`);
}

let current;
try {
  current = getStudyPlan(user.id);
} catch {
  const row = db.prepare('SELECT plan_json FROM study_plans WHERE user_id = ?').get(user.id);
  current = row?.plan_json ? JSON.parse(row.plan_json) : null;
}
if (!current?.profile) {
  throw new Error(`Study plan profile not found for ${username}`);
}
const completedBuckets = new Map();
for (const task of current.tasks) {
  if (task.status !== 'completed') continue;
  const key = `${task.date}:${task.module}`;
  const bucket = completedBuckets.get(key) ?? [];
  bucket.push(task);
  completedBuckets.set(key, bucket);
}

const profile = {
  ...current.profile,
  materials: current.profile.materials.map((material) => ({
    ...material,
    currentPosition: materialNotes[material.id] ?? material.currentPosition ?? '',
  })),
  goal:
    '以 2026-12-06 JLPT N1 为目标，用《新完全マスター》N1 语法、阅读、听力目录作为主线推进。每天任务必须能对照教材课次或题型完成，并把错题、易混语法、阅读依据和听力错段回听记录进应用。',
  supplementalNeeds:
    '三本教材之外固定补充：官方样题/题型说明、应用内词汇和汉字复习、错题本、听力错段回听清单；10 月底以后加入分模块限时，11 月下旬以后加入整套模拟和错题二轮。',
  phaseStrategy:
    '2026-08-30 到 2026-09-27 完成入门和前半目录，建立语法接续表、阅读依据定位、听力题型笔记；2026-09-28 到 2026-10-25 继续按目录推进并开始小题组限时；2026-10-26 到 2026-11-22 完成剩余目录、模考前分模块限时；2026-11-23 到 2026-12-06 考前收束，只做模考、错题、听力回听和易混项。',
};

const tasks = [];
let grammarIndex = 0;
let readingIndex = 0;
let listeningIndex = 0;
let week = 1;

for (let date = parseDate(profile.startDate); date <= parseDate(profile.examDate); date = addDays(date, 1)) {
  const key = dateKey(date);
  const weekday = date.getDay();
  if (key === profile.startDate) {
    addTask(key, 'other', 20, '开书准备：确认三本教材目录和起点', '今天有固定课程，只做轻量准备。把语法、阅读、听力目录拍照/标记，确认从第 1 课或第 1 单元开始。');
    addTask(key, 'listening', 20, `新完全掌握 N1 听力：${listening[listeningIndex++]}`, '只听第一遍和跟读关键句，记录听不出的音变或缩约形。');
    addTask(key, 'vocabulary', 15, '应用内词汇复习：文字・語彙易混项', '完成到期复习；把当天不确定的读音、字形和近义词放入错题记录。');
    continue;
  }
  if (weekday === 1) continue;

  if (key >= '2026-11-23' || key === profile.examDate) {
    addFinalTasks(key, weekday);
    continue;
  }

  if (weekday === 0) {
    addTask(key, 'other', 30, `第 ${week} 周教材复盘：目录进度核对`, '核对本周语法/阅读/听力完成课次；列出 3 个必须补的项目，并调整下周优先级。');
    addTask(key, 'grammar', 30, `第 ${week} 周语法错题整理`, '把本周语法按接续、语气、书面/口语限制分组，至少写 3 组不能互换点。', 'shin-kanzen-grammar');
    addTask(key, 'listening', 20, `第 ${week} 周听力错段回听`, '只回听本周错段，到能复述答案依据；记录一个常漏听的关键词。', 'shin-kanzen-listening');
    addTask(key, 'vocabulary', 10, '应用内到期复习清理', '清掉当天到期复习，错题当天二刷。');
    week += 1;
    continue;
  }

  if (weekday === 2 || weekday === 4) {
    addGrammar(key, 45);
    addListening(key, weekday === 2 ? 25 : 30);
    addTask(key, 'vocabulary', 15, '应用内词汇/汉字短测', '做 10-15 分钟文字・語彙或汉字复习，错项写入当天记录。');
  } else if (weekday === 3) {
    addReading(key, 50);
    addTask(key, 'grammar', 25, '语法复述：最近两课接续和语气', '不看书复述最近两课：接续、中文近似义、易混点；复述不顺的表达回到教材例句。', 'shin-kanzen-grammar');
    addTask(key, 'vocabulary', 15, '应用内错题复习', '优先复习最近阅读和听力中遇到的未知词。');
  } else if (weekday === 5) {
    addReading(key, 45);
    addListening(key, 25);
    addTask(key, 'vocabulary', 20, '文字・語彙混淆整理', '把本周反复错的读音、字形、近义词放进错题本。');
  } else if (weekday === 6) {
    addGrammar(key, 40);
    addReading(key, 35);
    addTask(key, 'other', 15, '本周任务补漏', '补当天以前未完成的最小任务；如果没有欠账，做官方题型说明或样题 15 分钟。');
  }
}

function addFinalTasks(date, weekday) {
  if (weekday === 1) return;
  if (weekday === 0 || date === profile.examDate) {
    addTask(
      date,
      'other',
      date === profile.examDate ? 30 : 90,
      date === profile.examDate ? 'JLPT N1 正式考试日：轻量热身与流程确认' : '整套模拟或半套限时：按正式时间复盘',
      date === profile.examDate
        ? '不再开新内容；只确认准考证、路线、时间和文具，轻读错题摘要，保持听力耳感。'
        : '按正式时间做限时模拟，记录答题顺序、失分原因和下周只需处理的错题。',
    );
    return;
  }
  addTask(date, 'grammar', 30, '考前语法二轮：易混表达重组', '按接续/语气/文体限制重组错题，不按新课推进；每组写一个不能互换点。', 'shin-kanzen-grammar');
  addTask(date, 'reading', 30, '考前阅读二轮：依据定位速度', '重做错题或长文题，给每题标出原文依据行，再对照解释。', 'shin-kanzen-reading');
  addTask(date, 'listening', 20, '考前听力二轮：错段回听到可复述', '只听错段和题干，复述答案依据；保留听不清词到回听清单。', 'shin-kanzen-listening');
  addTask(date, 'vocabulary', 10, '考前词汇保温', '复习应用内到期词和反复错的文字・語彙混淆。');
}

function addGrammar(date, minutes) {
  const section = grammar[grammarIndex] ?? '语法二轮：易混表达、文章の文法、模擬試験错题';
  if (grammarIndex < grammar.length) grammarIndex += 1;
  addTask(
    date,
    'grammar',
    minutes,
    `新完全掌握 N1 语法：${section}`,
    '完成本课例句和问题；写出接续、语气、中文近似义、不能互换点，并把不确定表达录入应用。',
    'shin-kanzen-grammar',
  );
}

function addReading(date, minutes) {
  const section = reading[readingIndex] ?? '阅读二轮：错题重做与依据定位';
  if (readingIndex < reading.length) readingIndex += 1;
  addTask(
    date,
    'reading',
    minutes,
    `新完全掌握 N1 阅读：${section}`,
    '先限时阅读，再给每题标出原文依据；错题写一句失分原因和下次定位策略。',
    'shin-kanzen-reading',
  );
}

function addListening(date, minutes) {
  const section = listening[listeningIndex] ?? '听力二轮：题型混合与错段回听';
  if (listeningIndex < listening.length) listeningIndex += 1;
  addTask(
    date,
    'listening',
    minutes,
    `新完全掌握 N1 听力：${section}`,
    '第一遍不看文字抓任务和结论；订正后只回听错段，到能说出答案依据。',
    'shin-kanzen-listening',
  );
}

function addTask(date, module, minutes, title, detail, materialId) {
  const id = `textbook-${date}-${module}-${tasks.filter((task) => task.date === date && task.module === module).length + 1}`;
  const completed = completedBuckets.get(`${date}:${module}`)?.shift();
  tasks.push({
    id,
    date,
    title,
    module,
    minutes,
    detail,
    ...(materialId ? { materialId } : {}),
    status: completed ? 'completed' : 'pending',
    ...(completed?.completedAt ? { completedAt: completed.completedAt } : {}),
  });
}

function parseDate(value) {
  return new Date(`${value}T00:00:00`);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

const plan = {
  profile,
  status: 'ready',
  tasks,
  generatedAt: new Date().toISOString(),
};

db.prepare(`
  INSERT INTO study_plans (user_id, plan_json, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET
    plan_json = excluded.plan_json,
    updated_at = excluded.updated_at
`).run(user.id, JSON.stringify(plan), new Date().toISOString());

console.log(`Updated ${username}: ${tasks.length} tasks, grammar=${Math.min(grammarIndex, grammar.length)}/${grammar.length}, reading=${Math.min(readingIndex, reading.length)}/${reading.length}, listening=${Math.min(listeningIndex, listening.length)}/${listening.length}`);
