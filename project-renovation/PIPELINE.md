# Auto Form Creator Pipeline

## Overview

```
PDF upload → unlock → prepare fields → field_config (Step 4)
         → sanitize PDF → form_config (Step 6) → HTML (Step 8)
```

## Steps (demo.html)

| Step | Name | Output |
|------|------|--------|
| 2 | Unlock PDF | Flattened/unlocked PDF bytes |
| 3 | Prepare PDF fields | PDF with extractable AcroForm fields |
| 4 | Generate field_config | `field_config.json` — semantic names, labels, types |
| 5 | Sanitize PDF | PDF aligned to field_config names |
| 6 | Generate form_config | `form_config.json` — sections, questions, logic |
| 8 | Generate HTML | `all-at-once-generated-form.html` + `one-at-a-time-generated-form.html` |

Step 6 always uses **`displayMode: all_at_once`** as the canonical config. Step 8 builds both layouts via `FormHtmlRenderer` with `htmlMode: normal`.

## Post-processing (Step 6, server-side)

After ChatGPT returns `form_config`, `postProcessFormConfig()` in `form-config-generator.js` runs:

1. Inject missing field questions
2. Validate + consolidate sections
3. Conditional gates (alias, resubmission, etc.)
4. Normalize vague question text
5. Linked fields, autopopulate metadata
6. **Deterministic question wording** (uses `field_config.label`, not bad PDF neighbors)
7. Deterministic explanations
8. **Domain section titles** (`Contributing Agency Information`, etc.)
9. **Quality repair + validation** (`form-config-quality.js`)

## Artifacts (`public/Auto-Form-Creator/Current Data/`)

| File | Role |
|------|------|
| `field_config.json` | Semantic field map |
| `form_config.json` | Survey structure |
| `structured-fields.json` | Per-field PDF positions + nearest labels |
| `extracted-document-content.txt` | Plain text with `[[fieldId]]` markers |
| `all-at-once-generated-form.html` | Primary preview |
| `one-at-a-time-generated-form.html` | Wizard preview |
| `pdf-store/{token}.pdf` | Persisted PDF for Help Me Answer |

## PDF extraction (browser)

`pdf-extractor.js` runs in the demo browser context. It produces `structured-fields.json` with `nearestLabel` per field. Labels on dense government rows are often wrong — downstream code must **prefer aligned `field_config.label`** over raw nearest labels.
