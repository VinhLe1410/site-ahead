import { execFile as callback } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";
import { LangfuseAPIClient } from "@langfuse/core";
import { PDFDocument } from "pdf-lib";
import { unzipSync, strFromU8 } from "fflate";

const execFile = promisify(callback);

const repoRoot = new URL("..", import.meta.url);

process.loadEnvFile(new URL("../.env", import.meta.url));

const [jobId, userId] = process.argv.slice(2);

const identity = { subject: `${userId}|request-verification` };

const outputDirectory =
  process.env.REQUEST_FORM_QA_DIRECTORY ??
  "/private/tmp/site-ahead-carpentry-forms/live";

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const expectedTools = [
  "read_saved_job",
  "select_form_skill",
  "read_source_form",
  "fill_request_draft",
  "save_request_draft",
];

async function run(name, args, authenticated = false) {
  const { stdout, stderr } = await execFile(
    "npm",
    [
      "exec",
      "--",
      "convex",
      "run",
      name,
      JSON.stringify(args),
      ...(authenticated ? ["--identity", JSON.stringify(identity)] : []),
    ],
    { cwd: repoRoot, maxBuffer: 1024 * 1024 },
  );

  if (stderr.trim()) process.stderr.write(stderr);

  return stdout.trim() ? JSON.parse(stdout) : null;
}

const inspect = () => run("agents/requests/verification:inspect", { jobId });

async function finish(itemId, previousRunId) {
  const deadline = Date.now() + 200_000;

  while (Date.now() < deadline) {
    const snapshot = await inspect();
    const state = snapshot.states.find((value) => value.itemId === itemId);

    if (
      state?.runId !== previousRunId &&
      !state?.queued &&
      state?.execution !== "running" &&
      state?.execution !== "idle"
    ) {
      assert.equal(
        state?.execution,
        "waiting",
        JSON.stringify({
          itemId,
          execution: state?.execution,
          error: state?.error,
        }),
      );
      assert.ok(state.draft && state.threadId && state.traceId);
      assert.equal(
        snapshot.items.find((item) => item._id === itemId)?.status,
        "pending",
      );
      assert.ok(state.missingInformation.length > 0 && state.nextAction);
      assert.ok(state.provenance.some((value) => value.method === "demo_data"));
      assert.equal(state.traceId, state.classification.traceId);
      const output = snapshot.outputs.find((value) => value.itemId === itemId);
      assert.deepEqual(output.tools.slice(-5), expectedTools);

      return { snapshot, state, output };
    }

    await sleep(2000);
  }

  throw new Error(`Timed out waiting for request item ${itemId}.`);
}

async function exportDraft(result, suffix) {
  const { state, output, snapshot } = result;
  assert.ok(output.draftUrl && output.sourceUrl);

  const responses = await Promise.all([
    fetch(output.draftUrl),
    fetch(output.sourceUrl),
  ]);

  assert.ok(responses.every((response) => response.ok));

  const [draft, source] = await Promise.all(
    responses.map(
      async (response) => new Uint8Array(await response.arrayBuffer()),
    ),
  );

  const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
  assert.equal(hash(draft), state.draft.sha256);
  assert.equal(hash(source), state.draft.sourceSha256);

  const extension =
    state.draft.contentType === "application/pdf" ? "pdf" : "docx";

  const draftPath = path.join(
    outputDirectory,
    `${state.draft.formKey}-${suffix}.${extension}`,
  );

  const sourcePath = path.join(
    outputDirectory,
    `${state.draft.formKey}-original.${extension}`,
  );

  await writeFile(draftPath, draft);
  await writeFile(sourcePath, source);

  if (extension === "pdf") {
    const pdf = await PDFDocument.load(draft);
    assert.equal(
      pdf.getForm().getTextField("job_site_address").getText(),
      snapshot.job.addressText,
    );
  } else {
    const xml = strFromU8(unzipSync(draft)["word/document.xml"]);

    const escapedAddress = snapshot.job.addressText
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

    assert.ok(xml.includes(escapedAddress));
  }

  return {
    itemId: state.itemId,
    runId: state.runId,
    threadId: state.threadId,
    traceId: state.traceId,
    sourceVersionId: state.draft.sourceVersionId,
    sourceSha256: state.draft.sourceSha256,
    sha256: state.draft.sha256,
    draftPath,
    sourcePath,
    tools: output.tools.slice(-5),
    missingInformation: state.missingInformation,
  };
}

