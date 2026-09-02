import { ArrowLeft, BookOpen, CalendarDays, CheckCircle2, ChevronRight, ExternalLink, Headphones, LoaderCircle, Newspaper, ShieldCheck, Volume2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { apiRequest } from '../../lib/api';
import type { Locale, NewsCycleData, NewsCycleDay, NewsCycleModule, NewsCycleQuestion } from '../../types';

const moduleOrder: Array<NewsCycleModule | 'all'> = ['all', 'vocabulary', 'grammar', 'listening', 'reading'];
const copy = {
  'zh-CN': {
    title: 'N1 新闻练习', subtitle: '按星期整理的日本新闻练习草稿', notice: '个人学习 · 原新闻来源 · 尚未写入正式题库', loading: '正在读取新闻练习...', unavailable: '新闻练习暂时无法读取，请确认本地后端和个人知识库目录。', empty: '还没有可预览的新闻周期。', date: '日期', coverage: '题型覆盖', sources: '新闻源', questions: '题目', audio: '原音频', status: '状态', open: '查看详情', all: '全部', vocabulary: '文字・词汇', grammar: '语法', listening: '听力', reading: '阅读', draft: '待审校', playable: '可播放', needsReview: '待听检', back: '返回新闻列表', choose: '选择答案', submit: '确认答案', correct: '回答正确', answer: '正确答案', source: '查看新闻来源', rewritten: '阅读材料为学习用改写', personal: '来源内容仅供个人学习', noAudio: '这道听力题还没有经过验证的本地原音频。', timecode: '建议区间', questionList: '题目列表', cycle: '本周周期', days: '天', total: '题', audioReady: '题可播放原音频', reviewPending: '道听力题待听检', monday: '周一', tuesday: '周二', wednesday: '周三', thursday: '周四', friday: '周五', saturday: '周六', sunday: '周日',
  },
  ja: {
    title: 'N1 ニュース練習', subtitle: '曜日ごとに整理した日本ニュースの練習下書き', notice: '個人学習用・元ニュース出典・正式問題集には未登録', loading: 'ニュース練習を読み込んでいます...', unavailable: 'ニュース練習を読み込めません。', empty: 'プレビューできるニュース周期はありません。', date: '日付', coverage: '問題形式', sources: 'ニュース源', questions: '問題', audio: '元音声', status: '状態', open: '詳細を見る', all: 'すべて', vocabulary: '文字・語彙', grammar: '文法', listening: '聴解', reading: '読解', draft: '要確認', playable: '再生可', needsReview: '音声確認待ち', back: '一覧へ戻る', choose: '答えを選ぶ', submit: '答えを確認', correct: '正解', answer: '正解', source: 'ニュース出典', rewritten: '読解文は学習用に書き換え', personal: '個人学習用', noAudio: '確認済みのローカル元音声がありません。', timecode: '推奨区間', questionList: '問題一覧', cycle: '今週', days: '日', total: '問', audioReady: '問は元音声を再生可能', reviewPending: '問は音声確認待ち', monday: '月', tuesday: '火', wednesday: '水', thursday: '木', friday: '金', saturday: '土', sunday: '日',
  },
  en: {
    title: 'N1 News Practice', subtitle: 'Japanese news practice drafts organized by weekday', notice: 'Personal study · original sources · not in the formal question bank', loading: 'Loading news practice...', unavailable: 'News practice is unavailable. Check the local backend and personal knowledge directory.', empty: 'No news cycle is available.', date: 'Date', coverage: 'Coverage', sources: 'Sources', questions: 'Questions', audio: 'Original audio', status: 'Status', open: 'View details', all: 'All', vocabulary: 'Vocabulary', grammar: 'Grammar', listening: 'Listening', reading: 'Reading', draft: 'Needs review', playable: 'Playable', needsReview: 'Audio review', back: 'Back to news list', choose: 'Choose an answer', submit: 'Check answer', correct: 'Correct', answer: 'Answer', source: 'Open news source', rewritten: 'Reading passage rewritten for study', personal: 'For personal study', noAudio: 'No verified local original audio is available for this listening question.', timecode: 'Suggested segment', questionList: 'Question list', cycle: 'Weekly cycle', days: 'days', total: 'questions', audioReady: 'questions with original audio', reviewPending: 'listening questions need review', monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
  },
};

export function NewsCyclePanel({ locale, activeDate, onOpen, onBack }: { locale: Locale; activeDate?: string; onOpen: (date: string) => void; onBack: () => void }) {
  const t = copy[locale];
  const [data, setData] = useState<NewsCycleData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiRequest<NewsCycleData>('/api/local-news-cycle')
      .then((payload) => { if (!cancelled) setData(payload); })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : t.unavailable); });
    return () => { cancelled = true; };
  }, [t.unavailable]);

  if (error) return <EmptyState icon={<Newspaper size={32} />} title={t.unavailable} detail={error} />;
  if (!data) return <div className="flex min-h-72 items-center justify-center gap-3 text-sm font-semibold text-[#68716b]"><LoaderCircle className="animate-spin" size={20} />{t.loading}</div>;
  const activeDay = activeDate ? data.days.find((day) => day.date === activeDate) : undefined;
  if (activeDate && activeDay) return <NewsDayDetail locale={locale} day={activeDay} onBack={onBack} />;
  return <NewsDayCatalog locale={locale} data={data} onOpen={onOpen} />;
}

