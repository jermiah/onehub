'use client';

import { User, Bot, FileText, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Message } from '@/lib/api/types';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const hasMemories = message.retrieved_memories && message.retrieved_memories.length > 0;
  const hasFiles = message.retrieved_files && message.retrieved_files.length > 0;

  return (
    <div
      className={cn(
        'flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary' : 'bg-secondary'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-secondary-foreground" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'flex flex-col gap-1 max-w-[80%]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-2',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-secondary text-secondary-foreground rounded-tl-sm'
          )}
        >
          <div className="message-content whitespace-pre-wrap">
            {message.content}
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-0.5 bg-current animate-pulse" />
            )}
          </div>
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.attachments.map((attachment) => (
              <Badge
                key={attachment.document_id}
                variant="outline"
                className="text-xs"
              >
                <FileText className="h-3 w-3 mr-1" />
                {attachment.filename}
              </Badge>
            ))}
          </div>
        )}

        {/* Memory indicator - small blinking icon */}
        {!isUser && (hasMemories || hasFiles) && (
          <div className="flex items-center gap-1.5 mt-1">
            {hasMemories && (
              <div className="flex items-center gap-1 text-xs text-purple-400" title={`${message.retrieved_memories!.length} memory used`}>
                <Brain className="h-3.5 w-3.5 animate-pulse" />
              </div>
            )}
            {hasFiles && (
              <div className="flex items-center gap-1 text-xs text-blue-400" title={`${message.retrieved_files!.length} document used`}>
                <FileText className="h-3.5 w-3.5 animate-pulse" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
