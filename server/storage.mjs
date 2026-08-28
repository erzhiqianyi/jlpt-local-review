import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localDir = resolve(rootDir, '.local');
const dbPath = process.env.JLPT_DB_PATH ? resolve(process.env.JLPT_DB_PATH) : join(localDir, 'jlpt.sqlite');
const dataRoot = process.env.JLPT_REVIEW_DATA_PATH
  ? resolve(process.env.JLPT_REVIEW_DATA_PATH)
  : join(rootDir, 'public', 'data', 'review-data');
const legacyDataPath = join(rootDir, 'public', 'data', 'review-data.json');

const defaultSettings = {
  showReviewRuby: true,
  showExplanationRuby: true,
  locale: 'zh-CN',
  fontSize: 'standard',
  feedbackMode: 'immediate',
  questionTypeTips: {},
};

let db;

export function databasePath() {
  return dbPath;
}

export function reviewDataPath() {
  return dataRoot;
}

export function getDb() {
  if (!db) {
    mkdirSync(localDir, { recursive: true });
    db = new DatabaseSync(dbPath);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_settings (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        settings_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS answers (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        question_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        selected TEXT NOT NULL,
        correct INTEGER NOT NULL,
        answered_at TEXT NOT NULL,
        PRIMARY KEY (user_id, question_id)
      );

      CREATE TABLE IF NOT EXISTS progress (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_id TEXT NOT NULL,
        progress_json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, item_id)
      );

      CREATE TABLE IF NOT EXISTS practice_state (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        attempt_history_json TEXT NOT NULL,
        active_attempt_json TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS review_pack_drafts (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        content_json TEXT NOT NULL,
        annotations_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS listening_questions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        question TEXT NOT NULL,
        choices_json TEXT NOT NULL,
        answer_index INTEGER NOT NULL,
        explanation TEXT NOT NULL,
        audio_file_name TEXT NOT NULL,
        audio_mime TEXT NOT NULL,
        audio_size INTEGER NOT NULL,
        audio_path TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS study_plans (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        plan_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS learning_captures (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        body TEXT NOT NULL,
        category TEXT NOT NULL,
        context TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }
  return db;
}

export function loadReviewData() {
  const files = reviewDataFiles();
  if (!files.length) {
    return { generated_at: new Date().toISOString(), items: [] };
  }
  const archives = files.map((file) => JSON.parse(readFileSync(file, 'utf8')));
  const generatedAt = archives
    .map((archive) => archive.generated_at)
    .filter(Boolean)
    .sort()
    .at(-1) ?? new Date().toISOString();
  const items = archives
    .flatMap((archive) => archive.items ?? [])
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || (a.input_at ?? '').localeCompare(b.input_at ?? '') || a.id.localeCompare(b.id));
  return {
    generated_at: generatedAt,
    archive_root: dataRoot,
    archive_files: files.map((file) => file.replace(`${rootDir}/`, '')),
    items,
  };
}

function reviewDataFiles() {
  if (existsSync(dataRoot) && statSync(dataRoot).isFile()) {
    return [dataRoot];
  }
  if (existsSync(dataRoot) && statSync(dataRoot).isDirectory()) {
    return walkJsonFiles(dataRoot);
  }
  if (existsSync(legacyDataPath)) {
    return [legacyDataPath];
  }
  return [];
}

function walkJsonFiles(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        return walkJsonFiles(path);
      }
      return entry.isFile() && entry.name.endsWith('.json') ? [path] : [];
    })
    .sort();
}

export function createUser(username, password) {
  const name = normalizeUsername(username);
  validatePassword(password);
  const now = new Date().toISOString();
  const salt = randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const result = getDb()
    .prepare('INSERT INTO users (username, password_hash, salt, created_at) VALUES (?, ?, ?, ?)')
    .run(name, passwordHash, salt, now);
  const user = { id: Number(result.lastInsertRowid), username: name };
  ensureSettings(user.id);
  return user;
}

export function loginUser(username, password) {
  const name = normalizeUsername(username);
  const row = getDb()
    .prepare('SELECT id, username, password_hash, salt FROM users WHERE username = ?')
    .get(name);
  if (!row || !verifyPassword(password, row.salt, row.password_hash)) {
    return null;
  }
  const token = randomBytes(32).toString('base64url');
  const now = new Date().toISOString();
  getDb()
    .prepare('INSERT INTO sessions (token, user_id, created_at, last_seen_at) VALUES (?, ?, ?, ?)')
    .run(token, row.id, now, now);
  ensureSettings(row.id);
  return { token, user: { id: row.id, username: row.username } };
}

