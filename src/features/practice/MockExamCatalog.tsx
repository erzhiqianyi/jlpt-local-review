import { ChevronLeft, ChevronRight, Clock3, Headphones, LoaderCircle, Play } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LocalMockExamManifest, LocalMockExamSummary, Locale } from '../../types';

const MOCK_EXAM_PAGE_SIZE = 20;

const copy = {
  'zh-CN': { title: '模拟试题', subtitle: 'N1 - N5 · 两套完整试卷', notice: '外部 Agent 写回练习题 · 非官方真题 · 未人工审校 · 系统合成听力', loading: '正在读取本地试卷目录...', unavailable: '本地试卷目录无法读取。请确认本地后端正在运行。', questions: '题', minutes: '分钟', audio: '听力', open: '打开', total: '套试卷', exam: '试卷', level: '级别', duration: '时长', prev: '上一页', next: '下一页', noMore: '没有更多了' },
  ja: { title: '模擬試験', subtitle: 'N1 - N5 · 2回分の一式試験', notice: 'AI オリジナル練習 · 公式問題ではありません · 未校閲 · 合成音声', loading: 'ローカル試験一覧を読み込んでいます...', unavailable: 'ローカル試験一覧を読み込めません。ローカルサーバーを確認してください。', questions: '問', minutes: '分', audio: '聴解', open: '開く', total: '回分', exam: '試験', level: '級', duration: '時間', prev: '前へ', next: '次へ', noMore: 'これ以上ありません' },
  en: { title: 'Mock exams', subtitle: 'N1 - N5 · Two full papers', notice: 'AI-original practice · Not official papers · Not human-reviewed · Synthesized listening', loading: 'Loading the local exam catalog...', unavailable: 'The local exam catalog could not be loaded. Check the local backend.', questions: 'questions', minutes: 'minutes', audio: 'listening', open: 'Open', total: 'papers', exam: 'Paper', level: 'Level', duration: 'Duration', prev: 'Previous page', next: 'Next page', noMore: 'No more items' },
} satisfies Record<Locale, Record<string, string>>;

