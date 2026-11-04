// ConvertFromFileMakerPath and ConvertToFileMakerPath with URLPath on Windows paths: a drive letter keeps its colon and a
// share keeps its server as the URL's host. (What the product itself writes for these is unverified; this is RFC 8089.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateText } from '../src/index.ts';

const from = (path: string) => evaluateText(`ConvertFromFileMakerPath ( "${path}" ; URLPath )`);
const to = (url: string) => evaluateText(`ConvertToFileMakerPath ( "${url}" ; URLPath )`);

test('a drive letter keeps its colon in a file URL', () => {
  assert.equal(from('filewin:/C:/Users/a/b c.txt'), 'file:///C:/Users/a/b%20c.txt');
  assert.equal(from('file:/d:/x.txt'), 'file:///d:/x.txt');
  // Only the drive: a colon in any other part is still percent-encoded.
  assert.equal(from('filewin:/C:/a:b/c.txt'), 'file:///C:/a%3Ab/c.txt');
});

test('a Windows share keeps its server as the host of the URL', () => {
  assert.equal(from('filewin://srv/share/a b.txt'), 'file://srv/share/a%20b.txt');
  assert.equal(from('filewin://SRV/Share'), 'file://SRV/Share');
});

test('paths that are not Windows ones give the URLs they gave before', () => {
  assert.equal(from('filemac:/Macintosh HD/Users/a/b c.txt'), 'file:///Macintosh%20HD/Users/a/b%20c.txt');
  assert.equal(from('file:/x/b c.txt'), 'file:///x/b%20c.txt');
  assert.equal(from('file://x/b c.txt'), 'file:///x/b%20c.txt');
  assert.equal(from('filemac:/a:b/c'), 'file:///a%3Ab/c');
});

test('a file URL with a host is a share, and one with a drive is a drive', () => {
  assert.equal(to('file://srv/share/a%20b.txt'), '//srv/share/a b.txt');
  assert.equal(to('file:///C:/Users/a%20b.txt'), '/C:/Users/a b.txt');
  assert.equal(to('file://localhost/x/b%20c.txt'), '/x/b c.txt');
  assert.equal(to('file:///x/b%20c.txt'), '/x/b c.txt');
});

test('file URLs that are not paths are still refused', () => {
  assert.equal(to('file://srv'), '?');
  assert.equal(to('file://srv:80/x'), '?');
  assert.equal(to('file://srv/a%2'), '?');
  assert.equal(to('http://srv/x'), '?');
});

test('a Windows path goes to a URL and back to the FileMaker path it was', () => {
  assert.equal(to(from('filewin:/C:/Users/a/b c.txt')), '/C:/Users/a/b c.txt');
  assert.equal(to(from('filewin://srv/share/a b.txt')), '//srv/share/a b.txt');
});
