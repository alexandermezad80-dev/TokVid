---
name: Mobile Supabase SQL convention
description: Where the Tokvid mobile app's Postgres schema lives and how it is applied.
---
The Tokvid mobile app (artifacts/mobile) keeps all Supabase schema as plain SQL files in `artifacts/mobile/supabase/*.sql` (setup.sql, notifications.sql, follows.sql, new-tables.sql).

**How to apply:** these are NOT auto-migrated. The user runs them manually in the Supabase SQL editor. When adding tables/policies/functions, append to the relevant existing file and make statements re-runnable where practical (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY`, `CREATE OR REPLACE FUNCTION`). Then tell the user to run the SQL.

**Why:** there is no migration tooling wired up; schema changes only take effect once the user pastes them into Supabase.
