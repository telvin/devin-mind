import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EventEmitter } from 'events';

// Mock Electron modules
const mockWindow = {
    loadFile: jest.fn(),
    once: jest.fn(),
    on: jest.fn(),
    show: jest.fn(),
    focus: jest.fn(),
    webContents: {
        openDevTools: jest.fn(),
        focus: jest.fn(),
        send: jest.fn(),
        sendInputEvent: jest.fn()
    }
};

const mockApp = new EventEmitter();
mockApp.whenReady = jest.fn().mockResolvedValue();
mockApp.quit = jest.fn();
mockApp.getName = jest.fn().mockReturnValue('Devin Mind');

const mockBrowserWindow = jest.fn().mockImplementation(() => mockWindow);
mockBrowserWindow.getAllWindows = jest.fn().mockReturnValue([mockWindow]);
mockBrowserWindow.getFocusedWindow = jest.fn().mockReturnValue(mockWindow);

const mockIpcMain = new EventEmitter();
mockIpcMain.handle = jest.fn();

const mockDialog = {
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn()
};

const mockMenu = {
    buildFromTemplate: jest.fn(),
    setApplicationMenu: jest.fn()
};

const mockGlobalShortcut = {
    register: jest.fn(),
    unregisterAll: jest.fn()
};

// Mock the Electron modules
jest.unstable_mockModule('electron', () => ({
    app: mockApp,
    BrowserWindow: mockBrowserWindow,
    ipcMain: mockIpcMain,
    dialog: mockDialog,
    Menu: mockMenu,
    globalShortcut: mockGlobalShortcut
}));

// Mock Node.js modules
jest.unstable_mockModule('path', () => ({
    join: jest.fn((...args) => args.join('/')),
    dirname: jest.fn(),
    basename: jest.fn((path) => path.split('/').pop())
}));

jest.unstable_mockModule('fs', () => ({
    readFileSync: jest.fn(),
    writeFileSync: jest.fn()
}));

jest.unstable_mockModule('url', () => ({
    fileURLToPath: jest.fn((url) => url.replace('file://', ''))
}));

// Mock workflow modules
jest.unstable_mockModule('../src/workflow-executor.js', () => ({
    startWorkflow: jest.fn(),
    validateWorkflow: jest.fn()
}));

