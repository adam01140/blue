# Architecture — Key Modules

## Server (`server.js`)

Express app. Auto Form API routes under `/api/`. Calls `rehydratePdfStore()` on startup so Help Me Answer survives restarts.

## PDF handling

| Module | Role |
|--------|------|
| `auto-form-pdf-handler.js` | Store PDFs to disk (`pdf-store/`), token lookup |
| `public/Auto-Form-Creator/pdf-extractor.js` | Browser-side field + label extraction |

## Config generation

| Module | Role |
|--------|------|
| `field-config-generator.js` | Step 4 — ChatGPT field naming |
| `structured-field-context.js` | Enrich field_config with PDF context; trust only aligned labels |
| `field-domain.js` | Agency / Applicant / Employer / Service domain inference |
| `field-name-canonicalizer.js` | Stable `newName` from PDF ids |
| `form-config-generator.js` | Step 6 — ChatGPT form layout + postProcess |
| `form-question-text.js` | Label resolution, question phrasing, explanations |
| `form-config-quality.js` | Duplicate detection, repair pass, section titles |

## HTML output

| Module | Role |
|--------|------|
| `public/Auto-Form-Creator/form-html-renderer.js` | Deterministic HTML from form_config |
| `public/Auto-Form-Creator/form-template.html` | Shell template (`__AUTO_FORM_BODY__`) |
| `auto-form-current-data.js` | Persist artifacts to Current Data |

## Help Me Answer

| Module | Role |
|--------|------|
| `auto-form-help-handler.js` | API for contextual field help |

## Label resolution rule (critical)

`resolveSpecificFieldLabel()` in `form-question-text.js`:

1. Prefer **`field_config.label`** when PDF `nearestLabel` does not align with field semantics
2. Use PDF neighbor label only when `labelAlignsWithField()` passes
3. Reject section headers (“Applicant Information”) as field labels
4. Fall back to document markers, then formatted `newName`

This prevents mail code / contact name both becoming “Agency Authorized to Receive Criminal Record Information”.

## Audit

`scripts/livescan-generate-audit.js` — end-to-end pipeline against `livescan.pdf`, validates config + HTML.

`scripts/repair-current-form-config.js` — re-run quality repair on cached artifacts without ChatGPT.
