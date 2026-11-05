# TABULARIUS_XML_PUBLISHING_WRITES

Allows -new, -edit, -delete and -dup through XML publishing as POST forms. Requires fmxml and record privileges; browser writes must be same-origin. Scripts remain unavailable.

| Setting | Value |
| --- | --- |
| Default | Off: XML publishing only reads records |
| Accepted values | 1, true, yes or on; 0, false, no, off or empty for off; anything else stops `serve` |
| Restart needed | Set in the server environment before starting it. |
| Explained in | [docs/hosting-for-a-team.md](../../../hosting-for-a-team.md) |
| Code | [packages/cli/src/main.ts:1553](../../../../packages/cli/src/main.ts#L1553) |

[All environment variables](../../../environment-variables.md)
