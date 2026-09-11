# AI Handoff: Build `example.html` that fills `test.pdf`

Copy everything below the line to your AI. Then replace:

`public/Forms/Example/example.html`

with the AI’s full HTML output. Keep `test.pdf` in the same folder. Open **only** via:

`http://localhost:3000/Forms/Example/example.html`

(Do not open as `file://` — CSS and `/edit_pdf` will break.)

---

## TASK

Build one complete standalone HTML file named `example.html` for Form-Star.

Goal: user answers questions → Submit → browser downloads a filled PDF.

The PDF to fill is already on the server at:

`public/Forms/Example/test.pdf`

Fill endpoint (required):

```http
POST /edit_pdf?pdf=test
```

Body: `multipart/form-data` / FormData whose **keys are exactly the PDF AcroForm field names** listed below.

There is **no mapping layer**. If `name="taxpayer_name"` is posted, the PDF field `taxpayer_name` is filled. Wrong names = blank PDF fields.

---

## PDF FIELD NAMES (exact — do not rename)

These are the real AcroForm names inside `test.pdf` (W-9).

### Text fields → `<input type="text" name="EXACT_NAME">`

| PDF field name | Meaning |
|---|---|
| `taxpayer_name` | Line 1 name |
| `business_name` | Line 2 business / disregarded entity name |
| `tax_classification_other` | “Other” classification text (line 3a Other) |
| `exempt_payee_code` | Exempt payee code |
| `tax_classification_code` | LLC tax classification code (C/S/P) |
| `fatca_code` | FATCA exemption code |
| `address` | Street address |
| `city_state_zip` | City, state, ZIP (one field) |
| `optional_requester_name` | Requester name/address optional |
| `account_number` | Account number(s) optional |
| `tin_ssn` | SSN |
| `tin_ein` | EIN |
| `name_for_ein` | Name associated with EIN area (as on form) |
| `name_for_ssn` | Name associated with SSN area (as on form) |
| `additional_name_info` | Additional name info |

### Checkbox fields → `<input type="checkbox" name="EXACT_NAME">`

Each checkbox is its **own** PDF field. Each gets its **own** `name`. Do **not** share one `name` across options.

| PDF field name | Label |
|---|---|
| `tax_classification_individual` | Individual/sole proprietor |
| `tax_classification_corporation` | C corporation |
| `tax_classification_s_corporation` | S corporation |
| `tax_classification_partnership` | Partnership |
| `tax_classification_trust_estate` | Trust/estate |
| `tax_classification_llc` | LLC |
| `tax_classification_other_checkbox` | Other |
| `foreign_partners_checkbox` | Foreign partners / owners / beneficiaries (line 3b) |

Marker legend from extracted document text (for your understanding only — do **not** put markers in HTML):

- `[[taxpayer_name]]` → text input `name="taxpayer_name"`
- `{{tax_classification_individual}}` → checkbox `name="tax_classification_individual"`

---

## HOW FILL WORKS

1. Collect every control inside `<form id="customForm">`.
2. Build `FormData`:
   - text/textarea/select: if non-empty, `fd.append(name, value)`
   - checkbox: if checked, `fd.append(name, "on")` — omit if unchecked
3. `fetch('/edit_pdf?pdf=test', { method:'POST', body: fd, credentials:'include' })`
4. Server loads `public/Forms/Example/test.pdf` (scoped by Referer `/Forms/Example/`), writes values onto matching AcroForm fields, returns `application/pdf`.
5. Download the blob as `filled.pdf`.

Checkbox truthy values accepted by server: `on`, `true`, `yes`, `1`, `checked`. Prefer `"on"`.

---

## REQUIRED PAGE CONTRACT

Output **one full HTML document** (DOCTYPE, html, head, body). It must:

1. Use these stylesheets (absolute paths for localhost):

```html
<link rel="stylesheet" href="/Forms/CSS/generate.css">
<link rel="stylesheet" href="/Forms/CSS/generate2.css">
```

