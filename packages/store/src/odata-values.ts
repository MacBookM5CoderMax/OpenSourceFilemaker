import type { DatabaseSync } from 'node:sqlite';
import { StoreError } from './errors.ts';

/** OData expressions use the same visible number, date and time values as record JSON. */
export function registerODataValueFunctions(sql: DatabaseSync): void {
  sql.function('fm_odata_number', { deterministic: true }, (value) => {
    if (value === null || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  });
  sql.function('fm_odata_date', { deterministic: true }, (value) =>
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);
  // Edm.TimeOfDay holds a time of one day: a duration (negative, or 100 hours or more) is null in JSON, so a filter sees it as null.
  sql.function('fm_odata_time', { deterministic: true }, (value) =>
    typeof value === 'string' && /^\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(value) ? value : null);
  sql.function('fm_odata_mod', { deterministic: true }, (left, right) => {
    if (left === null || right === null) return null;
    const divisor = Number(right);
    if (divisor === 0) throw new StoreError(8310, 'OData mod divisor is zero');
    const result = Number(left) % divisor;
    return Number.isFinite(result) ? result : null;
  });
}
