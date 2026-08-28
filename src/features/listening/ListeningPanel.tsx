import { useEffect, useState, type FormEvent } from 'react';
import type { ListeningQuestion, ListeningQuestionInput, Locale } from '../../types';

type ListeningPanelProps = {
  labels: Record<string, string>;
  locale: Locale;
  token: string;
  questions: ListeningQuestion[];
  onCreate: (input: ListeningQuestionInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function ListeningPanel({ labels, locale, token, questions, onCreate, onDelete }: ListeningPanelProps) {
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [choices, setChoices] = useState(['', '', '', '']);
  const [answerIndex, setAnswerIndex] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (!audioFile) {
      setMessage(labels.listeningFileRequired);
      return;
    }
    if (audioFile.size > 25 * 1024 * 1024) {
      setMessage(labels.listeningFileTooLarge);
      return;
    }
    setSubmitting(true);
    try {
      await onCreate({
        title,
        question,
        choices,
        answerIndex,
        explanation,
        audioFileName: audioFile.name,
        audioMime: audioFile.type || audioMimeFromName(audioFile.name),
        audioBase64: await fileToBase64(audioFile),
      });
      setTitle('');
      setQuestion('');
      setChoices(['', '', '', '']);
      setAnswerIndex(0);
      setExplanation('');
      setAudioFile(null);
      setFileInputKey((value) => value + 1);
      setMessage(labels.listeningSaved);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save listening question');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="min-w-0 rounded-lg border border-[#dfe5dc] bg-[#fbfcf8] p-5 shadow-sm md:p-6">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-semibold text-[#27312c]">{labels.listeningUploadTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-[#68716b]">{labels.listeningUploadBody}</p>
      </div>

      <form className="mt-5 grid gap-4" onSubmit={submit}>
        <label className="block text-sm font-semibold text-[#46514c]">
          {labels.listeningAudio}
          <input
            key={fileInputKey}
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac,.flac"
            onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)}
            className="mt-2 block w-full rounded-md border border-[#cbd6cf] bg-white p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-[#e9f0e9] file:px-3 file:py-2 file:font-semibold file:text-[#31564c]"
            required
          />
          {audioFile ? <span className="mt-2 block text-xs font-normal text-[#68716b]">{audioFile.name} · {formatFileSize(audioFile.size, locale)}</span> : null}
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-[#46514c]">
            {labels.listeningTitle}
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={labels.listeningTitlePlaceholder} maxLength={120} className="mt-2 h-11 w-full rounded-md border border-[#c8d1c8] bg-white px-3 text-base" />
          </label>
          <label className="block text-sm font-semibold text-[#46514c]">
            {labels.listeningCorrectAnswer}
            <select value={answerIndex} onChange={(event) => setAnswerIndex(Number(event.target.value))} className="mt-2 h-11 w-full rounded-md border border-[#c8d1c8] bg-white px-3 text-base">
              {choices.map((choice, index) => <option key={index} value={index}>{index + 1}. {choice || labels.listeningChoice.replace('{number}', String(index + 1))}</option>)}
            </select>
          </label>
        </div>

        <label className="block text-sm font-semibold text-[#46514c]">
          {labels.listeningQuestion}
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={labels.listeningQuestionPlaceholder} maxLength={1000} className="mt-2 min-h-24 w-full rounded-md border border-[#c8d1c8] bg-white p-3 text-base leading-6" required />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          {choices.map((choice, index) => (
            <label key={index} className="block text-sm font-semibold text-[#46514c]">
              {labels.listeningChoice.replace('{number}', String(index + 1))}
              <input
                value={choice}
                onChange={(event) => setChoices((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                maxLength={300}
                className="mt-2 h-11 w-full rounded-md border border-[#c8d1c8] bg-white px-3 text-base"
                required
              />
            </label>
          ))}
        </div>

        <label className="block text-sm font-semibold text-[#46514c]">
          {labels.listeningExplanation}
          <textarea value={explanation} onChange={(event) => setExplanation(event.target.value)} placeholder={labels.listeningExplanationPlaceholder} maxLength={2000} className="mt-2 min-h-24 w-full rounded-md border border-[#c8d1c8] bg-white p-3 text-base leading-6" />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={submitting} className="h-11 rounded-md bg-[#31564c] px-5 text-sm font-semibold text-white hover:bg-[#24473f] disabled:cursor-wait disabled:opacity-60">
            {submitting ? labels.listeningSubmitting : labels.listeningSubmit}
          </button>
          {message ? <p role="status" className="text-sm font-semibold text-[#5a654f]">{message}</p> : null}
        </div>
      </form>

      <div className="mt-8 border-t border-[#e1e7df] pt-6">
        <h2 className="text-xl font-semibold text-[#27312c]">{labels.listeningLibrary}</h2>
        {questions.length ? (
          <div className="mt-4 grid gap-4">
            {questions.map((item) => <ListeningQuestionItem key={item.id} item={item} labels={labels} locale={locale} token={token} onDelete={onDelete} />)}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[#68716b]">{labels.listeningEmpty}</p>
        )}
      </div>
    </section>
  );
}

function ListeningQuestionItem({ item, labels, locale, token, onDelete }: { item: ListeningQuestion; labels: Record<string, string>; locale: Locale; token: string; onDelete: (id: string) => Promise<void> }) {
  const [audioUrl, setAudioUrl] = useState('');
  const [audioError, setAudioError] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answerNotice, setAnswerNotice] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let disposed = false;
    let objectUrl = '';
    fetch(`/api/listening-questions/${item.id}/audio`, { headers: { authorization: `Bearer ${token}` } })
      .then((response) => {
        if (!response.ok) throw new Error(labels.listeningPlayError);
        return response.blob();
      })
      .then((blob) => {
        if (disposed) return;
        objectUrl = URL.createObjectURL(blob);
        setAudioUrl(objectUrl);
      })
      .catch(() => { if (!disposed) setAudioError(labels.listeningPlayError); });
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.id, labels.listeningPlayError, token]);

  async function remove() {
    if (!window.confirm(labels.listeningDeleteConfirm)) return;
    setDeleting(true);
    try {
      await onDelete(item.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="min-w-0 rounded-md border border-[#d8e0d7] bg-white p-4 md:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-semibold text-[#27312c]">{item.title}</h3>
          <p className="mt-1 text-xs text-[#778079]">{item.audioFileName} · {formatFileSize(item.audioSize, locale)} · {formatDateTime(item.createdAt, locale)}</p>
        </div>
        <button type="button" onClick={remove} disabled={deleting} className="h-9 shrink-0 rounded-md border border-[#d9c9c3] bg-white px-3 text-sm font-semibold text-[#7a4d42] hover:bg-[#faf3f0] disabled:opacity-60">{labels.listeningDelete}</button>
      </div>
      <div className="mt-4">
        {audioUrl ? <audio controls preload="metadata" src={audioUrl} className="w-full" /> : <p className="text-sm text-[#68716b]">{audioError || 'Loading audio...'}</p>}
      </div>
      <p className="mt-5 whitespace-pre-wrap text-base font-semibold leading-7">{item.question}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {item.choices.map((choice, index) => {
          const resultClass = revealed
            ? index === item.answerIndex ? 'border-[#6f947c] bg-[#edf5ee]' : selected === index ? 'border-[#c9907d] bg-[#fbf1ed]' : 'border-[#d8e0d7] bg-white'
            : selected === index ? 'border-[#31564c] bg-[#edf3ef]' : 'border-[#d8e0d7] bg-white';
          return (
            <label key={index} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm ${resultClass}`}>
              <input type="radio" name={`listening-${item.id}`} checked={selected === index} onChange={() => { setSelected(index); setRevealed(false); setAnswerNotice(''); }} />
              <span>{index + 1}. {choice}</span>
            </label>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => selected === null ? setAnswerNotice(labels.listeningSelectAnswer) : setRevealed(true)} className="h-10 rounded-md bg-[#31564c] px-4 text-sm font-semibold text-white">{labels.listeningShowAnswer}</button>
        {answerNotice ? <p role="status" className="text-sm font-semibold text-[#8a6134]">{answerNotice}</p> : null}
        {revealed && selected !== null ? <p role="status" className={`text-sm font-semibold ${selected === item.answerIndex ? 'text-[#356146]' : 'text-[#8a493c]'}`}>{selected === item.answerIndex ? labels.listeningCorrect : labels.listeningWrong}</p> : null}
      </div>
      {revealed && item.explanation ? <p className="mt-4 whitespace-pre-wrap rounded-md bg-[#f5f7f3] p-3 text-sm leading-6 text-[#4f5b55]">{item.explanation}</p> : null}
    </article>
  );
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? '').split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('Failed to read audio file'));
    reader.readAsDataURL(file);
  });
}

function audioMimeFromName(name: string) {
  const extension = name.toLowerCase().split('.').pop();
  return ({ mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg', webm: 'audio/webm', aac: 'audio/aac', flac: 'audio/flac' } as Record<string, string>)[extension ?? ''] ?? 'audio/mpeg';
}

function formatFileSize(bytes: number, locale: Locale) {
  const unit = bytes >= 1024 * 1024 ? 'megabyte' : 'kilobyte';
  const divisor = bytes >= 1024 * 1024 ? 1024 * 1024 : 1024;
  return new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'short', maximumFractionDigits: 1 }).format(bytes / divisor);
}

function formatDateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
