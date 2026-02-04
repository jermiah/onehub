import { NextRequest, NextResponse } from 'next/server';
import { backboardFetch, backboardFetchFormData } from '@/lib/api/client';
import type { Document } from '@/lib/api/types';

// GET /api/backboard/assistants/[assistantId]/documents - List documents for assistant
export async function GET(
  request: NextRequest,
  { params }: { params: { assistantId: string } }
) {
  try {
    const { assistantId } = params;
    const documents = await backboardFetch<Document[]>(
      `/assistants/${assistantId}/documents`
    );
    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching assistant documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// POST /api/backboard/assistants/[assistantId]/documents - Upload document to assistant
export async function POST(
  request: NextRequest,
  { params }: { params: { assistantId: string } }
) {
  try {
    const { assistantId } = params;
    const formData = await request.formData();

    // Forward the FormData to Backboard API
    const document = await backboardFetchFormData<Document>(
      `/assistants/${assistantId}/documents`,
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
