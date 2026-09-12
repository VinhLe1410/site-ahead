# Site Ahead

A pre-visit planning app for contractors, built with Convex and React.

## Plan and build with an agent

Clone the repo and run `npm ci` with Node.js 24 or newer. OpenSpec 1.13.0 is pinned in the project, with shared workflows for Codex and Claude Code. Open the repo in your coding assistant and follow the [team workflow](docs/Workflow.md) to turn an idea into a scope, plan, and coding tasks. You need your own coding assistant access; no global OpenSpec install is required.

See the [product idea](docs/Site-Ahead-Idea.md) and [architecture](docs/Site-Ahead-Architecture.html) for project context.

## App setup

This is a [Convex](https://convex.dev/) project created with [`npm create convex`](https://www.npmjs.com/package/create-convex).

After the initial setup (<2 minutes) you'll have a working full-stack app using:

- Convex as your backend (database, server logic)
- [React](https://react.dev/) as your frontend (web page interactivity)
- [Vite](https://vitest.dev/) for optimized web hosting
- [Tailwind](https://tailwindcss.com/) for building great looking accessible UI

## Get started

If you just cloned this codebase and didn't use `npm create convex`, run:

```
npm install
npm run dev
```

## Authentication setup

Google is the only login provider for the hackathon demo. The first Google login creates an account. The public routes are `/` and `/login`; `/app` and all other page paths require authentication. Sessions persist across reloads and logout returns to `/`. Password signup, verification emails, and password reset are outside scope. No email service or custom domain is required.

Configure five environment variables on each Convex deployment:

| Variable             | Value                                       |
| -------------------- | ------------------------------------------- |
| `SITE_URL`           | The frontend origin for that deployment     |
| `JWT_PRIVATE_KEY`    | A generated RS256 PKCS8 private key         |
| `JWKS`               | The matching public key in JWKS JSON format |
| `AUTH_GOOGLE_ID`     | Google OAuth client ID                      |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret                  |

Use the [Convex Auth manual setup](https://labs.convex.dev/auth/setup/manual) to generate the signing-key pair. Keep secrets in the intended Convex deployment, outside browser code, logs, and tracked files. Only `VITE_CONVEX_URL` is required by the frontend; the Vercel build supplies it.

Configure the matching Google Web Application OAuth client with these origins and callback URLs:

| Environment | Frontend origin and `SITE_URL` | Google callback |
| --- | --- | --- |
| Local development | `http://localhost:5173` | `https://brainy-gopher-762.convex.site/api/auth/callback/google` |
| Hosted demo | `https://site-ahead.vercel.app` | `https://friendly-chipmunk-910.convex.site/api/auth/callback/google` |
| Branch preview | The preview's stable frontend origin | The preview Convex HTTP Actions URL followed by `/api/auth/callback/google` |

Google callbacks use the Convex `.site` origin. The final redirect uses `SITE_URL`. Configure the Google audience for the intended demo accounts and use only the standard identity scopes. See [Google setup](https://labs.convex.dev/auth/config/oauth/google).

Vercel deploys the frontend and backend with the build command in `vercel.json`. Its SPA rewrite supports direct page loads. Production and preview deploy keys select different Convex deployments; configuring local dev does not configure those deployments. Preview deployments can inherit [Convex project default variables](https://docs.convex.dev/production/hosting/vercel#preview-deployments), but their frontend origins and Google callbacks must still match. Never point a preview's `SITE_URL` at the hosted demo.

After configuration, try Google login from `/login`, reload `/app`, log out, and revisit `/app` while signed out. Review the OpenSpec task list for completed checks and any remaining live verification.

If you're reading this README on GitHub and want to use this template, run:

```
npm create convex@latest -- -t react-vite
```

## Learn more

Run `npm run dev` once after cloning to configure Convex and regenerate its bindings. This repository tracks `convex/_generated/` so CI can typecheck without deployment credentials. Include updated bindings when changing the backend.

Run `npm run check` for TypeScript, lint, formatting, and OpenSpec validation. Use `npm run lint:fix` to apply Oxlint fixes and `npm run format` to format files with Oxfmt. Oxlint retains the Convex plugin checks and type-aware TypeScript rules.

`npm install` sets up Husky through the `prepare` script. Before each commit, lint-staged runs Oxlint fixes and Oxfmt on staged files. Remaining lint errors or warnings block the commit. Generated Convex files and installed agent skills are excluded from these checks.

## Deploy to Vercel

Vercel deploys the frontend and Convex backend. GitHub Actions checks pull requests and updates to `main`.

1. Import this repository into Vercel with the Vite framework preset.
2. Create a production deploy key in the Convex dashboard with the `deployment:deploy` permission.
3. Add the key to Vercel as `CONVEX_DEPLOY_KEY` for the Production environment only.
4. Create a preview deploy key in the Convex project settings.
5. Add the preview key to Vercel as `CONVEX_DEPLOY_KEY` for the Preview environment only.

The build command is stored in `vercel.json`. Convex supplies `VITE_CONVEX_URL` during the build, so it does not need to be configured in Vercel.

To learn more about developing your project with Convex, check out:

- The [Tour of Convex](https://docs.convex.dev/get-started) for a thorough introduction to Convex principles.
- The rest of [Convex docs](https://docs.convex.dev/) to learn about all Convex features.
- [Stack](https://stack.convex.dev/) for in-depth articles on advanced topics.

## Join the community

Join thousands of developers building full-stack apps with Convex:

- Join the [Convex Discord community](https://convex.dev/community) to get help in real-time.
- Follow [Convex on GitHub](https://github.com/get-convex/), star and contribute to the open-source implementation of Convex.
