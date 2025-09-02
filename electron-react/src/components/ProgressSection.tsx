import React, { useEffect, useRef, useState } from 'react'
import { ProgressLog } from '../types'

interface ProgressSectionProps {
  tabId: string
  progressLogs: ProgressLog[]
  isCollapsed: boolean
  onToggle: () => void
  onClearLog: () => void
}

const ProgressSection: React.FC<ProgressSectionProps> = ({
  tabId: _tabId,
  progressLogs,
  isCollapsed,
  onToggle,
  onClearLog
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(isCollapsed)

  useEffect(() => {
    // Auto-scroll to bottom when new logs are added
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [progressLogs])

  return (
    <div className={`progress-section ${collapsed ? 'collapsed' : ''}`}>
      <div className="section-header" onClick={() => setCollapsed(!collapsed)}>
        <h3>Progress Log</h3>
        <div className="section-actions">
          <button className="btn btn-small" onClick={onClearLog}>
            Clear
          </button>
          <button className="btn btn-small" onClick={onToggle}>
            {collapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>
      <div className={`section-content ${collapsed ? 'collapsed' : ''}`} ref={logContainerRef}>
        <div className="progress-log">
          {progressLogs.length === 0 ? (
            <p className="no-logs">No progress logs yet</p>
          ) : (
            progressLogs.map((log) => (
              <div key={log.id} className={`log-entry ${log.type}`}>
                <span className="log-timestamp">{log.timestamp}</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default ProgressSection