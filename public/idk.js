/*********************************************
 * generate.js - with hidden checkbox calculations
 *   and hidden fields truly hidden by default
 *********************************************/

/**
 * Main function to build the final HTML form string.
 */
function getFormHTML() {
    let formHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Custom Form</title>
        <link rel="stylesheet" href="generate.css">
    </head>
    <body>
    <header>
        <img src="logo.png" alt="FormWiz Logo" width="130" height="80" onclick="location.href='index.html';">
        <nav>
            <a href="index.html">Home</a>
            <a href="forms.html">Forms</a>
            <a href="contact.html">Contact Us</a>
        </nav>
    </header>

    <div id="pdfPreview" style="display:none;">
        <iframe id="pdfFrame" style="display:none"></iframe>
    </div>
    <input type="text" id="current_date" name="current_date" placeholder="current_date" style="display:none">

    <!-- Firebase includes -->
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>

    <div id="questions">
        <div id="result"></div>
        <section>
        <div id="box">
            <form id="customForm" onsubmit="return showThankYouMessage();">
    `;

    // Track question IDs -> name IDs
    let questionNameIds = {};
    // Track question types, e.g. questionTypesMap[questionId] = "checkbox"
    let questionTypesMap = {};

    // Arrays for PDF logic, alerts, jump logic, etc.
    let conditionalPDFs = [];
    let conditionalAlerts = [];
    let jumpLogics = [];

    // Possibly read user’s desired PDF name from a field:
    const pdfFormNameInput = document.getElementById('formPDFName')
        ? document.getElementById('formPDFName').value.trim()
        : '';
    const pdfFormName = pdfFormNameInput || 'default.pdf';
    const escapedPdfFormName = pdfFormName
        .replace(/\\/g, '\\\\')
        .replace(/'/g, '\\\'')
        .replace(/"/g, '\\"');

    // Build each section from the editor
    for (let s = 1; s < sectionCounter; s++) {
        const sectionBlock = document.getElementById(`sectionBlock${s}`);
        if (!sectionBlock) continue;

        const sectionNameInput = sectionBlock.querySelector(`#sectionName${s}`);
        const sectionName = sectionNameInput ? sectionNameInput.value : `Section ${s}`;

        // Start the section
        formHTML += `<div id="section${s}" class="section${s === 1 ? ' active' : ''}">`;
        formHTML += `<h2>${sectionName}</h2>`;

        // For each question in that section
        const questionsInSection = sectionBlock.querySelectorAll('.question-block');
        questionsInSection.forEach((questionBlock) => {
            const questionId = questionBlock.id.replace('questionBlock', '');
            const questionText = questionBlock.querySelector(`#question${questionId}`).value;
            const questionType = questionBlock.querySelector(`#questionType${questionId}`).value;

            questionTypesMap[questionId] = questionType;

            // Conditional (show/hide) logic
            const logicEnabled = questionBlock.querySelector(`#logic${questionId}`).checked;

            // Jump logic
            const jumpEnabled = questionBlock.querySelector(`#enableJump${questionId}`).checked;
            const jumpTo = questionBlock.querySelector(`#jumpTo${questionId}`).value;
            const jumpOption = questionBlock.querySelector(`#jumpOption${questionId}`).value;
            if (jumpEnabled && jumpTo) {
                jumpLogics.push({
                    questionId,
                    questionNameId: '', // filled later
                    jumpOption,
                    jumpTo,
                    section: s,
                    questionType
                });
            }

            // Conditional PDF
            const conditionalPDFEnabled = questionBlock.querySelector(`#enableConditionalPDF${questionId}`)?.checked;
            const conditionalPDFName = questionBlock.querySelector(`#conditionalPDFName${questionId}`)?.value || '';
            const conditionalPDFAnswer = questionBlock.querySelector(`#conditionalPDFAnswer${questionId}`)?.value || '';

            // Conditional Alert
            const conditionalAlertEnabled = questionBlock.querySelector(`#enableConditionalAlert${questionId}`)?.checked;
            const alertPrevQuestion = questionBlock.querySelector(`#alertPrevQuestion${questionId}`)?.value;
            const alertPrevAnswer = questionBlock.querySelector(`#alertPrevAnswer${questionId}`)?.value;
            const alertText = questionBlock.querySelector(`#alertText${questionId}`)?.value;
            if (conditionalAlertEnabled && alertPrevQuestion && alertPrevAnswer && alertText) {
                conditionalAlerts.push({
                    questionId,
                    prevQuestionId: alertPrevQuestion,
                    prevAnswer: alertPrevAnswer,
                    alertText
                });
            }

            // Build question container
            formHTML += `<div id="question-container-${questionId}"`;
            if (logicEnabled) formHTML += ` class="hidden"`; // Hide initially if logic is on
            formHTML += `>`;

            formHTML += `<label><h3>${questionText}</h3></label>`;

            //  -- Render the actual question input(s) based on questionType --
            if (questionType === 'text') {
                const nameId = questionBlock.querySelector(`#textboxName${questionId}`).value || `answer${questionId}`;
                const placeholder = questionBlock.querySelector(`#textboxPlaceholder${questionId}`).value || '';
                questionNameIds[questionId] = nameId;
                formHTML += `<input type="text" id="${nameId}" name="${nameId}" placeholder="${placeholder}"><br><br>`;

            } else if (questionType === 'bigParagraph') {
                const nameId = questionBlock.querySelector(`#textboxName${questionId}`).value || `answer${questionId}`;
                const placeholder = questionBlock.querySelector(`#textboxPlaceholder${questionId}`).value || '';
                questionNameIds[questionId] = nameId;
                formHTML += `<textarea id="${nameId}" name="${nameId}" rows="5" cols="50" placeholder="${placeholder}"></textarea><br>`;

            } else if (questionType === 'radio') {
                // Single <select> with Yes/No
                const nameId = questionBlock.querySelector(`#textboxName${questionId}`).value || `answer${questionId}`;
                questionNameIds[questionId] = nameId;
                formHTML += `
                    <select id="${nameId}" name="${nameId}">
                        <option value="" disabled selected>Select an option</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select><br>
                `;
                if (conditionalPDFEnabled) {
                    conditionalPDFs.push({
                        questionId,
                        questionNameId: nameId,
                        conditionalAnswer: conditionalPDFAnswer,
                        pdfName: conditionalPDFName,
                        questionType
                    });
                }

            } else if (questionType === 'dropdown') {
                // <select> with user-defined options
                const nameId = questionBlock.querySelector(`#textboxName${questionId}`).value || `answer${questionId}`;
                questionNameIds[questionId] = nameId;
                formHTML += `<select id="${nameId}" name="${nameId}">`;
                formHTML += `<option value="" disabled selected>Select an option</option>`;

                const optionInputs = questionBlock.querySelectorAll(`#dropdownOptions${questionId} input[type="text"]`);
                optionInputs.forEach(opt => {
                    const val = opt.value.trim();
                    if (val) {
                        formHTML += `<option value="${val}">${val}</option>`;
                    }
                });
                formHTML += `</select><br>`;

            } else if (questionType === 'checkbox') {
                // One or more checkboxes
                const optionsDivs = questionBlock.querySelectorAll(`#checkboxOptions${questionId} > div`);
                const checkboxOptions = [];
                formHTML += `<div><center><div id="checkmark">`;

                optionsDivs.forEach((optDiv, idx) => {
                    const txtEl = optDiv.querySelector(`#checkboxOptionText${questionId}_${idx + 1}`);
                    const nameEl = optDiv.querySelector(`#checkboxOptionName${questionId}_${idx + 1}`);
                    const valEl = optDiv.querySelector(`#checkboxOptionValue${questionId}_${idx + 1}`);

                    const labelText = txtEl?.value.trim() || `Option ${idx + 1}`;
                    let optionNameId = nameEl?.value.trim() || '';
                    let optionValue = valEl?.value.trim() || '';

                    const forcedPrefix = `answer${questionId}_`;
                    if (!optionNameId) {
                        // sanitize label
                        const sanitized = labelText.replace(/\W+/g, "_").toLowerCase();
                        optionNameId = forcedPrefix + sanitized;
                    } else if (!optionNameId.startsWith(forcedPrefix)) {
                        optionNameId = forcedPrefix + optionNameId;
                    }

                    if (!optionValue) {
                        optionValue = labelText;
                    }
                    checkboxOptions.push({ labelText, optionNameId, optionValue });

                    formHTML += `
                        <span class="checkbox-inline">
                            <label class="checkbox-label">
                                <input type="checkbox" id="${optionNameId}" name="${optionNameId}" value="${optionValue}">
                                ${labelText}
                            </label>
                        </span>
                    `;
                });

                // "None of the above"?
                const noneOfTheAbove = questionBlock.querySelector(`#noneOfTheAbove${questionId}`);
                if (noneOfTheAbove && noneOfTheAbove.checked) {
                    const notext = 'None of the above';
                    const forcedPrefix = `answer${questionId}_`;
                    const sanitized = notext.replace(/\W+/g, "_").toLowerCase();
                    const notNameId = forcedPrefix + sanitized;
                    checkboxOptions.push({ labelText: notext, optionNameId: notNameId, optionValue: notext });

                    formHTML += `
                        <span class="checkbox-inline">
                            <label class="checkbox-label">
                                <input type="checkbox" id="${notNameId}" name="${notNameId}" value="${notext}">
                                ${notext}
                            </label>
                        </span>
                    `;
                }
                formHTML += `</div><br></div>`; // close #checkmark

                // If there's a conditional PDF for a specific checkbox option
                if (conditionalPDFEnabled) {
                    const found = checkboxOptions.find(opt => opt.labelText === conditionalPDFAnswer);
                    if (found) {
                        conditionalPDFs.push({
                            questionId,
                            questionNameId: found.optionNameId,
                            conditionalAnswer: found.optionValue,
                            pdfName: conditionalPDFName,
                            questionType
                        });
                    }
                }

            } else if (questionType === 'numberedDropdown') {
                // e.g. 1..N plus optional textboxes
                const rangeStart = questionBlock.querySelector(`#numberRangeStart${questionId}`).value;
                const rangeEnd = questionBlock.querySelector(`#numberRangeEnd${questionId}`).value;
                const labelInputs = questionBlock.querySelectorAll(`#textboxLabels${questionId} input`);
                const labelValues = Array.from(labelInputs).map(lbl => lbl.value);

                formHTML += `<select id="answer${questionId}" onchange="showTextboxLabels(${questionId}, this.value)">
                              <option value="" disabled selected>Select an option</option>`;
                for (let i = rangeStart; i <= rangeEnd; i++) {
                    formHTML += `<option value="${i}">${i}</option>`;
                }
                formHTML += `</select><br>
                             <div id="labelContainer${questionId}"></div>
                             <script>
                                 var labels${questionId} = ${JSON.stringify(labelValues)};
                                 function showTextboxLabels(qId, count) {
                                     const container = document.getElementById('labelContainer' + qId);
                                     container.innerHTML = '';
                                     for (let j = 1; j <= count; j++) {
                                         labels${questionId}.forEach(function(label) {
                                             const inputId = label.replace(/\\s+/g, '') + j;
                                             container.innerHTML += '<input type="text" id="' + inputId + '" name="' + inputId + '" placeholder="' + label + ' ' + j + '" style="text-align:center;"><br>';
                                         });
                                     }
                                 }
                             </script>`;

            } else if (questionType === 'multipleTextboxes') {
                // multiple text fields
                const multiBlocks = questionBlock.querySelectorAll(`#multipleTextboxesOptions${questionId} > div`);
                multiBlocks.forEach((divEl, idx) => {
                    const labelInput = divEl.querySelector(`#multipleTextboxLabel${questionId}_${idx + 1}`);
                    const nameIdInput = divEl.querySelector(`#multipleTextboxName${questionId}_${idx + 1}`);
                    const placeholderInput = divEl.querySelector(`#multipleTextboxPlaceholder${questionId}_${idx + 1}`);

                    const labelText = labelInput.value.trim();
                    const nameId = nameIdInput.value || `answer${questionId}_${idx + 1}`;
                    const placeholder = placeholderInput.value || '';

                    if (labelText) formHTML += `<label><h3>${labelText}</h3></label><br>`;
                    formHTML += `<input type="text" id="${nameId}" name="${nameId}" placeholder="${placeholder}" style="text-align:center;"><br>`;
                });

            } else if (questionType === 'money') {
                // numeric input
                const nameId = questionBlock.querySelector(`#textboxName${questionId}`).value || `answer${questionId}`;
                const placeholder = questionBlock.querySelector(`#textboxPlaceholder${questionId}`).value || 'Enter amount';
                questionNameIds[questionId] = nameId;
                formHTML += `<input type="number" id="${nameId}" name="${nameId}" min="0" step="0.01" placeholder="${placeholder}"><br>`;

            } else if (questionType === 'date') {
                // date input
                formHTML += `<input type="date" id="answer${questionId}" name="answer${questionId}" placeholder="Enter a date"><br>`;
            }

            // Close question container
            formHTML += `</div>`;

            // If multiple-OR logic is enabled, generate a script to show/hide
            if (logicEnabled) {
                const logicRows = questionBlock.querySelectorAll('.logic-condition-row');
                if (logicRows.length > 0) {
                    formHTML += `
                    <script>
                        (function(){
                            var thisQ = document.getElementById('question-container-${questionId}');
                            function updateVisibility() {
                                var anyMatch = false;
                    `;
                    logicRows.forEach((row, idx) => {
                        const rowIndex = idx + 1;
                        const prevQNum = row.querySelector(`#prevQuestion${questionId}_${rowIndex}`)?.value.trim() || "";
                        const prevAnswer = row.querySelector(`#prevAnswer${questionId}_${rowIndex}`)?.value.trim().toLowerCase() || "";
                        if (!prevQNum || !prevAnswer) return;

                        const pType = questionTypesMap[prevQNum] || 'text';
                        formHTML += `
                                (function checkCond${idx}(){
                                    var cPrevType = '${pType}';
                                    var cPrevAns = '${prevAnswer}';
                                    var cPrevQNum = '${prevQNum}';
                                    if (cPrevType === 'checkbox') {
                                        var cbs = document.querySelectorAll('input[id^="answer' + cPrevQNum + '_"]');
                                        var checkedVals = [];
                                        cbs.forEach(cb => { if(cb.checked) checkedVals.push(cb.value.trim().toLowerCase()); });
                                        if (checkedVals.includes(cPrevAns)) {
                                            anyMatch = true;
                                        }
                                    } else {
                                        var el = document.getElementById('answer' + cPrevQNum) || document.getElementById(questionNameIds[cPrevQNum]);
                                        if (el) {
                                            var val = el.value.trim().toLowerCase();
                                            if (val === cPrevAns) {
                                                anyMatch = true;
                                            }
                                        }
                                    }
                                })();
                        `;
                    });
                    formHTML += `
                                if (anyMatch) {
                                    thisQ.classList.remove('hidden');
                                } else {
                                    thisQ.classList.add('hidden');
                                }
                            }
                    `;
                    logicRows.forEach((row, idx) => {
                        const rowIndex = idx + 1;
                        const prevQNum = row.querySelector(`#prevQuestion${questionId}_${rowIndex}`)?.value.trim() || "";
                        const pType = questionTypesMap[prevQNum] || 'text';
                        if (!prevQNum) return;

                        if (pType === 'checkbox') {
                            formHTML += `
                            (function attachEvent${idx}(){
                                var cbs = document.querySelectorAll('input[id^="answer${prevQNum}_"]');
                                cbs.forEach(cb => cb.addEventListener('change', updateVisibility));
                            })();
                            `;
                        } else {
                            formHTML += `
                            (function attachEvent${idx}(){
                                var singleEl = document.getElementById('answer${prevQNum}') || document.getElementById(questionNameIds['${prevQNum}']);
                                if (singleEl) {
                                    singleEl.addEventListener('change', updateVisibility);
                                }
                            })();
                            `;
                        }
                    });
                    formHTML += `
                            updateVisibility();
                        })();
                    </script>
                    `;
                }
            }
        }); // end forEach question

        // Section navigation
        formHTML += `<br><br><div class="navigation-buttons">`;
        if (s > 1) {
            formHTML += `<button type="button" onclick="navigateSection(${s - 1})">Back</button>`;
        }
        if (s === sectionCounter - 1) {
            formHTML += `<button type="submit">Submit</button>`;
        } else {
            formHTML += `<button type="button" onclick="handleNext(${s})">Next</button>`;
        }
        formHTML += `</div>`; // end nav buttons
        formHTML += `</div>`; // end section
    }

    // Insert hidden fields (with "Add Calculation" logic)
    const {
        hiddenFieldsHTML,
        autofillMappings,
        conditionalAutofillLogic,
        hiddenCheckboxCalculations
    } = generateHiddenPDFFields();

    // Append these hidden fields to the form
    formHTML += hiddenFieldsHTML;

    // Close form
    formHTML += `
            </form>
            <div id="thankYouMessage" class="thank-you-message">Thank you for completing the survey</div>
        </div>
        </section>
    </div>
    <footer>
        &copy; 2024 FormWiz. All rights reserved.
    </footer>

    <script>
        // -----------------------------------------
        // Firebase initialization (if used)
        // -----------------------------------------
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
        const formId = urlParams.get('formId');
        let userId = null;

        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                userId = user.uid;
            } else {
                console.log("User not logged in.");
                window.location.href = 'account.html';
            }
        });

        // questionNameIds used for logic & jump
        var questionNameIds = ${JSON.stringify(questionNameIds)};
        // jumpLogics
        var jumpLogics = ${JSON.stringify(jumpLogics)};
        // conditional PDFs
        var conditionalPDFs = ${JSON.stringify(conditionalPDFs)};
        // conditional alerts
        var conditionalAlerts = ${JSON.stringify(conditionalAlerts)};

        // For "Next" button w/ jump logic
        function handleNext(currentSection) {
            let nextSection = currentSection + 1;
            const relevantJumps = jumpLogics.filter(j => j.section == currentSection);

            for (let jlogic of relevantJumps) {
                const { questionId, questionType, jumpOption, jumpTo } = jlogic;
                const nameId = questionNameIds[questionId] || ('answer' + questionId);

                if (questionType === 'radio' || questionType === 'dropdown') {
                    const el = document.getElementById(nameId);
                    if (el && el.value.trim().toLowerCase() === jumpOption.trim().toLowerCase()) {
                        nextSection = jumpTo;
                        break;
                    }
                } else if (questionType === 'checkbox') {
                    const cbs = document.querySelectorAll('input[id^="answer' + questionId + '_"]');
                    if (cbs && cbs.length) {
                        const chosen = [];
                        cbs.forEach(cb => {
                            if (cb.checked) chosen.push(cb.value.trim().toLowerCase());
                        });
                        if (chosen.includes(jumpOption.trim().toLowerCase())) {
                            nextSection = jumpTo;
                            break;
                        }
                    }
                }
            }
            navigateSection(nextSection);

            // Also run calculations so they update after user clicks Next
            runAllHiddenCheckboxCalculations();
        }

        function navigateSection(sectionNumber) {
            const sections = document.querySelectorAll('.section');
            sections.forEach(sec => sec.classList.remove('active'));
            const target = document.getElementById('section' + sectionNumber);
            if (target) {
                target.classList.add('active');
            } else {
                // if user typed 'end' or invalid
                sections[sections.length - 1].classList.add('active');
            }
        }

        // set date field
        function setCurrentDate() {
            var today = new Date();
            var dd = String(today.getDate()).padStart(2, '0');
            var mm = String(today.getMonth() + 1).padStart(2, '0');
            var yyyy = today.getFullYear();
            today = yyyy + '-' + mm + '-' + dd;
            document.getElementById('current_date').value = today;
        }
        window.onload = function() {
            setCurrentDate();
            // attach calculation listeners so hidden checkboxes update in real-time
            attachCalculationListeners();
        };

        // conditional alerts
        function handleConditionalAlerts() {
            conditionalAlerts.forEach(alertObj => {
                const { prevQuestionId, prevAnswer, alertText } = alertObj;
                const prevQEl = document.getElementById('answer' + prevQuestionId);
                if (prevQEl) {
                    if (prevQEl.value.trim().toLowerCase() === prevAnswer.trim().toLowerCase()) {
                        alert(alertText);
                    }
                } else {
                    // check a checkbox group
                    const cbs = document.querySelectorAll('[name^="answer' + prevQuestionId + '_"]');
                    cbs.forEach(cb => {
                        if (cb.checked && cb.value.trim().toLowerCase() === prevAnswer.trim().toLowerCase()) {
                            alert(alertText);
                        }
                    });
                }
            });
        }

        // On form submit
        function showThankYouMessage() {
            const pdfName = '${escapedPdfFormName}'.replace('.pdf', '');
            editAndDownloadPDF(pdfName).then(() => {
                // handle conditional PDFs
                conditionalPDFs.forEach(pdfObj => {
                    if (pdfObj.questionType === 'checkbox') {
                        const cbox = document.getElementById(pdfObj.questionNameId);
                        if (cbox && cbox.checked && cbox.value === pdfObj.conditionalAnswer) {
                            editAndDownloadPDF(pdfObj.pdfName.replace('.pdf',''));
                        }
                    } else {
                        const val = document.getElementById(pdfObj.questionNameId)?.value || '';
                        if (val === pdfObj.conditionalAnswer) {
                            editAndDownloadPDF(pdfObj.pdfName.replace('.pdf',''));
                        }
                    }
                });
                handleConditionalAlerts();
                document.getElementById('customForm').style.display = 'none';
                document.getElementById('thankYouMessage').style.display = 'block';
            });
            return false;
        }

        // PDF generation logic
        function downloadPDF(url, filename) {
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        async function editAndDownloadPDF(pdfName) {
            const formData = new FormData();
            document.querySelectorAll('#questions input, #questions select, #questions textarea').forEach(inp => {
                if (inp.type === 'checkbox') {
                    formData.append(inp.name, inp.checked ? 'Yes' : 'No');
                } else {
                    formData.append(inp.name, inp.value);
                }
            });
            return fetch('/edit_pdf?pdf=' + pdfName, { method: 'POST', body: formData })
                .then(res => res.blob())
                .then(blob => {
                    const url = URL.createObjectURL(blob);
                    downloadPDF(url, 'Edited_' + pdfName + '.pdf');
                });
        }

        /***********************************************
         * Hidden Checkbox Calculations
         ***********************************************/
        // We overwrite this var from generateHiddenPDFFields
        var hiddenCheckboxCalculations = ${JSON.stringify([])};

        // Evaluate all calculations at once
        function runAllHiddenCheckboxCalculations() {
            if (!hiddenCheckboxCalculations || hiddenCheckboxCalculations.length === 0) return;
            hiddenCheckboxCalculations.forEach(calcObj => {
                runSingleHiddenCheckboxCalculation(calcObj);
            });
        }

        // Evaluate one hidden checkbox's calculations
        function runSingleHiddenCheckboxCalculation(calcObj) {
            // calcObj = {
            //   hiddenFieldName: "someCheckboxName",
            //   calculations: [ {questionNameId, operator, threshold, result}, ... ]
            // }
            const hiddenCheckbox = document.getElementById(calcObj.hiddenFieldName);
            if (!hiddenCheckbox) return;

            // If multiple calculations exist, the last matching condition “wins.”
            let finalState = hiddenCheckbox.checked; // start from whatever
            calcObj.calculations.forEach(c => {
                const qEl = document.getElementById(c.questionNameId);
                if (!qEl) return;
                const val = parseFloat(qEl.value) || 0;

                let isMatch = false;
                if (c.operator === '=') {
                    isMatch = (val === parseFloat(c.threshold));
                } else if (c.operator === '<') {
                    isMatch = (val < parseFloat(c.threshold));
                } else if (c.operator === '>') {
                    isMatch = (val > parseFloat(c.threshold));
                }

                if (isMatch) {
                    finalState = (c.result === 'checked');
                } else {
                    // If it doesn't match, do nothing special.
                    // (But if you wanted it “unmatched => unchecked,” you'd do so here.)
                }
            });
            hiddenCheckbox.checked = finalState;
        }

        // Attach `change` listeners to each money question used in calculations
        function attachCalculationListeners() {
            hiddenCheckboxCalculations.forEach(calcObj => {
                calcObj.calculations.forEach(c => {
                    const qEl = document.getElementById(c.questionNameId);
                    if (qEl) {
                        qEl.addEventListener('change', () => {
                            runAllHiddenCheckboxCalculations();
                        });
                    }
                });
            });
        }
    </script>
    </body>
    </html>
    `;

    return formHTML;
}

