import { itemAnalysis, itemMeaning, itemMemory } from './items';
import { translations } from '../i18n/translations';
import type { Deck, Locale, Question, QuestionKind, VocabItem } from '../types';

export function buildQuestions(items: VocabItem[], locale: Locale): Question[] {
  const labels = translations[locale];
  const questions: Question[] = [];

  items.forEach((item, index) => {
    const allowedKinds = new Set(questionKindsForItem(item));
    const example = item.examples?.[0]?.ja;
    const sentence = questionSentence(item);
    const kanaSentence = item.reading ? questionSentence(item, item.reading) : sentence;
    const context = example ?? sentence;

    if (allowedKinds.has('grammar')) {
      questions.push(buildGrammarQuestion(item, items, index, locale));
    }

    if (allowedKinds.has('moji_goi')) {
      questions.push(buildMojiGoiQuestion(item, items, index, locale));
    }

    if (allowedKinds.has('meaning')) {
      const meaningAnswer = item.paraphrase_ja ?? item.meaning_ja;
      if (!meaningAnswer) {
        return;
      }
      const meaningChoices = choices(meaningAnswer, questionPool(item, 'meaning', items), index + 1, fallbackChoicesForKind(item, 'meaning'));
      questions.push({
        id: `${item.id}-meaning-jlpt-v1`,
        itemId: item.id,
        kind: 'meaning',
        title: labels.meaningTitle,
        instruction: labels.meaningInstruction,
        prompt: sentence,
        promptTarget: item.original,
        choices: meaningChoices,
        answer: meaningAnswer,
        ...buildQuestionExplanation(item, meaningChoices, 'meaning', items, locale, context),
      });
    }

    if (item.reading && allowedKinds.has('kanji_to_kana')) {
      const isProperName = item.deck === 'name_reading' || item.type === 'proper_name';
      const kanjiToKanaChoices = choices(item.reading, questionPool(item, 'kanji_to_kana', items), index + 3, fallbackChoicesForKind(item, 'kanji_to_kana'));
      questions.push({
        id: isProperName ? `${item.id}-name-reading-v1` : `${item.id}-kanji-to-kana-jlpt-v1`,
        itemId: item.id,
        kind: 'kanji_to_kana',
        title: isProperName ? labels.nameReadingTitle : labels.kanjiToKanaTitle,
        instruction: isProperName ? labels.nameReadingInstruction : labels.kanjiToKanaInstruction,
        prompt: sentence,
        promptTarget: item.original,
        choices: kanjiToKanaChoices,
        answer: item.reading,
        ...buildQuestionExplanation(item, kanjiToKanaChoices, 'kanji_to_kana', items, locale, context),
      });
    }

    if (item.reading && allowedKinds.has('kana_to_kanji')) {
      const kanaToKanjiChoices = choices(item.original, questionPool(item, 'kana_to_kanji', items), index + 2, fallbackChoicesForKind(item, 'kana_to_kanji'));
      questions.push({
        id: `${item.id}-kana-to-kanji-jlpt-v1`,
        itemId: item.id,
        kind: 'kana_to_kanji',
        title: labels.kanaToKanjiTitle,
        instruction: labels.kanaToKanjiInstruction,
        prompt: kanaSentence,
        promptTarget: item.reading,
        choices: kanaToKanjiChoices,
        answer: item.original,
        ...buildQuestionExplanation(item, kanaToKanjiChoices, 'kana_to_kanji', items, locale, context),
      });
    }
  });

  return questions;
}

