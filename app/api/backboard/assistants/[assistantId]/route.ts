import { NextRequest, NextResponse } from 'next/server';
import { backboardFetch, backboardDelete } from '@/lib/api/client';
import type { Assistant, AssistantUpdate } from '@/lib/api/types';

// GET /api/backboard/assistants/[assistantId] - Get assistant by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { assistantId: string } }
) {
  try {
    const { assistantId } = params;
    const assistant = await backboardFetch<Assistant>(
      `/assistants/${assistantId}`
    );
    return NextResponse.json(assistant);
  } catch (error) {
    console.error('Error fetching assistant:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch assistant';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// PUT /api/backboard/assistants/[assistantId] - Update assistant
export async function PUT(
  request: NextRequest,
  { params }: { params: { assistantId: string } }
) {
  try {
    const { assistantId } = params;
    const body: AssistantUpdate = await request.json();

    const assistant = await backboardFetch<Assistant>(
      `/assistants/${assistantId}`,
      {
        method: 'PUT',
        body,
      }
    );

    return NextResponse.json(assistant);
  } catch (error) {
    console.error('Error updating assistant:', error);
    const message = error instanceof Error ? error.message : 'Failed to update assistant';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// DELETE /api/backboard/assistants/[assistantId] - Delete assistant
export async function DELETE(
  request: NextRequest,
  { params }: { params: { assistantId: string } }
) {
  try {
    const { assistantId } = params;
    await backboardDelete(`/assistants/${assistantId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting assistant:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete assistant';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
