import assert from 'node:assert/strict';
import test from 'node:test';
import { fmpTarget, parseFmpUrl } from '../src/url-script.ts';

test('parses fmp URL fields once and discards credentials', () => {
  assert.deepEqual(parseFmpUrl('fmp://$/Sales?script=Go%20Now&param=a%26b&$x=1&$y[2]=z'), {
    host: '$', file: 'Sales', script: 'Go Now', parameter: 'a&b', variables: { '$x': '1', '$y[2]': 'z' },
  });
  assert.deepEqual(parseFmpUrl('fmp26://host.example.com/Sales.fmp12?script=s'), { host: 'host.example.com', file: 'Sales.fmp12', script: 's', parameter: '', variables: {} });
  assert.equal(parseFmpUrl('FMP://~/Local?script=s')?.host, '~');
  const credentials = parseFmpUrl('fmp://admin:secret@host/F');
  assert.equal(JSON.stringify(credentials)?.includes('admin'), false);
  assert.equal(JSON.stringify(credentials)?.includes('secret'), false);
  assert.equal(parseFmpUrl('fmp://$/')?.file, '');
  assert.equal(parseFmpUrl('https://host/F'), undefined);
  assert.equal(parseFmpUrl('fmp://$/F?script=a%2520b')?.script, 'a%20b');
  const many = Array.from({ length: 25 }, (_, i) => `&%24v${i}=x`).join('');
  assert.equal(Object.keys(parseFmpUrl(`fmp://$/F?script=s${many}`)!.variables).length, 20);
});

test('routes fmp URLs by host and case insensitive file name', () => {
  const context = { hostname: 'app.example.com', port: '443', currentFile: 'Sales.fmp12' };
  assert.equal(fmpTarget(parseFmpUrl('fmp://$/sales?script=s')!, context), 'this-file');
  assert.equal(fmpTarget(parseFmpUrl('fmp://app.example.com/Other')!, context), 'other-file');
  assert.equal(fmpTarget(parseFmpUrl('fmp://elsewhere/Other')!, context), 'other-host');
  assert.equal(fmpTarget(parseFmpUrl('fmp://~/Other')!, context), 'local-file');
  assert.equal(fmpTarget(parseFmpUrl('fmp://$/')!, context), 'invalid');
});
