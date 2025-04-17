<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Custom Form</title>
    <link rel="stylesheet" href="generate.css">
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
    <iframe id="pdfFrame" style="display:none"></iframe>
</div>
<input type="text" id="current_date" name="current_date" placeholder="current_date" style="display:none">

<!-- Firebase includes -->
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>

<div style="width: 80%; max-width: 800px; margin: 20px auto; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; display: block;">
    <h3 style="text-align: center; margin-bottom: 15px; color: #2c3e50;">Your Information</h3>
    <div style="display: flex; gap: 15px; margin-bottom: 15px;">
        <div style="flex: 1;">
            <label for="user_firstname" style="display: block; margin-bottom: 5px; font-weight: bold;">First Name</label>
            <input type="text" form="customForm" id="user_firstname" name="user_firstname" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div style="flex: 1;">
            <label for="user_lastname" style="display: block; margin-bottom: 5px; font-weight: bold;">Last Name</label>
            <input type="text" form="customForm" id="user_lastname" name="user_lastname" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
    </div>
    <div style="margin-bottom: 15px;">
        <label for="user_email" style="display: block; margin-bottom: 5px; font-weight: bold;">Email Address</label>
        <input type="email" id="user_email" name="user_email" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
    </div>
    <div style="margin-bottom: 15px;">
        <label for="user_phone" style="display: block; margin-bottom: 5px; font-weight: bold;">Phone Number</label>
        <input type="tel" id="user_phone" name="user_phone" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
    </div>
    <div style="margin-bottom: 15px;">
        <label for="user_street" style="display: block; margin-bottom: 5px; font-weight: bold;">Street Address</label>
        <input type="text" id="user_street" name="user_street" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
    </div>
    <div style="display: flex; gap: 15px; margin-bottom: 15px;">
        <div style="flex: 2;">
            <label for="user_city" style="display: block; margin-bottom: 5px; font-weight: bold;">City</label>
            <input type="text" id="user_city" name="user_city" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div style="flex: 1;">
            <label for="user_state" style="display: block; margin-bottom: 5px; font-weight: bold;">State</label>
            <input type="text" id="user_state" name="user_state" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div style="flex: 1;">
            <label for="user_zip" style="display: block; margin-bottom: 5px; font-weight: bold;">ZIP</label>
            <input type="text" id="user_zip" name="user_zip" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
    </div>
</div>
<div id="questions">
    <div id="result"></div>
    <section>
    <div id="box">
        <form id="customForm" onsubmit="return showThankYouMessage();"><div id="section1" class="section active"><h2>Section 1</h2><div id="question-container-1"><label><h3>Do you have a lawyer</h3></label>
          <select id="answer1" name="answer1">
            <option value="" disabled selected>Select an option</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select><br></div><br><br><div class="navigation-buttons"><button type="submit">Submit</button></div></div><div id="hidden_pdf_fields">

</div></form>
<div id="thankYouMessage" class="thank-you-message">Thank you for completing the survey</div>
</div>
</section>
</div>
<footer>
    &copy; 2024 FormWiz. All rights reserved.
</footer>
<script>

    const firebaseConfig = {
        apiKey: "AIzaSyDS-tSSn7fdLBgwzfHQ_1MPG1w8S_4qb04",
        authDomain: "formwiz-3f4fd.firebaseapp.com",
        projectId: "formwiz-3f4fd",
        storageBucket: "formwiz-3f4fd.appspot.com",
        messagingSenderId: "404259212529",
        appId: "1:404259212529:web:15a33bce82383b21cfed50",
        measurementId: "G-P07YEN0HPD"
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const urlParams = new URLSearchParams(window.location.search);
    const formId = urlParams.get("formId");
    let userId = null;
    firebase.auth().onAuthStateChanged(async function(user){
        if(user){ 
            userId=user.uid;
            // Fetch user data and display welcome message
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if(userDoc.exists) {
                    const userData = userDoc.data();
                    document.getElementById('user_firstname').value = userData.firstName || '';
                    document.getElementById('user_lastname').value = userData.lastName || '';
                    document.getElementById('user_email').value = userData.email || '';
                    document.getElementById('user_phone').value = userData.phone || '';
                    document.getElementById('user_street').value = userData.address?.street || '';
                    document.getElementById('user_city').value = userData.address?.city || '';
                    document.getElementById('user_state').value = userData.address?.state || '';
                    document.getElementById('user_zip').value = userData.address?.zip || '';
                }
            } catch(error) {
                console.error("Error fetching user data:", error);
            }
        } else {
           console.log("User not logged in.");
           window.location.href="account.html";
        }
    });
  var questionNameIds = {"1":"answer1"};