function NewsDayCatalog({ locale, data, onOpen }: { locale: Locale; data: NewsCycleData; onOpen: (date: string) => void }) {
  const t = copy[locale];
  if (!data.days.length) return <EmptyState icon={<Newspaper size={32} />} title={t.empty} />;
  const total = data.summary?.total_questions ?? data.days.reduce((sum, day) => sum + day.questionCount, 0);
  return <section className="overflow-hidden rounded-2xl border border-[#dccfc0] bg-[#fffdf8] shadow-sm">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e7ddd1] bg-[#fbf7ef] px-4 py-5 md:px-6">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a84269]">{t.cycle}</p><h1 className="mt-1 text-2xl font-black text-[#2f3934]">{t.title}</h1><p className="mt-1 text-sm text-[#68716b]">{t.subtitle}</p></div>
      <div className="inline-flex items-center gap-2 rounded-lg border border-[#e2c98a] bg-[#fff8df] px-3 py-2 text-xs font-semibold text-[#775516]"><ShieldCheck size={17} />{t.notice}</div>
    </header>
    <div className="grid grid-cols-2 border-b border-[#e7ddd1] bg-white md:grid-cols-4">
      <SummaryMetric label={t.cycle} value={`${data.days.length} ${t.days}`} />
      <SummaryMetric label={t.questions} value={`${total} ${t.total}`} />
      <SummaryMetric label={t.audio} value={`${data.summary?.direct_audio_question_count ?? data.days.reduce((sum, day) => sum + day.audioCount, 0)} ${t.audioReady}`} />
      <SummaryMetric label={t.needsReview} value={`${data.summary?.needs_audio_review_count ?? 0} ${t.reviewPending}`} />
    </div>
    <div className="mobile-list md:hidden">
      {data.days.map((day) => <MobileDayRow key={day.date} day={day} locale={locale} onOpen={onOpen} />)}
    </div>
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[780px] border-collapse text-left text-sm">
        <thead className="bg-[#f3f6f1] text-xs font-semibold text-[#5b665f]"><tr><th className="px-5 py-3">{t.date}</th><th className="px-4 py-3">{t.coverage}</th><th className="px-4 py-3">{t.sources}</th><th className="px-4 py-3">{t.questions}</th><th className="px-4 py-3">{t.audio}</th><th className="px-5 py-3 text-right"><span className="sr-only">{t.open}</span></th></tr></thead>
        <tbody className="divide-y divide-[#ece4d8]">{data.days.map((day) => <DayRow key={day.date} day={day} locale={locale} onOpen={onOpen} />)}</tbody>
      </table>
    </div>
  </section>;
}

