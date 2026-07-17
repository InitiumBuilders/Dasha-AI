-- ════════════════════════════════════════════════════════════════════════════
--  DASHA · THE PULSE — Supabase schema
--  Run this once in your Supabase project (SQL Editor → New query → Run).
--  Then give the deployment: SUPABASE_URL  +  SUPABASE_SERVICE_KEY
--  and the pulse becomes fleet-wide, persistent, and fully queryable.
--
--  PRIVACY BY CONSTRUCTION: there is no column for a question, an answer, an
--  address, an IP, or a person. There is nowhere to put one. We store the SHAPE
--  of the work — which skill fired, which tool she reached for, a thumb — and
--  nothing else. You cannot leak what the table cannot hold.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.dasha_events (
  id          bigint generated always as identity primary key,
  ts          timestamptz not null default now(),
  kind        text not null,              -- 'turn' | 'thumb'
  surface     text,                       -- web | x | x-dm | telegram | api
  model       text,                       -- everyday | engineering | judgement tier's model name
  depth       text,                       -- everyday | debugging | counsel | ...
  skills      text[],                     -- the skill(s) that fired, e.g. {/data-contract}
  tools       text[],                     -- the live tools she reached for
  ok          boolean,                    -- did she answer, or error out
  thumb       smallint,                   -- +1 / -1  (kind='thumb')
  filed       boolean,                    -- did a 👎 open a public issue
  cost_micros integer                     -- coarse cost, millionths of a dollar
);

create index if not exists dasha_events_ts_idx on public.dasha_events (ts desc);

-- Row-Level Security ON, and no policies => only the service key can read or write.
-- The anon/public key sees nothing. The team's server holds the service key.
alter table public.dasha_events enable row level security;

-- Optional: keep the table lean automatically (drop rows older than 90 days).
-- Requires pg_cron (Database → Extensions → enable "pg_cron"), then:
-- select cron.schedule('dasha-pulse-prune','0 4 * * *',
--   $$ delete from public.dasha_events where ts < now() - interval '90 days' $$);

-- ── Handy read-only views for your own dashboards (queried with the service key) ──
create or replace view public.dasha_pulse_daily as
  select date_trunc('day', ts) as day,
         count(*) filter (where kind='turn')                as answers,
         count(*) filter (where kind='thumb' and thumb > 0) as thumbs_up,
         count(*) filter (where kind='thumb' and thumb < 0) as thumbs_down,
         round(sum(cost_micros) filter (where kind='turn') / 1000000.0, 4) as cost_usd
  from public.dasha_events
  group by 1 order by 1 desc;

create or replace view public.dasha_pulse_skills as
  select skill, count(*) as fired
  from public.dasha_events, unnest(skills) as skill
  where kind='turn' and skill <> '(none)'
  group by 1 order by 2 desc;

-- Done. Nothing here can identify a person. That is the point.
