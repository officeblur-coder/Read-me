-- AUTOFLOW — schema inițială (Etapa 1)
-- Sumele sunt în cenți (bigint). Toate tabelele de business au dealer_id și Row-Level Security.

-- ── Funcții de context tenant ───────────────────────────────────────────────
-- Aplicația setează aceste variabile cu set_config(..., true) la începutul fiecărei tranzacții.
CREATE OR REPLACE FUNCTION app_dealer_id() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.dealer_id', true), '')::uuid $$;
CREATE OR REPLACE FUNCTION app_user_id() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;

-- ── Platformă ───────────────────────────────────────────────────────────────
CREATE TABLE dealers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  legal_name    text,
  cui           text,
  reg_com       text,
  address       text,
  city          text,
  county        text,
  phone         text,
  email         text,
  website       text,
  brand_color   text,
  locale        text NOT NULL DEFAULT 'ro',
  currency      text NOT NULL DEFAULT 'EUR',
  status        text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','active','suspended','cancelled')),
  plan_code     text NOT NULL DEFAULT 'start',
  stock_seq     integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text NOT NULL,
  password_hash  text NOT NULL,
  full_name      text NOT NULL,
  phone          text,
  locale         text NOT NULL DEFAULT 'ro',
  is_super_admin boolean NOT NULL DEFAULT false,
  last_login_at  timestamptz,
  disabled_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));

CREATE TABLE sessions (
  id               text PRIMARY KEY,            -- SHA-256 al token-ului din cookie; token-ul brut nu se stochează
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  active_dealer_id uuid REFERENCES dealers(id) ON DELETE SET NULL,
  expires_at       timestamptz NOT NULL,
  ip               text,
  user_agent       text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE locations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id  uuid NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  name       text NOT NULL,
  address    text,
  phone      text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX locations_dealer_idx ON locations (dealer_id);

CREATE TABLE memberships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id   uuid NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('owner','manager','sales','operator')),
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dealer_id, user_id)
);
CREATE INDEX memberships_user_idx ON memberships (user_id);

