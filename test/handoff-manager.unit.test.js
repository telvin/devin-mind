import {HandoffManager} from '../src/handoff-manager.js';
import {
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
} from '@jest/globals';

// Mock DevinClient for testing
class MockDevinClient {
    constructor() {
        this.sessions = [];
        this.pollCount = 0;
        this.shouldComplete = true;
        this.completionDelay = 0;
    }

    async createSession(prompt, playbook, title) {
        this.sessions.push({
                               prompt,
                               playbook,
                               title,
                           });
        // Simulate a session id and always succeed
        return {
            success: true,
            session_id: `session-${this.sessions.length}`,
        };
    }

    async getSession(sessionId) {
        this.pollCount++;
        
        // For multi-step workflows, we need to track polls per session
        // Extract session number from sessionId (e.g., "session-1" -> 1)
        const sessionNumber = parseInt(sessionId.split('-')[1]);
        const pollsForThisSession = this.pollCount - (sessionNumber - 1) * 2; // Assuming 2 polls per session
        
        // If we should complete and delay is reached for this specific session, return completed session
        if (this.shouldComplete && pollsForThisSession > this.completionDelay) {
            return {
                message_count: 2,
                raw_response: {
                    messages: [
                        {message: `Result for ${sessionId}`}, 
                        {message: 'sleep'}
                    ],
                },
                status: 'completed',
                status_enum: 'COMPLETED',
            };
        }
        
        // Return incomplete session
        return {
            message_count: 1,
            raw_response: {
                messages: [
                    {message: `Partial result for ${sessionId}`}
                ],
            },
            status: 'running',
            status_enum: 'RUNNING',
        };
    }

    isSessionCompleted(status, status_enum) {
        return status === 'completed' || status_enum === 'COMPLETED';
    }
    
    // Helper methods for testing
    setPollBehavior(shouldComplete, completionDelay = 0) {
        this.shouldComplete = shouldComplete;
        this.completionDelay = completionDelay;
        // Don't reset pollCount here - let tests control when to reset
    }
    
    getPollCount() {
        return this.pollCount;
    }
    
    resetPollCount() {
        this.pollCount = 0;
    }
}

