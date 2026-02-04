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

// GET /api/backboard/models - List available models
// Supports query params: model_type, provider, limit, skip
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const modelType = searchParams.get('model_type') || 'llm';
    const provider = searchParams.get('provider');
    const limit = searchParams.get('limit') || '100';
    const skip = searchParams.get('skip') || '0';

    // Build query string
    const params = new URLSearchParams();
    params.set('model_type', modelType);
    params.set('limit', limit);
    params.set('skip', skip);
    if (provider) {
      params.set('provider', provider);
    }

    console.log('[Models API] Fetching models from Backboard:', { modelType, provider, limit, skip });
    const response = await backboardFetch<ModelsResponse>(
      `/models?${params.toString()}`
    );

    // API returns { models: [...], total: number }
    const models = response.models || [];
    const total = response.total || models.length;

    console.log('[Models API] Got', models.length, 'models (total:', total, ')');

    return NextResponse.json({ models, total });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
