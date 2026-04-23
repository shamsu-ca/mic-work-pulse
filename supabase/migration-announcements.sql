create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  event_date date not null,
  event_time time,
  staff_group text not null default 'Both',
  created_at timestamptz default now()
);

alter table announcements enable row level security;

create policy "Authenticated users can read announcements"
  on announcements for select
  using (auth.role() = 'authenticated');

create policy "Admins can insert announcements"
  on announcements for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'Admin')
  );

create policy "Admins can delete announcements"
  on announcements for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'Admin')
  );
