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

  let query = supabase
    .from('tasks')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  const status = searchParams.get('status');
  if (status) query = query.eq('status', status);

  const type = searchParams.get('type');
  if (type) query = query.eq('type', type);

  const priority = searchParams.get('priority');
  if (priority) query = query.eq('priority', priority);

  const assignedTo = searchParams.get('assigned_to');
  if (assignedTo) query = query.eq('assigned_to_user_id', assignedTo);

  const leadId = searchParams.get('lead_id');
  if (leadId) query = query.eq('lead_id', leadId);

  const duePeriod = searchParams.get('due_period');
  if (duePeriod === 'today') {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    query = query.gte('due_at', todayStart.toISOString()).lte('due_at', todayEnd.toISOString());
  } else if (duePeriod === 'overdue') {
    query = query.lt('due_at', new Date().toISOString()).neq('status', 'DONE');
  } else if (duePeriod === 'this_week') {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    query = query.gte('due_at', startOfWeek.toISOString()).lte('due_at', endOfWeek.toISOString());
  }

  const { data: tasks, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = Array.from(
    new Set((tasks || []).filter((t: any) => t.assigned_to_user_id).map((t: any) => t.assigned_to_user_id))
  );
  const leadIds = Array.from(
    new Set((tasks || []).filter((t: any) => t.lead_id).map((t: any) => t.lead_id))
  );

  let userMap: Record<string, { id: string; name: string }> = {};
  if (userIds.length > 0) {
    const { data: users } = await supabase.from('users').select('id, name').in('id', userIds);
    userMap = Object.fromEntries((users || []).map((u) => [u.id, u]));
  }

  let leadMap: Record<string, { id: string; name: string }> = {};
  if (leadIds.length > 0) {
    const { data: leads } = await supabase.from('leads').select('id, name').in('id', leadIds);
    leadMap = Object.fromEntries((leads || []).map((l) => [l.id, l]));
  }

  const enriched = (tasks || []).map((t) => ({
    ...t,
    assigned_user: t.assigned_to_user_id ? userMap[t.assigned_to_user_id] || null : null,
    lead: t.lead_id ? leadMap[t.lead_id] || null : null,
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const body = await req.json();
  const supabase = getSupabaseAdmin();

  if (!body.workspace_id) {
    return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      workspace_id: body.workspace_id,
      title: body.title.trim(),
      description: body.description || null,
      type: body.type || 'GENERAL',
      status: body.status || 'TODO',
      priority: body.priority || 'MEDIUM',
      due_at: body.due_at || null,
      assigned_to_user_id: body.assigned_to_user_id || null,
      lead_id: body.lead_id || null,
      workflow_run_id: body.workflow_run_id || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
