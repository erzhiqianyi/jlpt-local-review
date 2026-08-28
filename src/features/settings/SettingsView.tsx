import type { ReactNode } from 'react';
import type { DisplaySettings, Locale } from '../../types';

type SettingsViewProps = {
  labels: Record<string, string>;
  settings: DisplaySettings;
  username: string;
  onLogout: () => void;
  onUpdateSettings: (settings: DisplaySettings) => void;
};

export function SettingsView({ labels, settings, username, onLogout, onUpdateSettings }: SettingsViewProps) {
  return (
    <section className="min-w-0 rounded-lg border border-[#dfe5dc] bg-[#fbfcf8] p-5 shadow-sm md:p-6">
      <h2 className="text-2xl font-semibold text-[#27312c]">{labels.settings}</h2>
      <div className="mt-5 divide-y divide-[#e4e7df]">
        <SettingsRow title={labels.account}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-[#68716b]">{labels.currentUser}</span>
            <span className="rounded-md bg-[#eef3ed] px-3 py-2 text-sm font-semibold text-[#31564c]">{username}</span>
            <button type="button" onClick={onLogout} className="h-10 rounded-md border border-[#d1d8cf] bg-white px-4 text-sm font-semibold text-[#3f5f56] hover:bg-[#f3f6f1]">
              {labels.logout}
            </button>
          </div>
        </SettingsRow>
        <SettingsRow title={labels.aboutTitle}>
          <div>
            <p className="text-sm leading-6 text-[#68716b]">{labels.settingsAboutBody}</p>
            <a href="#/about" className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-[#31564c] hover:underline">
              {labels.settingsAboutLink} →
            </a>
          </div>
        </SettingsRow>
        <SettingsRow title={labels.language}>
          <LanguageSelect value={settings.locale} onChange={(locale) => onUpdateSettings({ ...settings, locale })} />
        </SettingsRow>
        <SettingsRow title={labels.fontSize}>
          <div className="grid max-w-xl grid-cols-3 gap-2" role="group" aria-label={labels.fontSize}>
            <SegmentButton active={settings.fontSize === 'small'} onClick={() => onUpdateSettings({ ...settings, fontSize: 'small' })}>
              {labels.fontSizeSmall}
            </SegmentButton>
            <SegmentButton active={settings.fontSize === 'standard'} onClick={() => onUpdateSettings({ ...settings, fontSize: 'standard' })}>
              {labels.fontSizeStandard}
            </SegmentButton>
            <SegmentButton active={settings.fontSize === 'large'} onClick={() => onUpdateSettings({ ...settings, fontSize: 'large' })}>
              {labels.fontSizeLarge}
            </SegmentButton>
          </div>
        </SettingsRow>
        <SettingsRow title={labels.display}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle checked={settings.showReviewRuby} label={labels.reviewRuby} onChange={(checked) => onUpdateSettings({ ...settings, showReviewRuby: checked })} />
            <Toggle checked={settings.showExplanationRuby} label={labels.explanationRuby} onChange={(checked) => onUpdateSettings({ ...settings, showExplanationRuby: checked })} />
          </div>
        </SettingsRow>
        <SettingsRow title={labels.answerFeedbackMode}>
          <div className="grid gap-2 sm:grid-cols-2">
            <SegmentButton active={settings.feedbackMode === 'immediate'} onClick={() => onUpdateSettings({ ...settings, feedbackMode: 'immediate' })}>
              {labels.feedbackModeImmediate}
            </SegmentButton>
            <SegmentButton active={settings.feedbackMode === 'batch'} onClick={() => onUpdateSettings({ ...settings, feedbackMode: 'batch' })}>
              {labels.feedbackModeBatch}
            </SegmentButton>
          </div>
        </SettingsRow>
      </div>
    </section>
  );
}

function SettingsRow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-3 py-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-start">
      <h3 className="text-sm font-semibold text-[#46514c]">{title}</h3>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function LanguageSelect({ value, onChange }: { value: Locale; onChange: (locale: Locale) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value as Locale)} className="h-11 rounded-md border border-[#c8bcae] bg-white px-3 text-sm font-semibold text-[#574f48]" aria-label="Language">
      <option value="zh-CN">简体中文</option>
      <option value="ja">日本語</option>
      <option value="en">English</option>
    </select>
  );
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-[#d9d0c3] bg-white px-3 py-2 text-sm font-semibold text-[#4f5651]">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-[#24473f]" />
    </label>
  );
}

function SegmentButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`min-h-10 min-w-0 rounded-md border px-3 py-2 text-sm font-semibold break-words ${active ? 'border-[#24473f] bg-[#24473f] text-white' : 'border-[#d9d0c3] bg-white text-[#4f5651] hover:bg-[#f6eee3]'}`}>
      {children}
    </button>
  );
}
