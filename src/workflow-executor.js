import {WorkflowParser} from './workflow-parser.js';
import {DevinClient} from './devin-client.js';
import {HandoffManager} from './handoff-manager.js';

// Only load dotenv in development/test environments
const loadDotenv = async () => {
    console.log(`workflow-executor => loadDotenv => NODE_ENV=${process.env.NODE_ENV}`);
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        try {
            await import('dotenv/config');
        } catch (err) {
            // dotenv is optional - fail silently if not available
        }
    }
};

// Initialize dotenv loading but don't await it at module level
loadDotenv().catch(() => {
    // Silently handle any errors during dotenv loading
});

/**
 * One-click workflow execution function
 * Handles everything automatically with sensible defaults
 *
 * @param {string} workflow - Markdown workflow content
 * @param {Object} options - Optional configuration
 * @returns {Promise<Object>} Execution results with detailed metrics
 */
export async function startWorkflow(workflow, options = {}) {
    const startTime = Date.now();

    try {
        // Extract options with defaults
        const {
            apiKey = options.apiKey || process.env.DEVIN_API_KEY,
            useMockMode = process.env.NODE_ENV === 'test',
            pollingInterval = 10, // seconds
            firstPollingInterval = 90, // seconds
            maxPolls = 9999, // maximum number of polls
            timeout = 300, // seconds (5 minutes)
            verbose = true,
            mockApiUrl = 'http://localhost:3001/v1',
        } = { ...options };

        // Validate API key - check for empty, null, or whitespace-only values
        if (!useMockMode && (!apiKey || apiKey.trim() === '')) {
            const errorMessage = apiKey === null || apiKey === undefined 
                ? 'API key is required. Please provide it via --apiKey option or set DEVIN_API_KEY environment variable.'
                : 'API key cannot be empty. Please provide a valid API key via --apiKey option or set DEVIN_API_KEY environment variable.';
            
            if (verbose) {
                console.error('\n❌ API Key Validation Failed');
                console.error('=====================================');
                console.error(`Error: ${errorMessage}`);
                console.error('\nHow to fix:');
                console.error('1. Set environment variable: export DEVIN_API_KEY="your-api-key"');
                console.error('2. Or use command line: node script.js --apiKey "your-api-key"');
                console.error('3. Or use mock mode for testing: --mock true\n');
            }
            
            throw new Error(errorMessage);
        }

        if (verbose) {
            console.log('🚀 Starting One-Click Workflow Execution');
            console.log('=========================================');
            console.log(`📊 Configuration:`);
            console.log(`   • Mock Mode: ${useMockMode ? 'Enabled' : 'Disabled'}`);
            console.log(`   • Max Polls: ${maxPolls}`);
            console.log(`   • First Polling Interval: ${firstPollingInterval}s`);
            console.log(`   • Polling Interval: ${pollingInterval}s`);
            console.log(`   • Timeout: ${timeout}s`);
            console.log(`   • API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'Not provided'}\n`);
        }

        // Initialize components
        const parser = new WorkflowParser();
        const client = new DevinClient();
        const handoffManager = new HandoffManager(client);

        // Configure client
        client.setApiKey(apiKey);
        if (useMockMode) {
            client.setMockMode(true, mockApiUrl);
            if (verbose) {
                console.log('🔧 Mock mode enabled - using simulated Devin API');
            }
        }

        // Configure handoff manager with all polling settings
        handoffManager.setPollingInterval(pollingInterval * 1000); // Convert to milliseconds
        handoffManager.setFirstPollingInterval(firstPollingInterval * 1000); // Convert to milliseconds
        handoffManager.setMaxPolls(maxPolls); // Set maximum number of polls
        handoffManager.setTimeout(timeout * 1000); // Convert to milliseconds

        // Parse workflow
        if (verbose) {
            console.log('📋 Parsing workflow...');
        }

        const parsed = parser.parse(workflow);
        const steps = parsed.steps;
        const validation = parser.validateWorkflow(steps);

        if (!validation.valid) {
            throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
        }

        if (verbose) {
            console.log(`   ✅ Parsed ${steps.length} steps successfully`);
            if (validation.warnings.length > 0) {
                console.log(`   ⚠️ Warnings: ${validation.warnings.join(', ')}`);
            }

            // Show workflow summary
            const summary = parser.formatWorkflowSummary(steps);
            console.log(`   📊 Workflow Summary:`);
            console.log(`      • Total steps: ${summary.total_steps}`);
            console.log(`      • Steps with playbooks: ${summary.steps_with_playbooks}`);
            console.log(`      • Steps with handoffs: ${summary.steps_with_handoffs}`);
            console.log(`      • Steps with repos: ${summary.steps_with_repos}`);
            console.log(`      • Steps relying on previous: ${summary.steps_relying_on_previous}\n`);
        }

        // Execute workflow
        if (verbose) {
            console.log('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n');
            // console.log('⚙️ Executing workflow...\n', steps);
        }

        const results = await handoffManager.executeWorkflow(steps);
        const executionTime = Date.now() - startTime;

        // Generate comprehensive results
        const successfulSteps = results.filter(r => r.success);
        const failedSteps = results.filter(r => !r.success);
        console.log('⚙️ After executeWorkflow => results...\n', results);
        const stepsWithHandoffs = successfulSteps.filter(r => r.handoff_result);

        if (verbose) {
            console.log('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n');
            console.log('⚙️ stepsWithHandoffs...\n', stepsWithHandoffs);
        }
        
        const executionSummary = {
            success: failedSteps.length === 0,
            total_steps: results.length,
            successful_steps: successfulSteps.length,
            failed_steps: failedSteps.length,
            steps_with_handoffs: stepsWithHandoffs.length,
            total_execution_time_ms: executionTime,
            average_step_time_ms: successfulSteps.length > 0 ? successfulSteps.reduce((sum, r) => sum + r.execution_time_ms, 0) / successfulSteps.length : 0,
            session_ids: successfulSteps.map(r => r.session_id),
            completion_rate: results.length > 0 ? (successfulSteps.length / results.length) * 100 : 0,
            workflow_config: {
                mock_mode: useMockMode,
                polling_interval: pollingInterval,
                first_polling_interval: firstPollingInterval,
                timeout: timeout,
            },
            step_results: results,
            executed_at: new Date().toISOString(),
        };

        if (verbose) {
            console.log('\n🎯 Execution Complete!');
            console.log('=====================');
            console.log(`✅ Status: ${executionSummary.success ? 'SUCCESS' : 'FAILED'}`);
            console.log(`📊 Steps: ${executionSummary.successful_steps}/${executionSummary.total_steps} completed`);
            console.log(`⏱️ Total Time: ${formatDuration(executionTime)}`);
            console.log(`📈 Completion Rate: ${executionSummary.completion_rate.toFixed(1)}%`);
            console.log(`🎯 Average Step Time: ${formatDuration(executionSummary.average_step_time_ms)}`);

            if (executionSummary.steps_with_handoffs > 0) {
                console.log(`📋 Handoffs Completed: ${executionSummary.steps_with_handoffs}`);
            }

            if (failedSteps.length > 0) {
                console.log(`\n❌ Failed Steps:`);
                failedSteps.forEach(step => {
                    console.log(`   • Step ${step.step_number}: ${step.error}`);
                });
            }

            console.log(`\n📄 Session IDs generated: ${executionSummary.session_ids.length}`);
            executionSummary.session_ids.forEach((sessionId, index) => {
                console.log(`   ${index + 1}. ${sessionId}`);
            });
        }

        return executionSummary;

    } catch (error) {
        const executionTime = Date.now() - startTime;

        if (options.verbose !== false) {
            console.error(`\n❌ Workflow execution failed after ${formatDuration(executionTime)}`);
            console.error(`Error: ${error.message}`);
        }

        return {
            success: false,
            error: error.message,
            total_execution_time_ms: executionTime,
            executed_at: new Date().toISOString(),
            workflow_config: {
                mock_mode: options.useMockMode,
                polling_interval: options.pollingInterval,
                first_polling_interval: options.firstPollingInterval,
                timeout: options.timeout,
            },
        };
    }
}

