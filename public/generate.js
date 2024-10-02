function generateAndDownloadForm() {
    let formHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Custom Form</title>
        <style>
		
	input[type="text"], select {
    background-color: #e6f4ff; /* Light blue background */
    border: 2px solid #2980b9; /* Matching border color */
    border-radius: 10px; /* Rounded borders */
    padding: 8px; /* Padding inside the input */
    box-sizing: border-box; /* Include padding and border in the width */
    transition: border-color 0.3s ease; /* Smooth transition for border color */
}

/* Center the placeholder text */
input[type="text"]::placeholder, input[type="email"]::placeholder {
    text-align: center;
}


input[type="text"]:focus, select:focus {
    border-color: #1c598a; /* Darker blue when focused */
    outline: none; /* Removes the default focus outline */
}

        html, body {
            height: 100%;
            margin: 0;
            display: flex;
            flex-direction: column;
            font-family: 'Montserrat', sans-serif;
            color: #333;
            background-color: #f4f4f4;
        }
        header {
            background-color: #2c3e50;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: relative;
        }
		
		#box {
    border: 4px solid lightblue;
    border-color: #2c3e50;
    border-radius: 10px;
    padding: 20px;
    padding-bottom: 70px; /* Increase bottom padding to make space for buttons */
    margin: 50px;
    background-color: #ffffff;
    width: auto;
    height: auto; /* Allow the div to grow with its content */

    position: relative;
	
		}
		
		  .section { display: none; }
            .section.active { display: block; }
            .thank-you-message { display: none; font-size: 20px; font-weight: bold; text-align: center; margin-top: 20px; }
			
			
			
        header img {
            cursor: pointer;
        }
        nav {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 15px;
        }
        nav a {
            color: #ffffff;
            text-decoration: none;
            font-weight: bold;
            transition: color 0.3s ease;
        }
        nav a:hover {
            color: #2980b9;
        }
        section {
            padding: 50px;
            text-align: center;
            flex: 1;
            display: grid;
            gap: 20px;
        }
        section h1 {
            color: #2980b9;
            font-weight: normal;
        }
        section p {
            margin-bottom: 20px;
        }
       /* Apply button style globally to all button elements */
button {
    background-color: #2980b9;
    color: #ffffff;
    padding: 5px 30px;
    text-decoration: none;
    font-weight: bold;
    border-radius: 5px;
    transition: background-color 0.3s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: fit-content;
    margin: 0 auto;
}

/* Hover effect for all buttons */
button:hover {
    background-color: #1c598a;
}

		
        .steps {
            display: grid;
            grid-template-columns: repeat(3, minmax(150px, 1fr));
            justify-items: center;
            gap: 10px;
            max-width: 800px; /* Adjust the max-width to bring them closer */
            margin: 0 auto; /* Center the steps container */
        }
        .step {
            text-align: center;
        }
		
        footer {
            text-align: center;
            padding: 20px;
            background-color: #2c3e50;
            color: white;
        }
		
		.section {
                display: none;
            }
            .section.active {
                display: block;
            }
            .thank-you-message {
                display: none;
                font-size: 20px;
                font-weight: bold;
                text-align: center;
                margin-top: 20px;
            }
			
			
			
			
			
        /* Media query for smaller screens */
        @media (max-width: 768px) {
            header {
                flex-direction: column;
                padding: 10px;
            }
            nav {
                position: static;
                transform: none;
                margin-top: 10px;
            }
            .steps {
                grid-template-columns: 1fr;
                max-width: 100%; /* Full width on smaller screens */
            }
        }
		
		
		
		<style>
        <style>
            .section { display: none; }
            .section.active { display: block; }
            .thank-you-message { display: none; font-size: 20px; font-weight: bold; text-align: center; margin-top: 20px; }
            .hidden { display: none; }
           
            #checkmark {
                width: fit-content;
            }
    
            .checkbox-label, .noneApplyCheckbox {
                font-size: 18px;
                display: block;
                text-align: left;
                margin: 0 auto;
                cursor: pointer;
            }
			
			
			input[type="text"],
