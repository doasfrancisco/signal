"""Signal MCP tools — 18 tools, each a thin delegate to lib/.

Mounted at /mcp by main.py. Auth via x-api-key header (same env var as /api)."""
import os

from fastmcp import FastMCP
from fastmcp.exceptions import ToolError
from fastmcp.server.dependencies import get_http_headers
from fastmcp.server.middleware import Middleware, MiddlewareContext

from lib import (
    context_ops,
    followup_ops,
    inbox_ops,
    state_builder,
    sync_ops,
    task_ops,
)

mcp = FastMCP("signal")


class ApiKeyAuth(Middleware):
    async def on_call_tool(self, context: MiddlewareContext, call_next):
        expected = os.environ.get("SIGNAL_API_KEY", "")
        headers = get_http_headers() or {}
        if not expected or headers.get("x-api-key") != expected:
            raise ToolError("unauthorized")
        return await call_next(context)


mcp.add_middleware(ApiKeyAuth())


# ---- reads ----

@mcp.tool
def signal_list() -> dict:
    """Today's tasks + history + analytics."""
    return state_builder.build_show_state()


@mcp.tool
def signal_get(task_id: str) -> dict:
    """Single task (or subtask) by id, with its parent id if any."""
    return task_ops.get_task(task_id)


@mcp.tool
def signal_context() -> dict:
    """People, groups, orgs, accounts, rules."""
    return context_ops.load_context()


@mcp.tool
def signal_projects() -> dict:
    """Project registry."""
    return context_ops.load_projects()


@mcp.tool
def signal_followup_candidates() -> list[dict]:
    """Suggested followups — contact + reason + draft message."""
    return followup_ops.candidates()


@mcp.tool
def signal_inbox(kind: str) -> str:
    """Latest inbox blob. kind ∈ {'gmail', 'whatsapp'}."""
    return inbox_ops.read_latest(kind)


@mcp.tool
def signal_inbox_task(task_id: str) -> str:
    """Per-task inbox blob."""
    return inbox_ops.read_for_task(task_id)


# ---- writes ----

@mcp.tool
def signal_state(task_id: str, state: str | None, commits: list[str] | None = None) -> dict:
    """Set task state. state ∈ {None, 'in progress', 'done', 'blocked: <reason>'}."""
    return task_ops.set_state(task_id, state, commits=commits)


@mcp.tool
def signal_edit(
    task_id: str,
    problem: str | None = None,
    why: str | None = None,
    solution: str | None = None,
    project: str | None = None,
    contacts: list[str] | None = None,
) -> dict:
    """Replace named fields on a task."""
    fields = {k: v for k, v in {
        "problem": problem, "why": why, "solution": solution,
        "project": project, "contacts": contacts,
    }.items() if v is not None}
    return task_ops.edit_task(task_id, fields)


@mcp.tool
def signal_append(task_id: str, field: str, text: str) -> dict:
    """Append a timestamped history entry. field ∈ {'problem','why','solution','context'}."""
    return task_ops.append_history(task_id, field, text)


@mcp.tool
def signal_focus(task_id: str, focus: bool = True) -> dict:
    """Toggle focus on a top-level task."""
    return task_ops.set_focus(task_id, focus)


@mcp.tool
def signal_add(
    problem: str,
    why: str | None = None,
    solution: str | None = None,
    parent: str | None = None,
    project: str | None = None,
    contacts: list[str] | None = None,
) -> dict:
    """Create a task or subtask."""
    return task_ops.add_task(
        problem=problem,
        why=why,
        solution=solution,
        parent=parent,
        project=project,
        contacts=contacts,
    )


@mcp.tool
def signal_delete(task_id: str) -> dict:
    """Archive/remove a task."""
    return task_ops.delete_task(task_id)


@mcp.tool
def signal_followup(task_id: str, who: str, about: str, message: str, at: str) -> dict:
    """Schedule a WhatsApp followup. `at` is ISO datetime."""
    return followup_ops.schedule_followup(
        task_id, who=who, about=about, message=message, at=at,
    )


@mcp.tool
def signal_unread_context(task_id: str) -> dict:
    """Clear the unread-context badge."""
    return task_ops.mark_context_read(task_id)


# ---- sync ----

@mcp.tool
def signal_sync() -> dict:
    """Run notion + gmail + whatsapp sync now."""
    return sync_ops.sync_all()


@mcp.tool
def signal_sync_notion() -> dict:
    """Run notion sync only."""
    return sync_ops.sync_notion()


@mcp.tool
def signal_sync_gmail() -> dict:
    """Run gmail sync only."""
    return sync_ops.sync_gmail()
