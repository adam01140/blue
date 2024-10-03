function generateAndDownloadForm() {
    let formHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Custom Form</title>
        <style>
            /* Input Styles */
            input[type="text"],
            input[type="number"],
            textarea,
            select {
                background-color: #e6f4ff;
                border: 2px solid #2980b9;
                border-radius: 10px;
                padding: 8px;
                box-sizing: border-box;
                transition: border-color 0.3s ease;
            }
            input[type="text"]::placeholder,
            input[type="email"]::placeholder {
                text-align: center;
            }
            input[type="text"]:focus,
            input[type="number"]:focus,
            textarea:focus,
            select:focus {
                border-color: #1c598a;
                outline: none;
            }
            /* General Styles */
            html, body {
                height: 100%;
                margin: 0;
                display: flex;
                flex-direction: column;
                font-family: 'Montserrat', sans-serif;
                color: #333;
                background-color: #f4f4f4;
            }
            header {
                background-color: #2c3e50;
                padding: 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                position: relative;
            }
            #box {
                border: 4px solid lightblue;
                border-color: #2c3e50;
                border-radius: 10px;
                padding: 20px;
                padding-bottom: 70px;
                margin: 50px;
                background-color: #ffffff;
                width: auto;
                height: auto;
                position: relative;
            }
            .section {
                display: none;
            }
            .section.active {
                display: block;
            }
            .thank-you-message {
                display: none;
                font-size: 20px;
                font-weight: bold;
                text-align: center;
                margin-top: 20px;
            }
            header img {
                cursor: pointer;
            }
            nav {
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 15px;
            }
            nav a {
                color: #ffffff;
                text-decoration: none;
                font-weight: bold;
                transition: color 0.3s ease;
            }
            nav a:hover {
                color: #2980b9;
            }
            section {
                padding: 50px;
                text-align: center;
                flex: 1;
                display: grid;
                gap: 20px;
            }
            section h1 {
                color: #2980b9;
                font-weight: normal;
            }
            section p {
                margin-bottom: 20px;
            }
            button {
                background-color: #2980b9;
                color: #ffffff;
                padding: 5px 30px;
                text-decoration: none;
                font-weight: bold;
                border-radius: 5px;
                transition: background-color 0.3s ease;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: fit-content;
                margin: 0 auto;
                border: none;
                cursor: pointer;
            }
            button:hover {
                background-color: #1c598a;
            }
            .steps {
                display: grid;
                grid-template-columns: repeat(3, minmax(150px, 1fr));
                justify-items: center;
                gap: 10px;
                max-width: 800px;
                margin: 0 auto;
            }
            .step {
                text-align: center;
            }
            footer {
                text-align: center;
                padding: 20px;
                background-color: #2c3e50;
                color: white;
            }
            .hidden {
                display: none;
            }
            #checkmark {
                width: fit-content;
            }
            .checkbox-label, .noneApplyCheckbox {
                font-size: 18px;
                display: block;
                text-align: left;
                margin: 0 auto;
                cursor: pointer;
            }
            @media (max-width: 768px) {
                header {
                    flex-direction: column;
                    padding: 10px;
                }
                nav {
                    position: static;
                    transform: none;
                    margin-top: 10px;
                }
                .steps {
                    grid-template-columns: 1fr;
                    max-width: 100%;
                }
            }
        </style>
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
    <script src="https://mozilla.github.io/pdf.js/build/pdf.js"></script>
    <!-- Include Firebase SDKs -->
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
            const questionText = questionBlock.querySelector(`input[type="text"]`).value;
            const questionType = questionBlock.querySelector(`select`).value;
            const logicEnabled = questionBlock.querySelector(`#logic${questionId}`).checked;
            const prevQuestionId = questionBlock.querySelector(`#prevQuestion${questionId}`).value;
            const prevAnswer = questionBlock.querySelector(`#prevAnswer${questionId}`).value;
            const jumpEnabled = questionBlock.querySelector(`#enableJump${questionId}`).checked;
            const jumpTo = questionBlock.querySelector(`#jumpTo${questionId}`).value;
            const jumpOption = questionBlock.querySelector(`#jumpOption${questionId}`).value;

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
                formHTML += `<div><center><div id="checkmark">`;
                optionsDivs.forEach((optionDiv, index) => {
                    const optionTextInput = optionDiv.querySelector(`#checkboxOptionText${questionId}_${index + 1}`);
                    const optionNameInput = optionDiv.querySelector(`#checkboxOptionName${questionId}_${index + 1}`);
                    const optionValueInput = optionDiv.querySelector(`#checkboxOptionValue${questionId}_${index + 1}`);

                    const optionText = optionTextInput ? optionTextInput.value.trim() : `Option ${index + 1}`;
                    const optionNameId = optionNameInput ? optionNameInput.value.trim() : `answer${questionId}_${index + 1}`;
                    const optionValue = optionValueInput ? optionValueInput.value.trim() : optionText;

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
                    formHTML += `
                        <span class="checkbox-inline">
                            <label class="checkbox-label">
                                <input type="checkbox" id="answer${questionId}_none" name="answer${questionId}_none" value="None of the above">
                                None of the above
                            </label>
                        </span>`;
                }
                formHTML += `</div><br></div>`;
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
                                container.innerHTML += '<input type="text" id="' + inputId + '" name="' + inputId + '" placeholder="' + label + '" style="text-align:center;"><br>';
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
                                jumpTarget = '${jumpTo}';
                            } else {
                                jumpTarget = null;
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
                                    jumpTarget = '${jumpTo}';
                                } else {
                                    jumpTarget = null;
                                }
                            });
                        });
                    </` + `script>`;
                }
            }
        });

        formHTML += `
        <br><br><div class="navigation-buttons">`;

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
        // ----- Firebase Configuration -----
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

        // ----- Form Logic -----
        const urlParams = new URLSearchParams(window.location.search);
        const formId = urlParams.get('formId');

        if (!formId) {
            alert('No form ID provided.');
            window.location.href = 'forms.html';
        }

        let userId = null;

        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                userId = user.uid;
                loadFormData('section1');
                autoSaveForm('section1');
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

            db.collection('users').doc(userId).collection('forms').doc(formId).collection('formAnswers').doc(sectionId).set(formData)
            .then(() => {
                console.log('Form data saved successfully for ' + sectionId);
            })
            .catch(error => {
                console.error('Error saving form data: ', error);
            });
        }

        function loadFormData(sectionId) {
            db.collection('users').doc(userId).collection('forms').doc(formId).collection('formAnswers').doc(sectionId).get()
            .then(doc => {
                if (doc.exists) {
                    const savedData = doc.data();
                    for (const [key, value] of Object.entries(savedData)) {
                        const input = document.querySelector('[name="' + key + '"]');
                        if (input) {
                            if (input.tagName === 'INPUT' && input.type === 'checkbox') {
                                input.checked = value;
                            } else {
                                input.value = value;
                            }
                        }
                    }
                    console.log('Form data loaded successfully for ' + sectionId);
                } else {
                    console.log('No saved form data found for ' + sectionId);
                }
            })
            .catch(error => {
                console.error('Error loading form data: ', error);
            });
        }

        function autoSaveForm(sectionId) {
            const inputs = document.querySelectorAll('#' + sectionId + ' input, #' + sectionId + ' select, #' + sectionId + ' textarea');
            inputs.forEach(input => {
                input.addEventListener('change', () => saveFormData(sectionId));
            });
        }

        function handleNext(currentSection) {
            saveFormData('section' + currentSection);
            navigateSection(currentSection + 1);
        }

        function navigateSection(sectionNumber) {
            const sections = document.querySelectorAll('.section');
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById('section' + sectionNumber).classList.add('active');
            loadFormData('section' + sectionNumber);
            autoSaveForm('section' + sectionNumber);
        }

        let uploadedPdfFile = null;

        function downloadPDF() {
            var iframe = document.getElementById('pdfFrame');
            var url = iframe.src;
            var downloadLink = document.createElement("a");
            downloadLink.href = url;
            downloadLink.download = "ModifiedDocument.pdf";
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }

        function loadDefaultPDF() {
            const defaultUrl = 'http://localhost:3000/sc100.pdf';
            fetch(defaultUrl)
                .then(response => response.blob())
                .then(blob => {
                    uploadedPdfFile = blob;
                    displayPDF(blob);
                })
                .catch(error => {
                    console.error('Error loading default PDF:', error);
                });
        }

        function displayPDF(pdfBlob) {
            var url = URL.createObjectURL(pdfBlob);
            document.getElementById('pdfFrame').src = url;
        }

        var formData = new FormData();

        async function editPDF() {
            formData = new FormData();

            if (!uploadedPdfFile) {
                return;
            }

            const inputs = document.querySelectorAll('#questions input, #questions select');
            inputs.forEach(input => {
                if (input.type === 'checkbox') {
                    formData.append(input.name, input.checked ? 'Yes' : 'No');
                } else {
                    formData.append(input.name, input.value);
                }
            });

            formData.append('pdf', uploadedPdfFile);

            fetch('/edit_pdf', {
                method: 'POST',
                body: formData,
            })
            .then(response => {
                return response.blob();
            })
            .then(blob => {
                var url = window.URL.createObjectURL(blob);
                document.getElementById('pdfFrame').src = url;
                downloadPDF();
            })
            .catch(error => {
                console.error('Error updating PDF:', error);
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
            loadDefaultPDF();
            setCurrentDate();
        };

        function showThankYouMessage() {
            editPDF();
            document.getElementById('customForm').style.display = 'none';
            document.getElementById('thankYouMessage').style.display = 'block';
            return false;
        }
    </` + `script>
    </body>
    </html>
    `;

    downloadHTML(formHTML, "custom_form.html");

    navigator.clipboard.writeText(formHTML)
        .then(() => {
            //alert("Form HTML copied to clipboard.");
        })
        .catch(err => {
            console.error('Could not copy text: ', err);
        });
}



