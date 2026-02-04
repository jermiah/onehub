import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured, ThreadTitle } from '@/lib/supabase';

// GET /api/titles - Get all thread titles
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ titles: {}, configured: false });
  }

  try {
    const { data, error } = await supabase
      .from('thread_titles')
      .select('thread_id, title');

    if (error) {
      console.error('[Titles API] Error fetching titles:', error);
      return NextResponse.json({ titles: {}, error: error.message });
    }

    // Convert array to object for easy lookup
    const titles: Record<string, string> = {};
    data?.forEach((row: { thread_id: string; title: string }) => {
      titles[row.thread_id] = row.title;
    });

    return NextResponse.json({ titles, configured: true });
  } catch (error) {
    console.error('[Titles API] Error:', error);
    return NextResponse.json({ titles: {}, error: 'Failed to fetch titles' });
  }
}

// POST /api/titles - Save a thread title
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase not configured', configured: false },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { thread_id, title } = body;

    if (!thread_id || !title) {
      return NextResponse.json(
        { error: 'thread_id and title are required' },
        { status: 400 }
      );
    }

    console.log('[Titles API] Saving title:', thread_id, '->', title);

    // Upsert - insert or update if exists
    const { data, error } = await supabase
      .from('thread_titles')
      .upsert(
        { thread_id, title, updated_at: new Date().toISOString() },
        { onConflict: 'thread_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('[Titles API] Error saving title:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('[Titles API] Title saved successfully');
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Titles API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save title' },
      { status: 500 }
    );
  }
}

// DELETE /api/titles - Delete a thread title
export async function DELETE(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase not configured', configured: false },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const thread_id = searchParams.get('thread_id');

    if (!thread_id) {
      return NextResponse.json(
        { error: 'thread_id is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('thread_titles')
      .delete()
      .eq('thread_id', thread_id);

    if (error) {
      console.error('[Titles API] Error deleting title:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Titles API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete title' },
      { status: 500 }
    );
  }
}
