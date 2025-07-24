/************************************************
 * hidden.js - Full version supporting multi-term 
 * equations for BOTH:
 *   1) Hidden checkbox fields (If eq => checked/unchecked)
 *   2) Hidden text fields   (If eq => fill with some text)
 ************************************************/

/**
 * Initializes the hidden PDF fields module on page load.
 * Inserts the "Add Hidden Field" button so user can do so from scratch.
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

var hiddenFieldCounter = 1; // track globally

/**
 * Adds a new empty hidden field block
 */
function addHiddenField() {
    var hiddenFieldsContainer = document.getElementById('hiddenFieldsContainer');
    if(!hiddenFieldsContainer) return;

    var currentHiddenFieldId = hiddenFieldCounter++;
    var block = document.createElement('div');
    block.className = 'hidden-field-block';
    block.id = 'hiddenFieldBlock' + currentHiddenFieldId;

    block.innerHTML = `
        <label>Hidden Field ${currentHiddenFieldId}: </label>
        <select id="hiddenFieldType${currentHiddenFieldId}" onchange="toggleHiddenFieldOptions(${currentHiddenFieldId})">
            <option value="text">Textbox</option>
            <option value="checkbox">Checkbox</option>
        </select><br><br>
        <div id="hiddenFieldOptions${currentHiddenFieldId}">
            <!-- Options will be populated based on the type -->
        </div>
        <button type="button" onclick="removeHiddenField(${currentHiddenFieldId})">Remove Hidden Field</button>
        <hr>
    `;
    hiddenFieldsContainer.appendChild(block);
    toggleHiddenFieldOptions(currentHiddenFieldId);
    
    // After adding a new hidden field, update all calculation dropdowns
    setTimeout(updateAllCalculationDropdowns, 100);
}

/**
 * Removes a hidden field block by ID
 */
function removeHiddenField(hiddenFieldId) {
    var block = document.getElementById('hiddenFieldBlock' + hiddenFieldId);
    if(block) block.remove();
}

/**
 * Toggles between text vs. checkbox sub-options
 */
function toggleHiddenFieldOptions(hiddenFieldId) {
    var fieldType = document.getElementById('hiddenFieldType' + hiddenFieldId).value;
    var optsDiv = document.getElementById('hiddenFieldOptions' + hiddenFieldId);

    optsDiv.innerHTML = '';

    if(fieldType === 'text') {
        optsDiv.innerHTML = `
            <label>Name/ID:</label>
            <input type="text" id="hiddenFieldName${hiddenFieldId}" placeholder="Enter field name"><br><br>

            <!-- Multi-term Calculation for text fields -->
            <button type="button" onclick="addCalculationForText(${hiddenFieldId})">Add Calculation</button>
            <div id="textCalculationBlock${hiddenFieldId}"></div><br>

            <label>Conditional Autofill Logic:</label><br>
            <div id="conditionalAutofill${hiddenFieldId}"></div>
            <button type="button" onclick="addConditionalAutofill(${hiddenFieldId})">Add Conditional Logic</button><br><br>
        `;
    }
    else if(fieldType === 'checkbox') {
        optsDiv.innerHTML = `
            <label>Name/ID:</label>
            <input type="text" id="hiddenFieldName${hiddenFieldId}" placeholder="Enter field name"><br><br>

            <button type="button" onclick="addCalculationForCheckbox(${hiddenFieldId})">Add Calculation</button>
            <div id="calculationBlock${hiddenFieldId}"></div><br>

            <label>Checked by default:</label>
            <input type="checkbox" id="hiddenFieldChecked${hiddenFieldId}"><br><br>

            <label>Conditional Autofill Logic:</label><br>
            <div id="conditionalAutofillForCheckbox${hiddenFieldId}"></div>
            <button type="button" onclick="addConditionalAutofillForCheckbox(${hiddenFieldId})">Add Conditional Logic</button><br><br>
        `;
    }
    
    // Update all calculation dropdowns whenever we toggle options
    setTimeout(updateAllCalculationDropdowns, 100);
}

