# Goal: Investor-Ready Auto Form Creator Demo

## Vision

FormWiz transforms complex government PDFs into **clear, easy-to-fill online forms** automatically. For the demo we use the California **Live Scan / BCIA-8016** form (`livescan.pdf`) because it is dense, multi-section, and a realistic stress test — but the code must generalize to other PDFs.

## What the investor should see

1. Upload a PDF in the demo UI (`demo.html`).
2. The pipeline extracts fields, builds semantic config, and generates **two HTML previews** from one canonical `form_config`:
   - **All-at-once** — full form on one scrollable page (canonical `displayMode`)
   - **One-at-a-time** — wizard-style, same questions, different layout only
3. Questions read like a human wrote them: “What is the contributing agency's mail code?” not “What is your number?”
4. **Help Me Answer** works (PDF context available via persisted `pdfToken`).
5. Normal-mode HTML hides dev chrome (sign-in bar, question badges) — clean end-user experience.

## Success criteria

- `node scripts/livescan-generate-audit.js` exits 0 (all audit checks pass).
- No duplicate question text across fields.
- No garbage text (page headers, “Department of Justice”, etc.) in questions.
- Each question maps to the correct `field_config.label` semantics via `nameId`.
- Section titles use PDF section names (e.g. “Contributing Agency Information”), not single-word stubs.

## Non-goals (for this demo phase)

- Production auth / payments integration in generated forms
- Perfect OCR on scanned PDFs
- Supporting every PDF variant worldwide on day one

## Quality bar

Fixes must pass **naturally** through the pipeline (label alignment, validation, extraction heuristics). Do **not** hardcode Live Scan field IDs or question strings in application code.
