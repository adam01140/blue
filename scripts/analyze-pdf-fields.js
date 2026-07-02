const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

async function main() {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerPath = path.join(
    __dirname,
    '..',
    'node_modules',
    'pdfjs-dist',
    'legacy',
    'build',
    'pdf.worker.min.mjs'
  );
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

  const pdfPath = process.argv[2] || path.join(__dirname, '../public/Auto-Form-Creator/unlocked-test.pdf');
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  const all = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const anns = await page.getAnnotations();
    for (const a of anns) {
      if (!['Tx', 'Btn'].includes(a.fieldType)) continue;
      all.push({
        page: p,
        name: a.fieldName,
        fieldType: a.fieldType,
        checkBox: a.checkBox,
        radioButton: a.radioButton,
        fieldValue: a.fieldValue,
        rect: a.rect,
      });
    }
  }

  const counts = {};
  all.forEach((a) => {
    counts[a.name] = (counts[a.name] || 0) + 1;
  });

  const dups = Object.entries(counts)
    .filter(([, v]) => v > 1)
    .sort((a, b) => b[1] - a[1]);

  console.log('File:', pdfPath);
  console.log('Widgets:', all.length);
  console.log('Unique names:', Object.keys(counts).length);
  console.log('Duplicate name groups:', dups.length);
  dups.slice(0, 20).forEach(([name, count]) => {
    console.log(`\n  ${count}x ${name}`);
    all
      .filter((a) => a.name === name)
      .forEach((a) => console.log(`    page ${a.page} type=${a.fieldType} radio=${a.radioButton} checkbox=${a.checkBox}`));
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
