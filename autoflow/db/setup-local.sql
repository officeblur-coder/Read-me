-- Rulează o singură dată, ca superuser PostgreSQL, pentru mediul local de dezvoltare.
-- În producție rolurile se creează din consola furnizorului, cu parole generate și păstrate în secret manager.
--   sudo -u postgres psql -f db/setup-local.sql
CREATE ROLE autoflow_owner LOGIN PASSWORD 'autoflow_owner_dev';
-- Rolul aplicației: nu deține tabelele, nu are BYPASSRLS → politicile RLS se aplică întotdeauna.
CREATE ROLE autoflow_app LOGIN PASSWORD 'autoflow_app_dev' NOSUPERUSER NOBYPASSRLS;
CREATE DATABASE autoflow OWNER autoflow_owner;
CREATE DATABASE autoflow_test OWNER autoflow_owner;
\c autoflow
CREATE EXTENSION IF NOT EXISTS pgcrypto;
\c autoflow_test
CREATE EXTENSION IF NOT EXISTS pgcrypto;
