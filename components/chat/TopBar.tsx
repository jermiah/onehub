'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Cpu, Loader2, Bot, Plus, Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatStore } from '@/stores/chatStore';
import { useAssistantStore } from '@/stores/assistantStore';
import type { MemoryMode, BackboardModel } from '@/lib/api/types';

function formatContextLimit(limit: number): string {
  if (limit >= 1000000) {
    return `${(limit / 1000000).toFixed(1)}M`;
  } else if (limit >= 1000) {
    return `${Math.round(limit / 1000)}K`;
  }
  return limit.toString();
}

function formatTotalModels(total: number): string {
  return total.toLocaleString();
}

export function TopBar() {
  const router = useRouter();

  const {
    memoryMode,
    modelConfig,
    providers,
    providersLoading,
    availableModels,
    providerModelCount,
    modelsLoading,
    totalModels,
    searchResults,
    searchLoading,
    setMemoryMode,
    setModelConfig,
    fetchProviders,
    fetchModelsByProvider,
    searchModels,
    clearSearchResults,
    selectSearchedModel,
  } = useChatStore();

  const {
    assistants,
    selectedAssistantId,
    selectAssistant,
    createAssistant,
    loading: assistantLoading,
  } = useAssistantStore();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAssistantName, setNewAssistantName] = useState('');
  const [newAssistantPrompt, setNewAssistantPrompt] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Global model search state
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Fetch providers on mount
  useEffect(() => {
    if (providers.length === 0) {
      fetchProviders();
    }
  }, [providers.length, fetchProviders]);

  // Sort providers - prioritize popular ones first
  const sortedProviders = useMemo(() => {
    const providerOrder = ['openai', 'anthropic', 'google', 'mistral', 'groq', 'cohere', 'meta'];
    return [...providers].sort((a, b) => {
      const aIndex = providerOrder.indexOf(a.toLowerCase());
      const bIndex = providerOrder.indexOf(b.toLowerCase());
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [providers]);

  // Model search state (within provider)
  const [modelSearch, setModelSearch] = useState('');

  // Debounced global search
  useEffect(() => {
    if (!showSearchDialog) return;

    const timer = setTimeout(() => {
      if (globalSearchQuery.trim()) {
        searchModels(globalSearchQuery);
      } else {
        clearSearchResults();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [globalSearchQuery, showSearchDialog, searchModels, clearSearchResults]);

  // Handle selecting a model from global search
  const handleSearchSelect = useCallback((model: BackboardModel) => {
    selectSearchedModel(model);
    setShowSearchDialog(false);
    setGlobalSearchQuery('');
  }, [selectSearchedModel]);

  // Close search dialog and clear results
  const handleCloseSearch = useCallback(() => {
    setShowSearchDialog(false);
    setGlobalSearchQuery('');
    clearSearchResults();
  }, [clearSearchResults]);

  // Filter and limit models for performance
  // Only show first 100 models by default, search to find more
  const MAX_DISPLAY = 100;

  const filteredModels = useMemo(() => {
    if (modelSearch.trim()) {
      // When searching, filter all models but still limit display
      const search = modelSearch.toLowerCase();
      const matched = availableModels.filter((m) => m.name.toLowerCase().includes(search));
      return matched.slice(0, MAX_DISPLAY);
    }
    // Default: show first 100 models only
    return availableModels.slice(0, MAX_DISPLAY);
  }, [availableModels, modelSearch]);

  const hasMoreModels = modelSearch.trim()
    ? availableModels.filter((m) => m.name.toLowerCase().includes(modelSearch.toLowerCase())).length > MAX_DISPLAY
    : availableModels.length > MAX_DISPLAY;

  // Format provider name for display
  const formatProviderName = (provider: string) => {
    const names: Record<string, string> = {
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      google: 'Google',
      mistral: 'Mistral AI',
      groq: 'Groq',
      cohere: 'Cohere',
      meta: 'Meta',
      azure: 'Azure',
      aws: 'AWS Bedrock',
    };
    return names[provider.toLowerCase()] || provider.charAt(0).toUpperCase() + provider.slice(1);
  };

  // Handle provider change - fetch models for that provider
  const handleProviderChange = (provider: string) => {
    setModelConfig({ llm_provider: provider, model_name: '' });
    setModelSearch(''); // Clear search when changing provider
    fetchModelsByProvider(provider);
  };

  // Handle model change within selected provider
  const handleModelChange = (modelName: string) => {
    setModelConfig({ llm_provider: modelConfig.llm_provider, model_name: modelName });
  };

  // Find current assistant for display
  const currentAssistant = assistants.find((a) => a.assistant_id === selectedAssistantId);

  const handleAssistantChange = (value: string) => {
    if (value === 'create-new') {
      setShowCreateDialog(true);
    } else {
      selectAssistant(value);
      // Navigate to chat home when switching assistants
      router.push('/chat');
    }
  };

  const handleCreateAssistant = async () => {
    if (!newAssistantName.trim()) return;

    setIsCreating(true);
    try {
      const assistant = await createAssistant({
        name: newAssistantName.trim(),
        system_prompt: newAssistantPrompt.trim() || 'You are a helpful AI assistant.',
        top_k: 5,
      });
      selectAssistant(assistant.assistant_id);
      setShowCreateDialog(false);
      setNewAssistantName('');
      setNewAssistantPrompt('');
      // Navigate to chat home with the new assistant
      router.push('/chat');
    } catch (error) {
      console.error('Failed to create assistant:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-card/50">
      <div className="flex items-center gap-4">
        {/* Assistant Selector */}
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedAssistantId || ''} onValueChange={handleAssistantChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select assistant">
                {currentAssistant?.name || 'Select assistant'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {assistants.map((assistant) => (
                <SelectItem key={assistant.assistant_id} value={assistant.assistant_id}>
                  {assistant.name}
                </SelectItem>
              ))}
              <SelectSeparator />
              <SelectItem value="create-new">
                <div className="flex items-center gap-2 text-primary">
                  <Plus className="h-4 w-4" />
                  Create New Assistant
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Model Selector - Two Dropdowns + Total Count */}
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-muted-foreground" />
          {providersLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading providers...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Provider Dropdown */}
              <Select value={modelConfig.llm_provider} onValueChange={handleProviderChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Provider">
                    {formatProviderName(modelConfig.llm_provider)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {sortedProviders.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {formatProviderName(provider)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Model Dropdown with Search */}
              <Select value={modelConfig.model_name} onValueChange={handleModelChange}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select model">
                    {modelsLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      modelConfig.model_name || 'Select model'
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {/* Search Input */}
                  <div className="px-2 pb-2">
                    <Input
                      placeholder="Search models..."
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      className="h-8"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  <SelectSeparator />
                  {/* Model Count */}
                  <div className="px-2 py-1 text-xs text-muted-foreground flex items-center gap-1">
                    {modelSearch.trim() ? (
                      <span>
                        Showing {filteredModels.length}
                        {hasMoreModels && '+'} matches
                      </span>
                    ) : (
                      <span>
                        Showing {Math.min(MAX_DISPLAY, availableModels.length)} of {providerModelCount.toLocaleString()}
                      </span>
                    )}
                    {modelsLoading && (
                      <Loader2 className="h-3 w-3 animate-spin ml-1" />
                    )}
                  </div>
                  {hasMoreModels && !modelSearch.trim() && (
                    <div className="px-2 pb-1 text-xs text-muted-foreground">
                      Type to search all models
                    </div>
                  )}
                  <SelectSeparator />
                  {/* Model List */}
                  {filteredModels.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      No models found
                    </div>
                  ) : (
                    filteredModels.map((model) => (
                      <SelectItem key={model.name} value={model.name}>
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="truncate">{model.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatContextLimit(model.context_limit)} ctx
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {/* Global Search Button */}
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => setShowSearchDialog(true)}
                title="Search all models"
              >
                <Search className="h-4 w-4" />
              </Button>

            </div>
          )}
        </div>
      </div>

      {/* Right Side - Total Models + Memory Mode */}
      <div className="flex items-center gap-4">
        {/* Total Models Badge */}
        {totalModels > 0 && (
          <Badge variant="secondary" className="text-xs">
            {formatTotalModels(totalModels)} models
          </Badge>
        )}

        {/* Memory Mode Toggle */}
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Memory:</span>
          <div className="flex gap-1">
            {(['Off', 'Readonly', 'Auto'] as MemoryMode[]).map((mode) => (
              <Badge
                key={mode}
                variant={memoryMode === mode ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setMemoryMode(mode)}
              >
                {mode}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Create Assistant Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Assistant</DialogTitle>
            <DialogDescription>
              Create a custom assistant with your own system prompt to define how it should behave.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="assistant-name">Assistant Name</Label>
              <Input
                id="assistant-name"
                placeholder="My Custom Assistant"
                value={newAssistantName}
                onChange={(e) => setNewAssistantName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="system-prompt">System Prompt</Label>
              <Textarea
                id="system-prompt"
                placeholder="You are a helpful AI assistant that specializes in..."
                className="min-h-[150px]"
                value={newAssistantPrompt}
                onChange={(e) => setNewAssistantPrompt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Define how this assistant should behave. Leave empty for default behavior.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAssistant} disabled={!newAssistantName.trim() || isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Assistant'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Global Model Search Dialog */}
      <Dialog open={showSearchDialog} onOpenChange={handleCloseSearch}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Search All Models</DialogTitle>
            <DialogDescription>
              Search across all {formatTotalModels(totalModels)} models from all providers.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by model name (e.g., gpt-4, claude, llama)..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            {/* Search Results */}
            <div className="border rounded-md">
              <ScrollArea className="h-[300px]">
                {searchLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    {globalSearchQuery.trim() ? (
                      <>
                        <Search className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No models found for &ldquo;{globalSearchQuery}&rdquo;</p>
                      </>
                    ) : (
                      <>
                        <Search className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">Type to search models...</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="divide-y">
                    {searchResults.map((model) => (
                      <button
                        key={`${model.provider}-${model.name}`}
                        className="w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-center justify-between gap-4"
                        onClick={() => handleSearchSelect(model)}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium truncate">{model.name}</span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {model.provider}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="text-xs">
                            {formatContextLimit(model.context_limit)} ctx
                          </Badge>
                          {model.supports_vision && (
                            <Badge variant="outline" className="text-xs">Vision</Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {searchResults.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Showing {searchResults.length} results. Click a model to select it.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
