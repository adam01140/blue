
// ============================================
// ===========  GLOBAL VARIABLES  =============
// ============================================
let sectionCounter = 1;
let questionCounter = 1;
let hiddenFieldCounter = 1; // Counter for hidden fields

// ============================================
// ===========  SECTION FUNCTIONS  ============
// ============================================
function addSection(sectionId = null) {
    const formBuilder = document.getElementById('formBuilder');
    const sectionBlock = document.createElement('div');

    // Use provided sectionId or default to sectionCounter
    const currentSectionId = sectionId || sectionCounter;

    sectionBlock.className = 'section-block';
    sectionBlock.id = `sectionBlock${currentSectionId}`;
    sectionBlock.innerHTML = `
        <h2 id="sectionLabel${currentSectionId}">Section ${currentSectionId}</h2>
        <label>Section Name: </label>
        <input type="text" id="sectionName${currentSectionId}" placeholder="Enter section name"
               value="Section ${currentSectionId}" oninput="updateSectionName(${currentSectionId})"><br><br>
        <div id="questionsSection${currentSectionId}"></div>
        <button type="button" onclick="addQuestion(${currentSectionId})">Add Question to Section</button>
        <button type="button" onclick="removeSection(${currentSectionId})">Remove Section</button>
        <button type="button" onclick="moveSectionUp(${currentSectionId})">Push Section Up</button>
        <button type="button" onclick="moveSectionDown(${currentSectionId})">Push Section Down</button>
        <hr>
    `;

    formBuilder.appendChild(sectionBlock);

    // Increment sectionCounter only if not loading from JSON
    if (!sectionId) {
        sectionCounter++;
    }
}

function moveSectionUp(sectionId) {
    const sectionBlock = document.getElementById(`sectionBlock${sectionId}`);
    const previousSibling = sectionBlock.previousElementSibling;

    if (previousSibling && previousSibling.classList.contains('section-block')) {
        sectionBlock.parentNode.insertBefore(sectionBlock, previousSibling);
        updateSectionLabels();
    }
}

function moveSectionDown(sectionId) {
    const sectionBlock = document.getElementById(`sectionBlock${sectionId}`);
    const nextSibling = sectionBlock.nextElementSibling;

    if (nextSibling && nextSibling.classList.contains('section-block')) {
        sectionBlock.parentNode.insertBefore(nextSibling, sectionBlock);
        updateSectionLabels();
    }
}

function updateSectionName(sectionId) {
    const sectionNameInput = document.getElementById(`sectionName${sectionId}`);
    const sectionLabel = document.getElementById(`sectionLabel${sectionId}`);
    if (sectionLabel && sectionNameInput) {
        sectionLabel.textContent = sectionNameInput.value;
    }
}

/**
 * Re-label sections (and questions inside) after moves, so that
 * the GUI remains consistent.
 */
function updateSectionLabels() {
    const sections = document.querySelectorAll('.section-block');

    sections.forEach((block, index) => {
        const oldSectionId = block.id.replace('sectionBlock', '');
        const newSectionId = index + 1;

        // Update block ID
        block.id = `sectionBlock${newSectionId}`;

        // Update IDs of section label and input
        const sectionLabel = block.querySelector(`#sectionLabel${oldSectionId}`);
        if (sectionLabel) {
            sectionLabel.id = `sectionLabel${newSectionId}`;
        }

        const sectionNameInput = block.querySelector(`#sectionName${oldSectionId}`);
        if (sectionNameInput) {
            sectionNameInput.id = `sectionName${newSectionId}`;
            sectionNameInput.setAttribute('oninput', `updateSectionName(${newSectionId})`);
        }

        // Update questions section ID
        const questionsSection = block.querySelector(`#questionsSection${oldSectionId}`);
        if (questionsSection) {
            questionsSection.id = `questionsSection${newSectionId}`;
        }

        // Update buttons' onclick attributes
        block.querySelectorAll('button').forEach(button => {
            const onclickAttr = button.getAttribute('onclick');
            if (onclickAttr) {
                const updatedOnclickAttr = onclickAttr.replace(/\d+/, newSectionId);
                button.setAttribute('onclick', updatedOnclickAttr);
            }
        });
    });

    // Update global question labels across all sections
    updateGlobalQuestionLabels();

    sectionCounter = sections.length + 1; // Update sectionCounter
}

/**
 * Re-label questions across all sections
 */
function updateGlobalQuestionLabels() {
    const sections = document.querySelectorAll('.section-block');
    let globalQuestionIndex = 1;

    sections.forEach((block, sectionIndex) => {
        const sectionId = sectionIndex + 1;
        const questionsInSection = block.querySelectorAll('.question-block');

        questionsInSection.forEach(questionBlock => {
            // Update the question label
            questionBlock.querySelector('label').innerText = `Question ${globalQuestionIndex}:`;

            // Update question-related IDs and event handlers
            questionBlock.id = `questionBlock${globalQuestionIndex}`;
            questionBlock.querySelectorAll('input, select, button, div').forEach(input => {
                const oldId = input.id;
                if (oldId) {
                    const newId = oldId.replace(/\d+$/, globalQuestionIndex);
                    input.id = newId;
                    if (input.tagName === 'LABEL' && input.getAttribute('for')) {
                        input.setAttribute('for', newId);
                    }
                }
            });

            // Update the question's "Move Up/Down" & "Remove" buttons
            const moveUpButton = questionBlock.querySelector('button[onclick*="moveQuestionUp"]');
            const moveDownButton = questionBlock.querySelector('button[onclick*="moveQuestionDown"]');
            const removeButton = questionBlock.querySelector('button[onclick*="removeQuestion"]');

            moveUpButton.setAttribute('onclick', `moveQuestionUp(${globalQuestionIndex}, ${sectionId})`);
            moveDownButton.setAttribute('onclick', `moveQuestionDown(${globalQuestionIndex}, ${sectionId})`);
            removeButton.setAttribute('onclick', `removeQuestion(${globalQuestionIndex})`);

            globalQuestionIndex++;
        });
    });

    questionCounter = globalQuestionIndex;  // Reset questionCounter
}

function removeSection(sectionId) {
    const sectionBlock = document.getElementById(`sectionBlock${sectionId}`);
    sectionBlock.remove();
    updateSectionLabels();
}

