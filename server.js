const express = require('express');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const path = require('path');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const cors = require('cors');
const nodemailer = require('nodemailer');

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(fileUpload());
app.use(cors());

require('dotenv').config();

admin.initializeApp({
  credential: admin.credential.cert(require('./firebaseAdminKey.json')),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
});

const db = admin.firestore();
app.use(express.static(path.join(__dirname, 'public')));

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'adamchaabane1234@gmail.com',
        pass: process.env.EMAIL_PASSWORD // Use environment variable for security
    }
});

app.post('/send-email', async (req, res) => {
    const { name, email, message } = req.body;
    const mailOptions = {
        from: 'adamchaabane1234@gmail.com',
        to: email, // Email recipient
        subject: 'New Ticket Submission',
        text: `Hello ${name},\n\nThank you for reaching out. Here is your message:\n\n${message}\n\nWe will get back to you shortly.`,
        replyTo: 'adamchaabane1234@gmail.com'
    };

    try {
        await transporter.sendMail(mailOptions);
        res.send('Email sent successfully.');
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).send('Failed to send email.');
    }
});

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

// Endpoint to handle PDF upload
app.post('/upload', async (req, res) => {
  if (!req.files || !req.files.pdf) {
    return res.status(400).send('No PDF file uploaded.');
  }
  const pdfFile = req.files.pdf;
  res.json({ message: 'PDF uploaded successfully.', fields: [] });
});

app.post('/edit_pdf', async (req, res) => {
  if (!req.files || !req.files.pdf) {
    return res.status(400).send('No PDF file uploaded.');
  }
  const pdfFile = req.files.pdf;
  const pdfBytes = pdfFile.data;
  if (!pdfBytes) {
    return res.status(400).send('PDF file is empty.');
  }

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  pdfFieldNames.forEach(key => {
    if (req.body[key] !== undefined) {
      try {
        const field = form.getTextField(key);
        if (field) {
          field.setText(req.body[key]);
        }
      } catch (e) {
        console.error(`No such field in the PDF: ${key}`);
      }
    }
  });

  const updatedPdfBytes = await pdfDoc.save();
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename=updated.pdf',
  });
  res.send(Buffer.from(updatedPdfBytes));
});

// Serve static PDF files
app.get('/form1.pdf', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/form1.pdf'));
});

app.get('/form2.pdf', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/form2.pdf'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
