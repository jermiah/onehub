'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquarePlus,
  Settings,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ThreadList } from './ThreadList';
import { ApiKeyDialog } from '@/components/settings/ApiKeyDialog';
import { cn } from '@/lib/utils';
import { useAssistantStore } from '@/stores/assistantStore';
import { useThreadStore } from '@/stores/threadStore';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { selectedAssistantId } = useAssistantStore();
  const { createThread } = useThreadStore();
  const [creating, setCreating] = useState(false);

  const handleNewChat = async () => {
    if (!selectedAssistantId || creating) return;
    setCreating(true);
    try {
      const thread = await createThread(selectedAssistantId);
      window.location.href = `/chat/${thread.thread_id}`;
    } catch (error) {
      console.error('Failed to create thread:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className={cn(
        'flex h-full flex-col bg-[#171717] border-r border-border sidebar-transition',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        {!collapsed && (
          <h1 className="text-lg font-semibold text-foreground">
            OneHub
          </h1>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 pb-2">
        <Button
          onClick={handleNewChat}
          disabled={!selectedAssistantId || creating}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <MessageSquarePlus className="h-4 w-4" />
          {!collapsed && 'New chat'}
        </Button>
      </div>

      <Separator />

      {/* Thread List */}
      {!collapsed && (
        <ScrollArea className="flex-1">
          <ThreadList />
        </ScrollArea>
      )}

      <Separator />

      {/* Navigation Links */}
      <div className="p-3 space-y-1">
        <Link href="/workspace">
          <Button
            variant={pathname === '/workspace' ? 'secondary' : 'ghost'}
            className={cn('w-full justify-start gap-2', collapsed && 'px-2')}
          >
            <FolderOpen className="h-4 w-4" />
            {!collapsed && 'RAG Workspace'}
          </Button>
        </Link>
{!collapsed && <ApiKeyDialog />}
      </div>
    </div>
  );
}
