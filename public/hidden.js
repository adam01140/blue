/************************************************
 * hidden.js - Full version supporting multi-term 
 * equations for hidden checkbox calculations:
 *   If [Q1] + [Q2] - [Q3] x [Q4] / [Q5] ... = threshold
 ************************************************/

/**
 * Initializes the hidden PDF fields module on page load
 * (Inserts 'Add Hidden Field' button so user can do so from scratch).
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeHiddenPDFFieldsModule();
});

/** 
 * Creates a container for hidden fields, plus 'Add Hidden Field' button.
 */
function initializeHiddenPDFFieldsModule() {
    var formBuilder = document.getElementById('formBuilder');
    if (!formBuilder) return;

    var hiddenFieldsModule = document.createElement('div');
    hiddenFieldsModule.id = 'hiddenFieldsModule';
    hiddenFieldsModule.innerHTML = `
        <h2>Form Editor</h2>
        <div id="hiddenFieldsContainer"></div>
        <button type="button" onclick="addHiddenField()">Add Hidden Field</button>
        <hr>
    `;
    formBuilder.appendChild(hiddenFieldsModule);
}

var hiddenFieldCounter = 1; // Keep track globally

/**
 * Adds a new empty hidden field block to the #hiddenFieldsContainer
 */
function addHiddenField() {
    var hiddenFieldsContainer = document.getElementById('hiddenFieldsContainer');
    if(!hiddenFieldsContainer) return;

    var currentHiddenFieldId = hiddenFieldCounter;
    hiddenFieldCounter++;

    var hiddenFieldBlock = document.createElement('div');
    hiddenFieldBlock.className = 'hidden-field-block';
    hiddenFieldBlock.id = 'hiddenFieldBlock' + currentHiddenFieldId;

    hiddenFieldBlock.innerHTML = `
        <label>Hidden Field ${currentHiddenFieldId}: </label>
        <select id="hiddenFieldType${currentHiddenFieldId}" onchange="toggleHiddenFieldOptions(${currentHiddenFieldId})">
            <option value="text">Textbox</option>
            <option value="checkbox">Checkbox</option>
        </select><br><br>
        <div id="hiddenFieldOptions${currentHiddenFieldId}">
            <!-- Options populated by toggleHiddenFieldOptions(...) -->
        </div>
        <button type="button" onclick="removeHiddenField(${currentHiddenFieldId})">Remove Hidden Field</button>
        <hr>
    `;

    hiddenFieldsContainer.appendChild(hiddenFieldBlock);
    toggleHiddenFieldOptions(currentHiddenFieldId);
}

/**
 * Removes a hidden field block by ID
 */
function removeHiddenField(hiddenFieldId) {
    var block = document.getElementById('hiddenFieldBlock' + hiddenFieldId);
    if(block) block.remove();
}

/**
 * Toggles sub-options for a hidden field based on text vs. checkbox
 */
function toggleHiddenFieldOptions(hiddenFieldId) {
    var fieldType = document.getElementById('hiddenFieldType' + hiddenFieldId).value;
    var optsDiv = document.getElementById('hiddenFieldOptions' + hiddenFieldId);

    optsDiv.innerHTML = '';

    if(fieldType === 'text') {
        optsDiv.innerHTML = `
            <label>Name/ID: </label>
            <input type="text" id="hiddenFieldName${hiddenFieldId}" placeholder="Enter field name"><br><br>
            <label>Autofill from question:</label><br>
            <select id="hiddenFieldAutofill${hiddenFieldId}" style="width:300px;">
                <option value="">-- Select a question --</option>
                ${generateQuestionOptions()}
            </select><br><br>
            <label>Conditional Autofill Logic:</label><br>
            <div id="conditionalAutofill${hiddenFieldId}"></div>
            <button type="button" onclick="addConditionalAutofill(${hiddenFieldId})">Add Conditional Logic</button><br><br>
        `;
    }
    else if(fieldType === 'checkbox') {
        optsDiv.innerHTML = `
            <label>Name/ID: </label>
            <input type="text" id="hiddenFieldName${hiddenFieldId}" placeholder="Enter field name"><br><br>

            <!-- Multi-term Calculation -->
            <button type="button" onclick="addCalculationForCheckbox(${hiddenFieldId})">Add Calculation</button>
            <div id="calculationBlock${hiddenFieldId}"></div><br>

            <label>Checked by default:</label>
            <input type="checkbox" id="hiddenFieldChecked${hiddenFieldId}"><br><br>

            <label>Conditional Autofill Logic:</label><br>
            <div id="conditionalAutofillForCheckbox${hiddenFieldId}"></div>
            <button type="button" onclick="addConditionalAutofillForCheckbox(${hiddenFieldId})">Add Conditional Logic</button><br><br>
        `;
    }
}

