let sectionCounter = 1;
let questionCounter = 1;

function addSection() {
    const formBuilder = document.getElementById('formBuilder');
    const sectionBlock = document.createElement('div');
    sectionBlock.className = 'section-block';
    sectionBlock.id = `sectionBlock${sectionCounter}`;
    sectionBlock.innerHTML = `
        <label for="sectionName${sectionCounter}">Section Name: </label>
        <input type="text" id="sectionName${sectionCounter}" placeholder="Enter section name"><br><br>
        <div id="questionsSection${sectionCounter}"></div>
        <button type="button" onclick="addQuestion(${sectionCounter})">Add Question to Section ${sectionCounter}</button>
        <button type="button" onclick="removeSection(${sectionCounter})">Remove Section</button>
        <hr>
    `;
    formBuilder.appendChild(sectionBlock);
    sectionCounter++;
}

function addQuestion(sectionId) {
    const questionsSection = document.getElementById(`questionsSection${sectionId}`);
    const questionBlock = document.createElement('div');
    questionBlock.className = 'question-block';
    questionBlock.id = `questionBlock${questionCounter}`;
    questionBlock.innerHTML = `
        <label>Question ${getQuestionNumber(sectionId)}: </label>
        <input type="text" placeholder="Enter your question" id="question${questionCounter}"><br><br>
        
        <label>Question Type: </label>
        <select id="questionType${questionCounter}" onchange="toggleOptions(${questionCounter})">
            <option value="text">Text</option>
            <option value="radio">Yes/No</option>
            <option value="dropdown">Dropdown</option>
            <option value="checkbox">Checkbox</option>
            <option value="numberedDropdown">Numbered Dropdown</option>
            <option value="address">Address</option>
        </select><br><br>

        <div id="optionsBlock${questionCounter}" class="dropdown-options" style="display: none;">
            <label>Options: </label>
            <div id="dropdownOptions${questionCounter}"></div>
            <button type="button" onclick="addDropdownOption(${questionCounter})">Add Option</button>
        </div><br>

        <div id="checkboxBlock${questionCounter}" class="checkbox-options" style="display: none;">
            <label>Checkbox Options: </label>
            <div id="checkboxOptions${questionCounter}"></div>
            <button type="button" onclick="addCheckboxOption(${questionCounter})">Add Option</button>
        </div><br>

        <div id="numberedDropdownBlock${questionCounter}" class="numbered-dropdown-options" style="display: none;">
            <label>Number Range: </label>
            <input type="number" id="numberRangeStart${questionCounter}" placeholder="Start" min="1" style="width: 60px;">
            <input type="number" id="numberRangeEnd${questionCounter}" placeholder="End" min="1" style="width: 60px;"><br><br>
            <label>Textbox Labels:</label>
            <div id="textboxLabels${questionCounter}"></div>
            <button type="button" onclick="addTextboxLabel(${questionCounter})">Add Label</button>
        </div><br>

        <label>Conditional Logic: </label><br>
        <input type="checkbox" id="logic${questionCounter}" onchange="toggleLogic(${questionCounter})">
        <label for="logic${questionCounter}">Enable Logic</label><br><br>

        <div id="logicBlock${questionCounter}" style="display: none;">
            <label>Show this question if: </label><br>
            <input type="number" placeholder="Previous question number" id="prevQuestion${questionCounter}"><br>
            <select id="prevAnswer${questionCounter}">
                <option value="yes">Answer is Yes</option>
                <option value="no">Answer is No</option>
            </select>
        </div><br>

        <div id="jumpLogicContainer${questionCounter}">
            <label>Jump Logic: </label><br>
            <input type="checkbox" id="enableJump${questionCounter}" onchange="toggleJumpLogic(${questionCounter})">
            <label for="enableJump${questionCounter}">Enable Jump Logic</label><br><br>
            <div id="jumpBlock${questionCounter}" style="display: none;">
                <label>Select the option that triggers the jump:</label><br>
                <select id="jumpOption${questionCounter}">
                    <!-- Options will be populated dynamically based on the question type -->
                </select><br><br>
                <label>Jump to (enter section number or 'end'):</label><br>
                <input type="text" placeholder="Section number or 'end'" id="jumpTo${questionCounter}"><br>
            </div>
        </div><br>

        <button type="button" onclick="removeQuestion(${sectionId}, ${questionCounter})">Remove Question</button>
    `;
    questionsSection.appendChild(questionBlock);
    questionCounter++;

    updateQuestionNumbers(sectionId);
}

