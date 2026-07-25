/**
 * VibeSnap Selection Overlay & Floating Toolbar Positioner
 */

document.addEventListener('DOMContentLoaded', () => {
  const bgCanvas = document.getElementById('bgCanvas');
  const bgCtx = bgCanvas.getContext('2d');
  const maskOverlay = document.getElementById('maskOverlay');
  const selectionBox = document.getElementById('selectionBox');
  const drawCanvas = document.getElementById('drawCanvas');
  const floatingBar = document.getElementById('floatingBar');
  const dimensionTag = document.getElementById('dimensionTag');
  const instructionBanner = document.getElementById('instructionBanner');

  let annotationEngine = null;

  // Selection Box Coordinates
  let isSelecting = false;
  let isMoving = false;
  let activeHandle = null;
  let startX = 0, startY = 0;
  let boxX = 0, boxY = 0, boxW = 0, boxH = 0;
  let moveOffsetX = 0, moveOffsetY = 0;

  // Initialize Screen Capture Data from Main Process
  if (window.electronAPI) {
    window.electronAPI.onInitScreenshot((screenData) => {
      console.log('Received screenshot data:', screenData);
      resetOverlay();
      loadScreenBackground(screenData);
    });
  }

  function resetOverlay() {
    selectionBox.classList.add('hidden');
    floatingBar.classList.add('hidden');
    instructionBanner.classList.remove('hidden');
    maskOverlay.style.display = 'block';
    boxX = 0; boxY = 0; boxW = 0; boxH = 0;

    if (annotationEngine) {
      annotationEngine.clear();
    }
  }

  function loadScreenBackground(screenData) {
    const { displays } = screenData;
    if (!displays || displays.length === 0) return;

    const primary = displays.find(d => d.isPrimary) || displays[0];

    const img = new Image();
    img.onload = () => {
      bgCanvas.width = window.innerWidth;
      bgCanvas.height = window.innerHeight;
      bgCtx.drawImage(img, 0, 0, bgCanvas.width, bgCanvas.height);

      if (!annotationEngine) {
        annotationEngine = new window.AnnotationEngine(drawCanvas);
        window.annotationEngine = annotationEngine;
      }
    };
    img.onerror = (err) => console.error('Error loading background image:', err);
    img.src = primary.dataUrl;
  }

  // Mouse Selection Events
  document.addEventListener('mousedown', (e) => {
    // Ignore clicks on floating toolbar
    if (e.target.closest('#floatingBar')) return;

    const handle = e.target.closest('.handle');
    if (handle) {
      activeHandle = handle.dataset.handle;
      startX = e.clientX;
      startY = e.clientY;
      return;
    }

    if (e.target.closest('#selectionBox')) {
      if (!annotationEngine || annotationEngine.activeTool === 'select') {
        isMoving = true;
        moveOffsetX = e.clientX - boxX;
        moveOffsetY = e.clientY - boxY;
      }
      return;
    }

    // Creating new selection rectangle outside selection box
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;
    boxX = startX;
    boxY = startY;
    boxW = 0;
    boxH = 0;

    maskOverlay.style.display = 'none'; // Outer shadow on selection box handles dimming
    selectionBox.classList.remove('hidden');
    floatingBar.classList.add('hidden');
    instructionBanner.classList.add('hidden');

    updateSelectionDOM(false);

    if (annotationEngine) {
      annotationEngine.clear();
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (isSelecting) {
      const currentX = e.clientX;
      const currentY = e.clientY;

      boxX = Math.min(startX, currentX);
      boxY = Math.min(startY, currentY);
      boxW = Math.abs(currentX - startX);
      boxH = Math.abs(currentY - startY);

      updateSelectionDOM(false);
    } else if (isMoving) {
      boxX = Math.max(0, Math.min(window.innerWidth - boxW, e.clientX - moveOffsetX));
      boxY = Math.max(0, Math.min(window.innerHeight - boxH, e.clientY - moveOffsetY));

      updateSelectionDOM(false);
      positionFloatingBar();
    } else if (activeHandle) {
      resizeFromHandle(e.clientX, e.clientY);
      updateSelectionDOM(false);
      positionFloatingBar();
    }
  });

  document.addEventListener('mouseup', () => {
    if (isSelecting) {
      isSelecting = false;
      if (boxW > 15 && boxH > 15) {
        updateSelectionDOM(true); // Sync canvas size on selection completion
        positionFloatingBar();
        floatingBar.classList.remove('hidden');
      } else {
        resetOverlay();
      }
    } else if (isMoving) {
      isMoving = false;
      updateSelectionDOM(true);
    } else if (activeHandle) {
      activeHandle = null;
      updateSelectionDOM(true);
    }
  });

  function resizeFromHandle(mouseX, mouseY) {
    let right = boxX + boxW;
    let bottom = boxY + boxH;

    if (activeHandle.includes('e')) right = Math.max(boxX + 15, mouseX);
    if (activeHandle.includes('s')) bottom = Math.max(boxY + 15, mouseY);
    if (activeHandle.includes('w')) {
      const newX = Math.min(mouseX, right - 15);
      boxW = right - newX;
      boxX = newX;
    }
    if (activeHandle.includes('n')) {
      const newY = Math.min(mouseY, bottom - 15);
      boxH = bottom - newY;
      boxY = newY;
    }

    if (activeHandle.includes('e')) boxW = right - boxX;
    if (activeHandle.includes('s')) boxH = bottom - boxY;
  }

  function updateSelectionDOM(syncCanvas = false) {
    selectionBox.style.left = `${Math.round(boxX)}px`;
    selectionBox.style.top = `${Math.round(boxY)}px`;
    selectionBox.style.width = `${Math.round(boxW)}px`;
    selectionBox.style.height = `${Math.round(boxH)}px`;

    dimensionTag.textContent = `${Math.round(boxW)} × ${Math.round(boxH)} px`;

    if (syncCanvas && annotationEngine) {
      annotationEngine.resize(Math.round(boxW), Math.round(boxH));
    }
  }

  function positionFloatingBar() {
    const barWidth = floatingBar.offsetWidth || 440;
    const barHeight = floatingBar.offsetHeight || 44;

    let barLeft = boxX + boxW - barWidth;
    let barTop = boxY + boxH + 10; // Below selection box

    // Keep bar on screen horizontally
    if (barLeft < 10) barLeft = boxX;
    if (barLeft + barWidth > window.innerWidth - 10) {
      barLeft = window.innerWidth - barWidth - 10;
    }

    // If bottom overflow, put bar above selection box
    if (barTop + barHeight > window.innerHeight - 10) {
      barTop = boxY - barHeight - 10;
    }

    if (barTop < 10) barTop = 10;

    floatingBar.style.left = `${Math.round(barLeft)}px`;
    floatingBar.style.top = `${Math.round(barTop)}px`;
  }

  window.getSelectionBounds = function() {
    return {
      x: Math.round(boxX),
      y: Math.round(boxY),
      width: Math.round(boxW),
      height: Math.round(boxH)
    };
  };
});
