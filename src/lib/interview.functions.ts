import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { scoreInterview, type Letter } from "./scoring";
import type { Database, Tables } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const LETTERS = ["A", "B", "C", "D"] as const;

const configSchema = z.object({
  role: z.string().trim().min(2).max(80),
  experience_level: z.enum(["beginner", "intermediate", "advanced"]),
  category: z.string().trim().min(2).max(80),
  difficulty: z.enum(["easy", "medium", "hard", "adaptive"]),
  question_count: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20)]),
  timed: z.boolean(),
  seconds_per_question: z.number().int().min(30).max(300).nullable(),
  focus_topics: z.array(z.string().trim().max(60)).max(8).optional(),
});
export type InterviewConfig = z.infer<typeof configSchema>;

const aiQuestionSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      option_a: z.string(),
      option_b: z.string(),
      option_c: z.string(),
      option_d: z.string(),
      correct_option: z.enum(LETTERS),
      explanation: z.string(),
      why_a_wrong: z.string(),
      why_b_wrong: z.string(),
      why_c_wrong: z.string(),
      why_d_wrong: z.string(),
      topic: z.string(),
      difficulty: z.enum(["easy", "medium", "hard"]),
      code_snippet: z.string().nullable(),
      learning_objective: z.string(),
    }),
  ),
});

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function generateQuestions(cfg: InterviewConfig, count: number) {
  const { generateStructured } = await import("./ai.server");
  const out = await generateStructured({
    schema: aiQuestionSchema,
    instructions:
      "You are an expert technical interviewer who writes high-quality multiple-choice interview questions. Every question has exactly four plausible options and exactly ONE unambiguously correct answer. Be factually accurate. Avoid trick questions, 'all of the above', and duplicates. Vary which letter is correct. For the why_X_wrong field of the correct letter, write an empty string. Use code_snippet only when it genuinely helps, otherwise null.",
    prompt: `Write ${count} interview questions.
Job role: ${cfg.role}
Experience level: ${cfg.experience_level}
Category: ${cfg.category}
Difficulty: ${cfg.difficulty === "adaptive" ? "progress from easy to hard across the set" : cfg.difficulty}
${cfg.focus_topics?.length ? `Focus specifically on these weak topics: ${cfg.focus_topics.join(", ")}` : ""}
Keep explanations concise (1-3 sentences). Topic should be a short skill tag like "SQL Joins" or "React Hooks".`,
  });
  // Validate and dedupe
  const seen = new Set<string>();
  return out.questions
    .filter((q) => {
      const key = q.question.trim().toLowerCase();
      const opts = [q.option_a, q.option_b, q.option_c, q.option_d].map((o) =>
        o.trim().toLowerCase(),
      );
      if (!key || seen.has(key) || opts.some((o) => !o) || new Set(opts).size !== 4) return false;
      seen.add(key);
      return true;
    })
    .slice(0, count);
}

export const createInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: InterviewConfig) => configSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await admin();
    // Rate limit: 15 interviews per hour per user
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await db
      .from("interview_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .gte("created_at", since);
    if ((count ?? 0) >= 15)
      throw new Error("You've started many interviews this hour. Please wait a bit and try again.");

    let questions = await generateQuestions(data, data.question_count);
    if (questions.length < data.question_count) {
      const more = await generateQuestions(data, data.question_count - questions.length + 2);
      const seen = new Set(questions.map((q) => q.question.toLowerCase()));
      questions = [...questions, ...more.filter((q) => !seen.has(q.question.toLowerCase()))].slice(
        0,
        data.question_count,
      );
    }
    if (questions.length < data.question_count)
      throw new Error("Couldn't generate enough valid questions. Please retry.");

    const { data: session, error } = await db
      .from("interview_sessions")
      .insert({
        user_id: context.userId,
        role: data.role,
        experience_level: data.experience_level,
        category: data.category,
        difficulty: data.difficulty,
        question_count: data.question_count,
        timed: data.timed,
        seconds_per_question: data.timed ? data.seconds_per_question : null,
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !session) throw new Error("Couldn't create the interview session.");

    const { error: qErr } = await db.from("interview_questions").insert(
      questions.map((q, i) => ({
        session_id: session.id,
        position: i + 1,
        question: q.question,
        options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
        correct_option: q.correct_option,
        explanation: q.explanation,
        distractor_explanations: {
          A: q.why_a_wrong,
          B: q.why_b_wrong,
          C: q.why_c_wrong,
          D: q.why_d_wrong,
        },
        topic: q.topic,
        difficulty: q.difficulty,
        code_snippet: q.code_snippet,
        learning_objective: q.learning_objective,
      })),
    );
    if (qErr) {
      await db.from("interview_sessions").delete().eq("id", session.id);
      throw new Error("Couldn't save generated questions.");
    }
    return { id: session.id };
  });

