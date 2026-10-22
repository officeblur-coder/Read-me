-- ContaPilot AI — schema PostgreSQL 16 pentru MVP
-- Principii:
--   * fiecare tabel de date are tenant_id și politică RLS;
--   * sumele sunt NUMERIC(18,2), niciodată float;
--   * datele importate sunt imuabile; corecțiile sunt propuneri care se aprobă și se exportă;
--   * constatările păstrează versiunea regulii și hash-ul datelor de intrare (reproductibilitate).

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------
-- Catalog global (fără tenant)
-- ---------------------------------------------------------------
CREATE TABLE standard_accounts (            -- planul de conturi OMFP 1802/2014
  code         text PRIMARY KEY,            -- '4427', '5311'
  name         text NOT NULL,
  class        smallint NOT NULL CHECK (class BETWEEN 1 AND 9),
  kind         text NOT NULL CHECK (kind IN ('A','P','B')),  -- activ, pasiv, bifuncțional
  requires_analytic boolean NOT NULL DEFAULT false
);

CREATE TABLE legal_parameters (             -- cote TVA, plafoane, praguri, cu valabilitate
  key          text NOT NULL,               -- 'vat.standard', 'vat.reduced', 'cash.limit.pj.day', 'fixed_asset.threshold'
  value        numeric(18,4) NOT NULL,
  valid_from   date NOT NULL,
  valid_to     date,
  legal_ref    text NOT NULL,               -- 'Legea 141/2025', 'Legea 70/2015'
  PRIMARY KEY (key, valid_from)
);

CREATE TABLE rules (
  id           text NOT NULL,               -- 'R-TVA-03'
  version      text NOT NULL,               -- '1.2.0'
  title        text NOT NULL,
  family       text NOT NULL,               -- integritate, tva, salarii, dubluri, terti, variatii, numerar
  default_severity text NOT NULL CHECK (default_severity IN ('critical','high','medium','info')),
  description  text NOT NULL,
  released_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, version)
);

