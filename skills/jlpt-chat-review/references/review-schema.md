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

- `moji_goi`: JLPT-style `文字・語彙` sentence completion or vocabulary selection.
- `meaning`: `言い換え類義`; choose the closest meaning for the target word in a sentence context.
- `kana_to_kanji`: `表記`; choose the correct kanji form for a kana word in a sentence context.
- `kanji_to_kana`: `漢字読み`; choose the correct kana reading for a kanji word in a sentence context.

Question prompts, choices, and answer keys should stay plain text. Prefer sentence-context prompts over isolated word prompts. Full explanations may use kanji and can be annotated by the app when the learner enables explanation furigana.

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

## Privacy Rule

Do not copy raw chat transcripts into this file. Store only structured learning content and short explanations needed for review.
