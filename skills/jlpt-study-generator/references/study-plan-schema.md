# Generated Study Plan Schema

Use this shape for a machine-readable plan. A plan can be returned in chat unless the user requests a file. Keep learner-specific plans outside a public repository unless the user explicitly asks to publish them.

```json
{
  "schema_version": "1.0",
  "generated_at": "2026-08-27T21:00:00+09:00",
  "content_origin": "ai_generated",
  "verification_status": "unverified",
  "disclaimer": {
    "zh-CN": "本计划和学习内容由 AI 生成，不是 JLPT 官方材料，请自行核对读音、含义、答案和级别。",
    "en": "This plan and its study content are AI-generated, not official JLPT material. Verify readings, meanings, answers, and level assignments yourself."
  },
  "parameters": {
    "target_level": "N1",
    "start_date": "2026-08-28",
    "duration_days": 100,
    "daily_minutes": 45,
    "focus_modules": ["vocabulary", "reading"],
    "output_languages": ["zh-CN", "en"],
    "timezone": "Asia/Tokyo"
  },
  "phases": [],
  "days": [],
  "content": {
    "website_items": [],
    "grammar_drills": [],
    "reading_packs": [],
    "listening_packs": [],
    "mixed_sets": []
  }
}
```

## Phase

Each phase should include `name`, `start_day`, `end_day`, `goal`, `module_weights`, and `checkpoint`.

## Day

Each day should include `day`, `date`, `estimated_minutes`, `tasks`, `review_targets`, and `completion_criteria`.

Each task should specify `module`, `minutes`, `activity`, `content_ids`, and whether it is `new`, `review`, or `mixed`.

## Generated Website Item Metadata

Add these fields to every generated item that may be merged into `public/data/review-data.json`:

```json
{
  "content_origin": "ai_generated",
  "verification_status": "unverified",
  "level_confidence": "medium",
  "generation_context": {
    "target_level": "N1",
    "focus_module": "vocabulary",
    "plan_generated_at": "2026-08-27T21:00:00+09:00"
  }
}
```

Use stable IDs that cannot collide with chat-captured items, for example `ai-2026-08-27-n1-vocab-001`.

Allowed verification values:

- `unverified`: AI-generated and not checked by the learner.
- `needs_review`: a concrete uncertainty or conflict was found.
- `verified`: explicitly confirmed by the learner or by a user-requested verification pass.

The website currently renders vocabulary and grammar-expression items. Keep reading, listening, and mixed packs in the study-plan output until their site schemas and pages are implemented.
