import { NextRequest, NextResponse } from 'next/server';
import { backboardFetch, ApiKeyNotConfiguredError } from '@/lib/api/client';

interface ProvidersResponse {
  providers: string[];
  total: number;
}

// GET /api/backboard/models/providers - List available model providers
export async function GET(request: NextRequest) {
  try {
    console.log('[Providers API] Fetching providers from Backboard...');
    const response = await backboardFetch<ProvidersResponse>('/models/providers');
    console.log('[Providers API] Got', response.providers?.length || 0, 'providers, total:', response.total);
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof ApiKeyNotConfiguredError) {
      return NextResponse.json(
        { error: 'API key not configured', code: 'API_KEY_MISSING' },
        { status: 401 }
      );
    }
    console.error('Error fetching providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}
