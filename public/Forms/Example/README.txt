N-400 Adaptive Naturalization Packet

Place example.html and all PDF files from this folder in the same deployed form directory.

PDF endpoint contract

The HTML sends one POST request per selected output to:

  /edit_pdf?pdf=<token>

Included base tokens:

  n-400
  n-648
  n-426
  g-28
  i-912
  g-1145
  g-1450
  g-1650
  g-1651

Included continuation tokens:

  n-400-part14
  i-912-part10
  g-28-part6

Every request contains only exact AcroForm field names for that PDF. Checkbox values use each PDF's exact export value, including required spaces.

Keyboard testing

  Ctrl+Shift  Load Maximum Path fictional test data. This creates an eight-file manifest and never submits.
  Ctrl+Q      Toggle one-section-at-a-time mode. Arrow Left and Arrow Right move between sections.

Submission

The Submit Form button fills only the triggered PDFs and downloads them together as N-400_Naturalization_Packet.zip.

Important manual actions

The generated PDFs remain editable. Applicants and the correct role owners must review the packet, attach evidence, and complete required signatures, dates, certifications, interview fields, and oath fields manually. Barcodes and USCIS-only fields are never populated by the HTML.
