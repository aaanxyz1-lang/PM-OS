import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { workspace_id, lead_ids, lead_loop_id } = await request.json();

    if (!workspace_id || !lead_ids || !lead_loop_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    let updated = 0;
    for (const leadId of lead_ids) {
      const { data: existing } = await supabase
        .from('lead_loop_assignments')
        .select('id')
        .eq('lead_id', leadId)
        .eq('lead_loop_id', lead_loop_id)
        .maybeSingle();

      if (!existing) {
        const { error: insertError } = await supabase
          .from('lead_loop_assignments')
          .insert({
            workspace_id,
            lead_id: leadId,
            lead_loop_id: lead_loop_id,
            status: 'PENDING',
            created_at: new Date().toISOString(),
          });

        if (!insertError) {
          updated++;

          await supabase.from('lead_activities').insert({
            workspace_id,
            lead_id: leadId,
            type: 'BULK_LOOP',
            note: `Lead loop attached via bulk action`,
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    return NextResponse.json({ updated });
  } catch (error) {
    console.error('Bulk attach loop error:', error);
    return NextResponse.json({ error: 'Failed to attach loop' }, { status: 500 });
  }
}
