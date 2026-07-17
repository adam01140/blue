# Audit Checklist

Run before any investor demo:

```bash
npm start   # in one terminal
node scripts/livescan-generate-audit.js
```

## Must pass (failures block demo)

### form_config

- [ ] `displayMode === "all_at_once"` in canonical config
- [ ] Every `field_config.fields[].newName` appears as a question `nameId` (or option/textbox nameId)
- [ ] At least 2 sections
- [ ] No garbage question text (page numbers, DOJ headers, BCIA boilerplate)
- [ ] **No duplicate question text** across different fields
- [ ] Question text matches field semantics (mail code ≠ criminal record agency label)

### HTML (normal mode)

- [ ] Valid DOCTYPE and template markers
- [ ] Conditional logic runtime present (`wireConditionalLogic`, `evaluateConditionalVisibility`)
- [ ] All required field inputs rendered
- [ ] No garbage text in `.question-text` elements
- [ ] Sign-in chrome hidden (`html-mode-normal` + CSS hide)

- [ ] **No vague conditional gates** (“Does this apply?” without context)
- [ ] Conditional follow-ups wired to parent controls when possible (e.g. “Other” checkbox → detail field)
- [ ] Question text readable without reading the PDF (spot-check 5–10 questions)

- [ ] Open all-at-once preview — all sections visible, sticky submit bar
- [ ] Open one-at-a-time preview — wizard navigation works
- [ ] Click **Help Me Answer** on 2–3 questions — no 500 error
- [ ] Agency vs applicant address questions clearly worded

## Warnings (fix if time permits)

- Missing `needsExplanation` on some questions
- FormStar branding not detected in HTML
- `nameId` not found as literal string in HTML (may be OK for composite inputs)

## Spot-check questions (Live Scan)

These were previously broken by bad PDF nearest labels — verify correct wording:

| Field | Expected topic |
|-------|----------------|
| `agency_mail_code` | Mail code (agency) |
| `agency_contact_name` | Contact name |
| `applicant_last_name` | Last name |
| `applicant_eye_color` | Eye color |
| `applicant_hair_color` | Hair color |
| `applicant_weight` | Weight |
| `applicant_place_of_birth` | Place of birth |
| `applicant_social_security_number` | SSN |
