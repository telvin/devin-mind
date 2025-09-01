# Devin Mind

A comprehensive workflow orchestration tool for Devin AI that enables seamless execution of multi-step workflows, playbook management, and cross-session automation.

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

### Desktop Application Downloads

**macOS:**
- [Download Devin Mind for macOS](https://github.com/your-repo/devin-mind/releases/latest/download/devin-mind-macos.dmg)
- Requires macOS 10.14 or later

**Windows:**
- [Download Devin Mind for Windows](https://github.com/your-repo/devin-mind/releases/latest/download/devin-mind-windows.exe)
- Requires Windows 10 or later

## Setup

### Environment Variable

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

**Permanent Setup (recommended):**

Add the environment variable to your shell profile:
- **macOS/Linux:** Add `export DEVIN_API_KEY="your-key"` to `~/.bashrc`, `~/.zshrc`, or `~/.profile`
- **Windows:** Use System Properties > Environment Variables to set it permanently

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
**Prompt:** Create a simple function
**Handoff:** Function created
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

### Running the Server

```bash
node src/server.js
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
├── desktop/               # Electron desktop application
├── examples/              # Example workflow markdown files
├── test/                  # Unit tests
└── README.MD
```

## Examples

See the `examples/` directory for sample workflow markdown files and usage scenarios.

## Documentation

- **[Workflow Guidelines](WORKFLOW-GUIDELINE.MD)** - Comprehensive guide on how to structure and format workflows, including detailed explanations of all step attributes (Playbook ID, RelyPreviousStep, Prompt, Handoff, etc.)

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