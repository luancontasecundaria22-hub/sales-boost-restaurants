-- Lets the Concorrentes tab track price/rating changes over time and,
-- when a competitor's Instagram can be found, their social activity.
alter table competitors add column if not exists instagram_url text;

create table if not exists competitor_snapshots (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references competitors(id) on delete cascade,
  price_level smallint,
  rating numeric,
  review_count integer,
  instagram_followers integer,
  instagram_posts_count integer,
  instagram_posting_freq_days numeric,
  collected_at timestamptz not null default now()
);

create index if not exists competitor_snapshots_competitor_id_idx on competitor_snapshots (competitor_id, collected_at desc);

alter table competitor_snapshots enable row level security;

create policy "competitor_snapshots_self" on competitor_snapshots for select using (
  competitor_id in (
    select c.id from competitors c
    join companies co on co.id = c.company_id
    where co.user_id = auth.uid()
  )
);
