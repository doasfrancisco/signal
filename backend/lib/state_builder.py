"""Build the ShowData payload consumed by web/lib/types.ts `ShowData`."""
from .cosmos import get_container, strip_meta
from .rollover import META_ID, ensure_today_rollover
from .time_utils import day_offset, today_str

HISTORY_DAYS = 14


def build_show_state() -> dict:
    ensure_today_rollover()
    today = today_str()
    return {
        "today": today,
        "tasks": _tasks_for_day(today),
        "history": _history(today, HISTORY_DAYS),
        "analytics": None,  # TODO: port analytics.py from signal_legacy
    }


def _tasks_for_day(day: str) -> list[dict]:
    c = get_container("tasks")
    q = "SELECT * FROM c WHERE c.day = @day AND c.id != @meta"
    items = list(c.query_items(
        q,
        parameters=[
            {"name": "@day", "value": day},
            {"name": "@meta", "value": META_ID},
        ],
        partition_key=day,
    ))
    return [strip_meta(i) for i in items]


def _history(today: str, days: int) -> dict[str, list[dict]]:
    c = get_container("tasks")
    out: dict[str, list[dict]] = {}
    for i in range(days):
        day = day_offset(today, -i)
        q = "SELECT * FROM c WHERE c.day = @day AND c.id != @meta"
        items = list(c.query_items(
            q,
            parameters=[
                {"name": "@day", "value": day},
                {"name": "@meta", "value": META_ID},
            ],
            partition_key=day,
        ))
        entries: list[dict] = []
        for t in items:
            strip_meta(t)
            if t.get("state") == "done":
                entries.append({"type": "parent_done", "task": t})
            else:
                for s in t.get("subtasks", []) or []:
                    if s.get("state") == "done":
                        entries.append({
                            "type": "subtask_done",
                            "task": s,
                            "parent": {
                                "id": t.get("id"),
                                "problem": t.get("problem"),
                                "source": t.get("source"),
                                "subtasks": t.get("subtasks", []),
                            },
                        })
        if entries:
            out[day] = entries
    return out
