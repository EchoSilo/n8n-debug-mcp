import { N8nClient } from '../n8n-client.js';
import { formatWorkflowList } from '../formatter.js';

export const listActiveWorkflowsTool = {
  name: 'list_active_workflows',
  description: 'List all n8n workflows with their IDs, status, and webhook paths. Use this to find workflow IDs for other commands.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      includeInactive: {
        type: 'boolean',
        description: 'Include inactive workflows in the list',
        default: false,
      },
      includeWebhooks: {
        type: 'boolean',
        description: 'Show webhook paths for each workflow',
        default: true,
      },
    },
  },
};

export async function handleListActiveWorkflows(
  args: { includeInactive?: boolean; includeWebhooks?: boolean }
): Promise<string> {
  const client = new N8nClient();

  try {
    // Fetch workflows
    const { data: workflows } = await client.listWorkflows({
      active: args.includeInactive ? undefined : true,
    });

    // Fetch full details for each workflow to get nodes/webhooks
    const fullWorkflows = await Promise.all(
      workflows.map(wf => client.getWorkflow(wf.id))
    );

    return formatWorkflowList(fullWorkflows, {
      includeWebhooks: args.includeWebhooks ?? true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error listing workflows: ${message}`;
  }
}
