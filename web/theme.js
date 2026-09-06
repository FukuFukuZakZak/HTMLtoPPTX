(function () {
  "use strict";

  const storageKey = "html-to-pptx-theme";
  const choices = ["light", "dark", "system"];
  let preference = "system";
  try {
    const saved = localStorage.getItem(storageKey);
    if (choices.includes(saved)) preference = saved;
  } catch (_) {
    // Theme switching remains available when browser storage is disabled.
  }

  function applyTheme(value) {
    document.documentElement.dataset.theme = value;
    document.querySelector('meta[name="color-scheme"]').content = value === "system" ? "light dark" : value;
  }

  // Run before CSS, using a same-origin script to respect the app's CSP.
  applyTheme(preference);
  document.addEventListener("DOMContentLoaded", () => {
    for (const control of document.querySelectorAll('input[name="theme"]')) {
      control.checked = control.value === preference;
      control.addEventListener("change", () => {
        if (!control.checked) return;
        preference = control.value;
        applyTheme(preference);
        try {
          localStorage.setItem(storageKey, preference);
        } catch (_) {
          // A blocked storage write must not interrupt the current session.
        }
      });
    }
  }, { once: true });
})();
