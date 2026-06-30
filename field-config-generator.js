const fs = require('fs');
const path = require('path');
const { fetchOpenAiWithRetry } = require('./openai-fetch');

const FIELD_CONFIG_PROMPT_PATH = path.join(
  __dirname,
  'public',
  'Auto-Form-Creator',
  'field_config.txt'
);

function loadFieldConfigPrompt() {
  return fs.readFileSync(FIELD_CONFIG_PROMPT_PATH, 'utf8');
}

function extractJsonFromModelResponse(text) {
  const trimmed = String(text || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(candidate);
}

function validateFieldConfig(config, inputFieldIds) {
  if (!config || typeof config !== 'object') {
    throw new Error('Model response is not a JSON object');
  }
  if (!Array.isArray(config.fields)) {
    throw new Error('field_config.json must contain a "fields" array');
  }

  const seenNewNames = new Set();
  const mappedIds = new Set();

  for (const field of config.fields) {
    if (!field || typeof field !== 'object') {
      throw new Error('Each field entry must be an object');
    }
    if (!field.id || !field.newName || !field.type || !field.label) {
      throw new Error('Each field must include id, newName, type, and label');
    }
    if (!['text', 'checkbox'].includes(field.type)) {
      throw new Error(`Invalid field type for ${field.id}: ${field.type}`);
    }
    if (seenNewNames.has(field.newName)) {
      throw new Error(`Duplicate newName: ${field.newName}`);
    }
    seenNewNames.add(field.newName);
    mappedIds.add(field.id);
  }

  const missing = inputFieldIds.filter((id) => !mappedIds.has(id));
  if (missing.length > 0) {
    throw new Error(`Missing ${missing.length} field(s) in model output, e.g. ${missing[0]}`);
  }

  return config;
}

async function callOpenAiForFieldConfig(openAiApiKey, extractionPayload) {
  const systemPrompt = loadFieldConfigPrompt();
  const userMessage = JSON.stringify(extractionPayload, null, 2);

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
        { role: 'user', content: userMessage },
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

async function generateFieldConfig(extractionPayload, openAiApiKey) {
  const textFieldIds = (extractionPayload.textFields || []).map((f) => f.name);
  const checkboxFieldIds = (extractionPayload.checkboxFields || []).map((f) => f.name);
  const inputFieldIds = [...textFieldIds, ...checkboxFieldIds];

  if (!inputFieldIds.length) {
    throw new Error('No text or checkbox fields provided for field config generation');
  }

  const config = await callOpenAiForFieldConfig(openAiApiKey, extractionPayload);
  return validateFieldConfig(config, inputFieldIds);
}

function createHandleGenerateFieldConfig(openAiApiKey) {
  return async function handleGenerateFieldConfig(req, res) {
    try {
      const {
        extractedDocumentContent = '',
        textFields = [],
        checkboxFields = [],
      } = req.body || {};

      const config = await generateFieldConfig(
        { extractedDocumentContent, textFields, checkboxFields },
        openAiApiKey
      );

      res.json({
        success: true,
        fieldConfig: config,
        fieldCount: config.fields.length,
      });
    } catch (error) {
      console.error('[generate-field-config] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate field config',
      });
    }
  };
}

module.exports = {
  generateFieldConfig,
  createHandleGenerateFieldConfig,
  validateFieldConfig,
};
