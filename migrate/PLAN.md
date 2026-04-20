# Migration plan — signal_legacy → Cosmos DB

One-shot import from `migrate/legacy_data/` into the new `signal` database. Idempotent (upsert everywhere).

## Target Cosmos layout (3 containers)

| Container | Partition key | Contents |
|---|---|---|
| `tasks` | `/id` | one doc per top-level task. Subtasks nested, history/followups embedded. `created_at` computed from earliest daily snapshot. |
| `context` | `/id` | one doc per kind: `people`, `groups`, `orgs`, `accounts`, `procedures`, `rules`, `projects`. |
| `analytics` | `/task_id` | one doc per row from `analytics.db.events`. Rows with null task_id partitioned as `_global`. `daily_snapshots` kept as separate docs with id `snap_<date>`. |

DB name: `signal` (separate from `opensignal` which hosts habits-api — migration stays reversible without touching habits).

## Source files in `legacy_data/`

Copied from `~/.claude/signal/` (live installation) unless noted.

**Tasks (34 snapshots):** `2026-03-09-tasks.json` … `2026-04-16-tasks.json`.
Only the **latest** (`2026-04-16-tasks.json`) is imported as source of truth. Older snapshots used only to compute `created_at` per task id (earliest appearance).

**Context:** `context.json`, `projects.json` — split into one doc per kind, upserted to `context` container.

**Runtime state:**
- `sessions.json` — richer version lives in `analytics.db.sessions` (has duration + turn_count); prefer the DB rows. `sessions.json` kept as fallback for ids not present in the DB.
- `plan.json` — **skip, recompute** at runtime from context + tasks.
- `last-read.json` — **skip**, now tracked inside task history (copied here only as reference).
- `skill-tree-data.json` — **open question, see below.**

**Analytics:** `analytics.db` (sqlite).
- `events` (596 rows) → `analytics` container, one doc per row, partition `/task_id`.
- `daily_snapshots` (28 rows) → `analytics` container, id `snap_<date>`, partition `/task_id = _snapshot`.
- `sessions` (5 rows) → merged into task docs under `task.sessions[]`.

**Secrets:** `.env` — copied here for reference. Do **not** commit. Will move to `backend/` config when the Functions app is built. `migrate/legacy_data/` is gitignored.

**Dropped entirely:** `habits.json` (habits-api owns this in `opensignal` DB), `mcp-*.json`, `inbox/`, `artifacts/`, `backups/`, `md-backup/`, `logs/`, `__pycache__`, `.venv`.

## `import_legacy.py` flow

```
1. Scan legacy_data/*-tasks.json → build {task_id → earliest_date} map (recurses into subtasks).
2. Load latest daily file (2026-04-16-tasks.json) → for each top-level task:
   - inject created_at from step 1 (same for each nested subtask)
   - inject sessions[] merged from analytics.db.sessions + sessions.json (analytics.db wins on conflicts)
   - upsert to `tasks` (partition /id)
3. Load context.json → split into docs: people, groups, orgs, accounts, procedures, rules.
   Load projects.json → {id:"projects", items:{...}}.
   Upsert all to `context` (partition /id).
4. Read analytics.db:
   - events rows → upsert to `analytics` with id = f"evt_{row.id}", task_id = row.task_id or "_global"
   - daily_snapshots rows → upsert to `analytics` with id = f"snap_{row.date}", task_id = "_snapshot"
5. Print counts per container.
```

Run with env: `COSMOS_ENDPOINT`, `COSMOS_KEY`, `COSMOS_DATABASE=signal`.

## Assets (deferred)

`context.procedures.rh_pulso.fields.suspension_4ta_2026` points to `~/.claude/signal/assets/4ta_suspension_2026.png`. Path will break when backend runs in Azure. **Plan: move to Azure Blob Storage later, rewrite context paths to blob URLs.** Not part of this migration.

## Open questions

1. **`skill-tree-data.json`** — 33KB, keep or drop? If keep, where does it go? (Candidate: `context` doc with id `skill_tree`.)
- ignore for now
2. **Analytics partition key `/task_id`** — some events have no task_id (sync, followup). Using `_global` sentinel. OK, or prefer a separate container?
3. **DB name `signal`** confirmed?