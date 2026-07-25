const { desktopCapturer, screen } = require('electron');

/**
 * Captures screenshot images of all active displays.
 * Returns display geometry along with high-res base64 image strings.
 */
async function captureAllScreens() {
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();

  // Find max screen width/height across all displays for high-DPI scaling
  let maxW = 3840;
  let maxH = 2160;

  displays.forEach(d => {
    const w = Math.round(d.bounds.width * (d.scaleFactor || 1));
    const h = Math.round(d.bounds.height * (d.scaleFactor || 1));
    maxW = Math.max(maxW, w);
    maxH = Math.max(maxH, h);
  });

  // Request screen capture sources at maximum monitor resolution
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: maxW,
      height: maxH
    }
  });

  const capturedScreens = [];
  for (let i = 0; i < displays.length; i++) {
    const display = displays[i];
    // Match source or fallback to first
    const source = sources[i] || sources[0];
    if (source) {
      capturedScreens.push({
        id: display.id,
        bounds: display.bounds,
        scaleFactor: display.scaleFactor,
        isPrimary: display.id === primaryDisplay.id,
        dataUrl: source.thumbnail.toDataURL()
      });
    }
  }

  return {
    displays: capturedScreens
  };
}

module.exports = { captureAllScreens };