function getQuestionNumber(sectionId) {
    const sectionBlock = document.getElementById(`sectionBlock${sectionId}`);
    const questions = sectionBlock.querySelectorAll('.question-block');
    return questions.length + 1;
}

function updateQuestionNumbers(sectionId) {
    const sectionBlock = document.getElementById(`sectionBlock${sectionId}`);
    const questions = sectionBlock.querySelectorAll('.question-block');

    questions.forEach((questionBlock, index) => {
        const label = questionBlock.querySelector('label');
        label.textContent = `Question ${index + 1}: `;
    });
}

function toggleOptions(questionId) {
    const questionType = document.getElementById(`questionType${questionId}`).value;
    const optionsBlock = document.getElementById(`optionsBlock${questionId}`);
    const checkboxBlock = document.getElementById(`checkboxBlock${questionId}`);
    const numberedDropdownBlock = document.getElementById(`numberedDropdownBlock${questionId}`);
    const jumpLogicContainer = document.getElementById(`jumpLogicContainer${questionId}`);

    optionsBlock.style.display = 'none';
    checkboxBlock.style.display = 'none';
    numberedDropdownBlock.style.display = 'none';
    jumpLogicContainer.style.display = 'block';

    if (questionType === 'checkbox') {
        checkboxBlock.style.display = 'block';
        jumpLogicContainer.style.display = 'none'; // Hide the jump logic section for checkbox type
    } else if (questionType === 'dropdown') {
        optionsBlock.style.display = 'block';
    } else if (questionType === 'numberedDropdown') {
        numberedDropdownBlock.style.display = 'block';
        jumpLogicContainer.style.display = 'none'; // Hide the jump logic for numbered dropdown type
    } else if (questionType === 'address') {
        jumpLogicContainer.style.display = 'none'; // Hide the jump logic for address type
    }
}

function removeSection(sectionId) {
    const sectionBlock = document.getElementById(`sectionBlock${sectionId}`);
    sectionBlock.remove();
    updateSectionNumbers();
}

function updateSectionNumbers() {
    const sections = document.querySelectorAll('.section-block');

    sections.forEach((sectionBlock, index) => {
        const sectionLabel = sectionBlock.querySelector('h2');
        if (sectionLabel) sectionLabel.textContent = `Section ${index + 1}`;
        sectionBlock.id = `sectionBlock${index + 1}`;
        updateQuestionNumbers(index + 1);
    });

    sectionCounter = sections.length + 1;
}

function toggleLogic(questionId) {
    const logicEnabled = document.getElementById(`logic${questionId}`).checked;
    const logicBlock = document.getElementById(`logicBlock${questionId}`);
    logicBlock.style.display = logicEnabled ? 'block' : 'none';
}

function toggleJumpLogic(questionId) {
    const jumpEnabled = document.getElementById(`enableJump${questionId}`).checked;
    const jumpBlock = document.getElementById(`jumpBlock${questionId}`);
    jumpBlock.style.display = jumpEnabled ? 'block' : 'none';
}

function addDropdownOption(questionId) {
    const dropdownOptionsDiv = document.getElementById(`dropdownOptions${questionId}`);
    const jumpOptionSelect = document.getElementById(`jumpOption${questionId}`);
    const optionCount = dropdownOptionsDiv.children.length + 1;

    const optionDiv = document.createElement('div');
    optionDiv.className = `option${optionCount}`;
    optionDiv.innerHTML = `
        <input type="text" id="option${questionId}_${optionCount}" placeholder="Option ${optionCount}">
        <button type="button" onclick="removeDropdownOption(${questionId}, ${optionCount})">Remove</button>
    `;
    dropdownOptionsDiv.appendChild(optionDiv);

    const opt = document.createElement('option');
    opt.value = `option${optionCount}`;
    opt.text = `Option ${optionCount}`;
    jumpOptionSelect.appendChild(opt);
}