var jumpLogics = [];
var conditionalPDFs = [];
var conditionalAlerts = [];
var labelMap = {};
var amountMap = {};
var hiddenCheckboxCalculations = [];
var hiddenTextCalculations = [];



function toggleAmountField(amountFieldId, show) {
    const amountField = document.getElementById(amountFieldId);
    if (amountField) {
        amountField.style.display = show ? 'block' : 'none';
        if (!show) amountField.value = '';
    }
}

function showTextboxLabels(questionId, count){
    var container = document.getElementById("labelContainer" + questionId);
    if(!container) return;
    container.innerHTML = "";
    container.innerHTML += "<br>";
    var theseLabels = labelMap[questionId] || [];
    var theseAmounts = amountMap[questionId] || [];

    for (var j=1; j <= count; j++) {
        // Labels
        for (var L=0; L < theseLabels.length; L++) {
            var labelTxt = theseLabels[L] || "Label";
            var sanitizedLabel = labelTxt.replace(/\s+/g,"_").toLowerCase();
            // Add j to ID
            var labelId = "label" + questionId + "_" + j + "_" + sanitizedLabel;
            container.innerHTML += '<input type="text" id="' + labelId + '" ' +
                'name="' + labelId + '" ' +
                'placeholder="' + labelTxt + ' ' + j + '" ' +
                'style="text-align:center;"><br>';
        }

        // Amounts 
        for (var A=0; A < theseAmounts.length; A++) {
            var amtTxt = theseAmounts[A] || "Amount";
            var sanitizedAmt = amtTxt.replace(/\s+/g,"_").toLowerCase();
            // Add j to ID
            var amtId = "amount" + questionId + "_" + j + "_" + sanitizedAmt;
            container.innerHTML += '<input type="number" id="' + amtId + '" ' +
                'name="' + amtId + '" ' +
                'placeholder="' + amtTxt + ' ' + j + '" ' +
                'style="text-align:center;"><br>';
        }
        container.innerHTML += "<br>";
    }
    attachCalculationListeners(); // in case those new fields also matter
}

function handleNext(currentSection){
    // run hidden calculations first, so if we jump, they remain up-to-date
    runAllHiddenCheckboxCalculations();
    runAllHiddenTextCalculations();

    var nextSection = currentSection + 1;
    var relevantJumps = [];
    for(var i=0; i<jumpLogics.length; i++){
        if(jumpLogics[i].section === currentSection){
            relevantJumps.push(jumpLogics[i]);
        }
    }
    for(var j=0; j<relevantJumps.length; j++){
        var jl = relevantJumps[j];
        var qId = jl.questionId;
        var qType = jl.questionType;
        var jOpt = jl.jumpOption;
        var jTo  = jl.jumpTo;
        var nmId = questionNameIds[qId] || ("answer"+qId);

        if(qType==="radio" || qType==="dropdown" || qType==="numberedDropdown"){
            var el= document.getElementById(nmId);
            if(el && el.value.trim().toLowerCase() === jOpt.trim().toLowerCase()){
                nextSection = jTo.toLowerCase();
                break;
            }
        } else if(qType==="checkbox"){
            var cbs= document.querySelectorAll('input[id^="answer'+qId+'_"]');
            if(cbs && cbs.length){
                var chosen=[];
                for(var c=0;c<cbs.length;c++){
                    if(cbs[c].checked){
                        chosen.push(cbs[c].value.trim().toLowerCase());
                    }
                }
                if(chosen.indexOf(jOpt.trim().toLowerCase())!==-1){
                    nextSection = jTo.toLowerCase();
                    break;
                }
            }
        }
    }

    // Handle 'end' as a special string
    if(nextSection === 'end') {
        navigateSection('end');
    } else {
        nextSection = parseInt(nextSection, 10);
        if(isNaN(nextSection)) nextSection = currentSection + 1;
        navigateSection(nextSection);
    }
    
    // re-run if needed
    runAllHiddenCheckboxCalculations();
    runAllHiddenTextCalculations();
}

