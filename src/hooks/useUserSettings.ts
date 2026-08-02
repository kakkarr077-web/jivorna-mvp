import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type UserSettings = {
  user_id: string;
  profile_visibility: string;
  searchable: boolean;
  show_contact: boolean;
  marketing_emails: boolean;
};

const defaults: Omit<UserSettings, "user_id"> = {
  profile_visibility: "schools",
  searchable: true,
  show_contact: true,
  marketing_emails: false,
};

export function useUserSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ["user-settings", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as UserSettings | null) ?? { user_id: userId!, ...defaults };
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<Omit<UserSettings, "user_id">>) => {
      if (!userId) return;
      const { error } = await supabase
        .from("user_settings")
        .upsert({ user_id: userId, ...defaults, ...query.data, ...patch }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-settings", userId] }),
  });

  return { settings: query.data ?? { user_id: userId ?? "", ...defaults }, isLoading: query.isLoading, update };
}
