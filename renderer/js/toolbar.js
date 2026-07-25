/**
 * VibeSnap Floating Toolbar & Action Handler
 */

document.addEventListener('DOMContentLoaded', () => {
  const toolBtns = document.querySelectorAll('.tool-btn');
  const colorDots = document.querySelectorAll('.color-dot');

  const btnUndo = document.getElementById('btnUndo');
  const btnCopy = document.getElementById('btnCopy');
  const btnSave = document.getElementById('btnSave');
  const btnCancel = document.getElementById('btnCancel');

  // Tool Switching
  toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toolBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const tool = btn.dataset.tool;
      if (window.annotationEngine) {
        window.annotationEngine.setTool(tool);
      }
    });
  });

  // Color Switching
  colorDots.forEach(dot => {
    dot.addEventListener('click', () => {
      colorDots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');

      const color = dot.dataset.color;
      if (window.annotationEngine) {
        window.annotationEngine.setColor(color);
      }
    });
  });

  // Action: Undo
  btnUndo.addEventListener('click', () => {
    if (window.annotationEngine) {
      window.annotationEngine.undo();
    }
  });

  // Action: Copy to Clipboard
  btnCopy.addEventListener('click', () => copyToClipboard());

  // Action: Save to File
  btnSave.addEventListener('click', () => saveToFile());

  // Action: Cancel
  btnCancel.addEventListener('click', () => cancelOverlay());

  // Keyboard Shortcuts inside active overlay
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      cancelOverlay();
    } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      copyToClipboard();
    } else if (e.ctrlKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveToFile();
    } else if (e.ctrlKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (window.annotationEngine) {
        window.annotationEngine.undo();
      }
    }
  });

  function getCroppedCanvasDataUrl() {
    const { x, y, width, height } = window.getSelectionBounds();
    if (width <= 0 || height <= 0) {
      console.warn('Selection width or height is zero or invalid:', width, height);
      return null;
    }

    const bgCanvas = document.getElementById('bgCanvas');
    const drawCanvas = document.getElementById('drawCanvas');

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    const ctx = exportCanvas.getContext('2d');

    // 1. Draw cropped background screen snapshot
    ctx.drawImage(bgCanvas, x, y, width, height, 0, 0, width, height);

    // 2. Draw annotations on top
    if (drawCanvas.width > 0 && drawCanvas.height > 0) {
      ctx.drawImage(drawCanvas, 0, 0, width, height, 0, 0, width, height);
    }

    return exportCanvas.toDataURL('image/png');
  }

  async function copyToClipboard() {
    const dataUrl = getCroppedCanvasDataUrl();
    if (!dataUrl) return;

    btnCopy.querySelector('span').textContent = 'Copied!';

    if (window.electronAPI) {
      const res = await window.electronAPI.copyImage(dataUrl);
      console.log('Copy result:', res);
    }
  }

  async function saveToFile() {
    const dataUrl = getCroppedCanvasDataUrl();
    if (!dataUrl) return;

    btnSave.querySelector('span').textContent = 'Saving...';

    if (window.electronAPI) {
      const res = await window.electronAPI.saveImage(dataUrl);
      console.log('Save result:', res);
      if (!res.success) {
        btnSave.querySelector('span').textContent = 'Save';
      }
    }
  }

  function cancelOverlay() {
    if (window.electronAPI) {
      window.electronAPI.closeOverlay();
    }
  }
});