function addCheckboxOption(questionId) {
    const checkboxOptionsDiv = document.getElementById(`checkboxOptions${questionId}`);
    const optionCount = checkboxOptionsDiv.children.length + 1;

    const optionDiv = document.createElement('div');
    optionDiv.className = `option${optionCount}`;
    optionDiv.innerHTML = `
        <input type="text" id="checkboxOption${questionId}_${optionCount}" placeholder="Option ${optionCount}">
        <button type="button" onclick="removeCheckboxOption(${questionId}, ${optionCount})">Remove</button>
        <br>
        <input type="checkbox" id="enableJumpLogic${questionId}_${optionCount}" onchange="toggleSpecificJumpLogic(${questionId}, ${optionCount})">
        <label for="enableJumpLogic${questionId}_${optionCount}">Enable Jump Logic for this option</label>
        <div class="jumpLogicOption" id="jumpLogicOption${questionId}_${optionCount}" style="display: none;">
            <label for="jumpTo${questionId}_${optionCount}">Jump to:</label>
            <input type="text" id="jumpTo${questionId}_${optionCount}" placeholder="Section number or 'end'">
        </div>
    `;
    checkboxOptionsDiv.appendChild(optionDiv);
}

function addTextboxLabel(questionId) {
    const textboxLabelsDiv = document.getElementById(`textboxLabels${questionId}`);
    const labelCount = textboxLabelsDiv.children.length + 1;

    const labelDiv = document.createElement('div');
    labelDiv.className = `label${labelCount}`;
    labelDiv.innerHTML = `
        <input type="text" id="label${questionId}_${labelCount}" placeholder="Label ${labelCount}">
        <button type="button" onclick="removeTextboxLabel(${questionId}, ${labelCount})">Remove</button>
    `;
    textboxLabelsDiv.appendChild(labelDiv);
}

function toggleSpecificJumpLogic(questionId, optionNumber) {
    const jumpLogicOption = document.getElementById(`jumpLogicOption${questionId}_${optionNumber}`);
    const isChecked = document.getElementById(`enableJumpLogic${questionId}_${optionNumber}`).checked;
    jumpLogicOption.style.display = isChecked ? 'block' : 'none';
}

function removeDropdownOption(questionId, optionNumber) {
    const optionDiv = document.querySelector(`#dropdownOptions${questionId} .option${optionNumber}`);
    optionDiv.remove();
    const jumpOptionSelect = document.getElementById(`jumpOption${questionId}`);
    jumpOptionSelect.querySelector(`option[value="option${optionNumber}"]`).remove();
}

function removeCheckboxOption(questionId, optionNumber) {
    const optionDiv = document.querySelector(`#checkboxOptions${questionId} .option${optionNumber}`);
    optionDiv.remove();
    const jumpOptionSelect = document.getElementById(`jumpOption${questionId}`);
    jumpOptionSelect.querySelector(`option[value="option${optionNumber}"]`).remove();
}

function removeTextboxLabel(questionId, labelNumber) {
    const labelDiv = document.querySelector(`#textboxLabels${questionId} .label${labelNumber}`);
    labelDiv.remove();
}

function removeQuestion(sectionId, questionId) {
    const questionBlock = document.getElementById(`questionBlock${questionId}`);
    questionBlock.remove();
    updateQuestionNumbers(sectionId);
}

