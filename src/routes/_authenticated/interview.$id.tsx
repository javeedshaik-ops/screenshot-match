import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Flag, Loader2, LogOut, Save, Send, Timer, X, Check } from "lucide-react";
import { toast } from "sonner";
import { getInterview, saveAnswer, submitInterview } from "@/lib/interview.functions";
import type { Letter } from "@/lib/scoring";
import { ErrorState, Loading } from "@/components/ui-bits";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/interview/$id")({
  head: () => ({ meta: [{ title: "Interview in progress — InterviewAI" }, { name: "description", content: "Answer your AI-generated interview questions." }] }),
  component: Workspace,
});

const LETTERS: Letter[] = ["A", "B", "C", "D"];
type AState = { selected: Letter | null; flagged: boolean; saved: boolean };

function Workspace() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchFn = useServerFn(getInterview);
  const saveFn = useServerFn(saveAnswer);
  const submitFn = useServerFn(submitInterview);
  const q = useQuery({ queryKey: ["interview", id], queryFn: () => fetchFn({ data: { id } }), staleTime: Infinity, refetchOnWindowFocus: false });

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const submittedRef = useRef(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!q.data) return;
    if (q.data.session.status === "completed") {
      navigate({ to: "/results/$id", params: { id }, replace: true });
      return;
    }
    const init: Record<string, AState> = {};
    for (const a of q.data.answers) init[a.question_id] = { selected: a.selected_option, flagged: a.flagged, saved: true };
    setAnswers(init);
    const firstOpen = q.data.questions.findIndex((x) => !init[x.id]?.selected);
    setIdx(firstOpen === -1 ? 0 : firstOpen);
  }, [q.data, id, navigate]);

  // server clock offset so refresh doesn't reset/skew timer
  const offset = useMemo(() => (q.data ? new Date(q.data.serverNow).getTime() - Date.now() : 0), [q.data]);
  const session = q.data?.session;
  const totalSec = session?.timed && session.seconds_per_question ? session.seconds_per_question * session.question_count : null;
  const startedMs = session?.started_at ? new Date(session.started_at).getTime() : Date.now();
  const elapsed = Math.max(0, Math.floor((now + offset - startedMs) / 1000));
  const remaining = totalSec != null ? Math.max(0, totalSec - elapsed) : null;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const questions = q.data?.questions ?? [];
  const current = questions[idx];
  const answeredCount = questions.filter((x) => answers[x.id]?.selected).length;
  const unanswered = questions.length - answeredCount;

  const persist = useCallback(
    async (qid: string, st: AState) => {
      try {
        await saveFn({ data: { id, question_id: qid, selected_option: st.selected, flagged: st.flagged } });
        setAnswers((a) => ({ ...a, [qid]: { ...a[qid], saved: true } }));
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't save answer");
        return false;
      }
    },
    [id, saveFn],
  );

  const update = (patch: Partial<AState>) => {
    if (!current) return;
    const next = { selected: null, flagged: false, ...answers[current.id], ...patch, saved: false } as AState;
    setAnswers((a) => ({ ...a, [current.id]: next }));
    void persist(current.id, next);
  };

  const doSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setConfirmSubmit(false);
    try {
      // flush any unsaved
      await Promise.all(
        Object.entries(answers)
          .filter(([, s]) => !s.saved)
          .map(([qid, s]) => saveFn({ data: { id, question_id: qid, selected_option: s.selected, flagged: s.flagged } }).catch(() => null)),
      );
      await submitFn({ data: { id } });
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
      navigate({ to: "/results/$id", params: { id } });
    } catch (e) {
      submittedRef.current = false;
      setSubmitting(false);
      toast.error(e instanceof Error ? e.message : "Submission failed. Please retry.");
    }
  }, [answers, id, navigate, qc, saveFn, submitFn]);

  // auto-submit on timeout
  useEffect(() => {
    if (remaining === 0 && session?.status === "in_progress" && !submittedRef.current) {
      toast.info("Time's up — submitting your interview.");
      void doSubmit();
    }
  }, [remaining, session?.status, doSubmit]);

  // warn on leaving tab
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (!submittedRef.current && Object.values(answers).some((a) => !a.saved)) e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [answers]);

  // keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const k = e.key.toUpperCase();
      const li = ["A", "B", "C", "D"].indexOf(k);
      const ni = ["1", "2", "3", "4"].indexOf(k);
      if (li >= 0 || ni >= 0) update({ selected: LETTERS[li >= 0 ? li : ni] });
      if (e.key === "ArrowRight") setIdx((i) => Math.min(questions.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  if (q.isLoading) return <Loading label="Loading your interview…" />;
  if (q.error || !session) return <ErrorState message={q.error?.message ?? "Interview not found."} onRetry={() => q.refetch()} />;
  if (!current) return <ErrorState message="This interview has no questions." />;

  const st = answers[current.id];
  const pct = Math.round((answeredCount / questions.length) * 100);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const isLast = idx === questions.length - 1;

  return (
    <div className="fade-up">
      {/* Header */}
      <header className="glass-strong mb-6 rounded-2xl p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-display text-lg font-semibold">{session.role as string}</div>
            <div className="text-xs text-muted-foreground">
              {session.category as string} · <span className="capitalize">{session.difficulty as string}</span> · Question {idx + 1} of {questions.length}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`glass flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-sm ${remaining != null && remaining < 60 ? "text-destructive" : ""}`}>
              <Timer className="size-4" /> {remaining != null ? fmt(remaining) : fmt(elapsed)}
            </div>
            <button onClick={() => (unanswered > 0 ? setConfirmExit(true) : navigate({ to: "/dashboard" }))} className="btn-ghost !px-3 !py-2">
              <LogOut className="size-4" /> <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-brand transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.618fr_1fr]">
        {/* Question */}
        <section className="glass-strong rounded-3xl p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-violet/15 px-2.5 py-1 text-violet">Q{current.position}</span>
            <span className="rounded-full bg-cyan/10 px-2.5 py-1 text-cyan">{current.topic}</span>
            <span className="rounded-full bg-muted px-2.5 py-1 capitalize text-muted-foreground">{current.difficulty}</span>
            {st?.flagged && <span className="rounded-full bg-warning/15 px-2.5 py-1 text-warning">Flagged</span>}
          </div>
          <h2 className="mt-5 text-xl font-medium leading-relaxed md:text-2xl">{current.question}</h2>
          {current.code_snippet && (
            <pre className="mt-5 overflow-x-auto rounded-xl border border-glass-border bg-background/60 p-4 font-mono text-sm">
              <code>{current.code_snippet}</code>
            </pre>
          )}
          <div role="radiogroup" aria-label="Answer options" className="mt-7 space-y-3">
            {LETTERS.map((L) => {
              const selected = st?.selected === L;
              return (
                <button
                  key={L}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => update({ selected: L })}
                  className={`flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition ${
                    selected ? "border-violet bg-violet/15 shadow-[var(--shadow-glow)]" : "border-glass-border bg-glass hover:border-foreground/25 hover:bg-foreground/5"
                  }`}
                >
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg font-display text-sm font-semibold ${selected ? "bg-brand text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {selected ? <Check className="size-4" /> : L}
                  </span>
                  <span className="pt-1">{current.options[L]}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <button className="btn-ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
              <ArrowLeft className="size-4" /> Previous
            </button>
            <button className="btn-ghost" onClick={() => update({ selected: null })} disabled={!st?.selected}>
              <X className="size-4" /> Clear
            </button>
            <button className="btn-ghost" onClick={() => update({ flagged: !st?.flagged })}>
              <Flag className="size-4" /> {st?.flagged ? "Unflag" : "Flag"}
            </button>
            <button
              className="btn-ghost"
              onClick={async () => {
                if (st && (await persist(current.id, st))) toast.success("Answer saved");
                else if (!st) toast.info("Select an option first");
              }}
            >
              <Save className="size-4" /> Save
            </button>
            <div className="ml-auto">
              {isLast ? (
                <button className="btn-primary" onClick={() => setConfirmSubmit(true)} disabled={submitting}>
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Submit Interview
                </button>
              ) : (
                <button className="btn-primary" onClick={() => setIdx(idx + 1)}>
                  Next <ArrowRight className="size-4" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Navigator */}
        <aside className="glass h-fit rounded-3xl p-6">
          <h3 className="font-semibold">Question navigator</h3>
          <p className="mt-1 text-xs text-muted-foreground">{answeredCount} answered · {unanswered} remaining</p>
          <div className="mt-5 grid grid-cols-5 gap-2">
            {questions.map((x, i) => {
              const a = answers[x.id];
              return (
                <button
                  key={x.id}
                  onClick={() => setIdx(i)}
                  aria-label={`Question ${i + 1}${a?.selected ? ", answered" : ""}${a?.flagged ? ", flagged" : ""}`}
                  className={`relative aspect-square rounded-xl text-sm font-medium transition ${
                    i === idx ? "ring-2 ring-violet" : ""
                  } ${a?.selected ? "bg-brand text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-foreground/10"}`}
                >
                  {i + 1}
                  {a?.flagged && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-warning" />}
                </button>
              );
            })}
          </div>
          <div className="mt-5 space-y-1.5 text-xs text-muted-foreground">
            <Legend className="bg-brand" label="Answered" />
            <Legend className="bg-muted" label="Unanswered" />
            <Legend className="bg-warning" label="Flagged for review" dot />
          </div>
          <button className="btn-primary mt-6 w-full" onClick={() => setConfirmSubmit(true)} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Submit Interview
          </button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">Tip: press A–D or 1–4 to answer, ← → to move</p>
        </aside>
      </div>

      <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>Submit your interview?</AlertDialogTitle>
            <AlertDialogDescription>
              {unanswered > 0
                ? `You have ${unanswered} unanswered question${unanswered > 1 ? "s" : ""}. They'll be marked incorrect.`
                : "All questions answered. You can't change answers after submitting."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep reviewing</AlertDialogCancel>
            <AlertDialogAction onClick={doSubmit}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmExit} onOpenChange={setConfirmExit}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this interview?</AlertDialogTitle>
            <AlertDialogDescription>
              You have {unanswered} unanswered question{unanswered > 1 ? "s" : ""}. Your saved answers are kept and you can resume from the dashboard{session.timed ? ", but the timer keeps running" : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Link to="/dashboard">Leave</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {submitting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-md">
          <div className="text-center">
            <Loader2 className="mx-auto size-10 animate-spin text-violet" />
            <p className="mt-4 font-medium">Scoring your answers and preparing AI feedback…</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Legend({ className, label, dot }: { className: string; label: string; dot?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`${dot ? "size-2 rounded-full" : "size-3 rounded"} ${className}`} /> {label}
    </div>
  );
}
