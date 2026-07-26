alter table companies add column if not exists notification_prefs jsonb not null default '{"opportunities": true, "negative_reviews": true, "new_competitor": true, "agent_actions": true}'::jsonb;
