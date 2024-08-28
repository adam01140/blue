let sectionCounter = 1;
let questionCounter = 1;

function addSection() {
    const formBuilder = document.getElementById('formBuilder');
    const sectionBlock = document.createElement('div');
    sectionBlock.className = 'section-block';
    sectionBlock.id = `sectionBlock${sectionCounter}`;
    sectionBlock.innerHTML = `
        <h2>Section ${sectionCounter}</h2>
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
        <label>Question ${questionCounter}: </label>
        <input type="text" placeholder="Enter your question" id="question${questionCounter}"><br><br>
       
        <label>Question Type: </label>
        <select id="questionType${questionCounter}" onchange="toggleOptions(${questionCounter})">
            <option value="text">Text</option>
            <option value="radio">Yes/No</option>
            <option value="dropdown">Dropdown</option>
            <option value="checkbox">Checkbox</option>
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

        <label>Conditional Logic: </label><br>
        <input type="checkbox" id="logic${questionCounter}" onchange="toggleLogic(${questionCounter})">
        <label for="logic${questionCounter}">Enable Logic</label><br><br>

        <div id="logicBlock${questionCounter}" style="display: none;">
            <label>Show this question if: </label><br>
            <input type="number" placeholder="Previous question number" id="prevQuestion${questionCounter}"><br>
            <select id="prevAnswer${questionCounter}">
                <option value="Yes">Answer is Yes</option>
                <option value="No">Answer is No</option>
            </select>
        </div><br>

        <label>Jump Logic: </label><br>
        <div id="jumpLogic${questionCounter}">
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

        <button type="button" onclick="removeQuestion(${questionCounter})">Remove Question</button>
    `;
    questionsSection.appendChild(questionBlock);
    questionCounter++;
}

function removeSection(sectionId) {
    const sectionBlock = document.getElementById(`sectionBlock${sectionId}`);
    sectionBlock.remove();
}

function toggleOptions(questionId) {
    const questionType = document.getElementById(`questionType${questionId}`).value;
    const optionsBlock = document.getElementById(`optionsBlock${questionId}`);
    const checkboxBlock = document.getElementById(`checkboxBlock${questionId}`);
    const jumpOptionSelect = document.getElementById(`jumpOption${questionId}`);
    jumpOptionSelect.innerHTML = ""; // Clear previous options

    if (questionType === 'radio') {
        // For Yes/No, populate jump options with a dropdown
        const yesOption = document.createElement('option');
        yesOption.value = 'Yes';
        yesOption.text = 'Yes';
        jumpOptionSelect.appendChild(yesOption);

        const noOption = document.createElement('option');
        noOption.value = 'No';
        noOption.text = 'No';
        jumpOptionSelect.appendChild(noOption);
    } else if (questionType === 'dropdown' || questionType === 'checkbox') {
        optionsBlock.style.display = questionType === 'dropdown' ? 'block' : 'none';
        checkboxBlock.style.display = questionType === 'checkbox' ? 'block' : 'none';
    }
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

    if (jumpEnabled) {
        const questionType = document.getElementById(`questionType${questionId}`).value;
        if (questionType === 'radio') {
            // Populate jump options with Yes/No
            updateJumpOptionsForRadio(questionId);
        } else {
            // Update the jump options when jump logic is enabled for other types
            updateJumpOptions(questionId);
        }
    }
}

function updateJumpOptionsForRadio(questionId) {
    const jumpOptionSelect = document.getElementById(`jumpOption${questionId}`);
    jumpOptionSelect.innerHTML = ''; // Clear any existing options

    const yesOption = document.createElement('option');
    yesOption.value = 'Yes';
    yesOption.text = 'Yes';
    jumpOptionSelect.appendChild(yesOption);

    const noOption = document.createElement('option');
    noOption.value = 'No';
    noOption.text = 'No';
    jumpOptionSelect.appendChild(noOption);
}

