import { expect, test } from "vitest";
import { classifyElectricalScope } from "../shared/electrical";

test("classifies complete replacement without asserting completion", () => {
  expect(
    classifyElectricalScope(
      "Replace the complete residential main switchboard and consumer mains. Work has not started; no tests, inspection or certification.",
    ),
  ).toMatchObject({ classification: "prescribed" });
});

test.each([
  "Electrical repairs",
  "Replace the complete residential main switchboard and consumer mains. The replacement is cancelled/not approved.",
  "Do not replace the complete residential main switchboard and consumer mains.",
  "Don't replace the complete residential main switchboard and consumer mains.",
  "Don’t replace the complete residential main switchboard and consumer mains.",
  "Maybe replace the complete residential main switchboard and consumer mains.",
  "Replace the complete residential main switchboard and consumer mains only if inspection shows it is needed.",
  "Only replace the complete residential main switchboard and consumer mains if required after inspection.",
  "Replace a main switch.",
  "Consumer mains replacement in the same location.",
  "Replace one main switch and upgrade other circuits.",
])("keeps unsupported or ambiguous scope pending: %s", (scope) => {
  expect(classifyElectricalScope(scope).classification).toBe("unresolved");
});

test("requires all details for the supported single-component exception", () => {
  expect(
    classifyElectricalScope(
      "Only replace one main switch with another switch of the same current rating in the same location.",
    ).classification,
  ).toBe("non_prescribed");
  expect(
    classifyElectricalScope(
      "Replace one main switch with another switch in the same location.",
    ).classification,
  ).toBe("unresolved");
});
