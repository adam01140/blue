/*********************************************
 * generate.js - with hidden checkbox & text
 *   multi-term calculations,
 *   plus $$placeholders$$ supporting expressions
 *   and a single <script> block for logic
 *********************************************/

/* global map: questionId  →  canonical slug */
const questionSlugMap = {};

/* global maps and arrays for form data */
const questionNameIds = {};
const questionTypesMap = {};
const conditionalPDFs = [];
const conditionalAlerts = [];
const jumpLogics = [];
const labelMap = {};
const amountMap = {}; // used for numberedDropdown with amounts
const linkedDropdowns = []; // For storing linked dropdown pairs


/*------------------------------------------------------------------
 * HISTORY STACK for accurate "Back" navigation
 *-----------------------------------------------------------------*/
let sectionStack = [];          // push every section you LEAVE
let currentSectionNumber = 1;   // updated by navigateSection()



// We also create a buffer to store our conditional-logic code
// so we can insert it later in one <script> block.
let logicScriptBuffer = "";

/*───────────────────────────────*
 * canonical sanitiser – visible
 * to all build-time code
 *───────────────────────────────*/









/******************************************************************
 * helpers that the generator itself uses ( NOT inside formHTML! )
 ******************************************************************/

/* canonical sanitiser (unchanged) */
function sanitizeQuestionText (str){
    return String(str).toLowerCase()
                      .replace(/\W+/g, "_")
                      .replace(/^_+|_+$/g, "");
}

/* slug‑aware prefix for any checkbox belonging to a question */
function getCbPrefix (qId){
    if (questionSlugMap[qId]) return questionSlugMap[qId] + '_';   // e.g. do_you_have_any_of_these_
    if (questionNameIds[qId]) return questionNameIds[qId] + '_';
    return 'answer' + qId + '_';
}

/* build the final <input>.id / name for a checkbox option */
function buildCheckboxName (questionId, rawNameId, labelText){
    const slugPrefix = (questionSlugMap[questionId] || ('answer' + questionId)) + '_';

    // if the designer left the name blank, derive it from the label
    let namePart = (rawNameId || '').trim();
    if (!namePart){
        namePart = labelText.replace(/\W+/g, '_').toLowerCase();
    }

    // ensure we have our prefix exactly once
    if (!namePart.startsWith(slugPrefix)){
        namePart = slugPrefix + namePart;
    }
    return namePart;
}




