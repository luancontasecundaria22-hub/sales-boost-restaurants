-- ─────────────────────────────────────────────────────────────────────────
-- Business Progress Game — Leagues (substitui os Levels numéricos).
-- Em vez de "Level 1..5", a progressão vira uma LIGA de status (Bronze → Master)
-- baseada em XP (os mesmos Growth Points). A tabela progress_levels passa a
-- guardar as ligas (level = ordem da liga). key/name/icon/min_gp/max_gp já
-- comportam tudo; adicionamos 'identity' (o rótulo do negócio) e 'color'.
-- ─────────────────────────────────────────────────────────────────────────

alter table progress_levels add column if not exists identity text;
alter table progress_levels add column if not exists color text;

-- Re-seed como ligas (upsert por level).
insert into progress_levels (level, key, name, icon, min_gp, max_gp, identity, color) values
  (1, 'bronze',   'Bronze',   '🪨', 0,     2500,  'Starting Business', '#cd7f32'),
  (2, 'silver',   'Silver',   '🥈', 2500,  7500,  'Growing Business',  '#cbd5e1'),
  (3, 'gold',     'Gold',     '🥇', 7500,  15000, 'Growth Business',   '#FBBF24'),
  (4, 'platinum', 'Platinum', '💎', 15000, 30000, 'Advanced Business', '#67e8f9'),
  (5, 'diamond',  'Diamond',  '👑', 30000, 60000, 'Elite Business',    '#A78BFA'),
  (6, 'master',   'Master',   '🚀', 60000, null,  'Business Master',   '#FF6D29')
on conflict (level) do update set
  key = excluded.key, name = excluded.name, icon = excluded.icon,
  min_gp = excluded.min_gp, max_gp = excluded.max_gp,
  identity = excluded.identity, color = excluded.color;