function questionKindsForItem(item: VocabItem): QuestionKind[] {
  if (item.deck === 'name_reading' || item.type === 'proper_name') {
    return item.reading && containsKanji(item.original) && fallbackChoicesForKind(item, 'kanji_to_kana').length >= 3
      ? ['kanji_to_kana']
      : [];
  }

  const hasContext = hasUsableQuestionContext(item);
  const isGrammarItem = item.deck === 'grammar_expression' || item.type === 'verb_form' || item.type === 'expression';
  const inferredKinds: QuestionKind[] = [];

  if (isGrammarItem) {
    if (hasContext) {
      inferredKinds.push('grammar');
    }
    if (item.paraphrase_ja || item.meaning_ja) {
      inferredKinds.push('meaning');
    }
  } else {
    if (hasContext) {
      inferredKinds.push('moji_goi');
    }
    if (item.paraphrase_ja || item.meaning_ja) {
      inferredKinds.push('meaning');
    }
    if (hasContext && item.reading && containsKanji(item.original) && questionPool(item, 'kanji_to_kana', [item]).length >= 3) {
      inferredKinds.push('kanji_to_kana');
      if (['N2', 'N3', 'N4', 'N5'].includes(item.jlpt_level ?? '')) {
        inferredKinds.push('kana_to_kanji');
      }
    }
  }

  const listedKinds = item.question_kinds ?? [];
  return unique([...inferredKinds, ...listedKinds]).filter((kind) => {
    if (kind === 'grammar') return isGrammarItem && hasContext;
    if (kind === 'moji_goi') return hasContext;
    if (kind === 'meaning') return Boolean(item.paraphrase_ja || item.meaning_ja);
    if (kind === 'kana_to_kanji') return hasContext && Boolean(item.reading) && containsKanji(item.original) && item.jlpt_level !== 'N1';
    if (kind === 'kanji_to_kana') return hasContext && Boolean(item.reading) && containsKanji(item.original) && questionPool(item, 'kanji_to_kana', [item]).length >= 3;
    return false;
  });
}

function hasUsableQuestionContext(item: VocabItem) {
  return Boolean(
    item.examples?.some((candidate) => candidate.ja.includes(item.original))
    || item.collocations?.some((candidate) => candidate.includes(item.original)),
  );
}

function containsKanji(value: string) {
  return /[\u3400-\u9fff々〆ヵヶ]/u.test(value);
}

function questionPool(item: VocabItem, kind: QuestionKind, items: VocabItem[]) {
  const controlledDistractors = item.question_distractors?.[kind];
  if (controlledDistractors) {
    return controlledDistractors;
  }

  const suitableItems = items.filter(
    (candidate) => candidate.id !== item.id && questionKindsForItem(candidate).includes(kind),
  );
  const sameDeckItems = suitableItems.filter((candidate) => candidate.deck === item.deck);
  const candidates = sameDeckItems.length >= 3 ? sameDeckItems : suitableItems;

  if (kind === 'meaning') {
    return candidates.map((candidate) => candidate.paraphrase_ja).filter(Boolean) as string[];
  }
  if (kind === 'kanji_to_kana') {
    const nameReadingFallback = item.deck === 'name_reading' || item.type === 'proper_name'
      ? ['さとう', 'たなか', 'やまだ', 'すずき', 'はるか', 'ともこ', 'ちさと', 'しんたに', 'はっとり']
      : [];
    return unique([...readingDistractors(item.reading ?? ''), ...nameReadingFallback]).filter((choice) => choice !== item.reading);
  }
  return candidates.map((candidate) => candidate.original);
}

function readingDistractors(reading: string) {
  const replacements: [string, string][] = [
    ['てい', 'たい'],
    ['せい', 'しょう'],
    ['せい', 'さい'],
    ['せい', 'せ'],
    ['しょう', 'せい'],
    ['こう', 'こ'],
    ['そう', 'そ'],
    ['けい', 'け'],
    ['ぼう', 'ほう'],
    ['ほう', 'ぼう'],
    ['かん', 'がん'],
    ['にん', 'じん'],
    ['く', 'っ'],
    ['っ', 'く'],
  ];
  const variants = replacements
    .map(([source, target]) => reading.includes(source) ? reading.replace(source, target) : '')
    .filter(Boolean);
  const synthetic = [
    reading.replace(/う$/u, ''),
    reading.replace(/(.)\1/u, '$1'),
    reading.replace('ん', 'っ'),
    reading.replace('ん', 'い'),
    reading.replace('ん', 'んで'),
    reading.length > 2 ? `${reading.slice(0, -1)}い` : '',
    `${reading.slice(0, Math.max(1, reading.length - 1))}ん`,
  ];
  return unique([...variants, ...synthetic].filter((value) => value && value !== reading)).slice(0, 6);
}

