# Nia sources for signal-dev

## Rules

- **Never pipe `nia` output through `head -N` or `tail -N`.** The output can be 2000+ lines. You MUST read ALL of it. If the output is split across chunks, read every chunk before proceeding. Missing a single source leads to wrong follow-up searches and wasted user time.
- **If the source is a package/library, always ask how to install it** (pip name, Python/Node version, any extras). E.g. `"how do I install X - pip name, python version, async extras?"`

## Sources

| Dep | Nia identifier | Type |
|---|---|---|
| `fastmcp` | `PrefectHQ/fastmcp` | repository |
| AWS SDK (`boto3`) | `https://docs.aws.amazon.com/` | documentation |
| `anthropic` | `https://platform.claude.com/docs` | documentation |
| `google-api-python-client` / `google-auth` | `googleapis/google-api-python-client` | repository |
| `notion-client` | `ramnes/notion-sdk-py` | repository |
| `fastapi` | `fastapi/fastapi` | repository |
| `azure-functions` / `azure-cosmos` | `Azure/azure-sdk-for-python` | repository |

## Examples

```bash
nia search query "OAuth2 installed app flow" --repos googleapis/google-api-python-client
nia search query "boto3 cosmos equivalent for dynamodb" --docs "https://docs.aws.amazon.com/"
nia repos tree fastapi/fastapi
nia repos read PrefectHQ/fastmcp src/fastmcp/server/app.py
nia repos grep ramnes/notion-sdk-py "query"

nia sources resolve "https://platform.claude.com/docs" --type documentation
nia sources tree <UUID>
nia sources read <UUID> build-with-claude/prompt-caching.md
nia sources grep <UUID> "cache_control"
```

### Multi-source query

```bash
# Example
nia search query "async http client patterns" \
  --repos fastapi/fastapi,PrefectHQ/fastmcp \
  --docs "https://platform.claude.com/docs"
```