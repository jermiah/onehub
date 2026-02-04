import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Assistant, AssistantCreate, AssistantUpdate } from '@/lib/api/types';
import { useChatStore } from './chatStore';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

interface AssistantStore {
  assistants: Assistant[];
  selectedAssistantId: string | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchAssistants: () => Promise<void>;
  createAssistant: (data: AssistantCreate) => Promise<Assistant>;
  updateAssistant: (id: string, data: AssistantUpdate) => Promise<Assistant>;
  deleteAssistant: (id: string) => Promise<void>;
  selectAssistant: (id: string | null) => void;
  getSelectedAssistant: () => Assistant | null;
  ensureDefaultAssistant: () => Promise<Assistant>;
}

const DEFAULT_ASSISTANT: AssistantCreate = {
  name: "Default Assistant",
  system_prompt: 'You are a helpful AI assistant with persistent memory. Remember important facts about the user across all conversations.',
  top_k: 5,
};

// Lock to prevent multiple concurrent calls to ensureDefaultAssistant
let ensurePromise: Promise<Assistant> | null = null;

export const useAssistantStore = create<AssistantStore>()(
  persist(
    (set, get) => ({
      assistants: [],
      selectedAssistantId: null,
      loading: false,
      error: null,

      fetchAssistants: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetchWithAuth('/api/backboard/assistants');
          if (!response.ok) {
            // Try to parse error response for API key errors
            const errorData = await response.json().catch(() => ({}));
            if (errorData.code === 'API_KEY_MISSING' || errorData.code === 'API_KEY_INVALID' || response.status === 401) {
              throw new Error('API key not configured');
            }
            throw new Error(errorData.error || 'Failed to fetch assistants');
          }
          const assistants = await response.json();
          set({ assistants, loading: false });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
          throw error;
        }
      },

      createAssistant: async (data: AssistantCreate) => {
        set({ loading: true, error: null });
        try {
          const response = await fetchWithAuth('/api/backboard/assistants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (errorData.code === 'API_KEY_MISSING' || errorData.code === 'API_KEY_INVALID' || response.status === 401) {
              throw new Error('API key not configured');
            }
            throw new Error(errorData.error || 'Failed to create assistant');
          }
          const assistant = await response.json();
          set((state) => ({
            assistants: [...state.assistants, assistant],
            loading: false,
          }));
          return assistant;
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
          throw error;
        }
      },

      updateAssistant: async (id: string, data: AssistantUpdate) => {
        set({ loading: true, error: null });
        try {
          const response = await fetchWithAuth(`/api/backboard/assistants/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          if (!response.ok) throw new Error('Failed to update assistant');
          const assistant = await response.json();
          set((state) => ({
            assistants: state.assistants.map((a) =>
              a.assistant_id === id ? assistant : a
            ),
            loading: false,
          }));
          return assistant;
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
          throw error;
        }
      },

      deleteAssistant: async (id: string) => {
        set({ loading: true, error: null });
        try {
          const response = await fetchWithAuth(`/api/backboard/assistants/${id}`, {
            method: 'DELETE',
          });
          if (!response.ok) throw new Error('Failed to delete assistant');
          set((state) => ({
            assistants: state.assistants.filter((a) => a.assistant_id !== id),
            selectedAssistantId:
              state.selectedAssistantId === id ? null : state.selectedAssistantId,
            loading: false,
          }));
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
          throw error;
        }
      },

      selectAssistant: (id: string | null) => {
        set({ selectedAssistantId: id });
        // Load saved model config for this assistant
        if (id) {
          useChatStore.getState().setCurrentAssistant(id);
        }
      },

      getSelectedAssistant: () => {
        const { assistants, selectedAssistantId } = get();
        return assistants.find((a) => a.assistant_id === selectedAssistantId) || null;
      },

      ensureDefaultAssistant: async () => {
        // Prevent multiple concurrent calls - return existing promise if in progress
        if (ensurePromise) {
          console.log('[AssistantStore] Already ensuring assistant, waiting...');
          return ensurePromise;
        }

        const doEnsure = async (): Promise<Assistant> => {
          const { fetchAssistants, createAssistant, selectAssistant, selectedAssistantId } = get();

          // Always fetch fresh assistants from Backboard
          console.log('[AssistantStore] Fetching assistants from Backboard...');
          await fetchAssistants();

          const updatedAssistants = get().assistants;
          console.log('[AssistantStore] Found assistants:', updatedAssistants.map(a => ({ id: a.assistant_id, name: a.name })));

          // Check if currently selected assistant still exists
          const currentlySelected = selectedAssistantId
            ? updatedAssistants.find(a => a.assistant_id === selectedAssistantId)
            : null;

          if (currentlySelected) {
            // Keep the current selection
            console.log('[AssistantStore] Keeping current selection:', currentlySelected.name);
            return currentlySelected;
          }

          // No valid selection - look for Default Assistant or create it
          let defaultAssistant = updatedAssistants.find(
            (a) => a.name === "Default Assistant"
          );

          // If Default Assistant doesn't exist, create it
          if (!defaultAssistant) {
            console.log('[AssistantStore] Default Assistant not found, creating...');
            defaultAssistant = await createAssistant(DEFAULT_ASSISTANT);
            console.log('[AssistantStore] Created Default Assistant:', defaultAssistant.assistant_id);
          } else {
            console.log('[AssistantStore] Found existing Default Assistant:', defaultAssistant.assistant_id);
          }

          // Select Default Assistant (only when no valid selection exists)
          selectAssistant(defaultAssistant.assistant_id);
          console.log('[AssistantStore] Selected assistant:', defaultAssistant.assistant_id);
          return defaultAssistant;
        };

        // Set the promise and clear it when done
        ensurePromise = doEnsure().finally(() => {
          ensurePromise = null;
        });

        return ensurePromise;
      },
    }),
    {
      name: 'backboard-assistant-store',
      partialize: (state) => ({ selectedAssistantId: state.selectedAssistantId }),
    }
  )
);
