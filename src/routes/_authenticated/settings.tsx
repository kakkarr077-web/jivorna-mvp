import { useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BellRing,
  CreditCard,
  Eye,
  KeyRound,
  Palette,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useActivityLogs, logActivity } from "@/hooks/useActivityLogs";
import { NOTIFICATION_CATEGORIES, useNotificationPrefs } from "@/hooks/useNotifications";
import { deleteMyAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings | Jivorna" },
      { name: "description", content: "Manage your Jivorna profile, password, notifications, privacy, subscription, branding and security." },
      { property: "og:title", content: "Settings | Jivorna" },
      { property: "og:description", content: "Manage your Jivorna account preferences and security." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { role } = useAuth();
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <header>
        <p className="eyebrow text-secondary">Account</p>
        <h1 className="font-serif text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, security, privacy and preferences.
        </p>
      </header>

      <Tabs defaultValue="profile">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="profile" className="gap-2"><UserRound className="h-4 w-4" /> Profile</TabsTrigger>
          <TabsTrigger value="password" className="gap-2"><KeyRound className="h-4 w-4" /> Password</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><BellRing className="h-4 w-4" /> Notifications</TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2"><Eye className="h-4 w-4" /> Privacy</TabsTrigger>
          <TabsTrigger value="subscription" className="gap-2"><CreditCard className="h-4 w-4" /> Subscription</TabsTrigger>
          {role === "school" && (
            <TabsTrigger value="branding" className="gap-2"><Palette className="h-4 w-4" /> Branding</TabsTrigger>
          )}
          <TabsTrigger value="security" className="gap-2"><ShieldCheck className="h-4 w-4" /> Security</TabsTrigger>
          <TabsTrigger value="activity" className="gap-2"><Activity className="h-4 w-4" /> Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6"><ProfileSection /></TabsContent>
        <TabsContent value="password" className="mt-6"><PasswordSection /></TabsContent>
        <TabsContent value="notifications" className="mt-6"><NotificationsSection /></TabsContent>
        <TabsContent value="privacy" className="mt-6 space-y-6">
          <PrivacySection />
          <DangerZone />
        </TabsContent>
        <TabsContent value="subscription" className="mt-6"><SubscriptionSection /></TabsContent>
        {role === "school" && (
          <TabsContent value="branding" className="mt-6"><BrandingSection /></TabsContent>
        )}
        <TabsContent value="security" className="mt-6"><SecuritySection /></TabsContent>
        <TabsContent value="activity" className="mt-6"><ActivitySection /></TabsContent>
      </Tabs>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="card-premium">
      <CardHeader>
        <CardTitle className="font-serif text-xl">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

function ProfileSection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ full_name: "", avatar_url: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["settings-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name,avatar_url,email")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data) setForm({ full_name: data.full_name ?? "", avatar_url: data.avatar_url ?? "" });
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: form.full_name.trim(), avatar_url: form.avatar_url.trim() || null })
        .eq("id", user!.id);
      if (error) throw error;
      await logActivity(user!.id, "Profile updated", "Account name or photo changed");
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["settings-profile"] });
      qc.invalidateQueries({ queryKey: ["activity-logs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <SectionCard title="Profile" description="How your name appears across Jivorna.">
      <div className="grid gap-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={data?.email ?? user?.email ?? ""} disabled />
        <p className="text-xs text-muted-foreground">Contact support to change your sign-in email.</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="avatar">Profile photo URL</Label>
        <Input id="avatar" placeholder="https://…" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} />
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? "Saving…" : "Save changes"}
      </Button>
    </SectionCard>
  );
}

function PasswordSection() {
  const { user } = useAuth();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (pw.length < 8) throw new Error("Use at least 8 characters");
      if (pw !== confirm) throw new Error("Passwords do not match");
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      if (user?.id) await logActivity(user.id, "Password changed", "Password updated from settings");
    },
    onSuccess: () => {
      setPw("");
      setConfirm("");
      toast.success("Password updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SectionCard title="Password" description="Choose a strong password you don't use elsewhere.">
      <div className="grid gap-2">
        <Label htmlFor="new-pw">New password</Label>
        <Input id="new-pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm-pw">Confirm new password</Label>
        <Input id="confirm-pw" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending || !pw}>
        {save.isPending ? "Updating…" : "Update password"}
      </Button>
    </SectionCard>
  );
}