export function userForToken(token) {
  if (!token) {
    return null;
  }
  const row = getDb()
    .prepare(`
      SELECT users.id, users.username
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.token = ?
    `)
    .get(token);
  if (!row) {
    return null;
  }
  getDb().prepare('UPDATE sessions SET last_seen_at = ? WHERE token = ?').run(new Date().toISOString(), token);
  return { id: row.id, username: row.username };
}

export function deleteSession(token) {
  if (token) {
    getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
}

export function createListeningQuestion(userId, payload) {
  const question = String(payload?.question ?? '').trim();
  const choices = Array.isArray(payload?.choices)
    ? payload.choices.map((choice) => String(choice ?? '').trim())
    : [];
  const answerIndex = Number(payload?.answerIndex);
  const audioMime = String(payload?.audioMime ?? '').toLowerCase();
  const audioFileName = String(payload?.audioFileName ?? 'listening-audio').trim().slice(0, 180);
  const audioBase64 = String(payload?.audioBase64 ?? '').replace(/\s/g, '');
  if (!question || choices.length !== 4 || choices.some((choice) => !choice)) {
    throw new Error('Question and four non-empty choices are required');
  }
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= choices.length) {
    throw new Error('Choose a valid correct answer');
  }
  if (!audioMime.startsWith('audio/') || !audioBase64) {
    throw new Error('A valid audio file is required');
  }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(audioBase64)) {
    throw new Error('Invalid audio data');
  }
  const audio = Buffer.from(audioBase64, 'base64');
  if (!audio.length || audio.length > 25 * 1024 * 1024) {
    throw new Error('Audio file must be 25 MB or smaller');
  }

  const id = randomBytes(12).toString('base64url');
  const userAudioDir = join(localDir, 'listening-audio', String(userId));
  const extension = audioExtension(audioMime);
  const audioPath = join(userAudioDir, `${id}.${extension}`);
  const now = new Date().toISOString();
  const title = String(payload?.title ?? '').trim().slice(0, 120) || question.slice(0, 120);
  const explanation = String(payload?.explanation ?? '').trim().slice(0, 2000);
  mkdirSync(userAudioDir, { recursive: true });
  writeFileSync(audioPath, audio, { flag: 'wx' });
  try {
    getDb().prepare(`
      INSERT INTO listening_questions (
        id, user_id, title, question, choices_json, answer_index, explanation,
        audio_file_name, audio_mime, audio_size, audio_path, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, userId, title, question, JSON.stringify(choices), answerIndex, explanation,
      audioFileName, audioMime, audio.length, audioPath, now,
    );
  } catch (error) {
    unlinkSync(audioPath);
    throw error;
  }
  return listeningQuestionForUser(userId, id);
}

export function listListeningQuestions(userId) {
  return getDb().prepare(`
    SELECT id, title, question, choices_json, answer_index, explanation,
      audio_file_name, audio_mime, audio_size, created_at
    FROM listening_questions
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId).map(mapListeningQuestion);
}

export function listeningQuestionForUser(userId, id) {
  const row = getDb().prepare(`
    SELECT id, title, question, choices_json, answer_index, explanation,
      audio_file_name, audio_mime, audio_size, created_at
    FROM listening_questions
    WHERE user_id = ? AND id = ?
  `).get(userId, id);
  return row ? mapListeningQuestion(row) : null;
}

export function listeningAudioForUser(userId, id) {
  const row = getDb().prepare(`
    SELECT audio_path, audio_mime, audio_file_name, audio_size
    FROM listening_questions
    WHERE user_id = ? AND id = ?
  `).get(userId, id);
  return row && existsSync(row.audio_path) ? row : null;
}

export function deleteListeningQuestion(userId, id) {
  const audio = getDb().prepare('SELECT audio_path FROM listening_questions WHERE user_id = ? AND id = ?').get(userId, id);
  if (!audio) {
    return false;
  }
  getDb().prepare('DELETE FROM listening_questions WHERE user_id = ? AND id = ?').run(userId, id);
  if (existsSync(audio.audio_path)) {
    unlinkSync(audio.audio_path);
  }
  return true;
}

