# signal-backend

Single FastAPI process that serves:

- `/api/*` — REST API (20 routes)
- `/mcp/` — FastMCP streamable-http (18 tools for Claude Code)
- Background: apscheduler loops — notion sync every 5 min, gmail every 10 min

## Setup

```bash
uv sync
cp .env.example .env   # fill in COSMOS_ENDPOINT, COSMOS_KEY, SIGNAL_API_KEY
```

## Run

```bash
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

- REST: `http://localhost:8000/api/state` (requires `x-api-key` header)
- MCP: `http://localhost:8000/mcp/`
- OpenAPI docs: `http://localhost:8000/docs`

## Cosmos containers

Reuses the existing `opensignal` database (same one behind `habits-api`).
Create four containers before first run:

| Container | Partition key |
|---|---|
| `tasks` | `/day` |
| `context` | `/kind` |
| `projects` | `/pk` |
| `analytics` | `/day` |

## Endpoints

All routes require `x-api-key: $SIGNAL_API_KEY`.

### REST (api.py)

Reads: `GET /api/state`, `/api/tasks/{id}`, `/api/context`, `/api/projects`,
`/api/followup-candidates`, `/api/inbox/{kind}`, `/api/inbox/task/{id}`.

Writes: `POST /api/tasks`, `/api/tasks/{id}/state|edit|append|focus|followup|context-read`,
`DELETE /api/tasks/{id}`.

Sync: `POST /api/sync`, `/api/sync/notion`, `/api/sync/gmail`, `/api/sync/whatsapp`.

Internal: `POST /api/internal/followup-fire` (EventBridge Lambda callback).

### MCP (signal_mcp.py)

18 tools, each a one-line proxy into `lib/`:
`signal_list`, `signal_get`, `signal_context`, `signal_projects`,
`signal_followup_candidates`, `signal_inbox`, `signal_inbox_task`,
`signal_state`, `signal_edit`, `signal_append`, `signal_focus`, `signal_add`,
`signal_delete`, `signal_followup`, `signal_unread_context`,
`signal_sync`, `signal_sync_notion`, `signal_sync_gmail`.

## Wire Claude Code

```json
{
  "mcpServers": {
    "signal": {
      "type": "http",
      "url": "https://<vps-host>/mcp/",
      "headers": { "x-api-key": "<SIGNAL_API_KEY>" }
    }
  }
}
```

## Deploy on VPS

`/etc/systemd/system/signal-backend.service`:

```ini
[Unit]
Description=Signal backend (FastAPI + FastMCP)
After=network.target

[Service]
Type=simple
User=signal
WorkingDirectory=/opt/signal/backend
EnvironmentFile=/opt/signal/backend/.env
ExecStart=/opt/signal/backend/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Put nginx in front with TLS termination. Forward `/api/*` and `/mcp/` to
`127.0.0.1:8000`. Vercel (web) uses the `/api/*` path with `x-api-key`;
Claude Code hits `/mcp/` with the same header.

## Layout

```
backend/
├── main.py              entry — FastAPI + combine_lifespans + mount
├── api.py               20 REST routes
├── signal_mcp.py        18 MCP tools + ApiKeyAuth middleware
├── workers.py           apscheduler sync loops
├── pyproject.toml       uv-managed
├── .env.example
├── .gitignore
└── lib/
    ├── cosmos.py        cached container clients
    ├── auth.py          FastAPI require_key dependency
    ├── time_utils.py    Lima TZ helpers
    ├── normalize.py     task id + state canonicalization
    ├── rollover.py      lazy day-rollover (copy non-done into today)
    ├── state_builder.py /api/state aggregator
    ├── task_ops.py      task CRUD (today's partition)
    ├── followup_ops.py  candidates + EventBridge scheduling (TODO)
    ├── context_ops.py   context + projects reads
    ├── inbox_ops.py     inbox blob reads (stub)
    └── sync_ops.py      notion/gmail/whatsapp sync (stubs)
```

## TODOs

Marked `# TODO:` in-file:
- Port `notion.py` from `signal_legacy/` into `sync_ops.sync_notion()`
- Port `gmail.py` logic into `sync_ops.sync_gmail()`
- Wire `boto3` EventBridge `create_schedule` call in `followup_ops.schedule_followup`
- Blob storage for inbox markdown (Azure Blob or a fifth Cosmos container)
- Port `analytics.py` (~750 LOC) for the `analytics` field in `/api/state`
