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
    let questionNameIds = {};
    let conditionalPDFs = [];
    let conditionalAlerts = []; // NEW CODE for conditional alerts

    const pdfFormNameInput = document.getElementById('formPDFName') ? document.getElementById('formPDFName').value.trim() : '';
    const pdfFormName = pdfFormNameInput || 'default.pdf';
    const escapedPdfFormName = pdfFormName.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/"/g, '\\"');

    for (let s = 1; s < sectionCounter; s++) {
        const sectionBlock = document.getElementById(`sectionBlock${s}`);
        if (!sectionBlock) continue;
        const sectionNameInput = sectionBlock.querySelector(`#sectionName${s}`);
        const sectionName = sectionNameInput ? sectionNameInput.value : `Section ${s}`;
        formHTML += `<div id="section${s}" class="section${s === 1 ? ' active' : ''}">`;
        formHTML += `<h2>${sectionName}</h2>`;
        const questionsSection = sectionBlock.querySelectorAll('.question-block');
        questionsSection.forEach((questionBlock) => {
            const questionId = questionBlock.id.replace('questionBlock', '');
            const questionText = questionBlock.querySelector(`#question${questionId}`).value;
            const questionType = questionBlock.querySelector(`#questionType${questionId}`).value;
            const logicEnabled = questionBlock.querySelector(`#logic${questionId}`).checked;
            const prevQuestionId = questionBlock.querySelector(`#prevQuestion${questionId}`).value;
            const prevAnswer = questionBlock.querySelector(`#prevAnswer${questionId}`).value;
            const jumpEnabled = questionBlock.querySelector(`#enableJump${questionId}`).checked;
            const jumpTo = questionBlock.querySelector(`#jumpTo${questionId}`).value;
            const jumpOption = questionBlock.querySelector(`#jumpOption${questionId}`).value;
            const conditionalPDFEnabled = questionBlock.querySelector(`#enableConditionalPDF${questionId}`)?.checked;
            const conditionalPDFName = questionBlock.querySelector(`#conditionalPDFName${questionId}`)?.value;
            const conditionalPDFAnswer = questionBlock.querySelector(`#conditionalPDFAnswer${questionId}`)?.value;

            // NEW CODE START: Conditional Alert Retrieval
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
            // NEW CODE END

            formHTML += `<div id="question-container-${questionId}" ${logicEnabled ? 'class="hidden"' : ''}>`;
            formHTML += `<label><h3>${questionText}</h3></label>`;
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
                const nameId = questionBlock.querySelector(`#textboxName${questionId}`).value || `answer${questionId}`;
                questionNameIds[questionId] = nameId;
                formHTML += `
                    <select id="${nameId}" name="${nameId}">
                        <option value="" disabled selected>Select an option</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select><br>`;
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
                const options = questionBlock.querySelectorAll(`#dropdownOptions${questionId} input`);
                options.forEach(option => {
                    formHTML += `<option value="${option.value}">${option.value}</option>`;
                });
                formHTML += `</select><br>`;
            } else if (questionType === 'checkbox') {
                const optionsDivs = questionBlock.querySelectorAll(`#checkboxOptions${questionId} > div`);
                const checkboxOptions = [];
                formHTML += `<div><center><div id="checkmark">`;
                optionsDivs.forEach((optionDiv, index) => {
                    const optionTextInput = optionDiv.querySelector(`#checkboxOptionText${questionId}_${index + 1}`);
                    const optionNameInput = optionDiv.querySelector(`#checkboxOptionName${questionId}_${index + 1}`);
                    const optionValueInput = optionDiv.querySelector(`#checkboxOptionValue${questionId}_${index + 1}`);
                    const optionText = optionTextInput ? optionTextInput.value.trim() : `Option ${index + 1}`;
                    const optionNameId = optionNameInput ? optionNameInput.value.trim() : `answer${questionId}_${index + 1}`;
                    const optionValue = optionValueInput ? optionValueInput.value.trim() : optionText;
                    checkboxOptions.push({ optionText, optionNameId, optionValue });
                    formHTML += `
                        <span class="checkbox-inline">
                            <label class="checkbox-label">
                                <input type="checkbox" id="${optionNameId}" name="${optionNameId}" value="${optionValue}">
                                ${optionText}
                            </label>
                        </span>`;
                });
                const noneOfTheAboveSelected = questionBlock.querySelector(`#noneOfTheAbove${questionId}`).checked;
                if (noneOfTheAboveSelected) {
                    const optionText = 'None of the above';
                    const optionNameId = `answer${questionId}_none`;
                    const optionValue = 'None of the above';
                    checkboxOptions.push({ optionText, optionNameId, optionValue });
                    formHTML += `
                        <span class="checkbox-inline">
                            <label class="checkbox-label">
                                <input type="checkbox" id="${optionNameId}" name="${optionNameId}" value="${optionValue}">
                                ${optionText}
                            </label>
                        </span>`;
                }
                formHTML += `</div><br></div>`;
                if (conditionalPDFEnabled) {
                    const conditionalOptionText = conditionalPDFAnswer;
                    const matchingOption = checkboxOptions.find(opt => opt.optionText === conditionalOptionText);
                    if (matchingOption) {
                        conditionalPDFs.push({
                            questionId: questionId,
                            questionNameId: matchingOption.optionNameId,
                            conditionalAnswer: matchingOption.optionValue,
                            pdfName: conditionalPDFName,
                            questionType: questionType
                        });
                    }
                }
            } else if (questionType === 'numberedDropdown') {
                const rangeStart = questionBlock.querySelector(`#numberRangeStart${questionId}`).value;
                const rangeEnd = questionBlock.querySelector(`#numberRangeEnd${questionId}`).value;
                const labels = questionBlock.querySelectorAll(`#textboxLabels${questionId} input`);
                const labelValues = Array.from(labels).map(label => label.value);
                formHTML += `<select id="answer${questionId}" onchange="showTextboxLabels(${questionId}, this.value)">
                                <option value="" disabled selected>Select an option</option>`;
                for (let i = rangeStart; i <= rangeEnd; i++) {
                    formHTML += `<option value="${i}">${i}</option>`;
                }
                formHTML += `</select><br>`;
                formHTML += `<div id="labelContainer${questionId}"></div>`;
                formHTML += `<script>
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
                </` + `script>`;
            } else if (questionType === 'multipleTextboxes') {
                const multipleTextboxesOptionsDiv = questionBlock.querySelectorAll(`#multipleTextboxesOptions${questionId} > div`);
                multipleTextboxesOptionsDiv.forEach((optionDiv, index) => {
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
                formHTML += `<input type="number" id="answer${questionId}" name="answer${questionId}" min="0" step="0.01" placeholder="Enter amount"><br>`;
            } else if (questionType === 'date') {
                formHTML += `<input type="date" id="answer${questionId}" name="answer${questionId}" placeholder="Enter a date"><br>`;
            }
            formHTML += `</div>`;

            if (logicEnabled && prevQuestionId && prevAnswer) {
                const prevQuestionNameId = questionNameIds[prevQuestionId] || `answer${prevQuestionId}`;
                formHTML += `
                <script>
                    document.getElementById('${prevQuestionNameId}').addEventListener('change', function() {
                        const questionElement = document.getElementById('question-container-${questionId}');
                        const selectedAnswer = this.value;
                        if (selectedAnswer.trim().toLowerCase() === '${prevAnswer.trim().toLowerCase()}') {
                            questionElement.classList.remove('hidden');
                        } else {
                            questionElement.classList.add('hidden');
                        }
                    });
                </` + `script>`;
            }
            if (jumpEnabled && jumpTo) {
                const currentQuestionNameId = questionNameIds[questionId] || `answer${questionId}`;
                if (questionType === 'radio' || questionType === 'dropdown') {
                    formHTML += `
                    <script>
                        document.getElementById('${currentQuestionNameId}').addEventListener('change', function() {
                            if (this.value === '${jumpOption}') {
                                navigateSection(${jumpTo});
                            }
                        });
                    </` + `script>`;
                } else if (questionType === 'checkbox') {
                    formHTML += `
                    <script>
                        document.querySelectorAll('input[name^="answer${questionId}_"]').forEach(checkbox => {
                            checkbox.addEventListener('change', function() {
                                const checkedOptions = Array.from(document.querySelectorAll('input[name^="answer${questionId}_"]:checked')).map(c => c.value);
                                if (checkedOptions.includes('${jumpOption}')) {
                                    navigateSection(${jumpTo});
                                }
                            });
                        });
                    </` + `script>`;
                }
            }
        });
        formHTML += `<br><br><div class="navigation-buttons">`;
        if (s > 1) {
            formHTML += `<button type="button" onclick="navigateSection(${s - 1})">Back</button>`;
        }
        if (s === sectionCounter - 1) {
            formHTML += `<button type="submit">Submit</button>`;
        } else {
            formHTML += `<button type="button" onclick="handleNext(${s})">Next</button>`;
        }
        formHTML += `</div>`;
        formHTML += `</div>`;
    }

    const { hiddenFieldsHTML, autofillMappings, conditionalAutofillLogic } = generateHiddenPDFFields(); 
    formHTML += hiddenFieldsHTML;

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
            // omitted for brevity in this example
        }
        function autoSaveForm(sectionId) {
            const inputs = document.querySelectorAll('#' + sectionId + ' input, #' + sectionId + ' select, #' + sectionId + ' textarea');
            inputs.forEach(input => {
                //input.addEventListener('change', () => saveFormData(sectionId)); // uncomment in prod
            });
        }
        function handleNext(currentSection) {
            navigateSection(currentSection + 1);
        }
        function navigateSection(sectionNumber) {
            const sections = document.querySelectorAll('.section');
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById('section' + sectionNumber).classList.add('active');
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
        var conditionalPDFs = ${JSON.stringify(conditionalPDFs)};

        // NEW CODE START: Conditional Alerts handling
        var conditionalAlerts = ${JSON.stringify(conditionalAlerts)};
        // After the user submits the form and before displaying thank you message, check conditions.
        // We'll trigger alerts immediately after form submission.
        // For demonstration, we assume immediate check is fine. 
        // In a more dynamic form, you might attach event listeners, but here we do it on submit.
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
                    // If it's a checkbox or something else, we need to check differently
                    // If prevAnswer must match a checkbox, we try to find a checkbox with that ID
                    const checkboxes = document.querySelectorAll('[name^="answer' + alertObj.prevQuestionId + '_"]');
                    if (checkboxes.length > 0) {
                        // Check if any of these checkboxes match the expected value
                        checkboxes.forEach(cb => {
                            if (cb.checked && cb.value.trim().toLowerCase() === alertObj.prevAnswer.trim().toLowerCase()) {
                                alert(alertObj.alertText);
                            }
                        });
                    }
                }
            });
        }
        // NEW CODE END

        function showThankYouMessage() {
            const pdfName = pdfFormName.replace('.pdf', '');
            editAndDownloadPDF(pdfName).then(() => {
                conditionalPDFs.forEach(function(conditionalPDF) {
                    if (conditionalPDF.questionType === 'checkbox') {
                        const checkboxInput = document.getElementById(conditionalPDF.questionNameId);
                        if (checkboxInput && checkboxInput.checked && checkboxInput.value === conditionalPDF.conditionalAnswer) {
                            editAndDownloadPDF(conditionalPDF.pdfName.replace('.pdf', ''));
                        }
                    } else {
                        const questionValue = document.getElementById(conditionalPDF.questionNameId).value;
                        if (questionValue === conditionalPDF.conditionalAnswer) {
                            editAndDownloadPDF(conditionalPDF.pdfName.replace('.pdf', ''));
                        }
                    }
                });

                // NEW CODE START: Trigger Conditional Alerts
                handleConditionalAlerts();
                // NEW CODE END

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