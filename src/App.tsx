'use client';

import { useEffect, useMemo, useState } from 'react';

type Deck = 'n1_vocab' | 'name_reading' | 'grammar_expression';
type QuestionKind = 'reading' | 'meaning' | 'collocation' | 'comparison' | 'moji_goi';
type AnswerState = Record<string, { selected: string; correct: boolean }>;
type ProgressState = Record<string, { correct: number; wrong: number; status: 'new' | 'learning' | 'review' | 'mastered' }>;

type VocabItem = {
  id: string;
  date: string;
  deck: Deck;
  type: string;
  jlpt_level?: string;
  original: string;
  reading?: string;
  meaning_zh: string;
  core_memory: string;
  part_of_speech?: string;
  collocations?: string[];
  examples?: { ja: string; zh: string }[];
  comparisons?: { target: string; difference_zh: string }[];
  analysis?: string;
  tags?: string[];
};

type ReviewData = {
  generated_at: string;
  items: VocabItem[];
};

type Question = {
  id: string;
  itemId: string;
  kind: QuestionKind;
  title: string;
  prompt: string;
  choices: string[];
  answer: string;
  explanation: string;
};

const STORAGE_PROGRESS = 'jlpt-vocab-progress-v1';
const STORAGE_ANSWERS = 'jlpt-vocab-answers-v1';

const kindLabels: Record<QuestionKind, string> = {
  reading: '读音',
  meaning: '词义',
  collocation: '搭配',
  comparison: '易混',
  moji_goi: '文字・語彙',
};

const deckLabels: Record<Deck | 'all', string> = {
  all: '全部',
  n1_vocab: 'N1/N2 词汇',
  grammar_expression: '表达/活用',
  name_reading: '人名读法',
};

const fallbackData: ReviewData = {
  generated_at: '2026-08-27T20:20:00+09:00',
  items: [],
};

