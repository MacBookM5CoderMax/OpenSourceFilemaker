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
| [packages/cli/src/diagnostics.ts:226](../../packages/cli/src/diagnostics.ts#L226) `designCopy` | `SQLite.all` (226); `SQLite.prepare` (226, 229) | OPERATOR |
| [packages/cli/src/diagnostics.ts:466](../../packages/cli/src/diagnostics.ts#L466) `diagnostics` | `SQLite.get` (466); `SQLite.prepare` (466, 470); `SQLite.all` (470) | OPERATOR |
| [packages/cli/src/doctor.ts:140](../../packages/cli/src/doctor.ts#L140) `accountChecks` | `SQLite.all` (140); `SQLite.prepare` (140) | OPERATOR |
| [packages/cli/src/main.ts:757](../../packages/cli/src/main.ts#L757) `accountsWithPasswordOff` | `SQLite.all` (757); `SQLite.prepare` (757) | OPERATOR |
| [packages/cli/src/main.ts:790](../../packages/cli/src/main.ts#L790) `hostedRead` | `SQLite.all` (790, 793); `SQLite.prepare` (790, 793); `Store.sql` (790, 793) | OPERATOR |
| [packages/cli/src/main.ts:2534](../../packages/cli/src/main.ts#L2534) `main` | `Store.orphanContainerReport` (2534); `Store.auditLog` (3014); `SQLite.get` (3283); `SQLite.prepare` (3283) | OPERATOR |
| [packages/scripts/src/data-api-step.ts:104](../../packages/scripts/src/data-api-step.ts#L104) `respond` | `Store.get` (104, 131, 140); `Store.find` (105, 117) | SCRIPT |
| [packages/scripts/src/engine.ts:9561](../../packages/scripts/src/engine.ts#L9561) `clearRecords` | `SQLite.all` (9561); `SQLite.prepare` (9561) | SCRIPT |
| [packages/scripts/src/engine.ts:8328](../../packages/scripts/src/engine.ts#L8328) `ScriptEngine/containerFile` | `Store.get` (8328); `Store.containerId` (8329); `Store.container` (8330) | SCRIPT |
| [packages/scripts/src/engine.ts:5879](../../packages/scripts/src/engine.ts#L5879) `ScriptEngine/design` | `Store.valueListItems` (5879) | SCRIPT |
| [packages/scripts/src/engine.ts:6639](../../packages/scripts/src/engine.ts#L6639) `ScriptEngine/exportField` | `Store.get` (6639); `Store.containerId` (6640); `Store.container` (6642) | SCRIPT |
| [packages/scripts/src/engine.ts:8748](../../packages/scripts/src/engine.ts#L8748) `ScriptEngine/fileMakerRows` | `Store.findIds` (8748); `Store.get` (8753) | SCRIPT |
| [packages/scripts/src/engine.ts:3465](../../packages/scripts/src/engine.ts#L3465) `ScriptEngine/findIdsCooperative` | `Store.findIdsProgress` (3465) | SCRIPT |
| [packages/scripts/src/engine.ts:2432](../../packages/scripts/src/engine.ts#L2432) `ScriptEngine/foundSet` | `Store.findIds` (2432) | SCRIPT |
| [packages/scripts/src/engine.ts:5719](../../packages/scripts/src/engine.ts#L5719) `ScriptEngine/get` | `Store.findIds` (5719); `Store.canViewRecord` (5812); `Store.get` (5848) | SCRIPT |
| [packages/scripts/src/engine.ts:2031](../../packages/scripts/src/engine.ts#L2031) `ScriptEngine/goToLayout` | `Store.findIds` (2031) | SCRIPT |
| [packages/scripts/src/engine.ts:8519](../../packages/scripts/src/engine.ts#L8519) `ScriptEngine/importRecords` | `Store.get` (8519) | SCRIPT |
| [packages/scripts/src/engine.ts:5991](../../packages/scripts/src/engine.ts#L5991) `ScriptEngine/lookupNext` | `Store.get` (5991); `Store.row` (5992); `Calculations.context` (5994) | SCRIPT |
| [packages/scripts/src/engine.ts:5522](../../packages/scripts/src/engine.ts#L5522) `ScriptEngine/newCalcContext/executeSQL` | `Calculations.executeSQL` (5522) | SCRIPT |
| [packages/scripts/src/engine.ts:5530](../../packages/scripts/src/engine.ts#L5530) `ScriptEngine/newCalcContext/persistentData` | `Store.persistentData` (5530) | SCRIPT |
| [packages/scripts/src/engine.ts:5531](../../packages/scripts/src/engine.ts#L5531) `ScriptEngine/newCalcContext/persistentDataIds` | `Store.persistentDataIds` (5531) | SCRIPT |
| [packages/scripts/src/engine.ts:8788](../../packages/scripts/src/engine.ts#L8788) `ScriptEngine/newRecord` | `Store.findIds` (8788) | SCRIPT |
| [packages/scripts/src/engine.ts:9168](../../packages/scripts/src/engine.ts#L9168) `ScriptEngine/quickFind` | `Store.get` (9168) | SCRIPT |
| [packages/scripts/src/engine.ts:5933](../../packages/scripts/src/engine.ts#L5933) `ScriptEngine/record` | `Store.get` (5933) | SCRIPT |
| [packages/scripts/src/engine.ts:2348](../../packages/scripts/src/engine.ts#L2348) `ScriptEngine/transactionContext` | `Store.get` (2348) | SCRIPT |
| [packages/scripts/src/engine.ts:6094](../../packages/scripts/src/engine.ts#L6094) `ScriptEngine/relatedIds` | `Store.findIds` (6094); `rowsById` (6102); `Store.select` (6106); `Store.matchIds` (6120); `Store.viewableIds` (6143) | SCRIPT |
| [packages/scripts/src/engine.ts:6128](../../packages/scripts/src/engine.ts#L6128) `ScriptEngine/relatedIds/matching` | `Store.matchIds` (6128) | SCRIPT |
| [packages/scripts/src/engine.ts:6793](../../packages/scripts/src/engine.ts#L6793) `ScriptEngine/relookup` | `Store.get` (6793) | SCRIPT |
| [packages/scripts/src/engine.ts:3625](../../packages/scripts/src/engine.ts#L3625) `ScriptEngine/revertTransaction` | `Store.findIds` (3625) | SCRIPT |
| [packages/scripts/src/engine.ts:3479](../../packages/scripts/src/engine.ts#L3479) `ScriptEngine/sortIdsCooperative` | `Store.sortIdsProgress` (3479) | SCRIPT |
| [packages/scripts/src/engine.ts:3507](../../packages/scripts/src/engine.ts#L3507) `ScriptEngine/sortIdsProgress` | `Store.sortIdsProgress` (3507); `Store.valueListItems` (3513) | SCRIPT |
| [packages/scripts/src/engine.ts:7575](../../packages/scripts/src/engine.ts#L7575) `ScriptEngine/sourceValue` | `Store.get` (7575); `Store.containerId` (7576); `Store.container` (7577) | SCRIPT |
| [packages/scripts/src/engine.ts:3416](../../packages/scripts/src/engine.ts#L3416) `ScriptEngine/sqlByNaturalLanguage` | `Calculations.translateSQL` (3416); `Calculations.executeSQL` (3423) | SCRIPT |
| [packages/scripts/src/engine.ts:4234](../../packages/scripts/src/engine.ts#L4234) `ScriptEngine/step` | `Store.fieldIndex` (4234) | SCRIPT |
| [packages/scripts/src/engine.ts:5966](../../packages/scripts/src/engine.ts#L5966) `ScriptEngine/valueOf` | `Store.findIds` (5966, 5966); `Store.containerId` (5974) | SCRIPT |
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
| [packages/server/src/conversion-guide.ts:431](../../packages/server/src/conversion-guide.ts#L431) `ConversionGuides/save` | `SQLite.prepare` (431); `Store.sql` (431) | DESIGN |
| [packages/server/src/conversion-guide.ts:422](../../packages/server/src/conversion-guide.ts#L422) `ConversionGuides/saved` | `SQLite.get` (422); `SQLite.prepare` (422); `Store.sql` (422) | DESIGN |
| [packages/server/src/conversion-guide.ts:412](../../packages/server/src/conversion-guide.ts#L412) `ConversionGuides/table` | `Store.sql` (412) | DESIGN |
| [packages/server/src/conversion-guide.ts:138](../../packages/server/src/conversion-guide.ts#L138) `convertedAt` | `SQLite.get` (138); `SQLite.prepare` (138); `Store.sql` (138) | DESIGN |
| [packages/server/src/conversion.ts:376](../../packages/server/src/conversion.ts#L376) `conversionReport` | `Store.externalContainerCheck` (376) | DESIGN |
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
| [packages/server/src/design.ts:243](../../packages/server/src/design.ts#L243) `containerData` | `Store.query` (243) | DESIGN |
| [packages/server/src/design.ts:752](../../packages/server/src/design.ts#L752) `DesignApi/handle` | `Store.auditLog` (752); `Store.evaluate` (819) | DESIGN |
| [packages/server/src/design.ts:252](../../packages/server/src/design.ts#L252) `recordCount` | `Store.query` (252) | DESIGN |
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
| [packages/store/src/store.ts:5666](../../packages/store/src/store.ts#L5666) `Store/accountIdentityId` | `SQLite.get` (5666, 5672); `SQLite.prepare` (5666, 5671, 5672); `Store.sql` (5666, 5671, 5672) | CORE |
| [packages/store/src/store.ts:5660](../../packages/store/src/store.ts#L5660) `Store/accountIdentityIdIfSet` | `SQLite.get` (5660); `SQLite.prepare` (5660); `Store.sql` (5660) | CORE |
| [packages/store/src/store.ts:5622](../../packages/store/src/store.ts#L5622) `Store/accountInactive` | `SQLite.get` (5622); `SQLite.prepare` (5622); `Store.sql` (5622) | CORE |
| [packages/store/src/store.ts:5819](../../packages/store/src/store.ts#L5819) `Store/accountLocalOnly` | `SQLite.get` (5819); `SQLite.prepare` (5819); `Store.sql` (5819) | CORE |
| [packages/store/src/store.ts:6688](../../packages/store/src/store.ts#L6688) `Store/accountPrivilegeSet` | `SQLite.get` (6688); `SQLite.prepare` (6688); `Store.sql` (6688) | CORE |
| [packages/store/src/store.ts:5824](../../packages/store/src/store.ts#L5824) `Store/accountRequires2fa` | `SQLite.get` (5824); `SQLite.prepare` (5824); `Store.sql` (5824) | CORE |
| [packages/store/src/store.ts:3970](../../packages/store/src/store.ts#L3970) `Store/accounts` | `SQLite.all` (3970); `SQLite.prepare` (3970); `Store.sql` (3970) | CORE |
| [packages/store/src/store.ts:3966](../../packages/store/src/store.ts#L3966) `Store/accountsSharingLockout` | `SQLite.all` (3966); `SQLite.prepare` (3966); `Store.sql` (3966) | CORE |
| [packages/store/src/store.ts:6044](../../packages/store/src/store.ts#L6044) `Store/accountUsage` | `SQLite.get` (6044); `SQLite.prepare` (6044, 6045); `Store.sql` (6044, 6045); `SQLite.all` (6045); `Store.auditLog` (6061) | CORE |
| [packages/store/src/store.ts:8925](../../packages/store/src/store.ts#L8925) `Store/addContainer` | `SQLite.all` (8925); `SQLite.prepare` (8925, 8930, 8944, 8948, 8949); `Store.sql` (8925, 8930, 8944, 8946, 8948, 8949, 8951, 8954); `SQLite.get` (8935); `Store.containerRange` (8937) | CORE |
| [packages/store/src/store.ts:8971](../../packages/store/src/store.ts#L8971) `Store/addExternalContainer` | `SQLite.prepare` (8971); `Store.sql` (8971) | CORE |
| [packages/store/src/store.ts:9458](../../packages/store/src/store.ts#L9458) `Store/addFieldIndex` | `Store.sql` (9458) | CORE |
| [packages/store/src/store.ts:7570](../../packages/store/src/store.ts#L7570) `Store/addImage` | `Store.sql` (7570, 7571); `SQLite.prepare` (7571) | CORE |
| [packages/store/src/store.ts:6738](../../packages/store/src/store.ts#L6738) `Store/addProvisionedAccount` | `SQLite.get` (6738); `SQLite.prepare` (6738, 6742); `Store.sql` (6738, 6742) | CORE |
| [packages/store/src/store.ts:8030](../../packages/store/src/store.ts#L8030) `Store/addRelated` | `relatedRows` (8030); `rowsById` (8065); `firstRelatedEach` (8091) | CORE |
| [packages/store/src/store.ts:8018](../../packages/store/src/store.ts#L8018) `Store/addRelated/summaries` | `Calculations.summary` (8018) | CORE |
| [packages/store/src/store.ts:3988](../../packages/store/src/store.ts#L3988) `Store/agentNeedsApproval` | `SQLite.get` (3988); `SQLite.prepare` (3988); `Store.sql` (3988) | CORE |
| [packages/store/src/store.ts:6965](../../packages/store/src/store.ts#L6965) `Store/allowedIds` | `SQLite.iterate` (6965); `SQLite.prepare` (6965); `Store.sql` (6965) | CORE |
| [packages/store/src/store.ts:6101](../../packages/store/src/store.ts#L6101) `Store/apiToken` | `SQLite.get` (6101); `SQLite.prepare` (6101, 6119); `Store.sql` (6101, 6119) | CORE |
| [packages/store/src/store.ts:6077](../../packages/store/src/store.ts#L6077) `Store/apiTokens` | `SQLite.all` (6077); `SQLite.prepare` (6077); `Store.sql` (6077) | CORE |
| [packages/store/src/store.ts:4399](../../packages/store/src/store.ts#L4399) `Store/appendSecurityEvent` | `Store.sql` (4399) | CORE |
| [packages/store/src/store.ts:3428](../../packages/store/src/store.ts#L3428) `Store/appendSecurityRow` | `Store.sql` (3428) | CORE |
| [packages/store/src/store.ts:5442](../../packages/store/src/store.ts#L5442) `Store/applyAccountImport` | `Store.sql` (5442, 5450, 5479); `SQLite.get` (5450); `SQLite.prepare` (5450, 5479) | CORE |
| [packages/store/src/store.ts:2695](../../packages/store/src/store.ts#L2695) `Store/applyDesign` | `Store.sql` (2695, 2696, 2716, 2719, 2724, 2740, 2743, 2743); `SQLite.prepare` (2719, 2724) | CORE |
| [packages/store/src/store.ts:4240](../../packages/store/src/store.ts#L4240) `Store/approvePending` | `SQLite.get` (4240); `SQLite.prepare` (4240, 4252); `Store.sql` (4240, 4252) | CORE |
| [packages/store/src/store.ts:3219](../../packages/store/src/store.ts#L3219) `Store/audit/write` | `Store.sql` (3219) | CORE |
| [packages/store/src/store.ts:2807](../../packages/store/src/store.ts#L2807) `Store/auditLog` | `SQLite.all` (2807); `SQLite.prepare` (2807); `Store.sql` (2807) | CORE |
| [packages/store/src/store.ts:2228](../../packages/store/src/store.ts#L2228) `Store/backup` | `Store.sql` (2228) | CORE |
| [packages/store/src/store.ts:3994](../../packages/store/src/store.ts#L3994) `Store/blankPasswordAccounts` | `SQLite.all` (3994); `SQLite.prepare` (3994); `Store.sql` (3994) | CORE |
| [packages/store/src/store.ts:5370](../../packages/store/src/store.ts#L5370) `Store/canonicalAccount` | `SQLite.all` (5370); `SQLite.prepare` (5370); `Store.sql` (5370) | CORE |
| [packages/store/src/store.ts:10045](../../packages/store/src/store.ts#L10045) `Store/canView` | `Store.canView` (10045); `Store.row` (10046) | GATED-STORE |
| [packages/store/src/store.ts:10027](../../packages/store/src/store.ts#L10027) `Store/canViewRecord` | `SQLite.get` (10027); `SQLite.prepare` (10027); `Store.sql` (10027) | GATED-STORE |
| [packages/store/src/store.ts:11166](../../packages/store/src/store.ts#L11166) `Store/cascadeDelete` | `relatedRows` (11166) | CORE |
| [packages/store/src/store.ts:2528](../../packages/store/src/store.ts#L2528) `Store/changeOne` | `Store.sql` (2528, 2530) | CORE |
| [packages/store/src/store.ts:2531](../../packages/store/src/store.ts#L2531) `Store/changeOne/read` | `SQLite.get` (2531); `SQLite.prepare` (2531); `Store.sql` (2531) | CORE |
| [packages/store/src/store.ts:9315](../../packages/store/src/store.ts#L9315) `Store/checkContainerWrite` | `Store.row` (9315) | CORE |
| [packages/store/src/store.ts:10779](../../packages/store/src/store.ts#L10779) `Store/checkEditable` | `Store.row` (10779) | CORE |
| [packages/store/src/store.ts:1750](../../packages/store/src/store.ts#L1750) `Store/checkpoint` | `SQLite.get` (1750); `SQLite.prepare` (1750); `Store.sql` (1750) | CORE |
| [packages/store/src/store.ts:4139](../../packages/store/src/store.ts#L4139) `Store/checkProposedWrite` | `Store.row` (4139); `relatedRows` (4153) | CORE |
| [packages/store/src/store.ts:6724](../../packages/store/src/store.ts#L6724) `Store/clearAccountPrivilegeSet` | `SQLite.prepare` (6724); `Store.sql` (6724) | CORE |
| [packages/store/src/store.ts:1772](../../packages/store/src/store.ts#L1772) `Store/close` | `Store.sql` (1772) | CORE |
| [packages/store/src/store.ts:9274](../../packages/store/src/store.ts#L9274) `Store/compactFile` | `Store.sql` (9274, 9275, 9277) | CORE |
| [packages/store/src/store.ts:9695](../../packages/store/src/store.ts#L9695) `Store/computedRows` | `Store.sql` (9695, 9698, 9699, 9700, 9702, 9712, 9713, 9714, 9717); `SQLite.prepare` (9698, 9700, 9702, 9712); `SQLite.iterate` (9702); `Calculations.globalValue` (9705); `Calculations.unstoredValue` (9706); `Calculations.related` (9709); `SQLite.all` (9712) | CORE |
| [packages/store/src/store.ts:11293](../../packages/store/src/store.ts#L11293) `Store/computeValuesCurrent` | `Store.computeValues` (11293); `Store.sql` (11299, 11303); `SQLite.all` (11303); `SQLite.prepare` (11303) | GATED-STORE |
| [packages/store/src/store.ts:6146](../../packages/store/src/store.ts#L6146) `Store/confirmTotp` | `SQLite.get` (6146); `SQLite.prepare` (6146, 6148); `Store.sql` (6146, 6148) | CORE |
| [packages/store/src/store.ts:1380](../../packages/store/src/store.ts#L1380) `Store/constructor` | `Store.sql` (1380, 1382, 1384, 1385, 1389, 1393, 1394, 1403, 1411, 1427, 1432, 1437, 1438, 1442, 1443, 1444, 1451, 1455, 1459, 1460, 1461, 1463, 1473, 1474, 1478, 1481, 1482, 1484, 1485, 1488, 1489, 1493, 1494, 1498, 1499, 1502, 1505, 1506, 1508, 1511, 1512, 1516, 1517, 1521, 1522, 1526, 1527, 1528, 1531, 1532, 1535, 1536, 1538, 1538, 1539, 1539, 1540, 1544, 1546, 1550, 1552, 1555, 1556, 1557, 1560, 1561, 1563, 1565, 1566, 1570, 1571, 1573, 1585, 1587, 1588, 1589, 1589, 1593, 1594); `SQLite.get` (1384, 1403); `SQLite.prepare` (1384, 1403, 1411, 1463, 1481, 1482, 1485, 1488, 1493, 1498, 1505, 1511, 1516, 1521, 1531, 1535, 1538, 1539, 1560, 1565, 1570); `SQLite.all` (1481, 1488, 1493, 1498, 1505, 1511, 1516, 1521, 1531, 1535, 1538, 1539, 1560, 1565, 1570) | CORE |
| [packages/store/src/store.ts:6504](../../packages/store/src/store.ts#L6504) `Store/consumeRecoveryCode` | `SQLite.prepare` (6504); `Store.sql` (6504) | CORE |
| [packages/store/src/store.ts:8849](../../packages/store/src/store.ts#L8849) `Store/container` | `SQLite.get` (8849); `SQLite.prepare` (8849, 8858); `Store.sql` (8849, 8858); `SQLite.all` (8858) | CORE |
| [packages/store/src/store.ts:9283](../../packages/store/src/store.ts#L9283) `Store/containerId` | `Store.containerId` (9283); `Store.row` (9284) | CORE |
| [packages/store/src/store.ts:8866](../../packages/store/src/store.ts#L8866) `Store/containerInfo` | `SQLite.get` (8866); `SQLite.prepare` (8866); `Store.sql` (8866) | CORE |
| [packages/store/src/store.ts:8830](../../packages/store/src/store.ts#L8830) `Store/containerIntact` | `SQLite.get` (8830); `SQLite.prepare` (8830); `Store.sql` (8830) | CORE |
| [packages/store/src/store.ts:8769](../../packages/store/src/store.ts#L8769) `Store/containerIntegrityReport` | `SQLite.all` (8769); `SQLite.prepare` (8769, 8780); `Store.sql` (8769, 8780); `SQLite.get` (8780) | CORE |
| [packages/store/src/store.ts:8844](../../packages/store/src/store.ts#L8844) `Store/containerMeta` | `SQLite.get` (8844); `SQLite.prepare` (8844); `Store.sql` (8844) | CORE |
| [packages/store/src/store.ts:8900](../../packages/store/src/store.ts#L8900) `Store/containerRange` | `SQLite.all` (8900); `SQLite.prepare` (8900, 8907); `Store.sql` (8900, 8907); `SQLite.get` (8907) | CORE |
| [packages/store/src/store.ts:8671](../../packages/store/src/store.ts#L8671) `Store/containerReferences` | `SQLite.all` (8671, 8690, 8692, 8698, 8711, 8722, 8736); `SQLite.prepare` (8671, 8690, 8692, 8698, 8711, 8722, 8734, 8736); `Store.sql` (8671, 8690, 8692, 8698, 8711, 8722, 8734, 8736); `SQLite.get` (8734); `Store.row` (8745) | CORE |
| [packages/store/src/store.ts:11272](../../packages/store/src/store.ts#L11272) `Store/countIds` | `Store.countIds` (11272); `SQLite.get` (11277); `SQLite.prepare` (11277); `Store.sql` (11277) | GATED-STORE |
| [packages/store/src/store.ts:10076](../../packages/store/src/store.ts#L10076) `Store/create` | `SQLite.get` (10076); `SQLite.prepare` (10076, 10089); `Store.sql` (10076, 10089) | CORE |
| [packages/store/src/store.ts:4371](../../packages/store/src/store.ts#L4371) `Store/createAccountOnly` | `SQLite.get` (4371); `SQLite.prepare` (4371, 4375, 4381, 4386, 4391); `Store.sql` (4371, 4375, 4381, 4386, 4391) | CORE |
| [packages/store/src/store.ts:5877](../../packages/store/src/store.ts#L5877) `Store/createApiToken` | `SQLite.get` (5877, 5905); `SQLite.prepare` (5877, 5904, 5905, 5915); `Store.sql` (5877, 5904, 5905, 5915) | CORE |
| [packages/store/src/store.ts:5383](../../packages/store/src/store.ts#L5383) `Store/createLocalAccount` | `SQLite.prepare` (5383); `Store.sql` (5383) | CORE |
| [packages/store/src/store.ts:3960](../../packages/store/src/store.ts#L3960) `Store/credentialIdentity` | `SQLite.get` (3960); `SQLite.prepare` (3960); `Store.sql` (3960) | CORE |
| [packages/store/src/store.ts:5798](../../packages/store/src/store.ts#L5798) `Store/credentialStamp` | `SQLite.get` (5798); `SQLite.prepare` (5798); `Store.sql` (5798) | CORE |
| [packages/store/src/store.ts:7403](../../packages/store/src/store.ts#L7403) `Store/crossFileBusy` | `Store.sql` (7403) | AUTH |
| [packages/store/src/store.ts:7375](../../packages/store/src/store.ts#L7375) `Store/crossFileHash` | `SQLite.get` (7375); `SQLite.prepare` (7375); `Store.sql` (7375) | AUTH |
| [packages/store/src/store.ts:2318](../../packages/store/src/store.ts#L2318) `Store/dataVersion` | `SQLite.get` (2318); `SQLite.prepare` (2318); `Store.sql` (2318) | CORE |
| [packages/store/src/store.ts:11840](../../packages/store/src/store.ts#L11840) `Store/decimalViewSql` | `SQLite.all` (11840); `SQLite.prepare` (11840) | CORE |
| [packages/store/src/store.ts:10822](../../packages/store/src/store.ts#L10822) `Store/delete` | `Store.row` (10822) | CORE |
| [packages/store/src/store.ts:10830](../../packages/store/src/store.ts#L10830) `Store/delete/run` | `SQLite.get` (10830); `SQLite.prepare` (10830, 10835); `Store.sql` (10830, 10835) | CORE |
| [packages/store/src/store.ts:5537](../../packages/store/src/store.ts#L5537) `Store/deleteAccount` | `SQLite.prepare` (5537, 5541, 5542, 5543, 5544, 5545, 5546, 5547, 5548, 5555, 5557, 5559, 5561, 5565); `Store.sql` (5537, 5541, 5542, 5543, 5544, 5545, 5546, 5547, 5548, 5555, 5557, 5559, 5561, 5565) | CORE |
| [packages/store/src/store.ts:10906](../../packages/store/src/store.ts#L10906) `Store/deleteBeingUndone` | `SQLite.all` (10906); `SQLite.prepare` (10906); `Store.sql` (10906) | CORE |
| [packages/store/src/store.ts:3596](../../packages/store/src/store.ts#L3596) `Store/deletedRows` | `SQLite.get` (3596); `SQLite.prepare` (3596, 3598, 3598); `Store.sql` (3596, 3598, 3598); `SQLite.all` (3598, 3598) | CORE |
| [packages/store/src/store.ts:10918](../../packages/store/src/store.ts#L10918) `Store/deleteEndingTheLifeAt` | `SQLite.get` (10918); `SQLite.prepare` (10918); `Store.sql` (10918) | CORE |
| [packages/store/src/store.ts:6589](../../packages/store/src/store.ts#L6589) `Store/deletePrivilegeSet` | `SQLite.prepare` (6589); `Store.sql` (6589) | CORE |
| [packages/store/src/store.ts:4509](../../packages/store/src/store.ts#L4509) `Store/deleteScriptTest` | `SQLite.prepare` (4509); `Store.sql` (4509) | CORE |
| [packages/store/src/store.ts:10807](../../packages/store/src/store.ts#L10807) `Store/deleteVisibility` | `Store.canViewRecord` (10807) | CORE |
| [packages/store/src/store.ts:7512](../../packages/store/src/store.ts#L7512) `Store/design` | `SQLite.get` (7512) | CORE |
| [packages/store/src/store.ts:3706](../../packages/store/src/store.ts#L3706) `Store/designEffect` | `Store.sql` (3706, 3707, 3713, 3714, 3717, 3723, 3728, 3731, 3737, 3748, 3749, 3751, 3752, 3765, 3766, 3769, 3771, 3777, 3778, 3779, 3785, 3787, 3791, 3794, 3795, 3797, 3800, 3806, 3808, 3815, 3816, 3818, 3819, 3820, 3821, 3828, 3829, 3831, 3831, 3833, 3834, 3835, 3839, 3843, 3845, 3883, 3885, 3887); `SQLite.prepare` (3717, 3748, 3749, 3765, 3766, 3777, 3778, 3785, 3787, 3791, 3795, 3806, 3808, 3821, 3828, 3829, 3831, 3833, 3835, 3839, 3843); `SQLite.get` (3748, 3765, 3777, 3778, 3791, 3795, 3831, 3839); `SQLite.all` (3828, 3829); `SQLite.iterate` (3833) | CORE |
| [packages/store/src/store.ts:3699](../../packages/store/src/store.ts#L3699) `Store/designEffect/renameExcluded` | `SQLite.prepare` (3699); `Store.sql` (3699) | CORE |
| [packages/store/src/store.ts:3683](../../packages/store/src/store.ts#L3683) `Store/designEffect/renameKey` | `SQLite.prepare` (3683); `Store.sql` (3683) | CORE |
| [packages/store/src/store.ts:3637](../../packages/store/src/store.ts#L3637) `Store/designHistory` | `SQLite.all` (3637); `SQLite.prepare` (3637); `Store.sql` (3637) | CORE |
| [packages/store/src/store.ts:6167](../../packages/store/src/store.ts#L6167) `Store/disableTotp` | `SQLite.prepare` (6167); `Store.sql` (6167) | CORE |
| [packages/store/src/store.ts:3895](../../packages/store/src/store.ts#L3895) `Store/dropColumnIndexes` | `SQLite.all` (3895, 3897); `SQLite.prepare` (3895, 3897); `Store.sql` (3895, 3897, 3898) | CORE |
| [packages/store/src/store.ts:9470](../../packages/store/src/store.ts#L9470) `Store/dropFieldIndex` | `SQLite.get` (9470); `SQLite.prepare` (9470); `Store.sql` (9470, 9471) | CORE |
| [packages/store/src/store.ts:10115](../../packages/store/src/store.ts#L10115) `Store/duplicate` | `Store.row` (10115); `SQLite.prepare` (10133); `Store.sql` (10133) | CORE |
| [packages/store/src/store.ts:9087](../../packages/store/src/store.ts#L9087) `Store/embeddedContainerCount` | `SQLite.prepare` (9087); `Store.sql` (9087); `SQLite.get` (9088) | CORE |
| [packages/store/src/store.ts:9073](../../packages/store/src/store.ts#L9073) `Store/embeddedContainers` | `SQLite.prepare` (9073, 9074); `Store.sql` (9073, 9074); `SQLite.all` (9074); `SQLite.get` (9078) | CORE |
| [packages/store/src/store.ts:3622](../../packages/store/src/store.ts#L3622) `Store/emptyDeleted` | `Store.sql` (3622, 3625, 3626, 3628, 3630); `SQLite.prepare` (3626) | CORE |
| [packages/store/src/store.ts:2194](../../packages/store/src/store.ts#L2194) `Store/endTransaction` | `Store.sql` (2194, 2197, 2197) | CORE |
| [packages/store/src/store.ts:6135](../../packages/store/src/store.ts#L6135) `Store/enrollTotp` | `SQLite.prepare` (6135); `Store.sql` (6135) | CORE |
| [packages/store/src/store.ts:3591](../../packages/store/src/store.ts#L3591) `Store/ensureDeleted` | `Store.sql` (3591) | CORE |
| [packages/store/src/store.ts:1604](../../packages/store/src/store.ts#L1604) `Store/ensureNativeIds` | `SQLite.all` (1604, 1616); `SQLite.prepare` (1604, 1607, 1615, 1616); `Store.sql` (1604, 1607, 1610, 1614, 1615, 1616, 1619, 1621) | CORE |
| [packages/store/src/store.ts:2440](../../packages/store/src/store.ts#L2440) `Store/ensureRecordIdHighWater` | `Store.sql` (2440, 2441, 2443, 2445, 2447) | CORE |
| [packages/store/src/store.ts:2459](../../packages/store/src/store.ts#L2459) `Store/ensureRecordIdMarks` | `SQLite.all` (2459, 2462, 2465, 2474); `SQLite.prepare` (2459, 2462, 2465, 2468, 2474, 2477); `Store.sql` (2459, 2462, 2465, 2468, 2474, 2477, 2481, 2482) | CORE |
| [packages/store/src/store.ts:10456](../../packages/store/src/store.ts#L10456) `Store/evaluateCurrent` | `Store.row` (10456, 10456, 10457, 10457); `Calculations.context` (10462); `Store.get` (10463, 10465) | GATED-STORE |
| [packages/store/src/store.ts:10497](../../packages/store/src/store.ts#L10497) `Store/evaluateEachCurrent` | `Store.row` (10497, 10497, 10502); `Calculations.context` (10503); `Store.get` (10505) | GATED-STORE |
| [packages/store/src/store.ts:10559](../../packages/store/src/store.ts#L10559) `Store/evaluateRowsCurrent` | `Store.row` (10559, 10559, 10560, 10560) | GATED-STORE |
| [packages/store/src/store.ts:10538](../../packages/store/src/store.ts#L10538) `Store/evaluateRowsCurrent/each` | `Calculations.context` (10538); `Store.get` (10540) | GATED-STORE |
| [packages/store/src/store.ts:10574](../../packages/store/src/store.ts#L10574) `Store/evaluateRowsCurrent/found/[Symbol.iterator]` | `rowsById` (10574) | GATED-STORE |
| [packages/store/src/store.ts:10596](../../packages/store/src/store.ts#L10596) `Store/evaluateRowsCurrent/key` | `Calculations.context` (10596) | GATED-STORE |
| [packages/store/src/store.ts:4284](../../packages/store/src/store.ts#L4284) `Store/externalAccount` | `SQLite.all` (4284); `SQLite.prepare` (4284); `Store.sql` (4284) | CORE |
| [packages/store/src/store.ts:8592](../../packages/store/src/store.ts#L8592) `Store/externalContainerCheck` | `SQLite.all` (8592); `SQLite.prepare` (8592); `Store.sql` (8592) | CORE |
| [packages/store/src/store.ts:8599](../../packages/store/src/store.ts#L8599) `Store/externalContainerCount` | `SQLite.get` (8599); `SQLite.prepare` (8599); `Store.sql` (8599) | CORE |
| [packages/store/src/store.ts:8608](../../packages/store/src/store.ts#L8608) `Store/externalContainerReport` | `SQLite.all` (8608, 8621); `SQLite.prepare` (8608, 8621); `Store.sql` (8608, 8621) | CORE |
| [packages/store/src/store.ts:5648](../../packages/store/src/store.ts#L5648) `Store/externalIdentityId` | `SQLite.get` (5648, 5655); `SQLite.prepare` (5648, 5654, 5655); `Store.sql` (5648, 5654, 5655) | CORE |
| [packages/store/src/store.ts:8840](../../packages/store/src/store.ts#L8840) `Store/externalOf` | `SQLite.get` (8840); `SQLite.prepare` (8840); `Store.sql` (8840) | CORE |
| [packages/store/src/store.ts:3372](../../packages/store/src/store.ts#L3372) `Store/failureAuditRoom` | `SQLite.get` (3372); `SQLite.prepare` (3372); `Store.sql` (3372) | CORE |
| [packages/store/src/store.ts:8239](../../packages/store/src/store.ts#L8239) `Store/fieldIndexCurrent` | `SQLite.iterate` (8239); `SQLite.prepare` (8239, 8244); `Store.sql` (8239, 8244); `SQLite.all` (8244) | GATED-STORE |
| [packages/store/src/store.ts:9510](../../packages/store/src/store.ts#L9510) `Store/find` | `Store.find` (9510) | GATED-STORE |
| [packages/store/src/store.ts:9882](../../packages/store/src/store.ts#L9882) `Store/findCandidates` | `Store.query` (9882) | CORE |
| [packages/store/src/store.ts:9521](../../packages/store/src/store.ts#L9521) `Store/findHere` | `Store.query` (9521, 9526, 9528, 9542, 9544, 9555); `Store.recordCount` (9539); `SQLite.get` (9540, 9544); `SQLite.prepare` (9540, 9544, 9550, 9557, 9566); `Store.sql` (9540, 9544, 9550, 9557, 9566); `SQLite.all` (9550, 9557, 9566) | GATED-STORE |
| [packages/store/src/store.ts:9561](../../packages/store/src/store.ts#L9561) `Store/findHere/[Symbol.iterator]` | `SQLite.iterate` (9561); `SQLite.prepare` (9561); `Store.sql` (9561) | GATED-STORE |
| [packages/store/src/store.ts:11405](../../packages/store/src/store.ts#L11405) `Store/findIdsCurrent` | `Store.findIds` (11405) | GATED-STORE |
| [packages/store/src/store.ts:11340](../../packages/store/src/store.ts#L11340) `Store/findIdsCurrentProgress` | `Store.findIdsProgress` (11340); `Store.query` (11342, 11344, 11357, 11359); `Store.recordCount` (11349, 11377); `SQLite.iterate` (11374); `SQLite.prepare` (11374, 11382, 11383); `Store.sql` (11374, 11382, 11383); `SQLite.get` (11386); `SQLite.all` (11392) | GATED-STORE |
| [packages/store/src/store.ts:11411](../../packages/store/src/store.ts#L11411) `Store/findIdsHere` | `Store.query` (11411, 11417, 11419); `SQLite.iterate` (11430); `SQLite.prepare` (11430); `Store.sql` (11430) | GATED-STORE |
| [packages/store/src/store.ts:9826](../../packages/store/src/store.ts#L9826) `Store/findSource` | `Store.query` (9826); `SQLite.all` (9835, 9852); `SQLite.prepare` (9835, 9843, 9851); `Store.sql` (9835, 9840, 9843, 9848, 9851, 9865, 9867); `Calculations.globalValue` (9857); `Calculations.unstoredValue` (9858); `Calculations.related` (9862) | CORE |
| [packages/store/src/store.ts:3484](../../packages/store/src/store.ts#L3484) `Store/flushDeferredSecurity` | `Store.sql` (3484) | CORE |
| [packages/store/src/store.ts:5504](../../packages/store/src/store.ts#L5504) `Store/forgetStandIns` | `SQLite.prepare` (5504); `Store.sql` (5504) | CORE |
| [packages/store/src/store.ts:10873](../../packages/store/src/store.ts#L10873) `Store/forgetStandInValues` | `Store.sql` (10873, 10894); `SQLite.prepare` (10894) | CORE |
| [packages/store/src/store.ts:8120](../../packages/store/src/store.ts#L8120) `Store/foundSetPage` | `rowsById` (8120) | CORE |
| [packages/store/src/store.ts:8136](../../packages/store/src/store.ts#L8136) `Store/foundSetRowsCurrent` | `Store.viewableIds` (8136); `Store.row` (8152) | GATED-STORE |
| [packages/store/src/store.ts:4202](../../packages/store/src/store.ts#L4202) `Store/gateAgentWrite` | `SQLite.get` (4202); `SQLite.prepare` (4202, 4204); `Store.sql` (4202, 4204) | CORE |
| [packages/store/src/store.ts:6442](../../packages/store/src/store.ts#L6442) `Store/generateRecoveryCodes` | `SQLite.prepare` (6442, 6445); `Store.sql` (6442, 6445) | CORE |
| [packages/store/src/store.ts:9955](../../packages/store/src/store.ts#L9955) `Store/getCurrent` | `Store.get` (9955); `Store.row` (9956, 9956, 9970); `SQLite.all` (9973); `SQLite.prepare` (9973); `Store.sql` (9973) | GATED-STORE |
| [packages/store/src/store.ts:9993](../../packages/store/src/store.ts#L9993) `Store/getManyCurrent` | `Store.getMany` (9993); `SQLite.get` (10011); `SQLite.prepare` (10011); `Store.sql` (10011) | GATED-STORE |
| [packages/store/src/store.ts:10004](../../packages/store/src/store.ts#L10004) `Store/getManyCurrent/[Symbol.iterator]` | `rowsById` (10004) | GATED-STORE |
| [packages/store/src/store.ts:1651](../../packages/store/src/store.ts#L1651) `Store/grantFullAccessClients` | `SQLite.prepare` (1651); `Store.sql` (1651) | CORE |
| [packages/store/src/store.ts:11447](../../packages/store/src/store.ts#L11447) `Store/groupSummariesCurrent` | `Store.groupSummaries` (11447); `Store.viewableIds` (11452); `Calculations.collect` (11468); `rowsById` (11468, 11518); `Calculations.collector` (11490) | GATED-STORE |
| [packages/store/src/store.ts:11516](../../packages/store/src/store.ts#L11516) `Store/groupSummariesCurrent/flush` | `Calculations.collector` (11516) | GATED-STORE |
| [packages/store/src/store.ts:11480](../../packages/store/src/store.ts#L11480) `Store/groupSummariesCurrent/key` | `Calculations.value` (11480); `Calculations.related` (11482) | GATED-STORE |
| [packages/store/src/store.ts:1678](../../packages/store/src/store.ts#L1678) `Store/hasOwnPassword` | `SQLite.get` (1678); `SQLite.prepare` (1678); `Store.sql` (1678) | CORE |
| [packages/store/src/store.ts:6297](../../packages/store/src/store.ts#L6297) `Store/hasPasskey` | `SQLite.get` (6297); `SQLite.prepare` (6297); `Store.sql` (6297) | CORE |
| [packages/store/src/store.ts:1659](../../packages/store/src/store.ts#L1659) `Store/hasProvingPassword` | `SQLite.get` (1659); `SQLite.prepare` (1659); `Store.sql` (1659) | CORE |
| [packages/store/src/store.ts:9424](../../packages/store/src/store.ts#L9424) `Store/hasTable` | `SQLite.get` (9424); `SQLite.prepare` (9424); `Store.sql` (9424) | CORE |
| [packages/store/src/store.ts:6156](../../packages/store/src/store.ts#L6156) `Store/hasTotp` | `SQLite.get` (6156); `SQLite.prepare` (6156); `Store.sql` (6156) | CORE |
| [packages/store/src/store.ts:5627](../../packages/store/src/store.ts#L5627) `Store/identityAllowed` | `SQLite.get` (5627, 5633, 5639); `SQLite.prepare` (5627, 5633, 5639); `Store.sql` (5627, 5633, 5639) | CORE |
| [packages/store/src/store.ts:7547](../../packages/store/src/store.ts#L7547) `Store/image` | `SQLite.get` (7547); `SQLite.prepare` (7547); `Store.sql` (7547) | CORE |
| [packages/store/src/store.ts:7557](../../packages/store/src/store.ts#L7557) `Store/images` | `SQLite.all` (7557); `SQLite.prepare` (7557); `Store.sql` (7557) | CORE |
| [packages/store/src/store.ts:5347](../../packages/store/src/store.ts#L5347) `Store/importAccounts` | `SQLite.all` (5347); `SQLite.prepare` (5347); `Store.sql` (5347) | CORE |
| [packages/store/src/store.ts:1993](../../packages/store/src/store.ts#L1993) `Store/independentWindowWrite` | `SQLite.get` (1993); `SQLite.prepare` (1993, 2001, 2062); `Store.sql` (1993, 2001, 2011, 2040, 2057, 2062, 2065); `SQLite.all` (2001); `Store.row` (2060) | CORE |
| [packages/store/src/store.ts:9436](../../packages/store/src/store.ts#L9436) `Store/indexedFields` | `SQLite.all` (9436, 9437); `SQLite.prepare` (9436, 9437); `Store.sql` (9436, 9437) | CORE |
| [packages/store/src/store.ts:11873](../../packages/store/src/store.ts#L11873) `Store/internalRoots` | `SQLite.get` (11873); `SQLite.prepare` (11873, 11875); `SQLite.all` (11875) | CORE |
| [packages/store/src/store.ts:3982](../../packages/store/src/store.ts#L3982) `Store/isAgent` | `SQLite.get` (3982); `SQLite.prepare` (3982); `Store.sql` (3982) | CORE |
| [packages/store/src/store.ts:4090](../../packages/store/src/store.ts#L4090) `Store/isExternal` | `SQLite.get` (4090); `SQLite.prepare` (4090); `Store.sql` (4090) | CORE |
| [packages/store/src/store.ts:6211](../../packages/store/src/store.ts#L6211) `Store/issueWebauthnChallenge` | `SQLite.prepare` (6211, 6213, 6214, 6216); `Store.sql` (6211, 6213, 6214, 6216); `SQLite.get` (6213) | CORE |
| [packages/store/src/store.ts:11734](../../packages/store/src/store.ts#L11734) `Store/iterateCommitted` | `SQLite.iterate` (11734) | CORE |
| [packages/store/src/store.ts:1932](../../packages/store/src/store.ts#L1932) `Store/joinTransaction` | `Store.sql` (1932, 1933, 1935, 1937, 1943, 1946) | CORE |
| [packages/store/src/store.ts:11113](../../packages/store/src/store.ts#L11113) `Store/keyStepWork` | `Store.sql` (11113, 11119, 11123, 11125) | CORE |
| [packages/store/src/store.ts:7363](../../packages/store/src/store.ts#L7363) `Store/knownSharedAccount` | `SQLite.get` (7363); `SQLite.prepare` (7363); `Store.sql` (7363) | CORE |
| [packages/store/src/store.ts:4820](../../packages/store/src/store.ts#L4820) `Store/lastSignIns` | `Store.auditLog` (4820) | CORE |
| [packages/store/src/store.ts:10924](../../packages/store/src/store.ts#L10924) `Store/latestDeleteSeq` | `SQLite.get` (10924); `SQLite.prepare` (10924); `Store.sql` (10924) | CORE |
| [packages/store/src/store.ts:7590](../../packages/store/src/store.ts#L7590) `Store/layout` | `SQLite.get` (7590); `SQLite.prepare` (7590); `Store.sql` (7590) | CORE |
| [packages/store/src/store.ts:3654](../../packages/store/src/store.ts#L3654) `Store/layoutHistory` | `SQLite.all` (3654); `SQLite.prepare` (3654); `Store.sql` (3654) | CORE |
| [packages/store/src/store.ts:7477](../../packages/store/src/store.ts#L7477) `Store/layouts` | `SQLite.all` (7477); `SQLite.prepare` (7477); `Store.sql` (7477) | CORE |
| [packages/store/src/store.ts:5120](../../packages/store/src/store.ts#L5120) `Store/leastPrivilege` | `SQLite.all` (5120); `SQLite.prepare` (5120); `Store.sql` (5120) | CORE |
| [packages/store/src/store.ts:5725](../../packages/store/src/store.ts#L5725) `Store/ledgerRow` | `SQLite.get` (5725, 5726); `SQLite.prepare` (5725, 5726); `Store.sql` (5725, 5726) | AUTH |
| [packages/store/src/store.ts:5737](../../packages/store/src/store.ts#L5737) `Store/ledgerWrite` | `Store.sql` (5737, 5738, 5740, 5742, 5745, 5745) | AUTH |
| [packages/store/src/store.ts:5431](../../packages/store/src/store.ts#L5431) `Store/limitAccountImport` | `SQLite.prepare` (5431, 5432, 5435); `Store.sql` (5431, 5432, 5435); `SQLite.get` (5432) | CORE |
| [packages/store/src/store.ts:3935](../../packages/store/src/store.ts#L3935) `Store/linkIdentity` | `SQLite.get` (3935); `SQLite.prepare` (3935); `Store.sql` (3935) | CORE |
| [packages/store/src/store.ts:3927](../../packages/store/src/store.ts#L3927) `Store/linkPrincipal` | `SQLite.get` (3927); `SQLite.prepare` (3927); `Store.sql` (3927) | CORE |
| [packages/store/src/store.ts:4706](../../packages/store/src/store.ts#L4706) `Store/markPiiField` | `SQLite.prepare` (4706); `Store.sql` (4706) | CORE |
| [packages/store/src/store.ts:8565](../../packages/store/src/store.ts#L8565) `Store/markRepeating` | `SQLite.prepare` (8565); `Store.sql` (8565) | CORE |
| [packages/store/src/store.ts:11665](../../packages/store/src/store.ts#L11665) `Store/matchIds` | `Store.matchIds` (11665); `SQLite.all` (11671); `SQLite.prepare` (11671); `Store.sql` (11671) | CORE |
| [packages/store/src/store.ts:1693](../../packages/store/src/store.ts#L1693) `Store/meta` | `SQLite.get` (1693); `SQLite.prepare` (1693); `Store.sql` (1693) | CORE |
| [packages/store/src/store.ts:1025](../../packages/store/src/store.ts#L1025) `Store/metadataVersions` | `SQLite.get` (1025); `SQLite.prepare` (1025); `Store.sql` (1025) | CORE |
| [packages/store/src/store.ts:9202](../../packages/store/src/store.ts#L9202) `Store/moveContainersIn` | `Store.sql` (9202, 9208, 9210, 9211, 9212, 9213, 9233, 9238, 9238, 9249, 9252, 9255, 9262); `SQLite.prepare` (9210, 9211, 9212, 9213, 9249, 9255); `SQLite.get` (9215, 9249, 9255) | CORE |
| [packages/store/src/store.ts:9124](../../packages/store/src/store.ts#L9124) `Store/moveContainersOut` | `Store.sql` (9124, 9132, 9134, 9136, 9141, 9142, 9162, 9168, 9170, 9172, 9172, 9178, 9178, 9183, 9185, 9187, 9187, 9193); `SQLite.get` (9132); `SQLite.prepare` (9132, 9141, 9142); `Store.container` (9144) | CORE |
| [packages/store/src/store.ts:5301](../../packages/store/src/store.ts#L5301) `Store/mustChangePassword` | `SQLite.get` (5301); `SQLite.prepare` (5301); `Store.sql` (5301) | CORE |
| [packages/store/src/store.ts:1629](../../packages/store/src/store.ts#L1629) `Store/nativeIdGuards` | `Store.sql` (1629, 1630, 1632) | CORE |
| [packages/store/src/store.ts:2495](../../packages/store/src/store.ts#L2495) `Store/nextRecordId` | `SQLite.get` (2495); `SQLite.prepare` (2495); `Store.sql` (2495) | CORE |
| [packages/store/src/store.ts:6031](../../packages/store/src/store.ts#L6031) `Store/objectUseSince` | `SQLite.get` (6031); `SQLite.prepare` (6031); `Store.sql` (6031) | CORE |
| [packages/store/src/store.ts:9396](../../packages/store/src/store.ts#L9396) `Store/orderBy` | `Store.valueListItems` (9396) | CORE |
| [packages/store/src/store.ts:8757](../../packages/store/src/store.ts#L8757) `Store/orphanContainerReport` | `SQLite.all` (8757); `SQLite.prepare` (8757); `Store.sql` (8757) | CORE |
| [packages/store/src/store.ts:6263](../../packages/store/src/store.ts#L6263) `Store/passkeyAllowList` | `SQLite.all` (6263); `SQLite.prepare` (6263); `Store.sql` (6263) | CORE |
| [packages/store/src/store.ts:6302](../../packages/store/src/store.ts#L6302) `Store/passkeyIds` | `SQLite.all` (6302); `SQLite.prepare` (6302); `Store.sql` (6302) | CORE |
| [packages/store/src/store.ts:6290](../../packages/store/src/store.ts#L6290) `Store/passkeys` | `SQLite.all` (6290); `SQLite.prepare` (6290); `Store.sql` (6290) | CORE |
| [packages/store/src/store.ts:5340](../../packages/store/src/store.ts#L5340) `Store/passwordDaysRemaining` | `SQLite.get` (5340); `SQLite.prepare` (5340); `Store.sql` (5340) | CORE |
| [packages/store/src/store.ts:7321](../../packages/store/src/store.ts#L7321) `Store/passwordState` | `SQLite.get` (7321); `SQLite.prepare` (7321); `Store.sql` (7321) | CORE |
| [packages/store/src/store.ts:4226](../../packages/store/src/store.ts#L4226) `Store/pendingChanges` | `SQLite.all` (4226); `SQLite.prepare` (4226); `Store.sql` (4226) | CORE |
| [packages/store/src/store.ts:1711](../../packages/store/src/store.ts#L1711) `Store/persistentData` | `SQLite.get` (1711) | CORE |
| [packages/store/src/store.ts:1720](../../packages/store/src/store.ts#L1720) `Store/persistentDataIds` | `SQLite.all` (1720) | CORE |
| [packages/store/src/store.ts:1701](../../packages/store/src/store.ts#L1701) `Store/persistentTable` | `Store.sql` (1701) | CORE |
| [packages/store/src/store.ts:10764](../../packages/store/src/store.ts#L10764) `Store/portalContainerTarget` | `Store.row` (10764); `relatedIdList` (10766) | CORE |
| [packages/store/src/store.ts:8175](../../packages/store/src/store.ts#L8175) `Store/portalCountsCurrent` | `Store.canView` (8175); `Store.row` (8202) | GATED-STORE |
| [packages/store/src/store.ts:8420](../../packages/store/src/store.ts#L8420) `Store/portalRows` | `relatedRows` (8420); `relatedIdList` (8421); `Store.viewableSet` (8424); `rowsById` (8449, 8487); `Calculations.related` (8463) | CORE |
| [packages/store/src/store.ts:8431](../../packages/store/src/store.ts#L8431) `Store/portalRows/context` | `Calculations.context` (8431) | CORE |
| [packages/store/src/store.ts:8441](../../packages/store/src/store.ts#L8441) `Store/portalRows/valueOf` | `Calculations.value` (8441) | CORE |
| [packages/store/src/store.ts:2873](../../packages/store/src/store.ts#L2873) `Store/prepared` | `SQLite.prepare` (2873); `Store.sql` (2873) | CORE |
| [packages/store/src/store.ts:5413](../../packages/store/src/store.ts#L5413) `Store/previewAccountImport` | `Store.sql` (5413, 5414, 5423) | CORE |
| [packages/store/src/store.ts:7119](../../packages/store/src/store.ts#L7119) `Store/previewRecordRuleCurrent` | `SQLite.get` (7119); `SQLite.prepare` (7119, 7122); `Store.sql` (7119, 7122); `SQLite.all` (7122); `Calculations.context` (7128, 7144) | CORE |
| [packages/store/src/store.ts:9917](../../packages/store/src/store.ts#L9917) `Store/previewRow` | `Store.row` (9917) | CORE |
| [packages/store/src/store.ts:6517](../../packages/store/src/store.ts#L6517) `Store/privilegeSets` | `Store.sql` (6517) | CORE |
| [packages/store/src/store.ts:3111](../../packages/store/src/store.ts#L3111) `Store/pruneAudit` | `Store.sql` (3111, 3114, 3119, 3121, 3129, 3134, 3136); `SQLite.get` (3119, 3132, 3136); `SQLite.prepare` (3119, 3129, 3136) | CORE |
| [packages/store/src/store.ts:8792](../../packages/store/src/store.ts#L8792) `Store/purgeOrphanContainers` | `Store.sql` (8792, 8796, 8805, 8808, 8809, 8814, 8815, 8817, 8817); `Store.orphanContainerReport` (8800); `SQLite.get` (8805); `SQLite.prepare` (8805, 8808, 8809) | CORE |
| [packages/store/src/store.ts:11996](../../packages/store/src/store.ts#L11996) `Store/query` | `SQLite.iterate` (11996) | CORE |
| [packages/store/src/store.ts:12036](../../packages/store/src/store.ts#L12036) `Store/queryWithOriginsCurrent` | `SQLite.iterate` (12036); `SQLite.all` (12045, 12048); `SQLite.prepare` (12045, 12048) | CORE |
| [packages/store/src/store.ts:11785](../../packages/store/src/store.ts#L11785) `Store/readOnlyChecked` | `SQLite.prepare` (11785, 11789, 11798, 11803); `SQLite.all` (11789, 11798, 11803) | CORE |
| [packages/store/src/store.ts:3907](../../packages/store/src/store.ts#L3907) `Store/recompute` | `SQLite.prepare` (3907, 3911); `Store.sql` (3907, 3911); `SQLite.iterate` (3911); `Calculations.computeStoredStyled` (3912); `Calculations.value` (3912) | CORE |
| [packages/store/src/store.ts:2888](../../packages/store/src/store.ts#L2888) `Store/recordAsOf` | `SQLite.get` (2888, 2890); `SQLite.prepare` (2888, 2890, 2892, 2893); `Store.sql` (2888, 2890, 2892, 2893); `SQLite.all` (2892, 2893) | CORE |
| [packages/store/src/store.ts:2582](../../packages/store/src/store.ts#L2582) `Store/recordCount` | `SQLite.get` (2582); `SQLite.prepare` (2582); `Store.sql` (2582) | CORE |
| [packages/store/src/store.ts:1758](../../packages/store/src/store.ts#L1758) `Store/recordedFormat` | `Store.sql` (1758) | CORE |
| [packages/store/src/store.ts:2966](../../packages/store/src/store.ts#L2966) `Store/recordLife` | `SQLite.all` (2966); `SQLite.prepare` (2966); `Store.sql` (2966) | CORE |
| [packages/store/src/store.ts:5962](../../packages/store/src/store.ts#L5962) `Store/recordObjectUse` | `Store.sql` (5962) | CORE |
| [packages/store/src/store.ts:10446](../../packages/store/src/store.ts#L10446) `Store/recordViewable` | `Store.row` (10446) | GATED-STORE |
| [packages/store/src/store.ts:9096](../../packages/store/src/store.ts#L9096) `Store/recoverContainersOut` | `SQLite.prepare` (9096); `Store.sql` (9096); `SQLite.get` (9099) | CORE |
| [packages/store/src/store.ts:1861](../../packages/store/src/store.ts#L1861) `Store/recoverPendingExternalFiles` | `Store.sql` (1861, 1863, 1887, 1889); `SQLite.prepare` (1863); `SQLite.get` (1874) | CORE |
| [packages/store/src/store.ts:6460](../../packages/store/src/store.ts#L6460) `Store/recoveryCodesRemaining` | `SQLite.get` (6460); `SQLite.prepare` (6460); `Store.sql` (6460) | CORE |
| [packages/store/src/store.ts:11825](../../packages/store/src/store.ts#L11825) `Store/refreshDecimalSqlViews` | `SQLite.get` (11825); `SQLite.prepare` (11825) | CORE |
| [packages/store/src/store.ts:4081](../../packages/store/src/store.ts#L4081) `Store/refuseLookalikeAccount` | `SQLite.all` (4081); `SQLite.prepare` (4081); `Store.sql` (4081) | CORE |
| [packages/store/src/store.ts:6326](../../packages/store/src/store.ts#L6326) `Store/registerPasskey` | `SQLite.prepare` (6326); `Store.sql` (6326) | CORE |
| [packages/store/src/store.ts:4262](../../packages/store/src/store.ts#L4262) `Store/rejectPending` | `SQLite.get` (4262); `SQLite.prepare` (4262, 4264); `Store.sql` (4262, 4264) | CORE |
| [packages/store/src/store.ts:9669](../../packages/store/src/store.ts#L9669) `Store/relatedCriteria` | `SQLite.iterate` (9669); `SQLite.prepare` (9669); `Store.sql` (9669) | CORE |
| [packages/store/src/store.ts:9666](../../packages/store/src/store.ts#L9666) `Store/relatedCriteria/matched` | `relatedRows` (9666) | CORE |
| [packages/store/src/store.ts:7930](../../packages/store/src/store.ts#L7930) `Store/relatedValues` | `Calculations.globalValue` (7930); `Calculations.unstoredValue` (7932) | CORE |
| [packages/store/src/store.ts:6339](../../packages/store/src/store.ts#L6339) `Store/removePasskey` | `SQLite.get` (6339); `SQLite.prepare` (6339, 6340); `Store.sql` (6339, 6340) | CORE |
| [packages/store/src/store.ts:9495](../../packages/store/src/store.ts#L9495) `Store/reportFind` | `Store.query` (9495, 9497, 9498); `Store.recordCount` (9500) | CORE |
| [packages/store/src/store.ts:10951](../../packages/store/src/store.ts#L10951) `Store/restoreDeletedRowLocked` | `SQLite.get` (10951, 10956); `SQLite.prepare` (10951, 10952, 10956, 10966); `Store.sql` (10951, 10952, 10956, 10966); `SQLite.all` (10952) | CORE |
| [packages/store/src/store.ts:2924](../../packages/store/src/store.ts#L2924) `Store/restoreRecord` | `Store.recordAsOf` (2924); `SQLite.get` (2928); `SQLite.prepare` (2928, 2933, 2942, 2953); `Store.sql` (2928, 2933, 2942, 2953) | CORE |
| [packages/store/src/store.ts:2982](../../packages/store/src/store.ts#L2982) `Store/revertAuditEntry` | `SQLite.get` (2982); `SQLite.prepare` (2982); `Store.sql` (2982); `Store.canViewRecord` (2984); `Store.auditLog` (2987) | CORE |
| [packages/store/src/store.ts:6087](../../packages/store/src/store.ts#L6087) `Store/revokeApiToken` | `SQLite.prepare` (6087); `Store.sql` (6087) | CORE |
| [packages/store/src/store.ts:5610](../../packages/store/src/store.ts#L5610) `Store/revokeSignInCredentials` | `SQLite.prepare` (5610, 5611, 5612); `Store.sql` (5610, 5611, 5612) | AUTH |
| [packages/store/src/store.ts:9936](../../packages/store/src/store.ts#L9936) `Store/row` | `SQLite.get` (9936) | CORE |
| [packages/store/src/store.ts:11929](../../packages/store/src/store.ts#L11929) `Store/rowsOf` | `SQLite.iterate` (11929, 11938) | CORE |
| [packages/store/src/store.ts:6924](../../packages/store/src/store.ts#L6924) `Store/ruleOutcome` | `Calculations.context` (6924) | CORE |
| [packages/store/src/store.ts:9780](../../packages/store/src/store.ts#L9780) `Store/runningSummaryValues` | `Store.viewableIds` (9780); `rowsById` (9782); `Calculations.value` (9793, 9799); `Calculations.related` (9810) | GATED-STORE |
| [packages/store/src/store.ts:6546](../../packages/store/src/store.ts#L6546) `Store/savePrivilegeSet` | `SQLite.prepare` (6546, 6554); `Store.sql` (6546, 6554) | AUTH |
| [packages/store/src/store.ts:4500](../../packages/store/src/store.ts#L4500) `Store/saveScriptTest` | `SQLite.prepare` (4500); `Store.sql` (4500) | CORE |
| [packages/store/src/store.ts:7084](../../packages/store/src/store.ts#L7084) `Store/scopedTableSql` | `Store.viewableIds` (7084); `SQLite.all` (7087); `SQLite.prepare` (7087); `Store.sql` (7087) | GATED-STORE |
| [packages/store/src/store.ts:3644](../../packages/store/src/store.ts#L3644) `Store/scriptHistory` | `SQLite.all` (3644); `SQLite.prepare` (3644); `Store.sql` (3644) | CORE |
| [packages/store/src/store.ts:1837](../../packages/store/src/store.ts#L1837) `Store/securityChainHeadAudit` | `SQLite.get` (1837); `SQLite.prepare` (1837); `Store.sql` (1837) | CORE |
| [packages/store/src/store.ts:3317](../../packages/store/src/store.ts#L3317) `Store/securityChange` | `Store.sql` (3317, 3319); `SQLite.prepare` (3319) | CORE |
| [packages/store/src/store.ts:2847](../../packages/store/src/store.ts#L2847) `Store/securityEvents` | `Store.auditLog` (2847) | CORE |
| [packages/store/src/store.ts:5811](../../packages/store/src/store.ts#L5811) `Store/securityToken` | `SQLite.get` (5811); `SQLite.prepare` (5811); `Store.sql` (5811) | CORE |
| [packages/store/src/store.ts:11959](../../packages/store/src/store.ts#L11959) `Store/selectHeldCurrent` | `Store.sql` (11959, 11961, 11964); `SQLite.prepare` (11961) | CORE |
| [packages/store/src/store.ts:11257](../../packages/store/src/store.ts#L11257) `Store/selectIdsCurrent` | `Store.selectIds` (11257); `SQLite.all` (11264); `SQLite.prepare` (11264); `Store.sql` (11264) | GATED-STORE |
| [packages/store/src/store.ts:11949](../../packages/store/src/store.ts#L11949) `Store/selectIn` | `Store.select` (11949) | CORE |
| [packages/store/src/store.ts:2248](../../packages/store/src/store.ts#L2248) `Store/selfContainedCopy` | `Store.sql` (2248); `SQLite.all` (2253); `SQLite.prepare` (2253, 2255, 2256, 2257) | CORE |
| [packages/store/src/store.ts:5589](../../packages/store/src/store.ts#L5589) `Store/setAccountActive` | `SQLite.prepare` (5589, 5597, 5598); `Store.sql` (5589, 5597, 5598) | AUTH |
| [packages/store/src/store.ts:5830](../../packages/store/src/store.ts#L5830) `Store/setAccountLocalOnly` | `SQLite.prepare` (5830); `Store.sql` (5830) | CORE |
| [packages/store/src/store.ts:6702](../../packages/store/src/store.ts#L6702) `Store/setAccountPrivilegeSet` | `SQLite.get` (6702); `SQLite.prepare` (6702, 6705, 6709); `Store.sql` (6702, 6705, 6709) | AUTH |
| [packages/store/src/store.ts:5839](../../packages/store/src/store.ts#L5839) `Store/setAccountRequire2fa` | `SQLite.prepare` (5839); `Store.sql` (5839) | CORE |
| [packages/store/src/store.ts:4114](../../packages/store/src/store.ts#L4114) `Store/setAgentAccount` | `SQLite.get` (4114); `SQLite.prepare` (4114, 4120); `Store.sql` (4114, 4120) | CORE |
| [packages/store/src/store.ts:4579](../../packages/store/src/store.ts#L4579) `Store/setAiAllowed` | `SQLite.prepare` (4579); `Store.sql` (4579) | CORE |
| [packages/store/src/store.ts:4664](../../packages/store/src/store.ts#L4664) `Store/setAiPolicy` | `SQLite.prepare` (4664); `Store.sql` (4664) | CORE |
| [packages/store/src/store.ts:7350](../../packages/store/src/store.ts#L7350) `Store/setAllowBlankPasswordFromLan` | `SQLite.prepare` (7350); `Store.sql` (7350) | CORE |
| [packages/store/src/store.ts:3088](../../packages/store/src/store.ts#L3088) `Store/setAuditSettings` | `SQLite.prepare` (3088); `Store.sql` (3088) | CORE |
| [packages/store/src/store.ts:9325](../../packages/store/src/store.ts#L9325) `Store/setContainer` | `Store.sql` (9325); `Store.row` (9331) | CORE |
| [packages/store/src/store.ts:4061](../../packages/store/src/store.ts#L4061) `Store/setExternalAccount` | `SQLite.get` (4061); `SQLite.prepare` (4061, 4066); `Store.sql` (4061, 4066) | CORE |
| [packages/store/src/store.ts:5287](../../packages/store/src/store.ts#L5287) `Store/setMustChangePassword` | `SQLite.prepare` (5287); `Store.sql` (5287) | CORE |
| [packages/store/src/store.ts:4324](../../packages/store/src/store.ts#L4324) `Store/setPasswordOnly` | `SQLite.get` (4324); `SQLite.prepare` (4324, 4330, 4339, 4346, 4347, 4348); `Store.sql` (4324, 4330, 4339, 4346, 4347, 4348) | AUTH |
| [packages/store/src/store.ts:4441](../../packages/store/src/store.ts#L4441) `Store/setPasswordPolicy` | `SQLite.prepare` (4441); `Store.sql` (4441) | CORE |
| [packages/store/src/store.ts:1726](../../packages/store/src/store.ts#L1726) `Store/setPersistentData` | `SQLite.prepare` (1726, 1730); `Store.sql` (1726, 1730) | CORE |
| [packages/store/src/store.ts:4684](../../packages/store/src/store.ts#L4684) `Store/setPiiIsolation` | `SQLite.prepare` (4684); `Store.sql` (4684) | CORE |
| [packages/store/src/store.ts:4477](../../packages/store/src/store.ts#L4477) `Store/setRequireTotpForFullAccess` | `SQLite.prepare` (4477); `Store.sql` (4477) | CORE |
| [packages/store/src/store.ts:4596](../../packages/store/src/store.ts#L4596) `Store/setScriptNetwork` | `SQLite.prepare` (4596); `Store.sql` (4596) | CORE |
| [packages/store/src/store.ts:4653](../../packages/store/src/store.ts#L4653) `Store/setSqlRequiresFmxdbc` | `SQLite.prepare` (4653); `Store.sql` (4653) | CORE |
| [packages/store/src/store.ts:10367](../../packages/store/src/store.ts#L10367) `Store/setStoredCalcValues` | `SQLite.prepare` (10367, 10368); `Store.sql` (10367, 10368); `SQLite.get` (10372) | CORE |
| [packages/store/src/store.ts:5764](../../packages/store/src/store.ts#L5764) `Store/settleSignIns` | `SQLite.all` (5764, 5770); `SQLite.prepare` (5764, 5770, 5776, 5780, 5782); `Store.sql` (5764, 5770, 5776, 5780, 5782) | AUTH |
| [packages/store/src/store.ts:9428](../../packages/store/src/store.ts#L9428) `Store/setUserPref` | `Store.sql` (9428, 9429, 9430); `SQLite.prepare` (9429, 9430) | CORE |
| [packages/store/src/store.ts:4637](../../packages/store/src/store.ts#L4637) `Store/setWebViewerHosts` | `SQLite.prepare` (4637); `Store.sql` (4637) | CORE |
| [packages/store/src/store.ts:2379](../../packages/store/src/store.ts#L2379) `Store/shareResults` | `Store.sql` (2379) | CORE |
| [packages/store/src/store.ts:1788](../../packages/store/src/store.ts#L1788) `Store/shipWal` | `Store.sql` (1788) | CORE |
| [packages/store/src/store.ts:5711](../../packages/store/src/store.ts#L5711) `Store/signInBase` | `SQLite.get` (5711); `SQLite.prepare` (5711); `Store.sql` (5711) | AUTH |
| [packages/store/src/store.ts:5713](../../packages/store/src/store.ts#L5713) `Store/signInBase/identity` | `SQLite.get` (5713); `SQLite.prepare` (5713); `Store.sql` (5713) | AUTH |
| [packages/store/src/store.ts:5700](../../packages/store/src/store.ts#L5700) `Store/signInMark` | `SQLite.prepare` (5700); `Store.sql` (5700) | AUTH |
| [packages/store/src/store.ts:9594](../../packages/store/src/store.ts#L9594) `Store/sortedPage` | `SQLite.iterate` (9594); `SQLite.prepare` (9594, 9609); `Store.sql` (9594, 9609); `SQLite.all` (9609) | CORE |
| [packages/store/src/store.ts:11559](../../packages/store/src/store.ts#L11559) `Store/sortIdsCurrentProgress` | `Store.sortIds` (11559); `Store.sortIdsProgress` (11559); `SQLite.all` (11572); `SQLite.prepare` (11572, 11651); `Store.sql` (11572, 11651); `Store.valueListItems` (11580); `rowsById` (11592); `Calculations.globalValue` (11595); `Calculations.unstoredValue` (11596); `Calculations.related` (11602); `SQLite.iterate` (11651) | GATED-STORE |
| [packages/store/src/store.ts:11739](../../packages/store/src/store.ts#L11739) `Store/storedFileId` | `SQLite.get` (11739); `SQLite.prepare` (11739) | CORE |
| [packages/store/src/store.ts:9742](../../packages/store/src/store.ts#L9742) `Store/summaries` | `Calculations.wholeTable` (9742); `Calculations.collect` (9762, 9767) | CORE |
| [packages/store/src/store.ts:9758](../../packages/store/src/store.ts#L9758) `Store/summaries/recs` | `SQLite.iterate` (9758); `SQLite.prepare` (9758); `Store.sql` (9758) | CORE |
| [packages/store/src/store.ts:6277](../../packages/store/src/store.ts#L6277) `Store/takeWebauthnChallenge` | `SQLite.get` (6277); `SQLite.prepare` (6277, 6281); `Store.sql` (6277, 6281) | CORE |
| [packages/store/src/store.ts:7534](../../packages/store/src/store.ts#L7534) `Store/themes` | `SQLite.get` (7534) | CORE |
| [packages/store/src/store.ts:9481](../../packages/store/src/store.ts#L9481) `Store/timeFind` | `Store.query` (9481) | CORE |
| [packages/store/src/store.ts:7869](../../packages/store/src/store.ts#L7869) `Store/toRecord` | `Calculations.value` (7869, 7879); `Calculations.globalValue` (7873); `Calculations.unstoredStyled` (7878) | CORE |
| [packages/store/src/store.ts:6161](../../packages/store/src/store.ts#L6161) `Store/totpAccounts` | `SQLite.all` (6161); `SQLite.prepare` (6161); `Store.sql` (6161) | CORE |
| [packages/store/src/store.ts:1800](../../packages/store/src/store.ts#L1800) `Store/trial` | `Store.sql` (1800) | CORE |
| [packages/store/src/store.ts:1805](../../packages/store/src/store.ts#L1805) `Store/trial/undo` | `Store.sql` (1805) | CORE |
| [packages/store/src/store.ts:11695](../../packages/store/src/store.ts#L11695) `Store/truncate/run` | `Store.sql` (11695, 11697, 11704, 11706, 11708, 11709); `SQLite.prepare` (11697, 11704); `SQLite.all` (11699) | CORE |
| [packages/store/src/store.ts:4005](../../packages/store/src/store.ts#L4005) `Store/unmigratedAccounts` | `SQLite.all` (4005); `SQLite.prepare` (4005); `Store.sql` (4005) | CORE |
| [packages/store/src/store.ts:5193](../../packages/store/src/store.ts#L5193) `Store/unusedAccess` | `SQLite.get` (5193); `SQLite.prepare` (5193, 5202); `Store.sql` (5193, 5202); `SQLite.all` (5202) | CORE |
| [packages/store/src/store.ts:5241](../../packages/store/src/store.ts#L5241) `Store/unusedObjects` | `SQLite.get` (5241); `SQLite.prepare` (5241, 5244); `Store.sql` (5241, 5244); `SQLite.all` (5244) | CORE |
| [packages/store/src/store.ts:6401](../../packages/store/src/store.ts#L6401) `Store/unusedRecoveryHashes` | `SQLite.all` (6401); `SQLite.prepare` (6401); `Store.sql` (6401) | CORE |
| [packages/store/src/store.ts:5023](../../packages/store/src/store.ts#L5023) `Store/unusualAccess` | `Store.auditLog` (5023, 5089) | CORE |
| [packages/store/src/store.ts:10181](../../packages/store/src/store.ts#L10181) `Store/update` | `Store.row` (10181); `Store.sql` (10212, 10213, 10259, 10262) | CORE |
| [packages/store/src/store.ts:10215](../../packages/store/src/store.ts#L10215) `Store/update/undo` | `Store.sql` (10215) | CORE |
| [packages/store/src/store.ts:10652](../../packages/store/src/store.ts#L10652) `Store/updatePortals` | `Store.row` (10652, 10705); `relatedRows` (10706) | CORE |
| [packages/store/src/store.ts:10662](../../packages/store/src/store.ts#L10662) `Store/updatePortals/portal/related` | `relatedIdList` (10662) | CORE |
| [packages/store/src/store.ts:10634](../../packages/store/src/store.ts#L10634) `Store/updateRelated` | `relatedRows` (10634) | CORE |
| [packages/store/src/store.ts:5279](../../packages/store/src/store.ts#L5279) `Store/usageCounting` | `SQLite.get` (5279); `SQLite.prepare` (5279); `Store.sql` (5279) | CORE |
| [packages/store/src/store.ts:9419](../../packages/store/src/store.ts#L9419) `Store/userPrefs` | `SQLite.all` (9419); `SQLite.prepare` (9419); `Store.sql` (9419) | CORE |
| [packages/store/src/store.ts:8291](../../packages/store/src/store.ts#L8291) `Store/valueListItemsCurrent` | `Store.valueListItems` (8291); `Store.get` (8305); `relatedRows` (8306); `Store.row` (8306); `SQLite.iterate` (8308); `SQLite.prepare` (8308); `Store.sql` (8308); `Calculations.related` (8318); `Calculations.value` (8322, 8323) | GATED-STORE |
| [packages/store/src/store.ts:10866](../../packages/store/src/store.ts#L10866) `Store/vaultHeld` | `SQLite.get` (10866); `SQLite.prepare` (10866); `Store.sql` (10866) | CORE |
| [packages/store/src/store.ts:6361](../../packages/store/src/store.ts#L6361) `Store/verifyPasskeyCredential` | `SQLite.get` (6361); `SQLite.prepare` (6361, 6373); `Store.sql` (6361, 6373) | CORE |
| [packages/store/src/store.ts:6190](../../packages/store/src/store.ts#L6190) `Store/verifyTotp` | `SQLite.get` (6190); `SQLite.prepare` (6190, 6197); `Store.sql` (6190, 6197) | CORE |
| [packages/store/src/store.ts:2515](../../packages/store/src/store.ts#L2515) `Store/versionNumber` | `SQLite.get` (2515); `SQLite.prepare` (2515); `Store.sql` (2515) | CORE |
| [packages/store/src/store.ts:2390](../../packages/store/src/store.ts#L2390) `Store/versionTriggers` | `SQLite.get` (2390); `SQLite.prepare` (2390, 2395, 2396); `Store.sql` (2390, 2395, 2396, 2413, 2415, 2416, 2418); `SQLite.all` (2395, 2396) | CORE |
| [packages/store/src/store.ts:2358](../../packages/store/src/store.ts#L2358) `Store/warmSummariesCurrent` | `Calculations.wholeTable` (2358) | CORE |
| [packages/store/src/store.ts:4619](../../packages/store/src/store.ts#L4619) `Store/webViewerChecked` | `SQLite.get` (4619); `SQLite.prepare` (4619); `Store.sql` (4619) | CORE |
| [packages/store/src/store.ts:2094](../../packages/store/src/store.ts#L2094) `Store/withWriteTransaction` | `Store.sql` (2094, 2107, 2114, 2119, 2119) | CORE |
| [packages/store/src/store.ts:7798](../../packages/store/src/store.ts#L7798) `Store/wordIndex` | `Store.sql` (7798, 7806, 7811); `Store.recordCount` (7810); `SQLite.get` (7811); `SQLite.prepare` (7811) | CORE |
| [packages/store/src/store.ts:8989](../../packages/store/src/store.ts#L8989) `Store/writeExternalFile` | `Store.evaluateEach` (8989); `SQLite.prepare` (9012); `Store.sql` (9012) | CORE |
| [packages/store/src/store.ts:9013](../../packages/store/src/store.ts#L9013) `Store/writeExternalFile/taken` | `SQLite.get` (9013) | CORE |
| [packages/store/src/store.ts:6020](../../packages/store/src/store.ts#L6020) `Store/writeObjectUseRows` | `SQLite.prepare` (6020, 6021, 6026); `Store.sql` (6020, 6021, 6026) | CORE |
| [packages/store/src/store.ts:2570](../../packages/store/src/store.ts#L2570) `Store/writeToken` | `SQLite.get` (2570); `SQLite.prepare` (2570); `Store.sql` (2570) | CORE |
| [packages/store/src/store.ts:5992](../../packages/store/src/store.ts#L5992) `Store/writeUsage` | `Store.sql` (5992, 5993, 5995, 5999, 6001) | CORE |
| [packages/store/src/store.ts:6008](../../packages/store/src/store.ts#L6008) `Store/writeUsageRows` | `SQLite.prepare` (6008, 6009, 6015); `Store.sql` (6008, 6009, 6015) | CORE |
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
| [packages/store/src/store.ts:1089](../../packages/store/src/store.ts#L1089) `Store/referenceSecurity` | `SQLite.get` (1089); `SQLite.prepare` (1089); `Store.sql` (1089) | Internal File Access authorization reads only its version and file-local security metadata; public management reads require Full Access. No record values are read. |
| [packages/store/src/store.ts:1108](../../packages/store/src/store.ts#L1108) `Store/writeFileAccess` | `SQLite.prepare` (1108); `Store.sql` (1108) | Writes only File Access security metadata inside securityChange; public mutations require Full Access, while hosted rename observation changes display names without granting access. |
| [packages/store/src/store.ts:1150](../../packages/store/src/store.ts#L1150) `Store/resetFileAccessId` | `SQLite.prepare` (1150, 1152); `Store.sql` (1150, 1152) | Full Access checked inside the security transaction before writing the new reference identity and retaining the stable token-scope identity; no record data is read. |
| [packages/store/src/ess/driver.ts:123](../../packages/store/src/ess/driver.ts#L123) `SqliteDriver/query` | `SQLite.prepare` (123); `SQLite.iterate` (128) | CORE |
| [packages/store/src/ess/driver.ts:142](../../packages/store/src/ess/driver.ts#L142) `SqliteDriver/tables` | `SQLite.all` (142); `SQLite.prepare` (142) | CORE |
| [packages/store/src/ess/driver.ts:147](../../packages/store/src/ess/driver.ts#L147) `SqliteDriver/columns` | `SQLite.all` (147); `SQLite.prepare` (147) | CORE |
| [packages/store/src/ess/mirror.ts:81](../../packages/store/src/ess/mirror.ts#L81) `refreshMirror` | `SQLite.all` (81); `SQLite.prepare` (81, 83, 84, 85, 101, 102) | CORE |
| [packages/store/src/store.ts:1280](../../packages/store/src/store.ts#L1280) `Store/refreshShadow` | `Store.sql` (1280) | CORE |
| [packages/store/src/store.ts:1234](../../packages/store/src/store.ts#L1234) `Store/flushEssWrites` | `Store.sql` (1234, 1235, 1243, 1245); `SQLite.prepare` (1235, 1243, 1245) | CORE |
<!-- end generated read-gate inventory -->
