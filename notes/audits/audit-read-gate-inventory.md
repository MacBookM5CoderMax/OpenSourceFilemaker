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
| [packages/server/src/cwp-xml.ts:652](../../packages/server/src/cwp-xml.ts#L652) `CwpXmlEndpoint/layoutDoc` | `Store.valueListItems` (652) | XML |
| [packages/server/src/cwp-xml.ts:568](../../packages/server/src/cwp-xml.ts#L568) `CwpXmlEndpoint/records` | `Store.find` (568, 570, 571, 577, 580); `Store.get` (576, 584) | XML |
| [packages/server/src/cwp-xml.ts:537](../../packages/server/src/cwp-xml.ts#L537) `CwpXmlEndpoint/write` | `Store.get` (537, 541, 550); `Store.find` (549) | XML sign-in requires fmxml; every record/version read and count passes the signed-in Privileges, and the response layout is checked for access and the same table before any mutation. Writes and response reads share an atomic transaction. |
| [packages/server/src/dashboards.ts:390](../../packages/server/src/dashboards.ts#L390) `Dashboards/create` | `SQLite.prepare` (390); `Store.sql` (390) | DASHBOARD |
| [packages/server/src/dashboards.ts:410](../../packages/server/src/dashboards.ts#L410) `Dashboards/delete` | `SQLite.prepare` (410); `Store.sql` (410) | DASHBOARD |
| [packages/server/src/dashboards.ts:376](../../packages/server/src/dashboards.ts#L376) `Dashboards/get` | `SQLite.get` (376); `SQLite.prepare` (376); `Store.sql` (376) | DASHBOARD |
| [packages/server/src/dashboards.ts:370](../../packages/server/src/dashboards.ts#L370) `Dashboards/list` | `SQLite.all` (370); `SQLite.prepare` (370); `Store.sql` (370) | DASHBOARD |
| [packages/server/src/dashboards.ts:360](../../packages/server/src/dashboards.ts#L360) `Dashboards/table` | `Store.sql` (360) | DASHBOARD |
| [packages/server/src/dashboards.ts:403](../../packages/server/src/dashboards.ts#L403) `Dashboards/update` | `SQLite.prepare` (403); `Store.sql` (403) | DASHBOARD |
| [packages/server/src/dataapi.ts:2152](../../packages/server/src/dataapi.ts#L2152) `DataApi/route` | `Store.get` (2152, 2377, 2378, 2401, 2409, 2462, 2486, 2506, 2543); `Store.valueListItems` (2167); `Store.find` (2328, 2380, 2577); `Store.findIds` (2332, 2582); `Store.query` (2582) | REST |
| [packages/server/src/dataapi.ts:2280](../../packages/server/src/dataapi.ts#L2280) `DataApi/route/recordOut` | `Store.portalCounts` (2280) | REST |
| [packages/server/src/dataapi.ts:2316](../../packages/server/src/dataapi.ts#L2316) `DataApi/route/shownAs` | `Store.get` (2316) | REST |
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
| [packages/store/src/store.ts:5651](../../packages/store/src/store.ts#L5651) `Store/accountIdentityId` | `SQLite.get` (5651, 5657); `SQLite.prepare` (5651, 5656, 5657); `Store.sql` (5651, 5656, 5657) | CORE |
| [packages/store/src/store.ts:5645](../../packages/store/src/store.ts#L5645) `Store/accountIdentityIdIfSet` | `SQLite.get` (5645); `SQLite.prepare` (5645); `Store.sql` (5645) | CORE |
| [packages/store/src/store.ts:5607](../../packages/store/src/store.ts#L5607) `Store/accountInactive` | `SQLite.get` (5607); `SQLite.prepare` (5607); `Store.sql` (5607) | CORE |
| [packages/store/src/store.ts:5804](../../packages/store/src/store.ts#L5804) `Store/accountLocalOnly` | `SQLite.get` (5804); `SQLite.prepare` (5804); `Store.sql` (5804) | CORE |
| [packages/store/src/store.ts:6673](../../packages/store/src/store.ts#L6673) `Store/accountPrivilegeSet` | `SQLite.get` (6673); `SQLite.prepare` (6673); `Store.sql` (6673) | CORE |
| [packages/store/src/store.ts:5809](../../packages/store/src/store.ts#L5809) `Store/accountRequires2fa` | `SQLite.get` (5809); `SQLite.prepare` (5809); `Store.sql` (5809) | CORE |
| [packages/store/src/store.ts:3967](../../packages/store/src/store.ts#L3967) `Store/accounts` | `SQLite.all` (3967); `SQLite.prepare` (3967); `Store.sql` (3967) | CORE |
| [packages/store/src/store.ts:3963](../../packages/store/src/store.ts#L3963) `Store/accountsSharingLockout` | `SQLite.all` (3963); `SQLite.prepare` (3963); `Store.sql` (3963) | CORE |
| [packages/store/src/store.ts:6029](../../packages/store/src/store.ts#L6029) `Store/accountUsage` | `SQLite.get` (6029); `SQLite.prepare` (6029, 6030); `Store.sql` (6029, 6030); `SQLite.all` (6030); `Store.auditLog` (6046) | CORE |
| [packages/store/src/store.ts:8910](../../packages/store/src/store.ts#L8910) `Store/addContainer` | `SQLite.all` (8910); `SQLite.prepare` (8910, 8915, 8929, 8933, 8934); `Store.sql` (8910, 8915, 8929, 8931, 8933, 8934, 8936, 8939); `SQLite.get` (8920); `Store.containerRange` (8922) | CORE |
| [packages/store/src/store.ts:8956](../../packages/store/src/store.ts#L8956) `Store/addExternalContainer` | `SQLite.prepare` (8956); `Store.sql` (8956) | CORE |
| [packages/store/src/store.ts:9443](../../packages/store/src/store.ts#L9443) `Store/addFieldIndex` | `Store.sql` (9443) | CORE |
| [packages/store/src/store.ts:7555](../../packages/store/src/store.ts#L7555) `Store/addImage` | `Store.sql` (7555, 7556); `SQLite.prepare` (7556) | CORE |
| [packages/store/src/store.ts:6723](../../packages/store/src/store.ts#L6723) `Store/addProvisionedAccount` | `SQLite.get` (6723); `SQLite.prepare` (6723, 6727); `Store.sql` (6723, 6727) | CORE |
| [packages/store/src/store.ts:8015](../../packages/store/src/store.ts#L8015) `Store/addRelated` | `relatedRows` (8015); `rowsById` (8050); `firstRelatedEach` (8076) | CORE |
| [packages/store/src/store.ts:8003](../../packages/store/src/store.ts#L8003) `Store/addRelated/summaries` | `Calculations.summary` (8003) | CORE |
| [packages/store/src/store.ts:3985](../../packages/store/src/store.ts#L3985) `Store/agentNeedsApproval` | `SQLite.get` (3985); `SQLite.prepare` (3985); `Store.sql` (3985) | CORE |
| [packages/store/src/store.ts:6950](../../packages/store/src/store.ts#L6950) `Store/allowedIds` | `SQLite.iterate` (6950); `SQLite.prepare` (6950); `Store.sql` (6950) | CORE |
| [packages/store/src/store.ts:6086](../../packages/store/src/store.ts#L6086) `Store/apiToken` | `SQLite.get` (6086); `SQLite.prepare` (6086, 6104); `Store.sql` (6086, 6104) | CORE |
| [packages/store/src/store.ts:6062](../../packages/store/src/store.ts#L6062) `Store/apiTokens` | `SQLite.all` (6062); `SQLite.prepare` (6062); `Store.sql` (6062) | CORE |
| [packages/store/src/store.ts:4385](../../packages/store/src/store.ts#L4385) `Store/appendSecurityEvent` | `Store.sql` (4385) | CORE |
| [packages/store/src/store.ts:3425](../../packages/store/src/store.ts#L3425) `Store/appendSecurityRow` | `Store.sql` (3425) | CORE |
| [packages/store/src/store.ts:5427](../../packages/store/src/store.ts#L5427) `Store/applyAccountImport` | `Store.sql` (5427, 5435, 5464); `SQLite.get` (5435); `SQLite.prepare` (5435, 5464) | CORE |
| [packages/store/src/store.ts:2692](../../packages/store/src/store.ts#L2692) `Store/applyDesign` | `Store.sql` (2692, 2693, 2713, 2716, 2721, 2737, 2740, 2740); `SQLite.prepare` (2716, 2721) | CORE |
| [packages/store/src/store.ts:4229](../../packages/store/src/store.ts#L4229) `Store/approvePending` | `SQLite.get` (4229); `SQLite.prepare` (4229, 4241); `Store.sql` (4229, 4241) | CORE |
| [packages/store/src/store.ts:3216](../../packages/store/src/store.ts#L3216) `Store/audit/write` | `Store.sql` (3216) | CORE |
| [packages/store/src/store.ts:2804](../../packages/store/src/store.ts#L2804) `Store/auditLog` | `SQLite.all` (2804); `SQLite.prepare` (2804); `Store.sql` (2804) | CORE |
| [packages/store/src/store.ts:2225](../../packages/store/src/store.ts#L2225) `Store/backup` | `Store.sql` (2225) | CORE |
| [packages/store/src/store.ts:3991](../../packages/store/src/store.ts#L3991) `Store/blankPasswordAccounts` | `SQLite.all` (3991); `SQLite.prepare` (3991); `Store.sql` (3991) | CORE |
| [packages/store/src/store.ts:5356](../../packages/store/src/store.ts#L5356) `Store/canonicalAccount` | `SQLite.all` (5356); `SQLite.prepare` (5356); `Store.sql` (5356) | CORE |
| [packages/store/src/store.ts:10030](../../packages/store/src/store.ts#L10030) `Store/canView` | `Store.canView` (10030); `Store.row` (10031) | GATED-STORE |
| [packages/store/src/store.ts:10012](../../packages/store/src/store.ts#L10012) `Store/canViewRecord` | `SQLite.get` (10012); `SQLite.prepare` (10012); `Store.sql` (10012) | GATED-STORE |
| [packages/store/src/store.ts:11135](../../packages/store/src/store.ts#L11135) `Store/cascadeDelete` | `relatedRows` (11135) | CORE |
| [packages/store/src/store.ts:2525](../../packages/store/src/store.ts#L2525) `Store/changeOne` | `Store.sql` (2525, 2527) | CORE |
| [packages/store/src/store.ts:2528](../../packages/store/src/store.ts#L2528) `Store/changeOne/read` | `SQLite.get` (2528); `SQLite.prepare` (2528); `Store.sql` (2528) | CORE |
| [packages/store/src/store.ts:9300](../../packages/store/src/store.ts#L9300) `Store/checkContainerWrite` | `Store.row` (9300) | CORE |
| [packages/store/src/store.ts:10748](../../packages/store/src/store.ts#L10748) `Store/checkEditable` | `Store.row` (10748) | CORE |
| [packages/store/src/store.ts:1747](../../packages/store/src/store.ts#L1747) `Store/checkpoint` | `SQLite.get` (1747); `SQLite.prepare` (1747); `Store.sql` (1747) | CORE |
| [packages/store/src/store.ts:4128](../../packages/store/src/store.ts#L4128) `Store/checkProposedWrite` | `Store.row` (4128); `relatedRows` (4142) | CORE |
| [packages/store/src/store.ts:6709](../../packages/store/src/store.ts#L6709) `Store/clearAccountPrivilegeSet` | `SQLite.prepare` (6709); `Store.sql` (6709) | CORE |
| [packages/store/src/store.ts:1769](../../packages/store/src/store.ts#L1769) `Store/close` | `Store.sql` (1769) | CORE |
| [packages/store/src/store.ts:9259](../../packages/store/src/store.ts#L9259) `Store/compactFile` | `Store.sql` (9259, 9260, 9262) | CORE |
| [packages/store/src/store.ts:9680](../../packages/store/src/store.ts#L9680) `Store/computedRows` | `Store.sql` (9680, 9683, 9684, 9685, 9687, 9697, 9698, 9699, 9702); `SQLite.prepare` (9683, 9685, 9687, 9697); `SQLite.iterate` (9687); `Calculations.globalValue` (9690); `Calculations.unstoredValue` (9691); `Calculations.related` (9694); `SQLite.all` (9697) | CORE |
| [packages/store/src/store.ts:11262](../../packages/store/src/store.ts#L11262) `Store/computeValuesCurrent` | `Store.computeValues` (11262); `Store.sql` (11268, 11272); `SQLite.all` (11272); `SQLite.prepare` (11272) | GATED-STORE |
| [packages/store/src/store.ts:6131](../../packages/store/src/store.ts#L6131) `Store/confirmTotp` | `SQLite.get` (6131); `SQLite.prepare` (6131, 6133); `Store.sql` (6131, 6133) | CORE |
| [packages/store/src/store.ts:1377](../../packages/store/src/store.ts#L1377) `Store/constructor` | `Store.sql` (1377, 1379, 1381, 1382, 1386, 1390, 1391, 1400, 1408, 1424, 1429, 1434, 1435, 1439, 1440, 1441, 1448, 1452, 1456, 1457, 1458, 1460, 1470, 1471, 1475, 1478, 1479, 1481, 1482, 1485, 1486, 1490, 1491, 1495, 1496, 1499, 1502, 1503, 1505, 1508, 1509, 1513, 1514, 1518, 1519, 1523, 1524, 1525, 1528, 1529, 1532, 1533, 1535, 1535, 1536, 1536, 1537, 1541, 1543, 1547, 1549, 1552, 1553, 1554, 1557, 1558, 1560, 1562, 1563, 1567, 1568, 1570, 1582, 1584, 1585, 1586, 1586, 1590, 1591); `SQLite.get` (1381, 1400); `SQLite.prepare` (1381, 1400, 1408, 1460, 1478, 1479, 1482, 1485, 1490, 1495, 1502, 1508, 1513, 1518, 1528, 1532, 1535, 1536, 1557, 1562, 1567); `SQLite.all` (1478, 1485, 1490, 1495, 1502, 1508, 1513, 1518, 1528, 1532, 1535, 1536, 1557, 1562, 1567) | CORE |
| [packages/store/src/store.ts:6489](../../packages/store/src/store.ts#L6489) `Store/consumeRecoveryCode` | `SQLite.prepare` (6489); `Store.sql` (6489) | CORE |
| [packages/store/src/store.ts:8834](../../packages/store/src/store.ts#L8834) `Store/container` | `SQLite.get` (8834); `SQLite.prepare` (8834, 8843); `Store.sql` (8834, 8843); `SQLite.all` (8843) | CORE |
| [packages/store/src/store.ts:9268](../../packages/store/src/store.ts#L9268) `Store/containerId` | `Store.containerId` (9268); `Store.row` (9269) | CORE |
| [packages/store/src/store.ts:8851](../../packages/store/src/store.ts#L8851) `Store/containerInfo` | `SQLite.get` (8851); `SQLite.prepare` (8851); `Store.sql` (8851) | CORE |
| [packages/store/src/store.ts:8815](../../packages/store/src/store.ts#L8815) `Store/containerIntact` | `SQLite.get` (8815); `SQLite.prepare` (8815); `Store.sql` (8815) | CORE |
| [packages/store/src/store.ts:8754](../../packages/store/src/store.ts#L8754) `Store/containerIntegrityReport` | `SQLite.all` (8754); `SQLite.prepare` (8754, 8765); `Store.sql` (8754, 8765); `SQLite.get` (8765) | CORE |
| [packages/store/src/store.ts:8829](../../packages/store/src/store.ts#L8829) `Store/containerMeta` | `SQLite.get` (8829); `SQLite.prepare` (8829); `Store.sql` (8829) | CORE |
| [packages/store/src/store.ts:8885](../../packages/store/src/store.ts#L8885) `Store/containerRange` | `SQLite.all` (8885); `SQLite.prepare` (8885, 8892); `Store.sql` (8885, 8892); `SQLite.get` (8892) | CORE |
| [packages/store/src/store.ts:8656](../../packages/store/src/store.ts#L8656) `Store/containerReferences` | `SQLite.all` (8656, 8675, 8677, 8683, 8696, 8707, 8721); `SQLite.prepare` (8656, 8675, 8677, 8683, 8696, 8707, 8719, 8721); `Store.sql` (8656, 8675, 8677, 8683, 8696, 8707, 8719, 8721); `SQLite.get` (8719); `Store.row` (8730) | CORE |
| [packages/store/src/store.ts:11241](../../packages/store/src/store.ts#L11241) `Store/countIds` | `Store.countIds` (11241); `SQLite.get` (11246); `SQLite.prepare` (11246); `Store.sql` (11246) | GATED-STORE |
| [packages/store/src/store.ts:10061](../../packages/store/src/store.ts#L10061) `Store/create` | `SQLite.get` (10061); `SQLite.prepare` (10061, 10074); `Store.sql` (10061, 10074) | CORE |
| [packages/store/src/store.ts:4357](../../packages/store/src/store.ts#L4357) `Store/createAccountOnly` | `SQLite.get` (4357); `SQLite.prepare` (4357, 4361, 4367, 4372, 4377); `Store.sql` (4357, 4361, 4367, 4372, 4377) | CORE |
| [packages/store/src/store.ts:5862](../../packages/store/src/store.ts#L5862) `Store/createApiToken` | `SQLite.get` (5862, 5890); `SQLite.prepare` (5862, 5889, 5890, 5900); `Store.sql` (5862, 5889, 5890, 5900) | CORE |
| [packages/store/src/store.ts:5368](../../packages/store/src/store.ts#L5368) `Store/createLocalAccount` | `SQLite.prepare` (5368); `Store.sql` (5368) | CORE |
| [packages/store/src/store.ts:3957](../../packages/store/src/store.ts#L3957) `Store/credentialIdentity` | `SQLite.get` (3957); `SQLite.prepare` (3957); `Store.sql` (3957) | CORE |
| [packages/store/src/store.ts:5783](../../packages/store/src/store.ts#L5783) `Store/credentialStamp` | `SQLite.get` (5783); `SQLite.prepare` (5783); `Store.sql` (5783) | CORE |
| [packages/store/src/store.ts:7388](../../packages/store/src/store.ts#L7388) `Store/crossFileBusy` | `Store.sql` (7388) | AUTH |
| [packages/store/src/store.ts:7360](../../packages/store/src/store.ts#L7360) `Store/crossFileHash` | `SQLite.get` (7360); `SQLite.prepare` (7360); `Store.sql` (7360) | AUTH |
| [packages/store/src/store.ts:2315](../../packages/store/src/store.ts#L2315) `Store/dataVersion` | `SQLite.get` (2315); `SQLite.prepare` (2315); `Store.sql` (2315) | CORE |
| [packages/store/src/store.ts:11809](../../packages/store/src/store.ts#L11809) `Store/decimalViewSql` | `SQLite.all` (11809); `SQLite.prepare` (11809) | CORE |
| [packages/store/src/store.ts:10791](../../packages/store/src/store.ts#L10791) `Store/delete` | `Store.row` (10791) | CORE |
| [packages/store/src/store.ts:10799](../../packages/store/src/store.ts#L10799) `Store/delete/run` | `SQLite.get` (10799); `SQLite.prepare` (10799, 10804); `Store.sql` (10799, 10804) | CORE |
| [packages/store/src/store.ts:5522](../../packages/store/src/store.ts#L5522) `Store/deleteAccount` | `SQLite.prepare` (5522, 5526, 5527, 5528, 5529, 5530, 5531, 5532, 5533, 5540, 5542, 5544, 5546, 5550); `Store.sql` (5522, 5526, 5527, 5528, 5529, 5530, 5531, 5532, 5533, 5540, 5542, 5544, 5546, 5550) | CORE |
| [packages/store/src/store.ts:10875](../../packages/store/src/store.ts#L10875) `Store/deleteBeingUndone` | `SQLite.all` (10875); `SQLite.prepare` (10875); `Store.sql` (10875) | CORE |
| [packages/store/src/store.ts:3593](../../packages/store/src/store.ts#L3593) `Store/deletedRows` | `SQLite.get` (3593); `SQLite.prepare` (3593, 3595, 3595); `Store.sql` (3593, 3595, 3595); `SQLite.all` (3595, 3595) | CORE |
| [packages/store/src/store.ts:10887](../../packages/store/src/store.ts#L10887) `Store/deleteEndingTheLifeAt` | `SQLite.get` (10887); `SQLite.prepare` (10887); `Store.sql` (10887) | CORE |
| [packages/store/src/store.ts:6574](../../packages/store/src/store.ts#L6574) `Store/deletePrivilegeSet` | `SQLite.prepare` (6574); `Store.sql` (6574) | CORE |
| [packages/store/src/store.ts:4495](../../packages/store/src/store.ts#L4495) `Store/deleteScriptTest` | `SQLite.prepare` (4495); `Store.sql` (4495) | CORE |
| [packages/store/src/store.ts:10776](../../packages/store/src/store.ts#L10776) `Store/deleteVisibility` | `Store.canViewRecord` (10776) | CORE |
| [packages/store/src/store.ts:7497](../../packages/store/src/store.ts#L7497) `Store/design` | `SQLite.get` (7497) | CORE |
| [packages/store/src/store.ts:3703](../../packages/store/src/store.ts#L3703) `Store/designEffect` | `Store.sql` (3703, 3704, 3710, 3711, 3714, 3720, 3725, 3728, 3734, 3745, 3746, 3748, 3749, 3762, 3763, 3766, 3768, 3774, 3775, 3776, 3782, 3784, 3788, 3791, 3792, 3794, 3797, 3803, 3805, 3812, 3813, 3815, 3816, 3817, 3818, 3825, 3826, 3828, 3828, 3830, 3831, 3832, 3836, 3840, 3842, 3880, 3882, 3884); `SQLite.prepare` (3714, 3745, 3746, 3762, 3763, 3774, 3775, 3782, 3784, 3788, 3792, 3803, 3805, 3818, 3825, 3826, 3828, 3830, 3832, 3836, 3840); `SQLite.get` (3745, 3762, 3774, 3775, 3788, 3792, 3828, 3836); `SQLite.all` (3825, 3826); `SQLite.iterate` (3830) | CORE |
| [packages/store/src/store.ts:3696](../../packages/store/src/store.ts#L3696) `Store/designEffect/renameExcluded` | `SQLite.prepare` (3696); `Store.sql` (3696) | CORE |
| [packages/store/src/store.ts:3680](../../packages/store/src/store.ts#L3680) `Store/designEffect/renameKey` | `SQLite.prepare` (3680); `Store.sql` (3680) | CORE |
| [packages/store/src/store.ts:3634](../../packages/store/src/store.ts#L3634) `Store/designHistory` | `SQLite.all` (3634); `SQLite.prepare` (3634); `Store.sql` (3634) | CORE |
| [packages/store/src/store.ts:6152](../../packages/store/src/store.ts#L6152) `Store/disableTotp` | `SQLite.prepare` (6152); `Store.sql` (6152) | CORE |
| [packages/store/src/store.ts:3892](../../packages/store/src/store.ts#L3892) `Store/dropColumnIndexes` | `SQLite.all` (3892, 3894); `SQLite.prepare` (3892, 3894); `Store.sql` (3892, 3894, 3895) | CORE |
| [packages/store/src/store.ts:9455](../../packages/store/src/store.ts#L9455) `Store/dropFieldIndex` | `SQLite.get` (9455); `SQLite.prepare` (9455); `Store.sql` (9455, 9456) | CORE |
| [packages/store/src/store.ts:10100](../../packages/store/src/store.ts#L10100) `Store/duplicate` | `Store.row` (10100); `SQLite.prepare` (10118); `Store.sql` (10118) | CORE |
| [packages/store/src/store.ts:9072](../../packages/store/src/store.ts#L9072) `Store/embeddedContainerCount` | `SQLite.prepare` (9072); `Store.sql` (9072); `SQLite.get` (9073) | CORE |
| [packages/store/src/store.ts:9058](../../packages/store/src/store.ts#L9058) `Store/embeddedContainers` | `SQLite.prepare` (9058, 9059); `Store.sql` (9058, 9059); `SQLite.all` (9059); `SQLite.get` (9063) | CORE |
| [packages/store/src/store.ts:3619](../../packages/store/src/store.ts#L3619) `Store/emptyDeleted` | `Store.sql` (3619, 3622, 3623, 3625, 3627); `SQLite.prepare` (3623) | CORE |
| [packages/store/src/store.ts:2191](../../packages/store/src/store.ts#L2191) `Store/endTransaction` | `Store.sql` (2191, 2194, 2194) | CORE |
| [packages/store/src/store.ts:6120](../../packages/store/src/store.ts#L6120) `Store/enrollTotp` | `SQLite.prepare` (6120); `Store.sql` (6120) | CORE |
| [packages/store/src/store.ts:3588](../../packages/store/src/store.ts#L3588) `Store/ensureDeleted` | `Store.sql` (3588) | CORE |
| [packages/store/src/store.ts:1601](../../packages/store/src/store.ts#L1601) `Store/ensureNativeIds` | `SQLite.all` (1601, 1613); `SQLite.prepare` (1601, 1604, 1612, 1613); `Store.sql` (1601, 1604, 1607, 1611, 1612, 1613, 1616, 1618) | CORE |
| [packages/store/src/store.ts:2437](../../packages/store/src/store.ts#L2437) `Store/ensureRecordIdHighWater` | `Store.sql` (2437, 2438, 2440, 2442, 2444) | CORE |
| [packages/store/src/store.ts:2456](../../packages/store/src/store.ts#L2456) `Store/ensureRecordIdMarks` | `SQLite.all` (2456, 2459, 2462, 2471); `SQLite.prepare` (2456, 2459, 2462, 2465, 2471, 2474); `Store.sql` (2456, 2459, 2462, 2465, 2471, 2474, 2478, 2479) | CORE |
| [packages/store/src/store.ts:10441](../../packages/store/src/store.ts#L10441) `Store/evaluateCurrent` | `Store.row` (10441, 10441, 10442, 10442); `Calculations.context` (10447); `Store.get` (10448, 10450) | GATED-STORE |
| [packages/store/src/store.ts:10482](../../packages/store/src/store.ts#L10482) `Store/evaluateEachCurrent` | `Store.row` (10482, 10482, 10487); `Calculations.context` (10488); `Store.get` (10490) | GATED-STORE |
| [packages/store/src/store.ts:10544](../../packages/store/src/store.ts#L10544) `Store/evaluateRowsCurrent` | `Store.row` (10544, 10544, 10545, 10545) | GATED-STORE |
| [packages/store/src/store.ts:10523](../../packages/store/src/store.ts#L10523) `Store/evaluateRowsCurrent/each` | `Calculations.context` (10523); `Store.get` (10525) | GATED-STORE |
| [packages/store/src/store.ts:10559](../../packages/store/src/store.ts#L10559) `Store/evaluateRowsCurrent/found/[Symbol.iterator]` | `rowsById` (10559) | GATED-STORE |
| [packages/store/src/store.ts:10581](../../packages/store/src/store.ts#L10581) `Store/evaluateRowsCurrent/key` | `Calculations.context` (10581) | GATED-STORE |
| [packages/store/src/store.ts:4273](../../packages/store/src/store.ts#L4273) `Store/externalAccount` | `SQLite.all` (4273); `SQLite.prepare` (4273); `Store.sql` (4273) | CORE |
| [packages/store/src/store.ts:8577](../../packages/store/src/store.ts#L8577) `Store/externalContainerCheck` | `SQLite.all` (8577); `SQLite.prepare` (8577); `Store.sql` (8577) | CORE |
| [packages/store/src/store.ts:8584](../../packages/store/src/store.ts#L8584) `Store/externalContainerCount` | `SQLite.get` (8584); `SQLite.prepare` (8584); `Store.sql` (8584) | CORE |
| [packages/store/src/store.ts:8593](../../packages/store/src/store.ts#L8593) `Store/externalContainerReport` | `SQLite.all` (8593, 8606); `SQLite.prepare` (8593, 8606); `Store.sql` (8593, 8606) | CORE |
| [packages/store/src/store.ts:5633](../../packages/store/src/store.ts#L5633) `Store/externalIdentityId` | `SQLite.get` (5633, 5640); `SQLite.prepare` (5633, 5639, 5640); `Store.sql` (5633, 5639, 5640) | CORE |
| [packages/store/src/store.ts:8825](../../packages/store/src/store.ts#L8825) `Store/externalOf` | `SQLite.get` (8825); `SQLite.prepare` (8825); `Store.sql` (8825) | CORE |
| [packages/store/src/store.ts:3369](../../packages/store/src/store.ts#L3369) `Store/failureAuditRoom` | `SQLite.get` (3369); `SQLite.prepare` (3369); `Store.sql` (3369) | CORE |
| [packages/store/src/store.ts:8224](../../packages/store/src/store.ts#L8224) `Store/fieldIndexCurrent` | `SQLite.iterate` (8224); `SQLite.prepare` (8224, 8229); `Store.sql` (8224, 8229); `SQLite.all` (8229) | GATED-STORE |
| [packages/store/src/store.ts:9495](../../packages/store/src/store.ts#L9495) `Store/find` | `Store.find` (9495) | GATED-STORE |
| [packages/store/src/store.ts:9867](../../packages/store/src/store.ts#L9867) `Store/findCandidates` | `Store.query` (9867) | CORE |
| [packages/store/src/store.ts:9506](../../packages/store/src/store.ts#L9506) `Store/findHere` | `Store.query` (9506, 9511, 9513, 9527, 9529, 9540); `Store.recordCount` (9524); `SQLite.get` (9525, 9529); `SQLite.prepare` (9525, 9529, 9535, 9542, 9551); `Store.sql` (9525, 9529, 9535, 9542, 9551); `SQLite.all` (9535, 9542, 9551) | GATED-STORE |
| [packages/store/src/store.ts:9546](../../packages/store/src/store.ts#L9546) `Store/findHere/[Symbol.iterator]` | `SQLite.iterate` (9546); `SQLite.prepare` (9546); `Store.sql` (9546) | GATED-STORE |
| [packages/store/src/store.ts:11374](../../packages/store/src/store.ts#L11374) `Store/findIdsCurrent` | `Store.findIds` (11374) | GATED-STORE |
| [packages/store/src/store.ts:11309](../../packages/store/src/store.ts#L11309) `Store/findIdsCurrentProgress` | `Store.findIdsProgress` (11309); `Store.query` (11311, 11313, 11326, 11328); `Store.recordCount` (11318, 11346); `SQLite.iterate` (11343); `SQLite.prepare` (11343, 11351, 11352); `Store.sql` (11343, 11351, 11352); `SQLite.get` (11355); `SQLite.all` (11361) | GATED-STORE |
| [packages/store/src/store.ts:11380](../../packages/store/src/store.ts#L11380) `Store/findIdsHere` | `Store.query` (11380, 11386, 11388); `SQLite.iterate` (11399); `SQLite.prepare` (11399); `Store.sql` (11399) | GATED-STORE |
| [packages/store/src/store.ts:9811](../../packages/store/src/store.ts#L9811) `Store/findSource` | `Store.query` (9811); `SQLite.all` (9820, 9837); `SQLite.prepare` (9820, 9828, 9836); `Store.sql` (9820, 9825, 9828, 9833, 9836, 9850, 9852); `Calculations.globalValue` (9842); `Calculations.unstoredValue` (9843); `Calculations.related` (9847) | CORE |
| [packages/store/src/store.ts:3481](../../packages/store/src/store.ts#L3481) `Store/flushDeferredSecurity` | `Store.sql` (3481) | CORE |
| [packages/store/src/store.ts:5489](../../packages/store/src/store.ts#L5489) `Store/forgetStandIns` | `SQLite.prepare` (5489); `Store.sql` (5489) | CORE |
| [packages/store/src/store.ts:10842](../../packages/store/src/store.ts#L10842) `Store/forgetStandInValues` | `Store.sql` (10842, 10863); `SQLite.prepare` (10863) | CORE |
| [packages/store/src/store.ts:8105](../../packages/store/src/store.ts#L8105) `Store/foundSetPage` | `rowsById` (8105) | CORE |
| [packages/store/src/store.ts:8121](../../packages/store/src/store.ts#L8121) `Store/foundSetRowsCurrent` | `Store.viewableIds` (8121); `Store.row` (8137) | GATED-STORE |
| [packages/store/src/store.ts:4191](../../packages/store/src/store.ts#L4191) `Store/gateAgentWrite` | `SQLite.get` (4191); `SQLite.prepare` (4191, 4193); `Store.sql` (4191, 4193) | CORE |
| [packages/store/src/store.ts:6427](../../packages/store/src/store.ts#L6427) `Store/generateRecoveryCodes` | `SQLite.prepare` (6427, 6430); `Store.sql` (6427, 6430) | CORE |
| [packages/store/src/store.ts:9940](../../packages/store/src/store.ts#L9940) `Store/getCurrent` | `Store.get` (9940); `Store.row` (9941, 9941, 9955); `SQLite.all` (9958); `SQLite.prepare` (9958); `Store.sql` (9958) | GATED-STORE |
| [packages/store/src/store.ts:9978](../../packages/store/src/store.ts#L9978) `Store/getManyCurrent` | `Store.getMany` (9978); `SQLite.get` (9996); `SQLite.prepare` (9996); `Store.sql` (9996) | GATED-STORE |
| [packages/store/src/store.ts:9989](../../packages/store/src/store.ts#L9989) `Store/getManyCurrent/[Symbol.iterator]` | `rowsById` (9989) | GATED-STORE |
| [packages/store/src/store.ts:1648](../../packages/store/src/store.ts#L1648) `Store/grantFullAccessClients` | `SQLite.prepare` (1648); `Store.sql` (1648) | CORE |
| [packages/store/src/store.ts:11416](../../packages/store/src/store.ts#L11416) `Store/groupSummariesCurrent` | `Store.groupSummaries` (11416); `Store.viewableIds` (11421); `Calculations.collect` (11437); `rowsById` (11437, 11487); `Calculations.collector` (11459) | GATED-STORE |
| [packages/store/src/store.ts:11485](../../packages/store/src/store.ts#L11485) `Store/groupSummariesCurrent/flush` | `Calculations.collector` (11485) | GATED-STORE |
| [packages/store/src/store.ts:11449](../../packages/store/src/store.ts#L11449) `Store/groupSummariesCurrent/key` | `Calculations.value` (11449); `Calculations.related` (11451) | GATED-STORE |
| [packages/store/src/store.ts:1675](../../packages/store/src/store.ts#L1675) `Store/hasOwnPassword` | `SQLite.get` (1675); `SQLite.prepare` (1675); `Store.sql` (1675) | CORE |
| [packages/store/src/store.ts:6282](../../packages/store/src/store.ts#L6282) `Store/hasPasskey` | `SQLite.get` (6282); `SQLite.prepare` (6282); `Store.sql` (6282) | CORE |
| [packages/store/src/store.ts:1656](../../packages/store/src/store.ts#L1656) `Store/hasProvingPassword` | `SQLite.get` (1656); `SQLite.prepare` (1656); `Store.sql` (1656) | CORE |
| [packages/store/src/store.ts:9409](../../packages/store/src/store.ts#L9409) `Store/hasTable` | `SQLite.get` (9409); `SQLite.prepare` (9409); `Store.sql` (9409) | CORE |
| [packages/store/src/store.ts:6141](../../packages/store/src/store.ts#L6141) `Store/hasTotp` | `SQLite.get` (6141); `SQLite.prepare` (6141); `Store.sql` (6141) | CORE |
| [packages/store/src/store.ts:5612](../../packages/store/src/store.ts#L5612) `Store/identityAllowed` | `SQLite.get` (5612, 5618, 5624); `SQLite.prepare` (5612, 5618, 5624); `Store.sql` (5612, 5618, 5624) | CORE |
| [packages/store/src/store.ts:7532](../../packages/store/src/store.ts#L7532) `Store/image` | `SQLite.get` (7532); `SQLite.prepare` (7532); `Store.sql` (7532) | CORE |
| [packages/store/src/store.ts:7542](../../packages/store/src/store.ts#L7542) `Store/images` | `SQLite.all` (7542); `SQLite.prepare` (7542); `Store.sql` (7542) | CORE |
| [packages/store/src/store.ts:5333](../../packages/store/src/store.ts#L5333) `Store/importAccounts` | `SQLite.all` (5333); `SQLite.prepare` (5333); `Store.sql` (5333) | CORE |
| [packages/store/src/store.ts:1990](../../packages/store/src/store.ts#L1990) `Store/independentWindowWrite` | `SQLite.get` (1990); `SQLite.prepare` (1990, 1998, 2059); `Store.sql` (1990, 1998, 2008, 2037, 2054, 2059, 2062); `SQLite.all` (1998); `Store.row` (2057) | CORE |
| [packages/store/src/store.ts:9421](../../packages/store/src/store.ts#L9421) `Store/indexedFields` | `SQLite.all` (9421, 9422); `SQLite.prepare` (9421, 9422); `Store.sql` (9421, 9422) | CORE |
| [packages/store/src/store.ts:11842](../../packages/store/src/store.ts#L11842) `Store/internalRoots` | `SQLite.get` (11842); `SQLite.prepare` (11842, 11844); `SQLite.all` (11844) | CORE |
| [packages/store/src/store.ts:3979](../../packages/store/src/store.ts#L3979) `Store/isAgent` | `SQLite.get` (3979); `SQLite.prepare` (3979); `Store.sql` (3979) | CORE |
| [packages/store/src/store.ts:4082](../../packages/store/src/store.ts#L4082) `Store/isExternal` | `SQLite.get` (4082); `SQLite.prepare` (4082); `Store.sql` (4082) | CORE |
| [packages/store/src/store.ts:6196](../../packages/store/src/store.ts#L6196) `Store/issueWebauthnChallenge` | `SQLite.prepare` (6196, 6198, 6199, 6201); `Store.sql` (6196, 6198, 6199, 6201); `SQLite.get` (6198) | CORE |
| [packages/store/src/store.ts:11703](../../packages/store/src/store.ts#L11703) `Store/iterateCommitted` | `SQLite.iterate` (11703) | CORE |
| [packages/store/src/store.ts:1929](../../packages/store/src/store.ts#L1929) `Store/joinTransaction` | `Store.sql` (1929, 1930, 1932, 1934, 1940, 1943) | CORE |
| [packages/store/src/store.ts:11082](../../packages/store/src/store.ts#L11082) `Store/keyStepWork` | `Store.sql` (11082, 11088, 11092, 11094) | CORE |
| [packages/store/src/store.ts:7348](../../packages/store/src/store.ts#L7348) `Store/knownSharedAccount` | `SQLite.get` (7348); `SQLite.prepare` (7348); `Store.sql` (7348) | CORE |
| [packages/store/src/store.ts:4806](../../packages/store/src/store.ts#L4806) `Store/lastSignIns` | `Store.auditLog` (4806) | CORE |
| [packages/store/src/store.ts:10893](../../packages/store/src/store.ts#L10893) `Store/latestDeleteSeq` | `SQLite.get` (10893); `SQLite.prepare` (10893); `Store.sql` (10893) | CORE |
| [packages/store/src/store.ts:7575](../../packages/store/src/store.ts#L7575) `Store/layout` | `SQLite.get` (7575); `SQLite.prepare` (7575); `Store.sql` (7575) | CORE |
| [packages/store/src/store.ts:3651](../../packages/store/src/store.ts#L3651) `Store/layoutHistory` | `SQLite.all` (3651); `SQLite.prepare` (3651); `Store.sql` (3651) | CORE |
| [packages/store/src/store.ts:7462](../../packages/store/src/store.ts#L7462) `Store/layouts` | `SQLite.all` (7462); `SQLite.prepare` (7462); `Store.sql` (7462) | CORE |
| [packages/store/src/store.ts:5106](../../packages/store/src/store.ts#L5106) `Store/leastPrivilege` | `SQLite.all` (5106); `SQLite.prepare` (5106); `Store.sql` (5106) | CORE |
| [packages/store/src/store.ts:5710](../../packages/store/src/store.ts#L5710) `Store/ledgerRow` | `SQLite.get` (5710, 5711); `SQLite.prepare` (5710, 5711); `Store.sql` (5710, 5711) | AUTH |
| [packages/store/src/store.ts:5722](../../packages/store/src/store.ts#L5722) `Store/ledgerWrite` | `Store.sql` (5722, 5723, 5725, 5727, 5730, 5730) | AUTH |
| [packages/store/src/store.ts:5416](../../packages/store/src/store.ts#L5416) `Store/limitAccountImport` | `SQLite.prepare` (5416, 5417, 5420); `Store.sql` (5416, 5417, 5420); `SQLite.get` (5417) | CORE |
| [packages/store/src/store.ts:3932](../../packages/store/src/store.ts#L3932) `Store/linkIdentity` | `SQLite.get` (3932); `SQLite.prepare` (3932); `Store.sql` (3932) | CORE |
| [packages/store/src/store.ts:3924](../../packages/store/src/store.ts#L3924) `Store/linkPrincipal` | `SQLite.get` (3924); `SQLite.prepare` (3924); `Store.sql` (3924) | CORE |
| [packages/store/src/store.ts:4692](../../packages/store/src/store.ts#L4692) `Store/markPiiField` | `SQLite.prepare` (4692); `Store.sql` (4692) | CORE |
| [packages/store/src/store.ts:8550](../../packages/store/src/store.ts#L8550) `Store/markRepeating` | `SQLite.prepare` (8550); `Store.sql` (8550) | CORE |
| [packages/store/src/store.ts:11634](../../packages/store/src/store.ts#L11634) `Store/matchIds` | `Store.matchIds` (11634); `SQLite.all` (11640); `SQLite.prepare` (11640); `Store.sql` (11640) | CORE |
| [packages/store/src/store.ts:1690](../../packages/store/src/store.ts#L1690) `Store/meta` | `SQLite.get` (1690); `SQLite.prepare` (1690); `Store.sql` (1690) | CORE |
| [packages/store/src/store.ts:1024](../../packages/store/src/store.ts#L1024) `Store/metadataVersions` | `SQLite.get` (1024); `SQLite.prepare` (1024); `Store.sql` (1024) | CORE |
| [packages/store/src/store.ts:9187](../../packages/store/src/store.ts#L9187) `Store/moveContainersIn` | `Store.sql` (9187, 9193, 9195, 9196, 9197, 9198, 9218, 9223, 9223, 9234, 9237, 9240, 9247); `SQLite.prepare` (9195, 9196, 9197, 9198, 9234, 9240); `SQLite.get` (9200, 9234, 9240) | CORE |
| [packages/store/src/store.ts:9109](../../packages/store/src/store.ts#L9109) `Store/moveContainersOut` | `Store.sql` (9109, 9117, 9119, 9121, 9126, 9127, 9147, 9153, 9155, 9157, 9157, 9163, 9163, 9168, 9170, 9172, 9172, 9178); `SQLite.get` (9117); `SQLite.prepare` (9117, 9126, 9127); `Store.container` (9129) | CORE |
| [packages/store/src/store.ts:5287](../../packages/store/src/store.ts#L5287) `Store/mustChangePassword` | `SQLite.get` (5287); `SQLite.prepare` (5287); `Store.sql` (5287) | CORE |
| [packages/store/src/store.ts:1626](../../packages/store/src/store.ts#L1626) `Store/nativeIdGuards` | `Store.sql` (1626, 1627, 1629) | CORE |
| [packages/store/src/store.ts:2492](../../packages/store/src/store.ts#L2492) `Store/nextRecordId` | `SQLite.get` (2492); `SQLite.prepare` (2492); `Store.sql` (2492) | CORE |
| [packages/store/src/store.ts:6016](../../packages/store/src/store.ts#L6016) `Store/objectUseSince` | `SQLite.get` (6016); `SQLite.prepare` (6016); `Store.sql` (6016) | CORE |
| [packages/store/src/store.ts:9381](../../packages/store/src/store.ts#L9381) `Store/orderBy` | `Store.valueListItems` (9381) | CORE |
| [packages/store/src/store.ts:8742](../../packages/store/src/store.ts#L8742) `Store/orphanContainerReport` | `SQLite.all` (8742); `SQLite.prepare` (8742); `Store.sql` (8742) | CORE |
| [packages/store/src/store.ts:6248](../../packages/store/src/store.ts#L6248) `Store/passkeyAllowList` | `SQLite.all` (6248); `SQLite.prepare` (6248); `Store.sql` (6248) | CORE |
| [packages/store/src/store.ts:6287](../../packages/store/src/store.ts#L6287) `Store/passkeyIds` | `SQLite.all` (6287); `SQLite.prepare` (6287); `Store.sql` (6287) | CORE |
| [packages/store/src/store.ts:6275](../../packages/store/src/store.ts#L6275) `Store/passkeys` | `SQLite.all` (6275); `SQLite.prepare` (6275); `Store.sql` (6275) | CORE |
| [packages/store/src/store.ts:5326](../../packages/store/src/store.ts#L5326) `Store/passwordDaysRemaining` | `SQLite.get` (5326); `SQLite.prepare` (5326); `Store.sql` (5326) | CORE |
| [packages/store/src/store.ts:7306](../../packages/store/src/store.ts#L7306) `Store/passwordState` | `SQLite.get` (7306); `SQLite.prepare` (7306); `Store.sql` (7306) | CORE |
| [packages/store/src/store.ts:4215](../../packages/store/src/store.ts#L4215) `Store/pendingChanges` | `SQLite.all` (4215); `SQLite.prepare` (4215); `Store.sql` (4215) | CORE |
| [packages/store/src/store.ts:1708](../../packages/store/src/store.ts#L1708) `Store/persistentData` | `SQLite.get` (1708) | CORE |
| [packages/store/src/store.ts:1717](../../packages/store/src/store.ts#L1717) `Store/persistentDataIds` | `SQLite.all` (1717) | CORE |
| [packages/store/src/store.ts:1698](../../packages/store/src/store.ts#L1698) `Store/persistentTable` | `Store.sql` (1698) | CORE |
| [packages/store/src/store.ts:10733](../../packages/store/src/store.ts#L10733) `Store/portalContainerTarget` | `Store.row` (10733); `relatedIdList` (10735) | CORE |
| [packages/store/src/store.ts:8160](../../packages/store/src/store.ts#L8160) `Store/portalCountsCurrent` | `Store.canView` (8160); `Store.row` (8187) | GATED-STORE |
| [packages/store/src/store.ts:8405](../../packages/store/src/store.ts#L8405) `Store/portalRows` | `relatedRows` (8405); `relatedIdList` (8406); `Store.viewableSet` (8409); `rowsById` (8434, 8472); `Calculations.related` (8448) | CORE |
| [packages/store/src/store.ts:8416](../../packages/store/src/store.ts#L8416) `Store/portalRows/context` | `Calculations.context` (8416) | CORE |
| [packages/store/src/store.ts:8426](../../packages/store/src/store.ts#L8426) `Store/portalRows/valueOf` | `Calculations.value` (8426) | CORE |
| [packages/store/src/store.ts:2870](../../packages/store/src/store.ts#L2870) `Store/prepared` | `SQLite.prepare` (2870); `Store.sql` (2870) | CORE |
| [packages/store/src/store.ts:5398](../../packages/store/src/store.ts#L5398) `Store/previewAccountImport` | `Store.sql` (5398, 5399, 5408) | CORE |
| [packages/store/src/store.ts:7104](../../packages/store/src/store.ts#L7104) `Store/previewRecordRuleCurrent` | `SQLite.get` (7104); `SQLite.prepare` (7104, 7107); `Store.sql` (7104, 7107); `SQLite.all` (7107); `Calculations.context` (7113, 7129) | CORE |
| [packages/store/src/store.ts:9902](../../packages/store/src/store.ts#L9902) `Store/previewRow` | `Store.row` (9902) | CORE |
| [packages/store/src/store.ts:6502](../../packages/store/src/store.ts#L6502) `Store/privilegeSets` | `Store.sql` (6502) | CORE |
| [packages/store/src/store.ts:3108](../../packages/store/src/store.ts#L3108) `Store/pruneAudit` | `Store.sql` (3108, 3111, 3116, 3118, 3126, 3131, 3133); `SQLite.get` (3116, 3129, 3133); `SQLite.prepare` (3116, 3126, 3133) | CORE |
| [packages/store/src/store.ts:8777](../../packages/store/src/store.ts#L8777) `Store/purgeOrphanContainers` | `Store.sql` (8777, 8781, 8790, 8793, 8794, 8799, 8800, 8802, 8802); `Store.orphanContainerReport` (8785); `SQLite.get` (8790); `SQLite.prepare` (8790, 8793, 8794) | CORE |
| [packages/store/src/store.ts:11965](../../packages/store/src/store.ts#L11965) `Store/query` | `SQLite.iterate` (11965) | CORE |
| [packages/store/src/store.ts:12005](../../packages/store/src/store.ts#L12005) `Store/queryWithOriginsCurrent` | `SQLite.iterate` (12005); `SQLite.all` (12014, 12017); `SQLite.prepare` (12014, 12017) | CORE |
| [packages/store/src/store.ts:11754](../../packages/store/src/store.ts#L11754) `Store/readOnlyChecked` | `SQLite.prepare` (11754, 11758, 11767, 11772); `SQLite.all` (11758, 11767, 11772) | CORE |
| [packages/store/src/store.ts:3904](../../packages/store/src/store.ts#L3904) `Store/recompute` | `SQLite.prepare` (3904, 3908); `Store.sql` (3904, 3908); `SQLite.iterate` (3908); `Calculations.computeStoredStyled` (3909); `Calculations.value` (3909) | CORE |
| [packages/store/src/store.ts:2885](../../packages/store/src/store.ts#L2885) `Store/recordAsOf` | `SQLite.get` (2885, 2887); `SQLite.prepare` (2885, 2887, 2889, 2890); `Store.sql` (2885, 2887, 2889, 2890); `SQLite.all` (2889, 2890) | CORE |
| [packages/store/src/store.ts:2579](../../packages/store/src/store.ts#L2579) `Store/recordCount` | `SQLite.get` (2579); `SQLite.prepare` (2579); `Store.sql` (2579) | CORE |
| [packages/store/src/store.ts:1755](../../packages/store/src/store.ts#L1755) `Store/recordedFormat` | `Store.sql` (1755) | CORE |
| [packages/store/src/store.ts:2963](../../packages/store/src/store.ts#L2963) `Store/recordLife` | `SQLite.all` (2963); `SQLite.prepare` (2963); `Store.sql` (2963) | CORE |
| [packages/store/src/store.ts:5947](../../packages/store/src/store.ts#L5947) `Store/recordObjectUse` | `Store.sql` (5947) | CORE |
| [packages/store/src/store.ts:10431](../../packages/store/src/store.ts#L10431) `Store/recordViewable` | `Store.row` (10431) | GATED-STORE |
| [packages/store/src/store.ts:9081](../../packages/store/src/store.ts#L9081) `Store/recoverContainersOut` | `SQLite.prepare` (9081); `Store.sql` (9081); `SQLite.get` (9084) | CORE |
| [packages/store/src/store.ts:1858](../../packages/store/src/store.ts#L1858) `Store/recoverPendingExternalFiles` | `Store.sql` (1858, 1860, 1884, 1886); `SQLite.prepare` (1860); `SQLite.get` (1871) | CORE |
| [packages/store/src/store.ts:6445](../../packages/store/src/store.ts#L6445) `Store/recoveryCodesRemaining` | `SQLite.get` (6445); `SQLite.prepare` (6445); `Store.sql` (6445) | CORE |
| [packages/store/src/store.ts:11794](../../packages/store/src/store.ts#L11794) `Store/refreshDecimalSqlViews` | `SQLite.get` (11794); `SQLite.prepare` (11794) | CORE |
| [packages/store/src/store.ts:4073](../../packages/store/src/store.ts#L4073) `Store/refuseLookalikeAccount` | `SQLite.all` (4073); `SQLite.prepare` (4073); `Store.sql` (4073) | CORE |
| [packages/store/src/store.ts:6311](../../packages/store/src/store.ts#L6311) `Store/registerPasskey` | `SQLite.prepare` (6311); `Store.sql` (6311) | CORE |
| [packages/store/src/store.ts:4251](../../packages/store/src/store.ts#L4251) `Store/rejectPending` | `SQLite.get` (4251); `SQLite.prepare` (4251, 4253); `Store.sql` (4251, 4253) | CORE |
| [packages/store/src/store.ts:9654](../../packages/store/src/store.ts#L9654) `Store/relatedCriteria` | `SQLite.iterate` (9654); `SQLite.prepare` (9654); `Store.sql` (9654) | CORE |
| [packages/store/src/store.ts:9651](../../packages/store/src/store.ts#L9651) `Store/relatedCriteria/matched` | `relatedRows` (9651) | CORE |
| [packages/store/src/store.ts:7915](../../packages/store/src/store.ts#L7915) `Store/relatedValues` | `Calculations.globalValue` (7915); `Calculations.unstoredValue` (7917) | CORE |
| [packages/store/src/store.ts:6324](../../packages/store/src/store.ts#L6324) `Store/removePasskey` | `SQLite.get` (6324); `SQLite.prepare` (6324, 6325); `Store.sql` (6324, 6325) | CORE |
| [packages/store/src/store.ts:9480](../../packages/store/src/store.ts#L9480) `Store/reportFind` | `Store.query` (9480, 9482, 9483); `Store.recordCount` (9485) | CORE |
| [packages/store/src/store.ts:10920](../../packages/store/src/store.ts#L10920) `Store/restoreDeletedRowLocked` | `SQLite.get` (10920, 10925); `SQLite.prepare` (10920, 10921, 10925, 10935); `Store.sql` (10920, 10921, 10925, 10935); `SQLite.all` (10921) | CORE |
| [packages/store/src/store.ts:2921](../../packages/store/src/store.ts#L2921) `Store/restoreRecord` | `Store.recordAsOf` (2921); `SQLite.get` (2925); `SQLite.prepare` (2925, 2930, 2939, 2950); `Store.sql` (2925, 2930, 2939, 2950) | CORE |
| [packages/store/src/store.ts:2979](../../packages/store/src/store.ts#L2979) `Store/revertAuditEntry` | `SQLite.get` (2979); `SQLite.prepare` (2979); `Store.sql` (2979); `Store.canViewRecord` (2981); `Store.auditLog` (2984) | CORE |
| [packages/store/src/store.ts:6072](../../packages/store/src/store.ts#L6072) `Store/revokeApiToken` | `SQLite.prepare` (6072); `Store.sql` (6072) | CORE |
| [packages/store/src/store.ts:5595](../../packages/store/src/store.ts#L5595) `Store/revokeSignInCredentials` | `SQLite.prepare` (5595, 5596, 5597); `Store.sql` (5595, 5596, 5597) | AUTH |
| [packages/store/src/store.ts:9921](../../packages/store/src/store.ts#L9921) `Store/row` | `SQLite.get` (9921) | CORE |
| [packages/store/src/store.ts:11898](../../packages/store/src/store.ts#L11898) `Store/rowsOf` | `SQLite.iterate` (11898, 11907) | CORE |
| [packages/store/src/store.ts:6909](../../packages/store/src/store.ts#L6909) `Store/ruleOutcome` | `Calculations.context` (6909) | CORE |
| [packages/store/src/store.ts:9765](../../packages/store/src/store.ts#L9765) `Store/runningSummaryValues` | `Store.viewableIds` (9765); `rowsById` (9767); `Calculations.value` (9778, 9784); `Calculations.related` (9795) | GATED-STORE |
| [packages/store/src/store.ts:6531](../../packages/store/src/store.ts#L6531) `Store/savePrivilegeSet` | `SQLite.prepare` (6531, 6539); `Store.sql` (6531, 6539) | AUTH |
| [packages/store/src/store.ts:4486](../../packages/store/src/store.ts#L4486) `Store/saveScriptTest` | `SQLite.prepare` (4486); `Store.sql` (4486) | CORE |
| [packages/store/src/store.ts:7069](../../packages/store/src/store.ts#L7069) `Store/scopedTableSql` | `Store.viewableIds` (7069); `SQLite.all` (7072); `SQLite.prepare` (7072); `Store.sql` (7072) | GATED-STORE |
| [packages/store/src/store.ts:3641](../../packages/store/src/store.ts#L3641) `Store/scriptHistory` | `SQLite.all` (3641); `SQLite.prepare` (3641); `Store.sql` (3641) | CORE |
| [packages/store/src/store.ts:1834](../../packages/store/src/store.ts#L1834) `Store/securityChainHeadAudit` | `SQLite.get` (1834); `SQLite.prepare` (1834); `Store.sql` (1834) | CORE |
| [packages/store/src/store.ts:3314](../../packages/store/src/store.ts#L3314) `Store/securityChange` | `Store.sql` (3314, 3316); `SQLite.prepare` (3316) | CORE |
| [packages/store/src/store.ts:2844](../../packages/store/src/store.ts#L2844) `Store/securityEvents` | `Store.auditLog` (2844) | CORE |
| [packages/store/src/store.ts:5796](../../packages/store/src/store.ts#L5796) `Store/securityToken` | `SQLite.get` (5796); `SQLite.prepare` (5796); `Store.sql` (5796) | CORE |
| [packages/store/src/store.ts:11928](../../packages/store/src/store.ts#L11928) `Store/selectHeldCurrent` | `Store.sql` (11928, 11930, 11933); `SQLite.prepare` (11930) | CORE |
| [packages/store/src/store.ts:11226](../../packages/store/src/store.ts#L11226) `Store/selectIdsCurrent` | `Store.selectIds` (11226); `SQLite.all` (11233); `SQLite.prepare` (11233); `Store.sql` (11233) | GATED-STORE |
| [packages/store/src/store.ts:11918](../../packages/store/src/store.ts#L11918) `Store/selectIn` | `Store.select` (11918) | CORE |
| [packages/store/src/store.ts:2245](../../packages/store/src/store.ts#L2245) `Store/selfContainedCopy` | `Store.sql` (2245); `SQLite.all` (2250); `SQLite.prepare` (2250, 2252, 2253, 2254) | CORE |
| [packages/store/src/store.ts:5574](../../packages/store/src/store.ts#L5574) `Store/setAccountActive` | `SQLite.prepare` (5574, 5582, 5583); `Store.sql` (5574, 5582, 5583) | AUTH |
| [packages/store/src/store.ts:5815](../../packages/store/src/store.ts#L5815) `Store/setAccountLocalOnly` | `SQLite.prepare` (5815); `Store.sql` (5815) | CORE |
| [packages/store/src/store.ts:6687](../../packages/store/src/store.ts#L6687) `Store/setAccountPrivilegeSet` | `SQLite.get` (6687); `SQLite.prepare` (6687, 6690, 6694); `Store.sql` (6687, 6690, 6694) | AUTH |
| [packages/store/src/store.ts:5824](../../packages/store/src/store.ts#L5824) `Store/setAccountRequire2fa` | `SQLite.prepare` (5824); `Store.sql` (5824) | CORE |
| [packages/store/src/store.ts:4103](../../packages/store/src/store.ts#L4103) `Store/setAgentAccount` | `SQLite.get` (4103); `SQLite.prepare` (4103, 4109); `Store.sql` (4103, 4109) | CORE |
| [packages/store/src/store.ts:4565](../../packages/store/src/store.ts#L4565) `Store/setAiAllowed` | `SQLite.prepare` (4565); `Store.sql` (4565) | CORE |
| [packages/store/src/store.ts:4650](../../packages/store/src/store.ts#L4650) `Store/setAiPolicy` | `SQLite.prepare` (4650); `Store.sql` (4650) | CORE |
| [packages/store/src/store.ts:7335](../../packages/store/src/store.ts#L7335) `Store/setAllowBlankPasswordFromLan` | `SQLite.prepare` (7335); `Store.sql` (7335) | CORE |
| [packages/store/src/store.ts:3085](../../packages/store/src/store.ts#L3085) `Store/setAuditSettings` | `SQLite.prepare` (3085); `Store.sql` (3085) | CORE |
| [packages/store/src/store.ts:9310](../../packages/store/src/store.ts#L9310) `Store/setContainer` | `Store.sql` (9310); `Store.row` (9316) | CORE |
| [packages/store/src/store.ts:4055](../../packages/store/src/store.ts#L4055) `Store/setExternalAccount` | `SQLite.get` (4055); `SQLite.prepare` (4055, 4060); `Store.sql` (4055, 4060) | CORE |
| [packages/store/src/store.ts:5273](../../packages/store/src/store.ts#L5273) `Store/setMustChangePassword` | `SQLite.prepare` (5273); `Store.sql` (5273) | CORE |
| [packages/store/src/store.ts:4310](../../packages/store/src/store.ts#L4310) `Store/setPasswordOnly` | `SQLite.get` (4310); `SQLite.prepare` (4310, 4316, 4325, 4332, 4333, 4334); `Store.sql` (4310, 4316, 4325, 4332, 4333, 4334) | AUTH |
| [packages/store/src/store.ts:4427](../../packages/store/src/store.ts#L4427) `Store/setPasswordPolicy` | `SQLite.prepare` (4427); `Store.sql` (4427) | CORE |
| [packages/store/src/store.ts:1723](../../packages/store/src/store.ts#L1723) `Store/setPersistentData` | `SQLite.prepare` (1723, 1727); `Store.sql` (1723, 1727) | CORE |
| [packages/store/src/store.ts:4670](../../packages/store/src/store.ts#L4670) `Store/setPiiIsolation` | `SQLite.prepare` (4670); `Store.sql` (4670) | CORE |
| [packages/store/src/store.ts:4463](../../packages/store/src/store.ts#L4463) `Store/setRequireTotpForFullAccess` | `SQLite.prepare` (4463); `Store.sql` (4463) | CORE |
| [packages/store/src/store.ts:4582](../../packages/store/src/store.ts#L4582) `Store/setScriptNetwork` | `SQLite.prepare` (4582); `Store.sql` (4582) | CORE |
| [packages/store/src/store.ts:4639](../../packages/store/src/store.ts#L4639) `Store/setSqlRequiresFmxdbc` | `SQLite.prepare` (4639); `Store.sql` (4639) | CORE |
| [packages/store/src/store.ts:10352](../../packages/store/src/store.ts#L10352) `Store/setStoredCalcValues` | `SQLite.prepare` (10352, 10353); `Store.sql` (10352, 10353); `SQLite.get` (10357) | CORE |
| [packages/store/src/store.ts:5749](../../packages/store/src/store.ts#L5749) `Store/settleSignIns` | `SQLite.all` (5749, 5755); `SQLite.prepare` (5749, 5755, 5761, 5765, 5767); `Store.sql` (5749, 5755, 5761, 5765, 5767) | AUTH |
| [packages/store/src/store.ts:9413](../../packages/store/src/store.ts#L9413) `Store/setUserPref` | `Store.sql` (9413, 9414, 9415); `SQLite.prepare` (9414, 9415) | CORE |
| [packages/store/src/store.ts:4623](../../packages/store/src/store.ts#L4623) `Store/setWebViewerHosts` | `SQLite.prepare` (4623); `Store.sql` (4623) | CORE |
| [packages/store/src/store.ts:2376](../../packages/store/src/store.ts#L2376) `Store/shareResults` | `Store.sql` (2376) | CORE |
| [packages/store/src/store.ts:1785](../../packages/store/src/store.ts#L1785) `Store/shipWal` | `Store.sql` (1785) | CORE |
| [packages/store/src/store.ts:5696](../../packages/store/src/store.ts#L5696) `Store/signInBase` | `SQLite.get` (5696); `SQLite.prepare` (5696); `Store.sql` (5696) | AUTH |
| [packages/store/src/store.ts:5698](../../packages/store/src/store.ts#L5698) `Store/signInBase/identity` | `SQLite.get` (5698); `SQLite.prepare` (5698); `Store.sql` (5698) | AUTH |
| [packages/store/src/store.ts:5685](../../packages/store/src/store.ts#L5685) `Store/signInMark` | `SQLite.prepare` (5685); `Store.sql` (5685) | AUTH |
| [packages/store/src/store.ts:9579](../../packages/store/src/store.ts#L9579) `Store/sortedPage` | `SQLite.iterate` (9579); `SQLite.prepare` (9579, 9594); `Store.sql` (9579, 9594); `SQLite.all` (9594) | CORE |
| [packages/store/src/store.ts:11528](../../packages/store/src/store.ts#L11528) `Store/sortIdsCurrentProgress` | `Store.sortIds` (11528); `Store.sortIdsProgress` (11528); `SQLite.all` (11541); `SQLite.prepare` (11541, 11620); `Store.sql` (11541, 11620); `Store.valueListItems` (11549); `rowsById` (11561); `Calculations.globalValue` (11564); `Calculations.unstoredValue` (11565); `Calculations.related` (11571); `SQLite.iterate` (11620) | GATED-STORE |
| [packages/store/src/store.ts:11708](../../packages/store/src/store.ts#L11708) `Store/storedFileId` | `SQLite.get` (11708); `SQLite.prepare` (11708) | CORE |
| [packages/store/src/store.ts:9727](../../packages/store/src/store.ts#L9727) `Store/summaries` | `Calculations.wholeTable` (9727); `Calculations.collect` (9747, 9752) | CORE |
| [packages/store/src/store.ts:9743](../../packages/store/src/store.ts#L9743) `Store/summaries/recs` | `SQLite.iterate` (9743); `SQLite.prepare` (9743); `Store.sql` (9743) | CORE |
| [packages/store/src/store.ts:6262](../../packages/store/src/store.ts#L6262) `Store/takeWebauthnChallenge` | `SQLite.get` (6262); `SQLite.prepare` (6262, 6266); `Store.sql` (6262, 6266) | CORE |
| [packages/store/src/store.ts:7519](../../packages/store/src/store.ts#L7519) `Store/themes` | `SQLite.get` (7519) | CORE |
| [packages/store/src/store.ts:9466](../../packages/store/src/store.ts#L9466) `Store/timeFind` | `Store.query` (9466) | CORE |
| [packages/store/src/store.ts:7854](../../packages/store/src/store.ts#L7854) `Store/toRecord` | `Calculations.value` (7854, 7864); `Calculations.globalValue` (7858); `Calculations.unstoredStyled` (7863) | CORE |
| [packages/store/src/store.ts:6146](../../packages/store/src/store.ts#L6146) `Store/totpAccounts` | `SQLite.all` (6146); `SQLite.prepare` (6146); `Store.sql` (6146) | CORE |
| [packages/store/src/store.ts:1797](../../packages/store/src/store.ts#L1797) `Store/trial` | `Store.sql` (1797) | CORE |
| [packages/store/src/store.ts:1802](../../packages/store/src/store.ts#L1802) `Store/trial/undo` | `Store.sql` (1802) | CORE |
| [packages/store/src/store.ts:11664](../../packages/store/src/store.ts#L11664) `Store/truncate/run` | `Store.sql` (11664, 11666, 11673, 11675, 11677, 11678); `SQLite.prepare` (11666, 11673); `SQLite.all` (11668) | CORE |
| [packages/store/src/store.ts:4002](../../packages/store/src/store.ts#L4002) `Store/unmigratedAccounts` | `SQLite.all` (4002); `SQLite.prepare` (4002); `Store.sql` (4002) | CORE |
| [packages/store/src/store.ts:5179](../../packages/store/src/store.ts#L5179) `Store/unusedAccess` | `SQLite.get` (5179); `SQLite.prepare` (5179, 5188); `Store.sql` (5179, 5188); `SQLite.all` (5188) | CORE |
| [packages/store/src/store.ts:5227](../../packages/store/src/store.ts#L5227) `Store/unusedObjects` | `SQLite.get` (5227); `SQLite.prepare` (5227, 5230); `Store.sql` (5227, 5230); `SQLite.all` (5230) | CORE |
| [packages/store/src/store.ts:6386](../../packages/store/src/store.ts#L6386) `Store/unusedRecoveryHashes` | `SQLite.all` (6386); `SQLite.prepare` (6386); `Store.sql` (6386) | CORE |
| [packages/store/src/store.ts:5009](../../packages/store/src/store.ts#L5009) `Store/unusualAccess` | `Store.auditLog` (5009, 5075) | CORE |
| [packages/store/src/store.ts:10166](../../packages/store/src/store.ts#L10166) `Store/update` | `Store.row` (10166); `Store.sql` (10197, 10198, 10244, 10247) | CORE |
| [packages/store/src/store.ts:10200](../../packages/store/src/store.ts#L10200) `Store/update/undo` | `Store.sql` (10200) | CORE |
| [packages/store/src/store.ts:10637](../../packages/store/src/store.ts#L10637) `Store/updatePortals` | `Store.row` (10637, 10674); `relatedRows` (10675) | CORE |
| [packages/store/src/store.ts:10647](../../packages/store/src/store.ts#L10647) `Store/updatePortals/portal/related` | `relatedIdList` (10647) | CORE |
| [packages/store/src/store.ts:10619](../../packages/store/src/store.ts#L10619) `Store/updateRelated` | `relatedRows` (10619) | CORE |
| [packages/store/src/store.ts:5265](../../packages/store/src/store.ts#L5265) `Store/usageCounting` | `SQLite.get` (5265); `SQLite.prepare` (5265); `Store.sql` (5265) | CORE |
| [packages/store/src/store.ts:9404](../../packages/store/src/store.ts#L9404) `Store/userPrefs` | `SQLite.all` (9404); `SQLite.prepare` (9404); `Store.sql` (9404) | CORE |
| [packages/store/src/store.ts:8276](../../packages/store/src/store.ts#L8276) `Store/valueListItemsCurrent` | `Store.valueListItems` (8276); `Store.get` (8290); `relatedRows` (8291); `Store.row` (8291); `SQLite.iterate` (8293); `SQLite.prepare` (8293); `Store.sql` (8293); `Calculations.related` (8303); `Calculations.value` (8307, 8308) | GATED-STORE |
| [packages/store/src/store.ts:10835](../../packages/store/src/store.ts#L10835) `Store/vaultHeld` | `SQLite.get` (10835); `SQLite.prepare` (10835); `Store.sql` (10835) | CORE |
| [packages/store/src/store.ts:6346](../../packages/store/src/store.ts#L6346) `Store/verifyPasskeyCredential` | `SQLite.get` (6346); `SQLite.prepare` (6346, 6358); `Store.sql` (6346, 6358) | CORE |
| [packages/store/src/store.ts:6175](../../packages/store/src/store.ts#L6175) `Store/verifyTotp` | `SQLite.get` (6175); `SQLite.prepare` (6175, 6182); `Store.sql` (6175, 6182) | CORE |
| [packages/store/src/store.ts:2512](../../packages/store/src/store.ts#L2512) `Store/versionNumber` | `SQLite.get` (2512); `SQLite.prepare` (2512); `Store.sql` (2512) | CORE |
| [packages/store/src/store.ts:2387](../../packages/store/src/store.ts#L2387) `Store/versionTriggers` | `SQLite.get` (2387); `SQLite.prepare` (2387, 2392, 2393); `Store.sql` (2387, 2392, 2393, 2410, 2412, 2413, 2415); `SQLite.all` (2392, 2393) | CORE |
| [packages/store/src/store.ts:2355](../../packages/store/src/store.ts#L2355) `Store/warmSummariesCurrent` | `Calculations.wholeTable` (2355) | CORE |
| [packages/store/src/store.ts:4605](../../packages/store/src/store.ts#L4605) `Store/webViewerChecked` | `SQLite.get` (4605); `SQLite.prepare` (4605); `Store.sql` (4605) | CORE |
| [packages/store/src/store.ts:2091](../../packages/store/src/store.ts#L2091) `Store/withWriteTransaction` | `Store.sql` (2091, 2104, 2111, 2116, 2116) | CORE |
| [packages/store/src/store.ts:7783](../../packages/store/src/store.ts#L7783) `Store/wordIndex` | `Store.sql` (7783, 7791, 7796); `Store.recordCount` (7795); `SQLite.get` (7796); `SQLite.prepare` (7796) | CORE |
| [packages/store/src/store.ts:8974](../../packages/store/src/store.ts#L8974) `Store/writeExternalFile` | `Store.evaluateEach` (8974); `SQLite.prepare` (8997); `Store.sql` (8997) | CORE |
| [packages/store/src/store.ts:8998](../../packages/store/src/store.ts#L8998) `Store/writeExternalFile/taken` | `SQLite.get` (8998) | CORE |
| [packages/store/src/store.ts:6005](../../packages/store/src/store.ts#L6005) `Store/writeObjectUseRows` | `SQLite.prepare` (6005, 6006, 6011); `Store.sql` (6005, 6006, 6011) | CORE |
| [packages/store/src/store.ts:2567](../../packages/store/src/store.ts#L2567) `Store/writeToken` | `SQLite.get` (2567); `SQLite.prepare` (2567); `Store.sql` (2567) | CORE |
| [packages/store/src/store.ts:5977](../../packages/store/src/store.ts#L5977) `Store/writeUsage` | `Store.sql` (5977, 5978, 5980, 5984, 5986) | CORE |
| [packages/store/src/store.ts:5993](../../packages/store/src/store.ts#L5993) `Store/writeUsageRows` | `SQLite.prepare` (5993, 5994, 6000); `Store.sql` (5993, 5994, 6000) | CORE |
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
| [packages/store/src/store.ts:1088](../../packages/store/src/store.ts#L1088) `Store/referenceSecurity` | `SQLite.get` (1088); `SQLite.prepare` (1088); `Store.sql` (1088) | Internal File Access authorization reads only its version and file-local security metadata; public management reads require Full Access. No record values are read. |
| [packages/store/src/store.ts:1107](../../packages/store/src/store.ts#L1107) `Store/writeFileAccess` | `SQLite.prepare` (1107); `Store.sql` (1107) | Writes only File Access security metadata inside securityChange; public mutations require Full Access, while hosted rename observation changes display names without granting access. |
| [packages/store/src/store.ts:1149](../../packages/store/src/store.ts#L1149) `Store/resetFileAccessId` | `SQLite.prepare` (1149, 1151); `Store.sql` (1149, 1151) | Full Access checked inside the security transaction before writing the new reference identity and retaining the stable token-scope identity; no record data is read. |
| [packages/store/src/ess/driver.ts:123](../../packages/store/src/ess/driver.ts#L123) `SqliteDriver/query` | `SQLite.prepare` (123); `SQLite.iterate` (128) | CORE |
| [packages/store/src/ess/driver.ts:142](../../packages/store/src/ess/driver.ts#L142) `SqliteDriver/tables` | `SQLite.all` (142); `SQLite.prepare` (142) | CORE |
| [packages/store/src/ess/driver.ts:147](../../packages/store/src/ess/driver.ts#L147) `SqliteDriver/columns` | `SQLite.all` (147); `SQLite.prepare` (147) | CORE |
| [packages/store/src/ess/mirror.ts:76](../../packages/store/src/ess/mirror.ts#L76) `refreshMirror` | `SQLite.all` (76); `SQLite.prepare` (76, 78, 79, 80, 96, 97) | CORE |
| [packages/store/src/store.ts:1277](../../packages/store/src/store.ts#L1277) `Store/refreshShadow` | `Store.sql` (1277) | CORE |
| [packages/store/src/store.ts:1231](../../packages/store/src/store.ts#L1231) `Store/flushEssWrites` | `Store.sql` (1231, 1232, 1240, 1242); `SQLite.prepare` (1232, 1240, 1242) | CORE |
<!-- end generated read-gate inventory -->
