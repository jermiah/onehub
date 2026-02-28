import { create } from 'zustand';
import type { Thread, Message } from '@/lib/api/types';
import { generateThreadTitle } from '@/lib/utils';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import { useAssistantStore } from './assistantStore';
import { useChatStore } from './chatStore';

interface ThreadWithTitle extends Thread {
  localTitle?: string; // Client-side title (for renaming)
}

// Cache for thread titles (loaded from Supabase)
let titlesCache: Record<string, string> = {};
let titlesCacheLoaded = false;

// Fetch all titles from Supabase
async function fetchAllTitles(): Promise<Record<string, string>> {
  if (titlesCacheLoaded) return titlesCache;

  try {
    const response = await fetch('/api/titles');
    const data = await response.json();

    if (data.configured && data.titles) {
      titlesCache = data.titles;
      titlesCacheLoaded = true;
      console.log('[ThreadStore] Titles loaded from Supabase:', Object.keys(titlesCache).length);
      return titlesCache;
    } else {
      console.warn('[ThreadStore] Supabase not configured or no titles');
    }
  } catch (error) {
    console.error('[ThreadStore] Failed to fetch titles from Supabase:', error);
  }

  titlesCacheLoaded = true;
  return titlesCache;
}

// Save title to Supabase
async function saveTitleToStorage(threadId: string, title: string): Promise<void> {
  // Update cache
  titlesCache[threadId] = title;

  // Save to Supabase
  try {
    const response = await fetch('/api/titles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thread_id: threadId, title }),
    });

    if (response.ok) {
      console.log('[ThreadStore] Title saved to Supabase');
    } else {
      const errorData = await response.json();
      console.error('[ThreadStore] Supabase save failed:', errorData.error);
    }
  } catch (error) {
    console.error('[ThreadStore] Supabase save error:', error);
  }
}

// Get a single saved title from cache
function getSavedTitle(threadId: string): string | undefined {
  return titlesCache[threadId];
}

// Delete title from Supabase
async function deleteTitleFromStorage(threadId: string): Promise<void> {
  // Remove from cache
  delete titlesCache[threadId];

  // Delete from Supabase
  try {
    await fetch(`/api/titles?thread_id=${threadId}`, { method: 'DELETE' });
    console.log('[ThreadStore] Title deleted from Supabase');
  } catch (error) {
    console.error('[ThreadStore] Failed to delete title from Supabase:', error);
  }
}

interface ThreadStore {
  threads: ThreadWithTitle[];
  currentThread: ThreadWithTitle | null;
  currentMessages: Message[];
  searchQuery: string;
  loading: boolean;
  messagesLoading: boolean;
  error: string | null;

  // Actions
  fetchThreads: (assistantId: string) => Promise<void>;
  fetchThread: (threadId: string) => Promise<void>;
  createThread: (assistantId: string) => Promise<Thread>;
  deleteThread: (threadId: string) => Promise<void>;
  setCurrentThread: (thread: ThreadWithTitle | null) => void;
  setSearchQuery: (query: string) => void;
  renameThread: (threadId: string, title: string) => void;
  saveThreadTitle: (threadId: string, title: string) => Promise<void>;
  addMessage: (message: Message) => void;
  updateThreadTitle: (threadId: string, firstMessage: string) => void;
  generateAITitle: (threadId: string, firstMessage: string) => Promise<void>;
  getFilteredThreads: () => ThreadWithTitle[];
}

