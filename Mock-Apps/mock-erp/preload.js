// Exposes a minimal, stable ERP API to the renderer (contextIsolation on).
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('erp', {
  getOrder: (ref) => ipcRenderer.invoke('erp:getOrder', ref),
  getBatches: (filter) => ipcRenderer.invoke('erp:getBatches', filter),
  setBatchStatus: (batchNo, status, qty) => ipcRenderer.invoke('erp:setBatchStatus', batchNo, status, qty),
  postNote: (note) => ipcRenderer.invoke('erp:postNote', note),
  getPostings: () => ipcRenderer.invoke('erp:getPostings'),
});