async function ownedSession(context: { supabase: SupabaseClient<Database> }, id: string) {
  const { data, error } = await context.supabase
    .from("interview_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) throw new Error("Interview not found.");
  return data as Tables<"interview_sessions">;
}

const idSchema = z.object({ id: z.string().uuid() });

/** Returns questions WITHOUT answer keys while in progress. */
export const getInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => idSchema.parse(i))
  .handler(async ({ data, context }) => {
    const session = await ownedSession(context, data.id);
    const db = await admin();
    const { data: qs } = await db
      .from("interview_questions")
      .select("id, position, question, options, topic, difficulty, code_snippet")
      .eq("session_id", data.id)
      .order("position");
    const { data: ans } = await db
      .from("user_answers")
      .select("question_id, selected_option, flagged")
      .eq("session_id", data.id);
    return {
      session,
      questions: (qs ?? []).map((q) => ({ ...q, options: q.options as Record<Letter, string> })),
      answers: (ans ?? []) as {
        question_id: string;
        selected_option: Letter | null;
        flagged: boolean;
      }[],
      serverNow: new Date().toISOString(),
    };
  });

export const saveAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: { id: string; question_id: string; selected_option: Letter | null; flagged: boolean }) =>
      z
        .object({
          id: z.string().uuid(),
          question_id: z.string().uuid(),
          selected_option: z.enum(LETTERS).nullable(),
          flagged: z.boolean(),
        })
        .parse(i),
  )
  .handler(async ({ data, context }) => {
    const session = await ownedSession(context, data.id);
    if (session.status !== "in_progress")
      throw new Error("This interview has already been submitted.");
    const db = await admin();
    const { data: q } = await db
      .from("interview_questions")
      .select("id")
      .eq("id", data.question_id)
      .eq("session_id", data.id)
      .maybeSingle();
    if (!q) throw new Error("Invalid question.");
    const { error } = await db.from("user_answers").upsert(
      {
        session_id: data.id,
        question_id: data.question_id,
        user_id: context.userId,
        selected_option: data.selected_option,
        flagged: data.flagged,
        answered_at: new Date().toISOString(),
      },
      { onConflict: "question_id" },
    );
    if (error) throw new Error("Couldn't save your answer.");
    return { ok: true };
  });

const feedbackSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendations: z.array(z.string()),
  topics_to_revise: z.array(z.string()),
  next_plan: z.string(),
});

async function buildFeedback(sessionId: string, userId: string) {
  const db = await admin();
  const { data: s } = await db.from("interview_sessions").select("*").eq("id", sessionId).single();
  const { data: qs } = await db
    .from("interview_questions")
    .select("id, question, topic, correct_option, options")
    .eq("session_id", sessionId)
    .order("position");
  const { data: ans } = await db
    .from("user_answers")
    .select("question_id, selected_option")
    .eq("session_id", sessionId);
  const amap = new Map((ans ?? []).map((a) => [a.question_id, a.selected_option]));
  const lines = (qs ?? []).map((q, i) => {
    const sel = amap.get(q.id);
    const status = !sel
      ? "UNANSWERED"
      : sel === q.correct_option
        ? "CORRECT"
        : `WRONG (chose ${sel})`;
    return `${i + 1}. [${q.topic}] ${status} — ${q.question.slice(0, 160)}`;
  });
  const { generateStructured } = await import("./ai.server");
  const fb = await generateStructured({
    schema: feedbackSchema,
    instructions:
      "You are a supportive interview coach. Base every statement strictly on the provided results. Do not invent skills or data. Lists: 2-5 short items each. If there are no strengths or weaknesses, return an empty list.",
    prompt: `Role: ${s!.role}; Level: ${s!.experience_level}; Category: ${s!.category}; Difficulty: ${s!.difficulty}
Score: ${s!.score}% (${s!.correct_count} correct, ${s!.incorrect_count} wrong, ${s!.unanswered_count} unanswered)
Results:
${lines.join("\n")}`,
  });
  await db.from("ai_feedback").upsert(
    {
      session_id: sessionId,
      user_id: userId,
      summary: fb.summary,
      strengths: fb.strengths.slice(0, 6),
      weaknesses: fb.weaknesses.slice(0, 6),
      recommendations: fb.recommendations.slice(0, 6),
      topics_to_revise: fb.topics_to_revise.slice(0, 8),
      next_plan: fb.next_plan,
    },
    { onConflict: "session_id" },
  );
}

export const submitInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => idSchema.parse(i))
  .handler(async ({ data, context }) => {
    const session = await ownedSession(context, data.id);
    if (session.status === "completed") return { id: data.id, alreadySubmitted: true };
    const db = await admin();
    const { data: qs } = await db
      .from("interview_questions")
      .select("id, correct_option")
      .eq("session_id", data.id);
    const { data: ans } = await db
      .from("user_answers")
      .select("id, question_id, selected_option")
      .eq("session_id", data.id);
    const answers: Record<string, Letter | null> = {};
    for (const a of ans ?? []) answers[a.question_id] = a.selected_option as Letter | null;
    const r = scoreInterview((qs ?? []) as { id: string; correct_option: Letter }[], answers);
    const now = new Date();
    const duration = session.started_at
      ? Math.round((now.getTime() - new Date(session.started_at).getTime()) / 1000)
      : null;
    // Conditional update prevents duplicate scoring
    const { data: upd } = await db
      .from("interview_sessions")
      .update({
        status: "completed",
        completed_at: now.toISOString(),
        score: r.score,
        correct_count: r.correct,
        incorrect_count: r.incorrect,
        unanswered_count: r.unanswered,
        duration_seconds: duration,
      })
      .eq("id", data.id)
      .eq("status", "in_progress")
      .select("id");
    if (!upd?.length) return { id: data.id, alreadySubmitted: true };
    for (const a of ans ?? []) {
      await db
        .from("user_answers")
        .update({ is_correct: r.perQuestion[a.question_id] ?? null })
        .eq("id", a.id);
    }
    try {
      await buildFeedback(data.id, context.userId);
    } catch (e) {
      console.error("feedback failed", e);
    }
    return { id: data.id, alreadySubmitted: false };
  });

