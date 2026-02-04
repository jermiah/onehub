import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MemoryMode, ModelConfig, Document, BackboardModel } from '@/lib/api/types';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

const DEFAULT_MODEL: ModelConfig = {
  llm_provider: 'openai',
  model_name: 'gpt-4o',
};

interface ChatStore {
  memoryMode: MemoryMode;
  modelConfig: ModelConfig;
  // Per-assistant model configs (persisted)
  assistantModelConfigs: Record<string, ModelConfig>;
  currentAssistantId: string | null;
  // Providers (array of provider name strings)
  providers: string[];
  providersLoading: boolean;
  totalModels: number;
  // Models for selected provider
  availableModels: BackboardModel[];
  providerModelCount: number; // Total models for the selected provider
  modelsLoading: boolean;
  // Global model search
  searchResults: BackboardModel[];
  searchLoading: boolean;
  // Document indexing
  indexingDocuments: Document[];
  isSending: boolean;
  error: string | null;

  // Actions
  setMemoryMode: (mode: MemoryMode) => void;
  setModelConfig: (config: ModelConfig) => void;
  setCurrentAssistant: (assistantId: string) => void;
  fetchProviders: () => Promise<void>;
  fetchModelsByProvider: (provider: string) => Promise<void>;
  fetchModels: () => Promise<void>;
  searchModels: (query: string) => Promise<void>;
  clearSearchResults: () => void;
  selectSearchedModel: (model: BackboardModel) => void;
  addIndexingDocument: (doc: Document) => void;
  removeIndexingDocument: (docId: string) => void;
  updateDocumentStatus: (docId: string, status: Document['status']) => void;
  clearIndexingDocuments: () => void;
  setIsSending: (sending: boolean) => void;
  setError: (error: string | null) => void;
  isIndexing: () => boolean;
  getSelectedModelLabel: () => string;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      memoryMode: 'Auto',
      modelConfig: DEFAULT_MODEL,
      assistantModelConfigs: {},
      currentAssistantId: null,
      providers: [],
      providersLoading: false,
      totalModels: 0,
      availableModels: [],
      providerModelCount: 0,
      modelsLoading: false,
      searchResults: [],
      searchLoading: false,
      indexingDocuments: [],
      isSending: false,
      error: null,

      setMemoryMode: (mode: MemoryMode) => {
        set({ memoryMode: mode });
      },

      setModelConfig: (config: ModelConfig) => {
        const { currentAssistantId, assistantModelConfigs } = get();
        // Save model config for current assistant
        if (currentAssistantId) {
          set({
            modelConfig: config,
            assistantModelConfigs: {
              ...assistantModelConfigs,
              [currentAssistantId]: config,
            },
          });
        } else {
          set({ modelConfig: config });
        }
      },

      // Called when assistant is selected - loads their saved model
      setCurrentAssistant: (assistantId: string) => {
        const { assistantModelConfigs, modelConfig } = get();
        const savedConfig = assistantModelConfigs[assistantId];

        if (savedConfig) {
          console.log('[ChatStore] Loading saved model for assistant:', assistantId, savedConfig);
          set({
            currentAssistantId: assistantId,
            modelConfig: savedConfig,
          });
          // Fetch models for the saved provider
          get().fetchModelsByProvider(savedConfig.llm_provider);
        } else {
          console.log('[ChatStore] No saved model for assistant:', assistantId, '- keeping current');
          set({ currentAssistantId: assistantId });
        }
      },