CREATE TABLE audit_log (
  id            bigserial PRIMARY KEY,
  dealer_id     uuid REFERENCES dealers(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action        text NOT NULL,
  entity        text,
  entity_id     text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip            text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_dealer_created_idx ON audit_log (dealer_id, created_at DESC);

-- ── Inventar ────────────────────────────────────────────────────────────────
CREATE TABLE vehicles (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id          uuid NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  location_id        uuid REFERENCES locations(id) ON DELETE SET NULL,
  stock_number       integer NOT NULL,
  -- identificare
  make               text NOT NULL,
  model              text NOT NULL,
  generation         text,
  version            text,
  year               smallint NOT NULL CHECK (year BETWEEN 1950 AND 2100),
  vin                text,
  plate_number       text,
  mileage_km         integer CHECK (mileage_km >= 0),
  engine             text,
  engine_cc          integer CHECK (engine_cc >= 0),
  power_hp           integer CHECK (power_hp >= 0),
  power_kw           integer CHECK (power_kw >= 0),
  fuel               text NOT NULL,
  transmission       text NOT NULL,
  drivetrain         text,
  emission_standard  text,
  body_type          text,
  color              text,
  doors              smallint,
  seats              smallint,
  owners_count       smallint CHECK (owners_count >= 0),
  origin             text,
  first_registration date,
  equipment          jsonb NOT NULL DEFAULT '[]'::jsonb,
  description        text,
  internal_notes     text,
  -- financiar (cenți)
  purchase_price     bigint CHECK (purchase_price >= 0),
  transport_cost     bigint CHECK (transport_cost >= 0),
  repair_cost        bigint CHECK (repair_cost >= 0),
  preparation_cost   bigint CHECK (preparation_cost >= 0),
  other_costs        bigint CHECK (other_costs >= 0),
  list_price         bigint CHECK (list_price >= 0),
  min_price          bigint CHECK (min_price >= 0),
  sale_price         bigint CHECK (sale_price >= 0),
  -- status
  status             text NOT NULL DEFAULT 'preparation'
                     CHECK (status IN ('preparation','available','reserved','sold','withdrawn')),
  status_changed_at  timestamptz NOT NULL DEFAULT now(),
  acquired_at        date NOT NULL DEFAULT current_date,
  listed_at          timestamptz,
  sold_at            timestamptz,
  sold_by_user_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dealer_id, stock_number),
  CHECK (status <> 'sold' OR (sale_price IS NOT NULL AND sold_at IS NOT NULL))
);
CREATE UNIQUE INDEX vehicles_dealer_vin_idx ON vehicles (dealer_id, upper(vin)) WHERE vin IS NOT NULL;
CREATE INDEX vehicles_dealer_status_idx ON vehicles (dealer_id, status);
CREATE INDEX vehicles_dealer_created_idx ON vehicles (dealer_id, created_at DESC);

CREATE TABLE vehicle_media (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id   uuid NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  vehicle_id  uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  kind        text NOT NULL DEFAULT 'image' CHECK (kind IN ('image','video')),
  storage_key text NOT NULL,
  thumb_key   text,
  mime_type   text NOT NULL,
  width       integer,
  height      integer,
  size_bytes  integer NOT NULL,
  position    integer NOT NULL DEFAULT 0,
  is_primary  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vehicle_media_vehicle_idx ON vehicle_media (vehicle_id, position);
CREATE UNIQUE INDEX vehicle_media_one_primary_idx ON vehicle_media (vehicle_id) WHERE is_primary;

CREATE TABLE vehicle_status_history (
  id          bigserial PRIMARY KEY,
  dealer_id   uuid NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  vehicle_id  uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  from_status text,
  to_status   text NOT NULL,
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vsh_vehicle_idx ON vehicle_status_history (vehicle_id, created_at);

-- ── Row-Level Security ──────────────────────────────────────────────────────
ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealers FORCE ROW LEVEL SECURITY;
CREATE POLICY dealers_tenant ON dealers
  USING (id = app_dealer_id()
         OR id IN (SELECT dealer_id FROM memberships WHERE user_id = app_user_id()))
  WITH CHECK (id = app_dealer_id());

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;
-- Un utilizator își vede propriile apartenențe (pentru selectarea dealerului la login);
-- modificările sunt permise doar în contextul dealerului activ.
CREATE POLICY memberships_read ON memberships FOR SELECT
  USING (dealer_id = app_dealer_id() OR user_id = app_user_id());
CREATE POLICY memberships_write ON memberships FOR INSERT WITH CHECK (dealer_id = app_dealer_id());
CREATE POLICY memberships_update ON memberships FOR UPDATE
  USING (dealer_id = app_dealer_id()) WITH CHECK (dealer_id = app_dealer_id());
CREATE POLICY memberships_delete ON memberships FOR DELETE USING (dealer_id = app_dealer_id());

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['locations','vehicles','vehicle_media','vehicle_status_history','audit_log'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON %I USING (dealer_id = app_dealer_id()) WITH CHECK (dealer_id = app_dealer_id())',
                   t || '_tenant', t);
  END LOOP;
END $$;

-- ── Drepturi pentru rolul aplicației ────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO autoflow_app;
GRANT SELECT, INSERT, UPDATE ON dealers, users, memberships, locations, vehicles, vehicle_media TO autoflow_app;
GRANT DELETE ON memberships, locations, vehicles, vehicle_media TO autoflow_app;
GRANT SELECT, INSERT, DELETE ON sessions TO autoflow_app;
GRANT UPDATE (active_dealer_id, expires_at) ON sessions TO autoflow_app;
-- Jurnalele sunt append-only pentru aplicație.
GRANT SELECT, INSERT ON audit_log, vehicle_status_history TO autoflow_app;
GRANT USAGE ON SEQUENCE audit_log_id_seq, vehicle_status_history_id_seq TO autoflow_app;
GRANT EXECUTE ON FUNCTION app_dealer_id(), app_user_id() TO autoflow_app;
