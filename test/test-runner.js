import { DevinClient } from '../src/devin-client.js';
import { WorkflowParser } from '../src/workflow-parser.js';
import { HandoffManager } from '../src/handoff-manager.js';

export class MockDevinClient extends DevinClient {
  constructor() {
    super();
    this.setMockMode(true);
    this.setApiKey('mock-test-key-123');
  }

  setMockMode(useMock = true, mockUrl = 'http://localhost:3001/v1') {
    this.useMockAPI = useMock;
    if (useMock) {
      this.baseUrl = mockUrl;
    } else {
      this.baseUrl = 'https://api.devin.ai/v1';
    }
  }
}

export class TestRunner {
  constructor() {
    this.client = new MockDevinClient();
    this.parser = new WorkflowParser();
    this.handoffManager = new HandoffManager(this.client);
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🚀 Starting Devin MCP Server Test Suite\n');
    
    const tests = [
      this.testWorkflowParser,
      this.testSingleSession,
      this.testWorkflowExecution,
      this.testStepDependencies,
      this.testPollingMechanism,
      this.testComplexTenStepWorkflow
    ];

    for (const test of tests) {
      try {
        await test.call(this);
      } catch (error) {
        this.logError(test.name, error);
      }
    }

    this.printSummary();
  }

  async testWorkflowParser() {
    console.log('📋 Testing Workflow Parser...');
    
    const sampleWorkflow = `## Step 1 ##
- Playbook: code-review
- Prompt: Review the pull request for security issues
- Handoff: Provide security assessment report

## Step 2 ##
- RelyPreviousStep: yes
- Prompt: Create documentation for fixes
- Handoff: Generate remediation guide`;

    const steps = this.parser.parse(sampleWorkflow);
    
    this.assert(steps.length === 2, 'Should parse 2 steps');
    this.assert(steps[0].playbook === 'playbook-code-review', 'Should auto-prefix playbook');
    this.assert(steps[0].prompt.includes('security issues'), 'Should parse prompt correctly');
    this.assert(steps[1].rely_previous_step === true, 'Should default rely_previous_step to true');
    
    this.logSuccess('testWorkflowParser', 'Workflow parsing works correctly');
  }

  async testSingleSession() {
    console.log('🔗 Testing Single Session Creation...');
    
    const result = await this.client.createSession(
      'Test creating a single session',
      'test-playbook',
      'Test Session'
    );

    this.assert(result.success === true, 'Session creation should succeed');
    this.assert(result.session_id.startsWith('devin-'), 'Should generate valid session ID');
    this.assert(result.title === 'Test Session', 'Should set correct title');

    // Test getting session status
    const session = await this.client.getSession(result.session_id);
    this.assert(session.success === true, 'Should retrieve session successfully');
    this.assert(session.status === 'running', 'Session should be running initially');

    this.logSuccess('testSingleSession', `Created session: ${result.session_id}`);
    return result.session_id;
  }

  async testWorkflowExecution() {
    console.log('⚙️ Testing Multi-Step Workflow Execution...');
    
    const workflow = `## Step 1 ##
- Playbook: api-testing
- Prompt: Test the authentication API endpoints
- Handoff: Provide API test results

## Step 2 ##
- RelyPreviousStep: yes
- Prompt: Generate test report based on results
- Handoff: Create comprehensive test documentation`;

    const steps = this.parser.parse(workflow);
    
    // Set shorter polling for testing
    this.handoffManager.setPollingInterval(2000); // 2 seconds
    
    const results = await this.handoffManager.executeWorkflow(steps);
    
    this.assert(results.length === 2, 'Should execute both steps');
    this.assert(results[0].success === true, 'First step should succeed');
    this.assert(results[1].success === true, 'Second step should succeed');
    this.assert(results[1].relied_on_previous === true, 'Second step should rely on first');

    this.logSuccess('testWorkflowExecution', `Executed ${results.length} steps successfully`);
    return results;
  }

