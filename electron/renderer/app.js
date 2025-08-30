class WorkflowApp {
    constructor() {
        this.workflowEditor = null;
        this.fileName = null;
        this.resultsContainer = null;
        this.progressBar = null;
        this.envStatus = null;
        this.validationStatus = null;
        
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
        // Get DOM elements
        this.workflowEditor = document.getElementById('workFlowEditor');
        this.fileName = document.getElementById('fileName');
        this.resultsContainer = document.getElementById('resultsContainer');
        this.progressBar = document.getElementById('progressBar');
        this.envStatus = document.getElementById('envStatus');
        this.validationStatus = document.getElementById('validationStatus');

        // Setup button event listeners
        this.setupButtons();
        
        // Setup editor functionality
        this.setupEditor();
        
        // Setup IPC event listeners
        this.setupIPCListeners();
        
        // Check environment on startup
        this.checkEnvironment();
    }

    setupButtons() {
        // Load button - opens file dialog
        document.getElementById('loadBtn').addEventListener('click', async () => {
            await this.loadWorkflowFile();
        });

        // Validate button
        document.getElementById('validateBtn').addEventListener('click', async () => {
            await this.validateWorkflow();
        });

        // Execute button
        document.getElementById('executeBtn').addEventListener('click', async () => {
            await this.executeWorkflow();
        });

        // Clear button
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearResults();
        });
    }

    setupEditor() {
        // Ensure the textarea can receive paste events
        this.workflowEditor.addEventListener('paste', (e) => {
            // Allow default paste behavior
            console.log('Paste event detected');
        });

        // Add keyboard shortcuts
        this.workflowEditor.addEventListener('keydown', (e) => {
            // Ctrl+V or Cmd+V for paste (redundant but ensures it works)
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                console.log('Paste shortcut detected');
                // Let the default paste behavior happen
            }
            
            // Ctrl+S or Cmd+S for save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveResults();
            }
            
            // Tab key behavior for better editing
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.workflowEditor.selectionStart;
                const end = this.workflowEditor.selectionEnd;
                const value = this.workflowEditor.value;
                
                this.workflowEditor.value = value.substring(0, start) + '    ' + value.substring(end);
                this.workflowEditor.selectionStart = this.workflowEditor.selectionEnd = start + 4;
            }
        });

        // Auto-resize functionality
        this.workflowEditor.addEventListener('input', () => {
            this.autoResize();
        });
    }

    setupIPCListeners() {
        if (window.electronAPI) {
            // Listen for workflow loaded from menu
            window.electronAPI.onWorkflowLoaded((event, data) => {
                this.workflowEditor.value = data.content;
                this.fileName.textContent = data.fileName;
                this.addResult('info', 'File Loaded', `Loaded: ${data.fileName}`);
            });

            // Listen for save request from menu
            window.electronAPI.onSaveResultsRequest((event, filePath) => {
                this.saveResultsToFile(filePath);
            });

            // Listen for validation request from menu
            window.electronAPI.onValidateWorkflowRequest(() => {
                this.validateWorkflow();
            });

            // Listen for execution request from menu
            window.electronAPI.onExecuteWorkflowRequest(() => {
                this.executeWorkflow();
            });

            // Listen for clear request from menu
            window.electronAPI.onClearResultsRequest(() => {
                this.clearResults();
            });

            // Listen for progress updates
            window.electronAPI.onWorkflowProgressUpdate((event, progress) => {
                this.updateProgress(progress);
            });
        }
    }

    async loadWorkflowFile() {
        try {
            this.showProgress('Loading file...');
            
            const result = await window.electronAPI.openFileDialog();
            
            if (result.success) {
                this.workflowEditor.value = result.content;
                this.fileName.textContent = 'Loaded from file';
                this.addResult('success', 'File Loaded', 'Workflow content loaded successfully');
                
                // Focus the editor so user can immediately start editing/pasting
                this.workflowEditor.focus();
            } else if (!result.canceled) {
                this.addResult('error', 'Load Error', result.error || 'Failed to load file');
            }
        } catch (error) {
            this.addResult('error', 'Load Error', error.message);
        } finally {
            this.hideProgress();
        }
    }

    async validateWorkflow() {
        const content = this.workflowEditor.value.trim();
        
        if (!content) {
            this.addResult('warning', 'Validation Warning', 'No workflow content to validate');
            return;
        }

        try {
            this.showProgress('Validating workflow...');
            
            const result = await window.electronAPI.validateWorkflow(content);
            
            if (result.success) {
                this.addResult('success', 'Validation Success', 'Workflow is valid');
                this.updateValidationStatus(true);
            } else {
                this.addResult('error', 'Validation Error', result.error);
                this.updateValidationStatus(false);
            }
        } catch (error) {
            this.addResult('error', 'Validation Error', error.message);
            this.updateValidationStatus(false);
        } finally {
            this.hideProgress();
        }
    }

    async executeWorkflow() {
        const content = this.workflowEditor.value.trim();
        
        if (!content) {
            this.addResult('warning', 'Execution Warning', 'No workflow content to execute');
            return;
        }

        try {
            this.showProgress('Executing workflow...');
            this.clearResults();
            
            const result = await window.electronAPI.executeWorkflow(content, {
                interactive: false,
                verbose: true
            });
            
            if (result.success) {
                this.addResult('success', 'Execution Complete', JSON.stringify(result.result, null, 2));
            } else {
                this.addResult('error', 'Execution Error', result.error);
            }
        } catch (error) {
            this.addResult('error', 'Execution Error', error.message);
        } finally {
            this.hideProgress();
        }
    }

    async checkEnvironment() {
        try {
            const env = await window.electronAPI.checkEnvironment();
            
            let statusText = '';
            let statusClass = '';
            
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

    updateValidationStatus(isValid) {
        if (isValid) {
            this.validationStatus.textContent = 'VALID';
            this.validationStatus.className = 'status-indicator validation-valid';
        } else {
            this.validationStatus.textContent = 'INVALID';
            this.validationStatus.className = 'status-indicator validation-invalid';
        }
    }

    addResult(type, title, content) {
        // Remove placeholder if it exists
        const placeholder = this.resultsContainer.querySelector('.results-placeholder');
        if (placeholder) {
            placeholder.remove();
        }

        const resultItem = document.createElement('div');
        resultItem.className = `result-item ${type}`;
        
        const resultTitle = document.createElement('div');
        resultTitle.className = 'result-title';
        resultTitle.textContent = title;
        
        const resultContent = document.createElement('div');
        resultContent.className = 'result-content';
        resultContent.textContent = content;
        
        resultItem.appendChild(resultTitle);
        resultItem.appendChild(resultContent);
        
        this.resultsContainer.appendChild(resultItem);
        
        // Scroll to bottom
        this.resultsContainer.scrollTop = this.resultsContainer.scrollHeight;
    }

    clearResults() {
        this.resultsContainer.innerHTML = '<div class="results-placeholder">Results will appear here after validation or execution</div>';
        this.validationStatus.textContent = '';
        this.validationStatus.className = 'status-indicator';
    }

    showProgress(text = 'Processing...') {
        this.progressBar.querySelector('.progress-text').textContent = text;
        this.progressBar.classList.remove('hidden');
    }

    hideProgress() {
        this.progressBar.classList.add('hidden');
    }

    updateProgress(progress) {
        const fill = this.progressBar.querySelector('.progress-fill');
        if (progress.percentage) {
            fill.style.width = `${progress.percentage}%`;
        }
        if (progress.message) {
            this.progressBar.querySelector('.progress-text').textContent = progress.message;
        }
    }

    autoResize() {
        // Auto-resize is handled by CSS flex, but we can add any custom logic here
    }

    async saveResults() {
        // This would be triggered by Ctrl+S or menu
        const results = Array.from(this.resultsContainer.querySelectorAll('.result-item')).map(item => {
            return {
                title: item.querySelector('.result-title').textContent,
                content: item.querySelector('.result-content').textContent,
                type: item.className.replace('result-item ', '')
            };
        });

        // You could implement saving logic here
        console.log('Save results:', results);
    }

    async saveResultsToFile(filePath) {
        try {
            const results = Array.from(this.resultsContainer.querySelectorAll('.result-item')).map(item => {
                return {
                    title: item.querySelector('.result-title').textContent,
                    content: item.querySelector('.result-content').textContent,
                    type: item.className.replace('result-item ', '')
                };
            });

            const content = JSON.stringify(results, null, 2);
            const result = await window.electronAPI.saveFile(filePath, content);
            
            if (result.success) {
                this.addResult('success', 'Save Complete', `Results saved to: ${filePath}`);
            } else {
                this.addResult('error', 'Save Error', result.error);
            }
        } catch (error) {
            this.addResult('error', 'Save Error', error.message);
        }
    }
}

// Initialize the app when the script loads
new WorkflowApp();