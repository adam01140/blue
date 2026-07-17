#!/usr/bin/env node
/**
 * Run full pipeline audit against all reference PDFs.
 * Usage: node scripts/pipeline-audit-all.js [--skip-field-config]
 */
require('dotenv').config();

const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PDFS = [
  path.join(ROOT, 'public', 'Auto-Form-Creator', 'livescan.pdf'),
  path.join(ROOT, 'public', 'Auto-Form-Creator', 'W-9 Form.pdf'),
];

const extraArgs = process.argv.slice(2).filter((arg) => arg.startsWith('--'));
let failed = 0;

console.log('========== PIPELINE AUDIT (ALL REFERENCE PDFs) ==========\n');

for (const pdfPath of PDFS) {
  const name = path.basename(pdfPath);
  console.log(`--- ${name} ---`);
  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, 'pdf-generate-audit.js'), pdfPath, ...extraArgs],
    { stdio: 'inherit', cwd: ROOT, env: process.env }
  );
  if (result.status !== 0) failed += 1;
  console.log('');
}

if (failed === 0) {
  console.log('✓ ALL REFERENCE PDFs PASSED');
  process.exit(0);
}

console.log(`✗ ${failed} PDF(s) failed audit`);
process.exit(1);
