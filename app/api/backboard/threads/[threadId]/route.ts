import { NextRequest, NextResponse } from 'next/server';
import { backboardFetch, backboardDelete } from '@/lib/api/client';
import type { Thread } from '@/lib/api/types';

// GET /api/backboard/threads/[threadId] - Get thread with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;
    const thread = await backboardFetch<Thread>(`/threads/${threadId}`);
    return NextResponse.json(thread);
  } catch (error) {
    console.error('Error fetching thread:', error);
    return NextResponse.json(
      { error: 'Failed to fetch thread' },
      { status: 500 }
    );
  }
}

// PATCH /api/backboard/threads/[threadId] - Update thread (title)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;
    const body = await request.json();
    const { title } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    console.log('[Thread API] Updating thread title:', threadId, '->', title);

    // Update thread via Backboard API
    const thread = await backboardFetch<Thread>(`/threads/${threadId}`, {
      method: 'PATCH',
      body: { title },
    });

    return NextResponse.json(thread);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating thread:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/backboard/threads/[threadId] - Delete thread
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;
    console.log('Deleting thread:', threadId);
    await backboardDelete(`/threads/${threadId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting thread:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
