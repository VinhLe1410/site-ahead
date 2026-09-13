import assert from "node:assert/strict";
import { normalizeItemClassifications } from "../convex/agents/checklist/itemClassification.ts";

const items = [
  { id: 1, item: "Air Quality" },
  { id: 2, item: "Asbestos disturbance assessment" },
  { id: 3, item: "Road Closure" },
];

const result = normalizeItemClassifications(items, [
  { id: 1, category: "automated" },
  { id: 2 },
  { id: 3, category: "not_a_contract_category" },
]);

assert.deepEqual(result.classifications, [
  { id: 1, category: "automated" },
  { id: 2, category: "on_site" },
  { id: 3, category: "on_site" },
]);

assert.deepEqual(result.fallbacks, [
  { id: 2, reason: "missing_model_category" },
  { id: 3, reason: "invalid_model_category" },
]);

const modelFailureResult = normalizeItemClassifications(
  items,
  [],
  "model_output_error",
);

assert.equal(modelFailureResult.classifications.length, items.length);

assert.equal(modelFailureResult.fallbacks.length, items.length);

assert.ok(
  modelFailureResult.classifications.every(
    (classification) => classification.category === "on_site",
  ),
);

console.log("Classification fallback checks passed.");
