export const memoryCardFields = [
  'original',
  'reading',
  'jlpt_level',
  'part_of_speech',
  'meaning',
  'meaning_ja',
  'paraphrase_ja',
  'core_memory',
  'explanation_zh',
  'analysis',
  'grammar_forms',
  'grammar_features',
  'base_form',
  'conjugations',
  'collocations',
  'comparisons',
  'usage_register',
  'exam_register_zh',
  'everyday_alternatives',
  'notes',
  'tags',
  'source_grammar_point',
  'source_chat_summary',
] as const;

export type MemoryCardField = typeof memoryCardFields[number];

export const configurableMemoryCardFields: MemoryCardField[] = memoryCardFields.filter((field) => field !== 'paraphrase_ja');

export const defaultMemoryCardFrontFields: MemoryCardField[] = ['original'];
export const defaultMemoryCardBackFields: MemoryCardField[] = ['original', 'grammar_forms', 'meaning', 'core_memory'];

const memoryCardFieldSet = new Set<string>(configurableMemoryCardFields);

export function normalizeMemoryCardFields(value: unknown, fallback: MemoryCardField[]): MemoryCardField[] {
  if (!Array.isArray(value)) return [...fallback];
  const fields = [...new Set(value.filter((field): field is MemoryCardField => typeof field === 'string' && memoryCardFieldSet.has(field)))];
  return fields.length ? fields : [...fallback];
}