-- ---------------------------------------------------------------
-- Tenanți, utilizatori, abonamente
-- ---------------------------------------------------------------
CREATE TABLE tenants (                      -- un cabinet sau un contabil autorizat
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  cui          text,
  ceccar_no    text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        citext UNIQUE NOT NULL,
  full_name    text NOT NULL,
  password_hash text,
  totp_secret_enc bytea,                    -- 2FA, criptat la nivel de aplicație
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         text NOT NULL CHECK (role IN ('owner','accountant','operator','auditor')),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE plans (
  id           text PRIMARY KEY,             -- 'solo', 'cabinet', 'expert'
  name         text NOT NULL,
  monthly_price numeric(18,2) NOT NULL,
  max_companies int NOT NULL,
  max_ocr_pages int NOT NULL,
  max_ai_questions int NOT NULL
);

CREATE TABLE subscriptions (
  tenant_id    uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id      text NOT NULL REFERENCES plans(id),
  status       text NOT NULL CHECK (status IN ('trialing','active','past_due','canceled')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz
);

CREATE TABLE usage_counters (
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  month        date NOT NULL,                -- prima zi a lunii
  metric       text NOT NULL,                -- 'active_companies', 'ocr_pages', 'ai_questions'
  value        int NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, month, metric)
);

-- ---------------------------------------------------------------
-- Firme gestionate și perioade
-- ---------------------------------------------------------------
CREATE TABLE companies (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         text NOT NULL,
  cui          text NOT NULL,
  reg_com      text,
  source_system text NOT NULL CHECK (source_system IN ('saga','winmentor','smartbill','other')),
  vat_payer    boolean NOT NULL,
  vat_period   text CHECK (vat_period IN ('monthly','quarterly')),
  vat_on_cash  boolean NOT NULL DEFAULT false,  -- TVA la încasare
  has_employees boolean NOT NULL DEFAULT false,
  has_fixed_assets boolean NOT NULL DEFAULT false,
  uses_fx      boolean NOT NULL DEFAULT false,
  archived_at  timestamptz,
  UNIQUE (tenant_id, cui)
);

CREATE TABLE company_access (               -- acces per firmă, nu doar per cabinet
  tenant_id    uuid NOT NULL,
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (company_id, user_id)
);

CREATE TABLE periods (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  month        date NOT NULL,                -- prima zi a lunii
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','closed')),
  closed_by    uuid REFERENCES users(id),
  closed_at    timestamptz,
  UNIQUE (company_id, month)
);

CREATE TABLE chart_accounts (               -- planul de conturi al firmei, cu analitice
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code         text NOT NULL,                -- '401.00087'
  synthetic_code text NOT NULL REFERENCES standard_accounts(code),
  name         text NOT NULL,
  partner_cui  text,                         -- pentru analitice de terți
  UNIQUE (company_id, code)
);

-- ---------------------------------------------------------------
-- Importuri și fișiere
-- ---------------------------------------------------------------
CREATE TABLE imports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_id    uuid REFERENCES periods(id),
  kind         text NOT NULL CHECK (kind IN ('trial_balance','journal','bank_statement','efactura','document','saft')),
  status       text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','parsing','needs_mapping','analyzed','failed')),
  column_mapping jsonb,                      -- mapare coloane salvată, refolosită la importul următor
  error        text,
  created_by   uuid NOT NULL REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE source_files (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  import_id    uuid NOT NULL REFERENCES imports(id) ON DELETE CASCADE,
  storage_key  text NOT NULL,                -- cheie S3 (regiune UE, SSE)
  file_name    text NOT NULL,
  mime_type    text NOT NULL,
  size_bytes   bigint NOT NULL,
  sha256       bytea NOT NULL,               -- detectare reimport identic
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- Date contabile importate (imuabile)
-- ---------------------------------------------------------------
CREATE TABLE trial_balances (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  period_id    uuid NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  import_id    uuid NOT NULL REFERENCES imports(id),
  is_current   boolean NOT NULL DEFAULT true  -- ultima versiune importată pentru perioadă
);

CREATE TABLE trial_balance_lines (
  id           bigserial PRIMARY KEY,
  tenant_id    uuid NOT NULL,
  trial_balance_id uuid NOT NULL REFERENCES trial_balances(id) ON DELETE CASCADE,
  account_code text NOT NULL,
  account_name text NOT NULL,
  opening_debit  numeric(18,2) NOT NULL DEFAULT 0,
  opening_credit numeric(18,2) NOT NULL DEFAULT 0,
  turnover_debit numeric(18,2) NOT NULL DEFAULT 0,
  turnover_credit numeric(18,2) NOT NULL DEFAULT 0,
  closing_debit  numeric(18,2) NOT NULL DEFAULT 0,
  closing_credit numeric(18,2) NOT NULL DEFAULT 0,
  source_row   int NOT NULL                   -- rândul din fișier, pentru citare
);

CREATE TABLE journal_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  period_id    uuid NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  import_id    uuid NOT NULL REFERENCES imports(id),
  journal      text NOT NULL,                -- 'JV','JC','JB','RC','NC'
  entry_date   date NOT NULL,
  doc_type     text,
  doc_series   text,
  doc_number   text,
  partner_cui  text,
  partner_name text,
  description  text,
  source_row   int NOT NULL
);

CREATE TABLE journal_lines (
  id           bigserial PRIMARY KEY,
  tenant_id    uuid NOT NULL,
  entry_id     uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  debit_account text NOT NULL,
  credit_account text NOT NULL,
  amount       numeric(18,2) NOT NULL,
  vat_code     text,                          -- cod TVA din programul sursă
  currency     char(3) NOT NULL DEFAULT 'RON',
  fx_amount    numeric(18,2),
  fx_rate      numeric(12,6)
);
CREATE INDEX ON journal_lines (tenant_id, debit_account);
CREATE INDEX ON journal_lines (tenant_id, credit_account);
CREATE INDEX ON journal_entries (tenant_id, partner_cui, doc_series, doc_number);  -- regula de dubluri

CREATE TABLE invoices (                     -- din SPV e-Factura (Faza 2) sau OCR
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  direction    text NOT NULL CHECK (direction IN ('received','issued')),
  source       text NOT NULL CHECK (source IN ('spv','ocr','manual')),
  spv_id       text,                          -- id descărcare ANAF
  series       text, number text NOT NULL,
  issue_date   date NOT NULL,
  partner_cui  text, partner_name text NOT NULL,
  net_amount   numeric(18,2) NOT NULL,
  vat_amount   numeric(18,2) NOT NULL,
  total_amount numeric(18,2) NOT NULL,
  currency     char(3) NOT NULL DEFAULT 'RON',
  ocr_confidence numeric(4,3),
  source_file_id uuid REFERENCES source_files(id),
  UNIQUE (company_id, direction, partner_cui, series, number)
);

CREATE TABLE invoice_lines (
  id           bigserial PRIMARY KEY,
  tenant_id    uuid NOT NULL,
  invoice_id   uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description  text NOT NULL,
  quantity     numeric(18,4),
  unit_price   numeric(18,4),
  net_amount   numeric(18,2) NOT NULL,
  vat_rate     numeric(5,2) NOT NULL,
  vat_category text NOT NULL                  -- S, Z, E, AE (taxare inversă), K, O
);

-- ---------------------------------------------------------------
-- Bancă și reconciliere
-- ---------------------------------------------------------------
CREATE TABLE bank_accounts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  iban_enc     bytea NOT NULL,               -- criptat la nivel de aplicație
  iban_last4   text NOT NULL,
  bank_name    text NOT NULL,
  currency     char(3) NOT NULL DEFAULT 'RON',
  ledger_account text NOT NULL               -- '5121', '5124'
);

