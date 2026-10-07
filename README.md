# avecooper.com

Avery Cooper’s public portfolio, built as a static Astro site. The homepage (`/`)
introduces Avery’s work; the Job Radar case study (`/job-radar/`) presents approved
narrative and curated evidence of systems design and judgment.

## Local setup

Use Node.js 24 and npm, matching both CI workflows. The package engine declaration
is broader (`>=22.12.0`); Node 24 is the supported project setup.

```sh
npm ci
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server while editing |
| `npm run check` | Astro diagnostics |
| `npm run build` | Production build in `dist/` |
| `npm run preview` | Serve the existing production build locally |
| `npm run validate` | Diagnostics and production build |
| `npm run verify` | Unified release check, including a fresh build |
| `npm run astro -- --help` | Astro CLI help |

For final rendered review, run `npm run verify`, then `npm run preview`.
See [maintenance guidance](docs/maintenance.md) for editing locations, evidence
privacy, validation limits, and release procedures. Agents should also read
[AGENTS.md](AGENTS.md).

## Publication status

Manual GitHub Pages deployment is prepared, but Pages configuration, custom-domain,
DNS, and HTTPS setup and actual publication have not been performed. PR verification
does not deploy the site. Publication requires prior human acceptance and explicit
authorization; see the [release procedure](docs/maintenance.md#release-and-publication).
Update this status after authorized setup and deployment have been checked.
