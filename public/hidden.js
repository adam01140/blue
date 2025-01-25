/************************************************
 * hidden.js - Full version with new Calculations
 ************************************************/

/**
 * Initializes the hidden PDF fields module on page load.
 * (If you already call this from gui.js, remove or adapt.)
 */
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

/**
 * Adds a new (empty) hidden field block for the user to fill in.
 */
let hiddenFieldCounter = 1; // Make sure this is tracked globally or adapt to your code
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

    // Initialize sub-options
    toggleHiddenFieldOptions(currentHiddenFieldId);
    hiddenFieldCounter++;
}

/**
 * Removes a hidden-field block by ID.
 */
function removeHiddenField(hiddenFieldId) {
    const hiddenFieldBlock = document.getElementById(`hiddenFieldBlock${hiddenFieldId}`);
    if (hiddenFieldBlock) {
        hiddenFieldBlock.remove();
    }
}

/**
 * Toggles the sub-options (textbox vs. checkbox) for a hidden field.
 * Shows the appropriate UI and logic controls.
 */
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

            <!-- Add Calculation button -->
            <button type="button" onclick="addCalculationForCheckbox(${hiddenFieldId})">Add Calculation</button>
            <div id="calculationBlock${hiddenFieldId}"></div><br>

            <label>Checked by default: </label>
            <input type="checkbox" id="hiddenFieldChecked${hiddenFieldId}"><br><br>

            <label>Conditional Autofill Logic:</label><br>
            <div id="conditionalAutofillForCheckbox${hiddenFieldId}"></div>
            <button type="button" onclick="addConditionalAutofillForCheckbox(${hiddenFieldId})">Add Conditional Logic</button><br><br>
        `;
    }
}

/**
 * When loading from JSON, reconstruct a hidden field from data.
 * (This is called instead of addHiddenField() so we can fill in the details.)
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

    // Initialize sub-options
    toggleHiddenFieldOptions(currentHiddenFieldId);

    // Fill in name
    document.getElementById(`hiddenFieldName${currentHiddenFieldId}`).value = hiddenField.name || '';

    if (hiddenField.type === 'checkbox') {
        // checked by default
        document.getElementById(`hiddenFieldChecked${currentHiddenFieldId}`).checked = !!hiddenField.checked;

        // If we have conditions
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

        // If we have calculations
        if (hiddenField.calculations && hiddenField.calculations.length > 0) {
            hiddenField.calculations.forEach((calcObj, index) => {
                addCalculationForCheckbox(currentHiddenFieldId);
                const calcId = index + 1;
                document.getElementById(`calcQuestion${currentHiddenFieldId}_${calcId}`).value = calcObj.questionNameId || calcObj.questionId;
                document.getElementById(`calcOperator${currentHiddenFieldId}_${calcId}`).value = calcObj.operator;
                document.getElementById(`calcThreshold${currentHiddenFieldId}_${calcId}`).value = calcObj.threshold;
                document.getElementById(`calcResult${currentHiddenFieldId}_${calcId}`).value = calcObj.result;
            });
        }

    } else if (hiddenField.type === 'text') {
        // If we have an autofill question
        if (hiddenField.autofillQuestionId) {
            const autofillSelect = document.getElementById(`hiddenFieldAutofill${currentHiddenFieldId}`);
            autofillSelect.value = hiddenField.autofillQuestionId;
        }

        // If conditions
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

/***************************************************
 * Conditional Autofill for Text / Checkbox hidden fields
 ***************************************************/

/**
 * Adds a single condition row for "hiddenField" (type = text).
 *   If question X has answer Y, then autofill hidden field with Z
 */
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

/**
 * Removes one condition row from a text hidden field
 */
function removeConditionalAutofill(hiddenFieldId, conditionId) {
    const conditionDiv = document.getElementById(`condition${hiddenFieldId}_${conditionId}`);
    if (conditionDiv) {
        conditionDiv.remove();
    }
}

/**
 * Adds a single condition row for "hiddenField" (type = checkbox).
 *   If question X has answer Y, then check/uncheck hidden checkbox
 */
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

/**
 * Updates the "Answer" dropdown for a condition row,
 * once the user picks which previous question to reference.
 */
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

/*******************************************************
 * Calculation logic for hidden checkbox fields
 * "If [money question] [= / < / >] [threshold], then [Checked/Unchecked]"
 *******************************************************/

/**
 * Adds a single "Calculation" row for a hidden checkbox.
 * e.g.  If [money question] [= / < / >] [value] then [Checked/Unchecked]
 */
function addCalculationForCheckbox(hiddenFieldId) {
    const calculationBlock = document.getElementById(`calculationBlock${hiddenFieldId}`);
    const calcIndex = calculationBlock.children.length + 1;

    const row = document.createElement('div');
    row.className = `calculation${calcIndex}`;
    row.id = `calculationRow${hiddenFieldId}_${calcIndex}`;
    row.innerHTML = `
        <label>Calculation ${calcIndex}:</label><br>
        <label>If </label>
        <select id="calcQuestion${hiddenFieldId}_${calcIndex}" style="width: 200px;">
            <option value="">-- Select money question --</option>
            ${generateMoneyQuestionOptions()}
        </select>
        <select id="calcOperator${hiddenFieldId}_${calcIndex}">
            <option value="=">=</option>
            <option value="<"><</option>
            <option value=">">></option>
        </select>
        <input type="number" id="calcThreshold${hiddenFieldId}_${calcIndex}" placeholder="Enter number" style="width:80px;">
        <label> then </label>
        <select id="calcResult${hiddenFieldId}_${calcIndex}">
            <option value="checked">Checked</option>
            <option value="unchecked">Unchecked</option>
        </select>
        <button type="button" onclick="removeCalculationForCheckbox(${hiddenFieldId}, ${calcIndex})">Remove</button>
        <hr>
    `;
    calculationBlock.appendChild(row);
}

/**
 * Removes one calculation row from the hidden checkbox's calculationBlock
 */
function removeCalculationForCheckbox(hiddenFieldId, calcIndex) {
    const row = document.getElementById(`calculationRow${hiddenFieldId}_${calcIndex}`);
    if (row) row.remove();

    // Re-label the remaining rows
    const calculationBlock = document.getElementById(`calculationBlock${hiddenFieldId}`);
    const rows = calculationBlock.querySelectorAll(`div[id^="calculationRow"]`);
    rows.forEach((r, idx) => {
        const newIndex = idx + 1;
        r.className = `calculation${newIndex}`;
        r.id = `calculationRow${hiddenFieldId}_${newIndex}`;

        const label = r.querySelector('label');
        if (label) {
            label.textContent = `Calculation ${newIndex}:`;
        }
        const questionSelect = r.querySelector(`[id^="calcQuestion"]`);
        questionSelect.id = `calcQuestion${hiddenFieldId}_${newIndex}`;

        const opSelect = r.querySelector(`[id^="calcOperator"]`);
        opSelect.id = `calcOperator${hiddenFieldId}_${newIndex}`;

        const thresholdInput = r.querySelector(`[id^="calcThreshold"]`);
        thresholdInput.id = `calcThreshold${hiddenFieldId}_${newIndex}`;

        const resultSelect = r.querySelector(`[id^="calcResult"]`);
        resultSelect.id = `calcResult${hiddenFieldId}_${newIndex}`;

        const removeBtn = r.querySelector('button');
        removeBtn.setAttribute('onclick', `removeCalculationForCheckbox(${hiddenFieldId}, ${newIndex})`);
    });
}

/*****************************************************
 * Helper functions to generate question lists
 * (Used in the dropdowns for "Autofill" or "CalcQuestion")
 *****************************************************/

/**
 * generateQuestionOptions():
 *   - Return <option> tags for questions that can be used for text autofill
 *   - Typically text, bigParagraph, money, date, radio, dropdown, multipleTextboxes
 */
function generateQuestionOptions() {
    let optionsHTML = '';
    const questionBlocks = document.querySelectorAll('.question-block');

    questionBlocks.forEach(questionBlock => {
        const questionId = questionBlock.id.replace('questionBlock', '');
        const questionText = questionBlock.querySelector('input[type="text"]')?.value || `Question ${questionId}`;
        const questionType = questionBlock.querySelector('select')?.value;

        if (['text', 'bigParagraph', 'money', 'date', 'radio', 'dropdown'].includes(questionType)) {
            optionsHTML += `<option value="${questionId}">Question ${questionId}: ${questionText}</option>`;
        }
        if (questionType === 'multipleTextboxes') {
            const textboxes = questionBlock.querySelectorAll(`#multipleTextboxesOptions${questionId} .option`);
            textboxes.forEach((textbox, idx) => {
                const label = textbox.querySelector(`input[id^="multipleTextboxLabel"]`)?.value || `Textbox ${idx + 1}`;
                const nameId = textbox.querySelector(`input[id^="multipleTextboxName"]`)?.value || `answer${questionId}_${idx + 1}`;
                optionsHTML += `<option value="${questionId}_${idx + 1}">Q${questionId} - ${label} (${nameId})</option>`;
            });
        }
    });

    return optionsHTML;
}

