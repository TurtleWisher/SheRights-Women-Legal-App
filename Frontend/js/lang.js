// ─────────────────────────────────────────────
// LANG.JS — Language toggle system
// Switches the entire UI between English and Bangla
// ─────────────────────────────────────────────

// Every piece of text in the app has two versions.
// This object holds them both, keyed by element id.
// When the user clicks the toggle, we swap all text at once.
const translations = {
  en: {
    'nav-home':     'Dashboard',
    'nav-cases':    'My Cases',
    'nav-learn':    'Learn',
    'nav-report':   'Report',
    'nav-chat':     'Chat',
    'nav-login':    'Sign In',
    'nav-register': 'Join Free',
  },
  bn: {
    'nav-home':     'ড্যাশবোর্ড',
    'nav-cases':    'আমার মামলা',
    'nav-learn':    'শিখুন',
    'nav-report':   'রিপোর্ট করুন',
    'nav-chat':     'চ্যাট',
    'nav-login':    'সাইন ইন',
    'nav-register': 'বিনামূল্যে যোগ দিন',
  }
};

// Read which language is currently saved
// If nothing saved, default to English
let currentLang = localStorage.getItem('sr-lang') || 'en';

function applyLanguage(lang) {
  currentLang = lang;

  // Set the html lang attribute — this triggers the CSS font switch
  // :lang(bn) in style.css switches font to Hind Siliguri
  document.documentElement.lang = lang;

  // Save the choice so it persists across page refreshes
  localStorage.setItem('sr-lang', lang);

  // Find every element with a data-key attribute
  // and replace its text with the correct translation
  document.querySelectorAll('[data-key]').forEach(el => {
    const key = el.getAttribute('data-key');
    if (translations[lang] && translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });

  // Update the toggle button active state
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });
}

// Runs when the page first loads — apply saved language immediately
document.addEventListener('DOMContentLoaded', () => {
  applyLanguage(currentLang);

  // Attach click handlers to both toggle buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyLanguage(btn.getAttribute('data-lang'));
    });
  });
});