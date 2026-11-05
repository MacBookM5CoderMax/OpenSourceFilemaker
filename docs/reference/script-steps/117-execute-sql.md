---
id: script-step-117
title: "Execute SQL"
area: script-steps
since: unknown
status: partly
verified: f200448e0
---

# Execute SQL

Execute SQL is a other steps script step. This page describes how the offline Tabularius engine handles it.

- **Support:** partly
- **Registry ID:** 117

## What the engine does

The engine handles this step with the limits described in the support notes.
Runs SQL text or a calculation through an active, approved PostgreSQL connection bound to the ODBC data source and allowed for the file. Needs full access or fmess and script network permission; discards results. No binding gives error 3 with binding instructions. Native source/text parameter decoding is unverified; see [External SQL sources](../../guides/running/external-sql-sources.md).

FileMaker comparisons in this note are inferred unless a Claris help page is linked. See the [full support notes](../../script-steps-support.md) for surrounding conditions.

## Options

Choose an ODBC Data Source and either literal SQL text or a Calculation producing SQL. The approved connection must allow this file; results are discarded. Accepted script-text labels: `Data Source:`, `SQL:`, `Calculation:`.

## Privileges

The account must have full access or the fmess extended privilege, and script network access must be enabled. Running a script with full access does not grant fmess to its account.

## Error codes

Known codes from the engine and the [script error-code reference](../../error-codes.md): `0`, `3`, `9`, `8310`. Other failures can arise from calculations or targets used by the step.

## Offline script example

Use a synthetic local solution with an empty `Examples` table and a text field named `Name`. The example uses no mail, network or plug-ins.

```script
Execute SQL
```

**Expected end state:** Without a bound data source, the step returns error `3`, makes no network request and changes no records.
