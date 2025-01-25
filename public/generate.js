/*********************************************
 * generate.js - with hidden checkbox calculations
 *   and hidden fields truly hidden by default
 *   (No arrow functions / optional chaining)
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

    // Track question IDs -> name IDs
    var questionNameIds = {};
    // Track question types
    var questionTypesMap = {};

    // Arrays for PDF logic, alerts, jump logic, etc.
    var conditionalPDFs = [];
    var conditionalAlerts = [];
    var jumpLogics = [];

    // Possibly read user’s desired PDF name from a field:
    var pdfFormNameInputEl = document.getElementById('formPDFName');
    var pdfFormNameInput = pdfFormNameInputEl ? pdfFormNameInputEl.value.trim() : '';
    var pdfFormName = pdfFormNameInput || 'default.pdf';

    // Escape for injection
    var escapedPdfFormName = pdfFormName
        .replace(/\\/g, '\\\\')
        .replace(/'/g, '\\\'')
        .replace(/"/g, '\\"');

    // --------------------------------------------------
    // Build each section from the in-editor DOM
    // --------------------------------------------------
    for (var s = 1; s < sectionCounter; s++) {
        var sectionBlock = document.getElementById('sectionBlock' + s);
        if (!sectionBlock) continue;

        var sectionNameInput = sectionBlock.querySelector('#sectionName' + s);
        var sectionName = sectionNameInput ? sectionNameInput.value : ('Section ' + s);

        // Start the section
        formHTML += '<div id="section' + s + '" class="section' + (s === 1 ? ' active' : '') + '">';
        formHTML += '<h2>' + sectionName + '</h2>';

        // For each question in that section
        var questionsInSection = sectionBlock.querySelectorAll('.question-block');
        for (var qIndex = 0; qIndex < questionsInSection.length; qIndex++) {
            var questionBlock = questionsInSection[qIndex];
            var questionId = questionBlock.id.replace('questionBlock', '');
            var questionTextEl = questionBlock.querySelector('#question' + questionId);
            var questionText = questionTextEl ? questionTextEl.value : '';
            var questionTypeEl = questionBlock.querySelector('#questionType' + questionId);
            var questionType = questionTypeEl ? questionTypeEl.value : 'text';

            // Save type for logic later
            questionTypesMap[questionId] = questionType;

            // Check if logic is enabled
            var logicCheckbox = questionBlock.querySelector('#logic' + questionId);
            var logicEnabled = logicCheckbox && logicCheckbox.checked;

            // Jump logic
            var jumpCheckbox = questionBlock.querySelector('#enableJump' + questionId);
            var jumpEnabled = jumpCheckbox && jumpCheckbox.checked;
            var jumpToEl = questionBlock.querySelector('#jumpTo' + questionId);
            var jumpOptionEl = questionBlock.querySelector('#jumpOption' + questionId);
            var jumpTo = jumpToEl ? jumpToEl.value : '';
            var jumpOption = jumpOptionEl ? jumpOptionEl.value : '';
            if (jumpEnabled && jumpTo) {
                jumpLogics.push({
                    questionId: questionId,
                    questionNameId: '',
                    jumpOption: jumpOption,
                    jumpTo: jumpTo,
                    section: s,
                    questionType: questionType
                });
            }

            // Conditional PDF
            var enablePDFEl = questionBlock.querySelector('#enableConditionalPDF' + questionId);
            var conditionalPDFEnabled = enablePDFEl && enablePDFEl.checked;
            var conditionalPDFNameEl = questionBlock.querySelector('#conditionalPDFName' + questionId);
            var conditionalPDFAnswerEl = questionBlock.querySelector('#conditionalPDFAnswer' + questionId);
            var conditionalPDFName = conditionalPDFNameEl ? conditionalPDFNameEl.value : '';
            var conditionalPDFAnswer = conditionalPDFAnswerEl ? conditionalPDFAnswerEl.value : '';

            // Conditional Alert
            var enableAlertEl = questionBlock.querySelector('#enableConditionalAlert' + questionId);
            var conditionalAlertEnabled = enableAlertEl && enableAlertEl.checked;
            var alertPrevQEl = questionBlock.querySelector('#alertPrevQuestion' + questionId);
            var alertPrevAEl = questionBlock.querySelector('#alertPrevAnswer' + questionId);
            var alertTextEl = questionBlock.querySelector('#alertText' + questionId);

            var alertPrevQuestion = alertPrevQEl ? alertPrevQEl.value : '';
            var alertPrevAnswer = alertPrevAEl ? alertPrevAEl.value : '';
            var alertText = alertTextEl ? alertTextEl.value : '';

            if (conditionalAlertEnabled && alertPrevQuestion && alertPrevAnswer && alertText) {
                conditionalAlerts.push({
                    questionId: questionId,
                    prevQuestionId: alertPrevQuestion,
                    prevAnswer: alertPrevAnswer,
                    alertText: alertText
                });
            }

            // Start question container
            formHTML += '<div id="question-container-' + questionId + '"';
            if (logicEnabled) {
                formHTML += ' class="hidden"';
            }
            formHTML += '>';
            formHTML += '<label><h3>' + questionText + '</h3></label>';

            // Render question by type
            if (questionType === 'text') {
                var textNameEl = questionBlock.querySelector('#textboxName' + questionId);
                var textPlaceholderEl = questionBlock.querySelector('#textboxPlaceholder' + questionId);
                var nameId = textNameEl && textNameEl.value ? textNameEl.value : ('answer' + questionId);
                var placeholder = textPlaceholderEl && textPlaceholderEl.value ? textPlaceholderEl.value : '';
                questionNameIds[questionId] = nameId;
                formHTML += '<input type="text" id="' + nameId + '" name="' + nameId + '" placeholder="' + placeholder + '"><br><br>';

            } else if (questionType === 'bigParagraph') {
                var bigNameEl = questionBlock.querySelector('#textboxName' + questionId);
                var bigPlaceholderEl = questionBlock.querySelector('#textboxPlaceholder' + questionId);
                var bigNameId = bigNameEl && bigNameEl.value ? bigNameEl.value : ('answer' + questionId);
                var bigPlaceholder = bigPlaceholderEl && bigPlaceholderEl.value ? bigPlaceholderEl.value : '';
                questionNameIds[questionId] = bigNameId;
                formHTML += '<textarea id="' + bigNameId + '" name="' + bigNameId + '" rows="5" cols="50" placeholder="' + bigPlaceholder + '"></textarea><br>';

            } else if (questionType === 'radio') {
                var radioNameEl = questionBlock.querySelector('#textboxName' + questionId);
                var radioName = radioNameEl && radioNameEl.value ? radioNameEl.value : ('answer' + questionId);
                questionNameIds[questionId] = radioName;
                formHTML += '<select id="' + radioName + '" name="' + radioName + '">' +
                    '<option value="" disabled selected>Select an option</option>' +
                    '<option value="Yes">Yes</option>' +
                    '<option value="No">No</option>' +
                    '</select><br>';
                if (conditionalPDFEnabled) {
                    conditionalPDFs.push({
                        questionId: questionId,
                        questionNameId: radioName,
                        conditionalAnswer: conditionalPDFAnswer,
                        pdfName: conditionalPDFName,
                        questionType: questionType
                    });
                }

            } else if (questionType === 'dropdown') {
                var dropNameEl = questionBlock.querySelector('#textboxName' + questionId);
                var dropName = dropNameEl && dropNameEl.value ? dropNameEl.value : ('answer' + questionId);
                questionNameIds[questionId] = dropName;
                formHTML += '<select id="' + dropName + '" name="' + dropName + '">' +
                            '<option value="" disabled selected>Select an option</option>';
                var dropOpts = questionBlock.querySelectorAll('#dropdownOptions' + questionId + ' input[type="text"]');
                for (var doIdx = 0; doIdx < dropOpts.length; doIdx++) {
                    var dVal = dropOpts[doIdx].value.trim();
                    if (dVal) {
                        formHTML += '<option value="' + dVal + '">' + dVal + '</option>';
                    }
                }
                formHTML += '</select><br>';

            } else if (questionType === 'checkbox') {
                var cOptsDivs = questionBlock.querySelectorAll('#checkboxOptions' + questionId + ' > div');
                var cboxOptions = [];
                formHTML += '<div><center><div id="checkmark">';

                for (var co = 0; co < cOptsDivs.length; co++) {
                    var optDiv = cOptsDivs[co];
                    var txtEl = optDiv.querySelector('#checkboxOptionText' + questionId + '_' + (co + 1));
                    var nameEl = optDiv.querySelector('#checkboxOptionName' + questionId + '_' + (co + 1));
                    var valEl = optDiv.querySelector('#checkboxOptionValue' + questionId + '_' + (co + 1));

                    var labelText = txtEl && txtEl.value.trim() ? txtEl.value.trim() : ('Option ' + (co + 1));
                    var nameIdRaw = nameEl && nameEl.value.trim() ? nameEl.value.trim() : '';
                    var valRaw = valEl && valEl.value.trim() ? valEl.value.trim() : '';

                    var forcedPrefix = 'answer' + questionId + '_';
                    if (!nameIdRaw) {
                        var sanitized = labelText.replace(/\W+/g, "_").toLowerCase();
                        nameIdRaw = forcedPrefix + sanitized;
                    } else if (nameIdRaw.indexOf(forcedPrefix) !== 0) {
                        nameIdRaw = forcedPrefix + nameIdRaw;
                    }
                    if (!valRaw) valRaw = labelText;

                    cboxOptions.push({ labelText: labelText, optionNameId: nameIdRaw, optionValue: valRaw });

                    formHTML += '<span class="checkbox-inline">' +
                        '<label class="checkbox-label">' +
                        '<input type="checkbox" id="' + nameIdRaw + '" name="' + nameIdRaw + '" value="' + valRaw + '">' +
                         labelText +
                        '</label>' +
                        '</span>';
                }

                var noneEl = questionBlock.querySelector('#noneOfTheAbove' + questionId);
                if (noneEl && noneEl.checked) {
                    var notStr = 'None of the above';
                    var forcedPre2 = 'answer' + questionId + '_';
                    var sanitized2 = notStr.replace(/\W+/g, "_").toLowerCase();
                    var notNameId = forcedPre2 + sanitized2;
                    cboxOptions.push({ labelText: notStr, optionNameId: notNameId, optionValue: notStr });
                    formHTML += '<span class="checkbox-inline">' +
                        '<label class="checkbox-label">' +
                        '<input type="checkbox" id="' + notNameId + '" name="' + notNameId + '" value="' + notStr + '">' +
                        notStr +
                        '</label>' +
                        '</span>';
                }
                formHTML += '</div><br></div>';

                // If conditional PDF is for a specific checkbox option
                if (conditionalPDFEnabled) {
                    for (var cco = 0; cco < cboxOptions.length; cco++) {
                        if (cboxOptions[cco].labelText === conditionalPDFAnswer) {
                            conditionalPDFs.push({
                                questionId: questionId,
                                questionNameId: cboxOptions[cco].optionNameId,
                                conditionalAnswer: cboxOptions[cco].optionValue,
                                pdfName: conditionalPDFName,
                                questionType: questionType
                            });
                            break;
                        }
                    }
                }

            } else if (questionType === 'numberedDropdown') {
                var rngStartEl = questionBlock.querySelector('#numberRangeStart' + questionId);
                var rngEndEl = questionBlock.querySelector('#numberRangeEnd' + questionId);
                var rngStart = rngStartEl ? parseInt(rngStartEl.value, 10) : 1;
                var rngEnd = rngEndEl ? parseInt(rngEndEl.value, 10) : 1;
                var lblInputs = questionBlock.querySelectorAll('#textboxLabels' + questionId + ' input');
                var labelVals = [];
                for (var lii = 0; lii < lblInputs.length; lii++) {
                    labelVals.push(lblInputs[lii].value);
                }
                formHTML += '<select id="answer' + questionId + '" onchange="showTextboxLabels(' + questionId + ', this.value)">' +
                            '<option value="" disabled selected>Select an option</option>';
                for (var rnum = rngStart; rnum <= rngEnd; rnum++) {
                    formHTML += '<option value="' + rnum + '">' + rnum + '</option>';
                }
                formHTML += '</select><br>' +
                            '<div id="labelContainer' + questionId + '"></div>' +
                            '<script>' +
                            '   var labels' + questionId + ' = ' + JSON.stringify(labelVals) + ';' +
                            '   function showTextboxLabels(qId, count) {' +
                            '       var container = document.getElementById("labelContainer" + qId);' +
                            '       container.innerHTML = "";' +
                            '       for (var j = 1; j <= count; j++) {' +
                            '           for (var lv = 0; lv < labels' + questionId + '.length; lv++) {' +
                            '               var label = labels' + questionId + '[lv];' +
                            '               var inputId = label.replace(/\\s+/g, "") + j;' +
                            '               container.innerHTML += "<input type=\\"text\\" id=\\"" + inputId + "\\" name=\\"" + inputId + "\\" placeholder=\\"" + label + " " + j + "\\" style=\\"text-align:center;\\"><br>";' +
                            '           }' +
                            '       }' +
                            '   }' +
                            '</script>';

            } else if (questionType === 'multipleTextboxes') {
                var multiTBs = questionBlock.querySelectorAll('#multipleTextboxesOptions' + questionId + ' > div');
                for (var mb = 0; mb < multiTBs.length; mb++) {
                    var divEl = multiTBs[mb];
                    var lblEl = divEl.querySelector('#multipleTextboxLabel' + questionId + '_' + (mb + 1));
                    var nmEl = divEl.querySelector('#multipleTextboxName' + questionId + '_' + (mb + 1));
                    var phEl = divEl.querySelector('#multipleTextboxPlaceholder' + questionId + '_' + (mb + 1));

                    var lblTxt = lblEl ? lblEl.value.trim() : '';
                    var nmVal = nmEl ? (nmEl.value || '') : '';
                    var phVal = phEl ? (phEl.value || '') : '';

                    if (!nmVal) {
                        nmVal = 'answer' + questionId + '_' + (mb + 1);
                    }
                    if (lblTxt) {
                        formHTML += '<label><h3>' + lblTxt + '</h3></label><br>';
                    }
                    formHTML += '<input type="text" id="' + nmVal + '" name="' + nmVal + '" placeholder="' + phVal + '" style="text-align:center;"><br>';
                }

            } else if (questionType === 'money') {
                var moneyNameEl = questionBlock.querySelector('#textboxName' + questionId);
                var moneyPlaceholderEl = questionBlock.querySelector('#textboxPlaceholder' + questionId);
                var moneyName = moneyNameEl && moneyNameEl.value ? moneyNameEl.value : ('answer' + questionId);
                var moneyPH = moneyPlaceholderEl && moneyPlaceholderEl.value ? moneyPlaceholderEl.value : 'Enter amount';
                questionNameIds[questionId] = moneyName;
                formHTML += '<input type="number" id="' + moneyName + '" name="' + moneyName + '" min="0" step="0.01" placeholder="' + moneyPH + '"><br>';

            } else if (questionType === 'date') {
                formHTML += '<input type="date" id="answer' + questionId + '" name="answer' + questionId + '" placeholder="Enter a date"><br>';
            }

            // Close question container
            formHTML += '</div>';

            // If multiple-OR logic is enabled, generate a script block
            if (logicEnabled) {
                var logicRows = questionBlock.querySelectorAll('.logic-condition-row');
                if (logicRows.length > 0) {
                    formHTML += '\n<script>\n(function(){\n';
                    formHTML += '    var thisQ = document.getElementById("question-container-' + questionId + '");\n';
                    formHTML += '    function updateVisibility() {\n';
                    formHTML += '        var anyMatch = false;\n';

                    for (var lrIdx = 0; lrIdx < logicRows.length; lrIdx++) {
                        var row = logicRows[lrIdx];
                        var rowIndex = lrIdx + 1;
                        var prevQNumEl = row.querySelector('#prevQuestion' + questionId + '_' + rowIndex);
                        var prevAnswerEl = row.querySelector('#prevAnswer' + questionId + '_' + rowIndex);
                        if (!prevQNumEl || !prevAnswerEl) continue;
                        var prevQNumVal = prevQNumEl.value.trim();
                        var prevAnswerVal = prevAnswerEl.value.trim().toLowerCase();
                        if (!prevQNumVal || !prevAnswerVal) continue;

                        var pType = questionTypesMap[prevQNumVal] || 'text';
                        formHTML += '        (function checkCond' + lrIdx + '(){\n';
                        formHTML += '            var cPrevType = "' + pType + '";\n';
                        formHTML += '            var cPrevAns = "' + prevAnswerVal + '";\n';
                        formHTML += '            var cPrevQNum = "' + prevQNumVal + '";\n';
                        formHTML += '            if (cPrevType === "checkbox") {\n';
                        formHTML += '                var cbs = document.querySelectorAll(\'input[id^="answer\' + cPrevQNum + \'_"]\');\n';
                        formHTML += '                var checkedVals = [];\n';
                        formHTML += '                for (var cc = 0; cc < cbs.length; cc++) {\n';
                        formHTML += '                    if (cbs[cc].checked) checkedVals.push(cbs[cc].value.trim().toLowerCase());\n';
                        formHTML += '                }\n';
                        formHTML += '                if (checkedVals.indexOf(cPrevAns) !== -1) {\n';
                        formHTML += '                    anyMatch = true;\n';
                        formHTML += '                }\n';
                        formHTML += '            } else {\n';
                        formHTML += '                var el = document.getElementById("answer" + cPrevQNum) || document.getElementById(questionNameIds[cPrevQNum]);\n';
                        formHTML += '                if (el) {\n';
                        formHTML += '                    var val = el.value.trim().toLowerCase();\n';
                        formHTML += '                    if (val === cPrevAns) {\n';
                        formHTML += '                        anyMatch = true;\n';
                        formHTML += '                    }\n';
                        formHTML += '                }\n';
                        formHTML += '            }\n';
                        formHTML += '        })();\n';
                    }

                    formHTML += '\n        if (anyMatch) {\n';
                    formHTML += '            thisQ.classList.remove("hidden");\n';
                    formHTML += '        } else {\n';
                    formHTML += '            thisQ.classList.add("hidden");\n';
                    formHTML += '        }\n';
                    formHTML += '    }\n';

                    // Attach event listeners for each logic row
                    for (var lr2 = 0; lr2 < logicRows.length; lr2++) {
                        var row2 = logicRows[lr2];
                        var rowIndex2 = lr2 + 1;
                        var pQNumEl2 = row2.querySelector('#prevQuestion' + questionId + '_' + rowIndex2);
                        if (!pQNumEl2) continue;
                        var pQNumVal2 = pQNumEl2.value.trim();
                        if (!pQNumVal2) continue;

                        var pType2 = questionTypesMap[pQNumVal2] || 'text';
                        if (pType2 === 'checkbox') {
                            formHTML += '    (function attachEvent' + lr2 + '(){\n';
                            formHTML += '        var cbs = document.querySelectorAll(\'input[id^="answer' + pQNumVal2 + '_"]\');\n';
                            formHTML += '        for (var i = 0; i < cbs.length; i++) {\n';
                            formHTML += '            cbs[i].addEventListener("change", function(){ updateVisibility(); });\n';
                            formHTML += '        }\n';
                            formHTML += '    })();\n';
                        } else {
                            formHTML += '    (function attachEvent' + lr2 + '(){\n';
                            formHTML += '        var singleEl = document.getElementById("answer' + pQNumVal2 + '") || document.getElementById(questionNameIds["' + pQNumVal2 + '"]);\n';
                            formHTML += '        if (singleEl) {\n';
                            formHTML += '            singleEl.addEventListener("change", function(){ updateVisibility(); });\n';
                            formHTML += '        }\n';
                            formHTML += '    })();\n';
                        }
                    }
                    formHTML += '    updateVisibility();\n';
                    formHTML += '})();\n</script>\n';
                }
            }
        } // end for each question

        // Add navigation buttons
        formHTML += '<br><br><div class="navigation-buttons">';
        if (s > 1) {
            formHTML += '<button type="button" onclick="navigateSection(' + (s - 1) + ')">Back</button>';
        }
        if (s === sectionCounter - 1) {
            formHTML += '<button type="submit">Submit</button>';
        } else {
            formHTML += '<button type="button" onclick="handleNext(' + s + ')">Next</button>';
        }
        formHTML += '</div>';

        // Close the section
        formHTML += '</div>';
    }

    // --------------------------------------------------
    // Insert hidden fields
    // --------------------------------------------------
    var genResult = generateHiddenPDFFields();
    var hiddenFieldsHTML = genResult.hiddenFieldsHTML;
    var autofillMappings = genResult.autofillMappings;
    var conditionalAutofillLogic = genResult.conditionalAutofillLogic;
    var hiddenCheckboxCalculations = genResult.hiddenCheckboxCalculations;

    formHTML += hiddenFieldsHTML;

    // Close the form & page HTML
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
        '    // -----------------------------------------',
        '    // Firebase initialization (if used)',
        '    // -----------------------------------------',
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
        '',
        '    firebase.auth().onAuthStateChanged(function(user) {',
        '        if (user) {',
        '            userId = user.uid;',
        '        } else {',
        '            console.log("User not logged in.");',
        '            window.location.href = "account.html";',
        '        }',
        '    });',
        '',
        '    // questionNameIds used for logic & jump',
        '    var questionNameIds = ' + JSON.stringify(questionNameIds) + ';',
        '    // jumpLogics',
        '    var jumpLogics = ' + JSON.stringify(jumpLogics) + ';',
        '    // conditional PDFs',
        '    var conditionalPDFs = ' + JSON.stringify(conditionalPDFs) + ';',
        '    // conditional alerts',
        '    var conditionalAlerts = ' + JSON.stringify(conditionalAlerts) + ';',
        '',
        '    // For "Next" button w/ jump logic',
        '    function handleNext(currentSection) {',
        '        var nextSection = currentSection + 1;',
        '        var relevantJumps = [];',
        '        for(var i=0; i<jumpLogics.length; i++){',
        '            if(jumpLogics[i].section == currentSection){',
        '                relevantJumps.push(jumpLogics[i]);',
        '            }',
        '        }',
        '',
        '        for(var j=0; j<relevantJumps.length; j++){',
        '            var jlogic = relevantJumps[j];',
        '            var questionId = jlogic.questionId;',
        '            var questionType = jlogic.questionType;',
        '            var jumpOption = jlogic.jumpOption;',
        '            var jumpTo = jlogic.jumpTo;',
        '            var nameId = questionNameIds[questionId] || ("answer" + questionId);',
        '',
        '            if(questionType === "radio" || questionType === "dropdown"){',
        '                var el = document.getElementById(nameId);',
        '                if(el && el.value && el.value.trim().toLowerCase() === jumpOption.trim().toLowerCase()){',
        '                    nextSection = jumpTo;',
        '                    break;',
        '                }',
        '            } else if(questionType === "checkbox"){',
        '                var cbs = document.querySelectorAll(\'input[id^="answer\' + questionId + \'_"]\');',
        '                if(cbs && cbs.length){',
        '                    var chosen = [];',
        '                    for(var c=0; c<cbs.length; c++){',
        '                        if(cbs[c].checked){',
        '                            chosen.push(cbs[c].value.trim().toLowerCase());',
        '                        }',
        '                    }',
        '                    if(chosen.indexOf(jumpOption.trim().toLowerCase()) !== -1){',
        '                        nextSection = jumpTo;',
        '                        break;',
        '                    }',
        '                }',
        '            }',
        '        }',
        '        navigateSection(nextSection);',
        '',
        '        // Also run calculations so they update after user clicks Next',
        '        runAllHiddenCheckboxCalculations();',
        '    }',
        '',
        '    function navigateSection(sectionNumber) {',
        '        var sections = document.querySelectorAll(".section");',
        '        for(var i=0; i<sections.length; i++){',
        '            sections[i].classList.remove("active");',
        '        }',
        '        var target = document.getElementById("section" + sectionNumber);',
        '        if(target){',
        '            target.classList.add("active");',
        '        } else {',
        '            sections[sections.length - 1].classList.add("active");',
        '        }',
        '    }',
        '',
        '    // set date field',
        '    function setCurrentDate() {',
        '        var today = new Date();',
        '        var dd = String(today.getDate()).padStart(2, "0");',
        '        var mm = String(today.getMonth() + 1).padStart(2, "0");',
        '        var yyyy = today.getFullYear();',
        '        today = yyyy + "-" + mm + "-" + dd;',
        '        document.getElementById("current_date").value = today;',
        '    }',
        '    window.onload = function() {',
        '        setCurrentDate();',
        '        // attach calculation listeners so hidden checkboxes update in real-time',
        '        attachCalculationListeners();',
        '    };',
        '',
        '    // conditional alerts',
        '    function handleConditionalAlerts() {',
        '        for(var i=0; i<conditionalAlerts.length; i++){',
        '            var alertObj = conditionalAlerts[i];',
        '            var prevQuestionId = alertObj.prevQuestionId;',
        '            var prevAnswer = alertObj.prevAnswer;',
        '            var alertText = alertObj.alertText;',
        '            var prevQEl = document.getElementById("answer" + prevQuestionId);',
        '            if(prevQEl){',
        '                if(prevQEl.value.trim().toLowerCase() === prevAnswer.trim().toLowerCase()){',
        '                    alert(alertText);',
        '                }',
        '            } else {',
        '                // check a checkbox group',
        '                var cbs = document.querySelectorAll(\'[name^="answer\' + prevQuestionId + \'_"]\');',
        '                for(var c=0; c<cbs.length; c++){',
        '                    if(cbs[c].checked && cbs[c].value.trim().toLowerCase() === prevAnswer.trim().toLowerCase()){',
        '                        alert(alertText);',
        '                    }',
        '                }',
        '            }',
        '        }',
        '    }',
        '',
        '    // On form submit',
        '    function showThankYouMessage() {',
        '        var pdfName = "' + escapedPdfFormName + '".replace(".pdf", "");',
        '        editAndDownloadPDF(pdfName).then(function() {',
        '            // handle conditional PDFs',
        '            for(var i=0; i<conditionalPDFs.length; i++){',
        '                var pdfObj = conditionalPDFs[i];',
        '                if(pdfObj.questionType === "checkbox"){',
        '                    var cbox = document.getElementById(pdfObj.questionNameId);',
        '                    if(cbox && cbox.checked && cbox.value === pdfObj.conditionalAnswer){',
        '                        editAndDownloadPDF(pdfObj.pdfName.replace(".pdf",""));',
        '                    }',
        '                } else {',
        '                    var val = "";',
        '                    var valEl = document.getElementById(pdfObj.questionNameId);',
        '                    if(valEl){ val = valEl.value; }',
        '                    if(val === pdfObj.conditionalAnswer){',
        '                        editAndDownloadPDF(pdfObj.pdfName.replace(".pdf",""));',
        '                    }',
        '                }',
        '            }',
        '            handleConditionalAlerts();',
        '            document.getElementById("customForm").style.display = "none";',
        '            document.getElementById("thankYouMessage").style.display = "block";',
        '        });',
        '        return false;',
        '    }',
        '',
        '    // PDF generation logic',
        '    function downloadPDF(url, filename) {',
        '        var link = document.createElement("a");',
        '        link.href = url;',
        '        link.download = filename;',
        '        document.body.appendChild(link);',
        '        link.click();',
        '        document.body.removeChild(link);',
        '    }',
        '    async function editAndDownloadPDF(pdfName) {',
        '        var formData = new FormData();',
        '        var inputs = document.querySelectorAll("#questions input, #questions select, #questions textarea");',
        '        for(var i=0; i<inputs.length; i++){',
        '            var inp = inputs[i];',
        '            if(inp.type === "checkbox"){',
        '                formData.append(inp.name, inp.checked ? "Yes" : "No");',
        '            } else {',
        '                formData.append(inp.name, inp.value);',
        '            }',
        '        }',
        '        return fetch("/edit_pdf?pdf=" + pdfName, { method: "POST", body: formData })',
        '            .then(function(res){return res.blob();})',
        '            .then(function(blob){',
        '                var url = URL.createObjectURL(blob);',
        '                downloadPDF(url, "Edited_" + pdfName + ".pdf");',
        '            });',
        '    }',
        '',
        '    /***********************************************',
        '     * Hidden Checkbox Calculations',
        '     ***********************************************/',
        // This is where we actually embed the real array
        '    var hiddenCheckboxCalculations = ' + JSON.stringify(hiddenCheckboxCalculations) + ';',
        '',
        '    // Evaluate all calculations at once',
        '    function runAllHiddenCheckboxCalculations() {',
        '        if(!hiddenCheckboxCalculations || hiddenCheckboxCalculations.length === 0) return;',
        '        for(var i=0; i<hiddenCheckboxCalculations.length; i++){',
        '            runSingleHiddenCheckboxCalculation(hiddenCheckboxCalculations[i]);',
        '        }',
        '    }',
        '',
        '    // Evaluate one hidden checkbox\'s calculations',
        '    function runSingleHiddenCheckboxCalculation(calcObj) {',
        '        var hiddenCheckbox = document.getElementById(calcObj.hiddenFieldName);',
        '        if(!hiddenCheckbox) return;',
        '',
        '        var finalState = hiddenCheckbox.checked;',
        '        for(var c=0; c<calcObj.calculations.length; c++){',
        '            var cond = calcObj.calculations[c];',
        '            var qEl = document.getElementById(cond.questionNameId);',
        '            if(!qEl) continue;',
        '            var valNum = parseFloat(qEl.value) || 0;',
        '',
        '            var isMatch = false;',
        '            if(cond.operator === "="){',
        '                isMatch = (valNum === parseFloat(cond.threshold));',
        '            } else if(cond.operator === "<"){',
        '                isMatch = (valNum < parseFloat(cond.threshold));',
        '            } else if(cond.operator === ">"){',
        '                isMatch = (valNum > parseFloat(cond.threshold));',
        '            }',
        '            if(isMatch){',
        '                finalState = (cond.result === "checked");',
        '            }',
        '        }',
        '        hiddenCheckbox.checked = finalState;',
        '    }',
        '',
        '    function attachCalculationListeners() {',
        '        for(var i=0; i<hiddenCheckboxCalculations.length; i++){',
        '            var calcObj = hiddenCheckboxCalculations[i];',
        '            for(var j=0; j<calcObj.calculations.length; j++){',
        '                var c = calcObj.calculations[j];',
        '                var qEl = document.getElementById(c.questionNameId);',
        '                if(qEl){',
        '                    qEl.addEventListener("change", function(){',
        '                        runAllHiddenCheckboxCalculations();',
        '                    });',
        '                }',
        '            }',
        '        }',
        '    }',
        '</script>',
        '</body>',
        '</html>'
    ].join('\n');

    return formHTML;
}

