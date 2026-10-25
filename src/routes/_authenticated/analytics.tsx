import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { useAnalytics } from "@/lib/use-analytics";
import { SessionRows } from "@/components/session-rows";
import { ErrorState, Loading, PageHeader, Panel, chartTooltip } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Performance Analytics — InterviewAI" },
      { name: "description", content: "Trends and topic insights from your interviews." },
    ],
  }),
  component: Analytics,
});

const RANGES = [
  { v: 7, l: "7 days" },
  { v: 30, l: "30 days" },
  { v: 90, l: "90 days" },
  { v: 0, l: "All time" },
];

function Analytics() {
  const q = useAnalytics();
  const [range, setRange] = useState(0);
  if (q.isLoading) return <Loading label="Crunching your numbers…" />;
  if (q.error) return <ErrorState message="Couldn't load analytics." onRetry={() => q.refetch()} />;
  const cutoff = range ? Date.now() - range * 86400_000 : 0;
  const sessions = (q.data?.sessions ?? []).filter(
    (s) => new Date(s.completed_at!).getTime() >= cutoff,
  );

  if (!q.data?.sessions.length)
    return (
      <>
        <PageHeader title="Performance analytics" />
        <ErrorState message="Complete an interview to unlock analytics." />
        <div className="mt-4 text-center">
          <Link to="/interview/new" className="btn-primary">
            Start an interview
          </Link>
        </div>
      </>
    );

  const overTime = sessions.map((s) => ({
    date: new Date(s.completed_at!).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    accuracy: Number(s.score),
  }));
  const byRole = Object.values(
    sessions.reduce<Record<string, { role: string; sum: number; n: number }>>((a, s) => {
      (a[s.role] ??= { role: s.role, sum: 0, n: 0 }).sum += Number(s.score);
      a[s.role]!.n++;
      return a;
    }, {}),
  ).map((r) => ({ role: r.role, score: Math.round(r.sum / r.n) }));
  const correct = sessions.reduce((a, s) => a + (s.correct_count ?? 0), 0);
  const incorrect = sessions.reduce((a, s) => a + (s.incorrect_count ?? 0), 0);
  const unanswered = sessions.reduce((a, s) => a + (s.unanswered_count ?? 0), 0);
  const pie = [
    { name: "Correct", value: correct, fill: "var(--success)" },
    { name: "Incorrect", value: incorrect, fill: "var(--destructive)" },
    { name: "Unanswered", value: unanswered, fill: "var(--muted-foreground)" },
  ];
  const topics = q.data.topics;
  const missed = [...topics]
    .sort((a, b) => b.missed - a.missed)
    .filter((t) => t.missed > 0)
    .slice(0, 6);

  return (
    <>
      <PageHeader
        title="Performance analytics"
        subtitle="Calculated from your completed interviews."
        action={
          <div className="flex gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r.v}
                onClick={() => setRange(r.v)}
                className={`rounded-full px-3 py-1.5 text-xs ${range === r.v ? "bg-brand text-primary-foreground" : "glass text-muted-foreground"}`}
              >
                {r.l}
              </button>
            ))}
          </div>
        }
      />
      {!sessions.length ? (
        <ErrorState message="No interviews in this date range." />
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-[1.618fr_1fr]">
            <Panel title="Accuracy over time">
              <div className="h-64">
                <ResponsiveContainer>
                  <LineChart data={overTime}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip {...chartTooltip} />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      stroke="var(--cyan)"
                      strokeWidth={2.5}
                      dot={{ fill: "var(--violet)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Correct vs incorrect">
              <div className="h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {pie.map((p) => (
                        <Cell key={p.name} fill={p.fill} />
                      ))}
                    </Pie>
                    <Tooltip {...chartTooltip} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Panel title="Scores by role">
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={byRole}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="role" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip {...chartTooltip} cursor={{ fill: "var(--muted)" }} />
                    <Bar dataKey="score" fill="var(--violet)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Performance by difficulty (all time)">
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={q.data.difficulty}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="difficulty" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip {...chartTooltip} cursor={{ fill: "var(--muted)" }} />
                    <Bar dataKey="accuracy" fill="var(--cyan)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1.618fr_1fr]">
            <Panel title="Topic-wise accuracy (all time)">
              <div className="space-y-3">
                {topics.map((t) => (
                  <div key={t.topic}>
                    <div className="flex justify-between text-sm">
                      <span>{t.topic}</span>
                      <span className="text-muted-foreground">
                        {t.accuracy}% · {t.total}q ·{" "}
                        <span
                          className={
                            t.trend === "improving"
                              ? "text-success"
                              : t.trend === "declining"
                                ? "text-destructive"
                                : ""
                          }
                        >
                          {t.trend}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${t.accuracy}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Most frequently missed">
              {missed.length ? (
                <ul className="space-y-2 text-sm">
                  {missed.map((t) => (
                    <li key={t.topic} className="flex justify-between">
                      <span>{t.topic}</span>
                      <span className="text-destructive">{t.missed} missed</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No missed topics. Impressive!</p>
              )}
            </Panel>
          </div>
          <Panel title="Recent interviews" className="mt-5">
            <SessionRows sessions={[...sessions].reverse().slice(0, 8)} />
          </Panel>
        </>
      )}
    </>
  );
}
