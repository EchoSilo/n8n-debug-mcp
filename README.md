# 🔍 n8n Debug MCP

> **Finally, debug n8n workflows like a detective, not a hostage to your logs**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue?logo=typescript)](https://www.typescriptlang.org/)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.0.0+-purple)](https://github.com/modelcontextprotocol/sdk-js)

The **only MCP server built exclusively for debugging n8n workflows**. Stop clicking through the n8n UI hunting for errors. Start asking Claude what went wrong and trace execution chains across your entire workflow architecture.

---

## 😤 The Problem Everyone Knows

You trigger a webhook. Your orchestrator workflow fires. It calls an agent. The agent hits the memory manager. Then... silence.

Something failed. **But where? And why?**

**The n8n debugging nightmare:**
- 🖱️ Click through the UI for 15+ minutes hunting for failed executions
- 📍 Manually correlate timestamps across 3+ workflows to trace execution chains
- 🔍 Copy-paste execution IDs between pages to follow the thread
- 📋 Read raw error messages without context about what data caused the failure
- 🤷 No parent-child execution relationships visible in the API

This is where most n8n debugging tools stop. They give you raw logs. You get to play forensic detective on your own time.

---

## ✨ Meet the Solution

**n8n-debug-mcp** brings AI-powered debugging to your workflow orchestration. With Claude on your side, debugging transforms from a tedious hunt to a conversational investigation.

**What it does:**
- 🔗 **Traces execution chains** across multiple workflows automatically (the MCP no one else built)
- 🔬 **Analyzes errors forensically** with AI-powered fix suggestions
- 💬 **Speaks your language** - debug via natural conversation with Claude
- ⚡ **Saves hours** - seconds to debug what takes minutes manually

### Real Debugging Experience

```
You: "Why did my last task creation fail?"

Claude: [automatically traces execution]
  → Main orchestrator (success)
  → Task Agent (success)
  → Notion Database connector (ERROR: 401 Unauthorized)

Analysis: Your Notion API key may have expired or been revoked.
Suggestion: Verify credentials in n8n Settings > Credentials
```

---

## 🆚 How This is Different

While other n8n MCP servers focus on **building** or **managing** workflows, n8n-debug-mcp specializes in **debugging them**:

| Feature | 🔍 n8n-debug-mcp | 🏗️ Builder MCPs | 📊 Manager MCPs |
|---------|------------------|-----------------|-----------------|
| **Primary Purpose** | Deep debugging | Build workflows | Manage workflows |
| **Cross-Workflow Correlation** | ✅ Advanced intelligent correlation | ❌ Not applicable | ❌ Not applicable |
| **Execution Tracing** | ✅ Full node-by-node with inputs/outputs | ⚠️ Basic execution info | ⚠️ Status only |
| **Error Analysis** | ✅ AI-powered pattern analysis + suggestions | ❌ None | ⚠️ Raw error dump |
| **Forensic Context** | ✅ Shows data that caused failure | ❌ None | ❌ None |
| **Correlation Strategies** | ✅ Timestamps, user IDs, webhook patterns | ❌ Not applicable | ❌ Not applicable |
| **Time to Debug Failure** | ⚡ ~10-30 seconds | N/A | ⏱️ 10-20 minutes |
| **Best For** | Multi-workflow architectures with agents | Creating workflows | Governance & compliance |

---

## 🛠️ Six Powerful Debugging Tools

### 🔗 **list_active_workflows**
List all your workflows with IDs, status, and webhook paths. Perfect for understanding your architecture at a glance.

**Use when:** "What workflows do I have running?"
```
You: "List all my workflows"
Claude: [displays organized list grouped by pattern]
  - MAIN_Orchestrator (webhook: /webhook/main)
  - AGENT_TaskManager (sub-workflow)
  - MEMORY_Manager (sub-workflow)
```

---

### 📊 **get_workflow_executions**
Fetch recent executions for any workflow, filtered by status (success/error/running).

**Use when:** "Show me recent errors in the TaskManager"
```
You: "What failed in TaskManager recently?"
Claude: [lists failed executions with timestamps]
  - Execution #abc123 (2m ago, ERROR)
  - Execution #def456 (15m ago, ERROR)
  - Execution #ghi789 (1h ago, SUCCESS)
```

---

### 🔍 **get_execution_trace**
Full node-by-node execution trace showing inputs, outputs, and timing for every node that ran.

**Use when:** "Walk me through what happened in this execution"
```
You: "Trace execution abc123"
Claude: [shows complete flow]
  1. HTTP Request (input: webhook payload)
     ↓ 245ms
  2. Set Variables (processed user_id)
     ↓ 12ms
  3. Notion Lookup (ERROR: 401)
     Input: { user_id: "123", page_id: "xyz" }
     Error: Unauthorized - API key invalid
```

---

### ⛓️ **get_correlated_executions** ← THE KILLER FEATURE
Automatically traces execution chains across your **entire workflow architecture**. This solves n8n's biggest limitation: no native execution correlation.

**Use when:** "Show me the complete execution story from when the user triggered this"
```
You: "Trace my last webhook call through all workflows"
Claude: [builds execution tree]
  MAIN_Orchestrator (execution #main123) ✅
    ├─ HTTP Request node → user_id: "user456"
    └─ Calls webhook /webhook/agent

  AGENT_TaskManager (execution #agent456) ✅
    ├─ Create task in Notion
    └─ Calls webhook /webhook/memory

  MEMORY_Manager (execution #memory789) ❌ ERROR
    └─ Update memory context
       Error: Rate limit exceeded on Airtable
```

**Correlation Strategy** - Smart multi-method matching:
- **Timestamp proximity** (within 30s window)
- **User ID matching** (user_id in payloads)
- **Webhook URL patterns** (HTTP Request URLs)
- **Request/Response IDs** (your existing correlation patterns)

---

### 🚨 **get_failed_executions**
Quick view of recent failures across all workflows with error summaries.

**Use when:** "What broke in the last hour?"
```
You: "What failed in the last hour?"
Claude: [aggregates recent errors]
  TimeManager (3 failures) - Connection timeout
  DataSync (2 failures) - Missing required fields
  Notion Integration (5 failures) - API rate limit
```

---

### 🔬 **analyze_execution_error**
Deep forensic analysis of a specific failed execution with context-aware debugging.

**Use when:** "Why exactly did this fail? What can I do about it?"
```
You: "Why did execution #abc123 fail?"
Claude: [comprehensive analysis]
  Failed Node: Notion Database Update
  Error: 401 Unauthorized

  Context:
  - Input data was valid (user_id: "123", fields: [...])
  - API key was used from credentials: "notion_prod"
  - Last successful call: 2 hours ago
  - Other Notion calls failing: Yes (4 in last hour)

  Analysis:
  🔍 Pattern: Multiple 401 errors suggest credential issue
  💡 Suggestion: Notion API key may have been revoked or expired

  Next Steps:
  1. Check Notion workspace for revoked integrations
  2. Generate new API key if needed
  3. Update n8n credentials
  4. Re-execute the workflow
```

---

## 🚀 Quick Start

### Prerequisites

- **n8n** running locally or remotely (with API enabled)
- **n8n API Key** (we'll create this in 30 seconds)
- **Node.js 18+** installed

### Step 1: Create an n8n API Key

1. Open n8n: `http://localhost:5678` (or your n8n URL)
2. Go to **Settings → n8n API** (left sidebar)
3. Click **Create API Key**
4. Copy the key (starts with `n8n_api_...`)

### Step 2: Configure Environment

Create a `.env` file in the project root:

```bash
N8N_API_KEY=n8n_api_xxxxxxxxxxxxxxxxxxxxx
N8N_BASE_URL=http://localhost:5678  # Optional, defaults to localhost:5678
```

### Step 3: Install & Run

```bash
# Install dependencies
npm install

# Run in development mode (with auto-reload)
npm run dev

# Or build and run production
npm run build
npm start
```

### Step 4: Test It Works

The MCP server is now available to Claude Desktop and other MCP clients configured with this server.

In Claude Desktop or Claude Code, try:
```
"What workflows do I have?"
```

Claude will use the `list_active_workflows` tool automatically. You're debugging! 🎉

---

## 💡 Pro Tips & Common Scenarios

### Scenario 1: "Something Failed But I Don't Know What"
```
You: "Why did my last workflow execution fail?"

Claude handles:
1. Fetches recent failed executions
2. Gets detailed trace for the most recent failure
3. Analyzes the error with context
4. Suggests remediation steps
```

### Scenario 2: "The Bug is Somewhere in a Chain of Workflows"
```
You: "Trace my last user request through all workflows"

Claude handles:
1. Correlates executions using timestamp + user_id
2. Builds execution tree showing MAIN → AGENT → MEMORY flow
3. Highlights any failures in the chain
4. Shows data transformation at each step
```

### Scenario 3: "This Error Keeps Happening"
```
You: "The Notion integration keeps failing. What's the pattern?"

Claude handles:
1. Gets recent failed executions with Notion
2. Analyzes error patterns
3. Suggests common causes (rate limits, expired credentials, etc.)
4. Recommends fixes
```

### Scenario 4: "I Need to Debug Specific Nodes"
```
You: "Show me the inputs and outputs for all HTTP Request nodes in the last execution"

Claude handles:
1. Gets execution trace
2. Filters to specific node types
3. Displays data flow with formatting
4. Highlights any data issues
```

### Pro Tips
- **Ask in natural language** - Claude understands context about your workflow architecture
- **Use execution IDs** - Have the ID? Claude can drill into specifics
- **Reference user IDs** - "Show me executions for user 123" works with automatic correlation
- **Time windows** - "What failed in the last 2 hours?" triggers the right tool automatically

---

## 🏗️ How Correlation Works

n8n doesn't expose parent-child execution relationships in its API. So we built intelligent correlation using multiple strategies:

### Correlation Methods (Ranked by Confidence)

1. **User Context Matching** (confidence: 0.5-0.8)
   - `user_id` in payload
   - `chat_id` in payload
   - `correlation_id` in payload

2. **Webhook Pattern Matching** (confidence: 0.3)
   - HTTP Request URL matches another workflow's webhook path
   - Indicates sub-workflow call

3. **Timestamp Proximity** (confidence: 0.2-0.3)
   - Execution within 30 second window
   - Ordered by execution start time

4. **Response ID Patterns** (confidence: 0.1-0.2)
   - Existing `response_id` patterns in your data
   - Custom correlation IDs you embed

### Building Execution Trees

Claude uses these methods to construct execution trees:

```
INPUT: execution_id = "abc123"

STEP 1: Fetch execution #abc123 (MAIN_Orchestrator)
  - Extract user_id = "user456"
  - Extract webhook call: /webhook/agent

STEP 2: Find executions with user_id="user456" within 5s window
  - Found: AGENT_TaskManager execution #def456

STEP 3: Repeat for downstream workflows
  - AGENT_TaskManager calls /webhook/memory
  - Found: MEMORY_Manager execution #ghi789

STEP 4: Display tree with results and confidence scores
```

The correlation isn't perfect, but it's vastly better than manual timestamp hunting!

---

## 📚 Technical Documentation

### Available Tools Reference

| Tool | Parameters | Returns |
|------|-----------|---------|
| `list_active_workflows` | `includeInactive` (bool), `includeWebhooks` (bool) | Workflows list with IDs, status, webhooks |
| `get_workflow_executions` | `workflowId` OR `workflowName`, `limit`, `status` | Recent executions list |
| `get_execution_trace` | `executionId`, `summarize` (bool) | Full trace with node inputs/outputs |
| `get_correlated_executions` | `executionId`, `timeWindowMs` | Execution tree across workflows |
| `get_failed_executions` | `workflowId` OR `workflowName`, `limit` | Recent failures with error context |
| `analyze_execution_error` | `executionId` | Deep error analysis + suggestions |

### Environment Variables

```bash
# Required
N8N_API_KEY=n8n_api_xxxxxxxxxxxxx

# Optional
N8N_BASE_URL=http://localhost:5678  # Defaults to localhost:5678
N8N_API_VERSION=v1                   # API version, defaults to v1
```

### Development

```bash
# Run with hot-reload (uses tsx)
npm run dev

# Compile TypeScript
npm run build

# Run compiled JavaScript
npm start

# TypeScript configuration in tsconfig.json
```

---

## 🔗 Resources

- **[n8n Documentation](https://docs.n8n.io/)** - Official n8n docs
- **[MCP Protocol](https://modelcontextprotocol.io/)** - What is MCP?
- **[Claude Desktop](https://claude.ai/download)** - Use this MCP with Claude
- **[Claude Code](https://claude.com/claude-code)** - Or use it via Claude Code CLI

---

## 📄 License

Apache License 2.0 - See [LICENSE](LICENSE) file for details

Built by developers, for developers who are tired of clicking through logs.

---

## Contributing

Found a bug? Have a feature request?

- **Issues**: [GitHub Issues](https://github.com/username/n8n-debug-mcp/issues)
- **Discussions**: Ideas welcome in the community

### Development Contributions

This is TypeScript. Architecture:
- `src/index.ts` - MCP server entry point
- `src/n8n-client.ts` - n8n API wrapper
- `src/correlator.ts` - Execution correlation engine
- `src/formatter.ts` - LLM-optimized output

---

## 🎯 What's Next?

Already installed? Try these:

1. **"List my workflows"** - See your architecture
2. **"Show me recent errors"** - Quick health check
3. **"Why did execution [ID] fail?"** - Deep dive on a specific failure
4. **"Trace my last webhook call"** - See the full execution story

Questions? Ask Claude!

---

<div align="center">

**Debugging workflows should be easy. Finally, it is.**

⭐ If this saves you debugging time, give it a star on GitHub

</div>
