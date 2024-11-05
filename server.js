// server.js

const express = require('express');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const path = require('path');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // To parse URL-encoded data
app.use(fileUpload());
app.use(cors());

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebaseAdminKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
});

const db = admin.firestore();

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Routes

// Home route
app.get('/', (req, res) => {
  res.send('Welcome to the PDF Editing Server');
});

// Endpoint to edit PDF
app.post('/edit_pdf', async (req, res) => {
  // Get pdfName from query parameters
  const pdfName = req.query.pdf;

  // Sanitize the pdfName to prevent directory traversal attacks
  const sanitizedPdfName = path.basename(pdfName) + '.pdf';

  // Define the path to the PDF file based on pdfName
  const pdfPath = path.join(__dirname, 'public', sanitizedPdfName);

  // Check if the file exists
  if (!fs.existsSync(pdfPath)) {
    return res.status(400).send('Invalid PDF name or file does not exist.');
  }

  // Load the PDF from disk
  let pdfBytes;
  try {
    pdfBytes = await fs.promises.readFile(pdfPath);
  } catch (error) {
    console.error(`Error reading PDF file ${pdfPath}:`, error);
    return res.status(500).send('Error reading PDF file.');
  }

  // Load the PDFDocument
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // Get the form from the PDF
  const form = pdfDoc.getForm();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Get all field names from the PDF
  const fields = form.getFields();
  const pdfFieldNames = fields.map(field => field.getName());

  // Debug: Log all field names
  console.log('PDF Field Names:', pdfFieldNames);

  // Process form data
  pdfFieldNames.forEach(key => {
    if (req.body[key] !== undefined) {
      try {
        const value = req.body[key];

        // Get the field from the form
        const field = form.getField(key);

        // Determine field type and handle accordingly
        if (field.constructor.name === 'PDFCheckBox') {
          // Handle checkboxes
          if (value === 'Yes' || value === true || value === 'true') {
            field.check();
          } else {
            field.uncheck();
          }
        } else if (field.constructor.name === 'PDFTextField') {
          // Handle text fields
          field.setText(value);
          field.updateAppearances(helveticaFont);
        } else if (field.constructor.name === 'PDFRadioGroup') {
          // Handle radio buttons
          field.select(value);
        } else if (field.constructor.name === 'PDFDropdown') {
          // Handle dropdowns
          field.select(value);
        } else {
          // Handle other field types if necessary
          console.warn(`Unhandled field type: ${field.constructor.name}`);
        }
      } catch (e) {
        console.error(`Error processing field ${key}:`, e);
      }
    } else {
      console.log(`Field ${key} not provided in form data.`);
    }
  });

  // Save the updated PDF
  const updatedPdfBytes = await pdfDoc.save();

  // Set the response headers to indicate a file attachment
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename=Edited_${pdfName}.pdf`,
  });

  // Send the updated PDF back to the client
  res.send(Buffer.from(updatedPdfBytes));
});

// Additional routes (if any)

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
