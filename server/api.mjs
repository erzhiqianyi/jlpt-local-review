import { createServer } from 'node:http';
import {
  analyzeWeakPoints,
  addDraftAnnotation,
  buildDraftRevisionContext,
  buildStudyRecord,
  createDailyReviewPackDraft,
  createReviewPackDraft,
  createUser,
  databasePath,
  deleteSession,
  getReviewPackDraft,
  getStudyState,
  listReviewPackDrafts,
  loadReviewData,
  loginUser,
  reviewDataPath,
  saveAnswer,
  saveSettings,
  userForToken,
} from './storage.mjs';

const port = Number(process.env.JLPT_API_PORT ?? 8791);

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const token = bearerToken(req);
    const user = userForToken(token);

    if (req.method === 'GET' && url.pathname === '/api/health') {
      return json(res, 200, { ok: true, databasePath: databasePath(), reviewDataPath: reviewDataPath() });
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/register') {
      const body = await readJson(req);
      const created = createUser(body.username, body.password);
      const session = loginUser(body.username, body.password);
      return json(res, 201, { user: created, token: session.token });
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const body = await readJson(req);
      const session = loginUser(body.username, body.password);
      if (!session) {
        return json(res, 401, { error: 'Invalid username or password' });
      }
      return json(res, 200, session);
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      deleteSession(token);
      return json(res, 200, { ok: true });
    }

    if (!user) {
      return json(res, 401, { error: 'Authentication required' });
    }

    if (req.method === 'GET' && url.pathname === '/api/me') {
      return json(res, 200, { user });
    }

    if (req.method === 'GET' && url.pathname === '/api/review-data') {
      return json(res, 200, loadReviewData());
    }

    if (req.method === 'GET' && url.pathname === '/api/study-state') {
      return json(res, 200, getStudyState(user.id));
    }

    if (req.method === 'PUT' && url.pathname === '/api/study-state/settings') {
      return json(res, 200, { settings: saveSettings(user.id, await readJson(req)) });
    }

    if (req.method === 'POST' && url.pathname === '/api/answers') {
      saveAnswer(user.id, await readJson(req));
      return json(res, 200, getStudyState(user.id));
    }

    if (req.method === 'GET' && url.pathname === '/api/study-record') {
      return json(res, 200, buildStudyRecord(user.id));
    }

    if (req.method === 'GET' && url.pathname === '/api/analysis/weak-points') {
      return json(res, 200, analyzeWeakPoints(user.id));
    }

    if (req.method === 'GET' && url.pathname === '/api/drafts') {
      return json(res, 200, { drafts: listReviewPackDrafts(user.id) });
    }

    if (req.method === 'POST' && url.pathname === '/api/drafts') {
      const body = await readJson(req);
      const draft = body.kind === 'daily_review_pack'
        ? createDailyReviewPackDraft(user.id, body)
        : createReviewPackDraft(user.id, body);
      return json(res, 201, { draft });
    }

    const draftAnnotationMatch = /^\/api\/drafts\/([^/]+)\/annotations$/.exec(url.pathname);
    if (req.method === 'POST' && draftAnnotationMatch) {
      const draft = addDraftAnnotation(user.id, draftAnnotationMatch[1], await readJson(req));
      if (!draft) {
        return json(res, 404, { error: 'Draft not found' });
      }
      return json(res, 200, { draft });
    }

    const draftRevisionMatch = /^\/api\/drafts\/([^/]+)\/revision-context$/.exec(url.pathname);
    if (req.method === 'GET' && draftRevisionMatch) {
      const context = buildDraftRevisionContext(user.id, draftRevisionMatch[1]);
      if (!context) {
        return json(res, 404, { error: 'Draft not found' });
      }
      return json(res, 200, context);
    }

    const draftMatch = /^\/api\/drafts\/([^/]+)$/.exec(url.pathname);
    if (req.method === 'GET' && draftMatch) {
      const draft = getReviewPackDraft(user.id, draftMatch[1]);
      if (!draft) {
        return json(res, 404, { error: 'Draft not found' });
      }
      return json(res, 200, { draft });
    }

    return json(res, 404, { error: 'Not found' });
  } catch (error) {
    const status = /UNIQUE constraint failed/.test(error.message) ? 409 : 400;
    return json(res, status, { error: error.message });
  }
});

server.listen(port, () => {
  console.log(`JLPT local backend listening on http://localhost:${port}`);
  console.log(`SQLite: ${databasePath()}`);
});

function bearerToken(req) {
  const header = req.headers.authorization ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1] ?? '';
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(body));
}
