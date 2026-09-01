import { ArrowRight, BookOpen, Brain, CalendarDays, Check, CircleDot, Cloud, FileCheck2, Sparkles } from 'lucide-react';
import { localDateString, tasksForDate } from '../../domain/studyPlan';
import type { AppView, DailyPracticeSummary, Locale, StudyPlanDocument, StudyPlanTaskStatus } from '../../types';

type Countdown = { days: number; hours: number; minutes: number };
type HomeMetric = { label: string; value: string };
type HomeModule = { view: AppView; title: string; body: string; count: number };

export function HomeDashboard({ locale, countdown, metrics, plan, dailyPractice, dailyPractices, onNavigate, onStartDailyPractice, onStartMemoryReview, onTaskStatus }: {
  labels: Record<string, string>; locale: Locale; countdown: Countdown; metrics: HomeMetric[]; modules: HomeModule[];
  plan: StudyPlanDocument; dailyPractice?: DailyPracticeSummary | null; dailyPractices: DailyPracticeSummary[];
  onNavigate: (view: AppView) => void; onStartDailyPractice: (id?: string) => void; onCreateDailyPractice: () => void;
  onStartMock: () => void; onStartMemoryReview: () => void; onTaskStatus: (id: string, status: StudyPlanTaskStatus) => void;
}) {
  const today = localDateString(new Date());
  const todayTasks = tasksForDate(plan.tasks, today);
  const completed = todayTasks.filter((task) => task.status === 'completed').length;
  const memoryCount = Math.max(Number(metrics[1]?.value ?? 0), 0);
  const practice = dailyPractice?.date === today ? dailyPractice : dailyPractices.find((entry) => entry.date === today) ?? null;
  const dateLabel = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date());
  const totalItems = memoryCount + todayTasks.length + (practice?.questionCount ?? 0);
  const totalMinutes = todayTasks.reduce((sum, task) => sum + task.minutes, 0) + Math.max(8, memoryCount) + (practice?.minutes ?? 0);

  return <div className="ledger-today">
    <header className="ledger-page-heading"><div><p>首页&nbsp; / &nbsp;今天</p><h1>{dateLabel}</h1></div><div className="ledger-sync-note"><Cloud size={17}/><span><strong>昨日整理</strong><small>学习记录已同步 · 06:00</small></span></div></header>
    <section className="ledger-day-strip"><div><CalendarDays size={18}/><strong>今天</strong><span>约 {totalMinutes} 分钟</span></div><div className="ledger-day-progress"><i style={{width: totalItems ? `${Math.round((completed / totalItems) * 100)}%` : '0%'}} /></div><p><b>{completed}</b> / {totalItems}<span>记忆卡 {memoryCount} · 待办 {todayTasks.length} · 练习 {practice?.questionCount ?? 0}</span></p></section>
    <div className="ledger-today-grid">
      <section className="ledger-section ledger-memory-entry"><header><span className="ledger-step">1</span><div><h2>记忆卡复习</h2><p>词汇与语法 · 到期 {memoryCount} 张</p></div><span className="ledger-count">{memoryCount}</span></header><button type="button" className="ledger-memory-preview" onClick={onStartMemoryReview}><div><span>今日卡组</span><h3>{memoryCount ? `${memoryCount} 张待复习` : '今天没有到期卡片'}</h3><p>单词正面 · 读音、释义、例句背面</p></div><span className="ledger-round-action"><BookOpen size={20}/></span></button><button type="button" className="ledger-text-action" onClick={onStartMemoryReview}>{memoryCount ? '进入专注复习' : '查看记忆库'}<ArrowRight size={16}/></button></section>
      <section className="ledger-section ledger-todos"><header><div><h2>今日待办</h2><p>教材计划</p></div><strong>{completed} / {todayTasks.length}</strong></header><div className="ledger-task-list">{todayTasks.length ? todayTasks.map((task) => { const done = task.status === 'completed'; return <label key={task.id} className={done ? 'is-done' : ''}><button type="button" aria-label={done ? '设为未完成' : '完成任务'} onClick={() => onTaskStatus(task.id, done ? 'pending' : 'completed')}><Check size={15}/></button><span><strong>{task.title}</strong><small>{task.sourceLabel || task.module} · {task.minutes} 分钟</small></span></label>; }) : <div className="ledger-empty"><CircleDot size={22}/><p>今天没有教材任务</p></div>}</div><button type="button" className="ledger-text-action" onClick={() => onNavigate('plan')}>查看完整计划<ArrowRight size={16}/></button></section>
      <section className="ledger-section ledger-agent-practice"><header><span className="ledger-step is-outline">2</span><div><h2>针对题目练习</h2><p>外部 Agent 通过 MCP 写回</p></div>{practice ? <span className="ledger-status">已接收</span> : <span className="ledger-status is-waiting">等待中</span>}</header>{practice ? <><div className="ledger-practice-summary"><Sparkles size={22}/><div><h3>{practice.title}</h3><p>{practice.questionCount} 题 · {practice.minutes} 分钟</p></div></div><dl><div><dt>依据</dt><dd>{practice.strategy || '近期学习记录与错题'}</dd></div><div><dt>同步</dt><dd>Agent 已通过 MCP 写回</dd></div></dl><button type="button" className="ledger-primary-button" onClick={() => onStartDailyPractice(practice.id)}>查看练习<ArrowRight size={17}/></button></> : <div className="ledger-agent-empty"><Brain size={30}/><h3>等待今日练习</h3><p>应用不会自行生成题目；外部 Agent 读取昨日记录后写回。</p><button type="button" onClick={() => onNavigate('insights')}>查看 Agent 同步</button></div>}</section>
    </div>
    <footer className="ledger-exam-footer"><FileCheck2 size={17}/><span>目标 JLPT N1</span><strong>{countdown.days} 天后考试</strong></footer>
  </div>;
}
