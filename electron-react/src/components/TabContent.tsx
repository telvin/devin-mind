import React from 'react'
import { TabData } from '../types'
import LoadingOverlay from './LoadingOverlay'
import ResultsSection from './ResultsSection'
import ProgressSection from './ProgressSection'
import WorkflowEditor from './WorkflowEditor'

interface TabContentProps {
  tabId: string
  tabData: TabData
  onContentChange: (tabId: string, content: string) => void
  onExecute: () => void
  onValidate: () => void
  onClearResults: () => void
  onLoadFile: () => void
}

const TabContent: React.FC<TabContentProps> = ({
  tabId,
  tabData,
  onContentChange,
  onExecute,
  onValidate,
  onClearResults,
  onLoadFile,
}) => {
  // Ensure tabData exists and has required properties
  if (!tabData) {
    return <div>Loading tab...</div>
  }

  // Add debugging to see what content TabContent is receiving
  console.log(`TabContent ${tabId} - tabData.workflowContent:`, tabData.workflowContent)
  console.log(`TabContent ${tabId} - content length:`, tabData.workflowContent?.length || 0)

  const getValidationClass = () => {
    switch (tabData.validationStatus) {
      case 'valid': return 'validation-success'
      case 'invalid': return 'validation-error'
      default: return ''
    }
  }

  return (
    <div className="tab-content">
      <LoadingOverlay 
        isVisible={tabData.isLoading || false} 
        message={tabData.loadingText || 'Loading...'} 
      />
      
      {/* Tab Header with Action Buttons - matching electron app */}
      <div className="tab-header">
        <div className="tab-actions">
          <button 
            className="btn btn-primary" 
            onClick={() => {
              console.log('Load button clicked!', { tabId, onLoadFile })
              onLoadFile()
            }}
            disabled={tabData.isLoading || tabData.isExecuting}
          >
            Load
          </button>
          <button
            className={`btn btn-warning ${getValidationClass()}`}
            onClick={onValidate}
            disabled={tabData.isLoading || tabData.isExecuting || !tabData.workflowContent?.trim()}
          >
            Validate
          </button>
          {tabData.isExecuting ? (
            <button className="btn btn-danger">
              Stop
            </button>
          ) : (
            <button
              className="btn btn-success"
              onClick={onExecute}
              disabled={tabData.isLoading || !tabData.workflowContent?.trim()}
            >
              Execute
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClearResults}>
            Clear
          </button>
        </div>
      </div>

      {/* Tab Status Bar - matching electron app */}
      <div className="tab-status-bar">
        <div className="status-indicators">
          <div className={`status-indicator ${getValidationClass()}`}>
            VALIDATION
          </div>
        </div>
        <div className="file-name">{tabData.fileName || 'No file loaded'}</div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Workflow Editor */}
        <WorkflowEditor
          tabId={tabId}
          content={tabData.workflowContent || ''}
          onContentChange={(content) => onContentChange(tabId, content)}
        />

        {/* Progress Section */}
        <ProgressSection
          tabId={tabId}
          progressLogs={tabData.progressLogs || []}
          isCollapsed={tabData.isProgressCollapsed || false}
          onToggle={() => {}}
          onClearLog={() => {}}
        />

        {/* Results Section */}
        <ResultsSection
          tabId={tabId}
          results={tabData.results || []}
          isCollapsed={tabData.isResultsCollapsed || false}
          onToggle={() => {}}
        />
      </div>
    </div>
  )
}

export default TabContent