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

Fields added to a shadow table as calculations, summaries or globals are supplemental fields. They stay local and are never named in the SQL read. Type mapping and supplemental-field behavior relative to FileMaker's ESS are unverified. <!-- known-difference: External SQL sources ;; SQL column type mapping and supplemental-field behavior relative to FileMaker ESS are unverified ;; A source value or supplemental field may be interpreted differently ;; A comparison with the same schema and values in a FileMaker ESS solution -->

## Refresh and limits

Before a record get, find, related read or portal read, Tabularius refreshes a shadow mirror when its last successful refresh is old enough. `TABULARIUS_ESS_REFRESH_SECONDS` defaults to 5; set it to 0 to refresh on every read. A refresh reads the whole outside table. `TABULARIUS_ESS_MAX_ROWS` defaults to 100000; a larger table fails the read without changing the mirror. Raise the cap only when the full table fits your host. Pushed-down finds are planned for a later item. A source failure fails the read; it never silently serves stale rows. Existing keys keep their record ids. After a deleted key has been removed by a refresh, inserting it again receives a new record id.

`TABULARIUS_ESS_TIMEOUT_SECONDS` defaults to 30 and bounds each bridge call. `TABULARIUS_ESS_POOL` defaults to 4 and caps connections per name; this core uses one connection per name. The FileMaker error number for an ESS failure is unverified; this core consistently uses `8310`. Refresh timing, whole-table limits and that error number are Tabularius behavior, with FileMaker parity unverified. <!-- known-difference: External SQL sources ;; Refresh timing, whole-table row limit, record-id reuse and ESS error number are unverified against FileMaker ;; An ESS read may refresh or fail differently and report another error number ;; A comparison of refresh, row-cap and failure cases in FileMaker -->

## Writes

Creating, editing and deleting rows of a shadow table are refused with an actionable error in this core. The write client and transaction behavior come in a later item. <!-- known-difference: External SQL sources ;; Shadow-table writes are unavailable in this core, while FileMaker ESS can write supported sources ;; A write accepted in FileMaker fails here ;; A write and transaction comparison after the SQL write item is implemented -->
