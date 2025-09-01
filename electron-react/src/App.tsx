import { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from './store/hooks'
import { 
  initializeTab, 
  setActiveTab, 
  updateTabContent,
  loadWorkflowFile as loadWorkflowFileAction,
  setLoading,
  setExecutionState,
  updateValidationStatus,
  addResult,
  addProgressLog,
  clearResults,
  clearProgressLog,
  addNewTab,
  closeTab
} from './store/tabsSlice'
import Header from './components/Header'
import LoadingOverlay from './components/LoadingOverlay'
import TabContainer from './components/TabContainer'
import TabContent from './components/TabContent'
import { EnvironmentStatus } from './types'

declare global {
  interface Window {
    electronAPI: any
  }
}

function App() {
  const dispatch = useAppDispatch()
  const { tabs, activeTabId } = useAppSelector(state => state.tabs)
  
  const [envStatus, setEnvStatus] = useState<EnvironmentStatus>({
    devinApiKey: false,
    adoUrl: false
  })
  const [isGlobalLoading] = useState(false)
  const [globalLoadingMessage] = useState('')

  useEffect(() => {
    // Initialize the first tab
    dispatch(initializeTab('tab-1'))
    
    // Setup IPC event listeners
    setupIPCListeners()
    
    // Check environment on startup
    checkEnvironment()
    
    return () => {
      // Cleanup listeners on unmount
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('workflow-loaded')
        window.electronAPI.removeAllListeners('workflow-output')
        window.electronAPI.removeAllListeners('workflow-progress')
        window.electronAPI.removeAllListeners('workflow-complete')
        window.electronAPI.removeAllListeners('save-results-request')
        window.electronAPI.removeAllListeners('validate-workflow-request')
        window.electronAPI.removeAllListeners('execute-workflow-request')
        window.electronAPI.removeAllListeners('clear-results-request')
      }
    }
  }, [dispatch])

  const setupIPCListeners = () => {
    if (!window.electronAPI) return

    // Listen for workflow loaded from menu
    window.electronAPI.onWorkflowLoaded((_event: any, data: any) => {
      dispatch(loadWorkflowFileAction({
        tabId: activeTabId,
        content: data.content,
        fileName: data.fileName
      }))
      dispatch(addResult({
        tabId: activeTabId,
        result: {
          id: Date.now().toString(),
          type: 'info',
          title: 'File Loaded',
          content: `Loaded: ${data.fileName}`,
          timestamp: new Date().toLocaleTimeString()
        }
      }))
    })

    // Listen for save request from menu
    window.electronAPI.onSaveResultsRequest(() => {
      saveResults(activeTabId)
    })

    // Listen for validation request from menu
    window.electronAPI.onValidateWorkflowRequest(() => {
      validateWorkflow(activeTabId)
    })

    // Listen for execution request from menu
    window.electronAPI.onExecuteWorkflowRequest(() => {
      executeWorkflow(activeTabId)
    })

    // Listen for clear request from menu
    window.electronAPI.onClearResultsRequest(() => {
      dispatch(clearResults(activeTabId))
    })

    // Listen for progress updates
    window.electronAPI.onWorkflowProgress((_event: any, progress: any) => {
      updateProgress(progress, activeTabId)
    })

    // Listen for real-time CLI output
    window.electronAPI.onWorkflowOutput((_event: any, output: any) => {
      dispatch(addProgressLog({
        tabId: activeTabId,
        log: {
          id: Date.now().toString(),
          type: output.type,
          message: output.message,
          timestamp: new Date().toLocaleTimeString()
        }
      }))
    })

    // Listen for execution completion
    window.electronAPI.onWorkflowComplete((_event: any, result: any) => {
      handleExecutionComplete(result, activeTabId)
    })
  }

  const loadWorkflowFile = async (tabId: string) => {
    console.log(`Starting loadWorkflowFile for tab: ${tabId}`)
    try {
      dispatch(setLoading({ tabId, isLoading: true, message: 'Loading file...' }))
      
      if (!window.electronAPI) {
        console.error('electronAPI not available!')
        dispatch(addResult({
          tabId,
          result: {
            id: Date.now().toString(),
            type: 'error',
            title: 'Load Error',
            content: 'Electron API not available',
            timestamp: new Date().toLocaleTimeString()
          }
        }))
        return
      }
      
      console.log('Calling window.electronAPI.openFileDialog()')
      const result = await window.electronAPI.openFileDialog()
      console.log('File dialog result:', result)
      
      if (result.success) {
        console.log('File loaded successfully!')
        console.log('Content length:', result.content?.length || 0)
        console.log('Filename:', result.fileName)
        
        // Dispatch the load action to Redux
        dispatch(loadWorkflowFileAction({
          tabId,
          content: result.content || '',
          fileName: result.fileName || 'Loaded from file'
        }))
        
        dispatch(addResult({
          tabId,
          result: {
            id: Date.now().toString(),
            type: 'success',
            title: 'File Loaded',
            content: `Workflow content loaded successfully: ${result.fileName}`,
            timestamp: new Date().toLocaleTimeString()
          }
        }))
        
        console.log('Redux state updated with file content')
      } else if (!result.canceled) {
        console.log('File dialog failed:', result.error)
        dispatch(addResult({
          tabId,
          result: {
            id: Date.now().toString(),
            type: 'error',
            title: 'Load Error',
            content: result.error || 'Failed to load file',
            timestamp: new Date().toLocaleTimeString()
          }
        }))
      } else {
        console.log('File dialog was canceled')
      }
    } catch (error: any) {
      console.error('Load file error:', error)
      dispatch(addResult({
        tabId,
        result: {
          id: Date.now().toString(),
          type: 'error',
          title: 'Load Error',
          content: error.message,
          timestamp: new Date().toLocaleTimeString()
        }
      }))
    } finally {
      dispatch(setLoading({ tabId, isLoading: false }))
    }
  }

  const validateWorkflow = async (tabId: string) => {
    console.log(`Starting validateWorkflow for tab: ${tabId}`)
    const tabData = tabs[tabId]
    if (!tabData) {
      console.log('No tab data found for validation')
      return
    }
    
    const content = tabData.workflowContent.trim()
    console.log('Validation content:', content.substring(0, 100) + '...')
    console.log('Content length:', content.length)
    
    if (!content) {
      console.log('No content to validate, adding warning result')
      dispatch(addResult({
        tabId,
        result: {
          id: Date.now().toString(),
          type: 'warning',
          title: 'Validation Warning',
          content: 'No workflow content to validate',
          timestamp: new Date().toLocaleTimeString()
        }
      }))
      return
    }

    try {
      console.log('Setting loading state for validation')
      dispatch(setLoading({ tabId, isLoading: true, message: 'Validating workflow...' }))
      
      console.log('Calling window.electronAPI.validateWorkflow')
      if (!window.electronAPI || !window.electronAPI.validateWorkflow) {
        throw new Error('Electron API validateWorkflow not available')
      }
      
      const result = await window.electronAPI.validateWorkflow(content)
      console.log('Validation result:', result)
      
      if (result.success) {
        console.log('Validation successful, adding success result')
        dispatch(addResult({
          tabId,
          result: {
            id: Date.now().toString(),
            type: 'success',
            title: 'Validation Success',
            content: 'Workflow is valid and properly formatted',
            timestamp: new Date().toLocaleTimeString()
          }
        }))
        dispatch(updateValidationStatus({ tabId, isValid: true }))
      } else {
        console.log('Validation failed, adding error result')
        dispatch(addResult({
          tabId,
          result: {
            id: Date.now().toString(),
            type: 'error',
            title: 'Validation Error',
            content: result.error || 'Validation failed',
            timestamp: new Date().toLocaleTimeString()
          }
        }))
        dispatch(updateValidationStatus({ tabId, isValid: false }))
      }
    } catch (error: any) {
      console.error('Validation error:', error)
      dispatch(addResult({
        tabId,
        result: {
          id: Date.now().toString(),
          type: 'error',
          title: 'Validation Error',
          content: error.message,
          timestamp: new Date().toLocaleTimeString()
        }
      }))
      dispatch(updateValidationStatus({ tabId, isValid: false }))
    } finally {
      console.log('Clearing loading state')
      dispatch(setLoading({ tabId, isLoading: false }))
    }
  }

  const executeWorkflow = async (tabId: string) => {
    const tabData = tabs[tabId]
    if (!tabData) return
    
    const content = tabData.workflowContent.trim()
    
    if (!content) {
      dispatch(addResult({
        tabId,
        result: {
          id: Date.now().toString(),
          type: 'warning',
          title: 'Execution Warning',
          content: 'No workflow content to execute',
          timestamp: new Date().toLocaleTimeString()
        }
      }))
      return
    }

    if (tabData.isExecuting) {
      return
    }

    try {
      dispatch(setExecutionState({ isExecuting: true, tabId }))
      dispatch(setLoading({ tabId, isLoading: true, message: 'Executing workflow...' }))
      dispatch(clearProgressLog(activeTabId))
      dispatch(clearResults(activeTabId))
      
      dispatch(addProgressLog({
        tabId: activeTabId,
        log: {
          id: Date.now().toString(),
          type: 'info',
          message: 'Starting workflow execution...',
          timestamp: new Date().toLocaleTimeString()
        }
      }))
      
      await window.electronAPI.executeWorkflow(content, {
        interactive: false,
        verbose: true
      })
      
      dispatch(addProgressLog({
        tabId: activeTabId,
        log: {
          id: Date.now().toString(),
          type: 'info',
          message: 'Workflow execution initiated',
          timestamp: new Date().toLocaleTimeString()
        }
      }))
      
    } catch (error: any) {
      dispatch(addResult({
        tabId,
        result: {
          id: Date.now().toString(),
          type: 'error',
          title: 'Execution Error',
          content: error.message,
          timestamp: new Date().toLocaleTimeString()
        }
      }))
      dispatch(addProgressLog({
        tabId: activeTabId,
        log: {
          id: Date.now().toString(),
          type: 'error',
          message: `Execution failed: ${error.message}`,
          timestamp: new Date().toLocaleTimeString()
        }
      }))
      handleExecutionComplete({ success: false, error: error.message }, tabId)
    }
  }

  const handleExecutionComplete = (result: any, tabId: string) => {
    dispatch(setExecutionState({ isExecuting: false, tabId }))
    dispatch(setLoading({ tabId, isLoading: false }))

    if (result.success) {
      dispatch(addResult({
        tabId,
        result: {
          id: Date.now().toString(),
          type: 'success',
          title: 'Execution Complete',
          content: JSON.stringify(result.result, null, 2),
          timestamp: new Date().toLocaleTimeString()
        }
      }))
      dispatch(addProgressLog({
        tabId: activeTabId,
        log: {
          id: Date.now().toString(),
          type: 'success',
          message: 'Workflow execution completed successfully',
          timestamp: new Date().toLocaleTimeString()
        }
      }))
    } else if (result.stopped) {
      dispatch(addResult({
        tabId,
        result: {
          id: Date.now().toString(),
          type: 'warning',
          title: 'Execution Stopped',
          content: 'Workflow execution was stopped by user',
          timestamp: new Date().toLocaleTimeString()
        }
      }))
    } else {
      dispatch(addResult({
        tabId,
        result: {
          id: Date.now().toString(),
          type: 'error',
          title: 'Execution Error',
          content: result.error,
          timestamp: new Date().toLocaleTimeString()
        }
      }))
      dispatch(addProgressLog({
        tabId: activeTabId,
        log: {
          id: Date.now().toString(),
          type: 'error',
          message: `Execution failed: ${result.error}`,
          timestamp: new Date().toLocaleTimeString()
        }
      }))
    }
  }

  const saveResults = async (tabId: string) => {
    const tabData = tabs[tabId]
    if (window.electronAPI && window.electronAPI.saveResults && tabData) {
      const resultsHTML = tabData.results.map(result => 
        `<div class="result-item ${result.type}">
          <div class="result-header">
            <span>${result.title}</span>
            <span class="result-timestamp">${result.timestamp}</span>
          </div>
          <div class="result-content">${result.content}</div>
        </div>`
      ).join('')
      
      window.electronAPI.saveResults(resultsHTML)
    }
  }

  const checkEnvironment = async () => {
    try {
      const env = await window.electronAPI.checkEnvironment()
      setEnvStatus({
        devinApiKey: env.devinApiKey,
        adoUrl: env.adoUrl
      })
    } catch (error) {
      setEnvStatus({
        devinApiKey: false,
        adoUrl: false
      })
    }
  }

  const updateProgress = (progress: any, tabId: string) => {
    if (progress.message) {
      dispatch(addProgressLog({
        tabId,
        log: {
          id: Date.now().toString(),
          type: 'info',
          message: progress.message,
          timestamp: new Date().toLocaleTimeString()
        }
      }))
    }
  }

  const tabsArray = Object.keys(tabs).map(id => ({
    id,
    label: `Session ${id.split('-')[1]}`
  }))

  // Get current tab data and add debugging
  const currentTabData = tabs[activeTabId]
  console.log(`App render - activeTabId: ${activeTabId}`)
  console.log(`App render - currentTabData:`, currentTabData)
  console.log(`App render - currentTabData.workflowContent length:`, currentTabData?.workflowContent?.length || 0)

  return (
    <div className="container">
      <Header envStatus={envStatus} />
      <LoadingOverlay 
        isVisible={isGlobalLoading} 
        message={globalLoadingMessage} 
      />
      <div className="main-content">
        <TabContainer
          tabs={tabsArray}
          activeTabId={activeTabId}
          onSwitchTab={tabId => dispatch(setActiveTab(tabId))}
          onAddTab={() => dispatch(addNewTab())}
          onCloseTab={tabId => dispatch(closeTab(tabId))}
        />
        {currentTabData && (
          <TabContent
            tabData={currentTabData}
            tabId={activeTabId}
            onContentChange={content => dispatch(updateTabContent({ tabId: activeTabId, content }))}
            onExecute={() => executeWorkflow(activeTabId)}
            onValidate={() => validateWorkflow(activeTabId)}
            onClearResults={() => dispatch(clearResults(activeTabId))}
            onLoadFile={() => loadWorkflowFile(activeTabId)}
          />
        )}
      </div>
    </div>
  )
}

export default App