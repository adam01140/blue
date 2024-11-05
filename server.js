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
const fs = require('fs'); // Required to read PDF files from disk

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // To parse URL-encoded data
app.use(fileUpload());
app.use(cors());

admin.initializeApp({
  credential: admin.credential.cert(require('./firebaseAdminKey.json')),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
});

const db = admin.firestore();
app.use(express.static(path.join(__dirname, 'public')));

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com', // Replace with your email
        pass: process.env.EMAIL_PASSWORD // Use environment variable for security
    }
});

// Endpoint to send email
app.post('/send-email', async (req, res) => {
    const { name, email, message } = req.body;
    const mailOptions = {
        from: 'your-email@gmail.com', // Replace with your email
        to: email, // Email recipient
        subject: 'New Ticket Submission',
        text: `Hello ${name},\n\nThank you for reaching out. Here is your message:\n\n${message}\n\nWe will get back to you shortly.`,
        replyTo: 'your-email@gmail.com' // Replace with your email
    };

    try {
        await transporter.sendMail(mailOptions);
        res.send('Email sent successfully.');
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).send('Failed to send email.');
    }
});

// Endpoint to add user
app.post('/addUser', async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).send('Name and email are required');
  }
  try {
    await db.collection('users').add({ name, email });
    res.status(200).send('User added successfully');
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).send('Internal Server Error');
  }
});

// List of field names that exist in the PDFs
const pdfFieldNames = [
  // Add all the field names from both sc100.pdf and form2.pdf
  'case_number',
  'case_number69',
  'current_date',
  'answer2',
  'q1',
  // Include all other field names used in your PDFs
];

// Endpoint to edit PDF
app.post('/edit_pdf', async (req, res) => {
  // Get pdfName from query parameters
  const pdfName = req.query.pdf;

  // Define the path to the PDF file based on pdfName
  let pdfPath;
  if (pdfName === 'sc100') {
    pdfPath = path.join(__dirname, 'public', 'sc100.pdf');
  } else if (pdfName === 'form2') {
    pdfPath = path.join(__dirname, 'public', 'form2.pdf');
  } else {
    return res.status(400).send('Invalid PDF name.');
  }

  // Load the PDF from disk
  let pdfBytes;
  try {
    pdfBytes = await fs.promises.readFile(pdfPath);
  } catch (error) {
    console.error(`Error reading PDF file ${pdfPath}:`, error);
    return res.status(500).send('Error reading PDF file.');
  }

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Process form data
  pdfFieldNames.forEach(key => {
    if (req.body[key] !== undefined) {
      try {
        const value = req.body[key];

        // Handle checkboxes
        if (['checkbox_field_name1', 'checkbox_field_name2'].includes(key)) {
          const field = form.getCheckBox(key);
          if (value === 'Yes') {
            field.check();
          } else {
            field.uncheck();
          }
        }
        // Handle text fields
        else {
          const field = form.getTextField(key);
          if (field) {
            field.setText(value);
            field.updateAppearances(helveticaFont);
          }
        }
      } catch (e) {
        console.error(`No such field in the PDF: ${key}`);
      }
    }
  });

  const updatedPdfBytes = await pdfDoc.save();
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename=Edited_${pdfName}.pdf`,
  });
  res.send(Buffer.from(updatedPdfBytes));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
