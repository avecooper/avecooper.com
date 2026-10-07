import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const publicFiles = [
  'favicon.ico', 'favicon.svg',
  ...['job-radar-system-overview.svg', 'posting-provenance-comparison.svg',
    'privacy-safe-engagement-projection.svg', 'replica-publication-recovery.svg',
    'morgan-coleman-resume-crop.webp'].map(name => `assets/job-radar/${name}`),
];
const origin = 'https://avecooper.com';
const inside = (root, target) => target === root || (!path.relative(root, target).startsWith('..') && !path.isAbsolute(path.relative(root, target)));

async function parsers() {
  try {
    const [html, entities, css] = await Promise.all([
      import('ultrahtml'), import('html-escaper'), import('css-tree'),
    ]);
    return { html, decode: entities.unescape, css };
  } catch {
    throw new Error('PARSER_UNAVAILABLE: required locked ultrahtml/html-escaper/css-tree modules could not load');
  }
}

// Read attributes from the parser's opening-tag span: ultrahtml omits unquoted
// values. Quotes delimit HTML values; backslashes do not escape HTML quotes.
function attributes(openingTag, decode) {
  const result = Object.create(null);
  const source = openingTag.replace(/^<[a-zA-Z][a-zA-Z0-9:-]*/, '').replace(/>$/, '');
  const tokens = /([^\t\n\f\r />=]+)(?:[\t\n\f\r ]*=[\t\n\f\r ]*(?:"([^"]*)"|'([^']*)'|([^\t\n\f\r >]+)))?/g;
  for (const match of source.matchAll(tokens)) {
    const name = match[1].toLowerCase();
    // HTML keeps the first occurrence of a duplicate attribute.
    if (!Object.hasOwn(result, name)) result[name] = decode(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return result;
}

// Srcset collects a URL through ASCII whitespace (commas can be part of URLs).
// Trailing URL commas or a comma after descriptors terminate a candidate.
function srcset(value) {
  const urls = [];
  let rest = value;
  while (rest.length) {
    rest = rest.replace(/^[\t\n\f\r ,]+/, '');
    if (!rest) break;
    const token = rest.match(/^[^\t\n\f\r ]+/)[0];
    rest = rest.slice(token.length);
    if (token.endsWith(',')) {
      urls.push(token.replace(/,+$/, ''));
      continue;
    }
    urls.push(token);
    let depth = 0, i = 0;
    for (; i < rest.length; i++) {
      if (rest[i] === '(') depth++;
      if (rest[i] === ')') depth--;
      if (rest[i] === ',' && depth === 0) { i++; break; }
    }
    rest = rest.slice(i);
  }
  return urls;
}

function infrastructure(host) {
  host = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host === '::' || host === '::1' || /^::ffff:(?:7f[\da-f]{2}:|a[\da-f]{2}:|c0a8:|ac1[\da-f]:)/.test(host) || /^(?:fc|fd)[\da-f]{2}:|^fe[89ab][\da-f]:/.test(host)) return true;
  const parts = host.split('.').map(Number);
  return parts.length === 4 && (parts[0] === 10 || parts[0] === 127 || parts[0] === 0 ||
    (parts[0] === 169 && parts[1] === 254) || (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31));
}
const privacyRules = [
  ['LOCAL_PATH', /\/Users\/|\/home\/|\/mnt\/|\/data\/|~\/|[A-Za-z]:[\\/]Users[\\/]|\\\\[\w.-]+[\\/]|\bfile:/i],
  ['PRIVATE_KEY', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/],
  ['CREDENTIAL_PREFIX', /\b(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-(?:proj-)?[A-Za-z0-9_-]{20,})\b/],
  ['CREDENTIAL_ASSIGNMENT', /\b(?:API_KEY|ACCESS_TOKEN|CLIENT_SECRET|PASSWORD)["']?\s*[:=]\s*["']?(?!null\b|undefined\b|false\b)[A-Za-z0-9_+\/.=-]{4,}/i],
];
const rawEvidence = /^(?:capture-manifest|application-show|render-validation|origin-dossier|current-posting|provenance-summary|generated-projection|installed-projection(?:-before)?|private-engagement-summary|private-vs-projection-summary|confirmation-receipt|semantic-hash|preservation|recovery|result|status|search-annotation|workflow-summary|materials-validation|materials-approval|reliability-matrix)\.(?:json|txt|md)$/i;
const forbiddenFile = /(?:^|\/)(?:\.env(?:\..*)?|id_rsa|id_ed25519|credentials(?:\.[^/]*)?)$|\.(?:pem|key|p12|pfx|db|sqlite3?|bak|backup|sql|zip|tar|gz|7z|pdf|map)$|(?:-wal|-shm)$/i;
const readable = /\.(?:html?|svg|css|[cm]?js|json|txt|text|md|xml|ya?ml|csv|log)$/i;

export async function checkRelease({ buildRoot, publicRoot }) {
  const { html, decode, css } = await parsers();
  buildRoot = path.resolve(buildRoot);
  publicRoot = path.resolve(publicRoot);
  const findings = [], documents = new Map(), references = [];
  const counts = { links: 0, assets: 0, privacy: 0, external: 0 };
  // Diagnostics intentionally contain no URL or matched payload, even on parse errors.
  const add = (category, file, rule) => {
    const safeFile = privacyRules.some(([, pattern]) => pattern.test(file))
      ? `${file.split('/')[0]}/redacted-filename` : file.replace(/[^\w./-]/g, '_');
    findings.push({ category, file: safeFile, rule });
  };
  async function inventory(root, prefix) {
    const files = [];
    async function visit(directory) {
      for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        const absolute = path.join(directory, entry.name), relative = path.relative(root, absolute).split(path.sep).join('/');
        if (entry.isSymbolicLink()) { add('privacy', `${prefix}/${relative}`, 'SYMLINK'); continue; }
        if (entry.isDirectory()) await visit(absolute);
        else if (entry.isFile()) files.push(relative);
        else add('privacy', `${prefix}/${relative}`, 'UNSUPPORTED_FILE');
      }
    }
    try {
      if ((await fs.lstat(root)).isSymbolicLink() || await fs.realpath(root) !== root) throw new Error();
      await visit(root);
    } catch { add('privacy', prefix, 'INVENTORY_UNREADABLE_OR_UNSAFE'); }
    return files.sort();
  }
  function scan(text, file) {
    counts.privacy++;
    for (const [rule, pattern] of privacyRules) if (pattern.test(text)) add('privacy', file, rule);
    for (const match of text.matchAll(/(?:https?:)?\/\/[^\s<>"'()]+/gi)) {
      try { if (infrastructure(new URL(match[0], origin).hostname)) add('privacy', file, 'INFRASTRUCTURE_URL'); } catch { /* URL syntax is checked for actual references below. */ }
    }
  }
  function reference(value, owner, category) { references.push({ value, owner, category }); }
  function cssReferences(text, owner, context = 'stylesheet') {
    try {
      const ast = css.parse(text, { context, onParseError() { throw new Error(); } });
      css.walk(ast, node => {
        if (node.type === 'Url') reference(node.value, owner, 'assets');
        if (node.type === 'Atrule' && node.name.toLowerCase() === 'import') {
          node.prelude?.children.forEach(child => { if (child.type === 'String') reference(child.value, owner, 'assets'); });
        }
      });
    } catch { add('assets', `dist/${owner}`, 'CSS_PARSE'); }
  }
  function document(text, owner) {
    const ids = new Set();
    try {
      html.walkSync(html.parse(text), node => {
        if (node.type !== html.ELEMENT_NODE) return;
        const name = node.name.toLowerCase();
        const a = attributes(text.slice(node.loc[0].start, node.loc[0].end), decode);
        if (a.id) ids.add(a.id);
        if (name === 'a' && a.name) ids.add(a.name);
        if (a.href && name === 'a') reference(a.href, owner, 'links');
        if (a.href && name === 'link' && /(?:stylesheet|icon|preload|modulepreload)/i.test(a.rel ?? '')) reference(a.href, owner, 'assets');
        if (a.src && ['img', 'script', 'source', 'audio', 'video', 'track', 'iframe', 'embed', 'input'].includes(name)) reference(a.src, owner, 'assets');
        if (a.poster) reference(a.poster, owner, 'assets');
        if (name === 'object' && a.data) reference(a.data, owner, 'assets');
        for (const candidate of srcset(a.srcset ?? '')) reference(candidate, owner, 'assets');
        if (a.style) cssReferences(a.style, owner, 'declarationList');
        if (name === 'style') cssReferences(node.children.map(child => child.value ?? '').join(''), owner);
        let svg = node;
        while (svg && svg.name?.toLowerCase() !== 'svg') svg = svg.parent;
        if (svg) {
          if (name !== 'a' && a.href) reference(a.href, owner, 'assets');
          if (a['xlink:href']) reference(a['xlink:href'], owner, name === 'a' ? 'links' : 'assets');
          for (const [key, value] of Object.entries(a)) if (key !== 'style' && /url\(/i.test(value)) cssReferences(value, owner, 'value');
        }
      });
    } catch { add('assets', `dist/${owner}`, 'DOCUMENT_PARSE'); }
    documents.set(owner, ids);
  }
  const built = await inventory(buildRoot, 'dist'), publicly = await inventory(publicRoot, 'public');
  for (const [root, prefix, files] of [[publicRoot, 'public', publicly], [buildRoot, 'dist', built]]) {
    for (const file of files) {
      const label = `${prefix}/${file}`;
      // Inspect names too, including unreferenced generated files with harmless contents.
      for (const [rule, pattern] of privacyRules) if (pattern.test(label)) add('privacy', label, rule);
      if (prefix === 'public' && !publicFiles.includes(file)) add('privacy', label, 'PUBLIC_INVENTORY');
      if (file.startsWith('assets/job-radar/') && !publicFiles.includes(file)) add('privacy', label, 'JOB_RADAR_INVENTORY');
      if (forbiddenFile.test(file) || rawEvidence.test(path.basename(file)) || /(?:^|\/)(?:captures?|transcripts?|private)(?:\/|$)/i.test(file)) add('privacy', label, 'PRIVATE_FILE');
      const data = await fs.readFile(path.join(root, file));
      if (data.subarray(0, 16).toString() === 'SQLite format 3\0') add('privacy', label, 'SQLITE_SIGNATURE');
      if (readable.test(file)) {
        const text = data.toString('utf8');
        scan(text, label);
        const decoded = (/\.css$/i.test(file) ? text : decode(text)).replace(/\\\//g, '/');
        if (decoded !== text) scan(decoded, label);
        if (prefix === 'dist') {
          if (/\.(?:html?|svg)$/i.test(file)) document(text, file);
          if (/\.css$/i.test(file)) cssReferences(text, file);
        }
      }
    }
  }
  for (const required of ['index.html', 'job-radar/index.html']) if (!built.includes(required)) add('links', `dist/${required}`, 'REQUIRED_ROUTE');
  for (const { value, owner, category } of references) {
    counts[category]++;
    const label = `dist/${owner}`;
    let url;
    try {
      if (/%(?![\da-f]{2})/i.test(value) || /[\u0000-\u001f\u007f]/.test(value)) throw new Error();
      url = new URL(value, `${origin}/${owner.replace(/index\.html$/, '')}`);
      const decoded = decodeURIComponent(value);
      for (const [rule, pattern] of privacyRules) if (pattern.test(decoded)) add('privacy', label, rule);
      if (url.protocol === 'file:') { add('privacy', label, 'LOCAL_PATH'); continue; }
      if (infrastructure(url.hostname)) add('privacy', label, 'INFRASTRUCTURE_URL');
      if (url.username || url.password) add('privacy', label, 'URL_CREDENTIALS');
      if (url.protocol === 'mailto:') {
        if (!/^[^\s@]+@[^\s@]+(?:,[^\s@]+@[^\s@]+)*$/.test(decodeURIComponent(url.pathname))) throw new Error();
        counts.external++; continue;
      }
      if (!['https:', 'http:'].includes(url.protocol) || value.startsWith('//') || url.hostname !== 'avecooper.com' || url.port) { counts.external++; continue; }
      const pathname = decodeURIComponent(url.pathname);
      if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').includes('..')) throw new Error();
      let target = path.resolve(buildRoot, `.${pathname}`);
      if (!inside(buildRoot, target)) throw new Error();
      let relative = path.relative(buildRoot, target).split(path.sep).join('/');
      if (!built.includes(relative)) relative = `${relative.replace(/\/$/, '')}${relative ? '/' : ''}index.html`;
      if (!built.includes(relative)) { add(category, label, 'MISSING_DESTINATION'); continue; }
      if (url.hash) {
        const id = decodeURIComponent(url.hash.slice(1));
        if (id && documents.has(relative) && !documents.get(relative).has(id)) add(category, label, 'MISSING_FRAGMENT');
      }
    } catch { add(category, label, 'INVALID_URL'); }
  }
  return { findings, counts };
}

export function report(result, write = console.log) {
  for (const finding of result.findings) write(`FAIL ${finding.category}: ${finding.file} [${finding.rule}]`);
  for (const category of ['links', 'assets', 'privacy']) write(`${result.findings.some(f => f.category === category) ? 'FAIL' : 'PASS'} ${category}: ${result.counts[category]} checks`);
  write(`INFO ${result.counts.external} nonlocal/embedded references: syntax only; destinations not validated`);
  return result.findings.length ? 1 : 0;
}

async function main() {
  const dist = path.join(repository, 'dist');
  if (await fs.realpath(repository) !== repository || path.dirname(dist) !== repository) throw new Error('UNSAFE_CLEANUP');
  try {
    const stat = await fs.lstat(dist);
    if (stat.isSymbolicLink() || !stat.isDirectory() || await fs.realpath(dist) !== dist) throw new Error('UNSAFE_CLEANUP');
    // Refuse nested symlinks too; cleanup never follows a link.
    async function guard(dir) {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        if (entry.isSymbolicLink()) throw new Error('UNSAFE_CLEANUP');
        if (entry.isDirectory()) await guard(path.join(dir, entry.name));
      }
    }
    await guard(dist);
    await fs.rm(dist, { recursive: true });
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  console.log('PASS cleanup: fixed repository dist directory');
  for (const [stage, args] of [['diagnostics and production build', [process.env.npm_execpath, 'run', 'validate']], ['checker tests', ['--test', 'scripts/verify.test.mjs']]]) {
    console.log(`START ${stage}`);
    const child = spawnSync(process.execPath, args, { cwd: repository, stdio: 'inherit' });
    if (child.error || child.status !== 0) { console.log(`FAIL ${stage}`); return 1; }
    console.log(`PASS ${stage}`);
  }
  return report(await checkRelease({ buildRoot: dist, publicRoot: path.join(repository, 'public') }));
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error(error.message.startsWith('PARSER_UNAVAILABLE:') ? error.message : 'FAIL verification: cleanup or release read error (no payload printed)');
    process.exitCode = 1;
  });
}
