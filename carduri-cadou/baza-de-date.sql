-- Lyra – carduri cadou: schema pentru baza de date (Supabase / PostgreSQL)
-- Se rulează o singură dată în Supabase → SQL Editor.

-- Angajații (recepție / ospătari). Contul de login se face în Supabase → Authentication.
create table angajati (
  id          uuid primary key references auth.users(id) on delete cascade,
  nume        text not null,
  rol         text not null check (rol in ('receptie', 'ospatar', 'admin'))
);

-- Clienții. "acord_marketing" decide dacă intră în lista de newsletter.
create table clienti (
  id               bigint generated always as identity primary key,
  nume             text not null,
  prenume          text not null,
  telefon          text not null,
  email            text not null,
  acord_marketing  boolean not null default false,
  acord_data       timestamptz,
  creat_la         timestamptz not null default now()
);

-- Cardurile fizice. Codul este exact textul din QR-ul de pe card.
create table carduri (
  cod             text primary key,
  client_id       bigint references clienti(id),
  valoare         numeric(10,2),
  sold            numeric(10,2) check (sold >= 0),
  incarcat_la     timestamptz,
  incarcat_de     uuid references angajati(id),
  expira_la       date,
  sunat_la        timestamptz,
  sunat_de        uuid references angajati(id)
);

-- Istoricul: fiecare încărcare și fiecare consum.
create table tranzactii (
  id         bigint generated always as identity primary key,
  card_cod   text not null references carduri(cod),
  tip        text not null check (tip in ('incarcare', 'consum')),
  suma       numeric(10,2) not null check (suma > 0),
  facut_de   uuid not null references angajati(id),
  facut_la   timestamptz not null default now()
);

-- Scăderea de pe card se face într-o singură operație sigură:
-- dacă doi ospătari scanează același card în același timp, soldul nu poate ajunge negativ.
create or replace function consuma_card(p_cod text, p_suma numeric)
returns numeric language plpgsql security definer as $$
declare v_sold numeric;
begin
  update carduri
     set sold = sold - p_suma
   where cod = p_cod and sold >= p_suma and expira_la >= current_date
  returning sold into v_sold;
  if v_sold is null then
    raise exception 'Sold insuficient sau card expirat';
  end if;
  insert into tranzactii(card_cod, tip, suma, facut_de) values (p_cod, 'consum', p_suma, auth.uid());
  return v_sold;
end $$;

-- Cardurile care expiră în 7 zile și au încă bani (pentru notificarea de la recepție).
create view carduri_de_sunat as
select c.cod, c.sold, c.expira_la, cl.nume, cl.prenume, cl.telefon
  from carduri c join clienti cl on cl.id = c.client_id
 where c.sold > 0 and c.sunat_la is null
   and c.expira_la between current_date and current_date + 7;

-- Lista pentru newsletter.
create view newsletter as
select distinct on (email) prenume, nume, email, telefon, acord_data
  from clienti where acord_marketing order by email, acord_data desc;

-- Doar angajații logați au acces la date.
alter table angajati   enable row level security;
alter table clienti    enable row level security;
alter table carduri    enable row level security;
alter table tranzactii enable row level security;
create policy "angajatii vad"    on angajati   for select using (auth.uid() is not null);
create policy "angajatii lucreaza" on clienti  for all    using (auth.uid() in (select id from angajati));
create policy "angajatii lucreaza" on carduri  for all    using (auth.uid() in (select id from angajati));
create policy "angajatii lucreaza" on tranzactii for all  using (auth.uid() in (select id from angajati));