export function getStudyState(userId) {
  ensureSettings(userId);
  const settingsRow = getDb().prepare('SELECT settings_json FROM user_settings WHERE user_id = ?').get(userId);
  const answerRows = getDb().prepare('SELECT question_id, selected, correct, answered_at FROM answers WHERE user_id = ?').all(userId);
  const progressRows = getDb().prepare('SELECT item_id, progress_json FROM progress WHERE user_id = ?').all(userId);
  const practice = getPracticeState(userId);
  return {
    settings: normalizeSettings(JSON.parse(settingsRow.settings_json)),
    answers: Object.fromEntries(answerRows.map((row) => [row.question_id, { selected: row.selected, correct: Boolean(row.correct), answeredAt: row.answered_at }])),
    progress: Object.fromEntries(progressRows.map((row) => [row.item_id, JSON.parse(row.progress_json)])),
    attemptHistory: practice.attemptHistory,
    activeAttempt: practice.activeAttempt,
  };
}

export function saveSettings(userId, settings) {
  const normalized = normalizeSettings(settings);
  getDb()
    .prepare('UPDATE user_settings SET settings_json = ?, updated_at = ? WHERE user_id = ?')
    .run(JSON.stringify(normalized), new Date().toISOString(), userId);
  return normalized;
}

export function getStudyPlan(userId) {
  const row = getDb().prepare('SELECT plan_json, updated_at FROM study_plans WHERE user_id = ?').get(userId);
  const stored = row ? parseJson(row.plan_json, {}) : {};
  const plan = normalizeStudyPlanDocument(stored);
  const reconciled = reconcileStudyPlan(plan);
  if (row && JSON.stringify(reconciled) !== JSON.stringify(plan)) {
    const now = new Date().toISOString();
    getDb().prepare('UPDATE study_plans SET plan_json = ?, updated_at = ? WHERE user_id = ?').run(JSON.stringify(reconciled), now, userId);
    row.updated_at = now;
  }
  return {
    ...reconciled,
    dailySummaries: buildDailySummaries(userId, reconciled.tasks),
    updatedAt: row?.updated_at,
  };
}

export function saveStudyPlanProfile(userId, profile) {
  const current = getStudyPlan(userId);
  const normalizedProfile = normalizeStudyPlanProfile(profile);
  const next = {
    profile: normalizedProfile,
    status: current.tasks.length ? 'needs_refresh' : 'profile_only',
    tasks: current.tasks,
    generatedAt: current.generatedAt,
  };
  return saveStudyPlanDocument(userId, next);
}

export function saveGeneratedStudyPlan(userId, payload) {
  const current = getStudyPlan(userId);
  const tasks = normalizeStudyPlanTasks(payload?.tasks, current.profile);
  if (!tasks.length) {
    throw new Error('Generated plan must include at least one daily task');
  }
  const now = new Date().toISOString();
  const completedById = new Map(current.tasks.filter((task) => task.status === 'completed').map((task) => [task.id, task]));
  const mergedTasks = tasks.map((task) => completedById.get(task.id) ?? task);
  return saveStudyPlanDocument(userId, {
    profile: current.profile,
    status: 'ready',
    tasks: mergedTasks,
    generatedAt: now,
  });
}

export function updateStudyPlanTask(userId, taskId, status) {
  const current = getStudyPlan(userId);
  const nextStatus = ['pending', 'completed', 'skipped'].includes(status) ? status : null;
  if (!nextStatus) throw new Error('Invalid task status');
  let found = false;
  const now = new Date().toISOString();
  const tasks = current.tasks.map((task) => {
    if (task.id !== taskId) return task;
    found = true;
    return {
      ...task,
      status: nextStatus,
      ...(nextStatus === 'completed' ? { completedAt: now } : { completedAt: undefined }),
    };
  });
  if (!found) return null;
  return saveStudyPlanDocument(userId, { ...current, tasks });
}

export function getPlanGenerationContext(userId) {
  const plan = getStudyPlan(userId);
  const practice = getPracticeState(userId);
  return {
    plan,
    weakPoints: analyzeWeakPoints(userId),
    recentAttempts: practice.attemptHistory.slice(0, 20),
    instructions: [
      'Create concrete daily JLPT tasks between profile.startDate and profile.examDate.',
      'Use only the learner materials in profile.materials unless the learner goal explicitly requests other resources.',
      'Keep each day within profile.dailyMinutes and approximately profile.studyDaysPerWeek study days per week.',
      'Use recentAttempts, weakPoints, and dailySummaries to adjust future workload.',
      'Write the result with save_generated_study_plan. Do not edit monthly review-data JSON.',
    ],
  };
}

