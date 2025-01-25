/*********************************************
 * generate.js - with hidden checkbox calculations
 *   and hidden fields truly hidden by default
 *   (No arrow functions / optional chaining)
 *   Supports multi-term equations, e.g. Q1 + Q2 - Q3 ...
 *********************************************/

/**
 * Main function to build the final HTML form string.
 */
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

    // We'll track questionNameIds, questionTypes, etc. for logic
    var questionNameIds = {};
    var questionTypesMap = {};

    // Conditionals
    var conditionalPDFs = [];
    var conditionalAlerts = [];
    var jumpLogics = [];

    // Possibly read user’s PDF name:
    var pdfFormNameInputEl = document.getElementById('formPDFName');
    var pdfFormName = pdfFormNameInputEl ? pdfFormNameInputEl.value.trim() : 'default.pdf';
    var escapedPdfFormName = pdfFormName
        .replace(/\\/g, '\\\\')
        .replace(/'/g, '\\\'')
        .replace(/"/g, '\\"');

    // Build each section
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
            var jumpOptEl = qBlock.querySelector('#jumpOption'+questionId);
            var jumpTo = jumpToEl ? jumpToEl.value : '';
            var jumpOption = jumpOptEl ? jumpOptEl.value : '';
            if(jumpEnabled && jumpTo){
                jumpLogics.push({
                    questionId: questionId,
                    questionNameId: '',
                    jumpOption: jumpOption,
                    jumpTo: jumpTo,
                    section: s,
                    questionType: questionType
                });
            }

            // cond PDF
            var pdfCheckEl = qBlock.querySelector('#enableConditionalPDF'+questionId);
            var pdfEnabled = pdfCheckEl && pdfCheckEl.checked;
            var pdfNameEl = qBlock.querySelector('#conditionalPDFName'+questionId);
            var pdfAnsEl = qBlock.querySelector('#conditionalPDFAnswer'+questionId);
            var pdfName = pdfNameEl ? pdfNameEl.value : '';
            var pdfAns = pdfAnsEl ? pdfAnsEl.value : '';

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

            // Render question
            formHTML += '<div id="question-container-'+questionId+'"'+(logicEnabled?' class="hidden"':'')+'>';
            formHTML += '<label><h3>' + questionText + '</h3></label>';

            if(questionType==='text'){
                var nmEl = qBlock.querySelector('#textboxName'+questionId);
                var phEl = qBlock.querySelector('#textboxPlaceholder'+questionId);
                var nameId = nmEl && nmEl.value ? nmEl.value : ('answer'+questionId);
                var placeholder = phEl && phEl.value ? phEl.value : '';
                questionNameIds[questionId] = nameId;
                formHTML += '<input type="text" id="'+nameId+'" name="'+nameId+'" placeholder="'+placeholder+'"><br><br>';
            }
            else if(questionType==='bigParagraph'){
                var nmEl2 = qBlock.querySelector('#textboxName'+questionId);
                var phEl2 = qBlock.querySelector('#textboxPlaceholder'+questionId);
                var nameId2 = nmEl2 && nmEl2.value ? nmEl2.value : ('answer'+questionId);
                var placeholder2 = phEl2 && phEl2.value ? phEl2.value : '';
                questionNameIds[questionId] = nameId2;
                formHTML += '<textarea id="'+nameId2+'" name="'+nameId2+'" rows="5" cols="50" placeholder="'+placeholder2+'"></textarea><br>';
            }
            else if(questionType==='radio'){
                var radNm = qBlock.querySelector('#textboxName'+questionId);
                var radNameId = radNm && radNm.value ? radNm.value : ('answer'+questionId);
                questionNameIds[questionId] = radNameId;
                formHTML += '<select id="'+radNameId+'" name="'+radNameId+'">'+
                            '<option value="" disabled selected>Select an option</option>'+
                            '<option value="Yes">Yes</option>'+
                            '<option value="No">No</option>'+
                            '</select><br>';
                if(pdfEnabled){
                    conditionalPDFs.push({
                        questionId: questionId,
                        questionNameId: radNameId,
                        conditionalAnswer: pdfAns,
                        pdfName: pdfName,
                        questionType: questionType
                    });
                }
            }
            else if(questionType==='dropdown'){
                var ddNmEl = qBlock.querySelector('#textboxName'+questionId);
                var ddNm = ddNmEl && ddNmEl.value ? ddNmEl.value : ('answer'+questionId);
                questionNameIds[questionId] = ddNm;
                formHTML += '<select id="'+ddNm+'" name="'+ddNm+'">'+
                            '<option value="" disabled selected>Select an option</option>';
                var ddOps = qBlock.querySelectorAll('#dropdownOptions'+questionId+' input');
                for(var i=0; i<ddOps.length; i++){
                    var val = ddOps[i].value.trim();
                    if(val) formHTML += '<option value="'+val+'">'+val+'</option>';
                }
                formHTML += '</select><br>';
            }
            else if(questionType==='checkbox'){
                var cOptsDivs = qBlock.querySelectorAll('#checkboxOptions'+questionId+' > div');
                var checkboxOptions = [];
                formHTML += '<div><center><div id="checkmark">';
                for(var c=0; c<cOptsDivs.length; c++){
                    var optDiv = cOptsDivs[c];
                    var txtEl = optDiv.querySelector('#checkboxOptionText'+questionId+'_'+(c+1));
                    var nameEl = optDiv.querySelector('#checkboxOptionName'+questionId+'_'+(c+1));
                    var valEl = optDiv.querySelector('#checkboxOptionValue'+questionId+'_'+(c+1));

                    var labelText = txtEl && txtEl.value.trim()? txtEl.value.trim(): ('Option '+(c+1));
                    var rawNameId = nameEl&&nameEl.value.trim()? nameEl.value.trim(): '';
                    var rawVal = valEl&&valEl.value.trim()? valEl.value.trim(): '';

                    var forcedPrefix='answer'+questionId+'_';
                    if(!rawNameId){
                        var sanitized = labelText.replace(/\W+/g,"_").toLowerCase();
                        rawNameId = forcedPrefix+sanitized;
                    } else if(rawNameId.indexOf(forcedPrefix)!==0){
                        rawNameId= forcedPrefix+rawNameId;
                    }
                    if(!rawVal) rawVal=labelText;

                    checkboxOptions.push({ labelText: labelText, optionNameId: rawNameId, optionValue: rawVal });
                    formHTML += '<span class="checkbox-inline">'+
                                '<label class="checkbox-label">'+
                                '<input type="checkbox" id="'+rawNameId+'" name="'+rawNameId+'" value="'+rawVal+'">'+labelText+
                                '</label>'+
                                '</span>';
                }
                var noneAbove = qBlock.querySelector('#noneOfTheAbove'+questionId);
                if(noneAbove && noneAbove.checked){
                    var noneStr = 'None of the above';
                    var forcedPref='answer'+questionId+'_';
                    var sant=noneStr.replace(/\W+/g,"_").toLowerCase();
                    var notNameId=forcedPref+sant;
                    checkboxOptions.push({ labelText:noneStr, optionNameId:notNameId, optionValue:noneStr});
                    formHTML += '<span class="checkbox-inline">'+
                                '<label class="checkbox-label">'+
                                '<input type="checkbox" id="'+notNameId+'" name="'+notNameId+'" value="'+noneStr+'">'+noneStr+
                                '</label>'+
                                '</span>';
                }
                formHTML += '</div><br></div>';

                if(pdfEnabled){
                    // If user wants "Attach PDF if [some checkbox]"
                    for(var k=0; k<checkboxOptions.length; k++){
                        if(checkboxOptions[k].labelText===pdfAns){
                            conditionalPDFs.push({
                                questionId: questionId,
                                questionNameId: checkboxOptions[k].optionNameId,
                                conditionalAnswer: checkboxOptions[k].optionValue,
                                pdfName: pdfName,
                                questionType: questionType
                            });
                            break;
                        }
                    }
                }
            }
            else if(questionType==='numberedDropdown'){
                var stEl = qBlock.querySelector('#numberRangeStart'+questionId);
                var enEl = qBlock.querySelector('#numberRangeEnd'+questionId);
                var st = stEl ? parseInt(stEl.value,10):1;
                var en = enEl ? parseInt(enEl.value,10):1;
                var lbls = qBlock.querySelectorAll('#textboxLabels'+questionId+' input');
                var labelVals=[];
                for(var L=0; L<lbls.length; L++){
                    labelVals.push(lbls[L].value);
                }
                formHTML += '<select id="answer'+questionId+'" onchange="showTextboxLabels('+questionId+',this.value)">'+
                            '<option value="" disabled selected>Select an option</option>';
                for(var j=st; j<=en; j++){
                    formHTML += '<option value="'+j+'">'+j+'</option>';
                }
                formHTML += '</select><br>'+
                            '<div id="labelContainer'+questionId+'"></div>'+
                            '<script>'+
                            ' var labels'+questionId+' = '+JSON.stringify(labelVals)+';'+
                            ' function showTextboxLabels(qId, count){'+
                            '   var container = document.getElementById("labelContainer"+qId);'+
                            '   container.innerHTML="";'+
                            '   for(var x=1; x<=count; x++){'+
                            '     for(var y=0; y<labels'+questionId+'.length; y++){'+
                            '       var lb = labels'+questionId+'[y];'+
                            '       var id2=lb.replace(/\\s+/g,"")+x;'+
                            '       container.innerHTML+=("<input type=\\"text\\" id=\\""+id2+"\\" name=\\""+id2+"\\" placeholder=\\""+lb+" "+x+"\\" style=\\"text-align:center;\\"><br>");'+
                            '     }'+
                            '   }'+
                            ' }'+
                            '</script>';
            }
            else if(questionType==='multipleTextboxes'){
                var multiBlocks = qBlock.querySelectorAll('#multipleTextboxesOptions'+questionId+' > div');
                for(var m=0; m<multiBlocks.length; m++){
                    var dEl = multiBlocks[m];
                    var labelInput = dEl.querySelector('#multipleTextboxLabel'+questionId+'_'+(m+1));
                    var nameInput = dEl.querySelector('#multipleTextboxName'+questionId+'_'+(m+1));
                    var phInput = dEl.querySelector('#multipleTextboxPlaceholder'+questionId+'_'+(m+1));

                    var lblVal = labelInput? labelInput.value.trim():('');
                    var nmVal = nameInput? nameInput.value.trim():('answer'+questionId+'_'+(m+1));
                    var phVal = phInput? phInput.value.trim():('');

                    if(lblVal){
                        formHTML+='<label><h3>'+lblVal+'</h3></label><br>';
                    }
                    formHTML+='<input type="text" id="'+nmVal+'" name="'+nmVal+'" placeholder="'+phVal+'" style="text-align:center;"><br>';
                }
            }
            else if(questionType==='money'){
                var mnNmEl = qBlock.querySelector('#textboxName'+questionId);
                var mnPHEl = qBlock.querySelector('#textboxPlaceholder'+questionId);
                var mnName = mnNmEl&&mnNmEl.value? mnNmEl.value : ('answer'+questionId);
                var mnPH = mnPHEl&&mnPHEl.value? mnPHEl.value : 'Enter amount';
                questionNameIds[questionId] = mnName;
                formHTML+='<input type="number" id="'+mnName+'" name="'+mnName+'" min="0" step="0.01" placeholder="'+mnPH+'"><br>';
            }
            else if(questionType==='date'){
                formHTML+='<input type="date" id="answer'+questionId+'" name="answer'+questionId+'" placeholder="Enter a date"><br>';
            }

            formHTML+='</div>'; // end question-container

            // if logic
            if(logicEnabled){
                var logicRows = qBlock.querySelectorAll('.logic-condition-row');
                if(logicRows.length>0){
                    formHTML+='\n<script>\n(function(){\n';
                    formHTML+=' var thisQ = document.getElementById("question-container-'+questionId+'");\n';
                    formHTML+=' function updateVisibility(){\n var anyMatch=false;\n';

                    for(var lr=0; lr<logicRows.length; lr++){
                        var row=logicRows[lr];
                        var rowIndex=lr+1;
                        var pQNumEl = row.querySelector('#prevQuestion'+questionId+'_'+rowIndex);
                        var pAnsEl = row.querySelector('#prevAnswer'+questionId+'_'+rowIndex);
                        if(!pQNumEl||!pAnsEl) continue;
                        var pQNumVal = pQNumEl.value.trim();
                        var pAnsVal = pAnsEl.value.trim().toLowerCase();
                        if(!pQNumVal||!pAnsVal) continue;

                        var pType= questionTypesMap[pQNumVal]||'text';
                        formHTML+=' (function(){\n';
                        formHTML+='   var cPrevType="'+pType+'";\n';
                        formHTML+='   var cPrevAns="'+pAnsVal+'";\n';
                        formHTML+='   var cPrevQNum="'+pQNumVal+'";\n';
                        formHTML+='   if(cPrevType==="checkbox"){\n';
                        formHTML+='     var cbs=document.querySelectorAll(\'input[id^="answer\'+cPrevQNum+\'_"]\');\n';
                        formHTML+='     var checkedVals=[];\n';
                        formHTML+='     for(var cc=0; cc<cbs.length; cc++){ if(cbs[cc].checked) checkedVals.push(cbs[cc].value.trim().toLowerCase());}\n';
                        formHTML+='     if(checkedVals.indexOf(cPrevAns)!==-1){ anyMatch=true;}\n';
                        formHTML+='   } else {\n';
                        formHTML+='     var el=document.getElementById("answer"+cPrevQNum)||document.getElementById(questionNameIds[cPrevQNum]);\n';
                        formHTML+='     if(el){ var val=el.value.trim().toLowerCase(); if(val===cPrevAns){anyMatch=true;} }\n';
                        formHTML+='   }\n';
                        formHTML+=' })();\n';
                    }
                    formHTML+=' if(anyMatch){ thisQ.classList.remove("hidden"); } else{ thisQ.classList.add("hidden");}\n';
                    formHTML+='}\n';

                    // attach events
                    for(var lr2=0; lr2<logicRows.length; lr2++){
                        var row2=logicRows[lr2];
                        var rowIndex2= lr2+1;
                        var pQNumEl2=row2.querySelector('#prevQuestion'+questionId+'_'+rowIndex2);
                        if(!pQNumEl2) continue;
                        var pQVal2= pQNumEl2.value.trim();
                        if(!pQVal2) continue;

                        var pType2= questionTypesMap[pQVal2]||'text';
                        if(pType2==='checkbox'){
                            formHTML+=' (function(){ var cbs=document.querySelectorAll(\'input[id^="answer'+pQVal2+'_"]\');\n';
                            formHTML+='   for(var i=0; i<cbs.length; i++){ cbs[i].addEventListener("change", function(){ updateVisibility();});}\n';
                            formHTML+=' })();\n';
                        }
                        else {
                            formHTML+=' (function(){ var singleEl=document.getElementById("answer'+pQVal2+'")||document.getElementById(questionNameIds["'+pQVal2+'"]);';
                            formHTML+=' if(singleEl){ singleEl.addEventListener("change", function(){ updateVisibility();});}\n';
                            formHTML+='})();\n';
                        }
                    }
                    formHTML+=' updateVisibility();\n';
                    formHTML+='})();\n</script>\n';
                }
            }
        }

        // Section nav
        formHTML+='<br><br><div class="navigation-buttons">';
        if(s>1){
            formHTML+='<button type="button" onclick="navigateSection('+(s-1)+')">Back</button>';
        }
        if(s==sectionCounter-1){
            formHTML+='<button type="submit">Submit</button>';
        } else {
            formHTML+='<button type="button" onclick="handleNext('+s+')">Next</button>';
        }
        formHTML+='</div>';
        formHTML+='</div>'; // end section
    }

    // Insert hidden fields
    var genResult = generateHiddenPDFFields();
    var hiddenFieldsHTML = genResult.hiddenFieldsHTML;
    var hiddenCheckboxCalculations = genResult.hiddenCheckboxCalculations;

    formHTML += hiddenFieldsHTML;

    // close form
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
        '',
        '    var questionNameIds = '+JSON.stringify(questionNameIds)+';',
        '    var jumpLogics = '+JSON.stringify(jumpLogics)+';',
        '    var conditionalPDFs = '+JSON.stringify(conditionalPDFs)+';',
        '    var conditionalAlerts = '+JSON.stringify(conditionalAlerts)+';',
        '',
        '    function handleNext(currentSection){',
        '        var nextSection=currentSection+1;',
        '        var relevantJumps=[];',
        '        for(var i=0; i<jumpLogics.length; i++){',
        '           if(jumpLogics[i].section==currentSection){ relevantJumps.push(jumpLogics[i]); }',
        '        }',
        '        for(var j=0; j<relevantJumps.length; j++){',
        '            var jl=relevantJumps[j];',
        '            var qId= jl.questionId;',
        '            var qType= jl.questionType;',
        '            var jOpt= jl.jumpOption;',
        '            var jTo= jl.jumpTo;',
        '            var nmId= questionNameIds[qId]||("answer"+qId);',
        '            if(qType==="radio"||qType==="dropdown"){',
        '                var el=document.getElementById(nmId);',
        '                if(el && el.value && el.value.trim().toLowerCase()=== jOpt.trim().toLowerCase()){',
        '                    nextSection=jTo; break;',
        '                }',
        '            } else if(qType==="checkbox"){',
        '                var cbs=document.querySelectorAll(\'input[id^="answer\'+qId+\'_"]\');',
        '                if(cbs&&cbs.length){',
        '                    var chosen=[];',
        '                    for(var c=0;c<cbs.length;c++){ if(cbs[c].checked){ chosen.push(cbs[c].value.trim().toLowerCase());} }',
        '                    if(chosen.indexOf(jOpt.trim().toLowerCase())!==-1){ nextSection=jTo; break;}',
        '                }',
        '            }',
        '        }',
        '        navigateSection(nextSection);',
        '        runAllHiddenCheckboxCalculations();',
        '    }',
        '',
        '    function navigateSection(sectionNumber){',
        '        var sections=document.querySelectorAll(".section");',
        '        for(var i=0;i<sections.length;i++){ sections[i].classList.remove("active");}',
        '        var target=document.getElementById("section"+sectionNumber);',
        '        if(target){ target.classList.add("active"); } else{',
        '            sections[sections.length-1].classList.add("active");',
        '        }',
        '    }',
        '',
        '    function setCurrentDate(){',
        '        var today=new Date();',
        '        var dd=String(today.getDate()).padStart(2,"0");',
        '        var mm=String(today.getMonth()+1).padStart(2,"0");',
        '        var yyyy=today.getFullYear();',
        '        var val=yyyy+"-"+mm+"-"+dd;',
        '        document.getElementById("current_date").value=val;',
        '    }',
        '    window.onload=function(){ setCurrentDate(); attachCalculationListeners(); };',
        '',
        '    function handleConditionalAlerts(){',
        '        for(var i=0;i<conditionalAlerts.length;i++){',
        '            var obj=conditionalAlerts[i];',
        '            var prevQEl= document.getElementById("answer"+obj.prevQuestionId);',
        '            if(prevQEl){',
        '                if(prevQEl.value.trim().toLowerCase()===obj.prevAnswer.trim().toLowerCase()){ alert(obj.alertText);}',
        '            } else {',
        '                var cbs=document.querySelectorAll(\'[name^="answer\'+obj.prevQuestionId+\'_"]\');',
        '                for(var x=0;x<cbs.length;x++){',
        '                    if(cbs[x].checked && cbs[x].value.trim().toLowerCase()===obj.prevAnswer.trim().toLowerCase()){',
        '                        alert(obj.alertText);',
        '                    }',
        '                }',
        '            }',
        '        }',
        '    }',
        '',
        '    function showThankYouMessage(){',
        '        var pdfName="'+escapedPdfFormName+'".replace(".pdf","");',
        '        editAndDownloadPDF(pdfName).then(function(){',
        '            // handle cond PDFs',
        '            for(var i=0;i<conditionalPDFs.length;i++){',
        '                var pdfObj=conditionalPDFs[i];',
        '                if(pdfObj.questionType==="checkbox"){',
        '                    var cbox=document.getElementById(pdfObj.questionNameId);',
        '                    if(cbox && cbox.checked && cbox.value===pdfObj.conditionalAnswer){',
        '                        editAndDownloadPDF(pdfObj.pdfName.replace(".pdf",""));',
        '                    }',
        '                } else {',
        '                    var valEl=document.getElementById(pdfObj.questionNameId);',
        '                    var val2= valEl? valEl.value : "";',
        '                    if(val2===pdfObj.conditionalAnswer){',
        '                        editAndDownloadPDF(pdfObj.pdfName.replace(".pdf",""));',
        '                    }',
        '                }',
        '            }',
        '            handleConditionalAlerts();',
        '            document.getElementById("customForm").style.display="none";',
        '            document.getElementById("thankYouMessage").style.display="block";',
        '        });',
        '        return false;',
        '    }',
        '',
        '    function downloadPDF(url, filename){',
        '        var link=document.createElement("a");',
        '        link.href=url;',
        '        link.download=filename;',
        '        document.body.appendChild(link);',
        '        link.click();',
        '        document.body.removeChild(link);',
        '    }',
        '    async function editAndDownloadPDF(pdfName){',
        '        var formData=new FormData();',
        '        var inputs=document.querySelectorAll("#questions input, #questions select, #questions textarea");',
        '        for(var i=0;i<inputs.length;i++){',
        '            var inp=inputs[i];',
        '            if(inp.type==="checkbox"){',
        '                formData.append(inp.name, inp.checked? "Yes":"No");',
        '            } else {',
        '                formData.append(inp.name, inp.value);',
        '            }',
        '        }',
        '        return fetch("/edit_pdf?pdf="+pdfName, {method:"POST", body:formData})',
        '            .then(function(res){return res.blob();})',
        '            .then(function(blob){',
        '                var url=URL.createObjectURL(blob);',
        '                downloadPDF(url, "Edited_"+pdfName+".pdf");',
        '            });',
        '    }',
        '',
        '    /***********************************************',
        '     * Hidden Checkbox Calculations - multi-term',
        '     ***********************************************/'
    ].join('\n');

    // Overwrite hiddenCheckboxCalculations from the DOM data
    var genObj = generateHiddenPDFFields();
    var hiddenCheckboxCalcs = genObj.hiddenCheckboxCalculations;

    formHTML += '\n    var hiddenCheckboxCalculations = ' + JSON.stringify(hiddenCheckboxCalcs) + ';\n';

    formHTML += `
    function runAllHiddenCheckboxCalculations(){
        if(!hiddenCheckboxCalculations || hiddenCheckboxCalculations.length===0) return;
        for(var i=0;i<hiddenCheckboxCalculations.length;i++){
            runSingleHiddenCheckboxCalculation(hiddenCheckboxCalculations[i]);
        }
    }

    /**
     * runs a single hidden checkbox's set of multi-term calculations
     * e.g.
     *  {
     *    hiddenFieldName: "over",
     *    calculations: [
     *      {
     *        terms: [
     *          { questionNameId: "Q1" },
     *          { operator: "+", questionNameId: "Q2" },
     *          { operator: "-", questionNameId: "Q3" }
     *        ],
     *        compareOperator: "=",
     *        threshold: "100",
     *        result: "checked"
     *      }
     *    ]
     *  }
     */
    function runSingleHiddenCheckboxCalculation(calcObj){
        var cbox=document.getElementById(calcObj.hiddenFieldName);
        if(!cbox) return;

        var finalState=cbox.checked;

        // If multiple calculations exist, the last one that "matches" wins
        for(var c=0;c<calcObj.calculations.length;c++){
            var oneCalc = calcObj.calculations[c]; 
            // gather all terms
            // e.g. oneCalc.terms = [ {questionNameId: "Q1"},
            //                        {operator: "+", questionNameId: "Q2"},
            //                        ...]
            var val=0;
            if(oneCalc.terms && oneCalc.terms.length>0){
                // read the 1st term
                var t0 = oneCalc.terms[0];
                val = parseFloat( getMoneyValue(t0.questionNameId) )||0;

                // then apply subsequent terms from left to right
                for(var t=1; t<oneCalc.terms.length; t++){
                    var term = oneCalc.terms[t];
                    var op = term.operator||'';
                    var nextVal = parseFloat( getMoneyValue(term.questionNameId) )||0;

                    if(op==='+') val = val + nextVal;
                    else if(op==='-') val = val - nextVal;
                    else if(op==='x') val = val * nextVal;
                    else if(op==='/') {
                        if(nextVal!==0) val= val / nextVal;
                        else val=0; // or Infinity
                    }
                }
            }

            // compare with threshold
            var thr = parseFloat(oneCalc.threshold)||0;
            var compareOp = oneCalc.compareOperator||'=';
            var matched=false;
            if(compareOp==='='){
                matched=(val===thr);
            } else if(compareOp==='<'){
                matched=(val<thr);
            } else if(compareOp==='>'){
                matched=(val>thr);
            }
            if(matched){
                finalState=(oneCalc.result==='checked');
            }
        }
        cbox.checked= finalState;
    }

    // read numeric value from an element by ID
    function getMoneyValue(qId){
        var el=document.getElementById(qId);
        if(!el) return 0;
        return el.value;
    }

    function attachCalculationListeners(){
        if(!hiddenCheckboxCalculations) return;
        for(var i=0;i<hiddenCheckboxCalculations.length;i++){
            var calcObj = hiddenCheckboxCalculations[i];
            for(var c=0;c<calcObj.calculations.length;c++){
                var oneCalc=calcObj.calculations[c];
                if(!oneCalc.terms) continue;
                for(var t=0;t<oneCalc.terms.length;t++){
                    var term=oneCalc.terms[t];
                    if(term.questionNameId){
                        var el2= document.getElementById(term.questionNameId);
                        if(el2){
                            el2.addEventListener("change", function(){
                                runAllHiddenCheckboxCalculations();
                            });
                        }
                    }
                }
            }
        }
    }
    `;

    formHTML += [
        '</script>',
        '</body>',
        '</html>'
    ].join('\n');

    return formHTML;
}

