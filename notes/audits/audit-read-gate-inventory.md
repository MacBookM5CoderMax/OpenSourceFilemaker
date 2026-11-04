# Read-gate inventory (r28-01)

This extends the generated privilege matrix already present in `docs/audit-privilege-matrix.md`, the store summary/related-privilege regressions, and `notes/audits/r22-02-cross-file-isolation.md`. Initial filename/content searches found no earlier r28-01 inventory, backlog, claims directory, or AGENTS.md in this checkout. Existing gates were retained. No private corpus or downloaded fixture was opened; all runtime inputs are generated. No real git command ran. There were no dependency changes, service operations, commits or pushes; the optional version probe was blocked by a command stub as described below.

The security policy is: an account-facing result must not disclose hidden fields, records, counts, found-set sizes, grouping, sort order or aggregates. A raw store/SQLite primitive is **not** an authorization boundary. Local operator operations, authenticated server administration, and internal materialization are separately classified below; they do not accept a restricted file account as authority. An omitted `Privileges` argument means trusted execution, not an anonymous caller.

## Public expectations and KNOWN

Public references establish the following principles; synthetic numeric results are computed from generated inputs, not claimed as vendor test results. No Claris instance was used.

| Expectation used by tests | Public page / short expression | Result expected here |
| --- | --- | --- |
| Row formula and hidden fields/tables | [Editing record access privileges](https://help.claris.com/en/pro-help/content/record-access-privileges.html): “No access”, “Boolean calculation” | Only the caller-owned row contributes; hidden fields/tables contribute no returned data. |
| Found-set cardinality and summaries | [Editing record access privileges](https://help.claris.com/en/pro-help/content/record-access-privileges.html): “found set is always filtered”, “exclude data” | One visible row; aggregate total 7 in the store regression, excluding the other row. |
| Record and layout checks both apply | [Get(RecordAccess)](https://help.claris.com/en/pro-help/content/get-recordaccess.html): “Get(LayoutAccess)” | Hidden parent/layout requests fail before portal counts. |
| Found-count meaning | [Get(FoundCount)](https://help.claris.com/en/pro-help/content/get-foundcount.html): “number of records” | Counts describe the visible found set, including portal paging and current dashboard counts. |
| Value lists and ordinary scripts | [Editing record access privileges](https://help.claris.com/en/pro-help/content/record-access-privileges.html): “does not display any values” | No hidden source values; caller-run scripts keep their account gates. |

| KNOWN | Status / boundary |
| --- | --- |
| Exact error envelopes, omission versus empty value, rejection of hidden sort/group fields | **Unverified Claris compatibility**. Tabularius security policy; the cited record-access page documents access restrictions, not these API representations. Existing protocol matrix expectations remain its own policy. |
| Live presence/event filtering, calendar headers, MCP tools, dashboards, saved digest prose and RAG spaces | **Unverified Claris compatibility**. Tabularius extensions. Expected results implement the stated invariant; there is no public Claris page establishing equivalent endpoints. |
| Historical digest payloads | Restricted readers receive run metadata with empty data/highlights and no saved prose. Re-run the dashboard for current filtered results. Existing snapshots have no row/field provenance. |
| AI digest prose for restricted accounts | Suppressed, because arbitrary prose cannot be re-filtered after row access changes. Current dashboard data remains available. |
| RAG snapshots | File-scoped documents have no row/field provenance. The server adapter now requires `readsEverything` on each operation. No claim of per-document RLA. |
| Internal/operator readers | Raw primitives have no account parameter. They are catalogued as trusted capabilities, with their account-facing caller boundary documented below. They are not independently safe to expose as routes. |
| Static inventory limits | Type-resolved references, aliases, bracket calls, destructured capabilities, raw SQLite statements and calculation/relationship reads are checked. Reflective/dynamically constructed property names and values erased to `any` are not a complete call-graph proof. |
| Runtime completeness | Generated tests exercise reader APIs and boundary families, including existing protocol matrices. They do **not** invoke every internal helper or every branch of every classified function as a restricted account. The inventory is exhaustive for the enumerated code APIs, not a claim of exhaustive execution coverage. |
| Operator diagnostics and outgoing hooks | Local diagnostics require filesystem/operator authority; change webhooks require server-admin configuration. Their internal builders do not accept a restricted account. Real service commands, thumbnail tools, external webhook/model calls and vendor conformance are unverified here. |
| Independent security review | A different-model review follows this change; it has not been performed by this author. |

## Reproduced gaps and fixes

Each row has a synthetic regression. Before fixes the four new store regressions failed; surface regressions reproduced the live and snapshot disclosures. Test data values are deliberately omitted from this report.

| Gap | Fix | Regression |
| --- | --- | --- |
| `sortIdsCurrent` trusted supplied ids and hidden sort columns | Layout/table/field checks plus record view filter before ordering | `store/test/read-gate.test.ts`: sortIds |
| `groupSummariesCurrent` grouped supplied ids and included hidden summary fields | Layout/table/group-key gate, visible ids, visible output summary fields | Same file: groupSummaries |
| `foundSetRowsCurrent` returned unfiltered supplied-id count and pagination | Filter before choosing the page and reporting count | Same file: foundSetRows |
| `portalCountsCurrent` accepted a hidden parent and reused restricted cached counts | Parent gate before fast paths; restricted callers recompute related counts | Same file: portalCounts; extended `privileges-everywhere.test.ts` cached related-row regression |
| Live locks/viewers and event ids used only table visibility | Per-record rules for snapshots, presence writes, individual events and bulk ids; missing/deleted restricted rows fail closed | `server/test/read-gate-surfaces.test.ts`: locks/viewers and fenced stream |
| Digest histories kept earlier, broader account data | Suppress unverifiable historical payloads for restricted readers on list/detail/runs routes | Same file: saved digest |
| Digest data/prose survived access changes across the summary await | Compare data/security stamps of hosted files before webhook handoff and after awaits; discard changed snapshots; release running state in `finally` | Same file: asynchronous digest, with an in-process poster |
| RAG file-only scope returned copied record data to restricted accounts | Server adapter checks unrestricted record/field visibility on every space operation; script engine also rejects restricted/scoped callers with custom backends | Same file: RAG adapter and script regressions, with generated vectors and no embedding request |

## Inventory generation and enforcement

`node scripts/read-gate-inventory.ts --check` scans only package source trees, resolves the declarations behind reads using the already installed TypeScript compiler, compares call-expression fingerprints and multiplicity with `read-gate-allowlist.json`, and checks this generated table. `node scripts/read-gate-inventory.ts` updates **only** the table after classification has been reviewed. There is deliberately no command to accept new call sites automatically.

The inventory contains **2,462 read/capability sites in 716 functions**. The initial discovery used `rg` over Store's read methods and their callers. The generator additionally includes direct `Store.sql` capability transfers, SQLite `prepare/get/all/iterate`, calculation and relationship reads, so SQL aliases and builders that bypass Store methods are visible. SQLite writes and schema/security reads are retained conservatively: their presence in the table does not mean they disclose record values. Each row names the enclosing function, every relevant source line, and its gate classification. New sites, changed call arguments, duplicate sites, removed sites and moved functions fail the allow-list test; shifting line numbers only requires regenerating the report.

The guard regression injects synthetic unlisted readers in memory, including aliases, bracket access and destructuring, without editing production source. It also checks duplicate call-site multiplicity. Passing the guard means classification is current, not that a fingerprint proves authorization: the `CORE` entries in particular are fingerprints of call text, so they show that a site did not change, not that its privilege argument is right (a `privileges` variable rebound upstream would go unnoticed).

The scan is a regression catcher, not a hard boundary. Resolution is by declaration file, so a member of a receiver typed `any` or `unknown` is reported by name (as `Untyped.<api>`). Everyday names (`get`, `find`, `select`, `query`, `row`, `describe`, `container`, `sql` and a few more) are reported only when the receiver is a Store, calculation engine or SQLite connection cast to `any`/`unknown`, directly, through a variable whose initialiser is the cast (up to four aliases deep) or by destructuring, and only for types declared in `store.ts`, `calc.ts`, `related.ts` or `node:sqlite`; on any other untyped value they would be a Map or an array. These are not found: a variable annotated `any` and assigned a reader instead of cast (`const a: any = s`, `let a: any; a = s`), an alias passed through a function parameter, an object property or an array element, a chain deeper than four, a function that returns `any`, a cast of a union, intersection or generic (`Store | Calculations`), a cast of a Store subclass declared in another file, a JSDoc cast in a `.mjs` file, `.prepare` or `.exec` on a SQLite connection cast to `any`, a computed key (`(s as any)[key]()`, `Reflect.get(s, 'find')`), a cast to a structural type, a call through a subclass that overrides the method in another file, and anything outside `packages/*/src`.

The inventory also classifies the authentication metadata reads in `Store.useRecoveryCode` and `Store.knownSharedAccount` as `CORE`. The former checks for an unused code matching the account and supplied code hash before consuming it and opening a session; the latter returns an internal account-existence boolean for sign-in lockout accounting. Both query security metadata rather than solution records, and neither returns the stored metadata to the caller.

## Route and gate ledger

The route dispatcher is `packages/server/src/index.ts`. The generated function inventory below expands these boundaries rather than replacing them with a filename-only exemption.

| ID | Entry/caller gate and data handling | Synthetic evidence |
| --- | --- | --- |
| REST | `DataApi.authorize` / `sessionPrivileges`, layout scope; `Store.find/get` apply record rules and field omission before count/data envelopes | privilege-matrix-dataapi, api-token |
| WEB | `WebClient.handle` session/layout gate; store readers receive privileges; groups/export reselect visible ids; history uses field/table concealment | privilege-matrix-web, read-gate |
| ODATA | `ODataEndpoint` authenticated privileges, visible entity sets/properties; select/count/compute and related readers pass privileges | privilege-matrix-odata |
| XML | `CwpXmlEndpoint` authentication/fmxml plus layout; `find/get` receive privileges | privilege-matrix-xml |
| SQL | HTTP `checkReadsEverything`, pgwire authentication and per-query privilege recheck, destination-file check; MCP `readsEverything` for raw SQL/formulas/numeric containers | privilege-matrix-sql, pgwire, mcp |
| MCP | `privilegesIn`, tool-specific layout/read gates; raw tools use SQL gate; `registerResources` uses `designAccess`/Full Access for whole-file resources | privilege-matrix-mcp |
| SCRIPT | ScriptEngine caller privileges, `reading`, found-set/value readers and calculation passes; related raw match ids filtered through destination `viewableIds`; export/print flags checked separately | privilege-matrix-scripts; store related/summary tests |
| GATED-STORE | `checkLayout`, local/destination privileges, `viewFilter`/`checkRecordRule`, field checks and `toRecord` masking; calculations carry privileges | read-gate, summary-privileges, privileges-everywhere |
| CALC | Calculation `Pass.privileges`, field visibility, visible related rows and `scopedTableSql`; raw materialization is internal and must not be returned directly | summary-privileges, privileges-everywhere |
| RELATED | Raw relationship primitives; caller supplies privileges or filters ids before exposure (`ScriptEngine.relatedIds`, store portals/calculation pass) | privileges-everywhere, protocol matrices |
| CALENDAR | Data API session/scoped token, readable mapping, `find(... privileges)` before event count/content | read-gate-surfaces |
| LIVE | Session per request/event, file binding, record gate for presence and event ids; design events require Full Access | read-gate-surfaces |
| CHANGE | Data API account refresh; table and `canViewRecord` check for record events. Configured webhook consumers are server-admin authority | existing change-feed code review; live synthetic fence |
| DASHBOARD | Saved definitions are metadata; `DashboardApi` computes widgets through `summarizeRecords` with requesting privileges | read-gate-surfaces |
| DIGEST | `mayRead` account ownership/Full Access plus restricted-history suppression; runner obtains current privileges and rechecks snapshot stamps before delivery | read-gate-surfaces |
| SUMMARY | `findIds` with privileges; visible grouping/measure fields; raw SELECT restricted to authorized ids, evaluated path carries privileges | read-gate-surfaces, privilege-matrix-mcp |
| PROFILE | `layoutProfile` field access and destination `viewableIds`; `columnProfile` operates on those ids. MCP layout gate precedes entry | read-gate-surfaces, privilege-matrix-mcp |
| SEARCH | Text/semantic search checks tables, visible fields, visible ids and readable layouts before hits; vectors read with privileges | privilege-matrix-mcp |
| RECORD | Explanation/context helpers use account-bearing calculation passes and visible related rows; route/tool checks parent record first | protocol matrices; related/summary tests |
| HISTORY | Web parent read gate and `hideField`/`hideTable` callbacks; MCP history is a design tool requiring Full Access | privilege-matrix-web, mcp |
| CONTAINER | Signed URL minted from privileged field read; the `index.ts` container route calls `Host.checkUrl` to validate signature, expiry and bound account identity/inactive state before raw container/range/thumbnail reads | protocol matrix container checks; actual thumbnail programs not run |
| DESIGN | `DesignApi`/`SecurityApi` Full Access; MCP design guard or `designAccess` (modifiable scripts plus readsEverything); debug Full Access. Sampling/diagnostic raw helpers inherit that caller gate | privilege-matrix-mcp, admin; static caller review |
| ADMIN | Separate server-admin authorization in `Admin.handle`/Admin API, not file credentials; includes logs/statistics | privilege-matrix-admin |
| AUTOMATION | Full Access configuration, saved execution account and current script privileges; stored run logs are privileged metadata/history | static caller review; protocol script matrix |
| CLEANUP | Scans/updates select visible ids and fields; raw undo/snapshot journal is internal to checked mutation paths; HTTP session and MCP caller gate | static caller review |
| IMPORT | Import route/layout/write privileges before target-key/undo journal access; configuration/history uses design/admin authority | static caller review |
| ACCOUNT | Assistant tool calls retain requesting account/file; model redaction does not replace the underlying read gate | protocol MCP matrix; RAG regression |
| RAG | `Assistant.scriptAi` adapter `checkRag`: current `readsEverything` plus model policy; ScriptEngine `checkRagRead` enforces account/ceiling gates; raw RagStore is an internal file-scoped cache | read-gate-surfaces |
| REDACTION | Raw secret/PII inspection is used to remove values or build account-scoped stand-ins; preview belongs to privileged design tools | static caller review |
| POLICY | SQL/AI policy inspection is an internal refusal path, not a returned record result | static caller review |
| AUTH | Account/token/identity/configuration SQL; authentication/session/admin gates, not solution record reads | protocol authentication matrices |
| JOIN | Worker receives only rows/columns already filtered by `ODataEndpoint.crossjoined`; its database is in memory | static caller review |
| OPERATOR | Local CLI/filesystem ownership, import/reconversion/sync/backup operator, or server-admin boundary; no restricted-account invocation of raw functions | static caller review; no real operator commands executed |
| INTERNAL | Summary warmer/materializer for internal caches; account-facing reads reapply gates | summary-privileges |
| CORE | Store/SQLite internals, security metadata, transactions and raw capabilities. **No independent account gate**; only the caller boundaries above authorize exposure | store and protocol regressions; static inventory |

## Validation

Run `node scripts/test-read-gate.ts` for the generated store/surface regressions and existing synthetic protocol matrix. It uses `--test-concurrency=2`, per-test timeout 55 seconds and a stub-only child PATH. Stubs for launchctl, systemctl, sc, git, npm, curl and sudo write a marker and exit 99; any marker fails the runner. Temporary synthetic release metadata prevents the existing optional git version probe, and is removed afterward. No tests are skipped or disabled.

Run `node --test --test-concurrency=2 packages/server/test/read-gate-inventory.test.ts` for the static guard, `node scripts/read-gate-inventory.ts --check` for report freshness, and `node node_modules/typescript/bin/tsc --noEmit --pretty false` for types.

Prior implementation runtime run (before this repair): **4,483 passed, 0 failed, 0 cancelled, 0 skipped**, across 20 generated-input test files in **126.52 s** total. The command-stub marker remained absent. The final inventory guard passed **3/3** in **17.11 s**; inventory freshness and TypeScript checks passed. Summed top-level test durations for the ten protocol files ranged from **12.15 to 26.69 s** (excluding module startup); the new store and surface regressions also remained well below the per-file budget. The live-stream fence has a 15-second failure bound, with observed event handling comfortably below one third of that bound. The combined hidden-field/hidden-table/row-rule solution also exercises REST, web export, XML, OData counts/aggregates, dashboards, and MCP filtered/denied readers. The first broad run passed 4,384 assertions but correctly **failed the runner** because its command stub caught the pre-existing optional version probe; synthetic build metadata removes that probe without weakening the marker check. Initial sandbox-only HTTP attempts could not bind loopback; subsequent runs used approved loopback execution.

## PR repair review after merging main

The post-merge baseline failed both inventory assertions (111 changed/unclassified fingerprints) and the cached portal-count cost assertion. Review covered each changed expression and its caller boundary. The repaired inventory has 2,454 read/capability sites in 713 functions; 33 functions carry explicit review reasons in the JSON allow-list. Obsolete `oauth.ts/passwordMark` and `calc.ts/Calculations/context/summary/group` inventory scopes were removed because their enumerated reads moved. No wildcard classifications or test relaxations were added.

Two reads required code fixes before classification: `Calculations/context/summary` could use a hidden break field or hidden summary field, and `Store/runningSummaryValues` could use a hidden restart field supplied through sort state. Both now check field visibility before reading those values. The synthetic regressions compare unrestricted results with concealed restricted results. These are Tabularius access invariants, not claims of documented Claris behavior.

`Store/portalCountsCurrent` now reuses account-free snapshot counts before querying design metadata. Every account-bearing call still resolves the current layout and checks layout/parent access before returning cached counts; restricted accounts still recompute related totals. Its new regression covers both layout argument forms, a newly hidden parent, and a layout-denied account whose record privileges otherwise read everything.

Repair validation uses generated stores only. Final regeneration and `node --no-warnings scripts/read-gate-inventory.ts --check` passed for all 2,454 sites; the final standalone inventory test run passed **3 tests, 0 failures, 0 skips** in 23.69 seconds. `npm run typecheck` passed both TypeScript projects. The focused command `node --no-warnings --test --test-concurrency=2 packages/server/test/read-gate-inventory.test.ts packages/store/test/related-path-cost.test.ts packages/store/test/read-gate.test.ts packages/store/test/summary-aggregates-generated.test.ts` passed **18 tests, 0 failures, 0 skips** in 19.81 seconds.

Each new regression was checked in a temporary source copy with only its corresponding production fix removed. The portal snapshot test, hidden GetSummary key test, and hidden running-restart test each failed as expected (**7 passed, 1 failed** per run). Restoring the pre-repair allow-list in that copy reproduced both inventory assertion failures (**1 passed, 2 failed**). The working tree was never reverted. The three new store tests completed in a file comfortably below the 60-second target; none adds timing assertions.

The initial `node scripts/test-read-gate.ts` run reached its existing 180-second overall timeout; the admin matrix also reached its existing 55-second file timeout while other checks were running. It emitted 3,719 passing test lines and one failing file line before interruption; those are partial counts. Admin rerun alone with the same 55-second file limit passed **298 tests, 0 failures, 0 skips** in 30.00 seconds. The other 19 files were rerun with the same concurrency and file limit: **4,187 passed, 1 failed, 0 skipped** in 147.11 seconds. The failure was the digest-history regression reusing a session after privilege changes; main now invalidates that session. The test now additionally asserts HTTP 401 for the revoked session, signs in again, and retains all three HTTP 200 plus hidden-data checks. `node scripts/test-read-gate.ts --surfaces` then passed **27 tests, 0 failures, 0 skips** in 4.42 seconds. Reverting only this test repair in a temporary copy reproduced the stale-session assertion (**26 passed, 1 failed**). Across the latest results for all 20 PR runtime files, **4,486 tests passed, 0 failed, 0 skipped**. All spawned test processes used the marker-writing forbidden-command stubs; no timeout or test was edited.

The broader reruns use `node --no-warnings --test --test-concurrency=2 --test-timeout=55000` under the same stub-only child environment as the PR runner. Files run:

- `packages/store/test/`: `read-gate.test.ts`, `summary-privileges.test.ts`, `found-set-portal.test.ts`, `privileges-everywhere.test.ts`.
- `packages/scripts/test/`: `ai-steps.test.ts`.
- `packages/server/test/`: `read-gate-surfaces.test.ts`, `rag-store.test.ts`, `rag-hybrid.test.ts`, `r15-rag-ai.test.ts`, `calendar-feed.test.ts`, `privilege-matrix-admin.test.ts`, `privilege-matrix-api-token.test.ts`, `privilege-matrix-dataapi.test.ts`, `privilege-matrix-mcp.test.ts`, `privilege-matrix-odata.test.ts`, `privilege-matrix-pgwire.test.ts`, `privilege-matrix-scripts.test.ts`, `privilege-matrix-sql.test.ts`, `privilege-matrix-web.test.ts`, `privilege-matrix-xml.test.ts`.

Also red on main, per the repair brief: `packages/store/test/consistency.test.ts` retains its four pre-existing failing TODO probes (SQL accent equality, date overflow, time overflow, web date normalization). The reported `packages/server/test/container-large-files.test.ts` peak-memory failure did not reproduce here after loopback access was allowed. Combined rerun: **10 passed, 0 hard failures, 4 existing TODO failures**, 12.34 seconds. The initial sandbox run had **9 passed, 1 loopback setup failure, 4 TODO failures**. Neither file was changed.

The following reasons apply to the exact enumerated expressions in each named function. Raw internal materialization and security bookkeeping are explicitly identified as trusted capabilities; they are not independently authorized readers.

| File / function | Gate | Reviewed boundary or repair |
| --- | --- | --- |
| `packages/store/src/store.ts` / `Store/checkProposedWrite`, `Store/gateAgentWrite`, `Store/approvePending`, `Store/constructor` | CORE | Approval preflight reads the target and first related rows only to evaluate the same layout, record and field checks as direct writes, before any proposal/event. The constructor adds a nullable credential-ceiling column; queue/replay SQL stores and restores only that ceiling. Replay narrows current agent privileges, and a refused replay retains its proposal. |
| `packages/scripts/src/engine.ts` / `ScriptEngine/record` | SCRIPT | Store.get receives the current script privileges; getCurrent checks the saved row before overlaying pending edits and masks hidden fields. The cache key includes the privilege fingerprint. |
| `packages/scripts/src/engine.ts` / `ScriptEngine/newRecord` | SCRIPT | The other-window found-set comparison calls findIds with this.reading, which carries the current script privileges; findIdsHere applies viewFilter before returning ids. |
| `packages/server/src/backup.ts` / `stageRestorePoint` | OPERATOR | The new SQLite existence probes inspect only a staged restore copy to refuse unsupported external-container replay. Entry is through local restoreAt or server-admin restorePointTo; no record payload is returned. |
| `packages/server/src/containers.ts` / `ContainerFiles/make` | CONTAINER | The new containerInfo read bounds thumbnail input after index.ts validates the signed URL through Host.checkUrl (signature, expiry and bound account identity/inactive state). This private helper is not a route. |
| `packages/server/src/containers.ts` / `ContainerFiles/makeAdmitted` | CONTAINER | The container byte read moved from make into this private admitted helper; it inherits index.ts/Host.checkUrl signed-URL validation and returns only the authorized container thumbnail. |
| `packages/server/src/oauth.ts` / `legacyPasswordMark` | AUTH | Renamed legacy password fingerprint helper: account row id/password hash are hashed for grant validation and startup migration, never returned as solution data or raw credentials. |
| `packages/server/src/oauth.ts` / `OAuthServer/constructor` | AUTH | Startup migration reads refresh grants and matching account/token provenance, relabels valid legacy delegated credentials and revokes invalid grants. These are internal authentication tables, not record results. |
| `packages/server/src/webclient.ts` / `WebClient/refresh` | WEB | getMany retains the session privileges while adding sort state; getManyCurrent filters supplied ids/found-set rows and toRecord masks fields. Hidden summary break/restart fields are now explicitly suppressed. |
| `packages/server/src/webclient.ts` / `WebClient/records` | WEB | foundIds selects visible records and getMany receives session privileges with sort state; its row filter and field masking remain in force, including the repaired summary key checks. |
| `packages/server/src/webclient.ts` / `WebClient/exportRecords` | WEB | canExport is checked, foundIds receives privileges, and each getMany batch retains them while adding sort state; hidden fields are omitted and masked fields export empty. |
| `packages/server/src/webclient.ts` / `WebClient/aiReplace` | WEB | The AI access and editable target-field checks precede getMany batches carrying session privileges; only visible rows/fields reach model input, with secret/container redaction afterward. |
| `packages/store/src/calc.ts` / `Calculations/computed` | CALC | The repetition-aware context retains the caller's Pass, including privileges. User-facing context field reads enforce field visibility; internal stored passes remain trusted materialization. |
| `packages/store/src/calc.ts` / `Calculations/context/summary` | CALC | Repaired: refuse hidden summary and break fields before direct value reads. Found-set rows come from the checked Store caller; the break-key pass carries privileges. related.clear is cache maintenance, not a record read. |
| `packages/store/src/calc.ts` / `Calculations/beforeWrite` | CORE | Repetition-aware contexts compute persisted auto-enter/stored values inside checked create/update paths. This is intentionally full-data internal materialization, not an independently account-gated reader; later toRecord/context reads apply visibility. |
| `packages/store/src/calc.ts` / `Calculations/computeStoredStyled` | CORE | Repetition-aware contexts materialize stored calculation values and styles for internal write/recompute callers. No account gate exists here; returned storage values are exposed only through checked record/calculation readers. |
| `packages/store/src/store.ts` / `Store/constructor` | CORE | The Store.sql references register deterministic sort-key, first-repetition and SQL substring functions. They do not read or return solution rows; opening the raw store remains an operator/internal capability. |
| `packages/store/src/store.ts` / `Store/joinTransaction` | CORE | The new createSession capability records pending transaction changes after transaction ownership checks. It is private write bookkeeping, with no account-facing row result. |
| `packages/store/src/store.ts` / `Store/independentWindowWrite` | CORE | ScriptEngine.via invokes this for checked create/update/delete/container operations in another window. The raw audit read retains only held transaction audit entries for internal replay and hash relinking; it is not returned to the caller. No independent read authorization is claimed. |
| `packages/store/src/store.ts` / `Store/setPassword` | AUTH | The new statement deletes delegated API tokens during securityChange. Password/security callers enforce their own account or Full Access authority; this raw mutation primitive does not return credential rows. |
| `packages/store/src/store.ts` / `Store/setAccountActive` | AUTH | The added statements rotate identity and revoke account/person/mapping tokens on deactivation inside securityChange. SecurityApi requires Full Access; script account-management callers check their authority. No solution data is returned. |
| `packages/store/src/store.ts` / `Store/signInMark` | AUTH | The new prepared statement persists an authentication generation after rereading the current fingerprint under ledgerWrite. Only generation plus a cryptographic fingerprint leaves this internal helper. |
| `packages/store/src/store.ts` / `Store/signInBase` | AUTH | Reads identity/password metadata solely to hash credentials and authority for session invalidation; raw metadata is not returned. |
| `packages/store/src/store.ts` / `Store/signInBase/identity` | AUTH | Reads only the selected mapping/person identity id into signInBase's hash; no solution records or raw credentials are exposed. |
| `packages/store/src/store.ts` / `Store/ledgerRow` | AUTH | Private schema-presence and main sign-in-ledger reads serve signInMark/settleSignIns. The generation is validated; ledger rows remain inside authentication bookkeeping. |
| `packages/store/src/store.ts` / `Store/ledgerWrite` | AUTH | Private SQL capabilities create the sign-in ledger and manage its transaction. Used only by signInMark/settleSignIns; no record-result exposure or independent account gate is claimed. |
| `packages/store/src/store.ts` / `Store/settleSignIns` | AUTH | Private securityChange bookkeeping reads live account names and ledger keys, removes obsolete identities and advances generations atomically. These internal authentication lists are not returned to clients. |
| `packages/store/src/store.ts` / `Store/savePrivilegeSet` | AUTH | The added token deletion revokes credentials for accounts whose authority changed. SecurityApi requires Full Access and internal bootstrap uses operator authority; no record data is returned. |
| `packages/store/src/store.ts` / `Store/setAccountPrivilegeSet` | AUTH | The added token deletion revokes credentials when an account's effective set changes. Security/admin/script-management callers authorize the mutation; this raw security primitive exposes no record rows. |
| `packages/store/src/store.ts` / `Store/portalCountsCurrent` | GATED-STORE | Account-bearing calls resolve the current layout and checkLayout/canView before any cached count. Only account-free snapshots bypass metadata refresh; restricted callers recompute related counts. |
| `packages/store/src/store.ts` / `Store/findHere` | GATED-STORE | The running-summary id query and repeated found-set portal query use where/params already combined with viewFilter; checkFieldsVisible validates find/sort fields and the public find entry checks the layout. |
| `packages/store/src/store.ts` / `Store/runningSummaryValues` | GATED-STORE | viewableIds filters rows before accumulation and source fields are checked with fieldHidden. Repaired: hidden restart fields in supplied sort state suppress the running result before calc.value; pass privileges follow calculations. related.clear only clears a cache. |
| `packages/store/src/store.ts` / `Store/getCurrent` | GATED-STORE | checkLayout and checkRecordRule precede pending-edit overlay; running-summary ids use viewFilter and toRecord masks output. opts.row references are typed row-supply capability references, not additional SQL reads. |
| `packages/store/src/store.ts` / `Store/groupSummariesCurrent` | GATED-STORE | Layout/table/group-key checks and viewableIds filter supplied ids before fraction totals collect rowsById; visible summary definitions and a privilege-bearing calculation pass govern aggregation. |
| `packages/server/src/pgwrite.ts` / `executeWrite/reader` | SQL | SQL writes (`--sql-writes`) read the table to find the records a WHERE names and to work out each new value. They run as the signed-in account, which already passed the SQL connection's gate (fmxdbc, reads every record and field) and the table's create, edit or delete privilege and the written fields' modify rights before the first read. The changes themselves go through Store.create, update and delete with the account's privileges, so every record rule and audit entry applies there. |
| `packages/server/src/pgwrite.ts` / `returningColumns` | SQL | Describes the columns RETURNING gives back (names and declared types only, no rows) for the account's own table. |
| `packages/store/src/store.ts` / `Store/selectIn` | CORE | Reads through Store.select, or, for the caller that holds the file's open transaction, through the connection holding it. No account gate here: the PostgreSQL connection checks fmxdbc and reads-everything before it calls. |
| `packages/store/src/store.ts` / `Store/selectHeldCurrent` | CORE | The same query screening as Store.select (readOnlyChecked), run on the writable connection so a transaction sees its own uncommitted changes. Only text that passed the read-only screening reaches that connection. |

<!-- generated read-gate inventory -->
| Function | Store read / capability (source lines) | Gate |
| --- | --- | --- |
| [packages/cli/src/diagnostics.ts:207](../../packages/cli/src/diagnostics.ts#L207) `designCopy` | `SQLite.all` (207); `SQLite.prepare` (207, 210) | OPERATOR |
| [packages/cli/src/diagnostics.ts:447](../../packages/cli/src/diagnostics.ts#L447) `diagnostics` | `SQLite.get` (447); `SQLite.prepare` (447, 451); `SQLite.all` (451) | OPERATOR |
| [packages/cli/src/doctor.ts:140](../../packages/cli/src/doctor.ts#L140) `accountChecks` | `SQLite.all` (140); `SQLite.prepare` (140) | OPERATOR |
| [packages/cli/src/main.ts:757](../../packages/cli/src/main.ts#L757) `accountsWithPasswordOff` | `SQLite.all` (757); `SQLite.prepare` (757) | OPERATOR |
| [packages/cli/src/main.ts:790](../../packages/cli/src/main.ts#L790) `hostedRead` | `SQLite.all` (790, 793); `SQLite.prepare` (790, 793); `Store.sql` (790, 793) | OPERATOR |
| [packages/cli/src/main.ts:2529](../../packages/cli/src/main.ts#L2529) `main` | `Store.orphanContainerReport` (2529); `Store.auditLog` (3009); `SQLite.get` (3278); `SQLite.prepare` (3278) | OPERATOR |
| [packages/scripts/src/data-api-step.ts:104](../../packages/scripts/src/data-api-step.ts#L104) `respond` | `Store.get` (104, 131, 140); `Store.find` (105, 117) | SCRIPT |
| [packages/scripts/src/engine.ts:9460](../../packages/scripts/src/engine.ts#L9460) `clearRecords` | `SQLite.all` (9460); `SQLite.prepare` (9460) | SCRIPT |
| [packages/scripts/src/engine.ts:8227](../../packages/scripts/src/engine.ts#L8227) `ScriptEngine/containerFile` | `Store.get` (8227); `Store.containerId` (8228); `Store.container` (8229) | SCRIPT |
| [packages/scripts/src/engine.ts:5778](../../packages/scripts/src/engine.ts#L5778) `ScriptEngine/design` | `Store.valueListItems` (5778) | SCRIPT |
| [packages/scripts/src/engine.ts:6538](../../packages/scripts/src/engine.ts#L6538) `ScriptEngine/exportField` | `Store.get` (6538); `Store.containerId` (6539); `Store.container` (6541) | SCRIPT |
| [packages/scripts/src/engine.ts:8647](../../packages/scripts/src/engine.ts#L8647) `ScriptEngine/fileMakerRows` | `Store.findIds` (8647); `Store.get` (8652) | SCRIPT |
| [packages/scripts/src/engine.ts:3396](../../packages/scripts/src/engine.ts#L3396) `ScriptEngine/findIdsCooperative` | `Store.findIdsProgress` (3396) | SCRIPT |
| [packages/scripts/src/engine.ts:2363](../../packages/scripts/src/engine.ts#L2363) `ScriptEngine/foundSet` | `Store.findIds` (2363) | SCRIPT |
| [packages/scripts/src/engine.ts:5618](../../packages/scripts/src/engine.ts#L5618) `ScriptEngine/get` | `Store.findIds` (5618); `Store.canViewRecord` (5711); `Store.get` (5747) | SCRIPT |
| [packages/scripts/src/engine.ts:2017](../../packages/scripts/src/engine.ts#L2017) `ScriptEngine/goToLayout` | `Store.findIds` (2017) | SCRIPT |
| [packages/scripts/src/engine.ts:8418](../../packages/scripts/src/engine.ts#L8418) `ScriptEngine/importRecords` | `Store.get` (8418) | SCRIPT |
| [packages/scripts/src/engine.ts:5890](../../packages/scripts/src/engine.ts#L5890) `ScriptEngine/lookupNext` | `Store.get` (5890); `Store.row` (5891); `Calculations.context` (5893) | SCRIPT |
| [packages/scripts/src/engine.ts:5421](../../packages/scripts/src/engine.ts#L5421) `ScriptEngine/newCalcContext/executeSQL` | `Calculations.executeSQL` (5421) | SCRIPT |
| [packages/scripts/src/engine.ts:5429](../../packages/scripts/src/engine.ts#L5429) `ScriptEngine/newCalcContext/persistentData` | `Store.persistentData` (5429) | SCRIPT |
| [packages/scripts/src/engine.ts:5430](../../packages/scripts/src/engine.ts#L5430) `ScriptEngine/newCalcContext/persistentDataIds` | `Store.persistentDataIds` (5430) | SCRIPT |
| [packages/scripts/src/engine.ts:8687](../../packages/scripts/src/engine.ts#L8687) `ScriptEngine/newRecord` | `Store.findIds` (8687) | SCRIPT |
| [packages/scripts/src/engine.ts:9067](../../packages/scripts/src/engine.ts#L9067) `ScriptEngine/quickFind` | `Store.get` (9067) | SCRIPT |
| [packages/scripts/src/engine.ts:5832](../../packages/scripts/src/engine.ts#L5832) `ScriptEngine/record` | `Store.get` (5832) | SCRIPT |
| [packages/scripts/src/engine.ts:5993](../../packages/scripts/src/engine.ts#L5993) `ScriptEngine/relatedIds` | `Store.findIds` (5993); `rowsById` (6001); `Store.select` (6005); `Store.matchIds` (6019); `Store.viewableIds` (6042) | SCRIPT |
| [packages/scripts/src/engine.ts:6027](../../packages/scripts/src/engine.ts#L6027) `ScriptEngine/relatedIds/matching` | `Store.matchIds` (6027) | SCRIPT |
| [packages/scripts/src/engine.ts:6692](../../packages/scripts/src/engine.ts#L6692) `ScriptEngine/relookup` | `Store.get` (6692) | SCRIPT |
| [packages/scripts/src/engine.ts:3553](../../packages/scripts/src/engine.ts#L3553) `ScriptEngine/revertTransaction` | `Store.findIds` (3553) | SCRIPT |
| [packages/scripts/src/engine.ts:3410](../../packages/scripts/src/engine.ts#L3410) `ScriptEngine/sortIdsCooperative` | `Store.sortIdsProgress` (3410) | SCRIPT |
| [packages/scripts/src/engine.ts:3438](../../packages/scripts/src/engine.ts#L3438) `ScriptEngine/sortIdsProgress` | `Store.sortIdsProgress` (3438); `Store.valueListItems` (3444) | SCRIPT |
| [packages/scripts/src/engine.ts:7474](../../packages/scripts/src/engine.ts#L7474) `ScriptEngine/sourceValue` | `Store.get` (7474); `Store.containerId` (7475); `Store.container` (7476) | SCRIPT |
| [packages/scripts/src/engine.ts:3347](../../packages/scripts/src/engine.ts#L3347) `ScriptEngine/sqlByNaturalLanguage` | `Calculations.translateSQL` (3347); `Calculations.executeSQL` (3354) | SCRIPT |
| [packages/scripts/src/engine.ts:4142](../../packages/scripts/src/engine.ts#L4142) `ScriptEngine/step` | `Store.fieldIndex` (4142) | SCRIPT |
| [packages/scripts/src/engine.ts:5865](../../packages/scripts/src/engine.ts#L5865) `ScriptEngine/valueOf` | `Store.findIds` (5865, 5865); `Store.containerId` (5873) | SCRIPT |
| [packages/scripts/src/recorder.ts:83](../../packages/scripts/src/recorder.ts#L83) `lastSeq` | `Store.auditLog` (83) | DESIGN |
| [packages/scripts/src/recorder.ts:121](../../packages/scripts/src/recorder.ts#L121) `recordRun` | `Store.auditLog` (121) | DESIGN |
| [packages/scripts/src/script-tests.ts:213](../../packages/scripts/src/script-tests.ts#L213) `runCase` | `Store.findIds` (213); `Store.auditLog` (220, 221, 265); `Store.evaluateEach` (248) | DESIGN |
| [packages/scripts/src/testrun.ts:306](../../packages/scripts/src/testrun.ts#L306) `recordWith` | `Store.evaluateEach` (306) | DESIGN |
| [packages/scripts/src/testrun.ts:199](../../packages/scripts/src/testrun.ts#L199) `seedSelections` | `Calculations.globalValue` (199); `Store.find` (204) | DESIGN |
| [packages/scripts/src/testrun.ts:338](../../packages/scripts/src/testrun.ts#L338) `testRun` | `Store.evaluateEach` (338) | DESIGN |
| [packages/scripts/src/testrun.ts:270](../../packages/scripts/src/testrun.ts#L270) `testScript` | `Store.findIds` (270) | DESIGN |
| [packages/server/src/admin.ts:2575](../../packages/server/src/admin.ts#L2575) `Admin/audit` | `Store.auditLog` (2575) | ADMIN |
| [packages/server/src/admin.ts:1198](../../packages/server/src/admin.ts#L1198) `Admin/handle` | `Store.externalContainerReport` (1198); `Store.orphanContainerReport` (1203, 1207) | ADMIN |
| [packages/server/src/admin.ts:3015](../../packages/server/src/admin.ts#L3015) `Admin/status` | `Store.externalContainerCount` (3015) | ADMIN |
| [packages/server/src/admin.ts:2658](../../packages/server/src/admin.ts#L2658) `Admin/viewAs` | `Store.find` (2658) | ADMIN |
| [packages/server/src/agent.ts:320](../../packages/server/src/agent.ts#L320) `dryRunPlan` | `Store.findIds` (320) | DESIGN |
| [packages/server/src/agent.ts:343](../../packages/server/src/agent.ts#L343) `runApprovedStep` | `Store.findIds` (343) | DESIGN |
| [packages/server/src/agent.ts:164](../../packages/server/src/agent.ts#L164) `runStep` | `Store.findIds` (164); `Store.auditLog` (233); `Store.canViewRecord` (245) | DESIGN |
| [packages/server/src/agent.ts:156](../../packages/server/src/agent.ts#L156) `runStep/visible` | `Store.findIds` (156) | DESIGN |
| [packages/server/src/ai-output.ts:147](../../packages/server/src/ai-output.ts#L147) `storedSecretValues` | `Calculations.globalValue` (147); `Store.select` (152) | REDACTION |
| [packages/server/src/ai-policy-sql.ts:49](../../packages/server/src/ai-policy-sql.ts#L49) `sqlFieldRefs` | `SQLite.all` (49, 51); `SQLite.prepare` (49, 51) | POLICY |
| [packages/server/src/ai-policy.ts:355](../../packages/server/src/ai-policy.ts#L355) `sql` | `Store.inspectQuery` (355) | POLICY |
| [packages/server/src/ai-usage.ts:201](../../packages/server/src/ai-usage.ts#L201) `AiUsage/add` | `SQLite.prepare` (201, 204) | AUTH |
| [packages/server/src/ai-usage.ts:250](../../packages/server/src/ai-usage.ts#L250) `AiUsage/importOld` | `SQLite.prepare` (250, 260, 268, 272) | AUTH |
| [packages/server/src/ai-usage.ts:186](../../packages/server/src/ai-usage.ts#L186) `AiUsage/month` | `SQLite.get` (186); `SQLite.prepare` (186) | AUTH |
| [packages/server/src/ai-usage.ts:212](../../packages/server/src/ai-usage.ts#L212) `AiUsage/question` | `SQLite.prepare` (212, 214, 215, 217) | AUTH |
| [packages/server/src/ai-usage.ts:193](../../packages/server/src/ai-usage.ts#L193) `AiUsage/recent` | `SQLite.all` (193); `SQLite.prepare` (193) | AUTH |
| [packages/server/src/ai-usage.ts:179](../../packages/server/src/ai-usage.ts#L179) `AiUsage/today` | `SQLite.get` (179); `SQLite.prepare` (179) | AUTH |
| [packages/server/src/assistant.ts:2159](../../packages/server/src/assistant.ts#L2159) `Assistant/answer` | `Store.find` (2159) | ACCOUNT |
| [packages/server/src/automations.ts:437](../../packages/server/src/automations.ts#L437) `AutomationRunner/changed` | `Store.auditLog` (437) | AUTOMATION |
| [packages/server/src/automations.ts:468](../../packages/server/src/automations.ts#L468) `AutomationRunner/run` | `Store.select` (468); `Store.canViewRecord` (478); `Store.evaluateEach` (481); `Store.evaluate` (487) | AUTOMATION |
| [packages/server/src/automations.ts:514](../../packages/server/src/automations.ts#L514) `AutomationRunner/runDeleted` | `Store.auditLog` (514) | AUTOMATION |
| [packages/server/src/automations.ts:309](../../packages/server/src/automations.ts#L309) `dryRunAutomation` | `Store.canViewRecord` (309); `Store.findIds` (309); `Store.auditLog` (325, 353, 361); `Store.select` (338); `Store.evaluate` (354) | AUTOMATION |
| [packages/server/src/automations.ts:308](../../packages/server/src/automations.ts#L308) `dryRunAutomation/truth` | `Store.evaluateEach` (308) | AUTOMATION |
| [packages/server/src/automations.ts:196](../../packages/server/src/automations.ts#L196) `Saved/delete` | `SQLite.prepare` (196, 198); `Store.sql` (196, 198) | AUTOMATION |
| [packages/server/src/automations.ts:180](../../packages/server/src/automations.ts#L180) `Saved/list` | `SQLite.all` (180); `SQLite.prepare` (180); `Store.sql` (180) | AUTOMATION |
| [packages/server/src/automations.ts:203](../../packages/server/src/automations.ts#L203) `Saved/logRun` | `SQLite.prepare` (203, 205); `Store.sql` (203, 205) | AUTOMATION |
| [packages/server/src/automations.ts:210](../../packages/server/src/automations.ts#L210) `Saved/runs` | `SQLite.all` (210); `SQLite.prepare` (210); `Store.sql` (210) | AUTOMATION |
| [packages/server/src/automations.ts:190](../../packages/server/src/automations.ts#L190) `Saved/save` | `SQLite.prepare` (190); `Store.sql` (190) | AUTOMATION |
| [packages/server/src/automations.ts:169](../../packages/server/src/automations.ts#L169) `Saved/table` | `Store.sql` (169, 170) | AUTOMATION |
| [packages/server/src/backup-verify.ts:152](../../packages/server/src/backup-verify.ts#L152) `testRestore` | `Store.recordCount` (152) | OPERATOR |
| [packages/server/src/backup.ts:1188](../../packages/server/src/backup.ts#L1188) `accountDifferences/read` | `SQLite.all` (1188, 1190); `SQLite.prepare` (1188, 1190) | OPERATOR |
| [packages/server/src/backup.ts:1301](../../packages/server/src/backup.ts#L1301) `columnInfo` | `SQLite.all` (1301); `SQLite.prepare` (1301) | OPERATOR |
| [packages/server/src/backup.ts:1245](../../packages/server/src/backup.ts#L1245) `credentialsReadable` | `SQLite.all` (1245); `SQLite.prepare` (1245) | OPERATOR |
| [packages/server/src/backup.ts:1215](../../packages/server/src/backup.ts#L1215) `readNames` | `SQLite.all` (1215); `SQLite.prepare` (1215) | OPERATOR |
| [packages/server/src/backup.ts:1336](../../packages/server/src/backup.ts#L1336) `reconcileCredentials` | `SQLite.all` (1336, 1358, 1373, 1383, 1389); `SQLite.prepare` (1336, 1344, 1358, 1360, 1373, 1374, 1381, 1383, 1384, 1389, 1390, 1394, 1395, 1396); `SQLite.get` (1344, 1394) | OPERATOR |
| [packages/server/src/backup.ts:1363](../../packages/server/src/backup.ts#L1363) `reconcileCredentials/accountColumns` | `SQLite.all` (1363); `SQLite.prepare` (1363) | OPERATOR |
| [packages/server/src/backup.ts:1339](../../packages/server/src/backup.ts#L1339) `reconcileCredentials/has` | `SQLite.all` (1339); `SQLite.prepare` (1339) | OPERATOR |
| [packages/server/src/backup.ts:1272](../../packages/server/src/backup.ts#L1272) `retainCurrentRecordIdMarks` | `SQLite.prepare` (1272, 1283, 1284, 1285); `SQLite.all` (1274, 1284); `SQLite.get` (1283) | OPERATOR |
| [packages/server/src/backup.ts:1511](../../packages/server/src/backup.ts#L1511) `stageRestorePoint` | `SQLite.get` (1511, 1513, 1514); `SQLite.prepare` (1511, 1513, 1514) | OPERATOR |
| [packages/server/src/calendar.ts:389](../../packages/server/src/calendar.ts#L389) `CalendarFeeds/feed` | `Store.find` (389) | CALENDAR |
| [packages/server/src/changes.ts:196](../../packages/server/src/changes.ts#L196) `ChangeFeed/visible` | `Store.canViewRecord` (196) | CHANGE |
| [packages/server/src/cleanup.ts:748](../../packages/server/src/cleanup.ts#L748) `applyCleanup/apply` | `Store.findIds` (748, 758); `SQLite.all` (749); `SQLite.prepare` (749, 786); `Store.sql` (749, 786); `SQLite.get` (786) | CLEANUP |
| [packages/server/src/cleanup.ts:1052](../../packages/server/src/cleanup.ts#L1052) `CleanupJournal/add` | `SQLite.prepare` (1052); `Store.sql` (1052) | CLEANUP |
| [packages/server/src/cleanup.ts:1047](../../packages/server/src/cleanup.ts#L1047) `CleanupJournal/append` | `SQLite.prepare` (1047); `Store.sql` (1047) | CLEANUP |
| [packages/server/src/cleanup.ts:1038](../../packages/server/src/cleanup.ts#L1038) `CleanupJournal/constructor` | `Store.sql` (1038) | CLEANUP |
| [packages/server/src/cleanup.ts:1058](../../packages/server/src/cleanup.ts#L1058) `CleanupJournal/get` | `SQLite.get` (1058); `SQLite.prepare` (1058); `Store.sql` (1058) | CLEANUP |
| [packages/server/src/cleanup.ts:1063](../../packages/server/src/cleanup.ts#L1063) `CleanupJournal/list` | `SQLite.all` (1063); `SQLite.prepare` (1063); `Store.sql` (1063) | CLEANUP |
| [packages/server/src/cleanup.ts:1067](../../packages/server/src/cleanup.ts#L1067) `CleanupJournal/markUndone` | `SQLite.prepare` (1067); `Store.sql` (1067) | CLEANUP |
| [packages/server/src/cleanup.ts:524](../../packages/server/src/cleanup.ts#L524) `findDuplicates` | `Store.findIds` (524) | CLEANUP |
| [packages/server/src/cleanup.ts:886](../../packages/server/src/cleanup.ts#L886) `journalDeletes` | `SQLite.get` (886); `SQLite.prepare` (886); `Store.sql` (886) | CLEANUP |
| [packages/server/src/cleanup.ts:618](../../packages/server/src/cleanup.ts#L618) `keyValue` | `SQLite.get` (618); `SQLite.prepare` (618); `Store.sql` (618) | CLEANUP |
| [packages/server/src/cleanup.ts:622](../../packages/server/src/cleanup.ts#L622) `relatedIds` | `SQLite.all` (622); `SQLite.prepare` (622); `Store.sql` (622) | CLEANUP |
| [packages/server/src/cleanup.ts:328](../../packages/server/src/cleanup.ts#L328) `scanData` | `Store.findIds` (328); `Store.select` (334) | CLEANUP |
| [packages/server/src/cleanup.ts:817](../../packages/server/src/cleanup.ts#L817) `snapshotField` | `SQLite.all` (817); `SQLite.prepare` (817); `Store.sql` (817) | CLEANUP |
| [packages/server/src/cleanup.ts:877](../../packages/server/src/cleanup.ts#L877) `snapshotRows` | `SQLite.all` (877); `SQLite.prepare` (877); `Store.sql` (877) | CLEANUP |
| [packages/server/src/cleanup.ts:998](../../packages/server/src/cleanup.ts#L998) `undoCleanup` | `SQLite.get` (998, 1014); `SQLite.prepare` (998, 1014); `Store.sql` (998, 1014) | CLEANUP |
| [packages/server/src/cleanup.ts:936](../../packages/server/src/cleanup.ts#L936) `updateMany` | `Store.findIds` (936) | CLEANUP |
| [packages/server/src/compaction.ts:65](../../packages/server/src/compaction.ts#L65) `compactStore` | `SQLite.get` (65, 66, 80, 88); `SQLite.prepare` (65, 66, 80, 88) | OPERATOR |
| [packages/server/src/compare.ts:206](../../packages/server/src/compare.ts#L206) `count` | `Store.query` (206) | DESIGN |
| [packages/server/src/containers.ts:301](../../packages/server/src/containers.ts#L301) `ContainerFiles/make` | `Store.containerInfo` (301) | CONTAINER |
| [packages/server/src/containers.ts:313](../../packages/server/src/containers.ts#L313) `ContainerFiles/makeAdmitted` | `Store.container` (313) | CONTAINER |
| [packages/server/src/containers.ts:134](../../packages/server/src/containers.ts#L134) `ContainerFiles/send` | `Store.containerInfo` (134); `Store.container` (200); `Store.containerRange` (209) | CONTAINER |
| [packages/server/src/conversion-guide.ts:428](../../packages/server/src/conversion-guide.ts#L428) `ConversionGuides/save` | `SQLite.prepare` (428); `Store.sql` (428) | DESIGN |
| [packages/server/src/conversion-guide.ts:419](../../packages/server/src/conversion-guide.ts#L419) `ConversionGuides/saved` | `SQLite.get` (419); `SQLite.prepare` (419); `Store.sql` (419) | DESIGN |
| [packages/server/src/conversion-guide.ts:409](../../packages/server/src/conversion-guide.ts#L409) `ConversionGuides/table` | `Store.sql` (409) | DESIGN |
| [packages/server/src/conversion-guide.ts:138](../../packages/server/src/conversion-guide.ts#L138) `convertedAt` | `SQLite.get` (138); `SQLite.prepare` (138); `Store.sql` (138) | DESIGN |
| [packages/server/src/conversion.ts:376](../../packages/server/src/conversion.ts#L376) `conversionReport` | `Store.externalContainerCheck` (376) | DESIGN |
| [packages/server/src/cwp-xml.ts:652](../../packages/server/src/cwp-xml.ts#L652) `CwpXmlEndpoint/layoutDoc` | `Store.valueListItems` (652) | XML |
| [packages/server/src/cwp-xml.ts:568](../../packages/server/src/cwp-xml.ts#L568) `CwpXmlEndpoint/records` | `Store.find` (568, 570, 571, 577, 580); `Store.get` (576, 584) | XML |
| [packages/server/src/cwp-xml.ts:537](../../packages/server/src/cwp-xml.ts#L537) `CwpXmlEndpoint/write` | `Store.get` (537, 541, 550); `Store.find` (549) | XML sign-in requires fmxml; every record/version read and count passes the signed-in Privileges, and the response layout is checked for access and the same table before any mutation. Writes and response reads share an atomic transaction. |
| [packages/server/src/dashboards.ts:390](../../packages/server/src/dashboards.ts#L390) `Dashboards/create` | `SQLite.prepare` (390); `Store.sql` (390) | DASHBOARD |
| [packages/server/src/dashboards.ts:410](../../packages/server/src/dashboards.ts#L410) `Dashboards/delete` | `SQLite.prepare` (410); `Store.sql` (410) | DASHBOARD |
| [packages/server/src/dashboards.ts:376](../../packages/server/src/dashboards.ts#L376) `Dashboards/get` | `SQLite.get` (376); `SQLite.prepare` (376); `Store.sql` (376) | DASHBOARD |
| [packages/server/src/dashboards.ts:370](../../packages/server/src/dashboards.ts#L370) `Dashboards/list` | `SQLite.all` (370); `SQLite.prepare` (370); `Store.sql` (370) | DASHBOARD |
| [packages/server/src/dashboards.ts:360](../../packages/server/src/dashboards.ts#L360) `Dashboards/table` | `Store.sql` (360) | DASHBOARD |
| [packages/server/src/dashboards.ts:403](../../packages/server/src/dashboards.ts#L403) `Dashboards/update` | `SQLite.prepare` (403); `Store.sql` (403) | DASHBOARD |
| [packages/server/src/dataapi.ts:2148](../../packages/server/src/dataapi.ts#L2148) `DataApi/route` | `Store.get` (2148, 2369, 2370, 2393, 2401, 2448, 2472, 2492, 2529); `Store.valueListItems` (2163); `Store.find` (2324, 2372, 2563); `Store.findIds` (2328, 2568); `Store.query` (2568) | REST |
| [packages/server/src/dataapi.ts:2276](../../packages/server/src/dataapi.ts#L2276) `DataApi/route/recordOut` | `Store.portalCounts` (2276) | REST |
| [packages/server/src/dataapi.ts:2312](../../packages/server/src/dataapi.ts#L2312) `DataApi/route/shownAs` | `Store.get` (2312) | REST |
| [packages/server/src/debug.ts:346](../../packages/server/src/debug.ts#L346) `DebugApi/handle` | `Store.row` (346, 475); `Store.get` (355, 480); `Store.evaluate` (379) | DESIGN |
| [packages/server/src/debug.ts:195](../../packages/server/src/debug.ts#L195) `learnStoredCredentials` | `Calculations.globalValue` (195); `Store.sql` (201, 211, 211); `SQLite.iterate` (211, 211); `SQLite.prepare` (211, 211); `Store.iterateCommitted` (211) | DESIGN |
| [packages/server/src/design.ts:241](../../packages/server/src/design.ts#L241) `containerData` | `Store.query` (241) | DESIGN |
| [packages/server/src/design.ts:750](../../packages/server/src/design.ts#L750) `DesignApi/handle` | `Store.auditLog` (750); `Store.evaluate` (817) | DESIGN |
| [packages/server/src/design.ts:250](../../packages/server/src/design.ts#L250) `recordCount` | `Store.query` (250) | DESIGN |
| [packages/server/src/digests.ts:232](../../packages/server/src/digests.ts#L232) `Digests/addRun` | `SQLite.prepare` (232, 233); `Store.sql` (232, 233) | DIGEST |
| [packages/server/src/digests.ts:209](../../packages/server/src/digests.ts#L209) `Digests/create` | `SQLite.prepare` (209); `Store.sql` (209) | DIGEST |
| [packages/server/src/digests.ts:226](../../packages/server/src/digests.ts#L226) `Digests/delete` | `SQLite.prepare` (226, 227); `Store.sql` (226, 227) | DIGEST |
| [packages/server/src/digests.ts:190](../../packages/server/src/digests.ts#L190) `Digests/get` | `SQLite.get` (190); `SQLite.prepare` (190); `Store.sql` (190) | DIGEST |
| [packages/server/src/digests.ts:197](../../packages/server/src/digests.ts#L197) `Digests/lastSlot` | `SQLite.get` (197); `SQLite.prepare` (197); `Store.sql` (197) | DIGEST |
| [packages/server/src/digests.ts:184](../../packages/server/src/digests.ts#L184) `Digests/list` | `SQLite.all` (184); `SQLite.prepare` (184); `Store.sql` (184) | DIGEST |
| [packages/server/src/digests.ts:201](../../packages/server/src/digests.ts#L201) `Digests/markSlot` | `SQLite.prepare` (201); `Store.sql` (201) | DIGEST |
| [packages/server/src/digests.ts:239](../../packages/server/src/digests.ts#L239) `Digests/runs` | `SQLite.all` (239); `SQLite.prepare` (239); `Store.sql` (239) | DIGEST |
| [packages/server/src/digests.ts:173](../../packages/server/src/digests.ts#L173) `Digests/table` | `Store.sql` (173) | DIGEST |
| [packages/server/src/digests.ts:218](../../packages/server/src/digests.ts#L218) `Digests/update` | `SQLite.prepare` (218); `Store.sql` (218) | DIGEST |
| [packages/server/src/docs.ts:157](../../packages/server/src/docs.ts#L157) `count` | `Store.query` (157) | DESIGN |
| [packages/server/src/dry-run.ts:92](../../packages/server/src/dry-run.ts#L92) `dryRunChanges/runOnce` | `Store.auditLog` (92, 96) | DESIGN |
| [packages/server/src/find-advice.ts:99](../../packages/server/src/find-advice.ts#L99) `findAdvice` | `Store.recordCount` (99) | DESIGN |
| [packages/server/src/formula-preview.ts:31](../../packages/server/src/formula-preview.ts#L31) `previewFormula` | `Store.findIds` (31); `Store.evaluate` (42) | DESIGN |
| [packages/server/src/hosted-record.ts:221](../../packages/server/src/hosted-record.ts#L221) `approveRestoredFiles` | `SQLite.get` (221); `SQLite.prepare` (221, 225) | OPERATOR |
| [packages/server/src/hosted-record.ts:114](../../packages/server/src/hosted-record.ts#L114) `markStore` | `SQLite.get` (114); `SQLite.prepare` (114, 118) | OPERATOR |
| [packages/server/src/hosted-record.ts:73](../../packages/server/src/hosted-record.ts#L73) `peekInstance` | `SQLite.get` (73); `SQLite.prepare` (73) | OPERATOR |
| [packages/server/src/import-mapping.ts:1024](../../packages/server/src/import-mapping.ts#L1024) `applyImportAddStream` | `SQLite.prepare` (1024); `Store.sql` (1024) | IMPORT |
| [packages/server/src/import-mapping.ts:785](../../packages/server/src/import-mapping.ts#L785) `applyImportRun` | `SQLite.prepare` (785); `Store.sql` (785) | IMPORT |
| [packages/server/src/import-mapping.ts:505](../../packages/server/src/import-mapping.ts#L505) `existingKeys` | `Store.viewableIds` (505); `Store.query` (507) | IMPORT |
| [packages/server/src/import-mapping.ts:829](../../packages/server/src/import-mapping.ts#L829) `fileIdentity` | `Store.sql` (829, 830, 831); `SQLite.prepare` (830, 831); `SQLite.get` (831) | IMPORT |
| [packages/server/src/import-mapping.ts:888](../../packages/server/src/import-mapping.ts#L888) `importHistory` | `SQLite.iterate` (888); `SQLite.prepare` (888); `Store.sql` (888) | IMPORT |
| [packages/server/src/import-mapping.ts:817](../../packages/server/src/import-mapping.ts#L817) `journal` | `Store.sql` (817, 820, 821, 822, 823, 824); `SQLite.all` (820); `SQLite.prepare` (820) | IMPORT |
| [packages/server/src/import-mapping.ts:805](../../packages/server/src/import-mapping.ts#L805) `targetKeys` | `SQLite.all` (805); `SQLite.prepare` (805); `Store.sql` (805) | IMPORT |
| [packages/server/src/import-mapping.ts:910](../../packages/server/src/import-mapping.ts#L910) `undoImportRun` | `SQLite.get` (910, 942); `SQLite.prepare` (910, 942, 956); `Store.sql` (910, 942, 956) | IMPORT |
| [packages/server/src/inbound-hooks.ts:306](../../packages/server/src/inbound-hooks.ts#L306) `InboundHooks/claim` | `SQLite.get` (306, 314, 315); `SQLite.prepare` (306, 310, 311, 314, 315, 317) | AUTH |
| [packages/server/src/insight.ts:1025](../../packages/server/src/insight.ts#L1025) `checkCalculation` | `Store.findIds` (1025); `Store.evaluate` (1029) | DESIGN |
| [packages/server/src/insight.ts:946](../../packages/server/src/insight.ts#L946) `columnProfile` | `Store.query` (946, 953, 965, 968) | PROFILE |
| [packages/server/src/insight.ts:870](../../packages/server/src/insight.ts#L870) `layoutProfile` | `Store.query` (870) | PROFILE |
| [packages/server/src/insight.ts:866](../../packages/server/src/insight.ts#L866) `layoutProfile/viewableIds` | `Store.viewableIds` (866) | PROFILE |
| [packages/server/src/insight.ts:1208](../../packages/server/src/insight.ts#L1208) `solutionOverview/counts` | `Store.query` (1208) | DESIGN |
| [packages/server/src/insight.ts:396](../../packages/server/src/insight.ts#L396) `webViewerScripts` | `Store.query` (396) | DESIGN |
| [packages/server/src/integrity-check.ts:13](../../packages/server/src/integrity-check.ts#L13) `integrity` | `SQLite.all` (13); `SQLite.prepare` (13, 17); `SQLite.get` (17) | OPERATOR |
| [packages/server/src/integrity-check.ts:55](../../packages/server/src/integrity-check.ts#L55) `pageCheck` | `SQLite.all` (55); `SQLite.prepare` (55, 58); `SQLite.get` (58) | OPERATOR |
| [packages/server/src/live.ts:208](../../packages/server/src/live.ts#L208) `Live/handle` | `Store.canView` (208) | LIVE |
| [packages/server/src/live.ts:283](../../packages/server/src/live.ts#L283) `Live/visibleRecord` | `Store.canViewRecord` (283) | LIVE |
| [packages/server/src/logs.ts:79](../../packages/server/src/logs.ts#L79) `LogShipper/follow` | `SQLite.get` (79); `SQLite.prepare` (79); `Store.sql` (79, 80, 81, 82) | ADMIN |
| [packages/server/src/logs.ts:91](../../packages/server/src/logs.ts#L91) `LogShipper/releaseIfIdle` | `Store.sql` (91) | ADMIN |
| [packages/server/src/mcp-design.ts:511](../../packages/server/src/mcp-design.ts#L511) `registerDesignTools/audit_log` | `Store.auditLog` (511) | DESIGN |
| [packages/server/src/mcp.ts:1491](../../packages/server/src/mcp.ts#L1491) `createMcpServer/check_record` | `Store.get` (1491); `Store.row` (1493) | MCP |
| [packages/server/src/mcp.ts:1212](../../packages/server/src/mcp.ts#L1212) `createMcpServer/evaluate_calculation` | `Store.get` (1212, 1220); `Store.find` (1213); `Store.evaluate` (1214); `Store.row` (1219) | SQL |
| [packages/server/src/mcp.ts:1515](../../packages/server/src/mcp.ts#L1515) `createMcpServer/explain_related` | `Store.get` (1515) | MCP |
| [packages/server/src/mcp.ts:1468](../../packages/server/src/mcp.ts#L1468) `createMcpServer/explain_value` | `Store.get` (1468); `Store.row` (1469) | MCP |
| [packages/server/src/mcp.ts:1092](../../packages/server/src/mcp.ts#L1092) `createMcpServer/find_records` | `Store.find` (1092) | MCP |
| [packages/server/src/mcp.ts:1287](../../packages/server/src/mcp.ts#L1287) `createMcpServer/get_container` | `Store.container` (1287) | SQL |
| [packages/server/src/mcp.ts:1105](../../packages/server/src/mcp.ts#L1105) `createMcpServer/get_record` | `Store.get` (1105) | MCP |
| [packages/server/src/mcp.ts:1311](../../packages/server/src/mcp.ts#L1311) `createMcpServer/sql_query` | `Store.queryWithOrigins` (1311) | SQL |
| [packages/server/src/mcp.ts:1155](../../packages/server/src/mcp.ts#L1155) `createMcpServer/update_record` | `Store.get` (1155, 1159) | MCP |
| [packages/server/src/mcp.ts:2412](../../packages/server/src/mcp.ts#L2412) `registerResources/audit` | `Store.auditLog` (2412) | MCP |
| [packages/server/src/oauth.ts:87](../../packages/server/src/oauth.ts#L87) `legacyPasswordMark` | `SQLite.get` (87); `SQLite.prepare` (87); `Store.sql` (87) | AUTH |
| [packages/server/src/oauth.ts:901](../../packages/server/src/oauth.ts#L901) `OAuthServer/accessAllowed` | `SQLite.get` (901); `SQLite.prepare` (901) | AUTH |
| [packages/server/src/oauth.ts:519](../../packages/server/src/oauth.ts#L519) `OAuthServer/authorize` | `SQLite.get` (519); `SQLite.prepare` (519, 523, 525, 532, 563, 564) | AUTH |
| [packages/server/src/oauth.ts:500](../../packages/server/src/oauth.ts#L500) `OAuthServer/authorize/done` | `SQLite.prepare` (500, 501) | AUTH |
| [packages/server/src/oauth.ts:399](../../packages/server/src/oauth.ts#L399) `OAuthServer/client` | `SQLite.get` (399); `SQLite.prepare` (399) | AUTH |
| [packages/server/src/oauth.ts:202](../../packages/server/src/oauth.ts#L202) `OAuthServer/constructor` | `SQLite.all` (202); `SQLite.prepare` (202, 229, 231, 240, 241, 244); `SQLite.iterate` (229); `SQLite.get` (231); `Store.sql` (231, 240) | AUTH |
| [packages/server/src/oauth.ts:195](../../packages/server/src/oauth.ts#L195) `OAuthServer/constructor/cols` | `SQLite.all` (195); `SQLite.prepare` (195) | AUTH |
| [packages/server/src/oauth.ts:884](../../packages/server/src/oauth.ts#L884) `OAuthServer/endGrant` | `SQLite.prepare` (884, 885); `SQLite.all` (885) | AUTH |
| [packages/server/src/oauth.ts:840](../../packages/server/src/oauth.ts#L840) `OAuthServer/issue/write` | `SQLite.get` (840); `SQLite.prepare` (840, 841, 842) | AUTH |
| [packages/server/src/oauth.ts:897](../../packages/server/src/oauth.ts#L897) `OAuthServer/managedAccess` | `SQLite.get` (897); `SQLite.prepare` (897) | AUTH |
| [packages/server/src/oauth.ts:379](../../packages/server/src/oauth.ts#L379) `OAuthServer/register` | `SQLite.prepare` (379, 380, 381, 382, 383); `SQLite.get` (380, 382) | AUTH |
| [packages/server/src/oauth.ts:914](../../packages/server/src/oauth.ts#L914) `OAuthServer/revoke` | `SQLite.get` (914, 915, 927, 928); `SQLite.prepare` (914, 915, 921, 927, 928, 934) | AUTH |
| [packages/server/src/oauth.ts:860](../../packages/server/src/oauth.ts#L860) `OAuthServer/sweep` | `SQLite.all` (860); `SQLite.prepare` (860, 862, 863, 864, 865) | AUTH |
| [packages/server/src/oauth.ts:719](../../packages/server/src/oauth.ts#L719) `OAuthServer/token` | `SQLite.get` (719, 750, 752, 755, 768); `SQLite.prepare` (719, 750, 752, 755, 764, 767, 768, 768, 770, 772) | AUTH |
| [packages/server/src/oauth.ts:74](../../packages/server/src/oauth.ts#L74) `storedName` | `SQLite.get` (74); `SQLite.prepare` (74); `Store.sql` (74) | AUTH |
| [packages/server/src/odata-crossjoin-worker.ts:42](../../packages/server/src/odata-crossjoin-worker.ts#L42) `join` | `SQLite.prepare` (42, 51, 60, 75); `SQLite.get` (60); `SQLite.all` (75) | JOIN |
| [packages/server/src/odata.ts:1532](../../packages/server/src/odata.ts#L1532) `ODataEndpoint/applied` | `Store.selectIds` (1532); `SQLite.prepare` (1548, 1585, 1598, 1602); `Store.getMany` (1559); `SQLite.all` (1598); `SQLite.get` (1602) | ODATA |
| [packages/server/src/odata.ts:1652](../../packages/server/src/odata.ts#L1652) `ODataEndpoint/crossjoined` | `Store.selectIds` (1652); `Store.getMany` (1681, 1716) | ODATA |
| [packages/server/src/odata.ts:1752](../../packages/server/src/odata.ts#L1752) `ODataEndpoint/entity` | `Store.getMany` (1752) | ODATA |
| [packages/server/src/odata.ts:1411](../../packages/server/src/odata.ts#L1411) `ODataEndpoint/lambdaFor` | `Store.selectIds` (1411); `Store.row` (1420); `relatedIdList` (1421) | ODATA |
| [packages/server/src/odata.ts:1474](../../packages/server/src/odata.ts#L1474) `ODataEndpoint/list` | `Store.selectIds` (1474); `Store.getMany` (1479); `Store.computeValues` (1480); `Store.countIds` (1485) | ODATA |
| [packages/server/src/odata.ts:1851](../../packages/server/src/odata.ts#L1851) `ODataEndpoint/property` | `Store.containerId` (1851); `Store.container` (1857) | ODATA |
| [packages/server/src/odata.ts:1793](../../packages/server/src/odata.ts#L1793) `ODataEndpoint/relatedIds` | `Store.row` (1793); `relatedIdList` (1796, 1811); `Store.selectIds` (1800) | ODATA |
| [packages/server/src/odata.ts:1827](../../packages/server/src/odata.ts#L1827) `ODataEndpoint/relatedRecords` | `Store.getMany` (1827) | ODATA |
| [packages/server/src/odata.ts:1064](../../packages/server/src/odata.ts#L1064) `ODataEndpoint/resource` | `Store.countIds` (1064); `Store.get` (1109, 1116, 1205, 1233, 1240) | ODATA |
| [packages/server/src/odata.ts:1822](../../packages/server/src/odata.ts#L1822) `ODataEndpoint/viewableIn` | `Store.viewableSet` (1822) | ODATA |
| [packages/server/src/oidc.ts:471](../../packages/server/src/oidc.ts#L471) `Oidc/authorizeUrl` | `SQLite.prepare` (471, 474) | AUTH |
| [packages/server/src/oidc.ts:526](../../packages/server/src/oidc.ts#L526) `Oidc/callback` | `SQLite.get` (526); `SQLite.prepare` (526, 537, 541); `SQLite.all` (537) | AUTH |
| [packages/server/src/oidc.ts:218](../../packages/server/src/oidc.ts#L218) `Oidc/constructor` | `SQLite.all` (218, 229); `SQLite.prepare` (218, 229, 239, 240, 245, 245) | AUTH |
| [packages/server/src/oidc.ts:646](../../packages/server/src/oidc.ts#L646) `Oidc/finish` | `SQLite.prepare` (646, 647, 649); `SQLite.get` (647) | AUTH |
| [packages/server/src/oidc.ts:444](../../packages/server/src/oidc.ts#L444) `Oidc/makeRoom` | `SQLite.get` (444, 446, 448); `SQLite.prepare` (444, 445, 446, 448, 450); `SQLite.all` (445, 450) | AUTH |
| [packages/server/src/oidc.ts:386](../../packages/server/src/oidc.ts#L386) `Oidc/takeGrant` | `SQLite.all` (386); `SQLite.prepare` (386) | AUTH |
| [packages/server/src/optimization-containers.ts:78](../../packages/server/src/optimization-containers.ts#L78) `planContainerMove` | `Store.embeddedContainerCount` (78) | DESIGN |
| [packages/server/src/optimization-containers.ts:46](../../packages/server/src/optimization-containers.ts#L46) `read` | `SQLite.get` (46); `SQLite.prepare` (46); `Store.sql` (46) | DESIGN |
| [packages/server/src/optimization-containers.ts:147](../../packages/server/src/optimization-containers.ts#L147) `undoContainerMove` | `SQLite.prepare` (147); `Store.sql` (147); `SQLite.get` (148) | DESIGN |
| [packages/server/src/optimization-containers.ts:57](../../packages/server/src/optimization-containers.ts#L57) `write` | `SQLite.prepare` (57); `Store.sql` (57) | DESIGN |
| [packages/server/src/optimization-data.ts:61](../../packages/server/src/optimization-data.ts#L61) `dataFindings` | `Store.recordCount` (61) | DESIGN |
| [packages/server/src/optimization-data.ts:46](../../packages/server/src/optimization-data.ts#L46) `held` | `SQLite.get` (46); `SQLite.prepare` (46); `Store.sql` (46) | DESIGN |
| [packages/server/src/optimization-data.ts:113](../../packages/server/src/optimization-data.ts#L113) `layoutFindings` | `Store.recordCount` (113) | DESIGN |
| [packages/server/src/optimization-fix.ts:150](../../packages/server/src/optimization-fix.ts#L150) `history` | `SQLite.get` (150); `SQLite.prepare` (150); `Store.sql` (150) | DESIGN |
| [packages/server/src/optimization-fix.ts:154](../../packages/server/src/optimization-fix.ts#L154) `keep` | `SQLite.prepare` (154); `Store.sql` (154) | DESIGN |
| [packages/server/src/optimization-fix.ts:158](../../packages/server/src/optimization-fix.ts#L158) `withHistory` | `Store.sql` (158, 161, 164, 164) | DESIGN |
| [packages/server/src/optimization.ts:141](../../packages/server/src/optimization.ts#L141) `containerUse` | `SQLite.get` (141); `SQLite.prepare` (141); `Store.sql` (141) | DESIGN |
| [packages/server/src/optimization.ts:120](../../packages/server/src/optimization.ts#L120) `hasTable` | `SQLite.get` (120); `SQLite.prepare` (120); `Store.sql` (120) | DESIGN |
| [packages/server/src/optimization.ts:564](../../packages/server/src/optimization.ts#L564) `heldBytes` | `SQLite.get` (564); `SQLite.prepare` (564); `Store.sql` (564) | DESIGN |
| [packages/server/src/optimization.ts:269](../../packages/server/src/optimization.ts#L269) `oversizedPictures` | `SQLite.all` (269); `SQLite.prepare` (269); `Store.sql` (269) | DESIGN |
| [packages/server/src/optimization.ts:316](../../packages/server/src/optimization.ts#L316) `sizes` | `SQLite.all` (316); `SQLite.prepare` (316); `Store.sql` (316) | DESIGN |
| [packages/server/src/optimization.ts:312](../../packages/server/src/optimization.ts#L312) `sizes/one` | `SQLite.get` (312); `SQLite.prepare` (312); `Store.sql` (312) | DESIGN |
| [packages/server/src/optimization.ts:449](../../packages/server/src/optimization.ts#L449) `speedFindings` | `Store.recordCount` (449, 492, 510) | DESIGN |
| [packages/server/src/pgwire.ts:987](../../packages/server/src/pgwire.ts#L987) `Connection/bareNames` | `Store.describe` (987) | SQL |
| [packages/server/src/pgwire.ts:1003](../../packages/server/src/pgwire.ts#L1003) `Connection/catalog` | `Store.describeTyped` (1003) | SQL |
| [packages/server/src/pgwire.ts:1445](../../packages/server/src/pgwire.ts#L1445) `Connection/describe` | `Store.describeTyped` (1445) | SQL |
| [packages/server/src/pgwire.ts:1014](../../packages/server/src/pgwire.ts#L1014) `Connection/run` | `Store.selectIn` (1014); `Store.describeTyped` (1018) | SQL |
| [packages/server/src/pgwire.ts:964](../../packages/server/src/pgwire.ts#L964) `Connection/translate` | `Calculations.translateSQL` (964) | SQL |
| [packages/server/src/pgwire.ts:1212](../../packages/server/src/pgwire.ts#L1212) `Connection/validateSyntax` | `SQLite.prepare` (1212); `Store.sql` (1212) | SQL |
| [packages/server/src/pgwrite.ts:431](../../packages/server/src/pgwrite.ts#L431) `executeWrite/reader` | `Store.selectIn` (431) | SQL |
| [packages/server/src/pgwrite.ts:404](../../packages/server/src/pgwrite.ts#L404) `returningColumns` | `Store.describe` (404) | SQL |
| [packages/server/src/pii.ts:310](../../packages/server/src/pii.ts#L310) `forgetVault` | `Store.sql` (310) | REDACTION |
| [packages/server/src/pii.ts:124](../../packages/server/src/pii.ts#L124) `holdsOnlyUuids` | `Store.query` (124) | REDACTION |
| [packages/server/src/pii.ts:349](../../packages/server/src/pii.ts#L349) `PiiMasker/constructor` | `SQLite.get` (349); `SQLite.prepare` (349); `Store.sql` (349) | REDACTION |
| [packages/server/src/pii.ts:445](../../packages/server/src/pii.ts#L445) `PiiMasker/known` | `SQLite.iterate` (445); `SQLite.prepare` (445); `Store.sql` (445) | REDACTION |
| [packages/server/src/pii.ts:359](../../packages/server/src/pii.ts#L359) `PiiMasker/refresh` | `SQLite.iterate` (359); `SQLite.prepare` (359); `Store.sql` (359) | REDACTION |
| [packages/server/src/pii.ts:417](../../packages/server/src/pii.ts#L417) `PiiMasker/text` | `SQLite.get` (417); `SQLite.prepare` (417); `Store.sql` (417) | REDACTION |
| [packages/server/src/pii.ts:402](../../packages/server/src/pii.ts#L402) `PiiMasker/token` | `SQLite.prepare` (402, 403); `Store.sql` (402, 403); `SQLite.get` (403) | REDACTION |
| [packages/server/src/pii.ts:486](../../packages/server/src/pii.ts#L486) `PiiMasker/unmask` | `SQLite.get` (486); `SQLite.prepare` (486); `Store.sql` (486) | REDACTION |
| [packages/server/src/pii.ts:655](../../packages/server/src/pii.ts#L655) `piiPreview` | `Store.find` (655); `SQLite.prepare` (662); `Store.sql` (662) | REDACTION |
| [packages/server/src/pii.ts:136](../../packages/server/src/pii.ts#L136) `sampledValues` | `Store.query` (136) | REDACTION |
| [packages/server/src/pii.ts:301](../../packages/server/src/pii.ts#L301) `vaultTable` | `Store.sql` (301, 304) | REDACTION |
| [packages/server/src/privilege-review.ts:274](../../packages/server/src/privilege-review.ts#L274) `reviewPrivileges` | `Store.previewRecordRule` (274) | DESIGN |
| [packages/server/src/rag.ts:79](../../packages/server/src/rag.ts#L79) `RagStore/add` | `SQLite.prepare` (79, 86, 88, 89); `SQLite.get` (86) | RAG |
| [packages/server/src/rag.ts:138](../../packages/server/src/rag.ts#L138) `RagStore/hybridSearch` | `SQLite.prepare` (138, 143) | RAG |
| [packages/server/src/rag.ts:148](../../packages/server/src/rag.ts#L148) `RagStore/hybridSearch/candidates` | `SQLite.all` (148); `SQLite.iterate` (150) | RAG |
| [packages/server/src/rag.ts:61](../../packages/server/src/rag.ts#L61) `RagStore/info` | `SQLite.all` (61, 66); `SQLite.prepare` (61, 63) | RAG |
| [packages/server/src/rag.ts:224](../../packages/server/src/rag.ts#L224) `RagStore/load` | `SQLite.get` (224); `SQLite.prepare` (224, 231); `SQLite.iterate` (231) | RAG |
| [packages/server/src/rag.ts:276](../../packages/server/src/rag.ts#L276) `RagStore/remove` | `SQLite.prepare` (276, 278) | RAG |
| [packages/server/src/rag.ts:270](../../packages/server/src/rag.ts#L270) `RagStore/searchCached` | `SQLite.prepare` (270); `SQLite.get` (271) | RAG |
| [packages/server/src/rag.ts:186](../../packages/server/src/rag.ts#L186) `RagStore/searchSpace` | `SQLite.iterate` (186); `SQLite.prepare` (186) | RAG |
| [packages/server/src/rag.ts:105](../../packages/server/src/rag.ts#L105) `RagStore/sizes` | `SQLite.all` (105); `SQLite.prepare` (105) | RAG |
| [packages/server/src/rag.ts:56](../../packages/server/src/rag.ts#L56) `RagStore/spaces` | `SQLite.all` (56); `SQLite.prepare` (56) | RAG |
| [packages/server/src/rag.ts:208](../../packages/server/src/rag.ts#L208) `RagStore/version` | `SQLite.get` (208); `SQLite.prepare` (208) | RAG |
| [packages/server/src/record-context.ts:112](../../packages/server/src/record-context.ts#L112) `describeRecord` | `Store.row` (112); `Store.get` (121); `keyValue` (127); `Store.viewableIds` (165); `relatedRows` (169, 174) | RECORD |
| [packages/server/src/record-history.ts:101](../../packages/server/src/record-history.ts#L101) `recordHistory` | `Store.auditLog` (101, 154) | HISTORY |
| [packages/server/src/record-search.ts:61](../../packages/server/src/record-search.ts#L61) `searchRecords` | `Store.viewableIds` (61); `SQLite.all` (74); `SQLite.prepare` (74); `Store.sql` (74) | SEARCH |
| [packages/server/src/record-search.ts:104](../../packages/server/src/record-search.ts#L104) `searchRecords/snippet` | `SQLite.get` (104); `SQLite.prepare` (104); `Store.sql` (104) | SEARCH |
| [packages/server/src/record-search.ts:109](../../packages/server/src/record-search.ts#L109) `searchRecords/source` | `SQLite.get` (109); `SQLite.prepare` (109); `Store.sql` (109) | SEARCH |
| [packages/server/src/rule-suggestions.ts:57](../../packages/server/src/rule-suggestions.ts#L57) `suggestRules` | `Store.query` (57, 69, 86, 136, 138, 152, 153, 169) | DESIGN |
| [packages/server/src/scim.ts:292](../../packages/server/src/scim.ts#L292) `ScimDirectory/atomically` | `Store.sql` (292) | AUTH |
| [packages/server/src/scim.ts:404](../../packages/server/src/scim.ts#L404) `ScimDirectory/create/scim_user_create` | `SQLite.prepare` (404); `Store.sql` (404) | AUTH |
| [packages/server/src/scim.ts:331](../../packages/server/src/scim.ts#L331) `ScimDirectory/rebind` | `SQLite.prepare` (331); `Store.sql` (331) | AUTH |
| [packages/server/src/scim.ts:454](../../packages/server/src/scim.ts#L454) `ScimDirectory/remove/scim_user_remove` | `SQLite.prepare` (454); `Store.sql` (454) | AUTH |
| [packages/server/src/scim.ts:353](../../packages/server/src/scim.ts#L353) `ScimDirectory/revokePersonTokens` | `SQLite.all` (353); `SQLite.prepare` (353); `Store.sql` (353) | AUTH |
| [packages/server/src/scim.ts:226](../../packages/server/src/scim.ts#L226) `ScimDirectory/rows` | `SQLite.all` (226); `SQLite.prepare` (226, 231); `Store.sql` (226, 231) | AUTH |
| [packages/server/src/scim.ts:144](../../packages/server/src/scim.ts#L144) `ScimDirectory/save` | `SQLite.prepare` (144); `Store.sql` (144) | AUTH |
| [packages/server/src/scim.ts:255](../../packages/server/src/scim.ts#L255) `ScimDirectory/setMemberships` | `SQLite.prepare` (255); `Store.sql` (255) | AUTH |
| [packages/server/src/scim.ts:136](../../packages/server/src/scim.ts#L136) `ScimDirectory/settings` | `SQLite.get` (136); `SQLite.prepare` (136); `Store.sql` (136) | AUTH |
| [packages/server/src/scim.ts:123](../../packages/server/src/scim.ts#L123) `ScimDirectory/table` | `Store.sql` (123, 125); `SQLite.all` (125); `SQLite.prepare` (125) | AUTH |
| [packages/server/src/scim.ts:128](../../packages/server/src/scim.ts#L128) `ScimDirectory/table/scim_identity_column` | `SQLite.all` (128); `SQLite.prepare` (128); `Store.sql` (128, 129) | AUTH |
| [packages/server/src/scim.ts:427](../../packages/server/src/scim.ts#L427) `ScimDirectory/update/scim_user_update` | `SQLite.prepare` (427); `Store.sql` (427) | AUTH |
| [packages/server/src/script-failure.ts:212](../../packages/server/src/script-failure.ts#L212) `explainScriptFailure` | `Store.row` (212) | RECORD |
| [packages/server/src/security.ts:81](../../packages/server/src/security.ts#L81) `importApproximations` | `SQLite.all` (81); `SQLite.prepare` (81); `Store.sql` (81) | DESIGN |
| [packages/server/src/security.ts:218](../../packages/server/src/security.ts#L218) `SecurityApi/handle` | `Store.previewRecordRule` (218) | DESIGN |
| [packages/server/src/security.ts:117](../../packages/server/src/security.ts#L117) `securityOf` | `Store.pendingChanges` (117) | DESIGN |
| [packages/server/src/semantic-find.ts:52](../../packages/server/src/semantic-find.ts#L52) `semanticFind` | `Store.findIds` (52) | SEARCH |
| [packages/server/src/semantic-find.ts:108](../../packages/server/src/semantic-find.ts#L108) `vectorOf` | `Store.containerId` (108); `Store.containerInfo` (110); `Store.container` (112); `Store.get` (117) | SEARCH |
| [packages/server/src/sql.ts:103](../../packages/server/src/sql.ts#L103) `SqlEndpoint/handle` | `Calculations.translateSQL` (103); `Store.select` (110) | SQL |
| [packages/server/src/sql.ts:163](../../packages/server/src/sql.ts#L163) `SqlEndpoint/tables` | `SQLite.all` (163); `SQLite.prepare` (163); `Store.sql` (163) | SQL |
| [packages/server/src/standby.ts:445](../../packages/server/src/standby.ts#L445) `Standby/copy` | `SQLite.get` (445); `SQLite.prepare` (445) | OPERATOR |
| [packages/server/src/summarize.ts:184](../../packages/server/src/summarize.ts#L184) `summarizeByRecord` | `Store.evaluateEach` (184); `Store.row` (186) | SUMMARY |
| [packages/server/src/summarize.ts:69](../../packages/server/src/summarize.ts#L69) `summarizeRecords` | `Store.findIds` (69); `Store.select` (126, 133, 143) | SUMMARY |
| [packages/server/src/sync-console.ts:463](../../packages/server/src/sync-console.ts#L463) `SyncConsole/runCheck` | `Store.sql` (463) | DESIGN |
| [packages/server/src/sync-console.ts:468](../../packages/server/src/sync-console.ts#L468) `SyncConsole/runCheck/assertActive` | `Store.sql` (468) | DESIGN |
| [packages/server/src/warm-worker.ts:34](../../packages/server/src/warm-worker.ts#L34) `message` | `Store.find` (34) | INTERNAL |
| [packages/server/src/warm-worker.ts:19](../../packages/server/src/warm-worker.ts#L19) `message/count` | `Store.recordCount` (19) | INTERNAL |
| [packages/server/src/webclient.ts:2672](../../packages/server/src/webclient.ts#L2672) `foundIds` | `Store.findIds` (2672, 2674) | WEB |
| [packages/server/src/webclient.ts:2593](../../packages/server/src/webclient.ts#L2593) `listItems` | `Store.valueListItems` (2593) | WEB |
| [packages/server/src/webclient.ts:1708](../../packages/server/src/webclient.ts#L1708) `WebClient/aiReplace` | `Store.canView` (1708); `Store.getMany` (1724) | WEB |
| [packages/server/src/webclient.ts:1892](../../packages/server/src/webclient.ts#L1892) `WebClient/button` | `Store.findIds` (1892, 1942); `Store.evaluateEach` (1901, 1902) | WEB |
| [packages/server/src/webclient.ts:1294](../../packages/server/src/webclient.ts#L1294) `WebClient/charts` | `Calculations.context` (1294); `Store.canView` (1322); `Store.evaluateEach` (1331, 1335); `Store.evaluateRows` (1340, 1342) | WEB |
| [packages/server/src/webclient.ts:1285](../../packages/server/src/webclient.ts#L1285) `WebClient/charts/foundSet` | `Store.findIds` (1285) | WEB |
| [packages/server/src/webclient.ts:1325](../../packages/server/src/webclient.ts#L1325) `WebClient/charts/get` | `Store.get` (1325) | WEB |
| [packages/server/src/webclient.ts:694](../../packages/server/src/webclient.ts#L694) `WebClient/explain` | `Store.get` (694); `Store.row` (727, 740) | WEB |
| [packages/server/src/webclient.ts:1514](../../packages/server/src/webclient.ts#L1514) `WebClient/exportRecords` | `Store.getMany` (1514) | WEB |
| [packages/server/src/webclient.ts:1201](../../packages/server/src/webclient.ts#L1201) `WebClient/foundIds` | `Store.findIds` (1201) | WEB |
| [packages/server/src/webclient.ts:1245](../../packages/server/src/webclient.ts#L1245) `WebClient/foundSetPortal` | `Store.foundSetRows` (1245, 1252) | WEB |
| [packages/server/src/webclient.ts:1784](../../packages/server/src/webclient.ts#L1784) `WebClient/groups` | `Store.findIds` (1784); `Store.groupSummaries` (1790) | WEB |
| [packages/server/src/webclient.ts:554](../../packages/server/src/webclient.ts#L554) `WebClient/history` | `Store.get` (554) | WEB |
| [packages/server/src/webclient.ts:753](../../packages/server/src/webclient.ts#L753) `WebClient/index` | `Store.fieldIndex` (753) | WEB |
| [packages/server/src/webclient.ts:859](../../packages/server/src/webclient.ts#L859) `WebClient/menus` | `Store.evaluateEach` (859) | WEB |
| [packages/server/src/webclient.ts:1216](../../packages/server/src/webclient.ts#L1216) `WebClient/records` | `Store.getMany` (1216); `Store.find` (1219) | WEB |
| [packages/server/src/webclient.ts:1162](../../packages/server/src/webclient.ts#L1162) `WebClient/refresh` | `Store.previewRow` (1162); `Store.getMany` (1167); `Store.foundSetRows` (1189) | WEB |
| [packages/server/src/webclient.ts:1408](../../packages/server/src/webclient.ts#L1408) `WebClient/streamExportRecords/nextBatch` | `Store.selectIds` (1408); `Store.getMany` (1414) | WEB |
| [packages/server/src/webclient.ts:1076](../../packages/server/src/webclient.ts#L1076) `WebClient/view` | `Store.evaluateEach` (1076, 1100, 1119); `Store.canView` (1094); `Store.previewRow` (1098, 1120); `Store.get` (1111); `Store.row` (1112, 1112) | WEB |
| [packages/server/src/webclient.ts:1097](../../packages/server/src/webclient.ts#L1097) `WebClient/view/get` | `Store.get` (1097) | WEB |
| [packages/store/src/activity.ts:502](../../packages/store/src/activity.ts#L502) `SharedRecordLocks/acquire` | `SQLite.prepare` (502) | CORE |
| [packages/store/src/activity.ts:540](../../packages/store/src/activity.ts#L540) `SharedRecordLocks/all` | `SQLite.all` (540); `SQLite.prepare` (540) | CORE |
| [packages/store/src/activity.ts:444](../../packages/store/src/activity.ts#L444) `SharedRecordLocks/constructor` | `SQLite.get` (444); `SQLite.prepare` (444) | CORE |
| [packages/store/src/activity.ts:475](../../packages/store/src/activity.ts#L475) `SharedRecordLocks/count` | `SQLite.get` (475); `SQLite.prepare` (475) | CORE |
| [packages/store/src/activity.ts:487](../../packages/store/src/activity.ts#L487) `SharedRecordLocks/holder` | `SQLite.get` (487); `SQLite.prepare` (487) | CORE |
| [packages/store/src/activity.ts:559](../../packages/store/src/activity.ts#L559) `SharedRecordLocks/leave` | `SQLite.prepare` (559) | CORE |
| [packages/store/src/activity.ts:563](../../packages/store/src/activity.ts#L563) `SharedRecordLocks/leaveOwner` | `SQLite.all` (563); `SQLite.prepare` (563) | CORE |
| [packages/store/src/activity.ts:530](../../packages/store/src/activity.ts#L530) `SharedRecordLocks/release` | `SQLite.prepare` (530) | CORE |
| [packages/store/src/activity.ts:534](../../packages/store/src/activity.ts#L534) `SharedRecordLocks/releaseOwner` | `SQLite.all` (534); `SQLite.prepare` (534) | CORE |
| [packages/store/src/activity.ts:516](../../packages/store/src/activity.ts#L516) `SharedRecordLocks/renew` | `SQLite.prepare` (516) | CORE |
| [packages/store/src/activity.ts:479](../../packages/store/src/activity.ts#L479) `SharedRecordLocks/sweep` | `SQLite.prepare` (479) | CORE |
| [packages/store/src/activity.ts:546](../../packages/store/src/activity.ts#L546) `SharedRecordLocks/view` | `SQLite.prepare` (546, 547, 548, 549); `SQLite.get` (547, 548) | CORE |
| [packages/store/src/activity.ts:567](../../packages/store/src/activity.ts#L567) `SharedRecordLocks/viewers` | `SQLite.prepare` (567, 568); `SQLite.all` (568) | CORE |
| [packages/store/src/audit-anchor.ts:72](../../packages/store/src/audit-anchor.ts#L72) `checkAnchor` | `SQLite.get` (72, 75, 81, 86); `SQLite.prepare` (72, 75, 79, 86) | CORE |
| [packages/store/src/cache-versions.ts:10](../../packages/store/src/cache-versions.ts#L10) `ensureCacheVersions` | `SQLite.all` (10); `SQLite.prepare` (10, 21); `SQLite.get` (21) | CORE |
| [packages/store/src/calc.ts:618](../../packages/store/src/calc.ts#L618) `Calculations/allRecords` | `SQLite.iterate` (618); `SQLite.prepare` (618); `Store.sql` (618) | CALC |
| [packages/store/src/calc.ts:1213](../../packages/store/src/calc.ts#L1213) `Calculations/applyDelta/value` | `Calculations.value` (1213) | CALC |
| [packages/store/src/calc.ts:2392](../../packages/store/src/calc.ts#L2392) `Calculations/beforeWrite` | `relatedRows` (2392); `Calculations.related` (2446); `Calculations.context` (2459) | CORE |
| [packages/store/src/calc.ts:629](../../packages/store/src/calc.ts#L629) `Calculations/collect` | `Calculations.collector` (629) | CALC |
| [packages/store/src/calc.ts:660](../../packages/store/src/calc.ts#L660) `Calculations/collector/add` | `Calculations.related` (660) | CALC |
| [packages/store/src/calc.ts:1693](../../packages/store/src/calc.ts#L1693) `Calculations/columnNames` | `SQLite.all` (1693); `SQLite.prepare` (1693); `Store.sql` (1693) | CALC |
| [packages/store/src/calc.ts:2255](../../packages/store/src/calc.ts#L2255) `Calculations/computeColumn` | `Calculations.statement` (2255); `SQLite.get` (2255); `Calculations.value` (2258) | CALC |
| [packages/store/src/calc.ts:565](../../packages/store/src/calc.ts#L565) `Calculations/computed` | `Calculations.context` (565) | CALC |
| [packages/store/src/calc.ts:2510](../../packages/store/src/calc.ts#L2510) `Calculations/computeStored` | `Calculations.computeStoredStyled` (2510); `Calculations.value` (2510) | CALC |
| [packages/store/src/calc.ts:2525](../../packages/store/src/calc.ts#L2525) `Calculations/computeStoredStyled` | `Calculations.context` (2525) | CORE |
| [packages/store/src/calc.ts:1913](../../packages/store/src/calc.ts#L1913) `Calculations/context/executeSQL` | `Calculations.executeSQL` (1913) | CALC |
| [packages/store/src/calc.ts:1762](../../packages/store/src/calc.ts#L1762) `Calculations/context/field` | `Calculations.summary` (1762); `Calculations.globalValue` (1765); `Calculations.value` (1766) | CALC |
| [packages/store/src/calc.ts:1887](../../packages/store/src/calc.ts#L1887) `Calculations/context/get` | `Store.recordCount` (1887, 1894); `Calculations.statement` (1892); `SQLite.get` (1892) | CALC |
| [packages/store/src/calc.ts:1810](../../packages/store/src/calc.ts#L1810) `Calculations/context/lookupNext` | `Store.canViewRecord` (1810) | CALC |
| [packages/store/src/calc.ts:1914](../../packages/store/src/calc.ts#L1914) `Calculations/context/persistentData` | `Store.persistentData` (1914) | CALC |
| [packages/store/src/calc.ts:1915](../../packages/store/src/calc.ts#L1915) `Calculations/context/persistentDataIds` | `Store.persistentDataIds` (1915) | CALC |
| [packages/store/src/calc.ts:1744](../../packages/store/src/calc.ts#L1744) `Calculations/context/records` | `Calculations.firstRelated` (1744) | CALC |
| [packages/store/src/calc.ts:1775](../../packages/store/src/calc.ts#L1775) `Calculations/context/related` | `Calculations.globalValue` (1775); `Calculations.value` (1777, 1788); `Calculations.related` (1790) | CALC |
| [packages/store/src/calc.ts:1825](../../packages/store/src/calc.ts#L1825) `Calculations/context/summary` | `Calculations.value` (1825, 1835); `Calculations.related` (1837); `Calculations.summary` (1855) | CALC |
| [packages/store/src/calc.ts:2218](../../packages/store/src/calc.ts#L2218) `Calculations/defineComputedColumn/fm_computed` | `Calculations.related` (2218) | CALC |
| [packages/store/src/calc.ts:1940](../../packages/store/src/calc.ts#L1940) `Calculations/design` | `Store.valueListItems` (1940) | CALC |
| [packages/store/src/calc.ts:1718](../../packages/store/src/calc.ts#L1718) `Calculations/ensureIndex` | `Store.sql` (1718, 1719) | CALC |
| [packages/store/src/calc.ts:1957](../../packages/store/src/calc.ts#L1957) `Calculations/executeSQL` | `Calculations.translateSQL` (1957); `Store.select` (1995); `Store.sql` (2006) | CALC |
| [packages/store/src/calc.ts:1359](../../packages/store/src/calc.ts#L1359) `Calculations/firstRelated` | `Calculations.related` (1359, 1371, 1386); `Store.viewableIds` (1366); `Calculations.relatedIds` (1369, 1382); `Calculations.statement` (1379); `SQLite.get` (1379) | CALC |
| [packages/store/src/calc.ts:673](../../packages/store/src/calc.ts#L673) `Calculations/foundSummary` | `Calculations.collect` (673) | CALC |
| [packages/store/src/calc.ts:1608](../../packages/store/src/calc.ts#L1608) `Calculations/foundSums` | `Store.sql` (1608) | CALC |
| [packages/store/src/calc.ts:746](../../packages/store/src/calc.ts#L746) `Calculations/globalsKey` | `Calculations.globalValue` (746) | CALC |
| [packages/store/src/calc.ts:358](../../packages/store/src/calc.ts#L358) `Calculations/globalValue` | `SQLite.get` (358); `SQLite.prepare` (358); `Store.sql` (358) | CALC |
| [packages/store/src/calc.ts:1671](../../packages/store/src/calc.ts#L1671) `Calculations/hopQuery` | `Calculations.value` (1671) | CALC |
| [packages/store/src/calc.ts:1511](../../packages/store/src/calc.ts#L1511) `Calculations/joinHop` | `Calculations.statement` (1511, 1513); `SQLite.get` (1511); `SQLite.iterate` (1513) | CALC |
| [packages/store/src/calc.ts:1569](../../packages/store/src/calc.ts#L1569) `Calculations/lookup` | `Store.sql` (1569) | CALC |
| [packages/store/src/calc.ts:340](../../packages/store/src/calc.ts#L340) `Calculations/meta` | `SQLite.get` (340); `SQLite.prepare` (340); `Store.sql` (340) | CALC |
| [packages/store/src/calc.ts:1559](../../packages/store/src/calc.ts#L1559) `Calculations/passStamp` | `Store.sql` (1559) | CALC |
| [packages/store/src/calc.ts:1404](../../packages/store/src/calc.ts#L1404) `Calculations/relatedIds` | `Calculations.related` (1404, 1434, 1448); `rowsById` (1418, 1445); `Calculations.statement` (1429); `SQLite.all` (1429) | CALC |
| [packages/store/src/calc.ts:1337](../../packages/store/src/calc.ts#L1337) `Calculations/relatedRecs` | `Calculations.relatedIds` (1337); `Store.viewableIds` (1342); `rowsById` (1348) | CALC |
| [packages/store/src/calc.ts:1393](../../packages/store/src/calc.ts#L1393) `Calculations/rowById` | `Calculations.statement` (1393); `SQLite.get` (1393) | CALC |
| [packages/store/src/calc.ts:345](../../packages/store/src/calc.ts#L345) `Calculations/saveMeta` | `SQLite.prepare` (345); `Store.sql` (345) | CALC |
| [packages/store/src/calc.ts:382](../../packages/store/src/calc.ts#L382) `Calculations/setNextSerial` | `Store.sql` (382, 383, 389, 391, 391) | CALC |
| [packages/store/src/calc.ts:2186](../../packages/store/src/calc.ts#L2186) `Calculations/shareColumn` | `Store.recordCount` (2186) | CALC |
| [packages/store/src/calc.ts:1704](../../packages/store/src/calc.ts#L1704) `Calculations/statement` | `SQLite.prepare` (1704); `Store.sql` (1704) | CALC |
| [packages/store/src/calc.ts:1540](../../packages/store/src/calc.ts#L1540) `Calculations/storedRelatedValues` | `Calculations.statement` (1540); `SQLite.iterate` (1540) | CALC |
| [packages/store/src/calc.ts:1285](../../packages/store/src/calc.ts#L1285) `Calculations/storedRows` | `SQLite.iterate` (1285); `SQLite.prepare` (1285); `Store.sql` (1285) | CALC |
| [packages/store/src/calc.ts:684](../../packages/store/src/calc.ts#L684) `Calculations/summary` | `Calculations.collect` (684) | CALC |
| [packages/store/src/calc.ts:921](../../packages/store/src/calc.ts#L921) `Calculations/summaryDependencies` | `Store.sql` (921) | CALC |
| [packages/store/src/calc.ts:636](../../packages/store/src/calc.ts#L636) `Calculations/summaryInput` | `Calculations.value` (636) | CALC |
| [packages/store/src/calc.ts:691](../../packages/store/src/calc.ts#L691) `Calculations/tableSummary` | `Calculations.wholeTable` (691) | CALC |
| [packages/store/src/calc.ts:2122](../../packages/store/src/calc.ts#L2122) `Calculations/translateSQL` | `Store.scopedTableSql` (2122, 2154) | CALC |
| [packages/store/src/calc.ts:2561](../../packages/store/src/calc.ts#L2561) `Calculations/uniqueCollision` | `Calculations.value` (2561) | CALC |
| [packages/store/src/calc.ts:580](../../packages/store/src/calc.ts#L580) `Calculations/unstoredValue` | `Calculations.unstoredStyled` (580); `Calculations.value` (580) | CALC |
| [packages/store/src/calc.ts:2588](../../packages/store/src/calc.ts#L2588) `Calculations/validate` | `Calculations.value` (2588); `Store.valueListItems` (2609); `Calculations.context` (2623) | CALC |
| [packages/store/src/calc.ts:2574](../../packages/store/src/calc.ts#L2574) `Calculations/validate/fail` | `Calculations.context` (2574) | CALC |
| [packages/store/src/calc.ts:530](../../packages/store/src/calc.ts#L530) `Calculations/value` | `Calculations.globalValue` (530) | CALC |
| [packages/store/src/calc.ts:960](../../packages/store/src/calc.ts#L960) `Calculations/wholeTable` | `rowsById` (960); `Store.viewableIds` (960); `Calculations.collect` (962, 1052); `Calculations.value` (1023); `Store.sql` (1031, 1039) | CALC |
| [packages/store/src/calc.ts:2770](../../packages/store/src/calc.ts#L2770) `containerValue` | `Store.containerInfo` (2770); `Store.containerRange` (2777); `Store.container` (2778) | CALC |
| [packages/store/src/calc.ts:2786](../../packages/store/src/calc.ts#L2786) `containerValue/read` | `Store.container` (2786) | CALC |
| [packages/store/src/calc.ts:2799](../../packages/store/src/calc.ts#L2799) `containerValue/value` | `Store.containerRange` (2799) | CALC |
| [packages/store/src/calc.ts:2685](../../packages/store/src/calc.ts#L2685) `nearest` | `SQLite.get` (2685); `SQLite.prepare` (2685); `Store.sql` (2685) | CALC |
| [packages/store/src/calc.ts:3231](../../packages/store/src/calc.ts#L3231) `rowsById/flush` | `Calculations.statement` (3231); `SQLite.iterate` (3231) | CALC |
| [packages/store/src/calc.ts:2917](../../packages/store/src/calc.ts#L2917) `sameValuesElsewhere` | `SQLite.all` (2917); `SQLite.prepare` (2917, 2924, 2926); `Store.sql` (2917, 2924, 2926); `Calculations.value` (2919); `SQLite.get` (2924, 2926) | CALC |
| [packages/store/src/cross-file.ts:58](../../packages/store/src/cross-file.ts#L58) `CrossFileProofs/read` | `SQLite.get` (58); `SQLite.prepare` (58) | AUTH |
| [packages/store/src/cross-file.ts:115](../../packages/store/src/cross-file.ts#L115) `CrossFileProofs/save` | `SQLite.prepare` (115) | AUTH |
| [packages/store/src/damage.ts:93](../../packages/store/src/damage.ts#L93) `watchDatabase` | `SQLite.prepare` (93); `SQLite.iterate` (103) | CORE |
| [packages/store/src/exit-bundle.ts:463](../../packages/store/src/exit-bundle.ts#L463) `build` | `SQLite.prepare` (463) | EXIT-BUNDLE |
| [packages/store/src/exit-bundle.ts:486](../../packages/store/src/exit-bundle.ts#L486) `copyTables` | `SQLite.all` (486); `SQLite.prepare` (486, 492, 493, 510); `SQLite.get` (495, 507, 510) | EXIT-BUNDLE |
| [packages/store/src/exit-bundle.ts:669](../../packages/store/src/exit-bundle.ts#L669) `finish` | `SQLite.all` (669); `SQLite.prepare` (669); `Calculations.globalValue` (681) | EXIT-BUNDLE |
| [packages/store/src/exit-bundle.ts:520](../../packages/store/src/exit-bundle.ts#L520) `writeContainers` | `SQLite.all` (520, 532); `SQLite.prepare` (520, 532, 533, 567); `Store.containerInfo` (537); `Store.containerRange` (553); `SQLite.get` (567) | EXIT-BUNDLE |
| [packages/store/src/exit-bundle.ts:583](../../packages/store/src/exit-bundle.ts#L583) `writeCsv` | `SQLite.prepare` (583); `SQLite.iterate` (587) | EXIT-BUNDLE |
| [packages/store/src/explain-related.ts:364](../../packages/store/src/explain-related.ts#L364) `explainCandidate` | `SQLite.get` (364, 378); `SQLite.prepare` (364, 378); `Store.sql` (364, 378); `keyValue` (375); `Calculations.context` (383) | RECORD |
| [packages/store/src/explain-related.ts:301](../../packages/store/src/explain-related.ts#L301) `explainHop` | `keyValue` (301); `SQLite.get` (321); `SQLite.prepare` (321, 335); `Store.sql` (321, 335); `SQLite.all` (335) | RECORD |
| [packages/store/src/explain-related.ts:103](../../packages/store/src/explain-related.ts#L103) `explainRelated` | `Store.row` (103); `Store.get` (193); `Calculations.value` (242); `Calculations.context` (250) | RECORD |
| [packages/store/src/explain-related.ts:183](../../packages/store/src/explain-related.ts#L183) `explainRelated/runFilter` | `Calculations.context` (183) | RECORD |
| [packages/store/src/explain.ts:144](../../packages/store/src/explain.ts#L144) `explainField` | `Calculations.value` (144); `Calculations.context` (173) | RECORD |
| [packages/store/src/explain.ts:395](../../packages/store/src/explain.ts#L395) `lintFormula` | `Calculations.context` (395) | RECORD |
| [packages/store/src/export-sql.ts:230](../../packages/store/src/export-sql.ts#L230) `exportSql` | `Store.scopedTableSql` (230); `Store.select` (231, 364); `Store.container` (435) | OPERATOR |
| [packages/store/src/export-sql.ts:306](../../packages/store/src/export-sql.ts#L306) `exportSql/duplicates` | `Store.select` (306) | OPERATOR |
| [packages/store/src/export-sql.ts:256](../../packages/store/src/export-sql.ts#L256) `exportSql/page` | `Store.select` (256) | OPERATOR |
| [packages/store/src/fidelity.ts:214](../../packages/store/src/fidelity.ts#L214) `calcFidelity` | `Calculations.executeSQL` (214, 215, 301); `Store.sql` (219, 227, 300); `SQLite.all` (227); `SQLite.prepare` (227); `Calculations.computeStored` (263) | DESIGN |
| [packages/store/src/fidelity.ts:176](../../packages/store/src/fidelity.ts#L176) `changedAfter` | `Untyped.executeSQL` (176) | DESIGN |
| [packages/store/src/fidelity.ts:196](../../packages/store/src/fidelity.ts#L196) `queryProblem` | `Calculations.translateSQL` (196); `Store.describe` (197) | DESIGN |
| [packages/store/src/fmexport.ts:236](../../packages/store/src/fmexport.ts#L236) `fmExport` | `Store.recordCount` (236); `Store.query` (237); `Store.containerInfo` (252); `Store.container` (259) | OPERATOR |
| [packages/store/src/foreign-keys.ts:172](../../packages/store/src/foreign-keys.ts#L172) `childIds` | `SQLite.all` (172) | CORE |
| [packages/store/src/foreign-keys.ts:179](../../packages/store/src/foreign-keys.ts#L179) `childrenWithKeys` | `SQLite.all` (179) | CORE |
| [packages/store/src/foreign-keys.ts:188](../../packages/store/src/foreign-keys.ts#L188) `orphans` | `SQLite.get` (188); `SQLite.all` (189) | CORE |
| [packages/store/src/foreign-keys.ts:165](../../packages/store/src/foreign-keys.ts#L165) `parentHas` | `SQLite.get` (165) | CORE |
| [packages/store/src/import.ts:95](../../packages/store/src/import.ts#L95) `addExternalSizeColumn` | `SQLite.all` (95); `SQLite.prepare` (95) | OPERATOR |
| [packages/store/src/import.ts:243](../../packages/store/src/import.ts#L243) `applyFileAccountStatus` | `SQLite.get` (243, 245); `SQLite.prepare` (243, 245, 247, 259) | OPERATOR |
| [packages/store/src/import.ts:288](../../packages/store/src/import.ts#L288) `createStore` | `SQLite.prepare` (288, 300) | OPERATOR |
| [packages/store/src/import.ts:199](../../packages/store/src/import.ts#L199) `importDesigns` | `SQLite.all` (199); `SQLite.prepare` (199, 213, 216, 219, 221); `SQLite.get` (213, 216) | OPERATOR |
| [packages/store/src/import.ts:424](../../packages/store/src/import.ts#L424) `importFmp12` | `SQLite.prepare` (424, 437, 443, 449, 453, 468, 479, 569, 570, 571); `SQLite.get` (443, 468); `SQLite.all` (449) | OPERATOR |
| [packages/store/src/import.ts:415](../../packages/store/src/import.ts#L415) `importFmp12/save` | `SQLite.prepare` (415) | OPERATOR |
| [packages/store/src/import.ts:527](../../packages/store/src/import.ts#L527) `importFmp12/skipped` | `SQLite.get` (527); `SQLite.prepare` (527) | OPERATOR |
| [packages/store/src/import.ts:149](../../packages/store/src/import.ts#L149) `moveAddedImages` | `SQLite.prepare` (149, 159, 175, 176); `SQLite.get` (152); `SQLite.all` (176) | OPERATOR |
| [packages/store/src/import.ts:312](../../packages/store/src/import.ts#L312) `needsDesigns` | `SQLite.get` (312); `SQLite.prepare` (312) | OPERATOR |
| [packages/store/src/import.ts:135](../../packages/store/src/import.ts#L135) `nextImageId` | `SQLite.get` (135); `SQLite.prepare` (135) | OPERATOR |
| [packages/store/src/import.ts:359](../../packages/store/src/import.ts#L359) `readState` | `SQLite.get` (359); `SQLite.prepare` (359) | OPERATOR |
| [packages/store/src/import.ts:107](../../packages/store/src/import.ts#L107) `writeDesign` | `SQLite.prepare` (107, 111) | OPERATOR |
| [packages/store/src/layout-speed.ts:56](../../packages/store/src/layout-speed.ts#L56) `layoutCost/recordCount` | `Store.recordCount` (56) | DESIGN |
| [packages/store/src/layout-speed.ts:419](../../packages/store/src/layout-speed.ts#L419) `speedContext` | `Store.recordCount` (419) | DESIGN |
| [packages/store/src/native-compat.ts:91](../../packages/store/src/native-compat.ts#L91) `dateFields` | `SQLite.all` (91); `SQLite.prepare` (91) | OPERATOR |
| [packages/store/src/native-compat.ts:115](../../packages/store/src/native-compat.ts#L115) `inspectUpgrade` | `SQLite.get` (115); `SQLite.prepare` (115, 123); `SQLite.iterate` (123) | OPERATOR |
| [packages/store/src/native-compat.ts:61](../../packages/store/src/native-compat.ts#L61) `storedState/meta` | `SQLite.get` (61); `SQLite.prepare` (61) | OPERATOR |
| [packages/store/src/native-compat.ts:157](../../packages/store/src/native-compat.ts#L157) `upgradeNativeFile` | `SQLite.iterate` (157); `SQLite.prepare` (157, 158, 164) | OPERATOR |
| [packages/store/src/privileges.ts:554](../../packages/store/src/privileges.ts#L554) `ensurePrivilegeTables` | `SQLite.all` (554); `SQLite.prepare` (554) | AUTH |
| [packages/store/src/privileges.ts:526](../../packages/store/src/privileges.ts#L526) `privilegeSets` | `SQLite.all` (526); `SQLite.prepare` (526) | AUTH |
| [packages/store/src/reconvert.ts:222](../../packages/store/src/reconvert.ts#L222) `build` | `SQLite.get` (222); `SQLite.prepare` (222, 225, 230); `SQLite.all` (230) | OPERATOR |
| [packages/store/src/reconvert.ts:375](../../packages/store/src/reconvert.ts#L375) `carryImages` | `SQLite.all` (375, 377); `SQLite.prepare` (375, 377, 378) | OPERATOR |
| [packages/store/src/reconvert.ts:327](../../packages/store/src/reconvert.ts#L327) `carryRecords` | `SQLite.prepare` (327, 333, 336, 341, 342, 352, 358, 359); `SQLite.all` (333, 341, 345, 358) | OPERATOR |
| [packages/store/src/reconvert.ts:384](../../packages/store/src/reconvert.ts#L384) `carrySettings` | `SQLite.all` (384, 388, 396); `SQLite.prepare` (384, 388, 396, 397, 403); `SQLite.get` (403) | OPERATOR |
| [packages/store/src/reconvert.ts:100](../../packages/store/src/reconvert.ts#L100) `columns` | `SQLite.all` (100); `SQLite.prepare` (100) | OPERATOR |
| [packages/store/src/reconvert.ts:290](../../packages/store/src/reconvert.ts#L290) `copyContainer` | `SQLite.get` (290); `SQLite.prepare` (290, 292, 298) | OPERATOR |
| [packages/store/src/reconvert.ts:91](../../packages/store/src/reconvert.ts#L91) `meta` | `SQLite.get` (91); `SQLite.prepare` (91) | OPERATOR |
| [packages/store/src/reconvert.ts:270](../../packages/store/src/reconvert.ts#L270) `previewOf` | `SQLite.get` (270); `SQLite.prepare` (270) | OPERATOR |
| [packages/store/src/reconvert.ts:257](../../packages/store/src/reconvert.ts#L257) `previewOf/count` | `SQLite.get` (257); `SQLite.prepare` (257) | OPERATOR |
| [packages/store/src/reconvert.ts:146](../../packages/store/src/reconvert.ts#L146) `reconvertCheck` | `SQLite.get` (146); `SQLite.prepare` (146) | OPERATOR |
| [packages/store/src/reconvert.ts:96](../../packages/store/src/reconvert.ts#L96) `tableExists` | `SQLite.get` (96); `SQLite.prepare` (96) | OPERATOR |
| [packages/store/src/record-chain.ts:58](../../packages/store/src/record-chain.ts#L58) `ensureRecordChain` | `SQLite.all` (58); `SQLite.prepare` (58, 67, 68, 71); `SQLite.get` (67, 68) | CORE |
| [packages/store/src/record-chain.ts:80](../../packages/store/src/record-chain.ts#L80) `linkRecordEntry` | `SQLite.prepare` (80, 81, 82, 85, 86); `SQLite.get` (81, 82) | CORE |
| [packages/store/src/record-chain.ts:93](../../packages/store/src/record-chain.ts#L93) `pruneRecordEntries` | `SQLite.prepare` (93, 94, 95, 97); `SQLite.get` (94) | CORE |
| [packages/store/src/record-chain.ts:115](../../packages/store/src/record-chain.ts#L115) `verifyRecordAudit` | `SQLite.get` (115, 129); `SQLite.prepare` (115, 119, 129, 132); `SQLite.all` (119); `SQLite.iterate` (132) | CORE |
| [packages/store/src/related.ts:150](../../packages/store/src/related.ts#L150) `condition` | `Store.canViewRecord` (150); `keyValue` (163) | RELATED |
| [packages/store/src/related.ts:352](../../packages/store/src/related.ts#L352) `firstRelatedEach` | `Calculations.statement` (352); `SQLite.all` (352) | RELATED |
| [packages/store/src/related.ts:331](../../packages/store/src/related.ts#L331) `firstRelatedEach/keysOf` | `keyValue` (331) | RELATED |
| [packages/store/src/related.ts:318](../../packages/store/src/related.ts#L318) `firstRelatedEach/oneByOne` | `relatedRows` (318) | RELATED |
| [packages/store/src/related.ts:139](../../packages/store/src/related.ts#L139) `keyValue` | `Calculations.value` (139) | RELATED |
| [packages/store/src/related.ts:255](../../packages/store/src/related.ts#L255) `relatedIdList` | `Calculations.relatedIds` (255); `Calculations.statement` (260); `SQLite.iterate` (260) | RELATED |
| [packages/store/src/related.ts:298](../../packages/store/src/related.ts#L298) `relatedKeys` | `keyValue` (298) | RELATED |
| [packages/store/src/related.ts:197](../../packages/store/src/related.ts#L197) `relatedRows` | `Calculations.relatedIds` (197); `rowsById` (198); `Calculations.statement` (213, 217, 227); `SQLite.get` (213); `SQLite.all` (217); `SQLite.iterate` (227) | RELATED |
| [packages/store/src/results.ts:122](../../packages/store/src/results.ts#L122) `ResultCache/claimed` | `SQLite.get` (122); `SQLite.prepare` (122) | CORE |
| [packages/store/src/results.ts:74](../../packages/store/src/results.ts#L74) `ResultCache/get` | `SQLite.get` (74); `SQLite.prepare` (74) | CORE |
| [packages/store/src/results.ts:65](../../packages/store/src/results.ts#L65) `ResultCache/lastWrite` | `SQLite.get` (65); `SQLite.prepare` (65) | CORE |
| [packages/store/src/results.ts:86](../../packages/store/src/results.ts#L86) `ResultCache/put` | `SQLite.prepare` (86) | CORE |
| [packages/store/src/results.ts:131](../../packages/store/src/results.ts#L131) `ResultCache/release` | `SQLite.prepare` (131) | CORE |
| [packages/store/src/results.ts:110](../../packages/store/src/results.ts#L110) `ResultCache/renew` | `SQLite.prepare` (110) | CORE |
| [packages/store/src/results.ts:56](../../packages/store/src/results.ts#L56) `ResultCache/wrote` | `SQLite.prepare` (56) | CORE |
| [packages/store/src/security-chain.ts:144](../../packages/store/src/security-chain.ts#L144) `appendSecurityEvent` | `SQLite.prepare` (144, 146, 148, 150, 154, 156); `SQLite.get` (146, 150) | CORE |
| [packages/store/src/security-chain.ts:100](../../packages/store/src/security-chain.ts#L100) `ensureSecurityChain` | `SQLite.get` (100, 114, 115, 118, 119); `SQLite.prepare` (100, 101, 109, 114, 115, 118, 119, 123, 126, 134); `SQLite.all` (101, 109); `SQLite.iterate` (126) | CORE |
| [packages/store/src/security-chain.ts:164](../../packages/store/src/security-chain.ts#L164) `pruneSecurityEntries` | `SQLite.prepare` (164, 166, 171, 175, 177, 178); `SQLite.get` (166, 171, 175) | CORE |
| [packages/store/src/security-chain.ts:197](../../packages/store/src/security-chain.ts#L197) `verifySecurityAudit` | `SQLite.get` (197, 198); `SQLite.prepare` (197, 198, 203, 207, 222); `SQLite.all` (203, 207); `SQLite.iterate` (224) | CORE |
| [packages/store/src/sql-child.ts:32](../../packages/store/src/sql-child.ts#L32) `run` | `SQLite.iterate` (32) | CORE |
| [packages/store/src/sql-recursive.ts:44](../../packages/store/src/sql-recursive.ts#L44) `builtinFunctions` | `SQLite.all` (44); `SQLite.prepare` (44) | CORE |
| [packages/store/src/sql-result.ts:42](../../packages/store/src/sql-result.ts#L42) `boundedStatement` | `SQLite.prepare` (42, 53) | CORE |
| [packages/store/src/stale-calcs.ts:107](../../packages/store/src/stale-calcs.ts#L107) `current` | `Calculations.computeStored` (107) | DESIGN |
| [packages/store/src/stale-calcs.ts:128](../../packages/store/src/stale-calcs.ts#L128) `findStaleCalcs` | `Store.sql` (128, 135, 158); `Store.recordCount` (133); `SQLite.iterate` (135); `SQLite.prepare` (135) | DESIGN |
| [packages/store/src/stale-calcs.ts:283](../../packages/store/src/stale-calcs.ts#L283) `RefreshJournal/add` | `SQLite.prepare` (283); `Store.sql` (283) | DESIGN |
| [packages/store/src/stale-calcs.ts:277](../../packages/store/src/stale-calcs.ts#L277) `RefreshJournal/constructor` | `Store.sql` (277) | DESIGN |
| [packages/store/src/stale-calcs.ts:289](../../packages/store/src/stale-calcs.ts#L289) `RefreshJournal/get` | `SQLite.get` (289); `SQLite.prepare` (289); `Store.sql` (289) | DESIGN |
| [packages/store/src/stale-calcs.ts:294](../../packages/store/src/stale-calcs.ts#L294) `RefreshJournal/list` | `SQLite.all` (294); `SQLite.prepare` (294); `Store.sql` (294) | DESIGN |
| [packages/store/src/stale-calcs.ts:298](../../packages/store/src/stale-calcs.ts#L298) `RefreshJournal/markUndone` | `SQLite.prepare` (298); `Store.sql` (298) | DESIGN |
| [packages/store/src/stale-calcs.ts:205](../../packages/store/src/stale-calcs.ts#L205) `refreshStaleCalcsBatch` | `Store.sql` (205, 210, 228, 231); `SQLite.iterate` (210); `SQLite.prepare` (210) | DESIGN |
| [packages/store/src/stale-calcs.ts:243](../../packages/store/src/stale-calcs.ts#L243) `undoStaleRefreshBatch` | `Store.sql` (243, 261, 263) | DESIGN |
| [packages/store/src/store-format.ts:50](../../packages/store/src/store-format.ts#L50) `checkFormat` | `SQLite.prepare` (50) | CORE |
| [packages/store/src/store-format.ts:32](../../packages/store/src/store-format.ts#L32) `storedFormat` | `SQLite.get` (32); `SQLite.prepare` (32) | CORE |
| [packages/store/src/store.ts:5514](../../packages/store/src/store.ts#L5514) `Store/accountIdentityId` | `SQLite.get` (5514, 5520); `SQLite.prepare` (5514, 5519, 5520); `Store.sql` (5514, 5519, 5520) | CORE |
| [packages/store/src/store.ts:5508](../../packages/store/src/store.ts#L5508) `Store/accountIdentityIdIfSet` | `SQLite.get` (5508); `SQLite.prepare` (5508); `Store.sql` (5508) | CORE |
| [packages/store/src/store.ts:5470](../../packages/store/src/store.ts#L5470) `Store/accountInactive` | `SQLite.get` (5470); `SQLite.prepare` (5470); `Store.sql` (5470) | CORE |
| [packages/store/src/store.ts:5667](../../packages/store/src/store.ts#L5667) `Store/accountLocalOnly` | `SQLite.get` (5667); `SQLite.prepare` (5667); `Store.sql` (5667) | CORE |
| [packages/store/src/store.ts:6536](../../packages/store/src/store.ts#L6536) `Store/accountPrivilegeSet` | `SQLite.get` (6536); `SQLite.prepare` (6536); `Store.sql` (6536) | CORE |
| [packages/store/src/store.ts:5672](../../packages/store/src/store.ts#L5672) `Store/accountRequires2fa` | `SQLite.get` (5672); `SQLite.prepare` (5672); `Store.sql` (5672) | CORE |
| [packages/store/src/store.ts:3830](../../packages/store/src/store.ts#L3830) `Store/accounts` | `SQLite.all` (3830); `SQLite.prepare` (3830); `Store.sql` (3830) | CORE |
| [packages/store/src/store.ts:3826](../../packages/store/src/store.ts#L3826) `Store/accountsSharingLockout` | `SQLite.all` (3826); `SQLite.prepare` (3826); `Store.sql` (3826) | CORE |
| [packages/store/src/store.ts:5892](../../packages/store/src/store.ts#L5892) `Store/accountUsage` | `SQLite.get` (5892); `SQLite.prepare` (5892, 5893); `Store.sql` (5892, 5893); `SQLite.all` (5893); `Store.auditLog` (5909) | CORE |
| [packages/store/src/store.ts:8773](../../packages/store/src/store.ts#L8773) `Store/addContainer` | `SQLite.all` (8773); `SQLite.prepare` (8773, 8778, 8792, 8796, 8797); `Store.sql` (8773, 8778, 8792, 8794, 8796, 8797, 8799, 8802); `SQLite.get` (8783); `Store.containerRange` (8785) | CORE |
| [packages/store/src/store.ts:8819](../../packages/store/src/store.ts#L8819) `Store/addExternalContainer` | `SQLite.prepare` (8819); `Store.sql` (8819) | CORE |
| [packages/store/src/store.ts:9296](../../packages/store/src/store.ts#L9296) `Store/addFieldIndex` | `Store.sql` (9296) | CORE |
| [packages/store/src/store.ts:7418](../../packages/store/src/store.ts#L7418) `Store/addImage` | `Store.sql` (7418, 7419); `SQLite.prepare` (7419) | CORE |
| [packages/store/src/store.ts:6586](../../packages/store/src/store.ts#L6586) `Store/addProvisionedAccount` | `SQLite.get` (6586); `SQLite.prepare` (6586, 6590); `Store.sql` (6586, 6590) | CORE |
| [packages/store/src/store.ts:7878](../../packages/store/src/store.ts#L7878) `Store/addRelated` | `relatedRows` (7878); `rowsById` (7913); `firstRelatedEach` (7939) | CORE |
| [packages/store/src/store.ts:7866](../../packages/store/src/store.ts#L7866) `Store/addRelated/summaries` | `Calculations.summary` (7866) | CORE |
| [packages/store/src/store.ts:3848](../../packages/store/src/store.ts#L3848) `Store/agentNeedsApproval` | `SQLite.get` (3848); `SQLite.prepare` (3848); `Store.sql` (3848) | CORE |
| [packages/store/src/store.ts:6813](../../packages/store/src/store.ts#L6813) `Store/allowedIds` | `SQLite.iterate` (6813); `SQLite.prepare` (6813); `Store.sql` (6813) | CORE |
| [packages/store/src/store.ts:5949](../../packages/store/src/store.ts#L5949) `Store/apiToken` | `SQLite.get` (5949); `SQLite.prepare` (5949, 5967); `Store.sql` (5949, 5967) | CORE |
| [packages/store/src/store.ts:5925](../../packages/store/src/store.ts#L5925) `Store/apiTokens` | `SQLite.all` (5925); `SQLite.prepare` (5925); `Store.sql` (5925) | CORE |
| [packages/store/src/store.ts:4248](../../packages/store/src/store.ts#L4248) `Store/appendSecurityEvent` | `Store.sql` (4248) | CORE |
| [packages/store/src/store.ts:3289](../../packages/store/src/store.ts#L3289) `Store/appendSecurityRow` | `Store.sql` (3289) | CORE |
| [packages/store/src/store.ts:5290](../../packages/store/src/store.ts#L5290) `Store/applyAccountImport` | `Store.sql` (5290, 5298, 5327); `SQLite.get` (5298); `SQLite.prepare` (5298, 5327) | CORE |
| [packages/store/src/store.ts:2559](../../packages/store/src/store.ts#L2559) `Store/applyDesign` | `Store.sql` (2559, 2560, 2580, 2583, 2588, 2604, 2607, 2607); `SQLite.prepare` (2583, 2588) | CORE |
| [packages/store/src/store.ts:4092](../../packages/store/src/store.ts#L4092) `Store/approvePending` | `SQLite.get` (4092); `SQLite.prepare` (4092, 4104); `Store.sql` (4092, 4104) | CORE |
| [packages/store/src/store.ts:3080](../../packages/store/src/store.ts#L3080) `Store/audit/write` | `Store.sql` (3080) | CORE |
| [packages/store/src/store.ts:2671](../../packages/store/src/store.ts#L2671) `Store/auditLog` | `SQLite.all` (2671); `SQLite.prepare` (2671); `Store.sql` (2671) | CORE |
| [packages/store/src/store.ts:2094](../../packages/store/src/store.ts#L2094) `Store/backup` | `Store.sql` (2094) | CORE |
| [packages/store/src/store.ts:3854](../../packages/store/src/store.ts#L3854) `Store/blankPasswordAccounts` | `SQLite.all` (3854); `SQLite.prepare` (3854); `Store.sql` (3854) | CORE |
| [packages/store/src/store.ts:5219](../../packages/store/src/store.ts#L5219) `Store/canonicalAccount` | `SQLite.all` (5219); `SQLite.prepare` (5219); `Store.sql` (5219) | CORE |
| [packages/store/src/store.ts:9882](../../packages/store/src/store.ts#L9882) `Store/canView` | `Store.canView` (9882); `Store.row` (9883) | GATED-STORE |
| [packages/store/src/store.ts:9864](../../packages/store/src/store.ts#L9864) `Store/canViewRecord` | `SQLite.get` (9864); `SQLite.prepare` (9864); `Store.sql` (9864) | GATED-STORE |
| [packages/store/src/store.ts:10962](../../packages/store/src/store.ts#L10962) `Store/cascadeDelete` | `relatedRows` (10962) | CORE |
| [packages/store/src/store.ts:2394](../../packages/store/src/store.ts#L2394) `Store/changeOne` | `Store.sql` (2394, 2396) | CORE |
| [packages/store/src/store.ts:2397](../../packages/store/src/store.ts#L2397) `Store/changeOne/read` | `SQLite.get` (2397); `SQLite.prepare` (2397); `Store.sql` (2397) | CORE |
| [packages/store/src/store.ts:9154](../../packages/store/src/store.ts#L9154) `Store/checkContainerWrite` | `Store.row` (9154) | CORE |
| [packages/store/src/store.ts:10585](../../packages/store/src/store.ts#L10585) `Store/checkEditable` | `Store.row` (10585) | CORE |
| [packages/store/src/store.ts:1640](../../packages/store/src/store.ts#L1640) `Store/checkpoint` | `SQLite.get` (1640); `SQLite.prepare` (1640); `Store.sql` (1640) | CORE |
| [packages/store/src/store.ts:3991](../../packages/store/src/store.ts#L3991) `Store/checkProposedWrite` | `Store.row` (3991); `relatedRows` (4005) | CORE |
| [packages/store/src/store.ts:6572](../../packages/store/src/store.ts#L6572) `Store/clearAccountPrivilegeSet` | `SQLite.prepare` (6572); `Store.sql` (6572) | CORE |
| [packages/store/src/store.ts:1662](../../packages/store/src/store.ts#L1662) `Store/close` | `Store.sql` (1662) | CORE |
| [packages/store/src/store.ts:9122](../../packages/store/src/store.ts#L9122) `Store/compactFile` | `Store.sql` (9122, 9123, 9125) | CORE |
| [packages/store/src/store.ts:9533](../../packages/store/src/store.ts#L9533) `Store/computedRows` | `Store.sql` (9533, 9536, 9537, 9538, 9540, 9550, 9551, 9552, 9555); `SQLite.prepare` (9536, 9538, 9540, 9550); `SQLite.iterate` (9540); `Calculations.globalValue` (9543); `Calculations.unstoredValue` (9544); `Calculations.related` (9547); `SQLite.all` (9550) | CORE |
| [packages/store/src/store.ts:11087](../../packages/store/src/store.ts#L11087) `Store/computeValuesCurrent` | `Store.computeValues` (11087); `Store.sql` (11093, 11097); `SQLite.all` (11097); `SQLite.prepare` (11097) | GATED-STORE |
| [packages/store/src/store.ts:5994](../../packages/store/src/store.ts#L5994) `Store/confirmTotp` | `SQLite.get` (5994); `SQLite.prepare` (5994, 5996); `Store.sql` (5994, 5996) | CORE |
| [packages/store/src/store.ts:1270](../../packages/store/src/store.ts#L1270) `Store/constructor` | `Store.sql` (1270, 1272, 1274, 1275, 1279, 1283, 1284, 1293, 1301, 1317, 1322, 1327, 1328, 1332, 1333, 1334, 1341, 1345, 1349, 1350, 1351, 1353, 1363, 1364, 1368, 1371, 1372, 1374, 1375, 1378, 1379, 1383, 1384, 1388, 1389, 1392, 1395, 1396, 1398, 1401, 1402, 1406, 1407, 1411, 1412, 1416, 1417, 1418, 1421, 1422, 1425, 1426, 1428, 1428, 1429, 1429, 1430, 1434, 1436, 1440, 1442, 1445, 1446, 1447, 1450, 1451, 1453, 1455, 1456, 1460, 1461, 1463, 1475, 1477, 1478, 1479, 1479, 1483, 1484); `SQLite.get` (1274, 1293); `SQLite.prepare` (1274, 1293, 1301, 1353, 1371, 1372, 1375, 1378, 1383, 1388, 1395, 1401, 1406, 1411, 1421, 1425, 1428, 1429, 1450, 1455, 1460); `SQLite.all` (1371, 1378, 1383, 1388, 1395, 1401, 1406, 1411, 1421, 1425, 1428, 1429, 1450, 1455, 1460) | CORE |
| [packages/store/src/store.ts:6352](../../packages/store/src/store.ts#L6352) `Store/consumeRecoveryCode` | `SQLite.prepare` (6352); `Store.sql` (6352) | CORE |
| [packages/store/src/store.ts:8697](../../packages/store/src/store.ts#L8697) `Store/container` | `SQLite.get` (8697); `SQLite.prepare` (8697, 8706); `Store.sql` (8697, 8706); `SQLite.all` (8706) | CORE |
| [packages/store/src/store.ts:9131](../../packages/store/src/store.ts#L9131) `Store/containerId` | `Store.containerId` (9131); `Store.row` (9132) | CORE |
| [packages/store/src/store.ts:8714](../../packages/store/src/store.ts#L8714) `Store/containerInfo` | `SQLite.get` (8714); `SQLite.prepare` (8714); `Store.sql` (8714) | CORE |
| [packages/store/src/store.ts:8678](../../packages/store/src/store.ts#L8678) `Store/containerIntact` | `SQLite.get` (8678); `SQLite.prepare` (8678); `Store.sql` (8678) | CORE |
| [packages/store/src/store.ts:8617](../../packages/store/src/store.ts#L8617) `Store/containerIntegrityReport` | `SQLite.all` (8617); `SQLite.prepare` (8617, 8628); `Store.sql` (8617, 8628); `SQLite.get` (8628) | CORE |
| [packages/store/src/store.ts:8692](../../packages/store/src/store.ts#L8692) `Store/containerMeta` | `SQLite.get` (8692); `SQLite.prepare` (8692); `Store.sql` (8692) | CORE |
| [packages/store/src/store.ts:8748](../../packages/store/src/store.ts#L8748) `Store/containerRange` | `SQLite.all` (8748); `SQLite.prepare` (8748, 8755); `Store.sql` (8748, 8755); `SQLite.get` (8755) | CORE |
| [packages/store/src/store.ts:8519](../../packages/store/src/store.ts#L8519) `Store/containerReferences` | `SQLite.all` (8519, 8538, 8540, 8546, 8559, 8570, 8584); `SQLite.prepare` (8519, 8538, 8540, 8546, 8559, 8570, 8582, 8584); `Store.sql` (8519, 8538, 8540, 8546, 8559, 8570, 8582, 8584); `SQLite.get` (8582); `Store.row` (8593) | CORE |
| [packages/store/src/store.ts:11067](../../packages/store/src/store.ts#L11067) `Store/countIds` | `Store.countIds` (11067); `SQLite.get` (11071); `SQLite.prepare` (11071); `Store.sql` (11071) | GATED-STORE |
| [packages/store/src/store.ts:9913](../../packages/store/src/store.ts#L9913) `Store/create` | `SQLite.get` (9913); `SQLite.prepare` (9913, 9926); `Store.sql` (9913, 9926) | CORE |
| [packages/store/src/store.ts:4220](../../packages/store/src/store.ts#L4220) `Store/createAccountOnly` | `SQLite.get` (4220); `SQLite.prepare` (4220, 4224, 4230, 4235, 4240); `Store.sql` (4220, 4224, 4230, 4235, 4240) | CORE |
| [packages/store/src/store.ts:5725](../../packages/store/src/store.ts#L5725) `Store/createApiToken` | `SQLite.get` (5725, 5753); `SQLite.prepare` (5725, 5752, 5753, 5763); `Store.sql` (5725, 5752, 5753, 5763) | CORE |
| [packages/store/src/store.ts:5231](../../packages/store/src/store.ts#L5231) `Store/createLocalAccount` | `SQLite.prepare` (5231); `Store.sql` (5231) | CORE |
| [packages/store/src/store.ts:3820](../../packages/store/src/store.ts#L3820) `Store/credentialIdentity` | `SQLite.get` (3820); `SQLite.prepare` (3820); `Store.sql` (3820) | CORE |
| [packages/store/src/store.ts:5646](../../packages/store/src/store.ts#L5646) `Store/credentialStamp` | `SQLite.get` (5646); `SQLite.prepare` (5646); `Store.sql` (5646) | CORE |
| [packages/store/src/store.ts:7251](../../packages/store/src/store.ts#L7251) `Store/crossFileBusy` | `Store.sql` (7251) | AUTH |
| [packages/store/src/store.ts:7223](../../packages/store/src/store.ts#L7223) `Store/crossFileHash` | `SQLite.get` (7223); `SQLite.prepare` (7223); `Store.sql` (7223) | AUTH |
| [packages/store/src/store.ts:2184](../../packages/store/src/store.ts#L2184) `Store/dataVersion` | `SQLite.get` (2184); `SQLite.prepare` (2184); `Store.sql` (2184) | CORE |
| [packages/store/src/store.ts:11630](../../packages/store/src/store.ts#L11630) `Store/decimalViewSql` | `SQLite.all` (11630); `SQLite.prepare` (11630) | CORE |
| [packages/store/src/store.ts:10628](../../packages/store/src/store.ts#L10628) `Store/delete` | `Store.row` (10628) | CORE |
| [packages/store/src/store.ts:10636](../../packages/store/src/store.ts#L10636) `Store/delete/run` | `SQLite.get` (10636); `SQLite.prepare` (10636, 10641); `Store.sql` (10636, 10641) | CORE |
| [packages/store/src/store.ts:5385](../../packages/store/src/store.ts#L5385) `Store/deleteAccount` | `SQLite.prepare` (5385, 5389, 5390, 5391, 5392, 5393, 5394, 5395, 5396, 5403, 5405, 5407, 5409, 5413); `Store.sql` (5385, 5389, 5390, 5391, 5392, 5393, 5394, 5395, 5396, 5403, 5405, 5407, 5409, 5413) | CORE |
| [packages/store/src/store.ts:10709](../../packages/store/src/store.ts#L10709) `Store/deleteBeingUndone` | `SQLite.all` (10709); `SQLite.prepare` (10709); `Store.sql` (10709) | CORE |
| [packages/store/src/store.ts:3457](../../packages/store/src/store.ts#L3457) `Store/deletedRows` | `SQLite.get` (3457); `SQLite.prepare` (3457, 3459, 3459); `Store.sql` (3457, 3459, 3459); `SQLite.all` (3459, 3459) | CORE |
| [packages/store/src/store.ts:10721](../../packages/store/src/store.ts#L10721) `Store/deleteEndingTheLifeAt` | `SQLite.get` (10721); `SQLite.prepare` (10721); `Store.sql` (10721) | CORE |
| [packages/store/src/store.ts:6437](../../packages/store/src/store.ts#L6437) `Store/deletePrivilegeSet` | `SQLite.prepare` (6437); `Store.sql` (6437) | CORE |
| [packages/store/src/store.ts:4358](../../packages/store/src/store.ts#L4358) `Store/deleteScriptTest` | `SQLite.prepare` (4358); `Store.sql` (4358) | CORE |
| [packages/store/src/store.ts:10613](../../packages/store/src/store.ts#L10613) `Store/deleteVisibility` | `Store.canViewRecord` (10613) | CORE |
| [packages/store/src/store.ts:7360](../../packages/store/src/store.ts#L7360) `Store/design` | `SQLite.get` (7360) | CORE |
| [packages/store/src/store.ts:3567](../../packages/store/src/store.ts#L3567) `Store/designEffect` | `Store.sql` (3567, 3573, 3574, 3577, 3583, 3588, 3591, 3597, 3608, 3609, 3611, 3612, 3625, 3626, 3629, 3631, 3637, 3638, 3639, 3645, 3647, 3651, 3654, 3655, 3657, 3660, 3666, 3668, 3675, 3676, 3678, 3679, 3680, 3681, 3688, 3689, 3691, 3691, 3693, 3694, 3695, 3699, 3703, 3705, 3743, 3745, 3747); `SQLite.prepare` (3577, 3608, 3609, 3625, 3626, 3637, 3638, 3645, 3647, 3651, 3655, 3666, 3668, 3681, 3688, 3689, 3691, 3693, 3695, 3699, 3703); `SQLite.get` (3608, 3625, 3637, 3638, 3651, 3655, 3691, 3699); `SQLite.all` (3688, 3689); `SQLite.iterate` (3693) | CORE |
| [packages/store/src/store.ts:3560](../../packages/store/src/store.ts#L3560) `Store/designEffect/renameExcluded` | `SQLite.prepare` (3560); `Store.sql` (3560) | CORE |
| [packages/store/src/store.ts:3544](../../packages/store/src/store.ts#L3544) `Store/designEffect/renameKey` | `SQLite.prepare` (3544); `Store.sql` (3544) | CORE |
| [packages/store/src/store.ts:3498](../../packages/store/src/store.ts#L3498) `Store/designHistory` | `SQLite.all` (3498); `SQLite.prepare` (3498); `Store.sql` (3498) | CORE |
| [packages/store/src/store.ts:6015](../../packages/store/src/store.ts#L6015) `Store/disableTotp` | `SQLite.prepare` (6015); `Store.sql` (6015) | CORE |
| [packages/store/src/store.ts:3755](../../packages/store/src/store.ts#L3755) `Store/dropColumnIndexes` | `SQLite.all` (3755, 3757); `SQLite.prepare` (3755, 3757); `Store.sql` (3755, 3757, 3758) | CORE |
| [packages/store/src/store.ts:9308](../../packages/store/src/store.ts#L9308) `Store/dropFieldIndex` | `SQLite.get` (9308); `SQLite.prepare` (9308); `Store.sql` (9308, 9309) | CORE |
| [packages/store/src/store.ts:9950](../../packages/store/src/store.ts#L9950) `Store/duplicate` | `Store.row` (9950); `SQLite.prepare` (9968); `Store.sql` (9968) | CORE |
| [packages/store/src/store.ts:8935](../../packages/store/src/store.ts#L8935) `Store/embeddedContainerCount` | `SQLite.prepare` (8935); `Store.sql` (8935); `SQLite.get` (8936) | CORE |
| [packages/store/src/store.ts:8921](../../packages/store/src/store.ts#L8921) `Store/embeddedContainers` | `SQLite.prepare` (8921, 8922); `Store.sql` (8921, 8922); `SQLite.all` (8922); `SQLite.get` (8926) | CORE |
| [packages/store/src/store.ts:3483](../../packages/store/src/store.ts#L3483) `Store/emptyDeleted` | `Store.sql` (3483, 3486, 3487, 3489, 3491); `SQLite.prepare` (3487) | CORE |
| [packages/store/src/store.ts:2060](../../packages/store/src/store.ts#L2060) `Store/endTransaction` | `Store.sql` (2060, 2063, 2063) | CORE |
| [packages/store/src/store.ts:5983](../../packages/store/src/store.ts#L5983) `Store/enrollTotp` | `SQLite.prepare` (5983); `Store.sql` (5983) | CORE |
| [packages/store/src/store.ts:3452](../../packages/store/src/store.ts#L3452) `Store/ensureDeleted` | `Store.sql` (3452) | CORE |
| [packages/store/src/store.ts:1494](../../packages/store/src/store.ts#L1494) `Store/ensureNativeIds` | `SQLite.all` (1494, 1506); `SQLite.prepare` (1494, 1497, 1505, 1506); `Store.sql` (1494, 1497, 1500, 1504, 1505, 1506, 1509, 1511) | CORE |
| [packages/store/src/store.ts:2306](../../packages/store/src/store.ts#L2306) `Store/ensureRecordIdHighWater` | `Store.sql` (2306, 2307, 2309, 2311, 2313) | CORE |
| [packages/store/src/store.ts:2325](../../packages/store/src/store.ts#L2325) `Store/ensureRecordIdMarks` | `SQLite.all` (2325, 2328, 2331, 2340); `SQLite.prepare` (2325, 2328, 2331, 2334, 2340, 2343); `Store.sql` (2325, 2328, 2331, 2334, 2340, 2343, 2347, 2348) | CORE |
| [packages/store/src/store.ts:10282](../../packages/store/src/store.ts#L10282) `Store/evaluateCurrent` | `Store.row` (10282, 10282, 10283, 10283); `Calculations.context` (10288); `Store.get` (10289, 10291) | GATED-STORE |
| [packages/store/src/store.ts:10323](../../packages/store/src/store.ts#L10323) `Store/evaluateEachCurrent` | `Store.row` (10323, 10323, 10328); `Calculations.context` (10329); `Store.get` (10331) | GATED-STORE |
| [packages/store/src/store.ts:10385](../../packages/store/src/store.ts#L10385) `Store/evaluateRowsCurrent` | `Store.row` (10385, 10385, 10386, 10386) | GATED-STORE |
| [packages/store/src/store.ts:10364](../../packages/store/src/store.ts#L10364) `Store/evaluateRowsCurrent/each` | `Calculations.context` (10364); `Store.get` (10366) | GATED-STORE |
| [packages/store/src/store.ts:10400](../../packages/store/src/store.ts#L10400) `Store/evaluateRowsCurrent/found/[Symbol.iterator]` | `rowsById` (10400) | GATED-STORE |
| [packages/store/src/store.ts:10422](../../packages/store/src/store.ts#L10422) `Store/evaluateRowsCurrent/key` | `Calculations.context` (10422) | GATED-STORE |
| [packages/store/src/store.ts:4136](../../packages/store/src/store.ts#L4136) `Store/externalAccount` | `SQLite.all` (4136); `SQLite.prepare` (4136); `Store.sql` (4136) | CORE |
| [packages/store/src/store.ts:8440](../../packages/store/src/store.ts#L8440) `Store/externalContainerCheck` | `SQLite.all` (8440); `SQLite.prepare` (8440); `Store.sql` (8440) | CORE |
| [packages/store/src/store.ts:8447](../../packages/store/src/store.ts#L8447) `Store/externalContainerCount` | `SQLite.get` (8447); `SQLite.prepare` (8447); `Store.sql` (8447) | CORE |
| [packages/store/src/store.ts:8456](../../packages/store/src/store.ts#L8456) `Store/externalContainerReport` | `SQLite.all` (8456, 8469); `SQLite.prepare` (8456, 8469); `Store.sql` (8456, 8469) | CORE |
| [packages/store/src/store.ts:5496](../../packages/store/src/store.ts#L5496) `Store/externalIdentityId` | `SQLite.get` (5496, 5503); `SQLite.prepare` (5496, 5502, 5503); `Store.sql` (5496, 5502, 5503) | CORE |
| [packages/store/src/store.ts:8688](../../packages/store/src/store.ts#L8688) `Store/externalOf` | `SQLite.get` (8688); `SQLite.prepare` (8688); `Store.sql` (8688) | CORE |
| [packages/store/src/store.ts:3233](../../packages/store/src/store.ts#L3233) `Store/failureAuditRoom` | `SQLite.get` (3233); `SQLite.prepare` (3233); `Store.sql` (3233) | CORE |
| [packages/store/src/store.ts:8087](../../packages/store/src/store.ts#L8087) `Store/fieldIndexCurrent` | `SQLite.iterate` (8087); `SQLite.prepare` (8087, 8092); `Store.sql` (8087, 8092); `SQLite.all` (8092) | GATED-STORE |
| [packages/store/src/store.ts:9348](../../packages/store/src/store.ts#L9348) `Store/find` | `Store.find` (9348) | GATED-STORE |
| [packages/store/src/store.ts:9720](../../packages/store/src/store.ts#L9720) `Store/findCandidates` | `Store.query` (9720) | CORE |
| [packages/store/src/store.ts:9359](../../packages/store/src/store.ts#L9359) `Store/findHere` | `Store.query` (9359, 9364, 9366, 9380, 9382, 9393); `Store.recordCount` (9377); `SQLite.get` (9378, 9382); `SQLite.prepare` (9378, 9382, 9388, 9395, 9404); `Store.sql` (9378, 9382, 9388, 9395, 9404); `SQLite.all` (9388, 9395, 9404) | GATED-STORE |
| [packages/store/src/store.ts:9399](../../packages/store/src/store.ts#L9399) `Store/findHere/[Symbol.iterator]` | `SQLite.iterate` (9399); `SQLite.prepare` (9399); `Store.sql` (9399) | GATED-STORE |
| [packages/store/src/store.ts:11198](../../packages/store/src/store.ts#L11198) `Store/findIdsCurrent` | `Store.findIds` (11198) | GATED-STORE |
| [packages/store/src/store.ts:11134](../../packages/store/src/store.ts#L11134) `Store/findIdsCurrentProgress` | `Store.findIdsProgress` (11134); `Store.query` (11136, 11137, 11150, 11152); `Store.recordCount` (11142, 11170); `SQLite.iterate` (11167); `SQLite.prepare` (11167, 11175, 11176); `Store.sql` (11167, 11175, 11176); `SQLite.get` (11179); `SQLite.all` (11185) | GATED-STORE |
| [packages/store/src/store.ts:11204](../../packages/store/src/store.ts#L11204) `Store/findIdsHere` | `Store.query` (11204, 11209, 11211); `SQLite.iterate` (11222); `SQLite.prepare` (11222); `Store.sql` (11222) | GATED-STORE |
| [packages/store/src/store.ts:9664](../../packages/store/src/store.ts#L9664) `Store/findSource` | `Store.query` (9664); `SQLite.all` (9673, 9690); `SQLite.prepare` (9673, 9681, 9689); `Store.sql` (9673, 9678, 9681, 9686, 9689, 9703, 9705); `Calculations.globalValue` (9695); `Calculations.unstoredValue` (9696); `Calculations.related` (9700) | CORE |
| [packages/store/src/store.ts:3345](../../packages/store/src/store.ts#L3345) `Store/flushDeferredSecurity` | `Store.sql` (3345) | CORE |
| [packages/store/src/store.ts:5352](../../packages/store/src/store.ts#L5352) `Store/forgetStandIns` | `SQLite.prepare` (5352); `Store.sql` (5352) | CORE |
| [packages/store/src/store.ts:10676](../../packages/store/src/store.ts#L10676) `Store/forgetStandInValues` | `Store.sql` (10676, 10697); `SQLite.prepare` (10697) | CORE |
| [packages/store/src/store.ts:7968](../../packages/store/src/store.ts#L7968) `Store/foundSetPage` | `rowsById` (7968) | CORE |
| [packages/store/src/store.ts:7984](../../packages/store/src/store.ts#L7984) `Store/foundSetRowsCurrent` | `Store.viewableIds` (7984); `Store.row` (8000) | GATED-STORE |
| [packages/store/src/store.ts:4054](../../packages/store/src/store.ts#L4054) `Store/gateAgentWrite` | `SQLite.get` (4054); `SQLite.prepare` (4054, 4056); `Store.sql` (4054, 4056) | CORE |
| [packages/store/src/store.ts:6290](../../packages/store/src/store.ts#L6290) `Store/generateRecoveryCodes` | `SQLite.prepare` (6290, 6293); `Store.sql` (6290, 6293) | CORE |
| [packages/store/src/store.ts:9792](../../packages/store/src/store.ts#L9792) `Store/getCurrent` | `Store.get` (9792); `Store.row` (9793, 9793, 9807); `SQLite.all` (9810); `SQLite.prepare` (9810); `Store.sql` (9810) | GATED-STORE |
| [packages/store/src/store.ts:9830](../../packages/store/src/store.ts#L9830) `Store/getManyCurrent` | `Store.getMany` (9830); `SQLite.get` (9848); `SQLite.prepare` (9848); `Store.sql` (9848) | GATED-STORE |
| [packages/store/src/store.ts:9841](../../packages/store/src/store.ts#L9841) `Store/getManyCurrent/[Symbol.iterator]` | `rowsById` (9841) | GATED-STORE |
| [packages/store/src/store.ts:1541](../../packages/store/src/store.ts#L1541) `Store/grantFullAccessClients` | `SQLite.prepare` (1541); `Store.sql` (1541) | CORE |
| [packages/store/src/store.ts:11239](../../packages/store/src/store.ts#L11239) `Store/groupSummariesCurrent` | `Store.groupSummaries` (11239); `Store.viewableIds` (11244); `Calculations.collect` (11260); `rowsById` (11260, 11310); `Calculations.collector` (11282) | GATED-STORE |
| [packages/store/src/store.ts:11308](../../packages/store/src/store.ts#L11308) `Store/groupSummariesCurrent/flush` | `Calculations.collector` (11308) | GATED-STORE |
| [packages/store/src/store.ts:11272](../../packages/store/src/store.ts#L11272) `Store/groupSummariesCurrent/key` | `Calculations.value` (11272); `Calculations.related` (11274) | GATED-STORE |
| [packages/store/src/store.ts:1568](../../packages/store/src/store.ts#L1568) `Store/hasOwnPassword` | `SQLite.get` (1568); `SQLite.prepare` (1568); `Store.sql` (1568) | CORE |
| [packages/store/src/store.ts:6145](../../packages/store/src/store.ts#L6145) `Store/hasPasskey` | `SQLite.get` (6145); `SQLite.prepare` (6145); `Store.sql` (6145) | CORE |
| [packages/store/src/store.ts:1549](../../packages/store/src/store.ts#L1549) `Store/hasProvingPassword` | `SQLite.get` (1549); `SQLite.prepare` (1549); `Store.sql` (1549) | CORE |
| [packages/store/src/store.ts:9262](../../packages/store/src/store.ts#L9262) `Store/hasTable` | `SQLite.get` (9262); `SQLite.prepare` (9262); `Store.sql` (9262) | CORE |
| [packages/store/src/store.ts:6004](../../packages/store/src/store.ts#L6004) `Store/hasTotp` | `SQLite.get` (6004); `SQLite.prepare` (6004); `Store.sql` (6004) | CORE |
| [packages/store/src/store.ts:5475](../../packages/store/src/store.ts#L5475) `Store/identityAllowed` | `SQLite.get` (5475, 5481, 5487); `SQLite.prepare` (5475, 5481, 5487); `Store.sql` (5475, 5481, 5487) | CORE |
| [packages/store/src/store.ts:7395](../../packages/store/src/store.ts#L7395) `Store/image` | `SQLite.get` (7395); `SQLite.prepare` (7395); `Store.sql` (7395) | CORE |
| [packages/store/src/store.ts:7405](../../packages/store/src/store.ts#L7405) `Store/images` | `SQLite.all` (7405); `SQLite.prepare` (7405); `Store.sql` (7405) | CORE |
| [packages/store/src/store.ts:5196](../../packages/store/src/store.ts#L5196) `Store/importAccounts` | `SQLite.all` (5196); `SQLite.prepare` (5196); `Store.sql` (5196) | CORE |
| [packages/store/src/store.ts:1882](../../packages/store/src/store.ts#L1882) `Store/independentWindowWrite` | `SQLite.get` (1882); `SQLite.prepare` (1882, 1890, 1950); `Store.sql` (1882, 1890, 1900, 1928, 1945, 1950, 1953); `SQLite.all` (1890); `Store.row` (1948) | CORE |
| [packages/store/src/store.ts:9274](../../packages/store/src/store.ts#L9274) `Store/indexedFields` | `SQLite.all` (9274, 9275); `SQLite.prepare` (9274, 9275); `Store.sql` (9274, 9275) | CORE |
| [packages/store/src/store.ts:11663](../../packages/store/src/store.ts#L11663) `Store/internalRoots` | `SQLite.get` (11663); `SQLite.prepare` (11663, 11665); `SQLite.all` (11665) | CORE |
| [packages/store/src/store.ts:3842](../../packages/store/src/store.ts#L3842) `Store/isAgent` | `SQLite.get` (3842); `SQLite.prepare` (3842); `Store.sql` (3842) | CORE |
| [packages/store/src/store.ts:3945](../../packages/store/src/store.ts#L3945) `Store/isExternal` | `SQLite.get` (3945); `SQLite.prepare` (3945); `Store.sql` (3945) | CORE |
| [packages/store/src/store.ts:6059](../../packages/store/src/store.ts#L6059) `Store/issueWebauthnChallenge` | `SQLite.prepare` (6059, 6061, 6062, 6064); `Store.sql` (6059, 6061, 6062, 6064); `SQLite.get` (6061) | CORE |
| [packages/store/src/store.ts:11524](../../packages/store/src/store.ts#L11524) `Store/iterateCommitted` | `SQLite.iterate` (11524) | CORE |
| [packages/store/src/store.ts:1822](../../packages/store/src/store.ts#L1822) `Store/joinTransaction` | `Store.sql` (1822, 1823, 1825, 1827, 1833, 1836) | CORE |
| [packages/store/src/store.ts:10909](../../packages/store/src/store.ts#L10909) `Store/keyStepWork` | `Store.sql` (10909, 10915, 10919, 10921) | CORE |
| [packages/store/src/store.ts:7211](../../packages/store/src/store.ts#L7211) `Store/knownSharedAccount` | `SQLite.get` (7211); `SQLite.prepare` (7211); `Store.sql` (7211) | CORE |
| [packages/store/src/store.ts:4669](../../packages/store/src/store.ts#L4669) `Store/lastSignIns` | `Store.auditLog` (4669) | CORE |
| [packages/store/src/store.ts:10727](../../packages/store/src/store.ts#L10727) `Store/latestDeleteSeq` | `SQLite.get` (10727); `SQLite.prepare` (10727); `Store.sql` (10727) | CORE |
| [packages/store/src/store.ts:7438](../../packages/store/src/store.ts#L7438) `Store/layout` | `SQLite.get` (7438); `SQLite.prepare` (7438); `Store.sql` (7438) | CORE |
| [packages/store/src/store.ts:3515](../../packages/store/src/store.ts#L3515) `Store/layoutHistory` | `SQLite.all` (3515); `SQLite.prepare` (3515); `Store.sql` (3515) | CORE |
| [packages/store/src/store.ts:7325](../../packages/store/src/store.ts#L7325) `Store/layouts` | `SQLite.all` (7325); `SQLite.prepare` (7325); `Store.sql` (7325) | CORE |
| [packages/store/src/store.ts:4969](../../packages/store/src/store.ts#L4969) `Store/leastPrivilege` | `SQLite.all` (4969); `SQLite.prepare` (4969); `Store.sql` (4969) | CORE |
| [packages/store/src/store.ts:5573](../../packages/store/src/store.ts#L5573) `Store/ledgerRow` | `SQLite.get` (5573, 5574); `SQLite.prepare` (5573, 5574); `Store.sql` (5573, 5574) | AUTH |
| [packages/store/src/store.ts:5585](../../packages/store/src/store.ts#L5585) `Store/ledgerWrite` | `Store.sql` (5585, 5586, 5588, 5590, 5593, 5593) | AUTH |
| [packages/store/src/store.ts:5279](../../packages/store/src/store.ts#L5279) `Store/limitAccountImport` | `SQLite.prepare` (5279, 5280, 5283); `Store.sql` (5279, 5280, 5283); `SQLite.get` (5280) | CORE |
| [packages/store/src/store.ts:3795](../../packages/store/src/store.ts#L3795) `Store/linkIdentity` | `SQLite.get` (3795); `SQLite.prepare` (3795); `Store.sql` (3795) | CORE |
| [packages/store/src/store.ts:3787](../../packages/store/src/store.ts#L3787) `Store/linkPrincipal` | `SQLite.get` (3787); `SQLite.prepare` (3787); `Store.sql` (3787) | CORE |
| [packages/store/src/store.ts:4555](../../packages/store/src/store.ts#L4555) `Store/markPiiField` | `SQLite.prepare` (4555); `Store.sql` (4555) | CORE |
| [packages/store/src/store.ts:8413](../../packages/store/src/store.ts#L8413) `Store/markRepeating` | `SQLite.prepare` (8413); `Store.sql` (8413) | CORE |
| [packages/store/src/store.ts:11457](../../packages/store/src/store.ts#L11457) `Store/matchIds` | `Store.matchIds` (11457); `SQLite.all` (11463); `SQLite.prepare` (11463); `Store.sql` (11463) | CORE |
| [packages/store/src/store.ts:1583](../../packages/store/src/store.ts#L1583) `Store/meta` | `SQLite.get` (1583); `SQLite.prepare` (1583); `Store.sql` (1583) | CORE |
| [packages/store/src/store.ts:1020](../../packages/store/src/store.ts#L1020) `Store/metadataVersions` | `SQLite.get` (1020); `SQLite.prepare` (1020); `Store.sql` (1020) | CORE |
| [packages/store/src/store.ts:9050](../../packages/store/src/store.ts#L9050) `Store/moveContainersIn` | `Store.sql` (9050, 9056, 9058, 9059, 9060, 9061, 9081, 9086, 9086, 9097, 9100, 9103, 9110); `SQLite.prepare` (9058, 9059, 9060, 9061, 9097, 9103); `SQLite.get` (9063, 9097, 9103) | CORE |
| [packages/store/src/store.ts:8972](../../packages/store/src/store.ts#L8972) `Store/moveContainersOut` | `Store.sql` (8972, 8980, 8982, 8984, 8989, 8990, 9010, 9016, 9018, 9020, 9020, 9026, 9026, 9031, 9033, 9035, 9035, 9041); `SQLite.get` (8980); `SQLite.prepare` (8980, 8989, 8990); `Store.container` (8992) | CORE |
| [packages/store/src/store.ts:5150](../../packages/store/src/store.ts#L5150) `Store/mustChangePassword` | `SQLite.get` (5150); `SQLite.prepare` (5150); `Store.sql` (5150) | CORE |
| [packages/store/src/store.ts:1519](../../packages/store/src/store.ts#L1519) `Store/nativeIdGuards` | `Store.sql` (1519, 1520, 1522) | CORE |
| [packages/store/src/store.ts:2361](../../packages/store/src/store.ts#L2361) `Store/nextRecordId` | `SQLite.get` (2361); `SQLite.prepare` (2361); `Store.sql` (2361) | CORE |
| [packages/store/src/store.ts:5879](../../packages/store/src/store.ts#L5879) `Store/objectUseSince` | `SQLite.get` (5879); `SQLite.prepare` (5879); `Store.sql` (5879) | CORE |
| [packages/store/src/store.ts:9234](../../packages/store/src/store.ts#L9234) `Store/orderBy` | `Store.valueListItems` (9234) | CORE |
| [packages/store/src/store.ts:8605](../../packages/store/src/store.ts#L8605) `Store/orphanContainerReport` | `SQLite.all` (8605); `SQLite.prepare` (8605); `Store.sql` (8605) | CORE |
| [packages/store/src/store.ts:6111](../../packages/store/src/store.ts#L6111) `Store/passkeyAllowList` | `SQLite.all` (6111); `SQLite.prepare` (6111); `Store.sql` (6111) | CORE |
| [packages/store/src/store.ts:6150](../../packages/store/src/store.ts#L6150) `Store/passkeyIds` | `SQLite.all` (6150); `SQLite.prepare` (6150); `Store.sql` (6150) | CORE |
| [packages/store/src/store.ts:6138](../../packages/store/src/store.ts#L6138) `Store/passkeys` | `SQLite.all` (6138); `SQLite.prepare` (6138); `Store.sql` (6138) | CORE |
| [packages/store/src/store.ts:5189](../../packages/store/src/store.ts#L5189) `Store/passwordDaysRemaining` | `SQLite.get` (5189); `SQLite.prepare` (5189); `Store.sql` (5189) | CORE |
| [packages/store/src/store.ts:7169](../../packages/store/src/store.ts#L7169) `Store/passwordState` | `SQLite.get` (7169); `SQLite.prepare` (7169); `Store.sql` (7169) | CORE |
| [packages/store/src/store.ts:4078](../../packages/store/src/store.ts#L4078) `Store/pendingChanges` | `SQLite.all` (4078); `SQLite.prepare` (4078); `Store.sql` (4078) | CORE |
| [packages/store/src/store.ts:1601](../../packages/store/src/store.ts#L1601) `Store/persistentData` | `SQLite.get` (1601) | CORE |
| [packages/store/src/store.ts:1610](../../packages/store/src/store.ts#L1610) `Store/persistentDataIds` | `SQLite.all` (1610) | CORE |
| [packages/store/src/store.ts:1591](../../packages/store/src/store.ts#L1591) `Store/persistentTable` | `Store.sql` (1591) | CORE |
| [packages/store/src/store.ts:10570](../../packages/store/src/store.ts#L10570) `Store/portalContainerTarget` | `Store.row` (10570); `relatedIdList` (10572) | CORE |
| [packages/store/src/store.ts:8023](../../packages/store/src/store.ts#L8023) `Store/portalCountsCurrent` | `Store.canView` (8023); `Store.row` (8050) | GATED-STORE |
| [packages/store/src/store.ts:8268](../../packages/store/src/store.ts#L8268) `Store/portalRows` | `relatedRows` (8268); `relatedIdList` (8269); `Store.viewableSet` (8272); `rowsById` (8297, 8335); `Calculations.related` (8311) | CORE |
| [packages/store/src/store.ts:8279](../../packages/store/src/store.ts#L8279) `Store/portalRows/context` | `Calculations.context` (8279) | CORE |
| [packages/store/src/store.ts:8289](../../packages/store/src/store.ts#L8289) `Store/portalRows/valueOf` | `Calculations.value` (8289) | CORE |
| [packages/store/src/store.ts:2737](../../packages/store/src/store.ts#L2737) `Store/prepared` | `SQLite.prepare` (2737); `Store.sql` (2737) | CORE |
| [packages/store/src/store.ts:5261](../../packages/store/src/store.ts#L5261) `Store/previewAccountImport` | `Store.sql` (5261, 5262, 5271) | CORE |
| [packages/store/src/store.ts:6967](../../packages/store/src/store.ts#L6967) `Store/previewRecordRuleCurrent` | `SQLite.get` (6967); `SQLite.prepare` (6967, 6970); `Store.sql` (6967, 6970); `SQLite.all` (6970); `Calculations.context` (6976, 6992) | CORE |
| [packages/store/src/store.ts:9755](../../packages/store/src/store.ts#L9755) `Store/previewRow` | `Store.row` (9755) | CORE |
| [packages/store/src/store.ts:6365](../../packages/store/src/store.ts#L6365) `Store/privilegeSets` | `Store.sql` (6365) | CORE |
| [packages/store/src/store.ts:2974](../../packages/store/src/store.ts#L2974) `Store/pruneAudit` | `Store.sql` (2974, 2977, 2982, 2984, 2992, 2997, 2999); `SQLite.get` (2982, 2995, 2999); `SQLite.prepare` (2982, 2992, 2999) | CORE |
| [packages/store/src/store.ts:8640](../../packages/store/src/store.ts#L8640) `Store/purgeOrphanContainers` | `Store.sql` (8640, 8644, 8653, 8656, 8657, 8662, 8663, 8665, 8665); `Store.orphanContainerReport` (8648); `SQLite.get` (8653); `SQLite.prepare` (8653, 8656, 8657) | CORE |
| [packages/store/src/store.ts:11786](../../packages/store/src/store.ts#L11786) `Store/query` | `SQLite.iterate` (11786) | CORE |
| [packages/store/src/store.ts:11826](../../packages/store/src/store.ts#L11826) `Store/queryWithOriginsCurrent` | `SQLite.iterate` (11826); `SQLite.all` (11835, 11838); `SQLite.prepare` (11835, 11838) | CORE |
| [packages/store/src/store.ts:11575](../../packages/store/src/store.ts#L11575) `Store/readOnlyChecked` | `SQLite.prepare` (11575, 11579, 11588, 11593); `SQLite.all` (11579, 11588, 11593) | CORE |
| [packages/store/src/store.ts:3767](../../packages/store/src/store.ts#L3767) `Store/recompute` | `SQLite.prepare` (3767, 3771); `Store.sql` (3767, 3771); `SQLite.iterate` (3771); `Calculations.computeStoredStyled` (3772); `Calculations.value` (3772) | CORE |
| [packages/store/src/store.ts:2752](../../packages/store/src/store.ts#L2752) `Store/recordAsOf` | `SQLite.get` (2752, 2754); `SQLite.prepare` (2752, 2754, 2756, 2757); `Store.sql` (2752, 2754, 2756, 2757); `SQLite.all` (2756, 2757) | CORE |
| [packages/store/src/store.ts:2448](../../packages/store/src/store.ts#L2448) `Store/recordCount` | `SQLite.get` (2448); `SQLite.prepare` (2448); `Store.sql` (2448) | CORE |
| [packages/store/src/store.ts:1648](../../packages/store/src/store.ts#L1648) `Store/recordedFormat` | `Store.sql` (1648) | CORE |
| [packages/store/src/store.ts:2829](../../packages/store/src/store.ts#L2829) `Store/recordLife` | `SQLite.all` (2829); `SQLite.prepare` (2829); `Store.sql` (2829) | CORE |
| [packages/store/src/store.ts:5810](../../packages/store/src/store.ts#L5810) `Store/recordObjectUse` | `Store.sql` (5810) | CORE |
| [packages/store/src/store.ts:10272](../../packages/store/src/store.ts#L10272) `Store/recordViewable` | `Store.row` (10272) | GATED-STORE |
| [packages/store/src/store.ts:8944](../../packages/store/src/store.ts#L8944) `Store/recoverContainersOut` | `SQLite.prepare` (8944); `Store.sql` (8944); `SQLite.get` (8947) | CORE |
| [packages/store/src/store.ts:1751](../../packages/store/src/store.ts#L1751) `Store/recoverPendingExternalFiles` | `Store.sql` (1751, 1753, 1777, 1779); `SQLite.prepare` (1753); `SQLite.get` (1764) | CORE |
| [packages/store/src/store.ts:6308](../../packages/store/src/store.ts#L6308) `Store/recoveryCodesRemaining` | `SQLite.get` (6308); `SQLite.prepare` (6308); `Store.sql` (6308) | CORE |
| [packages/store/src/store.ts:11615](../../packages/store/src/store.ts#L11615) `Store/refreshDecimalSqlViews` | `SQLite.get` (11615); `SQLite.prepare` (11615) | CORE |
| [packages/store/src/store.ts:3936](../../packages/store/src/store.ts#L3936) `Store/refuseLookalikeAccount` | `SQLite.all` (3936); `SQLite.prepare` (3936); `Store.sql` (3936) | CORE |
| [packages/store/src/store.ts:6174](../../packages/store/src/store.ts#L6174) `Store/registerPasskey` | `SQLite.prepare` (6174); `Store.sql` (6174) | CORE |
| [packages/store/src/store.ts:4114](../../packages/store/src/store.ts#L4114) `Store/rejectPending` | `SQLite.get` (4114); `SQLite.prepare` (4114, 4116); `Store.sql` (4114, 4116) | CORE |
| [packages/store/src/store.ts:9507](../../packages/store/src/store.ts#L9507) `Store/relatedCriteria` | `SQLite.iterate` (9507); `SQLite.prepare` (9507); `Store.sql` (9507) | CORE |
| [packages/store/src/store.ts:9504](../../packages/store/src/store.ts#L9504) `Store/relatedCriteria/matched` | `relatedRows` (9504) | CORE |
| [packages/store/src/store.ts:7778](../../packages/store/src/store.ts#L7778) `Store/relatedValues` | `Calculations.globalValue` (7778); `Calculations.unstoredValue` (7780) | CORE |
| [packages/store/src/store.ts:6187](../../packages/store/src/store.ts#L6187) `Store/removePasskey` | `SQLite.get` (6187); `SQLite.prepare` (6187, 6188); `Store.sql` (6187, 6188) | CORE |
| [packages/store/src/store.ts:9333](../../packages/store/src/store.ts#L9333) `Store/reportFind` | `Store.query` (9333, 9335, 9336); `Store.recordCount` (9338) | CORE |
| [packages/store/src/store.ts:10747](../../packages/store/src/store.ts#L10747) `Store/restoreDeletedRowLocked` | `SQLite.get` (10747, 10752); `SQLite.prepare` (10747, 10748, 10752, 10762); `Store.sql` (10747, 10748, 10752, 10762); `SQLite.all` (10748) | CORE |
| [packages/store/src/store.ts:2787](../../packages/store/src/store.ts#L2787) `Store/restoreRecord` | `Store.recordAsOf` (2787); `SQLite.get` (2791); `SQLite.prepare` (2791, 2796, 2805, 2816); `Store.sql` (2791, 2796, 2805, 2816) | CORE |
| [packages/store/src/store.ts:2845](../../packages/store/src/store.ts#L2845) `Store/revertAuditEntry` | `SQLite.get` (2845); `SQLite.prepare` (2845); `Store.sql` (2845); `Store.canViewRecord` (2847); `Store.auditLog` (2850) | CORE |
| [packages/store/src/store.ts:5935](../../packages/store/src/store.ts#L5935) `Store/revokeApiToken` | `SQLite.prepare` (5935); `Store.sql` (5935) | CORE |
| [packages/store/src/store.ts:5458](../../packages/store/src/store.ts#L5458) `Store/revokeSignInCredentials` | `SQLite.prepare` (5458, 5459, 5460); `Store.sql` (5458, 5459, 5460) | AUTH |
| [packages/store/src/store.ts:9773](../../packages/store/src/store.ts#L9773) `Store/row` | `SQLite.get` (9773) | CORE |
| [packages/store/src/store.ts:11719](../../packages/store/src/store.ts#L11719) `Store/rowsOf` | `SQLite.iterate` (11719, 11728) | CORE |
| [packages/store/src/store.ts:6772](../../packages/store/src/store.ts#L6772) `Store/ruleOutcome` | `Calculations.context` (6772) | CORE |
| [packages/store/src/store.ts:9618](../../packages/store/src/store.ts#L9618) `Store/runningSummaryValues` | `Store.viewableIds` (9618); `rowsById` (9620); `Calculations.value` (9631, 9637); `Calculations.related` (9648) | GATED-STORE |
| [packages/store/src/store.ts:6394](../../packages/store/src/store.ts#L6394) `Store/savePrivilegeSet` | `SQLite.prepare` (6394, 6402); `Store.sql` (6394, 6402) | AUTH |
| [packages/store/src/store.ts:4349](../../packages/store/src/store.ts#L4349) `Store/saveScriptTest` | `SQLite.prepare` (4349); `Store.sql` (4349) | CORE |
| [packages/store/src/store.ts:6932](../../packages/store/src/store.ts#L6932) `Store/scopedTableSql` | `Store.viewableIds` (6932); `SQLite.all` (6935); `SQLite.prepare` (6935); `Store.sql` (6935) | GATED-STORE |
| [packages/store/src/store.ts:3505](../../packages/store/src/store.ts#L3505) `Store/scriptHistory` | `SQLite.all` (3505); `SQLite.prepare` (3505); `Store.sql` (3505) | CORE |
| [packages/store/src/store.ts:1727](../../packages/store/src/store.ts#L1727) `Store/securityChainHeadAudit` | `SQLite.get` (1727); `SQLite.prepare` (1727); `Store.sql` (1727) | CORE |
| [packages/store/src/store.ts:3178](../../packages/store/src/store.ts#L3178) `Store/securityChange` | `Store.sql` (3178, 3180); `SQLite.prepare` (3180) | CORE |
| [packages/store/src/store.ts:2711](../../packages/store/src/store.ts#L2711) `Store/securityEvents` | `Store.auditLog` (2711) | CORE |
| [packages/store/src/store.ts:5659](../../packages/store/src/store.ts#L5659) `Store/securityToken` | `SQLite.get` (5659); `SQLite.prepare` (5659); `Store.sql` (5659) | CORE |
| [packages/store/src/store.ts:11749](../../packages/store/src/store.ts#L11749) `Store/selectHeldCurrent` | `Store.sql` (11749, 11751, 11754); `SQLite.prepare` (11751) | CORE |
| [packages/store/src/store.ts:11053](../../packages/store/src/store.ts#L11053) `Store/selectIdsCurrent` | `Store.selectIds` (11053); `SQLite.all` (11059); `SQLite.prepare` (11059); `Store.sql` (11059) | GATED-STORE |
| [packages/store/src/store.ts:11739](../../packages/store/src/store.ts#L11739) `Store/selectIn` | `Store.select` (11739) | CORE |
| [packages/store/src/store.ts:2114](../../packages/store/src/store.ts#L2114) `Store/selfContainedCopy` | `Store.sql` (2114); `SQLite.all` (2119); `SQLite.prepare` (2119, 2121, 2122, 2123) | CORE |
| [packages/store/src/store.ts:5437](../../packages/store/src/store.ts#L5437) `Store/setAccountActive` | `SQLite.prepare` (5437, 5445, 5446); `Store.sql` (5437, 5445, 5446) | AUTH |
| [packages/store/src/store.ts:5678](../../packages/store/src/store.ts#L5678) `Store/setAccountLocalOnly` | `SQLite.prepare` (5678); `Store.sql` (5678) | CORE |
| [packages/store/src/store.ts:6550](../../packages/store/src/store.ts#L6550) `Store/setAccountPrivilegeSet` | `SQLite.get` (6550); `SQLite.prepare` (6550, 6553, 6557); `Store.sql` (6550, 6553, 6557) | AUTH |
| [packages/store/src/store.ts:5687](../../packages/store/src/store.ts#L5687) `Store/setAccountRequire2fa` | `SQLite.prepare` (5687); `Store.sql` (5687) | CORE |
| [packages/store/src/store.ts:3966](../../packages/store/src/store.ts#L3966) `Store/setAgentAccount` | `SQLite.get` (3966); `SQLite.prepare` (3966, 3972); `Store.sql` (3966, 3972) | CORE |
| [packages/store/src/store.ts:4428](../../packages/store/src/store.ts#L4428) `Store/setAiAllowed` | `SQLite.prepare` (4428); `Store.sql` (4428) | CORE |
| [packages/store/src/store.ts:4513](../../packages/store/src/store.ts#L4513) `Store/setAiPolicy` | `SQLite.prepare` (4513); `Store.sql` (4513) | CORE |
| [packages/store/src/store.ts:7198](../../packages/store/src/store.ts#L7198) `Store/setAllowBlankPasswordFromLan` | `SQLite.prepare` (7198); `Store.sql` (7198) | CORE |
| [packages/store/src/store.ts:2951](../../packages/store/src/store.ts#L2951) `Store/setAuditSettings` | `SQLite.prepare` (2951); `Store.sql` (2951) | CORE |
| [packages/store/src/store.ts:9163](../../packages/store/src/store.ts#L9163) `Store/setContainer` | `Store.sql` (9163); `Store.row` (9169) | CORE |
| [packages/store/src/store.ts:3918](../../packages/store/src/store.ts#L3918) `Store/setExternalAccount` | `SQLite.get` (3918); `SQLite.prepare` (3918, 3923); `Store.sql` (3918, 3923) | CORE |
| [packages/store/src/store.ts:5136](../../packages/store/src/store.ts#L5136) `Store/setMustChangePassword` | `SQLite.prepare` (5136); `Store.sql` (5136) | CORE |
| [packages/store/src/store.ts:4173](../../packages/store/src/store.ts#L4173) `Store/setPasswordOnly` | `SQLite.get` (4173); `SQLite.prepare` (4173, 4179, 4188, 4195, 4196, 4197); `Store.sql` (4173, 4179, 4188, 4195, 4196, 4197) | AUTH |
| [packages/store/src/store.ts:4290](../../packages/store/src/store.ts#L4290) `Store/setPasswordPolicy` | `SQLite.prepare` (4290); `Store.sql` (4290) | CORE |
| [packages/store/src/store.ts:1616](../../packages/store/src/store.ts#L1616) `Store/setPersistentData` | `SQLite.prepare` (1616, 1620); `Store.sql` (1616, 1620) | CORE |
| [packages/store/src/store.ts:4533](../../packages/store/src/store.ts#L4533) `Store/setPiiIsolation` | `SQLite.prepare` (4533); `Store.sql` (4533) | CORE |
| [packages/store/src/store.ts:4326](../../packages/store/src/store.ts#L4326) `Store/setRequireTotpForFullAccess` | `SQLite.prepare` (4326); `Store.sql` (4326) | CORE |
| [packages/store/src/store.ts:4445](../../packages/store/src/store.ts#L4445) `Store/setScriptNetwork` | `SQLite.prepare` (4445); `Store.sql` (4445) | CORE |
| [packages/store/src/store.ts:4502](../../packages/store/src/store.ts#L4502) `Store/setSqlRequiresFmxdbc` | `SQLite.prepare` (4502); `Store.sql` (4502) | CORE |
| [packages/store/src/store.ts:10193](../../packages/store/src/store.ts#L10193) `Store/setStoredCalcValues` | `SQLite.prepare` (10193, 10194); `Store.sql` (10193, 10194); `SQLite.get` (10198) | CORE |
| [packages/store/src/store.ts:5612](../../packages/store/src/store.ts#L5612) `Store/settleSignIns` | `SQLite.all` (5612, 5618); `SQLite.prepare` (5612, 5618, 5624, 5628, 5630); `Store.sql` (5612, 5618, 5624, 5628, 5630) | AUTH |
| [packages/store/src/store.ts:9266](../../packages/store/src/store.ts#L9266) `Store/setUserPref` | `Store.sql` (9266, 9267, 9268); `SQLite.prepare` (9267, 9268) | CORE |
| [packages/store/src/store.ts:4486](../../packages/store/src/store.ts#L4486) `Store/setWebViewerHosts` | `SQLite.prepare` (4486); `Store.sql` (4486) | CORE |
| [packages/store/src/store.ts:2245](../../packages/store/src/store.ts#L2245) `Store/shareResults` | `Store.sql` (2245) | CORE |
| [packages/store/src/store.ts:1678](../../packages/store/src/store.ts#L1678) `Store/shipWal` | `Store.sql` (1678) | CORE |
| [packages/store/src/store.ts:5559](../../packages/store/src/store.ts#L5559) `Store/signInBase` | `SQLite.get` (5559); `SQLite.prepare` (5559); `Store.sql` (5559) | AUTH |
| [packages/store/src/store.ts:5561](../../packages/store/src/store.ts#L5561) `Store/signInBase/identity` | `SQLite.get` (5561); `SQLite.prepare` (5561); `Store.sql` (5561) | AUTH |
| [packages/store/src/store.ts:5548](../../packages/store/src/store.ts#L5548) `Store/signInMark` | `SQLite.prepare` (5548); `Store.sql` (5548) | AUTH |
| [packages/store/src/store.ts:9432](../../packages/store/src/store.ts#L9432) `Store/sortedPage` | `SQLite.iterate` (9432); `SQLite.prepare` (9432, 9447); `Store.sql` (9432, 9447); `SQLite.all` (9447) | CORE |
| [packages/store/src/store.ts:11351](../../packages/store/src/store.ts#L11351) `Store/sortIdsCurrentProgress` | `Store.sortIds` (11351); `Store.sortIdsProgress` (11351); `SQLite.all` (11364); `SQLite.prepare` (11364, 11443); `Store.sql` (11364, 11443); `Store.valueListItems` (11372); `rowsById` (11384); `Calculations.globalValue` (11387); `Calculations.unstoredValue` (11388); `Calculations.related` (11394); `SQLite.iterate` (11443) | GATED-STORE |
| [packages/store/src/store.ts:11529](../../packages/store/src/store.ts#L11529) `Store/storedFileId` | `SQLite.get` (11529); `SQLite.prepare` (11529) | CORE |
| [packages/store/src/store.ts:9580](../../packages/store/src/store.ts#L9580) `Store/summaries` | `Calculations.wholeTable` (9580); `Calculations.collect` (9600, 9605) | CORE |
| [packages/store/src/store.ts:9596](../../packages/store/src/store.ts#L9596) `Store/summaries/recs` | `SQLite.iterate` (9596); `SQLite.prepare` (9596); `Store.sql` (9596) | CORE |
| [packages/store/src/store.ts:6125](../../packages/store/src/store.ts#L6125) `Store/takeWebauthnChallenge` | `SQLite.get` (6125); `SQLite.prepare` (6125, 6129); `Store.sql` (6125, 6129) | CORE |
| [packages/store/src/store.ts:7382](../../packages/store/src/store.ts#L7382) `Store/themes` | `SQLite.get` (7382) | CORE |
| [packages/store/src/store.ts:9319](../../packages/store/src/store.ts#L9319) `Store/timeFind` | `Store.query` (9319) | CORE |
| [packages/store/src/store.ts:7717](../../packages/store/src/store.ts#L7717) `Store/toRecord` | `Calculations.value` (7717, 7727); `Calculations.globalValue` (7721); `Calculations.unstoredStyled` (7726) | CORE |
| [packages/store/src/store.ts:6009](../../packages/store/src/store.ts#L6009) `Store/totpAccounts` | `SQLite.all` (6009); `SQLite.prepare` (6009); `Store.sql` (6009) | CORE |
| [packages/store/src/store.ts:1690](../../packages/store/src/store.ts#L1690) `Store/trial` | `Store.sql` (1690) | CORE |
| [packages/store/src/store.ts:1695](../../packages/store/src/store.ts#L1695) `Store/trial/undo` | `Store.sql` (1695) | CORE |
| [packages/store/src/store.ts:11485](../../packages/store/src/store.ts#L11485) `Store/truncate/run` | `Store.sql` (11485, 11487, 11494, 11496, 11498, 11499); `SQLite.prepare` (11487, 11494); `SQLite.all` (11489) | CORE |
| [packages/store/src/store.ts:3865](../../packages/store/src/store.ts#L3865) `Store/unmigratedAccounts` | `SQLite.all` (3865); `SQLite.prepare` (3865); `Store.sql` (3865) | CORE |
| [packages/store/src/store.ts:5042](../../packages/store/src/store.ts#L5042) `Store/unusedAccess` | `SQLite.get` (5042); `SQLite.prepare` (5042, 5051); `Store.sql` (5042, 5051); `SQLite.all` (5051) | CORE |
| [packages/store/src/store.ts:5090](../../packages/store/src/store.ts#L5090) `Store/unusedObjects` | `SQLite.get` (5090); `SQLite.prepare` (5090, 5093); `Store.sql` (5090, 5093); `SQLite.all` (5093) | CORE |
| [packages/store/src/store.ts:6249](../../packages/store/src/store.ts#L6249) `Store/unusedRecoveryHashes` | `SQLite.all` (6249); `SQLite.prepare` (6249); `Store.sql` (6249) | CORE |
| [packages/store/src/store.ts:4872](../../packages/store/src/store.ts#L4872) `Store/unusualAccess` | `Store.auditLog` (4872, 4938) | CORE |
| [packages/store/src/store.ts:10014](../../packages/store/src/store.ts#L10014) `Store/update` | `Store.row` (10014); `Store.sql` (10045, 10046, 10085, 10088) | CORE |
| [packages/store/src/store.ts:10048](../../packages/store/src/store.ts#L10048) `Store/update/undo` | `Store.sql` (10048) | CORE |
| [packages/store/src/store.ts:10478](../../packages/store/src/store.ts#L10478) `Store/updatePortals` | `Store.row` (10478, 10514); `relatedRows` (10515) | CORE |
| [packages/store/src/store.ts:10488](../../packages/store/src/store.ts#L10488) `Store/updatePortals/portal/related` | `relatedIdList` (10488) | CORE |
| [packages/store/src/store.ts:10460](../../packages/store/src/store.ts#L10460) `Store/updateRelated` | `relatedRows` (10460) | CORE |
| [packages/store/src/store.ts:5128](../../packages/store/src/store.ts#L5128) `Store/usageCounting` | `SQLite.get` (5128); `SQLite.prepare` (5128); `Store.sql` (5128) | CORE |
| [packages/store/src/store.ts:9257](../../packages/store/src/store.ts#L9257) `Store/userPrefs` | `SQLite.all` (9257); `SQLite.prepare` (9257); `Store.sql` (9257) | CORE |
| [packages/store/src/store.ts:8139](../../packages/store/src/store.ts#L8139) `Store/valueListItemsCurrent` | `Store.valueListItems` (8139); `Store.get` (8153); `relatedRows` (8154); `Store.row` (8154); `SQLite.iterate` (8156); `SQLite.prepare` (8156); `Store.sql` (8156); `Calculations.related` (8166); `Calculations.value` (8170, 8171) | GATED-STORE |
| [packages/store/src/store.ts:10669](../../packages/store/src/store.ts#L10669) `Store/vaultHeld` | `SQLite.get` (10669); `SQLite.prepare` (10669); `Store.sql` (10669) | CORE |
| [packages/store/src/store.ts:6209](../../packages/store/src/store.ts#L6209) `Store/verifyPasskeyCredential` | `SQLite.get` (6209); `SQLite.prepare` (6209, 6221); `Store.sql` (6209, 6221) | CORE |
| [packages/store/src/store.ts:6038](../../packages/store/src/store.ts#L6038) `Store/verifyTotp` | `SQLite.get` (6038); `SQLite.prepare` (6038, 6045); `Store.sql` (6038, 6045) | CORE |
| [packages/store/src/store.ts:2381](../../packages/store/src/store.ts#L2381) `Store/versionNumber` | `SQLite.get` (2381); `SQLite.prepare` (2381); `Store.sql` (2381) | CORE |
| [packages/store/src/store.ts:2256](../../packages/store/src/store.ts#L2256) `Store/versionTriggers` | `SQLite.get` (2256); `SQLite.prepare` (2256, 2261, 2262); `Store.sql` (2256, 2261, 2262, 2279, 2281, 2282, 2284); `SQLite.all` (2261, 2262) | CORE |
| [packages/store/src/store.ts:2224](../../packages/store/src/store.ts#L2224) `Store/warmSummariesCurrent` | `Calculations.wholeTable` (2224) | CORE |
| [packages/store/src/store.ts:4468](../../packages/store/src/store.ts#L4468) `Store/webViewerChecked` | `SQLite.get` (4468); `SQLite.prepare` (4468); `Store.sql` (4468) | CORE |
| [packages/store/src/store.ts:1982](../../packages/store/src/store.ts#L1982) `Store/withWriteTransaction` | `Store.sql` (1982, 1994, 2000, 2002, 2002) | CORE |
| [packages/store/src/store.ts:7646](../../packages/store/src/store.ts#L7646) `Store/wordIndex` | `Store.sql` (7646, 7654, 7659); `Store.recordCount` (7658); `SQLite.get` (7659); `SQLite.prepare` (7659) | CORE |
| [packages/store/src/store.ts:8837](../../packages/store/src/store.ts#L8837) `Store/writeExternalFile` | `Store.evaluateEach` (8837); `SQLite.prepare` (8860); `Store.sql` (8860) | CORE |
| [packages/store/src/store.ts:8861](../../packages/store/src/store.ts#L8861) `Store/writeExternalFile/taken` | `SQLite.get` (8861) | CORE |
| [packages/store/src/store.ts:5868](../../packages/store/src/store.ts#L5868) `Store/writeObjectUseRows` | `SQLite.prepare` (5868, 5869, 5874); `Store.sql` (5868, 5869, 5874) | CORE |
| [packages/store/src/store.ts:2436](../../packages/store/src/store.ts#L2436) `Store/writeToken` | `SQLite.get` (2436); `SQLite.prepare` (2436); `Store.sql` (2436) | CORE |
| [packages/store/src/store.ts:5840](../../packages/store/src/store.ts#L5840) `Store/writeUsage` | `Store.sql` (5840, 5841, 5843, 5847, 5849) | CORE |
| [packages/store/src/store.ts:5856](../../packages/store/src/store.ts#L5856) `Store/writeUsageRows` | `SQLite.prepare` (5856, 5857, 5863); `Store.sql` (5856, 5857, 5863) | CORE |
| [packages/store/src/sync-apply.ts:352](../../packages/store/src/sync-apply.ts#L352) `applySyncRun` | `Store.container` (352, 353, 383); `Store.containerInfo` (369); `SQLite.prepare` (464, 730, 762, 786); `Store.sql` (464, 730, 762, 786); `SQLite.get` (762, 786) | OPERATOR |
| [packages/store/src/sync-apply.ts:676](../../packages/store/src/sync-apply.ts#L676) `applySyncRun/containerChanges` | `Store.container` (676) | OPERATOR |
| [packages/store/src/sync-apply.ts:485](../../packages/store/src/sync-apply.ts#L485) `applySyncRun/fail` | `SQLite.get` (485); `SQLite.prepare` (485); `Store.sql` (485) | OPERATOR |
| [packages/store/src/sync-apply.ts:825](../../packages/store/src/sync-apply.ts#L825) `applySyncRun/filesToSend` | `SQLite.all` (825); `SQLite.prepare` (825); `Store.sql` (825); `Store.containerInfo` (836); `Store.container` (841) | OPERATOR |
| [packages/store/src/sync-apply.ts:580](../../packages/store/src/sync-apply.ts#L580) `applySyncRun/pullWouldChange` | `Store.container` (580, 584) | OPERATOR |
| [packages/store/src/sync-apply.ts:185](../../packages/store/src/sync-apply.ts#L185) `atomically` | `Store.sql` (185, 188, 191, 192) | OPERATOR |
| [packages/store/src/sync-apply.ts:216](../../packages/store/src/sync-apply.ts#L216) `clearContainersPending` | `SQLite.prepare` (216); `Store.sql` (216) | OPERATOR |
| [packages/store/src/sync-apply.ts:206](../../packages/store/src/sync-apply.ts#L206) `dropMap` | `SQLite.prepare` (206, 207); `Store.sql` (206, 207) | OPERATOR |
| [packages/store/src/sync-apply.ts:178](../../packages/store/src/sync-apply.ts#L178) `finishRow` | `SQLite.prepare` (178); `Store.sql` (178) | OPERATOR |
| [packages/store/src/sync-apply.ts:242](../../packages/store/src/sync-apply.ts#L242) `heldReason` | `SQLite.get` (242); `SQLite.prepare` (242); `Store.sql` (242) | OPERATOR |
| [packages/store/src/sync-apply.ts:247](../../packages/store/src/sync-apply.ts#L247) `holdTable` | `SQLite.prepare` (247); `Store.sql` (247) | OPERATOR |
| [packages/store/src/sync-apply.ts:171](../../packages/store/src/sync-apply.ts#L171) `logRow` | `SQLite.prepare` (171); `Store.sql` (171) | OPERATOR |
| [packages/store/src/sync-apply.ts:211](../../packages/store/src/sync-apply.ts#L211) `markContainersPending` | `SQLite.prepare` (211); `Store.sql` (211) | OPERATOR |
| [packages/store/src/sync-apply.ts:231](../../packages/store/src/sync-apply.ts#L231) `owedContainers` | `SQLite.all` (231); `SQLite.prepare` (231); `Store.sql` (231) | OPERATOR |
| [packages/store/src/sync-apply.ts:268](../../packages/store/src/sync-apply.ts#L268) `readSyncLog` | `SQLite.get` (268); `SQLite.prepare` (268, 270, 271); `Store.sql` (268, 270, 271); `SQLite.all` (270, 271) | OPERATOR |
| [packages/store/src/sync-apply.ts:312](../../packages/store/src/sync-apply.ts#L312) `recordsIn` | `SQLite.get` (312); `SQLite.prepare` (312); `Store.sql` (312) | OPERATOR |
| [packages/store/src/sync-apply.ts:259](../../packages/store/src/sync-apply.ts#L259) `releaseHeldTables` | `SQLite.prepare` (259); `Store.sql` (259) | OPERATOR |
| [packages/store/src/sync-apply.ts:198](../../packages/store/src/sync-apply.ts#L198) `upsertMap` | `SQLite.prepare` (198); `Store.sql` (198) | OPERATOR |
| [packages/store/src/sync.ts:200](../../packages/store/src/sync.ts#L200) `ensureSyncTables` | `Store.sql` (200, 214, 224, 232) | OPERATOR |
| [packages/store/src/sync.ts:273](../../packages/store/src/sync.ts#L273) `lastPullTimestamp` | `SQLite.get` (273); `SQLite.prepare` (273); `Store.sql` (273) | OPERATOR |
| [packages/store/src/sync.ts:45](../../packages/store/src/sync.ts#L45) `openForPlanning` | `SQLite.get` (45, 46); `SQLite.prepare` (45, 46) | OPERATOR |
| [packages/store/src/sync.ts:292](../../packages/store/src/sync.ts#L292) `readLocalRecords` | `SQLite.all` (292); `SQLite.prepare` (292); `Store.sql` (292) | OPERATOR |
| [packages/store/src/sync.ts:252](../../packages/store/src/sync.ts#L252) `readSyncMap` | `SQLite.all` (252); `SQLite.prepare` (252); `Store.sql` (252) | OPERATOR |
| [packages/store/src/sync.ts:190](../../packages/store/src/sync.ts#L190) `tableExists` | `SQLite.get` (190); `SQLite.prepare` (190); `Store.sql` (190) | OPERATOR |
| [packages/store/src/text-styles.ts:22](../../packages/store/src/text-styles.ts#L22) `ensureTextStyles` | `SQLite.all` (22, 26); `SQLite.prepare` (22, 26) | CORE |
| [packages/store/src/text-styles.ts:81](../../packages/store/src/text-styles.ts#L81) `TextStyles/has` | `SQLite.all` (81) | CORE |
| [packages/store/src/text-styles.ts:94](../../packages/store/src/text-styles.ts#L94) `TextStyles/rows` | `SQLite.all` (94) | CORE |
| [packages/store/src/text-styles.ts:73](../../packages/store/src/text-styles.ts#L73) `TextStyles/st` | `SQLite.prepare` (73) | CORE |
| [packages/store/src/trace.ts:159](../../packages/store/src/trace.ts#L159) `traceDatabase/get` | `SQLite.prepare` (159) | CORE |
| [packages/store/src/words.ts:155](../../packages/store/src/words.ts#L155) `WordIndexes/dropAll` | `SQLite.all` (155); `SQLite.prepare` (155) | CORE |
| [packages/store/src/words.ts:78](../../packages/store/src/words.ts#L78) `WordIndexes/ensure` | `SQLite.prepare` (78, 82); `SQLite.get` (81); `SQLite.all` (82) | CORE |
| [packages/store/src/words.ts:85](../../packages/store/src/words.ts#L85) `WordIndexes/ensure/covers` | `SQLite.get` (85, 89); `SQLite.all` (86); `SQLite.prepare` (86, 89) | CORE |
| [packages/store/src/store.ts:1084](../../packages/store/src/store.ts#L1084) `Store/referenceSecurity` | `SQLite.get` (1084); `SQLite.prepare` (1084); `Store.sql` (1084) | Internal File Access authorization reads only its version and file-local security metadata; public management reads require Full Access. No record values are read. |
| [packages/store/src/store.ts:1103](../../packages/store/src/store.ts#L1103) `Store/writeFileAccess` | `SQLite.prepare` (1103); `Store.sql` (1103) | Writes only File Access security metadata inside securityChange; public mutations require Full Access, while hosted rename observation changes display names without granting access. |
| [packages/store/src/store.ts:1145](../../packages/store/src/store.ts#L1145) `Store/resetFileAccessId` | `SQLite.prepare` (1145, 1147); `Store.sql` (1145, 1147) | Full Access checked inside the security transaction before writing the new reference identity and retaining the stable token-scope identity; no record data is read. |
<!-- end generated read-gate inventory -->
