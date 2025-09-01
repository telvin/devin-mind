## Overview
This workflow demonstrates advanced Node.js development practices including package management, testing setup, and API development. Ideal for learning modern JavaScript development workflows and automated testing patterns.

## Workflow Steps

## Step 1: Initialize Node.js Project
- Playbook: <none>
- Prompt: Create a new Node.js project with name format `node-api-<randomString>` where randomString is a 8-character alphanumeric string. Initialize with npm, configure package.json with essential metadata, and install express as the main dependency.
- Handoff: Provide the exact project name created and confirm package.json initialization with express dependency

## Step 2: Setup Testing Framework
- Playbook: <none>
- RelyPreviousStep: yes
- Prompt: Using the project from Step 1, install and configure Jest as the testing framework. Create a basic test directory structure with a sample test file. Update package.json scripts to include test commands and ensure the testing environment is properly configured.
- Handoff: Confirm Jest installation, test directory creation, and successful test script execution

## Step 3: Build Basic API Endpoints
- Playbook: <none>
- RelyPreviousStep: yes
- Prompt: Create a simple Express.js server with at least 3 RESTful endpoints (GET, POST, DELETE). Include basic middleware for JSON parsing and error handling. Create corresponding unit tests for each endpoint and ensure all tests pass successfully.
- Handoff: Deliver working API server with documented endpoints and passing test suite

## Dependency Chain Analysis

**Sequential Flow:**
- Step 1: Project Initialization (foundation)
- Step 2 → Step 1 (testing setup requires project structure)
- Step 3 → Step 2 (API development requires testing framework)

## Expected Outcomes

- ✅ Properly initialized Node.js project with dependencies
- ✅ Configured Jest testing framework with sample tests
- ✅ Functional Express.js API with multiple endpoints
- ✅ Comprehensive test coverage for all API endpoints
- ✅ Clean project structure following Node.js best practices

## Development Patterns Demonstrated

- **Project Scaffolding**: Modern Node.js project initialization
- **Dependency Management**: npm package installation and configuration
- **Test-Driven Development**: Testing framework setup and implementation
- **API Design**: RESTful endpoint creation and organization
- **Code Quality**: Automated testing and validation workflows