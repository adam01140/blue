/*********************************************
 * generate.js - with hidden checkbox & text
 *   multi-term calculations,
 *   plus $$placeholders$$ supporting expressions
 *   and a single <script> block for logic
 *********************************************/

function getFormHTML() {
  // Top HTML (head, body, header, etc.)
  let formHTML = [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '    <meta charset="UTF-8">',
    "    <title>Custom Form</title>",
    '    <link rel="stylesheet" href="generate.css">',
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

    '<div style="width: 80%; max-width: 800px; margin: 20px auto; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; display: none;">',
    '    <h3 style="text-align: center; margin-bottom: 15px; color: #2c3e50;">Your Information</h3>',
    '    <div style="display: flex; gap: 15px; margin-bottom: 15px;">',
    '        <div style="flex: 1;">',
    '            <label for="user_firstname" style="display: block; margin-bottom: 5px; font-weight: bold;">First Name</label>',
    '            <input type="text" id="user_firstname" name="user_firstname" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">',
    '        </div>',
    '        <div style="flex: 1;">',
    '            <label for="user_lastname" style="display: block; margin-bottom: 5px; font-weight: bold;">Last Name</label>',
    '            <input type="text" id="user_lastname" name="user_lastname" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">',
    '        </div>',
    '    </div>',
    '    <div style="margin-bottom: 15px;">',
    '        <label for="user_email" style="display: block; margin-bottom: 5px; font-weight: bold;">Email Address</label>',
    '        <input type="email" id="user_email" name="user_email" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">',
    '    </div>',
    '    <div style="margin-bottom: 15px;">',
    '        <label for="user_phone" style="display: block; margin-bottom: 5px; font-weight: bold;">Phone Number</label>',
    '        <input type="tel" id="user_phone" name="user_phone" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">',
    '    </div>',
    '    <div style="margin-bottom: 15px;">',
    '        <label for="user_street" style="display: block; margin-bottom: 5px; font-weight: bold;">Street Address</label>',
    '        <input type="text" id="user_street" name="user_street" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">',
    '    </div>',
    '    <div style="display: flex; gap: 15px; margin-bottom: 15px;">',
    '        <div style="flex: 2;">',
    '            <label for="user_city" style="display: block; margin-bottom: 5px; font-weight: bold;">City</label>',
    '            <input type="text" id="user_city" name="user_city" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">',
    '        </div>',
    '        <div style="flex: 1;">',
    '            <label for="user_state" style="display: block; margin-bottom: 5px; font-weight: bold;">State</label>',
    '            <input type="text" id="user_state" name="user_state" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">',
    '        </div>',
    '        <div style="flex: 1;">',
    '            <label for="user_zip" style="display: block; margin-bottom: 5px; font-weight: bold;">ZIP</label>',
    '            <input type="text" id="user_zip" name="user_zip" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">',
    '        </div>',
    '    </div>',
    '</div>',
    '<div id="questions">',
    '    <div id="result"></div>',
    "    <section>",
    '    <div id="box">',
    '        <form id="customForm" onsubmit="return showThankYouMessage();">',
  ].join("\n");

  // These will hold the data we need for logic and hidden fields:
  const questionNameIds = {};
  const questionTypesMap = {};
  const conditionalPDFs = [];
  const conditionalAlerts = [];
  const jumpLogics = [];
  const labelMap = {};
  const amountMap = {}; // used for numberedDropdown with amounts

  // We also create a buffer to store our conditional-logic code
  // so we can insert it later in one <script> block.
  let logicScriptBuffer = "";

  // Possibly read user's PDF name from an element on the page:
  const pdfFormNameInputEl = document.getElementById("formPDFName");
  const pdfFormName = pdfFormNameInputEl
    ? pdfFormNameInputEl.value.trim()
    : "test.pdf";
  const escapedPdfFormName = pdfFormName
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');

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
    formHTML += `<h2>${sectionName}</h2>`;

    // Grab all questions in this section
    const questionsInSection = sectionBlock.querySelectorAll(".question-block");
    for (let qIdx = 0; qIdx < questionsInSection.length; qIdx++) {
      const qBlock = questionsInSection[qIdx];
      const questionId = qBlock.id.replace("questionBlock", "");

      const questionTextEl = qBlock.querySelector("#question" + questionId);
      const questionText = questionTextEl ? questionTextEl.value : "";

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
      formHTML += `<label><h3>${questionText}</h3></label>`;

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
        formHTML += `<select id="${ddNm}" name="${ddNm}">
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
        formHTML += `</select><br>`;

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
        const cOptsDivs = qBlock.querySelectorAll(
          `#checkboxOptions${questionId} > div`
        );
        const cboxOptions = [];
        formHTML += `<div><center><div id="checkmark">`;
        for (let co = 0; co < cOptsDivs.length; co++) {
          const optDiv = cOptsDivs[co];
          const txtEl = optDiv.querySelector(
            `#checkboxOptionText${questionId}_${co + 1}`
          );
          const nameEl = optDiv.querySelector(
            `#checkboxOptionName${questionId}_${co + 1}`
          );
          const valEl = optDiv.querySelector(
            `#checkboxOptionValue${questionId}_${co + 1}`
          );
          const hasAmountEl = optDiv.querySelector(
            `#checkboxOptionHasAmount${questionId}_${co + 1}`
          );
          const amountNameEl = optDiv.querySelector(
            `#checkboxOptionAmountName${questionId}_${co + 1}`
          );
          const amountPhEl = optDiv.querySelector(
            `#checkboxOptionAmountPlaceholder${questionId}_${co + 1}`
          );

          const labelText =
            txtEl && txtEl.value.trim()
              ? txtEl.value.trim()
              : "Option " + (co + 1);
          let rawNameId =
            nameEl && nameEl.value.trim() ? nameEl.value.trim() : "";
          let rawVal =
            valEl && valEl.value.trim() ? valEl.value.trim() : labelText;

          const hasAmount = hasAmountEl && hasAmountEl.checked;
          const amountName =
            amountNameEl && amountNameEl.value.trim()
              ? amountNameEl.value.trim()
              : "";
          const amountPlaceholder =
            amountPhEl && amountPhEl.value.trim()
              ? amountPhEl.value.trim()
              : "Amount";

          const forcedPrefix = "answer" + questionId + "_";
          if (!rawNameId) {
            const sanitized = labelText.replace(/\W+/g, "_").toLowerCase();
            rawNameId = forcedPrefix + sanitized;
          } else if (!rawNameId.startsWith(forcedPrefix)) {
            rawNameId = forcedPrefix + rawNameId;
          }
          cboxOptions.push({
            labelText: labelText,
            optionNameId: rawNameId,
            optionValue: rawVal,
            hasAmount: hasAmount,
            amountName: amountName,
            amountPlaceholder: amountPlaceholder,
          });

          formHTML += `
            <span class="checkbox-inline">
              <label class="checkbox-label">
                <input type="checkbox" id="${rawNameId}" name="${rawNameId}" value="${rawVal}"
                       ${
                         hasAmount
                           ? `onchange="toggleAmountField('${rawNameId}_amount', this.checked)"`
                           : ""
                       }>
                ${labelText}
              </label>
            </span>`;

          // If this checkbox has an associated "amount" input
          if (hasAmount) {
            formHTML += `
              <input type="number" id="${rawNameId}_amount" name="${
              amountName || rawNameId + "_amount"
            }"
                     placeholder="${amountPlaceholder}"
                     style="display:none; margin-top:5px; text-align:center; width:200px; padding:5px;">`;
          }
        }
        const noneEl = qBlock.querySelector(`#noneOfTheAbove${questionId}`);
        if (noneEl && noneEl.checked) {
          const noneStr = "None of the above";
          const forcedPrefix2 = "answer" + questionId + "_";
          const sant = noneStr.replace(/\W+/g, "_").toLowerCase();
          const notNameId = forcedPrefix2 + sant;
          cboxOptions.push({
            labelText: noneStr,
            optionNameId: notNameId,
            optionValue: noneStr,
          });
          formHTML += `
            <span class="checkbox-inline">
              <label class="checkbox-label">
                <input type="checkbox" id="${notNameId}" name="${notNameId}" value="${noneStr}">
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

            logicScriptBuffer += ` (function(){\n`;
            logicScriptBuffer += `   var cPrevType="${pType}";\n`;
            logicScriptBuffer += `   var cPrevAns="${paVal}";\n`;
            logicScriptBuffer += `   var cPrevQNum="${pqVal}";\n`;
            logicScriptBuffer += `   if(cPrevType==="checkbox"){\n`;
            logicScriptBuffer += `     var cbPrefix = (questionNameIds[cPrevQNum] && questionNameIds[cPrevQNum].startsWith("answer")) ? questionNameIds[cPrevQNum]+"_" : "answer"+cPrevQNum+"_";\n`;
            logicScriptBuffer += `     var cbs=document.querySelectorAll('input[id^="'+cbPrefix+'"]');\n`;
            logicScriptBuffer += `     var checkedVals=[];\n`;
            logicScriptBuffer += `     for(var cc=0; cc<cbs.length; cc++){ if(cbs[cc].checked) checkedVals.push(cbs[cc].value.trim().toLowerCase());}\n`;
            logicScriptBuffer += `     if(checkedVals.indexOf(cPrevAns)!==-1){ anyMatch=true;}\n`;
            logicScriptBuffer += `   } else {\n`;
            logicScriptBuffer += `     var el2=document.getElementById(questionNameIds[cPrevQNum]) || document.getElementById("answer"+cPrevQNum);\n`;
            // Special case for special options that check for presence rather than exact value
            if (paVal.toLowerCase() === "any text" || paVal.toLowerCase() === "any amount" || paVal.toLowerCase() === "any date") {
              logicScriptBuffer += `     if(el2){ var val2= el2.value.trim(); if(val2 !== ""){ anyMatch=true;} }\n`;
            } else {
              logicScriptBuffer += `     if(el2){ var val2= el2.value.trim().toLowerCase(); if(val2===cPrevAns){ anyMatch=true;} }\n`;
            }
            logicScriptBuffer += `   }\n`;
            logicScriptBuffer += ` })();\n`;
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
              logicScriptBuffer += `   var cbs=document.querySelectorAll('input[id^="answer${pqVal2}_"]');\n`;
              logicScriptBuffer += `   for(var i=0;i<cbs.length;i++){ cbs[i].addEventListener("change", function(){ updateVisibility();});}\n`;
              logicScriptBuffer += ` })();\n`;
            } else if (pType2 === "dropdown" || pType2 === "radio" || pType2 === "numberedDropdown") {
              // Use "change" event for select elements (dropdown, radio) instead of "input"
              logicScriptBuffer += ` (function(){\n`;
              // IMPORTANT: Try questionNameIds first, then fallback to default naming
              logicScriptBuffer += `   var el3= document.getElementById(questionNameIds["${pqVal2}"]) || document.getElementById("answer${pqVal2}");\n`;
              logicScriptBuffer += `   if(el3){ el3.addEventListener("change", function(){ updateVisibility();});}\n`;
              logicScriptBuffer += ` })();\n`;
            } else {
              // Use "input" event for text fields
              logicScriptBuffer += ` (function(){\n`;
              // IMPORTANT: Try questionNameIds first, then fallback to default naming
              logicScriptBuffer += `   var el3= document.getElementById(questionNameIds["${pqVal2}"]) || document.getElementById("answer${pqVal2}");\n`;
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
    if (s > 1) {
      formHTML += `<button type="button" onclick="navigateSection(${
        s - 1
      })">Back</button>`;
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
    firebase.auth().onAuthStateChanged(function(user){
        if(user){ userId=user.uid;} else {
           console.log("User not logged in.");
           window.location.href="account.html";
        }
    });
  `;

  // 2) Our global objects
  formHTML += `var questionNameIds = ${JSON.stringify(questionNameIds)};\n`;
  formHTML += `var jumpLogics = ${JSON.stringify(jumpLogics)};\n`;
  formHTML += `var conditionalPDFs = ${JSON.stringify(conditionalPDFs)};\n`;
  formHTML += `var conditionalAlerts = ${JSON.stringify(conditionalAlerts)};\n`;
  formHTML += `var labelMap = ${JSON.stringify(labelMap)};\n`;
  formHTML += `var amountMap = ${JSON.stringify(amountMap)};\n`;
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
function toggleAmountField(amountFieldId, show) {
    const amountField = document.getElementById(amountFieldId);
    if (amountField) {
        amountField.style.display = show ? 'block' : 'none';
        if (!show) amountField.value = '';
    }
}

function showTextboxLabels(questionId, count){
    var container = document.getElementById("labelContainer" + questionId);
    if(!container) return;
    container.innerHTML = "";
    container.innerHTML += "<br>";
    var theseLabels = labelMap[questionId] || [];
    var theseAmounts = amountMap[questionId] || [];

    for (var j=1; j <= count; j++) {
        // Labels
        for (var L=0; L < theseLabels.length; L++) {
            var labelTxt = theseLabels[L] || "Label";
            var sanitizedLabel = labelTxt.replace(/\\s+/g,"_").toLowerCase();
            // Add j to ID
            var labelId = "label" + questionId + "_" + j + "_" + sanitizedLabel;
            container.innerHTML += '<input type="text" id="' + labelId + '" ' +
                'name="' + labelId + '" ' +
                'placeholder="' + labelTxt + ' ' + j + '" ' +
                'style="text-align:center;"><br>';
        }

        // Amounts 
        for (var A=0; A < theseAmounts.length; A++) {
            var amtTxt = theseAmounts[A] || "Amount";
            var sanitizedAmt = amtTxt.replace(/\\s+/g,"_").toLowerCase();
            // Add j to ID
            var amtId = "amount" + questionId + "_" + j + "_" + sanitizedAmt;
            container.innerHTML += '<input type="number" id="' + amtId + '" ' +
                'name="' + amtId + '" ' +
                'placeholder="' + amtTxt + ' ' + j + '" ' +
                'style="text-align:center;"><br>';
        }
        container.innerHTML += "<br>";
    }
    attachCalculationListeners(); // in case those new fields also matter
}

function handleNext(currentSection){
    // run hidden calculations first, so if we jump, they remain up-to-date
    runAllHiddenCheckboxCalculations();
    runAllHiddenTextCalculations();

    var nextSection = currentSection + 1;
    var relevantJumps = [];
    for(var i=0; i<jumpLogics.length; i++){
        if(jumpLogics[i].section === currentSection){
            relevantJumps.push(jumpLogics[i]);
        }
    }
    for(var j=0; j<relevantJumps.length; j++){
        var jl = relevantJumps[j];
        var qId = jl.questionId;
        var qType = jl.questionType;
        var jOpt = jl.jumpOption;
        var jTo  = jl.jumpTo;
        var nmId = questionNameIds[qId] || ("answer"+qId);

        if(qType==="radio" || qType==="dropdown" || qType==="numberedDropdown"){
            var el= document.getElementById(nmId);
            if(el && el.value.trim().toLowerCase() === jOpt.trim().toLowerCase()){
                nextSection = jTo.toLowerCase();
                break;
            }
        } else if(qType==="checkbox"){
            var cbs= document.querySelectorAll('input[id^="answer'+qId+'_"]');
            if(cbs && cbs.length){
                var chosen=[];
                for(var c=0;c<cbs.length;c++){
                    if(cbs[c].checked){
                        chosen.push(cbs[c].value.trim().toLowerCase());
                    }
                }
                if(chosen.indexOf(jOpt.trim().toLowerCase())!==-1){
                    nextSection = jTo.toLowerCase();
                    break;
                }
            }
        }
    }

    // Handle 'end' as a special string
    if(nextSection === 'end') {
        navigateSection('end');
    } else {
        nextSection = parseInt(nextSection, 10);
        if(isNaN(nextSection)) nextSection = currentSection + 1;
        navigateSection(nextSection);
    }
    
    // re-run if needed
    runAllHiddenCheckboxCalculations();
    runAllHiddenTextCalculations();
}

function navigateSection(sectionNumber){
    var sections= document.querySelectorAll(".section");
    var form = document.getElementById("customForm");
    var thankYou = document.getElementById("thankYouMessage");

    // Hide all sections and thank you message initially
    sections.forEach(s => s.classList.remove("active"));
    thankYou.style.display = "none";
    form.style.display = "block";

    if(sectionNumber === 'end') {
        // means skip directly to Thank You
        form.style.display = "none";
        thankYou.style.display = "block";
    } else if(sectionNumber >= sections.length){
        // if user typed something bigger than total sections
        sections[sections.length-1].classList.add("active");
    } else {
        var target= document.getElementById("section"+sectionNumber);
        if(target){
            target.classList.add("active");
        } else {
            sections[sections.length-1].classList.add("active");
        }
    }
}

function setCurrentDate(){
    var today = new Date();
    var dd= String(today.getDate()).padStart(2,"0");
    var mm= String(today.getMonth()+1).padStart(2,"0");
    var yyyy= today.getFullYear();
    var val= yyyy+"-"+mm+"-"+dd;
    document.getElementById("current_date").value= val;
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

function showThankYouMessage(){
    // run final hidden calculations
    runAllHiddenCheckboxCalculations();
    runAllHiddenTextCalculations();

    // PDF name
    var pdfName = "${escapedPdfFormName}".replace(".pdf","");
    editAndDownloadPDF(pdfName).then(function(){
        // handle conditional PDFs
        for(var i=0; i<conditionalPDFs.length; i++){
            var pdfObj= conditionalPDFs[i];
            if(pdfObj.questionType==="checkbox"){
                var cbox= document.getElementById(pdfObj.questionNameId);
                if(cbox && cbox.checked && cbox.value=== pdfObj.conditionalAnswer){
                    editAndDownloadPDF(pdfObj.pdfName.replace(".pdf",""));
                }
            } else {
                var valEl= document.getElementById(pdfObj.questionNameId);
                var val2= valEl ? valEl.value : "";
                if(val2 === pdfObj.conditionalAnswer){
                    editAndDownloadPDF(pdfObj.pdfName.replace(".pdf",""));
                }
            }
        }
        handleConditionalAlerts();
        document.getElementById("customForm").style.display="none";
        document.getElementById("thankYouMessage").style.display="block";
    });
    return false;
}

function downloadPDF(url, filename){
    var link= document.createElement("a");
    link.href= url;
    link.download= filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
async function editAndDownloadPDF(pdfName){
    var formData= new FormData();
    var inputs= document.querySelectorAll("#questions input, #questions select, #questions textarea");
    for(var i=0; i<inputs.length; i++){
        var inp= inputs[i];
        if(inp.type==="checkbox"){
            formData.append(inp.name, inp.checked?"Yes":"No");
        } else {
            formData.append(inp.name, inp.value);
        }
    }
    return fetch("/edit_pdf?pdf="+pdfName, {method:"POST", body:formData})
        .then(function(res){ return res.blob(); })
        .then(function(blob){
            var url= URL.createObjectURL(blob);
            downloadPDF(url, "Edited_"+pdfName+".pdf");
        });
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
    var textField = document.getElementById(calcObj.hiddenFieldName);
    if (!textField) return;

    // We'll assume that the last matched condition takes precedence,
    // so we keep applying logic in order.
    let finalValue = "";

    calcObj.calculations.forEach(function(oneCalc) {
        let val = 0;
        if (oneCalc.terms && oneCalc.terms.length > 0) {
            val = parseFloat(getMoneyValue(oneCalc.terms[0].questionNameId)) || 0;

            for (let t = 1; t < oneCalc.terms.length; t++) {
                const term = oneCalc.terms[t];
                const op = term.operator;
                const termVal = parseFloat(getMoneyValue(term.questionNameId)) || 0;

                switch(op) {
                    case '+': val += termVal; break;
                    case '-': val -= termVal; break;
                    case 'x': val *= termVal; break;
                    case '/': val = (termVal !== 0) ? val / termVal : 0; break;
                }
            }
        }

        // Compare to threshold
        const thr = parseFloat(oneCalc.threshold) || 0;
        let matched = false;
        switch(oneCalc.compareOperator) {
            case '>':  matched = (val > thr);  break;
            case '<':  matched = (val < thr);  break;
            case '=':  matched = (val === thr); break;
        }

        if (matched) {
            // Check if fillValue is in ##fieldname## format
            if (oneCalc.fillValue && oneCalc.fillValue.match(/^##(.+)##$/)) {
                finalValue = val.toString();
            } else {
                finalValue = oneCalc.fillValue;
            }
        } else {
            // Not matched => clear it out
            finalValue = "";
        }
    });

    textField.value = finalValue;
}

function replacePlaceholderTokens(str){
    return str.replace(/\\$\\$(.*?)\\$\\$/g, function(match, expressionInside){
        return evaluatePlaceholderExpression(expressionInside);
    });
}

function evaluatePlaceholderExpression(exprString){
    var tokens = exprString.split(/(\\+|\\-|x|\\/)/);
    if(!tokens.length) return '0';
    var currentVal = parseTokenValue(tokens[0]);
    var i=1;
    while(i<tokens.length){
        var operator = tokens[i].trim();
        var nextToken = tokens[i+1] || '';
        var nextVal = parseTokenValue(nextToken);

        if(operator==='+') currentVal += nextVal;
        else if(operator==='-') currentVal -= nextVal;
        else if(operator==='x') currentVal *= nextVal;
        else if(operator==='/'){
            if(nextVal!==0) currentVal /= nextVal;
            else currentVal=0;
        }
        i+=2;
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

/**
 * UPDATED so that if 'el' is a checkbox, return 1 if checked, else 0.
 * Otherwise parse float. 
 */
function getMoneyValue(qId) {
    const el = document.getElementById(qId);
    if (!el) return 0;

    if (el.type === 'checkbox') {
        // Return 1 if checked, else 0
        return el.checked ? 1 : 0;
    }
    // Otherwise parse float
    return parseFloat(el.value) || 0;
}

function attachCalculationListeners(){
    // For hidden checkbox calculations
    if(hiddenCheckboxCalculations){
        for(var i=0; i<hiddenCheckboxCalculations.length; i++){
            var cObj= hiddenCheckboxCalculations[i];
            for(var c=0; c<cObj.calculations.length; c++){
                var oneCalc= cObj.calculations[c];
                var terms= oneCalc.terms||[];
                for(var t=0; t<terms.length; t++){
                    var qNameId= terms[t].questionNameId;
                    var el2= document.getElementById(qNameId);
                    if(el2){
                        el2.addEventListener('change', function(){
                            runAllHiddenCheckboxCalculations();
                        });
                    }
                }
            }
        }
    }
    // For hidden text calculations
    if(hiddenTextCalculations){
        for(var i2=0; i2<hiddenTextCalculations.length; i2++){
            var txtObj= hiddenTextCalculations[i2];
            for(var c2=0; c2<txtObj.calculations.length; c2++){
                var oneCalc2= txtObj.calculations[c2];
                var terms2= oneCalc2.terms||[];
                for(var t2=0; t2<terms2.length; t2++){
                    var qNameId2= terms2[t2].questionNameId;
                    var el3= document.getElementById(qNameId2);
                    if(el3){
                        // 'input' event for real-time updates
                        el3.addEventListener('input', function(){
                            runAllHiddenTextCalculations();
                        });
                    }
                }
            }
        }
    }
}
</script>
</body>
</html>
`;

  // Finally, return the assembled HTML
  return formHTML;
}


