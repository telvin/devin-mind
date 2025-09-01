import React, { useRef, useEffect } from 'react'

interface WorkflowEditorProps {
  tabId: string
  content: string
  onContentChange: (content: string) => void
}

const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ 
  tabId, 
  content, 
  onContentChange 
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      // Focus the textarea after loading content (matching electron app behavior)
      if (content && content.trim()) {
        textareaRef.current.focus()
      }
    }
  }, [content])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onContentChange(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+S or Cmd+S for save (handled by menu)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      // Save functionality is handled by the main app through menu
    }
    
    // Tab key behavior for better editing
    if (e.key === 'Tab') {
      e.preventDefault()
      const target = e.target as HTMLTextAreaElement
      const start = target.selectionStart
      const end = target.selectionEnd
      const value = target.value
      
      const newValue = value.substring(0, start) + '    ' + value.substring(end)
      onContentChange(newValue)
      
      // Set cursor position after the inserted tabs
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4
      }, 0)
    }
  }

  return (
    <div className="editor-section">
      <div className="section-header">
        <h3>Workflow Editor</h3>
        <div className="header-controls">
          <span className="file-name">{`Workflow-${tabId}.md`}</span>
        </div>
      </div>
      <div className="section-content">
        <textarea
          ref={textareaRef}
          id={`workFlowEditor-${tabId}`}
          className="workflow-editor"
          placeholder="Paste or type your workflow here..."
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  )
}

export default WorkflowEditor