export function deckLabelsFor(locale: Locale): Record<Deck | 'all', string> {
  const labels = translations[locale];
  return {
    all: labels.deckAll,
    n1_vocab: labels.deckN1,
    grammar_expression: labels.deckExpression,
    name_reading: labels.deckName,
  };
}

function buildGrammarQuestion(item: VocabItem, allItems: VocabItem[], index: number, locale: Locale): Question {
  const labels = translations[locale];
  const example = item.examples?.find((candidate) => candidate.ja.includes(item.original))?.ja;
  const context = example ?? questionSentence(item);
  const prompt = example ? example.replace(item.original, '（　）') : questionSentence(item, '（　）');
  const choiceList = choices(item.original, questionPool(item, 'grammar', allItems), index + 5, fallbackChoicesForKind(item, 'grammar'));

  return {
    id: `${item.id}-grammar-jlpt-v1`,
    itemId: item.id,
    kind: 'grammar',
    title: labels.grammarTitle,
    instruction: labels.grammarInstruction,
    prompt,
    choices: choiceList,
    answer: item.original,
    ...buildQuestionExplanation(item, choiceList, 'grammar', allItems, locale, context),
  };
}

function buildMojiGoiQuestion(item: VocabItem, allItems: VocabItem[], index: number, locale: Locale): Question {
  const labels = translations[locale];
  const example = item.examples?.find((candidate) => candidate.ja.includes(item.original))?.ja;
  const context = example ?? questionSentence(item);
  const prompt = context.replace(item.original, '（　）');
  const choiceList = choices(item.original, questionPool(item, 'moji_goi', allItems), index + 4, fallbackChoicesForKind(item, 'moji_goi'));

  return {
    id: `${item.id}-moji-goi-jlpt-v1`,
    itemId: item.id,
    kind: 'moji_goi',
    title: labels.mojiGoiTitle,
    instruction: labels.mojiGoiInstruction,
    prompt,
    choices: choiceList,
    answer: item.original,
    ...buildQuestionExplanation(item, choiceList, 'moji_goi', allItems, locale, context),
  };
}

function buildQuestionExplanation(
  item: VocabItem,
  choiceList: string[],
  kind: QuestionKind,
  allItems: VocabItem[],
  locale: Locale,
  context: string,
): Pick<Question, 'context' | 'correctReason' | 'memoryPoint' | 'choiceAnalysis'> {
  const answer = answerForKind(item, kind, locale);
  return {
    context,
    correctReason: correctReasonFor(item, kind, locale, context),
    memoryPoint: memoryPointFor(item, locale),
    choiceAnalysis: choiceList.map((choice) => ({
      choice,
      correct: choice === answer,
      explanation: choiceExplanationFor(choice, choice === answer, item, kind, allItems, locale),
    })),
  };
}

function answerForKind(item: VocabItem, kind: QuestionKind, locale: Locale) {
  if (kind === 'meaning') {
    return item.paraphrase_ja ?? shortMeaning(itemMeaning(item, locale));
  }
  if (kind === 'kanji_to_kana') {
    return item.reading ?? '';
  }
  return item.original;
}