export const regenerateFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => idSchema.parse(i))
  .handler(async ({ data, context }) => {
    const session = await ownedSession(context, data.id);
    if (session.status !== "completed") throw new Error("Submit the interview first.");
    await buildFeedback(data.id, context.userId);
    return { ok: true };
  });

/** Results with full answer keys — only after completion. */
export const getResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => idSchema.parse(i))
  .handler(async ({ data, context }) => {
    const session = await ownedSession(context, data.id);
    if (session.status !== "completed") return { session, questions: [], feedback: null };
    const db = await admin();
    const { data: qs } = await db
      .from("interview_questions")
      .select("*")
      .eq("session_id", data.id)
      .order("position");
    const { data: ans } = await db
      .from("user_answers")
      .select("question_id, selected_option")
      .eq("session_id", data.id);
    const { data: fb } = await db
      .from("ai_feedback")
      .select("*")
      .eq("session_id", data.id)
      .maybeSingle();
    const amap = new Map(
      (ans ?? []).map((a) => [a.question_id, a.selected_option as Letter | null]),
    );
    return {
      session,
      questions: (qs ?? []).map((q) => ({
        id: q.id,
        position: q.position,
        question: q.question,
        options: q.options as Record<Letter, string>,
        correct_option: q.correct_option as Letter,
        explanation: q.explanation,
        distractor_explanations: q.distractor_explanations as Record<Letter, string>,
        topic: q.topic,
        difficulty: q.difficulty,
        code_snippet: q.code_snippet,
        learning_objective: q.learning_objective,
        selected: amap.get(q.id) ?? null,
      })),
      feedback: fb as null | {
        summary: string;
        strengths: string[];
        weaknesses: string[];
        recommendations: string[];
        topics_to_revise: string[];
        next_plan: string | null;
      },
    };
  });

/** Aggregated analytics from completed sessions only. */
export const getAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: sessions } = await context.supabase
      .from("interview_sessions")
      .select("*")
      .eq("status", "completed")
      .order("completed_at", { ascending: true });
    const list = sessions ?? [];
    const ids = list.map((s) => s.id);
    const topics: Record<string, { correct: number; total: number; recent: boolean[] }> = {};
    const byDifficulty: Record<string, { correct: number; total: number }> = {};
    if (ids.length) {
      const db = await admin();
      const { data: qs } = await db
        .from("interview_questions")
        .select("id, session_id, topic, difficulty, position")
        .in("session_id", ids);
      const { data: ans } = await db
        .from("user_answers")
        .select("question_id, is_correct")
        .eq("user_id", context.userId)
        .in("session_id", ids);
      const amap = new Map((ans ?? []).map((a) => [a.question_id, a.is_correct]));
      const order = new Map(ids.map((id, i) => [id, i]));
      const sorted = (qs ?? []).sort(
        (a, b) => order.get(a.session_id)! - order.get(b.session_id)! || a.position - b.position,
      );
      for (const q of sorted) {
        const ok = amap.get(q.id) === true;
        const t = (topics[q.topic] ??= { correct: 0, total: 0, recent: [] });
        t.total++;
        if (ok) t.correct++;
        t.recent.push(ok);
        const d = (byDifficulty[q.difficulty] ??= { correct: 0, total: 0 });
        d.total++;
        if (ok) d.correct++;
      }
    }
    const topicList = Object.entries(topics).map(([topic, t]) => {
      const half = Math.floor(t.recent.length / 2);
      const early = t.recent.slice(0, half);
      const late = t.recent.slice(half);
      const rate = (a: boolean[]) => (a.length ? a.filter(Boolean).length / a.length : 0);
      const trend =
        t.recent.length >= 4
          ? rate(late) - rate(early) > 0.15
            ? "improving"
            : rate(early) - rate(late) > 0.15
              ? "declining"
              : "steady"
          : "not enough data";
      return {
        topic,
        correct: t.correct,
        total: t.total,
        accuracy: Math.round((t.correct / t.total) * 100),
        missed: t.total - t.correct,
        trend,
      };
    });
    return {
      sessions: list,
      topics: topicList.sort((a, b) => a.accuracy - b.accuracy),
      difficulty: Object.entries(byDifficulty).map(([difficulty, d]) => ({
        difficulty,
        accuracy: Math.round((d.correct / d.total) * 100),
        total: d.total,
      })),
    };
  });
