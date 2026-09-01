import type { ReactNode } from 'react';
import { configurableMemoryCardFields, type MemoryCardField } from '../../domain/memoryCards';
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
        <SettingsRow title={labels.aboutTitle} desktopOnly>
          <p className="text-sm leading-6 text-[#68716b]">{labels.settingsAboutBody}</p>
          <a href="#/about" className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-[#31564c] hover:underline">
            {labels.settingsAboutLink} →
          </a>
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
        <SettingsRow title={memoryCardSettingsCopy[settings.locale].title}>
          <MemoryCardFieldSettings settings={settings} onUpdateSettings={onUpdateSettings} />
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

const memoryCardSettingsCopy: Record<Locale, {
  title: string;
  body: string;
  front: string;
  back: string;
  exampleNote: string;
  fieldLabels: Record<MemoryCardField, string>;
}> = {
  'zh-CN': {
    title: '记忆卡内容',
    body: '分别选择正面和背面显示的学习内容。当前卡片没有的字段会自动跳过。',
    front: '卡片正面',
    back: '卡片背面',
    exampleNote: '例句固定显示在背面，不需要在这里选择。',
    fieldLabels: {
      original: '原词 / 语法', reading: '读音', jlpt_level: 'JLPT 等级', part_of_speech: '词性',
      meaning: '释义', meaning_ja: '日文释义', paraphrase_ja: '日文换言', core_memory: '记忆点', explanation_zh: '详细解析',
      analysis: '补充分析', grammar_forms: '接续形式', grammar_features: '语法特征', base_form: '基本形', conjugations: '活用',
      collocations: '常用搭配', comparisons: '比较辨析', usage_register: '使用语域', exam_register_zh: '考试提示', everyday_alternatives: '日常替代表达',
      notes: '备注', tags: '标签', source_grammar_point: '来源语法点', source_chat_summary: '学习来源摘要',
    },
  },
  ja: {
    title: '記憶カードの内容',
    body: '表面と裏面に表示する学習内容を個別に選択します。データがない項目は自動的に省略されます。',
    front: 'カード表面',
    back: 'カード裏面',
    exampleNote: '例文は常に裏面に表示されるため、ここで選択する必要はありません。',
    fieldLabels: {
      original: '語句 / 文法', reading: '読み方', jlpt_level: 'JLPT レベル', part_of_speech: '品詞',
      meaning: '意味', meaning_ja: '日本語の意味', paraphrase_ja: '日本語の言い換え', core_memory: '記憶ポイント', explanation_zh: '詳しい解説',
      analysis: '補足分析', grammar_forms: '接続形式', grammar_features: '文法の特徴', base_form: '基本形', conjugations: '活用',
      collocations: 'よく使う組み合わせ', comparisons: '比較・使い分け', usage_register: '使用場面', exam_register_zh: '試験ポイント', everyday_alternatives: '日常表現',
      notes: 'メモ', tags: 'タグ', source_grammar_point: '出典文法項目', source_chat_summary: '学習元の要約',
    },
  },
  en: {
    title: 'Memory card content',
    body: 'Choose learning fields for the front and back independently. Missing fields are skipped automatically.',
    front: 'Card front',
    back: 'Card back',
    exampleNote: 'Example sentences always appear on the back and do not need to be selected here.',
    fieldLabels: {
      original: 'Word / grammar', reading: 'Reading', jlpt_level: 'JLPT level', part_of_speech: 'Part of speech',
      meaning: 'Meaning', meaning_ja: 'Japanese definition', paraphrase_ja: 'Japanese paraphrase', core_memory: 'Memory point', explanation_zh: 'Detailed explanation',
      analysis: 'Additional analysis', grammar_forms: 'Connection forms', grammar_features: 'Grammar features', base_form: 'Base form', conjugations: 'Conjugations',
      collocations: 'Collocations', comparisons: 'Comparisons', usage_register: 'Usage register', exam_register_zh: 'Exam tip', everyday_alternatives: 'Everyday alternatives',
      notes: 'Notes', tags: 'Tags', source_grammar_point: 'Source grammar point', source_chat_summary: 'Learning source summary',
    },
  },
};

function MemoryCardFieldSettings({ settings, onUpdateSettings }: { settings: DisplaySettings; onUpdateSettings: (settings: DisplaySettings) => void }) {
  const copy = memoryCardSettingsCopy[settings.locale];
  const update = (side: 'front' | 'back', field: MemoryCardField) => {
    const key = side === 'front' ? 'memoryCardFrontFields' : 'memoryCardBackFields';
    const current = settings[key];
    const selected = current.includes(field);
    if (selected && current.length === 1) return;
    const next = selected ? current.filter((item) => item !== field) : [...current, field];
    onUpdateSettings({ ...settings, [key]: next });
  };
  return (
    <div className="grid gap-4">
      <p className="m-0 text-sm leading-6 text-[#68716b]">{copy.body}</p>
      {(['front', 'back'] as const).map((side) => {
        const selected = side === 'front' ? settings.memoryCardFrontFields : settings.memoryCardBackFields;
        return (
          <fieldset key={side} className="rounded-md border border-[#d9d0c3] bg-white p-3">
            <legend className="px-1 text-sm font-semibold text-[#46514c]">{side === 'front' ? copy.front : copy.back}</legend>
            <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {configurableMemoryCardFields.map((field) => {
                const active = selected.includes(field);
                const lastSelected = active && selected.length === 1;
                return (
                  <button
                    key={field}
                    type="button"
                    aria-pressed={active}
                    disabled={lastSelected}
                    onClick={() => update(side, field)}
                    className={`min-h-10 rounded-md border px-2 py-2 text-left text-xs font-semibold disabled:cursor-not-allowed ${active ? 'border-[#24473f] bg-[#eef3ed] text-[#24473f]' : 'border-[#e1ddd5] bg-white text-[#68716b] hover:bg-[#f7f5ef]'}`}
                  >
                    <span aria-hidden="true" className="mr-1">{active ? '✓' : '○'}</span>{copy.fieldLabels[field]}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
      <p className="m-0 text-xs leading-5 text-[#7d837e]">{copy.exampleNote}</p>
    </div>
  );
}

function SettingsRow({ title, children, desktopOnly = false }: { title: string; children: ReactNode; desktopOnly?: boolean }) {
  return (
    <div className={`gap-3 py-4 md:grid md:grid-cols-[180px_minmax(0,1fr)] md:items-start ${desktopOnly ? 'hidden md:grid' : 'grid'}`}>
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