function NotificationsSection() {
  const { prefs, update } = useNotificationPrefs();
  const { settings, update: updateSettings } = useUserSettings();

  return (
    <SectionCard title="Notifications" description="Choose what reaches you in-app and by email.">
      {NOTIFICATION_CATEGORIES.map((cat) => (
        <div key={cat.key} className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">{cat.label}</p>
            <p className="text-sm text-muted-foreground">{cat.description}</p>
          </div>
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 text-sm">
              In-app
              <Switch
                checked={prefs?.[`inapp_${cat.key}` as keyof typeof prefs] !== false}
                onCheckedChange={(v) => update.mutate({ [`inapp_${cat.key}`]: v })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              Email
              <Switch
                checked={prefs?.[`email_${cat.key}` as keyof typeof prefs] !== false}
                onCheckedChange={(v) => update.mutate({ [`email_${cat.key}`]: v })}
              />
            </label>
          </div>
        </div>
      ))}
      <Separator />
      <ToggleRow
        label="Product & marketing emails"
        description="Occasional updates about new Jivorna features."
        checked={settings.marketing_emails}
        onChange={(v) => updateSettings.mutate({ marketing_emails: v })}
      />
    </SectionCard>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function PrivacySection() {
  const { settings, update, isLoading } = useUserSettings();
  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <SectionCard title="Privacy" description="Control who can find you and what they see.">
      <div className="grid gap-2">
        <Label>Profile visibility</Label>
        <Select value={settings.profile_visibility} onValueChange={(v) => update.mutate({ profile_visibility: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="public">Public — visible to anyone</SelectItem>
            <SelectItem value="schools">Verified schools only</SelectItem>
            <SelectItem value="private">Private — hidden from search</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ToggleRow
        label="Appear in search results"
        description="Allow schools to discover you through Browse teachers."
        checked={settings.searchable}
        onChange={(v) => update.mutate({ searchable: v })}
      />
      <ToggleRow
        label="Show contact details"
        description="Share phone and email with schools you have applied to."
        checked={settings.show_contact}
        onChange={(v) => update.mutate({ show_contact: v })}
      />
    </SectionCard>
  );
}

function DangerZone() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");

  const remove = useMutation({
    mutationFn: async () => {
      await deleteMyAccount();
      await supabase.auth.signOut();
    },
    onSuccess: () => {
      toast.success("Your account has been deleted");
      void router.navigate({ to: "/", replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="font-serif text-xl text-destructive">Delete account</CardTitle>
        <CardDescription>
          This permanently removes your profile, applications, documents and history. It cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <Trash2 className="h-4 w-4" /> Delete my account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your Jivorna account?</AlertDialogTitle>
              <AlertDialogDescription>
                Type <span className="font-semibold text-foreground">DELETE</span> to confirm. All of your data
                will be permanently erased.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={confirmText !== "DELETE" || remove.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  remove.mutate();
                }}
              >
                {remove.isPending ? "Deleting…" : "Permanently delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function SubscriptionSection() {
  const { user, role } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["settings-subscription", user?.id],
    enabled: !!user?.id && role === "school",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("id,name,subscription_status")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (role !== "school") {
    return (
      <SectionCard title="Subscription" description="Your Jivorna plan.">
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="font-medium">Teacher plan</p>
            <p className="text-sm text-muted-foreground">Free forever — apply to unlimited roles.</p>
          </div>
          <Badge className="border-0 bg-emerald-100 text-emerald-800">Active</Badge>
        </div>
      </SectionCard>
    );
  }

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <SectionCard title="Subscription" description="Your school's hiring plan and billing.">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
        <div>
          <p className="font-medium">{data?.name ?? "Your school"}</p>
          <p className="text-sm capitalize text-muted-foreground">
            Status: {data?.subscription_status ?? "trial"}
          </p>
        </div>
        <Badge variant="secondary" className="capitalize">{data?.subscription_status ?? "trial"}</Badge>
      </div>
      <Button variant="outline" asChild>
        <a href="/school/invoices">View invoices & billing</a>
      </Button>
    </SectionCard>
  );
}

function BrandingSection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ logo_url: "", brand_color: "#0A2E63", tagline: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["settings-branding", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("id,name,logo_url,brand_color,tagline")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        logo_url: data.logo_url ?? "",
        brand_color: data.brand_color ?? "#0A2E63",
        tagline: data.tagline ?? "",
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!data?.id) throw new Error("Create your school profile first");
      const { error } = await supabase
        .from("schools")
        .update({
          logo_url: form.logo_url.trim() || null,
          brand_color: form.brand_color || null,
          tagline: form.tagline.trim() || null,
        })
        .eq("id", data.id);
      if (error) throw error;
      if (user?.id) await logActivity(user.id, "Branding updated", "School branding changed");
    },
    onSuccess: () => {
      toast.success("Branding saved");
      qc.invalidateQueries({ queryKey: ["settings-branding"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <SectionCard title="Branding" description="Personalise how your school appears on job listings.">
      <div className="flex items-center gap-4 rounded-lg border border-border p-4">
        <span
          className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl text-lg font-semibold text-white"
          style={{ backgroundColor: form.brand_color || "#0A2E63" }}
        >
          {form.logo_url ? (
            <img src={form.logo_url} alt={`${data?.name ?? "School"} logo`} className="h-full w-full object-cover" />
          ) : (
            (data?.name ?? "S").charAt(0)
          )}
        </span>
        <div>
          <p className="font-medium">{data?.name ?? "Your school"}</p>
          <p className="text-sm text-muted-foreground">{form.tagline || "Add a tagline to stand out."}</p>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="logo">Logo URL</Label>
        <Input id="logo" placeholder="https://…" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="color">Brand colour</Label>
        <div className="flex items-center gap-3">
          <Input id="color" type="color" className="h-10 w-16 p-1" value={form.brand_color} onChange={(e) => setForm({ ...form, brand_color: e.target.value })} />
          <Input value={form.brand_color} onChange={(e) => setForm({ ...form, brand_color: e.target.value })} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="tagline">Tagline</Label>
        <Textarea id="tagline" rows={2} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? "Saving…" : "Save branding"}
      </Button>
    </SectionCard>
  );
}

function SecuritySection() {
  const { user } = useAuth();
  const router = useRouter();

  const signOutEverywhere = useMutation({
    mutationFn: async () => {
      if (user?.id) await logActivity(user.id, "Signed out everywhere", "All sessions revoked");
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Signed out on all devices");
      void router.navigate({ to: "/auth", replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetLink = useMutation({
    mutationFn: async () => {
      if (!user?.email) throw new Error("No email on this account");
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Reset link sent to your email"),
    onError: (e: Error) => toast.error(e.message),
  });

  const verified = !!user?.email_confirmed_at;
  const lastSignIn = user?.last_sign_in_at ? new Date(user.last_sign_in_at) : null;

  return (
    <SectionCard title="Security" description="Session and account protection.">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Email verification</p>
          <p className="mt-1 font-medium">
            {verified ? <Badge className="border-0 bg-emerald-100 text-emerald-800">Verified</Badge> : <Badge className="border-0 bg-amber-100 text-amber-900">Pending</Badge>}
          </p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Last sign-in</p>
          <p className="mt-1 font-medium">{lastSignIn ? lastSignIn.toLocaleString() : "—"}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Sign-in method</p>
          <p className="mt-1 font-medium capitalize">{user?.app_metadata?.provider ?? "email"}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Leaked password protection</p>
          <p className="mt-1 font-medium">Enabled</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => resetLink.mutate()} disabled={resetLink.isPending}>
          Email me a reset link
        </Button>
        <Button variant="outline" onClick={() => signOutEverywhere.mutate()} disabled={signOutEverywhere.isPending}>
          Sign out on all devices
        </Button>
      </div>
    </SectionCard>
  );
}

function ActivitySection() {
  const { data, isLoading } = useActivityLogs();

  return (
    <SectionCard title="Activity logs" description="Recent actions on your account.">
      {isLoading ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
      ) : (
        <ul className="space-y-3">
          {(data ?? []).map((log) => (
            <li key={log.id} className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
              <div>
                <p className="font-medium">{log.action}</p>
                {log.detail && <p className="text-sm text-muted-foreground">{log.detail}</p>}
                {log.device && <p className="mt-1 text-xs text-muted-foreground/80">{log.device}</p>}
              </div>
              <time className="shrink-0 text-xs text-muted-foreground">
                {new Date(log.created_at).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
