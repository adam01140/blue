#!/usr/bin/env node
/**
 * Apply full quality pass to cached Current Data and rebuild HTML previews.
 * Usage: node scripts/repair-current-form-config.js
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { saveCurrentData } = require('../auto-form-current-data');
const { applyFullQualityPass, validateFullQuality } = require('../pipeline-quality');
const { applyDeterministicExplanations } = require('../form-config-generator');

const ROOT = path.join(__dirname, '..');
const CURRENT_DATA = path.join(ROOT, 'public', 'Auto-Form-Creator', 'Current Data');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

const fieldConfig = readJson(path.join(CURRENT_DATA, 'field_config.json'));
const formConfig = readJson(path.join(CURRENT_DATA, 'form_config.json'));
const structuredFields = fs.existsSync(path.join(CURRENT_DATA, 'structured-fields.json'))
  ? readJson(path.join(CURRENT_DATA, 'structured-fields.json'))
  : [];
const extractedDocumentContent = fs.readFileSync(
  path.join(CURRENT_DATA, 'extracted-document-content.txt'),
  'utf8'
);

const payload = { extractedDocumentContent, structuredFields };
applyFullQualityPass(formConfig, fieldConfig, payload);
applyDeterministicExplanations(formConfig, fieldConfig, payload);

const quality = validateFullQuality(formConfig, fieldConfig, payload);

console.log('Quality failures:', quality.failures.length);
quality.failures.forEach((f) => console.log('  ✗', f));
console.log('Quality warnings:', quality.warnings.length);
quality.warnings.slice(0, 15).forEach((w) => console.log('  ⚠', w));

const pdfToken = formConfig.pdfToken || null;
const allAtOnce = { ...formConfig, displayMode: 'all_at_once', htmlMode: 'normal' };
const oneAtATime = { ...formConfig, displayMode: 'one_at_a_time', htmlMode: 'normal' };

saveCurrentData({
  label: 'repair-current-form-config',
  fieldConfig,
  formConfig,
  formHtmlAllAtOnce: buildFormHtml(allAtOnce, fieldConfig, extractedDocumentContent, pdfToken),
  formHtmlOneAtATime: buildFormHtml(oneAtATime, fieldConfig, extractedDocumentContent, pdfToken),
  extractedDocumentContent,
});

console.log('\nRepaired form_config saved to Current Data.');
process.exit(quality.failures.length ? 1 : 0);
