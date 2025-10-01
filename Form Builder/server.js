// server.js
const express       = require('express');
const dotenv        = require('dotenv');
const fetch         = require('node-fetch');
dotenv.config();

// WARNING: Using LIVE keys for local development is not recommended and will likely fail.
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not set in the environment. Please add it to your .env file.');
}

// AI Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in the environment. Please add it to your .env file.');
}

// Admin Configuration
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD is not set in the environment. Please add it to your .env file.');
}

// Firebase Configuration
const requiredFirebaseEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY_ID', 
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_CLIENT_ID'
];

for (const envVar of requiredFirebaseEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`${envVar} is not set in the environment. Please add it to your .env file.`);
  }
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
// Firebase configuration using environment variables
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
};

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

// Admin authentication endpoint
app.post('/api/admin-login', (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password is required' 
      });
    }

    if (password === ADMIN_PASSWORD) {
      res.json({ 
        success: true, 
        message: 'Authentication successful' 
      });
    } else {
      res.status(401).json({ 
        success: false, 
        error: 'Invalid password' 
      });
    }

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error during authentication' 
    });
  }
});

// Admin forms data endpoint
app.get('/api/admin-forms', async (req, res) => {
  try {
    console.log('Loading forms for admin console...');
    
    const formsRef = db.collection('forms');
    const snapshot = await formsRef.get();
    
    const formsData = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      formsData.push({
        id: doc.id,
        ...data
      });
    });
    
    console.log(`Found ${formsData.length} forms for admin console`);
    res.json({ 
      success: true, 
      forms: formsData 
    });

  } catch (error) {
    console.error('Error loading admin forms:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load forms data' 
    });
  }
});

// Admin save forms endpoint
app.post('/api/admin-save-forms', async (req, res) => {
  try {
    const { forms } = req.body;
    
    if (!forms || !Array.isArray(forms)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Forms data is required' 
      });
    }

    console.log(`Saving ${forms.length} forms to Firebase...`);
    
    const batch = db.batch();
    const formsRef = db.collection('forms');
    
    // Clear existing forms
    const snapshot = await formsRef.get();
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Add new forms
    forms.forEach(form => {
      const docRef = formsRef.doc(form.id || form.name);
      batch.set(docRef, form);
    });
    
    await batch.commit();
    
    console.log(`Successfully saved ${forms.length} forms to Firebase`);
    res.json({ 
      success: true, 
      message: `Successfully saved ${forms.length} forms` 
    });

  } catch (error) {
    console.error('Error saving admin forms:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save forms data' 
    });
  }
});

// Admin save individual form endpoint
app.post('/api/admin-save-form', async (req, res) => {
  try {
    const { formId, formData } = req.body;
    
    if (!formId || !formData) {
      return res.status(400).json({ 
        success: false, 
        error: 'Form ID and form data are required' 
      });
    }

    console.log(`Saving individual form ${formId} to Firebase...`);
    
    // Remove the id from formData since it's the document ID
    const { id, ...dataToSave } = formData;
    
    await db.collection('forms').doc(formId).set(dataToSave);
    
    console.log(`Successfully saved form ${formId} to Firebase`);
    res.json({ 
      success: true, 
      message: 'Form saved successfully' 
    });

  } catch (error) {
    console.error('Error saving individual admin form:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save form' 
    });
  }
});

// Admin delete form endpoint
app.delete('/api/admin-delete-form/:formId', async (req, res) => {
  try {
    const { formId } = req.params;
    
    if (!formId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Form ID is required' 
      });
    }

    console.log(`Deleting form ${formId} from Firebase...`);
    
    await db.collection('forms').doc(formId).delete();
    
    console.log(`Successfully deleted form ${formId} from Firebase`);
    res.json({ 
      success: true, 
      message: 'Form deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting admin form:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete form' 
    });
  }
});

