import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { TabData } from '../types'

interface TabsState {
  tabs: Record<string, TabData>
  activeTabId: string
  tabCounter: number
}

const initialState: TabsState = {
  tabs: {},
  activeTabId: 'tab-1',
  tabCounter: 1
}

const tabsSlice = createSlice({
  name: 'tabs',
  initialState,
  reducers: {
    initializeTab: (state, action: PayloadAction<string>) => {
      const tabId = action.payload
      state.tabs[tabId] = {
        workflowContent: '',
        fileName: 'No file loaded',
        isExecuting: false,
        executionProcess: null,
        validationStatus: 'unknown',
        results: [],
        progressLogs: [],
        isProgressLogVisible: false,
        isResultsCollapsed: false,
        isProgressCollapsed: false,
        isLoading: false,
        loadingText: 'Loading...'
      }
    },
    
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTabId = action.payload
    },
    
    updateTabContent: (state, action: PayloadAction<{ tabId: string; content: string }>) => {
      const { tabId, content } = action.payload
      if (state.tabs[tabId]) {
        state.tabs[tabId].workflowContent = content
      }
    },
    
    loadWorkflowFile: (state, action: PayloadAction<{ tabId: string; content: string; fileName: string }>) => {
      const { tabId, content, fileName } = action.payload
      if (state.tabs[tabId]) {
        state.tabs[tabId].workflowContent = content
        state.tabs[tabId].fileName = fileName
        state.tabs[tabId].isLoading = false
      }
    },
    
    setLoading: (state, action: PayloadAction<{ tabId: string; isLoading: boolean; message?: string }>) => {
      const { tabId, isLoading, message } = action.payload
      if (state.tabs[tabId]) {
        state.tabs[tabId].isLoading = isLoading
        if (message) {
          state.tabs[tabId].loadingText = message
        }
      }
    },
    
    setExecutionState: (state, action: PayloadAction<{ tabId: string; isExecuting: boolean }>) => {
      const { tabId, isExecuting } = action.payload
      if (state.tabs[tabId]) {
        state.tabs[tabId].isExecuting = isExecuting
      }
    },
    
    updateValidationStatus: (state, action: PayloadAction<{ tabId: string; isValid: boolean }>) => {
      const { tabId, isValid } = action.payload
      if (state.tabs[tabId]) {
        state.tabs[tabId].validationStatus = isValid ? 'valid' : 'invalid'
      }
    },
    
    addResult: (state, action: PayloadAction<{ tabId: string; result: any }>) => {
      const { tabId, result } = action.payload
      if (state.tabs[tabId]) {
        state.tabs[tabId].results.push(result)
      }
    },
    
    addProgressLog: (state, action: PayloadAction<{ tabId: string; log: any }>) => {
      const { tabId, log } = action.payload
      if (state.tabs[tabId]) {
        state.tabs[tabId].progressLogs.push(log)
      }
    },
    
    clearResults: (state, action: PayloadAction<string>) => {
      const tabId = action.payload
      if (state.tabs[tabId]) {
        state.tabs[tabId].results = []
      }
    },
    
    clearProgressLog: (state, action: PayloadAction<string>) => {
      const tabId = action.payload
      if (state.tabs[tabId]) {
        state.tabs[tabId].progressLogs = []
      }
    },
    
    addNewTab: (state) => {
      state.tabCounter += 1
      const newTabId = `tab-${state.tabCounter}`
      state.tabs[newTabId] = {
        workflowContent: '',
        fileName: 'No file loaded',
        isExecuting: false,
        executionProcess: null,
        validationStatus: 'unknown',
        results: [],
        progressLogs: [],
        isProgressLogVisible: false,
        isResultsCollapsed: false,
        isProgressCollapsed: false,
        isLoading: false,
        loadingText: 'Loading...'
      }
      state.activeTabId = newTabId
    },
    
    closeTab: (state, action: PayloadAction<string>) => {
      const tabId = action.payload
      if (Object.keys(state.tabs).length > 1) {
        delete state.tabs[tabId]
        if (state.activeTabId === tabId) {
          state.activeTabId = Object.keys(state.tabs)[0]
        }
      }
    }
  }
})

export const {
  initializeTab,
  setActiveTab,
  updateTabContent,
  loadWorkflowFile,
  setLoading,
  setExecutionState,
  updateValidationStatus,
  addResult,
  addProgressLog,
  clearResults,
  clearProgressLog,
  addNewTab,
  closeTab
} = tabsSlice.actions

export default tabsSlice.reducer