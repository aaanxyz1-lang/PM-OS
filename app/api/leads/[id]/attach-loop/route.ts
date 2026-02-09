import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  const pathSegments = request.url.split('/');
  const lead_id = pathSegments[pathSegments.length - 3];

  if (!lead_id) {
    return NextResponse.json({ error: 'Missing lead ID' }, { status: 400 });
  }

  const body = await request.json();
  const { loop_template_id, workspace_id } = body;

  if (!loop_template_id || !workspace_id) {
    return NextResponse.json(
      { error: 'Missing required fields: loop_template_id, workspace_id' },
      { status: 400 }
    );
  }

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id')
    .eq('id', lead_id)
    .eq('workspace_id', workspace_id)
    .maybeSingle();

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  const { data: existingLoop, error: checkError } = await supabase
    .from('lead_active_loops')
    .select('id')
    .eq('lead_id', lead_id)
    .maybeSingle();

  if (existingLoop) {
    return NextResponse.json(
      { error: 'Lead already has an active loop. Detach the existing one first.' },
      { status: 409 }
    );
  }

  const { data: newLoop, error } = await supabase
    .from('lead_active_loops')
    .insert([
      {
        lead_id,
        loop_template_id,
        workspace_id,
        loop_step_index: 0,
        next_execution_at: new Date().toISOString(),
      },
    ])
    .select();

  if (error) {
    console.error('Attach loop error:', error);
    return NextResponse.json({ error: 'Failed to attach loop' }, { status: 500 });
  }

  return NextResponse.json(newLoop[0]);
}

export async function DELETE(request: Request) {
  const supabase = getSupabaseAdmin();
  const pathSegments = request.url.split('/');
  const lead_id = pathSegments[pathSegments.length - 3];

  if (!lead_id) {
    return NextResponse.json({ error: 'Missing lead ID' }, { status: 400 });
  }

  const { error } = await supabase
    .from('lead_active_loops')
    .delete()
    .eq('lead_id', lead_id);

  if (error) {
    console.error('Detach loop error:', error);
    return NextResponse.json({ error: 'Failed to detach loop' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
