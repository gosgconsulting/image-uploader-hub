import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseRefundSpreadsheetBuffer } from "./parseRefundSpreadsheet";

function workbookToArrayBuffer(wb: XLSX.WorkBook): ArrayBuffer {
  const raw = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as
    | number[]
    | Uint8Array;
  const u8 = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
}

describe("parseRefundSpreadsheetBuffer", () => {
  it("selects the data sheet when the first tab is a summary (e.g. retours export)", () => {
    const summary = XLSX.utils.aoa_to_sheet([
      ["", "Nombre de raison_retour", ""],
      ["Ne me plaît pas", 17, 0.4],
    ]);
    const data = XLSX.utils.aoa_to_sheet([
      [
        "fichier_source",
        "page",
        "provenance",
        "numero_commande",
        "nom_produit",
        "date",
        "raison_retour",
        "lien_shopify",
      ],
      [
        "doc.pdf",
        1,
        "SHOP",
        "#A / 999",
        "Widget",
        46056,
        "",
        "https://admin.shopify.com/store/x/orders/999/refund",
      ],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, summary, "Feuil1");
    XLSX.utils.book_append_sheet(wb, data, "export");
    const groups = parseRefundSpreadsheetBuffer(workbookToArrayBuffer(wb));
    expect(groups).toHaveLength(1);
    expect(groups[0].numericOrderId).toBe("999");
    expect(groups[0].productNames).toEqual(["Widget"]);
  });

  it("imports a chosen tab when the first sheet is pivot (explicit sheetNames)", () => {
    const summary = XLSX.utils.aoa_to_sheet([
      ["", "Nombre de raison_retour", ""],
      ["x", 1, 0.5],
    ]);
    const data = XLSX.utils.aoa_to_sheet([
      [
        "fichier_source",
        "page",
        "provenance",
        "numero_commande",
        "nom_produit",
        "date",
        "raison_retour",
        "lien_shopify",
      ],
      [
        "doc.pdf",
        1,
        "SHOP",
        "#A / 888",
        "Coat",
        46056,
        "",
        "https://admin.shopify.com/store/x/orders/888/refund",
      ],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, summary, "Feuil1");
    XLSX.utils.book_append_sheet(wb, data, "Data");
    const buf = workbookToArrayBuffer(wb);
    const groups = parseRefundSpreadsheetBuffer(buf, { sheetNames: ["Data"] });
    expect(groups).toHaveLength(1);
    expect(groups[0].numericOrderId).toBe("888");
    expect(groups[0].pageKey).toBe("888");
  });

  it("prefixes page keys when importing multiple data tabs", () => {
    const header = [
      "fichier_source",
      "page",
      "provenance",
      "numero_commande",
      "nom_produit",
      "date",
      "raison_retour",
      "lien_shopify",
    ] as const;
    const row = (orderSuffix: string, nom: string) =>
      [
        "doc.pdf",
        1,
        "SHOP",
        `#X / ${orderSuffix}`,
        nom,
        46056,
        "",
        `https://admin.shopify.com/store/x/orders/${orderSuffix}/refund`,
      ] as const;
    const s1 = XLSX.utils.aoa_to_sheet([header, row("111", "A")]);
    const s2 = XLSX.utils.aoa_to_sheet([header, row("222", "B")]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, s1, "TabOne");
    XLSX.utils.book_append_sheet(wb, s2, "TabTwo");
    const groups = parseRefundSpreadsheetBuffer(workbookToArrayBuffer(wb), {
      sheetNames: ["TabOne", "TabTwo"],
    });
    expect(groups).toHaveLength(2);
    const keys = groups.map((g) => g.pageKey).sort();
    expect(keys).toEqual(["TabOne · 111", "TabTwo · 222"]);
  });

  it("splits two orders on the same page into two groups (group by order id, not page)", () => {
    const data = XLSX.utils.aoa_to_sheet([
      [
        "fichier_source",
        "page",
        "provenance",
        "numero_commande",
        "nom_produit",
        "date",
        "raison_retour",
        "lien_shopify",
      ],
      [
        "doc.pdf",
        1,
        "SHOP",
        "#A / 501",
        "First product",
        46056,
        "",
        "https://admin.shopify.com/store/x/orders/501/refund",
      ],
      [
        "doc.pdf",
        1,
        "SHOP",
        "#B / 502",
        "Second product",
        46056,
        "",
        "https://admin.shopify.com/store/x/orders/502/refund",
      ],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, data, "export");
    const groups = parseRefundSpreadsheetBuffer(workbookToArrayBuffer(wb));
    expect(groups).toHaveLength(2);
    const byId = Object.fromEntries(groups.map((g) => [g.numericOrderId, g]));
    expect(byId["501"]?.productNames).toEqual(["First product"]);
    expect(byId["502"]?.productNames).toEqual(["Second product"]);
  });

  it("treats blank numero_commande / lien_shopify on the next row as same order (column D carry-down)", () => {
    const data = XLSX.utils.aoa_to_sheet([
      [
        "fichier_source",
        "page",
        "provenance",
        "numero_commande",
        "nom_produit",
        "date",
        "raison_retour",
        "lien_shopify",
      ],
      [
        "doc.pdf",
        1,
        "SHOP",
        "#A / 777",
        "Line one",
        46056,
        "",
        "https://admin.shopify.com/store/x/orders/777/refund",
      ],
      ["doc.pdf", 1, "SHOP", "", "Line two", 46056, "", ""],
      [
        "doc.pdf",
        2,
        "SHOP",
        "#B / 888",
        "Other order",
        46056,
        "",
        "https://admin.shopify.com/store/x/orders/888/refund",
      ],
      ["doc.pdf", 2, "SHOP", "", "Other line", 46056, "", ""],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, data, "export");
    const groups = parseRefundSpreadsheetBuffer(workbookToArrayBuffer(wb));
    expect(groups).toHaveLength(2);
    const g1 = groups.find((g) => g.numericOrderId === "777");
    const g2 = groups.find((g) => g.numericOrderId === "888");
    expect(g1?.numericOrderId).toBe("777");
    expect(g1?.productNames).toEqual(["Line one", "Line two"]);
    expect(g2?.numericOrderId).toBe("888");
    expect(g2?.productNames).toEqual(["Other order", "Other line"]);
  });

  it("throws when only a pivot sheet is present (pivot is never imported)", () => {
    const summary = XLSX.utils.aoa_to_sheet([
      ["", "Nombre de raison_retour", ""],
      ["x", 1, 0.5],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, summary, "Feuil1");
    expect(() =>
      parseRefundSpreadsheetBuffer(workbookToArrayBuffer(wb))
    ).toThrow(/Only pivot/);
  });
});
