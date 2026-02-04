// Backboard API Client (Server-side only)
// This file should only be imported in server components or API routes

import { headers } from 'next/headers';

const BACKBOARD_API_BASE = 'https://app.backboard.io/api';

// Header name for client-provided API key
export const API_KEY_HEADER = 'x-backboard-api-key';

// Custom error for missing API key
export class ApiKeyNotConfiguredError extends Error {
  constructor() {
    super('API key not configured. Please add your Backboard API key in Settings.');
    this.name = 'ApiKeyNotConfiguredError';
  }
}

export async function getApiKey(): Promise<string> {
  // First check environment variable (for production/admin use)
  const envKey = process.env.BACKBOARD_API_KEY;
  if (envKey && envKey !== 'your_api_key_here') {
    return envKey;
  }

  // Then check request header (from client localStorage)
  try {
    const headerStore = await headers();
    const headerKey = headerStore.get(API_KEY_HEADER);
    if (headerKey) {
      return headerKey;
    }
  } catch {
    // Headers not available in this context, ignore
  }

  throw new ApiKeyNotConfiguredError();
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function backboardFetch<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;
  const apiKey = await getApiKey();

  const response = await fetch(`${BACKBOARD_API_BASE}${endpoint}`, {
    method,
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Backboard API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function backboardFetchFormData<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const apiKey = await getApiKey();

  const response = await fetch(`${BACKBOARD_API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      // Don't set Content-Type - let fetch set it with boundary for multipart
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Backboard API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function backboardDelete(endpoint: string): Promise<void> {
  const apiKey = await getApiKey();

  const response = await fetch(`${BACKBOARD_API_BASE}${endpoint}`, {
    method: 'DELETE',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  // Accept 200, 204 (No Content), and other 2xx as success
  if (!response.ok) {
    let errorText = '';
    try {
      errorText = await response.text();
    } catch {
      errorText = 'Unable to read error response';
    }
    throw new Error(`Backboard API error: ${response.status} - ${errorText}`);
  }
}
