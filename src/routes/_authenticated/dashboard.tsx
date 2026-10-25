import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Flame, Target, ListChecks, Trophy, ArrowRight, Sparkles } from "lucide-react";
import { profileQuery, sessionsQuery } from "@/lib/queries";
import { useAnalytics } from "@/lib/use-analytics";
import { practiceStreak } from "@/lib/scoring";
import { ScoreRing } from "@/components/brand";
import {
  Loading,
  PageHeader,
  Panel,
  StatCard,
  chartTooltip,
  ErrorState,
} from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — InterviewAI" },
      { name: "description", content: "Your interview readiness overview." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const profile = useQuery(profileQuery);
  const sessions = useQuery(sessionsQuery);
  const analytics = useAnalytics();

  if (sessions.isLoading || profile.isLoading) return <Loading />;
  if (sessions.error)
    return <ErrorState message="Couldn't load your sessions." onRetry={() => sessions.refetch()} />;

  const name = profile.data?.full_name?.split(" ")[0] || "there";
  const completed = (sessions.data ?? []).filter((s) => s.status === "completed");
  const inProgress = (sessions.data ?? []).filter((s) => s.status === "in_progress");

  if (completed.length === 0)
    return (
      <>
        <PageHeader
          title={
            <>
              Welcome, <span className="text-gradient">{name}</span>
            </>
          }
          subtitle="Let's get your first practice session on the board."
        />
        {inProgress[0] && <ResumeBanner id={inProgress[0].id} role={inProgress[0].role} />}
        <div className="glass-strong mx-auto mt-6 max-w-xl rounded-3xl p-12 text-center fade-up">
          <Sparkles className="mx-auto size-10 text-cyan" />
          <h2 className="mt-4 text-2xl font-semibold">No interviews yet</h2>
          <p className="mt-2 text-muted-foreground">
            Your stats, trends and recommendations will appear here after your first interview.
          </p>
          <Link to="/interview/new" className="btn-primary mt-8">
            Start Your First Interview <ArrowRight className="size-4" />
          </Link>
        </div>
      </>
    );

  const totalQ = completed.reduce((a, s) => a + s.question_count, 0);
  const totalCorrect = completed.reduce((a, s) => a + (s.correct_count ?? 0), 0);
  const accuracy = totalQ ? Math.round((totalCorrect / totalQ) * 100) : 0;
  const avgScore = Math.round(
    completed.reduce((a, s) => a + Number(s.score ?? 0), 0) / completed.length,
  );
  const recent5 = completed.slice(0, 5);
  const readiness = Math.round(
    recent5.reduce((a, s) => a + Number(s.score ?? 0), 0) / recent5.length,
  );
  const streak = practiceStreak(completed.map((s) => s.completed_at!));
  const trend = [...completed]
    .reverse()
    .slice(-12)
    .map((s) => ({
      date: new Date(s.completed_at!).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      score: Number(s.score),
    }));
  const topics = analytics.data?.topics ?? [];
  const weakest = topics.filter((t) => t.accuracy < 70).slice(0, 4);
  const strongest = [...topics]
    .filter((t) => t.accuracy >= 70)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 4);
  const last = completed[0]!;

  return (
    <>
      <PageHeader
        title={
          <>
            Welcome back, <span className="text-gradient">{name}</span>
          </>
        }
        subtitle="Here's how your preparation is going."
        action={
          <Link to="/interview/new" className="btn-primary">
            New Interview <ArrowRight className="size-4" />
          </Link>
        }
      />
      {inProgress[0] && <ResumeBanner id={inProgress[0].id} role={inProgress[0].role} />}
      <div className="grid gap-5 lg:grid-cols-[1fr_1.618fr]">
        <Panel className="flex flex-col items-center justify-center text-center">
          <ScoreRing value={readiness} size={170} label="readiness" />
          <p className="mt-4 text-xs text-muted-foreground">
            Average score of your last {recent5.length} interviews
          </p>
        </Panel>
        <div className="grid grid-cols-2 gap-5">
          <StatCard
            label="Interviews completed"
            value={completed.length}
            icon={<Trophy className="size-4" />}
          />
          <StatCard
            label="Questions answered"
            value={totalQ}
            icon={<ListChecks className="size-4" />}
          />
          <StatCard
            label="Average accuracy"
            value={`${accuracy}%`}
            hint={`Avg. score ${avgScore}%`}
            icon={<Target className="size-4" />}
          />
          <StatCard
            label="Practice streak"
            value={`${streak} day${streak === 1 ? "" : "s"}`}
            icon={<Flame className="size-4" />}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.618fr_1fr]">
        <Panel title="Performance trend">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--violet)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--violet)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip {...chartTooltip} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="var(--cyan)"
                  strokeWidth={2}
                  fill="url(#g1)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Recommended next session">
          {weakest[0] ? (
            <>
              <p className="text-sm text-muted-foreground">Your lowest-accuracy topic is</p>
              <p className="mt-1 text-xl font-semibold">{weakest[0].topic}</p>
              <p className="text-sm text-muted-foreground">
                {weakest[0].accuracy}% across {weakest[0].total} questions
              </p>
              <Link to="/practice" className="btn-primary mt-5 w-full">
                Practice My Weak Areas
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                You're doing well. Try a harder set for {last.role}.
              </p>
              <Link
                to="/interview/new"
                search={{ role: last.role }}
                className="btn-primary mt-5 w-full"
              >
                Level up
              </Link>
            </>
          )}
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Panel title="Strongest skills">
          <TopicList
            items={strongest}
            empty="Keep practicing to reveal your strengths."
            tone="success"
          />
        </Panel>
        <Panel title="Weakest skills">
          <TopicList items={weakest} empty="No weak topics detected yet." tone="destructive" />
        </Panel>
      </div>

      <Panel title="Recent sessions" className="mt-5">
        <SessionRows sessions={completed.slice(0, 5)} />
      </Panel>
    </>
  );
}

