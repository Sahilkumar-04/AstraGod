/**
 * AstraGod — Settings Module
 * Wires up the Settings modal to AstraStorage + AstraUI.
 */

const AstraSettings = (() => {
  const overlay = document.getElementById('settingsOverlay');
  const closeBtn = document.getElementById('closeSettingsBtn');
  const settingsBtn = document.getElementById('settingsBtn');

  const themeSegmented = document.getElementById('themeSegmented');
  const enterToSendToggle = document.getElementById('enterToSendToggle');
  const timestampsToggle = document.getElementById('timestampsToggle');
  const animationsToggle = document.getElementById('animationsToggle');
  const temperatureSlider = document.getElementById('temperatureSlider');
  const temperatureValue = document.getElementById('temperatureValue');
  const responseLengthSelect = document.getElementById('responseLengthSelect');

  const modalExportBtn = document.getElementById('modalExportBtn');
  const modalImportInput = document.getElementById('modalImportInput');
  const modalClearBtn = document.getElementById('modalClearBtn');

  let onChangeCallback = () => {};
  let onClearHistory = () => {};
  let onImport = () => {};

  function open() {
    const settings = AstraStorage.getSettings();
    reflectSettingsInUI(settings);
    overlay.hidden = false;
  }

  function close() {
    overlay.hidden = true;
  }

  function reflectSettingsInUI(settings) {
    [...themeSegmented.children].forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.themeChoice === settings.theme);
    });
    enterToSendToggle.checked = settings.enterToSend;
    timestampsToggle.checked = settings.showTimestamps;
    animationsToggle.checked = settings.animations;
    temperatureSlider.value = settings.temperature;
    temperatureValue.textContent = settings.temperature;
    responseLengthSelect.value = String(settings.maxTokens);
  }

  function persist(partial) {
    const current = AstraStorage.getSettings();
    const next = { ...current, ...partial };
    AstraStorage.saveSettings(next);
    onChangeCallback(next);
    return next;
  }

  function init({ onChange, onClear, onImportData }) {
    onChangeCallback = onChange || onChangeCallback;
    onClearHistory = onClear || onClearHistory;
    onImport = onImportData || onImport;

    settingsBtn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlay.hidden) close();
    });

    themeSegmented.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-theme-choice]');
      if (!btn) return;
      const theme = btn.dataset.themeChoice;
      [...themeSegmented.children].forEach((b) => b.classList.toggle('active', b === btn));
      AstraUI.applyTheme(theme);
      persist({ theme });
    });

    enterToSendToggle.addEventListener('change', () => persist({ enterToSend: enterToSendToggle.checked }));
    timestampsToggle.addEventListener('change', () => persist({ showTimestamps: timestampsToggle.checked }));
    animationsToggle.addEventListener('change', () => {
      persist({ animations: animationsToggle.checked });
      document.getElementById('app').classList.toggle('no-animations', !animationsToggle.checked);
    });

    temperatureSlider.addEventListener('input', () => {
      temperatureValue.textContent = temperatureSlider.value;
    });
    temperatureSlider.addEventListener('change', () => {
      persist({ temperature: Number(temperatureSlider.value) });
    });

    responseLengthSelect.addEventListener('change', () => {
      persist({ maxTokens: Number(responseLengthSelect.value) });
    });

    modalExportBtn.addEventListener('click', () => document.getElementById('exportDataBtn').click());
    modalClearBtn.addEventListener('click', () => onClearHistory());
    modalImportInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) onImport(file);
      modalImportInput.value = '';
    });

    // Apply saved settings immediately at startup.
    const settings = AstraStorage.getSettings();
    AstraUI.applyTheme(settings.theme);
    document.getElementById('app').classList.toggle('no-animations', !settings.animations);

    // React to OS theme changes when "system" is selected.
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const current = AstraStorage.getSettings();
      if (current.theme === 'system') AstraUI.applyTheme('system');
    });
  }

  return { init, open, close };
})();
