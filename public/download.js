// download.js

function downloadHTML(content, filename) {
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function exportForm() {
    const formData = {
        sections: [],
        hiddenFields: [], // Include hidden fields in the exported data
        sectionCounter: sectionCounter,
        questionCounter: questionCounter,
        hiddenFieldCounter: hiddenFieldCounter // Include hiddenFieldCounter
    };

    // Export sections and questions
    for (let s = 1; s < sectionCounter; s++) {
        const sectionBlock = document.getElementById(`sectionBlock${s}`);
        if (!sectionBlock) continue;

        const sectionData = {
            sectionId: s,
            questions: []
        };

        const questionsSection = sectionBlock.querySelectorAll('.question-block');
        questionsSection.forEach((questionBlock) => {
            const questionId = parseInt(questionBlock.id.replace('questionBlock', ''));
            const questionText = questionBlock.querySelector(`#question${questionId}`).value;
            const questionType = questionBlock.querySelector(`#questionType${questionId}`).value;
            const logicEnabled = questionBlock.querySelector(`#logic${questionId}`).checked;
            const prevQuestion = questionBlock.querySelector(`#prevQuestion${questionId}`).value;
            const prevAnswer = questionBlock.querySelector(`#prevAnswer${questionId}`).value;
            const jumpEnabled = questionBlock.querySelector(`#enableJump${questionId}`).checked;
            const jumpOption = questionBlock.querySelector(`#jumpOption${questionId}`).value;
            const jumpTo = questionBlock.querySelector(`#jumpTo${questionId}`).value;

            const questionData = {
                questionId: questionId,
                text: questionText,
                type: questionType,
                logic: {
                    enabled: logicEnabled,
                    prevQuestion: prevQuestion,
                    prevAnswer: prevAnswer
                },
                jump: {
                    enabled: jumpEnabled,
                    option: jumpOption,
                    to: jumpTo
                },
                options: [],
                labels: []
            };

            // Collect question-specific options
            if (questionType === 'checkbox') {
                const options = questionBlock.querySelectorAll(`#checkboxOptions${questionId} input`);
                options.forEach(option => {
                    questionData.options.push(option.value);
                });
                const noneOfTheAbove = document.getElementById(`noneOfTheAbove${questionId}`);
                if (noneOfTheAbove && noneOfTheAbove.checked) {
                    questionData.options.push('None of the above');
                }
            } else if (questionType === 'dropdown') {
                const options = questionBlock.querySelectorAll(`#dropdownOptions${questionId} input`);
                options.forEach(option => {
                    questionData.options.push(option.value);
                });
            } else if (questionType === 'numberedDropdown') {
                const rangeStart = questionBlock.querySelector(`#numberRangeStart${questionId}`).value;
                const rangeEnd = questionBlock.querySelector(`#numberRangeEnd${questionId}`).value;
                const labels = Array.from(questionBlock.querySelectorAll(`#textboxLabels${questionId} input`))
                    .map(label => label.value);

                questionData.min = rangeStart;
                questionData.max = rangeEnd;
                questionData.labels = labels;
            } else if (questionType === 'multipleTextboxes') {
                const labels = Array.from(questionBlock.querySelectorAll(`#multipleTextboxesOptions${questionId} input`))
                    .map(input => input.value);
                questionData.labels = labels;
            }

            sectionData.questions.push(questionData);
        });

        formData.sections.push(sectionData);
    }

    // Export hidden fields with autofill logic and conditional logic
    // Export hidden fields with autofill logic and conditional logic
const hiddenFieldsContainer = document.getElementById('hiddenFieldsContainer');
if (hiddenFieldsContainer) {
    const hiddenFieldBlocks = hiddenFieldsContainer.querySelectorAll('.hidden-field-block');
    hiddenFieldBlocks.forEach((fieldBlock) => {
        const hiddenFieldId = fieldBlock.id.replace('hiddenFieldBlock', '');
        const fieldType = document.getElementById(`hiddenFieldType${hiddenFieldId}`).value;
        const fieldName = document.getElementById(`hiddenFieldName${hiddenFieldId}`).value.trim();
        const isChecked = document.getElementById(`hiddenFieldChecked${hiddenFieldId}`)?.checked || false;

        const hiddenFieldData = {
            hiddenFieldId: hiddenFieldId,
            type: fieldType,
            name: fieldName,
            checked: isChecked
        };

        if (fieldType === 'checkbox') {
            // Collect conditional logic for checkboxes
            const conditions = [];
            const conditionalAutofillDiv = document.getElementById(`conditionalAutofillForCheckbox${hiddenFieldId}`);
            const conditionDivs = conditionalAutofillDiv.querySelectorAll('div[class^="condition"]');
            conditionDivs.forEach(conditionDiv => {
                const conditionId = conditionDiv.className.replace('condition', '');
                const questionId = document.getElementById(`conditionQuestion${hiddenFieldId}_${conditionId}`).value;
                const answerValue = document.getElementById(`conditionAnswer${hiddenFieldId}_${conditionId}`).value;
                const autofillValue = document.getElementById(`conditionValue${hiddenFieldId}_${conditionId}`).value;

                if (questionId && answerValue && autofillValue) {
                    conditions.push({
                        questionId: questionId,
                        answerValue: answerValue,
                        autofillValue: autofillValue
                    });
                }
            });

            hiddenFieldData.conditions = conditions; // Add conditions to the exported data
        } else if (fieldType === 'text') {
    // Collect conditional logic for textboxes
    const conditions = [];
    const conditionalAutofillDiv = document.getElementById(`conditionalAutofill${hiddenFieldId}`);
    const conditionDivs = conditionalAutofillDiv.querySelectorAll('div[class^="condition"]');
    conditionDivs.forEach(conditionDiv => {
        const conditionId = conditionDiv.className.replace('condition', '');
        const questionId = document.getElementById(`conditionQuestion${hiddenFieldId}_${conditionId}`).value;
        const answerValue = document.getElementById(`conditionAnswer${hiddenFieldId}_${conditionId}`).value;
        const autofillValue = document.getElementById(`conditionValue${hiddenFieldId}_${conditionId}`).value;

        if (questionId && answerValue && autofillValue) {
            conditions.push({
                questionId: questionId,
                answerValue: answerValue,
                autofillValue: autofillValue
            });
        }
    });

    hiddenFieldData.conditions = conditions; // Add conditions to the exported data for textboxes
}

        formData.hiddenFields.push(hiddenFieldData);
    });
}


    const jsonString = JSON.stringify(formData, null, 2);
    downloadJSON(jsonString, "form_data.json");
}

function downloadJSON(content, filename) {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function importForm(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const jsonData = JSON.parse(e.target.result);
            loadFormData(jsonData);
        };
        reader.readAsText(file);
    }
}

