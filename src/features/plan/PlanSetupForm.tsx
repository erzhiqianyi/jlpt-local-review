import { useEffect, useState, type ReactNode } from 'react';
import { createStudyMaterial } from '../../domain/studyPlan';
import type { StudyPlanMaterial, StudyPlanModule, StudyPlanProfile } from '../../types';

const modules: StudyPlanModule[] = ['grammar', 'reading', 'listening', 'vocabulary', 'other'];

export function PlanSetupForm({ labels, profile, onSave }: { labels: Record<string, string>; profile: StudyPlanProfile; onSave: (profile: StudyPlanProfile) => Promise<void> }) {
  const [draft, setDraft] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => setDraft(profile), [profile]);

  function updateMaterial(id: string, patch: Partial<StudyPlanMaterial>) {
    setDraft((current) => ({ ...current, materials: current.materials.map((material) => material.id === id ? { ...material, ...patch } : material) }));
  }

  async function save() {
    if (draft.examDate < draft.startDate) return setMessage(labels.planInvalidDates);
    if (!draft.materials.length || draft.materials.some((material) => !material.title.trim())) return setMessage(labels.planMaterialNameRequired);
    setSaving(true);
    setMessage('');
    try {
      await onSave(draft);
      setMessage(labels.planProfileSaved);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : labels.planSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label={labels.planLevel}>
          <select value={draft.level} onChange={(event) => setDraft({ ...draft, level: event.target.value as StudyPlanProfile['level'] })} className={inputClass}>
            {['N1', 'N2', 'N3', 'N4', 'N5'].map((level) => <option key={level}>{level}</option>)}
          </select>
        </Field>
        <Field label={labels.planStartDate}><input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} className={inputClass} /></Field>
        <Field label={labels.planExamDate}><input type="date" value={draft.examDate} onChange={(event) => setDraft({ ...draft, examDate: event.target.value })} className={inputClass} /></Field>
        <Field label={labels.planDaysPerWeek}><NumberInput value={draft.studyDaysPerWeek} min={1} max={7} onChange={(value) => setDraft({ ...draft, studyDaysPerWeek: value })} /></Field>
        <Field label={labels.planDailyMinutes}><NumberInput value={draft.dailyMinutes} min={15} max={480} step={15} onChange={(value) => setDraft({ ...draft, dailyMinutes: value })} /></Field>
      </div>

      <Field label={labels.planGoal}>
        <textarea value={draft.goal ?? ''} maxLength={1000} onChange={(event) => setDraft({ ...draft, goal: event.target.value })} placeholder={labels.planGoalPlaceholder} className="min-h-24 w-full rounded-md border border-[#c8d1c8] bg-white p-3 text-sm leading-6 text-[#27312c]" />
      </Field>

      <div className="border-t border-[#dfe5dc] pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-[#27312c]">{labels.planMaterials}</h3>
            <p className="mt-1 text-sm leading-6 text-[#68716b]">{labels.planBasicMaterialsBody}</p>
          </div>
          <button type="button" onClick={() => setDraft((current) => ({ ...current, materials: [...current.materials, createStudyMaterial()] }))} className="h-10 shrink-0 rounded-md border border-[#bfcac0] bg-white px-3 text-sm font-semibold text-[#31564c] hover:bg-[#f3f6f1]">+ {labels.planAddMaterial}</button>
        </div>
        <div className="mt-3 divide-y divide-[#dfe5dc] border-y border-[#dfe5dc]">
          {draft.materials.map((material) => (
            <div key={material.id} className="grid gap-3 py-4 md:grid-cols-[minmax(220px,1.5fr)_150px_minmax(220px,1fr)_40px] md:items-end">
              <Field label={labels.planMaterialName}><input value={material.title} maxLength={120} onChange={(event) => updateMaterial(material.id, { title: event.target.value })} className={inputClass} /></Field>
              <Field label={labels.planModule}>
                <select value={material.module} onChange={(event) => updateMaterial(material.id, { module: event.target.value as StudyPlanModule })} className={inputClass}>
                  {modules.map((module) => <option key={module} value={module}>{labels[`planModule_${module}`]}</option>)}
                </select>
              </Field>
              <Field label={labels.planCurrentPosition}><input value={material.currentPosition ?? ''} maxLength={500} onChange={(event) => updateMaterial(material.id, { currentPosition: event.target.value })} placeholder={labels.planCurrentPositionPlaceholder} className={inputClass} /></Field>
              <button type="button" onClick={() => setDraft((current) => ({ ...current, materials: current.materials.filter((item) => item.id !== material.id) }))} aria-label={labels.planRemoveMaterial} title={labels.planRemoveMaterial} className="h-10 w-10 rounded-md border border-[#d9c9c3] bg-white text-xl text-[#7a4d42] hover:bg-[#faf3f0]">×</button>
            </div>
          ))}
        </div>
      </div>

      <button type="button" onClick={save} disabled={saving} className="h-11 rounded-md bg-[#31564c] px-5 text-sm font-semibold text-white hover:bg-[#27483f] disabled:opacity-60">{saving ? labels.planSaving : labels.planSaveProfile}</button>
      {message ? <p role="status" className="text-sm font-semibold text-[#4f5b55]">{message}</p> : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-xs font-semibold text-[#5c675f]">{label}<span className="mt-1.5 block">{children}</span></label>;
}

function NumberInput({ value, min, max, step = 1, onChange }: { value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  return <input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value) || min)))} className={inputClass} />;
}

const inputClass = 'h-10 w-full rounded-md border border-[#c8d1c8] bg-white px-3 text-sm font-normal text-[#27312c]';