function navigateSection(sectionNumber){
    var sections= document.querySelectorAll(".section");
    var form = document.getElementById("customForm");
    var thankYou = document.getElementById("thankYouMessage");

    // Hide all sections and thank you message initially
    sections.forEach(s => s.classList.remove("active"));
    thankYou.style.display = "none";
    form.style.display = "block";

    if(sectionNumber === 'end') {
        // means skip directly to Thank You
        form.style.display = "none";
        thankYou.style.display = "block";
    } else if(sectionNumber >= sections.length){
        // if user typed something bigger than total sections
        sections[sections.length-1].classList.add("active");
    } else {
        var target= document.getElementById("section"+sectionNumber);
        if(target){
            target.classList.add("active");
        } else {
            sections[sections.length-1].classList.add("active");
        }
    }
}



function handleConditionalAlerts(){
    for(var i=0; i<conditionalAlerts.length; i++){
        var obj = conditionalAlerts[i];
        var prevQEl= document.getElementById("answer"+obj.prevQuestionId);
        if(prevQEl){
            if(prevQEl.value.trim().toLowerCase() === obj.prevAnswer.trim().toLowerCase()){
                alert(obj.alertText);
            }
        } else {
            var cbs= document.querySelectorAll('[name^="answer'+obj.prevQuestionId+'_"]');
            for(var x=0; x<cbs.length; x++){
                if(cbs[x].checked && cbs[x].value.trim().toLowerCase()=== obj.prevAnswer.trim().toLowerCase()){
                    alert(obj.alertText);
                }
            }
        }
    }
}










