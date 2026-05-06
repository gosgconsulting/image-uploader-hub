/**
 * Parse a product image filename into reference + color + position.
 *
 * Convention used by FRNCH and similar drops:
 *   {REF}[-{COLOR_TOKEN_1}[-{COLOR_TOKEN_2}...]]-{POSITION}.{ext}
 *
 * Examples:
 *   - "CHC26168-BACK.jpg"            -> { ref: "CHC26168", color: null, candidateColor: "BACK", position: 999 }
 *   - "CHC26361-CREME-3.JPG"         -> { ref: "CHC26361", color: "CREME", candidateColor: "CREME", position: 3 }
 *   - "INC26464-BLEU-LAVANDE-3.jpg"  -> { ref: "INC26464", color: "BLEU LAVANDE", candidateColor: "BLEU LAVANDE", position: 3 }
 *
 * Two-stage matching:
 *   1. The parser ALWAYS extracts a `candidateColor` from the middle tokens — what's
 *      between the reference and the trailing number. This is the raw signal.
 *   2. `color` is set only when that candidate matches one of `knownColors` (case- and
 *      diacritic-insensitive). Callers without a known list still get useful output via
 *      `candidateColor` so they can run their own option-detection scoring.
 */

const NO_POSITION = 999; // sentinel; sorts last

export type ParsedFilename = {
  ref: string;
  /** Matched against `knownColors` (preserving the caller's original casing). */
  color: string | null;
  /** Raw middle of the filename (`BLEU LAVANDE`) — useful for auto-detecting which
   *  Shopify option represents color when the option is named anything other than
   *  Color/Couleur. */
  candidateColor: string | null;
  position: number;
};

/** Diacritic-strip + uppercase + collapse separators to single spaces. */
export function normalizeForMatch(s: string): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    // Strip Unicode combining marks (covers accents on any letter, regardless of editor encoding).
    .replace(/\p{M}+/gu, "")
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function stripExt(name: string): string {
  const i = name.lastIndexOf(".");
  if (i <= 0) return name;
  return name.slice(0, i);
}

