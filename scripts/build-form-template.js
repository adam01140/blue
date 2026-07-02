/**
 * Builds form-template.html from example.html with injection placeholders.
 * Run: node scripts/build-form-template.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const examplePath = path.join(root, 'public/Auto-Form-Creator/example.html');
const outPath = path.join(root, 'public/Auto-Form-Creator/form-template.html');

const lines = fs.readFileSync(examplePath, 'utf8').split(/\r?\n/);

// 1-based line numbers from exploration
const headEnd = 1104; // through hidden court_address field line
const navStart = 1136;
const navEnd = 2354;
const tailStart = 2355; // hidden_pdf_fields through footer
const tailEnd = 2436;

let head = lines.slice(0, headEnd).join('\n');
head += '\n        <input type="hidden" id="court_address" name="court_address" value="">';
head = head.replace('<title>Example Form</title>', '<title>__FORM_TITLE__</title>');
head = head.replace(/href="generate\.css"/g, 'href="/Forms/CSS/generate.css"');
head = head.replace(/href="generate2\.css"/g, 'href="/Forms/CSS/generate2.css"');
head = head.replace(/src="cart\.js"/g, 'src="/Pages/cart.js"');
head = head.replace(/src="\.\.\/\.\.\/CountyLookup\//g, 'src="/CountyLookup/');
head = head.replace(
  '<form id="customForm" onsubmit="return showThankYouMessage(event);">',
  '<form id="customForm" onsubmit="return window.__autoFormHandleSubmit ? window.__autoFormHandleSubmit(event) : false;">'
);

let navScript = lines.slice(navStart - 1, navEnd).join('\n');

let tail = lines.slice(tailStart - 1, tailEnd).join('\n');

const chromeScript = `
<script>
document.addEventListener('DOMContentLoaded', function() {
  var mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  var mobileNav = document.getElementById('mobile-nav');
  var mobileFormsToggle = document.getElementById('mobile-forms-toggle');
  var mobileFormsMenu = document.getElementById('mobile-forms-menu');
  var body = document.body;
  function toggleMobileMenu() {
    if (!mobileMenuToggle || !mobileNav) return;
    mobileMenuToggle.classList.toggle('active');
    mobileNav.classList.toggle('active');
    body.classList.toggle('menu-open');
  }
  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', function(e) { e.preventDefault(); toggleMobileMenu(); });
  }
  if (mobileFormsToggle && mobileFormsMenu) {
    mobileFormsToggle.addEventListener('click', function(e) {
      e.preventDefault();
      mobileFormsToggle.classList.toggle('active');
      mobileFormsMenu.classList.toggle('active');
    });
  }
  var formsWrapper = document.getElementById('forms-dropdown-wrapper');
  var formsMenu = document.getElementById('forms-dropdown-menu');
  var formsLink = document.getElementById('forms-nav-link');
  if (formsWrapper && formsMenu && formsLink) {
    var dropdownOpen = false;
    function openDropdown() { dropdownOpen = true; formsMenu.style.display = 'flex'; }
    function closeDropdown() { dropdownOpen = false; formsMenu.style.display = 'none'; }
    formsLink.addEventListener('click', function(e) { e.preventDefault(); dropdownOpen ? closeDropdown() : openDropdown(); });
    document.addEventListener('click', function(e) {
      if (!formsWrapper.contains(e.target)) closeDropdown();
    });
  }
});
</script>
<div id="signinRequiredModal" class="signin-modal-overlay" style="display:none;">
  <div class="signin-modal">
    <h2>Sign In Required</h2>
    <p>Please sign in to continue filling out this form.</p>
    <a href="/Pages/account.html" class="signin-modal-button">Sign In</a>
  </div>
</div>
<div class="pdf-preview-section" id="pdf-preview-section" hidden style="max-width:737px;margin:24px auto;padding:0 20px;">
  <h2 class="section-title" style="text-align:center;">Filled PDF Preview</h2>
  <iframe id="filled-pdf-preview" title="Filled PDF preview" style="width:100%;min-height:720px;border:1px solid #bcd8ff;border-radius:12px;background:#fff;"></iframe>
</div>
__AUTO_FORM_RUNTIME_SCRIPTS__
</body>
</html>
`;

const template = [
  head,
  '__AUTO_FORM_BODY__',
  navScript,
  tail,
  chromeScript
].join('\n');

if (!template.includes('.hidden { display: none !important; }')) {
  throw new Error('form-template is missing `.hidden { display: none !important; }` (required for nav skip of mirror questions)');
}

fs.writeFileSync(outPath, template, 'utf8');
console.log('Wrote', outPath, '(' + template.length + ' chars)');