2. Contain:

```html
<form id="customForm">
  <!-- all questions / inputs here -->
  <button type="submit">Submit / Download filled PDF</button>
</form>
```

3. Include **every** PDF field name above at least once as an input `name` (you may hide optional ones behind conditional UI, but the `name` must exist when the user answers that question).

4. Include this submit script (keep the endpoint and FormData rules):

```html
<script>
document.getElementById('customForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData();
  e.target.querySelectorAll('input, textarea, select').forEach((el) => {
    if (!el.name || el.disabled) return;
    if (el.type === 'checkbox' || el.type === 'radio') {
      if (el.checked) fd.append(el.name, el.type === 'checkbox' ? 'on' : (el.value || 'on'));
      return;
    }
    const v = (el.value || '').trim();
    if (v) fd.append(el.name, v);
  });

  const res = await fetch('/edit_pdf?pdf=' + encodeURIComponent('test'), {
    method: 'POST',
    body: fd,
    credentials: 'include'
  });
  if (!res.ok) {
    alert('Fill failed: ' + (await res.text()));
    return;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'W9_filled.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});
</script>
```

5. Prefer Form-Star-ish structure (optional but nice):

- sections with titles
- `.question-container` cards
- `.address-input` on text fields
- one-at-a-time or all-at-once is fine
- for tax classification “pick one”, still use **separate checkbox names**; optionally add small JS so checking one unchecks the others

6. Keep the page **self-contained**. Do **not** depend on Firebase auth, cart, Stripe, or missing local scripts. A simple header title “Form W-9” is enough. No cart drawer.

---

## CONVERT YOUR FLOWCHART LIKE THIS

You already have a flowchart of questions linked to markers like `[[taxpayer_name]]`.

For each flowchart node:

1. Take the linked field id (`taxpayer_name`, etc.).
2. Create a question with human text from the flowchart.
3. Emit the correct control with `name="{that id}"`.
4. Wire show/hide / jumps from the flowchart in JS if needed.
5. Never invent a different name (`name`, `ssn`, `ein`, `agency_ori`, …).

Examples:

```html
<!-- text -->
<div class="question-container">
  <h3 class="question-text">What is your name as shown on your tax return?</h3>
  <input class="address-input" type="text" name="taxpayer_name" id="taxpayer_name" placeholder="Name of entity/individual" required>
</div>

<!-- checkboxes: unique names -->
<div class="question-container">
  <h3 class="question-text">Federal tax classification</h3>
  <label><input type="checkbox" name="tax_classification_individual"> Individual/sole proprietor</label>
  <label><input type="checkbox" name="tax_classification_corporation"> C corporation</label>
  <label><input type="checkbox" name="tax_classification_s_corporation"> S corporation</label>
  <label><input type="checkbox" name="tax_classification_partnership"> Partnership</label>
  <label><input type="checkbox" name="tax_classification_trust_estate"> Trust/estate</label>
  <label><input type="checkbox" name="tax_classification_llc"> LLC</label>
  <label><input type="checkbox" name="tax_classification_other_checkbox"> Other</label>
</div>
```

---

## HARD CONSTRAINTS

- Output ONLY the complete HTML file contents (no markdown fences unless needed).
- `name` attributes MUST match the PDF list exactly (case-sensitive).
- Endpoint MUST be `/edit_pdf?pdf=test` (not `example`, not a pdfToken URL).
- Checked checkboxes MUST post `"on"`.
- Do not leave `[[...]]` / `{{...}}` in the HTML as fake fields.
- Do not require login to submit.
- Do not reference Live Scan / ORI / BCIA field names — those belong to a different PDF. `test.pdf` is W-9.

## SUCCESS CHECK

After replacing `example.html`, open:

`http://localhost:3000/Forms/Example/example.html`

Fill `taxpayer_name`, check one classification, submit → downloaded PDF should show those values on the W-9.
