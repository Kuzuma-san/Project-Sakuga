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