/**
 * When loading from JSON, we call addHiddenFieldWithData
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
            <option value="text" ${hiddenField.type==='text'?'selected':''}>Textbox</option>
            <option value="checkbox" ${hiddenField.type==='checkbox'?'selected':''}>Checkbox</option>
        </select><br><br>
        <div id="hiddenFieldOptions${currentHiddenFieldId}">
        </div>
        <button type="button" onclick="removeHiddenField(${currentHiddenFieldId})">Remove Hidden Field</button>
        <hr>
    `;
    hiddenFieldsContainer.appendChild(block);

    toggleHiddenFieldOptions(currentHiddenFieldId);

    // Fill name
    var nm = document.getElementById('hiddenFieldName' + currentHiddenFieldId);
    if(nm) nm.value = hiddenField.name || '';

    if(hiddenField.type==='checkbox'){
        var chkDef = document.getElementById('hiddenFieldChecked' + currentHiddenFieldId);
        if(chkDef) chkDef.checked = !!hiddenField.checked;

        // Conditions
        if(hiddenField.conditions && hiddenField.conditions.length>0){
            for(var i=0; i<hiddenField.conditions.length; i++){
                addConditionalAutofillForCheckbox(currentHiddenFieldId);
                var cond = hiddenField.conditions[i];
                var condId = i+1;
                var qSel = document.getElementById('conditionQuestion'+currentHiddenFieldId+'_'+condId);
                var ansSel = document.getElementById('conditionAnswer'+currentHiddenFieldId+'_'+condId);
                var valSel = document.getElementById('conditionValue'+currentHiddenFieldId+'_'+condId);

                if(qSel) qSel.value = cond.questionId;
                updateConditionAnswers(currentHiddenFieldId, condId);
                if(ansSel) ansSel.value = cond.answerValue;
                if(valSel) valSel.value = cond.autofillValue;
            }
        }

        // Multi-term calculations (calcRows)
        if(hiddenField.calculations && hiddenField.calculations.length>0){
            for(var c=0; c<hiddenField.calculations.length; c++){
                addCalculationForCheckbox(currentHiddenFieldId);
                var calcIndex=c+1;
                var cObj = hiddenField.calculations[c];

                // remove the default single term from eq container
                var eqContainer = document.getElementById('equationContainer'+currentHiddenFieldId+'_'+calcIndex);
                eqContainer.innerHTML='';

                // re-create each term
                for(var t=0; t<cObj.terms.length; t++){
                    addEquationTermCheckbox(currentHiddenFieldId, calcIndex);
                    var termNumber = t+1;
                    var termObj = cObj.terms[t];

                    // operator
                    if(termNumber>1){
                        var opSel = document.getElementById('calcTermOperator'+currentHiddenFieldId+'_'+calcIndex+'_'+termNumber);
                        if(opSel) opSel.value=termObj.operator || '';
                    }
                    // question
                    var qSelId = 'calcTermQuestion'+currentHiddenFieldId+'_'+calcIndex+'_'+termNumber;
                    var qSelEl = document.getElementById(qSelId);
                    if(qSelEl) qSelEl.value = termObj.questionNameId || '';
                }

                // compare operator
                var cmpOp = document.getElementById('calcCompareOperator'+currentHiddenFieldId+'_'+calcIndex);
                if(cmpOp) cmpOp.value = cObj.compareOperator||'=';
                // threshold
                var thrEl = document.getElementById('calcThreshold'+currentHiddenFieldId+'_'+calcIndex);
                if(thrEl) thrEl.value = cObj.threshold||'';
                // result
                var resEl = document.getElementById('calcResult'+currentHiddenFieldId+'_'+calcIndex);
                if(resEl) resEl.value = cObj.result||'checked';
            }
        }
    }
    else if(hiddenField.type==='text'){
        // Conditions
        if(hiddenField.conditions && hiddenField.conditions.length>0){
            for(var y=0; y<hiddenField.conditions.length; y++){
                addConditionalAutofill(currentHiddenFieldId);
                var condId2=y+1;
                var c2=hiddenField.conditions[y];
                var qS2= document.getElementById('conditionQuestion'+currentHiddenFieldId+'_'+condId2);
                var aS2= document.getElementById('conditionAnswer'+currentHiddenFieldId+'_'+condId2);
                var vS2= document.getElementById('conditionValue'+currentHiddenFieldId+'_'+condId2);

                if(qS2){
                    qS2.value=c2.questionId;
                    updateConditionAnswers(currentHiddenFieldId, condId2);
                }
                if(aS2) aS2.value=c2.answerValue;
                if(vS2) vS2.value=c2.autofillValue;
            }
        }

        // Multi-term calculations for text
        if(hiddenField.calculations && hiddenField.calculations.length>0){
            for(var z=0; z<hiddenField.calculations.length; z++){
                addCalculationForText(currentHiddenFieldId);
                var calcIdx = z+1;
                var cObj2 = hiddenField.calculations[z];
                // remove the default single term
                var eqCont2 = document.getElementById('textEquationContainer'+currentHiddenFieldId+'_'+calcIdx);
                eqCont2.innerHTML='';

                for(var t2=0; t2<cObj2.terms.length; t2++){
                    addEquationTermText(currentHiddenFieldId, calcIdx);
                    var termNumber2 = t2+1;
                    var termObj2= cObj2.terms[t2];
                    // operator
                    if(termNumber2>1){
                        var opSel2= document.getElementById('textTermOperator'+currentHiddenFieldId+'_'+calcIdx+'_'+termNumber2);
                        if(opSel2) opSel2.value=termObj2.operator||'';
                    }
                    // question
                    var qSel2= document.getElementById('textTermQuestion'+currentHiddenFieldId+'_'+calcIdx+'_'+termNumber2);
                    if(qSel2) qSel2.value=termObj2.questionNameId||'';
                }

                // compareOp
                var cmpOp2 = document.getElementById('textCompareOperator'+currentHiddenFieldId+'_'+calcIdx);
                if(cmpOp2) cmpOp2.value= cObj2.compareOperator||'=';

                // threshold
                var thr2 = document.getElementById('textThreshold'+currentHiddenFieldId+'_'+calcIdx);
                if(thr2) thr2.value=cObj2.threshold||'';

                // fillValue
                var fillEl = document.getElementById('textFillValue'+currentHiddenFieldId+'_'+calcIdx);
                if(fillEl) fillEl.value=cObj2.fillValue||'';
            }
        }
    }
}

/***************************************************
 * Conditional Autofill for text / checkbox fields
 ***************************************************/