  async testStepDependencies() {
    console.log('🔄 Testing Step Dependencies...');
    
    const workflow = `## Step 1 ##
- Prompt: Generate base code structure
- Handoff: Provide project skeleton

## Step 2 ##
- RelyPreviousStep: yes
- Prompt: Add authentication to the project
- Handoff: Provide auth implementation

## Step 3 ##
- RelyPreviousStep: no
- Prompt: Run independent security audit
- Handoff: Provide security report`;

    const steps = this.parser.parse(workflow);
    this.handoffManager.setPollingInterval(1500); // Faster for testing

    const results = await this.handoffManager.executeWorkflow(steps);
    
    this.assert(results[0].relied_on_previous === false, 'First step should not rely on previous');
    this.assert(results[1].relied_on_previous === true, 'Second step should rely on first');
    this.assert(results[2].relied_on_previous === false, 'Third step should not rely on previous');

    this.logSuccess('testStepDependencies', 'Step dependencies working correctly');
  }

  async testPollingMechanism() {
    console.log('⏱️ Testing Polling Mechanism...');
    
    const sessionId = await this.testSingleSession();
    
    // Test polling until completion
    const startTime = Date.now();
    const completion = await this.client.waitForCompletion(sessionId, 1000, 30000);
    const duration = Date.now() - startTime;
    
    this.assert(completion.completed === true, 'Session should complete within timeout');
    this.assert(duration > 1000, 'Should take some time to complete');
    this.assert(completion.session.last_devin_message !== null, 'Should have final message');

    this.logSuccess('testPollingMechanism', `Polling completed in ${duration}ms`);
  }

