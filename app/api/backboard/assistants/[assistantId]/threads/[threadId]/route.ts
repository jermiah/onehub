import { NextRequest, NextResponse } from 'next/server';
import { backboardDelete } from '@/lib/api/client';

// DELETE /api/backboard/assistants/[assistantId]/threads/[threadId] - Delete thread
export async function DELETE(
  request: NextRequest,
  { params }: { params: { assistantId: string; threadId: string } }
) {
  try {
    const { assistantId, threadId } = params;
    console.log('Deleting thread:', threadId, 'from assistant:', assistantId);
    await backboardDelete(`/assistants/${assistantId}/threads/${threadId}`);
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
