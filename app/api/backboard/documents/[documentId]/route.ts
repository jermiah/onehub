import { NextRequest, NextResponse } from 'next/server';
import { backboardDelete } from '@/lib/api/client';

// DELETE /api/backboard/documents/[documentId] - Delete document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    await backboardDelete(`/documents/${documentId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
