import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Code2,
  Copy,
  Database,
  FileText,
  Headphones,
  Inbox,
  ListChecks,
  MessageSquarePlus,
  NotebookPen,
  PlayCircle,
  PlugZap,
  RefreshCcw,
  ShieldCheck,
  UserRound,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AuthUser } from '../../types';
import { apiRequest } from '../../lib/api';

type AboutSection = 'setup' | 'tools' | 'implementation';

type McpHealth = {
  ok: boolean;
  checkedAt: string;
  databaseReady: boolean;
  reviewDataReady: boolean;
  mcp?: {
    serverReady: boolean;
    codexConfigReady: boolean;
    configScope: 'project' | 'user' | 'none';
    commandReady: boolean;
    lastSeenAt: string | null;
    lastMethod: string | null;
    lastTool: string | null;
  };
};

export function AboutPanel({
  labels,
  user,
  activeSection,
  onOpen,
  onBack,
}: {
  labels: Record<string, string>;
  user: AuthUser;
  activeSection?: string;
  onOpen: (section: AboutSection) => void;
  onBack: () => void;
}) {
  const section = isAboutSection(activeSection) ? activeSection : undefined;
  const [health, setHealth] = useState<McpHealth | null>(null);
  const [healthError, setHealthError] = useState('');

  async function refreshHealth() {
    try {
      setHealthError('');
      setHealth(await apiRequest<McpHealth>('/api/health'));
    } catch (error) {
      setHealth(null);
      setHealthError(error instanceof Error ? error.message : 'Health check failed');
    }
  }

  useEffect(() => {
    refreshHealth();
    const timer = window.setInterval(refreshHealth, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  if (section === 'setup') {
    return <AboutFrame title="配置 MCP" onBack={onBack}><SetupGuide /></AboutFrame>;
  }
  if (section === 'tools') {
    return <AboutFrame title="按业务使用 MCP" onBack={onBack}><McpBusinessGuide /></AboutFrame>;
  }
  if (section === 'implementation') {
    return <AboutFrame title={labels.mcpImplementationTitle} onBack={onBack}><ImplementationGuide labels={labels} health={health} /></AboutFrame>;
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-[#d7dfd6] bg-white shadow-sm">
      <div className="grid min-w-0 gap-0 border-b border-[#e1e7df] lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <article className="min-w-0 p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#856033]">{labels.aboutTitle}</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#27312c]">{labels.mcpTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-[#5f625b]">{labels.aboutBody}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => onOpen('setup')} className="rounded-md bg-[#173d35] px-4 py-2 text-sm font-semibold text-white">配置步骤</button>
            <button type="button" onClick={() => onOpen('tools')} className="rounded-md border border-[#cbd6cf] bg-white px-4 py-2 text-sm font-semibold text-[#24473f]">业务工具</button>
            <button type="button" onClick={() => onOpen('implementation')} className="rounded-md border border-[#cbd6cf] bg-white px-4 py-2 text-sm font-semibold text-[#24473f]">实现说明</button>
          </div>
        </article>
        <article className="min-w-0 border-t border-[#e1e7df] bg-[#f8faf5] p-5 md:p-6 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2 text-[#173d35]">
            <PlugZap size={20} />
            <h3 className="text-lg font-semibold">入口和状态检查</h3>
          </div>
          <p className="mt-3 text-sm leading-7 text-[#4f5b55]">这里先确认本地后台、登录态、Codex 配置和 MCP 最近连接记录。详细工具说明拆到二级页面。</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <StatusTile icon={Database} title="本地后台" state={health?.ok && health.databaseReady ? 'ok' : healthError ? 'bad' : 'checking'} detail={healthError || (health?.databaseReady ? 'SQLite 本地数据已就绪' : '正在检查')} />
            <StatusTile icon={UserRound} title="网页登录" state="ok" detail={`当前账号：${user.username}`} />
            <StatusTile icon={Code2} title="Codex 配置" state={health?.mcp?.codexConfigReady ? 'ok' : health ? 'bad' : 'checking'} detail={health?.mcp?.codexConfigReady ? `已发现 jlpt_review ${health.mcp.configScope === 'project' ? '项目级' : '用户级'}配置` : '运行 npm run mcp:setup 后重新检查'} />
            <StatusTile icon={PlugZap} title="MCP 连接" state={health?.mcp?.lastSeenAt ? 'ok' : health ? 'warn' : 'checking'} detail={mcpLastSeenText(health)} />
          </div>
          <button type="button" onClick={refreshHealth} className="mt-4 inline-flex items-center gap-2 rounded-md border border-[#cbd6cf] bg-white px-3 py-2 text-sm font-semibold text-[#24473f]">
            <RefreshCcw size={16} /> 重新检查
          </button>
        </article>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-3 md:p-6">
        <EntryLink icon={ShieldCheck} title="配置 MCP" body="路径、依赖、config.toml 和验证顺序。" onClick={() => onOpen('setup')} />
        <EntryLink icon={ListChecks} title="按业务使用 MCP" body="认证、读取资料、生成计划、草稿迭代。" onClick={() => onOpen('tools')} />
        <EntryLink icon={BookOpenText} title="实现边界" body="STDIO server、SQLite、草稿和题库读写边界。" onClick={() => onOpen('implementation')} />
      </div>

      <footer className="border-t border-[#e1e7df] bg-[#fbfcf8] p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-lg font-semibold">{labels.workflowTitle}</h2>
            <p className="mt-2 text-sm leading-7 text-[#5f625b]">{labels.workflowCapture} {labels.workflowGenerate} {labels.workflowPractice} {labels.workflowExport}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <a className="rounded-md bg-[#173d35] px-4 py-2 text-sm font-semibold text-white" href="https://github.com/erzhiqianyi/jlpt-master-deck" target="_blank" rel="noreferrer">GitHub</a>
            <a className="rounded-md border border-[#cbd6cf] bg-white px-4 py-2 text-sm font-semibold text-[#24473f]" href="https://github.com/erzhiqianyi/jlpt-master-deck/blob/main/README.md" target="_blank" rel="noreferrer">README</a>
          </div>
        </div>
      </footer>
    </section>
  );
}

function AboutFrame({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-lg border border-[#d7dfd6] bg-white shadow-sm">
      <header className="flex flex-col gap-3 border-b border-[#e1e7df] bg-[#fbfcf8] p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#856033]">MCP</p>
          <h2 className="mt-1 text-2xl font-semibold text-[#27312c]">{title}</h2>
        </div>
        <button type="button" onClick={onBack} className="inline-flex w-fit items-center gap-2 rounded-md border border-[#cbd6cf] bg-white px-3 py-2 text-sm font-semibold text-[#24473f]">
          <ArrowLeft size={16} /> 返回入口
        </button>
      </header>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}

function SetupGuide() {
  const setupSteps = [
    { title: '运行配置命令', body: '在当前项目目录执行 npm run mcp:setup。脚本会写入项目级 .codex/config.toml，并验证 MCP server 可以启动。', icon: Code2 },
    { title: '重启并信任项目', body: '重新打开 Codex 项目。第一次加载项目级配置时，按提示信任这个项目。', icon: PlayCircle },
    { title: '验证并登录', body: '在 Codex 输入 /mcp，确认 jlpt_review 和工具列表出现。之后先调用 login。', icon: CheckCircle2 },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.42fr)]">
      <ol className="min-w-0 divide-y divide-[#e1e7df] rounded-lg border border-[#d7dfd6] bg-white">
        {setupSteps.map((item, index) => {
          const Icon = item.icon;
          return (
            <li key={item.title} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#173d35] text-sm font-semibold text-white">{index + 1}</div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Icon size={16} className="shrink-0 text-[#31564c]" />
                  <h3 className="text-sm font-semibold text-[#27312c]">{item.title}</h3>
                </div>
                <p className="mt-1 text-sm leading-6 text-[#5f625b]">{item.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <aside className="min-w-0 space-y-4">
        <section className="rounded-lg border border-[#d7dfd6] bg-[#fbfcf8] p-4">
          <h3 className="text-base font-semibold">一条命令配置</h3>
          <pre className="mt-3 overflow-auto rounded-md bg-[#1f2522] p-4 text-sm leading-6 text-[#f5f7f3]">npm run mcp:setup</pre>
          <div className="mt-3 space-y-2 text-xs leading-5 text-[#5f625b]">
            <p>写入：<code>.codex/config.toml</code></p>
            <p>配置：<code>jlpt_review</code></p>
            <p>保留：文件里已有的其他项目配置</p>
          </div>
        </section>
        <section className="rounded-lg border border-[#d7dfd6] bg-white p-4 text-sm leading-6 text-[#5f625b]">
          <h3 className="text-base font-semibold text-[#27312c]">验证顺序</h3>
          <p className="mt-3">1. 配置命令输出 <code>Verified MCP server: jlpt_review</code>。</p>
          <p>2. Codex 重启后 <code>/mcp</code> 能看到 <code>jlpt_review</code>。</p>
          <p>3. 网页能用本地账号登录。</p>
          <p>4. MCP 先调用 <code>login</code>，再调用其他工具。</p>
        </section>
      </aside>
    </div>
  );
}

function McpBusinessGuide() {
  const groups = useMemo<BusinessGroup[]>(() => [
    {
      title: '连接与认证',
      summary: '先让 Codex 取得本地账号的 token。没有 token 时，其他工具不能读取个人学习数据。',
      input: '本地账号名、密码',
      output: 'MCP token 和用户信息',
      icon: ShieldCheck,
      tools: [{ icon: ShieldCheck, name: 'login', body: '登录本地账号', input: 'username, password', output: 'token, user' }],
    },
    {
      title: '整理学习输入',
      summary: '读取或写入单词、句子、语法疑问、听力问题。',
      input: 'token、状态筛选、学习内容',
      output: '待整理记录列表或新建记录',
      icon: Inbox,
      tools: [
        { icon: Inbox, name: 'list_learning_captures', body: '查看待整理输入', input: 'token, status?', output: 'capture 列表' },
        { icon: MessageSquarePlus, name: 'create_learning_capture', body: '保存新的学习疑问', input: 'token, body, category, context?', output: '新建 capture' },
      ],
    },
    {
      title: '读取题库与学习记录',
      summary: '读取 SQLite 题库、个人答题、进度和听力题元数据。',
      input: 'token',
      output: '题库资料、个人学习记录、听力题信息',
      icon: Database,
      tools: [
        { icon: Database, name: 'get_review_data', body: '读取 SQLite 题库资料', input: 'token', output: 'items, questions, metadata' },
        { icon: Database, name: 'upsert_review_item', body: '写入文字类复习项目', input: 'token, item', output: '已保存 item' },
        { icon: Database, name: 'export_review_data_backup', body: '导出 JSON 备份', input: 'token', output: '月度备份文件' },
        { icon: BookOpenText, name: 'get_study_record', body: '读取个人学习全量记录', input: 'token', output: '进度、答题、草稿、计划汇总' },
        { icon: Headphones, name: 'list_listening_questions', body: '读取听力题元数据', input: 'token', output: '听力题信息，音频仍留本地' },
      ],
    },
    {
      title: '生成与更新学习计划',
      summary: '读取备考目标、近期练习和薄弱点，然后保存日历式计划。',
      input: 'token、计划任务 tasks[]',
      output: '计划上下文或更新后的 study plan',
      icon: CalendarDays,
      tools: [
        { icon: CalendarDays, name: 'get_study_plan', body: '读取当前备考计划', input: 'token', output: '目标级别、材料、日程任务' },
        { icon: NotebookPen, name: 'get_plan_generation_context', body: '准备生成计划的上下文', input: 'token', output: 'profile、近期练习、弱点、每日记录' },
        { icon: ListChecks, name: 'save_generated_study_plan', body: '保存 agent 生成计划', input: 'token, tasks[]', output: '更新后的 study plan' },
      ],
    },
    {
      title: '判断今日复习重点',
      summary: '先看哪些内容到期、哪些类型错得多，再生成复习包。',
      input: 'token、可选时间 at',
      output: '到期项目和薄弱点统计',
      icon: BarChart3,
      tools: [
        { icon: RefreshCcw, name: 'list_due_reviews', body: '列出到期复习项', input: 'token, at?', output: 'due / overdue items' },
        { icon: BarChart3, name: 'analyze_weak_points', body: '分析薄弱点', input: 'token', output: '错题、待学、到期、掌握统计' },
      ],
    },
    {
      title: '生成、批注和迭代复习草稿',
      summary: '生成内容先进草稿页，预览和批注后再进入下一轮优化。',
      input: 'token、草稿标题、内容、draft_id、批注',
      output: 'draft、annotations、revision context',
      icon: ClipboardList,
      tools: [
        { icon: ClipboardList, name: 'generate_daily_review_pack', body: '生成今日复习草稿', input: 'token, title?, minutes?', output: '可预览的 draft' },
        { icon: ListChecks, name: 'publish_draft_as_daily_practice', body: '把已确认草稿发布为今日整套练习', input: 'token, draft_id, date?', output: '可连续作答的 daily practice' },
        { icon: FileText, name: 'create_review_pack_draft', body: '保存 agent 已生成内容', input: 'token, title, content', output: 'draft' },
        { icon: ClipboardList, name: 'list_review_pack_drafts', body: '列出草稿', input: 'token', output: 'draft summaries' },
        { icon: FileText, name: 'get_review_pack_draft', body: '读取单个草稿和批注', input: 'token, draft_id', output: 'draft + annotations' },
        { icon: MessageSquarePlus, name: 'add_draft_annotation', body: '给草稿追加批注', input: 'token, draft_id, body', output: '更新后的 draft' },
        { icon: RefreshCcw, name: 'get_draft_revision_context', body: '读取下一版上下文', input: 'token, draft_id', output: '草稿、批注、学习记录、优化提示' },
      ],
    },
  ], []);

  return (
    <div className="space-y-4">
      <GrammarCaptureWalkthrough />
      <div className="space-y-3">
        {groups.map((group) => <BusinessGroupBlock key={group.title} group={group} />)}
      </div>
    </div>
  );
}

function GrammarCaptureWalkthrough() {
  const articles: PracticalArticle[] = [
    {
      id: 'grammar-chat-to-review',
      title: '两道语法题讲解后，怎么整理技巧并入库复习',
      category: '语法复盘',
      summary: '把聊天里的题目、误选和讲解整理成 capture，再生成可批注复习草稿。',
      prompt: '请使用 jlpt_review MCP 登录我的本地账号。刚才聊天里讲过两道语法题，请把原题、我的误选、正确答案、解释摘要保存成 grammar capture；然后总结这类题的考场判断技巧，生成一个复习草稿，包含同类题辨析、错误选项排除法和 4 道改写练习。先保存为草稿，不要直接改正式题库 JSON。',
      sections: [
        {
          question: '刚刚在聊天里讲过两道语法题，第一步要怎么说？',
          instruction: '请使用 jlpt_review MCP 登录我的本地账号，把刚才两道语法题保存为 grammar capture。每题保留题干、选项、我的误选、正确答案和讲解摘要。',
          action: '把聊天内容保存为待整理输入。',
          result: '两条待整理学习输入会进入本地账号的 capture 列表，之后可以在数据管理的记录页查看。',
          note: '这里保存的是学习素材，不是正式题库；先不要要求 Codex 直接修改月度 JSON。',
          tools: ['login', 'create_learning_capture'],
        },
        {
          question: '如果题目在前面的聊天里，Codex 应该抓哪些信息？',
          instruction: '请从上面的聊天上下文提取原题、空格前后文、四个选项、我的误选、正确答案和最终确认的考点；缺失字段请标记为“待补充”。',
          action: '把题目补成可复盘记录。',
          result: 'capture 的 body 会变成可复盘材料，不只是零散截图或一句“这题错了”。',
          note: '如果原题不完整，先让 Codex 标记缺失字段，不要凭空补成确定题目。',
          tools: ['create_learning_capture'],
        },
        {
          question: '怎么让它总结同类题目的答题技巧？',
          instruction: '请对比这两道语法题的共同考点，按“接续形式、语气强弱、前后文线索、固定搭配、错误选项排除法”总结考场判断技巧。',
          action: '把讲解压缩成答题方法。',
          result: '产出应该是“考场判断法”，例如先看接续，再看语气，再排除和后文逻辑不合的选项。',
          note: '不要只写语法条目的百科解释；复习时真正有用的是判断顺序和排除理由。',
          tools: ['list_learning_captures', 'get_review_data'],
        },
        {
          question: '总结完以后，怎么更新到我的数据库？',
          instruction: '请把技巧总结、两道原题、同类辨析和 4 道改写练习保存成一个 review pack draft，标题用“语法题复盘：同类判断技巧”。',
          action: '保存为可预览草稿。',
          result: '草稿会写入本地 SQLite 的 review_pack_drafts，网页的数据管理 > 草稿里可以预览。',
          note: '正式题库资源和个人复习草稿是两层数据；草稿确认无误后，再决定是否整理进正式题库资料。',
          tools: ['create_review_pack_draft'],
        },
        {
          question: '草稿不满意时，具体怎么改？',
          instruction: '请读取这个草稿的 revision context，并根据我的批注重写下一版：技巧要按判断顺序拆开，练习题要有更像 JLPT 的干扰项。',
          action: '按批注生成下一版。',
          result: 'Codex 会拿到草稿、你的批注和学习记录，再生成下一版内容。',
          note: '批注越像审稿意见，下一版越稳定；不要只写“再优化一下”。',
          tools: ['add_draft_annotation', 'get_draft_revision_context'],
        },
        {
          question: '后面我要复习和记忆，怎么调出来？',
          instruction: '请读取我今天到期的复习项和语法弱点，基于这篇语法复盘草稿生成一个 20 分钟 review pack。',
          action: '按到期和弱点生成练习。',
          result: '当天练习会优先覆盖这类语法题的弱点，而不是随机翻旧聊天。',
          note: '个人复习进度留在浏览器/SQLite 记录里，seed data 不写具体复习间隔。',
          tools: ['list_due_reviews', 'analyze_weak_points', 'generate_daily_review_pack'],
        },
      ],
    },
  ];
  const [activeArticleId, setActiveArticleId] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const activeArticle = articles.find((article) => article.id === activeArticleId);

  async function copyText(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((current) => current === key ? '' : current), 1400);
  }

  return (
    <section className="rounded-lg border border-[#d7dfd6] bg-[#fbfcf8] p-4 md:p-5">
      {!activeArticle ? (
        <div className="min-w-0">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#856033]">操作演示</p>
              <h3 className="mt-1 text-lg font-semibold text-[#27312c]">实用技巧文章</h3>
              <p className="mt-2 text-sm leading-6 text-[#5f625b]">先选一篇文章，再进入具体操作。后续可以继续添加更多学习场景。</p>
            </div>
            <p className="text-xs font-semibold text-[#5f625b]">{articles.length} 篇</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {articles.map((article) => (
              <button
                type="button"
                key={article.id}
                onClick={() => setActiveArticleId(article.id)}
                className="group flex min-w-0 items-start gap-3 rounded-md border border-[#d7dfd6] bg-white p-4 text-left hover:border-[#9cb4a8] hover:bg-[#f8faf5]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f0f5ef] text-[#31564c]"><BookOpenText size={20} /></span>
                <span className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-[#856033]">{article.category}</span>
                  <span className="mt-1 block text-base font-semibold leading-6 text-[#27312c]">{article.title}</span>
                  <span className="mt-2 block text-sm leading-6 text-[#5f625b]">{article.summary}</span>
                  <span className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#31564c]">
                    查看具体操作 <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <article className="min-w-0">
          <button type="button" onClick={() => setActiveArticleId('')} className="inline-flex items-center gap-2 rounded-md border border-[#cbd6cf] bg-white px-3 py-2 text-sm font-semibold text-[#24473f]">
            <ArrowLeft size={16} /> 返回文章列表
          </button>
          <div className="mt-4 rounded-md border border-[#d7dfd6] bg-white p-4">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.38fr)]">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#856033]">{activeArticle.category}</p>
                <h3 className="mt-1 text-lg font-semibold text-[#27312c]">{activeArticle.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5f625b]">{activeArticle.summary}</p>
                <ArticleProcessFlow />
                <div className="mt-4 grid gap-3">
                  {activeArticle.sections.map((item, index) => (
                    <OperationStep
                      key={item.question}
                      item={item}
                      index={index}
                      copied={copiedKey === `${activeArticle.id}-${index}`}
                      onCopy={() => copyText(`${activeArticle.id}-${index}`, item.instruction)}
                    />
                  ))}
                </div>
              </div>
              <aside className="min-w-0 rounded-md border border-[#d7dfd6] bg-[#fbfcf8] p-4">
                <h4 className="text-sm font-semibold text-[#27312c]">整篇文章的一次性指令</h4>
                <p className="mt-3 rounded-md bg-[#1f2522] p-4 text-sm leading-6 text-[#f5f7f3]">{activeArticle.prompt}</p>
                <button type="button" onClick={() => copyText(`${activeArticle.id}-full`, activeArticle.prompt)} className="mt-3 inline-flex items-center gap-2 rounded-md border border-[#cbd6cf] bg-white px-3 py-2 text-xs font-semibold text-[#24473f]">
                  <Copy size={14} /> {copiedKey === `${activeArticle.id}-full` ? '已复制' : '复制整篇指令'}
                </button>
                <div className="mt-4 space-y-2 text-xs leading-5 text-[#5f625b]">
                  <p><span className="font-semibold text-[#27312c]">输入来源：</span>聊天里的题目、选项、讲解、你的错误点。</p>
                  <p><span className="font-semibold text-[#27312c]">中间产物：</span>待整理 capture 和可批注 draft。</p>
                  <p><span className="font-semibold text-[#27312c]">复习入口：</span>草稿确认后，后续由到期复习和弱点分析抽取。</p>
                </div>
              </aside>
            </div>
          </div>
        </article>
      )}
    </section>
  );
}

function ArticleProcessFlow() {
  const flow = [
    { icon: Inbox, title: '保存输入', body: 'capture' },
    { icon: ListChecks, title: '提炼技巧', body: '判断法' },
    { icon: ClipboardList, title: '生成草稿', body: 'draft' },
    { icon: MessageSquarePlus, title: '批注迭代', body: 'revision' },
    { icon: RefreshCcw, title: '进入复习', body: 'review pack' },
  ];

  return (
    <div className="mt-4 grid gap-2 md:grid-cols-5">
      {flow.map((step, index) => {
        const Icon = step.icon;
        return (
          <div key={step.title} className="relative min-w-0 rounded-md border border-[#d7dfd6] bg-[#fbfcf8] p-3">
            <Icon size={18} className="text-[#31564c]" />
            <p className="mt-2 text-xs font-semibold text-[#27312c]">{step.title}</p>
            <p className="mt-1 break-words text-[11px] leading-4 text-[#5f625b]">{step.body}</p>
            {index < flow.length - 1 ? <ArrowRight size={14} className="absolute right-2 top-3 hidden text-[#7a807b] md:block" /> : null}
          </div>
        );
      })}
    </div>
  );
}

function OperationStep({ item, index, copied, onCopy }: { item: WalkthroughFaq; index: number; copied: boolean; onCopy: () => void }) {
  return (
    <section className="min-w-0 rounded-md border border-[#d7dfd6] bg-[#fbfcf8] p-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#173d35] text-sm font-semibold text-white">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-[#27312c]">{item.question}</h4>
          <p className="mt-1 text-xs leading-5 text-[#5f625b]">{item.action}</p>
        </div>
      </div>
      <div className="mt-3 rounded-md border border-[#d7dfd6] bg-white p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#856033]">可复制说明</p>
            <p className="mt-1 text-sm leading-6 text-[#27312c]">{item.instruction}</p>
          </div>
          <button type="button" onClick={onCopy} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-[#cbd6cf] bg-white px-3 py-2 text-xs font-semibold text-[#24473f]">
            <Copy size={14} /> {copied ? '已复制' : '复制'}
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <ToolIO label="结果" value={item.result} />
        <ToolIO label="注意" value={item.note} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {item.tools.map((tool, toolIndex) => (
          <div key={tool} className="flex items-center gap-2">
            {toolIndex > 0 ? <ArrowRight size={13} className="text-[#7a807b]" /> : null}
            <code className="rounded-md border border-[#d7dfd6] bg-white px-2 py-1 text-xs font-semibold text-[#173d35]">{tool}</code>
          </div>
        ))}
      </div>
    </section>
  );
}

function BusinessGroupBlock({ group }: { group: BusinessGroup }) {
  const Icon = group.icon;
  return (
    <details className="rounded-lg border border-[#d7dfd6] bg-white">
      <summary className="cursor-pointer list-none p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,0.75fr)_minmax(0,1fr)] md:items-start">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f0f5ef] text-[#31564c]"><Icon size={20} /></span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-[#27312c]">{group.title}</h3>
              <p className="mt-1 text-xs leading-5 text-[#5f625b]">{group.tools.length} 个工具</p>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm leading-6 text-[#4f5b55]">{group.summary}</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <ToolIO label="业务输入" value={group.input} />
              <ToolIO label="业务输出" value={group.output} />
            </div>
          </div>
        </div>
      </summary>
      <div className="border-t border-[#e1e7df] bg-[#fbfcf8] p-3">
        <ToolRows tools={group.tools} />
      </div>
    </details>
  );
}

function ImplementationGuide({ labels, health }: { labels: Record<string, string>; health: McpHealth | null }) {
  const implementation = [labels.mcpImplementationServer, labels.mcpImplementationStorage, labels.mcpImplementationAuth, labels.mcpImplementationDraft];
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.42fr)]">
      <div className="grid gap-3 md:grid-cols-2">
        {implementation.map((item) => <p key={item} className="border-l-2 border-[#6f947c] bg-[#fbfcf8] py-2 pl-3 pr-2 text-sm leading-6 text-[#4f5b55]">{item}</p>)}
      </div>
      <aside className="rounded-lg border border-[#d7dfd6] bg-white p-4">
        <h3 className="text-base font-semibold">{labels.mcpPromptTitle}</h3>
        <p className="mt-3 rounded-md border border-[#d7dfd6] bg-[#f5f7f3] p-3 text-sm leading-6 text-[#4f5b55]">{labels.mcpPromptExample}</p>
        <dl className="mt-4 space-y-3 text-xs leading-5 text-[#5f625b]">
          <div><dt className="font-semibold text-[#27312c]">资料位置</dt><dd><code>.local/jlpt.sqlite</code> / <code>public/data/review-data</code> 备份</dd></div>
          <div><dt className="font-semibold text-[#27312c]">Codex 配置</dt><dd><code>.codex/config.toml</code>（{health?.mcp?.configScope === 'project' ? '已就绪' : '未确认'}）</dd></div>
        </dl>
      </aside>
    </div>
  );
}

function EntryLink({ icon: Icon, title, body, onClick }: { icon: LucideIcon; title: string; body: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="min-w-0 rounded-lg border border-[#d7dfd6] bg-[#fbfcf8] p-4 text-left hover:border-[#9cb4a8]">
      <Icon size={20} className="text-[#31564c]" />
      <h3 className="mt-3 text-base font-semibold text-[#27312c]">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-[#5f625b]">{body}</p>
    </button>
  );
}

function StatusTile({ icon: Icon, title, state, detail }: { icon: LucideIcon; title: string; state: 'ok' | 'bad' | 'warn' | 'checking'; detail: string }) {
  const tone = state === 'ok' ? 'text-[#286246]' : state === 'bad' ? 'text-[#a63c3c]' : state === 'warn' ? 'text-[#8a671c]' : 'text-[#5f625b]';
  const StatusIcon = state === 'bad' ? XCircle : state === 'checking' ? RefreshCcw : CheckCircle2;
  return (
    <div className="min-w-0 rounded-lg border border-[#d7dfd6] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon size={18} className="shrink-0 text-[#31564c]" />
          <h4 className="truncate text-sm font-semibold text-[#27312c]">{title}</h4>
        </div>
        <StatusIcon size={18} className={`shrink-0 ${tone}`} />
      </div>
      <p className="mt-2 break-words text-xs leading-5 text-[#5f625b]">{detail}</p>
    </div>
  );
}

function ToolRows({ tools }: { tools: ToolItem[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-[#e1e7df] bg-white">
      <div className="hidden grid-cols-[minmax(220px,1fr)_minmax(150px,0.7fr)_minmax(170px,0.8fr)] gap-3 bg-[#f8faf5] px-4 py-2 text-xs font-semibold text-[#856033] md:grid">
        <span>功能</span>
        <span>输入</span>
        <span>输出</span>
      </div>
      <div className="divide-y divide-[#edf1eb]">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div key={tool.name} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(220px,1fr)_minmax(150px,0.7fr)_minmax(170px,0.8fr)]">
              <div className="flex min-w-0 gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f0f5ef] text-[#31564c]"><Icon size={18} /></span>
                <div className="min-w-0">
                  <code className="break-all text-sm font-semibold text-[#173d35]">{tool.name}</code>
                  <p className="mt-1 text-xs leading-5 text-[#5f625b]">{tool.body}</p>
                </div>
              </div>
              <ToolIO label="输入" value={tool.input} />
              <ToolIO label="输出" value={tool.output} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ToolIO({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-[#fbfcf8] px-3 py-2">
      <p className="text-[11px] font-semibold text-[#856033]">{label}</p>
      <p className="mt-1 break-words text-xs leading-5 text-[#4f5b55]">{value}</p>
    </div>
  );
}

function mcpLastSeenText(health: McpHealth | null) {
  if (!health) {
    return '正在检查';
  }
  if (!health.mcp) {
    return '需要重启本地后端以读取 MCP 状态。';
  }
  if (!health.mcp.lastSeenAt) {
    return '还没有本地 MCP 心跳记录；在 Codex /mcp 或调用工具后会更新。';
  }
  const method = health.mcp.lastTool ? `${health.mcp.lastMethod}:${health.mcp.lastTool}` : health.mcp.lastMethod;
  return `${method ?? 'MCP'} · ${new Date(health.mcp.lastSeenAt).toLocaleString()}`;
}

function isAboutSection(value?: string): value is AboutSection {
  return value === 'setup' || value === 'tools' || value === 'implementation';
}

type BusinessGroup = {
  title: string;
  summary: string;
  input: string;
  output: string;
  icon: LucideIcon;
  tools: ToolItem[];
};

type PracticalArticle = {
  id: string;
  title: string;
  category: string;
  summary: string;
  prompt: string;
  sections: WalkthroughFaq[];
};

type WalkthroughFaq = {
  question: string;
  instruction: string;
  action: string;
  result: string;
  note: string;
  tools: string[];
};

type ToolItem = {
  icon: LucideIcon;
  name: string;
  body: string;
  input: string;
  output: string;
};