/**
 * If JSON is loaded, we call addHiddenFieldWithData(...) 
 * to re-insert hidden fields with their existing logic
 */
function addHiddenFieldWithData(hiddenField) {
    var hiddenFieldsContainer = document.getElementById('hiddenFieldsContainer');
    var currentHiddenFieldId = hiddenField.hiddenFieldId;

    var block = document.createElement('div');
    block.className = 'hidden-field-block';
    block.id = 'hiddenFieldBlock' + currentHiddenFieldId;

    block.innerHTML = `
        <label>Hidden Field ${currentHiddenFieldId}: </label>
        <select id="hiddenFieldType${currentHiddenFieldId}" onchange="toggleHiddenFieldOptions(${currentHiddenFieldId})">
            <option value="text" ${hiddenField.type === 'text' ? 'selected' : ''}>Textbox</option>
            <option value="checkbox" ${hiddenField.type === 'checkbox' ? 'selected' : ''}>Checkbox</option>
        </select><br><br>
        <div id="hiddenFieldOptions${currentHiddenFieldId}">
        </div>
        <button type="button" onclick="removeHiddenField(${currentHiddenFieldId})">Remove Hidden Field</button>
        <hr>
    `;
    hiddenFieldsContainer.appendChild(block);

    // Force the sub-options to appear
    toggleHiddenFieldOptions(currentHiddenFieldId);

    // Fill the name
    var nmInput = document.getElementById('hiddenFieldName' + currentHiddenFieldId);
    if(nmInput) nmInput.value = hiddenField.name || '';

    if(hiddenField.type === 'checkbox') {
        var checkEl = document.getElementById('hiddenFieldChecked' + currentHiddenFieldId);
        if(checkEl) checkEl.checked = !!hiddenField.checked;

        // Conditions
        if(hiddenField.conditions && hiddenField.conditions.length > 0) {
            for(var cIdx=0; cIdx<hiddenField.conditions.length; cIdx++){
                addConditionalAutofillForCheckbox(currentHiddenFieldId);
                var cond = hiddenField.conditions[cIdx];
                var condId = cIdx + 1;
                var qSel = document.getElementById('conditionQuestion' + currentHiddenFieldId + '_' + condId);
                var ansSel = document.getElementById('conditionAnswer' + currentHiddenFieldId + '_' + condId);
                var valSel = document.getElementById('conditionValue' + currentHiddenFieldId + '_' + condId);

                if(qSel) qSel.value = cond.questionId;
                updateConditionAnswers(currentHiddenFieldId, condId); // refresh answer list
                if(ansSel) ansSel.value = cond.answerValue;
                if(valSel) valSel.value = cond.autofillValue;
            }
        }

        // Multi-term Calculations
        if(hiddenField.calculations && hiddenField.calculations.length > 0) {
            for(var z=0; z<hiddenField.calculations.length; z++){
                addCalculationForCheckbox(currentHiddenFieldId);
                var calcId = z + 1; 
                var cObj = hiddenField.calculations[z];
                // cObj is { terms: [ { questionNameId, operator: '+', etc }, ... ],
                //           compareOperator: '=', threshold: '100', result: 'checked' }

                // We'll fill them in
                var eqContainerId = 'equationContainer' + currentHiddenFieldId + '_' + calcId;
                var eqContainer = document.getElementById(eqContainerId);
                if(!eqContainer) continue;

                // remove the initial default term block(s)
                eqContainer.innerHTML = '';
                // We'll re-create each term with "addEquationTerm(...)"
                // Then after we have them, fill them in with data

                // For example: cObj.terms might be an array of objects:
                // [ {questionNameId: 'Q1'}, {operator: '+', questionNameId: 'Q2'}, {operator: '-', questionNameId: 'Q3'}, ...]
                // We'll reconstruct them:

                for(var t=0; t<cObj.terms.length; t++){
                    addEquationTerm(currentHiddenFieldId, calcId);

                    var slotId = t + 1; 
                    var termObj = cObj.terms[t];
                    // question select
                    var qSelId = 'calcTermQuestion' + currentHiddenFieldId + '_' + calcId + '_' + slotId;
                    var qSelEl = document.getElementById(qSelId);
                    if(qSelEl) qSelEl.value = termObj.questionNameId || '';

                    // operator select 
                    if(t>0) {
                        var opSelId = 'calcTermOperator' + currentHiddenFieldId + '_' + calcId + '_' + slotId;
                        var opSelEl = document.getElementById(opSelId);
                        if(opSelEl) opSelEl.value = termObj.operator || '';
                    }
                }

                // Now the "compare operator" select
                var compareOpEl = document.getElementById('calcCompareOperator' + currentHiddenFieldId + '_' + calcId);
                if(compareOpEl) compareOpEl.value = cObj.compareOperator || '=';

                // threshold
                var thrEl = document.getElementById('calcThreshold' + currentHiddenFieldId + '_' + calcId);
                if(thrEl) thrEl.value = cObj.threshold || '';

                // result
                var resEl = document.getElementById('calcResult' + currentHiddenFieldId + '_' + calcId);
                if(resEl) resEl.value = cObj.result || 'checked';
            }
        }
    }
    else if(hiddenField.type === 'text') {
        if(hiddenField.autofillQuestionId) {
            var autoSel = document.getElementById('hiddenFieldAutofill' + currentHiddenFieldId);
            if(autoSel) autoSel.value = hiddenField.autofillQuestionId;
        }
        if(hiddenField.conditions && hiddenField.conditions.length > 0) {
            for(var y=0; y<hiddenField.conditions.length; y++){
                addConditionalAutofill(currentHiddenFieldId);
                var con = hiddenField.conditions[y];
                var cId = y + 1;
                var qSel2 = document.getElementById('conditionQuestion' + currentHiddenFieldId + '_' + cId);
                var ansSel2 = document.getElementById('conditionAnswer' + currentHiddenFieldId + '_' + cId);
                var valSel2 = document.getElementById('conditionValue' + currentHiddenFieldId + '_' + cId);

                if(qSel2) qSel2.value = con.questionId;
                updateConditionAnswers(currentHiddenFieldId, cId);
                if(ansSel2) ansSel2.value = con.answerValue;
                if(valSel2) valSel2.value = con.autofillValue;
            }
        }
    }
}

