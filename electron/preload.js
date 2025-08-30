const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // File operations
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
    saveFile: (filePath, content) => ipcRenderer.invoke('save-file', filePath, content),
    
    // Workflow operations
    validateWorkflow: (content) => ipcRenderer.invoke('validate-workflow', content),
    executeWorkflow: (content, options) => ipcRenderer.invoke('execute-workflow', content, options),
    
    // Environment checks
    checkEnvironment: () => ipcRenderer.invoke('check-environment'),
    
    // Event listeners
    onWorkflowLoaded: (callback) => ipcRenderer.on('workflow-loaded', callback),
    onSaveResultsRequest: (callback) => ipcRenderer.on('save-results-request', callback),
    onValidateWorkflowRequest: (callback) => ipcRenderer.on('validate-workflow-request', callback),
    onExecuteWorkflowRequest: (callback) => ipcRenderer.on('execute-workflow-request', callback),
    onClearResultsRequest: (callback) => ipcRenderer.on('clear-results-request', callback),
    onWorkflowProgressUpdate: (callback) => ipcRenderer.on('workflow-progress-update', callback),
    
    // Remove listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});