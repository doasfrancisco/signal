"""Background sync scheduler.

Uses BackgroundScheduler (threads) so blocking Cosmos SDK calls don't tie up
the FastAPI asyncio event loop. Started from main.py's lifespan hook.
"""
from apscheduler.schedulers.background import BackgroundScheduler

from lib import sync_ops

scheduler = BackgroundScheduler()


def start_workers() -> None:
    scheduler.add_job(
        sync_ops.sync_notion, "interval", minutes=5,
        id="notion_sync", replace_existing=True,
    )
    scheduler.add_job(
        sync_ops.sync_gmail, "interval", minutes=10,
        id="gmail_sync", replace_existing=True,
    )
    scheduler.start()