/***************************************************
 * Conditional Autofill for text/checkbox 
 ***************************************************/
function addConditionalAutofill(hiddenFieldId) {
    var parentDiv = document.getElementById('conditionalAutofill' + hiddenFieldId);
    var nextIndex = parentDiv.children.length + 1;

    var condDiv = document.createElement('div');
    condDiv.className = 'condition';
    condDiv.id = 'condition' + hiddenFieldId + '_' + nextIndex;
    condDiv.innerHTML = `
        <label>Condition ${nextIndex}:</label><br>
        <label>Question:</label>
        <select id="conditionQuestion${hiddenFieldId}_${nextIndex}" onchange="updateConditionAnswers(${hiddenFieldId}, ${nextIndex})" style="width: 300px;">
            <option value="">-- Select a question --</option>
            ${generateAllQuestionOptions()}
        </select><br>
        <label>Answer:</label>
        <select id="conditionAnswer${hiddenFieldId}_${nextIndex}" style="width: 300px;">
            <option value="">-- Select an answer --</option>
        </select><br>
        <label>Value to Autofill:</label>
        <input type="text" id="conditionValue${hiddenFieldId}_${nextIndex}" placeholder="Enter value"><br>
        <button type="button" onclick="removeConditionalAutofill(${hiddenFieldId}, ${nextIndex})">Remove Condition</button>
        <hr>
    `;
    parentDiv.appendChild(condDiv);
}

