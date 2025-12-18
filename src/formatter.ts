import { N8nExecution, N8nWorkflow, N8nNodeExecutionData, N8nClient } from './n8n-client.js';

/**
 * Format execution trace for LLM consumption
 */
export function formatExecutionTrace(
  execution: N8nExecution,
  workflow?: N8nWorkflow,
  options: { summarize?: boolean; maxPayloadSize?: number } = {}
): string {
  const { summarize = false, maxPayloadSize = 500 } = options;
  const client = new N8nClient();

  const lines: string[] = [];
  const duration = client.getExecutionDuration(execution);
  const error = client.extractError(execution);

  // Header
  lines.push(`EXECUTION: ${execution.id}`);
  lines.push(`WORKFLOW: ${workflow?.name || execution.workflowData?.name || execution.workflowId}`);
  lines.push(`STATUS: ${execution.status} | TIME: ${duration ? `${duration.toFixed(1)}s` : 'running'} | STARTED: ${execution.startedAt}`);
  lines.push('');

  // Node trace
  const runData = execution.data?.resultData?.runData;
  if (runData) {
    const nodeCount = Object.keys(runData).length;
    lines.push(`NODE TRACE (${nodeCount} nodes):`);
    lines.push('');

    let index = 1;
    for (const [nodeName, nodeRuns] of Object.entries(runData)) {
      for (const run of nodeRuns) {
        const status = run.error ? 'ERROR' : (run.executionStatus || 'SUCCESS');
        const time = run.executionTime ? `${run.executionTime}ms` : '?ms';

        lines.push(`${index}. [${nodeName}] ${time} -> ${status}`);

        // Input/Output data
        if (!summarize) {
          const mainData = run.data?.main?.[0]?.[0]?.json;
          if (mainData) {
            const dataStr = JSON.stringify(mainData, null, 2);
            if (dataStr.length > maxPayloadSize) {
              lines.push(`   Output: ${dataStr.substring(0, maxPayloadSize)}... (truncated)`);
            } else {
              lines.push(`   Output: ${dataStr}`);
            }
          }
        }

        // Error details
        if (run.error) {
          lines.push(`   ERROR: ${run.error.message}`);
        }

        lines.push('');
        index++;
      }
    }
  }

  // Error summary
  if (error) {
    lines.push('---');
    lines.push('ERROR DETAILS:');
    lines.push(`Node: ${error.node}`);
    lines.push(`Message: ${error.message}`);
    if (error.stack) {
      lines.push(`Stack: ${error.stack.split('\n').slice(0, 5).join('\n')}`);
    }
  } else if (execution.status === 'success') {
    lines.push('ERRORS: None');
  }

  return lines.join('\n');
}

/**
 * Format workflow list for LLM consumption
 */
