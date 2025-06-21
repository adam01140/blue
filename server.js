// server.js
const express       = require('express');
const dotenv        = require('dotenv');
dotenv.config();

// WARNING: Using LIVE keys for local development is not recommended and will likely fail.
const stripe        = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin         = require('firebase-admin');
const bodyParser    = require('body-parser');
const fileUpload    = require('express-fileupload');
const path          = require('path');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const cors          = require('cors');
const fs            = require('fs');

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());          // parses multipart/form‑data (fields ➜ req.body, files ➜ req.files)
app.use(cors());

// ────────────────────────────────────────────────────────────
// Firebase
// ────────────────────────────────────────────────────────────
const serviceAccount = require('./firebaseAdminKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
});
const db = admin.firestore();

// ────────────────────────────────────────────────────────────
// Static files
// ────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ────────────────────────────────────────────────────────────
// Routes
// ────────────────────────────────────────────────────────────
app.get('/', (_, res) => {
  res.send('Welcome to the PDF Editing Server');
});

/* ————— helper ————— */
function shouldCheck(v) {
  // treat ANY present, non‑false value as "checked"
  if (v === undefined)               return false;
  if (Array.isArray(v))              return v.length > 0;
  const s = String(v).trim().toLowerCase();
  return s !== '' && s !== 'false' && s !== 'off' && s !== 'no';
}

/**
 * POST /edit_pdf
 * Accepts ▸ a file upload named "pdf", **or** ▸ a query string ?pdf=fileName
 * and returns the edited PDF with filled‑in fields.
 */
app.post('/edit_pdf', async (req, res) => {
  let pdfBytes;
  let outputName = 'Edited_document.pdf';

  // 1️⃣  First choice: an uploaded file
  if (req.files && req.files.pdf) {
    pdfBytes   = req.files.pdf.data;
    outputName = `Edited_${req.files.pdf.name}`;
    console.log(`Using uploaded PDF: ${req.files.pdf.name}`);
  } else {
    // 2️⃣  Fallback: ?pdf=fileName
    const pdfName = req.query.pdf;
    if (!pdfName) {
      return res.status(400).send('No PDF provided (upload a file or pass ?pdf=filename).');
    }
    const sanitized = path.basename(pdfName) + '.pdf';
    const pdfPath   = path.join(__dirname, 'public', sanitized);
    if (!fs.existsSync(pdfPath)) {
      return res.status(400).send('Requested PDF does not exist on the server.');
    }
    pdfBytes   = await fs.promises.readFile(pdfPath);
    outputName = `Edited_${sanitized}`;
    console.log(`Using server PDF: ${sanitized}`);
  }

  // ── Fill the form ─────────────────────────────────────────
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form   = pdfDoc.getForm();
  const helv   = await pdfDoc.embedFont(StandardFonts.Helvetica);

  form.getFields().forEach(field => {
    const key   = field.getName();
    const value = req.body[key];

    if (value === undefined) return;            // nothing sent for this field

    switch (field.constructor.name) {
      case 'PDFCheckBox':
        shouldCheck(value) ? field.check() : field.uncheck();
        break;

      case 'PDFRadioGroup':
      case 'PDFDropdown':
        field.select(String(value));
        break;

      case 'PDFTextField':
      default:
        field.setText(String(value));
        field.updateAppearances(helv);
    }
  });

  const edited = await pdfDoc.save();
  res
    .set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${outputName}"`,
    })
    .send(Buffer.from(edited));
});

// Add a new route for creating a Stripe Checkout Session
app.post('/create-checkout-session', async (req, res) => {
    const { priceId, formId } = req.body;
    const YOUR_DOMAIN = 'http://localhost:3000'; // Replace with your domain

    if (!priceId || !formId) {
        return res.status(400).send({ error: 'Price ID and Form ID are required.' });
    }

    try {
        const session = await stripe.checkout.sessions.create({
            line_items: [{
                price: priceId,
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${YOUR_DOMAIN}/example.html?payment=success&formId=${formId}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${YOUR_DOMAIN}/example.html?payment=cancelled`,
        });

        res.send({ sessionId: session.id });
    } catch (e) {
        console.error("Stripe Error:", e);
        res.status(500).send({ error: e.message });
    }
});

// ────────────────────────────────────────────────────────────
// Start server
// ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
