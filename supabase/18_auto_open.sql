-- =====================================================================
-- Pornire / oprire automată a comenzilor online după program (zilnic 11:00–21:30 implicit)
--  * la ora de deschidere „Preiau comenzi” se pornește singur, la ora de închidere se oprește
--  * între timp recepția îl poate opri / porni de mână; schimbarea automată vine doar la următoarea oră din program
--  * recepția aude un sunet separat la deschidere și la închidere (Reception.tsx)
-- =====================================================================
alter table public.settings add column if not exists auto_open boolean not null default true;   -- admin → Program
alter table public.settings add column if not exists auto_state boolean;                         -- ultima stare pusă automat

create or replace function public.auto_open_tick() returns boolean
language plpgsql security definer set search_path = public as $$
declare s public.settings; want boolean;
begin
  select * into s from public.settings where id = 1;
  if not coalesce(s.auto_open, false) then return null; end if;
  want := public.is_open_at(now());
  if s.auto_state is distinct from want then
    update public.settings set accepting_orders = want, auto_state = want where id = 1;
  end if;
  return want;
end $$;
-- poate fi apelată și din recepție (rezervă dacă pg_cron nu rulează); face doar ce scrie în program
grant execute on function public.auto_open_tick() to authenticated;

do $$ begin
  begin perform cron.unschedule('lyra-auto-open'); exception when others then null; end;
  begin perform cron.schedule('lyra-auto-open', '* * * * *', 'select public.auto_open_tick()');
  exception when others then raise notice 'pg_cron indisponibil: pornirea automată se face când recepția e deschisă.'; end;
end $$;
