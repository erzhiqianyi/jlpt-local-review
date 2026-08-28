import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
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
  feedbackMode: 'immediate',
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
    settings: state.settings,
    ai_prompt: [
      '请分析这份 JLPT 学习记录。',
      '请找出我的薄弱模块、容易错的题型、需要提前复习的词条。',
      '请按照 Anki/遗忘曲线思想，为接下来 7 天生成复习计划。',
      '请基于错题和即将到期的 nextReviewAt，生成新的 JLPT 练习题和解析。',
    ].join('\n'),
  };
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
  return {
    showReviewRuby: typeof value?.showReviewRuby === 'boolean' ? value.showReviewRuby : defaultSettings.showReviewRuby,
    showExplanationRuby: typeof value?.showExplanationRuby === 'boolean' ? value.showExplanationRuby : defaultSettings.showExplanationRuby,
    locale,
    feedbackMode,
  };
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
