import React from 'react'
import { EnvironmentStatus } from '../types'

interface HeaderProps {
  envStatus: EnvironmentStatus
}

const Header: React.FC<HeaderProps> = ({ envStatus }) => {
  return (
    <header className="app-header">
      <div className="header-left">
        <h1>Devin Workflow Manager</h1>
      </div>
      <div className="header-right">
        <div className="env-status">
          <span className={`status-indicator ${envStatus.devinApiKey ? 'connected' : 'disconnected'}`}>
            Devin API: {envStatus.devinApiKey ? 'Connected' : 'Disconnected'}
          </span>
          <span className={`status-indicator ${envStatus.repoUrl ? 'connected' : 'disconnected'}`}>
            ADO: {envStatus.repoUrl ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </header>
  )
}

export default Header