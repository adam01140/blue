#!/usr/bin/env node
/**
 * Promote a stamp-approved ideal form into Demo_form_hub.
 *
 * Usage:
 *   node scripts/promote-demo-form.js <form-slug> [source.pdf]
 *
 * Example:
 *   node scripts/promote-demo-form.js w-4-form "public/Auto-Form-Creator/W-4 Form.pdf"
 *
 * The hub PDF is sanitized (AcroForm widgets renamed to field_config.newName)
 * so live fill + field-mapping popups use human-readable names.
 */
const fs = require('fs');
const path = require('path');
const { buildHubFieldMap } = require('./build-hub-field-map');
const { sanitizePdfFields } = require('../pdf-field-sanitizer');

const ROOT = path.join(__dirname, '..');
const CURRENT = path.join(ROOT, 'public', 'Auto-Form-Creator', 'Current Data');
const HUB = path.join(ROOT, 'public', 'Auto-Form-Creator', 'Demo_form_hub');
const FORMS = path.join(HUB, 'forms');

async function main() {
  const slug = process.argv[2];
  const pdfArg = process.argv[3];

  if (!slug) {
    console.error('Usage: node scripts/promote-demo-form.js <form-slug> [source.pdf]');
    process.exit(1);
  }

  const idealAll = path.join(CURRENT, `ideal-${slug}-all-at-once.html`);
  const idealOne = path.join(CURRENT, `ideal-${slug}-one-at-a-time.html`);
  const idealConfig = path.join(CURRENT, `ideal-${slug}-form_config.json`);
  const fieldConfigPath = path.join(CURRENT, `field_config_${slug}.json`);

  if (!fs.existsSync(idealAll) || !fs.existsSync(idealConfig)) {
    console.error(`Missing ideal artifacts for "${slug}" in Current Data.`);
    process.exit(1);
  }

  const dest = path.join(FORMS, slug);
  fs.mkdirSync(dest, { recursive: true });
  fs.copyFileSync(idealAll, path.join(dest, 'form-all-at-once.html'));
  if (fs.existsSync(idealOne)) fs.copyFileSync(idealOne, path.join(dest, 'form-one-at-a-time.html'));
  fs.copyFileSync(idealConfig, path.join(dest, 'form_config.json'));
  if (fs.existsSync(fieldConfigPath)) fs.copyFileSync(fieldConfigPath, path.join(dest, 'field_config.json'));

  let sourcePdf = pdfArg ? path.resolve(pdfArg) : null;
  if (!sourcePdf) {
    const guesses = [
      path.join(ROOT, 'public', 'Auto-Form-Creator', `${slug}.pdf`),
      path.join(ROOT, 'public', 'Auto-Form-Creator', `${slug.replace(/-/g, ' ')}.pdf`),
      path.join(ROOT, 'public', 'Auto-Form-Creator', `${slug.toUpperCase().replace(/-/g, ' ')}.pdf`),
    ];
    if (slug === 'livescan') guesses.unshift(path.join(ROOT, 'public', 'Auto-Form-Creator', 'livescan.pdf'));
    if (slug === 'w-9-form') guesses.unshift(path.join(ROOT, 'public', 'Auto-Form-Creator', 'W-9 Form.pdf'));
    if (slug === 'w-4-form') guesses.unshift(path.join(ROOT, 'public', 'Auto-Form-Creator', 'W-4 Form.pdf'));
    sourcePdf = guesses.find((p) => fs.existsSync(p)) || null;
  }

  const destPdf = path.join(dest, 'source.pdf');
  const destFieldConfig = path.join(dest, 'field_config.json');

  if (sourcePdf && fs.existsSync(sourcePdf) && fs.existsSync(destFieldConfig)) {
    const fieldConfig = JSON.parse(fs.readFileSync(destFieldConfig, 'utf8'));
    const rawBytes = fs.readFileSync(sourcePdf);
    try {
      const sanitized = await sanitizePdfFields(rawBytes, fieldConfig);
      fs.writeFileSync(destPdf, Buffer.from(sanitized.bytes));
      console.log(
        `Sanitized PDF: renamed ${sanitized.renamedCount || sanitized.renamed?.length || 0} field(s)` +
          (sanitized.failed?.length ? `, ${sanitized.failed.length} failed` : '')
      );
    } catch (err) {
      const auditSanitized = path.join(CURRENT, `_audit_${slug}_sanitized.pdf`);
      if (fs.existsSync(auditSanitized)) {
        fs.copyFileSync(auditSanitized, destPdf);
        console.warn(`Warning: sanitize failed (${err.message}); using ${path.basename(auditSanitized)}`);
      } else {
        console.warn(`Warning: sanitize failed (${err.message}); copying original PDF`);
        fs.copyFileSync(sourcePdf, destPdf);
      }
    }
  } else if (sourcePdf && fs.existsSync(sourcePdf)) {
    fs.copyFileSync(sourcePdf, destPdf);
    console.warn('Warning: no field_config.json — hub PDF was not sanitized');
  } else if (!fs.existsSync(destPdf)) {
    console.warn(`Warning: no source PDF found for ${slug}`);
  }

  const destFieldMap = path.join(dest, 'field_map.json');
  let hasFieldMap = false;
  if (fs.existsSync(destPdf) && fs.existsSync(destFieldConfig)) {
    try {
      const map = await buildHubFieldMap(destPdf, destFieldConfig, destFieldMap);
      hasFieldMap = true;
      console.log(`Field map: ${Object.keys(map.byNameId).length} widgets for PDF highlight`);
    } catch (err) {
      console.warn(`Warning: could not build field_map.json: ${err.message}`);
    }
  } else {
    console.warn('Warning: skipping field_map.json (need source.pdf + field_config.json)');
  }

  const cfg = JSON.parse(fs.readFileSync(idealConfig, 'utf8'));
  const questions = (cfg.sections || []).reduce((n, s) => n + (s.questions || []).length, 0);
  const entry = {
    id: slug,
    title: cfg.formTitle || cfg.formName || slug,
    description: cfg.formDescription || '',
    sections: (cfg.sections || []).length,
    questions,
    approvedAt: new Date().toISOString().slice(0, 10),
    sourcePdf: `forms/${slug}/source.pdf`,
    formHtml: `forms/${slug}/form-all-at-once.html`,
    formHtmlOneAtATime: fs.existsSync(path.join(dest, 'form-one-at-a-time.html'))
      ? `forms/${slug}/form-one-at-a-time.html`
      : null,
    formConfig: `forms/${slug}/form_config.json`,
    fieldMap: hasFieldMap ? `forms/${slug}/field_map.json` : null,
  };

  const manifestPath = path.join(HUB, 'manifest.json');
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    : { title: 'Demo Form Hub', forms: [] };

  manifest.subtitle = 'Stamp-approved AI pipeline outputs — frozen review copies';
  manifest.updatedAt = new Date().toISOString();
  manifest.forms = Array.isArray(manifest.forms) ? manifest.forms : [];
  const idx = manifest.forms.findIndex((f) => f.id === slug);
  if (idx >= 0) manifest.forms[idx] = entry;
  else manifest.forms.push(entry);

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`Promoted "${entry.title}" → Demo_form_hub/forms/${slug}`);
  console.log('Hub: http://localhost:3000/Auto-Form-Creator/Demo_form_hub/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
