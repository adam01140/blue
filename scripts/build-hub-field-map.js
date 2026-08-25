/**
 * Build field_map.json for Demo Form Hub PDF highlight overlays.
 * Maps HTML form nameIds → PDF widget page + rect (PDF user space).
 *
 * Usage:
 *   node scripts/build-hub-field-map.js <pdfPath> <fieldConfigPath> [outPath]
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');

async function loadPdfJs() {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerPath = path.join(ROOT, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
  return pdfjsLib;
}

function isWidget(annotation) {
  const subtype = String(annotation.subtype || '').toLowerCase();
  if (subtype === 'widget') return true;
  return Boolean(annotation.fieldName || annotation.fieldType);
}

async function extractWidgetRects(pdfPath) {
  const pdfjsLib = await loadPdfJs();
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({
    data,
    standardFontDataUrl: `${pathToFileURL(path.join(ROOT, 'node_modules', 'pdfjs-dist', 'standard_fonts')).href}/`,
  }).promise;

  const byPdfId = {};
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const annotations = await page.getAnnotations();
    for (const a of annotations) {
      if (!isWidget(a) || !a.fieldName || !Array.isArray(a.rect) || a.rect.length < 4) continue;
      const rect = a.rect.map((n) => Math.round(Number(n) * 100) / 100);
      byPdfId[a.fieldName] = {
        pdfId: a.fieldName,
        page: pageNum,
        rect,
        type: String(a.fieldType || '').toLowerCase().includes('btn') ? 'checkbox' : 'text',
      };
    }
  }
  return { byPdfId, pageCount: pdf.numPages };
}

function buildFieldMap(byPdfId, fieldConfig) {
  const byNameId = {};
  const fields = Array.isArray(fieldConfig?.fields) ? fieldConfig.fields : [];
  for (const field of fields) {
    const nameId = field.newName || field.nameId;
    const pdfId = field.id;
    if (!nameId) continue;
    // Support both original PDFs (widget name = field.id) and sanitized PDFs
    // (widget name = field.newName after the pipeline rename step).
    const widget = (pdfId && byPdfId[pdfId]) || byPdfId[nameId];
    if (!widget) continue;
    byNameId[nameId] = {
      ...widget,
      pdfId: widget.pdfId || nameId,
      originalPdfId: pdfId || null,
      label: field.label || null,
      nameId,
    };
  }
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    byNameId,
    byPdfId,
  };
}

async function buildHubFieldMap(pdfPath, fieldConfigPath, outPath) {
  const fieldConfig = JSON.parse(fs.readFileSync(fieldConfigPath, 'utf8'));
  const { byPdfId } = await extractWidgetRects(pdfPath);
  const map = buildFieldMap(byPdfId, fieldConfig);
  if (outPath) {
    fs.writeFileSync(outPath, JSON.stringify(map, null, 2), 'utf8');
  }
  return map;
}

async function main() {
  const pdfPath = process.argv[2];
  const fieldConfigPath = process.argv[3];
  const outPath = process.argv[4];
  if (!pdfPath || !fieldConfigPath) {
    console.error('Usage: node scripts/build-hub-field-map.js <pdfPath> <fieldConfigPath> [outPath]');
    process.exit(1);
  }
  const map = await buildHubFieldMap(
    path.resolve(pdfPath),
    path.resolve(fieldConfigPath),
    outPath ? path.resolve(outPath) : null
  );
  const count = Object.keys(map.byNameId).length;
  console.log(`Mapped ${count} nameIds → PDF widgets`);
  if (outPath) console.log(`Wrote ${outPath}`);
  else console.log(JSON.stringify(map, null, 2));
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { buildHubFieldMap, extractWidgetRects, buildFieldMap };