function correctReasonFor(item: VocabItem, kind: QuestionKind, locale: Locale, context: string) {
  const meaning = itemMeaning(item, locale);
  const reading = item.reading ?? '';
  const collocation = item.collocations?.find((value) => value.includes(item.original)) ?? context;
  const isProperNameReading = kind === 'kanji_to_kana' && (item.deck === 'name_reading' || item.type === 'proper_name');

  if (isProperNameReading) {
    if (locale === 'ja') return `この項目では「${item.original}」という人名・地名のまとまりを「${reading}」と読みます。人名の読みは漢字一字ずつから一意に決められないため、教材・音声・本人の表記など、信頼できる出典に基づく読みを答えます。`;
    if (locale === 'en') return `In this entry, the full personal or place name “${item.original}” is read “${reading}.” Name readings cannot always be derived uniquely from each kanji, so the answer follows the reading established by the source.`;
    return `本词条记录的整体人名或地名「${item.original}」读作「${reading}」。人名读音通常不能按单个汉字机械拼接，因此应以教材、音频或本人标注等可靠来源为准。`;
  }

  if (locale === 'ja') {
    if (kind === 'grammar') return `「${context}」では、手順や手続きを実際に経ることを表す「${item.original}」が文の接続と意味に合います。${itemAnalysis(item, locale)}`;
    if (kind === 'meaning') return `「${item.original}」は「${meaning}」という意味です。「${context}」でもこの意味で使われているため、この言い換えが最も適切です。`;
    if (kind === 'kana_to_kanji') return `「${reading}」の表記は「${item.original}」です。「${context}」の語彙と一致し、意味は「${meaning}」です。`;
    if (kind === 'kanji_to_kana') return `「${item.original}」の読みは「${reading}」です。文中でも意味は「${meaning}」で、読み方は変わりません。`;
    return `「${item.original}」は「${meaning}」を表します。「${collocation}」のような結び付きが自然で、文脈に最も合います。`;
  }

  if (locale === 'en') {
    if (kind === 'grammar') return `In “${context},” “${item.original}” fits both the sentence connection and the intended function of actually going through a step or procedure. ${itemAnalysis(item, locale)}`;
    if (kind === 'meaning') return `“${item.original}” means “${meaning}.” It keeps that meaning in “${context},” so this is the closest paraphrase.`;
    if (kind === 'kana_to_kanji') return `The kana “${reading}” is written “${item.original}.” It matches the word used in “${context}” and means “${meaning}.”`;
    if (kind === 'kanji_to_kana') return `“${item.original}” is read “${reading}.” The reading stays the same in this context, where the word means “${meaning}.”`;
    return `“${item.original}” means “${meaning}.” It forms a natural expression such as “${collocation},” which fits the sentence context.`;
  }

  if (kind === 'grammar') return `在「${context}」中，需要表达实际经过步骤或手续，「${item.original}」在接续形式和语义功能上都成立。${itemAnalysis(item, locale)}`;
  if (kind === 'meaning') return `「${item.original}」的意思是“${meaning}”。在「${context}」中仍然使用这个核心义，因此该释义最接近原词。`;
  if (kind === 'kana_to_kanji') return `假名「${reading}」对应的正确表记是「${item.original}」。它与「${context}」中的词一致，意思是“${meaning}”。`;
  if (kind === 'kanji_to_kana') return `「${item.original}」读作「${reading}」。它在本句中的意思是“${meaning}”，语境不会改变这个读音。`;
  return `「${item.original}」表示“${meaning}”。它可以形成「${collocation}」这样的自然搭配，词义和句子结构都符合本题语境。`;
}

