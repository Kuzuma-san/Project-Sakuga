-- ─────────────────────────────────────────────────────────────────────────────
-- SAKUGA — PostgreSQL Initialization Script
-- Runs ONCE on container first creation (before any Prisma migrations)
-- It installs the PostgreSQL extensions our application needs.
-- ─────────────────────────────────────────────────────────────────────────────

-- UUID generation (used by Prisma @default(uuid()))
-- pgcrypto provides gen_random_uuid() — the V4 UUID standard
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Full-text search support (used in Phase 3 for title search)
-- pg_trgm provides trigram similarity for fuzzy search
-- Trigram index for fuzzy search ("ataack on titan" → "Attack on Titan")
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- unaccent removes accents for better search
-- Searching "naruto" finds "Naruto" even with accent differences
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Full-text search improvements (used by GIN indexes on title search)
-- Already installed by default, but explicit declaration documents intent