function getFormHTML() {
	
	// RESET all globals before building
Object.keys(questionSlugMap).forEach(key => delete questionSlugMap[key]);
Object.keys(questionNameIds).forEach(key => delete questionNameIds[key]);
Object.keys(questionTypesMap).forEach(key => delete questionTypesMap[key]);
conditionalPDFs.length = 0;
conditionalAlerts.length = 0;
jumpLogics.length = 0;
linkedDropdowns.length = 0;
labelMap.length = 0;
amountMap.length = 0;
logicScriptBuffer = "";



  // Top HTML (head, body, header, etc.)
  let formHTML = [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '    <meta charset="UTF-8">',
    "    <title>Custom Form</title>",
    '    <link rel="stylesheet" href="generate.css">',
    "    <style>",
    "      /* Info icon and tooltip styles */",
    "      .question-header {",
    "        display: flex;",
    "        align-items: center;",
    "        gap: 10px;",
    "      }",
    "      .info-icon {",
    "        display: inline-block;",
    "        width: 18px;",
    "        height: 18px;",
    "        border: 1px solid #007bff;",
    "        border-radius: 50%;",
    "        color: #007bff;",
    "        font-size: 14px;",
    "        line-height: 18px;",
    "        text-align: center;",
    "        font-weight: bold;",
    "        cursor: pointer;",
    "        user-select: none;",
    "      }",
    "      .info-icon .info-tooltip {",
    "        visibility: hidden;",
    "        top: calc(100% + 5px);",
    "        left: 50%;",
    "        transform: translateX(-50%);",
    "        background-color: #333;",
    "        color: white;",
    "        padding: 8px 12px;",
    "        border-radius: 4px;",
    "        width: 200px;",
    "        z-index: 100;",
    "        font-weight: normal;",
    "        font-size: 14px;",
    "        line-height: 1.4;",
    "        text-align: left;",
    "        box-shadow: 0 2px 8px rgba(0,0,0,0.2);",
    "        opacity: 0;",
    "        transition: opacity 0.3s, visibility 0.3s;",
    "      }",
    "      .info-icon:hover .info-tooltip,",
    "      .info-icon:focus .info-tooltip {",
    "        visibility: visible;",
    "        opacity: 1;",
    "      }",
    "      .info-icon .info-tooltip::after {",
    "        content: '';",
    "        position: absolute;",
    "        bottom: 100%;",
    "        left: 50%;",
    "        margin-left: -5px;",
    "        border-width: 5px;",
    "        border-style: solid;",
    "        border-color: transparent transparent #333 transparent;",
    "      }",
    // Progress Bar Styles
    "      .progress-bar-container {",
    "        width: 100%;",
    "        max-width: 800px;",
    "        margin: 0 auto 20px auto;",
    "        padding: 0 0 10px 0;",
    "        background: none;",
    "      }",
    "      .progress-bar-bg {",
    "        width: 100%;",
    "        height: 18px;",
    "        background: linear-gradient(90deg, #e0e7ef 0%, #f5f7fa 100%);",
    "        border-radius: 10px;",
    "        box-shadow: 0 2px 8px rgba(44,62,80,0.07);",
    "        overflow: hidden;",
    "        position: relative;",
    "      }",
    "      .progress-bar-fill {",
    "        height: 100%;",
    "        background: linear-gradient(90deg, #4f8cff 0%, #38d39f 100%);",
    "        border-radius: 10px 0 0 10px;",
    "        width: 0%;",
    "        transition: width 0.5s cubic-bezier(.4,1.4,.6,1), background 0.3s;",
    "        box-shadow: 0 2px 8px rgba(44,62,80,0.13);",
    "        position: absolute;",
    "        left: 0;",
    "        top: 0;",
    "      }",
    "      .progress-bar-label {",
    "        position: absolute;",
    "        width: 100%;",
    "        text-align: center;",
    "        top: 0;",
    "        left: 0;",
    "        height: 100%;",
    "        line-height: 18px;",
    "        font-size: 13px;",
    "        color: #2c3e50;",
    "        font-weight: 600;",
    "        letter-spacing: 0.5px;",
    "        pointer-events: none;",
    "        z-index: 2;",
    "        text-shadow: 0 1px 2px #fff, 0 0 2px #fff;",
    "      }",
    "      .navigation-buttons {",
    "        display: flex;",
    "        gap: 15px;",
    "        justify-content: center;",
    "        margin-top: 10px;",
    "      }",
    "      .navigation-buttons button {",
    "        width: auto;",
    "        max-width: none;",
    "        margin: 0;",
    "        display: inline-flex;",
    "      }",
    "      /* Stepper Progress Bar Styles */",
    "      .stepper-progress-bar {\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        margin: 12px auto 0 auto;\n        width: 100%;\n        max-width: 700px;\n        background: none;\n        gap: 0;\n      }\n      .stepper-step {\n        display: flex;\n        flex-direction: column;\n        align-items: center;\n        position: relative;\n        z-index: 2;\n        min-width: 90px;\n      }\n      .stepper-circle {\n        width: 32px;\n        height: 32px;\n        border-radius: 50%;\n        background: #e0e7ef;\n        color: #2c3e50;\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        font-weight: bold;\n        font-size: 18px;\n        border: 2px solid #4f8cff;\n        transition: background 0.3s, color 0.3s, border 0.3s;\n      }\n      .stepper-step.active .stepper-circle,\n      .stepper-step.completed .stepper-circle {\n        background: linear-gradient(90deg, #4f8cff 0%, #38d39f 100%);\n        color: #fff;\n        border: 2px solid #38d39f;\n      }\n      .stepper-label {\n        margin-top: 8px;\n        font-size: 15px;\n        color: #2c3e50;\n        font-weight: 600;\n        text-align: center;\n        min-width: 80px;\n      }\n      .stepper-step.completed .stepper-label {\n        color: #38d39f;\n      }\n      .stepper-step.active .stepper-label {\n        color: #4f8cff;\n      }\n      .stepper-line {\n        flex: 1;\n        height: 4px;\n        background: #e0e7ef;\n        margin: 0 0px;\n        position: relative;\n        z-index: 1;\n        transition: background 0.5s cubic-bezier(.4,1.4,.6,1);\n      }\n      .stepper-line.filled {\n        background: linear-gradient(90deg, #4f8cff 0%, #38d39f 100%);\n      }\n  ",
    // Insert modal CSS
    `      /* Custom Modal Styles */
      .custom-modal-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(44, 62, 80, 0.45);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.3s;
      }
      .custom-modal {
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(44,62,80,0.18);
        padding: 32px 28px 24px 28px;
        max-width: 370px;
        width: 90%;
        text-align: center;
        position: relative;
        animation: modalPopIn 0.35s cubic-bezier(.4,1.4,.6,1);
      }
      @keyframes modalPopIn {
        0% { transform: scale(0.85); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
      .custom-modal h2 {
        margin-top: 0;
        color: #2c3e50;
        font-size: 1.35rem;
        font-weight: 700;
        margin-bottom: 12px;
      }
      .custom-modal p {
        color: #4f8cff;
        font-size: 1.08rem;
        margin-bottom: 28px;
      }
      .custom-modal .modal-buttons {
        display: flex;
        gap: 18px;
        justify-content: center;
      }
      .custom-modal button {
        padding: 8px 22px;
        border-radius: 6px;
        border: none;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s, color 0.2s;
      }
      .custom-modal .modal-back {
        background: #e0e7ef;
        color: #2c3e50;
      }
      .custom-modal .modal-back:hover {
        background: #cfd8e3;
      }
      .custom-modal .modal-continue {
        background: linear-gradient(90deg, #4f8cff 0%, #38d39f 100%);
        color: #fff;
        border: none;
      }
      .custom-modal .modal-continue:hover {
        background: linear-gradient(90deg, #38d39f 0%, #4f8cff 100%);
      }</style>`,
    "</head>",
    "<body>",
    // Insert modal HTML right after <body>
    '<div id="loginRequiredModal" class="custom-modal-overlay" style="display:none;">\n' +
    '  <div class="custom-modal">\n' +
    '    <h2>Account Required</h2>\n' +
    '    <p>You must create an account to continue filling out the form.</p>\n' +
    '    <div class="modal-buttons">\n' +
    '      <button class="modal-back" id="modalBackBtn" type="button">Back</button>\n' +
    '      <button class="modal-continue" id="modalContinueBtn" type="button">Continue</button>\n' +
    '    </div>\n' +
    '  </div>\n' +
    '</div>',
    "<header>",
    '    <img src="logo.png" alt="FormWiz Logo" width="130" height="80" onclick="location.href=\'index.html\';">',
    "    <nav>",
    '        <a href="index.html">Home</a>',
    '        <a href="forms.html">Forms</a>',
    '        <a href="contact.html">Contact Us</a>',
    "    </nav>",
    "</header>",
    "",
    '<div id="pdfPreview" style="display:none;">',
    '    <iframe id="pdfFrame" style="display:none"></iframe>',
    "</div>",
    '<input type="text" id="current_date" name="current_date" placeholder="current_date" style="display:none">',
    "",
    "<!-- Firebase includes -->",
'<script src="https://js.stripe.com/v3/"></script>',
    '<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>',
    '<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>',
    '<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>',
    "",
    '<script>',
    
    '/*──────── mirror a dropdown → textbox and checkbox ────────*/',
    'function dropdownMirror(selectEl, baseName){',
    '    const wrap = document.getElementById("dropdowntext_"+baseName);',
    '    if(!wrap) return;',
    '',
    '    const val = selectEl.value.trim();',
    '    if(!val) {',
    '        wrap.innerHTML = "";',
    '        return;',
    '    }',
    '',
    '    const textId = baseName + "_dropdown";',
    '    const textField = document.getElementById(textId);',
    '    ',
    '    if(textField) {',
    '        textField.value = val;',
    '        textField.style.display = "none";',
    '    }',
    '',
    '    const existingCheckboxes = wrap.querySelectorAll("div");',
    '    existingCheckboxes.forEach(div => div.remove());',
    '',
    '    const idSuffix = val.replace(/\\W+/g, "_").toLowerCase();',
    '    const checkboxId = baseName + "_" + idSuffix;',
    '    ',
    '    const checkboxDiv = document.createElement("div");',
    '    checkboxDiv.style.display = "none";',
    '    checkboxDiv.innerHTML = "<input type=\'checkbox\' id=\'" + checkboxId + "\' name=\'" + checkboxId + "\' checked>" +',
    '                     "<label for=\'" + checkboxId + "\'> " + baseName + "_" + idSuffix + "</label>";',
    '    ',
    '    wrap.appendChild(checkboxDiv);',
    '    handleLinkedDropdowns(baseName, val);',
    '}',
    '',
    // Add a flag to prevent recursive calls
    'let isHandlingLink = false;',
    '',
    // Handle linked dropdown logic
    'function handleLinkedDropdowns(sourceName, selectedValue) {',
    '    if (!linkedDropdowns || linkedDropdowns.length === 0 || isHandlingLink) return;',
    '    ',
    '    try {',
    '        isHandlingLink = true;  // Set flag before handling links',
    '        linkedDropdowns.forEach(linkPair => {',
    '            if (linkPair.sourceNameId === sourceName) {',
    '                const targetDropdown = document.getElementById(linkPair.targetNameId);',
    '                if (targetDropdown && targetDropdown.value !== selectedValue) {  // Only if value is different',
    '                    let optionExists = false;',
    '                    for (let i = 0; i < targetDropdown.options.length; i++) {',
    '                        if (targetDropdown.options[i].value === selectedValue) {',
    '                            optionExists = true;',
    '                            targetDropdown.value = selectedValue;',
    '                            // Trigger change event only if value actually changed',
    '                            const event = new Event("change");',
    '                            targetDropdown.dispatchEvent(event);',
    '                            break;',
    '                        }',
    '                    }',
    '                    if (!optionExists && selectedValue) {',
    '                        console.warn("Option \'" + selectedValue + "\' does not exist in linked dropdown " + linkPair.targetNameId);',
    '                    }',
    '                }',
    '            }',
    '            else if (linkPair.targetNameId === sourceName) {',
    '                const sourceDropdown = document.getElementById(linkPair.sourceNameId);',
    '                if (sourceDropdown && sourceDropdown.value !== selectedValue) {  // Only if value is different',
    '                    let optionExists = false;',
    '                    for (let i = 0; i < sourceDropdown.options.length; i++) {',
    '                        if (sourceDropdown.options[i].value === selectedValue) {',
    '                            optionExists = true;',
    '                            sourceDropdown.value = selectedValue;',
    '                            // Trigger change event only if value actually changed',
    '                            const event = new Event("change");',
    '                            sourceDropdown.dispatchEvent(event);',
    '                            break;',
    '                        }',
    '                    }',
    '                    if (!optionExists && selectedValue) {',
    '                        console.warn("Option \'" + selectedValue + "\' does not exist in linked dropdown " + linkPair.sourceNameId);',
    '                    }',
    '                }',
    '            }',
    '        });',
    '    } finally {',
    '        isHandlingLink = false;  // Always reset flag when done',
    '    }',
    '}',
    '</script>',
    "",
    '<div style="width: 80%; max-width: 800px; margin: 20px auto; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; display: none;">',
    '    <h3 style="text-align: center; margin-bottom: 15px; color: #2c3e50;">Your Information</h3>',
    '    <div style="display: flex; gap: 15px; margin-bottom: 15px;">',
    '        <div style="flex: 1;">',
    '            <label for="user_firstname" style="display: block; margin-bottom: 5px; font-weight: bold;">First Name</label>',
    '            <input type="text" form="customForm" id="user_firstname" name="user_firstname" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">',
    '        </div>',
    '        <div style="flex: 1;">',
    '            <label for="user_lastname" style="display: block; margin-bottom: 5px; font-weight: bold;">Last Name</label>',
    '            <input type="text" form="customForm" id="user_lastname" name="user_lastname" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">',
    '        </div>',
    '    </div>',
    '    <div style="margin-bottom: 15px;">',
    '        <label for="user_email" style="display: block; margin-bottom: 5px; font-weight: bold;">Email Address</label>',
    '        <input type="email" form="customForm" id="user_email" name="user_email" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">',
    '    </div>',
    '    <div style="margin-bottom: 15px;">',
    '        <label for="user_phone" style="display: block; margin-bottom: 5px; font-weight: bold;">Phone Number</label>',
    '        <input type="tel" form="customForm" id="user_phone" name="user_phone" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">',
    '    </div>',
    '    <div style="margin-bottom: 15px;">',
    '        <label for="user_street" style="display: block; margin-bottom: 5px; font-weight: bold;">Street Address</label>',
    '        <input type="text" form="customForm" id="user_street" name="user_street" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">',
    '    </div>',
    '    <div style="display: flex; gap: 15px; margin-bottom: 15px;">',
    '        <div style="flex: 2;">',
    '            <label for="user_city" style="display: block; margin-bottom: 5px; font-weight: bold;">City</label>',
    '            <input type="text" form="customForm" id="user_city" name="user_city" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">',
    '        </div>',
    '        <div style="flex: 1;">',
    '            <label for="user_state" style="display: block; margin-bottom: 5px; font-weight: bold;">State</label>',
    '            <input type="text" form="customForm" id="user_state" name="user_state" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">',
    '        </div>',
    '        <div style="flex: 1;">',
    '            <label for="user_zip" style="display: block; margin-bottom: 5px; font-weight: bold;">ZIP</label>',
    '            <input type="text" form="customForm" id="user_zip" name="user_zip" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">',
    '        </div>',
    '    </div>',
    '</div>',
    '<div id="questions">',
    '    <div id="result"></div>',
    "    <section>",
    '    <div id="box">',
    '        <form id="customForm">',
  ].join("\n");

  // Get all PDF names
  const pdfFormNameInputEl = document.getElementById("formPDFName");
  const pdfFormName = pdfFormNameInputEl
    ? pdfFormNameInputEl.value.trim()
    : "test.pdf";
  const escapedPdfFormName = pdfFormName
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
    
  // Get the desired output file name
  const pdfOutputNameInputEl = document.getElementById("pdfOutputName");
  const pdfOutputName = pdfOutputNameInputEl && pdfOutputNameInputEl.value.trim() ? pdfOutputNameInputEl.value.trim() : "example.html";
  const escapedPdfOutputName = pdfOutputName.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"');

  // Get the Stripe Price ID
  const stripePriceIdInputEl = document.getElementById("stripePriceId");
  const stripePriceId = stripePriceIdInputEl && stripePriceIdInputEl.value.trim() ? stripePriceIdInputEl.value.trim() : "";
  const escapedStripePriceId = stripePriceId.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"');

  // Get additional PDF names
  const additionalPdfNames = [];
  const additionalPdfInputs = document.querySelectorAll('[id^="additionalPdfName_"]');
  additionalPdfInputs.forEach(input => {
    if (input.value.trim()) {
      additionalPdfNames.push(input.value.trim());
    }
  });
  
  // Escape additional PDF names
  const escapedAdditionalPdfNames = additionalPdfNames.map(name => 
    name.replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
  );

  // Insert stepper progress bar above the form, only once
  formHTML += `<div class="stepper-progress-bar" id="stepperProgressBar">`;
  for (let step = 1; step < sectionCounter; step++) {
    formHTML += `<div class="stepper-step" data-step="${step}">`;
    formHTML += `<div class="stepper-circle">${step}</div>`;
    const sectionNameEl = document.getElementById("sectionBlock" + step)?.querySelector("#sectionName" + step);
    const sectionName = sectionNameEl ? sectionNameEl.value : `Section ${step}`;
    formHTML += `<div class="stepper-label">${sectionName}</div>`;
    formHTML += `</div>`;
    if (step < sectionCounter - 1) {
      formHTML += `<div class="stepper-line"></div>`;
    }
  }
  formHTML += `</div>`;

  // Build each Section & its questions
  for (let s = 1; s < sectionCounter; s++) {
    let sectionBlock = document.getElementById("sectionBlock" + s);
    if (!sectionBlock) continue;
    const sectionNameEl = sectionBlock.querySelector("#sectionName" + s);
    const sectionName = sectionNameEl ? sectionNameEl.value : "Section " + s;
    // Start the section
    formHTML += `<div id="section${s}" class="section${s === 1 ? " active" : ""}">`;
    // Only add the section title, not the stepper
    formHTML += `<center><h1 class="section-title">${sectionName}</h1>`;

    // Grab all questions in this section
    const questionsInSection = sectionBlock.querySelectorAll(".question-block");
    for (let qIdx = 0; qIdx < questionsInSection.length; qIdx++) {
      const qBlock = questionsInSection[qIdx];
      const questionId = qBlock.id.replace("questionBlock", "");

      const questionTextEl = qBlock.querySelector("#question" + questionId);
      const questionText = questionTextEl ? questionTextEl.value : "";
	  // ----------  ADD THIS  ----------
const slug = sanitizeQuestionText(questionText);
questionSlugMap[questionId] = slug;
// --------------------------------




      const questionTypeEl = qBlock.querySelector("#questionType" + questionId);
      const questionType = questionTypeEl ? questionTypeEl.value : "text";

      // store the question type
      questionTypesMap[questionId] = questionType;

      // logic
      const logicCheckbox = qBlock.querySelector("#logic" + questionId);
      const logicEnabled = logicCheckbox && logicCheckbox.checked;

      // jump logic (multi-condition version)
      const jumpEnabledEl = qBlock.querySelector("#enableJump" + questionId);
      const jumpEnabled = jumpEnabledEl && jumpEnabledEl.checked;
      if (jumpEnabled) {
        const jumpConditions = qBlock.querySelectorAll(".jump-condition");
        jumpConditions.forEach((condition) => {
          const jumpOptionEl = condition.querySelector("select");
          const jumpToEl = condition.querySelector('input[type="text"]');
          if (jumpOptionEl && jumpToEl && jumpToEl.value.trim()) {
            jumpLogics.push({
              questionId: questionId,
              questionType: questionType,
              jumpOption: jumpOptionEl.value.trim(),
              jumpTo: jumpToEl.value.trim(),
              section: s,
            });
          }
        });
      }

      // conditional PDF
      const pdfCheckEl = qBlock.querySelector(
        "#enableConditionalPDF" + questionId
      );
      const pdfEnabled = pdfCheckEl && pdfCheckEl.checked;

      const pdfNameEl = qBlock.querySelector("#conditionalPDFName" + questionId);
      const pdfAnsEl = qBlock.querySelector(
        "#conditionalPDFAnswer" + questionId
      );
      const pdfNameVal = pdfNameEl ? pdfNameEl.value : "";
      const pdfAnsVal = pdfAnsEl ? pdfAnsEl.value : "";

      // conditional Alert
      const alertCheckEl = qBlock.querySelector(
        "#enableConditionalAlert" + questionId
      );
      const alertEnabled = alertCheckEl && alertCheckEl.checked;
      const alertPrevQEl = qBlock.querySelector(
        "#alertPrevQuestion" + questionId
      );
      const alertPrevAEl = qBlock.querySelector("#alertPrevAnswer" + questionId);
      const alertTextEl = qBlock.querySelector("#alertText" + questionId);

      const alertPrevQ = alertPrevQEl ? alertPrevQEl.value : "";
      const alertPrevA = alertPrevAEl ? alertPrevAEl.value : "";
      const alertTxt = alertTextEl ? alertTextEl.value : "";
      if (alertEnabled && alertPrevQ && alertPrevA && alertTxt) {
        conditionalAlerts.push({
          questionId: questionId,
          prevQuestionId: alertPrevQ,
          prevAnswer: alertPrevA,
          alertText: alertTxt,
        });
      }

      // Start the question container
      formHTML += `<div id="question-container-${questionId}"${
        logicEnabled ? ' class="hidden"' : ""
      }>`;
      
      // Check if info box is enabled
      const infoBoxEnabled = qBlock.querySelector(`#enableInfoBox${questionId}`)?.checked || false;
      let infoBoxText = "";
      if (infoBoxEnabled) {
        infoBoxText = qBlock.querySelector(`#infoBoxText${questionId}`)?.value || "";
      }
      
      // Add question title with info icon if needed
      if (infoBoxEnabled && infoBoxText) {
        formHTML += `
          <div class="question-header">
            <label><h3>${questionText}</h3></label>
            <div class="info-icon" tabindex="0">
              <span>i</span>
              <div class="info-tooltip">${infoBoxText}</div>
            </div>
          </div>
        `;
      } else {
        formHTML += `<label><h3>${questionText}</h3></label>`;
      }

      // Add subtitle if enabled
      const subtitleEnabled = qBlock.querySelector(`#enableSubtitle${questionId}`)?.checked || false;
      if (subtitleEnabled) {
        const subtitleText = qBlock.querySelector(`#subtitleText${questionId}`)?.value || "";
        if (subtitleText) {
          formHTML += `<p class="question-subtitle" style="margin-top: -10px; font-size: 0.9em; color: #666;">${subtitleText}</p>`;
        }
      }

      // Render the question by type
      if (questionType === "text") {
        const nmEl = qBlock.querySelector("#textboxName" + questionId);
        const phEl = qBlock.querySelector("#textboxPlaceholder" + questionId);
        const nameId = nmEl && nmEl.value ? nmEl.value : "answer" + questionId;
        const placeholder = phEl && phEl.value ? phEl.value : "";
        questionNameIds[questionId] = nameId;
        formHTML += `<input type="text" id="${nameId}" name="${nameId}" placeholder="${placeholder}"><br>`;
      } else if (questionType === "bigParagraph") {
        const nmEl2 = qBlock.querySelector("#textboxName" + questionId);
        const phEl2 = qBlock.querySelector("#textboxPlaceholder" + questionId);
        const nameId2 =
          nmEl2 && nmEl2.value ? nmEl2.value : "answer" + questionId;
        const ph2 = phEl2 && phEl2.value ? phEl2.value : "";
        questionNameIds[questionId] = nameId2;
        formHTML += `<textarea id="${nameId2}" name="${nameId2}" rows="5" cols="50" placeholder="${ph2}"></textarea><br>`;
      } else if (questionType === "money") {
        const mnNmEl = qBlock.querySelector("#textboxName" + questionId);
        const mnPhEl = qBlock.querySelector("#textboxPlaceholder" + questionId);
        const mnName =
          mnNmEl && mnNmEl.value ? mnNmEl.value : "answer" + questionId;
        const mnPh = mnPhEl && mnPhEl.value ? mnPhEl.value : "Enter amount";
        questionNameIds[questionId] = mnName;
        formHTML += `<input type="number" id="${mnName}" name="${mnName}" min="0" step="0.01" placeholder="${mnPh}"><br>`;
      } else if (questionType === "date") {
        const nmEl = qBlock.querySelector("#textboxName" + questionId);
        const nameId = nmEl && nmEl.value ? nmEl.value : "answer" + questionId;
        questionNameIds[questionId] = nameId;
        formHTML += `
          <div class="date-container">
            <input type="date" id="${nameId}" name="${nameId}" class="date-input">
          </div><br>`;
      } else if (questionType === "dateRange") {
        const nmEl = qBlock.querySelector("#textboxName" + questionId);
        const nameId = nmEl && nmEl.value ? nmEl.value : "answer" + questionId;
        questionNameIds[questionId] = nameId;
        
        // Create two date inputs with IDs based on the slug (nameId_1 and nameId_2)
        formHTML += `
          <div class="date-range-container">
            <div class="date-input-group">
              <label for="${nameId}_1">Start Date</label>
              <input type="date" id="${nameId}_1" name="${nameId}_1" class="date-input start-date">
            </div>
            <div class="date-range-separator">to</div>
            <div class="date-input-group">
              <label for="${nameId}_2">End Date</label>
              <input type="date" id="${nameId}_2" name="${nameId}_2" class="date-input end-date">
            </div>
          </div><br>
          <script>
            // Add validation for date range (end date >= start date)
            document.addEventListener('DOMContentLoaded', function() {
              const startDate = document.getElementById('${nameId}_1');
              const endDate = document.getElementById('${nameId}_2');
              
              if (startDate && endDate) {
                // Update min date for end date when start date changes
                startDate.addEventListener('change', function() {
                  if (startDate.value) {
                    endDate.min = startDate.value;
                    
                    // If end date is before start date, reset it
                    if (endDate.value && endDate.value < startDate.value) {
                      endDate.value = '';
                    }
                  }
                });
                
                // Set initial min value if start date has a value
                if (startDate.value) {
                  endDate.min = startDate.value;
                }
              }
            });
          </script>`;
      } else if (questionType === "email") {
        const nmEl = qBlock.querySelector("#textboxName" + questionId);
        const phEl = qBlock.querySelector("#textboxPlaceholder" + questionId);
        const nameId = nmEl && nmEl.value ? nmEl.value : "answer" + questionId;
        const placeholder = phEl && phEl.value ? phEl.value : "example@domain.com";
        questionNameIds[questionId] = nameId;
        formHTML += `
          <div class="email-input-container">
            <input type="email" id="${nameId}" name="${nameId}" 
                   placeholder="${placeholder}" 
                   pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                   class="email-input">
            <div class="email-validation-icon"></div>
          </div><br>
          <script>
            // Add validation feedback for email input
            document.addEventListener('DOMContentLoaded', function() {
              const emailInput = document.getElementById('${nameId}');
              if (emailInput) {
                emailInput.addEventListener('blur', function() {
                  const isValid = emailInput.checkValidity();
                  const container = emailInput.closest('.email-input-container');
                  if (container) {
                    if (emailInput.value === '') {
                      container.classList.remove('valid', 'invalid');
                    } else {
                      container.classList.toggle('valid', isValid);
                      container.classList.toggle('invalid', !isValid);
                    }
                  }
                });
                
                emailInput.addEventListener('input', function() {
                  const container = emailInput.closest('.email-input-container');
                  if (container && (container.classList.contains('valid') || container.classList.contains('invalid'))) {
                    const isValid = emailInput.checkValidity();
                    container.classList.toggle('valid', isValid && emailInput.value !== '');
                    container.classList.toggle('invalid', !isValid && emailInput.value !== '');
                  }
                });
              }
            });
          </script>`;
      } else if (questionType === "phone") {
        const nmEl = qBlock.querySelector("#textboxName" + questionId);
        const phEl = qBlock.querySelector("#textboxPlaceholder" + questionId);
        const nameId = nmEl && nmEl.value ? nmEl.value : "answer" + questionId;
        const placeholder = phEl && phEl.value ? phEl.value : "(123) 456-7890";
        questionNameIds[questionId] = nameId;
        formHTML += `
          <div class="phone-input-container">
            <input type="tel" id="${nameId}" name="${nameId}" placeholder="${placeholder}" class="phone-input" maxlength="14">
          </div><br>`;
      } else if (questionType === "radio") {
        const radNameEl = qBlock.querySelector("#textboxName" + questionId);
        const radName =
          radNameEl && radNameEl.value
            ? radNameEl.value
            : "answer" + questionId;
        questionNameIds[questionId] = radName;
        formHTML += `
          <select id="${radName}" name="${radName}">
            <option value="" disabled selected>Select an option</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select><br>`;
        if (pdfEnabled) {
          conditionalPDFs.push({
            questionId: questionId,
            questionNameId: radName,
            conditionalAnswer: pdfAnsVal,
            pdfName: pdfNameVal,
            questionType: questionType,
          });
        }
      } else if (questionType === "dropdown") {
        const ddNameEl = qBlock.querySelector("#textboxName" + questionId);
        const ddNm =
          ddNameEl && ddNameEl.value ? ddNameEl.value : "answer" + questionId;
        questionNameIds[questionId] = ddNm;

        // Check if linking logic is enabled
        const linkingEnabledEl = qBlock.querySelector("#enableLinking" + questionId);
        const linkingEnabled = linkingEnabledEl && linkingEnabledEl.checked;
        if (linkingEnabled) {
          const linkingTargetEl = qBlock.querySelector("#linkingTarget" + questionId);
          const linkingTargetId = linkingTargetEl ? linkingTargetEl.value : "";
		  
		  
		  const targetQuestionBlock = document.getElementById("questionBlock" + linkingTargetId);
const targetNameInput = targetQuestionBlock?.querySelector("#textboxName" + linkingTargetId);
const actualTargetNameId = targetNameInput?.value || "answer" + linkingTargetId;


          if (linkingTargetId) {
            linkedDropdowns.push({
  sourceId: questionId,
  sourceNameId: ddNm,
  targetId: linkingTargetId,
  targetNameId: actualTargetNameId
});
          }
        }

        // 1) Possibly grab user-entered image data
        const imgUrlEl = qBlock.querySelector("#dropdownImageURL" + questionId);
        const imgWidthEl = qBlock.querySelector(
          "#dropdownImageWidth" + questionId
        );
        const imgHeightEl = qBlock.querySelector(
          "#dropdownImageHeight" + questionId
        );

        let imageUrl = imgUrlEl ? imgUrlEl.value.trim() : "";
        let imageWidth = imgWidthEl ? parseInt(imgWidthEl.value, 10) : 0;
        let imageHeight = imgHeightEl ? parseInt(imgHeightEl.value, 10) : 0;

        // Insert <img> if user gave a URL
        if (imageUrl) {
          if (!imageWidth || imageWidth < 1) imageWidth = 300;
          if (!imageHeight || imageHeight < 1) imageHeight = 300;
          formHTML += `<br><img src="${imageUrl}" alt="Dropdown Image" width="${imageWidth}" height="${imageHeight}"><br>`;
        }

        // 2) The <select> itself
        formHTML += `<select id="${ddNm}" name="${ddNm}"
                      onchange="dropdownMirror(this, '${ddNm}')">
                       <option value="" disabled selected>Select an option</option>`;
        const ddOps = qBlock.querySelectorAll(
          `#dropdownOptions${questionId} input`
        );
        for (let i = 0; i < ddOps.length; i++) {
          const val = ddOps[i].value.trim();
          if (val) {
            formHTML += `<option value="${val}">${val}</option>`;
          }
        }
        formHTML += `</select><br>
              <div id="dropdowntext_${ddNm}"></div>
              <input type="text" id="${ddNm}_dropdown" name="${ddNm}_dropdown"
                   readonly style="display:none;">`;
        // handle PDF logic
        if (pdfEnabled) {
          conditionalPDFs.push({
            questionId: questionId,
            questionNameId: ddNm,
            conditionalAnswer: pdfAnsVal,
            pdfName: pdfNameVal,
            questionType: questionType,
          });
        }
      } else if (questionType === "checkbox") {
       /* ---------- CHECKBOX QUESTION ---------- */
const cOptsDivs = qBlock.querySelectorAll(`#checkboxOptions${questionId} > div`);
const cboxOptions = [];

/* Use the slug as the base prefix (and store it for helpers) */
const qSlug = questionSlugMap[questionId] || ('answer' + questionId);
questionNameIds[questionId] = qSlug;      // so helpers know the base

formHTML += `<div><center><div id="checkmark" class="checkbox-group-${questionId}">`;

/* ── render each checkbox option ───────────────────────────── */
for (let co = 0; co < cOptsDivs.length; co++){
    const optDiv        = cOptsDivs[co];
    const txtEl         = optDiv.querySelector(`#checkboxOptionText${questionId}_${co+1}`);
    const nameEl        = optDiv.querySelector(`#checkboxOptionName${questionId}_${co+1}`);
    const valEl         = optDiv.querySelector(`#checkboxOptionValue${questionId}_${co+1}`);
    const hasAmountEl   = optDiv.querySelector(`#checkboxOptionHasAmount${questionId}_${co+1}`);
    const amountNameEl  = optDiv.querySelector(`#checkboxOptionAmountName${questionId}_${co+1}`);
    const amountPhEl    = optDiv.querySelector(`#checkboxOptionAmountPlaceholder${questionId}_${co+1}`);

    const labelText         = txtEl?.value.trim() || ('Option ' + (co+1));
    const optionNameIdRaw   = nameEl?.value.trim() || '';
    const optionNameId      = buildCheckboxName(questionId, optionNameIdRaw, labelText);

    const optionValue       = valEl?.value.trim() || labelText;
    const hasAmount         = hasAmountEl?.checked;
    const amountName        = amountNameEl?.value.trim() || '';
    const amountPlaceholder = amountPhEl?.value.trim() || 'Amount';

    cboxOptions.push({
        labelText,
        optionNameId,
        optionValue,
        hasAmount,
        amountName,
        amountPlaceholder
    });

    /* actual input */
    formHTML += `
      <span class="checkbox-inline">
        <label class="checkbox-label">
          <input type="checkbox" id="${optionNameId}" name="${optionNameId}" value="${optionValue}" 
                 ${hasAmount ? `onchange="toggleAmountField('${optionNameId}_amount', this.checked); toggleNoneOption(this, ${questionId});"` : 
                               `onchange="toggleNoneOption(this, ${questionId});"`}>
          ${labelText}
        </label>
      </span>`;

    /* optional amount field */
    if (hasAmount){
        formHTML += `
          <input type="number" id="${optionNameId}_amount"
                 name="${amountName || optionNameId + '_amount'}"
                 placeholder="${amountPlaceholder}"
                 style="display:none; margin-top:5px; text-align:center; width:200px; padding:5px;">`;
    }
}

/* ── optional "None of the above" ─────────────────────────── */
const noneEl = qBlock.querySelector(`#noneOfTheAbove${questionId}`);
if (noneEl?.checked){
    const noneStr      = 'None of the above';
    // Ensure we use the designated pattern for the "none" option
    const noneNameId   = `${qSlug}_none`;

    cboxOptions.push({
        labelText: noneStr,
        optionNameId: noneNameId,
        optionValue: noneStr
    });

    formHTML += `
      <span class="checkbox-inline">
        <label class="checkbox-label">
          <input type="checkbox" id="${noneNameId}" name="${noneNameId}" value="${noneStr}" 
                 onchange="handleNoneOfTheAboveToggle(this, ${questionId});">
          ${noneStr}
        </label>
      </span>`;
}

formHTML += `</div><br></div>`;


        // If conditional PDF was enabled
        if (pdfEnabled) {
          for (let ck = 0; ck < cboxOptions.length; ck++) {
            if (cboxOptions[ck].labelText === pdfAnsVal) {
              conditionalPDFs.push({
                questionId: questionId,
                questionNameId: cboxOptions[ck].optionNameId,
                conditionalAnswer: cboxOptions[ck].optionValue,
                pdfName: pdfNameVal,
                questionType: questionType,
              });
              break;
            }
          }
        }
      } else if (questionType === "multipleTextboxes") {
        const multiBlocks = qBlock.querySelectorAll(
          `#multipleTextboxesOptions${questionId} > div`
        );
        // Separate textboxes and amounts
        const textboxInputs = [];
        const amountInputs = [];
        for (let mb = 0; mb < multiBlocks.length; mb++) {
          const dEl = multiBlocks[mb];
          if (dEl.classList.contains('amount-block')) {
            amountInputs.push(dEl);
          } else {
            textboxInputs.push(dEl);
          }
        }
        // Render textboxes
        for (let mb = 0; mb < textboxInputs.length; mb++) {
          const dEl = textboxInputs[mb];
          const lblInput = dEl.querySelector(
            `#multipleTextboxLabel${questionId}_${mb + 1}`
          );
          const nmInput = dEl.querySelector(
            `#multipleTextboxName${questionId}_${mb + 1}`
          );
          const phInput = dEl.querySelector(
            `#multipleTextboxPlaceholder${questionId}_${mb + 1}`
          );
          const lblVal = lblInput ? lblInput.value.trim() : "";
          const nmVal = nmInput
            ? nmInput.value.trim()
            : "answer" + questionId + "_" + (mb + 1);
          const phVal = phInput ? phInput.value.trim() : "";
          if (lblVal) {
            formHTML += `<label><h3>${lblVal}</h3></label><br>`;
          }
          formHTML += `<input type="text" id="${nmVal}" name="${nmVal}" placeholder="${phVal}" style="text-align:center;"><br>`;
        }
        // Render amounts
        for (let ab = 0; ab < amountInputs.length; ab++) {
          const dEl = amountInputs[ab];
          const lblInput = dEl.querySelector(
            `#multipleAmountLabel${questionId}_${ab + 1}`
          );
          const nmInput = dEl.querySelector(
            `#multipleAmountName${questionId}_${ab + 1}`
          );
          const phInput = dEl.querySelector(
            `#multipleAmountPlaceholder${questionId}_${ab + 1}`
          );
          const lblVal = lblInput ? lblInput.value.trim() : "";
          const nmVal = nmInput
            ? nmInput.value.trim()
            : "amount" + questionId + "_" + (ab + 1);
          const phVal = phInput ? phInput.value.trim() : "";
          if (lblVal) {
            formHTML += `<label><h3>${lblVal}</h3></label><br>`;
          }
          formHTML += `<input type="number" id="${nmVal}" name="${nmVal}" placeholder="${phVal}" style="text-align:center;" pattern="[0-9]*" inputmode="numeric"><br>`;
        }
      } else if (questionType === "numberedDropdown") {
        const stEl = qBlock.querySelector("#numberRangeStart" + questionId);
        const enEl = qBlock.querySelector("#numberRangeEnd" + questionId);
        const ddMin = stEl ? parseInt(stEl.value, 10) : 1;
        const ddMax = enEl ? parseInt(enEl.value, 10) : 1;

        // gather labels
        const lblInputs = qBlock.querySelectorAll(
          "#textboxLabels" + questionId + " input"
        );
        const labelVals = [];
        for (let L = 0; L < lblInputs.length; L++) {
          labelVals.push(lblInputs[L].value.trim());
        }
        labelMap[questionId] = labelVals;

        // gather amounts
        const amtInputs = qBlock.querySelectorAll(
          "#textboxAmounts" + questionId + " input[type='text']"
        );
        const amountVals = [];
        for (let A = 0; A < amtInputs.length; A++) {
          amountVals.push(amtInputs[A].value.trim());
        }
        amountMap[questionId] = amountVals;

        // Then build the dropdown
        questionNameIds[questionId] = "answer" + questionId;
        formHTML += `<select id="answer${questionId}" onchange="showTextboxLabels(${questionId}, this.value)">
                       <option value="" disabled selected>Select an option</option>`;
        for (let rnum = ddMin; rnum <= ddMax; rnum++) {
          formHTML += `<option value="${rnum}">${rnum}</option>`;
        }
        formHTML += `</select><br><div id="labelContainer${questionId}"></div>`;
      }

      // end question container
      formHTML += "</div>";

      // If logic is enabled, gather "multiple-OR" conditions
      if (logicEnabled) {
        const logicRows = qBlock.querySelectorAll(".logic-condition-row");
        if (logicRows.length > 0) {
          logicScriptBuffer += `\n(function(){\n`;
          logicScriptBuffer += ` var thisQ=document.getElementById("question-container-${questionId}");\n`;
          logicScriptBuffer += ` function updateVisibility(){\n  var anyMatch=false;\n`;

          for (let lr = 0; lr < logicRows.length; lr++) {
            const row = logicRows[lr];
            const rowIndex = lr + 1;
            const pqEl = row.querySelector(
              "#prevQuestion" + questionId + "_" + rowIndex
            );
            const paEl = row.querySelector(
              "#prevAnswer" + questionId + "_" + rowIndex
            );

            if (!pqEl || !paEl) continue;
            const pqVal = pqEl.value.trim();
            const paVal = paEl.value.trim().toLowerCase();
            if (!pqVal || !paVal) continue;

            const pType = questionTypesMap[pqVal] || "text";

            logicScriptBuffer += `  (function(){\n`;
            logicScriptBuffer += `    var cPrevType="${pType}";\n`;
            logicScriptBuffer += `    var cPrevAns="${paVal}";\n`;
            logicScriptBuffer += `    var cPrevQNum="${pqVal}";\n`;
            logicScriptBuffer += `    if(cPrevType==="checkbox"){\n`;
            logicScriptBuffer += `      var cbPrefix = getCbPrefix(cPrevQNum);\n`;
			

            logicScriptBuffer += `      var cbs=document.querySelectorAll('input[id^="'+cbPrefix+'"]');\n`;
            logicScriptBuffer += `      var checkedVals=[];\n`;
            logicScriptBuffer += `      for(var cc=0; cc<cbs.length; cc++){ if(cbs[cc].checked) checkedVals.push(cbs[cc].value.trim().toLowerCase());}\n`;
            logicScriptBuffer += `      if(checkedVals.indexOf(cPrevAns)!==-1){ anyMatch=true;}\n`;
            logicScriptBuffer += `    } else {\n`;
            logicScriptBuffer += `      var el2=document.getElementById(questionNameIds[cPrevQNum]) || document.getElementById("answer"+cPrevQNum);\n`;
            // Special case for special options that check for presence rather than exact value
            if (paVal.toLowerCase() === "any text" || paVal.toLowerCase() === "any amount" || paVal.toLowerCase() === "any date") {
              logicScriptBuffer += `      if(el2){ var val2= el2.value.trim(); if(val2 !== ""){ anyMatch=true;} }\n`;
            } else {
              logicScriptBuffer += `      if(el2){ var val2= el2.value.trim().toLowerCase(); if(val2===cPrevAns){ anyMatch=true;} }\n`;
            }
            logicScriptBuffer += `    }\n`;
            logicScriptBuffer += `  })();\n`;
          }

          logicScriptBuffer += ` if(anyMatch){ thisQ.classList.remove("hidden"); } else { thisQ.classList.add("hidden"); }\n`;
          logicScriptBuffer += `}\n`;

          // attach event listeners
          for (let lr2 = 0; lr2 < logicRows.length; lr2++) {
            const row2 = logicRows[lr2];
            const rowIndex2 = lr2 + 1;
            const pqEl2 = row2.querySelector(
              "#prevQuestion" + questionId + "_" + rowIndex2
            );
            if (!pqEl2) continue;
            const pqVal2 = pqEl2.value.trim();
            if (!pqVal2) continue;

            const pType2 = questionTypesMap[pqVal2] || "text";
            if (pType2 === "checkbox") {
              logicScriptBuffer += ` (function(){\n`;
              // Use explicit question ID value rather than relying on variable scope
              logicScriptBuffer += `   var checkQuestion = "${pqVal2}";\n`;
              logicScriptBuffer += `   var cbs = document.querySelectorAll('input[id^="' + getCbPrefix(checkQuestion) + '"]');\n`;
              logicScriptBuffer += `   for(var i=0;i<cbs.length;i++){ cbs[i].addEventListener("change", function(){ updateVisibility();});}\n`;
              logicScriptBuffer += ` })();\n`;
            } else if (pType2 === "dropdown" || pType2 === "radio" || pType2 === "numberedDropdown") {
              // Use "change" event for select elements (dropdown, radio) instead of "input"
              logicScriptBuffer += ` (function(){\n`;
              // Use explicit question ID reference
              logicScriptBuffer += `   var selectQuestion = "${pqVal2}";\n`;
              // IMPORTANT: Try questionNameIds first, then fallback to default naming
              logicScriptBuffer += `   var el3= document.getElementById(questionNameIds[selectQuestion]) || document.getElementById("answer"+selectQuestion);\n`;
              logicScriptBuffer += `   if(el3){ el3.addEventListener("change", function(){ updateVisibility();});}\n`;
              logicScriptBuffer += ` })();\n`;
            } else {
              // Use "input" event for text fields
              logicScriptBuffer += ` (function(){\n`;
              // Use explicit question ID reference
              logicScriptBuffer += `   var textQuestion = "${pqVal2}";\n`;
              // IMPORTANT: Try questionNameIds first, then fallback to default naming
              logicScriptBuffer += `   var el3= document.getElementById(questionNameIds[textQuestion]) || document.getElementById("answer"+textQuestion);\n`;
              logicScriptBuffer += `   if(el3){ el3.addEventListener("input", function(){ updateVisibility();});}\n`;
              logicScriptBuffer += ` })();\n`;
            }
          }

          logicScriptBuffer += ` updateVisibility();\n`;
          logicScriptBuffer += `})();\n`;
        }
      }
    } // end each question

    // Section nav
    formHTML += '<br><br><div class="navigation-buttons">';
if (s > 1){
    /* OLD:  <button type="button" onclick="navigateSection('+ (s-1) +')">Back</button> */
    formHTML += '<button type="button" onclick="goBack()">Back</button>';
}

    if (s === sectionCounter - 1) {
      formHTML += `<button type="submit">Submit</button>`;
    } else {
      formHTML += `<button type="button" onclick="handleNext(${s})">Next</button>`;
    }
    formHTML += "</div>";

    formHTML += "</div>"; // end this section
  }

  // Insert hidden fields (including multi-term calculations)
  const genHidden = generateHiddenPDFFields();
  formHTML += genHidden.hiddenFieldsHTML;

  // Close the form & add the thank-you message
  formHTML += [
    "</form>",
    '<div id="thankYouMessage" class="thank-you-message">Thank you for completing the survey<br><br><button onclick="processAllPdfs()" style="font-size: 1.2em;">Download PDF</button><br><br><button onclick="window.location.href=\'forms.html\'" style="font-size: 1.2em;">Exit Survey</button></div>',
    "</div>",
    "</section>",
    "</div>",
    "<footer>",
    "    &copy; 2024 FormWiz. All rights reserved.",
    "</footer>",
  ].join("\n");

  // Now we place ONE <script> block for everything:
  formHTML += "\n<script>\n";
  
 formHTML += `
/*───────────────────────────────*
 * return the true checkbox prefix
 *───────────────────────────────*/
function getCbPrefix (qId){
    if (questionSlugMap[qId]) return questionSlugMap[qId] + '_';
    if (questionNameIds[qId]) return questionNameIds[qId] + '_';
    return 'answer' + qId + '_';
}

/*───────────────────────────────*
 * buildCheckboxName(questionId, rawNameId, labelText)
 *───────────────────────────────*/
function buildCheckboxName (questionId, rawNameId, labelText){
    const slugPrefix = (questionSlugMap[questionId] || ('answer' + questionId)) + '_';
    let namePart = (rawNameId || '').trim();
    if (!namePart){
        namePart = labelText.replace(/\\W+/g, '_').toLowerCase();
    }
    if (!namePart.startsWith(slugPrefix)){
        namePart = slugPrefix + namePart;
    }
    return namePart;
}
`;



  // 1) Firebase config and check
  formHTML += `
    let isUserLoggedIn = false;
    const firebaseConfig = {
        apiKey: "AIzaSyDS-tSSn7fdLBgwzfHQ_1MPG1w8S_4qb04",
        authDomain: "formwiz-3f4fd.firebaseapp.com",
        projectId: "formwiz-3f4fd",
        storageBucket: "formwiz-3f4fd.appspot.com",
        messagingSenderId: "404259212529",
        appId: "1:404259212529:web:15a33bce82383b21cfed50",
        measurementId: "G-P07YEN0HPD"
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const urlParams = new URLSearchParams(window.location.search);
    const formId = urlParams.get("formId");
    let userId = null;
    firebase.auth().onAuthStateChanged(async function(user){
        if(user){ 
            isUserLoggedIn = true;
            userId=user.uid;
            // Fetch user data and display welcome message
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if(userDoc.exists) {
                    const userData = userDoc.data();
                    document.getElementById('user_firstname').value = userData.firstName || '';
                    document.getElementById('user_lastname').value = userData.lastName || '';
                    document.getElementById('user_email').value = userData.email || '';
                    document.getElementById('user_phone').value = userData.phone || '';
                    document.getElementById('user_street').value = userData.address?.street || '';
                    document.getElementById('user_city').value = userData.address?.city || '';
                    document.getElementById('user_state').value = userData.address?.state || '';
                    document.getElementById('user_zip').value = userData.address?.zip || '';
                }
            } catch(error) {
                console.error("Error fetching user data:", error);
            }
        } else {
            isUserLoggedIn = false;
            // Do NOT redirect. Just let the user fill the form.
        }
    });
  `;

  // 2) Our global objects
  formHTML += `var questionSlugMap       = ${JSON.stringify(questionSlugMap)};\n`;
  formHTML += `var questionNameIds = ${JSON.stringify(questionNameIds)};\n`;
  formHTML += `var jumpLogics = ${JSON.stringify(jumpLogics)};\n`;
  formHTML += `var conditionalPDFs = ${JSON.stringify(conditionalPDFs)};\n`;
  formHTML += `var conditionalAlerts = ${JSON.stringify(conditionalAlerts)};\n`;
  formHTML += `var labelMap = ${JSON.stringify(labelMap)};\n`;
  formHTML += `var amountMap = ${JSON.stringify(amountMap)};\n`;
  formHTML += `var linkedDropdowns = ${JSON.stringify(linkedDropdowns)};\n`;
  
  /*---------------------------------------------------------------
 * HISTORY STACK – must exist in the final HTML before functions
 *--------------------------------------------------------------*/
/*---------------------------------------------------------------
 * HISTORY STACK – must exist in the final HTML before functions
 *--------------------------------------------------------------*/
formHTML += `var sectionStack = [];\n`;      // pushes as you LEAVE a section
formHTML += `var currentSectionNumber = 1;\n`;  // updated by navigateSection()
formHTML += `var pdfFileName = "${escapedPdfFormName}";\n`;  // Main PDF name
formHTML += `var pdfOutputFileName = "${escapedPdfOutputName}";\n`; // Output file name
formHTML += `var stripePriceId = "${escapedStripePriceId}";\n`; // Stripe Price ID
formHTML += `var additionalPdfFileNames = ${JSON.stringify(escapedAdditionalPdfNames)};\n`;  // Additional PDF names
formHTML += `var allPdfFileNames = ["${escapedPdfFormName}", ${escapedAdditionalPdfNames.map(name => `"${name}"`).join(", ")}];\n`;  // All PDF names in an array





  formHTML += `var hiddenCheckboxCalculations = ${JSON.stringify(
    genHidden.hiddenCheckboxCalculations || []
  )};\n`;
  formHTML += `var hiddenTextCalculations = ${JSON.stringify(
    genHidden.hiddenTextCalculations || []
  )};\n\n`;

  // 3) Append the logicScriptBuffer
  formHTML += logicScriptBuffer + "\n";

  // 4) The rest of the main JS code
  formHTML += `
  
  
  function sanitizeQuestionText (str){
    return String(str)
       .toLowerCase()
        .replace(/\\W+/g, "_")   // ← double "\\" so the HTML gets "\\W"
        .replace(/^_+|_+$/g, "");
}

// Phone number formatter function
function formatPhoneNumber(value) {
  if (!value) return value;
  
  const phoneNumber = value.replace(/\\D/g, '');
  const phoneNumberLength = phoneNumber.length;
  
  if (phoneNumberLength < 4) {
    return phoneNumberLength > 0 ? '(' + phoneNumber : '';
  } else if (phoneNumberLength < 7) {
    return '(' + phoneNumber.substring(0, 3) + ') ' + phoneNumber.substring(3);
  } else {
    return '(' + phoneNumber.substring(0, 3) + ') ' + 
           phoneNumber.substring(3, 6) + '-' + 
           phoneNumber.substring(6, 10);
  }
}

// Initialize all phone inputs on the page
document.addEventListener('DOMContentLoaded', function() {
  const phoneInputs = document.querySelectorAll('.phone-input');
  
  phoneInputs.forEach(phoneInput => {
    // Format existing value if any
    if (phoneInput.value) {
      phoneInput.value = formatPhoneNumber(phoneInput.value);
    }
    
    // Set up event listener for input
    phoneInput.addEventListener('input', function(e) {
      const input = e.target;
      const value = input.value.replace(/\\D/g, '').substring(0, 10); // Strip non-digits and limit to 10 digits
      input.value = formatPhoneNumber(value);
    });
  });
});


function toggleAmountField(amountFieldId, show) {
    const amountField = document.getElementById(amountFieldId);
    if (amountField) {
        amountField.style.display = show ? 'block' : 'none';
        if (!show) amountField.value = '';
    }
}

/*──────────────────────────────────────────────────────────────*
 * Handle "None of the above" checkbox functionality
 *──────────────────────────────────────────────────────────────*/
function toggleNoneOption(checkbox, questionId) {
    if (!checkbox.checked) return;

    // Find the "None of the above" checkbox using more robust selectors
    const cbPrefix = getCbPrefix(questionId);
    const noneCheckbox = document.querySelector('input[id="' + cbPrefix + 'none"]') || 
                         document.querySelector('input[id^="' + cbPrefix + '"][id$="_none"]');
                         
    if (noneCheckbox && noneCheckbox.checked) {
        // Uncheck the "None of the above" option when any other option is checked
        noneCheckbox.checked = false;
    }
}

function handleNoneOfTheAboveToggle(noneCheckbox, questionId) {
    if (!noneCheckbox.checked) return;
    
    // When "None of the above" is checked, uncheck all other options
    const container = document.querySelector('.checkbox-group-' + questionId);
    if (!container) return;
    
    const allCheckboxes = container.querySelectorAll('input[type="checkbox"]');
    allCheckboxes.forEach(checkbox => {
        // Skip the "None" checkbox itself
        const isNoneCheckbox = checkbox.id.endsWith('_none') || checkbox.id.endsWith('none');
        if (checkbox !== noneCheckbox && !isNoneCheckbox) {
            checkbox.checked = false;
            
            // If this checkbox has an amount field, hide it
            const amountId = checkbox.id + '_amount';
            toggleAmountField(amountId, false);
        }
    });
}


function showTextboxLabels(questionId, count){
    const container = document.getElementById("labelContainer" + questionId);
    if(!container) return;

    container.innerHTML = "<br>";
    const theseLabels   = labelMap[questionId]   || [];
    const theseAmounts  = amountMap[questionId]  || [];

    /* get and sanitise the question's visible text exactly once */
    const questionH3   = document
        .getElementById("question-container-" + questionId)
        ?.querySelector("h3")?.textContent || ("answer" + questionId);
    const qSafe = sanitizeQuestionText(questionH3);

    for(let j = 1; j <= count; j++){
        /* label inputs */
        for(const lbl of theseLabels){
            const id = qSafe + "_" + j + "_" + sanitizeQuestionText(lbl);
            container.innerHTML +=
              '<input type="text" id="' + id + '" name="' + id + '" placeholder="' + lbl + ' ' + j + '" style="text-align:center;"><br>';
        }
        /* amount inputs */
        for(const amt of theseAmounts){
            const id = qSafe + "_" + j + "_" + sanitizeQuestionText(amt);
            container.innerHTML +=
              '<input type="number" id="' + id + '" name="' + id + '" placeholder="' + amt + ' ' + j + '" style="text-align:center;"><br>';
        }
        container.innerHTML += "<br>";
    }
    attachCalculationListeners();   // keep this
}


// Handle linked dropdown logic
function handleLinkedDropdowns(sourceName, selectedValue) {
    if (!linkedDropdowns || linkedDropdowns.length === 0 || isHandlingLink) return;
    
    try {
        isHandlingLink = true;  // Set flag before handling links
        
        linkedDropdowns.forEach(linkPair => {
            if (linkPair.sourceNameId === sourceName) {
                const targetDropdown = document.getElementById(linkPair.targetNameId);
                if (targetDropdown && targetDropdown.value !== selectedValue) {  // Only if value is different
                    let optionExists = false;
                    for (let i = 0; i < targetDropdown.options.length; i++) {
                        if (targetDropdown.options[i].value === selectedValue) {
                            optionExists = true;
                            targetDropdown.value = selectedValue;
                            // Trigger change event only if value actually changed
                            const event = new Event('change');
                            targetDropdown.dispatchEvent(event);
                            break;
                        }
                    }
                    
                    if (!optionExists && selectedValue) {
                        console.warn("Option '" + selectedValue + "' does not exist in linked dropdown " + linkPair.targetNameId);
                    }
                }
            }
            else if (linkPair.targetNameId === sourceName) {
                const sourceDropdown = document.getElementById(linkPair.sourceNameId);
                if (sourceDropdown && sourceDropdown.value !== selectedValue) {  // Only if value is different
                    let optionExists = false;
                    for (let i = 0; i < sourceDropdown.options.length; i++) {
                        if (sourceDropdown.options[i].value === selectedValue) {
                            optionExists = true;
                            sourceDropdown.value = selectedValue;
                            // Trigger change event only if value actually changed
                            const event = new Event('change');
                            sourceDropdown.dispatchEvent(event);
                            break;
                        }
                    }
                    
                    if (!optionExists && selectedValue) {
                        console.warn("Option '" + selectedValue + "' does not exist in linked dropdown " + linkPair.sourceNameId);
                    }
                }
            }
        });
    } finally {
        isHandlingLink = false;  // Always reset flag when done
    }
}

/*──────── mirror a dropdown → textbox and checkbox ────────*/
function dropdownMirror(selectEl, baseName){
    const wrap = document.getElementById("dropdowntext_"+baseName);
    if(!wrap) return;

    const val = selectEl.value.trim();
    if(!val) {
        wrap.innerHTML = "";
        return;
    }

    const textId = baseName + "_dropdown";
    const textField = document.getElementById(textId);
    
    if(textField) {
        textField.value = val;
        textField.style.display = "none";
    }

    const existingCheckboxes = wrap.querySelectorAll("div");
    existingCheckboxes.forEach(div => div.remove());

    const idSuffix = val.replace(/\\W+/g, "_").toLowerCase();
    const checkboxId = baseName + "_" + idSuffix;
    
    const checkboxDiv = document.createElement("div");
    checkboxDiv.style.display = "none";
    checkboxDiv.innerHTML = "<input type='checkbox' id='" + checkboxId + "' name='" + checkboxId + "' checked>" +
                     "<label for='" + checkboxId + "'> " + baseName + "_" + idSuffix + "</label>";
    
    wrap.appendChild(checkboxDiv);
    handleLinkedDropdowns(baseName, val);
}

function getQuestionInputs (questionId, type = null) {
  /* 1️⃣ First look inside the question container, if it exists */
  const container = document.getElementById('question-container-' + questionId);
  if (container) {
    return container.querySelectorAll(
      type ? 'input[type="' + type + '"]' : 'input, select, textarea'
    );
  }

  /* 2️⃣ Fallback to the old prefix‑style that your generator sometimes uses */
  const prefix = 'input[id^="' + getCbPrefix(questionId) + '"]';

  return document.querySelectorAll(
    type ? prefix + '[type="' + type + '"]' : prefix + ', select[id^="answer' + questionId + '"]'
  );
}

/*------------------------------------------------------------------
 *  handleNext(currentSection)
 *  – pushes the section you are leaving and works out where to go
 *-----------------------------------------------------------------*/
function handleNext(currentSection){
    runAllHiddenCheckboxCalculations();
    runAllHiddenTextCalculations();

    /* remember the place we're leaving */
    sectionStack.push(currentSection);

    let nextSection = currentSection + 1;

    /* ---------- evaluate jump rules ---------- */
    const relevantJumps = jumpLogics.filter(jl => jl.section === currentSection);
    for (const jl of relevantJumps){
        const nmId = questionNameIds[jl.questionId] || ('answer'+jl.questionId);

        if (['radio','dropdown','numberedDropdown'].includes(jl.questionType)){
            const el = document.getElementById(nmId);
            if (el && el.value.trim().toLowerCase() === jl.jumpOption.trim().toLowerCase()){
                nextSection = jl.jumpTo.toLowerCase();
                break;
            }
        } else if (jl.questionType === 'checkbox'){
            const cbs = getQuestionInputs(jl.questionId, 'checkbox');
            const chosen = Array.from(cbs).filter(cb=>cb.checked)
                                .map(cb=>cb.value.trim().toLowerCase());
            if (chosen.includes(jl.jumpOption.trim().toLowerCase())){
                nextSection = jl.jumpTo.toLowerCase();
                break;
            }
        }
    }

    /* ---------- special "end" shortcut ---------- */
    if (nextSection === 'end'){
        processAllPdfs().then(()=>navigateSection('end'));
        return;
    }

    nextSection = parseInt(nextSection,10);
    if (isNaN(nextSection)) nextSection = currentSection + 1;
    navigateSection(nextSection);

    /* recalc hidden fields after navigation */
    runAllHiddenCheckboxCalculations();
    runAllHiddenTextCalculations();
}


/*------------------------------------------------------------------
 *  navigateSection(sectionNumber)
 *  – shows exactly one section (or Thank‑you) and records history
 *-----------------------------------------------------------------*/



function navigateSection(sectionNumber){
    const sections  = document.querySelectorAll('.section');
    const form      = document.getElementById('customForm');
    const thankYou  = document.getElementById('thankYouMessage');

    /* hide everything first */
    sections.forEach(sec => sec.classList.remove('active'));
    thankYou.style.display = 'none';
    form.style.display     = 'block';

    if (sectionNumber === 'end'){
        form.style.display   = 'none';
        thankYou.style.display = 'block';
        currentSectionNumber = 'end';
        updateProgressBar();
        return;
    }

    /* ── corrected bounds check ────────────────────────────── */
    const maxSection = sections.length;   // 1‑based section numbers
    if (sectionNumber < 1)           sectionNumber = 1;
    if (sectionNumber > maxSection)  sectionNumber = maxSection;

    /* show the requested section */
    const target = document.getElementById('section' + sectionNumber);
    (target || sections[maxSection - 1]).classList.add('active');

    currentSectionNumber = sectionNumber;
    updateProgressBar();
}



/*------------------------------------------------------------------
 *  goBack()
 *  – pops the history stack; falls back to numeric −1 if empty
 *-----------------------------------------------------------------*/
function goBack(){
    if (sectionStack.length > 0){
        const prev = sectionStack.pop();
        navigateSection(prev);
    }else if (typeof currentSectionNumber === 'number' && currentSectionNumber > 1){
        navigateSection(currentSectionNumber - 1);
    }
    updateProgressBar();
}


/*──────────────── helpers ───────────────*/
function setCurrentDate () {
    const t = new Date();
    document.getElementById('current_date').value =
        t.getFullYear() + '-' +
        String(t.getMonth() + 1).padStart(2, '0') + '-' +
        String(t.getDate()).padStart(2, '0');
}





window.onload=function(){
    setCurrentDate();
    attachCalculationListeners();
};

function handleConditionalAlerts(){
    for(var i=0; i<conditionalAlerts.length; i++){
        var obj = conditionalAlerts[i];
        var prevQEl= document.getElementById("answer"+obj.prevQuestionId);
        if(prevQEl){
            if(prevQEl.value.trim().toLowerCase() === obj.prevAnswer.trim().toLowerCase()){
                alert(obj.alertText);
            }
        } else {
            var cbs= document.querySelectorAll('[name^="answer'+obj.prevQuestionId+'_"]');
            for(var x=0; x<cbs.length; x++){
                if(cbs[x].checked && cbs[x].value.trim().toLowerCase()=== obj.prevAnswer.trim().toLowerCase()){
                    alert(obj.alertText);
                }
            }
        }
    }
}

/*──── main submit handler ────*/
function showThankYouMessage () {
    processAllPdfs().then(() => {
        document.getElementById('customForm').style.display = 'none';
        document.getElementById('thankYouMessage').style.display = 'block';
    });
    return false;                       // prevent page reload
}

/*──── process all PDFs sequentially ────*/
async function processAllPdfs() {
    for (const pdfName of allPdfFileNames) {
        if (pdfName) {
            await editAndDownloadPDF(pdfName);
        }
    }
}

/*──── build FormData with **everything inside the form** ────*/
async function editAndDownloadPDF (pdfName) {
    /* this grabs every control that belongs to <form id="customForm">,
       including those specified with form="customForm" attributes   */
    const fd = new FormData(document.getElementById('customForm'));

    // Use the /edit_pdf endpoint with the PDF name as a query parameter
    // Remove the .pdf extension if present since server adds it automatically
    const baseName = pdfName.replace(/\.pdf$/i, '');
    const res = await fetch('/edit_pdf?pdf=' + encodeURIComponent(baseName), { 
        method: 'POST', 
        body: fd 
    });
    
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    // trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Edited_' + pdfName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // inline preview - only show the last one
    const frame = document.getElementById('pdfFrame');
    frame.src = url;
    frame.style.display = 'block';
    document.getElementById('pdfPreview').style.display = 'none';
}


/***********************************************
 * Hidden Checkbox Calculations
 ***********************************************/
function runAllHiddenCheckboxCalculations(){
    if(!hiddenCheckboxCalculations || hiddenCheckboxCalculations.length===0) return;
    for(var i=0; i<hiddenCheckboxCalculations.length; i++){
        runSingleHiddenCheckboxCalculation(hiddenCheckboxCalculations[i]);
    }
}

function runSingleHiddenCheckboxCalculation(calcObj){
    var cbox = document.getElementById(calcObj.hiddenFieldName);
    if(!cbox) return;  // hidden field not found

    var finalState = cbox.checked;  // start with default

    // Evaluate each multi-term condition in 'calculations'
    for(var c=0; c<calcObj.calculations.length; c++){
        var oneCalc = calcObj.calculations[c];
        var val = 0;

        // Sum up the terms
        if(oneCalc.terms && oneCalc.terms.length>0){
            val = parseFloat( getMoneyValue(oneCalc.terms[0].questionNameId) )||0;
            for(var t=1; t<oneCalc.terms.length; t++){
                var term = oneCalc.terms[t];
                var op   = term.operator||'';
                var nextVal = parseFloat(getMoneyValue(term.questionNameId))||0;

                if(op==='+') val += nextVal;
                else if(op==='-') val -= nextVal;
                else if(op==='x') val *= nextVal;
                else if(op==='/'){
                    if(nextVal!==0) val /= nextVal;
                    else val=0;
                }
            }
        }

        // Compare val to threshold
        var thr = parseFloat(oneCalc.threshold)||0;
        var matched = false;
        if(oneCalc.compareOperator==='=') matched = (val===thr);
        else if(oneCalc.compareOperator==='<') matched = (val<thr);
        else if(oneCalc.compareOperator==='>') matched = (val>thr);

        // If matched, set final state
        if(matched){
            finalState = (oneCalc.result==='checked');
        }
    }

    // Set the hidden checkbox state
    cbox.checked = finalState;
}


/***********************************************
 * Hidden Text Calculations (with placeholders)
 ***********************************************/
function runAllHiddenTextCalculations(){
    if(!hiddenTextCalculations || hiddenTextCalculations.length===0) return;
    for(var i=0; i<hiddenTextCalculations.length; i++){
        runSingleHiddenTextCalculation(hiddenTextCalculations[i]);
    }
}

/**
 * Evaluate each multi-term calculation and set the hidden text field.
 * If fillValue format is "##fieldName##", we store the numeric sum of the terms
 * using the field's own name (or any other field name).
 */
function runSingleHiddenTextCalculation(calcObj) {
    const textField = document.getElementById(calcObj.hiddenFieldName);
    if (!textField) return;

    // We'll assume that the last matched condition takes precedence
    let finalValue = "";

    calcObj.calculations.forEach(function(oneCalc) {
        let val = 0;
        
        // Calculate the sum of all terms
        if (oneCalc.terms && oneCalc.terms.length > 0) {
            // Get the first term's value
            const firstTerm = oneCalc.terms[0];
            val = parseFloat(getMoneyValue(firstTerm.questionNameId)) || 0;

            // Process remaining terms
            for (let t = 1; t < oneCalc.terms.length; t++) {
                const term = oneCalc.terms[t];
                const termVal = parseFloat(getMoneyValue(term.questionNameId)) || 0;

                switch(term.operator) {
                    case '+': val += termVal; break;
                    case '-': val -= termVal; break;
                    case 'x': val *= termVal; break;
                    case '/': val = termVal !== 0 ? val / termVal : 0; break;
                }
            }
        }

        // Compare to threshold
        const threshold = parseFloat(oneCalc.threshold) || 0;
        let matched = false;

        switch(oneCalc.compareOperator) {
            case '>': matched = val > threshold; break;
            case '<': matched = val < threshold; break;
            case '=': matched = Math.abs(val - threshold) < 0.000001; break; // Use epsilon for float comparison
        }

        if (matched) {
            // Handle special fillValue formats
            if (oneCalc.fillValue === "##total##" || oneCalc.fillValue.match(/^##(.+)##$/)) {
                finalValue = val.toFixed(2); // Format money values with 2 decimal places
            } else {
                finalValue = oneCalc.fillValue;
            }
        }
    });

    // Update the text field
    textField.value = finalValue;
}

function replacePlaceholderTokens (str){
    /* note the doubled back-slashes in the delimiters \$\$ */
    return str.replace(/\\$\\$(.*?)\\$\\$/g, function (_match, innerExpr){
        return evaluatePlaceholderExpression(innerExpr);
    });
}

function evaluatePlaceholderExpression (exprString){
    /* split on +  -  x  /   (all kept as separate tokens) */
    var tokens = exprString.split(/([+\-x\/])/);          // ← every \ is **doubled**
    if (!tokens.length) return '0';

    var currentVal = parseTokenValue(tokens[0]);
    for (var i = 1; i < tokens.length; i += 2){
        var op   = tokens[i];
        var next = parseTokenValue(tokens[i + 1] || '0');

        if      (op === '+') currentVal += next;
        else if (op === '-') currentVal -= next;
        else if (op === 'x') currentVal *= next;
        else if (op === '/') currentVal  = next !== 0 ? currentVal / next : 0;
    }
    return currentVal.toString();
}

function parseTokenValue(token){
    token = token.trim();
    if(!token) return 0;
    var el= document.getElementById(token);
    if(!el) return 0;
    var val= parseFloat(el.value);
    return isNaN(val) ? 0 : val;
}

/*───────────────────────────────────────────────────────────────*
 * 3.  getMoneyValue(qId)
 *     – tiny regex fix so legacy "amountX_Y_Z" can still resolve
 *       (note the escaped \\d+ instead of stray 'd').
 *───────────────────────────────────────────────────────────────*/
function getMoneyValue(qId) {
    /* direct hit first */
    const el = document.getElementById(qId);
    if (el) {
        if (el.type === "checkbox") {
            const amt = document.getElementById(el.id + "_amount");
            if (amt && el.checked) return parseFloat(amt.value) || 0;
            return el.checked ? 1 : 0;
        }
        return parseFloat(el.value) || 0;
    }

    /* legacy builder‑shorthand amountX_Y_Z */
    if (/^amount\d+_\d+_.+/.test(qId)) {
        const el2 = document.getElementById(normaliseDesignerFieldRef(qId));
        if (el2) return parseFloat(el2.value) || 0;
    }

    /* name‑attribute fallback */
    const byName = document.getElementsByName(qId);
    if (byName.length) return parseFloat(byName[0].value) || 0;

    return 0;
}




function attachCalculationListeners() {
    // Universal function to attach listeners in a consistent way
    function attachListenersToCalculationTerms(calculations, runCalculationFunction) {
        for (let i = 0; i < calculations.length; i++) {
            const calcObj = calculations[i];
            for (let c = 0; c < calcObj.calculations.length; c++) {
                const oneCalc = calcObj.calculations[c];
                const terms = oneCalc.terms || [];
                
                for (let t = 0; t < terms.length; t++) {
                    const qNameId = terms[t].questionNameId;
                    
                    // 1. Try direct element
                    const el = document.getElementById(qNameId);
                    if (el) {
                        el.addEventListener('change', runCalculationFunction);
                        el.addEventListener('input', runCalculationFunction);
                        
                        // If it's a checkbox, also listen to its amount field
                        if (el.type === 'checkbox') {
                            const amountField = document.getElementById(el.id + '_amount');
                            if (amountField) {
                                amountField.addEventListener('input', runCalculationFunction);
                            }
                        }
                        continue; // Found and attached, go to next term
                    }
                    
                    // 2. Try elements with this name
                    const namedElements = document.getElementsByName(qNameId);
                    if (namedElements.length > 0) {
                        for (let n = 0; n < namedElements.length; n++) {
                            namedElements[n].addEventListener('change', runCalculationFunction);
                            namedElements[n].addEventListener('input', runCalculationFunction);
                        }
                        continue;
                    }
                    
                    // 3. Look for prefixed IDs like "answerX_qId"
                    const prefixPattern = new RegExp('.*_' + qNameId + '$');
                    const allInputs = document.querySelectorAll('input, select, textarea');
                    
                    for (let inp = 0; inp < allInputs.length; inp++) {
                        const input = allInputs[inp];
                        if (prefixPattern.test(input.id)) {
                            input.addEventListener('change', runCalculationFunction);
                            input.addEventListener('input', runCalculationFunction);
                            
                            // If it's a checkbox with amount field
                            if (input.type === 'checkbox') {
                                const amountField = document.getElementById(input.id + '_amount');
                                if (amountField) {
                                    amountField.addEventListener('input', runCalculationFunction);
                                }
                            }
                        }
                    }
                    
                    // 4. Look specifically for amount fields with this name
                    const amountElements = document.querySelectorAll('input[name="' + qNameId + '"]');
                    for (let a = 0; a < amountElements.length; a++) {
                        amountElements[a].addEventListener('input', runCalculationFunction);
                        
                        // Also find and attach to the controlling checkbox
                        if (amountElements[a].id.includes('_amount')) {
                            const checkboxId = amountElements[a].id.replace('_amount', '');
                            const checkbox = document.getElementById(checkboxId);
                            if (checkbox) {
                                checkbox.addEventListener('change', runCalculationFunction);
                            }
                        }
                    }
                    
                    // 5. Try direct amount field
                    const directAmountField = document.getElementById(qNameId + '_amount');
                    if (directAmountField) {
                        directAmountField.addEventListener('input', runCalculationFunction);
                        
                        // Find the checkbox controlling this amount field
                        const checkboxSelector = 'input[type="checkbox"][onchange*="' + directAmountField.id + '"]';
                        const checkbox = document.querySelector(checkboxSelector);
                        if (checkbox) {
                            checkbox.addEventListener('change', runCalculationFunction);
                        }
                    }
                }
            }
        }
    }
    
    // For hidden checkbox calculations
    if (hiddenCheckboxCalculations && hiddenCheckboxCalculations.length > 0) {
        const runAllCheckboxCalcs = function() {
            runAllHiddenCheckboxCalculations();
        };
        attachListenersToCalculationTerms(hiddenCheckboxCalculations, runAllCheckboxCalcs);
    }
    
    // For hidden text calculations
    if (hiddenTextCalculations && hiddenTextCalculations.length > 0) {
        const runAllTextCalcs = function() {
            runAllHiddenTextCalculations();
        };
        attachListenersToCalculationTerms(hiddenTextCalculations, runAllTextCalcs);
    }
    
    // Run calculations once on page load to set initial values
    runAllHiddenCheckboxCalculations();
    runAllHiddenTextCalculations();
}

// Progress Bar Logic
function updateProgressBar() {
  // Stepper logic
  const stepper = document.getElementById('stepperProgressBar');
  if (!stepper) return;
  const steps = stepper.querySelectorAll('.stepper-step');
  let activeStep = 1;
  if (typeof currentSectionNumber === 'number') {
    activeStep = currentSectionNumber;
  } else if (currentSectionNumber === 'end') {
    activeStep = steps.length;
  }
  steps.forEach((step, idx) => {
    step.classList.remove('active', 'completed');
    if (idx + 1 < activeStep) {
      step.classList.add('completed');
    } else if (idx + 1 === activeStep) {
      step.classList.add('active');
    }
  });
  // Animate lines between completed steps
  const lines = stepper.querySelectorAll('.stepper-line');
  lines.forEach((line, idx) => {
    if (idx < activeStep - 1) {
      line.classList.add('filled');
    } else {
      line.classList.remove('filled');
    }
  });
}

// Animate the progress bar fill width smoothly
function animateProgressBarFill(fillEl, targetPercent) {
  if (!fillEl) return;
  // Cancel any previous animation
  if (fillEl._progressAnimFrame) {
    cancelAnimationFrame(fillEl._progressAnimFrame);
    fillEl._progressAnimFrame = null;
  }
  const currentWidth = parseFloat(fillEl.style.width) || 0;
  const start = currentWidth;
  const end = targetPercent;
  const duration = 500; // ms, should match CSS transition
  const startTime = performance.now();

  function animate(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    // Use easeInOutCubic for a nice effect
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const newWidth = start + (end - start) * ease;
    fillEl.style.width = newWidth + '%';
    if (t < 1) {
      fillEl._progressAnimFrame = requestAnimationFrame(animate);
    } else {
      fillEl.style.width = end + '%';
      fillEl._progressAnimFrame = null;
    }
  }
  requestAnimationFrame(animate);
}

document.addEventListener('DOMContentLoaded', function() {
  updateProgressBar();
});

// Modal logic
function showLoginRequiredModal() {
  document.getElementById('loginRequiredModal').style.display = 'flex';
}
function hideLoginRequiredModal() {
  document.getElementById('loginRequiredModal').style.display = 'none';
}
document.addEventListener('DOMContentLoaded', function() {
  var backBtn = document.getElementById('modalBackBtn');
  var contBtn = document.getElementById('modalContinueBtn');
  if (backBtn) backBtn.onclick = hideLoginRequiredModal;
  if (contBtn) contBtn.onclick = function() {
    window.location.href = 'account.html';
  };
});

// Patch handleNext to check login before advancing
if (typeof handleNext === 'function') {
  var originalHandleNext = handleNext;
  window.handleNext = function(currentSection) {
    if (!isUserLoggedIn) {
      showLoginRequiredModal();
      return;
    }
    originalHandleNext(currentSection);
  };
}

// AUTOSAVE, RESTORE, AND WIPE LOGIC FOR ALL GENERATED FORMS
(function() {
    // Wait for Firebase and DOM
    function onReady(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }
    onReady(function() {
        if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) return;
        const db = firebase.firestore();
        const urlParams = new URLSearchParams(window.location.search);
        const formId = urlParams.get('formId') || window.formId || 'default';
        let userId = null;
        let isUserLoggedIn = false;

        // Stripe Keys - Placed within scope
        // WARNING: Using LIVE keys for local development is not recommended and will likely fail.
        const STRIPE_PUBLIC_KEY = 'pk_live_51RcD0sFJeSRMFQ8X5rliD5AD1etCL6QwozQjkmUoCG5iULUAqPLFjm4aejihXCZNjsQF1cfSVug5lXe0NKns1TEY00SWDPlDAz';
        // IMPORTANT: Replace this with the actual TEST Price ID for your product.
        const STRIPE_PRICE_ID = stripePriceId || 'price_1RcDedFJeSRMFQ8XmelYMbkc';

        // Helper: get all form fields to save
        function getFormFields() {
            const form = document.getElementById('customForm');
            if (!form) return [];
            return Array.from(form.elements).filter(el =>
                el.name &&
                !el.disabled &&
                ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) &&
                !['hidden', 'button', 'submit', 'reset'].includes(el.type)
            );
        }

        // Helper: save answers
        async function saveAnswers() {
            if (!isUserLoggedIn || !userId) return;
            const fields = getFormFields();
            const answers = {};
            fields.forEach(el => {
                if (el.type === 'checkbox' || el.type === 'radio') {
                    answers[el.name] = el.checked;
                } else {
                    answers[el.name] = el.value;
                }
            });
            await db.collection('users').doc(userId).collection('formAnswers').doc(formId).set(answers, { merge: true });
        }

        // Helper: load answers
        async function loadAnswers() {
            if (!isUserLoggedIn || !userId) return;
            try {
                const doc = await db.collection('users').doc(userId).collection('formAnswers').doc(formId).get();
                if (doc.exists) {
                    const data = doc.data();
                    const fields = getFormFields();
                    fields.forEach(el => {
                        if (data.hasOwnProperty(el.name)) {
                            if (el.type === 'checkbox' || el.type === 'radio') {
                                el.checked = !!data[el.name];
                            } else {
                                el.value = data[el.name];
                            }
                        }
                    });
                }
            } catch (e) {
                // ignore
            }
        }

        // Helper: wipe answers
        function wipeAnswers() {
            if (!isUserLoggedIn || !userId) return;
            db.collection('users').doc(userId).collection('formAnswers').doc(formId).delete();
        }

        // Attach listeners to all fields
        function attachAutosaveListeners() {
            const fields = getFormFields();
            fields.forEach(el => {
                el.addEventListener('input', saveAnswers);
                el.addEventListener('change', saveAnswers);
            });
        }
        

























        
        // Payment Modal Logic
        function showPaymentModal() {
            const modal = document.createElement('div');
            modal.id = 'stripe-payment-modal';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100vw';
            modal.style.height = '100vh';
            modal.style.background = 'rgba(44,62,80,0.45)';
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.zIndex = '99999';
            modal.innerHTML =
    '<div style="background:#fff; border-radius:12px; box-shadow:0 8px 32px rgba(44,62,80,0.18); padding:32px 28px 24px 28px; max-width:470px; width:90%; text-align:center; position:relative;">' +
      '<h2>Payment Required</h2>' +
      '<p>To download your completed PDF, please complete payment.</p>' +
      '<button id="stripeCheckoutBtn" style="background:linear-gradient(90deg,#4f8cff 0%,#38d39f 100%); color:#fff; border:none; border-radius:6px; padding:10px 28px; font-size:1.1em; font-weight:600; cursor:pointer;">Pay & Download</button>' +
      '<br><br>' +
      '<button id="cancelPaymentBtn" style="background:#e0e7ef; color:#2c3e50; border:none; border-radius:6px; padding:8px 22px; font-size:1em; font-weight:600; cursor:pointer;">Cancel</button>' +
    '</div>';

  document.body.appendChild(modal);

  document.getElementById('cancelPaymentBtn').onclick = () => {
    document.body.removeChild(modal);
  };
  document.getElementById('stripeCheckoutBtn').onclick = () => {
    startStripeCheckout();
  };
}


        async function startStripeCheckout() {
            await saveAnswers();
            const stripe = Stripe(STRIPE_PUBLIC_KEY);
            try {
                const response = await fetch('/create-checkout-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        priceId: STRIPE_PRICE_ID,
                        formId: formId
                    })
                });
                const data = await response.json();
                if (data.sessionId) {
                    stripe.redirectToCheckout({ sessionId: data.sessionId });
                } else {
                    alert('Error: Could not create payment session.');
                }
            } catch (error) {
                console.error('Payment Error:', error);
                alert('A payment error occurred. Please try again.');
            }
        }

        // On auth state change
        firebase.auth().onAuthStateChanged(function(user) {
            isUserLoggedIn = !!user;
            userId = user ? user.uid : null;
            if (isUserLoggedIn) {
                const params = new URLSearchParams(window.location.search);
                if (params.get('payment') === 'success') {
                    console.log('Payment successful! Processing PDF...');
                    loadAnswers().then(() => {
                        processAllPdfs().then(() => {
                            wipeAnswers();
                            window.history.replaceState({}, document.title, "/" + pdfOutputFileName);
                            navigateSection('end');
                        });
                    });
                } else {
                    loadAnswers().then(attachAutosaveListeners);
                }
            }
        });

        // On form submit
        const form = document.getElementById('customForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                showPaymentModal();
                return false;
            });
        }
    });
})();

</script>
</body>
</html>
`;

  // Finally, return the assembled HTML
  return formHTML;
}