export function MockExamCatalog({ locale, onOpen }: { locale: Locale; onOpen: (examId: string) => void }) {
  const t = copy[locale];
  const [manifest, setManifest] = useState<LocalMockExamManifest | null>(null);
  const [error, setError] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(MOCK_EXAM_PAGE_SIZE);
  const mobileLoadMoreRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/local-mock-exams').then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<LocalMockExamManifest>;
    }).then((payload) => { if (!cancelled) setManifest(payload); }).catch(() => { if (!cancelled) setError(t.unavailable); });
    return () => { cancelled = true; };
  }, [t.unavailable]);
  const exams = useMemo(() => manifest?.exams ?? [], [manifest]);
  const pageCount = Math.max(1, Math.ceil(exams.length / MOCK_EXAM_PAGE_SIZE));
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const pageStart = currentPage * MOCK_EXAM_PAGE_SIZE;
  const pageItems = exams.slice(pageStart, pageStart + MOCK_EXAM_PAGE_SIZE);
  const mobileItems = exams.slice(0, mobileVisibleCount);
  const pageEnd = pageStart + pageItems.length;
  const mobilePageEnd = Math.min(mobileVisibleCount, exams.length);

  useEffect(() => {
    setPageIndex((index) => Math.min(index, pageCount - 1));
  }, [pageCount]);

  useEffect(() => {
    setMobileVisibleCount(MOCK_EXAM_PAGE_SIZE);
  }, [exams]);

  useEffect(() => {
    const sentinel = mobileLoadMoreRef.current;
    if (!sentinel || mobileVisibleCount >= exams.length) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setMobileVisibleCount((count) => Math.min(count + MOCK_EXAM_PAGE_SIZE, exams.length));
    }, { rootMargin: '240px 0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [exams.length, mobileVisibleCount]);

  return (
    <section className="mx-auto w-full max-w-5xl py-1 md:py-4">
      <div className="min-w-0 overflow-hidden bg-white md:rounded-lg md:border md:border-[#d8cdbc] md:shadow-sm">
        <header className="border-b border-[#e5ddd1] px-4 py-4 md:px-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#9b435f]">{t.subtitle}</p>
              <h1 className="mt-1 text-2xl font-semibold text-[#27312c]">{t.title}</h1>
              <p className="mt-2 text-xs font-bold leading-5 text-[#6f5b20]">{t.notice}</p>
            </div>
            {manifest ? <span className="rounded-md bg-[#e8f0eb] px-3 py-1 text-sm font-semibold text-[#24473f]">{exams.length} {t.total}</span> : null}
          </div>
        </header>
        {!manifest ? <div className="py-12 text-center text-sm font-semibold text-[#59645e]">{error || <span className="inline-flex items-center gap-2"><LoaderCircle className="animate-spin" size={18} />{t.loading}</span>}</div> : (
          <>
            <div className="mobile-list md:hidden">
              {mobileItems.map((exam) => <MobileExamItem key={exam.id} exam={exam} locale={locale} t={t} onOpen={onOpen} />)}
            </div>
            <div className="hidden overflow-x-auto md:block md:overflow-x-visible">
              <table className="w-full min-w-[640px] table-fixed border-collapse text-left text-sm md:min-w-0">
                <thead className="bg-[#f3f6f1] text-xs font-semibold text-[#5b665f]">
                  <tr>
                    <th className="w-[10%] px-4 py-3">{t.level}</th>
                    <th className="w-[40%] px-3 py-3">{t.exam}</th>
                    <th className="w-[13%] px-3 py-3">{t.questions}</th>
                    <th className="w-[15%] px-3 py-3">{t.duration}</th>
                    <th className="w-[13%] px-3 py-3">{t.audio}</th>
                    <th className="w-[9%] px-4 py-3 text-right"><span className="sr-only">{t.open}</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ece4d8]">
                  {pageItems.map((exam) => <ExamRow key={exam.id} exam={exam} locale={locale} t={t} onOpen={onOpen} />)}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e5ddd1] px-4 py-3 text-sm text-[#59645e] md:px-5">
              <span className="font-semibold">
                <span className="md:hidden">{mobilePageEnd} / {exams.length} {t.total}</span>
                <span className="hidden md:inline">{pageStart + 1}-{pageEnd} / {exams.length} {t.total}</span>
              </span>
              <div ref={mobileLoadMoreRef} className="mobile-load-state md:hidden">
                {mobilePageEnd >= exams.length ? t.noMore : null}
              </div>
              <div className="hidden items-center gap-2 md:flex">
                <button type="button" aria-label={t.prev} title={t.prev} disabled={currentPage === 0} onClick={() => setPageIndex((index) => Math.max(0, index - 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#c8bcae] bg-white text-[#24473f] hover:bg-[#f2f6f1] disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronLeft size={18} />
                </button>
                <span className="min-w-14 text-center font-semibold text-[#34443c]">{currentPage + 1} / {pageCount}</span>
                <button type="button" aria-label={t.next} title={t.next} disabled={currentPage >= pageCount - 1} onClick={() => setPageIndex((index) => Math.min(pageCount - 1, index + 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#c8bcae] bg-white text-[#24473f] hover:bg-[#f2f6f1] disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
        </div>
    </section>
  );
}

function MobileExamItem({ exam, locale, t, onOpen }: { exam: LocalMockExamSummary; locale: Locale; t: Record<string, string>; onOpen: (id: string) => void }) {
  const title = locale === 'ja' ? exam.titleJa : exam.title;
  return (
    <button type="button" onClick={() => onOpen(exam.id)} className="mobile-list-item mobile-list-link cute-focus" aria-label={`${t.open}: ${title}`}>
      <span className="mobile-list-main">
        <span className="mobile-list-title">{title}</span>
        <span className="mobile-list-subtitle">{exam.level}</span>
      </span>
      <span className="mobile-list-tags">
        <span className="mobile-list-pill">{exam.questionCount} {t.questions}</span>
        <span className="mobile-list-pill is-soft"><Clock3 size={14} />{exam.totalDurationMinutes} {t.minutes}</span>
        <span className="mobile-list-pill is-soft"><Headphones size={14} />{exam.audioCount} {t.audio}</span>
      </span>
      <ChevronRight className="mobile-list-cue" size={18} aria-hidden="true" />
    </button>
  );
}

function ExamRow({ exam, locale, t, onOpen }: { exam: LocalMockExamSummary; locale: Locale; t: Record<string, string>; onOpen: (id: string) => void }) {
  const title = locale === 'ja' ? exam.titleJa : exam.title;
  return <tr className="bg-white hover:bg-[#fbf8f2]">
    <td className="px-4 py-3 align-top">
      <span className="rounded bg-[#f1eee8] px-2 py-1 text-xs font-semibold text-[#584f43]">{exam.level}</span>
    </td>
    <td className="px-3 py-3 align-top">
      <button type="button" onClick={() => onOpen(exam.id)} className="block min-w-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24473f]">
        <span className="block break-words text-base font-semibold text-[#173d35]">{title}</span>
      </button>
    </td>
    <td className="px-3 py-3 align-top font-semibold text-[#3f4b45]">{exam.questionCount}</td>
    <td className="px-3 py-3 align-top font-semibold text-[#3f4b45]">
      <span className="inline-flex items-center gap-1"><Clock3 size={14} />{exam.totalDurationMinutes} {t.minutes}</span>
    </td>
    <td className="px-3 py-3 align-top font-semibold text-[#3f4b45]">
      <span className="inline-flex items-center gap-1"><Headphones size={14} />{exam.audioCount}</span>
    </td>
    <td className="px-4 py-3 text-right align-top">
      <button type="button" aria-label={`${t.open}: ${title}`} title={t.open} onClick={() => onOpen(exam.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#b9c9c1] bg-white text-[#24473f] hover:bg-[#f2f6f1]">
        <Play size={16} />
      </button>
    </td>
  </tr>;
}
