export interface TabData {
  workflowContent: string
  fileName: string
  isExecuting: boolean
  executionProcess: string | null
  validationStatus: 'unknown' | 'valid' | 'invalid'
  results: ResultItem[]
  progressLogs: ProgressLog[]
  isProgressLogVisible: boolean
  isResultsCollapsed: boolean
  isProgressCollapsed: boolean
  isLoading: boolean
  loadingText: string
}

export interface ResultItem {
  id: string
  type: string
  title: string
  content: string
  timestamp: string
}

export interface ProgressLog {
  id: string
  type: string
  message: string
  timestamp: string
}

export interface EnvironmentStatus {
  devinApiKey: boolean
  adoUrl: boolean
}