import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('lead_id');
    const workspaceId = searchParams.get('workspace_id');

    if (!leadId || !workspaceId) {
      return NextResponse.json({ duplicates: [] });
    }

    const supabase = getSupabaseAdmin();

    const { data: currentLead } = await supabase
      .from('leads')
      .select('normalized_phone')
      .eq('id', leadId)
      .maybeSingle();

    if (!currentLead || !currentLead.normalized_phone) {
      return NextResponse.json({ duplicates: [] });
    }

    const { data: duplicates } = await supabase
      .from('leads')
      .select('id, name, phone, status, qualified_status, assigned_to, updated_at')
      .eq('workspace_id', workspaceId)
      .eq('normalized_phone', currentLead.normalized_phone)
      .neq('id', leadId)
      .order('updated_at', { ascending: false });

    return NextResponse.json({ duplicates: duplicates || [] });
  } catch (error) {
    console.error('Related duplicates error:', error);
    return NextResponse.json({ duplicates: [] });
  }
}
