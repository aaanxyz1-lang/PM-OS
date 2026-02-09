import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');
  const status = searchParams.get('status');
  const leadId = searchParams.get('lead_id');

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('automation_jobs')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (status) query = query.eq('status', status);
  if (leadId) query = query.eq('entity_id', leadId);

  const { data, error } = await query.order('scheduled_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const body = await req.json();
  const supabase = getSupabaseAdmin();

  if (!body.workspace_id || !body.entity_id || !body.job_type || !body.scheduled_at) {
    return NextResponse.json(
      { error: 'Missing required fields: workspace_id, entity_id, job_type, scheduled_at' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('automation_jobs')
    .insert({
      workspace_id: body.workspace_id,
      entity_type: 'LEAD',
      entity_id: body.entity_id,
      workflow_id: body.workflow_id || null,
      workflow_step_id: body.workflow_step_id || null,
      job_type: body.job_type,
      scheduled_at: body.scheduled_at,
      payload: body.payload || {},
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
