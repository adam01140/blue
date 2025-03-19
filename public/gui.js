/*********************************************
 * gui.js - Multiple OR-Conditions Version
 * WITHOUT embedded hidden-field features
 *********************************************/

// ============================================
// ===========  GLOBAL VARIABLES  =============
// ============================================
let sectionCounter = 1;
let questionCounter = 1;

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

function removeSection(sectionId) {
    const sectionBlock = document.getElementById(`sectionBlock${sectionId}`);
    if (sectionBlock) {
        sectionBlock.remove();
        updateSectionLabels();
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
 * Re-label sections (and questions inside) after moves,
 * so that the GUI remains consistent.
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

    // Adjust sectionCounter
    sectionCounter = sections.length + 1;
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

    questionCounter = globalQuestionIndex; // Reset questionCounter
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

        <!-- Name/ID and Placeholder for Text, Big Paragraph, Money, etc. -->
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
		
		 <!-- ADD THIS IMAGE BLOCK -->
    <div id="dropdownImageBlock${currentQuestionId}" class="dropdown-image-options" style="display:none;">
        <button type="button" onclick="toggleDropdownImageFields(${currentQuestionId})">Add Image</button>
        <div id="dropdownImageFields${currentQuestionId}" style="display:none; margin-top:8px;">
            <label>Image URL:</label><br>
            <input type="text" id="dropdownImageURL${currentQuestionId}" placeholder="Enter image URL"><br><br>
            <label>Width:</label><br>
            <input type="number" id="dropdownImageWidth${currentQuestionId}" placeholder="Width"><br><br>
            <label>Height:</label><br>
            <input type="number" id="dropdownImageHeight${currentQuestionId}" placeholder="Height"><br>
        </div>
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

        <!-- ===== MULTIPLE-OR LOGIC BLOCK ===== -->
        <label>Enable Conditional Logic: </label>
        <input type="checkbox" id="logic${currentQuestionId}" onchange="toggleLogic(${currentQuestionId})">
        <div id="logicBlock${currentQuestionId}" style="display: none;">
            <label>Show this question if ANY of these conditions match:</label><br>
            <div id="logicConditions${currentQuestionId}"></div>
            <button type="button" onclick="addLogicCondition(${currentQuestionId})">+ Add OR Condition</button>
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
                <input type="text" id="conditionalPDFName${currentQuestionId}" placeholder="Enter PDF name"><br><br>
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

    // Display the correct sub-block for the default question type
    toggleOptions(currentQuestionId);

    // If brand new question, increment questionCounter
    if (!questionId) {
        questionCounter++;
    }
}

/**
 * Removes a question block entirely
 */
function removeQuestion(questionId) {
    const questionBlock = document.getElementById(`questionBlock${questionId}`);
    if (!questionBlock) return;
    const sectionId = questionBlock.closest('.section-block').id.replace('sectionBlock', '');
    questionBlock.remove();
    updateGlobalQuestionLabels();
}
function toggleDropdownImageFields(questionId) {
    const fieldsDiv = document.getElementById(`dropdownImageFields${questionId}`);
    if (!fieldsDiv) return;
    if (fieldsDiv.style.display === 'none' || fieldsDiv.style.display === '') {
        fieldsDiv.style.display = 'block';
    } else {
        fieldsDiv.style.display = 'none';
    }
}

// ---------------------------------------
// --- Move question up/down in a section
// ---------------------------------------
function moveQuestionUp(questionId, sectionId) {
    const questionBlock = document.getElementById(`questionBlock${questionId}`);
    const previousSibling = questionBlock.previousElementSibling;
    if (previousSibling && previousSibling.classList.contains('question-block')) {
        questionBlock.parentNode.insertBefore(questionBlock, previousSibling);
        updateQuestionLabels(sectionId);
    }
}

function moveQuestionDown(questionId, sectionId) {
    const questionBlock = document.getElementById(`questionBlock${questionId}`);
    const nextSibling = questionBlock.nextElementSibling;
    if (nextSibling && nextSibling.classList.contains('question-block')) {
        questionBlock.parentNode.insertBefore(nextSibling, questionBlock);
        updateQuestionLabels(sectionId);
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

// ------------------------------------------------
// --- Show/hide sub-blocks depending on question type
// ------------------------------------------------
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
    const conditionalAlertLogicDiv = document.getElementById(`conditionalAlertLogic${questionId}`);

    // === Newly added image block for dropdown ===
    const dropdownImageBlock = document.getElementById(`dropdownImageBlock${questionId}`);

    // Hide everything first
    if (textboxOptionsBlock) textboxOptionsBlock.style.display = 'none';
    if (optionsBlock) optionsBlock.style.display = 'none';
    if (checkboxBlock) checkboxBlock.style.display = 'none';
    if (numberedDropdownBlock) numberedDropdownBlock.style.display = 'none';
    if (multipleTextboxesBlock) multipleTextboxesBlock.style.display = 'none';
    if (jumpOptionLabel) jumpOptionLabel.style.display = 'none';
    if (jumpOptionSelect) jumpOptionSelect.style.display = 'none';
    if (conditionalPDFLogicDiv) conditionalPDFLogicDiv.style.display = 'none';
    if (conditionalAlertLogicDiv) conditionalAlertLogicDiv.style.display = 'none';
    // hide the new dropdownImageBlock
    if (dropdownImageBlock) dropdownImageBlock.style.display = 'none';

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
                // show the new dropdown image block
                if (dropdownImageBlock) {
                    dropdownImageBlock.style.display = 'block';
                }
            }
            if (questionType === 'radio' && conditionalPDFLogicDiv) {
                conditionalPDFLogicDiv.style.display = 'block';
                updateConditionalPDFAnswersForRadio(questionId);
            }
            // Also show alert logic if radio
            if (questionType === 'radio' && conditionalAlertLogicDiv) {
                conditionalAlertLogicDiv.style.display = 'block';
            }
            break;
        case 'checkbox':
            if (checkboxBlock) checkboxBlock.style.display = 'block';
            if (conditionalPDFLogicDiv) {
                conditionalPDFLogicDiv.style.display = 'block';
                updateConditionalPDFAnswersForCheckbox(questionId);
            }
            // Also show alert logic if checkbox
            if (conditionalAlertLogicDiv) {
                conditionalAlertLogicDiv.style.display = 'block';
            }
            break;
        case 'multipleTextboxes':
            if (multipleTextboxesBlock) multipleTextboxesBlock.style.display = 'block';
            break;
        case 'numberedDropdown':
            if (numberedDropdownBlock) numberedDropdownBlock.style.display = 'block';
            break;
        case 'money':
            if (textboxOptionsBlock) textboxOptionsBlock.style.display = 'block';
            break;
        case 'date':
            // no special sub-block
            break;
    }
}


