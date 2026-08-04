import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * One-time owner bootstrap. Both functions require an authenticated caller and
 * refuse to do anything once any admin exists, so the flow can only ever run
 * once on a fresh platform. RLS is untouched: the privileged client is only
 * loaded after the caller is verified and the "no admin yet" gate passes.
 */

async function countAdmins() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export const getOwnerBootstrapStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admins = await countAdmins();
    return {
      available: admins === 0,
      email: (context.claims as { email?: string } | null)?.email ?? null,
    };
  });

export const claimOwnership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if ((await countAdmins()) > 0) {
      throw new Error("Owner account has already been configured.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Existing teacher/school roles are left in place — users may hold many roles.
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
