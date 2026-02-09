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

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .maybeSingle();

  const { data: leads } = await supabase
    .from('leads')
    .select('status, value')
    .eq('workspace_id', workspaceId);

  const { data: members } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId);

  const statusCounts: Record<string, number> = {
    new: 0,
    in_progress: 0,
    won: 0,
    lost: 0,
  };

  let totalValue = 0;

  (leads || []).forEach((lead) => {
    if (lead.status in statusCounts) {
      statusCounts[lead.status]++;
    }
    totalValue += Number(lead.value) || 0;
  });

  return NextResponse.json({
    workspaceName: workspace?.name || '',
    totalLeads: leads?.length || 0,
    totalValue,
    memberCount: members?.length || 0,
    statusCounts,
  });
}
