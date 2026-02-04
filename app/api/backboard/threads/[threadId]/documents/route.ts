import { NextRequest, NextResponse } from 'next/server';
import { backboardFetch, backboardFetchFormData } from '@/lib/api/client';
import type { Document } from '@/lib/api/types';

// GET /api/backboard/threads/[threadId]/documents - List documents for thread
export async function GET(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const { threadId } = params;
    const documents = await backboardFetch<Document[]>(
      `/threads/${threadId}/documents`
    );
    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching thread documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// POST /api/backboard/threads/[threadId]/documents - Upload document to thread
export async function POST(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const { threadId } = params;
    const formData = await request.formData();

    const document = await backboardFetchFormData<Document>(
      `/threads/${threadId}/documents`,
      formData
    );

    return NextResponse.json(document);
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
