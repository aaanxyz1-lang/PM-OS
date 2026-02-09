import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: workflow, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', params.id)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  const { data: steps } = await supabase
    .from('workflow_steps')
    .select('*')
    .eq('workflow_id', params.id)
    .order('step_order', { ascending: true });

  const { data: runs } = await supabase
    .from('workflow_runs')
    .select('*')
    .eq('workflow_id', params.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    workflow,
    steps: steps || [],
    runs: runs || [],
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const supabase = getSupabaseAdmin();

  if (!body.workspace_id) {
    return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
  }

  const updates: Record<string, any> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.trigger_type !== undefined) updates.trigger_type = body.trigger_type;
  if (body.trigger_meta !== undefined) updates.trigger_meta = body.trigger_meta;

  const { data, error } = await supabase
    .from('workflows')
    .update(updates)
    .eq('id', params.id)
    .eq('workspace_id', body.workspace_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('workflows')
    .delete()
    .eq('id', params.id)
    .eq('workspace_id', workspaceId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
