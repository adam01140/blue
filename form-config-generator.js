const fs = require('fs');
const path = require('path');
const { fetchOpenAiWithRetry } = require('./openai-fetch');
const { enrichFormConfigAutopopulate, isLikelyAutopopulatableField } = require('./form-autopopulate');
const { ensureFormCatalogMetadata } = require('./form-catalog-metadata');
const { saveCurrentData } = require('./auto-form-current-data');

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

function consolidateSections(formConfig, targetCount = 3, hardMax = 4) {
  if (!formConfig || !Array.isArray(formConfig.sections)) return formConfig;

  let sections = formConfig.sections.map((section) => ({
    sectionId: section.sectionId,
    sectionName: section.sectionName || 'Section',
    questions: [...(section.questions || [])],
  }));

  if (sections.length <= targetCount) return formConfig;

  while (sections.length > hardMax) {
    let bestIdx = 0;
    let bestSize = Infinity;
    for (let i = 0; i < sections.length - 1; i += 1) {
      const size = sections[i].questions.length + sections[i + 1].questions.length;
      if (size < bestSize) {
        bestSize = size;
        bestIdx = i;
      }
    }
    const left = sections[bestIdx];
    const right = sections[bestIdx + 1];
    const mergedName = left.sectionName === right.sectionName
      ? left.sectionName
      : `${left.sectionName} & ${right.sectionName}`;
    sections.splice(bestIdx, 2, {
      sectionId: left.sectionId,
      sectionName: mergedName,
      questions: [...left.questions, ...right.questions],
    });
  }

  while (sections.length > targetCount) {
    let bestIdx = 0;
    let bestSize = Infinity;
    for (let i = 0; i < sections.length - 1; i += 1) {
      const size = sections[i].questions.length + sections[i + 1].questions.length;
      if (size < bestSize) {
        bestSize = size;
        bestIdx = i;
      }
    }
    const left = sections[bestIdx];
    const right = sections[bestIdx + 1];
    const mergedName = left.sectionName === right.sectionName
      ? left.sectionName
      : `${left.sectionName} & ${right.sectionName}`;
    sections.splice(bestIdx, 2, {
      sectionId: left.sectionId,
      sectionName: mergedName,
      questions: [...left.questions, ...right.questions],
    });
  }

  sections.forEach((section, idx) => {
    section.sectionId = idx + 1;
  });
  formConfig.sections = sections;
  formConfig.sectionCounter = sections.length + 1;
  return formConfig;
}

function checkboxGroupPrefix(nameId) {
  if (!nameId) return '';
  const id = String(nameId).toLowerCase();
  const knownSuffixes = [
    '_male', '_female', '_nonbinary', '_nonbinary_unspecified', '_doj', '_fbi',
    '_yes', '_no',
  ];
  for (const suffix of knownSuffixes) {
    if (id.endsWith(suffix)) return id.slice(0, -suffix.length);
  }
  const parts = id.split('_');
  if (parts.length > 1) return parts.slice(0, -1).join('_');
  return id;
}

function inferMergedCheckboxQuestionText(group) {
  const texts = group.map((q) => String(q.text || '').trim()).filter(Boolean);
  const lower = texts.join(' ').toLowerCase();
  if (/sex|gender/.test(lower)) return 'What is your sex?';
  if (/level of service|service level/.test(lower)) return 'What is the level of service?';
  if (texts.length === 1) return texts[0].replace(/\?$/, '?');
  const first = texts[0].replace(/\?$/, '').trim();
  if (first.length < 80) return `${first}?`;
  return 'Please select all that apply';
}

function mergeFragmentedCheckboxGroups(formConfig) {
  if (!formConfig?.sections) return formConfig;

  for (const section of formConfig.sections) {
    const questions = section.questions || [];
    let i = 0;
    while (i < questions.length) {
      const q = questions[i];
      const opts = q.options || [];
      if (q.type === 'checkbox' && opts.length === 1) {
        const prefix = checkboxGroupPrefix(opts[0].nameId || q.nameId);
        const group = [q];
        let j = i + 1;
        while (j < questions.length) {
          const next = questions[j];
          const nextOpts = next.options || [];
          if (next.type !== 'checkbox' || nextOpts.length !== 1) break;
          const nextPrefix = checkboxGroupPrefix(nextOpts[0].nameId || next.nameId);
          if (prefix && nextPrefix && prefix === nextPrefix) {
            group.push(next);
            j += 1;
          } else {
            break;
          }
        }
        if (group.length > 1) {
          const merged = {
            ...group[0],
            questionId: group[0].questionId,
            text: inferMergedCheckboxQuestionText(group),
            type: 'checkbox',
            nameId: undefined,
            options: group.flatMap((item) => item.options || []),
            needsExplanation: group.some((item) => item.needsExplanation),
            explanation: group.find((item) => item.explanation)?.explanation || '',
          };
          questions.splice(i, group.length, merged);
          continue;
        }
      }
      i += 1;
    }
    section.questions = questions;
  }
  return formConfig;
}

function normalizeQuestionExplanations(formConfig) {
  if (!formConfig?.sections) return formConfig;

  for (const section of formConfig.sections) {
    for (const question of section.questions || []) {
      if (question.needsExplanation == null) {
        question.needsExplanation = Boolean(question.explanation);
      }
      if (!question.needsExplanation) {
        question.explanation = '';
        continue;
      }
      question.explanation = String(question.explanation || '').trim();
      if (!question.explanation) {
        question.needsExplanation = false;
      }
    }
  }
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
  const consolidated = consolidateSections(validated, 3, 4);
  const merged = mergeFragmentedCheckboxGroups(consolidated);
  const normalized = normalizeQuestionExplanations(merged);
  const enriched = enrichFormConfigAutopopulate(normalized, userProfile, displayMode, fieldConfig);
  return ensureFormCatalogMetadata(enriched, fieldConfig);
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

      try {
        saveCurrentData({
          label: 'step-6-form-config',
          fieldConfig,
          formConfig,
          extractedDocumentContent,
        });
      } catch (dumpErr) {
        console.warn('[generate-form-config] Current data dump failed:', dumpErr.message);
      }
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
