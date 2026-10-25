export type Letter = "A" | "B" | "C" | "D";

export interface KeyedQuestion {
  id: string;
  correct_option: Letter;
}

export interface ScoreResult {
  correct: number;
  incorrect: number;
  unanswered: number;
  total: number;
  score: number; // percentage 0-100, one decimal
  perQuestion: Record<string, boolean | null>;
}

/** Deterministic multiple-choice scoring against the trusted answer key. */
export function scoreInterview(
  questions: KeyedQuestion[],
  answers: Record<string, Letter | null | undefined>,
): ScoreResult {
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;
  const perQuestion: Record<string, boolean | null> = {};
  for (const q of questions) {
    const a = answers[q.id];
    if (!a) {
      unanswered++;
      perQuestion[q.id] = null;
    } else if (a === q.correct_option) {
      correct++;
      perQuestion[q.id] = true;
    } else {
      incorrect++;
      perQuestion[q.id] = false;
    }
  }
  const total = questions.length;
  const score = total === 0 ? 0 : Math.round((correct / total) * 1000) / 10;
  return { correct, incorrect, unanswered, total, score, perQuestion };
}

/** Consecutive-day streak ending today or yesterday (UTC dates). */
export function practiceStreak(dates: string[], now = new Date()): number {
  const days = new Set(dates.map((d) => new Date(d).toISOString().slice(0, 10)));
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
