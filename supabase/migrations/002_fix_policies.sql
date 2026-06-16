-- Drop all existing policies and recreate (idempotente)

-- restaurants
drop policy if exists "owner can select own restaurant" on restaurants;
drop policy if exists "owner can insert own restaurant" on restaurants;
drop policy if exists "owner can update own restaurant" on restaurants;
drop policy if exists "owner can delete own restaurant" on restaurants;

create policy "owner can select own restaurant" on restaurants for select using (auth.uid() = owner_id);
create policy "owner can insert own restaurant" on restaurants for insert with check (auth.uid() = owner_id);
create policy "owner can update own restaurant" on restaurants for update using (auth.uid() = owner_id);
create policy "owner can delete own restaurant" on restaurants for delete using (auth.uid() = owner_id);

-- reviews
drop policy if exists "owner can manage own reviews" on reviews;
create policy "owner can manage own reviews" on reviews for all using (
  exists (select 1 from restaurants where id = reviews.restaurant_id and owner_id = auth.uid())
);

-- competitors
drop policy if exists "owner can manage own competitors" on competitors;
create policy "owner can manage own competitors" on competitors for all using (
  exists (select 1 from restaurants where id = competitors.restaurant_id and owner_id = auth.uid())
);

-- competitor_prices
drop policy if exists "owner can manage competitor prices" on competitor_prices;
create policy "owner can manage competitor prices" on competitor_prices for all using (
  exists (
    select 1 from competitors c
    join restaurants r on r.id = c.restaurant_id
    where c.id = competitor_prices.competitor_id and r.owner_id = auth.uid()
  )
);

-- menu_items
drop policy if exists "owner can manage own menu" on menu_items;
create policy "owner can manage own menu" on menu_items for all using (
  exists (select 1 from restaurants where id = menu_items.restaurant_id and owner_id = auth.uid())
);

-- reports
drop policy if exists "owner can read own reports" on reports;
create policy "owner can read own reports" on reports for all using (
  exists (select 1 from restaurants where id = reports.restaurant_id and owner_id = auth.uid())
);

-- actions
drop policy if exists "owner can manage own actions" on actions;
create policy "owner can manage own actions" on actions for all using (
  exists (
    select 1 from reports rep
    join restaurants r on r.id = rep.restaurant_id
    where rep.id = actions.report_id and r.owner_id = auth.uid()
  )
);

-- surveys
drop policy if exists "owner can manage own surveys" on surveys;
drop policy if exists "public can view active surveys" on surveys;
create policy "owner can manage own surveys" on surveys for all using (
  exists (select 1 from restaurants where id = surveys.restaurant_id and owner_id = auth.uid())
);
create policy "public can view active surveys" on surveys for select using (active = true);

-- survey_responses
drop policy if exists "public can insert survey response" on survey_responses;
drop policy if exists "owner can read survey responses" on survey_responses;
create policy "public can insert survey response" on survey_responses for insert with check (true);
create policy "owner can read survey responses" on survey_responses for select using (
  exists (
    select 1 from surveys s
    join restaurants r on r.id = s.restaurant_id
    where s.id = survey_responses.survey_id and r.owner_id = auth.uid()
  )
);

-- add unique constraint to competitors if not exists
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'competitors_restaurant_id_google_place_id_key'
  ) then
    alter table competitors add constraint competitors_restaurant_id_google_place_id_key
      unique (restaurant_id, google_place_id);
  end if;
end $$;