/*──────────────── helpers ───────────────*/
function setCurrentDate(){
    const t=new Date();
    document.getElementById('current_date').value =
        `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
}
window.onload=setCurrentDate;

/*──── main submit handler ────*/
function showThankYouMessage(){
    editAndDownloadPDF('form').then(()=>{
        document.getElementById('customForm').style.display='none';
        document.getElementById('thankYouMessage').style.display='block';
    });
    return false;                   // prevent normal submit / page reload
}

/*──── build FormData with **everything inside the form** ────*/
async function editAndDownloadPDF(pdfName){
    const fd=new FormData(document.getElementById('customForm'));

    const res = await fetch('/edit_pdf?pdf='+pdfName,{ method:'POST', body:fd });
    const blob= await res.blob();
    const url = URL.createObjectURL(blob);

    // download
    const a=document.createElement('a');
    a.href=url; a.download='Edited_'+pdfName+'.pdf';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);

    // on‑screen preview
    const f=document.getElementById('pdfFrame');
    f.src=url; f.style.display='block';
    document.getElementById('pdfPreview').style.display='block';
}




/***********************************************
 * Hidden Checkbox Calculations
 ***********************************************/
function runAllHiddenCheckboxCalculations(){
    if(!hiddenCheckboxCalculations || hiddenCheckboxCalculations.length===0) return;
    for(var i=0; i<hiddenCheckboxCalculations.length; i++){
        runSingleHiddenCheckboxCalculation(hiddenCheckboxCalculations[i]);
    }
}

function runSingleHiddenCheckboxCalculation(calcObj){
    var cbox = document.getElementById(calcObj.hiddenFieldName);
    if(!cbox) return;  // hidden field not found

    var finalState = cbox.checked;  // start with default

    // Evaluate each multi-term condition in 'calculations'
    for(var c=0; c<calcObj.calculations.length; c++){
        var oneCalc = calcObj.calculations[c];
        var val = 0;

        // Sum up the terms
        if(oneCalc.terms && oneCalc.terms.length>0){
            val = parseFloat( getMoneyValue(oneCalc.terms[0].questionNameId) )||0;
            for(var t=1; t<oneCalc.terms.length; t++){
                var term = oneCalc.terms[t];
                var op   = term.operator||'';
                var nextVal = parseFloat(getMoneyValue(term.questionNameId))||0;

                if(op==='+') val += nextVal;
                else if(op==='-') val -= nextVal;
                else if(op==='x') val *= nextVal;
                else if(op==='/'){
                    if(nextVal!==0) val /= nextVal;
                    else val=0;
                }
            }
        }

        // Compare val to threshold
        var thr = parseFloat(oneCalc.threshold)||0;
        var matched = false;
        if(oneCalc.compareOperator==='=') matched = (val===thr);
        else if(oneCalc.compareOperator==='<') matched = (val<thr);
        else if(oneCalc.compareOperator==='>') matched = (val>thr);

        // If matched, set final state
        if(matched){
            finalState = (oneCalc.result==='checked');
        }
    }

    // Set the hidden checkbox state
    cbox.checked = finalState;
}


/***********************************************
 * Hidden Text Calculations (with placeholders)
 ***********************************************/
function runAllHiddenTextCalculations(){
    if(!hiddenTextCalculations || hiddenTextCalculations.length===0) return;
    for(var i=0; i<hiddenTextCalculations.length; i++){
        runSingleHiddenTextCalculation(hiddenTextCalculations[i]);
    }
}

/**
 * Evaluate each multi-term calculation and set the hidden text field.
 * If fillValue format is "##fieldName##", we store the numeric sum of the terms
 * using the field's own name (or any other field name).
 */
function runSingleHiddenTextCalculation(calcObj) {
    var textField = document.getElementById(calcObj.hiddenFieldName);
    if (!textField) return;

    // We'll assume that the last matched condition takes precedence,
    // so we keep applying logic in order.
    let finalValue = "";

    calcObj.calculations.forEach(function(oneCalc) {
        let val = 0;
        if (oneCalc.terms && oneCalc.terms.length > 0) {
            val = parseFloat(getMoneyValue(oneCalc.terms[0].questionNameId)) || 0;

            for (let t = 1; t < oneCalc.terms.length; t++) {
                const term = oneCalc.terms[t];
                const op = term.operator;
                const termVal = parseFloat(getMoneyValue(term.questionNameId)) || 0;

                switch(op) {
                    case '+': val += termVal; break;
                    case '-': val -= termVal; break;
                    case 'x': val *= termVal; break;
                    case '/': val = (termVal !== 0) ? val / termVal : 0; break;
                }
            }
        }

        // Compare to threshold
        const thr = parseFloat(oneCalc.threshold) || 0;
        let matched = false;
        switch(oneCalc.compareOperator) {
            case '>':  matched = (val > thr);  break;
            case '<':  matched = (val < thr);  break;
            case '=':  matched = (val === thr); break;
        }

        if (matched) {
            // Check if fillValue is in ##fieldname## format - both "##total##" and general pattern
            if (oneCalc.fillValue === "##total##" || (oneCalc.fillValue && oneCalc.fillValue.match(/^##(.+)##$/))) {
                finalValue = val.toString();
            } else {
                finalValue = oneCalc.fillValue;
            }
        } else {
            // Not matched => clear it out
            finalValue = "";
        }
    });

    textField.value = finalValue;
}

function replacePlaceholderTokens(str){
    return str.replace(/\$\$(.*?)\$\$/g, function(match, expressionInside){
        return evaluatePlaceholderExpression(expressionInside);
    });
}

function evaluatePlaceholderExpression(exprString){
    var tokens = exprString.split(/(\+|\-|x|\/)/);
    if(!tokens.length) return '0';
    var currentVal = parseTokenValue(tokens[0]);
    var i=1;
    while(i<tokens.length){
        var operator = tokens[i].trim();
        var nextToken = tokens[i+1] || '';
        var nextVal = parseTokenValue(nextToken);

        if(operator==='+') currentVal += nextVal;
        else if(operator==='-') currentVal -= nextVal;
        else if(operator==='x') currentVal *= nextVal;
        else if(operator==='/'){
            if(nextVal!==0) currentVal /= nextVal;
            else currentVal=0;
        }
        i+=2;
    }
    return currentVal.toString();
}

function parseTokenValue(token){
    token = token.trim();
    if(!token) return 0;
    var el= document.getElementById(token);
    if(!el) return 0;
    var val= parseFloat(el.value);
    return isNaN(val) ? 0 : val;
}

/**
 * UPDATED to handle checkbox amount fields properly.
 * Handles both direct references and references where the actual element has "answerX_" prefix.
 */
function getMoneyValue(qId) {
    // First try direct element match
    const el = document.getElementById(qId);
    if (el) {
        // If it's a checkbox with an amount field
        if (el.type === 'checkbox') {
            // Check if there's a corresponding amount field
            const amountFieldId = el.id + "_amount";
            const amountField = document.getElementById(amountFieldId);
            
            if (amountField && el.checked) {
                return parseFloat(amountField.value) || 0;
            }
            // No amount field or not checked
            return el.checked ? 1 : 0;
        }
        
        // Regular input field
        return parseFloat(el.value) || 0;
    }
    
    // No direct match - try alternatives:
    
    // 1. Check if this is directly an amount field (with "_amount" suffix removed)
    if (qId.endsWith("_amount")) {
        const baseId = qId.slice(0, -7); // Remove "_amount"
        const amountField = document.getElementById(qId);
        if (amountField) {
            return parseFloat(amountField.value) || 0;
        }
    }
    
    // 2. Look for elements with the qId as their name
    const namedElements = document.getElementsByName(qId);
    if (namedElements && namedElements.length > 0) {
        const namedEl = namedElements[0];
        return parseFloat(namedEl.value) || 0;
    }
    
    // 3. Find prefixed IDs like "answerX_qId"
    const possiblePrefixedIds = Array.from(document.querySelectorAll('[id*="_' + qId + '"]'));
    for (let i = 0; i < possiblePrefixedIds.length; i++) {
        const prefixedEl = possiblePrefixedIds[i];
        if (prefixedEl.id.endsWith('_' + qId)) {
            if (prefixedEl.type === 'checkbox') {
                // If found checkbox, look for its amount field
                const amountFieldId = prefixedEl.id + "_amount";
                const amountField = document.getElementById(amountFieldId);
                
                if (amountField && prefixedEl.checked) {
                    return parseFloat(amountField.value) || 0;
                }
                return prefixedEl.checked ? 1 : 0;
            }
            return parseFloat(prefixedEl.value) || 0;
        }
    }
    
    // 4. Look for amount field directly by ID + "_amount"
    const amountFieldId = qId + "_amount";
    const amountField = document.getElementById(amountFieldId);
    if (amountField) {
        // Now we need to check if the associated checkbox is checked
        // Find checkbox that controls this amount field
        const checkboxSelector = 'input[type="checkbox"][onchange*="' + amountFieldId + '"]';
        const checkboxEl = document.querySelector(checkboxSelector);
        
        if (checkboxEl && checkboxEl.checked) {
            return parseFloat(amountField.value) || 0;
        }
        return 0; // Checkbox not checked, so amount is 0
    }
    
    // 5. Finally, try to find elements by name pattern
    const elementsWithAmountName = document.querySelectorAll('input[name="' + qId + '"]');
    if (elementsWithAmountName.length > 0) {
        const amountEl = elementsWithAmountName[0];
        if (amountEl.type === 'number') {
            // Find associated checkbox through naming convention
            const checkboxId = amountEl.id.replace('_amount', '');
            const checkboxEl = document.getElementById(checkboxId);
            
            if (checkboxEl && checkboxEl.checked) {
                return parseFloat(amountEl.value) || 0;
            }
        }
    }
    
    // Nothing found
    return 0;
}

function attachCalculationListeners() {
    // Universal function to attach listeners in a consistent way
    function attachListenersToCalculationTerms(calculations, runCalculationFunction) {
        for (let i = 0; i < calculations.length; i++) {
            const calcObj = calculations[i];
            for (let c = 0; c < calcObj.calculations.length; c++) {
                const oneCalc = calcObj.calculations[c];
                const terms = oneCalc.terms || [];
                
                for (let t = 0; t < terms.length; t++) {
                    const qNameId = terms[t].questionNameId;
                    
                    // 1. Try direct element
                    const el = document.getElementById(qNameId);
                    if (el) {
                        el.addEventListener('change', runCalculationFunction);
                        el.addEventListener('input', runCalculationFunction);
                        
                        // If it's a checkbox, also listen to its amount field
                        if (el.type === 'checkbox') {
                            const amountField = document.getElementById(el.id + '_amount');
                            if (amountField) {
                                amountField.addEventListener('input', runCalculationFunction);
                            }
                        }
                        continue; // Found and attached, go to next term
                    }
                    
                    // 2. Try elements with this name
                    const namedElements = document.getElementsByName(qNameId);
                    if (namedElements.length > 0) {
                        for (let n = 0; n < namedElements.length; n++) {
                            namedElements[n].addEventListener('change', runCalculationFunction);
                            namedElements[n].addEventListener('input', runCalculationFunction);
                        }
                        continue;
                    }
                    
                    // 3. Look for prefixed IDs like "answerX_qId"
                    const prefixPattern = new RegExp('.*_' + qNameId + '$');
                    const allInputs = document.querySelectorAll('input, select, textarea');
                    
                    for (let inp = 0; inp < allInputs.length; inp++) {
                        const input = allInputs[inp];
                        if (prefixPattern.test(input.id)) {
                            input.addEventListener('change', runCalculationFunction);
                            input.addEventListener('input', runCalculationFunction);
                            
                            // If it's a checkbox with amount field
                            if (input.type === 'checkbox') {
                                const amountField = document.getElementById(input.id + '_amount');
                                if (amountField) {
                                    amountField.addEventListener('input', runCalculationFunction);
                                }
                            }
                        }
                    }
                    
                    // 4. Look specifically for amount fields with this name
                    const amountElements = document.querySelectorAll('input[name="' + qNameId + '"]');
                    for (let a = 0; a < amountElements.length; a++) {
                        amountElements[a].addEventListener('input', runCalculationFunction);
                        
                        // Also find and attach to the controlling checkbox
                        if (amountElements[a].id.includes('_amount')) {
                            const checkboxId = amountElements[a].id.replace('_amount', '');
                            const checkbox = document.getElementById(checkboxId);
                            if (checkbox) {
                                checkbox.addEventListener('change', runCalculationFunction);
                            }
                        }
                    }
                    
                    // 5. Try direct amount field
                    const directAmountField = document.getElementById(qNameId + '_amount');
                    if (directAmountField) {
                        directAmountField.addEventListener('input', runCalculationFunction);
                        
                        // Find the checkbox controlling this amount field
                        const checkboxSelector = 'input[type="checkbox"][onchange*="' + directAmountField.id + '"]';
                        const checkbox = document.querySelector(checkboxSelector);
                        if (checkbox) {
                            checkbox.addEventListener('change', runCalculationFunction);
                        }
                    }
                }
            }
        }
    }
    
    // For hidden checkbox calculations
    if (hiddenCheckboxCalculations && hiddenCheckboxCalculations.length > 0) {
        const runAllCheckboxCalcs = function() {
            runAllHiddenCheckboxCalculations();
        };
        attachListenersToCalculationTerms(hiddenCheckboxCalculations, runAllCheckboxCalcs);
    }
    
    // For hidden text calculations
    if (hiddenTextCalculations && hiddenTextCalculations.length > 0) {
        const runAllTextCalcs = function() {
            runAllHiddenTextCalculations();
        };
        attachListenersToCalculationTerms(hiddenTextCalculations, runAllTextCalcs);
    }
    
    // Run calculations once on page load to set initial values
    runAllHiddenCheckboxCalculations();
    runAllHiddenTextCalculations();
}
</script>
</body>
</html>
