'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { useAssistantStore } from '@/stores/assistantStore';
import { ApiKeyDialog } from '@/components/settings/ApiKeyDialog';
import { Button } from '@/components/ui/button';
import { Key } from 'lucide-react';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { ensureDefaultAssistant, loading } = useAssistantStore();
  const [initialized, setInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Try to initialize - will work if API key is in .env OR localStorage
        await ensureDefaultAssistant();
        setInitError(null);
        setApiKeyMissing(false);
      } catch (error) {
        console.error('Failed to initialize assistant:', error);
        const errorMsg = (error as Error).message;
        // Check if this is an API key error (401 or explicit message)
        if (errorMsg.includes('API key') || errorMsg.includes('401') || errorMsg.includes('API_KEY_MISSING')) {
          setApiKeyMissing(true);
        } else {
          setInitError(errorMsg);
        }
      } finally {
        setInitialized(true);
      }
    };
    init();
  }, [ensureDefaultAssistant]);

  // Retry initialization after API key is saved
  const handleRetry = () => {
    setInitialized(false);
    setInitError(null);
    setApiKeyMissing(false);
    // Trigger re-initialization
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  if (!initialized || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show API key setup screen
  if (apiKeyMissing) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md p-6">
          <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">API Key Required</h2>
          <p className="text-muted-foreground mb-6">
            To use OneHub, you need to configure your API key.
            Get your API key from{' '}
            <a
              href="https://app.backboard.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              app.backboard.io
            </a>
          </p>
          <div className="flex gap-2 justify-center">
            <ApiKeyDialog onSave={handleRetry} triggerVariant="primary" />
          </div>
        </div>
      </div>
    );
  }

  // Show general error
  if (initError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md p-6">
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">{initError}</p>
          <Button onClick={handleRetry}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