input[type="number"],
textarea,
select {
    background-color: #e6f4ff; /* Light blue background */
    border: 2px solid #2980b9; /* Matching border color */
    border-radius: 10px; /* Rounded borders */
    padding: 8px; /* Padding inside the input */
    box-sizing: border-box; /* Include padding and border in the width */
    transition: border-color 0.3s ease; /* Smooth transition for border color */
}

input[type="text"]:focus,
input[type="number"]:focus,
textarea:focus,
select:focus {
    border-color: #1c598a; /* Darker blue when focused */
    outline: none; /* Removes the default focus outline */
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
	
	<div id="pdfPreview" style="display:none;">
    <iframe id="pdfFrame" style = "display:none"></iframe>
</div>	
<input type="text" id="current_date" name="current_date" placeholder="current_date" style="display:none">	
<script src="https://mozilla.github.io/pdf.js/build/pdf.js"></script>

<div id="questions">
<div id="result"></div>
    <section>
	

    <div id="box">
        <form id="customForm" onsubmit="return showThankYouMessage();">
    `;

    for (let s = 1; s < sectionCounter; s++) {
        const sectionBlock = document.getElementById(`sectionBlock${s}`);
    if (!sectionBlock) continue;

    const sectionNameInput = sectionBlock.querySelector(`#sectionName${s}`);
    const sectionName = sectionNameInput ? sectionNameInput.value : `Section ${s}`;

    formHTML += `<div id="section${s}" class="section${s === 1 ? ' active' : ''}">`;
    formHTML += `<h2>${sectionName}</h2>`;

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
            formHTML += `<label><h3>${questionText}</h3></label>`;

            // Handle the different question types
            if (questionType === 'text') {
                const nameId = questionBlock.querySelector(`#textboxName${questionId}`).value || `answer${questionId}`;
                const placeholder = questionBlock.querySelector(`#textboxPlaceholder${questionId}`).value || '';
                formHTML += `<input type="text" id="${nameId}" name="${nameId}" placeholder="${placeholder}"><br><br>`;
            } else if (questionType === 'bigParagraph') {
                const nameId = questionBlock.querySelector(`#textboxName${questionId}`).value || `answer${questionId}`;
                const placeholder = questionBlock.querySelector(`#textboxPlaceholder${questionId}`).value || '';
                formHTML += `<textarea id="${nameId}" name="${nameId}" rows="5" cols="50" placeholder="${placeholder}"></textarea><br>`;
            } else if (questionType === 'radio') {
                formHTML += `
                    <select id="answer${questionId}">
                        <option value="" disabled selected>Select an option</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select><br>`;
            } else if (questionType === 'dropdown') {
                formHTML += `<select id="answer${questionId}">`;
                formHTML += `<option value="" disabled selected>Select an option</option>`;
                const options = questionBlock.querySelectorAll(`#dropdownOptions${questionId} input`);
                options.forEach(option => {
                    formHTML += `<option value="${option.value}">${option.value}</option>`;
                });
                formHTML += `</select><br>`;
            } else if (questionType === 'checkbox') {
    const optionsDivs = questionBlock.querySelectorAll(`#checkboxOptions${questionId} > div`);
    formHTML += `<div><center><div id="checkmark">`;
    optionsDivs.forEach((optionDiv, index) => {
        const optionTextInput = optionDiv.querySelector(`#checkboxOptionText${questionId}_${index + 1}`);
        const optionNameInput = optionDiv.querySelector(`#checkboxOptionName${questionId}_${index + 1}`);
        const optionValueInput = optionDiv.querySelector(`#checkboxOptionValue${questionId}_${index + 1}`);

        const optionText = optionTextInput ? optionTextInput.value.trim() : `Option ${index + 1}`;
        const optionNameId = optionNameInput ? optionNameInput.value.trim() : `answer${questionId}_${index + 1}`;
        const optionValue = optionValueInput ? optionValueInput.value.trim() : optionText;

        formHTML += `
            <span class="checkbox-inline">
                <label class="checkbox-label">
                    <input type="checkbox" id="${optionNameId}" name="${optionNameId}" value="${optionValue}">
                    ${optionText}
                </label>
            </span>`;
    });

    const noneOfTheAboveSelected = questionBlock.querySelector(`#noneOfTheAbove${questionId}`).checked;
    if (noneOfTheAboveSelected) {
        formHTML += `
            <span class="checkbox-inline">
                <label class="checkbox-label">
                    <input type="checkbox" id="answer${questionId}_none" name="answer${questionId}_none" value="None of the above">
                    None of the above
                </label>
            </span>`;
    }
    formHTML += `</div><br></div>`;
}
else if (questionType === 'numberedDropdown') {
    const rangeStart = questionBlock.querySelector(`#numberRangeStart${questionId}`).value;
    const rangeEnd = questionBlock.querySelector(`#numberRangeEnd${questionId}`).value;
    const labels = questionBlock.querySelectorAll(`#textboxLabels${questionId} input`);

    // Extract label values
    const labelValues = Array.from(labels).map(label => label.value);

    formHTML += `<select id="answer${questionId}" onchange="showTextboxLabels(${questionId}, this.value)">
                    <option value="" disabled selected>Select an option</option>`;
    for (let i = rangeStart; i <= rangeEnd; i++) {
        formHTML += `<option value="${i}">${i}</option>`;
    }
    formHTML += `</select><br>`;

    formHTML += `<div id="labelContainer${questionId}"></div>`;

    // Include the labels in the script
    formHTML += `<script>
        var labels${questionId} = ${JSON.stringify(labelValues)};
        function showTextboxLabels(questionId, count) {
            const container = document.getElementById('labelContainer' + questionId);
            container.innerHTML = '';
            for (let j = 1; j <= count; j++) {
                labels${questionId}.forEach(function(label) {
                    // Create unique ID for each input
                    const inputId = 'label' + questionId + '_' + j + '_' + label.replace(/\\s+/g, '');
                    container.innerHTML += '<input type="text" id="' + inputId + '" name="' + inputId + '" placeholder="' + label + '" style="text-align:center;"><br>';
                });
            }
        }
    <\/script>`;
}


 else if (questionType === 'multipleTextboxes') {
    const multipleTextboxesOptionsDiv = questionBlock.querySelectorAll(`#multipleTextboxesOptions${questionId} > div`);
    multipleTextboxesOptionsDiv.forEach((optionDiv, index) => {
        const labelInput = optionDiv.querySelector(`#multipleTextboxLabel${questionId}_${index + 1}`);
        const nameIdInput = optionDiv.querySelector(`#multipleTextboxName${questionId}_${index + 1}`);
        const placeholderInput = optionDiv.querySelector(`#multipleTextboxPlaceholder${questionId}_${index + 1}`);

        const labelText = labelInput.value.trim(); // Do not assign default label
        const nameId = nameIdInput.value || `answer${questionId}_${index + 1}`;
        const placeholder = placeholderInput.value || '';

        if (labelText) {
            formHTML += `<label><h3>${labelText}</h3></label><br>`;
        }
        formHTML += `<input type="text" id="${nameId}" name="${nameId}" placeholder="${placeholder}" style="text-align:center;"><br>`;
    });
} else if (questionType === 'money') {
                formHTML += `<input type="number" id="answer${questionId}" min="0" step="0.01" placeholder="Enter amount"><br>`;
            } else if (questionType === 'date') {
                formHTML += `<input type="date" id="answer${questionId}" placeholder="Enter a date"><br>`;
            }

            formHTML += `</div>`; // Close question container

            // Conditional Logic Script
            if (logicEnabled && prevQuestionId && prevAnswer) {
                formHTML += `
                <script>
                    document.getElementById('answer${prevQuestionId}').addEventListener('change', function() {
                        const questionElement = document.getElementById('question-container-${questionId}');
                        const selectedAnswer = this.value;
                        if (selectedAnswer.trim().toLowerCase() === '${prevAnswer.trim().toLowerCase()}') {
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
        <br><br><div class="navigation-buttons">`;

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

    // Get the hidden fields HTML and the autofill mappings
    const { hiddenFieldsHTML, autofillMappings, conditionalAutofillLogic } = generateHiddenPDFFields();

    // Add the hidden PDF fields to the formHTML
    formHTML += hiddenFieldsHTML;

    formHTML += `
        </form>
        <div id="thankYouMessage" class="thank-you-message">Thank you for completing the survey</div>
    </section>
    </div>
	</div>
    <footer>
        &copy; 2024 FormWiz. All rights reserved.
    </footer>

    <script>
	
	
	function setCookie(name, value, days) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    }

    function getCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    function saveFormInputs() {
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], select');
        inputs.forEach(input => {
            setCookie(input.name, input.value, 7);
        });
    }

    function loadSavedInputs() {
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], select');
        inputs.forEach(input => {
            const savedValue = getCookie(input.name);
            if (savedValue) {
                input.value = savedValue;
            }
        });
    }

    document.addEventListener('DOMContentLoaded', (event) => {
        loadSavedInputs();

        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], select');
        inputs.forEach(input => {
            input.addEventListener('input', saveFormInputs);
        });
    });
	
	
        let jumpTarget = null;
        const autofillMappings = ${JSON.stringify(autofillMappings)};



		
	
       
            // Select all textboxes and checkboxes
            const inputs = document.querySelectorAll('input[type="text"], input[type="checkbox"]');
            // Create an array to store the IDs
            let ids = [];
            // Iterate through each input and push its ID to the array
            inputs.forEach(input => {
                ids.push(input.id);
            });
            // Join all IDs into one big paragraph and alert
            //alert('IDs of all inputs: ' + ids.join(', '));
       
	   
	   
        function handleNext(currentSection) {
            // Autofill hidden fields before navigating
            autofillMappings.forEach(mapping => {
                const sourceElement = document.getElementById(mapping.questionAnswerId);
                const targetElement = document.getElementById(mapping.hiddenFieldName);
                if (sourceElement && targetElement) {
                    targetElement.value = sourceElement.value || '';
                }
            });

            // Execute conditional autofill logic
            ${conditionalAutofillLogic}

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
		
		
		let uploadedPdfFile = null;

function downloadPDF() {
    var iframe = document.getElementById('pdfFrame');
    var url = iframe.src;
    var downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = "ModifiedDocument.pdf";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

function loadDefaultPDF() {
    const defaultUrl = 'http://localhost:3000/sc100.pdf';
    fetch(defaultUrl)
        .then(response => response.blob())
        .then(blob => {
            uploadedPdfFile = blob;
            displayPDF(blob);
        })
        .catch(error => {
            console.error('Error loading default PDF:', error);
           //alert('Error loading default PDF: ' + error.message);
        });
}

function displayPDF(pdfBlob) {
    var url = URL.createObjectURL(pdfBlob);
    document.getElementById('pdfFrame').src = url;
    //document.getElementById('pdfPreview').style.display = 'block';
}


var formData = new FormData();

//edit pdf code
async function editPDF() {
    
	
	formData = new FormData(); // Reset formData for fresh use each time the function is called.

    if (!uploadedPdfFile) {
        //alert('No PDF file is loaded for editing. Please upload the file again.');
        return;
    }

    // Collect inputs from the form
    const inputs = document.querySelectorAll('#questions input, #questions select');
    inputs.forEach(input => {
        if (input.type === 'checkbox') {
            formData.append(input.name, input.checked ? 'Yes' : 'No');
        } else {
            formData.append(input.name, input.value);
        }
    });
	
	
	
	
    // Append the PDF file to formData
    formData.append('pdf', uploadedPdfFile);

    // Debugging: Log the form data
    console.log('FormData contents:');

    // Send the formData to the server
    fetch('/edit_pdf', {
        method: 'POST',
        body: formData,
    })
    .then(response => {
        
        return response.blob();
    })
    .then(blob => {
        var url = window.URL.createObjectURL(blob);
        document.getElementById('pdfFrame').src = url;
        //document.getElementById('pdfPreview').style.display = 'block';
        downloadPDF();
    })
    .catch(error => {
        console.error('Error updating PDF:', error);
        //alert('Error updating PDF: ' + error.message);
    });
}


function setCurrentDate() {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();
    today = yyyy + '-' + mm + '-' + dd;
    document.getElementById('current_date').value = today;
}


window.onload = function() {
    loadDefaultPDF();
    setCurrentDate();
};


        function showThankYouMessage() {
			
			editPDF();
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

