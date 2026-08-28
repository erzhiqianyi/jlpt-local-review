import { useEffect, useState } from 'react';
import {
  officialModuleMeta,
  sampleById,
  samplesForModule,
  type OfficialSampleModule,
} from '../../data/officialModuleSamples';
import type { Locale } from '../../types';

const OFFICIAL_TYPES_URL = 'https://www.jlpt.jp/e/guideline/testsections.html';
const OFFICIAL_PURPOSES_URL = 'https://www.jlpt.jp/e/guideline/pdf/n1_e_revised.pdf';
const OFFICIAL_SAMPLES_URL = 'https://www.jlpt.jp/e/samples/sampleindex.html';

type SharedProps = {
  module: OfficialSampleModule;
  labels: Record<string, string>;
  locale: Locale;
};

export function OfficialModuleSamples({ module, sampleId, labels, locale, onOpen, onBack }: SharedProps & {
  sampleId?: string;
  onOpen: (id: string) => void;
  onBack: () => void;
}) {
  return sampleId
    ? <OfficialSampleDetail module={module} sampleId={sampleId} labels={labels} locale={locale} onBack={onBack} />
    : <OfficialSampleIndex module={module} labels={labels} locale={locale} onOpen={onOpen} />;
}

export function OfficialSampleEntry({ module, labels, locale, onOpen }: SharedProps & { onOpen: () => void }) {
  const meta = officialModuleMeta[module];
  const count = samplesForModule(module).length;

  return (
    <section className="flex min-w-0 flex-col gap-3 border-b border-[#d7dfd6] pb-5 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs font-semibold text-[#7d6032]">{labels.sampleOfficialStructure}</p>
        <h2 className="mt-1 text-lg font-semibold text-[#27312c]">{meta.title[locale]}</h2>
        <p className="mt-1 text-sm leading-6 text-[#68716b]">{labels.sampleEntryBody.replace('{count}', String(count))}</p>
      </div>
      <button type="button" onClick={onOpen} className="h-10 shrink-0 rounded-md border border-[#c8d1c8] bg-white px-4 text-sm font-semibold text-[#31564c] hover:bg-[#f3f6f1]">
        {labels.sampleOpenIndex} →
      </button>
    </section>
  );
}

