/**
 * VibeSnap Snipping Tool Main Window Controller with Settings Support
 */

document.addEventListener('DOMContentLoaded', () => {
  const btnNewSnip = document.getElementById('btnNewSnip');
  const snipMode = document.getElementById('snipMode');
  const snipDelay = document.getElementById('snipDelay');

  const countdownCard = document.getElementById('countdownCard');
  const countdownSecs = document.getElementById('countdownSecs');

  const emptyPlaceholder = document.getElementById('emptyPlaceholder');
  const activePreview = document.getElementById('activePreview');
  const recentImage = document.getElementById('recentImage');

  const btnQuickCopy = document.getElementById('btnQuickCopy');
  const btnQuickSave = document.getElementById('btnQuickSave');

  // Settings Elements
  const btnSettings = document.getElementById('btnSettings');
  const btnCloseSettings = document.getElementById('btnCloseSettings');
  const btnSaveSettings = document.getElementById('btnSaveSettings');
  const settingsModal = document.getElementById('settingsModal');

  const setAutoCopy = document.getElementById('setAutoCopy');
  const setNotify = document.getElementById('setNotify');
  const setImageFormat = document.getElementById('setImageFormat');

  let currentDataUrl = null;

  // Load Persisted User Preferences
  loadSettings();

  function loadSettings() {
    const autoCopy = localStorage.getItem('vibe_autoCopy');
    if (autoCopy !== null) setAutoCopy.checked = autoCopy === 'true';

    const notify = localStorage.getItem('vibe_notify');
    if (notify !== null) setNotify.checked = notify === 'true';

    const format = localStorage.getItem('vibe_format');
    if (format) setImageFormat.value = format;
  }

  function saveSettings() {
    localStorage.setItem('vibe_autoCopy', setAutoCopy.checked);
    localStorage.setItem('vibe_notify', setNotify.checked);
    localStorage.setItem('vibe_format', setImageFormat.value);
  }

  // Open & Close Settings Modal
  btnSettings.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
  });

  btnCloseSettings.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });

  btnSaveSettings.addEventListener('click', () => {
    saveSettings();
    settingsModal.classList.add('hidden');
  });

  // Close modal when clicking outside content card
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.add('hidden');
    }
  });

  // New Snip Button Click
  btnNewSnip.addEventListener('click', () => {
    const delay = parseInt(snipDelay.value || 0, 10);
    const mode = snipMode.value;

    if (delay > 0) {
      runCountdown(delay, () => {
        triggerSnip(mode);
      });
    } else {
      triggerSnip(mode);
    }
  });

  function runCountdown(seconds, callback) {
    btnNewSnip.disabled = true;
    countdownCard.classList.remove('hidden');
    let remaining = seconds;
    countdownSecs.textContent = remaining;

    const timer = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        countdownSecs.textContent = remaining;
      } else {
        clearInterval(timer);
        countdownCard.classList.add('hidden');
        btnNewSnip.disabled = false;
        callback();
      }
    }, 1000);
  }

  function triggerSnip(mode) {
    if (window.electronAPI && window.electronAPI.triggerSnip) {
      window.electronAPI.triggerSnip({ mode });
    }
  }

  // Receive Snip Completed Thumbnail
  if (window.electronAPI && window.electronAPI.onSnipCompleted) {
    window.electronAPI.onSnipCompleted((dataUrl) => {
      if (dataUrl) {
        currentDataUrl = dataUrl;
        recentImage.src = dataUrl;
        emptyPlaceholder.style.display = 'none';
        activePreview.classList.remove('hidden');

        // Auto-copy if enabled in settings
        if (setAutoCopy.checked && window.electronAPI) {
          window.electronAPI.copyImage(dataUrl);
        }
      }
    });
  }

  // Quick Copy
  btnQuickCopy.addEventListener('click', async () => {
    if (currentDataUrl && window.electronAPI) {
      btnQuickCopy.querySelector('span').textContent = 'Copied!';
      await window.electronAPI.copyImage(currentDataUrl);
      setTimeout(() => {
        btnQuickCopy.querySelector('span').textContent = 'Copy';
      }, 1500);
    }
  });

  // Quick Save
  btnQuickSave.addEventListener('click', async () => {
    if (currentDataUrl && window.electronAPI) {
      btnQuickSave.querySelector('span').textContent = 'Saving...';
      await window.electronAPI.saveImage(currentDataUrl);
      setTimeout(() => {
        btnQuickSave.querySelector('span').textContent = 'Save';
      }, 1500);
    }
  });
});
