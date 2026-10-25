import { describe, it, expect } from "vitest";
import { scoreInterview, practiceStreak } from "@/lib/scoring";

describe("scoreInterview", () => {
  const qs = [
    { id: "1", correct_option: "A" as const },
    { id: "2", correct_option: "B" as const },
    { id: "3", correct_option: "C" as const },
    { id: "4", correct_option: "D" as const },
  ];
  it("counts correct, incorrect and unanswered", () => {
    const r = scoreInterview(qs, { "1": "A", "2": "C", "3": null });
    expect(r.correct).toBe(1);
    expect(r.incorrect).toBe(1);
    expect(r.unanswered).toBe(2);
    expect(r.score).toBe(25);
  });
  it("unanswered questions count against the score", () => {
    expect(scoreInterview(qs, { "1": "A", "2": "B" }).score).toBe(50);
  });
});

describe("practiceStreak", () => {
  it("counts consecutive days ending today", () => {
    const now = new Date("2026-10-25T12:00:00Z");
    expect(practiceStreak(["2026-10-25T01:00:00Z", "2026-10-24T09:00:00Z", "2026-10-22T09:00:00Z"], now)).toBe(2);
  });
  it("is zero without recent activity", () => {
    expect(practiceStreak(["2026-10-20T01:00:00Z"], new Date("2026-10-25T12:00:00Z"))).toBe(0);
  });
});
