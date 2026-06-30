const fs = require('fs');
const path = require('path');
const { fetchOpenAiWithRetry } = require('./openai-fetch');
const { enrichFormConfigAutopopulate, isLikelyAutopopulatableField } = require('./form-autopopulate');

const FORM_CONFIG_PROMPT_PATH = path.join(
  __dirname,
  'public',
  'Auto-Form-Creator',
  'form_config.txt'
);

function loadFormConfigPrompt() {
  return fs.readFileSync(FORM_CONFIG_PROMPT_PATH, 'utf8');
}

function extractJsonFromModelResponse(text) {
  const trimmed = String(text || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(candidate);
}

function collectNameIdsFromQuestion(question, ids) {
  if (question.nameId) ids.add(question.nameId);
  if (Array.isArray(question.options)) {
    for (const opt of question.options) {
      if (opt && opt.nameId) ids.add(opt.nameId);
    }
  }
  if (Array.isArray(question.textboxes)) {
    for (const tb of question.textboxes) {
      if (tb && tb.nameId) ids.add(tb.nameId);
    }
  }
}

function getMissingNameIds(formConfig, fieldConfig) {
  const requiredNewNames = new Set((fieldConfig.fields || []).map((f) => f.newName));
  const covered = new Set();

  for (const section of formConfig.sections || []) {
    for (const question of section.questions || []) {
      collectNameIdsFromQuestion(question, covered);
    }
  }

  return [...requiredNewNames].filter((name) => !covered.has(name));
}

function inferQuestionType(field) {
  if (field.type === 'checkbox') return 'checkbox';
  const hint = `${field.newName} ${field.label || ''}`;
  if (/date|dob|birth/i.test(hint)) return 'date';
  if (/phone|telephone/i.test(hint)) return 'phone';
  if (/amount|billing|money|fee/i.test(hint)) return 'money';
  return 'text';
}

function injectMissingFieldQuestions(formConfig, fieldConfig, missingNames) {
  if (!missingNames.length) return formConfig;

  const fieldMap = new Map((fieldConfig.fields || []).map((f) => [f.newName, f]));
  let maxQuestionId = 0;
  let maxSectionId = 0;

  for (const section of formConfig.sections || []) {
    maxSectionId = Math.max(maxSectionId, section.sectionId || 0);
    for (const question of section.questions || []) {
      maxQuestionId = Math.max(maxQuestionId, question.questionId || 0);
    }
  }

  let targetSection = (formConfig.sections || [])[formConfig.sections.length - 1];
  if (!targetSection) {
    targetSection = {
      sectionId: maxSectionId + 1 || 1,
      sectionName: 'Additional Fields',
      questions: [],
    };
    formConfig.sections = formConfig.sections || [];
    formConfig.sections.push(targetSection);
  }
  if (!Array.isArray(targetSection.questions)) {
    targetSection.questions = [];
  }

  for (const nameId of missingNames) {
    const field = fieldMap.get(nameId);
    if (!field) continue;

    maxQuestionId += 1;
    const questionType = inferQuestionType(field);
    const label = field.label || nameId.replace(/_/g, ' ');

    const question = {
      questionId: maxQuestionId,
      text: questionType === 'checkbox' ? label : `What is your ${label.toLowerCase()}?`,
      type: questionType,
      logic: { enabled: false, prevQuestion: '', prevAnswer: '' },
      jump: { enabled: false, option: '', to: '' },
      options: [],
      labels: [],
      placeholder: label,
      autopopulate: {
        enabled: isLikelyAutopopulatableField(field),
        profileKey: field.newName,
        profileDescription: label,
      },
    };

    if (field.type === 'checkbox') {
      question.type = 'checkbox';
      question.options = [{ label, nameId, value: label }];
    } else {
      question.nameId = nameId;
    }

    targetSection.questions.push(question);
  }

  formConfig.sectionCounter = Math.max(formConfig.sectionCounter || 0, maxSectionId + 1);
  formConfig.questionCounter = maxQuestionId + 1;
  return formConfig;
}

function validateFormConfig(formConfig, fieldConfig) {
  if (!formConfig || typeof formConfig !== 'object') {
    throw new Error('Model response is not a JSON object');
  }
  if (!Array.isArray(formConfig.sections)) {
    throw new Error('form_config.json must contain a "sections" array');
  }

  const missing = getMissingNameIds(formConfig, fieldConfig);
  if (missing.length > 0) {
    throw new Error(`form_config missing nameId for: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''}`);
  }

  return formConfig;
}

async function callOpenAiForFormConfig(openAiApiKey, payload, extraInstruction) {
  const systemPrompt = loadFormConfigPrompt();
  const userContent = extraInstruction
    ? `${JSON.stringify(payload, null, 2)}\n\nIMPORTANT: ${extraInstruction}`
    : JSON.stringify(payload, null, 2);

  const response = await fetchOpenAiWithRetry('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenAI API request failed (${response.status})`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned an empty response');
  }

  return extractJsonFromModelResponse(content);
}

async function generateFormConfig(payload, openAiApiKey) {
  const { fieldConfig, displayMode = 'all_at_once', userProfile = {} } = payload;
  if (!fieldConfig?.fields?.length) {
    throw new Error('fieldConfig.fields is required');
  }

  let config = await callOpenAiForFormConfig(openAiApiKey, payload);
  let missing = getMissingNameIds(config, fieldConfig);

  if (missing.length > 0) {
    console.warn(`[generate-form-config] Retrying — ${missing.length} field(s) missing from model output`);
    config = await callOpenAiForFormConfig(
      openAiApiKey,
      payload,
      `You MUST include every field_config.fields newName exactly once. Missing from prior output: ${missing.join(', ')}`
    );
    missing = getMissingNameIds(config, fieldConfig);
  }

  if (missing.length > 0) {
    console.warn(`[generate-form-config] Injecting ${missing.length} missing field question(s)`);
    config = injectMissingFieldQuestions(config, fieldConfig, missing);
  }

  const validated = validateFormConfig(config, fieldConfig);
  return enrichFormConfigAutopopulate(validated, userProfile, displayMode, fieldConfig);
}

function createHandleGenerateFormConfig(openAiApiKey) {
  return async function handleGenerateFormConfig(req, res) {
    try {
      const {
        fieldConfig,
        extractedDocumentContent = '',
        displayMode = 'all_at_once',
        userProfile = {},
      } = req.body || {};

      const formConfig = await generateFormConfig(
        { fieldConfig, extractedDocumentContent, displayMode, userProfile },
        openAiApiKey
      );

      res.json({
        success: true,
        formConfig,
        sectionCount: formConfig.sections?.length || 0,
        autopopulateCount: formConfig.autopopulateFields?.length || 0,
      });
    } catch (error) {
      console.error('[generate-form-config] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate form config',
      });
    }
  };
}

module.exports = {
  generateFormConfig,
  createHandleGenerateFormConfig,
  validateFormConfig,
  injectMissingFieldQuestions,
  getMissingNameIds,
};