/**
 * generateAllQuestionOptions():
 *   - Return <option> tags for all questions that have *discrete* answers
 *   - Typically used by the conditional logic to check for a match
 *   - i.e. radio, dropdown, checkbox
 */
function generateAllQuestionOptions() {
    let optionsHTML = '';
    const questionBlocks = document.querySelectorAll('.question-block');

    questionBlocks.forEach(questionBlock => {
        const questionId = questionBlock.id.replace('questionBlock', '');
        const questionText = questionBlock.querySelector('input[type="text"]')?.value || `Question ${questionId}`;
        const questionType = questionBlock.querySelector('select')?.value;

        if (['dropdown', 'radio', 'checkbox'].includes(questionType)) {
            optionsHTML += `<option value="${questionId}">Question ${questionId}: ${questionText}</option>`;
        }
    });

    return optionsHTML;
}

/**
 * generateMoneyQuestionOptions():
 *   - Return <option> tags for only "money"-type questions,
 *     used for the calculation feature
 */
function generateMoneyQuestionOptions() {
    let optionsHTML = '';
    const questionBlocks = document.querySelectorAll('.question-block');
    questionBlocks.forEach(questionBlock => {
        const qId = questionBlock.id.replace('questionBlock', '');
        const qType = questionBlock.querySelector('select')?.value;
        if (qType === 'money') {
            const nameIdInput = questionBlock.querySelector(`#textboxName${qId}`);
            const nameId = nameIdInput?.value || `answer${qId}`;
            const questionText = questionBlock.querySelector(`#question${qId}`)?.value || `Question ${qId}`;
            optionsHTML += `<option value="${nameId}">${questionText} (${nameId})</option>`;
        }
    });
    return optionsHTML;
}

