/**
 * Form config quality validation and repair — generic checks, no form-specific hardcoding.
 */

const formQuestionText = require('./form-question-text');
const { validateGateQuestionClarity } = require('./form-conditional-logic');
const { inferFieldDomain, getDomainWording } = require('./field-domain');
const { buildStructuredFieldMap } = require('./structured-field-context');

const GARBAGE_RE = /page\s*\d+\s*of\s*\d+|department\s+of\s+justice|state\s+of\s+|bcia\s*\d+|request\s+for\s+live\s+scan\s+service/i;

const AWKWARD_QUESTION_PATTERNS = [
  { pattern: /^what is your name of /i, reason: 'awkward "name of" phrasing' },
  { pattern: /^what is your your /i, reason: 'duplicate "your"' },
  { pattern: /^what is your box for /i, reason: 'unclear "box for" wording' },
  { pattern: /^what is your list account /i, reason: 'unclear list/account wording' },
  { pattern: /^what name and number to give/i, reason: 'instruction text used as question' },
  { pattern: /^what is your employer's employer /i, reason: 'duplicate employer phrasing' },
  { pattern: /agency's agency /i, reason: 'duplicate agency phrasing' },
  { pattern: /\bori code\b/, reason: 'ORI acronym not capitalized' },
  { pattern: /^what is your number\b/i, reason: 'vague number without OCA/billing context' },
  { pattern: /applicant number/i, reason: 'vague applicant number — prefer OCA when label is Your Number/OCA' },
  { pattern: /^what is the authorized applicant type/i, reason: 'agency field missing agency ownership' },
  { pattern: /^what is your .+\/.+\?$/i, reason: 'raw PDF slash label in question' },
  { pattern: /^(enter|list|provide|type|write)\b/i, reason: 'instruction used instead of a natural question' },
  { pattern: /^if\b/i, reason: 'conditional prefix belongs in logic, not question text' },
];

function validateQuestionClarity(formConfig) {
  const failures = [];
  const warnings = [];

  for (const { question } of collectQuestions(formConfig)) {
    const text = String(question.text || '').trim();
    if (!text) continue;

    for (const { pattern, reason } of AWKWARD_QUESTION_PATTERNS) {
      if (pattern.test(text)) {
        failures.push(`Q${question.questionId}: ${reason} — "${text.slice(0, 70)}"`);
        break;
      }
    }

    if (question.type === 'checkbox' && (question.options?.length || 0) > 1) {
      if (/^(male|female|doj|fbi)\??$/i.test(text)) {
        failures.push(`Q${question.questionId}: bare checkbox group title "${text}"`);
      }
      if (text.length < 12) {
        warnings.push(`Q${question.questionId}: checkbox group title may be too short ("${text}")`);
      }
    }

    const expl = String(question.explanation || '').trim();
    if (question.needsExplanation && expl) {
      if (/^enter your name of entity/i.test(expl)) {
        warnings.push(`Q${question.questionId}: explanation echoes raw PDF label`);
      }
      if (expl.split(/\s+/).length < 8 && question.type !== 'checkbox') {
        warnings.push(`Q${question.questionId}: explanation too short (${expl.split(/\s+/).length} words)`);
      }
    }

    if (question.logic?.enabled) {
      const prevId = question.logic.prevQuestion;
      const allQuestions = collectQuestions(formConfig).map((entry) => entry.question);
      const gate = allQuestions.find((q) => String(q.questionId) === String(prevId));
      if (!gate) {
        failures.push(`Q${question.questionId}: logic references missing gate Q${prevId}`);
      }
    }
  }

  return { failures, warnings };
}

function collectQuestions(formConfig) {
  const out = [];
  for (const section of formConfig?.sections || []) {
    for (const question of section.questions || []) {
      out.push({ question, section });
    }
  }
  return out;
}

function getQuestionNameId(question) {
  return question.nameId
    || question.options?.[0]?.nameId
    || question.textboxes?.[0]?.nameId
    || null;
}

function trustedStructuredContext(field, ctx) {
  if (!ctx?.nearestLabel || !field) return null;
  const sanitized = formQuestionText.sanitizeFieldLabel(ctx.nearestLabel, field.newName);
  if (formQuestionText.isSectionHeaderLabel(sanitized)) return null;
  if (formQuestionText.isGarbageText(sanitized) || formQuestionText.isVagueLabel(sanitized)) return null;
  if (!formQuestionText.labelAlignsWithField(field, sanitized)) return null;
  return { ...ctx, nearestLabel: sanitized, sanitizedLabel: sanitized };
}

function validateQuestionTextQuality(formConfig, fieldConfig, payload = {}) {
  const { extractedDocumentContent = '', structuredFields = [] } = payload;
  const fieldMap = new Map((fieldConfig?.fields || []).map((field) => [field.newName, field]));
  const contextMap = buildStructuredFieldMap(structuredFields);
  const failures = [];
  const warnings = [];
  const textToFields = new Map();

  for (const { question } of collectQuestions(formConfig)) {
    const nameId = getQuestionNameId(question);
    const field = nameId ? fieldMap.get(nameId) : null;
    const text = String(question.text || '').trim();

    if (!text) {
      failures.push(`Q${question.questionId}: empty question text (${nameId || 'no nameId'})`);
      continue;
    }
    if (GARBAGE_RE.test(text)) {
      failures.push(`Q${question.questionId}: garbage question text "${text.slice(0, 60)}…"`);
    }
    if (field && question.type !== 'checkbox' && question.type !== 'multipleTextboxes') {
      const ctx = trustedStructuredContext(field, contextMap.get(field.id));
      const label = formQuestionText.resolveSpecificFieldLabel(field, extractedDocumentContent, ctx);
      if (!formQuestionText.questionTextMatchesField(text, field, label)) {
        warnings.push(`Q${question.questionId} ("${nameId}") text may not match field label "${label}"`);
      }
    }

    const key = text.toLowerCase();
    if (!textToFields.has(key)) textToFields.set(key, []);
    textToFields.get(key).push({ questionId: question.questionId, nameId });
  }

  for (const [text, entries] of textToFields.entries()) {
    if (entries.length > 1) {
      const ids = entries.map((e) => `Q${e.questionId}(${e.nameId || '?'})`).join(', ');
      failures.push(`Duplicate question text (${entries.length}x): "${text.slice(0, 55)}${text.length > 55 ? '…' : ''}" — ${ids}`);
    }
  }

  const gateAudit = validateGateQuestionClarity(formConfig);
  failures.push(...gateAudit.failures);
  warnings.push(...gateAudit.warnings);

  const clarityAudit = validateQuestionClarity(formConfig);
  failures.push(...clarityAudit.failures);
  warnings.push(...clarityAudit.warnings);

  return { failures, warnings, ok: failures.length === 0 };
}

function addressPartRole(nameId, label = '') {
  const name = String(nameId || '').toLowerCase();
  const labelText = String(label || '').toLowerCase();
  const blob = `${name} ${labelText}`.trim();
  if (!blob) return null;

  // "Requester's name and address" is not a street line.
  if (/requester/.test(blob) || /name and address|name & address/.test(labelText)) {
    return null;
  }

  // Single PDF widget for city + state + ZIP (common on IRS forms).
  if (/city_state_zip|city_state_and_zip/.test(name) || /city,\s*state,\s*and\s*zip/.test(labelText)) {
    return 'cityStateZip';
  }

  if (/\bzip\b|_zip(_|$)/.test(blob)) return 'zip';
  if (/\bstate\b|_state(_|$)/.test(blob) && !/\bzip\b/.test(blob)) return 'state';
  if (/\bcity\b|_city(_|$)/.test(blob)) return 'city';

  if (
    /^(address|street|street_address|home_address|mailing_address)$/.test(name)
    || /street_?address|home_address|mailing_address|_address$/.test(name)
    || /^(address|street|p\.?o\.?\s*box)\b/.test(labelText)
  ) {
    return 'street';
  }
  return null;
}

function addressFamilyKey(nameId, field = null) {
  const n = String(nameId || '').toLowerCase();
  if (/city_state_zip|city_state_and_zip|^address$|^street$|^street_address$/.test(n)) {
    return `addr:${inferFieldDomain(field || { newName: nameId })}`;
  }
  return n
    .replace(/_(street_?address|street_or_po|home_address|mailing_address|address|city_state_zip|city|state|zip_?code|zip)$/i, '')
    .replace(/_+$/, '') || n;
}

function buildAddressTextbox(field, role, zipNameId = null) {
  if (role === 'state' && !field) {
    return {
      label: 'State',
      placeholder: 'State',
      pdfCombineInto: zipNameId || undefined,
      autopopulate: {
        enabled: true,
        profileKey: 'state',
        profileDescription: 'State',
      },
    };
  }
  const label = String(field?.label || role).trim() || role;
  const shortPlaceholder = role === 'street' ? 'Street address'
    : role === 'city' ? 'City'
      : role === 'state' ? 'State'
        : role === 'zip' ? 'ZIP Code'
          : role === 'cityStateZip' ? 'City, state, and ZIP code'
            : label;
  return {
    label,
    nameId: field.newName,
    placeholder: shortPlaceholder,
    autopopulate: {
      enabled: true,
      profileKey: field.newName,
      profileDescription: label,
    },
  };
}

/**
 * Merge street/city/state/zip questions for the same address family into one
 * multipleTextboxes question — even when PDF field order interleaved contact/phone
 * between street and city (common on government forms).
 */
function consolidateAddressQuestions(formConfig, fieldConfig, payload = {}) {
  if (!formConfig?.sections?.length || !fieldConfig?.fields?.length) return formConfig;

  const { extractedDocumentContent = '' } = payload;
  const families = new Map();

  for (const field of fieldConfig.fields) {
    if (field.type === 'checkbox') continue;
    const role = addressPartRole(field.newName, field.label);
    if (!role) continue;
    const key = addressFamilyKey(field.newName, field);
    if (!families.has(key)) families.set(key, {});
    families.get(key)[role] = field;
  }

  for (const [, parts] of families.entries()) {
    const partCount = Object.keys(parts).length;
    if (!parts.street || partCount < 2) continue;

    const targetNameIds = new Set(
      Object.values(parts).map((field) => field.newName).filter(Boolean)
    );

    const owned = [];
    for (let sIdx = 0; sIdx < formConfig.sections.length; sIdx += 1) {
      const section = formConfig.sections[sIdx];
      for (let qIdx = 0; qIdx < (section.questions || []).length; qIdx += 1) {
        const question = section.questions[qIdx];
        const ids = [];
        if (question.nameId) ids.push(question.nameId);
        for (const tb of question.textboxes || []) if (tb.nameId) ids.push(tb.nameId);
        const overlap = ids.filter((id) => targetNameIds.has(id));
        if (!overlap.length) continue;
        const onlyAddressParts = ids.every((id) => targetNameIds.has(id) || addressPartRole(id));
        if (!onlyAddressParts && question.type !== 'multipleTextboxes') continue;
        owned.push({ sIdx, qIdx, question, overlap });
      }
    }

    if (!owned.length) continue;

    const covered = new Set(owned.flatMap((entry) => entry.overlap));
    const alreadyGrouped = owned.length === 1
      && owned[0].question.type === 'multipleTextboxes'
      && [...targetNameIds].every((id) => covered.has(id));

    const hasCombinedCityStateZip = Boolean(parts.cityStateZip);
    const needsSyntheticState = !parts.state && parts.zip && !hasCombinedCityStateZip;
    const orderedRoles = ['street', 'city', 'state', 'cityStateZip', 'zip'];
    const canonicalTextboxes = [];
    for (const role of orderedRoles) {
      if (role === 'state' && needsSyntheticState) {
        canonicalTextboxes.push(buildAddressTextbox(null, 'state', parts.zip.newName));
        continue;
      }
      if (role === 'state' && !parts.state) continue;
      if (!parts[role]) continue;
      canonicalTextboxes.push(buildAddressTextbox(parts[role], role));
    }

    if (alreadyGrouped) {
      const question = owned[0].question;
      // Normalize the model's sub-controls from field_config rather than preserving
      // invented or duplicate state/city/ZIP boxes.
      question.textboxes = canonicalTextboxes;
      question.labels = canonicalTextboxes.map((tb) => tb.label || tb.placeholder || '');
      const primary = parts.street;
      question.text = formQuestionText.buildAddressQuestionText(inferFieldDomain(primary), primary);
      continue;
    }

    const primary = parts.street;
    const domain = inferFieldDomain(primary);
    const questionText = formQuestionText.buildAddressQuestionText(domain, primary);
    const merged = {
      questionId: owned[0].question.questionId,
      text: questionText,
      needsExplanation: true,
      explanation: formQuestionText.buildExplanationForQuestion(
        { type: 'multipleTextboxes', text: questionText, _addressDomain: domain },
        primary,
        extractedDocumentContent,
        null
      ),
      type: 'multipleTextboxes',
      logic: { enabled: false, prevQuestion: '', prevAnswer: '' },
      jump: { enabled: false, option: '', to: '' },
      options: [],
      labels: canonicalTextboxes.map((tb) => tb.label || tb.placeholder || ''),
      textboxes: canonicalTextboxes,
      placeholder: '',
      linkedToNameId: null,
      linkedFieldRole: 'primary',
      autopopulate: { enabled: false },
    };

    owned.sort((a, b) => (a.sIdx - b.sIdx) || (a.qIdx - b.qIdx));
    const insertSection = owned[0].sIdx;
    const insertAt = owned[0].qIdx;
    const removeSet = new Set(owned.map((entry) => `${entry.sIdx}:${entry.qIdx}`));

    for (let sIdx = formConfig.sections.length - 1; sIdx >= 0; sIdx -= 1) {
      const section = formConfig.sections[sIdx];
      for (let qIdx = (section.questions || []).length - 1; qIdx >= 0; qIdx -= 1) {
        if (removeSet.has(`${sIdx}:${qIdx}`)) {
          section.questions.splice(qIdx, 1);
        }
      }
    }

    const section = formConfig.sections[insertSection];
    const safeIndex = Math.min(insertAt, section.questions.length);
    section.questions.splice(safeIndex, 0, merged);
  }

  return formConfig;
}

function repairQuestionTextQuality(formConfig, fieldConfig, payload = {}) {
  const { extractedDocumentContent = '', structuredFields = [] } = payload;
  const fieldMap = new Map((fieldConfig?.fields || []).map((field) => [field.newName, field]));
  const contextMap = buildStructuredFieldMap(structuredFields);
  const clarity = validateQuestionClarity(formConfig);
  const badQuestionIds = new Set(
    clarity.failures
      .map((msg) => {
        const match = String(msg).match(/Q(\d+)/);
        return match ? Number(match[1]) : null;
      })
      .filter(Boolean)
  );

  for (const { question } of collectQuestions(formConfig)) {
    if (question.type === 'multipleTextboxes' && question.textboxes?.length) {
      const primary = fieldMap.get(question.textboxes[0].nameId);
      if (primary) {
        question.text = formQuestionText.buildAddressQuestionText(inferFieldDomain(primary), primary);
      }
      continue;
    }
    if (question.type === 'checkbox') {
      if ((question.options?.length || 0) > 1) continue;
      const optLabel = String(question.options?.[0]?.label || question.text || '').replace(/\?+$/, '');
      if (/^check if\b/i.test(optLabel)) {
        question.text = optLabel.endsWith('?') ? optLabel : `${optLabel}?`;
      } else {
        question.text = `Please confirm: ${optLabel}`;
      }
      continue;
    }
    if (!question.nameId || !fieldMap.has(question.nameId)) continue;

    const field = fieldMap.get(question.nameId);
    const ctx = trustedStructuredContext(field, contextMap.get(field.id));
    const resolvedLabel = formQuestionText.resolveSpecificFieldLabel(field, extractedDocumentContent, ctx);
    const text = String(question.text || '').trim();
    const domain = inferFieldDomain(field);
    const missingAgencyOwnership = domain === 'Agency'
      && !/agency|contributing|ori|oca|mail code|billing|authorized to receive/i.test(text);
    const weakAgencyPossessive = domain === 'Agency'
      && /\bthe agency's\b/i.test(text)
      && !/contributing agency/i.test(text)
      && !/name of the agency/i.test(text);
    const vagueTrackingNumber = /your_number|oca_number|applicant_number/.test(question.nameId || '')
      && !/\boca\b/i.test(text);
    const missingOptionalContext = /\boptional\b|\bif applicable\b|\bif any\b/i.test(resolvedLabel)
      && !/\boptional\b|\bif applicable\b|\bif any\b/i.test(text);
    const needsRewrite = !text
      || formQuestionText.isGarbageText(text)
      || badQuestionIds.has(question.questionId)
      || missingAgencyOwnership
      || weakAgencyPossessive
      || vagueTrackingNumber
      || missingOptionalContext
      || !formQuestionText.questionTextMatchesField(text, field, resolvedLabel)
      || AWKWARD_QUESTION_PATTERNS.some(({ pattern }) => pattern.test(text));

    if (needsRewrite) {
      question.text = formQuestionText.buildQuestionTextForField(field, extractedDocumentContent, ctx);
    }
    question.placeholder = resolvedLabel;
    question.needsExplanation = true;
  }

  return dedupeQuestionTexts(formConfig, fieldConfig, payload);
}

function dedupeQuestionTexts(formConfig, fieldConfig, payload = {}) {
  const { extractedDocumentContent = '', structuredFields = [] } = payload;
  const fieldMap = new Map((fieldConfig?.fields || []).map((field) => [field.newName, field]));
  const contextMap = buildStructuredFieldMap(structuredFields);
  const seen = new Map();

  for (const { question } of collectQuestions(formConfig)) {
    const nameId = getQuestionNameId(question);
    if (!nameId) continue;
    const key = String(question.text || '').trim().toLowerCase();
    if (!key) continue;

    if (!seen.has(key)) {
      seen.set(key, question);
      continue;
    }

    const field = fieldMap.get(nameId);
    if (!field) continue;
    const ctx = trustedStructuredContext(field, contextMap.get(field.id));
    question.text = formQuestionText.buildQuestionTextForField(field, extractedDocumentContent, ctx);
    question.placeholder = formQuestionText.resolveSpecificFieldLabel(field, extractedDocumentContent, ctx);
  }

  return formConfig;
}

const DOMAIN_SECTION_TITLES = {
  Agency: 'Contributing Agency Information',
  Applicant: 'Applicant Information',
  Employer: 'Employer Information',
  Service: 'Level of Service',
  Operator: 'Live Scan Completion',
  Legal: 'Signature and Privacy',
};

function applyDomainSectionTitles(formConfig, fieldConfig) {
  if (!formConfig?.sections?.length || !fieldConfig?.fields?.length) return formConfig;

  const fieldMap = new Map(fieldConfig.fields.map((field) => [field.newName, field]));

  for (const section of formConfig.sections) {
    const domainCounts = new Map();
    for (const question of section.questions || []) {
      const nameId = getQuestionNameId(question);
      const field = nameId ? fieldMap.get(nameId) : null;
      if (!field) continue;
      const domain = inferFieldDomain(field);
      domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
    }

    if (!domainCounts.size) continue;

    let dominant = 'Applicant';
    let max = 0;
    for (const [domain, count] of domainCounts.entries()) {
      if (count > max) {
        max = count;
        dominant = domain;
      }
    }

    const title = DOMAIN_SECTION_TITLES[dominant] || getDomainWording(dominant).pdfSection;
    if (title) section.sectionName = title;
  }

  return formConfig;
}

module.exports = {
  collectQuestions,
  getQuestionNameId,
  trustedStructuredContext,
  validateQuestionTextQuality,
  validateQuestionClarity,
  repairQuestionTextQuality,
  consolidateAddressQuestions,
  addressPartRole,
  addressFamilyKey,
  dedupeQuestionTexts,
  applyDomainSectionTitles,
  GARBAGE_RE,
};