describe('HandoffManager', () => {
    let originalRepoUrl;
    let originalNodeEnv;

    beforeEach(() => {
        // Save original environment variables
        originalRepoUrl = process.env.REPO_URL;
        originalNodeEnv = process.env.NODE_ENV;
        
        // Set test environment to skip REPO_URL validation
        process.env.NODE_ENV = 'test';
        // Set test REPO_URL for all tests
        process.env.REPO_URL = 'dev.azure.com/{organization}/{project}/_git/';
    });

    afterEach(() => {
        // Restore original environment variables
        if (originalRepoUrl !== undefined) {
            process.env.REPO_URL = originalRepoUrl;
        } else {
            delete process.env.REPO_URL;
        }
        
        if (originalNodeEnv !== undefined) {
            process.env.NODE_ENV = originalNodeEnv;
        } else {
            delete process.env.NODE_ENV;
        }
    });

    it('should validate REPO_URL environment variable on construction', () => {
        const devinClient = new MockDevinClient();
        
        // Temporarily disable test mode for this specific test
        process.env.NODE_ENV = 'development';
        
        // Test with valid REPO_URL (already set in beforeEach)
        expect(() => {
            new HandoffManager(devinClient);
        }).not.toThrow();

        // Test with missing REPO_URL
        delete process.env.REPO_URL;
        expect(() => {
            new HandoffManager(devinClient);
        }).toThrow('REPO_URL environment variable is required. Please set REPO_URL environment variable with your Azure DevOps URL.');

        // Test with empty REPO_URL
        process.env.REPO_URL = '';
        expect(() => {
            new HandoffManager(devinClient);
        }).toThrow('REPO_URL environment variable is required. Please set REPO_URL environment variable with your Azure DevOps URL.');

        // Test with whitespace-only REPO_URL
        process.env.REPO_URL = '   ';
        expect(() => {
            new HandoffManager(devinClient);
        }).toThrow('REPO_URL environment variable is required. Please set REPO_URL environment variable with your Azure DevOps URL.');

        // Restore for other tests
        process.env.REPO_URL = 'dev.azure.com/{organization}/{project}/_git/';
        process.env.NODE_ENV = 'test';
    });

    it('should inject previous handoff data into the next step when RelyPreviousStep is true', async () => {
        const devinClient = new MockDevinClient();
        const manager = new HandoffManager(devinClient);
        manager.setPollingInterval(1); // fast
        manager.setFirstPollingInterval(1); // fast
        manager.setTimeout(1000);

        const steps = [
            {
                step_number: 1,
                prompt: 'Create a ticket',
                handoff: 'Provide ticket ID, work item type, and confirm successful data extraction with attachment count and linked items summary',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 1',
            }, {
                step_number: 2,
                prompt: 'Process the ticket',
                handoff: 'Provide processing result',
                rely_previous_step: true,
                playbook: null,
                title: 'Step 2',
            }];

        const results = await manager.executeWorkflow(steps);
        expect(results.length).toBe(2);
        // Step 2's prompt should contain the expected sections in order
        const step2Prompt = devinClient.sessions[1].prompt;
        expect(step2Prompt).toContain('- Review and acknowledge the provided context from the previous step:');
        expect(step2Prompt).toContain('Result for session-1');
        expect(step2Prompt).toContain('Process the ticket');
        expect(step2Prompt).toContain('## Expected Output and Requirements');
        expect(step2Prompt).toContain('- Execute the tasks on the provided Tasks section systematically in the specified order');
        expect(step2Prompt).toContain('- Brief the achieved result that includes: \n Provide processing result');
        expect(step2Prompt).toContain('- Lastly, when all of tasks has been executed, type exactly the word "sleep" (without quotes) to indicate completion.It must be a standalone message.');
        
        // Ensure order: Expected Output (with completion), Tasks (with acknowledge), Main Prompt
        const idxExpectedOutput = step2Prompt.indexOf('## Expected Output and Requirements');
        const idxLastly = step2Prompt.indexOf('- Lastly, when all of tasks has been executed');
        const idxTasks = step2Prompt.indexOf('## Tasks');
        const idxAcknowledge = step2Prompt.indexOf('- Review and acknowledge the provided context from the previous step:');
        const idxMainPrompt = step2Prompt.indexOf('Process the ticket');
        
        expect(idxExpectedOutput).toBeLessThan(idxLastly);
        expect(idxLastly).toBeLessThan(idxTasks);
        expect(idxTasks).toBeLessThan(idxAcknowledge);
        expect(idxAcknowledge).toBeLessThan(idxMainPrompt);
    });

    it('should not inject previous handoff data if RelyPreviousStep is false', async () => {
        const devinClient = new MockDevinClient();
        const manager = new HandoffManager(devinClient);
        manager.setPollingInterval(1);
        manager.setFirstPollingInterval(1);
        manager.setTimeout(1000);

        const steps = [
            {
                step_number: 1,
                prompt: 'Create a ticket',
                handoff: 'Provide ticket ID, work item type, and confirm successful data extraction with attachment count and linked items summary',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 1',
            }, {
                step_number: 2,
                prompt: 'Process the ticket',
                handoff: 'Provide processing result',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 2',
            }];

        await manager.executeWorkflow(steps);
        const step2Prompt = devinClient.sessions[1].prompt;
        expect(step2Prompt).not.toContain('- Review and acknowledge the provided context from the previous step:');
    });

    it('should use previous main result if no handoff data is available', async () => {
        const devinClient = new MockDevinClient();
        const manager = new HandoffManager(devinClient);
        manager.setPollingInterval(1);
        manager.setFirstPollingInterval(1);
        manager.setTimeout(1000);

        // Remove handoff from step 1
        const steps = [
            {
                step_number: 1,
                prompt: 'Create a ticket',
                handoff: null,
                rely_previous_step: false,
                playbook: null,
                title: 'Step 1',
            }, {
                step_number: 2,
                prompt: 'Process the ticket',
                handoff: 'Provide processing result',
                rely_previous_step: true,
                playbook: null,
                title: 'Step 2',
            }];

        await manager.executeWorkflow(steps);
        const step2Prompt = devinClient.sessions[1].prompt;
        expect(step2Prompt).toContain('- Review and acknowledge the provided context from the previous step:');
        expect(step2Prompt).toContain('Result for session-1');
        expect(step2Prompt).toContain('Process the ticket');
        expect(step2Prompt).toContain('## Expected Output and Requirements');
        expect(step2Prompt).toContain('- Execute the tasks on the provided Tasks section systematically in the specified order');
        expect(step2Prompt).toContain('- Brief the achieved result that includes: \n Provide processing result');
        expect(step2Prompt).toContain('- Lastly, when all of tasks has been executed, type exactly the word "sleep" (without quotes) to indicate completion.It must be a standalone message.');
        
        // Ensure order: Expected Output (with completion), Tasks (with acknowledge), Main Prompt
        const idxExpectedOutput = step2Prompt.indexOf('## Expected Output and Requirements');
        const idxLastly = step2Prompt.indexOf('- Lastly, when all of tasks has been executed');
        const idxTasks = step2Prompt.indexOf('## Tasks');
        const idxAcknowledge = step2Prompt.indexOf('- Review and acknowledge the provided context from the previous step:');
        const idxMainPrompt = step2Prompt.indexOf('Process the ticket');
        
        expect(idxExpectedOutput).toBeLessThan(idxLastly);
        expect(idxLastly).toBeLessThan(idxTasks);
        expect(idxTasks).toBeLessThan(idxAcknowledge);
        expect(idxAcknowledge).toBeLessThan(idxMainPrompt);
    });

    it('should inject repo information before Tasks section when repo is present', async () => {
        const devinClient = new MockDevinClient();
        const manager = new HandoffManager(devinClient);
        manager.setPollingInterval(1);
        manager.setFirstPollingInterval(1);
        manager.setTimeout(1000);

        const steps = [
            {
                step_number: 1,
                prompt: 'Create a ticket',
                handoff: 'Provide ticket ID and work item type',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 1',
                repo: 'dev.azure.com/{organization}/{project}/_git/staffingboss-reactapp'
            }
        ];

        await manager.executeWorkflow(steps);
        const step1Prompt = devinClient.sessions[0].prompt;
        
        // Verify repo line is present and correctly positioned
        expect(step1Prompt).toContain('- Repo: dev.azure.com/{organization}/{project}/_git/staffingboss-reactapp');
        
        // Verify Expected Output comes before Tasks, and repo line comes before Tasks section
        const expectedOutputIndex = step1Prompt.indexOf('## Expected Output and Requirements');
        const tasksIndex = step1Prompt.indexOf('## Tasks');
        const repoIndex = step1Prompt.indexOf('- Repo:');
        expect(expectedOutputIndex).toBeLessThan(tasksIndex);
        expect(repoIndex).toBeLessThan(tasksIndex);
        
        // Verify the exact format
        expect(step1Prompt).toContain('- Repo: dev.azure.com/{organization}/{project}/_git/staffingboss-reactapp\n\n## Tasks');
    });

    it('should not inject repo information when repo is null or undefined', async () => {
        const devinClient = new MockDevinClient();
        const manager = new HandoffManager(devinClient);
        manager.setPollingInterval(1);
        manager.setFirstPollingInterval(1);
        manager.setTimeout(1000);

        const steps = [
            {
                step_number: 1,
                prompt: 'Create a ticket',
                handoff: 'Provide ticket ID and work item type',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 1',
                repo: null
            },
            {
                step_number: 2,
                prompt: 'Process ticket',
                handoff: 'Provide processing result',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 2'
                // repo is undefined
            }
        ];

        await manager.executeWorkflow(steps);
        
        const step1Prompt = devinClient.sessions[0].prompt;
        const step2Prompt = devinClient.sessions[1].prompt;
        
        // Verify no repo line is present in either step
        expect(step1Prompt).not.toContain('- Repo:');
        expect(step2Prompt).not.toContain('- Repo:');
        
        // Verify Expected Output comes before Tasks section
        expect(step1Prompt).toContain('## Expected Output and Requirements');
        expect(step1Prompt).toContain('## Tasks');
        expect(step2Prompt).toContain('## Expected Output and Requirements');
        expect(step2Prompt).toContain('## Tasks');
    });

    it('should handle repo with previous step data injection correctly', async () => {
        const devinClient = new MockDevinClient();
        const manager = new HandoffManager(devinClient);
        manager.setPollingInterval(1);
        manager.setFirstPollingInterval(1);
        manager.setTimeout(1000);

        const steps = [
            {
                step_number: 1,
                prompt: 'Create a ticket',
                handoff: 'Provide ticket ID and work item type',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 1'
            },
            {
                step_number: 2,
                prompt: 'Process the ticket',
                handoff: 'Provide processing result',
                rely_previous_step: true,
                playbook: null,
                title: 'Step 2',
                repo: 'example-repo'  // Use shortcut that will be expanded
            }
        ];

        await manager.executeWorkflow(steps);
        const step2Prompt = devinClient.sessions[1].prompt;
        
        // Verify repo line is present and positioned correctly (expanded version)
        expect(step2Prompt).toContain('- Repo: dev.azure.com/{organization}/{project}/_git/example-repo');
        
        // Verify the order: Expected Output, then repo before Tasks, then Tasks with previous data
        const expectedOutputIndex = step2Prompt.indexOf('## Expected Output and Requirements');
        const repoIndex = step2Prompt.indexOf('- Repo:');
        const tasksIndex = step2Prompt.indexOf('## Tasks');
        const acknowledgeIndex = step2Prompt.indexOf('- Review and acknowledge the provided context from the previous step:');
        
        expect(expectedOutputIndex).toBeLessThan(repoIndex);
        expect(repoIndex).toBeLessThan(tasksIndex);
        expect(tasksIndex).toBeLessThan(acknowledgeIndex);
        
        // Verify both repo and previous data are present
        expect(step2Prompt).toContain('- Repo: dev.azure.com/{organization}/{project}/_git/example-repo');
        expect(step2Prompt).toContain('- Review and acknowledge the provided context from the previous step:');
        expect(step2Prompt).toContain('Result for session-1');
    });

    it('should expand shortcut repo names to full Azure DevOps URLs', async () => {
        const devinClient = new MockDevinClient();
        const manager = new HandoffManager(devinClient);
        manager.setPollingInterval(1);
        manager.setFirstPollingInterval(1);
        manager.setTimeout(1000);

        const steps = [
            {
                step_number: 1,
                prompt: 'Setup repository',
                handoff: 'Repository ready',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 1',
                repo: 'staffingboss-reactapp'  // shortcut version
            }
        ];

        await manager.executeWorkflow(steps);
        const step1Prompt = devinClient.sessions[0].prompt;
        
        // Verify shortcut is expanded to full URL
        expect(step1Prompt).toContain('- Repo: dev.azure.com/{organization}/{project}/_git/staffingboss-reactapp');
        expect(step1Prompt).not.toContain('- Repo: staffingboss-reactapp\n');
    });

    it('should keep full repo URLs unchanged', async () => {
        const devinClient = new MockDevinClient();
        const manager = new HandoffManager(devinClient);
        manager.setPollingInterval(1);
        manager.setFirstPollingInterval(1);
        manager.setTimeout(1000);

        const steps = [
            {
                step_number: 1,
                prompt: 'Setup repository',
                handoff: 'Repository ready',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 1',
                repo: 'dev.azure.com/{organization}/{project}/_git/staffingboss-reactapp'  // full version
            }
        ];

        await manager.executeWorkflow(steps);
        const step1Prompt = devinClient.sessions[0].prompt;
        
        // Verify full URL remains unchanged
        expect(step1Prompt).toContain('- Repo: dev.azure.com/{organization}/{project}/_git/staffingboss-reactapp');
    });

    it('should handle different shortcut repo names correctly', async () => {
        const devinClient = new MockDevinClient();
        const manager = new HandoffManager(devinClient);
        manager.setPollingInterval(1);
        manager.setFirstPollingInterval(1);
        manager.setTimeout(1000);

        const steps = [
            {
                step_number: 1,
                prompt: 'Setup first repo',
                handoff: 'First repo ready',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 1',
                repo: 'my-frontend-app'
            },
            {
                step_number: 2,
                prompt: 'Setup second repo',
                handoff: 'Second repo ready',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 2',
                repo: 'backend-api'
            }
        ];

        await manager.executeWorkflow(steps);
        
        const step1Prompt = devinClient.sessions[0].prompt;
        const step2Prompt = devinClient.sessions[1].prompt;
        
        // Verify both shortcuts are expanded correctly
        expect(step1Prompt).toContain('- Repo: dev.azure.com/{organization}/{project}/_git/my-frontend-app');
        expect(step2Prompt).toContain('- Repo: dev.azure.com/{organization}/{project}/_git/backend-api');
    });

    it('should handle external URLs without modification', async () => {
        const devinClient = new MockDevinClient();
        const manager = new HandoffManager(devinClient);
        manager.setPollingInterval(1);
        manager.setFirstPollingInterval(1);
        manager.setTimeout(1000);

        const steps = [
            {
                step_number: 1,
                prompt: 'Setup external repo',
                handoff: 'External repo ready',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 1',
                repo: 'https://github.com/example/project'
            }
        ];

        await manager.executeWorkflow(steps);
        const step1Prompt = devinClient.sessions[0].prompt;
        
        // Verify external URL remains unchanged
        expect(step1Prompt).toContain('- Repo: https://github.com/example/project');
    });

    it('should inherit repo from step 1 to subsequent steps when repo is null', async () => {
        const devinClient = new MockDevinClient();
        const manager = new HandoffManager(devinClient);
        manager.setPollingInterval(1);
        manager.setFirstPollingInterval(1);
        manager.setTimeout(1000);

        const steps = [
            {
                step_number: 1,
                prompt: 'Setup repository',
                handoff: 'Repository ready',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 1',
                repo: 'staffingboss-reactapp'  // Step 1 defines repo
            },
            {
                step_number: 2,
                prompt: 'Process code',
                handoff: 'Code processed',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 2',
                repo: null  // Step 2 should inherit repo
            },
            {
                step_number: 3,
                prompt: 'Deploy code',
                handoff: 'Code deployed',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 3',
                repo: null  // Step 3 should also inherit repo
            }
        ];

        await manager.executeWorkflow(steps);
        
        const step1Prompt = devinClient.sessions[0].prompt;
        const step2Prompt = devinClient.sessions[1].prompt;
        const step3Prompt = devinClient.sessions[2].prompt;
        
        // Step 1: Original repo
        expect(step1Prompt).toContain('- Repo: dev.azure.com/{organization}/{project}/_git/staffingboss-reactapp');
        
        // Step 2: Inherited repo
        expect(step2Prompt).toContain('- Repo: dev.azure.com/{organization}/{project}/_git/staffingboss-reactapp');
        
        // Step 3: Inherited repo
        expect(step3Prompt).toContain('- Repo: dev.azure.com/{organization}/{project}/_git/staffingboss-reactapp');
    });

    it('should stop repo inheritance when step explicitly sets repo to "none"', async () => {
        const devinClient = new MockDevinClient();
        const manager = new HandoffManager(devinClient);
        manager.setPollingInterval(1);
        manager.setFirstPollingInterval(1);
        manager.setTimeout(1000);

        const steps = [
            {
                step_number: 1,
                prompt: 'Setup repository',
                handoff: 'Repository ready',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 1',
                repo: 'staffingboss-reactapp'  // Step 1 defines repo
            },
            {
                step_number: 2,
                prompt: 'Process without repo',
                handoff: 'Processing done',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 2',
                repo: 'none'  // Step 2 explicitly sets to none
            },
            {
                step_number: 3,
                prompt: 'Continue processing',
                handoff: 'Continue done',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 3',
                repo: null  // Step 3 should not inherit (inheritance stopped)
            }
        ];

        await manager.executeWorkflow(steps);
        
        const step1Prompt = devinClient.sessions[0].prompt;
        const step2Prompt = devinClient.sessions[1].prompt;
        const step3Prompt = devinClient.sessions[2].prompt;
        
        // Step 1: Original repo
        expect(step1Prompt).toContain('- Repo: dev.azure.com/{organization}/{project}/_git/staffingboss-reactapp');
        
        // Step 2: No repo (explicitly set to none) - but still has Expected Output section first
        expect(step2Prompt).not.toContain('- Repo:');
        expect(step2Prompt).toContain('## Expected Output and Requirements');
        expect(step2Prompt).toContain('## Tasks');
        
        // Step 3: No repo (inheritance stopped) - but still has Expected Output section first
        expect(step3Prompt).not.toContain('- Repo:');
        expect(step3Prompt).toContain('## Expected Output and Requirements');
        expect(step3Prompt).toContain('## Tasks');
    });

    it('should update inheritance when step defines new repo', async () => {
        const devinClient = new MockDevinClient();
        const manager = new HandoffManager(devinClient);
        manager.setPollingInterval(1);
        manager.setFirstPollingInterval(1);
        manager.setTimeout(1000);

        const steps = [
            {
                step_number: 1,
                prompt: 'Setup first repo',
                handoff: 'First repo ready',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 1',
                repo: 'first-repo'  // Step 1 defines first repo
            },
            {
                step_number: 2,
                prompt: 'Switch to second repo',
                handoff: 'Second repo ready',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 2',
                repo: 'second-repo'  // Step 2 defines new repo
            },
            {
                step_number: 3,
                prompt: 'Continue with current repo',
                handoff: 'Work done',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 3',
                repo: null  // Step 3 should inherit second repo
            }
        ];

        await manager.executeWorkflow(steps);
        
        const step1Prompt = devinClient.sessions[0].prompt;
        const step2Prompt = devinClient.sessions[1].prompt;
        const step3Prompt = devinClient.sessions[2].prompt;
        
        // Step 1: First repo
        expect(step1Prompt).toContain('- Repo: dev.azure.com/{organization}/{project}/_git/first-repo');
        
        // Step 2: Second repo
        expect(step2Prompt).toContain('- Repo: dev.azure.com/{organization}/{project}/_git/second-repo');
        
        // Step 3: Inherited second repo
        expect(step3Prompt).toContain('- Repo: dev.azure.com/{organization}/{project}/_git/second-repo');
    });

    it('should not inherit repo when step 1 has no repo defined', async () => {
        const devinClient = new MockDevinClient();
        const manager = new HandoffManager(devinClient);
        manager.setPollingInterval(1);
        manager.setFirstPollingInterval(1);
        manager.setTimeout(1000);

        const steps = [
            {
                step_number: 1,
                prompt: 'Initial setup',
                handoff: 'Setup done',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 1',
                repo: null  // Step 1 has no repo
            },
            {
                step_number: 2,
                prompt: 'Continue work',
                handoff: 'Work done',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 2',
                repo: null  // Step 2 should not inherit anything
            }
        ];

        await manager.executeWorkflow(steps);
        
        const step1Prompt = devinClient.sessions[0].prompt;
        const step2Prompt = devinClient.sessions[1].prompt;
        
        // Both steps should not have repo but still have proper structure
        expect(step1Prompt).not.toContain('- Repo:');
        expect(step1Prompt).toContain('## Expected Output and Requirements');
        expect(step1Prompt).toContain('## Tasks');
        expect(step2Prompt).not.toContain('- Repo:');
        expect(step2Prompt).toContain('## Expected Output and Requirements');
        expect(step2Prompt).toContain('## Tasks');
    });

    it('should handle workflow with two steps, RelyPreviousStep: true', async () => {
        const devinClient = new MockDevinClient();
        const manager = new HandoffManager(devinClient);
        manager.setPollingInterval(1);
        manager.setFirstPollingInterval(1);
        manager.setTimeout(1000);

        const steps = [
            {
                step_number: 1,
                prompt: 'Step 1 prompt',
                handoff: 'Step 1 handoff',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 1'
            },
            {
                step_number: 2,
                prompt: 'Step 2 prompt',
                handoff: 'Step 2 handoff',
                rely_previous_step: true,
                playbook: null,
                title: 'Step 2'
            }
        ];

        await manager.executeWorkflow(steps);
        const step2Prompt = devinClient.sessions[1].prompt;
        // Check for new structure: Expected Output, Tasks, previous step context, then main prompt
        expect(step2Prompt).toContain('- Review and acknowledge the provided context from the previous step:');
        expect(step2Prompt).toContain('Result for session-1');
        expect(step2Prompt).toContain('Step 2 prompt');
        expect(step2Prompt).toContain('## Expected Output and Requirements');
        expect(step2Prompt).toContain('## Tasks');
        // Ensure order: Expected Output, Tasks, previous step context, main prompt
        const idxExpectedOutput = step2Prompt.indexOf('## Expected Output and Requirements');
        const idxTasks = step2Prompt.indexOf('## Tasks');
        const idxAcknowledge = step2Prompt.indexOf('- Review and acknowledge the provided context from the previous step:');
        const idxMainPrompt = step2Prompt.indexOf('Step 2 prompt');
        expect(idxExpectedOutput).toBeLessThan(idxTasks);
        expect(idxTasks).toBeLessThan(idxAcknowledge);
        expect(idxAcknowledge).toBeLessThan(idxMainPrompt);
        // Should NOT contain "## Starting Point" anymore
        expect(step2Prompt).not.toContain('## Starting Point');
        // Should still contain the handoff
        expect(step2Prompt).toContain('Step 2 handoff');
    });

    it('should handle workflow with two steps, RelyPreviousStep: false', async () => {
        const devinClient = new MockDevinClient();
        const manager = new HandoffManager(devinClient);
        manager.setPollingInterval(1);
        manager.setFirstPollingInterval(1);
        manager.setTimeout(1000);

        const steps = [
            {
                step_number: 1,
                prompt: 'Step 1 prompt',
                handoff: 'Step 1 handoff',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 1'
            },
            {
                step_number: 2,
                prompt: 'Step 2 prompt',
                handoff: 'Step 2 handoff',
                rely_previous_step: false,
                playbook: null,
                title: 'Step 2'
            }
        ];

        await manager.executeWorkflow(steps);
        const step2Prompt = devinClient.sessions[1].prompt;
        expect(step2Prompt).not.toContain('- Review and acknowledge the provided context from the previous step:');
        expect(step2Prompt).toContain('Step 2 prompt');
    });

    // Polling Settings Tests
    describe('Polling Settings', () => {
        beforeEach(() => {
            // Set NODE_ENV to test to skip REPO_URL validation
            process.env.NODE_ENV = 'test';
        });

        afterEach(() => {
            // Clean up NODE_ENV
            delete process.env.NODE_ENV;
        });

        it('should respect maxPolls setting and timeout when session never completes', async () => {
            const devinClient = new MockDevinClient();
            const manager = new HandoffManager(devinClient);
            
            // Set very fast polling intervals and low maxPolls for quick test
            manager.setPollingInterval(1); // 1ms
            manager.setFirstPollingInterval(1); // 1ms
            manager.setMaxPolls(3); // Only allow 3 polls
            
            // Configure mock to never complete
            devinClient.setPollBehavior(false);
            
            const steps = [{
                step_number: 1,
                prompt: 'Test prompt',
                handoff: 'Test handoff',
                rely_previous_step: false,
                playbook: null,
                title: 'Test Step'
            }];

            const startTime = Date.now();
            const results = await manager.executeWorkflow(steps);
            const endTime = Date.now();
            
            // Should have made exactly 3 poll attempts
            expect(devinClient.getPollCount()).toBe(3);
            
            // Should complete quickly due to low maxPolls
            expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
            
            // Result should indicate timeout
            expect(results.length).toBe(1);
            expect(results[0].polls_count).toBe(3);
        });

        it('should use different intervals for first poll vs subsequent polls', async () => {
            const devinClient = new MockDevinClient();
            const manager = new HandoffManager(devinClient);
            
            // Set different first and regular polling intervals
            manager.setFirstPollingInterval(1); // 1ms for first poll
            manager.setPollingInterval(1); // 1ms for subsequent polls
            manager.setMaxPolls(3);
            
            // Configure mock to complete after 2 polls
            devinClient.setPollBehavior(true, 2);
            
            const steps = [{
                step_number: 1,
                prompt: 'Test prompt',
                handoff: 'Test handoff',
                rely_previous_step: false,
                playbook: null,
                title: 'Test Step'
            }];

            const startTime = Date.now();
            const results = await manager.executeWorkflow(steps);
            const endTime = Date.now();
            
            // Should have made 3 poll attempts (2 incomplete + 1 complete)
            expect(devinClient.getPollCount()).toBe(3);
            
            // Should complete quickly with 1ms intervals
            expect(endTime - startTime).toBeLessThan(100); // Fast completion
            
            // Result should indicate successful completion
            expect(results.length).toBe(1);
            expect(results[0].success).toBe(true);
            expect(results[0].polls_count).toBe(3);
        });

        it('should complete immediately when session is ready on first poll', async () => {
            const devinClient = new MockDevinClient();
            const manager = new HandoffManager(devinClient);
            
            // Set polling intervals (shouldn't be used since it completes immediately)
            manager.setPollingInterval(1);
            manager.setFirstPollingInterval(1);
            manager.setMaxPolls(10);
            
            // Configure mock to complete immediately (on first poll)
            devinClient.setPollBehavior(true, 0);
            
            const steps = [{
                step_number: 1,
                prompt: 'Test prompt',
                handoff: 'Test handoff',
                rely_previous_step: false,
                playbook: null,
                title: 'Test Step'
            }];

            const startTime = Date.now();
            const results = await manager.executeWorkflow(steps);
            const endTime = Date.now();
            
            // Should have made only 1 poll attempt
            expect(devinClient.getPollCount()).toBe(1);
            
            // Should complete very quickly (no waiting for intervals)
            expect(endTime - startTime).toBeLessThan(50); // Very fast
            
            // Result should indicate successful completion
            expect(results.length).toBe(1);
            expect(results[0].success).toBe(true);
            expect(results[0].polls_count).toBe(1);
        });

        it('should handle maxPolls of 1 correctly', async () => {
            const devinClient = new MockDevinClient();
            const manager = new HandoffManager(devinClient);
            
            // Set maxPolls to 1
            manager.setPollingInterval(1);
            manager.setFirstPollingInterval(1);
            manager.setMaxPolls(1);
            
            // Configure mock to not complete on first poll
            devinClient.setPollBehavior(false);
            
            const steps = [{
                step_number: 1,
                prompt: 'Test prompt',
                handoff: 'Test handoff',
                rely_previous_step: false,
                playbook: null,
                title: 'Test Step'
            }];

            const results = await manager.executeWorkflow(steps);
            
            // Should have made exactly 1 poll attempt
            expect(devinClient.getPollCount()).toBe(1);
            
            // Result should indicate timeout
            expect(results.length).toBe(1);
            expect(results[0].polls_count).toBe(1);
        });

        it('should handle large maxPolls value', async () => {
            const devinClient = new MockDevinClient();
            const manager = new HandoffManager(devinClient);
            
            // Set very large maxPolls
            manager.setPollingInterval(1);
            manager.setFirstPollingInterval(1);
            manager.setMaxPolls(9999);
            
            // Configure mock to complete after 5 polls
            devinClient.setPollBehavior(true, 5);
            
            const steps = [{
                step_number: 1,
                prompt: 'Test prompt',
                handoff: 'Test handoff',
                rely_previous_step: false,
                playbook: null,
                title: 'Test Step'
            }];

            const results = await manager.executeWorkflow(steps);
            
            // Should have made 6 poll attempts (5 incomplete + 1 complete)
            expect(devinClient.getPollCount()).toBe(6);
            
            // Result should indicate successful completion
            expect(results.length).toBe(1);
            expect(results[0].success).toBe(true);
            expect(results[0].polls_count).toBe(6);
        });

        it('should apply polling settings correctly for multiple workflow steps', async () => {
            const devinClient = new MockDevinClient();
            const manager = new HandoffManager(devinClient);
            
            // Set polling settings
            manager.setPollingInterval(1);
            manager.setFirstPollingInterval(1);
            manager.setMaxPolls(2);
            
            const steps = [
                {
                    step_number: 1,
                    prompt: 'Step 1 prompt',
                    handoff: 'Step 1 handoff',
                    rely_previous_step: false,
                    playbook: null,
                    title: 'Step 1'
                },
                {
                    step_number: 2,
                    prompt: 'Step 2 prompt',
                    handoff: 'Step 2 handoff',
                    rely_previous_step: false,
                    playbook: null,
                    title: 'Step 2'
                }
            ];

            // Reset poll count before starting the test
            devinClient.resetPollCount();
            
            // Configure mock to complete after 1 poll for each step
            devinClient.setPollBehavior(true, 1);
            
            const results = await manager.executeWorkflow(steps);
            
            // Should have made 2 polls per step = 4 total
            // (1 incomplete + 1 complete for each step)
            expect(devinClient.getPollCount()).toBe(4);
            
            // Both steps should complete successfully
            expect(results.length).toBe(2);
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(true);
            expect(results[0].polls_count).toBe(2);
            expect(results[1].polls_count).toBe(2);
        });

        it('should validate setter methods work correctly', () => {
            const devinClient = new MockDevinClient();
            const manager = new HandoffManager(devinClient);
            
            // Test default values
            expect(manager.pollingInterval).toBe(10000);
            expect(manager.firstPollingInterval).toBe(90000);
            expect(manager.maxPolls).toBe(9999);
            
            // Test setters
            manager.setPollingInterval(5000);
            manager.setFirstPollingInterval(45000);
            manager.setMaxPolls(100);
            
            expect(manager.pollingInterval).toBe(5000);
            expect(manager.firstPollingInterval).toBe(45000);
            expect(manager.maxPolls).toBe(100);
        });

        it('should use instance maxPolls when parameter is null', async () => {
            const devinClient = new MockDevinClient();
            const manager = new HandoffManager(devinClient);
            
            // Set short polling intervals for testing to avoid timeout
            manager.setPollingInterval(10); // 10ms instead of 10 seconds
            manager.setFirstPollingInterval(10); // 10ms instead of 90 seconds
            
            // Set instance maxPolls
            manager.setMaxPolls(2);
            
            // Call pollSessionUntilSessionDone with null maxPolls (should use instance value)
            devinClient.setPollBehavior(false); // Never complete
            
            const result = await manager.pollSessionUntilSessionDone('test-session', null);
            
            // Should have used instance maxPolls (2)
            expect(devinClient.getPollCount()).toBe(2);
            expect(result.completed).toBe(false);
            expect(result.timeout).toBe(true);
            expect(result.polls_count).toBe(2);
        });

        it('should override instance maxPolls when parameter is provided', async () => {
            const devinClient = new MockDevinClient();
            const manager = new HandoffManager(devinClient);
            
            // Set short polling intervals for testing to avoid timeout
            manager.setPollingInterval(10); // 10ms instead of 10 seconds
            manager.setFirstPollingInterval(10); // 10ms instead of 90 seconds
            
            // Set instance maxPolls to high value
            manager.setMaxPolls(100);
            
            // Call pollSessionUntilSessionDone with explicit maxPolls parameter
            devinClient.setPollBehavior(false); // Never complete
            
            const result = await manager.pollSessionUntilSessionDone('test-session', 3);
            
            // Should have used parameter value (3), not instance value (100)
            expect(devinClient.getPollCount()).toBe(3);
            expect(result.completed).toBe(false);
            expect(result.timeout).toBe(true);
            expect(result.polls_count).toBe(3);
        });
    });
});