      fetchProviders: async () => {
        set({ providersLoading: true });
        try {
          console.log('[ChatStore] Fetching providers...');
          const response = await fetchWithAuth('/api/backboard/models/providers');
          if (response.ok) {
            const data = await response.json();
            console.log('[ChatStore] Providers API response:', data);
            // API returns { providers: ["string"], total: number }
            const providers: string[] = data.providers || [];
            const totalProviders = data.total || providers.length;
            console.log('[ChatStore] Got', providers.length, 'providers (total:', totalProviders, ')');

            set({ providers, providersLoading: false });

            // If current provider is not in list, select first provider
            const { modelConfig } = get();
            const providerExists = providers.includes(modelConfig.llm_provider);
            if (!providerExists && providers.length > 0) {
              // Select first provider and fetch its models
              const firstProvider = providers[0];
              set({ modelConfig: { llm_provider: firstProvider, model_name: '' } });
              get().fetchModelsByProvider(firstProvider);
            } else if (providerExists) {
              // Fetch models for current provider
              get().fetchModelsByProvider(modelConfig.llm_provider);
            }
          } else {
            set({ providers: [], providersLoading: false });
          }
        } catch (error) {
          console.error('Failed to fetch providers:', error);
          set({ providers: [], providersLoading: false });
        }
      },

      fetchModelsByProvider: async (provider: string) => {
        set({ modelsLoading: true, availableModels: [], providerModelCount: 0 });
        try {
          console.log('[ChatStore] Fetching models for provider:', provider);

          const BATCH_SIZE = 500; // API max limit per request

          // First request to get initial batch + total count
          const firstResponse = await fetchWithAuth(
            `/api/backboard/models/provider/${encodeURIComponent(provider)}?skip=0&limit=${BATCH_SIZE}`
          );

          if (!firstResponse.ok) {
            set({ availableModels: [], providerModelCount: 0, modelsLoading: false });
            return;
          }

          const firstData = await firstResponse.json();
          const firstBatch: BackboardModel[] = firstData.models || [];
          const totalForProvider = firstData.total || firstBatch.length;

          console.log('[ChatStore] First batch:', firstBatch.length, 'models. Total:', totalForProvider);

          // IMMEDIATELY show first batch so user can start selecting
          set({
            availableModels: firstBatch,
            providerModelCount: totalForProvider,
            modelsLoading: totalForProvider > BATCH_SIZE, // Keep loading if more batches needed
          });

          // Auto-select first model if current selection is invalid
          const { modelConfig } = get();
          if (modelConfig.llm_provider === provider) {
            const currentModelExists = firstBatch.some((m) => m.name === modelConfig.model_name);
            if (!currentModelExists && firstBatch.length > 0) {
              set({
                modelConfig: {
                  llm_provider: provider,
                  model_name: firstBatch[0].name,
                },
              });
            }
          }

          // Update total models count in background
          fetchWithAuth('/api/backboard/models?limit=1')
            .then(r => r.json())
            .then(d => {
              if (d.total) set({ totalModels: d.total });
            })
            .catch(() => {});

          // If there are more models, fetch them in background (silently)
          if (totalForProvider > BATCH_SIZE) {
            const remainingBatches = Math.ceil((totalForProvider - BATCH_SIZE) / BATCH_SIZE);
            console.log('[ChatStore] Loading', remainingBatches, 'more batches in background...');

            // Fetch remaining batches in parallel (limit concurrency to 10)
            const CONCURRENT_LIMIT = 10;
            let allModels = [...firstBatch];
            let lastUpdateCount = firstBatch.length;

            for (let chunk = 0; chunk < Math.ceil(remainingBatches / CONCURRENT_LIMIT); chunk++) {
              const batchPromises: Promise<Response>[] = [];
              const startIdx = chunk * CONCURRENT_LIMIT + 1;
              const endIdx = Math.min(startIdx + CONCURRENT_LIMIT, remainingBatches + 1);

              for (let i = startIdx; i < endIdx; i++) {
                const skip = i * BATCH_SIZE;
                batchPromises.push(
                  fetchWithAuth(`/api/backboard/models/provider/${encodeURIComponent(provider)}?skip=${skip}&limit=${BATCH_SIZE}`)
                );
              }

              const batchResponses = await Promise.all(batchPromises);

              for (const response of batchResponses) {
                if (response.ok) {
                  const data = await response.json();
                  if (data.models) {
                    allModels = [...allModels, ...data.models];
                  }
                }
              }

              // Check if provider changed while loading
              const currentProvider = get().modelConfig.llm_provider;
              if (currentProvider !== provider) {
                console.log('[ChatStore] Provider changed, stopping background load');
                return;
              }

              // Only update UI every 5000 models to reduce re-renders
              if (allModels.length - lastUpdateCount >= 5000 || chunk === Math.ceil(remainingBatches / CONCURRENT_LIMIT) - 1) {
                set({ availableModels: allModels });
                lastUpdateCount = allModels.length;
                console.log('[ChatStore] Progress:', allModels.length, 'of', totalForProvider, 'models loaded');
              }
            }

            console.log('[ChatStore] ✅ All', allModels.length, 'models loaded for', provider);
            set({ modelsLoading: false });
          }
        } catch (error) {
          console.error('Failed to fetch models for provider:', error);
          set({ availableModels: [], providerModelCount: 0, modelsLoading: false });
        }
      },