// Debug endpoint to check forms in source database
app.get('/api/debug-forms', async (req, res) => {
  try {
    const sourceProjectId = 'invoice-4f2b4';
    
    // Initialize source Firebase app
    const sourceApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${sourceProjectId}.firebaseio.com`
    }, 'debugSourceApp');
    
    const sourceDb = sourceApp.firestore();

    // Get all forms from source
    const snapshot = await sourceDb.collection('forms').get();
    const forms = [];
    
    snapshot.forEach(doc => {
      const formData = doc.data();
      forms.push({
        id: doc.id,
        name: formData.name || 'Unnamed',
        description: formData.description || 'No description',
        counties: formData.counties || []
      });
    });

    // Clean up
    await sourceApp.delete();

    res.json({
      success: true,
      projectId: sourceProjectId,
      totalForms: forms.length,
      forms: forms
    });

  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ────────────────────────────────────────────────────────────
// Form Transfer Endpoint (Accepts Forms Data)
// ────────────────────────────────────────────────────────────
app.post('/api/transfer-forms-data', async (req, res) => {
  try {
    const { forms, targetProjectId } = req.body;
    
    if (!forms || !Array.isArray(forms) || forms.length === 0) {
      return res.status(400).json({ error: 'Forms data is required' });
    }

    if (!targetProjectId) {
      return res.status(400).json({ error: 'Target project ID is required' });
    }

    // Initialize target Firebase app (FormWiz)
    const targetApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${targetProjectId}.firebaseio.com`
    }, 'targetApp');
    
    const targetDb = targetApp.firestore();

    // Transfer forms to target database
    const batch = targetDb.batch();
    let transferredCount = 0;

    for (const form of forms) {
      const formRef = targetDb.collection('forms').doc(form.id);
      const { id, ...formData } = form; // Remove id from data since it's the document ID
      batch.set(formRef, formData);
      transferredCount++;
      console.log(`Transferring form: ${form.id} - ${form.name || 'Unnamed'}`);
    }

    await batch.commit();

    // Clean up
    await targetApp.delete();

    res.json({ 
      success: true, 
      message: `Successfully transferred ${transferredCount} forms`,
      transferredCount 
    });

  } catch (error) {
    console.error('Error transferring forms data:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ────────────────────────────────────────────────────────────
// Form Transfer Endpoint (Secure)
// ────────────────────────────────────────────────────────────
app.post('/api/transfer-forms', async (req, res) => {
  try {
    const { sourceProjectId, targetProjectId } = req.body;
    
    if (!sourceProjectId || !targetProjectId) {
      return res.status(400).json({ error: 'Source and target project IDs are required' });
    }

    // Initialize source Firebase app
    const sourceApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${sourceProjectId}.firebaseio.com`
    }, 'sourceApp');
    
    const sourceDb = sourceApp.firestore();

    // Initialize target Firebase app (FormWiz)
    const targetApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${targetProjectId}.firebaseio.com`
    }, 'targetApp');
    
    const targetDb = targetApp.firestore();

    // Get all forms from source
    console.log(`Attempting to read from source project: ${sourceProjectId}`);
    const snapshot = await sourceDb.collection('forms').get();
    const formsToTransfer = [];
    
    console.log(`Found ${snapshot.size} documents in source forms collection`);
    
    snapshot.forEach(doc => {
      const formData = doc.data();
      formData.id = doc.id;
      formsToTransfer.push(formData);
      console.log(`Form found: ${doc.id} - ${formData.name || 'Unnamed'}`);
    });

    if (formsToTransfer.length === 0) {
      console.log('No forms found to transfer');
      return res.json({ 
        success: true, 
        message: 'No forms found in source database',
        transferredCount: 0,
        debug: {
          sourceProjectId,
          targetProjectId,
          documentsFound: snapshot.size
        }
      });
    }

    // Transfer forms to target database
    const batch = targetDb.batch();
    let transferredCount = 0;

    for (const form of formsToTransfer) {
      const formRef = targetDb.collection('forms').doc(form.id);
      const { id, ...formData } = form;
      batch.set(formRef, formData);
      transferredCount++;
    }

    await batch.commit();

    // Clean up apps
    await sourceApp.delete();
    await targetApp.delete();

    res.json({ 
      success: true, 
      message: `Successfully transferred ${transferredCount} forms`,
      transferredCount 
    });

  } catch (error) {
    console.error('Error transferring forms:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ────────────────────────────────────────────────────────────
// AI Chat Endpoint (Secure)
// ────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Prepare messages for OpenAI API
    const messages = [
      {
        role: 'system',
        content: `You are an AI Legal Assistant designed to help users with general legal questions and guidance. 

IMPORTANT DISCLAIMERS:
- You provide general information only and cannot replace professional legal advice
- You cannot provide specific legal advice for individual cases
- Always recommend consulting with a qualified attorney for specific legal matters
- You cannot represent users in court or provide legal representation
- Information provided is for educational purposes only

Your role is to:
- Explain legal concepts in simple terms
- Provide general guidance on legal processes
- Help users understand their rights and options
- Suggest when professional legal help is needed
- Be helpful, accurate, and responsible
- ASSESS if the user's situation matches any available forms and recommend them

AVAILABLE FORMS:
- SC-100: Plaintiff's Claim form for suing a defendant
- SC-120: Defendant's Claim form for counter-suing a plaintiff  
- SC-500: Small claims form for cases related to COVID-19
- Fee Waiver: Application for waiver of court filing fees

FORM ASSESSMENT GUIDELINES:
- Listen carefully to the user's situation and needs
- If their situation matches one of the available forms, recommend it
- Provide a helpful explanation of the form and why it's appropriate
- Use the format: "If you need assistance with [situation], we recommend filling out a [Form Name] form. [Explanation of what the form does and why it's useful]."
- If multiple forms might apply, explain the differences
- If no forms match, provide general guidance and suggest consulting an attorney

Always end responses with a reminder to consult with a qualified attorney for specific legal matters.`
      },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: message }
    ];

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'OpenAI API request failed');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    res.json({ 
      response: aiResponse,
      success: true 
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error.message 
    });
  }
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
 * Map HTML form values to PDF radio group options
 * @param {PDFRadioGroup} field - The PDF radio group field
 * @param {string} value - The value from the HTML form
 * @returns {string|null} - The mapped option name or null if no match
 */
function mapRadioValue(field, value) {
  try {
    const options = field.getOptions();
    const valueStr = String(value).trim();
    
    // If the value is already a valid option, use it
    if (options.includes(valueStr)) {
      return valueStr;
    }
    
    // Handle common HTML form values
    if (valueStr === 'on' || valueStr === 'true' || valueStr === '1') {
      // For 'on' values, try to find a "Yes" option or the first available option
      const yesOption = options.find(opt => 
        opt.toLowerCase().includes('yes') || 
        opt.toLowerCase().includes('true') ||
        opt.toLowerCase().includes('1')
      );
      if (yesOption) return yesOption;
      
      // If no "Yes" option, use the first option
      if (options.length > 0) return options[0];
    }
    
    if (valueStr === 'off' || valueStr === 'false' || valueStr === '0') {
      // For 'off' values, try to find a "No" option
      const noOption = options.find(opt => 
        opt.toLowerCase().includes('no') || 
        opt.toLowerCase().includes('false') ||
        opt.toLowerCase().includes('0')
      );
      if (noOption) return noOption;
    }
    
    // Handle comma-separated values (like "on,on")
    if (valueStr.includes(',')) {
      const parts = valueStr.split(',').map(p => p.trim()).filter(Boolean);
      if (parts.length > 0) {
        // Use the first non-empty part and try to map it
        return mapRadioValue(field, parts[0]);
      }
    }
    
    // Try partial matching
    const partialMatch = options.find(opt => 
      opt.toLowerCase().includes(valueStr.toLowerCase()) ||
      valueStr.toLowerCase().includes(opt.toLowerCase())
    );
    if (partialMatch) return partialMatch;
    
    console.log(`Could not map radio value "${valueStr}" to any option in field ${field.getName()}. Available options: ${options.join(', ')}`);
    return null;
    
  } catch (error) {
    console.error(`Error mapping radio value for field ${field.getName()}:`, error.message);
    return null;
  }
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
    const pdfPath   = path.join(__dirname, 'public', 'Forms', sanitized);
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

  // Debug: Log all available PDF fields
  console.log('Available PDF fields:');
  form.getFields().forEach(field => {
    console.log(`- ${field.getName()} (${field.constructor.name})`);
  });

  // Debug: Log all form data received
  console.log('Form data received:');
  Object.keys(req.body).forEach(key => {
    console.log(`- ${key}: ${req.body[key]}`);
  });

  form.getFields().forEach(field => {
    const key   = field.getName();
    const value = req.body[key];

    if (value === undefined) {
      console.log(`No data for field: ${key}`);
      return;            // nothing sent for this field
    }

    console.log(`Processing field: ${key} = ${value} (${field.constructor.name})`);

    try {
      switch (field.constructor.name) {
        case 'PDFCheckBox':
          const shouldBeChecked = shouldCheck(value);
          console.log(`Checkbox ${key}: shouldCheck(${value}) = ${shouldBeChecked}`);
          shouldBeChecked ? field.check() : field.uncheck();
          break;

        case 'PDFRadioGroup':
          // Handle radio groups with proper option mapping
          const radioValue = mapRadioValue(field, value);
          console.log(`Radio ${key}: mapped "${value}" to "${radioValue}"`);
          if (radioValue) {
            field.select(radioValue);
          }
          break;

        case 'PDFDropdown':
          field.select(String(value));
          break;

        case 'PDFTextField':
          field.setText(String(value));
          field.updateAppearances(helv);
          break;

        case 'PDFSignature':
          // Skip signature fields - they can't be filled programmatically
          console.log(`Skipping signature field: ${key}`);
          break;

        default:
          // For unknown field types, try to set text if the method exists
          if (typeof field.setText === 'function') {
            field.setText(String(value));
            if (typeof field.updateAppearances === 'function') {
              field.updateAppearances(helv);
            }
          } else {
            console.log(`Skipping field ${key} of type ${field.constructor.name} - no setText method available`);
          }
          break;
      }
    } catch (error) {
      console.error(`Error processing field ${key} of type ${field.constructor.name}:`, error.message);
      // Continue processing other fields even if one fails
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
            success_url: `${YOUR_DOMAIN}/Pages/cart.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${YOUR_DOMAIN}/Pages/cart.html?payment=cancelled`,
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

// List all Stripe prices (for debugging)
app.get('/stripe-prices', async (req, res) => {
    try {
        console.log('Listing all Stripe prices...');
        const prices = await stripe.prices.list({ limit: 10, active: true });
        const priceList = prices.data.map(price => ({
            id: price.id,
            unit_amount: price.unit_amount,
            currency: price.currency,
            nickname: price.nickname,
            active: price.active
        }));
        console.log(`Found ${priceList.length} prices`);
        res.json({ prices: priceList });
    } catch (e) {
        console.error('Error listing Stripe prices:', e.message);
        res.status(500).json({ error: 'Failed to list prices', details: e.message });
    }
});

// Fetch Stripe price info by Price ID
app.get('/stripe-price/:priceId', async (req, res) => {
    try {
        console.log(`Fetching Stripe price: ${req.params.priceId}`);
        const price = await stripe.prices.retrieve(req.params.priceId, { expand: ['product'] });
        console.log(`Price found: ${price.id}, amount: ${price.unit_amount}`);
        res.json({
            priceId: price.id,
            unit_amount: price.unit_amount,
            currency: price.currency,
            product: price.product && price.product.name ? price.product.name : price.product.id,
            nickname: price.nickname,
        });
    } catch (e) {
        console.error(`Stripe price error for ${req.params.priceId}:`, e.message);
        res.status(404).json({ 
            error: 'Price not found', 
            priceId: req.params.priceId,
            details: e.message 
        });
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
