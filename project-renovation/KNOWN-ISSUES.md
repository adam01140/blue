# Known Issues & Constraints

## PDF nearest-label extraction

Government PDFs pack many labels on one visual row. `findNearestLabel()` in `pdf-extractor.js` can attach the wrong neighbor label (e.g. mail code field getting a long agency authorization label).

**Mitigation:** `labelAlignsWithField()` + prefer `field_config.label` in `form-question-text.js`. Re-extract PDF in demo to pick up improved extractor heuristics.

## ChatGPT variability

Step 4 and Step 6 call OpenAI. Output varies between runs. Post-processing and quality validation are required to stabilize demo quality.

## Section hint staleness

Some `structured-fields.json` entries may have wrong `sectionHint` (e.g. applicant fields marked “Agency”). Domain inference uses PDF field ids and `newName`, not section hints alone.

## Long all-at-once forms

Live Scan produces ~36 questions. All-at-once mode is a long scroll — acceptable for demo; consider section cards and sticky submit (already in renderer).

## One-at-a-time progress

Wizard mode may not show “Question X of Y” — UX enhancement, not a blocker.

## Non-goals

- Do not add Live Scan-specific field ID maps in production code
- Do not skip validation to force audit green

## Changelog (recent renovation)

- **Lead dev standards:** `project-renovation/LEAD-DEV.md` — release checklist, quality bar
- **`pipeline-quality.js`:** single refinement + validation entry point
- **Clarity audit:** rejects vague gates, awkward PDF echo, duplicate employer phrasing
- **Conditional logic:** checkbox follow-ups (e.g. W-9 “Other” → detail field), no meaningless Yes/No gates
- **Per-PDF field_config cache:** `field_config_{slug}.json` — audit no longer mixes Live Scan + W-9 configs
- **npm scripts:** `audit:livescan`, `audit:w9`, `audit:all`, `repair`
- Label alignment: structured context trusted only when aligned with field
- `form-config-quality.js`: duplicate detection + repair pass
- Section titles from domain (`Contributing Agency Information`, etc.)
- Normal mode hides sign-in chrome in generated HTML
