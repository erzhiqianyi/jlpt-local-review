import type { Locale, LocalizedText, VocabItem } from '../types';

export function localized(item: VocabItem, locale: Locale, key: keyof LocalizedText) {
  return item.localizations?.[locale]?.[key];
}

export function itemMeaning(item: VocabItem, locale: Locale) {
  return localized(item, locale, 'meaning') ?? item.meaning_zh;
}

export function itemMemory(item: VocabItem, locale: Locale) {
  return localized(item, locale, 'core_memory') ?? item.core_memory;
}

export function itemAnalysis(item: VocabItem, locale: Locale) {
  return localized(item, locale, 'analysis') ?? item.analysis;
}
