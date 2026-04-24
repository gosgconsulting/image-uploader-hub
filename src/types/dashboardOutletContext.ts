/** Passed from `DashboardLayout` to nested routes via `<Outlet context={…} />`. */
export type DashboardOutletContext = {
  /** Selected dashboard brand; image imports are scoped to this id. */
  importBrandId: string | null;
  /** True when the signed-in user owns the selected brand (Shopify + team management). */
  selectedBrandIsOwner: boolean;
  /** Reload brands after team changes (e.g. self removed as member). */
  refreshBrands: () => Promise<void>;
};
