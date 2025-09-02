import { app, BrowserWindow, ipcMain, dialog, Menu, globalShortcut } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

// Import your devin-mind modules
import { startWorkflow, validateWorkflow } from './src/workflow-executor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine if we're in development or production
const isDev = process.env.NODE_ENV === 'development';

class DevinMindApp {
    constructor() {
        this.mainWindow = null;
        this.isDev = isDev;
        this.currentProcess = null;
        this.runningProcesses = new Map();
        
        // Default settings
        this.settings = {
            maxPolls: 9999,
            pollingInterval: 10, // seconds
            firstPollingInterval: 90 // seconds
        };
    }

    createWindow() {
        // Create the browser window
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                preload: path.join(__dirname, 'electron', 'preload.js'),
                webSecurity: true,
                allowRunningInsecureContent: false
            },
            icon: path.join(__dirname, 'electron', 'assets', 'images', 'devin-mind-logo-circle.png'),
            titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
            show: false,
            acceptFirstMouse: true,
            enableLargerThanScreen: false
        });

        // Load the app - this is the key fix for production vs development
        const rendererPath = path.join(__dirname, 'electron', 'renderer', 'index.html');
        console.log('Loading renderer from:', rendererPath);
        console.log('File exists:', fs.existsSync(rendererPath));
        
        this.mainWindow.loadFile(rendererPath);

        // Show window when ready
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            this.mainWindow.focus();
            if (this.isDev) {
                this.mainWindow.webContents.openDevTools();
            }
            console.log('Window shown successfully');
        });

        // Handle window closed
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        // macOS specific: Ensure proper focus handling
        if (process.platform === 'darwin') {
            this.mainWindow.on('focus', () => {
                this.mainWindow.webContents.focus();
            });
        }

        // Create application menu
        this.createMenu();
    }

    createMenu() {
        const template = [
            {
                label: 'File',
                submenu: [
                    {
                        label: 'Open Workflow',
                        accelerator: 'CmdOrCtrl+O',
                        click: () => this.openWorkflowFile()
                    },
                    {
                        label: 'Save Results',
                        accelerator: 'CmdOrCtrl+S',
                        click: () => this.saveResults()
                    },
                    { type: 'separator' },
                    {
                        label: 'Exit',
                        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                        click: () => app.quit()
                    }
                ]
            },
            {
                label: 'Workflow',
                submenu: [
                    {
                        label: 'Validate Current',
                        accelerator: 'CmdOrCtrl+Shift+V',
                        click: () => this.validateCurrentWorkflow()
                    },
                    {
                        label: 'Execute Workflow',
                        accelerator: 'CmdOrCtrl+R',
                        click: () => this.executeCurrentWorkflow()
                    },
                    { type: 'separator' },
                    {
                        label: 'Clear Results',
                        click: () => this.clearResults()
                    }
                ]
            },
            {
                label: 'View',
                submenu: [
                    { role: 'reload' },
                    { role: 'forceReload' },
                    { role: 'toggleDevTools' },
                    { type: 'separator' },
                    { role: 'resetZoom' },
                    { role: 'zoomIn' },
                    { role: 'zoomOut' },
                    { type: 'separator' },
                    { role: 'togglefullscreen' }
                ]
            },
            {
                label: 'Window',
                submenu: [
                    { role: 'minimize' },
                    { role: 'close' }
                ]
            }
        ];

        if (process.platform === 'darwin') {
            template.unshift({
                label: app.getName(),
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'services' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideOthers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit' }
                ]
            });
        }

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    async openWorkflowFile() {
        try {
            const result = await dialog.showOpenDialog(this.mainWindow, {
                properties: ['openFile'],
                filters: [
                    { name: 'Markdown Files', extensions: ['md'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                const content = fs.readFileSync(filePath, 'utf8');
                const fileName = path.basename(filePath);

                this.mainWindow.webContents.send('workflow-loaded', {
                    content,
                    fileName,
                    filePath
                });
            }
        } catch (error) {
            console.error('Error opening workflow file:', error);
        }
    }

    async saveResults() {
        try {
            const result = await dialog.showSaveDialog(this.mainWindow, {
                filters: [
                    { name: 'HTML Files', extensions: ['html'] },
                    { name: 'Text Files', extensions: ['txt'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (!result.canceled) {
                this.mainWindow.webContents.send('save-results-request', result.filePath);
            }
        } catch (error) {
            console.error('Error saving results:', error);
        }
    }

    validateCurrentWorkflow() {
        this.mainWindow.webContents.send('validate-workflow-request');
    }

    executeCurrentWorkflow() {
        this.mainWindow.webContents.send('execute-workflow-request');
    }

    clearResults() {
        this.mainWindow.webContents.send('clear-results-request');
    }

    setupIPCHandlers() {
        // File operations
        ipcMain.handle('open-file-dialog', async () => {
            try {
                const result = await dialog.showOpenDialog(this.mainWindow, {
                    properties: ['openFile'],
                    filters: [
                        { name: 'Markdown Files', extensions: ['md'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });

                if (result.canceled) {
                    return { success: false, canceled: true };
                }

                const filePath = result.filePaths[0];
                const content = fs.readFileSync(filePath, 'utf8');
                const fileName = path.basename(filePath);

                return {
                    success: true,
                    content,
                    fileName,
                    filePath
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        // Workflow validation
        ipcMain.handle('validate-workflow', async (event, content) => {
            try {
                const result = await validateWorkflow(content);
                return { 
                    success: result.valid, 
                    result,
                    errors: result.valid ? [] : result.errors,
                    error: result.valid ? null : result.errors[0]
                };
            } catch (error) {
                return { 
                    success: false, 
                    error: error.message,
                    errors: [error.message]
                };
            }
        });

        // Settings management
        ipcMain.handle('get-settings', async () => {
            return {
                success: true,
                settings: this.settings
            };
        });

        ipcMain.handle('update-settings', async (event, newSettings) => {
            try {
                this.settings = {
                    ...this.settings,
                    ...newSettings
                };

                return {
                    success: true,
                    settings: this.settings
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        // Environment check - MISSING HANDLER
        ipcMain.handle('check-environment', async () => {
            try {
                return {
                    devinApiKey: !!process.env.DEVIN_API_KEY,
                    repoUrl: !!process.env.REPO_URL,
                    nodeVersion: process.version
                };
            } catch (error) {
                return { error: error.message };
            }
        });

        // Workflow execution with real-time logging - MISSING HANDLER
        ipcMain.handle('execute-workflow', async (event, content, options = {}) => {
            try {
                const processId = Date.now().toString();
                
                // Create a custom logger that sends output to the renderer
                const logger = {
                    log: (message) => {
                        this.mainWindow?.webContents.send('workflow-output', {
                            type: 'info',
                            message: message
                        });
                    },
                    error: (message) => {
                        this.mainWindow?.webContents.send('workflow-output', {
                            type: 'error',
                            message: message
                        });
                    },
                    warn: (message) => {
                        this.mainWindow?.webContents.send('workflow-output', {
                            type: 'warning',
                            message: message
                        });
                    },
                    success: (message) => {
                        this.mainWindow?.webContents.send('workflow-output', {
                            type: 'success',
                            message: message
                        });
                    }
                };

                // Store process reference for potential termination
                const executionPromise = startWorkflow(content, {
                    ...options,
                    maxPolls: this.settings.maxPolls,
                    pollingInterval: this.settings.pollingInterval,
                    firstPollingInterval: this.settings.firstPollingInterval,
                    verbose: true,
                    onProgress: (progress) => {
                        this.mainWindow?.webContents.send('workflow-progress', progress);
                    }
                });

                // Store the promise with a way to cancel it
                this.runningProcesses.set(processId, {
                    promise: executionPromise,
                    cancelled: false,
                    cancel: () => {
                        this.runningProcesses.get(processId).cancelled = true;
                    }
                });

                // Execute the workflow
                const result = await executionPromise;

                // Clean up process reference
                this.runningProcesses.delete(processId);

                this.mainWindow?.webContents.send('workflow-complete', {
                    success: true,
                    result
                });

                return { success: true, result, processId };

            } catch (error) {
                this.mainWindow?.webContents.send('workflow-complete', {
                    success: false,
                    error: error.message
                });

                return { success: false, error: error.message };
            }
        });

        // Stop workflow execution - MISSING HANDLER
        ipcMain.handle('stop-workflow-execution', async (event, processId) => {
            try {
                if (processId && this.runningProcesses.has(processId)) {
                    const processInfo = this.runningProcesses.get(processId);
                    processInfo.cancel();
                    
                    this.mainWindow?.webContents.send('workflow-output', {
                        type: 'warning',
                        message: 'Stopping workflow execution...'
                    });

                    return { success: true };
                }
                return { success: false, error: 'No running process found' };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // Save results - MISSING HANDLER
        ipcMain.handle('save-results', async (event, results) => {
            try {
                const result = await dialog.showSaveDialog(this.mainWindow, {
                    filters: [
                        { name: 'HTML Files', extensions: ['html'] },
                        { name: 'Text Files', extensions: ['txt'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });

                if (!result.canceled) {
                    fs.writeFileSync(result.filePath, results, 'utf8');
                    return { success: true, filePath: result.filePath };
                }

                return { success: false, canceled: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
    }

    init() {
        // Setup IPC handlers
        this.setupIPCHandlers();

        // App event handlers
        app.whenReady().then(() => {
            console.log('App ready, creating window...');
            this.createWindow();

            app.on('activate', () => {
                if (BrowserWindow.getAllWindows().length === 0) {
                    this.createWindow();
                }
            });
        }).catch(error => {
            console.error('Error during app initialization:', error);
        });

        app.on('window-all-closed', () => {
            this.runningProcesses.forEach((processInfo, processId) => {
                processInfo?.cancel();
            });
            this.runningProcesses.clear();

            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        app.on('before-quit', () => {
            this.runningProcesses.forEach((processInfo, processId) => {
                processInfo?.cancel();
            });
            this.runningProcesses.clear();
        });
    }
}

// Create app instance and initialize
const devinApp = new DevinMindApp();

// Add global error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection:', reason);
    // Don't exit the process, just log the error
});

// Add global error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit the process in production, just log the error
});

console.log('Starting Devin Mind app...');
console.log('Development mode:', isDev);
console.log('__dirname:', __dirname);

devinApp.init();