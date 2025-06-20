/*********************************************
 * generate.js - with hidden checkbox & text
 *   multi-term calculations,
 *   plus $$placeholders$$ supporting expressions
 *   and a single <script> block for logic
 *********************************************/

/* global map: questionId  →  canonical slug */
const questionSlugMap = {};

/* global maps and arrays for form data */
const questionNameIds = {};
const questionTypesMap = {};
const conditionalPDFs = [];
const conditionalAlerts = [];
const jumpLogics = [];
const labelMap = {};
const amountMap = {}; // used for numberedDropdown with amounts
const linkedDropdowns = []; // For storing linked dropdown pairs


/*------------------------------------------------------------------
 * HISTORY STACK for accurate "Back" navigation
 *-----------------------------------------------------------------*/
let sectionStack = [];          // push every section you LEAVE
let currentSectionNumber = 1;   // updated by navigateSection()



// We also create a buffer to store our conditional-logic code
// so we can insert it later in one <script> block.
let logicScriptBuffer = "";

/*───────────────────────────────*
 * canonical sanitiser – visible
 * to all build-time code
 *───────────────────────────────*/









/******************************************************************
 * helpers that the generator itself uses ( NOT inside formHTML! )
 ******************************************************************/

/* canonical sanitiser (unchanged) */
function sanitizeQuestionText (str){
    return String(str).toLowerCase()
                      .replace(/\W+/g, "_")
                      .replace(/^_+|_+$/g, "");
}

/* slug‑aware prefix for any checkbox belonging to a question */
function getCbPrefix (qId){
    if (questionSlugMap[qId]) return questionSlugMap[qId] + '_';   // e.g. do_you_have_any_of_these_
    if (questionNameIds[qId]) return questionNameIds[qId] + '_';
    return 'answer' + qId + '_';
}

/* build the final <input>.id / name for a checkbox option */
function buildCheckboxName (questionId, rawNameId, labelText){
    const slugPrefix = (questionSlugMap[questionId] || ('answer' + questionId)) + '_';

    // if the designer left the name blank, derive it from the label
    let namePart = (rawNameId || '').trim();
    if (!namePart){
        namePart = labelText.replace(/\W+/g, '_').toLowerCase();
    }

    // ensure we have our prefix exactly once
    if (!namePart.startsWith(slugPrefix)){
        namePart = slugPrefix + namePart;
    }
    return namePart;
}




