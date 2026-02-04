'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AssistantCard } from '@/components/assistants/AssistantCard';
import { AssistantForm } from '@/components/assistants/AssistantForm';
import { useAssistantStore } from '@/stores/assistantStore';
import type { Assistant, AssistantCreate, AssistantUpdate } from '@/lib/api/types';

export default function AssistantsPage() {
  const {
    assistants,
    selectedAssistantId,
    loading,
    fetchAssistants,
    createAssistant,
    updateAssistant,
    deleteAssistant,
    selectAssistant,
  } = useAssistantStore();

  const [showForm, setShowForm] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(null);

  useEffect(() => {
    fetchAssistants();
  }, [fetchAssistants]);

  const handleSubmit = async (data: AssistantCreate | AssistantUpdate) => {
    if (editingAssistant) {
      // Update existing assistant
      try {
        await updateAssistant(editingAssistant.assistant_id, data as AssistantUpdate);
        toast.success('Assistant updated successfully');
      } catch (error) {
        toast.error('Failed to update assistant');
        throw error;
      }
    } else {
      // Create new assistant
      try {
        const assistant = await createAssistant(data as AssistantCreate);
        selectAssistant(assistant.assistant_id);
        toast.success('Assistant created successfully');
      } catch (error) {
        toast.error('Failed to create assistant');
        throw error;
      }
    }
  };

  const handleDelete = async (assistantId: string) => {
    try {
      await deleteAssistant(assistantId);
      toast.success('Assistant deleted successfully');
    } catch (error) {
      toast.error('Failed to delete assistant');
      throw error;
    }
  };

  const handleEdit = (assistant: Assistant) => {
    setEditingAssistant(assistant);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingAssistant(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/chat">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Assistants</h1>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Assistant
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading && assistants.length === 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : assistants.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-xl font-semibold mb-2">No assistants yet</h2>
            <p className="text-muted-foreground mb-4">
              Create your first assistant to start chatting
            </p>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Assistant
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {assistants.map((assistant) => (
              <AssistantCard
                key={assistant.assistant_id}
                assistant={assistant}
                isSelected={assistant.assistant_id === selectedAssistantId}
                onSelect={() => selectAssistant(assistant.assistant_id)}
                onEdit={() => handleEdit(assistant)}
                onDelete={() => handleDelete(assistant.assistant_id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <AssistantForm
        open={showForm}
        onOpenChange={handleFormClose}
        assistant={editingAssistant}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
