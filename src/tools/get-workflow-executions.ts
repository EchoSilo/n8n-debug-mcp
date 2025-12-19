import { N8nClient } from '../n8n-client.js';
import { validateWorkflowId } from '../utils/validator.js';
import { formatExecutionList } from '../formatter.js';

export const getWorkflowExecutionsTool = {
  name: 'get_workflow_executions',
  description: 'List recent executions for a specific workflow. Shows status, duration, and error summaries.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      workflowId: {
        type: 'string',
        description: 'The workflow ID (use list_active_workflows to find IDs)',
      },
      workflowName: {
        type: 'string',
        description: 'Alternative: search by workflow name (partial match)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of executions to return',
        default: 20,
      },
      status: {
        type: 'string',
        enum: ['success', 'error', 'running', 'all'],
        description: 'Filter by execution status',
        default: 'all',
      },
    },
  },
};

export async function handleGetWorkflowExecutions(
  args: {
    workflowId?: string;
    workflowName?: string;
    limit?: number;
    status?: 'success' | 'error' | 'running' | 'all';
  }
): Promise<string> {
  const client = new N8nClient();

  try {
    let workflowId = args.workflowId;
    let workflowName = args.workflowName;

    // SECURITY: Validate workflowId if provided
    if (workflowId) {
      validateWorkflowId(workflowId);
    }

    // If name provided, find workflow ID
    if (!workflowId && workflowName) {
      const { data: workflows } = await client.listWorkflows();
      const match = workflows.find(wf =>
        wf.name.toLowerCase().includes(workflowName!.toLowerCase())
      );

      if (!match) {
        return `No workflow found matching "${workflowName}"`;
      }

      workflowId = match.id;
      workflowName = match.name;
    }

    if (!workflowId) {
      return 'Please provide either workflowId or workflowName';
    }

    // Get workflow name if not already known
    if (!workflowName) {
      const workflow = await client.getWorkflow(workflowId);
      workflowName = workflow.name;
    }

    // Fetch executions
    const { data: executions } = await client.listExecutions({
      workflowId,
      limit: args.limit || 20,
      status: args.status === 'all' ? undefined : args.status,
      includeData: true,
    });

    return formatExecutionList(executions, workflowName);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error fetching executions: ${message}`;
  }
}
