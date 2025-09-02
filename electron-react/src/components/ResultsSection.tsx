import React, { useEffect, useRef, useState } from 'react'
import { ResultItem } from '../types'

interface ResultsSectionProps {
  tabId: string
  results: ResultItem[]
  isCollapsed: boolean
  onToggle: () => void
}

const ResultsSection: React.FC<ResultsSectionProps> = ({
  results,
  isCollapsed,
  onToggle
}) => {
  const resultsContainerRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(isCollapsed)

  useEffect(() => {
    // Auto-scroll to bottom when new results are added
    if (resultsContainerRef.current) {
      resultsContainerRef.current.scrollTop = resultsContainerRef.current.scrollHeight
    }
  }, [results])

  return (
    <div className={`results-section ${collapsed ? 'collapsed' : ''}`}>
      <div className="section-header" onClick={() => setCollapsed(!collapsed)}>
        <h3>Results ({results.length})</h3>
        <div className="header-controls">
          <button className="btn secondary" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
            Clear
          </button>
          <button className="collapse-btn">
            {collapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>
      <div className={`section-content ${collapsed ? 'collapsed' : ''}`}>
        <div className="results-content" ref={resultsContainerRef}>
          {results.length === 0 ? (
            <div className="result-item">
              <div className="result-title">No results yet</div>
              <div className="result-content">Execute a workflow to see results here...</div>
            </div>
          ) : (
            results.map((result) => (
              <div key={result.id} className="result-item">
                <div className="result-title">{result.title}</div>
                <div className="result-content">{result.content}</div>
                <div className="result-timestamp">{result.timestamp}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default ResultsSection