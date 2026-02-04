import { NextRequest, NextResponse } from 'next/server';
import { backboardFetch } from '@/lib/api/client';
import type { DocumentStatusResponse } from '@/lib/api/types';

// GET /api/backboard/documents/[documentId]/status - Get document indexing status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const status = await backboardFetch<DocumentStatusResponse>(
      `/documents/${documentId}/status`
    );
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching document status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document status' },
      { status: 500 }
    );
  }
}
