# Maintaining avecooper.com

This static two-page Astro portfolio uses a shared shell. Maintain the approved
professional argument and curated evidence within the current issue. The settled
MVP boundaries below may change through future explicitly approved work.

## Editing locations

| Location | What to maintain |
| --- | --- |
| [src/pages/index.astro](../src/pages/index.astro) | Homepage copy, actions, contact section, portrait integration; route `/` |
| [src/pages/job-radar.astro](../src/pages/job-radar.astro) | Case-study copy, evidence HTML, disclosures, `reliabilityCases`, and page-local styles; route `/job-radar/` |
| [src/layouts/SiteLayout.astro](../src/layouts/SiteLayout.astro) | Shared document shell, titles/descriptions, fonts, favicons, skip link |
| [src/components/SiteHeader.astro](../src/components/SiteHeader.astro) | Navigation and current-page indication |
| [src/components/SiteFooter.astro](../src/components/SiteFooter.astro) | Shared contact invitation and email links |
| [src/styles/global.css](../src/styles/global.css) | Settled colors, typography, widths, shell, focus and print rules |
| [src/styles/slice.css](../src/styles/slice.css) | Page layouts, portrait, responsive tables/evidence, A1 selector and print rules |
| [src/assets/images/avery-cooper-portrait.jpg](../src/assets/images/avery-cooper-portrait.jpg) | Source portrait, processed through Astro’s `Image` component |
| [public/assets/job-radar/](../public/assets/job-radar/) | Approved authored SVGs and résumé WebP |

