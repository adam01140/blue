
function addConditionalAutofillForCheckbox(hiddenFieldId) {
    const conditionalAutofillDiv = document.getElementById(`conditionalAutofillForCheckbox${hiddenFieldId}`);
    const conditionId = conditionalAutofillDiv.children.length + 1;

    const conditionDiv = document.createElement('div');
    conditionDiv.className = `condition${conditionId}`;
    conditionDiv.innerHTML = `
        <label>Condition ${conditionId}:</label><br>
        <label>Question:</label>
        <select id="conditionQuestion${hiddenFieldId}_${conditionId}" onchange="updateConditionAnswers(${hiddenFieldId}, ${conditionId})" style="width: 300px;">
            <option value="">-- Select a question --</option>
            ${generateAllQuestionOptions()}
        </select><br>
        <label>Answer:</label>
        <select id="conditionAnswer${hiddenFieldId}_${conditionId}" style="width: 300px;">
            <option value="">-- Select an answer --</option>
        </select><br>
        <label>Value:</label>
        <select id="conditionValue${hiddenFieldId}_${conditionId}" style="width: 300px;">
            <option value="checked">Checked</option>
            <option value="unchecked">Unchecked</option>
        </select><br>
        <button type="button" onclick="removeConditionalAutofill(${hiddenFieldId}, ${conditionId})">Remove Condition</button>
        <hr>
    `;
    conditionalAutofillDiv.appendChild(conditionDiv);
}