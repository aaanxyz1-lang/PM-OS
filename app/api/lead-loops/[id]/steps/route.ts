import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  const pathSegments = request.url.split('/');
  const id = pathSegments[pathSegments.length - 3];

  if (!id) {
    return NextResponse.json({ error: 'Missing template ID' }, { status: 400 });
  }

  const body = await request.json();
  const {
    step_order,
    delay_type,
    delay_value,
    action_type,
    task_title_template,
    task_type,
    assign_rule,
  } = body;

  if (
    !step_order ||
    !delay_type ||
    !action_type ||
    !task_title_template
  ) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('lead_loop_steps')
    .insert([
      {
        loop_template_id: id,
        step_order,
        delay_type,
        delay_value: delay_value || 0,
        action_type,
        task_title_template,
        task_type: task_type || 'LEAD_FOLLOWUP',
        assign_rule: assign_rule || 'sameAgent',
      },
    ])
    .select();

  if (error) {
    console.error('Create step error:', error);
    return NextResponse.json({ error: 'Failed to create step' }, { status: 500 });
  }

  return NextResponse.json(data[0]);
}

export async function DELETE(request: Request) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const stepId = searchParams.get('stepId');

  if (!stepId) {
    return NextResponse.json({ error: 'Missing step ID' }, { status: 400 });
  }

  const { error } = await supabase
    .from('lead_loop_steps')
    .delete()
    .eq('id', stepId);

  if (error) {
    console.error('Delete step error:', error);
    return NextResponse.json({ error: 'Failed to delete step' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
