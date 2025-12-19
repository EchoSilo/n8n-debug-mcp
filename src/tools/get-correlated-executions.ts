import { N8nClient } from '../n8n-client.js';
import { validateExecutionId } from '../utils/validator.js';
import { ExecutionCorrelator } from '../correlator.js';
import { formatCorrelationTree } from '../formatter.js';

export const getCorrelatedExecutionsTool = {
  name: 'get_correlated_executions',
  description: 'Find all related executions across workflows for a single user request. Traces the execution chain from orchestrator through agents and memory manager.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      executionId: {
        type: 'string',
        description: 'Starting execution ID (typically from the main orchestrator)',
      },
      timeWindowMs: {
        type: 'number',
        description: 'Time window for correlation in milliseconds',
        default: 30000,
      },
    },
    required: ['executionId'],
  },
};

export async function handleGetCorrelatedExecutions(
  args: { executionId: string; timeWindowMs?: number }
): Promise<string> {
  const client = new N8nClient();
  const correlator = new ExecutionCorrelator(client);

  try {
    // SECURITY: Validate input
    validateExecutionId(args.executionId);

    // Initialize correlator (fetches workflow metadata)
    await correlator.initialize();

    // Get root execution
    const rootExecution = await client.getExecution(args.executionId, true);

    // Find correlated executions
    const correlated = await correlator.correlateExecutions(args.executionId, {
      timeWindowMs: args.timeWindowMs || 30000,
    });

    // Format output
    return formatCorrelationTree(
      rootExecution,
      correlated,
      correlator.getWorkflowNames()
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error finding correlated executions: ${message}`;
  }
}
