/********************************************
 * export.js - MULTIPLE OR CONDITIONS
 ********************************************/

function generateAndDownloadForm() {
    const formHTML = getFormHTML();
    navigator.clipboard.writeText(formHTML).then(() => {
        alert("HTML code has been copied to the clipboard.");
    });
    downloadHTML(formHTML, "custom_form.html");
}

function showPreview() {
    const formHTML = getFormHTML();
    const previewModal = document.getElementById('previewModal');
    const previewFrame = document.getElementById('previewFrame');
    previewFrame.srcdoc = formHTML;
    previewModal.style.display = 'flex';
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

    // 4) Initialize hidden-fields module (if your GUI uses it)
    initializeHiddenPDFFieldsModule();

    // 5) Build out sections and questions
    if (formData.sections) {
        formData.sections.forEach(section => {
            // A) Create the section in the UI
            addSection(section.sectionId);

            // B) Set the name of the section
            const sectionNameInput = document.getElementById(`sectionName${section.sectionId}`);
            if (sectionNameInput) {
                sectionNameInput.value = section.sectionName || `Section ${section.sectionId}`;
                updateSectionName(section.sectionId);
            }

            // C) Add questions inside this section
            (section.questions || []).forEach(question => {
                addQuestion(section.sectionId, question.questionId);

                const questionBlock = document.getElementById(`questionBlock${question.questionId}`);
                if (!questionBlock) return;

                // -- Set question text and type --
                const questionInput = questionBlock.querySelector(`#question${question.questionId}`);
                if (questionInput) {
                    questionInput.value = question.text;
                }
                const questionTypeSelect = questionBlock.querySelector(`#questionType${question.questionId}`);
                if (questionTypeSelect) {
                    questionTypeSelect.value = question.type;
                    toggleOptions(question.questionId);
                }

                // -- If checkbox => rebuild its options
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
                // -- If dropdown => rebuild its options
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

                            // Attach 'input' event so jump options refresh if user edits it
                            const optionInput = optionDiv.querySelector('input[type="text"]');
                            optionInput.addEventListener('input', () => {
                                updateJumpOptions(question.questionId);
                            });
                        });

                        // *** IMPORTANT FIX ***
                        // Re-run updateJumpOptions *after* we've populated the dropdown so
                        // the Jump Option select is filled with the newly imported options.
                        updateJumpOptions(question.questionId);
                    }
                }
                // ...multipleTextboxes, numberedDropdown, etc. if needed

                // ============== MULTIPLE OR logic ==============
                if (question.logic && question.logic.enabled) {
                    questionBlock.querySelector(`#logic${question.questionId}`).checked = true;
                    toggleLogic(question.questionId);

                    // For each condition
                    const logicConditionsDiv = questionBlock.querySelector(`#logicConditions${question.questionId}`);
                    (question.logic.conditions || []).forEach((cond, idx) => {
                        addLogicCondition(question.questionId);
                        const rowId = idx + 1;
                        const pq = questionBlock.querySelector(`#prevQuestion${question.questionId}_${rowId}`);
                        const pa = questionBlock.querySelector(`#prevAnswer${question.questionId}_${rowId}`);
                        if (pq) pq.value = cond.prevQuestion;
                        updateLogicAnswersForRow(question.questionId, rowId);
                        if (pa) pa.value = cond.prevAnswer;
                    });
                }

                // ============== Jump logic ==============
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

                // ============== Conditional PDF ==============
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

                // ============== Conditional Alert ==============
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

    // 7) Finally, re-run references
    updateAutofillOptions();
}

function exportForm() {
    const formData = {
        sections: [],
        hiddenFields: [],
        sectionCounter: sectionCounter,
        questionCounter: questionCounter,
        hiddenFieldCounter: hiddenFieldCounter,
        defaultPDFName: document.getElementById('formPDFName')
            ? document.getElementById('formPDFName').value.trim()
            : ''
    };

    // ========== Export sections and questions ==========
    for (let s = 1; s < sectionCounter; s++) {
        const sectionBlock = document.getElementById(`sectionBlock${s}`);
        if (!sectionBlock) continue;

        const sectionData = {
            sectionId: s,
            sectionName: document.getElementById(`sectionName${s}`).value || `Section ${s}`,
            questions: []
        };

        const questionsSection = sectionBlock.querySelectorAll('.question-block');
        questionsSection.forEach((questionBlock) => {
            const questionId = parseInt(questionBlock.id.replace('questionBlock', ''), 10);
            const questionText = questionBlock.querySelector(`#question${questionId}`).value;
            const questionType = questionBlock.querySelector(`#questionType${questionId}`).value;

            // ---------- Gather multiple OR logic ----------
            const logicEnabled = questionBlock.querySelector(`#logic${questionId}`)?.checked || false;
            const logicConditionsDiv = questionBlock.querySelector(`#logicConditions${questionId}`);
            const logicRows = logicConditionsDiv ? logicConditionsDiv.querySelectorAll('.logic-condition-row') : [];
            const conditionsArray = [];
            if (logicEnabled) {
                logicRows.forEach((row, idx) => {
                    const rowIndex = idx + 1;
                    const pq = row.querySelector(`#prevQuestion${questionId}_${rowIndex}`)?.value.trim() || "";
                    const pa = row.querySelector(`#prevAnswer${questionId}_${rowIndex}`)?.value.trim() || "";
                    if (pq && pa) {
                        conditionsArray.push({ prevQuestion: pq, prevAnswer: pa });
                    }
                });
            }

            // ---------- Jump logic ----------
            const jumpEnabled = questionBlock.querySelector(`#enableJump${questionId}`)?.checked || false;
            const jumpOption = questionBlock.querySelector(`#jumpOption${questionId}`)?.value || "";
            const jumpTo = questionBlock.querySelector(`#jumpTo${questionId}`)?.value || "";

            // ---------- Conditional PDF logic ----------
            const conditionalPDFEnabled = questionBlock.querySelector(`#enableConditionalPDF${questionId}`)?.checked || false;
            const conditionalPDFName = questionBlock.querySelector(`#conditionalPDFName${questionId}`)?.value || "";
            const conditionalPDFAnswer = questionBlock.querySelector(`#conditionalPDFAnswer${questionId}`)?.value || "";

            // ---------- Conditional Alert logic ----------
            const alertEnabled = questionBlock.querySelector(`#enableConditionalAlert${questionId}`)?.checked || false;
            const alertPrevQ = questionBlock.querySelector(`#alertPrevQuestion${questionId}`)?.value || "";
            const alertPrevA = questionBlock.querySelector(`#alertPrevAnswer${questionId}`)?.value || "";
            const alertText = questionBlock.querySelector(`#alertText${questionId}`)?.value || "";

            const questionData = {
                questionId: questionId,
                text: questionText,
                type: questionType,
                logic: {
                    enabled: logicEnabled,
                    // multiple conditions stored here
                    conditions: conditionsArray
                },
                jump: {
                    enabled: jumpEnabled,
                    option: jumpOption,
                    to: jumpTo
                },
                conditionalPDF: {
                    enabled: conditionalPDFEnabled,
                    pdfName: conditionalPDFName,
                    answer: conditionalPDFAnswer
                },
                conditionalAlert: {
                    enabled: alertEnabled,
                    prevQuestion: alertPrevQ,
                    prevAnswer: alertPrevA,
                    text: alertText
                },
                options: [],
                labels: []
            };

            // ========== Collect question-specific options ==========
            if (questionType === 'checkbox') {
                const optionsDivs = questionBlock.querySelectorAll(`#checkboxOptions${questionId} > div`);
                optionsDivs.forEach((optionDiv, index) => {
                    const optTextEl = optionDiv.querySelector(`#checkboxOptionText${questionId}_${index + 1}`);
                    const optNameEl = optionDiv.querySelector(`#checkboxOptionName${questionId}_${index + 1}`);
                    const optValueEl = optionDiv.querySelector(`#checkboxOptionValue${questionId}_${index + 1}`);

                    const optText = optTextEl ? optTextEl.value.trim() : `Option ${index + 1}`;
                    const optNameId = optNameEl ? optNameEl.value.trim() : `answer${questionId}_${index + 1}`;
                    const optValue = optValueEl ? optValueEl.value.trim() : optText;

                    questionData.options.push({
                        label: optText,
                        nameId: optNameId,
                        value: optValue
                    });
                });

                // Check if user included "None of the above"
                const noneOfTheAboveCheckbox = questionBlock.querySelector(`#noneOfTheAbove${questionId}`);
                if (noneOfTheAboveCheckbox && noneOfTheAboveCheckbox.checked) {
                    questionData.options.push({
                        label: "None of the above",
                        nameId: `answer${questionId}_none`,
                        value: "None of the above"
                    });
                }
            }
            else if (questionType === 'dropdown') {
                const dropdownOptionEls = questionBlock.querySelectorAll(`#dropdownOptions${questionId} input`);
                dropdownOptionEls.forEach(optionEl => {
                    const val = optionEl.value.trim() || "Option";
                    questionData.options.push(val);
                });
            }
            else if (questionType === 'numberedDropdown') {
                const rangeStart = questionBlock.querySelector(`#numberRangeStart${questionId}`)?.value || '';
                const rangeEnd = questionBlock.querySelector(`#numberRangeEnd${questionId}`)?.value || '';
                const labels = Array.from(
                    questionBlock.querySelectorAll(`#textboxLabels${questionId} input`)
                ).map(lbl => lbl.value.trim());
                questionData.min = rangeStart;
                questionData.max = rangeEnd;
                questionData.labels = labels;
            }
            else if (questionType === 'multipleTextboxes') {
                const multiBlocks = questionBlock.querySelectorAll(`#multipleTextboxesOptions${questionId} > div`);
                questionData.textboxes = [];
                multiBlocks.forEach((optionDiv, index) => {
                    const labelInput = optionDiv.querySelector(`#multipleTextboxLabel${questionId}_${index + 1}`);
                    const nameIdInput = optionDiv.querySelector(`#multipleTextboxName${questionId}_${index + 1}`);
                    const placeholderInput = optionDiv.querySelector(`#multipleTextboxPlaceholder${questionId}_${index + 1}`);

                    const labelText = labelInput?.value.trim() || `Textbox ${index + 1}`;
                    const nameId = nameIdInput?.value.trim() || `answer${questionId}_${index + 1}`;
                    const placeholder = placeholderInput?.value.trim() || '';

                    questionData.textboxes.push({
                        label: labelText,
                        nameId: nameId,
                        placeholder: placeholder
                    });
                });
            }
            else if (questionType === 'text' || questionType === 'bigParagraph') {
                const nameId = questionBlock.querySelector(`#textboxName${questionId}`)?.value.trim() || `answer${questionId}`;
                const placeholder = questionBlock.querySelector(`#textboxPlaceholder${questionId}`)?.value.trim() || '';
                questionData.nameId = nameId;
                questionData.placeholder = placeholder;
            }

            sectionData.questions.push(questionData);
        });

        formData.sections.push(sectionData);
    }

    // ========== Export hidden fields with autofill logic ==========
    const hiddenFieldsContainer = document.getElementById('hiddenFieldsContainer');
    if (hiddenFieldsContainer) {
        const hiddenFieldBlocks = hiddenFieldsContainer.querySelectorAll('.hidden-field-block');
        hiddenFieldBlocks.forEach((fieldBlock) => {
            const hiddenFieldId = fieldBlock.id.replace('hiddenFieldBlock', '');
            const fieldType = document.getElementById(`hiddenFieldType${hiddenFieldId}`).value;
            const fieldName = document.getElementById(`hiddenFieldName${hiddenFieldId}`)?.value.trim() || '';
            const isChecked = document.getElementById(`hiddenFieldChecked${hiddenFieldId}`)?.checked || false;

            const hiddenFieldData = {
                hiddenFieldId: hiddenFieldId,
                type: fieldType,
                name: fieldName,
                checked: isChecked
            };

            if (fieldType === 'checkbox') {
                // Collect any conditions
                const conditions = [];
                const conditionalDiv = document.getElementById(`conditionalAutofillForCheckbox${hiddenFieldId}`);
                if (conditionalDiv) {
                    const conditionDivs = conditionalDiv.querySelectorAll('div[class^="condition"]');
                    conditionDivs.forEach((condDiv, index) => {
                        const cid = index + 1;
                        const qId = condDiv.querySelector(`#conditionQuestion${hiddenFieldId}_${cid}`)?.value;
                        const aVal = condDiv.querySelector(`#conditionAnswer${hiddenFieldId}_${cid}`)?.value;
                        const fillVal = condDiv.querySelector(`#conditionValue${hiddenFieldId}_${cid}`)?.value;
                        if (qId && aVal && fillVal) {
                            conditions.push({
                                questionId: qId,
                                answerValue: aVal,
                                autofillValue: fillVal
                            });
                        }
                    });
                }
                hiddenFieldData.conditions = conditions;
            }
            else if (fieldType === 'text') {
                const conditions = [];
                const textConditionalDiv = document.getElementById(`conditionalAutofill${hiddenFieldId}`);
                if (textConditionalDiv) {
                    const conditionDivs = textConditionalDiv.querySelectorAll('div[class^="condition"]');
                    conditionDivs.forEach((condDiv, index) => {
                        const cid = index + 1;
                        const qId = condDiv.querySelector(`#conditionQuestion${hiddenFieldId}_${cid}`)?.value;
                        const aVal = condDiv.querySelector(`#conditionAnswer${hiddenFieldId}_${cid}`)?.value;
                        const fillVal = condDiv.querySelector(`#conditionValue${hiddenFieldId}_${cid}`)?.value;
                        if (qId && aVal && fillVal) {
                            conditions.push({
                                questionId: qId,
                                answerValue: aVal,
                                autofillValue: fillVal
                            });
                        }
                    });
                }
                hiddenFieldData.conditions = conditions;
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

/**
 * If your GUI supports adding hidden fields,
 * we use this to create them from loaded JSON
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

    // Toggle the correct suboptions
    toggleHiddenFieldOptions(currentHiddenFieldId);

    // Fill the name
    document.getElementById(`hiddenFieldName${currentHiddenFieldId}`).value = hiddenField.name;

    if (hiddenField.type === 'checkbox') {
        document.getElementById(`hiddenFieldChecked${currentHiddenFieldId}`).checked = hiddenField.checked;
        // Rebuild conditions
        if (hiddenField.conditions && hiddenField.conditions.length > 0) {
            hiddenField.conditions.forEach((condition, index) => {
                addConditionalAutofillForCheckbox(currentHiddenFieldId);
                const condRow = index + 1;
                document.getElementById(`conditionQuestion${currentHiddenFieldId}_${condRow}`).value = condition.questionId;
                updateConditionAnswers(currentHiddenFieldId, condRow);
                document.getElementById(`conditionAnswer${currentHiddenFieldId}_${condRow}`).value = condition.answerValue;
                document.getElementById(`conditionValue${currentHiddenFieldId}_${condRow}`).value = condition.autofillValue;
            });
        }
    }
    else if (hiddenField.type === 'text') {
        // If there's an autofillQuestionId (like "answer5"), set it
        if (hiddenField.autofillQuestionId) {
            const autofillSelect = document.getElementById(`hiddenFieldAutofill${currentHiddenFieldId}`);
            if (autofillSelect) autofillSelect.value = hiddenField.autofillQuestionId;
        }
        if (hiddenField.conditions && hiddenField.conditions.length > 0) {
            hiddenField.conditions.forEach((condition, index) => {
                addConditionalAutofill(currentHiddenFieldId);
                const condRow = index + 1;
                document.getElementById(`conditionQuestion${currentHiddenFieldId}_${condRow}`).value = condition.questionId;
                updateConditionAnswers(currentHiddenFieldId, condRow);
                document.getElementById(`conditionAnswer${currentHiddenFieldId}_${condRow}`).value = condition.answerValue;
                document.getElementById(`conditionValue${currentHiddenFieldId}_${condRow}`).value = condition.autofillValue;
            });
        }
    }
}