function addConditionalAutofill(hiddenFieldId) {
    var parentDiv = document.getElementById('conditionalAutofill'+hiddenFieldId);
    var condId = parentDiv.children.length+1;

    var condDiv = document.createElement('div');
    condDiv.className='condition';
    condDiv.id='condition'+hiddenFieldId+'_'+condId;
    condDiv.innerHTML=`
        <label>Condition ${condId}:</label><br>
        <label>Question:</label>
        <select id="conditionQuestion${hiddenFieldId}_${condId}" onchange="updateConditionAnswers(${hiddenFieldId}, ${condId})" style="width:300px;">
            <option value="">-- Select a question --</option>
            ${generateAllQuestionOptions()}
        </select><br>
        <label>Answer:</label>
        <select id="conditionAnswer${hiddenFieldId}_${condId}" style="width:300px;">
            <option value="">-- Select an answer --</option>
        </select><br>
        <label>Value to Autofill:</label>
        <input type="text" id="conditionValue${hiddenFieldId}_${condId}" placeholder="Enter value"><br>
        <button type="button" onclick="removeConditionalAutofill(${hiddenFieldId}, ${condId})">Remove Condition</button>
        <hr>
    `;
    parentDiv.appendChild(condDiv);
}

function removeConditionalAutofill(hiddenFieldId, condId) {
    var div= document.getElementById('condition'+hiddenFieldId+'_'+condId);
    if(div) div.remove();
}

function addConditionalAutofillForCheckbox(hiddenFieldId) {
    var parentDiv = document.getElementById('conditionalAutofillForCheckbox'+hiddenFieldId);
    var condId = parentDiv.children.length+1;

    var condDiv = document.createElement('div');
    condDiv.className='condition'+condId;
    condDiv.id='condition'+hiddenFieldId+'_'+condId;
    condDiv.innerHTML=`
        <label>Condition ${condId}:</label><br>
        <label>Question:</label>
        <select id="conditionQuestion${hiddenFieldId}_${condId}" onchange="updateConditionAnswers(${hiddenFieldId}, ${condId})" style="width:300px;">
            <option value="">-- Select a question --</option>
            ${generateAllQuestionOptions()}
        </select><br>
        <label>Answer:</label>
        <select id="conditionAnswer${hiddenFieldId}_${condId}" style="width:300px;">
            <option value="">-- Select an answer --</option>
        </select><br>
        <label>Value:</label>
        <select id="conditionValue${hiddenFieldId}_${condId}" style="width:300px;">
            <option value="checked">Checked</option>
            <option value="unchecked">Unchecked</option>
        </select><br>
        <button type="button" onclick="removeConditionalAutofill(${hiddenFieldId}, ${condId})">Remove Condition</button>
        <hr>
    `;
    parentDiv.appendChild(condDiv);
}