/*───────────────────────────────────────────────────────────────*
 * 1.  normaliseDesignerFieldRef(raw)
 *     – unchanged except for two tiny regex tweaks (see comments)
 *───────────────────────────────────────────────────────────────*/
function normaliseDesignerFieldRef(raw) {
    raw = String(raw || "").trim();

    /* ① already a real element in the live DOM? */
    if (document.getElementById(raw)) return raw;

    /* ② looks like a finished slug already? */
    const mSlug = raw.match(/^([a-z0-9]+_[a-z0-9_]+?)_(\d+)_(.+)$/);
    if (mSlug && !/^amount\d+$/.test(mSlug[1]) && !/^answer\d+$/.test(mSlug[1]))
        return raw;

    /* ③ builder shorthand (amountX_Y_field  OR  answerX_Y_field) */
    const mShort =
        raw.match(/^amount(\d+)_(\d+)_(.+)$/) ||
        raw.match(/^answer(\d+)_(\d+)_(.+)$/);
    if (mShort) {
        const [, qId, idx, field] = mShort;
        const slug = questionSlugMap[qId] || ("answer" + qId);
        return `${slug}_${idx}_${sanitizeQuestionText(field)}`;
    }

    /* ④ catch‑all fallback */
    const mGeneric = raw.match(/^(.*)_(\d+)_(.+)$/);
    if (!mGeneric) return sanitizeQuestionText(raw);

    const [, qText, idx, field] = mGeneric;
    return `${sanitizeQuestionText(qText)}_${idx}_${sanitizeQuestionText(field)}`;
}



