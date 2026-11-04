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
| [packages/cli/src/main.ts:755](../../packages/cli/src/main.ts#L755) `accountsWithPasswordOff` | `SQLite.all` (755); `SQLite.prepare` (755) | OPERATOR |
| [packages/cli/src/main.ts:788](../../packages/cli/src/main.ts#L788) `hostedRead` | `SQLite.all` (788, 791); `SQLite.prepare` (788, 791); `Store.sql` (788, 791) | OPERATOR |
| [packages/cli/src/main.ts:2526](../../packages/cli/src/main.ts#L2526) `main` | `Store.orphanContainerReport` (2526); `Store.auditLog` (3006); `SQLite.get` (3275); `SQLite.prepare` (3275) | OPERATOR |
| [packages/scripts/src/data-api-step.ts:104](../../packages/scripts/src/data-api-step.ts#L104) `respond` | `Store.get` (104, 131, 140); `Store.find` (105, 117) | SCRIPT |
| [packages/scripts/src/engine.ts:9456](../../packages/scripts/src/engine.ts#L9456) `clearRecords` | `SQLite.all` (9456); `SQLite.prepare` (9456) | SCRIPT |
| [packages/scripts/src/engine.ts:8223](../../packages/scripts/src/engine.ts#L8223) `ScriptEngine/containerFile` | `Store.get` (8223); `Store.containerId` (8224); `Store.container` (8225) | SCRIPT |
| [packages/scripts/src/engine.ts:5778](../../packages/scripts/src/engine.ts#L5778) `ScriptEngine/design` | `Store.valueListItems` (5778) | SCRIPT |
| [packages/scripts/src/engine.ts:6538](../../packages/scripts/src/engine.ts#L6538) `ScriptEngine/exportField` | `Store.get` (6538); `Store.containerId` (6539); `Store.container` (6541) | SCRIPT |
| [packages/scripts/src/engine.ts:8643](../../packages/scripts/src/engine.ts#L8643) `ScriptEngine/fileMakerRows` | `Store.findIds` (8643); `Store.get` (8648) | SCRIPT |
| [packages/scripts/src/engine.ts:3396](../../packages/scripts/src/engine.ts#L3396) `ScriptEngine/findIdsCooperative` | `Store.findIdsProgress` (3396) | SCRIPT |
| [packages/scripts/src/engine.ts:2363](../../packages/scripts/src/engine.ts#L2363) `ScriptEngine/foundSet` | `Store.findIds` (2363) | SCRIPT |
| [packages/scripts/src/engine.ts:5618](../../packages/scripts/src/engine.ts#L5618) `ScriptEngine/get` | `Store.findIds` (5618); `Store.canViewRecord` (5711); `Store.get` (5747) | SCRIPT |
| [packages/scripts/src/engine.ts:2017](../../packages/scripts/src/engine.ts#L2017) `ScriptEngine/goToLayout` | `Store.findIds` (2017) | SCRIPT |
| [packages/scripts/src/engine.ts:8414](../../packages/scripts/src/engine.ts#L8414) `ScriptEngine/importRecords` | `Store.get` (8414) | SCRIPT |
| [packages/scripts/src/engine.ts:5890](../../packages/scripts/src/engine.ts#L5890) `ScriptEngine/lookupNext` | `Store.get` (5890); `Store.row` (5891); `Calculations.context` (5893) | SCRIPT |
| [packages/scripts/src/engine.ts:5421](../../packages/scripts/src/engine.ts#L5421) `ScriptEngine/newCalcContext/executeSQL` | `Calculations.executeSQL` (5421) | SCRIPT |
| [packages/scripts/src/engine.ts:5429](../../packages/scripts/src/engine.ts#L5429) `ScriptEngine/newCalcContext/persistentData` | `Store.persistentData` (5429) | SCRIPT |
| [packages/scripts/src/engine.ts:5430](../../packages/scripts/src/engine.ts#L5430) `ScriptEngine/newCalcContext/persistentDataIds` | `Store.persistentDataIds` (5430) | SCRIPT |
| [packages/scripts/src/engine.ts:8683](../../packages/scripts/src/engine.ts#L8683) `ScriptEngine/newRecord` | `Store.findIds` (8683) | SCRIPT |
| [packages/scripts/src/engine.ts:9063](../../packages/scripts/src/engine.ts#L9063) `ScriptEngine/quickFind` | `Store.get` (9063) | SCRIPT |
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
| [packages/server/src/admin.ts:2566](../../packages/server/src/admin.ts#L2566) `Admin/audit` | `Store.auditLog` (2566) | ADMIN |
| [packages/server/src/admin.ts:1190](../../packages/server/src/admin.ts#L1190) `Admin/handle` | `Store.externalContainerReport` (1190); `Store.orphanContainerReport` (1195, 1199) | ADMIN |
| [packages/server/src/admin.ts:3006](../../packages/server/src/admin.ts#L3006) `Admin/status` | `Store.externalContainerCount` (3006) | ADMIN |
| [packages/server/src/admin.ts:2649](../../packages/server/src/admin.ts#L2649) `Admin/viewAs` | `Store.find` (2649) | ADMIN |
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
| [packages/server/src/cwp-xml.ts:541](../../packages/server/src/cwp-xml.ts#L541) `CwpXmlEndpoint/layoutDoc` | `Store.valueListItems` (541) | XML |
| [packages/server/src/cwp-xml.ts:457](../../packages/server/src/cwp-xml.ts#L457) `CwpXmlEndpoint/records` | `Store.find` (457, 459, 460, 466, 469); `Store.get` (465, 473) | XML |
| [packages/server/src/dashboards.ts:390](../../packages/server/src/dashboards.ts#L390) `Dashboards/create` | `SQLite.prepare` (390); `Store.sql` (390) | DASHBOARD |
| [packages/server/src/dashboards.ts:410](../../packages/server/src/dashboards.ts#L410) `Dashboards/delete` | `SQLite.prepare` (410); `Store.sql` (410) | DASHBOARD |
| [packages/server/src/dashboards.ts:376](../../packages/server/src/dashboards.ts#L376) `Dashboards/get` | `SQLite.get` (376); `SQLite.prepare` (376); `Store.sql` (376) | DASHBOARD |
| [packages/server/src/dashboards.ts:370](../../packages/server/src/dashboards.ts#L370) `Dashboards/list` | `SQLite.all` (370); `SQLite.prepare` (370); `Store.sql` (370) | DASHBOARD |
| [packages/server/src/dashboards.ts:360](../../packages/server/src/dashboards.ts#L360) `Dashboards/table` | `Store.sql` (360) | DASHBOARD |
| [packages/server/src/dashboards.ts:403](../../packages/server/src/dashboards.ts#L403) `Dashboards/update` | `SQLite.prepare` (403); `Store.sql` (403) | DASHBOARD |
| [packages/server/src/dataapi.ts:2099](../../packages/server/src/dataapi.ts#L2099) `DataApi/route` | `Store.get` (2099, 2320, 2321, 2344, 2352, 2399, 2423, 2443, 2480); `Store.valueListItems` (2114); `Store.find` (2275, 2323, 2514); `Store.findIds` (2279, 2519); `Store.query` (2519) | REST |
| [packages/server/src/dataapi.ts:2227](../../packages/server/src/dataapi.ts#L2227) `DataApi/route/recordOut` | `Store.portalCounts` (2227) | REST |
| [packages/server/src/dataapi.ts:2263](../../packages/server/src/dataapi.ts#L2263) `DataApi/route/shownAs` | `Store.get` (2263) | REST |
| [packages/server/src/debug.ts:346](../../packages/server/src/debug.ts#L346) `DebugApi/handle` | `Store.row` (346, 475); `Store.get` (355, 480); `Store.evaluate` (379) | DESIGN |
| [packages/server/src/debug.ts:195](../../packages/server/src/debug.ts#L195) `learnStoredCredentials` | `Calculations.globalValue` (195); `Store.sql` (201, 211, 211); `SQLite.iterate` (211, 211); `SQLite.prepare` (211, 211); `Store.iterateCommitted` (211) | DESIGN |
| [packages/server/src/design.ts:235](../../packages/server/src/design.ts#L235) `containerData` | `Store.query` (235) | DESIGN |
| [packages/server/src/design.ts:732](../../packages/server/src/design.ts#L732) `DesignApi/handle` | `Store.auditLog` (732); `Store.evaluate` (799) | DESIGN |
| [packages/server/src/design.ts:244](../../packages/server/src/design.ts#L244) `recordCount` | `Store.query` (244) | DESIGN |
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
| [packages/server/src/live.ts:282](../../packages/server/src/live.ts#L282) `Live/visibleRecord` | `Store.canViewRecord` (282) | LIVE |
| [packages/server/src/logs.ts:79](../../packages/server/src/logs.ts#L79) `LogShipper/follow` | `SQLite.get` (79); `SQLite.prepare` (79); `Store.sql` (79, 80, 81, 82) | ADMIN |
| [packages/server/src/logs.ts:91](../../packages/server/src/logs.ts#L91) `LogShipper/releaseIfIdle` | `Store.sql` (91) | ADMIN |
| [packages/server/src/mcp-design.ts:510](../../packages/server/src/mcp-design.ts#L510) `registerDesignTools/audit_log` | `Store.auditLog` (510) | DESIGN |
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
| [packages/store/src/audit-anchor.ts:71](../../packages/store/src/audit-anchor.ts#L71) `checkAnchor` | `SQLite.get` (71, 74, 78, 81); `SQLite.prepare` (71, 74, 78, 81) | CORE |
| [packages/store/src/cache-versions.ts:11](../../packages/store/src/cache-versions.ts#L11) `ensureCacheVersions` | `SQLite.get` (11); `SQLite.prepare` (11) | CORE |
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
| [packages/store/src/security-chain.ts:132](../../packages/store/src/security-chain.ts#L132) `appendSecurityEvent` | `SQLite.prepare` (132, 134, 136, 138, 142, 144); `SQLite.get` (134, 138) | CORE |
| [packages/store/src/security-chain.ts:92](../../packages/store/src/security-chain.ts#L92) `ensureSecurityChain` | `SQLite.get` (92, 102, 103, 106, 107); `SQLite.prepare` (92, 93, 102, 103, 106, 107, 111, 114, 122); `SQLite.all` (93); `SQLite.iterate` (114) | CORE |
| [packages/store/src/security-chain.ts:162](../../packages/store/src/security-chain.ts#L162) `verifySecurityAudit` | `SQLite.get` (162, 163); `SQLite.prepare` (162, 163, 167, 176); `SQLite.all` (167); `SQLite.iterate` (178) | CORE |
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
| [packages/store/src/store.ts:5361](../../packages/store/src/store.ts#L5361) `Store/accountIdentityId` | `SQLite.get` (5361, 5367); `SQLite.prepare` (5361, 5366, 5367); `Store.sql` (5361, 5366, 5367) | CORE |
| [packages/store/src/store.ts:5355](../../packages/store/src/store.ts#L5355) `Store/accountIdentityIdIfSet` | `SQLite.get` (5355); `SQLite.prepare` (5355); `Store.sql` (5355) | CORE |
| [packages/store/src/store.ts:5317](../../packages/store/src/store.ts#L5317) `Store/accountInactive` | `SQLite.get` (5317); `SQLite.prepare` (5317); `Store.sql` (5317) | CORE |
| [packages/store/src/store.ts:5514](../../packages/store/src/store.ts#L5514) `Store/accountLocalOnly` | `SQLite.get` (5514); `SQLite.prepare` (5514); `Store.sql` (5514) | CORE |
| [packages/store/src/store.ts:6383](../../packages/store/src/store.ts#L6383) `Store/accountPrivilegeSet` | `SQLite.get` (6383); `SQLite.prepare` (6383); `Store.sql` (6383) | CORE |
| [packages/store/src/store.ts:5519](../../packages/store/src/store.ts#L5519) `Store/accountRequires2fa` | `SQLite.get` (5519); `SQLite.prepare` (5519); `Store.sql` (5519) | CORE |
| [packages/store/src/store.ts:3677](../../packages/store/src/store.ts#L3677) `Store/accounts` | `SQLite.all` (3677); `SQLite.prepare` (3677); `Store.sql` (3677) | CORE |
| [packages/store/src/store.ts:3673](../../packages/store/src/store.ts#L3673) `Store/accountsSharingLockout` | `SQLite.all` (3673); `SQLite.prepare` (3673); `Store.sql` (3673) | CORE |
| [packages/store/src/store.ts:5739](../../packages/store/src/store.ts#L5739) `Store/accountUsage` | `SQLite.get` (5739); `SQLite.prepare` (5739, 5740); `Store.sql` (5739, 5740); `SQLite.all` (5740); `Store.auditLog` (5756) | CORE |
| [packages/store/src/store.ts:8580](../../packages/store/src/store.ts#L8580) `Store/addContainer` | `SQLite.all` (8580); `SQLite.prepare` (8580, 8585, 8599, 8603, 8604); `Store.sql` (8580, 8585, 8599, 8601, 8603, 8604, 8606, 8609); `SQLite.get` (8590); `Store.containerRange` (8592) | CORE |
| [packages/store/src/store.ts:8626](../../packages/store/src/store.ts#L8626) `Store/addExternalContainer` | `SQLite.prepare` (8626); `Store.sql` (8626) | CORE |
| [packages/store/src/store.ts:9103](../../packages/store/src/store.ts#L9103) `Store/addFieldIndex` | `Store.sql` (9103) | CORE |
| [packages/store/src/store.ts:7265](../../packages/store/src/store.ts#L7265) `Store/addImage` | `Store.sql` (7265, 7266); `SQLite.prepare` (7266) | CORE |
| [packages/store/src/store.ts:6433](../../packages/store/src/store.ts#L6433) `Store/addProvisionedAccount` | `SQLite.get` (6433); `SQLite.prepare` (6433, 6437); `Store.sql` (6433, 6437) | CORE |
| [packages/store/src/store.ts:7691](../../packages/store/src/store.ts#L7691) `Store/addRelated` | `relatedRows` (7691); `rowsById` (7724); `firstRelatedEach` (7747) | CORE |
| [packages/store/src/store.ts:3695](../../packages/store/src/store.ts#L3695) `Store/agentNeedsApproval` | `SQLite.get` (3695); `SQLite.prepare` (3695); `Store.sql` (3695) | CORE |
| [packages/store/src/store.ts:6660](../../packages/store/src/store.ts#L6660) `Store/allowedIds` | `SQLite.iterate` (6660); `SQLite.prepare` (6660); `Store.sql` (6660) | CORE |
| [packages/store/src/store.ts:5796](../../packages/store/src/store.ts#L5796) `Store/apiToken` | `SQLite.get` (5796); `SQLite.prepare` (5796, 5814); `Store.sql` (5796, 5814) | CORE |
| [packages/store/src/store.ts:5772](../../packages/store/src/store.ts#L5772) `Store/apiTokens` | `SQLite.all` (5772); `SQLite.prepare` (5772); `Store.sql` (5772) | CORE |
| [packages/store/src/store.ts:4095](../../packages/store/src/store.ts#L4095) `Store/appendSecurityEvent` | `Store.sql` (4095) | CORE |
| [packages/store/src/store.ts:3136](../../packages/store/src/store.ts#L3136) `Store/appendSecurityRow` | `Store.sql` (3136) | CORE |
| [packages/store/src/store.ts:5137](../../packages/store/src/store.ts#L5137) `Store/applyAccountImport` | `Store.sql` (5137, 5145, 5174); `SQLite.get` (5145); `SQLite.prepare` (5145, 5174) | CORE |
| [packages/store/src/store.ts:2437](../../packages/store/src/store.ts#L2437) `Store/applyDesign` | `Store.sql` (2437, 2438, 2458, 2461, 2466, 2482, 2485, 2485); `SQLite.prepare` (2461, 2466) | CORE |
| [packages/store/src/store.ts:3939](../../packages/store/src/store.ts#L3939) `Store/approvePending` | `SQLite.get` (3939); `SQLite.prepare` (3939, 3951); `Store.sql` (3939, 3951) | CORE |
| [packages/store/src/store.ts:2927](../../packages/store/src/store.ts#L2927) `Store/audit/write` | `Store.sql` (2927) | CORE |
| [packages/store/src/store.ts:2549](../../packages/store/src/store.ts#L2549) `Store/auditLog` | `SQLite.all` (2549); `SQLite.prepare` (2549); `Store.sql` (2549) | CORE |
| [packages/store/src/store.ts:1972](../../packages/store/src/store.ts#L1972) `Store/backup` | `Store.sql` (1972) | CORE |
| [packages/store/src/store.ts:3701](../../packages/store/src/store.ts#L3701) `Store/blankPasswordAccounts` | `SQLite.all` (3701); `SQLite.prepare` (3701); `Store.sql` (3701) | CORE |
| [packages/store/src/store.ts:5066](../../packages/store/src/store.ts#L5066) `Store/canonicalAccount` | `SQLite.all` (5066); `SQLite.prepare` (5066); `Store.sql` (5066) | CORE |
| [packages/store/src/store.ts:9689](../../packages/store/src/store.ts#L9689) `Store/canView` | `Store.canView` (9689); `Store.row` (9690) | GATED-STORE |
| [packages/store/src/store.ts:9671](../../packages/store/src/store.ts#L9671) `Store/canViewRecord` | `SQLite.get` (9671); `SQLite.prepare` (9671); `Store.sql` (9671) | GATED-STORE |
| [packages/store/src/store.ts:10769](../../packages/store/src/store.ts#L10769) `Store/cascadeDelete` | `relatedRows` (10769) | CORE |
| [packages/store/src/store.ts:2272](../../packages/store/src/store.ts#L2272) `Store/changeOne` | `Store.sql` (2272, 2274) | CORE |
| [packages/store/src/store.ts:2275](../../packages/store/src/store.ts#L2275) `Store/changeOne/read` | `SQLite.get` (2275); `SQLite.prepare` (2275); `Store.sql` (2275) | CORE |
| [packages/store/src/store.ts:8961](../../packages/store/src/store.ts#L8961) `Store/checkContainerWrite` | `Store.row` (8961) | CORE |
| [packages/store/src/store.ts:10392](../../packages/store/src/store.ts#L10392) `Store/checkEditable` | `Store.row` (10392) | CORE |
| [packages/store/src/store.ts:1518](../../packages/store/src/store.ts#L1518) `Store/checkpoint` | `SQLite.get` (1518); `SQLite.prepare` (1518); `Store.sql` (1518) | CORE |
| [packages/store/src/store.ts:3838](../../packages/store/src/store.ts#L3838) `Store/checkProposedWrite` | `Store.row` (3838); `relatedRows` (3852) | CORE |
| [packages/store/src/store.ts:6419](../../packages/store/src/store.ts#L6419) `Store/clearAccountPrivilegeSet` | `SQLite.prepare` (6419); `Store.sql` (6419) | CORE |
| [packages/store/src/store.ts:1540](../../packages/store/src/store.ts#L1540) `Store/close` | `Store.sql` (1540) | CORE |
| [packages/store/src/store.ts:8929](../../packages/store/src/store.ts#L8929) `Store/compactFile` | `Store.sql` (8929, 8930, 8932) | CORE |
| [packages/store/src/store.ts:9340](../../packages/store/src/store.ts#L9340) `Store/computedRows` | `Store.sql` (9340, 9343, 9344, 9345, 9347, 9357, 9358, 9359, 9362); `SQLite.prepare` (9343, 9345, 9347, 9357); `SQLite.iterate` (9347); `Calculations.globalValue` (9350); `Calculations.unstoredValue` (9351); `Calculations.related` (9354); `SQLite.all` (9357) | CORE |
| [packages/store/src/store.ts:10893](../../packages/store/src/store.ts#L10893) `Store/computeValuesCurrent` | `Store.computeValues` (10893); `Store.sql` (10899, 10903); `SQLite.all` (10903); `SQLite.prepare` (10903) | GATED-STORE |
| [packages/store/src/store.ts:5841](../../packages/store/src/store.ts#L5841) `Store/confirmTotp` | `SQLite.get` (5841); `SQLite.prepare` (5841, 5843); `Store.sql` (5841, 5843) | CORE |
| [packages/store/src/store.ts:1156](../../packages/store/src/store.ts#L1156) `Store/constructor` | `Store.sql` (1156, 1158, 1160, 1161, 1165, 1169, 1170, 1179, 1187, 1202, 1207, 1212, 1213, 1217, 1218, 1219, 1226, 1230, 1234, 1235, 1236, 1241, 1242, 1246, 1249, 1250, 1252, 1253, 1256, 1257, 1261, 1262, 1266, 1267, 1270, 1273, 1274, 1276, 1279, 1280, 1284, 1285, 1289, 1290, 1294, 1295, 1296, 1299, 1300, 1303, 1304, 1306, 1306, 1307, 1307, 1308, 1312, 1314, 1318, 1320, 1323, 1324, 1325, 1328, 1329, 1331, 1333, 1334, 1338, 1339, 1341, 1353, 1355, 1356, 1357, 1357, 1361, 1362); `SQLite.get` (1160, 1179); `SQLite.prepare` (1160, 1179, 1187, 1249, 1250, 1253, 1256, 1261, 1266, 1273, 1279, 1284, 1289, 1299, 1303, 1306, 1307, 1328, 1333, 1338); `SQLite.all` (1249, 1256, 1261, 1266, 1273, 1279, 1284, 1289, 1299, 1303, 1306, 1307, 1328, 1333, 1338) | CORE |
| [packages/store/src/store.ts:6199](../../packages/store/src/store.ts#L6199) `Store/consumeRecoveryCode` | `SQLite.prepare` (6199); `Store.sql` (6199) | CORE |
| [packages/store/src/store.ts:8504](../../packages/store/src/store.ts#L8504) `Store/container` | `SQLite.get` (8504); `SQLite.prepare` (8504, 8513); `Store.sql` (8504, 8513); `SQLite.all` (8513) | CORE |
| [packages/store/src/store.ts:8938](../../packages/store/src/store.ts#L8938) `Store/containerId` | `Store.containerId` (8938); `Store.row` (8939) | CORE |
| [packages/store/src/store.ts:8521](../../packages/store/src/store.ts#L8521) `Store/containerInfo` | `SQLite.get` (8521); `SQLite.prepare` (8521); `Store.sql` (8521) | CORE |
| [packages/store/src/store.ts:8485](../../packages/store/src/store.ts#L8485) `Store/containerIntact` | `SQLite.get` (8485); `SQLite.prepare` (8485); `Store.sql` (8485) | CORE |
| [packages/store/src/store.ts:8424](../../packages/store/src/store.ts#L8424) `Store/containerIntegrityReport` | `SQLite.all` (8424); `SQLite.prepare` (8424, 8435); `Store.sql` (8424, 8435); `SQLite.get` (8435) | CORE |
| [packages/store/src/store.ts:8499](../../packages/store/src/store.ts#L8499) `Store/containerMeta` | `SQLite.get` (8499); `SQLite.prepare` (8499); `Store.sql` (8499) | CORE |
| [packages/store/src/store.ts:8555](../../packages/store/src/store.ts#L8555) `Store/containerRange` | `SQLite.all` (8555); `SQLite.prepare` (8555, 8562); `Store.sql` (8555, 8562); `SQLite.get` (8562) | CORE |
| [packages/store/src/store.ts:8326](../../packages/store/src/store.ts#L8326) `Store/containerReferences` | `SQLite.all` (8326, 8345, 8347, 8353, 8366, 8377, 8391); `SQLite.prepare` (8326, 8345, 8347, 8353, 8366, 8377, 8389, 8391); `Store.sql` (8326, 8345, 8347, 8353, 8366, 8377, 8389, 8391); `SQLite.get` (8389); `Store.row` (8400) | CORE |
| [packages/store/src/store.ts:10873](../../packages/store/src/store.ts#L10873) `Store/countIds` | `Store.countIds` (10873); `SQLite.get` (10877); `SQLite.prepare` (10877); `Store.sql` (10877) | GATED-STORE |
| [packages/store/src/store.ts:9720](../../packages/store/src/store.ts#L9720) `Store/create` | `SQLite.get` (9720); `SQLite.prepare` (9720, 9733); `Store.sql` (9720, 9733) | CORE |
| [packages/store/src/store.ts:4067](../../packages/store/src/store.ts#L4067) `Store/createAccountOnly` | `SQLite.get` (4067); `SQLite.prepare` (4067, 4071, 4077, 4082, 4087); `Store.sql` (4067, 4071, 4077, 4082, 4087) | CORE |
| [packages/store/src/store.ts:5572](../../packages/store/src/store.ts#L5572) `Store/createApiToken` | `SQLite.get` (5572, 5600); `SQLite.prepare` (5572, 5599, 5600, 5610); `Store.sql` (5572, 5599, 5600, 5610) | CORE |
| [packages/store/src/store.ts:5078](../../packages/store/src/store.ts#L5078) `Store/createLocalAccount` | `SQLite.prepare` (5078); `Store.sql` (5078) | CORE |
| [packages/store/src/store.ts:3667](../../packages/store/src/store.ts#L3667) `Store/credentialIdentity` | `SQLite.get` (3667); `SQLite.prepare` (3667); `Store.sql` (3667) | CORE |
| [packages/store/src/store.ts:5493](../../packages/store/src/store.ts#L5493) `Store/credentialStamp` | `SQLite.get` (5493); `SQLite.prepare` (5493); `Store.sql` (5493) | CORE |
| [packages/store/src/store.ts:7098](../../packages/store/src/store.ts#L7098) `Store/crossFileBusy` | `Store.sql` (7098) | AUTH |
| [packages/store/src/store.ts:7070](../../packages/store/src/store.ts#L7070) `Store/crossFileHash` | `SQLite.get` (7070); `SQLite.prepare` (7070); `Store.sql` (7070) | AUTH |
| [packages/store/src/store.ts:2062](../../packages/store/src/store.ts#L2062) `Store/dataVersion` | `SQLite.get` (2062); `SQLite.prepare` (2062); `Store.sql` (2062) | CORE |
| [packages/store/src/store.ts:11436](../../packages/store/src/store.ts#L11436) `Store/decimalViewSql` | `SQLite.all` (11436); `SQLite.prepare` (11436) | CORE |
| [packages/store/src/store.ts:10435](../../packages/store/src/store.ts#L10435) `Store/delete` | `Store.row` (10435) | CORE |
| [packages/store/src/store.ts:10443](../../packages/store/src/store.ts#L10443) `Store/delete/run` | `SQLite.get` (10443); `SQLite.prepare` (10443, 10448); `Store.sql` (10443, 10448) | CORE |
| [packages/store/src/store.ts:5232](../../packages/store/src/store.ts#L5232) `Store/deleteAccount` | `SQLite.prepare` (5232, 5236, 5237, 5238, 5239, 5240, 5241, 5242, 5243, 5250, 5252, 5254, 5256, 5260); `Store.sql` (5232, 5236, 5237, 5238, 5239, 5240, 5241, 5242, 5243, 5250, 5252, 5254, 5256, 5260) | CORE |
| [packages/store/src/store.ts:10516](../../packages/store/src/store.ts#L10516) `Store/deleteBeingUndone` | `SQLite.all` (10516); `SQLite.prepare` (10516); `Store.sql` (10516) | CORE |
| [packages/store/src/store.ts:3304](../../packages/store/src/store.ts#L3304) `Store/deletedRows` | `SQLite.get` (3304); `SQLite.prepare` (3304, 3306, 3306); `Store.sql` (3304, 3306, 3306); `SQLite.all` (3306, 3306) | CORE |
| [packages/store/src/store.ts:10528](../../packages/store/src/store.ts#L10528) `Store/deleteEndingTheLifeAt` | `SQLite.get` (10528); `SQLite.prepare` (10528); `Store.sql` (10528) | CORE |
| [packages/store/src/store.ts:6284](../../packages/store/src/store.ts#L6284) `Store/deletePrivilegeSet` | `SQLite.prepare` (6284); `Store.sql` (6284) | CORE |
| [packages/store/src/store.ts:4205](../../packages/store/src/store.ts#L4205) `Store/deleteScriptTest` | `SQLite.prepare` (4205); `Store.sql` (4205) | CORE |
| [packages/store/src/store.ts:10420](../../packages/store/src/store.ts#L10420) `Store/deleteVisibility` | `Store.canViewRecord` (10420) | CORE |
| [packages/store/src/store.ts:7207](../../packages/store/src/store.ts#L7207) `Store/design` | `SQLite.get` (7207) | CORE |
| [packages/store/src/store.ts:3414](../../packages/store/src/store.ts#L3414) `Store/designEffect` | `Store.sql` (3414, 3420, 3421, 3424, 3430, 3435, 3438, 3444, 3455, 3456, 3458, 3459, 3472, 3473, 3476, 3478, 3484, 3485, 3486, 3492, 3494, 3498, 3501, 3502, 3504, 3507, 3513, 3515, 3522, 3523, 3525, 3526, 3527, 3528, 3535, 3536, 3538, 3538, 3540, 3541, 3542, 3546, 3550, 3552, 3590, 3592, 3594); `SQLite.prepare` (3424, 3455, 3456, 3472, 3473, 3484, 3485, 3492, 3494, 3498, 3502, 3513, 3515, 3528, 3535, 3536, 3538, 3540, 3542, 3546, 3550); `SQLite.get` (3455, 3472, 3484, 3485, 3498, 3502, 3538, 3546); `SQLite.all` (3535, 3536); `SQLite.iterate` (3540) | CORE |
| [packages/store/src/store.ts:3407](../../packages/store/src/store.ts#L3407) `Store/designEffect/renameExcluded` | `SQLite.prepare` (3407); `Store.sql` (3407) | CORE |
| [packages/store/src/store.ts:3391](../../packages/store/src/store.ts#L3391) `Store/designEffect/renameKey` | `SQLite.prepare` (3391); `Store.sql` (3391) | CORE |
| [packages/store/src/store.ts:3345](../../packages/store/src/store.ts#L3345) `Store/designHistory` | `SQLite.all` (3345); `SQLite.prepare` (3345); `Store.sql` (3345) | CORE |
| [packages/store/src/store.ts:5862](../../packages/store/src/store.ts#L5862) `Store/disableTotp` | `SQLite.prepare` (5862); `Store.sql` (5862) | CORE |
| [packages/store/src/store.ts:3602](../../packages/store/src/store.ts#L3602) `Store/dropColumnIndexes` | `SQLite.all` (3602, 3604); `SQLite.prepare` (3602, 3604); `Store.sql` (3602, 3604, 3605) | CORE |
| [packages/store/src/store.ts:9115](../../packages/store/src/store.ts#L9115) `Store/dropFieldIndex` | `SQLite.get` (9115); `SQLite.prepare` (9115); `Store.sql` (9115, 9116) | CORE |
| [packages/store/src/store.ts:9757](../../packages/store/src/store.ts#L9757) `Store/duplicate` | `Store.row` (9757); `SQLite.prepare` (9775); `Store.sql` (9775) | CORE |
| [packages/store/src/store.ts:8742](../../packages/store/src/store.ts#L8742) `Store/embeddedContainerCount` | `SQLite.prepare` (8742); `Store.sql` (8742); `SQLite.get` (8743) | CORE |
| [packages/store/src/store.ts:8728](../../packages/store/src/store.ts#L8728) `Store/embeddedContainers` | `SQLite.prepare` (8728, 8729); `Store.sql` (8728, 8729); `SQLite.all` (8729); `SQLite.get` (8733) | CORE |
| [packages/store/src/store.ts:3330](../../packages/store/src/store.ts#L3330) `Store/emptyDeleted` | `Store.sql` (3330, 3333, 3334, 3336, 3338); `SQLite.prepare` (3334) | CORE |
| [packages/store/src/store.ts:1938](../../packages/store/src/store.ts#L1938) `Store/endTransaction` | `Store.sql` (1938, 1941, 1941) | CORE |
| [packages/store/src/store.ts:5830](../../packages/store/src/store.ts#L5830) `Store/enrollTotp` | `SQLite.prepare` (5830); `Store.sql` (5830) | CORE |
| [packages/store/src/store.ts:3299](../../packages/store/src/store.ts#L3299) `Store/ensureDeleted` | `Store.sql` (3299) | CORE |
| [packages/store/src/store.ts:1372](../../packages/store/src/store.ts#L1372) `Store/ensureNativeIds` | `SQLite.all` (1372, 1384); `SQLite.prepare` (1372, 1375, 1383, 1384); `Store.sql` (1372, 1375, 1378, 1382, 1383, 1384, 1387, 1389) | CORE |
| [packages/store/src/store.ts:2184](../../packages/store/src/store.ts#L2184) `Store/ensureRecordIdHighWater` | `Store.sql` (2184, 2185, 2187, 2189, 2191) | CORE |
| [packages/store/src/store.ts:2203](../../packages/store/src/store.ts#L2203) `Store/ensureRecordIdMarks` | `SQLite.all` (2203, 2206, 2209, 2218); `SQLite.prepare` (2203, 2206, 2209, 2212, 2218, 2221); `Store.sql` (2203, 2206, 2209, 2212, 2218, 2221, 2225, 2226) | CORE |
| [packages/store/src/store.ts:10089](../../packages/store/src/store.ts#L10089) `Store/evaluateCurrent` | `Store.row` (10089, 10089, 10090, 10090); `Calculations.context` (10095); `Store.get` (10096, 10098) | GATED-STORE |
| [packages/store/src/store.ts:10130](../../packages/store/src/store.ts#L10130) `Store/evaluateEachCurrent` | `Store.row` (10130, 10130, 10135); `Calculations.context` (10136); `Store.get` (10138) | GATED-STORE |
| [packages/store/src/store.ts:10192](../../packages/store/src/store.ts#L10192) `Store/evaluateRowsCurrent` | `Store.row` (10192, 10192, 10193, 10193) | GATED-STORE |
| [packages/store/src/store.ts:10171](../../packages/store/src/store.ts#L10171) `Store/evaluateRowsCurrent/each` | `Calculations.context` (10171); `Store.get` (10173) | GATED-STORE |
| [packages/store/src/store.ts:10207](../../packages/store/src/store.ts#L10207) `Store/evaluateRowsCurrent/found/[Symbol.iterator]` | `rowsById` (10207) | GATED-STORE |
| [packages/store/src/store.ts:10229](../../packages/store/src/store.ts#L10229) `Store/evaluateRowsCurrent/key` | `Calculations.context` (10229) | GATED-STORE |
| [packages/store/src/store.ts:3983](../../packages/store/src/store.ts#L3983) `Store/externalAccount` | `SQLite.all` (3983); `SQLite.prepare` (3983); `Store.sql` (3983) | CORE |
| [packages/store/src/store.ts:8247](../../packages/store/src/store.ts#L8247) `Store/externalContainerCheck` | `SQLite.all` (8247); `SQLite.prepare` (8247); `Store.sql` (8247) | CORE |
| [packages/store/src/store.ts:8254](../../packages/store/src/store.ts#L8254) `Store/externalContainerCount` | `SQLite.get` (8254); `SQLite.prepare` (8254); `Store.sql` (8254) | CORE |
| [packages/store/src/store.ts:8263](../../packages/store/src/store.ts#L8263) `Store/externalContainerReport` | `SQLite.all` (8263, 8276); `SQLite.prepare` (8263, 8276); `Store.sql` (8263, 8276) | CORE |
| [packages/store/src/store.ts:5343](../../packages/store/src/store.ts#L5343) `Store/externalIdentityId` | `SQLite.get` (5343, 5350); `SQLite.prepare` (5343, 5349, 5350); `Store.sql` (5343, 5349, 5350) | CORE |
| [packages/store/src/store.ts:8495](../../packages/store/src/store.ts#L8495) `Store/externalOf` | `SQLite.get` (8495); `SQLite.prepare` (8495); `Store.sql` (8495) | CORE |
| [packages/store/src/store.ts:3080](../../packages/store/src/store.ts#L3080) `Store/failureAuditRoom` | `SQLite.get` (3080); `SQLite.prepare` (3080); `Store.sql` (3080) | CORE |
| [packages/store/src/store.ts:7894](../../packages/store/src/store.ts#L7894) `Store/fieldIndexCurrent` | `SQLite.iterate` (7894); `SQLite.prepare` (7894, 7899); `Store.sql` (7894, 7899); `SQLite.all` (7899) | GATED-STORE |
| [packages/store/src/store.ts:9155](../../packages/store/src/store.ts#L9155) `Store/find` | `Store.find` (9155) | GATED-STORE |
| [packages/store/src/store.ts:9527](../../packages/store/src/store.ts#L9527) `Store/findCandidates` | `Store.query` (9527) | CORE |
| [packages/store/src/store.ts:9166](../../packages/store/src/store.ts#L9166) `Store/findHere` | `Store.query` (9166, 9171, 9173, 9187, 9189, 9200); `Store.recordCount` (9184); `SQLite.get` (9185, 9189); `SQLite.prepare` (9185, 9189, 9195, 9202, 9211); `Store.sql` (9185, 9189, 9195, 9202, 9211); `SQLite.all` (9195, 9202, 9211) | GATED-STORE |
| [packages/store/src/store.ts:9206](../../packages/store/src/store.ts#L9206) `Store/findHere/[Symbol.iterator]` | `SQLite.iterate` (9206); `SQLite.prepare` (9206); `Store.sql` (9206) | GATED-STORE |
| [packages/store/src/store.ts:11004](../../packages/store/src/store.ts#L11004) `Store/findIdsCurrent` | `Store.findIds` (11004) | GATED-STORE |
| [packages/store/src/store.ts:10940](../../packages/store/src/store.ts#L10940) `Store/findIdsCurrentProgress` | `Store.findIdsProgress` (10940); `Store.query` (10942, 10943, 10956, 10958); `Store.recordCount` (10948, 10976); `SQLite.iterate` (10973); `SQLite.prepare` (10973, 10981, 10982); `Store.sql` (10973, 10981, 10982); `SQLite.get` (10985); `SQLite.all` (10991) | GATED-STORE |
| [packages/store/src/store.ts:11010](../../packages/store/src/store.ts#L11010) `Store/findIdsHere` | `Store.query` (11010, 11015, 11017); `SQLite.iterate` (11028); `SQLite.prepare` (11028); `Store.sql` (11028) | GATED-STORE |
| [packages/store/src/store.ts:9471](../../packages/store/src/store.ts#L9471) `Store/findSource` | `Store.query` (9471); `SQLite.all` (9480, 9497); `SQLite.prepare` (9480, 9488, 9496); `Store.sql` (9480, 9485, 9488, 9493, 9496, 9510, 9512); `Calculations.globalValue` (9502); `Calculations.unstoredValue` (9503); `Calculations.related` (9507) | CORE |
| [packages/store/src/store.ts:3192](../../packages/store/src/store.ts#L3192) `Store/flushDeferredSecurity` | `Store.sql` (3192) | CORE |
| [packages/store/src/store.ts:5199](../../packages/store/src/store.ts#L5199) `Store/forgetStandIns` | `SQLite.prepare` (5199); `Store.sql` (5199) | CORE |
| [packages/store/src/store.ts:10483](../../packages/store/src/store.ts#L10483) `Store/forgetStandInValues` | `Store.sql` (10483, 10504); `SQLite.prepare` (10504) | CORE |
| [packages/store/src/store.ts:7775](../../packages/store/src/store.ts#L7775) `Store/foundSetPage` | `rowsById` (7775) | CORE |
| [packages/store/src/store.ts:7791](../../packages/store/src/store.ts#L7791) `Store/foundSetRowsCurrent` | `Store.viewableIds` (7791); `Store.row` (7807) | GATED-STORE |
| [packages/store/src/store.ts:3901](../../packages/store/src/store.ts#L3901) `Store/gateAgentWrite` | `SQLite.get` (3901); `SQLite.prepare` (3901, 3903); `Store.sql` (3901, 3903) | CORE |
| [packages/store/src/store.ts:6137](../../packages/store/src/store.ts#L6137) `Store/generateRecoveryCodes` | `SQLite.prepare` (6137, 6140); `Store.sql` (6137, 6140) | CORE |
| [packages/store/src/store.ts:9599](../../packages/store/src/store.ts#L9599) `Store/getCurrent` | `Store.get` (9599); `Store.row` (9600, 9600, 9614); `SQLite.all` (9617); `SQLite.prepare` (9617); `Store.sql` (9617) | GATED-STORE |
| [packages/store/src/store.ts:9637](../../packages/store/src/store.ts#L9637) `Store/getManyCurrent` | `Store.getMany` (9637); `SQLite.get` (9655); `SQLite.prepare` (9655); `Store.sql` (9655) | GATED-STORE |
| [packages/store/src/store.ts:9648](../../packages/store/src/store.ts#L9648) `Store/getManyCurrent/[Symbol.iterator]` | `rowsById` (9648) | GATED-STORE |
| [packages/store/src/store.ts:1419](../../packages/store/src/store.ts#L1419) `Store/grantFullAccessClients` | `SQLite.prepare` (1419); `Store.sql` (1419) | CORE |
| [packages/store/src/store.ts:11045](../../packages/store/src/store.ts#L11045) `Store/groupSummariesCurrent` | `Store.groupSummaries` (11045); `Store.viewableIds` (11050); `Calculations.collect` (11066); `rowsById` (11066, 11116); `Calculations.collector` (11088) | GATED-STORE |
| [packages/store/src/store.ts:11114](../../packages/store/src/store.ts#L11114) `Store/groupSummariesCurrent/flush` | `Calculations.collector` (11114) | GATED-STORE |
| [packages/store/src/store.ts:11078](../../packages/store/src/store.ts#L11078) `Store/groupSummariesCurrent/key` | `Calculations.value` (11078); `Calculations.related` (11080) | GATED-STORE |
| [packages/store/src/store.ts:1446](../../packages/store/src/store.ts#L1446) `Store/hasOwnPassword` | `SQLite.get` (1446); `SQLite.prepare` (1446); `Store.sql` (1446) | CORE |
| [packages/store/src/store.ts:5992](../../packages/store/src/store.ts#L5992) `Store/hasPasskey` | `SQLite.get` (5992); `SQLite.prepare` (5992); `Store.sql` (5992) | CORE |
| [packages/store/src/store.ts:1427](../../packages/store/src/store.ts#L1427) `Store/hasProvingPassword` | `SQLite.get` (1427); `SQLite.prepare` (1427); `Store.sql` (1427) | CORE |
| [packages/store/src/store.ts:9069](../../packages/store/src/store.ts#L9069) `Store/hasTable` | `SQLite.get` (9069); `SQLite.prepare` (9069); `Store.sql` (9069) | CORE |
| [packages/store/src/store.ts:5851](../../packages/store/src/store.ts#L5851) `Store/hasTotp` | `SQLite.get` (5851); `SQLite.prepare` (5851); `Store.sql` (5851) | CORE |
| [packages/store/src/store.ts:5322](../../packages/store/src/store.ts#L5322) `Store/identityAllowed` | `SQLite.get` (5322, 5328, 5334); `SQLite.prepare` (5322, 5328, 5334); `Store.sql` (5322, 5328, 5334) | CORE |
| [packages/store/src/store.ts:7242](../../packages/store/src/store.ts#L7242) `Store/image` | `SQLite.get` (7242); `SQLite.prepare` (7242); `Store.sql` (7242) | CORE |
| [packages/store/src/store.ts:7252](../../packages/store/src/store.ts#L7252) `Store/images` | `SQLite.all` (7252); `SQLite.prepare` (7252); `Store.sql` (7252) | CORE |
| [packages/store/src/store.ts:5043](../../packages/store/src/store.ts#L5043) `Store/importAccounts` | `SQLite.all` (5043); `SQLite.prepare` (5043); `Store.sql` (5043) | CORE |
| [packages/store/src/store.ts:1760](../../packages/store/src/store.ts#L1760) `Store/independentWindowWrite` | `SQLite.get` (1760); `SQLite.prepare` (1760, 1768, 1828); `Store.sql` (1760, 1768, 1778, 1806, 1823, 1828, 1831); `SQLite.all` (1768); `Store.row` (1826) | CORE |
| [packages/store/src/store.ts:9081](../../packages/store/src/store.ts#L9081) `Store/indexedFields` | `SQLite.all` (9081, 9082); `SQLite.prepare` (9081, 9082); `Store.sql` (9081, 9082) | CORE |
| [packages/store/src/store.ts:11469](../../packages/store/src/store.ts#L11469) `Store/internalRoots` | `SQLite.get` (11469); `SQLite.prepare` (11469, 11471); `SQLite.all` (11471) | CORE |
| [packages/store/src/store.ts:3689](../../packages/store/src/store.ts#L3689) `Store/isAgent` | `SQLite.get` (3689); `SQLite.prepare` (3689); `Store.sql` (3689) | CORE |
| [packages/store/src/store.ts:3792](../../packages/store/src/store.ts#L3792) `Store/isExternal` | `SQLite.get` (3792); `SQLite.prepare` (3792); `Store.sql` (3792) | CORE |
| [packages/store/src/store.ts:5906](../../packages/store/src/store.ts#L5906) `Store/issueWebauthnChallenge` | `SQLite.prepare` (5906, 5908, 5909, 5911); `Store.sql` (5906, 5908, 5909, 5911); `SQLite.get` (5908) | CORE |
| [packages/store/src/store.ts:11330](../../packages/store/src/store.ts#L11330) `Store/iterateCommitted` | `SQLite.iterate` (11330) | CORE |
| [packages/store/src/store.ts:1700](../../packages/store/src/store.ts#L1700) `Store/joinTransaction` | `Store.sql` (1700, 1701, 1703, 1705, 1711, 1714) | CORE |
| [packages/store/src/store.ts:10716](../../packages/store/src/store.ts#L10716) `Store/keyStepWork` | `Store.sql` (10716, 10722, 10726, 10728) | CORE |
| [packages/store/src/store.ts:7058](../../packages/store/src/store.ts#L7058) `Store/knownSharedAccount` | `SQLite.get` (7058); `SQLite.prepare` (7058); `Store.sql` (7058) | CORE |
| [packages/store/src/store.ts:4516](../../packages/store/src/store.ts#L4516) `Store/lastSignIns` | `Store.auditLog` (4516) | CORE |
| [packages/store/src/store.ts:10534](../../packages/store/src/store.ts#L10534) `Store/latestDeleteSeq` | `SQLite.get` (10534); `SQLite.prepare` (10534); `Store.sql` (10534) | CORE |
| [packages/store/src/store.ts:7282](../../packages/store/src/store.ts#L7282) `Store/layout` | `SQLite.get` (7282); `SQLite.prepare` (7282); `Store.sql` (7282) | CORE |
| [packages/store/src/store.ts:3362](../../packages/store/src/store.ts#L3362) `Store/layoutHistory` | `SQLite.all` (3362); `SQLite.prepare` (3362); `Store.sql` (3362) | CORE |
| [packages/store/src/store.ts:7172](../../packages/store/src/store.ts#L7172) `Store/layouts` | `SQLite.all` (7172); `SQLite.prepare` (7172); `Store.sql` (7172) | CORE |
| [packages/store/src/store.ts:4816](../../packages/store/src/store.ts#L4816) `Store/leastPrivilege` | `SQLite.all` (4816); `SQLite.prepare` (4816); `Store.sql` (4816) | CORE |
| [packages/store/src/store.ts:5420](../../packages/store/src/store.ts#L5420) `Store/ledgerRow` | `SQLite.get` (5420, 5421); `SQLite.prepare` (5420, 5421); `Store.sql` (5420, 5421) | AUTH |
| [packages/store/src/store.ts:5432](../../packages/store/src/store.ts#L5432) `Store/ledgerWrite` | `Store.sql` (5432, 5433, 5435, 5437, 5440, 5440) | AUTH |
| [packages/store/src/store.ts:5126](../../packages/store/src/store.ts#L5126) `Store/limitAccountImport` | `SQLite.prepare` (5126, 5127, 5130); `Store.sql` (5126, 5127, 5130); `SQLite.get` (5127) | CORE |
| [packages/store/src/store.ts:3642](../../packages/store/src/store.ts#L3642) `Store/linkIdentity` | `SQLite.get` (3642); `SQLite.prepare` (3642); `Store.sql` (3642) | CORE |
| [packages/store/src/store.ts:3634](../../packages/store/src/store.ts#L3634) `Store/linkPrincipal` | `SQLite.get` (3634); `SQLite.prepare` (3634); `Store.sql` (3634) | CORE |
| [packages/store/src/store.ts:4402](../../packages/store/src/store.ts#L4402) `Store/markPiiField` | `SQLite.prepare` (4402); `Store.sql` (4402) | CORE |
| [packages/store/src/store.ts:8220](../../packages/store/src/store.ts#L8220) `Store/markRepeating` | `SQLite.prepare` (8220); `Store.sql` (8220) | CORE |
| [packages/store/src/store.ts:11263](../../packages/store/src/store.ts#L11263) `Store/matchIds` | `Store.matchIds` (11263); `SQLite.all` (11269); `SQLite.prepare` (11269); `Store.sql` (11269) | CORE |
| [packages/store/src/store.ts:1461](../../packages/store/src/store.ts#L1461) `Store/meta` | `SQLite.get` (1461); `SQLite.prepare` (1461); `Store.sql` (1461) | CORE |
| [packages/store/src/store.ts:1009](../../packages/store/src/store.ts#L1009) `Store/metadataVersions` | `SQLite.get` (1009); `SQLite.prepare` (1009); `Store.sql` (1009) | CORE |
| [packages/store/src/store.ts:8857](../../packages/store/src/store.ts#L8857) `Store/moveContainersIn` | `Store.sql` (8857, 8863, 8865, 8866, 8867, 8868, 8888, 8893, 8893, 8904, 8907, 8910, 8917); `SQLite.prepare` (8865, 8866, 8867, 8868, 8904, 8910); `SQLite.get` (8870, 8904, 8910) | CORE |
| [packages/store/src/store.ts:8779](../../packages/store/src/store.ts#L8779) `Store/moveContainersOut` | `Store.sql` (8779, 8787, 8789, 8791, 8796, 8797, 8817, 8823, 8825, 8827, 8827, 8833, 8833, 8838, 8840, 8842, 8842, 8848); `SQLite.get` (8787); `SQLite.prepare` (8787, 8796, 8797); `Store.container` (8799) | CORE |
| [packages/store/src/store.ts:4997](../../packages/store/src/store.ts#L4997) `Store/mustChangePassword` | `SQLite.get` (4997); `SQLite.prepare` (4997); `Store.sql` (4997) | CORE |
| [packages/store/src/store.ts:1397](../../packages/store/src/store.ts#L1397) `Store/nativeIdGuards` | `Store.sql` (1397, 1398, 1400) | CORE |
| [packages/store/src/store.ts:2239](../../packages/store/src/store.ts#L2239) `Store/nextRecordId` | `SQLite.get` (2239); `SQLite.prepare` (2239); `Store.sql` (2239) | CORE |
| [packages/store/src/store.ts:5726](../../packages/store/src/store.ts#L5726) `Store/objectUseSince` | `SQLite.get` (5726); `SQLite.prepare` (5726); `Store.sql` (5726) | CORE |
| [packages/store/src/store.ts:9041](../../packages/store/src/store.ts#L9041) `Store/orderBy` | `Store.valueListItems` (9041) | CORE |
| [packages/store/src/store.ts:8412](../../packages/store/src/store.ts#L8412) `Store/orphanContainerReport` | `SQLite.all` (8412); `SQLite.prepare` (8412); `Store.sql` (8412) | CORE |
| [packages/store/src/store.ts:5958](../../packages/store/src/store.ts#L5958) `Store/passkeyAllowList` | `SQLite.all` (5958); `SQLite.prepare` (5958); `Store.sql` (5958) | CORE |
| [packages/store/src/store.ts:5997](../../packages/store/src/store.ts#L5997) `Store/passkeyIds` | `SQLite.all` (5997); `SQLite.prepare` (5997); `Store.sql` (5997) | CORE |
| [packages/store/src/store.ts:5985](../../packages/store/src/store.ts#L5985) `Store/passkeys` | `SQLite.all` (5985); `SQLite.prepare` (5985); `Store.sql` (5985) | CORE |
| [packages/store/src/store.ts:5036](../../packages/store/src/store.ts#L5036) `Store/passwordDaysRemaining` | `SQLite.get` (5036); `SQLite.prepare` (5036); `Store.sql` (5036) | CORE |
| [packages/store/src/store.ts:7016](../../packages/store/src/store.ts#L7016) `Store/passwordState` | `SQLite.get` (7016); `SQLite.prepare` (7016); `Store.sql` (7016) | CORE |
| [packages/store/src/store.ts:3925](../../packages/store/src/store.ts#L3925) `Store/pendingChanges` | `SQLite.all` (3925); `SQLite.prepare` (3925); `Store.sql` (3925) | CORE |
| [packages/store/src/store.ts:1479](../../packages/store/src/store.ts#L1479) `Store/persistentData` | `SQLite.get` (1479) | CORE |
| [packages/store/src/store.ts:1488](../../packages/store/src/store.ts#L1488) `Store/persistentDataIds` | `SQLite.all` (1488) | CORE |
| [packages/store/src/store.ts:1469](../../packages/store/src/store.ts#L1469) `Store/persistentTable` | `Store.sql` (1469) | CORE |
| [packages/store/src/store.ts:10377](../../packages/store/src/store.ts#L10377) `Store/portalContainerTarget` | `Store.row` (10377); `relatedIdList` (10379) | CORE |
| [packages/store/src/store.ts:7830](../../packages/store/src/store.ts#L7830) `Store/portalCountsCurrent` | `Store.canView` (7830); `Store.row` (7857) | GATED-STORE |
| [packages/store/src/store.ts:8075](../../packages/store/src/store.ts#L8075) `Store/portalRows` | `relatedRows` (8075); `relatedIdList` (8076); `Store.viewableSet` (8079); `rowsById` (8104, 8142); `Calculations.related` (8118) | CORE |
| [packages/store/src/store.ts:8086](../../packages/store/src/store.ts#L8086) `Store/portalRows/context` | `Calculations.context` (8086) | CORE |
| [packages/store/src/store.ts:8096](../../packages/store/src/store.ts#L8096) `Store/portalRows/valueOf` | `Calculations.value` (8096) | CORE |
| [packages/store/src/store.ts:2615](../../packages/store/src/store.ts#L2615) `Store/prepared` | `SQLite.prepare` (2615); `Store.sql` (2615) | CORE |
| [packages/store/src/store.ts:5108](../../packages/store/src/store.ts#L5108) `Store/previewAccountImport` | `Store.sql` (5108, 5109, 5118) | CORE |
| [packages/store/src/store.ts:6814](../../packages/store/src/store.ts#L6814) `Store/previewRecordRuleCurrent` | `SQLite.get` (6814); `SQLite.prepare` (6814, 6817); `Store.sql` (6814, 6817); `SQLite.all` (6817); `Calculations.context` (6823, 6839) | CORE |
| [packages/store/src/store.ts:9562](../../packages/store/src/store.ts#L9562) `Store/previewRow` | `Store.row` (9562) | CORE |
| [packages/store/src/store.ts:6212](../../packages/store/src/store.ts#L6212) `Store/privilegeSets` | `Store.sql` (6212) | CORE |
| [packages/store/src/store.ts:2847](../../packages/store/src/store.ts#L2847) `Store/pruneAudit` | `Store.sql` (2847, 2849, 2851); `SQLite.get` (2849); `SQLite.prepare` (2849) | CORE |
| [packages/store/src/store.ts:8447](../../packages/store/src/store.ts#L8447) `Store/purgeOrphanContainers` | `Store.sql` (8447, 8451, 8460, 8463, 8464, 8469, 8470, 8472, 8472); `Store.orphanContainerReport` (8455); `SQLite.get` (8460); `SQLite.prepare` (8460, 8463, 8464) | CORE |
| [packages/store/src/store.ts:11592](../../packages/store/src/store.ts#L11592) `Store/query` | `SQLite.iterate` (11592) | CORE |
| [packages/store/src/store.ts:11632](../../packages/store/src/store.ts#L11632) `Store/queryWithOriginsCurrent` | `SQLite.iterate` (11632); `SQLite.all` (11641, 11644); `SQLite.prepare` (11641, 11644) | CORE |
| [packages/store/src/store.ts:11381](../../packages/store/src/store.ts#L11381) `Store/readOnlyChecked` | `SQLite.prepare` (11381, 11385, 11394, 11399); `SQLite.all` (11385, 11394, 11399) | CORE |
| [packages/store/src/store.ts:3614](../../packages/store/src/store.ts#L3614) `Store/recompute` | `SQLite.prepare` (3614, 3618); `Store.sql` (3614, 3618); `SQLite.iterate` (3618); `Calculations.computeStoredStyled` (3619); `Calculations.value` (3619) | CORE |
| [packages/store/src/store.ts:2630](../../packages/store/src/store.ts#L2630) `Store/recordAsOf` | `SQLite.get` (2630, 2632); `SQLite.prepare` (2630, 2632, 2634, 2635); `Store.sql` (2630, 2632, 2634, 2635); `SQLite.all` (2634, 2635) | CORE |
| [packages/store/src/store.ts:2326](../../packages/store/src/store.ts#L2326) `Store/recordCount` | `SQLite.get` (2326); `SQLite.prepare` (2326); `Store.sql` (2326) | CORE |
| [packages/store/src/store.ts:1526](../../packages/store/src/store.ts#L1526) `Store/recordedFormat` | `Store.sql` (1526) | CORE |
| [packages/store/src/store.ts:2707](../../packages/store/src/store.ts#L2707) `Store/recordLife` | `SQLite.all` (2707); `SQLite.prepare` (2707); `Store.sql` (2707) | CORE |
| [packages/store/src/store.ts:5657](../../packages/store/src/store.ts#L5657) `Store/recordObjectUse` | `Store.sql` (5657) | CORE |
| [packages/store/src/store.ts:10079](../../packages/store/src/store.ts#L10079) `Store/recordViewable` | `Store.row` (10079) | GATED-STORE |
| [packages/store/src/store.ts:8751](../../packages/store/src/store.ts#L8751) `Store/recoverContainersOut` | `SQLite.prepare` (8751); `Store.sql` (8751); `SQLite.get` (8754) | CORE |
| [packages/store/src/store.ts:1629](../../packages/store/src/store.ts#L1629) `Store/recoverPendingExternalFiles` | `Store.sql` (1629, 1631, 1655, 1657); `SQLite.prepare` (1631); `SQLite.get` (1642) | CORE |
| [packages/store/src/store.ts:6155](../../packages/store/src/store.ts#L6155) `Store/recoveryCodesRemaining` | `SQLite.get` (6155); `SQLite.prepare` (6155); `Store.sql` (6155) | CORE |
| [packages/store/src/store.ts:11421](../../packages/store/src/store.ts#L11421) `Store/refreshDecimalSqlViews` | `SQLite.get` (11421); `SQLite.prepare` (11421) | CORE |
| [packages/store/src/store.ts:3783](../../packages/store/src/store.ts#L3783) `Store/refuseLookalikeAccount` | `SQLite.all` (3783); `SQLite.prepare` (3783); `Store.sql` (3783) | CORE |
| [packages/store/src/store.ts:6021](../../packages/store/src/store.ts#L6021) `Store/registerPasskey` | `SQLite.prepare` (6021); `Store.sql` (6021) | CORE |
| [packages/store/src/store.ts:3961](../../packages/store/src/store.ts#L3961) `Store/rejectPending` | `SQLite.get` (3961); `SQLite.prepare` (3961, 3963); `Store.sql` (3961, 3963) | CORE |
| [packages/store/src/store.ts:9314](../../packages/store/src/store.ts#L9314) `Store/relatedCriteria` | `SQLite.iterate` (9314); `SQLite.prepare` (9314); `Store.sql` (9314) | CORE |
| [packages/store/src/store.ts:9311](../../packages/store/src/store.ts#L9311) `Store/relatedCriteria/matched` | `relatedRows` (9311) | CORE |
| [packages/store/src/store.ts:7617](../../packages/store/src/store.ts#L7617) `Store/relatedValues` | `Calculations.globalValue` (7617); `Calculations.unstoredValue` (7619) | CORE |
| [packages/store/src/store.ts:6034](../../packages/store/src/store.ts#L6034) `Store/removePasskey` | `SQLite.get` (6034); `SQLite.prepare` (6034, 6035); `Store.sql` (6034, 6035) | CORE |
| [packages/store/src/store.ts:9140](../../packages/store/src/store.ts#L9140) `Store/reportFind` | `Store.query` (9140, 9142, 9143); `Store.recordCount` (9145) | CORE |
| [packages/store/src/store.ts:10554](../../packages/store/src/store.ts#L10554) `Store/restoreDeletedRowLocked` | `SQLite.get` (10554, 10559); `SQLite.prepare` (10554, 10555, 10559, 10569); `Store.sql` (10554, 10555, 10559, 10569); `SQLite.all` (10555) | CORE |
| [packages/store/src/store.ts:2665](../../packages/store/src/store.ts#L2665) `Store/restoreRecord` | `Store.recordAsOf` (2665); `SQLite.get` (2669); `SQLite.prepare` (2669, 2674, 2683, 2694); `Store.sql` (2669, 2674, 2683, 2694) | CORE |
| [packages/store/src/store.ts:2723](../../packages/store/src/store.ts#L2723) `Store/revertAuditEntry` | `SQLite.get` (2723); `SQLite.prepare` (2723); `Store.sql` (2723); `Store.canViewRecord` (2725); `Store.auditLog` (2728) | CORE |
| [packages/store/src/store.ts:5782](../../packages/store/src/store.ts#L5782) `Store/revokeApiToken` | `SQLite.prepare` (5782); `Store.sql` (5782) | CORE |
| [packages/store/src/store.ts:5305](../../packages/store/src/store.ts#L5305) `Store/revokeSignInCredentials` | `SQLite.prepare` (5305, 5306, 5307); `Store.sql` (5305, 5306, 5307) | AUTH |
| [packages/store/src/store.ts:9580](../../packages/store/src/store.ts#L9580) `Store/row` | `SQLite.get` (9580) | CORE |
| [packages/store/src/store.ts:11525](../../packages/store/src/store.ts#L11525) `Store/rowsOf` | `SQLite.iterate` (11525, 11534) | CORE |
| [packages/store/src/store.ts:6619](../../packages/store/src/store.ts#L6619) `Store/ruleOutcome` | `Calculations.context` (6619) | CORE |
| [packages/store/src/store.ts:9425](../../packages/store/src/store.ts#L9425) `Store/runningSummaryValues` | `Store.viewableIds` (9425); `rowsById` (9427); `Calculations.value` (9438, 9444); `Calculations.related` (9455) | GATED-STORE |
| [packages/store/src/store.ts:6241](../../packages/store/src/store.ts#L6241) `Store/savePrivilegeSet` | `SQLite.prepare` (6241, 6249); `Store.sql` (6241, 6249) | AUTH |
| [packages/store/src/store.ts:4196](../../packages/store/src/store.ts#L4196) `Store/saveScriptTest` | `SQLite.prepare` (4196); `Store.sql` (4196) | CORE |
| [packages/store/src/store.ts:6779](../../packages/store/src/store.ts#L6779) `Store/scopedTableSql` | `Store.viewableIds` (6779); `SQLite.all` (6782); `SQLite.prepare` (6782); `Store.sql` (6782) | GATED-STORE |
| [packages/store/src/store.ts:3352](../../packages/store/src/store.ts#L3352) `Store/scriptHistory` | `SQLite.all` (3352); `SQLite.prepare` (3352); `Store.sql` (3352) | CORE |
| [packages/store/src/store.ts:1605](../../packages/store/src/store.ts#L1605) `Store/securityChainHeadAudit` | `SQLite.get` (1605); `SQLite.prepare` (1605); `Store.sql` (1605) | CORE |
| [packages/store/src/store.ts:3025](../../packages/store/src/store.ts#L3025) `Store/securityChange` | `Store.sql` (3025, 3027); `SQLite.prepare` (3027) | CORE |
| [packages/store/src/store.ts:2589](../../packages/store/src/store.ts#L2589) `Store/securityEvents` | `Store.auditLog` (2589) | CORE |
| [packages/store/src/store.ts:5506](../../packages/store/src/store.ts#L5506) `Store/securityToken` | `SQLite.get` (5506); `SQLite.prepare` (5506); `Store.sql` (5506) | CORE |
| [packages/store/src/store.ts:11555](../../packages/store/src/store.ts#L11555) `Store/selectHeldCurrent` | `Store.sql` (11555, 11557, 11560); `SQLite.prepare` (11557) | CORE |
| [packages/store/src/store.ts:10859](../../packages/store/src/store.ts#L10859) `Store/selectIdsCurrent` | `Store.selectIds` (10859); `SQLite.all` (10865); `SQLite.prepare` (10865); `Store.sql` (10865) | GATED-STORE |
| [packages/store/src/store.ts:11545](../../packages/store/src/store.ts#L11545) `Store/selectIn` | `Store.select` (11545) | CORE |
| [packages/store/src/store.ts:1992](../../packages/store/src/store.ts#L1992) `Store/selfContainedCopy` | `Store.sql` (1992); `SQLite.all` (1997); `SQLite.prepare` (1997, 1999, 2000, 2001) | CORE |
| [packages/store/src/store.ts:5284](../../packages/store/src/store.ts#L5284) `Store/setAccountActive` | `SQLite.prepare` (5284, 5292, 5293); `Store.sql` (5284, 5292, 5293) | AUTH |
| [packages/store/src/store.ts:5525](../../packages/store/src/store.ts#L5525) `Store/setAccountLocalOnly` | `SQLite.prepare` (5525); `Store.sql` (5525) | CORE |
| [packages/store/src/store.ts:6397](../../packages/store/src/store.ts#L6397) `Store/setAccountPrivilegeSet` | `SQLite.get` (6397); `SQLite.prepare` (6397, 6400, 6404); `Store.sql` (6397, 6400, 6404) | AUTH |
| [packages/store/src/store.ts:5534](../../packages/store/src/store.ts#L5534) `Store/setAccountRequire2fa` | `SQLite.prepare` (5534); `Store.sql` (5534) | CORE |
| [packages/store/src/store.ts:3813](../../packages/store/src/store.ts#L3813) `Store/setAgentAccount` | `SQLite.get` (3813); `SQLite.prepare` (3813, 3819); `Store.sql` (3813, 3819) | CORE |
| [packages/store/src/store.ts:4275](../../packages/store/src/store.ts#L4275) `Store/setAiAllowed` | `SQLite.prepare` (4275); `Store.sql` (4275) | CORE |
| [packages/store/src/store.ts:4360](../../packages/store/src/store.ts#L4360) `Store/setAiPolicy` | `SQLite.prepare` (4360); `Store.sql` (4360) | CORE |
| [packages/store/src/store.ts:7045](../../packages/store/src/store.ts#L7045) `Store/setAllowBlankPasswordFromLan` | `SQLite.prepare` (7045); `Store.sql` (7045) | CORE |
| [packages/store/src/store.ts:2825](../../packages/store/src/store.ts#L2825) `Store/setAuditSettings` | `SQLite.prepare` (2825); `Store.sql` (2825) | CORE |
| [packages/store/src/store.ts:8970](../../packages/store/src/store.ts#L8970) `Store/setContainer` | `Store.sql` (8970); `Store.row` (8976) | CORE |
| [packages/store/src/store.ts:3765](../../packages/store/src/store.ts#L3765) `Store/setExternalAccount` | `SQLite.get` (3765); `SQLite.prepare` (3765, 3770); `Store.sql` (3765, 3770) | CORE |
| [packages/store/src/store.ts:4983](../../packages/store/src/store.ts#L4983) `Store/setMustChangePassword` | `SQLite.prepare` (4983); `Store.sql` (4983) | CORE |
| [packages/store/src/store.ts:4020](../../packages/store/src/store.ts#L4020) `Store/setPasswordOnly` | `SQLite.get` (4020); `SQLite.prepare` (4020, 4026, 4035, 4042, 4043, 4044); `Store.sql` (4020, 4026, 4035, 4042, 4043, 4044) | AUTH |
| [packages/store/src/store.ts:4137](../../packages/store/src/store.ts#L4137) `Store/setPasswordPolicy` | `SQLite.prepare` (4137); `Store.sql` (4137) | CORE |
| [packages/store/src/store.ts:1494](../../packages/store/src/store.ts#L1494) `Store/setPersistentData` | `SQLite.prepare` (1494, 1498); `Store.sql` (1494, 1498) | CORE |
| [packages/store/src/store.ts:4380](../../packages/store/src/store.ts#L4380) `Store/setPiiIsolation` | `SQLite.prepare` (4380); `Store.sql` (4380) | CORE |
| [packages/store/src/store.ts:4173](../../packages/store/src/store.ts#L4173) `Store/setRequireTotpForFullAccess` | `SQLite.prepare` (4173); `Store.sql` (4173) | CORE |
| [packages/store/src/store.ts:4292](../../packages/store/src/store.ts#L4292) `Store/setScriptNetwork` | `SQLite.prepare` (4292); `Store.sql` (4292) | CORE |
| [packages/store/src/store.ts:4349](../../packages/store/src/store.ts#L4349) `Store/setSqlRequiresFmxdbc` | `SQLite.prepare` (4349); `Store.sql` (4349) | CORE |
| [packages/store/src/store.ts:10000](../../packages/store/src/store.ts#L10000) `Store/setStoredCalcValues` | `SQLite.prepare` (10000, 10001); `Store.sql` (10000, 10001); `SQLite.get` (10005) | CORE |
| [packages/store/src/store.ts:5459](../../packages/store/src/store.ts#L5459) `Store/settleSignIns` | `SQLite.all` (5459, 5465); `SQLite.prepare` (5459, 5465, 5471, 5475, 5477); `Store.sql` (5459, 5465, 5471, 5475, 5477) | AUTH |
| [packages/store/src/store.ts:9073](../../packages/store/src/store.ts#L9073) `Store/setUserPref` | `Store.sql` (9073, 9074, 9075); `SQLite.prepare` (9074, 9075) | CORE |
| [packages/store/src/store.ts:4333](../../packages/store/src/store.ts#L4333) `Store/setWebViewerHosts` | `SQLite.prepare` (4333); `Store.sql` (4333) | CORE |
| [packages/store/src/store.ts:2123](../../packages/store/src/store.ts#L2123) `Store/shareResults` | `Store.sql` (2123) | CORE |
| [packages/store/src/store.ts:1556](../../packages/store/src/store.ts#L1556) `Store/shipWal` | `Store.sql` (1556) | CORE |
| [packages/store/src/store.ts:5406](../../packages/store/src/store.ts#L5406) `Store/signInBase` | `SQLite.get` (5406); `SQLite.prepare` (5406); `Store.sql` (5406) | AUTH |
| [packages/store/src/store.ts:5408](../../packages/store/src/store.ts#L5408) `Store/signInBase/identity` | `SQLite.get` (5408); `SQLite.prepare` (5408); `Store.sql` (5408) | AUTH |
| [packages/store/src/store.ts:5395](../../packages/store/src/store.ts#L5395) `Store/signInMark` | `SQLite.prepare` (5395); `Store.sql` (5395) | AUTH |
| [packages/store/src/store.ts:9239](../../packages/store/src/store.ts#L9239) `Store/sortedPage` | `SQLite.iterate` (9239); `SQLite.prepare` (9239, 9254); `Store.sql` (9239, 9254); `SQLite.all` (9254) | CORE |
| [packages/store/src/store.ts:11157](../../packages/store/src/store.ts#L11157) `Store/sortIdsCurrentProgress` | `Store.sortIds` (11157); `Store.sortIdsProgress` (11157); `SQLite.all` (11170); `SQLite.prepare` (11170, 11249); `Store.sql` (11170, 11249); `Store.valueListItems` (11178); `rowsById` (11190); `Calculations.globalValue` (11193); `Calculations.unstoredValue` (11194); `Calculations.related` (11200); `SQLite.iterate` (11249) | GATED-STORE |
| [packages/store/src/store.ts:11335](../../packages/store/src/store.ts#L11335) `Store/storedFileId` | `SQLite.get` (11335); `SQLite.prepare` (11335) | CORE |
| [packages/store/src/store.ts:9387](../../packages/store/src/store.ts#L9387) `Store/summaries` | `Calculations.wholeTable` (9387); `Calculations.collect` (9407, 9412) | CORE |
| [packages/store/src/store.ts:9403](../../packages/store/src/store.ts#L9403) `Store/summaries/recs` | `SQLite.iterate` (9403); `SQLite.prepare` (9403); `Store.sql` (9403) | CORE |
| [packages/store/src/store.ts:5972](../../packages/store/src/store.ts#L5972) `Store/takeWebauthnChallenge` | `SQLite.get` (5972); `SQLite.prepare` (5972, 5976); `Store.sql` (5972, 5976) | CORE |
| [packages/store/src/store.ts:7229](../../packages/store/src/store.ts#L7229) `Store/themes` | `SQLite.get` (7229) | CORE |
| [packages/store/src/store.ts:9126](../../packages/store/src/store.ts#L9126) `Store/timeFind` | `Store.query` (9126) | CORE |
| [packages/store/src/store.ts:7554](../../packages/store/src/store.ts#L7554) `Store/toRecord` | `Calculations.value` (7554, 7564); `Calculations.globalValue` (7558); `Calculations.unstoredStyled` (7563) | CORE |
| [packages/store/src/store.ts:5856](../../packages/store/src/store.ts#L5856) `Store/totpAccounts` | `SQLite.all` (5856); `SQLite.prepare` (5856); `Store.sql` (5856) | CORE |
| [packages/store/src/store.ts:1568](../../packages/store/src/store.ts#L1568) `Store/trial` | `Store.sql` (1568) | CORE |
| [packages/store/src/store.ts:1573](../../packages/store/src/store.ts#L1573) `Store/trial/undo` | `Store.sql` (1573) | CORE |
| [packages/store/src/store.ts:11291](../../packages/store/src/store.ts#L11291) `Store/truncate/run` | `Store.sql` (11291, 11293, 11300, 11302, 11304, 11305); `SQLite.prepare` (11293, 11300); `SQLite.all` (11295) | CORE |
| [packages/store/src/store.ts:3712](../../packages/store/src/store.ts#L3712) `Store/unmigratedAccounts` | `SQLite.all` (3712); `SQLite.prepare` (3712); `Store.sql` (3712) | CORE |
| [packages/store/src/store.ts:4889](../../packages/store/src/store.ts#L4889) `Store/unusedAccess` | `SQLite.get` (4889); `SQLite.prepare` (4889, 4898); `Store.sql` (4889, 4898); `SQLite.all` (4898) | CORE |
| [packages/store/src/store.ts:4937](../../packages/store/src/store.ts#L4937) `Store/unusedObjects` | `SQLite.get` (4937); `SQLite.prepare` (4937, 4940); `Store.sql` (4937, 4940); `SQLite.all` (4940) | CORE |
| [packages/store/src/store.ts:6096](../../packages/store/src/store.ts#L6096) `Store/unusedRecoveryHashes` | `SQLite.all` (6096); `SQLite.prepare` (6096); `Store.sql` (6096) | CORE |
| [packages/store/src/store.ts:4719](../../packages/store/src/store.ts#L4719) `Store/unusualAccess` | `Store.auditLog` (4719, 4785) | CORE |
| [packages/store/src/store.ts:9821](../../packages/store/src/store.ts#L9821) `Store/update` | `Store.row` (9821); `Store.sql` (9852, 9853, 9892, 9895) | CORE |
| [packages/store/src/store.ts:9855](../../packages/store/src/store.ts#L9855) `Store/update/undo` | `Store.sql` (9855) | CORE |
| [packages/store/src/store.ts:10285](../../packages/store/src/store.ts#L10285) `Store/updatePortals` | `Store.row` (10285, 10321); `relatedRows` (10322) | CORE |
| [packages/store/src/store.ts:10295](../../packages/store/src/store.ts#L10295) `Store/updatePortals/portal/related` | `relatedIdList` (10295) | CORE |
| [packages/store/src/store.ts:10267](../../packages/store/src/store.ts#L10267) `Store/updateRelated` | `relatedRows` (10267) | CORE |
| [packages/store/src/store.ts:4975](../../packages/store/src/store.ts#L4975) `Store/usageCounting` | `SQLite.get` (4975); `SQLite.prepare` (4975); `Store.sql` (4975) | CORE |
| [packages/store/src/store.ts:9064](../../packages/store/src/store.ts#L9064) `Store/userPrefs` | `SQLite.all` (9064); `SQLite.prepare` (9064); `Store.sql` (9064) | CORE |
| [packages/store/src/store.ts:7946](../../packages/store/src/store.ts#L7946) `Store/valueListItemsCurrent` | `Store.valueListItems` (7946); `Store.get` (7960); `relatedRows` (7961); `Store.row` (7961); `SQLite.iterate` (7963); `SQLite.prepare` (7963); `Store.sql` (7963); `Calculations.related` (7973); `Calculations.value` (7977, 7978) | GATED-STORE |
| [packages/store/src/store.ts:10476](../../packages/store/src/store.ts#L10476) `Store/vaultHeld` | `SQLite.get` (10476); `SQLite.prepare` (10476); `Store.sql` (10476) | CORE |
| [packages/store/src/store.ts:6056](../../packages/store/src/store.ts#L6056) `Store/verifyPasskeyCredential` | `SQLite.get` (6056); `SQLite.prepare` (6056, 6068); `Store.sql` (6056, 6068) | CORE |
| [packages/store/src/store.ts:5885](../../packages/store/src/store.ts#L5885) `Store/verifyTotp` | `SQLite.get` (5885); `SQLite.prepare` (5885, 5892); `Store.sql` (5885, 5892) | CORE |
| [packages/store/src/store.ts:2259](../../packages/store/src/store.ts#L2259) `Store/versionNumber` | `SQLite.get` (2259); `SQLite.prepare` (2259); `Store.sql` (2259) | CORE |
| [packages/store/src/store.ts:2134](../../packages/store/src/store.ts#L2134) `Store/versionTriggers` | `SQLite.get` (2134); `SQLite.prepare` (2134, 2139, 2140); `Store.sql` (2134, 2139, 2140, 2157, 2159, 2160, 2162); `SQLite.all` (2139, 2140) | CORE |
| [packages/store/src/store.ts:2102](../../packages/store/src/store.ts#L2102) `Store/warmSummariesCurrent` | `Calculations.wholeTable` (2102) | CORE |
| [packages/store/src/store.ts:4315](../../packages/store/src/store.ts#L4315) `Store/webViewerChecked` | `SQLite.get` (4315); `SQLite.prepare` (4315); `Store.sql` (4315) | CORE |
| [packages/store/src/store.ts:1860](../../packages/store/src/store.ts#L1860) `Store/withWriteTransaction` | `Store.sql` (1860, 1872, 1878, 1880, 1880) | CORE |
| [packages/store/src/store.ts:7489](../../packages/store/src/store.ts#L7489) `Store/wordIndex` | `Store.sql` (7489, 7497, 7502); `Store.recordCount` (7501); `SQLite.get` (7502); `SQLite.prepare` (7502) | CORE |
| [packages/store/src/store.ts:8644](../../packages/store/src/store.ts#L8644) `Store/writeExternalFile` | `Store.evaluateEach` (8644); `SQLite.prepare` (8667); `Store.sql` (8667) | CORE |
| [packages/store/src/store.ts:8668](../../packages/store/src/store.ts#L8668) `Store/writeExternalFile/taken` | `SQLite.get` (8668) | CORE |
| [packages/store/src/store.ts:5715](../../packages/store/src/store.ts#L5715) `Store/writeObjectUseRows` | `SQLite.prepare` (5715, 5716, 5721); `Store.sql` (5715, 5716, 5721) | CORE |
| [packages/store/src/store.ts:2314](../../packages/store/src/store.ts#L2314) `Store/writeToken` | `SQLite.get` (2314); `SQLite.prepare` (2314); `Store.sql` (2314) | CORE |
| [packages/store/src/store.ts:5687](../../packages/store/src/store.ts#L5687) `Store/writeUsage` | `Store.sql` (5687, 5688, 5690, 5694, 5696) | CORE |
| [packages/store/src/store.ts:5703](../../packages/store/src/store.ts#L5703) `Store/writeUsageRows` | `SQLite.prepare` (5703, 5704, 5710); `Store.sql` (5703, 5704, 5710) | CORE |
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
<!-- end generated read-gate inventory -->
