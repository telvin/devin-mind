const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

// Keep a global reference of the window object
let mainWindow

// Import the validation function dynamically since it's an ES module
let validateWorkflowFunction = null
let startWorkflowFunction = null

async function loadValidationFunction() {
  try {
    const workflowExecutor = await import('../src/workflow-executor.js')
    validateWorkflowFunction = workflowExecutor.validateWorkflow
    startWorkflowFunction = workflowExecutor.startWorkflow
    console.log('Successfully loaded workflow functions')
  } catch (error) {
    console.error('Failed to load workflow functions:', error)
  }
}

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

console.log('=== Electron Main Debug ===')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('app.isPackaged:', app.isPackaged)
console.log('isDev:', isDev)
console.log('========================')

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'electron-preload.js'),
      // Disable caching in development
      webSecurity: isDev ? false : true,
      // Clear cache on startup in development
      cache: isDev ? false : true
    }
  })

  console.log('Creating window, isDev:', isDev)
  
  // Load the app
  if (isDev) {
    console.log('Loading from Vite dev server: http://localhost:5173')
    // Development: load from Vite dev server
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
    
    // Clear cache and reload when in development
    mainWindow.webContents.session.clearCache()
    mainWindow.webContents.session.clearStorageData()
  } else {
    console.log('Loading from built files (production mode)')
    // Production: load from built files
    // When running from dist-electron/, the dist folder is at the same level
    const htmlPath = path.join(__dirname, '../dist/index.html')
    console.log('Loading HTML from:', htmlPath)
    console.log('File exists:', fs.existsSync(htmlPath))
    mainWindow.loadFile(htmlPath)
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  await loadValidationFunction()
  createWindow()
})

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// IPC handlers for file operations
ipcMain.handle('open-file-dialog', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Markdown Files', extensions: ['md'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0]
      const content = fs.readFileSync(filePath, 'utf8')
      return {
        success: true,
        content: content,
        fileName: path.basename(filePath)
      }
    } else {
      return { success: false, canceled: true }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Replace the mock validation handler with proper validation
ipcMain.handle('validate-workflow', async (event, content) => {
  try {
    console.log('Validating workflow content:', content.substring(0, 100) + '...')
    
    // Check if validation function is loaded
    if (!validateWorkflowFunction) {
      throw new Error('Validation function not available')
    }
    
    // Use the actual validation function from workflow-executor
    const result = validateWorkflowFunction(content)
    
    console.log('Validation result:', result)
    
    if (result.valid) {
      return { 
        success: true, 
        result: result,
        message: 'Workflow is valid'
      }
    } else {
      return { 
        success: false, 
        error: result.errors.join('\n'),
        warnings: result.warnings,
        result: result
      }
    }
  } catch (error) {
    console.error('Validation error:', error)
    return { 
      success: false, 
      error: `Validation failed: ${error.message}`
    }
  }
})

// Replace the mock execution handler with real workflow execution
ipcMain.handle('execute-workflow', async (event, content, options = {}) => {
  try {
    const processId = Date.now().toString()
    console.log('Starting workflow execution with processId:', processId)
    
    // Check if execution function is loaded
    if (!startWorkflowFunction) {
      throw new Error('Execution function not available')
    }
    
    // Create a custom logger that sends output to the renderer
    const logger = {
      log: (message) => {
        mainWindow?.webContents.send('workflow-output', {
          type: 'info',
          message: message,
          processId: processId
        })
      },
      error: (message) => {
        mainWindow?.webContents.send('workflow-output', {
          type: 'error',
          message: message,
          processId: processId
        })
      },
      warn: (message) => {
        mainWindow?.webContents.send('workflow-output', {
          type: 'warning',
          message: message,
          processId: processId
        })
      },
      success: (message) => {
        mainWindow?.webContents.send('workflow-output', {
          type: 'success',
          message: message,
          processId: processId
        })
      }
    }

    // Override console methods to capture all output
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn
    }

    console.log = (...args) => {
      const message = args.join(' ')
      logger.log(message)
      originalConsole.log(...args)
    }

    console.error = (...args) => {
      const message = args.join(' ')
      logger.error(message)
      originalConsole.error(...args)
    }

    console.warn = (...args) => {
      const message = args.join(' ')
      logger.warn(message)
      originalConsole.warn(...args)
    }

    // Send progress updates
    mainWindow?.webContents.send('workflow-progress', {
      processId: processId,
      status: 'starting',
      message: 'Initializing workflow execution...'
    })

    try {
      // Use the actual workflow execution function
      const result = await startWorkflowFunction(content, {
        ...options,
        verbose: true,
        logger: logger
      })

      // Send completion notification
      mainWindow?.webContents.send('workflow-complete', {
        processId: processId,
        success: true,
        result: result
      })

      return { 
        success: true, 
        processId: processId,
        result: result
      }
    } catch (error) {
      console.error('Workflow execution failed:', error)
      
      // Send error notification
      mainWindow?.webContents.send('workflow-complete', {
        processId: processId,
        success: false,
        error: error.message
      })

      return { 
        success: false, 
        processId: processId,
        error: error.message 
      }
    } finally {
      // Restore original console methods
      console.log = originalConsole.log
      console.error = originalConsole.error
      console.warn = originalConsole.warn
    }
  } catch (error) {
    console.error('Execute workflow error:', error)
    return { 
      success: false, 
      error: `Execution failed: ${error.message}`
    }
  }
})

// Add handler for stopping workflow execution
ipcMain.handle('stop-workflow-execution', async (event, processId) => {
  try {
    console.log('Stopping workflow execution for processId:', processId)
    
    // Send stop signal to the renderer
    mainWindow?.webContents.send('workflow-progress', {
      processId: processId,
      status: 'stopping',
      message: 'Stopping workflow execution...'
    })
    
    // Note: In a real implementation, you would track running processes
    // and terminate them here. For now, we'll just send a stop notification.
    
    // Send completion notification with stopped status
    mainWindow?.webContents.send('workflow-complete', {
      processId: processId,
      success: false,
      stopped: true,
      message: 'Workflow execution was stopped by user'
    })
    
    return { 
      success: true, 
      processId: processId,
      message: 'Workflow execution stopped'
    }
  } catch (error) {
    console.error('Stop workflow error:', error)
    return { 
      success: false, 
      error: `Failed to stop workflow: ${error.message}`
    }
  }
})

ipcMain.handle('save-results', async (event, htmlContent) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [
        { name: 'HTML Files', extensions: ['html'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, htmlContent)
      return { success: true }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Event handlers for menu actions
ipcMain.on('workflow-loaded', (event, data) => {
  mainWindow.webContents.send('workflow-loaded', data)
})

ipcMain.on('save-results-request', () => {
  mainWindow.webContents.send('save-results-request')
})

ipcMain.on('validate-workflow-request', () => {
  mainWindow.webContents.send('validate-workflow-request')
})

ipcMain.on('execute-workflow-request', () => {
  mainWindow.webContents.send('execute-workflow-request')
})

ipcMain.on('clear-results-request', () => {
  mainWindow.webContents.send('clear-results-request')
})