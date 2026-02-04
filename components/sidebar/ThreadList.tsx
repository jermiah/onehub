'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ThreadItem } from './ThreadItem';
import { useAssistantStore } from '@/stores/assistantStore';
import { useThreadStore } from '@/stores/threadStore';

export function ThreadList() {
  const router = useRouter();
  const pathname = usePathname();
  const { selectedAssistantId } = useAssistantStore();
  const {
    threads,
    loading,
    searchQuery,
    setSearchQuery,
    fetchThreads,
    getFilteredThreads,
  } = useThreadStore();

  // Extract current thread ID from pathname
  const currentThreadId = pathname.startsWith('/chat/')
    ? pathname.split('/')[2]
    : null;

  useEffect(() => {
    if (selectedAssistantId) {
      fetchThreads(selectedAssistantId);
    }
  }, [selectedAssistantId, fetchThreads]);

  const filteredThreads = getFilteredThreads();

  const handleSelectThread = (threadId: string) => {
    router.push(`/chat/${threadId}`);
  };

  if (loading && threads.length === 0) {
    return (
      <div className="p-3 space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-background/50"
          />
        </div>
      </div>

      {/* Thread List */}
      <div className="px-2 pb-2 space-y-1">
        {filteredThreads.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            {threads.length === 0
              ? 'No conversations yet'
              : 'No matching conversations'}
          </div>
        ) : (
          filteredThreads.map((thread) => (
            <ThreadItem
              key={thread.thread_id}
              thread={thread}
              isActive={thread.thread_id === currentThreadId}
              onSelect={() => handleSelectThread(thread.thread_id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
