const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onUpdateStatus: (callback) => ipcRenderer.on('status-update', (_event, value) => callback(value)),
    onUpdateImage: (callback) => ipcRenderer.on('image-update', (_event, value) => callback(value)),

    // NEW CHANNELS
    onDataUpdate: (callback) => ipcRenderer.on('data-update', (_event, value) => callback(value)),
    onTimerUpdate: (callback) => ipcRenderer.on('timer-update', (_event, value) => callback(value)),

    onUpdateLogs: (callback) => ipcRenderer.on('log-update', (_event, value) => callback(value)),
    onShowSpinner: (callback) => ipcRenderer.on('show-spinner', (_event, value) => callback(value)),
});