/**
 * Reads all hidden fields from the DOM (#hiddenFieldsContainer)
 * and returns an object containing:
 *   - hiddenFieldsHTML: the actual <input> elements (hidden or style=none)
 *   - hiddenCheckboxCalculations: array of calculation rules
 */
function generateHiddenPDFFields() {
    var hiddenFieldsHTML = '<div id="hidden_pdf_fields" style="display:none;">';
    var autofillMappings = [];
    var conditionalAutofillLogic = '';
    var hiddenCheckboxCalculations = [];

    var hiddenFieldsContainer = document.getElementById('hiddenFieldsContainer');
    if (hiddenFieldsContainer) {
        var hiddenFieldBlocks = hiddenFieldsContainer.querySelectorAll('.hidden-field-block');
        for (var i = 0; i < hiddenFieldBlocks.length; i++) {
            var fieldBlock = hiddenFieldBlocks[i];
            var hiddenFieldId = fieldBlock.id.replace('hiddenFieldBlock', '');
            var fieldTypeEl = document.getElementById('hiddenFieldType' + hiddenFieldId);
            var fieldType = fieldTypeEl ? fieldTypeEl.value : 'text';
            var fieldNameEl = document.getElementById('hiddenFieldName' + hiddenFieldId);
            var fieldName = fieldNameEl ? fieldNameEl.value.trim() : '';
            if (!fieldName) continue;

            if (fieldType === 'text') {
                hiddenFieldsHTML += '\n<input type="text" id="' + fieldName + '" name="' + fieldName + '" placeholder="' + fieldName + '">';
                // If you want to handle text conditions, you can do so here.

            } else if (fieldType === 'checkbox') {
                var checkedEl = document.getElementById('hiddenFieldChecked' + hiddenFieldId);
                var isCheckedByDefault = checkedEl && checkedEl.checked;

                // Render the checkbox (normally hidden)
                hiddenFieldsHTML += '\n<div style="display:none;">' +
                    '   <label class="checkbox-label">' +
                    '       <input type="checkbox" id="' + fieldName + '" name="' + fieldName + '" ' + (isCheckedByDefault ? 'checked' : '') + '>' +
                    '       ' + fieldName +
                    '   </label>' +
                    '</div>';

                // Now gather “Add Calculation” rows from the GUI
                var calculationBlock = fieldBlock.querySelector('#calculationBlock' + hiddenFieldId);
                if (!calculationBlock) continue;

                var calcRows = calculationBlock.querySelectorAll('div[id^="calculationRow"]');
                if (calcRows.length > 0) {
                    var calcArray = [];
                    for (var cr = 0; cr < calcRows.length; cr++) {
                        var row = calcRows[cr];
                        var rowIdParts = row.id.split('_'); // e.g. "calculationRow7_2"
                        var rowId = rowIdParts[1];

                        var qNameIdEl = document.getElementById('calcQuestion' + hiddenFieldId + '_' + rowId);
                        var opEl       = document.getElementById('calcOperator' + hiddenFieldId + '_' + rowId);
                        var threshEl   = document.getElementById('calcThreshold' + hiddenFieldId + '_' + rowId);
                        var resEl      = document.getElementById('calcResult' + hiddenFieldId + '_' + rowId);

                        var qNameId  = qNameIdEl ? qNameIdEl.value : '';
                        var operator = opEl ? opEl.value : '';
                        var threshold = threshEl ? threshEl.value : '';
                        var result = resEl ? resEl.value : '';

                        if (qNameId && operator && threshold !== '') {
                            calcArray.push({
                                questionNameId: qNameId,
                                operator: operator,
                                threshold: threshold,
                                result: result
                            });
                        }
                    }
                    if (calcArray.length > 0) {
                        hiddenCheckboxCalculations.push({
                            hiddenFieldName: fieldName,
                            calculations: calcArray
                        });
                    }
                }
            }
        }
    }

    hiddenFieldsHTML += '\n</div>';

    return {
        hiddenFieldsHTML: hiddenFieldsHTML,
        autofillMappings: autofillMappings,
        conditionalAutofillLogic: conditionalAutofillLogic,
        hiddenCheckboxCalculations: hiddenCheckboxCalculations
    };
}
