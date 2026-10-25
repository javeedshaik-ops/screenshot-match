import { useState, type ReactNode, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Ambient, Logo } from "./brand";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Ambient />
      <div className="w-full max-w-md fade-up">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="glass-strong rounded-3xl p-8">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  error,
  ...props
}: { label: string; error?: string | undefined } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input className="field" aria-invalid={!!error} {...props} />
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

export function PasswordField({
  label,
  error,
  ...props
}: { label: string; error?: string | undefined } & InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <div className="relative">
        <input
          className="field pr-11"
          type={show ? "text" : "password"}
          aria-invalid={!!error}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

export function GoogleButton() {
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      disabled={loading}
      className="btn-ghost w-full"
      onClick={async () => {
        setLoading(true);
        const result = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: window.location.origin + "/auth",
        });
        if (result.error) {
          toast.error(result.error.message ?? "Google sign-in failed");
          setLoading(false);
        }
        if (result.redirected) return;
        setLoading(false);
      }}
    >
      <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M21.35 11.1H12v2.9h5.35c-.25 1.5-1.7 4.4-5.35 4.4-3.2 0-5.8-2.65-5.8-5.9s2.6-5.9 5.8-5.9c1.85 0 3.05.8 3.75 1.45l2.55-2.45C16.65 3.95 14.55 3 12 3 6.95 3 2.9 7.05 2.9 12.1S6.95 21.2 12 21.2c6.9 0 9.2-4.85 9.2-7.35 0-.5-.05-.85-.1-1.25z"
        />
      </svg>
      Continue with Google
    </button>
  );
}

export function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
      <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export function passwordStrength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return { score: s, label: ["Too weak", "Weak", "Fair", "Good", "Strong"][s] };
}