function DayRow({ day, locale, onOpen }: { day: NewsCycleDay; locale: Locale; onOpen: (date: string) => void }) {
  const t = copy[locale];
  return <tr className="bg-white hover:bg-[#fbf8f2]"><td className="px-5 py-4"><button type="button" onClick={() => onOpen(day.date)} className="text-left"><span className="block text-xs font-bold text-[#a84269]">{weekday(day.date, t)}</span><strong className="mt-1 block text-base text-[#173d35]">{formatDate(day.date, locale)}</strong></button></td><td className="px-4 py-4"><ModulePills day={day} t={t} /></td><td className="px-4 py-4 font-semibold text-[#4d5751]">{day.sourceCount}</td><td className="px-4 py-4 font-semibold text-[#4d5751]">{day.questionCount}</td><td className="px-4 py-4"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${day.audioCount ? 'bg-[#eaf3ec] text-[#315f45]' : 'bg-[#f5eee5] text-[#7b6653]'}`}><Headphones size={14} />{day.audioCount}</span></td><td className="px-5 py-4 text-right"><button type="button" aria-label={`${t.open}: ${formatDate(day.date, locale)}`} onClick={() => onOpen(day.date)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#b9c9c1] bg-white text-[#24473f] hover:bg-[#f2f6f1]"><ChevronRight size={18} /></button></td></tr>;
}

function MobileDayRow({ day, locale, onOpen }: { day: NewsCycleDay; locale: Locale; onOpen: (date: string) => void }) {
  const t = copy[locale];
  return <button type="button" onClick={() => onOpen(day.date)} className="mobile-list-item mobile-list-link cute-focus"><span className="mobile-list-main"><span className="mobile-list-title">{weekday(day.date, t)} · {formatDate(day.date, locale)}</span><span className="mobile-list-subtitle">{day.sourceCount} {t.sources}</span></span><span className="mobile-list-tags"><span className="mobile-list-pill">{day.questionCount} {t.total}</span><span className="mobile-list-pill is-soft"><Headphones size={14} />{day.audioCount}</span></span><ChevronRight className="mobile-list-cue" size={18} /></button>;
}

function NewsDayDetail({ locale, day, onBack }: { locale: Locale; day: NewsCycleDay; onBack: () => void }) {
  const t = copy[locale];
  const [module, setModule] = useState<NewsCycleModule | 'all'>('all');
  const [activeId, setActiveId] = useState(day.questions[0]?.id ?? '');
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const filtered = useMemo(() => module === 'all' ? day.questions : day.questions.filter((question) => question.module === module), [day.questions, module]);
  const active = filtered.find((question) => question.id === activeId) ?? filtered[0];

  function selectModule(next: NewsCycleModule | 'all') { const questions = next === 'all' ? day.questions : day.questions.filter((item) => item.module === next); setModule(next); setActiveId(questions[0]?.id ?? ''); setSelected(null); setSubmitted(false); }
  function openQuestion(question: NewsCycleQuestion) { setActiveId(question.id); setSelected(null); setSubmitted(false); }

  return <section className="overflow-hidden rounded-2xl border border-[#dccfc0] bg-[#fffdf8] shadow-sm">
    <header className="flex flex-wrap items-center gap-3 border-b border-[#e7ddd1] bg-[#fbf7ef] px-4 py-4 md:px-6"><button type="button" onClick={onBack} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ead1dc] bg-white text-[#a84269] hover:bg-[#fff0f5]" aria-label={t.back}><ArrowLeft size={19} /></button><div className="min-w-0 flex-1"><p className="text-xs font-bold text-[#a84269]">{weekday(day.date, t)} · {t.title}</p><h1 className="truncate text-xl font-black text-[#2f3934]">{formatDate(day.date, locale)} · {day.questionCount} {t.total}</h1></div><div className="flex items-center gap-2 text-xs font-semibold text-[#68716b]"><Newspaper size={16} />{day.sourceCount} {t.sources}<span>·</span><Headphones size={16} />{day.audioCount} {t.playable}</div></header>
    <nav className="flex gap-2 overflow-x-auto border-b border-[#e7ddd1] bg-white px-4 py-3 md:px-6" aria-label={t.coverage}>{moduleOrder.map((value) => <button type="button" key={value} onClick={() => selectModule(value)} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold ${module === value ? 'border-[#31564c] bg-[#31564c] text-white' : 'border-[#cbd6cf] bg-white text-[#46514c] hover:bg-[#f2f6f1]'}`}>{t[value]} <span className="ml-1 opacity-75">{value === 'all' ? day.questionCount : day.moduleCounts[value]}</span></button>)}</nav>
    {active ? <div className="grid min-h-[620px] md:grid-cols-[17rem_minmax(0,1fr)]"><aside className="border-b border-[#e7ddd1] bg-[#fbfaf6] md:border-r md:border-b-0"><div className="border-b border-[#e7ddd1] px-4 py-3 text-xs font-bold text-[#68716b]">{t.questionList} · {filtered.length}</div><div className="flex max-h-[680px] overflow-x-auto md:block md:overflow-y-auto">{filtered.map((question, index) => <button type="button" key={question.id} onClick={() => openQuestion(question)} className={`grid min-w-[13rem] grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 border-r border-[#ece4d8] px-3 py-3 text-left md:w-full md:min-w-0 md:border-r-0 md:border-b ${question.id === active.id ? 'bg-[#edf4ef] shadow-[inset_3px_0_0_#31564c]' : 'bg-white hover:bg-[#fbf8f2]'}`}><span className="font-mono text-xs font-bold text-[#987986]">{String(index + 1).padStart(2, '0')}</span><span className="min-w-0"><strong className="block truncate text-sm text-[#34443c]">{question.official_type}</strong><small className="mt-1 block truncate text-xs text-[#7a6a70]">{question.source_id}</small></span>{question.audio?.previewUrl ? <Volume2 size={15} className="text-[#315f45]" /> : <BookOpen size={15} className="text-[#a84269]" />}</button>)}</div></aside><QuestionDetail key={active.id} question={active} locale={locale} selected={selected} submitted={submitted} onSelect={setSelected} onSubmit={() => setSubmitted(true)} /></div> : <EmptyState icon={<BookOpen size={30} />} title={t.empty} />}
  </section>;
}

