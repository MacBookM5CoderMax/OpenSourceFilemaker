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
| [packages/cli/src/main.ts:768](../../packages/cli/src/main.ts#L768) `accountsWithPasswordOff` | `SQLite.all` (768); `SQLite.prepare` (768) | OPERATOR |
| [packages/cli/src/main.ts:801](../../packages/cli/src/main.ts#L801) `hostedRead` | `SQLite.all` (801, 804); `SQLite.prepare` (801, 804); `Store.sql` (801, 804) | OPERATOR |
| [packages/cli/src/main.ts:2575](../../packages/cli/src/main.ts#L2575) `main` | `Store.orphanContainerReport` (2575); `Store.auditLog` (3058); `SQLite.get` (3327); `SQLite.prepare` (3327) | OPERATOR |
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
| [packages/server/src/cwp-xml.ts:721](../../packages/server/src/cwp-xml.ts#L721) `CwpXmlEndpoint/layoutDoc` | `Store.valueListItems` (721) | XML |
| [packages/server/src/cwp-xml.ts:625](../../packages/server/src/cwp-xml.ts#L625) `CwpXmlEndpoint/records` | `Store.get` (625, 645, 653); `Store.findIds` (628); `Store.sortIds` (633); `Store.getMany` (634); `Store.find` (635, 637, 639, 640, 646, 649) | XML |
| [packages/server/src/cwp-xml.ts:589](../../packages/server/src/cwp-xml.ts#L589) `CwpXmlEndpoint/write` | `Store.get` (589, 593, 602); `Store.find` (601) | XML sign-in requires fmxml; every record/version read and count passes the signed-in Privileges, and the response layout is checked for access and the same table before any mutation. Writes and response reads share an atomic transaction. |
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
| [packages/store/src/store.ts:5716](../../packages/store/src/store.ts#L5716) `Store/accountIdentityId` | `SQLite.get` (5716, 5722); `SQLite.prepare` (5716, 5721, 5722); `Store.sql` (5716, 5721, 5722) | CORE |
| [packages/store/src/store.ts:5710](../../packages/store/src/store.ts#L5710) `Store/accountIdentityIdIfSet` | `SQLite.get` (5710); `SQLite.prepare` (5710); `Store.sql` (5710) | CORE |
| [packages/store/src/store.ts:5672](../../packages/store/src/store.ts#L5672) `Store/accountInactive` | `SQLite.get` (5672); `SQLite.prepare` (5672); `Store.sql` (5672) | CORE |
| [packages/store/src/store.ts:5869](../../packages/store/src/store.ts#L5869) `Store/accountLocalOnly` | `SQLite.get` (5869); `SQLite.prepare` (5869); `Store.sql` (5869) | CORE |
| [packages/store/src/store.ts:6738](../../packages/store/src/store.ts#L6738) `Store/accountPrivilegeSet` | `SQLite.get` (6738); `SQLite.prepare` (6738); `Store.sql` (6738) | CORE |
| [packages/store/src/store.ts:5874](../../packages/store/src/store.ts#L5874) `Store/accountRequires2fa` | `SQLite.get` (5874); `SQLite.prepare` (5874); `Store.sql` (5874) | CORE |
| [packages/store/src/store.ts:4008](../../packages/store/src/store.ts#L4008) `Store/accounts` | `SQLite.all` (4008); `SQLite.prepare` (4008); `Store.sql` (4008) | CORE |
| [packages/store/src/store.ts:4004](../../packages/store/src/store.ts#L4004) `Store/accountsSharingLockout` | `SQLite.all` (4004); `SQLite.prepare` (4004); `Store.sql` (4004) | CORE |
| [packages/store/src/store.ts:6094](../../packages/store/src/store.ts#L6094) `Store/accountUsage` | `SQLite.get` (6094); `SQLite.prepare` (6094, 6095); `Store.sql` (6094, 6095); `SQLite.all` (6095); `Store.auditLog` (6111) | CORE |
| [packages/store/src/store.ts:8975](../../packages/store/src/store.ts#L8975) `Store/addContainer` | `SQLite.all` (8975); `SQLite.prepare` (8975, 8980, 8994, 8998, 8999); `Store.sql` (8975, 8980, 8994, 8996, 8998, 8999, 9001, 9004); `SQLite.get` (8985); `Store.containerRange` (8987) | CORE |
| [packages/store/src/store.ts:9021](../../packages/store/src/store.ts#L9021) `Store/addExternalContainer` | `SQLite.prepare` (9021); `Store.sql` (9021) | CORE |
| [packages/store/src/store.ts:9508](../../packages/store/src/store.ts#L9508) `Store/addFieldIndex` | `Store.sql` (9508) | CORE |
| [packages/store/src/store.ts:7620](../../packages/store/src/store.ts#L7620) `Store/addImage` | `Store.sql` (7620, 7621); `SQLite.prepare` (7621) | CORE |
| [packages/store/src/store.ts:6788](../../packages/store/src/store.ts#L6788) `Store/addProvisionedAccount` | `SQLite.get` (6788); `SQLite.prepare` (6788, 6792); `Store.sql` (6788, 6792) | CORE |
| [packages/store/src/store.ts:8080](../../packages/store/src/store.ts#L8080) `Store/addRelated` | `relatedRows` (8080); `rowsById` (8115); `firstRelatedEach` (8141) | CORE |
| [packages/store/src/store.ts:8068](../../packages/store/src/store.ts#L8068) `Store/addRelated/summaries` | `Calculations.summary` (8068) | CORE |
| [packages/store/src/store.ts:4026](../../packages/store/src/store.ts#L4026) `Store/agentNeedsApproval` | `SQLite.get` (4026); `SQLite.prepare` (4026); `Store.sql` (4026) | CORE |
| [packages/store/src/store.ts:7015](../../packages/store/src/store.ts#L7015) `Store/allowedIds` | `SQLite.iterate` (7015); `SQLite.prepare` (7015); `Store.sql` (7015) | CORE |
| [packages/store/src/store.ts:6151](../../packages/store/src/store.ts#L6151) `Store/apiToken` | `SQLite.get` (6151); `SQLite.prepare` (6151, 6169); `Store.sql` (6151, 6169) | CORE |
| [packages/store/src/store.ts:6127](../../packages/store/src/store.ts#L6127) `Store/apiTokens` | `SQLite.all` (6127); `SQLite.prepare` (6127); `Store.sql` (6127) | CORE |
| [packages/store/src/store.ts:4449](../../packages/store/src/store.ts#L4449) `Store/appendSecurityEvent` | `Store.sql` (4449) | CORE |
| [packages/store/src/store.ts:3466](../../packages/store/src/store.ts#L3466) `Store/appendSecurityRow` | `Store.sql` (3466) | CORE |
| [packages/store/src/store.ts:5492](../../packages/store/src/store.ts#L5492) `Store/applyAccountImport` | `Store.sql` (5492, 5500, 5529); `SQLite.get` (5500); `SQLite.prepare` (5500, 5529) | CORE |
| [packages/store/src/store.ts:2733](../../packages/store/src/store.ts#L2733) `Store/applyDesign` | `Store.sql` (2733, 2734, 2754, 2757, 2762, 2778, 2781, 2781); `SQLite.prepare` (2757, 2762) | CORE |
| [packages/store/src/store.ts:4278](../../packages/store/src/store.ts#L4278) `Store/approvePending` | `SQLite.get` (4278); `SQLite.prepare` (4278, 4290); `Store.sql` (4278, 4290) | CORE |
| [packages/store/src/store.ts:3257](../../packages/store/src/store.ts#L3257) `Store/audit/write` | `Store.sql` (3257) | CORE |
| [packages/store/src/store.ts:2845](../../packages/store/src/store.ts#L2845) `Store/auditLog` | `SQLite.all` (2845); `SQLite.prepare` (2845); `Store.sql` (2845) | CORE |
| [packages/store/src/store.ts:2266](../../packages/store/src/store.ts#L2266) `Store/backup` | `Store.sql` (2266) | CORE |
| [packages/store/src/store.ts:4032](../../packages/store/src/store.ts#L4032) `Store/blankPasswordAccounts` | `SQLite.all` (4032); `SQLite.prepare` (4032); `Store.sql` (4032) | CORE |
| [packages/store/src/store.ts:5420](../../packages/store/src/store.ts#L5420) `Store/canonicalAccount` | `SQLite.all` (5420); `SQLite.prepare` (5420); `Store.sql` (5420) | CORE |
| [packages/store/src/store.ts:10095](../../packages/store/src/store.ts#L10095) `Store/canView` | `Store.canView` (10095); `Store.row` (10096) | GATED-STORE |
| [packages/store/src/store.ts:10077](../../packages/store/src/store.ts#L10077) `Store/canViewRecord` | `SQLite.get` (10077); `SQLite.prepare` (10077); `Store.sql` (10077) | GATED-STORE |
| [packages/store/src/store.ts:11216](../../packages/store/src/store.ts#L11216) `Store/cascadeDelete` | `relatedRows` (11216) | CORE |
| [packages/store/src/store.ts:2566](../../packages/store/src/store.ts#L2566) `Store/changeOne` | `Store.sql` (2566, 2568) | CORE |
| [packages/store/src/store.ts:2569](../../packages/store/src/store.ts#L2569) `Store/changeOne/read` | `SQLite.get` (2569); `SQLite.prepare` (2569); `Store.sql` (2569) | CORE |
| [packages/store/src/store.ts:9365](../../packages/store/src/store.ts#L9365) `Store/checkContainerWrite` | `Store.row` (9365) | CORE |
| [packages/store/src/store.ts:10829](../../packages/store/src/store.ts#L10829) `Store/checkEditable` | `Store.row` (10829) | CORE |
| [packages/store/src/store.ts:1788](../../packages/store/src/store.ts#L1788) `Store/checkpoint` | `SQLite.get` (1788); `SQLite.prepare` (1788); `Store.sql` (1788) | CORE |
| [packages/store/src/store.ts:4177](../../packages/store/src/store.ts#L4177) `Store/checkProposedWrite` | `Store.row` (4177); `relatedRows` (4191) | CORE |
| [packages/store/src/store.ts:6774](../../packages/store/src/store.ts#L6774) `Store/clearAccountPrivilegeSet` | `SQLite.prepare` (6774); `Store.sql` (6774) | CORE |
| [packages/store/src/store.ts:1810](../../packages/store/src/store.ts#L1810) `Store/close` | `Store.sql` (1810) | CORE |
| [packages/store/src/store.ts:9324](../../packages/store/src/store.ts#L9324) `Store/compactFile` | `Store.sql` (9324, 9325, 9327) | CORE |
| [packages/store/src/store.ts:9745](../../packages/store/src/store.ts#L9745) `Store/computedRows` | `Store.sql` (9745, 9748, 9749, 9750, 9752, 9762, 9763, 9764, 9767); `SQLite.prepare` (9748, 9750, 9752, 9762); `SQLite.iterate` (9752); `Calculations.globalValue` (9755); `Calculations.unstoredValue` (9756); `Calculations.related` (9759); `SQLite.all` (9762) | CORE |
| [packages/store/src/store.ts:11343](../../packages/store/src/store.ts#L11343) `Store/computeValuesCurrent` | `Store.computeValues` (11343); `Store.sql` (11349, 11353); `SQLite.all` (11353); `SQLite.prepare` (11353) | GATED-STORE |
| [packages/store/src/store.ts:6196](../../packages/store/src/store.ts#L6196) `Store/confirmTotp` | `SQLite.get` (6196); `SQLite.prepare` (6196, 6198); `Store.sql` (6196, 6198) | CORE |
| [packages/store/src/store.ts:1418](../../packages/store/src/store.ts#L1418) `Store/constructor` | `Store.sql` (1418, 1420, 1422, 1423, 1427, 1431, 1432, 1441, 1449, 1465, 1470, 1475, 1476, 1480, 1481, 1482, 1489, 1493, 1497, 1498, 1499, 1501, 1511, 1512, 1516, 1519, 1520, 1522, 1523, 1526, 1527, 1531, 1532, 1536, 1537, 1540, 1543, 1544, 1546, 1549, 1550, 1554, 1555, 1559, 1560, 1564, 1565, 1566, 1569, 1570, 1573, 1574, 1576, 1576, 1577, 1577, 1578, 1582, 1584, 1588, 1590, 1593, 1594, 1595, 1598, 1599, 1601, 1603, 1604, 1608, 1609, 1611, 1623, 1625, 1626, 1627, 1627, 1631, 1632); `SQLite.get` (1422, 1441); `SQLite.prepare` (1422, 1441, 1449, 1501, 1519, 1520, 1523, 1526, 1531, 1536, 1543, 1549, 1554, 1559, 1569, 1573, 1576, 1577, 1598, 1603, 1608); `SQLite.all` (1519, 1526, 1531, 1536, 1543, 1549, 1554, 1559, 1569, 1573, 1576, 1577, 1598, 1603, 1608) | CORE |
| [packages/store/src/store.ts:6554](../../packages/store/src/store.ts#L6554) `Store/consumeRecoveryCode` | `SQLite.prepare` (6554); `Store.sql` (6554) | CORE |
| [packages/store/src/store.ts:8899](../../packages/store/src/store.ts#L8899) `Store/container` | `SQLite.get` (8899); `SQLite.prepare` (8899, 8908); `Store.sql` (8899, 8908); `SQLite.all` (8908) | CORE |
| [packages/store/src/store.ts:9333](../../packages/store/src/store.ts#L9333) `Store/containerId` | `Store.containerId` (9333); `Store.row` (9334) | CORE |
| [packages/store/src/store.ts:8916](../../packages/store/src/store.ts#L8916) `Store/containerInfo` | `SQLite.get` (8916); `SQLite.prepare` (8916); `Store.sql` (8916) | CORE |
| [packages/store/src/store.ts:8880](../../packages/store/src/store.ts#L8880) `Store/containerIntact` | `SQLite.get` (8880); `SQLite.prepare` (8880); `Store.sql` (8880) | CORE |
| [packages/store/src/store.ts:8819](../../packages/store/src/store.ts#L8819) `Store/containerIntegrityReport` | `SQLite.all` (8819); `SQLite.prepare` (8819, 8830); `Store.sql` (8819, 8830); `SQLite.get` (8830) | CORE |
| [packages/store/src/store.ts:8894](../../packages/store/src/store.ts#L8894) `Store/containerMeta` | `SQLite.get` (8894); `SQLite.prepare` (8894); `Store.sql` (8894) | CORE |
| [packages/store/src/store.ts:8950](../../packages/store/src/store.ts#L8950) `Store/containerRange` | `SQLite.all` (8950); `SQLite.prepare` (8950, 8957); `Store.sql` (8950, 8957); `SQLite.get` (8957) | CORE |
| [packages/store/src/store.ts:8721](../../packages/store/src/store.ts#L8721) `Store/containerReferences` | `SQLite.all` (8721, 8740, 8742, 8748, 8761, 8772, 8786); `SQLite.prepare` (8721, 8740, 8742, 8748, 8761, 8772, 8784, 8786); `Store.sql` (8721, 8740, 8742, 8748, 8761, 8772, 8784, 8786); `SQLite.get` (8784); `Store.row` (8795) | CORE |
| [packages/store/src/store.ts:11322](../../packages/store/src/store.ts#L11322) `Store/countIds` | `Store.countIds` (11322); `SQLite.get` (11327); `SQLite.prepare` (11327); `Store.sql` (11327) | GATED-STORE |
| [packages/store/src/store.ts:10126](../../packages/store/src/store.ts#L10126) `Store/create` | `SQLite.get` (10126); `SQLite.prepare` (10126, 10139); `Store.sql` (10126, 10139) | CORE |
| [packages/store/src/store.ts:4421](../../packages/store/src/store.ts#L4421) `Store/createAccountOnly` | `SQLite.get` (4421); `SQLite.prepare` (4421, 4425, 4431, 4436, 4441); `Store.sql` (4421, 4425, 4431, 4436, 4441) | CORE |
| [packages/store/src/store.ts:5927](../../packages/store/src/store.ts#L5927) `Store/createApiToken` | `SQLite.get` (5927, 5955); `SQLite.prepare` (5927, 5954, 5955, 5965); `Store.sql` (5927, 5954, 5955, 5965) | CORE |
| [packages/store/src/store.ts:5433](../../packages/store/src/store.ts#L5433) `Store/createLocalAccount` | `SQLite.prepare` (5433); `Store.sql` (5433) | CORE |
| [packages/store/src/store.ts:3998](../../packages/store/src/store.ts#L3998) `Store/credentialIdentity` | `SQLite.get` (3998); `SQLite.prepare` (3998); `Store.sql` (3998) | CORE |
| [packages/store/src/store.ts:5848](../../packages/store/src/store.ts#L5848) `Store/credentialStamp` | `SQLite.get` (5848); `SQLite.prepare` (5848); `Store.sql` (5848) | CORE |
| [packages/store/src/store.ts:7453](../../packages/store/src/store.ts#L7453) `Store/crossFileBusy` | `Store.sql` (7453) | AUTH |
| [packages/store/src/store.ts:7425](../../packages/store/src/store.ts#L7425) `Store/crossFileHash` | `SQLite.get` (7425); `SQLite.prepare` (7425); `Store.sql` (7425) | AUTH |
| [packages/store/src/store.ts:2356](../../packages/store/src/store.ts#L2356) `Store/dataVersion` | `SQLite.get` (2356); `SQLite.prepare` (2356); `Store.sql` (2356) | CORE |
| [packages/store/src/store.ts:11890](../../packages/store/src/store.ts#L11890) `Store/decimalViewSql` | `SQLite.all` (11890); `SQLite.prepare` (11890) | CORE |
| [packages/store/src/store.ts:10872](../../packages/store/src/store.ts#L10872) `Store/delete` | `Store.row` (10872) | CORE |
| [packages/store/src/store.ts:10880](../../packages/store/src/store.ts#L10880) `Store/delete/run` | `SQLite.get` (10880); `SQLite.prepare` (10880, 10885); `Store.sql` (10880, 10885) | CORE |
| [packages/store/src/store.ts:5587](../../packages/store/src/store.ts#L5587) `Store/deleteAccount` | `SQLite.prepare` (5587, 5591, 5592, 5593, 5594, 5595, 5596, 5597, 5598, 5605, 5607, 5609, 5611, 5615); `Store.sql` (5587, 5591, 5592, 5593, 5594, 5595, 5596, 5597, 5598, 5605, 5607, 5609, 5611, 5615) | CORE |
| [packages/store/src/store.ts:10956](../../packages/store/src/store.ts#L10956) `Store/deleteBeingUndone` | `SQLite.all` (10956); `SQLite.prepare` (10956); `Store.sql` (10956) | CORE |
| [packages/store/src/store.ts:3634](../../packages/store/src/store.ts#L3634) `Store/deletedRows` | `SQLite.get` (3634); `SQLite.prepare` (3634, 3636, 3636); `Store.sql` (3634, 3636, 3636); `SQLite.all` (3636, 3636) | CORE |
| [packages/store/src/store.ts:10968](../../packages/store/src/store.ts#L10968) `Store/deleteEndingTheLifeAt` | `SQLite.get` (10968); `SQLite.prepare` (10968); `Store.sql` (10968) | CORE |
| [packages/store/src/store.ts:6639](../../packages/store/src/store.ts#L6639) `Store/deletePrivilegeSet` | `SQLite.prepare` (6639); `Store.sql` (6639) | CORE |
| [packages/store/src/store.ts:4559](../../packages/store/src/store.ts#L4559) `Store/deleteScriptTest` | `SQLite.prepare` (4559); `Store.sql` (4559) | CORE |
| [packages/store/src/store.ts:10857](../../packages/store/src/store.ts#L10857) `Store/deleteVisibility` | `Store.canViewRecord` (10857) | CORE |
| [packages/store/src/store.ts:7562](../../packages/store/src/store.ts#L7562) `Store/design` | `SQLite.get` (7562) | CORE |
| [packages/store/src/store.ts:3744](../../packages/store/src/store.ts#L3744) `Store/designEffect` | `Store.sql` (3744, 3745, 3751, 3752, 3755, 3761, 3766, 3769, 3775, 3786, 3787, 3789, 3790, 3803, 3804, 3807, 3809, 3815, 3816, 3817, 3823, 3825, 3829, 3832, 3833, 3835, 3838, 3844, 3846, 3853, 3854, 3856, 3857, 3858, 3859, 3866, 3867, 3869, 3869, 3871, 3872, 3873, 3877, 3881, 3883, 3921, 3923, 3925); `SQLite.prepare` (3755, 3786, 3787, 3803, 3804, 3815, 3816, 3823, 3825, 3829, 3833, 3844, 3846, 3859, 3866, 3867, 3869, 3871, 3873, 3877, 3881); `SQLite.get` (3786, 3803, 3815, 3816, 3829, 3833, 3869, 3877); `SQLite.all` (3866, 3867); `SQLite.iterate` (3871) | CORE |
| [packages/store/src/store.ts:3737](../../packages/store/src/store.ts#L3737) `Store/designEffect/renameExcluded` | `SQLite.prepare` (3737); `Store.sql` (3737) | CORE |
| [packages/store/src/store.ts:3721](../../packages/store/src/store.ts#L3721) `Store/designEffect/renameKey` | `SQLite.prepare` (3721); `Store.sql` (3721) | CORE |
| [packages/store/src/store.ts:3675](../../packages/store/src/store.ts#L3675) `Store/designHistory` | `SQLite.all` (3675); `SQLite.prepare` (3675); `Store.sql` (3675) | CORE |
| [packages/store/src/store.ts:6217](../../packages/store/src/store.ts#L6217) `Store/disableTotp` | `SQLite.prepare` (6217); `Store.sql` (6217) | CORE |
| [packages/store/src/store.ts:3933](../../packages/store/src/store.ts#L3933) `Store/dropColumnIndexes` | `SQLite.all` (3933, 3935); `SQLite.prepare` (3933, 3935); `Store.sql` (3933, 3935, 3936) | CORE |
| [packages/store/src/store.ts:9520](../../packages/store/src/store.ts#L9520) `Store/dropFieldIndex` | `SQLite.get` (9520); `SQLite.prepare` (9520); `Store.sql` (9520, 9521) | CORE |
| [packages/store/src/store.ts:10165](../../packages/store/src/store.ts#L10165) `Store/duplicate` | `Store.row` (10165); `SQLite.prepare` (10183); `Store.sql` (10183) | CORE |
| [packages/store/src/store.ts:9137](../../packages/store/src/store.ts#L9137) `Store/embeddedContainerCount` | `SQLite.prepare` (9137); `Store.sql` (9137); `SQLite.get` (9138) | CORE |
| [packages/store/src/store.ts:9123](../../packages/store/src/store.ts#L9123) `Store/embeddedContainers` | `SQLite.prepare` (9123, 9124); `Store.sql` (9123, 9124); `SQLite.all` (9124); `SQLite.get` (9128) | CORE |
| [packages/store/src/store.ts:3660](../../packages/store/src/store.ts#L3660) `Store/emptyDeleted` | `Store.sql` (3660, 3663, 3664, 3666, 3668); `SQLite.prepare` (3664) | CORE |
| [packages/store/src/store.ts:2232](../../packages/store/src/store.ts#L2232) `Store/endTransaction` | `Store.sql` (2232, 2235, 2235) | CORE |
| [packages/store/src/store.ts:6185](../../packages/store/src/store.ts#L6185) `Store/enrollTotp` | `SQLite.prepare` (6185); `Store.sql` (6185) | CORE |
| [packages/store/src/store.ts:3629](../../packages/store/src/store.ts#L3629) `Store/ensureDeleted` | `Store.sql` (3629) | CORE |
| [packages/store/src/store.ts:1642](../../packages/store/src/store.ts#L1642) `Store/ensureNativeIds` | `SQLite.all` (1642, 1654); `SQLite.prepare` (1642, 1645, 1653, 1654); `Store.sql` (1642, 1645, 1648, 1652, 1653, 1654, 1657, 1659) | CORE |
| [packages/store/src/store.ts:2478](../../packages/store/src/store.ts#L2478) `Store/ensureRecordIdHighWater` | `Store.sql` (2478, 2479, 2481, 2483, 2485) | CORE |
| [packages/store/src/store.ts:2497](../../packages/store/src/store.ts#L2497) `Store/ensureRecordIdMarks` | `SQLite.all` (2497, 2500, 2503, 2512); `SQLite.prepare` (2497, 2500, 2503, 2506, 2512, 2515); `Store.sql` (2497, 2500, 2503, 2506, 2512, 2515, 2519, 2520) | CORE |
| [packages/store/src/store.ts:10506](../../packages/store/src/store.ts#L10506) `Store/evaluateCurrent` | `Store.row` (10506, 10506, 10507, 10507); `Calculations.context` (10512); `Store.get` (10513, 10515) | GATED-STORE |
| [packages/store/src/store.ts:10547](../../packages/store/src/store.ts#L10547) `Store/evaluateEachCurrent` | `Store.row` (10547, 10547, 10552); `Calculations.context` (10553); `Store.get` (10555) | GATED-STORE |
| [packages/store/src/store.ts:10609](../../packages/store/src/store.ts#L10609) `Store/evaluateRowsCurrent` | `Store.row` (10609, 10609, 10610, 10610) | GATED-STORE |
| [packages/store/src/store.ts:10588](../../packages/store/src/store.ts#L10588) `Store/evaluateRowsCurrent/each` | `Calculations.context` (10588); `Store.get` (10590) | GATED-STORE |
| [packages/store/src/store.ts:10624](../../packages/store/src/store.ts#L10624) `Store/evaluateRowsCurrent/found/[Symbol.iterator]` | `rowsById` (10624) | GATED-STORE |
| [packages/store/src/store.ts:10646](../../packages/store/src/store.ts#L10646) `Store/evaluateRowsCurrent/key` | `Calculations.context` (10646) | GATED-STORE |
| [packages/store/src/store.ts:4322](../../packages/store/src/store.ts#L4322) `Store/externalAccount` | `SQLite.all` (4322); `SQLite.prepare` (4322); `Store.sql` (4322) | CORE |
| [packages/store/src/store.ts:8642](../../packages/store/src/store.ts#L8642) `Store/externalContainerCheck` | `SQLite.all` (8642); `SQLite.prepare` (8642); `Store.sql` (8642) | CORE |
| [packages/store/src/store.ts:8649](../../packages/store/src/store.ts#L8649) `Store/externalContainerCount` | `SQLite.get` (8649); `SQLite.prepare` (8649); `Store.sql` (8649) | CORE |
| [packages/store/src/store.ts:8658](../../packages/store/src/store.ts#L8658) `Store/externalContainerReport` | `SQLite.all` (8658, 8671); `SQLite.prepare` (8658, 8671); `Store.sql` (8658, 8671) | CORE |
| [packages/store/src/store.ts:5698](../../packages/store/src/store.ts#L5698) `Store/externalIdentityId` | `SQLite.get` (5698, 5705); `SQLite.prepare` (5698, 5704, 5705); `Store.sql` (5698, 5704, 5705) | CORE |
| [packages/store/src/store.ts:8890](../../packages/store/src/store.ts#L8890) `Store/externalOf` | `SQLite.get` (8890); `SQLite.prepare` (8890); `Store.sql` (8890) | CORE |
| [packages/store/src/store.ts:3410](../../packages/store/src/store.ts#L3410) `Store/failureAuditRoom` | `SQLite.get` (3410); `SQLite.prepare` (3410); `Store.sql` (3410) | CORE |
| [packages/store/src/store.ts:8289](../../packages/store/src/store.ts#L8289) `Store/fieldIndexCurrent` | `SQLite.iterate` (8289); `SQLite.prepare` (8289, 8294); `Store.sql` (8289, 8294); `SQLite.all` (8294) | GATED-STORE |
| [packages/store/src/store.ts:9560](../../packages/store/src/store.ts#L9560) `Store/find` | `Store.find` (9560) | GATED-STORE |
| [packages/store/src/store.ts:9932](../../packages/store/src/store.ts#L9932) `Store/findCandidates` | `Store.query` (9932) | CORE |
| [packages/store/src/store.ts:9571](../../packages/store/src/store.ts#L9571) `Store/findHere` | `Store.query` (9571, 9576, 9578, 9592, 9594, 9605); `Store.recordCount` (9589); `SQLite.get` (9590, 9594); `SQLite.prepare` (9590, 9594, 9600, 9607, 9616); `Store.sql` (9590, 9594, 9600, 9607, 9616); `SQLite.all` (9600, 9607, 9616) | GATED-STORE |
| [packages/store/src/store.ts:9611](../../packages/store/src/store.ts#L9611) `Store/findHere/[Symbol.iterator]` | `SQLite.iterate` (9611); `SQLite.prepare` (9611); `Store.sql` (9611) | GATED-STORE |
| [packages/store/src/store.ts:11455](../../packages/store/src/store.ts#L11455) `Store/findIdsCurrent` | `Store.findIds` (11455) | GATED-STORE |
| [packages/store/src/store.ts:11390](../../packages/store/src/store.ts#L11390) `Store/findIdsCurrentProgress` | `Store.findIdsProgress` (11390); `Store.query` (11392, 11394, 11407, 11409); `Store.recordCount` (11399, 11427); `SQLite.iterate` (11424); `SQLite.prepare` (11424, 11432, 11433); `Store.sql` (11424, 11432, 11433); `SQLite.get` (11436); `SQLite.all` (11442) | GATED-STORE |
| [packages/store/src/store.ts:11461](../../packages/store/src/store.ts#L11461) `Store/findIdsHere` | `Store.query` (11461, 11467, 11469); `SQLite.iterate` (11480); `SQLite.prepare` (11480); `Store.sql` (11480) | GATED-STORE |
| [packages/store/src/store.ts:9876](../../packages/store/src/store.ts#L9876) `Store/findSource` | `Store.query` (9876); `SQLite.all` (9885, 9902); `SQLite.prepare` (9885, 9893, 9901); `Store.sql` (9885, 9890, 9893, 9898, 9901, 9915, 9917); `Calculations.globalValue` (9907); `Calculations.unstoredValue` (9908); `Calculations.related` (9912) | CORE |
| [packages/store/src/store.ts:3522](../../packages/store/src/store.ts#L3522) `Store/flushDeferredSecurity` | `Store.sql` (3522) | CORE |
| [packages/store/src/store.ts:5554](../../packages/store/src/store.ts#L5554) `Store/forgetStandIns` | `SQLite.prepare` (5554); `Store.sql` (5554) | CORE |
| [packages/store/src/store.ts:10923](../../packages/store/src/store.ts#L10923) `Store/forgetStandInValues` | `Store.sql` (10923, 10944); `SQLite.prepare` (10944) | CORE |
| [packages/store/src/store.ts:8170](../../packages/store/src/store.ts#L8170) `Store/foundSetPage` | `rowsById` (8170) | CORE |
| [packages/store/src/store.ts:8186](../../packages/store/src/store.ts#L8186) `Store/foundSetRowsCurrent` | `Store.viewableIds` (8186); `Store.row` (8202) | GATED-STORE |
| [packages/store/src/store.ts:4240](../../packages/store/src/store.ts#L4240) `Store/gateAgentWrite` | `SQLite.get` (4240); `SQLite.prepare` (4240, 4242); `Store.sql` (4240, 4242) | CORE |
| [packages/store/src/store.ts:6492](../../packages/store/src/store.ts#L6492) `Store/generateRecoveryCodes` | `SQLite.prepare` (6492, 6495); `Store.sql` (6492, 6495) | CORE |
| [packages/store/src/store.ts:10005](../../packages/store/src/store.ts#L10005) `Store/getCurrent` | `Store.get` (10005); `Store.row` (10006, 10006, 10020); `SQLite.all` (10023); `SQLite.prepare` (10023); `Store.sql` (10023) | GATED-STORE |
| [packages/store/src/store.ts:10043](../../packages/store/src/store.ts#L10043) `Store/getManyCurrent` | `Store.getMany` (10043); `SQLite.get` (10061); `SQLite.prepare` (10061); `Store.sql` (10061) | GATED-STORE |
| [packages/store/src/store.ts:10054](../../packages/store/src/store.ts#L10054) `Store/getManyCurrent/[Symbol.iterator]` | `rowsById` (10054) | GATED-STORE |
| [packages/store/src/store.ts:1689](../../packages/store/src/store.ts#L1689) `Store/grantFullAccessClients` | `SQLite.prepare` (1689); `Store.sql` (1689) | CORE |
| [packages/store/src/store.ts:11497](../../packages/store/src/store.ts#L11497) `Store/groupSummariesCurrent` | `Store.groupSummaries` (11497); `Store.viewableIds` (11502); `Calculations.collect` (11518); `rowsById` (11518, 11568); `Calculations.collector` (11540) | GATED-STORE |
| [packages/store/src/store.ts:11566](../../packages/store/src/store.ts#L11566) `Store/groupSummariesCurrent/flush` | `Calculations.collector` (11566) | GATED-STORE |
| [packages/store/src/store.ts:11530](../../packages/store/src/store.ts#L11530) `Store/groupSummariesCurrent/key` | `Calculations.value` (11530); `Calculations.related` (11532) | GATED-STORE |
| [packages/store/src/store.ts:1716](../../packages/store/src/store.ts#L1716) `Store/hasOwnPassword` | `SQLite.get` (1716); `SQLite.prepare` (1716); `Store.sql` (1716) | CORE |
| [packages/store/src/store.ts:6347](../../packages/store/src/store.ts#L6347) `Store/hasPasskey` | `SQLite.get` (6347); `SQLite.prepare` (6347); `Store.sql` (6347) | CORE |
| [packages/store/src/store.ts:1697](../../packages/store/src/store.ts#L1697) `Store/hasProvingPassword` | `SQLite.get` (1697); `SQLite.prepare` (1697); `Store.sql` (1697) | CORE |
| [packages/store/src/store.ts:9474](../../packages/store/src/store.ts#L9474) `Store/hasTable` | `SQLite.get` (9474); `SQLite.prepare` (9474); `Store.sql` (9474) | CORE |
| [packages/store/src/store.ts:6206](../../packages/store/src/store.ts#L6206) `Store/hasTotp` | `SQLite.get` (6206); `SQLite.prepare` (6206); `Store.sql` (6206) | CORE |
| [packages/store/src/store.ts:5677](../../packages/store/src/store.ts#L5677) `Store/identityAllowed` | `SQLite.get` (5677, 5683, 5689); `SQLite.prepare` (5677, 5683, 5689); `Store.sql` (5677, 5683, 5689) | CORE |
| [packages/store/src/store.ts:7597](../../packages/store/src/store.ts#L7597) `Store/image` | `SQLite.get` (7597); `SQLite.prepare` (7597); `Store.sql` (7597) | CORE |
| [packages/store/src/store.ts:7607](../../packages/store/src/store.ts#L7607) `Store/images` | `SQLite.all` (7607); `SQLite.prepare` (7607); `Store.sql` (7607) | CORE |
| [packages/store/src/store.ts:5397](../../packages/store/src/store.ts#L5397) `Store/importAccounts` | `SQLite.all` (5397); `SQLite.prepare` (5397); `Store.sql` (5397) | CORE |
| [packages/store/src/store.ts:2031](../../packages/store/src/store.ts#L2031) `Store/independentWindowWrite` | `SQLite.get` (2031); `SQLite.prepare` (2031, 2039, 2100); `Store.sql` (2031, 2039, 2049, 2078, 2095, 2100, 2103); `SQLite.all` (2039); `Store.row` (2098) | CORE |
| [packages/store/src/store.ts:9486](../../packages/store/src/store.ts#L9486) `Store/indexedFields` | `SQLite.all` (9486, 9487); `SQLite.prepare` (9486, 9487); `Store.sql` (9486, 9487) | CORE |
| [packages/store/src/store.ts:11923](../../packages/store/src/store.ts#L11923) `Store/internalRoots` | `SQLite.get` (11923); `SQLite.prepare` (11923, 11925); `SQLite.all` (11925) | CORE |
| [packages/store/src/store.ts:4020](../../packages/store/src/store.ts#L4020) `Store/isAgent` | `SQLite.get` (4020); `SQLite.prepare` (4020); `Store.sql` (4020) | CORE |
| [packages/store/src/store.ts:4128](../../packages/store/src/store.ts#L4128) `Store/isExternal` | `SQLite.get` (4128); `SQLite.prepare` (4128); `Store.sql` (4128) | CORE |
| [packages/store/src/store.ts:6261](../../packages/store/src/store.ts#L6261) `Store/issueWebauthnChallenge` | `SQLite.prepare` (6261, 6263, 6264, 6266); `Store.sql` (6261, 6263, 6264, 6266); `SQLite.get` (6263) | CORE |
| [packages/store/src/store.ts:11784](../../packages/store/src/store.ts#L11784) `Store/iterateCommitted` | `SQLite.iterate` (11784) | CORE |
| [packages/store/src/store.ts:1970](../../packages/store/src/store.ts#L1970) `Store/joinTransaction` | `Store.sql` (1970, 1971, 1973, 1975, 1981, 1984) | CORE |
| [packages/store/src/store.ts:11163](../../packages/store/src/store.ts#L11163) `Store/keyStepWork` | `Store.sql` (11163, 11169, 11173, 11175) | CORE |
| [packages/store/src/store.ts:7413](../../packages/store/src/store.ts#L7413) `Store/knownSharedAccount` | `SQLite.get` (7413); `SQLite.prepare` (7413); `Store.sql` (7413) | CORE |
| [packages/store/src/store.ts:4870](../../packages/store/src/store.ts#L4870) `Store/lastSignIns` | `Store.auditLog` (4870) | CORE |
| [packages/store/src/store.ts:10974](../../packages/store/src/store.ts#L10974) `Store/latestDeleteSeq` | `SQLite.get` (10974); `SQLite.prepare` (10974); `Store.sql` (10974) | CORE |
| [packages/store/src/store.ts:7640](../../packages/store/src/store.ts#L7640) `Store/layout` | `SQLite.get` (7640); `SQLite.prepare` (7640); `Store.sql` (7640) | CORE |
| [packages/store/src/store.ts:3692](../../packages/store/src/store.ts#L3692) `Store/layoutHistory` | `SQLite.all` (3692); `SQLite.prepare` (3692); `Store.sql` (3692) | CORE |
| [packages/store/src/store.ts:7527](../../packages/store/src/store.ts#L7527) `Store/layouts` | `SQLite.all` (7527); `SQLite.prepare` (7527); `Store.sql` (7527) | CORE |
| [packages/store/src/store.ts:5170](../../packages/store/src/store.ts#L5170) `Store/leastPrivilege` | `SQLite.all` (5170); `SQLite.prepare` (5170); `Store.sql` (5170) | CORE |
| [packages/store/src/store.ts:5775](../../packages/store/src/store.ts#L5775) `Store/ledgerRow` | `SQLite.get` (5775, 5776); `SQLite.prepare` (5775, 5776); `Store.sql` (5775, 5776) | AUTH |
| [packages/store/src/store.ts:5787](../../packages/store/src/store.ts#L5787) `Store/ledgerWrite` | `Store.sql` (5787, 5788, 5790, 5792, 5795, 5795) | AUTH |
| [packages/store/src/store.ts:5481](../../packages/store/src/store.ts#L5481) `Store/limitAccountImport` | `SQLite.prepare` (5481, 5482, 5485); `Store.sql` (5481, 5482, 5485); `SQLite.get` (5482) | CORE |
| [packages/store/src/store.ts:3973](../../packages/store/src/store.ts#L3973) `Store/linkIdentity` | `SQLite.get` (3973); `SQLite.prepare` (3973); `Store.sql` (3973) | CORE |
| [packages/store/src/store.ts:3965](../../packages/store/src/store.ts#L3965) `Store/linkPrincipal` | `SQLite.get` (3965); `SQLite.prepare` (3965); `Store.sql` (3965) | CORE |
| [packages/store/src/store.ts:4756](../../packages/store/src/store.ts#L4756) `Store/markPiiField` | `SQLite.prepare` (4756); `Store.sql` (4756) | CORE |
| [packages/store/src/store.ts:8615](../../packages/store/src/store.ts#L8615) `Store/markRepeating` | `SQLite.prepare` (8615); `Store.sql` (8615) | CORE |
| [packages/store/src/store.ts:11715](../../packages/store/src/store.ts#L11715) `Store/matchIds` | `Store.matchIds` (11715); `SQLite.all` (11721); `SQLite.prepare` (11721); `Store.sql` (11721) | CORE |
| [packages/store/src/store.ts:1731](../../packages/store/src/store.ts#L1731) `Store/meta` | `SQLite.get` (1731); `SQLite.prepare` (1731); `Store.sql` (1731) | CORE |
| [packages/store/src/store.ts:1030](../../packages/store/src/store.ts#L1030) `Store/metadataVersions` | `SQLite.get` (1030); `SQLite.prepare` (1030); `Store.sql` (1030) | CORE |
| [packages/store/src/store.ts:9252](../../packages/store/src/store.ts#L9252) `Store/moveContainersIn` | `Store.sql` (9252, 9258, 9260, 9261, 9262, 9263, 9283, 9288, 9288, 9299, 9302, 9305, 9312); `SQLite.prepare` (9260, 9261, 9262, 9263, 9299, 9305); `SQLite.get` (9265, 9299, 9305) | CORE |
| [packages/store/src/store.ts:9174](../../packages/store/src/store.ts#L9174) `Store/moveContainersOut` | `Store.sql` (9174, 9182, 9184, 9186, 9191, 9192, 9212, 9218, 9220, 9222, 9222, 9228, 9228, 9233, 9235, 9237, 9237, 9243); `SQLite.get` (9182); `SQLite.prepare` (9182, 9191, 9192); `Store.container` (9194) | CORE |
| [packages/store/src/store.ts:5351](../../packages/store/src/store.ts#L5351) `Store/mustChangePassword` | `SQLite.get` (5351); `SQLite.prepare` (5351); `Store.sql` (5351) | CORE |
| [packages/store/src/store.ts:1667](../../packages/store/src/store.ts#L1667) `Store/nativeIdGuards` | `Store.sql` (1667, 1668, 1670) | CORE |
| [packages/store/src/store.ts:2533](../../packages/store/src/store.ts#L2533) `Store/nextRecordId` | `SQLite.get` (2533); `SQLite.prepare` (2533); `Store.sql` (2533) | CORE |
| [packages/store/src/store.ts:6081](../../packages/store/src/store.ts#L6081) `Store/objectUseSince` | `SQLite.get` (6081); `SQLite.prepare` (6081); `Store.sql` (6081) | CORE |
| [packages/store/src/store.ts:9446](../../packages/store/src/store.ts#L9446) `Store/orderBy` | `Store.valueListItems` (9446) | CORE |
| [packages/store/src/store.ts:8807](../../packages/store/src/store.ts#L8807) `Store/orphanContainerReport` | `SQLite.all` (8807); `SQLite.prepare` (8807); `Store.sql` (8807) | CORE |
| [packages/store/src/store.ts:6313](../../packages/store/src/store.ts#L6313) `Store/passkeyAllowList` | `SQLite.all` (6313); `SQLite.prepare` (6313); `Store.sql` (6313) | CORE |
| [packages/store/src/store.ts:6352](../../packages/store/src/store.ts#L6352) `Store/passkeyIds` | `SQLite.all` (6352); `SQLite.prepare` (6352); `Store.sql` (6352) | CORE |
| [packages/store/src/store.ts:6340](../../packages/store/src/store.ts#L6340) `Store/passkeys` | `SQLite.all` (6340); `SQLite.prepare` (6340); `Store.sql` (6340) | CORE |
| [packages/store/src/store.ts:5390](../../packages/store/src/store.ts#L5390) `Store/passwordDaysRemaining` | `SQLite.get` (5390); `SQLite.prepare` (5390); `Store.sql` (5390) | CORE |
| [packages/store/src/store.ts:7371](../../packages/store/src/store.ts#L7371) `Store/passwordState` | `SQLite.get` (7371); `SQLite.prepare` (7371); `Store.sql` (7371) | CORE |
| [packages/store/src/store.ts:4264](../../packages/store/src/store.ts#L4264) `Store/pendingChanges` | `SQLite.all` (4264); `SQLite.prepare` (4264); `Store.sql` (4264) | CORE |
| [packages/store/src/store.ts:1749](../../packages/store/src/store.ts#L1749) `Store/persistentData` | `SQLite.get` (1749) | CORE |
| [packages/store/src/store.ts:1758](../../packages/store/src/store.ts#L1758) `Store/persistentDataIds` | `SQLite.all` (1758) | CORE |
| [packages/store/src/store.ts:1739](../../packages/store/src/store.ts#L1739) `Store/persistentTable` | `Store.sql` (1739) | CORE |
| [packages/store/src/store.ts:10814](../../packages/store/src/store.ts#L10814) `Store/portalContainerTarget` | `Store.row` (10814); `relatedIdList` (10816) | CORE |
| [packages/store/src/store.ts:8225](../../packages/store/src/store.ts#L8225) `Store/portalCountsCurrent` | `Store.canView` (8225); `Store.row` (8252) | GATED-STORE |
| [packages/store/src/store.ts:8470](../../packages/store/src/store.ts#L8470) `Store/portalRows` | `relatedRows` (8470); `relatedIdList` (8471); `Store.viewableSet` (8474); `rowsById` (8499, 8537); `Calculations.related` (8513) | CORE |
| [packages/store/src/store.ts:8481](../../packages/store/src/store.ts#L8481) `Store/portalRows/context` | `Calculations.context` (8481) | CORE |
| [packages/store/src/store.ts:8491](../../packages/store/src/store.ts#L8491) `Store/portalRows/valueOf` | `Calculations.value` (8491) | CORE |
| [packages/store/src/store.ts:2911](../../packages/store/src/store.ts#L2911) `Store/prepared` | `SQLite.prepare` (2911); `Store.sql` (2911) | CORE |
| [packages/store/src/store.ts:5463](../../packages/store/src/store.ts#L5463) `Store/previewAccountImport` | `Store.sql` (5463, 5464, 5473) | CORE |
| [packages/store/src/store.ts:7169](../../packages/store/src/store.ts#L7169) `Store/previewRecordRuleCurrent` | `SQLite.get` (7169); `SQLite.prepare` (7169, 7172); `Store.sql` (7169, 7172); `SQLite.all` (7172); `Calculations.context` (7178, 7194) | CORE |
| [packages/store/src/store.ts:9967](../../packages/store/src/store.ts#L9967) `Store/previewRow` | `Store.row` (9967) | CORE |
| [packages/store/src/store.ts:6567](../../packages/store/src/store.ts#L6567) `Store/privilegeSets` | `Store.sql` (6567) | CORE |
| [packages/store/src/store.ts:3149](../../packages/store/src/store.ts#L3149) `Store/pruneAudit` | `Store.sql` (3149, 3152, 3157, 3159, 3167, 3172, 3174); `SQLite.get` (3157, 3170, 3174); `SQLite.prepare` (3157, 3167, 3174) | CORE |
| [packages/store/src/store.ts:8842](../../packages/store/src/store.ts#L8842) `Store/purgeOrphanContainers` | `Store.sql` (8842, 8846, 8855, 8858, 8859, 8864, 8865, 8867, 8867); `Store.orphanContainerReport` (8850); `SQLite.get` (8855); `SQLite.prepare` (8855, 8858, 8859) | CORE |
| [packages/store/src/store.ts:12046](../../packages/store/src/store.ts#L12046) `Store/query` | `SQLite.iterate` (12046) | CORE |
| [packages/store/src/store.ts:12086](../../packages/store/src/store.ts#L12086) `Store/queryWithOriginsCurrent` | `SQLite.iterate` (12086); `SQLite.all` (12095, 12098); `SQLite.prepare` (12095, 12098) | CORE |
| [packages/store/src/store.ts:11835](../../packages/store/src/store.ts#L11835) `Store/readOnlyChecked` | `SQLite.prepare` (11835, 11839, 11848, 11853); `SQLite.all` (11839, 11848, 11853) | CORE |
| [packages/store/src/store.ts:3945](../../packages/store/src/store.ts#L3945) `Store/recompute` | `SQLite.prepare` (3945, 3949); `Store.sql` (3945, 3949); `SQLite.iterate` (3949); `Calculations.computeStoredStyled` (3950); `Calculations.value` (3950) | CORE |
| [packages/store/src/store.ts:2926](../../packages/store/src/store.ts#L2926) `Store/recordAsOf` | `SQLite.get` (2926, 2928); `SQLite.prepare` (2926, 2928, 2930, 2931); `Store.sql` (2926, 2928, 2930, 2931); `SQLite.all` (2930, 2931) | CORE |
| [packages/store/src/store.ts:2620](../../packages/store/src/store.ts#L2620) `Store/recordCount` | `SQLite.get` (2620); `SQLite.prepare` (2620); `Store.sql` (2620) | CORE |
| [packages/store/src/store.ts:1796](../../packages/store/src/store.ts#L1796) `Store/recordedFormat` | `Store.sql` (1796) | CORE |
| [packages/store/src/store.ts:3004](../../packages/store/src/store.ts#L3004) `Store/recordLife` | `SQLite.all` (3004); `SQLite.prepare` (3004); `Store.sql` (3004) | CORE |
| [packages/store/src/store.ts:6012](../../packages/store/src/store.ts#L6012) `Store/recordObjectUse` | `Store.sql` (6012) | CORE |
| [packages/store/src/store.ts:10496](../../packages/store/src/store.ts#L10496) `Store/recordViewable` | `Store.row` (10496) | GATED-STORE |
| [packages/store/src/store.ts:9146](../../packages/store/src/store.ts#L9146) `Store/recoverContainersOut` | `SQLite.prepare` (9146); `Store.sql` (9146); `SQLite.get` (9149) | CORE |
| [packages/store/src/store.ts:1899](../../packages/store/src/store.ts#L1899) `Store/recoverPendingExternalFiles` | `Store.sql` (1899, 1901, 1925, 1927); `SQLite.prepare` (1901); `SQLite.get` (1912) | CORE |
| [packages/store/src/store.ts:6510](../../packages/store/src/store.ts#L6510) `Store/recoveryCodesRemaining` | `SQLite.get` (6510); `SQLite.prepare` (6510); `Store.sql` (6510) | CORE |
| [packages/store/src/store.ts:11875](../../packages/store/src/store.ts#L11875) `Store/refreshDecimalSqlViews` | `SQLite.get` (11875); `SQLite.prepare` (11875) | CORE |
| [packages/store/src/store.ts:4119](../../packages/store/src/store.ts#L4119) `Store/refuseLookalikeAccount` | `SQLite.all` (4119); `SQLite.prepare` (4119); `Store.sql` (4119) | CORE |
| [packages/store/src/store.ts:6376](../../packages/store/src/store.ts#L6376) `Store/registerPasskey` | `SQLite.prepare` (6376); `Store.sql` (6376) | CORE |
| [packages/store/src/store.ts:4300](../../packages/store/src/store.ts#L4300) `Store/rejectPending` | `SQLite.get` (4300); `SQLite.prepare` (4300, 4302); `Store.sql` (4300, 4302) | CORE |
| [packages/store/src/store.ts:9719](../../packages/store/src/store.ts#L9719) `Store/relatedCriteria` | `SQLite.iterate` (9719); `SQLite.prepare` (9719); `Store.sql` (9719) | CORE |
| [packages/store/src/store.ts:9716](../../packages/store/src/store.ts#L9716) `Store/relatedCriteria/matched` | `relatedRows` (9716) | CORE |
| [packages/store/src/store.ts:7980](../../packages/store/src/store.ts#L7980) `Store/relatedValues` | `Calculations.globalValue` (7980); `Calculations.unstoredValue` (7982) | CORE |
| [packages/store/src/store.ts:6389](../../packages/store/src/store.ts#L6389) `Store/removePasskey` | `SQLite.get` (6389); `SQLite.prepare` (6389, 6390); `Store.sql` (6389, 6390) | CORE |
| [packages/store/src/store.ts:9545](../../packages/store/src/store.ts#L9545) `Store/reportFind` | `Store.query` (9545, 9547, 9548); `Store.recordCount` (9550) | CORE |
| [packages/store/src/store.ts:11001](../../packages/store/src/store.ts#L11001) `Store/restoreDeletedRowLocked` | `SQLite.get` (11001, 11006); `SQLite.prepare` (11001, 11002, 11006, 11016); `Store.sql` (11001, 11002, 11006, 11016); `SQLite.all` (11002) | CORE |
| [packages/store/src/store.ts:2962](../../packages/store/src/store.ts#L2962) `Store/restoreRecord` | `Store.recordAsOf` (2962); `SQLite.get` (2966); `SQLite.prepare` (2966, 2971, 2980, 2991); `Store.sql` (2966, 2971, 2980, 2991) | CORE |
| [packages/store/src/store.ts:3020](../../packages/store/src/store.ts#L3020) `Store/revertAuditEntry` | `SQLite.get` (3020); `SQLite.prepare` (3020); `Store.sql` (3020); `Store.canViewRecord` (3022); `Store.auditLog` (3025) | CORE |
| [packages/store/src/store.ts:6137](../../packages/store/src/store.ts#L6137) `Store/revokeApiToken` | `SQLite.prepare` (6137); `Store.sql` (6137) | CORE |
| [packages/store/src/store.ts:5660](../../packages/store/src/store.ts#L5660) `Store/revokeSignInCredentials` | `SQLite.prepare` (5660, 5661, 5662); `Store.sql` (5660, 5661, 5662) | AUTH |
| [packages/store/src/store.ts:9986](../../packages/store/src/store.ts#L9986) `Store/row` | `SQLite.get` (9986) | CORE |
| [packages/store/src/store.ts:11979](../../packages/store/src/store.ts#L11979) `Store/rowsOf` | `SQLite.iterate` (11979, 11988) | CORE |
| [packages/store/src/store.ts:6974](../../packages/store/src/store.ts#L6974) `Store/ruleOutcome` | `Calculations.context` (6974) | CORE |
| [packages/store/src/store.ts:9830](../../packages/store/src/store.ts#L9830) `Store/runningSummaryValues` | `Store.viewableIds` (9830); `rowsById` (9832); `Calculations.value` (9843, 9849); `Calculations.related` (9860) | GATED-STORE |
| [packages/store/src/store.ts:6596](../../packages/store/src/store.ts#L6596) `Store/savePrivilegeSet` | `SQLite.prepare` (6596, 6604); `Store.sql` (6596, 6604) | AUTH |
| [packages/store/src/store.ts:4550](../../packages/store/src/store.ts#L4550) `Store/saveScriptTest` | `SQLite.prepare` (4550); `Store.sql` (4550) | CORE |
| [packages/store/src/store.ts:7134](../../packages/store/src/store.ts#L7134) `Store/scopedTableSql` | `Store.viewableIds` (7134); `SQLite.all` (7137); `SQLite.prepare` (7137); `Store.sql` (7137) | GATED-STORE |
| [packages/store/src/store.ts:3682](../../packages/store/src/store.ts#L3682) `Store/scriptHistory` | `SQLite.all` (3682); `SQLite.prepare` (3682); `Store.sql` (3682) | CORE |
| [packages/store/src/store.ts:1875](../../packages/store/src/store.ts#L1875) `Store/securityChainHeadAudit` | `SQLite.get` (1875); `SQLite.prepare` (1875); `Store.sql` (1875) | CORE |
| [packages/store/src/store.ts:3355](../../packages/store/src/store.ts#L3355) `Store/securityChange` | `Store.sql` (3355, 3357); `SQLite.prepare` (3357) | CORE |
| [packages/store/src/store.ts:2885](../../packages/store/src/store.ts#L2885) `Store/securityEvents` | `Store.auditLog` (2885) | CORE |
| [packages/store/src/store.ts:5861](../../packages/store/src/store.ts#L5861) `Store/securityToken` | `SQLite.get` (5861); `SQLite.prepare` (5861); `Store.sql` (5861) | CORE |
| [packages/store/src/store.ts:12009](../../packages/store/src/store.ts#L12009) `Store/selectHeldCurrent` | `Store.sql` (12009, 12011, 12014); `SQLite.prepare` (12011) | CORE |
| [packages/store/src/store.ts:11307](../../packages/store/src/store.ts#L11307) `Store/selectIdsCurrent` | `Store.selectIds` (11307); `SQLite.all` (11314); `SQLite.prepare` (11314); `Store.sql` (11314) | GATED-STORE |
| [packages/store/src/store.ts:11999](../../packages/store/src/store.ts#L11999) `Store/selectIn` | `Store.select` (11999) | CORE |
| [packages/store/src/store.ts:2286](../../packages/store/src/store.ts#L2286) `Store/selfContainedCopy` | `Store.sql` (2286); `SQLite.all` (2291); `SQLite.prepare` (2291, 2293, 2294, 2295) | CORE |
| [packages/store/src/store.ts:5639](../../packages/store/src/store.ts#L5639) `Store/setAccountActive` | `SQLite.prepare` (5639, 5647, 5648); `Store.sql` (5639, 5647, 5648) | AUTH |
| [packages/store/src/store.ts:5880](../../packages/store/src/store.ts#L5880) `Store/setAccountLocalOnly` | `SQLite.prepare` (5880); `Store.sql` (5880) | CORE |
| [packages/store/src/store.ts:6752](../../packages/store/src/store.ts#L6752) `Store/setAccountPrivilegeSet` | `SQLite.get` (6752); `SQLite.prepare` (6752, 6755, 6759); `Store.sql` (6752, 6755, 6759) | AUTH |
| [packages/store/src/store.ts:5889](../../packages/store/src/store.ts#L5889) `Store/setAccountRequire2fa` | `SQLite.prepare` (5889); `Store.sql` (5889) | CORE |
| [packages/store/src/store.ts:4152](../../packages/store/src/store.ts#L4152) `Store/setAgentAccount` | `SQLite.get` (4152); `SQLite.prepare` (4152, 4158); `Store.sql` (4152, 4158) | CORE |
| [packages/store/src/store.ts:4629](../../packages/store/src/store.ts#L4629) `Store/setAiAllowed` | `SQLite.prepare` (4629); `Store.sql` (4629) | CORE |
| [packages/store/src/store.ts:4714](../../packages/store/src/store.ts#L4714) `Store/setAiPolicy` | `SQLite.prepare` (4714); `Store.sql` (4714) | CORE |
| [packages/store/src/store.ts:7400](../../packages/store/src/store.ts#L7400) `Store/setAllowBlankPasswordFromLan` | `SQLite.prepare` (7400); `Store.sql` (7400) | CORE |
| [packages/store/src/store.ts:3126](../../packages/store/src/store.ts#L3126) `Store/setAuditSettings` | `SQLite.prepare` (3126); `Store.sql` (3126) | CORE |
| [packages/store/src/store.ts:9375](../../packages/store/src/store.ts#L9375) `Store/setContainer` | `Store.sql` (9375); `Store.row` (9381) | CORE |
| [packages/store/src/store.ts:4099](../../packages/store/src/store.ts#L4099) `Store/setExternalAccount` | `SQLite.get` (4099); `SQLite.prepare` (4099, 4104); `Store.sql` (4099, 4104) | CORE |
| [packages/store/src/store.ts:5337](../../packages/store/src/store.ts#L5337) `Store/setMustChangePassword` | `SQLite.prepare` (5337); `Store.sql` (5337) | CORE |
| [packages/store/src/store.ts:4353](../../packages/store/src/store.ts#L4353) `Store/setPasswordOnly` | `SQLite.all` (4353); `SQLite.prepare` (4353, 4359, 4374, 4380, 4389, 4396, 4397, 4398); `Store.sql` (4353, 4359, 4374, 4380, 4389, 4396, 4397, 4398); `SQLite.get` (4359, 4374) | AUTH |
| [packages/store/src/store.ts:4491](../../packages/store/src/store.ts#L4491) `Store/setPasswordPolicy` | `SQLite.prepare` (4491); `Store.sql` (4491) | CORE |
| [packages/store/src/store.ts:1764](../../packages/store/src/store.ts#L1764) `Store/setPersistentData` | `SQLite.prepare` (1764, 1768); `Store.sql` (1764, 1768) | CORE |
| [packages/store/src/store.ts:4734](../../packages/store/src/store.ts#L4734) `Store/setPiiIsolation` | `SQLite.prepare` (4734); `Store.sql` (4734) | CORE |
| [packages/store/src/store.ts:4527](../../packages/store/src/store.ts#L4527) `Store/setRequireTotpForFullAccess` | `SQLite.prepare` (4527); `Store.sql` (4527) | CORE |
| [packages/store/src/store.ts:4646](../../packages/store/src/store.ts#L4646) `Store/setScriptNetwork` | `SQLite.prepare` (4646); `Store.sql` (4646) | CORE |
| [packages/store/src/store.ts:4703](../../packages/store/src/store.ts#L4703) `Store/setSqlRequiresFmxdbc` | `SQLite.prepare` (4703); `Store.sql` (4703) | CORE |
| [packages/store/src/store.ts:10417](../../packages/store/src/store.ts#L10417) `Store/setStoredCalcValues` | `SQLite.prepare` (10417, 10418); `Store.sql` (10417, 10418); `SQLite.get` (10422) | CORE |
| [packages/store/src/store.ts:5814](../../packages/store/src/store.ts#L5814) `Store/settleSignIns` | `SQLite.all` (5814, 5820); `SQLite.prepare` (5814, 5820, 5826, 5830, 5832); `Store.sql` (5814, 5820, 5826, 5830, 5832) | AUTH |
| [packages/store/src/store.ts:9478](../../packages/store/src/store.ts#L9478) `Store/setUserPref` | `Store.sql` (9478, 9479, 9480); `SQLite.prepare` (9479, 9480) | CORE |
| [packages/store/src/store.ts:4687](../../packages/store/src/store.ts#L4687) `Store/setWebViewerHosts` | `SQLite.prepare` (4687); `Store.sql` (4687) | CORE |
| [packages/store/src/store.ts:2417](../../packages/store/src/store.ts#L2417) `Store/shareResults` | `Store.sql` (2417) | CORE |
| [packages/store/src/store.ts:1826](../../packages/store/src/store.ts#L1826) `Store/shipWal` | `Store.sql` (1826) | CORE |
| [packages/store/src/store.ts:5761](../../packages/store/src/store.ts#L5761) `Store/signInBase` | `SQLite.get` (5761); `SQLite.prepare` (5761); `Store.sql` (5761) | AUTH |
| [packages/store/src/store.ts:5763](../../packages/store/src/store.ts#L5763) `Store/signInBase/identity` | `SQLite.get` (5763); `SQLite.prepare` (5763); `Store.sql` (5763) | AUTH |
| [packages/store/src/store.ts:5750](../../packages/store/src/store.ts#L5750) `Store/signInMark` | `SQLite.prepare` (5750); `Store.sql` (5750) | AUTH |
| [packages/store/src/store.ts:9644](../../packages/store/src/store.ts#L9644) `Store/sortedPage` | `SQLite.iterate` (9644); `SQLite.prepare` (9644, 9659); `Store.sql` (9644, 9659); `SQLite.all` (9659) | CORE |
| [packages/store/src/store.ts:11609](../../packages/store/src/store.ts#L11609) `Store/sortIdsCurrentProgress` | `Store.sortIds` (11609); `Store.sortIdsProgress` (11609); `SQLite.all` (11622); `SQLite.prepare` (11622, 11701); `Store.sql` (11622, 11701); `Store.valueListItems` (11630); `rowsById` (11642); `Calculations.globalValue` (11645); `Calculations.unstoredValue` (11646); `Calculations.related` (11652); `SQLite.iterate` (11701) | GATED-STORE |
| [packages/store/src/store.ts:11789](../../packages/store/src/store.ts#L11789) `Store/storedFileId` | `SQLite.get` (11789); `SQLite.prepare` (11789) | CORE |
| [packages/store/src/store.ts:9792](../../packages/store/src/store.ts#L9792) `Store/summaries` | `Calculations.wholeTable` (9792); `Calculations.collect` (9812, 9817) | CORE |
| [packages/store/src/store.ts:9808](../../packages/store/src/store.ts#L9808) `Store/summaries/recs` | `SQLite.iterate` (9808); `SQLite.prepare` (9808); `Store.sql` (9808) | CORE |
| [packages/store/src/store.ts:6327](../../packages/store/src/store.ts#L6327) `Store/takeWebauthnChallenge` | `SQLite.get` (6327); `SQLite.prepare` (6327, 6331); `Store.sql` (6327, 6331) | CORE |
| [packages/store/src/store.ts:7584](../../packages/store/src/store.ts#L7584) `Store/themes` | `SQLite.get` (7584) | CORE |
| [packages/store/src/store.ts:9531](../../packages/store/src/store.ts#L9531) `Store/timeFind` | `Store.query` (9531) | CORE |
| [packages/store/src/store.ts:7919](../../packages/store/src/store.ts#L7919) `Store/toRecord` | `Calculations.value` (7919, 7929); `Calculations.globalValue` (7923); `Calculations.unstoredStyled` (7928) | CORE |
| [packages/store/src/store.ts:6211](../../packages/store/src/store.ts#L6211) `Store/totpAccounts` | `SQLite.all` (6211); `SQLite.prepare` (6211); `Store.sql` (6211) | CORE |
| [packages/store/src/store.ts:1838](../../packages/store/src/store.ts#L1838) `Store/trial` | `Store.sql` (1838) | CORE |
| [packages/store/src/store.ts:1843](../../packages/store/src/store.ts#L1843) `Store/trial/undo` | `Store.sql` (1843) | CORE |
| [packages/store/src/store.ts:11745](../../packages/store/src/store.ts#L11745) `Store/truncate/run` | `Store.sql` (11745, 11747, 11754, 11756, 11758, 11759); `SQLite.prepare` (11747, 11754); `SQLite.all` (11749) | CORE |
| [packages/store/src/store.ts:4043](../../packages/store/src/store.ts#L4043) `Store/unmigratedAccounts` | `SQLite.all` (4043); `SQLite.prepare` (4043); `Store.sql` (4043) | CORE |
| [packages/store/src/store.ts:5243](../../packages/store/src/store.ts#L5243) `Store/unusedAccess` | `SQLite.get` (5243); `SQLite.prepare` (5243, 5252); `Store.sql` (5243, 5252); `SQLite.all` (5252) | CORE |
| [packages/store/src/store.ts:5291](../../packages/store/src/store.ts#L5291) `Store/unusedObjects` | `SQLite.get` (5291); `SQLite.prepare` (5291, 5294); `Store.sql` (5291, 5294); `SQLite.all` (5294) | CORE |
| [packages/store/src/store.ts:6451](../../packages/store/src/store.ts#L6451) `Store/unusedRecoveryHashes` | `SQLite.all` (6451); `SQLite.prepare` (6451); `Store.sql` (6451) | CORE |
| [packages/store/src/store.ts:5073](../../packages/store/src/store.ts#L5073) `Store/unusualAccess` | `Store.auditLog` (5073, 5139) | CORE |
| [packages/store/src/store.ts:10231](../../packages/store/src/store.ts#L10231) `Store/update` | `Store.row` (10231); `Store.sql` (10262, 10263, 10309, 10312) | CORE |
| [packages/store/src/store.ts:10265](../../packages/store/src/store.ts#L10265) `Store/update/undo` | `Store.sql` (10265) | CORE |
| [packages/store/src/store.ts:10702](../../packages/store/src/store.ts#L10702) `Store/updatePortals` | `Store.row` (10702, 10755); `relatedRows` (10756) | CORE |
| [packages/store/src/store.ts:10712](../../packages/store/src/store.ts#L10712) `Store/updatePortals/portal/related` | `relatedIdList` (10712) | CORE |
| [packages/store/src/store.ts:10684](../../packages/store/src/store.ts#L10684) `Store/updateRelated` | `relatedRows` (10684) | CORE |
| [packages/store/src/store.ts:5329](../../packages/store/src/store.ts#L5329) `Store/usageCounting` | `SQLite.get` (5329); `SQLite.prepare` (5329); `Store.sql` (5329) | CORE |
| [packages/store/src/store.ts:9469](../../packages/store/src/store.ts#L9469) `Store/userPrefs` | `SQLite.all` (9469); `SQLite.prepare` (9469); `Store.sql` (9469) | CORE |
| [packages/store/src/store.ts:8341](../../packages/store/src/store.ts#L8341) `Store/valueListItemsCurrent` | `Store.valueListItems` (8341); `Store.get` (8355); `relatedRows` (8356); `Store.row` (8356); `SQLite.iterate` (8358); `SQLite.prepare` (8358); `Store.sql` (8358); `Calculations.related` (8368); `Calculations.value` (8372, 8373) | GATED-STORE |
| [packages/store/src/store.ts:10916](../../packages/store/src/store.ts#L10916) `Store/vaultHeld` | `SQLite.get` (10916); `SQLite.prepare` (10916); `Store.sql` (10916) | CORE |
| [packages/store/src/store.ts:6411](../../packages/store/src/store.ts#L6411) `Store/verifyPasskeyCredential` | `SQLite.get` (6411); `SQLite.prepare` (6411, 6423); `Store.sql` (6411, 6423) | CORE |
| [packages/store/src/store.ts:6240](../../packages/store/src/store.ts#L6240) `Store/verifyTotp` | `SQLite.get` (6240); `SQLite.prepare` (6240, 6247); `Store.sql` (6240, 6247) | CORE |
| [packages/store/src/store.ts:2553](../../packages/store/src/store.ts#L2553) `Store/versionNumber` | `SQLite.get` (2553); `SQLite.prepare` (2553); `Store.sql` (2553) | CORE |
| [packages/store/src/store.ts:2428](../../packages/store/src/store.ts#L2428) `Store/versionTriggers` | `SQLite.get` (2428); `SQLite.prepare` (2428, 2433, 2434); `Store.sql` (2428, 2433, 2434, 2451, 2453, 2454, 2456); `SQLite.all` (2433, 2434) | CORE |
| [packages/store/src/store.ts:2396](../../packages/store/src/store.ts#L2396) `Store/warmSummariesCurrent` | `Calculations.wholeTable` (2396) | CORE |
| [packages/store/src/store.ts:4669](../../packages/store/src/store.ts#L4669) `Store/webViewerChecked` | `SQLite.get` (4669); `SQLite.prepare` (4669); `Store.sql` (4669) | CORE |
| [packages/store/src/store.ts:2132](../../packages/store/src/store.ts#L2132) `Store/withWriteTransaction` | `Store.sql` (2132, 2145, 2152, 2157, 2157) | CORE |
| [packages/store/src/store.ts:7848](../../packages/store/src/store.ts#L7848) `Store/wordIndex` | `Store.sql` (7848, 7856, 7861); `Store.recordCount` (7860); `SQLite.get` (7861); `SQLite.prepare` (7861) | CORE |
| [packages/store/src/store.ts:9039](../../packages/store/src/store.ts#L9039) `Store/writeExternalFile` | `Store.evaluateEach` (9039); `SQLite.prepare` (9062); `Store.sql` (9062) | CORE |
| [packages/store/src/store.ts:9063](../../packages/store/src/store.ts#L9063) `Store/writeExternalFile/taken` | `SQLite.get` (9063) | CORE |
| [packages/store/src/store.ts:6070](../../packages/store/src/store.ts#L6070) `Store/writeObjectUseRows` | `SQLite.prepare` (6070, 6071, 6076); `Store.sql` (6070, 6071, 6076) | CORE |
| [packages/store/src/store.ts:2608](../../packages/store/src/store.ts#L2608) `Store/writeToken` | `SQLite.get` (2608); `SQLite.prepare` (2608); `Store.sql` (2608) | CORE |
| [packages/store/src/store.ts:6042](../../packages/store/src/store.ts#L6042) `Store/writeUsage` | `Store.sql` (6042, 6043, 6045, 6049, 6051) | CORE |
| [packages/store/src/store.ts:6058](../../packages/store/src/store.ts#L6058) `Store/writeUsageRows` | `SQLite.prepare` (6058, 6059, 6065); `Store.sql` (6058, 6059, 6065) | CORE |
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
