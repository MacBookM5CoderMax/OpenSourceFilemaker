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
  // A time term is a time column or a MAX or MIN of one. It is keyed by its first and its last token.
  const byFirst = new Map<number, number>();
  const byLast = new Map<number, number>();
  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i];
    if (word.kind === 'word' && /^(?:MAX|MIN)$/i.test(word.text) && tokens[i + 1]?.text === '(') {
      const count = isTime(i + 2);
      const qualified = tokens[i - 1]?.text === '.';
      if (count && tokens[i + 2 + count]?.text === ')' && !qualified
        && !/^OVER$/i.test(tokens[i + 3 + count]?.text ?? '')) {
        edits.push({ start: word.start, end: word.end, text: `fm_time_${word.text.toLowerCase()}` });
        byFirst.set(i, i + 2 + count);
        byLast.set(i + 2 + count, i);
        i += 2 + count;
      }
      continue;
    }
    const count = isTime(i);
    if (!count || tokens[i - 1]?.text === '.') continue;
    const before = tokens[i - 1];
    if (before && before.kind === 'word' && /^(?:AS|FROM|JOIN)$/i.test(before.text)) continue;
    byFirst.set(i, i + count - 1);
    byLast.set(i + count - 1, i);
    i += count - 1;
  }
  const wrap = (first: number, last: number) => {
    edits.push({ start: tokens[first].start, end: tokens[first].start, text: 'fm_time_seconds(' });
    edits.push({ start: tokens[last].end, end: tokens[last].end, text: ')' });
  };
  // A quoted time or placeholder may stand on the left only when what comes before it cannot continue an expression.
  const leftOperand = (i: number): boolean => operand(i) === 1 && !/^(?:\||\+|-|\*|\/|%|\.)$/.test(tokens[i - 1]?.text ?? '');
  const wrapped = new Set<number>();
  const wrapOnce = (first: number, last: number) => { if (!wrapped.has(first)) { wrapped.add(first); wrap(first, last); } };
  for (let k = 0; k < tokens.length; k++) {
    const op = tokens[k];
    const leftFirst = byLast.get(k - 1);
    const rightLast = byFirst.get(k + 1);
    if (COMPARE.has(op.text)) {
      const left = leftFirst !== undefined;
      const right = rightLast !== undefined;
      // Both sides must be a time term or a quoted time or placeholder, and at least one a time term.
      if (!(left || right) || !(left || leftOperand(k - 1)) || !(right || operand(k + 1))) continue;
      if (left) wrapOnce(leftFirst, k - 1); else wrap(k - 1, k - 1);
      if (right) wrapOnce(k + 1, rightLast); else wrap(k + 1, k + 1);
    } else if (/^BETWEEN$/i.test(op.text) && leftFirst !== undefined && operand(k + 1)
      && /^AND$/i.test(tokens[k + 2]?.text ?? '') && operand(k + 3)) {
      wrapOnce(leftFirst, k - 1);
      wrap(k + 1, k + 1);
      wrap(k + 3, k + 3);
    }
  }
  let out = sql;
  for (const edit of edits.sort((a, b) => b.start - a.start || b.end - a.end)) {
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
  }
  return out;
}
