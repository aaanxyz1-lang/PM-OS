import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const {
      workspace_id,
      lead_ids,
      title,
      description,
      due_rule,
      custom_due_date,
      assignee_rule,
      assigned_to_user_id,
    } = await request.json();

    if (!workspace_id || !lead_ids || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const calculateDueDate = (rule: string, custom?: string) => {
      if (rule === 'custom' && custom) return custom;

      const now = new Date();
      const daysToAdd = rule === 'today' ? 0 : parseInt(rule) || 0;
      const date = new Date(now);
      date.setDate(date.getDate() + daysToAdd);
      return date.toISOString();
    };

    let created = 0;
    for (const leadId of lead_ids) {
      const leadRes = await supabase
        .from('leads')
        .select('assigned_to')
        .eq('id', leadId)
        .maybeSingle();

      const assignedTo =
        assignee_rule === 'selected' ? assigned_to_user_id : leadRes.data?.assigned_to;

      const { error: insertError } = await supabase.from('tasks').insert({
        workspace_id,
        lead_id: leadId,
        title,
        description: description || null,
        type: 'LEAD_FOLLOWUP',
        status: 'TODO',
        priority: 'MEDIUM',
        assigned_to_user_id: assignedTo || null,
        due_at: calculateDueDate(due_rule, custom_due_date),
        created_at: new Date().toISOString(),
      });

      if (!insertError) {
        created++;

        await supabase.from('lead_activities').insert({
          workspace_id,
          lead_id: leadId,
          type: 'BULK_TASK_CREATE',
          note: `Follow-up task created via bulk action`,
          created_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ created });
  } catch (error) {
    console.error('Bulk create tasks error:', error);
    return NextResponse.json({ error: 'Failed to create tasks' }, { status: 500 });
  }
}
