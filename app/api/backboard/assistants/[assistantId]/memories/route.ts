import { NextRequest, NextResponse } from 'next/server';
import { backboardFetch } from '@/lib/api/client';
import type { MemoryResponse } from '@/lib/api/types';

// GET /api/backboard/assistants/[assistantId]/memories - List memories for assistant
export async function GET(
  request: NextRequest,
  { params }: { params: { assistantId: string } }
) {
  try {
    const { assistantId } = params;
    const memories = await backboardFetch<MemoryResponse[]>(
      `/assistants/${assistantId}/memories`
    );
    return NextResponse.json(memories);
  } catch (error) {
    console.error('Error fetching memories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch memories' },
      { status: 500 }
    );
  }
}
