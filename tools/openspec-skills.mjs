import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

const mode = process.argv[2];

if (!["--refresh", "--check"].includes(mode) || process.argv.length !== 3) {
  throw new Error("Use --refresh or --check.");
}

if (mode === "--refresh") {
  // Keep generation independent of each teammate's global OpenSpec profile.
  const configDirectory = mkdtempSync(join(tmpdir(), "site-ahead-openspec-"));

  try {
    const result = spawnSync(
      process.execPath,
      [
        join(root, "node_modules/@fission-ai/openspec/bin/openspec.js"),
        "init",
        "--tools",
        "codex,claude",
        "--profile",
        "core",
        "--no-animation",
      ],
      {
        cwd: root,
        stdio: "inherit",
        env: { ...process.env, XDG_CONFIG_HOME: configDirectory },
      },
    );

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      throw new Error(
        `OpenSpec init failed: ${result.signal ?? result.status}`,
      );
    }
  } finally {
    rmSync(configDirectory, { recursive: true, force: true });
  }
}

const workflows = [
  ["explore", "explore"],
  ["propose", "propose"],
  ["apply-change", "apply"],
  ["update-change", "update"],
  ["sync-specs", "sync"],
  ["archive-change", "archive"],
];

const invocation = "npm run --silent openspec --";

const allowedTools = `Bash(${invocation} *) Bash(npm run openspec:refresh)`;

const runInstructions = `Run all commands from the project root after \`npm ci\`. Use \`${invocation} <command>\` for this project's pinned CLI. If CLI output suggests a bare \`openspec\` command, use the same npm prefix. Regenerate these files with \`npm run openspec:refresh\`.\n\n`;

for (const [skill, command] of workflows) {
  const files = [
    `.agents/skills/openspec-${skill}/SKILL.md`,
    `.claude/skills/openspec-${skill}/SKILL.md`,
    `.claude/commands/opsx/${command}.md`,
  ];

  for (const file of files) {
    const path = join(root, file);
    const original = readFileSync(path, "utf8").replaceAll("\r\n", "\n");

    // Match CLI calls, preserving paths, skill names, metadata, and npm calls.
    let content = original
      .replaceAll("Bash(openspec:*)", allowedTools)
      .replaceAll(
        "compatibility: Requires openspec CLI.",
        "compatibility: Requires npm ci in the project root.",
      )
      .replace(
        /(?<![\w./$-])(?<!npm run --silent )openspec (?=[a-z-])/g,
        `${invocation} `,
      )
      .replaceAll(`${invocation} init`, "npm run openspec:refresh")
      .replaceAll(`${invocation} update`, "npm run openspec:refresh");

    if (!content.includes(runInstructions)) {
      content = content.replace(
        /^(---\n[\s\S]*?\n---\n\n)/,
        `$1${runInstructions}`,
      );
    }

    if (
      !content.includes(`allowed-tools: ${allowedTools}\n`) ||
      !content.includes(runInstructions)
    ) {
      throw new Error(`Unexpected OpenSpec file format: ${file}`);
    }

    if (mode === "--refresh") {
      writeFileSync(path, content);
    } else if (content !== original) {
      throw new Error(
        `OpenSpec npm instructions are stale in ${file}. Run npm run openspec:refresh.`,
      );
    }
  }
}

console.log(
  `OpenSpec npm instructions ${mode === "--refresh" ? "refreshed" : "verified"}.`,
);
