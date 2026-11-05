# TABULARIUS_ESS_REFRESH_SECONDS

Minimum time between successful shadow-table mirror refreshes.

| Setting | Value |
| --- | --- |
| Default | 5 seconds |
| Accepted values | Whole number of seconds, 0 or more, digits only; 0 refreshes on every read |
| Restart needed | Read on each refresh. |
| Explained in | [docs/guides/running/external-sql-sources.md](../../../guides/running/external-sql-sources.md) |
| Code | [packages/store/src/ess/mirror.ts:69](../../../../packages/store/src/ess/mirror.ts#L69) |

[All environment variables](../../../environment-variables.md)
