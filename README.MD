# Devin Mind

<div align="center">
  <img src="electron/assets/images/devin-mind-logo-circle.png" alt="Devin Mind Logo" width="200" height="200">
</div>

A comprehensive workflow orchestration tool for Devin AI that enables seamless execution of multi-step workflows, playbook management, and cross-session automation.

## App GUI

![Devin Mind App GUI](https://private-user-images.githubusercontent.com/4418436/484126327-1bf483d2-c54a-4977-9837-f654d05bd5fb.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NTY3MTY1NjYsIm5iZiI6MTc1NjcxNjI2NiwicGF0aCI6Ii80NDE4NDM2LzQ4NDEyNjMyNy0xYmY0ODNkMi1jNTRhLTQ5NzctOTgzNy1mNjU0ZDA1YmQ1ZmIucG5nP1gtQW16LUFsZ29yaXRobT1BV1M0LUhNQUMtU0hBMjU2JlgtQW16LUNyZWRlbnRpYWw9QUtJQVZDT0RZTFNBNTNQUUs0WkElMkYyMDI1MDkwMSUyRnVzLWVhc3QtMSUyRnMzJTJGYXdzNF9yZXF1ZXN0JlgtQW16LURhdGU9MjAyNTA5MDFUMDg0NDI2WiZYLUFtei1FeHBpcmVzPTMwMCZYLUFtei1TaWduYXR1cmU9ODlmZjQzYWZjNjc4YWQzN2NiYmVhZWM0MzBmNzU3N2JlOTExODU0OGI2NTY5ODg1MjkyM2ExOTZlMzU4ZDU3MyZYLUFtei1TaWduZWRIZWFkZXJzPWhvc3QifQ.AJ2BBWDXTAGTcjD9_iwKjbY1epNPzryboN5M_RjjdrA)

## Why Devin Mind is Useful

### 🔗 **Seamless Playbook Integration**
Devin currently limits users to 1 playbook per session, making it cumbersome to chain multiple playbooks together. Devin Mind streamlines this by automatically connecting and executing multiple playbooks across sessions, eliminating manual handoffs.

### 📋 **Workflow-First Approach**
Instead of thinking in terms of individual sessions, Devin Mind lets you focus on the bigger picture - your complete workflow. Plan once, execute seamlessly, regardless of how many Devin sessions are required.

### ⚡ **Automation & Efficiency**
- Automatic polling and session management
- Intelligent handoff between workflow steps
- Reduced manual intervention and context switching
- Consistent execution across complex multi-step processes

### 🎯 **Enhanced Productivity**
- No more copy-pasting results between sessions
- Automatic context preservation across steps
- Parallel execution support for independent tasks
- Centralized workflow management and monitoring

### 🔄 **Reusability & Consistency**
- Define workflows once, run them multiple times
- Version control your automation processes
- Share and collaborate on workflow templates
- Standardize common development patterns

## Features

- **Polling Mechanism**: Automatically poll sessions to detect completion
- **Handoff Management**: Handle step-to-step communication and result passing
- **API Integration**: Direct integration with Devin AI API
- **Markdown Workflow Parsing**: Parse and execute workflows defined in markdown files
- **Cross-Session Orchestration**: Seamlessly chain multiple Devin sessions
- **Desktop Application**: Native macOS and Windows apps for easy workflow management


## Limitations

Devin Mind is designed for executing **proven and repeatable workflows** that have already been validated.  
It is **not intended for experimental or unverified workflows** where human review and correction are still necessary.  

Current limitations include:
- ❌ No built-in error handling for unexpected Devin responses  
- ❌ No checkpoint or approval mechanism when a workflow step requires human validation  
- ✅ Best suited for stable workflows that run successfully end-to-end with minimal supervision

⚠️ That said, **nothing prevents you from running unverified workflows** with Devin Mind.  
Just keep in mind that you may need to manually step into the Devin session yourself and finish with a single 
message: `sleep`
## Installation

### CLI Installation

Install globally via npm:

```bash
npm install -g devin-mind
```

Or install locally in your project:

```bash
npm install devin-mind
```

### Desktop Application - Build from Source

There are no pre-built downloadable binaries due to large file size.  
To use the desktop app, clone this repository and build the distribution for your platform:

```bash
git clone https://github.com/your-repo/devin-mind.git
cd devin-mind
npm install
```

#### Build for All Platforms

```bash
npm run dist
```

#### Build for macOS

```bash
npm run build-mac
```

#### Build for Windows

```bash
npm run build-win
```

#### Build for Linux

```bash
npm run build-linux
```

The generated installers will be available in the `dist/` directory after the build completes.

## Setup

### Environment Variables

Set your Devin API key as an environment variable on your system:

**macOS/Linux:**
```bash
export DEVIN_API_KEY="your-devin-api-key-here"
```

**Windows:**
```cmd
set DEVIN_API_KEY=your-devin-api-key-here
```

**Windows PowerShell:**
```powershell
$env:DEVIN_API_KEY="your-devin-api-key-here"
```

You must also set the `REPO_URL` environment variable to specify the repository host URL that Devin AI will use to detect and operate on repository snapshots for your sessions.  
**REPO_URL should be the repository host URL, not the full repository path.**

**Example:**
- Full repository:  
  `dev.azure.com/{organization}/{project}/_git/my-repo-name`
- `REPO_URL` value:  
  `dev.azure.com/{organization}/{project}/_git/`

```bash
export REPO_URL="dev.azure.com/{organization}/{project}/_git/"
```

Optionally, you can set the `NODE_ENV` environment variable to control the runtime environment (e.g., development, production):

**Example:**
```bash
export NODE_ENV=development
```

**Permanent Setup (recommended):**

Add the environment variables to your shell profile:
- **macOS/Linux:** Add `export DEVIN_API_KEY="your-key"`, `export REPO_URL="your-repo-url"`, and `export NODE_ENV=development` to `~/.bashrc`, `~/.zshrc`, or `~/.profile`
- **Windows:** Use System Properties > Environment Variables to set them permanently

## Usage

### Command Line Interface

```bash
# Basic usage
devin-mind --file path/to/workflow.md

# With custom options
devin-mind --file workflow.md --pollingInterval 15 --timeout 600 --verbose true

# Use mock mode for testing (no API key required)
devin-mind --file workflow.md --mock true
```

### Programmatic Usage

```js
import { startWorkflow } from 'devin-mind';

const workflowContent = `
# My Workflow
## Step 1
- Prompt: Create a simple function
- Handoff: Function created
`;

// Uses DEVIN_API_KEY from environment
const result = await startWorkflow(workflowContent);

// Or provide API key explicitly
const result = await startWorkflow(workflowContent, {
  apiKey: 'your-api-key',
  pollingInterval: 15,
  timeout: 300
});
```

### Parsing a Workflow from Markdown

```js
import { parseWorkflow } from 'devin-mind';

const fs = require('fs');
const markdown = fs.readFileSync('examples/sample-workflows.md', 'utf-8');
const steps = parseWorkflow(markdown);
```

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `apiKey` | `process.env.DEVIN_API_KEY` | Your Devin API key |
| `pollingInterval` | `10` | Polling interval in seconds |
| `firstPollingInterval` | `90` | First poll delay in seconds |
| `timeout` | `300` | Timeout in seconds |
| `verbose` | `true` | Enable detailed logging |
| `useMockMode` | `false` | Use mock API for testing |

## Project Structure

```
devin-mind/
├── package.json
├── index.js
├── src/
│   ├── index.js           # Main entry point
│   ├── server.js          # REST API server
│   ├── workflow-parser.js # Markdown workflow parser
│   ├── devin-client.js    # Devin API client
│   └── handoff-manager.js # Workflow execution orchestrator
├── examples/              # Example workflow markdown files
├── test/                  # Unit tests
└── README.MD
```

## Examples

See the `examples/` directory for sample workflow markdown files and usage scenarios.

## Documentation

- **[Workflow Guidelines](docs/WORKFLOW-GUIDELINE.MD)** - Comprehensive guide on how to structure and format workflows, including detailed explanations of all step attributes (Playbook ID, RelyPreviousStep, Prompt, Handoff, etc.)
- **[App Usage Guide](docs/APP-USAGE-GUIDE.md)** - How to use the Desktop app, including button functions and settings

## Testing

Run all tests:

```bash
npm test
```

Or run a specific test file:

```bash
npm run unit-test-handoff
npm run unit-test-parser
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

MIT