/**
 * Quick workflow execution with minimal output
 * Perfect for programmatic use
 */
export async function startWorkflowQuiet(workflow, options = {}) {
    return startWorkflow(workflow,
                           {
                               ...options,
                               verbose: false,
                           });
}

/**
 * Execute workflow with mock mode (for testing)
 */
export async function startWorkflowMock(workflow, options = {}) {
    return startWorkflow(workflow, {
        ...options,
        useMockMode: true,
        apiKey: 'mock-test-key',
        pollingInterval: 2, // Faster for testing
        firstPollingInterval: 2, // Faster for testing
        timeout: 60, // Shorter timeout for testing
    });
}

/**
 * Validate workflow without executing
 */
export function validateWorkflow(workflow) {
    try {
        const parser = new WorkflowParser();
        const parsed = parser.parse(workflow);
        const steps = parsed.steps;
        const validation = parser.validateWorkflow(steps);
        
        console.log('workflow-executor => validateWorkflow', steps);
        // Check if steps is null or empty
        if (!validation.valid || !Array.isArray(steps) || steps.length === 0) {
            console.log('workflow-executor => failed due to no steps');
            return {
                valid: false,
                errors: ['Workflow contains no valid steps'],
                warnings: [],
                steps: steps || [],
                summary: null,
            };
        }
        
        const summary = parser.formatWorkflowSummary(steps);

        return {
            valid: validation.valid,
            errors: validation.errors,
            warnings: validation.warnings,
            steps: steps,
            summary: summary,
        };
    } catch (error) {
        return {
            valid: false,
            errors: [error.message],
            warnings: [],
            steps: [],
            summary: null,
        };
    }
}

// Helper function to format duration
function formatDuration(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes === 0) {
        return `${seconds}s`;
    } else if (seconds === 0) {
        return `${minutes}m`;
    } else {
        return `${minutes}m ${seconds}s`;
    }
}

// Export individual components for advanced users
export {
    WorkflowParser,
    DevinClient,
    HandoffManager,
};