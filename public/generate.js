/*********************************************
 * generate.js - MULTIPLE OR-CONDITIONS VERSION
 *********************************************/

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
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
    <div id="questions">
        <div id="result"></div>
        <section>
        <div id="box">
            <form id="customForm" onsubmit="return showThankYouMessage();">
    `;

    // We track single-element question IDs to help us attach logic
    let questionNameIds = {};
    // We also track question types. e.g. questionTypesMap[questionId] = "checkbox"
    let questionTypesMap = {};

    // For conditional PDFs & alerts
    let conditionalPDFs = [];
    let conditionalAlerts = [];

    // For jump logic (the new approach)
    // We'll store an array of objects, one for each question with jump logic
    // { questionId, questionNameId, jumpOption, jumpTo, section, questionType }
    let jumpLogics = [];

    // Possibly read a PDF name if user typed it, else default
    const pdfFormNameInput = document.getElementById('formPDFName')
        ? document.getElementById('formPDFName').value.trim()
        : '';
    const pdfFormName = pdfFormNameInput || 'default.pdf';
    const escapedPdfFormName = pdfFormName
        .replace(/\\/g, '\\\\')
        .replace(/'/g, '\\\'')
        .replace(/"/g, '\\"');

    // Build each section
    for (let s = 1; s < sectionCounter; s++) {
        const sectionBlock = document.getElementById(`sectionBlock${s}`);
        if (!sectionBlock) continue;

        const sectionNameInput = sectionBlock.querySelector(`#sectionName${s}`);
        const sectionName = sectionNameInput ? sectionNameInput.value : `Section ${s}`;

        // Start the section
        formHTML += `<div id="section${s}" class="section${s === 1 ? ' active' : ''}">`;
        formHTML += `<h2>${sectionName}</h2>`;

        // For each question in that section
        const questionsSection = sectionBlock.querySelectorAll('.question-block');
        questionsSection.forEach((questionBlock) => {
            const questionId = questionBlock.id.replace('questionBlock', '');
            const questionText = questionBlock.querySelector(`#question${questionId}`).value;
            const questionType = questionBlock.querySelector(`#questionType${questionId}`).value;

            questionTypesMap[questionId] = questionType;

            // Check logic
            const logicEnabled = questionBlock.querySelector(`#logic${questionId}`).checked;

            // Jump logic
            const jumpEnabled = questionBlock.querySelector(`#enableJump${questionId}`).checked;
            const jumpTo = questionBlock.querySelector(`#jumpTo${questionId}`).value;
            const jumpOption = questionBlock.querySelector(`#jumpOption${questionId}`).value;

            // If jump is enabled, store it for later processing
            if (jumpEnabled && jumpTo) {
                // We'll fill in the questionNameId below if needed
                jumpLogics.push({
                    questionId,
                    questionNameId: '', // We'll populate after we know the actual name
                    jumpOption,
                    jumpTo,
                    section: s,
                    questionType
                });
            }

            // Conditional PDF
            const conditionalPDFEnabled = questionBlock.querySelector(`#enableConditionalPDF${questionId}`)?.checked;
            const conditionalPDFName = questionBlock.querySelector(`#conditionalPDFName${questionId}`)?.value;
            const conditionalPDFAnswer = questionBlock.querySelector(`#conditionalPDFAnswer${questionId}`)?.value;

            // Conditional Alert
            const conditionalAlertEnabled = questionBlock.querySelector(`#enableConditionalAlert${questionId}`)?.checked;
            const alertPrevQuestion = questionBlock.querySelector(`#alertPrevQuestion${questionId}`)?.value;
            const alertPrevAnswer = questionBlock.querySelector(`#alertPrevAnswer${questionId}`)?.value;
            const alertText = questionBlock.querySelector(`#alertText${questionId}`)?.value;
            if (conditionalAlertEnabled && alertPrevQuestion && alertPrevAnswer && alertText) {
                conditionalAlerts.push({
                    questionId: questionId,
                    prevQuestionId: alertPrevQuestion,
                    prevAnswer: alertPrevAnswer,
                    alertText: alertText
                });
            }

            // Build the question container
            formHTML += `<div id="question-container-${questionId}" ${logicEnabled ? 'class="hidden"' : ''}>`;
            formHTML += `<label><h3>${questionText}</h3></label>`;

            // Now create the actual question input(s)
            if (questionType === 'text') {
                // single text input
                const nameId = questionBlock.querySelector(`#textboxName${questionId}`).value || `answer${questionId}`;
                const placeholder = questionBlock.querySelector(`#textboxPlaceholder${questionId}`).value || '';
                questionNameIds[questionId] = nameId; // store for later
                formHTML += `<input type="text" id="${nameId}" name="${nameId}" placeholder="${placeholder}"><br><br>`;

            } else if (questionType === 'bigParagraph') {
                const nameId = questionBlock.querySelector(`#textboxName${questionId}`).value || `answer${questionId}`;
                const placeholder = questionBlock.querySelector(`#textboxPlaceholder${questionId}`).value || '';
                questionNameIds[questionId] = nameId;
                formHTML += `<textarea id="${nameId}" name="${nameId}" rows="5" cols="50" placeholder="${placeholder}"></textarea><br>`;

            } else if (questionType === 'radio') {
                const nameId = questionBlock.querySelector(`#textboxName${questionId}`).value || `answer${questionId}`;
                questionNameIds[questionId] = nameId;
                // Only 2 radio options: "Yes"/"No"
                formHTML += `
                    <select id="${nameId}" name="${nameId}">
                        <option value="" disabled selected>Select an option</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select><br>
                `;
                // If PDF logic is enabled, store in conditionalPDFs
                if (conditionalPDFEnabled) {
                    conditionalPDFs.push({
                        questionId: questionId,
                        questionNameId: nameId,
                        conditionalAnswer: conditionalPDFAnswer,
                        pdfName: conditionalPDFName,
                        questionType: questionType
                    });
                }

            } else if (questionType === 'dropdown') {
                const nameId = questionBlock.querySelector(`#textboxName${questionId}`).value || `answer${questionId}`;
                questionNameIds[questionId] = nameId;

                formHTML += `<select id="${nameId}" name="${nameId}">`;
                formHTML += `<option value="" disabled selected>Select an option</option>`;

                // Gather the dropdown options from the DOM
                const optionInputs = questionBlock.querySelectorAll('#dropdownOptions' + questionId + ' input');
                optionInputs.forEach(input => {
                    const val = input.value;
                    formHTML += `<option value="${val}">${val}</option>`;
                });

                formHTML += `</select><br>`;

            } else if (questionType === 'checkbox') {
                // Gather the <div> elements that contain each checkbox option
                const optionsDivs = questionBlock.querySelectorAll(`#checkboxOptions${questionId} > div`);
                const checkboxOptions = [];

                formHTML += `<div><center><div id="checkmark">`;

                optionsDivs.forEach((optionDiv, index) => {
                    const optTextEl = optionDiv.querySelector(`#checkboxOptionText${questionId}_${index + 1}`);
                    const optNameEl = optionDiv.querySelector(`#checkboxOptionName${questionId}_${index + 1}`);
                    const optValueEl = optionDiv.querySelector(`#checkboxOptionValue${questionId}_${index + 1}`);

                    let optionText = optTextEl ? optTextEl.value.trim() : `Option ${index + 1}`;
                    let optionNameId = optNameEl ? optNameEl.value.trim() : "";
                    let optionValue = optValueEl ? optValueEl.value.trim() : "";

                    // Force a consistent prefix: "answer<questionId>_"
                    const forcedPrefix = `answer${questionId}_`;
                    if (!optionNameId) {
                        const sanitized = optionText.replace(/\W+/g, "_").toLowerCase();
                        optionNameId = forcedPrefix + sanitized;
                    } else {
                        // ensure it starts with forcedPrefix
                        if (!optionNameId.startsWith(forcedPrefix)) {
                            optionNameId = forcedPrefix + optionNameId;
                        }
                    }
                    // If value is blank, default to label
                    if (!optionValue) {
                        optionValue = optionText;
                    }

                    checkboxOptions.push({ optionText, optionNameId, optionValue });

                    // Render the checkbox
                    formHTML += `
                        <span class="checkbox-inline">
                            <label class="checkbox-label">
                                <input type="checkbox" id="${optionNameId}" name="${optionNameId}" value="${optionValue}">
                                ${optionText}
                            </label>
                        </span>
                    `;
                });

                // If "None of the above" is included
                const noneOfTheAboveSelected = questionBlock.querySelector(`#noneOfTheAbove${questionId}`).checked;
                if (noneOfTheAboveSelected) {
                    const optionText = 'None of the above';
                    const forcedPrefix = `answer${questionId}_`;
                    const sanitized = optionText.replace(/\W+/g, "_").toLowerCase();
                    const optionNameId = forcedPrefix + sanitized;
                    const optionValue = optionText;

                    checkboxOptions.push({ optionText, optionNameId, optionValue });

                    formHTML += `
                        <span class="checkbox-inline">
                            <label class="checkbox-label">
                                <input type="checkbox" id="${optionNameId}" name="${optionNameId}" value="${optionValue}">
                                ${optionText}
                            </label>
                        </span>
                    `;
                }

                formHTML += `</div><br></div>`; // end #checkmark

                // If conditional PDF is enabled, see if we have a matching option
                if (conditionalPDFEnabled) {
                    const matchingOption = checkboxOptions.find(opt => opt.optionText === conditionalPDFAnswer);
                    if (matchingOption) {
                        conditionalPDFs.push({
                            questionId,
                            questionNameId: matchingOption.optionNameId,
                            conditionalAnswer: matchingOption.optionValue,
                            pdfName: conditionalPDFName,
                            questionType
                        });
                    }
                }

            } else if (questionType === 'numberedDropdown') {
                // e.g. 1..n
                const rangeStart = questionBlock.querySelector(`#numberRangeStart${questionId}`).value;
                const rangeEnd = questionBlock.querySelector(`#numberRangeEnd${questionId}`).value;
                const labels = questionBlock.querySelectorAll(`#textboxLabels${questionId} input`);
                const labelValues = Array.from(labels).map(label => label.value);

                formHTML += `<select id="answer${questionId}" onchange="showTextboxLabels(${questionId}, this.value)">
                                <option value="" disabled selected>Select an option</option>`;
                for (let i = rangeStart; i <= rangeEnd; i++) {
                    formHTML += `<option value="${i}">${i}</option>`;
                }
                formHTML += `</select><br>
                             <div id="labelContainer${questionId}"></div>
                             <script>
                                 var labels${questionId} = ${JSON.stringify(labelValues)};
                                 function showTextboxLabels(questionId, count) {
                                     const container = document.getElementById('labelContainer' + questionId);
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
                multiBlocks.forEach((optionDiv, index) => {
                    const labelInput = optionDiv.querySelector(`#multipleTextboxLabel${questionId}_${index + 1}`);
                    const nameIdInput = optionDiv.querySelector(`#multipleTextboxName${questionId}_${index + 1}`);
                    const placeholderInput = optionDiv.querySelector(`#multipleTextboxPlaceholder${questionId}_${index + 1}`);

                    const labelText = labelInput.value.trim();
                    const nameId = nameIdInput.value || `answer${questionId}_${index + 1}`;
                    const placeholder = placeholderInput.value || '';

                    if (labelText) {
                        formHTML += `<label><h3>${labelText}</h3></label><br>`;
                    }
                    formHTML += `<input type="text" id="${nameId}" name="${nameId}" placeholder="${placeholder}" style="text-align:center;"><br>`;
                });

            } else if (questionType === 'money') {
                // use the Name/ID and placeholder from the textboxOptions
                const nameId = questionBlock.querySelector(`#textboxName${questionId}`).value || `answer${questionId}`;
                const placeholder = questionBlock.querySelector(`#textboxPlaceholder${questionId}`).value || 'Enter amount';
                questionNameIds[questionId] = nameId;
                formHTML += `<input type="number" id="${nameId}" name="${nameId}" min="0" step="0.01" placeholder="${placeholder}"><br>`;

            } else if (questionType === 'date') {
                formHTML += `<input type="date" id="answer${questionId}" name="answer${questionId}" placeholder="Enter a date"><br>`;
            }

            // Close question container
            formHTML += `</div>`;

            // =============== MULTIPLE OR LOGIC ===============
            if (logicEnabled) {
                // We'll find all .logic-condition-row for this question
                const logicRows = questionBlock.querySelectorAll(`.logic-condition-row`);
                if (logicRows.length > 0) {
                    // Start building a script that checks them in OR fashion
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
                        if (!prevQNum || !prevAnswer) return; // skip incomplete

                        const pType = questionTypesMap[prevQNum] || 'text';

                        formHTML += `
                                (function checkCond${idx}(){
                                    var cPrevType = '${pType}';
                                    var cPrevA = '${prevAnswer}';
                                    var cPrevQNum = '${prevQNum}';
                                    if (cPrevType === 'checkbox') {
                                        // check all checkboxes
                                        var cbs = document.querySelectorAll('input[id^="answer' + cPrevQNum + '_"]');
                                        var checkedVals = [];
                                        cbs.forEach(cb => { if(cb.checked) checkedVals.push(cb.value.trim().toLowerCase()); });
                                        if (checkedVals.includes(cPrevA)) {
                                            anyMatch = true;
                                        }
                                    } else {
                                        // single-element
                                        var el = document.getElementById('answer' + cPrevQNum);
                                        if (el) {
                                            var val = el.value.trim().toLowerCase();
                                            if (val === cPrevA) {
                                                anyMatch = true;
                                            }
                                        }
                                    }
                                })();
                        `;
                    });

                    // Conclude the script
                    formHTML += `
                                if (anyMatch) {
                                    thisQ.classList.remove('hidden');
                                } else {
                                    thisQ.classList.add('hidden');
                                }
                            }
                    `;

                    // Add event listeners
                    logicRows.forEach((row, idx) => {
                        const rowIndex = idx + 1;
                        const prevQNum = row.querySelector(`#prevQuestion${questionId}_${rowIndex}`)?.value.trim() || "";
                        const pType = questionTypesMap[prevQNum] || 'text';
                        if (!prevQNum) return;

                        if (pType === 'checkbox') {
                            formHTML += `
                            (function attachEvent${idx}(){
                                var cbs = document.querySelectorAll('input[id^="answer${prevQNum}_"]');
                                cbs.forEach(cb => { cb.addEventListener('change', updateVisibility); });
                            })();
                            `;
                        } else {
                            formHTML += `
                            (function attachEvent${idx}(){
                                var singleEl = document.getElementById('answer${prevQNum}');
                                if (singleEl) {
                                    singleEl.addEventListener('change', updateVisibility);
                                }
                            })();
                            `;
                        }
                    });

                    // run once
                    formHTML += `
                            updateVisibility();
                        })();
                    </script>
                    `;
                }
            }
        }); // end forEach question

        // Now the section-level navigation
        formHTML += `<br><br><div class="navigation-buttons">`;
        if (s > 1) {
            formHTML += `<button type="button" onclick="navigateSection(${s - 1})">Back</button>`;
        }
        if (s === sectionCounter - 1) {
            formHTML += `<button type="submit">Submit</button>`;
        } else {
            formHTML += `<button type="button" onclick="handleNext(${s})">Next</button>`;
        }
        formHTML += `</div>`; // close navigation-buttons

        // Close the section
        formHTML += `</div>`;
    }

    // Insert any hidden fields
    const { hiddenFieldsHTML, autofillMappings, conditionalAutofillLogic } = generateHiddenPDFFields();
    formHTML += hiddenFieldsHTML;

    // Finish the form & page
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

        function saveFormData(sectionId) {
            // Example of saving data
            const formData = {};
            const inputs = document.querySelectorAll('#' + sectionId + ' input, #' + sectionId + ' select, #' + sectionId + ' textarea');
            inputs.forEach(input => {
                if (input.tagName === 'INPUT' && input.type === 'checkbox') {
                    formData[input.name] = input.checked;
                } else {
                    formData[input.name] = input.value;
                }
            });
        }
        function loadFormData(sectionId) {
            // omitted for brevity
        }
        function autoSaveForm(sectionId) {
            const inputs = document.querySelectorAll('#' + sectionId + ' input, #' + sectionId + ' select, #' + sectionId + ' textarea');
            inputs.forEach(input => {
                // input.addEventListener('change', () => saveFormData(sectionId));
            });
        }

        // We'll re-inject our jumpLogics array below
        var jumpLogics = ${JSON.stringify(jumpLogics)};

        // We'll also store the questionNameIds map
        var questionNameIds = ${JSON.stringify(questionNameIds)};

        function handleNext(currentSection) {
            // Check if we have any jump logic in this section
            // If the user has selected the jumpOption, we jump to jumpTo
            // otherwise we just go to the next section.

            // 1) default next section = currentSection + 1
            let nextSection = currentSection + 1;

            // 2) find all jumpLogics for questions that live in the currentSection
            const relevantJumps = jumpLogics.filter(j => j.section == currentSection);

            // 3) for each jump logic, check if user choice matches jumpOption
            for (let i = 0; i < relevantJumps.length; i++) {
                const jlogic = relevantJumps[i];
                const { questionId, questionType, jumpOption, jumpTo } = jlogic;
                const nameId = questionNameIds[questionId] || ('answer' + questionId);

                if (questionType === 'radio' || questionType === 'dropdown') {
                    const el = document.getElementById(nameId);
                    if (el && el.value.trim().toLowerCase() === jumpOption.trim().toLowerCase()) {
                        nextSection = jumpTo;
                        break; // use the first matching jump
                    }
                } else if (questionType === 'checkbox') {
                    // gather all checkboxes for that question
                    const cbs = document.querySelectorAll('input[id^="answer' + questionId + '_"]');
                    if (cbs && cbs.length > 0) {
                        const selectedValues = [];
                        cbs.forEach(cb => {
                            if (cb.checked) selectedValues.push(cb.value.trim().toLowerCase());
                        });
                        if (selectedValues.includes(jumpOption.trim().toLowerCase())) {
                            nextSection = jumpTo;
                            break; // use the first matching jump
                        }
                    }
                }
            }

            navigateSection(nextSection);
        }

        function navigateSection(sectionNumber) {
            const sections = document.querySelectorAll('.section');
            sections.forEach(section => section.classList.remove('active'));
            const target = document.getElementById('section' + sectionNumber);
            if (target) {
                target.classList.add('active');
            } else {
                // If user typed 'end' or a non-existing section
                // We'll just show the final section or do something else
                console.log("Tried to jump to an invalid section: " + sectionNumber);
                // fallback: show last
                sections[sections.length - 1].classList.add('active');
            }
        }

        var pdfFormName = '${escapedPdfFormName}';
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
            document.querySelectorAll('#questions input, #questions select, #questions textarea').forEach(input => {
                if (input.type === 'checkbox') {
                    formData.append(input.name, input.checked ? 'Yes' : 'No');
                } else {
                    formData.append(input.name, input.value);
                }
            });
            return fetch('/edit_pdf?pdf=' + pdfName, { method: 'POST', body: formData })
                .then(response => response.blob())
                .then(blob => {
                    const url = URL.createObjectURL(blob);
                    downloadPDF(url, 'Edited_' + pdfName + '.pdf');
                });
        }
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
        };

        // conditional PDF array from question logic
        var conditionalPDFs = ${JSON.stringify(conditionalPDFs)};

        // conditional alerts array
        var conditionalAlerts = ${JSON.stringify(conditionalAlerts)};
        function handleConditionalAlerts() {
            conditionalAlerts.forEach(function(alertObj) {
                const prevQuestionNameId = 'answer' + alertObj.prevQuestionId;
                const prevQuestionElement = document.getElementById(prevQuestionNameId);
                if (prevQuestionElement) {
                    const userAnswer = prevQuestionElement.value;
                    if (userAnswer.trim().toLowerCase() === alertObj.prevAnswer.trim().toLowerCase()) {
                        alert(alertObj.alertText);
                    }
                } else {
                    // If it's a checkbox
                    const checkboxes = document.querySelectorAll('[name^="answer' + alertObj.prevQuestionId + '_"]');
                    if (checkboxes.length > 0) {
                        checkboxes.forEach(cb => {
                            if (cb.checked && cb.value.trim().toLowerCase() === alertObj.prevAnswer.trim().toLowerCase()) {
                                alert(alertObj.alertText);
                            }
                        });
                    }
                }
            });
        }

        function showThankYouMessage() {
            const pdfName = pdfFormName.replace('.pdf', '');
            editAndDownloadPDF(pdfName).then(() => {
                // handle conditional PDFs
                conditionalPDFs.forEach(function(conditionalPDF) {
                    if (conditionalPDF.questionType === 'checkbox') {
                        const checkboxInput = document.getElementById(conditionalPDF.questionNameId);
                        if (checkboxInput && checkboxInput.checked && checkboxInput.value === conditionalPDF.conditionalAnswer) {
                            editAndDownloadPDF(conditionalPDF.pdfName.replace('.pdf', ''));
                        }
                    } else {
                        // single-element
                        const questionValue = document.getElementById(conditionalPDF.questionNameId).value;
                        if (questionValue === conditionalPDF.conditionalAnswer) {
                            editAndDownloadPDF(conditionalPDF.pdfName.replace('.pdf', ''));
                        }
                    }
                });
                // handle alerts
                handleConditionalAlerts();
                // show thank you
                document.getElementById('customForm').style.display = 'none';
                document.getElementById('thankYouMessage').style.display = 'block';
            });
            return false;
        }
    </` + `script>
    </body>
    </html>
    `;

    return formHTML;
}

/*********************************************
 * The generateHiddenPDFFields function must return
 * an object containing "hiddenFieldsHTML" plus any
 * logic that you want. For brevity, we show a stub:
 *********************************************/
function generateHiddenPDFFields() {
    // In your real code, you'd read from the DOM or data structure.
    // We'll just do an empty stub as an example:

    const hiddenFieldsHTML = ''; // maybe some <input type="hidden" ... >
    const autofillMappings = [];
    const conditionalAutofillLogic = [];

    return { hiddenFieldsHTML, autofillMappings, conditionalAutofillLogic };
}
