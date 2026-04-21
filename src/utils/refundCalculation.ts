// Shared utility for refund amount calculation
// This ensures both the table and modal use the same calculation logic

export interface Product {
  id: string;
  name: string;
  amount: number;
}

// Sample product pool
const PRODUCT_POOL = [
  "Manteau DELPHINA Bleu electrique - XS / BLEU ELECTRIQUE",
  "Gilet MANILA Rose pale - S / ROSE PALE",
  "Manteau DELPHINA Bleu electrique - S / BLEU ELECTRIQUE",
  "Pull CAMELIA Gris - S / GRIS",
  "Robe OEILLET Noir - XS / NOIR",
  "Veste PREVERT Noir - S / NOIR",
  "Veste PREVERT Kaki - XS / KAKI",
  "Veste PREVERT Kaki - S / KAKI",
  "Manteau MATHELINE Vert foret",
  "Jupe NASSIA Chocolat - L / CHOCOLAT",
  "Pull DIAMOND Rouge - S / ROUGE",
  "Pull DIAMOND Gris - S / GRIS",
  "Robe DIANELLA Fuchsia - M / FUCHSIA",
  "Top DONNA Noir - M / NOIR",
  "Blouse MISTIGRI Geo flowers - XS / GEO FLOWERS",
  "Jean GAYNOR Bleu jean - 25 / BLEU-JEAN",
  "Cardigan MORAND Rouge - S / ROUGE",
  "Chemise RAVEN Noir - M / NOIR",
  "Pull MYOSOTIS Bleu jean - M / BLEU JEAN",
  "Blouse BOLDO Marron glace - S / MARRON GLACE",
  "Jean SUKI Bleu nuit - 26 / BLEU NUIT",
  "Robe SIL Rouge - XS / ROUGE",
  "Veste PREVERT Noir - XL / NOIR",
  "Combi-pantalon ALYA Lilas - S / LILAS",
  "Veste PREVERT Marron glace - M / MARRON GLACE",
  "Jean PRUNELLA Bleu marine - 27 / BLEU MARINE",
  "Pantalon AUSTEN Lilas - S / LILAS",
  "Blouse CHOUPETTE Rouge - M / ROUGE",
  "Trench HALIMI Bordeaux - XS / BORDEAUX",
  "Manteau NEMORALIS Beige",
  "Veste PREVEST Marron glace",
  "Pantalon HORTENSIS Beige",
  "Pull TRIOLET Marron glace",
];

// Seeded random number generator for consistent products
function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

/**
 * Generate consistent products based on refund ID
 * Same refund ID will always generate the same products
 */
export function generateProductsForRefund(refundId: string, count: number = 5): Product[] {
  // Use refund ID as seed for consistent generation
  const seed = refundId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = seededRandom(seed);
  
  // Shuffle products consistently based on seed
  const shuffled = [...PRODUCT_POOL].sort((a, b) => {
    const hashA = a.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hashB = b.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (hashA + seed) % 1000 - (hashB + seed) % 1000;
  });
  
  return shuffled.slice(0, count).map((name, index) => {
    // Generate consistent amount based on seed and index
    const amountSeed = seed + index * 1000;
    const amountRandom = seededRandom(amountSeed);
    const amount = Math.round((amountRandom() * 150 + 50) * 100) / 100; // Random between 50-200
    return {
      id: `product-${index + 1}`,
      name,
      amount,
    };
  });
}

/**
 * Calculate refund amount from products and return fees
 * This is the shared calculation logic used by both table and modal
 */
export function calculateRefundAmount(refundId: string, returnFee: number): number {
  const products = generateProductsForRefund(refundId);
  const productsTotal = products.reduce((sum, product) => sum + product.amount, 0);
  const returnFees = Math.abs(returnFee);
  return productsTotal + returnFees;
}

/**
 * Get products and calculated refund amount for a refund
 * Returns both the products and the calculated refund amount
 */
export function getRefundCalculationData(refundId: string, returnFee: number): {
  products: Product[];
  calculatedRefund: number;
} {
  const products = generateProductsForRefund(refundId);
  const productsTotal = products.reduce((sum, product) => sum + product.amount, 0);
  const returnFees = Math.abs(returnFee);
  const calculatedRefund = productsTotal + returnFees;
  
  return {
    products,
    calculatedRefund,
  };
}
