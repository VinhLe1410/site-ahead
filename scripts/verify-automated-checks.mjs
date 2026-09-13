import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import process from "node:process";

const execFile = promisify(execFileCallback);

const repoRoot = new URL("..", import.meta.url);

async function run(name, args) {
  const { stdout, stderr } = await execFile(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["exec", "--", "convex", "run", name, JSON.stringify(args)],
    { cwd: repoRoot, maxBuffer: 1024 * 1024 },
  );

  if (stderr.trim()) process.stderr.write(stderr);

  return stdout.trim() === "" ? null : JSON.parse(stdout);
}

async function main() {
  const fixture = await run("agents/checklist/verification:prepare", {});
  const jobId = fixture.items[0].jobId;

  const shared = {
    organizationId: fixture.organizationId,
    initiatedBy: fixture.initiatedBy,
    jobId,
  };

  try {
    const liveItems = await run(
      "agents/checklist/verification:configureEvidence",
      {
        ...shared,
        address: "80 Wellington Parade EAST MELBOURNE 3002",
        year: 1985,
      },
    );

    const live = await run(
      "agents/checklist/automatedChecks:resolveAutomatedChecklistItems",
      { items: liveItems, initiatedBy: fixture.initiatedBy },
    );

    assert.equal(live.length, 3);
    assert.deepEqual(
      live.filter(({ result }) => result.status === "failed"),
      [],
      "All three sources must respond with validated evidence",
    );

    const construction = live.find(
      ({ result }) => result.finding?.kind === "construction_year",
    )?.result;

    assert.equal(construction?.status, "resolved");
    assert.equal(construction.finding.resolution, "live_api");
    assert.equal(construction.finding.constructionYear, 1940);

    const air = live.find(
      ({ result }) => result.finding?.kind === "air_quality",
    )?.result;

    assert.equal(air?.status, "resolved");
    assert.equal(air.finding.scope, "nearby_monitoring_station");
    assert.ok(air.finding.stationId && Number.isFinite(air.finding.value));

    const road = live.find(
      ({ result }) => result.finding?.kind === "road_closures",
    )?.result;

    assert.equal(road?.status, "resolved");
    assert.equal(road.finding.completeSnapshot, true);
    assert.equal(road.finding.scope, "exact_road_and_locality");

    const noMatchItems = await run(
      "agents/checklist/verification:configureEvidence",
      { ...shared, address: "9999 No Such Street MELBOURNE 3000", year: 1985 },
    );

    const yearItem = noMatchItems.find((item) =>
      item.title.startsWith("Construction year"),
    );

    const manual = await run(
      "agents/checklist/automatedChecks:resolveAutomatedChecklistItems",
      { items: [yearItem], initiatedBy: fixture.initiatedBy },
    );

    assert.equal(manual[0].result.finding.resolution, "manual_fallback");
    assert.equal(manual[0].result.finding.constructionYear, 1985);
    assert.equal(
      manual[0].result.provenance[1].suppliedBy,
      fixture.initiatedBy,
    );
    await run("agents/checklist/verification:configureEvidence", {
      ...shared,
      address: "9999 No Such Street MELBOURNE 3000",
      year: null,
    });

    const absent = await run(
      "agents/checklist/automatedChecks:resolveAutomatedChecklistItems",
      { items: [yearItem], initiatedBy: fixture.initiatedBy },
    );

    assert.equal(absent[0].result.status, "unresolved");
    assert.equal(absent[0].result.reason, "no_exact_address_match");
    console.log(
      JSON.stringify(
        {
          live: live.map(({ result }) => result.finding),
          manual: manual[0].result,
          unresolved: absent[0].result,
          verifiedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  } finally {
    await run("agents/checklist/verification:cleanup", {
      organizationId: fixture.organizationId,
      initiatedBy: fixture.initiatedBy,
    });
  }
}

main().catch((error) => {
  console.error(`Automated checks verification failed: ${error.message}`);
  process.exitCode = 1;
});