function generateAndDownloadForm() {
    let formHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Custom Form</title>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap" rel="stylesheet">
        <style>
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
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
            }
            section h1 {
                color: #2980b9;
                font-weight: normal;
            }
            .container {
                width: 50%;
                margin: auto;
                background-color: #ffffff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
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
            footer {
                text-align: center;
                padding: 20px;
                background-color: #2c3e50;
                color: white;
            }
        </style>
    </head>
    <body>
        <header>
            <img src="logo.png" alt="Logo" width="130" height="80" onclick="location.href='index.html';">
            <nav>
                <a href="index.html">Home</a>
                <a href="forms.html">Forms</a>
                <a href="contact.html">Contact Us</a>
            </nav>
        </header>
        <section>
            <div class="container">
                <form id="customForm" onsubmit="return showThankYouMessage();">
    `;

    formHTML += `<script>let jumpTarget = null;<\/script>`;  // Initialize jumpTarget globally

    for (let s = 1; s < sectionCounter; s++) {
        const sectionBlock = document.getElementById(`sectionBlock${s}`);
        if (!sectionBlock) continue;

        const sectionName = document.getElementById(`sectionName${s}`).value || `Section ${s}`;

        formHTML += `<div id="section${s}" class="section${s === 1 ? ' active' : ''}">`;
        formHTML += `<h2>${sectionName}</h2>`;

        const questionsSection = sectionBlock.querySelectorAll('.question-block');
        questionsSection.forEach((questionBlock) => {
            const questionId = questionBlock.id.replace('questionBlock', '');
            const questionText = questionBlock.querySelector(`input[type="text"]`).value;
            const questionType = questionBlock.querySelector(`select`).value;
            const logicEnabled = questionBlock.querySelector(`#logic${questionId}`).checked;
            const prevQuestion = questionBlock.querySelector(`#prevQuestion${questionId}`).value;
            const prevAnswer = questionBlock.querySelector(`#prevAnswer${questionId}`).value;

            formHTML += `<div id="question${questionId}" class="question-block">`;
            formHTML += `<label>${questionText}</label><br>`;

            if (questionType === 'text') {
                formHTML += `<input type="text" id="answer${questionId}"><br><br>`;
            } else if (questionType === 'radio') {
                formHTML += `
                    <input type="radio" id="answer${questionId}_yes" name="answer${questionId}" value="yes">
                    <label for="answer${questionId}_yes">Yes</label><br>
                    <input type="radio" id="answer${questionId}_no" name="answer${questionId}" value="no">
                    <label for="answer${questionId}_no">No</label><br><br>`;
            } else if (questionType === 'dropdown') {
                formHTML += `<select id="answer${questionId}">`;
                const options = questionBlock.querySelectorAll(`#dropdownOptions${questionId} input`);
                options.forEach(option => {
                    formHTML += `<option value="${option.value}">${option.value}</option>`;
                });
                formHTML += `</select><br><br>`;
            } else if (questionType === 'checkbox') {
                const options = questionBlock.querySelectorAll(`#checkboxOptions${questionId} input`);
                options.forEach((option, index) => {
                    const jumpEnabled = document.getElementById(`enableJumpLogic${questionId}_${index + 1}`).checked;
                    const jumpTo = document.getElementById(`jumpTo${questionId}_${index + 1}`).value;

                    formHTML += `<input type="checkbox" id="answer${questionId}_${index + 1}" name="answer${questionId}" value="${option.value}"> ${option.value}<br>`;
                    
                    if (jumpEnabled && jumpTo) {
                        formHTML += `<script>
                            document.getElementById('answer${questionId}_${index + 1}').addEventListener('change', function() {
                                if (this.checked) {
                                    jumpTarget = '${jumpTo}';
                                } else {
                                    jumpTarget = null; // Reset jumpTarget if no option is selected
                                }
                            });
                        <\/script>`;
                    }
                });
                formHTML += `<br>`;
            } else if (questionType === 'numberedDropdown') {
                const rangeStart = questionBlock.querySelector(`#numberRangeStart${questionId}`).value;
                const rangeEnd = questionBlock.querySelector(`#numberRangeEnd${questionId}`).value;
                const labels = questionBlock.querySelectorAll(`#textboxLabels${questionId} input`);
                
                formHTML += `<select id="answer${questionId}" onchange="showTextboxLabels(${questionId}, this.value, ${rangeStart}, ${rangeEnd})">`;
                for (let i = rangeStart; i <= rangeEnd; i++) {
                    formHTML += `<option value="${i}">${i}</option>`;
                }
                formHTML += `</select><br><br>`;

                formHTML += `<div id="labelContainer${questionId}"></div>`;

                formHTML += `<script>
                    function showTextboxLabels(questionId, count, rangeStart, rangeEnd) {
                        const container = document.getElementById('labelContainer' + questionId);
                        container.innerHTML = '';
                        for (let i = 1; i <= count; i++) {
                            ${Array.from(labels).map(label => `
                                container.innerHTML += '<label>${label.value} ' + i + ':</label><input type="text" id="label' + questionId + '_' + i + '${label.value.replace(/\s+/g, '')}"><br>';
                            `).join('')}
                        }
                    }
                <\/script>`;
            } else if (questionType === 'address') {
                formHTML += `
                    <label for="street${questionId}">Street:</label>
                    <input type="text" id="street${questionId}" name="street${questionId}"><br><br>
                    <label for="city${questionId}">City:</label>
                    <input type="text" id="city${questionId}" name="city${questionId}"><br><br>
                    <label for="county${questionId}">County:</label>
                    <input type="text" id="county${questionId}" name="county${questionId}"><br><br>
                    <label for="state${questionId}">State:</label>
                    <input type="text" id="state${questionId}" name="state${questionId}"><br><br>
                    <label for="zip${questionId}">Zip:</label>
                    <input type="text" id="zip${questionId}" name="zip${questionId}"><br><br>
                `;
            }

            formHTML += `</div>`; // End question block

            // Add logic to show or hide the question based on previous answers
            if (logicEnabled && prevQuestion) {
                formHTML += `
                <script>
                    const question${questionId} = document.getElementById('question${questionId}');
                    question${questionId}.style.display = 'none';
                    const prevAnswerElement = document.getElementById('answer${prevQuestion}_yes');
                    const answer${prevQuestion}No = document.getElementById('answer${prevQuestion}_no');
                    prevAnswerElement.addEventListener('change', function() {
                        if (this.checked) {
                            question${questionId}.style.display = 'block';
                        } else {
                            question${questionId}.style.display = 'none';
                        }
                    });
                    answer${prevQuestion}No.addEventListener('change', function() {
                        question${questionId}.style.display = 'none';
                    });
                <\/script>`;
            }

        });

        formHTML += `
        <div class="navigation-buttons">`;

        if (s > 1) {
            formHTML += `<button type="button" onclick="navigateSection(${s - 1})">Back</button>`;
        }

        if (s === sectionCounter - 1) {
            formHTML += `<button type="submit">Submit</button>`;
        } else {
            formHTML += `<button type="button" onclick="handleNext(${s})">Next</button>`;
        }

        formHTML += `</div>`;

        formHTML += `</div>`; // End section
    }

    formHTML += `
                </form>
                <div id="thankYouMessage" class="thank-you-message">Thank you for completing the survey</div>
            </div>
        </section>
        <footer>
            &copy; 2024 Custom Form Builder. All rights reserved.
        </footer>
        <script>
            function handleNext(currentSection) {
                const nextSection = currentSection + 1;
                const isEmpty = window['isSection' + nextSection + 'Empty'];
                if (jumpTarget === 'end') {
                    document.getElementById('customForm').style.display = 'none';
                    document.getElementById('thankYouMessage').style.display = 'block';
                } else if (jumpTarget) {
                    navigateSection(jumpTarget);
                } else if (isEmpty && isEmpty()) {
                    navigateSection(nextSection + 1); // Skip to the next non-empty section
                } else {
                    navigateSection(nextSection); // Ensure it always moves to the next visible section
                }
                jumpTarget = null; // Reset jumpTarget after navigating
            }

            function navigateSection(sectionNumber) {
                const sections = document.querySelectorAll('.section');
                sections.forEach(section => section.classList.remove('active'));
                document.getElementById('section' + sectionNumber).classList.add('active');
            }

            function showThankYouMessage() {
                document.getElementById('customForm').style.display = 'none';
                document.getElementById('thankYouMessage').style.display = 'block';
                return false; // Prevent actual form submission
            }
        <\/script>
    </body>
    </html>
    `;

    downloadHTML(formHTML, "custom_form.html");
}

