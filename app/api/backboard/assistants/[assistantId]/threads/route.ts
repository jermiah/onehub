import { NextRequest, NextResponse } from 'next/server';
import { backboardFetch } from '@/lib/api/client';
import type { Thread, ThreadCreate } from '@/lib/api/types';

// GET /api/backboard/assistants/[assistantId]/threads - List threads for assistant
export async function GET(
  request: NextRequest,
  { params }: { params: { assistantId: string } }
) {
  try {
    const { assistantId } = params;
    const searchParams = request.nextUrl.searchParams;
    const skip = searchParams.get('skip') || '0';
    const limit = searchParams.get('limit') || '100';

    const threads = await backboardFetch<Thread[]>(
      `/assistants/${assistantId}/threads?skip=${skip}&limit=${limit}`
    );

    return NextResponse.json(threads);
  } catch (error) {
    console.error('Error fetching threads:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch threads';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// POST /api/backboard/assistants/[assistantId]/threads - Create a new thread
export async function POST(
  request: NextRequest,
  { params }: { params: { assistantId: string } }
) {
  try {
    const { assistantId } = params;
    let body: ThreadCreate = {};

    try {
      body = await request.json();
    } catch {
      // Empty body is fine for thread creation
    }

    const thread = await backboardFetch<Thread>(
      `/assistants/${assistantId}/threads`,
      {
        method: 'POST',
        body,
      }
    );

    return NextResponse.json(thread);
  } catch (error) {
    console.error('Error creating thread:', error);
    const message = error instanceof Error ? error.message : 'Failed to create thread';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