function updateConditionAnswers(hiddenFieldId, condId) {
    var qSel = document.getElementById('conditionQuestion'+hiddenFieldId+'_'+condId);
    var ansSel= document.getElementById('conditionAnswer'+hiddenFieldId+'_'+condId);
    if(!qSel || !ansSel) return;

    ansSel.innerHTML='<option value="">-- Select an answer --</option>';

    var prevQId= qSel.value;
    var qBlock = document.getElementById('questionBlock'+prevQId);
    if(!qBlock) return;
    
    // FIX: Make sure we get the correct question type selector
    var sel= qBlock.querySelector('select#questionType'+prevQId);
    var qType= sel? sel.value:'text';

    if(qType==='radio'){
        ansSel.innerHTML += `
            <option value="Yes">Yes</option>
            <option value="No">No</option>
        `;
    }
    else if(qType==='dropdown'){
        var ddOps= qBlock.querySelectorAll('#dropdownOptions'+prevQId+' input');
        for(var i=0;i<ddOps.length;i++){
            var val= ddOps[i].value.trim();
            if(val) ansSel.innerHTML += '<option value="'+val+'">'+val+'</option>';
        }
    }
    else if(qType==='checkbox'){
        var cOpts = qBlock.querySelectorAll('#checkboxOptions'+prevQId+' [id^="checkboxOptionText"]');
        for(var x=0;x<cOpts.length;x++){
            var v= cOpts[x].value.trim();
            if(v) ansSel.innerHTML+='<option value="'+v+'">'+v+'</option>';
        }
        var noneAbove= qBlock.querySelector('#noneOfTheAbove'+prevQId);
        if(noneAbove && noneAbove.checked){
            ansSel.innerHTML+='<option value="None of the above">None of the above</option>';
        }
    }
    else if(qType==='numberedDropdown'){
        // Handle numbered dropdown by getting min/max range
        var rangeStartEl = qBlock.querySelector('#numberRangeStart'+prevQId);
        var rangeEndEl = qBlock.querySelector('#numberRangeEnd'+prevQId);
        
        if(rangeStartEl && rangeEndEl){
            var min = parseInt(rangeStartEl.value, 10) || 1;
            var max = parseInt(rangeEndEl.value, 10) || min;
            
            // Add each number in the range as an option
            for(var j=min; j<=max; j++){
                ansSel.innerHTML += '<option value="'+j+'">'+j+'</option>';
            }
        }
    }
    else if(qType==='text' || qType==='bigParagraph'){
        // For text questions, add an "Any Text" option
        ansSel.innerHTML += '<option value="Any Text">Any Text</option>';
    }
    else if(qType==='money'){
        // For money questions, add an "Any Amount" option
        ansSel.innerHTML += '<option value="Any Amount">Any Amount</option>';
        
        // Debug to console
        console.log('Money question detected, adding "Any Amount" option');
    }
    else if(qType==='date'){
        // For date questions, add an "Any Date" option
        ansSel.innerHTML += '<option value="Any Date">Any Date</option>';
    }
}

/*******************************************************
 * Calculation logic for hidden checkbox fields 
 *   "If eq => checked/unchecked"
 *******************************************************/

