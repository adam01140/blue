let sectionCounter = 1;
let questionCounter = 1;

function addSection(sectionId = null) {
    const formBuilder = document.getElementById('formBuilder');
    const sectionBlock = document.createElement('div');
    
    // Use provided sectionId or default to sectionCounter
    const currentSectionId = sectionId || sectionCounter;

    sectionBlock.className = 'section-block';
    sectionBlock.id = `sectionBlock${currentSectionId}`;
    sectionBlock.innerHTML = `
        <h2>Section ${currentSectionId}</h2>
        <div id="questionsSection${currentSectionId}"></div>
        <button type="button" onclick="addQuestion(${currentSectionId})">Add Question to Section ${currentSectionId}</button>
        <button type="button" onclick="removeSection(${currentSectionId})">Remove Section</button>
        <hr>
    `;
    formBuilder.appendChild(sectionBlock);

    // Increment sectionCounter only if not loading from JSON
    if (!sectionId) {
        sectionCounter++;
    }
}


function addQuestion(sectionId, questionId = null) {
    const questionsSection = document.getElementById(`questionsSection${sectionId}`);
    const questionBlock = document.createElement('div');
    
    // Use provided questionId or default to questionCounter
    const currentQuestionId = questionId || questionCounter;

    questionBlock.className = 'question-block';
    questionBlock.id = `questionBlock${currentQuestionId}`;
    questionBlock.innerHTML = `
        <label>Question ${currentQuestionId}: </label>
        <input type="text" placeholder="Enter your question" id="question${currentQuestionId}"><br><br>
        
        <label>Question Type: </label>
        <select id="questionType${currentQuestionId}" onchange="toggleOptions(${currentQuestionId})">
            <option value="text">Text</option>
            <option value="radio">Yes/No</option>
            <option value="dropdown">Dropdown</option>
            <option value="checkbox">Checkbox</option>
            <option value="numberedDropdown">Numbered Dropdown</option>
        </select><br><br>

        <div id="optionsBlock${currentQuestionId}" class="dropdown-options" style="display: none;">
            <label>Options: </label>
            <div id="dropdownOptions${currentQuestionId}"></div>
            <button type="button" onclick="addDropdownOption(${currentQuestionId})">Add Option</button>
        </div><br>

        <div id="checkboxBlock${currentQuestionId}" class="checkbox-options" style="display: none;">
            <label>Checkbox Options: </label>
            <div id="checkboxOptions${currentQuestionId}"></div>
            <button type="button" onclick="addCheckboxOption(${currentQuestionId})">Add Option</button>
        </div><br>

        <label>Conditional Logic: </label><br>
        <input type="checkbox" id="logic${currentQuestionId}" onchange="toggleLogic(${currentQuestionId})">
        <label for="logic${currentQuestionId}">Enable Logic</label><br><br>

        <div id="logicBlock${currentQuestionId}" style="display: none;">
            <label>Show this question if: </label><br>
            <input type="number" placeholder="Previous question number" id="prevQuestion${currentQuestionId}"><br>
            <select id="prevAnswer${currentQuestionId}">
                <option value="Yes">Answer is Yes</option>
                <option value="No">Answer is No</option>
            </select>
        </div><br>

        <label>Jump Logic: </label><br>
        <div id="jumpLogic${currentQuestionId}">
            <input type="checkbox" id="enableJump${currentQuestionId}" onchange="toggleJumpLogic(${currentQuestionId})">
            <label for="enableJump${currentQuestionId}">Enable Jump Logic</label><br><br>
            <div id="jumpBlock${currentQuestionId}" style="display: none;">
                <label>Select the option that triggers the jump:</label><br>
                <select id="jumpOption${currentQuestionId}">
                    <!-- Options will be populated dynamically based on the question type -->
                </select><br><br>
                <label>Jump to (enter section number or 'end'):</label><br>
                <input type="text" placeholder="Section number or 'end'" id="jumpTo${currentQuestionId}"><br>
            </div>
        </div><br>

        <button type="button" onclick="removeQuestion(${currentQuestionId})">Remove Question</button>
    `;
    questionsSection.appendChild(questionBlock);

    // Increment questionCounter only if not loading from JSON
    if (!questionId) {
        questionCounter++;
    }
}

