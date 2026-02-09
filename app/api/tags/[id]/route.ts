import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request) {
  const supabase = getSupabaseAdmin();

  const pathSegments = request.url.split('/');
  const id = pathSegments[pathSegments.length - 1];

  if (!id) {
    return NextResponse.json({ error: 'Missing tag ID' }, { status: 400 });
  }

  const { count: leadCount } = await supabase
    .from('lead_tags')
    .select('id', { count: 'exact' })
    .eq('tag_id', id);

  const { count: taskCount } = await supabase
    .from('task_tags')
    .select('id', { count: 'exact' })
    .eq('tag_id', id);

  const totalCount = (leadCount || 0) + (taskCount || 0);

  if (totalCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete tag. It is used by ${totalCount} items (${leadCount || 0} leads, ${taskCount || 0} tasks).`,
      },
      { status: 409 }
    );
  }

  const { error } = await supabase.from('tags').delete().eq('id', id);

  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
