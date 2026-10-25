import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useAnalytics } from "@/lib/use-analytics";
import { profileQuery } from "@/lib/queries";
import { DIFFICULTIES, ROLES } from "@/lib/options";
import { ErrorState, Loading, PageHeader, Panel } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/practice")({
  head: () => ({ meta: [{ title: "Learning Recommendations — InterviewAI" }, { name: "description", content: "Practice the topics you miss most." }] }),
  component: Practice,
});

function Practice() {
  const q = useAnalytics();
  const profile = useQuery(profileQuery);
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>([]);
  const [role, setRole] = useState("");
  const [difficulty, setDifficulty] = useState("medium");

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState message="Couldn't load your performance data." onRetry={() => q.refetch()} />;
  const weak = (q.data?.topics ?? []).filter((t) => t.missed > 0 && t.accuracy < 80);
  const lastRole = q.data?.sessions.at(-1)?.role;
  const effectiveRole = role || profile.data?.target_role || lastRole || "Software Engineer";

  const toggle = (t: string) => setSelected((s) => (s.includes(t) ? s.filter((x) => x !== t) : s.length < 8 ? [...s, t] : s));
  const topicsToUse = selected.length ? selected : weak.slice(0, 5).map((t) => t.topic);

  return (
    <>
      <PageHeader title="Learning recommendations" subtitle="Targeted practice based on the questions you've missed." />
      {!weak.length ? (
        <div className="glass-strong rounded-3xl p-10 text-center">
          <Target className="mx-auto size-10 text-cyan" />
          <p className="mt-4 text-muted-foreground">
            {q.data?.sessions.length ? "No weak topics detected — keep challenging yourself with harder sets." : "Complete an interview first so we can find your weak areas."}
          </p>
          <Link to="/interview/new" className="btn-primary mt-6">Start an interview</Link>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.618fr_1fr]">
          <Panel title="Your weak topics">
            <p className="mb-4 text-xs text-muted-foreground">Select up to 8 topics (defaults to your 5 weakest).</p>
            <div className="space-y-2">
              {weak.map((t) => {
                const on = selected.includes(t.topic);
                return (
                  <button key={t.topic} onClick={() => toggle(t.topic)} aria-pressed={on} className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${on ? "border-violet bg-violet/15" : "border-glass-border hover:border-foreground/20"}`}>
                    <span className="font-medium">{t.topic}</span>
                    <span className="flex items-center gap-3 text-xs text-muted-foreground">
                      {t.accuracy}% · {t.missed} missed
                      {t.trend === "improving" ? <TrendingUp className="size-4 text-success" /> : t.trend === "declining" ? <TrendingDown className="size-4 text-destructive" /> : <Minus className="size-4" />}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">"Improving" appears only when your later answers on a topic are measurably better than earlier ones (4+ questions).</p>
          </Panel>
          <Panel title="Practice settings" className="h-fit">
            <label className="block text-sm">
              Role
              <select className="field mt-1.5" value={role || effectiveRole} onChange={(e) => setRole(e.target.value)}>
                {Array.from(new Set([effectiveRole, ...ROLES])).map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label className="mt-4 block text-sm">
              Difficulty
              <select className="field mt-1.5" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </label>
            <button
              className="btn-primary mt-6 w-full"
              onClick={() =>
                navigate({
                  to: "/interview/new",
                  search: { role: effectiveRole, difficulty, category: "Mixed Interview", count: 10, topics: topicsToUse.join(",") },
                })
              }
            >
              <Target className="size-4" /> Practice My Weak Areas
            </button>
          </Panel>
        </div>
      )}
    </>
  );
}
