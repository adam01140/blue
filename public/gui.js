let sectionCounter = 1;
let questionCounter = 1;
let hiddenFieldCounter = 1; // Counter for hidden fields

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
    <input type="text" id="sectionName${currentSectionId}" placeholder="Enter section name" value="Section ${currentSectionId}" oninput="updateSectionName(${currentSectionId})"><br><br>
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
            
            // Update buttons' onclick attributes
            const moveUpButton = questionBlock.querySelector('button[onclick*="moveQuestionUp"]');
            const moveDownButton = questionBlock.querySelector('button[onclick*="moveQuestionDown"]');
            const removeButton = questionBlock.querySelector('button[onclick*="removeQuestion"]');
            
            moveUpButton.setAttribute('onclick', `moveQuestionUp(${globalQuestionIndex}, ${sectionId})`);
            moveDownButton.setAttribute('onclick', `moveQuestionDown(${globalQuestionIndex}, ${sectionId})`);
            removeButton.setAttribute('onclick', `removeQuestion(${globalQuestionIndex})`);

            globalQuestionIndex++;
        });
    });

    questionCounter = globalQuestionIndex;  // Reset questionCounter to the new highest index + 1
}

function removeSection(sectionId) {
    const sectionBlock = document.getElementById(`sectionBlock${sectionId}`);
    sectionBlock.remove();

    // Update IDs and headers of all subsequent sections
    updateSectionLabels();
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
            <option value="multipleTextboxes">Multiple Textboxes</option>
            <option value="money">Money</option>
            <option value="date">Date</option>
            <option value="bigParagraph">Big Paragraph</option>
        </select><br><br>

        <!-- Name/ID and Placeholder for Textbox and Big Paragraph -->
        <div id="textboxOptions${currentQuestionId}" class="textbox-options" style="display: none;">
            <label>Name/ID: </label>
            <input type="text" id="textboxName${currentQuestionId}" placeholder="Enter field name"><br><br>

            <label>Placeholder: </label>
            <input type="text" id="textboxPlaceholder${currentQuestionId}" placeholder="Enter placeholder"><br><br>
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
                <input type="checkbox" id="noneOfTheAbove${currentQuestionId}">
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
        <label>Conditional Logic: </label><br>
        <input type="checkbox" id="logic${currentQuestionId}" onchange="toggleLogic(${currentQuestionId})">
        <label for="logic${currentQuestionId}">Enable Logic</label><br><br>

        <div id="logicBlock${currentQuestionId}" style="display: none;">
            <label>Show this question if: </label><br>
            <input type="number" placeholder="Previous question number" id="prevQuestion${currentQuestionId}"><br>
            <input type="text" placeholder="Answer value" id="prevAnswer${currentQuestionId}"><br>
        </div><br>

        <!-- Jump Logic -->
        <label>Jump Logic: </label><br>
        <div id="jumpLogic${currentQuestionId}">
            <input type="checkbox" id="enableJump${currentQuestionId}" onchange="toggleJumpLogic(${currentQuestionId})">
            <label for="enableJump${currentQuestionId}">Enable Jump Logic</label><br><br>
            <div id="jumpBlock${currentQuestionId}" style="display: none;">
                <label id="jumpOptionLabel${currentQuestionId}" style="text-align: center;">Select the option that triggers the jump:</label><br>
                <select id="jumpOption${currentQuestionId}" style="display: block; margin: 0 auto;">
                    <!-- Options will be populated dynamically based on the question type -->
                </select><br><br>
                <label>Jump to (enter section number or 'end'):</label><br>
                <input type="text" placeholder="Section number or 'end'" id="jumpTo${currentQuestionId}"><br>
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

    // Update autofill options in hidden fields
    updateAutofillOptions();

    // Increment questionCounter only if not loading from JSON
    if (!questionId) {
        questionCounter++;
    }
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

function toggleOptions(questionId) {
    const questionTypeSelect = document.getElementById(`questionType${questionId}`);
    if (!questionTypeSelect) return; // Prevent errors if the element is not found

    const questionType = questionTypeSelect.value;
    const optionsBlock = document.getElementById(`optionsBlock${questionId}`);
    const checkboxBlock = document.getElementById(`checkboxBlock${questionId}`);
    const numberedDropdownBlock = document.getElementById(`numberedDropdownBlock${questionId}`);
    const multipleTextboxesBlock = document.getElementById(`multipleTextboxesBlock${questionId}`);
    const textboxOptionsBlock = document.getElementById(`textboxOptions${questionId}`); // Block for Name/ID and Placeholder
    const jumpOptionLabel = document.getElementById(`jumpOptionLabel${questionId}`);
    const jumpOptionSelect = document.getElementById(`jumpOption${questionId}`);

    // Hide all blocks initially
    if (textboxOptionsBlock) textboxOptionsBlock.style.display = 'none';
    if (optionsBlock) optionsBlock.style.display = 'none';
    if (checkboxBlock) checkboxBlock.style.display = 'none';
    if (numberedDropdownBlock) numberedDropdownBlock.style.display = 'none';
    if (multipleTextboxesBlock) multipleTextboxesBlock.style.display = 'none';
    if (jumpOptionLabel) jumpOptionLabel.style.display = 'none';
    if (jumpOptionSelect) jumpOptionSelect.style.display = 'none';

    // Show and update specific blocks based on question type
    switch (questionType) {
        case 'text':
        case 'bigParagraph':
            if (textboxOptionsBlock) textboxOptionsBlock.style.display = 'block'; // Show Name/ID and Placeholder
            break;
        case 'multipleTextboxes':
            if (multipleTextboxesBlock) multipleTextboxesBlock.style.display = 'block';
            break;
        case 'radio':
            if (jumpOptionLabel) jumpOptionLabel.style.display = 'block';
            if (jumpOptionSelect) {
                jumpOptionSelect.style.display = 'block';
                updateJumpOptionsForRadio(questionId);
            }
            break;
        case 'dropdown':
            if (optionsBlock) optionsBlock.style.display = 'block';
            if (jumpOptionLabel) jumpOptionLabel.style.display = 'block';
            if (jumpOptionSelect) {
                jumpOptionSelect.style.display = 'block';
                updateJumpOptions(questionId);
            }
            break;
        case 'checkbox':
            if (checkboxBlock) checkboxBlock.style.display = 'block';
            break;
        case 'numberedDropdown':
            if (numberedDropdownBlock) numberedDropdownBlock.style.display = 'block';
            break;
        case 'money':
        case 'date':
            // No additional options to show for these types
            break;
    }

    // Update autofill options in hidden fields
    updateAutofillOptions();
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
        <input type="text" id="multipleTextboxPlaceholder${questionId}_${optionCount}" placeholder="Placeholder ${optionCount}"><br><br>
        <button type="button" onclick="removeMultipleTextboxOption(${questionId}, ${optionCount})">Remove Textbox</button>
        <hr>
    `;
    multipleTextboxesOptionsDiv.appendChild(optionDiv);
}



function removeMultipleTextboxOption(questionId, optionNumber) {
    const optionDiv = document.querySelector(`#multipleTextboxesOptions${questionId} .option${optionNumber}`);
    if (optionDiv) {
        optionDiv.remove();
        // Re-index the remaining options
        const options = document.querySelectorAll(`#multipleTextboxesOptions${questionId} > div`);
        options.forEach((option, index) => {
            option.className = `option${index + 1}`;
            option.querySelector('h4').innerText = `Textbox ${index + 1}`;
            option.querySelector('input[id^="multipleTextboxLabel"]').id = `multipleTextboxLabel${questionId}_${index + 1}`;
            option.querySelector('input[id^="multipleTextboxName"]').id = `multipleTextboxName${questionId}_${index + 1}`;
            option.querySelector('input[id^="multipleTextboxPlaceholder"]').id = `multipleTextboxPlaceholder${questionId}_${index + 1}`;
            option.querySelector('button').setAttribute('onclick', `removeMultipleTextboxOption(${questionId}, ${index + 1})`);
        });
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
    const optionCount = dropdownOptionsDiv.children.length + 1;

    const optionDiv = document.createElement('div');
    optionDiv.className = `option${optionCount}`;
    const optionId = `option${questionId}_${optionCount}`;
    optionDiv.innerHTML = `
        <input type="text" id="${optionId}" placeholder="Option ${optionCount}">
        <button type="button" onclick="removeDropdownOption(${questionId}, ${optionCount})">Remove</button>
    `;
    dropdownOptionsDiv.appendChild(optionDiv);

    // Update jump options if necessary
    updateJumpOptions(questionId);
}

function removeDropdownOption(questionId, optionNumber) {
    const optionDiv = document.querySelector(`#dropdownOptions${questionId} .option${optionNumber}`);
    optionDiv.remove();
    // Update jump options
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
}


function removeCheckboxOption(questionId, optionNumber) {
    const optionDiv = document.querySelector(`#checkboxOptions${questionId} .option${optionNumber}`);
    if (optionDiv) {
        optionDiv.remove();
        // Re-index the remaining options
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
    labelDiv.remove();
}

function removeQuestion(questionId) {
    const questionBlock = document.getElementById(`questionBlock${questionId}`);
    const sectionId = questionBlock.closest('.section-block').id.replace('sectionBlock', '');
    questionBlock.remove();

    // Update IDs of subsequent questions
    updateGlobalQuestionLabels();

    // Update autofill options in hidden fields
    updateAutofillOptions();
}

// Hidden PDF Fields Module

function initializeHiddenPDFFieldsModule() {
    const formBuilder = document.getElementById('formBuilder');

    const hiddenFieldsModule = document.createElement('div');
    hiddenFieldsModule.id = 'hiddenFieldsModule';
    hiddenFieldsModule.innerHTML = `
        <h2>Hidden PDF Fields</h2>
        <div id="hiddenFieldsContainer"></div>
        <button type="button" onclick="addHiddenField()">Add Hidden Field</button>
        <hr>
    `;
    formBuilder.appendChild(hiddenFieldsModule);
}

// Call the function to initialize the Hidden PDF Fields module
initializeHiddenPDFFieldsModule();

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
    toggleHiddenFieldOptions(currentHiddenFieldId); // Initialize options
    hiddenFieldCounter++;
}

function toggleHiddenFieldOptions(hiddenFieldId) {
    const fieldType = document.getElementById(`hiddenFieldType${hiddenFieldId}`).value;
    const hiddenFieldOptions = document.getElementById(`hiddenFieldOptions${hiddenFieldId}`);

    // Clear existing options
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
            <!-- Conditional Autofill Logic -->
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


function addConditionalAutofillForCheckbox(hiddenFieldId) {
    const conditionalAutofillDiv = document.getElementById(`conditionalAutofillForCheckbox${hiddenFieldId}`);
    const conditionId = conditionalAutofillDiv.children.length + 1;

    const conditionDiv = document.createElement('div');
    conditionDiv.className = `condition${conditionId}`;
	conditionDiv.id = `condition${hiddenFieldId}_${conditionId}`; // Set a unique ID
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
        const questionText = questionBlock.querySelector(`input[type="text"]`).value;
        const questionType = questionBlock.querySelector(`select`).value;

        // Include question types that produce single text values
        if (['text', 'bigParagraph', 'money', 'date'].includes(questionType)) {
            optionsHTML += `<option value="${questionId}">Question ${questionId}: ${questionText}</option>`;
        }

        // Optionally include multiple textboxes
        if (questionType === 'multipleTextboxes') {
            const textboxes = questionBlock.querySelectorAll(`#multipleTextboxesOptions${questionId} .option`);
            textboxes.forEach((textbox, idx) => {
                const label = textbox.querySelector(`input[id^="multipleTextboxLabel"]`).value || `Textbox ${idx + 1}`;
                optionsHTML += `<option value="${questionId}_${idx + 1}">Question ${questionId} - ${label}</option>`;
            });
        }
    });

    return optionsHTML;
}



// Updated function to only include specific question types for conditional logic
function generateAllQuestionOptions() {
    let optionsHTML = '';
    const questionBlocks = document.querySelectorAll('.question-block');

    questionBlocks.forEach(questionBlock => {
        const questionId = questionBlock.id.replace('questionBlock', '');
        const questionText = questionBlock.querySelector(`input[type="text"]`).value;
        const questionType = questionBlock.querySelector(`select`).value;

        // Include questions suitable for conditional logic
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
    conditionDiv.className = `condition`;
    conditionDiv.id = `condition${hiddenFieldId}_${conditionId}`; // Set a unique ID
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
    } else {
        console.error(`Condition div with ID condition${hiddenFieldId}_${conditionId} not found.`);
    }
}


function updateConditionAnswers(hiddenFieldId, conditionId) {
    const questionSelect = document.getElementById(`conditionQuestion${hiddenFieldId}_${conditionId}`);
    const answerSelect = document.getElementById(`conditionAnswer${hiddenFieldId}_${conditionId}`);
    const selectedQuestionId = questionSelect.value;

    // Clear existing options
    answerSelect.innerHTML = '<option value="">-- Select an answer --</option>';

    // Get the selected question type and options
    const questionBlock = document.getElementById(`questionBlock${selectedQuestionId}`);
    if (questionBlock) {
        const questionType = questionBlock.querySelector(`select`).value;

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
            const options = questionBlock.querySelectorAll(`#checkboxOptions${selectedQuestionId} input`);
            options.forEach(option => {
                answerSelect.innerHTML += `<option value="${option.value}">${option.value}</option>`;
            });

            // Include "None of the above" if selected
            const noneOfTheAboveSelected = document.getElementById(`noneOfTheAbove${selectedQuestionId}`).checked;
            if (noneOfTheAboveSelected) {
                answerSelect.innerHTML += `<option value="None of the above">None of the above</option>`;
            }
        }
    }
}

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
                // Restore previous selection if still valid
                if (Array.from(autofillSelect.options).some(option => option.value === previousValue)) {
                    autofillSelect.value = previousValue;
                }
            }

            // Update conditional logic question options
            const conditionalAutofillDiv = document.getElementById(`conditionalAutofill${hiddenFieldId}`);
            const conditionDivs = conditionalAutofillDiv.querySelectorAll('div[class^="condition"]');
            conditionDivs.forEach(conditionDiv => {
                const conditionId = conditionDiv.id.split('_')[1];
                const questionSelect = document.getElementById(`conditionQuestion${hiddenFieldId}_${conditionId}`);
                const previousQuestionValue = questionSelect.value;

                questionSelect.innerHTML = `
                    <option value="">-- Select a question --</option>
                    ${generateAllQuestionOptions()}
                `;

                // Restore previous selection if still valid
                if (Array.from(questionSelect.options).some(option => option.value === previousQuestionValue)) {
                    questionSelect.value = previousQuestionValue;
                    updateConditionAnswers(hiddenFieldId, conditionId);
                }
            });
        }
    });
}


function removeHiddenField(hiddenFieldId) {
    const hiddenFieldBlock = document.getElementById(`hiddenFieldBlock${hiddenFieldId}`);
    hiddenFieldBlock.remove();
}

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
    } else if (hiddenField.type === 'text') {
        // Set autofillQuestionId if available
        if (hiddenField.autofillQuestionId) {
            const autofillSelect = document.getElementById(`hiddenFieldAutofill${currentHiddenFieldId}`);
            autofillSelect.value = hiddenField.autofillQuestionId;
        }
        // Load conditions
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