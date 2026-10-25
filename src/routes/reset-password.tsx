import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, PasswordField } from "@/components/auth-shell";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set new password — InterviewAI" },
      { name: "description", content: "Choose a new password for your InterviewAI account." },
      { property: "og:title", content: "Set new password — InterviewAI" },
      { property: "og:description", content: "Choose a new password." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();

    if (pw.length < 8) {
      toast.error("Use at least 8 characters");
      return;
    }

    if (pw !== confirm) {
      toast.error("Passwords don't match");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  }
  return (
    <AuthShell title="Set a new password" subtitle="Enter and confirm your new password.">
      <form onSubmit={submit} className="space-y-4">
        <PasswordField label="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <PasswordField
          label="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <button className="btn-primary w-full" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />} Update password
        </button>
      </form>
    </AuthShell>
  );
}