      // Legacy fetchModels - fetches all models (used for initial load)
      fetchModels: async () => {
        // Redirect to new provider-based fetching
        const { fetchProviders } = get();
        await fetchProviders();
      },

      // Global model search across all providers
      searchModels: async (query: string) => {
        if (!query.trim()) {
          set({ searchResults: [], searchLoading: false });
          return;
        }

        set({ searchLoading: true });
        try {
          console.log('[ChatStore] Searching models globally:', query);
          const response = await fetchWithAuth(`/api/backboard/models/search?q=${encodeURIComponent(query)}&limit=50`);
          if (response.ok) {
            const data = await response.json();
            console.log('[ChatStore] Search results:', data.models?.length || 0, 'models');
            set({ searchResults: data.models || [], searchLoading: false });
          } else {
            set({ searchResults: [], searchLoading: false });
          }
        } catch (error) {
          console.error('Failed to search models:', error);
          set({ searchResults: [], searchLoading: false });
        }
      },

      clearSearchResults: () => {
        set({ searchResults: [], searchLoading: false });
      },

      // Select a model from search results - updates provider and fetches its models
      selectSearchedModel: (model: BackboardModel) => {
        console.log('[ChatStore] Selected model from search:', model.name, 'provider:', model.provider);
        // Update model config with the selected model
        set({
          modelConfig: {
            llm_provider: model.provider,
            model_name: model.name,
          },
          searchResults: [],
        });
        // Fetch models for that provider to populate the dropdown
        get().fetchModelsByProvider(model.provider);
      },

      addIndexingDocument: (doc: Document) => {
        set((state) => ({
          indexingDocuments: [...state.indexingDocuments, doc],
        }));
      },

      removeIndexingDocument: (docId: string) => {
        set((state) => ({
          indexingDocuments: state.indexingDocuments.filter(
            (d) => d.document_id !== docId
          ),
        }));
      },

      updateDocumentStatus: (docId: string, status: Document['status']) => {
        set((state) => ({
          indexingDocuments: state.indexingDocuments.map((d) =>
            d.document_id === docId ? { ...d, status } : d
          ),
        }));
      },

      clearIndexingDocuments: () => {
        set({ indexingDocuments: [] });
      },

      setIsSending: (sending: boolean) => {
        set({ isSending: sending });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      isIndexing: () => {
        const { indexingDocuments } = get();
        return indexingDocuments.some(
          (d) => d.status === 'pending' || d.status === 'processing'
        );
      },

      getSelectedModelLabel: () => {
        const { modelConfig, availableModels } = get();
        const model = availableModels.find(
          (m) => m.provider === modelConfig.llm_provider && m.name === modelConfig.model_name
        );
        if (model) {
          return `${model.provider} · ${model.name}`;
        }
        return `${modelConfig.llm_provider} · ${modelConfig.model_name}`;
      },
    }),
    {
      name: 'backboard-chat-store',
      partialize: (state) => ({
        memoryMode: state.memoryMode,
        modelConfig: state.modelConfig,
        assistantModelConfigs: state.assistantModelConfigs,
      }),
    }
  )
);
