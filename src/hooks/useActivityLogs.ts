import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ActivityLog = {
  id: string;
  action: string;
  detail: string | null;
  device: string | null;
  created_at: string;
};

export async function logActivity(userId: string, action: string, detail?: string) {
  const device = typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 180) : null;
  await supabase.from("activity_logs").insert({ user_id: userId, action, detail: detail ?? null, device });
}

export function useActivityLogs(limit = 50) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["activity-logs", user?.id, limit],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("id,action,detail,device,created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ActivityLog[];
    },
  });
}

export function useLogActivity() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ action, detail }: { action: string; detail?: string }) => {
      if (!user?.id) return;
      await logActivity(user.id, action, detail);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activity-logs"] }),
  });
}