// --------------------------------------------------
// --- Additional logic blocks (jump, PDF, alerts)
// --------------------------------------------------
function toggleLogic(questionId) {
    const logicEnabled = document.getElementById(`logic${questionId}`).checked;
    const logicBlock = document.getElementById(`logicBlock${questionId}`);
    logicBlock.style.display = logicEnabled ? 'block' : 'none';

    // If just turned on and no conditions exist, add one
    if (logicEnabled) {
        const logicConditionsDiv = document.getElementById(`logicConditions${questionId}`);
        if (logicConditionsDiv.children.length === 0) {
            addLogicCondition(questionId);
        }
    }
}

/** Add a row to the multiple-OR logic block */
function addLogicCondition(questionId) {
    const logicConditionsDiv = document.getElementById(`logicConditions${questionId}`);
    const numConditions = logicConditionsDiv.children.length + 1;

    const conditionRow = document.createElement('div');
    conditionRow.className = 'logic-condition-row';
    conditionRow.id = `logicConditionRow${questionId}_${numConditions}`;
    conditionRow.innerHTML = `
        <span>Condition ${numConditions}:</span><br>
        <input type="number" placeholder="Previous question number"
               id="prevQuestion${questionId}_${numConditions}"
               onchange="updateLogicAnswersForRow(${questionId}, ${numConditions})"><br>
        <select id="prevAnswer${questionId}_${numConditions}" style="display: block;">
            <option value="">-- Select an answer --</option>
        </select><br>
        <button type="button" onclick="removeLogicCondition(${questionId}, ${numConditions})">Remove</button>
        <hr>
    `;
    logicConditionsDiv.appendChild(conditionRow);
}

function removeLogicCondition(questionId, conditionIndex) {
    const row = document.getElementById(`logicConditionRow${questionId}_${conditionIndex}`);
    if (row) row.remove();
}

/** On picking a "previous question" for logic, populate possible answers. */
function updateLogicAnswersForRow(questionId, conditionIndex) {
    const questionNumberInput = document.getElementById(`prevQuestion${questionId}_${conditionIndex}`);
    const answerSelect = document.getElementById(`prevAnswer${questionId}_${conditionIndex}`);
    if (!questionNumberInput || !answerSelect) return;

    const prevQNum = parseInt(questionNumberInput.value);
    if (!prevQNum) {
        answerSelect.innerHTML = '<option value="">-- Select an answer --</option>';
        return;
    }
    const targetQuestionBlock = document.getElementById(`questionBlock${prevQNum}`);
    if (!targetQuestionBlock) {
        answerSelect.innerHTML = '<option value="">-- (invalid question #) --</option>';
        return;
    }
    const questionType = targetQuestionBlock.querySelector(`#questionType${prevQNum}`)?.value;
    if (!questionType) return;

    answerSelect.innerHTML = '<option value="">-- Select an answer --</option>';

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
        const noneOfAbove = targetQuestionBlock.querySelector(`#noneOfTheAbove${prevQNum}`);
        if (noneOfAbove && noneOfAbove.checked) {
            const optionEl = document.createElement('option');
            optionEl.value = 'None of the above';
            optionEl.textContent = 'None of the above';
            answerSelect.appendChild(optionEl);
        }
    }
}

