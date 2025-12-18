# n8n Debug MCP Server

An MCP (Model Context Protocol) server for debugging n8n workflows with cross-workflow execution correlation.

## Features

- **List workflows**: View all active n8n workflows with webhook paths
- **Execution traces**: Full node-by-node traces with inputs/outputs
- **Cross-workflow correlation**: Trace execution chains across multiple workflows
- **Error analysis**: Detailed error context with suggested fixes
- **LLM-optimized output**: Formatted for Claude Code analysis

## Setup

### 1. Create n8n API Key

1. Open n8n: http://localhost:5678
2. Go to **Settings > n8n API**
3. Click **Create API Key**
4. Copy the key (starts with `n8n_api_...`)

### 2. Configure Environment

Add to your `.env` file:

```bash
N8N_API_KEY=n8n_api_xxxxxxxxxxxxx
```

### 3. Install Dependencies

```bash
cd tools/n8n-debug-mcp
npm install
```

### 4. Test the Server

```bash
npm run dev
```

The server is configured in `.mcp.json` and will be available to Claude Code automatically.

## Available Tools

### `list_active_workflows`
List all n8n workflows with their IDs, status, and webhook paths.

```
Parameters:
- includeInactive: boolean (default: false)
- includeWebhooks: boolean (default: true)
```

### `get_workflow_executions`
List recent executions for a specific workflow.

```
Parameters:
- workflowId: string (optional if workflowName provided)
- workflowName: string (partial match)
- limit: number (default: 20)
- status: 'success' | 'error' | 'running' | 'all'
```

### `get_execution_trace`
Get complete execution trace including all node data.

```
Parameters:
- executionId: string (required)
- summarize: boolean (default: false)
```

### `get_correlated_executions`
Find all related executions across workflow chains.

```
Parameters:
- executionId: string (required)
- timeWindowMs: number (default: 30000)
```

### `get_failed_executions`
Get recent failed executions with error details.

```
Parameters:
- workflowId: string (optional)
- workflowName: string (optional)
- limit: number (default: 10)
```

### `analyze_execution_error`
Deep analysis of a failed execution with suggested fixes.

```
Parameters:
- executionId: string (required)
```

## Correlation Strategy

Since n8n doesn't expose parent-child execution relationships, this server correlates executions using:

1. **Timestamp proximity**: Executions within 30s window
2. **User ID match**: `user_id`/`chat_id` in payloads
3. **Webhook URL pattern**: HTTP request URLs matching webhook paths
4. **Response ID pattern**: Your existing `response_id` patterns

## Usage Examples

Ask Claude Code:

- "Why did my last task creation fail?"
- "Show me the full execution chain for my last message"
- "Is the MEMORY_Manager workflow working?"
- "What errors happened in the last hour?"

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Requirements

- Node.js 18+
- n8n running with API enabled
- n8n API key configured
