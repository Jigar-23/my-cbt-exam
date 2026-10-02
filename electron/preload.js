const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron,
  isElectron: true,
  toggleFullScreen: () => ipcRenderer.send('toggle-fullscreen'),
  onOAuthWindowClosed: (callback) => {
    ipcRenderer.on('oauth-window-closed', callback);
  },
  removeOAuthWindowClosed: (callback) => {
    ipcRenderer.removeListener('oauth-window-closed', callback);
  },
  getTestPaper: (testPath) => ipcRenderer.invoke('cbt:get-test-paper', testPath),
  getDevicePhysicalId: () => ipcRenderer.invoke('cbt:get-device-physical-id'),
});

