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
| [packages/server/src/admin.ts:2567](../../packages/server/src/admin.ts#L2567) `Admin/audit` | `Store.auditLog` (2567) | ADMIN |
| [packages/server/src/admin.ts:1190](../../packages/server/src/admin.ts#L1190) `Admin/handle` | `Store.externalContainerReport` (1190); `Store.orphanContainerReport` (1195, 1199) | ADMIN |
| [packages/server/src/admin.ts:3007](../../packages/server/src/admin.ts#L3007) `Admin/status` | `Store.externalContainerCount` (3007) | ADMIN |
| [packages/server/src/admin.ts:2650](../../packages/server/src/admin.ts#L2650) `Admin/viewAs` | `Store.find` (2650) | ADMIN |
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
| [packages/store/src/audit-anchor.ts:72](../../packages/store/src/audit-anchor.ts#L72) `checkAnchor` | `SQLite.get` (72, 75, 81, 86); `SQLite.prepare` (72, 75, 79, 86) | CORE |
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
| [packages/store/src/store.ts:5394](../../packages/store/src/store.ts#L5394) `Store/accountIdentityId` | `SQLite.get` (5394, 5400); `SQLite.prepare` (5394, 5399, 5400); `Store.sql` (5394, 5399, 5400) | CORE |
| [packages/store/src/store.ts:5388](../../packages/store/src/store.ts#L5388) `Store/accountIdentityIdIfSet` | `SQLite.get` (5388); `SQLite.prepare` (5388); `Store.sql` (5388) | CORE |
| [packages/store/src/store.ts:5350](../../packages/store/src/store.ts#L5350) `Store/accountInactive` | `SQLite.get` (5350); `SQLite.prepare` (5350); `Store.sql` (5350) | CORE |
| [packages/store/src/store.ts:5547](../../packages/store/src/store.ts#L5547) `Store/accountLocalOnly` | `SQLite.get` (5547); `SQLite.prepare` (5547); `Store.sql` (5547) | CORE |
| [packages/store/src/store.ts:6416](../../packages/store/src/store.ts#L6416) `Store/accountPrivilegeSet` | `SQLite.get` (6416); `SQLite.prepare` (6416); `Store.sql` (6416) | CORE |
| [packages/store/src/store.ts:5552](../../packages/store/src/store.ts#L5552) `Store/accountRequires2fa` | `SQLite.get` (5552); `SQLite.prepare` (5552); `Store.sql` (5552) | CORE |
| [packages/store/src/store.ts:3710](../../packages/store/src/store.ts#L3710) `Store/accounts` | `SQLite.all` (3710); `SQLite.prepare` (3710); `Store.sql` (3710) | CORE |
| [packages/store/src/store.ts:3706](../../packages/store/src/store.ts#L3706) `Store/accountsSharingLockout` | `SQLite.all` (3706); `SQLite.prepare` (3706); `Store.sql` (3706) | CORE |
| [packages/store/src/store.ts:5772](../../packages/store/src/store.ts#L5772) `Store/accountUsage` | `SQLite.get` (5772); `SQLite.prepare` (5772, 5773); `Store.sql` (5772, 5773); `SQLite.all` (5773); `Store.auditLog` (5789) | CORE |
| [packages/store/src/store.ts:8643](../../packages/store/src/store.ts#L8643) `Store/addContainer` | `SQLite.all` (8643); `SQLite.prepare` (8643, 8648, 8662, 8666, 8667); `Store.sql` (8643, 8648, 8662, 8664, 8666, 8667, 8669, 8672); `SQLite.get` (8653); `Store.containerRange` (8655) | CORE |
| [packages/store/src/store.ts:8689](../../packages/store/src/store.ts#L8689) `Store/addExternalContainer` | `SQLite.prepare` (8689); `Store.sql` (8689) | CORE |
| [packages/store/src/store.ts:9166](../../packages/store/src/store.ts#L9166) `Store/addFieldIndex` | `Store.sql` (9166) | CORE |
| [packages/store/src/store.ts:7298](../../packages/store/src/store.ts#L7298) `Store/addImage` | `Store.sql` (7298, 7299); `SQLite.prepare` (7299) | CORE |
| [packages/store/src/store.ts:6466](../../packages/store/src/store.ts#L6466) `Store/addProvisionedAccount` | `SQLite.get` (6466); `SQLite.prepare` (6466, 6470); `Store.sql` (6466, 6470) | CORE |
| [packages/store/src/store.ts:7748](../../packages/store/src/store.ts#L7748) `Store/addRelated` | `relatedRows` (7748); `rowsById` (7783); `firstRelatedEach` (7809) | CORE |
| [packages/store/src/store.ts:7736](../../packages/store/src/store.ts#L7736) `Store/addRelated/summaries` | `Calculations.summary` (7736) | CORE |
| [packages/store/src/store.ts:3728](../../packages/store/src/store.ts#L3728) `Store/agentNeedsApproval` | `SQLite.get` (3728); `SQLite.prepare` (3728); `Store.sql` (3728) | CORE |
| [packages/store/src/store.ts:6693](../../packages/store/src/store.ts#L6693) `Store/allowedIds` | `SQLite.iterate` (6693); `SQLite.prepare` (6693); `Store.sql` (6693) | CORE |
| [packages/store/src/store.ts:5829](../../packages/store/src/store.ts#L5829) `Store/apiToken` | `SQLite.get` (5829); `SQLite.prepare` (5829, 5847); `Store.sql` (5829, 5847) | CORE |
| [packages/store/src/store.ts:5805](../../packages/store/src/store.ts#L5805) `Store/apiTokens` | `SQLite.all` (5805); `SQLite.prepare` (5805); `Store.sql` (5805) | CORE |
| [packages/store/src/store.ts:4128](../../packages/store/src/store.ts#L4128) `Store/appendSecurityEvent` | `Store.sql` (4128) | CORE |
| [packages/store/src/store.ts:3169](../../packages/store/src/store.ts#L3169) `Store/appendSecurityRow` | `Store.sql` (3169) | CORE |
| [packages/store/src/store.ts:5170](../../packages/store/src/store.ts#L5170) `Store/applyAccountImport` | `Store.sql` (5170, 5178, 5207); `SQLite.get` (5178); `SQLite.prepare` (5178, 5207) | CORE |
| [packages/store/src/store.ts:2439](../../packages/store/src/store.ts#L2439) `Store/applyDesign` | `Store.sql` (2439, 2440, 2460, 2463, 2468, 2484, 2487, 2487); `SQLite.prepare` (2463, 2468) | CORE |
| [packages/store/src/store.ts:3972](../../packages/store/src/store.ts#L3972) `Store/approvePending` | `SQLite.get` (3972); `SQLite.prepare` (3972, 3984); `Store.sql` (3972, 3984) | CORE |
| [packages/store/src/store.ts:2960](../../packages/store/src/store.ts#L2960) `Store/audit/write` | `Store.sql` (2960) | CORE |
| [packages/store/src/store.ts:2551](../../packages/store/src/store.ts#L2551) `Store/auditLog` | `SQLite.all` (2551); `SQLite.prepare` (2551); `Store.sql` (2551) | CORE |
| [packages/store/src/store.ts:1974](../../packages/store/src/store.ts#L1974) `Store/backup` | `Store.sql` (1974) | CORE |
| [packages/store/src/store.ts:3734](../../packages/store/src/store.ts#L3734) `Store/blankPasswordAccounts` | `SQLite.all` (3734); `SQLite.prepare` (3734); `Store.sql` (3734) | CORE |
| [packages/store/src/store.ts:5099](../../packages/store/src/store.ts#L5099) `Store/canonicalAccount` | `SQLite.all` (5099); `SQLite.prepare` (5099); `Store.sql` (5099) | CORE |
| [packages/store/src/store.ts:9752](../../packages/store/src/store.ts#L9752) `Store/canView` | `Store.canView` (9752); `Store.row` (9753) | GATED-STORE |
| [packages/store/src/store.ts:9734](../../packages/store/src/store.ts#L9734) `Store/canViewRecord` | `SQLite.get` (9734); `SQLite.prepare` (9734); `Store.sql` (9734) | GATED-STORE |
| [packages/store/src/store.ts:10832](../../packages/store/src/store.ts#L10832) `Store/cascadeDelete` | `relatedRows` (10832) | CORE |
| [packages/store/src/store.ts:2274](../../packages/store/src/store.ts#L2274) `Store/changeOne` | `Store.sql` (2274, 2276) | CORE |
| [packages/store/src/store.ts:2277](../../packages/store/src/store.ts#L2277) `Store/changeOne/read` | `SQLite.get` (2277); `SQLite.prepare` (2277); `Store.sql` (2277) | CORE |
| [packages/store/src/store.ts:9024](../../packages/store/src/store.ts#L9024) `Store/checkContainerWrite` | `Store.row` (9024) | CORE |
| [packages/store/src/store.ts:10455](../../packages/store/src/store.ts#L10455) `Store/checkEditable` | `Store.row` (10455) | CORE |
| [packages/store/src/store.ts:1520](../../packages/store/src/store.ts#L1520) `Store/checkpoint` | `SQLite.get` (1520); `SQLite.prepare` (1520); `Store.sql` (1520) | CORE |
| [packages/store/src/store.ts:3871](../../packages/store/src/store.ts#L3871) `Store/checkProposedWrite` | `Store.row` (3871); `relatedRows` (3885) | CORE |
| [packages/store/src/store.ts:6452](../../packages/store/src/store.ts#L6452) `Store/clearAccountPrivilegeSet` | `SQLite.prepare` (6452); `Store.sql` (6452) | CORE |
| [packages/store/src/store.ts:1542](../../packages/store/src/store.ts#L1542) `Store/close` | `Store.sql` (1542) | CORE |
| [packages/store/src/store.ts:8992](../../packages/store/src/store.ts#L8992) `Store/compactFile` | `Store.sql` (8992, 8993, 8995) | CORE |
| [packages/store/src/store.ts:9403](../../packages/store/src/store.ts#L9403) `Store/computedRows` | `Store.sql` (9403, 9406, 9407, 9408, 9410, 9420, 9421, 9422, 9425); `SQLite.prepare` (9406, 9408, 9410, 9420); `SQLite.iterate` (9410); `Calculations.globalValue` (9413); `Calculations.unstoredValue` (9414); `Calculations.related` (9417); `SQLite.all` (9420) | CORE |
| [packages/store/src/store.ts:10956](../../packages/store/src/store.ts#L10956) `Store/computeValuesCurrent` | `Store.computeValues` (10956); `Store.sql` (10962, 10966); `SQLite.all` (10966); `SQLite.prepare` (10966) | GATED-STORE |
| [packages/store/src/store.ts:5874](../../packages/store/src/store.ts#L5874) `Store/confirmTotp` | `SQLite.get` (5874); `SQLite.prepare` (5874, 5876); `Store.sql` (5874, 5876) | CORE |
| [packages/store/src/store.ts:1158](../../packages/store/src/store.ts#L1158) `Store/constructor` | `Store.sql` (1158, 1160, 1162, 1163, 1167, 1171, 1172, 1181, 1189, 1204, 1209, 1214, 1215, 1219, 1220, 1221, 1228, 1232, 1236, 1237, 1238, 1243, 1244, 1248, 1251, 1252, 1254, 1255, 1258, 1259, 1263, 1264, 1268, 1269, 1272, 1275, 1276, 1278, 1281, 1282, 1286, 1287, 1291, 1292, 1296, 1297, 1298, 1301, 1302, 1305, 1306, 1308, 1308, 1309, 1309, 1310, 1314, 1316, 1320, 1322, 1325, 1326, 1327, 1330, 1331, 1333, 1335, 1336, 1340, 1341, 1343, 1355, 1357, 1358, 1359, 1359, 1363, 1364); `SQLite.get` (1162, 1181); `SQLite.prepare` (1162, 1181, 1189, 1251, 1252, 1255, 1258, 1263, 1268, 1275, 1281, 1286, 1291, 1301, 1305, 1308, 1309, 1330, 1335, 1340); `SQLite.all` (1251, 1258, 1263, 1268, 1275, 1281, 1286, 1291, 1301, 1305, 1308, 1309, 1330, 1335, 1340) | CORE |
| [packages/store/src/store.ts:6232](../../packages/store/src/store.ts#L6232) `Store/consumeRecoveryCode` | `SQLite.prepare` (6232); `Store.sql` (6232) | CORE |
| [packages/store/src/store.ts:8567](../../packages/store/src/store.ts#L8567) `Store/container` | `SQLite.get` (8567); `SQLite.prepare` (8567, 8576); `Store.sql` (8567, 8576); `SQLite.all` (8576) | CORE |
| [packages/store/src/store.ts:9001](../../packages/store/src/store.ts#L9001) `Store/containerId` | `Store.containerId` (9001); `Store.row` (9002) | CORE |
| [packages/store/src/store.ts:8584](../../packages/store/src/store.ts#L8584) `Store/containerInfo` | `SQLite.get` (8584); `SQLite.prepare` (8584); `Store.sql` (8584) | CORE |
| [packages/store/src/store.ts:8548](../../packages/store/src/store.ts#L8548) `Store/containerIntact` | `SQLite.get` (8548); `SQLite.prepare` (8548); `Store.sql` (8548) | CORE |
| [packages/store/src/store.ts:8487](../../packages/store/src/store.ts#L8487) `Store/containerIntegrityReport` | `SQLite.all` (8487); `SQLite.prepare` (8487, 8498); `Store.sql` (8487, 8498); `SQLite.get` (8498) | CORE |
| [packages/store/src/store.ts:8562](../../packages/store/src/store.ts#L8562) `Store/containerMeta` | `SQLite.get` (8562); `SQLite.prepare` (8562); `Store.sql` (8562) | CORE |
| [packages/store/src/store.ts:8618](../../packages/store/src/store.ts#L8618) `Store/containerRange` | `SQLite.all` (8618); `SQLite.prepare` (8618, 8625); `Store.sql` (8618, 8625); `SQLite.get` (8625) | CORE |
| [packages/store/src/store.ts:8389](../../packages/store/src/store.ts#L8389) `Store/containerReferences` | `SQLite.all` (8389, 8408, 8410, 8416, 8429, 8440, 8454); `SQLite.prepare` (8389, 8408, 8410, 8416, 8429, 8440, 8452, 8454); `Store.sql` (8389, 8408, 8410, 8416, 8429, 8440, 8452, 8454); `SQLite.get` (8452); `Store.row` (8463) | CORE |
| [packages/store/src/store.ts:10936](../../packages/store/src/store.ts#L10936) `Store/countIds` | `Store.countIds` (10936); `SQLite.get` (10940); `SQLite.prepare` (10940); `Store.sql` (10940) | GATED-STORE |
| [packages/store/src/store.ts:9783](../../packages/store/src/store.ts#L9783) `Store/create` | `SQLite.get` (9783); `SQLite.prepare` (9783, 9796); `Store.sql` (9783, 9796) | CORE |
| [packages/store/src/store.ts:4100](../../packages/store/src/store.ts#L4100) `Store/createAccountOnly` | `SQLite.get` (4100); `SQLite.prepare` (4100, 4104, 4110, 4115, 4120); `Store.sql` (4100, 4104, 4110, 4115, 4120) | CORE |
| [packages/store/src/store.ts:5605](../../packages/store/src/store.ts#L5605) `Store/createApiToken` | `SQLite.get` (5605, 5633); `SQLite.prepare` (5605, 5632, 5633, 5643); `Store.sql` (5605, 5632, 5633, 5643) | CORE |
| [packages/store/src/store.ts:5111](../../packages/store/src/store.ts#L5111) `Store/createLocalAccount` | `SQLite.prepare` (5111); `Store.sql` (5111) | CORE |
| [packages/store/src/store.ts:3700](../../packages/store/src/store.ts#L3700) `Store/credentialIdentity` | `SQLite.get` (3700); `SQLite.prepare` (3700); `Store.sql` (3700) | CORE |
| [packages/store/src/store.ts:5526](../../packages/store/src/store.ts#L5526) `Store/credentialStamp` | `SQLite.get` (5526); `SQLite.prepare` (5526); `Store.sql` (5526) | CORE |
| [packages/store/src/store.ts:7131](../../packages/store/src/store.ts#L7131) `Store/crossFileBusy` | `Store.sql` (7131) | AUTH |
| [packages/store/src/store.ts:7103](../../packages/store/src/store.ts#L7103) `Store/crossFileHash` | `SQLite.get` (7103); `SQLite.prepare` (7103); `Store.sql` (7103) | AUTH |
| [packages/store/src/store.ts:2064](../../packages/store/src/store.ts#L2064) `Store/dataVersion` | `SQLite.get` (2064); `SQLite.prepare` (2064); `Store.sql` (2064) | CORE |
| [packages/store/src/store.ts:11499](../../packages/store/src/store.ts#L11499) `Store/decimalViewSql` | `SQLite.all` (11499); `SQLite.prepare` (11499) | CORE |
| [packages/store/src/store.ts:10498](../../packages/store/src/store.ts#L10498) `Store/delete` | `Store.row` (10498) | CORE |
| [packages/store/src/store.ts:10506](../../packages/store/src/store.ts#L10506) `Store/delete/run` | `SQLite.get` (10506); `SQLite.prepare` (10506, 10511); `Store.sql` (10506, 10511) | CORE |
| [packages/store/src/store.ts:5265](../../packages/store/src/store.ts#L5265) `Store/deleteAccount` | `SQLite.prepare` (5265, 5269, 5270, 5271, 5272, 5273, 5274, 5275, 5276, 5283, 5285, 5287, 5289, 5293); `Store.sql` (5265, 5269, 5270, 5271, 5272, 5273, 5274, 5275, 5276, 5283, 5285, 5287, 5289, 5293) | CORE |
| [packages/store/src/store.ts:10579](../../packages/store/src/store.ts#L10579) `Store/deleteBeingUndone` | `SQLite.all` (10579); `SQLite.prepare` (10579); `Store.sql` (10579) | CORE |
| [packages/store/src/store.ts:3337](../../packages/store/src/store.ts#L3337) `Store/deletedRows` | `SQLite.get` (3337); `SQLite.prepare` (3337, 3339, 3339); `Store.sql` (3337, 3339, 3339); `SQLite.all` (3339, 3339) | CORE |
| [packages/store/src/store.ts:10591](../../packages/store/src/store.ts#L10591) `Store/deleteEndingTheLifeAt` | `SQLite.get` (10591); `SQLite.prepare` (10591); `Store.sql` (10591) | CORE |
| [packages/store/src/store.ts:6317](../../packages/store/src/store.ts#L6317) `Store/deletePrivilegeSet` | `SQLite.prepare` (6317); `Store.sql` (6317) | CORE |
| [packages/store/src/store.ts:4238](../../packages/store/src/store.ts#L4238) `Store/deleteScriptTest` | `SQLite.prepare` (4238); `Store.sql` (4238) | CORE |
| [packages/store/src/store.ts:10483](../../packages/store/src/store.ts#L10483) `Store/deleteVisibility` | `Store.canViewRecord` (10483) | CORE |
| [packages/store/src/store.ts:7240](../../packages/store/src/store.ts#L7240) `Store/design` | `SQLite.get` (7240) | CORE |
| [packages/store/src/store.ts:3447](../../packages/store/src/store.ts#L3447) `Store/designEffect` | `Store.sql` (3447, 3453, 3454, 3457, 3463, 3468, 3471, 3477, 3488, 3489, 3491, 3492, 3505, 3506, 3509, 3511, 3517, 3518, 3519, 3525, 3527, 3531, 3534, 3535, 3537, 3540, 3546, 3548, 3555, 3556, 3558, 3559, 3560, 3561, 3568, 3569, 3571, 3571, 3573, 3574, 3575, 3579, 3583, 3585, 3623, 3625, 3627); `SQLite.prepare` (3457, 3488, 3489, 3505, 3506, 3517, 3518, 3525, 3527, 3531, 3535, 3546, 3548, 3561, 3568, 3569, 3571, 3573, 3575, 3579, 3583); `SQLite.get` (3488, 3505, 3517, 3518, 3531, 3535, 3571, 3579); `SQLite.all` (3568, 3569); `SQLite.iterate` (3573) | CORE |
| [packages/store/src/store.ts:3440](../../packages/store/src/store.ts#L3440) `Store/designEffect/renameExcluded` | `SQLite.prepare` (3440); `Store.sql` (3440) | CORE |
| [packages/store/src/store.ts:3424](../../packages/store/src/store.ts#L3424) `Store/designEffect/renameKey` | `SQLite.prepare` (3424); `Store.sql` (3424) | CORE |
| [packages/store/src/store.ts:3378](../../packages/store/src/store.ts#L3378) `Store/designHistory` | `SQLite.all` (3378); `SQLite.prepare` (3378); `Store.sql` (3378) | CORE |
| [packages/store/src/store.ts:5895](../../packages/store/src/store.ts#L5895) `Store/disableTotp` | `SQLite.prepare` (5895); `Store.sql` (5895) | CORE |
| [packages/store/src/store.ts:3635](../../packages/store/src/store.ts#L3635) `Store/dropColumnIndexes` | `SQLite.all` (3635, 3637); `SQLite.prepare` (3635, 3637); `Store.sql` (3635, 3637, 3638) | CORE |
| [packages/store/src/store.ts:9178](../../packages/store/src/store.ts#L9178) `Store/dropFieldIndex` | `SQLite.get` (9178); `SQLite.prepare` (9178); `Store.sql` (9178, 9179) | CORE |
| [packages/store/src/store.ts:9820](../../packages/store/src/store.ts#L9820) `Store/duplicate` | `Store.row` (9820); `SQLite.prepare` (9838); `Store.sql` (9838) | CORE |
| [packages/store/src/store.ts:8805](../../packages/store/src/store.ts#L8805) `Store/embeddedContainerCount` | `SQLite.prepare` (8805); `Store.sql` (8805); `SQLite.get` (8806) | CORE |
| [packages/store/src/store.ts:8791](../../packages/store/src/store.ts#L8791) `Store/embeddedContainers` | `SQLite.prepare` (8791, 8792); `Store.sql` (8791, 8792); `SQLite.all` (8792); `SQLite.get` (8796) | CORE |
| [packages/store/src/store.ts:3363](../../packages/store/src/store.ts#L3363) `Store/emptyDeleted` | `Store.sql` (3363, 3366, 3367, 3369, 3371); `SQLite.prepare` (3367) | CORE |
| [packages/store/src/store.ts:1940](../../packages/store/src/store.ts#L1940) `Store/endTransaction` | `Store.sql` (1940, 1943, 1943) | CORE |
| [packages/store/src/store.ts:5863](../../packages/store/src/store.ts#L5863) `Store/enrollTotp` | `SQLite.prepare` (5863); `Store.sql` (5863) | CORE |
| [packages/store/src/store.ts:3332](../../packages/store/src/store.ts#L3332) `Store/ensureDeleted` | `Store.sql` (3332) | CORE |
| [packages/store/src/store.ts:1374](../../packages/store/src/store.ts#L1374) `Store/ensureNativeIds` | `SQLite.all` (1374, 1386); `SQLite.prepare` (1374, 1377, 1385, 1386); `Store.sql` (1374, 1377, 1380, 1384, 1385, 1386, 1389, 1391) | CORE |
| [packages/store/src/store.ts:2186](../../packages/store/src/store.ts#L2186) `Store/ensureRecordIdHighWater` | `Store.sql` (2186, 2187, 2189, 2191, 2193) | CORE |
| [packages/store/src/store.ts:2205](../../packages/store/src/store.ts#L2205) `Store/ensureRecordIdMarks` | `SQLite.all` (2205, 2208, 2211, 2220); `SQLite.prepare` (2205, 2208, 2211, 2214, 2220, 2223); `Store.sql` (2205, 2208, 2211, 2214, 2220, 2223, 2227, 2228) | CORE |
| [packages/store/src/store.ts:10152](../../packages/store/src/store.ts#L10152) `Store/evaluateCurrent` | `Store.row` (10152, 10152, 10153, 10153); `Calculations.context` (10158); `Store.get` (10159, 10161) | GATED-STORE |
| [packages/store/src/store.ts:10193](../../packages/store/src/store.ts#L10193) `Store/evaluateEachCurrent` | `Store.row` (10193, 10193, 10198); `Calculations.context` (10199); `Store.get` (10201) | GATED-STORE |
| [packages/store/src/store.ts:10255](../../packages/store/src/store.ts#L10255) `Store/evaluateRowsCurrent` | `Store.row` (10255, 10255, 10256, 10256) | GATED-STORE |
| [packages/store/src/store.ts:10234](../../packages/store/src/store.ts#L10234) `Store/evaluateRowsCurrent/each` | `Calculations.context` (10234); `Store.get` (10236) | GATED-STORE |
| [packages/store/src/store.ts:10270](../../packages/store/src/store.ts#L10270) `Store/evaluateRowsCurrent/found/[Symbol.iterator]` | `rowsById` (10270) | GATED-STORE |
| [packages/store/src/store.ts:10292](../../packages/store/src/store.ts#L10292) `Store/evaluateRowsCurrent/key` | `Calculations.context` (10292) | GATED-STORE |
| [packages/store/src/store.ts:4016](../../packages/store/src/store.ts#L4016) `Store/externalAccount` | `SQLite.all` (4016); `SQLite.prepare` (4016); `Store.sql` (4016) | CORE |
| [packages/store/src/store.ts:8310](../../packages/store/src/store.ts#L8310) `Store/externalContainerCheck` | `SQLite.all` (8310); `SQLite.prepare` (8310); `Store.sql` (8310) | CORE |
| [packages/store/src/store.ts:8317](../../packages/store/src/store.ts#L8317) `Store/externalContainerCount` | `SQLite.get` (8317); `SQLite.prepare` (8317); `Store.sql` (8317) | CORE |
| [packages/store/src/store.ts:8326](../../packages/store/src/store.ts#L8326) `Store/externalContainerReport` | `SQLite.all` (8326, 8339); `SQLite.prepare` (8326, 8339); `Store.sql` (8326, 8339) | CORE |
| [packages/store/src/store.ts:5376](../../packages/store/src/store.ts#L5376) `Store/externalIdentityId` | `SQLite.get` (5376, 5383); `SQLite.prepare` (5376, 5382, 5383); `Store.sql` (5376, 5382, 5383) | CORE |
| [packages/store/src/store.ts:8558](../../packages/store/src/store.ts#L8558) `Store/externalOf` | `SQLite.get` (8558); `SQLite.prepare` (8558); `Store.sql` (8558) | CORE |
| [packages/store/src/store.ts:3113](../../packages/store/src/store.ts#L3113) `Store/failureAuditRoom` | `SQLite.get` (3113); `SQLite.prepare` (3113); `Store.sql` (3113) | CORE |
| [packages/store/src/store.ts:7957](../../packages/store/src/store.ts#L7957) `Store/fieldIndexCurrent` | `SQLite.iterate` (7957); `SQLite.prepare` (7957, 7962); `Store.sql` (7957, 7962); `SQLite.all` (7962) | GATED-STORE |
| [packages/store/src/store.ts:9218](../../packages/store/src/store.ts#L9218) `Store/find` | `Store.find` (9218) | GATED-STORE |
| [packages/store/src/store.ts:9590](../../packages/store/src/store.ts#L9590) `Store/findCandidates` | `Store.query` (9590) | CORE |
| [packages/store/src/store.ts:9229](../../packages/store/src/store.ts#L9229) `Store/findHere` | `Store.query` (9229, 9234, 9236, 9250, 9252, 9263); `Store.recordCount` (9247); `SQLite.get` (9248, 9252); `SQLite.prepare` (9248, 9252, 9258, 9265, 9274); `Store.sql` (9248, 9252, 9258, 9265, 9274); `SQLite.all` (9258, 9265, 9274) | GATED-STORE |
| [packages/store/src/store.ts:9269](../../packages/store/src/store.ts#L9269) `Store/findHere/[Symbol.iterator]` | `SQLite.iterate` (9269); `SQLite.prepare` (9269); `Store.sql` (9269) | GATED-STORE |
| [packages/store/src/store.ts:11067](../../packages/store/src/store.ts#L11067) `Store/findIdsCurrent` | `Store.findIds` (11067) | GATED-STORE |
| [packages/store/src/store.ts:11003](../../packages/store/src/store.ts#L11003) `Store/findIdsCurrentProgress` | `Store.findIdsProgress` (11003); `Store.query` (11005, 11006, 11019, 11021); `Store.recordCount` (11011, 11039); `SQLite.iterate` (11036); `SQLite.prepare` (11036, 11044, 11045); `Store.sql` (11036, 11044, 11045); `SQLite.get` (11048); `SQLite.all` (11054) | GATED-STORE |
| [packages/store/src/store.ts:11073](../../packages/store/src/store.ts#L11073) `Store/findIdsHere` | `Store.query` (11073, 11078, 11080); `SQLite.iterate` (11091); `SQLite.prepare` (11091); `Store.sql` (11091) | GATED-STORE |
| [packages/store/src/store.ts:9534](../../packages/store/src/store.ts#L9534) `Store/findSource` | `Store.query` (9534); `SQLite.all` (9543, 9560); `SQLite.prepare` (9543, 9551, 9559); `Store.sql` (9543, 9548, 9551, 9556, 9559, 9573, 9575); `Calculations.globalValue` (9565); `Calculations.unstoredValue` (9566); `Calculations.related` (9570) | CORE |
| [packages/store/src/store.ts:3225](../../packages/store/src/store.ts#L3225) `Store/flushDeferredSecurity` | `Store.sql` (3225) | CORE |
| [packages/store/src/store.ts:5232](../../packages/store/src/store.ts#L5232) `Store/forgetStandIns` | `SQLite.prepare` (5232); `Store.sql` (5232) | CORE |
| [packages/store/src/store.ts:10546](../../packages/store/src/store.ts#L10546) `Store/forgetStandInValues` | `Store.sql` (10546, 10567); `SQLite.prepare` (10567) | CORE |
| [packages/store/src/store.ts:7838](../../packages/store/src/store.ts#L7838) `Store/foundSetPage` | `rowsById` (7838) | CORE |
| [packages/store/src/store.ts:7854](../../packages/store/src/store.ts#L7854) `Store/foundSetRowsCurrent` | `Store.viewableIds` (7854); `Store.row` (7870) | GATED-STORE |
| [packages/store/src/store.ts:3934](../../packages/store/src/store.ts#L3934) `Store/gateAgentWrite` | `SQLite.get` (3934); `SQLite.prepare` (3934, 3936); `Store.sql` (3934, 3936) | CORE |
| [packages/store/src/store.ts:6170](../../packages/store/src/store.ts#L6170) `Store/generateRecoveryCodes` | `SQLite.prepare` (6170, 6173); `Store.sql` (6170, 6173) | CORE |
| [packages/store/src/store.ts:9662](../../packages/store/src/store.ts#L9662) `Store/getCurrent` | `Store.get` (9662); `Store.row` (9663, 9663, 9677); `SQLite.all` (9680); `SQLite.prepare` (9680); `Store.sql` (9680) | GATED-STORE |
| [packages/store/src/store.ts:9700](../../packages/store/src/store.ts#L9700) `Store/getManyCurrent` | `Store.getMany` (9700); `SQLite.get` (9718); `SQLite.prepare` (9718); `Store.sql` (9718) | GATED-STORE |
| [packages/store/src/store.ts:9711](../../packages/store/src/store.ts#L9711) `Store/getManyCurrent/[Symbol.iterator]` | `rowsById` (9711) | GATED-STORE |
| [packages/store/src/store.ts:1421](../../packages/store/src/store.ts#L1421) `Store/grantFullAccessClients` | `SQLite.prepare` (1421); `Store.sql` (1421) | CORE |
| [packages/store/src/store.ts:11108](../../packages/store/src/store.ts#L11108) `Store/groupSummariesCurrent` | `Store.groupSummaries` (11108); `Store.viewableIds` (11113); `Calculations.collect` (11129); `rowsById` (11129, 11179); `Calculations.collector` (11151) | GATED-STORE |
| [packages/store/src/store.ts:11177](../../packages/store/src/store.ts#L11177) `Store/groupSummariesCurrent/flush` | `Calculations.collector` (11177) | GATED-STORE |
| [packages/store/src/store.ts:11141](../../packages/store/src/store.ts#L11141) `Store/groupSummariesCurrent/key` | `Calculations.value` (11141); `Calculations.related` (11143) | GATED-STORE |
| [packages/store/src/store.ts:1448](../../packages/store/src/store.ts#L1448) `Store/hasOwnPassword` | `SQLite.get` (1448); `SQLite.prepare` (1448); `Store.sql` (1448) | CORE |
| [packages/store/src/store.ts:6025](../../packages/store/src/store.ts#L6025) `Store/hasPasskey` | `SQLite.get` (6025); `SQLite.prepare` (6025); `Store.sql` (6025) | CORE |
| [packages/store/src/store.ts:1429](../../packages/store/src/store.ts#L1429) `Store/hasProvingPassword` | `SQLite.get` (1429); `SQLite.prepare` (1429); `Store.sql` (1429) | CORE |
| [packages/store/src/store.ts:9132](../../packages/store/src/store.ts#L9132) `Store/hasTable` | `SQLite.get` (9132); `SQLite.prepare` (9132); `Store.sql` (9132) | CORE |
| [packages/store/src/store.ts:5884](../../packages/store/src/store.ts#L5884) `Store/hasTotp` | `SQLite.get` (5884); `SQLite.prepare` (5884); `Store.sql` (5884) | CORE |
| [packages/store/src/store.ts:5355](../../packages/store/src/store.ts#L5355) `Store/identityAllowed` | `SQLite.get` (5355, 5361, 5367); `SQLite.prepare` (5355, 5361, 5367); `Store.sql` (5355, 5361, 5367) | CORE |
| [packages/store/src/store.ts:7275](../../packages/store/src/store.ts#L7275) `Store/image` | `SQLite.get` (7275); `SQLite.prepare` (7275); `Store.sql` (7275) | CORE |
| [packages/store/src/store.ts:7285](../../packages/store/src/store.ts#L7285) `Store/images` | `SQLite.all` (7285); `SQLite.prepare` (7285); `Store.sql` (7285) | CORE |
| [packages/store/src/store.ts:5076](../../packages/store/src/store.ts#L5076) `Store/importAccounts` | `SQLite.all` (5076); `SQLite.prepare` (5076); `Store.sql` (5076) | CORE |
| [packages/store/src/store.ts:1762](../../packages/store/src/store.ts#L1762) `Store/independentWindowWrite` | `SQLite.get` (1762); `SQLite.prepare` (1762, 1770, 1830); `Store.sql` (1762, 1770, 1780, 1808, 1825, 1830, 1833); `SQLite.all` (1770); `Store.row` (1828) | CORE |
| [packages/store/src/store.ts:9144](../../packages/store/src/store.ts#L9144) `Store/indexedFields` | `SQLite.all` (9144, 9145); `SQLite.prepare` (9144, 9145); `Store.sql` (9144, 9145) | CORE |
| [packages/store/src/store.ts:11532](../../packages/store/src/store.ts#L11532) `Store/internalRoots` | `SQLite.get` (11532); `SQLite.prepare` (11532, 11534); `SQLite.all` (11534) | CORE |
| [packages/store/src/store.ts:3722](../../packages/store/src/store.ts#L3722) `Store/isAgent` | `SQLite.get` (3722); `SQLite.prepare` (3722); `Store.sql` (3722) | CORE |
| [packages/store/src/store.ts:3825](../../packages/store/src/store.ts#L3825) `Store/isExternal` | `SQLite.get` (3825); `SQLite.prepare` (3825); `Store.sql` (3825) | CORE |
| [packages/store/src/store.ts:5939](../../packages/store/src/store.ts#L5939) `Store/issueWebauthnChallenge` | `SQLite.prepare` (5939, 5941, 5942, 5944); `Store.sql` (5939, 5941, 5942, 5944); `SQLite.get` (5941) | CORE |
| [packages/store/src/store.ts:11393](../../packages/store/src/store.ts#L11393) `Store/iterateCommitted` | `SQLite.iterate` (11393) | CORE |
| [packages/store/src/store.ts:1702](../../packages/store/src/store.ts#L1702) `Store/joinTransaction` | `Store.sql` (1702, 1703, 1705, 1707, 1713, 1716) | CORE |
| [packages/store/src/store.ts:10779](../../packages/store/src/store.ts#L10779) `Store/keyStepWork` | `Store.sql` (10779, 10785, 10789, 10791) | CORE |
| [packages/store/src/store.ts:7091](../../packages/store/src/store.ts#L7091) `Store/knownSharedAccount` | `SQLite.get` (7091); `SQLite.prepare` (7091); `Store.sql` (7091) | CORE |
| [packages/store/src/store.ts:4549](../../packages/store/src/store.ts#L4549) `Store/lastSignIns` | `Store.auditLog` (4549) | CORE |
| [packages/store/src/store.ts:10597](../../packages/store/src/store.ts#L10597) `Store/latestDeleteSeq` | `SQLite.get` (10597); `SQLite.prepare` (10597); `Store.sql` (10597) | CORE |
| [packages/store/src/store.ts:7315](../../packages/store/src/store.ts#L7315) `Store/layout` | `SQLite.get` (7315); `SQLite.prepare` (7315); `Store.sql` (7315) | CORE |
| [packages/store/src/store.ts:3395](../../packages/store/src/store.ts#L3395) `Store/layoutHistory` | `SQLite.all` (3395); `SQLite.prepare` (3395); `Store.sql` (3395) | CORE |
| [packages/store/src/store.ts:7205](../../packages/store/src/store.ts#L7205) `Store/layouts` | `SQLite.all` (7205); `SQLite.prepare` (7205); `Store.sql` (7205) | CORE |
| [packages/store/src/store.ts:4849](../../packages/store/src/store.ts#L4849) `Store/leastPrivilege` | `SQLite.all` (4849); `SQLite.prepare` (4849); `Store.sql` (4849) | CORE |
| [packages/store/src/store.ts:5453](../../packages/store/src/store.ts#L5453) `Store/ledgerRow` | `SQLite.get` (5453, 5454); `SQLite.prepare` (5453, 5454); `Store.sql` (5453, 5454) | AUTH |
| [packages/store/src/store.ts:5465](../../packages/store/src/store.ts#L5465) `Store/ledgerWrite` | `Store.sql` (5465, 5466, 5468, 5470, 5473, 5473) | AUTH |
| [packages/store/src/store.ts:5159](../../packages/store/src/store.ts#L5159) `Store/limitAccountImport` | `SQLite.prepare` (5159, 5160, 5163); `Store.sql` (5159, 5160, 5163); `SQLite.get` (5160) | CORE |
| [packages/store/src/store.ts:3675](../../packages/store/src/store.ts#L3675) `Store/linkIdentity` | `SQLite.get` (3675); `SQLite.prepare` (3675); `Store.sql` (3675) | CORE |
| [packages/store/src/store.ts:3667](../../packages/store/src/store.ts#L3667) `Store/linkPrincipal` | `SQLite.get` (3667); `SQLite.prepare` (3667); `Store.sql` (3667) | CORE |
| [packages/store/src/store.ts:4435](../../packages/store/src/store.ts#L4435) `Store/markPiiField` | `SQLite.prepare` (4435); `Store.sql` (4435) | CORE |
| [packages/store/src/store.ts:8283](../../packages/store/src/store.ts#L8283) `Store/markRepeating` | `SQLite.prepare` (8283); `Store.sql` (8283) | CORE |
| [packages/store/src/store.ts:11326](../../packages/store/src/store.ts#L11326) `Store/matchIds` | `Store.matchIds` (11326); `SQLite.all` (11332); `SQLite.prepare` (11332); `Store.sql` (11332) | CORE |
| [packages/store/src/store.ts:1463](../../packages/store/src/store.ts#L1463) `Store/meta` | `SQLite.get` (1463); `SQLite.prepare` (1463); `Store.sql` (1463) | CORE |
| [packages/store/src/store.ts:1011](../../packages/store/src/store.ts#L1011) `Store/metadataVersions` | `SQLite.get` (1011); `SQLite.prepare` (1011); `Store.sql` (1011) | CORE |
| [packages/store/src/store.ts:8920](../../packages/store/src/store.ts#L8920) `Store/moveContainersIn` | `Store.sql` (8920, 8926, 8928, 8929, 8930, 8931, 8951, 8956, 8956, 8967, 8970, 8973, 8980); `SQLite.prepare` (8928, 8929, 8930, 8931, 8967, 8973); `SQLite.get` (8933, 8967, 8973) | CORE |
| [packages/store/src/store.ts:8842](../../packages/store/src/store.ts#L8842) `Store/moveContainersOut` | `Store.sql` (8842, 8850, 8852, 8854, 8859, 8860, 8880, 8886, 8888, 8890, 8890, 8896, 8896, 8901, 8903, 8905, 8905, 8911); `SQLite.get` (8850); `SQLite.prepare` (8850, 8859, 8860); `Store.container` (8862) | CORE |
| [packages/store/src/store.ts:5030](../../packages/store/src/store.ts#L5030) `Store/mustChangePassword` | `SQLite.get` (5030); `SQLite.prepare` (5030); `Store.sql` (5030) | CORE |
| [packages/store/src/store.ts:1399](../../packages/store/src/store.ts#L1399) `Store/nativeIdGuards` | `Store.sql` (1399, 1400, 1402) | CORE |
| [packages/store/src/store.ts:2241](../../packages/store/src/store.ts#L2241) `Store/nextRecordId` | `SQLite.get` (2241); `SQLite.prepare` (2241); `Store.sql` (2241) | CORE |
| [packages/store/src/store.ts:5759](../../packages/store/src/store.ts#L5759) `Store/objectUseSince` | `SQLite.get` (5759); `SQLite.prepare` (5759); `Store.sql` (5759) | CORE |
| [packages/store/src/store.ts:9104](../../packages/store/src/store.ts#L9104) `Store/orderBy` | `Store.valueListItems` (9104) | CORE |
| [packages/store/src/store.ts:8475](../../packages/store/src/store.ts#L8475) `Store/orphanContainerReport` | `SQLite.all` (8475); `SQLite.prepare` (8475); `Store.sql` (8475) | CORE |
| [packages/store/src/store.ts:5991](../../packages/store/src/store.ts#L5991) `Store/passkeyAllowList` | `SQLite.all` (5991); `SQLite.prepare` (5991); `Store.sql` (5991) | CORE |
| [packages/store/src/store.ts:6030](../../packages/store/src/store.ts#L6030) `Store/passkeyIds` | `SQLite.all` (6030); `SQLite.prepare` (6030); `Store.sql` (6030) | CORE |
| [packages/store/src/store.ts:6018](../../packages/store/src/store.ts#L6018) `Store/passkeys` | `SQLite.all` (6018); `SQLite.prepare` (6018); `Store.sql` (6018) | CORE |
| [packages/store/src/store.ts:5069](../../packages/store/src/store.ts#L5069) `Store/passwordDaysRemaining` | `SQLite.get` (5069); `SQLite.prepare` (5069); `Store.sql` (5069) | CORE |
| [packages/store/src/store.ts:7049](../../packages/store/src/store.ts#L7049) `Store/passwordState` | `SQLite.get` (7049); `SQLite.prepare` (7049); `Store.sql` (7049) | CORE |
| [packages/store/src/store.ts:3958](../../packages/store/src/store.ts#L3958) `Store/pendingChanges` | `SQLite.all` (3958); `SQLite.prepare` (3958); `Store.sql` (3958) | CORE |
| [packages/store/src/store.ts:1481](../../packages/store/src/store.ts#L1481) `Store/persistentData` | `SQLite.get` (1481) | CORE |
| [packages/store/src/store.ts:1490](../../packages/store/src/store.ts#L1490) `Store/persistentDataIds` | `SQLite.all` (1490) | CORE |
| [packages/store/src/store.ts:1471](../../packages/store/src/store.ts#L1471) `Store/persistentTable` | `Store.sql` (1471) | CORE |
| [packages/store/src/store.ts:10440](../../packages/store/src/store.ts#L10440) `Store/portalContainerTarget` | `Store.row` (10440); `relatedIdList` (10442) | CORE |
| [packages/store/src/store.ts:7893](../../packages/store/src/store.ts#L7893) `Store/portalCountsCurrent` | `Store.canView` (7893); `Store.row` (7920) | GATED-STORE |
| [packages/store/src/store.ts:8138](../../packages/store/src/store.ts#L8138) `Store/portalRows` | `relatedRows` (8138); `relatedIdList` (8139); `Store.viewableSet` (8142); `rowsById` (8167, 8205); `Calculations.related` (8181) | CORE |
| [packages/store/src/store.ts:8149](../../packages/store/src/store.ts#L8149) `Store/portalRows/context` | `Calculations.context` (8149) | CORE |
| [packages/store/src/store.ts:8159](../../packages/store/src/store.ts#L8159) `Store/portalRows/valueOf` | `Calculations.value` (8159) | CORE |
| [packages/store/src/store.ts:2617](../../packages/store/src/store.ts#L2617) `Store/prepared` | `SQLite.prepare` (2617); `Store.sql` (2617) | CORE |
| [packages/store/src/store.ts:5141](../../packages/store/src/store.ts#L5141) `Store/previewAccountImport` | `Store.sql` (5141, 5142, 5151) | CORE |
| [packages/store/src/store.ts:6847](../../packages/store/src/store.ts#L6847) `Store/previewRecordRuleCurrent` | `SQLite.get` (6847); `SQLite.prepare` (6847, 6850); `Store.sql` (6847, 6850); `SQLite.all` (6850); `Calculations.context` (6856, 6872) | CORE |
| [packages/store/src/store.ts:9625](../../packages/store/src/store.ts#L9625) `Store/previewRow` | `Store.row` (9625) | CORE |
| [packages/store/src/store.ts:6245](../../packages/store/src/store.ts#L6245) `Store/privilegeSets` | `Store.sql` (6245) | CORE |
| [packages/store/src/store.ts:2854](../../packages/store/src/store.ts#L2854) `Store/pruneAudit` | `Store.sql` (2854, 2857, 2862, 2864, 2872, 2877, 2879); `SQLite.get` (2862, 2875, 2879); `SQLite.prepare` (2862, 2872, 2879) | CORE |
| [packages/store/src/store.ts:8510](../../packages/store/src/store.ts#L8510) `Store/purgeOrphanContainers` | `Store.sql` (8510, 8514, 8523, 8526, 8527, 8532, 8533, 8535, 8535); `Store.orphanContainerReport` (8518); `SQLite.get` (8523); `SQLite.prepare` (8523, 8526, 8527) | CORE |
| [packages/store/src/store.ts:11655](../../packages/store/src/store.ts#L11655) `Store/query` | `SQLite.iterate` (11655) | CORE |
| [packages/store/src/store.ts:11695](../../packages/store/src/store.ts#L11695) `Store/queryWithOriginsCurrent` | `SQLite.iterate` (11695); `SQLite.all` (11704, 11707); `SQLite.prepare` (11704, 11707) | CORE |
| [packages/store/src/store.ts:11444](../../packages/store/src/store.ts#L11444) `Store/readOnlyChecked` | `SQLite.prepare` (11444, 11448, 11457, 11462); `SQLite.all` (11448, 11457, 11462) | CORE |
| [packages/store/src/store.ts:3647](../../packages/store/src/store.ts#L3647) `Store/recompute` | `SQLite.prepare` (3647, 3651); `Store.sql` (3647, 3651); `SQLite.iterate` (3651); `Calculations.computeStoredStyled` (3652); `Calculations.value` (3652) | CORE |
| [packages/store/src/store.ts:2632](../../packages/store/src/store.ts#L2632) `Store/recordAsOf` | `SQLite.get` (2632, 2634); `SQLite.prepare` (2632, 2634, 2636, 2637); `Store.sql` (2632, 2634, 2636, 2637); `SQLite.all` (2636, 2637) | CORE |
| [packages/store/src/store.ts:2328](../../packages/store/src/store.ts#L2328) `Store/recordCount` | `SQLite.get` (2328); `SQLite.prepare` (2328); `Store.sql` (2328) | CORE |
| [packages/store/src/store.ts:1528](../../packages/store/src/store.ts#L1528) `Store/recordedFormat` | `Store.sql` (1528) | CORE |
| [packages/store/src/store.ts:2709](../../packages/store/src/store.ts#L2709) `Store/recordLife` | `SQLite.all` (2709); `SQLite.prepare` (2709); `Store.sql` (2709) | CORE |
| [packages/store/src/store.ts:5690](../../packages/store/src/store.ts#L5690) `Store/recordObjectUse` | `Store.sql` (5690) | CORE |
| [packages/store/src/store.ts:10142](../../packages/store/src/store.ts#L10142) `Store/recordViewable` | `Store.row` (10142) | GATED-STORE |
| [packages/store/src/store.ts:8814](../../packages/store/src/store.ts#L8814) `Store/recoverContainersOut` | `SQLite.prepare` (8814); `Store.sql` (8814); `SQLite.get` (8817) | CORE |
| [packages/store/src/store.ts:1631](../../packages/store/src/store.ts#L1631) `Store/recoverPendingExternalFiles` | `Store.sql` (1631, 1633, 1657, 1659); `SQLite.prepare` (1633); `SQLite.get` (1644) | CORE |
| [packages/store/src/store.ts:6188](../../packages/store/src/store.ts#L6188) `Store/recoveryCodesRemaining` | `SQLite.get` (6188); `SQLite.prepare` (6188); `Store.sql` (6188) | CORE |
| [packages/store/src/store.ts:11484](../../packages/store/src/store.ts#L11484) `Store/refreshDecimalSqlViews` | `SQLite.get` (11484); `SQLite.prepare` (11484) | CORE |
| [packages/store/src/store.ts:3816](../../packages/store/src/store.ts#L3816) `Store/refuseLookalikeAccount` | `SQLite.all` (3816); `SQLite.prepare` (3816); `Store.sql` (3816) | CORE |
| [packages/store/src/store.ts:6054](../../packages/store/src/store.ts#L6054) `Store/registerPasskey` | `SQLite.prepare` (6054); `Store.sql` (6054) | CORE |
| [packages/store/src/store.ts:3994](../../packages/store/src/store.ts#L3994) `Store/rejectPending` | `SQLite.get` (3994); `SQLite.prepare` (3994, 3996); `Store.sql` (3994, 3996) | CORE |
| [packages/store/src/store.ts:9377](../../packages/store/src/store.ts#L9377) `Store/relatedCriteria` | `SQLite.iterate` (9377); `SQLite.prepare` (9377); `Store.sql` (9377) | CORE |
| [packages/store/src/store.ts:9374](../../packages/store/src/store.ts#L9374) `Store/relatedCriteria/matched` | `relatedRows` (9374) | CORE |
| [packages/store/src/store.ts:7648](../../packages/store/src/store.ts#L7648) `Store/relatedValues` | `Calculations.globalValue` (7648); `Calculations.unstoredValue` (7650) | CORE |
| [packages/store/src/store.ts:6067](../../packages/store/src/store.ts#L6067) `Store/removePasskey` | `SQLite.get` (6067); `SQLite.prepare` (6067, 6068); `Store.sql` (6067, 6068) | CORE |
| [packages/store/src/store.ts:9203](../../packages/store/src/store.ts#L9203) `Store/reportFind` | `Store.query` (9203, 9205, 9206); `Store.recordCount` (9208) | CORE |
| [packages/store/src/store.ts:10617](../../packages/store/src/store.ts#L10617) `Store/restoreDeletedRowLocked` | `SQLite.get` (10617, 10622); `SQLite.prepare` (10617, 10618, 10622, 10632); `Store.sql` (10617, 10618, 10622, 10632); `SQLite.all` (10618) | CORE |
| [packages/store/src/store.ts:2667](../../packages/store/src/store.ts#L2667) `Store/restoreRecord` | `Store.recordAsOf` (2667); `SQLite.get` (2671); `SQLite.prepare` (2671, 2676, 2685, 2696); `Store.sql` (2671, 2676, 2685, 2696) | CORE |
| [packages/store/src/store.ts:2725](../../packages/store/src/store.ts#L2725) `Store/revertAuditEntry` | `SQLite.get` (2725); `SQLite.prepare` (2725); `Store.sql` (2725); `Store.canViewRecord` (2727); `Store.auditLog` (2730) | CORE |
| [packages/store/src/store.ts:5815](../../packages/store/src/store.ts#L5815) `Store/revokeApiToken` | `SQLite.prepare` (5815); `Store.sql` (5815) | CORE |
| [packages/store/src/store.ts:5338](../../packages/store/src/store.ts#L5338) `Store/revokeSignInCredentials` | `SQLite.prepare` (5338, 5339, 5340); `Store.sql` (5338, 5339, 5340) | AUTH |
| [packages/store/src/store.ts:9643](../../packages/store/src/store.ts#L9643) `Store/row` | `SQLite.get` (9643) | CORE |
| [packages/store/src/store.ts:11588](../../packages/store/src/store.ts#L11588) `Store/rowsOf` | `SQLite.iterate` (11588, 11597) | CORE |
| [packages/store/src/store.ts:6652](../../packages/store/src/store.ts#L6652) `Store/ruleOutcome` | `Calculations.context` (6652) | CORE |
| [packages/store/src/store.ts:9488](../../packages/store/src/store.ts#L9488) `Store/runningSummaryValues` | `Store.viewableIds` (9488); `rowsById` (9490); `Calculations.value` (9501, 9507); `Calculations.related` (9518) | GATED-STORE |
| [packages/store/src/store.ts:6274](../../packages/store/src/store.ts#L6274) `Store/savePrivilegeSet` | `SQLite.prepare` (6274, 6282); `Store.sql` (6274, 6282) | AUTH |
| [packages/store/src/store.ts:4229](../../packages/store/src/store.ts#L4229) `Store/saveScriptTest` | `SQLite.prepare` (4229); `Store.sql` (4229) | CORE |
| [packages/store/src/store.ts:6812](../../packages/store/src/store.ts#L6812) `Store/scopedTableSql` | `Store.viewableIds` (6812); `SQLite.all` (6815); `SQLite.prepare` (6815); `Store.sql` (6815) | GATED-STORE |
| [packages/store/src/store.ts:3385](../../packages/store/src/store.ts#L3385) `Store/scriptHistory` | `SQLite.all` (3385); `SQLite.prepare` (3385); `Store.sql` (3385) | CORE |
| [packages/store/src/store.ts:1607](../../packages/store/src/store.ts#L1607) `Store/securityChainHeadAudit` | `SQLite.get` (1607); `SQLite.prepare` (1607); `Store.sql` (1607) | CORE |
| [packages/store/src/store.ts:3058](../../packages/store/src/store.ts#L3058) `Store/securityChange` | `Store.sql` (3058, 3060); `SQLite.prepare` (3060) | CORE |
| [packages/store/src/store.ts:2591](../../packages/store/src/store.ts#L2591) `Store/securityEvents` | `Store.auditLog` (2591) | CORE |
| [packages/store/src/store.ts:5539](../../packages/store/src/store.ts#L5539) `Store/securityToken` | `SQLite.get` (5539); `SQLite.prepare` (5539); `Store.sql` (5539) | CORE |
| [packages/store/src/store.ts:11618](../../packages/store/src/store.ts#L11618) `Store/selectHeldCurrent` | `Store.sql` (11618, 11620, 11623); `SQLite.prepare` (11620) | CORE |
| [packages/store/src/store.ts:10922](../../packages/store/src/store.ts#L10922) `Store/selectIdsCurrent` | `Store.selectIds` (10922); `SQLite.all` (10928); `SQLite.prepare` (10928); `Store.sql` (10928) | GATED-STORE |
| [packages/store/src/store.ts:11608](../../packages/store/src/store.ts#L11608) `Store/selectIn` | `Store.select` (11608) | CORE |
| [packages/store/src/store.ts:1994](../../packages/store/src/store.ts#L1994) `Store/selfContainedCopy` | `Store.sql` (1994); `SQLite.all` (1999); `SQLite.prepare` (1999, 2001, 2002, 2003) | CORE |
| [packages/store/src/store.ts:5317](../../packages/store/src/store.ts#L5317) `Store/setAccountActive` | `SQLite.prepare` (5317, 5325, 5326); `Store.sql` (5317, 5325, 5326) | AUTH |
| [packages/store/src/store.ts:5558](../../packages/store/src/store.ts#L5558) `Store/setAccountLocalOnly` | `SQLite.prepare` (5558); `Store.sql` (5558) | CORE |
| [packages/store/src/store.ts:6430](../../packages/store/src/store.ts#L6430) `Store/setAccountPrivilegeSet` | `SQLite.get` (6430); `SQLite.prepare` (6430, 6433, 6437); `Store.sql` (6430, 6433, 6437) | AUTH |
| [packages/store/src/store.ts:5567](../../packages/store/src/store.ts#L5567) `Store/setAccountRequire2fa` | `SQLite.prepare` (5567); `Store.sql` (5567) | CORE |
| [packages/store/src/store.ts:3846](../../packages/store/src/store.ts#L3846) `Store/setAgentAccount` | `SQLite.get` (3846); `SQLite.prepare` (3846, 3852); `Store.sql` (3846, 3852) | CORE |
| [packages/store/src/store.ts:4308](../../packages/store/src/store.ts#L4308) `Store/setAiAllowed` | `SQLite.prepare` (4308); `Store.sql` (4308) | CORE |
| [packages/store/src/store.ts:4393](../../packages/store/src/store.ts#L4393) `Store/setAiPolicy` | `SQLite.prepare` (4393); `Store.sql` (4393) | CORE |
| [packages/store/src/store.ts:7078](../../packages/store/src/store.ts#L7078) `Store/setAllowBlankPasswordFromLan` | `SQLite.prepare` (7078); `Store.sql` (7078) | CORE |
| [packages/store/src/store.ts:2831](../../packages/store/src/store.ts#L2831) `Store/setAuditSettings` | `SQLite.prepare` (2831); `Store.sql` (2831) | CORE |
| [packages/store/src/store.ts:9033](../../packages/store/src/store.ts#L9033) `Store/setContainer` | `Store.sql` (9033); `Store.row` (9039) | CORE |
| [packages/store/src/store.ts:3798](../../packages/store/src/store.ts#L3798) `Store/setExternalAccount` | `SQLite.get` (3798); `SQLite.prepare` (3798, 3803); `Store.sql` (3798, 3803) | CORE |
| [packages/store/src/store.ts:5016](../../packages/store/src/store.ts#L5016) `Store/setMustChangePassword` | `SQLite.prepare` (5016); `Store.sql` (5016) | CORE |
| [packages/store/src/store.ts:4053](../../packages/store/src/store.ts#L4053) `Store/setPasswordOnly` | `SQLite.get` (4053); `SQLite.prepare` (4053, 4059, 4068, 4075, 4076, 4077); `Store.sql` (4053, 4059, 4068, 4075, 4076, 4077) | AUTH |
| [packages/store/src/store.ts:4170](../../packages/store/src/store.ts#L4170) `Store/setPasswordPolicy` | `SQLite.prepare` (4170); `Store.sql` (4170) | CORE |
| [packages/store/src/store.ts:1496](../../packages/store/src/store.ts#L1496) `Store/setPersistentData` | `SQLite.prepare` (1496, 1500); `Store.sql` (1496, 1500) | CORE |
| [packages/store/src/store.ts:4413](../../packages/store/src/store.ts#L4413) `Store/setPiiIsolation` | `SQLite.prepare` (4413); `Store.sql` (4413) | CORE |
| [packages/store/src/store.ts:4206](../../packages/store/src/store.ts#L4206) `Store/setRequireTotpForFullAccess` | `SQLite.prepare` (4206); `Store.sql` (4206) | CORE |
| [packages/store/src/store.ts:4325](../../packages/store/src/store.ts#L4325) `Store/setScriptNetwork` | `SQLite.prepare` (4325); `Store.sql` (4325) | CORE |
| [packages/store/src/store.ts:4382](../../packages/store/src/store.ts#L4382) `Store/setSqlRequiresFmxdbc` | `SQLite.prepare` (4382); `Store.sql` (4382) | CORE |
| [packages/store/src/store.ts:10063](../../packages/store/src/store.ts#L10063) `Store/setStoredCalcValues` | `SQLite.prepare` (10063, 10064); `Store.sql` (10063, 10064); `SQLite.get` (10068) | CORE |
| [packages/store/src/store.ts:5492](../../packages/store/src/store.ts#L5492) `Store/settleSignIns` | `SQLite.all` (5492, 5498); `SQLite.prepare` (5492, 5498, 5504, 5508, 5510); `Store.sql` (5492, 5498, 5504, 5508, 5510) | AUTH |
| [packages/store/src/store.ts:9136](../../packages/store/src/store.ts#L9136) `Store/setUserPref` | `Store.sql` (9136, 9137, 9138); `SQLite.prepare` (9137, 9138) | CORE |
| [packages/store/src/store.ts:4366](../../packages/store/src/store.ts#L4366) `Store/setWebViewerHosts` | `SQLite.prepare` (4366); `Store.sql` (4366) | CORE |
| [packages/store/src/store.ts:2125](../../packages/store/src/store.ts#L2125) `Store/shareResults` | `Store.sql` (2125) | CORE |
| [packages/store/src/store.ts:1558](../../packages/store/src/store.ts#L1558) `Store/shipWal` | `Store.sql` (1558) | CORE |
| [packages/store/src/store.ts:5439](../../packages/store/src/store.ts#L5439) `Store/signInBase` | `SQLite.get` (5439); `SQLite.prepare` (5439); `Store.sql` (5439) | AUTH |
| [packages/store/src/store.ts:5441](../../packages/store/src/store.ts#L5441) `Store/signInBase/identity` | `SQLite.get` (5441); `SQLite.prepare` (5441); `Store.sql` (5441) | AUTH |
| [packages/store/src/store.ts:5428](../../packages/store/src/store.ts#L5428) `Store/signInMark` | `SQLite.prepare` (5428); `Store.sql` (5428) | AUTH |
| [packages/store/src/store.ts:9302](../../packages/store/src/store.ts#L9302) `Store/sortedPage` | `SQLite.iterate` (9302); `SQLite.prepare` (9302, 9317); `Store.sql` (9302, 9317); `SQLite.all` (9317) | CORE |
| [packages/store/src/store.ts:11220](../../packages/store/src/store.ts#L11220) `Store/sortIdsCurrentProgress` | `Store.sortIds` (11220); `Store.sortIdsProgress` (11220); `SQLite.all` (11233); `SQLite.prepare` (11233, 11312); `Store.sql` (11233, 11312); `Store.valueListItems` (11241); `rowsById` (11253); `Calculations.globalValue` (11256); `Calculations.unstoredValue` (11257); `Calculations.related` (11263); `SQLite.iterate` (11312) | GATED-STORE |
| [packages/store/src/store.ts:11398](../../packages/store/src/store.ts#L11398) `Store/storedFileId` | `SQLite.get` (11398); `SQLite.prepare` (11398) | CORE |
| [packages/store/src/store.ts:9450](../../packages/store/src/store.ts#L9450) `Store/summaries` | `Calculations.wholeTable` (9450); `Calculations.collect` (9470, 9475) | CORE |
| [packages/store/src/store.ts:9466](../../packages/store/src/store.ts#L9466) `Store/summaries/recs` | `SQLite.iterate` (9466); `SQLite.prepare` (9466); `Store.sql` (9466) | CORE |
| [packages/store/src/store.ts:6005](../../packages/store/src/store.ts#L6005) `Store/takeWebauthnChallenge` | `SQLite.get` (6005); `SQLite.prepare` (6005, 6009); `Store.sql` (6005, 6009) | CORE |
| [packages/store/src/store.ts:7262](../../packages/store/src/store.ts#L7262) `Store/themes` | `SQLite.get` (7262) | CORE |
| [packages/store/src/store.ts:9189](../../packages/store/src/store.ts#L9189) `Store/timeFind` | `Store.query` (9189) | CORE |
| [packages/store/src/store.ts:7587](../../packages/store/src/store.ts#L7587) `Store/toRecord` | `Calculations.value` (7587, 7597); `Calculations.globalValue` (7591); `Calculations.unstoredStyled` (7596) | CORE |
| [packages/store/src/store.ts:5889](../../packages/store/src/store.ts#L5889) `Store/totpAccounts` | `SQLite.all` (5889); `SQLite.prepare` (5889); `Store.sql` (5889) | CORE |
| [packages/store/src/store.ts:1570](../../packages/store/src/store.ts#L1570) `Store/trial` | `Store.sql` (1570) | CORE |
| [packages/store/src/store.ts:1575](../../packages/store/src/store.ts#L1575) `Store/trial/undo` | `Store.sql` (1575) | CORE |
| [packages/store/src/store.ts:11354](../../packages/store/src/store.ts#L11354) `Store/truncate/run` | `Store.sql` (11354, 11356, 11363, 11365, 11367, 11368); `SQLite.prepare` (11356, 11363); `SQLite.all` (11358) | CORE |
| [packages/store/src/store.ts:3745](../../packages/store/src/store.ts#L3745) `Store/unmigratedAccounts` | `SQLite.all` (3745); `SQLite.prepare` (3745); `Store.sql` (3745) | CORE |
| [packages/store/src/store.ts:4922](../../packages/store/src/store.ts#L4922) `Store/unusedAccess` | `SQLite.get` (4922); `SQLite.prepare` (4922, 4931); `Store.sql` (4922, 4931); `SQLite.all` (4931) | CORE |
| [packages/store/src/store.ts:4970](../../packages/store/src/store.ts#L4970) `Store/unusedObjects` | `SQLite.get` (4970); `SQLite.prepare` (4970, 4973); `Store.sql` (4970, 4973); `SQLite.all` (4973) | CORE |
| [packages/store/src/store.ts:6129](../../packages/store/src/store.ts#L6129) `Store/unusedRecoveryHashes` | `SQLite.all` (6129); `SQLite.prepare` (6129); `Store.sql` (6129) | CORE |
| [packages/store/src/store.ts:4752](../../packages/store/src/store.ts#L4752) `Store/unusualAccess` | `Store.auditLog` (4752, 4818) | CORE |
| [packages/store/src/store.ts:9884](../../packages/store/src/store.ts#L9884) `Store/update` | `Store.row` (9884); `Store.sql` (9915, 9916, 9955, 9958) | CORE |
| [packages/store/src/store.ts:9918](../../packages/store/src/store.ts#L9918) `Store/update/undo` | `Store.sql` (9918) | CORE |
| [packages/store/src/store.ts:10348](../../packages/store/src/store.ts#L10348) `Store/updatePortals` | `Store.row` (10348, 10384); `relatedRows` (10385) | CORE |
| [packages/store/src/store.ts:10358](../../packages/store/src/store.ts#L10358) `Store/updatePortals/portal/related` | `relatedIdList` (10358) | CORE |
| [packages/store/src/store.ts:10330](../../packages/store/src/store.ts#L10330) `Store/updateRelated` | `relatedRows` (10330) | CORE |
| [packages/store/src/store.ts:5008](../../packages/store/src/store.ts#L5008) `Store/usageCounting` | `SQLite.get` (5008); `SQLite.prepare` (5008); `Store.sql` (5008) | CORE |
| [packages/store/src/store.ts:9127](../../packages/store/src/store.ts#L9127) `Store/userPrefs` | `SQLite.all` (9127); `SQLite.prepare` (9127); `Store.sql` (9127) | CORE |
| [packages/store/src/store.ts:8009](../../packages/store/src/store.ts#L8009) `Store/valueListItemsCurrent` | `Store.valueListItems` (8009); `Store.get` (8023); `relatedRows` (8024); `Store.row` (8024); `SQLite.iterate` (8026); `SQLite.prepare` (8026); `Store.sql` (8026); `Calculations.related` (8036); `Calculations.value` (8040, 8041) | GATED-STORE |
| [packages/store/src/store.ts:10539](../../packages/store/src/store.ts#L10539) `Store/vaultHeld` | `SQLite.get` (10539); `SQLite.prepare` (10539); `Store.sql` (10539) | CORE |
| [packages/store/src/store.ts:6089](../../packages/store/src/store.ts#L6089) `Store/verifyPasskeyCredential` | `SQLite.get` (6089); `SQLite.prepare` (6089, 6101); `Store.sql` (6089, 6101) | CORE |
| [packages/store/src/store.ts:5918](../../packages/store/src/store.ts#L5918) `Store/verifyTotp` | `SQLite.get` (5918); `SQLite.prepare` (5918, 5925); `Store.sql` (5918, 5925) | CORE |
| [packages/store/src/store.ts:2261](../../packages/store/src/store.ts#L2261) `Store/versionNumber` | `SQLite.get` (2261); `SQLite.prepare` (2261); `Store.sql` (2261) | CORE |
| [packages/store/src/store.ts:2136](../../packages/store/src/store.ts#L2136) `Store/versionTriggers` | `SQLite.get` (2136); `SQLite.prepare` (2136, 2141, 2142); `Store.sql` (2136, 2141, 2142, 2159, 2161, 2162, 2164); `SQLite.all` (2141, 2142) | CORE |
| [packages/store/src/store.ts:2104](../../packages/store/src/store.ts#L2104) `Store/warmSummariesCurrent` | `Calculations.wholeTable` (2104) | CORE |
| [packages/store/src/store.ts:4348](../../packages/store/src/store.ts#L4348) `Store/webViewerChecked` | `SQLite.get` (4348); `SQLite.prepare` (4348); `Store.sql` (4348) | CORE |
| [packages/store/src/store.ts:1862](../../packages/store/src/store.ts#L1862) `Store/withWriteTransaction` | `Store.sql` (1862, 1874, 1880, 1882, 1882) | CORE |
| [packages/store/src/store.ts:7522](../../packages/store/src/store.ts#L7522) `Store/wordIndex` | `Store.sql` (7522, 7530, 7535); `Store.recordCount` (7534); `SQLite.get` (7535); `SQLite.prepare` (7535) | CORE |
| [packages/store/src/store.ts:8707](../../packages/store/src/store.ts#L8707) `Store/writeExternalFile` | `Store.evaluateEach` (8707); `SQLite.prepare` (8730); `Store.sql` (8730) | CORE |
| [packages/store/src/store.ts:8731](../../packages/store/src/store.ts#L8731) `Store/writeExternalFile/taken` | `SQLite.get` (8731) | CORE |
| [packages/store/src/store.ts:5748](../../packages/store/src/store.ts#L5748) `Store/writeObjectUseRows` | `SQLite.prepare` (5748, 5749, 5754); `Store.sql` (5748, 5749, 5754) | CORE |
| [packages/store/src/store.ts:2316](../../packages/store/src/store.ts#L2316) `Store/writeToken` | `SQLite.get` (2316); `SQLite.prepare` (2316); `Store.sql` (2316) | CORE |
| [packages/store/src/store.ts:5720](../../packages/store/src/store.ts#L5720) `Store/writeUsage` | `Store.sql` (5720, 5721, 5723, 5727, 5729) | CORE |
| [packages/store/src/store.ts:5736](../../packages/store/src/store.ts#L5736) `Store/writeUsageRows` | `SQLite.prepare` (5736, 5737, 5743); `Store.sql` (5736, 5737, 5743) | CORE |
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
