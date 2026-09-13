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

assert.deepEqual(result.classifications, [{ id: 1, category: "automated" }]);

assert.deepEqual(result.failures, [
  { id: 2, reason: "missing_model_category" },
  { id: 3, reason: "invalid_model_category" },
]);

const modelFailureResult = normalizeItemClassifications(
  items,
  [],
  "model_output_error",
);

assert.equal(modelFailureResult.classifications.length, 0);

assert.equal(modelFailureResult.failures.length, items.length);

const duplicates = normalizeItemClassifications(items, [
  { id: 1, category: "automated" },
  { id: 1, category: "third_party" },
  { id: 999, category: "automated" },
]);

assert.equal(duplicates.classifications.length, 0);

assert.equal(duplicates.failures[0].reason, "duplicate_model_classification");

assert.deepEqual(duplicates.unknownModelItemIds, [999]);

console.log("Strict classification failure checks passed.");
