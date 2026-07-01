/**
 * Builds standalone HTML forms from form_config.json + FormStar template shell.
 * Default template: form-template.html (derived from example.html).
 */
(function (global) {
  'use strict';

  const PLACEHOLDER_BODY = '__AUTO_FORM_BODY__';
  const PLACEHOLDER_TITLE = '__FORM_TITLE__';
  const PLACEHOLDER_RUNTIME = '__AUTO_FORM_RUNTIME_SCRIPTS__';
  const DEFAULT_TEMPLATE_URL = '/Auto-Form-Creator/form-template.html';

  let cachedDefaultTemplate = null;

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function stripQuestionNumber(text) {
    return String(text ?? '').replace(/^\s*\d+[\.\)\:\-]\s*/, '');
  }

  function autopopulateBadgeHtml(block, devMode) {
    if (!devMode || !block?.autopopulate?.enabled) return '';
    const badge = block.autopopulate.availableInProfile ? 'autofill-ready' : 'autofill-learn';
    const badgeText = block.autopopulate.availableInProfile ? 'Autofill available' : 'Will save to profile';
    return `<div class="autopopulate-badge ${badge}" style="margin-top:10px;font-size:0.78rem;font-weight:700;padding:4px 10px;border-radius:999px;display:inline-block;background:${badge === 'autofill-ready' ? '#d1fae5' : '#fef3c7'};color:${badge === 'autofill-ready' ? '#065f46' : '#92400e'};">${badgeText}</div>`;
  }

  function getAutofillValue(block, userProfile) {
    if (!block?.autopopulate?.enabled) return '';
    if (block.autopopulate.availableInProfile && block.autopopulate.currentProfileValue != null) {
      return block.autopopulate.currentProfileValue;
    }
    const key = block.autopopulate.profileKey;
    if (key && userProfile && userProfile[key] != null && String(userProfile[key]).trim() !== '') {
      return userProfile[key];
    }
    return '';
  }

  function renderInput(question, userProfile, devMode) {
    const type = question.type;
    const nameId = question.nameId;
    const val = esc(getAutofillValue(question, userProfile));
    const ap = question.autopopulate?.enabled ? ' data-autopopulate="true"' : '';
    const pk = question.autopopulate?.profileKey ? ` data-profile-key="${esc(question.autopopulate.profileKey)}"` : '';
    const pd = question.autopopulate?.profileDescription
      ? ` data-profile-description="${esc(question.autopopulate.profileDescription)}"`
      : '';
    const qid = question.questionId != null ? ` data-question-id="${esc(question.questionId)}"` : '';

    if (type === 'bigParagraph') {
      return `<textarea class="address-input" id="${esc(nameId)}" name="${esc(nameId)}" rows="4" placeholder="${esc(question.placeholder || '')}"${ap}${pk}${pd}${qid} style="width:80%;max-width:400px;height:auto;">${val}</textarea>`;
    }
    if (type === 'date') {
      return `<input type="date" class="address-input" id="${esc(nameId)}" name="${esc(nameId)}" value="${val}"${ap}${pk}${pd}${qid}>`;
    }
    if (type === 'phone') {
      return `<input type="tel" class="address-input" id="${esc(nameId)}" name="${esc(nameId)}" value="${val}" placeholder="${esc(question.placeholder || '')}"${ap}${pk}${pd}${qid}>`;
    }
    if (type === 'money') {
      return `<input type="number" step="0.01" class="address-input" id="${esc(nameId)}" name="${esc(nameId)}" value="${val}" placeholder="${esc(question.placeholder || '')}"${ap}${pk}${pd}${qid}>`;
    }
    if (type === 'dropdown') {
      const opts = (question.options || []).map((o) => {
        const v = typeof o === 'string' ? o : o.value || o.label;
        const label = typeof o === 'string' ? o : o.label || o.value;
        const selected = String(val).toLowerCase() === String(v).toLowerCase() ? ' selected' : '';
        return `<option value="${esc(v)}"${selected}>${esc(label)}</option>`;
      }).join('');
      return `<select class="address-select" id="${esc(nameId)}" name="${esc(nameId)}"${ap}${pk}${pd}${qid}><option value="" disabled${val ? '' : ' selected'}>Select an option</option>${opts}</select>`;
    }
    if (type === 'checkbox') {
      return (question.options || []).map((opt) => {
        const optName = opt.nameId || nameId;
        const checked = val && String(val).toLowerCase() === String(opt.value || opt.label).toLowerCase() ? ' checked' : '';
        const optAp = opt.autopopulate?.enabled ? ' data-autopopulate="true"' : ap;
        const optPk = opt.autopopulate?.profileKey ? ` data-profile-key="${esc(opt.autopopulate.profileKey)}"` : pk;
        const optPd = opt.autopopulate?.profileDescription
          ? ` data-profile-description="${esc(opt.autopopulate.profileDescription)}"`
          : pd;
        return `<label class="checkbox-option" style="display:block;margin:8px 0;"><input type="checkbox" name="${esc(optName)}" value="${esc(opt.value || opt.label)}"${checked}${optAp}${optPk}${optPd}> ${esc(opt.label)}</label>`;
      }).join('');
    }
    if (type === 'multipleTextboxes') {
      return (question.textboxes || []).map((tb) => {
        const tbVal = esc(getAutofillValue(tb, userProfile));
        const tbAp = tb.autopopulate?.enabled ? ' data-autopopulate="true"' : '';
        const tbPk = tb.autopopulate?.profileKey ? ` data-profile-key="${esc(tb.autopopulate.profileKey)}"` : '';
        const tbPd = tb.autopopulate?.profileDescription
          ? ` data-profile-description="${esc(tb.autopopulate.profileDescription)}"`
          : '';
        const tbBadge = autopopulateBadgeHtml(tb, devMode);
        return `<div class="address-field textbox-group"><label for="${esc(tb.nameId)}">${esc(tb.label || tb.nameId)}</label><input type="text" class="address-input" id="${esc(tb.nameId)}" name="${esc(tb.nameId)}" value="${tbVal}" placeholder="${esc(tb.placeholder || '')}"${tbAp}${tbPk}${tbPd}>${tbBadge}</div>`;
      }).join('');
    }
    return `<input type="text" class="address-input" id="${esc(nameId)}" name="${esc(nameId)}" value="${val}" placeholder="${esc(question.placeholder || '')}"${ap}${pk}${pd}${qid}>`;
  }

  function buildStepperStylesHtml() {
    return `<style id="auto-form-stepper-styles">
.stepper-progress-bar{display:flex;align-items:center;justify-content:center;margin:12px auto 0;width:100%;max-width:700px;background:none;gap:0}
.stepper-step{display:flex;flex-direction:column;align-items:center;position:relative;z-index:2;min-width:90px;flex-shrink:0}
.stepper-circle{width:32px;height:32px;border-radius:50%;background:#e0e7ef;color:#2c3e50;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:18px;border:2px solid #4f8cff;transition:background .3s,color .3s,border .3s}
.stepper-step.active .stepper-circle,.stepper-step.completed .stepper-circle{background:linear-gradient(90deg,#4f8cff 0%,#38d39f 100%);color:#fff;border:2px solid #38d39f}
.stepper-label{margin-top:8px;font-size:15px;color:#2c3e50;font-weight:600;text-align:center;min-width:80px}
.stepper-step.completed .stepper-label{color:#38d39f}
.stepper-step.active .stepper-label{color:#4f8cff}
.stepper-line{flex:1 1 40px;min-width:24px;height:4px;background:#e0e7ef;margin:0;position:relative;z-index:1;align-self:flex-start;margin-top:14px;transition:background .5s cubic-bezier(.4,1.4,.6,1)}
.stepper-line.filled{background:linear-gradient(90deg,#4f8cff 0%,#38d39f 100%)}
.section{display:none}
.section.active{display:block}
.question-header{display:flex;align-items:flex-start;justify-content:center;gap:10px;margin-bottom:8px}
.question-header .question-text{margin:0;flex:1;text-align:center}
.question-info-wrap{position:relative;flex-shrink:0;margin-top:2px}
.question-info-btn{width:22px;height:22px;border-radius:50%;border:1.5px solid #4f8cff;background:#eef4ff;color:#1d4ed8;font-size:13px;font-weight:800;line-height:1;cursor:pointer;padding:0;display:inline-flex;align-items:center;justify-content:center;font-family:Georgia,serif}
.question-info-btn:hover,.question-info-btn:focus{background:#4f8cff;color:#fff;outline:none}
.question-info-tooltip{display:none;position:absolute;left:50%;transform:translateX(-50%);top:calc(100% + 8px);min-width:220px;max-width:320px;padding:10px 12px;background:#1f2937;color:#f9fafb;border-radius:10px;font-size:13px;line-height:1.45;font-weight:500;text-align:left;box-shadow:0 8px 24px rgba(15,23,42,.22);z-index:20}
.question-info-tooltip::before{content:'';position:absolute;top:-6px;left:50%;transform:translateX(-50%);border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:6px solid #1f2937}
.question-info-wrap.open .question-info-tooltip{display:block}
.checkbox-group-label{display:block;margin:0 0 12px;font-weight:600;color:#1f3a60;text-align:center}
</style>`;
  }

  function buildStepperHtml(sections) {
    if (!sections || sections.length < 2) return '';
    const steps = sections.map((section, idx) => {
      const stepNum = section.sectionId != null ? section.sectionId : idx + 1;
      const label = esc(section.sectionName || `Section ${stepNum}`);
      const stepHtml = `<div class="stepper-step" data-step="${stepNum}"><div class="stepper-circle">${stepNum}</div><div class="stepper-label">${label}</div></div>`;
      if (idx < sections.length - 1) {
        return stepHtml + '<div class="stepper-line"></div>';
      }
      return stepHtml;
    }).join('');
    return `<div class="stepper-progress-bar" id="stepperProgressBar">${steps}</div>`;
  }

  function buildQuestionHeaderHtml(question, questionText) {
    const needsExplanation = question.needsExplanation && String(question.explanation || '').trim();
    let html = '<div class="question-header">';
    html += `<h3 class="question-text">${esc(questionText)}</h3>`;
    if (needsExplanation) {
      const tip = esc(question.explanation);
      html += `<div class="question-info-wrap">`;
      html += `<button type="button" class="question-info-btn" aria-label="More information about this question" aria-describedby="question-info-${esc(question.questionId)}">i</button>`;
      html += `<div class="question-info-tooltip" id="question-info-${esc(question.questionId)}" role="tooltip">${tip}</div>`;
      html += `</div>`;
    }
    html += '</div>';
    return html;
  }

  function buildQuestionContainer(question, globalIndex, sectionId, questionIndexInSection, userProfile, devMode, oneAtATime) {
    const questionId = question.questionId != null ? question.questionId : globalIndex;
    const questionText = devMode ? question.text : stripQuestionNumber(question.text);
    const visibilityClasses = [];
    if (oneAtATime && questionIndexInSection > 1) {
      visibilityClasses.push('question-step-hidden');
    }
    const hiddenClass = visibilityClasses.length ? ' ' + visibilityClasses.join(' ') : '';

    let html = `<div id="question-container-${globalIndex}" data-question-id="${esc(questionId)}" class="question-container question-item${hiddenClass}" data-section="${esc(sectionId)}" data-question-index="${questionIndexInSection}">`;
    html += buildQuestionHeaderHtml(question, questionText);
    if (question.type === 'checkbox' && (question.options || []).length > 1) {
      html += `<div class="checkbox-group checkbox-group-${esc(questionId)}">`;
    }
    html += renderInput(question, userProfile, devMode);
    if (question.type === 'checkbox' && (question.options || []).length > 1) {
      html += '</div>';
    }
    if (devMode && question.autopopulate?.enabled && question.type !== 'multipleTextboxes') {
      html += autopopulateBadgeHtml(question, devMode);
    }
    html += '</div>';
    return html;
  }

  function buildSectionsHtml(formConfig, userProfile, devMode) {
    const sections = formConfig.sections || [];
    const oneAtATime = formConfig.displayMode === 'one_at_a_time';
    let globalIndex = 0;
    let html = buildStepperStylesHtml() + buildStepperHtml(sections);

    sections.forEach((section, sectionIdx) => {
      const sectionId = section.sectionId != null ? section.sectionId : sectionIdx + 1;
      const sectionActive = sectionIdx === 0 ? ' active' : '';
      const sectionName = esc(section.sectionName || `Section ${sectionId}`);
      const questions = section.questions || [];
      const isLastSection = sectionIdx === sections.length - 1;

      html += `<div id="section${sectionId}" class="section${sectionActive}">`;
      html += `<center><h1 class="section-title">${sectionName}</h1>`;

      questions.forEach((question, qIdx) => {
        globalIndex += 1;
        html += buildQuestionContainer(
          question,
          globalIndex,
          sectionId,
          qIdx + 1,
          userProfile,
          devMode,
          oneAtATime
        );
      });

      html += `<div class="question-nav" data-section-index="${sectionId}">`;
      html += `<button type="button" class="question-nav-btn question-prev" aria-label="Previous question" data-section="${sectionId}">&larr;</button>`;
      html += `<button type="button" class="question-nav-btn question-next" aria-label="Next question" data-section="${sectionId}">&rarr;</button>`;
      html += '</div>';
      html += '<br><br>';
      html += '<div class="navigation-buttons" style="display:none;">';
      if (isLastSection) {
        html += '<button type="submit" class="next-button">Submit</button>';
      } else {
        html += '<button type="button" onclick="goBack()">Back</button>';
      }
      html += '</div></div>';
    });

    return html;
  }

  function buildRuntimeScripts(firebaseConfig, devMode, pdfToken, userProfile, displayMode) {
    const configJson = firebaseConfig ? JSON.stringify(firebaseConfig) : 'null';
    const profileJson = JSON.stringify(userProfile || {});
    const tokenJson = JSON.stringify(pdfToken || null);
    const devModeLiteral = devMode ? 'true' : 'false';
    const displayModeLiteral = JSON.stringify(displayMode || 'all_at_once');

    return `
<script>
(function(){
  var userProfile = ${profileJson};
  var firebaseConfig = ${configJson};
  var devMode = ${devModeLiteral};
  var pdfToken = ${tokenJson};
  var displayMode = ${displayModeLiteral};

  function fieldValue(el) {
    if (el.type === 'checkbox') return el.checked ? el.value : '';
    return el.value;
  }

  function updateAutofillBadge(el) {
    if (!devMode || !el.hasAttribute('data-autopopulate')) return;
    var val = fieldValue(el);
    var container = el.closest('.textbox-group') || el.closest('.question-container');
    if (!container) return;
    var badge = container.querySelector('.autopopulate-badge');
    if (!badge) return;
    if (String(val).trim() !== '') {
      badge.textContent = 'Autofill available';
      badge.classList.remove('autofill-learn');
      badge.classList.add('autofill-ready');
      badge.style.background = '#d1fae5';
      badge.style.color = '#065f46';
    }
  }

  function applyProfileToForm() {
    document.querySelectorAll('[data-profile-key]').forEach(function(el) {
      var key = el.getAttribute('data-profile-key');
      if (!key || userProfile[key] == null) return;
      var val = userProfile[key];
      if (el.type === 'checkbox') {
        el.checked = String(val).toLowerCase() === String(el.value).toLowerCase();
      } else {
        el.value = val;
      }
      updateAutofillBadge(el);
    });
  }

  function syncProfileFromInput(el, persist) {
    var key = el.getAttribute('data-profile-key');
    if (!key) return;
    var desc = el.getAttribute('data-profile-description') || key;
    var val = fieldValue(el);
    updateAutofillBadge(el);
    if (val === '') return;
    userProfile[key] = val;
    if (!userProfile[key + '_description']) userProfile[key + '_description'] = desc;
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'formstar-profile-update', key: key, value: val, description: desc }, '*');
    }
    if (persist && typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
      var user = firebase.auth().currentUser;
      if (!user) return;
      var updates = {};
      updates[key] = val;
      updates[key + '_description'] = userProfile[key + '_description'] || desc;
      firebase.firestore().collection('users').doc(user.uid).set(updates, { merge: true }).catch(function(err) {
        console.error('Profile save error:', err);
      });
    }
  }

  document.querySelectorAll('[data-autopopulate]').forEach(function(el) {
    el.addEventListener('input', function(){ updateAutofillBadge(el); });
    el.addEventListener('change', function(){ syncProfileFromInput(el, true); });
    el.addEventListener('blur', function(){ syncProfileFromInput(el, true); });
  });

  if (firebaseConfig && typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(function(user) {
      if (!user || !firebase.firestore) return;
      firebase.firestore().collection('users').doc(user.uid).get().then(function(doc) {
        if (doc.exists) {
          userProfile = Object.assign({}, userProfile, doc.data() || {});
          applyProfileToForm();
        }
      });
    });
  }
  applyProfileToForm();

  function formatDateForServer(dateString) {
    if (!dateString) return '';
    var parts = dateString.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return parts[1] + '/' + parts[2] + '/' + parts[0];
    }
    return dateString;
  }

  function collectFormData() {
    var form = document.getElementById('customForm');
    var fd = new FormData();
    if (!form) return fd;
    form.querySelectorAll('input, textarea, select').forEach(function(el) {
      if (!el.name || el.disabled || el.type === 'file') return;
      if (el.type === 'checkbox') {
        if (el.checked) fd.append(el.name, 'on');
      } else if (el.type === 'radio') {
        if (el.checked) fd.append(el.name, el.value);
      } else {
        var value = el.value;
        if (el.type === 'date' && value) value = formatDateForServer(value);
        if (value != null && String(value).trim() !== '') fd.append(el.name, value);
      }
    });
    return fd;
  }

  function updateStepperProgress() {
    var stepper = document.getElementById('stepperProgressBar');
    if (!stepper) return;
    var activeSection = document.querySelector('.section.active');
    var activeStep = 1;
    if (activeSection && activeSection.id) {
      var m = activeSection.id.match(/^section(\\d+)$/);
      if (m) activeStep = parseInt(m[1], 10);
    }
    stepper.querySelectorAll('.stepper-step').forEach(function(step, idx) {
      step.classList.remove('active', 'completed');
      if (idx + 1 < activeStep) step.classList.add('completed');
      else if (idx + 1 === activeStep) step.classList.add('active');
    });
    stepper.querySelectorAll('.stepper-line').forEach(function(line, idx) {
      if (idx < activeStep - 1) line.classList.add('filled');
      else line.classList.remove('filled');
    });
  }

  function wireStepperClicks() {
    var stepper = document.getElementById('stepperProgressBar');
    if (!stepper) return;
    stepper.querySelectorAll('.stepper-step').forEach(function(step) {
      step.style.cursor = 'pointer';
      step.addEventListener('click', function() {
        var stepNum = step.getAttribute('data-step');
        if (!stepNum) return;
        if (typeof window.navigateSection === 'function') {
          window.navigateSection(parseInt(stepNum, 10));
        } else {
          document.querySelectorAll('.section').forEach(function(sec) { sec.classList.remove('active'); });
          var target = document.getElementById('section' + stepNum);
          if (target) target.classList.add('active');
          updateStepperProgress();
        }
      });
    });
  }

  window.currentSectionNumber = 1;
  window.sectionStack = [];

  window.updateProgressBar = updateStepperProgress;

  window.navigateSection = function(sectionNumber, isBackNavigation) {
    var sections = document.querySelectorAll('.section');
    var thankYou = document.getElementById('thankYouMessage');
    var form = document.getElementById('customForm');
    sections.forEach(function(sec) { sec.classList.remove('active'); });
    if (thankYou) thankYou.style.display = 'none';
    if (form) form.style.display = 'block';
    if (sectionNumber === 'end') {
      if (form) form.style.display = 'none';
      if (thankYou) thankYou.style.display = 'block';
      window.currentSectionNumber = 'end';
      updateStepperProgress();
      return;
    }
    var num = parseInt(sectionNumber, 10);
    if (isNaN(num)) return;
    var maxSection = sections.length;
    if (num < 1) num = 1;
    if (num > maxSection) num = maxSection;
    if (!isBackNavigation && typeof window.currentSectionNumber === 'number' && window.currentSectionNumber !== num) {
      window.sectionStack.push(window.currentSectionNumber);
    }
    var target = document.getElementById('section' + num);
    if (target) target.classList.add('active');
    else if (sections[num - 1]) sections[num - 1].classList.add('active');
    window.currentSectionNumber = num;
    updateStepperProgress();
    var sectionId = 'section' + num;
    if (window.questionNavControllers && typeof window.questionNavControllers[sectionId] === 'function') {
      window.questionNavControllers[sectionId](0);
    }
  };

  window.goBack = function() {
    if (window.sectionStack.length > 0) {
      var prev = window.sectionStack.pop();
      var prevNum = typeof prev === 'string' ? parseInt(prev, 10) : prev;
      if (!isNaN(prevNum) && prevNum >= 1) {
        window.navigateSection(prevNum, true);
        return;
      }
    }
    if (typeof window.currentSectionNumber === 'number' && window.currentSectionNumber > 1) {
      window.navigateSection(window.currentSectionNumber - 1, true);
    }
  };

  window.validateAndProceed = function() {
    return false;
  };

  function wireQuestionInfoIcons() {
    document.querySelectorAll('.question-info-btn').forEach(function(btn) {
      var wrap = btn.closest('.question-info-wrap');
      if (!wrap || btn.dataset.infoWired === 'true') return;
      btn.dataset.infoWired = 'true';
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var isOpen = wrap.classList.contains('open');
        document.querySelectorAll('.question-info-wrap.open').forEach(function(el) { el.classList.remove('open'); });
        if (!isOpen) wrap.classList.add('open');
      });
      btn.addEventListener('mouseenter', function() { wrap.classList.add('open'); });
      btn.addEventListener('mouseleave', function() {
        setTimeout(function() {
          if (!wrap.matches(':hover')) wrap.classList.remove('open');
        }, 120);
      });
      wrap.addEventListener('mouseleave', function() { wrap.classList.remove('open'); });
    });
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.question-info-wrap')) {
        document.querySelectorAll('.question-info-wrap.open').forEach(function(el) { el.classList.remove('open'); });
      }
    });
  }

  window.goBackToForm = function() {
    var thankYou = document.getElementById('thankYouMessage');
    var questions = document.getElementById('questions');
    var form = document.getElementById('customForm');
    if (thankYou) thankYou.style.display = 'none';
    if (questions) questions.style.display = '';
    if (form) form.style.display = 'block';
    var previewSection = document.getElementById('pdf-preview-section');
    if (previewSection) previewSection.hidden = true;
    if (typeof window.navigateSection === 'function') {
      var sections = document.querySelectorAll('.section');
      var lastNum = sections.length || 1;
      window.navigateSection(lastNum, true);
    }
  };

  function showAutoFormThankYou(previewUrl) {
    window.__lastFilledPdfUrl = previewUrl;
    var form = document.getElementById('customForm');
    var thankYou = document.getElementById('thankYouMessage');
    var questions = document.getElementById('questions');
    if (form) form.style.display = 'none';
    if (questions) questions.style.display = 'none';
    if (thankYou) {
      thankYou.style.display = 'block';
      var viewBtn = document.getElementById('autoFormViewPdfBtn');
      if (!viewBtn) {
        viewBtn = document.createElement('button');
        viewBtn.id = 'autoFormViewPdfBtn';
        viewBtn.type = 'button';
        viewBtn.textContent = 'View Form';
        viewBtn.style.cssText = 'font-size:1.2em;margin-bottom:16px;background:#2980b9;color:#fff;border:none;border-radius:8px;padding:12px 28px;cursor:pointer;font-weight:700;';
        viewBtn.addEventListener('click', function() {
          var previewSection = document.getElementById('pdf-preview-section');
          var previewFrame = document.getElementById('filled-pdf-preview');
          if (previewFrame && window.__lastFilledPdfUrl) previewFrame.src = window.__lastFilledPdfUrl;
          if (previewSection) {
            previewSection.hidden = false;
            previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
        thankYou.insertBefore(viewBtn, thankYou.firstChild);
      }
    }
    if (typeof window.updateProgressBar === 'function') window.updateProgressBar();
  }

  document.addEventListener('DOMContentLoaded', function() {
    wireQuestionInfoIcons();
    updateStepperProgress();
    wireStepperClicks();
    var observer = new MutationObserver(updateStepperProgress);
    document.querySelectorAll('.section').forEach(function(sec) {
      observer.observe(sec, { attributes: true, attributeFilter: ['class'] });
    });
    if (displayMode === 'all_at_once') {
      setTimeout(function() {
        document.querySelectorAll('.question-container.question-item').forEach(function(el) {
          el.classList.remove('question-step-hidden');
        });
        document.querySelectorAll('.question-nav').forEach(function(nav) {
          nav.style.display = 'none';
        });
      }, 150);
    }
  });

  window.__autoFormHandleSubmit = async function(event) {
    if (event) event.preventDefault();
    if (!pdfToken) {
      alert('PDF template not available. Re-run Step 5 in the Auto-Form Creator demo.');
      return false;
    }
    try {
      var fd = collectFormData();
      var res = await fetch('/api/auto-form/fill-pdf/' + encodeURIComponent(pdfToken), {
        method: 'POST',
        body: fd,
        credentials: 'include'
      });
      if (!res.ok) {
        var errText = await res.text();
        var errMsg = 'HTTP ' + res.status;
        try { var errJson = JSON.parse(errText); if (errJson.error) errMsg = errJson.error; } catch (ignore) { if (errText) errMsg = errText; }
        throw new Error(errMsg);
      }
      var blob = await res.blob();
      if (!blob.size) throw new Error('Received empty PDF');
      var previewSection = document.getElementById('pdf-preview-section');
      var previewFrame = document.getElementById('filled-pdf-preview');
      var previewUrl = URL.createObjectURL(blob);
      if (previewFrame) previewFrame.src = previewUrl;
      showAutoFormThankYou(previewUrl);
    } catch (err) {
      console.error('Submit error:', err);
      alert(err.message || 'Failed to generate PDF preview');
    }
    return false;
  };
})();
<\/script>`;
  }

  function applyTemplate(templateHtml, replacements) {
    let html = templateHtml;
    Object.keys(replacements).forEach((key) => {
      html = html.split(key).join(replacements[key]);
    });
    return html;
  }

  function resolveTemplate(options) {
    const templateHtml = options.templateHtml || cachedDefaultTemplate;
    if (!templateHtml) {
      throw new Error('Form template not loaded. Wait for the default template to load or upload a custom template.');
    }
    if (!templateHtml.includes(PLACEHOLDER_BODY)) {
      throw new Error('Template must contain the placeholder ' + PLACEHOLDER_BODY);
    }
    return templateHtml;
  }

  function buildFormHtml(formConfig, userProfile, options) {
    options = options || {};
    const firebaseConfig = options.firebaseConfig || null;
    const htmlMode = options.htmlMode || formConfig.htmlMode || 'dev';
    const devMode = htmlMode !== 'normal';
    const pdfToken = options.pdfToken || formConfig.pdfToken || null;
    const title = esc(formConfig.formTitle || 'Generated Form');
    const templateHtml = resolveTemplate(options);

    const bodyHtml = buildSectionsHtml(formConfig, userProfile || {}, devMode);
    const runtimeScripts = buildRuntimeScripts(
      firebaseConfig,
      devMode,
      pdfToken,
      userProfile,
      formConfig.displayMode
    );

    return applyTemplate(templateHtml, {
      [PLACEHOLDER_TITLE]: title,
      [PLACEHOLDER_BODY]: bodyHtml,
      [PLACEHOLDER_RUNTIME]: runtimeScripts
    });
  }

  function preloadDefaultTemplate(url) {
    url = url || DEFAULT_TEMPLATE_URL;
    return fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load form template (' + res.status + ')');
        return res.text();
      })
      .then((text) => {
        cachedDefaultTemplate = text;
        return text;
      });
  }

  function setDefaultTemplate(html) {
    cachedDefaultTemplate = html;
  }

  global.FormHtmlRenderer = {
    build: buildFormHtml,
    preloadDefaultTemplate,
    setDefaultTemplate,
    PLACEHOLDER_BODY,
    DEFAULT_TEMPLATE_URL
  };
})(typeof window !== 'undefined' ? window : globalThis);
