"""REST routes — 20 endpoints. Each handler is thin, delegating to lib/.
All routes require x-api-key (enforced via require_key dependency on the router)."""
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import PlainTextResponse

from lib import (
    context_ops,
    followup_ops,
    inbox_ops,
    state_builder,
    sync_ops,
    task_ops,
)
from lib.auth import require_key

router = APIRouter(dependencies=[Depends(require_key)])


# =========================================================================
# Reads
# =========================================================================

@router.get("/state")
def get_state() -> dict:
    return state_builder.build_show_state()


@router.get("/tasks/{task_id}")
def get_task(task_id: str) -> dict:
    try:
        return task_ops.get_task(task_id)
    except KeyError as e:
        raise HTTPException(404, str(e))


@router.get("/context")
def get_context() -> dict:
    return context_ops.load_context()


@router.get("/projects")
def get_projects() -> dict:
    return context_ops.load_projects()


@router.get("/followup-candidates")
def get_followup_candidates() -> list[dict]:
    return followup_ops.candidates()


@router.get("/inbox/{kind}", response_class=PlainTextResponse)
def get_inbox(kind: str) -> str:
    try:
        return inbox_ops.read_latest(kind)
    except KeyError:
        raise HTTPException(404, f"unknown inbox kind '{kind}'")


@router.get("/inbox/task/{task_id}", response_class=PlainTextResponse)
def get_inbox_for_task(task_id: str) -> str:
    return inbox_ops.read_for_task(task_id)


# =========================================================================
# Writes (tasks)
# =========================================================================

@router.post("/tasks", status_code=201)
def post_task(body: dict[str, Any] = Body(...)) -> dict:
    if not body.get("problem"):
        raise HTTPException(400, "problem is required")
    try:
        return task_ops.add_task(
            problem=body["problem"],
            why=body.get("why"),
            solution=body.get("solution"),
            parent=body.get("parent"),
            project=body.get("project"),
            contacts=body.get("contacts") or [],
        )
    except (KeyError, ValueError) as e:
        raise HTTPException(400, str(e))


@router.post("/tasks/{task_id}/state")
def post_task_state(task_id: str, body: dict[str, Any] = Body(...)) -> dict:
    try:
        return task_ops.set_state(task_id, body.get("state"), commits=body.get("commits"))
    except KeyError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/tasks/{task_id}/edit")
def post_task_edit(task_id: str, body: dict[str, Any] = Body(...)) -> dict:
    try:
        return task_ops.edit_task(task_id, body)
    except KeyError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/tasks/{task_id}/append")
def post_task_append(task_id: str, body: dict[str, Any] = Body(...)) -> dict:
    field = body.get("field", "solution")
    text = (body.get("text") or "").strip()
    if not text:
        raise HTTPException(400, "text is required")
    try:
        return task_ops.append_history(task_id, field, text)
    except KeyError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/tasks/{task_id}/focus")
def post_task_focus(task_id: str, body: dict[str, Any] = Body(...)) -> dict:
    try:
        return task_ops.set_focus(task_id, bool(body.get("focus", True)))
    except KeyError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/tasks/{task_id}/followup")
def post_task_followup(task_id: str, body: dict[str, Any] = Body(...)) -> dict:
    for key in ("who", "message", "at"):
        if not body.get(key):
            raise HTTPException(400, f"{key} is required")
    try:
        return followup_ops.schedule_followup(
            task_id,
            who=body["who"],
            about=body.get("about", ""),
            message=body["message"],
            at=body["at"],
        )
    except KeyError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/tasks/{task_id}/context-read")
def post_task_context_read(task_id: str) -> dict:
    try:
        return task_ops.mark_context_read(task_id)
    except KeyError as e:
        raise HTTPException(404, str(e))


@router.delete("/tasks/{task_id}")
def delete_task(task_id: str) -> dict:
    try:
        task = task_ops.delete_task(task_id)
    except KeyError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"deleted": task_id, "task": task}


# =========================================================================
# Sync
# =========================================================================

@router.post("/sync")
def post_sync_all() -> dict:
    return sync_ops.sync_all()


@router.post("/sync/notion")
def post_sync_notion() -> dict:
    return sync_ops.sync_notion()


@router.post("/sync/gmail")
def post_sync_gmail() -> dict:
    return sync_ops.sync_gmail()


@router.post("/sync/whatsapp")
def post_sync_whatsapp(body: dict[str, Any] | None = Body(default=None)) -> dict:
    return sync_ops.sync_whatsapp(body)


# =========================================================================
# Internal (EventBridge Lambda callback)
# =========================================================================

@router.post("/internal/followup-fire")
def post_followup_fire(body: dict[str, Any] = Body(...)) -> dict:
    task_id = body.get("task_id")
    idx = body.get("followup_index")
    if task_id is None or idx is None:
        raise HTTPException(400, "task_id and followup_index are required")
    try:
        return followup_ops.mark_followup_sent(task_id, int(idx))
    except KeyError as e:
        raise HTTPException(404, str(e))
