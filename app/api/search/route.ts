import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');
    const query = searchParams.get('q');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    }

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        leads: [],
        tasks: [],
        activities: [],
        workflows: []
      });
    }

    const supabase = getSupabaseAdmin();
    const searchTerm = `%${query.toLowerCase()}%`;

    const [leadsRes, tasksRes, activitiesRes, workflowsRes] = await Promise.all([
      supabase
        .from('leads')
        .select('id, name, phone, business_name, email, status, notes')
        .eq('workspace_id', workspaceId)
        .or(`name.ilike.${searchTerm},phone.ilike.${searchTerm},business_name.ilike.${searchTerm},notes.ilike.${searchTerm}`)
        .limit(10),

      supabase
        .from('tasks')
        .select('id, title, description, status, type, due_at, lead_id, lead:leads(id, name)')
        .eq('workspace_id', workspaceId)
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .limit(10),

      supabase
        .from('lead_activities')
        .select('id, note, created_at, lead_id, lead:leads(id, name)')
        .eq('workspace_id', workspaceId)
        .ilike('note', searchTerm)
        .limit(10),

      supabase
        .from('workflows')
        .select('id, name, description, is_active')
        .eq('workspace_id', workspaceId)
        .ilike('name', searchTerm)
        .limit(10),
    ]);

    if (leadsRes.error) throw leadsRes.error;
    if (tasksRes.error) throw tasksRes.error;
    if (activitiesRes.error) throw activitiesRes.error;
    if (workflowsRes.error) throw workflowsRes.error;

    return NextResponse.json({
      leads: leadsRes.data || [],
      tasks: tasksRes.data || [],
      activities: activitiesRes.data || [],
      workflows: workflowsRes.data || [],
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search' },
      { status: 500 }
    );
  }
}
