class WorkflowApp {
    constructor() {
        this.tabs = new Map(); // Store tab data
        this.activeTabId = 'tab-1';
        this.tabCounter = 1;
        this.envStatus = null; // Global env status only
        
        // Settings configuration with defaults
        this.settings = {
            maxPolls: 9999,
            pollingInterval: 10, // seconds
            firstPollingInterval: 90 // seconds
        };
        
        this.init();
    }

    init() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupUI());
        } else {
            this.setupUI();
        }
    }

    setupUI() {
        // Initialize the first tab
        this.initializeTab('tab-1');
        
        // Get global DOM elements (only env status is global now)
        this.envStatus = document.getElementById('envStatus');

        // Setup Settings functionality
        this.setupSettingsListeners();
        
        // Load saved settings
        this.loadSettings();

        // Setup IPC event listeners
        this.setupIPCListeners();
        
        // Check environment on startup
        this.checkEnvironment();
        
        // Setup tab event listeners
        this.setupTabListeners();
    }

    // Tab Management
    initializeTab(tabId) {
        const tabData = {
            // Tab-specific UI elements
            workflowEditor: document.getElementById(`workFlowEditor-${tabId}`),
            resultsContainer: document.getElementById(`resultsContainer-${tabId}`),
            progressBar: document.getElementById(`progressBar-${tabId}`),
            progressLog: document.getElementById(`progressLog-${tabId}`),
            progressLogSection: document.getElementById(`progressLogSection-${tabId}`),
            loadingOverlay: document.getElementById(`loadingOverlay-${tabId}`),
            loadingText: document.getElementById(`loadingText-${tabId}`),
            validationStatus: document.getElementById(`validationStatus-${tabId}`),
            fileName: document.getElementById(`fileName-${tabId}`),
            executeBtn: document.getElementById(`executeBtn-${tabId}`),
            stopBtn: document.getElementById(`stopBtn-${tabId}`),
            loadBtn: document.getElementById(`loadBtn-${tabId}`),
            validateBtn: document.getElementById(`validateBtn-${tabId}`),
            clearBtn: document.getElementById(`clearBtn-${tabId}`),
            
            // Tab state
            isExecuting: false,
            executionProcess: null
        };

        this.tabs.set(tabId, tabData);
        
        // Setup functionality for this tab
        this.setupTabFunctionality(tabId);
    }

    setupTabFunctionality(tabId) {
        const tabData = this.tabs.get(tabId);
        if (!tabData) return;

        // Setup button event listeners for this tab
        if (tabData.loadBtn) {
            tabData.loadBtn.addEventListener('click', async () => {
                await this.loadWorkflowFile(tabId);
            });
        }

        if (tabData.validateBtn) {
            tabData.validateBtn.addEventListener('click', async () => {
                await this.validateWorkflow(tabId);
            });
        }

        if (tabData.executeBtn) {
            tabData.executeBtn.addEventListener('click', async () => {
                await this.executeWorkflow(tabId);
            });
        }

        if (tabData.stopBtn) {
            tabData.stopBtn.addEventListener('click', () => {
                this.stopExecution(tabId);
            });
        }

        if (tabData.clearBtn) {
            tabData.clearBtn.addEventListener('click', () => {
                this.clearResults(tabId);
            });
        }

        // Setup editor functionality for this tab
        this.setupEditorForTab(tabId);
    }

    setupTabListeners() {
        // Add click listeners to existing tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                if (!e.target.classList.contains('tab-close')) {
                    this.switchTab(tab.dataset.tabId);
                }
            });
        });
    }

    switchTab(tabId) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Remove active class from all tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected tab content
        const targetContent = document.querySelector(`[data-tab-id="${tabId}"].tab-content`);
        const targetTab = document.querySelector(`[data-tab-id="${tabId}"].tab`);
        
        if (targetContent && targetTab) {
            targetContent.classList.add('active');
            targetTab.classList.add('active');
            this.activeTabId = tabId;
            
            // Update status indicators for active tab
            this.updateStatusForActiveTab();
        }
    }

    addNewTab() {
        this.tabCounter++;
        const newTabId = `tab-${this.tabCounter}`;
        
        // Create new tab button
        const tabContainer = document.querySelector('.tab-container');
        const addButton = document.querySelector('.add-tab-btn');
        
        const newTab = document.createElement('div');
        newTab.className = 'tab';
        newTab.setAttribute('data-tab-id', newTabId);
        newTab.innerHTML = `
            <span class="tab-label">Session ${this.tabCounter}</span>
            <button class="tab-close" onclick="event.stopPropagation(); app.closeTab('${newTabId}')">&times;</button>
        `;
        
        // Add event listener
        newTab.addEventListener('click', (e) => {
            if (!e.target.classList.contains('tab-close')) {
                this.switchTab(newTabId);
            }
        });
        
        // Insert before add button
        tabContainer.insertBefore(newTab, addButton);
        
        // Create new tab content
        const tabContentContainer = document.getElementById('tabContentContainer');
        const newTabContent = document.createElement('div');
        newTabContent.className = 'tab-content';
        newTabContent.setAttribute('data-tab-id', newTabId);
        newTabContent.innerHTML = `
            <!-- Tab Header with Controls -->
            <div class="tab-header">
                <div class="tab-actions">
                    <button id="loadBtn-${newTabId}" class="btn btn-primary">Load</button>
                    <button id="validateBtn-${newTabId}" class="btn btn-warning">Validate</button>
                    <button id="executeBtn-${newTabId}" class="btn btn-success">Execute</button>
                    <button id="stopBtn-${newTabId}" class="btn btn-danger" style="display: none;">Stop</button>
                    <button id="clearBtn-${newTabId}" class="btn btn-secondary">Clear</button>
                </div>
            </div>

            <!-- Tab Status Bar -->
            <div class="tab-status-bar">
                <div class="status-indicators">
                    <div id="validationStatus-${newTabId}" class="status-indicator">VALIDATION</div>
                </div>
                <div id="fileName-${newTabId}" class="file-name">No file loaded</div>
            </div>

            <!-- Loading Overlay for this tab -->
            <div id="loadingOverlay-${newTabId}" class="tab-loading-overlay" style="display: none;">
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div id="loadingText-${newTabId}" class="loading-text">Loading...</div>
                </div>
            </div>

            <div class="main-content">
                <!-- Editor Section -->
                <div class="editor-section">
                    <div class="section-header" onclick="app.toggleSection('editor', '${newTabId}')">
                        <h3>Workflow Editor</h3>
                        <div class="header-controls">
                            <button class="collapse-btn" id="editorCollapseBtn-${newTabId}">−</button>
                        </div>
                    </div>
                    <div class="section-content" id="editorContent-${newTabId}">
                        <textarea 
                            id="workFlowEditor-${newTabId}" 
                            class="workflow-editor" 
                            placeholder="Paste or type your workflow here..."
                        ></textarea>
                    </div>
                </div>

                <!-- Progress Log Section -->
                <div id="progressLogSection-${newTabId}" class="progress-section" style="display: none;">
                    <div class="section-header" onclick="app.toggleSection('progress', '${newTabId}')">
                        <h3>Progress Log</h3>
                        <div class="header-controls">
                            <button id="clearLogBtn-${newTabId}" class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); app.clearProgressLog('${newTabId}')">Clear Log</button>
                            <button class="collapse-btn" id="progressCollapseBtn-${newTabId}">−</button>
                        </div>
                    </div>
                    <div class="section-content" id="progressContent-${newTabId}">
                        <div id="progressLog-${newTabId}" class="progress-log"></div>
                    </div>
                </div>

                <!-- Results Section -->
                <div class="results-section">
                    <div class="section-header" onclick="app.toggleSection('results', '${newTabId}')">
                        <h3>Results</h3>
                        <div class="header-controls">
                            <button class="collapse-btn" id="resultsCollapseBtn-${newTabId}">−</button>
                        </div>
                    </div>
                    <div class="section-content" id="resultsContent-${newTabId}">
                        <div id="resultsContainer-${newTabId}" class="results-container"></div>
                        <div id="progressBar-${newTabId}" class="progress-bar" style="display: none;">
                            <div class="progress-fill"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        tabContentContainer.appendChild(newTabContent);
        
        // Initialize the new tab
        this.initializeTab(newTabId);
        
        // Switch to the new tab
        this.switchTab(newTabId);
    }

    closeTab(tabId) {
        const tabCount = document.querySelectorAll('.tab').length;
        
        // Don't allow closing the last tab
        if (tabCount <= 1) {
            return;
        }
        
        // Show confirmation dialog
        const tabData = this.tabs.get(tabId);
        const tabLabel = document.querySelector(`[data-tab-id="${tabId}"] .tab-label`)?.textContent || 'this tab';
        
        // Check if there's unsaved work or running processes
        let message = `Are you sure you want to close "${tabLabel}"?`;
        if (tabData && tabData.isExecuting) {
            message = `"${tabLabel}" is currently running a workflow process.\n\nClosing this tab will permanently stop the execution and you will lose all progress.\n\nAre you sure you want to continue?`;
        } else if (tabData && tabData.hasUnsavedChanges) {
            message = `"${tabLabel}" has unsaved changes. Are you sure you want to close it?`;
        }
        
        // Show confirmation dialog
        if (!confirm(message)) {
            return; // User cancelled, don't close the tab
        }
        
        // Stop any running process in this tab
        if (tabData && tabData.isExecuting) {
            this.stopExecution(tabId);
        }
        
        // Remove tab button
        const tabButton = document.querySelector(`[data-tab-id="${tabId}"].tab`);
        if (tabButton) {
            tabButton.remove();
        }
        
        // Remove tab content
        const tabContent = document.querySelector(`[data-tab-id="${tabId}"].tab-content`);
        if (tabContent) {
            tabContent.remove();
        }
        
        // Remove from tabs map
        this.tabs.delete(tabId);
        
        // If this was the active tab, switch to the first available tab
        if (this.activeTabId === tabId) {
            const firstTab = document.querySelector('.tab');
            if (firstTab) {
                this.switchTab(firstTab.dataset.tabId);
            }
        }
    }

    // Get current tab data
    getCurrentTabData() {
        return this.tabs.get(this.activeTabId);
    }

    // Update methods to work with current tab
    setupEditorForTab(tabId) {
        const tabData = this.tabs.get(tabId);
        if (!tabData || !tabData.workflowEditor) {
            console.error('WorkflowEditor not found for tab:', tabId);
            return;
        }

        console.log('Setting up editor for tab:', tabId, 'Element:', tabData.workflowEditor);

        // Remove any existing event listeners to avoid conflicts
        tabData.workflowEditor.onkeydown = null;
        tabData.workflowEditor.onpaste = null;
        tabData.workflowEditor.oninput = null;

        // Ensure the editor is focusable and has proper attributes
        tabData.workflowEditor.setAttribute('tabindex', '0');
        tabData.workflowEditor.removeAttribute('readonly');
        tabData.workflowEditor.removeAttribute('disabled');
        
        // Force enable the textarea
        tabData.workflowEditor.disabled = false;
        tabData.workflowEditor.readOnly = false;
        
        // Clear any inline styles that might interfere
        tabData.workflowEditor.style.pointerEvents = 'auto';
        tabData.workflowEditor.style.userSelect = 'text';
        tabData.workflowEditor.style.outline = 'none';
        
        // Test basic functionality
        tabData.workflowEditor.addEventListener('click', (e) => {
            console.log('Textarea clicked, attempting to focus');
            e.stopPropagation();
            tabData.workflowEditor.focus();
        });

        // Force focus capability on macOS
        tabData.workflowEditor.addEventListener('mousedown', (e) => {
            console.log('Textarea mousedown event');
            e.stopPropagation();
            setTimeout(() => {
                tabData.workflowEditor.focus();
                console.log('Focus applied, activeElement:', document.activeElement);
            }, 10);
        });

        // Simplified keyboard event handling - no interference
        tabData.workflowEditor.addEventListener('keydown', (e) => {
            console.log('🔥 Keydown in textarea:', e.key, 'Meta:', e.metaKey, 'Ctrl:', e.ctrlKey, 'Target:', e.target.tagName);
            
            const isMac = /Mac|iPhone|iPod|iPad/.test(navigator.platform);
            const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
            
            // Explicitly handle text editing shortcuts by executing them programmatically
            if (cmdOrCtrl) {
                switch (e.key.toLowerCase()) {
                    case 'a': // Select All
                        console.log('🔥 Cmd+A detected - selecting all text');
                        e.preventDefault();
                        tabData.workflowEditor.select();
                        return;
                    case 'c': // Copy
                        console.log('🔥 Cmd+C detected - copying selected text');
                        // Let default behavior work for copy
                        return;
                    case 'v': // Paste
                        console.log('🔥 Cmd+V detected - pasting from clipboard');
                        e.preventDefault();
                        navigator.clipboard.readText().then(text => {
                            const start = tabData.workflowEditor.selectionStart;
                            const end = tabData.workflowEditor.selectionEnd;
                            const value = tabData.workflowEditor.value;
                            
                            tabData.workflowEditor.value = value.substring(0, start) + text + value.substring(end);
                            tabData.workflowEditor.selectionStart = tabData.workflowEditor.selectionEnd = start + text.length;
                            console.log('🔥 Paste completed, new length:', tabData.workflowEditor.value.length);
                        }).catch(err => {
                            console.error('Paste failed:', err);
                        });
                        return;
                    case 'x': // Cut
                        console.log('🔥 Cmd+X detected - cutting selected text');
                        e.preventDefault();
                        const selectedText = tabData.workflowEditor.value.substring(
                            tabData.workflowEditor.selectionStart,
                            tabData.workflowEditor.selectionEnd
                        );
                        if (selectedText) {
                            navigator.clipboard.writeText(selectedText).then(() => {
                                const start = tabData.workflowEditor.selectionStart;
                                const end = tabData.workflowEditor.selectionEnd;
                                const value = tabData.workflowEditor.value;
                                tabData.workflowEditor.value = value.substring(0, start) + value.substring(end);
                                tabData.workflowEditor.selectionStart = tabData.workflowEditor.selectionEnd = start;
                                console.log('🔥 Cut completed');
                            });
                        }
                        return;
                    case 'z': // Undo - let browser handle this
                        console.log('🔥 Cmd+Z detected - allowing browser undo');
                        return;
                    case 's': // Save
                        e.preventDefault();
                        console.log('Save shortcut triggered');
                        this.saveResults(tabId);
                        return;
                }
            }
            
            // Handle Shift+Cmd+Z for Redo on Mac
            if (isMac && e.shiftKey && e.metaKey && e.key.toLowerCase() === 'z') {
                console.log('🔥 Shift+Cmd+Z detected - allowing browser redo');
                return;
            }
            
            // Tab key behavior for better editing
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = tabData.workflowEditor.selectionStart;
                const end = tabData.workflowEditor.selectionEnd;
                const value = tabData.workflowEditor.value;
                
                tabData.workflowEditor.value = value.substring(0, start) + '    ' + value.substring(end);
                tabData.workflowEditor.selectionStart = tabData.workflowEditor.selectionEnd = start + 4;
                console.log('Tab key handled - added indentation');
                return;
            }
            
            // For all other keys, let them proceed naturally
            console.log('Allowing default behavior for:', e.key);
        });

        // Monitor paste events
        tabData.workflowEditor.addEventListener('paste', (e) => {
            console.log('🔥 Paste event in textarea');
        });

        // Monitor input events
        tabData.workflowEditor.addEventListener('input', (e) => {
            console.log('🔥 Input event in textarea, value length:', e.target.value.length);
        });

        // Focus/blur events for visual feedback
        tabData.workflowEditor.addEventListener('focus', (e) => {
            console.log('🔥 Textarea focused');
            tabData.workflowEditor.style.borderColor = '#667eea';
            tabData.workflowEditor.style.backgroundColor = 'white';
        });

        tabData.workflowEditor.addEventListener('blur', (e) => {
            console.log('🔥 Textarea blurred');
            tabData.workflowEditor.style.borderColor = '#e1e5e9';
            tabData.workflowEditor.style.backgroundColor = '#fafafa';
        });

        // Test if we can programmatically set focus
        console.log('Testing programmatic focus...');
        setTimeout(() => {
            tabData.workflowEditor.focus();
            console.log('Programmatic focus applied, activeElement:', document.activeElement === tabData.workflowEditor);
        }, 100);
    }

    async loadWorkflowFile(tabId) {
        try {
            this.showLoading('Loading file...', tabId);
            
            const result = await window.electronAPI.openFileDialog();
            const tabData = this.getCurrentTabData();
            
            if (result.success && tabData) {
                tabData.workflowEditor.value = result.content;
                tabData.fileName.textContent = 'Loaded from file';
                this.addResult('success', 'File Loaded', 'Workflow content loaded successfully', tabId);
                tabData.workflowEditor.focus();
                
                // Automatically validate the loaded content to update the validation status
                await this.validateWorkflow(tabId);
            } else if (!result.canceled) {
                this.addResult('error', 'Load Error', result.error || 'Failed to load file', tabId);
            }
        } catch (error) {
            this.addResult('error', 'Load Error', error.message, tabId);
        } finally {
            this.hideLoading(tabId);
        }
    }

    async validateWorkflow(tabId) {
        const tabData = this.getCurrentTabData();
        if (!tabData) return;
        
        const content = tabData.workflowEditor.value.trim();
        
        if (!content) {
            this.addResult('warning', 'Validation Warning', 'No workflow content to validate', tabId);
            return;
        }

        try {
            this.showLoading('Validating workflow...', tabId);
            
            const result = await window.electronAPI.validateWorkflow(content);
            
            console.log('Validation result:', result);
            
            if (result.success) {
                this.addResult('success', 'Validation Success', 'Workflow is valid', tabId);
                this.updateValidationStatus(true, tabId);
            } else {
                // Handle validation errors - use the errors array from our updated response
                const errorMessage = result.errors && result.errors.length > 0 
                    ? result.errors.join('; ') 
                    : (result.error || 'Validation failed');
                
                this.addResult('error', 'Validation Error', errorMessage, tabId);
                this.updateValidationStatus(false, tabId);
            }
        } catch (error) {
            this.addResult('error', 'Validation Error', error.message, tabId);
            this.updateValidationStatus(false, tabId);
        } finally {
            this.hideLoading(tabId);
        }
    }

    async executeWorkflow(tabId) {
        const tabData = this.getCurrentTabData();
        if (!tabData) return;
        
        const content = tabData.workflowEditor.value.trim();
        
        if (!content) {
            this.addResult('warning', 'Execution Warning', 'No workflow content to execute', tabId);
            return;
        }

        if (tabData.isExecuting) {
            return;
        }

        try {
            // Set execution state for this tab
            tabData.isExecuting = true;
            this.setExecutionState(true, tabId);
            
            // Show loading overlay and progress log
            this.showLoading('Executing workflow...', tabId);
            this.showProgressLog(tabId);
            this.clearProgressLog(tabId);
            this.clearResults(tabId);
            
            // Add initial log entry
            this.addProgressLog('info', 'Starting workflow execution...', tabId);
            
            // Start execution
            const result = await window.electronAPI.executeWorkflow(content, {
                interactive: false,
                verbose: true
            });
            
            // Store process reference for stopping
            tabData.executionProcess = result.processId;
            
            this.addProgressLog('info', 'Workflow execution initiated', tabId);
            
        } catch (error) {
            this.addResult('error', 'Execution Error', error.message, tabId);
            this.addProgressLog('error', `Execution failed: ${error.message}`, tabId);
            this.handleExecutionComplete({ success: false, error: error.message }, tabId);
        }
    }

    stopExecution(tabId = null) {
        const targetTabId = tabId || this.activeTabId;
        const tabData = this.tabs.get(targetTabId);
        
        if (!tabData || !tabData.isExecuting) {
            return;
        }

        try {
            this.addProgressLog('warning', 'Stopping workflow execution...', tabId);
            
            if (tabData.executionProcess && window.electronAPI.stopWorkflowExecution) {
                window.electronAPI.stopWorkflowExecution(tabData.executionProcess);
            }
            
            this.addProgressLog('warning', 'Workflow execution stopped by user', tabId);
            this.handleExecutionComplete({ success: false, stopped: true }, tabId);
            
        } catch (error) {
            this.addProgressLog('error', `Failed to stop execution: ${error.message}`, tabId);
            this.handleExecutionComplete({ success: false, error: error.message }, tabId);
        }
    }

    handleExecutionComplete(result, tabId) {
        const tabData = this.getCurrentTabData();
        if (!tabData) return;

        // Reset execution state for current tab
        tabData.isExecuting = false;
        tabData.executionProcess = null;
        this.setExecutionState(false, tabId);
        this.hideLoading(tabId);

        if (result.success) {
            this.addResult('success', 'Execution Complete', JSON.stringify(result.result, null, 2), tabId);
            this.addProgressLog('success', 'Workflow execution completed successfully', tabId);
        } else if (result.stopped) {
            this.addResult('warning', 'Execution Stopped', 'Workflow execution was stopped by user', tabId);
        } else {
            this.addResult('error', 'Execution Error', result.error, tabId);
            this.addProgressLog('error', `Execution failed: ${result.error}`, tabId);
        }
    }

    addResult(type, title, content, tabId) {
        const tabData = this.tabs.get(tabId);
        if (!tabData || !tabData.resultsContainer) return;

        const resultItem = document.createElement('div');
        resultItem.className = `result-item ${type}`;
        
        const header = document.createElement('div');
        header.className = 'result-header';
        
        const titleElement = document.createElement('span');
        titleElement.textContent = title;
        
        const timestamp = document.createElement('span');
        timestamp.className = 'result-timestamp';
        timestamp.textContent = new Date().toLocaleTimeString();
        
        header.appendChild(titleElement);
        header.appendChild(timestamp);
        
        const contentElement = document.createElement('div');
        contentElement.className = 'result-content';
        contentElement.textContent = content;
        
        resultItem.appendChild(header);
        resultItem.appendChild(contentElement);
        
        tabData.resultsContainer.appendChild(resultItem);
        tabData.resultsContainer.scrollTop = tabData.resultsContainer.scrollHeight;
    }

    clearResults(tabId) {
        const tabData = this.tabs.get(tabId);
        if (tabData && tabData.resultsContainer) {
            tabData.resultsContainer.innerHTML = '';
        }
    }

    saveResults(tabId) {
        const tabData = this.tabs.get(tabId);
        if (window.electronAPI && window.electronAPI.saveResults && tabData && tabData.resultsContainer) {
            const results = tabData.resultsContainer.innerHTML;
            window.electronAPI.saveResults(results);
        }
    }

    async checkEnvironment() {
        try {
            const env = await window.electronAPI.checkEnvironment();
            
            let statusText = '';
            let statusClass = '';
            
            console.log(`app.js checkEnvironment result:`, env);
            
            if (env.devinApiKey && env.adoUrl) {
                statusText = 'ENV OK';
                statusClass = 'env-ok';
            } else {
                statusText = 'ENV INCOMPLETE';
                statusClass = 'env-warning';
            }
            
            this.envStatus.textContent = statusText;
            this.envStatus.className = `status-indicator ${statusClass}`;
            
        } catch (error) {
            this.envStatus.textContent = 'ENV ERROR';
            this.envStatus.className = 'status-indicator env-warning';
        }
    }

    updateValidationStatus(isValid, tabId) {
        const tabData = this.tabs.get(tabId);
        if (tabData && tabData.validationStatus) {
            if (isValid) {
                tabData.validationStatus.textContent = 'VALID';
                tabData.validationStatus.className = 'status-indicator validation-valid';
            } else {
                tabData.validationStatus.textContent = 'INVALID';
                tabData.validationStatus.className = 'status-indicator validation-invalid';
            }
        }
    }

    showProgress(message, tabId) {
        const tabData = this.tabs.get(tabId);
        if (tabData && tabData.progressBar) {
            tabData.progressBar.style.display = 'block';
            const progressFill = tabData.progressBar.querySelector('.progress-fill');
            if (progressFill) {
                progressFill.style.width = '30%';
            }
        }
    }

    hideProgress(tabId) {
        const tabData = this.tabs.get(tabId);
        if (tabData && tabData.progressBar) {
            tabData.progressBar.style.display = 'none';
            const progressFill = tabData.progressBar.querySelector('.progress-fill');
            if (progressFill) {
                progressFill.style.width = '0%';
            }
        }
    }

    updateProgress(progress, tabId) {
        const currentTabId = tabId || this.activeTabId;
        const tabData = this.tabs.get(currentTabId);
        if (tabData && tabData.progressBar && tabData.progressBar.style.display !== 'none') {
            const percentage = Math.min(progress.percentage || 0, 100);
            const progressFill = tabData.progressBar.querySelector('.progress-fill');
            if (progressFill) {
                progressFill.style.width = `${percentage}%`;
            }
            
            if (progress.message) {
                this.addProgressLog('info', progress.message, currentTabId);
            }
        }
    }

    saveResultsToFile(filePath) {
        // Implementation for saving results to a specific file
        console.log('Saving results to:', filePath);
    }

    updateStatusForActiveTab() {
        // This method can be used to update status indicators when switching tabs
        // For now, we'll just ensure the current tab state is reflected
    }

    setupIPCListeners() {
        if (window.electronAPI) {
            // Listen for workflow loaded from menu
            window.electronAPI.onWorkflowLoaded((event, data) => {
                const tabData = this.getCurrentTabData();
                if (tabData) {
                    tabData.workflowEditor.value = data.content;
                    tabData.fileName.textContent = data.fileName;
                    this.addResult('info', 'File Loaded', `Loaded: ${data.fileName}`, this.activeTabId);
                }
            });

            // Listen for save request from menu
            window.electronAPI.onSaveResultsRequest((event, filePath) => {
                this.saveResultsToFile(filePath);
            });

            // Listen for validation request from menu
            window.electronAPI.onValidateWorkflowRequest(() => {
                this.validateWorkflow(this.activeTabId);
            });

            // Listen for execution request from menu
            window.electronAPI.onExecuteWorkflowRequest(() => {
                this.executeWorkflow(this.activeTabId);
            });

            // Listen for clear request from menu
            window.electronAPI.onClearResultsRequest(() => {
                this.clearResults(this.activeTabId);
            });

            // Listen for progress updates
            window.electronAPI.onWorkflowProgress((event, progress) => {
                this.updateProgress(progress, this.activeTabId);
            });

            // Listen for real-time CLI output
            window.electronAPI.onWorkflowOutput((event, output) => {
                this.addProgressLog(output.type, output.message, this.activeTabId);
            });

            // Listen for execution completion
            window.electronAPI.onWorkflowComplete((event, result) => {
                this.handleExecutionComplete(result, this.activeTabId);
            });
        }
    }

    // Loading and Progress Management
    showLoading(message = 'Loading...', tabId) {
        const tabData = this.tabs.get(tabId);
        if (tabData && tabData.loadingText) {
            tabData.loadingText.textContent = message;
            tabData.loadingOverlay.style.display = 'flex';
        }
    }

    hideLoading(tabId) {
        const tabData = this.tabs.get(tabId);
        if (tabData) {
            tabData.loadingOverlay.style.display = 'none';
        }
    }

    showProgressLog(tabId) {
        const tabData = this.tabs.get(tabId);
        if (tabData && tabData.progressLogSection) {
            tabData.progressLogSection.style.display = 'flex';
        }
    }

    hideProgressLog(tabId) {
        const tabData = this.tabs.get(tabId);
        if (tabData && tabData.progressLogSection) {
            tabData.progressLogSection.style.display = 'none';
        }
    }

    addProgressLog(type, message, tabId) {
        const tabData = this.tabs.get(tabId);
        if (!tabData || !tabData.progressLog) return;

        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        
        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'log-timestamp';
        timestampSpan.textContent = `[${timestamp}] `;
        
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        
        logEntry.appendChild(timestampSpan);
        logEntry.appendChild(messageSpan);
        
        tabData.progressLog.appendChild(logEntry);
        
        // Auto-scroll to bottom
        tabData.progressLog.scrollTop = tabData.progressLog.scrollHeight;
    }

    clearProgressLog(tabId = null) {
        const targetTabId = tabId || this.activeTabId;
        const tabData = this.tabs.get(targetTabId);
        if (tabData && tabData.progressLog) {
            tabData.progressLog.innerHTML = '';
        }
    }

    // Button State Management
    setExecutionState(isExecuting, tabId) {
        const tabData = this.tabs.get(tabId);
        if (tabData) {
            if (isExecuting) {
                tabData.executeBtn.style.display = 'none';
                tabData.stopBtn.style.display = 'inline-flex';
                tabData.executeBtn.disabled = true;
            } else {
                tabData.executeBtn.style.display = 'inline-flex';
                tabData.stopBtn.style.display = 'none';
                tabData.executeBtn.disabled = false;
            }
        }
    }

    // Section Collapse/Expand functionality
    toggleSection(sectionType, tabId) {
        if (sectionType === 'progress') {
            const section = document.getElementById('progressLogSection-' + tabId);
            const content = document.getElementById('progressContent-' + tabId);
            const btn = document.getElementById('progressCollapseBtn-' + tabId);
            
            if (section && content && btn) {
                if (section.classList.contains('collapsed')) {
                    section.classList.remove('collapsed');
                    content.classList.remove('collapsed');
                    btn.textContent = '−';
                } else {
                    section.classList.add('collapsed');
                    content.classList.add('collapsed');
                    btn.textContent = '+';
                }
            }
        } else if (sectionType === 'results') {
            const section = document.querySelector(`[data-tab-id="${tabId}"] .results-section`);
            const content = document.getElementById('resultsContent-' + tabId);
            const btn = document.getElementById('resultsCollapseBtn-' + tabId);
            
            if (section && content && btn) {
                if (section.classList.contains('collapsed')) {
                    section.classList.remove('collapsed');
                    content.classList.remove('collapsed');
                    btn.textContent = '−';
                } else {
                    section.classList.add('collapsed');
                    content.classList.add('collapsed');
                    btn.textContent = '+';
                }
            }
        } else if (sectionType === 'editor') {
            const section = document.querySelector(`[data-tab-id="${tabId}"] .editor-section`);
            const content = document.getElementById('editorContent-' + tabId);
            const btn = document.getElementById('editorCollapseBtn-' + tabId);
            
            if (section && content && btn) {
                if (section.classList.contains('collapsed')) {
                    section.classList.remove('collapsed');
                    content.classList.remove('collapsed');
                    btn.textContent = '−';
                } else {
                    section.classList.add('collapsed');
                    content.classList.add('collapsed');
                    btn.textContent = '+';
                }
            }
        }
    }

    // Settings Management
    setupSettingsListeners() {
        const settingsBtn = document.getElementById('settingsBtn');
        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        const resetSettingsBtn = document.getElementById('resetSettingsBtn');
        const settingsScreen = document.getElementById('settingsScreen');

        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showSettings();
            });
        }

        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => {
                this.hideSettings();
            });
        }

        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                this.saveSettings();
            });
        }

        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', () => {
                this.resetSettings();
            });
        }

        // Close settings when clicking outside the settings container
        if (settingsScreen) {
            settingsScreen.addEventListener('click', (e) => {
                if (e.target === settingsScreen) {
                    this.hideSettings();
                }
            });
        }

        // ESC key to close settings
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && settingsScreen.style.display !== 'none') {
                this.hideSettings();
            }
        });
    }

    showSettings() {
        const settingsScreen = document.getElementById('settingsScreen');
        if (settingsScreen) {
            // Load current settings into the form
            this.populateSettingsForm();
            settingsScreen.style.display = 'flex';
        }
    }

    hideSettings() {
        const settingsScreen = document.getElementById('settingsScreen');
        if (settingsScreen) {
            settingsScreen.style.display = 'none';
        }
    }

    populateSettingsForm() {
        const maxPollsInput = document.getElementById('maxPolls');
        const pollingIntervalInput = document.getElementById('pollingInterval');
        const firstPollingIntervalInput = document.getElementById('firstPollingInterval');

        if (maxPollsInput) maxPollsInput.value = this.settings.maxPolls;
        if (pollingIntervalInput) pollingIntervalInput.value = this.settings.pollingInterval;
        if (firstPollingIntervalInput) firstPollingIntervalInput.value = this.settings.firstPollingInterval;
    }

    validateSettings(settings) {
        const errors = [];

        if (!Number.isInteger(settings.maxPolls) || settings.maxPolls < 1 || settings.maxPolls > 99999) {
            errors.push('Max Polls must be an integer between 1 and 99999');
        }

        if (!Number.isInteger(settings.pollingInterval) || settings.pollingInterval < 1 || settings.pollingInterval > 300) {
            errors.push('Polling Interval must be an integer between 1 and 300 seconds');
        }

        if (!Number.isInteger(settings.firstPollingInterval) || settings.firstPollingInterval < 1 || settings.firstPollingInterval > 600) {
            errors.push('First Polling Interval must be an integer between 1 and 600 seconds');
        }

        return errors;
    }

    saveSettings() {
        const maxPollsInput = document.getElementById('maxPolls');
        const pollingIntervalInput = document.getElementById('pollingInterval');
        const firstPollingIntervalInput = document.getElementById('firstPollingInterval');

        const newSettings = {
            maxPolls: parseInt(maxPollsInput.value),
            pollingInterval: parseInt(pollingIntervalInput.value),
            firstPollingInterval: parseInt(firstPollingIntervalInput.value)
        };

        // Validate settings
        const errors = this.validateSettings(newSettings);
        if (errors.length > 0) {
            alert('Settings validation failed:\n' + errors.join('\n'));
            return;
        }

        // Save settings
        this.settings = newSettings;
        
        // Persist to localStorage
        localStorage.setItem('devinMindSettings', JSON.stringify(this.settings));

        // Send settings to main process if needed
        if (window.electronAPI && window.electronAPI.updateSettings) {
            window.electronAPI.updateSettings(this.settings);
        }

        // Show success message
        this.showSettingsMessage('Settings saved successfully!', 'success');
        
        // Close settings after a delay
        setTimeout(() => {
            this.hideSettings();
        }, 1500);
    }

    resetSettings() {
        // Reset to default values
        this.settings = {
            maxPolls: 9999,
            pollingInterval: 10,
            firstPollingInterval: 90
        };

        // Update the form
        this.populateSettingsForm();

        // Save to localStorage
        localStorage.setItem('devinMindSettings', JSON.stringify(this.settings));

        // Send to main process
        if (window.electronAPI && window.electronAPI.updateSettings) {
            window.electronAPI.updateSettings(this.settings);
        }

        this.showSettingsMessage('Settings reset to defaults', 'success');
    }

    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('devinMindSettings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                
                // Validate saved settings
                const errors = this.validateSettings(parsed);
                if (errors.length === 0) {
                    this.settings = parsed;
                } else {
                    console.warn('Invalid saved settings, using defaults');
                }
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }

        // Send current settings to main process on load
        if (window.electronAPI && window.electronAPI.updateSettings) {
            window.electronAPI.updateSettings(this.settings);
        }
    }

    showSettingsMessage(message, type = 'info') {
        // Create a temporary message element
        const messageEl = document.createElement('div');
        messageEl.className = `settings-message ${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 1001;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;

        document.body.appendChild(messageEl);

        // Remove after 3 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }

    // Get current settings for external use
    getSettings() {
        return { ...this.settings };
    }
}

// Initialize the application
const app = new WorkflowApp();