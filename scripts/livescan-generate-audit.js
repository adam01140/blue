#!/usr/bin/env node
/**
 * Live Scan example: full Auto-Form pipeline + HTML audit.
 * Config: one_at_a_time layout, dev HTML mode, default example.html template (FormHtmlRenderer).
 *
 * Usage: node scripts/livescan-generate-audit.js [--skip-field-config]
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { saveCurrentData } = require('../auto-form-current-data');

const ROOT = path.join(__dirname, '..');
const CURRENT_DATA = path.join(ROOT, 'public', 'Auto-Form-Creator', 'Current Data');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SKIP_FIELD_CONFIG = process.argv.includes('--skip-field-config');
const PDF_PATH = path.join(ROOT, 'public', 'Auto-Form-Creator', 'livescan.pdf');

const CONFIG = {
  htmlMode: 'normal',
  template: 'default',
};

const { validateQuestionTextQuality, GARBAGE_RE } = require('../form-config-quality');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadExtractionFromCurrentData() {
  const extractedDocumentContent = fs.readFileSync(
    path.join(CURRENT_DATA, 'extracted-document-content.txt'),
    'utf8'
  );
  const parseMarkers = (filePath, isCheckbox) => {
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean);
    return lines.map((line) => {
      const marker = line.trim();
      const name = marker.replace(/^\[\[|\]\]$/g, '').replace(/^\{\{|\}\}$/g, '');
      return { name, marker, type: isCheckbox ? 'checkbox' : 'text' };
    });
  };
  const structuredPath = path.join(CURRENT_DATA, 'structured-fields.json');
  const structuredFields = fs.existsSync(structuredPath) ? readJson(structuredPath) : [];
  return {
    extractedDocumentContent,
    textFields: parseMarkers(path.join(CURRENT_DATA, 'text-fields.txt'), false),
    checkboxFields: parseMarkers(path.join(CURRENT_DATA, 'checkbox-fields.txt'), true),
    structuredFields,
  };
}

async function uploadPdf(endpoint, pdfPath, extraFields = {}) {
  const pdfBuffer = fs.readFileSync(pdfPath);
  const formData = new FormData();
  formData.append('pdf', new Blob([pdfBuffer], { type: 'application/pdf' }), path.basename(pdfPath));
  for (const [key, value] of Object.entries(extraFields)) {
    formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
  }
  const res = await fetch(`${BASE_URL}${endpoint}`, { method: 'POST', body: formData });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${endpoint} failed (${res.status}): ${text.slice(0, 400)}`);
  }
  return res;
}

function collectQuestions(formConfig) {
  const out = [];
  for (const section of formConfig.sections || []) {
    for (const q of section.questions || []) out.push(q);
  }
  return out;
}

function collectNameIdsFromHtml(html) {
  const ids = new Set();
  for (const m of html.matchAll(/name="([^"]+)"/g)) ids.add(m[1]);
  for (const m of html.matchAll(/data-name-id="([^"]+)"/g)) ids.add(m[1]);
  return ids;
}

function buildFormHtmlWithRenderer(formConfig, fieldConfig, extractedDocumentContent, pdfToken) {
  require(path.join(ROOT, 'public', 'Auto-Form-Creator', 'form-html-renderer.js'));
  const template = fs.readFileSync(
    path.join(ROOT, 'public', 'Auto-Form-Creator', 'form-template.html'),
    'utf8'
  );
  if (!template.includes('__AUTO_FORM_BODY__')) {
    throw new Error('Default template missing __AUTO_FORM_BODY__ placeholder');
  }
  global.FormHtmlRenderer.setDefaultTemplate(template);
  return global.FormHtmlRenderer.build(formConfig, {}, {
    htmlMode: CONFIG.htmlMode,
    pdfToken,
    fieldConfig,
    extractedDocumentContent,
  });
}

function auditFormConfig(formConfig, fieldConfig) {
  const failures = [];
  const warnings = [];
  const questions = collectQuestions(formConfig);

  if (formConfig.displayMode !== 'all_at_once') {
    failures.push(`displayMode is "${formConfig.displayMode}", expected "all_at_once" as canonical config`);
  }

  const required = new Set((fieldConfig.fields || []).map((f) => f.newName));
  const covered = new Set();
  for (const q of questions) {
    if (q.nameId) covered.add(q.nameId);
    for (const opt of q.options || []) if (opt.nameId) covered.add(opt.nameId);
    for (const tb of q.textboxes || []) if (tb.nameId) covered.add(tb.nameId);
  }
  const missing = [...required].filter((n) => !covered.has(n));
  if (missing.length) {
    failures.push(`form_config missing ${missing.length} field nameId(s): ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`);
  }

  const garbageRe = GARBAGE_RE;
  for (const q of questions) {
    const text = String(q.text || '');
    if (garbageRe.test(text)) failures.push(`Garbage question text Q${q.questionId}: "${text.slice(0, 70)}..."`);
    if (q.needsExplanation !== true) warnings.push(`Q${q.questionId} missing needsExplanation`);
  }

  const quality = validateQuestionTextQuality(formConfig, fieldConfig, {
    extractedDocumentContent: fs.existsSync(path.join(CURRENT_DATA, 'extracted-document-content.txt'))
      ? fs.readFileSync(path.join(CURRENT_DATA, 'extracted-document-content.txt'), 'utf8')
      : '',
    structuredFields: fs.existsSync(path.join(CURRENT_DATA, 'structured-fields.json'))
      ? readJson(path.join(CURRENT_DATA, 'structured-fields.json'))
      : [],
  });
  failures.push(...quality.failures);
  warnings.push(...quality.warnings);

  if ((formConfig.sections || []).length < 2) {
    failures.push(`Only ${formConfig.sections?.length || 0} section(s) — Live Scan should have multiple sections`);
  }

  return { failures, warnings, questionCount: questions.length, sectionCount: formConfig.sections?.length || 0 };
}

function auditHtml(html, formConfig, fieldConfig) {
  const failures = [];
  const warnings = [];
  const questions = collectQuestions(formConfig);
  const htmlIds = collectNameIdsFromHtml(html);
  const devMode = CONFIG.htmlMode === 'dev';

  if (!/<!DOCTYPE html>/i.test(html)) failures.push('Missing DOCTYPE');
  if (!html.includes('FormStar') && !html.includes('formstar')) warnings.push('No FormStar branding found in HTML');
  if (!html.includes('wireConditionalLogic')) failures.push('Missing wireConditionalLogic runtime');
  if (!html.includes('evaluateConditionalVisibility')) failures.push('Missing conditional visibility evaluator');

  if (!devMode) {
    if (html.includes('id="sign-in-btn"') && !html.includes('html-mode-normal')) {
      warnings.push('Sign-in button present without normal-mode hide class');
    }
    if (html.includes('html-mode-normal') && html.includes('#sign-in-btn{display:none')) {
      /* expected */
    }
  }

  if (CONFIG.displayMode === 'one_at_a_time') {
    if (!/one-at-a-time|oneAtATime|showQuestion|nextQuestion|question-nav/i.test(html)) {
      failures.push('one_at_a_time navigation not found in HTML');
    }
  }

  const templateMarkers = ['generate.css', 'Montserrat', '__AUTO_FORM_BODY__'];
  for (const marker of templateMarkers) {
    if (marker === '__AUTO_FORM_BODY__') continue;
    if (!html.includes(marker)) warnings.push(`Template marker "${marker}" not found`);
  }

  const requiredFields = (fieldConfig.fields || []).map((f) => f.newName);
  const missingInHtml = requiredFields.filter((name) => !htmlIds.has(name) && !html.includes(`name="${name}"`));
  if (missingInHtml.length) {
    failures.push(`HTML missing ${missingInHtml.length} field input(s): ${missingInHtml.slice(0, 8).join(', ')}${missingInHtml.length > 8 ? '…' : ''}`);
  }

  for (const q of questions) {
    if (!q.nameId) continue;
    if (q.linkedFieldRole === 'mirror' && devMode === false) continue;
    if (!html.includes(q.nameId)) {
      warnings.push(`Question nameId "${q.nameId}" not found as literal in HTML`);
    }
  }

  const garbageRe = /page\s*\d+\s*of\s*\d+|department\s+of\s+justice|state\s+of\s+|bcia\s*8016/i;
  const questionTexts = [...html.matchAll(/class="question-text">([^<]+)</g)].map((m) => m[1]);
  for (const text of questionTexts) {
    if (garbageRe.test(text)) failures.push(`HTML garbage question text: "${text.slice(0, 80)}"`);
  }

  if (/document\.write\(/.test(html)) warnings.push('HTML uses document.write (preview anti-pattern)');

  return { failures, warnings, inputCount: htmlIds.size, questionTextCount: questionTexts.length };
}

