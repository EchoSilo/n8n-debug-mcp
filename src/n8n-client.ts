import axios, { AxiosInstance } from 'axios';
import { validateApiKey, validateBaseUrl, validateExecutionId, validateWorkflowId } from './utils/validator.js';

// Types for n8n API responses
export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodes?: N8nNode[];
  connections?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, unknown>;
}

export interface N8nExecution {
  id: string;
  finished: boolean;
  mode: string;
  retryOf?: string;
  retrySuccessId?: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  workflowData?: N8nWorkflow;
  status: 'success' | 'error' | 'running' | 'waiting' | 'unknown';
  data?: N8nExecutionData;
}

export interface N8nExecutionData {
  startData?: Record<string, unknown>;
  resultData?: {
    runData?: Record<string, N8nNodeExecutionData[]>;
    lastNodeExecuted?: string;
    error?: N8nError;
  };
  executionData?: {
    contextData?: Record<string, unknown>;
    nodeExecutionStack?: unknown[];
    waitingExecution?: Record<string, unknown>;
    waitingExecutionSource?: Record<string, unknown>;
  };
}

export interface N8nNodeExecutionData {
  startTime: number;
  executionTime: number;
  executionStatus?: string;
  source?: unknown[];
  data?: {
    main?: Array<Array<{ json: Record<string, unknown>; binary?: unknown }>>;
  };
  error?: N8nError;
}

export interface N8nError {
  message: string;
  stack?: string;
  name?: string;
  node?: {
    name: string;
    type: string;
  };
}

export interface ExecutionListParams {
  workflowId?: string;
  status?: 'success' | 'error' | 'running' | 'waiting';
  limit?: number;
  cursor?: string;
  includeData?: boolean;
}

export interface WorkflowListParams {
  active?: boolean;
  limit?: number;
  cursor?: string;
}

export class N8nClient {
  private client: AxiosInstance;

