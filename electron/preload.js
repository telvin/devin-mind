const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // File operations
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
    saveResults: (results) => ipcRenderer.invoke('save-results', results),

    // Workflow operations
    validateWorkflow: (content) => ipcRenderer.invoke('validate-workflow', content),
    executeWorkflow: (content, options) => ipcRenderer.invoke('execute-workflow', content, options),
    stopWorkflowExecution: (processId) => ipcRenderer.invoke('stop-workflow-execution', processId),

    // Environment check
    checkEnvironment: () => ipcRenderer.invoke('check-environment'),

    // Settings management
    updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),

    // Event listeners for real-time updates
    onWorkflowLoaded: (callback) => ipcRenderer.on('workflow-loaded', callback),
    onWorkflowOutput: (callback) => ipcRenderer.on('workflow-output', callback),
    onWorkflowProgress: (callback) => ipcRenderer.on('workflow-progress', callback),
    onWorkflowComplete: (callback) => ipcRenderer.on('workflow-complete', callback),
    
    // Menu event listeners
    onSaveResultsRequest: (callback) => ipcRenderer.on('save-results-request', callback),
    onValidateWorkflowRequest: (callback) => ipcRenderer.on('validate-workflow-request', callback),
    onExecuteWorkflowRequest: (callback) => ipcRenderer.on('execute-workflow-request', callback),
    onClearResultsRequest: (callback) => ipcRenderer.on('clear-results-request', callback),

    // Remove event listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
    removeListener: (channel, callback) => ipcRenderer.removeListener(channel, callback)
});