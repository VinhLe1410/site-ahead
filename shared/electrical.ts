export const electricalItems = [
  {
    title: "Classify electrical work as prescribed or non-prescribed",
    kind: "automated",
  },
  { title: "Road Closure", kind: "automated" },
  {
    title: "Book a Licensed Electrical Inspector — prescribed work only",
    kind: "third_party",
  },
  { title: "Prepare COES information for ESVConnect", kind: "third_party" },
  { title: "Complete electrician’s installation testing", kind: "on_site" },
  {
    title: "Confirm safety-switch/RCD coverage for affected circuits",
    kind: "on_site",
  },
  {
    title: "Confirm required independent inspection is completed",
    kind: "on_site",
  },
  { title: "Send the completed COES to the client", kind: "automated" },
] as const;

export function electricalItemKind(title: string) {
  return electricalItems.find(
    (item) => item.title.toLowerCase() === title.trim().toLowerCase(),
  )?.kind;
}

export function isCertificateDelivery(title: string) {
  return title.trim().toLowerCase() === electricalItems[7].title.toLowerCase();
}

export function electricalRequestKind(title: string) {
  const normalized = title.trim().toLowerCase();

  if (normalized === electricalItems[2].title.toLowerCase())
    return "lei-booking";

  if (normalized === electricalItems[3].title.toLowerCase())
    return "coes-portal";

  return null;
}

export const ELECTRICAL_RULE_SOURCE =
  "https://www.energysafe.vic.gov.au/certificates-electrical-safety/obligations-and-guidelines/prescribed-and-non-prescribed-work";

export type ElectricalClassification = {
  classification: "prescribed" | "non_prescribed" | "unresolved";
  rule: string;
  reason: string;
  matchedScope: string;
};

// Deliberately narrow rules. A job title, a model guess or one unqualified
// component mention cannot establish the extent or the statutory exception.
export function classifyElectricalScope(
  scope: string,
): ElectricalClassification {
  const normalized = scope
    .toLowerCase()
    .replace(/n[’']t\b/g, " not")
    .replace(/[’']/g, "")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const uncertain =
    /\b(?:cancelled|canceled|not approved|not proceeding|do not proceed|no longer required)\b/.test(
      normalized,
    ) ||
    /\b(?:not|no|never|cannot|without|exclude|excluding|avoid|maybe|possibly|may|could|if|whether|unless|depending on|subject to)\b[^.;!?]{0,90}\b(?:replac\w*|main switchboard|consumer\w* mains)\b/.test(
      normalized,
    ) ||
    /\b(?:replac\w*|main switchboard|consumer\w* mains)\b[^.;!?]*\b(?:if|unless|depending on|subject to)\b/.test(
      normalized,
    );

  const completeBoard =
    /\b(?:replace|replacing|replacement of)\s+(?:the\s+)?(?:complete|entire|whole)\s+(?:existing\s+)?(?:residential\s+)?main switchboard\b/.test(
      normalized,
    ) ||
    /\b(?:complete|entire|whole)\s+(?:residential\s+)?main switchboard\s+(?:and consumer\w* mains\s+)?replacement\b/.test(
      normalized,
    );

  const mains = /\bconsumer\w* mains\b/.test(normalized);

  if (!uncertain && completeBoard && mains)
    return {
      classification: "prescribed",
      rule: "ESV regulation 249(1)(a)–(b): complete main switchboard and consumer mains",
      reason:
        "The saved scope replaces the complete main switchboard and consumer mains. This exceeds an equivalent single-component replacement and requires the prescribed-work pathway.",
      matchedScope: scope,
    };

  // A fully specified, sole main-switch replacement is the one supported
  // non-prescribed exception. Extra or contradictory scope remains unresolved.
  if (
    /^(?:only )?replace (?:only )?(?:one|a single) main switch with (?:an equivalent|another) (?:main )?switch (?:of |with )?the same current rating (?:and |in )?(?:at |in )?the same location(?: only)?[.]?$/.test(
      normalized,
    )
  )
    return {
      classification: "non_prescribed",
      rule: "ESV regulation 249(4): equivalent single main switch at the same location",
      reason:
        "The entire saved scope specifies one equivalent main switch, the same current rating and the same location. ESV lists this exception as requiring a non-prescribed COES.",
      matchedScope: scope,
    };

  return {
    classification: "unresolved",
    rule: "Supported ESV scope rules did not establish a classification",
    reason:
      "Confirm the detailed electrical scope, including which complete assemblies or individual components change, equivalence, rating and location. Ambiguous, negated or other work requires electrician review; the category alone does not establish prescribed work.",
    matchedScope: scope,
  };
}
