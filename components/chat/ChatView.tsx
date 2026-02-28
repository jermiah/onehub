'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { TopBar } from './TopBar';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { IndexingBanner } from './IndexingBanner';
import { useThreadStore } from '@/stores/threadStore';
import { useChatStore } from '@/stores/chatStore';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import type { Message, Document } from '@/lib/api/types';

// Parse SSE event data
function parseSSEEvent(line: string): { event?: string; data?: string } | null {
  if (!line || line.startsWith(':')) return null;

  if (line.startsWith('event:')) {
    return { event: line.slice(6).trim() };
  }
  if (line.startsWith('data:')) {
    return { data: line.slice(5).trim() };
  }
  return null;
}

interface ChatViewProps {
  threadId: string;
}

export function ChatView({ threadId }: ChatViewProps) {
  const {
    currentMessages,
    messagesLoading,
    fetchThread,
    addMessage,
    generateAITitle,
  } = useThreadStore();

  // Streaming message state
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const {
    memoryMode,
    modelConfig,
    isSending,
    setIsSending,
    addIndexingDocument,
    updateDocumentStatus,
    clearIndexingDocuments,
    isIndexing,
  } = useChatStore();

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch thread on mount or thread change
  useEffect(() => {
    fetchThread(threadId);
    clearIndexingDocuments();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [threadId, fetchThread, clearIndexingDocuments]);

  // Poll document status for indexing documents
  const pollDocumentStatus = useCallback(
    async (documents: Document[]) => {
      const pendingDocs = documents.filter(
        (d) => d.status === 'pending' || d.status === 'processing'
      );

      if (pendingDocs.length === 0) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        return;
      }

      for (const doc of pendingDocs) {
        try {
          const response = await fetchWithAuth(
            `/api/backboard/documents/${doc.document_id}/status`
          );
          if (response.ok) {
            const status = await response.json();
            updateDocumentStatus(doc.document_id, status.status);

            if (status.status === 'indexed') {
              toast.success(`Document "${doc.filename}" indexed successfully`);
            } else if (status.status === 'failed') {
              toast.error(
                `Document "${doc.filename}" failed to index: ${status.status_message || 'Unknown error'}`
              );
            }
          }
        } catch (error) {
          console.error('Error polling document status:', error);
        }
      }
    },
    [updateDocumentStatus]
  );

  const handleSend = useCallback(
    async (content: string, files: File[]) => {
      if (isIndexing()) {
        toast.error('Please wait for documents to finish indexing');
        return;
      }

      setIsSending(true);

      try {
        const formData = new FormData();
        if (content) {
          formData.append('content', content);
        }
        formData.append('stream', 'true'); // Enable streaming
        formData.append('memory', memoryMode.toLowerCase());
        formData.append('llm_provider', modelConfig.llm_provider);
        formData.append('model_name', modelConfig.model_name);
        formData.append('send_to_llm', 'true');

        files.forEach((file) => {
          formData.append('files', file);
        });

        // Check if this is the first message BEFORE adding it
        const state = useThreadStore.getState();
        const thread = state.threads.find(t => t.thread_id === threadId);
        const isFirstMessage = state.currentMessages.length === 0;
        const hasNoTitle = !thread?.localTitle && !thread?.title;

        // Add user message to UI immediately
        const userMessage: Message = {
          message_id: `temp-${Date.now()}`,
          thread_id: threadId,
          role: 'user',
          content: content || '',
          created_at: new Date().toISOString(),
          attachments: files.map((f, i) => ({
            document_id: `temp-${i}`,
            filename: f.name,
            status: 'pending' as const,
          })),
        };
        addMessage(userMessage);

        // Generate title if this was the first message in the thread
        if (isFirstMessage && hasNoTitle && content) {
          console.log('[ChatView] First message detected, generating title...');
          // Generate title (don't await - runs in background)
          generateAITitle(threadId, content);
        }

        const response = await fetchWithAuth(
          `/api/backboard/threads/${threadId}/messages`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        // Check if response is streaming
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('text/event-stream') && response.body) {
          // Handle streaming response
          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          let assistantContent = '';
          let retrievedMemories: Message['retrieved_memories'] = [];
          let retrievedFiles: Message['retrieved_files'] = [];
          let messageId = `resp-${Date.now()}`;
          let buffer = '';

          // Create initial streaming message
          const streamingMsg: Message = {
            message_id: messageId,
            thread_id: threadId,
            role: 'assistant',
            content: '',
            created_at: new Date().toISOString(),
          };
          setStreamingMessage(streamingMsg);

          // Track currentEvent across chunks (SSE event/data can span chunks)
          let currentEvent = '';
          // Track if we've received a complete/done signal to avoid duplication
          let streamCompleted = false;

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || ''; // Keep incomplete line in buffer

              for (const line of lines) {
                const parsed = parseSSEEvent(line);
                if (!parsed) continue;

                if (parsed.event) {
                  currentEvent = parsed.event;
                  continue;
                }

                if (parsed.data) {
                  // Skip [DONE] signal
                  if (parsed.data === '[DONE]') {
                    streamCompleted = true;
                    console.log('[Stream] Received [DONE] signal');
                    continue;
                  }

                  // If stream already completed, skip further content to avoid duplication
                  if (streamCompleted) continue;

                  // Try to parse as JSON
                  let jsonData: Record<string, unknown> | null = null;
                  try {
                    jsonData = JSON.parse(parsed.data);
                  } catch {
                    // Not JSON - treat as plain text content delta
                    assistantContent += parsed.data;
                    setStreamingMessage(prev => prev ? {
                      ...prev,
                      content: assistantContent,
                    } : null);
                    continue;
                  }

                  if (jsonData) {
                    // Skip user message echoes
                    if (jsonData.role === 'user') {
                      console.log('[Stream] Skipping user message echo');
                      continue;
                    }

                    // Extract message_id from any event
                    if (jsonData.message_id) {
                      messageId = jsonData.message_id as string;
                    }

                    // Extract metadata (memories, files, attachments) from any event
                    if (jsonData.retrieved_memories) {
                      retrievedMemories = jsonData.retrieved_memories as Message['retrieved_memories'];
                    }
                    if (jsonData.retrieved_files) {
                      retrievedFiles = jsonData.retrieved_files as Message['retrieved_files'];
                    }
                    if (jsonData.attachments) {
                      const pendingDocs = (jsonData.attachments as Document[]).filter(
                        (a: Document) => a.status !== 'indexed'
                      );
                      pendingDocs.forEach((doc: Document) => {
                        addIndexingDocument(doc);
                      });
                      if (pendingDocs.length > 0) {
                        pollingRef.current = setInterval(() => {
                          pollDocumentStatus(pendingDocs);
                        }, 2000);
                      }
                    }

                    // Handle done/end/complete events - extract metadata but DON'T append content
                    if (currentEvent === 'done' || currentEvent === 'end' || currentEvent === 'complete' ||
                        currentEvent === 'message_stop' || currentEvent === 'message_complete') {
                      console.log('[Stream] Received end event:', currentEvent);
                      streamCompleted = true;
                      // If the done event has full content and we haven't streamed any yet, use it
                      if (!assistantContent && jsonData.content && typeof jsonData.content === 'string') {
                        assistantContent = jsonData.content;
                        setStreamingMessage(prev => prev ? {
                          ...prev,
                          content: assistantContent,
                        } : null);
                      }
                      continue;
                    }

                    // Handle content deltas - append to streaming content
                    const delta = (jsonData.content || jsonData.delta || jsonData.text || jsonData.chunk) as string | undefined;
                    if (delta && typeof delta === 'string') {
                      // Only append if this is the assistant role or no role specified
                      if (!jsonData.role || jsonData.role === 'assistant') {
                        assistantContent += delta;
                        setStreamingMessage(prev => prev ? {
                          ...prev,
                          content: assistantContent,
                        } : null);
                      }
                    }
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }

          // Finalize the message
          setStreamingMessage(null);
          const finalMessage: Message = {
            message_id: messageId,
            thread_id: threadId,
            role: 'assistant',
            content: assistantContent,
            retrieved_memories: retrievedMemories,
            retrieved_files: retrievedFiles,
            created_at: new Date().toISOString(),
          };
          addMessage(finalMessage);
        } else {
          // Handle non-streaming response (fallback)
          const data = await response.json();

          // Add assistant response
          if (data.content) {
            const assistantMessage: Message = {
              message_id: data.message_id || `resp-${Date.now()}`,
              thread_id: threadId,
              role: 'assistant',
              content: data.content,
              retrieved_memories: data.retrieved_memories,
              retrieved_files: data.retrieved_files,
              created_at: new Date().toISOString(),
            };
            addMessage(assistantMessage);
          }

          // Handle document indexing
          if (data.attachments && data.attachments.length > 0) {
            const pendingDocs = data.attachments.filter(
              (a: Document) => a.status !== 'indexed'
            );

            pendingDocs.forEach((doc: Document) => {
              addIndexingDocument(doc);
            });

            if (pendingDocs.length > 0) {
              // Start polling
              pollingRef.current = setInterval(() => {
                pollDocumentStatus(pendingDocs);
              }, 2000);
            }
          }
        }
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
        setStreamingMessage(null);
      } finally {
        setIsSending(false);
      }
    },
    [
      threadId,
      memoryMode,
      modelConfig,
      addMessage,
      generateAITitle,
      setIsSending,
      addIndexingDocument,
      pollDocumentStatus,
      isIndexing,
    ]
  );

  // Combine messages with streaming message for display
  const displayMessages = streamingMessage
    ? [...currentMessages, streamingMessage]
    : currentMessages;

  return (
    <div className="flex flex-col h-full">
      <TopBar />
      <MessageList
        messages={displayMessages}
        loading={messagesLoading}
        isStreaming={!!streamingMessage}
      />
      <IndexingBanner />
      <Composer
        onSend={handleSend}
        disabled={isSending || isIndexing()}
        placeholder={
          isIndexing()
            ? 'Waiting for documents to index...'
            : 'Type a message...'
        }
      />
    </div>
  );
}
