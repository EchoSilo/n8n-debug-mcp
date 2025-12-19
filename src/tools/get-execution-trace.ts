import { N8nClient } from '../n8n-client.js';
import { validateExecutionId } from '../utils/validator.js';
import { formatExecutionTrace } from '../formatter.js';

export const getExecutionTraceTool = {
  name: 'get_execution_trace',
  description: 'Get complete execution trace including all node inputs/outputs, timing, and errors. Use this to debug specific executions.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      executionId: {
        type: 'string',
        description: 'The execution ID to trace',
      },
      summarize: {
        type: 'boolean',
        description: 'Summarize large payloads to reduce output size',
        default: false,
      },
    },
    required: ['executionId'],
  },
};

export async function handleGetExecutionTrace(
  args: { executionId: string; summarize?: boolean }
): Promise<string> {
  const client = new N8nClient();

  try {
    // SECURITY: Validate input
    validateExecutionId(args.executionId);

    // Fetch execution with full data
    const execution = await client.getExecution(args.executionId, true);

    // Fetch workflow details
    let workflow;
    try {
      workflow = await client.getWorkflow(execution.workflowId);
    } catch {
      // Workflow may have been deleted
    }

    return formatExecutionTrace(execution, workflow, {
      summarize: args.summarize,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error fetching execution trace: ${message}`;
  }
}
