from .cosmos import get_container, strip_meta


def load_context() -> dict:
    c = get_container("context")
    items = list(c.query_items("SELECT * FROM c", enable_cross_partition_query=True))
    out: dict = {"people": {}, "groups": {}, "orgs": {}, "accounts": {}, "rules": {}}
    for raw in items:
        strip_meta(raw)
        kind = raw.get("kind")
        if kind in out:
            out[kind][raw["id"]] = raw
    return out


def load_projects() -> dict:
    c = get_container("projects")
    items = list(c.query_items("SELECT * FROM c", enable_cross_partition_query=True))
    out: dict = {}
    for raw in items:
        strip_meta(raw)
        out[raw["id"]] = raw
    return out