export const useThreadStore = create<ThreadStore>()((set, get) => ({
  threads: [],
  currentThread: null,
  currentMessages: [],
  searchQuery: '',
  loading: false,
  messagesLoading: false,
  error: null,

  fetchThreads: async (assistantId: string) => {
    set({ loading: true, error: null });
    try {
      // Get the assistant and model info for logging
      const assistantStore = useAssistantStore.getState();
      const chatStore = useChatStore.getState();
      const assistant = assistantStore.assistants.find(a => a.assistant_id === assistantId);

      console.log('[ThreadStore] 📂 Fetching threads:', {
        assistantId,
        assistantName: assistant?.name || 'Unknown',
        currentModel: `${chatStore.modelConfig.llm_provider}/${chatStore.modelConfig.model_name}`,
      });

      const response = await fetchWithAuth(
        `/api/backboard/assistants/${assistantId}/threads`
      );
      if (!response.ok) throw new Error('Failed to fetch threads');
      const threads = await response.json();
      // Sort by created_at descending (most recent first)
      const sortedThreads = threads.sort(
        (a: Thread, b: Thread) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Merge titles: prefer Backboard title, fall back to Supabase
      const savedTitles = await fetchAllTitles();
      const threadsWithTitles = sortedThreads.map((thread: Thread) => {
        // If Backboard already has a title, use it
        if (thread.title) {
          return { ...thread, localTitle: thread.title };
        }
        // Fall back to Supabase-saved title
        const savedTitle = savedTitles[thread.thread_id];
        if (savedTitle) {
          return { ...thread, localTitle: savedTitle, title: savedTitle };
        }
        return thread;
      });

      console.log('[ThreadStore] ✅ Threads loaded:', {
        count: threadsWithTitles.length,
        assistantId,
        assistantName: assistant?.name || 'Unknown',
        titlesRestored: Object.keys(savedTitles).length,
      });

      set({ threads: threadsWithTitles, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  fetchThread: async (threadId: string) => {
    set({ messagesLoading: true, error: null });
    try {
      const response = await fetchWithAuth(`/api/backboard/threads/${threadId}`);
      if (!response.ok) throw new Error('Failed to fetch thread');
      const thread = await response.json();

      // Get assistant and model info for logging
      const assistantStore = useAssistantStore.getState();
      const chatStore = useChatStore.getState();

      // Use thread's assistant_id if available, otherwise use currently selected assistant
      const assistantId = thread.assistant_id || assistantStore.selectedAssistantId;
      const assistant = assistantStore.assistants.find(a => a.assistant_id === assistantId);

      // Apply title: prefer Backboard title, fall back to Supabase
      const savedTitle = getSavedTitle(thread.thread_id);
      if (thread.title) {
        thread.localTitle = thread.title;
      } else if (savedTitle) {
        thread.title = savedTitle;
        thread.localTitle = savedTitle;
      }

      const titleSource = thread.title ? (savedTitle && !thread.title ? 'supabase' : 'backboard') : 'none';
      console.log('[ThreadStore] 📋 Chat loaded:', {
        threadId: thread.thread_id,
        threadTitle: thread.title || thread.localTitle || 'New chat',
        assistantId: assistantId,
        assistantName: assistant?.name || 'Unknown',
        model: `${chatStore.modelConfig.llm_provider}/${chatStore.modelConfig.model_name}`,
        memoryMode: chatStore.memoryMode,
        messageCount: thread.messages?.length || 0,
        titleSource,
      });

      // If thread has assistant_id and it's different from currently selected, switch to it
      if (thread.assistant_id && assistantStore.selectedAssistantId !== thread.assistant_id) {
        const targetAssistant = assistantStore.assistants.find(a => a.assistant_id === thread.assistant_id);
        console.log('[ThreadStore] Thread belongs to different assistant, switching:', {
          threadId,
          from: assistantStore.selectedAssistantId,
          to: thread.assistant_id,
          toAssistantName: targetAssistant?.name || 'Unknown',
        });
        assistantStore.selectAssistant(thread.assistant_id);
      }

      set({
        currentThread: thread,
        currentMessages: thread.messages || [],
        messagesLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, messagesLoading: false });
      throw error;
    }
  },

  createThread: async (assistantId: string) => {
    set({ loading: true, error: null });
    try {
      // Get the assistant and model info for logging
      const assistantStore = useAssistantStore.getState();
      const chatStore = useChatStore.getState();
      const assistant = assistantStore.assistants.find(a => a.assistant_id === assistantId);

      console.log('[ThreadStore] ➕ Creating new chat:', {
        assistantId,
        assistantName: assistant?.name || 'Unknown',
        model: `${chatStore.modelConfig.llm_provider}/${chatStore.modelConfig.model_name}`,
        memoryMode: chatStore.memoryMode,
      });

      const response = await fetchWithAuth(
        `/api/backboard/assistants/${assistantId}/threads`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );
      if (!response.ok) throw new Error('Failed to create thread');
      const thread = await response.json();

      console.log('[ThreadStore] ✅ New chat created:', {
        threadId: thread.thread_id,
        assistantId,
        assistantName: assistant?.name || 'Unknown',
        model: `${chatStore.modelConfig.llm_provider}/${chatStore.modelConfig.model_name}`,
      });

      set((state) => ({
        threads: [thread, ...state.threads],
        currentThread: thread,
        currentMessages: [],
        loading: false,
      }));
      return thread;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  deleteThread: async (threadId: string) => {
    set({ loading: true, error: null });
    try {
      // Get the assistant_id from the assistant store
      const assistantStore = useAssistantStore.getState();
      const assistantId = assistantStore.selectedAssistantId;
      if (!assistantId) throw new Error('No assistant selected');

      const assistant = assistantStore.assistants.find(a => a.assistant_id === assistantId);
      console.log('[ThreadStore] Deleting thread:', {
        threadId,
        assistantId,
        assistantName: assistant?.name || 'Unknown',
      });

      // Delete through assistant endpoint
      const response = await fetchWithAuth(
        `/api/backboard/assistants/${assistantId}/threads/${threadId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) throw new Error('Failed to delete thread');
      console.log('[ThreadStore] Thread deleted successfully:', threadId);

      // Also delete the saved title
      deleteTitleFromStorage(threadId);

      set((state) => ({
        threads: state.threads.filter((t) => t.thread_id !== threadId),
        currentThread:
          state.currentThread?.thread_id === threadId ? null : state.currentThread,
        currentMessages:
          state.currentThread?.thread_id === threadId ? [] : state.currentMessages,
        loading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  setCurrentThread: (thread: ThreadWithTitle | null) => {
    set({ currentThread: thread, currentMessages: thread?.messages || [] });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  renameThread: (threadId: string, title: string) => {
    set((state) => ({
      threads: state.threads.map((t) =>
        t.thread_id === threadId ? { ...t, localTitle: title } : t
      ),
      currentThread:
        state.currentThread?.thread_id === threadId
          ? { ...state.currentThread, localTitle: title }
          : state.currentThread,
    }));
  },

  // Save thread title to the API (persists to backend)
  saveThreadTitle: async (threadId: string, title: string) => {
    try {
      console.log('[ThreadStore] Saving thread title:', threadId, '->', title);

      // Update local state immediately
      set((state) => ({
        threads: state.threads.map((t) =>
          t.thread_id === threadId ? { ...t, localTitle: title, title } : t
        ),
        currentThread:
          state.currentThread?.thread_id === threadId
            ? { ...state.currentThread, localTitle: title, title }
            : state.currentThread,
      }));

      // Save to Supabase (with localStorage fallback)
      await saveTitleToStorage(threadId, title);

      // Also try to save to Backboard API (may not be supported)
      try {
        const response = await fetchWithAuth(`/api/backboard/threads/${threadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        });

        if (response.ok) {
          console.log('[ThreadStore] Thread title also saved to Backboard API');
        }
      } catch (apiError) {
        // Supabase already has it, so this is fine
      }
    } catch (error) {
      console.error('[ThreadStore] Error saving thread title:', error);
      // Don't revert local state - user can try again
      throw error;
    }
  },

  addMessage: (message: Message) => {
    set((state) => ({
      currentMessages: [...state.currentMessages, message],
    }));
  },

  updateThreadTitle: (threadId: string, firstMessage: string) => {
    const title = generateThreadTitle(firstMessage);
    set((state) => ({
      threads: state.threads.map((t) =>
        t.thread_id === threadId ? { ...t, localTitle: title } : t
      ),
      currentThread:
        state.currentThread?.thread_id === threadId
          ? { ...state.currentThread, localTitle: title }
          : state.currentThread,
    }));
  },

  // Generate smart title and save to backend
  generateAITitle: async (threadId: string, firstMessage: string) => {
    try {
      console.log('[ThreadStore] Generating title for thread:', threadId);
      console.log('[ThreadStore] First message:', firstMessage.slice(0, 50));

      const response = await fetchWithAuth(`/api/backboard/threads/${threadId}/title`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: firstMessage }),
      });

      let title = generateThreadTitle(firstMessage); // Default fallback

      if (response.ok) {
        const data = await response.json();
        title = data.title || title;
        console.log('[ThreadStore] Generated title:', title);
      } else {
        console.log('[ThreadStore] Title API failed, using fallback:', title);
      }

      // Update local state immediately
      set((state) => ({
        threads: state.threads.map((t) =>
          t.thread_id === threadId ? { ...t, localTitle: title, title } : t
        ),
        currentThread:
          state.currentThread?.thread_id === threadId
            ? { ...state.currentThread, localTitle: title, title }
            : state.currentThread,
      }));

      // Save to Backboard via PATCH (so title persists on refresh)
      try {
        const patchResponse = await fetchWithAuth(`/api/backboard/threads/${threadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        });
        if (patchResponse.ok) {
          console.log('[ThreadStore] Title saved to Backboard API');
        } else {
          console.warn('[ThreadStore] Backboard PATCH failed, falling back to Supabase');
        }
      } catch (patchError) {
        console.warn('[ThreadStore] Backboard PATCH error:', patchError);
      }

      // Also save to Supabase as backup
      await saveTitleToStorage(threadId, title);
      console.log('[ThreadStore] Title saved to storage');
    } catch (error) {
      console.error('[ThreadStore] Error generating title:', error);
      // Fallback to simple title
      const fallbackTitle = generateThreadTitle(firstMessage);
      set((state) => ({
        threads: state.threads.map((t) =>
          t.thread_id === threadId ? { ...t, localTitle: fallbackTitle, title: fallbackTitle } : t
        ),
        currentThread:
          state.currentThread?.thread_id === threadId
            ? { ...state.currentThread, localTitle: fallbackTitle, title: fallbackTitle }
            : state.currentThread,
      }));
      // Save fallback title to both Backboard and storage
      try {
        await fetchWithAuth(`/api/backboard/threads/${threadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: fallbackTitle }),
        });
      } catch {
        // Best effort
      }
      saveTitleToStorage(threadId, fallbackTitle);
    }
  },

  getFilteredThreads: () => {
    const { threads, searchQuery } = get();
    if (!searchQuery.trim()) return threads;

    const query = searchQuery.toLowerCase();
    return threads.filter((thread) => {
      const title = thread.localTitle || thread.title || 'New chat';
      return title.toLowerCase().includes(query);
    });
  },
}));