function toggleOptions(questionId) {
    const questionType = document.getElementById(`questionType${questionId}`).value;
    const optionsBlock = document.getElementById(`optionsBlock${questionId}`);
    const checkboxBlock = document.getElementById(`checkboxBlock${questionId}`);
    const numberedDropdownBlock = document.getElementById(`numberedDropdownBlock${questionId}`);
    const jumpOptionLabel = document.getElementById(`jumpOptionLabel${questionId}`);
    const jumpOptionSelect = document.getElementById(`jumpOption${questionId}`);

    // Hide all blocks initially
    if (optionsBlock) optionsBlock.style.display = 'none';
    if (checkboxBlock) checkboxBlock.style.display = 'none';
    if (numberedDropdownBlock) numberedDropdownBlock.style.display = 'none';
    if (jumpOptionLabel) jumpOptionLabel.style.display = 'none';
    if (jumpOptionSelect) jumpOptionSelect.style.display = 'none';

    // Show and update specific blocks based on question type
    if (questionType === 'radio') {
        if (jumpOptionLabel) jumpOptionLabel.style.display = 'block';
        if (jumpOptionSelect) {
            jumpOptionSelect.style.display = 'block';
            updateJumpOptionsForRadio(questionId);
        }
    } else if (questionType === 'dropdown') {
        if (optionsBlock) optionsBlock.style.display = 'block';
        if (jumpOptionLabel) jumpOptionLabel.style.display = 'block';
        if (jumpOptionSelect) {
            jumpOptionSelect.style.display = 'block';
            updateJumpOptions(questionId);
        }
    } else if (questionType === 'checkbox') {
        if (checkboxBlock) checkboxBlock.style.display = 'block';
    } else if (questionType === 'numberedDropdown') {
        if (numberedDropdownBlock) numberedDropdownBlock.style.display = 'block';
    }
}


function toggleLogic(questionId) {
    const logicEnabled = document.getElementById(`logic${questionId}`).checked;
    const logicBlock = document.getElementById(`logicBlock${questionId}`);
    logicBlock.style.display = logicEnabled ? 'block' : 'none';

    if (logicEnabled) {
        // Additional logic to manage the display of this question based on previous answers
        const prevQuestionId = document.getElementById(`prevQuestion${questionId}`).value;
        const prevAnswer = document.getElementById(`prevAnswer${questionId}`).value;
        
        if (prevQuestionId) {
            document.getElementById(`answer${prevQuestionId}`).addEventListener('change', function() {
                const selectedAnswer = this.value;
                const currentQuestionBlock = document.getElementById(`questionBlock${questionId}`);
                if (selectedAnswer === prevAnswer) {
                    currentQuestionBlock.style.display = 'block';
                } else {
                    currentQuestionBlock.style.display = 'none';
                }
            });
        }
    }
}


