import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  ChevronDown,
  RotateCcw,
  Target,
  PlusCircle,
  BarChart3,
  LayoutDashboard,
  Sparkles,
  Loader2,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { getResults, regenerateFeedback } from "@/lib/interview.functions";
import type { Letter } from "@/lib/scoring";
import { formatDuration } from "@/lib/options";
import { ScoreRing } from "@/components/brand";
import { ErrorState, Loading, PageHeader, Panel, StatCard } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/results/$id")({
  head: () => ({
    meta: [
      { title: "Interview Results — InterviewAI" },
      { name: "description", content: "Your score, answer review and AI feedback." },
    ],
  }),
  component: Results,
});

function useCountUp(target: number) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1200);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

function Results() {
  const { id } = Route.useParams();
  const fn = useServerFn(getResults);
  const regen = useServerFn(regenerateFeedback);
  const q = useQuery({ queryKey: ["results", id], queryFn: () => fn({ data: { id } }) });
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [regenLoading, setRegenLoading] = useState(false);
  const score = Number(q.data?.session.score ?? 0);
  const animated = useCountUp(score);

  if (q.isLoading) return <Loading label="Loading results…" />;
  if (q.error || !q.data)
    return (
      <ErrorState
        message={q.error?.message ?? "Couldn't load results."}
        onRetry={() => q.refetch()}
      />
    );
  const { session: s, questions, feedback } = q.data;
  if (s.status !== "completed")
    return <ErrorState message="This interview hasn't been submitted yet." />;

  const wrongTopics = Array.from(
    new Set(questions.filter((x) => x.selected !== x.correct_option).map((x) => x.topic)),
  );
  const retrySearch = {
    role: s.role as string,
    level: s.experience_level as string,
    category: s.category as string,
    difficulty: s.difficulty as string,
    count: s.question_count,
  };

  return (
    <>
      <PageHeader
        title="Interview results"
        subtitle={`${s.role} · ${s.category} · ${String(s.difficulty)} · ${new Date(s.completed_at as string).toLocaleString()}`}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.618fr]">
        <Panel className="flex flex-col items-center text-center">
          <ScoreRing value={animated} size={180} label="objective accuracy" />
          <p className="mt-4 max-w-xs text-xs text-muted-foreground">
            Calculated deterministically from the stored answer key — not estimated by AI.
          </p>
        </Panel>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
          <StatCard
            label="Correct"
            value={<span className="text-success">{s.correct_count as number}</span>}
          />
          <StatCard
            label="Incorrect"
            value={<span className="text-destructive">{s.incorrect_count as number}</span>}
          />
          <StatCard label="Unanswered" value={s.unanswered_count as number} />
          <StatCard label="Total questions" value={s.question_count} />
          <StatCard label="Time taken" value={formatDuration(s.duration_seconds as number)} />
          <StatCard label="Status" value={<span className="text-base">Completed</span>} />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <a href="#review" className="btn-ghost">
          <ListChecks className="size-4" /> Review Answers
        </a>
        <Link to="/interview/new" search={retrySearch} className="btn-ghost">
          <RotateCcw className="size-4" /> Retry This Interview
        </Link>
        <Link
          to="/interview/new"
          search={{
            ...retrySearch,
            category: "Mixed Interview",
            topics: wrongTopics.slice(0, 6).join(","),
          }}
          disabled={!wrongTopics.length}
          className="btn-ghost"
        >
          <Target className="size-4" /> Practice Weak Areas
        </Link>
        <Link to="/interview/new" className="btn-ghost">
          <PlusCircle className="size-4" /> Start New Interview
        </Link>
        <Link to="/analytics" className="btn-ghost">
          <BarChart3 className="size-4" /> View Analytics
        </Link>
        <Link to="/dashboard" className="btn-primary">
          <LayoutDashboard className="size-4" /> Dashboard
        </Link>
      </div>

      <Panel className="mt-6">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-cyan" />
          <h2 className="font-semibold">Personalized AI feedback</h2>
        </div>
        {feedback ? (
          <div className="mt-4 space-y-5">
            <p className="text-muted-foreground">{feedback.summary}</p>
            <div className="grid gap-4 md:grid-cols-2">
              <FbList title="Strongest areas" items={feedback.strengths} tone="text-success" />
              <FbList title="Weakest areas" items={feedback.weaknesses} tone="text-destructive" />
              <FbList title="Recommendations" items={feedback.recommendations} tone="text-cyan" />
              <FbList
                title="Topics to revise"
                items={feedback.topics_to_revise}
                tone="text-violet"
              />
            </div>
            {feedback.next_plan && (
              <div className="glass rounded-xl p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Next practice plan
                </div>
                <p className="mt-1 text-sm">{feedback.next_plan}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">
              AI feedback isn't available for this session yet.
            </p>
            <button
              className="btn-primary mt-4"
              disabled={regenLoading}
              onClick={async () => {
                setRegenLoading(true);
                try {
                  await regen({ data: { id } });
                  await q.refetch();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Couldn't generate feedback");
                } finally {
                  setRegenLoading(false);
                }
              }}
            >
              {regenLoading && <Loader2 className="size-4 animate-spin" />} Generate feedback
            </button>
          </div>
        )}
      </Panel>

      <section id="review" className="mt-6 scroll-mt-6">
        <h2 className="mb-4 text-xl font-semibold">Question-by-question review</h2>
        <div className="space-y-3">
          {questions.map((x) => {
            const status = !x.selected
              ? "unanswered"
              : x.selected === x.correct_option
                ? "correct"
                : "wrong";
            const isOpen = open[x.id] ?? status !== "correct";
            return (
              <div key={x.id} className="glass rounded-2xl">
                <button
                  className="flex w-full items-start gap-3 p-5 text-left"
                  onClick={() => setOpen({ ...open, [x.id]: !isOpen })}
                  aria-expanded={isOpen}
                >
                  {status === "correct" ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
                  ) : status === "wrong" ? (
                    <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
                  ) : (
                    <MinusCircle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">
                      Q{x.position} · {x.topic} · <span className="capitalize">{x.difficulty}</span>
                    </div>
                    <div className="mt-1 font-medium">{x.question}</div>
                  </div>
                  <ChevronDown
                    className={`size-5 shrink-0 transition ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="space-y-3 border-t border-glass-border p-5 text-sm">
                    {x.code_snippet && (
                      <pre className="overflow-x-auto rounded-xl bg-background/60 p-3 font-mono text-xs">
                        {x.code_snippet}
                      </pre>
                    )}
                    <div className="grid gap-2">
                      {(["A", "B", "C", "D"] as Letter[]).map((L) => (
                        <div
                          key={L}
                          className={`rounded-xl border px-3 py-2 ${L === x.correct_option ? "border-success/50 bg-success/10" : L === x.selected ? "border-destructive/50 bg-destructive/10" : "border-glass-border"}`}
                        >
                          <b className="mr-2">{L}</b>
                          {x.options[L]}
                          {L === x.correct_option && (
                            <span className="ml-2 text-xs text-success">Correct</span>
                          )}
                          {L === x.selected && L !== x.correct_option && (
                            <span className="ml-2 text-xs text-destructive">Your answer</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <p>
                      <b>Explanation:</b>{" "}
                      <span className="text-muted-foreground">{x.explanation}</span>
                    </p>
                    {status === "wrong" &&
                      x.selected &&
                      x.distractor_explanations?.[x.selected] && (
                        <p>
                          <b>Why {x.selected} is incorrect:</b>{" "}
                          <span className="text-muted-foreground">
                            {x.distractor_explanations[x.selected]}
                          </span>
                        </p>
                      )}
                    {x.learning_objective && (
                      <p className="text-xs text-cyan">
                        Learning objective: {x.learning_objective}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function FbList({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className={`text-sm font-semibold ${tone}`}>{title}</div>
      {items.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">None identified.</p>
      )}
    </div>
  );
}