// ============================================
// ===========  QUESTION FUNCTIONS  ===========
// ============================================
function addQuestion(sectionId, questionId = null) {
    const questionsSection = document.getElementById(`questionsSection${sectionId}`);
    const questionBlock = document.createElement('div');

    const currentQuestionId = questionId || questionCounter;

    questionBlock.className = 'question-block';
    questionBlock.id = `questionBlock${currentQuestionId}`;
    questionBlock.innerHTML = `
        <label>Question ${currentQuestionId}: </label>
        <input type="text" placeholder="Enter your question" id="question${currentQuestionId}"><br><br>

        <label>Question Type: </label>
        <center>
        <select id="questionType${currentQuestionId}" onchange="toggleOptions(${currentQuestionId})">
            <option value="text">Text</option>
            <option value="radio">Yes/No</option>
            <option value="dropdown">Dropdown</option>
            <option value="checkbox">Checkbox</option>
            <option value="numberedDropdown">Numbered Dropdown</option>
            <option value="multipleTextboxes">Multiple Textboxes</option>
            <option value="money">Money</option>
            <option value="date">Date</option>
            <option value="bigParagraph">Big Paragraph</option>
        </select><br><br>

        <!-- Name/ID and Placeholder for Text, Big Paragraph, Radio, and Dropdown -->
        <div id="textboxOptions${currentQuestionId}" class="textbox-options" style="display: none;">
            <label>Name/ID: </label>
            <input type="text" id="textboxName${currentQuestionId}" placeholder="Enter field name"><br><br>

            <label>Placeholder: </label>
            <input type="text" id="textboxPlaceholder${currentQuestionId}" placeholder="Enter placeholder">
        </div>

        <!-- Numbered Dropdown Options -->
        <div id="numberedDropdownBlock${currentQuestionId}" class="numbered-dropdown-options" style="display: none;">
            <label>Number Range: </label>
            <input type="number" id="numberRangeStart${currentQuestionId}" placeholder="Start" min="1" style="width: 60px;">
            <input type="number" id="numberRangeEnd${currentQuestionId}" placeholder="End" min="1" style="width: 60px;"><br><br>
            <label>Textbox Labels:</label>
            <div id="textboxLabels${currentQuestionId}"></div>
            <button type="button" onclick="addTextboxLabel(${currentQuestionId})">Add Label</button>
        </div><br>

        <!-- Dropdown Options -->
        <div id="optionsBlock${currentQuestionId}" class="dropdown-options" style="display: none;">
            <label>Options: </label>
            <div id="dropdownOptions${currentQuestionId}"></div>
            <button type="button" onclick="addDropdownOption(${currentQuestionId})">Add Option</button>
        </div><br>

        <!-- Checkbox Options -->
        <div id="checkboxBlock${currentQuestionId}" class="checkbox-options" style="display: none;">
            <label>Checkbox Options: </label>
            <div id="checkboxOptions${currentQuestionId}"></div>
            <button type="button" onclick="addCheckboxOption(${currentQuestionId})">Add Option</button>
            <div style="margin-top: 10px;">
                <input type="checkbox" id="noneOfTheAbove${currentQuestionId}" onchange="updateConditionalPDFAnswersForCheckbox(${currentQuestionId})">
                <label for="noneOfTheAbove${currentQuestionId}">Include "None of the above" option</label>
            </div>
        </div><br>

        <!-- Multiple Textboxes Options -->
        <div id="multipleTextboxesBlock${currentQuestionId}" class="multiple-textboxes-options" style="display: none;">
            <label>Textbox Options: </label>
            <div id="multipleTextboxesOptions${currentQuestionId}"></div>
            <button type="button" onclick="addMultipleTextboxOption(${currentQuestionId})">Add Textbox</button>
        </div><br>

        <!-- Conditional Logic -->
        <label>Enable Conditional Logic: </label>
        <input type="checkbox" id="logic${currentQuestionId}" onchange="toggleLogic(${currentQuestionId})">
        <div id="logicBlock${currentQuestionId}" style="display: none;">
            <label>Show this question if: </label><br>
            <input type="number" placeholder="Previous question number" 
                   id="prevQuestion${currentQuestionId}" 
                   onchange="updateLogicAnswers(${currentQuestionId})"><br>

            <!-- CHANGED to <select> for possible answers: -->
            <select id="prevAnswer${currentQuestionId}" style="display: block;">
                <option value="">-- Select an answer --</option>
            </select><br>
        </div><br>

        <!-- Jump Logic -->
        <label>Enable Jump Logic: </label>
        <div id="jumpLogic${currentQuestionId}">
            <input type="checkbox" id="enableJump${currentQuestionId}" onchange="toggleJumpLogic(${currentQuestionId})">
            <div id="jumpBlock${currentQuestionId}" style="display: none;">
                <label id="jumpOptionLabel${currentQuestionId}" style="text-align: center;">Select the option that triggers the jump:</label><br>
                <select id="jumpOption${currentQuestionId}" style="display: block; margin: 0 auto;"></select><br><br>
                <label>Jump to (enter section number or 'end'):</label><br>
                <input type="text" placeholder="Section number or 'end'" id="jumpTo${currentQuestionId}"><br>
            </div>
        </div><br>

        <!-- Conditional PDF Logic -->
        <div id="conditionalPDFLogic${currentQuestionId}" style="display: none;">
            <label>Enable Conditional PDF: </label>
            <input type="checkbox" id="enableConditionalPDF${currentQuestionId}" onchange="toggleConditionalPDFLogic(${currentQuestionId})"><br><br>
            <div id="conditionalPDFBlock${currentQuestionId}" style="display: none;">
                <label>PDF Name:</label>
                <input type="text" id="conditionalPDFName${currentQuestionId}" placeholder="Enter PDF name (e.g., sc-100.pdf)"><br><br>
                <label>Attach PDF if the answer is:</label>
                <select id="conditionalPDFAnswer${currentQuestionId}">
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                </select><br>
            </div>
        </div><br>

        <!-- Conditional Alert Logic -->
        <div id="conditionalAlertLogic${currentQuestionId}" style="display: none;">
            <label>Enable Conditional Alert: </label>
            <input type="checkbox" id="enableConditionalAlert${currentQuestionId}" onchange="toggleConditionalAlertLogic(${currentQuestionId})"><br><br>
            <div id="conditionalAlertBlock${currentQuestionId}" style="display: none;">
                <label>Trigger this alert if: </label><br>
                <input type="number" placeholder="Previous question number" id="alertPrevQuestion${currentQuestionId}"><br>
                <input type="text" placeholder="Answer value" id="alertPrevAnswer${currentQuestionId}"><br><br>
                <label>Alert Text:</label><br>
                <input type="text" id="alertText${currentQuestionId}" placeholder="Enter alert text"><br>
            </div>
        </div><br>

        <!-- Question Controls -->
        <button type="button" onclick="moveQuestionUp(${currentQuestionId}, ${sectionId})">Move Question Up</button>
        <button type="button" onclick="moveQuestionDown(${currentQuestionId}, ${sectionId})">Move Question Down</button>
        <button type="button" onclick="removeQuestion(${currentQuestionId})">Remove Question</button>
    `;

    questionsSection.appendChild(questionBlock);

    // Ensure the correct options menu is displayed based on the selected type
    toggleOptions(currentQuestionId);

    // Update hidden field references (if any)
    updateAutofillOptions();

    // If brand new question, increment questionCounter
    if (!questionId) {
        questionCounter++;
    }
}

