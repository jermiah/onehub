import { NextRequest, NextResponse } from 'next/server';
import { getApiKey, ApiKeyNotConfiguredError } from '@/lib/api/client';

const BACKBOARD_API_BASE = 'https://app.backboard.io/api';

// POST /api/backboard/threads/[threadId]/messages - Send a message (with optional file attachments)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;
    const contentType = request.headers.get('content-type') || '';
    const apiKey = await getApiKey();

    let response: Response;
    let isStreaming = false;

    if (contentType.includes('multipart/form-data')) {
      // Handle file uploads with FormData
      const formData = await request.formData();
      isStreaming = formData.get('stream') === 'true';

      response = await fetch(
        `${BACKBOARD_API_BASE}/threads/${threadId}/messages`,
        {
          method: 'POST',
          headers: {
            'X-API-Key': apiKey,
            // Don't set Content-Type - let fetch set it with boundary for multipart
          },
          body: formData,
        }
      );
    } else {
      // Handle JSON requests
      const body = await request.json();
      isStreaming = body.stream === true || body.stream === 'true';

      response = await fetch(
        `${BACKBOARD_API_BASE}/threads/${threadId}/messages`,
        {
          method: 'POST',
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backboard API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Backboard API error: ${response.status}` },
        { status: response.status }
      );
    }

    // Handle streaming response
    if (isStreaming && response.body) {
      // Create a transform stream that logs SSE events for debugging
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                console.log('[SSE Debug] Stream ended (done=true)');
                controller.close();
                break;
              }
              const text = decoder.decode(value, { stream: true });
              // Log first few chunks for debugging
              console.log('[SSE Debug] Raw chunk:', JSON.stringify(text).slice(0, 500));
              controller.enqueue(value);
            }
          } catch (error) {
            console.error('[SSE Debug] Stream error:', error);
            controller.error(error);
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiKeyNotConfiguredError) {
      return NextResponse.json(
        { error: 'API key not configured', code: 'API_KEY_MISSING' },
        { status: 401 }
      );
    }
    console.error('Error sending message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
