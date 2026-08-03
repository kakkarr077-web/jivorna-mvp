import { createServerFn } from "@tanstack/react-start";

export type PlatformStatsResult = {
  teacher_count: number;
  school_count: number;
  live_job_count: number;
};

/**
 * Public, aggregate-only platform counters for the marketing homepage.
 * Runs server-side so the underlying SECURITY DEFINER helper stays
 * unreachable for anonymous callers of the Data API.
 */
export const getPlatformStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<PlatformStatsResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("platform_stats");
    if (error) throw new Error(error.message);
    const row = data?.[0];
    return {
      teacher_count: Number(row?.teacher_count ?? 0),
      school_count: Number(row?.school_count ?? 0),
      live_job_count: Number(row?.live_job_count ?? 0),
    };
  },
);
