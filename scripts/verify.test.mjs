import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkRelease, publicFiles, report } from './verify.mjs';

async function fixture(t) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-verify-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const buildRoot = path.join(root, 'dist'), publicRoot = path.join(root, 'public');
  async function put(base, name, text) {
    await fs.mkdir(path.dirname(path.join(base, name)), { recursive: true });
    await fs.writeFile(path.join(base, name), text);
  }
  for (const file of publicFiles) {
    for (const base of [buildRoot, publicRoot]) await put(base, file, file.endsWith('.svg') ? '<svg><marker id="arrow"/></svg>' : 'approved fixture');
  }
  await put(buildRoot, 'index.html', '<main id="main"><a href="/job-radar/#decision">case</a></main>');
  await put(buildRoot, 'job-radar/index.html', '<h1 id="decision">Case</h1>');
  return { buildRoot, publicRoot, put: (name, text) => put(buildRoot, name, text), check: () => checkRelease({ buildRoot, publicRoot }) };
}
const has = (result, rule, category) => result.findings.some(f => f.rule === rule && (!category || f.category === category));

test('allowed content, encoded/query URLs, CSS fonts, srcset and SVG targets', async t => {
  const f = await fixture(t);
  await f.put('index.html', `<main id="main">contact@avecooper.com morgan.coleman@candidate.example +1 202-555-0147 Morgan Coleman Snapshot 2 2026-04-07 a6-row-3
    <a href="https://avecooper.com/job-radar/?view=1#dec%69sion">case</a>
    <a href="mailto:contact@avecooper.com?subject=Hello%20there">email</a>
    <a href="https://external.example/path">external</a><a href="//avecooper.com/remote">protocol relative</a>
    <a href="#main">skip</a><a href="job-radar/?q=1#decision">relative</a>
    <img src="/_astro/image%20one.webp?v=1" srcset="data:image/svg+xml,%3Csvg%3E 1x, /_astro/image%20one.webp?x=2 2x">
    <link rel="stylesheet" href="/_astro/styles.abc123.css">
    <svg><marker id="arrow"/><path marker-end="url(#arrow)"/><use href="/favicon.svg#arrow"/></svg>
  </main>`);
  await f.put('_astro/image one.webp', 'image');
  await f.put('_astro/styles.abc123.css', '@import "more.css?version=1"; @font-face{src:url("font%20one.woff2?v=3")}');
  await f.put('_astro/more.css', 'body{background:url(data:image/png;base64,abcd)}');
  await f.put('_astro/font one.woff2', 'font');
  const result = await f.check();
  assert.deepEqual(result.findings, []);
  assert.equal(report(result, () => {}), 0);
});

test('missing assets include srcset and CSS font references', async t => {
  const f = await fixture(t);
  await f.put('index.html', '<img src="missing.webp"><img srcset="data:image/png;base64,aaaa 1x, /missing-two.webp 2x"><link rel="stylesheet" href="/style.css">');
  await f.put('style.css', '@font-face{src:url(missing.woff2)}');
  const result = await f.check();
  assert.equal(result.findings.filter(x => x.category === 'assets' && x.rule === 'MISSING_DESTINATION').length, 3);
});

test('missing route, cross-page fragment, and SVG fragment', async t => {
  const f = await fixture(t);
  await f.put('index.html', '<a href="/absent/">missing</a><a href="/job-radar/?q=1#absent">fragment</a><svg><use href="/favicon.svg#absent"/></svg>');
  const result = await f.check();
  assert.ok(has(result, 'MISSING_DESTINATION', 'links'));
  assert.ok(has(result, 'MISSING_FRAGMENT', 'links'));
  assert.ok(has(result, 'MISSING_FRAGMENT', 'assets'));
});

