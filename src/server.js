import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

export class DevinMCPServer {
  constructor(workflowParser, devinClient, handoffManager) {
    this.workflowParser = workflowParser;
    this.devinClient = devinClient;
    this.handoffManager = handoffManager;
    
    this.server = new Server(
      {
        name: 'devin-workflow-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'parse_workflow',
          description: 'Parse markdown workflow into structured steps with Playbook, Prompt, Handoff, and RelyPreviousStep parameters',
          inputSchema: {
            type: 'object',
            properties: {
              markdown: {
                type: 'string',
                description: 'Markdown workflow content to parse',
              },
            },
            required: ['markdown'],
          },
        },
        {
          name: 'start_workflow',
          description: 'Execute complete multi-step workflow with polling and step dependencies',
          inputSchema: {
            type: 'object',
            properties: {
              workflow: {
                type: 'string',
                description: 'Markdown workflow to execute',
              },
              api_key: {
                type: 'string',
                description: 'Devin API key for authentication',
              },
              polling_interval: {
                type: 'number',
                description: 'Polling interval in seconds (default: 10)',
                default: 10,
              },
            },
            required: ['workflow', 'api_key'],
          },
        },
        {
          name: 'create_devin_session',
          description: 'Create a new Devin AI session using exact API patterns from README.MD',
          inputSchema: {
            type: 'object',
            properties: {
              api_key: {
                type: 'string',
                description: 'Devin API key for authentication',
              },
              prompt: {
                type: 'string',
                description: 'Prompt for session creation (mandatory)',
              },
              playbook_id: {
                type: 'string',
                description: 'Optional playbook ID (auto-prefix with "playbook-" if missing)',
              },
              title: {
                type: 'string',
                description: 'Optional session title',
              },
            },
            required: ['api_key', 'prompt'],
          },
        },
        {
          name: 'chat_devin_session',
          description: 'Send message to existing Devin session',
          inputSchema: {
            type: 'object',
            properties: {
              api_key: {
                type: 'string',
                description: 'Devin API key for authentication',
              },
              session_id: {
                type: 'string',
                description: 'Session ID to send message to',
              },
              message: {
                type: 'string',
                description: 'Message payload to send',
              },
            },
            required: ['api_key', 'session_id', 'message'],
          },
        },
        {
          name: 'get_session_status',
          description: 'Check session completion status and extract last devin_message',
          inputSchema: {
            type: 'object',
            properties: {
              api_key: {
                type: 'string',
                description: 'Devin API key for authentication',
              },
              session_id: {
                type: 'string',
                description: 'Session ID to check',
              },
            },
            required: ['api_key', 'session_id'],
          },
        },
        {
          name: 'configure_polling',
          description: 'Configure polling intervals and timeouts',
          inputSchema: {
            type: 'object',
            properties: {
              interval: {
                type: 'number',
                description: 'Polling interval in seconds',
              },
              timeout: {
                type: 'number',
                description: 'Timeout in seconds for session completion',
              },
            },
            required: ['interval'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'parse_workflow':
            return await this.handleParseWorkflow(args);
          case 'start_workflow':
            return await this.handleExecuteWorkflow(args);
          case 'create_devin_session':
            return await this.handleCreateSession(args);
          case 'chat_devin_session':
            return await this.handleChatSession(args);
          case 'get_session_status':
            return await this.handleGetSessionStatus(args);
          case 'configure_polling':
            return await this.handleConfigurePolling(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool ${name}: ${error.message}`
        );
      }
    });
  }

  async handleParseWorkflow(args) {
    const { markdown } = args;
    const steps = this.workflowParser.parse(markdown);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            steps: steps,
            total_steps: steps.length,
            parsed_at: new Date().toISOString()
          }, null, 2),
        },
      ],
    };
  }

  async handleExecuteWorkflow(args) {
    const { workflow, api_key, polling_interval = 10 } = args;
    
    this.devinClient.setApiKey(api_key);
    this.handoffManager.setPollingInterval(polling_interval * 1000);
    
    const steps = this.workflowParser.parse(workflow);
    // Use startWorkflow instead of executeWorkflow
    const results = await this.handoffManager.startWorkflow(steps);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            workflow_results: results,
            total_steps: steps.length,
            completed_steps: results.length,
            executed_at: new Date().toISOString()
          }, null, 2),
        },
      ],
    };
  }

  async handleCreateSession(args) {
    const { api_key, prompt, playbook_id, title } = args;
    
    this.devinClient.setApiKey(api_key);
    const result = await this.devinClient.createSession(prompt, playbook_id, title);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            session: result,
            created_at: new Date().toISOString()
          }, null, 2),
        },
      ],
    };
  }

  async handleChatSession(args) {
    const { api_key, session_id, message } = args;
    
    this.devinClient.setApiKey(api_key);
    const result = await this.devinClient.chatSession(session_id, message);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message_result: result,
            sent_at: new Date().toISOString()
          }, null, 2),
        },
      ],
    };
  }

  async handleGetSessionStatus(args) {
    const { api_key, session_id } = args;
    
    this.devinClient.setApiKey(api_key);
    const result = await this.devinClient.getSession(session_id);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            session_status: result,
            checked_at: new Date().toISOString()
          }, null, 2),
        },
      ],
    };
  }

  async handleConfigurePolling(args) {
    const { interval, timeout } = args;
    
    this.handoffManager.setPollingInterval(interval * 1000);
    if (timeout) {
      this.handoffManager.setTimeout(timeout * 1000);
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            polling_interval_seconds: interval,
            timeout_seconds: timeout || 'unchanged',
            configured_at: new Date().toISOString()
          }, null, 2),
        },
      ],
    };
  }

  async connect(transport) {
    await this.server.connect(transport);
  }
}