import { spawnSync } from "node:child_process";
import { previewOriginVariable } from "../shared/preview.ts";

const previewName = "hackathon-preview";

const environment = process.env.VERCEL_ENV;

if (environment !== "preview" && environment !== "production") {
  throw new Error("This build command requires Vercel Preview or Production.");
}

if (!process.env.CONVEX_DEPLOY_KEY) {
  throw new Error("Set CONVEX_DEPLOY_KEY for this Vercel environment.");
}

const isPreview = environment === "preview";

if (isPreview && !process.env.CONVEX_DEPLOY_KEY.startsWith("preview:")) {
  throw new Error("Vercel Preview requires a Convex preview deploy key.");
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function previewOrigin(variable) {
  const hostname = process.env[variable];

  if (!hostname) {
    throw new Error(`Enable Vercel system environment variables: ${variable}.`);
  }

  const url = new URL(`https://${hostname}`);

  if (url.host !== hostname || url.username || url.password) {
    throw new Error(`Invalid hostname in ${variable}.`);
  }

  return url.origin;
}

function setPreviewVariable(name, value) {
  run("npx", [
    "--no-install",
    "convex",
    "env",
    "set",
    name,
    value,
    "--preview-name",
    previewName,
  ]);
}

if (process.argv[2] === "client") {
  if (isPreview) {
    const branchOrigin = previewOrigin("VERCEL_BRANCH_URL");
    const origins = new Set([previewOrigin("VERCEL_URL"), branchOrigin]);

    // Independent keys preserve other previews when builds overlap.
    for (const origin of origins) {
      setPreviewVariable(await previewOriginVariable(origin), origin);
    }

    setPreviewVariable("AUTH_PREVIEW_REDIRECTS", "true");
    setPreviewVariable("SITE_URL", branchOrigin);
  }

  run("npm", ["run", "build"]);
} else {
  const args = ["--no-install", "convex", "deploy"];

  if (isPreview) {
    args.push("--preview-name", previewName);
  }

  args.push("--cmd", "node tools/vercel-build.mjs client");
  run("npx", args);
}