function addCalculationForCheckbox(hiddenFieldId) {
    var calcBlock = document.getElementById('calculationBlock'+hiddenFieldId);
    var calcIndex = calcBlock.children.length+1;

    var row = document.createElement('div');
    row.className='calculation'+calcIndex;
    row.id='calculationRow'+hiddenFieldId+'_'+calcIndex;

    row.innerHTML=`
        <label>Calculation ${calcIndex}:</label><br>

        <div id="equationContainer${hiddenFieldId}_${calcIndex}"></div>
        <button type="button" onclick="addEquationTermCheckbox(${hiddenFieldId}, ${calcIndex})">Add Another Term</button>
        <br><br>

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

    // Add the first term by default
    addEquationTermCheckbox(hiddenFieldId, calcIndex);
}

/**
 * Adds a single "term" to the equation for a hidden checkbox
 */
function addEquationTermCheckbox(hiddenFieldId, calcIndex) {
    var eqContainer = document.getElementById('equationContainer'+hiddenFieldId+'_'+calcIndex);
    if(!eqContainer) return;

    var existingTermCount = eqContainer.querySelectorAll('.equation-term-cb').length;
    var termNumber = existingTermCount+1;

    var div = document.createElement('div');
    div.className='equation-term-cb';
    div.id='equationTermCb'+hiddenFieldId+'_'+calcIndex+'_'+termNumber;

    var operatorHTML='';
    if(termNumber>1){
        operatorHTML=`
            <select id="calcTermOperator${hiddenFieldId}_${calcIndex}_${termNumber}">
                <option value="+">+</option>
                <option value="-">-</option>
                <option value="x">x</option>
                <option value="/">/</option>
            </select>
        `;
    }

    div.innerHTML=`
        ${operatorHTML}
        <select id="calcTermQuestion${hiddenFieldId}_${calcIndex}_${termNumber}" style="width:200px;">
            <option value="">-- Select money question --</option>
            ${generateMoneyQuestionOptions()}
        </select><br><br>
    `;
    eqContainer.appendChild(div);
}

/**
 * Removes entire calculation row for hidden checkbox
 */
function removeCalculationForCheckbox(hiddenFieldId, calcIndex) {
    var row = document.getElementById('calculationRow'+hiddenFieldId+'_'+calcIndex);
    if(row) row.remove();

    // re-label
    var calcBlock = document.getElementById('calculationBlock'+hiddenFieldId);
    var rows= calcBlock.querySelectorAll('div[id^="calculationRow'+hiddenFieldId+'_"]');
    for(var i=0;i<rows.length;i++){
        var r= rows[i];
        var newIndex=i+1;
        r.className='calculation'+newIndex;
        var oldId = r.id; 
        r.id='calculationRow'+hiddenFieldId+'_'+newIndex;

        var label= r.querySelector('label');
        if(label) label.textContent='Calculation '+newIndex+':';

        var eqCont= r.querySelector('[id^="equationContainer"]');
        if(eqCont) eqCont.id= 'equationContainer'+hiddenFieldId+'_'+newIndex;

        var addBtn= r.querySelector('button[onclick^="addEquationTermCheckbox"]');
        addBtn.setAttribute('onclick', `addEquationTermCheckbox(${hiddenFieldId}, ${newIndex})`);

        var removeBtn= r.querySelector('button[onclick^="removeCalculationForCheckbox"]');
        removeBtn.setAttribute('onclick', `removeCalculationForCheckbox(${hiddenFieldId}, ${newIndex})`);

        var cmpSel= r.querySelector('[id^="calcCompareOperator"]');
        if(cmpSel) cmpSel.id= 'calcCompareOperator'+hiddenFieldId+'_'+newIndex;

        var thrEl= r.querySelector('[id^="calcThreshold"]');
        if(thrEl) thrEl.id= 'calcThreshold'+hiddenFieldId+'_'+newIndex;

        var resEl= r.querySelector('[id^="calcResult"]');
        if(resEl) resEl.id= 'calcResult'+hiddenFieldId+'_'+newIndex;

        // also re-label the .equation-term-cb if needed
        var termDivs = r.querySelectorAll('.equation-term-cb');
        for(var t=0;t<termDivs.length;t++){
            var td=termDivs[t];
            var newTermIndex=t+1;
            td.id='equationTermCb'+hiddenFieldId+'_'+newIndex+'_'+newTermIndex;

            var opSel= td.querySelector('[id^="calcTermOperator"]');
            if(opSel){
                opSel.id='calcTermOperator'+hiddenFieldId+'_'+newIndex+'_'+newTermIndex;
            }
            var qSel= td.querySelector('[id^="calcTermQuestion"]');
            if(qSel){
                qSel.id='calcTermQuestion'+hiddenFieldId+'_'+newIndex+'_'+newTermIndex;
            }
        }
    }
}

/*******************************************************
 * Calculation logic for hidden text fields
 *   "If eq => fill with some text"
 *******************************************************/

/**
 * Update all calculation dropdowns to ensure they show all available money questions
 * and all hidden field options
 */
function updateAllCalculationDropdowns() {
    // Update all calculation dropdown options to ensure they include all hidden fields
    const allDropdowns = document.querySelectorAll('select[id^="textTermQuestion"], select[id^="calcTermQuestion"]');
    allDropdowns.forEach(dropdown => {
        const selectedValue = dropdown.value;
        dropdown.innerHTML = `
            <option value="">-- Select money question --</option>
            ${generateMoneyQuestionOptions()}
        `;
        if (selectedValue) dropdown.value = selectedValue;
    });
}

/**
 * Adds a new calculation for a text field
 */
function addCalculationForText(hiddenFieldId) {
    var textCalcBlock = document.getElementById('textCalculationBlock'+hiddenFieldId);
    var calcIndex = textCalcBlock.children.length+1;

    var row= document.createElement('div');
    row.className='text-calc'+calcIndex;
    row.id='textCalculationRow'+hiddenFieldId+'_'+calcIndex;

    row.innerHTML=`
        <label>Calculation ${calcIndex} (Text):</label><br>

        <div id="textEquationContainer${hiddenFieldId}_${calcIndex}"></div>
        <button type="button" onclick="addEquationTermText(${hiddenFieldId}, ${calcIndex})">Add Another Term</button>
        <br><br>

        <select id="textCompareOperator${hiddenFieldId}_${calcIndex}">
            <option value="=">=</option>
            <option value="<"><</option>
            <option value=">">></option>
        </select>
        <input type="number" id="textThreshold${hiddenFieldId}_${calcIndex}" placeholder="Enter number" style="width:80px;">
        <label> then fill with: </label>
        <input type="text" id="textFillValue${hiddenFieldId}_${calcIndex}" placeholder="Enter value or use ##FIELDNAME## to reference a field" style="width:230px;">

        <button type="button" onclick="removeCalculationForText(${hiddenFieldId}, ${calcIndex})">Remove</button>
        <hr>
    `;
    textCalcBlock.appendChild(row);

    // Add the first term
    addEquationTermText(hiddenFieldId, calcIndex);
    
    // Make sure all dropdowns show all options
    updateAllCalculationDropdowns();
}

/**
 * Adds one term to the text equation
 */
function addEquationTermText(hiddenFieldId, calcIndex) {
    var eqContainer = document.getElementById('textEquationContainer'+hiddenFieldId+'_'+calcIndex);
    if(!eqContainer) return;

    var existingTerms = eqContainer.querySelectorAll('.equation-term-text').length;
    var termNumber = existingTerms + 1;

    var div = document.createElement('div');
    div.className = 'equation-term-text';
    div.id = 'equationTermText'+hiddenFieldId+'_'+calcIndex+'_'+termNumber;

    var operatorHTML = '';
    if(termNumber > 1) {
        operatorHTML = `
            <select id="textTermOperator${hiddenFieldId}_${calcIndex}_${termNumber}">
                <option value="+">+</option>
                <option value="-">-</option>
                <option value="x">x</option>
                <option value="/">/</option>
            </select>
        `;
    }

    // Get all checkbox questions to determine correct indices
    const checkboxQuestions = {};
    document.querySelectorAll('.question-block').forEach(qBlock => {
        const qId = qBlock.id.replace('questionBlock', '');
        const typeEl = qBlock.querySelector('select#questionType' + qId);
        if (typeEl && typeEl.value === 'checkbox') {
            const options = qBlock.querySelectorAll('#checkboxOptions' + qId + ' div');
            checkboxQuestions[qId] = options.length;
        }
    });

    div.innerHTML = `
        ${operatorHTML}
        <select id="textTermQuestion${hiddenFieldId}_${calcIndex}_${termNumber}" 
                onchange="updateAmountFieldIndex(this, ${JSON.stringify(checkboxQuestions).replace(/"/g, '&quot;')})" 
                style="width:200px;">
            <option value="">-- Select money question --</option>
            ${generateMoneyQuestionOptions()}
        </select><br><br>
    `;
    eqContainer.appendChild(div);
    
    // Force update all dropdowns to ensure consistent options
    updateAllCalculationDropdowns();
}

// Add this new function to handle index updates
function updateAmountFieldIndex(selectEl, checkboxQuestions) {
    const value = selectEl.value;
    if (!value) return;

    // Check if this is a checkbox amount field
    const match = value.match(/^amount_(.+?)_(\d+)_(\d+)$/);
    if (!match) return;

    const [, baseId, questionNum, optionNum] = match;
    const maxOptions = checkboxQuestions[questionNum] || 0;
    
    if (optionNum > maxOptions) {
        // Correct the index to be within bounds
        const correctedValue = `amount_${baseId}_${questionNum}_${Math.min(optionNum, maxOptions)}`;
        selectEl.value = correctedValue;
    }
}

/**
 * Remove entire text calculation row
 */
function removeCalculationForText(hiddenFieldId, calcIndex) {
    var row = document.getElementById('textCalculationRow'+hiddenFieldId+'_'+calcIndex);
    if(row) row.remove();

    // re-label
    var textCalcBlock= document.getElementById('textCalculationBlock'+hiddenFieldId);
    var rows= textCalcBlock.querySelectorAll('div[id^="textCalculationRow"]');
    for(var i=0;i<rows.length;i++){
        var r= rows[i];
        var newIndex=i+1;
        r.className='text-calc'+newIndex;
        var oldId= r.id;
        r.id='textCalculationRow'+hiddenFieldId+'_'+newIndex;

        var label= r.querySelector('label');
        if(label) label.textContent='Calculation '+newIndex+' (Text):';

        var eqCont= r.querySelector('[id^="textEquationContainer"]');
        if(eqCont) eqCont.id='textEquationContainer'+hiddenFieldId+'_'+newIndex;

        var addBtn = r.querySelector('button[onclick^="addEquationTermText"]');
        addBtn.setAttribute('onclick', `addEquationTermText(${hiddenFieldId}, ${newIndex})`);

        var removeBtn= r.querySelector('button[onclick^="removeCalculationForText"]');
        removeBtn.setAttribute('onclick', `removeCalculationForText(${hiddenFieldId}, ${newIndex})`);

        var cmpOp= r.querySelector('[id^="textCompareOperator"]');
        if(cmpOp) cmpOp.id='textCompareOperator'+hiddenFieldId+'_'+newIndex;

        var thr= r.querySelector('[id^="textThreshold"]');
        if(thr) thr.id='textThreshold'+hiddenFieldId+'_'+newIndex;

        var fillEl= r.querySelector('[id^="textFillValue"]');
        if(fillEl) fillEl.id='textFillValue'+hiddenFieldId+'_'+newIndex;

        // also re-label the .equation-term-text if needed
        var termDivs= r.querySelectorAll('.equation-term-text');
        for(var t=0;t<termDivs.length;t++){
            var td= termDivs[t];
            var newTermIndex = t+1;
            td.id='equationTermText'+hiddenFieldId+'_'+newIndex+'_'+newTermIndex;

            var opSel= td.querySelector('[id^="textTermOperator"]');
            if(opSel){
                opSel.id='textTermOperator'+hiddenFieldId+'_'+newIndex+'_'+newTermIndex;
            }
            var qSel= td.querySelector('[id^="textTermQuestion"]');
            if(qSel){
                qSel.id='textTermQuestion'+hiddenFieldId+'_'+newIndex+'_'+newTermIndex;
            }
        }
    }
}

/*****************************************************
 * Helper functions to generate question lists
 *****************************************************/

function generateQuestionOptions() {
    var optionsHTML = '';
    var questionBlocks = document.querySelectorAll('.question-block');
    questionBlocks.forEach(function(qBlock){
        var qId= qBlock.id.replace('questionBlock','');
        var txtEl= qBlock.querySelector('input[type="text"]');
        var questionText = txtEl? txtEl.value : ('Question '+qId);
        var selEl= qBlock.querySelector('select');
        var qType= selEl? selEl.value:'text';

        if(['text','bigParagraph','money','date','radio','dropdown'].indexOf(qType)!==-1){
            optionsHTML += '<option value="'+qId+'">Question '+qId+': '+questionText+'</option>';
        }
        if(qType==='multipleTextboxes'){
            var mtbOpts= qBlock.querySelectorAll('#multipleTextboxesOptions'+qId+' .option');
            mtbOpts.forEach(function(tb, idx){
                var lblInput= tb.querySelector('input[id^="multipleTextboxLabel"]');
                var lblVal= lblInput? lblInput.value:('Textbox '+(idx+1));
                var nmInput= tb.querySelector('input[id^="multipleTextboxName"]');
                var nmVal= nmInput? nmInput.value: ('answer'+qId+'_'+(idx+1));
                optionsHTML += '<option value="'+(qId+'_'+(idx+1))+'">Q'+qId+' - '+lblVal+' ('+nmVal+')</option>';
            });
        }
    });
    return optionsHTML;
}

function generateAllQuestionOptions() {
    var optionsHTML='';
    var qBlocks= document.querySelectorAll('.question-block');
    qBlocks.forEach(function(qBlock){
        var qId= qBlock.id.replace('questionBlock','');
        var txtEl= qBlock.querySelector('input[type="text"]');
        var questionText= txtEl? txtEl.value:('Question '+qId);
        var selEl= qBlock.querySelector('select');
        var qType= selEl? selEl.value:'text';

        if(['dropdown','radio','checkbox','numberedDropdown'].indexOf(qType)!==-1){
            optionsHTML+='<option value="'+qId+'">Question '+qId+': '+questionText+'</option>';
        }
    });
    return optionsHTML;
}

/**
 * UPDATED to include ALL hidden fields as numeric references
 * And use question text instead of just ID in the display
 * Now also includes checkbox amount fields for calculations
 */
function generateMoneyQuestionOptions() {
    let optionsHTML = '';
    const qBlocks = document.querySelectorAll('.question-block');

    qBlocks.forEach(qBlock => {
        const qId = qBlock.id.replace('questionBlock','');
        const selEl = qBlock.querySelector('select#questionType' + qId);
        if (!selEl) return;

        // e.g. 'numberedDropdown', 'money', etc.
        const qType = selEl.value;
        
        // Get the question text for display
        const txtEl = qBlock.querySelector(`#question${qId}`);
        const qTxt = txtEl ? txtEl.value : (`Question ${qId}`);
        
        if (qType === 'money') {
            // If it's a money question, we can reference it directly
            const nmEl = qBlock.querySelector('#textboxName' + qId);
            const fieldName = nmEl ? nmEl.value.trim() : ('answer' + qId);
            optionsHTML += `<option value="${fieldName}">${qTxt} (money)</option>`;
        }
        else if (qType === 'numberedDropdown') {
            // 2) Grab min & max
            const stEl = qBlock.querySelector('#numberRangeStart' + qId);
            const enEl = qBlock.querySelector('#numberRangeEnd' + qId);
            const ddMin = stEl ? parseInt(stEl.value, 10) : 1;
            const ddMax = enEl ? parseInt(enEl.value, 10) : ddMin;

            // 3) Gather the "amount labels" from #textboxAmounts. 
            const amtInputs = qBlock.querySelectorAll(`#textboxAmounts${qId} input[type="text"]`);
            const amountLabels = [];
            amtInputs.forEach((inp) => {
                const val = inp.value.trim();
                if (val) amountLabels.push(val);
            });
            // If no labels were entered, skip
            if (amountLabels.length === 0) return;

            // 4) For each label, produce a line for i in [ddMin..ddMax].
            amountLabels.forEach((rawLabel) => {
                const sanitized = rawLabel.replace(/\s+/g, "_").toLowerCase();
                for (let i = ddMin; i <= ddMax; i++) {
                    const moneyId = `amount${qId}_${i}_${sanitized}`;
                    optionsHTML += `<option value="${moneyId}">${qTxt} - ${rawLabel} #${i}</option>`;
                }
            });
        }
        else if (qType === 'checkbox') {
            // For checkboxes, look for options with hasAmount enabled
            const checkboxOptionsDiv = qBlock.querySelector(`#checkboxOptions${qId}`);
            if (checkboxOptionsDiv) {
                // Use a more robust selector that finds all divs inside checkboxOptionsDiv
                const options = checkboxOptionsDiv.querySelectorAll('div');
                
                options.forEach((option, index) => {
                    // Get the option text for display
                    const optionTextEl = option.querySelector(`input[id^="checkboxOptionText${qId}_"]`);
                    const optionText = optionTextEl ? optionTextEl.value.trim() : `Option ${index + 1}`;
                    
                    // Get the nameId (this exists for all checkbox options)
                    const nameIdEl = option.querySelector(`input[id^="checkboxOptionName${qId}_"]`);
                    let nameId = '';
                    if (nameIdEl && nameIdEl.value.trim()) {
                        nameId = nameIdEl.value.trim();
                    } else {
                        // Generate default nameId if not provided
                        const sanitizedText = optionText.replace(/\W+/g, "_").toLowerCase();
                        nameId = `answer${qId}_${sanitizedText}`;
                    }
                    
                    // Find if this checkbox has an amount field
                    const hasAmountCheckbox = option.querySelector(`input[id^="checkboxOptionHasAmount${qId}_"]`);
                    if (hasAmountCheckbox && hasAmountCheckbox.checked) {
                        // For amount fields, we need to use the base part of the label without special characters
                        const baseLabel = optionText.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                        const amountId = `amount_${baseLabel}_${qId}_${index + 1}`;
                        // Add the amount field to the dropdown (value is the nameId, not amountId)
                        optionsHTML += `<option value="${nameId}">${qTxt} - ${optionText} (amount)</option>`;
                    }
                });
            }
        }
    });

    // Include all hidden fields as references
    const hiddenBlocks = document.querySelectorAll('.hidden-field-block');
    hiddenBlocks.forEach((block) => {
        const hid = block.id.replace('hiddenFieldBlock','');
        const fTypeEl = document.getElementById('hiddenFieldType' + hid);
        if (!fTypeEl) return;
        const fType = fTypeEl.value;
        const fNameEl = document.getElementById('hiddenFieldName' + hid);
        if (!fNameEl) return;
        const fName = fNameEl.value.trim();
        if (!fName) return;

        optionsHTML += `<option value="${fName}">(Hidden ${fType}) ${fName}</option>`;
    });

    return optionsHTML;
}


