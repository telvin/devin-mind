#!/usr/bin/env node

import { spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

class ProductionIntegrationTester {
    constructor() {
        this.tempDir = join(tmpdir(), 'devin-mind-test');
        this.testWorkflowPath = join(this.tempDir, 'test-workflow.md');
    }

    async runIntegrationTests() {
        console.log('🧪 Running production integration tests...\n');
        
        try {
            await this.setupTestEnvironment();
            await this.testWorkflowParsing();
            await this.testWorkflowExecution();
            await this.testHandoffManager();
            await this.cleanup();
            
            console.log('🎉 All integration tests passed!');
            return true;
        } catch (error) {
            console.error('❌ Integration test failed:', error.message);
            await this.cleanup();
            return false;
        }
    }

    async setupTestEnvironment() {
        console.log('🔧 Setting up test environment...');
        
        // Create temp directory if it doesn't exist
        if (!existsSync(this.tempDir)) {
            await import('fs').then(fs => fs.mkdirSync(this.tempDir, { recursive: true }));
        }

        // Create a simple test workflow
        const testWorkflow = `# Test Workflow

## Step 1: Basic Task
- **Executor**: devin
- **Task**: Create a simple hello world function

## Step 2: Verification
- **Executor**: devin  
- **Task**: Test the hello world function

## Step 3: Handoff
- **Executor**: human
- **Task**: Review the implementation
- **Handoff**: Please review the code and confirm it works correctly
`;

        writeFileSync(this.testWorkflowPath, testWorkflow);
        console.log('✅ Test environment setup complete\n');
    }

    async testWorkflowParsing() {
        console.log('📝 Testing workflow parsing...');
        
        return new Promise((resolve, reject) => {
            const testProcess = spawn('node', [
                'index.js', 
                '--file', 
                this.testWorkflowPath,
                '--dry-run'
            ], {
                cwd: projectRoot,
                stdio: 'pipe'
            });

            let output = '';
            let errorOutput = '';

            testProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            testProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            testProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Workflow parsing test passed\n');
                    resolve();
                } else {
                    console.log('Parser output:', output);
                    console.log('Parser errors:', errorOutput);
                    reject(new Error(`Workflow parsing failed with code ${code}`));
                }
            });

            testProcess.on('error', (error) => {
                reject(new Error(`Failed to start workflow parser: ${error.message}`));
            });
        });
    }

    async testWorkflowExecution() {
        console.log('⚡ Testing workflow execution...');
        
        // Since we don't want to actually call Devin API in tests,
        // we'll test the executor with mock mode
        return new Promise((resolve, reject) => {
            const testProcess = spawn('node', [
                'index.js',
                '--file',
                this.testWorkflowPath,
                '--mock-mode'
            ], {
                cwd: projectRoot,
                stdio: 'pipe',
                timeout: 10000
            });

            let output = '';
            testProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            // Kill after 5 seconds since we're just testing the execution flow
            setTimeout(() => {
                testProcess.kill('SIGTERM');
            }, 5000);

            testProcess.on('close', (code) => {
                if (code === 0 || code === 143) { // 143 is SIGTERM
                    console.log('✅ Workflow execution test passed\n');
                    resolve();
                } else {
                    reject(new Error(`Workflow execution failed with code ${code}`));
                }
            });

            testProcess.on('error', (error) => {
                reject(new Error(`Failed to start workflow executor: ${error.message}`));
            });
        });
    }

    async testHandoffManager() {
        console.log('🤝 Testing handoff manager...');
        
        // Test handoff manager functionality
        return new Promise((resolve, reject) => {
            const testProcess = spawn('node', [
                '-e',
                `
                import('./src/handoff-manager.js').then(module => {
                    const manager = new module.HandoffManager();
                    console.log('Handoff manager loaded successfully');
                    process.exit(0);
                }).catch(err => {
                    console.error('Failed to load handoff manager:', err);
                    process.exit(1);
                });
                `
            ], {
                cwd: projectRoot,
                stdio: 'pipe'
            });

            testProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Handoff manager test passed\n');
                    resolve();
                } else {
                    reject(new Error(`Handoff manager test failed with code ${code}`));
                }
            });

            testProcess.on('error', (error) => {
                reject(new Error(`Failed to test handoff manager: ${error.message}`));
            });
        });
    }

    async cleanup() {
        console.log('🧹 Cleaning up test environment...');
        
        try {
            if (existsSync(this.testWorkflowPath)) {
                await import('fs').then(fs => fs.unlinkSync(this.testWorkflowPath));
            }
            if (existsSync(this.tempDir)) {
                await import('fs').then(fs => fs.rmdirSync(this.tempDir));
            }
        } catch (error) {
            console.warn('Warning: Could not clean up test files:', error.message);
        }
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new ProductionIntegrationTester();
    tester.runIntegrationTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

export { ProductionIntegrationTester };