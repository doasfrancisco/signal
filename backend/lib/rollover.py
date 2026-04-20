"""Lazy day-rollover: on first read of a new day, copy yesterday's non-done tasks
into today's partition. Idempotent — guarded by a `_meta` sentinel doc per day.
"""
from azure.cosmos import exceptions as cosmos_exceptions

from .cosmos import get_container, strip_meta
from .time_utils import day_offset, today_str, utc_now_iso

META_ID = "_meta"


def ensure_today_rollover() -> dict:
    day = today_str()
    c = get_container("tasks")

    try:
        c.read_item(META_ID, partition_key=day)
        return {"day": day, "rolled_over": False, "reason": "already_initialized"}
    except cosmos_exceptions.CosmosResourceNotFoundError:
        pass

    copied = 0
    source_day = None
    for i in range(1, 8):
        prev_day = day_offset(day, -i)
        q = (
            "SELECT * FROM c WHERE c.day = @day "
            "AND c.id != @meta "
            "AND (NOT IS_DEFINED(c.state) OR c.state != 'done')"
        )
        items = list(c.query_items(
            q,
            parameters=[
                {"name": "@day", "value": prev_day},
                {"name": "@meta", "value": META_ID},
            ],
            partition_key=prev_day,
        ))
        if items:
            source_day = prev_day
            for t in items:
                strip_meta(t)
                t["day"] = day
                c.create_item(t)
                copied += 1
            break

    c.upsert_item({"id": META_ID, "day": day, "initialized_at": utc_now_iso()})
    return {"day": day, "rolled_over": True, "source_day": source_day, "copied": copied}