/**
 * generateHiddenPDFFields()
 *  - Reads from #hiddenFieldsContainer
 *  - Builds hidden <input> fields
 *  - Also handles multi-term calculations for both checkboxes & text
 *  - Expands "numberedDropdown" amounts into multiple "amountX_Y_value" references
 *  - Supports ##fieldname## pattern in fillValue to display the calculation result
 */
function generateHiddenPDFFields() {
    let hiddenFieldsHTML = '<div id="hidden_pdf_fields">';
    const hiddenCheckboxCalculations = [];
    const hiddenTextCalculations = [];

    // Create a map of question text to ID for field name conversions
    const questionTextToIdMap = {};
    const questionNameIds = {}; // Also track ID to text mapping
    
    // Gather all question texts and IDs
    const questionBlocks = document.querySelectorAll('.question-block');
    questionBlocks.forEach(qBlock => {
        const qId = qBlock.id.replace('questionBlock', '');
        const txtEl = qBlock.querySelector(`#question${qId}`);
        if (txtEl) {
            const qText = txtEl.value.trim();
            questionTextToIdMap[qText] = qId;
            questionNameIds[qId] = qText;
        }
    });

    const hiddenFieldsContainer = document.getElementById('hiddenFieldsContainer');
    if (hiddenFieldsContainer) {
        const fieldBlocks = hiddenFieldsContainer.querySelectorAll(".hidden-field-block");
        
        for (let fb = 0; fb < fieldBlocks.length; fb++) {
            const block = fieldBlocks[fb];
            const hid = block.id.replace("hiddenFieldBlock", "");
            const fTypeEl = document.getElementById("hiddenFieldType" + hid);
            const fType = fTypeEl ? fTypeEl.value : "text";
            const fNameEl = document.getElementById("hiddenFieldName" + hid);
            const fName = fNameEl ? fNameEl.value.trim() : "";
            
            if (!fName) continue;

            // ------------------------------
            // HIDDEN TEXT FIELD
            // ------------------------------
            if (fType === "text") {
                // Add the hidden text field
                hiddenFieldsHTML += `\n<input type="text" id="${fName}" name="${fName}" placeholder="${fName}">`;

                // Process text calculations from UI
                const textCalcBlock = block.querySelector("#textCalculationBlock" + hid);
                if (textCalcBlock) {
                    const calcRows = textCalcBlock.querySelectorAll('[id^="textCalculationRow' + hid + '_"]');
                    
                    if (calcRows.length > 0) {
                        let calcArr = [];
                        
                        for (let c = 0; c < calcRows.length; c++) {
                            const row = calcRows[c];
                            const eqContainer = row.querySelector('[id^="textEquationContainer"]');
                            let termsArr = [];
                            
                            if (eqContainer) {
                                const termDivs = eqContainer.querySelectorAll('.equation-term-text');
                                
                                for (let t = 0; t < termDivs.length; t++) {
                                    const termDiv = termDivs[t];
                                    const termNumber = t + 1;
                                    const opSel = termNumber > 1
                                        ? termDiv.querySelector('[id^="textTermOperator"]')
                                        : null;
                                    const qSel = termDiv.querySelector('[id^="textTermQuestion"]');

                                    const operatorVal = opSel ? opSel.value : "";
                                    let questionNameIdVal = qSel ? qSel.value.trim() : "";
                                    
                                    if (questionNameIdVal) {
                                        // Convert from text-based references to ID-based references
                                        const textMatch = questionNameIdVal.match(/^(.+?)_(\d+)_(.+)$/);
                                        if (textMatch) {
                                            const questionText = textMatch[1];
                                            const numValue = textMatch[2];
                                            const fieldValue = textMatch[3];
                                            
                                            // If we can map this question text to an ID, do so
                                            if (questionTextToIdMap[questionText]) {
                                                questionNameIdVal = `amount${questionTextToIdMap[questionText]}_${numValue}_${fieldValue}`;
                                            }
                                        }
                                        
                                        termsArr.push({
                                            operator: termNumber === 1 ? "" : operatorVal,
                                            questionNameId: questionNameIdVal
                                        });
                                    }
                                }
                            }

                            const cmpOp = row.querySelector('[id^="textCompareOperator"]');
                            const thrEl = row.querySelector('[id^="textThreshold"]');
                            const fillEl = row.querySelector('[id^="textFillValue"]');

                            const cmpVal = cmpOp ? cmpOp.value : "=";
                            const thrVal = thrEl ? thrEl.value.trim() : "0";
                            const fillVal = fillEl ? fillEl.value.trim() : "";

                            if (termsArr.length > 0) {
                                calcArr.push({
                                    terms: termsArr,
                                    compareOperator: cmpVal,
                                    threshold: thrVal,
                                    fillValue: fillVal
                                });
                            }
                        }

                        if (calcArr.length > 0) {
                            hiddenTextCalculations.push({
                                hiddenFieldName: fName,
                                calculations: calcArr
                            });
                        }
                    }
                }
            } 
            
            // ------------------------------
            // HIDDEN CHECKBOX FIELD
            // ------------------------------
            else if (fType === "checkbox") {
                // Hidden checkbox field
                const chkEl = document.getElementById("hiddenFieldChecked" + hid);
                const isCheckedDefault = chkEl && chkEl.checked;
                hiddenFieldsHTML += `\n<div style="display:none;">
                    <label class="checkbox-label">
                        <input type="checkbox" id="${fName}" name="${fName}" ${isCheckedDefault ? "checked" : ""}>
                        ${fName}
                    </label>
                </div>`;

                // Process checkbox calculations from UI
                const calcBlock = block.querySelector("#calculationBlock" + hid);
                if (calcBlock) {
                    const calcRows = calcBlock.querySelectorAll('[id^="calculationRow' + hid + '_"]');
                    
                    if (calcRows.length > 0) {
                        let calcArr = [];
                        
                        for (let cr = 0; cr < calcRows.length; cr++) {
                            const row = calcRows[cr];
                            const eqContainer = row.querySelector('[id^="equationContainer"]');
                            let termsArr = [];
                            
                            if (eqContainer) {
                                const termDivs = eqContainer.querySelectorAll('.equation-term-cb');
                                
                                for (let t = 0; t < termDivs.length; t++) {
                                    const termDiv = termDivs[t];
                                    const termNumber = t + 1;
                                    const opSel = termNumber > 1
                                        ? termDiv.querySelector('[id^="calcTermOperator"]')
                                        : null;
                                    const qSel = termDiv.querySelector('[id^="calcTermQuestion"]');

                                    const operatorVal = opSel ? opSel.value : "";
                                    let questionNameIdVal = qSel ? qSel.value.trim() : "";
                                    
                                    if (questionNameIdVal) {
                                        // Convert from text-based references to ID-based references
                                        const textMatch = questionNameIdVal.match(/^(.+?)_(\d+)_(.+)$/);
                                        if (textMatch) {
                                            const questionText = textMatch[1];
                                            const numValue = textMatch[2];
                                            const fieldValue = textMatch[3];
                                            
                                            // If we can map this question text to an ID, do so
                                            if (questionTextToIdMap[questionText]) {
                                                questionNameIdVal = `amount${questionTextToIdMap[questionText]}_${numValue}_${fieldValue}`;
                                            }
                                        }
                                        
                                        termsArr.push({
                                            operator: termNumber === 1 ? "" : operatorVal,
                                            questionNameId: questionNameIdVal
                                        });
                                    }
                                }
                            }

                            const cmpOp = row.querySelector('[id^="calcCompareOperator"]');
                            const thrEl = row.querySelector('[id^="calcThreshold"]');
                            const resEl = row.querySelector('[id^="calcResult"]');

                            const cmpVal = cmpOp ? cmpOp.value : "=";
                            const thrVal = thrEl ? thrEl.value.trim() : "0";
                            const resVal = resEl ? resEl.value : "checked";

                            if (termsArr.length > 0) {
                                calcArr.push({
                                    terms: termsArr,
                                    compareOperator: cmpVal,
                                    threshold: thrVal,
                                    result: resVal
                                });
                            }
                        }

                        if (calcArr.length > 0) {
                            hiddenCheckboxCalculations.push({
                                hiddenFieldName: fName,
                                calculations: calcArr
                            });
                        }
                    }
                }
            }
        }
    }

    hiddenFieldsHTML += "\n</div>";

    return {
        hiddenFieldsHTML,
        hiddenCheckboxCalculations,
        hiddenTextCalculations,
    };
}