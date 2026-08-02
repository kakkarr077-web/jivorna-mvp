import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { completionPercent, emptyWizard, type WizardValues } from "@/lib/teacherWizard";

/**
 * Creates a "Profile incomplete" in-app reminder for teachers whose profile is
 * under 100%, at most once a week and only when the reminder category is on.
 */
export function useProfileIncompleteNotice() {
  const { user, role } = useAuth();

  useEffect(() => {
    if (!user || role !== "teacher") return;
    let active = true;

    const run = async () => {
      const [{ data: profile }, { data: prefs }] = await Promise.all([
        supabase.from("teacher_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("notification_preferences").select("inapp_profile").eq("user_id", user.id).maybeSingle(),
      ]);
      if (!active) return;
      if (prefs && prefs.inapp_profile === false) return;

      const values = { ...emptyWizard, ...(profile ?? {}) } as WizardValues;
      const percent = completionPercent(values);
      if (percent >= 100) return;

      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("type", "profile")
        .gte("created_at", since);
      if (!active || (count ?? 0) > 0) return;

      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "profile",
        title: "Your profile is incomplete",
        body: `Your profile is ${percent}% complete. Finish it to appear in school searches.`,
        link: "/teacher/onboarding",
      });
    };

    void run();
    return () => {
      active = false;
    };
  }, [user, role]);
}
