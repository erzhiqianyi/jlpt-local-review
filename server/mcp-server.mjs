import {
  addDraftAnnotation,
  analyzeWeakPoints,
  buildDraftRevisionContext,
  buildStudyRecord,
  createDailyReviewPackDraft,
  createReviewPackDraft,
  getReviewPackDraft,
  listDueReviews,
  listReviewPackDrafts,
  loadReviewData,
  loginUser,
  userForToken,
} from './storage.mjs';

const protocolVersion = '2024-11-05';
const serverInfo = { name: 'jlpt-local-mcp', version: '0.1.0' };

process.stdin.setEncoding('utf8');
let buffer = '';

process.stdin.on('data', (chunk) => {
  buffer += chunk;
  for (;;) {
    const index = buffer.indexOf('\n');
    if (index === -1) {
      return;
    }
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (line) {
      handleMessage(line);
    }
  }
});

async function handleMessage(line) {
  const message = JSON.parse(line);
  try {
    if (message.method === 'initialize') {
      return respond(message.id, {
        protocolVersion,
        capabilities: { tools: {} },
        serverInfo,
      });
    }

    if (message.method === 'tools/list') {
      return respond(message.id, { tools: toolList() });
    }

    if (message.method === 'tools/call') {
      const result = await callTool(message.params?.name, message.params?.arguments ?? {});
      return respond(message.id, {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      });
    }

    if (message.id !== undefined) {
      return respond(message.id, {});
    }
  } catch (error) {
    respondError(message.id, -32000, error.message);
  }
}

async function callTool(name, args) {
  if (name === 'login') {
    const session = loginUser(args.username, args.password);
    if (!session) {
      throw new Error('Invalid username or password');
    }
    return session;
  }

  const user = userForToken(args.token);
  if (!user) {
    throw new Error('Authentication required. Call login first and pass the returned token.');
  }

  if (name === 'get_review_data') {
    return loadReviewData();
  }
  if (name === 'get_study_record') {
    return buildStudyRecord(user.id);
  }
  if (name === 'list_due_reviews') {
    return listDueReviews(user.id, args.at);
  }
  if (name === 'analyze_weak_points') {
    return analyzeWeakPoints(user.id);
  }
  if (name === 'generate_daily_review_pack') {
    return createDailyReviewPackDraft(user.id, { title: args.title, minutes: args.minutes });
  }
  if (name === 'create_review_pack_draft') {
    return createReviewPackDraft(user.id, { title: args.title, content: args.content });
  }
  if (name === 'list_review_pack_drafts') {
    return listReviewPackDrafts(user.id);
  }
  if (name === 'get_review_pack_draft') {
    const draft = getReviewPackDraft(user.id, args.draft_id);
    if (!draft) {
      throw new Error('Draft not found');
    }
    return draft;
  }
  if (name === 'add_draft_annotation') {
    const draft = addDraftAnnotation(user.id, args.draft_id, { body: args.body });
    if (!draft) {
      throw new Error('Draft not found');
    }
    return draft;
  }
  if (name === 'get_draft_revision_context') {
    const context = buildDraftRevisionContext(user.id, args.draft_id);
    if (!context) {
      throw new Error('Draft not found');
    }
    return context;
  }
  throw new Error(`Unknown tool: ${name}`);
}

function toolList() {
  return [
    {
      name: 'login',
      description: 'Authenticate with a local JLPT username and password. Returns a bearer token for other tools.',
      inputSchema: {
        type: 'object',
        properties: { username: { type: 'string' }, password: { type: 'string' } },
        required: ['username', 'password'],
      },
    },
    tokenTool('get_review_data', 'Read seed JLPT resource data from JSON through the backend.'),
    tokenTool('get_study_record', 'Read the full personalized study record from SQLite plus JSON resources.'),
    tokenTool('list_due_reviews', 'List items whose nextReviewAt is due or overdue.', { at: { type: 'string' } }),
    tokenTool('analyze_weak_points', 'Analyze wrong answers, learning items, due items, and mastery totals.'),
    tokenTool('generate_daily_review_pack', 'Create a personalized daily review-pack draft that the user can preview and annotate.', { title: { type: 'string' }, minutes: { type: 'number' } }),
    tokenTool('create_review_pack_draft', 'Save generated review-pack content as a draft for in-app preview.', { title: { type: 'string' }, content: { type: 'object' } }, ['token', 'title', 'content']),
    tokenTool('list_review_pack_drafts', 'List saved review-pack drafts for the authenticated user.'),
    tokenTool('get_review_pack_draft', 'Read one review-pack draft with user annotations.', { draft_id: { type: 'string' } }, ['token', 'draft_id']),
    tokenTool('add_draft_annotation', 'Attach a user or agent annotation to a draft.', { draft_id: { type: 'string' }, body: { type: 'string' } }, ['token', 'draft_id', 'body']),
    tokenTool('get_draft_revision_context', 'Read a draft, its annotations, study record, and an optimization prompt for the next revision.', { draft_id: { type: 'string' } }, ['token', 'draft_id']),
  ];
}

function tokenTool(name, description, extraProperties = {}, required = ['token']) {
  return {
    name,
    description,
    inputSchema: {
      type: 'object',
      properties: { token: { type: 'string' }, ...extraProperties },
      required,
    },
  };
}

function respond(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);
}

function respondError(id, code, message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })}\n`);
}
