import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const {
      workspace_id,
      lead_ids,
      status,
      source,
      qualified_status,
      feedback_type_id,
      tags_add,
      tags_remove,
    } = await request.json();

    if (!workspace_id || !lead_ids || lead_ids.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (status) updateData.status = status;
    if (source) updateData.source = source;
    if (qualified_status) updateData.qualified_status = qualified_status;
    if (feedback_type_id) updateData.feedback_type_id = feedback_type_id;

    const { error: updateError } = await supabase
      .from('leads')
      .update(updateData)
      .eq('workspace_id', workspace_id)
      .in('id', lead_ids);

    if (updateError) throw updateError;

    for (const leadId of lead_ids) {
      if (tags_add && tags_add.length > 0) {
        for (const tagId of tags_add) {
          await supabase.from('lead_tags').insert({
            lead_id: leadId,
            tag_id: tagId,
          }).maybeSingle();
        }
      }

      if (tags_remove && tags_remove.length > 0) {
        await supabase.from('lead_tags').delete().eq('lead_id', leadId).in('tag_id', tags_remove);
      }

      const changes = [];
      if (status) changes.push(`Status updated to ${status}`);
      if (source) changes.push('Source updated');
      if (qualified_status) changes.push(`Qualified status set to ${qualified_status}`);
      if (feedback_type_id) changes.push('Feedback type updated');
      if (tags_add && tags_add.length > 0)
        changes.push(`${tags_add.length} tag(s) added`);
      if (tags_remove && tags_remove.length > 0)
        changes.push(`${tags_remove.length} tag(s) removed`);

      await supabase.from('activity_logs').insert({
        workspace_id,
        lead_id: leadId,
        action: 'BULK_UPDATE',
        description: `Bulk update: ${changes.join(', ')}`,
      });
    }

    return NextResponse.json({ updated: lead_ids.length });
  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json({ error: 'Failed to update leads' }, { status: 500 });
  }
}
