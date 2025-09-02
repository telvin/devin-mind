"use strict";
const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
class DevinMindApp {
  constructor() {
    this.mainWindow = null;
    this.isDev = process.env.IS_DEV === "true";
    this.runningProcesses = /* @__PURE__ */ new Map();
  }
  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, "preload.js")
      },
      titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
      show: false
    });
    if (this.isDev) {
      this.mainWindow.loadURL("http://localhost:5173");
    } else {
      this.mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    }
    this.mainWindow.once("ready-to-show", () => {
      this.mainWindow.show();
      if (this.isDev) {
        this.mainWindow.webContents.openDevTools();
      }
    });
    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });
    this.createMenu();
  }
  createMenu() {
    const template = [
      {
        label: "File",
        submenu: [
          {
            label: "Open Workflow",
            accelerator: "CmdOrCtrl+O",
            click: () => this.openWorkflowFile()
          },
          {
            label: "Save Results",
            accelerator: "CmdOrCtrl+S",
            click: () => this.saveResults()
          },
          { type: "separator" },
          {
            label: "Exit",
            accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
            click: () => app.quit()
          }
        ]
      },
      {
        label: "Workflow",
        submenu: [
          {
            label: "Validate Current",
            accelerator: "CmdOrCtrl+Shift+V",
            click: () => this.validateCurrentWorkflow()
          },
          {
            label: "Execute Workflow",
            accelerator: "CmdOrCtrl+R",
            click: () => this.executeCurrentWorkflow()
          },
          { type: "separator" },
          {
            label: "Clear Results",
            click: () => this.clearResults()
          }
        ]
      },
      {
        label: "View",
        submenu: [
          { role: "reload" },
          { role: "forceReload" },
          { role: "toggleDevTools" },
          { type: "separator" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { type: "separator" },
          { role: "togglefullscreen" }
        ]
      }
    ];
    if (process.platform === "darwin") {
      template.unshift({
        label: app.getName(),
        submenu: [
          { role: "about" },
          { type: "separator" },
          { role: "services" },
          { type: "separator" },
          { role: "hide" },
          { role: "hideOthers" },
          { role: "unhide" },
          { type: "separator" },
          { role: "quit" }
        ]
      });
    }
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
  async openWorkflowFile() {
    const result = await dialog.showOpenDialog(this.mainWindow, {
      properties: ["openFile"],
      filters: [
        { name: "Markdown Files", extensions: ["md"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const content = fs.readFileSync(filePath, "utf8");
      const fileName = path.basename(filePath);
      this.mainWindow.webContents.send("workflow-loaded", {
        content,
        fileName,
        filePath
      });
    }
  }
  async saveResults() {
    const result = await dialog.showSaveDialog(this.mainWindow, {
      filters: [
        { name: "HTML Files", extensions: ["html"] },
        { name: "Text Files", extensions: ["txt"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    if (!result.canceled) {
      this.mainWindow.webContents.send("save-results-request", result.filePath);
    }
  }
  validateCurrentWorkflow() {
    this.mainWindow.webContents.send("validate-workflow-request");
  }
  executeCurrentWorkflow() {
    this.mainWindow.webContents.send("execute-workflow-request");
  }
  clearResults() {
    this.mainWindow.webContents.send("clear-results-request");
  }
  setupIPCHandlers() {
    ipcMain.handle("open-file-dialog", async () => {
      try {
        const result = await dialog.showOpenDialog(this.mainWindow, {
          properties: ["openFile"],
          filters: [
            { name: "Markdown Files", extensions: ["md"] },
            { name: "All Files", extensions: ["*"] }
          ]
        });
        if (result.canceled) {
          return { success: false, canceled: true };
        }
        const filePath = result.filePaths[0];
        const content = fs.readFileSync(filePath, "utf8");
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
    ipcMain.handle("validate-workflow", async (event, content) => {
      try {
        if (!content || content.trim().length === 0) {
          throw new Error("Workflow content is empty");
        }
        if (!content.includes("#") && !content.includes("Task:")) {
          throw new Error("Workflow must contain tasks or headers");
        }
        return { success: true, result: { valid: true, message: "Workflow is valid" } };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    ipcMain.handle("execute-workflow", async (event, content, options = {}) => {
      try {
        const processId = Date.now().toString();
        let progress = 0;
        const interval = setInterval(() => {
          var _a, _b, _c, _d;
          progress += 10;
          (_a = this.mainWindow) == null ? void 0 : _a.webContents.send("workflow-progress", {
            percentage: progress,
            message: `Processing step ${progress}%`
          });
          (_b = this.mainWindow) == null ? void 0 : _b.webContents.send("workflow-output", {
            type: "info",
            message: `Workflow progress: ${progress}%`
          });
          if (progress >= 100) {
            clearInterval(interval);
            (_c = this.mainWindow) == null ? void 0 : _c.webContents.send("workflow-output", {
              type: "success",
              message: "Workflow completed successfully"
            });
            (_d = this.mainWindow) == null ? void 0 : _d.webContents.send("workflow-complete", {
              success: true,
              result: "Mock workflow execution completed"
            });
            this.runningProcesses.delete(processId);
          }
        }, 500);
        this.runningProcesses.set(processId, { interval });
        return { success: true, processId };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    ipcMain.handle("stop-workflow-execution", async (event, processId) => {
      try {
        const process2 = this.runningProcesses.get(processId);
        if (process2 && process2.interval) {
          clearInterval(process2.interval);
          this.runningProcesses.delete(processId);
        }
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    ipcMain.handle("save-results", async (event, results) => {
      try {
        const result = await dialog.showSaveDialog(this.mainWindow, {
          filters: [
            { name: "HTML Files", extensions: ["html"] },
            { name: "Text Files", extensions: ["txt"] }
          ]
        });
        if (!result.canceled) {
          fs.writeFileSync(result.filePath, results, "utf8");
          return { success: true };
        }
        return { success: false, canceled: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    ipcMain.handle("check-environment", async () => {
      try {
        return {
          success: true,
          devinApiKey: !!process.env.DEVIN_API_KEY,
          repoUrl: !!process.env.REPO_URL
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
  }
  init() {
    this.setupIPCHandlers();
    app.whenReady().then(() => {
      this.createWindow();
      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        }
      });
    });
    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        app.quit();
      }
    });
  }
}
const devinMindApp = new DevinMindApp();
devinMindApp.init();