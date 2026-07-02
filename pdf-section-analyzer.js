/**
 * Vision-based PDF section analysis for improved field grouping.
 */

const { fetchOpenAiWithRetry } = require('./openai-fetch');
const { normalizeSectionHint } = require('./structured-field-context');
const {
  loadPdfPageImages,
  buildPdfVisionUserContent,
  resolvePdfPageImages,
} = require('./pdf-vision-context');

const SECTION_ANALYSIS_PROMPT = `You analyze government PDF form page images.

Identify the major form sections visible on these pages (e.g. Agency, Applicant, Employer, Service, Operator).

For each fillable field you can read on the form, map its visible label text to one section name.
Use ONLY these section names when possible: Agency, Applicant, Employer, Service, Operator, Legal, General.

"Operator" is only for the live scan completion block at the bottom (operator name, transmitting agency, LSID) — NOT the whole form.

Return ONLY valid JSON:
{
  "sections": ["Agency", "Applicant", "Employer"],
  "fieldSectionHints": [
    { "visibleLabel": "ORI Code", "section": "Agency" },
    { "visibleLabel": "First Name", "section": "Applicant" }
  ]
}`;

function matchFieldToVisionHint(field, fieldSectionHints = []) {
  const label = String(field.label || '').toLowerCase();
  const newName = String(field.newName || '').toLowerCase();
  const ctxLabel = String(field.context?.nearestLabel || '').toLowerCase();

  for (const hint of fieldSectionHints) {
    const visible = String(hint.visibleLabel || '').toLowerCase().trim();
    if (!visible) continue;
    if (hint.section === 'Transaction') hint.section = 'Operator';
    if (label.includes(visible) || visible.includes(label)) return normalizeSectionHint(hint.section);
    if (ctxLabel.includes(visible) || visible.includes(ctxLabel)) return normalizeSectionHint(hint.section);
    const visibleWords = visible.split(/\s+/).filter((w) => w.length > 3);
    if (visibleWords.some((w) => newName.includes(w) || label.includes(w))) {
      return normalizeSectionHint(hint.section);
    }
  }
  return null;
}

function buildVisionSectionHintMap(fieldConfig, visionResult) {
  const hints = {};
  const fieldSectionHints = visionResult?.fieldSectionHints || [];

  for (const field of fieldConfig?.fields || []) {
    const section = matchFieldToVisionHint(field, fieldSectionHints);
    if (section && section !== 'Transaction') {
      hints[field.id] = section;
      hints[field.newName] = section;
    }
  }
  return hints;
}

async function analyzePdfSections(pdfBytes, openAiApiKey, options = {}) {
  if (!openAiApiKey || (!pdfBytes?.length && !options.pageImages?.length)) {
    return { sections: [], fieldSectionHints: [], visionSectionHints: {} };
  }

  let pages = options.pageImages?.length ? options.pageImages : [];

  if (!pages.length) {
    pages = await resolvePdfPageImages(
      { pdfToken: options.pdfToken, pdfBase64: options.pdfBase64 },
      { required: false, logPrefix: '[pdf-section-analyzer]', maxPages: options.maxPages ?? null }
    );
  }

  if (!pages.length && pdfBytes?.length) {
    pages = await loadPdfPageImages(pdfBytes, {
      maxPages: options.maxPages ?? null,
      scale: options.scale ?? 1.25,
    });
  }

  if (!pages.length) {
    return { sections: [], fieldSectionHints: [], visionSectionHints: {} };
  }

  const userContent = buildPdfVisionUserContent(
    'Analyze these form pages and return section hints as JSON.',
    pages,
    { detail: options.detail ?? 'low' }
  );

  const response = await fetchOpenAiWithRetry('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiApiKey}`,
    },
    body: JSON.stringify({
      model: options.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SECTION_ANALYSIS_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.warn('[pdf-section-analyzer] Vision failed:', errorData.error?.message || response.status);
    return { sections: [], fieldSectionHints: [], visionSectionHints: {} };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return { sections: [], fieldSectionHints: [], visionSectionHints: {} };
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (_) {
    return { sections: [], fieldSectionHints: [], visionSectionHints: {} };
  }

  return {
    sections: (parsed.sections || []).filter((s) => s !== 'Transaction'),
    fieldSectionHints: parsed.fieldSectionHints || [],
    visionSectionHints: {},
    raw: parsed,
  };
}

async function analyzePdfSectionsForFieldConfig(pdfBytes, fieldConfig, openAiApiKey, options = {}) {
  const result = await analyzePdfSections(pdfBytes, openAiApiKey, options);
  result.visionSectionHints = buildVisionSectionHintMap(fieldConfig, result);
  return result;
}

module.exports = {
  analyzePdfSections,
  analyzePdfSectionsForFieldConfig,
  buildVisionSectionHintMap,
};
