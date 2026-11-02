import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contrastRatio, parseColor } from '../src/design/contrast.ts';

const files = [
  ['tokens.css', join(import.meta.dirname, '../tokens.css')],
  ['app.css', join(import.meta.dirname, '../app.css')],
  ['../../server/admin/index.html', join(import.meta.dirname, '../../server/admin/index.html')],
] as const;

const blocks = (source: string): Map<string, Map<string, string>> => {
  const result = new Map<string, Map<string, string>>();
  for (const match of source.matchAll(/(?:@media\s*([^{]+?)\s*\{\s*)?:root\s*\{([^}]*)\}/g)) {
    const media = (match[1] ?? '').replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
    const vars = new Map<string, string>();
    for (const declaration of match[2].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) vars.set(declaration[1], declaration[2].trim());
    result.set(media, vars);
  }
  return result;
};

const aliases: Record<string, string> = {
  brand: 'accent', 'brand-soft': 'accent-soft', 'brand-text': 'accent-text',
};
const lookup = (vars: Map<string, string>, name: string): [number, number, number] => {
  let value = vars.get(name);
  if (value === undefined && aliases[name]) value = vars.get(aliases[name]);
  for (let i = 0; i < 5 && value; i++) {
    const reference = /^var\(--([\w-]+)\)$/.exec(value);
    if (!reference) break;
    value = vars.get(reference[1]) ?? vars.get(aliases[reference[1]] ?? '');
  }
  assert.match(value ?? '', /^#[\da-f]{6}$/i, `--${name} must resolve to a six-digit hex colour`);
  const parsed = parseColor(`rgb(${parseInt(value!.slice(1, 3), 16)},${parseInt(value!.slice(3, 5), 16)},${parseInt(value!.slice(5, 7), 16)})`);
  assert.ok(parsed);
  return [parsed[0], parsed[1], parsed[2]];
};

const palettes = [
  ['light', ['']],
  ['dark', ['', 'prefers-color-scheme: dark']],
  ['more', ['', 'prefers-contrast: more']],
  ['more-dark', ['', 'prefers-color-scheme: dark', 'prefers-contrast: more', 'prefers-contrast: more and prefers-color-scheme: dark']],
  ['print', ['', 'print']],
] as const;

for (const [file, path] of files) {
  test(`${file}: text tokens keep their contrast against the surfaces in every palette`, () => {
    const parsed = blocks(readFileSync(path, 'utf8'));
    for (const [palette, layers] of palettes) {
      const vars = new Map<string, string>();
      for (const layer of layers) for (const [name, value] of parsed.get(layer) ?? []) vars.set(name, value);
      assert.ok(vars.size > 10, `${file} ${palette}: expected token declarations`);
      const pairs: [string, string, number][] = [];
      for (const surface of ['bg', 'panel', 'sunken', 'field', 'brand-soft', 'ok-soft', 'bad-soft', 'warn-soft']) pairs.push(['text', surface, 4.5]);
      for (const token of ['muted', 'faint']) for (const surface of ['bg', 'panel', 'sunken', 'field']) pairs.push([token, surface, palette.startsWith('more') ? 7 : 4.5]);
      for (const surface of ['bg', 'panel', 'sunken', 'field', 'brand-soft']) pairs.push(['brand', surface, 4.5]);
      for (const token of ['ok', 'bad', 'warn']) {
        for (const surface of ['bg', 'panel', 'sunken', 'field', `${token}-soft`]) pairs.push([token, surface, 4.5]);
      }
      pairs.push(['brand-text', 'brand', 4.5]);
      const failures = pairs.flatMap(([fg, back, need]) => {
        const ratio = contrastRatio(lookup(vars, fg), lookup(vars, back));
        return ratio < need ? [`${fg} on ${back}: ${ratio.toFixed(2)} < ${need}`] : [];
      });
      assert.deepEqual(failures, [], `${file} ${palette}`);
    }
  });
}
