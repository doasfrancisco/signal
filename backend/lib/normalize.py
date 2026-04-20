import secrets


def gen_task_id() -> str:
    return f"t-{secrets.token_hex(4)[:7]}"


def normalize_state(state: str | None):
    if state is None or state == "":
        return None
    s = state.strip().lower()
    if s == "null":
        return None
    if s in ("in_progress", "in progress"):
        return "in progress"
    if s == "done":
        return "done"
    if s.startswith(("blocked", "failed", "needs_decision")):
        return state
    return None


def new_task_doc(
    task_id: str,
    day: str,
    problem: str,
    why: str | None,
    solution: str | None,
    project: str | None,
    contacts: list[str] | None,
) -> dict:
    return {
        "id": task_id,
        "day": day,
        "focus": False,
        "state": None,
        "problem": problem,
        "why": why,
        "solution": solution,
        "project": project,
        "contacts": list(contacts or []),
        "followups": [],
        "commits": [],
        "history": [],
        "subtasks": [],
        "source": None,
    }
