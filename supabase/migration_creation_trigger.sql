-- Migration: Auto-Spawn Recurring Task on Template Creation
-- Run this in the Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.on_saved_task_created_spawn()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_ist DATE := (timezone('Asia/Kolkata', now()))::DATE;
  is_full_day_leave BOOLEAN;
  valid_user BOOLEAN;
  has_work_item BOOLEAN;
BEGIN
  -- Only trigger for active, recurring template tasks
  IF NEW.is_recurring = TRUE AND NEW.is_active = TRUE AND NEW.type IS DISTINCT FROM 'Group' THEN
    -- Validate assignee is an active user
    IF NEW.assignee_id IS NOT NULL THEN
      SELECT EXISTS(SELECT 1 FROM public.users WHERE id = NEW.assignee_id AND is_active = TRUE) INTO valid_user;
      IF NOT valid_user THEN
        RETURN NEW;
      END IF;
    END IF;

    -- Evaluate if today matches the recurrence rule
    IF public.is_scheduled_day(today_ist, NEW.recurrence_rule, NULL, NEW.created_at) THEN
      
      -- Prevent double spawning if a task was already created for this template today
      SELECT EXISTS(
        SELECT 1 FROM public.work_items 
        WHERE source_template_item_id = NEW.id AND expected_date = today_ist
      ) INTO has_work_item;
      
      IF NOT has_work_item THEN
        -- Check if assignee has an approved Full-Day Leave today
        is_full_day_leave := FALSE;
        IF NEW.assignee_id IS NOT NULL THEN
          SELECT EXISTS (
            SELECT 1 FROM public.leave_requests
            WHERE user_id = NEW.assignee_id
              AND status = 'Approved'
              AND leave_type = 'Full Day'
              AND today_ist >= from_date 
              AND today_ist <= to_date
          ) INTO is_full_day_leave;
        END IF;

        IF is_full_day_leave THEN
          -- Skip task generation, but update last_generated_at to mark today as processed
          IF NEW.last_generated_at IS DISTINCT FROM today_ist THEN
            UPDATE public.saved_tasks
            SET last_generated_at = today_ist
            WHERE id = NEW.id;
          END IF;
        ELSE
          -- Generate the task for today
          INSERT INTO public.work_items (
            title, description, type, assignee_id, container_id,
            estimated_hours, priority, status, expected_date, is_recurring,
            parent_id, source_template_item_id, created_by
          ) VALUES (
            NEW.title, NEW.description, 'Task', NEW.assignee_id, NULL,
            NEW.estimated_hours, NEW.priority, 'Assigned', today_ist, FALSE,
            NULL, NEW.id, COALESCE(NEW.created_by, NEW.assignee_id)
          );
          
          -- Update last_generated_at on the template to today
          IF NEW.last_generated_at IS DISTINCT FROM today_ist THEN
            UPDATE public.saved_tasks
            SET last_generated_at = today_ist
            WHERE id = NEW.id;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_saved_task_created ON public.saved_tasks;
CREATE TRIGGER trigger_saved_task_created
  AFTER INSERT ON public.saved_tasks
  FOR EACH ROW EXECUTE PROCEDURE public.on_saved_task_created_spawn();
