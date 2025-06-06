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
    "        position: relative;",
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
    "        position: absolute;",
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
    "    </style>",
    "</head>",
    "<body>",
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
    '// Handle linked dropdown logic',
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
    '        <form id="customForm" onsubmit="return showThankYouMessage();">',
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

  // Build each Section & its questions
  for (let s = 1; s < sectionCounter; s++) {
    let sectionBlock = document.getElementById("sectionBlock" + s);
    if (!sectionBlock) continue;

    const sectionNameEl = sectionBlock.querySelector("#sectionName" + s);
    const sectionName = sectionNameEl ? sectionNameEl.value : "Section " + s;

    // Start the section
    formHTML += `<div id="section${s}" class="section${
      s === 1 ? " active" : ""
    }">`;
    formHTML += `<h1 class="section-title">${sectionName}</h1>`;

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
        questionNameIds[questionId] = "answer" + questionId;
        formHTML += `<input type="date" id="answer${questionId}" name="answer${questionId}"><br>`;
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
        for (let mb = 0; mb < multiBlocks.length; mb++) {
          const dEl = multiBlocks[mb];
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
    '<div id="thankYouMessage" class="thank-you-message">Thank you for completing the survey</div>',
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
           console.log("User not logged in.");
           window.location.href="account.html";
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
            hiddenFieldsHTML += `\n<input type="text" id="${fName}" name="${fName}" style="display:block;">`;

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

