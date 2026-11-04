# TABULARIUS_ESS_POOL

Maximum connections per named outside SQL source; the core SQLite driver currently uses one.

| Setting | Value |
| --- | --- |
| Default | 4 connections |
| Accepted values | Whole number from 1 to 64, digits only |
| Restart needed | Yes for a running server. |
| Explained in | [docs/guides/running/external-sql-sources.md](../../../guides/running/external-sql-sources.md) |
| Code | [packages/store/src/ess/bridge.ts:51](../../../../packages/store/src/ess/bridge.ts#L51) |

[All environment variables](../../../environment-variables.md)
