(function () {
  "use strict";

  const storageKey = "html-to-pptx-theme";
  const choices = ["light", "dark", "system"];
  let preference = "system";
  const appearanceKey = "html-to-pptx-appearance";
  let appearance = "standard";
  try {
    const saved = localStorage.getItem(storageKey);
    if (choices.includes(saved)) preference = saved;
    if (localStorage.getItem(appearanceKey) === "8bit") appearance = "8bit";
  } catch (_) {
    // Theme switching remains available when browser storage is disabled.
  }

  function applyTheme(value) {
    document.documentElement.dataset.theme = value;
    document.querySelector('meta[name="color-scheme"]').content = value === "system" ? "light dark" : value;
  }

  // Run before CSS, using a same-origin script to respect the app's CSP.
  applyTheme(preference);
  document.documentElement.dataset.appearance = appearance;
  document.addEventListener("DOMContentLoaded", () => {
    const settings = document.getElementById("theme-settings");
    document.getElementById("open-settings-button").addEventListener("click", () => settings.showModal());
    document.getElementById("close-settings-button").addEventListener("click", () => settings.close());
    for (const control of document.querySelectorAll('input[name="appearance"]')) {
      control.checked = control.value === appearance;
      control.addEventListener("change", () => {
        if (!control.checked) return;
        appearance = control.value;
        document.documentElement.dataset.appearance = appearance;
        try {
          localStorage.setItem(appearanceKey, appearance);
        } catch (_) {
          // The selected appearance still works for this session without storage.
        }
      });
    }
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
