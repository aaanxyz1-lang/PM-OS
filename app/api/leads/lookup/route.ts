import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { normalizePhone } from '@/lib/phone-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const workspaceId = searchParams.get('workspace_id');

    if (!phone || !workspaceId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      return NextResponse.json({ leads: [], summary: null });
    }

    const { data: leads, error } = await supabase
      .from('leads')
      .select(
        `
        id,
        name,
        phone,
        business_name,
        email,
        status,
        qualified_status,
        tag_ids,
        feedback_type_id,
        assigned_to,
        assigned_user:assigned_to(id, name, email),
        tags_rel:lead_tags(tag_id, tag:tags(id, name)),
        feedback_type:feedback_types(id, name),
        updated_at,
        created_at
        `
      )
      .eq('workspace_id', workspaceId)
      .eq('normalized_phone', normalizedPhone)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Lookup error:', error);
      return NextResponse.json({ leads: [], summary: null });
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ leads: [], summary: null });
    }

    const mostRecent = leads[0];

    const { data: activities } = await supabase
      .from('lead_activities')
      .select('id, type, note, created_at')
      .eq('lead_id', mostRecent.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: loops } = await supabase
      .from('lead_loop_assignments')
      .select(
        `
        id,
        status,
        current_step,
        next_scheduled_at,
        loop:lead_loops(id, name, description)
        `
      )
      .eq('lead_id', mostRecent.id)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(1);

    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, status, due_at')
      .eq('lead_id', mostRecent.id)
      .in('status', ['TODO', 'OVERDUE']);

    const openTasksCount = tasks?.length || 0;

    const summary = {
      count: leads.length,
      mostRecent: {
        id: mostRecent.id,
        name: mostRecent.name,
        businessName: mostRecent.business_name,
        email: mostRecent.email,
        status: mostRecent.status,
        qualifiedStatus: mostRecent.qualified_status,
        tags: mostRecent.tags_rel || [],
        feedbackType: mostRecent.feedback_type,
        assignedUser: mostRecent.assigned_user,
        updatedAt: mostRecent.updated_at,
        createdAt: mostRecent.created_at,
      },
      recentActivities: activities || [],
      activeLoop: loops && loops.length > 0 ? loops[0] : null,
      openTasksCount,
    };

    return NextResponse.json({
      leads: leads.map((l) => ({
        id: l.id,
        name: l.name,
        phone: l.phone,
        businessName: l.business_name,
        email: l.email,
        status: l.status,
      })),
      summary,
    });
  } catch (error) {
    console.error('Lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to lookup leads' },
      { status: 500 }
    );
  }
}