function ResumeBanner({ id, role }: { id: string; role: string }) {
  return (
    <div className="glass mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-warning/30 p-4">
      <span className="text-sm">
        You have an unfinished <b>{role}</b> interview.
      </span>
      <Link to="/interview/$id" params={{ id }} className="btn-ghost !py-2">
        Resume
      </Link>
    </div>
  );
}

function TopicList({
  items,
  empty,
  tone,
}: {
  items: { topic: string; accuracy: number }[];
  empty: string;
  tone: "success" | "destructive";
}) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-3">
      {items.map((t) => (
        <li key={t.topic}>
          <div className="flex justify-between text-sm">
            <span>{t.topic}</span>
            <span className="text-muted-foreground">{t.accuracy}%</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${tone === "success" ? "bg-success" : "bg-destructive"}`}
              style={{ width: `${t.accuracy}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SessionRows({
  sessions,
}: {
  sessions: {
    id: string;
    role: string;
    category: string;
    difficulty: string;
    score: number | null;
    completed_at: string | null;
    status: string;
    created_at: string;
  }[];
}) {
  if (!sessions.length) return <p className="text-sm text-muted-foreground">No sessions yet.</p>;
  return (
    <div className="divide-y divide-border">
      {sessions.map((s) => (
        <Link
          key={s.id}
          to={s.status === "completed" ? "/results/$id" : "/interview/$id"}
          params={{ id: s.id }}
          className="flex items-center justify-between gap-4 py-3 text-sm hover:text-cyan"
        >
          <div className="min-w-0">
            <div className="truncate font-medium">{s.role}</div>
            <div className="truncate text-xs text-muted-foreground">
              {s.category} · <span className="capitalize">{s.difficulty}</span> ·{" "}
              {new Date(s.completed_at ?? s.created_at).toLocaleString()}
            </div>
          </div>
          <span className="font-display text-lg font-semibold">
            {s.status === "completed" ? (
              `${Math.round(Number(s.score))}%`
            ) : (
              <span className="text-xs text-warning">In progress</span>
            )}
          </span>
        </Link>
      ))}
    </div>
  );
}
