import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { insertBrand, listBrandsForUser, type BrandRow } from "@/lib/brands-db";

const LS_SELECTED_BRAND = "dashboard_selected_brand_id";

export function useDashboardBrands() {
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LS_SELECTED_BRAND);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setBrands([]);
      setSelectedId(null);
      setLoading(false);
      return;
    }
    const rows = await listBrandsForUser();
    setBrands(rows);
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(LS_SELECTED_BRAND);
    } catch {
      stored = null;
    }
    let next: string | null = null;
    if (stored && rows.some((b) => b.id === stored)) next = stored;
    else if (rows.length > 0) next = rows[0].id;
    try {
      if (next) localStorage.setItem(LS_SELECTED_BRAND, next);
      else localStorage.removeItem(LS_SELECTED_BRAND);
    } catch {
      /* */
    }
    setSelectedId(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });
    return () => subscription.unsubscribe();
  }, [load]);

  const selectBrand = useCallback((id: string) => {
    try {
      localStorage.setItem(LS_SELECTED_BRAND, id);
    } catch {
      /* */
    }
    setSelectedId(id);
  }, []);

  const createBrand = useCallback(
    async (name: string): Promise<{ error: Error | null }> => {
      const result = await insertBrand(name);
      if (result.error) return { error: result.error };
      await load();
      if (result.id) {
        try {
          localStorage.setItem(LS_SELECTED_BRAND, result.id);
        } catch {
          /* */
        }
        setSelectedId(result.id);
      }
      return { error: null };
    },
    [load]
  );

  const selectedBrand = brands.find((b) => b.id === selectedId) ?? null;

  return {
    brands,
    selectedBrand,
    selectedId,
    selectBrand,
    createBrand,
    loading,
    refreshBrands: load,
  };
}
