import os
from azure.cosmos import CosmosClient

_client = None
_containers: dict[str, object] = {}


def _client_ref():
    global _client
    if _client is None:
        _client = CosmosClient(
            os.environ["COSMOS_ENDPOINT"],
            os.environ["COSMOS_KEY"],
        )
    return _client


def get_container(name: str):
    if name not in _containers:
        db_name = os.environ.get("COSMOS_DB", "opensignal")
        db = _client_ref().get_database_client(db_name)
        _containers[name] = db.get_container_client(name)
    return _containers[name]


COSMOS_META = ("_rid", "_self", "_etag", "_attachments", "_ts")


def strip_meta(doc: dict) -> dict:
    for k in COSMOS_META:
        doc.pop(k, None)
    return doc