Setup and scripts live in [package.json](../package.json) and
[package-lock.json](../package-lock.json); configuration is in
[astro.config.mjs](../astro.config.mjs) and [tsconfig.json](../tsconfig.json).
Use Node 24, matching CI, and `npm ci` for a normal authorized setup. For framework
usage, consult the [official Astro documentation](https://docs.astro.build/).

When changing contact content, check both pages and the footer, including visible
addresses, `mailto:` targets, and subject text. Preserve the accepted portrait crop,
responsive sizing, alt text, and print treatment unless the issue approves a change.

Keep headings semantic and IDs unique. When renaming a heading ID, update fragment
links, `aria-labelledby`, table `headers`, and other references together. Check the
case-study decision list, cross-page navigation, skip link, and current-page
indication. Preserve descriptive labels, keyboard access, and visible focus.

## Evidence and settled presentations

Owner-maintained planning and synthetic evidence live outside this public repository.
Consult only sources explicitly authorized for the issue. Use approved curated facts
and safe descriptions here; never copy source directories, private paths, raw
payloads, internal identifiers, or production implementation details.

| Evidence | Accepted treatment |
| --- | --- |
| A1 | `job-radar-system-overview.svg`, desktop Diagram/List selector, mobile HTML list, single diagram presentation in print |
| A2 | Responsive HTML system/human pairs with “Approved ≠ submitted”; no workflow SVG |
| A3 | `morgan-coleman-resume-crop.webp` with selectable ATS HTML and separate validation, human approval, and submission states |
| A4 | `posting-provenance-comparison.svg`, capped at the reading width, with mobile HTML comparison |
| A5 | `privacy-safe-engagement-projection.svg`, capped at the reading width, with mobile HTML stages and disclosure-only publication comparison |
| A6 | Eight-row HTML reliability matrix, narrow-screen labeled rows, visible summary and non-color-only strategy labels |
| S1 | `replica-publication-recovery.svg`, capped at the reading width, with numbered mobile HTML recovery steps |

A5’s amended caption governs over the older storyboard wording: Search receives
enough information to **add engagement context to future alerts**, without exposing
notes, materials, responses, or interview history. Do not restore the older claim
that it stops resurfacing previously acted-on roles.

Keep curated facts, captions, accessible equivalents, and desktop/mobile/print
presentations consistent when editing evidence. Primary evidence remains visible
without opening technical disclosures. Preserve the collection-level synthetic
evidence note before the first synthetic artifact and the distinction between
automated assistance and human authority. Do not imply a fictional Job Radar GUI.
Native disclosures start collapsed, allow independent expansion, and retain the
accepted print expansion behavior.

Before adding or replacing public evidence, review displayed facts, raster pixels,
and metadata for private information. Preserve approved cropping and selectable
text; strip and inspect raster metadata where applicable. Raw captures, transcripts,
source PDFs, private career/application records, databases, credentials, and
environment files do not belong in public assets. Automated checks cannot replace
this review.

## Public inventory and verification

[scripts/verify.mjs](../scripts/verify.mjs) is the authoritative checker;
[scripts/verify.test.mjs](../scripts/verify.test.mjs) exercises it using temporary
fixtures. The current public inventory consists of `public/favicon.ico`,
`public/favicon.svg`, and the four SVGs and one WebP named above in
`public/assets/job-radar/`.

For an explicitly approved public asset change, deliberately maintain `publicFiles`
in the verifier. Inspect both enforcement sites: `PUBLIC_INVENTORY` applies to all
of `public/`, and `JOB_RADAR_INVENTORY` applies to `assets/job-radar/` in both public
and build output. Generated Astro assets elsewhere are allowed. Also inspect
`rawEvidence`, `forbiddenFile`, and the private capture/transcript directory checks;
adding a filename to `publicFiles` does not override those restrictions. Update
focused checker tests when an approved verifier behavior change requires them.

`npm run verify` safely removes only the fixed repository `dist/` directory,
refusing unsafe resolution or symlinks. It runs `npm run validate` (diagnostics and
production build), focused Node checker tests, then fresh-build and public-inventory
checks. Build/test failures stop the command; release findings are aggregated and
any failure exits nonzero. Diagnostics use relative files and rule names without
printing matched credentials or rejected URL payloads.

Coverage includes both required routes, navigation and fragment targets, HTML
resources/srcset, CSS imports/fonts/URLs, and inline/standalone SVG references.
Encoded paths, queries, and SVG IDs receive appropriate handling. External and
embedded references receive syntax handling only: destinations are not contacted
and embedded data has no filesystem check. SVG reference checks do not validate
XML structure or rendering.

Privacy checks inspect public/build filenames and readable text formats, detect
recognizable local paths, infrastructure URLs and credential patterns, and reject
prohibited files, raw evidence, and SQLite signatures. Approved public contacts,
fictional scenario facts, dates, asset hashes, and SVG IDs remain allowed. The
checker is not an entropy scan or a generic contact, narrative, or identifier ban.
Refer to its implementation for exact rules rather than maintaining another rule
inventory here.

The checker resolves `ultrahtml`, `html-escaper`, and `css-tree` from locked
transitive dependencies. Dependency updates must preserve their availability;
missing parsers fail explicitly. It does not certify private facts, unfamiliar
encodings or credentials, image pixels/metadata, runtime JavaScript URLs, rendering,
accessibility, image quality, external destinations, or comprehensive privacy/security.
Repository Markdown also needs direct privacy review.

## Local review

`npm run dev` is useful while editing. For final rendered review, use fresh release
output:

```sh
npm run verify
npm run preview
```

Preview serves the existing build; it does not rebuild edits. Repeat verification
after subsequent website changes before reviewing their production output.
`npm run check`, `npm run build`, and `npm run validate` remain available for focused
work; do not repeat validate/build immediately after a successful verify.

For visual/content changes, review both routes at desktop and narrow mobile widths:
copy and evidence fidelity, navigation/fragments, contact actions, keyboard/focus,
A1 controls, independent collapsed disclosures, tables, selectable ATS text, portrait
and asset legibility, overflow, contrast, and print output with disclosure expansion.
Check reduced-motion behavior when relevant. Report the browser and checks actually
performed. Deferred VoiceOver work must not be reported as passed.

For documentation-only changes, review links, commands, scope, privacy, and the diff;
run `git diff --check` and the unified verifier for the PR gate. No browser review or
new tests are needed solely for prose changes.

## Release and publication

Implementation uses issue-scoped branches and PRs into `main`.
[validate.yml](../.github/workflows/validate.yml) installs locked dependencies with
Node 24 and runs `npm run verify` on PRs targeting `main`. It does not deploy.
Follow [agent authorization guidance](../AGENTS.md) for actions not already authorized.

1. Complete local verification, rendered/content/privacy review, and human acceptance.
   Record the accepted **full source commit SHA**. PRJ-27 and PRJ-28 are the initial
   launch’s acceptance and publication authorization records, respectively. Future
   releases require their own explicit accepted SHA and publication authorization.
2. Before publication, Avery compares the acceptance record with the exact required
   `accepted_sha` input and authorizes dispatch. Dispatch or rerun is a publication
   action, not a local validation step. Existing explicit publication authorization
   remains sufficient for its stated scope.
3. When authorized, manually dispatch
   [deploy-pages.yml](../.github/workflows/deploy-pages.yml) from `main`, supplying
   the accepted SHA as exactly 40 hexadecimal characters. The workflow normalizes
   case, checks out that exact source commit, confirms HEAD, installs dependencies,
   and runs `npm run verify`.
4. Successful preparation uploads only freshly verified `dist/` as the same-run
   Pages artifact; deployment depends on that preparation. Check the logged and
   summarized source SHA against acceptance. The workflow run revision is a separate
   value. Identity verification and passing checks do not prove human acceptance.

Dispatch must use `main`, but the workflow does not enforce that the supplied source
SHA equals the current main tip or establish its ancestry. Supply the human-accepted
source deliberately. Environment protection applies if configured; the project does
not require a second reviewer.

GitHub Pages is configured to use GitHub Actions, and the custom domain, DNS, and
enforced HTTPS are configured for https://avecooper.com/. The workflow does not
enable Pages or configure the custom domain, DNS, or HTTPS. Preserve the
`avecooper.com` root URL when maintaining that setup.

The public MVP was accepted October 8, 2026, and is live at
https://avecooper.com/ and https://avecooper.com/job-radar/. The initial deployed
source SHA is `e110763c61f56bcd80033db3b90bd5007d63b9d6`. Deployed mobile and desktop
behavior, links, HTTPS and redirects, and contact-email operation were verified.
This documentation update does not change the deployed source SHA.

After each subsequent authorized deployment, check the live homepage and case-study
routes, assets, navigation/fragments, contact actions, responsive rendering, and deployed privacy
output; confirm the intended domain, DNS resolution, and HTTPS behavior. Local checks
do not establish these results. Record what was actually checked and update this
status and the README as appropriate once publication is confirmed.