/**
 * (Optional) If you want to re-sync or refresh these dropdowns 
 * after the user re-orders or modifies questions, call something like:
 *   updateAutofillOptions();
 * 
 * It re-generates the <option> sets for autofill or condition question references
 * to reflect the current questions in the form.
 */
function updateAutofillOptions() {
    const hiddenFieldBlocks = document.querySelectorAll('.hidden-field-block');
    hiddenFieldBlocks.forEach(hiddenFieldBlock => {
        const hiddenFieldId = hiddenFieldBlock.id.replace('hiddenFieldBlock', '');
        const fieldType = document.getElementById(`hiddenFieldType${hiddenFieldId}`).value;

        // If it's a text field with an "Autofill from question" select
        if (fieldType === 'text') {
            const autofillSelect = document.getElementById(`hiddenFieldAutofill${hiddenFieldId}`);
            if (autofillSelect) {
                const previousValue = autofillSelect.value;
                autofillSelect.innerHTML = `
                    <option value="">-- Select a question --</option>
                    ${generateQuestionOptions()}
                `;
                // Restore previous selection if still valid
                if (Array.from(autofillSelect.options).some(opt => opt.value === previousValue)) {
                    autofillSelect.value = previousValue;
                }
            }

            // Also refresh the “Conditional Autofill” question/answer selects
            const conditionalAutofillDiv = document.getElementById(`conditionalAutofill${hiddenFieldId}`);
            if (conditionalAutofillDiv) {
                const conditionDivs = conditionalAutofillDiv.querySelectorAll('div[class^="condition"]');
                conditionDivs.forEach(condDiv => {
                    const condId = condDiv.id.split('_')[1];
                    const questionSelect = document.getElementById(`conditionQuestion${hiddenFieldId}_${condId}`);
                    if (!questionSelect) return;
                    const previousQuestionVal = questionSelect.value;

                    // Rebuild question list
                    questionSelect.innerHTML = `
                        <option value="">-- Select a question --</option>
                        ${generateAllQuestionOptions()}
                    `;
                    // Re-select if still valid
                    if (Array.from(questionSelect.options).some(opt => opt.value === previousQuestionVal)) {
                        questionSelect.value = previousQuestionVal;
                        updateConditionAnswers(hiddenFieldId, condId);
                    }
                });
            }
        }
        // If it's a checkbox hidden field, we might also re-sync condition question/answer selects
        else if (fieldType === 'checkbox') {
            const conditionalDiv = document.getElementById(`conditionalAutofillForCheckbox${hiddenFieldId}`);
            if (conditionalDiv) {
                const conditionDivs = conditionalDiv.querySelectorAll('div[class^="condition"]');
                conditionDivs.forEach((condDiv, index) => {
                    const condId = condDiv.id.split('_')[1];
                    const questionSelect = document.getElementById(`conditionQuestion${hiddenFieldId}_${condId}`);
                    if (!questionSelect) return;
                    const prevVal = questionSelect.value;

                    questionSelect.innerHTML = `
                        <option value="">-- Select a question --</option>
                        ${generateAllQuestionOptions()}
                    `;
                    if (Array.from(questionSelect.options).some(opt => opt.value === prevVal)) {
                        questionSelect.value = prevVal;
                        updateConditionAnswers(hiddenFieldId, condId);
                    }
                });
            }
        }
    });
}


/**********************************************
 * End of hidden.js 
 **********************************************/
