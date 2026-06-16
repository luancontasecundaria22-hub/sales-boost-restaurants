-- SalesBoost Restaurants — initial schema
-- Run this in: Supabase dashboard → SQL Editor → New query

-- ─── Extensions ───────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── restaurants ──────────────────────────────────────────────────────────
create table if not exists restaurants (
  id               uuid primary key default uuid_generate_v4(),
  owner_id         uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  google_place_id  text,
  address          text,
  lat              double precision,
  lng              double precision,
  plan             text not null default 'starter' check (plan in ('starter','pro','ultra')),
  locale           text not null default 'pt'     check (locale in ('pt','en')),
  created_at       timestamptz not null default now()
);

alter table restaurants enable row level security;

create policy "owner can select own restaurant"
  on restaurants for select using (auth.uid() = owner_id);

create policy "owner can insert own restaurant"
  on restaurants for insert with check (auth.uid() = owner_id);

create policy "owner can update own restaurant"
  on restaurants for update using (auth.uid() = owner_id);

create policy "owner can delete own restaurant"
  on restaurants for delete using (auth.uid() = owner_id);

-- ─── reviews ──────────────────────────────────────────────────────────────
create table if not exists reviews (
  id              uuid primary key default uuid_generate_v4(),
  restaurant_id   uuid not null references restaurants(id) on delete cascade,
  source          text not null default 'google' check (source in ('google','ifood','tripadvisor','instagram','manual')),
  author          text,
  rating          smallint check (rating between 1 and 5),
  text            text,
  review_date     date,
  sentiment       text check (sentiment in ('positive','neutral','negative')),
  themes          text[] default '{}',
  raw_data        jsonb,
  created_at      timestamptz not null default now()
);

alter table reviews enable row level security;

create policy "owner can manage own reviews"
  on reviews for all using (
    exists (select 1 from restaurants where id = reviews.restaurant_id and owner_id = auth.uid())
  );

-- ─── competitors ──────────────────────────────────────────────────────────
create table if not exists competitors (
  id               uuid primary key default uuid_generate_v4(),
  restaurant_id    uuid not null references restaurants(id) on delete cascade,
  google_place_id  text,
  name             text not null,
  rating           numeric(2,1),
  review_count     int,
  distance_m       int,
  price_level      smallint,
  created_at       timestamptz not null default now()
);

alter table competitors enable row level security;

create policy "owner can manage own competitors"
  on competitors for all using (
    exists (select 1 from restaurants where id = competitors.restaurant_id and owner_id = auth.uid())
  );

-- ─── competitor_prices ────────────────────────────────────────────────────
create table if not exists competitor_prices (
  id             uuid primary key default uuid_generate_v4(),
  competitor_id  uuid not null references competitors(id) on delete cascade,
  item_name      text not null,
  price          numeric(10,2),
  category       text,
  collected_at   date not null default current_date,
  source         text default 'manual'
);

alter table competitor_prices enable row level security;

create policy "owner can manage competitor prices"
  on competitor_prices for all using (
    exists (
      select 1 from competitors c
      join restaurants r on r.id = c.restaurant_id
      where c.id = competitor_prices.competitor_id and r.owner_id = auth.uid()
    )
  );

-- ─── menu_items ───────────────────────────────────────────────────────────
create table if not exists menu_items (
  id             uuid primary key default uuid_generate_v4(),
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  item_name      text not null,
  price          numeric(10,2),
  category       text,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

alter table menu_items enable row level security;

create policy "owner can manage own menu"
  on menu_items for all using (
    exists (select 1 from restaurants where id = menu_items.restaurant_id and owner_id = auth.uid())
  );

-- ─── reports ──────────────────────────────────────────────────────────────
create table if not exists reports (
  id             uuid primary key default uuid_generate_v4(),
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  period         text not null,          -- e.g. '2026-06'
  pdf_url        text,
  health_score   smallint check (health_score between 0 and 100),
  summary_json   jsonb,                  -- cached insights for dashboard
  created_at     timestamptz not null default now()
);

alter table reports enable row level security;

create policy "owner can read own reports"
  on reports for all using (
    exists (select 1 from restaurants where id = reports.restaurant_id and owner_id = auth.uid())
  );

-- ─── actions ──────────────────────────────────────────────────────────────
create table if not exists actions (
  id           uuid primary key default uuid_generate_v4(),
  report_id    uuid not null references reports(id) on delete cascade,
  title        text not null,
  description  text,
  priority     smallint not null default 1,
  status       text not null default 'pending' check (status in ('pending','done','skipped')),
  created_at   timestamptz not null default now()
);

alter table actions enable row level security;

create policy "owner can manage own actions"
  on actions for all using (
    exists (
      select 1 from reports rep
      join restaurants r on r.id = rep.restaurant_id
      where rep.id = actions.report_id and r.owner_id = auth.uid()
    )
  );

-- ─── surveys ──────────────────────────────────────────────────────────────
create table if not exists surveys (
  id             uuid primary key default uuid_generate_v4(),
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  qr_slug        text unique not null,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

alter table surveys enable row level security;

create policy "owner can manage own surveys"
  on surveys for all using (
    exists (select 1 from restaurants where id = surveys.restaurant_id and owner_id = auth.uid())
  );

-- public read for QR code landing page
create policy "public can view active surveys"
  on surveys for select using (active = true);

-- ─── survey_responses ─────────────────────────────────────────────────────
create table if not exists survey_responses (
  id                  uuid primary key default uuid_generate_v4(),
  survey_id           uuid not null references surveys(id) on delete cascade,
  age_range           text,
  discovery_channel   text,
  frequency           text,
  nps                 smallint check (nps between 0 and 10),
  created_at          timestamptz not null default now()
);

alter table survey_responses enable row level security;

-- anyone can insert (anonymous survey)
create policy "public can insert survey response"
  on survey_responses for insert with check (true);

-- only owner can read
create policy "owner can read survey responses"
  on survey_responses for select using (
    exists (
      select 1 from surveys s
      join restaurants r on r.id = s.restaurant_id
      where s.id = survey_responses.survey_id and r.owner_id = auth.uid()
    )
  );