CREATE TABLE bank_statements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  bank_account_id uuid NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  import_id    uuid NOT NULL REFERENCES imports(id),
  period_id    uuid NOT NULL REFERENCES periods(id),
  opening_balance numeric(18,2) NOT NULL,
  closing_balance numeric(18,2) NOT NULL,
  format       text NOT NULL CHECK (format IN ('mt940','camt053','csv','pdf'))
);

CREATE TABLE bank_transactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  statement_id uuid NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
  booking_date date NOT NULL,
  amount       numeric(18,2) NOT NULL,        -- + încasare, − plată
  counterparty_name text,
  counterparty_iban text,
  details      text,
  bank_code    text,                          -- cod tranzacție bancă (comision, dobândă, ATM)
  extracted_refs text[],                      -- numere de factură găsite în detalii
  status       text NOT NULL DEFAULT 'unmatched' CHECK (status IN ('unmatched','proposed','matched','postponed'))
);

CREATE TABLE reconciliation_matches (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  transaction_id uuid NOT NULL REFERENCES bank_transactions(id) ON DELETE CASCADE,
  method       text NOT NULL CHECK (method IN ('exact','combinatorial','recurring','ai_fuzzy')),
  confidence   numeric(4,3) NOT NULL,
  explanation  text NOT NULL,
  proposal_id  uuid,                          -- nota propusă, dacă tranzacția nu e în contabilitate
  decided_by   uuid REFERENCES users(id),
  decided_at   timestamptz,
  decision     text CHECK (decision IN ('accepted','rejected','postponed'))
);

CREATE TABLE match_targets (                -- o tranzacție ↔ una sau mai multe facturi/înregistrări
  match_id     uuid NOT NULL REFERENCES reconciliation_matches(id) ON DELETE CASCADE,
  tenant_id    uuid NOT NULL,
  target_type  text NOT NULL CHECK (target_type IN ('invoice','journal_entry')),
  target_id    uuid NOT NULL,
  allocated_amount numeric(18,2) NOT NULL,
  PRIMARY KEY (match_id, target_type, target_id)
);

-- ---------------------------------------------------------------
-- Reguli, constatări, propuneri, aprobări
-- ---------------------------------------------------------------
CREATE TABLE rule_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  period_id    uuid NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  rules_run    int NOT NULL DEFAULT 0,
  input_hash   bytea NOT NULL                -- hash al datelor de intrare
);

