import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Import your devin-mind modules
import { startWorkflow, validateWorkflow } from './src/workflow-executor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DevinMindApp {
    constructor() {
        this.mainWindow = null;
        this.isDev = process.env.NODE_ENV === 'development';
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
                preload: path.join(__dirname, 'electron', 'preload.js')
            },
            icon: path.join(__dirname, 'electron', 'assets', 'icon.png'),
            titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
            show: false
        });

        // Load the app
        this.mainWindow.loadFile(path.join(__dirname, 'electron', 'renderer', 'index.html'));

        // Show window when ready
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            if (this.isDev) {
                this.mainWindow.webContents.openDevTools();
            }
        });

        // Handle window closed
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

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
            const content = fs.readFileSync(filePath, 'utf-8');
            this.mainWindow.webContents.send('workflow-loaded', {
                filePath,
                content,
                fileName: path.basename(filePath)
            });
        }
    }

    async saveResults() {
        const result = await dialog.showSaveDialog(this.mainWindow, {
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
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

    setupIpcHandlers() {
        // Handle workflow validation
        ipcMain.handle('validate-workflow', async (event, workflowContent) => {
            try {
                const result = validateWorkflow(workflowContent);
                return { success: true, result };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // Handle workflow execution
        ipcMain.handle('execute-workflow', async (event, workflowContent, options = {}) => {
            try {
                const result = await startWorkflow(workflowContent, {
                    ...options,
                    verbose: false // Disable console output in GUI mode
                });
                return { success: true, result };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // Handle file operations
        ipcMain.handle('save-file', async (event, filePath, content) => {
            try {
                fs.writeFileSync(filePath, content, 'utf-8');
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // Handle environment variable checks
        ipcMain.handle('check-environment', async () => {
            return {
                devinApiKey: !!process.env.DEVIN_API_KEY,
                adoUrl: !!process.env.ADO_URL,
                nodeEnv: process.env.NODE_ENV
            };
        });

        // Handle progress updates
        ipcMain.on('workflow-progress', (event, progress) => {
            // Forward progress to renderer if needed
            this.mainWindow.webContents.send('workflow-progress-update', progress);
        });

        // Handle file dialog for loading workflows
        ipcMain.handle('open-file-dialog', async () => {
            const result = await dialog.showOpenDialog(this.mainWindow, {
                properties: ['openFile'],
                filters: [
                    { name: 'Markdown Files', extensions: ['md'] },
                    { name: 'Text Files', extensions: ['txt'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
                try {
                    const content = fs.readFileSync(result.filePaths[0], 'utf8');
                    return { success: true, content };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
            
            return { success: false, canceled: true };
        });
    }
}

// Create app instance
const devinApp = new DevinMindApp();

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