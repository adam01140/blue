// server.js
const express       = require('express');
const dotenv        = require('dotenv');
dotenv.config();

// WARNING: Using LIVE keys for local development is not recommended and will likely fail.
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not set in the environment. Please add it to your .env file.');
}
const stripe = require('stripe')(stripeSecretKey);
const admin         = require('firebase-admin');
const bodyParser    = require('body-parser');
const fileUpload    = require('express-fileupload');
const path          = require('path');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const cors          = require('cors');
const fs            = require('fs');
const nodemailer    = require('nodemailer');

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

// Add a new route for creating a Cart Checkout Session
app.post('/create-cart-checkout-session', async (req, res) => {
    console.log('Cart checkout session requested');
    console.log('Request body:', req.body);
    
    const { cartItems, totalAmount } = req.body;
    const YOUR_DOMAIN = 'http://localhost:3000'; // Replace with your domain

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        console.log('Error: No cart items provided');
        return res.status(400).send({ error: 'Cart items are required.' });
    }

    try {
        // Create line items from cart items
        const lineItems = cartItems.map(item => ({
            price: item.priceId, // Use the Stripe Price ID directly
            quantity: 1,
        }));

        const session = await stripe.checkout.sessions.create({
            line_items: lineItems,
            mode: 'payment',
            success_url: `${YOUR_DOMAIN}/cart.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${YOUR_DOMAIN}/cart.html?payment=cancelled`,
            metadata: {
                cartItems: JSON.stringify(cartItems.map(item => item.formId)),
                totalAmount: totalAmount ? totalAmount.toString() : '',
            },
        });

        console.log('Stripe session created successfully:', session.id);
        res.send({ sessionId: session.id });
    } catch (e) {
        console.error("Stripe Cart Error:", e);
        res.status(500).send({ error: e.message });
    }
});

// Fetch Stripe price info by Price ID
app.get('/stripe-price/:priceId', async (req, res) => {
    try {
        const price = await stripe.prices.retrieve(req.params.priceId, { expand: ['product'] });
        res.json({
            priceId: price.id,
            unit_amount: price.unit_amount,
            currency: price.currency,
            product: price.product && price.product.name ? price.product.name : price.product.id,
            nickname: price.nickname,
        });
    } catch (e) {
        res.status(404).json({ error: 'Price not found' });
    }
});

// Endpoint to email a PDF to the user
app.post('/email-pdf', async (req, res) => {
    try {
        let { to, extraEmails, subject, text, filename } = req.body;
        if (!to && !extraEmails) {
            return res.status(400).json({ error: 'Missing recipient email(s)' });
        }
        if (!filename) {
            return res.status(400).json({ error: 'Missing required field: filename' });
        }
        // PDF should be sent as raw binary in req.files.pdf
        if (!req.files || !req.files.pdf) {
            return res.status(400).json({ error: 'Missing PDF file' });
        }
        const pdfBuffer = req.files.pdf.data;
        // Build recipients array
        let recipients = [];
        if (to) recipients.push(to);
        if (extraEmails) {
            if (typeof extraEmails === 'string') {
                // Accept comma-separated or single email
                if (extraEmails.includes(',')) {
                    recipients = recipients.concat(extraEmails.split(',').map(e => e.trim()).filter(Boolean));
                } else {
                    recipients.push(extraEmails.trim());
                }
            } else if (Array.isArray(extraEmails)) {
                recipients = recipients.concat(extraEmails.filter(Boolean));
            }
        }
        recipients = recipients.filter(Boolean);
        // Extract form name from filename
        let formName = filename.replace(/^Edited_/, '').replace(/\.pdf$/i, '').replace(/_/g, ' ');
        // Send to all recipients
        for (const email of recipients) {
            await sendPdfEmail(
                email,
                subject || `Your Completed ${formName} from FormWiz`,
                text || `Attached is your completed ${formName} PDF form from FormWiz.`,
                pdfBuffer,
                filename
            );
        }
        res.json({ success: true });
    } catch (e) {
        console.error('Error sending PDF email:', e);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

// ────────────────────────────────────────────────────────────
// Nodemailer setup (using Gmail SMTP for example)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // set in .env
        pass: process.env.EMAIL_PASS  // set in .env
    }
});

/**
 * Send an email with a PDF attachment
 * @param {string} to - recipient email
 * @param {string} subject - email subject
 * @param {string} text - email body
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {string} filename - PDF file name
 */
async function sendPdfEmail(to, subject, text, pdfBuffer, filename) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        text,
        attachments: [
            {
                filename,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ]
    };
    await transporter.sendMail(mailOptions);
}

// ────────────────────────────────────────────────────────────
// Start server
// ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
