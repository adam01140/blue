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
            const questionId = questionBlock.id.replace('questionBlock', '');
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

            if (questionType === 'dropdown' || questionType === 'checkbox') {
                const options = questionBlock.querySelectorAll(questionType === 'dropdown' ? `#dropdownOptions${questionId} input` : `#checkboxOptions${questionId} input`);
                options.forEach(option => {
                    questionData.options.push(option.value);
                });
            } else if (questionType === 'numberedDropdown') {
                const rangeStart = questionBlock.querySelector(`#numberRangeStart${questionId}`).value;
                const rangeEnd = questionBlock.querySelector(`#numberRangeEnd${questionId}`).value;
                const labels = Array.from(questionBlock.querySelectorAll(`#textboxLabels${questionId} input`)).map(label => label.value);
                questionData.options.push({ rangeStart, rangeEnd, labels });
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
    // Clear existing form
    document.getElementById('formBuilder').innerHTML = '';

    // Reset counters
    sectionCounter = formData.sectionCounter;
    questionCounter = formData.questionCounter;

    // Rebuild the form from the imported JSON data
    formData.sections.forEach(section => {
        // Create a section with the correct sectionId
        addSection(section.sectionId);

        // Ensure we're targeting the correct section
        const questionsSection = document.getElementById(`questionsSection${section.sectionId}`);
        if (!questionsSection) {
            console.error(`Section ${section.sectionId} not found.`);
            return;
        }

        section.questions.forEach(question => {
            // Add question to the correct section with the correct questionId
            addQuestion(section.sectionId, question.questionId);

            // Get the newly created question block
            const questionBlock = document.getElementById(`questionBlock${question.questionId}`);
            if (!questionBlock) {
                console.error(`Question ${question.questionId} not found.`);
                return;
            }

            // Populate the question data
            questionBlock.querySelector(`input[type="text"]`).value = question.text;
            questionBlock.querySelector(`select`).value = question.type;

            // Delay toggleOptions to ensure elements are ready
            setTimeout(() => {
                toggleOptions(question.questionId);
            }, 0);

            // Populate options for dropdown and checkbox types
            if (question.type === 'dropdown' || question.type === 'checkbox') {
                question.options.forEach(option => {
                    if (question.type === 'dropdown') {
                        addDropdownOption(question.questionId);
                    } else if (question.type === 'checkbox') {
                        addCheckboxOption(question.questionId);
                    }
                    const optionBlock = document.getElementById(`${question.type === 'dropdown' ? 'dropdownOptions' : 'checkboxOptions'}${question.questionId}`);
                    optionBlock.lastChild.querySelector(`input[type="text"]`).value = option;
                });
            } else if (question.type === 'numberedDropdown') {
                const rangeStartInput = questionBlock.querySelector(`#numberRangeStart${question.questionId}`);
                const rangeEndInput = questionBlock.querySelector(`#numberRangeEnd${question.questionId}`);
                rangeStartInput.value = question.options[0].rangeStart;
                rangeEndInput.value = question.options[0].rangeEnd;
                question.options[0].labels.forEach(label => {
                    addTextboxLabel(question.questionId);
                    const labelBlock = document.getElementById(`textboxLabels${question.questionId}`);
                    labelBlock.lastChild.querySelector(`input[type="text"]`).value = label;
                });
            }

            // Populate logic
            if (question.logic.enabled) {
                questionBlock.querySelector(`#logic${question.questionId}`).checked = true;
                toggleLogic(question.questionId);
                questionBlock.querySelector(`#prevQuestion${question.questionId}`).value = question.logic.prevQuestion;
                questionBlock.querySelector(`#prevAnswer${question.questionId}`).value = question.logic.prevAnswer;
            }

            // Populate jump logic
            if (question.jump.enabled) {
                questionBlock.querySelector(`#enableJump${question.questionId}`).checked = true;
                toggleJumpLogic(question.questionId);
                questionBlock.querySelector(`#jumpOption${question.questionId}`).value = question.jump.option;
                questionBlock.querySelector(`#jumpTo${question.questionId}`).value = question.jump.to;
            }
        });
    });
}