/********************************************************************
 * generateHiddenPDFFields() 
 *   - Reads from #hiddenFieldsContainer to build hidden fields plus
 *     multi-term calculations for checkboxes
 ********************************************************************/
function generateHiddenPDFFields() {
    var hiddenFieldsHTML = '<div id="hidden_pdf_fields" style="display:none;">';
    var autofillMappings = [];
    var conditionalAutofillLogic = '';
    var hiddenCheckboxCalculations = [];

    var container = document.getElementById('hiddenFieldsContainer');
    if(container){
        var blocks = container.querySelectorAll('.hidden-field-block');
        for(var i=0; i<blocks.length; i++){
            var block=blocks[i];
            var hid = block.id.replace('hiddenFieldBlock','');
            var fieldTypeEl = document.getElementById('hiddenFieldType'+hid);
            var fieldType= fieldTypeEl?fieldTypeEl.value:'text';
            var fieldNameEl= document.getElementById('hiddenFieldName'+hid);
            var fieldName = fieldNameEl? fieldNameEl.value.trim():'';
            if(!fieldName) continue;

            if(fieldType==='text'){
                hiddenFieldsHTML+='\n<input type="text" id="'+fieldName+'" name="'+fieldName+'" placeholder="'+fieldName+'">';
                // (optional: text conditions not shown here)

            } else if(fieldType==='checkbox'){
                var chkEl = document.getElementById('hiddenFieldChecked'+hid);
                var isCheckedDefault = chkEl && chkEl.checked;
                hiddenFieldsHTML+='\n<div style="display:none;">'+
                    '<label class="checkbox-label">'+
                    '<input type="checkbox" id="'+fieldName+'" name="'+fieldName+'" '+(isCheckedDefault?'checked':'')+'>'+
                    fieldName+
                    '</label></div>';

                // Now parse the "calculationBlock"
                var calcBlock = block.querySelector('#calculationBlock'+hid);
                if(calcBlock){
                    var calcRows = calcBlock.querySelectorAll('div[id^="calculationRow"]');
                    if(calcRows.length>0){
                        var calcArray=[];
                        for(var c=0;c<calcRows.length;c++){
                            var row=calcRows[c];
                            var rowIdParts = row.id.split('_'); // e.g. "calculationRow5_2"
                            var rowId = rowIdParts[1];

                            // find the eqContainer
                            var eqContainerId = 'equationContainer'+hid+'_'+rowId;
                            var eqContainer = row.querySelector('#'+eqContainerId);
                            var termsArray=[];
                            if(eqContainer){
                                var termDivs= eqContainer.querySelectorAll('.equation-term');
                                for(var t=0; t<termDivs.length; t++){
                                    var termDiv=termDivs[t];
                                    var termIdx = t+1;
                                    // if first term => no operator
                                    // else operator from 
                                    var opSelectId = 'calcTermOperator'+hid+'_'+rowId+'_'+termIdx;
                                    var opEl = document.getElementById(opSelectId);
                                    var operatorVal = opEl? opEl.value : '';

                                    var qSelId = 'calcTermQuestion'+hid+'_'+rowId+'_'+termIdx;
                                    var qEl = document.getElementById(qSelId);
                                    var questionNameIdVal = qEl? qEl.value.trim():'';

                                    if(questionNameIdVal){
                                        termsArray.push({
                                            operator: (t===0?'':operatorVal),
                                            questionNameId: questionNameIdVal
                                        });
                                    }
                                }
                            }

                            // compare operator
                            var compareOpId='calcCompareOperator'+hid+'_'+rowId;
                            var compareOpEl= document.getElementById(compareOpId);
                            var compareOpVal= compareOpEl? compareOpEl.value:'=';

                            // threshold
                            var thrId='calcThreshold'+hid+'_'+rowId;
                            var thrEl= document.getElementById(thrId);
                            var thrVal= thrEl? thrEl.value.trim():'0';

                            // result
                            var resId='calcResult'+hid+'_'+rowId;
                            var resEl= document.getElementById(resId);
                            var resVal= resEl? resEl.value:'checked';

                            if(termsArray.length>0){
                                calcArray.push({
                                    terms: termsArray,
                                    compareOperator: compareOpVal,
                                    threshold: thrVal,
                                    result: resVal
                                });
                            }
                        }
                        if(calcArray.length>0){
                            hiddenCheckboxCalculations.push({
                                hiddenFieldName: fieldName,
                                calculations: calcArray
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
        autofillMappings: autofillMappings,
        conditionalAutofillLogic: conditionalAutofillLogic,
        hiddenCheckboxCalculations: hiddenCheckboxCalculations
    };
}
