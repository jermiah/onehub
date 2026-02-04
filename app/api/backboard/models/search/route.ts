import { NextRequest, NextResponse } from 'next/server';
import { backboardFetch } from '@/lib/api/client';

export interface BackboardModel {
  name: string;
  provider: string;
  context_limit: number;
  max_output_tokens?: number;
  supports_vision?: boolean;
  supports_tools?: boolean;
  supports_json_mode?: boolean;
}

export interface ModelsResponse {
  models: BackboardModel[];
  total: number;
}

interface ProvidersResponse {
  providers: string[];
  total: number;
}

// GET /api/backboard/models/search - Search models by name across all providers
// Query params: q (search query), limit (default 50)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!query.trim()) {
      return NextResponse.json({ models: [], total: 0 });
    }

    console.log('[Models Search API] Searching models:', { query, limit });

    const searchLower = query.toLowerCase();
    const BATCH_SIZE = 500;

    // First get list of all providers
    const providersResponse = await backboardFetch<ProvidersResponse>('/models/providers');
    const providers = providersResponse.providers || [];

    console.log('[Models Search API] Searching across', providers.length, 'providers');

    // Search across all providers in parallel
    // For each provider, fetch first batch and search
    const searchPromises = providers.map(async (provider) => {
      try {
        // First batch
        const response = await backboardFetch<ModelsResponse>(
          `/models/provider/${encodeURIComponent(provider)}?skip=0&limit=${BATCH_SIZE}`
        );

        let providerModels = response.models || [];
        const total = response.total || providerModels.length;

        // If provider has more models and query might match, fetch more
        // Only fetch more batches if we found matches in the first batch or provider name matches
        const firstBatchMatches = providerModels.filter(
          (m) => m.name.toLowerCase().includes(searchLower)
        );
        const providerMatches = provider.toLowerCase().includes(searchLower);

        if (total > BATCH_SIZE && (firstBatchMatches.length > 0 || providerMatches)) {
          // Fetch remaining batches for this provider
          const remainingBatches = Math.ceil((total - BATCH_SIZE) / BATCH_SIZE);
          const batchPromises: Promise<ModelsResponse>[] = [];

          for (let i = 1; i <= Math.min(remainingBatches, 10); i++) {
            // Limit to 10 extra batches per provider
            const skip = i * BATCH_SIZE;
            batchPromises.push(
              backboardFetch<ModelsResponse>(
                `/models/provider/${encodeURIComponent(provider)}?skip=${skip}&limit=${BATCH_SIZE}`
              )
            );
          }

          const batchResults = await Promise.all(batchPromises);
          for (const result of batchResults) {
            if (result.models) {
              providerModels = [...providerModels, ...result.models];
            }
          }
        }

        return providerModels;
      } catch {
        return [];
      }
    });

    const allProviderResults = await Promise.all(searchPromises);
    const allModels = allProviderResults.flat();

    console.log('[Models Search API] Total models fetched:', allModels.length);

    // Filter models that match the search query
    const matchedModels = allModels.filter(
      (model) =>
        model.name.toLowerCase().includes(searchLower) ||
        model.provider.toLowerCase().includes(searchLower)
    );

    // Sort by relevance - exact matches first, then starts with, then contains
    matchedModels.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();

      // Exact match
      if (aName === searchLower && bName !== searchLower) return -1;
      if (bName === searchLower && aName !== searchLower) return 1;

      // Starts with
      const aStartsWith = aName.startsWith(searchLower);
      const bStartsWith = bName.startsWith(searchLower);
      if (aStartsWith && !bStartsWith) return -1;
      if (bStartsWith && !aStartsWith) return 1;

      // Alphabetical
      return aName.localeCompare(bName);
    });

    // Limit results
    const limitedModels = matchedModels.slice(0, limit);

    console.log('[Models Search API] Found', matchedModels.length, 'matching models, returning', limitedModels.length);

    return NextResponse.json({
      models: limitedModels,
      total: matchedModels.length,
    });
  } catch (error) {
    console.error('Error searching models:', error);
    return NextResponse.json(
      { error: 'Failed to search models' },
      { status: 500 }
    );
  }
}
