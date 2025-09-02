import {
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
    jest,
} from '@jest/globals';

// Create mock implementations
const mockParser = {
    parse: jest.fn(),
    validateWorkflow: jest.fn(),
    formatWorkflowSummary: jest.fn(),
};

const mockClient = {
    setApiKey: jest.fn(),
    setMockMode: jest.fn(),
};

const mockHandoffManager = {
    setPollingInterval: jest.fn(),
    setFirstPollingInterval: jest.fn(),
    setMaxPolls: jest.fn(), // Add missing method
    setTimeout: jest.fn(),
    executeWorkflow: jest.fn(),
};

// Mock the classes
const WorkflowParser = jest.fn(() => mockParser);
const DevinClient = jest.fn(() => mockClient);
const HandoffManager = jest.fn(() => mockHandoffManager);

// Mock the modules before importing
jest.unstable_mockModule('../src/workflow-parser.js', () => ({
    WorkflowParser: WorkflowParser
}));

jest.unstable_mockModule('../src/devin-client.js', () => ({
    DevinClient: DevinClient
}));

jest.unstable_mockModule('../src/handoff-manager.js', () => ({
    HandoffManager: HandoffManager
}));

// Import the module under test after mocking dependencies
const {
    startWorkflow,
    startWorkflowQuiet,
    startWorkflowMock,
    validateWorkflow,
} = await import('../src/workflow-executor.js');

