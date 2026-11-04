# TABULARIUS_ESS_MAX_ROWS

Maximum number of rows a whole-table shadow refresh reads before it fails without changing the mirror.

| Setting | Value |
| --- | --- |
| Default | 100000 rows |
| Accepted values | Whole number of rows, 1 or more, digits only |
| Restart needed | Read on each refresh. |
| Explained in | [docs/guides/running/external-sql-sources.md](../../../guides/running/external-sql-sources.md) |
| Code | [packages/store/src/ess/mirror.ts:27](../../../../packages/store/src/ess/mirror.ts#L27) |

[All environment variables](../../../environment-variables.md)
