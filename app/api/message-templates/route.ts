import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const body = await req.json();
  const supabase = getSupabaseAdmin();

  if (!body.workspace_id || !body.name || !body.channel || !body.content) {
    return NextResponse.json(
      { error: 'Missing required fields: workspace_id, name, channel, content' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('message_templates')
    .insert({
      workspace_id: body.workspace_id,
      name: body.name.trim(),
      channel: body.channel,
      content: body.content.trim(),
      variables: body.variables || {},
      is_active: body.is_active !== false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
