import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Sanitize API key to remove non-ASCII characters (zero-width spaces, etc.)
function sanitizeApiKey(key: string): string {
  // Remove all non-printable and non-ASCII characters
  // Keep only printable ASCII (32-126)
  return key.replace(/[^\x20-\x7E]/g, '').trim();
}

interface ApiKeyStore {
  apiKey: string | null;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  isConfigured: () => boolean;
}

export const useApiKeyStore = create<ApiKeyStore>()(
  persist(
    (set, get) => ({
      apiKey: null,

      setApiKey: (key: string) => {
        const sanitized = sanitizeApiKey(key);
        set({ apiKey: sanitized });
        console.log('[ApiKeyStore] API key saved (length:', sanitized.length, ')');
      },

      clearApiKey: () => {
        set({ apiKey: null });
        console.log('[ApiKeyStore] API key cleared');
      },

      isConfigured: () => {
        return Boolean(get().apiKey);
      },
    }),
    {
      name: 'backboard-api-key',
    }
  )
);

// Helper to get API key for fetch requests
export function getClientApiKey(): string | null {
  return useApiKeyStore.getState().apiKey;
}
