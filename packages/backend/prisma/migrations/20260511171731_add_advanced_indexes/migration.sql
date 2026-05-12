-- Install required PostgreSQL extensions
-- These must be in the migration so Prisma's shadow database has them too
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- rest of your existing migration SQL follows below...

-- ─────────────────────────────────────────────────────────────────────────────
-- GIN Index for Full-Text Search on Titles
-- Why GIN and not B-Tree?
-- B-Tree indexes work on single column values.
-- GIN (Generalised Inverted Index) indexes individual lexemes in a text vector.
-- "Attack on Titan" → {attack, titan} → GIN stores which titles contain each word
-- This powers: WHERE search_vector @@ to_tsquery('attack & titan')
-- Speed: O(log n) per lexeme lookup, same as B-Tree but on text tokens.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "idx_titles_search_vector_gin"
    ON "titles" USING GIN ("search_vector");

-- Trigram index for fuzzy matching ("ataack" → "attack")
-- pg_trgm breaks strings into 3-character n-grams and indexes them.
-- Enables: WHERE title_en ILIKE '%ataack%' to use the index.

CREATE INDEX IF NOT EXISTS "idx_titles_title_en_trgm"
    ON "titles" USING GIN ("title_en" gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK Constraint for Friendship Bidirectional Uniqueness
-- Ensures the "smaller" UUID is always the requester.
-- This prevents (user_A, user_B) and (user_B, user_A) from both existing.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "friendships"
    ADD CONSTRAINT "friendship_canonical_order"
    CHECK ("requester_id" < "addressee_id");

-- ─────────────────────────────────────────────────────────────────────────────
-- Partial Index for Active Library Entries
-- Only indexes entries that are currently being tracked (not completed/dropped).
-- Smaller index = faster inserts + smaller memory footprint.
-- Perfect for: "find all currently reading entries" dashboard query.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "idx_library_entries_active"
    ON "library_entries" ("user_id", "updated_at")
    WHERE "status" IN ('reading', 'on_hold');

-- ─────────────────────────────────────────────────────────────────────────────
-- Search Vector Trigger
-- Automatically updates search_vector when title_en, title_romaji, or synopsis changes.
-- Without this trigger, search_vector would be stale after any title update.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_title_search_vector()
RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        -- English title gets highest weight (A), synopsis lowest (C)
        setweight(to_tsvector('english', COALESCE(NEW.title_en,'')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.title_romaji,'')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.synopsis,'')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_title_search_vector
    BEFORE INSERT OR UPDATE OF title_en, title_romaji, synopsis
    ON titles
    FOR EACH ROW
    EXECUTE FUNCTION update_title_search_vector();