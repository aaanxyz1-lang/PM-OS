import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = getSupabaseAdmin();
  const pathSegments = request.url.split('/');
  const id = pathSegments[pathSegments.length - 1];

  if (!id) {
    return NextResponse.json({ error: 'Missing template ID' }, { status: 400 });
  }

  const { data: template, error: templateError } = await supabase
    .from('lead_loop_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (templateError || !template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const { data: steps, error: stepsError } = await supabase
    .from('lead_loop_steps')
    .select('*')
    .eq('loop_template_id', id)
    .order('step_order');

  if (stepsError) {
    console.error('Fetch steps error:', stepsError);
    return NextResponse.json({ error: 'Failed to fetch steps' }, { status: 500 });
  }

  return NextResponse.json({ ...template, steps });
}

export async function PATCH(request: Request) {
  const supabase = getSupabaseAdmin();
  const pathSegments = request.url.split('/');
  const id = pathSegments[pathSegments.length - 1];
  const body = await request.json();
  const { name, description, is_active } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing template ID' }, { status: 400 });
  }

  const updates: Record<string, any> = {};
  if (name) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (is_active !== undefined) updates.is_active = is_active;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('lead_loop_templates')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) {
    console.error('Update template error:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }

  return NextResponse.json(data[0]);
}

export async function DELETE(request: Request) {
  const supabase = getSupabaseAdmin();
  const pathSegments = request.url.split('/');
  const id = pathSegments[pathSegments.length - 1];

  if (!id) {
    return NextResponse.json({ error: 'Missing template ID' }, { status: 400 });
  }

  const { count } = await supabase
    .from('lead_active_loops')
    .select('id', { count: 'exact' })
    .eq('loop_template_id', id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Cannot delete loop. ${count} leads are using it.` },
      { status: 409 }
    );
  }

  const { error: deleteStepsError } = await supabase
    .from('lead_loop_steps')
    .delete()
    .eq('loop_template_id', id);

  if (deleteStepsError) {
    console.error('Delete steps error:', deleteStepsError);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }

  const { error } = await supabase
    .from('lead_loop_templates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Delete template error:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
