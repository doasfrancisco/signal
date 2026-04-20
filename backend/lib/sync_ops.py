"""Sync workers — stubs. Port notion.py / gmail.py from signal_legacy when wiring."""


def sync_notion() -> dict:
    # TODO: port notion.sync_notion from signal_legacy/notion.py.
    return {"status": "not_implemented"}


def sync_gmail() -> dict:
    # TODO: port gmail.py logic (runs plan.json, writes inbox blobs, updates context_unread).
    return {"status": "not_implemented"}


def sync_whatsapp(payload: dict | None = None) -> dict:
    # The VPS WA bridge POSTs payloads here. Stub for MVP.
    return {"status": "not_implemented", "received": bool(payload)}


def sync_all() -> dict:
    return {
        "notion": sync_notion(),
        "gmail": sync_gmail(),
        "whatsapp": sync_whatsapp(),
    }
