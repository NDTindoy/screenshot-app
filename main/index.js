const { app, BrowserWindow, globalShortcut, ipcMain, nativeImage, clipboard, dialog, Notification, Tray, Menu, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { captureAllScreens } = require('./capturer');

let mainWindow = null;
let overlayWindow = null;
let tray = null;
let isCapturing = false;

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function getAppIcon() {
  const iconPath = path.join(__dirname, '../assets/logo.jpg');
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath);
  }
  return nativeImage.createEmpty();
}

function createMainWindow() {
  const icon = getAppIcon();

  mainWindow = new BrowserWindow({
    width: 620,
    height: 460,
    minWidth: 480,
    minHeight: 300,
    resizable: true,
    title: 'VibeSnap - Snipping Tool',
    icon,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/main.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createOverlayWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height, x, y } = primaryDisplay.bounds;

  overlayWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    fullscreen: true,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    enableLargerThanScreen: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  overlayWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  overlayWindow.on('closed', () => {
    overlayWindow = null;
    isCapturing = false;
  });
}

async function triggerCapture(opts = {}) {
  if (isCapturing) return;
  isCapturing = true;

  // Minimize main window during screenshot capture
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }

  setTimeout(async () => {
    try {
      const screenData = await captureAllScreens();

      if (!overlayWindow) {
        createOverlayWindow();
      }

      const primaryDisplay = screen.getPrimaryDisplay();
      overlayWindow.setBounds(primaryDisplay.bounds);
      overlayWindow.setAlwaysOnTop(true, 'screen-saver');
      overlayWindow.show();

      if (overlayWindow.webContents.isLoading()) {
        overlayWindow.webContents.once('did-finish-load', () => {
          overlayWindow.webContents.send('init-screenshot', screenData);
        });
      } else {
        overlayWindow.webContents.send('init-screenshot', screenData);
      }
    } catch (err) {
      console.error('Failed to capture screen:', err);
      isCapturing = false;
    }
  }, 200);
}

function createTrayIcon() {
  const icon = getAppIcon();

  tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open VibeSnap Snipping Tool',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
        } else {
          createMainWindow();
        }
      }
    },
    {
      label: 'New Snip (Ctrl+Shift+S)',
      click: () => triggerCapture()
    },
    { type: 'separator' },
    {
      label: 'Exit VibeSnap',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('VibeSnap Snipping Tool (Ctrl+Shift+S)');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      createMainWindow();
    }
  });
}

app.whenReady().then(() => {
  createTrayIcon();
  createMainWindow();

  // Register Global Shortcut: Ctrl+Shift+S
  const shortcut = 'CommandOrControl+Shift+S';
  const registered = globalShortcut.register(shortcut, () => {
    triggerCapture();
  });

  if (!registered) {
    console.warn(`Failed to register global shortcut ${shortcut}`);
  } else {
    console.log(`Global shortcut registered: ${shortcut}`);
  }

  createOverlayWindow();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && app.isQuitting) {
    app.quit();
  }
});

// IPC Handlers
ipcMain.on('trigger-snip', (event, opts) => {
  triggerCapture(opts);
});

ipcMain.on('close-overlay', () => {
  if (overlayWindow) {
    overlayWindow.hide();
    isCapturing = false;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.restore();
  }
});

ipcMain.handle('copy-image', async (event, dataUrl) => {
  try {
    const image = nativeImage.createFromDataURL(dataUrl);
    clipboard.writeImage(image);

    if (overlayWindow) {
      overlayWindow.hide();
      isCapturing = false;
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.restore();
      mainWindow.webContents.send('snip-completed', dataUrl);
    }

    new Notification({
      title: 'Copied to Clipboard!',
      body: 'Screenshot copied. Press Ctrl+V to paste anywhere.'
    }).show();

    return { success: true };
  } catch (err) {
    console.error('Error copying to clipboard:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-image', async (event, dataUrl) => {
  try {
    const defaultPath = path.join(
      app.getPath('pictures'),
      `VibeSnap_${Date.now()}.png`
    );

    const { canceled, filePath } = await dialog.showSaveDialog(overlayWindow || mainWindow, {
      title: 'Save Screenshot',
      defaultPath,
      filters: [
        { name: 'PNG Image', extensions: ['png'] },
        { name: 'JPEG Image', extensions: ['jpg', 'jpeg'] }
      ]
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.promises.writeFile(filePath, buffer);

    if (overlayWindow) {
      overlayWindow.hide();
      isCapturing = false;
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.restore();
      mainWindow.webContents.send('snip-completed', dataUrl);
    }

    new Notification({
      title: 'Screenshot Saved!',
      body: `Saved to ${path.basename(filePath)}`
    }).show();

    return { success: true, filePath };
  } catch (err) {
    console.error('Error saving image:', err);
    return { success: false, error: err.message };
  }
});