function loadFormData(formData) {
    document.getElementById('formBuilder').innerHTML = '';

    sectionCounter = formData.sectionCounter;
    questionCounter = formData.questionCounter;
    hiddenFieldCounter = formData.hiddenFieldCounter || 1;

    // Initialize the Hidden PDF Fields module
    initializeHiddenPDFFieldsModule();

    // Load sections and questions first
    formData.sections.forEach(section => {
        addSection(section.sectionId);
        section.questions.forEach(question => {
            addQuestion(section.sectionId, question.questionId);
            const questionBlock = document.getElementById(`questionBlock${question.questionId}`);
            questionBlock.querySelector(`#question${question.questionId}`).value = question.text;
            questionBlock.querySelector(`#questionType${question.questionId}`).value = question.type;

            toggleOptions(question.questionId);

            // Restore question-specific options
            if (question.type === 'checkbox') {
                const checkboxOptionsDiv = document.getElementById(`checkboxOptions${question.questionId}`);
                checkboxOptionsDiv.innerHTML = '';

                question.options.forEach((option, index) => {
                    if (option === 'None of the above') {
                        document.getElementById(`noneOfTheAbove${question.questionId}`).checked = true;
                    } else {
                        const optionDiv = document.createElement('div');
                        optionDiv.className = `option${index + 1}`;
                        optionDiv.innerHTML = `
                            <input type="text" id="checkboxOption${question.questionId}_${index + 1}" value="${option}" placeholder="Option ${index + 1}">
                            <button type="button" onclick="removeCheckboxOption(${question.questionId}, ${index + 1})">Remove</button>
                        `;
                        checkboxOptionsDiv.appendChild(optionDiv);
                    }
                });
            } else if (question.type === 'dropdown') {
                const dropdownOptionsDiv = document.getElementById(`dropdownOptions${question.questionId}`);
                dropdownOptionsDiv.innerHTML = '';

                question.options.forEach((optionText, index) => {
                    const optionDiv = document.createElement('div');
                    optionDiv.className = `option${index + 1}`;
                    const optionId = `option${question.questionId}_${index + 1}`;
                    optionDiv.innerHTML = `
                        <input type="text" id="${optionId}" value="${optionText}" placeholder="Option ${index + 1}">
                        <button type="button" onclick="removeDropdownOption(${question.questionId}, ${index + 1})">Remove</button>
                    `;
                    dropdownOptionsDiv.appendChild(optionDiv);
                });
            } else if (question.type === 'numberedDropdown') {
                const rangeStart = questionBlock.querySelector(`#numberRangeStart${question.questionId}`);
                const rangeEnd = questionBlock.querySelector(`#numberRangeEnd${question.questionId}`);
                rangeStart.value = question.min;
                rangeEnd.value = question.max;

                const labelsDiv = document.getElementById(`textboxLabels${question.questionId}`);
                labelsDiv.innerHTML = '';
                question.labels.forEach((label, index) => {
                    const labelDiv = document.createElement('div');
                    labelDiv.className = `label${index + 1}`;
                    labelDiv.innerHTML = `
                        <input type="text" id="label${question.questionId}_${index + 1}" value="${label}" placeholder="Label ${index + 1}">
                        <button type="button" onclick="removeTextboxLabel(${question.questionId}, ${index + 1})">Remove</button>
                    `;
                    labelsDiv.appendChild(labelDiv);
                });
            } else if (question.type === 'multipleTextboxes') {
                const multipleTextboxesOptionsDiv = document.getElementById(`multipleTextboxesOptions${question.questionId}`);
                multipleTextboxesOptionsDiv.innerHTML = '';

                question.labels.forEach((labelText, index) => {
                    const optionDiv = document.createElement('div');
                    optionDiv.className = `option${index + 1}`;
                    optionDiv.innerHTML = `
                        <input type="text" id="multipleTextboxLabel${question.questionId}_${index + 1}" value="${labelText}" placeholder="Label ${index + 1}">
                        <button type="button" onclick="removeMultipleTextboxOption(${question.questionId}, ${index + 1})">Remove</button>
                    `;
                    multipleTextboxesOptionsDiv.appendChild(optionDiv);
                });
            }

            if (question.logic.enabled) {
                questionBlock.querySelector(`#logic${question.questionId}`).checked = true;
                toggleLogic(question.questionId);
                questionBlock.querySelector(`#prevQuestion${question.questionId}`).value = question.logic.prevQuestion;
                questionBlock.querySelector(`#prevAnswer${question.questionId}`).value = question.logic.prevAnswer;
            }

            if (question.jump.enabled) {
                questionBlock.querySelector(`#enableJump${question.questionId}`).checked = true;
                toggleJumpLogic(question.questionId);
                questionBlock.querySelector(`#jumpOption${question.questionId}`).value = question.jump.option;
                questionBlock.querySelector(`#jumpTo${question.questionId}`).value = question.jump.to;
            }
        });
    });

    // Now load hidden fields
    if (formData.hiddenFields && formData.hiddenFields.length > 0) {
        formData.hiddenFields.forEach(hiddenField => {
            addHiddenFieldWithData(hiddenField);
        });
    }

    // Update autofill options in hidden fields after loading all questions
    updateAutofillOptions();
}

// Function to add a hidden field with data, including autofill logic and conditions
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
        // Set autofillQuestionId if available
        if (hiddenField.autofillQuestionId) {
            const autofillSelect = document.getElementById(`hiddenFieldAutofill${currentHiddenFieldId}`);
            autofillSelect.value = hiddenField.autofillQuestionId;
        }

        // Load conditions for textboxes
        if (hiddenField.conditions && hiddenField.conditions.length > 0) {
            hiddenField.conditions.forEach((condition, index) => {
                addConditionalAutofill(currentHiddenFieldId);
                const conditionId = index + 1;
                document.getElementById(`conditionQuestion${currentHiddenFieldId}_${conditionId}`).value = condition.questionId;
                updateConditionAnswers(currentHiddenFieldId, conditionId); // Populate the answer dropdown
                document.getElementById(`conditionAnswer${currentHiddenFieldId}_${conditionId}`).value = condition.answerValue;
                document.getElementById(`conditionValue${currentHiddenFieldId}_${conditionId}`).value = condition.autofillValue;
            });
        }
    }
}



