import { N8nClient } from '../n8n-client.js';
import { formatErrorAnalysis } from '../formatter.js';

export const analyzeExecutionErrorTool = {
  name: 'analyze_execution_error',
  description: 'Deep analysis of a failed execution with detailed error context, input data, and suggested fixes.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      executionId: {
        type: 'string',
        description: 'The execution ID to analyze',
      },
    },
    required: ['executionId'],
  },
};

export async function handleAnalyzeExecutionError(
  args: { executionId: string }
): Promise<string> {
  const client = new N8nClient();

  try {
    // Fetch execution with full data
    const execution = await client.getExecution(args.executionId, true);

    // Check if it's actually an error
    if (execution.status !== 'error') {
      return `Execution ${args.executionId} did not fail (status: ${execution.status}). Use get_execution_trace for successful executions.`;
    }

    // Fetch workflow details
    const workflow = await client.getWorkflow(execution.workflowId);

    return formatErrorAnalysis(execution, workflow);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error analyzing execution: ${message}`;
  }
}
