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

  const { data: workflows, error } = await supabase
    .from('workflows')
    .select('*, workflow_steps(count)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: runs } = await supabase
    .from('workflow_runs')
    .select('workflow_id, status, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  const lastRunMap: Record<string, { status: string; created_at: string }> = {};
  for (const run of runs || []) {
    if (!lastRunMap[run.workflow_id]) {
      lastRunMap[run.workflow_id] = run;
    }
  }

  const enriched = (workflows || []).map((w) => ({
    ...w,
    step_count: w.workflow_steps?.[0]?.count || 0,
    last_run: lastRunMap[w.id] || null,
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const body = await req.json();
  const supabase = getSupabaseAdmin();

  if (!body.workspace_id) {
    return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('workflows')
    .insert({
      workspace_id: body.workspace_id,
      name: body.name.trim(),
      description: body.description || null,
      is_active: body.is_active ?? true,
      trigger_type: body.trigger_type || 'MANUAL',
      trigger_meta: body.trigger_meta || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
