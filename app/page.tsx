'use client';

import { useEffect, useMemo, useState } from 'react';

type ReviewItem = {
  id: string;
  date: string;
  type: string;
  jlpt_level?: string;
  level_confidence?: string;
  original: string;
  normalized?: string;
  reading?: string;
  meaning_zh?: string;
  explanation_zh?: string;
  grammar_point?: string;
  tags?: string[];
  source_chat_summary?: string;
};

type Quiz = {
  id: string;
  type: string;
  prompt: string;
  choices?: string[];
  answer: string;
  explanation_zh?: string;
};

type DailyPack = {
  date: string;
  source_date: string;
  title: string;
  warmup?: { prompt: string; answer: string }[];
  focused_review?: { item_id: string; focus: string; explanation_zh: string }[];
  quiz?: Quiz[];
  weak_points?: string[];
  next_actions?: string[];
};

type ReviewData = {
  generated_at: string;
  items: ReviewItem[];
  daily_packs: DailyPack[];
};

const fallbackData: ReviewData = {
  generated_at: '2026-08-27T12:00:00+09:00',
  items: [
    {
      id: '2026-08-27-001',
      date: '2026-08-27',
      type: 'vocabulary',
      jlpt_level: 'N2/N1',
      level_confidence: 'medium',
      original: '測定',
      normalized: '測定',
      reading: 'そくてい',
      meaning_zh: '测定、测量',
      explanation_zh: '偏正式或技术语境，强调按照标准、工具或方法测量数值。',
      tags: ['漢語', '用語感'],
      source_chat_summary: '想确认「測定」的含义、读法和使用语感。',
    },
    {
      id: '2026-08-27-002',
      date: '2026-08-27',
      type: 'sentence',
      jlpt_level: 'unknown',
      original: '測定結果をもとに判断する。',
      reading: 'そくていけっかをもとにはんだんする。',
      meaning_zh: '根据测定结果进行判断。',
      explanation_zh: '「をもとに」表示“以……为依据”，常和资料、数据、结果搭配。',
      tags: ['表現', '根拠'],
      source_chat_summary: '需要把词放回句子里理解实际搭配。',
    },
  ],
  daily_packs: [
    {
      date: '2026-08-27',
      source_date: '2026-08-26',
      title: '8月27日 JLPT 復習',
      warmup: [
        { prompt: '「測定」の読み方と意味は？', answer: 'そくてい。测定、测量。' },
        { prompt: '「をもとに」は中文怎么理解？', answer: '以……为依据，根据……。' },
      ],
      focused_review: [
        {
          item_id: '2026-08-27-001',
          focus: '正式语感',
          explanation_zh: '「測定」比日常的「測る」更偏书面、技术、报告场景。',
        },
      ],
      quiz: [
        {
          id: 'quiz-001',
          type: 'multiple_choice',
          prompt: '「測定結果」に最も近い意味は？',
          choices: ['测量结果', '判断理由', '申请资料', '记忆方法'],
          answer: '测量结果',
          explanation_zh: '「測定」是测定，「結果」是结果。',
        },
      ],
      weak_points: ['漢語词的正式语感', '依据表达的句型搭配'],
      next_actions: ['用「測定」造 2 个句子', '复述「をもとに」和「によって」的差别'],
    },
  ],
};

const typeLabels: Record<string, string> = {
  vocabulary: '単語',
  grammar: '文法',
  sentence: '例文',
  reading: '読解',
  listening: '聴解',
  question: '問題',
};

