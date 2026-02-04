'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopBar } from '@/components/chat/TopBar';
import { useAssistantStore } from '@/stores/assistantStore';
import { useThreadStore } from '@/stores/threadStore';

export default function ChatPage() {
  const router = useRouter();
  const { selectedAssistantId } = useAssistantStore();
  const { createThread, threads } = useThreadStore();

  const handleNewChat = async () => {
    if (!selectedAssistantId) return;
    try {
      const thread = await createThread(selectedAssistantId);
      router.push(`/chat/${thread.thread_id}`);
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  // If there are existing threads, redirect to the most recent one
  useEffect(() => {
    if (threads.length > 0) {
      router.push(`/chat/${threads[0].thread_id}`);
    }
  }, [threads, router]);

  return (
    <div className="flex flex-col h-full">
      <TopBar />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="text-6xl mb-6">🤖</div>
          <h2 className="text-2xl font-bold mb-2">Welcome to Backboard Chat</h2>
          <p className="text-muted-foreground mb-6">
            Start a new conversation to chat with your AI assistant.
            Your conversations support persistent memory and document-based RAG.
          </p>
          <Button onClick={handleNewChat} size="lg" className="gap-2">
            <MessageSquarePlus className="h-5 w-5" />
            Start New Chat
          </Button>
        </div>
      </div>
    </div>
  );
}
