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
    .from('leads')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  const status = searchParams.get('status');
  if (status) query = query.eq('status', status);

  const assignedTo = searchParams.get('assigned_to');
  if (assignedTo) query = query.eq('assigned_to', assignedTo);

  const search = searchParams.get('search');
  if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);

  const from = searchParams.get('from');
  if (from) query = query.gte('created_at', `${from}T00:00:00`);

  const to = searchParams.get('to');
  if (to) query = query.lte('created_at', `${to}T23:59:59`);

  const { data: leads, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const assignedIds = Array.from(
    new Set((leads || []).filter((l: any) => l.assigned_to).map((l: any) => l.assigned_to))
  );
  let userMap: Record<string, { id: string; name: string; email: string }> = {};

  if (assignedIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', assignedIds);
    userMap = Object.fromEntries((users || []).map((u) => [u.id, u]));
  }

  const enriched = (leads || []).map((l) => ({
    ...l,
    assigned_user: l.assigned_to ? userMap[l.assigned_to] || null : null,
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const body = await req.json();
  const supabase = getSupabaseAdmin();

  if (!body.phone?.trim()) {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }

  if (!body.workspace_id) {
    return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('leads')
    .insert({
      workspace_id: body.workspace_id,
      name: body.name?.trim() || body.businessName?.trim() || 'Unnamed Lead',
      business_name: body.businessName?.trim() || null,
      email: body.email?.trim() || null,
      phone: body.phone.trim(),
      normalized_phone: body.normalized_phone || null,
      source: body.source || null,
      status: body.status || 'new',
      qualified_status: body.qualified_status || null,
      feedback_type_id: body.feedback_type_id || null,
      assigned_to: body.assigned_to || null,
      notes: body.notes?.trim() || null,
      value: 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const leadName = body.name?.trim() || body.businessName?.trim() || 'Unnamed Lead';

  const activityType = body.duplicate_override_reason ? 'DUPLICATE_OVERRIDE' : 'NEW_LEAD';
  const activityNote = body.duplicate_override_reason
    ? `Lead created with duplicate override. Reason: ${body.duplicate_override_reason}`
    : 'New lead created';

  await supabase.from('lead_activities').insert({
    workspace_id: body.workspace_id,
    lead_id: data.id,
    type: activityType,
    note: activityNote,
    created_at: new Date().toISOString(),
  });

  return NextResponse.json(data, { status: 201 });
}