  constructor(apiUrl?: string, apiKey?: string) {
    const baseURL = apiUrl || process.env.N8N_API_URL || 'https://localhost:5678/api/v1';
    const key = apiKey || process.env.N8N_API_KEY;

    if (!key) {
      throw new Error('N8N_API_KEY is required. Set it in environment variables or pass to constructor.');
    }

    // SECURITY: Validate API key format
    validateApiKey(key);

    // SECURITY: Validate URL scheme (HTTPS required for non-localhost)
    validateBaseUrl(baseURL);

    this.client = axios.create({
      baseURL,
      headers: {
        'X-N8N-API-KEY': key,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  // ============ Workflow Operations ============

  async listWorkflows(params: WorkflowListParams = {}): Promise<{ data: N8nWorkflow[]; nextCursor?: string }> {
    const response = await this.client.get('/workflows', {
      params: {
        active: params.active,
        limit: params.limit || 100,
        cursor: params.cursor,
      },
    });
    return response.data;
  }

  async getWorkflow(workflowId: string): Promise<N8nWorkflow> {
    validateWorkflowId(workflowId); // SECURITY: Prevent path traversal
    const response = await this.client.get(`/workflows/${workflowId}`);
    return response.data;
  }

  // ============ Execution Operations ============

  async listExecutions(params: ExecutionListParams = {}): Promise<{ data: N8nExecution[]; nextCursor?: string }> {
    const queryParams: Record<string, string | number | boolean> = {
      limit: params.limit || 20,
    };

    if (params.workflowId) queryParams.workflowId = params.workflowId;
    if (params.status) queryParams.status = params.status;
    if (params.cursor) queryParams.cursor = params.cursor;
    if (params.includeData) queryParams.includeData = true;

    const response = await this.client.get('/executions', { params: queryParams });
    return response.data;
  }

  async getExecution(executionId: string, includeData = true): Promise<N8nExecution> {
    validateExecutionId(executionId); // SECURITY: Prevent path traversal
    const response = await this.client.get(`/executions/${executionId}`, {
      params: { includeData },
    });
    return response.data;
  }

  // ============ Helper Methods ============

  /**
   * Extract webhook paths from a workflow's nodes
   */
  extractWebhookPaths(workflow: N8nWorkflow): string[] {
    const paths: string[] = [];
    if (!workflow.nodes) return paths;

    for (const node of workflow.nodes) {
      if (node.type === 'n8n-nodes-base.webhook') {
        const path = node.parameters?.path as string;
        if (path) {
          paths.push(path.startsWith('/') ? path : `/${path}`);
        }
      }
    }
    return paths;
  }

  /**
   * Check if workflow has executeWorkflowTrigger (can be called as sub-workflow)
   */
  hasSubWorkflowTrigger(workflow: N8nWorkflow): boolean {
    if (!workflow.nodes) return false;
    return workflow.nodes.some(n => n.type === 'n8n-nodes-base.executeWorkflowTrigger');
  }

  /**
   * Get execution duration in seconds
   */
  getExecutionDuration(execution: N8nExecution): number | null {
    if (!execution.startedAt || !execution.stoppedAt) return null;
    const start = new Date(execution.startedAt).getTime();
    const end = new Date(execution.stoppedAt).getTime();
    return (end - start) / 1000;
  }

  /**
   * Extract error details from execution
   */
  extractError(execution: N8nExecution): { node: string; message: string; stack?: string } | null {
    if (execution.status !== 'error') return null;

    const resultData = execution.data?.resultData;
    if (resultData?.error) {
      return {
        node: resultData.error.node?.name || 'Unknown',
        message: resultData.error.message,
        stack: resultData.error.stack,
      };
    }

    // Check individual node errors
    const runData = resultData?.runData;
    if (runData) {
      for (const [nodeName, nodeRuns] of Object.entries(runData)) {
        for (const run of nodeRuns) {
          if (run.error) {
            return {
              node: nodeName,
              message: run.error.message,
              stack: run.error.stack,
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Extract HTTP request calls from execution data (for correlation)
   */
  extractHttpCalls(execution: N8nExecution): Array<{
    nodeName: string;
    url: string;
    method: string;
    timestamp: number;
    responseData?: Record<string, unknown>;
  }> {
    const calls: Array<{
      nodeName: string;
      url: string;
      method: string;
      timestamp: number;
      responseData?: Record<string, unknown>;
    }> = [];

    const runData = execution.data?.resultData?.runData;
    if (!runData) return calls;

    for (const [nodeName, nodeRuns] of Object.entries(runData)) {
      for (const run of nodeRuns) {
        // Check if this is an HTTP Request node by examining the output
        const mainOutput = run.data?.main?.[0]?.[0];
        if (mainOutput?.json) {
          const json = mainOutput.json as Record<string, unknown>;
          // HTTP nodes often have these fields in input parameters
          // We need to check the workflow data for the actual URL
          if (json.url || json.requestUrl) {
            calls.push({
              nodeName,
              url: (json.url || json.requestUrl) as string,
              method: (json.method || 'GET') as string,
              timestamp: run.startTime,
              responseData: json,
            });
          }
        }
      }
    }

    return calls;
  }

  /**
   * Extract user/chat ID from execution input data (for correlation)
   */
  extractUserContext(execution: N8nExecution): {
    userId?: string;
    chatId?: string;
    correlationId?: string;
    responseId?: string;
  } {
    const result: {
      userId?: string;
      chatId?: string;
      correlationId?: string;
      responseId?: string;
    } = {};

    const runData = execution.data?.resultData?.runData;
    if (!runData) return result;

    // Check first few nodes for user context
    for (const nodeRuns of Object.values(runData)) {
      for (const run of nodeRuns) {
        const mainOutput = run.data?.main?.[0]?.[0];
        if (mainOutput?.json) {
          const json = mainOutput.json as Record<string, unknown>;
          if (json.user_id) result.userId = String(json.user_id);
          if (json.chat_id) result.chatId = String(json.chat_id);
          if (json.correlation_id) result.correlationId = String(json.correlation_id);
          if (json.response_id) result.responseId = String(json.response_id);

          // Check nested body
          const body = json.body as Record<string, unknown> | undefined;
          if (body) {
            if (body.user_id) result.userId = String(body.user_id);
            if (body.chat_id) result.chatId = String(body.chat_id);
            if (body.correlation_id) result.correlationId = String(body.correlation_id);
            if (body.response_id) result.responseId = String(body.response_id);
          }

          // If we found user context, return early
          if (result.userId || result.chatId) return result;
        }
      }
    }

    return result;
  }
}

export default N8nClient;
