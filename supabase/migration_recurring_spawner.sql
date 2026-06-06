-- Migration: Server-Side Recurring Task Spawner
-- Run this in the Supabase SQL Editor.

-- 1. Function to check if a date matches the recurrence rule
CREATE OR REPLACE FUNCTION public.is_scheduled_day(
  check_date DATE,
  rule JSONB,
  last_generated DATE,
  created_at TIMESTAMPTZ
) RETURNS BOOLEAN AS $$
DECLARE
  rule_type TEXT := rule->>'type';
  interval_val INT;
  weekly_days INT[];
  rule_day INT;
  monthly_day INT;
  last_date DATE;
  month_diff INT;
  dow INT;
  dom INT;
BEGIN
  -- Determine the reference date
  IF last_generated IS NOT NULL THEN
    last_date := last_generated;
  ELSE
    last_date := (created_at AT TIME ZONE 'Asia/Kolkata')::DATE;
  END IF;

  IF rule_type = 'daily' THEN
    RETURN TRUE;
  END IF;

  IF rule_type = 'every_x_days' THEN
    interval_val := (rule->>'interval')::INT;
    IF interval_val IS NOT NULL AND interval_val > 0 THEN
      RETURN (check_date - last_date) >= interval_val;
    END IF;
    RETURN FALSE;
  END IF;

  IF rule_type = 'weekly' THEN
    dow := EXTRACT(DOW FROM check_date)::INT;
    IF rule ? 'weekly_days' THEN
      SELECT ARRAY_AGG(val::INT) INTO weekly_days
      FROM jsonb_array_elements_text(rule->'weekly_days') AS val;
      RETURN dow = ANY(weekly_days);
    END IF;
    rule_day := (rule->>'day')::INT;
    IF rule_day IS NULL THEN
      rule_day := 1; -- Default to Monday (1)
    END IF;
    RETURN dow = rule_day;
  END IF;

  IF rule_type = 'monthly' THEN
    dom := EXTRACT(DAY FROM check_date)::INT;
    monthly_day := COALESCE((rule->>'monthly_day')::INT, (rule->>'date')::INT, 1);
    RETURN dom = monthly_day;
  END IF;

  IF rule_type = 'x_monthly' OR rule_type = 'every_x_months' THEN
    dom := EXTRACT(DAY FROM check_date)::INT;
    IF rule_type = 'x_monthly' THEN
      interval_val := (rule->>'x_month_interval')::INT;
      monthly_day := (rule->>'monthly_day')::INT;
    ELSE
      interval_val := (rule->>'interval')::INT;
      monthly_day := COALESCE((rule->>'date')::INT, 1);
    END IF;

    IF dom = monthly_day THEN
      month_diff := (EXTRACT(YEAR FROM check_date)::INT - EXTRACT(YEAR FROM last_date)::INT) * 12 
                  + (EXTRACT(MONTH FROM check_date)::INT - EXTRACT(MONTH FROM last_date)::INT);
      RETURN month_diff >= interval_val;
    END IF;
    RETURN FALSE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Spawner function running server-side
CREATE OR REPLACE FUNCTION public.spawn_recurring_tasks_ist()
RETURNS VOID AS $$
DECLARE
  today_ist DATE := (timezone('Asia/Kolkata', now()))::DATE;
  template RECORD;
  rule JSONB;
  is_full_day_leave BOOLEAN;
  valid_user BOOLEAN;
BEGIN
  FOR template IN 
    SELECT st.*
    FROM public.saved_tasks st
    WHERE st.is_recurring = TRUE 
      AND st.is_active = TRUE 
      AND st.type IS DISTINCT FROM 'Group'
  LOOP
    -- Validate assignee is still an active user
    IF template.assignee_id IS NOT NULL THEN
      SELECT EXISTS(SELECT 1 FROM public.users WHERE id = template.assignee_id AND is_active = TRUE) INTO valid_user;
      IF NOT valid_user THEN
        CONTINUE;
      END IF;
    END IF;

    rule := template.recurrence_rule;
    IF rule IS NULL THEN
      CONTINUE;
    END IF;

    -- Only generate if last_generated_at is not today
    IF template.last_generated_at IS NOT NULL AND template.last_generated_at >= today_ist THEN
      CONTINUE;
    END IF;

    -- Evaluate if today matches the recurrence rule
    IF public.is_scheduled_day(today_ist, rule, template.last_generated_at, template.created_at) THEN
      -- Check if assignee has an approved Full-Day Leave today
      is_full_day_leave := FALSE;
      IF template.assignee_id IS NOT NULL THEN
        SELECT EXISTS (
          SELECT 1 FROM public.leave_requests
          WHERE user_id = template.assignee_id
            AND status = 'Approved'
            AND leave_type = 'Full Day'
            AND today_ist >= from_date 
            AND today_ist <= to_date
        ) INTO is_full_day_leave;
      END IF;

      IF is_full_day_leave THEN
        -- Skip task generation, but update last_generated_at to mark today as processed
        BEGIN
          UPDATE public.saved_tasks
          SET last_generated_at = today_ist
          WHERE id = template.id;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'Failed to update last_generated_at for skipped template %: %', template.id, SQLERRM;
        END;
      ELSE
        -- Generate the task for today
        BEGIN
          INSERT INTO public.work_items (
            title, description, type, assignee_id, container_id,
            estimated_hours, priority, status, expected_date, is_recurring,
            parent_id, source_template_item_id
          ) VALUES (
            template.title, template.description, 'Task', template.assignee_id, NULL,
            template.estimated_hours, template.priority, 'Assigned', today_ist, FALSE,
            NULL, template.id
          );
          
          -- Only update last_generated_at if insertion succeeded
          UPDATE public.saved_tasks
          SET last_generated_at = today_ist
          WHERE id = template.id;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'Failed to spawn recurring task for template % on date %: %', template.id, today_ist, SQLERRM;
        END;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Enable pg_cron and schedule the job
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Schedule to run every day at 12:01 AM IST (which is 18:31 UTC)
-- Format: Minute Hour DayOfMonth Month DayOfWeek
-- Unschedule first if it exists to prevent duplicates without raising errors
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'spawn-recurring-tasks-job';
SELECT cron.schedule(
  'spawn-recurring-tasks-job',
  '31 18 * * *',
  $$ SELECT public.spawn_recurring_tasks_ist(); $$
);
