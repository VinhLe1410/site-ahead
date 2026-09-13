import { execFile as callback } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import process from "node:process";
import { LangfuseAPIClient } from "@langfuse/core";

const execFile = promisify(callback);

const repoRoot = new URL("..", import.meta.url);

process.loadEnvFile(new URL("../.env", import.meta.url));

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function run(name, args, identity) {
  const { stdout, stderr } = await execFile(
    process.platform === "win32" ? "npm.cmd" : "npm",
    [
      "exec",
      "--",
      "convex",
      "run",
      name,
      JSON.stringify(args),
      ...(identity ? ["--identity", JSON.stringify(identity)] : []),
    ],
    { cwd: repoRoot, maxBuffer: 1024 * 1024 },
  );

  if (stderr.trim()) process.stderr.write(stderr);

  return stdout.trim() === "" ? null : JSON.parse(stdout);
}

async function main() {
  const fixture = await run("agents/checklist/verification:prepare", {});
  const jobId = fixture.items[0].jobId;

  try {
    const items = await run("agents/checklist/verification:configureEvidence", {
      organizationId: fixture.organizationId,
      initiatedBy: fixture.initiatedBy,
      jobId,
      address: "80 Wellington Parade EAST MELBOURNE 3002",
      year: 1985,
    });

    await run("agents/checklist/processChecklist:run", {
      items,
      initiatedBy: fixture.initiatedBy,
    });
    let saved;
    const deadline = Date.now() + 190_000;

    while (Date.now() < deadline) {
      saved = await run("agents/checklist/verification:inspect", { jobId });

      const eligible = saved.states.filter(
        (state) =>
          saved.items.find((item) => item._id === state.itemId)?.kind ===
          "automated",
      );

      if (
        eligible.length === 3 &&
        eligible.every(
          (state) =>
            !state.queued &&
            state.execution !== "running" &&
            state.execution !== "idle",
        )
      )
        break;
      await sleep(2000);
    }

    assert.ok(saved);

    const completed = saved.states.filter(
      (state) => state.execution === "finished",
    );

    assert.equal(
      completed.length,
      3,
      JSON.stringify(
        saved.states.map((state) => ({
          itemId: state.itemId,
          execution: state.execution,
          error: state.error,
        })),
      ),
    );
    assert.equal(new Set(completed.map((state) => state.threadId)).size, 3);
    assert.ok(
      completed.every(
        (state) => state.traceId === state.classification.traceId,
      ),
    );
    assert.ok(
      saved.items
        .filter((item) => item.kind === "automated")
        .every(
          (item) =>
            item.status === "done" && item.notes === "Verification note",
        ),
    );
    assert.ok(
      saved.states
        .filter((state) => !completed.includes(state))
        .every((state) => state.threadId === undefined),
    );

    const tools = await run("agents/checklist/verification:executionTools", {
      jobId,
    });

    for (const state of completed) {
      const calls =
        tools.find((value) => value.itemId === state.itemId)?.tools ?? [];

      assert.ok(calls.includes("read_saved_job"));
      assert.ok(calls.includes(state.finding.kind));
      assert.ok(
        calls.every(
          (name) => name === "read_saved_job" || name === state.finding.kind,
        ),
      );
    }

    const baseUrl = process.env.LANGFUSE_BASE_URL;
    assert.ok(
      baseUrl &&
        process.env.LANGFUSE_PUBLIC_KEY &&
        process.env.LANGFUSE_SECRET_KEY,
    );

    const client = new LangfuseAPIClient({
      environment: baseUrl,
      baseUrl,
      username: process.env.LANGFUSE_PUBLIC_KEY,
      password: process.env.LANGFUSE_SECRET_KEY,
    });

    let observations = [];
    const telemetryDeadline = Date.now() + 30_000;

    while (Date.now() < telemetryDeadline) {
      const response = await client.observations.getMany(
        {
          fields: "core,basic,usage,trace_context",
          filter: JSON.stringify([
            {
              type: "string",
              column: "traceId",
              operator: "=",
              value: completed[0].traceId,
            },
          ]),
          limit: 100,
        },
        { maxRetries: 0, timeoutInSeconds: 3 },
      );

      observations = Array.isArray(response.data)
        ? response.data
        : (response.data?.data ?? []);

      if (
        completed.every((state) =>
          observations.some(
            (value) => value.name === `site-ahead-item-${state.runId}`,
          ),
        ) &&
        observations.filter((value) =>
          Object.values(value.usageDetails ?? {}).some(
            (count) => Number.isFinite(count) && count > 0,
          ),
        ).length >= 4
      )
        break;
      await sleep(2000);
    }

    assert.ok(
      completed.every((state) =>
        observations.some(
          (value) => value.name === `site-ahead-item-${state.runId}`,
        ),
      ),
      "Every worker span must be exported under the classifier trace.",
    );
    assert.ok(
      observations.filter((value) =>
        Object.values(value.usageDetails ?? {}).some(
          (count) => Number.isFinite(count) && count > 0,
        ),
      ).length >= 4,
      "Classifier and three workers must export model usage.",
    );

    const construction = completed.find(
      (state) => state.finding.kind === "construction_year",
    );

    assert.ok(construction);
    const identity = { subject: `${fixture.initiatedBy}|verification` };
    const retries = [];

    for (const year of [1985, null]) {
      await run("agents/checklist/verification:configureEvidence", {
        organizationId: fixture.organizationId,
        initiatedBy: fixture.initiatedBy,
        jobId,
        address: "9999 No Such Street MELBOURNE 3000",
        year,
      });
      await run(
        "checklistItems:setStatus",
        { itemId: construction.itemId, status: "pending" },
        identity,
      );
      await run(
        "checklistExecution:retry",
        { itemId: construction.itemId },
        identity,
      );
      let retried;
      const retryDeadline = Date.now() + 190_000;

      while (Date.now() < retryDeadline) {
        const snapshot = await run("agents/checklist/verification:inspect", {
          jobId,
        });

        retried = snapshot.states.find(
          (state) => state.itemId === construction.itemId,
        );

        if (
          retried?.attempt === retries.length + 2 &&
          !retried.queued &&
          retried.execution !== "running"
        ) {
          const siblings = snapshot.states.filter(
            (state) => state.itemId !== construction.itemId,
          );

          assert.deepEqual(
            siblings,
            saved.states.filter(
              (state) => state.itemId !== construction.itemId,
            ),
          );
          assert.equal(
            snapshot.items.find((item) => item._id === construction.itemId)
              ?.status,
            year === null ? "pending" : "done",
          );
          break;
        }

        await sleep(2000);
      }

      assert.equal(retried?.threadId, construction.threadId);
      assert.equal(retried?.attempt, retries.length + 2);
      assert.equal(retried?.execution, year === null ? "waiting" : "finished");
      assert.deepEqual(retried.classification, construction.classification);

      if (year !== null) {
        assert.equal(retried.finding.resolution, "manual_fallback");
        assert.equal(retried.finding.constructionYear, year);
        assert.ok(
          retried.provenance.some(
            (value) =>
              value.method === "manual" &&
              value.suppliedBy === fixture.initiatedBy,
          ),
        );
      } else {
        assert.equal(retried.finding, undefined);
        assert.ok(retried.missingInformation.length > 0);
      }

      retries.push({
        runId: retried.runId,
        threadId: retried.threadId,
        execution: retried.execution,
        finding: retried.finding,
        provenance: retried.provenance,
        missingInformation: retried.missingInformation,
      });
    }

    console.log(
      JSON.stringify(
        {
          verifiedAt: new Date().toISOString(),
          traceId: completed[0].traceId,
          retries,
          items: completed.map((state) => ({
            itemId: state.itemId,
            threadId: state.threadId,
            runId: state.runId,
            finding: state.finding,
            tools: tools.find((value) => value.itemId === state.itemId)?.tools,
          })),
          modelObservations: observations.filter((value) =>
            Object.values(value.usageDetails ?? {}).some(
              (count) => Number.isFinite(count) && count > 0,
            ),
          ).length,
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
  console.error(error);
  process.exitCode = 1;
});
