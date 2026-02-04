'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Key, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [keySource, setKeySource] = useState<'cookie' | 'env' | 'none'>('none');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Check if API key is already set
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const response = await fetch('/api/settings/apikey');
        if (response.ok) {
          const data = await response.json();
          setHasKey(data.hasKey);
          setKeySource(data.source);
        }
      } catch (error) {
        console.error('Failed to check API key:', error);
      } finally {
        setLoading(false);
      }
    };
    checkApiKey();
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/settings/apikey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('API key saved successfully!');
        setHasKey(true);
        setKeySource('cookie');
        setApiKey('');
      } else {
        toast.error(data.error || 'Failed to save API key');
      }
    } catch (error) {
      toast.error('Failed to save API key');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    try {
      const response = await fetch('/api/settings/apikey', {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('API key removed');
        setHasKey(false);
        setKeySource('none');
      }
    } catch (error) {
      toast.error('Failed to remove API key');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/chat">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* API Key Section */}
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Backboard API Key</h2>
                <p className="text-sm text-muted-foreground">
                  Required to connect to Backboard services
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking API key status...
              </div>
            ) : (
              <>
                {/* Status */}
                <div className="flex items-center gap-2 mb-4">
                  {hasKey ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="text-green-500 font-medium">API key configured</span>
                      <Badge variant="secondary" className="ml-2">
                        {keySource === 'env' ? 'Environment Variable' : 'Saved in Browser'}
                      </Badge>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                      <span className="text-yellow-500 font-medium">No API key configured</span>
                    </>
                  )}
                </div>

                {/* Input */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      {hasKey ? 'Update API Key' : 'Enter API Key'}
                    </label>
                    <Input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="font-mono"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={saving || !apiKey.trim()}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Validating...
                        </>
                      ) : (
                        'Save API Key'
                      )}
                    </Button>
                    {hasKey && keySource === 'cookie' && (
                      <Button variant="outline" onClick={handleRemove}>
                        Remove Key
                      </Button>
                    )}
                  </div>
                </div>

                {/* Help Text */}
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Get your API key from{' '}
                    <a
                      href="https://app.backboard.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      app.backboard.io
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Your API key is stored securely and never exposed to the browser.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