function previewForm() {
    let formHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Preview Custom Form</title>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap" rel="stylesheet">
        <style>
            /* Insert the same CSS styles from the GUI */
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
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
            }
            section h1 {
                color: #2980b9;
                font-weight: normal;
            }
            .container {
                width: 50%;
                margin: auto;
                background-color: #ffffff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
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
            footer {
                text-align: center;
                padding: 20px;
                background-color: #2c3e50;
                color: white;
            }
        </style>
    </head>
    <body>
        <header>
            <img src="logo.png" alt="Logo" width="130" height="80" onclick="location.href='index.html';">
            <nav>
                <a href="index.html">Home</a>
                <a href="forms.html">Forms</a>
                <a href="contact.html">Contact Us</a>
            </nav>
        </header>
        <section>
            <div class="container">
                <form id="customForm" onsubmit="return showThankYouMessage();">
    `;

    formHTML += `<script>let jumpTarget = null;<\/script>`;  // Initialize jumpTarget globally

    for (let s = 1; s < sectionCounter; s++) {
        const sectionBlock = document.getElementById(`sectionBlock${s}`);
        if (!sectionBlock) continue;

        const sectionName = document.getElementById(`sectionName${s}`).value || `Section ${s}`;

        formHTML += `<div id="section${s}" class="section${s === 1 ? ' active' : ''}">`;
        formHTML += `<h2>${sectionName}</h2>`;

        const questionsSection = sectionBlock.querySelectorAll('.question-block');
        questionsSection.forEach((questionBlock) => {
            const questionId = questionBlock.id.replace('questionBlock', '');
            const questionText = questionBlock.querySelector(`input[type="text"]`).value;
            const questionType = questionBlock.querySelector(`select`).value;
            const logicEnabled = questionBlock.querySelector(`#logic${questionBlock.id.replace('questionBlock', '')}`).checked;
            const prevQuestion = questionBlock.querySelector(`#prevQuestion${questionBlock.id.replace('questionBlock', '')}`).value;
            const prevAnswer = questionBlock.querySelector(`#prevAnswer${questionBlock.id.replace('questionBlock', '')}`).value;
            const jumpEnabled = questionBlock.querySelector(`#enableJump${questionBlock.id.replace('questionBlock', '')}`).checked;
            const jumpOption = questionBlock.querySelector(`#jumpOption${questionBlock.id.replace('questionBlock', '')}`).value;
            const jumpTo = questionBlock.querySelector(`#jumpTo${questionBlock.id.replace('questionBlock', '')}`).value;

            formHTML += `<label>${questionText}</label><br>`;

            if (questionType === 'text') {
                formHTML += `<input type="text" id="answer${questionBlock.id.replace('questionBlock', '')}"><br><br>`;
            } else if (questionType === 'radio') {
                formHTML += `
                    <input type="radio" id="answer${questionBlock.id.replace('questionBlock', '')}_yes" name="answer${questionBlock.id.replace('questionBlock', '')}" value="yes">
                    <label for="answer${questionBlock.id.replace('questionBlock', '')}_yes">Yes</label><br>
                    <input type="radio" id="answer${questionBlock.id.replace('questionBlock', '')}_no" name="answer${questionBlock.id.replace('questionBlock', '')}" value="no">
                    <label for="answer${questionBlock.id.replace('questionBlock', '')}_no">No</label><br><br>`;
            } else if (questionType === 'dropdown') {
                formHTML += `<select id="answer${questionBlock.id.replace('questionBlock', '')}">`;
                const options = questionBlock.querySelectorAll(`#dropdownOptions${questionBlock.id.replace('questionBlock', '')} input`);
                options.forEach(option => {
                    formHTML += `<option value="${option.value}">${option.value}</option>`;
                });
                formHTML += `</select><br><br>`;
            } else if (questionType === 'checkbox') {
                const options = questionBlock.querySelectorAll(`#checkboxOptions${questionBlock.id.replace('questionBlock', '')} input`);
                options.forEach(option => {
                    formHTML += `<input type="checkbox" name="answer${questionBlock.id.replace('questionBlock', '')}" value="${option.value}"> ${option.value}<br>`;
                });
                formHTML += `<br>`;
            } else if (questionType === 'numberedDropdown') {
                const rangeStart = questionBlock.querySelector(`#numberRangeStart${questionId}`).value;
                const rangeEnd = questionBlock.querySelector(`#numberRangeEnd${questionId}`).value;
                const labels = questionBlock.querySelectorAll(`#textboxLabels${questionId} input`);
                
                formHTML += `<select id="answer${questionId}" onchange="showTextboxLabels(${questionId}, this.value, ${rangeStart}, ${rangeEnd})">`;
                for (let i = rangeStart; i <= rangeEnd; i++) {
                    formHTML += `<option value="${i}">${i}</option>`;
                }
                formHTML += `</select><br><br>`;

                formHTML += `<div id="labelContainer${questionId}"></div>`;

                formHTML += `<script>
                    function showTextboxLabels(questionId, count, rangeStart, rangeEnd) {
                        const container = document.getElementById('labelContainer' + questionId);
                        container.innerHTML = '';
                        for (let i = 1; i <= count; i++) {
                            ${Array.from(labels).map(label => `
                                container.innerHTML += '<label>${label.value} ' + i + ':</label><input type="text" id="label' + questionId + '_' + i + '${label.value.replace(/\s+/g, '')}"><br>';
                            `).join('')}
                        }
                    }
                <\/script>`;
            } else if (questionType === 'address') {
                formHTML += `
                    <label for="street${questionId}">Street:</label>
                    <input type="text" id="street${questionId}" name="street${questionId}"><br><br>
                    <label for="city${questionId}">City:</label>
                    <input type="text" id="city${questionId}" name="city${questionId}"><br><br>
                    <label for="county${questionId}">County:</label>
                    <input type="text" id="county${questionId}" name="county${questionId}"><br><br>
                    <label for="state${questionId}">State:</label>
                    <input type="text" id="state${questionId}" name="state${questionId}"><br><br>
                    <label for="zip${questionId}">Zip:</label>
                    <input type="text" id="zip${questionId}" name="zip${questionId}"><br><br>
                `;
            }

            // Add logic to show or hide the question based on previous answers
            if (logicEnabled && prevQuestion) {
                formHTML += `
                <script>
                    document.getElementById('question${questionBlock.id.replace('questionBlock', '')}').style.display = 'none';
                    document.getElementById('answer${prevQuestion}_${prevAnswer}').addEventListener('change', function() {
                        if (this.checked) {
                            document.getElementById('question${questionBlock.id.replace('questionBlock', '')}').style.display = 'block';
                        } else {
                            document.getElementById('question${questionBlock.id.replace('questionBlock', '')}').style.display = 'none';
                        }
                    });
                <\/script>
                `;
            }

            // Handle jump logic for skipping to sections or ending the form
            if (jumpEnabled && jumpTo) {
                formHTML += `
                <script>
                    document.getElementById('answer${questionBlock.id.replace('questionBlock', '')}_${jumpOption}').addEventListener('change', function() {
                        if (this.checked) {
                            jumpTarget = '${jumpTo}';
                        } else {
                            jumpTarget = null; // Reset jumpTarget if no option is selected
                        }
                    });
                <\/script>
                `;
            }
        });

        // Add navigation buttons for each section
        formHTML += `
        <div class="navigation-buttons">`;

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

    formHTML += `
                </form>
                <div id="thankYouMessage" class="thank-you-message">Thank you for completing the survey</div>
            </div>
        </section>
        <footer>
            &copy; 2024 Custom Form Builder. All rights reserved.
        </footer>
        <script>
            function handleNext(currentSection) {
                if (jumpTarget === 'end') {
                    document.getElementById('customForm').style.display = 'none';
                    document.getElementById('thankYouMessage').style.display = 'block';
                } else if (jumpTarget) {
                    navigateSection(jumpTarget);
                } else {
                    navigateSection(currentSection + 1); // Ensure it always moves to the next section if no jumpTarget
                }
                jumpTarget = null; // Reset jumpTarget after navigating
            }

            function navigateSection(sectionNumber) {
                const sections = document.querySelectorAll('.section');
                sections.forEach(section => section.classList.remove('active'));
                document.getElementById('section' + sectionNumber).classList.add('active');
            }

            function showThankYouMessage() {
                document.getElementById('customForm').style.display = 'none';
                document.getElementById('thankYouMessage').style.display = 'block';
                return false; // Prevent actual form submission
            }
        <\/script>
    </body>
    </html>
    `;

    const previewWindow = window.open("", "Form Preview", "width=800,height=600");
    previewWindow.document.write(formHTML);
    previewWindow.document.close();
}

function downloadHTML(content, filename) {
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
