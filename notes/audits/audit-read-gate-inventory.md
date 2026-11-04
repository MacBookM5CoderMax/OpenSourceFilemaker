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
| [packages/store/src/store.ts:5557](../../packages/store/src/store.ts#L5557) `Store/accountIdentityId` | `SQLite.get` (5557, 5563); `SQLite.prepare` (5557, 5562, 5563); `Store.sql` (5557, 5562, 5563) | CORE |
| [packages/store/src/store.ts:5551](../../packages/store/src/store.ts#L5551) `Store/accountIdentityIdIfSet` | `SQLite.get` (5551); `SQLite.prepare` (5551); `Store.sql` (5551) | CORE |
| [packages/store/src/store.ts:5513](../../packages/store/src/store.ts#L5513) `Store/accountInactive` | `SQLite.get` (5513); `SQLite.prepare` (5513); `Store.sql` (5513) | CORE |
| [packages/store/src/store.ts:5710](../../packages/store/src/store.ts#L5710) `Store/accountLocalOnly` | `SQLite.get` (5710); `SQLite.prepare` (5710); `Store.sql` (5710) | CORE |
| [packages/store/src/store.ts:6579](../../packages/store/src/store.ts#L6579) `Store/accountPrivilegeSet` | `SQLite.get` (6579); `SQLite.prepare` (6579); `Store.sql` (6579) | CORE |
| [packages/store/src/store.ts:5715](../../packages/store/src/store.ts#L5715) `Store/accountRequires2fa` | `SQLite.get` (5715); `SQLite.prepare` (5715); `Store.sql` (5715) | CORE |
| [packages/store/src/store.ts:3873](../../packages/store/src/store.ts#L3873) `Store/accounts` | `SQLite.all` (3873); `SQLite.prepare` (3873); `Store.sql` (3873) | CORE |
| [packages/store/src/store.ts:3869](../../packages/store/src/store.ts#L3869) `Store/accountsSharingLockout` | `SQLite.all` (3869); `SQLite.prepare` (3869); `Store.sql` (3869) | CORE |
| [packages/store/src/store.ts:5935](../../packages/store/src/store.ts#L5935) `Store/accountUsage` | `SQLite.get` (5935); `SQLite.prepare` (5935, 5936); `Store.sql` (5935, 5936); `SQLite.all` (5936); `Store.auditLog` (5952) | CORE |
| [packages/store/src/store.ts:8818](../../packages/store/src/store.ts#L8818) `Store/addContainer` | `SQLite.all` (8818); `SQLite.prepare` (8818, 8823, 8837, 8841, 8842); `Store.sql` (8818, 8823, 8837, 8839, 8841, 8842, 8844, 8847); `SQLite.get` (8828); `Store.containerRange` (8830) | CORE |
| [packages/store/src/store.ts:8864](../../packages/store/src/store.ts#L8864) `Store/addExternalContainer` | `SQLite.prepare` (8864); `Store.sql` (8864) | CORE |
| [packages/store/src/store.ts:9341](../../packages/store/src/store.ts#L9341) `Store/addFieldIndex` | `Store.sql` (9341) | CORE |
| [packages/store/src/store.ts:7463](../../packages/store/src/store.ts#L7463) `Store/addImage` | `Store.sql` (7463, 7464); `SQLite.prepare` (7464) | CORE |
| [packages/store/src/store.ts:6629](../../packages/store/src/store.ts#L6629) `Store/addProvisionedAccount` | `SQLite.get` (6629); `SQLite.prepare` (6629, 6633); `Store.sql` (6629, 6633) | CORE |
| [packages/store/src/store.ts:7923](../../packages/store/src/store.ts#L7923) `Store/addRelated` | `relatedRows` (7923); `rowsById` (7958); `firstRelatedEach` (7984) | CORE |
| [packages/store/src/store.ts:7911](../../packages/store/src/store.ts#L7911) `Store/addRelated/summaries` | `Calculations.summary` (7911) | CORE |
| [packages/store/src/store.ts:3891](../../packages/store/src/store.ts#L3891) `Store/agentNeedsApproval` | `SQLite.get` (3891); `SQLite.prepare` (3891); `Store.sql` (3891) | CORE |
| [packages/store/src/store.ts:6856](../../packages/store/src/store.ts#L6856) `Store/allowedIds` | `SQLite.iterate` (6856); `SQLite.prepare` (6856); `Store.sql` (6856) | CORE |
| [packages/store/src/store.ts:5992](../../packages/store/src/store.ts#L5992) `Store/apiToken` | `SQLite.get` (5992); `SQLite.prepare` (5992, 6010); `Store.sql` (5992, 6010) | CORE |
| [packages/store/src/store.ts:5968](../../packages/store/src/store.ts#L5968) `Store/apiTokens` | `SQLite.all` (5968); `SQLite.prepare` (5968); `Store.sql` (5968) | CORE |
| [packages/store/src/store.ts:4291](../../packages/store/src/store.ts#L4291) `Store/appendSecurityEvent` | `Store.sql` (4291) | CORE |
| [packages/store/src/store.ts:3331](../../packages/store/src/store.ts#L3331) `Store/appendSecurityRow` | `Store.sql` (3331) | CORE |
| [packages/store/src/store.ts:5333](../../packages/store/src/store.ts#L5333) `Store/applyAccountImport` | `Store.sql` (5333, 5341, 5370); `SQLite.get` (5341); `SQLite.prepare` (5341, 5370) | CORE |
| [packages/store/src/store.ts:2601](../../packages/store/src/store.ts#L2601) `Store/applyDesign` | `Store.sql` (2601, 2602, 2622, 2625, 2630, 2646, 2649, 2649); `SQLite.prepare` (2625, 2630) | CORE |
| [packages/store/src/store.ts:4135](../../packages/store/src/store.ts#L4135) `Store/approvePending` | `SQLite.get` (4135); `SQLite.prepare` (4135, 4147); `Store.sql` (4135, 4147) | CORE |
| [packages/store/src/store.ts:3122](../../packages/store/src/store.ts#L3122) `Store/audit/write` | `Store.sql` (3122) | CORE |
| [packages/store/src/store.ts:2713](../../packages/store/src/store.ts#L2713) `Store/auditLog` | `SQLite.all` (2713); `SQLite.prepare` (2713); `Store.sql` (2713) | CORE |
| [packages/store/src/store.ts:2133](../../packages/store/src/store.ts#L2133) `Store/backup` | `Store.sql` (2133) | CORE |
| [packages/store/src/store.ts:3897](../../packages/store/src/store.ts#L3897) `Store/blankPasswordAccounts` | `SQLite.all` (3897); `SQLite.prepare` (3897); `Store.sql` (3897) | CORE |
| [packages/store/src/store.ts:5262](../../packages/store/src/store.ts#L5262) `Store/canonicalAccount` | `SQLite.all` (5262); `SQLite.prepare` (5262); `Store.sql` (5262) | CORE |
| [packages/store/src/store.ts:9928](../../packages/store/src/store.ts#L9928) `Store/canView` | `Store.canView` (9928); `Store.row` (9929) | GATED-STORE |
| [packages/store/src/store.ts:9910](../../packages/store/src/store.ts#L9910) `Store/canViewRecord` | `SQLite.get` (9910); `SQLite.prepare` (9910); `Store.sql` (9910) | GATED-STORE |
| [packages/store/src/store.ts:11011](../../packages/store/src/store.ts#L11011) `Store/cascadeDelete` | `relatedRows` (11011) | CORE |
| [packages/store/src/store.ts:2434](../../packages/store/src/store.ts#L2434) `Store/changeOne` | `Store.sql` (2434, 2436) | CORE |
| [packages/store/src/store.ts:2437](../../packages/store/src/store.ts#L2437) `Store/changeOne/read` | `SQLite.get` (2437); `SQLite.prepare` (2437); `Store.sql` (2437) | CORE |
| [packages/store/src/store.ts:9199](../../packages/store/src/store.ts#L9199) `Store/checkContainerWrite` | `Store.row` (9199) | CORE |
| [packages/store/src/store.ts:10632](../../packages/store/src/store.ts#L10632) `Store/checkEditable` | `Store.row` (10632) | CORE |
| [packages/store/src/store.ts:1679](../../packages/store/src/store.ts#L1679) `Store/checkpoint` | `SQLite.get` (1679); `SQLite.prepare` (1679); `Store.sql` (1679) | CORE |
| [packages/store/src/store.ts:4034](../../packages/store/src/store.ts#L4034) `Store/checkProposedWrite` | `Store.row` (4034); `relatedRows` (4048) | CORE |
| [packages/store/src/store.ts:6615](../../packages/store/src/store.ts#L6615) `Store/clearAccountPrivilegeSet` | `SQLite.prepare` (6615); `Store.sql` (6615) | CORE |
| [packages/store/src/store.ts:1701](../../packages/store/src/store.ts#L1701) `Store/close` | `Store.sql` (1701) | CORE |
| [packages/store/src/store.ts:9167](../../packages/store/src/store.ts#L9167) `Store/compactFile` | `Store.sql` (9167, 9168, 9170) | CORE |
| [packages/store/src/store.ts:9578](../../packages/store/src/store.ts#L9578) `Store/computedRows` | `Store.sql` (9578, 9581, 9582, 9583, 9585, 9595, 9596, 9597, 9600); `SQLite.prepare` (9581, 9583, 9585, 9595); `SQLite.iterate` (9585); `Calculations.globalValue` (9588); `Calculations.unstoredValue` (9589); `Calculations.related` (9592); `SQLite.all` (9595) | CORE |
| [packages/store/src/store.ts:11138](../../packages/store/src/store.ts#L11138) `Store/computeValuesCurrent` | `Store.computeValues` (11138); `Store.sql` (11144, 11148); `SQLite.all` (11148); `SQLite.prepare` (11148) | GATED-STORE |
| [packages/store/src/store.ts:6037](../../packages/store/src/store.ts#L6037) `Store/confirmTotp` | `SQLite.get` (6037); `SQLite.prepare` (6037, 6039); `Store.sql` (6037, 6039) | CORE |
| [packages/store/src/store.ts:1309](../../packages/store/src/store.ts#L1309) `Store/constructor` | `Store.sql` (1309, 1311, 1313, 1314, 1318, 1322, 1323, 1332, 1340, 1356, 1361, 1366, 1367, 1371, 1372, 1373, 1380, 1384, 1388, 1389, 1390, 1392, 1402, 1403, 1407, 1410, 1411, 1413, 1414, 1417, 1418, 1422, 1423, 1427, 1428, 1431, 1434, 1435, 1437, 1440, 1441, 1445, 1446, 1450, 1451, 1455, 1456, 1457, 1460, 1461, 1464, 1465, 1467, 1467, 1468, 1468, 1469, 1473, 1475, 1479, 1481, 1484, 1485, 1486, 1489, 1490, 1492, 1494, 1495, 1499, 1500, 1502, 1514, 1516, 1517, 1518, 1518, 1522, 1523); `SQLite.get` (1313, 1332); `SQLite.prepare` (1313, 1332, 1340, 1392, 1410, 1411, 1414, 1417, 1422, 1427, 1434, 1440, 1445, 1450, 1460, 1464, 1467, 1468, 1489, 1494, 1499); `SQLite.all` (1410, 1417, 1422, 1427, 1434, 1440, 1445, 1450, 1460, 1464, 1467, 1468, 1489, 1494, 1499) | CORE |
| [packages/store/src/store.ts:6395](../../packages/store/src/store.ts#L6395) `Store/consumeRecoveryCode` | `SQLite.prepare` (6395); `Store.sql` (6395) | CORE |
| [packages/store/src/store.ts:8742](../../packages/store/src/store.ts#L8742) `Store/container` | `SQLite.get` (8742); `SQLite.prepare` (8742, 8751); `Store.sql` (8742, 8751); `SQLite.all` (8751) | CORE |
| [packages/store/src/store.ts:9176](../../packages/store/src/store.ts#L9176) `Store/containerId` | `Store.containerId` (9176); `Store.row` (9177) | CORE |
| [packages/store/src/store.ts:8759](../../packages/store/src/store.ts#L8759) `Store/containerInfo` | `SQLite.get` (8759); `SQLite.prepare` (8759); `Store.sql` (8759) | CORE |
| [packages/store/src/store.ts:8723](../../packages/store/src/store.ts#L8723) `Store/containerIntact` | `SQLite.get` (8723); `SQLite.prepare` (8723); `Store.sql` (8723) | CORE |
| [packages/store/src/store.ts:8662](../../packages/store/src/store.ts#L8662) `Store/containerIntegrityReport` | `SQLite.all` (8662); `SQLite.prepare` (8662, 8673); `Store.sql` (8662, 8673); `SQLite.get` (8673) | CORE |
| [packages/store/src/store.ts:8737](../../packages/store/src/store.ts#L8737) `Store/containerMeta` | `SQLite.get` (8737); `SQLite.prepare` (8737); `Store.sql` (8737) | CORE |
| [packages/store/src/store.ts:8793](../../packages/store/src/store.ts#L8793) `Store/containerRange` | `SQLite.all` (8793); `SQLite.prepare` (8793, 8800); `Store.sql` (8793, 8800); `SQLite.get` (8800) | CORE |
| [packages/store/src/store.ts:8564](../../packages/store/src/store.ts#L8564) `Store/containerReferences` | `SQLite.all` (8564, 8583, 8585, 8591, 8604, 8615, 8629); `SQLite.prepare` (8564, 8583, 8585, 8591, 8604, 8615, 8627, 8629); `Store.sql` (8564, 8583, 8585, 8591, 8604, 8615, 8627, 8629); `SQLite.get` (8627); `Store.row` (8638) | CORE |
| [packages/store/src/store.ts:11117](../../packages/store/src/store.ts#L11117) `Store/countIds` | `Store.countIds` (11117); `SQLite.get` (11122); `SQLite.prepare` (11122); `Store.sql` (11122) | GATED-STORE |
| [packages/store/src/store.ts:9959](../../packages/store/src/store.ts#L9959) `Store/create` | `SQLite.get` (9959); `SQLite.prepare` (9959, 9972); `Store.sql` (9959, 9972) | CORE |
| [packages/store/src/store.ts:4263](../../packages/store/src/store.ts#L4263) `Store/createAccountOnly` | `SQLite.get` (4263); `SQLite.prepare` (4263, 4267, 4273, 4278, 4283); `Store.sql` (4263, 4267, 4273, 4278, 4283) | CORE |
| [packages/store/src/store.ts:5768](../../packages/store/src/store.ts#L5768) `Store/createApiToken` | `SQLite.get` (5768, 5796); `SQLite.prepare` (5768, 5795, 5796, 5806); `Store.sql` (5768, 5795, 5796, 5806) | CORE |
| [packages/store/src/store.ts:5274](../../packages/store/src/store.ts#L5274) `Store/createLocalAccount` | `SQLite.prepare` (5274); `Store.sql` (5274) | CORE |
| [packages/store/src/store.ts:3863](../../packages/store/src/store.ts#L3863) `Store/credentialIdentity` | `SQLite.get` (3863); `SQLite.prepare` (3863); `Store.sql` (3863) | CORE |
| [packages/store/src/store.ts:5689](../../packages/store/src/store.ts#L5689) `Store/credentialStamp` | `SQLite.get` (5689); `SQLite.prepare` (5689); `Store.sql` (5689) | CORE |
| [packages/store/src/store.ts:7296](../../packages/store/src/store.ts#L7296) `Store/crossFileBusy` | `Store.sql` (7296) | AUTH |
| [packages/store/src/store.ts:7268](../../packages/store/src/store.ts#L7268) `Store/crossFileHash` | `SQLite.get` (7268); `SQLite.prepare` (7268); `Store.sql` (7268) | AUTH |
| [packages/store/src/store.ts:2223](../../packages/store/src/store.ts#L2223) `Store/dataVersion` | `SQLite.get` (2223); `SQLite.prepare` (2223); `Store.sql` (2223) | CORE |
| [packages/store/src/store.ts:11685](../../packages/store/src/store.ts#L11685) `Store/decimalViewSql` | `SQLite.all` (11685); `SQLite.prepare` (11685) | CORE |
| [packages/store/src/store.ts:10677](../../packages/store/src/store.ts#L10677) `Store/delete` | `Store.row` (10677) | CORE |
| [packages/store/src/store.ts:10685](../../packages/store/src/store.ts#L10685) `Store/delete/run` | `SQLite.get` (10685); `SQLite.prepare` (10685, 10690); `Store.sql` (10685, 10690) | CORE |
| [packages/store/src/store.ts:5428](../../packages/store/src/store.ts#L5428) `Store/deleteAccount` | `SQLite.prepare` (5428, 5432, 5433, 5434, 5435, 5436, 5437, 5438, 5439, 5446, 5448, 5450, 5452, 5456); `Store.sql` (5428, 5432, 5433, 5434, 5435, 5436, 5437, 5438, 5439, 5446, 5448, 5450, 5452, 5456) | CORE |
| [packages/store/src/store.ts:10758](../../packages/store/src/store.ts#L10758) `Store/deleteBeingUndone` | `SQLite.all` (10758); `SQLite.prepare` (10758); `Store.sql` (10758) | CORE |
| [packages/store/src/store.ts:3499](../../packages/store/src/store.ts#L3499) `Store/deletedRows` | `SQLite.get` (3499); `SQLite.prepare` (3499, 3501, 3501); `Store.sql` (3499, 3501, 3501); `SQLite.all` (3501, 3501) | CORE |
| [packages/store/src/store.ts:10770](../../packages/store/src/store.ts#L10770) `Store/deleteEndingTheLifeAt` | `SQLite.get` (10770); `SQLite.prepare` (10770); `Store.sql` (10770) | CORE |
| [packages/store/src/store.ts:6480](../../packages/store/src/store.ts#L6480) `Store/deletePrivilegeSet` | `SQLite.prepare` (6480); `Store.sql` (6480) | CORE |
| [packages/store/src/store.ts:4401](../../packages/store/src/store.ts#L4401) `Store/deleteScriptTest` | `SQLite.prepare` (4401); `Store.sql` (4401) | CORE |
| [packages/store/src/store.ts:10660](../../packages/store/src/store.ts#L10660) `Store/deleteVisibility` | `Store.canViewRecord` (10660) | CORE |
| [packages/store/src/store.ts:7405](../../packages/store/src/store.ts#L7405) `Store/design` | `SQLite.get` (7405) | CORE |
| [packages/store/src/store.ts:3609](../../packages/store/src/store.ts#L3609) `Store/designEffect` | `Store.sql` (3609, 3610, 3616, 3617, 3620, 3626, 3631, 3634, 3640, 3651, 3652, 3654, 3655, 3668, 3669, 3672, 3674, 3680, 3681, 3682, 3688, 3690, 3694, 3697, 3698, 3700, 3703, 3709, 3711, 3718, 3719, 3721, 3722, 3723, 3724, 3731, 3732, 3734, 3734, 3736, 3737, 3738, 3742, 3746, 3748, 3786, 3788, 3790); `SQLite.prepare` (3620, 3651, 3652, 3668, 3669, 3680, 3681, 3688, 3690, 3694, 3698, 3709, 3711, 3724, 3731, 3732, 3734, 3736, 3738, 3742, 3746); `SQLite.get` (3651, 3668, 3680, 3681, 3694, 3698, 3734, 3742); `SQLite.all` (3731, 3732); `SQLite.iterate` (3736) | CORE |
| [packages/store/src/store.ts:3602](../../packages/store/src/store.ts#L3602) `Store/designEffect/renameExcluded` | `SQLite.prepare` (3602); `Store.sql` (3602) | CORE |
| [packages/store/src/store.ts:3586](../../packages/store/src/store.ts#L3586) `Store/designEffect/renameKey` | `SQLite.prepare` (3586); `Store.sql` (3586) | CORE |
| [packages/store/src/store.ts:3540](../../packages/store/src/store.ts#L3540) `Store/designHistory` | `SQLite.all` (3540); `SQLite.prepare` (3540); `Store.sql` (3540) | CORE |
| [packages/store/src/store.ts:6058](../../packages/store/src/store.ts#L6058) `Store/disableTotp` | `SQLite.prepare` (6058); `Store.sql` (6058) | CORE |
| [packages/store/src/store.ts:3798](../../packages/store/src/store.ts#L3798) `Store/dropColumnIndexes` | `SQLite.all` (3798, 3800); `SQLite.prepare` (3798, 3800); `Store.sql` (3798, 3800, 3801) | CORE |
| [packages/store/src/store.ts:9353](../../packages/store/src/store.ts#L9353) `Store/dropFieldIndex` | `SQLite.get` (9353); `SQLite.prepare` (9353); `Store.sql` (9353, 9354) | CORE |
| [packages/store/src/store.ts:9996](../../packages/store/src/store.ts#L9996) `Store/duplicate` | `Store.row` (9996); `SQLite.prepare` (10014); `Store.sql` (10014) | CORE |
| [packages/store/src/store.ts:8980](../../packages/store/src/store.ts#L8980) `Store/embeddedContainerCount` | `SQLite.prepare` (8980); `Store.sql` (8980); `SQLite.get` (8981) | CORE |
| [packages/store/src/store.ts:8966](../../packages/store/src/store.ts#L8966) `Store/embeddedContainers` | `SQLite.prepare` (8966, 8967); `Store.sql` (8966, 8967); `SQLite.all` (8967); `SQLite.get` (8971) | CORE |
| [packages/store/src/store.ts:3525](../../packages/store/src/store.ts#L3525) `Store/emptyDeleted` | `Store.sql` (3525, 3528, 3529, 3531, 3533); `SQLite.prepare` (3529) | CORE |
| [packages/store/src/store.ts:2099](../../packages/store/src/store.ts#L2099) `Store/endTransaction` | `Store.sql` (2099, 2102, 2102) | CORE |
| [packages/store/src/store.ts:6026](../../packages/store/src/store.ts#L6026) `Store/enrollTotp` | `SQLite.prepare` (6026); `Store.sql` (6026) | CORE |
| [packages/store/src/store.ts:3494](../../packages/store/src/store.ts#L3494) `Store/ensureDeleted` | `Store.sql` (3494) | CORE |
| [packages/store/src/store.ts:1533](../../packages/store/src/store.ts#L1533) `Store/ensureNativeIds` | `SQLite.all` (1533, 1545); `SQLite.prepare` (1533, 1536, 1544, 1545); `Store.sql` (1533, 1536, 1539, 1543, 1544, 1545, 1548, 1550) | CORE |
| [packages/store/src/store.ts:2345](../../packages/store/src/store.ts#L2345) `Store/ensureRecordIdHighWater` | `Store.sql` (2345, 2346, 2348, 2350, 2352) | CORE |
| [packages/store/src/store.ts:2364](../../packages/store/src/store.ts#L2364) `Store/ensureRecordIdMarks` | `SQLite.all` (2364, 2367, 2370, 2379); `SQLite.prepare` (2364, 2367, 2370, 2373, 2379, 2382); `Store.sql` (2364, 2367, 2370, 2373, 2379, 2382, 2386, 2387) | CORE |
| [packages/store/src/store.ts:10329](../../packages/store/src/store.ts#L10329) `Store/evaluateCurrent` | `Store.row` (10329, 10329, 10330, 10330); `Calculations.context` (10335); `Store.get` (10336, 10338) | GATED-STORE |
| [packages/store/src/store.ts:10370](../../packages/store/src/store.ts#L10370) `Store/evaluateEachCurrent` | `Store.row` (10370, 10370, 10375); `Calculations.context` (10376); `Store.get` (10378) | GATED-STORE |
| [packages/store/src/store.ts:10432](../../packages/store/src/store.ts#L10432) `Store/evaluateRowsCurrent` | `Store.row` (10432, 10432, 10433, 10433) | GATED-STORE |
| [packages/store/src/store.ts:10411](../../packages/store/src/store.ts#L10411) `Store/evaluateRowsCurrent/each` | `Calculations.context` (10411); `Store.get` (10413) | GATED-STORE |
| [packages/store/src/store.ts:10447](../../packages/store/src/store.ts#L10447) `Store/evaluateRowsCurrent/found/[Symbol.iterator]` | `rowsById` (10447) | GATED-STORE |
| [packages/store/src/store.ts:10469](../../packages/store/src/store.ts#L10469) `Store/evaluateRowsCurrent/key` | `Calculations.context` (10469) | GATED-STORE |
| [packages/store/src/store.ts:4179](../../packages/store/src/store.ts#L4179) `Store/externalAccount` | `SQLite.all` (4179); `SQLite.prepare` (4179); `Store.sql` (4179) | CORE |
| [packages/store/src/store.ts:8485](../../packages/store/src/store.ts#L8485) `Store/externalContainerCheck` | `SQLite.all` (8485); `SQLite.prepare` (8485); `Store.sql` (8485) | CORE |
| [packages/store/src/store.ts:8492](../../packages/store/src/store.ts#L8492) `Store/externalContainerCount` | `SQLite.get` (8492); `SQLite.prepare` (8492); `Store.sql` (8492) | CORE |
| [packages/store/src/store.ts:8501](../../packages/store/src/store.ts#L8501) `Store/externalContainerReport` | `SQLite.all` (8501, 8514); `SQLite.prepare` (8501, 8514); `Store.sql` (8501, 8514) | CORE |
| [packages/store/src/store.ts:5539](../../packages/store/src/store.ts#L5539) `Store/externalIdentityId` | `SQLite.get` (5539, 5546); `SQLite.prepare` (5539, 5545, 5546); `Store.sql` (5539, 5545, 5546) | CORE |
| [packages/store/src/store.ts:8733](../../packages/store/src/store.ts#L8733) `Store/externalOf` | `SQLite.get` (8733); `SQLite.prepare` (8733); `Store.sql` (8733) | CORE |
| [packages/store/src/store.ts:3275](../../packages/store/src/store.ts#L3275) `Store/failureAuditRoom` | `SQLite.get` (3275); `SQLite.prepare` (3275); `Store.sql` (3275) | CORE |
| [packages/store/src/store.ts:8132](../../packages/store/src/store.ts#L8132) `Store/fieldIndexCurrent` | `SQLite.iterate` (8132); `SQLite.prepare` (8132, 8137); `Store.sql` (8132, 8137); `SQLite.all` (8137) | GATED-STORE |
| [packages/store/src/store.ts:9393](../../packages/store/src/store.ts#L9393) `Store/find` | `Store.find` (9393) | GATED-STORE |
| [packages/store/src/store.ts:9765](../../packages/store/src/store.ts#L9765) `Store/findCandidates` | `Store.query` (9765) | CORE |
| [packages/store/src/store.ts:9404](../../packages/store/src/store.ts#L9404) `Store/findHere` | `Store.query` (9404, 9409, 9411, 9425, 9427, 9438); `Store.recordCount` (9422); `SQLite.get` (9423, 9427); `SQLite.prepare` (9423, 9427, 9433, 9440, 9449); `Store.sql` (9423, 9427, 9433, 9440, 9449); `SQLite.all` (9433, 9440, 9449) | GATED-STORE |
| [packages/store/src/store.ts:9444](../../packages/store/src/store.ts#L9444) `Store/findHere/[Symbol.iterator]` | `SQLite.iterate` (9444); `SQLite.prepare` (9444); `Store.sql` (9444) | GATED-STORE |
| [packages/store/src/store.ts:11250](../../packages/store/src/store.ts#L11250) `Store/findIdsCurrent` | `Store.findIds` (11250) | GATED-STORE |
| [packages/store/src/store.ts:11185](../../packages/store/src/store.ts#L11185) `Store/findIdsCurrentProgress` | `Store.findIdsProgress` (11185); `Store.query` (11187, 11189, 11202, 11204); `Store.recordCount` (11194, 11222); `SQLite.iterate` (11219); `SQLite.prepare` (11219, 11227, 11228); `Store.sql` (11219, 11227, 11228); `SQLite.get` (11231); `SQLite.all` (11237) | GATED-STORE |
| [packages/store/src/store.ts:11256](../../packages/store/src/store.ts#L11256) `Store/findIdsHere` | `Store.query` (11256, 11262, 11264); `SQLite.iterate` (11275); `SQLite.prepare` (11275); `Store.sql` (11275) | GATED-STORE |
| [packages/store/src/store.ts:9709](../../packages/store/src/store.ts#L9709) `Store/findSource` | `Store.query` (9709); `SQLite.all` (9718, 9735); `SQLite.prepare` (9718, 9726, 9734); `Store.sql` (9718, 9723, 9726, 9731, 9734, 9748, 9750); `Calculations.globalValue` (9740); `Calculations.unstoredValue` (9741); `Calculations.related` (9745) | CORE |
| [packages/store/src/store.ts:3387](../../packages/store/src/store.ts#L3387) `Store/flushDeferredSecurity` | `Store.sql` (3387) | CORE |
| [packages/store/src/store.ts:5395](../../packages/store/src/store.ts#L5395) `Store/forgetStandIns` | `SQLite.prepare` (5395); `Store.sql` (5395) | CORE |
| [packages/store/src/store.ts:10725](../../packages/store/src/store.ts#L10725) `Store/forgetStandInValues` | `Store.sql` (10725, 10746); `SQLite.prepare` (10746) | CORE |
| [packages/store/src/store.ts:8013](../../packages/store/src/store.ts#L8013) `Store/foundSetPage` | `rowsById` (8013) | CORE |
| [packages/store/src/store.ts:8029](../../packages/store/src/store.ts#L8029) `Store/foundSetRowsCurrent` | `Store.viewableIds` (8029); `Store.row` (8045) | GATED-STORE |
| [packages/store/src/store.ts:4097](../../packages/store/src/store.ts#L4097) `Store/gateAgentWrite` | `SQLite.get` (4097); `SQLite.prepare` (4097, 4099); `Store.sql` (4097, 4099) | CORE |
| [packages/store/src/store.ts:6333](../../packages/store/src/store.ts#L6333) `Store/generateRecoveryCodes` | `SQLite.prepare` (6333, 6336); `Store.sql` (6333, 6336) | CORE |
| [packages/store/src/store.ts:9838](../../packages/store/src/store.ts#L9838) `Store/getCurrent` | `Store.get` (9838); `Store.row` (9839, 9839, 9853); `SQLite.all` (9856); `SQLite.prepare` (9856); `Store.sql` (9856) | GATED-STORE |
| [packages/store/src/store.ts:9876](../../packages/store/src/store.ts#L9876) `Store/getManyCurrent` | `Store.getMany` (9876); `SQLite.get` (9894); `SQLite.prepare` (9894); `Store.sql` (9894) | GATED-STORE |
| [packages/store/src/store.ts:9887](../../packages/store/src/store.ts#L9887) `Store/getManyCurrent/[Symbol.iterator]` | `rowsById` (9887) | GATED-STORE |
| [packages/store/src/store.ts:1580](../../packages/store/src/store.ts#L1580) `Store/grantFullAccessClients` | `SQLite.prepare` (1580); `Store.sql` (1580) | CORE |
| [packages/store/src/store.ts:11292](../../packages/store/src/store.ts#L11292) `Store/groupSummariesCurrent` | `Store.groupSummaries` (11292); `Store.viewableIds` (11297); `Calculations.collect` (11313); `rowsById` (11313, 11363); `Calculations.collector` (11335) | GATED-STORE |
| [packages/store/src/store.ts:11361](../../packages/store/src/store.ts#L11361) `Store/groupSummariesCurrent/flush` | `Calculations.collector` (11361) | GATED-STORE |
| [packages/store/src/store.ts:11325](../../packages/store/src/store.ts#L11325) `Store/groupSummariesCurrent/key` | `Calculations.value` (11325); `Calculations.related` (11327) | GATED-STORE |
| [packages/store/src/store.ts:1607](../../packages/store/src/store.ts#L1607) `Store/hasOwnPassword` | `SQLite.get` (1607); `SQLite.prepare` (1607); `Store.sql` (1607) | CORE |
| [packages/store/src/store.ts:6188](../../packages/store/src/store.ts#L6188) `Store/hasPasskey` | `SQLite.get` (6188); `SQLite.prepare` (6188); `Store.sql` (6188) | CORE |
| [packages/store/src/store.ts:1588](../../packages/store/src/store.ts#L1588) `Store/hasProvingPassword` | `SQLite.get` (1588); `SQLite.prepare` (1588); `Store.sql` (1588) | CORE |
| [packages/store/src/store.ts:9307](../../packages/store/src/store.ts#L9307) `Store/hasTable` | `SQLite.get` (9307); `SQLite.prepare` (9307); `Store.sql` (9307) | CORE |
| [packages/store/src/store.ts:6047](../../packages/store/src/store.ts#L6047) `Store/hasTotp` | `SQLite.get` (6047); `SQLite.prepare` (6047); `Store.sql` (6047) | CORE |
| [packages/store/src/store.ts:5518](../../packages/store/src/store.ts#L5518) `Store/identityAllowed` | `SQLite.get` (5518, 5524, 5530); `SQLite.prepare` (5518, 5524, 5530); `Store.sql` (5518, 5524, 5530) | CORE |
| [packages/store/src/store.ts:7440](../../packages/store/src/store.ts#L7440) `Store/image` | `SQLite.get` (7440); `SQLite.prepare` (7440); `Store.sql` (7440) | CORE |
| [packages/store/src/store.ts:7450](../../packages/store/src/store.ts#L7450) `Store/images` | `SQLite.all` (7450); `SQLite.prepare` (7450); `Store.sql` (7450) | CORE |
| [packages/store/src/store.ts:5239](../../packages/store/src/store.ts#L5239) `Store/importAccounts` | `SQLite.all` (5239); `SQLite.prepare` (5239); `Store.sql` (5239) | CORE |
| [packages/store/src/store.ts:1921](../../packages/store/src/store.ts#L1921) `Store/independentWindowWrite` | `SQLite.get` (1921); `SQLite.prepare` (1921, 1929, 1989); `Store.sql` (1921, 1929, 1939, 1967, 1984, 1989, 1992); `SQLite.all` (1929); `Store.row` (1987) | CORE |
| [packages/store/src/store.ts:9319](../../packages/store/src/store.ts#L9319) `Store/indexedFields` | `SQLite.all` (9319, 9320); `SQLite.prepare` (9319, 9320); `Store.sql` (9319, 9320) | CORE |
| [packages/store/src/store.ts:11718](../../packages/store/src/store.ts#L11718) `Store/internalRoots` | `SQLite.get` (11718); `SQLite.prepare` (11718, 11720); `SQLite.all` (11720) | CORE |
| [packages/store/src/store.ts:3885](../../packages/store/src/store.ts#L3885) `Store/isAgent` | `SQLite.get` (3885); `SQLite.prepare` (3885); `Store.sql` (3885) | CORE |
| [packages/store/src/store.ts:3988](../../packages/store/src/store.ts#L3988) `Store/isExternal` | `SQLite.get` (3988); `SQLite.prepare` (3988); `Store.sql` (3988) | CORE |
| [packages/store/src/store.ts:6102](../../packages/store/src/store.ts#L6102) `Store/issueWebauthnChallenge` | `SQLite.prepare` (6102, 6104, 6105, 6107); `Store.sql` (6102, 6104, 6105, 6107); `SQLite.get` (6104) | CORE |
| [packages/store/src/store.ts:11579](../../packages/store/src/store.ts#L11579) `Store/iterateCommitted` | `SQLite.iterate` (11579) | CORE |
| [packages/store/src/store.ts:1861](../../packages/store/src/store.ts#L1861) `Store/joinTransaction` | `Store.sql` (1861, 1862, 1864, 1866, 1872, 1875) | CORE |
| [packages/store/src/store.ts:10958](../../packages/store/src/store.ts#L10958) `Store/keyStepWork` | `Store.sql` (10958, 10964, 10968, 10970) | CORE |
| [packages/store/src/store.ts:7256](../../packages/store/src/store.ts#L7256) `Store/knownSharedAccount` | `SQLite.get` (7256); `SQLite.prepare` (7256); `Store.sql` (7256) | CORE |
| [packages/store/src/store.ts:4712](../../packages/store/src/store.ts#L4712) `Store/lastSignIns` | `Store.auditLog` (4712) | CORE |
| [packages/store/src/store.ts:10776](../../packages/store/src/store.ts#L10776) `Store/latestDeleteSeq` | `SQLite.get` (10776); `SQLite.prepare` (10776); `Store.sql` (10776) | CORE |
| [packages/store/src/store.ts:7483](../../packages/store/src/store.ts#L7483) `Store/layout` | `SQLite.get` (7483); `SQLite.prepare` (7483); `Store.sql` (7483) | CORE |
| [packages/store/src/store.ts:3557](../../packages/store/src/store.ts#L3557) `Store/layoutHistory` | `SQLite.all` (3557); `SQLite.prepare` (3557); `Store.sql` (3557) | CORE |
| [packages/store/src/store.ts:7370](../../packages/store/src/store.ts#L7370) `Store/layouts` | `SQLite.all` (7370); `SQLite.prepare` (7370); `Store.sql` (7370) | CORE |
| [packages/store/src/store.ts:5012](../../packages/store/src/store.ts#L5012) `Store/leastPrivilege` | `SQLite.all` (5012); `SQLite.prepare` (5012); `Store.sql` (5012) | CORE |
| [packages/store/src/store.ts:5616](../../packages/store/src/store.ts#L5616) `Store/ledgerRow` | `SQLite.get` (5616, 5617); `SQLite.prepare` (5616, 5617); `Store.sql` (5616, 5617) | AUTH |
| [packages/store/src/store.ts:5628](../../packages/store/src/store.ts#L5628) `Store/ledgerWrite` | `Store.sql` (5628, 5629, 5631, 5633, 5636, 5636) | AUTH |
| [packages/store/src/store.ts:5322](../../packages/store/src/store.ts#L5322) `Store/limitAccountImport` | `SQLite.prepare` (5322, 5323, 5326); `Store.sql` (5322, 5323, 5326); `SQLite.get` (5323) | CORE |
| [packages/store/src/store.ts:3838](../../packages/store/src/store.ts#L3838) `Store/linkIdentity` | `SQLite.get` (3838); `SQLite.prepare` (3838); `Store.sql` (3838) | CORE |
| [packages/store/src/store.ts:3830](../../packages/store/src/store.ts#L3830) `Store/linkPrincipal` | `SQLite.get` (3830); `SQLite.prepare` (3830); `Store.sql` (3830) | CORE |
| [packages/store/src/store.ts:4598](../../packages/store/src/store.ts#L4598) `Store/markPiiField` | `SQLite.prepare` (4598); `Store.sql` (4598) | CORE |
| [packages/store/src/store.ts:8458](../../packages/store/src/store.ts#L8458) `Store/markRepeating` | `SQLite.prepare` (8458); `Store.sql` (8458) | CORE |
| [packages/store/src/store.ts:11510](../../packages/store/src/store.ts#L11510) `Store/matchIds` | `Store.matchIds` (11510); `SQLite.all` (11516); `SQLite.prepare` (11516); `Store.sql` (11516) | CORE |
| [packages/store/src/store.ts:1622](../../packages/store/src/store.ts#L1622) `Store/meta` | `SQLite.get` (1622); `SQLite.prepare` (1622); `Store.sql` (1622) | CORE |
| [packages/store/src/store.ts:1023](../../packages/store/src/store.ts#L1023) `Store/metadataVersions` | `SQLite.get` (1023); `SQLite.prepare` (1023); `Store.sql` (1023) | CORE |
| [packages/store/src/store.ts:9095](../../packages/store/src/store.ts#L9095) `Store/moveContainersIn` | `Store.sql` (9095, 9101, 9103, 9104, 9105, 9106, 9126, 9131, 9131, 9142, 9145, 9148, 9155); `SQLite.prepare` (9103, 9104, 9105, 9106, 9142, 9148); `SQLite.get` (9108, 9142, 9148) | CORE |
| [packages/store/src/store.ts:9017](../../packages/store/src/store.ts#L9017) `Store/moveContainersOut` | `Store.sql` (9017, 9025, 9027, 9029, 9034, 9035, 9055, 9061, 9063, 9065, 9065, 9071, 9071, 9076, 9078, 9080, 9080, 9086); `SQLite.get` (9025); `SQLite.prepare` (9025, 9034, 9035); `Store.container` (9037) | CORE |
| [packages/store/src/store.ts:5193](../../packages/store/src/store.ts#L5193) `Store/mustChangePassword` | `SQLite.get` (5193); `SQLite.prepare` (5193); `Store.sql` (5193) | CORE |
| [packages/store/src/store.ts:1558](../../packages/store/src/store.ts#L1558) `Store/nativeIdGuards` | `Store.sql` (1558, 1559, 1561) | CORE |
| [packages/store/src/store.ts:2400](../../packages/store/src/store.ts#L2400) `Store/nextRecordId` | `SQLite.get` (2400); `SQLite.prepare` (2400); `Store.sql` (2400) | CORE |
| [packages/store/src/store.ts:5922](../../packages/store/src/store.ts#L5922) `Store/objectUseSince` | `SQLite.get` (5922); `SQLite.prepare` (5922); `Store.sql` (5922) | CORE |
| [packages/store/src/store.ts:9279](../../packages/store/src/store.ts#L9279) `Store/orderBy` | `Store.valueListItems` (9279) | CORE |
| [packages/store/src/store.ts:8650](../../packages/store/src/store.ts#L8650) `Store/orphanContainerReport` | `SQLite.all` (8650); `SQLite.prepare` (8650); `Store.sql` (8650) | CORE |
| [packages/store/src/store.ts:6154](../../packages/store/src/store.ts#L6154) `Store/passkeyAllowList` | `SQLite.all` (6154); `SQLite.prepare` (6154); `Store.sql` (6154) | CORE |
| [packages/store/src/store.ts:6193](../../packages/store/src/store.ts#L6193) `Store/passkeyIds` | `SQLite.all` (6193); `SQLite.prepare` (6193); `Store.sql` (6193) | CORE |
| [packages/store/src/store.ts:6181](../../packages/store/src/store.ts#L6181) `Store/passkeys` | `SQLite.all` (6181); `SQLite.prepare` (6181); `Store.sql` (6181) | CORE |
| [packages/store/src/store.ts:5232](../../packages/store/src/store.ts#L5232) `Store/passwordDaysRemaining` | `SQLite.get` (5232); `SQLite.prepare` (5232); `Store.sql` (5232) | CORE |
| [packages/store/src/store.ts:7214](../../packages/store/src/store.ts#L7214) `Store/passwordState` | `SQLite.get` (7214); `SQLite.prepare` (7214); `Store.sql` (7214) | CORE |
| [packages/store/src/store.ts:4121](../../packages/store/src/store.ts#L4121) `Store/pendingChanges` | `SQLite.all` (4121); `SQLite.prepare` (4121); `Store.sql` (4121) | CORE |
| [packages/store/src/store.ts:1640](../../packages/store/src/store.ts#L1640) `Store/persistentData` | `SQLite.get` (1640) | CORE |
| [packages/store/src/store.ts:1649](../../packages/store/src/store.ts#L1649) `Store/persistentDataIds` | `SQLite.all` (1649) | CORE |
| [packages/store/src/store.ts:1630](../../packages/store/src/store.ts#L1630) `Store/persistentTable` | `Store.sql` (1630) | CORE |
| [packages/store/src/store.ts:10617](../../packages/store/src/store.ts#L10617) `Store/portalContainerTarget` | `Store.row` (10617); `relatedIdList` (10619) | CORE |
| [packages/store/src/store.ts:8068](../../packages/store/src/store.ts#L8068) `Store/portalCountsCurrent` | `Store.canView` (8068); `Store.row` (8095) | GATED-STORE |
| [packages/store/src/store.ts:8313](../../packages/store/src/store.ts#L8313) `Store/portalRows` | `relatedRows` (8313); `relatedIdList` (8314); `Store.viewableSet` (8317); `rowsById` (8342, 8380); `Calculations.related` (8356) | CORE |
| [packages/store/src/store.ts:8324](../../packages/store/src/store.ts#L8324) `Store/portalRows/context` | `Calculations.context` (8324) | CORE |
| [packages/store/src/store.ts:8334](../../packages/store/src/store.ts#L8334) `Store/portalRows/valueOf` | `Calculations.value` (8334) | CORE |
| [packages/store/src/store.ts:2779](../../packages/store/src/store.ts#L2779) `Store/prepared` | `SQLite.prepare` (2779); `Store.sql` (2779) | CORE |
| [packages/store/src/store.ts:5304](../../packages/store/src/store.ts#L5304) `Store/previewAccountImport` | `Store.sql` (5304, 5305, 5314) | CORE |
| [packages/store/src/store.ts:7010](../../packages/store/src/store.ts#L7010) `Store/previewRecordRuleCurrent` | `SQLite.get` (7010); `SQLite.prepare` (7010, 7013); `Store.sql` (7010, 7013); `SQLite.all` (7013); `Calculations.context` (7019, 7035) | CORE |
| [packages/store/src/store.ts:9800](../../packages/store/src/store.ts#L9800) `Store/previewRow` | `Store.row` (9800) | CORE |
| [packages/store/src/store.ts:6408](../../packages/store/src/store.ts#L6408) `Store/privilegeSets` | `Store.sql` (6408) | CORE |
| [packages/store/src/store.ts:3016](../../packages/store/src/store.ts#L3016) `Store/pruneAudit` | `Store.sql` (3016, 3019, 3024, 3026, 3034, 3039, 3041); `SQLite.get` (3024, 3037, 3041); `SQLite.prepare` (3024, 3034, 3041) | CORE |
| [packages/store/src/store.ts:8685](../../packages/store/src/store.ts#L8685) `Store/purgeOrphanContainers` | `Store.sql` (8685, 8689, 8698, 8701, 8702, 8707, 8708, 8710, 8710); `Store.orphanContainerReport` (8693); `SQLite.get` (8698); `SQLite.prepare` (8698, 8701, 8702) | CORE |
| [packages/store/src/store.ts:11841](../../packages/store/src/store.ts#L11841) `Store/query` | `SQLite.iterate` (11841) | CORE |
| [packages/store/src/store.ts:11881](../../packages/store/src/store.ts#L11881) `Store/queryWithOriginsCurrent` | `SQLite.iterate` (11881); `SQLite.all` (11890, 11893); `SQLite.prepare` (11890, 11893) | CORE |
| [packages/store/src/store.ts:11630](../../packages/store/src/store.ts#L11630) `Store/readOnlyChecked` | `SQLite.prepare` (11630, 11634, 11643, 11648); `SQLite.all` (11634, 11643, 11648) | CORE |
| [packages/store/src/store.ts:3810](../../packages/store/src/store.ts#L3810) `Store/recompute` | `SQLite.prepare` (3810, 3814); `Store.sql` (3810, 3814); `SQLite.iterate` (3814); `Calculations.computeStoredStyled` (3815); `Calculations.value` (3815) | CORE |
| [packages/store/src/store.ts:2794](../../packages/store/src/store.ts#L2794) `Store/recordAsOf` | `SQLite.get` (2794, 2796); `SQLite.prepare` (2794, 2796, 2798, 2799); `Store.sql` (2794, 2796, 2798, 2799); `SQLite.all` (2798, 2799) | CORE |
| [packages/store/src/store.ts:2488](../../packages/store/src/store.ts#L2488) `Store/recordCount` | `SQLite.get` (2488); `SQLite.prepare` (2488); `Store.sql` (2488) | CORE |
| [packages/store/src/store.ts:1687](../../packages/store/src/store.ts#L1687) `Store/recordedFormat` | `Store.sql` (1687) | CORE |
| [packages/store/src/store.ts:2871](../../packages/store/src/store.ts#L2871) `Store/recordLife` | `SQLite.all` (2871); `SQLite.prepare` (2871); `Store.sql` (2871) | CORE |
| [packages/store/src/store.ts:5853](../../packages/store/src/store.ts#L5853) `Store/recordObjectUse` | `Store.sql` (5853) | CORE |
| [packages/store/src/store.ts:10319](../../packages/store/src/store.ts#L10319) `Store/recordViewable` | `Store.row` (10319) | GATED-STORE |
| [packages/store/src/store.ts:8989](../../packages/store/src/store.ts#L8989) `Store/recoverContainersOut` | `SQLite.prepare` (8989); `Store.sql` (8989); `SQLite.get` (8992) | CORE |
| [packages/store/src/store.ts:1790](../../packages/store/src/store.ts#L1790) `Store/recoverPendingExternalFiles` | `Store.sql` (1790, 1792, 1816, 1818); `SQLite.prepare` (1792); `SQLite.get` (1803) | CORE |
| [packages/store/src/store.ts:6351](../../packages/store/src/store.ts#L6351) `Store/recoveryCodesRemaining` | `SQLite.get` (6351); `SQLite.prepare` (6351); `Store.sql` (6351) | CORE |
| [packages/store/src/store.ts:11670](../../packages/store/src/store.ts#L11670) `Store/refreshDecimalSqlViews` | `SQLite.get` (11670); `SQLite.prepare` (11670) | CORE |
| [packages/store/src/store.ts:3979](../../packages/store/src/store.ts#L3979) `Store/refuseLookalikeAccount` | `SQLite.all` (3979); `SQLite.prepare` (3979); `Store.sql` (3979) | CORE |
| [packages/store/src/store.ts:6217](../../packages/store/src/store.ts#L6217) `Store/registerPasskey` | `SQLite.prepare` (6217); `Store.sql` (6217) | CORE |
| [packages/store/src/store.ts:4157](../../packages/store/src/store.ts#L4157) `Store/rejectPending` | `SQLite.get` (4157); `SQLite.prepare` (4157, 4159); `Store.sql` (4157, 4159) | CORE |
| [packages/store/src/store.ts:9552](../../packages/store/src/store.ts#L9552) `Store/relatedCriteria` | `SQLite.iterate` (9552); `SQLite.prepare` (9552); `Store.sql` (9552) | CORE |
| [packages/store/src/store.ts:9549](../../packages/store/src/store.ts#L9549) `Store/relatedCriteria/matched` | `relatedRows` (9549) | CORE |
| [packages/store/src/store.ts:7823](../../packages/store/src/store.ts#L7823) `Store/relatedValues` | `Calculations.globalValue` (7823); `Calculations.unstoredValue` (7825) | CORE |
| [packages/store/src/store.ts:6230](../../packages/store/src/store.ts#L6230) `Store/removePasskey` | `SQLite.get` (6230); `SQLite.prepare` (6230, 6231); `Store.sql` (6230, 6231) | CORE |
| [packages/store/src/store.ts:9378](../../packages/store/src/store.ts#L9378) `Store/reportFind` | `Store.query` (9378, 9380, 9381); `Store.recordCount` (9383) | CORE |
| [packages/store/src/store.ts:10796](../../packages/store/src/store.ts#L10796) `Store/restoreDeletedRowLocked` | `SQLite.get` (10796, 10801); `SQLite.prepare` (10796, 10797, 10801, 10811); `Store.sql` (10796, 10797, 10801, 10811); `SQLite.all` (10797) | CORE |
| [packages/store/src/store.ts:2829](../../packages/store/src/store.ts#L2829) `Store/restoreRecord` | `Store.recordAsOf` (2829); `SQLite.get` (2833); `SQLite.prepare` (2833, 2838, 2847, 2858); `Store.sql` (2833, 2838, 2847, 2858) | CORE |
| [packages/store/src/store.ts:2887](../../packages/store/src/store.ts#L2887) `Store/revertAuditEntry` | `SQLite.get` (2887); `SQLite.prepare` (2887); `Store.sql` (2887); `Store.canViewRecord` (2889); `Store.auditLog` (2892) | CORE |
| [packages/store/src/store.ts:5978](../../packages/store/src/store.ts#L5978) `Store/revokeApiToken` | `SQLite.prepare` (5978); `Store.sql` (5978) | CORE |
| [packages/store/src/store.ts:5501](../../packages/store/src/store.ts#L5501) `Store/revokeSignInCredentials` | `SQLite.prepare` (5501, 5502, 5503); `Store.sql` (5501, 5502, 5503) | AUTH |
| [packages/store/src/store.ts:9819](../../packages/store/src/store.ts#L9819) `Store/row` | `SQLite.get` (9819) | CORE |
| [packages/store/src/store.ts:11774](../../packages/store/src/store.ts#L11774) `Store/rowsOf` | `SQLite.iterate` (11774, 11783) | CORE |
| [packages/store/src/store.ts:6815](../../packages/store/src/store.ts#L6815) `Store/ruleOutcome` | `Calculations.context` (6815) | CORE |
| [packages/store/src/store.ts:9663](../../packages/store/src/store.ts#L9663) `Store/runningSummaryValues` | `Store.viewableIds` (9663); `rowsById` (9665); `Calculations.value` (9676, 9682); `Calculations.related` (9693) | GATED-STORE |
| [packages/store/src/store.ts:6437](../../packages/store/src/store.ts#L6437) `Store/savePrivilegeSet` | `SQLite.prepare` (6437, 6445); `Store.sql` (6437, 6445) | AUTH |
| [packages/store/src/store.ts:4392](../../packages/store/src/store.ts#L4392) `Store/saveScriptTest` | `SQLite.prepare` (4392); `Store.sql` (4392) | CORE |
| [packages/store/src/store.ts:6975](../../packages/store/src/store.ts#L6975) `Store/scopedTableSql` | `Store.viewableIds` (6975); `SQLite.all` (6978); `SQLite.prepare` (6978); `Store.sql` (6978) | GATED-STORE |
| [packages/store/src/store.ts:3547](../../packages/store/src/store.ts#L3547) `Store/scriptHistory` | `SQLite.all` (3547); `SQLite.prepare` (3547); `Store.sql` (3547) | CORE |
| [packages/store/src/store.ts:1766](../../packages/store/src/store.ts#L1766) `Store/securityChainHeadAudit` | `SQLite.get` (1766); `SQLite.prepare` (1766); `Store.sql` (1766) | CORE |
| [packages/store/src/store.ts:3220](../../packages/store/src/store.ts#L3220) `Store/securityChange` | `Store.sql` (3220, 3222); `SQLite.prepare` (3222) | CORE |
| [packages/store/src/store.ts:2753](../../packages/store/src/store.ts#L2753) `Store/securityEvents` | `Store.auditLog` (2753) | CORE |
| [packages/store/src/store.ts:5702](../../packages/store/src/store.ts#L5702) `Store/securityToken` | `SQLite.get` (5702); `SQLite.prepare` (5702); `Store.sql` (5702) | CORE |
| [packages/store/src/store.ts:11804](../../packages/store/src/store.ts#L11804) `Store/selectHeldCurrent` | `Store.sql` (11804, 11806, 11809); `SQLite.prepare` (11806) | CORE |
| [packages/store/src/store.ts:11102](../../packages/store/src/store.ts#L11102) `Store/selectIdsCurrent` | `Store.selectIds` (11102); `SQLite.all` (11109); `SQLite.prepare` (11109); `Store.sql` (11109) | GATED-STORE |
| [packages/store/src/store.ts:11794](../../packages/store/src/store.ts#L11794) `Store/selectIn` | `Store.select` (11794) | CORE |
| [packages/store/src/store.ts:2153](../../packages/store/src/store.ts#L2153) `Store/selfContainedCopy` | `Store.sql` (2153); `SQLite.all` (2158); `SQLite.prepare` (2158, 2160, 2161, 2162) | CORE |
| [packages/store/src/store.ts:5480](../../packages/store/src/store.ts#L5480) `Store/setAccountActive` | `SQLite.prepare` (5480, 5488, 5489); `Store.sql` (5480, 5488, 5489) | AUTH |
| [packages/store/src/store.ts:5721](../../packages/store/src/store.ts#L5721) `Store/setAccountLocalOnly` | `SQLite.prepare` (5721); `Store.sql` (5721) | CORE |
| [packages/store/src/store.ts:6593](../../packages/store/src/store.ts#L6593) `Store/setAccountPrivilegeSet` | `SQLite.get` (6593); `SQLite.prepare` (6593, 6596, 6600); `Store.sql` (6593, 6596, 6600) | AUTH |
| [packages/store/src/store.ts:5730](../../packages/store/src/store.ts#L5730) `Store/setAccountRequire2fa` | `SQLite.prepare` (5730); `Store.sql` (5730) | CORE |
| [packages/store/src/store.ts:4009](../../packages/store/src/store.ts#L4009) `Store/setAgentAccount` | `SQLite.get` (4009); `SQLite.prepare` (4009, 4015); `Store.sql` (4009, 4015) | CORE |
| [packages/store/src/store.ts:4471](../../packages/store/src/store.ts#L4471) `Store/setAiAllowed` | `SQLite.prepare` (4471); `Store.sql` (4471) | CORE |
| [packages/store/src/store.ts:4556](../../packages/store/src/store.ts#L4556) `Store/setAiPolicy` | `SQLite.prepare` (4556); `Store.sql` (4556) | CORE |
| [packages/store/src/store.ts:7243](../../packages/store/src/store.ts#L7243) `Store/setAllowBlankPasswordFromLan` | `SQLite.prepare` (7243); `Store.sql` (7243) | CORE |
| [packages/store/src/store.ts:2993](../../packages/store/src/store.ts#L2993) `Store/setAuditSettings` | `SQLite.prepare` (2993); `Store.sql` (2993) | CORE |
| [packages/store/src/store.ts:9208](../../packages/store/src/store.ts#L9208) `Store/setContainer` | `Store.sql` (9208); `Store.row` (9214) | CORE |
| [packages/store/src/store.ts:3961](../../packages/store/src/store.ts#L3961) `Store/setExternalAccount` | `SQLite.get` (3961); `SQLite.prepare` (3961, 3966); `Store.sql` (3961, 3966) | CORE |
| [packages/store/src/store.ts:5179](../../packages/store/src/store.ts#L5179) `Store/setMustChangePassword` | `SQLite.prepare` (5179); `Store.sql` (5179) | CORE |
| [packages/store/src/store.ts:4216](../../packages/store/src/store.ts#L4216) `Store/setPasswordOnly` | `SQLite.get` (4216); `SQLite.prepare` (4216, 4222, 4231, 4238, 4239, 4240); `Store.sql` (4216, 4222, 4231, 4238, 4239, 4240) | AUTH |
| [packages/store/src/store.ts:4333](../../packages/store/src/store.ts#L4333) `Store/setPasswordPolicy` | `SQLite.prepare` (4333); `Store.sql` (4333) | CORE |
| [packages/store/src/store.ts:1655](../../packages/store/src/store.ts#L1655) `Store/setPersistentData` | `SQLite.prepare` (1655, 1659); `Store.sql` (1655, 1659) | CORE |
| [packages/store/src/store.ts:4576](../../packages/store/src/store.ts#L4576) `Store/setPiiIsolation` | `SQLite.prepare` (4576); `Store.sql` (4576) | CORE |
| [packages/store/src/store.ts:4369](../../packages/store/src/store.ts#L4369) `Store/setRequireTotpForFullAccess` | `SQLite.prepare` (4369); `Store.sql` (4369) | CORE |
| [packages/store/src/store.ts:4488](../../packages/store/src/store.ts#L4488) `Store/setScriptNetwork` | `SQLite.prepare` (4488); `Store.sql` (4488) | CORE |
| [packages/store/src/store.ts:4545](../../packages/store/src/store.ts#L4545) `Store/setSqlRequiresFmxdbc` | `SQLite.prepare` (4545); `Store.sql` (4545) | CORE |
| [packages/store/src/store.ts:10240](../../packages/store/src/store.ts#L10240) `Store/setStoredCalcValues` | `SQLite.prepare` (10240, 10241); `Store.sql` (10240, 10241); `SQLite.get` (10245) | CORE |
| [packages/store/src/store.ts:5655](../../packages/store/src/store.ts#L5655) `Store/settleSignIns` | `SQLite.all` (5655, 5661); `SQLite.prepare` (5655, 5661, 5667, 5671, 5673); `Store.sql` (5655, 5661, 5667, 5671, 5673) | AUTH |
| [packages/store/src/store.ts:9311](../../packages/store/src/store.ts#L9311) `Store/setUserPref` | `Store.sql` (9311, 9312, 9313); `SQLite.prepare` (9312, 9313) | CORE |
| [packages/store/src/store.ts:4529](../../packages/store/src/store.ts#L4529) `Store/setWebViewerHosts` | `SQLite.prepare` (4529); `Store.sql` (4529) | CORE |
| [packages/store/src/store.ts:2284](../../packages/store/src/store.ts#L2284) `Store/shareResults` | `Store.sql` (2284) | CORE |
| [packages/store/src/store.ts:1717](../../packages/store/src/store.ts#L1717) `Store/shipWal` | `Store.sql` (1717) | CORE |
| [packages/store/src/store.ts:5602](../../packages/store/src/store.ts#L5602) `Store/signInBase` | `SQLite.get` (5602); `SQLite.prepare` (5602); `Store.sql` (5602) | AUTH |
| [packages/store/src/store.ts:5604](../../packages/store/src/store.ts#L5604) `Store/signInBase/identity` | `SQLite.get` (5604); `SQLite.prepare` (5604); `Store.sql` (5604) | AUTH |
| [packages/store/src/store.ts:5591](../../packages/store/src/store.ts#L5591) `Store/signInMark` | `SQLite.prepare` (5591); `Store.sql` (5591) | AUTH |
| [packages/store/src/store.ts:9477](../../packages/store/src/store.ts#L9477) `Store/sortedPage` | `SQLite.iterate` (9477); `SQLite.prepare` (9477, 9492); `Store.sql` (9477, 9492); `SQLite.all` (9492) | CORE |
| [packages/store/src/store.ts:11404](../../packages/store/src/store.ts#L11404) `Store/sortIdsCurrentProgress` | `Store.sortIds` (11404); `Store.sortIdsProgress` (11404); `SQLite.all` (11417); `SQLite.prepare` (11417, 11496); `Store.sql` (11417, 11496); `Store.valueListItems` (11425); `rowsById` (11437); `Calculations.globalValue` (11440); `Calculations.unstoredValue` (11441); `Calculations.related` (11447); `SQLite.iterate` (11496) | GATED-STORE |
| [packages/store/src/store.ts:11584](../../packages/store/src/store.ts#L11584) `Store/storedFileId` | `SQLite.get` (11584); `SQLite.prepare` (11584) | CORE |
| [packages/store/src/store.ts:9625](../../packages/store/src/store.ts#L9625) `Store/summaries` | `Calculations.wholeTable` (9625); `Calculations.collect` (9645, 9650) | CORE |
| [packages/store/src/store.ts:9641](../../packages/store/src/store.ts#L9641) `Store/summaries/recs` | `SQLite.iterate` (9641); `SQLite.prepare` (9641); `Store.sql` (9641) | CORE |
| [packages/store/src/store.ts:6168](../../packages/store/src/store.ts#L6168) `Store/takeWebauthnChallenge` | `SQLite.get` (6168); `SQLite.prepare` (6168, 6172); `Store.sql` (6168, 6172) | CORE |
| [packages/store/src/store.ts:7427](../../packages/store/src/store.ts#L7427) `Store/themes` | `SQLite.get` (7427) | CORE |
| [packages/store/src/store.ts:9364](../../packages/store/src/store.ts#L9364) `Store/timeFind` | `Store.query` (9364) | CORE |
| [packages/store/src/store.ts:7762](../../packages/store/src/store.ts#L7762) `Store/toRecord` | `Calculations.value` (7762, 7772); `Calculations.globalValue` (7766); `Calculations.unstoredStyled` (7771) | CORE |
| [packages/store/src/store.ts:6052](../../packages/store/src/store.ts#L6052) `Store/totpAccounts` | `SQLite.all` (6052); `SQLite.prepare` (6052); `Store.sql` (6052) | CORE |
| [packages/store/src/store.ts:1729](../../packages/store/src/store.ts#L1729) `Store/trial` | `Store.sql` (1729) | CORE |
| [packages/store/src/store.ts:1734](../../packages/store/src/store.ts#L1734) `Store/trial/undo` | `Store.sql` (1734) | CORE |
| [packages/store/src/store.ts:11540](../../packages/store/src/store.ts#L11540) `Store/truncate/run` | `Store.sql` (11540, 11542, 11549, 11551, 11553, 11554); `SQLite.prepare` (11542, 11549); `SQLite.all` (11544) | CORE |
| [packages/store/src/store.ts:3908](../../packages/store/src/store.ts#L3908) `Store/unmigratedAccounts` | `SQLite.all` (3908); `SQLite.prepare` (3908); `Store.sql` (3908) | CORE |
| [packages/store/src/store.ts:5085](../../packages/store/src/store.ts#L5085) `Store/unusedAccess` | `SQLite.get` (5085); `SQLite.prepare` (5085, 5094); `Store.sql` (5085, 5094); `SQLite.all` (5094) | CORE |
| [packages/store/src/store.ts:5133](../../packages/store/src/store.ts#L5133) `Store/unusedObjects` | `SQLite.get` (5133); `SQLite.prepare` (5133, 5136); `Store.sql` (5133, 5136); `SQLite.all` (5136) | CORE |
| [packages/store/src/store.ts:6292](../../packages/store/src/store.ts#L6292) `Store/unusedRecoveryHashes` | `SQLite.all` (6292); `SQLite.prepare` (6292); `Store.sql` (6292) | CORE |
| [packages/store/src/store.ts:4915](../../packages/store/src/store.ts#L4915) `Store/unusualAccess` | `Store.auditLog` (4915, 4981) | CORE |
| [packages/store/src/store.ts:10060](../../packages/store/src/store.ts#L10060) `Store/update` | `Store.row` (10060); `Store.sql` (10091, 10092, 10131, 10134) | CORE |
| [packages/store/src/store.ts:10094](../../packages/store/src/store.ts#L10094) `Store/update/undo` | `Store.sql` (10094) | CORE |
| [packages/store/src/store.ts:10525](../../packages/store/src/store.ts#L10525) `Store/updatePortals` | `Store.row` (10525, 10561); `relatedRows` (10562) | CORE |
| [packages/store/src/store.ts:10535](../../packages/store/src/store.ts#L10535) `Store/updatePortals/portal/related` | `relatedIdList` (10535) | CORE |
| [packages/store/src/store.ts:10507](../../packages/store/src/store.ts#L10507) `Store/updateRelated` | `relatedRows` (10507) | CORE |
| [packages/store/src/store.ts:5171](../../packages/store/src/store.ts#L5171) `Store/usageCounting` | `SQLite.get` (5171); `SQLite.prepare` (5171); `Store.sql` (5171) | CORE |
| [packages/store/src/store.ts:9302](../../packages/store/src/store.ts#L9302) `Store/userPrefs` | `SQLite.all` (9302); `SQLite.prepare` (9302); `Store.sql` (9302) | CORE |
| [packages/store/src/store.ts:8184](../../packages/store/src/store.ts#L8184) `Store/valueListItemsCurrent` | `Store.valueListItems` (8184); `Store.get` (8198); `relatedRows` (8199); `Store.row` (8199); `SQLite.iterate` (8201); `SQLite.prepare` (8201); `Store.sql` (8201); `Calculations.related` (8211); `Calculations.value` (8215, 8216) | GATED-STORE |
| [packages/store/src/store.ts:10718](../../packages/store/src/store.ts#L10718) `Store/vaultHeld` | `SQLite.get` (10718); `SQLite.prepare` (10718); `Store.sql` (10718) | CORE |
| [packages/store/src/store.ts:6252](../../packages/store/src/store.ts#L6252) `Store/verifyPasskeyCredential` | `SQLite.get` (6252); `SQLite.prepare` (6252, 6264); `Store.sql` (6252, 6264) | CORE |
| [packages/store/src/store.ts:6081](../../packages/store/src/store.ts#L6081) `Store/verifyTotp` | `SQLite.get` (6081); `SQLite.prepare` (6081, 6088); `Store.sql` (6081, 6088) | CORE |
| [packages/store/src/store.ts:2420](../../packages/store/src/store.ts#L2420) `Store/versionNumber` | `SQLite.get` (2420); `SQLite.prepare` (2420); `Store.sql` (2420) | CORE |
| [packages/store/src/store.ts:2295](../../packages/store/src/store.ts#L2295) `Store/versionTriggers` | `SQLite.get` (2295); `SQLite.prepare` (2295, 2300, 2301); `Store.sql` (2295, 2300, 2301, 2318, 2320, 2321, 2323); `SQLite.all` (2300, 2301) | CORE |
| [packages/store/src/store.ts:2263](../../packages/store/src/store.ts#L2263) `Store/warmSummariesCurrent` | `Calculations.wholeTable` (2263) | CORE |
| [packages/store/src/store.ts:4511](../../packages/store/src/store.ts#L4511) `Store/webViewerChecked` | `SQLite.get` (4511); `SQLite.prepare` (4511); `Store.sql` (4511) | CORE |
| [packages/store/src/store.ts:2021](../../packages/store/src/store.ts#L2021) `Store/withWriteTransaction` | `Store.sql` (2021, 2033, 2039, 2041, 2041) | CORE |
| [packages/store/src/store.ts:7691](../../packages/store/src/store.ts#L7691) `Store/wordIndex` | `Store.sql` (7691, 7699, 7704); `Store.recordCount` (7703); `SQLite.get` (7704); `SQLite.prepare` (7704) | CORE |
| [packages/store/src/store.ts:8882](../../packages/store/src/store.ts#L8882) `Store/writeExternalFile` | `Store.evaluateEach` (8882); `SQLite.prepare` (8905); `Store.sql` (8905) | CORE |
| [packages/store/src/store.ts:8906](../../packages/store/src/store.ts#L8906) `Store/writeExternalFile/taken` | `SQLite.get` (8906) | CORE |
| [packages/store/src/store.ts:5911](../../packages/store/src/store.ts#L5911) `Store/writeObjectUseRows` | `SQLite.prepare` (5911, 5912, 5917); `Store.sql` (5911, 5912, 5917) | CORE |
| [packages/store/src/store.ts:2476](../../packages/store/src/store.ts#L2476) `Store/writeToken` | `SQLite.get` (2476); `SQLite.prepare` (2476); `Store.sql` (2476) | CORE |
| [packages/store/src/store.ts:5883](../../packages/store/src/store.ts#L5883) `Store/writeUsage` | `Store.sql` (5883, 5884, 5886, 5890, 5892) | CORE |
| [packages/store/src/store.ts:5899](../../packages/store/src/store.ts#L5899) `Store/writeUsageRows` | `SQLite.prepare` (5899, 5900, 5906); `Store.sql` (5899, 5900, 5906) | CORE |
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
| [packages/store/src/store.ts:1087](../../packages/store/src/store.ts#L1087) `Store/referenceSecurity` | `SQLite.get` (1087); `SQLite.prepare` (1087); `Store.sql` (1087) | Internal File Access authorization reads only its version and file-local security metadata; public management reads require Full Access. No record values are read. |
| [packages/store/src/store.ts:1106](../../packages/store/src/store.ts#L1106) `Store/writeFileAccess` | `SQLite.prepare` (1106); `Store.sql` (1106) | Writes only File Access security metadata inside securityChange; public mutations require Full Access, while hosted rename observation changes display names without granting access. |
| [packages/store/src/store.ts:1148](../../packages/store/src/store.ts#L1148) `Store/resetFileAccessId` | `SQLite.prepare` (1148, 1150); `Store.sql` (1148, 1150) | Full Access checked inside the security transaction before writing the new reference identity and retaining the stable token-scope identity; no record data is read. |
| [packages/store/src/ess/driver.ts:30](../../packages/store/src/ess/driver.ts#L30) `SqliteDriver/query` | `SQLite.prepare` (30); `SQLite.iterate` (35) | CORE |
| [packages/store/src/ess/driver.ts:49](../../packages/store/src/ess/driver.ts#L49) `SqliteDriver/tables` | `SQLite.all` (49); `SQLite.prepare` (49) | CORE |
| [packages/store/src/ess/driver.ts:54](../../packages/store/src/ess/driver.ts#L54) `SqliteDriver/columns` | `SQLite.all` (54); `SQLite.prepare` (54) | CORE |
| [packages/store/src/ess/mirror.ts:76](../../packages/store/src/ess/mirror.ts#L76) `refreshMirror` | `SQLite.all` (76); `SQLite.prepare` (76, 78, 79, 80, 96, 97) | CORE |
| [packages/store/src/store.ts:1209](../../packages/store/src/store.ts#L1209) `Store/refreshShadow` | `Store.sql` (1209) | CORE |
<!-- end generated read-gate inventory -->
