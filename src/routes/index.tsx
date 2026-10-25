import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Brain,
  ListChecks,
  Zap,
  MessageSquareText,
  BarChart3,
  Target,
  Briefcase,
  History,
  ArrowRight,
  UserPlus,
  SlidersHorizontal,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { Ambient, Logo, ScoreRing } from "@/components/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InterviewAI — Your Personal AI Interview Coach" },
      {
        name: "description",
        content:
          "AI-powered mock interviews with four-option questions, instant scoring, and personalized feedback.",
      },
      { property: "og:title", content: "InterviewAI — Your Personal AI Interview Coach" },
      {
        property: "og:description",
        content: "Turn interview anxiety into confidence with AI mock interviews.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Brain,
    title: "AI-Powered Questions",
    text: "Fresh questions tailored to your role, level and category.",
  },
  {
    icon: ListChecks,
    title: "Four-Option Practice",
    text: "Clean A–D multiple choice with one defensible answer.",
  },
  {
    icon: Zap,
    title: "Instant Evaluation",
    text: "Deterministic server-side scoring against a trusted key.",
  },
  {
    icon: MessageSquareText,
    title: "Personalized Feedback",
    text: "A coaching review grounded in your actual answers.",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    text: "Accuracy trends, topic breakdowns and difficulty insights.",
  },
  {
    icon: Target,
    title: "Weak-Area Detection",
    text: "Spot recurring gaps and drill them with targeted sets.",
  },
  {
    icon: Briefcase,
    title: "Role-Specific Prep",
    text: "Frontend to DevOps, HR to aptitude — or any custom role.",
  },
  {
    icon: History,
    title: "History & Progress",
    text: "Every session saved so you can review and retry anytime.",
  },
];

const STEPS = [
  { icon: UserPlus, title: "Create an account", text: "Sign up in seconds with email or Google." },
  {
    icon: SlidersHorizontal,
    title: "Choose role & difficulty",
    text: "Configure category, level and length.",
  },
  { icon: ListChecks, title: "Answer AI questions", text: "Navigate, flag and save as you go." },
  {
    icon: TrendingUp,
    title: "Review & improve",
    text: "Score, explanations and a next-step plan.",
  },
];

function Landing() {
  return (
    <div className="relative min-h-screen">
      <Ambient />
      <header className="sticky top-0 z-30 border-b border-glass-border bg-background/40 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#home" className="hover:text-foreground">
              Home
            </a>
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#how" className="hover:text-foreground">
              How It Works
            </a>
            <Link to="/interview/new" className="hover:text-foreground">
              Practice Interviews
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="btn-ghost !px-4 !py-2">
              Sign In
            </Link>
            <Link to="/signup" className="btn-primary !px-4 !py-2">
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero: 1.618 : 1 split */}
      <section
        id="home"
        className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-24 pt-20 lg:grid-cols-[1.618fr_1fr]"
      >
        <div className="fade-up">
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-cyan" /> AI interview coach for students & job
            seekers
          </span>
          <h1 className="mt-6 text-5xl font-semibold leading-[1.05] md:text-7xl">
            Your Next Interview <span className="text-gradient">Starts Here.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Practice smarter with AI-powered mock interviews, instant feedback, and personalized
            insights that help you turn interview anxiety into confidence.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/interview/new" className="btn-primary !px-6 !py-3.5">
              Start Practicing <ArrowRight className="size-4" />
            </Link>
            <a href="#features" className="btn-ghost !px-6 !py-3.5">
              Explore Features
            </a>
          </div>
        </div>

        <div className="fade-up [animation-delay:.15s]" aria-label="Sample dashboard preview">
          <div className="glass-strong relative rounded-3xl p-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Sample preview</span>
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-success">Readiness</span>
            </div>
            <div className="mt-4 flex items-center gap-6">
              <ScoreRing value={78} size={120} label="ready" />
              <div className="space-y-3 text-sm">
                <Stat label="Questions completed" value="142" />
                <Stat label="Average accuracy" value="74%" />
              </div>
            </div>
            <div className="mt-5 flex h-14 items-end gap-1.5">
              {[40, 55, 48, 62, 58, 70, 66, 78].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-md bg-brand opacity-80"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="glass mt-5 rounded-2xl p-4">
              <div className="text-xs text-cyan">Q4 · React Hooks · Medium</div>
              <p className="mt-1.5 text-sm">
                Which hook memoizes a computed value between renders?
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {["useState", "useMemo", "useRef", "useEffect"].map((o, i) => (
                  <div
                    key={o}
                    className={`rounded-lg border px-2.5 py-2 ${i === 1 ? "border-violet bg-violet/15" : "border-glass-border"}`}
                  >
                    <b className="mr-1.5 text-muted-foreground">{"ABCD"[i]}</b>
                    {o}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="text-center text-4xl font-semibold md:text-5xl">
          Everything you need to <span className="text-gradient">prepare</span>
        </h2>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass glass-hover rounded-2xl p-6">
              <span className="grid size-11 place-items-center rounded-xl bg-violet/15 text-violet">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-5 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="text-center text-4xl font-semibold md:text-5xl">How it works</h2>
        <div className="mt-14 grid gap-5 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <s.icon className="size-5 text-cyan" />
                <span className="font-display text-3xl font-semibold text-muted-foreground/40">
                  0{i + 1}
                </span>
              </div>
              <h3 className="mt-6 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
        <div className="glass-strong mt-16 rounded-3xl p-10 text-center md:p-16">
          <CheckCircle2 className="mx-auto size-10 text-success" />
          <h3 className="mt-4 text-3xl font-semibold">Ready to walk in confident?</h3>
          <p className="mt-3 text-muted-foreground">
            Your first AI mock interview takes under a minute to set up.
          </p>
          <Link to="/signup" className="btn-primary mt-8 !px-7 !py-3.5">
            Create your free account <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
      <footer className="border-t border-glass-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} InterviewAI · A college mini project
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-xl font-semibold">{value}</div>
    </div>
  );
}