function toggleLogic(questionId) {
    const logicEnabled = document.getElementById(`logic${questionId}`).checked;
    const logicBlock = document.getElementById(`logicBlock${questionId}`);
    logicBlock.style.display = logicEnabled ? 'block' : 'none';

    if (logicEnabled) {
        // If just turned on, fill possible answers
        updateLogicAnswers(questionId);
    }
}

/** 
 * Refill #prevAnswer{questionId} with possible answers from "previous question #"
 */
function updateLogicAnswers(questionId) {
    const prevQuestionField = document.getElementById(`prevQuestion${questionId}`);
    const answerSelect = document.getElementById(`prevAnswer${questionId}`);
    if (!prevQuestionField || !answerSelect) return;

    const prevQNum = parseInt(prevQuestionField.value);
    if (!prevQNum) {
        answerSelect.innerHTML = '<option value="">-- Select an answer --</option>';
        return;
    }

    // find that question block
    const targetQuestionBlock = document.getElementById(`questionBlock${prevQNum}`);
    if (!targetQuestionBlock) {
        answerSelect.innerHTML = '<option value="">-- (invalid question #) --</option>';
        return;
    }

    const questionType = targetQuestionBlock.querySelector(`#questionType${prevQNum}`)?.value;
    if (!questionType) return;

    // Clear old answers
    answerSelect.innerHTML = '<option value="">-- Select an answer --</option>';

    // Now gather possible answers
    if (questionType === 'radio') {
        answerSelect.innerHTML += `
            <option value="Yes">Yes</option>
            <option value="No">No</option>
        `;
    } else if (questionType === 'dropdown') {
        const dropOpts = targetQuestionBlock.querySelectorAll(`#dropdownOptions${prevQNum} input`);
        dropOpts.forEach(opt => {
            const val = opt.value.trim();
            if (val) {
                const optionEl = document.createElement('option');
                optionEl.value = val;
                optionEl.textContent = val;
                answerSelect.appendChild(optionEl);
            }
        });
    } else if (questionType === 'checkbox') {
        const checkOpts = targetQuestionBlock.querySelectorAll(`#checkboxOptions${prevQNum} [id^="checkboxOptionText"]`);
        checkOpts.forEach(optInput => {
            const val = optInput.value.trim();
            if (val) {
                const optionEl = document.createElement('option');
                optionEl.value = val;
                optionEl.textContent = val;
                answerSelect.appendChild(optionEl);
            }
        });
        // If user included "None of the above"
        const noneOfAbove = targetQuestionBlock.querySelector(`#noneOfTheAbove${prevQNum}`);
        if (noneOfAbove && noneOfAbove.checked) {
            const optionEl = document.createElement('option');
            optionEl.value = 'None of the above';
            optionEl.textContent = 'None of the above';
            answerSelect.appendChild(optionEl);
        }
    }
}

function toggleJumpLogic(questionId) {
    const jumpEnabled = document.getElementById(`enableJump${questionId}`).checked;
    const jumpBlock = document.getElementById(`jumpBlock${questionId}`);
    jumpBlock.style.display = jumpEnabled ? 'block' : 'none';
}

function toggleConditionalPDFLogic(questionId) {
    const conditionalPDFEnabled = document.getElementById(`enableConditionalPDF${questionId}`).checked;
    const conditionalPDFBlock = document.getElementById(`conditionalPDFBlock${questionId}`);
    conditionalPDFBlock.style.display = conditionalPDFEnabled ? 'block' : 'none';
}

function toggleConditionalAlertLogic(questionId) {
    const conditionalAlertEnabled = document.getElementById(`enableConditionalAlert${questionId}`).checked;
    const conditionalAlertBlock = document.getElementById(`conditionalAlertBlock${questionId}`);
    conditionalAlertBlock.style.display = conditionalAlertEnabled ? 'block' : 'none';
}

function moveQuestionUp(questionId, sectionId) {
    const questionBlock = document.getElementById(`questionBlock${questionId}`);
    const previousSibling = questionBlock.previousElementSibling;

    if (previousSibling && previousSibling.classList.contains('question-block')) {
        questionBlock.parentNode.insertBefore(questionBlock, previousSibling);
        updateQuestionLabels(sectionId);
        updateAutofillOptions();
    }
}

function moveQuestionDown(questionId, sectionId) {
    const questionBlock = document.getElementById(`questionBlock${questionId}`);
    const nextSibling = questionBlock.nextElementSibling;

    if (nextSibling && nextSibling.classList.contains('question-block')) {
        questionBlock.parentNode.insertBefore(nextSibling, questionBlock);
        updateQuestionLabels(sectionId);
        updateAutofillOptions();
    }
}

function updateQuestionLabels(sectionId) {
    const questionsSection = document.getElementById(`questionsSection${sectionId}`);
    const questionBlocks = questionsSection.querySelectorAll('.question-block');

    questionBlocks.forEach((block, index) => {
        const questionLabel = block.querySelector('label');
        questionLabel.textContent = `Question ${index + 1}: `;
    });
}

/**
 * Show/hide advanced blocks depending on question type
 */
function toggleOptions(questionId) {
    const questionTypeSelect = document.getElementById(`questionType${questionId}`);
    if (!questionTypeSelect) return;

    const questionType = questionTypeSelect.value;
    const optionsBlock = document.getElementById(`optionsBlock${questionId}`);
    const checkboxBlock = document.getElementById(`checkboxBlock${questionId}`);
    const numberedDropdownBlock = document.getElementById(`numberedDropdownBlock${questionId}`);
    const multipleTextboxesBlock = document.getElementById(`multipleTextboxesBlock${questionId}`);
    const textboxOptionsBlock = document.getElementById(`textboxOptions${questionId}`);
    const jumpOptionLabel = document.getElementById(`jumpOptionLabel${questionId}`);
    const jumpOptionSelect = document.getElementById(`jumpOption${questionId}`);
    const conditionalPDFLogicDiv = document.getElementById(`conditionalPDFLogic${questionId}`);

    // Hide everything first
    if (textboxOptionsBlock) textboxOptionsBlock.style.display = 'none';
    if (optionsBlock) optionsBlock.style.display = 'none';
    if (checkboxBlock) checkboxBlock.style.display = 'none';
    if (numberedDropdownBlock) numberedDropdownBlock.style.display = 'none';
    if (multipleTextboxesBlock) multipleTextboxesBlock.style.display = 'none';
    if (jumpOptionLabel) jumpOptionLabel.style.display = 'none';
    if (jumpOptionSelect) jumpOptionSelect.style.display = 'none';
    if (conditionalPDFLogicDiv) conditionalPDFLogicDiv.style.display = 'none';

    switch (questionType) {
        case 'text':
        case 'bigParagraph':
        case 'radio':
        case 'dropdown':
            if (textboxOptionsBlock) textboxOptionsBlock.style.display = 'block';
            if (questionType === 'radio' || questionType === 'dropdown') {
                if (jumpOptionLabel) jumpOptionLabel.style.display = 'block';
                if (jumpOptionSelect) {
                    jumpOptionSelect.style.display = 'block';
                    if (questionType === 'radio') {
                        updateJumpOptionsForRadio(questionId);
                    } else {
                        updateJumpOptions(questionId);
                    }
                }
            }
            if (questionType === 'dropdown' && optionsBlock) {
                optionsBlock.style.display = 'block';
            }
            if (questionType === 'radio' && conditionalPDFLogicDiv) {
                conditionalPDFLogicDiv.style.display = 'block';
                updateConditionalPDFAnswersForRadio(questionId);
            }
            break;
        case 'multipleTextboxes':
            if (multipleTextboxesBlock) multipleTextboxesBlock.style.display = 'block';
            break;
        case 'checkbox':
            if (checkboxBlock) checkboxBlock.style.display = 'block';
            if (conditionalPDFLogicDiv) {
                conditionalPDFLogicDiv.style.display = 'block';
                updateConditionalPDFAnswersForCheckbox(questionId);
            }
            break;
        case 'numberedDropdown':
            if (numberedDropdownBlock) numberedDropdownBlock.style.display = 'block';
            break;
        case 'money':
        case 'date':
            // no special sub-block
            break;
    }

    // Also show PDF/Alert logic if radio or checkbox
    if ((questionType === 'radio' || questionType === 'checkbox') && conditionalPDFLogicDiv) {
        conditionalPDFLogicDiv.style.display = 'block';
    }

    // Also show conditional alert logic if question is radio/checkbox
    const conditionalAlertLogicDiv = document.getElementById(`conditionalAlertLogic${questionId}`);
    if (questionType === 'radio' || questionType === 'checkbox') {
        if (conditionalAlertLogicDiv) {
            conditionalAlertLogicDiv.style.display = 'block';
        }
    }

    updateAutofillOptions();
}