export async function verifyRequestTelemetry(runs) {
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

  const traces = [...new Set(runs.map((state) => state.traceId))];
  const observations = new Map();
  const deadline = Date.now() + 40_000;

  while (Date.now() < deadline) {
    for (const traceId of traces) {
      const response = await client.observations.getMany(
        {
          fields: "core,basic,usage,trace_context,model",
          filter: JSON.stringify([
            {
              type: "string",
              column: "traceId",
              operator: "=",
              value: traceId,
            },
          ]),
          limit: 100,
        },
        { maxRetries: 0, timeoutInSeconds: 5 },
      );

      const entries = Array.isArray(response.data)
        ? response.data
        : (response.data?.data ?? []);

      for (const entry of entries) observations.set(entry.id, entry);
    }

    if (
      runs.every((state) =>
        [...observations.values()].some(
          (value) => value.name === `site-ahead-request-${state.runId}`,
        ),
      )
    )
      break;
    await sleep(2000);
  }

  const exported = [...observations.values()];

  for (const state of runs)
    assert.ok(
      exported.some(
        (value) => value.name === `site-ahead-request-${state.runId}`,
      ),
      `Missing exported Request span for ${state.runId}`,
    );

  const modelObservations = exported.filter(
    (value) =>
      String(value.model ?? "").startsWith("gpt-5.5") &&
      Object.values(value.usageDetails ?? {}).some(
        (count) => Number.isFinite(count) && count > 0,
      ),
  );

  for (const state of runs) {
    const span = exported.find(
      (value) => value.name === `site-ahead-request-${state.runId}`,
    );

    const belongsToRun = (observation) => {
      let current = observation;

      for (let depth = 0; depth < 12 && current; depth += 1) {
        if (current.id === span.id) return true;
        current = observations.get(current.parentObservationId);
      }

      return false;
    };

    assert.equal(
      modelObservations.filter(belongsToRun).length,
      5,
      `All five actual GPT-5.5 model steps must have usage under ${state.runId}`,
    );
  }

  return {
    traceIds: traces,
    modelObservations: modelObservations.map((value) => ({
      id: value.id,
      model: value.model,
      usageDetails: value.usageDetails,
    })),
  };
}

async function main() {
  assert.ok(
    jobId && userId,
    "Usage: npm run verify:request-agents -- <QA job ID> <active QA user ID>",
  );

  await mkdir(outputDirectory, { recursive: true });
  const before = await inspect();

  const requests = before.items.filter(
    (item) => item.kind === "third_party" && item.status === "pending",
  );

  assert.equal(
    requests.length,
    2,
    "Use the preserved six-item Carpentry QA job with two pending requests.",
  );

  const siblings = before.states.filter(
    (state) => !requests.some((item) => item._id === state.itemId),
  );

  for (const item of requests)
    await run("checklistExecution:retry", { itemId: item._id }, true);
  const initial = [];

  for (const item of requests) {
    const result = await finish(
      item._id,
      before.states.find((state) => state.itemId === item._id)?.runId,
    );

    initial.push(result);
    console.log(
      JSON.stringify({
        phase: "initial-draft-saved",
        ...(await exportDraft(result, "initial")),
      }),
    );
  }

  const first = initial[0];
  await run("checklistExecution:retry", { itemId: first.state.itemId }, true);
  const retry = await finish(first.state.itemId, first.state.runId);
  assert.equal(retry.state.threadId, first.state.threadId);
  assert.equal(retry.state.attempt, first.state.attempt + 1);
  assert.deepEqual(retry.state.classification, first.state.classification);
  assert.deepEqual(
    retry.snapshot.states.filter(
      (state) => !requests.some((item) => item._id === state.itemId),
    ),
    siblings,
  );
  const retryExport = await exportDraft(retry, "retry");

  const telemetry = await verifyRequestTelemetry([
    ...initial.map((result) => result.state),
    retry.state,
  ]);

  const evidence = {
    verifiedAt: new Date().toISOString(),
    jobId,
    address: before.job.addressText,
    retry: retryExport,
    ...telemetry,
    initial: initial.map((result) => ({
      itemId: result.state.itemId,
      runId: result.state.runId,
      threadId: result.state.threadId,
      draft: result.state.draft,
      tools: result.output.tools.slice(-5),
    })),
  };

  await writeFile(
    path.join(outputDirectory, "verification.json"),
    JSON.stringify(evidence, null, 2),
  );
  console.log(JSON.stringify(evidence, null, 2));
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
