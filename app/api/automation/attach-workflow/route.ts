import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function calculateScheduledTime(
  baseTime: Date,
  delayUnit: string,
  delayValue: number
): Date {
  const time = new Date(baseTime);

  switch (delayUnit) {
    case 'MINUTES':
      time.setMinutes(time.getMinutes() + delayValue);
      break;
    case 'HOURS':
      time.setHours(time.getHours() + delayValue);
      break;
    case 'DAYS':
      time.setDate(time.getDate() + delayValue);
      break;
    case 'MONTHS':
      time.setMonth(time.getMonth() + delayValue);
      break;
  }

  return time;
}

function renderTemplate(
  template: string,
  lead: Record<string, any>,
  user?: Record<string, any>
): string {
  let rendered = template;

  Object.entries(lead).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      rendered = rendered.replace(
        new RegExp(`{{${key}}}`, 'g'),
        String(value)
      );
    }
  });

  if (user) {
    Object.entries(user).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        rendered = rendered.replace(
          new RegExp(`{{agent${key.charAt(0).toUpperCase() + key.slice(1)}}}`, 'g'),
          String(value)
        );
      }
    });
  }

  rendered = rendered.replace(/{{[^}]+}}/g, '');

  return rendered;
}

export async function POST(req: Request) {
  const body = await req.json();
  const supabase = getSupabaseAdmin();

  if (!body.workspace_id || !body.lead_ids || !body.workflow_id) {
    return NextResponse.json(
      { error: 'Missing required fields: workspace_id, lead_ids, workflow_id' },
      { status: 400 }
    );
  }

  try {
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', body.workflow_id)
      .maybeSingle();

    if (workflowError) throw workflowError;
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    const { data: steps, error: stepsError } = await supabase
      .from('workflow_steps')
      .select('*')
      .eq('workflow_id', body.workflow_id)
      .order('step_order', { ascending: true });

    if (stepsError) throw stepsError;

    const leadIds = body.lead_ids as string[];
    let attachedCount = 0;
    let jobsCreated = 0;
    const now = new Date();

    for (const leadId of leadIds) {
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .maybeSingle();

      if (!lead) continue;

      const { data: assignedUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', lead.assigned_to)
        .maybeSingle();

      const { data: existingAttachment } = await supabase
        .from('automation_attachments')
        .select('id')
        .eq('lead_id', leadId)
        .eq('workflow_id', body.workflow_id)
        .maybeSingle();

      if (existingAttachment && !body.restartIfExists) {
        continue;
      }

      if (existingAttachment) {
        await supabase
          .from('automation_attachments')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq('id', existingAttachment.id);

        await supabase
          .from('automation_jobs')
          .update({ status: 'PENDING' })
          .eq('lead_id', leadId)
          .eq('workflow_id', body.workflow_id);
      } else {
        const { error: attachError } = await supabase
          .from('automation_attachments')
          .insert({
            workspace_id: body.workspace_id,
            lead_id: leadId,
            workflow_id: body.workflow_id,
            is_active: true,
          });

        if (attachError) {
          console.error('Attachment error:', attachError);
          continue;
        }
      }

      for (const step of steps || []) {
        if (!step.config) continue;

        const config = typeof step.config === 'string' ? JSON.parse(step.config) : step.config;

        if (step.step_type === 'SCHEDULE_MESSAGE' && config.delayUnit && config.delayValue !== undefined) {
          const scheduledAt = calculateScheduledTime(now, config.delayUnit, config.delayValue);

          const { data: template } = await supabase
            .from('message_templates')
            .select('*')
            .eq('id', config.templateId)
            .maybeSingle();

          const templateName = template?.name || 'Unknown';
          const renderedContent = template
            ? renderTemplate(template.content, lead, assignedUser || undefined)
            : '';

          const { error: jobError } = await supabase
            .from('automation_jobs')
            .insert({
              workspace_id: body.workspace_id,
              entity_type: 'LEAD',
              entity_id: leadId,
              workflow_id: body.workflow_id,
              workflow_step_id: step.id,
              job_type: 'SCHEDULE_MESSAGE',
              scheduled_at: scheduledAt.toISOString(),
              payload: {
                templateId: config.templateId,
                templateName,
                channel: template?.channel || 'OTHER',
                renderedContent,
                createFollowupTask: config.createFollowupTask || false,
                followupDueAt: config.followupDueAt
                  ? calculateScheduledTime(now, config.followupDueOffsetUnit || config.delayUnit, config.followupDueOffsetValue || config.delayValue).toISOString()
                  : null,
                assignedToUserId: config.assignRule === 'leadOwner'
                  ? lead.assigned_to
                  : config.assignRule === 'selectedUser'
                  ? config.selectedUserId
                  : null,
              },
            });

          if (!jobError) jobsCreated++;
        } else if (step.step_type === 'CREATE_FOLLOWUP_TASK' && config.delayUnit && config.delayValue !== undefined) {
          const scheduledAt = calculateScheduledTime(now, config.delayUnit, config.delayValue);
          const taskTitle = renderTemplate(config.taskTitleTemplate || 'Follow-up', lead, assignedUser || undefined);

          const { error: jobError } = await supabase
            .from('automation_jobs')
            .insert({
              workspace_id: body.workspace_id,
              entity_type: 'LEAD',
              entity_id: leadId,
              workflow_id: body.workflow_id,
              workflow_step_id: step.id,
              job_type: 'CREATE_FOLLOWUP_TASK',
              scheduled_at: scheduledAt.toISOString(),
              payload: {
                taskTitle,
                assignedToUserId: config.assignRule === 'leadOwner'
                  ? lead.assigned_to
                  : config.assignRule === 'selectedUser'
                  ? config.selectedUserId
                  : null,
              },
            });

          if (!jobError) jobsCreated++;
        } else if (step.step_type === 'SET_NEXT_TOUCH' && config.delayUnit && config.delayValue !== undefined) {
          const nextTouchAt = calculateScheduledTime(now, config.delayUnit, config.delayValue);

          const { error: jobError } = await supabase
            .from('automation_jobs')
            .insert({
              workspace_id: body.workspace_id,
              entity_type: 'LEAD',
              entity_id: leadId,
              workflow_id: body.workflow_id,
              workflow_step_id: step.id,
              job_type: 'SET_NEXT_TOUCH',
              scheduled_at: nextTouchAt.toISOString(),
              payload: {
                nextTouchAt: nextTouchAt.toISOString(),
              },
            });

          if (!jobError) jobsCreated++;
        }
      }

      attachedCount++;

      await supabase
        .from('activity_logs')
        .insert({
          workspace_id: body.workspace_id,
          lead_id: leadId,
          action: 'WORKFLOW_ATTACHED',
          type: 'automation',
          description: `Workflow "${workflow.name}" attached with ${steps?.length || 0} automation steps`,
        });
    }

    return NextResponse.json({
      success: true,
      summary: {
        attachedLeads: attachedCount,
        jobsCreated,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to attach workflow' },
      { status: 500 }
    );
  }
}
