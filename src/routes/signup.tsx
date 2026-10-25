import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, Divider, Field, GoogleButton, PasswordField, passwordStrength } from "@/components/auth-shell";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — InterviewAI" },
      { name: "description", content: "Create your free InterviewAI account and start practicing." },
      { property: "og:title", content: "Create account — InterviewAI" },
      { property: "og:description", content: "Create your free InterviewAI account." },
    ],
  }),
  component: Signup,
});

function Signup() {
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "", role: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const strength = passwordStrength(f.password);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (f.name.trim().length < 2) errs.name = "Enter your full name";
    if (!/^\S+@\S+\.\S+$/.test(f.email)) errs.email = "Enter a valid email address";
    if (f.password.length < 8) errs.password = "Use at least 8 characters";
    else if (strength.score < 2) errs.password = "Add uppercase letters, numbers or symbols";
    if (f.confirm !== f.password) errs.confirm = "Passwords don't match";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: f.email,
      password: f.password,
      options: {
        emailRedirectTo: window.location.origin + "/auth",
        data: { full_name: f.name.trim(), target_role: f.role.trim() || null },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
  }

  if (sent)
    return (
      <AuthShell title="Check your email" subtitle={`We sent a confirmation link to ${f.email}.`}>
        <MailCheck className="mx-auto size-12 text-success" />
        <p className="mt-4 text-center text-sm text-muted-foreground">Click the link to activate your account, then sign in.</p>
        <Link to="/auth" className="btn-primary mt-6 w-full">Go to Sign In</Link>
      </AuthShell>
    );

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <AuthShell title="Create your account" subtitle="Start practicing with AI mock interviews.">
      <GoogleButton />
      <Divider />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Full name" autoComplete="name" value={f.name} onChange={set("name")} error={errors.name} />
        <Field label="Email" type="email" autoComplete="email" value={f.email} onChange={set("email")} error={errors.email} />
        <div>
          <PasswordField label="Password" autoComplete="new-password" value={f.password} onChange={set("password")} error={errors.password} />
          {f.password && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full ${i < strength.score ? "bg-brand" : "bg-muted"}`} />
                ))}
              </div>
              <span className="mt-1 block text-xs text-muted-foreground">{strength.label}</span>
            </div>
          )}
        </div>
        <PasswordField label="Confirm password" autoComplete="new-password" value={f.confirm} onChange={set("confirm")} error={errors.confirm} />
        <Field label="Target job role (optional)" placeholder="e.g. Frontend Developer" value={f.role} onChange={set("role")} />
        <button className="btn-primary w-full" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />} Create Account
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account? <Link to="/auth" className="text-cyan hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
