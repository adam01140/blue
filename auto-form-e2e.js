#!/usr/bin/env node
/**
 * End-to-end Auto-Form-Creator pipeline test + quality validation.
 * Usage: node auto-form-e2e.js [--base-url http://localhost:3000] [--skip-openai]
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { saveCurrentData } = require('./auto-form-current-data');
const { postProcessFormConfig } = require('./form-config-generator');
const { buildFormConfigSkeleton } = require('./form-config-skeleton');
const { enrichFieldConfig } = require('./structured-field-context');

const ROOT = __dirname;
const CURRENT_DATA = path.join(ROOT, 'public', 'Auto-Form-Creator', 'Current Data');
const BASE_URL = process.argv.includes('--base-url')
  ? process.argv[process.argv.indexOf('--base-url') + 1]
  : 'http://localhost:3000';
const SKIP_OPENAI = process.argv.includes('--skip-openai');
const PDF_CANDIDATES = [
  path.join(ROOT, 'public', 'Auto-Form-Creator', 'livescan.pdf'),
  path.join(ROOT, 'public', 'Auto-Form-Creator', 'unlocked-test.pdf'),
  path.join(ROOT, 'public', 'Forms', 'BCIA-8016', 'bcia8016.pdf'),
];

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
  const structuredFields = fs.existsSync(structuredPath)
    ? readJson(structuredPath)
    : [];
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

function buildFormHtml(formConfig, fieldConfig, extractedDocumentContent, pdfToken) {
  require(path.join(ROOT, 'public', 'Auto-Form-Creator', 'form-html-renderer.js'));
  const template = fs.readFileSync(
    path.join(ROOT, 'public', 'Auto-Form-Creator', 'form-template.html'),
    'utf8'
  );
  global.FormHtmlRenderer.setDefaultTemplate(template);
  return global.FormHtmlRenderer.build(formConfig, {}, {
    htmlMode: 'normal',
    pdfToken,
    fieldConfig,
    extractedDocumentContent,
  });
}

function collectQuestions(formConfig) {
  const out = [];
  for (const section of formConfig.sections || []) {
    for (const q of section.questions || []) out.push(q);
  }
  return out;
}

function validateFormConfig(formConfig, fieldConfig) {
  const failures = [];
  const questions = collectQuestions(formConfig);

  const garbageRe = /page\s*\d+\s*of\s*\d+|department\s+of\s+justice|state\s+of\s+|bcia\s*8016|request\s+for\s+live\s+scan\s+service/i;
  const vagueRe = /^what is your (a |an )?number\??$|^what is your your /i;

  for (const q of questions) {
    const text = String(q.text || '');
    if (garbageRe.test(text)) {
      failures.push(`Garbage question text: "${text.slice(0, 80)}..."`);
    }
    if (vagueRe.test(text.trim())) {
      failures.push(`Vague question: "${text}"`);
    }
    if (q.type === 'checkbox' && /^(male|female|doj|fbi)\??$/i.test(text.trim())) {
      failures.push(`Bare checkbox group title: "${text}"`);
    }
    if (q.needsExplanation !== true) {
      failures.push(`needsExplanation not true: Q${q.questionId} "${text.slice(0, 50)}"`);
    }
    const expl = String(q.explanation || '').trim();
    if (expl && (/^this is aka\b/i.test(expl) || expl.split(/\s+/).length < 6)) {
      failures.push(`Fragment explanation Q${q.questionId}: "${expl}"`);
    }
    if (q.autoTodayDate && !q.logic?.enabled) {
      // visible auto-today without gate is ok if hidden via autoTodayDate
    } else if (/signature.?date|today.?s?.?date/i.test(`${q.nameId || ''} ${text}`) && !q.autoTodayDate) {
      failures.push(`Signature/today date not auto-hidden: Q${q.questionId} nameId=${q.nameId}`);
    }
  }

  const originalAti = questions.find((q) => q.nameId === 'original_ati_number');
  if (originalAti) {
    if (!originalAti.logic?.enabled) {
      failures.push('original_ati_number missing logic.enabled gate');
    } else {
      const gate = questions.find((q) => String(q.questionId) === String(originalAti.logic.prevQuestion));
      if (!gate || !/resubmi/i.test(gate.text || '')) {
        failures.push('original_ati_number gate is not "Is this a resubmission?"');
      }
    }
  }

  for (const aliasName of ['other_name_first', 'other_name_last', 'other_name_suffix', 'other_first_name', 'other_last_name']) {
    const aliasQ = questions.find((q) => q.nameId === aliasName);
    if (!aliasQ) continue;
    if (aliasQ.linkedFieldRole === 'mirror') continue;
    if (!aliasQ.logic?.enabled) {
      failures.push(`${aliasName} missing alias gate logic`);
      continue;
    }
    const gate = questions.find((q) => String(q.questionId) === String(aliasQ.logic.prevQuestion));
    if (!gate || !/alias/i.test(gate.text || '')) {
      failures.push(`${aliasName} gate is not "Do you have an alias?"`);
    }
  }

  const aliasGates = questions.filter((q) => q.type === 'dropdown' && !q.nameId && /alias/i.test(q.text || ''));
  if (aliasGates.length > 1) {
    failures.push(`Duplicate alias gate questions (${aliasGates.length})`);
  }

  return failures;
}

function validateHtml(html) {
  const failures = [];
  if (!html.includes('wireConditionalLogic')) failures.push('HTML missing wireConditionalLogic');
  if (!html.includes('logic-gated')) failures.push('HTML missing logic-gated class');
  if (!html.includes('evaluateConditionalVisibility')) failures.push('HTML missing conditional visibility evaluator');
  if (/document\.write\(/.test(html)) failures.push('HTML uses document.write (preview anti-pattern)');

  const questionTexts = [...html.matchAll(/class="question-text">([^<]+)</g)].map((m) => m[1]);
  const garbageRe = /page\s*\d+\s*of\s*\d+|department\s+of\s+justice|state\s+of\s+|bcia\s*8016|request\s+for\s+live\s+scan\s+service/i;
  for (const text of questionTexts) {
    if (garbageRe.test(text)) failures.push(`HTML garbage question text: "${text.slice(0, 80)}"`);
    if (/What is your your Number/i.test(text)) failures.push('HTML contains vague "your Number" question');
    if (/^(Male|DOJ)\?$/i.test(text.trim())) failures.push(`HTML bare checkbox title: "${text}"`);
  }
  if (/class="question-container[^"]*"[^>]*data-question-id="[^"]*"[^>]*>[\s\S]*?applicant_signature_date/i.test(html)) {
    const sigBlock = html.match(/question-container[^>]*>[\s\S]{0,800}applicant_signature_date[\s\S]{0,400}/i);
    if (sigBlock && !/auto-today-date|hidden/.test(sigBlock[0])) {
      failures.push('applicant_signature_date visible in HTML (not auto-today hidden)');
    }
  }
  const thankYouFn = html.match(/function showAutoFormThankYou[\s\S]{0,600}/);
  if (thankYouFn && /questions\.style\.display\s*=\s*['"]none['"]/.test(thankYouFn[0])) {
    failures.push('showAutoFormThankYou hides #questions');
  }
  return failures;
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

async function runPipeline() {
  const pdfPath = PDF_CANDIDATES.find((p) => fs.existsSync(p));
  if (!pdfPath) throw new Error('No test PDF found');

  console.log(`[e2e] Using PDF: ${pdfPath}`);
  let workingPdf = pdfPath;

  // Step 2: unlock (best-effort — skip if already AcroForm)
  try {
    const unlockRes = await uploadPdf('/api/unlock-pdf', workingPdf);
    const unlockBuf = Buffer.from(await unlockRes.arrayBuffer());
    const unlockedPath = path.join(CURRENT_DATA, '_e2e_unlocked.pdf');
    fs.writeFileSync(unlockedPath, unlockBuf);
    workingPdf = unlockedPath;
    console.log('[e2e] Step 2 unlock: OK');
  } catch (err) {
    console.log('[e2e] Step 2 unlock skipped:', err.message.slice(0, 120));
  }

  // Step 3: prepare fields
  const prepareRes = await uploadPdf('/api/prepare-pdf-fields', workingPdf);
  const preparedBuf = Buffer.from(await prepareRes.arrayBuffer());
  const preparedPath = path.join(CURRENT_DATA, '_e2e_prepared.pdf');
  fs.writeFileSync(preparedPath, preparedBuf);
  console.log('[e2e] Step 3 prepare: OK');

  let extraction = loadExtractionFromCurrentData();
  let fieldConfig;

  const storePreparedForm = new FormData();
  storePreparedForm.append('pdf', new Blob([preparedBuf], { type: 'application/pdf' }), 'prepared.pdf');
  const storePreparedRes = await fetch(`${BASE_URL}/api/auto-form/store-pdf`, { method: 'POST', body: storePreparedForm });
  const storePreparedData = await storePreparedRes.json();
  if (!storePreparedRes.ok || !storePreparedData.pdfToken) {
    throw new Error(storePreparedData.error || 'store-pdf failed before field-config');
  }
  let pdfToken = storePreparedData.pdfToken;
  console.log('[e2e] PDF stored for vision: pdfToken=', pdfToken);

  if (SKIP_OPENAI && fs.existsSync(path.join(CURRENT_DATA, 'field_config.json'))) {
    fieldConfig = readJson(path.join(CURRENT_DATA, 'field_config.json'));
    console.log('[e2e] Step 4 field_config: using cached (--skip-openai)');
  } else {
    const fcRes = await fetch(`${BASE_URL}/api/generate-field-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...extraction, pdfToken }),
    });
    const fcData = await fcRes.json();
    if (!fcRes.ok || !fcData.success) throw new Error(fcData.error || 'field-config failed');
    fieldConfig = fcData.fieldConfig;
    console.log('[e2e] Step 4 field_config: OK');
  }

  saveCurrentData({
    label: 'e2e-step-4',
    fieldConfig,
    extractedDocumentContent: extraction.extractedDocumentContent,
    textFields: extraction.textFields,
    checkboxFields: extraction.checkboxFields,
    structuredFields: extraction.structuredFields,
  });

  // Step 5: sanitize + store PDF
  const sanitizeRes = await uploadPdf('/api/sanitize-pdf', preparedPath, { fieldConfig });
  const sanitizedBuf = Buffer.from(await sanitizeRes.arrayBuffer());
  const sanitizedPath = path.join(CURRENT_DATA, '_e2e_sanitized.pdf');
  fs.writeFileSync(sanitizedPath, sanitizedBuf);

  const storeForm = new FormData();
  storeForm.append('pdf', new Blob([sanitizedBuf], { type: 'application/pdf' }), 'sanitized.pdf');
  const storeRes = await fetch(`${BASE_URL}/api/auto-form/store-pdf`, { method: 'POST', body: storeForm });
  const storeData = await storeRes.json();
  if (!storeRes.ok || !storeData.pdfToken) throw new Error(storeData.error || 'store-pdf failed');
  pdfToken = storeData.pdfToken;
  console.log('[e2e] Step 5 sanitize+store: OK, pdfToken=', pdfToken);

  let formConfig;
  if (SKIP_OPENAI && fs.existsSync(path.join(CURRENT_DATA, 'form_config.json'))) {
    const enrichedFieldConfig = enrichFieldConfig(fieldConfig, extraction.structuredFields || [], extraction.extractedDocumentContent);
    const skeleton = buildFormConfigSkeleton(enrichedFieldConfig, {
      structuredFields: extraction.structuredFields || [],
      extractedDocumentContent: extraction.extractedDocumentContent,
      displayMode: 'one_at_a_time',
    });
    formConfig = postProcessFormConfig(skeleton, enrichedFieldConfig, {
      extractedDocumentContent: extraction.extractedDocumentContent,
      displayMode: 'one_at_a_time',
      userProfile: {},
    });
    console.log('[e2e] Step 6 form_config: deterministic skeleton (--skip-openai)');
  } else {
    const fgRes = await fetch(`${BASE_URL}/api/generate-form-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fieldConfig,
        extractedDocumentContent: extraction.extractedDocumentContent,
        structuredFields: extraction.structuredFields || [],
        displayMode: 'one_at_a_time',
        userProfile: {},
        pdfToken,
      }),
    });
    const fgData = await fgRes.json();
    if (!fgRes.ok || !fgData.success) throw new Error(fgData.error || 'form-config failed');
    formConfig = fgData.formConfig;
    console.log('[e2e] Step 6 form_config: OK');
  }

  formConfig.pdfToken = pdfToken;
  formConfig.displayMode = 'one_at_a_time';
  formConfig.htmlMode = 'normal';

  const formHtml = buildFormHtml(
    formConfig,
    fieldConfig,
    extraction.extractedDocumentContent,
    pdfToken
  );

  saveCurrentData({
    label: 'e2e-step-8',
    fieldConfig,
    formConfig,
    formHtml,
    extractedDocumentContent: extraction.extractedDocumentContent,
    textFields: extraction.textFields,
    checkboxFields: extraction.checkboxFields,
  });

  const configFailures = validateFormConfig(formConfig, fieldConfig);
  const htmlFailures = validateHtml(formHtml);
  const allFailures = [...configFailures, ...htmlFailures];

  console.log('\n[e2e] Quality check results:');
  if (allFailures.length === 0) {
    console.log('  ALL CHECKS PASSED');
  } else {
    console.log(`  ${allFailures.length} failure(s):`);
    allFailures.forEach((f) => console.log('   -', f));
  }

  return { passed: allFailures.length === 0, failures: allFailures, formConfig, formHtml };
}

async function main() {
  console.log(`[e2e] Base URL: ${BASE_URL}`);
  await waitForServer();
  const result = await runPipeline();
  console.log('\n[e2e] Outputs:');
  console.log('  form_config:', path.join(CURRENT_DATA, 'form_config.json'));
  console.log('  generated-form.html:', path.join(CURRENT_DATA, 'generated-form.html'));
  process.exit(result.passed ? 0 : 1);
}

main().catch((err) => {
  console.error('[e2e] Fatal:', err.message);
  process.exit(1);
});
