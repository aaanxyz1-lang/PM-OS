import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  try {
    const { data: dueJobs, error: jobsError } = await supabase
      .from('automation_jobs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'PENDING')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true });

    if (jobsError) throw jobsError;

    let executedCount = 0;
    let skippedCount = 0;
    let createdTasksCount = 0;
    const errors: any[] = [];

    for (const job of dueJobs || []) {
      try {
        const { data: lead } = await supabase
          .from('leads')
          .select('id, status')
          .eq('id', job.entity_id)
          .maybeSingle();

        if (!lead) {
          await supabase
            .from('automation_jobs')
            .update({ status: 'SKIPPED', updated_at: now })
            .eq('id', job.id);
          skippedCount++;
          continue;
        }

        if (lead.status === 'won' || lead.status === 'lost') {
          await supabase
            .from('automation_jobs')
            .update({ status: 'SKIPPED', updated_at: now })
            .eq('id', job.id);
          skippedCount++;
          continue;
        }

        if (job.job_type === 'CREATE_FOLLOWUP_TASK') {
          const payload = job.payload || {};
          const { data: task } = await supabase
            .from('tasks')
            .insert({
              workspace_id: job.workspace_id,
              title: payload.taskTitle || 'Follow-up',
              type: 'LEAD_FOLLOWUP',
              status: 'TODO',
              priority: 'MEDIUM',
              due_at: payload.dueAt || job.scheduled_at,
              assigned_to_user_id: payload.assignedToUserId || null,
              lead_id: job.entity_id,
              description: payload.description || null,
            })
            .select()
            .single();

          if (task) {
            createdTasksCount++;
          }

          await supabase
            .from('activity_logs')
            .insert({
              workspace_id: job.workspace_id,
              lead_id: job.entity_id,
              action: 'AUTOMATION_TASK_CREATED',
              type: 'automation',
              description: `Follow-up task created: ${payload.taskTitle || 'Follow-up'}`,
            });

          executedCount++;
        } else if (job.job_type === 'SCHEDULE_MESSAGE') {
          const payload = job.payload || {};

          await supabase
            .from('activity_logs')
            .insert({
              workspace_id: job.workspace_id,
              lead_id: job.entity_id,
              action: 'MESSAGE_SCHEDULED',
              type: 'automation',
              description: `Message scheduled (${payload.templateName || 'Unknown'}) for ${payload.channel || 'unknown channel'}: ${payload.renderedContent || ''}`,
            });

          if (payload.createFollowupTask) {
            const { data: task } = await supabase
              .from('tasks')
              .insert({
                workspace_id: job.workspace_id,
                title: `Follow up: ${payload.templateName || 'Message'}`,
                type: 'LEAD_FOLLOWUP',
                status: 'TODO',
                priority: 'MEDIUM',
                due_at: payload.followupDueAt || job.scheduled_at,
                assigned_to_user_id: payload.assignedToUserId || null,
                lead_id: job.entity_id,
              })
              .select()
              .single();

            if (task) {
              createdTasksCount++;
            }
          }

          executedCount++;
        } else if (job.job_type === 'SET_NEXT_TOUCH') {
          const payload = job.payload || {};
          const nextTouchAt = payload.nextTouchAt || job.scheduled_at;

          await supabase
            .from('leads')
            .update({ next_touch_at: nextTouchAt })
            .eq('id', job.entity_id);

          await supabase
            .from('activity_logs')
            .insert({
              workspace_id: job.workspace_id,
              lead_id: job.entity_id,
              action: 'NEXT_TOUCH_SET',
              type: 'automation',
              description: `Next touch scheduled for ${new Date(nextTouchAt).toLocaleDateString()}`,
            });

          executedCount++;
        }

        await supabase
          .from('automation_jobs')
          .update({ status: 'DONE', updated_at: now })
          .eq('id', job.id);
      } catch (err: any) {
        errors.push({ jobId: job.id, error: err.message });

        await supabase
          .from('automation_jobs')
          .update({
            status: 'FAILED',
            updated_at: now,
            payload: {
              ...(job.payload || {}),
              error: err.message,
            },
          })
          .eq('id', job.id);
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        scannedJobs: dueJobs?.length || 0,
        executedJobs: executedCount,
        createdTasks: createdTasksCount,
        skippedJobs: skippedCount,
        failedJobs: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to run automation' },
      { status: 500 }
    );
  }
}