export function formatWorkflowList(
  workflows: N8nWorkflow[],
  options: { includeWebhooks?: boolean } = {}
): string {
  const { includeWebhooks = true } = options;
  const client = new N8nClient();

  const lines: string[] = [];
  lines.push(`ACTIVE WORKFLOWS (${workflows.filter(w => w.active).length} active, ${workflows.length} total):`);
  lines.push('');

  // Group by category (based on naming convention)
  const groups: Record<string, N8nWorkflow[]> = {
    'Core': [],
    'Agents': [],
    'Marcus': [],
    'Other': [],
  };

  for (const wf of workflows) {
    if (wf.name.startsWith('MAIN_') || wf.name.startsWith('MEMORY_')) {
      groups['Core'].push(wf);
    } else if (wf.name.startsWith('AGENT_')) {
      groups['Agents'].push(wf);
    } else if (wf.name.startsWith('MARCUS_') || wf.name.toLowerCase().includes('marcus')) {
      groups['Marcus'].push(wf);
    } else {
      groups['Other'].push(wf);
    }
  }

  for (const [groupName, groupWorkflows] of Object.entries(groups)) {
    if (groupWorkflows.length === 0) continue;

    lines.push(`${groupName}:`);
    for (const wf of groupWorkflows) {
      const status = wf.active ? '' : ' (INACTIVE)';
      lines.push(`  - ${wf.name}${status} (ID: ${wf.id})`);

      if (includeWebhooks && wf.nodes) {
        const webhooks = client.extractWebhookPaths(wf);
        if (webhooks.length > 0) {
          lines.push(`    Webhooks: ${webhooks.join(', ')}`);
        }
        if (client.hasSubWorkflowTrigger(wf)) {
          lines.push(`    Sub-workflow trigger: Yes`);
        }
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format execution list for LLM consumption
 */
export function formatExecutionList(
  executions: N8nExecution[],
  workflowName?: string
): string {
  const client = new N8nClient();
  const lines: string[] = [];

  const title = workflowName
    ? `EXECUTIONS for ${workflowName} (${executions.length}):`
    : `RECENT EXECUTIONS (${executions.length}):`;

  lines.push(title);
  lines.push('');

  // Summary counts
  const success = executions.filter(e => e.status === 'success').length;
  const failed = executions.filter(e => e.status === 'error').length;
  const running = executions.filter(e => e.status === 'running').length;
  lines.push(`Summary: ${success} success, ${failed} failed, ${running} running`);
  lines.push('');

  for (const exec of executions) {
    const duration = client.getExecutionDuration(exec);
    const durationStr = duration ? `${duration.toFixed(1)}s` : 'running';
    const statusIcon = exec.status === 'success' ? 'OK' : exec.status === 'error' ? 'ERR' : 'RUN';

    lines.push(`[${statusIcon}] ${exec.id} - ${durationStr} - ${exec.startedAt}`);

    if (exec.status === 'error') {
      const error = client.extractError(exec);
      if (error) {
        lines.push(`     Failed at: [${error.node}]`);
        lines.push(`     Error: ${error.message.substring(0, 100)}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Format failed executions with error details
 */
export function formatFailedExecutions(
  executions: N8nExecution[],
  workflows: Map<string, string>  // workflowId -> name
): string {
  const client = new N8nClient();
  const lines: string[] = [];

  const failed = executions.filter(e => e.status === 'error');
  lines.push(`FAILED EXECUTIONS (${failed.length}):`);
  lines.push('');

  if (failed.length === 0) {
    lines.push('No failed executions in the specified time range.');
    return lines.join('\n');
  }

  let index = 1;
  for (const exec of failed) {
    const workflowName = workflows.get(exec.workflowId) || exec.workflowId;
    const error = client.extractError(exec);

    lines.push(`${index}. ${workflowName} - ${exec.id}`);
    if (error) {
      lines.push(`   Failed at: [${error.node}]`);
      lines.push(`   Error: "${error.message}"`);
    }
    lines.push(`   Time: ${exec.startedAt}`);
    lines.push('');
    index++;
  }

  return lines.join('\n');
}

/**
 * Format correlation tree
 */
export function formatCorrelationTree(
  rootExecution: N8nExecution,
  correlatedExecutions: Array<{
    execution: N8nExecution;
    parentId: string;
    confidence: number;
    method: string;
  }>,
  workflows: Map<string, string>
): string {
  const client = new N8nClient();
  const lines: string[] = [];

  const rootName = workflows.get(rootExecution.workflowId) || rootExecution.workflowId;
  const rootDuration = client.getExecutionDuration(rootExecution);
  const userContext = client.extractUserContext(rootExecution);

  lines.push(`CORRELATION CHAIN for execution ${rootExecution.id}`);
  if (userContext.userId || userContext.chatId) {
    lines.push(`User: ${userContext.userId || userContext.chatId}`);
  }
  lines.push('');

  lines.push('EXECUTION TREE:');
  lines.push(`[ROOT] ${rootExecution.id} - ${rootName} (${rootDuration?.toFixed(1) || '?'}s)`);

  // Build tree structure
  const byParent = new Map<string, typeof correlatedExecutions>();
  for (const corr of correlatedExecutions) {
    const existing = byParent.get(corr.parentId) || [];
    existing.push(corr);
    byParent.set(corr.parentId, existing);
  }

  // Recursive tree printer
  function printChildren(parentId: string, indent: string): void {
    const children = byParent.get(parentId) || [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const isLast = i === children.length - 1;
      const prefix = isLast ? '└── ' : '├── ';
      const childIndent = isLast ? '    ' : '│   ';

      const name = workflows.get(child.execution.workflowId) || child.execution.workflowId;
      const duration = client.getExecutionDuration(child.execution);
      const status = child.execution.status === 'error' ? ' [ERROR]' : '';

      lines.push(`${indent}${prefix}${child.execution.id} - ${name} (${duration?.toFixed(1) || '?'}s)${status}`);

      printChildren(child.execution.id, indent + childIndent);
    }
  }

  printChildren(rootExecution.id, '  ');

  lines.push('');

  // Correlation method summary
  const methods = [...new Set(correlatedExecutions.map(c => c.method))];
  const avgConfidence = correlatedExecutions.length > 0
    ? correlatedExecutions.reduce((sum, c) => sum + c.confidence, 0) / correlatedExecutions.length
    : 0;

  lines.push(`CORRELATION METHOD: ${methods.join(' + ')}`);
  lines.push(`CONFIDENCE: ${avgConfidence > 0.8 ? 'HIGH' : avgConfidence > 0.5 ? 'MEDIUM' : 'LOW'} (${(avgConfidence * 100).toFixed(0)}%)`);

  return lines.join('\n');
}

/**
 * Format error analysis
 */
export function formatErrorAnalysis(
  execution: N8nExecution,
  workflow: N8nWorkflow,
  relatedExecutions?: N8nExecution[]
): string {
  const client = new N8nClient();
  const lines: string[] = [];

  const error = client.extractError(execution);

  lines.push('ERROR ANALYSIS');
  lines.push('==============');
  lines.push('');
  lines.push(`Workflow: ${workflow.name}`);
  lines.push(`Execution: ${execution.id}`);
  lines.push(`Time: ${execution.startedAt}`);
  lines.push('');

  if (!error) {
    lines.push('No error found in this execution.');
    return lines.join('\n');
  }

  lines.push('FAILURE POINT:');
  lines.push(`  Node: ${error.node}`);
  lines.push(`  Error: ${error.message}`);
  lines.push('');

  // Find the failed node in workflow
  const failedNode = workflow.nodes?.find(n => n.name === error.node);
  if (failedNode) {
    lines.push('NODE DETAILS:');
    lines.push(`  Type: ${failedNode.type}`);
    lines.push(`  Parameters: ${JSON.stringify(failedNode.parameters, null, 2).substring(0, 500)}`);
    lines.push('');
  }

  // Input to failed node
  const runData = execution.data?.resultData?.runData;
  if (runData) {
    const failedNodeData = runData[error.node];
    if (failedNodeData?.[0]) {
      lines.push('INPUT TO FAILED NODE:');
      const inputData = failedNodeData[0].data?.main?.[0]?.[0]?.json;
      if (inputData) {
        const inputStr = JSON.stringify(inputData, null, 2);
        lines.push(inputStr.length > 1000 ? inputStr.substring(0, 1000) + '...' : inputStr);
      }
      lines.push('');
    }
  }

  // Suggestions based on error patterns
  lines.push('POSSIBLE CAUSES:');
  const suggestions = analyzeErrorPattern(error.message, failedNode?.type);
  for (const suggestion of suggestions) {
    lines.push(`  - ${suggestion}`);
  }

  return lines.join('\n');
}

/**
 * Analyze error patterns and suggest fixes
 */
function analyzeErrorPattern(errorMessage: string, nodeType?: string): string[] {
  const suggestions: string[] = [];
  const msg = errorMessage.toLowerCase();

  // Connection errors
  if (msg.includes('econnrefused') || msg.includes('connection refused')) {
    suggestions.push('Target service is not running or not accessible');
    suggestions.push('Check if the webhook/service URL is correct');
    suggestions.push('Verify network connectivity and firewall rules');
  }

  // Timeout
  if (msg.includes('timeout') || msg.includes('timed out')) {
    suggestions.push('Request took too long - target service may be overloaded');
    suggestions.push('Consider increasing timeout settings');
    suggestions.push('Check target service performance');
  }

  // Authentication
  if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('authentication')) {
    suggestions.push('API credentials may be invalid or expired');
    suggestions.push('Check credential configuration in n8n');
    suggestions.push('Verify API key/token permissions');
  }

  // Not found
  if (msg.includes('404') || msg.includes('not found')) {
    suggestions.push('Resource or endpoint does not exist');
    suggestions.push('Check URL path and parameters');
    suggestions.push('Verify the resource ID is correct');
  }

  // Validation errors
  if (msg.includes('invalid') || msg.includes('validation') || msg.includes('required')) {
    suggestions.push('Input data may be missing required fields');
    suggestions.push('Check data types match expected format');
    suggestions.push('Review input from previous node');
  }

  // Notion specific
  if (nodeType?.includes('notion') || msg.includes('notion')) {
    suggestions.push('Check Notion database ID is correct');
    suggestions.push('Verify property names match Notion schema');
    suggestions.push('Ensure Notion integration has access to the database');
  }

  // Default
  if (suggestions.length === 0) {
    suggestions.push('Review the error message for specific details');
    suggestions.push('Check input data from previous nodes');
    suggestions.push('Verify node configuration and credentials');
  }

  return suggestions;
}
