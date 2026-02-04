import { NextRequest, NextResponse } from 'next/server';
import { backboardFetch } from '@/lib/api/client';

interface BackboardModel {
  name: string;
  provider: string;
  model_type: string;
  context_limit: number;
  max_output_tokens?: number;
  supports_tools?: boolean;
  api_mode?: string;
  embedding_dimensions?: number;
  last_updated?: string;
}

interface ModelsResponse {
  models: BackboardModel[];
  total: number;
}

// GET /api/backboard/models/provider/[providerName] - List models by provider
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ providerName: string }> }
) {
  try {
    const { providerName } = await params;
    const searchParams = request.nextUrl.searchParams;
    const skip = searchParams.get('skip') || '0';
    const limit = searchParams.get('limit') || '500'; // Max allowed by API

    console.log('[Models by Provider API] Fetching models for provider:', providerName);
    const response = await backboardFetch<ModelsResponse>(
      `/models/provider/${encodeURIComponent(providerName)}?skip=${skip}&limit=${limit}`
    );

    console.log('[Models by Provider API] Got', response.models?.length || 0, 'models for', providerName, '(total:', response.total, ')');
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching models by provider:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
