import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

export type NotificationPrefs = {
  user_id: string;
  inapp_interview: boolean;
  inapp_application: boolean;
  inapp_job_match: boolean;
  inapp_profile: boolean;
  inapp_offer: boolean;
  email_interview: boolean;
  email_application: boolean;
  email_job_match: boolean;
  email_profile: boolean;
  email_offer: boolean;
};

export const NOTIFICATION_CATEGORIES = [
  { key: "interview", label: "Interview scheduled", description: "When a school books an interview or demo slot." },
  { key: "application", label: "Application updates", description: "When an application is accepted, progressed or rejected." },
  { key: "offer", label: "Offer received", description: "When a school extends a formal offer." },
  { key: "job_match", label: "New job matches", description: "When a newly published role matches your subjects." },
  { key: "profile", label: "Profile reminders", description: "Nudges to finish an incomplete profile." },
] as const;

export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => void qc.invalidateQueries({ queryKey: ["notifications", userId] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  const markRead = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return;
      const { error } = await supabase.from("notifications").update({ read: true }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", userId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", userId] }),
  });

  const items = query.data ?? [];
  return {
    items,
    unreadCount: items.filter((n) => !n.read).length,
    isLoading: query.isLoading,
    markRead,
    remove,
  };
}

const DEFAULT_PREFS: Omit<NotificationPrefs, "user_id"> = {
  inapp_interview: true,
  inapp_application: true,
  inapp_job_match: true,
  inapp_profile: true,
  inapp_offer: true,
  email_interview: true,
  email_application: true,
  email_job_match: false,
  email_profile: false,
  email_offer: true,
};

export function useNotificationPrefs() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ["notification-prefs", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? { user_id: userId!, ...DEFAULT_PREFS }) as NotificationPrefs;
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<NotificationPrefs>) => {
      if (!userId) return;
      const current = query.data ?? { user_id: userId, ...DEFAULT_PREFS };
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({ ...current, ...patch, user_id: userId }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-prefs", userId] }),
  });

  return { prefs: query.data ?? ({ user_id: userId ?? "", ...DEFAULT_PREFS } as NotificationPrefs), isLoading: query.isLoading, update };
}
