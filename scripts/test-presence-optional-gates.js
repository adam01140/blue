#!/usr/bin/env node
/**
 * Unit checks for presence-optional gating (never assume business/entity/spouse facts).
 * Usage: node scripts/test-presence-optional-gates.js
 */
const assert = require('assert');
const path = require('path');
const {
  isPresenceOptionalField,
  inferSpecificGateQuestion,
  validatePresenceOptionalGates,
} = require('../form-conditional-logic');
const { ensureConditionalGateQuestions, postProcessFormConfig } = require('../form-config-generator');

function collectQuestions(formConfig) {
  const out = [];
  for (const section of formConfig.sections || []) {
    for (const q of section.questions || []) out.push(q);
  }
  return out;
}

function testPresenceDetection() {
  assert.strictEqual(
    isPresenceOptionalField({ newName: 'business_name', label: 'Business name/disregarded entity name' }),
    true
  );
  assert.strictEqual(
    isPresenceOptionalField({ newName: 'taxpayer_name', label: 'Name of entity/individual' }),
    false
  );
  assert.strictEqual(
    isPresenceOptionalField({ newName: 'exempt_payee_code', label: 'Exempt payee code (if any)' }),
    false
  );
  const gate = inferSpecificGateQuestion({
    newName: 'business_name',
    label: 'Business name/disregarded entity name',
  });
  assert.match(gate, /business name or disregarded entity name/i);
  console.log('✓ presence detection + gate wording');
}

function testEnsureGateOnW9Snippet() {
  const fieldConfig = {
    fields: [
      { id: 'f1', newName: 'taxpayer_name', type: 'text', label: 'Name of entity/individual' },
      { id: 'f2', newName: 'business_name', type: 'text', label: 'Business name/disregarded entity name' },
    ],
  };
  const formConfig = {
    sections: [{
      sectionId: 1,
      sectionName: 'Applicant Information',
      questions: [
        {
          questionId: 1,
          text: 'What is your name as shown on your tax return?',
          type: 'text',
          nameId: 'taxpayer_name',
          needsExplanation: true,
          explanation: 'Enter the name exactly as shown on your tax return for the taxpayer.',
          logic: { enabled: false, prevQuestion: '', prevAnswer: '' },
          jump: { enabled: false, option: '', to: '' },
          options: [],
        },
        {
          questionId: 2,
          text: 'What is your business name or disregarded entity name?',
          type: 'text',
          nameId: 'business_name',
          needsExplanation: true,
          explanation: 'Enter a business or disregarded entity name only if you have one that differs from line 1.',
          logic: { enabled: false, prevQuestion: '', prevAnswer: '' },
          jump: { enabled: false, option: '', to: '' },
          options: [],
        },
      ],
    }],
  };

  const gated = ensureConditionalGateQuestions(JSON.parse(JSON.stringify(formConfig)), fieldConfig);
  const questions = collectQuestions(gated);
  const business = questions.find((q) => q.nameId === 'business_name');
  assert.ok(business, 'business_name question present');
  assert.ok(business.logic?.enabled, 'business_name must be logic-gated');
  const gate = questions.find((q) => String(q.questionId) === String(business.logic.prevQuestion));
  assert.ok(gate && gate.type === 'dropdown' && !gate.nameId, 'must reference Yes/No gate');
  assert.match(String(gate.text), /do you have a business name or disregarded entity name/i);
  assert.strictEqual(String(business.logic.prevAnswer), 'Yes');

  const audit = validatePresenceOptionalGates(gated, fieldConfig);
  assert.deepStrictEqual(audit.failures, [], audit.failures.join('; '));
  console.log('✓ ensureConditionalGateQuestions gates business_name');
}

function testPostProcessW9Artifact() {
  const fieldConfig = require(path.join(
    __dirname,
    '..',
    'public/Auto-Form-Creator/Demo_form_hub/forms/w-9-form/field_config.json'
  ));
  const ideal = require(path.join(
    __dirname,
    '..',
    'public/Auto-Form-Creator/Demo_form_hub/forms/w-9-form/form_config.json'
  ));

  // Simulate stale ungated business_name (as currently shipped before this fix).
  const stale = JSON.parse(JSON.stringify(ideal));
  for (const section of stale.sections || []) {
    for (const q of section.questions || []) {
      if (q.nameId === 'business_name') {
        q.logic = { enabled: false, prevQuestion: '', prevAnswer: '' };
      }
    }
  }

  const refined = postProcessFormConfig(stale, fieldConfig, {
    extractedDocumentContent: '',
    displayMode: 'all_at_once',
    userProfile: {},
    structuredFields: [],
  });

  // AI-first: postProcess must NOT invent gates — it only validates so the AI revise loop can fix.
  const audit = validatePresenceOptionalGates(refined, fieldConfig);
  assert.ok(audit.failures.length >= 1, 'ungated business_name must be reported, not silently rewritten');
  assert.match(audit.failures[0], /business_name/);
  const business = collectQuestions(refined).find((q) => q.nameId === 'business_name');
  assert.ok(!business?.logic?.enabled, 'postProcess must leave ungated business_name for AI revise');
  console.log('✓ postProcess reports ungated W-9 business_name without rewriting');
}

function main() {
  testPresenceDetection();
  testEnsureGateOnW9Snippet();
  testPostProcessW9Artifact();
  console.log('\nAll presence-optional gate tests passed.');
}

main();
