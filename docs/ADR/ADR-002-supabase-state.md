# ADR-002 — Supabase as Central Persistent State

**Date:** Phase 0  
**Status:** Accepted

## Context

Tillu needs a persistent state layer that stores student data, events, mastery, revision, and agent health. Infrastructure budget is ₹0/month.

Options considered:
1. Self-hosted PostgreSQL
2. PlanetScale (MySQL)
3. Firebase Firestore
4. Supabase (PostgreSQL + Auth + RLS + Realtime)
5. MongoDB Atlas

## Decision

**Supabase** as the single persistent state layer for all application state.

## Reasons

- Free tier includes: 500MB database, Auth, Row Level Security, Realtime subscriptions, Edge Functions, Storage.
- PostgreSQL gives full SQL power — joins, aggregations, window functions needed for mastery calculation and revision analytics.
- Built-in Auth eliminates a separate auth service.
- RLS means authorization is enforced at the database level, not just application level.
- Realtime subscriptions enable live dashboard updates without polling.
- Standard PostgreSQL SQL means migrations can target any Postgres if we ever migrate.
- Supabase CLI enables local development with `supabase start`.

## Tradeoffs

- Vendor dependency on Supabase hosting. Mitigated by using standard PostgreSQL SQL in all migrations.
- Free tier limits: 500MB storage, 50,000 monthly active users, 2GB bandwidth. Sufficient for MVP.
- Supabase can sleep on free tier (infrequently accessed projects). Mitigated by scheduled keep-alive pings and the local agent.

## Constraints

- `SUPABASE_SERVICE_ROLE_KEY` is NEVER exposed to the browser or frontend.
- All frontend DB access goes through the Supabase `anon` key with RLS.
- Every table has RLS policies enabling `student_id = auth.uid()` isolation.
- n8n and agents use service-role only for operations they are explicitly authorized for.

## Consequences

- All migrations are in `supabase/migrations/` as ordered SQL files.
- `packages/database` exports a typed Supabase client + query functions.
- No agent or service accesses the database outside of `packages/database` abstractions.
