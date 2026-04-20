"""Task CRUD — all operations scoped to today's partition."""
from azure.cosmos import exceptions as cosmos_exceptions

from .cosmos import get_container, strip_meta
from .normalize import gen_task_id, new_task_doc, normalize_state
from .rollover import META_ID, ensure_today_rollover
from .time_utils import today_str, utc_now_iso


def find_task_today(task_id: str) -> tuple[dict, str, dict | None]:
    """Return (task_doc, day, parent_doc_or_None). Searches today's partition only."""
    ensure_today_rollover()
    day = today_str()
    c = get_container("tasks")

    try:
        t = c.read_item(task_id, partition_key=day)
        return strip_meta(t), day, None
    except cosmos_exceptions.CosmosResourceNotFoundError:
        pass

    q = (
        "SELECT VALUE c FROM c JOIN s IN c.subtasks "
        "WHERE s.id = @id AND c.day = @day AND c.id != @meta"
    )
    parents = list(c.query_items(
        q,
        parameters=[
            {"name": "@id", "value": task_id},
            {"name": "@day", "value": day},
            {"name": "@meta", "value": META_ID},
        ],
        partition_key=day,
    ))
    if parents:
        parent = parents[0]
        strip_meta(parent)
        for s in parent.get("subtasks", []):
            if s.get("id") == task_id:
                return s, day, parent
    raise KeyError(f"task {task_id} not found in day {day}")


def get_task(task_id: str) -> dict:
    task, _day, parent = find_task_today(task_id)
    return {"task": task, "parent_id": parent.get("id") if parent else None}


def add_task(
    problem: str,
    why: str | None = None,
    solution: str | None = None,
    parent: str | None = None,
    project: str | None = None,
    contacts: list[str] | None = None,
) -> dict:
    ensure_today_rollover()
    day = today_str()
    c = get_container("tasks")

    task_id = gen_task_id()
    new_doc = new_task_doc(task_id, day, problem, why, solution, project, contacts)

    if parent:
        parent_task, _day, gp = find_task_today(parent)
        if gp is not None:
            raise ValueError("cannot add subtask to a subtask (one level only)")
        if parent_task.get("state") == "done":
            raise ValueError(f"parent {parent} is done")
        new_doc.pop("subtasks", None)
        new_doc.pop("day", None)
        parent_task.setdefault("subtasks", []).append(new_doc)
        c.replace_item(parent_task["id"], parent_task)
        return new_doc

    c.create_item(new_doc)
    return new_doc


def set_state(task_id: str, state: str | None, commits: list[str] | None = None) -> dict:
    ensure_today_rollover()
    day = today_str()
    c = get_container("tasks")
    task, _day, parent = find_task_today(task_id)
    norm = normalize_state(state)

    if parent is not None:
        for s in parent["subtasks"]:
            if s.get("id") == task_id:
                s["state"] = norm
                if commits:
                    s.setdefault("commits", []).extend(commits)
                break
        c.replace_item(parent["id"], parent)
        return _find_subtask(parent, task_id)

    task["state"] = norm
    if commits:
        task.setdefault("commits", []).extend(commits)
    c.replace_item(task_id, task)
    return task


def edit_task(task_id: str, fields: dict) -> dict:
    ensure_today_rollover()
    day = today_str()
    c = get_container("tasks")
    task, _day, parent = find_task_today(task_id)

    target = _find_subtask(parent, task_id) if parent else task

    for key in ("problem", "why", "solution"):
        if key in fields and fields[key] is not None:
            target[key] = fields[key]
    if "project" in fields and fields["project"] is not None:
        v = fields["project"]
        target["project"] = None if v in (None, "", "null") else v
    if "contacts" in fields and fields["contacts"] is not None:
        v = fields["contacts"]
        if isinstance(v, str):
            v = [s.strip() for s in v.split(",") if s.strip()]
        target["contacts"] = list(v)

    c.replace_item(parent["id"] if parent else task_id, parent if parent else task)
    return target


def append_history(task_id: str, field: str, text: str) -> dict:
    if field not in ("problem", "why", "solution", "context"):
        raise ValueError(f"invalid field '{field}'")
    ensure_today_rollover()
    c = get_container("tasks")
    task, _day, parent = find_task_today(task_id)
    target = _find_subtask(parent, task_id) if parent else task
    if target.get("state") == "done":
        raise ValueError(f"task {task_id} is done")
    target.setdefault("history", []).append({
        "ts": utc_now_iso(),
        "field": field,
        "text": text,
    })
    c.replace_item(parent["id"] if parent else task_id, parent if parent else task)
    return target


def set_focus(task_id: str, focus: bool) -> dict:
    ensure_today_rollover()
    c = get_container("tasks")
    task, _day, parent = find_task_today(task_id)
    if parent is not None:
        raise ValueError("focus is only for top-level tasks")
    task["focus"] = bool(focus)
    c.replace_item(task_id, task)
    return task


def delete_task(task_id: str) -> dict:
    ensure_today_rollover()
    day = today_str()
    c = get_container("tasks")
    task, _day, parent = find_task_today(task_id)
    if parent is not None:
        parent["subtasks"] = [s for s in parent["subtasks"] if s.get("id") != task_id]
        c.replace_item(parent["id"], parent)
        return task
    c.delete_item(task_id, partition_key=day)
    return task


def mark_context_read(task_id: str) -> dict:
    ensure_today_rollover()
    c = get_container("tasks")
    task, _day, parent = find_task_today(task_id)
    target = _find_subtask(parent, task_id) if parent else task
    target["context_unread"] = 0
    target["context_last_read_at"] = utc_now_iso()
    c.replace_item(parent["id"] if parent else task_id, parent if parent else task)
    return target


def _find_subtask(parent: dict, task_id: str) -> dict:
    for s in parent.get("subtasks", []):
        if s.get("id") == task_id:
            return s
    raise KeyError(task_id)
