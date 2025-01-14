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

    // This map keeps track of each question's final "Name/ID prefix" so we can generate logic for them
    let questionNameIds = {};  // questionNameIds[qId] = e.g. 'answer1_' or 'hungry?'
    let questionTypes = {};    // questionTypes[qId] = 'checkbox' / 'dropdown' / ...
    let conditionalPDFs = [];
    let conditionalAlerts = [];

    // Possibly read PDF name from the user’s input
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

        formHTML += `<div id="section${s}" class="section${s === 1 ? ' active' : ''}">`;
        formHTML += `<h2>${sectionName}</h2>`;

        // Get question-blocks for this section
        const questionsSection = sectionBlock.querySelectorAll('.question-block');
        questionsSection.forEach((questionBlock) => {
            const questionId = questionBlock.id.replace('questionBlock', '');
            const questionText = questionBlock.querySelector(`#question${questionId}`).value;
            const questionType = questionBlock.querySelector(`#questionType${questionId}`).value;
            questionTypes[questionId] = questionType; // store for logic building

            // Check if logic is enabled
            const logicEnabled = questionBlock.querySelector(`#logic${questionId}`).checked;
            const prevQuestionId = questionBlock.querySelector(`#prevQuestion${questionId}`).value;
            const prevAnswer = questionBlock.querySelector(`#prevAnswer${questionId}`).value;

            // Jump logic
            const jumpEnabled = questionBlock.querySelector(`#enableJump${questionId}`).checked;
            const jumpTo = questionBlock.querySelector(`#jumpTo${questionId}`).value;
            const jumpOption = questionBlock.querySelector(`#jumpOption${questionId}`).value;

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
                    questionId,
                    prevQuestionId: alertPrevQuestion,
                    prevAnswer: alertPrevAnswer,
                    alertText
                });
            }

            // Start the container for this question
            // Hide it if logic is enabled by default (we’ll add the code snippet below to toggle it)
            formHTML += `<div id="question-container-${questionId}" ${logicEnabled ? 'class="hidden"' : ''}>`;
            formHTML += `<label><h3>${questionText}</h3></label>`;

            // Based on question type, generate the HTML
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
                // For yes/no
                const nameId = questionBlock.querySelector(`#textboxName${questionId}`).value || `answer${questionId}`;
                questionNameIds[questionId] = nameId;
                formHTML += `
                    <select id="${nameId}" name="${nameId}">
                        <option value="" disabled selected>Select an option</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select><br>
                `;
                // If this question has conditional PDF
                if (conditionalPDFEnabled) {
                    conditionalPDFs.push({
                        questionId,
                        questionNameId: nameId,
                        conditionalAnswer: conditionalPDFAnswer,
                        pdfName: conditionalPDFName,
                        questionType: questionType
                    });
                }

            } else if (questionType === 'dropdown') {
                // typical dropdown
                const nameId = questionBlock.querySelector(`#textboxName${questionId}`).value || `answer${questionId}`;
                questionNameIds[questionId] = nameId;
                formHTML += `<select id="${nameId}" name="${nameId}">`;
                formHTML += `<option value="" disabled selected>Select an option</option>`;
                const options = questionBlock.querySelectorAll(`#dropdownOptions${questionId} input`);
                options.forEach((option) => {
                    formHTML += `<option value="${option.value}">${option.value}</option>`;
                });
                formHTML += `</select><br>`;

            } else if (questionType === 'checkbox') {
                // We have multiple "option" blocks
                const optionsDivs = questionBlock.querySelectorAll(`#checkboxOptions${questionId} > div`);
                let firstOptionNameId = null; // We'll use for logic snippet building
                const checkboxOptions = [];
                formHTML += `<div><center><div id="checkmark">`;

                optionsDivs.forEach((optionDiv, index) => {
                    const optTextEl = optionDiv.querySelector(`#checkboxOptionText${questionId}_${index + 1}`);
                    const optNameEl = optionDiv.querySelector(`#checkboxOptionName${questionId}_${index + 1}`);
                    const optValueEl = optionDiv.querySelector(`#checkboxOptionValue${questionId}_${index + 1}`);

                    const optionText = optTextEl ? optTextEl.value.trim() : `Option ${index + 1}`;
                    let optionNameId = optNameEl ? optNameEl.value.trim() : '';
                    let optionValue = optValueEl ? optValueEl.value.trim() : '';

                    // fallback if user didn't provide name/ID
                    if (!optionNameId) {
                        const sanitized = optionText.replace(/\W+/g, "_").toLowerCase();
                        optionNameId = `answer${questionId}_${sanitized}`;
                    }
                    if (!optionValue) {
                        optionValue = optionText;
                    }

                    if (index === 0) {
                        firstOptionNameId = optionNameId;
                    }

                    checkboxOptions.push({ optionText, optionNameId, optionValue });
                    formHTML += `
                        <span class="checkbox-inline">
                            <label class="checkbox-label">
                                <input type="checkbox" id="${optionNameId}" name="${optionNameId}" value="${optionValue}">
                                ${optionText}
                            </label>
                        </span>
                    `;
                });

                // Maybe "None of the above"
                const noneOfTheAboveSelected = questionBlock.querySelector(`#noneOfTheAbove${questionId}`).checked;
                if (noneOfTheAboveSelected) {
                    const optionText = 'None of the above';
                    const sanitized = optionText.replace(/\W+/g, "_").toLowerCase();
                    const optionNameId = `answer${questionId}_${sanitized}`;
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
                formHTML += `</div><br></div>`; // close checkmark

                // If conditional PDF is enabled
                if (conditionalPDFEnabled) {
                    const matchingOption = checkboxOptions.find(
                        opt => opt.optionText === conditionalPDFAnswer
                    );
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

                // For logic snippet, we must guess a prefix
                // If user typed "hungry?yes" => we do name^="hungry?"
                // If user typed "answer1_yes" => we do name^="answer1_"
                let checkPrefix = '';
                if (firstOptionNameId) {
                    const lastUnderscore = firstOptionNameId.lastIndexOf("_");
                    if (lastUnderscore > 0) {
                        checkPrefix = firstOptionNameId.slice(0, lastUnderscore + 1);
                    } else {
                        // no underscore => use entire name
                        checkPrefix = firstOptionNameId;
                    }
                }
                questionNameIds[questionId] = checkPrefix;

            } else if (questionType === 'multipleTextboxes') {
                // ...
                // same approach for multiple textboxes
                // store questionNameIds[questionId] if needed
                // build <input> for each sub-text
                // omitted for brevity

            } else if (questionType === 'money') {
                formHTML += `<input type="number" id="answer${questionId}" name="answer${questionId}" min="0" step="0.01" placeholder="Enter amount"><br>`;
            } else if (questionType === 'date') {
                formHTML += `<input type="date" id="answer${questionId}" name="answer${questionId}" placeholder="Enter a date"><br>`;
            } else if (questionType === 'numberedDropdown') {
                // ...
                // omitted for brevity
            }

            // close the container
            formHTML += `</div>`;  // #question-container-x

            // Now generate logic snippet if logicEnabled
            if (logicEnabled && prevQuestionId && prevAnswer) {
                const prevQType = questionTypes[prevQuestionId] || 'text';
                if (prevQType === 'checkbox') {
                    // We do multi-check snippet
                    const prefix = questionNameIds[prevQuestionId] || `answer${prevQuestionId}_`;
                    formHTML += `
                    <script>
                    (function() {
                        var thisQ = document.getElementById('question-container-${questionId}');
                        var checkboxes = document.querySelectorAll('input[name^="${prefix}"]');
                        if (!checkboxes || checkboxes.length === 0) return;
                        function updateVisibility() {
                            var checkedVals = [];
                            checkboxes.forEach(cb => {
                                if (cb.checked) checkedVals.push(cb.value.trim().toLowerCase());
                            });
                            if (checkedVals.includes('${prevAnswer.trim().toLowerCase()}')) {
                                thisQ.classList.remove('hidden');
                            } else {
                                thisQ.classList.add('hidden');
                            }
                        }
                        checkboxes.forEach(cb => {
                            cb.addEventListener('change', updateVisibility);
                        });
                    })();
                    </script>
                    `;
                } else {
                    // single-element snippet (for radio/dropdown/text)
                    const prevName = questionNameIds[prevQuestionId] || `answer${prevQuestionId}`;
                    formHTML += `
                    <script>
                    (function(){
                        var thisQ = document.getElementById('question-container-${questionId}');
                        var prevEl = document.getElementById('${prevName}');
                        if (!prevEl) return;
                        function checkVisibility() {
                            var val = (prevEl.value || '').trim().toLowerCase();
                            if (val === '${prevAnswer.trim().toLowerCase()}') {
                                thisQ.classList.remove('hidden');
                            } else {
                                thisQ.classList.add('hidden');
                            }
                        }
                        prevEl.addEventListener('change', checkVisibility);
                    })();
                    </script>
                    `;
                }
            }

            // Jump logic
            if (jumpEnabled && jumpTo) {
                // e.g. if question is radio or dropdown => on change => if val===jumpOption => navigateSection(jumpTo)
                // if question is checkbox => if any of them is checked with jumpOption => navigate
                if (questionType === 'checkbox') {
                    const prefix = questionNameIds[questionId] || `answer${questionId}_`;
                    formHTML += `
                    <script>
                    (function(){
                        var boxes = document.querySelectorAll('input[name^="${prefix}"]');
                        if (!boxes || boxes.length===0) return;
                        function jumpCheck(){
                            var checkedVals = [];
                            boxes.forEach(cb => {
                                if(cb.checked) checkedVals.push(cb.value.trim().toLowerCase());
                            });
                            if (checkedVals.includes('${jumpOption.trim().toLowerCase()}')) {
                                navigateSection(${jumpTo});
                            }
                        }
                        boxes.forEach(cb => {
                            cb.addEventListener('change', jumpCheck);
                        });
                    })();
                    </script>
                    `;
                } else {
                    // single element snippet
                    const nameForJump = questionNameIds[questionId] || `answer${questionId}`;
                    formHTML += `
                    <script>
                    (function(){
                        var el = document.getElementById('${nameForJump}');
                        if(!el) return;
                        el.addEventListener('change', function(){
                            if((el.value||'').trim().toLowerCase() === '${jumpOption.trim().toLowerCase()}'){
                                navigateSection(${jumpTo});
                            }
                        });
                    })();
                    </script>
                    `;
                }
            }
        }); // end each question

        // close out the section
        formHTML += `<br><br><div class="navigation-buttons">`;
        if (s > 1) {
            formHTML += `<button type="button" onclick="navigateSection(${s - 1})">Back</button>`;
        }
        if (s === sectionCounter - 1) {
            formHTML += `<button type="submit">Submit</button>`;
        } else {
            formHTML += `<button type="button" onclick="handleNext(${s})">Next</button>`;
        }
        formHTML += `</div>`; // end navigation
        formHTML += `</div>`; // end #sectionN
    }

    // Insert hidden fields if any
    const { hiddenFieldsHTML, autofillMappings, conditionalAutofillLogic } = generateHiddenPDFFields();
    formHTML += hiddenFieldsHTML;

    // wrap up
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
        // ============= Firebase Init / Auth / etc. =============
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

        // ============= Basic Nav / Save / etc. =============
        function saveFormData(sectionId) {
            // omitted for brevity
        }
        function loadFormData(sectionId) {
            // omitted for brevity
        }
        function autoSaveForm(sectionId) {
            // omitted for brevity
        }
        function handleNext(currentSection) {
            navigateSection(currentSection + 1);
        }
        function navigateSection(sectionNumber) {
            const sections = document.querySelectorAll('.section');
            sections.forEach(sec => sec.classList.remove('active'));
            document.getElementById('section' + sectionNumber).classList.add('active');
        }

        var pdfFormName = '${escapedPdfFormName}';

        // ============= PDF Download Logic =============
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

        // ============= Current Date =============
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

        // ============= Conditional PDFs & Alerts =============
        var conditionalPDFs = ${JSON.stringify(conditionalPDFs)};
        var conditionalAlerts = ${JSON.stringify(conditionalAlerts)};

        function handleConditionalAlerts() {
            conditionalAlerts.forEach(function(alertObj) {
                const prevQuestionNameId = 'answer' + alertObj.prevQuestionId;
                const prevQEl = document.getElementById(prevQuestionNameId);
                if (prevQEl) {
                    const userAnswer = (prevQEl.value || '').trim().toLowerCase();
                    if (userAnswer === alertObj.prevAnswer.trim().toLowerCase()) {
                        alert(alertObj.alertText);
                    }
                } else {
                    // If it's a checkbox or something else
                    const checkboxes = document.querySelectorAll('[name^="answer' + alertObj.prevQuestionId + '_"]');
                    checkboxes.forEach(cb => {
                        if (cb.checked && cb.value.trim().toLowerCase() === alertObj.prevAnswer.trim().toLowerCase()) {
                            alert(alertObj.alertText);
                        }
                    });
                }
            });
        }

        function showThankYouMessage() {
            const pdfName = pdfFormName.replace('.pdf', '');
            editAndDownloadPDF(pdfName).then(() => {
                // handle conditional PDFs
                conditionalPDFs.forEach(function(conditionalPDF) {
                    if (conditionalPDF.questionType === 'checkbox') {
                        const checkEl = document.getElementById(conditionalPDF.questionNameId);
                        if (checkEl && checkEl.checked && checkEl.value === conditionalPDF.conditionalAnswer) {
                            editAndDownloadPDF(conditionalPDF.pdfName.replace('.pdf', ''));
                        }
                    } else {
                        // single element
                        const val = (document.getElementById(conditionalPDF.questionNameId)?.value || '').trim();
                        if (val === conditionalPDF.conditionalAnswer) {
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

    </script>
    </body>
    </html>
    `;

    return formHTML;
}