test('synthetic path, private key, raw file, credential and infrastructure violations are redacted', async t => {
  const f = await fixture(t);
  await f.put('index.html', '<p>/Users/synthetic-probe/secret.txt -----BEGIN PRIVATE KEY----- API_KEY="synthetic-secret-value"</p><a href="file:///Users/synthetic-probe/hidden">local</a><img src="http://127.0.0.1/private">');
  await f.put('assets/job-radar/capture-manifest.json', '{}');
  await f.put('database.bin', 'SQLite format 3\0payload');
  const result = await f.check();
  for (const rule of ['LOCAL_PATH', 'PRIVATE_KEY', 'CREDENTIAL_ASSIGNMENT', 'INFRASTRUCTURE_URL', 'PRIVATE_FILE', 'JOB_RADAR_INVENTORY', 'SQLITE_SIGNATURE']) assert.ok(has(result, rule), rule);
  const lines = [];
  assert.equal(report(result, line => lines.push(line)), 1);
  assert.doesNotMatch(lines.join('\n'), /synthetic-secret-value|synthetic-probe|BEGIN PRIVATE KEY|127\.0\.0\.1/);
  // Exercise process exit behavior through the same reporter, without production cleanup/build.
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `import {checkRelease,report} from ${JSON.stringify(new URL('./verify.mjs', import.meta.url).href)}; process.exitCode=report(await checkRelease(${JSON.stringify({ buildRoot: f.buildRoot, publicRoot: f.publicRoot })}));`], { encoding: 'utf8' });
  assert.equal(child.status, 1);
  assert.doesNotMatch(child.stdout, /synthetic-secret-value|synthetic-probe/);
});

test('inventory rejects public additions and symlinks without following them', async t => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.publicRoot, 'extra.json'), '{}');
  await fs.symlink(f.publicRoot, path.join(f.buildRoot, 'linked'));
  const result = await f.check();
  assert.ok(has(result, 'PUBLIC_INVENTORY'));
  assert.ok(has(result, 'SYMLINK'));
});

test('encoded traversal and malformed URLs fail without leaking rejected URLs', async t => {
  const f = await fixture(t);
  await f.put('index.html', '<a href="/%2e%2e%2fhidden">escape</a><a href="/%zz-secret">bad</a><a href="mailto:invalid">mail</a>');
  const result = await f.check();
  assert.equal(result.findings.filter(x => x.rule === 'INVALID_URL').length, 3);
  const lines = []; report(result, x => lines.push(x));
  assert.doesNotMatch(lines.join('\n'), /hidden|zz-secret/);
});

test('named anchors, resource types, inline CSS and SVG xlink references', async t => {
  const f = await fixture(t);
  await f.put('index.html', `<a name="legacy"></a><a href="#legacy">named</a>
    <script src="/bundle.js"></script><video poster="/poster.webp"><source src="/clip.mp4"></video>
    <link rel="preload" href="/font.woff2"><style>body{background:url(/poster.webp)}</style>
    <div style="background:url('/poster.webp')"></div>
    <svg><marker id="local"/><use xlink:href="#local"/><use href="/favicon.svg?version=1#arr%6fw"/></svg>`);
  for (const name of ['bundle.js', 'poster.webp', 'clip.mp4', 'font.woff2']) await f.put(name, 'fixture');
  assert.deepEqual((await f.check()).findings, []);
  await fs.rm(path.join(f.buildRoot, 'bundle.js'));
  assert.ok(has(await f.check(), 'MISSING_DESTINATION', 'assets'));
});

test('required route and encoded privacy hazards fail; normal contacts remain allowed', async t => {
  const f = await fixture(t);
  await f.put('index.html', '<a href="/%55sers/synthetic/hidden">encoded path</a><p>avery@avecooper.com contact@avecooper.com Northline Relay</p>');
  await fs.rm(path.join(f.buildRoot, 'job-radar/index.html'));
  const result = await f.check();
  assert.ok(has(result, 'REQUIRED_ROUTE'));
  assert.ok(has(result, 'LOCAL_PATH'));
  assert.ok(result.findings.every(x => ['REQUIRED_ROUTE', 'LOCAL_PATH', 'MISSING_DESTINATION'].includes(x.rule)));
});


test('recognizable credentials and private IPv6 URLs are rejected and filename payloads redacted', async t => {
  const f = await fixture(t);
  const token = 'ghp_' + 'a'.repeat(24);
  await f.put('index.html', `<a href="http://[fd00::1]/private">local IPv6</a><p>${token}</p>`);
  await f.put(`${token}.txt`, token);
  const result = await f.check();
  assert.ok(has(result, 'CREDENTIAL_PREFIX'));
  assert.ok(has(result, 'INFRASTRUCTURE_URL'));
  const lines = []; report(result, line => lines.push(line));
  assert.ok(lines.some(line => line.includes('redacted-filename')));
  assert.ok(lines.every(line => !line.includes(token)));
});

