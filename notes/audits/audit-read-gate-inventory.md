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
| [packages/cli/src/diagnostics.ts:230](../../packages/cli/src/diagnostics.ts#L230) `designCopy` | `SQLite.all` (230); `SQLite.prepare` (230, 233) | OPERATOR |
| [packages/cli/src/diagnostics.ts:470](../../packages/cli/src/diagnostics.ts#L470) `diagnostics` | `SQLite.get` (470); `SQLite.prepare` (470, 474); `SQLite.all` (474) | OPERATOR |
| [packages/cli/src/doctor.ts:140](../../packages/cli/src/doctor.ts#L140) `accountChecks` | `SQLite.all` (140); `SQLite.prepare` (140) | OPERATOR |
| [packages/cli/src/main.ts:757](../../packages/cli/src/main.ts#L757) `accountsWithPasswordOff` | `SQLite.all` (757); `SQLite.prepare` (757) | OPERATOR |
| [packages/cli/src/main.ts:790](../../packages/cli/src/main.ts#L790) `hostedRead` | `SQLite.all` (790, 793); `SQLite.prepare` (790, 793); `Store.sql` (790, 793) | OPERATOR |
| [packages/cli/src/main.ts:2549](../../packages/cli/src/main.ts#L2549) `main` | `Store.orphanContainerReport` (2549); `Store.auditLog` (3029); `SQLite.get` (3298); `SQLite.prepare` (3298) | OPERATOR |
| [packages/scripts/src/data-api-step.ts:104](../../packages/scripts/src/data-api-step.ts#L104) `respond` | `Store.get` (104, 131, 140); `Store.find` (105, 117) | SCRIPT |
| [packages/scripts/src/engine.ts:9591](../../packages/scripts/src/engine.ts#L9591) `clearRecords` | `SQLite.all` (9591); `SQLite.prepare` (9591) | SCRIPT |
| [packages/scripts/src/engine.ts:8358](../../packages/scripts/src/engine.ts#L8358) `ScriptEngine/containerFile` | `Store.get` (8358); `Store.containerId` (8359); `Store.container` (8360) | SCRIPT |
| [packages/scripts/src/engine.ts:5909](../../packages/scripts/src/engine.ts#L5909) `ScriptEngine/design` | `Store.valueListItems` (5909) | SCRIPT |
| [packages/scripts/src/engine.ts:6669](../../packages/scripts/src/engine.ts#L6669) `ScriptEngine/exportField` | `Store.get` (6669); `Store.containerId` (6670); `Store.container` (6672) | SCRIPT |
| [packages/scripts/src/engine.ts:8778](../../packages/scripts/src/engine.ts#L8778) `ScriptEngine/fileMakerRows` | `Store.findIds` (8778); `Store.get` (8783) | SCRIPT |
| [packages/scripts/src/engine.ts:3469](../../packages/scripts/src/engine.ts#L3469) `ScriptEngine/findIdsCooperative` | `Store.findIdsProgress` (3469) | SCRIPT |
| [packages/scripts/src/engine.ts:2436](../../packages/scripts/src/engine.ts#L2436) `ScriptEngine/foundSet` | `Store.findIds` (2436) | SCRIPT |
| [packages/scripts/src/engine.ts:5749](../../packages/scripts/src/engine.ts#L5749) `ScriptEngine/get` | `Store.findIds` (5749); `Store.canViewRecord` (5842); `Store.get` (5878) | SCRIPT |
| [packages/scripts/src/engine.ts:2035](../../packages/scripts/src/engine.ts#L2035) `ScriptEngine/goToLayout` | `Store.findIds` (2035) | SCRIPT |
| [packages/scripts/src/engine.ts:8549](../../packages/scripts/src/engine.ts#L8549) `ScriptEngine/importRecords` | `Store.get` (8549) | SCRIPT |
| [packages/scripts/src/engine.ts:6021](../../packages/scripts/src/engine.ts#L6021) `ScriptEngine/lookupNext` | `Store.get` (6021); `Store.row` (6022); `Calculations.context` (6024) | SCRIPT |
| [packages/scripts/src/engine.ts:5552](../../packages/scripts/src/engine.ts#L5552) `ScriptEngine/newCalcContext/executeSQL` | `Calculations.executeSQL` (5552) | SCRIPT |
| [packages/scripts/src/engine.ts:5560](../../packages/scripts/src/engine.ts#L5560) `ScriptEngine/newCalcContext/persistentData` | `Store.persistentData` (5560) | SCRIPT |
| [packages/scripts/src/engine.ts:5561](../../packages/scripts/src/engine.ts#L5561) `ScriptEngine/newCalcContext/persistentDataIds` | `Store.persistentDataIds` (5561) | SCRIPT |
| [packages/scripts/src/engine.ts:8818](../../packages/scripts/src/engine.ts#L8818) `ScriptEngine/newRecord` | `Store.findIds` (8818) | SCRIPT |
| [packages/scripts/src/engine.ts:9198](../../packages/scripts/src/engine.ts#L9198) `ScriptEngine/quickFind` | `Store.get` (9198) | SCRIPT |
| [packages/scripts/src/engine.ts:5963](../../packages/scripts/src/engine.ts#L5963) `ScriptEngine/record` | `Store.get` (5963) | SCRIPT |
| [packages/scripts/src/engine.ts:2352](../../packages/scripts/src/engine.ts#L2352) `ScriptEngine/transactionContext` | `Store.get` (2352) | SCRIPT |
| [packages/scripts/src/engine.ts:6124](../../packages/scripts/src/engine.ts#L6124) `ScriptEngine/relatedIds` | `Store.findIds` (6124); `rowsById` (6132); `Store.select` (6136); `Store.matchIds` (6150); `Store.viewableIds` (6173) | SCRIPT |
| [packages/scripts/src/engine.ts:6158](../../packages/scripts/src/engine.ts#L6158) `ScriptEngine/relatedIds/matching` | `Store.matchIds` (6158) | SCRIPT |
| [packages/scripts/src/engine.ts:6823](../../packages/scripts/src/engine.ts#L6823) `ScriptEngine/relookup` | `Store.get` (6823) | SCRIPT |
| [packages/scripts/src/engine.ts:3629](../../packages/scripts/src/engine.ts#L3629) `ScriptEngine/revertTransaction` | `Store.findIds` (3629) | SCRIPT |
| [packages/scripts/src/engine.ts:3483](../../packages/scripts/src/engine.ts#L3483) `ScriptEngine/sortIdsCooperative` | `Store.sortIdsProgress` (3483) | SCRIPT |
| [packages/scripts/src/engine.ts:3511](../../packages/scripts/src/engine.ts#L3511) `ScriptEngine/sortIdsProgress` | `Store.sortIdsProgress` (3511); `Store.valueListItems` (3517) | SCRIPT |
| [packages/scripts/src/engine.ts:7605](../../packages/scripts/src/engine.ts#L7605) `ScriptEngine/sourceValue` | `Store.get` (7605); `Store.containerId` (7606); `Store.container` (7607) | SCRIPT |
| [packages/scripts/src/engine.ts:3420](../../packages/scripts/src/engine.ts#L3420) `ScriptEngine/sqlByNaturalLanguage` | `Calculations.translateSQL` (3420); `Calculations.executeSQL` (3427) | SCRIPT |
| [packages/scripts/src/engine.ts:4239](../../packages/scripts/src/engine.ts#L4239) `ScriptEngine/step` | `Store.fieldIndex` (4239) | SCRIPT |
| [packages/scripts/src/engine.ts:5996](../../packages/scripts/src/engine.ts#L5996) `ScriptEngine/valueOf` | `Store.findIds` (5996, 5996); `Store.containerId` (6004) | SCRIPT |
| [packages/scripts/src/recorder.ts:83](../../packages/scripts/src/recorder.ts#L83) `lastSeq` | `Store.auditLog` (83) | DESIGN |
| [packages/scripts/src/recorder.ts:121](../../packages/scripts/src/recorder.ts#L121) `recordRun` | `Store.auditLog` (121) | DESIGN |
| [packages/scripts/src/script-tests.ts:213](../../packages/scripts/src/script-tests.ts#L213) `runCase` | `Store.findIds` (213); `Store.auditLog` (220, 221, 265); `Store.evaluateEach` (248) | DESIGN |
| [packages/scripts/src/testrun.ts:306](../../packages/scripts/src/testrun.ts#L306) `recordWith` | `Store.evaluateEach` (306) | DESIGN |
| [packages/scripts/src/testrun.ts:199](../../packages/scripts/src/testrun.ts#L199) `seedSelections` | `Calculations.globalValue` (199); `Store.find` (204) | DESIGN |
| [packages/scripts/src/testrun.ts:338](../../packages/scripts/src/testrun.ts#L338) `testRun` | `Store.evaluateEach` (338) | DESIGN |
| [packages/scripts/src/testrun.ts:270](../../packages/scripts/src/testrun.ts#L270) `testScript` | `Store.findIds` (270) | DESIGN |
| [packages/server/src/admin.ts:2578](../../packages/server/src/admin.ts#L2578) `Admin/audit` | `Store.auditLog` (2578) | ADMIN |
| [packages/server/src/admin.ts:1198](../../packages/server/src/admin.ts#L1198) `Admin/handle` | `Store.externalContainerReport` (1198); `Store.orphanContainerReport` (1203, 1207) | ADMIN |
| [packages/server/src/admin.ts:3018](../../packages/server/src/admin.ts#L3018) `Admin/status` | `Store.externalContainerCount` (3018) | ADMIN |
| [packages/server/src/admin.ts:2661](../../packages/server/src/admin.ts#L2661) `Admin/viewAs` | `Store.find` (2661) | ADMIN |
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
| [packages/server/src/conversion-guide.ts:436](../../packages/server/src/conversion-guide.ts#L436) `ConversionGuides/save` | `SQLite.prepare` (436); `Store.sql` (436) | DESIGN |
| [packages/server/src/conversion-guide.ts:427](../../packages/server/src/conversion-guide.ts#L427) `ConversionGuides/saved` | `SQLite.get` (427); `SQLite.prepare` (427); `Store.sql` (427) | DESIGN |
| [packages/server/src/conversion-guide.ts:417](../../packages/server/src/conversion-guide.ts#L417) `ConversionGuides/table` | `Store.sql` (417) | DESIGN |
| [packages/server/src/conversion-guide.ts:138](../../packages/server/src/conversion-guide.ts#L138) `convertedAt` | `SQLite.get` (138); `SQLite.prepare` (138); `Store.sql` (138) | DESIGN |
| [packages/server/src/conversion.ts:377](../../packages/server/src/conversion.ts#L377) `conversionReport` | `Store.externalContainerCheck` (377) | DESIGN |
| [packages/server/src/cwp-xml.ts:713](../../packages/server/src/cwp-xml.ts#L713) `CwpXmlEndpoint/layoutDoc` | `Store.valueListItems` (713) | XML |
| [packages/server/src/cwp-xml.ts:617](../../packages/server/src/cwp-xml.ts#L617) `CwpXmlEndpoint/records` | `Store.get` (617, 637, 645); `Store.findIds` (620); `Store.sortIds` (625); `Store.getMany` (626); `Store.find` (627, 629, 631, 632, 638, 641) | XML |
| [packages/server/src/cwp-xml.ts:581](../../packages/server/src/cwp-xml.ts#L581) `CwpXmlEndpoint/write` | `Store.get` (581, 585, 594); `Store.find` (593) | XML sign-in requires fmxml; every record/version read and count passes the signed-in Privileges, and the response layout is checked for access and the same table before any mutation. Writes and response reads share an atomic transaction. |
| [packages/server/src/dashboards.ts:390](../../packages/server/src/dashboards.ts#L390) `Dashboards/create` | `SQLite.prepare` (390); `Store.sql` (390) | DASHBOARD |
| [packages/server/src/dashboards.ts:410](../../packages/server/src/dashboards.ts#L410) `Dashboards/delete` | `SQLite.prepare` (410); `Store.sql` (410) | DASHBOARD |
| [packages/server/src/dashboards.ts:376](../../packages/server/src/dashboards.ts#L376) `Dashboards/get` | `SQLite.get` (376); `SQLite.prepare` (376); `Store.sql` (376) | DASHBOARD |
| [packages/server/src/dashboards.ts:370](../../packages/server/src/dashboards.ts#L370) `Dashboards/list` | `SQLite.all` (370); `SQLite.prepare` (370); `Store.sql` (370) | DASHBOARD |
| [packages/server/src/dashboards.ts:360](../../packages/server/src/dashboards.ts#L360) `Dashboards/table` | `Store.sql` (360) | DASHBOARD |
| [packages/server/src/dashboards.ts:403](../../packages/server/src/dashboards.ts#L403) `Dashboards/update` | `SQLite.prepare` (403); `Store.sql` (403) | DASHBOARD |
| [packages/server/src/dataapi.ts:2159](../../packages/server/src/dataapi.ts#L2159) `DataApi/route` | `Store.get` (2159, 2384, 2385, 2408, 2416, 2469, 2493, 2513, 2550); `Store.valueListItems` (2174); `Store.find` (2335, 2387, 2584); `Store.findIds` (2339, 2589); `Store.query` (2589) | REST |
| [packages/server/src/dataapi.ts:2287](../../packages/server/src/dataapi.ts#L2287) `DataApi/route/recordOut` | `Store.portalCounts` (2287) | REST |
| [packages/server/src/dataapi.ts:2323](../../packages/server/src/dataapi.ts#L2323) `DataApi/route/shownAs` | `Store.get` (2323) | REST |
| [packages/server/src/debug.ts:346](../../packages/server/src/debug.ts#L346) `DebugApi/handle` | `Store.row` (346, 475); `Store.get` (355, 480); `Store.evaluate` (379) | DESIGN |
| [packages/server/src/debug.ts:195](../../packages/server/src/debug.ts#L195) `learnStoredCredentials` | `Calculations.globalValue` (195); `Store.sql` (201, 211, 211); `SQLite.iterate` (211, 211); `SQLite.prepare` (211, 211); `Store.iterateCommitted` (211) | DESIGN |
| [packages/server/src/design.ts:244](../../packages/server/src/design.ts#L244) `containerData` | `Store.query` (244) | DESIGN |
| [packages/server/src/design.ts:753](../../packages/server/src/design.ts#L753) `DesignApi/handle` | `Store.auditLog` (753); `Store.evaluate` (820) | DESIGN |
| [packages/server/src/design.ts:253](../../packages/server/src/design.ts#L253) `recordCount` | `Store.query` (253) | DESIGN |
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
| [packages/server/src/docs.ts:158](../../packages/server/src/docs.ts#L158) `count` | `Store.query` (158) | DESIGN |
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
| [packages/server/src/mcp-design.ts:513](../../packages/server/src/mcp-design.ts#L513) `registerDesignTools/audit_log` | `Store.auditLog` (513) | DESIGN |
| [packages/server/src/mcp.ts:1491](../../packages/server/src/mcp.ts#L1491) `createMcpServer/check_record` | `Store.get` (1491); `Store.row` (1493) | MCP |
| [packages/server/src/mcp.ts:1212](../../packages/server/src/mcp.ts#L1212) `createMcpServer/evaluate_calculation` | `Store.get` (1212, 1220); `Store.find` (1213); `Store.evaluate` (1214); `Store.row` (1219) | SQL |
| [packages/server/src/mcp.ts:1515](../../packages/server/src/mcp.ts#L1515) `createMcpServer/explain_related` | `Store.get` (1515) | MCP |
| [packages/server/src/mcp.ts:1468](../../packages/server/src/mcp.ts#L1468) `createMcpServer/explain_value` | `Store.get` (1468); `Store.row` (1469) | MCP |
| [packages/server/src/mcp.ts:1092](../../packages/server/src/mcp.ts#L1092) `createMcpServer/find_records` | `Store.find` (1092) | MCP |
| [packages/server/src/mcp.ts:1287](../../packages/server/src/mcp.ts#L1287) `createMcpServer/get_container` | `Store.container` (1287) | SQL |
| [packages/server/src/mcp.ts:1105](../../packages/server/src/mcp.ts#L1105) `createMcpServer/get_record` | `Store.get` (1105) | MCP |
| [packages/server/src/mcp.ts:1311](../../packages/server/src/mcp.ts#L1311) `createMcpServer/sql_query` | `Store.queryWithOrigins` (1311) | SQL |
| [packages/server/src/mcp.ts:1155](../../packages/server/src/mcp.ts#L1155) `createMcpServer/update_record` | `Store.get` (1155, 1159) | MCP |
| [packages/server/src/mcp.ts:2413](../../packages/server/src/mcp.ts#L2413) `registerResources/audit` | `Store.auditLog` (2413) | MCP |
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
| [packages/server/src/pgwire.ts:995](../../packages/server/src/pgwire.ts#L995) `Connection/bareNames` | `Store.describe` (995) | SQL |
| [packages/server/src/pgwire.ts:1011](../../packages/server/src/pgwire.ts#L1011) `Connection/catalog` | `Store.describeTyped` (1011) | SQL |
| [packages/server/src/pgwire.ts:1453](../../packages/server/src/pgwire.ts#L1453) `Connection/describe` | `Store.describeTyped` (1453) | SQL |
| [packages/server/src/pgwire.ts:1022](../../packages/server/src/pgwire.ts#L1022) `Connection/run` | `Store.selectIn` (1022); `Store.describeTyped` (1026) | SQL |
| [packages/server/src/pgwire.ts:972](../../packages/server/src/pgwire.ts#L972) `Connection/translate` | `Calculations.translateSQL` (972) | SQL |
| [packages/server/src/pgwire.ts:1220](../../packages/server/src/pgwire.ts#L1220) `Connection/validateSyntax` | `SQLite.prepare` (1220); `Store.sql` (1220) | SQL |
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
| [packages/server/src/scim.ts:293](../../packages/server/src/scim.ts#L293) `ScimDirectory/atomically` | `Store.sql` (293) | AUTH |
| [packages/server/src/scim.ts:407](../../packages/server/src/scim.ts#L407) `ScimDirectory/create/scim_user_create` | `SQLite.prepare` (407); `Store.sql` (407) | AUTH |
| [packages/server/src/scim.ts:332](../../packages/server/src/scim.ts#L332) `ScimDirectory/rebind` | `SQLite.prepare` (332); `Store.sql` (332) | AUTH |
| [packages/server/src/scim.ts:457](../../packages/server/src/scim.ts#L457) `ScimDirectory/remove/scim_user_remove` | `SQLite.prepare` (457); `Store.sql` (457) | AUTH |
| [packages/server/src/scim.ts:354](../../packages/server/src/scim.ts#L354) `ScimDirectory/revokePersonTokens` | `SQLite.all` (354); `SQLite.prepare` (354); `Store.sql` (354) | AUTH |
| [packages/server/src/scim.ts:227](../../packages/server/src/scim.ts#L227) `ScimDirectory/rows` | `SQLite.all` (227); `SQLite.prepare` (227, 232); `Store.sql` (227, 232) | AUTH |
| [packages/server/src/scim.ts:145](../../packages/server/src/scim.ts#L145) `ScimDirectory/save` | `SQLite.prepare` (145); `Store.sql` (145) | AUTH |
| [packages/server/src/scim.ts:256](../../packages/server/src/scim.ts#L256) `ScimDirectory/setMemberships` | `SQLite.prepare` (256); `Store.sql` (256) | AUTH |
| [packages/server/src/scim.ts:137](../../packages/server/src/scim.ts#L137) `ScimDirectory/settings` | `SQLite.get` (137); `SQLite.prepare` (137); `Store.sql` (137) | AUTH |
| [packages/server/src/scim.ts:124](../../packages/server/src/scim.ts#L124) `ScimDirectory/table` | `Store.sql` (124, 126); `SQLite.all` (126); `SQLite.prepare` (126) | AUTH |
| [packages/server/src/scim.ts:129](../../packages/server/src/scim.ts#L129) `ScimDirectory/table/scim_identity_column` | `SQLite.all` (129); `SQLite.prepare` (129); `Store.sql` (129, 130) | AUTH |
| [packages/server/src/scim.ts:430](../../packages/server/src/scim.ts#L430) `ScimDirectory/update/scim_user_update` | `SQLite.prepare` (430); `Store.sql` (430) | AUTH |
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
| [packages/server/src/window-transaction.ts:32](../../packages/server/src/window-transaction.ts#L32) `context` | `Store.get` (32) | WEB |
| [packages/server/src/webclient.ts:2679](../../packages/server/src/webclient.ts#L2679) `foundIds` | `Store.findIds` (2679, 2681) | WEB |
| [packages/server/src/webclient.ts:2600](../../packages/server/src/webclient.ts#L2600) `listItems` | `Store.valueListItems` (2600) | WEB |
| [packages/server/src/webclient.ts:1710](../../packages/server/src/webclient.ts#L1710) `WebClient/aiReplace` | `Store.canView` (1710); `Store.getMany` (1726) | WEB |
| [packages/server/src/webclient.ts:1894](../../packages/server/src/webclient.ts#L1894) `WebClient/button` | `Store.findIds` (1894, 1949); `Store.evaluateEach` (1908, 1909) | WEB |
| [packages/server/src/webclient.ts:1296](../../packages/server/src/webclient.ts#L1296) `WebClient/charts` | `Calculations.context` (1296); `Store.canView` (1324); `Store.evaluateEach` (1333, 1337); `Store.evaluateRows` (1342, 1344) | WEB |
| [packages/server/src/webclient.ts:1287](../../packages/server/src/webclient.ts#L1287) `WebClient/charts/foundSet` | `Store.findIds` (1287) | WEB |
| [packages/server/src/webclient.ts:1327](../../packages/server/src/webclient.ts#L1327) `WebClient/charts/get` | `Store.get` (1327) | WEB |
| [packages/server/src/webclient.ts:695](../../packages/server/src/webclient.ts#L695) `WebClient/explain` | `Store.get` (695); `Store.row` (728, 741) | WEB |
| [packages/server/src/webclient.ts:1516](../../packages/server/src/webclient.ts#L1516) `WebClient/exportRecords` | `Store.getMany` (1516) | WEB |
| [packages/server/src/webclient.ts:1203](../../packages/server/src/webclient.ts#L1203) `WebClient/foundIds` | `Store.findIds` (1203) | WEB |
| [packages/server/src/webclient.ts:1247](../../packages/server/src/webclient.ts#L1247) `WebClient/foundSetPortal` | `Store.foundSetRows` (1247, 1254) | WEB |
| [packages/server/src/webclient.ts:1786](../../packages/server/src/webclient.ts#L1786) `WebClient/groups` | `Store.findIds` (1786); `Store.groupSummaries` (1792) | WEB |
| [packages/server/src/webclient.ts:555](../../packages/server/src/webclient.ts#L555) `WebClient/history` | `Store.get` (555) | WEB |
| [packages/server/src/webclient.ts:754](../../packages/server/src/webclient.ts#L754) `WebClient/index` | `Store.fieldIndex` (754) | WEB |
| [packages/server/src/webclient.ts:861](../../packages/server/src/webclient.ts#L861) `WebClient/menus` | `Store.evaluateEach` (861) | WEB |
| [packages/server/src/webclient.ts:1218](../../packages/server/src/webclient.ts#L1218) `WebClient/records` | `Store.getMany` (1218); `Store.find` (1221) | WEB |
| [packages/server/src/webclient.ts:1164](../../packages/server/src/webclient.ts#L1164) `WebClient/refresh` | `Store.previewRow` (1164); `Store.getMany` (1169); `Store.foundSetRows` (1191) | WEB |
| [packages/server/src/webclient.ts:1410](../../packages/server/src/webclient.ts#L1410) `WebClient/streamExportRecords/nextBatch` | `Store.selectIds` (1410); `Store.getMany` (1416) | WEB |
| [packages/server/src/webclient.ts:1078](../../packages/server/src/webclient.ts#L1078) `WebClient/view` | `Store.evaluateEach` (1078, 1102, 1121); `Store.canView` (1096); `Store.previewRow` (1100, 1122); `Store.get` (1113); `Store.row` (1114, 1114) | WEB |
| [packages/server/src/webclient.ts:1099](../../packages/server/src/webclient.ts#L1099) `WebClient/view/get` | `Store.get` (1099) | WEB |
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
| [packages/store/src/calc.ts:3232](../../packages/store/src/calc.ts#L3232) `rowsById/flush` | `Calculations.statement` (3232); `SQLite.iterate` (3232) | CALC |
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
| [packages/store/src/privileges.ts:555](../../packages/store/src/privileges.ts#L555) `ensurePrivilegeTables` | `SQLite.all` (555); `SQLite.prepare` (555) | AUTH |
| [packages/store/src/privileges.ts:527](../../packages/store/src/privileges.ts#L527) `privilegeSets` | `SQLite.all` (527); `SQLite.prepare` (527) | AUTH |
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
| [packages/store/src/related.ts:353](../../packages/store/src/related.ts#L353) `firstRelatedEach` | `Calculations.statement` (353); `SQLite.all` (353) | RELATED |
| [packages/store/src/related.ts:332](../../packages/store/src/related.ts#L332) `firstRelatedEach/keysOf` | `keyValue` (332) | RELATED |
| [packages/store/src/related.ts:319](../../packages/store/src/related.ts#L319) `firstRelatedEach/oneByOne` | `relatedRows` (319) | RELATED |
| [packages/store/src/related.ts:139](../../packages/store/src/related.ts#L139) `keyValue` | `Calculations.value` (139) | RELATED |
| [packages/store/src/related.ts:256](../../packages/store/src/related.ts#L256) `relatedIdList` | `Calculations.relatedIds` (256); `Calculations.statement` (261); `SQLite.iterate` (261) | RELATED |
| [packages/store/src/related.ts:299](../../packages/store/src/related.ts#L299) `relatedKeys` | `keyValue` (299) | RELATED |
| [packages/store/src/related.ts:198](../../packages/store/src/related.ts#L198) `relatedRows` | `Calculations.relatedIds` (198); `rowsById` (199); `Calculations.statement` (214, 218, 228); `SQLite.get` (214); `SQLite.all` (218); `SQLite.iterate` (228) | RELATED |
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
| [packages/store/src/store.ts:5704](../../packages/store/src/store.ts#L5704) `Store/accountIdentityId` | `SQLite.get` (5704, 5710); `SQLite.prepare` (5704, 5709, 5710); `Store.sql` (5704, 5709, 5710) | CORE |
| [packages/store/src/store.ts:5698](../../packages/store/src/store.ts#L5698) `Store/accountIdentityIdIfSet` | `SQLite.get` (5698); `SQLite.prepare` (5698); `Store.sql` (5698) | CORE |
| [packages/store/src/store.ts:5660](../../packages/store/src/store.ts#L5660) `Store/accountInactive` | `SQLite.get` (5660); `SQLite.prepare` (5660); `Store.sql` (5660) | CORE |
| [packages/store/src/store.ts:5857](../../packages/store/src/store.ts#L5857) `Store/accountLocalOnly` | `SQLite.get` (5857); `SQLite.prepare` (5857); `Store.sql` (5857) | CORE |
| [packages/store/src/store.ts:6726](../../packages/store/src/store.ts#L6726) `Store/accountPrivilegeSet` | `SQLite.get` (6726); `SQLite.prepare` (6726); `Store.sql` (6726) | CORE |
| [packages/store/src/store.ts:5862](../../packages/store/src/store.ts#L5862) `Store/accountRequires2fa` | `SQLite.get` (5862); `SQLite.prepare` (5862); `Store.sql` (5862) | CORE |
| [packages/store/src/store.ts:4008](../../packages/store/src/store.ts#L4008) `Store/accounts` | `SQLite.all` (4008); `SQLite.prepare` (4008); `Store.sql` (4008) | CORE |
| [packages/store/src/store.ts:4004](../../packages/store/src/store.ts#L4004) `Store/accountsSharingLockout` | `SQLite.all` (4004); `SQLite.prepare` (4004); `Store.sql` (4004) | CORE |
| [packages/store/src/store.ts:6082](../../packages/store/src/store.ts#L6082) `Store/accountUsage` | `SQLite.get` (6082); `SQLite.prepare` (6082, 6083); `Store.sql` (6082, 6083); `SQLite.all` (6083); `Store.auditLog` (6099) | CORE |
| [packages/store/src/store.ts:8963](../../packages/store/src/store.ts#L8963) `Store/addContainer` | `SQLite.all` (8963); `SQLite.prepare` (8963, 8968, 8982, 8986, 8987); `Store.sql` (8963, 8968, 8982, 8984, 8986, 8987, 8989, 8992); `SQLite.get` (8973); `Store.containerRange` (8975) | CORE |
| [packages/store/src/store.ts:9009](../../packages/store/src/store.ts#L9009) `Store/addExternalContainer` | `SQLite.prepare` (9009); `Store.sql` (9009) | CORE |
| [packages/store/src/store.ts:9496](../../packages/store/src/store.ts#L9496) `Store/addFieldIndex` | `Store.sql` (9496) | CORE |
| [packages/store/src/store.ts:7608](../../packages/store/src/store.ts#L7608) `Store/addImage` | `Store.sql` (7608, 7609); `SQLite.prepare` (7609) | CORE |
| [packages/store/src/store.ts:6776](../../packages/store/src/store.ts#L6776) `Store/addProvisionedAccount` | `SQLite.get` (6776); `SQLite.prepare` (6776, 6780); `Store.sql` (6776, 6780) | CORE |
| [packages/store/src/store.ts:8068](../../packages/store/src/store.ts#L8068) `Store/addRelated` | `relatedRows` (8068); `rowsById` (8103); `firstRelatedEach` (8129) | CORE |
| [packages/store/src/store.ts:8056](../../packages/store/src/store.ts#L8056) `Store/addRelated/summaries` | `Calculations.summary` (8056) | CORE |
| [packages/store/src/store.ts:4026](../../packages/store/src/store.ts#L4026) `Store/agentNeedsApproval` | `SQLite.get` (4026); `SQLite.prepare` (4026); `Store.sql` (4026) | CORE |
| [packages/store/src/store.ts:7003](../../packages/store/src/store.ts#L7003) `Store/allowedIds` | `SQLite.iterate` (7003); `SQLite.prepare` (7003); `Store.sql` (7003) | CORE |
| [packages/store/src/store.ts:6139](../../packages/store/src/store.ts#L6139) `Store/apiToken` | `SQLite.get` (6139); `SQLite.prepare` (6139, 6157); `Store.sql` (6139, 6157) | CORE |
| [packages/store/src/store.ts:6115](../../packages/store/src/store.ts#L6115) `Store/apiTokens` | `SQLite.all` (6115); `SQLite.prepare` (6115); `Store.sql` (6115) | CORE |
| [packages/store/src/store.ts:4437](../../packages/store/src/store.ts#L4437) `Store/appendSecurityEvent` | `Store.sql` (4437) | CORE |
| [packages/store/src/store.ts:3466](../../packages/store/src/store.ts#L3466) `Store/appendSecurityRow` | `Store.sql` (3466) | CORE |
| [packages/store/src/store.ts:5480](../../packages/store/src/store.ts#L5480) `Store/applyAccountImport` | `Store.sql` (5480, 5488, 5517); `SQLite.get` (5488); `SQLite.prepare` (5488, 5517) | CORE |
| [packages/store/src/store.ts:2733](../../packages/store/src/store.ts#L2733) `Store/applyDesign` | `Store.sql` (2733, 2734, 2754, 2757, 2762, 2778, 2781, 2781); `SQLite.prepare` (2757, 2762) | CORE |
| [packages/store/src/store.ts:4278](../../packages/store/src/store.ts#L4278) `Store/approvePending` | `SQLite.get` (4278); `SQLite.prepare` (4278, 4290); `Store.sql` (4278, 4290) | CORE |
| [packages/store/src/store.ts:3257](../../packages/store/src/store.ts#L3257) `Store/audit/write` | `Store.sql` (3257) | CORE |
| [packages/store/src/store.ts:2845](../../packages/store/src/store.ts#L2845) `Store/auditLog` | `SQLite.all` (2845); `SQLite.prepare` (2845); `Store.sql` (2845) | CORE |
| [packages/store/src/store.ts:2266](../../packages/store/src/store.ts#L2266) `Store/backup` | `Store.sql` (2266) | CORE |
| [packages/store/src/store.ts:4032](../../packages/store/src/store.ts#L4032) `Store/blankPasswordAccounts` | `SQLite.all` (4032); `SQLite.prepare` (4032); `Store.sql` (4032) | CORE |
| [packages/store/src/store.ts:5408](../../packages/store/src/store.ts#L5408) `Store/canonicalAccount` | `SQLite.all` (5408); `SQLite.prepare` (5408); `Store.sql` (5408) | CORE |
| [packages/store/src/store.ts:10083](../../packages/store/src/store.ts#L10083) `Store/canView` | `Store.canView` (10083); `Store.row` (10084) | GATED-STORE |
| [packages/store/src/store.ts:10065](../../packages/store/src/store.ts#L10065) `Store/canViewRecord` | `SQLite.get` (10065); `SQLite.prepare` (10065); `Store.sql` (10065) | GATED-STORE |
| [packages/store/src/store.ts:11204](../../packages/store/src/store.ts#L11204) `Store/cascadeDelete` | `relatedRows` (11204) | CORE |
| [packages/store/src/store.ts:2566](../../packages/store/src/store.ts#L2566) `Store/changeOne` | `Store.sql` (2566, 2568) | CORE |
| [packages/store/src/store.ts:2569](../../packages/store/src/store.ts#L2569) `Store/changeOne/read` | `SQLite.get` (2569); `SQLite.prepare` (2569); `Store.sql` (2569) | CORE |
| [packages/store/src/store.ts:9353](../../packages/store/src/store.ts#L9353) `Store/checkContainerWrite` | `Store.row` (9353) | CORE |
| [packages/store/src/store.ts:10817](../../packages/store/src/store.ts#L10817) `Store/checkEditable` | `Store.row` (10817) | CORE |
| [packages/store/src/store.ts:1788](../../packages/store/src/store.ts#L1788) `Store/checkpoint` | `SQLite.get` (1788); `SQLite.prepare` (1788); `Store.sql` (1788) | CORE |
| [packages/store/src/store.ts:4177](../../packages/store/src/store.ts#L4177) `Store/checkProposedWrite` | `Store.row` (4177); `relatedRows` (4191) | CORE |
| [packages/store/src/store.ts:6762](../../packages/store/src/store.ts#L6762) `Store/clearAccountPrivilegeSet` | `SQLite.prepare` (6762); `Store.sql` (6762) | CORE |
| [packages/store/src/store.ts:1810](../../packages/store/src/store.ts#L1810) `Store/close` | `Store.sql` (1810) | CORE |
| [packages/store/src/store.ts:9312](../../packages/store/src/store.ts#L9312) `Store/compactFile` | `Store.sql` (9312, 9313, 9315) | CORE |
| [packages/store/src/store.ts:9733](../../packages/store/src/store.ts#L9733) `Store/computedRows` | `Store.sql` (9733, 9736, 9737, 9738, 9740, 9750, 9751, 9752, 9755); `SQLite.prepare` (9736, 9738, 9740, 9750); `SQLite.iterate` (9740); `Calculations.globalValue` (9743); `Calculations.unstoredValue` (9744); `Calculations.related` (9747); `SQLite.all` (9750) | CORE |
| [packages/store/src/store.ts:11331](../../packages/store/src/store.ts#L11331) `Store/computeValuesCurrent` | `Store.computeValues` (11331); `Store.sql` (11337, 11341); `SQLite.all` (11341); `SQLite.prepare` (11341) | GATED-STORE |
| [packages/store/src/store.ts:6184](../../packages/store/src/store.ts#L6184) `Store/confirmTotp` | `SQLite.get` (6184); `SQLite.prepare` (6184, 6186); `Store.sql` (6184, 6186) | CORE |
| [packages/store/src/store.ts:1418](../../packages/store/src/store.ts#L1418) `Store/constructor` | `Store.sql` (1418, 1420, 1422, 1423, 1427, 1431, 1432, 1441, 1449, 1465, 1470, 1475, 1476, 1480, 1481, 1482, 1489, 1493, 1497, 1498, 1499, 1501, 1511, 1512, 1516, 1519, 1520, 1522, 1523, 1526, 1527, 1531, 1532, 1536, 1537, 1540, 1543, 1544, 1546, 1549, 1550, 1554, 1555, 1559, 1560, 1564, 1565, 1566, 1569, 1570, 1573, 1574, 1576, 1576, 1577, 1577, 1578, 1582, 1584, 1588, 1590, 1593, 1594, 1595, 1598, 1599, 1601, 1603, 1604, 1608, 1609, 1611, 1623, 1625, 1626, 1627, 1627, 1631, 1632); `SQLite.get` (1422, 1441); `SQLite.prepare` (1422, 1441, 1449, 1501, 1519, 1520, 1523, 1526, 1531, 1536, 1543, 1549, 1554, 1559, 1569, 1573, 1576, 1577, 1598, 1603, 1608); `SQLite.all` (1519, 1526, 1531, 1536, 1543, 1549, 1554, 1559, 1569, 1573, 1576, 1577, 1598, 1603, 1608) | CORE |
| [packages/store/src/store.ts:6542](../../packages/store/src/store.ts#L6542) `Store/consumeRecoveryCode` | `SQLite.prepare` (6542); `Store.sql` (6542) | CORE |
| [packages/store/src/store.ts:8887](../../packages/store/src/store.ts#L8887) `Store/container` | `SQLite.get` (8887); `SQLite.prepare` (8887, 8896); `Store.sql` (8887, 8896); `SQLite.all` (8896) | CORE |
| [packages/store/src/store.ts:9321](../../packages/store/src/store.ts#L9321) `Store/containerId` | `Store.containerId` (9321); `Store.row` (9322) | CORE |
| [packages/store/src/store.ts:8904](../../packages/store/src/store.ts#L8904) `Store/containerInfo` | `SQLite.get` (8904); `SQLite.prepare` (8904); `Store.sql` (8904) | CORE |
| [packages/store/src/store.ts:8868](../../packages/store/src/store.ts#L8868) `Store/containerIntact` | `SQLite.get` (8868); `SQLite.prepare` (8868); `Store.sql` (8868) | CORE |
| [packages/store/src/store.ts:8807](../../packages/store/src/store.ts#L8807) `Store/containerIntegrityReport` | `SQLite.all` (8807); `SQLite.prepare` (8807, 8818); `Store.sql` (8807, 8818); `SQLite.get` (8818) | CORE |
| [packages/store/src/store.ts:8882](../../packages/store/src/store.ts#L8882) `Store/containerMeta` | `SQLite.get` (8882); `SQLite.prepare` (8882); `Store.sql` (8882) | CORE |
| [packages/store/src/store.ts:8938](../../packages/store/src/store.ts#L8938) `Store/containerRange` | `SQLite.all` (8938); `SQLite.prepare` (8938, 8945); `Store.sql` (8938, 8945); `SQLite.get` (8945) | CORE |
| [packages/store/src/store.ts:8709](../../packages/store/src/store.ts#L8709) `Store/containerReferences` | `SQLite.all` (8709, 8728, 8730, 8736, 8749, 8760, 8774); `SQLite.prepare` (8709, 8728, 8730, 8736, 8749, 8760, 8772, 8774); `Store.sql` (8709, 8728, 8730, 8736, 8749, 8760, 8772, 8774); `SQLite.get` (8772); `Store.row` (8783) | CORE |
| [packages/store/src/store.ts:11310](../../packages/store/src/store.ts#L11310) `Store/countIds` | `Store.countIds` (11310); `SQLite.get` (11315); `SQLite.prepare` (11315); `Store.sql` (11315) | GATED-STORE |
| [packages/store/src/store.ts:10114](../../packages/store/src/store.ts#L10114) `Store/create` | `SQLite.get` (10114); `SQLite.prepare` (10114, 10127); `Store.sql` (10114, 10127) | CORE |
| [packages/store/src/store.ts:4409](../../packages/store/src/store.ts#L4409) `Store/createAccountOnly` | `SQLite.get` (4409); `SQLite.prepare` (4409, 4413, 4419, 4424, 4429); `Store.sql` (4409, 4413, 4419, 4424, 4429) | CORE |
| [packages/store/src/store.ts:5915](../../packages/store/src/store.ts#L5915) `Store/createApiToken` | `SQLite.get` (5915, 5943); `SQLite.prepare` (5915, 5942, 5943, 5953); `Store.sql` (5915, 5942, 5943, 5953) | CORE |
| [packages/store/src/store.ts:5421](../../packages/store/src/store.ts#L5421) `Store/createLocalAccount` | `SQLite.prepare` (5421); `Store.sql` (5421) | CORE |
| [packages/store/src/store.ts:3998](../../packages/store/src/store.ts#L3998) `Store/credentialIdentity` | `SQLite.get` (3998); `SQLite.prepare` (3998); `Store.sql` (3998) | CORE |
| [packages/store/src/store.ts:5836](../../packages/store/src/store.ts#L5836) `Store/credentialStamp` | `SQLite.get` (5836); `SQLite.prepare` (5836); `Store.sql` (5836) | CORE |
| [packages/store/src/store.ts:7441](../../packages/store/src/store.ts#L7441) `Store/crossFileBusy` | `Store.sql` (7441) | AUTH |
| [packages/store/src/store.ts:7413](../../packages/store/src/store.ts#L7413) `Store/crossFileHash` | `SQLite.get` (7413); `SQLite.prepare` (7413); `Store.sql` (7413) | AUTH |
| [packages/store/src/store.ts:2356](../../packages/store/src/store.ts#L2356) `Store/dataVersion` | `SQLite.get` (2356); `SQLite.prepare` (2356); `Store.sql` (2356) | CORE |
| [packages/store/src/store.ts:11878](../../packages/store/src/store.ts#L11878) `Store/decimalViewSql` | `SQLite.all` (11878); `SQLite.prepare` (11878) | CORE |
| [packages/store/src/store.ts:10860](../../packages/store/src/store.ts#L10860) `Store/delete` | `Store.row` (10860) | CORE |
| [packages/store/src/store.ts:10868](../../packages/store/src/store.ts#L10868) `Store/delete/run` | `SQLite.get` (10868); `SQLite.prepare` (10868, 10873); `Store.sql` (10868, 10873) | CORE |
| [packages/store/src/store.ts:5575](../../packages/store/src/store.ts#L5575) `Store/deleteAccount` | `SQLite.prepare` (5575, 5579, 5580, 5581, 5582, 5583, 5584, 5585, 5586, 5593, 5595, 5597, 5599, 5603); `Store.sql` (5575, 5579, 5580, 5581, 5582, 5583, 5584, 5585, 5586, 5593, 5595, 5597, 5599, 5603) | CORE |
| [packages/store/src/store.ts:10944](../../packages/store/src/store.ts#L10944) `Store/deleteBeingUndone` | `SQLite.all` (10944); `SQLite.prepare` (10944); `Store.sql` (10944) | CORE |
| [packages/store/src/store.ts:3634](../../packages/store/src/store.ts#L3634) `Store/deletedRows` | `SQLite.get` (3634); `SQLite.prepare` (3634, 3636, 3636); `Store.sql` (3634, 3636, 3636); `SQLite.all` (3636, 3636) | CORE |
| [packages/store/src/store.ts:10956](../../packages/store/src/store.ts#L10956) `Store/deleteEndingTheLifeAt` | `SQLite.get` (10956); `SQLite.prepare` (10956); `Store.sql` (10956) | CORE |
| [packages/store/src/store.ts:6627](../../packages/store/src/store.ts#L6627) `Store/deletePrivilegeSet` | `SQLite.prepare` (6627); `Store.sql` (6627) | CORE |
| [packages/store/src/store.ts:4547](../../packages/store/src/store.ts#L4547) `Store/deleteScriptTest` | `SQLite.prepare` (4547); `Store.sql` (4547) | CORE |
| [packages/store/src/store.ts:10845](../../packages/store/src/store.ts#L10845) `Store/deleteVisibility` | `Store.canViewRecord` (10845) | CORE |
| [packages/store/src/store.ts:7550](../../packages/store/src/store.ts#L7550) `Store/design` | `SQLite.get` (7550) | CORE |
| [packages/store/src/store.ts:3744](../../packages/store/src/store.ts#L3744) `Store/designEffect` | `Store.sql` (3744, 3745, 3751, 3752, 3755, 3761, 3766, 3769, 3775, 3786, 3787, 3789, 3790, 3803, 3804, 3807, 3809, 3815, 3816, 3817, 3823, 3825, 3829, 3832, 3833, 3835, 3838, 3844, 3846, 3853, 3854, 3856, 3857, 3858, 3859, 3866, 3867, 3869, 3869, 3871, 3872, 3873, 3877, 3881, 3883, 3921, 3923, 3925); `SQLite.prepare` (3755, 3786, 3787, 3803, 3804, 3815, 3816, 3823, 3825, 3829, 3833, 3844, 3846, 3859, 3866, 3867, 3869, 3871, 3873, 3877, 3881); `SQLite.get` (3786, 3803, 3815, 3816, 3829, 3833, 3869, 3877); `SQLite.all` (3866, 3867); `SQLite.iterate` (3871) | CORE |
| [packages/store/src/store.ts:3737](../../packages/store/src/store.ts#L3737) `Store/designEffect/renameExcluded` | `SQLite.prepare` (3737); `Store.sql` (3737) | CORE |
| [packages/store/src/store.ts:3721](../../packages/store/src/store.ts#L3721) `Store/designEffect/renameKey` | `SQLite.prepare` (3721); `Store.sql` (3721) | CORE |
| [packages/store/src/store.ts:3675](../../packages/store/src/store.ts#L3675) `Store/designHistory` | `SQLite.all` (3675); `SQLite.prepare` (3675); `Store.sql` (3675) | CORE |
| [packages/store/src/store.ts:6205](../../packages/store/src/store.ts#L6205) `Store/disableTotp` | `SQLite.prepare` (6205); `Store.sql` (6205) | CORE |
| [packages/store/src/store.ts:3933](../../packages/store/src/store.ts#L3933) `Store/dropColumnIndexes` | `SQLite.all` (3933, 3935); `SQLite.prepare` (3933, 3935); `Store.sql` (3933, 3935, 3936) | CORE |
| [packages/store/src/store.ts:9508](../../packages/store/src/store.ts#L9508) `Store/dropFieldIndex` | `SQLite.get` (9508); `SQLite.prepare` (9508); `Store.sql` (9508, 9509) | CORE |
| [packages/store/src/store.ts:10153](../../packages/store/src/store.ts#L10153) `Store/duplicate` | `Store.row` (10153); `SQLite.prepare` (10171); `Store.sql` (10171) | CORE |
| [packages/store/src/store.ts:9125](../../packages/store/src/store.ts#L9125) `Store/embeddedContainerCount` | `SQLite.prepare` (9125); `Store.sql` (9125); `SQLite.get` (9126) | CORE |
| [packages/store/src/store.ts:9111](../../packages/store/src/store.ts#L9111) `Store/embeddedContainers` | `SQLite.prepare` (9111, 9112); `Store.sql` (9111, 9112); `SQLite.all` (9112); `SQLite.get` (9116) | CORE |
| [packages/store/src/store.ts:3660](../../packages/store/src/store.ts#L3660) `Store/emptyDeleted` | `Store.sql` (3660, 3663, 3664, 3666, 3668); `SQLite.prepare` (3664) | CORE |
| [packages/store/src/store.ts:2232](../../packages/store/src/store.ts#L2232) `Store/endTransaction` | `Store.sql` (2232, 2235, 2235) | CORE |
| [packages/store/src/store.ts:6173](../../packages/store/src/store.ts#L6173) `Store/enrollTotp` | `SQLite.prepare` (6173); `Store.sql` (6173) | CORE |
| [packages/store/src/store.ts:3629](../../packages/store/src/store.ts#L3629) `Store/ensureDeleted` | `Store.sql` (3629) | CORE |
| [packages/store/src/store.ts:1642](../../packages/store/src/store.ts#L1642) `Store/ensureNativeIds` | `SQLite.all` (1642, 1654); `SQLite.prepare` (1642, 1645, 1653, 1654); `Store.sql` (1642, 1645, 1648, 1652, 1653, 1654, 1657, 1659) | CORE |
| [packages/store/src/store.ts:2478](../../packages/store/src/store.ts#L2478) `Store/ensureRecordIdHighWater` | `Store.sql` (2478, 2479, 2481, 2483, 2485) | CORE |
| [packages/store/src/store.ts:2497](../../packages/store/src/store.ts#L2497) `Store/ensureRecordIdMarks` | `SQLite.all` (2497, 2500, 2503, 2512); `SQLite.prepare` (2497, 2500, 2503, 2506, 2512, 2515); `Store.sql` (2497, 2500, 2503, 2506, 2512, 2515, 2519, 2520) | CORE |
| [packages/store/src/store.ts:10494](../../packages/store/src/store.ts#L10494) `Store/evaluateCurrent` | `Store.row` (10494, 10494, 10495, 10495); `Calculations.context` (10500); `Store.get` (10501, 10503) | GATED-STORE |
| [packages/store/src/store.ts:10535](../../packages/store/src/store.ts#L10535) `Store/evaluateEachCurrent` | `Store.row` (10535, 10535, 10540); `Calculations.context` (10541); `Store.get` (10543) | GATED-STORE |
| [packages/store/src/store.ts:10597](../../packages/store/src/store.ts#L10597) `Store/evaluateRowsCurrent` | `Store.row` (10597, 10597, 10598, 10598) | GATED-STORE |
| [packages/store/src/store.ts:10576](../../packages/store/src/store.ts#L10576) `Store/evaluateRowsCurrent/each` | `Calculations.context` (10576); `Store.get` (10578) | GATED-STORE |
| [packages/store/src/store.ts:10612](../../packages/store/src/store.ts#L10612) `Store/evaluateRowsCurrent/found/[Symbol.iterator]` | `rowsById` (10612) | GATED-STORE |
| [packages/store/src/store.ts:10634](../../packages/store/src/store.ts#L10634) `Store/evaluateRowsCurrent/key` | `Calculations.context` (10634) | GATED-STORE |
| [packages/store/src/store.ts:4322](../../packages/store/src/store.ts#L4322) `Store/externalAccount` | `SQLite.all` (4322); `SQLite.prepare` (4322); `Store.sql` (4322) | CORE |
| [packages/store/src/store.ts:8630](../../packages/store/src/store.ts#L8630) `Store/externalContainerCheck` | `SQLite.all` (8630); `SQLite.prepare` (8630); `Store.sql` (8630) | CORE |
| [packages/store/src/store.ts:8637](../../packages/store/src/store.ts#L8637) `Store/externalContainerCount` | `SQLite.get` (8637); `SQLite.prepare` (8637); `Store.sql` (8637) | CORE |
| [packages/store/src/store.ts:8646](../../packages/store/src/store.ts#L8646) `Store/externalContainerReport` | `SQLite.all` (8646, 8659); `SQLite.prepare` (8646, 8659); `Store.sql` (8646, 8659) | CORE |
| [packages/store/src/store.ts:5686](../../packages/store/src/store.ts#L5686) `Store/externalIdentityId` | `SQLite.get` (5686, 5693); `SQLite.prepare` (5686, 5692, 5693); `Store.sql` (5686, 5692, 5693) | CORE |
| [packages/store/src/store.ts:8878](../../packages/store/src/store.ts#L8878) `Store/externalOf` | `SQLite.get` (8878); `SQLite.prepare` (8878); `Store.sql` (8878) | CORE |
| [packages/store/src/store.ts:3410](../../packages/store/src/store.ts#L3410) `Store/failureAuditRoom` | `SQLite.get` (3410); `SQLite.prepare` (3410); `Store.sql` (3410) | CORE |
| [packages/store/src/store.ts:8277](../../packages/store/src/store.ts#L8277) `Store/fieldIndexCurrent` | `SQLite.iterate` (8277); `SQLite.prepare` (8277, 8282); `Store.sql` (8277, 8282); `SQLite.all` (8282) | GATED-STORE |
| [packages/store/src/store.ts:9548](../../packages/store/src/store.ts#L9548) `Store/find` | `Store.find` (9548) | GATED-STORE |
| [packages/store/src/store.ts:9920](../../packages/store/src/store.ts#L9920) `Store/findCandidates` | `Store.query` (9920) | CORE |
| [packages/store/src/store.ts:9559](../../packages/store/src/store.ts#L9559) `Store/findHere` | `Store.query` (9559, 9564, 9566, 9580, 9582, 9593); `Store.recordCount` (9577); `SQLite.get` (9578, 9582); `SQLite.prepare` (9578, 9582, 9588, 9595, 9604); `Store.sql` (9578, 9582, 9588, 9595, 9604); `SQLite.all` (9588, 9595, 9604) | GATED-STORE |
| [packages/store/src/store.ts:9599](../../packages/store/src/store.ts#L9599) `Store/findHere/[Symbol.iterator]` | `SQLite.iterate` (9599); `SQLite.prepare` (9599); `Store.sql` (9599) | GATED-STORE |
| [packages/store/src/store.ts:11443](../../packages/store/src/store.ts#L11443) `Store/findIdsCurrent` | `Store.findIds` (11443) | GATED-STORE |
| [packages/store/src/store.ts:11378](../../packages/store/src/store.ts#L11378) `Store/findIdsCurrentProgress` | `Store.findIdsProgress` (11378); `Store.query` (11380, 11382, 11395, 11397); `Store.recordCount` (11387, 11415); `SQLite.iterate` (11412); `SQLite.prepare` (11412, 11420, 11421); `Store.sql` (11412, 11420, 11421); `SQLite.get` (11424); `SQLite.all` (11430) | GATED-STORE |
| [packages/store/src/store.ts:11449](../../packages/store/src/store.ts#L11449) `Store/findIdsHere` | `Store.query` (11449, 11455, 11457); `SQLite.iterate` (11468); `SQLite.prepare` (11468); `Store.sql` (11468) | GATED-STORE |
| [packages/store/src/store.ts:9864](../../packages/store/src/store.ts#L9864) `Store/findSource` | `Store.query` (9864); `SQLite.all` (9873, 9890); `SQLite.prepare` (9873, 9881, 9889); `Store.sql` (9873, 9878, 9881, 9886, 9889, 9903, 9905); `Calculations.globalValue` (9895); `Calculations.unstoredValue` (9896); `Calculations.related` (9900) | CORE |
| [packages/store/src/store.ts:3522](../../packages/store/src/store.ts#L3522) `Store/flushDeferredSecurity` | `Store.sql` (3522) | CORE |
| [packages/store/src/store.ts:5542](../../packages/store/src/store.ts#L5542) `Store/forgetStandIns` | `SQLite.prepare` (5542); `Store.sql` (5542) | CORE |
| [packages/store/src/store.ts:10911](../../packages/store/src/store.ts#L10911) `Store/forgetStandInValues` | `Store.sql` (10911, 10932); `SQLite.prepare` (10932) | CORE |
| [packages/store/src/store.ts:8158](../../packages/store/src/store.ts#L8158) `Store/foundSetPage` | `rowsById` (8158) | CORE |
| [packages/store/src/store.ts:8174](../../packages/store/src/store.ts#L8174) `Store/foundSetRowsCurrent` | `Store.viewableIds` (8174); `Store.row` (8190) | GATED-STORE |
| [packages/store/src/store.ts:4240](../../packages/store/src/store.ts#L4240) `Store/gateAgentWrite` | `SQLite.get` (4240); `SQLite.prepare` (4240, 4242); `Store.sql` (4240, 4242) | CORE |
| [packages/store/src/store.ts:6480](../../packages/store/src/store.ts#L6480) `Store/generateRecoveryCodes` | `SQLite.prepare` (6480, 6483); `Store.sql` (6480, 6483) | CORE |
| [packages/store/src/store.ts:9993](../../packages/store/src/store.ts#L9993) `Store/getCurrent` | `Store.get` (9993); `Store.row` (9994, 9994, 10008); `SQLite.all` (10011); `SQLite.prepare` (10011); `Store.sql` (10011) | GATED-STORE |
| [packages/store/src/store.ts:10031](../../packages/store/src/store.ts#L10031) `Store/getManyCurrent` | `Store.getMany` (10031); `SQLite.get` (10049); `SQLite.prepare` (10049); `Store.sql` (10049) | GATED-STORE |
| [packages/store/src/store.ts:10042](../../packages/store/src/store.ts#L10042) `Store/getManyCurrent/[Symbol.iterator]` | `rowsById` (10042) | GATED-STORE |
| [packages/store/src/store.ts:1689](../../packages/store/src/store.ts#L1689) `Store/grantFullAccessClients` | `SQLite.prepare` (1689); `Store.sql` (1689) | CORE |
| [packages/store/src/store.ts:11485](../../packages/store/src/store.ts#L11485) `Store/groupSummariesCurrent` | `Store.groupSummaries` (11485); `Store.viewableIds` (11490); `Calculations.collect` (11506); `rowsById` (11506, 11556); `Calculations.collector` (11528) | GATED-STORE |
| [packages/store/src/store.ts:11554](../../packages/store/src/store.ts#L11554) `Store/groupSummariesCurrent/flush` | `Calculations.collector` (11554) | GATED-STORE |
| [packages/store/src/store.ts:11518](../../packages/store/src/store.ts#L11518) `Store/groupSummariesCurrent/key` | `Calculations.value` (11518); `Calculations.related` (11520) | GATED-STORE |
| [packages/store/src/store.ts:1716](../../packages/store/src/store.ts#L1716) `Store/hasOwnPassword` | `SQLite.get` (1716); `SQLite.prepare` (1716); `Store.sql` (1716) | CORE |
| [packages/store/src/store.ts:6335](../../packages/store/src/store.ts#L6335) `Store/hasPasskey` | `SQLite.get` (6335); `SQLite.prepare` (6335); `Store.sql` (6335) | CORE |
| [packages/store/src/store.ts:1697](../../packages/store/src/store.ts#L1697) `Store/hasProvingPassword` | `SQLite.get` (1697); `SQLite.prepare` (1697); `Store.sql` (1697) | CORE |
| [packages/store/src/store.ts:9462](../../packages/store/src/store.ts#L9462) `Store/hasTable` | `SQLite.get` (9462); `SQLite.prepare` (9462); `Store.sql` (9462) | CORE |
| [packages/store/src/store.ts:6194](../../packages/store/src/store.ts#L6194) `Store/hasTotp` | `SQLite.get` (6194); `SQLite.prepare` (6194); `Store.sql` (6194) | CORE |
| [packages/store/src/store.ts:5665](../../packages/store/src/store.ts#L5665) `Store/identityAllowed` | `SQLite.get` (5665, 5671, 5677); `SQLite.prepare` (5665, 5671, 5677); `Store.sql` (5665, 5671, 5677) | CORE |
| [packages/store/src/store.ts:7585](../../packages/store/src/store.ts#L7585) `Store/image` | `SQLite.get` (7585); `SQLite.prepare` (7585); `Store.sql` (7585) | CORE |
| [packages/store/src/store.ts:7595](../../packages/store/src/store.ts#L7595) `Store/images` | `SQLite.all` (7595); `SQLite.prepare` (7595); `Store.sql` (7595) | CORE |
| [packages/store/src/store.ts:5385](../../packages/store/src/store.ts#L5385) `Store/importAccounts` | `SQLite.all` (5385); `SQLite.prepare` (5385); `Store.sql` (5385) | CORE |
| [packages/store/src/store.ts:2031](../../packages/store/src/store.ts#L2031) `Store/independentWindowWrite` | `SQLite.get` (2031); `SQLite.prepare` (2031, 2039, 2100); `Store.sql` (2031, 2039, 2049, 2078, 2095, 2100, 2103); `SQLite.all` (2039); `Store.row` (2098) | CORE |
| [packages/store/src/store.ts:9474](../../packages/store/src/store.ts#L9474) `Store/indexedFields` | `SQLite.all` (9474, 9475); `SQLite.prepare` (9474, 9475); `Store.sql` (9474, 9475) | CORE |
| [packages/store/src/store.ts:11911](../../packages/store/src/store.ts#L11911) `Store/internalRoots` | `SQLite.get` (11911); `SQLite.prepare` (11911, 11913); `SQLite.all` (11913) | CORE |
| [packages/store/src/store.ts:4020](../../packages/store/src/store.ts#L4020) `Store/isAgent` | `SQLite.get` (4020); `SQLite.prepare` (4020); `Store.sql` (4020) | CORE |
| [packages/store/src/store.ts:4128](../../packages/store/src/store.ts#L4128) `Store/isExternal` | `SQLite.get` (4128); `SQLite.prepare` (4128); `Store.sql` (4128) | CORE |
| [packages/store/src/store.ts:6249](../../packages/store/src/store.ts#L6249) `Store/issueWebauthnChallenge` | `SQLite.prepare` (6249, 6251, 6252, 6254); `Store.sql` (6249, 6251, 6252, 6254); `SQLite.get` (6251) | CORE |
| [packages/store/src/store.ts:11772](../../packages/store/src/store.ts#L11772) `Store/iterateCommitted` | `SQLite.iterate` (11772) | CORE |
| [packages/store/src/store.ts:1970](../../packages/store/src/store.ts#L1970) `Store/joinTransaction` | `Store.sql` (1970, 1971, 1973, 1975, 1981, 1984) | CORE |
| [packages/store/src/store.ts:11151](../../packages/store/src/store.ts#L11151) `Store/keyStepWork` | `Store.sql` (11151, 11157, 11161, 11163) | CORE |
| [packages/store/src/store.ts:7401](../../packages/store/src/store.ts#L7401) `Store/knownSharedAccount` | `SQLite.get` (7401); `SQLite.prepare` (7401); `Store.sql` (7401) | CORE |
| [packages/store/src/store.ts:4858](../../packages/store/src/store.ts#L4858) `Store/lastSignIns` | `Store.auditLog` (4858) | CORE |
| [packages/store/src/store.ts:10962](../../packages/store/src/store.ts#L10962) `Store/latestDeleteSeq` | `SQLite.get` (10962); `SQLite.prepare` (10962); `Store.sql` (10962) | CORE |
| [packages/store/src/store.ts:7628](../../packages/store/src/store.ts#L7628) `Store/layout` | `SQLite.get` (7628); `SQLite.prepare` (7628); `Store.sql` (7628) | CORE |
| [packages/store/src/store.ts:3692](../../packages/store/src/store.ts#L3692) `Store/layoutHistory` | `SQLite.all` (3692); `SQLite.prepare` (3692); `Store.sql` (3692) | CORE |
| [packages/store/src/store.ts:7515](../../packages/store/src/store.ts#L7515) `Store/layouts` | `SQLite.all` (7515); `SQLite.prepare` (7515); `Store.sql` (7515) | CORE |
| [packages/store/src/store.ts:5158](../../packages/store/src/store.ts#L5158) `Store/leastPrivilege` | `SQLite.all` (5158); `SQLite.prepare` (5158); `Store.sql` (5158) | CORE |
| [packages/store/src/store.ts:5763](../../packages/store/src/store.ts#L5763) `Store/ledgerRow` | `SQLite.get` (5763, 5764); `SQLite.prepare` (5763, 5764); `Store.sql` (5763, 5764) | AUTH |
| [packages/store/src/store.ts:5775](../../packages/store/src/store.ts#L5775) `Store/ledgerWrite` | `Store.sql` (5775, 5776, 5778, 5780, 5783, 5783) | AUTH |
| [packages/store/src/store.ts:5469](../../packages/store/src/store.ts#L5469) `Store/limitAccountImport` | `SQLite.prepare` (5469, 5470, 5473); `Store.sql` (5469, 5470, 5473); `SQLite.get` (5470) | CORE |
| [packages/store/src/store.ts:3973](../../packages/store/src/store.ts#L3973) `Store/linkIdentity` | `SQLite.get` (3973); `SQLite.prepare` (3973); `Store.sql` (3973) | CORE |
| [packages/store/src/store.ts:3965](../../packages/store/src/store.ts#L3965) `Store/linkPrincipal` | `SQLite.get` (3965); `SQLite.prepare` (3965); `Store.sql` (3965) | CORE |
| [packages/store/src/store.ts:4744](../../packages/store/src/store.ts#L4744) `Store/markPiiField` | `SQLite.prepare` (4744); `Store.sql` (4744) | CORE |
| [packages/store/src/store.ts:8603](../../packages/store/src/store.ts#L8603) `Store/markRepeating` | `SQLite.prepare` (8603); `Store.sql` (8603) | CORE |
| [packages/store/src/store.ts:11703](../../packages/store/src/store.ts#L11703) `Store/matchIds` | `Store.matchIds` (11703); `SQLite.all` (11709); `SQLite.prepare` (11709); `Store.sql` (11709) | CORE |
| [packages/store/src/store.ts:1731](../../packages/store/src/store.ts#L1731) `Store/meta` | `SQLite.get` (1731); `SQLite.prepare` (1731); `Store.sql` (1731) | CORE |
| [packages/store/src/store.ts:1030](../../packages/store/src/store.ts#L1030) `Store/metadataVersions` | `SQLite.get` (1030); `SQLite.prepare` (1030); `Store.sql` (1030) | CORE |
| [packages/store/src/store.ts:9240](../../packages/store/src/store.ts#L9240) `Store/moveContainersIn` | `Store.sql` (9240, 9246, 9248, 9249, 9250, 9251, 9271, 9276, 9276, 9287, 9290, 9293, 9300); `SQLite.prepare` (9248, 9249, 9250, 9251, 9287, 9293); `SQLite.get` (9253, 9287, 9293) | CORE |
| [packages/store/src/store.ts:9162](../../packages/store/src/store.ts#L9162) `Store/moveContainersOut` | `Store.sql` (9162, 9170, 9172, 9174, 9179, 9180, 9200, 9206, 9208, 9210, 9210, 9216, 9216, 9221, 9223, 9225, 9225, 9231); `SQLite.get` (9170); `SQLite.prepare` (9170, 9179, 9180); `Store.container` (9182) | CORE |
| [packages/store/src/store.ts:5339](../../packages/store/src/store.ts#L5339) `Store/mustChangePassword` | `SQLite.get` (5339); `SQLite.prepare` (5339); `Store.sql` (5339) | CORE |
| [packages/store/src/store.ts:1667](../../packages/store/src/store.ts#L1667) `Store/nativeIdGuards` | `Store.sql` (1667, 1668, 1670) | CORE |
| [packages/store/src/store.ts:2533](../../packages/store/src/store.ts#L2533) `Store/nextRecordId` | `SQLite.get` (2533); `SQLite.prepare` (2533); `Store.sql` (2533) | CORE |
| [packages/store/src/store.ts:6069](../../packages/store/src/store.ts#L6069) `Store/objectUseSince` | `SQLite.get` (6069); `SQLite.prepare` (6069); `Store.sql` (6069) | CORE |
| [packages/store/src/store.ts:9434](../../packages/store/src/store.ts#L9434) `Store/orderBy` | `Store.valueListItems` (9434) | CORE |
| [packages/store/src/store.ts:8795](../../packages/store/src/store.ts#L8795) `Store/orphanContainerReport` | `SQLite.all` (8795); `SQLite.prepare` (8795); `Store.sql` (8795) | CORE |
| [packages/store/src/store.ts:6301](../../packages/store/src/store.ts#L6301) `Store/passkeyAllowList` | `SQLite.all` (6301); `SQLite.prepare` (6301); `Store.sql` (6301) | CORE |
| [packages/store/src/store.ts:6340](../../packages/store/src/store.ts#L6340) `Store/passkeyIds` | `SQLite.all` (6340); `SQLite.prepare` (6340); `Store.sql` (6340) | CORE |
| [packages/store/src/store.ts:6328](../../packages/store/src/store.ts#L6328) `Store/passkeys` | `SQLite.all` (6328); `SQLite.prepare` (6328); `Store.sql` (6328) | CORE |
| [packages/store/src/store.ts:5378](../../packages/store/src/store.ts#L5378) `Store/passwordDaysRemaining` | `SQLite.get` (5378); `SQLite.prepare` (5378); `Store.sql` (5378) | CORE |
| [packages/store/src/store.ts:7359](../../packages/store/src/store.ts#L7359) `Store/passwordState` | `SQLite.get` (7359); `SQLite.prepare` (7359); `Store.sql` (7359) | CORE |
| [packages/store/src/store.ts:4264](../../packages/store/src/store.ts#L4264) `Store/pendingChanges` | `SQLite.all` (4264); `SQLite.prepare` (4264); `Store.sql` (4264) | CORE |
| [packages/store/src/store.ts:1749](../../packages/store/src/store.ts#L1749) `Store/persistentData` | `SQLite.get` (1749) | CORE |
| [packages/store/src/store.ts:1758](../../packages/store/src/store.ts#L1758) `Store/persistentDataIds` | `SQLite.all` (1758) | CORE |
| [packages/store/src/store.ts:1739](../../packages/store/src/store.ts#L1739) `Store/persistentTable` | `Store.sql` (1739) | CORE |
| [packages/store/src/store.ts:10802](../../packages/store/src/store.ts#L10802) `Store/portalContainerTarget` | `Store.row` (10802); `relatedIdList` (10804) | CORE |
| [packages/store/src/store.ts:8213](../../packages/store/src/store.ts#L8213) `Store/portalCountsCurrent` | `Store.canView` (8213); `Store.row` (8240) | GATED-STORE |
| [packages/store/src/store.ts:8458](../../packages/store/src/store.ts#L8458) `Store/portalRows` | `relatedRows` (8458); `relatedIdList` (8459); `Store.viewableSet` (8462); `rowsById` (8487, 8525); `Calculations.related` (8501) | CORE |
| [packages/store/src/store.ts:8469](../../packages/store/src/store.ts#L8469) `Store/portalRows/context` | `Calculations.context` (8469) | CORE |
| [packages/store/src/store.ts:8479](../../packages/store/src/store.ts#L8479) `Store/portalRows/valueOf` | `Calculations.value` (8479) | CORE |
| [packages/store/src/store.ts:2911](../../packages/store/src/store.ts#L2911) `Store/prepared` | `SQLite.prepare` (2911); `Store.sql` (2911) | CORE |
| [packages/store/src/store.ts:5451](../../packages/store/src/store.ts#L5451) `Store/previewAccountImport` | `Store.sql` (5451, 5452, 5461) | CORE |
| [packages/store/src/store.ts:7157](../../packages/store/src/store.ts#L7157) `Store/previewRecordRuleCurrent` | `SQLite.get` (7157); `SQLite.prepare` (7157, 7160); `Store.sql` (7157, 7160); `SQLite.all` (7160); `Calculations.context` (7166, 7182) | CORE |
| [packages/store/src/store.ts:9955](../../packages/store/src/store.ts#L9955) `Store/previewRow` | `Store.row` (9955) | CORE |
| [packages/store/src/store.ts:6555](../../packages/store/src/store.ts#L6555) `Store/privilegeSets` | `Store.sql` (6555) | CORE |
| [packages/store/src/store.ts:3149](../../packages/store/src/store.ts#L3149) `Store/pruneAudit` | `Store.sql` (3149, 3152, 3157, 3159, 3167, 3172, 3174); `SQLite.get` (3157, 3170, 3174); `SQLite.prepare` (3157, 3167, 3174) | CORE |
| [packages/store/src/store.ts:8830](../../packages/store/src/store.ts#L8830) `Store/purgeOrphanContainers` | `Store.sql` (8830, 8834, 8843, 8846, 8847, 8852, 8853, 8855, 8855); `Store.orphanContainerReport` (8838); `SQLite.get` (8843); `SQLite.prepare` (8843, 8846, 8847) | CORE |
| [packages/store/src/store.ts:12034](../../packages/store/src/store.ts#L12034) `Store/query` | `SQLite.iterate` (12034) | CORE |
| [packages/store/src/store.ts:12074](../../packages/store/src/store.ts#L12074) `Store/queryWithOriginsCurrent` | `SQLite.iterate` (12074); `SQLite.all` (12083, 12086); `SQLite.prepare` (12083, 12086) | CORE |
| [packages/store/src/store.ts:11823](../../packages/store/src/store.ts#L11823) `Store/readOnlyChecked` | `SQLite.prepare` (11823, 11827, 11836, 11841); `SQLite.all` (11827, 11836, 11841) | CORE |
| [packages/store/src/store.ts:3945](../../packages/store/src/store.ts#L3945) `Store/recompute` | `SQLite.prepare` (3945, 3949); `Store.sql` (3945, 3949); `SQLite.iterate` (3949); `Calculations.computeStoredStyled` (3950); `Calculations.value` (3950) | CORE |
| [packages/store/src/store.ts:2926](../../packages/store/src/store.ts#L2926) `Store/recordAsOf` | `SQLite.get` (2926, 2928); `SQLite.prepare` (2926, 2928, 2930, 2931); `Store.sql` (2926, 2928, 2930, 2931); `SQLite.all` (2930, 2931) | CORE |
| [packages/store/src/store.ts:2620](../../packages/store/src/store.ts#L2620) `Store/recordCount` | `SQLite.get` (2620); `SQLite.prepare` (2620); `Store.sql` (2620) | CORE |
| [packages/store/src/store.ts:1796](../../packages/store/src/store.ts#L1796) `Store/recordedFormat` | `Store.sql` (1796) | CORE |
| [packages/store/src/store.ts:3004](../../packages/store/src/store.ts#L3004) `Store/recordLife` | `SQLite.all` (3004); `SQLite.prepare` (3004); `Store.sql` (3004) | CORE |
| [packages/store/src/store.ts:6000](../../packages/store/src/store.ts#L6000) `Store/recordObjectUse` | `Store.sql` (6000) | CORE |
| [packages/store/src/store.ts:10484](../../packages/store/src/store.ts#L10484) `Store/recordViewable` | `Store.row` (10484) | GATED-STORE |
| [packages/store/src/store.ts:9134](../../packages/store/src/store.ts#L9134) `Store/recoverContainersOut` | `SQLite.prepare` (9134); `Store.sql` (9134); `SQLite.get` (9137) | CORE |
| [packages/store/src/store.ts:1899](../../packages/store/src/store.ts#L1899) `Store/recoverPendingExternalFiles` | `Store.sql` (1899, 1901, 1925, 1927); `SQLite.prepare` (1901); `SQLite.get` (1912) | CORE |
| [packages/store/src/store.ts:6498](../../packages/store/src/store.ts#L6498) `Store/recoveryCodesRemaining` | `SQLite.get` (6498); `SQLite.prepare` (6498); `Store.sql` (6498) | CORE |
| [packages/store/src/store.ts:11863](../../packages/store/src/store.ts#L11863) `Store/refreshDecimalSqlViews` | `SQLite.get` (11863); `SQLite.prepare` (11863) | CORE |
| [packages/store/src/store.ts:4119](../../packages/store/src/store.ts#L4119) `Store/refuseLookalikeAccount` | `SQLite.all` (4119); `SQLite.prepare` (4119); `Store.sql` (4119) | CORE |
| [packages/store/src/store.ts:6364](../../packages/store/src/store.ts#L6364) `Store/registerPasskey` | `SQLite.prepare` (6364); `Store.sql` (6364) | CORE |
| [packages/store/src/store.ts:4300](../../packages/store/src/store.ts#L4300) `Store/rejectPending` | `SQLite.get` (4300); `SQLite.prepare` (4300, 4302); `Store.sql` (4300, 4302) | CORE |
| [packages/store/src/store.ts:9707](../../packages/store/src/store.ts#L9707) `Store/relatedCriteria` | `SQLite.iterate` (9707); `SQLite.prepare` (9707); `Store.sql` (9707) | CORE |
| [packages/store/src/store.ts:9704](../../packages/store/src/store.ts#L9704) `Store/relatedCriteria/matched` | `relatedRows` (9704) | CORE |
| [packages/store/src/store.ts:7968](../../packages/store/src/store.ts#L7968) `Store/relatedValues` | `Calculations.globalValue` (7968); `Calculations.unstoredValue` (7970) | CORE |
| [packages/store/src/store.ts:6377](../../packages/store/src/store.ts#L6377) `Store/removePasskey` | `SQLite.get` (6377); `SQLite.prepare` (6377, 6378); `Store.sql` (6377, 6378) | CORE |
| [packages/store/src/store.ts:9533](../../packages/store/src/store.ts#L9533) `Store/reportFind` | `Store.query` (9533, 9535, 9536); `Store.recordCount` (9538) | CORE |
| [packages/store/src/store.ts:10989](../../packages/store/src/store.ts#L10989) `Store/restoreDeletedRowLocked` | `SQLite.get` (10989, 10994); `SQLite.prepare` (10989, 10990, 10994, 11004); `Store.sql` (10989, 10990, 10994, 11004); `SQLite.all` (10990) | CORE |
| [packages/store/src/store.ts:2962](../../packages/store/src/store.ts#L2962) `Store/restoreRecord` | `Store.recordAsOf` (2962); `SQLite.get` (2966); `SQLite.prepare` (2966, 2971, 2980, 2991); `Store.sql` (2966, 2971, 2980, 2991) | CORE |
| [packages/store/src/store.ts:3020](../../packages/store/src/store.ts#L3020) `Store/revertAuditEntry` | `SQLite.get` (3020); `SQLite.prepare` (3020); `Store.sql` (3020); `Store.canViewRecord` (3022); `Store.auditLog` (3025) | CORE |
| [packages/store/src/store.ts:6125](../../packages/store/src/store.ts#L6125) `Store/revokeApiToken` | `SQLite.prepare` (6125); `Store.sql` (6125) | CORE |
| [packages/store/src/store.ts:5648](../../packages/store/src/store.ts#L5648) `Store/revokeSignInCredentials` | `SQLite.prepare` (5648, 5649, 5650); `Store.sql` (5648, 5649, 5650) | AUTH |
| [packages/store/src/store.ts:9974](../../packages/store/src/store.ts#L9974) `Store/row` | `SQLite.get` (9974) | CORE |
| [packages/store/src/store.ts:11967](../../packages/store/src/store.ts#L11967) `Store/rowsOf` | `SQLite.iterate` (11967, 11976) | CORE |
| [packages/store/src/store.ts:6962](../../packages/store/src/store.ts#L6962) `Store/ruleOutcome` | `Calculations.context` (6962) | CORE |
| [packages/store/src/store.ts:9818](../../packages/store/src/store.ts#L9818) `Store/runningSummaryValues` | `Store.viewableIds` (9818); `rowsById` (9820); `Calculations.value` (9831, 9837); `Calculations.related` (9848) | GATED-STORE |
| [packages/store/src/store.ts:6584](../../packages/store/src/store.ts#L6584) `Store/savePrivilegeSet` | `SQLite.prepare` (6584, 6592); `Store.sql` (6584, 6592) | AUTH |
| [packages/store/src/store.ts:4538](../../packages/store/src/store.ts#L4538) `Store/saveScriptTest` | `SQLite.prepare` (4538); `Store.sql` (4538) | CORE |
| [packages/store/src/store.ts:7122](../../packages/store/src/store.ts#L7122) `Store/scopedTableSql` | `Store.viewableIds` (7122); `SQLite.all` (7125); `SQLite.prepare` (7125); `Store.sql` (7125) | GATED-STORE |
| [packages/store/src/store.ts:3682](../../packages/store/src/store.ts#L3682) `Store/scriptHistory` | `SQLite.all` (3682); `SQLite.prepare` (3682); `Store.sql` (3682) | CORE |
| [packages/store/src/store.ts:1875](../../packages/store/src/store.ts#L1875) `Store/securityChainHeadAudit` | `SQLite.get` (1875); `SQLite.prepare` (1875); `Store.sql` (1875) | CORE |
| [packages/store/src/store.ts:3355](../../packages/store/src/store.ts#L3355) `Store/securityChange` | `Store.sql` (3355, 3357); `SQLite.prepare` (3357) | CORE |
| [packages/store/src/store.ts:2885](../../packages/store/src/store.ts#L2885) `Store/securityEvents` | `Store.auditLog` (2885) | CORE |
| [packages/store/src/store.ts:5849](../../packages/store/src/store.ts#L5849) `Store/securityToken` | `SQLite.get` (5849); `SQLite.prepare` (5849); `Store.sql` (5849) | CORE |
| [packages/store/src/store.ts:11997](../../packages/store/src/store.ts#L11997) `Store/selectHeldCurrent` | `Store.sql` (11997, 11999, 12002); `SQLite.prepare` (11999) | CORE |
| [packages/store/src/store.ts:11295](../../packages/store/src/store.ts#L11295) `Store/selectIdsCurrent` | `Store.selectIds` (11295); `SQLite.all` (11302); `SQLite.prepare` (11302); `Store.sql` (11302) | GATED-STORE |
| [packages/store/src/store.ts:11987](../../packages/store/src/store.ts#L11987) `Store/selectIn` | `Store.select` (11987) | CORE |
| [packages/store/src/store.ts:2286](../../packages/store/src/store.ts#L2286) `Store/selfContainedCopy` | `Store.sql` (2286); `SQLite.all` (2291); `SQLite.prepare` (2291, 2293, 2294, 2295) | CORE |
| [packages/store/src/store.ts:5627](../../packages/store/src/store.ts#L5627) `Store/setAccountActive` | `SQLite.prepare` (5627, 5635, 5636); `Store.sql` (5627, 5635, 5636) | AUTH |
| [packages/store/src/store.ts:5868](../../packages/store/src/store.ts#L5868) `Store/setAccountLocalOnly` | `SQLite.prepare` (5868); `Store.sql` (5868) | CORE |
| [packages/store/src/store.ts:6740](../../packages/store/src/store.ts#L6740) `Store/setAccountPrivilegeSet` | `SQLite.get` (6740); `SQLite.prepare` (6740, 6743, 6747); `Store.sql` (6740, 6743, 6747) | AUTH |
| [packages/store/src/store.ts:5877](../../packages/store/src/store.ts#L5877) `Store/setAccountRequire2fa` | `SQLite.prepare` (5877); `Store.sql` (5877) | CORE |
| [packages/store/src/store.ts:4152](../../packages/store/src/store.ts#L4152) `Store/setAgentAccount` | `SQLite.get` (4152); `SQLite.prepare` (4152, 4158); `Store.sql` (4152, 4158) | CORE |
| [packages/store/src/store.ts:4617](../../packages/store/src/store.ts#L4617) `Store/setAiAllowed` | `SQLite.prepare` (4617); `Store.sql` (4617) | CORE |
| [packages/store/src/store.ts:4702](../../packages/store/src/store.ts#L4702) `Store/setAiPolicy` | `SQLite.prepare` (4702); `Store.sql` (4702) | CORE |
| [packages/store/src/store.ts:7388](../../packages/store/src/store.ts#L7388) `Store/setAllowBlankPasswordFromLan` | `SQLite.prepare` (7388); `Store.sql` (7388) | CORE |
| [packages/store/src/store.ts:3126](../../packages/store/src/store.ts#L3126) `Store/setAuditSettings` | `SQLite.prepare` (3126); `Store.sql` (3126) | CORE |
| [packages/store/src/store.ts:9363](../../packages/store/src/store.ts#L9363) `Store/setContainer` | `Store.sql` (9363); `Store.row` (9369) | CORE |
| [packages/store/src/store.ts:4099](../../packages/store/src/store.ts#L4099) `Store/setExternalAccount` | `SQLite.get` (4099); `SQLite.prepare` (4099, 4104); `Store.sql` (4099, 4104) | CORE |
| [packages/store/src/store.ts:5325](../../packages/store/src/store.ts#L5325) `Store/setMustChangePassword` | `SQLite.prepare` (5325); `Store.sql` (5325) | CORE |
| [packages/store/src/store.ts:4362](../../packages/store/src/store.ts#L4362) `Store/setPasswordOnly` | `SQLite.get` (4362); `SQLite.prepare` (4362, 4368, 4377, 4384, 4385, 4386); `Store.sql` (4362, 4368, 4377, 4384, 4385, 4386) | AUTH |
| [packages/store/src/store.ts:4479](../../packages/store/src/store.ts#L4479) `Store/setPasswordPolicy` | `SQLite.prepare` (4479); `Store.sql` (4479) | CORE |
| [packages/store/src/store.ts:1764](../../packages/store/src/store.ts#L1764) `Store/setPersistentData` | `SQLite.prepare` (1764, 1768); `Store.sql` (1764, 1768) | CORE |
| [packages/store/src/store.ts:4722](../../packages/store/src/store.ts#L4722) `Store/setPiiIsolation` | `SQLite.prepare` (4722); `Store.sql` (4722) | CORE |
| [packages/store/src/store.ts:4515](../../packages/store/src/store.ts#L4515) `Store/setRequireTotpForFullAccess` | `SQLite.prepare` (4515); `Store.sql` (4515) | CORE |
| [packages/store/src/store.ts:4634](../../packages/store/src/store.ts#L4634) `Store/setScriptNetwork` | `SQLite.prepare` (4634); `Store.sql` (4634) | CORE |
| [packages/store/src/store.ts:4691](../../packages/store/src/store.ts#L4691) `Store/setSqlRequiresFmxdbc` | `SQLite.prepare` (4691); `Store.sql` (4691) | CORE |
| [packages/store/src/store.ts:10405](../../packages/store/src/store.ts#L10405) `Store/setStoredCalcValues` | `SQLite.prepare` (10405, 10406); `Store.sql` (10405, 10406); `SQLite.get` (10410) | CORE |
| [packages/store/src/store.ts:5802](../../packages/store/src/store.ts#L5802) `Store/settleSignIns` | `SQLite.all` (5802, 5808); `SQLite.prepare` (5802, 5808, 5814, 5818, 5820); `Store.sql` (5802, 5808, 5814, 5818, 5820) | AUTH |
| [packages/store/src/store.ts:9466](../../packages/store/src/store.ts#L9466) `Store/setUserPref` | `Store.sql` (9466, 9467, 9468); `SQLite.prepare` (9467, 9468) | CORE |
| [packages/store/src/store.ts:4675](../../packages/store/src/store.ts#L4675) `Store/setWebViewerHosts` | `SQLite.prepare` (4675); `Store.sql` (4675) | CORE |
| [packages/store/src/store.ts:2417](../../packages/store/src/store.ts#L2417) `Store/shareResults` | `Store.sql` (2417) | CORE |
| [packages/store/src/store.ts:1826](../../packages/store/src/store.ts#L1826) `Store/shipWal` | `Store.sql` (1826) | CORE |
| [packages/store/src/store.ts:5749](../../packages/store/src/store.ts#L5749) `Store/signInBase` | `SQLite.get` (5749); `SQLite.prepare` (5749); `Store.sql` (5749) | AUTH |
| [packages/store/src/store.ts:5751](../../packages/store/src/store.ts#L5751) `Store/signInBase/identity` | `SQLite.get` (5751); `SQLite.prepare` (5751); `Store.sql` (5751) | AUTH |
| [packages/store/src/store.ts:5738](../../packages/store/src/store.ts#L5738) `Store/signInMark` | `SQLite.prepare` (5738); `Store.sql` (5738) | AUTH |
| [packages/store/src/store.ts:9632](../../packages/store/src/store.ts#L9632) `Store/sortedPage` | `SQLite.iterate` (9632); `SQLite.prepare` (9632, 9647); `Store.sql` (9632, 9647); `SQLite.all` (9647) | CORE |
| [packages/store/src/store.ts:11597](../../packages/store/src/store.ts#L11597) `Store/sortIdsCurrentProgress` | `Store.sortIds` (11597); `Store.sortIdsProgress` (11597); `SQLite.all` (11610); `SQLite.prepare` (11610, 11689); `Store.sql` (11610, 11689); `Store.valueListItems` (11618); `rowsById` (11630); `Calculations.globalValue` (11633); `Calculations.unstoredValue` (11634); `Calculations.related` (11640); `SQLite.iterate` (11689) | GATED-STORE |
| [packages/store/src/store.ts:11777](../../packages/store/src/store.ts#L11777) `Store/storedFileId` | `SQLite.get` (11777); `SQLite.prepare` (11777) | CORE |
| [packages/store/src/store.ts:9780](../../packages/store/src/store.ts#L9780) `Store/summaries` | `Calculations.wholeTable` (9780); `Calculations.collect` (9800, 9805) | CORE |
| [packages/store/src/store.ts:9796](../../packages/store/src/store.ts#L9796) `Store/summaries/recs` | `SQLite.iterate` (9796); `SQLite.prepare` (9796); `Store.sql` (9796) | CORE |
| [packages/store/src/store.ts:6315](../../packages/store/src/store.ts#L6315) `Store/takeWebauthnChallenge` | `SQLite.get` (6315); `SQLite.prepare` (6315, 6319); `Store.sql` (6315, 6319) | CORE |
| [packages/store/src/store.ts:7572](../../packages/store/src/store.ts#L7572) `Store/themes` | `SQLite.get` (7572) | CORE |
| [packages/store/src/store.ts:9519](../../packages/store/src/store.ts#L9519) `Store/timeFind` | `Store.query` (9519) | CORE |
| [packages/store/src/store.ts:7907](../../packages/store/src/store.ts#L7907) `Store/toRecord` | `Calculations.value` (7907, 7917); `Calculations.globalValue` (7911); `Calculations.unstoredStyled` (7916) | CORE |
| [packages/store/src/store.ts:6199](../../packages/store/src/store.ts#L6199) `Store/totpAccounts` | `SQLite.all` (6199); `SQLite.prepare` (6199); `Store.sql` (6199) | CORE |
| [packages/store/src/store.ts:1838](../../packages/store/src/store.ts#L1838) `Store/trial` | `Store.sql` (1838) | CORE |
| [packages/store/src/store.ts:1843](../../packages/store/src/store.ts#L1843) `Store/trial/undo` | `Store.sql` (1843) | CORE |
| [packages/store/src/store.ts:11733](../../packages/store/src/store.ts#L11733) `Store/truncate/run` | `Store.sql` (11733, 11735, 11742, 11744, 11746, 11747); `SQLite.prepare` (11735, 11742); `SQLite.all` (11737) | CORE |
| [packages/store/src/store.ts:4043](../../packages/store/src/store.ts#L4043) `Store/unmigratedAccounts` | `SQLite.all` (4043); `SQLite.prepare` (4043); `Store.sql` (4043) | CORE |
| [packages/store/src/store.ts:5231](../../packages/store/src/store.ts#L5231) `Store/unusedAccess` | `SQLite.get` (5231); `SQLite.prepare` (5231, 5240); `Store.sql` (5231, 5240); `SQLite.all` (5240) | CORE |
| [packages/store/src/store.ts:5279](../../packages/store/src/store.ts#L5279) `Store/unusedObjects` | `SQLite.get` (5279); `SQLite.prepare` (5279, 5282); `Store.sql` (5279, 5282); `SQLite.all` (5282) | CORE |
| [packages/store/src/store.ts:6439](../../packages/store/src/store.ts#L6439) `Store/unusedRecoveryHashes` | `SQLite.all` (6439); `SQLite.prepare` (6439); `Store.sql` (6439) | CORE |
| [packages/store/src/store.ts:5061](../../packages/store/src/store.ts#L5061) `Store/unusualAccess` | `Store.auditLog` (5061, 5127) | CORE |
| [packages/store/src/store.ts:10219](../../packages/store/src/store.ts#L10219) `Store/update` | `Store.row` (10219); `Store.sql` (10250, 10251, 10297, 10300) | CORE |
| [packages/store/src/store.ts:10253](../../packages/store/src/store.ts#L10253) `Store/update/undo` | `Store.sql` (10253) | CORE |
| [packages/store/src/store.ts:10690](../../packages/store/src/store.ts#L10690) `Store/updatePortals` | `Store.row` (10690, 10743); `relatedRows` (10744) | CORE |
| [packages/store/src/store.ts:10700](../../packages/store/src/store.ts#L10700) `Store/updatePortals/portal/related` | `relatedIdList` (10700) | CORE |
| [packages/store/src/store.ts:10672](../../packages/store/src/store.ts#L10672) `Store/updateRelated` | `relatedRows` (10672) | CORE |
| [packages/store/src/store.ts:5317](../../packages/store/src/store.ts#L5317) `Store/usageCounting` | `SQLite.get` (5317); `SQLite.prepare` (5317); `Store.sql` (5317) | CORE |
| [packages/store/src/store.ts:9457](../../packages/store/src/store.ts#L9457) `Store/userPrefs` | `SQLite.all` (9457); `SQLite.prepare` (9457); `Store.sql` (9457) | CORE |
| [packages/store/src/store.ts:8329](../../packages/store/src/store.ts#L8329) `Store/valueListItemsCurrent` | `Store.valueListItems` (8329); `Store.get` (8343); `relatedRows` (8344); `Store.row` (8344); `SQLite.iterate` (8346); `SQLite.prepare` (8346); `Store.sql` (8346); `Calculations.related` (8356); `Calculations.value` (8360, 8361) | GATED-STORE |
| [packages/store/src/store.ts:10904](../../packages/store/src/store.ts#L10904) `Store/vaultHeld` | `SQLite.get` (10904); `SQLite.prepare` (10904); `Store.sql` (10904) | CORE |
| [packages/store/src/store.ts:6399](../../packages/store/src/store.ts#L6399) `Store/verifyPasskeyCredential` | `SQLite.get` (6399); `SQLite.prepare` (6399, 6411); `Store.sql` (6399, 6411) | CORE |
| [packages/store/src/store.ts:6228](../../packages/store/src/store.ts#L6228) `Store/verifyTotp` | `SQLite.get` (6228); `SQLite.prepare` (6228, 6235); `Store.sql` (6228, 6235) | CORE |
| [packages/store/src/store.ts:2553](../../packages/store/src/store.ts#L2553) `Store/versionNumber` | `SQLite.get` (2553); `SQLite.prepare` (2553); `Store.sql` (2553) | CORE |
| [packages/store/src/store.ts:2428](../../packages/store/src/store.ts#L2428) `Store/versionTriggers` | `SQLite.get` (2428); `SQLite.prepare` (2428, 2433, 2434); `Store.sql` (2428, 2433, 2434, 2451, 2453, 2454, 2456); `SQLite.all` (2433, 2434) | CORE |
| [packages/store/src/store.ts:2396](../../packages/store/src/store.ts#L2396) `Store/warmSummariesCurrent` | `Calculations.wholeTable` (2396) | CORE |
| [packages/store/src/store.ts:4657](../../packages/store/src/store.ts#L4657) `Store/webViewerChecked` | `SQLite.get` (4657); `SQLite.prepare` (4657); `Store.sql` (4657) | CORE |
| [packages/store/src/store.ts:2132](../../packages/store/src/store.ts#L2132) `Store/withWriteTransaction` | `Store.sql` (2132, 2145, 2152, 2157, 2157) | CORE |
| [packages/store/src/store.ts:7836](../../packages/store/src/store.ts#L7836) `Store/wordIndex` | `Store.sql` (7836, 7844, 7849); `Store.recordCount` (7848); `SQLite.get` (7849); `SQLite.prepare` (7849) | CORE |
| [packages/store/src/store.ts:9027](../../packages/store/src/store.ts#L9027) `Store/writeExternalFile` | `Store.evaluateEach` (9027); `SQLite.prepare` (9050); `Store.sql` (9050) | CORE |
| [packages/store/src/store.ts:9051](../../packages/store/src/store.ts#L9051) `Store/writeExternalFile/taken` | `SQLite.get` (9051) | CORE |
| [packages/store/src/store.ts:6058](../../packages/store/src/store.ts#L6058) `Store/writeObjectUseRows` | `SQLite.prepare` (6058, 6059, 6064); `Store.sql` (6058, 6059, 6064) | CORE |
| [packages/store/src/store.ts:2608](../../packages/store/src/store.ts#L2608) `Store/writeToken` | `SQLite.get` (2608); `SQLite.prepare` (2608); `Store.sql` (2608) | CORE |
| [packages/store/src/store.ts:6030](../../packages/store/src/store.ts#L6030) `Store/writeUsage` | `Store.sql` (6030, 6031, 6033, 6037, 6039) | CORE |
| [packages/store/src/store.ts:6046](../../packages/store/src/store.ts#L6046) `Store/writeUsageRows` | `SQLite.prepare` (6046, 6047, 6053); `Store.sql` (6046, 6047, 6053) | CORE |
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
| [packages/store/src/store.ts:1094](../../packages/store/src/store.ts#L1094) `Store/referenceSecurity` | `SQLite.get` (1094); `SQLite.prepare` (1094); `Store.sql` (1094) | Internal File Access authorization reads only its version and file-local security metadata; public management reads require Full Access. No record values are read. |
| [packages/store/src/store.ts:1113](../../packages/store/src/store.ts#L1113) `Store/writeFileAccess` | `SQLite.prepare` (1113); `Store.sql` (1113) | Writes only File Access security metadata inside securityChange; public mutations require Full Access, while hosted rename observation changes display names without granting access. |
| [packages/store/src/store.ts:1155](../../packages/store/src/store.ts#L1155) `Store/resetFileAccessId` | `SQLite.prepare` (1155, 1157); `Store.sql` (1155, 1157) | Full Access checked inside the security transaction before writing the new reference identity and retaining the stable token-scope identity; no record data is read. |
| [packages/store/src/ess/driver.ts:128](../../packages/store/src/ess/driver.ts#L128) `SqliteDriver/query` | `SQLite.prepare` (128); `SQLite.iterate` (133) | CORE |
| [packages/store/src/ess/driver.ts:147](../../packages/store/src/ess/driver.ts#L147) `SqliteDriver/tables` | `SQLite.all` (147); `SQLite.prepare` (147) | CORE |
| [packages/store/src/ess/driver.ts:152](../../packages/store/src/ess/driver.ts#L152) `SqliteDriver/columns` | `SQLite.all` (152); `SQLite.prepare` (152) | CORE |
| [packages/store/src/ess/mirror.ts:82](../../packages/store/src/ess/mirror.ts#L82) `refreshMirror` | `SQLite.all` (82); `SQLite.prepare` (82, 84, 85, 86, 102, 103) | CORE |
| [packages/store/src/store.ts:1318](../../packages/store/src/store.ts#L1318) `Store/refreshShadow` | `Store.sql` (1318) | CORE |
| [packages/store/src/store.ts:1263](../../packages/store/src/store.ts#L1263) `Store/flushEssWrites` | `Store.sql` (1263, 1264, 1272, 1274); `SQLite.prepare` (1264, 1272, 1274) | CORE |
| [packages/store/src/store.ts:1203](../../packages/store/src/store.ts#L1203) `Store/loadShadow` | `Store.sql` (1203, 1205) | CORE |
<!-- end generated read-gate inventory -->
