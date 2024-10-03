//this was in gui.js

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








//this was in generate.js



// Updated function to generate the hidden PDF fields
function generateHiddenPDFFields() {
    let hiddenFieldsHTML = `
    <div id="hidden_pdf_fields">
    `;

    let autofillMappings = []; // Array to store autofill mappings
    let conditionalAutofillLogic = ''; // String to store conditional logic scripts

    const hiddenFieldsContainer = document.getElementById('hiddenFieldsContainer');
    if (hiddenFieldsContainer) {
        const hiddenFieldBlocks = hiddenFieldsContainer.querySelectorAll('.hidden-field-block');
        hiddenFieldBlocks.forEach((fieldBlock) => {
            const hiddenFieldId = fieldBlock.id.replace('hiddenFieldBlock', '');
            const fieldType = document.getElementById(`hiddenFieldType${hiddenFieldId}`).value;
            const fieldName = document.getElementById(`hiddenFieldName${hiddenFieldId}`).value.trim();
            const autofillQuestionId = document.getElementById(`hiddenFieldAutofill${hiddenFieldId}`)?.value;
            const isCheckedByDefault = document.getElementById(`hiddenFieldChecked${hiddenFieldId}`)?.checked;

            if (fieldType === 'text' && fieldName) {
                hiddenFieldsHTML += `
    <input type="text" id="${fieldName}" name="${fieldName}" placeholder="${fieldName}">
                `;
                if (autofillQuestionId) {
                    autofillMappings.push({
                        hiddenFieldName: fieldName,
                        questionAnswerId: `answer${autofillQuestionId}`
                    });
                }

                // Build conditional logic for text fields
                const conditionalAutofillDiv = document.getElementById(`conditionalAutofill${hiddenFieldId}`);
                const conditionDivs = conditionalAutofillDiv.querySelectorAll('div[class^="condition"]');
                conditionDivs.forEach(conditionDiv => {
                    const conditionId = conditionDiv.className.replace('condition', '');
                    const questionId = document.getElementById(`conditionQuestion${hiddenFieldId}_${conditionId}`).value;
                    const answerValue = document.getElementById(`conditionAnswer${hiddenFieldId}_${conditionId}`).value;
                    const autofillValue = document.getElementById(`conditionValue${hiddenFieldId}_${conditionId}`).value;

                    if (questionId && answerValue && autofillValue) {
                        conditionalAutofillLogic += `
        if (document.getElementById('answer${questionId}').value === '${answerValue}') {
            document.getElementById('${fieldName}').value = '${autofillValue}';
        }
                        `;
                    }
                });
            } else if (fieldType === 'checkbox' && fieldName) {
                hiddenFieldsHTML += `
    <label class="checkbox-label">
        <input type="checkbox" id="${fieldName}" name="${fieldName}" ${isCheckedByDefault ? 'checked' : ''}>
        ${fieldName}
    </label>`;

                // Build conditional logic for checkboxes
                const conditionalAutofillDiv = document.getElementById(`conditionalAutofillForCheckbox${hiddenFieldId}`);
                const conditionDivs = conditionalAutofillDiv.querySelectorAll('div[class^="condition"]');
                conditionDivs.forEach(conditionDiv => {
                    const conditionId = conditionDiv.className.replace('condition', '');
                    const questionId = document.getElementById(`conditionQuestion${hiddenFieldId}_${conditionId}`).value;
                    const answerValue = document.getElementById(`conditionAnswer${hiddenFieldId}_${conditionId}`).value;
                    const valueToSet = document.getElementById(`conditionValue${hiddenFieldId}_${conditionId}`).value;

                    if (questionId && answerValue) {
                        conditionalAutofillLogic += `
                            if (document.getElementById('answer${questionId}').value === '${answerValue}') {
                                document.getElementById('${fieldName}').checked = ${valueToSet === 'checked' ? true : false};
                            }
                        `;
                    }
                });
            }
        });
    }

    hiddenFieldsHTML += `
    </div>
    `;

    // Return the hidden fields HTML, the autofill mappings, and the conditional autofill logic
    return { hiddenFieldsHTML, autofillMappings, conditionalAutofillLogic };
}