CREATE TABLE findings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  rule_run_id  uuid NOT NULL REFERENCES rule_runs(id) ON DELETE CASCADE,
  company_id   uuid NOT NULL REFERENCES companies(id),
  rule_id      text NOT NULL,
  rule_version text NOT NULL,
  severity     text NOT NULL CHECK (severity IN ('critical','high','medium','info')),
  title        text NOT NULL,
  calculation  jsonb NOT NULL,               -- [{label, value}], afișat ca atare
  impact_amount numeric(18,2),               -- pentru ordonarea cozii de priorități
  affects      text[],                       -- {'D300:rd9','D394'}
  ai_explanation text,                       -- generat ulterior, separat de calcul
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open','approved','rejected','verified','resolved_by_reimport')),
  fingerprint  text NOT NULL,                -- aceeași problemă la o nouă rulare = același fingerprint
  FOREIGN KEY (rule_id, rule_version) REFERENCES rules(id, version)
);
CREATE INDEX ON findings (tenant_id, status, severity);

CREATE TABLE finding_sources (
  id           bigserial PRIMARY KEY,
  tenant_id    uuid NOT NULL,
  finding_id   uuid NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  source_type  text NOT NULL CHECK (source_type IN ('tb_line','journal_entry','bank_transaction','invoice','source_file','prior_period')),
  source_id    text NOT NULL,
  label        text NOT NULL,                -- 'Jurnal cumpărări rd. 112'
  file_page    int
);

CREATE TABLE proposals (                    -- note contabile propuse (corecții, reconciliere, generator)
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  company_id   uuid NOT NULL REFERENCES companies(id),
  period_id    uuid NOT NULL REFERENCES periods(id),
  origin       text NOT NULL CHECK (origin IN ('finding','reconciliation','generator')),
  finding_id   uuid REFERENCES findings(id),
  prompt_text  text,                          -- textul contabilului, pentru generator
  entry_date   date NOT NULL,
  assumptions  jsonb NOT NULL DEFAULT '[]',
  checks       jsonb NOT NULL DEFAULT '[]',   -- lista „de verificat”
  vat_treatment text,
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','rejected','exported')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE proposal_lines (
  id           bigserial PRIMARY KEY,
  tenant_id    uuid NOT NULL,
  proposal_id  uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  debit_account text NOT NULL,
  credit_account text NOT NULL,
  amount       numeric(18,2) NOT NULL,
  description  text NOT NULL
);

