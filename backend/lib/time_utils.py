from datetime import datetime, timezone, timedelta

LIMA_TZ = timezone(timedelta(hours=-5))


def today_str() -> str:
    return datetime.now(LIMA_TZ).strftime("%Y-%m-%d")


def day_offset(day: str, delta: int) -> str:
    d = datetime.strptime(day, "%Y-%m-%d").date()
    return (d + timedelta(days=delta)).strftime("%Y-%m-%d")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
