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

function updateSectionLabels() {
    const sections = document.querySelectorAll('.section-block');

    sections.forEach((block, sectionIndex) => {
        const sectionId = sectionIndex + 1;
        const sectionLabel = block.querySelector('h2');
        sectionLabel.textContent = `Section ${sectionId}`;
        
        // Update section-related IDs and event handlers
        block.id = `sectionBlock${sectionId}`;
        block.querySelector('button[onclick*="addQuestion"]').setAttribute('onclick', `addQuestion(${sectionId})`);
        block.querySelector('button[onclick*="removeSection"]').setAttribute('onclick', `removeSection(${sectionId})`);
        block.querySelector('button[onclick*="moveSectionUp"]').setAttribute('onclick', `moveSectionUp(${sectionId})`);
        block.querySelector('button[onclick*="moveSectionDown"]').setAttribute('onclick', `moveSectionDown(${sectionId})`);
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
            questionBlock.querySelectorAll('input, select, button').forEach(input => {
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


function updateQuestionsInSection(sectionId) {
    const questionsInSection = document.querySelectorAll(`#questionsSection${sectionId} .question-block`);
    let newQuestionIndex = 1;
    questionsInSection.forEach(questionBlock => {
        questionBlock.id = `questionBlock${newQuestionIndex}`;
        questionBlock.querySelector('label').innerText = `Question ${newQuestionIndex}:`;
        
        // Update IDs in inputs, selects, etc.
        questionBlock.querySelectorAll('input, select, div, label').forEach(input => {
            const oldId = input.id;
            input.id = oldId.replace(/\d+$/, newQuestionIndex);
            if (input.tagName === 'LABEL' && input.getAttribute('for')) {
                input.setAttribute('for', input.getAttribute('for').replace(/\d+$/, newQuestionIndex));
            }
        });

        // Update buttons' onclick attributes
        const moveUpButton = questionBlock.querySelector('button[onclick*="moveQuestionUp"]');
        const moveDownButton = questionBlock.querySelector('button[onclick*="moveQuestionDown"]');
        const removeButton = questionBlock.querySelector('button[onclick*="removeQuestion"]');
        
        moveUpButton.setAttribute('onclick', `moveQuestionUp(${newQuestionIndex}, ${sectionId})`);
        moveDownButton.setAttribute('onclick', `moveQuestionDown(${newQuestionIndex}, ${sectionId})`);
        removeButton.setAttribute('onclick', `removeQuestion(${newQuestionIndex})`);

        newQuestionIndex++;
    });
    questionCounter = newQuestionIndex;  // Reset questionCounter to the new highest index + 1
}




function removeSection(sectionId) {
    const sectionBlock = document.getElementById(`sectionBlock${sectionId}`);
    sectionBlock.remove();

    // Update IDs and headers of all subsequent sections
    const remainingSections = document.querySelectorAll('.section-block');
    let newSectionIndex = sectionId;
    remainingSections.forEach(block => {
        if (parseInt(block.id.replace('sectionBlock', '')) > sectionId) {
            const oldSectionId = block.id.replace('sectionBlock', '');
            block.id = `sectionBlock${newSectionIndex}`;
            block.querySelector('h2').innerText = `Section ${newSectionIndex}`;
            
            // Update questions within this section
            updateQuestionsInSection(oldSectionId, newSectionIndex);

            // Update the section-related buttons (Add/Remove Question)
            block.querySelectorAll('button').forEach(button => {
                const onclickAttr = button.getAttribute('onclick');
                button.setAttribute('onclick', onclickAttr.replace(/\d+/, newSectionIndex));
                if (button.textContent.includes('Add Question to Section')) {
                    button.textContent = `Add Question to Section ${newSectionIndex}`;
                }
                if (button.textContent.includes('Remove Section')) {
                    button.textContent = `Remove Section`;
                }
            });

            newSectionIndex++;
        }
    });

    sectionCounter = newSectionIndex;  // Reset sectionCounter to the new highest index
}


function updateQuestionsInSection(oldSectionId, newSectionId) {
    const questionsInSection = document.querySelectorAll(`#questionsSection${oldSectionId} .question-block`);
    let newQuestionIndex = 1;
    questionsInSection.forEach(question => {
        const oldQuestionId = question.id.replace('questionBlock', '');
        question.id = `questionBlock${newQuestionIndex}`;
        question.querySelector('label').innerText = `Question ${newQuestionIndex}:`;
        // Update IDs in inputs, selects, etc.
        question.querySelectorAll('input, select, div, label').forEach(input => {
            const oldId = input.id;
            input.id = oldId.replace(/\d+$/, newQuestionIndex);
            if (input.tagName === 'LABEL' && input.getAttribute('for')) {
                input.setAttribute('for', input.getAttribute('for').replace(/\d+$/, newQuestionIndex));
            }
        });

        // Update container div ID for the questions section
        question.parentNode.id = `questionsSection${newSectionId}`;

        newQuestionIndex++;
    });
    questionCounter = newQuestionIndex;  // Reset questionCounter to the new highest index + 1
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

        <div id="numberedDropdownBlock${currentQuestionId}" class="numbered-dropdown-options" style="display: none;">
            <label>Number Range: </label>
            <input type="number" id="numberRangeStart${currentQuestionId}" placeholder="Start" min="1" style="width: 60px;">
            <input type="number" id="numberRangeEnd${currentQuestionId}" placeholder="End" min="1" style="width: 60px;"><br><br>
            <label>Textbox Labels:</label>
            <div id="textboxLabels${currentQuestionId}"></div>
            <button type="button" onclick="addTextboxLabel(${currentQuestionId})">Add Label</button>
        </div><br>

        <div id="optionsBlock${currentQuestionId}" class="dropdown-options" style="display: none;">
            <label>Options: </label>
            <div id="dropdownOptions${currentQuestionId}"></div>
            <button type="button" onclick="addDropdownOption(${currentQuestionId})">Add Option</button>
        </div><br>

        <div id="checkboxBlock${currentQuestionId}" class="checkbox-options" style="display: none;">
            <label>Checkbox Options: </label>
            <div id="checkboxOptions${currentQuestionId}"></div>
            <button type="button" onclick="addCheckboxOption(${currentQuestionId})">Add Option</button>
            <div style="margin-top: 10px;">
                <input type="checkbox" id="noneOfTheAbove${currentQuestionId}">
                <label for="noneOfTheAbove${currentQuestionId}">Include "None of the above" option</label>
            </div>
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
                <label id="jumpOptionLabel${currentQuestionId}" style="text-align: center;">Select the option that triggers the jump:</label><br>
                <select id="jumpOption${currentQuestionId}" style="display: block; margin: 0 auto;">
                    <!-- Options will be populated dynamically based on the question type -->
                </select><br><br>
                <label>Jump to (enter section number or 'end'):</label><br>
                <input type="text" placeholder="Section number or 'end'" id="jumpTo${currentQuestionId}"><br>
            </div>
        </div><br>
    `;

    questionsSection.appendChild(questionBlock);

    // Ensure the correct options menu is displayed based on the selected type
    toggleOptions(currentQuestionId);

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





function toggleOptions(questionId) {
    const questionTypeSelect = document.getElementById(`questionType${questionId}`);
    if (!questionTypeSelect) return; // Prevent errors if the element is not found

    const questionType = questionTypeSelect.value;
    const optionsBlock = document.getElementById(`optionsBlock${questionId}`);
    const checkboxBlock = document.getElementById(`checkboxBlock${questionId}`);
    const numberedDropdownBlock = document.getElementById(`numberedDropdownBlock${questionId}`); // Ensure this element exists in your HTML
    const jumpOptionLabel = document.getElementById(`jumpOptionLabel${questionId}`);
    const jumpOptionSelect = document.getElementById(`jumpOption${questionId}`);

    // Hide all blocks initially
    if (optionsBlock) optionsBlock.style.display = 'none';
    if (checkboxBlock) checkboxBlock.style.display = 'none';
    if (numberedDropdownBlock) numberedDropdownBlock.style.display = 'none'; // Handling the visibility of numberedDropdown block
    if (jumpOptionLabel) jumpOptionLabel.style.display = 'none';
    if (jumpOptionSelect) jumpOptionSelect.style.display = 'none';

    // Show and update specific blocks based on question type
    switch (questionType) {
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
            if (numberedDropdownBlock) numberedDropdownBlock.style.display = 'block'; // Display the numberedDropdown options block
            break;
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
        } else if (questionType === 'checkbox') {
            // For checkbox, set the jump options to the values of the checkboxes
            const checkboxOptionsDiv = document.getElementById(`checkboxOptions${questionId}`);
            const jumpOptionSelect = document.getElementById(`jumpOption${questionId}`);
            jumpOptionSelect.innerHTML = ''; // Clear previous options

            checkboxOptionsDiv.querySelectorAll('input[type="text"]').forEach(optionInput => {
                const value = optionInput.value.trim();
                if (value) {
                    const opt = document.createElement('option');
                    opt.value = value;
                    opt.text = value;
                    jumpOptionSelect.appendChild(opt);
                }
            });
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
    const sectionId = questionBlock.closest('.section-block').id.replace('sectionBlock', '');
    questionBlock.remove();

    // Update IDs of subsequent questions
    const remainingQuestions = document.querySelectorAll(`#questionsSection${sectionId} .question-block`);
    let newIndex = questionId;
    remainingQuestions.forEach(block => {
        if (parseInt(block.id.replace('questionBlock', '')) > questionId) {
            block.id = `questionBlock${newIndex}`;
            block.querySelector('label').innerText = `Question ${newIndex}:`;
            block.querySelectorAll('input, select, div').forEach(input => {
                const oldId = input.id;
                input.id = oldId.replace(/\d+$/, newIndex);
            });
            newIndex++;
        }
    });

    questionCounter = newIndex;  // Reset questionCounter to the new highest index + 1
}




