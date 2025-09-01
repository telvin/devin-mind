import React from 'react'

interface Tab {
  id: string
  label: string
}

interface TabContainerProps {
  tabs: Tab[]
  activeTabId: string
  onSwitchTab: (tabId: string) => void
  onAddTab: () => void
  onCloseTab: (tabId: string) => void
}

const TabContainer: React.FC<TabContainerProps> = ({
  tabs,
  activeTabId,
  onSwitchTab,
  onAddTab,
  onCloseTab,
}) => {
  return (
    <div className="tab-container">
      <div className="tab-bar">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => onSwitchTab(tab.id)}
          >
            <span className="tab-label">{tab.label}</span>
            {tabs.length > 1 && (
              <button
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation()
                  onCloseTab(tab.id)
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button className="tab-add" onClick={onAddTab}>
          +
        </button>
      </div>
    </div>
  )
}

export default TabContainer