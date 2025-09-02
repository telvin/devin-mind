# Devin Mind Electron App Usage Guide

This guide explains how to use the Devin Mind Electron desktop application to manage and execute your workflows.

## Main Interface

The app provides four primary buttons:

### 1. **Load**
- Select a workflow file in markdown format from your computer.
- The selected file will be loaded and displayed in the app for review and further actions.

### 2. **Validate**
- Checks the loaded workflow file for syntax and formatting errors.
- Displays validation results in the output/progress log area.
- Use this before executing to ensure your workflow is correctly structured.

### 3. **Execute**
- Starts execution of the loaded workflow.
- Sends requests to Devin AI to create and manage sessions for each workflow step.
- Progress and results are shown in the output/progress log.

### 4. **Clear**
- Clears the output/progress log area.
- Useful for resetting the interface before starting a new workflow or after reviewing results.

---

## Session Tab

The **Session Tab** provides an independent workspace for managing individual Devin AI sessions with the following key features:

### Separate Execution Process
- The Session Tab operates with its own isolated execution environment, completely separate from the main workflow execution.
- You can run sessions in the Session Tab while simultaneously executing workflows in the main interface.
- Each session maintains its own state, progress tracking, and result history.

### Session Management Features
- **Create New Sessions**: Start fresh Devin AI sessions for specific tasks or experiments.
- **Monitor Session Progress**: Real-time tracking of session status and execution steps.
- **Session History**: View and manage previously created sessions.
- **Independent Logging**: Session Tab has its own output and progress log, separate from the main workflow log.

### Use Cases
- **Development Testing**: Test individual workflow steps or components before integrating them into larger workflows.
- **Parallel Execution**: Run exploratory sessions while your main workflow is executing.
- **Session Debugging**: Isolate and troubleshoot specific session behaviors without affecting your primary workflow.
- **Quick Tasks**: Execute one-off tasks or queries without needing to create a full workflow file.

### Benefits of Separation
- **Non-Blocking Operations**: Session Tab activities don't interfere with main workflow execution.
- **Resource Isolation**: Each execution context manages its own resources and state.
- **Flexibility**: Switch between different types of work without losing progress in either context.

---

## Settings

Click the **Settings** button (gear icon or labeled "Settings") to open the configuration screen.

You can adjust the following parameters:

- **maxPolls**: Maximum number of polling attempts for each session.
- **pollingInterval**: Time (in seconds) between each poll to check session status.
- **firstPollingInterval**: Initial delay (in seconds) before the first poll after starting a session.

After adjusting settings, save and close the settings screen to apply changes.

---

## Typical Workflow

1. **Load** your workflow markdown file.
2. **Validate** the workflow to check for errors.
3. **Execute** the workflow to run it step-by-step with Devin AI.
4. **Clear** the log when you want to start fresh or after reviewing results.
5. Use **Settings** to fine-tune polling and execution behavior as needed.

---

For more details on workflow file structure, see [Workflow Guidelines](WORKFLOW-GUIDELINE.MD).