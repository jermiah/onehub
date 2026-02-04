'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { DocumentList } from '@/components/documents/DocumentList';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { useAssistantStore } from '@/stores/assistantStore';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import type { Document } from '@/lib/api/types';

const STRICT_MODE_PREFIX = `IMPORTANT: You must ONLY answer questions using the information from the uploaded documents. If the documents do not contain the answer, respond: "I don't know based on the provided documents."\n\n---\n\n`;

export default function WorkspacePage() {
  const {
    selectedAssistantId,
    getSelectedAssistant,
    updateAssistant,
    fetchAssistants,
  } = useAssistantStore();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [instruction, setInstruction] = useState('');
  const [strictMode, setStrictMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const selectedAssistant = getSelectedAssistant();

  // Parse system prompt to extract instruction and strict mode
  useEffect(() => {
    if (selectedAssistant?.system_prompt) {
      const prompt = selectedAssistant.system_prompt;
      if (prompt.startsWith(STRICT_MODE_PREFIX)) {
        setStrictMode(true);
        setInstruction(prompt.slice(STRICT_MODE_PREFIX.length));
      } else {
        setStrictMode(false);
        setInstruction(prompt);
      }
    } else {
      setStrictMode(false);
      setInstruction('');
    }
    setHasChanges(false);
  }, [selectedAssistant]);

  // Fetch documents for the selected assistant
  const fetchDocuments = useCallback(async () => {
    if (!selectedAssistantId) return;
    setLoadingDocs(true);
    try {
      const response = await fetchWithAuth(
        `/api/backboard/assistants/${selectedAssistantId}/documents`
      );
      if (response.ok) {
        const docs = await response.json();
        setDocuments(docs);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoadingDocs(false);
    }
  }, [selectedAssistantId]);

  useEffect(() => {
    fetchAssistants();
  }, [fetchAssistants]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleInstructionChange = (value: string) => {
    setInstruction(value);
    setHasChanges(true);
  };

  const handleStrictModeChange = (checked: boolean) => {
    setStrictMode(checked);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedAssistantId) return;
    setSaving(true);
    try {
      const systemPrompt = strictMode
        ? STRICT_MODE_PREFIX + instruction
        : instruction;

      await updateAssistant(selectedAssistantId, {
        system_prompt: systemPrompt,
      });
      setHasChanges(false);
      toast.success('Workspace settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (files: File[]) => {
    if (!selectedAssistantId) return;

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetchWithAuth(
          `/api/backboard/assistants/${selectedAssistantId}/documents`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (response.ok) {
          toast.success(`Uploaded ${file.name}`);
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    // Refresh documents list
    fetchDocuments();
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const response = await fetchWithAuth(`/api/backboard/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDocuments((prev) => prev.filter((d) => d.document_id !== documentId));
        toast.success('Document deleted');
      } else {
        toast.error('Failed to delete document');
      }
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  if (!selectedAssistantId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Please select an assistant first
          </p>
          <Link href="/assistants">
            <Button>Go to Assistants</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border sticky top-0 bg-background z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/chat">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">RAG Workspace</h1>
              {selectedAssistant && (
                <p className="text-sm text-muted-foreground">
                  {selectedAssistant.name}
                </p>
              )}
            </div>
          </div>
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Workspace Instruction */}
        <section>
          <h2 className="text-lg font-semibold mb-2">Workspace Instruction</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This instruction will be used as the assistant&apos;s system prompt. It
            guides how the assistant responds to queries.
          </p>
          <Textarea
            value={instruction}
            onChange={(e) => handleInstructionChange(e.target.value)}
            placeholder="You are a helpful assistant that answers questions based on the provided documents..."
            rows={6}
            className="resize-none"
          />
        </section>

        <Separator />

        {/* Strict Mode */}
        <section>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Strict Mode</h2>
              <p className="text-sm text-muted-foreground mt-1">
                When enabled, the assistant will only answer questions using
                information from the uploaded documents. If the documents don&apos;t
                contain the answer, it will respond with &quot;I don&apos;t know.&quot;
              </p>
            </div>
            <Switch
              checked={strictMode}
              onCheckedChange={handleStrictModeChange}
            />
          </div>
        </section>

        <Separator />

        {/* Document Upload */}
        <section>
          <h2 className="text-lg font-semibold mb-2">Upload Documents</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Upload documents to be used for RAG (Retrieval Augmented Generation).
            These documents will be indexed and used to answer questions.
          </p>
          <DocumentUpload onUpload={handleUpload} />
        </section>

        <Separator />

        {/* Document List */}
        <section>
          <h2 className="text-lg font-semibold mb-4">
            Uploaded Documents ({documents.length})
          </h2>
          {loadingDocs ? (
            <div className="space-y-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : (
            <DocumentList
              documents={documents}
              onDelete={handleDeleteDocument}
            />
          )}
        </section>
      </div>
    </div>
  );
}
