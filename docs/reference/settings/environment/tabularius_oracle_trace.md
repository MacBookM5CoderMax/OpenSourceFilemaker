# TABULARIUS_ORACLE_TRACE

Writes Oracle TNS packet direction, type and length to stderr during transport debugging. No packet body is logged. The Oracle transport is unverified against a real server.

| Setting | Value |
| --- | --- |
| Default | Off |
| Accepted values | 1, true, yes or on to trace; 0, false, no, off or empty for off |
| Restart needed | No restart; read for each packet. |
| Explained in | [docs/environment-variables.md](../../../environment-variables.md) |
| Code | [packages/store/src/ess/oracle.ts:57](../../../../packages/store/src/ess/oracle.ts#L57) |

[All environment variables](../../../environment-variables.md)
