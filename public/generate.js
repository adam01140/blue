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
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select><br><br>`;
            } else if (questionType === 'dropdown') {
                formHTML += `<select id="answer${questionId}">`;
                const options = questionBlock.querySelectorAll(`#dropdownOptions${questionId} input`);
                options.forEach(option => {
                    formHTML += `<option value="${option.value}">${option.value}</option>`;
                });
                formHTML += `</select><br><br>`;
            } else if (questionType === 'checkbox') {
                const options = questionBlock.querySelectorAll(`#checkboxOptions${questionId} input`);
                options.forEach((option, index) => {
                    formHTML += `<input type="checkbox" id="answer${questionId}_${index + 1}" name="answer${questionId}" value="${option.value}"> ${option.value}<br>`;
                });

                const noneOfTheAboveSelected = document.getElementById(`noneOfTheAbove${questionId}`).checked;
                if (noneOfTheAboveSelected) {
                    formHTML += `<input type="checkbox" id="answer${questionId}_none" name="answer${questionId}" value="None of the above"> None of the above<br>`;
                }

                formHTML += `<br>`;
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
                </script>`;
            }

            // Jump Logic Script if enabled
            if (jumpEnabled && jumpTo) {
                formHTML += `
                <script>
                    document.getElementById('answer${questionId}').addEventListener('change', function() {
                        if (this.value === '${jumpOption}') {
                            jumpTarget = '${jumpTo}';
                        } else {
                            jumpTarget = null; // Reset jumpTarget if no option is selected
                        }
                    });
                </script>`;
            }
        });

        // Add navigation buttons for each section
        formHTML += `
        <div class="navigation-buttons">`;

        if (s > 1) {
            formHTML += `<button type="button" onclick="navigateSection(${s - 1})">Back</button>`;
        }

        formHTML += `<button type="button" onclick="handleNext(${s})">Next</button>`;

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
    </script>
    </body>
    </html>
    `;

    downloadHTML(formHTML, "custom_form.html");
}
