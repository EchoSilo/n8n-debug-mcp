#!/usr/bin/env node

import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Load .env file from project root or parent directories
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

// Import tools
import {
  listActiveWorkflowsTool,
  handleListActiveWorkflows,
} from './tools/list-active-workflows.js';
import {
  getWorkflowExecutionsTool,
  handleGetWorkflowExecutions,
} from './tools/get-workflow-executions.js';
import {
  getExecutionTraceTool,
  handleGetExecutionTrace,
} from './tools/get-execution-trace.js';
import {
  getCorrelatedExecutionsTool,
  handleGetCorrelatedExecutions,
} from './tools/get-correlated-executions.js';
import {
  getFailedExecutionsTool,
  handleGetFailedExecutions,
} from './tools/get-failed-executions.js';
import {
  analyzeExecutionErrorTool,
  handleAnalyzeExecutionError,
} from './tools/analyze-execution-error.js';

// Tool definitions
const tools = [
  listActiveWorkflowsTool,
  getWorkflowExecutionsTool,
  getExecutionTraceTool,
  getCorrelatedExecutionsTool,
  getFailedExecutionsTool,
  analyzeExecutionErrorTool,
];

// Create MCP server
const server = new Server(
  {
    name: 'n8n-debug-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: string;

    switch (name) {
      case 'list_active_workflows':
        result = await handleListActiveWorkflows(args as Parameters<typeof handleListActiveWorkflows>[0]);
        break;

      case 'get_workflow_executions':
        result = await handleGetWorkflowExecutions(args as Parameters<typeof handleGetWorkflowExecutions>[0]);
        break;

      case 'get_execution_trace':
        result = await handleGetExecutionTrace(args as Parameters<typeof handleGetExecutionTrace>[0]);
        break;

      case 'get_correlated_executions':
        result = await handleGetCorrelatedExecutions(args as Parameters<typeof handleGetCorrelatedExecutions>[0]);
        break;

      case 'get_failed_executions':
        result = await handleGetFailedExecutions(args as Parameters<typeof handleGetFailedExecutions>[0]);
        break;

      case 'analyze_execution_error':
        result = await handleAnalyzeExecutionError(args as Parameters<typeof handleAnalyzeExecutionError>[0]);
        break;

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }

    return {
      content: [{ type: 'text', text: result }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so it doesn't interfere with MCP protocol
  console.error('n8n-debug-mcp server started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
