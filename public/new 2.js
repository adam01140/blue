function addQuestion(sectionId) {
    const questionsSection = document.getElementById(`questionsSection${sectionId}`);
    const questionBlock = document.createElement('div');
    questionBlock.className = 'question-block';
    questionBlock.id = `questionBlock${globalQuestionCounter}`;
    questionBlock.innerHTML = `
        <label>Question ${globalQuestionCounter}: </label>
        <input type="text" placeholder="Enter your question" id="question${globalQuestionCounter}"><br><br>
        
        <label>Question Type: </label>
        <select id="questionType${globalQuestionCounter}" onchange="toggleOptions(${globalQuestionCounter})">
            <option value="text">Text</option>
            <option value="radio">Yes/No</option>
            <option value="dropdown">Dropdown</option>
            <option value="checkbox">Checkbox</option>
            <option value="numberedDropdown">Numbered Dropdown</option>
            <option value="address">Address</option>
        </select><br><br>

        <div id="optionsBlock${globalQuestionCounter}" class="dropdown-options" style="display: none;">
            <label>Options: </label>
            <div id="dropdownOptions${globalQuestionCounter}"></div>
            <button type="button" onclick="addDropdownOption(${globalQuestionCounter})">Add Option</button>
        </div><br>

        <div id="checkboxBlock${globalQuestionCounter}" class="checkbox-options" style="display: none;">
            <label>Checkbox Options: </label>
            <div id="checkboxOptions${globalQuestionCounter}"></div>
            <button type="button" onclick="addCheckboxOption(${globalQuestionCounter})">Add Option</button>
        </div><br>

        <div id="jumpLogicContainer${globalQuestionCounter}">
            <label>Jump Logic: </label><br>
            <input type="checkbox" id="enableJump${globalQuestionCounter}" onchange="toggleJumpLogic(${globalQuestionCounter})">
            <label for="enableJump${globalQuestionCounter}">Enable Jump Logic</label><br><br>
            <div id="jumpBlock${globalQuestionCounter}" style="display: none;">
                <label>Select the option that triggers the jump:</label><br>
                <select id="jumpOption${globalQuestionCounter}">
                    <!-- Options will be populated dynamically based on the question type -->
                </select><br><br>
                <label>Jump to (enter section number or 'end'):</label><br>
                <input type="text" placeholder="Section number or 'end'" id="jumpTo${globalQuestionCounter}"><br>
            </div>
        </div><br>

        <button type="button" onclick="removeQuestion(${sectionId}, ${globalQuestionCounter})">Remove Question</button>
    `;
    questionsSection.appendChild(questionBlock);
    globalQuestionCounter++;
    questionCounter++;

    updateQuestionNumbers();
}
