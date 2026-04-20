"""Inbox blob reads. TODO: wire up Azure Blob Storage or Cosmos blobs.
For now, returns empty placeholders so the routes are live-connectable."""


def read_latest(kind: str) -> str:
    if kind not in ("gmail", "whatsapp"):
        raise KeyError(kind)
    # TODO: fetch from blob storage / Cosmos inbox container once sync writes them.
    return ""


def read_for_task(task_id: str) -> str:
    # TODO: same. Returning empty makes the UI show a "no inbox yet" state.
    return ""
