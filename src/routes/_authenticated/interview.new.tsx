import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, Timer, Infinity as InfinityIcon } from "lucide-react";
import { toast } from "sonner";
import { createInterview, type InterviewConfig } from "@/lib/interview.functions";
import { CATEGORIES, DIFFICULTIES, LENGTHS, LEVELS, ROLES } from "@/lib/options";
import { profileQuery } from "@/lib/queries";
import { PageHeader } from "@/components/ui-bits";

const searchSchema = z.object({
  role: z.string().optional(),
  level: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.string().optional(),
  count: z.coerce.number().optional(),
  topics: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/interview/new")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "New Interview — InterviewAI" }, { name: "description", content: "Configure your AI mock interview." }] }),
  component: Setup,
});

const STEPS = ["Role", "Experience", "Category", "Difficulty", "Length", "Start"];

function Setup() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const profile = useQuery(profileQuery);
  const create = useServerFn(createInterview);
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const focusTopics = search.topics ? search.topics.split(",").filter(Boolean).slice(0, 8) : [];

  const [cfg, setCfg] = useState({
    role: search.role ?? "",
    custom: "",
    experience_level: (search.level as InterviewConfig["experience_level"]) ?? "beginner",
    category: search.category ?? (focusTopics.length ? "Mixed Interview" : ""),
    difficulty: (search.difficulty as InterviewConfig["difficulty"]) ?? "medium",
    question_count: ([5, 10, 15, 20].includes(search.count ?? 0) ? search.count : 10) as InterviewConfig["question_count"],
    timed: false,
    seconds_per_question: 60,
  });

  // Apply profile defaults once loaded (only when not overridden by URL)
  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    setCfg((c) => ({
      ...c,
      role: c.role || (p.target_role && ROLES.includes(p.target_role) ? p.target_role : c.role),
      custom: !c.role && p.target_role && !ROLES.includes(p.target_role) ? p.target_role : c.custom,
      experience_level: (search.level as never) ?? (p.experience_level as never) ?? c.experience_level,
      difficulty: (search.difficulty as never) ?? (p.preferred_difficulty as never) ?? c.difficulty,
      question_count: search.count ? c.question_count : ((p.default_length as never) ?? c.question_count),
      timed: p.timed_mode ?? c.timed,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.data]);

  // Pre-fill custom role when URL role isn't a preset
  useEffect(() => {
    if (search.role && !ROLES.includes(search.role)) setCfg((c) => ({ ...c, role: "__custom", custom: search.role! }));
  }, [search.role]);

  const role = cfg.role === "__custom" ? cfg.custom.trim() : cfg.role;
  const valid = [role.length >= 2, true, !!cfg.category, true, true, true];

  async function start() {
    setCreating(true);
    setError(null);
    try {
      const res = await create({
        data: {
          role,
          experience_level: cfg.experience_level,
          category: cfg.category,
          difficulty: cfg.difficulty,
          question_count: cfg.question_count,
          timed: cfg.timed,
          seconds_per_question: cfg.timed ? cfg.seconds_per_question : null,
          focus_topics: focusTopics.length ? focusTopics : undefined,
        },
      });
      navigate({ to: "/interview/$id", params: { id: res.id } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn't generate questions.";
      setError(msg);
      toast.error(msg);
      setCreating(false);
    }
  }

  return (
    <>
      <PageHeader title="Set up your interview" subtitle={focusTopics.length ? `Focused practice on: ${focusTopics.join(", ")}` : "Tailor the questions to your goal."} />
      <ol className="mb-8 flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              onClick={() => i <= step || valid.slice(0, i).every(Boolean) ? setStep(i) : undefined}
              className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                i === step ? "bg-brand text-primary-foreground" : i < step ? "glass text-foreground" : "glass text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="size-3.5" /> : <span>{i + 1}</span>} {s}
            </button>
          </li>
        ))}
      </ol>

      <div className="glass-strong rounded-3xl p-6 md:p-8 fade-up" key={step}>
        {step === 0 && (
          <>
            <h2 className="text-xl font-semibold">Select a job role</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ROLES.map((r) => (
                <Choice key={r} active={cfg.role === r} onClick={() => setCfg({ ...cfg, role: r })}>{r}</Choice>
              ))}
              <Choice active={cfg.role === "__custom"} onClick={() => setCfg({ ...cfg, role: "__custom" })}>Custom Job Role</Choice>
            </div>
            {cfg.role === "__custom" && (
              <input
                autoFocus
                className="field mt-4"
                placeholder="e.g. iOS Developer, Product Analyst…"
                maxLength={80}
                value={cfg.custom}
                onChange={(e) => setCfg({ ...cfg, custom: e.target.value })}
              />
            )}
          </>
        )}
        {step === 1 && (
          <>
            <h2 className="text-xl font-semibold">Experience level</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {LEVELS.map((l) => (
                <Choice key={l.value} active={cfg.experience_level === l.value} onClick={() => setCfg({ ...cfg, experience_level: l.value })}>{l.label}</Choice>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="text-xl font-semibold">Interview category</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CATEGORIES.map((c) => (
                <Choice key={c} active={cfg.category === c} onClick={() => setCfg({ ...cfg, category: c })}>{c}</Choice>
              ))}
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h2 className="text-xl font-semibold">Difficulty</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {DIFFICULTIES.map((d) => (
                <Choice key={d.value} active={cfg.difficulty === d.value} onClick={() => setCfg({ ...cfg, difficulty: d.value })}>{d.label}</Choice>
              ))}
            </div>
          </>
        )}
        {step === 4 && (
          <>
            <h2 className="text-xl font-semibold">Interview length & timing</h2>
            <div className="mt-5 grid grid-cols-4 gap-3">
              {LENGTHS.map((n) => (
                <Choice key={n} active={cfg.question_count === n} onClick={() => setCfg({ ...cfg, question_count: n })}>{n} questions</Choice>
              ))}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Choice active={!cfg.timed} onClick={() => setCfg({ ...cfg, timed: false })}>
                <InfinityIcon className="mr-2 inline size-4" /> Practice mode — no timer
              </Choice>
              <Choice active={cfg.timed} onClick={() => setCfg({ ...cfg, timed: true })}>
                <Timer className="mr-2 inline size-4" /> Timed mode
              </Choice>
            </div>
            {cfg.timed && (
              <label className="mt-5 block">
                <span className="text-sm text-muted-foreground">Seconds per question: <b className="text-foreground">{cfg.seconds_per_question}s</b> (total {Math.round((cfg.seconds_per_question * cfg.question_count) / 60)} min)</span>
                <input
                  type="range"
                  min={30}
                  max={180}
                  step={15}
                  value={cfg.seconds_per_question}
                  onChange={(e) => setCfg({ ...cfg, seconds_per_question: Number(e.target.value) })}
                  className="mt-2 w-full accent-[var(--violet)]"
                />
              </label>
            )}
          </>
        )}
        {step === 5 && (
          <>
            <h2 className="text-xl font-semibold">Ready to begin</h2>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Role", role],
                ["Experience", LEVELS.find((l) => l.value === cfg.experience_level)?.label],
                ["Category", cfg.category],
                ["Difficulty", DIFFICULTIES.find((d) => d.value === cfg.difficulty)?.label],
                ["Questions", cfg.question_count],
                ["Timer", cfg.timed ? `${cfg.seconds_per_question}s / question` : "Untimed practice"],
              ].map(([k, v]) => (
                <div key={k as string} className="glass rounded-xl px-4 py-3">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
            <button onClick={start} disabled={creating} className="btn-primary mt-8 w-full !py-4 text-base">
              {creating ? (
                <><Loader2 className="size-5 animate-spin" /> Generating your questions… this can take up to a minute</>
              ) : (
                <><Sparkles className="size-5" /> {error ? "Retry" : "Start Interview"}</>
              )}
            </button>
          </>
        )}

        {step < 5 && (
          <div className="mt-8 flex justify-between">
            <button className="btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
              <ArrowLeft className="size-4" /> Back
            </button>
            <button className="btn-primary" disabled={!valid[step]} onClick={() => setStep(step + 1)}>
              Continue <ArrowRight className="size-4" />
            </button>
          </div>
        )}
        {step === 5 && !creating && (
          <button className="btn-ghost mt-3 w-full" onClick={() => setStep(4)}><ArrowLeft className="size-4" /> Back</button>
        )}
      </div>
    </>
  );
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition ${
        active ? "border-violet bg-violet/15 shadow-[var(--shadow-glow)]" : "border-glass-border bg-glass hover:border-foreground/20"
      }`}
    >
      {children}
    </button>
  );
}
