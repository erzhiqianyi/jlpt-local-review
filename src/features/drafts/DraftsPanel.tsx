import type { DraftSummary, ReviewPackDraft } from '../../types';

type DraftsPanelProps = {
  labels: Record<string, string>;
  drafts: DraftSummary[];
  activeDraft: ReviewPackDraft | null;
  annotation: string;
  onAnnotationChange: (value: string) => void;
  onCreateDailyDraft: () => void;
  onSelectDraft: (id: string) => void;
  onSaveAnnotation: () => void;
  onCopyRevisionContext: () => void;
};

export function DraftsPanel({
  labels,
  drafts,
  activeDraft,
  annotation,
  onAnnotationChange,
  onCreateDailyDraft,
  onSelectDraft,
  onSaveAnnotation,
  onCopyRevisionContext,
}: DraftsPanelProps) {
  return (
    <section className="min-w-0 space-y-4">
      <div className="min-w-0 rounded-lg border border-[#d7dfd6] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{labels.draftsTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[#5f625b]">{labels.draftsBody}</p>
          </div>
          <button type="button" onClick={onCreateDailyDraft} className="h-11 rounded-md bg-[#173d35] px-4 text-sm font-semibold text-white">
            {labels.createDailyDraft}
          </button>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-lg border border-[#d8cdbc] bg-[#fffaf4] p-4 shadow-sm">
          <h3 className="text-base font-semibold">{labels.draftsTitle}</h3>
          <div className="mt-4 grid gap-2">
            {drafts.length ? drafts.map((draft) => (
              <button
                type="button"
                key={draft.id}
                onClick={() => onSelectDraft(draft.id)}
                className={`min-w-0 rounded-md border p-3 text-left text-sm ${
                  activeDraft?.id === draft.id ? 'border-[#24473f] bg-[#e7f0eb]' : 'border-[#d9d0c3] bg-white hover:bg-[#f6eee3]'
                }`}
              >
                <span className="block truncate font-semibold">{draft.title}</span>
                <span className="mt-2 block text-xs text-[#62645f]">{labels.draftStatus}: {draft.status}</span>
                <span className="mt-1 block text-xs text-[#62645f]">{labels.updatedAt}: {formatDate(draft.updated_at)}</span>
              </button>
            )) : (
              <p className="rounded-md bg-white p-3 text-sm leading-6 text-[#5f625b]">{labels.noDraftsBody}</p>
            )}
          </div>
        </aside>

        <article className="min-w-0 rounded-lg border border-[#d7dfd6] bg-white p-5 shadow-sm">
          {activeDraft ? (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#856033]">{labels.draftPreview}</p>
                  <h3 className="mt-1 text-2xl font-semibold">{activeDraft.title}</h3>
                </div>
                <button type="button" onClick={onCopyRevisionContext} className="h-10 rounded-md border border-[#cbd6cf] bg-white px-3 text-sm font-semibold text-[#24473f]">
                  {labels.revisionContext}
                </button>
              </div>

              <pre className="mt-4 max-h-[520px] overflow-auto rounded-md bg-[#f5f7f3] p-4 text-xs leading-5 text-[#27312c]">
                {JSON.stringify(activeDraft.content, null, 2)}
              </pre>

              <section className="mt-5 border-t border-[#e2ddd3] pt-4">
                <h4 className="text-base font-semibold">{labels.draftAnnotations}</h4>
                <div className="mt-3 grid gap-2">
                  {activeDraft.annotations.length ? activeDraft.annotations.map((item) => (
                    <p key={item.id} className="rounded-md bg-[#fffaf4] p-3 text-sm leading-6 text-[#4f5b55]">
                      {item.body}
                    </p>
                  )) : (
                    <p className="rounded-md bg-[#f5f7f3] p-3 text-sm leading-6 text-[#5f625b]">{labels.addAnnotation}</p>
                  )}
                </div>
                <textarea
                  value={annotation}
                  onChange={(event) => onAnnotationChange(event.target.value)}
                  placeholder={labels.annotationPlaceholder}
                  className="mt-4 min-h-28 w-full rounded-md border border-[#c8bcae] bg-white p-3 text-sm leading-6"
                />
                <button type="button" onClick={onSaveAnnotation} className="mt-3 h-10 rounded-md bg-[#173d35] px-4 text-sm font-semibold text-white">
                  {labels.saveAnnotation}
                </button>
              </section>
            </>
          ) : (
            <div className="rounded-md bg-[#f5f7f3] p-4">
              <h3 className="text-xl font-semibold">{labels.noDrafts}</h3>
              <p className="mt-2 text-sm leading-6 text-[#5f625b]">{labels.noDraftsBody}</p>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short' }).format(new Date(value));
}