CREATE TABLE approvals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  subject_type text NOT NULL CHECK (subject_type IN ('finding','proposal','match')),
  subject_id   uuid NOT NULL,
  decision     text NOT NULL CHECK (decision IN ('approved','rejected','verified')),
  reason       text,
  decided_by   uuid NOT NULL REFERENCES users(id),
  decided_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE posting_memory (               -- memoria de contare a firmei
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  partner_cui  text,
  keywords     text[],
  expense_account text NOT NULL,
  vat_rate     numeric(5,2),
  vat_deductible_pct numeric(5,2) NOT NULL DEFAULT 100,
  times_confirmed int NOT NULL DEFAULT 1,
  last_used_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE export_batches (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  company_id   uuid NOT NULL REFERENCES companies(id),
  target       text NOT NULL CHECK (target IN ('saga_xml','winmentor_txt','smartbill_api','csv')),
  storage_key  text,
  created_by   uuid NOT NULL REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE export_items (
  batch_id     uuid NOT NULL REFERENCES export_batches(id) ON DELETE CASCADE,
  tenant_id    uuid NOT NULL,
  proposal_id  uuid NOT NULL REFERENCES proposals(id),
  PRIMARY KEY (batch_id, proposal_id)
);

-- ---------------------------------------------------------------
-- Copilot
-- ---------------------------------------------------------------
CREATE TABLE ai_conversations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  company_id   uuid REFERENCES companies(id),
  period_id    uuid REFERENCES periods(id),
  user_id      uuid NOT NULL REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ai_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  conversation_id uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role         text NOT NULL CHECK (role IN ('user','assistant','tool')),
  content      text NOT NULL,
  tool_name    text,
  numeric_guard text CHECK (numeric_guard IN ('passed','failed','not_applicable')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ai_citations (
  message_id   uuid NOT NULL REFERENCES ai_messages(id) ON DELETE CASCADE,
  tenant_id    uuid NOT NULL,
  source_type  text NOT NULL,
  source_id    text NOT NULL,
  label        text NOT NULL,
  PRIMARY KEY (message_id, source_type, source_id)
);

-- ---------------------------------------------------------------
-- Pistă de audit (append-only)
-- ---------------------------------------------------------------
CREATE TABLE audit_log (
  id           bigserial PRIMARY KEY,
  tenant_id    uuid NOT NULL,
  actor_id     uuid REFERENCES users(id),
  action       text NOT NULL,                -- 'import.created', 'finding.approved', 'export.downloaded'
  subject_type text NOT NULL,
  subject_id   text NOT NULL,
  details      jsonb NOT NULL DEFAULT '{}',
  ip           inet,
  at           timestamptz NOT NULL DEFAULT now()
);
REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;

-- ---------------------------------------------------------------
-- Integritate: o propunere trebuie să fie echilibrată la aprobare
-- ---------------------------------------------------------------
CREATE FUNCTION check_proposal_lines() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'approved' AND NOT EXISTS (SELECT 1 FROM proposal_lines WHERE proposal_id = NEW.id) THEN
    RAISE EXCEPTION 'Propunerea % nu are rânduri', NEW.id;
  END IF;
  IF NEW.status = 'approved' AND EXISTS (
       SELECT 1 FROM proposal_lines WHERE proposal_id = NEW.id AND (debit_account = credit_account OR amount = 0)) THEN
    RAISE EXCEPTION 'Propunerea % are rânduri invalide', NEW.id;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER proposals_check BEFORE UPDATE OF status ON proposals
  FOR EACH ROW EXECUTE FUNCTION check_proposal_lines();
-- Notă: fiecare rând are debit și credit, deci totalul debit = total credit prin construcție.

-- ---------------------------------------------------------------
-- Row-Level Security pe toate tabelele cu tenant_id
-- Aplicația setează la fiecare tranzacție: SET LOCAL app.tenant_id = '<uuid>';
-- ---------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'tenant_id'
      AND table_name NOT IN ('memberships')
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY tenant_isolation ON %I
      USING (tenant_id = current_setting('app.tenant_id')::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid)$p$, t);
  END LOOP;
END $$;

-- Excepție: tabelul tenants folosește id, nu tenant_id
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_self ON tenants USING (id = current_setting('app.tenant_id')::uuid);

-- ---------------------------------------------------------------
-- Parametri legali inițiali (de validat cu expertul contabil)
-- ---------------------------------------------------------------
INSERT INTO legal_parameters (key, value, valid_from, valid_to, legal_ref) VALUES
  ('vat.standard',          19,   '2017-01-01', '2025-07-31', 'Cod fiscal art. 291'),
  ('vat.standard',          21,   '2025-08-01', NULL,         'Legea 141/2025'),
  ('vat.reduced',           11,   '2025-08-01', NULL,         'Legea 141/2025'),
  ('cash.limit.pj.day',     5000, '2015-04-15', NULL,         'Legea 70/2015'),
  ('fixed_asset.threshold', 2500, '2016-01-01', NULL,         'HG 2139/2004, Cod fiscal art. 7'),
  ('payroll.cas',           25,   '2018-01-01', NULL,         'Cod fiscal art. 138'),
  ('payroll.cass',          10,   '2018-01-01', NULL,         'Cod fiscal art. 156'),
  ('payroll.cam',           2.25, '2018-01-01', NULL,         'Cod fiscal art. 220^3'),
  ('payroll.income_tax',    10,   '2018-01-01', NULL,         'Cod fiscal art. 64');