function updateConditionalPDFAnswersForRadio(questionId) {
    const conditionalPDFAnswerSelect = document.getElementById(`conditionalPDFAnswer${questionId}`);
    if (!conditionalPDFAnswerSelect) return;
    conditionalPDFAnswerSelect.innerHTML = '';
    const options = ['Yes', 'No'];
    options.forEach(optionText => {
        const opt = document.createElement('option');
        opt.value = optionText;
        opt.text = optionText;
        conditionalPDFAnswerSelect.appendChild(opt);
    });
}

function updateConditionalPDFAnswersForCheckbox(questionId) {
    const conditionalPDFAnswerSelect = document.getElementById(`conditionalPDFAnswer${questionId}`);
    if (!conditionalPDFAnswerSelect) return;

    conditionalPDFAnswerSelect.innerHTML = ''; // Clear existing options

    const checkboxOptionsDiv = document.getElementById(`checkboxOptions${questionId}`);
    if (!checkboxOptionsDiv) return;

    const options = checkboxOptionsDiv.querySelectorAll(`input[id^="checkboxOptionText${questionId}_"]`);
    options.forEach(optionInput => {
        const optionText = optionInput.value.trim();
        if (optionText) {
            const opt = document.createElement('option');
            opt.value = optionText;
            opt.text = optionText;
            conditionalPDFAnswerSelect.appendChild(opt);
        }
    });

    const noneOfTheAboveCheckbox = document.getElementById(`noneOfTheAbove${questionId}`);
    if (noneOfTheAboveCheckbox && noneOfTheAboveCheckbox.checked) {
        const opt = document.createElement('option');
        opt.value = 'None of the above';
        opt.text = 'None of the above';
        conditionalPDFAnswerSelect.appendChild(opt);
    }
}

/**
 * Add multiple textboxes
 */
function addMultipleTextboxOption(questionId) {
    const multipleTextboxesOptionsDiv = document.getElementById(`multipleTextboxesOptions${questionId}`);
    const optionCount = multipleTextboxesOptionsDiv.children.length + 1;

    const optionDiv = document.createElement('div');
    optionDiv.className = `option${optionCount}`;
    optionDiv.innerHTML = `
        <h4>Textbox ${optionCount}</h4>
        <label>Label:</label>
        <input type="text" id="multipleTextboxLabel${questionId}_${optionCount}" placeholder="Label ${optionCount}"><br><br>
        <label>Name/ID:</label>
        <input type="text" id="multipleTextboxName${questionId}_${optionCount}" placeholder="Name/ID ${optionCount}"><br><br>
        <label>Placeholder:</label>
        <input type="text" id="multipleTextboxPlaceholder${questionId}_${optionCount}" placeholder="Placeholder ${optionCount}">
        <button type="button" onclick="removeMultipleTextboxOption(${questionId}, ${optionCount})">Remove Textbox</button>
        <hr>
    `;
    multipleTextboxesOptionsDiv.appendChild(optionDiv);
}

function removeMultipleTextboxOption(questionId, optionNumber) {
    const optionDiv = document.querySelector(`#multipleTextboxesOptions${questionId} .option${optionNumber}`);
    if (optionDiv) {
        optionDiv.remove();
        const options = document.querySelectorAll(`#multipleTextboxesOptions${questionId} > div`);
        options.forEach((option, index) => {
            option.className = `option${index + 1}`;
            option.querySelector('h4').innerText = `Textbox ${index + 1}`;
            option.querySelector(`input[id^="multipleTextboxLabel"]`).id = `multipleTextboxLabel${questionId}_${index + 1}`;
            option.querySelector(`input[id^="multipleTextboxName"]`).id = `multipleTextboxName${questionId}_${index + 1}`;
            option.querySelector(`input[id^="multipleTextboxPlaceholder"]`).id = `multipleTextboxPlaceholder${questionId}_${index + 1}`;
            option.querySelector('button').setAttribute('onclick', `removeMultipleTextboxOption(${questionId}, ${index + 1})`);
        });
    }
}

/**
 * radio jump options
 */
function updateJumpOptionsForRadio(questionId) {
    const jumpOptionSelect = document.getElementById(`jumpOption${questionId}`);
    jumpOptionSelect.innerHTML = '';
    const yesOption = document.createElement('option');
    yesOption.value = 'Yes';
    yesOption.text = 'Yes';
    jumpOptionSelect.appendChild(yesOption);

    const noOption = document.createElement('option');
    noOption.value = 'No';
    noOption.text = 'No';
    jumpOptionSelect.appendChild(noOption);
}

/**
 * dropdown jump options
 */
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

/**
 * Add a dropdown option
 */
function addDropdownOption(questionId) {
    const dropdownOptionsDiv = document.getElementById(`dropdownOptions${questionId}`);
    const optionCount = dropdownOptionsDiv.children.length + 1;

    const optionDiv = document.createElement('div');
    optionDiv.className = `option${optionCount}`;
    const optionId = `option${questionId}_${optionCount}`;
    optionDiv.innerHTML = `
        <input type="text" id="${optionId}" placeholder="Option ${optionCount}">
        <button type="button" onclick="removeDropdownOption(${questionId}, ${optionCount})">Remove</button>
    `;
    dropdownOptionsDiv.appendChild(optionDiv);

    updateJumpOptions(questionId);
}

