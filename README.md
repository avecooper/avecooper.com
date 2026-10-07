# avecooper.com

Source for the public portfolio website at avecooper.com.

Built with Astro as a statically generated site.

## Local development

Requires Node.js 24 and npm.

Install dependencies:

```sh
npm ci
```

Start the local development server:

```sh
npm run dev
```

Run Astro diagnostics:

```sh
npm run check
```

Create a production build:

```sh
npm run build
```

Run the established diagnostics and production build:

```sh
npm run validate
```

## Release verification

```sh
npm run verify
```

PRs run this command. It removes only this repository's fixed `dist/` directory
(refusing symlinks or unsafe resolution), runs unchanged `npm run validate`, runs
focused Node checker tests, then checks the fresh build and public inventory.
Build/test failures stop the command; release findings are aggregated. Any failure
exits nonzero. Diagnostics show relative files and rule names, never matched
credentials or rejected URL payloads.

Checks cover both required routes, local navigation and fragment targets (including
cross-page and same-site absolute URLs), HTML resources and srcset, CSS imports,
fonts and URLs, and inline/standalone SVG references. Encoded paths, queries and
SVG IDs are handled separately. External HTTP(S), protocol-relative, mailto, data
and other schemes receive local URL syntax handling only; their destinations are
not contacted. Embedded data resources have no filesystem check. SVG inspection
checks references, not XML structure or rendering.

Privacy checks inspect `public/` and build filenames and readable HTML, SVG, CSS,
JS, JSON and text (also XML, YAML, CSV and logs). Rules reject local path signatures
(`/Users/`, `/home/`, `/mnt/`, `/data/`, `~/`, Windows user paths, UNC and `file:`),
local infrastructure URLs, URL credentials, PEM/OpenSSH private-key headers,
AWS `AKIA`, GitHub token and OpenAI `sk-` prefixes, and concrete assignments to
`API_KEY`, `ACCESS_TOKEN`, `CLIENT_SECRET` or `PASSWORD`. They also reject environment,
key, database, backup/archive, PDF and source-map files, SQLite signatures, and
storyboard-excluded raw evidence filenames/directories. There is no entropy scan,
contact-address ban, narrative keyword ban or generic identifier/JSON ban.

The explicit `publicFiles` list in `scripts/verify.mjs` contains the two favicons,
four authored Job Radar SVGs and approved résumé WebP. Intentional public additions
require updating that list. The same Job Radar asset restriction applies to build
output; generated Astro assets elsewhere are allowed. Approved contacts, fictional
names, evidence numbers/dates, asset hashes and SVG IDs remain allowed.

The checker imports `ultrahtml`, `html-escaper` and `css-tree` through ordinary module
resolution from the current locked transitive dependencies. No browser DOM or new
dependency is required. Dependency updates must preserve availability; missing
parsers fail explicitly rather than skipping checks. Tests use temporary fixtures
and never inject faults into real source or assets.

These narrow checks do not certify private facts, unfamiliar encodings/credentials,
image pixels or binary metadata, external destinations, runtime JavaScript URLs,
rendering, accessibility, image quality, or comprehensive security/privacy. Broader
maintenance guidance belongs to PRJ-25; deployment remains separate.

## Repository workflow

- `main` is the stable branch.
- Implementation work happens on issue-scoped branches.
- Open a pull request into `main` for implementation changes.
- Pull requests run the repository validation workflow before merge.
- PR validation checks the site but does not deploy it.
- Deployment and custom-domain configuration are handled separately.
- Private career data, production Job Radar data, and other private source material do not belong in this public repository.