export default function App() {
  const [data, setData] = useState<ReviewData>(fallbackData);
  const [selectedDeck, setSelectedDeck] = useState<Deck | 'all'>('all');
  const [selectedKind, setSelectedKind] = useState<QuestionKind>('moji_goi');
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [progress, setProgress] = useState<ProgressState>({});

  useEffect(() => {
    fetch('/data/review-data.json')
      .then((response) => response.json())
      .then((json: ReviewData) => setData(json))
      .catch(() => setData(fallbackData));

    setProgress(readStorage(STORAGE_PROGRESS, {}));
    setAnswers(readStorage(STORAGE_ANSWERS, {}));
  }, []);

  const items = useMemo(() => {
    if (selectedDeck === 'all') {
      return data.items;
    }
    return data.items.filter((item) => item.deck === selectedDeck);
  }, [data.items, selectedDeck]);

  const allQuestions = useMemo(() => buildQuestions(items), [items]);
  const questions = useMemo(
    () => allQuestions.filter((question) => question.kind === selectedKind),
    [allQuestions, selectedKind],
  );
  const activeQuestion = questions[activeIndex % Math.max(questions.length, 1)];
  const answeredCount = Object.keys(answers).length;
  const correctCount = Object.values(answers).filter((answer) => answer.correct).length;
  const masteredCount = Object.values(progress).filter((item) => item.status === 'mastered').length;

  useEffect(() => {
    setActiveIndex(0);
  }, [selectedDeck, selectedKind]);

  function answerQuestion(question: Question, selected: string) {
    const correct = selected === question.answer;
    const nextAnswers = {
      ...answers,
      [question.id]: { selected, correct },
    };
    const current = progress[question.itemId] ?? { correct: 0, wrong: 0, status: 'new' as const };
    const nextCorrect = current.correct + (correct ? 1 : 0);
    const nextWrong = current.wrong + (correct ? 0 : 1);
    const status = nextCorrect >= 4 && nextWrong <= 1 ? 'mastered' : nextCorrect >= 2 ? 'review' : nextCorrect + nextWrong > 0 ? 'learning' : 'new';
    const nextProgress = {
      ...progress,
      [question.itemId]: { correct: nextCorrect, wrong: nextWrong, status },
    };
    setAnswers(nextAnswers);
    setProgress(nextProgress);
    writeStorage(STORAGE_ANSWERS, nextAnswers);
    writeStorage(STORAGE_PROGRESS, nextProgress);
  }

  function resetLocalProgress() {
    setAnswers({});
    setProgress({});
    localStorage.removeItem(STORAGE_ANSWERS);
    localStorage.removeItem(STORAGE_PROGRESS);
  }

  return (
    <main className="min-h-screen bg-[#f6f1e8] text-[#1f2522]">
      <header className="border-b border-[#d9d0c3] bg-[#fffaf2]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:px-8 lg:px-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#856033]">Local JLPT Vocabulary Trainer</p>
              <h1 className="mt-2 text-4xl font-semibold leading-tight md:text-5xl">JLPT 単語復習</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-[#5f625b]">
                使用 Codex 整理的词条数据，在本地浏览器里练习读音、词义、搭配、易混辨析和 JLPT 文字・語彙题型。进度只保存在当前浏览器。
              </p>
            </div>
            <button
              type="button"
              onClick={resetLocalProgress}
              className="h-11 rounded-md border border-[#c8bcae] bg-white px-4 text-sm font-semibold text-[#574f48] hover:bg-[#f7efe5]"
            >
              重置本地进度
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="词条" value={data.items.length.toString()} />
            <Metric label="题目" value={allQuestions.length.toString()} />
            <Metric label="已作答" value={answeredCount.toString()} />
            <Metric label="正确" value={correctCount.toString()} />
            <Metric label="掌握" value={masteredCount.toString()} />
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-5 md:grid-cols-[300px_minmax(0,1fr)] md:px-8 lg:px-10">
        <aside className="space-y-4">
          <Panel title="Deck">
            <div className="grid gap-2">
              {(Object.keys(deckLabels) as (Deck | 'all')[]).map((deck) => (
                <SegmentButton key={deck} active={selectedDeck === deck} onClick={() => setSelectedDeck(deck)}>
                  {deckLabels[deck]}
                </SegmentButton>
              ))}
            </div>
          </Panel>

          <Panel title="题型">
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(kindLabels) as QuestionKind[]).map((kind) => (
                <SegmentButton key={kind} active={selectedKind === kind} onClick={() => setSelectedKind(kind)}>
                  {kindLabels[kind]}
                </SegmentButton>
              ))}
            </div>
          </Panel>

          <Panel title="练习规则">
            <ul className="space-y-2 text-sm leading-6 text-[#62645f]">
              <li>选择答案后立即判分。</li>
              <li>每题显示正确答案和解析。</li>
              <li>答题记录写入浏览器本地。</li>
              <li>考场判断作为解析材料，不单独出题。</li>
            </ul>
          </Panel>
        </aside>

        <div className="space-y-5">
          <section className="rounded-lg border border-[#d8cdbc] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#856033]">{activeQuestion ? kindLabels[activeQuestion.kind] : '题目'}</p>
                <h2 className="mt-2 text-2xl font-semibold">{activeQuestion?.title ?? '没有可练习题目'}</h2>
                <p className="mt-3 text-lg leading-8 text-[#353b37]">{activeQuestion?.prompt ?? '当前筛选条件下没有题目。'}</p>
              </div>
              <div className="flex h-10 min-w-28 items-center justify-center rounded-md bg-[#e8f0eb] px-3 text-sm font-semibold text-[#24473f]">
                {questions.length ? `${activeIndex + 1} / ${questions.length}` : '0 / 0'}
              </div>
            </div>

            {activeQuestion ? (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {activeQuestion.choices.map((choice) => {
                    const answered = answers[activeQuestion.id];
                    const isSelected = answered?.selected === choice;
                    const isAnswer = choice === activeQuestion.answer;
                    const color = !answered
                      ? 'border-[#ddd4c8] bg-[#fffaf3] hover:bg-[#f5eadf]'
                      : isAnswer
                        ? 'border-[#3d735f] bg-[#e5f2ea]'
                        : isSelected
                          ? 'border-[#b65842] bg-[#fae8e1]'
                          : 'border-[#ddd4c8] bg-[#f8f3eb] opacity-70';
                    return (
                      <button
                        type="button"
                        key={choice}
                        onClick={() => answerQuestion(activeQuestion, choice)}
                        className={`min-h-14 rounded-md border px-4 py-3 text-left text-base font-semibold ${color}`}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>

                <AnswerPanel question={activeQuestion} answer={answers[activeQuestion.id]} />

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveIndex((index) => Math.max(index - 1, 0))}
                    className="h-10 rounded-md border border-[#c8bcae] bg-white px-4 text-sm font-semibold"
                  >
                    上一题
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveIndex((index) => (questions.length ? (index + 1) % questions.length : 0))}
                    className="h-10 rounded-md bg-[#24473f] px-4 text-sm font-semibold text-white"
                  >
                    下一题
                  </button>
                </div>
              </>
            ) : null}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            {items.map((item) => (
              <VocabCard key={item.id} item={item} progress={progress[item.id]} />
            ))}
          </section>
        </div>
      </section>

      <footer className="border-t border-[#d9d0c3] bg-[#fffaf2]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-sm text-[#5f625b] md:flex-row md:items-center md:justify-between md:px-8 lg:px-10">
          <p>© 2026 Itsuki. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <a className="font-semibold text-[#24473f] hover:underline" href="https://x.com/itsuki_maer" target="_blank" rel="noreferrer">
              X @itsuki_maer
            </a>
            <a className="font-semibold text-[#24473f] hover:underline" href="mailto:jlpt@erzhiqian.cc">
              jlpt@erzhiqian.cc
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function buildQuestions(items: VocabItem[]): Question[] {
  const readings = unique(items.map((item) => item.reading).filter(Boolean) as string[]);
  const meanings = unique(items.map((item) => shortMeaning(item.meaning_zh)));
  const surfaces = unique(items.map((item) => item.original));
  const questions: Question[] = [];

  items.forEach((item, index) => {
    if (item.reading) {
      questions.push({
        id: `${item.id}-reading`,
        itemId: item.id,
        kind: 'reading',
        title: `「${item.original}」的读音`,
        prompt: `请选择「${item.original}」最合适的读音。`,
        choices: choices(item.reading, readings, index),
        answer: item.reading,
        explanation: `「${item.original}」读作「${item.reading}」。${item.core_memory}`,
      });
    }

    questions.push({
      id: `${item.id}-meaning`,
      itemId: item.id,
      kind: 'meaning',
      title: `「${item.original}」的核心义`,
      prompt: `请选择最符合「${item.original}」的中文核心意思。`,
      choices: choices(shortMeaning(item.meaning_zh), meanings, index + 1),
      answer: shortMeaning(item.meaning_zh),
      explanation: `${item.meaning_zh} ${item.analysis ?? item.core_memory}`,
    });

    if (item.collocations?.length) {
      const collocation = item.collocations[0];
      questions.push({
        id: `${item.id}-collocation`,
        itemId: item.id,
        kind: 'collocation',
        title: `「${item.original}」的搭配`,
        prompt: `下面哪个搭配最自然地使用了「${item.original}」？`,
        choices: choices(collocation, buildCollocationDistractors(item, surfaces), index + 2),
        answer: collocation,
        explanation: `正确搭配是「${collocation}」。${item.collocations.slice(1, 4).length ? `同组搭配还有：${item.collocations.slice(1, 4).join('、')}。` : ''}${item.analysis ?? ''}`,
      });
    }

    item.comparisons?.slice(0, 1).forEach((comparison) => {
      questions.push({
        id: `${item.id}-comparison`,
        itemId: item.id,
        kind: 'comparison',
        title: `「${item.original}」和「${comparison.target}」`,
        prompt: `关于「${item.original}」和「${comparison.target}」的区别，哪一项正确？`,
        choices: choices(comparison.difference_zh, comparisonDistractors(item), index + 3),
        answer: comparison.difference_zh,
        explanation: `「${item.original}」的重点是：${item.core_memory} 与「${comparison.target}」相比：${comparison.difference_zh}`,
      });
    });

    questions.push(buildMojiGoiQuestion(item, items, index));
  });

  return questions;
}

function buildMojiGoiQuestion(item: VocabItem, allItems: VocabItem[], index: number): Question {
  const example = item.examples?.[0]?.ja;
  const answer = item.original;
  const otherSurfaces = allItems
    .filter((candidate) => candidate.id !== item.id && candidate.deck === item.deck)
    .map((candidate) => candidate.original);
  const prompt = example
    ? example.replace(item.original, '＿＿')
    : `中文意思「${shortMeaning(item.meaning_zh)}」对应哪一个日语词？`;

  return {
    id: `${item.id}-moji-goi`,
    itemId: item.id,
    kind: 'moji_goi',
    title: 'JLPT 文字・語彙',
    prompt,
    choices: choices(answer, otherSurfaces.length >= 3 ? otherSurfaces : allItems.map((candidate) => candidate.original), index + 4),
    answer,
    explanation: example
      ? `原句是「${example}」。这里需要「${item.original}」，意思是：${item.meaning_zh} ${item.analysis ?? ''}`
      : `「${item.original}」的核心意思是：${item.meaning_zh} ${item.core_memory}`,
  };
}

function buildCollocationDistractors(item: VocabItem, surfaces: string[]) {
  const noun = item.collocations?.[0]?.replace(item.original, '＿＿') ?? `＿＿する`;
  return surfaces
    .filter((surface) => surface !== item.original)
    .map((surface) => noun.replace('＿＿', surface));
}

function comparisonDistractors(item: VocabItem) {
  return [
    '只是日常口语说法，几乎没有正式语感差异。',
    '主要表示人的姓名读法，不表示词义区别。',
    '只能用于否定句，不能用于普通陈述。',
    item.analysis ?? item.core_memory,
  ];
}

function choices(answer: string, pool: string[], salt: number) {
  const distractors = unique(pool.filter((item) => item && item !== answer)).slice(0, 12);
  const selected = [answer, ...rotate(distractors, salt).slice(0, 3)];
  return rotate(unique(selected), salt % 4);
}

function rotate<T>(items: T[], count: number) {
  if (!items.length) {
    return items;
  }
  const offset = count % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function shortMeaning(meaning: string) {
  return meaning.split('，')[0].split('。')[0];
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#d7ccb9] bg-white px-4 py-3">
      <p className="text-xs font-semibold text-[#6b6a64]">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function SegmentButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-md border px-3 py-2 text-sm font-semibold ${
        active ? 'border-[#24473f] bg-[#24473f] text-white' : 'border-[#d9d0c3] bg-white text-[#4f5651] hover:bg-[#f6eee3]'
      }`}
    >
      {children}
    </button>
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

function AnswerPanel({ question, answer }: { question: Question; answer?: { selected: string; correct: boolean } }) {
  if (!answer) {
    return (
      <div className="mt-5 rounded-lg border border-[#ded5c7] bg-[#fffaf4] p-4 text-sm leading-6 text-[#62645f]">
        作答后会显示对错评判、正确答案和完整解析。
      </div>
    );
  }

  return (
    <div className={`mt-5 rounded-lg border p-4 ${answer.correct ? 'border-[#3d735f] bg-[#e8f3ec]' : 'border-[#b65842] bg-[#fae9e2]'}`}>
      <p className="text-sm font-semibold">{answer.correct ? '正确' : '错误'}</p>
      <p className="mt-2 text-sm">你的答案：{answer.selected}</p>
      <p className="mt-1 text-sm">正确答案：{question.answer}</p>
      <p className="mt-3 text-sm leading-6 text-[#3f4641]">{question.explanation}</p>
    </div>
  );
}

function VocabCard({ item, progress }: { item: VocabItem; progress?: ProgressState[string] }) {
  return (
    <article className="rounded-lg border border-[#d8cdbc] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-[#24473f] px-2 py-1 text-xs font-semibold text-white">{deckLabels[item.deck]}</span>
        <span className="rounded bg-[#ead9c7] px-2 py-1 text-xs font-semibold text-[#6f412d]">{item.jlpt_level ?? 'unknown'}</span>
        <span className="rounded bg-[#edf0e9] px-2 py-1 text-xs font-semibold text-[#52645c]">{progress?.status ?? 'new'}</span>
      </div>
      <h3 className="mt-3 text-2xl font-semibold">{item.original}</h3>
      {item.reading ? <p className="mt-1 text-sm font-semibold text-[#8c5a3d]">{item.reading}</p> : null}
      <p className="mt-3 text-sm font-semibold">{item.meaning_zh}</p>
      <p className="mt-2 text-sm leading-6 text-[#5f625b]">{item.core_memory}</p>
      {item.collocations?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.collocations.slice(0, 4).map((collocation) => (
            <span key={collocation} className="rounded-md bg-[#f4eee6] px-2 py-1 text-xs text-[#554f48]">{collocation}</span>
          ))}
        </div>
      ) : null}
      {item.analysis ? <p className="mt-3 rounded-md bg-[#f8f3eb] p-3 text-xs leading-5 text-[#62645f]">解析：{item.analysis}</p> : null}
    </article>
  );
}
