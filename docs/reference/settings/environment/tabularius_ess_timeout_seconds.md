# TABULARIUS_ESS_TIMEOUT_SECONDS

Deadline for each outside SQL driver call.

| Setting | Value |
| --- | --- |
| Default | 30 seconds |
| Accepted values | Whole number of seconds, 1 or more, digits only |
| Restart needed | Read on each call. |
| Explained in | [docs/guides/running/external-sql-sources.md](../../../guides/running/external-sql-sources.md) |
| Code | [packages/server/src/connections.ts:781](../../../../packages/server/src/connections.ts#L781) |

[All environment variables](../../../environment-variables.md)
