/** Matches n8n "Code in JavaScript" ordering for filenames like `REF-1-front.jpg`. */

export interface ProductImageRow {
  file_name: string;
  original_file_name?: string;
  file_url: string;
  productid: string;
  productname?: string;
}

export function normalizeProductGid(productid: unknown): string | null {
  const s = String(productid ?? "").trim();
  if (!s) return null;
  if (s.startsWith("gid://shopify/Product/")) return s;
  if (/^\d+$/.test(s)) return `gid://shopify/Product/${s}`;
  return null;
}

export function validateHttpsPublicImageUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return null;
    return s;
  } catch {
    return null;
  }
}

function getImageOrder(fileName: string): number {
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  const parts = baseName.split("-");
  if (parts.length < 2) return 999;

  const orderPart = parts[parts.length - 2] ?? "";
  const firstChar = orderPart.charAt(0);
  const order = parseInt(firstChar, 10);
  return Number.isNaN(order) ? 999 : order;
}

function sortKey(row: ProductImageRow): number {
  const name =
    (typeof row.original_file_name === "string" ? row.original_file_name : "") ||
    row.file_name ||
    "";
  return getImageOrder(name);
}

export function coerceProductRows(rawProducts: unknown): ProductImageRow[] {
  if (!Array.isArray(rawProducts)) return [];
  const out: ProductImageRow[] = [];
  for (const el of rawProducts) {
    if (!el || typeof el !== "object") continue;
    const o = el as Record<string, unknown>;
    const gid = normalizeProductGid(o.productid);
    const file_url = validateHttpsPublicImageUrl(o.file_url);
    const file_name = typeof o.file_name === "string" ? o.file_name : "";
    if (!gid || !file_url) continue;

    let original_file_name: string | undefined;
    if (typeof o.original_file_name === "string") original_file_name = o.original_file_name;

    let productname: string | undefined;
    if (typeof o.productname === "string") productname = o.productname;

    out.push({
      productid: gid,
      file_name,
      original_file_name,
      file_url,
      productname,
    });
  }
  return out;
}

export function groupSortedByProductId(rows: ProductImageRow[]): Map<string, ProductImageRow[]> {
  const grouped = new Map<string, ProductImageRow[]>();
  for (const row of rows) {
    const list = grouped.get(row.productid);
    if (list) list.push(row);
    else grouped.set(row.productid, [row]);
  }
  for (const [, list] of grouped) {
    list.sort((a, b) => sortKey(a) - sortKey(b));
  }
  return grouped;
}
