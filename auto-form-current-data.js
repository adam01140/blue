const fs = require('fs');
const path = require('path');

const CURRENT_DATA_DIR = path.join(__dirname, 'public', 'Auto-Form-Creator', 'Current Data');

function ensureCurrentDataDir() {
  fs.mkdirSync(CURRENT_DATA_DIR, { recursive: true });
}

function writeTextFile(filename, content) {
  if (content == null || content === '') return;
  fs.writeFileSync(path.join(CURRENT_DATA_DIR, filename), String(content), 'utf8');
}

function writeJsonFile(filename, data) {
  if (data == null) return;
  fs.writeFileSync(path.join(CURRENT_DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf8');
}

function saveCurrentData(payload) {
  ensureCurrentDataDir();

  const savedAt = new Date().toISOString();
  const label = payload.label || 'update';

  if (payload.fieldConfig) {
    writeJsonFile('field_config.json', payload.fieldConfig);
  }
  if (payload.formConfig) {
    writeJsonFile('form_config.json', payload.formConfig);
  }
  if (payload.formHtml) {
    writeTextFile('generated-form.html', payload.formHtml);
  }
  if (payload.extractedDocumentContent) {
    writeTextFile('extracted-document-content.txt', payload.extractedDocumentContent);
  }
  if (Array.isArray(payload.textFields)) {
    writeTextFile(
      'text-fields.txt',
      payload.textFields.map((f) => f.marker || f.name || JSON.stringify(f)).join('\n')
    );
  }
  if (Array.isArray(payload.checkboxFields)) {
    writeTextFile(
      'checkbox-fields.txt',
      payload.checkboxFields.map((f) => f.marker || f.name || JSON.stringify(f)).join('\n')
    );
  }

  const manifest = {
    savedAt,
    label,
    files: fs.readdirSync(CURRENT_DATA_DIR).filter((f) => f !== 'manifest.json'),
  };
  writeJsonFile('manifest.json', manifest);

  return { savedAt, dir: CURRENT_DATA_DIR, files: manifest.files };
}

function createHandleSaveCurrentData() {
  return function handleSaveCurrentData(req, res) {
    try {
      const result = saveCurrentData(req.body || {});
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('[auto-form/save-current-data] Error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to save current data' });
    }
  };
}

module.exports = {
  CURRENT_DATA_DIR,
  saveCurrentData,
  createHandleSaveCurrentData,
};
