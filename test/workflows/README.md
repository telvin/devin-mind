# Test Workflow Collection

This directory contains comprehensive workflow examples for testing the Devin MCP Server with various complexity levels and real-world scenarios.

## Available Workflows

### 🛒 E-Commerce Platform Development
**File**: `ecommerce-platform-workflow.md`  
**Complexity**: Advanced (10 Steps)  
**Duration**: 2-3 hours  
**Focus**: Full-stack e-commerce development with microservices

### 🔧 Microservices Architecture  
**File**: `microservices-architecture-workflow.md`  
**Complexity**: Advanced (8 Steps)  
**Duration**: 1.5-2 hours  
**Focus**: Distributed systems and service mesh

### 🚀 DevOps CI/CD Pipeline
**File**: `devops-cicd-pipeline-workflow.md`  
**Complexity**: Intermediate (6 Steps)  
**Duration**: 1-1.5 hours  
**Focus**: Infrastructure automation and deployment

## Workflow Features Tested

Each workflow demonstrates different aspects of the MCP server:

- **Step Dependencies**: Mix of dependent and independent steps
- **Playbook Integration**: Various playbook types and auto-prefixing
- **Handoff Management**: Complex result passing between steps
- **Timing Validation**: Performance tracking and optimization
- **Error Handling**: Robust failure recovery
- **Session Management**: Unique session creation and polling

## Usage Examples

### Load Workflow from File
```javascript
import { readFileSync } from 'fs';

const workflowContent = readFileSync('test/workflows/ecommerce-platform-workflow.md', 'utf8');
const steps = parser.parse(workflowContent);
```

### Execute with MCP Tools
```javascript
await mcp.callTool('execute_workflow', {
  workflow: workflowContent,
  api_key: 'your-devin-api-key',
  polling_interval: 10
});
```

## Testing Integration

These workflows are automatically used by:
- `test-runner.js` - Core functionality testing
- `complex-workflow-tests.js` - Advanced scenario validation
- `test-flow.js` - Full integration testing

## Performance Benchmarks

Expected execution times with mock API:
- **E-Commerce**: ~2-3 minutes (10 steps)
- **Microservices**: ~1.5-2 minutes (8 steps)  
- **DevOps**: ~1-1.5 minutes (6 steps)

With real Devin API, times will vary based on task complexity and current API response times.