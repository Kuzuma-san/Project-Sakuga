-- ─────────────────────────────────────────────────────────────────────────────
-- SAKUGA — PostgreSQL Initialization Script
-- Runs ONCE on container first creation (before any Prisma migrations)
-- ─────────────────────────────────────────────────────────────────────────────

-- UUID generation (used by Prisma @default(uuid()))
-- pgcrypto provides gen_random_uuid() — the V4 UUID standard
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Full-text search support (used in Phase 3 for title search)
-- pg_trgm provides trigram similarity for fuzzy search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- unaccent removes accents for better search
-- Searching "naruto" finds "Naruto" even with accent differences
CREATE EXTENSION IF NOT EXISTS "unaccent";