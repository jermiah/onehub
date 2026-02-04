import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_KEY_COOKIE = 'backboard_api_key';

// GET /api/settings/apikey - Check if API key is set
export async function GET() {
  const cookieStore = await cookies();
  const apiKey = cookieStore.get(API_KEY_COOKIE)?.value;
  const envKey = process.env.BACKBOARD_API_KEY;

  return NextResponse.json({
    hasKey: !!(apiKey || envKey),
    source: apiKey ? 'cookie' : envKey ? 'env' : 'none',
  });
}

// POST /api/settings/apikey - Save API key
export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // Validate the API key by making a test request to Backboard
    const testResponse = await fetch('https://app.backboard.io/api/assistants?limit=1', {
      headers: {
        'X-API-Key': apiKey.trim(),
      },
    });

    if (!testResponse.ok) {
      return NextResponse.json(
        { error: 'Invalid API key. Please check your key and try again.' },
        { status: 401 }
      );
    }

    // Store the API key in an httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set(API_KEY_COOKIE, apiKey.trim(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving API key:', error);
    return NextResponse.json(
      { error: 'Failed to save API key' },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/apikey - Remove API key
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(API_KEY_COOKIE);
  return NextResponse.json({ success: true });
}
