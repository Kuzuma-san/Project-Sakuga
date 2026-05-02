# Phase 0 — The Portable Environment
## The Definitive "It Works on Every Machine" Setup Guide for Project Sakuga

> **The rule this entire document enforces:**
> A developer — or future you on a new device — must be able to clone this repo, run two commands, and have a fully working development environment. No tribal knowledge. No "oh you also need to install X." No version mismatches. No mystery.

---

## Table of Contents

1. [Why Projects Break When You Change Devices](#1-why-projects-break-when-you-change-devices)
2. [What This Guide Protects Against](#2-what-this-guide-protects-against)
3. [Prerequisites — The Only Manual Step](#3-prerequisites--the-only-manual-step)
4. [Step 0.1 — Pin Your Node Version with `.nvmrc`](#4-step-01--pin-your-node-version-with-nvmrc)
5. [Step 0.2 — Root `package.json` with `engines` + Lockfile Enforcement](#5-step-02--root-packagejson-with-engines--lockfile-enforcement)
6. [Step 0.3 — The `.env.example` Contract](#6-step-03--the-envexample-contract)
7. [Step 0.4 — Docker Compose for Infrastructure](#7-step-04--docker-compose-for-infrastructure)
8. [Step 0.5 — The `.gitignore` — What Must Never Be Committed](#8-step-05--the-gitignore--what-must-never-be-committed)
9. [Step 0.6 — The `Makefile` — One-Command Setup](#9-step-06--the-makefile--one-command-setup)
10. [Step 0.7 — NestJS Startup Environment Validation](#10-step-07--nestjs-startup-environment-validation)
11. [Step 0.8 — The `README.md` — The Entry Point](#11-step-08--the-readmemd--the-entry-point)
12. [Step 0.9 — Verify Portability Before Writing Phase 1 Code](#12-step-09--verify-portability-before-writing-phase-1-code)
13. [The Complete File Checklist](#13-the-complete-file-checklist)
14. [Troubleshooting Reference](#14-troubleshooting-reference)

---

## 1. Why Projects Break When You Change Devices

Before following any steps, understand the three distinct layers that cause "works on my machine" failures. Each layer needs its own fix. Most developers only fix one.

### Layer 1 — Runtime Version Mismatch

Your machine has Node 20.14.0. A new machine installs Node 22.x. Between those two versions, certain APIs changed, certain behaviors shifted, and certain third-party packages behave differently. The project crashes — or worse, silently behaves wrong — in ways that have nothing to do with your code.

Same applies to `pnpm`. Version 8 and version 9 have different lockfile formats. If you install with pnpm 8 and someone else installs with pnpm 9, the lockfile changes on every install, dependency resolution diverges, and you spend hours debugging something that is not a bug.

**Fix: pin exact runtime versions in `.nvmrc` and `engines` field.**

### Layer 2 — Dependency Version Drift

`package.json` uses range syntax. `"express": "^4.18.0"` means "anything from 4.18.0 up to but not including 5.0.0." Today the newest match is 4.18.2. In three months it's 4.21.0. These two versions may have breaking changes in behavior even though semver says they shouldn't.

The lockfile (`pnpm-lock.yaml`) solves this — it records the *exact resolved version* of every dependency, including dependencies of dependencies. But if someone deletes it, or it gets gitignored, or someone runs `npm install` instead of `pnpm install`, the lockfile either disappears or gets corrupted.

**Fix: always commit the lockfile, enforce pnpm-only installs.**

### Layer 3 — Infrastructure Version and Configuration Mismatch

Your Postgres is 15.2. You install 16.3 on a new machine. A migration that ran on 15.2 may not behave identically on 16.3. Your Redis is 6.x, but you pull 7.x and a certain command behaves differently. Kafka 3.4 vs 3.6 — different default configurations.

Worse: environment variables. On your machine you set `JWT_SECRET` in your shell profile and forgot. On a new machine it's undefined. The app crashes at runtime deep inside some auth flow, not at startup with a clear error.

**Fix: Docker Compose with pinned image versions, `.env.example` with all required keys documented, startup validation that crashes loudly if any key is missing.**

---

## 2. What This Guide Protects Against

This table maps every failure mode from the real world to the specific file in this guide that prevents it.

| Failure Mode | Prevented By |
|---|---|
| Wrong Node version | `.nvmrc` + `engines` in `package.json` |
| Wrong pnpm version | `engines` + `preinstall` script |
| Someone uses `npm install` instead of `pnpm` | `preinstall` script with `only-allow pnpm` |
| Dependency versions drift over time | `pnpm-lock.yaml` committed to git |
| Lockfile deleted or gitignored | `.gitignore` rules + this guide |
| Wrong Postgres version | Docker Compose with pinned `postgres:16-alpine` |
| Wrong Redis version | Docker Compose with pinned `redis:7.2-alpine` |
| Wrong Kafka version | Docker Compose with pinned `confluentinc/cp-kafka:7.5.0` |
| Missing environment variable crashes at runtime | NestJS startup validation via `class-validator` |
| `.env` committed to git (secret leak) | `.gitignore` + `.env.example` pattern |
| No one knows what env vars are needed | `.env.example` documents every key |
| New developer doesn't know setup order | `Makefile` with `make setup` |
| New developer doesn't know what tools to install | `README.md` prerequisites section |
| `pnpm-lock.yaml` drifts between OS line endings | `.gitattributes` with `text=auto` |
| Database state diverges between machines | Prisma migrations committed to git |
| Postgres extensions missing | `docker-entrypoint-initdb.d` init SQL |

---

## 3. Prerequisites — The Only Manual Step

These three tools must be installed manually on any machine before the project can be set up. There is no way around this — they are the bootstrapping layer. Document them clearly.

### 3.1 — Install `nvm` (Node Version Manager)

`nvm` lets you install and switch between multiple Node.js versions. It reads `.nvmrc` and automatically uses the correct version.

**macOS / Linux:**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Restart your terminal, then verify:
nvm --version
# Expected: 0.39.7 or higher
```

**Windows:**
Use [nvm-windows](https://github.com/coreybutler/nvm-windows/releases) — download and run the installer from the releases page. The commands are identical after installation.

**Why not just install Node directly?**
Direct installs tie your machine to one Node version globally. When Project Sakuga uses Node 20 and another project uses Node 18, they conflict. `nvm` lets both coexist.

---

### 3.2 — Install Docker Desktop

Docker Desktop gives you Docker Engine + Docker Compose. It is the only tool in this list that cannot be replaced.

- **macOS:** [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
- **Windows:** Same link. Enable WSL 2 backend when prompted.
- **Linux:** Install Docker Engine + Docker Compose plugin separately via your package manager.

After installing, verify:
```bash
docker --version
# Expected: Docker version 25.x or higher

docker compose version
# Expected: Docker Compose version v2.x or higher
```

> **Note:** Docker Desktop requires at least 4GB RAM allocated. On macOS, check Docker Desktop → Settings → Resources.

---

### 3.3 — Install `pnpm`

```bash
npm install -g pnpm@8

# Verify:
pnpm --version
# Expected: 8.x.x
```

Why pnpm 8 specifically? Phase 1 of this project targets pnpm 8.x and its workspace behavior. Pinning the major version prevents lockfile drift between machines.

---

## 4. Step 0.1 — Pin Your Node Version with `.nvmrc`

**Create this file at the root of the `sakuga/` directory:**

```
# sakuga/.nvmrc
20.14.0
```

That is the entire file. One line. The exact Node.js LTS version the entire project uses.

**Why this exact version?**
- Node 20 is the current LTS (Long Term Support) line — security patches until April 2026
- NestJS 10, React 18, Vite 5, and all packages in Phases 1–5 are tested against Node 20
- Node 22 (current) introduced changes to the `fs` module and `fetch` API that create subtle differences with some NestJS internals
- Node 18 is end-of-life

**How it works on a new machine:**
```bash
git clone <repo>
cd sakuga

# If nvm is installed, this single command reads .nvmrc and switches to Node 20.14.0:
nvm use

# If Node 20.14.0 is not yet installed on this machine:
nvm install
# nvm install reads .nvmrc automatically — no version argument needed

# Verify:
node --version
# Must show: v20.14.0
```

---

## 5. Step 0.2 — Root `package.json` with `engines` + Lockfile Enforcement

**Create `sakuga/package.json`:**

```json
{
  "name": "sakuga",
  "version": "1.0.0",
  "private": true,
  "engines": {
    "node": "20.14.0",
    "pnpm": ">=8.0.0 <9.0.0"
  },
  "scripts": {
    "preinstall": "npx only-allow pnpm",
    "dev": "pnpm --parallel --filter=!@repo/types dev",
    "build": "pnpm --filter=@repo/types build && pnpm --parallel --filter=!@repo/types build",
    "lint": "pnpm -r lint",
    "format": "prettier --write \"**/*.{ts,tsx,json,md,css}\"",
    "typecheck": "pnpm -r typecheck",
    "db:generate": "pnpm --filter=@repo/backend db:generate",
    "db:migrate": "pnpm --filter=@repo/backend db:migrate",
    "db:migrate:prod": "pnpm --filter=@repo/backend db:migrate:prod",
    "db:studio": "pnpm --filter=@repo/backend db:studio",
    "db:seed": "pnpm --filter=@repo/backend db:seed",
    "db:reset": "pnpm --filter=@repo/backend db:reset"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.57.0",
    "eslint-plugin-react": "^7.34.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "prettier": "^3.2.0",
    "typescript": "^5.4.0"
  }
}
```

**What each protection does:**

**`"engines": { "node": "20.14.0" }`**
When someone runs `pnpm install` with a different Node version, pnpm prints a warning. To make it a hard error (blocks install entirely), add this to `package.json`:
```json
{
  "pnpm": {
    "engine-strict": true
  }
}
```
With `engine-strict: true`, running `pnpm install` on Node 18 fails with:
```
ERR_PNPM_UNSUPPORTED_ENGINE  Unsupported environment (bad pnpm version or Node.js version)
```
This is the behavior we want.

**`"preinstall": "npx only-allow pnpm"`**
This script runs automatically *before* any `npm install` or `yarn install` command. `only-allow pnpm` immediately exits with an error if the package manager is not pnpm:
```
Use "pnpm install" for installation in this project.
```
This prevents lockfile corruption from mixed package managers — the most common cause of "it works on my machine but not yours."

---

### 5.1 — The Lockfile Rule

The `pnpm-lock.yaml` file that pnpm generates is the single most important file for reproducibility. It records the exact resolved version of every package in the entire dependency tree.

**The rules are absolute:**

```
✅ ALWAYS commit pnpm-lock.yaml
✅ ALWAYS commit pnpm-lock.yaml when it changes (it means deps changed — review it)
❌ NEVER add pnpm-lock.yaml to .gitignore
❌ NEVER delete pnpm-lock.yaml and re-run pnpm install to "fix things"
❌ NEVER run npm install or yarn install — they produce npm/yarn lockfiles
   that conflict with pnpm-lock.yaml
```

When the lockfile changes in a commit, that means dependency versions changed. That should be a conscious, reviewed decision — not a silent accident caused by a teammate running the wrong package manager.

---

### 5.2 — Create `.gitattributes` to Prevent Line Ending Issues

On Windows, git can convert line endings in the lockfile from LF to CRLF. This causes the lockfile to appear changed on every Windows machine, creating constant noise in git diffs and potential merge conflicts.

**Create `sakuga/.gitattributes`:**

```gitattributes
# Default: auto-detect text files and normalize line endings
* text=auto

# Lockfiles must stay exactly as committed — no line ending conversion
pnpm-lock.yaml text eol=lf
*.json text eol=lf
*.ts text eol=lf
*.tsx text eol=lf
*.md text eol=lf

# Binary files — never touch
*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.ico binary
*.woff2 binary
*.woff binary
```

---

## 6. Step 0.3 — The `.env.example` Contract

Every environment variable the application needs must be documented in `.env.example`. This file is committed to git. The actual `.env` file with real values is never committed.

This is a **contract**: anyone pulling the repo can look at `.env.example` and know exactly what they need to configure.

**Create `sakuga/.env.example`:**

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# SAKUGA — ENVIRONMENT VARIABLES
# ═══════════════════════════════════════════════════════════════════════════════
# HOW TO USE:
#   cp .env.example .env
#   Fill in all values marked CHANGE_ME
#   Values with defaults are safe to use as-is for local development
#
# NEVER commit the .env file. It is in .gitignore.
# ALWAYS commit changes to this .env.example file.
# ═══════════════════════════════════════════════════════════════════════════════

# ─── DATABASE ──────────────────────────────────────────────────────────────────
# Used by Prisma when running on your host machine (migrations, Prisma Studio)
# Connects to the Dockerized Postgres via localhost
DATABASE_URL=postgresql://sakuga_user:sakuga_dev_password@localhost:5432/sakuga_db

# Used by the NestJS backend running inside Docker (service-to-service)
# Uses the Docker network hostname 'postgres' instead of 'localhost'
# ONLY needed if you run the backend in Docker (not needed for host-machine dev)
DATABASE_URL_INTERNAL=postgresql://sakuga_user:sakuga_dev_password@postgres:5432/sakuga_db

# ─── REDIS ─────────────────────────────────────────────────────────────────────
# Used by NestJS (BullMQ, cache, rate limiting, presence, Socket.io adapter)
REDIS_URL=redis://:sakuga_redis_password@localhost:6379

# ─── KAFKA ─────────────────────────────────────────────────────────────────────
# Used by kafkajs producer/consumer in NestJS
KAFKA_BROKER=localhost:9092
KAFKA_CLIENT_ID=sakuga-backend
KAFKA_GROUP_ID=sakuga-consumer-group

# ─── JWT (Authentication) ──────────────────────────────────────────────────────
# Generate with: openssl rand -base64 48
# Must be at least 32 characters. Use different values for each secret.
JWT_SECRET=CHANGE_ME_MINIMUM_32_CHARS_USE_openssl_rand_base64_48
JWT_REFRESH_SECRET=CHANGE_ME_DIFFERENT_FROM_JWT_SECRET_USE_openssl_rand_base64_48
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ─── CORS / URLS ───────────────────────────────────────────────────────────────
# Where the frontend runs (used by NestJS for CORS headers)
FRONTEND_URL=http://localhost:3000

# Where the backend API runs (used by the frontend for API calls)
# Must be prefixed with VITE_ so Vite exposes it to the browser bundle
VITE_API_URL=http://localhost:3001

# ─── JIKAN API ─────────────────────────────────────────────────────────────────
# No API key required. Rate limit: 3 requests/second, 60/minute.
JIKAN_API_URL=https://api.jikan.moe/v4

# Rate limit values — tune if Jikan changes their limits
JIKAN_RATE_LIMIT_MAX=3
JIKAN_RATE_LIMIT_DURATION_MS=1100

# ─── ANILIST API ───────────────────────────────────────────────────────────────
# No API key required for public queries. Rate limit: 90 requests/minute.
ANILIST_API_URL=https://graphql.anilist.co

# ─── ANTHROPIC AI (Phase 4) ────────────────────────────────────────────────────
# Get from: https://console.anthropic.com
# Leave empty to disable AI features during development
ANTHROPIC_API_KEY=CHANGE_ME_OR_LEAVE_EMPTY_TO_DISABLE_AI

# ─── NODE ENVIRONMENT ──────────────────────────────────────────────────────────
NODE_ENV=development

# ─── BACKEND PORT ──────────────────────────────────────────────────────────────
PORT=3001

# ─── BULL BOARD (Queue UI — development only) ──────────────────────────────────
# Accessible at http://localhost:3001/queues in development
BULL_BOARD_USERNAME=admin
BULL_BOARD_PASSWORD=CHANGE_ME_FOR_STAGING_AND_PROD

# ─── BCRYPT ────────────────────────────────────────────────────────────────────
# Higher = more secure but slower. 12 is the production-safe minimum.
BCRYPT_SALT_ROUNDS=12
```

**After creating `.env.example`, create the actual `.env` for local development:**

```bash
cp .env.example .env
```

Then open `.env` and replace every `CHANGE_ME` value:

```bash
# Generate JWT secrets — run this command, copy the output into .env
openssl rand -base64 48
# Run it twice — you need two different values (JWT_SECRET and JWT_REFRESH_SECRET)
```

For local dev, the database and Redis credentials in `.env.example` already match what Docker Compose will create. You only need to change the `CHANGE_ME` values.

---

## 7. Step 0.4 — Docker Compose for Infrastructure

Docker Compose defines the entire infrastructure layer — Postgres, Redis, Kafka — as code. Every developer gets the exact same versions, the exact same configuration, with one command.

### 7.1 — Create the Postgres Init Script

This script runs once when the Postgres container is first created. It installs the PostgreSQL extensions Sakuga requires before Prisma runs its first migration.

**Create `sakuga/docker/postgres/init.sql`:**

```sql
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
```

**Why do this here instead of in a Prisma migration?**
Prisma migrations run as the application user (`sakuga_user`). Installing PostgreSQL extensions requires superuser privileges. The Docker init script runs as the Postgres superuser (`postgres`) during container initialization — the only time we have those privileges in a controlled, reproducible way.

---

### 7.2 — Create `docker-compose.yml`

**Create `sakuga/docker-compose.yml`:**

```yaml
# ═══════════════════════════════════════════════════════════════════════════════
# SAKUGA — Docker Compose Development Infrastructure
# ═══════════════════════════════════════════════════════════════════════════════
# Services: PostgreSQL 16, Redis 7.2, Zookeeper, Kafka 7.5
# Start:    docker compose up -d
# Stop:     docker compose down
# Wipe:     docker compose down -v   (removes volumes — ALL DATA GONE)
# ═══════════════════════════════════════════════════════════════════════════════

services:

  # ─── POSTGRESQL ─────────────────────────────────────────────────────────────
  postgres:
    image: postgres:16-alpine
    # alpine = minimal Linux base — smaller image, faster pull
    # 16 = PostgreSQL major version (matches Phase 1 schema design)
    container_name: sakuga_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: sakuga_user
      POSTGRES_PASSWORD: sakuga_dev_password
      POSTGRES_DB: sakuga_db
      # Performance tuning for development (not production defaults)
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=en_US.UTF-8"
    ports:
      # host:container — exposes to localhost for Prisma Studio, pgAdmin, etc.
      - "5432:5432"
    volumes:
      # Named volume: data persists when container stops (survives `docker compose down`)
      # Data is ONLY deleted with `docker compose down -v`
      - postgres_data:/var/lib/postgresql/data
      # Init scripts: run once on first container creation, in alphabetical order
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sakuga_user -d sakuga_db"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s
    networks:
      - sakuga_network

  # ─── REDIS ──────────────────────────────────────────────────────────────────
  redis:
    image: redis:7.2-alpine
    # 7.2 = Redis major.minor version
    # Used for: BullMQ job queues, rate limiting, session cache,
    #           presence TTLs (Phase 5), Socket.io Redis adapter (Phase 5)
    container_name: sakuga_redis
    restart: unless-stopped
    command: >
      redis-server
      --requirepass sakuga_redis_password
      --appendonly yes
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
    # --requirepass: Redis with no password is a serious security risk
    # --appendonly yes: AOF persistence — Redis writes every command to disk
    #   Without this, a container restart loses ALL data (queued jobs, cache, etc.)
    # --maxmemory 256mb: prevents Redis from consuming all host RAM in development
    # --maxmemory-policy allkeys-lru: when full, evict least recently used keys
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "sakuga_redis_password", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 5s
    networks:
      - sakuga_network

  # ─── ZOOKEEPER ──────────────────────────────────────────────────────────────
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    # Zookeeper coordinates Kafka brokers: leader election, consumer group offsets,
    # broker metadata. Required by Kafka (used in Phases 3 and 4).
    # Kafka 3.3+ supports KRaft mode (no Zookeeper) but Confluent 7.5 with
    # Zookeeper is more stable for local development.
    container_name: sakuga_zookeeper
    restart: unless-stopped
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
      ZOOKEEPER_LOG4J_ROOT_LOGLEVEL: WARN
    volumes:
      - zookeeper_data:/var/lib/zookeeper/data
      - zookeeper_logs:/var/lib/zookeeper/log
    networks:
      - sakuga_network
    healthcheck:
      test: ["CMD-SHELL", "nc -z localhost 2181"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  # ─── KAFKA ──────────────────────────────────────────────────────────────────
  kafka:
    image: confluentinc/cp-kafka:7.5.0
    # Kafka is used as the event bus for:
    # - library.entry.created / updated (Phase 3)
    # - user.activity.created (Phase 4 fan-out processor)
    # - analytics events (Phase 4)
    container_name: sakuga_kafka
    restart: unless-stopped
    depends_on:
      zookeeper:
        condition: service_healthy
    ports:
      # 9092: accessible from your host machine (used by NestJS running on host)
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      # Two listener configs:
      # PLAINTEXT — used by services inside the Docker network (container-to-container)
      # PLAINTEXT_HOST — used from your host machine (localhost:9092)
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      # Development: auto-create topics (Phase 3 creates them explicitly, but this
      # prevents startup errors if topics are referenced before creation)
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
      KAFKA_LOG4J_ROOT_LOGLEVEL: WARN
      KAFKA_LOG4J_LOGGERS: "kafka=WARN,kafka.controller=WARN,kafka.log.LogCleaner=WARN,state.change.logger=WARN,kafka.producer.async.DefaultEventHandler=WARN"
      # Reduce log retention for development (default 7 days is excessive)
      KAFKA_LOG_RETENTION_HOURS: 24
    volumes:
      - kafka_data:/var/lib/kafka/data
    networks:
      - sakuga_network
    healthcheck:
      test: ["CMD-SHELL", "kafka-broker-api-versions --bootstrap-server localhost:9092"]
      interval: 15s
      timeout: 10s
      retries: 10
      start_period: 30s

# ─── VOLUMES ──────────────────────────────────────────────────────────────────
# Named volumes persist data between `docker compose stop/start`.
# They are removed only with `docker compose down -v`.
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  zookeeper_data:
    driver: local
  zookeeper_logs:
    driver: local
  kafka_data:
    driver: local

# ─── NETWORK ──────────────────────────────────────────────────────────────────
# A dedicated bridge network so services can reach each other by service name.
# postgres:5432, redis:6379, kafka:29092 are the hostnames inside this network.
networks:
  sakuga_network:
    driver: bridge
```

### 7.3 — Verify Docker Compose Works

After creating the file, run:

```bash
# Start all services in detached mode (background)
docker compose up -d

# Watch the startup — wait until all containers show "healthy" or "running"
docker compose ps

# Expected output:
# NAME                  STATUS                    PORTS
# sakuga_postgres       running (healthy)         0.0.0.0:5432->5432/tcp
# sakuga_redis          running (healthy)         0.0.0.0:6379->6379/tcp
# sakuga_zookeeper      running (healthy)
# sakuga_kafka          running (healthy)         0.0.0.0:9092->9092/tcp

# Test Postgres:
docker exec -it sakuga_postgres psql -U sakuga_user -d sakuga_db -c "SELECT version();"
# Expected: PostgreSQL 16.x ...

# Test Redis:
docker exec -it sakuga_redis redis-cli -a sakuga_redis_password ping
# Expected: PONG

# Test Kafka:
docker exec -it sakuga_kafka kafka-broker-api-versions --bootstrap-server localhost:9092 2>&1 | head -3
# Expected: no errors
```

---

## 8. Step 0.5 — The `.gitignore` — What Must Never Be Committed

**Create `sakuga/.gitignore`:**

```gitignore
# ═══════════════════════════════════════════════════════════════════════════════
# SAKUGA — .gitignore
# ═══════════════════════════════════════════════════════════════════════════════

# ─── ENVIRONMENT ─────────────────────────────────────────────────────────────
# CRITICAL: Never commit real env files. They contain secrets.
# If you accidentally commit .env, the secret is compromised immediately.
# Rotate all secrets in that file immediately if this happens.
.env
.env.local
.env.*.local
# Exception: .env.example IS committed — it is the contract, not the secrets

# ─── DEPENDENCIES ────────────────────────────────────────────────────────────
node_modules/
.pnpm-store/
# NOTE: pnpm-lock.yaml is NOT here — it MUST be committed
# NOTE: package-lock.json and yarn.lock ARE here — wrong package managers
package-lock.json
yarn.lock

# ─── BUILD OUTPUTS ───────────────────────────────────────────────────────────
dist/
build/
.next/
.turbo/

# ─── PRISMA GENERATED CLIENT ─────────────────────────────────────────────────
# Generated by `prisma generate` — never commit, always regenerate
packages/backend/src/generated/
packages/backend/generated/

# ─── TEST COVERAGE ───────────────────────────────────────────────────────────
coverage/
.nyc_output/

# ─── LOGS ────────────────────────────────────────────────────────────────────
*.log
logs/
npm-debug.log*
pnpm-debug.log*

# ─── OS FILES ────────────────────────────────────────────────────────────────
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# ─── IDE ─────────────────────────────────────────────────────────────────────
# Commit .vscode/extensions.json (recommended extensions) but NOT settings
.vscode/settings.json
.vscode/launch.json
.idea/
*.swp
*.swo

# ─── MISC ────────────────────────────────────────────────────────────────────
.cache/
tmp/
temp/
```

---

## 9. Step 0.6 — The `Makefile` — One-Command Setup

The `Makefile` captures the setup sequence as executable documentation. Instead of a README that says "run these 7 commands in this specific order," there is one command that does all of it.

**Create `sakuga/Makefile`:**

```makefile
# ═══════════════════════════════════════════════════════════════════════════════
# SAKUGA — Makefile
# ═══════════════════════════════════════════════════════════════════════════════
# Usage:
#   make setup    — First-time setup on a new machine
#   make start    — Start development (infrastructure + dev servers)
#   make stop     — Stop infrastructure (data preserved)
#   make reset    — Wipe everything and start from scratch
#   make logs     — Tail infrastructure logs
#   make test-env — Verify environment is correctly configured
# ═══════════════════════════════════════════════════════════════════════════════

.PHONY: setup start stop reset logs test-env db-reset check-prerequisites

# ─── SETUP ───────────────────────────────────────────────────────────────────
# Run once on a new machine after cloning the repo
setup: check-prerequisites
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo " SAKUGA — First-time setup"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""

	@echo "→ Step 1/6: Setting up .env file..."
	@cp -n .env.example .env 2>/dev/null && echo "  ✓ .env created from .env.example" \
		|| echo "  ℹ .env already exists — skipping"

	@echo ""
	@echo "→ Step 2/6: Switching to correct Node version via nvm..."
	@bash -c 'source ~/.nvm/nvm.sh && nvm use' \
		|| (echo "  ✗ nvm not found or .nvmrc error" && exit 1)

	@echo ""
	@echo "→ Step 3/6: Installing dependencies..."
	pnpm install

	@echo ""
	@echo "→ Step 4/6: Starting infrastructure (Docker)..."
	docker compose up -d
	@echo "  Waiting for services to be healthy..."
	@sleep 5
	@bash -c 'for i in $$(seq 1 30); do \
		if docker compose ps | grep -q "healthy"; then \
			echo "  ✓ Services healthy"; break; \
		fi; \
		echo "  Waiting... ($$i/30)"; sleep 3; \
	done'

	@echo ""
	@echo "→ Step 5/6: Running database migrations..."
	pnpm db:migrate

	@echo ""
	@echo "→ Step 6/6: Generating Prisma client..."
	pnpm db:generate

	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo " ✅ Setup complete!"
	@echo ""
	@echo " IMPORTANT: Open .env and replace all CHANGE_ME values."
	@echo " Then run: make start"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ─── START ───────────────────────────────────────────────────────────────────
# Start infrastructure (if stopped) and run dev servers
start:
	@echo "→ Starting infrastructure..."
	docker compose up -d
	@sleep 3
	@echo "→ Starting dev servers..."
	pnpm dev

# ─── STOP ────────────────────────────────────────────────────────────────────
# Stop containers — data volumes are preserved
stop:
	@echo "→ Stopping infrastructure (data preserved)..."
	docker compose down
	@echo "✓ Stopped. Run 'make start' to resume."

# ─── RESET ───────────────────────────────────────────────────────────────────
# Nuclear option: wipe everything and rebuild from scratch
# Use when: dependencies are broken, DB is corrupt, things are truly broken
reset:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo " ⚠ RESET: This will DELETE all database data"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1

	@echo "→ Stopping and removing containers + volumes..."
	docker compose down -v

	@echo "→ Removing all node_modules..."
	rm -rf node_modules packages/backend/node_modules packages/frontend/node_modules packages/types/node_modules

	@echo "→ Removing build artifacts..."
	rm -rf packages/backend/dist packages/frontend/dist packages/frontend/.next packages/types/dist

	@echo "→ Reinstalling dependencies..."
	pnpm install

	@echo "→ Starting fresh infrastructure..."
	docker compose up -d
	@sleep 8

	@echo "→ Running migrations on fresh database..."
	pnpm db:migrate
	pnpm db:generate

	@echo "✅ Reset complete. Run 'make start'."

# ─── LOGS ────────────────────────────────────────────────────────────────────
logs:
	docker compose logs -f

# ─── DB RESET ────────────────────────────────────────────────────────────────
# Reset ONLY the database (keep Redis/Kafka running)
db-reset:
	@echo "→ Resetting database..."
	docker compose stop postgres
	docker compose rm -f postgres
	docker volume rm sakuga_postgres_data 2>/dev/null || true
	docker compose up -d postgres
	@sleep 5
	pnpm db:migrate
	pnpm db:generate
	@echo "✅ Database reset complete."

# ─── TEST ENV ────────────────────────────────────────────────────────────────
# Verify that all infrastructure is running and env vars are set
test-env:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo " SAKUGA — Environment Health Check"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

	@echo ""
	@echo "→ Node version:"
	@node --version

	@echo ""
	@echo "→ pnpm version:"
	@pnpm --version

	@echo ""
	@echo "→ Docker services:"
	@docker compose ps

	@echo ""
	@echo "→ PostgreSQL connection:"
	@docker exec sakuga_postgres psql -U sakuga_user -d sakuga_db -c "SELECT 'PostgreSQL OK' AS status;" 2>&1 | grep -E "(status|OK|ERROR)"

	@echo ""
	@echo "→ Redis connection:"
	@docker exec sakuga_redis redis-cli -a sakuga_redis_password ping

	@echo ""
	@echo "→ Checking .env file exists:"
	@test -f .env && echo "  ✓ .env exists" || echo "  ✗ .env missing — run: cp .env.example .env"

	@echo ""
	@echo "→ Checking for CHANGE_ME values in .env (should be 0):"
	@grep -c "CHANGE_ME" .env 2>/dev/null && echo "  ⚠ You still have CHANGE_ME values to replace" || echo "  ✓ No CHANGE_ME values found"

# ─── CHECK PREREQUISITES ─────────────────────────────────────────────────────
check-prerequisites:
	@echo "→ Checking prerequisites..."
	@command -v docker > /dev/null 2>&1 || (echo "✗ Docker not found. Install from https://docker.com" && exit 1)
	@command -v pnpm > /dev/null 2>&1 || (echo "✗ pnpm not found. Run: npm install -g pnpm@8" && exit 1)
	@echo "  ✓ All prerequisites found"
```

---

## 10. Step 0.7 — NestJS Startup Environment Validation

This is the piece most developers skip. Without it, a missing environment variable causes a cryptic runtime error deep inside the application. With it, the app crashes on startup with a clear, actionable message like:

```
Environment validation failed:
  JWT_SECRET is required and must be a non-empty string
  DATABASE_URL is required and must be a non-empty string
```

This is your first line of defence. The app refuses to start if the environment is wrong.

### 10.1 — Install Validation Dependencies

When you scaffold the backend in Phase 1, these will be in `packages/backend/package.json`. They are listed here so you know they are required:

```json
{
  "dependencies": {
    "@nestjs/config": "^3.0.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.0",
    "joi": "^17.0.0"
  }
}
```

### 10.2 — Create the Validation Schema

**Create `packages/backend/src/config/env.validation.ts`:**

```typescript
import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';

enum NodeEnvironment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  // ─── NODE ──────────────────────────────────────────────────────────────
  @IsEnum(NodeEnvironment)
  NODE_ENV: NodeEnvironment = NodeEnvironment.Development;

  @IsInt()
  @Min(1000)
  @Max(65535)
  PORT: number = 3001;

  // ─── DATABASE ──────────────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  // ─── REDIS ─────────────────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  REDIS_URL: string;

  // ─── KAFKA ─────────────────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  KAFKA_BROKER: string;

  @IsString()
  @IsNotEmpty()
  KAFKA_CLIENT_ID: string;

  @IsString()
  @IsNotEmpty()
  KAFKA_GROUP_ID: string;

  // ─── JWT ───────────────────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRY: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_EXPIRY: string;

  // ─── CORS / URLS ───────────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  FRONTEND_URL: string;

  // ─── EXTERNAL APIS ─────────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  JIKAN_API_URL: string;

  @IsString()
  @IsNotEmpty()
  ANILIST_API_URL: string;

  // ─── AI (optional in development) ──────────────────────────────────────
  @IsOptional()
  @IsString()
  ANTHROPIC_API_KEY?: string;

  // ─── BCRYPT ────────────────────────────────────────────────────────────
  @IsInt()
  @Min(10)
  @Max(15)
  BCRYPT_SALT_ROUNDS: number = 12;
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    // Convert string "3001" to number 3001 for @IsInt() fields
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    // Skip validating properties not defined in the class
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((error) => {
        const constraints = Object.values(error.constraints ?? {}).join(', ');
        return `  ${error.property}: ${constraints}`;
      })
      .join('\n');

    // This error message appears at startup — make it impossible to miss
    throw new Error(
      `\n\n🚫 ENVIRONMENT VALIDATION FAILED\n` +
      `══════════════════════════════════\n` +
      `${messages}\n` +
      `══════════════════════════════════\n` +
      `Check your .env file. Refer to .env.example for all required keys.\n`
    );
  }

  return validatedConfig;
}
```

### 10.3 — Wire Validation into NestJS `AppModule`

**In `packages/backend/src/app.module.ts`:**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,         // Available in every module without re-importing
      envFilePath: '.env',    // Load from .env file
      validate,               // Run our validation on startup — crashes if invalid
      cache: true,            // Cache env vars after first read
    }),
    // ... rest of your imports
  ],
})
export class AppModule {}
```

**What happens now:**

```bash
# Start the backend with JWT_SECRET missing from .env:
pnpm dev

# Output:
# 🚫 ENVIRONMENT VALIDATION FAILED
# ══════════════════════════════════
#   JWT_SECRET: JWT_SECRET should not be empty
# ══════════════════════════════════
# Check your .env file. Refer to .env.example for all required keys.
```

The application refuses to start. No cryptic `undefined` error three layers deep in auth middleware. Just a clear message telling you exactly what to fix.

---

## 11. Step 0.8 — The `README.md` — The Entry Point

The README is the first thing anyone reads. It must answer exactly three questions in under two minutes: what is this, what do I need, how do I run it.

**Create `sakuga/README.md`:**

```markdown
# Sakuga (作画)

A personal manga and anime tracker with social features, AI-powered insights, and real-time activity — built as a full-stack learning project.

**Tech stack:** NestJS · React · Vite · PostgreSQL · Redis · Kafka · Socket.io · Prisma · TypeScript · pnpm monorepo

---

## Prerequisites

Install these **before** cloning. They are the only manual setup required.

| Tool | Version | Install |
|------|---------|---------|
| nvm | Latest | [github.com/nvm-sh/nvm](https://github.com/nvm-sh/nvm) |
| Docker Desktop | Latest | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) |
| pnpm | 8.x | `npm install -g pnpm@8` |

Verify:
```bash
nvm --version   # 0.39.x or higher
docker --version # 25.x or higher
pnpm --version   # 8.x.x
```

---

## First-Time Setup

Run this **once** after cloning:

```bash
git clone <repo-url>
cd sakuga
make setup
```

This will:
1. Copy `.env.example` → `.env`
2. Switch to the correct Node version via nvm
3. Install all dependencies with pnpm
4. Start Postgres 16, Redis 7.2, and Kafka via Docker
5. Run Prisma database migrations
6. Generate the Prisma client

**After `make setup` completes:**

Open `.env` and replace every `CHANGE_ME` value:
- `JWT_SECRET` — run `openssl rand -base64 48`, paste the output
- `JWT_REFRESH_SECRET` — run `openssl rand -base64 48` again, paste a **different** output

All other values have working defaults for local development.

---

## Daily Development

```bash
make start    # Start Docker infrastructure + run dev servers (backend + frontend)
make stop     # Stop Docker containers (data is preserved)
make test-env # Health check — verify everything is running correctly
```

---

## If Things Break

```bash
# Soft reset: reinstall dependencies without wiping data
rm -rf node_modules packages/*/node_modules
pnpm install

# Hard reset: wipe EVERYTHING and start from scratch (DATA IS DELETED)
make reset
```

---

## Project Structure

```
sakuga/
├── packages/
│   ├── backend/          NestJS API (port 3001)
│   ├── frontend/         React + Vite (port 3000)
│   └── types/            @repo/types — shared TypeScript types
├── docker/
│   └── postgres/
│       └── init.sql      PostgreSQL extensions (runs on container creation)
├── docker-compose.yml    Infrastructure: Postgres, Redis, Kafka
├── .env.example          Environment variable template (commit this)
├── .env                  Real environment variables (NEVER commit this)
├── .nvmrc                Pinned Node.js version (20.14.0)
├── pnpm-workspace.yaml   pnpm monorepo workspace definition
└── Makefile              Setup and development commands
```

---

## Ports

| Service | Port | Access |
|---------|------|--------|
| Frontend (React/Vite) | 3000 | http://localhost:3000 |
| Backend (NestJS) | 3001 | http://localhost:3001 |
| PostgreSQL | 5432 | `psql -U sakuga_user -d sakuga_db -h localhost` |
| Redis | 6379 | `redis-cli -a sakuga_redis_password` |
| Kafka | 9092 | `kafka-console-consumer.sh --bootstrap-server localhost:9092` |
| Prisma Studio | 5555 | `pnpm db:studio` → http://localhost:5555 |
| Bull Board (job queues) | 3001/queues | http://localhost:3001/queues |
```

---

## 12. Step 0.9 — Verify Portability Before Writing Phase 1 Code

This is the most important step in Phase 0. Before writing a single line of application code, simulate a new machine by testing the full setup flow from scratch.

### The Portability Test

```bash
# 1. From a DIFFERENT directory (not inside the project):
cd /tmp
git clone <your-repo-url> sakuga-test
cd sakuga-test

# 2. Run the full setup:
make setup

# 3. Run the health check:
make test-env

# Expected output:
# → Node version: v20.14.0
# → pnpm version: 8.x.x
# → Docker services: all running/healthy
# → PostgreSQL connection: PostgreSQL OK
# → Redis connection: PONG
# → .env exists: ✓
```

If `make test-env` passes on the first try, Phase 0 is complete.

If anything fails, fix it in Phase 0 before proceeding. Time spent here saves hours of debugging later.

### The "Fresh Machine" Checklist

Before moving to Phase 1, verify every item:

```
[ ] .nvmrc exists with "20.14.0" — only one line, no trailing space
[ ] root package.json has engines: { node: "20.14.0", pnpm: ">=8.0.0 <9.0.0" }
[ ] root package.json has pnpm.engine-strict: true
[ ] preinstall script runs only-allow pnpm
[ ] pnpm-lock.yaml is committed and NOT in .gitignore
[ ] package-lock.json and yarn.lock ARE in .gitignore
[ ] .gitattributes prevents line ending issues on Windows
[ ] .env.example exists with ALL required keys documented
[ ] .env is in .gitignore (verify with: git status — .env should not appear)
[ ] docker-compose.yml uses pinned versions (postgres:16-alpine, redis:7.2-alpine, confluent 7.5.0)
[ ] docker/postgres/init.sql creates pgcrypto, pg_trgm, unaccent extensions
[ ] Docker healthchecks are defined for postgres and redis
[ ] Makefile has setup, start, stop, reset, test-env commands
[ ] NestJS env validation schema covers all required variables
[ ] ConfigModule in AppModule uses the validate function
[ ] README.md lists prerequisites, setup steps, and ports
[ ] make test-env passes on a clean clone
```

---

## 13. The Complete File Checklist

After completing Phase 0, your project structure must look exactly like this before Phase 1 begins:

```
sakuga/
│
├── .env.example          ← COMMITTED — template with all keys
├── .env                  ← NOT committed — real values, in .gitignore
├── .gitignore            ← COMMITTED
├── .gitattributes        ← COMMITTED — prevents line ending corruption
├── .nvmrc                ← COMMITTED — "20.14.0"
├── Makefile              ← COMMITTED
├── README.md             ← COMMITTED
├── package.json          ← COMMITTED — engines + preinstall guard
├── pnpm-workspace.yaml   ← COMMITTED (created in Phase 1 Step 1.4)
├── pnpm-lock.yaml        ← COMMITTED — created after first pnpm install
├── tsconfig.base.json    ← COMMITTED (created in Phase 1 Step 1.5)
├── docker-compose.yml    ← COMMITTED
│
├── docker/
│   └── postgres/
│       └── init.sql      ← COMMITTED — extension installation
│
└── packages/
    └── (empty — Phase 1 creates these)
```

---

## 14. Troubleshooting Reference

### "nvm: command not found" after installation

```bash
# nvm adds itself to ~/.bashrc or ~/.zshrc but the current shell session
# hasn't reloaded it. Either restart your terminal or run:
source ~/.bashrc    # if you use bash
source ~/.zshrc     # if you use zsh
```

### "Cannot find module 'only-allow'"

```bash
# only-allow is downloaded via npx — it needs internet access.
# If behind a corporate proxy, set:
npm config set proxy http://your-proxy:port
npm config set https-proxy http://your-proxy:port
```

### Docker containers start but Postgres shows "unhealthy"

```bash
# Check the Postgres logs:
docker compose logs postgres

# Most common cause: port 5432 already in use by a local Postgres installation
# Fix: stop local Postgres first
# macOS: brew services stop postgresql
# Ubuntu: sudo service postgresql stop
# Windows: Stop the PostgreSQL service in Services manager

# Then restart Docker:
docker compose down && docker compose up -d
```

### `make setup` fails on "pnpm not found"

```bash
# pnpm must be installed before setup:
npm install -g pnpm@8
# Then retry:
make setup
```

### Prisma migration fails with "relation does not exist"

```bash
# The Postgres container isn't fully ready yet
# Wait 10 seconds and retry:
sleep 10 && pnpm db:migrate
```

### `pnpm install` changes the lockfile on every machine

```bash
# This happens when different pnpm versions are used across machines
# Enforce a specific pnpm version:
# In package.json engines: { "pnpm": ">=8.0.0 <9.0.0" }
# Everyone must then install: npm install -g pnpm@8

# Also check .gitattributes — Windows line endings can corrupt lockfiles
# The .gitattributes in Step 0.5 prevents this
```

### "JWT_SECRET must be at least X characters" at backend startup

```bash
# Your .env has JWT_SECRET=CHANGE_ME — it was never replaced
# Generate a proper secret:
openssl rand -base64 48
# Copy the output into .env as the value for JWT_SECRET
# Run openssl rand -base64 48 again for JWT_REFRESH_SECRET (must be different)
```

### Kafka container keeps restarting

```bash
# Check logs:
docker compose logs kafka

# Most common cause: Zookeeper isn't healthy yet when Kafka starts
# Solution: the depends_on with condition: service_healthy in docker-compose.yml
# handles this, but if Zookeeper takes longer than expected:
docker compose restart kafka
```

### "Port 3000 already in use" when starting the frontend

```bash
# Kill the process on port 3000:
# macOS/Linux:
lsof -ti:3000 | xargs kill -9
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID_FROM_ABOVE> /F
```

---

> **Phase 0 is complete when `make test-env` passes on a clean clone of the repository.**
>
> Every decision made in this phase — pinned versions, committed lockfile, Docker infrastructure, startup validation, Makefile automation — pays back tenfold across the lifetime of the project. You will never lose Sakuga to "it worked on my machine" again.
>
> When you are ready, proceed to **Phase 1: Monorepo Setup with pnpm Workspaces.**