function removeConditionalAutofill(hiddenFieldId, conditionId) {
    var cDiv = document.getElementById('condition' + hiddenFieldId + '_' + conditionId);
    if(cDiv) cDiv.remove();
}

function addConditionalAutofillForCheckbox(hiddenFieldId) {
    var parentDiv = document.getElementById('conditionalAutofillForCheckbox' + hiddenFieldId);
    var nextIndex = parentDiv.children.length + 1;

    var condDiv = document.createElement('div');
    condDiv.className = 'condition' + nextIndex;
    condDiv.id = 'condition' + hiddenFieldId + '_' + nextIndex;
    condDiv.innerHTML = `
        <label>Condition ${nextIndex}:</label><br>
        <label>Question:</label>
        <select id="conditionQuestion${hiddenFieldId}_${nextIndex}" onchange="updateConditionAnswers(${hiddenFieldId}, ${nextIndex})" style="width: 300px;">
            <option value="">-- Select a question --</option>
            ${generateAllQuestionOptions()}
        </select><br>
        <label>Answer:</label>
        <select id="conditionAnswer${hiddenFieldId}_${nextIndex}" style="width: 300px;">
            <option value="">-- Select an answer --</option>
        </select><br>
        <label>Value:</label>
        <select id="conditionValue${hiddenFieldId}_${nextIndex}" style="width: 300px;">
            <option value="checked">Checked</option>
            <option value="unchecked">Unchecked</option>
        </select><br>
        <button type="button" onclick="removeConditionalAutofill(${hiddenFieldId}, ${nextIndex})">Remove Condition</button>
        <hr>
    `;
    parentDiv.appendChild(condDiv);
}

function updateConditionAnswers(hiddenFieldId, conditionId) {
    var qSel = document.getElementById('conditionQuestion' + hiddenFieldId + '_' + conditionId);
    var ansSel = document.getElementById('conditionAnswer' + hiddenFieldId + '_' + conditionId);
    if(!qSel || !ansSel) return;

    ansSel.innerHTML = '<option value="">-- Select an answer --</option>';

    var prevQId = qSel.value;
    var block = document.getElementById('questionBlock' + prevQId);
    if(block) {
        var questionType = block.querySelector('select') ? block.querySelector('select').value : '';
        if(questionType === 'radio') {
            ansSel.innerHTML += `
                <option value="Yes">Yes</option>
                <option value="No">No</option>
            `;
        }
        else if(questionType === 'dropdown') {
            var options = block.querySelectorAll('#dropdownOptions' + prevQId + ' input');
            for(var i=0; i<options.length; i++){
                var val = options[i].value.trim();
                if(val) ansSel.innerHTML += '<option value="' + val + '">' + val + '</option>';
            }
        }
        else if(questionType === 'checkbox') {
            var cOpts = block.querySelectorAll('#checkboxOptions' + prevQId + ' [id^="checkboxOptionText"]');
            for(var x=0; x<cOpts.length; x++){
                var tval = cOpts[x].value.trim();
                if(tval) ansSel.innerHTML += '<option value="' + tval + '">' + tval + '</option>';
            }
            var noneEl = block.querySelector('#noneOfTheAbove' + prevQId);
            if(noneEl && noneEl.checked){
                ansSel.innerHTML += '<option value="None of the above">None of the above</option>';
            }
        }
    }
}

/*******************************************************
 * Calculation for hidden checkbox
 *   with multi-term equation building
 *******************************************************/

/**
 * When user clicks "Add Calculation" for a checkbox
 * we create a row with:
 *  - An "equation container" that starts with 1 money question
 *  - A button "Add Another Term"
 *  - Compare operator + threshold + final result
 */
