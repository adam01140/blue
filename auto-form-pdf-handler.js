const crypto = require('crypto');
const { fillPdfForm } = require('./pdf-form-filler');

const PDF_TTL_MS = 24 * 60 * 60 * 1000;
const pdfStore = new Map();

function cleanupExpiredPdfs() {
  const now = Date.now();
  for (const [token, entry] of pdfStore) {
    if (now - entry.createdAt > PDF_TTL_MS) {
      pdfStore.delete(token);
    }
  }
}

async function handleStoreAutoFormPdf(req, res) {
  try {
    if (!req.files?.pdf) {
      return res.status(400).json({ success: false, error: 'PDF file is required' });
    }

    cleanupExpiredPdfs();
    const pdfToken = crypto.randomUUID();
    pdfStore.set(pdfToken, {
      bytes: Uint8Array.from(req.files.pdf.data),
      name: req.files.pdf.name || 'sanitized.pdf',
      createdAt: Date.now(),
    });

    res.json({
      success: true,
      pdfToken,
      fileName: req.files.pdf.name || 'sanitized.pdf',
    });
  } catch (error) {
    console.error('[auto-form/store-pdf] Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to store PDF' });
  }
}

async function handleFillAutoFormPdf(req, res) {
  try {
    const { pdfToken } = req.params;
    const entry = pdfStore.get(pdfToken);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'PDF not found or expired. Re-run Step 5 in the demo.' });
    }

    const filled = await fillPdfForm(entry.bytes, req.body || {});
    res
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="filled_${entry.name}"`,
      })
      .send(Buffer.from(filled));
  } catch (error) {
    console.error('[auto-form/fill-pdf] Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fill PDF' });
  }
}

function getPdfEntry(pdfToken) {
  if (!pdfToken) return null;
  cleanupExpiredPdfs();
  return pdfStore.get(pdfToken) || null;
}

module.exports = {
  handleStoreAutoFormPdf,
  handleFillAutoFormPdf,
  getPdfEntry,
};
