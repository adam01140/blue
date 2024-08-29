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

            if (questionType === 'dropdown' || questionType === 'checkbox') {
                const options = questionBlock.querySelectorAll(questionType === 'dropdown' ? `#dropdownOptions${questionId} input` : `#checkboxOptions${questionId} input`);
                options.forEach(option => {
                    questionData.options.push(option.value);
                });
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

    // Set counters from the imported data
    sectionCounter = formData.sectionCounter;
    questionCounter = formData.questionCounter;

    formData.sections.forEach(section => {
        addSection(section.sectionId);
        section.questions.forEach(question => {
            addQuestion(section.sectionId, question.questionId);
            const questionBlock = document.getElementById(`questionBlock${question.questionId}`);
            questionBlock.querySelector(`input[type="text"]`).value = question.text;
            questionBlock.querySelector(`select`).value = question.type;
            toggleOptions(question.questionId); // Ensure correct options are shown

            // Populate logic and jump logic as required
            if (question.logic.enabled) {
                const logicCheckbox = questionBlock.querySelector(`#logic${question.questionId}`);
                logicCheckbox.checked = true;
                toggleLogic(question.questionId);
            }

            if (question.jump.enabled) {
                const jumpCheckbox = questionBlock.querySelector(`#enableJump${question.questionId}`);
                jumpCheckbox.checked = true;
                toggleJumpLogic(question.questionId);
            }
        });
    });
}



