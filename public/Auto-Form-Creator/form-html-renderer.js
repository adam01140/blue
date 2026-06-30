/**
 * Builds a standalone HTML form preview from form_config.json + user profile.
 */
(function (global) {
  'use strict';

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
    return `<div class="autopopulate-badge ${badge}">${badgeText}</div>`;
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

    if (type === 'bigParagraph') {
      return `<textarea id="${esc(nameId)}" name="${esc(nameId)}" rows="4" placeholder="${esc(question.placeholder || '')}"${ap}${pk}${pd}>${val}</textarea>`;
    }
    if (type === 'date') {
      return `<input type="date" id="${esc(nameId)}" name="${esc(nameId)}" value="${val}"${ap}${pk}${pd}>`;
    }
    if (type === 'phone') {
      return `<input type="tel" id="${esc(nameId)}" name="${esc(nameId)}" value="${val}" placeholder="${esc(question.placeholder || '')}"${ap}${pk}${pd}>`;
    }
    if (type === 'money') {
      return `<input type="number" step="0.01" id="${esc(nameId)}" name="${esc(nameId)}" value="${val}" placeholder="${esc(question.placeholder || '')}"${ap}${pk}${pd}>`;
    }
    if (type === 'dropdown') {
      const opts = (question.options || []).map((o) => {
        const v = typeof o === 'string' ? o : o.value || o.label;
        const label = typeof o === 'string' ? o : o.label || o.value;
        const selected = String(val).toLowerCase() === String(v).toLowerCase() ? ' selected' : '';
        return `<option value="${esc(v)}"${selected}>${esc(label)}</option>`;
      }).join('');
      return `<select id="${esc(nameId)}" name="${esc(nameId)}"${ap}${pk}${pd}><option value="" disabled${val ? '' : ' selected'}>Select…</option>${opts}</select>`;
    }
    if (type === 'checkbox') {
      return (question.options || []).map((opt) => {
        const checked = val && String(val).toLowerCase() === String(opt.value || opt.label).toLowerCase() ? ' checked' : '';
        const optAp = opt.autopopulate?.enabled ? ' data-autopopulate="true"' : ap;
        const optPk = opt.autopopulate?.profileKey ? ` data-profile-key="${esc(opt.autopopulate.profileKey)}"` : pk;
        const optPd = opt.autopopulate?.profileDescription
          ? ` data-profile-description="${esc(opt.autopopulate.profileDescription)}"`
          : pd;
        return `<label class="checkbox-option"><input type="checkbox" name="${esc(opt.nameId)}" value="${esc(opt.value || opt.label)}"${checked}${optAp}${optPk}${optPd}> ${esc(opt.label)}</label>`;
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
        return `<div class="textbox-group"><label for="${esc(tb.nameId)}">${esc(tb.label || tb.nameId)}</label><input type="text" id="${esc(tb.nameId)}" name="${esc(tb.nameId)}" value="${tbVal}" placeholder="${esc(tb.placeholder || '')}"${tbAp}${tbPk}${tbPd}>${tbBadge}</div>`;
      }).join('');
    }
    return `<input type="text" id="${esc(nameId)}" name="${esc(nameId)}" value="${val}" placeholder="${esc(question.placeholder || '')}"${ap}${pk}${pd}>`;
  }

  function buildFirebaseHead(firebaseConfig) {
    if (!firebaseConfig) return '';
    return `
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"><\/script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"><\/script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"><\/script>`;
  }

  function buildFirebaseAuthPanel() {
    return `
<div class="auth-panel" id="auth-panel">
  <div class="auth-panel-inner">
    <strong id="auth-status">Sign in to load and save your profile autofill</strong>
    <form id="standalone-login-form" class="auth-form">
      <input type="email" id="standalone-login-email" placeholder="Email" required autocomplete="username">
      <input type="password" id="standalone-login-password" placeholder="Password" required autocomplete="current-password">
      <button type="submit">Sign In</button>
    </form>
    <button type="button" id="standalone-logout-btn" class="auth-logout" style="display:none;">Sign Out</button>
    <div class="auth-error" id="standalone-auth-error"></div>
  </div>
</div>`;
  }

  function buildRuntimeScript(firebaseConfig, devMode) {
    const configJson = firebaseConfig ? JSON.stringify(firebaseConfig) : 'null';
    const devModeLiteral = devMode ? 'true' : 'false';
    return `
(function(){
  var userProfile = __PROFILE_JSON__;
  var firebaseConfig = ${configJson};
  var devMode = ${devModeLiteral};
  var toast = document.getElementById('profile-toast');
  var toastTimer = null;
  var auth = null;
  var db = null;
  var currentUser = null;

  function showToast(msg) {
    if (!devMode || !toast) return;
    toast.textContent = msg || 'Profile updated';
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toast.classList.remove('visible'); }, 1800);
  }

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
    }
  }

  function applyProfileToForm() {
    document.querySelectorAll('[data-profile-key]').forEach(function(el) {
      var key = el.getAttribute('data-profile-key');
      if (!key || userProfile[key] == null) return;
      var val = userProfile[key];
      if (el.type === 'checkbox') {
        el.checked = String(val).toLowerCase() === String(el.value).toLowerCase();
      } else if (el.tagName === 'SELECT') {
        el.value = val;
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
    showToast('Saved: ' + desc);
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'formstar-profile-update', key: key, value: val, description: desc }, '*');
    }
    if (persist && db && currentUser) {
      var updates = {};
      updates[key] = val;
      updates[key + '_description'] = userProfile[key + '_description'] || desc;
      db.collection('users').doc(currentUser.uid).set(updates, { merge: true }).catch(function(err) {
        console.error('Profile save error:', err);
      });
    }
  }

  document.querySelectorAll('[data-autopopulate]').forEach(function(el) {
    el.addEventListener('input', function(){ updateAutofillBadge(el); });
    el.addEventListener('change', function(){ syncProfileFromInput(el, true); });
    el.addEventListener('blur', function(){ syncProfileFromInput(el, true); });
  });

  function initFirebase() {
    if (!firebaseConfig || typeof firebase === 'undefined') return;
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();

    var authPanel = document.getElementById('auth-panel');
    var authStatus = document.getElementById('auth-status');
    var loginForm = document.getElementById('standalone-login-form');
    var logoutBtn = document.getElementById('standalone-logout-btn');
    var authError = document.getElementById('standalone-auth-error');

    function setSignedIn(user) {
      currentUser = user;
      if (authPanel) authPanel.classList.toggle('signed-in', !!user);
      if (loginForm) loginForm.style.display = user ? 'none' : 'flex';
      if (logoutBtn) logoutBtn.style.display = user ? 'inline-block' : 'none';
      if (authStatus) {
        authStatus.textContent = user
          ? 'Signed in as ' + (user.email || user.uid)
          : 'Sign in to load and save your profile autofill';
      }
    }

    auth.onAuthStateChanged(function(user) {
      setSignedIn(user);
      if (!user || !db) return;
      db.collection('users').doc(user.uid).get().then(function(doc) {
        if (doc.exists) {
          userProfile = Object.assign({}, userProfile, doc.data() || {});
          applyProfileToForm();
        }
      }).catch(function(err) {
        console.error('Profile load error:', err);
      });
    });

    if (loginForm) {
      loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (authError) authError.textContent = '';
        var email = document.getElementById('standalone-login-email').value.trim();
        var password = document.getElementById('standalone-login-password').value;
        auth.signInWithEmailAndPassword(email, password).catch(function(err) {
          if (authError) authError.textContent = err.message || 'Sign in failed';
        });
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        auth.signOut();
      });
    }
  }

  initFirebase();
  applyProfileToForm();

  var containers = Array.from(document.querySelectorAll('.question-container'));
  var current = 0;
  var prevBtn = document.getElementById('prev-btn');
  var nextBtn = document.getElementById('next-btn');
  var indicator = document.getElementById('step-indicator');

  function showQuestion(idx) {
    containers.forEach(function(c, i){ c.classList.toggle('hidden', i !== idx); });
    current = idx;
    if (prevBtn) prevBtn.disabled = idx <= 0;
    if (nextBtn) nextBtn.disabled = idx >= containers.length - 1;
    if (indicator) {
      indicator.textContent = devMode
        ? 'Question ' + (idx + 1) + ' of ' + containers.length
        : '';
    }
  }

  if (prevBtn && nextBtn && containers.length > 1) {
    prevBtn.addEventListener('click', function(){ if (current > 0) showQuestion(current - 1); });
    nextBtn.addEventListener('click', function(){ if (current < containers.length - 1) showQuestion(current + 1); });
    showQuestion(0);
  }
})();`;
  }

  function buildSubmitScript(pdfToken) {
    const tokenJson = JSON.stringify(pdfToken || null);
    return `
(function(){
  var pdfToken = ${tokenJson};
  var submitBtn = document.getElementById('submit-form-btn');
  var submitStatus = document.getElementById('submit-status');
  var previewSection = document.getElementById('pdf-preview-section');
  var previewFrame = document.getElementById('filled-pdf-preview');
  var previewUrl = null;

  function formatDateForServer(dateString) {
    if (!dateString) return '';
    var parts = dateString.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return parts[1] + '/' + parts[2] + '/' + parts[0];
    }
    return dateString;
  }

  function setSubmitStatus(msg, isError) {
    if (!submitStatus) return;
    submitStatus.textContent = msg || '';
    submitStatus.className = isError ? 'submit-status error' : 'submit-status';
  }

  function collectFormData() {
    var form = document.getElementById('generated-form');
    var fd = new FormData();
    if (!form) return fd;
    form.querySelectorAll('input, textarea, select').forEach(function(el) {
      if (!el.name || el.disabled || el.id === 'submit-form-btn') return;
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

  async function submitForm() {
    if (!pdfToken) {
      setSubmitStatus('PDF template not available. Re-run Step 5 in the Auto-Form Creator demo.', true);
      return;
    }
    setSubmitStatus('Generating filled PDF…');
    if (submitBtn) submitBtn.disabled = true;

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
        try {
          var errJson = JSON.parse(errText);
          if (errJson.error) errMsg = errJson.error;
        } catch (ignore) {
          if (errText) errMsg = errText;
        }
        throw new Error(errMsg);
      }

      var blob = await res.blob();
      if (!blob.size) throw new Error('Received empty PDF');

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(blob);
      if (previewFrame) previewFrame.src = previewUrl;
      if (previewSection) previewSection.hidden = false;
      setSubmitStatus('');
      if (previewSection) previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitStatus(err.message || 'Failed to generate PDF preview', true);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', submitForm);
    if (!pdfToken) submitBtn.title = 'PDF template not registered — complete Step 5 in the demo first';
  }
})();`;
  }

  function buildFormHtml(formConfig, userProfile, options) {
    options = options || {};
    const firebaseConfig = options.firebaseConfig || null;
    const htmlMode = options.htmlMode || formConfig.htmlMode || 'dev';
    const devMode = htmlMode !== 'normal';
    const displayMode = formConfig.displayMode === 'one_at_a_time' ? 'one_at_a_time' : 'all_at_once';
    const title = esc(formConfig.formTitle || 'Generated Form');
    const pdfToken = options.pdfToken || formConfig.pdfToken || null;
    const profileJson = JSON.stringify(userProfile || {});

    let questionIndex = 0;
    let body = '';

    for (const section of formConfig.sections || []) {
      body += `<section class="form-section"><h2 class="section-title">${esc(section.sectionName || 'Section')}</h2>`;

      for (const question of section.questions || []) {
        questionIndex += 1;
        const hiddenClass = displayMode === 'one_at_a_time' && questionIndex > 1 ? ' hidden' : '';
        const questionText = devMode ? question.text : stripQuestionNumber(question.text);
        body += `<div class="question-container${hiddenClass}" id="question-container-${questionIndex}" data-question-index="${questionIndex}">`;
        body += `<label><h3>${esc(questionText)}</h3></label>`;
        body += renderInput(question, userProfile, devMode);
        if (devMode && question.autopopulate?.enabled && question.type !== 'multipleTextboxes') {
          body += autopopulateBadgeHtml(question, devMode);
        }
        body += '</div>';
      }
      body += '</section>';
    }

    const stepperIndicator = devMode
      ? `<span id="step-indicator">Question 1 of ${questionIndex}</span>`
      : '<span id="step-indicator" class="step-indicator-hidden" aria-hidden="true"></span>';
    const stepperNav = displayMode === 'one_at_a_time'
      ? `<div class="stepper-nav"><button type="button" id="prev-btn" disabled>Previous</button>${stepperIndicator}<button type="button" id="next-btn"${questionIndex <= 1 ? ' disabled' : ''}>Next</button></div>`
      : '';
    const submitSection = `
      <div class="form-submit-row">
        <button type="button" id="submit-form-btn" class="submit-form-btn"${pdfToken ? '' : ' disabled'}>Submit</button>
        <span class="submit-status" id="submit-status"></span>
      </div>`;

    const runtimeScript = buildRuntimeScript(firebaseConfig, devMode).replace('__PROFILE_JSON__', profileJson);
    const submitScript = buildSubmitScript(pdfToken);
    const authPanel = devMode && firebaseConfig ? buildFirebaseAuthPanel() : '';
    const formSubtitle = devMode
      ? `<p class="form-subtitle">${displayMode === 'one_at_a_time' ? 'One question at a time' : 'All questions visible'}</p>`
      : '';
    const profileToast = devMode
      ? '<div class="profile-toast" id="profile-toast">Profile updated</div>'
      : '';
    const bodyClass = devMode ? '' : ' class="normal-mode"';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
${buildFirebaseHead(firebaseConfig)}
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 24px; background: #f4f7fb; color: #2c3e50; }
  body.normal-mode .auth-panel, body.normal-mode .autopopulate-badge, body.normal-mode .profile-toast { display: none !important; }
  .form-wrap { max-width: 720px; margin: 0 auto; }
  h1 { margin: 0 0 8px; color: #1e4996; }
  body.normal-mode h1 { margin-bottom: 24px; }
  .form-subtitle { color: #546e7a; margin-bottom: 24px; }
  .auth-panel { background: #fff; border: 1px solid #c5ddf8; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
  .auth-panel-inner { display: flex; flex-direction: column; gap: 10px; }
  .auth-panel.signed-in { background: #f0fdf4; border-color: #bbf7d0; }
  .auth-form { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .auth-form input { flex: 1 1 160px; padding: 8px 10px; border: 2px solid #dbeafe; border-radius: 8px; font: inherit; }
  .auth-form button, .auth-logout { padding: 8px 14px; border: none; border-radius: 8px; background: #1e4996; color: #fff; font-weight: 700; cursor: pointer; font: inherit; }
  .auth-logout { background: #546e7a; }
  .auth-error { color: #b91c1c; font-size: 0.85rem; }
  .form-section { margin-bottom: 28px; }
  .section-title { font-size: 1.1rem; color: #1e4996; border-bottom: 2px solid #dbeafe; padding-bottom: 8px; }
  .question-container { background: #fff; border: 1px solid #c5ddf8; border-radius: 12px; padding: 20px; margin: 14px 0; }
  .question-container.hidden { display: none; }
  .question-container h3 { margin: 0 0 12px; font-size: 1rem; font-weight: 600; }
  input[type=text], input[type=tel], input[type=date], input[type=number], input[type=email], input[type=password], textarea, select {
    width: 100%; padding: 10px 12px; border: 2px solid #dbeafe; border-radius: 8px; font: inherit;
  }
  .textbox-group { margin-bottom: 10px; }
  .textbox-group label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px; }
  .checkbox-option { display: block; margin: 8px 0; }
  .autopopulate-badge { margin-top: 10px; font-size: 0.78rem; font-weight: 700; padding: 4px 10px; border-radius: 999px; display: inline-block; }
  .autofill-ready { background: #d1fae5; color: #065f46; }
  .autofill-learn { background: #fef3c7; color: #92400e; }
  .stepper-nav { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 20px 0; }
  .stepper-nav button { padding: 10px 18px; border: none; border-radius: 8px; background: #1e4996; color: #fff; font-weight: 700; cursor: pointer; }
  .stepper-nav button:disabled { opacity: 0.4; cursor: not-allowed; }
  .step-indicator-hidden { display: none; }
  .profile-toast { position: fixed; bottom: 16px; right: 16px; background: #1e4996; color: #fff; padding: 10px 16px; border-radius: 8px; font-size: 0.85rem; opacity: 0; transition: opacity 0.2s; pointer-events: none; z-index: 1000; }
  .profile-toast.visible { opacity: 1; }
  .form-submit-row { margin: 28px 0 8px; display: flex; flex-wrap: wrap; align-items: center; gap: 14px; }
  .submit-form-btn { padding: 12px 28px; border: none; border-radius: 10px; background: #1e4996; color: #fff; font: inherit; font-size: 1rem; font-weight: 700; cursor: pointer; }
  .submit-form-btn:hover:not(:disabled) { background: #163a78; }
  .submit-form-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .submit-status { font-size: 0.88rem; color: #546e7a; }
  .submit-status.error { color: #b91c1c; font-weight: 600; }
  .pdf-preview-section { margin-top: 28px; }
  .pdf-preview-title { margin: 0 0 12px; font-size: 1.05rem; color: #1e4996; }
  .filled-pdf-frame { width: 100%; min-height: 720px; border: 1px solid #c5ddf8; border-radius: 12px; background: #fff; }
</style>
</head>
<body${bodyClass}>
<div class="form-wrap">
  ${authPanel}
  <h1>${title}</h1>
  ${formSubtitle}
  <form id="generated-form">${body}${stepperNav}${submitSection}</form>
  <div class="pdf-preview-section" id="pdf-preview-section" hidden>
    <h2 class="pdf-preview-title">Filled PDF Preview</h2>
    <iframe id="filled-pdf-preview" class="filled-pdf-frame" title="Filled PDF preview"></iframe>
  </div>
</div>
${profileToast}
<script>${runtimeScript}<\/script>
<script>${submitScript}<\/script>
</body>
</html>`;
  }

  global.FormHtmlRenderer = { build: buildFormHtml };
})(typeof window !== 'undefined' ? window : globalThis);
