# Welcome to your Convex + React (Vite) app

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

If you're reading this README on GitHub and want to use this template, run:

```
npm create convex@latest -- -t react-vite
```

## Learn more

Run `npm run dev` once after cloning to configure Convex and generate its local bindings. Generated files in `convex/_generated/` are not committed.

Run `npm run check` for TypeScript, lint and formatting checks. Use `npm run lint:fix` to apply Oxlint fixes and `npm run format` to format files with Oxfmt. Oxlint retains the Convex plugin checks and type-aware TypeScript rules.

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
