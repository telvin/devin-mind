# Devin Workflow MCP

A Node.js package for automating multi-step workflows with Devin AI, including polling, handoff management, and API integration.

## Features

- **Polling Mechanism**: Automatically poll sessions to detect completion
- **Handoff Management**: Handle step-to-step communication and result passing
- **API Integration**: Direct integration with Devin AI API
- **Markdown Workflow Parsing**: Parse and execute workflows defined in markdown files

## Installation

```bash
npm install devin-workflow
```

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
node index.js --file path/to/workflow.md

# With custom options
node index.js --file workflow.md --pollingInterval 15 --timeout 600 --verbose true

# Use mock mode for testing (no API key required)
node index.js --file workflow.md --mock true
```

### Programmatic Usage

```js
import { startWorkflow } from 'devin-workflow';

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
import { parseWorkflow } from 'devin-workflow';

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
devin-workflow/
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
```

## Examples

See the `examples/` directory for sample workflow markdown files and usage scenarios.

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