"""Followup: candidates + scheduling via EventBridge."""
from datetime import datetime, timedelta, timezone

from .cosmos import get_container, strip_meta
from .rollover import META_ID, ensure_today_rollover
from .task_ops import find_task_today
from .time_utils import today_str, utc_now_iso

STALE_DAYS = 2


def candidates() -> list[dict]:
    ensure_today_rollover()
    day = today_str()
    c = get_container("tasks")
    q = "SELECT * FROM c WHERE c.day = @day AND c.id != @meta"
    tasks = list(c.query_items(
        q,
        parameters=[{"name": "@day", "value": day}, {"name": "@meta", "value": META_ID}],
        partition_key=day,
    ))
    for t in tasks:
        strip_meta(t)

    ctx = _load_context()
    out: list[dict] = []
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=STALE_DAYS)

    def _process(task: dict, parent: dict | None):
        if task.get("state") == "done":
            return
        state = task.get("state")
        if isinstance(state, str) and state.startswith("failed"):
            return
        last_by_who: dict[str, datetime] = {}
        for fu in task.get("followups", []) or []:
            who = fu.get("who")
            ts = _parse_iso(fu.get("to_send_at"))
            if who and ts and (who not in last_by_who or ts > last_by_who[who]):
                last_by_who[who] = ts
        for key in task.get("contacts", []) or []:
            person = _contact(ctx, key)
            if not person.get("phone"):
                continue
            name = person.get("name") or key
            last = last_by_who.get(name) or last_by_who.get(key)
            if last is None:
                out.append(_candidate(task, parent, name, key, "no prior followup recorded"))
            elif last < cutoff:
                days = int((now - last).total_seconds() // 86400)
                out.append(_candidate(task, parent, name, key, f"last followup was {days} day(s) ago",
                                      last.isoformat()))

    for t in tasks:
        _process(t, None)
        for s in t.get("subtasks", []) or []:
            _process(s, t)
    return out


def schedule_followup(task_id: str, who: str, about: str, message: str, at: str) -> dict:
    """Validate, schedule on EventBridge, persist on task."""
    task, _day, parent = find_task_today(task_id)
    target = _find_sub(parent, task_id) if parent else task
    if target.get("state") == "done":
        raise ValueError(f"task {task_id} is done")

    ctx = _load_context()
    phone = _phone_for(ctx, who)
    if not phone:
        raise ValueError(f"no phone in context for {who}")

    for f in target.get("followups", []) or []:
        if f.get("who") == who and f.get("to_send_at") == at:
            raise ValueError(f"followup to {who} at {at} already exists")

    # TODO: boto3 EventBridge Scheduler create_schedule here.
    # For now, persist locally so the rest of the flow is testable.
    entry = {"who": who, "about": about, "to_send_at": at, "message": message}
    target.setdefault("followups", []).append(entry)

    c = get_container("tasks")
    c.replace_item(parent["id"] if parent else task_id, parent if parent else task)
    return target


def mark_followup_sent(task_id: str, followup_index: int) -> dict:
    task, _day, parent = find_task_today(task_id)
    target = _find_sub(parent, task_id) if parent else task
    followups = target.get("followups") or []
    if followup_index >= len(followups):
        raise KeyError(f"no followup at index {followup_index}")
    followups[followup_index]["sent_at"] = utc_now_iso()
    c = get_container("tasks")
    c.replace_item(parent["id"] if parent else task_id, parent if parent else task)
    return target


def _load_context() -> dict:
    c = get_container("context")
    items = list(c.query_items("SELECT * FROM c", enable_cross_partition_query=True))
    out: dict = {"people": {}, "groups": {}, "orgs": {}, "accounts": {}, "rules": {}}
    for raw in items:
        strip_meta(raw)
        kind = raw.get("kind")
        if kind in out:
            out[kind][raw["id"]] = raw
    return out


def _contact(ctx: dict, key: str) -> dict:
    people = ctx.get("people", {})
    if key in people:
        return people[key]
    for _, p in people.items():
        name = p.get("name", "")
        if name == key or name.split(" ")[0] == key:
            return p
    return {"name": key}


def _phone_for(ctx: dict, who: str) -> str | None:
    import re
    person = _contact(ctx, who)
    phone = person.get("phone")
    if phone:
        return re.sub(r"[\s-]", "", phone.lstrip("+"))
    return None


def _parse_iso(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def _candidate(task, parent, who, key, reason, last_at: str | None = None) -> dict:
    problem = task.get("problem") or ""
    first = who.split(" ")[0] if who else "Hola"
    suggested = f"Hola {first}, quería dar seguimiento sobre: {problem[:120]}. ¿Cómo va?"
    out = {
        "task_id": task.get("id"),
        "task_problem": task.get("problem"),
        "parent_id": parent.get("id") if parent else None,
        "who": who,
        "contact_key": key,
        "reason": reason,
        "suggested_message": suggested,
    }
    if last_at:
        out["last_at"] = last_at
    return out


def _find_sub(parent: dict, task_id: str) -> dict:
    for s in parent.get("subtasks", []):
        if s.get("id") == task_id:
            return s
    raise KeyError(task_id)
