import { NextRequest, NextResponse } from 'next/server';
import { backboardFetch, ApiKeyNotConfiguredError } from '@/lib/api/client';
import type { Assistant, AssistantCreate } from '@/lib/api/types';

// GET /api/backboard/assistants - List all assistants
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const skip = searchParams.get('skip') || '0';
    const limit = searchParams.get('limit') || '100';

    const assistants = await backboardFetch<Assistant[]>(
      `/assistants?skip=${skip}&limit=${limit}`
    );

    return NextResponse.json(assistants);
  } catch (error) {
    if (error instanceof ApiKeyNotConfiguredError) {
      return NextResponse.json(
        { error: 'API key not configured', code: 'API_KEY_MISSING' },
        { status: 401 }
      );
    }
    const errorMsg = (error as Error).message || '';
    // Check if it's an API key error from Backboard
    if (errorMsg.includes('401') || errorMsg.includes('Invalid API Key')) {
      return NextResponse.json(
        { error: 'Invalid API key', code: 'API_KEY_INVALID' },
        { status: 401 }
      );
    }
    console.error('Error fetching assistants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assistants' },
      { status: 500 }
    );
  }
}

// POST /api/backboard/assistants - Create a new assistant
export async function POST(request: NextRequest) {
  try {
    const body: AssistantCreate = await request.json();

    const assistant = await backboardFetch<Assistant>('/assistants', {
      method: 'POST',
      body,
    });

    return NextResponse.json(assistant);
  } catch (error) {
    if (error instanceof ApiKeyNotConfiguredError) {
      return NextResponse.json(
        { error: 'API key not configured', code: 'API_KEY_MISSING' },
        { status: 401 }
      );
    }
    console.error('Error creating assistant:', error);
    return NextResponse.json(
      { error: 'Failed to create assistant' },
      { status: 500 }
    );
  }
}