  async testComplexTenStepWorkflow() {
    console.log('🔥 Testing Complex 10-Step Workflow with Full Features...');
    
    const complexWorkflow = `## Step 1 ##
- Playbook: project-analysis
- Prompt: Analyze the requirements for building a secure e-commerce platform
- Handoff: Provide comprehensive technical analysis and architecture recommendations

## Step 2 ##
- Playbook: database-design
- RelyPreviousStep: yes
- Prompt: Design the database schema based on the technical analysis
- Handoff: Deliver complete database design with ERD and migration scripts

## Step 3 ##
- Playbook: api-development
- RelyPreviousStep: yes
- Prompt: Create the REST API endpoints for user management and authentication
- Handoff: Provide working API with authentication middleware

## Step 4 ##
- Playbook: security-review
- RelyPreviousStep: yes
- Prompt: Review the API design for security vulnerabilities and best practices
- Handoff: Generate security assessment report with recommendations

## Step 5 ##
- Playbook: frontend-development
- RelyPreviousStep: no
- Prompt: Create the React frontend components for user registration and login
- Handoff: Deliver complete frontend authentication interface

## Step 6 ##
- Playbook: integration-testing
- RelyPreviousStep: yes
- Prompt: Integrate frontend with the secure API and test the authentication flow
- Handoff: Provide integration test results and working demo

## Step 7 ##
- Playbook: payment-integration
- RelyPreviousStep: no
- Prompt: Implement secure payment processing with Stripe integration
- Handoff: Deliver payment system with security validations

## Step 8 ##
- Playbook: e2e-testing
- RelyPreviousStep: yes
- Prompt: Create end-to-end tests for the complete user journey including payments
- Handoff: Provide comprehensive test suite with coverage report

## Step 9 ##
- Playbook: performance-optimization
- RelyPreviousStep: yes
- Prompt: Optimize the application performance based on test results
- Handoff: Deliver performance improvements and benchmarking report

## Step 10 ##
- Playbook: deployment
- RelyPreviousStep: yes
- Prompt: Deploy the complete e-commerce platform to production with monitoring
- Handoff: Provide deployment guide and monitoring dashboard setup`;

    console.log('   📋 Parsing complex 10-step workflow...');
    const steps = this.parser.parse(complexWorkflow);
    
    // Validate parsing
    this.assert(steps.length === 10, 'Should parse exactly 10 steps');
    this.assert(steps[0].playbook === 'playbook-project-analysis', 'First step should have correct playbook');
    this.assert(steps[4].rely_previous_step === false, 'Step 5 should not rely on previous');
    this.assert(steps[6].rely_previous_step === false, 'Step 7 should not rely on previous');
    this.assert(steps[9].rely_previous_step === true, 'Final step should rely on previous');
    
    console.log('   ⚙️ Executing 10-step workflow with timing validation...');
    
    // Set faster polling for testing
    this.handoffManager.setPollingInterval(1000); // 1 second
    
    const workflowStartTime = Date.now();
    const results = await this.handoffManager.executeWorkflow(steps);
    const workflowEndTime = Date.now();
    const totalWorkflowTime = workflowEndTime - workflowStartTime;
    
    // Validate execution results
    this.assert(results.length === 10, 'Should execute all 10 steps');
    this.assert(results.every(r => r.success), 'All steps should succeed');
    
    // Validate step dependencies
    const stepsDependingOnPrevious = results.filter(r => r.relied_on_previous);
    const stepsIndependent = results.filter(r => !r.relied_on_previous);
    
    this.assert(stepsDependingOnPrevious.length === 7, 'Should have 7 dependent steps');
    this.assert(stepsIndependent.length === 3, 'Should have 3 independent steps (steps 1, 5, 7)');
    
    // Validate timing data
    this.assert(results.every(r => r.execution_time_ms > 0), 'All steps should have execution time');
    this.assert(results.every(r => r.total_elapsed_time_ms > 0), 'All steps should have cumulative time');
    
    // Validate time progression (each step should have increasing total elapsed time)
    for (let i = 1; i < results.length; i++) {
      this.assert(
        results[i].total_elapsed_time_ms > results[i-1].total_elapsed_time_ms,
        `Step ${i+1} total elapsed time should be greater than step ${i}`
      );
    }
    
    // Validate handoff results
    const stepsWithHandoffs = results.filter(r => r.handoff_result);
    this.assert(stepsWithHandoffs.length === 10, 'All steps should have handoff results');
    
    // Validate session IDs are unique
    const sessionIds = results.map(r => r.session_id);
    const uniqueSessionIds = [...new Set(sessionIds)];
    this.assert(uniqueSessionIds.length === 10, 'All steps should have unique session IDs');
    
    // Performance validation
    const averageStepTime = totalWorkflowTime / 10;
    console.log(`   📊 Workflow Performance Metrics:`);
    console.log(`      • Total workflow time: ${this.formatDuration(totalWorkflowTime)}`);
    console.log(`      • Average step time: ${this.formatDuration(averageStepTime)}`);
    console.log(`      • Fastest step: ${this.formatDuration(Math.min(...results.map(r => r.execution_time_ms)))}`);
    console.log(`      • Slowest step: ${this.formatDuration(Math.max(...results.map(r => r.execution_time_ms)))}`);
    
    // Dependency chain validation
    console.log(`   🔗 Dependency Chain Analysis:`);
    for (let i = 0; i < results.length; i++) {
      const step = results[i];
      const dependencyStatus = step.relied_on_previous ? '⬅️ Dependent' : '🆓 Independent';
      console.log(`      Step ${step.step_number}: ${dependencyStatus} (${this.formatDuration(step.execution_time_ms)})`);
    }
    
    this.logSuccess('testComplexTenStepWorkflow', 
      `Successfully executed 10-step workflow in ${this.formatDuration(totalWorkflowTime)} with ${stepsDependingOnPrevious.length} dependent steps`);
    
    return results;
  }

  formatDuration(milliseconds) {
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

  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  logSuccess(testName, message) {
    console.log(`✅ ${testName}: ${message}`);
    this.testResults.push({ test: testName, status: 'PASS', message });
  }

  logError(testName, error) {
    console.log(`❌ ${testName}: ${error.message}`);
    this.testResults.push({ test: testName, status: 'FAIL', message: error.message });
  }

  printSummary() {
    console.log('\n📊 Test Summary:');
    console.log('================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    
    if (failed === 0) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log('\n💥 Some tests failed:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   - ${r.test}: ${r.message}`));
    }
  }
}