import { N8nClient } from '../n8n-client.js';
import { formatFailedExecutions } from '../formatter.js';

export const getFailedExecutionsTool = {
  name: 'get_failed_executions',
  description: 'Get recent failed executions with error details and context. Use this to quickly identify and diagnose failures.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      workflowId: {
        type: 'string',
        description: 'Filter by workflow ID (optional)',
      },
      workflowName: {
        type: 'string',
        description: 'Filter by workflow name (partial match, optional)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of failed executions to return',
        default: 10,
      },
    },
  },
};

export async function handleGetFailedExecutions(
  args: { workflowId?: string; workflowName?: string; limit?: number }
): Promise<string> {
  const client = new N8nClient();

  try {
    let workflowId = args.workflowId;

    // If name provided, find workflow ID
    if (!workflowId && args.workflowName) {
      const { data: workflows } = await client.listWorkflows();
      const match = workflows.find(wf =>
        wf.name.toLowerCase().includes(args.workflowName!.toLowerCase())
      );

      if (match) {
        workflowId = match.id;
      }
    }

    // Fetch failed executions
    const { data: executions } = await client.listExecutions({
      workflowId,
      status: 'error',
      limit: args.limit || 10,
      includeData: true,
    });

    // Build workflow name map
    const workflowNames = new Map<string, string>();
    const { data: workflows } = await client.listWorkflows();
    for (const wf of workflows) {
      workflowNames.set(wf.id, wf.name);
    }

    return formatFailedExecutions(executions, workflowNames);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error fetching failed executions: ${message}`;
  }
}
