# Lead Developer — Auto Form Creator

You are maintaining an **investor-ready PDF → online form pipeline**. Quality is non-negotiable: every generated form must be understandable without reading the source PDF.

## North star

> A non-expert user can complete the generated form confidently, with clear questions, working conditionals, and Help Me Answer support.

## Release checklist (run before any demo)

```bash
npm start                          # terminal 1
npm run audit:all                  # full pipeline both reference PDFs (~3–5 min, needs OPENAI_API_KEY)
npm run repair                     # quick fix on cached artifacts if needed
```

Both must exit 0.

## Quality bar (what "pass" means)

| Layer | Checks |
|-------|--------|
| **Structure** | All fields covered, no duplicate question text, valid HTML |
| **Clarity** | No vague gates ("Does this apply?"), no awkward PDF label echo |
| **Conditionals** | Follow-ups wired to parent controls (checkbox → detail field) |
| **Explanations** | Every question has `needsExplanation` + 8+ word helpful text |
| **UX** | Normal mode hides dev/sign-in chrome; all-at-once + one-at-a-time both build |

Implementation: `form-config-quality.js`, `form-conditional-logic.js`, `pipeline-quality.js`.

## Pipeline order (Step 6 post-process)

1. ChatGPT returns raw `form_config`
2. Validate, consolidate sections, alias/resubmission gates
3. Normalize vague text, linked fields, autopopulate
4. Deterministic question wording + explanations
5. **`applyFullQualityPass()`** — wire checkbox follow-ups, fix gates, repair labels, dedupe
6. Re-apply explanations (after text repair)
7. **`validateFullQuality()`** — log warnings; failures should be treated as blockers

## Do NOT

- Hardcode Live Scan or W-9 field IDs in production logic
- Skip validation to force green audits
- Trust PDF `nearestLabel` over aligned `field_config.label`
- Ship vague Yes/No gates without stating what they gate

## Reference PDFs

| PDF | Purpose |
|-----|---------|
| `livescan.pdf` | Dense multi-section government form (primary demo) |
| `W-9 Form.pdf` | Different layout — proves generic pipeline |

## Key modules

| Module | Role |
|--------|------|
| `pdf-extract-node.js` | Server-side field extraction |
| `form-question-text.js` | Label resolution + question/explanation copy |
| `form-conditional-logic.js` | Gate wording + checkbox wiring |
| `form-config-quality.js` | Validation (duplicates, clarity, gates) |
| `pipeline-quality.js` | Single refinement + validation entry point |
| `form-html-renderer.js` | Deterministic HTML + conditional runtime |
| `scripts/pdf-generate-audit.js` | End-to-end audit for any PDF |

## When something fails

1. Read audit failure message — it names Q# and issue type
2. Fix in **generic** module (not one-off in demo HTML)
3. `npm run repair` on cached data OR `npm run audit:w9` / `audit:livescan`
4. Update `KNOWN-ISSUES.md` if it's a known PDF extraction limitation

## Handoff

See `project-renovation/` for goal, architecture, and demo runbook.