function toggleJumpLogic(questionId) {
    const jumpEnabled = document.getElementById(`enableJump${questionId}`).checked;
    const jumpBlock = document.getElementById(`jumpBlock${questionId}`);
    jumpBlock.style.display = jumpEnabled ? 'block' : 'none';

    if (jumpEnabled) {
        const questionType = document.getElementById(`questionType${questionId}`).value;
        if (questionType === 'radio') {
            updateJumpOptionsForRadio(questionId);
        } else if (questionType === 'dropdown') {
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

    jumpOptionSelect.innerHTML = '';

    dropdownOptionsDiv.querySelectorAll('input[type="text"]').forEach(optionInput => {
        const fullValue = optionInput.value.trim();
        if (fullValue) {
            const opt = document.createElement('option');
            opt.value = fullValue;
            opt.text = fullValue;
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

    const opt = document.createElement('option');
    opt.value = optionId;
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

function removeDropdownOption(questionId, optionNumber) {
    const optionDiv = document.querySelector(`#dropdownOptions${questionId} .option${optionNumber}`);
    optionDiv.remove();
    const jumpOptionSelect = document.getElementById(`jumpOption${questionId}`);
    jumpOptionSelect.querySelector(`option[value="option${optionNumber}"]`).remove();
}

function removeCheckboxOption(questionId, optionNumber) {
    const optionDiv = document.querySelector(`#checkboxOptions${questionId} .option${optionNumber}`);
    optionDiv.remove();
}

function removeTextboxLabel(questionId, labelNumber) {
    const labelDiv = document.querySelector(`#textboxLabels${questionId} .label${labelNumber}`);
    labelDiv.remove();
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
            .section { display: none; }
            .section.active { display: block; }
            .thank-you-message { display: none; font-size: 20px; font-weight: bold; text-align: center; margin-top: 20px; }
        </style>
    </head>
    <body>
        <form id="customForm" onsubmit="return showThankYouMessage();">
        <script>let jumpTarget = null;<\/script>`;

    for (let s = 1; s < sectionCounter; s++) {
        const sectionBlock = document.getElementById(`sectionBlock${s}`);
        if (!sectionBlock) continue;

        formHTML += `<div id="section${s}" class="section${s === 1 ? ' active' : ''}">`;
        formHTML += `<h2>Section ${s}</h2>`;

        const questionsSection = sectionBlock.querySelectorAll('.question-block');
        questionsSection.forEach((questionBlock) => {
            const questionId = questionBlock.id.replace('questionBlock', '');
            const questionText = questionBlock.querySelector(`input[type="text"]`).value;
            const questionType = questionBlock.querySelector(`select`).value;
            const logicEnabled = questionBlock.querySelector(`#logic${questionId}`).checked;
            const prevQuestion = questionBlock.querySelector(`#prevQuestion${questionId}`).value;
            const prevAnswer = questionBlock.querySelector(`#prevAnswer${questionId}`).value;
            const jumpEnabled = questionBlock.querySelector(`#enableJump${questionId}`).checked;
            const jumpOption = questionBlock.querySelector(`#jumpOption${questionId}`).value;
            const jumpTo = questionBlock.querySelector(`#jumpTo${questionId}`).value;

            formHTML += `<div id="question${questionId}" class="question-block">`;
            formHTML += `<label>${questionText}</label><br>`;

            // Form HTML for different types of questions
            if (questionType === 'text') {
                formHTML += `<input type="text" id="answer${questionId}"><br><br>`;
            } else if (questionType === 'radio') {
                formHTML += `
                    <input type="radio" id="answer${questionId}_yes" name="answer${questionId}" value="Yes">
                    <label for="answer${questionId}_yes">Yes</label><br>
                    <input type="radio" id="answer${questionId}_no" name="answer${questionId}" value="No">
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
                    formHTML += `<input type="checkbox" id="answer${questionId}_${index + 1}" name="answer${questionId}" value="${option.value}"> ${option.value}<br>`;
                });
                formHTML += `<br>`;
            }

            // Conditional Logic
            if (logicEnabled && prevQuestion) {
                formHTML += `
                <script>
                    const yesAnswerElement = document.getElementById('answer${prevQuestion}_yes'); 
                    const noAnswerElement = document.getElementById('answer${prevQuestion}_no');
                    const questionElement = document.getElementById('question${questionId}');
                    
                    // Hide the question initially
                    questionElement.style.display = 'none';

                    // Show question if "Yes" is selected, hide if "No" is selected or "Yes" is de-selected
                    yesAnswerElement.addEventListener('change', function() {
                        if (this.checked) {
                            questionElement.style.display = 'block';
                        }
                    });

                    noAnswerElement.addEventListener('change', function() {
                        if (this.checked) {
                            questionElement.style.display = 'none';
                        }
                    });
                <\/script>`;
            }

            // Jump Logic
            if (jumpEnabled && jumpTo) {
                formHTML += `
                <script>
                    document.getElementById('answer${questionId}').addEventListener('change', function() {
                        if (this.value === '${jumpOption}') {
                            jumpTarget = '${jumpTo}';
                        } else {
                            jumpTarget = null; // Reset jumpTarget if no option is selected
                        }
                    });
                <\/script>`;
            }

            formHTML += `</div>`; // Close question block
        });

        // Add navigation buttons
        formHTML += `<div class="navigation-buttons">`;
        if (s > 1) {
            formHTML += `<button type="button" onclick="navigateSection(${s - 1})">Back</button>`;
        }
        formHTML += `<button type="button" onclick="handleNext(${s})">Next</button>`;
        formHTML += `</div></div>`;
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