/**
 * Reads all hidden fields from the DOM (#hiddenFieldsContainer)
 * and returns an object containing:
 *   - hiddenFieldsHTML: the actual <input> elements (hidden or style=none)
 *   - hiddenCheckboxCalculations: array of calculation rules
 */
function generateHiddenPDFFields() {
    // We’ll hide the entire hidden fields block with style="display:none;"
    let hiddenFieldsHTML = `<div id="hidden_pdf_fields" style="display:none;">`;
    let autofillMappings = [];
    let conditionalAutofillLogic = '';
    let hiddenCheckboxCalculations = [];

    const hiddenFieldsContainer = document.getElementById('hiddenFieldsContainer');
    if (hiddenFieldsContainer) {
        const hiddenFieldBlocks = hiddenFieldsContainer.querySelectorAll('.hidden-field-block');
        hiddenFieldBlocks.forEach(fieldBlock => {
            const hiddenFieldId = fieldBlock.id.replace('hiddenFieldBlock', '');
            const fieldType = document.getElementById(`hiddenFieldType${hiddenFieldId}`).value;
            const fieldName = (document.getElementById(`hiddenFieldName${hiddenFieldId}`).value || '').trim();
            if (!fieldName) return;

            if (fieldType === 'text') {
                hiddenFieldsHTML += `
                    <input type="text" id="${fieldName}" name="${fieldName}" placeholder="${fieldName}">
                `;
                // (Optional: handle text conditions or autofill if you like.)

            } else if (fieldType === 'checkbox') {
                const checkedByDefault = document.getElementById(`hiddenFieldChecked${hiddenFieldId}`).checked;
                // Render it hidden with style
                hiddenFieldsHTML += `
                    <div style="display:none;">
                        <label class="checkbox-label">
                            <input type="checkbox" id="${fieldName}" name="${fieldName}" ${checkedByDefault ? 'checked' : ''}>
                            ${fieldName}
                        </label>
                    </div>
                `;

                // Gather “Add Calculation” rows
                const calculationBlock = fieldBlock.querySelector(`#calculationBlock${hiddenFieldId}`);
                if (!calculationBlock) return;

                const calcRows = calculationBlock.querySelectorAll(`div[id^="calculationRow"]`);
                if (calcRows.length > 0) {
                    let calcArray = [];
                    calcRows.forEach(row => {
                        const rowId = row.id.split('_')[1]; // e.g. "calculationRow7_1" => "1"
                        const questionNameId = document.getElementById(`calcQuestion${hiddenFieldId}_${rowId}`).value;
                        const operator = document.getElementById(`calcOperator${hiddenFieldId}_${rowId}`).value;
                        const threshold = document.getElementById(`calcThreshold${hiddenFieldId}_${rowId}`).value;
                        const result = document.getElementById(`calcResult${hiddenFieldId}_${rowId}`).value;
                        if (questionNameId && operator && threshold !== '') {
                            calcArray.push({
                                questionNameId,
                                operator,
                                threshold,
                                result
                            });
                        }
                    });
                    if (calcArray.length > 0) {
                        hiddenCheckboxCalculations.push({
                            hiddenFieldName: fieldName,
                            calculations: calcArray
                        });
                    }
                }
            }
        });
    }

    hiddenFieldsHTML += `</div>`; // close #hidden_pdf_fields

    return {
        hiddenFieldsHTML,
        autofillMappings,
        conditionalAutofillLogic,
        hiddenCheckboxCalculations
    };
}
