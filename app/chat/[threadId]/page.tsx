'use client';

import { ChatView } from '@/components/chat/ChatView';

interface ChatThreadPageProps {
  params: { threadId: string };
}

export default function ChatThreadPage({ params }: ChatThreadPageProps) {
  return <ChatView threadId={params.threadId} />;
}