test('unquoted references fail when missing; quoted and unquoted IDs resolve', async t => {
  const f = await fixture(t);
  await f.put('index.html', `<main id=unquoted><a href=#unquoted>unquoted</a>
    <a href='#quoted'>quoted</a><span id="quoted"></span>
    <a href=/job-radar/#decision>cross-page</a><a name=legacy></a><a href=#legacy>named</a>
    <img src=/_astro/present.webp><img src="/_astro/present.webp"></main>`);
  await f.put('_astro/present.webp', 'image');
  assert.deepEqual((await f.check()).findings, []);
  await f.put('index.html', '<a href=/missing/>missing link</a><img src=/missing.webp>');
  const result = await f.check();
  assert.equal(result.findings.filter(x => x.rule === 'MISSING_DESTINATION' && x.category === 'links').length, 1);
  assert.equal(result.findings.filter(x => x.rule === 'MISSING_DESTINATION' && x.category === 'assets').length, 1);
});

test('HTML entities decode once; CSS URLs preserve literal entity spellings', async t => {
  const f = await fixture(t);
  // Browser HTML parsing yields the literal ID "a&amp;b", not "a&b".
  await f.put('index.html', `<span id="a&amp;amp;b"></span><a href="#a&amp;amp;b">nested</a>
    <span id=unquoted&amp;amp;id></span><a href=#unquoted&amp;amp;id>unquoted nested</a>
    <link rel=stylesheet href=/_astro/literal.css>
    <style>body{background:url('/_astro/raw&amp;.webp')}</style>
    <div style="background:url('/_astro/attribute&amp;amp;.webp')"></div>`);
  await f.put('_astro/literal.css', '@import "more&amp;.css"; @font-face{src:url("font&amp;.woff2")}');
  for (const name of ['raw&amp;.webp', 'attribute&amp;.webp', 'font&amp;.woff2']) await f.put(`_astro/${name}`, 'fixture');
  await f.put('_astro/more&amp;.css', 'body{color:black}');
  assert.deepEqual((await f.check()).findings, []);
  // Wrong, twice-decoded destinations must not rescue missing browser destinations.
  await f.put('_astro/font&.woff2', 'decoy');
  await fs.rm(path.join(f.buildRoot, '_astro/font&amp;.woff2'));
  const result = await f.check();
  assert.equal(result.findings.filter(x => x.rule === 'MISSING_DESTINATION').length, 1);
  await f.put('index.html', '<span id="a&b"></span><a href="#a&amp;amp;b">wrong target</a>');
  assert.ok(has(await f.check(), 'MISSING_FRAGMENT', 'links'));
});

test('srcset preserves comma-containing filenames and checks every candidate', async t => {
  const f = await fixture(t);
  await f.put('index.html', `<img srcset="/_astro/a,b.webp 1x, /_astro/second.webp 2x">
    <img srcset="data:image/png;base64,aaaa 1x, /_astro/a,b.webp 2x">
    <img srcset="/_astro/second.webp, /_astro/a,b.webp 2x">
    <img srcset="/_astro/a,b.webp 320w, /_astro/second.webp 640w">`);
  await f.put('_astro/a,b.webp', 'image');
  await f.put('_astro/second.webp', 'image');
  assert.deepEqual((await f.check()).findings, []);
  await fs.rm(path.join(f.buildRoot, '_astro/a,b.webp'));
  const result = await f.check();
  assert.equal(result.findings.filter(x => x.rule === 'MISSING_DESTINATION').length, 4);
  await f.put('_astro/a,b.webp', 'image');
  await fs.rm(path.join(f.buildRoot, '_astro/second.webp'));
  assert.equal((await f.check()).findings.filter(x => x.rule === 'MISSING_DESTINATION').length, 3);
});

test('unreferenced generated filenames receive privacy checks with redaction', async t => {
  const f = await fixture(t);
  await f.put('_astro/generated.abc123.js', 'export {};');
  assert.deepEqual((await f.check()).findings, []);
  const token = 'ghp_' + 'b'.repeat(24);
  await f.put('_astro/Users/synthetic/config.js', 'export {};');
  await f.put(`_astro/${token}.js`, 'export {};');
  const result = await f.check();
  assert.ok(has(result, 'LOCAL_PATH'));
  assert.ok(has(result, 'CREDENTIAL_PREFIX'));
  assert.equal(result.findings.length, 2);
  const lines = [];
  assert.equal(report(result, line => lines.push(line)), 1);
  assert.ok(lines.every(line => !line.includes('Users') && !line.includes('synthetic') && !line.includes(token)));
  assert.ok(lines.some(line => line.includes('dist/redacted-filename') && line.includes('LOCAL_PATH')));
});
