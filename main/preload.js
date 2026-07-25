const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  triggerSnip: (opts) => ipcRenderer.send('trigger-snip', opts),
  onInitScreenshot: (callback) => ipcRenderer.on('init-screenshot', (event, value) => callback(value)),
  onSnipCompleted: (callback) => ipcRenderer.on('snip-completed', (event, value) => callback(value)),
  closeOverlay: () => ipcRenderer.send('close-overlay'),
  copyImage: (dataUrl) => ipcRenderer.invoke('copy-image', dataUrl),
  saveImage: (dataUrl) => ipcRenderer.invoke('save-image', dataUrl)
});
