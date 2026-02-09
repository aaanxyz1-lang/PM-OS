import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspace_id = searchParams.get('workspace_id');

  if (!workspace_id) {
    return NextResponse.json({ error: 'Missing workspace_id' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('workspace_id', workspace_id)
    .order('name');

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { workspace_id, name, color } = body;

  if (!workspace_id || !name) {
    return NextResponse.json(
      { error: 'Missing required fields: workspace_id, name' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('tags')
    .insert([
      {
        workspace_id,
        name,
        color: color || '#64748b',
      },
    ])
    .select();

  if (error) {
    console.error('Supabase error:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { error: `Tag "${name}" already exists for this workspace` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }

  return NextResponse.json(data[0]);
}