function saveStudyPlanDocument(userId, plan) {
  const normalized = normalizeStudyPlanDocument(plan);
  const now = new Date().toISOString();
  getDb()
    .prepare(`
      INSERT INTO study_plans (user_id, plan_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        plan_json = excluded.plan_json,
        updated_at = excluded.updated_at
    `)
    .run(userId, JSON.stringify(normalized), now);
  return { ...normalized, dailySummaries: buildDailySummaries(userId, normalized.tasks), updatedAt: now };
}

export function saveAnswer(userId, { questionId, itemId, selected, correct, progressEntry, attemptHistory, activeAttempt }) {
  if (!questionId || !itemId || typeof selected !== 'string' || typeof correct !== 'boolean' || !progressEntry) {
    throw new Error('Invalid answer payload');
  }
  const now = new Date().toISOString();
  const database = getDb();
  database.exec('BEGIN');
  try {
    database
      .prepare(`
        INSERT INTO answers (user_id, question_id, item_id, selected, correct, answered_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, question_id) DO UPDATE SET
          selected = excluded.selected,
          correct = excluded.correct,
          answered_at = excluded.answered_at
      `)
      .run(userId, questionId, itemId, selected, correct ? 1 : 0, now);
    database
      .prepare(`
        INSERT INTO progress (user_id, item_id, progress_json, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, item_id) DO UPDATE SET
          progress_json = excluded.progress_json,
          updated_at = excluded.updated_at
      `)
      .run(userId, itemId, JSON.stringify(progressEntry), now);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
  if (Array.isArray(attemptHistory) || activeAttempt !== undefined) {
    savePracticeState(userId, { attemptHistory, activeAttempt });
  }
}

export function savePracticeState(userId, { answers, attemptHistory, activeAttempt }) {
  const database = getDb();
  const now = new Date().toISOString();
  database.exec('BEGIN');
  try {
    if (answers && typeof answers === 'object') {
      database.prepare('DELETE FROM answers WHERE user_id = ?').run(userId);
      const insert = database.prepare(`
        INSERT INTO answers (user_id, question_id, item_id, selected, correct, answered_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const [questionId, answer] of Object.entries(answers)) {
        const itemId = String(questionId).replace(/-(grammar|moji-goi|meaning|kana-to-kanji|kanji-to-kana|name-reading).*$/, '');
        insert.run(userId, questionId, itemId, String(answer.selected ?? ''), answer.correct ? 1 : 0, answer.answeredAt ?? now);
      }
    }
    upsertPracticeState(userId, attemptHistory, activeAttempt, now);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

export function buildStudyRecord(userId) {
  const data = loadReviewData();
  const state = getStudyState(userId);
  const answered = Object.keys(state.answers).length;
  const correct = Object.values(state.answers).filter((answer) => answer.correct).length;
  const mastered = Object.values(state.progress).filter((item) => item.status === 'mastered').length;
  return {
    exported_at: new Date().toISOString(),
    app: 'JLPT Review',
    data_generated_at: data.generated_at,
    data_source: 'backend',
    storage: 'sqlite',
    summary: {
      items: data.items.length,
      answered,
      correct,
      mastered,
    },
    items: data.items.map((item) => ({
      id: item.id,
      deck: item.deck,
      type: item.type,
      jlpt_level: item.jlpt_level,
      original: item.original,
      reading: item.reading,
      meaning: item.meaning_zh,
      input_at: item.input_at,
    })),
    answers: state.answers,
    progress: state.progress,
    attempt_history: state.attemptHistory,
    active_attempt: state.activeAttempt,
    learning_captures: listLearningCaptures(userId),
    settings: state.settings,
    ai_prompt: [
      '请分析这份 JLPT 学习记录。',
      '请找出我的薄弱模块、容易错的题型、需要提前复习的词条。',
      '请按照 Anki/遗忘曲线思想，为接下来 7 天生成复习计划。',
      '请基于错题和即将到期的 nextReviewAt，生成新的 JLPT 练习题和解析。',
    ].join('\n'),
  };
}

export function createLearningCapture(userId, { body, category = 'unsure', context = '' }) {
  const text = String(body ?? '').trim();
  if (!text) throw new Error('Capture body is required');
  const now = new Date().toISOString();
  const capture = {
    id: randomBytes(12).toString('base64url'),
    body: text.slice(0, 5000),
    category: normalizeCaptureCategory(category),
    context: String(context ?? '').trim().slice(0, 2000),
    status: 'inbox',
    createdAt: now,
    updatedAt: now,
  };
  getDb().prepare(`
    INSERT INTO learning_captures (id, user_id, body, category, context, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(capture.id, userId, capture.body, capture.category, capture.context, capture.status, now, now);
  return capture;
}

export function listLearningCaptures(userId, status) {
  const normalizedStatus = ['inbox', 'processed', 'archived'].includes(status) ? status : null;
  const rows = normalizedStatus
    ? getDb().prepare('SELECT * FROM learning_captures WHERE user_id = ? AND status = ? ORDER BY created_at DESC').all(userId, normalizedStatus)
    : getDb().prepare('SELECT * FROM learning_captures WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  return rows.map(learningCaptureFromRow);
}

export function updateLearningCaptureStatus(userId, id, status) {
  const nextStatus = ['inbox', 'processed', 'archived'].includes(status) ? status : null;
  if (!nextStatus) throw new Error('Invalid capture status');
  const now = new Date().toISOString();
  const result = getDb().prepare('UPDATE learning_captures SET status = ?, updated_at = ? WHERE user_id = ? AND id = ?').run(nextStatus, now, userId, id);
  if (!result.changes) return null;
  return learningCaptureFromRow(getDb().prepare('SELECT * FROM learning_captures WHERE user_id = ? AND id = ?').get(userId, id));
}

function learningCaptureFromRow(row) {
  return {
    id: row.id,
    body: row.body,
    category: row.category,
    context: row.context,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeCaptureCategory(value) {
  return ['word', 'grammar', 'sentence', 'listening', 'reading', 'unsure'].includes(value) ? value : 'unsure';
}

export function listDueReviews(userId, at = new Date().toISOString()) {
  const data = loadReviewData();
  const state = getStudyState(userId);
  const dueItemIds = new Set(
    Object.entries(state.progress)
      .filter(([, progress]) => !progress.nextReviewAt || progress.nextReviewAt <= at)
      .map(([itemId]) => itemId),
  );
  return data.items.filter((item) => dueItemIds.has(item.id));
}

export function analyzeWeakPoints(userId) {
  const data = loadReviewData();
  const state = getStudyState(userId);
  const byItem = data.items.map((item) => {
    const progress = state.progress[item.id] ?? { correct: 0, wrong: 0, status: 'new' };
    return {
      id: item.id,
      original: item.original,
      deck: item.deck,
      jlpt_level: item.jlpt_level,
      correct: progress.correct ?? 0,
      wrong: progress.wrong ?? 0,
      status: progress.status ?? 'new',
      nextReviewAt: progress.nextReviewAt,
    };
  });
  return {
    weakest_items: byItem
      .filter((item) => item.wrong > 0 || item.status === 'learning')
      .sort((a, b) => b.wrong - a.wrong || a.correct - b.correct)
      .slice(0, 12),
    due_items: listDueReviews(userId).slice(0, 20).map((item) => ({ id: item.id, original: item.original, deck: item.deck })),
    totals: {
      items: data.items.length,
      answered: Object.keys(state.answers).length,
      mastered: byItem.filter((item) => item.status === 'mastered').length,
    },
  };
}

export function createDailyReviewPackDraft(userId, { title, minutes = 30 } = {}) {
  const analysis = analyzeWeakPoints(userId);
  const now = new Date().toISOString();
  return createReviewPackDraft(userId, {
    title: title || `Daily review draft ${now.slice(0, 10)}`,
    content: {
      kind: 'daily_review_pack',
      minutes,
      generated_at: now,
      focus_items: analysis.weakest_items.slice(0, 8),
      due_items: analysis.due_items.slice(0, 12),
      sections: [
        {
          title: 'Weak items',
          body: 'Review the items with wrong answers or learning status first.',
          items: analysis.weakest_items.slice(0, 8),
        },
        {
          title: 'Due review',
          body: 'Use these items for spaced repetition today.',
          items: analysis.due_items.slice(0, 12),
        },
      ],
      next_step: 'Add comments in the draft preview, then ask the MCP client to optimize from the revision context.',
    },
  });
}

export function createReviewPackDraft(userId, { title, content, status = 'draft' }) {
  if (!title || !content) {
    throw new Error('Draft title and content are required');
  }
  const id = randomBytes(12).toString('base64url');
  const now = new Date().toISOString();
  const draft = {
    id,
    title: String(title).slice(0, 120),
    status: normalizeDraftStatus(status),
    content,
    annotations: [],
    created_at: now,
    updated_at: now,
  };
  getDb()
    .prepare(`
      INSERT INTO review_pack_drafts (id, user_id, title, status, content_json, annotations_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(id, userId, draft.title, draft.status, JSON.stringify(draft.content), JSON.stringify(draft.annotations), now, now);
  return draft;
}

export function listReviewPackDrafts(userId) {
  return getDb()
    .prepare(`
      SELECT id, title, status, created_at, updated_at
      FROM review_pack_drafts
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `)
    .all(userId);
}

export function getReviewPackDraft(userId, id) {
  const row = getDb()
    .prepare(`
      SELECT id, title, status, content_json, annotations_json, created_at, updated_at
      FROM review_pack_drafts
      WHERE user_id = ? AND id = ?
    `)
    .get(userId, id);
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    content: JSON.parse(row.content_json),
    annotations: JSON.parse(row.annotations_json),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function addDraftAnnotation(userId, id, { body }) {
  const draft = getReviewPackDraft(userId, id);
  if (!draft) {
    return null;
  }
  const text = String(body ?? '').trim();
  if (!text) {
    throw new Error('Annotation body is required');
  }
  const now = new Date().toISOString();
  const nextDraft = {
    ...draft,
    annotations: [
      ...draft.annotations,
      {
        id: randomBytes(8).toString('base64url'),
        body: text,
        created_at: now,
      },
    ],
    updated_at: now,
  };
  getDb()
    .prepare('UPDATE review_pack_drafts SET annotations_json = ?, updated_at = ? WHERE user_id = ? AND id = ?')
    .run(JSON.stringify(nextDraft.annotations), now, userId, id);
  return nextDraft;
}

export function buildDraftRevisionContext(userId, id) {
  const draft = getReviewPackDraft(userId, id);
  if (!draft) {
    return null;
  }
  return {
    draft,
    study_record: buildStudyRecord(userId),
    optimization_prompt: [
      '请根据这个 JLPT 复习草稿和用户批注进行优化。',
      '保留用户明确认可的部分，修正批注指出的问题。',
      '输出新的 draft 内容，不要直接写入正式月度归档 JSON。',
    ].join('\n'),
  };
}

function normalizeDraftStatus(status) {
  return ['draft', 'needs_revision', 'approved', 'archived'].includes(status) ? status : 'draft';
}

function ensureSettings(userId) {
  const row = getDb().prepare('SELECT user_id FROM user_settings WHERE user_id = ?').get(userId);
  if (!row) {
    getDb()
      .prepare('INSERT INTO user_settings (user_id, settings_json, updated_at) VALUES (?, ?, ?)')
      .run(userId, JSON.stringify(defaultSettings), new Date().toISOString());
  }
  const practiceRow = getDb().prepare('SELECT user_id FROM practice_state WHERE user_id = ?').get(userId);
  if (!practiceRow) {
    getDb()
      .prepare('INSERT INTO practice_state (user_id, attempt_history_json, active_attempt_json, updated_at) VALUES (?, ?, ?, ?)')
      .run(userId, '[]', null, new Date().toISOString());
  }
}

function normalizeUsername(username) {
  const value = String(username ?? '').trim();
  if (!/^[A-Za-z0-9_-]{3,32}$/.test(value)) {
    throw new Error('Username must be 3-32 letters, numbers, underscores, or hyphens');
  }
  return value;
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 4 || password.length > 128) {
    throw new Error('Password must be 4-128 characters');
  }
}

function hashPassword(password, salt) {
  return scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password, salt, expectedHash) {
  const actual = Buffer.from(hashPassword(password, salt), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function normalizeSettings(value) {
  const locale = value?.locale === 'ja' || value?.locale === 'en' || value?.locale === 'zh-CN' ? value.locale : defaultSettings.locale;
  const feedbackMode = value?.feedbackMode === 'batch' ? 'batch' : defaultSettings.feedbackMode;
  const fontSize = value?.fontSize === 'small' || value?.fontSize === 'large' ? value.fontSize : defaultSettings.fontSize;
  return {
    showReviewRuby: typeof value?.showReviewRuby === 'boolean' ? value.showReviewRuby : defaultSettings.showReviewRuby,
    showExplanationRuby: typeof value?.showExplanationRuby === 'boolean' ? value.showExplanationRuby : defaultSettings.showExplanationRuby,
    locale,
    fontSize,
    feedbackMode,
    questionTypeTips: normalizeQuestionTypeTips(value?.questionTypeTips),
  };
}

function normalizeQuestionTypeTips(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, tip]) => /^[a-z0-9_-]{1,80}$/i.test(key) && typeof tip === 'string')
      .slice(0, 50)
      .map(([key, tip]) => [key, tip.trim().slice(0, 2000)]),
  );
}

function normalizeStudyPlanDocument(value) {
  const legacyProfile = value?.profile ?? value;
  const profile = normalizeStudyPlanProfile(legacyProfile);
  const tasks = normalizeStudyPlanTasks(value?.tasks ?? [], profile, false);
  return {
    profile,
    status: tasks.length ? (value?.status === 'needs_refresh' ? 'needs_refresh' : 'ready') : 'profile_only',
    tasks,
    ...(value?.generatedAt ? { generatedAt: normalizeTimestamp(value.generatedAt) } : {}),
  };
}

function normalizeStudyPlanProfile(value) {
  const fallback = defaultStudyPlanProfile();
  const startDate = normalizeDate(value?.startDate, fallback.startDate);
  const examDate = normalizeDate(value?.examDate, fallback.examDate);
  if (examDate < startDate) {
    throw new Error('Exam date must be on or after the plan start date');
  }
  const materials = Array.isArray(value?.materials)
    ? value.materials.slice(0, 12).map((material, index) => normalizeStudyMaterial(material, index))
    : fallback.materials;
  if (!materials.length) {
    throw new Error('At least one study material is required');
  }
  return {
    level: ['N1', 'N2', 'N3', 'N4', 'N5'].includes(value?.level) ? value.level : fallback.level,
    startDate,
    examDate,
    studyDaysPerWeek: clampInteger(value?.studyDaysPerWeek, 1, 7, fallback.studyDaysPerWeek),
    dailyMinutes: clampInteger(value?.dailyMinutes, 15, 480, fallback.dailyMinutes),
    materials,
    goal: String(value?.goal ?? '').trim().slice(0, 1000),
  };
}

function normalizeStudyMaterial(value, index) {
  const title = String(value?.title ?? '').trim().slice(0, 120);
  if (!title) {
    throw new Error('Every study material needs a name');
  }
  return {
    id: /^[a-z0-9_-]{1,100}$/i.test(value?.id) ? value.id : `material-${index + 1}`,
    title,
    module: ['grammar', 'reading', 'listening', 'vocabulary', 'other'].includes(value?.module) ? value.module : 'other',
    currentPosition: String(value?.currentPosition ?? value?.notes ?? '').trim().slice(0, 500),
  };
}

function normalizeStudyPlanTasks(value, profile, required = true) {
  if (!Array.isArray(value)) {
    if (required) throw new Error('Generated plan tasks must be an array');
    return [];
  }
  const tasks = value.slice(0, 730).map((task, index) => {
    const date = normalizeDate(task?.date, '');
    if (!date || date < profile.startDate || date > profile.examDate) {
      throw new Error(`Task ${index + 1} has a date outside the study period`);
    }
    const title = String(task?.title ?? '').trim().slice(0, 160);
    if (!title) throw new Error(`Task ${index + 1} needs a title`);
    const id = /^[a-z0-9_-]{1,120}$/i.test(task?.id) ? task.id : `task-${date}-${index + 1}`;
    return {
      id,
      date,
      title,
      module: ['grammar', 'reading', 'listening', 'vocabulary', 'other'].includes(task?.module) ? task.module : 'other',
      minutes: clampInteger(task?.minutes, 5, profile.dailyMinutes, Math.min(30, profile.dailyMinutes)),
      detail: String(task?.detail ?? '').trim().slice(0, 1000),
      ...(task?.materialId && /^[a-z0-9_-]{1,100}$/i.test(task.materialId) ? { materialId: task.materialId } : {}),
      status: ['pending', 'completed', 'skipped', 'missed'].includes(task?.status) ? task.status : 'pending',
      ...(task?.completedAt ? { completedAt: normalizeTimestamp(task.completedAt) } : {}),
    };
  });
  if (new Set(tasks.map((task) => task.id)).size !== tasks.length) {
    throw new Error('Generated plan task IDs must be unique');
  }
  const minutesByDate = new Map();
  for (const task of tasks) {
    minutesByDate.set(task.date, (minutesByDate.get(task.date) ?? 0) + task.minutes);
  }
  const overloadedDate = [...minutesByDate.entries()].find(([, minutes]) => minutes > profile.dailyMinutes);
  if (overloadedDate) {
    throw new Error(`Tasks on ${overloadedDate[0]} exceed the daily limit of ${profile.dailyMinutes} minutes`);
  }
  return tasks.sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id));
}

function defaultStudyPlanProfile() {
  return {
    level: 'N1',
    startDate: localDateString(new Date()),
    examDate: '2026-12-06',
    studyDaysPerWeek: 6,
    dailyMinutes: 90,
    materials: [
      { id: 'shin-kanzen-grammar', title: '新完全掌握 N1 语法', module: 'grammar', currentPosition: '' },
      { id: 'shin-kanzen-reading', title: '新完全掌握 N1 阅读', module: 'reading', currentPosition: '' },
      { id: 'shin-kanzen-listening', title: '新完全掌握 N1 听力', module: 'listening', currentPosition: '' },
    ],
    goal: '',
  };
}

function reconcileStudyPlan(plan) {
  const today = localDateString(new Date());
  const tasks = plan.tasks.map((task) => task.status === 'pending' && task.date < today ? { ...task, status: 'missed' } : task);
  const missed = tasks.some((task) => task.status === 'missed');
  return { ...plan, tasks, status: tasks.length ? (missed ? 'needs_refresh' : plan.status) : 'profile_only' };
}

function buildDailySummaries(userId, tasks) {
  const attempts = getPracticeState(userId).attemptHistory.filter((attempt) => attempt.completedAt);
  const dates = new Set([
    ...tasks.map((task) => task.date),
    ...attempts.map((attempt) => dateInTokyo(attempt.completedAt)),
  ]);
  return [...dates]
    .sort((left, right) => right.localeCompare(left))
    .slice(0, 180)
    .map((date) => {
      const dayTasks = tasks.filter((task) => task.date === date);
      const dayAttempts = attempts.filter((attempt) => dateInTokyo(attempt.completedAt) === date);
      const attempted = dayAttempts.reduce((sum, attempt) => sum + (attempt.summary?.total ?? attempt.answers?.length ?? 0), 0);
      const correct = dayAttempts.reduce((sum, attempt) => sum + (attempt.summary?.correct ?? attempt.answers?.filter((answer) => answer.correct).length ?? 0), 0);
      const completedTasks = dayTasks.filter((task) => task.status === 'completed');
      return {
        date,
        attempted,
        correct,
        accuracy: attempted ? correct / attempted : null,
        practiceMinutes: Math.round(dayAttempts.reduce((sum, attempt) => sum + (attempt.summary?.elapsedMs ?? 0), 0) / 60_000),
        plannedTasks: dayTasks.length,
        completedTasks: completedTasks.length,
        plannedMinutes: dayTasks.reduce((sum, task) => sum + task.minutes, 0),
        completedMinutes: completedTasks.reduce((sum, task) => sum + task.minutes, 0),
        note: summaryNote(dayTasks.length, completedTasks.length, attempted),
      };
    });
}

function summaryNote(planned, completed, attempted) {
  if (!planned && !attempted) return 'no_activity';
  if (planned > 0 && completed >= planned) return 'complete';
  if (completed > 0 || attempted > 0) return 'partial';
  return 'not_started';
}

function dateInTokyo(value) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}

function normalizeDate(value, fallback) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime()) ? value : fallback;
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : fallback;
}

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeTimestamp(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function getPracticeState(userId) {
  ensureSettings(userId);
  const row = getDb()
    .prepare('SELECT attempt_history_json, active_attempt_json FROM practice_state WHERE user_id = ?')
    .get(userId);
  return {
    attemptHistory: parseJson(row?.attempt_history_json, []),
    activeAttempt: row?.active_attempt_json ? parseJson(row.active_attempt_json, null) : null,
  };
}

function upsertPracticeState(userId, attemptHistory, activeAttempt, now = new Date().toISOString()) {
  const current = getPracticeState(userId);
  const history = Array.isArray(attemptHistory) ? attemptHistory.slice(0, 50) : current.attemptHistory;
  const active = activeAttempt === undefined ? current.activeAttempt : activeAttempt;
  getDb()
    .prepare(`
      INSERT INTO practice_state (user_id, attempt_history_json, active_attempt_json, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        attempt_history_json = excluded.attempt_history_json,
        active_attempt_json = excluded.active_attempt_json,
        updated_at = excluded.updated_at
    `)
    .run(userId, JSON.stringify(history), active ? JSON.stringify(active) : null, now);
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function mapListeningQuestion(row) {
  return {
    id: row.id,
    title: row.title,
    question: row.question,
    choices: parseJson(row.choices_json, []),
    answerIndex: Number(row.answer_index),
    explanation: row.explanation,
    audioFileName: row.audio_file_name,
    audioMime: row.audio_mime,
    audioSize: Number(row.audio_size),
    createdAt: row.created_at,
  };
}

function audioExtension(mime) {
  const extensions = {
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
    'audio/aac': 'aac',
    'audio/flac': 'flac',
  };
  return extensions[mime] ?? 'audio';
}
