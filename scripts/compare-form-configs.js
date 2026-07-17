#!/usr/bin/env node
/**
 * Compare two form_config JSON files (ideal vs pipeline) for question quality.
 * Usage: node scripts/compare-form-configs.js <ideal.json> <candidate.json>
 */
const fs = require('fs');

function collect(formConfig) {
  const out = [];
  for (const section of formConfig.sections || []) {
    for (const q of section.questions || []) {
      const nameId = q.nameId
        || (q.options || []).map((o) => o.nameId).filter(Boolean).join(',')
        || (q.textboxes || []).map((t) => t.nameId).filter(Boolean).join(',')
        || null;
      out.push({
        section: section.sectionName,
        questionId: q.questionId,
        type: q.type,
        nameId,
        text: String(q.text || '').trim(),
        explanation: String(q.explanation || '').trim(),
        gated: Boolean(q.logic?.enabled),
        gateRef: q.logic?.enabled ? `Q${q.logic.prevQuestion}=${q.logic.prevAnswer}` : null,
        isGate: q.type === 'dropdown' && !q.nameId,
      });
    }
  }
  return out;
}

function score(questions) {
  const issues = [];
  const vagueGate = /^does this apply/i;
  const awkward = [
    /^what is your name of /i,
    /^what is your your /i,
    /^what is your box for /i,
    /^what is your employer's employer /i,
    /agency's agency /i,
  ];

  for (const q of questions) {
    if (vagueGate.test(q.text)) issues.push(`vague gate Q${q.questionId}: ${q.text}`);
    for (const re of awkward) {
      if (re.test(q.text)) {
        issues.push(`awkward Q${q.questionId}: ${q.text}`);
        break;
      }
    }
    if (!q.explanation || q.explanation.split(/\s+/).length < 8) {
      if (!q.isGate) issues.push(`weak explanation Q${q.questionId}`);
    }
  }

  const texts = questions.map((q) => q.text.toLowerCase());
  const dupes = texts.filter((t, i) => texts.indexOf(t) !== i);
  if (dupes.length) issues.push(`duplicate texts: ${[...new Set(dupes)].slice(0, 3).join(' | ')}`);

  return issues;
}

function byNameId(questions) {
  const map = new Map();
  for (const q of questions) {
    if (!q.nameId) continue;
    for (const id of String(q.nameId).split(',').filter(Boolean)) {
      map.set(id, q);
    }
  }
  return map;
}

const idealPath = process.argv[2];
const candPath = process.argv[3];
if (!idealPath || !candPath) {
  console.error('Usage: node scripts/compare-form-configs.js <ideal.json> <candidate.json>');
  process.exit(1);
}

const ideal = collect(JSON.parse(fs.readFileSync(idealPath, 'utf8')));
const cand = collect(JSON.parse(fs.readFileSync(candPath, 'utf8')));
const idealMap = byNameId(ideal);
const candMap = byNameId(cand);

console.log('=== COUNTS ===');
console.log(`Ideal: ${ideal.length} questions, Candidate: ${cand.length}`);
console.log(`Ideal gates: ${ideal.filter((q) => q.isGate).length}, Candidate gates: ${cand.filter((q) => q.isGate).length}`);
console.log(`Ideal gated: ${ideal.filter((q) => q.gated).length}, Candidate gated: ${cand.filter((q) => q.gated).length}`);

console.log('\n=== IDEAL ISSUES ===');
const idealIssues = score(ideal);
idealIssues.forEach((i) => console.log('  ', i));
if (!idealIssues.length) console.log('  (none)');

console.log('\n=== CANDIDATE ISSUES ===');
const candIssues = score(cand);
candIssues.forEach((i) => console.log('  ', i));
if (!candIssues.length) console.log('  (none)');

console.log('\n=== TEXT DIFFS (same nameId, different text) ===');
let diffs = 0;
for (const [id, iq] of idealMap.entries()) {
  const cq = candMap.get(id);
  if (!cq) {
    console.log(`  MISSING in candidate: ${id}`);
    diffs += 1;
    continue;
  }
  if (iq.text.toLowerCase() !== cq.text.toLowerCase()) {
    console.log(`  ${id}:`);
    console.log(`    ideal: ${iq.text}`);
    console.log(`    cand:  ${cq.text}`);
    diffs += 1;
  }
}
for (const [id] of candMap.entries()) {
  if (!idealMap.has(id)) {
    console.log(`  EXTRA in candidate: ${id} → ${candMap.get(id).text}`);
    diffs += 1;
  }
}

console.log(`\nDiff count: ${diffs}`);
console.log(`Candidate issue count: ${candIssues.length} (ideal had ${idealIssues.length})`);
process.exit(candIssues.length > idealIssues.length + 2 ? 1 : 0);
