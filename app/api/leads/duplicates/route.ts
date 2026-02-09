import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, normalized_phone')
      .eq('workspace_id', workspaceId)
      .not('normalized_phone', 'is', null);

    if (error) {
      console.error('Duplicates error:', error);
      return NextResponse.json({ duplicates: {} });
    }

    const duplicateMap: Record<string, string[]> = {};

    for (const lead of leads || []) {
      if (lead.normalized_phone) {
        if (!duplicateMap[lead.normalized_phone]) {
          duplicateMap[lead.normalized_phone] = [];
        }
        duplicateMap[lead.normalized_phone].push(lead.id);
      }
    }

    const duplicates: Record<string, number> = {};
    for (const [phone, ids] of Object.entries(duplicateMap)) {
      if (ids.length > 1) {
        ids.forEach((id) => {
          duplicates[id] = ids.length;
        });
      }
    }

    return NextResponse.json({ duplicates });
  } catch (error) {
    console.error('Duplicates error:', error);
    return NextResponse.json({ duplicates: {} });
  }
}
