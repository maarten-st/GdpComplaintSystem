'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('cockpit', {
  getCases: () => ipcRenderer.invoke('cockpit:getCases'),
  getCaseDetail: (id) => ipcRenderer.invoke('cockpit:getCaseDetail', id),
  recordGate: (caseId, gateId, decision) => ipcRenderer.invoke('cockpit:recordGate', caseId, gateId, decision),
  getMetrics: () => ipcRenderer.invoke('cockpit:getMetrics'),
});
