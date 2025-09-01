export class HandoffManager {
    constructor(devinClient) {
        this.devinClient = devinClient;
        this.pollingInterval = 10000; // 10 seconds default
        this.firstPollingInterval = 90000; // 90 seconds default for first poll
        this.timeout = 300000; // 5 minutes default
        this.maxPolls = 9999; // Maximum number of polls default
        this.logHandoffInstructions = true; // New option to log handoff content
        
        // Validate ADO_URL environment variable
        this.validateAdoUrl();
    }

    validateAdoUrl() {
        const adoUrl = process.env.ADO_URL;
        if (!adoUrl || adoUrl.trim() === '') {
            const errorMessage = 'ADO_URL environment variable is required. Please set ADO_URL environment variable with your Azure DevOps URL.';
            console.error('\n❌ ADO_URL Validation Failed');
            console.error('=====================================');
            console.error(`Error: ${errorMessage}`);
            console.error('\nHow to fix:');
            console.error('Set environment variable: export ADO_URL="dev.azure.com/access-devops/Access%20Vincere/_git/"\n');
            throw new Error(errorMessage);
        }
    }

    setPollingInterval(intervalMs) {
        this.pollingInterval = intervalMs;
    }

    setFirstPollingInterval(intervalMs) {
        this.firstPollingInterval = intervalMs;
    }

    setTimeout(timeoutMs) {
        this.timeout = timeoutMs;
    }

    setLogHandoffInstructions(enabled) {
        this.logHandoffInstructions = enabled;
    }

    setMaxPolls(maxPolls) {
        this.maxPolls = maxPolls;
    }

    formatDuration(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        if (minutes === 0) {
            return `${seconds} seconds`;
        } else if (seconds === 0) {
            return `${minutes} minutes`;
        } else {
            return `${minutes} minutes ${seconds} seconds`;
        }
    }

    expandRepoUrl(repo) {
        if (!repo) return null;

        // If it's already a full URL, return as-is
        if (repo.includes('://') || repo.startsWith('dev.azure.com')) {
            return repo;
        }

        // Get ADO_URL from environment variable
        const adoUrl = process.env.ADO_URL;
        if (!adoUrl) {
            throw new Error('ADO_URL environment variable is not set');
        }

        // Ensure ADO_URL ends with a slash for proper concatenation
        const baseUrl = adoUrl.endsWith('/') ? adoUrl : `${adoUrl}/`;

        // If it's a shortcut, expand using the ADO_URL environment variable
        return `${baseUrl}${repo}`;
    }

    async executeWorkflow(steps) {
        const results = [];
        let previousStepResult = null;
        let previousHandoffData = null; // Store handoff data from each step
        let inheritedRepo = null; // Track repo inheritance across steps

        // Start workflow timer
        const workflowStartTime = Date.now();
        console.log(`🚀 Starting workflow execution with ${steps.length} steps (Time: 0 seconds)`);

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const stepStartTime = Date.now();
            const elapsedSinceWorkflowStart = stepStartTime - workflowStartTime;

            console.log(`⚙️ Executing step ${step.step_number}/${steps.length} (Total elapsed: ${this.formatDuration(elapsedSinceWorkflowStart)})`);

            // Handle repo inheritance logic
            if (step.step_number === 1) {
                // Step 1: Set inherited repo if defined, no inheritance behavior
                if (step.repo && !this.isRepoNone(step.repo)) {
                    inheritedRepo = step.repo;
                }
            } else {
                // Step 2+: Handle inheritance
                if (step.repo === null && inheritedRepo) {
                    // No repo defined, inherit from previous
                    step.repo = inheritedRepo;
                } else if (step.repo && this.isRepoNone(step.repo)) {
                    // Explicitly set to "none", don't inherit and clear inheritance
                    step.repo = null;
                    inheritedRepo = null;
                } else if (step.repo && !this.isRepoNone(step.repo)) {
                    // New repo defined, update inheritance
                    inheritedRepo = step.repo;
                }
            }

            // Pass previousHandoffData to executeStep for injection
            const stepResult = await this.executeStep(step, previousStepResult, previousHandoffData, stepStartTime, workflowStartTime);
            results.push(stepResult);

            // Store handoff_result for next step if available, else main_result
            if (stepResult.success) {
                if (stepResult.handoff_result) {
                    previousHandoffData = stepResult.handoff_result;
                } else {
                    previousHandoffData = null;
                }
                if (stepResult.main_result) {
                    previousStepResult = stepResult.main_result;
                }
            }

            const stepEndTime = Date.now();
            const stepDuration = stepEndTime - stepStartTime;
            const totalElapsed = stepEndTime - workflowStartTime;

            console.log(`✅ Step ${step.step_number} completed successfully`);
            console.log(`   📊 Step duration: ${this.formatDuration(stepDuration)}`);
            console.log(`   ⏱️ Total elapsed: ${this.formatDuration(totalElapsed)}`);
        }

        const workflowEndTime = Date.now();
        const totalWorkflowDuration = workflowEndTime - workflowStartTime;
        console.log(`🎯 Workflow completed in ${this.formatDuration(totalWorkflowDuration)}`);

        return results;
    }

    async executeStep(step, previousStepResult, previousHandoffData, stepStartTime, workflowStartTime) {
        // Build Expected Output and Requirements section first
        let expectedOutputSection = `## Expected Output and Requirements`;
         expectedOutputSection += `\n- Execute the tasks on the provided Tasks section systematically in the specified order`;

        if (step.handoff) {
            expectedOutputSection += `\n- Brief the achieved result that includes: \n ${step.handoff}\n`;
        } else {
            expectedOutputSection += `\n- Brief of the achieved result that includes:\n
  - Summary of completed tasks
  - Key outcomes and Expected Output and Requirements
  - Any important findings or decisions made
  - Next steps or recommendations
  - Technical details or artifacts created`;
        }

        // Build Tasks section
        let tasksSection = `## Tasks`;

        // Add repo information if present
        if (step.repo) {
            const fullRepoUrl = this.expandRepoUrl(step.repo);
            tasksSection = `- Repo: ${fullRepoUrl}\n\n${tasksSection}`;
        }

        // If this step relies on previous, prepend previous data to the prompt
        if (step.rely_previous_step && (previousHandoffData || previousStepResult)) {
            let prevData = previousHandoffData || previousStepResult;
            if (typeof prevData === 'string' && prevData.includes('## Expected Output and Requirements')) {
                prevData = prevData.replace('## Expected Output and Requirements', '## Starting Point');
            }
            tasksSection += `\n- Review and acknowledge the provided context from the previous step:\n\n${prevData}`;
        }

        // Build main prompt section
        const mainPromptSection = step.prompt;

        // Build completion instruction
        const completionSection = `- Lastly, when all of tasks has been executed, type exactly the word "sleep" (without quotes) to indicate completion.It must be a standalone message.`;

        // Combine all sections with separators (Expected Output first, then Tasks)
        const finalPrompt = [
            `${expectedOutputSection}\n${completionSection}`, '------', tasksSection, '------', mainPromptSection, '------'].join('\n\n');
        console.log(`executeStep...`, step);
        console.log(`finalPrompt to call...`, finalPrompt);

        // Create session with the main prompt
        const sessionResult = await this.devinClient.createSession(finalPrompt, step.playbook, `Step ${step.step_number}: ` + step.title || `Workflow Step ${step.step_number}`);

        if (!sessionResult.success) {
            throw new Error(`Failed to create session: ${sessionResult.error}`);
        }

        const sessionId = sessionResult.session_id;
        const plainId = sessionId.replace('devin-', '');
        const sessionCreatedTime = Date.now();
        const elapsedAtSessionCreation = sessionCreatedTime - workflowStartTime;

        console.log(`🔗 Created session https://app.devin.ai/sessions/${plainId} for step ${step.step_number} (Total elapsed: ${this.formatDuration(elapsedAtSessionCreation)})`);

        // Wait for main prompt completion using our own polling method
        const mainCompletion = await this.pollSessionUntilSessionDone(sessionId);

        const mainCompletionTime = Date.now();
        const mainExecutionDuration = mainCompletionTime - sessionCreatedTime;
        const elapsedAtMainCompletion = mainCompletionTime - workflowStartTime;

        console.log(`   ✨ Main prompt completed (Execution: ${this.formatDuration(mainExecutionDuration)}, Total elapsed: ${this.formatDuration(elapsedAtMainCompletion)})`);

        // Extract handoff_result if handoff is present
        let handoff_result = null;
        if (step.handoff && mainCompletion.session && mainCompletion.session.last_devin_message) {
            handoff_result = mainCompletion.session.last_devin_message;
        }

        const stepEndTime = Date.now();
        const totalStepDuration = stepEndTime - stepStartTime;
        const totalElapsedAtStepEnd = stepEndTime - workflowStartTime;

        return {
            step_number: step.step_number,
            success: true,
            session_id: sessionId,
            main_result: mainCompletion.session.last_devin_message,
            handoff_instruction: step.handoff,
            handoff_result: handoff_result,
            relied_on_previous: step.rely_previous_step && (previousHandoffData !== null || previousStepResult !== null),
            execution_time_ms: totalStepDuration,
            main_execution_time_ms: mainExecutionDuration,
            total_elapsed_time_ms: totalElapsedAtStepEnd,
            polls_count: mainCompletion.polls_count,
            completed_at: new Date().toISOString(),
            session_status: mainCompletion.session.status,
        };
    }

    // since devin session completion depends on the inactivity timeout of devin system, we cannot rely on the session status alone, so this function cannot be used until we find a better way to determine devin session status
    async pollSessionUntilComplete(sessionId, maxPolls = 30) {
        let pollCount = 0;

        while (pollCount < maxPolls) {
            try {
                const session = await this.devinClient.getSession(sessionId);

                if (this.devinClient.isSessionCompleted(session.status, session.status_enum)) {
                    console.log('Session completed:', session);
                    if (session.message_count > 0 && session.raw_response) {
                        const raw_response = session.raw_response;
                        session.last_devin_message = raw_response.messages[raw_response.messages.length - 1]?.message || '';
                    }

                    return {
                        completed: true,
                        session: session,
                        polls_count: pollCount + 1,
                    };
                }

                pollCount++;

                if (pollCount < maxPolls) {
                    const elapsed = this.formatDuration((pollCount) * this.pollingInterval);
                    console.log(`Polling ${sessionId}: attempt ${pollCount}/${maxPolls}, status: ${session.status}, elapsed: ${elapsed}`);
                    await this.sleep(this.pollingInterval);
                }

            } catch (error) {
                console.error(`Polling error for ${sessionId}:`, error.message);
                pollCount++;

                if (pollCount < maxPolls) {
                    await this.sleep(this.pollingInterval);
                }
            }
        }

        return {
            completed: false,
            timeout: true,
            polls_count: pollCount,
        };
    }

    async pollSessionUntilSessionDone(sessionId, maxPolls = null) {
        // Use instance maxPolls if not provided as parameter
        const effectiveMaxPolls = maxPolls !== null ? maxPolls : this.maxPolls;
        let pollCount = 0;
        
        while (pollCount < effectiveMaxPolls) {
            try {
                const session = await this.devinClient.getSession(sessionId);
                if (session.message_count > 0 && session.raw_response) {
                    const raw_response = session.raw_response;
                    const last_devin_message = raw_response.messages[raw_response.messages.length - 1]?.message || '';
                    session.last_devin_message = raw_response.messages[raw_response.messages.length - 2]?.message || '';

                    if (last_devin_message === 'sleep' || this.devinClient.isSessionCompleted(session.status, session.status_enum)) {
                        return {
                            completed: true,
                            session: session,
                            polls_count: pollCount + 1,
                        };
                    }
                }

                pollCount++;
                if (pollCount < effectiveMaxPolls) {
                    // Use different intervals for first poll vs subsequent polls
                    const currentInterval = pollCount === 1 ? this.firstPollingInterval : this.pollingInterval;
                    const elapsed = this.formatDuration((pollCount === 1 ? this.firstPollingInterval : (this.firstPollingInterval + (pollCount - 1) * this.pollingInterval)));
                    console.log(`Polling ${sessionId} (Done): attempt ${pollCount}/${effectiveMaxPolls}, interval: ${this.formatDuration(currentInterval)}, elapsed: ${elapsed}`);
                    await this.sleep(currentInterval);
                }
            } catch (error) {
                console.error(`Polling error for ${sessionId} (Done):`, error.message);
                pollCount++;
                if (pollCount < effectiveMaxPolls) {
                    const currentInterval = pollCount === 1 ? this.firstPollingInterval : this.pollingInterval;
                    await this.sleep(currentInterval);
                }
            }
        }
        return {
            completed: false,
            timeout: true,
            polls_count: pollCount,
        };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    isRepoNone(repo) {
        if (!repo || typeof repo !== 'string') return false;
        return repo.toLowerCase().trim() === 'none';
    }
}