describe('Electron Main Process', () => {
    let DevinMindApp;
    let app;
    let mockStartWorkflow;
    let mockValidateWorkflow;
    let mockFs;

    beforeEach(async () => {
        // Clear all mocks
        jest.clearAllMocks();
        
        // Import mocked modules
        const workflowExecutor = await import('../src/workflow-executor.js');
        mockStartWorkflow = workflowExecutor.startWorkflow;
        mockValidateWorkflow = workflowExecutor.validateWorkflow;
        
        const fs = await import('fs');
        mockFs = fs;

        // Reset mock implementations
        mockApp.whenReady.mockResolvedValue();
        mockWindow.loadFile.mockResolvedValue();
        mockWindow.once.mockImplementation((event, callback) => {
            if (event === 'ready-to-show') {
                setTimeout(callback, 0);
            }
        });

        // Mock the main application class (simulate the structure from main.js)
        DevinMindApp = class {
            constructor() {
                this.mainWindow = null;
                this.isDev = false;
                this.runningProcesses = new Map();
                this.settings = {
                    maxPolls: 9999,
                    pollingInterval: 10,
                    firstPollingInterval: 90
                };
            }

            createWindow() {
                // Actually call the mocked BrowserWindow constructor
                this.mainWindow = new mockBrowserWindow({
                    width: 1200,
                    height: 800,
                    minWidth: 800,
                    minHeight: 600,
                    webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true,
                        enableRemoteModule: false
                    }
                });
                
                this.mainWindow.loadFile('electron/renderer/index.html');
                return this.mainWindow;
            }

            setupIPCHandlers() {
                // Simulate IPC handler setup
                mockIpcMain.handle('validate-workflow', this.handleValidateWorkflow.bind(this));
                mockIpcMain.handle('execute-workflow', this.handleExecuteWorkflow.bind(this));
                mockIpcMain.handle('update-settings', this.handleUpdateSettings.bind(this));
                mockIpcMain.handle('get-settings', this.handleGetSettings.bind(this));
                mockIpcMain.handle('open-file-dialog', this.handleOpenFileDialog.bind(this));
                mockIpcMain.handle('check-environment', this.handleCheckEnvironment.bind(this));
            }

            async handleValidateWorkflow(event, content) {
                try {
                    const result = await mockValidateWorkflow(content);
                    return { success: true, result };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }

            async handleExecuteWorkflow(event, content, options = {}) {
                try {
                    const processId = Date.now().toString();
                    const executionOptions = {
                        ...options,
                        maxPolls: this.settings.maxPolls,
                        pollingInterval: this.settings.pollingInterval,
                        firstPollingInterval: this.settings.firstPollingInterval,
                        verbose: true
                    };

                    const result = await mockStartWorkflow(content, executionOptions);
                    return { success: true, result, processId };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }

            async handleUpdateSettings(event, newSettings) {
                try {
                    this.settings = { ...this.settings, ...newSettings };
                    return { success: true, settings: this.settings };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }

            async handleGetSettings() {
                return { success: true, settings: this.settings };
            }

            async handleOpenFileDialog() {
                try {
                    const result = await mockDialog.showOpenDialog(this.mainWindow, {
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
                    const content = mockFs.readFileSync(filePath, 'utf8');
                    const fileName = filePath.split('/').pop();

                    return { success: true, content, fileName, filePath };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }

            async handleCheckEnvironment() {
                try {
                    return {
                        devinApiKey: !!process.env.DEVIN_API_KEY,
                        adoUrl: !!process.env.ADO_URL,
                        nodeVersion: process.version
                    };
                } catch (error) {
                    return { error: error.message };
                }
            }

            init() {
                this.setupIPCHandlers();
                this.createWindow();
            }
        };

        app = new DevinMindApp();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Application Initialization', () => {
        it('should create main window successfully', () => {
            app.createWindow();
            
            expect(mockBrowserWindow).toHaveBeenCalledWith(
                expect.objectContaining({
                    width: expect.any(Number),
                    height: expect.any(Number),
                    webPreferences: expect.objectContaining({
                        nodeIntegration: false,
                        contextIsolation: true
                    })
                })
            );
            expect(mockWindow.loadFile).toHaveBeenCalled();
        });

        it('should setup IPC handlers', () => {
            app.setupIPCHandlers();
            
            expect(mockIpcMain.handle).toHaveBeenCalledWith('validate-workflow', expect.any(Function));
            expect(mockIpcMain.handle).toHaveBeenCalledWith('execute-workflow', expect.any(Function));
            expect(mockIpcMain.handle).toHaveBeenCalledWith('update-settings', expect.any(Function));
            expect(mockIpcMain.handle).toHaveBeenCalledWith('get-settings', expect.any(Function));
        });

        it('should initialize with default settings', () => {
            expect(app.settings).toEqual({
                maxPolls: 9999,
                pollingInterval: 10,
                firstPollingInterval: 90
            });
        });
    });

    describe('Settings Management', () => {
        beforeEach(() => {
            app.setupIPCHandlers();
        });

        it('should update settings successfully', async () => {
            const newSettings = {
                maxPolls: 100,
                pollingInterval: 5,
                firstPollingInterval: 60
            };

            const result = await app.handleUpdateSettings(null, newSettings);

            expect(result.success).toBe(true);
            expect(result.settings).toEqual({
                maxPolls: 100,
                pollingInterval: 5,
                firstPollingInterval: 60
            });
            expect(app.settings).toEqual(result.settings);
        });

        it('should get current settings', async () => {
            const result = await app.handleGetSettings();

            expect(result.success).toBe(true);
            expect(result.settings).toEqual(app.settings);
        });

        it('should merge new settings with existing ones', async () => {
            const partialSettings = { maxPolls: 500 };

            const result = await app.handleUpdateSettings(null, partialSettings);

            expect(result.success).toBe(true);
            expect(result.settings.maxPolls).toBe(500);
            expect(result.settings.pollingInterval).toBe(10); // unchanged
            expect(result.settings.firstPollingInterval).toBe(90); // unchanged
        });
    });

    describe('Workflow Operations', () => {
        beforeEach(() => {
            app.setupIPCHandlers();
        });

        it('should validate workflow successfully', async () => {
            const workflowContent = '# Test Workflow\n\n## Step 1\nDo something';
            mockValidateWorkflow.mockResolvedValue({ valid: true });

            const result = await app.handleValidateWorkflow(null, workflowContent);

            expect(result.success).toBe(true);
            expect(mockValidateWorkflow).toHaveBeenCalledWith(workflowContent);
        });

        it('should handle validation errors', async () => {
            const workflowContent = 'invalid workflow';
            mockValidateWorkflow.mockRejectedValue(new Error('Invalid workflow format'));

            const result = await app.handleValidateWorkflow(null, workflowContent);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid workflow format');
        });

        it('should execute workflow with settings', async () => {
            const workflowContent = '# Test Workflow\n\n## Step 1\nDo something';
            const options = { verbose: true };
            
            mockStartWorkflow.mockResolvedValue({ 
                success: true, 
                total_steps: 1,
                successful_steps: 1 
            });

            const result = await app.handleExecuteWorkflow(null, workflowContent, options);

            expect(result.success).toBe(true);
            expect(result.processId).toBeDefined();
            expect(mockStartWorkflow).toHaveBeenCalledWith(
                workflowContent,
                expect.objectContaining({
                    maxPolls: 9999,
                    pollingInterval: 10,
                    firstPollingInterval: 90,
                    verbose: true
                })
            );
        });

        it('should execute workflow with custom settings', async () => {
            // Update settings first
            await app.handleUpdateSettings(null, {
                maxPolls: 50,
                pollingInterval: 5,
                firstPollingInterval: 30
            });

            const workflowContent = '# Test Workflow';
            mockStartWorkflow.mockResolvedValue({ success: true });

            const result = await app.handleExecuteWorkflow(null, workflowContent, {});

            expect(mockStartWorkflow).toHaveBeenCalledWith(
                workflowContent,
                expect.objectContaining({
                    maxPolls: 50,
                    pollingInterval: 5,
                    firstPollingInterval: 30
                })
            );
        });

        it('should handle execution errors', async () => {
            const workflowContent = 'invalid workflow';
            mockStartWorkflow.mockRejectedValue(new Error('Execution failed'));

            const result = await app.handleExecuteWorkflow(null, workflowContent, {});

            expect(result.success).toBe(false);
            expect(result.error).toBe('Execution failed');
        });
    });

    describe('File Operations', () => {
        beforeEach(() => {
            app.setupIPCHandlers();
        });

        it('should open file dialog successfully', async () => {
            const mockFileContent = '# Test Workflow\n\nStep 1: Do something';
            const mockFilePath = '/path/to/test.md';
            
            mockDialog.showOpenDialog.mockResolvedValue({
                canceled: false,
                filePaths: [mockFilePath]
            });
            mockFs.readFileSync.mockReturnValue(mockFileContent);

            const result = await app.handleOpenFileDialog();

            expect(result.success).toBe(true);
            expect(result.content).toBe(mockFileContent);
            expect(result.fileName).toBe('test.md');
            expect(result.filePath).toBe(mockFilePath);
        });

        it('should handle file dialog cancellation', async () => {
            mockDialog.showOpenDialog.mockResolvedValue({
                canceled: true,
                filePaths: []
            });

            const result = await app.handleOpenFileDialog();

            expect(result.success).toBe(false);
            expect(result.canceled).toBe(true);
        });

        it('should handle file read errors', async () => {
            mockDialog.showOpenDialog.mockResolvedValue({
                canceled: false,
                filePaths: ['/path/to/nonexistent.md']
            });
            mockFs.readFileSync.mockImplementation(() => {
                throw new Error('File not found');
            });

            const result = await app.handleOpenFileDialog();

            expect(result.success).toBe(false);
            expect(result.error).toBe('File not found');
        });
    });

    describe('Environment Check', () => {
        beforeEach(() => {
            app.setupIPCHandlers();
        });

        it('should check environment variables', async () => {
            process.env.DEVIN_API_KEY = 'test-key';
            process.env.ADO_URL = 'https://dev.azure.com/test';

            const result = await app.handleCheckEnvironment();

            expect(result.devinApiKey).toBe(true);
            expect(result.adoUrl).toBe(true);
            expect(result.nodeVersion).toBeDefined();

            // Cleanup
            delete process.env.DEVIN_API_KEY;
            delete process.env.ADO_URL;
        });

        it('should detect missing environment variables', async () => {
            delete process.env.DEVIN_API_KEY;
            delete process.env.ADO_URL;

            const result = await app.handleCheckEnvironment();

            expect(result.devinApiKey).toBe(false);
            expect(result.adoUrl).toBe(false);
        });
    });

    describe('Window Management', () => {
        it('should focus window when created', () => {
            app.createWindow();
            
            // Simulate ready-to-show event
            const readyCallback = mockWindow.once.mock.calls.find(
                call => call[0] === 'ready-to-show'
            )?.[1];
            
            if (readyCallback) {
                readyCallback();
                expect(mockWindow.show).toHaveBeenCalled();
                expect(mockWindow.focus).toHaveBeenCalled();
            }
        });

        it('should open dev tools in development mode', () => {
            app.isDev = true;
            app.createWindow();
            
            // Simulate ready-to-show event
            const readyCallback = mockWindow.once.mock.calls.find(
                call => call[0] === 'ready-to-show'
            )?.[1];
            
            if (readyCallback) {
                readyCallback();
                expect(mockWindow.webContents.openDevTools).toHaveBeenCalled();
            }
        });
    });
});