# External SQL sources

A shadow table is a table in a hosted solution whose rows come from a SQL database. Tabularius keeps a SQLite mirror of those rows so layouts, finds, sorts, relationships, portals and calculations can read them through ordinary table occurrences.

## What works in this core

The store has a SQL driver interface and a worker bridge. The supplied `sqlite` driver can use a separate SQLite file as an outside source. The server must supply a file-scoped `sqlConnection` resolver for a data source; the Connections binding and PostgreSQL, MySQL, SQL Server and Oracle clients are separate work. No network database has been verified against a real server yet. <!-- known-difference: External SQL sources ;; Network SQL clients and their Connections binding are not present in this core, and behavior against a real server is unverified ;; A solution using an ODBC source cannot yet connect to one of the four network databases ;; A run against each real database after its client and Connections binding are added -->

Create an ODBC data source with a path such as `odbc:Sales`. A connection name matches the DSN without regard to case; the data source can name a different connection in its `connection` field. The host's resolver must enforce the connection's file scope. `createShadowTable` takes `dataSource`, `table`, optional `schema` and `name`, and optional `keys`. It reads the source columns and primary key, then creates the shadow table and a normal layout. When the SQL table has no primary key, give the names of columns that together are unique in `keys`. `syncShadowTable` adds new columns and marks missing columns as dropped. Neither operation changes the source table.

Mapped SQL types become Tabularius field types as follows:

| SQL type begins with | Field type |
|---|---|
| integer, int, smallint, bigint, numeric, real, decimal, float, double | number |
| char, varchar, text, or any other type not listed here | text |
| date | date |
| time | time |
| timestamp, datetime | timestamp |
| bytea, blob, binary, varbinary | container |

Fields added to a shadow table without a SQL column are supplemental fields. They stay local and are never sent to the SQL database. A mapped field cannot be renamed: the field name still identifies its outside column. Type mapping and supplemental-field behavior relative to FileMaker's ESS are unverified. <!-- known-difference: External SQL sources ;; SQL column type mapping and supplemental-field behavior relative to FileMaker ESS are unverified ;; A source value or supplemental field may be interpreted differently ;; A comparison with the same schema and values in a FileMaker ESS solution -->

## Refresh and limits

Before a record get, find, related read or portal read, Tabularius refreshes a shadow mirror when its last successful refresh is old enough. `TABULARIUS_ESS_REFRESH_SECONDS` defaults to 5; set it to 0 to refresh on every read. A refresh reads the whole outside table. `TABULARIUS_ESS_MAX_ROWS` defaults to 100000; a larger table fails the read without changing the mirror. Raise the cap only when the full table fits your host. Pushed-down finds are planned for a later item. A source failure fails the read; it never silently serves stale rows. Existing keys keep their record ids. After a deleted key has been removed by a refresh, inserting it again receives a new record id.

`TABULARIUS_ESS_TIMEOUT_SECONDS` defaults to 30 and bounds each bridge call. `TABULARIUS_ESS_POOL` defaults to 4 and caps connections per name; this core uses one connection per name. The FileMaker error number for an ESS failure is unverified; this core consistently uses `8310`. Refresh timing, whole-table limits and that error number are Tabularius behavior, with FileMaker parity unverified. <!-- known-difference: External SQL sources ;; Refresh timing, whole-table row limit, record-id reuse and ESS error number are unverified against FileMaker ;; An ESS read may refresh or fail differently and report another error number ;; A comparison of refresh, row-cap and failure cases in FileMaker -->

## Writes

Create, edit and delete write mapped fields to the outside table and then commit the local mirror. Generated SQL keys are read back and mapped to stable local record ids. Supplemental fields stay in the mirror. File field validation and auto-enter run before the outside write. File serial numbers on a shadow table are local values; parity with FileMaker is unverified. The outside database supplies defaults for columns omitted by the file. <!-- known-difference: External SQL sources ;; File serial-number behavior on shadow tables is unverified against FileMaker ;; An auto-entered number may differ from a FileMaker ESS solution ;; A comparison of serial auto-enter and SQL defaults in FileMaker -->

An edit checks every mapped column against the values read into the mirror, using each database's NULL-safe comparison. If the outside row changed, the edit fails with error `306` and Tabularius refreshes the mirror row so the person can retry. A database constraint, permission or type failure returns the ESS error `8310`; the mirror write rolls back. The audit and record history use the ordinary write entries, including their surface and SQL connection name. If the outside row was already deleted, deleting its mirror row succeeds; FileMaker parity is unverified. <!-- known-difference: External SQL sources ;; Deleting a shadow row already gone from SQL succeeds here; FileMaker parity is unverified ;; A delete may report a different result in FileMaker ;; A comparison of already-deleted SQL rows in FileMaker ESS -->

One record or portal commit sends all its shadow-table changes for the same connection in one outside database transaction. Open Transaction defers shadow writes until Commit Transaction, one outside transaction per connection; Revert Transaction discards them. Across two connections there is no two-phase commit: the transactions are committed one after another, so a failure after the first can leave the first connection committed. A local mirror commit can also fail after an outside commit. These cross-database atomicity limits are part of this implementation. <!-- known-difference: External SQL sources ;; Shadow writes across connections, or between an outside database and the mirror, have no atomic commit ;; A later failure can leave one database committed and the other uncommitted ;; A recovery and transaction comparison against FileMaker ESS -->

The SQLite stand-in has automated write tests. The PostgreSQL, MySQL, SQL Server and Oracle write SQL has not been verified against real servers; their connection clients and server Connections binding are separate items. `Truncate Table` on a shadow table remains unavailable. <!-- known-difference: External SQL sources ;; Truncate Table on a shadow table remains unavailable ;; A truncate that another ESS host permits fails here ;; A comparison of Truncate Table on a shadow table in FileMaker -->