function removeDropdownOption(questionId, optionNumber) {
    const optionDiv = document.querySelector(`#dropdownOptions${questionId} .option${optionNumber}`);
    if (optionDiv) {
        optionDiv.remove();
        const options = document.querySelectorAll(`#dropdownOptions${questionId} > div`);
        options.forEach((option, index) => {
            option.className = `option${index + 1}`;
            option.querySelector('input').id = `option${questionId}_${index + 1}`;
            option.querySelector('button').setAttribute('onclick', `removeDropdownOption(${questionId}, ${index + 1})`);
        });
    }
    updateJumpOptions(questionId);
}

/**
 * Add a checkbox option
 */
function addCheckboxOption(questionId) {
    const checkboxOptionsDiv = document.getElementById(`checkboxOptions${questionId}`);
    const optionCount = checkboxOptionsDiv.children.length + 1;

    const optionDiv = document.createElement('div');
    optionDiv.className = `option${optionCount}`;
    optionDiv.innerHTML = `
        <label>Option ${optionCount} Text:</label>
        <input type="text" id="checkboxOptionText${questionId}_${optionCount}" placeholder="Enter option text"><br><br>
        <label>Name/ID:</label>
        <input type="text" id="checkboxOptionName${questionId}_${optionCount}" placeholder="Enter Name/ID"><br><br>
        <label>Value (optional):</label>
        <input type="text" id="checkboxOptionValue${questionId}_${optionCount}" placeholder="Enter Value"><br><br>
        <button type="button" onclick="removeCheckboxOption(${questionId}, ${optionCount})">Remove</button>
        <hr>
    `;
    checkboxOptionsDiv.appendChild(optionDiv);
    updateConditionalPDFAnswersForCheckbox(questionId);
}

function removeCheckboxOption(questionId, optionNumber) {
    const optionDiv = document.querySelector(`#checkboxOptions${questionId} .option${optionNumber}`);
    if (optionDiv) {
        optionDiv.remove();
        const options = document.querySelectorAll(`#checkboxOptions${questionId} > div`);
        options.forEach((option, index) => {
            const newOptionNumber = index + 1;
            option.className = `option${newOptionNumber}`;
            option.querySelector('label').innerText = `Option ${newOptionNumber} Text:`;
            option.querySelector(`input[id^="checkboxOptionText"]`).id = `checkboxOptionText${questionId}_${newOptionNumber}`;
            option.querySelector(`input[id^="checkboxOptionName"]`).id = `checkboxOptionName${questionId}_${newOptionNumber}`;
            option.querySelector(`input[id^="checkboxOptionValue"]`).id = `checkboxOptionValue${questionId}_${newOptionNumber}`;
            option.querySelector('button').setAttribute('onclick', `removeCheckboxOption(${questionId}, ${newOptionNumber})`);
        });
    }
    updateConditionalPDFAnswersForCheckbox(questionId);
}

/**
 * Textbox labels for numberedDropdown
 */
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

function removeTextboxLabel(questionId, labelNumber) {
    const labelDiv = document.querySelector(`#textboxLabels${questionId} .label${labelNumber}`);
    if (labelDiv) {
        labelDiv.remove();
        const labels = document.querySelectorAll(`#textboxLabels${questionId} > div`);
        labels.forEach((label, index) => {
            const newLabelNumber = index + 1;
            label.className = `label${newLabelNumber}`;
            label.querySelector('input').id = `label${questionId}_${newLabelNumber}`;
            label.querySelector('input').placeholder = `Label ${newLabelNumber}`;
            label.querySelector('button').setAttribute('onclick', `removeTextboxLabel(${questionId}, ${newLabelNumber})`);
        });
    }
}

function removeQuestion(questionId) {
    const questionBlock = document.getElementById(`questionBlock${questionId}`);
    const sectionId = questionBlock.closest('.section-block').id.replace('sectionBlock', '');
    questionBlock.remove();
    updateGlobalQuestionLabels();
    updateAutofillOptions();
}

// ============================================
// ===========  HIDDEN FIELDS MOD  ============
// ============================================
function initializeHiddenPDFFieldsModule() {
    const formBuilder = document.getElementById('formBuilder');
    const hiddenFieldsModule = document.createElement('div');
    hiddenFieldsModule.id = 'hiddenFieldsModule';
    hiddenFieldsModule.innerHTML = `
        <h2>Form Editor</h2>
        <div id="hiddenFieldsContainer"></div>
        <button type="button" onclick="addHiddenField()">Add Hidden Field</button>
        <hr>
    `;
    formBuilder.appendChild(hiddenFieldsModule);
}
initializeHiddenPDFFieldsModule(); // call once on load

function addHiddenField() {
    const hiddenFieldsContainer = document.getElementById('hiddenFieldsContainer');
    const hiddenFieldBlock = document.createElement('div');
    const currentHiddenFieldId = hiddenFieldCounter;

    hiddenFieldBlock.className = 'hidden-field-block';
    hiddenFieldBlock.id = `hiddenFieldBlock${currentHiddenFieldId}`;
    hiddenFieldBlock.innerHTML = `
        <label>Hidden Field ${currentHiddenFieldId}: </label>
        <select id="hiddenFieldType${currentHiddenFieldId}" onchange="toggleHiddenFieldOptions(${currentHiddenFieldId})">
            <option value="text">Textbox</option>
            <option value="checkbox">Checkbox</option>
        </select><br><br>
        <div id="hiddenFieldOptions${currentHiddenFieldId}">
            <!-- Options will be populated based on the type -->
        </div>
        <button type="button" onclick="removeHiddenField(${currentHiddenFieldId})">Remove Hidden Field</button>
        <hr>
    `;
    hiddenFieldsContainer.appendChild(hiddenFieldBlock);
    toggleHiddenFieldOptions(currentHiddenFieldId);
    hiddenFieldCounter++;
}

function toggleHiddenFieldOptions(hiddenFieldId) {
    const fieldType = document.getElementById(`hiddenFieldType${hiddenFieldId}`).value;
    const hiddenFieldOptions = document.getElementById(`hiddenFieldOptions${hiddenFieldId}`);

    hiddenFieldOptions.innerHTML = '';

    if (fieldType === 'text') {
        hiddenFieldOptions.innerHTML = `
            <label>Name/ID: </label>
            <input type="text" id="hiddenFieldName${hiddenFieldId}" placeholder="Enter field name"><br><br>
            <label>Autofill from question:</label><br>
            <select id="hiddenFieldAutofill${hiddenFieldId}" style="width: 300px;">
                <option value="">-- Select a question --</option>
                ${generateQuestionOptions()}
            </select><br><br>
            <label>Conditional Autofill Logic:</label><br>
            <div id="conditionalAutofill${hiddenFieldId}"></div>
            <button type="button" onclick="addConditionalAutofill(${hiddenFieldId})">Add Conditional Logic</button><br><br>
        `;
    } else if (fieldType === 'checkbox') {
        hiddenFieldOptions.innerHTML = `
            <label>Name/ID: </label>
            <input type="text" id="hiddenFieldName${hiddenFieldId}" placeholder="Enter field name"><br><br>
            <label>Checked by default: </label>
            <input type="checkbox" id="hiddenFieldChecked${hiddenFieldId}"><br><br>
            <label>Conditional Autofill Logic:</label><br>
            <div id="conditionalAutofillForCheckbox${hiddenFieldId}"></div>
            <button type="button" onclick="addConditionalAutofillForCheckbox(${hiddenFieldId})">Add Conditional Logic</button><br><br>
        `;
    }
}