function tokens(name: string): string[] {
  return name
    .split(/[-_\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function buildColorIndex(known: string[]): Map<string, string> {
  const idx = new Map<string, string>();
  for (const raw of known) {
    if (!raw) continue;
    const key = normalizeForMatch(raw);
    if (key) idx.set(key, raw);
  }
  return idx;
}

export function parseProductImageFilename(
  filename: string,
  knownColors: string[] = [],
): ParsedFilename {
  const empty: ParsedFilename = {
    ref: "",
    color: null,
    candidateColor: null,
    position: NO_POSITION,
  };
  if (!filename) return empty;

  const base = stripExt(filename);
  const allTokens = tokens(base);
  if (allTokens.length === 0) return empty;

  const ref = allTokens[0];

  let position = NO_POSITION;
  let middleEnd = allTokens.length;
  const last = allTokens[allTokens.length - 1];
  if (/^\d+$/.test(last)) {
    const n = Number.parseInt(last, 10);
    if (Number.isFinite(n)) position = n;
    middleEnd = allTokens.length - 1;
  }

  const middle = allTokens.slice(1, middleEnd);
  const candidateColor =
    middle.length > 0 ? middle.join(" ").toUpperCase() : null;

  if (middle.length === 0 || knownColors.length === 0) {
    return { ref, color: null, candidateColor, position };
  }

  // Walk the middle tokens; for each starting index find the longest run that maps to
  // a known color. Prefer the longest match, then the earliest start.
  const colorIdx = buildColorIndex(knownColors);
  let bestMatch: { color: string; len: number; start: number } | null = null;
  for (let start = 0; start < middle.length; start++) {
    for (let len = middle.length - start; len >= 1; len--) {
      const candidate = normalizeForMatch(
        middle.slice(start, start + len).join(" "),
      );
      const hit = colorIdx.get(candidate);
      if (hit) {
        if (
          !bestMatch ||
          len > bestMatch.len ||
          (len === bestMatch.len && start < bestMatch.start)
        ) {
          bestMatch = { color: hit, len, start };
        }
        break; // longest at this `start` found
      }
    }
  }

  return {
    ref,
    color: bestMatch?.color ?? null,
    candidateColor,
    position,
  };
}

/**
 * Pick the option name that explicitly represents "color" by name. Recognises common
 * EN/FR/IT/ES variants. Returns the option name preserving its case, or null when no
 * option name matches. Callers should fall back to `autoDetectColorOption` when this
 * returns null.
 */
const COLOR_OPTION_SYNONYMS = new Set([
  "color",
  "colour",
  "couleur",
  "coloris",
  "color name",
  "colour name",
  "color/colour",
  "color / colour",
  "colore",
  "colori",
  "color (custom)",
  "farbe", // de
  "kleur", // nl
  "farve", // dk
]);

export function pickColorOptionName(optionNames: string[]): string | null {
  for (const n of optionNames) {
    const k = n.trim().toLowerCase();
    if (COLOR_OPTION_SYNONYMS.has(k)) return n;
  }
  return null;
}

/**
 * Score every option on the product by how many filenames look like they reference
 * one of that option's values, then return the highest-scoring option (provided it
 * matches at least `minMatches` files). This is the fallback when option naming is
 * non-standard (e.g. Italian "Colore", a custom "Variant" label, etc.).
 *
 * Match criteria for a single filename + option-value pair:
 *   1. Exact normalized equality of the candidate vs option value.
 *   2. Candidate STARTS WITH the option value (handles "BLEU LAVANDE EXTRA-1").
 *   3. Candidate ENDS WITH the option value (handles "...-CREME-1").
 *   4. Single-token option value appears as a whole word in the candidate.
 */
export function autoDetectColorOption(
  product: {
    options: Array<{ name: string; optionValues: Array<{ name: string }> }>;
  },
  filenames: string[],
  minMatches = 1,
): { optionName: string; values: string[] } | null {
  const candidates = filenames
    .map((f) => parseProductImageFilename(f).candidateColor)
    .filter((v): v is string => !!v)
    .map((v) => normalizeForMatch(v));
  if (candidates.length === 0) return null;

  let best: { optionName: string; values: string[]; score: number } | null = null;
  for (const opt of product.options) {
    const values = opt.optionValues.map((v) => v.name).filter(Boolean);
    if (values.length === 0) continue;
    const normValues = values.map((v) => ({
      raw: v,
      norm: normalizeForMatch(v),
    }));
    let score = 0;
    for (const cand of candidates) {
      const hit = normValues.some(({ norm }) => {
        if (!norm) return false;
        if (cand === norm) return true;
        if (cand.startsWith(norm + " ")) return true;
        if (cand.endsWith(" " + norm)) return true;
        // Multi-word candidate, single-word option value: substring as a whole word.
        if (!norm.includes(" ")) {
          const re = new RegExp(`(^|\\s)${escapeRegex(norm)}(\\s|$)`);
          if (re.test(cand)) return true;
        }
        return false;
      });
      if (hit) score += 1;
    }
    if (score >= minMatches && (!best || score > best.score)) {
      best = { optionName: opt.name, values, score };
    }
  }
  return best
    ? { optionName: best.optionName, values: best.values }
    : null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Resolve the color-like option for a product: try explicit naming first, then
 * auto-detect by scoring against the import's filenames. Returns the option name and
 * its ordered list of values, or null when no option looks color-like.
 */
export function resolveColorOption(
  product: {
    options: Array<{ name: string; optionValues: Array<{ name: string }> }>;
  },
  filenames: string[],
): { optionName: string; values: string[]; source: "named" | "auto" } | null {
  const named = pickColorOptionName(product.options.map((o) => o.name));
  if (named) {
    const opt = product.options.find((o) => o.name === named);
    if (opt) {
      const values = opt.optionValues.map((v) => v.name).filter(Boolean);
      if (values.length > 0) return { optionName: named, values, source: "named" };
    }
  }
  // Auto-detect: require matches on at least 2 filenames (so we don't accidentally
  // pick "Size" because one file happened to contain "S" or "M").
  const auto = autoDetectColorOption(product, filenames, 2);
  if (auto) return { ...auto, source: "auto" };
  return null;
}
