import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { workspace_id, lead_ids, assigned_to } = await request.json();

    if (!workspace_id || !lead_ids || !assigned_to) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { error: updateError } = await supabase
      .from('leads')
      .update({
        assigned_to: assigned_to,
        updated_at: new Date().toISOString(),
      })
      .eq('workspace_id', workspace_id)
      .in('id', lead_ids);

    if (updateError) throw updateError;

    for (const leadId of lead_ids) {
      await supabase.from('lead_activities').insert({
        workspace_id,
        lead_id: leadId,
        type: 'BULK_ASSIGN',
        note: `Lead assigned via bulk action`,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ updated: lead_ids.length });
  } catch (error) {
    console.error('Bulk assign error:', error);
    return NextResponse.json({ error: 'Failed to assign leads' }, { status: 500 });
  }
}
