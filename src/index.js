#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DevinMCPServer } from './server.js';
import { WorkflowParser } from './workflow-parser.js';
import { DevinClient } from './devin-client.js';
import { HandoffManager } from './handoff-manager.js';

class DevinWorkflowMCPServer {
  constructor() {
    this.workflowParser = new WorkflowParser();
    this.devinClient = new DevinClient();
    this.handoffManager = new HandoffManager(this.devinClient);
    
    this.server = new DevinMCPServer(
      this.workflowParser,
      this.devinClient,
      this.handoffManager
    );
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Devin Workflow MCP Server running on stdio');
  }
}

async function main() {
  const server = new DevinWorkflowMCPServer();
  await server.run();
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});