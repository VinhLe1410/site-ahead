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

To learn more about developing your project with Convex, check out:

- The [Tour of Convex](https://docs.convex.dev/get-started) for a thorough introduction to Convex principles.
- The rest of [Convex docs](https://docs.convex.dev/) to learn about all Convex features.
- [Stack](https://stack.convex.dev/) for in-depth articles on advanced topics.

## Join the community

Join thousands of developers building full-stack apps with Convex:

- Join the [Convex Discord community](https://convex.dev/community) to get help in real-time.
- Follow [Convex on GitHub](https://github.com/get-convex/), star and contribute to the open-source implementation of Convex.
