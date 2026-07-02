/**
 * Shared question text, label resolution, and explanation helpers
 * for field_config and form_config generation.
 */

const { inferFieldDomain, getDomainWording } = require('./field-domain');

const FIELD_ACRONYMS = new Set(['ati', 'oca', 'ori', 'doj', 'fbi', 'ssn', 'zip', 'cdl']);

const VAGUE_LABELS = new Set([
  'number', 'your number', 'code', 'your code', 'id', 'your id',
  'misc number', 'misc. number', 'identifier', 'city', 'zip code', 'zip', 'state',
]);

const GARBAGE_LABEL_PATTERNS = [
  /page\s*\d+\s*of\s*\d+/gi,
  /state\s+of\s+[a-z]+/gi,
  /department\s+of\s+justice/gi,
  /request\s+for\s+live\s+scan/gi,
  /applicant\s+submission/gi,
  /\bpage\s*\d+\b/gi,
  /\(rev\.\s*\d+\/\d+\)/gi,
  /bcia\s*\d+/gi,
];

function titleCaseWord(word) {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function formatFieldNameAsLabel(newName) {
  if (!newName) return '';
  return String(newName)
    .split('_')
    .filter(Boolean)
    .map((word) => (FIELD_ACRONYMS.has(word.toLowerCase()) ? word.toUpperCase() : titleCaseWord(word)))
    .join(' ');
}

function isGarbageText(text) {
  const normalized = String(text || '').trim();
  return !normalized
    || normalized.length > 80
    || /page\s*\d/i.test(normalized)
    || /department\s+of\s+justice/i.test(normalized)
    || /state\s+of\s+/i.test(normalized)
    || /request\s+for\s+/i.test(normalized)
    || /bcia\s*\d/i.test(normalized);
}

function sanitizeFieldLabel(label, newName) {
  let text = String(label || '').trim();
  for (const pattern of GARBAGE_LABEL_PATTERNS) {
    text = text.replace(pattern, ' ');
  }
  text = text.replace(/\s+/g, ' ').trim();

  if (isGarbageText(text)) {
    const fallback = formatFieldNameAsLabel(newName);
    return fallback || text.slice(0, 80);
  }
  return text;
}

function isVagueLabel(label) {
  const normalized = String(label || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return !normalized || VAGUE_LABELS.has(normalized);
}

function extractLabelFromDocument(field, extractedDocumentContent) {
  const doc = String(extractedDocumentContent || '');
  const fieldId = field?.id;
  if (!doc || !fieldId) return '';

  const marker = field.type === 'checkbox' ? `{{${fieldId}}}` : `[[${fieldId}]]`;
  const idx = doc.indexOf(marker);
  if (idx < 0) return '';

  const before = doc.slice(Math.max(0, idx - 120), idx);
  const lines = before.split(/\n/).map((line) => line.trim()).filter(Boolean);
  const lastLine = lines[lines.length - 1] || before.trim();
  const match = lastLine.match(/([A-Za-z][A-Za-z0-9\s.,\-/()]{1,48})$/);
  const raw = match ? match[1].trim().replace(/\s+/g, ' ') : '';
  return sanitizeFieldLabel(raw, field?.newName);
}

function resolveSpecificFieldLabel(field, extractedDocumentContent = '', structuredContext = null) {
  const ctxLabel = structuredContext?.nearestLabel || structuredContext?.sanitizedLabel;
  if (ctxLabel && !isVagueLabel(ctxLabel) && !isGarbageText(ctxLabel)) {
    return sanitizeFieldLabel(ctxLabel, field?.newName);
  }

  const configLabel = sanitizeFieldLabel(field?.label, field?.newName);
  if (configLabel && !isVagueLabel(configLabel) && !isGarbageText(configLabel)) {
    return configLabel;
  }

  const docLabel = extractLabelFromDocument(field, extractedDocumentContent);
  if (docLabel && !isVagueLabel(docLabel) && !isGarbageText(docLabel)) return docLabel;

  const domain = inferFieldDomain(field);
  const fromName = formatFieldNameAsLabel(field?.newName);
  if (fromName && !isVagueLabel(fromName)) {
    if (domain === 'Agency' && /^city$/i.test(fromName)) return 'Agency City';
    if (domain === 'Agency' && /^state$/i.test(fromName)) return 'Agency State';
    if (domain === 'Agency' && /zip/i.test(fromName)) return 'Agency ZIP Code';
    if (domain === 'Applicant' && /home.*city/i.test(field?.newName || '')) return 'Home City';
    if (domain === 'Employer' && /^city$/i.test(fromName)) return 'Employer City';
    return fromName;
  }

  return configLabel || docLabel || fromName;
}

function simplifyLabelForQuestion(label) {
  let text = String(label || '').trim().replace(/\s+/g, ' ');
  if (!text) return text;

  if (/\bori\b/i.test(text)) return 'ORI code';
  if (/\boca\b/i.test(text) || /^your number$/i.test(text)) return 'OCA number';
  if (/\bati\b/i.test(text) && /original/i.test(text)) return 'original ATI number';
  if (/mail\s*code/i.test(text)) return 'mail code';
  if (/billing/i.test(text)) return 'billing number';

  text = text.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  return text;
}

function buildQuestionTextForField(field, extractedDocumentContent = '', structuredContext = null) {
  const domain = inferFieldDomain(field);
  const wording = getDomainWording(domain);
  const rawLabel = resolveSpecificFieldLabel(field, extractedDocumentContent, structuredContext);
  const label = simplifyLabelForQuestion(rawLabel);
  if (!label) return 'Please provide this information.';

  const lowerLabel = label.charAt(0).toLowerCase() + label.slice(1);

  if (domain === 'Agency') {
    if (/^what is/i.test(label)) return label.endsWith('?') ? label : `${label}?`;
    return `What is ${wording.possessive} ${lowerLabel}?`;
  }
  if (domain === 'Employer') {
    return `What is ${wording.possessive} ${lowerLabel}?`;
  }
  if (domain === 'Operator') {
    return `What is ${wording.possessive} ${lowerLabel}?`;
  }

  if (/^(what|when|where|who|how|is|are|do|does|please)\b/i.test(label)) {
    return label.endsWith('?') ? label : `${label}?`;
  }
  if (/^your\s+/i.test(label)) {
    const withQuestion = label.endsWith('?') ? label : `${label}?`;
    return withQuestion.replace(/\byour\s+your\b/gi, 'your');
  }
  if (/^(ORI|OCA|ATI)\s/i.test(label) || /ori code|oca number|ati number/i.test(label)) {
    return `What is your ${label}?`.replace(/\byour\s+your\b/gi, 'your');
  }
  return `What is your ${lowerLabel}?`.replace(/\byour\s+your\b/gi, 'your');
}

function buildAddressQuestionText(domain) {
  const wording = getDomainWording(domain);
  if (domain === 'Agency') return 'What is the contributing agency\'s address?';
  if (domain === 'Employer') return 'What is your employer\'s address?';
  return 'What is your home address?';
}

function buildExplanationForQuestion(question, field, extractedDocumentContent = '', structuredContext = null) {
  const domain = inferFieldDomain(field);
  const wording = getDomainWording(domain);
  const label = resolveSpecificFieldLabel(field, extractedDocumentContent, structuredContext)
    || String(question?.text || '').replace(/\?+$/, '');
  const nameBlob = `${field?.newName || ''} ${label}`.toLowerCase();

  if (/alias|aka|other_(first|last|middle)_name/.test(nameBlob)) {
    return 'Enter any alias or other name you have used, if different from your legal name. This appears in the Applicant Information section of the form.';
  }
  if (/mail.?code/i.test(nameBlob)) {
    if (domain === 'Employer') {
      return 'Enter the five-digit mail code assigned to your employer by the Department of Justice. This is in the Employer section — not the agency mail code.';
    }
    return 'Enter the five-digit mail code assigned to the contributing agency by the Department of Justice. This is in the Contributing Agency Information section — not your personal address.';
  }
  if (/\bori\b/i.test(nameBlob)) {
    return 'Enter the ORI (Originating Agency Identifier) code assigned to the contributing agency by the DOJ. This identifies the agency submitting the live scan — not your personal information.';
  }
  if (/\boca\b|yournumber|your number/i.test(nameBlob)) {
    return 'Enter your OCA (Operator Control Agency) number — the agency identifying number for this submission. This is about the agency\'s tracking number, not your home address.';
  }
  if (/\bati\b/i.test(nameBlob) && /original/i.test(nameBlob)) {
    return 'If you are resubmitting, enter the ATI number from your original live scan submission. You must provide proof of rejection.';
  }
  if (/street|address|p\.?o\.?\s*box/i.test(nameBlob)) {
    if (domain === 'Agency') {
      return `This asks for ${wording.subject}'s street address or P.O. Box — not ${wording.notWho} home address. Find it in the "${wording.pdfSection}" section on the PDF.`;
    }
    if (domain === 'Employer') {
      return `This asks for ${wording.subject}'s street address or P.O. Box — not your personal home address unless you live at your workplace. See the Employer section on the PDF.`;
    }
    return 'Enter your home street address or P.O. Box as the applicant. This is your personal residence — not the agency or employer address.';
  }
  if (/\bcity\b/i.test(nameBlob)) {
    if (domain === 'Agency') return 'Enter the city for the contributing agency\'s address — not your home city.';
    if (domain === 'Employer') return 'Enter the city where your employer is located — not your home city.';
    return 'Enter the city for your home address as the applicant.';
  }
  if (/\bstate\b/i.test(nameBlob) || /\bzip\b/i.test(nameBlob)) {
    if (domain === 'Agency') return `Enter the state and ZIP for ${wording.subject}'s address in the Contributing Agency Information section.`;
    if (domain === 'Employer') return `Enter the state and ZIP for ${wording.subject}'s address in the Employer section.`;
    return 'Enter the state and ZIP for your home address as the applicant.';
  }
  if (/contact.*phone|telephone|phone/i.test(nameBlob)) {
    if (domain === 'Agency') return 'Enter the contact telephone number for the contributing agency — the person who can be reached about this submission.';
    if (domain === 'Employer') return 'Enter your employer\'s telephone number (optional on the PDF).';
    return 'Enter a phone number where you can be reached about this application.';
  }
  if (/authorized.*applicant/i.test(nameBlob)) {
    return 'Enter the authorized applicant type code for this submission, as assigned or required by the DOJ for your agency\'s live scan category.';
  }
  if (/type.*license|working title/i.test(nameBlob)) {
    return 'Enter the type of license, certification, permit, or working title (maximum 30 characters). Use the exact title assigned by the DOJ if applicable.';
  }
  if (question?.autoTodayDate) {
    return 'This date is automatically set to today\'s date for your convenience.';
  }
  if (question?.type === 'date') {
    return `Enter ${wording.who === 'you' ? 'your' : wording.possessive} ${label.toLowerCase()} as shown on official records. Use MM/DD/YYYY.`;
  }
  if (question?.type === 'phone') {
    return `Enter a phone number for ${wording.subject} regarding ${label.toLowerCase()}.`;
  }
  if (question?.type === 'checkbox') {
    if (/sex|male|female|nonbinary|gender/i.test(nameBlob)) {
      return 'Select the option that best describes your sex as required in the Applicant Information section.';
    }
    if (/doj|fbi|level.?of.?service/i.test(nameBlob)) {
      return 'Select whether this submission requires DOJ, FBI, or both levels of service. If FBI is selected, fingerprints will be checked against FBI records.';
    }
    return 'Select the option or options that best apply to your situation.';
  }
  if (question?.type === 'dropdown' && !question?.nameId) {
    return 'Choose Yes or No to determine whether the following question applies to you.';
  }
  if (question?.type === 'multipleTextboxes') {
    const qDomain = question._addressDomain || domain;
    const qWording = getDomainWording(qDomain);
    if (qDomain === 'Agency') {
      return `Enter the complete address for ${qWording.subject} — street or P.O. Box, city, state, and ZIP. This is not your personal home address.`;
    }
    if (qDomain === 'Employer') {
      return `Enter the complete address for ${qWording.subject} — street or P.O. Box, city, state, and ZIP.`;
    }
    return 'Enter your complete home address — street or P.O. Box, city, state, and ZIP — as the applicant.';
  }

  if (domain === 'Agency') {
    return `Enter ${wording.possessive} ${label.toLowerCase()} exactly as it should appear in the "${wording.pdfSection}" section on the PDF. This is about ${wording.subject}, not about you personally.`;
  }
  if (domain === 'Employer') {
    return `Enter ${wording.possessive} ${label.toLowerCase()} for the Employer section on the PDF.`;
  }
  return `Enter your ${label.toLowerCase()} exactly as it should appear on the completed form in the ${wording.pdfSection} section.`;
}

module.exports = {
  FIELD_ACRONYMS,
  VAGUE_LABELS,
  GARBAGE_LABEL_PATTERNS,
  titleCaseWord,
  formatFieldNameAsLabel,
  isGarbageText,
  sanitizeFieldLabel,
  isVagueLabel,
  extractLabelFromDocument,
  resolveSpecificFieldLabel,
  buildQuestionTextForField,
  buildExplanationForQuestion,
  buildAddressQuestionText,
};
