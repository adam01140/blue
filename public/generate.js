/*********************************************
 * generate.js - with hidden checkbox & text 
 *   multi-term calculations
 *   plus $$placeholders$$ supporting expressions
 *   AND re-check on final submit
 *********************************************/

function getFormHTML() {
    var formHTML = [
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

    // We'll store questionNameIds, questionTypesMap, etc.
    var questionNameIds = {};
    var questionTypesMap = {};
    var conditionalPDFs = [];
    var conditionalAlerts = [];
    var jumpLogics = [];

    // Possibly get PDF name from user
    var pdfFormNameInputEl = document.getElementById('formPDFName');
    var pdfFormName = pdfFormNameInputEl ? pdfFormNameInputEl.value.trim() : 'test.pdf';
    var escapedPdfFormName = pdfFormName
        .replace(/\\/g, '\\\\')
        .replace(/'/g, '\\\'')
        .replace(/"/g, '\\"');

    // Build out each section
    for(var s=1; s<sectionCounter; s++){
        var sectionBlock = document.getElementById('sectionBlock'+s);
        if(!sectionBlock) continue;

        var sectionNameEl = sectionBlock.querySelector('#sectionName'+s);
        var sectionName = sectionNameEl ? sectionNameEl.value : ('Section '+s);

        formHTML += '<div id="section'+s+'" class="section'+(s===1?' active':'')+'">';
        formHTML += '<h2>' + sectionName + '</h2>';

        var questionsInSection = sectionBlock.querySelectorAll('.question-block');
        for(var qIdx=0; qIdx<questionsInSection.length; qIdx++){
            var qBlock = questionsInSection[qIdx];
            var questionId = qBlock.id.replace('questionBlock','');
            var questionTextEl = qBlock.querySelector('#question'+questionId);
            var questionText = questionTextEl ? questionTextEl.value : '';
            var questionTypeEl = qBlock.querySelector('#questionType'+questionId);
            var questionType = questionTypeEl ? questionTypeEl.value : 'text';

            questionTypesMap[questionId] = questionType;

            // logic
            var logicCheckbox = qBlock.querySelector('#logic'+questionId);
            var logicEnabled = logicCheckbox && logicCheckbox.checked;

            // jump
            var jumpEnabledEl = qBlock.querySelector('#enableJump'+questionId);
            var jumpEnabled = jumpEnabledEl && jumpEnabledEl.checked;
            var jumpToEl = qBlock.querySelector('#jumpTo'+questionId);
            var jumpOptionEl = qBlock.querySelector('#jumpOption'+questionId);
            var jumpTo = jumpToEl ? jumpToEl.value : '';
            var jumpOption = jumpOptionEl ? jumpOptionEl.value : '';
            if(jumpEnabled && jumpTo){
                jumpLogics.push({
                    questionId: questionId,
                    questionType: questionType,
                    jumpOption: jumpOption,
                    jumpTo: jumpTo,
                    section: s
                });
            }

            // cond PDF
            var pdfCheckEl = qBlock.querySelector('#enableConditionalPDF'+questionId);
            var pdfEnabled = pdfCheckEl && pdfCheckEl.checked;
            var pdfNameEl = qBlock.querySelector('#conditionalPDFName'+questionId);
            var pdfAnsEl = qBlock.querySelector('#conditionalPDFAnswer'+questionId);
            var pdfNameVal = pdfNameEl ? pdfNameEl.value : '';
            var pdfAnsVal = pdfAnsEl ? pdfAnsEl.value : '';

            // cond Alert
            var alertCheckEl = qBlock.querySelector('#enableConditionalAlert'+questionId);
            var alertEnabled = alertCheckEl && alertCheckEl.checked;
            var alertPrevQEl = qBlock.querySelector('#alertPrevQuestion'+questionId);
            var alertPrevAEl = qBlock.querySelector('#alertPrevAnswer'+questionId);
            var alertTextEl = qBlock.querySelector('#alertText'+questionId);
            var alertPrevQ = alertPrevQEl ? alertPrevQEl.value : '';
            var alertPrevA = alertPrevAEl ? alertPrevAEl.value : '';
            var alertTxt = alertTextEl ? alertTextEl.value : '';
            if(alertEnabled && alertPrevQ && alertPrevA && alertTxt){
                conditionalAlerts.push({
                    questionId: questionId,
                    prevQuestionId: alertPrevQ,
                    prevAnswer: alertPrevA,
                    alertText: alertTxt
                });
            }

            // Start question container
            formHTML += '<div id="question-container-'+questionId+'"'+(logicEnabled?' class="hidden"':'')+'>';
            formHTML += '<label><h3>'+questionText+'</h3></label>';

            // Render by questionType
            if(questionType==='text'){
                var nmEl= qBlock.querySelector('#textboxName'+questionId);
                var phEl= qBlock.querySelector('#textboxPlaceholder'+questionId);
                var nameId = nmEl&&nmEl.value ? nmEl.value : ('answer'+questionId);
                var placeholder= phEl&&phEl.value ? phEl.value : '';
                questionNameIds[questionId] = nameId;
                formHTML += '<input type="text" id="'+nameId+'" name="'+nameId+'" placeholder="'+placeholder+'"><br>';
            }
            else if(questionType==='bigParagraph'){
                var nmEl2= qBlock.querySelector('#textboxName'+questionId);
                var phEl2= qBlock.querySelector('#textboxPlaceholder'+questionId);
                var nameId2= nmEl2&&nmEl2.value ? nmEl2.value : ('answer'+questionId);
                var ph2= phEl2&&phEl2.value ? phEl2.value : '';
                questionNameIds[questionId] = nameId2;
                formHTML += '<textarea id="'+nameId2+'" name="'+nameId2+'" rows="5" cols="50" placeholder="'+ph2+'"></textarea><br>';
            }
            else if(questionType==='money'){
                var mnNmEl= qBlock.querySelector('#textboxName'+questionId);
                var mnPhEl= qBlock.querySelector('#textboxPlaceholder'+questionId);
                var mnName= mnNmEl&&mnNmEl.value ? mnNmEl.value : ('answer'+questionId);
                var mnPh= mnPhEl&&mnPhEl.value ? mnPhEl.value : 'Enter amount';
                questionNameIds[questionId] = mnName;
                formHTML += '<input type="number" id="'+mnName+'" name="'+mnName+'" min="0" step="0.01" placeholder="'+mnPh+'"><br>';
            }
            else if(questionType==='date'){
                questionNameIds[questionId] = 'answer'+questionId;
                formHTML += '<input type="date" id="answer'+questionId+'" name="answer'+questionId+'"><br>';
            }
            else if(questionType==='radio'){
                var radNameEl = qBlock.querySelector('#textboxName'+questionId);
                var radName = radNameEl && radNameEl.value ? radNameEl.value : ('answer'+questionId);
                questionNameIds[questionId] = radName;
                formHTML += '<select id="'+radName+'" name="'+radName+'">'+
                            '<option value="" disabled selected>Select an option</option>'+
                            '<option value="Yes">Yes</option>'+
                            '<option value="No">No</option>'+
                            '</select><br>';
                if(pdfEnabled){
                    conditionalPDFs.push({
                        questionId: questionId,
                        questionNameId: radName,
                        conditionalAnswer: pdfAnsVal,
                        pdfName: pdfNameVal,
                        questionType: questionType
                    });
                }
            }
            else if(questionType==='dropdown'){
                var ddNameEl= qBlock.querySelector('#textboxName'+questionId);
                var ddNm= ddNameEl&&ddNameEl.value ? ddNameEl.value : ('answer'+questionId);
                questionNameIds[questionId] = ddNm;
                formHTML += '<select id="'+ddNm+'" name="'+ddNm+'">'+
                            '<option value="" disabled selected>Select an option</option>';
                var ddOps= qBlock.querySelectorAll('#dropdownOptions'+questionId+' input');
                for(var i=0; i<ddOps.length; i++){
                    var val= ddOps[i].value.trim();
                    if(val) formHTML+='<option value="'+val+'">'+val+'</option>';
                }
                formHTML += '</select><br>';
                if(pdfEnabled){
                    conditionalPDFs.push({
                        questionId: questionId,
                        questionNameId: ddNm,
                        conditionalAnswer: pdfAnsVal,
                        pdfName: pdfNameVal,
                        questionType: questionType
                    });
                }
            }
            else if(questionType==='checkbox'){
                var cOptsDivs= qBlock.querySelectorAll('#checkboxOptions'+questionId+' > div');
                var cboxOptions=[];
                formHTML += '<div><center><div id="checkmark">';
                for(var co=0; co<cOptsDivs.length; co++){
                    var optDiv= cOptsDivs[co];
                    var txtEl= optDiv.querySelector('#checkboxOptionText'+questionId+'_'+(co+1));
                    var nameEl= optDiv.querySelector('#checkboxOptionName'+questionId+'_'+(co+1));
                    var valEl= optDiv.querySelector('#checkboxOptionValue'+questionId+'_'+(co+1));

                    var labelText= txtEl && txtEl.value.trim() ? txtEl.value.trim() : ('Option '+(co+1));
                    var rawNameId= nameEl && nameEl.value.trim() ? nameEl.value.trim(): '';
                    var rawVal= valEl && valEl.value.trim() ? valEl.value.trim(): labelText;

                    var forcedPrefix= 'answer'+questionId+'_';
                    if(!rawNameId){
                        var sanitized= labelText.replace(/\W+/g,"_").toLowerCase();
                        rawNameId= forcedPrefix+sanitized;
                    } else if(rawNameId.indexOf(forcedPrefix)!==0){
                        rawNameId= forcedPrefix+rawNameId;
                    }
                    cboxOptions.push({ labelText: labelText, optionNameId: rawNameId, optionValue: rawVal});
                    formHTML+='<span class="checkbox-inline"><label class="checkbox-label">'+
                              '<input type="checkbox" id="'+rawNameId+'" name="'+rawNameId+'" value="'+rawVal+'">'+
                              labelText+'</label></span>';
                }
                var noneEl= qBlock.querySelector('#noneOfTheAbove'+questionId);
                if(noneEl && noneEl.checked){
                    var noneStr='None of the above';
                    var forcedPrefix2='answer'+questionId+'_';
                    var sant= noneStr.replace(/\W+/g,"_").toLowerCase();
                    var notNameId= forcedPrefix2+sant;
                    cboxOptions.push({ labelText:noneStr, optionNameId:notNameId, optionValue:noneStr});
                    formHTML += '<span class="checkbox-inline">'+
                                '<label class="checkbox-label">'+
                                '<input type="checkbox" id="'+notNameId+'" name="'+notNameId+'" value="'+noneStr+'">'+
                                noneStr+
                                '</label></span>';
                }
                formHTML += '</div><br></div>';
                if(pdfEnabled){
                    for(var ck=0; ck<cboxOptions.length; ck++){
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
            else if(questionType==='multipleTextboxes'){
                var multiBlocks= qBlock.querySelectorAll('#multipleTextboxesOptions'+questionId+' > div');
                for(var mb=0; mb<multiBlocks.length; mb++){
                    var dEl= multiBlocks[mb];
                    var lblInput= dEl.querySelector('#multipleTextboxLabel'+questionId+'_'+(mb+1));
                    var nmInput= dEl.querySelector('#multipleTextboxName'+questionId+'_'+(mb+1));
                    var phInput= dEl.querySelector('#multipleTextboxPlaceholder'+questionId+'_'+(mb+1));

                    var lblVal= lblInput? lblInput.value.trim(): '';
                    var nmVal= nmInput? nmInput.value.trim(): ('answer'+questionId+'_'+(mb+1));
                    var phVal= phInput? phInput.value.trim(): '';
                    if(lblVal){
                        formHTML+='<label><h3>'+lblVal+'</h3></label><br>';
                    }
                    formHTML+='<input type="text" id="'+nmVal+'" name="'+nmVal+'" placeholder="'+phVal+'" style="text-align:center;"><br>';
                }
            }
            else if(questionType==='numberedDropdown'){
                var stEl= qBlock.querySelector('#numberRangeStart'+questionId);
                var enEl= qBlock.querySelector('#numberRangeEnd'+questionId);
                var st= stEl? parseInt(stEl.value,10) : 1;
                var en= enEl? parseInt(enEl.value,10) : 1;
                questionNameIds[questionId] = 'answer'+questionId;
                formHTML+='<select id="answer'+questionId+'" onchange="showTextboxLabels('+questionId+', this.value)">'+
                          '<option value="" disabled selected>Select an option</option>';
                for(var rnum=st; rnum<=en; rnum++){
                    formHTML+='<option value="'+rnum+'">'+rnum+'</option>';
                }
                formHTML+='</select><br><div id="labelContainer'+questionId+'"></div>';
            }

            formHTML += '</div>'; // end question container

            // If multiple-OR logic is enabled, keep the existing logic script if it exists
            if(logicEnabled){
                var logicRows= qBlock.querySelectorAll('.logic-condition-row');
                if(logicRows.length>0){
                    formHTML+='\n<script>\n(function(){\n';
                    formHTML+=' var thisQ=document.getElementById("question-container-'+questionId+'");\n';
                    formHTML+=' function updateVisibility(){\n var anyMatch=false;\n';

                    for(var lr=0; lr<logicRows.length; lr++){
                        var row= logicRows[lr];
                        var rowIndex= lr+1;
                        var pqEl= row.querySelector('#prevQuestion'+questionId+'_'+rowIndex);
                        var paEl= row.querySelector('#prevAnswer'+questionId+'_'+rowIndex);
                        if(!pqEl||!paEl) continue;
                        var pqVal= pqEl.value.trim();
                        var paVal= paEl.value.trim().toLowerCase();
                        if(!pqVal||!paVal) continue;

                        var pType= questionTypesMap[pqVal]||'text';
                        formHTML+=' (function(){\n';
                        formHTML+='   var cPrevType="'+pType+'";\n';
                        formHTML+='   var cPrevAns="'+paVal+'";\n';
                        formHTML+='   var cPrevQNum="'+pqVal+'";\n';
                        formHTML+='   if(cPrevType==="checkbox"){\n';
                        formHTML+='     var cbs=document.querySelectorAll(\'input[id^="answer\'+cPrevQNum+\'_"]\');\n';
                        formHTML+='     var checkedVals=[];\n';
                        formHTML+='     for(var cc=0; cc<cbs.length; cc++){ if(cbs[cc].checked) checkedVals.push(cbs[cc].value.trim().toLowerCase());}\n';
                        formHTML+='     if(checkedVals.indexOf(cPrevAns)!==-1){ anyMatch=true;}';
                        formHTML+='   } else {\n';
                        formHTML+='     var el2=document.getElementById("answer"+cPrevQNum) || document.getElementById(questionNameIds[cPrevQNum]);\n';
                        formHTML+='     if(el2){ var val2= el2.value.trim().toLowerCase(); if(val2===cPrevAns){ anyMatch=true;} }\n';
                        formHTML+='   }\n';
                        formHTML+=' })();\n';
                    }
                    formHTML+=' if(anyMatch){ thisQ.classList.remove("hidden");} else{ thisQ.classList.add("hidden");}\n';
                    formHTML+='}\n';
                    // attach events for each logic row
                    for(var lr2=0; lr2<logicRows.length; lr2++){
                        var row2= logicRows[lr2];
                        var rowIndex2= lr2+1;
                        var pqEl2= row2.querySelector('#prevQuestion'+questionId+'_'+rowIndex2);
                        if(!pqEl2) continue;
                        var pqVal2= pqEl2.value.trim();
                        if(!pqVal2) continue;
                        var pType2= questionTypesMap[pqVal2]||'text';
                        if(pType2==='checkbox'){
                            formHTML+=' (function(){ var cbs=document.querySelectorAll(\'input[id^="answer'+pqVal2+'_"]\');\n';
                            formHTML+='   for(var i=0;i<cbs.length;i++){ cbs[i].addEventListener("change", function(){ updateVisibility();});}\n';
                            formHTML+=' })();\n';
                        } else {
                            formHTML+=' (function(){ var el3= document.getElementById("answer'+pqVal2+'") || document.getElementById(questionNameIds["'+pqVal2+'"]);';
                            formHTML+=' if(el3){ el3.addEventListener("change", function(){ updateVisibility();});}';
                            formHTML+='})();\n';
                        }
                    }
                    formHTML+=' updateVisibility();\n';
                    formHTML+='})();\n</script>\n';
                }
            }
        } // end each question

        // Section nav
        formHTML+='<br><br><div class="navigation-buttons">';
        if(s>1){
            formHTML+='<button type="button" onclick="navigateSection('+(s-1)+')">Back</button>';
        }
        if(s===sectionCounter-1){
            formHTML+='<button type="submit">Submit</button>';
        } else {
            formHTML+='<button type="button" onclick="handleNext('+s+')">Next</button>';
        }
        formHTML+='</div>';
        formHTML+='</div>'; // end section
    }

    // Insert hidden fields (including multi-term calculations)
    var genHidden = generateHiddenPDFFields();
    formHTML += genHidden.hiddenFieldsHTML;

    formHTML += [
        '</form>',
        '<div id="thankYouMessage" class="thank-you-message">Thank you for completing the survey</div>',
        '</div>',
        '</section>',
        '</div>',
        '<footer>',
        '    &copy; 2024 FormWiz. All rights reserved.',
        '</footer>',
        '',
        '<script>',
        '    // Firebase init if needed',
        '    const firebaseConfig = {',
        '        apiKey: "AIzaSyDS-tSSn7fdLBgwzfHQ_1MPG1w8S_4qb04",',
        '        authDomain: "formwiz-3f4fd.firebaseapp.com",',
        '        projectId: "formwiz-3f4fd",',
        '        storageBucket: "formwiz-3f4fd.appspot.com",',
        '        messagingSenderId: "404259212529",',
        '        appId: "1:404259212529:web:15a33bce82383b21cfed50",',
        '        measurementId: "G-P07YEN0HPD"',
        '    };',
        '    firebase.initializeApp(firebaseConfig);',
        '    const db = firebase.firestore();',
        '    const urlParams = new URLSearchParams(window.location.search);',
        '    const formId = urlParams.get("formId");',
        '    let userId = null;',
        '    firebase.auth().onAuthStateChanged(function(user){',
        '        if(user){ userId=user.uid;} else {',
        '           console.log("User not logged in.");',
        '           window.location.href="account.html";',
        '        }',
        '    });',
        ''
    ].join('\n');

    // questionNameIds, jumpLogics, PDF, Alerts, etc.
    formHTML += '    var questionNameIds = '+JSON.stringify(questionNameIds)+';\n';
    formHTML += '    var jumpLogics = '+JSON.stringify(jumpLogics)+';\n';
    formHTML += '    var conditionalPDFs = '+JSON.stringify(conditionalPDFs)+';\n';
    formHTML += '    var conditionalAlerts = '+JSON.stringify(conditionalAlerts)+';\n\n';

    // Collect calculations from generateHiddenPDFFields
    var hiddenCheckboxCalcs = genHidden.hiddenCheckboxCalculations || [];
    var hiddenTextCalcs = genHidden.hiddenTextCalculations || [];

    formHTML += '    // Hidden fields calculations arrays:\n';
    formHTML += '    var hiddenCheckboxCalculations = '+JSON.stringify(hiddenCheckboxCalcs)+';\n';
    formHTML += '    var hiddenTextCalculations = '+JSON.stringify(hiddenTextCalcs)+';\n\n';

    formHTML += `
    function handleNext(currentSection){
        var nextSection = currentSection+1;
        var relevantJumps = [];
        for(var i=0; i<jumpLogics.length; i++){
            if(jumpLogics[i].section===currentSection){
                relevantJumps.push(jumpLogics[i]);
            }
        }
        for(var j=0; j<relevantJumps.length; j++){
            var jl = relevantJumps[j];
            var qId = jl.questionId;
            var qType= jl.questionType;
            var jOpt= jl.jumpOption;
            var jTo = jl.jumpTo;
            var nmId= questionNameIds[qId] || ("answer"+qId);

            if(qType==="radio" || qType==="dropdown"){
                var el= document.getElementById(nmId);
                if(el && el.value.trim().toLowerCase()=== jOpt.trim().toLowerCase()){
                    nextSection=jTo; 
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
                        nextSection=jTo;
                        break;
                    }
                }
            }
        }
        navigateSection(nextSection);

        // run hidden calculations if user wants the step-by-step too
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
        for(var i=0;i<conditionalAlerts.length;i++){
            var obj = conditionalAlerts[i];
            var prevQEl= document.getElementById("answer"+obj.prevQuestionId);
            if(prevQEl){
                if(prevQEl.value.trim().toLowerCase()=== obj.prevAnswer.trim().toLowerCase()){
                    alert(obj.alertText);
                }
            } else {
                var cbs= document.querySelectorAll('[name^="answer'+obj.prevQuestionId+'_"]');
                for(var x=0;x<cbs.length;x++){
                    if(cbs[x].checked && cbs[x].value.trim().toLowerCase()=== obj.prevAnswer.trim().toLowerCase()){
                        alert(obj.alertText);
                    }
                }
            }
        }
    }

    function showThankYouMessage(){
        // NEW: Ensure final calculation is performed right before submission
        runAllHiddenCheckboxCalculations();
        runAllHiddenTextCalculations();

        var pdfName = "${escapedPdfFormName}".replace(".pdf","");
        editAndDownloadPDF(pdfName).then(function(){
            // handle conditional PDFs
            for(var i=0;i<conditionalPDFs.length;i++){
                var pdfObj= conditionalPDFs[i];
                if(pdfObj.questionType==="checkbox"){
                    var cbox= document.getElementById(pdfObj.questionNameId);
                    if(cbox && cbox.checked && cbox.value=== pdfObj.conditionalAnswer){
                        editAndDownloadPDF(pdfObj.pdfName.replace(".pdf",""));
                    }
                } else {
                    var valEl= document.getElementById(pdfObj.questionNameId);
                    var val2= valEl? valEl.value:"";
                    if(val2=== pdfObj.conditionalAnswer){
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
        for(var i=0;i<inputs.length;i++){
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
        for(var i=0;i<hiddenCheckboxCalculations.length;i++){
            runSingleHiddenCheckboxCalculation(hiddenCheckboxCalculations[i]);
        }
    }
    function runSingleHiddenCheckboxCalculation(calcObj){
        var cbox= document.getElementById(calcObj.hiddenFieldName);
        if(!cbox) return;
        var finalState= cbox.checked;
        for(var c=0;c<calcObj.calculations.length;c++){
            var oneCalc= calcObj.calculations[c];
            var val=0;
            if(oneCalc.terms && oneCalc.terms.length>0){
                val= parseFloat( getMoneyValue(oneCalc.terms[0].questionNameId))||0;
                for(var t=1; t<oneCalc.terms.length; t++){
                    var term= oneCalc.terms[t];
                    var op= term.operator||'';
                    var nextVal= parseFloat(getMoneyValue(term.questionNameId))||0;
                    if(op==='+') val+= nextVal;
                    else if(op==='-') val-= nextVal;
                    else if(op==='x') val*= nextVal;
                    else if(op==='/'){
                        if(nextVal!==0) val/= nextVal;
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
        for(var i=0;i<hiddenTextCalculations.length;i++){
            runSingleHiddenTextCalculation(hiddenTextCalculations[i]);
        }
    }
    function runSingleHiddenTextCalculation(calcObj){
        var textField= document.getElementById(calcObj.hiddenFieldName);
        if(!textField) return;
        var finalValue= textField.value; 
        for(var c=0;c<calcObj.calculations.length;c++){
            var oneCalc= calcObj.calculations[c];
            var val=0;
            if(oneCalc.terms && oneCalc.terms.length>0){
                val= parseFloat(getMoneyValue(oneCalc.terms[0].questionNameId))||0;
                for(var t=1; t<oneCalc.terms.length; t++){
                    var term= oneCalc.terms[t];
                    var op= term.operator||'';
                    var nextVal= parseFloat(getMoneyValue(term.questionNameId))||0;
                    if(op==='+') val+= nextVal;
                    else if(op==='-') val-= nextVal;
                    else if(op==='x') val*= nextVal;
                    else if(op==='/'){
                        if(nextVal!==0) val/= nextVal;
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
        // Keep all existing real-time listeners for checkbox & text calculations
        if(hiddenCheckboxCalculations){
            for(var i=0;i<hiddenCheckboxCalculations.length;i++){
                var cObj= hiddenCheckboxCalculations[i];
                for(var c=0;c<cObj.calculations.length;c++){
                    var oneCalc= cObj.calculations[c];
                    var terms= oneCalc.terms||[];
                    for(var t=0;t<terms.length;t++){
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
        if(hiddenTextCalculations){
            for(var i2=0;i2<hiddenTextCalculations.length;i2++){
                var txtObj= hiddenTextCalculations[i2];
                for(var c2=0;c2<txtObj.calculations.length;c2++){
                    var oneCalc2= txtObj.calculations[c2];
                    var terms2= oneCalc2.terms||[];
                    for(var t2=0;t2<terms2.length;t2++){
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

    return formHTML;
}

/********************************************************************
 * generateHiddenPDFFields() 
 *   - Reads #hiddenFieldsContainer to build hidden fields
 *     plus multi-term calc for checkboxes & text
 ********************************************************************/
function generateHiddenPDFFields() {
    var hiddenFieldsHTML = '<div id="hidden_pdf_fields" style="display:none;">';

    var hiddenCheckboxCalculations = [];
    var hiddenTextCalculations = [];

    var hiddenFieldsContainer = document.getElementById('hiddenFieldsContainer');
    if(hiddenFieldsContainer){
        var fieldBlocks= hiddenFieldsContainer.querySelectorAll('.hidden-field-block');
        for(var fb=0; fb<fieldBlocks.length; fb++){
            var block= fieldBlocks[fb];
            var hid= block.id.replace('hiddenFieldBlock','');
            var fTypeEl= document.getElementById('hiddenFieldType'+hid);
            var fType= fTypeEl? fTypeEl.value:'text';
            var fNameEl= document.getElementById('hiddenFieldName'+hid);
            var fName= fNameEl? fNameEl.value.trim():'';
            if(!fName) continue;

            if(fType==='text'){
                // hidden text input
                hiddenFieldsHTML+='\n<input type="text" id="'+fName+'" name="'+fName+'" placeholder="'+fName+'">';

                // parse multi-term text calc
                var textCalcBlock= block.querySelector('#textCalculationBlock'+hid);
                if(textCalcBlock){
                    var calcRows= textCalcBlock.querySelectorAll('div[id^="textCalculationRow'+hid+'_"]');
                    if(calcRows.length>0){
                        var calcArr=[];
                        for(var c=0;c<calcRows.length;c++){
                            var row= calcRows[c];
                            var rowIdParts= row.id.split('_');
                            var calcIndex= rowIdParts[1];

                            var eqContainer= row.querySelector('#textEquationContainer'+hid+'_'+calcIndex);
                            var termsArr=[];
                            if(eqContainer){
                                var termDivs= eqContainer.querySelectorAll('.equation-term-text');
                                for(var t=0; t<termDivs.length; t++){
                                    var termDiv= termDivs[t];
                                    var termNumber= t+1;
                                    var opSel=null;
                                    if(termNumber>1){
                                        opSel= termDiv.querySelector('#textTermOperator'+hid+'_'+calcIndex+'_'+termNumber);
                                    }
                                    var qSel= termDiv.querySelector('#textTermQuestion'+hid+'_'+calcIndex+'_'+termNumber);

                                    var operatorVal= opSel? opSel.value:'';
                                    var questionNameIdVal= qSel? qSel.value.trim():'';
                                    if(questionNameIdVal){
                                        termsArr.push({
                                            operator: (termNumber===1?'': operatorVal),
                                            questionNameId: questionNameIdVal
                                        });
                                    }
                                }
                            }
                            var cmpOp= row.querySelector('#textCompareOperator'+hid+'_'+calcIndex);
                            var thrEl= row.querySelector('#textThreshold'+hid+'_'+calcIndex);
                            var fillEl= row.querySelector('#textFillValue'+hid+'_'+calcIndex);
                            var cmpVal= cmpOp? cmpOp.value:'=';
                            var thrVal= thrEl? thrEl.value.trim():'0';
                            var fillVal= fillEl? fillEl.value.trim():'';

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
                // hidden checkbox
                var chkEl= document.getElementById('hiddenFieldChecked'+hid);
                var isCheckedDefault= chkEl && chkEl.checked;
                hiddenFieldsHTML+='\n<div style="display:none;">'+
                    '<label class="checkbox-label">'+
                    '<input type="checkbox" id="'+fName+'" name="'+fName+'" '+(isCheckedDefault?'checked':'')+'>'+
                    fName+
                    '</label>'+
                    '</div>';

                // parse multi-term checkbox calc
                var calcBlock= block.querySelector('#calculationBlock'+hid);
                if(calcBlock){
                    var calcRows= calcBlock.querySelectorAll('div[id^="calculationRow'+hid+'_"]');
                    if(calcRows.length>0){
                        var calcArr2=[];
                        for(var cr=0; cr<calcRows.length; cr++){
                            var row2= calcRows[cr];
                            var rowIdParts2= row2.id.split('_');
                            var calcIndex2= rowIdParts2[1];
                            var eqContainer2= row2.querySelector('#equationContainer'+hid+'_'+calcIndex2);
                            var termsArr2=[];
                            if(eqContainer2){
                                var termDivs2= eqContainer2.querySelectorAll('.equation-term-cb');
                                for(var t2=0; t2<termDivs2.length; t2++){
                                    var td2= termDivs2[t2];
                                    var termNumber2= t2+1;
                                    var opSel2=null;
                                    if(termNumber2>1){
                                        opSel2= td2.querySelector('#calcTermOperator'+hid+'_'+calcIndex2+'_'+termNumber2);
                                    }
                                    var qSel2= td2.querySelector('#calcTermQuestion'+hid+'_'+calcIndex2+'_'+termNumber2);

                                    var operatorVal2= opSel2? opSel2.value:'';
                                    var questionNameIdVal2= qSel2? qSel2.value.trim():'';
                                    if(questionNameIdVal2){
                                        termsArr2.push({
                                            operator: (termNumber2===1?'': operatorVal2),
                                            questionNameId: questionNameIdVal2
                                        });
                                    }
                                }
                            }
                            var cmpOp2= row2.querySelector('#calcCompareOperator'+hid+'_'+calcIndex2);
                            var thrEl2= row2.querySelector('#calcThreshold'+hid+'_'+calcIndex2);
                            var resEl2= row2.querySelector('#calcResult'+hid+'_'+calcIndex2);
                            var cmpVal2= cmpOp2? cmpOp2.value:'=';
                            var thrVal2= thrEl2? thrEl2.value.trim():'0';
                            var resVal2= resEl2? resEl2.value:'checked';

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

    hiddenFieldsHTML+='\n</div>';

    return {
        hiddenFieldsHTML: hiddenFieldsHTML,
        hiddenCheckboxCalculations: hiddenCheckboxCalculations,
        hiddenTextCalculations: hiddenTextCalculations
    };
}
