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

Run the complete local validation used by pull requests:

```sh
npm run validate
```

## Repository workflow

- `main` is the stable branch.
- Implementation work happens on issue-scoped branches.
- Open a pull request into `main` for implementation changes.
- Pull requests run the repository validation workflow before merge.
- PR validation checks the site but does not deploy it.
- Deployment and custom-domain configuration are handled separately.
- Private career data, production Job Radar data, and other private source material do not belong in this public repository.
