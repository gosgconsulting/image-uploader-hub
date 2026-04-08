import { describe, it, expect } from "vitest";
import { lineItemsToProducts } from "./shopifyOrder";

describe("lineItemsToProducts", () => {
  const base = {
    id: 1,
    name: "Test",
    price: "10.00",
    quantity: 2,
  };

  it("adds line tax when prices exclude tax (taxes_included false)", () => {
    const products = lineItemsToProducts(
      [
        {
          ...base,
          tax_lines: [{ price: "2.00" }, { price: "0.50" }],
        },
      ],
      false
    );
    expect(products[0].amount).toBe(22.5);
  });

  it("does not add tax_lines when prices already include tax", () => {
    const products = lineItemsToProducts(
      [
        {
          ...base,
          tax_lines: [{ price: "2.00" }],
        },
      ],
      true
    );
    expect(products[0].amount).toBe(20);
  });
});
