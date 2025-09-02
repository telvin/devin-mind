import { app, BrowserWindow, ipcMain, dialog, Menu, globalShortcut } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

// Import your devin-mind modules
import { startWorkflow, validateWorkflow } from './src/workflow-executor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DevinMindApp {
    constructor() {
        this.mainWindow = null;
        this.isDev = process.env.NODE_ENV === 'development';
        this.currentProcess = null; // Track current execution process
        this.runningProcesses = new Map(); // Track multiple processes by ID
        
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
            icon: path.join(__dirname, 'electron', 'assets', 'icon.png'),
            titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
            show: false,
            // Enable keyboard events on macOS
            acceptFirstMouse: true,
            enableLargerThanScreen: false
        });

        // Load the app
        this.mainWindow.loadFile(path.join(__dirname, 'electron', 'renderer', 'index.html'));

        // Show window when ready
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            this.mainWindow.focus(); // Ensure window has focus
            if (this.isDev) {
                this.mainWindow.webContents.openDevTools();
            }
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
    }

    async saveResults() {
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
                    // Include errors at top level when validation fails
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

        // Workflow execution with real-time logging
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

                // Override console methods to capture all output
                const originalConsole = {
                    log: console.log,
                    error: console.error,
                    warn: console.warn
                };

                console.log = (...args) => {
                    const message = args.join(' ');
                    logger.log(message);
                    originalConsole.log(...args);
                };

                console.error = (...args) => {
                    const message = args.join(' ');
                    logger.error(message);
                    originalConsole.error(...args);
                };

                console.warn = (...args) => {
                    const message = args.join(' ');
                    logger.warn(message);
                    originalConsole.warn(...args);
                };

                // Merge current settings with execution options
                const executionOptions = {
                    ...options,
                    maxPolls: this.settings.maxPolls,
                    pollingInterval: this.settings.pollingInterval,
                    firstPollingInterval: this.settings.firstPollingInterval,
                    verbose: true,
                    onProgress: (progress) => {
                        this.mainWindow?.webContents.send('workflow-progress', progress);
                    }
                };

                // Store process reference for potential termination
                const executionPromise = startWorkflow(content, executionOptions);

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

                // Restore original console methods
                console.log = originalConsole.log;
                console.error = originalConsole.error;
                console.warn = originalConsole.warn;

                // Clean up process reference
                this.runningProcesses.delete(processId);

                // Check if cancelled
                const processInfo = this.runningProcesses.get(processId);
                if (processInfo?.cancelled) {
                    this.mainWindow?.webContents.send('workflow-complete', {
                        success: false,
                        stopped: true,
                        message: 'Workflow execution was stopped by user'
                    });
                    return { success: false, stopped: true, processId };
                }

                this.mainWindow?.webContents.send('workflow-complete', {
                    success: true,
                    result
                });

                return { success: true, result, processId };

            } catch (error) {
                // Restore console if there was an error
                console.log = console.log;
                console.error = console.error;
                console.warn = console.warn;

                this.mainWindow?.webContents.send('workflow-complete', {
                    success: false,
                    error: error.message
                });

                return { success: false, error: error.message };
            }
        });

        // Stop workflow execution
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

        // Environment check
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

        // Save results
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

        // Settings management
        ipcMain.handle('get-settings', async () => {
            return {
                success: true,
                settings: this.settings
            };
        });

        ipcMain.handle('update-settings', async (event, newSettings) => {
            try {
                // Update settings with new values
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
    }

    init() {
        // Setup IPC handlers
        this.setupIPCHandlers();

        // App event handlers
        app.whenReady().then(() => {
            this.createWindow();
            
            // Register global keyboard shortcuts for text editing
            this.setupGlobalShortcuts();

            app.on('activate', () => {
                if (BrowserWindow.getAllWindows().length === 0) {
                    this.createWindow();
                }
            });
        });

        app.on('window-all-closed', () => {
            // Unregister global shortcuts
            globalShortcut.unregisterAll();
            
            // Clean up any running processes
            this.runningProcesses.forEach((processInfo, processId) => {
                processInfo.cancel();
            });
            this.runningProcesses.clear();

            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        // Handle app termination
        app.on('before-quit', () => {
            // Unregister global shortcuts
            globalShortcut.unregisterAll();
            
            // Clean up any running processes
            this.runningProcesses.forEach((processInfo, processId) => {
                processInfo.cancel();
            });
            this.runningProcesses.clear();
        });
    }

    setupGlobalShortcuts() {
        // Register global shortcuts for text editing operations
        
        // Select All (Cmd+A)
        globalShortcut.register('CommandOrControl+A', () => {
            const focused = BrowserWindow.getFocusedWindow();
            if (focused && focused === this.mainWindow) {
                focused.webContents.sendInputEvent({
                    type: 'keyDown',
                    keyCode: 'A',
                    modifiers: process.platform === 'darwin' ? ['cmd'] : ['ctrl']
                });
                focused.webContents.sendInputEvent({
                    type: 'keyUp',
                    keyCode: 'A',
                    modifiers: process.platform === 'darwin' ? ['cmd'] : ['ctrl']
                });
            }
        });

        // Copy (Cmd+C)
        globalShortcut.register('CommandOrControl+C', () => {
            const focused = BrowserWindow.getFocusedWindow();
            if (focused && focused === this.mainWindow) {
                focused.webContents.sendInputEvent({
                    type: 'keyDown',
                    keyCode: 'C',
                    modifiers: process.platform === 'darwin' ? ['cmd'] : ['ctrl']
                });
                focused.webContents.sendInputEvent({
                    type: 'keyUp',
                    keyCode: 'C',
                    modifiers: process.platform === 'darwin' ? ['cmd'] : ['ctrl']
                });
            }
        });

        // Paste (Cmd+V)
        globalShortcut.register('CommandOrControl+V', () => {
            const focused = BrowserWindow.getFocusedWindow();
            if (focused && focused === this.mainWindow) {
                focused.webContents.sendInputEvent({
                    type: 'keyDown',
                    keyCode: 'V',
                    modifiers: process.platform === 'darwin' ? ['cmd'] : ['ctrl']
                });
                focused.webContents.sendInputEvent({
                    type: 'keyUp',
                    keyCode: 'V',
                    modifiers: process.platform === 'darwin' ? ['cmd'] : ['ctrl']
                });
            }
        });

        // Cut (Cmd+X)
        globalShortcut.register('CommandOrControl+X', () => {
            const focused = BrowserWindow.getFocusedWindow();
            if (focused && focused === this.mainWindow) {
                focused.webContents.sendInputEvent({
                    type: 'keyDown',
                    keyCode: 'X',
                    modifiers: process.platform === 'darwin' ? ['cmd'] : ['ctrl']
                });
                focused.webContents.sendInputEvent({
                    type: 'keyUp',
                    keyCode: 'X',
                    modifiers: process.platform === 'darwin' ? ['cmd'] : ['ctrl']
                });
            }
        });

        console.log('Global shortcuts registered successfully');
    }
}

// Create app instance and initialize
const devinApp = new DevinMindApp();

// Add global error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection:', reason);
    console.error('Promise:', promise);
    // Don't exit the process, just log the error
});

// Add global error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit the process in production, just log the error
});

devinApp.init();

// App event handlers
app.whenReady().then(() => {
    devinApp.setupIpcHandlers();
    devinApp.createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            devinApp.createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
    });
});