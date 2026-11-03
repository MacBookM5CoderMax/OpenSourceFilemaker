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
| [packages/server/src/agent.ts:319](../../packages/server/src/agent.ts#L319) `dryRunPlan` | `Store.findIds` (319) | DESIGN |
| [packages/server/src/agent.ts:342](../../packages/server/src/agent.ts#L342) `runApprovedStep` | `Store.findIds` (342) | DESIGN |
| [packages/server/src/agent.ts:163](../../packages/server/src/agent.ts#L163) `runStep` | `Store.findIds` (163); `Store.auditLog` (232); `Store.canViewRecord` (244) | DESIGN |
| [packages/server/src/agent.ts:155](../../packages/server/src/agent.ts#L155) `runStep/visible` | `Store.findIds` (155) | DESIGN |
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
| [packages/server/src/automations.ts:436](../../packages/server/src/automations.ts#L436) `AutomationRunner/changed` | `Store.auditLog` (436) | AUTOMATION |
| [packages/server/src/automations.ts:467](../../packages/server/src/automations.ts#L467) `AutomationRunner/run` | `Store.select` (467); `Store.canViewRecord` (477); `Store.evaluateEach` (480); `Store.evaluate` (486) | AUTOMATION |
| [packages/server/src/automations.ts:513](../../packages/server/src/automations.ts#L513) `AutomationRunner/runDeleted` | `Store.auditLog` (513) | AUTOMATION |
| [packages/server/src/automations.ts:308](../../packages/server/src/automations.ts#L308) `dryRunAutomation` | `Store.canViewRecord` (308); `Store.findIds` (308); `Store.auditLog` (324, 352, 360); `Store.select` (337); `Store.evaluate` (353) | AUTOMATION |
| [packages/server/src/automations.ts:307](../../packages/server/src/automations.ts#L307) `dryRunAutomation/truth` | `Store.evaluateEach` (307) | AUTOMATION |
| [packages/server/src/automations.ts:195](../../packages/server/src/automations.ts#L195) `Saved/delete` | `SQLite.prepare` (195, 197); `Store.sql` (195, 197) | AUTOMATION |
| [packages/server/src/automations.ts:179](../../packages/server/src/automations.ts#L179) `Saved/list` | `SQLite.all` (179); `SQLite.prepare` (179); `Store.sql` (179) | AUTOMATION |
| [packages/server/src/automations.ts:202](../../packages/server/src/automations.ts#L202) `Saved/logRun` | `SQLite.prepare` (202, 204); `Store.sql` (202, 204) | AUTOMATION |
| [packages/server/src/automations.ts:209](../../packages/server/src/automations.ts#L209) `Saved/runs` | `SQLite.all` (209); `SQLite.prepare` (209); `Store.sql` (209) | AUTOMATION |
| [packages/server/src/automations.ts:189](../../packages/server/src/automations.ts#L189) `Saved/save` | `SQLite.prepare` (189); `Store.sql` (189) | AUTOMATION |
| [packages/server/src/automations.ts:168](../../packages/server/src/automations.ts#L168) `Saved/table` | `Store.sql` (168, 169) | AUTOMATION |
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
| [packages/server/src/cleanup.ts:747](../../packages/server/src/cleanup.ts#L747) `applyCleanup/apply` | `Store.findIds` (747, 757); `SQLite.all` (748); `SQLite.prepare` (748, 785); `Store.sql` (748, 785); `SQLite.get` (785) | CLEANUP |
| [packages/server/src/cleanup.ts:1051](../../packages/server/src/cleanup.ts#L1051) `CleanupJournal/add` | `SQLite.prepare` (1051); `Store.sql` (1051) | CLEANUP |
| [packages/server/src/cleanup.ts:1046](../../packages/server/src/cleanup.ts#L1046) `CleanupJournal/append` | `SQLite.prepare` (1046); `Store.sql` (1046) | CLEANUP |
| [packages/server/src/cleanup.ts:1037](../../packages/server/src/cleanup.ts#L1037) `CleanupJournal/constructor` | `Store.sql` (1037) | CLEANUP |
| [packages/server/src/cleanup.ts:1057](../../packages/server/src/cleanup.ts#L1057) `CleanupJournal/get` | `SQLite.get` (1057); `SQLite.prepare` (1057); `Store.sql` (1057) | CLEANUP |
| [packages/server/src/cleanup.ts:1062](../../packages/server/src/cleanup.ts#L1062) `CleanupJournal/list` | `SQLite.all` (1062); `SQLite.prepare` (1062); `Store.sql` (1062) | CLEANUP |
| [packages/server/src/cleanup.ts:1066](../../packages/server/src/cleanup.ts#L1066) `CleanupJournal/markUndone` | `SQLite.prepare` (1066); `Store.sql` (1066) | CLEANUP |
| [packages/server/src/cleanup.ts:523](../../packages/server/src/cleanup.ts#L523) `findDuplicates` | `Store.findIds` (523) | CLEANUP |
| [packages/server/src/cleanup.ts:885](../../packages/server/src/cleanup.ts#L885) `journalDeletes` | `SQLite.get` (885); `SQLite.prepare` (885); `Store.sql` (885) | CLEANUP |
| [packages/server/src/cleanup.ts:617](../../packages/server/src/cleanup.ts#L617) `keyValue` | `SQLite.get` (617); `SQLite.prepare` (617); `Store.sql` (617) | CLEANUP |
| [packages/server/src/cleanup.ts:621](../../packages/server/src/cleanup.ts#L621) `relatedIds` | `SQLite.all` (621); `SQLite.prepare` (621); `Store.sql` (621) | CLEANUP |
| [packages/server/src/cleanup.ts:327](../../packages/server/src/cleanup.ts#L327) `scanData` | `Store.findIds` (327); `Store.select` (333) | CLEANUP |
| [packages/server/src/cleanup.ts:816](../../packages/server/src/cleanup.ts#L816) `snapshotField` | `SQLite.all` (816); `SQLite.prepare` (816); `Store.sql` (816) | CLEANUP |
| [packages/server/src/cleanup.ts:876](../../packages/server/src/cleanup.ts#L876) `snapshotRows` | `SQLite.all` (876); `SQLite.prepare` (876); `Store.sql` (876) | CLEANUP |
| [packages/server/src/cleanup.ts:997](../../packages/server/src/cleanup.ts#L997) `undoCleanup` | `SQLite.get` (997, 1013); `SQLite.prepare` (997, 1013); `Store.sql` (997, 1013) | CLEANUP |
| [packages/server/src/cleanup.ts:935](../../packages/server/src/cleanup.ts#L935) `updateMany` | `Store.findIds` (935) | CLEANUP |
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
| [packages/server/src/dashboards.ts:389](../../packages/server/src/dashboards.ts#L389) `Dashboards/create` | `SQLite.prepare` (389); `Store.sql` (389) | DASHBOARD |
| [packages/server/src/dashboards.ts:409](../../packages/server/src/dashboards.ts#L409) `Dashboards/delete` | `SQLite.prepare` (409); `Store.sql` (409) | DASHBOARD |
| [packages/server/src/dashboards.ts:375](../../packages/server/src/dashboards.ts#L375) `Dashboards/get` | `SQLite.get` (375); `SQLite.prepare` (375); `Store.sql` (375) | DASHBOARD |
| [packages/server/src/dashboards.ts:369](../../packages/server/src/dashboards.ts#L369) `Dashboards/list` | `SQLite.all` (369); `SQLite.prepare` (369); `Store.sql` (369) | DASHBOARD |
| [packages/server/src/dashboards.ts:359](../../packages/server/src/dashboards.ts#L359) `Dashboards/table` | `Store.sql` (359) | DASHBOARD |
| [packages/server/src/dashboards.ts:402](../../packages/server/src/dashboards.ts#L402) `Dashboards/update` | `SQLite.prepare` (402); `Store.sql` (402) | DASHBOARD |
| [packages/server/src/dataapi.ts:2099](../../packages/server/src/dataapi.ts#L2099) `DataApi/route` | `Store.get` (2099, 2320, 2321, 2344, 2352, 2399, 2423, 2443, 2480); `Store.valueListItems` (2114); `Store.find` (2275, 2323, 2514); `Store.findIds` (2279, 2519); `Store.query` (2519) | REST |
| [packages/server/src/dataapi.ts:2227](../../packages/server/src/dataapi.ts#L2227) `DataApi/route/recordOut` | `Store.portalCounts` (2227) | REST |
| [packages/server/src/dataapi.ts:2263](../../packages/server/src/dataapi.ts#L2263) `DataApi/route/shownAs` | `Store.get` (2263) | REST |
| [packages/server/src/debug.ts:345](../../packages/server/src/debug.ts#L345) `DebugApi/handle` | `Store.row` (345, 474); `Store.get` (354, 479); `Store.evaluate` (378) | DESIGN |
| [packages/server/src/debug.ts:194](../../packages/server/src/debug.ts#L194) `learnStoredCredentials` | `Calculations.globalValue` (194); `Store.sql` (200, 210, 210); `SQLite.iterate` (210, 210); `SQLite.prepare` (210, 210); `Store.iterateCommitted` (210) | DESIGN |
| [packages/server/src/design.ts:234](../../packages/server/src/design.ts#L234) `containerData` | `Store.query` (234) | DESIGN |
| [packages/server/src/design.ts:731](../../packages/server/src/design.ts#L731) `DesignApi/handle` | `Store.auditLog` (731); `Store.evaluate` (798) | DESIGN |
| [packages/server/src/design.ts:243](../../packages/server/src/design.ts#L243) `recordCount` | `Store.query` (243) | DESIGN |
| [packages/server/src/digests.ts:231](../../packages/server/src/digests.ts#L231) `Digests/addRun` | `SQLite.prepare` (231, 232); `Store.sql` (231, 232) | DIGEST |
| [packages/server/src/digests.ts:208](../../packages/server/src/digests.ts#L208) `Digests/create` | `SQLite.prepare` (208); `Store.sql` (208) | DIGEST |
| [packages/server/src/digests.ts:225](../../packages/server/src/digests.ts#L225) `Digests/delete` | `SQLite.prepare` (225, 226); `Store.sql` (225, 226) | DIGEST |
| [packages/server/src/digests.ts:189](../../packages/server/src/digests.ts#L189) `Digests/get` | `SQLite.get` (189); `SQLite.prepare` (189); `Store.sql` (189) | DIGEST |
| [packages/server/src/digests.ts:196](../../packages/server/src/digests.ts#L196) `Digests/lastSlot` | `SQLite.get` (196); `SQLite.prepare` (196); `Store.sql` (196) | DIGEST |
| [packages/server/src/digests.ts:183](../../packages/server/src/digests.ts#L183) `Digests/list` | `SQLite.all` (183); `SQLite.prepare` (183); `Store.sql` (183) | DIGEST |
| [packages/server/src/digests.ts:200](../../packages/server/src/digests.ts#L200) `Digests/markSlot` | `SQLite.prepare` (200); `Store.sql` (200) | DIGEST |
| [packages/server/src/digests.ts:238](../../packages/server/src/digests.ts#L238) `Digests/runs` | `SQLite.all` (238); `SQLite.prepare` (238); `Store.sql` (238) | DIGEST |
| [packages/server/src/digests.ts:172](../../packages/server/src/digests.ts#L172) `Digests/table` | `Store.sql` (172) | DIGEST |
| [packages/server/src/digests.ts:217](../../packages/server/src/digests.ts#L217) `Digests/update` | `SQLite.prepare` (217); `Store.sql` (217) | DIGEST |
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
| [packages/server/src/live.ts:207](../../packages/server/src/live.ts#L207) `Live/handle` | `Store.canView` (207) | LIVE |
| [packages/server/src/live.ts:281](../../packages/server/src/live.ts#L281) `Live/visibleRecord` | `Store.canViewRecord` (281) | LIVE |
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
| [packages/server/src/oidc.ts:469](../../packages/server/src/oidc.ts#L469) `Oidc/authorizeUrl` | `SQLite.prepare` (469, 472) | AUTH |
| [packages/server/src/oidc.ts:524](../../packages/server/src/oidc.ts#L524) `Oidc/callback` | `SQLite.get` (524); `SQLite.prepare` (524, 535, 539); `SQLite.all` (535) | AUTH |
| [packages/server/src/oidc.ts:216](../../packages/server/src/oidc.ts#L216) `Oidc/constructor` | `SQLite.all` (216, 227); `SQLite.prepare` (216, 227, 237, 238, 243, 243) | AUTH |
| [packages/server/src/oidc.ts:644](../../packages/server/src/oidc.ts#L644) `Oidc/finish` | `SQLite.prepare` (644, 645, 647); `SQLite.get` (645) | AUTH |
| [packages/server/src/oidc.ts:442](../../packages/server/src/oidc.ts#L442) `Oidc/makeRoom` | `SQLite.get` (442, 444, 446); `SQLite.prepare` (442, 443, 444, 446, 448); `SQLite.all` (443, 448) | AUTH |
| [packages/server/src/oidc.ts:384](../../packages/server/src/oidc.ts#L384) `Oidc/takeGrant` | `SQLite.all` (384); `SQLite.prepare` (384) | AUTH |
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
| [packages/server/src/security.ts:80](../../packages/server/src/security.ts#L80) `importApproximations` | `SQLite.all` (80); `SQLite.prepare` (80); `Store.sql` (80) | DESIGN |
| [packages/server/src/security.ts:217](../../packages/server/src/security.ts#L217) `SecurityApi/handle` | `Store.previewRecordRule` (217) | DESIGN |
| [packages/server/src/security.ts:116](../../packages/server/src/security.ts#L116) `securityOf` | `Store.pendingChanges` (116) | DESIGN |
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
| [packages/server/src/webclient.ts:2674](../../packages/server/src/webclient.ts#L2674) `foundIds` | `Store.findIds` (2674, 2676) | WEB |
| [packages/server/src/webclient.ts:2595](../../packages/server/src/webclient.ts#L2595) `listItems` | `Store.valueListItems` (2595) | WEB |
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
| [packages/server/src/webclient.ts:555](../../packages/server/src/webclient.ts#L555) `WebClient/history` | `Store.get` (555) | WEB |
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
| [packages/store/src/store.ts:5358](../../packages/store/src/store.ts#L5358) `Store/accountIdentityId` | `SQLite.get` (5358, 5364); `SQLite.prepare` (5358, 5363, 5364); `Store.sql` (5358, 5363, 5364) | CORE |
| [packages/store/src/store.ts:5352](../../packages/store/src/store.ts#L5352) `Store/accountIdentityIdIfSet` | `SQLite.get` (5352); `SQLite.prepare` (5352); `Store.sql` (5352) | CORE |
| [packages/store/src/store.ts:5314](../../packages/store/src/store.ts#L5314) `Store/accountInactive` | `SQLite.get` (5314); `SQLite.prepare` (5314); `Store.sql` (5314) | CORE |
| [packages/store/src/store.ts:5511](../../packages/store/src/store.ts#L5511) `Store/accountLocalOnly` | `SQLite.get` (5511); `SQLite.prepare` (5511); `Store.sql` (5511) | CORE |
| [packages/store/src/store.ts:6380](../../packages/store/src/store.ts#L6380) `Store/accountPrivilegeSet` | `SQLite.get` (6380); `SQLite.prepare` (6380); `Store.sql` (6380) | CORE |
| [packages/store/src/store.ts:5516](../../packages/store/src/store.ts#L5516) `Store/accountRequires2fa` | `SQLite.get` (5516); `SQLite.prepare` (5516); `Store.sql` (5516) | CORE |
| [packages/store/src/store.ts:3674](../../packages/store/src/store.ts#L3674) `Store/accounts` | `SQLite.all` (3674); `SQLite.prepare` (3674); `Store.sql` (3674) | CORE |
| [packages/store/src/store.ts:3670](../../packages/store/src/store.ts#L3670) `Store/accountsSharingLockout` | `SQLite.all` (3670); `SQLite.prepare` (3670); `Store.sql` (3670) | CORE |
| [packages/store/src/store.ts:5736](../../packages/store/src/store.ts#L5736) `Store/accountUsage` | `SQLite.get` (5736); `SQLite.prepare` (5736, 5737); `Store.sql` (5736, 5737); `SQLite.all` (5737); `Store.auditLog` (5753) | CORE |
| [packages/store/src/store.ts:8577](../../packages/store/src/store.ts#L8577) `Store/addContainer` | `SQLite.all` (8577); `SQLite.prepare` (8577, 8582, 8596, 8600, 8601); `Store.sql` (8577, 8582, 8596, 8598, 8600, 8601, 8603, 8606); `SQLite.get` (8587); `Store.containerRange` (8589) | CORE |
| [packages/store/src/store.ts:8623](../../packages/store/src/store.ts#L8623) `Store/addExternalContainer` | `SQLite.prepare` (8623); `Store.sql` (8623) | CORE |
| [packages/store/src/store.ts:9100](../../packages/store/src/store.ts#L9100) `Store/addFieldIndex` | `Store.sql` (9100) | CORE |
| [packages/store/src/store.ts:7262](../../packages/store/src/store.ts#L7262) `Store/addImage` | `Store.sql` (7262, 7263); `SQLite.prepare` (7263) | CORE |
| [packages/store/src/store.ts:6430](../../packages/store/src/store.ts#L6430) `Store/addProvisionedAccount` | `SQLite.get` (6430); `SQLite.prepare` (6430, 6434); `Store.sql` (6430, 6434) | CORE |
| [packages/store/src/store.ts:7688](../../packages/store/src/store.ts#L7688) `Store/addRelated` | `relatedRows` (7688); `rowsById` (7721); `firstRelatedEach` (7744) | CORE |
| [packages/store/src/store.ts:3692](../../packages/store/src/store.ts#L3692) `Store/agentNeedsApproval` | `SQLite.get` (3692); `SQLite.prepare` (3692); `Store.sql` (3692) | CORE |
| [packages/store/src/store.ts:6657](../../packages/store/src/store.ts#L6657) `Store/allowedIds` | `SQLite.iterate` (6657); `SQLite.prepare` (6657); `Store.sql` (6657) | CORE |
| [packages/store/src/store.ts:5793](../../packages/store/src/store.ts#L5793) `Store/apiToken` | `SQLite.get` (5793); `SQLite.prepare` (5793, 5811); `Store.sql` (5793, 5811) | CORE |
| [packages/store/src/store.ts:5769](../../packages/store/src/store.ts#L5769) `Store/apiTokens` | `SQLite.all` (5769); `SQLite.prepare` (5769); `Store.sql` (5769) | CORE |
| [packages/store/src/store.ts:4092](../../packages/store/src/store.ts#L4092) `Store/appendSecurityEvent` | `Store.sql` (4092) | CORE |
| [packages/store/src/store.ts:3133](../../packages/store/src/store.ts#L3133) `Store/appendSecurityRow` | `Store.sql` (3133) | CORE |
| [packages/store/src/store.ts:5134](../../packages/store/src/store.ts#L5134) `Store/applyAccountImport` | `Store.sql` (5134, 5142, 5171); `SQLite.get` (5142); `SQLite.prepare` (5142, 5171) | CORE |
| [packages/store/src/store.ts:2434](../../packages/store/src/store.ts#L2434) `Store/applyDesign` | `Store.sql` (2434, 2435, 2455, 2458, 2463, 2479, 2482, 2482); `SQLite.prepare` (2458, 2463) | CORE |
| [packages/store/src/store.ts:3936](../../packages/store/src/store.ts#L3936) `Store/approvePending` | `SQLite.get` (3936); `SQLite.prepare` (3936, 3948); `Store.sql` (3936, 3948) | CORE |
| [packages/store/src/store.ts:2924](../../packages/store/src/store.ts#L2924) `Store/audit/write` | `Store.sql` (2924) | CORE |
| [packages/store/src/store.ts:2546](../../packages/store/src/store.ts#L2546) `Store/auditLog` | `SQLite.all` (2546); `SQLite.prepare` (2546); `Store.sql` (2546) | CORE |
| [packages/store/src/store.ts:1969](../../packages/store/src/store.ts#L1969) `Store/backup` | `Store.sql` (1969) | CORE |
| [packages/store/src/store.ts:3698](../../packages/store/src/store.ts#L3698) `Store/blankPasswordAccounts` | `SQLite.all` (3698); `SQLite.prepare` (3698); `Store.sql` (3698) | CORE |
| [packages/store/src/store.ts:5063](../../packages/store/src/store.ts#L5063) `Store/canonicalAccount` | `SQLite.all` (5063); `SQLite.prepare` (5063); `Store.sql` (5063) | CORE |
| [packages/store/src/store.ts:9686](../../packages/store/src/store.ts#L9686) `Store/canView` | `Store.canView` (9686); `Store.row` (9687) | GATED-STORE |
| [packages/store/src/store.ts:9668](../../packages/store/src/store.ts#L9668) `Store/canViewRecord` | `SQLite.get` (9668); `SQLite.prepare` (9668); `Store.sql` (9668) | GATED-STORE |
| [packages/store/src/store.ts:10766](../../packages/store/src/store.ts#L10766) `Store/cascadeDelete` | `relatedRows` (10766) | CORE |
| [packages/store/src/store.ts:2269](../../packages/store/src/store.ts#L2269) `Store/changeOne` | `Store.sql` (2269, 2271) | CORE |
| [packages/store/src/store.ts:2272](../../packages/store/src/store.ts#L2272) `Store/changeOne/read` | `SQLite.get` (2272); `SQLite.prepare` (2272); `Store.sql` (2272) | CORE |
| [packages/store/src/store.ts:8958](../../packages/store/src/store.ts#L8958) `Store/checkContainerWrite` | `Store.row` (8958) | CORE |
| [packages/store/src/store.ts:10389](../../packages/store/src/store.ts#L10389) `Store/checkEditable` | `Store.row` (10389) | CORE |
| [packages/store/src/store.ts:1515](../../packages/store/src/store.ts#L1515) `Store/checkpoint` | `SQLite.get` (1515); `SQLite.prepare` (1515); `Store.sql` (1515) | CORE |
| [packages/store/src/store.ts:3835](../../packages/store/src/store.ts#L3835) `Store/checkProposedWrite` | `Store.row` (3835); `relatedRows` (3849) | CORE |
| [packages/store/src/store.ts:6416](../../packages/store/src/store.ts#L6416) `Store/clearAccountPrivilegeSet` | `SQLite.prepare` (6416); `Store.sql` (6416) | CORE |
| [packages/store/src/store.ts:1537](../../packages/store/src/store.ts#L1537) `Store/close` | `Store.sql` (1537) | CORE |
| [packages/store/src/store.ts:8926](../../packages/store/src/store.ts#L8926) `Store/compactFile` | `Store.sql` (8926, 8927, 8929) | CORE |
| [packages/store/src/store.ts:9337](../../packages/store/src/store.ts#L9337) `Store/computedRows` | `Store.sql` (9337, 9340, 9341, 9342, 9344, 9354, 9355, 9356, 9359); `SQLite.prepare` (9340, 9342, 9344, 9354); `SQLite.iterate` (9344); `Calculations.globalValue` (9347); `Calculations.unstoredValue` (9348); `Calculations.related` (9351); `SQLite.all` (9354) | CORE |
| [packages/store/src/store.ts:10890](../../packages/store/src/store.ts#L10890) `Store/computeValuesCurrent` | `Store.computeValues` (10890); `Store.sql` (10896, 10900); `SQLite.all` (10900); `SQLite.prepare` (10900) | GATED-STORE |
| [packages/store/src/store.ts:5838](../../packages/store/src/store.ts#L5838) `Store/confirmTotp` | `SQLite.get` (5838); `SQLite.prepare` (5838, 5840); `Store.sql` (5838, 5840) | CORE |
| [packages/store/src/store.ts:1153](../../packages/store/src/store.ts#L1153) `Store/constructor` | `Store.sql` (1153, 1155, 1157, 1158, 1162, 1166, 1167, 1176, 1184, 1199, 1204, 1209, 1210, 1214, 1215, 1216, 1223, 1227, 1231, 1232, 1233, 1238, 1239, 1243, 1246, 1247, 1249, 1250, 1253, 1254, 1258, 1259, 1263, 1264, 1267, 1270, 1271, 1273, 1276, 1277, 1281, 1282, 1286, 1287, 1291, 1292, 1293, 1296, 1297, 1300, 1301, 1303, 1303, 1304, 1304, 1305, 1309, 1311, 1315, 1317, 1320, 1321, 1322, 1325, 1326, 1328, 1330, 1331, 1335, 1336, 1338, 1350, 1352, 1353, 1354, 1354, 1358, 1359); `SQLite.get` (1157, 1176); `SQLite.prepare` (1157, 1176, 1184, 1246, 1247, 1250, 1253, 1258, 1263, 1270, 1276, 1281, 1286, 1296, 1300, 1303, 1304, 1325, 1330, 1335); `SQLite.all` (1246, 1253, 1258, 1263, 1270, 1276, 1281, 1286, 1296, 1300, 1303, 1304, 1325, 1330, 1335) | CORE |
| [packages/store/src/store.ts:6196](../../packages/store/src/store.ts#L6196) `Store/consumeRecoveryCode` | `SQLite.prepare` (6196); `Store.sql` (6196) | CORE |
| [packages/store/src/store.ts:8501](../../packages/store/src/store.ts#L8501) `Store/container` | `SQLite.get` (8501); `SQLite.prepare` (8501, 8510); `Store.sql` (8501, 8510); `SQLite.all` (8510) | CORE |
| [packages/store/src/store.ts:8935](../../packages/store/src/store.ts#L8935) `Store/containerId` | `Store.containerId` (8935); `Store.row` (8936) | CORE |
| [packages/store/src/store.ts:8518](../../packages/store/src/store.ts#L8518) `Store/containerInfo` | `SQLite.get` (8518); `SQLite.prepare` (8518); `Store.sql` (8518) | CORE |
| [packages/store/src/store.ts:8482](../../packages/store/src/store.ts#L8482) `Store/containerIntact` | `SQLite.get` (8482); `SQLite.prepare` (8482); `Store.sql` (8482) | CORE |
| [packages/store/src/store.ts:8421](../../packages/store/src/store.ts#L8421) `Store/containerIntegrityReport` | `SQLite.all` (8421); `SQLite.prepare` (8421, 8432); `Store.sql` (8421, 8432); `SQLite.get` (8432) | CORE |
| [packages/store/src/store.ts:8496](../../packages/store/src/store.ts#L8496) `Store/containerMeta` | `SQLite.get` (8496); `SQLite.prepare` (8496); `Store.sql` (8496) | CORE |
| [packages/store/src/store.ts:8552](../../packages/store/src/store.ts#L8552) `Store/containerRange` | `SQLite.all` (8552); `SQLite.prepare` (8552, 8559); `Store.sql` (8552, 8559); `SQLite.get` (8559) | CORE |
| [packages/store/src/store.ts:8323](../../packages/store/src/store.ts#L8323) `Store/containerReferences` | `SQLite.all` (8323, 8342, 8344, 8350, 8363, 8374, 8388); `SQLite.prepare` (8323, 8342, 8344, 8350, 8363, 8374, 8386, 8388); `Store.sql` (8323, 8342, 8344, 8350, 8363, 8374, 8386, 8388); `SQLite.get` (8386); `Store.row` (8397) | CORE |
| [packages/store/src/store.ts:10870](../../packages/store/src/store.ts#L10870) `Store/countIds` | `Store.countIds` (10870); `SQLite.get` (10874); `SQLite.prepare` (10874); `Store.sql` (10874) | GATED-STORE |
| [packages/store/src/store.ts:9717](../../packages/store/src/store.ts#L9717) `Store/create` | `SQLite.get` (9717); `SQLite.prepare` (9717, 9730); `Store.sql` (9717, 9730) | CORE |
| [packages/store/src/store.ts:4064](../../packages/store/src/store.ts#L4064) `Store/createAccountOnly` | `SQLite.get` (4064); `SQLite.prepare` (4064, 4068, 4074, 4079, 4084); `Store.sql` (4064, 4068, 4074, 4079, 4084) | CORE |
| [packages/store/src/store.ts:5569](../../packages/store/src/store.ts#L5569) `Store/createApiToken` | `SQLite.get` (5569, 5597); `SQLite.prepare` (5569, 5596, 5597, 5607); `Store.sql` (5569, 5596, 5597, 5607) | CORE |
| [packages/store/src/store.ts:5075](../../packages/store/src/store.ts#L5075) `Store/createLocalAccount` | `SQLite.prepare` (5075); `Store.sql` (5075) | CORE |
| [packages/store/src/store.ts:3664](../../packages/store/src/store.ts#L3664) `Store/credentialIdentity` | `SQLite.get` (3664); `SQLite.prepare` (3664); `Store.sql` (3664) | CORE |
| [packages/store/src/store.ts:5490](../../packages/store/src/store.ts#L5490) `Store/credentialStamp` | `SQLite.get` (5490); `SQLite.prepare` (5490); `Store.sql` (5490) | CORE |
| [packages/store/src/store.ts:7095](../../packages/store/src/store.ts#L7095) `Store/crossFileBusy` | `Store.sql` (7095) | AUTH |
| [packages/store/src/store.ts:7067](../../packages/store/src/store.ts#L7067) `Store/crossFileHash` | `SQLite.get` (7067); `SQLite.prepare` (7067); `Store.sql` (7067) | AUTH |
| [packages/store/src/store.ts:2059](../../packages/store/src/store.ts#L2059) `Store/dataVersion` | `SQLite.get` (2059); `SQLite.prepare` (2059); `Store.sql` (2059) | CORE |
| [packages/store/src/store.ts:11433](../../packages/store/src/store.ts#L11433) `Store/decimalViewSql` | `SQLite.all` (11433); `SQLite.prepare` (11433) | CORE |
| [packages/store/src/store.ts:10432](../../packages/store/src/store.ts#L10432) `Store/delete` | `Store.row` (10432) | CORE |
| [packages/store/src/store.ts:10440](../../packages/store/src/store.ts#L10440) `Store/delete/run` | `SQLite.get` (10440); `SQLite.prepare` (10440, 10445); `Store.sql` (10440, 10445) | CORE |
| [packages/store/src/store.ts:5229](../../packages/store/src/store.ts#L5229) `Store/deleteAccount` | `SQLite.prepare` (5229, 5233, 5234, 5235, 5236, 5237, 5238, 5239, 5240, 5247, 5249, 5251, 5253, 5257); `Store.sql` (5229, 5233, 5234, 5235, 5236, 5237, 5238, 5239, 5240, 5247, 5249, 5251, 5253, 5257) | CORE |
| [packages/store/src/store.ts:10513](../../packages/store/src/store.ts#L10513) `Store/deleteBeingUndone` | `SQLite.all` (10513); `SQLite.prepare` (10513); `Store.sql` (10513) | CORE |
| [packages/store/src/store.ts:3301](../../packages/store/src/store.ts#L3301) `Store/deletedRows` | `SQLite.get` (3301); `SQLite.prepare` (3301, 3303, 3303); `Store.sql` (3301, 3303, 3303); `SQLite.all` (3303, 3303) | CORE |
| [packages/store/src/store.ts:10525](../../packages/store/src/store.ts#L10525) `Store/deleteEndingTheLifeAt` | `SQLite.get` (10525); `SQLite.prepare` (10525); `Store.sql` (10525) | CORE |
| [packages/store/src/store.ts:6281](../../packages/store/src/store.ts#L6281) `Store/deletePrivilegeSet` | `SQLite.prepare` (6281); `Store.sql` (6281) | CORE |
| [packages/store/src/store.ts:4202](../../packages/store/src/store.ts#L4202) `Store/deleteScriptTest` | `SQLite.prepare` (4202); `Store.sql` (4202) | CORE |
| [packages/store/src/store.ts:10417](../../packages/store/src/store.ts#L10417) `Store/deleteVisibility` | `Store.canViewRecord` (10417) | CORE |
| [packages/store/src/store.ts:7204](../../packages/store/src/store.ts#L7204) `Store/design` | `SQLite.get` (7204) | CORE |
| [packages/store/src/store.ts:3411](../../packages/store/src/store.ts#L3411) `Store/designEffect` | `Store.sql` (3411, 3417, 3418, 3421, 3427, 3432, 3435, 3441, 3452, 3453, 3455, 3456, 3469, 3470, 3473, 3475, 3481, 3482, 3483, 3489, 3491, 3495, 3498, 3499, 3501, 3504, 3510, 3512, 3519, 3520, 3522, 3523, 3524, 3525, 3532, 3533, 3535, 3535, 3537, 3538, 3539, 3543, 3547, 3549, 3587, 3589, 3591); `SQLite.prepare` (3421, 3452, 3453, 3469, 3470, 3481, 3482, 3489, 3491, 3495, 3499, 3510, 3512, 3525, 3532, 3533, 3535, 3537, 3539, 3543, 3547); `SQLite.get` (3452, 3469, 3481, 3482, 3495, 3499, 3535, 3543); `SQLite.all` (3532, 3533); `SQLite.iterate` (3537) | CORE |
| [packages/store/src/store.ts:3404](../../packages/store/src/store.ts#L3404) `Store/designEffect/renameExcluded` | `SQLite.prepare` (3404); `Store.sql` (3404) | CORE |
| [packages/store/src/store.ts:3388](../../packages/store/src/store.ts#L3388) `Store/designEffect/renameKey` | `SQLite.prepare` (3388); `Store.sql` (3388) | CORE |
| [packages/store/src/store.ts:3342](../../packages/store/src/store.ts#L3342) `Store/designHistory` | `SQLite.all` (3342); `SQLite.prepare` (3342); `Store.sql` (3342) | CORE |
| [packages/store/src/store.ts:5859](../../packages/store/src/store.ts#L5859) `Store/disableTotp` | `SQLite.prepare` (5859); `Store.sql` (5859) | CORE |
| [packages/store/src/store.ts:3599](../../packages/store/src/store.ts#L3599) `Store/dropColumnIndexes` | `SQLite.all` (3599, 3601); `SQLite.prepare` (3599, 3601); `Store.sql` (3599, 3601, 3602) | CORE |
| [packages/store/src/store.ts:9112](../../packages/store/src/store.ts#L9112) `Store/dropFieldIndex` | `SQLite.get` (9112); `SQLite.prepare` (9112); `Store.sql` (9112, 9113) | CORE |
| [packages/store/src/store.ts:9754](../../packages/store/src/store.ts#L9754) `Store/duplicate` | `Store.row` (9754); `SQLite.prepare` (9772); `Store.sql` (9772) | CORE |
| [packages/store/src/store.ts:8739](../../packages/store/src/store.ts#L8739) `Store/embeddedContainerCount` | `SQLite.prepare` (8739); `Store.sql` (8739); `SQLite.get` (8740) | CORE |
| [packages/store/src/store.ts:8725](../../packages/store/src/store.ts#L8725) `Store/embeddedContainers` | `SQLite.prepare` (8725, 8726); `Store.sql` (8725, 8726); `SQLite.all` (8726); `SQLite.get` (8730) | CORE |
| [packages/store/src/store.ts:3327](../../packages/store/src/store.ts#L3327) `Store/emptyDeleted` | `Store.sql` (3327, 3330, 3331, 3333, 3335); `SQLite.prepare` (3331) | CORE |
| [packages/store/src/store.ts:1935](../../packages/store/src/store.ts#L1935) `Store/endTransaction` | `Store.sql` (1935, 1938, 1938) | CORE |
| [packages/store/src/store.ts:5827](../../packages/store/src/store.ts#L5827) `Store/enrollTotp` | `SQLite.prepare` (5827); `Store.sql` (5827) | CORE |
| [packages/store/src/store.ts:3296](../../packages/store/src/store.ts#L3296) `Store/ensureDeleted` | `Store.sql` (3296) | CORE |
| [packages/store/src/store.ts:1369](../../packages/store/src/store.ts#L1369) `Store/ensureNativeIds` | `SQLite.all` (1369, 1381); `SQLite.prepare` (1369, 1372, 1380, 1381); `Store.sql` (1369, 1372, 1375, 1379, 1380, 1381, 1384, 1386) | CORE |
| [packages/store/src/store.ts:2181](../../packages/store/src/store.ts#L2181) `Store/ensureRecordIdHighWater` | `Store.sql` (2181, 2182, 2184, 2186, 2188) | CORE |
| [packages/store/src/store.ts:2200](../../packages/store/src/store.ts#L2200) `Store/ensureRecordIdMarks` | `SQLite.all` (2200, 2203, 2206, 2215); `SQLite.prepare` (2200, 2203, 2206, 2209, 2215, 2218); `Store.sql` (2200, 2203, 2206, 2209, 2215, 2218, 2222, 2223) | CORE |
| [packages/store/src/store.ts:10086](../../packages/store/src/store.ts#L10086) `Store/evaluateCurrent` | `Store.row` (10086, 10086, 10087, 10087); `Calculations.context` (10092); `Store.get` (10093, 10095) | GATED-STORE |
| [packages/store/src/store.ts:10127](../../packages/store/src/store.ts#L10127) `Store/evaluateEachCurrent` | `Store.row` (10127, 10127, 10132); `Calculations.context` (10133); `Store.get` (10135) | GATED-STORE |
| [packages/store/src/store.ts:10189](../../packages/store/src/store.ts#L10189) `Store/evaluateRowsCurrent` | `Store.row` (10189, 10189, 10190, 10190) | GATED-STORE |
| [packages/store/src/store.ts:10168](../../packages/store/src/store.ts#L10168) `Store/evaluateRowsCurrent/each` | `Calculations.context` (10168); `Store.get` (10170) | GATED-STORE |
| [packages/store/src/store.ts:10204](../../packages/store/src/store.ts#L10204) `Store/evaluateRowsCurrent/found/[Symbol.iterator]` | `rowsById` (10204) | GATED-STORE |
| [packages/store/src/store.ts:10226](../../packages/store/src/store.ts#L10226) `Store/evaluateRowsCurrent/key` | `Calculations.context` (10226) | GATED-STORE |
| [packages/store/src/store.ts:3980](../../packages/store/src/store.ts#L3980) `Store/externalAccount` | `SQLite.all` (3980); `SQLite.prepare` (3980); `Store.sql` (3980) | CORE |
| [packages/store/src/store.ts:8244](../../packages/store/src/store.ts#L8244) `Store/externalContainerCheck` | `SQLite.all` (8244); `SQLite.prepare` (8244); `Store.sql` (8244) | CORE |
| [packages/store/src/store.ts:8251](../../packages/store/src/store.ts#L8251) `Store/externalContainerCount` | `SQLite.get` (8251); `SQLite.prepare` (8251); `Store.sql` (8251) | CORE |
| [packages/store/src/store.ts:8260](../../packages/store/src/store.ts#L8260) `Store/externalContainerReport` | `SQLite.all` (8260, 8273); `SQLite.prepare` (8260, 8273); `Store.sql` (8260, 8273) | CORE |
| [packages/store/src/store.ts:5340](../../packages/store/src/store.ts#L5340) `Store/externalIdentityId` | `SQLite.get` (5340, 5347); `SQLite.prepare` (5340, 5346, 5347); `Store.sql` (5340, 5346, 5347) | CORE |
| [packages/store/src/store.ts:8492](../../packages/store/src/store.ts#L8492) `Store/externalOf` | `SQLite.get` (8492); `SQLite.prepare` (8492); `Store.sql` (8492) | CORE |
| [packages/store/src/store.ts:3077](../../packages/store/src/store.ts#L3077) `Store/failureAuditRoom` | `SQLite.get` (3077); `SQLite.prepare` (3077); `Store.sql` (3077) | CORE |
| [packages/store/src/store.ts:7891](../../packages/store/src/store.ts#L7891) `Store/fieldIndexCurrent` | `SQLite.iterate` (7891); `SQLite.prepare` (7891, 7896); `Store.sql` (7891, 7896); `SQLite.all` (7896) | GATED-STORE |
| [packages/store/src/store.ts:9152](../../packages/store/src/store.ts#L9152) `Store/find` | `Store.find` (9152) | GATED-STORE |
| [packages/store/src/store.ts:9524](../../packages/store/src/store.ts#L9524) `Store/findCandidates` | `Store.query` (9524) | CORE |
| [packages/store/src/store.ts:9163](../../packages/store/src/store.ts#L9163) `Store/findHere` | `Store.query` (9163, 9168, 9170, 9184, 9186, 9197); `Store.recordCount` (9181); `SQLite.get` (9182, 9186); `SQLite.prepare` (9182, 9186, 9192, 9199, 9208); `Store.sql` (9182, 9186, 9192, 9199, 9208); `SQLite.all` (9192, 9199, 9208) | GATED-STORE |
| [packages/store/src/store.ts:9203](../../packages/store/src/store.ts#L9203) `Store/findHere/[Symbol.iterator]` | `SQLite.iterate` (9203); `SQLite.prepare` (9203); `Store.sql` (9203) | GATED-STORE |
| [packages/store/src/store.ts:11001](../../packages/store/src/store.ts#L11001) `Store/findIdsCurrent` | `Store.findIds` (11001) | GATED-STORE |
| [packages/store/src/store.ts:10937](../../packages/store/src/store.ts#L10937) `Store/findIdsCurrentProgress` | `Store.findIdsProgress` (10937); `Store.query` (10939, 10940, 10953, 10955); `Store.recordCount` (10945, 10973); `SQLite.iterate` (10970); `SQLite.prepare` (10970, 10978, 10979); `Store.sql` (10970, 10978, 10979); `SQLite.get` (10982); `SQLite.all` (10988) | GATED-STORE |
| [packages/store/src/store.ts:11007](../../packages/store/src/store.ts#L11007) `Store/findIdsHere` | `Store.query` (11007, 11012, 11014); `SQLite.iterate` (11025); `SQLite.prepare` (11025); `Store.sql` (11025) | GATED-STORE |
| [packages/store/src/store.ts:9468](../../packages/store/src/store.ts#L9468) `Store/findSource` | `Store.query` (9468); `SQLite.all` (9477, 9494); `SQLite.prepare` (9477, 9485, 9493); `Store.sql` (9477, 9482, 9485, 9490, 9493, 9507, 9509); `Calculations.globalValue` (9499); `Calculations.unstoredValue` (9500); `Calculations.related` (9504) | CORE |
| [packages/store/src/store.ts:3189](../../packages/store/src/store.ts#L3189) `Store/flushDeferredSecurity` | `Store.sql` (3189) | CORE |
| [packages/store/src/store.ts:5196](../../packages/store/src/store.ts#L5196) `Store/forgetStandIns` | `SQLite.prepare` (5196); `Store.sql` (5196) | CORE |
| [packages/store/src/store.ts:10480](../../packages/store/src/store.ts#L10480) `Store/forgetStandInValues` | `Store.sql` (10480, 10501); `SQLite.prepare` (10501) | CORE |
| [packages/store/src/store.ts:7772](../../packages/store/src/store.ts#L7772) `Store/foundSetPage` | `rowsById` (7772) | CORE |
| [packages/store/src/store.ts:7788](../../packages/store/src/store.ts#L7788) `Store/foundSetRowsCurrent` | `Store.viewableIds` (7788); `Store.row` (7804) | GATED-STORE |
| [packages/store/src/store.ts:3898](../../packages/store/src/store.ts#L3898) `Store/gateAgentWrite` | `SQLite.get` (3898); `SQLite.prepare` (3898, 3900); `Store.sql` (3898, 3900) | CORE |
| [packages/store/src/store.ts:6134](../../packages/store/src/store.ts#L6134) `Store/generateRecoveryCodes` | `SQLite.prepare` (6134, 6137); `Store.sql` (6134, 6137) | CORE |
| [packages/store/src/store.ts:9596](../../packages/store/src/store.ts#L9596) `Store/getCurrent` | `Store.get` (9596); `Store.row` (9597, 9597, 9611); `SQLite.all` (9614); `SQLite.prepare` (9614); `Store.sql` (9614) | GATED-STORE |
| [packages/store/src/store.ts:9634](../../packages/store/src/store.ts#L9634) `Store/getManyCurrent` | `Store.getMany` (9634); `SQLite.get` (9652); `SQLite.prepare` (9652); `Store.sql` (9652) | GATED-STORE |
| [packages/store/src/store.ts:9645](../../packages/store/src/store.ts#L9645) `Store/getManyCurrent/[Symbol.iterator]` | `rowsById` (9645) | GATED-STORE |
| [packages/store/src/store.ts:1416](../../packages/store/src/store.ts#L1416) `Store/grantFullAccessClients` | `SQLite.prepare` (1416); `Store.sql` (1416) | CORE |
| [packages/store/src/store.ts:11042](../../packages/store/src/store.ts#L11042) `Store/groupSummariesCurrent` | `Store.groupSummaries` (11042); `Store.viewableIds` (11047); `Calculations.collect` (11063); `rowsById` (11063, 11113); `Calculations.collector` (11085) | GATED-STORE |
| [packages/store/src/store.ts:11111](../../packages/store/src/store.ts#L11111) `Store/groupSummariesCurrent/flush` | `Calculations.collector` (11111) | GATED-STORE |
| [packages/store/src/store.ts:11075](../../packages/store/src/store.ts#L11075) `Store/groupSummariesCurrent/key` | `Calculations.value` (11075); `Calculations.related` (11077) | GATED-STORE |
| [packages/store/src/store.ts:1443](../../packages/store/src/store.ts#L1443) `Store/hasOwnPassword` | `SQLite.get` (1443); `SQLite.prepare` (1443); `Store.sql` (1443) | CORE |
| [packages/store/src/store.ts:5989](../../packages/store/src/store.ts#L5989) `Store/hasPasskey` | `SQLite.get` (5989); `SQLite.prepare` (5989); `Store.sql` (5989) | CORE |
| [packages/store/src/store.ts:1424](../../packages/store/src/store.ts#L1424) `Store/hasProvingPassword` | `SQLite.get` (1424); `SQLite.prepare` (1424); `Store.sql` (1424) | CORE |
| [packages/store/src/store.ts:9066](../../packages/store/src/store.ts#L9066) `Store/hasTable` | `SQLite.get` (9066); `SQLite.prepare` (9066); `Store.sql` (9066) | CORE |
| [packages/store/src/store.ts:5848](../../packages/store/src/store.ts#L5848) `Store/hasTotp` | `SQLite.get` (5848); `SQLite.prepare` (5848); `Store.sql` (5848) | CORE |
| [packages/store/src/store.ts:5319](../../packages/store/src/store.ts#L5319) `Store/identityAllowed` | `SQLite.get` (5319, 5325, 5331); `SQLite.prepare` (5319, 5325, 5331); `Store.sql` (5319, 5325, 5331) | CORE |
| [packages/store/src/store.ts:7239](../../packages/store/src/store.ts#L7239) `Store/image` | `SQLite.get` (7239); `SQLite.prepare` (7239); `Store.sql` (7239) | CORE |
| [packages/store/src/store.ts:7249](../../packages/store/src/store.ts#L7249) `Store/images` | `SQLite.all` (7249); `SQLite.prepare` (7249); `Store.sql` (7249) | CORE |
| [packages/store/src/store.ts:5040](../../packages/store/src/store.ts#L5040) `Store/importAccounts` | `SQLite.all` (5040); `SQLite.prepare` (5040); `Store.sql` (5040) | CORE |
| [packages/store/src/store.ts:1757](../../packages/store/src/store.ts#L1757) `Store/independentWindowWrite` | `SQLite.get` (1757); `SQLite.prepare` (1757, 1765, 1825); `Store.sql` (1757, 1765, 1775, 1803, 1820, 1825, 1828); `SQLite.all` (1765); `Store.row` (1823) | CORE |
| [packages/store/src/store.ts:9078](../../packages/store/src/store.ts#L9078) `Store/indexedFields` | `SQLite.all` (9078, 9079); `SQLite.prepare` (9078, 9079); `Store.sql` (9078, 9079) | CORE |
| [packages/store/src/store.ts:11466](../../packages/store/src/store.ts#L11466) `Store/internalRoots` | `SQLite.get` (11466); `SQLite.prepare` (11466, 11468); `SQLite.all` (11468) | CORE |
| [packages/store/src/store.ts:3686](../../packages/store/src/store.ts#L3686) `Store/isAgent` | `SQLite.get` (3686); `SQLite.prepare` (3686); `Store.sql` (3686) | CORE |
| [packages/store/src/store.ts:3789](../../packages/store/src/store.ts#L3789) `Store/isExternal` | `SQLite.get` (3789); `SQLite.prepare` (3789); `Store.sql` (3789) | CORE |
| [packages/store/src/store.ts:5903](../../packages/store/src/store.ts#L5903) `Store/issueWebauthnChallenge` | `SQLite.prepare` (5903, 5905, 5906, 5908); `Store.sql` (5903, 5905, 5906, 5908); `SQLite.get` (5905) | CORE |
| [packages/store/src/store.ts:11327](../../packages/store/src/store.ts#L11327) `Store/iterateCommitted` | `SQLite.iterate` (11327) | CORE |
| [packages/store/src/store.ts:1697](../../packages/store/src/store.ts#L1697) `Store/joinTransaction` | `Store.sql` (1697, 1698, 1700, 1702, 1708, 1711) | CORE |
| [packages/store/src/store.ts:10713](../../packages/store/src/store.ts#L10713) `Store/keyStepWork` | `Store.sql` (10713, 10719, 10723, 10725) | CORE |
| [packages/store/src/store.ts:7055](../../packages/store/src/store.ts#L7055) `Store/knownSharedAccount` | `SQLite.get` (7055); `SQLite.prepare` (7055); `Store.sql` (7055) | CORE |
| [packages/store/src/store.ts:4513](../../packages/store/src/store.ts#L4513) `Store/lastSignIns` | `Store.auditLog` (4513) | CORE |
| [packages/store/src/store.ts:10531](../../packages/store/src/store.ts#L10531) `Store/latestDeleteSeq` | `SQLite.get` (10531); `SQLite.prepare` (10531); `Store.sql` (10531) | CORE |
| [packages/store/src/store.ts:7279](../../packages/store/src/store.ts#L7279) `Store/layout` | `SQLite.get` (7279); `SQLite.prepare` (7279); `Store.sql` (7279) | CORE |
| [packages/store/src/store.ts:3359](../../packages/store/src/store.ts#L3359) `Store/layoutHistory` | `SQLite.all` (3359); `SQLite.prepare` (3359); `Store.sql` (3359) | CORE |
| [packages/store/src/store.ts:7169](../../packages/store/src/store.ts#L7169) `Store/layouts` | `SQLite.all` (7169); `SQLite.prepare` (7169); `Store.sql` (7169) | CORE |
| [packages/store/src/store.ts:4813](../../packages/store/src/store.ts#L4813) `Store/leastPrivilege` | `SQLite.all` (4813); `SQLite.prepare` (4813); `Store.sql` (4813) | CORE |
| [packages/store/src/store.ts:5417](../../packages/store/src/store.ts#L5417) `Store/ledgerRow` | `SQLite.get` (5417, 5418); `SQLite.prepare` (5417, 5418); `Store.sql` (5417, 5418) | AUTH |
| [packages/store/src/store.ts:5429](../../packages/store/src/store.ts#L5429) `Store/ledgerWrite` | `Store.sql` (5429, 5430, 5432, 5434, 5437, 5437) | AUTH |
| [packages/store/src/store.ts:5123](../../packages/store/src/store.ts#L5123) `Store/limitAccountImport` | `SQLite.prepare` (5123, 5124, 5127); `Store.sql` (5123, 5124, 5127); `SQLite.get` (5124) | CORE |
| [packages/store/src/store.ts:3639](../../packages/store/src/store.ts#L3639) `Store/linkIdentity` | `SQLite.get` (3639); `SQLite.prepare` (3639); `Store.sql` (3639) | CORE |
| [packages/store/src/store.ts:3631](../../packages/store/src/store.ts#L3631) `Store/linkPrincipal` | `SQLite.get` (3631); `SQLite.prepare` (3631); `Store.sql` (3631) | CORE |
| [packages/store/src/store.ts:4399](../../packages/store/src/store.ts#L4399) `Store/markPiiField` | `SQLite.prepare` (4399); `Store.sql` (4399) | CORE |
| [packages/store/src/store.ts:8217](../../packages/store/src/store.ts#L8217) `Store/markRepeating` | `SQLite.prepare` (8217); `Store.sql` (8217) | CORE |
| [packages/store/src/store.ts:11260](../../packages/store/src/store.ts#L11260) `Store/matchIds` | `Store.matchIds` (11260); `SQLite.all` (11266); `SQLite.prepare` (11266); `Store.sql` (11266) | CORE |
| [packages/store/src/store.ts:1458](../../packages/store/src/store.ts#L1458) `Store/meta` | `SQLite.get` (1458); `SQLite.prepare` (1458); `Store.sql` (1458) | CORE |
| [packages/store/src/store.ts:1008](../../packages/store/src/store.ts#L1008) `Store/metadataVersions` | `SQLite.get` (1008); `SQLite.prepare` (1008); `Store.sql` (1008) | CORE |
| [packages/store/src/store.ts:8854](../../packages/store/src/store.ts#L8854) `Store/moveContainersIn` | `Store.sql` (8854, 8860, 8862, 8863, 8864, 8865, 8885, 8890, 8890, 8901, 8904, 8907, 8914); `SQLite.prepare` (8862, 8863, 8864, 8865, 8901, 8907); `SQLite.get` (8867, 8901, 8907) | CORE |
| [packages/store/src/store.ts:8776](../../packages/store/src/store.ts#L8776) `Store/moveContainersOut` | `Store.sql` (8776, 8784, 8786, 8788, 8793, 8794, 8814, 8820, 8822, 8824, 8824, 8830, 8830, 8835, 8837, 8839, 8839, 8845); `SQLite.get` (8784); `SQLite.prepare` (8784, 8793, 8794); `Store.container` (8796) | CORE |
| [packages/store/src/store.ts:4994](../../packages/store/src/store.ts#L4994) `Store/mustChangePassword` | `SQLite.get` (4994); `SQLite.prepare` (4994); `Store.sql` (4994) | CORE |
| [packages/store/src/store.ts:1394](../../packages/store/src/store.ts#L1394) `Store/nativeIdGuards` | `Store.sql` (1394, 1395, 1397) | CORE |
| [packages/store/src/store.ts:2236](../../packages/store/src/store.ts#L2236) `Store/nextRecordId` | `SQLite.get` (2236); `SQLite.prepare` (2236); `Store.sql` (2236) | CORE |
| [packages/store/src/store.ts:5723](../../packages/store/src/store.ts#L5723) `Store/objectUseSince` | `SQLite.get` (5723); `SQLite.prepare` (5723); `Store.sql` (5723) | CORE |
| [packages/store/src/store.ts:9038](../../packages/store/src/store.ts#L9038) `Store/orderBy` | `Store.valueListItems` (9038) | CORE |
| [packages/store/src/store.ts:8409](../../packages/store/src/store.ts#L8409) `Store/orphanContainerReport` | `SQLite.all` (8409); `SQLite.prepare` (8409); `Store.sql` (8409) | CORE |
| [packages/store/src/store.ts:5955](../../packages/store/src/store.ts#L5955) `Store/passkeyAllowList` | `SQLite.all` (5955); `SQLite.prepare` (5955); `Store.sql` (5955) | CORE |
| [packages/store/src/store.ts:5994](../../packages/store/src/store.ts#L5994) `Store/passkeyIds` | `SQLite.all` (5994); `SQLite.prepare` (5994); `Store.sql` (5994) | CORE |
| [packages/store/src/store.ts:5982](../../packages/store/src/store.ts#L5982) `Store/passkeys` | `SQLite.all` (5982); `SQLite.prepare` (5982); `Store.sql` (5982) | CORE |
| [packages/store/src/store.ts:5033](../../packages/store/src/store.ts#L5033) `Store/passwordDaysRemaining` | `SQLite.get` (5033); `SQLite.prepare` (5033); `Store.sql` (5033) | CORE |
| [packages/store/src/store.ts:7013](../../packages/store/src/store.ts#L7013) `Store/passwordState` | `SQLite.get` (7013); `SQLite.prepare` (7013); `Store.sql` (7013) | CORE |
| [packages/store/src/store.ts:3922](../../packages/store/src/store.ts#L3922) `Store/pendingChanges` | `SQLite.all` (3922); `SQLite.prepare` (3922); `Store.sql` (3922) | CORE |
| [packages/store/src/store.ts:1476](../../packages/store/src/store.ts#L1476) `Store/persistentData` | `SQLite.get` (1476) | CORE |
| [packages/store/src/store.ts:1485](../../packages/store/src/store.ts#L1485) `Store/persistentDataIds` | `SQLite.all` (1485) | CORE |
| [packages/store/src/store.ts:1466](../../packages/store/src/store.ts#L1466) `Store/persistentTable` | `Store.sql` (1466) | CORE |
| [packages/store/src/store.ts:10374](../../packages/store/src/store.ts#L10374) `Store/portalContainerTarget` | `Store.row` (10374); `relatedIdList` (10376) | CORE |
| [packages/store/src/store.ts:7827](../../packages/store/src/store.ts#L7827) `Store/portalCountsCurrent` | `Store.canView` (7827); `Store.row` (7854) | GATED-STORE |
| [packages/store/src/store.ts:8072](../../packages/store/src/store.ts#L8072) `Store/portalRows` | `relatedRows` (8072); `relatedIdList` (8073); `Store.viewableSet` (8076); `rowsById` (8101, 8139); `Calculations.related` (8115) | CORE |
| [packages/store/src/store.ts:8083](../../packages/store/src/store.ts#L8083) `Store/portalRows/context` | `Calculations.context` (8083) | CORE |
| [packages/store/src/store.ts:8093](../../packages/store/src/store.ts#L8093) `Store/portalRows/valueOf` | `Calculations.value` (8093) | CORE |
| [packages/store/src/store.ts:2612](../../packages/store/src/store.ts#L2612) `Store/prepared` | `SQLite.prepare` (2612); `Store.sql` (2612) | CORE |
| [packages/store/src/store.ts:5105](../../packages/store/src/store.ts#L5105) `Store/previewAccountImport` | `Store.sql` (5105, 5106, 5115) | CORE |
| [packages/store/src/store.ts:6811](../../packages/store/src/store.ts#L6811) `Store/previewRecordRuleCurrent` | `SQLite.get` (6811); `SQLite.prepare` (6811, 6814); `Store.sql` (6811, 6814); `SQLite.all` (6814); `Calculations.context` (6820, 6836) | CORE |
| [packages/store/src/store.ts:9559](../../packages/store/src/store.ts#L9559) `Store/previewRow` | `Store.row` (9559) | CORE |
| [packages/store/src/store.ts:6209](../../packages/store/src/store.ts#L6209) `Store/privilegeSets` | `Store.sql` (6209) | CORE |
| [packages/store/src/store.ts:2844](../../packages/store/src/store.ts#L2844) `Store/pruneAudit` | `Store.sql` (2844, 2846, 2848); `SQLite.get` (2846); `SQLite.prepare` (2846) | CORE |
| [packages/store/src/store.ts:8444](../../packages/store/src/store.ts#L8444) `Store/purgeOrphanContainers` | `Store.sql` (8444, 8448, 8457, 8460, 8461, 8466, 8467, 8469, 8469); `Store.orphanContainerReport` (8452); `SQLite.get` (8457); `SQLite.prepare` (8457, 8460, 8461) | CORE |
| [packages/store/src/store.ts:11589](../../packages/store/src/store.ts#L11589) `Store/query` | `SQLite.iterate` (11589) | CORE |
| [packages/store/src/store.ts:11629](../../packages/store/src/store.ts#L11629) `Store/queryWithOriginsCurrent` | `SQLite.iterate` (11629); `SQLite.all` (11638, 11641); `SQLite.prepare` (11638, 11641) | CORE |
| [packages/store/src/store.ts:11378](../../packages/store/src/store.ts#L11378) `Store/readOnlyChecked` | `SQLite.prepare` (11378, 11382, 11391, 11396); `SQLite.all` (11382, 11391, 11396) | CORE |
| [packages/store/src/store.ts:3611](../../packages/store/src/store.ts#L3611) `Store/recompute` | `SQLite.prepare` (3611, 3615); `Store.sql` (3611, 3615); `SQLite.iterate` (3615); `Calculations.computeStoredStyled` (3616); `Calculations.value` (3616) | CORE |
| [packages/store/src/store.ts:2627](../../packages/store/src/store.ts#L2627) `Store/recordAsOf` | `SQLite.get` (2627, 2629); `SQLite.prepare` (2627, 2629, 2631, 2632); `Store.sql` (2627, 2629, 2631, 2632); `SQLite.all` (2631, 2632) | CORE |
| [packages/store/src/store.ts:2323](../../packages/store/src/store.ts#L2323) `Store/recordCount` | `SQLite.get` (2323); `SQLite.prepare` (2323); `Store.sql` (2323) | CORE |
| [packages/store/src/store.ts:1523](../../packages/store/src/store.ts#L1523) `Store/recordedFormat` | `Store.sql` (1523) | CORE |
| [packages/store/src/store.ts:2704](../../packages/store/src/store.ts#L2704) `Store/recordLife` | `SQLite.all` (2704); `SQLite.prepare` (2704); `Store.sql` (2704) | CORE |
| [packages/store/src/store.ts:5654](../../packages/store/src/store.ts#L5654) `Store/recordObjectUse` | `Store.sql` (5654) | CORE |
| [packages/store/src/store.ts:10076](../../packages/store/src/store.ts#L10076) `Store/recordViewable` | `Store.row` (10076) | GATED-STORE |
| [packages/store/src/store.ts:8748](../../packages/store/src/store.ts#L8748) `Store/recoverContainersOut` | `SQLite.prepare` (8748); `Store.sql` (8748); `SQLite.get` (8751) | CORE |
| [packages/store/src/store.ts:1626](../../packages/store/src/store.ts#L1626) `Store/recoverPendingExternalFiles` | `Store.sql` (1626, 1628, 1652, 1654); `SQLite.prepare` (1628); `SQLite.get` (1639) | CORE |
| [packages/store/src/store.ts:6152](../../packages/store/src/store.ts#L6152) `Store/recoveryCodesRemaining` | `SQLite.get` (6152); `SQLite.prepare` (6152); `Store.sql` (6152) | CORE |
| [packages/store/src/store.ts:11418](../../packages/store/src/store.ts#L11418) `Store/refreshDecimalSqlViews` | `SQLite.get` (11418); `SQLite.prepare` (11418) | CORE |
| [packages/store/src/store.ts:3780](../../packages/store/src/store.ts#L3780) `Store/refuseLookalikeAccount` | `SQLite.all` (3780); `SQLite.prepare` (3780); `Store.sql` (3780) | CORE |
| [packages/store/src/store.ts:6018](../../packages/store/src/store.ts#L6018) `Store/registerPasskey` | `SQLite.prepare` (6018); `Store.sql` (6018) | CORE |
| [packages/store/src/store.ts:3958](../../packages/store/src/store.ts#L3958) `Store/rejectPending` | `SQLite.get` (3958); `SQLite.prepare` (3958, 3960); `Store.sql` (3958, 3960) | CORE |
| [packages/store/src/store.ts:9311](../../packages/store/src/store.ts#L9311) `Store/relatedCriteria` | `SQLite.iterate` (9311); `SQLite.prepare` (9311); `Store.sql` (9311) | CORE |
| [packages/store/src/store.ts:9308](../../packages/store/src/store.ts#L9308) `Store/relatedCriteria/matched` | `relatedRows` (9308) | CORE |
| [packages/store/src/store.ts:7614](../../packages/store/src/store.ts#L7614) `Store/relatedValues` | `Calculations.globalValue` (7614); `Calculations.unstoredValue` (7616) | CORE |
| [packages/store/src/store.ts:6031](../../packages/store/src/store.ts#L6031) `Store/removePasskey` | `SQLite.get` (6031); `SQLite.prepare` (6031, 6032); `Store.sql` (6031, 6032) | CORE |
| [packages/store/src/store.ts:9137](../../packages/store/src/store.ts#L9137) `Store/reportFind` | `Store.query` (9137, 9139, 9140); `Store.recordCount` (9142) | CORE |
| [packages/store/src/store.ts:10551](../../packages/store/src/store.ts#L10551) `Store/restoreDeletedRowLocked` | `SQLite.get` (10551, 10556); `SQLite.prepare` (10551, 10552, 10556, 10566); `Store.sql` (10551, 10552, 10556, 10566); `SQLite.all` (10552) | CORE |
| [packages/store/src/store.ts:2662](../../packages/store/src/store.ts#L2662) `Store/restoreRecord` | `Store.recordAsOf` (2662); `SQLite.get` (2666); `SQLite.prepare` (2666, 2671, 2680, 2691); `Store.sql` (2666, 2671, 2680, 2691) | CORE |
| [packages/store/src/store.ts:2720](../../packages/store/src/store.ts#L2720) `Store/revertAuditEntry` | `SQLite.get` (2720); `SQLite.prepare` (2720); `Store.sql` (2720); `Store.canViewRecord` (2722); `Store.auditLog` (2725) | CORE |
| [packages/store/src/store.ts:5779](../../packages/store/src/store.ts#L5779) `Store/revokeApiToken` | `SQLite.prepare` (5779); `Store.sql` (5779) | CORE |
| [packages/store/src/store.ts:5302](../../packages/store/src/store.ts#L5302) `Store/revokeSignInCredentials` | `SQLite.prepare` (5302, 5303, 5304); `Store.sql` (5302, 5303, 5304) | AUTH |
| [packages/store/src/store.ts:9577](../../packages/store/src/store.ts#L9577) `Store/row` | `SQLite.get` (9577) | CORE |
| [packages/store/src/store.ts:11522](../../packages/store/src/store.ts#L11522) `Store/rowsOf` | `SQLite.iterate` (11522, 11531) | CORE |
| [packages/store/src/store.ts:6616](../../packages/store/src/store.ts#L6616) `Store/ruleOutcome` | `Calculations.context` (6616) | CORE |
| [packages/store/src/store.ts:9422](../../packages/store/src/store.ts#L9422) `Store/runningSummaryValues` | `Store.viewableIds` (9422); `rowsById` (9424); `Calculations.value` (9435, 9441); `Calculations.related` (9452) | GATED-STORE |
| [packages/store/src/store.ts:6238](../../packages/store/src/store.ts#L6238) `Store/savePrivilegeSet` | `SQLite.prepare` (6238, 6246); `Store.sql` (6238, 6246) | AUTH |
| [packages/store/src/store.ts:4193](../../packages/store/src/store.ts#L4193) `Store/saveScriptTest` | `SQLite.prepare` (4193); `Store.sql` (4193) | CORE |
| [packages/store/src/store.ts:6776](../../packages/store/src/store.ts#L6776) `Store/scopedTableSql` | `Store.viewableIds` (6776); `SQLite.all` (6779); `SQLite.prepare` (6779); `Store.sql` (6779) | GATED-STORE |
| [packages/store/src/store.ts:3349](../../packages/store/src/store.ts#L3349) `Store/scriptHistory` | `SQLite.all` (3349); `SQLite.prepare` (3349); `Store.sql` (3349) | CORE |
| [packages/store/src/store.ts:1602](../../packages/store/src/store.ts#L1602) `Store/securityChainHeadAudit` | `SQLite.get` (1602); `SQLite.prepare` (1602); `Store.sql` (1602) | CORE |
| [packages/store/src/store.ts:3022](../../packages/store/src/store.ts#L3022) `Store/securityChange` | `Store.sql` (3022, 3024); `SQLite.prepare` (3024) | CORE |
| [packages/store/src/store.ts:2586](../../packages/store/src/store.ts#L2586) `Store/securityEvents` | `Store.auditLog` (2586) | CORE |
| [packages/store/src/store.ts:5503](../../packages/store/src/store.ts#L5503) `Store/securityToken` | `SQLite.get` (5503); `SQLite.prepare` (5503); `Store.sql` (5503) | CORE |
| [packages/store/src/store.ts:11552](../../packages/store/src/store.ts#L11552) `Store/selectHeldCurrent` | `Store.sql` (11552, 11554, 11557); `SQLite.prepare` (11554) | CORE |
| [packages/store/src/store.ts:10856](../../packages/store/src/store.ts#L10856) `Store/selectIdsCurrent` | `Store.selectIds` (10856); `SQLite.all` (10862); `SQLite.prepare` (10862); `Store.sql` (10862) | GATED-STORE |
| [packages/store/src/store.ts:11542](../../packages/store/src/store.ts#L11542) `Store/selectIn` | `Store.select` (11542) | CORE |
| [packages/store/src/store.ts:1989](../../packages/store/src/store.ts#L1989) `Store/selfContainedCopy` | `Store.sql` (1989); `SQLite.all` (1994); `SQLite.prepare` (1994, 1996, 1997, 1998) | CORE |
| [packages/store/src/store.ts:5281](../../packages/store/src/store.ts#L5281) `Store/setAccountActive` | `SQLite.prepare` (5281, 5289, 5290); `Store.sql` (5281, 5289, 5290) | AUTH |
| [packages/store/src/store.ts:5522](../../packages/store/src/store.ts#L5522) `Store/setAccountLocalOnly` | `SQLite.prepare` (5522); `Store.sql` (5522) | CORE |
| [packages/store/src/store.ts:6394](../../packages/store/src/store.ts#L6394) `Store/setAccountPrivilegeSet` | `SQLite.get` (6394); `SQLite.prepare` (6394, 6397, 6401); `Store.sql` (6394, 6397, 6401) | AUTH |
| [packages/store/src/store.ts:5531](../../packages/store/src/store.ts#L5531) `Store/setAccountRequire2fa` | `SQLite.prepare` (5531); `Store.sql` (5531) | CORE |
| [packages/store/src/store.ts:3810](../../packages/store/src/store.ts#L3810) `Store/setAgentAccount` | `SQLite.get` (3810); `SQLite.prepare` (3810, 3816); `Store.sql` (3810, 3816) | CORE |
| [packages/store/src/store.ts:4272](../../packages/store/src/store.ts#L4272) `Store/setAiAllowed` | `SQLite.prepare` (4272); `Store.sql` (4272) | CORE |
| [packages/store/src/store.ts:4357](../../packages/store/src/store.ts#L4357) `Store/setAiPolicy` | `SQLite.prepare` (4357); `Store.sql` (4357) | CORE |
| [packages/store/src/store.ts:7042](../../packages/store/src/store.ts#L7042) `Store/setAllowBlankPasswordFromLan` | `SQLite.prepare` (7042); `Store.sql` (7042) | CORE |
| [packages/store/src/store.ts:2822](../../packages/store/src/store.ts#L2822) `Store/setAuditSettings` | `SQLite.prepare` (2822); `Store.sql` (2822) | CORE |
| [packages/store/src/store.ts:8967](../../packages/store/src/store.ts#L8967) `Store/setContainer` | `Store.sql` (8967); `Store.row` (8973) | CORE |
| [packages/store/src/store.ts:3762](../../packages/store/src/store.ts#L3762) `Store/setExternalAccount` | `SQLite.get` (3762); `SQLite.prepare` (3762, 3767); `Store.sql` (3762, 3767) | CORE |
| [packages/store/src/store.ts:4980](../../packages/store/src/store.ts#L4980) `Store/setMustChangePassword` | `SQLite.prepare` (4980); `Store.sql` (4980) | CORE |
| [packages/store/src/store.ts:4017](../../packages/store/src/store.ts#L4017) `Store/setPasswordOnly` | `SQLite.get` (4017); `SQLite.prepare` (4017, 4023, 4032, 4039, 4040, 4041); `Store.sql` (4017, 4023, 4032, 4039, 4040, 4041) | AUTH |
| [packages/store/src/store.ts:4134](../../packages/store/src/store.ts#L4134) `Store/setPasswordPolicy` | `SQLite.prepare` (4134); `Store.sql` (4134) | CORE |
| [packages/store/src/store.ts:1491](../../packages/store/src/store.ts#L1491) `Store/setPersistentData` | `SQLite.prepare` (1491, 1495); `Store.sql` (1491, 1495) | CORE |
| [packages/store/src/store.ts:4377](../../packages/store/src/store.ts#L4377) `Store/setPiiIsolation` | `SQLite.prepare` (4377); `Store.sql` (4377) | CORE |
| [packages/store/src/store.ts:4170](../../packages/store/src/store.ts#L4170) `Store/setRequireTotpForFullAccess` | `SQLite.prepare` (4170); `Store.sql` (4170) | CORE |
| [packages/store/src/store.ts:4289](../../packages/store/src/store.ts#L4289) `Store/setScriptNetwork` | `SQLite.prepare` (4289); `Store.sql` (4289) | CORE |
| [packages/store/src/store.ts:4346](../../packages/store/src/store.ts#L4346) `Store/setSqlRequiresFmxdbc` | `SQLite.prepare` (4346); `Store.sql` (4346) | CORE |
| [packages/store/src/store.ts:9997](../../packages/store/src/store.ts#L9997) `Store/setStoredCalcValues` | `SQLite.prepare` (9997, 9998); `Store.sql` (9997, 9998); `SQLite.get` (10002) | CORE |
| [packages/store/src/store.ts:5456](../../packages/store/src/store.ts#L5456) `Store/settleSignIns` | `SQLite.all` (5456, 5462); `SQLite.prepare` (5456, 5462, 5468, 5472, 5474); `Store.sql` (5456, 5462, 5468, 5472, 5474) | AUTH |
| [packages/store/src/store.ts:9070](../../packages/store/src/store.ts#L9070) `Store/setUserPref` | `Store.sql` (9070, 9071, 9072); `SQLite.prepare` (9071, 9072) | CORE |
| [packages/store/src/store.ts:4330](../../packages/store/src/store.ts#L4330) `Store/setWebViewerHosts` | `SQLite.prepare` (4330); `Store.sql` (4330) | CORE |
| [packages/store/src/store.ts:2120](../../packages/store/src/store.ts#L2120) `Store/shareResults` | `Store.sql` (2120) | CORE |
| [packages/store/src/store.ts:1553](../../packages/store/src/store.ts#L1553) `Store/shipWal` | `Store.sql` (1553) | CORE |
| [packages/store/src/store.ts:5403](../../packages/store/src/store.ts#L5403) `Store/signInBase` | `SQLite.get` (5403); `SQLite.prepare` (5403); `Store.sql` (5403) | AUTH |
| [packages/store/src/store.ts:5405](../../packages/store/src/store.ts#L5405) `Store/signInBase/identity` | `SQLite.get` (5405); `SQLite.prepare` (5405); `Store.sql` (5405) | AUTH |
| [packages/store/src/store.ts:5392](../../packages/store/src/store.ts#L5392) `Store/signInMark` | `SQLite.prepare` (5392); `Store.sql` (5392) | AUTH |
| [packages/store/src/store.ts:9236](../../packages/store/src/store.ts#L9236) `Store/sortedPage` | `SQLite.iterate` (9236); `SQLite.prepare` (9236, 9251); `Store.sql` (9236, 9251); `SQLite.all` (9251) | CORE |
| [packages/store/src/store.ts:11154](../../packages/store/src/store.ts#L11154) `Store/sortIdsCurrentProgress` | `Store.sortIds` (11154); `Store.sortIdsProgress` (11154); `SQLite.all` (11167); `SQLite.prepare` (11167, 11246); `Store.sql` (11167, 11246); `Store.valueListItems` (11175); `rowsById` (11187); `Calculations.globalValue` (11190); `Calculations.unstoredValue` (11191); `Calculations.related` (11197); `SQLite.iterate` (11246) | GATED-STORE |
| [packages/store/src/store.ts:11332](../../packages/store/src/store.ts#L11332) `Store/storedFileId` | `SQLite.get` (11332); `SQLite.prepare` (11332) | CORE |
| [packages/store/src/store.ts:9384](../../packages/store/src/store.ts#L9384) `Store/summaries` | `Calculations.wholeTable` (9384); `Calculations.collect` (9404, 9409) | CORE |
| [packages/store/src/store.ts:9400](../../packages/store/src/store.ts#L9400) `Store/summaries/recs` | `SQLite.iterate` (9400); `SQLite.prepare` (9400); `Store.sql` (9400) | CORE |
| [packages/store/src/store.ts:5969](../../packages/store/src/store.ts#L5969) `Store/takeWebauthnChallenge` | `SQLite.get` (5969); `SQLite.prepare` (5969, 5973); `Store.sql` (5969, 5973) | CORE |
| [packages/store/src/store.ts:7226](../../packages/store/src/store.ts#L7226) `Store/themes` | `SQLite.get` (7226) | CORE |
| [packages/store/src/store.ts:9123](../../packages/store/src/store.ts#L9123) `Store/timeFind` | `Store.query` (9123) | CORE |
| [packages/store/src/store.ts:7551](../../packages/store/src/store.ts#L7551) `Store/toRecord` | `Calculations.value` (7551, 7561); `Calculations.globalValue` (7555); `Calculations.unstoredStyled` (7560) | CORE |
| [packages/store/src/store.ts:5853](../../packages/store/src/store.ts#L5853) `Store/totpAccounts` | `SQLite.all` (5853); `SQLite.prepare` (5853); `Store.sql` (5853) | CORE |
| [packages/store/src/store.ts:1565](../../packages/store/src/store.ts#L1565) `Store/trial` | `Store.sql` (1565) | CORE |
| [packages/store/src/store.ts:1570](../../packages/store/src/store.ts#L1570) `Store/trial/undo` | `Store.sql` (1570) | CORE |
| [packages/store/src/store.ts:11288](../../packages/store/src/store.ts#L11288) `Store/truncate/run` | `Store.sql` (11288, 11290, 11297, 11299, 11301, 11302); `SQLite.prepare` (11290, 11297); `SQLite.all` (11292) | CORE |
| [packages/store/src/store.ts:3709](../../packages/store/src/store.ts#L3709) `Store/unmigratedAccounts` | `SQLite.all` (3709); `SQLite.prepare` (3709); `Store.sql` (3709) | CORE |
| [packages/store/src/store.ts:4886](../../packages/store/src/store.ts#L4886) `Store/unusedAccess` | `SQLite.get` (4886); `SQLite.prepare` (4886, 4895); `Store.sql` (4886, 4895); `SQLite.all` (4895) | CORE |
| [packages/store/src/store.ts:4934](../../packages/store/src/store.ts#L4934) `Store/unusedObjects` | `SQLite.get` (4934); `SQLite.prepare` (4934, 4937); `Store.sql` (4934, 4937); `SQLite.all` (4937) | CORE |
| [packages/store/src/store.ts:6093](../../packages/store/src/store.ts#L6093) `Store/unusedRecoveryHashes` | `SQLite.all` (6093); `SQLite.prepare` (6093); `Store.sql` (6093) | CORE |
| [packages/store/src/store.ts:4716](../../packages/store/src/store.ts#L4716) `Store/unusualAccess` | `Store.auditLog` (4716, 4782) | CORE |
| [packages/store/src/store.ts:9818](../../packages/store/src/store.ts#L9818) `Store/update` | `Store.row` (9818); `Store.sql` (9849, 9850, 9889, 9892) | CORE |
| [packages/store/src/store.ts:9852](../../packages/store/src/store.ts#L9852) `Store/update/undo` | `Store.sql` (9852) | CORE |
| [packages/store/src/store.ts:10282](../../packages/store/src/store.ts#L10282) `Store/updatePortals` | `Store.row` (10282, 10318); `relatedRows` (10319) | CORE |
| [packages/store/src/store.ts:10292](../../packages/store/src/store.ts#L10292) `Store/updatePortals/portal/related` | `relatedIdList` (10292) | CORE |
| [packages/store/src/store.ts:10264](../../packages/store/src/store.ts#L10264) `Store/updateRelated` | `relatedRows` (10264) | CORE |
| [packages/store/src/store.ts:4972](../../packages/store/src/store.ts#L4972) `Store/usageCounting` | `SQLite.get` (4972); `SQLite.prepare` (4972); `Store.sql` (4972) | CORE |
| [packages/store/src/store.ts:9061](../../packages/store/src/store.ts#L9061) `Store/userPrefs` | `SQLite.all` (9061); `SQLite.prepare` (9061); `Store.sql` (9061) | CORE |
| [packages/store/src/store.ts:7943](../../packages/store/src/store.ts#L7943) `Store/valueListItemsCurrent` | `Store.valueListItems` (7943); `Store.get` (7957); `relatedRows` (7958); `Store.row` (7958); `SQLite.iterate` (7960); `SQLite.prepare` (7960); `Store.sql` (7960); `Calculations.related` (7970); `Calculations.value` (7974, 7975) | GATED-STORE |
| [packages/store/src/store.ts:10473](../../packages/store/src/store.ts#L10473) `Store/vaultHeld` | `SQLite.get` (10473); `SQLite.prepare` (10473); `Store.sql` (10473) | CORE |
| [packages/store/src/store.ts:6053](../../packages/store/src/store.ts#L6053) `Store/verifyPasskeyCredential` | `SQLite.get` (6053); `SQLite.prepare` (6053, 6065); `Store.sql` (6053, 6065) | CORE |
| [packages/store/src/store.ts:5882](../../packages/store/src/store.ts#L5882) `Store/verifyTotp` | `SQLite.get` (5882); `SQLite.prepare` (5882, 5889); `Store.sql` (5882, 5889) | CORE |
| [packages/store/src/store.ts:2256](../../packages/store/src/store.ts#L2256) `Store/versionNumber` | `SQLite.get` (2256); `SQLite.prepare` (2256); `Store.sql` (2256) | CORE |
| [packages/store/src/store.ts:2131](../../packages/store/src/store.ts#L2131) `Store/versionTriggers` | `SQLite.get` (2131); `SQLite.prepare` (2131, 2136, 2137); `Store.sql` (2131, 2136, 2137, 2154, 2156, 2157, 2159); `SQLite.all` (2136, 2137) | CORE |
| [packages/store/src/store.ts:2099](../../packages/store/src/store.ts#L2099) `Store/warmSummariesCurrent` | `Calculations.wholeTable` (2099) | CORE |
| [packages/store/src/store.ts:4312](../../packages/store/src/store.ts#L4312) `Store/webViewerChecked` | `SQLite.get` (4312); `SQLite.prepare` (4312); `Store.sql` (4312) | CORE |
| [packages/store/src/store.ts:1857](../../packages/store/src/store.ts#L1857) `Store/withWriteTransaction` | `Store.sql` (1857, 1869, 1875, 1877, 1877) | CORE |
| [packages/store/src/store.ts:7486](../../packages/store/src/store.ts#L7486) `Store/wordIndex` | `Store.sql` (7486, 7494, 7499); `Store.recordCount` (7498); `SQLite.get` (7499); `SQLite.prepare` (7499) | CORE |
| [packages/store/src/store.ts:8641](../../packages/store/src/store.ts#L8641) `Store/writeExternalFile` | `Store.evaluateEach` (8641); `SQLite.prepare` (8664); `Store.sql` (8664) | CORE |
| [packages/store/src/store.ts:8665](../../packages/store/src/store.ts#L8665) `Store/writeExternalFile/taken` | `SQLite.get` (8665) | CORE |
| [packages/store/src/store.ts:5712](../../packages/store/src/store.ts#L5712) `Store/writeObjectUseRows` | `SQLite.prepare` (5712, 5713, 5718); `Store.sql` (5712, 5713, 5718) | CORE |
| [packages/store/src/store.ts:2311](../../packages/store/src/store.ts#L2311) `Store/writeToken` | `SQLite.get` (2311); `SQLite.prepare` (2311); `Store.sql` (2311) | CORE |
| [packages/store/src/store.ts:5684](../../packages/store/src/store.ts#L5684) `Store/writeUsage` | `Store.sql` (5684, 5685, 5687, 5691, 5693) | CORE |
| [packages/store/src/store.ts:5700](../../packages/store/src/store.ts#L5700) `Store/writeUsageRows` | `SQLite.prepare` (5700, 5701, 5707); `Store.sql` (5700, 5701, 5707) | CORE |
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