function addCalculationForCheckbox(hiddenFieldId) {
    var calcBlock = document.getElementById('calculationBlock' + hiddenFieldId);
    var calcIndex = calcBlock.children.length + 1;

    var row = document.createElement('div');
    row.className = 'calculation' + calcIndex;
    row.id = 'calculationRow' + hiddenFieldId + '_' + calcIndex;

    row.innerHTML = `
        <label>Calculation ${calcIndex}:</label><br>

        <!-- The equation container: we can have many terms -->
        <div id="equationContainer${hiddenFieldId}_${calcIndex}"></div>
        <button type="button" onclick="addEquationTerm(${hiddenFieldId}, ${calcIndex})">Add Another Term</button>
        <br><br>

        <!-- Compare operator ( = < > ), threshold, final result (checked/unchecked) -->
        <select id="calcCompareOperator${hiddenFieldId}_${calcIndex}">
            <option value="=">=</option>
            <option value="<"><</option>
            <option value=">">></option>
        </select>
        <input type="number" id="calcThreshold${hiddenFieldId}_${calcIndex}" placeholder="Enter number" style="width:80px;">
        <label> then </label>
        <select id="calcResult${hiddenFieldId}_${calcIndex}">
            <option value="checked">Checked</option>
            <option value="unchecked">Unchecked</option>
        </select>

        <button type="button" onclick="removeCalculationForCheckbox(${hiddenFieldId}, ${calcIndex})">Remove</button>
        <hr>
    `;

    calcBlock.appendChild(row);

    // Immediately add the first term (Term #1)
    addEquationTerm(hiddenFieldId, calcIndex);
}

/**
 * Adds "one term" to the equation container:
 *   For the first term => just a money question dropdown
 *   For subsequent terms => an operator dropdown + a money question dropdown
 */
function addEquationTerm(hiddenFieldId, calcIndex) {
    var eqContainer = document.getElementById('equationContainer' + hiddenFieldId + '_' + calcIndex);
    if(!eqContainer) return;

    var existingTermCount = eqContainer.querySelectorAll('.equation-term').length;
    var termNumber = existingTermCount + 1; // 1-based

    var termDiv = document.createElement('div');
    termDiv.className = 'equation-term';
    termDiv.id = 'equationTerm' + hiddenFieldId + '_' + calcIndex + '_' + termNumber;

    // If this is the first term => no operator
    // If it's second or later => show operator
    var operatorHTML = '';
    if(termNumber > 1) {
        operatorHTML = `
            <select id="calcTermOperator${hiddenFieldId}_${calcIndex}_${termNumber}">
                <option value="+">+</option>
                <option value="-">-</option>
                <option value="x">x</option>
                <option value="/">/</option>
            </select>
        `;
    }

    termDiv.innerHTML = `
        ${operatorHTML}
        <select id="calcTermQuestion${hiddenFieldId}_${calcIndex}_${termNumber}" style="width:200px;">
            <option value="">-- Select money question --</option>
            ${generateMoneyQuestionOptions()}
        </select><br><br>
    `;
    eqContainer.appendChild(termDiv);
}

/**
 * Removes an entire calculation row
 */
