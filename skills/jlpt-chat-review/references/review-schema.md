# Review Data Schema

The website reads this file:

```text
public/data/review-data.json
```

Top-level shape:

```json
{
  "generated_at": "2026-08-27T20:20:00+09:00",
  "items": []
}
```

Each item:

```json
{
  "id": "n1-vocab-001",
  "date": "2026-08-27",
  "input_at": "2026-08-27T20:20:00+09:00",
  "deck": "n1_vocab",
  "type": "word",
  "jlpt_level": "N1",
  "original": "測定",
  "reading": "そくてい",
  "paraphrase_ja": "数値を測る",
  "question_kinds": ["moji_goi", "meaning", "kanji_to_kana"],
  "question_distractors": {
    "kanji_to_kana": ["そってい", "そくじょう", "しょくてい"]
  },
  "ruby_terms": [
    {
      "text": "測定",
      "reading": "そくてい"
    }
  ],
  "meaning_zh": "测定、测量，用一定方法或器具测出数值。",
  "core_memory": "按标准、用仪器把客观数据测出来。",
  "localizations": {
    "en": {
      "meaning": "Measurement; determining a numeric value with a method or instrument.",
      "core_memory": "Measure objective data by a standard method.",
      "analysis": "Use it for measurable quantities such as temperature, blood pressure, concentration, or speed."
    },
    "ja": {
      "meaning": "一定の方法や器具で数値を調べること。",
      "core_memory": "基準や器具を使って客観的な数値を出す。",
      "analysis": "温度・血圧・濃度・速度など、数値化できる対象で使いやすい。"
    }
  },
  "part_of_speech": "名词・サ变动词",
  "collocations": ["血圧を測定する", "測定結果"],
  "collocation_ruby": [
    [
      { "text": "血圧", "reading": "けつあつ" },
      { "text": "測定", "reading": "そくてい" }
    ],
    [
      { "text": "測定", "reading": "そくてい" },
      { "text": "結果", "reading": "けっか" }
    ]
  ],
  "examples": [
    {
      "ja": "室内の温度を測定した。",
      "ruby": [
        { "text": "室内", "reading": "しつない" },
        { "text": "温度", "reading": "おんど" },
        { "text": "測定", "reading": "そくてい" }
      ],
      "zh": "测定了室内温度。"
    }
  ],
  "comparisons": [
    {
      "target": "測る",
      "difference_zh": "日常说“量一下”；測定する更正式、客观。"
    }
  ],
  "analysis": "看到温度、血压、浓度、速度等可数值化对象时，理解为按标准测出数值。",
  "tags": ["漢語", "正式語", "技术"]
}
```

## Decks

- `n1_vocab`: ordinary JLPT vocabulary.
- `grammar_expression`: expressions, forms, and grammar-like vocabulary.
- `name_reading`: Japanese name or place-name readings.

## Types

Recommended values:

- `word`
- `proper_name`
- `expression`
- `verb_form`
- `question`

## Required Fields

- `id`
- `date`
- `input_at`
- `deck`
- `type`
- `original`
- `meaning_zh`
- `core_memory`

## Optional But Useful Fields

- `reading`
- `paraphrase_ja` for the Japanese answer used by `meaning` / `言い換え類義`
- `ruby_terms`
- `localizations`
- `jlpt_level`
- `part_of_speech`
- `collocations`
- `collocation_ruby`
- `examples`
- `comparisons`
- `analysis`
- `tags`
- `question_kinds`
- `question_distractors`

## Furigana Fields

Every Japanese field that contains kanji should have kana reading metadata.

Use `ruby_terms` arrays instead of embedding readings directly into display text:

```json
[
  { "text": "測定", "reading": "そくてい" },
  { "text": "結果", "reading": "けっか" }
]
```

Rules:

- `text` is the exact kanji-containing substring found in the Japanese field.
- `reading` is hiragana unless the source requires katakana.
- Do not add readings for kana-only text.
- For uncertain proper-name readings, include the most likely reading and mention uncertainty in `analysis`.
- Keep base fields such as `original`, `collocations`, and `examples[].ja` clean, without parentheses readings.
- Do not add furigana to quiz prompts, choices, selected answers, or correct answers. Use readings in explanations or `ruby_terms`, not as answer hints.