function removeHiddenField(hiddenFieldId) {
    const hiddenFieldBlock = document.getElementById(`hiddenFieldBlock${hiddenFieldId}`);
    hiddenFieldBlock.remove();
}

function addConditionalAutofillForCheckbox(hiddenFieldId) {
    const conditionalAutofillDiv = document.getElementById(`conditionalAutofillForCheckbox${hiddenFieldId}`);
    const conditionId = conditionalAutofillDiv.children.length + 1;

    const conditionDiv = document.createElement('div');
    conditionDiv.className = `condition${conditionId}`;
    conditionDiv.id = `condition${hiddenFieldId}_${conditionId}`;
    conditionDiv.innerHTML = `
        <label>Condition ${conditionId}:</label><br>
        <label>Question:</label>
        <select id="conditionQuestion${hiddenFieldId}_${conditionId}" onchange="updateConditionAnswers(${hiddenFieldId}, ${conditionId})" style="width: 300px;">
            <option value="">-- Select a question --</option>
            ${generateAllQuestionOptions()}
        </select><br>
        <label>Answer:</label>
        <select id="conditionAnswer${hiddenFieldId}_${conditionId}" style="width: 300px;">
            <option value="">-- Select an answer --</option>
        </select><br>
        <label>Value:</label>
        <select id="conditionValue${hiddenFieldId}_${conditionId}" style="width: 300px;">
            <option value="checked">Checked</option>
            <option value="unchecked">Unchecked</option>
        </select><br>
        <button type="button" onclick="removeConditionalAutofill(${hiddenFieldId}, ${conditionId})">Remove Condition</button>
        <hr>
    `;
    conditionalAutofillDiv.appendChild(conditionDiv);
}

function generateQuestionOptions() {
    let optionsHTML = '';
    const questionBlocks = document.querySelectorAll('.question-block');

    questionBlocks.forEach(questionBlock => {
        const questionId = questionBlock.id.replace('questionBlock', '');
        const questionText = questionBlock.querySelector('input[type="text"]').value;
        const questionType = questionBlock.querySelector('select').value;

        if (['text', 'bigParagraph', 'money', 'date', 'radio', 'dropdown'].includes(questionType)) {
            optionsHTML += `<option value="${questionId}">Question ${questionId}: ${questionText}</option>`;
        }

        if (questionType === 'multipleTextboxes') {
            const textboxes = questionBlock.querySelectorAll(`#multipleTextboxesOptions${questionId} .option`);
            textboxes.forEach((textbox, idx) => {
                const label = textbox.querySelector(`input[id^="multipleTextboxLabel"]`).value || `Textbox ${idx + 1}`;
                const nameId = textbox.querySelector(`input[id^="multipleTextboxName"]`).value || `answer${questionId}_${idx + 1}`;
                optionsHTML += `<option value="${questionId}_${idx + 1}">Question ${questionId} - ${label} (${nameId})</option>`;
            });
        }
    });

    return optionsHTML;
}

function generateAllQuestionOptions() {
    let optionsHTML = '';
    const questionBlocks = document.querySelectorAll('.question-block');

    questionBlocks.forEach(questionBlock => {
        const questionId = questionBlock.id.replace('questionBlock', '');
        const questionText = questionBlock.querySelector('input[type="text"]').value;
        const questionType = questionBlock.querySelector('select').value;

        if (['dropdown', 'radio', 'checkbox'].includes(questionType)) {
            optionsHTML += `<option value="${questionId}">Question ${questionId}: ${questionText}</option>`;
        }
    });

    return optionsHTML;
}

function addConditionalAutofill(hiddenFieldId) {
    const conditionalAutofillDiv = document.getElementById(`conditionalAutofill${hiddenFieldId}`);
    const conditionId = conditionalAutofillDiv.children.length + 1;

    const conditionDiv = document.createElement('div');
    conditionDiv.className = 'condition';
    conditionDiv.id = `condition${hiddenFieldId}_${conditionId}`;
    conditionDiv.innerHTML = `
        <label>Condition ${conditionId}:</label><br>
        <label>Question:</label>
        <select id="conditionQuestion${hiddenFieldId}_${conditionId}" onchange="updateConditionAnswers(${hiddenFieldId}, ${conditionId})" style="width: 300px;">
            <option value="">-- Select a question --</option>
            ${generateAllQuestionOptions()}
        </select><br>
        <label>Answer:</label>
        <select id="conditionAnswer${hiddenFieldId}_${conditionId}" style="width: 300px;">
            <option value="">-- Select an answer --</option>
        </select><br>
        <label>Value to Autofill:</label>
        <input type="text" id="conditionValue${hiddenFieldId}_${conditionId}" placeholder="Enter value"><br>
        <button type="button" onclick="removeConditionalAutofill(${hiddenFieldId}, ${conditionId})">Remove Condition</button>
        <hr>
    `;
    conditionalAutofillDiv.appendChild(conditionDiv);
}

function removeConditionalAutofill(hiddenFieldId, conditionId) {
    const conditionDiv = document.getElementById(`condition${hiddenFieldId}_${conditionId}`);
    if (conditionDiv) {
        conditionDiv.remove();
    }
}

function updateConditionAnswers(hiddenFieldId, conditionId) {
    const questionSelect = document.getElementById(`conditionQuestion${hiddenFieldId}_${conditionId}`);
    const answerSelect = document.getElementById(`conditionAnswer${hiddenFieldId}_${conditionId}`);
    const selectedQuestionId = questionSelect.value;

    answerSelect.innerHTML = '<option value="">-- Select an answer --</option>';

    const questionBlock = document.getElementById(`questionBlock${selectedQuestionId}`);
    if (questionBlock) {
        const questionType = questionBlock.querySelector('select').value;

        if (questionType === 'radio') {
            answerSelect.innerHTML += `
                <option value="Yes">Yes</option>
                <option value="No">No</option>
            `;
        } else if (questionType === 'dropdown') {
            const options = questionBlock.querySelectorAll(`#dropdownOptions${selectedQuestionId} input`);
            options.forEach(option => {
                answerSelect.innerHTML += `<option value="${option.value}">${option.value}</option>`;
            });
        } else if (questionType === 'checkbox') {
            const opts = questionBlock.querySelectorAll(`#checkboxOptions${selectedQuestionId} [id^="checkboxOptionText"]`);
            opts.forEach(option => {
                const val = option.value.trim();
                if (val) {
                    answerSelect.innerHTML += `<option value="${val}">${val}</option>`;
                }
            });
            const noneOfTheAboveSelected = questionBlock.querySelector(`#noneOfTheAbove${selectedQuestionId}`)?.checked;
            if (noneOfTheAboveSelected) {
                answerSelect.innerHTML += `<option value="None of the above">None of the above</option>`;
            }
        }
    }
}