async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const res = await fetch(`${BASE_URL}/`);
      if (res.ok) return;
    } catch (_) { /* retry */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server not reachable at ${BASE_URL}`);
}

async function run() {
  if (!fs.existsSync(PDF_PATH)) throw new Error(`Live Scan PDF not found: ${PDF_PATH}`);

  console.log('[livescan-audit] PDF:', PDF_PATH);
  console.log('[livescan-audit] Config:', JSON.stringify(CONFIG));
  await waitForServer();

  let workingPdf = PDF_PATH;

  try {
    const unlockRes = await uploadPdf('/api/unlock-pdf', workingPdf);
    const unlockBuf = Buffer.from(await unlockRes.arrayBuffer());
    const unlockedPath = path.join(CURRENT_DATA, '_audit_unlocked.pdf');
    fs.writeFileSync(unlockedPath, unlockBuf);
    workingPdf = unlockedPath;
    console.log('[livescan-audit] Step 2 unlock: OK');
  } catch (err) {
    console.log('[livescan-audit] Step 2 unlock skipped:', err.message.slice(0, 120));
  }

  const prepareRes = await uploadPdf('/api/prepare-pdf-fields', workingPdf);
  const preparedBuf = Buffer.from(await prepareRes.arrayBuffer());
  const preparedPath = path.join(CURRENT_DATA, '_audit_prepared.pdf');
  fs.writeFileSync(preparedPath, preparedBuf);
  console.log('[livescan-audit] Step 3 prepare: OK');

  const extraction = loadExtractionFromCurrentData();
  let fieldConfig;

  const storePreparedForm = new FormData();
  storePreparedForm.append('pdf', new Blob([preparedBuf], { type: 'application/pdf' }), 'prepared.pdf');
  const storePreparedRes = await fetch(`${BASE_URL}/api/auto-form/store-pdf`, { method: 'POST', body: storePreparedForm });
  const storePreparedData = await storePreparedRes.json();
  if (!storePreparedRes.ok || !storePreparedData.pdfToken) {
    throw new Error(storePreparedData.error || 'store-pdf failed before field-config');
  }
  let pdfToken = storePreparedData.pdfToken;

  if (SKIP_FIELD_CONFIG && fs.existsSync(path.join(CURRENT_DATA, 'field_config.json'))) {
    fieldConfig = readJson(path.join(CURRENT_DATA, 'field_config.json'));
    console.log('[livescan-audit] Step 4 field_config: cached');
  } else {
    console.log('[livescan-audit] Step 4 field_config: calling ChatGPT…');
    const fcRes = await fetch(`${BASE_URL}/api/generate-field-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...extraction, pdfToken }),
    });
    const fcData = await fcRes.json();
    if (!fcRes.ok || !fcData.success) throw new Error(fcData.error || 'field-config failed');
    fieldConfig = fcData.fieldConfig;
    console.log('[livescan-audit] Step 4 field_config: OK');
  }

  const sanitizeRes = await uploadPdf('/api/sanitize-pdf', preparedPath, { fieldConfig });
  const sanitizedBuf = Buffer.from(await sanitizeRes.arrayBuffer());
  const sanitizedPath = path.join(CURRENT_DATA, '_audit_sanitized.pdf');
  fs.writeFileSync(sanitizedPath, sanitizedBuf);

  const storeForm = new FormData();
  storeForm.append('pdf', new Blob([sanitizedBuf], { type: 'application/pdf' }), 'sanitized.pdf');
  const storeRes = await fetch(`${BASE_URL}/api/auto-form/store-pdf`, { method: 'POST', body: storeForm });
  const storeData = await storeRes.json();
  if (!storeRes.ok || !storeData.pdfToken) throw new Error(storeData.error || 'store-pdf failed');
  pdfToken = storeData.pdfToken;
  console.log('[livescan-audit] Step 5 sanitize+store: OK');

  console.log('[livescan-audit] Step 6 form_config: calling ChatGPT with PDF vision…');
  const fgRes = await fetch(`${BASE_URL}/api/generate-form-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fieldConfig,
        extractedDocumentContent: extraction.extractedDocumentContent,
        structuredFields: extraction.structuredFields || [],
        displayMode: 'all_at_once',
        userProfile: {},
        pdfToken,
      }),
    });
  const fgData = await fgRes.json();
  if (!fgRes.ok || !fgData.success) throw new Error(fgData.error || 'form-config failed');
  const formConfig = fgData.formConfig;
  console.log('[livescan-audit] Step 6 form_config: OK');

  formConfig.pdfToken = pdfToken;
  formConfig.displayMode = 'all_at_once';
  formConfig.htmlMode = 'normal';

  console.log('[livescan-audit] Step 8 HTML: building all-at-once + one-at-a-time (normal mode)…');
  const allAtOnceConfig = { ...formConfig, displayMode: 'all_at_once', htmlMode: 'normal' };
  const oneAtATimeConfig = { ...formConfig, displayMode: 'one_at_a_time', htmlMode: 'normal' };
  const formHtmlAllAtOnce = buildFormHtmlWithRenderer(
    allAtOnceConfig,
    fieldConfig,
    extraction.extractedDocumentContent,
    pdfToken
  );
  const formHtmlOneAtATime = buildFormHtmlWithRenderer(
    oneAtATimeConfig,
    fieldConfig,
    extraction.extractedDocumentContent,
    pdfToken
  );

  saveCurrentData({
    label: 'livescan-audit-run',
    fieldConfig,
    formConfig,
    formHtmlAllAtOnce,
    formHtmlOneAtATime,
    extractedDocumentContent: extraction.extractedDocumentContent,
    textFields: extraction.textFields,
    checkboxFields: extraction.checkboxFields,
    structuredFields: extraction.structuredFields,
  });

  const configAudit = auditFormConfig(formConfig, fieldConfig);
  const htmlAudit = auditHtml(formHtmlAllAtOnce, allAtOnceConfig, fieldConfig);

  console.log('\n========== LIVE SCAN GENERATION AUDIT ==========');
  console.log(`Form: ${formConfig.formTitle || 'Live Scan'}`);
  console.log(`Sections: ${configAudit.sectionCount}, Questions: ${configAudit.questionCount}`);
  console.log(`Field config fields: ${fieldConfig.fields?.length || 0}`);
  console.log(`HTML inputs detected: ${htmlAudit.inputCount}, question texts: ${htmlAudit.questionTextCount}`);
  console.log(`Output: ${path.join(CURRENT_DATA, 'all-at-once-generated-form.html')}`);
  console.log(`Preview all-at-once: ${BASE_URL}/Auto-Form-Creator/Current%20Data/all-at-once-generated-form.html`);
  console.log(`Preview one-at-a-time: ${BASE_URL}/Auto-Form-Creator/Current%20Data/one-at-a-time-generated-form.html`);

  const allFailures = [...configAudit.failures, ...htmlAudit.failures];
  const allWarnings = [...configAudit.warnings, ...htmlAudit.warnings];

  if (allWarnings.length) {
    console.log(`\nWarnings (${allWarnings.length}):`);
    allWarnings.forEach((w) => console.log('  ⚠', w));
  }

  if (allFailures.length === 0) {
    console.log('\n✓ ALL AUDIT CHECKS PASSED');
    process.exit(0);
  }

  console.log(`\nFailures (${allFailures.length}):`);
  allFailures.forEach((f) => console.log('  ✗', f));
  process.exit(1);
}

run().catch((err) => {
  console.error('[livescan-audit] Fatal:', err.message);
  process.exit(1);
});
