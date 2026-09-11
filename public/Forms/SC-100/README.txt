SC-100 PACKET DEPLOYMENT

Copy every file in this folder into the same Form-Star form directory.

Required files:
- example.html
- sc100_copy1.pdf
- sc100_copy2.pdf
- sc100a_1.pdf
- sc100a_2.pdf
- sc103_1.pdf through sc103_5.pdf
- mc031_item3.pdf
- mc031_military.pdf

Open example.html through the Form-Star localhost server. Do not open it with file://.

The page sends one multipart request per required PDF to:
/edit_pdf?pdf=<PDF filename without .pdf>

The page then downloads one file named SC-100_Filing_Packet.zip.

Testing shortcut:
Press Ctrl+Shift in either order to load the Maximum Path. This fills fictional data for 6 plaintiffs, 6 SC-103 attachments, 3 defendants, 2 SC-100A forms, and both MC-031 attachments. It does not submit automatically.

The packet contains five distinct SC-103 template files. When all 6 plaintiffs use fictitious business names, the form safely reuses sc103_1.pdf for the sixth fresh request and downloads it under a unique Plaintiff 6 filename.