/*───────────────────────────────────────────────────────────────*
 * 2.  generateHiddenPDFFields()
 *     – now funnels every designer reference through
 *       normaliseDesignerFieldRef() so shorthand is fixed.
 *───────────────────────────────────────────────────────────────*/
function generateHiddenPDFFields() {
    let hiddenFieldsHTML = '<div id="hidden_pdf_fields">';

    /* profile fields … (unchanged) */
    hiddenFieldsHTML += `
<input type="hidden" id="user_firstname_hidden" name="user_firstname_hidden">
<input type="hidden" id="user_lastname_hidden"  name="user_lastname_hidden">
<input type="hidden" id="user_email_hidden"     name="user_email_hidden">
<input type="hidden" id="user_phone_hidden"     name="user_phone_hidden">
<input type="hidden" id="user_street_hidden"    name="user_street_hidden">
<input type="hidden" id="user_city_hidden"      name="user_city_hidden">
<input type="hidden" id="user_state_hidden"     name="user_state_hidden">
<input type="hidden" id="user_zip_hidden"       name="user_zip_hidden">`;

    const hiddenCheckboxCalculations = [];
    const hiddenTextCalculations     = [];

    const container = document.getElementById("hiddenFieldsContainer");
    if (!container)
        return { hiddenFieldsHTML: hiddenFieldsHTML + "</div>",
                 hiddenCheckboxCalculations,
                 hiddenTextCalculations };

    /* ── walk every hidden‑field block ────────────────────────── */
    container.querySelectorAll(".hidden-field-block").forEach(block => {
        const hid   = block.id.replace("hiddenFieldBlock", "");
        const fType = block.querySelector("#hiddenFieldType" + hid)?.value || "text";
        const fName = block.querySelector("#hiddenFieldName" + hid)?.value.trim();
        if (!fName) return;

        /* TEXT hidden field ......................................*/
        if (fType === "text") {
			
			//hide fields here
            hiddenFieldsHTML += `\n<input type="text" id="${fName}" name="${fName}" style="display:none;">`;

            const rows = block.querySelectorAll(`[id^="textCalculationRow${hid}_"]`);
            if (rows.length) {
                const calcArr = [];

                rows.forEach(row => {
                    const oneCalc = { terms: [], compareOperator: "=", threshold: "0", fillValue: "" };

                    /* grab terms */
                    row.querySelectorAll(".equation-term-text").forEach((termDiv, tIdx) => {
                        const qSel = termDiv.querySelector('[id^="textTermQuestion"]');
                        if (!qSel) return;

                        const qId   = qSel.value.trim();
                        const rawId = questionNameIds[qId] || qId;            // fallback
                        const isAmt = questionTypesMap[qId] === "checkbox" &&
                                      termDiv.querySelector('[id^="textTermIsAmount"]')?.checked;
                        const base  = isAmt ? rawId + "_amount" : rawId;

                        oneCalc.terms.push({
                            operator: tIdx ? termDiv.querySelector('[id^="textTermOperator"]').value : "",
                            /* HERE is the important line: */
                            questionNameId: normaliseDesignerFieldRef(base)
                        });
                    });

                    if (oneCalc.terms.length) {
                        oneCalc.compareOperator = row.querySelector('[id^="textCompareOperator"]').value || "=";
                        oneCalc.threshold       = row.querySelector('[id^="textThreshold"]').value.trim() || "0";
                        oneCalc.fillValue       = row.querySelector('[id^="textFillValue"]').value.trim() || "";
                        calcArr.push(oneCalc);
                    }
                });

                if (calcArr.length)
                    hiddenTextCalculations.push({ hiddenFieldName: fName, calculations: calcArr });
            }
        }

        /* CHECKBOX hidden field ..................................*/
        if (fType === "checkbox") {
            const checked = block.querySelector("#hiddenFieldChecked" + hid)?.checked;
            hiddenFieldsHTML += `\n<div style="display:none;"><input type="checkbox" id="${fName}" name="${fName}" ${checked ? "checked" : ""}></div>`;

            const rows = block.querySelectorAll(`[id^="calculationRow${hid}_"]`);
            if (rows.length) {
                const calcArr = [];

                rows.forEach(row => {
                    const oneCalc = { terms: [], compareOperator: "=", threshold: "0", result: "checked" };

                    row.querySelectorAll(".equation-term-cb").forEach((termDiv, tIdx) => {
                        const qSel = termDiv.querySelector('[id^="calcTermQuestion"]');
                        if (!qSel) return;

                        const qId   = qSel.value.trim();
                        const rawId = questionNameIds[qId] || qId;
                        const isAmt = questionTypesMap[qId] === "checkbox" &&
                                      termDiv.querySelector('[id^="calcTermIsAmount"]')?.checked;
                        const base  = isAmt ? rawId + "_amount" : rawId;

                        oneCalc.terms.push({
                            operator: tIdx ? termDiv.querySelector('[id^="calcTermOperator"]').value : "",
                            questionNameId: normaliseDesignerFieldRef(base)
                        });
                    });

                    if (oneCalc.terms.length) {
                        oneCalc.compareOperator = row.querySelector('[id^="calcCompareOperator"]').value || "=";
                        oneCalc.threshold       = row.querySelector('[id^="calcThreshold"]').value.trim() || "0";
                        oneCalc.result          = row.querySelector('[id^="calcResult"]').value || "checked";
                        calcArr.push(oneCalc);
                    }
                });

                if (calcArr.length)
                    hiddenCheckboxCalculations.push({ hiddenFieldName: fName, calculations: calcArr });
            }
        }
    });

    hiddenFieldsHTML += "\n</div>";
    return { hiddenFieldsHTML, hiddenCheckboxCalculations, hiddenTextCalculations };
}

