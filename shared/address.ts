const ROAD_TYPES =
  "Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Crescent|Cres|Parade|Place|Pl|Way|Terrace|Tce|Highway|Hwy|Freeway|Circuit|Close|Grove|Gardens|Square|Rise|View|Walk|Track|Esplanade|Mews|Mall|Link|Loop|Approach|Quay";

const ROAD_PATTERN = `[A-Za-z][A-Za-z.'-]*(?:\\s+[A-Za-z][A-Za-z.'-]*){0,5}\\s+(?:${ROAD_TYPES})`;

export type RoadLocality = {
  roadName: string;
  locality: string;
};

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Extract a conservative road/locality pair from a Victorian-style address.
 * A street number and recognised road type are required so free text is not
 * mistaken for a location. The caller remains responsible for validating the
 * pair against its external source.
 */
export function parseRoadLocality(value: string): RoadLocality | null {
  const text = clean(value);

  if (text === "") return null;

  const commaMatch = text.match(
    new RegExp(
      `\\b\\d+[A-Za-z]?\\s+(${ROAD_PATTERN})\\s*,\\s*([A-Za-z][A-Za-z .'-]*?)(?=\\s+(?:VIC|VICTORIA)\\b|\\s+\\d{4}\\b|[.,;]|$)`,
      "i",
    ),
  );

  if (commaMatch) {
    const roadName = clean(commaMatch[1]);
    const locality = clean(commaMatch[2]);

    if (locality !== "") return { roadName, locality };
  }

  const spacedMatch = text.match(
    new RegExp(
      `\\b\\d+[A-Za-z]?\\s+(${ROAD_PATTERN})\\s+([A-Za-z][A-Za-z .'-]*?)(?=\\s+(?:VIC|VICTORIA)\\b|\\s+\\d{4}\\b|[.,;]|$)`,
      "i",
    ),
  );

  if (!spacedMatch) return null;

  const roadName = clean(spacedMatch[1]);
  const locality = clean(spacedMatch[2]);

  return locality === "" ? null : { roadName, locality };
}
