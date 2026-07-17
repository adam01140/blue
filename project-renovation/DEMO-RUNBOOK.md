# Demo Runbook

## Prerequisites

- Node.js installed
- `.env` with `OPENAI_API_KEY` (for full pipeline regeneration)
- `npm install` completed

## Start server

```bash
cd /Users/platnm/Desktop/FormWiz
npm start
```

Server: http://localhost:3000

## Option A — Use cached artifacts (fastest)

If `Current Data/` already has fresh outputs:

1. Open http://localhost:3000/Auto-Form-Creator/Current%20Data/all-at-once-generated-form.html
2. Open http://localhost:3000/Auto-Form-Creator/Current%20Data/one-at-a-time-generated-form.html

Re-apply quality fixes without ChatGPT:

```bash
node scripts/repair-current-form-config.js
```

## Option B — Full demo flow

1. Open http://localhost:3000/Auto-Form-Creator/demo.html
2. Upload `public/Auto-Form-Creator/livescan.pdf`
3. Run steps 2 → 6 (field + form config generation)
4. Step 8 auto-builds both HTML previews — use preview buttons

## Option C — Automated audit (CI-style)

```bash
node scripts/livescan-generate-audit.js
# Skip ChatGPT field_config if cached:
node scripts/livescan-generate-audit.js --skip-field-config
```

## Investor talking points

1. **Upload any government PDF** — pipeline extracts fields automatically
2. **AI structures the form** — sections, plain-language questions, help text
3. **Two UX modes** from one config — full page vs guided wizard
4. **Help Me Answer** — contextual assistance tied to the source PDF
5. **No manual form building** — minutes instead of days

## If Help Me Answer returns 500

- Restart server (PDF store rehydrates from disk)
- Re-run sanitize + store-pdf step to get fresh `pdfToken`
- Check `public/Auto-Form-Creator/Current Data/pdf-store/` for token PDF
