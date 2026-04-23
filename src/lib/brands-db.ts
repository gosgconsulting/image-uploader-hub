import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const brandNameSchema = z.string().trim().min(1).max(120);

export type BrandRow = { id: string; name: string };

export async function listBrandsForUser(): Promise<BrandRow[]> {
  const { data, error } = await supabase.from("brands").select("id, name").order("name");
  if (error || !data) return [];
  return data.map((r) => ({ id: r.id, name: r.name }));
}

export async function insertBrand(
  name: string
): Promise<{ error: Error | null; id?: string }> {
  const parsed = brandNameSchema.safeParse(name);
  if (!parsed.success) {
    return { error: new Error("Enter a brand name (1–120 characters).") };
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return { error: new Error("You must be signed in to create a brand.") };
  }

  const { data, error } = await supabase
    .from("brands")
    .insert({ user_id: session.user.id, name: parsed.data })
    .select("id")
    .single();

  if (error) {
    return { error: new Error(error.message) };
  }
  return { error: null, id: data?.id ? String(data.id) : undefined };
}
