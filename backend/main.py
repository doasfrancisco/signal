"""Signal backend entry.

FastAPI app that serves:
  /api/*   REST (20 routes, see api.py)
  /mcp/    FastMCP streamable-http (18 tools, see signal_mcp.py)

Run:
  uv sync
  uv run uvicorn main:app --host 0.0.0.0 --port 8000
"""
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastmcp.utilities.lifespan import combine_lifespans

load_dotenv()

from api import router as api_router  # noqa: E402
from signal_mcp import mcp  # noqa: E402
from workers import scheduler, start_workers  # noqa: E402

mcp_app = mcp.http_app(path="/")


@asynccontextmanager
async def app_lifespan(app: FastAPI):
    for required in ("SIGNAL_API_KEY", "COSMOS_ENDPOINT", "COSMOS_KEY"):
        if not os.environ.get(required):
            raise RuntimeError(f"{required} must be set (see .env.example)")
    start_workers()
    try:
        yield
    finally:
        scheduler.shutdown(wait=False)


app = FastAPI(
    title="signal-backend",
    version="0.1.0",
    lifespan=combine_lifespans(app_lifespan, mcp_app.lifespan),
)

app.include_router(api_router, prefix="/api")
app.mount("/mcp", mcp_app)
