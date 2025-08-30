# Sample Workflows for Devin MCP Server

This document provides examples of markdown workflows that can be parsed and executed by the Devin MCP server.

## Basic Workflow Format

Each workflow consists of numbered steps with specific parameters:

```markdown
## Step N ##
- Playbook: playbook-id (optional)
- Prompt: description of what to do
- Handoff: instruction for what to deliver
- RelyPreviousStep: yes/no (default: yes)
```

## Example 1: Code Review Workflow

```markdown
## Step 1 ##
- Playbook: code-review
- Prompt: Review the pull request #123 for security vulnerabilities and code quality issues
- Handoff: Provide a comprehensive code review report with security findings

## Step 2 ##
- Playbook: documentation
- RelyPreviousStep: yes
- Prompt: Create documentation for the security fixes identified in the review
- Handoff: Generate a security remediation guide with step-by-step instructions

## Step 3 ##
- RelyPreviousStep: yes
- Prompt: Implement the security fixes based on the remediation guide
- Handoff: Provide the updated code with security improvements
```

## Example 2: Feature Development Workflow

```markdown
## Step 1 ##
- Playbook: feature-planning
- Prompt: Analyze requirements for new user authentication system
- Handoff: Create detailed technical specifications and architecture plan

## Step 2 ##
- Playbook: backend-development
- RelyPreviousStep: yes
- Prompt: Implement the backend authentication API based on the specifications
- Handoff: Provide complete backend code with tests

## Step 3 ##
- Playbook: frontend-development
- RelyPreviousStep: yes
- Prompt: Create the frontend login/registration interface
- Handoff: Deliver frontend components with integration code

## Step 4 ##
- RelyPreviousStep: yes
- Prompt: Integrate frontend and backend and run end-to-end tests
- Handoff: Provide deployment-ready authentication system
```

## Example 3: Bug Investigation Workflow

```markdown
## Step 1 ##
- Prompt: Investigate the memory leak reported in issue #456
- Handoff: Provide root cause analysis of the memory leak

## Step 2 ##
- RelyPreviousStep: yes
- Prompt: Design a fix for the memory leak based on the root cause analysis
- Handoff: Provide detailed fix implementation plan

## Step 3 ##
- RelyPreviousStep: yes
- Prompt: Implement the fix and create tests to prevent regression
- Handoff: Deliver the bug fix with comprehensive tests
```

## Example 4: API Development Workflow

```markdown
## Step 1 ##
- Playbook: api-design
- Prompt: Design REST API for user management system
- Handoff: Provide OpenAPI specification and endpoint documentation

## Step 2 ##
- Playbook: api-implementation
- RelyPreviousStep: yes
- Prompt: Implement the user management API based on the specification
- Handoff: Provide working API with all endpoints implemented

## Step 3 ##
- Playbook: testing
- RelyPreviousStep: no
- Prompt: Create comprehensive API tests including unit and integration tests
- Handoff: Provide complete test suite with coverage report
```

## Example 5: Database Migration Workflow

```markdown
## Step 1 ##
- Playbook: database-analysis
- Prompt: Analyze current database schema for performance optimization
- Handoff: Provide database optimization recommendations

## Step 2 ##
- RelyPreviousStep: yes
- Prompt: Create migration scripts for the recommended optimizations
- Handoff: Provide tested migration scripts with rollback procedures

## Step 3 ##
- RelyPreviousStep: yes
- Prompt: Execute the database migration in staging environment
- Handoff: Provide migration execution report with performance metrics
```

## Parameter Details

### Playbook
- Optional parameter
- Auto-prefixed with "playbook-" if not already present
- Examples: `code-review`, `testing`, `documentation`

### Prompt
- Mandatory parameter
- Contains the main instruction for Devin
- Should be clear and specific

### Handoff
- Optional but recommended
- Specifies what deliverable Devin should prepare
- Used for step-to-step communication

### RelyPreviousStep
- Optional, defaults to `yes`
- `yes`: Appends previous step's handoff result to current prompt
- `no`: Executes step independently

## Usage with MCP Tools

### Parse a workflow:
```javascript
await mcp.callTool('parse_workflow', {
  markdown: workflowContent
});
```

### Execute a complete workflow:
```javascript
await mcp.callTool('execute_workflow', {
  workflow: workflowContent,
  api_key: 'your-devin-api-key',
  polling_interval: 10
});
```

### Execute individual steps:
```javascript
// Create session
const session = await mcp.callTool('create_devin_session', {
  api_key: 'your-api-key',
  prompt: 'Your prompt here',
  playbook_id: 'playbook-name',
  title: 'Session Title'
});

// Check status
const status = await mcp.callTool('get_session_status', {
  api_key: 'your-api-key',
  session_id: session.session_id
});
```

## Best Practices

1. **Clear Prompts**: Make prompts specific and actionable
2. **Meaningful Handoffs**: Specify what you want Devin to deliver
3. **Logical Dependencies**: Use RelyPreviousStep when steps build on each other
4. **Appropriate Playbooks**: Choose playbooks that match the task type
5. **Error Handling**: Monitor execution results for failed steps