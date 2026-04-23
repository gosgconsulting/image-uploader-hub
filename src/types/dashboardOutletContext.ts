/** Passed from `DashboardLayout` to nested routes via `<Outlet context={…} />`. */
export type DashboardOutletContext = {
  /** Selected dashboard brand; image imports are scoped to this id. */
  importBrandId: string | null;
};