function choiceExplanationFor(
  choice: string,
  correct: boolean,
  target: VocabItem,
  kind: QuestionKind,
  allItems: VocabItem[],
  locale: Locale,
) {
  const isProperNameReading = kind === 'kanji_to_kana' && (target.deck === 'name_reading' || target.type === 'proper_name');

  if (correct) {
    if (kind === 'grammar') {
      if (locale === 'ja') return `文の接続、意味、自然な組み合わせのすべてに合う表現です。`;
      if (locale === 'en') return `This expression matches the sentence connection, meaning, and natural usage.`;
      return `这个表达同时符合句子接续、语义功能和自然搭配。`;
    }
    if (isProperNameReading) {
      if (locale === 'ja') return `この項目に記録されている「${target.original}」全体の読みです。`;
      if (locale === 'en') return `This is the reading recorded for the full name “${target.original}” in this entry.`;
      return `这是本词条为「${target.original}」记录的整体读法。`;
    }
    if (locale === 'ja') return kind === 'kanji_to_kana' ? `「${target.original}」の正しい読みです。` : `対象語の意味・表記・文脈に一致する正解です。`;
    if (locale === 'en') return kind === 'kanji_to_kana' ? `This is the correct reading of “${target.original}.”` : `This matches the target word's meaning, form, and context.`;
    return kind === 'kanji_to_kana' ? `这是「${target.original}」的正确读音。` : `这个选项与目标词的词义、表记和语境一致。`;
  }

  const candidate = itemForChoice(choice, kind, allItems);
  if (!candidate) {
    const comparison = kind === 'grammar' ? target.comparisons?.find((entry) => entry.target === choice) : undefined;
    if (comparison && locale === 'zh-CN') {
      const difference = comparison.difference_zh.replace(/[。！？!?]$/u, '');
      return `「${choice}」${difference}，但本句需要表达实际经过「手続き」，不是把某项信息作为判断依据。`;
    }
    if (kind === 'grammar') {
      if (locale === 'ja') return `「${choice}」は、この文が求める接続または「手順・手続きを実際に経る」という意味に合いません。`;
      if (locale === 'en') return `“${choice}” does not match the required connection or the meaning of actually going through a step or procedure.`;
      return `「${choice}」不符合本句需要的接续形式，或不能表达实际经过步骤、手续的含义。`;
    }
    if (isProperNameReading) {
      if (locale === 'ja') return `「${choice}」は、この項目に記録された「${target.original}」全体の読みではありません。人名は漢字を一字ずつ機械的に読みません。`;
      if (locale === 'en') return `“${choice}” is not the recorded reading of the full name “${target.original}.” A name should not be derived mechanically one kanji at a time.`;
      return `「${choice}」不是本词条记录的「${target.original}」整体读法。人名不能只按单个汉字机械拼读。`;
    }
    if (kind === 'kana_to_kanji') {
      if (locale === 'ja') return `「${choice}」は「${target.reading}」の標準的な表記ではありません。文中の意味に合う漢字は「${target.original}」です。`;
      if (locale === 'en') return `“${choice}” is not the standard spelling of “${target.reading}” in this context. The matching kanji form is “${target.original}.”`;
      return `「${choice}」不是假名「${target.reading}」在该语境中的正确表记；符合词义的汉字是「${target.original}」。`;
    }
    if (kind === 'kanji_to_kana') {
      if (locale === 'ja') return `「${choice}」は「${target.original}」の読みではありません。音読み・訓読みや濁音、長音の形に惑わされないことがポイントです。`;
      if (locale === 'en') return `“${choice}” is not the reading of “${target.original}.” It is a distractor based on a plausible on/kun, voicing, or vowel-length confusion.`;
      return `「${choice}」不是「${target.original}」的读音，它是利用音读、训读、浊音或长音混淆设置的干扰项。`;
    }
    if (kind === 'meaning') {
      if (locale === 'ja') return `「${choice}」は、この文で使われている「${target.original}」の中心的な意味の言い換えにはなりません。`;
      if (locale === 'en') return `“${choice}” is not the closest Japanese paraphrase of “${target.original}” as used in this sentence.`;
      return `「${choice}」不是「${target.original}」在本句语境中最接近的日语言い換え。`;
    }
    if (kind === 'moji_goi') {
      if (locale === 'ja') return `「${choice}」では文の意味、品詞、または自然な語の結び付きが合いません。`;
      if (locale === 'en') return `“${choice}” does not fit the sentence's meaning, part of speech, or natural word combination.`;
      return `「${choice}」不符合本句需要的词义、词性或自然搭配。`;
    }
    if (locale === 'ja') return `対象語の意味または読みと一致しません。`;
    if (locale === 'en') return `This does not match the target word's meaning or reading.`;
    return `这个选项与目标词要求的词义或读音不一致。`;
  }

  const candidateMeaning = itemMeaning(candidate, locale);
  const candidateCollocation = candidate.collocations?.find((value) => value.includes(candidate.original));

  if (locale === 'ja') {
    if (kind === 'kana_to_kanji') return `「${candidate.original}」の読みは「${candidate.reading ?? '不明'}」で、「${target.reading}」の表記ではありません。`;
    if (kind === 'kanji_to_kana') return isProperNameReading ? `「${choice}」は別の項目「${candidate.original}」の読みで、「${target.original}」全体の読みとは異なります。` : `「${choice}」は「${candidate.original}」の読みであり、「${target.original}」の読みではありません。`;
    if (kind === 'meaning') return `この意味は「${candidate.original}」（${candidateMeaning}）に近く、「${target.original}」の中心的な意味とは異なります。`;
    return `「${candidate.original}」は「${candidateMeaning}」を表し${candidateCollocation ? `、「${candidateCollocation}」のように使います` : 'ます'}。本問の意味と結び付きません。`;
  }

  if (locale === 'en') {
    if (kind === 'kana_to_kanji') return `“${candidate.original}” is read “${candidate.reading ?? 'unknown'},” so it is not the spelling of “${target.reading}.”`;
    if (kind === 'kanji_to_kana') return isProperNameReading ? `“${choice}” belongs to a different entry, “${candidate.original},” not to the full name “${target.original}.”` : `“${choice}” is the reading of “${candidate.original},” not “${target.original}.”`;
    if (kind === 'meaning') return `This meaning is closer to “${candidate.original}” (${candidateMeaning}), not the core meaning of “${target.original}.”`;
    return `“${candidate.original}” means “${candidateMeaning}”${candidateCollocation ? ` and is used in expressions such as “${candidateCollocation}”` : ''}. It does not fit this sentence.`;
  }

  if (kind === 'kana_to_kanji') return `「${candidate.original}」读作「${candidate.reading ?? 'unknown'}」，不是假名「${target.reading}」对应的表记。`;
  if (kind === 'kanji_to_kana') return isProperNameReading ? `「${choice}」是另一个词条「${candidate.original}」的读音，不是「${target.original}」的整体读法。` : `「${choice}」是「${candidate.original}」的读音，不是「${target.original}」的读音。`;
  if (kind === 'meaning') return `这个释义更接近「${candidate.original}」（${candidateMeaning}），与「${target.original}」的核心意思不同。`;
  return `「${candidate.original}」表示“${candidateMeaning}”${candidateCollocation ? `，常见搭配是「${candidateCollocation}」` : ''}，与本句需要表达的意思不符。`;
}

