function generateAndDownloadForm() {
    let formHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Custom Form</title>
        <link rel="stylesheet" href="new.css">
        <style>
            .section { display: none; }
            .section.active { display: block; }
            .thank-you-message { display: none; font-size: 20px; font-weight: bold; text-align: center; margin-top: 20px; }
            .hidden { display: none; }
            
			
			
			.checkbox-label, noneApplyCheckbox {
		width: fit-content;
        font-size: 18px; /* Increase font size as needed */
        display: block;
        text-align: left;
        margin: 0 auto;
        cursor: pointer; /* Changes cursor to pointer when hovering over the label */
    }
	
	
        </style>
    </head>
    <body>
    
    <header>
        <img src="logo.png" alt="FormWiz Logo" width="130" height="80" onclick="location.href='index.html';">
        <nav>
            <a href="index.html">Home</a>
            <a href="forms.html">Forms</a>
            <a href="contact.html">Contact Us</a>
        </nav>
    </header>
    
    <section>
    <div id="box">
        <form id="customForm" onsubmit="return showThankYouMessage();">
    `;

    for (let s = 1; s < sectionCounter; s++) {
        const sectionBlock = document.getElementById(`sectionBlock${s}`);
        if (!sectionBlock) continue;

        formHTML += `<div id="section${s}" class="section${s === 1 ? ' active' : ''}">`;
        formHTML += `<h2>Section ${s}</h2>`;

        const questionsSection = sectionBlock.querySelectorAll('.question-block');
        questionsSection.forEach((questionBlock) => {
            const questionId = questionBlock.id.replace('questionBlock', '');
            const questionText = questionBlock.querySelector(`input[type="text"]`).value;
            const questionType = questionBlock.querySelector(`select`).value;
            const logicEnabled = questionBlock.querySelector(`#logic${questionId}`).checked;
            const prevQuestionId = questionBlock.querySelector(`#prevQuestion${questionId}`).value;
            const prevAnswer = questionBlock.querySelector(`#prevAnswer${questionId}`).value;
            const jumpEnabled = questionBlock.querySelector(`#enableJump${questionId}`).checked;
            const jumpTo = questionBlock.querySelector(`#jumpTo${questionId}`).value;
            const jumpOption = questionBlock.querySelector(`#jumpOption${questionId}`).value;

            formHTML += `<div id="question-container-${questionId}" ${logicEnabled ? 'class="hidden"' : ''}>`;
            formHTML += `<label>${questionText}</label><br>`;

            // Handle the different question types
            if (questionType === 'text') {
                formHTML += `<input type="text" id="answer${questionId}"><br><br>`;
            } else if (questionType === 'radio') {
                formHTML += `
                    <select id="answer${questionId}">
                        <option value="" disabled selected>Select an option</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select><br><br>`;
            } else if (questionType === 'dropdown') {
                formHTML += `<select id="answer${questionId}">`;
                formHTML += `<option value="" disabled selected>Select an option</option>`;
                const options = questionBlock.querySelectorAll(`#dropdownOptions${questionId} input`);
                options.forEach(option => {
                    formHTML += `<option value="${option.value}">${option.value}</option>`;
                });
                formHTML += `</select><br><br>`;
            } else if (questionType === 'checkbox') {
                const options = questionBlock.querySelectorAll(`#checkboxOptions${questionId} input`);
                formHTML += `<label class="checkbox-label"><div class="checkbox-container">`; // Add consistent indent
                options.forEach((option, index) => {
                    formHTML += `<input type="checkbox" id="answer${questionId}_${index + 1}" name="answer${questionId}" value="${option.value}"> ${option.value}<br>`;
                });

                const noneOfTheAboveSelected = document.getElementById(`noneOfTheAbove${questionId}`).checked;
                if (noneOfTheAboveSelected) {
                    formHTML += `<input type="checkbox" id="answer${questionId}_none" name="answer${questionId}" value="None of the above"> None of the above<br>`;
                }
                formHTML += `</div></div><br>`; // Close checkbox container
            } else if (questionType === 'numberedDropdown') {
                const rangeStart = questionBlock.querySelector(`#numberRangeStart${questionId}`).value;
                const rangeEnd = questionBlock.querySelector(`#numberRangeEnd${questionId}`).value;
                const labels = questionBlock.querySelectorAll(`#textboxLabels${questionId} input`);

                formHTML += `<select id="answer${questionId}" onchange="showTextboxLabels(${questionId}, this.value, ${rangeStart}, ${rangeEnd})">`;
                formHTML += `<option value="" disabled selected>Select an option</option>`;
                for (let i = rangeStart; i <= rangeEnd; i++) {
                    formHTML += `<option value="${i}">${i}</option>`;
                }
                formHTML += `</select><br><br>`;

                formHTML += `<div id="labelContainer${questionId}"></div>`;

                formHTML += `<script>
                    function showTextboxLabels(questionId, count, rangeStart, rangeEnd) {
                        const container = document.getElementById('labelContainer' + questionId);
                        container.innerHTML = '';
                        for (let i = 1; i <= count; i++) {
                            ${Array.from(labels).map(label => `
                                container.innerHTML += '<label>${label.value} ' + i + ':</label><input type="text" id="label' + questionId + '_' + i + '${label.value.replace(/\\s+/g, '')}"><br>';
                            `).join('')}
                        }
                    }
                <\/script>`;
            } else if (questionType === 'multipleTextboxes') {
                const multipleTextboxesOptionsDiv = questionBlock.querySelectorAll(`#multipleTextboxesOptions${questionId} input`);
                multipleTextboxesOptionsDiv.forEach((input, index) => {
                    const labelText = input.value;
                    // Use placeholder and center the text
                    formHTML += `<input type="text" id="answer${questionId}_${index + 1}" placeholder="${labelText}" style="text-align:center;"><br><br>`;
                });
            }

            formHTML += `</div>`; // Close question container

            // Conditional Logic Script for Yes/No Questions
            if (logicEnabled && prevQuestionId) {
                formHTML += `
                <script>
                    document.getElementById('answer${prevQuestionId}').addEventListener('change', function() {
                        const questionElement = document.getElementById('question-container-${questionId}');
                        if (this.value === '${prevAnswer}') {
                            questionElement.classList.remove('hidden');
                        } else {
                            questionElement.classList.add('hidden');
                        }
                    });
                <\/script>`;
            }

            // Jump Logic Scripts
            if (jumpEnabled && jumpTo) {
                if (questionType === 'radio' || questionType === 'dropdown') {
                    formHTML += `
                    <script>
                        document.getElementById('answer${questionId}').addEventListener('change', function() {
                            if (this.value === '${jumpOption}') {
                                jumpTarget = '${jumpTo}';
                            } else {
                                jumpTarget = null;
                            }
                        });
                    <\/script>`;
                } else if (questionType === 'checkbox') {
                    formHTML += `
                    <script>
                        document.querySelectorAll('input[name="answer${questionId}"]').forEach(checkbox => {
                            checkbox.addEventListener('change', function() {
                                const checkedOptions = Array.from(document.querySelectorAll('input[name="answer${questionId}"]:checked')).map(c => c.value);
                                if (checkedOptions.includes('${jumpOption}')) {
                                    jumpTarget = '${jumpTo}';
                                } else {
                                    jumpTarget = null;
                                }
                            });
                        });
                    <\/script>`;
                }
            }
        });

        // Add navigation buttons for each section
        formHTML += `
        <div class="navigation-buttons">`;

        if (s > 1) {
            formHTML += `<button type="button" onclick="navigateSection(${s - 1})">Back</button>`;
        }

        // Check if it's the last section
        if (s === sectionCounter - 1) {
            formHTML += `<button type="submit">Submit</button>`;
        } else {
            formHTML += `<button type="button" onclick="handleNext(${s})">Next</button>`;
        }

        formHTML += `</div>`; // Close navigation-buttons div

        formHTML += `</div>`; // Close section div
    }

    formHTML += `
        </form>
        <div id="thankYouMessage" class="thank-you-message">Thank you for completing the survey</div>
    </section>
    </div>
    <footer>
        &copy; 2024 FormWiz. All rights reserved.
    </footer>

    <script>
        let jumpTarget = null;

        function handleNext(currentSection) {
            if (jumpTarget === 'end') {
                document.getElementById('customForm').style.display = 'none';
                document.getElementById('thankYouMessage').style.display = 'block';
            } else if (jumpTarget) {
                navigateSection(jumpTarget);
            } else {
                navigateSection(currentSection + 1);
            }
            jumpTarget = null; // Reset jumpTarget after navigating
        }

        function navigateSection(sectionNumber) {
            const sections = document.querySelectorAll('.section');
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById('section' + sectionNumber).classList.add('active');
        }

        function showThankYouMessage() {
            document.getElementById('customForm').style.display = 'none';
            document.getElementById('thankYouMessage').style.display = 'block';
            return false; // Prevent actual form submission
        }
    <\/script>
    </body>
    </html>
    `;

    downloadHTML(formHTML, "custom_form.html");
}
