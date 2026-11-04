# Give each person an account and privilege set

Use this guide when people or integrations need different access to one hosted solution. Create a separate account for each identity, then grant only the access its work needs.

## 1. Start from the access the task needs

Write down which layouts, tables, fields, and scripts the person must use. A human who edits invoices and an integration that reads invoice status should not share an account: separate accounts make access review and revocation clearer.

## 2. Create a privilege set

In the web client, open **File → Manage → Security**, create a privilege set, and choose the permitted records, layouts, fields, and scripts. Start restrictive, then add the one permission needed when a task fails. Use the [security defaults](../../security-defaults.md) and [AI-visible policy](../../ai-visible-policy.md) to understand separate controls.

Privilege names in a converted file may be used by scripts, layouts, or accounts. Check references before renaming or removing a set. The read-only [solution check](../../check-solution.md) reports some missing or unusable privilege definitions.

## 3. Add an account and assign the set

Create a local account with a unique name and strong password, then assign the new privilege set. For an API client, issue a dedicated API token after signing in as that account; scope it to the intended file and revoke it when the integration is retired.

<!-- docs-example: run -->
```sh
tabularius new ~/access-review Invoices --starter invoicing
tabularius privileges ~/access-review Invoices
```

The command help lists the account operations available in this version. For a complete guided API example, see [Add a Data API client](../../tutorials/data-api-client.md).

## 4. Test with the account itself

Sign out of Full Access and sign in as the new account. Try the normal task, then try one action that should be denied. Confirm both outcomes in the web client or with the account's own API token. A successful administrator check does not prove that the restricted account can do its job.

## Check afterwards

- The account has its own identity and the intended privilege set.
- Required operations succeed; an out-of-scope read or write is refused.
- Removing the account or revoking its token ends access without changing another user's credentials.

## References and differences

- [Security defaults](../../security-defaults.md) · [Data API compatibility](../../data-api-compatibility.md) · [Known differences](../../known-differences.md)
- Tabularius permission checks are described here from this repository's implementation. FileMaker privilege semantics beyond statements documented by Claris are **inferred** and need a FileMaker comparison. <!-- known-difference: Privileges and security ;; FileMaker privilege semantics beyond what Claris documents are inferred, not verified ;; A privilege check may differ from FileMaker's in a case Claris does not document ;; A FileMaker comparison run of the privilege case -->

## File Access

In design mode, open **Security → File Access** to require authorization before another hosted file can use this file’s
tables, layouts, scripts or value lists through a data source. Full Access is required to read or change these settings,
and authorizing a file requires Full Access in both files. Authorization never grants record access: accounts and record
privileges in the data file still apply. Turning protection off removes the reference restriction.

Authorizations identify files by their stored ID, with the names seen, authorization time and acting account. Renaming a
hosted file adds its new name without losing authorization. A copied store keeps its ID and authorization list; a new
store starts with only itself authorized. Removing the self-entry also blocks explicit data sources pointing at the same
file, while ordinary local access continues. Design exports do not include File Access metadata. **Reset All** assigns a
new ID and keeps this file’s list; files that authorized the old identity must authorize the new identity.

The reader cannot decode File Access from a `.fmp12`, so converted files start with protection off. Turn it on again and
authorize the files that use the converted file. The exact encoded settings are unverified.
<!-- known-difference: Security ;; File Access settings are not imported from .fmp12 ;; Converted files start with protection off and require fresh authorizations ;; Decode a synthetic protected file and verify its settings -->

The same-host flag is stored; all files hosted on this server meet it. FileMaker’s client-side refusal message and code
are unverified and are not matched here: a refused reference follows the existing missing-file path (including error 100
for Open File and Perform Script), without revealing another file’s design.
<!-- known-difference: Security ;; File Access client-side error compatibility is unverified ;; Refused references use existing missing-file results ;; Compare refusal messages and codes with an authorized synthetic native solution -->

Revocation takes effect at the next reference resolution here, including already-open solutions. Native reopen timing and
the precise Reset All behavior are unverified offline; the hosted identity behavior above is explicit.
<!-- known-difference: Security ;; Native File Access revocation timing is unverified ;; Existing references are checked on every resolution rather than waiting for reopen ;; Compare revocation in an already-open native solution -->
<!-- known-difference: Security ;; Native Reset All behavior is unverified ;; Reset changes the file ID and retains its authorization list ;; Compare identity and list changes after Reset All using synthetic files -->