function removeCalculationForCheckbox(hiddenFieldId, calcIndex) {
    var row = document.getElementById('calculationRow' + hiddenFieldId + '_' + calcIndex);
    if(row) row.remove();

    // re-label the remaining rows
    var calcBlock = document.getElementById('calculationBlock' + hiddenFieldId);
    var rows = calcBlock.querySelectorAll('div[id^="calculationRow"]');
    for(var i=0; i<rows.length; i++){
        var r = rows[i];
        var newIndex = i+1;
        r.className = 'calculation' + newIndex;
        var oldId = r.id; // e.g. "calculationRow5_2"
        // rename:
        r.id = 'calculationRow' + hiddenFieldId + '_' + newIndex;

        var label = r.querySelector('label');
        if(label) label.textContent = 'Calculation ' + newIndex + ':';

        // fix "Add Another Term" button
        var addTermBtn = r.querySelector('button[onclick^="addEquationTerm"]');
        addTermBtn.setAttribute('onclick', `addEquationTerm(${hiddenFieldId}, ${newIndex})`);

        // fix "Remove" button
        var removeBtn = r.querySelector('button[onclick^="removeCalculationForCheckbox"]');
        removeBtn.setAttribute('onclick', `removeCalculationForCheckbox(${hiddenFieldId}, ${newIndex})`);

        // fix eqContainer
        var eqContainer = r.querySelector('[id^="equationContainer"]');
        if(eqContainer){
            eqContainer.id = 'equationContainer' + hiddenFieldId + '_' + newIndex;

            // fix each .equation-term IDs
            var terms = eqContainer.querySelectorAll('.equation-term');
            for(var t=0; t<terms.length; t++){
                var termDiv = terms[t];
                var newTermIndex = t+1;
                termDiv.id = 'equationTerm' + hiddenFieldId + '_' + newIndex + '_' + newTermIndex;

                // fix operator ID
                var opSel = termDiv.querySelector('[id^="calcTermOperator"]');
                if(opSel){
                    opSel.id = 'calcTermOperator' + hiddenFieldId + '_' + newIndex + '_' + newTermIndex;
                }

                // fix question ID
                var qSel = termDiv.querySelector('[id^="calcTermQuestion"]');
                if(qSel){
                    qSel.id = 'calcTermQuestion' + hiddenFieldId + '_' + newIndex + '_' + newTermIndex;
                }
            }
        }

        // fix "calcCompareOperator"
        var cmpOpSel = r.querySelector('[id^="calcCompareOperator"]');
        if(cmpOpSel){
            cmpOpSel.id = 'calcCompareOperator' + hiddenFieldId + '_' + newIndex;
        }
        var thr = r.querySelector('[id^="calcThreshold"]');
        if(thr){
            thr.id = 'calcThreshold' + hiddenFieldId + '_' + newIndex;
        }
        var resSel = r.querySelector('[id^="calcResult"]');
        if(resSel){
            resSel.id = 'calcResult' + hiddenFieldId + '_' + newIndex;
        }
    }
}

/*****************************************************
 * Helper functions to generate question lists
 *****************************************************/

/**
 * generateQuestionOptions():
 *   - Return <option> tags for questions that can be used for text autofill
 */
function generateQuestionOptions() {
    var optionsHTML = '';
    var questionBlocks = document.querySelectorAll('.question-block');

    questionBlocks.forEach(function(qBlock){
        var qId = qBlock.id.replace('questionBlock','');
        var qTxtEl = qBlock.querySelector('input[type="text"]');
        var qTxt = qTxtEl ? qTxtEl.value : ('Question ' + qId);
        var selEl = qBlock.querySelector('select');
        var qType = selEl ? selEl.value : 'text';

        // These types can be used for text autofill:
        if(['text','bigParagraph','money','date','radio','dropdown'].indexOf(qType) !== -1) {
            optionsHTML += '<option value="'+qId+'">Question '+qId+': '+qTxt+'</option>';
        }
        // multipleTextboxes => each child box can also be used
        if(qType==='multipleTextboxes'){
            var children = qBlock.querySelectorAll('#multipleTextboxesOptions'+qId+' .option');
            children.forEach(function(optDiv, idx){
                var lblInput = optDiv.querySelector('input[id^="multipleTextboxLabel"]');
                var lblVal = lblInput ? lblInput.value : ('Textbox '+(idx+1));
                var nmInput = optDiv.querySelector('input[id^="multipleTextboxName"]');
                var nmVal = nmInput ? nmInput.value : ('answer'+qId+'_'+(idx+1));
                optionsHTML += '<option value="'+(qId+'_'+(idx+1))+'">Q'+qId+' - '+lblVal+' ('+nmVal+')</option>';
            });
        }
    });
    return optionsHTML;
}

/**
 * generateAllQuestionOptions():
 *  - Return <option> tags for questions that have discrete answers (radio, dropdown, checkbox).
 */