/**
 * Refresh hidden field references after question changes
 */
function updateAutofillOptions() {
    const hiddenFieldBlocks = document.querySelectorAll('.hidden-field-block');
    hiddenFieldBlocks.forEach(hiddenFieldBlock => {
        const hiddenFieldId = hiddenFieldBlock.id.replace('hiddenFieldBlock', '');
        const fieldType = document.getElementById(`hiddenFieldType${hiddenFieldId}`).value;

        if (fieldType === 'text') {
            const autofillSelect = document.getElementById(`hiddenFieldAutofill${hiddenFieldId}`);
            if (autofillSelect) {
                const previousValue = autofillSelect.value;
                autofillSelect.innerHTML = `
                    <option value="">-- Select a question --</option>
                    ${generateQuestionOptions()}
                `;
                if (Array.from(autofillSelect.options).some(option => option.value === previousValue)) {
                    autofillSelect.value = previousValue;
                }
            }

            const conditionalAutofillDiv = document.getElementById(`conditionalAutofill${hiddenFieldId}`);
            const conditionDivs = conditionalAutofillDiv.querySelectorAll('div[class^="condition"]');
            conditionDivs.forEach(conditionDiv => {
                const condId = conditionDiv.id.split('_')[1];
                const questionSelect = document.getElementById(`conditionQuestion${hiddenFieldId}_${condId}`);
                const previousQuestionValue = questionSelect.value;

                questionSelect.innerHTML = `
                    <option value="">-- Select a question --</option>
                    ${generateAllQuestionOptions()}
                `;

                if (Array.from(questionSelect.options).some(option => option.value === previousQuestionValue)) {
                    questionSelect.value = previousQuestionValue;
                    updateConditionAnswers(hiddenFieldId, condId);
                }
            });
        }
    });
}

// ============================================
// ===========  IMPORT / EXPORT  =============
// ============================================
function loadFormData(formData) {
    // 1) Clear the entire "formBuilder" container
    document.getElementById('formBuilder').innerHTML = '';

    // 2) Reset counters based on what's stored in the JSON
    sectionCounter = formData.sectionCounter || 1;
    questionCounter = formData.questionCounter || 1;
    hiddenFieldCounter = formData.hiddenFieldCounter || 1;

    // 3) Possibly set default PDF name
    if (formData.defaultPDFName) {
        const formPDFNameInput = document.getElementById('formPDFName');
        if (formPDFNameInput) {
            formPDFNameInput.value = formData.defaultPDFName;
        }
    }

    // 4) Initialize hidden-fields module (if required by your UI)
    initializeHiddenPDFFieldsModule();

    // 5) Build out sections and questions
    if (formData.sections) {
        formData.sections.forEach(section => {
            // A) Create the section in the UI
            addSection(section.sectionId);

            // B) Set the name of the section (if customized)
            const sectionNameInput = document.getElementById(`sectionName${section.sectionId}`);
            if (sectionNameInput) {
                sectionNameInput.value = section.sectionName || `Section ${section.sectionId}`;
                updateSectionName(section.sectionId);
            }

            // C) Add questions inside this section
            (section.questions || []).forEach(question => {
                // i) Create the question UI
                addQuestion(section.sectionId, question.questionId);

                // ii) Grab the question block from the DOM
                const questionBlock = document.getElementById(`questionBlock${question.questionId}`);
                if (!questionBlock) return; // In case something went wrong

                // iii) Set question text and type
                const questionInput = questionBlock.querySelector(`#question${question.questionId}`);
                if (questionInput) {
                    questionInput.value = question.text;
                }

                const questionTypeSelect = questionBlock.querySelector(`#questionType${question.questionId}`);
                if (questionTypeSelect) {
                    questionTypeSelect.value = question.type;
                    toggleOptions(question.questionId);  // Display the correct sub-blocks for this type
                }

                // iv) If it's a "checkbox" question, rebuild its options
                if (question.type === 'checkbox') {
                    const checkboxOptionsDiv = questionBlock.querySelector(`#checkboxOptions${question.questionId}`);
                    if (checkboxOptionsDiv) {
                        checkboxOptionsDiv.innerHTML = '';
                        (question.options || []).forEach((optData, idx) => {
                            const optionDiv = document.createElement('div');
                            optionDiv.className = `option${idx + 1}`;
                            optionDiv.innerHTML = `
                                <label>Option ${idx + 1} Text:</label>
                                <input type="text" id="checkboxOptionText${question.questionId}_${idx + 1}"
                                       value="${optData.label}" placeholder="Enter option text"><br><br>
                                <label>Name/ID:</label>
                                <input type="text" id="checkboxOptionName${question.questionId}_${idx + 1}"
                                       value="${optData.nameId}" placeholder="Enter Name/ID"><br><br>
                                <label>Value (optional):</label>
                                <input type="text" id="checkboxOptionValue${question.questionId}_${idx + 1}"
                                       value="${optData.value}" placeholder="Enter Value"><br><br>
                                <button type="button"
                                        onclick="removeCheckboxOption(${question.questionId}, ${idx + 1})">
                                    Remove
                                </button>
                                <hr>
                            `;
                            checkboxOptionsDiv.appendChild(optionDiv);
                        });
                        updateConditionalPDFAnswersForCheckbox(question.questionId);
                    }
                }

                // v) If it's a "dropdown" question, rebuild its options array
                else if (question.type === 'dropdown') {
                    const dropdownOptionsDiv = questionBlock.querySelector(`#dropdownOptions${question.questionId}`);
                    if (dropdownOptionsDiv) {
                        dropdownOptionsDiv.innerHTML = '';
                        (question.options || []).forEach((optText, idx) => {
                            const optionDiv = document.createElement('div');
                            optionDiv.className = `option${idx + 1}`;
                            const optionId = `option${question.questionId}_${idx + 1}`;
                            optionDiv.innerHTML = `
                                <input type="text" id="${optionId}" value="${optText}" placeholder="Option ${idx + 1}">
                                <button type="button"
                                        onclick="removeDropdownOption(${question.questionId}, ${idx + 1})">
                                    Remove
                                </button>
                            `;
                            dropdownOptionsDiv.appendChild(optionDiv);
                        });
                    }
                }

                // vi) Handle other question types (numberedDropdown, multipleTextboxes, etc.)
                // Rebuild their options/labels similarly if needed

                // vii) Apply conditional logic (logic)
                if (question.logic && question.logic.enabled) {
                    const logicCheckbox = questionBlock.querySelector(`#logic${question.questionId}`);
                    if (logicCheckbox) {
                        logicCheckbox.checked = true;
                        toggleLogic(question.questionId);
                    }
                    const prevQuestionField = questionBlock.querySelector(`#prevQuestion${question.questionId}`);
                    if (prevQuestionField) {
                        prevQuestionField.value = question.logic.prevQuestion;
                    }
                    const prevAnswerSelect = questionBlock.querySelector(`#prevAnswer${question.questionId}`);
                    if (prevAnswerSelect) {
                        // Repopulate answers in the dropdown
                        updateLogicAnswers(question.questionId);
                        // Now set the selected answer
                        prevAnswerSelect.value = question.logic.prevAnswer;
                    }
                }

                // viii) Jump Logic
                if (question.jump && question.jump.enabled) {
                    const jumpCheckbox = questionBlock.querySelector(`#enableJump${question.questionId}`);
                    if (jumpCheckbox) {
                        jumpCheckbox.checked = true;
                        toggleJumpLogic(question.questionId);
                    }
                    const jumpOptionSelect = questionBlock.querySelector(`#jumpOption${question.questionId}`);
                    const jumpToInput = questionBlock.querySelector(`#jumpTo${question.questionId}`);
                    if (jumpOptionSelect) {
                        jumpOptionSelect.value = question.jump.option;
                    }
                    if (jumpToInput) {
                        jumpToInput.value = question.jump.to;
                    }
                }

                // ix) Conditional PDF
                if (question.conditionalPDF && question.conditionalPDF.enabled) {
                    const pdfCheckbox = questionBlock.querySelector(`#enableConditionalPDF${question.questionId}`);
                    if (pdfCheckbox) {
                        pdfCheckbox.checked = true;
                        toggleConditionalPDFLogic(question.questionId);
                    }
                    const pdfNameInput = questionBlock.querySelector(`#conditionalPDFName${question.questionId}`);
                    const pdfAnswerSelect = questionBlock.querySelector(`#conditionalPDFAnswer${question.questionId}`);
                    if (pdfNameInput) {
                        pdfNameInput.value = question.conditionalPDF.pdfName;
                    }
                    if (pdfAnswerSelect) {
                        pdfAnswerSelect.value = question.conditionalPDF.answer;
                    }
                }

                // x) Conditional Alert
                if (question.conditionalAlert && question.conditionalAlert.enabled) {
                    const alertCheckbox = questionBlock.querySelector(`#enableConditionalAlert${question.questionId}`);
                    if (alertCheckbox) {
                        alertCheckbox.checked = true;
                        toggleConditionalAlertLogic(question.questionId);
                    }
                    const alertPrevQ = questionBlock.querySelector(`#alertPrevQuestion${question.questionId}`);
                    const alertPrevA = questionBlock.querySelector(`#alertPrevAnswer${question.questionId}`);
                    const alertTextEl = questionBlock.querySelector(`#alertText${question.questionId}`);
                    if (alertPrevQ) alertPrevQ.value = question.conditionalAlert.prevQuestion;
                    if (alertPrevA) alertPrevA.value = question.conditionalAlert.prevAnswer;
                    if (alertTextEl) alertTextEl.value = question.conditionalAlert.text;
                }
            });
        });
    }

    // 6) Build hidden fields from JSON
    if (formData.hiddenFields && formData.hiddenFields.length > 0) {
        formData.hiddenFields.forEach(hiddenField => {
            addHiddenFieldWithData(hiddenField);
        });
    }

    // 7) Final step: re-run references
    updateAutofillOptions();
}