function updateAutofillOptions() {
    var hiddenBlocks = document.querySelectorAll('.hidden-field-block');
    hiddenBlocks.forEach(function(block){
        var hid= block.id.replace('hiddenFieldBlock','');
        var ft= document.getElementById('hiddenFieldType'+hid).value;

        // if text => refresh conditions
        if(ft==='text'){
            var condDiv= document.getElementById('conditionalAutofill'+hid);
            if(condDiv){
                var crows= condDiv.querySelectorAll('.condition');
                crows.forEach(function(crow){
                    var condId= crow.id.split('_')[1];
                    var qSel= document.getElementById('conditionQuestion'+hid+'_'+condId);
                    if(qSel){
                        var oldQ= qSel.value;
                        qSel.innerHTML=`
                          <option value="">-- Select a question --</option>
                          ${generateAllQuestionOptions()}
                        `;
                        if([].slice.call(qSel.options).some(function(o){return o.value===oldQ;})){
                            qSel.value= oldQ;
                            updateConditionAnswers(hid, condId);
                        }
                    }
                });
            }
        }
        else if(ft==='checkbox'){
            // refresh conditions
            var condDiv2= document.getElementById('conditionalAutofillForCheckbox'+hid);
            if(condDiv2){
                var crows2= condDiv2.querySelectorAll('.condition');
                crows2.forEach(function(c2){
                    var condId2= c2.id.split('_')[1];
                    var qSel2= document.getElementById('conditionQuestion'+hid+'_'+condId2);
                    if(qSel2){
                        var oldVal2=qSel2.value;
                        qSel2.innerHTML=`
                          <option value="">-- Select a question --</option>
                          ${generateAllQuestionOptions()}
                        `;
                        if([].slice.call(qSel2.options).some(function(o){return o.value===oldVal2;})){
                            qSel2.value= oldVal2;
                            updateConditionAnswers(hid, condId2);
                        }
                    }
                });
            }
        }
    });
}