import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspace_id = searchParams.get('workspace_id');
  const phone = searchParams.get('phone');

  if (!workspace_id || !phone) {
    return NextResponse.json(
      { error: 'Missing required fields: workspace_id, phone' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: existingLead, error } = await supabase
    .from('leads')
    .select(
      `
      id,
      name,
      phone,
      email,
      qualified_status,
      created_at,
      status,
      source,
      assigned_to,
      lead_active_loops:lead_active_loops(id, loop_template_id),
      activity_logs:activity_logs(count)
    `
    )
    .eq('workspace_id', workspace_id)
    .eq('phone', phone)
    .maybeSingle();

  if (error) {
    console.error('Check duplicate error:', error);
    return NextResponse.json({ error: 'Failed to check duplicate' }, { status: 500 });
  }

  if (!existingLead) {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({
    exists: true,
    lead: {
      id: existingLead.id,
      name: existingLead.name,
      phone: existingLead.phone,
      email: existingLead.email,
      qualified_status: existingLead.qualified_status,
      created_at: existingLead.created_at,
      status: existingLead.status,
      source: existingLead.source,
      assigned_to: existingLead.assigned_to,
      total_interactions: existingLead.activity_logs?.[0]?.count || 0,
      active_loop: existingLead.lead_active_loops?.[0] || null,
    },
  });
}
