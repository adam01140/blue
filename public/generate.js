/*********************************************
 * generate.js - with hidden checkbox & text 
 *   multi-term calculations,
 *   plus $$placeholders$$ supporting expressions
 *   and a single <script> block for logic
 *********************************************/

function getFormHTML() {
    // Top HTML (head, body, header, etc.)
    let formHTML = [
        '<!DOCTYPE html>',
        '<html lang="en">',
        '<head>',
        '    <meta charset="UTF-8">',
        '    <title>Custom Form</title>',
        '    <link rel="stylesheet" href="generate.css">',
        '</head>',
        '<body>',
        '<header>',
        '    <img src="logo.png" alt="FormWiz Logo" width="130" height="80" onclick="location.href=\'index.html\';">',
        '    <nav>',
        '        <a href="index.html">Home</a>',
        '        <a href="forms.html">Forms</a>',
        '        <a href="contact.html">Contact Us</a>',
        '    </nav>',
        '</header>',
        '',
        '<div id="pdfPreview" style="display:none;">',
        '    <iframe id="pdfFrame" style="display:none"></iframe>',
        '</div>',
        '<input type="text" id="current_date" name="current_date" placeholder="current_date" style="display:none">',
        '',
        '<!-- Firebase includes -->',
        '<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>',
        '<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>',
        '<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>',
        '',
        '<div id="questions">',
        '    <div id="result"></div>',
        '    <section>',
        '    <div id="box">',
        '        <form id="customForm" onsubmit="return showThankYouMessage();">'
    ].join('\n');

    // These will hold the data we need for logic and hidden fields:
    const questionNameIds = {};
    const questionTypesMap = {};
    const conditionalPDFs = [];
    const conditionalAlerts = [];
    const jumpLogics = [];
    const labelMap = {};

    // We also create a buffer to store our conditional-logic code
    // so we can insert it later in one <script> block.
    let logicScriptBuffer = '';

    // Possibly read user’s PDF name from an element on the page:
    const pdfFormNameInputEl = document.getElementById('formPDFName');
    const pdfFormName = pdfFormNameInputEl ? pdfFormNameInputEl.value.trim() : 'test.pdf';
    const escapedPdfFormName = pdfFormName
        .replace(/\\/g, '\\\\')
        .replace(/'/g, '\\\'')
        .replace(/"/g, '\\"');

    // Build each Section & its questions
    for (let s=1; s < sectionCounter; s++){
        let sectionBlock = document.getElementById('sectionBlock'+s);
        if (!sectionBlock) continue;

        const sectionNameEl = sectionBlock.querySelector('#sectionName'+s);
        const sectionName = sectionNameEl ? sectionNameEl.value : 'Section '+s;

        // Start the section
        formHTML += `<div id="section${s}" class="section${ s===1?' active':'' }">`;
        formHTML += `<h2>${sectionName}</h2>`;

        // Grab all questions in this section
        const questionsInSection = sectionBlock.querySelectorAll('.question-block');
        for (let qIdx=0; qIdx < questionsInSection.length; qIdx++){
            const qBlock = questionsInSection[qIdx];
            const questionId = qBlock.id.replace('questionBlock','');

            const questionTextEl = qBlock.querySelector('#question'+questionId);
            const questionText = questionTextEl ? questionTextEl.value : '';

            const questionTypeEl = qBlock.querySelector('#questionType'+questionId);
            const questionType = questionTypeEl ? questionTypeEl.value : 'text';

            // store the question type
            questionTypesMap[questionId] = questionType;

            // logic
            const logicCheckbox = qBlock.querySelector('#logic'+questionId);
            const logicEnabled = logicCheckbox && logicCheckbox.checked;

            // jump
            const jumpEnabledEl = qBlock.querySelector('#enableJump'+questionId);
            const jumpEnabled = jumpEnabledEl && jumpEnabledEl.checked;
            const jumpToEl = qBlock.querySelector('#jumpTo'+questionId);
            const jumpOptionEl = qBlock.querySelector('#jumpOption'+questionId);
            const jumpTo = jumpToEl ? jumpToEl.value : '';
            const jumpOption = jumpOptionEl ? jumpOptionEl.value : '';

            if (jumpEnabled && jumpTo){
                jumpLogics.push({
                    questionId: questionId,
                    questionType: questionType,
                    jumpOption: jumpOption,
                    jumpTo: jumpTo,
                    section: s
                });
            }

            // conditional PDF
            const pdfCheckEl = qBlock.querySelector('#enableConditionalPDF'+questionId);
            const pdfEnabled = pdfCheckEl && pdfCheckEl.checked;

            const pdfNameEl = qBlock.querySelector('#conditionalPDFName'+questionId);
            const pdfAnsEl = qBlock.querySelector('#conditionalPDFAnswer'+questionId);
            const pdfNameVal = pdfNameEl ? pdfNameEl.value : '';
            const pdfAnsVal = pdfAnsEl ? pdfAnsEl.value : '';

            // conditional Alert
            const alertCheckEl = qBlock.querySelector('#enableConditionalAlert'+questionId);
            const alertEnabled = alertCheckEl && alertCheckEl.checked;
            const alertPrevQEl = qBlock.querySelector('#alertPrevQuestion'+questionId);
            const alertPrevAEl = qBlock.querySelector('#alertPrevAnswer'+questionId);
            const alertTextEl = qBlock.querySelector('#alertText'+questionId);

            const alertPrevQ = alertPrevQEl ? alertPrevQEl.value : '';
            const alertPrevA = alertPrevAEl ? alertPrevAEl.value : '';
            const alertTxt = alertTextEl ? alertTextEl.value : '';

            if (alertEnabled && alertPrevQ && alertPrevA && alertTxt){
                conditionalAlerts.push({
                    questionId: questionId,
                    prevQuestionId: alertPrevQ,
                    prevAnswer: alertPrevA,
                    alertText: alertTxt
                });
            }

            // Start the question container
            // if logicEnabled, we might later hide it via inline script
            formHTML += `<div id="question-container-${questionId}"${ logicEnabled?' class="hidden"':'' }>`;
            formHTML += `<label><h3>${questionText}</h3></label>`;

            // Render the question by type
            if (questionType==='text'){
                const nmEl= qBlock.querySelector('#textboxName'+questionId);
                const phEl= qBlock.querySelector('#textboxPlaceholder'+questionId);
                const nameId = nmEl && nmEl.value ? nmEl.value : ('answer'+questionId);
                const placeholder= phEl && phEl.value ? phEl.value : '';
                questionNameIds[questionId] = nameId;
                formHTML += `<input type="text" id="${nameId}" name="${nameId}" placeholder="${placeholder}"><br>`;
            }
            else if (questionType==='bigParagraph'){
                const nmEl2= qBlock.querySelector('#textboxName'+questionId);
                const phEl2= qBlock.querySelector('#textboxPlaceholder'+questionId);
                const nameId2= nmEl2 && nmEl2.value ? nmEl2.value : ('answer'+questionId);
                const ph2= phEl2 && phEl2.value ? phEl2.value : '';
                questionNameIds[questionId] = nameId2;
                formHTML += `<textarea id="${nameId2}" name="${nameId2}" rows="5" cols="50" placeholder="${ph2}"></textarea><br>`;
            }
            else if (questionType==='money'){
                const mnNmEl= qBlock.querySelector('#textboxName'+questionId);
                const mnPhEl= qBlock.querySelector('#textboxPlaceholder'+questionId);
                const mnName= mnNmEl && mnNmEl.value ? mnNmEl.value : ('answer'+questionId);
                const mnPh= mnPhEl && mnPhEl.value ? mnPhEl.value : 'Enter amount';
                questionNameIds[questionId] = mnName;
                formHTML += `<input type="number" id="${mnName}" name="${mnName}" min="0" step="0.01" placeholder="${mnPh}"><br>`;
            }
            else if (questionType==='date'){
                questionNameIds[questionId] = 'answer'+questionId;
                formHTML += `<input type="date" id="answer${questionId}" name="answer${questionId}"><br>`;
            }
            else if (questionType==='radio'){
                const radNameEl = qBlock.querySelector('#textboxName'+questionId);
                const radName = radNameEl && radNameEl.value ? radNameEl.value : ('answer'+questionId);
                questionNameIds[questionId] = radName;
                formHTML += `
                    <select id="${radName}" name="${radName}">
                      <option value="" disabled selected>Select an option</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select><br>`;
                if (pdfEnabled){
                    conditionalPDFs.push({
                        questionId: questionId,
                        questionNameId: radName,
                        conditionalAnswer: pdfAnsVal,
                        pdfName: pdfNameVal,
                        questionType: questionType
                    });
                }
            }
            
			
			
			
			
			
			else if (questionType === 'dropdown') {
    const ddNameEl = qBlock.querySelector('#textboxName' + questionId);
    const ddNm = ddNameEl && ddNameEl.value ? ddNameEl.value : ('answer' + questionId);
    questionNameIds[questionId] = ddNm;

    // 1) Grab the user-entered image data:
    const imgUrlEl = qBlock.querySelector('#dropdownImageURL' + questionId);
    const imgWidthEl = qBlock.querySelector('#dropdownImageWidth' + questionId);
    const imgHeightEl = qBlock.querySelector('#dropdownImageHeight' + questionId);

    let imageUrl = imgUrlEl ? imgUrlEl.value.trim() : '';
    let imageWidth = imgWidthEl ? parseInt(imgWidthEl.value, 10) : 0;
    let imageHeight = imgHeightEl ? parseInt(imgHeightEl.value, 10) : 0;

    // 2) Insert <img> if user filled in URL
    if (imageUrl) {
        if (!imageWidth || imageWidth < 1) imageWidth = 300;
        if (!imageHeight || imageHeight < 1) imageHeight = 300;
        formHTML += `<br><img src="${imageUrl}" alt="Dropdown Image" width="${imageWidth}" height="${imageHeight}"><br>`;
    }

    // 3) Now the <select> itself
    formHTML += `<select id="${ddNm}" name="${ddNm}">
                   <option value="" disabled selected>Select an option</option>`;

    const ddOps = qBlock.querySelectorAll(`#dropdownOptions${questionId} input`);
    for (let i = 0; i < ddOps.length; i++) {
        const val = ddOps[i].value.trim();
        if (val) {
            formHTML += `<option value="${val}">${val}</option>`;
        }
    }
    formHTML += `</select><br>`;

    // Handle PDF logic as usual
    if (pdfEnabled) {
        conditionalPDFs.push({
            questionId: questionId,
            questionNameId: ddNm,
            conditionalAnswer: pdfAnsVal,
            pdfName: pdfNameVal,
            questionType: questionType
        });
    }
}


			
			
			
            else if (questionType==='checkbox'){
                const cOptsDivs= qBlock.querySelectorAll(`#checkboxOptions${questionId} > div`);
                const cboxOptions=[];
                formHTML += `<div><center><div id="checkmark">`;
                for (let co=0; co<cOptsDivs.length; co++){
                    const optDiv= cOptsDivs[co];
                    const txtEl= optDiv.querySelector(`#checkboxOptionText${questionId}_${co+1}`);
                    const nameEl= optDiv.querySelector(`#checkboxOptionName${questionId}_${co+1}`);
                    const valEl= optDiv.querySelector(`#checkboxOptionValue${questionId}_${co+1}`);

                    const labelText= txtEl && txtEl.value.trim() ? txtEl.value.trim() : ('Option '+(co+1));
                    let rawNameId= nameEl && nameEl.value.trim() ? nameEl.value.trim() : '';
                    let rawVal= valEl && valEl.value.trim() ? valEl.value.trim() : labelText;

                    const forcedPrefix= 'answer'+questionId+'_';
                    if(!rawNameId){
                        const sanitized= labelText.replace(/\W+/g,"_").toLowerCase();
                        rawNameId= forcedPrefix+sanitized;
                    } else if(!rawNameId.startsWith(forcedPrefix)){
                        rawNameId= forcedPrefix+rawNameId;
                    }
                    cboxOptions.push({ labelText: labelText, optionNameId: rawNameId, optionValue: rawVal});
                    formHTML += `
                      <span class="checkbox-inline">
                        <label class="checkbox-label">
                          <input type="checkbox" id="${rawNameId}" name="${rawNameId}" value="${rawVal}">
                          ${labelText}
                        </label>
                      </span>`;
                }
                const noneEl= qBlock.querySelector(`#noneOfTheAbove${questionId}`);
                if(noneEl && noneEl.checked){
                    const noneStr='None of the above';
                    const forcedPrefix2='answer'+questionId+'_';
                    const sant= noneStr.replace(/\W+/g,"_").toLowerCase();
                    const notNameId= forcedPrefix2 + sant;
                    cboxOptions.push({ labelText:noneStr, optionNameId:notNameId, optionValue:noneStr});
                    formHTML += `
                      <span class="checkbox-inline">
                        <label class="checkbox-label">
                          <input type="checkbox" id="${notNameId}" name="${notNameId}" value="${noneStr}">
                          ${noneStr}
                        </label>
                      </span>`;
                }
                formHTML += `</div><br></div>`;

                // If conditional PDF was enabled
                if (pdfEnabled){
                    for(let ck=0; ck<cboxOptions.length; ck++){
                        if(cboxOptions[ck].labelText=== pdfAnsVal){
                            conditionalPDFs.push({
                                questionId: questionId,
                                questionNameId: cboxOptions[ck].optionNameId,
                                conditionalAnswer: cboxOptions[ck].optionValue,
                                pdfName: pdfNameVal,
                                questionType: questionType
                            });
                            break;
                        }
                    }
                }
            }
            else if (questionType==='multipleTextboxes'){
                const multiBlocks= qBlock.querySelectorAll(`#multipleTextboxesOptions${questionId} > div`);
                for(let mb=0; mb<multiBlocks.length; mb++){
                    const dEl= multiBlocks[mb];
                    const lblInput= dEl.querySelector(`#multipleTextboxLabel${questionId}_${mb+1}`);
                    const nmInput= dEl.querySelector(`#multipleTextboxName${questionId}_${mb+1}`);
                    const phInput= dEl.querySelector(`#multipleTextboxPlaceholder${questionId}_${mb+1}`);

                    const lblVal= lblInput ? lblInput.value.trim() : '';
                    const nmVal= nmInput ? nmInput.value.trim() : ('answer'+questionId+'_'+(mb+1));
                    const phVal= phInput ? phInput.value.trim() : '';

                    if(lblVal){
                        formHTML+= `<label><h3>${lblVal}</h3></label><br>`;
                    }
                    formHTML+= `<input type="text" id="${nmVal}" name="${nmVal}" placeholder="${phVal}" style="text-align:center;"><br>`;
                }
            }
            else if (questionType==='numberedDropdown'){
                const stEl= qBlock.querySelector('#numberRangeStart'+questionId);
                const enEl= qBlock.querySelector('#numberRangeEnd'+questionId);
                const ddMin= stEl ? parseInt(stEl.value,10) : 1;
                const ddMax= enEl ? parseInt(enEl.value,10) : 1;

                // gather labels
                const lblInputs= qBlock.querySelectorAll('#textboxLabels'+questionId+' input');
                const labelVals=[];
                for(let L=0; L<lblInputs.length; L++){
                    labelVals.push(lblInputs[L].value);
                }
                labelMap[questionId] = labelVals;

                questionNameIds[questionId] = 'answer'+questionId;
                formHTML += `<select id="answer${questionId}" onchange="showTextboxLabels(${questionId}, this.value)">
                              <option value="" disabled selected>Select an option</option>`;
                for(let rnum=ddMin; rnum<=ddMax; rnum++){
                    formHTML += `<option value="${rnum}">${rnum}</option>`;
                }
                formHTML += `</select><br><div id="labelContainer${questionId}"></div>`;
            }

            // end question container
            formHTML += '</div>';

            // If logic is enabled, gather “multiple-OR” conditions
            if (logicEnabled){
                const logicRows= qBlock.querySelectorAll('.logic-condition-row');
                if (logicRows.length>0){
                    // We'll store the code in our logicScriptBuffer (no <script> tag!)
                    logicScriptBuffer += `\n(function(){\n`;
                    logicScriptBuffer += ` var thisQ=document.getElementById("question-container-${questionId}");\n`;
                    logicScriptBuffer += ` function updateVisibility(){\n  var anyMatch=false;\n`;

                    for(let lr=0; lr<logicRows.length; lr++){
                        const row= logicRows[lr];
                        const rowIndex= lr+1;
                        const pqEl= row.querySelector('#prevQuestion'+questionId+'_'+rowIndex);
                        const paEl= row.querySelector('#prevAnswer'+questionId+'_'+rowIndex);

                        if(!pqEl||!paEl) continue;
                        const pqVal= pqEl.value.trim();
                        const paVal= paEl.value.trim().toLowerCase();
                        if(!pqVal || !paVal) continue;

                        const pType= questionTypesMap[pqVal] || 'text';

                        logicScriptBuffer += ` (function(){\n`;
                        logicScriptBuffer += `   var cPrevType="${pType}";\n`;
                        logicScriptBuffer += `   var cPrevAns="${paVal}";\n`;
                        logicScriptBuffer += `   var cPrevQNum="${pqVal}";\n`;
                        logicScriptBuffer += `   if(cPrevType==="checkbox"){\n`;
                        logicScriptBuffer += `     var cbs=document.querySelectorAll('input[id^="answer'+cPrevQNum+'_"]');\n`;
                        logicScriptBuffer += `     var checkedVals=[];\n`;
                        logicScriptBuffer += `     for(var cc=0; cc<cbs.length; cc++){ if(cbs[cc].checked) checkedVals.push(cbs[cc].value.trim().toLowerCase());}\n`;
                        logicScriptBuffer += `     if(checkedVals.indexOf(cPrevAns)!==-1){ anyMatch=true;}\n`;
                        logicScriptBuffer += `   } else {\n`;
                        logicScriptBuffer += `     var el2=document.getElementById("answer"+cPrevQNum) || document.getElementById(questionNameIds[cPrevQNum]);\n`;
                        logicScriptBuffer += `     if(el2){ var val2= el2.value.trim().toLowerCase(); if(val2===cPrevAns){ anyMatch=true;} }\n`;
                        logicScriptBuffer += `   }\n`;
                        logicScriptBuffer += ` })();\n`;
                    }

                    logicScriptBuffer += ` if(anyMatch){ thisQ.classList.remove("hidden"); } else { thisQ.classList.add("hidden"); }\n`;
                    logicScriptBuffer += `}\n`;

                    // attach event listeners
                    for(let lr2=0; lr2<logicRows.length; lr2++){
                        const row2= logicRows[lr2];
                        const rowIndex2= lr2+1;
                        const pqEl2= row2.querySelector('#prevQuestion'+questionId+'_'+rowIndex2);
                        if(!pqEl2) continue;
                        const pqVal2= pqEl2.value.trim();
                        if(!pqVal2) continue;

                        const pType2= questionTypesMap[pqVal2] || 'text';
                        if(pType2==='checkbox'){
                            logicScriptBuffer += ` (function(){\n`;
                            logicScriptBuffer += `   var cbs=document.querySelectorAll('input[id^="answer${pqVal2}_"]');\n`;
                            logicScriptBuffer += `   for(var i=0;i<cbs.length;i++){ cbs[i].addEventListener("change", function(){ updateVisibility();});}\n`;
                            logicScriptBuffer += ` })();\n`;
                        } else {
                            logicScriptBuffer += ` (function(){\n`;
                            logicScriptBuffer += `   var el3= document.getElementById("answer${pqVal2}") || document.getElementById(questionNameIds["${pqVal2}"]);\n`;
                            logicScriptBuffer += `   if(el3){ el3.addEventListener("change", function(){ updateVisibility();});}\n`;
                            logicScriptBuffer += ` })();\n`;
                        }
                    }

                    logicScriptBuffer += ` updateVisibility();\n`;
                    logicScriptBuffer += `})();\n`;
                }
            }
        } // end each question

        // Section nav
        formHTML += '<br><br><div class="navigation-buttons">';
        if (s>1){
            formHTML += `<button type="button" onclick="navigateSection(${s-1})">Back</button>`;
        }
        if (s === sectionCounter-1){
            formHTML += `<button type="submit">Submit</button>`;
        } else {
            formHTML += `<button type="button" onclick="handleNext(${s})">Next</button>`;
        }
        formHTML += '</div>';

        formHTML += '</div>'; // end this section
    }

    // Insert hidden fields (including multi-term calculations)
    const genHidden = generateHiddenPDFFields();
    formHTML += genHidden.hiddenFieldsHTML;

    // Close the form & add the thank-you message
    formHTML += [
        '</form>',
        '<div id="thankYouMessage" class="thank-you-message">Thank you for completing the survey</div>',
        '</div>',
        '</section>',
        '</div>',
        '<footer>',
        '    &copy; 2024 FormWiz. All rights reserved.',
        '</footer>'
    ].join('\n');

    // Now we place ONE <script> block for everything:
    formHTML += '\n<script>\n';
    // 1) Firebase config and check
    formHTML += `
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
    firebase.auth().onAuthStateChanged(function(user){
        if(user){ userId=user.uid;} else {
           console.log("User not logged in.");
           window.location.href="account.html";
        }
    });
    `;

    // 2) Our global objects
    formHTML += `var questionNameIds = ${JSON.stringify(questionNameIds)};\n`;
    formHTML += `var jumpLogics = ${JSON.stringify(jumpLogics)};\n`;
    formHTML += `var conditionalPDFs = ${JSON.stringify(conditionalPDFs)};\n`;
    formHTML += `var conditionalAlerts = ${JSON.stringify(conditionalAlerts)};\n`;
    formHTML += `var labelMap = ${JSON.stringify(labelMap)};\n`;
    formHTML += `var hiddenCheckboxCalculations = ${JSON.stringify(genHidden.hiddenCheckboxCalculations||[])};\n`;
    formHTML += `var hiddenTextCalculations = ${JSON.stringify(genHidden.hiddenTextCalculations||[])};\n\n`;

    // 3) Append the logicScriptBuffer (the code that runs updateVisibility, etc.)
    formHTML += logicScriptBuffer + '\n';

    // 4) The rest of the main JS code: handleNext, navigateSection, etc.
    formHTML += `
    // Provide the showTextboxLabels() function so we don't get "not defined" errors:
    function showTextboxLabels(questionId, count){
        var container = document.getElementById("labelContainer" + questionId);
        if(!container) return;
        container.innerHTML = "";
        // Retrieve the labels from labelMap:
        var theseLabels = labelMap[questionId] || [];
        for(var j=1; j<=count; j++){
            for(var L=0; L<theseLabels.length; L++){
                var labelTxt = theseLabels[L] || "Value";
                // Create a unique ID for each generated input
                var sanitized = labelTxt.replace(/\\s+/g,"_").toLowerCase();
                var inputId = "label"+questionId+"_"+j+"_"+sanitized;
        
				container.innerHTML += '<input type=\\"text"\\ id=\\"' + inputId + '\\" name=\\"' + inputId + '\\" placeholder=\\"' + labelTxt + ' ' + j + '\\" style=\\"text-align:center;\"><br>';

            }
        }
    }

    function handleNext(currentSection){
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

            if(qType==="radio" || qType==="dropdown"){
                var el= document.getElementById(nmId);
                if(el && el.value.trim().toLowerCase() === jOpt.trim().toLowerCase()){
                    nextSection = jTo; 
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
                        nextSection = jTo;
                        break;
                    }
                }
            }
        }
        navigateSection(nextSection);

        // run hidden calculations each Next if you want real-time
        runAllHiddenCheckboxCalculations();
        runAllHiddenTextCalculations();
    }

    function navigateSection(sectionNumber){
        var sections= document.querySelectorAll(".section");
        for(var i=0; i<sections.length; i++){
            sections[i].classList.remove("active");
        }
        var target= document.getElementById("section"+sectionNumber);
        if(target){
            target.classList.add("active");
        } else {
            sections[sections.length-1].classList.add("active");
        }
    }

    function setCurrentDate(){
        var today = new Date();
        var dd= String(today.getDate()).padStart(2,"0");
        var mm= String(today.getMonth()+1).padStart(2,"0");
        var yyyy= today.getFullYear();
        var val= yyyy+"-"+mm+"-"+dd;
        document.getElementById("current_date").value= val;
    }
    window.onload=function(){
        setCurrentDate();
        attachCalculationListeners();
    };

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

    function showThankYouMessage(){
        // run final hidden calculations
        runAllHiddenCheckboxCalculations();
        runAllHiddenTextCalculations();

        // PDF name
        var pdfName = "${escapedPdfFormName}".replace(".pdf","");
        editAndDownloadPDF(pdfName).then(function(){
            // handle conditional PDFs
            for(var i=0; i<conditionalPDFs.length; i++){
                var pdfObj= conditionalPDFs[i];
                if(pdfObj.questionType==="checkbox"){
                    var cbox= document.getElementById(pdfObj.questionNameId);
                    if(cbox && cbox.checked && cbox.value=== pdfObj.conditionalAnswer){
                        editAndDownloadPDF(pdfObj.pdfName.replace(".pdf",""));
                    }
                } else {
                    var valEl= document.getElementById(pdfObj.questionNameId);
                    var val2= valEl ? valEl.value : "";
                    if(val2 === pdfObj.conditionalAnswer){
                        editAndDownloadPDF(pdfObj.pdfName.replace(".pdf",""));
                    }
                }
            }
            handleConditionalAlerts();
            document.getElementById("customForm").style.display="none";
            document.getElementById("thankYouMessage").style.display="block";
        });
        return false;
    }

    function downloadPDF(url, filename){
        var link= document.createElement("a");
        link.href= url;
        link.download= filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    async function editAndDownloadPDF(pdfName){
        var formData= new FormData();
        var inputs= document.querySelectorAll("#questions input, #questions select, #questions textarea");
        for(var i=0; i<inputs.length; i++){
            var inp= inputs[i];
            if(inp.type==="checkbox"){
                formData.append(inp.name, inp.checked?"Yes":"No");
            } else {
                formData.append(inp.name, inp.value);
            }
        }
        return fetch("/edit_pdf?pdf="+pdfName, {method:"POST", body:formData})
            .then(function(res){ return res.blob(); })
            .then(function(blob){
                var url= URL.createObjectURL(blob);
                downloadPDF(url, "Edited_"+pdfName+".pdf");
            });
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
        var cbox= document.getElementById(calcObj.hiddenFieldName);
        if(!cbox) return;
        var finalState= cbox.checked;
        for(var c=0; c<calcObj.calculations.length; c++){
            var oneCalc= calcObj.calculations[c];
            var val=0;
            if(oneCalc.terms && oneCalc.terms.length>0){
                val= parseFloat( getMoneyValue(oneCalc.terms[0].questionNameId) )||0;
                for(var t=1; t<oneCalc.terms.length; t++){
                    var term= oneCalc.terms[t];
                    var op= term.operator||'';
                    var nextVal= parseFloat(getMoneyValue(term.questionNameId))||0;
                    if(op==='+') val += nextVal;
                    else if(op==='-') val -= nextVal;
                    else if(op==='x') val *= nextVal;
                    else if(op==='/'){
                        if(nextVal!==0) val /= nextVal;
                        else val=0;
                    }
                }
            }
            var thr= parseFloat(oneCalc.threshold)||0;
            var matched=false;
            if(oneCalc.compareOperator==='=') matched=(val===thr);
            else if(oneCalc.compareOperator==='<') matched=(val<thr);
            else if(oneCalc.compareOperator==='>') matched=(val>thr);
            if(matched){
                finalState= (oneCalc.result==='checked');
            }
        }
        cbox.checked= finalState;
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
    function runSingleHiddenTextCalculation(calcObj){
        var textField= document.getElementById(calcObj.hiddenFieldName);
        if(!textField) return;
        var finalValue= textField.value; 
        for(var c=0; c<calcObj.calculations.length; c++){
            var oneCalc= calcObj.calculations[c];
            var val=0;
            if(oneCalc.terms && oneCalc.terms.length>0){
                val= parseFloat(getMoneyValue(oneCalc.terms[0].questionNameId))||0;
                for(var t=1; t<oneCalc.terms.length; t++){
                    var term= oneCalc.terms[t];
                    var op= term.operator||'';
                    var nextVal= parseFloat(getMoneyValue(term.questionNameId))||0;
                    if(op==='+') val += nextVal;
                    else if(op==='-') val -= nextVal;
                    else if(op==='x') val *= nextVal;
                    else if(op==='/'){
                        if(nextVal!==0) val /= nextVal;
                        else val=0;
                    }
                }
            }
            var thr= parseFloat(oneCalc.threshold)||0;
            var matched=false;
            if(oneCalc.compareOperator==='=') matched=(val===thr);
            else if(oneCalc.compareOperator==='<') matched=(val<thr);
            else if(oneCalc.compareOperator==='>') matched=(val>thr);

            if(matched){
                // Evaluate placeholders
                var rawFill= oneCalc.fillValue || '';
                finalValue= replacePlaceholderTokens(rawFill);
            }
        }
        textField.value= finalValue;
    }

    function replacePlaceholderTokens(str){
        return str.replace(/\\$\\$(.*?)\\$\\$/g, function(match, expressionInside){
            return evaluatePlaceholderExpression(expressionInside);
        });
    }

    function evaluatePlaceholderExpression(exprString){
        var tokens = exprString.split(/(\\+|\\-|x|\\/)/);
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

    function getMoneyValue(qId){
        var el= document.getElementById(qId);
        if(!el) return 0;
        return el.value;
    }

    function attachCalculationListeners(){
        // For hidden checkbox calculations
        if(hiddenCheckboxCalculations){
            for(var i=0; i<hiddenCheckboxCalculations.length; i++){
                var cObj= hiddenCheckboxCalculations[i];
                for(var c=0; c<cObj.calculations.length; c++){
                    var oneCalc= cObj.calculations[c];
                    var terms= oneCalc.terms||[];
                    for(var t=0; t<terms.length; t++){
                        var qNameId= terms[t].questionNameId;
                        var el2= document.getElementById(qNameId);
                        if(el2){
                            el2.addEventListener('change', function(){
                                runAllHiddenCheckboxCalculations();
                            });
                        }
                    }
                }
            }
        }
        // For hidden text calculations
        if(hiddenTextCalculations){
            for(var i2=0; i2<hiddenTextCalculations.length; i2++){
                var txtObj= hiddenTextCalculations[i2];
                for(var c2=0; c2<txtObj.calculations.length; c2++){
                    var oneCalc2= txtObj.calculations[c2];
                    var terms2= oneCalc2.terms||[];
                    for(var t2=0; t2<terms2.length; t2++){
                        var qNameId2= terms2[t2].questionNameId;
                        var el3= document.getElementById(qNameId2);
                        if(el3){
                            el3.addEventListener('change', function(){
                                runAllHiddenTextCalculations();
                            });
                        }
                    }
                }
            }
        }
    }
    </script>
</body>
</html>
`;

    // Finally, return the assembled HTML
    return formHTML;
}

/********************************************************************
 * generateHiddenPDFFields() 
 *   - Reads from #hiddenFieldsContainer to build hidden fields 
 *     plus multi-term calc for checkboxes & text
 ********************************************************************/
function generateHiddenPDFFields() {
    let hiddenFieldsHTML = '<div id="hidden_pdf_fields" style="display:none;">';

    const hiddenCheckboxCalculations = [];
    const hiddenTextCalculations = [];

    const hiddenFieldsContainer = document.getElementById('hiddenFieldsContainer');
    if(hiddenFieldsContainer){
        const fieldBlocks= hiddenFieldsContainer.querySelectorAll('.hidden-field-block');
        for(let fb=0; fb<fieldBlocks.length; fb++){
            const block= fieldBlocks[fb];
            const hid= block.id.replace('hiddenFieldBlock','');
            const fTypeEl= document.getElementById('hiddenFieldType'+hid);
            const fType= fTypeEl ? fTypeEl.value : 'text';

            const fNameEl= document.getElementById('hiddenFieldName'+hid);
            const fName= fNameEl ? fNameEl.value.trim() : '';
            if(!fName) continue;

            if(fType==='text'){
                hiddenFieldsHTML += `\n<input type="text" id="${fName}" name="${fName}" placeholder="${fName}">`;

                // parse multi-term text calc
                const textCalcBlock= block.querySelector('#textCalculationBlock'+hid);
                if(textCalcBlock){
                    const calcRows= textCalcBlock.querySelectorAll('[id^="textCalculationRow'+hid+'_"]');
                    if(calcRows.length>0){
                        let calcArr=[];
                        for(let c=0; c<calcRows.length; c++){
                            const row= calcRows[c];
                            const eqContainer= row.querySelector('.equation-container-text');
                            let termsArr=[];
                            if(eqContainer){
                                const termDivs= eqContainer.querySelectorAll('.equation-term-text');
                                for(let t=0; t<termDivs.length; t++){
                                    const termDiv= termDivs[t];
                                    const termNumber= t+1;
                                    const opSel= termNumber>1 ? termDiv.querySelector('[id^="textTermOperator"]') : null;
                                    const qSel= termDiv.querySelector('[id^="textTermQuestion"]');

                                    const operatorVal= opSel ? opSel.value : '';
                                    const questionNameIdVal= qSel ? qSel.value.trim() : '';
                                    if(questionNameIdVal){
                                        termsArr.push({
                                            operator: (termNumber===1?'':operatorVal),
                                            questionNameId: questionNameIdVal
                                        });
                                    }
                                }
                            }
                            const cmpOp= row.querySelector('[id^="textCompareOperator"]');
                            const thrEl= row.querySelector('[id^="textThreshold"]');
                            const fillEl= row.querySelector('[id^="textFillValue"]');

                            const cmpVal= cmpOp? cmpOp.value:'=';
                            const thrVal= thrEl? thrEl.value.trim():'0';
                            const fillVal= fillEl? fillEl.value.trim():'';

                            if(termsArr.length>0){
                                calcArr.push({
                                    terms: termsArr,
                                    compareOperator: cmpVal,
                                    threshold: thrVal,
                                    fillValue: fillVal
                                });
                            }
                        }
                        if(calcArr.length>0){
                            hiddenTextCalculations.push({
                                hiddenFieldName: fName,
                                calculations: calcArr
                            });
                        }
                    }
                }
            }
            else if(fType==='checkbox'){
                const chkEl= document.getElementById('hiddenFieldChecked'+hid);
                const isCheckedDefault= chkEl && chkEl.checked;
                hiddenFieldsHTML += `\n<div style="display:none;">
                    <label class="checkbox-label">
                      <input type="checkbox" id="${fName}" name="${fName}" ${isCheckedDefault?'checked':''}>
                      ${fName}
                    </label>
                </div>`;

                // parse multi-term checkbox calc
                const calcBlock= block.querySelector('#calculationBlock'+hid);
                if(calcBlock){
                    const calcRows= calcBlock.querySelectorAll('[id^="calculationRow'+hid+'_"]');
                    if(calcRows.length>0){
                        let calcArr2=[];
                        for(let cr=0; cr<calcRows.length; cr++){
                            const row2= calcRows[cr];
                            const eqContainer2= row2.querySelector('.equation-container-cb');
                            let termsArr2=[];
                            if(eqContainer2){
                                const termDivs2= eqContainer2.querySelectorAll('.equation-term-cb');
                                for(let t2=0; t2<termDivs2.length; t2++){
                                    const td2= termDivs2[t2];
                                    const termNumber2= t2+1;
                                    const opSel2= termNumber2>1 ? td2.querySelector('[id^="calcTermOperator"]') : null;
                                    const qSel2= td2.querySelector('[id^="calcTermQuestion"]');

                                    const operatorVal2= opSel2 ? opSel2.value:'';
                                    const questionNameIdVal2= qSel2 ? qSel2.value.trim():'';
                                    if(questionNameIdVal2){
                                        termsArr2.push({
                                            operator: (termNumber2===1?'':operatorVal2),
                                            questionNameId: questionNameIdVal2
                                        });
                                    }
                                }
                            }
                            const cmpOp2= row2.querySelector('[id^="calcCompareOperator"]');
                            const thrEl2= row2.querySelector('[id^="calcThreshold"]');
                            const resEl2= row2.querySelector('[id^="calcResult"]');

                            const cmpVal2= cmpOp2? cmpOp2.value:'=';
                            const thrVal2= thrEl2? thrEl2.value.trim():'0';
                            const resVal2= resEl2? resEl2.value:'checked';

                            if(termsArr2.length>0){
                                calcArr2.push({
                                    terms: termsArr2,
                                    compareOperator: cmpVal2,
                                    threshold: thrVal2,
                                    result: resVal2
                                });
                            }
                        }
                        if(calcArr2.length>0){
                            hiddenCheckboxCalculations.push({
                                hiddenFieldName: fName,
                                calculations: calcArr2
                            });
                        }
                    }
                }
            }
        }
    }

    hiddenFieldsHTML += '\n</div>';

    return {
        hiddenFieldsHTML,
        hiddenCheckboxCalculations,
        hiddenTextCalculations
    };
}
