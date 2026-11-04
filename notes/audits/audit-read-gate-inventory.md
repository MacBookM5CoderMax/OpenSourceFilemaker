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
| [packages/store/src/store.ts:5650](../../packages/store/src/store.ts#L5650) `Store/accountIdentityId` | `SQLite.get` (5650, 5656); `SQLite.prepare` (5650, 5655, 5656); `Store.sql` (5650, 5655, 5656) | CORE |
| [packages/store/src/store.ts:5644](../../packages/store/src/store.ts#L5644) `Store/accountIdentityIdIfSet` | `SQLite.get` (5644); `SQLite.prepare` (5644); `Store.sql` (5644) | CORE |
| [packages/store/src/store.ts:5606](../../packages/store/src/store.ts#L5606) `Store/accountInactive` | `SQLite.get` (5606); `SQLite.prepare` (5606); `Store.sql` (5606) | CORE |
| [packages/store/src/store.ts:5803](../../packages/store/src/store.ts#L5803) `Store/accountLocalOnly` | `SQLite.get` (5803); `SQLite.prepare` (5803); `Store.sql` (5803) | CORE |
| [packages/store/src/store.ts:6672](../../packages/store/src/store.ts#L6672) `Store/accountPrivilegeSet` | `SQLite.get` (6672); `SQLite.prepare` (6672); `Store.sql` (6672) | CORE |
| [packages/store/src/store.ts:5808](../../packages/store/src/store.ts#L5808) `Store/accountRequires2fa` | `SQLite.get` (5808); `SQLite.prepare` (5808); `Store.sql` (5808) | CORE |
| [packages/store/src/store.ts:3966](../../packages/store/src/store.ts#L3966) `Store/accounts` | `SQLite.all` (3966); `SQLite.prepare` (3966); `Store.sql` (3966) | CORE |
| [packages/store/src/store.ts:3962](../../packages/store/src/store.ts#L3962) `Store/accountsSharingLockout` | `SQLite.all` (3962); `SQLite.prepare` (3962); `Store.sql` (3962) | CORE |
| [packages/store/src/store.ts:6028](../../packages/store/src/store.ts#L6028) `Store/accountUsage` | `SQLite.get` (6028); `SQLite.prepare` (6028, 6029); `Store.sql` (6028, 6029); `SQLite.all` (6029); `Store.auditLog` (6045) | CORE |
| [packages/store/src/store.ts:8909](../../packages/store/src/store.ts#L8909) `Store/addContainer` | `SQLite.all` (8909); `SQLite.prepare` (8909, 8914, 8928, 8932, 8933); `Store.sql` (8909, 8914, 8928, 8930, 8932, 8933, 8935, 8938); `SQLite.get` (8919); `Store.containerRange` (8921) | CORE |
| [packages/store/src/store.ts:8955](../../packages/store/src/store.ts#L8955) `Store/addExternalContainer` | `SQLite.prepare` (8955); `Store.sql` (8955) | CORE |
| [packages/store/src/store.ts:9432](../../packages/store/src/store.ts#L9432) `Store/addFieldIndex` | `Store.sql` (9432) | CORE |
| [packages/store/src/store.ts:7554](../../packages/store/src/store.ts#L7554) `Store/addImage` | `Store.sql` (7554, 7555); `SQLite.prepare` (7555) | CORE |
| [packages/store/src/store.ts:6722](../../packages/store/src/store.ts#L6722) `Store/addProvisionedAccount` | `SQLite.get` (6722); `SQLite.prepare` (6722, 6726); `Store.sql` (6722, 6726) | CORE |
| [packages/store/src/store.ts:8014](../../packages/store/src/store.ts#L8014) `Store/addRelated` | `relatedRows` (8014); `rowsById` (8049); `firstRelatedEach` (8075) | CORE |
| [packages/store/src/store.ts:8002](../../packages/store/src/store.ts#L8002) `Store/addRelated/summaries` | `Calculations.summary` (8002) | CORE |
| [packages/store/src/store.ts:3984](../../packages/store/src/store.ts#L3984) `Store/agentNeedsApproval` | `SQLite.get` (3984); `SQLite.prepare` (3984); `Store.sql` (3984) | CORE |
| [packages/store/src/store.ts:6949](../../packages/store/src/store.ts#L6949) `Store/allowedIds` | `SQLite.iterate` (6949); `SQLite.prepare` (6949); `Store.sql` (6949) | CORE |
| [packages/store/src/store.ts:6085](../../packages/store/src/store.ts#L6085) `Store/apiToken` | `SQLite.get` (6085); `SQLite.prepare` (6085, 6103); `Store.sql` (6085, 6103) | CORE |
| [packages/store/src/store.ts:6061](../../packages/store/src/store.ts#L6061) `Store/apiTokens` | `SQLite.all` (6061); `SQLite.prepare` (6061); `Store.sql` (6061) | CORE |
| [packages/store/src/store.ts:4384](../../packages/store/src/store.ts#L4384) `Store/appendSecurityEvent` | `Store.sql` (4384) | CORE |
| [packages/store/src/store.ts:3424](../../packages/store/src/store.ts#L3424) `Store/appendSecurityRow` | `Store.sql` (3424) | CORE |
| [packages/store/src/store.ts:5426](../../packages/store/src/store.ts#L5426) `Store/applyAccountImport` | `Store.sql` (5426, 5434, 5463); `SQLite.get` (5434); `SQLite.prepare` (5434, 5463) | CORE |
| [packages/store/src/store.ts:2692](../../packages/store/src/store.ts#L2692) `Store/applyDesign` | `Store.sql` (2692, 2693, 2713, 2716, 2721, 2737, 2740, 2740); `SQLite.prepare` (2716, 2721) | CORE |
| [packages/store/src/store.ts:4228](../../packages/store/src/store.ts#L4228) `Store/approvePending` | `SQLite.get` (4228); `SQLite.prepare` (4228, 4240); `Store.sql` (4228, 4240) | CORE |
| [packages/store/src/store.ts:3215](../../packages/store/src/store.ts#L3215) `Store/audit/write` | `Store.sql` (3215) | CORE |
| [packages/store/src/store.ts:2804](../../packages/store/src/store.ts#L2804) `Store/auditLog` | `SQLite.all` (2804); `SQLite.prepare` (2804); `Store.sql` (2804) | CORE |
| [packages/store/src/store.ts:2225](../../packages/store/src/store.ts#L2225) `Store/backup` | `Store.sql` (2225) | CORE |
| [packages/store/src/store.ts:3990](../../packages/store/src/store.ts#L3990) `Store/blankPasswordAccounts` | `SQLite.all` (3990); `SQLite.prepare` (3990); `Store.sql` (3990) | CORE |
| [packages/store/src/store.ts:5355](../../packages/store/src/store.ts#L5355) `Store/canonicalAccount` | `SQLite.all` (5355); `SQLite.prepare` (5355); `Store.sql` (5355) | CORE |
| [packages/store/src/store.ts:10019](../../packages/store/src/store.ts#L10019) `Store/canView` | `Store.canView` (10019); `Store.row` (10020) | GATED-STORE |
| [packages/store/src/store.ts:10001](../../packages/store/src/store.ts#L10001) `Store/canViewRecord` | `SQLite.get` (10001); `SQLite.prepare` (10001); `Store.sql` (10001) | GATED-STORE |
| [packages/store/src/store.ts:11117](../../packages/store/src/store.ts#L11117) `Store/cascadeDelete` | `relatedRows` (11117) | CORE |
| [packages/store/src/store.ts:2525](../../packages/store/src/store.ts#L2525) `Store/changeOne` | `Store.sql` (2525, 2527) | CORE |
| [packages/store/src/store.ts:2528](../../packages/store/src/store.ts#L2528) `Store/changeOne/read` | `SQLite.get` (2528); `SQLite.prepare` (2528); `Store.sql` (2528) | CORE |
| [packages/store/src/store.ts:9290](../../packages/store/src/store.ts#L9290) `Store/checkContainerWrite` | `Store.row` (9290) | CORE |
| [packages/store/src/store.ts:10737](../../packages/store/src/store.ts#L10737) `Store/checkEditable` | `Store.row` (10737) | CORE |
| [packages/store/src/store.ts:1747](../../packages/store/src/store.ts#L1747) `Store/checkpoint` | `SQLite.get` (1747); `SQLite.prepare` (1747); `Store.sql` (1747) | CORE |
| [packages/store/src/store.ts:4127](../../packages/store/src/store.ts#L4127) `Store/checkProposedWrite` | `Store.row` (4127); `relatedRows` (4141) | CORE |
| [packages/store/src/store.ts:6708](../../packages/store/src/store.ts#L6708) `Store/clearAccountPrivilegeSet` | `SQLite.prepare` (6708); `Store.sql` (6708) | CORE |
| [packages/store/src/store.ts:1769](../../packages/store/src/store.ts#L1769) `Store/close` | `Store.sql` (1769) | CORE |
| [packages/store/src/store.ts:9258](../../packages/store/src/store.ts#L9258) `Store/compactFile` | `Store.sql` (9258, 9259, 9261) | CORE |
| [packages/store/src/store.ts:9669](../../packages/store/src/store.ts#L9669) `Store/computedRows` | `Store.sql` (9669, 9672, 9673, 9674, 9676, 9686, 9687, 9688, 9691); `SQLite.prepare` (9672, 9674, 9676, 9686); `SQLite.iterate` (9676); `Calculations.globalValue` (9679); `Calculations.unstoredValue` (9680); `Calculations.related` (9683); `SQLite.all` (9686) | CORE |
| [packages/store/src/store.ts:11244](../../packages/store/src/store.ts#L11244) `Store/computeValuesCurrent` | `Store.computeValues` (11244); `Store.sql` (11250, 11254); `SQLite.all` (11254); `SQLite.prepare` (11254) | GATED-STORE |
| [packages/store/src/store.ts:6130](../../packages/store/src/store.ts#L6130) `Store/confirmTotp` | `SQLite.get` (6130); `SQLite.prepare` (6130, 6132); `Store.sql` (6130, 6132) | CORE |
| [packages/store/src/store.ts:1377](../../packages/store/src/store.ts#L1377) `Store/constructor` | `Store.sql` (1377, 1379, 1381, 1382, 1386, 1390, 1391, 1400, 1408, 1424, 1429, 1434, 1435, 1439, 1440, 1441, 1448, 1452, 1456, 1457, 1458, 1460, 1470, 1471, 1475, 1478, 1479, 1481, 1482, 1485, 1486, 1490, 1491, 1495, 1496, 1499, 1502, 1503, 1505, 1508, 1509, 1513, 1514, 1518, 1519, 1523, 1524, 1525, 1528, 1529, 1532, 1533, 1535, 1535, 1536, 1536, 1537, 1541, 1543, 1547, 1549, 1552, 1553, 1554, 1557, 1558, 1560, 1562, 1563, 1567, 1568, 1570, 1582, 1584, 1585, 1586, 1586, 1590, 1591); `SQLite.get` (1381, 1400); `SQLite.prepare` (1381, 1400, 1408, 1460, 1478, 1479, 1482, 1485, 1490, 1495, 1502, 1508, 1513, 1518, 1528, 1532, 1535, 1536, 1557, 1562, 1567); `SQLite.all` (1478, 1485, 1490, 1495, 1502, 1508, 1513, 1518, 1528, 1532, 1535, 1536, 1557, 1562, 1567) | CORE |
| [packages/store/src/store.ts:6488](../../packages/store/src/store.ts#L6488) `Store/consumeRecoveryCode` | `SQLite.prepare` (6488); `Store.sql` (6488) | CORE |
| [packages/store/src/store.ts:8833](../../packages/store/src/store.ts#L8833) `Store/container` | `SQLite.get` (8833); `SQLite.prepare` (8833, 8842); `Store.sql` (8833, 8842); `SQLite.all` (8842) | CORE |
| [packages/store/src/store.ts:9267](../../packages/store/src/store.ts#L9267) `Store/containerId` | `Store.containerId` (9267); `Store.row` (9268) | CORE |
| [packages/store/src/store.ts:8850](../../packages/store/src/store.ts#L8850) `Store/containerInfo` | `SQLite.get` (8850); `SQLite.prepare` (8850); `Store.sql` (8850) | CORE |
| [packages/store/src/store.ts:8814](../../packages/store/src/store.ts#L8814) `Store/containerIntact` | `SQLite.get` (8814); `SQLite.prepare` (8814); `Store.sql` (8814) | CORE |
| [packages/store/src/store.ts:8753](../../packages/store/src/store.ts#L8753) `Store/containerIntegrityReport` | `SQLite.all` (8753); `SQLite.prepare` (8753, 8764); `Store.sql` (8753, 8764); `SQLite.get` (8764) | CORE |
| [packages/store/src/store.ts:8828](../../packages/store/src/store.ts#L8828) `Store/containerMeta` | `SQLite.get` (8828); `SQLite.prepare` (8828); `Store.sql` (8828) | CORE |
| [packages/store/src/store.ts:8884](../../packages/store/src/store.ts#L8884) `Store/containerRange` | `SQLite.all` (8884); `SQLite.prepare` (8884, 8891); `Store.sql` (8884, 8891); `SQLite.get` (8891) | CORE |
| [packages/store/src/store.ts:8655](../../packages/store/src/store.ts#L8655) `Store/containerReferences` | `SQLite.all` (8655, 8674, 8676, 8682, 8695, 8706, 8720); `SQLite.prepare` (8655, 8674, 8676, 8682, 8695, 8706, 8718, 8720); `Store.sql` (8655, 8674, 8676, 8682, 8695, 8706, 8718, 8720); `SQLite.get` (8718); `Store.row` (8729) | CORE |
| [packages/store/src/store.ts:11223](../../packages/store/src/store.ts#L11223) `Store/countIds` | `Store.countIds` (11223); `SQLite.get` (11228); `SQLite.prepare` (11228); `Store.sql` (11228) | GATED-STORE |
| [packages/store/src/store.ts:10050](../../packages/store/src/store.ts#L10050) `Store/create` | `SQLite.get` (10050); `SQLite.prepare` (10050, 10063); `Store.sql` (10050, 10063) | CORE |
| [packages/store/src/store.ts:4356](../../packages/store/src/store.ts#L4356) `Store/createAccountOnly` | `SQLite.get` (4356); `SQLite.prepare` (4356, 4360, 4366, 4371, 4376); `Store.sql` (4356, 4360, 4366, 4371, 4376) | CORE |
| [packages/store/src/store.ts:5861](../../packages/store/src/store.ts#L5861) `Store/createApiToken` | `SQLite.get` (5861, 5889); `SQLite.prepare` (5861, 5888, 5889, 5899); `Store.sql` (5861, 5888, 5889, 5899) | CORE |
| [packages/store/src/store.ts:5367](../../packages/store/src/store.ts#L5367) `Store/createLocalAccount` | `SQLite.prepare` (5367); `Store.sql` (5367) | CORE |
| [packages/store/src/store.ts:3956](../../packages/store/src/store.ts#L3956) `Store/credentialIdentity` | `SQLite.get` (3956); `SQLite.prepare` (3956); `Store.sql` (3956) | CORE |
| [packages/store/src/store.ts:5782](../../packages/store/src/store.ts#L5782) `Store/credentialStamp` | `SQLite.get` (5782); `SQLite.prepare` (5782); `Store.sql` (5782) | CORE |
| [packages/store/src/store.ts:7387](../../packages/store/src/store.ts#L7387) `Store/crossFileBusy` | `Store.sql` (7387) | AUTH |
| [packages/store/src/store.ts:7359](../../packages/store/src/store.ts#L7359) `Store/crossFileHash` | `SQLite.get` (7359); `SQLite.prepare` (7359); `Store.sql` (7359) | AUTH |
| [packages/store/src/store.ts:2315](../../packages/store/src/store.ts#L2315) `Store/dataVersion` | `SQLite.get` (2315); `SQLite.prepare` (2315); `Store.sql` (2315) | CORE |
| [packages/store/src/store.ts:11791](../../packages/store/src/store.ts#L11791) `Store/decimalViewSql` | `SQLite.all` (11791); `SQLite.prepare` (11791) | CORE |
| [packages/store/src/store.ts:10780](../../packages/store/src/store.ts#L10780) `Store/delete` | `Store.row` (10780) | CORE |
| [packages/store/src/store.ts:10788](../../packages/store/src/store.ts#L10788) `Store/delete/run` | `SQLite.get` (10788); `SQLite.prepare` (10788, 10793); `Store.sql` (10788, 10793) | CORE |
| [packages/store/src/store.ts:5521](../../packages/store/src/store.ts#L5521) `Store/deleteAccount` | `SQLite.prepare` (5521, 5525, 5526, 5527, 5528, 5529, 5530, 5531, 5532, 5539, 5541, 5543, 5545, 5549); `Store.sql` (5521, 5525, 5526, 5527, 5528, 5529, 5530, 5531, 5532, 5539, 5541, 5543, 5545, 5549) | CORE |
| [packages/store/src/store.ts:10864](../../packages/store/src/store.ts#L10864) `Store/deleteBeingUndone` | `SQLite.all` (10864); `SQLite.prepare` (10864); `Store.sql` (10864) | CORE |
| [packages/store/src/store.ts:3592](../../packages/store/src/store.ts#L3592) `Store/deletedRows` | `SQLite.get` (3592); `SQLite.prepare` (3592, 3594, 3594); `Store.sql` (3592, 3594, 3594); `SQLite.all` (3594, 3594) | CORE |
| [packages/store/src/store.ts:10876](../../packages/store/src/store.ts#L10876) `Store/deleteEndingTheLifeAt` | `SQLite.get` (10876); `SQLite.prepare` (10876); `Store.sql` (10876) | CORE |
| [packages/store/src/store.ts:6573](../../packages/store/src/store.ts#L6573) `Store/deletePrivilegeSet` | `SQLite.prepare` (6573); `Store.sql` (6573) | CORE |
| [packages/store/src/store.ts:4494](../../packages/store/src/store.ts#L4494) `Store/deleteScriptTest` | `SQLite.prepare` (4494); `Store.sql` (4494) | CORE |
| [packages/store/src/store.ts:10765](../../packages/store/src/store.ts#L10765) `Store/deleteVisibility` | `Store.canViewRecord` (10765) | CORE |
| [packages/store/src/store.ts:7496](../../packages/store/src/store.ts#L7496) `Store/design` | `SQLite.get` (7496) | CORE |
| [packages/store/src/store.ts:3702](../../packages/store/src/store.ts#L3702) `Store/designEffect` | `Store.sql` (3702, 3703, 3709, 3710, 3713, 3719, 3724, 3727, 3733, 3744, 3745, 3747, 3748, 3761, 3762, 3765, 3767, 3773, 3774, 3775, 3781, 3783, 3787, 3790, 3791, 3793, 3796, 3802, 3804, 3811, 3812, 3814, 3815, 3816, 3817, 3824, 3825, 3827, 3827, 3829, 3830, 3831, 3835, 3839, 3841, 3879, 3881, 3883); `SQLite.prepare` (3713, 3744, 3745, 3761, 3762, 3773, 3774, 3781, 3783, 3787, 3791, 3802, 3804, 3817, 3824, 3825, 3827, 3829, 3831, 3835, 3839); `SQLite.get` (3744, 3761, 3773, 3774, 3787, 3791, 3827, 3835); `SQLite.all` (3824, 3825); `SQLite.iterate` (3829) | CORE |
| [packages/store/src/store.ts:3695](../../packages/store/src/store.ts#L3695) `Store/designEffect/renameExcluded` | `SQLite.prepare` (3695); `Store.sql` (3695) | CORE |
| [packages/store/src/store.ts:3679](../../packages/store/src/store.ts#L3679) `Store/designEffect/renameKey` | `SQLite.prepare` (3679); `Store.sql` (3679) | CORE |
| [packages/store/src/store.ts:3633](../../packages/store/src/store.ts#L3633) `Store/designHistory` | `SQLite.all` (3633); `SQLite.prepare` (3633); `Store.sql` (3633) | CORE |
| [packages/store/src/store.ts:6151](../../packages/store/src/store.ts#L6151) `Store/disableTotp` | `SQLite.prepare` (6151); `Store.sql` (6151) | CORE |
| [packages/store/src/store.ts:3891](../../packages/store/src/store.ts#L3891) `Store/dropColumnIndexes` | `SQLite.all` (3891, 3893); `SQLite.prepare` (3891, 3893); `Store.sql` (3891, 3893, 3894) | CORE |
| [packages/store/src/store.ts:9444](../../packages/store/src/store.ts#L9444) `Store/dropFieldIndex` | `SQLite.get` (9444); `SQLite.prepare` (9444); `Store.sql` (9444, 9445) | CORE |
| [packages/store/src/store.ts:10089](../../packages/store/src/store.ts#L10089) `Store/duplicate` | `Store.row` (10089); `SQLite.prepare` (10107); `Store.sql` (10107) | CORE |
| [packages/store/src/store.ts:9071](../../packages/store/src/store.ts#L9071) `Store/embeddedContainerCount` | `SQLite.prepare` (9071); `Store.sql` (9071); `SQLite.get` (9072) | CORE |
| [packages/store/src/store.ts:9057](../../packages/store/src/store.ts#L9057) `Store/embeddedContainers` | `SQLite.prepare` (9057, 9058); `Store.sql` (9057, 9058); `SQLite.all` (9058); `SQLite.get` (9062) | CORE |
| [packages/store/src/store.ts:3618](../../packages/store/src/store.ts#L3618) `Store/emptyDeleted` | `Store.sql` (3618, 3621, 3622, 3624, 3626); `SQLite.prepare` (3622) | CORE |
| [packages/store/src/store.ts:2191](../../packages/store/src/store.ts#L2191) `Store/endTransaction` | `Store.sql` (2191, 2194, 2194) | CORE |
| [packages/store/src/store.ts:6119](../../packages/store/src/store.ts#L6119) `Store/enrollTotp` | `SQLite.prepare` (6119); `Store.sql` (6119) | CORE |
| [packages/store/src/store.ts:3587](../../packages/store/src/store.ts#L3587) `Store/ensureDeleted` | `Store.sql` (3587) | CORE |
| [packages/store/src/store.ts:1601](../../packages/store/src/store.ts#L1601) `Store/ensureNativeIds` | `SQLite.all` (1601, 1613); `SQLite.prepare` (1601, 1604, 1612, 1613); `Store.sql` (1601, 1604, 1607, 1611, 1612, 1613, 1616, 1618) | CORE |
| [packages/store/src/store.ts:2437](../../packages/store/src/store.ts#L2437) `Store/ensureRecordIdHighWater` | `Store.sql` (2437, 2438, 2440, 2442, 2444) | CORE |
| [packages/store/src/store.ts:2456](../../packages/store/src/store.ts#L2456) `Store/ensureRecordIdMarks` | `SQLite.all` (2456, 2459, 2462, 2471); `SQLite.prepare` (2456, 2459, 2462, 2465, 2471, 2474); `Store.sql` (2456, 2459, 2462, 2465, 2471, 2474, 2478, 2479) | CORE |
| [packages/store/src/store.ts:10430](../../packages/store/src/store.ts#L10430) `Store/evaluateCurrent` | `Store.row` (10430, 10430, 10431, 10431); `Calculations.context` (10436); `Store.get` (10437, 10439) | GATED-STORE |
| [packages/store/src/store.ts:10471](../../packages/store/src/store.ts#L10471) `Store/evaluateEachCurrent` | `Store.row` (10471, 10471, 10476); `Calculations.context` (10477); `Store.get` (10479) | GATED-STORE |
| [packages/store/src/store.ts:10533](../../packages/store/src/store.ts#L10533) `Store/evaluateRowsCurrent` | `Store.row` (10533, 10533, 10534, 10534) | GATED-STORE |
| [packages/store/src/store.ts:10512](../../packages/store/src/store.ts#L10512) `Store/evaluateRowsCurrent/each` | `Calculations.context` (10512); `Store.get` (10514) | GATED-STORE |
| [packages/store/src/store.ts:10548](../../packages/store/src/store.ts#L10548) `Store/evaluateRowsCurrent/found/[Symbol.iterator]` | `rowsById` (10548) | GATED-STORE |
| [packages/store/src/store.ts:10570](../../packages/store/src/store.ts#L10570) `Store/evaluateRowsCurrent/key` | `Calculations.context` (10570) | GATED-STORE |
| [packages/store/src/store.ts:4272](../../packages/store/src/store.ts#L4272) `Store/externalAccount` | `SQLite.all` (4272); `SQLite.prepare` (4272); `Store.sql` (4272) | CORE |
| [packages/store/src/store.ts:8576](../../packages/store/src/store.ts#L8576) `Store/externalContainerCheck` | `SQLite.all` (8576); `SQLite.prepare` (8576); `Store.sql` (8576) | CORE |
| [packages/store/src/store.ts:8583](../../packages/store/src/store.ts#L8583) `Store/externalContainerCount` | `SQLite.get` (8583); `SQLite.prepare` (8583); `Store.sql` (8583) | CORE |
| [packages/store/src/store.ts:8592](../../packages/store/src/store.ts#L8592) `Store/externalContainerReport` | `SQLite.all` (8592, 8605); `SQLite.prepare` (8592, 8605); `Store.sql` (8592, 8605) | CORE |
| [packages/store/src/store.ts:5632](../../packages/store/src/store.ts#L5632) `Store/externalIdentityId` | `SQLite.get` (5632, 5639); `SQLite.prepare` (5632, 5638, 5639); `Store.sql` (5632, 5638, 5639) | CORE |
| [packages/store/src/store.ts:8824](../../packages/store/src/store.ts#L8824) `Store/externalOf` | `SQLite.get` (8824); `SQLite.prepare` (8824); `Store.sql` (8824) | CORE |
| [packages/store/src/store.ts:3368](../../packages/store/src/store.ts#L3368) `Store/failureAuditRoom` | `SQLite.get` (3368); `SQLite.prepare` (3368); `Store.sql` (3368) | CORE |
| [packages/store/src/store.ts:8223](../../packages/store/src/store.ts#L8223) `Store/fieldIndexCurrent` | `SQLite.iterate` (8223); `SQLite.prepare` (8223, 8228); `Store.sql` (8223, 8228); `SQLite.all` (8228) | GATED-STORE |
| [packages/store/src/store.ts:9484](../../packages/store/src/store.ts#L9484) `Store/find` | `Store.find` (9484) | GATED-STORE |
| [packages/store/src/store.ts:9856](../../packages/store/src/store.ts#L9856) `Store/findCandidates` | `Store.query` (9856) | CORE |
| [packages/store/src/store.ts:9495](../../packages/store/src/store.ts#L9495) `Store/findHere` | `Store.query` (9495, 9500, 9502, 9516, 9518, 9529); `Store.recordCount` (9513); `SQLite.get` (9514, 9518); `SQLite.prepare` (9514, 9518, 9524, 9531, 9540); `Store.sql` (9514, 9518, 9524, 9531, 9540); `SQLite.all` (9524, 9531, 9540) | GATED-STORE |
| [packages/store/src/store.ts:9535](../../packages/store/src/store.ts#L9535) `Store/findHere/[Symbol.iterator]` | `SQLite.iterate` (9535); `SQLite.prepare` (9535); `Store.sql` (9535) | GATED-STORE |
| [packages/store/src/store.ts:11356](../../packages/store/src/store.ts#L11356) `Store/findIdsCurrent` | `Store.findIds` (11356) | GATED-STORE |
| [packages/store/src/store.ts:11291](../../packages/store/src/store.ts#L11291) `Store/findIdsCurrentProgress` | `Store.findIdsProgress` (11291); `Store.query` (11293, 11295, 11308, 11310); `Store.recordCount` (11300, 11328); `SQLite.iterate` (11325); `SQLite.prepare` (11325, 11333, 11334); `Store.sql` (11325, 11333, 11334); `SQLite.get` (11337); `SQLite.all` (11343) | GATED-STORE |
| [packages/store/src/store.ts:11362](../../packages/store/src/store.ts#L11362) `Store/findIdsHere` | `Store.query` (11362, 11368, 11370); `SQLite.iterate` (11381); `SQLite.prepare` (11381); `Store.sql` (11381) | GATED-STORE |
| [packages/store/src/store.ts:9800](../../packages/store/src/store.ts#L9800) `Store/findSource` | `Store.query` (9800); `SQLite.all` (9809, 9826); `SQLite.prepare` (9809, 9817, 9825); `Store.sql` (9809, 9814, 9817, 9822, 9825, 9839, 9841); `Calculations.globalValue` (9831); `Calculations.unstoredValue` (9832); `Calculations.related` (9836) | CORE |
| [packages/store/src/store.ts:3480](../../packages/store/src/store.ts#L3480) `Store/flushDeferredSecurity` | `Store.sql` (3480) | CORE |
| [packages/store/src/store.ts:5488](../../packages/store/src/store.ts#L5488) `Store/forgetStandIns` | `SQLite.prepare` (5488); `Store.sql` (5488) | CORE |
| [packages/store/src/store.ts:10831](../../packages/store/src/store.ts#L10831) `Store/forgetStandInValues` | `Store.sql` (10831, 10852); `SQLite.prepare` (10852) | CORE |
| [packages/store/src/store.ts:8104](../../packages/store/src/store.ts#L8104) `Store/foundSetPage` | `rowsById` (8104) | CORE |
| [packages/store/src/store.ts:8120](../../packages/store/src/store.ts#L8120) `Store/foundSetRowsCurrent` | `Store.viewableIds` (8120); `Store.row` (8136) | GATED-STORE |
| [packages/store/src/store.ts:4190](../../packages/store/src/store.ts#L4190) `Store/gateAgentWrite` | `SQLite.get` (4190); `SQLite.prepare` (4190, 4192); `Store.sql` (4190, 4192) | CORE |
| [packages/store/src/store.ts:6426](../../packages/store/src/store.ts#L6426) `Store/generateRecoveryCodes` | `SQLite.prepare` (6426, 6429); `Store.sql` (6426, 6429) | CORE |
| [packages/store/src/store.ts:9929](../../packages/store/src/store.ts#L9929) `Store/getCurrent` | `Store.get` (9929); `Store.row` (9930, 9930, 9944); `SQLite.all` (9947); `SQLite.prepare` (9947); `Store.sql` (9947) | GATED-STORE |
| [packages/store/src/store.ts:9967](../../packages/store/src/store.ts#L9967) `Store/getManyCurrent` | `Store.getMany` (9967); `SQLite.get` (9985); `SQLite.prepare` (9985); `Store.sql` (9985) | GATED-STORE |
| [packages/store/src/store.ts:9978](../../packages/store/src/store.ts#L9978) `Store/getManyCurrent/[Symbol.iterator]` | `rowsById` (9978) | GATED-STORE |
| [packages/store/src/store.ts:1648](../../packages/store/src/store.ts#L1648) `Store/grantFullAccessClients` | `SQLite.prepare` (1648); `Store.sql` (1648) | CORE |
| [packages/store/src/store.ts:11398](../../packages/store/src/store.ts#L11398) `Store/groupSummariesCurrent` | `Store.groupSummaries` (11398); `Store.viewableIds` (11403); `Calculations.collect` (11419); `rowsById` (11419, 11469); `Calculations.collector` (11441) | GATED-STORE |
| [packages/store/src/store.ts:11467](../../packages/store/src/store.ts#L11467) `Store/groupSummariesCurrent/flush` | `Calculations.collector` (11467) | GATED-STORE |
| [packages/store/src/store.ts:11431](../../packages/store/src/store.ts#L11431) `Store/groupSummariesCurrent/key` | `Calculations.value` (11431); `Calculations.related` (11433) | GATED-STORE |
| [packages/store/src/store.ts:1675](../../packages/store/src/store.ts#L1675) `Store/hasOwnPassword` | `SQLite.get` (1675); `SQLite.prepare` (1675); `Store.sql` (1675) | CORE |
| [packages/store/src/store.ts:6281](../../packages/store/src/store.ts#L6281) `Store/hasPasskey` | `SQLite.get` (6281); `SQLite.prepare` (6281); `Store.sql` (6281) | CORE |
| [packages/store/src/store.ts:1656](../../packages/store/src/store.ts#L1656) `Store/hasProvingPassword` | `SQLite.get` (1656); `SQLite.prepare` (1656); `Store.sql` (1656) | CORE |
| [packages/store/src/store.ts:9398](../../packages/store/src/store.ts#L9398) `Store/hasTable` | `SQLite.get` (9398); `SQLite.prepare` (9398); `Store.sql` (9398) | CORE |
| [packages/store/src/store.ts:6140](../../packages/store/src/store.ts#L6140) `Store/hasTotp` | `SQLite.get` (6140); `SQLite.prepare` (6140); `Store.sql` (6140) | CORE |
| [packages/store/src/store.ts:5611](../../packages/store/src/store.ts#L5611) `Store/identityAllowed` | `SQLite.get` (5611, 5617, 5623); `SQLite.prepare` (5611, 5617, 5623); `Store.sql` (5611, 5617, 5623) | CORE |
| [packages/store/src/store.ts:7531](../../packages/store/src/store.ts#L7531) `Store/image` | `SQLite.get` (7531); `SQLite.prepare` (7531); `Store.sql` (7531) | CORE |
| [packages/store/src/store.ts:7541](../../packages/store/src/store.ts#L7541) `Store/images` | `SQLite.all` (7541); `SQLite.prepare` (7541); `Store.sql` (7541) | CORE |
| [packages/store/src/store.ts:5332](../../packages/store/src/store.ts#L5332) `Store/importAccounts` | `SQLite.all` (5332); `SQLite.prepare` (5332); `Store.sql` (5332) | CORE |
| [packages/store/src/store.ts:1990](../../packages/store/src/store.ts#L1990) `Store/independentWindowWrite` | `SQLite.get` (1990); `SQLite.prepare` (1990, 1998, 2059); `Store.sql` (1990, 1998, 2008, 2037, 2054, 2059, 2062); `SQLite.all` (1998); `Store.row` (2057) | CORE |
| [packages/store/src/store.ts:9410](../../packages/store/src/store.ts#L9410) `Store/indexedFields` | `SQLite.all` (9410, 9411); `SQLite.prepare` (9410, 9411); `Store.sql` (9410, 9411) | CORE |
| [packages/store/src/store.ts:11824](../../packages/store/src/store.ts#L11824) `Store/internalRoots` | `SQLite.get` (11824); `SQLite.prepare` (11824, 11826); `SQLite.all` (11826) | CORE |
| [packages/store/src/store.ts:3978](../../packages/store/src/store.ts#L3978) `Store/isAgent` | `SQLite.get` (3978); `SQLite.prepare` (3978); `Store.sql` (3978) | CORE |
| [packages/store/src/store.ts:4081](../../packages/store/src/store.ts#L4081) `Store/isExternal` | `SQLite.get` (4081); `SQLite.prepare` (4081); `Store.sql` (4081) | CORE |
| [packages/store/src/store.ts:6195](../../packages/store/src/store.ts#L6195) `Store/issueWebauthnChallenge` | `SQLite.prepare` (6195, 6197, 6198, 6200); `Store.sql` (6195, 6197, 6198, 6200); `SQLite.get` (6197) | CORE |
| [packages/store/src/store.ts:11685](../../packages/store/src/store.ts#L11685) `Store/iterateCommitted` | `SQLite.iterate` (11685) | CORE |
| [packages/store/src/store.ts:1929](../../packages/store/src/store.ts#L1929) `Store/joinTransaction` | `Store.sql` (1929, 1930, 1932, 1934, 1940, 1943) | CORE |
| [packages/store/src/store.ts:11064](../../packages/store/src/store.ts#L11064) `Store/keyStepWork` | `Store.sql` (11064, 11070, 11074, 11076) | CORE |
| [packages/store/src/store.ts:7347](../../packages/store/src/store.ts#L7347) `Store/knownSharedAccount` | `SQLite.get` (7347); `SQLite.prepare` (7347); `Store.sql` (7347) | CORE |
| [packages/store/src/store.ts:4805](../../packages/store/src/store.ts#L4805) `Store/lastSignIns` | `Store.auditLog` (4805) | CORE |
| [packages/store/src/store.ts:10882](../../packages/store/src/store.ts#L10882) `Store/latestDeleteSeq` | `SQLite.get` (10882); `SQLite.prepare` (10882); `Store.sql` (10882) | CORE |
| [packages/store/src/store.ts:7574](../../packages/store/src/store.ts#L7574) `Store/layout` | `SQLite.get` (7574); `SQLite.prepare` (7574); `Store.sql` (7574) | CORE |
| [packages/store/src/store.ts:3650](../../packages/store/src/store.ts#L3650) `Store/layoutHistory` | `SQLite.all` (3650); `SQLite.prepare` (3650); `Store.sql` (3650) | CORE |
| [packages/store/src/store.ts:7461](../../packages/store/src/store.ts#L7461) `Store/layouts` | `SQLite.all` (7461); `SQLite.prepare` (7461); `Store.sql` (7461) | CORE |
| [packages/store/src/store.ts:5105](../../packages/store/src/store.ts#L5105) `Store/leastPrivilege` | `SQLite.all` (5105); `SQLite.prepare` (5105); `Store.sql` (5105) | CORE |
| [packages/store/src/store.ts:5709](../../packages/store/src/store.ts#L5709) `Store/ledgerRow` | `SQLite.get` (5709, 5710); `SQLite.prepare` (5709, 5710); `Store.sql` (5709, 5710) | AUTH |
| [packages/store/src/store.ts:5721](../../packages/store/src/store.ts#L5721) `Store/ledgerWrite` | `Store.sql` (5721, 5722, 5724, 5726, 5729, 5729) | AUTH |
| [packages/store/src/store.ts:5415](../../packages/store/src/store.ts#L5415) `Store/limitAccountImport` | `SQLite.prepare` (5415, 5416, 5419); `Store.sql` (5415, 5416, 5419); `SQLite.get` (5416) | CORE |
| [packages/store/src/store.ts:3931](../../packages/store/src/store.ts#L3931) `Store/linkIdentity` | `SQLite.get` (3931); `SQLite.prepare` (3931); `Store.sql` (3931) | CORE |
| [packages/store/src/store.ts:3923](../../packages/store/src/store.ts#L3923) `Store/linkPrincipal` | `SQLite.get` (3923); `SQLite.prepare` (3923); `Store.sql` (3923) | CORE |
| [packages/store/src/store.ts:4691](../../packages/store/src/store.ts#L4691) `Store/markPiiField` | `SQLite.prepare` (4691); `Store.sql` (4691) | CORE |
| [packages/store/src/store.ts:8549](../../packages/store/src/store.ts#L8549) `Store/markRepeating` | `SQLite.prepare` (8549); `Store.sql` (8549) | CORE |
| [packages/store/src/store.ts:11616](../../packages/store/src/store.ts#L11616) `Store/matchIds` | `Store.matchIds` (11616); `SQLite.all` (11622); `SQLite.prepare` (11622); `Store.sql` (11622) | CORE |
| [packages/store/src/store.ts:1690](../../packages/store/src/store.ts#L1690) `Store/meta` | `SQLite.get` (1690); `SQLite.prepare` (1690); `Store.sql` (1690) | CORE |
| [packages/store/src/store.ts:1024](../../packages/store/src/store.ts#L1024) `Store/metadataVersions` | `SQLite.get` (1024); `SQLite.prepare` (1024); `Store.sql` (1024) | CORE |
| [packages/store/src/store.ts:9186](../../packages/store/src/store.ts#L9186) `Store/moveContainersIn` | `Store.sql` (9186, 9192, 9194, 9195, 9196, 9197, 9217, 9222, 9222, 9233, 9236, 9239, 9246); `SQLite.prepare` (9194, 9195, 9196, 9197, 9233, 9239); `SQLite.get` (9199, 9233, 9239) | CORE |
| [packages/store/src/store.ts:9108](../../packages/store/src/store.ts#L9108) `Store/moveContainersOut` | `Store.sql` (9108, 9116, 9118, 9120, 9125, 9126, 9146, 9152, 9154, 9156, 9156, 9162, 9162, 9167, 9169, 9171, 9171, 9177); `SQLite.get` (9116); `SQLite.prepare` (9116, 9125, 9126); `Store.container` (9128) | CORE |
| [packages/store/src/store.ts:5286](../../packages/store/src/store.ts#L5286) `Store/mustChangePassword` | `SQLite.get` (5286); `SQLite.prepare` (5286); `Store.sql` (5286) | CORE |
| [packages/store/src/store.ts:1626](../../packages/store/src/store.ts#L1626) `Store/nativeIdGuards` | `Store.sql` (1626, 1627, 1629) | CORE |
| [packages/store/src/store.ts:2492](../../packages/store/src/store.ts#L2492) `Store/nextRecordId` | `SQLite.get` (2492); `SQLite.prepare` (2492); `Store.sql` (2492) | CORE |
| [packages/store/src/store.ts:6015](../../packages/store/src/store.ts#L6015) `Store/objectUseSince` | `SQLite.get` (6015); `SQLite.prepare` (6015); `Store.sql` (6015) | CORE |
| [packages/store/src/store.ts:9370](../../packages/store/src/store.ts#L9370) `Store/orderBy` | `Store.valueListItems` (9370) | CORE |
| [packages/store/src/store.ts:8741](../../packages/store/src/store.ts#L8741) `Store/orphanContainerReport` | `SQLite.all` (8741); `SQLite.prepare` (8741); `Store.sql` (8741) | CORE |
| [packages/store/src/store.ts:6247](../../packages/store/src/store.ts#L6247) `Store/passkeyAllowList` | `SQLite.all` (6247); `SQLite.prepare` (6247); `Store.sql` (6247) | CORE |
| [packages/store/src/store.ts:6286](../../packages/store/src/store.ts#L6286) `Store/passkeyIds` | `SQLite.all` (6286); `SQLite.prepare` (6286); `Store.sql` (6286) | CORE |
| [packages/store/src/store.ts:6274](../../packages/store/src/store.ts#L6274) `Store/passkeys` | `SQLite.all` (6274); `SQLite.prepare` (6274); `Store.sql` (6274) | CORE |
| [packages/store/src/store.ts:5325](../../packages/store/src/store.ts#L5325) `Store/passwordDaysRemaining` | `SQLite.get` (5325); `SQLite.prepare` (5325); `Store.sql` (5325) | CORE |
| [packages/store/src/store.ts:7305](../../packages/store/src/store.ts#L7305) `Store/passwordState` | `SQLite.get` (7305); `SQLite.prepare` (7305); `Store.sql` (7305) | CORE |
| [packages/store/src/store.ts:4214](../../packages/store/src/store.ts#L4214) `Store/pendingChanges` | `SQLite.all` (4214); `SQLite.prepare` (4214); `Store.sql` (4214) | CORE |
| [packages/store/src/store.ts:1708](../../packages/store/src/store.ts#L1708) `Store/persistentData` | `SQLite.get` (1708) | CORE |
| [packages/store/src/store.ts:1717](../../packages/store/src/store.ts#L1717) `Store/persistentDataIds` | `SQLite.all` (1717) | CORE |
| [packages/store/src/store.ts:1698](../../packages/store/src/store.ts#L1698) `Store/persistentTable` | `Store.sql` (1698) | CORE |
| [packages/store/src/store.ts:10722](../../packages/store/src/store.ts#L10722) `Store/portalContainerTarget` | `Store.row` (10722); `relatedIdList` (10724) | CORE |
| [packages/store/src/store.ts:8159](../../packages/store/src/store.ts#L8159) `Store/portalCountsCurrent` | `Store.canView` (8159); `Store.row` (8186) | GATED-STORE |
| [packages/store/src/store.ts:8404](../../packages/store/src/store.ts#L8404) `Store/portalRows` | `relatedRows` (8404); `relatedIdList` (8405); `Store.viewableSet` (8408); `rowsById` (8433, 8471); `Calculations.related` (8447) | CORE |
| [packages/store/src/store.ts:8415](../../packages/store/src/store.ts#L8415) `Store/portalRows/context` | `Calculations.context` (8415) | CORE |
| [packages/store/src/store.ts:8425](../../packages/store/src/store.ts#L8425) `Store/portalRows/valueOf` | `Calculations.value` (8425) | CORE |
| [packages/store/src/store.ts:2870](../../packages/store/src/store.ts#L2870) `Store/prepared` | `SQLite.prepare` (2870); `Store.sql` (2870) | CORE |
| [packages/store/src/store.ts:5397](../../packages/store/src/store.ts#L5397) `Store/previewAccountImport` | `Store.sql` (5397, 5398, 5407) | CORE |
| [packages/store/src/store.ts:7103](../../packages/store/src/store.ts#L7103) `Store/previewRecordRuleCurrent` | `SQLite.get` (7103); `SQLite.prepare` (7103, 7106); `Store.sql` (7103, 7106); `SQLite.all` (7106); `Calculations.context` (7112, 7128) | CORE |
| [packages/store/src/store.ts:9891](../../packages/store/src/store.ts#L9891) `Store/previewRow` | `Store.row` (9891) | CORE |
| [packages/store/src/store.ts:6501](../../packages/store/src/store.ts#L6501) `Store/privilegeSets` | `Store.sql` (6501) | CORE |
| [packages/store/src/store.ts:3107](../../packages/store/src/store.ts#L3107) `Store/pruneAudit` | `Store.sql` (3107, 3110, 3115, 3117, 3125, 3130, 3132); `SQLite.get` (3115, 3128, 3132); `SQLite.prepare` (3115, 3125, 3132) | CORE |
| [packages/store/src/store.ts:8776](../../packages/store/src/store.ts#L8776) `Store/purgeOrphanContainers` | `Store.sql` (8776, 8780, 8789, 8792, 8793, 8798, 8799, 8801, 8801); `Store.orphanContainerReport` (8784); `SQLite.get` (8789); `SQLite.prepare` (8789, 8792, 8793) | CORE |
| [packages/store/src/store.ts:11947](../../packages/store/src/store.ts#L11947) `Store/query` | `SQLite.iterate` (11947) | CORE |
| [packages/store/src/store.ts:11987](../../packages/store/src/store.ts#L11987) `Store/queryWithOriginsCurrent` | `SQLite.iterate` (11987); `SQLite.all` (11996, 11999); `SQLite.prepare` (11996, 11999) | CORE |
| [packages/store/src/store.ts:11736](../../packages/store/src/store.ts#L11736) `Store/readOnlyChecked` | `SQLite.prepare` (11736, 11740, 11749, 11754); `SQLite.all` (11740, 11749, 11754) | CORE |
| [packages/store/src/store.ts:3903](../../packages/store/src/store.ts#L3903) `Store/recompute` | `SQLite.prepare` (3903, 3907); `Store.sql` (3903, 3907); `SQLite.iterate` (3907); `Calculations.computeStoredStyled` (3908); `Calculations.value` (3908) | CORE |
| [packages/store/src/store.ts:2885](../../packages/store/src/store.ts#L2885) `Store/recordAsOf` | `SQLite.get` (2885, 2887); `SQLite.prepare` (2885, 2887, 2889, 2890); `Store.sql` (2885, 2887, 2889, 2890); `SQLite.all` (2889, 2890) | CORE |
| [packages/store/src/store.ts:2579](../../packages/store/src/store.ts#L2579) `Store/recordCount` | `SQLite.get` (2579); `SQLite.prepare` (2579); `Store.sql` (2579) | CORE |
| [packages/store/src/store.ts:1755](../../packages/store/src/store.ts#L1755) `Store/recordedFormat` | `Store.sql` (1755) | CORE |
| [packages/store/src/store.ts:2962](../../packages/store/src/store.ts#L2962) `Store/recordLife` | `SQLite.all` (2962); `SQLite.prepare` (2962); `Store.sql` (2962) | CORE |
| [packages/store/src/store.ts:5946](../../packages/store/src/store.ts#L5946) `Store/recordObjectUse` | `Store.sql` (5946) | CORE |
| [packages/store/src/store.ts:10420](../../packages/store/src/store.ts#L10420) `Store/recordViewable` | `Store.row` (10420) | GATED-STORE |
| [packages/store/src/store.ts:9080](../../packages/store/src/store.ts#L9080) `Store/recoverContainersOut` | `SQLite.prepare` (9080); `Store.sql` (9080); `SQLite.get` (9083) | CORE |
| [packages/store/src/store.ts:1858](../../packages/store/src/store.ts#L1858) `Store/recoverPendingExternalFiles` | `Store.sql` (1858, 1860, 1884, 1886); `SQLite.prepare` (1860); `SQLite.get` (1871) | CORE |
| [packages/store/src/store.ts:6444](../../packages/store/src/store.ts#L6444) `Store/recoveryCodesRemaining` | `SQLite.get` (6444); `SQLite.prepare` (6444); `Store.sql` (6444) | CORE |
| [packages/store/src/store.ts:11776](../../packages/store/src/store.ts#L11776) `Store/refreshDecimalSqlViews` | `SQLite.get` (11776); `SQLite.prepare` (11776) | CORE |
| [packages/store/src/store.ts:4072](../../packages/store/src/store.ts#L4072) `Store/refuseLookalikeAccount` | `SQLite.all` (4072); `SQLite.prepare` (4072); `Store.sql` (4072) | CORE |
| [packages/store/src/store.ts:6310](../../packages/store/src/store.ts#L6310) `Store/registerPasskey` | `SQLite.prepare` (6310); `Store.sql` (6310) | CORE |
| [packages/store/src/store.ts:4250](../../packages/store/src/store.ts#L4250) `Store/rejectPending` | `SQLite.get` (4250); `SQLite.prepare` (4250, 4252); `Store.sql` (4250, 4252) | CORE |
| [packages/store/src/store.ts:9643](../../packages/store/src/store.ts#L9643) `Store/relatedCriteria` | `SQLite.iterate` (9643); `SQLite.prepare` (9643); `Store.sql` (9643) | CORE |
| [packages/store/src/store.ts:9640](../../packages/store/src/store.ts#L9640) `Store/relatedCriteria/matched` | `relatedRows` (9640) | CORE |
| [packages/store/src/store.ts:7914](../../packages/store/src/store.ts#L7914) `Store/relatedValues` | `Calculations.globalValue` (7914); `Calculations.unstoredValue` (7916) | CORE |
| [packages/store/src/store.ts:6323](../../packages/store/src/store.ts#L6323) `Store/removePasskey` | `SQLite.get` (6323); `SQLite.prepare` (6323, 6324); `Store.sql` (6323, 6324) | CORE |
| [packages/store/src/store.ts:9469](../../packages/store/src/store.ts#L9469) `Store/reportFind` | `Store.query` (9469, 9471, 9472); `Store.recordCount` (9474) | CORE |
| [packages/store/src/store.ts:10902](../../packages/store/src/store.ts#L10902) `Store/restoreDeletedRowLocked` | `SQLite.get` (10902, 10907); `SQLite.prepare` (10902, 10903, 10907, 10917); `Store.sql` (10902, 10903, 10907, 10917); `SQLite.all` (10903) | CORE |
| [packages/store/src/store.ts:2920](../../packages/store/src/store.ts#L2920) `Store/restoreRecord` | `Store.recordAsOf` (2920); `SQLite.get` (2924); `SQLite.prepare` (2924, 2929, 2938, 2949); `Store.sql` (2924, 2929, 2938, 2949) | CORE |
| [packages/store/src/store.ts:2978](../../packages/store/src/store.ts#L2978) `Store/revertAuditEntry` | `SQLite.get` (2978); `SQLite.prepare` (2978); `Store.sql` (2978); `Store.canViewRecord` (2980); `Store.auditLog` (2983) | CORE |
| [packages/store/src/store.ts:6071](../../packages/store/src/store.ts#L6071) `Store/revokeApiToken` | `SQLite.prepare` (6071); `Store.sql` (6071) | CORE |
| [packages/store/src/store.ts:5594](../../packages/store/src/store.ts#L5594) `Store/revokeSignInCredentials` | `SQLite.prepare` (5594, 5595, 5596); `Store.sql` (5594, 5595, 5596) | AUTH |
| [packages/store/src/store.ts:9910](../../packages/store/src/store.ts#L9910) `Store/row` | `SQLite.get` (9910) | CORE |
| [packages/store/src/store.ts:11880](../../packages/store/src/store.ts#L11880) `Store/rowsOf` | `SQLite.iterate` (11880, 11889) | CORE |
| [packages/store/src/store.ts:6908](../../packages/store/src/store.ts#L6908) `Store/ruleOutcome` | `Calculations.context` (6908) | CORE |
| [packages/store/src/store.ts:9754](../../packages/store/src/store.ts#L9754) `Store/runningSummaryValues` | `Store.viewableIds` (9754); `rowsById` (9756); `Calculations.value` (9767, 9773); `Calculations.related` (9784) | GATED-STORE |
| [packages/store/src/store.ts:6530](../../packages/store/src/store.ts#L6530) `Store/savePrivilegeSet` | `SQLite.prepare` (6530, 6538); `Store.sql` (6530, 6538) | AUTH |
| [packages/store/src/store.ts:4485](../../packages/store/src/store.ts#L4485) `Store/saveScriptTest` | `SQLite.prepare` (4485); `Store.sql` (4485) | CORE |
| [packages/store/src/store.ts:7068](../../packages/store/src/store.ts#L7068) `Store/scopedTableSql` | `Store.viewableIds` (7068); `SQLite.all` (7071); `SQLite.prepare` (7071); `Store.sql` (7071) | GATED-STORE |
| [packages/store/src/store.ts:3640](../../packages/store/src/store.ts#L3640) `Store/scriptHistory` | `SQLite.all` (3640); `SQLite.prepare` (3640); `Store.sql` (3640) | CORE |
| [packages/store/src/store.ts:1834](../../packages/store/src/store.ts#L1834) `Store/securityChainHeadAudit` | `SQLite.get` (1834); `SQLite.prepare` (1834); `Store.sql` (1834) | CORE |
| [packages/store/src/store.ts:3313](../../packages/store/src/store.ts#L3313) `Store/securityChange` | `Store.sql` (3313, 3315); `SQLite.prepare` (3315) | CORE |
| [packages/store/src/store.ts:2844](../../packages/store/src/store.ts#L2844) `Store/securityEvents` | `Store.auditLog` (2844) | CORE |
| [packages/store/src/store.ts:5795](../../packages/store/src/store.ts#L5795) `Store/securityToken` | `SQLite.get` (5795); `SQLite.prepare` (5795); `Store.sql` (5795) | CORE |
| [packages/store/src/store.ts:11910](../../packages/store/src/store.ts#L11910) `Store/selectHeldCurrent` | `Store.sql` (11910, 11912, 11915); `SQLite.prepare` (11912) | CORE |
| [packages/store/src/store.ts:11208](../../packages/store/src/store.ts#L11208) `Store/selectIdsCurrent` | `Store.selectIds` (11208); `SQLite.all` (11215); `SQLite.prepare` (11215); `Store.sql` (11215) | GATED-STORE |
| [packages/store/src/store.ts:11900](../../packages/store/src/store.ts#L11900) `Store/selectIn` | `Store.select` (11900) | CORE |
| [packages/store/src/store.ts:2245](../../packages/store/src/store.ts#L2245) `Store/selfContainedCopy` | `Store.sql` (2245); `SQLite.all` (2250); `SQLite.prepare` (2250, 2252, 2253, 2254) | CORE |
| [packages/store/src/store.ts:5573](../../packages/store/src/store.ts#L5573) `Store/setAccountActive` | `SQLite.prepare` (5573, 5581, 5582); `Store.sql` (5573, 5581, 5582) | AUTH |
| [packages/store/src/store.ts:5814](../../packages/store/src/store.ts#L5814) `Store/setAccountLocalOnly` | `SQLite.prepare` (5814); `Store.sql` (5814) | CORE |
| [packages/store/src/store.ts:6686](../../packages/store/src/store.ts#L6686) `Store/setAccountPrivilegeSet` | `SQLite.get` (6686); `SQLite.prepare` (6686, 6689, 6693); `Store.sql` (6686, 6689, 6693) | AUTH |
| [packages/store/src/store.ts:5823](../../packages/store/src/store.ts#L5823) `Store/setAccountRequire2fa` | `SQLite.prepare` (5823); `Store.sql` (5823) | CORE |
| [packages/store/src/store.ts:4102](../../packages/store/src/store.ts#L4102) `Store/setAgentAccount` | `SQLite.get` (4102); `SQLite.prepare` (4102, 4108); `Store.sql` (4102, 4108) | CORE |
| [packages/store/src/store.ts:4564](../../packages/store/src/store.ts#L4564) `Store/setAiAllowed` | `SQLite.prepare` (4564); `Store.sql` (4564) | CORE |
| [packages/store/src/store.ts:4649](../../packages/store/src/store.ts#L4649) `Store/setAiPolicy` | `SQLite.prepare` (4649); `Store.sql` (4649) | CORE |
| [packages/store/src/store.ts:7334](../../packages/store/src/store.ts#L7334) `Store/setAllowBlankPasswordFromLan` | `SQLite.prepare` (7334); `Store.sql` (7334) | CORE |
| [packages/store/src/store.ts:3084](../../packages/store/src/store.ts#L3084) `Store/setAuditSettings` | `SQLite.prepare` (3084); `Store.sql` (3084) | CORE |
| [packages/store/src/store.ts:9299](../../packages/store/src/store.ts#L9299) `Store/setContainer` | `Store.sql` (9299); `Store.row` (9305) | CORE |
| [packages/store/src/store.ts:4054](../../packages/store/src/store.ts#L4054) `Store/setExternalAccount` | `SQLite.get` (4054); `SQLite.prepare` (4054, 4059); `Store.sql` (4054, 4059) | CORE |
| [packages/store/src/store.ts:5272](../../packages/store/src/store.ts#L5272) `Store/setMustChangePassword` | `SQLite.prepare` (5272); `Store.sql` (5272) | CORE |
| [packages/store/src/store.ts:4309](../../packages/store/src/store.ts#L4309) `Store/setPasswordOnly` | `SQLite.get` (4309); `SQLite.prepare` (4309, 4315, 4324, 4331, 4332, 4333); `Store.sql` (4309, 4315, 4324, 4331, 4332, 4333) | AUTH |
| [packages/store/src/store.ts:4426](../../packages/store/src/store.ts#L4426) `Store/setPasswordPolicy` | `SQLite.prepare` (4426); `Store.sql` (4426) | CORE |
| [packages/store/src/store.ts:1723](../../packages/store/src/store.ts#L1723) `Store/setPersistentData` | `SQLite.prepare` (1723, 1727); `Store.sql` (1723, 1727) | CORE |
| [packages/store/src/store.ts:4669](../../packages/store/src/store.ts#L4669) `Store/setPiiIsolation` | `SQLite.prepare` (4669); `Store.sql` (4669) | CORE |
| [packages/store/src/store.ts:4462](../../packages/store/src/store.ts#L4462) `Store/setRequireTotpForFullAccess` | `SQLite.prepare` (4462); `Store.sql` (4462) | CORE |
| [packages/store/src/store.ts:4581](../../packages/store/src/store.ts#L4581) `Store/setScriptNetwork` | `SQLite.prepare` (4581); `Store.sql` (4581) | CORE |
| [packages/store/src/store.ts:4638](../../packages/store/src/store.ts#L4638) `Store/setSqlRequiresFmxdbc` | `SQLite.prepare` (4638); `Store.sql` (4638) | CORE |
| [packages/store/src/store.ts:10341](../../packages/store/src/store.ts#L10341) `Store/setStoredCalcValues` | `SQLite.prepare` (10341, 10342); `Store.sql` (10341, 10342); `SQLite.get` (10346) | CORE |
| [packages/store/src/store.ts:5748](../../packages/store/src/store.ts#L5748) `Store/settleSignIns` | `SQLite.all` (5748, 5754); `SQLite.prepare` (5748, 5754, 5760, 5764, 5766); `Store.sql` (5748, 5754, 5760, 5764, 5766) | AUTH |
| [packages/store/src/store.ts:9402](../../packages/store/src/store.ts#L9402) `Store/setUserPref` | `Store.sql` (9402, 9403, 9404); `SQLite.prepare` (9403, 9404) | CORE |
| [packages/store/src/store.ts:4622](../../packages/store/src/store.ts#L4622) `Store/setWebViewerHosts` | `SQLite.prepare` (4622); `Store.sql` (4622) | CORE |
| [packages/store/src/store.ts:2376](../../packages/store/src/store.ts#L2376) `Store/shareResults` | `Store.sql` (2376) | CORE |
| [packages/store/src/store.ts:1785](../../packages/store/src/store.ts#L1785) `Store/shipWal` | `Store.sql` (1785) | CORE |
| [packages/store/src/store.ts:5695](../../packages/store/src/store.ts#L5695) `Store/signInBase` | `SQLite.get` (5695); `SQLite.prepare` (5695); `Store.sql` (5695) | AUTH |
| [packages/store/src/store.ts:5697](../../packages/store/src/store.ts#L5697) `Store/signInBase/identity` | `SQLite.get` (5697); `SQLite.prepare` (5697); `Store.sql` (5697) | AUTH |
| [packages/store/src/store.ts:5684](../../packages/store/src/store.ts#L5684) `Store/signInMark` | `SQLite.prepare` (5684); `Store.sql` (5684) | AUTH |
| [packages/store/src/store.ts:9568](../../packages/store/src/store.ts#L9568) `Store/sortedPage` | `SQLite.iterate` (9568); `SQLite.prepare` (9568, 9583); `Store.sql` (9568, 9583); `SQLite.all` (9583) | CORE |
| [packages/store/src/store.ts:11510](../../packages/store/src/store.ts#L11510) `Store/sortIdsCurrentProgress` | `Store.sortIds` (11510); `Store.sortIdsProgress` (11510); `SQLite.all` (11523); `SQLite.prepare` (11523, 11602); `Store.sql` (11523, 11602); `Store.valueListItems` (11531); `rowsById` (11543); `Calculations.globalValue` (11546); `Calculations.unstoredValue` (11547); `Calculations.related` (11553); `SQLite.iterate` (11602) | GATED-STORE |
| [packages/store/src/store.ts:11690](../../packages/store/src/store.ts#L11690) `Store/storedFileId` | `SQLite.get` (11690); `SQLite.prepare` (11690) | CORE |
| [packages/store/src/store.ts:9716](../../packages/store/src/store.ts#L9716) `Store/summaries` | `Calculations.wholeTable` (9716); `Calculations.collect` (9736, 9741) | CORE |
| [packages/store/src/store.ts:9732](../../packages/store/src/store.ts#L9732) `Store/summaries/recs` | `SQLite.iterate` (9732); `SQLite.prepare` (9732); `Store.sql` (9732) | CORE |
| [packages/store/src/store.ts:6261](../../packages/store/src/store.ts#L6261) `Store/takeWebauthnChallenge` | `SQLite.get` (6261); `SQLite.prepare` (6261, 6265); `Store.sql` (6261, 6265) | CORE |
| [packages/store/src/store.ts:7518](../../packages/store/src/store.ts#L7518) `Store/themes` | `SQLite.get` (7518) | CORE |
| [packages/store/src/store.ts:9455](../../packages/store/src/store.ts#L9455) `Store/timeFind` | `Store.query` (9455) | CORE |
| [packages/store/src/store.ts:7853](../../packages/store/src/store.ts#L7853) `Store/toRecord` | `Calculations.value` (7853, 7863); `Calculations.globalValue` (7857); `Calculations.unstoredStyled` (7862) | CORE |
| [packages/store/src/store.ts:6145](../../packages/store/src/store.ts#L6145) `Store/totpAccounts` | `SQLite.all` (6145); `SQLite.prepare` (6145); `Store.sql` (6145) | CORE |
| [packages/store/src/store.ts:1797](../../packages/store/src/store.ts#L1797) `Store/trial` | `Store.sql` (1797) | CORE |
| [packages/store/src/store.ts:1802](../../packages/store/src/store.ts#L1802) `Store/trial/undo` | `Store.sql` (1802) | CORE |
| [packages/store/src/store.ts:11646](../../packages/store/src/store.ts#L11646) `Store/truncate/run` | `Store.sql` (11646, 11648, 11655, 11657, 11659, 11660); `SQLite.prepare` (11648, 11655); `SQLite.all` (11650) | CORE |
| [packages/store/src/store.ts:4001](../../packages/store/src/store.ts#L4001) `Store/unmigratedAccounts` | `SQLite.all` (4001); `SQLite.prepare` (4001); `Store.sql` (4001) | CORE |
| [packages/store/src/store.ts:5178](../../packages/store/src/store.ts#L5178) `Store/unusedAccess` | `SQLite.get` (5178); `SQLite.prepare` (5178, 5187); `Store.sql` (5178, 5187); `SQLite.all` (5187) | CORE |
| [packages/store/src/store.ts:5226](../../packages/store/src/store.ts#L5226) `Store/unusedObjects` | `SQLite.get` (5226); `SQLite.prepare` (5226, 5229); `Store.sql` (5226, 5229); `SQLite.all` (5229) | CORE |
| [packages/store/src/store.ts:6385](../../packages/store/src/store.ts#L6385) `Store/unusedRecoveryHashes` | `SQLite.all` (6385); `SQLite.prepare` (6385); `Store.sql` (6385) | CORE |
| [packages/store/src/store.ts:5008](../../packages/store/src/store.ts#L5008) `Store/unusualAccess` | `Store.auditLog` (5008, 5074) | CORE |
| [packages/store/src/store.ts:10155](../../packages/store/src/store.ts#L10155) `Store/update` | `Store.row` (10155); `Store.sql` (10186, 10187, 10233, 10236) | CORE |
| [packages/store/src/store.ts:10189](../../packages/store/src/store.ts#L10189) `Store/update/undo` | `Store.sql` (10189) | CORE |
| [packages/store/src/store.ts:10626](../../packages/store/src/store.ts#L10626) `Store/updatePortals` | `Store.row` (10626, 10663); `relatedRows` (10664) | CORE |
| [packages/store/src/store.ts:10636](../../packages/store/src/store.ts#L10636) `Store/updatePortals/portal/related` | `relatedIdList` (10636) | CORE |
| [packages/store/src/store.ts:10608](../../packages/store/src/store.ts#L10608) `Store/updateRelated` | `relatedRows` (10608) | CORE |
| [packages/store/src/store.ts:5264](../../packages/store/src/store.ts#L5264) `Store/usageCounting` | `SQLite.get` (5264); `SQLite.prepare` (5264); `Store.sql` (5264) | CORE |
| [packages/store/src/store.ts:9393](../../packages/store/src/store.ts#L9393) `Store/userPrefs` | `SQLite.all` (9393); `SQLite.prepare` (9393); `Store.sql` (9393) | CORE |
| [packages/store/src/store.ts:8275](../../packages/store/src/store.ts#L8275) `Store/valueListItemsCurrent` | `Store.valueListItems` (8275); `Store.get` (8289); `relatedRows` (8290); `Store.row` (8290); `SQLite.iterate` (8292); `SQLite.prepare` (8292); `Store.sql` (8292); `Calculations.related` (8302); `Calculations.value` (8306, 8307) | GATED-STORE |
| [packages/store/src/store.ts:10824](../../packages/store/src/store.ts#L10824) `Store/vaultHeld` | `SQLite.get` (10824); `SQLite.prepare` (10824); `Store.sql` (10824) | CORE |
| [packages/store/src/store.ts:6345](../../packages/store/src/store.ts#L6345) `Store/verifyPasskeyCredential` | `SQLite.get` (6345); `SQLite.prepare` (6345, 6357); `Store.sql` (6345, 6357) | CORE |
| [packages/store/src/store.ts:6174](../../packages/store/src/store.ts#L6174) `Store/verifyTotp` | `SQLite.get` (6174); `SQLite.prepare` (6174, 6181); `Store.sql` (6174, 6181) | CORE |
| [packages/store/src/store.ts:2512](../../packages/store/src/store.ts#L2512) `Store/versionNumber` | `SQLite.get` (2512); `SQLite.prepare` (2512); `Store.sql` (2512) | CORE |
| [packages/store/src/store.ts:2387](../../packages/store/src/store.ts#L2387) `Store/versionTriggers` | `SQLite.get` (2387); `SQLite.prepare` (2387, 2392, 2393); `Store.sql` (2387, 2392, 2393, 2410, 2412, 2413, 2415); `SQLite.all` (2392, 2393) | CORE |
| [packages/store/src/store.ts:2355](../../packages/store/src/store.ts#L2355) `Store/warmSummariesCurrent` | `Calculations.wholeTable` (2355) | CORE |
| [packages/store/src/store.ts:4604](../../packages/store/src/store.ts#L4604) `Store/webViewerChecked` | `SQLite.get` (4604); `SQLite.prepare` (4604); `Store.sql` (4604) | CORE |
| [packages/store/src/store.ts:2091](../../packages/store/src/store.ts#L2091) `Store/withWriteTransaction` | `Store.sql` (2091, 2104, 2111, 2116, 2116) | CORE |
| [packages/store/src/store.ts:7782](../../packages/store/src/store.ts#L7782) `Store/wordIndex` | `Store.sql` (7782, 7790, 7795); `Store.recordCount` (7794); `SQLite.get` (7795); `SQLite.prepare` (7795) | CORE |
| [packages/store/src/store.ts:8973](../../packages/store/src/store.ts#L8973) `Store/writeExternalFile` | `Store.evaluateEach` (8973); `SQLite.prepare` (8996); `Store.sql` (8996) | CORE |
| [packages/store/src/store.ts:8997](../../packages/store/src/store.ts#L8997) `Store/writeExternalFile/taken` | `SQLite.get` (8997) | CORE |
| [packages/store/src/store.ts:6004](../../packages/store/src/store.ts#L6004) `Store/writeObjectUseRows` | `SQLite.prepare` (6004, 6005, 6010); `Store.sql` (6004, 6005, 6010) | CORE |
| [packages/store/src/store.ts:2567](../../packages/store/src/store.ts#L2567) `Store/writeToken` | `SQLite.get` (2567); `SQLite.prepare` (2567); `Store.sql` (2567) | CORE |
| [packages/store/src/store.ts:5976](../../packages/store/src/store.ts#L5976) `Store/writeUsage` | `Store.sql` (5976, 5977, 5979, 5983, 5985) | CORE |
| [packages/store/src/store.ts:5992](../../packages/store/src/store.ts#L5992) `Store/writeUsageRows` | `SQLite.prepare` (5992, 5993, 5999); `Store.sql` (5992, 5993, 5999) | CORE |
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
