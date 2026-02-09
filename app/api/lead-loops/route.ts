import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspace_id = searchParams.get('workspace_id');
  const lead_id = searchParams.get('lead_id');

  if (!workspace_id) {
    return NextResponse.json({ error: 'Missing workspace_id' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (lead_id) {
    const { data, error } = await supabase
      .from('lead_active_loops')
      .select('*, loop_template_id(*)')
      .eq('lead_id', lead_id)
      .maybeSingle();

    if (error) {
      console.error('Fetch active loop error:', error);
      return NextResponse.json({ error: 'Failed to fetch active loop' }, { status: 500 });
    }

    return NextResponse.json(data);
  }

  const { data: templates, error } = await supabase
    .from('lead_loop_templates')
    .select('*')
    .eq('workspace_id', workspace_id)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Fetch templates error:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }

  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  const body = await request.json();
  const { workspace_id, name, description } = body;

  if (!workspace_id || !name) {
    return NextResponse.json(
      { error: 'Missing required fields: workspace_id, name' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('lead_loop_templates')
    .insert([{ workspace_id, name, description }])
    .select();

  if (error) {
    console.error('Create template error:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { error: `Loop template "${name}" already exists` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }

  return NextResponse.json(data[0]);
}
