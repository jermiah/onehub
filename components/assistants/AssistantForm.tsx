'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Assistant, AssistantCreate, AssistantUpdate } from '@/lib/api/types';

interface AssistantFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistant?: Assistant | null;
  onSubmit: (data: AssistantCreate | AssistantUpdate) => Promise<void>;
}

export function AssistantForm({
  open,
  onOpenChange,
  assistant,
  onSubmit,
}: AssistantFormProps) {
  const [name, setName] = useState(assistant?.name || '');
  const [description, setDescription] = useState(assistant?.description || '');
  const [systemPrompt, setSystemPrompt] = useState(assistant?.system_prompt || '');
  const [topK, setTopK] = useState(assistant?.top_k?.toString() || '5');
  const [embeddingProvider, setEmbeddingProvider] = useState(
    assistant?.embedding_provider || ''
  );
  const [embeddingModelName, setEmbeddingModelName] = useState(
    assistant?.embedding_model_name || ''
  );
  const [saving, setSaving] = useState(false);

  const isEdit = !!assistant;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const data: AssistantCreate | AssistantUpdate = {
        name: name.trim(),
        description: description.trim() || undefined,
        system_prompt: systemPrompt.trim() || undefined,
        top_k: topK ? parseInt(topK, 10) : undefined,
      };

      // Only include embedding settings for new assistants
      if (!isEdit) {
        if (embeddingProvider.trim()) {
          (data as AssistantCreate).embedding_provider = embeddingProvider.trim();
        }
        if (embeddingModelName.trim()) {
          (data as AssistantCreate).embedding_model_name = embeddingModelName.trim();
        }
      }

      await onSubmit(data);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save assistant:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setSystemPrompt('');
    setTopK('5');
    setEmbeddingProvider('');
    setEmbeddingModelName('');
  };

  // Reset form when dialog opens with new assistant data
  const handleOpenChange = (open: boolean) => {
    if (open && assistant) {
      setName(assistant.name || '');
      setDescription(assistant.description || '');
      setSystemPrompt(assistant.system_prompt || '');
      setTopK(assistant.top_k?.toString() || '5');
      setEmbeddingProvider(assistant.embedding_provider || '');
      setEmbeddingModelName(assistant.embedding_model_name || '');
    } else if (open && !assistant) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Assistant' : 'Create Assistant'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Assistant"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A helpful assistant for..."
            />
          </div>

          <div>
            <label className="text-sm font-medium">System Prompt</label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful AI assistant..."
              rows={4}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Top-K (Document Retrieval)</label>
            <Input
              type="number"
              value={topK}
              onChange={(e) => setTopK(e.target.value)}
              placeholder="5"
              min="1"
              max="20"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Number of document chunks to retrieve (1-20)
            </p>
          </div>

          {!isEdit && (
            <>
              <div>
                <label className="text-sm font-medium">
                  Embedding Provider (optional)
                </label>
                <Input
                  value={embeddingProvider}
                  onChange={(e) => setEmbeddingProvider(e.target.value)}
                  placeholder="openai"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Embedding Model (optional)
                </label>
                <Input
                  value={embeddingModelName}
                  onChange={(e) => setEmbeddingModelName(e.target.value)}
                  placeholder="text-embedding-3-small"
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
