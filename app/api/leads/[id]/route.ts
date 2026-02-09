import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', params.id)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  let assignedUser = null;
  if (lead.assigned_to) {
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', lead.assigned_to)
      .maybeSingle();
    assignedUser = user;
  }

  const { data: activities } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('lead_id', params.id)
    .order('created_at', { ascending: false });

  const actUserIds = Array.from(
    new Set((activities || []).filter((a: any) => a.user_id).map((a: any) => a.user_id))
  );
  let actUserMap: Record<string, { name: string }> = {};
  if (actUserIds.length > 0) {
    const { data: actUsers } = await supabase
      .from('users')
      .select('id, name')
      .in('id', actUserIds);
    actUserMap = Object.fromEntries((actUsers || []).map((u) => [u.id, u]));
  }

  const enrichedActivities = (activities || []).map((a) => ({
    ...a,
    user_name: a.user_id ? actUserMap[a.user_id]?.name || 'Unknown' : 'System',
  }));

  return NextResponse.json({
    lead: { ...lead, assigned_user: assignedUser },
    activities: enrichedActivities,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const supabase = getSupabaseAdmin();

  if (!body.workspace_id) {
    return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('leads')
    .select('*')
    .eq('id', params.id)
    .eq('workspace_id', body.workspace_id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (body.status !== undefined) updateData.status = body.status;
  if (body.source !== undefined) updateData.source = body.source || null;
  if (body.qualified_status !== undefined) updateData.qualified_status = body.qualified_status;
  if (body.feedback_type_id !== undefined) updateData.feedback_type_id = body.feedback_type_id;
  if (body.assigned_to !== undefined) updateData.assigned_to = body.assigned_to;
  if (body.name !== undefined) updateData.name = body.name;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.notes !== undefined) updateData.notes = body.notes;

  const { data, error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', params.id)
    .eq('workspace_id', body.workspace_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.status !== undefined && existing.status !== body.status) {
    await supabase.from('activity_logs').insert({
      workspace_id: body.workspace_id,
      lead_id: params.id,
      action: 'Status Changed',
      type: 'status_change',
      description: `Changed from "${existing.status}" to "${body.status}"`,
    });
  }

  return NextResponse.json(data);
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

  const { data: existing } = await supabase
    .from('leads')
    .select('status')
    .eq('id', params.id)
    .eq('workspace_id', body.workspace_id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('leads')
    .update({
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      source: body.source || null,
      status: body.status,
      assigned_to: body.assigned_to || null,
      notes: body.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .eq('workspace_id', body.workspace_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (existing.status !== body.status) {
    await supabase.from('activity_logs').insert({
      workspace_id: body.workspace_id,
      lead_id: params.id,
      user_id: body.assigned_to || null,
      action: 'Status Changed',
      type: 'status_change',
      description: `Changed from "${existing.status}" to "${body.status}"`,
    });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', params.id)
    .eq('workspace_id', workspaceId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