function OfficialSampleIndex({ module, labels, locale, onOpen }: SharedProps & { onOpen: (id: string) => void }) {
  const meta = officialModuleMeta[module];
  const samples = samplesForModule(module);

  return (
    <section className="min-w-0">
      <header className="border-b border-[#d7dfd6] pb-5">
        <p className="text-sm font-semibold text-[#7d6032]">JLPT N1 · {labels.sampleOriginalBadge}</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#27312c]">{meta.title[locale]}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#68716b]">{meta.body[locale]}</p>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#53605a]">
          <span><strong className="text-[#27312c]">{meta.officialTypeCount}</strong> {labels.sampleOfficialTypeCount}</span>
          <span>{meta.officialTiming[locale]}</span>
          <span><strong className="text-[#27312c]">{samples.length}</strong> {labels.sampleIncludedCount}</span>
        </div>
      </header>

      <div className="divide-y divide-[#dfe5dc] border-b border-[#dfe5dc]">
        {samples.map((sample) => (
          <button key={sample.id} type="button" onClick={() => onOpen(sample.id)} className="group flex min-h-28 w-full items-center gap-4 py-4 text-left hover:bg-[#f7f9f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31564c]">
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold text-[#27312c]">{sample.title[locale]}</span>
                <span className="text-xs font-semibold text-[#7d6032]">{sample.officialName}</span>
              </span>
              <span className="mt-1 block text-sm leading-6 text-[#68716b]">{sample.summary[locale]}</span>
              <span className="mt-2 block text-xs text-[#7a807b]">{labels.sampleEstimatedMinutes.replace('{minutes}', String(sample.estimatedMinutes))}</span>
            </span>
            <span aria-hidden="true" className="shrink-0 text-xl text-[#7b8780] transition-transform group-hover:translate-x-1">→</span>
          </button>
        ))}
      </div>

      <OfficialSourceFooter labels={labels} />
    </section>
  );
}

function OfficialSampleDetail({ module, sampleId, labels, locale, onBack }: SharedProps & { sampleId: string; onBack: () => void }) {
  const sample = sampleById(module, sampleId);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSelected(null);
    setRevealed(false);
    setSpeaking(false);
    window.speechSynthesis?.cancel();
    return () => window.speechSynthesis?.cancel();
  }, [sampleId]);

  if (!sample) {
    return (
      <section className="py-10">
        <p className="text-sm text-[#68716b]">{labels.sampleNotFound}</p>
        <button type="button" onClick={onBack} className="mt-4 min-h-10 text-sm font-semibold text-[#31564c] hover:underline">← {labels.sampleBackToIndex}</button>
      </section>
    );
  }

  function playSpeech() {
    if (!sample?.ttsText || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(sample.ttsText);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.92;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeech() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  return (
    <article className="min-w-0">
      <button type="button" onClick={onBack} className="min-h-10 text-sm font-semibold text-[#31564c] hover:underline">← {labels.sampleBackToIndex}</button>

      <header className="mt-3 border-b border-[#d7dfd6] pb-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#7d6032]">JLPT N1 · {sample.officialName}</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#27312c]">{sample.title[locale]}</h1>
            <p className="mt-2 text-sm leading-6 text-[#68716b]">{sample.summary[locale]}</p>
          </div>
          <span className="w-fit rounded bg-[#f1ead7] px-2 py-1 text-xs font-semibold text-[#765c25]">{labels.sampleOriginalBadge}</span>
        </div>
      </header>

      <section className="border-b border-[#dfe5dc] py-6">
        <p className="text-sm leading-7 text-[#4f5b55]">{sample.instruction}</p>

        {sample.ttsText ? (
          <div className="mt-5 border-l-2 border-[#9eb4b7] pl-4">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={speaking ? stopSpeech : playSpeech} className="h-10 rounded-md bg-[#31564c] px-4 text-sm font-semibold text-white">
                {speaking ? labels.sampleStopAudio : labels.samplePlayAudio}
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-[#7a807b]">{labels.sampleTtsNotice}</p>
          </div>
        ) : null}

        {sample.stimulus?.map((part, index) => (
          <div key={index} className="mt-5 max-w-4xl whitespace-pre-wrap border-l-2 border-[#c8d1c8] pl-4 text-base leading-8 text-[#313934]">
            {part.label ? <p className="mb-2 text-sm font-semibold text-[#7d6032]">{part.label}</p> : null}
            <p>{part.text}</p>
          </div>
        ))}

        <h2 className="mt-6 text-lg font-semibold leading-7 text-[#27312c]">{sample.question}</h2>
        <div className="mt-4 grid gap-2">
          {sample.choices.map((choice, index) => {
            const resultClass = revealed
              ? index === sample.answerIndex ? 'border-[#6f947c] bg-[#edf5ee]' : selected === index ? 'border-[#c9907d] bg-[#fbf1ed]' : 'border-[#d8e0d7] bg-white'
              : selected === index ? 'border-[#31564c] bg-[#edf3ef]' : 'border-[#d8e0d7] bg-white hover:bg-[#f7f9f5]';
            return (
              <label key={index} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm ${resultClass}`}>
                <input type="radio" name={`official-sample-${sample.id}`} checked={selected === index} onChange={() => { setSelected(index); setRevealed(false); }} />
                <span>{index + 1}. {choice}</span>
              </label>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" disabled={selected === null} onClick={() => setRevealed(true)} className="h-10 rounded-md bg-[#31564c] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">{labels.sampleCheckAnswer}</button>
          {revealed && selected !== null ? <p role="status" className={`text-sm font-semibold ${selected === sample.answerIndex ? 'text-[#356146]' : 'text-[#8a493c]'}`}>{selected === sample.answerIndex ? labels.listeningCorrect : labels.listeningWrong}</p> : null}
        </div>
      </section>

      {revealed ? (
        <section className="border-b border-[#dfe5dc] py-6">
          <p className="text-xs font-semibold text-[#6b746e]">{labels.sampleExplanation}</p>
          <p className="mt-2 max-w-4xl text-base leading-7 text-[#3f5149]">{sample.explanation[locale]}</p>
          {sample.ttsText ? (
            <div className="mt-5 max-w-4xl">
              <p className="text-xs font-semibold text-[#6b746e]">{labels.sampleTranscript}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#4f5b55]">{sample.ttsText}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <OfficialSourceFooter labels={labels} />
    </article>
  );
}

function OfficialSourceFooter({ labels }: { labels: Record<string, string> }) {
  return (
    <footer className="pt-5">
      <p className="border-l-2 border-[#c9d8ce] pl-3 text-xs leading-5 text-[#596760]">{labels.samplePracticeNotice}</p>
      <p className="mt-3 text-xs leading-5 text-[#7a807b]">{labels.sampleCopyrightNotice}</p>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
        <a href={OFFICIAL_TYPES_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center text-sm font-semibold text-[#31564c] hover:underline">{labels.sampleOfficialTypes} ↗</a>
        <a href={OFFICIAL_PURPOSES_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center text-sm font-semibold text-[#31564c] hover:underline">{labels.sampleOfficialPurposes} ↗</a>
        <a href={OFFICIAL_SAMPLES_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center text-sm font-semibold text-[#31564c] hover:underline">{labels.sampleOfficialWorkbook} ↗</a>
      </div>
    </footer>
  );
}
