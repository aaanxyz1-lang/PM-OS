import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const supabase = getSupabaseAdmin();

  if (!body.workspace_id) {
    return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
  }

  const { data: workflow } = await supabase
    .from('workflows')
    .select('id')
    .eq('id', params.id)
    .eq('workspace_id', body.workspace_id)
    .maybeSingle();

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  const { data: existingSteps } = await supabase
    .from('workflow_steps')
    .select('step_order')
    .eq('workflow_id', params.id)
    .order('step_order', { ascending: false })
    .limit(1);

  const nextOrder = (existingSteps?.[0]?.step_order || 0) + 1;

  const { data, error } = await supabase
    .from('workflow_steps')
    .insert({
      workflow_id: params.id,
      step_order: body.step_order ?? nextOrder,
      step_type: body.step_type,
      config: body.config || {},
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const supabase = getSupabaseAdmin();

  if (!body.workspace_id) {
    return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
  }

  if (!Array.isArray(body.steps)) {
    return NextResponse.json({ error: 'steps array required' }, { status: 400 });
  }

  const { data: workflow } = await supabase
    .from('workflows')
    .select('id')
    .eq('id', params.id)
    .eq('workspace_id', body.workspace_id)
    .maybeSingle();

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  await supabase.from('workflow_steps').delete().eq('workflow_id', params.id);

  const stepsToInsert = body.steps.map((s: any, i: number) => ({
    workflow_id: params.id,
    step_order: i + 1,
    step_type: s.step_type,
    config: s.config || {},
  }));

  if (stepsToInsert.length > 0) {
    const { error } = await supabase.from('workflow_steps').insert(stepsToInsert);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { data: updatedSteps } = await supabase
    .from('workflow_steps')
    .select('*')
    .eq('workflow_id', params.id)
    .order('step_order', { ascending: true });

  return NextResponse.json(updatedSteps || []);
}
