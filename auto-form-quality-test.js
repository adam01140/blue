#!/usr/bin/env node
/**
 * Deterministic pipeline quality test (no OpenAI).
 * Builds form_config from cached field_config + structured-fields using skeleton + post-process.
 *
 * Usage: node auto-form-quality-test.js
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { buildFormConfigSkeleton } = require('./form-config-skeleton');
const { postProcessFormConfig } = require('./form-config-generator');
const { enrichFieldConfig } = require('./structured-field-context');

const CURRENT_DATA = path.join(__dirname, 'public', 'Auto-Form-Creator', 'Current Data');

function readJson(name) {
  const filePath = path.join(CURRENT_DATA, name);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function collectQuestions(formConfig) {
  const out = [];
  for (const section of formConfig.sections || []) {
    for (const q of section.questions || []) out.push(q);
  }
  return out;
}

function validate(formConfig, fieldConfig) {
  const failures = [];
  const questions = collectQuestions(formConfig);
  const garbageRe = /page\s*\d+\s*of\s*\d+|department\s+of\s+justice|state\s+of\s+|bcia\s*8016|request\s+for\s+live\s+scan\s+service/i;
  const vagueRe = /^what is your (a |an )?number\??$|^what is your your /i;

  for (const q of questions) {
    const text = String(q.text || '');
    if (garbageRe.test(text)) failures.push(`Garbage: "${text.slice(0, 70)}..."`);
    if (vagueRe.test(text.trim())) failures.push(`Vague: "${text}"`);
    if (q.type === 'checkbox' && /^(male|female|doj|fbi)\??$/i.test(text.trim())) {
      failures.push(`Bare checkbox title: "${text}"`);
    }
    if (q.needsExplanation !== true) failures.push(`needsExplanation false: Q${q.questionId}`);
    const expl = String(q.explanation || '').trim();
    if (!expl || expl.split(/\s+/).length < 6) {
      failures.push(`Short explanation Q${q.questionId}: "${expl}"`);
    }
  }

  const required = new Set((fieldConfig.fields || []).map((f) => f.newName));
  const covered = new Set();
  for (const q of questions) {
    if (q.nameId) covered.add(q.nameId);
    for (const opt of q.options || []) if (opt.nameId) covered.add(opt.nameId);
    for (const tb of q.textboxes || []) if (tb.nameId) covered.add(tb.nameId);
  }
  for (const name of required) {
    if (!covered.has(name)) failures.push(`Missing nameId: ${name}`);
  }

  const oriQ = questions.find((q) => q.nameId === 'ori_code');
  if (oriQ && garbageRe.test(oriQ.text)) failures.push('ori_code still has garbage question text');

  const sexQ = questions.find((q) => q.type === 'checkbox' && (q.options || []).some((o) => o.nameId === 'applicant_sex_male'));
  if (sexQ && sexQ.options.length < 3) failures.push('Sex checkboxes not merged into one question');

  if ((formConfig.sections || []).length < 3) {
    failures.push(`Only ${formConfig.sections?.length || 0} section(s) — expected at least 3 for Live Scan`);
  } else if ((formConfig.sections || []).length < 2) {
    failures.push(`Only ${formConfig.sections?.length || 0} section(s) — minimum is 2`);
  }

  const agencyStreetQ = collectQuestions(formConfig).find((q) => q.nameId === 'agency_street_address_or_po_box' || q.nameId === 'agency_street_address');
  if (agencyStreetQ && !/agency/i.test(agencyStreetQ.text)) {
    failures.push(`Agency street question lacks agency context: "${agencyStreetQ.text}"`);
  }
  if (agencyStreetQ && /your personal|not your personal|contributing agency/i.test(agencyStreetQ.explanation || '') === false
    && !/agency/i.test(agencyStreetQ.explanation || '')) {
    failures.push('Agency street explanation does not clarify agency vs personal');
  }

  const badTransactionNames = (fieldConfig.fields || []).filter((f) => /^transaction_/.test(f.newName));
  if (badTransactionNames.length > 0) {
    failures.push(`Erroneous transaction_ prefix on: ${badTransactionNames.slice(0, 3).map((f) => f.newName).join(', ')}`);
  }

  const transactionOnlySection = (formConfig.sections || []).some((s) => /^transaction$/i.test(s.sectionName || ''))
    && (formConfig.sections || []).length <= 1;
  if (transactionOnlySection) failures.push('Single "Transaction" section for entire livescan form');

  return failures;
}

function main() {
  let fieldConfig = readJson('field_config.json');
  if (!fieldConfig) {
    console.error('Missing field_config.json in Current Data');
    process.exit(1);
  }

  const structuredFields = readJson('structured-fields.json') || [];
  const extractedDocumentContent = fs.existsSync(path.join(CURRENT_DATA, 'extracted-document-content.txt'))
    ? fs.readFileSync(path.join(CURRENT_DATA, 'extracted-document-content.txt'), 'utf8')
    : '';

  fieldConfig = enrichFieldConfig(fieldConfig, structuredFields, extractedDocumentContent);

  const skeleton = buildFormConfigSkeleton(fieldConfig, {
    structuredFields,
    extractedDocumentContent,
    displayMode: 'one_at_a_time',
  });

  const formConfig = postProcessFormConfig(skeleton, fieldConfig, {
    extractedDocumentContent,
    displayMode: 'one_at_a_time',
    userProfile: {},
    structuredFields,
  });

  fs.writeFileSync(
    path.join(CURRENT_DATA, 'form_config.json'),
    JSON.stringify(formConfig, null, 2),
    'utf8'
  );

  const failures = validate(formConfig, fieldConfig);
  console.log(`[quality-test] Sections: ${formConfig.sections.length}, Questions: ${collectQuestions(formConfig).length}`);
  if (failures.length === 0) {
    console.log('[quality-test] ALL CHECKS PASSED');
    process.exit(0);
  }
  console.log(`[quality-test] ${failures.length} failure(s):`);
  failures.forEach((f) => console.log('  -', f));
  process.exit(1);
}

main();