function updateJumpOptions(questionId) {
    const dropdownOptionsDiv = document.getElementById(`dropdownOptions${questionId}`);
    const jumpOptionSelect = document.getElementById(`jumpOption${questionId}`);

    // Clear all existing options in jumpOptionSelect
    jumpOptionSelect.innerHTML = '';

    // Add each option from the dropdown input
    dropdownOptionsDiv.querySelectorAll('input[type="text"]').forEach(optionInput => {
        const fullValue = optionInput.value.trim();  // Get the full input value
        if (fullValue) {
            const opt = document.createElement('option');
            opt.value = fullValue;  // Set the entire input as the value
            opt.text = fullValue;   // Update the display text with the full value
            jumpOptionSelect.appendChild(opt);
        }
    });
}

function addDropdownOption(questionId) {
    const dropdownOptionsDiv = document.getElementById(`dropdownOptions${questionId}`);
    const jumpOptionSelect = document.getElementById(`jumpOption${questionId}`);
    const optionCount = dropdownOptionsDiv.children.length + 1;

    const optionDiv = document.createElement('div');
    optionDiv.className = `option${optionCount}`;
    const optionId = `option${questionId}_${optionCount}`;
    optionDiv.innerHTML = `
        <input type="text" id="${optionId}" placeholder="Option ${optionCount}">
        <button type="button" onclick="removeDropdownOption(${questionId}, ${optionCount})">Remove</button>
    `;
    dropdownOptionsDiv.appendChild(optionDiv);

    // Create an empty option in the jump logic dropdown
    const opt = document.createElement('option');
    opt.value = optionId;  // Placeholder value
    opt.text = `Option ${optionCount}`;
    jumpOptionSelect.appendChild(opt);
}

function addCheckboxOption(questionId) {
    const checkboxOptionsDiv = document.getElementById(`checkboxOptions${questionId}`);
    const jumpOptionSelect = document.getElementById(`jumpOption${questionId}`);
    const optionCount = checkboxOptionsDiv.children.length + 1;

    const optionDiv = document.createElement('div');
    optionDiv.className = `option${optionCount}`;
    optionDiv.innerHTML = `
        <input type="text" id="checkboxOption${questionId}_${optionCount}" placeholder="Option ${optionCount}">
        <button type="button" onclick="removeCheckboxOption(${questionId}, ${optionCount})">Remove</button>
    `;
    checkboxOptionsDiv.appendChild(optionDiv);

    const opt = document.createElement('option');
    opt.value = `option${optionCount}`;
    opt.text = `Option ${optionCount}`;
    jumpOptionSelect.appendChild(opt);
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

function removeQuestion(questionId) {
    const questionBlock = document.getElementById(`questionBlock${questionId}`);
    questionBlock.remove();
}

function generateAndDownloadForm() {
    let formHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Custom Form</title>
        <style>
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
        </style>
    </head>
    <body>
        <form id="customForm" onsubmit="return showThankYouMessage();">
    `;

    formHTML += `<script>let jumpTarget = null;<\/script>`;  // Initialize jumpTarget globally

    for (let s = 1; s < sectionCounter; s++) {
        const sectionBlock = document.getElementById(`sectionBlock${s}`);
        if (!sectionBlock) continue;

        formHTML += `<div id="section${s}" class="section${s === 1 ? ' active' : ''}">`;
        formHTML += `<h2>Section ${s}</h2>`;

        const questionsSection = sectionBlock.querySelectorAll('.question-block');
        questionsSection.forEach((questionBlock) => {
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
                // Generate select dropdown for Yes/No questions
                formHTML += `<select id="answer${questionBlock.id.replace('questionBlock', '')}">
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                            </select><br><br>`;
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

            if (jumpEnabled && jumpTo) {
                formHTML += `
                <script>
                    document.getElementById('answer${questionBlock.id.replace('questionBlock', '')}').addEventListener('change', function() {
                        if (this.value === '${jumpOption}') {
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

        formHTML += `<button type="button" onclick="handleNext(${s})">Next</button>`;

        formHTML += `</div>`;

        formHTML += `</div>`;
    }

    formHTML += `
        </form>
        <div id="thankYouMessage" class="thank-you-message">Thank you for completing the survey</div>
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

    downloadHTML(formHTML, "custom_form.html");
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