function getFormHTML() {
	
	// RESET all globals before building
Object.keys(questionSlugMap).forEach(key => delete questionSlugMap[key]);
Object.keys(questionNameIds).forEach(key => delete questionNameIds[key]);
Object.keys(questionTypesMap).forEach(key => delete questionTypesMap[key]);
conditionalPDFs.length = 0;
conditionalAlerts.length = 0;
jumpLogics.length = 0;
linkedDropdowns.length = 0;
labelMap.length = 0;
amountMap.length = 0;
logicScriptBuffer = "";



  // Top HTML (head, body, header, etc.)
  let formHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Custom Form</title>
    <link rel="stylesheet" href="generate.css">
    <!-- Stripe.js include -->
    <script src="https://js.stripe.com/v3/"></script>
    <style>
      /* Info icon and tooltip styles */
      .question-header {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .info-icon {
        display: inline-block;
        width: 18px;
        height: 18px;
        border: 1px solid #007bff;
        border-radius: 50%;
        color: #007bff;
        font-size: 14px;
        line-height: 18px;
        text-align: center;
        font-weight: bold;
        cursor: pointer;
        user-select: none;
      }
      .info-icon .info-tooltip {
        visibility: hidden;
        top: calc(100% + 5px);
        left: 50%;
        transform: translateX(-50%);
        background-color: #333;
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        width: 200px;
        z-index: 100;
        font-weight: normal;
        font-size: 14px;
        line-height: 1.4;
        text-align: left;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        opacity: 0;
        transition: opacity 0.3s, visibility 0.3s;
      }
      .info-icon:hover .info-tooltip,
      .info-icon:focus .info-tooltip {
        visibility: visible;
        opacity: 1;
      }
      .info-icon .info-tooltip::after {
        content: '';
        position: absolute;
        bottom: 100%;
        left: 50%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: transparent transparent #333 transparent;
      }
      /* Progress Bar Styles */
      .progress-bar-container {
        width: 100%;
        max-width: 800px;
        margin: 0 auto 20px auto;
        padding: 0 0 10px 0;
        background: none;
      }
      .progress-bar-bg {
        width: 100%;
        height: 18px;
        background: linear-gradient(90deg, #e0e7ef 0%, #f5f7fa 100%);
        border-radius: 10px;
        box-shadow: 0 2px 8px rgba(44,62,80,0.07);
        overflow: hidden;
        position: relative;
      }
      .progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #4f8cff 0%, #38d39f 100%);
        border-radius: 10px 0 0 10px;
        width: 0%;
        transition: width 0.5s cubic-bezier(.4,1.4,.6,1), background 0.3s;
        box-shadow: 0 2px 8px rgba(44,62,80,0.13);
        position: absolute;
        left: 0;
        top: 0;
      }
      .progress-bar-label {
        position: absolute;
        width: 100%;
        text-align: center;
        top: 0;
        left: 0;
        height: 100%;
        line-height: 18px;
        font-size: 13px;
        color: #2c3e50;
        font-weight: 600;
        letter-spacing: 0.5px;
        pointer-events: none;
        z-index: 2;
        text-shadow: 0 1px 2px #fff, 0 0 2px #fff;
      }
      .navigation-buttons {
        display: flex;
        gap: 15px;
        justify-content: center;
        margin-top: 10px;
      }
      .navigation-buttons button {
        width: auto;
        max-width: none;
        margin: 0;
        display: inline-flex;
      }
      /* Stepper Progress Bar Styles */
      .stepper-progress-bar {
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 12px auto 0 auto;
        width: 100%;
        max-width: 700px;
        background: none;
        gap: 0;
      }
      .stepper-step {
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        z-index: 2;
        min-width: 90px;
      }
      .stepper-circle {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #e0e7ef;
        color: #2c3e50;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 18px;
        border: 2px solid #4f8cff;
        transition: background 0.3s, color 0.3s, border 0.3s;
      }
      .stepper-step.active .stepper-circle,
      .stepper-step.completed .stepper-circle {
        background: linear-gradient(90deg, #4f8cff 0%, #38d39f 100%);
        color: #fff;
        border: 2px solid #38d39f;
      }
      .stepper-label {
        margin-top: 8px;
        font-size: 15px;
        color: #2c3e50;
        font-weight: 600;
        text-align: center;
        min-width: 80px;
      }
      .stepper-step.completed .stepper-label {
        color: #38d39f;
      }
      .stepper-step.active .stepper-label {
        color: #4f8cff;
      }
      .stepper-line {
        flex: 1;
        height: 4px;
        background: #e0e7ef;
        margin: 0 0px;
        position: relative;
        z-index: 1;
        transition: background 0.5s cubic-bezier(.4,1.4,.6,1);
      }
      .stepper-line.filled {
        background: linear-gradient(90deg, #4f8cff 0%, #38d39f 100%);
      }
      /* Custom Modal Styles */
      .custom-modal-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(44, 62, 80, 0.45);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.3s;
      }
      .custom-modal {
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(44,62,80,0.18);
        padding: 32px 28px 24px 28px;
        max-width: 370px;
        width: 90%;
        text-align: center;
        position: relative;
        animation: modalPopIn 0.35s cubic-bezier(.4,1.4,.6,1);
      }
      @keyframes modalPopIn {
        0% { transform: scale(0.85); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
      .custom-modal h2 {
        margin-top: 0;
        color: #2c3e50;
        font-size: 1.35rem;
        font-weight: 700;
        margin-bottom: 12px;
      }
      .custom-modal p {
        color: #4f8cff;
        font-size: 1.08rem;
        margin-bottom: 28px;
      }
      .custom-modal .modal-buttons {
        display: flex;
        gap: 18px;
        justify-content: center;
      }
      .custom-modal button {
        padding: 8px 22px;
        border-radius: 6px;
        border: none;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s, color 0.2s;
      }
      .custom-modal .modal-back {
        background: #e0e7ef;
        color: #2c3e50;
      }
      .custom-modal .modal-back:hover {
        background: #cfd8e3;
      }
      .custom-modal .modal-continue {
        background: linear-gradient(90deg, #4f8cff 0%, #38d39f 100%);
        color: #fff;
        border: none;
      }
      .custom-modal .modal-continue:hover {
        background: linear-gradient(90deg, #38d39f 0%, #4f8cff 100%);
      }
    </style>
</head>
<body>
<div id="loginRequiredModal" class="custom-modal-overlay" style="display:none;">
  <div class="custom-modal">
    <h2>Account Required</h2>
    <p>You must create an account to continue filling out the form.</p>
    <div class="modal-buttons">
      <button class="modal-back" id="modalBackBtn" type="button">Back</button>
      <button class="modal-continue" id="modalContinueBtn" type="button">Continue</button>
            </div>
          </div>
</div>
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

          <script>
/*──────── mirror a dropdown → textbox and checkbox ────────*/
function dropdownMirror(selectEl, baseName){
    const wrap = document.getElementById("dropdowntext_"+baseName);
    if(!wrap) return;

    const val = selectEl.value.trim();
    if(!val) {
        wrap.innerHTML = "";
        return;
    }

    const textId = baseName + "_dropdown";
    const textField = document.getElementById(textId);
    
    if(textField) {
        textField.value = val;
        textField.style.display = "none";
    }

    const existingCheckboxes = wrap.querySelectorAll("div");
    existingCheckboxes.forEach(div => div.remove());

    const idSuffix = val.replace(/\\W+/g, "_").toLowerCase();
    const checkboxId = baseName + "_" + idSuffix;
    
    const checkboxDiv = document.createElement("div");
    checkboxDiv.style.display = "none";
    checkboxDiv.innerHTML = "<input type='checkbox' id='" + checkboxId + "' name='" + checkboxId + "' checked>" +
                     "<label for='" + checkboxId + "'> " + baseName + "_" + idSuffix + "</label>";
    
    wrap.appendChild(checkboxDiv);
    handleLinkedDropdowns(baseName, val);
}

let isHandlingLink = false;

function handleLinkedDropdowns(sourceName, selectedValue) {
    if (!linkedDropdowns || linkedDropdowns.length === 0 || isHandlingLink) return;
    
    try {
        isHandlingLink = true;  // Set flag before handling links
        linkedDropdowns.forEach(linkPair => {
            if (linkPair.sourceNameId === sourceName) {
                const targetDropdown = document.getElementById(linkPair.targetNameId);
                if (targetDropdown && targetDropdown.value !== selectedValue) {  // Only if value is different
                    let optionExists = false;
                    for (let i = 0; i < targetDropdown.options.length; i++) {
                        if (targetDropdown.options[i].value === selectedValue) {
                            optionExists = true;
                            targetDropdown.value = selectedValue;
                            // Trigger change event only if value actually changed
                            const event = new Event("change");
                            targetDropdown.dispatchEvent(event);
              break;
            }
          }
                    if (!optionExists && selectedValue) {
                        console.warn("Option '" + selectedValue + "' does not exist in linked dropdown " + linkPair.targetNameId);
                    }
                }
            }
            else if (linkPair.targetNameId === sourceName) {
                const sourceDropdown = document.getElementById(linkPair.sourceNameId);
                if (sourceDropdown && sourceDropdown.value !== selectedValue) {  // Only if value is different
                    let optionExists = false;
                    for (let i = 0; i < sourceDropdown.options.length; i++) {
                        if (sourceDropdown.options[i].value === selectedValue) {
                            optionExists = true;
                            sourceDropdown.value = selectedValue;
                            // Trigger change event only if value actually changed
                            const event = new Event("change");
                            sourceDropdown.dispatchEvent(event);
                            break;
                        }
                    }
                    if (!optionExists && selectedValue) {
                        console.warn("Option '" + selectedValue + "' does not exist in linked dropdown " + linkPair.sourceNameId);
                    }
                }
            }
        });
    } finally {
        isHandlingLink = false;  // Always reset flag when done
    }
}
</script>

<div style="width: 80%; max-width: 800px; margin: 20px auto; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; display: none;">
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
        <input type="email" form="customForm" id="user_email" name="user_email" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
    </div>
    <div style="margin-bottom: 15px;">
        <label for="user_phone" style="display: block; margin-bottom: 5px; font-weight: bold;">Phone Number</label>
        <input type="tel" form="customForm" id="user_phone" name="user_phone" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
    </div>
    <div style="margin-bottom: 15px;">
        <label for="user_street" style="display: block; margin-bottom: 5px; font-weight: bold;">Street Address</label>
        <input type="text" form="customForm" id="user_street" name="user_street" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
    </div>
    <div style="display: flex; gap: 15px; margin-bottom: 15px;">
        <div style="flex: 2;">
            <label for="user_city" style="display: block; margin-bottom: 5px; font-weight: bold;">City</label>
            <input type="text" form="customForm" id="user_city" name="user_city" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div style="flex: 1;">
            <label for="user_state" style="display: block; margin-bottom: 5px; font-weight: bold;">State</label>
            <input type="text" form="customForm" id="user_state" name="user_state" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        <div style="flex: 1;">
            <label for="user_zip" style="display: block; margin-bottom: 5px; font-weight: bold;">ZIP</label>
            <input type="text" form="customForm" id="user_zip" name="user_zip" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
    </div>
</div>
<div id="questions">
    <div id="result"></div>
    <section>
    <div id="box">
        <form id="customForm">${formBody}</form>
<div id="thankYouMessage" class="thank-you-message">Thank you for completing the survey</div>
</div>
</section>
</div>
<footer>
    &copy; 2024 FormWiz. All rights reserved.
</footer>
<script>

/*───────────────────────────────*
 * return the true checkbox prefix
 *───────────────────────────────*/
function getCbPrefix (qId){
    if (questionSlugMap[qId]) return questionSlugMap[qId] + '_';
    if (questionNameIds[qId]) return questionNameIds[qId] + '_';
    return 'answer' + qId + '_';
}

/*───────────────────────────────*
 * buildCheckboxName(questionId, rawNameId, labelText)
 *───────────────────────────────*/
function buildCheckboxName (questionId, rawNameId, labelText){
    const slugPrefix = (questionSlugMap[questionId] || ('answer' + questionId)) + '_';
    let namePart = (rawNameId || '').trim();
    if (!namePart){
        namePart = labelText.replace(/\\W+/g, '_').toLowerCase();
    }
    if (!namePart.startsWith(slugPrefix)){
        namePart = slugPrefix + namePart;
    }
    return namePart;
}

    let isUserLoggedIn = false;
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
            isUserLoggedIn = true;
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
            isUserLoggedIn = false;
            // Do NOT redirect. Just let the user fill the form.
        }
    });
  var questionSlugMap       = ${JSON.stringify(questionSlugMap)};
var questionNameIds = ${JSON.stringify(questionNameIds)};
var jumpLogics = ${JSON.stringify(jumpLogics)};
var conditionalPDFs = ${JSON.stringify(conditionalPDFs)};
var conditionalAlerts = ${JSON.stringify(conditionalAlerts)};
var labelMap = ${JSON.stringify(labelMap)};
var amountMap = ${JSON.stringify(amountMap)};
var linkedDropdowns = ${JSON.stringify(linkedDropdowns)};
var sectionStack = [];
var currentSectionNumber = 1;
var pdfFileName = ${JSON.stringify(pdfFileName)};
var additionalPdfFileNames = ${JSON.stringify(additionalPdfFileNames)};
var allPdfFileNames = [pdfFileName, ...additionalPdfFileNames];
var hiddenCheckboxCalculations = ${JSON.stringify(hiddenCheckboxCalculations)};
var hiddenTextCalculations = ${JSON.stringify(hiddenTextCalculations)};



  
  
  function sanitizeQuestionText (str){
    return String(str)
       .toLowerCase()
        .replace(/\\W+/g, "_")   // ← double "\\" so the HTML gets "\\W"
        .replace(/^_+|_+$/g, "");
}

// Phone number formatter function
function formatPhoneNumber(value) {
  if (!value) return value;
  
  const phoneNumber = value.replace(/\\D/g, '');
  const phoneNumberLength = phoneNumber.length;
  
  if (phoneNumberLength < 4) {
    return phoneNumberLength > 0 ? '(' + phoneNumber : '';
  } else if (phoneNumberLength < 7) {
    return '(' + phoneNumber.substring(0, 3) + ') ' + phoneNumber.substring(3);
  } else {
    return '(' + phoneNumber.substring(0, 3) + ') ' + 
           phoneNumber.substring(3, 6) + '-' + 
           phoneNumber.substring(6, 10);
  }
}

// Initialize all phone inputs on the page
document.addEventListener('DOMContentLoaded', function() {
  const phoneInputs = document.querySelectorAll('.phone-input');
  
  phoneInputs.forEach(phoneInput => {
    // Format existing value if any
    if (phoneInput.value) {
      phoneInput.value = formatPhoneNumber(phoneInput.value);
    }
    
    // Set up event listener for input
    phoneInput.addEventListener('input', function(e) {
      const input = e.target;
      const value = input.value.replace(/\\D/g, '').substring(0, 10); // Strip non-digits and limit to 10 digits
      input.value = formatPhoneNumber(value);
    });
  });
});


function toggleAmountField(amountFieldId, show) {
    const amountField = document.getElementById(amountFieldId);
    if (amountField) {
        amountField.style.display = show ? 'block' : 'none';
        if (!show) amountField.value = '';
    }
}

/*──────────────────────────────────────────────────────────────*
 * Handle "None of the above" checkbox functionality
 *──────────────────────────────────────────────────────────────*/
function toggleNoneOption(checkbox, questionId) {
    if (!checkbox.checked) return;

    // Find the "None of the above" checkbox using more robust selectors
    const cbPrefix = getCbPrefix(questionId);
    const noneCheckbox = document.querySelector('input[id="' + cbPrefix + 'none"]') || 
                         document.querySelector('input[id^="' + cbPrefix + '"][id$="_none"]');
                         
    if (noneCheckbox && noneCheckbox.checked) {
        // Uncheck the "None of the above" option when any other option is checked
        noneCheckbox.checked = false;
    }
}
