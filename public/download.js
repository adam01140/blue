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
        sectionCounter: sectionCounter,
        questionCounter: questionCounter
    };

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
            const questionText = questionBlock.querySelector(`input[type="text"]`).value;
            const questionType = questionBlock.querySelector(`select`).value;
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
                options: []
            };

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
                // **Add this block to handle dropdown options**
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
                questionData.labels = labels; // Store labels for each numbered dropdown
            } else if (questionType === 'multipleTextboxes') {
                const multipleTextboxesOptionsDiv = questionBlock.querySelectorAll(`#multipleTextboxesOptions${questionId} input`);
                const labels = [];
                multipleTextboxesOptionsDiv.forEach(input => {
                    labels.push(input.value);
                });
                questionData.labels = labels;
            }

            sectionData.questions.push(questionData);
        });

        formData.sections.push(sectionData);
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

    formData.sections.forEach(section => {
        addSection(section.sectionId);
        section.questions.forEach(question => {
            addQuestion(section.sectionId, question.questionId);
            const questionBlock = document.getElementById(`questionBlock${question.questionId}`);
            questionBlock.querySelector(`input[type="text"]`).value = question.text;
            questionBlock.querySelector(`select`).value = question.type;

            toggleOptions(question.questionId);

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
                            <input type="text" value="${option}" placeholder="Option ${index + 1}">
                            <button type="button" onclick="removeCheckboxOption(${question.questionId}, ${index + 1})">Remove</button>
                        `;
                        checkboxOptionsDiv.appendChild(optionDiv);
                    }
                });
            } else if (question.type === 'dropdown') {
                // **Add this block to handle dropdown options**
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
                    labelDiv.innerHTML = `
                        <input type="text" value="${label}" placeholder="Label ${index + 1}">
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
}









