import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = getSupabaseAdmin();

  const { searchParams } = new URL(request.url);
  const workspace_id = searchParams.get('workspace_id');
  const type = searchParams.get('type');

  if (!workspace_id) {
    return NextResponse.json({ error: 'Missing workspace_id' }, { status: 400 });
  }

  let query = supabase
    .from('categories')
    .select('*')
    .eq('workspace_id', workspace_id)
    .eq('is_active', true)
    .order('name');

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();

  const body = await request.json();
  const { workspace_id, type, name, color } = body;

  if (!workspace_id || !type || !name) {
    return NextResponse.json(
      { error: 'Missing required fields: workspace_id, type, name' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('categories')
    .insert([
      {
        workspace_id,
        type,
        name,
        color: color || '#64748b',
      },
    ])
    .select();

  if (error) {
    console.error('Supabase error:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { error: `Category "${name}" already exists for this workspace` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }

  return NextResponse.json(data[0]);
}