function generateAllQuestionOptions() {
    var optionsHTML = '';
    var questionBlocks = document.querySelectorAll('.question-block');
    questionBlocks.forEach(function(qBlock){
        var qId = qBlock.id.replace('questionBlock','');
        var qTxtEl = qBlock.querySelector('input[type="text"]');
        var qTxt = qTxtEl ? qTxtEl.value : ('Question '+qId);
        var selEl = qBlock.querySelector('select');
        var qType = selEl ? selEl.value : 'text';

        if(['dropdown','radio','checkbox'].indexOf(qType) !== -1){
            optionsHTML += '<option value="'+qId+'">Question '+qId+': '+qTxt+'</option>';
        }
    });
    return optionsHTML;
}

/**
 * generateMoneyQuestionOptions():
 *  - Return <option> tags for only "money"-type questions,
 *    used for multi-term equation building
 */
function generateMoneyQuestionOptions() {
    var optionsHTML = '';
    var questionBlocks = document.querySelectorAll('.question-block');
    questionBlocks.forEach(function(qBlock){
        var qId = qBlock.id.replace('questionBlock','');
        var selEl = qBlock.querySelector('select');
        var qType = selEl ? selEl.value : 'text';
        if(qType === 'money'){
            var nmEl = qBlock.querySelector('#textboxName'+qId);
            var nmVal = nmEl && nmEl.value ? nmEl.value : ('answer'+qId);
            var qTxtEl = qBlock.querySelector('#question'+qId);
            var qTxt = qTxtEl ? qTxtEl.value : ('Question '+qId);
            optionsHTML += '<option value="'+nmVal+'">'+qTxt+' ('+nmVal+')</option>';
        }
    });
    return optionsHTML;
}

/**
 * If user re-orders or modifies questions, call updateAutofillOptions()
 *  to refresh references in the hidden fields.
 */
function updateAutofillOptions() {
    var hiddenBlocks = document.querySelectorAll('.hidden-field-block');
    hiddenBlocks.forEach(function(block){
        var hid = block.id.replace('hiddenFieldBlock','');
        var ft = document.getElementById('hiddenFieldType'+hid).value;
        if(ft==='text'){
            // refresh "hiddenFieldAutofill" 
            var autofillSel = document.getElementById('hiddenFieldAutofill'+hid);
            if(autofillSel){
                var prevVal = autofillSel.value;
                autofillSel.innerHTML = `
                  <option value="">-- Select a question --</option>
                  ${generateQuestionOptions()}
                `;
                if([].slice.call(autofillSel.options).some(function(opt){return opt.value===prevVal;})){
                    autofillSel.value = prevVal;
                }
            }
            // refresh any conditions 
            var condDiv = document.getElementById('conditionalAutofill'+hid);
            if(condDiv){
                var crows = condDiv.querySelectorAll('.condition');
                crows.forEach(function(cr){
                    var condId = cr.id.split('_')[1];
                    var qSel = document.getElementById('conditionQuestion'+hid+'_'+condId);
                    if(qSel){
                        var oldQ = qSel.value;
                        qSel.innerHTML=`
                          <option value="">-- Select a question --</option>
                          ${generateAllQuestionOptions()}
                        `;
                        if([].slice.call(qSel.options).some(function(o){return o.value===oldQ;})){
                            qSel.value=oldQ;
                            updateConditionAnswers(hid,condId);
                        }
                    }
                });
            }
        }
        else if(ft==='checkbox'){
            // refresh conditionalAutofillForCheckbox
            var cDiv = document.getElementById('conditionalAutofillForCheckbox'+hid);
            if(cDiv){
                var cRows2 = cDiv.querySelectorAll('.condition');
                cRows2.forEach(function(cr2){
                    var cId2 = cr2.id.split('_')[1];
                    var qSel2 = document.getElementById('conditionQuestion'+hid+'_'+cId2);
                    if(qSel2){
                        var oldVal2 = qSel2.value;
                        qSel2.innerHTML=`
                          <option value="">-- Select a question --</option>
                          ${generateAllQuestionOptions()}
                        `;
                        if([].slice.call(qSel2.options).some(function(o){return o.value===oldVal2;})){
                            qSel2.value=oldVal2;
                            updateConditionAnswers(hid,cId2);
                        }
                    }
                });
            }
        }
    });
}