// Jump logic toggling
function toggleJumpLogic(questionId) {
    const jumpEnabled = document.getElementById(`enableJump${questionId}`).checked;
    const jumpBlock = document.getElementById(`jumpBlock${questionId}`);
    jumpBlock.style.display = jumpEnabled ? 'block' : 'none';
}

// PDF logic toggling
function toggleConditionalPDFLogic(questionId) {
    const conditionalPDFEnabled = document.getElementById(`enableConditionalPDF${questionId}`).checked;
    const conditionalPDFBlock = document.getElementById(`conditionalPDFBlock${questionId}`);
    conditionalPDFBlock.style.display = conditionalPDFEnabled ? 'block' : 'none';
}

// Alert logic toggling
function toggleConditionalAlertLogic(questionId) {
    const conditionalAlertEnabled = document.getElementById(`enableConditionalAlert${questionId}`).checked;
    const conditionalAlertBlock = document.getElementById(`conditionalAlertBlock${questionId}`);
    conditionalAlertBlock.style.display = conditionalAlertEnabled ? 'block' : 'none';
}

// -------------------------------------------------------
// --- Extra logic for radio/checkbox PDF answers, jump
// -------------------------------------------------------
function updateConditionalPDFAnswersForRadio(questionId) {
    const selectEl = document.getElementById(`conditionalPDFAnswer${questionId}`);
    if (!selectEl) return;
    selectEl.innerHTML = '';
    ['Yes', 'No'].forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.text = opt;
        selectEl.appendChild(o);
    });
}

function updateConditionalPDFAnswersForCheckbox(questionId) {
    const selectEl = document.getElementById(`conditionalPDFAnswer${questionId}`);
    if (!selectEl) return;
    selectEl.innerHTML = '';

    const checkboxOptionsDiv = document.getElementById(`checkboxOptions${questionId}`);
    if (!checkboxOptionsDiv) return;

    const options = checkboxOptionsDiv.querySelectorAll(`input[id^="checkboxOptionText${questionId}_"]`);
    options.forEach(optionInput => {
        const val = optionInput.value.trim();
        if (val) {
            const o = document.createElement('option');
            o.value = val;
            o.text = val;
            selectEl.appendChild(o);
        }
    });

    const noneOfTheAboveCheckbox = document.getElementById(`noneOfTheAbove${questionId}`);
    if (noneOfTheAboveCheckbox && noneOfTheAboveCheckbox.checked) {
        const o = document.createElement('option');
        o.value = 'None of the above';
        o.text = 'None of the above';
        selectEl.appendChild(o);
    }
}

// Radio jump options
function updateJumpOptionsForRadio(questionId) {
    const jumpOptionSelect = document.getElementById(`jumpOption${questionId}`);
    if (!jumpOptionSelect) return;
    jumpOptionSelect.innerHTML = '';
    ['Yes','No'].forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.text = val;
        jumpOptionSelect.appendChild(opt);
    });
}

// Dropdown jump options
function updateJumpOptions(questionId) {
    const dropdownOptionsDiv = document.getElementById(`dropdownOptions${questionId}`);
    const jumpOptionSelect = document.getElementById(`jumpOption${questionId}`);
    if (!dropdownOptionsDiv || !jumpOptionSelect) return;

    jumpOptionSelect.innerHTML = '';

    const optionInputs = dropdownOptionsDiv.querySelectorAll('input[type="text"]');
    optionInputs.forEach(optionInput => {
        const val = optionInput.value.trim();
        if (val) {
            const opt = document.createElement('option');
            opt.value = val;
            opt.text = val;
            jumpOptionSelect.appendChild(opt);
        }
    });
}

// -------------------------------------------
// --- Functions to add various sub-options
// -------------------------------------------
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

    // Keep jump options updated as user types
    const optionInput = optionDiv.querySelector('input[type="text"]');
    optionInput.addEventListener('input', () => {
        updateJumpOptions(questionId);
    });

    updateJumpOptions(questionId);
}

function removeDropdownOption(questionId, optionNumber) {
    const optionDiv = document.querySelector(`#dropdownOptions${questionId} .option${optionNumber}`);
    if (optionDiv) {
        optionDiv.remove();
        const options = document.querySelectorAll(`#dropdownOptions${questionId} > div`);
        options.forEach((option, index) => {
            option.className = `option${index + 1}`;
            const inputEl = option.querySelector('input[type="text"]');
            inputEl.id = `option${questionId}_${index + 1}`;
            // reattach remove button
            const btn = option.querySelector('button');
            btn.setAttribute('onclick', `removeDropdownOption(${questionId}, ${index + 1})`);
        });
    }
    updateJumpOptions(questionId);
}

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
        labels.forEach((lbl, idx) => {
            const newLabelNumber = idx + 1;
            lbl.className = `label${newLabelNumber}`;
            const inp = lbl.querySelector('input');
            inp.id = `label${questionId}_${newLabelNumber}`;
            inp.placeholder = `Label ${newLabelNumber}`;
            const btn = lbl.querySelector('button');
            btn.setAttribute('onclick', `removeTextboxLabel(${questionId}, ${newLabelNumber})`);
        });
    }
}

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
