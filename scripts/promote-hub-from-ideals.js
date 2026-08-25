#!/usr/bin/env node
/**
 * Promote existing ideal-* artifacts to Demo_form_hub without re-running AI.
 * Rebuilds HTML from form_config + runs mapping audit first.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CURRENT = path.join(ROOT, 'public', 'Auto-Form-Creator', 'Current Data');
const { validateFullQuality } = require('../pipeline-quality');
const { validateAddressStateMapping } = require('../form-config-quality');

const SLUGS = [
  { slug: 'livescan', field: 'field_config_livescan.json', pdf: 'livescan.pdf' },
  { slug: 'w-9-form', field: 'field_config_w-9-form.json', pdf: 'W-9 Form.pdf' },
  { slug: 'w-4-form', field: 'field_config_w-4-form.json', pdf: 'W-4 Form.pdf' },
];

require(path.join(ROOT, 'public/Auto-Form-Creator/form-html-renderer.js'));
const template = fs.readFileSync(
  path.join(ROOT, 'public/Auto-Form-Creator/form-template.html'),
  'utf8'
);
global.FormHtmlRenderer.setDefaultTemplate(template);

function auditMapping(formConfig, fieldConfig, html) {
  const failures = [];
  failures.push(...validateAddressStateMapping(formConfig, fieldConfig).failures);
  failures.push(...validateFullQuality(formConfig, fieldConfig, {}).failures);
  if (/data-ui-only="true"/i.test(html)) failures.push('HTML has dead UI-only fields');
  if (/\(none — UI-only\)/.test(html)) failures.push('Mapping popup shows UI-only dead field');
  for (const m of html.matchAll(/placeholder="State"[^>]*>/gi)) {
    if (!/data-pdf-combine-into=/i.test(m[0]) && !/\bname="[^"]*_state"/i.test(m[0])) {
      failures.push('State input missing pdfCombineInto');
    }
  }
  if (/data-field-label="State"/i.test(html) && !/<select[^>]*data-field-label="State"/i.test(html)) {
    failures.push('State field is not a dropdown select');
  }
  return failures;
}

function rebuildHtml(formConfig, fieldConfig, displayMode) {
  return global.FormHtmlRenderer.build(
    { ...formConfig, displayMode, htmlMode: 'normal' },
    {},
    { htmlMode: 'normal', fieldConfig }
  );
}

let failed = 0;
for (const { slug, field, pdf } of SLUGS) {
  const configPath = path.join(CURRENT, `ideal-${slug}-form_config.json`);
  const fieldPath = path.join(CURRENT, field);
  if (!fs.existsSync(configPath) || !fs.existsSync(fieldPath)) {
    console.error(`Skip ${slug}: missing ideal artifacts`);
    failed += 1;
    continue;
  }
  const formConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const fieldConfig = JSON.parse(fs.readFileSync(fieldPath, 'utf8'));
  const htmlAll = rebuildHtml(formConfig, fieldConfig, 'all_at_once');
  const htmlOne = rebuildHtml(formConfig, fieldConfig, 'one_at_a_time');
  const issues = auditMapping(formConfig, fieldConfig, htmlAll);
  console.log(`\n${slug}: ${issues.length ? 'FAIL' : 'PASS'}`);
  issues.forEach((i) => console.log('  ✗', i));
  if (issues.length) {
    failed += 1;
    continue;
  }
  fs.writeFileSync(path.join(CURRENT, `ideal-${slug}-all-at-once.html`), htmlAll);
  fs.writeFileSync(path.join(CURRENT, `ideal-${slug}-one-at-a-time.html`), htmlOne);
  const pdfPath = path.join(ROOT, 'public/Auto-Form-Creator', pdf);
  const r = spawnSync(
    process.execPath,
    [path.join(__dirname, 'promote-demo-form.js'), slug, pdfPath],
    { stdio: 'inherit', cwd: ROOT }
  );
  if (r.status !== 0) failed += 1;
}

process.exit(failed ? 1 : 0);