export default function Home() {
  const [data, setData] = useState<ReviewData>(fallbackData);

  useEffect(() => {
    fetch('/data/review-data.json')
      .then((response) => (response.ok ? response.json() : fallbackData))
      .then((json) => setData(json))
      .catch(() => setData(fallbackData));
  }, []);

  const latestPack = data.daily_packs[0] ?? fallbackData.daily_packs[0];
  const stats = useMemo(() => {
    const byType = data.items.reduce<Record<string, number>>((acc, item) => {
      acc[item.type] = (acc[item.type] ?? 0) + 1;
      return acc;
    }, {});
    return {
      total: data.items.length,
      packs: data.daily_packs.length,
      byType,
    };
  }, [data.items, data.daily_packs]);

  return (
    <main className="min-h-screen bg-[#f7f3ec] text-[#20201d]">
      <section className="border-b border-[#ded5c7] bg-[#fffaf1]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] md:px-8 lg:px-10">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <p className="text-sm font-semibold text-[#9a4f2e]">Codex Skill + Static Review Site</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-normal md:text-6xl">
                JLPT 復習台帳
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#5c574f] md:text-lg">
                你在 Codex 聊天里丢单词、句子、文法疑问或完整题目；技能负责抽取结构化学习记录，网站只展示整理后的复习资料和每日题目。
              </p>
            </div>
            <div className="grid max-w-2xl grid-cols-3 gap-3">
              <Metric label="整理項目" value={stats.total.toString()} />
              <Metric label="復習包" value={stats.packs.toString()} />
              <Metric label="最新日付" value={latestPack.date.slice(5)} />
            </div>
          </div>

          <section className="rounded-lg border border-[#d8cdbc] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#42665a]">今日の復習</p>
            <h2 className="mt-2 text-2xl font-semibold">{latestPack.title}</h2>
            <p className="mt-1 text-sm text-[#6b655d]">来源：{latestPack.source_date} 的聊天整理内容</p>
            <div className="mt-5 space-y-3">
              {latestPack.warmup?.slice(0, 3).map((card) => (
                <details key={card.prompt} className="rounded-md border border-[#e6ded2] bg-[#fffaf4] p-4">
                  <summary className="cursor-pointer text-sm font-semibold">{card.prompt}</summary>
                  <p className="mt-3 text-sm leading-6 text-[#5c574f]">{card.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:grid-cols-[280px_minmax(0,1fr)] md:px-8 lg:px-10">
        <aside className="space-y-4">
          <Panel title="整理流程">
            <ol className="space-y-3 text-sm leading-6 text-[#5c574f]">
              <li><strong>1.</strong> 在 Codex 聊天输入不懂内容。</li>
              <li><strong>2.</strong> 使用 <code>$jlpt-chat-review</code> 抽取 JSONL。</li>
              <li><strong>3.</strong> 每天生成前一天的复习包。</li>
              <li><strong>4.</strong> 同步为网站数据并发布。</li>
            </ol>
          </Panel>

          <Panel title="分类分布">
            <div className="space-y-2">
              {Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between rounded-md bg-[#f2eadf] px-3 py-2 text-sm">
                  <span>{typeLabels[type] ?? type}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </Panel>
        </aside>

        <div className="space-y-6">
          <Panel title="最近整理">
            <div className="grid gap-3 lg:grid-cols-2">
              {data.items.map((item) => (
                <article key={item.id} className="rounded-lg border border-[#e0d6c8] bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-[#24473f] px-2 py-1 text-xs font-semibold text-white">{typeLabels[item.type] ?? item.type}</span>
                    <span className="rounded bg-[#ead9c7] px-2 py-1 text-xs font-semibold text-[#6f412d]">{item.jlpt_level ?? 'unknown'}</span>
                    <span className="text-xs text-[#797168]">{item.date}</span>
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold leading-snug">{item.original}</h3>
                  {item.reading ? <p className="mt-1 text-sm text-[#8c5a3d]">{item.reading}</p> : null}
                  <p className="mt-3 text-sm font-semibold">{item.meaning_zh}</p>
                  <p className="mt-2 text-sm leading-6 text-[#5c574f]">{item.explanation_zh}</p>
                  {item.source_chat_summary ? (
                    <p className="mt-3 rounded-md bg-[#f6f0e8] px-3 py-2 text-xs leading-5 text-[#6b655d]">
                      困惑点：{item.source_chat_summary}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="今日题目">
            <div className="space-y-3">
              {latestPack.quiz?.map((quiz) => (
                <details key={quiz.id} className="rounded-lg border border-[#ded5c7] bg-white p-4">
                  <summary className="cursor-pointer font-semibold">{quiz.prompt}</summary>
                  {quiz.choices ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {quiz.choices.map((choice) => (
                        <span key={choice} className="rounded-md bg-[#f2eadf] px-3 py-2 text-sm">{choice}</span>
                      ))}
                    </div>
                  ) : null}
                  <p className="mt-4 text-sm font-semibold">答案：{quiz.answer}</p>
                  {quiz.explanation_zh ? <p className="mt-1 text-sm leading-6 text-[#5c574f]">{quiz.explanation_zh}</p> : null}
                </details>
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#decfbc] bg-white px-4 py-3">
      <p className="text-xs font-semibold text-[#756d63]">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#d8cdbc] bg-[#fffaf4] p-4 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
