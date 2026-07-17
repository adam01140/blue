# FormWiz Auto Form Creator — Project Renovation

Documentation for the **investor-ready Auto Form Creator demo**. Use this folder when onboarding a new developer or AI agent that does not have prior chat context.

## Start here

| Document | Purpose |
|----------|---------|
| [LEAD-DEV.md](./LEAD-DEV.md) | **Lead developer standards** — release checklist, quality bar, do-not rules |
| [PIPELINE.md](./PIPELINE.md) | Steps 2–9 of the PDF → online form pipeline |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Key modules and data artifacts |
| [AUDIT-CHECKLIST.md](./AUDIT-CHECKLIST.md) | Quality gates that must pass before demo |
| [DEMO-RUNBOOK.md](./DEMO-RUNBOOK.md) | How to run the demo locally |
| [KNOWN-ISSUES.md](./KNOWN-ISSUES.md) | Active risks and non-goals |

## Quick links

- **Demo UI:** http://localhost:3000/Auto-Form-Creator/demo.html
- **All-at-once preview:** http://localhost:3000/Auto-Form-Creator/Current%20Data/all-at-once-generated-form.html
- **One-at-a-time preview:** http://localhost:3000/Auto-Form-Creator/Current%20Data/one-at-a-time-generated-form.html
- **Reference PDF:** `public/Auto-Form-Creator/livescan.pdf` (BCIA-8016 Live Scan — first example, not hardcoded in logic)

## Commands

```bash
npm start                                    # server on :3000
node scripts/livescan-generate-audit.js      # Live Scan pipeline + audit
node scripts/pdf-generate-audit.js "public/Auto-Form-Creator/W-9 Form.pdf"
node scripts/repair-current-form-config.js   # re-run quality repair on cached artifacts
```

## Example PDFs

| PDF | Path |
|-----|------|
| Live Scan (BCIA-8016) | `public/Auto-Form-Creator/livescan.pdf` |
| IRS W-9 | `public/Auto-Form-Creator/W-9 Form.pdf` |

## Core principle

The pipeline must work **generically** for government PDFs. Live Scan is the **test case**, not a source of field-name cheats. Quality fixes belong in label resolution, PDF extraction heuristics, and validation — not in `if (livescan)` branches.
