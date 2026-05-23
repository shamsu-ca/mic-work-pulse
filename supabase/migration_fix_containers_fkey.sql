-- Fix foreign key constraint on containers table
ALTER TABLE public.containers
  DROP CONSTRAINT IF EXISTS containers_source_template_id_fkey;

ALTER TABLE public.containers
  ADD CONSTRAINT containers_source_template_id_fkey
  FOREIGN KEY (source_template_id)
  REFERENCES public.saved_containers(id)
  ON DELETE SET NULL;