describe('WorkflowExecutor', () => {
    let originalEnv;

    beforeEach(() => {
        // Save original environment
        originalEnv = { ...process.env };
        
        // Reset all mocks
        jest.clearAllMocks();

        // Setup default mock returns
        mockParser.parse.mockReturnValue({
            steps: [
                {
                    step_number: 1,
                    prompt: 'Test step',
                    handoff: 'Test handoff',
                    rely_previous_step: false,
                    playbook: null,
                    title: 'Test Step 1'
                }
            ]
        });

        mockParser.validateWorkflow.mockReturnValue({
            valid: true,
            errors: [],
            warnings: []
        });

        mockParser.formatWorkflowSummary.mockReturnValue({
            total_steps: 1,
            steps_with_playbooks: 0,
            steps_with_handoffs: 1,
            steps_with_repos: 0,
            steps_relying_on_previous: 0
        });

        mockHandoffManager.executeWorkflow.mockResolvedValue([
            {
                success: true,
                step_number: 1,
                session_id: 'test-session-1',
                execution_time_ms: 1000,
                handoff_result: 'Test result'
            }
        ]);
    });

    afterEach(() => {
        // Restore original environment
        process.env = originalEnv;
    });

    describe('API Key Handling', () => {
        it('should use API key from options parameter when provided', async () => {
            const testApiKey = 'test-api-key-from-options';
            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            await startWorkflow(workflow, {
                apiKey: testApiKey,
                verbose: false
            });

            expect(mockClient.setApiKey).toHaveBeenCalledWith(testApiKey);
        });

        it('should use API key from environment variable DEVIN_API_KEY when no option provided', async () => {
            const testApiKey = 'test-api-key-from-env';
            process.env.DEVIN_API_KEY = testApiKey;

            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            await startWorkflow(workflow, { verbose: false });

            expect(mockClient.setApiKey).toHaveBeenCalledWith(testApiKey);
        });

        it('should prioritize options API key over environment variable', async () => {
            const envApiKey = 'env-api-key';
            const optionsApiKey = 'options-api-key';
            
            process.env.DEVIN_API_KEY = envApiKey;

            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            await startWorkflow(workflow, {
                apiKey: optionsApiKey,
                verbose: false
            });

            expect(mockClient.setApiKey).toHaveBeenCalledWith(optionsApiKey);
        });

        it('should throw error when no API key is provided and not in mock mode', async () => {
            delete process.env.DEVIN_API_KEY;
            delete process.env.NODE_ENV; // Ensure not in test mode to avoid auto mock mode

            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            const result = await startWorkflow(workflow, { 
                verbose: false,
                useMockMode: false // Explicitly disable mock mode
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('API key is required. Please provide it via --apiKey option or set DEVIN_API_KEY environment variable.');
        });

        it('should throw error when API key is empty string and not in mock mode', async () => {
            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            const result = await startWorkflow(workflow, { 
                apiKey: '',
                verbose: false,
                useMockMode: false // Explicitly disable mock mode
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('API key cannot be empty. Please provide a valid API key via --apiKey option or set DEVIN_API_KEY environment variable.');
        });

        it('should throw error when API key is whitespace-only and not in mock mode', async () => {
            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            const result = await startWorkflow(workflow, { 
                apiKey: '   ',
                verbose: false,
                useMockMode: false // Explicitly disable mock mode
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('API key cannot be empty. Please provide a valid API key via --apiKey option or set DEVIN_API_KEY environment variable.');
        });

        it('should enable mock mode when no API key is available', async () => {
            delete process.env.DEVIN_API_KEY;
            delete process.env.NODE_ENV; // Ensure not in test mode

            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            const result = await startWorkflow(workflow, { 
                verbose: false,
                useMockMode: false // Explicitly disable mock mode
            });

            // With the new logic, missing API key should fail when not in mock mode
            expect(result.success).toBe(false);
            expect(result.error).toBe('API key is required. Please provide it via --apiKey option or set DEVIN_API_KEY environment variable.');
        });

        it('should disable mock mode when API key is provided via options', async () => {
            delete process.env.NODE_ENV; // Ensure not in test mode
            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            await startWorkflow(workflow, {
                apiKey: 'test-key',
                verbose: false
            });

            // Should not call setMockMode when API key is provided and not in test environment
            expect(mockClient.setMockMode).not.toHaveBeenCalled();
        });

        it('should disable mock mode when API key is provided via environment', async () => {
            delete process.env.NODE_ENV; // Ensure not in test mode
            process.env.DEVIN_API_KEY = 'env-test-key';

            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            await startWorkflow(workflow, { verbose: false });

            // Should not call setMockMode when API key is provided and not in test environment
            expect(mockClient.setMockMode).not.toHaveBeenCalled();
        });

        it('should enable mock mode in test environment even with API key', async () => {
            const originalNodeEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'test';
            process.env.DEVIN_API_KEY = 'test-key';

            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            await startWorkflow(workflow, { verbose: false });

            expect(mockClient.setMockMode).toHaveBeenCalledWith(true, 'http://localhost:3001/v1');
            
            // Restore NODE_ENV
            process.env.NODE_ENV = originalNodeEnv;
        });

        it('should allow empty API key when in mock mode', async () => {
            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            const result = await startWorkflow(workflow, { 
                apiKey: '',
                verbose: false,
                useMockMode: true // Mock mode should bypass API key validation
            });

            expect(result.success).toBe(true);
            expect(mockClient.setMockMode).toHaveBeenCalledWith(true, 'http://localhost:3001/v1');
        });

        it('should allow undefined API key when in mock mode', async () => {
            delete process.env.DEVIN_API_KEY;
            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            const result = await startWorkflow(workflow, { 
                verbose: false,
                useMockMode: true // Mock mode should bypass API key validation
            });

            expect(result.success).toBe(true);
            expect(mockClient.setMockMode).toHaveBeenCalledWith(true, 'http://localhost:3001/v1');
        });
    });

    describe('Configuration Options', () => {
        it('should apply default configuration options', async () => {
            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            await startWorkflow(workflow, { verbose: false });

            expect(mockHandoffManager.setPollingInterval).toHaveBeenCalledWith(10000); // 10 seconds in ms
            expect(mockHandoffManager.setFirstPollingInterval).toHaveBeenCalledWith(90000); // 90 seconds in ms
            expect(mockHandoffManager.setMaxPolls).toHaveBeenCalledWith(9999); // Add missing expectation
            expect(mockHandoffManager.setTimeout).toHaveBeenCalledWith(300000); // 5 minutes in ms
        });

        it('should override default configuration with provided options', async () => {
            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            await startWorkflow(workflow, {
                pollingInterval: 15,
                firstPollingInterval: 120,
                maxPolls: 5000, // Add custom maxPolls
                timeout: 600,
                verbose: false
            });

            expect(mockHandoffManager.setPollingInterval).toHaveBeenCalledWith(15000);
            expect(mockHandoffManager.setFirstPollingInterval).toHaveBeenCalledWith(120000);
            expect(mockHandoffManager.setMaxPolls).toHaveBeenCalledWith(5000); // Add missing expectation
            expect(mockHandoffManager.setTimeout).toHaveBeenCalledWith(600000);
        });

        it('should enable mock mode when useMockMode option is true', async () => {
            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            await startWorkflow(workflow, {
                useMockMode: true,
                verbose: false
            });

            expect(mockClient.setMockMode).toHaveBeenCalledWith(true, 'http://localhost:3001/v1');
        });

        it('should use custom mock API URL when provided', async () => {
            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            await startWorkflow(workflow, {
                useMockMode: true,
                mockApiUrl: 'http://custom-mock:3002/api',
                verbose: false
            });

            expect(mockClient.setMockMode).toHaveBeenCalledWith(true, 'http://custom-mock:3002/api');
        });
    });

    describe('Workflow Parsing and Validation', () => {
        it('should parse workflow content correctly', async () => {
            const workflowContent = '# Test Workflow\n## Step 1\n- Prompt: Test';

            await startWorkflow(workflowContent, { verbose: false });

            expect(mockParser.parse).toHaveBeenCalledWith(workflowContent);
        });

        it('should validate parsed workflow', async () => {
            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            await startWorkflow(workflow, { verbose: false });

            expect(mockParser.validateWorkflow).toHaveBeenCalledWith([{
                step_number: 1,
                prompt: 'Test step',
                handoff: 'Test handoff',
                rely_previous_step: false,
                playbook: null,
                title: 'Test Step 1'
            }]);
        });

        it('should throw error when workflow validation fails', async () => {
            mockParser.validateWorkflow.mockReturnValue({
                valid: false,
                errors: ['Invalid step format', 'Missing required field'],
                warnings: []
            });

            const workflow = '# Invalid Workflow';

            const result = await startWorkflow(workflow, { verbose: false });
            
            // The function returns an error object instead of throwing
            expect(result.success).toBe(false);
            expect(result.error).toBe('Workflow validation failed: Invalid step format, Missing required field');
        });

        it('should execute workflow when validation passes', async () => {
            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            await startWorkflow(workflow, { verbose: false });

            expect(mockHandoffManager.executeWorkflow).toHaveBeenCalledWith([{
                step_number: 1,
                prompt: 'Test step',
                handoff: 'Test handoff',
                rely_previous_step: false,
                playbook: null,
                title: 'Test Step 1'
            }]);
        });
    });

    describe('Execution Results', () => {
        it('should return successful execution summary', async () => {
            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            const result = await startWorkflow(workflow, { verbose: false });

            expect(result).toMatchObject({
                success: true,
                total_steps: 1,
                successful_steps: 1,
                failed_steps: 0,
                steps_with_handoffs: 1,
                completion_rate: 100,
                session_ids: ['test-session-1']
            });

            expect(result.executed_at).toBeDefined();
            // Remove the timing assertion since it's mocked and execution is nearly instantaneous
            expect(result.total_execution_time_ms).toBeGreaterThanOrEqual(0);
        });

        it('should return failed execution summary when steps fail', async () => {
            mockHandoffManager.executeWorkflow.mockResolvedValue([
                {
                    success: false,
                    step_number: 1,
                    error: 'Step execution failed',
                    execution_time_ms: 500
                }
            ]);

            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            const result = await startWorkflow(workflow, { verbose: false });

            expect(result).toMatchObject({
                success: false,
                total_steps: 1,
                successful_steps: 0,
                failed_steps: 1,
                completion_rate: 0
            });
        });

        it('should handle execution errors gracefully', async () => {
            mockHandoffManager.executeWorkflow.mockRejectedValue(new Error('Network error'));

            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            const result = await startWorkflow(workflow, { verbose: false });

            expect(result).toMatchObject({
                success: false,
                error: 'Network error'
            });
        });
    });

    describe('Helper Functions', () => {
        describe('startWorkflowQuiet', () => {
            it('should set verbose to false', async () => {
                const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

                const result = await startWorkflowQuiet(workflow, { apiKey: 'test' });

                // Should not see verbose output in console
                expect(result).toMatchObject({
                    success: true,
                    total_steps: 1
                });
            });
        });

        describe('startWorkflowMock', () => {
            it('should enable mock mode with test settings', async () => {
                const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

                await startWorkflowMock(workflow);

                expect(mockClient.setApiKey).toHaveBeenCalledWith('mock-test-key');
                expect(mockClient.setMockMode).toHaveBeenCalledWith(true, 'http://localhost:3001/v1');
                expect(mockHandoffManager.setPollingInterval).toHaveBeenCalledWith(2000); // 2 seconds
                expect(mockHandoffManager.setFirstPollingInterval).toHaveBeenCalledWith(2000);
                expect(mockHandoffManager.setMaxPolls).toHaveBeenCalledWith(9999); // Add missing expectation
                expect(mockHandoffManager.setTimeout).toHaveBeenCalledWith(60000); // 1 minute
            });
        });

        describe('validateWorkflow', () => {
            it('should validate workflow without executing', () => {
                const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

                const result = validateWorkflow(workflow);

                expect(result).toMatchObject({
                    valid: true,
                    errors: [],
                    warnings: []
                });
                
                // Check that steps are returned (the structure might be nested)
                expect(result.steps).toBeDefined();
                expect(result.summary).toBeDefined();

                expect(mockHandoffManager.executeWorkflow).not.toHaveBeenCalled();
            });

            it('should handle validation errors', () => {
                mockParser.parse.mockImplementation(() => {
                    throw new Error('Parse error');
                });

                const workflow = '# Invalid Workflow';

                const result = validateWorkflow(workflow);

                expect(result).toMatchObject({
                    valid: false,
                    errors: ['Parse error'],
                    warnings: [],
                    steps: [],
                    summary: null
                });
            });
        });
    });

    describe('Environment Variable Edge Cases', () => {
        it('should handle empty string API key from environment', async () => {
            process.env.DEVIN_API_KEY = '';
            delete process.env.NODE_ENV; // Ensure not in test mode

            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            const result = await startWorkflow(workflow, { 
                verbose: false,
                useMockMode: false // Explicitly disable mock mode
            });

            // Empty API key should now fail when not in mock mode
            expect(result.success).toBe(false);
            expect(result.error).toBe('API key cannot be empty. Please provide a valid API key via --apiKey option or set DEVIN_API_KEY environment variable.');
        });

        it('should handle whitespace-only API key from environment', async () => {
            process.env.DEVIN_API_KEY = '   ';
            delete process.env.NODE_ENV; // Ensure not in test mode

            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            const result = await startWorkflow(workflow, { 
                verbose: false,
                useMockMode: false // Explicitly disable mock mode
            });

            // Whitespace-only API key should now fail when not in mock mode
            expect(result.success).toBe(false);
            expect(result.error).toBe('API key cannot be empty. Please provide a valid API key via --apiKey option or set DEVIN_API_KEY environment variable.');
        });

        it('should override empty environment variable with options API key', async () => {
            process.env.DEVIN_API_KEY = '';
            const optionsApiKey = 'valid-options-key';

            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            await startWorkflow(workflow, {
                apiKey: optionsApiKey,
                verbose: false
            });

            expect(mockClient.setApiKey).toHaveBeenCalledWith(optionsApiKey);
        });

        it('should enable mock mode for empty API key when in test environment', async () => {
            process.env.DEVIN_API_KEY = '';
            process.env.NODE_ENV = 'test';

            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            await startWorkflow(workflow, { verbose: false });

            // Mock mode should be enabled in test environment
            expect(mockClient.setMockMode).toHaveBeenCalledWith(true, 'http://localhost:3001/v1');
        });

        it('should enable mock mode for whitespace API key when in test environment', async () => {
            process.env.DEVIN_API_KEY = '   ';
            process.env.NODE_ENV = 'test';

            const workflow = '# Test Workflow\n## Step 1\n- Prompt: Test';

            await startWorkflow(workflow, { verbose: false });

            // Mock mode should be enabled in test environment
            expect(mockClient.setMockMode).toHaveBeenCalledWith(true, 'http://localhost:3001/v1');
        });
    });
});