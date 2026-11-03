// Stored times are text, so SQL needs a seconds key for the supported aggregate and comparison forms.
import type { Table } from '../../fmp12/src/index.ts';
import { sqlTokens, type SqlToken } from './sql-tokens.ts';

const COMPARE = new Set(['<', '<=', '>', '>=']);

/** Names that denote a normal time field in every table with a field of that name. */
export function timeColumnNames(tables: readonly Table[]): Set<string> {
  const kinds = new Map<string, boolean>();
  for (const table of tables) for (const field of table.fields) {
    const key = field.name.toLowerCase();
    kinds.set(key, (kinds.get(key) ?? true) && field.type === 'time' && field.kind === 'normal');
  }
  return new Set([...kinds].filter(([, time]) => time).map(([name]) => name));
}

export function timeComparisons(sql: string, tables: readonly Table[]): string {
  if (!/\b(?:MAX|MIN|BETWEEN)\b|[<>]/i.test(sql)) return sql;
  const times = timeColumnNames(tables);
  if (!times.size) return sql;
  const all = sqlTokens(sql);
  const tokens: SqlToken[] = [];
  for (const token of all) {
    if (token.kind === 'space' || token.kind === 'comment') continue;
    // The tokenizer emits each symbol separately, so combine adjacent <= and >=.
    const last = tokens[tokens.length - 1];
    if (last && token.text === '=' && (last.text === '<' || last.text === '>') && last.end === token.start) {
      tokens[tokens.length - 1] = { ...last, text: last.text + '=', end: token.end };
    } else tokens.push(token);
  }
  const unquote = (s: string) => s.startsWith('"') ? s.slice(1, -1).replace(/""/g, '"') : s;
  const isTime = (i: number): number => {
    // A column is a bare name or qualifier.name. Return its token count.
    const first = tokens[i];
    if (!first || (first.kind !== 'word' && first.kind !== 'identifier')) return 0;
    if (tokens[i + 1]?.text === '.' && tokens[i + 2]
      && (tokens[i + 2].kind === 'word' || tokens[i + 2].kind === 'identifier')) {
      return times.has(unquote(tokens[i + 2].text).toLowerCase()) ? 3 : 0;
    }
    return times.has(unquote(first.text).toLowerCase()) ? 1 : 0;
  };
  const edits: { start: number; end: number; text: string }[] = [];
  const operand = (i: number): number => (tokens[i]
    && (tokens[i].kind === 'string' || tokens[i].kind === 'parameter' || tokens[i].text === '?') ? 1 : 0);
  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i];
    if (word.kind === 'word' && /^(?:MAX|MIN)$/i.test(word.text) && tokens[i + 1]?.text === '(') {
      const count = isTime(i + 2);
      const qualified = tokens[i - 1]?.text === '.';
      if (count && tokens[i + 2 + count]?.text === ')' && !qualified
        && !/^OVER$/i.test(tokens[i + 3 + count]?.text ?? '')) {
        edits.push({ start: word.start, end: word.end, text: `fm_time_${word.text.toLowerCase()}` });
        i += 2 + count;
      }
      continue;
    }
    const count = isTime(i);
    if (!count || tokens[i - 1]?.text === '.') continue;
    const op = tokens[i + count];
    const before = tokens[i - 1];
    if (before && before.kind === 'word' && /^(?:AS|FROM|JOIN)$/i.test(before.text)) continue;
    if (op && COMPARE.has(op.text) && operand(i + count + 1)) {
      const column = tokens.slice(i, i + count);
      const rhs = tokens[i + count + 1];
      edits.push({ start: column[0].start, end: column.at(-1)!.end,
        text: `fm_time_seconds(${sql.slice(column[0].start, column.at(-1)!.end)})` });
      edits.push({ start: rhs.start, end: rhs.end, text: `fm_time_seconds(${rhs.text})` });
      i += count + 1;
    } else if (op && /^BETWEEN$/i.test(op.text) && operand(i + count + 1)
      && /^AND$/i.test(tokens[i + count + 2]?.text ?? '') && operand(i + count + 3)) {
      const column = tokens.slice(i, i + count);
      const lo = tokens[i + count + 1], hi = tokens[i + count + 3];
      edits.push({ start: column[0].start, end: column.at(-1)!.end,
        text: `fm_time_seconds(${sql.slice(column[0].start, column.at(-1)!.end)})` });
      edits.push({ start: lo.start, end: lo.end, text: `fm_time_seconds(${lo.text})` });
      edits.push({ start: hi.start, end: hi.end, text: `fm_time_seconds(${hi.text})` });
      i += count + 3;
    }
  }
  let out = sql;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
  }
  return out;
}
