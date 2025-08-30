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
        // Simulate a session with a last_devin_message
        return {
            message_count: 2,
            raw_response: {
                messages: [
                    {message: `Result for ${sessionId}`}, {message: 'sleep'}],
            },
            status: 'completed',
            status_enum: 'COMPLETED',
        };
    }

    isSessionCompleted(status, status_enum) {
        return status === 'completed' || status_enum === 'COMPLETED';
    }
}

describe('HandoffManager', () => {
    let originalAdoUrl;

    beforeEach(() => {
        // Save original ADO_URL if it exists
        originalAdoUrl = process.env.ADO_URL;
        // Set test ADO_URL for all tests
        process.env.ADO_URL = 'dev.azure.com/access-devops/Access%20Vincere/_git/';
    });

    afterEach(() => {
        // Restore original ADO_URL
        if (originalAdoUrl !== undefined) {
            process.env.ADO_URL = originalAdoUrl;
        } else {
            delete process.env.ADO_URL;
        }
    });

    it('should validate ADO_URL environment variable on construction', () => {
        const devinClient = new MockDevinClient();
        
        // Test with valid ADO_URL (already set in beforeEach)
        expect(() => {
            new HandoffManager(devinClient);
        }).not.toThrow();

        // Test with missing ADO_URL
        delete process.env.ADO_URL;
        expect(() => {
            new HandoffManager(devinClient);
        }).toThrow('ADO_URL environment variable is required. Please set ADO_URL environment variable with your Azure DevOps URL.');

        // Test with empty ADO_URL
        process.env.ADO_URL = '';
        expect(() => {
            new HandoffManager(devinClient);
        }).toThrow('ADO_URL environment variable is required. Please set ADO_URL environment variable with your Azure DevOps URL.');

        // Test with whitespace-only ADO_URL
        process.env.ADO_URL = '   ';
        expect(() => {
            new HandoffManager(devinClient);
        }).toThrow('ADO_URL environment variable is required. Please set ADO_URL environment variable with your Azure DevOps URL.');

        // Restore for other tests
        process.env.ADO_URL = 'dev.azure.com/access-devops/Access%20Vincere/_git/';
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
                repo: 'dev.azure.com/access-devops/Access%20Vincere/_git/staffingboss-reactapp'
            }
        ];

        await manager.executeWorkflow(steps);
        const step1Prompt = devinClient.sessions[0].prompt;
        
        // Verify repo line is present and correctly positioned
        expect(step1Prompt).toContain('- Repo: dev.azure.com/access-devops/Access%20Vincere/_git/staffingboss-reactapp');
        
        // Verify Expected Output comes before Tasks, and repo line comes before Tasks section
        const expectedOutputIndex = step1Prompt.indexOf('## Expected Output and Requirements');
        const tasksIndex = step1Prompt.indexOf('## Tasks');
        const repoIndex = step1Prompt.indexOf('- Repo:');
        expect(expectedOutputIndex).toBeLessThan(tasksIndex);
        expect(repoIndex).toBeLessThan(tasksIndex);
        
        // Verify the exact format
        expect(step1Prompt).toContain('- Repo: dev.azure.com/access-devops/Access%20Vincere/_git/staffingboss-reactapp\n\n## Tasks');
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
        expect(step2Prompt).toContain('- Repo: dev.azure.com/access-devops/Access%20Vincere/_git/example-repo');
        
        // Verify the order: Expected Output, then repo before Tasks, then Tasks with previous data
        const expectedOutputIndex = step2Prompt.indexOf('## Expected Output and Requirements');
        const repoIndex = step2Prompt.indexOf('- Repo:');
        const tasksIndex = step2Prompt.indexOf('## Tasks');
        const acknowledgeIndex = step2Prompt.indexOf('- Review and acknowledge the provided context from the previous step:');
        
        expect(expectedOutputIndex).toBeLessThan(repoIndex);
        expect(repoIndex).toBeLessThan(tasksIndex);
        expect(tasksIndex).toBeLessThan(acknowledgeIndex);
        
        // Verify both repo and previous data are present
        expect(step2Prompt).toContain('- Repo: dev.azure.com/access-devops/Access%20Vincere/_git/example-repo');
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
        expect(step1Prompt).toContain('- Repo: dev.azure.com/access-devops/Access%20Vincere/_git/staffingboss-reactapp');
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
                repo: 'dev.azure.com/access-devops/Access%20Vincere/_git/staffingboss-reactapp'  // full version
            }
        ];

        await manager.executeWorkflow(steps);
        const step1Prompt = devinClient.sessions[0].prompt;
        
        // Verify full URL remains unchanged
        expect(step1Prompt).toContain('- Repo: dev.azure.com/access-devops/Access%20Vincere/_git/staffingboss-reactapp');
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
        expect(step1Prompt).toContain('- Repo: dev.azure.com/access-devops/Access%20Vincere/_git/my-frontend-app');
        expect(step2Prompt).toContain('- Repo: dev.azure.com/access-devops/Access%20Vincere/_git/backend-api');
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
        expect(step1Prompt).toContain('- Repo: dev.azure.com/access-devops/Access%20Vincere/_git/staffingboss-reactapp');
        
        // Step 2: Inherited repo
        expect(step2Prompt).toContain('- Repo: dev.azure.com/access-devops/Access%20Vincere/_git/staffingboss-reactapp');
        
        // Step 3: Inherited repo
        expect(step3Prompt).toContain('- Repo: dev.azure.com/access-devops/Access%20Vincere/_git/staffingboss-reactapp');
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
        expect(step1Prompt).toContain('- Repo: dev.azure.com/access-devops/Access%20Vincere/_git/staffingboss-reactapp');
        
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
        expect(step1Prompt).toContain('- Repo: dev.azure.com/access-devops/Access%20Vincere/_git/first-repo');
        
        // Step 2: Second repo
        expect(step2Prompt).toContain('- Repo: dev.azure.com/access-devops/Access%20Vincere/_git/second-repo');
        
        // Step 3: Inherited second repo
        expect(step3Prompt).toContain('- Repo: dev.azure.com/access-devops/Access%20Vincere/_git/second-repo');
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
});