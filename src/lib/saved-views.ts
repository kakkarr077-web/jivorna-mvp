/** Per-user saved filter presets for any CRM module. */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type SavedView = {
  id: string;
  user_id: string;
  module: string;
  name: string;
  config: Record<string, unknown>;
};

export async function fetchSavedViews(module: string, userId: string): Promise<SavedView[]> {
  const { data, error } = await supabase
    .from("saved_views")
    .select("id,user_id,module,name,config")
    .eq("module", module)
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((v) => ({ ...v, config: (v.config ?? {}) as Record<string, unknown> }));
}

export async function createSavedView(input: {
  module: string;
  userId: string;
  name: string;
  config: Record<string, unknown>;
}) {
  const { error } = await supabase.from("saved_views").insert({
    module: input.module,
    user_id: input.userId,
    name: input.name,
    config: input.config as Json,
  });
  if (error) throw error;
}

export async function deleteSavedView(id: string) {
  const { error } = await supabase.from("saved_views").delete().eq("id", id);
  if (error) throw error;
}
