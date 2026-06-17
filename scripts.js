/* ============================================================
   SCRIPTS — Bilingual Toggle & RSVP Form Handling
   ============================================================ */

(function () {
  'use strict';

  // ----- CONFIGURATION -----
  // 🔧 Paste your Google Apps Script Web App URL here after deployment:
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzQpNBaWKSj854JbZw9JMpcSCGeord9Kp6WAaXuJHKUzBNs8ecNos37B7-KssPwqsCr3A/exec';

  // ----- CURRENT LANGUAGE STATE -----
  let currentLang = 'pl'; // default: Polish

  // ----- DOM REFERENCES -----
  const langBtns = document.querySelectorAll('.lang-btn');
  const langParts = document.querySelectorAll('.lang-part');

  // ----- SWITCH LANGUAGE -----
  function switchLanguage(lang) {
    currentLang = lang;

    // 1) Update toggle button active states
    langBtns.forEach(function (btn) {
      const isActive = btn.getAttribute('data-lang') === lang;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    // 2) Show/hide all data-lang elements
    langParts.forEach(function (el) {
      const plText = el.getAttribute('data-pl');
      const enText = el.getAttribute('data-en');

      if (lang === 'pl' && plText) {
        el.textContent = plText;
        el.removeAttribute('data-lang-hide');
      } else if (lang === 'en' && enText) {
        el.textContent = enText;
        el.removeAttribute('data-lang-hide');
      } else {
        el.setAttribute('data-lang-hide', '');
      }
    });

    // 3) Update the <html> lang attribute
    document.documentElement.setAttribute('lang', lang === 'pl' ? 'pl' : 'en');
  }

  // ----- TOGGLE EVENT LISTENERS -----
  langBtns.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      const lang = btn.getAttribute('data-lang');
      if (lang !== currentLang) {
        switchLanguage(lang);
      }
    });
  });

  // ----- RSVP FORM HANDLING -----
  const form = document.getElementById('rsvpForm');
  const successState = document.getElementById('successState');

  if (form && successState) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // ----- VALIDATION -----
      const nameInput = document.getElementById('fullName');
      const attendanceRadios = document.querySelectorAll('input[name="attendance"]');

      let isValid = true;

      if (!nameInput.value.trim()) {
        nameInput.style.borderBottomColor = '#c0392b';
        isValid = false;
      } else {
        nameInput.style.borderBottomColor = '';
      }

      let attendanceSelected = false;
      let attendanceValue = '';
      attendanceRadios.forEach(function (radio) {
        if (radio.checked) {
          attendanceSelected = true;
          attendanceValue = radio.value;
        }
      });

      if (!attendanceSelected) {
        isValid = false;
        const legend = document.querySelector('.form-group-radio legend');
        if (legend) legend.style.color = '#c0392b';
      } else {
        const legend = document.querySelector('.form-group-radio legend');
        if (legend) legend.style.color = '';
      }

      if (!isValid) return;

      // ----- COLLECT DATA -----
      const dietaryInput = document.getElementById('dietary');
      const songInput = document.getElementById('song');

      const formData = {
        fullName: nameInput.value.trim(),
        attendance: attendanceValue,
        dietary: dietaryInput.value.trim(),
        song: songInput.value.trim()
      };

      // ----- SUBMIT TO GOOGLE APPS SCRIPT -----
      function handleSuccess() {
        form.style.display = 'none';
        successState.setAttribute('aria-hidden', 'false');
        switchLanguage(currentLang);
      }

      function handleError(err) {
        console.warn('Could not save to Google Sheet:', err);
        handleSuccess();
      }

      if (APPS_SCRIPT_URL) {
        // Use navigator.sendBeacon — works from file:// AND http://
        // No CORS issues, no preflight requests
        var payload = new Blob(
          [JSON.stringify(formData)],
          { type: 'text/plain;charset=UTF-8' }
        );

        var sent = navigator.sendBeacon(APPS_SCRIPT_URL, payload);

        if (sent) {
          // sendBeacon always returns true if the data was queued
          // We can't see the response, so assume success
          handleSuccess();
        } else {
          // Fallback: try fetch if sendBeacon failed
          fetch(APPS_SCRIPT_URL + '?data=' + encodeURIComponent(JSON.stringify(formData)), {
            method: 'GET',
            mode: 'no-cors'
          })
          .then(function () {
            handleSuccess();
          })
          .catch(function (err) {
            handleError(err);
          });
        }
      } else {
        // No URL configured — save to localStorage as fallback
        saveToLocalStorage(formData);
        handleSuccess();
      }
    });
  }

  // ----- LOCALSTORAGE FALLBACK -----
  function saveToLocalStorage(data) {
    var stored;
    try {
      stored = JSON.parse(localStorage.getItem('wedding_rsvps') || '[]');
    } catch (e) {
      stored = [];
    }
    stored.push({
      timestamp: new Date().toISOString(),
      fullName: data.fullName,
      attendance: data.attendance,
      dietary: data.dietary,
      song: data.song
    });
    localStorage.setItem('wedding_rsvps', JSON.stringify(stored));
  }

  // ----- INITIALIZE -----
  switchLanguage('pl');
})();