/** 
 * Add a hidden field from data 
 */
function addHiddenFieldWithData(hiddenField) {
    const hiddenFieldsContainer = document.getElementById('hiddenFieldsContainer');
    const hiddenFieldBlock = document.createElement('div');
    const currentHiddenFieldId = hiddenField.hiddenFieldId;

    hiddenFieldBlock.className = 'hidden-field-block';
    hiddenFieldBlock.id = `hiddenFieldBlock${currentHiddenFieldId}`;
    hiddenFieldBlock.innerHTML = `
        <label>Hidden Field ${currentHiddenFieldId}: </label>
        <select id="hiddenFieldType${currentHiddenFieldId}" onchange="toggleHiddenFieldOptions(${currentHiddenFieldId})">
            <option value="text" ${hiddenField.type === 'text' ? 'selected' : ''}>Textbox</option>
            <option value="checkbox" ${hiddenField.type === 'checkbox' ? 'selected' : ''}>Checkbox</option>
        </select><br><br>
        <div id="hiddenFieldOptions${currentHiddenFieldId}">
            <!-- Options will be populated based on the type -->
        </div>
        <button type="button" onclick="removeHiddenField(${currentHiddenFieldId})">Remove Hidden Field</button>
        <hr>
    `;
    hiddenFieldsContainer.appendChild(hiddenFieldBlock);

    toggleHiddenFieldOptions(currentHiddenFieldId);

    document.getElementById(`hiddenFieldName${currentHiddenFieldId}`).value = hiddenField.name;

    if (hiddenField.type === 'checkbox') {
        document.getElementById(`hiddenFieldChecked${currentHiddenFieldId}`).checked = hiddenField.checked;

        // Load conditions for checkboxes
        if (hiddenField.conditions && hiddenField.conditions.length > 0) {
            hiddenField.conditions.forEach((condition, index) => {
                addConditionalAutofillForCheckbox(currentHiddenFieldId);
                const conditionId = index + 1;
                document.getElementById(`conditionQuestion${currentHiddenFieldId}_${conditionId}`).value = condition.questionId;
                updateConditionAnswers(currentHiddenFieldId, conditionId);
                document.getElementById(`conditionAnswer${currentHiddenFieldId}_${conditionId}`).value = condition.answerValue;
                document.getElementById(`conditionValue${currentHiddenFieldId}_${conditionId}`).value = condition.autofillValue;
            });
        }
    } else if (hiddenField.type === 'text') {
        if (hiddenField.autofillQuestionId) {
            const autofillSelect = document.getElementById(`hiddenFieldAutofill${currentHiddenFieldId}`);
            autofillSelect.value = hiddenField.autofillQuestionId;
        }

        if (hiddenField.conditions && hiddenField.conditions.length > 0) {
            hiddenField.conditions.forEach((condition, index) => {
                addConditionalAutofill(currentHiddenFieldId);
                const conditionId = index + 1;
                document.getElementById(`conditionQuestion${currentHiddenFieldId}_${conditionId}`).value = condition.questionId;
                updateConditionAnswers(currentHiddenFieldId, conditionId);
                document.getElementById(`conditionAnswer${currentHiddenFieldId}_${conditionId}`).value = condition.answerValue;
                document.getElementById(`conditionValue${currentHiddenFieldId}_${conditionId}`).value = condition.autofillValue;
            });
        }
    }
}

