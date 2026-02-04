'use client';

import { useState, useEffect } from 'react';
import { Settings, Eye, EyeOff, Check, Trash2, Key } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApiKeyStore } from '@/stores/apiKeyStore';

interface ApiKeyDialogProps {
  onSave?: () => void;
  triggerVariant?: 'default' | 'primary';
}

export function ApiKeyDialog({ onSave, triggerVariant = 'default' }: ApiKeyDialogProps) {
  const { apiKey, setApiKey, clearApiKey, isConfigured } = useApiKeyStore();
  const [open, setOpen] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  // Reset input when dialog opens
  useEffect(() => {
    if (open) {
      setInputKey(apiKey || '');
      setShowKey(false);
    }
  }, [open, apiKey]);

  const handleSave = () => {
    if (!inputKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }
    setApiKey(inputKey.trim());
    toast.success('API key saved');
    setOpen(false);
    onSave?.();
  };

  const handleClear = () => {
    clearApiKey();
    setInputKey('');
    toast.success('API key removed');
  };

  const maskedKey = apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : '';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerVariant === 'primary' ? (
          <Button>
            <Key className="h-4 w-4 mr-2" />
            Configure API Key
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
            <Settings className="h-4 w-4" />
            <span>API Settings</span>
            {isConfigured() && (
              <Check className="h-3 w-3 ml-auto text-green-500" />
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Backboard API Key</DialogTitle>
          <DialogDescription>
            Enter your Backboard API key to use the chat. Get your key from{' '}
            <a
              href="https://app.backboard.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              app.backboard.io
            </a>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isConfigured() && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm">Current key: {maskedKey}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showKey ? 'text' : 'password'}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Enter your Backboard API key"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          {isConfigured() && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleClear}
              className="mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Key
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
