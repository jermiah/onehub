// Client-side fetch wrapper that includes the API key from localStorage

import { getClientApiKey } from '@/stores/apiKeyStore';

export const API_KEY_HEADER = 'x-backboard-api-key';

// Sanitize API key to remove non-ASCII characters (zero-width spaces, etc.)
function sanitizeApiKey(key: string): string {
  // Remove all non-printable and non-ASCII characters
  // Keep only printable ASCII (32-126) and common whitespace
  return key.replace(/[^\x20-\x7E]/g, '').trim();
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiKey = getClientApiKey();

  const headers = new Headers(options.headers);

  if (apiKey) {
    // Sanitize the key to remove any invisible Unicode characters
    const cleanKey = sanitizeApiKey(apiKey);
    if (cleanKey) {
      headers.set(API_KEY_HEADER, cleanKey);
    }
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

// Helper for JSON requests
export async function fetchJsonWithAuth<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  const response = await fetchWithAuth(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed: ${response.status}`);
  }

  return response.json();
}
