/**
 * Input validation utilities for security
 * Prevents injection attacks, path traversal, and configuration errors
 */

export function validateExecutionId(id: string): string {
  validateId(id, 'Execution ID');
  return id;
}

export function validateWorkflowId(id: string): string {
  validateId(id, 'Workflow ID');
  return id;
}

function validateId(id: string, idType: string): void {
  // Whitelist: alphanumeric, hyphens, underscores only (prevent path traversal)
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error(
      `Invalid ${idType}: contains disallowed characters. ` +
      `Only alphanumeric, hyphens, and underscores are permitted.`
    );
  }

  // Reasonable length limit
  if (id.length > 100) {
    throw new Error(`Invalid ${idType}: exceeds maximum length of 100 characters`);
  }

  if (id.length === 0) {
    throw new Error(`Invalid ${idType}: cannot be empty`);
  }
}

export function validateApiKey(key: string): void {
  // n8n API keys start with this prefix
  if (!key.startsWith('n8n_api_')) {
    throw new Error(
      'Invalid N8N_API_KEY format: must start with "n8n_api_". ' +
      'Generate a valid key in n8n Settings > n8n API.'
    );
  }

  if (key.length < 20) {
    throw new Error('Invalid N8N_API_KEY: appears too short (minimum 20 characters)');
  }
}

export function validateBaseUrl(url: string): void {
  // Allow http://localhost for development
  if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
    return;
  }

  // Check for ALLOW_HTTP override (development only)
  if (process.env.ALLOW_HTTP === 'true') {
    console.warn(
      'WARNING: Using HTTP for non-localhost URL. This is insecure and should only be used in development.'
    );
    return;
  }

  // Require HTTPS for all other URLs
  if (!url.startsWith('https://')) {
    throw new Error(
      'Invalid N8N_BASE_URL: must use HTTPS for security. ' +
      'For local development, use http://localhost or set ALLOW_HTTP=true'
    );
  }
}
