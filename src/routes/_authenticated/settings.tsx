import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, LogOut, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/queries";
import { DIFFICULTIES, LENGTHS, LEVELS } from "@/lib/options";
import { ErrorState, Loading, PageHeader, Panel } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Profile & Settings — InterviewAI" }, { name: "description", content: "Manage your profile and interview defaults." }] }),
  component: Settings,
});

function Settings() {
  const q = useQuery(profileQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [f, setF] = useState({ full_name: "", target_role: "", experience_level: "beginner", preferred_difficulty: "medium", default_length: 10, timed_mode: false });
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (q.data)
      setF({
        full_name: q.data.full_name ?? "",
        target_role: q.data.target_role ?? "",
        experience_level: q.data.experience_level ?? "beginner",
        preferred_difficulty: q.data.preferred_difficulty ?? "medium",
        default_length: q.data.default_length ?? 10,
        timed_mode: q.data.timed_mode ?? false,
      });
  }, [q.data]);

  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorState message="Couldn't load your profile." onRetry={() => q.refetch()} />;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (f.full_name.trim().length < 2) return toast.error("Enter your full name");
    if (f.target_role.length > 80) return toast.error("Target role is too long");
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: q.data!.id,
      email: q.data!.email,
      full_name: f.full_name.trim(),
      target_role: f.target_role.trim() || null,
      experience_level: f.experience_level,
      preferred_difficulty: f.preferred_difficulty,
      default_length: f.default_length,
      timed_mode: f.timed_mode,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) return toast.error("Couldn't save profile");
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Profile saved");
  }

  return (
    <>
      <PageHeader title="Profile & settings" subtitle={q.data.email ?? undefined} />
      <div className="grid gap-5 lg:grid-cols-[1.618fr_1fr]">
        <Panel title="Profile & interview defaults">
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">Full name<input className="field mt-1.5" value={f.full_name} maxLength={100} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></label>
            <label className="text-sm sm:col-span-2">Target job role<input className="field mt-1.5" value={f.target_role} maxLength={80} placeholder="e.g. Data Analyst" onChange={(e) => setF({ ...f, target_role: e.target.value })} /></label>
            <label className="text-sm">Experience level
              <select className="field mt-1.5" value={f.experience_level} onChange={(e) => setF({ ...f, experience_level: e.target.value })}>
                {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </label>
            <label className="text-sm">Preferred difficulty
              <select className="field mt-1.5" value={f.preferred_difficulty} onChange={(e) => setF({ ...f, preferred_difficulty: e.target.value })}>
                {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </label>
            <label className="text-sm">Default interview length
              <select className="field mt-1.5" value={f.default_length} onChange={(e) => setF({ ...f, default_length: Number(e.target.value) })}>
                {LENGTHS.map((n) => <option key={n} value={n}>{n} questions</option>)}
              </select>
            </label>
            <label className="flex items-center gap-3 self-end pb-3 text-sm">
              <input type="checkbox" className="size-4 accent-[var(--violet)]" checked={f.timed_mode} onChange={(e) => setF({ ...f, timed_mode: e.target.checked })} />
              Timed mode by default
            </label>
            <button className="btn-primary sm:col-span-2" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />} Save changes</button>
          </form>
        </Panel>
        <Panel title="Account" className="h-fit">
          <button
            className="btn-ghost w-full"
            disabled={sending || !q.data.email}
            onClick={async () => {
              setSending(true);
              const { error } = await supabase.auth.resetPasswordForEmail(q.data!.email!, { redirectTo: `${window.location.origin}/reset-password` });
              setSending(false);
              if (error) toast.error(error.message);
              else toast.success("Password reset link sent to your email");
            }}
          >
            <KeyRound className="size-4" /> Send password reset email
          </button>
          <button
            className="btn-ghost mt-3 w-full hover:!border-destructive/50 hover:!text-destructive"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/" });
            }}
          >
            <LogOut className="size-4" /> Log out
          </button>
        </Panel>
      </div>
    </>
  );
}
