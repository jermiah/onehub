import { NextRequest, NextResponse } from 'next/server';

interface GenerateTitleRequest {
  message: string;
  llm_provider?: string;
  model_name?: string;
}

// Generate a smart title from message content
function generateSmartTitle(message: string): string {
  // Clean the message
  let cleaned = message.trim();

  // Remove common greetings at the start
  cleaned = cleaned.replace(/^(hi|hello|hey|good morning|good afternoon|good evening)[,!.\s]*/i, '');

  // If message is a question, try to extract the key part
  if (cleaned.includes('?')) {
    // Take text before the question mark
    const questionPart = cleaned.split('?')[0].trim();
    if (questionPart.length > 5) {
      cleaned = questionPart;
    }
  }

  // Remove filler words at start
  cleaned = cleaned.replace(/^(can you|could you|please|i want to|i need to|i would like to|help me|tell me|show me|what is|what are|how do|how can|why is|why are)\s+/i, '');

  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // Limit to reasonable length (40 chars for title)
  if (cleaned.length > 40) {
    // Try to cut at a word boundary
    const truncated = cleaned.slice(0, 40);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 20) {
      cleaned = truncated.slice(0, lastSpace) + '...';
    } else {
      cleaned = truncated + '...';
    }
  }

  // If still empty or too short, use original message
  if (!cleaned || cleaned.length < 3) {
    cleaned = message.slice(0, 40) + (message.length > 40 ? '...' : '');
  }

  return cleaned;
}

// POST /api/backboard/threads/[threadId]/title - Generate title from message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;
    const body: GenerateTitleRequest = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Missing required field: message' },
        { status: 400 }
      );
    }

    console.log('[Title API] Generating title for thread:', threadId);
    console.log('[Title API] Message:', message.slice(0, 100));

    // Generate smart title from the message
    const title = generateSmartTitle(message);

    console.log('[Title API] Generated title:', title);

    return NextResponse.json({ title });
  } catch (error) {
    console.error('Error generating title:', error);
    return NextResponse.json({ title: 'New Chat' });
  }
}