function QuestionDetail({ question, locale, selected, submitted, onSelect, onSubmit }: { question: NewsCycleQuestion; locale: Locale; selected: number | null; submitted: boolean; onSelect: (index: number) => void; onSubmit: () => void }) {
  const t = copy[locale];
  return <article className="min-w-0 px-4 py-5 md:px-7 md:py-6"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="rounded bg-[#eaf3ec] px-2 py-1 text-xs font-bold text-[#315f45]">{t[question.module]}</span><strong className="text-sm text-[#46514c]">{question.official_type}</strong></div><span className="rounded-full bg-[#fff8df] px-2.5 py-1 text-xs font-semibold text-[#775516]">{question.verification_status.includes('audio') || question.verification_status.includes('listen') ? t.needsReview : t.draft}</span></div>
    {question.audio?.previewUrl ? <div className="mt-5 rounded-xl border border-[#e2c98a] bg-[#fff8df] p-3"><div className="mb-2 flex items-center justify-between text-xs font-semibold text-[#775516]"><span className="inline-flex items-center gap-2"><Headphones size={16} />{t.audio}</span><span>{t.timecode} {question.audio.timecode ?? '—'}</span></div><audio className="h-10 w-full" controls preload="metadata" src={question.audio.previewUrl} /></div> : question.module === 'listening' ? <div className="mt-5 rounded-lg border border-[#e4d8ca] bg-[#f7f3ed] px-3 py-2 text-xs font-semibold text-[#7b6653]">{t.noAudio}</div> : null}
    {question.passage ? <div className="mt-5 border-l-4 border-[#31564c] bg-[#f4f6f1] px-5 py-4 font-serif text-[15px] leading-8 text-[#2f3934]">{question.passage}</div> : null}
    <div className="mt-6"><p className="text-xs font-semibold leading-6 text-[#7a6a70]">{question.question ? question.prompt : question.official_type}</p><h2 className="mt-2 whitespace-pre-line font-serif text-xl font-bold leading-9 text-[#2f3934]"><HighlightedPrompt text={question.question ?? question.prompt} target={question.target} /></h2></div>
    <div className="mt-5 grid gap-3">{question.choices.map((choice, index) => { const correct = submitted && index === question.answerIndex; const wrong = submitted && selected === index && index !== question.answerIndex; return <button type="button" key={`${question.id}-${index}`} disabled={submitted} onClick={() => onSelect(index)} className={`grid min-h-14 grid-cols-[2rem_minmax(0,1fr)_1.25rem] items-center gap-3 rounded-lg border px-3 py-3 text-left ${correct ? 'border-[#5f8b68] bg-[#edf6ee] text-[#315f45]' : wrong ? 'border-[#b85c5c] bg-[#fff0f0] text-[#973f3f]' : selected === index ? 'border-[#a84269] bg-[#fff0f5] text-[#713047]' : 'border-[#d8d1c8] bg-white text-[#3d4742] hover:border-[#aebfb5] hover:bg-[#f7faf7]'}`}><span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-current text-xs font-bold">{index + 1}</span><strong className="text-sm leading-6">{choice}</strong>{correct ? <CheckCircle2 size={19} /> : null}</button>; })}</div>
    {submitted ? <div className={`mt-5 rounded-lg border-l-4 px-4 py-3 ${selected === question.answerIndex ? 'border-[#5f8b68] bg-[#edf6ee]' : 'border-[#b85c5c] bg-[#fff0f0]'}`}><strong className="text-sm text-[#34443c]">{selected === question.answerIndex ? t.correct : `${t.answer}: ${question.answerIndex + 1}`}</strong><p className="mt-1 text-sm leading-6 text-[#55615b]">{question.explanation_zh}</p>{question.composition_note ? <p className="mt-2 text-xs leading-5 text-[#775516]">{question.composition_note}</p> : null}</div> : null}
    <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#e7ddd1] pt-4"><div className="flex flex-wrap items-center gap-3"><a href={question.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[#a84269] hover:underline">{t.source}<ExternalLink size={14} /></a><span className="text-xs text-[#7a6a70]">{question.source_rewrite ? t.rewritten : t.personal}</span></div><button type="button" disabled={selected === null || submitted} onClick={onSubmit} className="rounded-full bg-[#31564c] px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{t.submit}</button></footer>
  </article>;
}

function HighlightedPrompt({ text, target }: { text: string; target?: string }) { if (!target || !text.includes(target)) return text; const parts = text.split(target); return parts.map((part, index) => <span key={`${part}-${index}`}>{part}{index < parts.length - 1 ? <mark className="mx-1 rounded-sm border-b-[3px] border-[#a84269] bg-[#fff0a8] px-1 font-black text-[#713047]">{target}</mark> : null}</span>); }
function ModulePills({ day, t }: { day: NewsCycleDay; t: Record<string, string> }) { return <div className="flex flex-wrap gap-1.5">{(['vocabulary', 'grammar', 'listening', 'reading'] as NewsCycleModule[]).map((module) => <span key={module} className="rounded-full bg-[#f2f6f1] px-2 py-1 text-xs font-semibold text-[#46514c]">{t[module]} {day.moduleCounts[module]}</span>)}</div>; }
function SummaryMetric({ label, value }: { label: string; value: string }) { return <div className="border-r border-b border-[#ece4d8] px-4 py-3 last:border-r-0 md:border-b-0"><span className="block text-xs font-semibold text-[#7a6a70]">{label}</span><strong className="mt-1 block text-base text-[#2f3934]">{value}</strong></div>; }
function EmptyState({ icon, title, detail }: { icon: ReactNode; title: string; detail?: string }) { return <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-2xl border border-[#dccfc0] bg-[#fffdf8] p-8 text-center text-[#68716b]">{icon}<strong className="text-base text-[#34443c]">{title}</strong>{detail ? <p className="max-w-xl text-sm">{detail}</p> : null}</div>; }
function formatDate(value: string, locale: Locale) { return new Intl.DateTimeFormat(locale === 'zh-CN' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en-US', { month: 'long', day: 'numeric' }).format(new Date(`${value}T00:00:00+09:00`)); }
function weekday(value: string, t: Record<string, string>) { return [t.sunday, t.monday, t.tuesday, t.wednesday, t.thursday, t.friday, t.saturday][new Date(`${value}T00:00:00+09:00`).getDay()]; }