## Practice Question Types

The app generates these vocabulary practice types from item data:

- `grammar`: `文の文法1`; choose the form that fits a Japanese sentence blank.
- `moji_goi`: `文脈規定`; choose the word that fits a Japanese sentence blank.
- `meaning`: `言い換え類義`; underline the target in a complete sentence and choose its closest Japanese paraphrase from four Japanese choices. This type requires `paraphrase_ja`.
- `kana_to_kanji`: `表記`; underline the kana target in a complete sentence and choose the correct kanji form. Use this for N2-N5, not N1.
- `kanji_to_kana`: `漢字読み`; use a complete natural Japanese sentence, mark the target kanji substring for visual underlining, and choose the correct reading from four kana-only options. Keep the shared task instruction separate from the sentence and do not repeat the target in a meta-prompt. Distractors should model plausible reading mistakes for the same kanji, not unrelated vocabulary readings.

Every website question uses the official booklet pattern: a Japanese task instruction separate from the item, one natural Japanese sentence, four numbered choices, and no translated hint in the prompt or options. Question prompts, choices, and answer keys stay plain text. Full explanations may use the selected learner language and can be annotated by the app when explanation furigana is enabled.

### Question Suitability

Do not generate all four question types for every item. Store the allowed types in `question_kinds`; an explicit empty array means the item stays available for review but does not generate an automatically scored question.

- N1 kanji vocabulary with a reliable reading and Japanese paraphrase can use `moji_goi`, `meaning`, and `kanji_to_kana`; N1 does not use `kana_to_kanji`.
- N2-N5 kanji vocabulary may also use `kana_to_kanji` when the orthographic contrast is appropriate.
- Kana-only vocabulary should not generate `kana_to_kanji` or `kanji_to_kana` unless the item explicitly teaches an orthographic contrast.
- Grammar expressions and verb forms normally use `grammar` with a sentence blank and controlled, function-specific distractors. Add reading or spelling questions only when that is the learner's actual confusion.
- `proper_name` items normally use only the supplementary `kanji_to_kana` practice, and only when the source establishes one intended reading. Do not present it as an official JLPT type.
- Names with multiple valid readings, uncertain readings, or AI-inferred candidate readings must use `question_kinds: []` until verified.

Use `question_distractors` to provide controlled wrong options per question type. Distractors must be plausible for the tested skill, must not duplicate the answer, and must not be another valid answer in the given context. For a name-reading question, explain that the answer is the recorded whole-name reading and should be confirmed from the source rather than mechanically assembled from individual kanji.

## Localizations

Use `localizations` for multilingual learner-facing output. Keys should be BCP 47 style language tags.

```json
{
  "localizations": {
    "en": {
      "meaning": "Measurement; determining a numeric value with a method or instrument.",
      "core_memory": "Measure objective data by a standard method.",
      "analysis": "Use it for measurable quantities such as temperature or speed."
    }
  }
}
```

Keep Japanese source fields stable. Translate learner-facing fields only.

## Review Scheduling

Do not store learner-specific scheduling state in seed data. Store only the content timestamp `input_at` in each item.

Browser progress may contain:

```json
{
  "firstSeenAt": "2026-08-27T20:20:00.000Z",
  "lastReviewedAt": "2026-08-27T20:25:00.000Z",
  "reviewCount": 2,
  "ease": 2.8,
  "intervalDays": 3,
  "nextReviewAt": "2026-08-30T20:25:00.000Z"
}
```

Use a simplified Anki/SM-2 style rule: first correct answer reviews tomorrow, second correct answer reviews after 3 days, later correct answers multiply the interval by ease, and wrong answers return to tomorrow with lower ease.

## AI-Generated Content Metadata

Content created without learner-provided source material must be visibly distinguishable from captured study notes:

```json
{
  "content_origin": "ai_generated",
  "verification_status": "unverified",
  "level_confidence": "medium"
}
```

Do not apply this marker to content extracted from the learner's own notes. AI-generated readings, meanings, answers, and JLPT-level estimates require learner review. Only set `verification_status` to `verified` after explicit learner confirmation or a user-requested verification pass.

## Privacy Rule

Do not copy raw chat transcripts into this file. Store only structured learning content and short explanations needed for review.