function itemForChoice(choice: string, kind: QuestionKind, items: VocabItem[]) {
  if (kind === 'meaning') {
    return items.find((item) => item.paraphrase_ja === choice);
  }
  if (kind === 'kanji_to_kana') {
    return items.find((item) => item.reading === choice);
  }
  return items.find((item) => item.original === choice);
}

function memoryPointFor(item: VocabItem, locale: Locale) {
  const points = [itemMemory(item, locale), itemAnalysis(item, locale)];
  if (locale === 'zh-CN') {
    points.push(...(item.comparisons?.slice(0, 2).map((comparison) => `与「${comparison.target}」相比：${comparison.difference_zh}`) ?? []));
  }
  return unique(points.filter(Boolean) as string[]).join(' ');
}

function choices(answer: string, pool: string[], salt: number, fallback: string[] = []) {
  const distractors = unique([...pool, ...fallback].filter((item) => item && item !== answer)).slice(0, 12);
  const selected = [answer, ...rotate(distractors, salt).slice(0, 3)];
  return rotate(unique(selected), salt % 4);
}

function fallbackChoicesForKind(item: VocabItem, kind: QuestionKind) {
  if (kind === 'kanji_to_kana') {
    return readingDistractors(item.reading ?? '');
  }
  if (kind === 'kana_to_kanji' || kind === 'moji_goi' || kind === 'grammar') {
    return ['測定', '認定', '養成', '豊富', '概観', '経過', '辛抱', '目次'].filter((choice) => choice !== item.original);
  }
  return [
    '一定の基準に基づいて正式に認めること。',
    '数量や種類が多く十分にあること。',
    '物事の全体を大まかに見渡すこと。',
    '苦しさや不便を我慢して耐えること。',
    '時間が過ぎ、物事がある段階まで進むこと。',
    '能力や人材を時間をかけて育てること。',
  ].filter((choice) => choice !== item.paraphrase_ja && choice !== item.meaning_ja);
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

function questionSentence(item: VocabItem, replacement = item.original) {
  const example = item.examples?.[0]?.ja;
  if (example) {
    return example.replace(item.original, replacement);
  }
  return replacement;
}
