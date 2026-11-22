import { describe, expect, it } from "vitest";
import type { Concept, Evaluation, Mastery, Misconception } from "@/lib/types";
import { applyMisconceptionEvidence, canAdvance, diagnosticComplete, diagnosticDifficulty, evidenceScore, nextAction, normalizeEvaluation, scheduleRevision, selectDiagnosticConcept, selectLearningConcept, updateMastery } from "@/lib/learning/engine";
import { answerSchema, validateSyllabusGraph, type SyllabusDraft } from "@/lib/learning/schemas";
import { monitoringAllowed } from "@/lib/server/monitoring";

const correct: Evaluation = { answer_score: 1, reasoning_score: 1, correctness: "correct", reasoning_verdict: "sound", feedback: "Correct.", reasoning_feedback: "You used conservation of charge correctly.", misconceptions: [], resolved_misconceptions: [] };
const wrong: Evaluation = { ...correct, answer_score: 0, reasoning_score: 0, correctness: "incorrect", reasoning_verdict: "flawed" };
const misconception: Misconception = { id: "m", enrollment_id: "e", concept_id: "current", key: "current-used-up", description: "Current is used up.", evidence: "Less current leaves the bulb", occurrences: 1, confirmations: 0, status: "active", first_seen_at: "", last_seen_at: "" };
const concepts = ["current", "voltage", "ohm"].map((id, i) => ({ id, title: id, order_index: i, course_id: "c", slug: id, summary: id, content: { explanation: id, examples: [], misconceptions: [], revision_notes: id } })) satisfies Concept[];
function master(conceptId = "current") { let m: Mastery | undefined; for (let i = 0; i < 5; i++) m = updateMastery(m, correct, "hard", false, "e", conceptId); return m!; }
function diagnosticAttempts(count: number, evaluation = correct) { return Array.from({ length: count }, (_, i) => ({ concept_id: `c${i}`, evaluation, dont_know: false })); }

describe("evidence-based mastery and reasoning", () => {
  it("does not grant mastery after a single correct answer, even at hard difficulty", () => {
    const m = updateMastery(undefined, correct, "hard", false, "e", "current");
    expect(m.score).toBeLessThan(0.8); expect(canAdvance(m)).toBe(false); expect(m.sound_count).toBe(1);
  });
  it("distinguishes all five required answer/reasoning cases", () => {
    const lucky = { ...correct, reasoning_score: 0.1, reasoning_verdict: "flawed" as const };
    const partialReasoning = { ...wrong, reasoning_score: 0.6, reasoning_verdict: "partial" as const };
    expect(evidenceScore(correct)).toBe(1);
    expect(evidenceScore(lucky)).toBeLessThanOrEqual(0.4);
    expect(evidenceScore(partialReasoning)).toBeGreaterThan(evidenceScore(wrong));
    expect(evidenceScore(partialReasoning)).toBeLessThanOrEqual(0.5);
    expect(evidenceScore(correct, true)).toBe(0);
    expect(nextAction(lucky, master(), false, false)).toBe("reteach");
    expect(nextAction(wrong, master(), false, true)).toBe("teach");
    expect(nextAction(correct, master(), false, false)).toBe("continue");
  });
  it("requires repeated sound reasoning and no unresolved misconceptions", () => {
    const m = master(); expect(canAdvance(m)).toBe(true); expect(canAdvance(m, [misconception])).toBe(false);
    expect(canAdvance({ ...m, sound_count: 2 })).toBe(false);
  });
  it("lets later evidence overcome earlier failure while preserving history", () => {
    let m: Mastery | undefined;
    for (let i = 0; i < 8; i++) m = updateMastery(m, wrong, "medium", false, "e", "current");
    const weak = m!.score;
    for (let i = 0; i < 30; i++) m = updateMastery(m, correct, "hard", false, "e", "current");
    expect(m!.score).toBeGreaterThan(weak); expect(canAdvance(m)).toBe(true); expect(m!.attempts).toBe(38);
  });
  it("honors an explicit unknown answer regardless of AI output", () => {
    const e = normalizeEvaluation({ ...correct, resolved_misconceptions: [misconception.key], misconceptions: [misconception] }, true, [misconception]);
    expect(e.correctness).toBe("unknown"); expect(e.answer_score).toBe(0); expect(e.reasoning_score).toBe(0);
    expect(e.misconceptions).toEqual([]); expect(e.resolved_misconceptions).toEqual([]);
  });
  it("requires reasoning even for an unknown response", () => {
    expect(answerSchema.safeParse({ question_id: "20000000-0000-4000-8000-000000000001", answer: "", reasoning: "", dont_know: true }).success).toBe(false);
    expect(answerSchema.safeParse({ question_id: "20000000-0000-4000-8000-000000000001", answer: "", reasoning: "I have not learned this yet.", dont_know: true }).success).toBe(true);
  });
});

describe("adaptive diagnostic and prerequisite paths", () => {
  it("starts with a foundational easy question and changes difficulty using prior reasoning", () => {
    expect(selectDiagnosticConcept(concepts, []).id).toBe("current");
    expect(diagnosticDifficulty([])).toBe("easy");
    expect(diagnosticDifficulty(diagnosticAttempts(1))).toBe("medium");
    expect(diagnosticDifficulty(diagnosticAttempts(3))).toBe("medium");
    expect(diagnosticDifficulty([...diagnosticAttempts(3), { evaluation: wrong }])).toBe("easy");
  });
  it("completes the initial diagnostic after three quick questions", () => {
    expect(diagnosticComplete(diagnosticAttempts(1))).toBe(false);
    expect(diagnosticComplete(diagnosticAttempts(2))).toBe(false);
    expect(diagnosticComplete(diagnosticAttempts(3))).toBe(true);
    expect(diagnosticComplete(diagnosticAttempts(3, wrong))).toBe(true);
    expect(diagnosticComplete(diagnosticAttempts(3).map(a => ({ ...a, concept_id: "same" })))).toBe(true);
  });
  it("honors prerequisites and skips concepts with demonstrated mastery in either mode", () => {
    const deps = [{ concept_id: "voltage", prerequisite_id: "current" }, { concept_id: "ohm", prerequisite_id: "voltage" }];
    expect(selectLearningConcept(concepts, deps, [], [], "prior")?.id).toBe("current");
    for (const mode of ["scratch", "prior"] as const) expect(selectLearningConcept(concepts, deps, [master()], [], mode)?.id).toBe("voltage");
    expect(selectLearningConcept(concepts, deps, concepts.map(c => master(c.id)), [], "prior")).toBeNull();
  });
  it("rejects cyclic or missing prerequisites in extracted syllabuses", () => {
    const draft = { concepts: [{ slug: "a", prerequisites: ["b"] }, { slug: "b", prerequisites: ["a"] }] } as SyllabusDraft;
    expect(() => validateSyllabusGraph(draft)).toThrow(/circular/);
    draft.concepts[1].prerequisites = ["missing"];
    expect(() => validateSyllabusGraph(draft)).toThrow(/missing/);
    draft.concepts[1].prerequisites = [];
    expect(() => validateSyllabusGraph(draft)).not.toThrow();
  });
});

describe("persistent misconception history", () => {
  it("requires two separate confirmations, and resets confirmation on recurrence", () => {
    const resolved = { ...correct, resolved_misconceptions: [misconception.key] };
    const once = applyMisconceptionEvidence([misconception], resolved, "current");
    expect(once[0].status).toBe("active"); expect(once[0].confirmations).toBe(1);
    const twice = applyMisconceptionEvidence(once, resolved, "current"); expect(twice[0].status).toBe("corrected");
    const again = applyMisconceptionEvidence(twice, { ...wrong, misconceptions: [misconception] }, "current");
    expect(again[0].status).toBe("active"); expect(again[0].confirmations).toBe(0);
  });
  it("rejects resolution on flawed reasoning, unknown keys, or concurrent contradictory evidence", () => {
    const input = { ...wrong, resolved_misconceptions: [misconception.key] };
    expect(normalizeEvaluation(input, false, [misconception]).resolved_misconceptions).toEqual([]);
    expect(normalizeEvaluation({ ...correct, resolved_misconceptions: ["unknown"] }, false, [misconception]).resolved_misconceptions).toEqual([]);
    expect(normalizeEvaluation({ ...correct, misconceptions: [misconception], resolved_misconceptions: [misconception.key] }, false, [misconception]).resolved_misconceptions).toEqual([]);
  });
});

describe("spaced repetition", () => {
  const now = new Date("2026-11-21T12:00:00Z");
  it("schedules weak or misunderstood concepts for the next day", () => {
    const revision = scheduleRevision(undefined, master(), wrong, false, true, now);
    expect(revision.interval_days).toBe(1); expect(revision.due_at).toBe("2026-11-22T12:00:00.000Z");
  });
  it("expands a successful review interval and resets it after a lapse", () => {
    const first = scheduleRevision(undefined, master(), correct, false, false, now);
    const second = scheduleRevision(first, master(), correct, true, false, now);
    expect(second.interval_days).toBeGreaterThan(first.interval_days); expect(second.reviews).toBe(1);
    const lapse = scheduleRevision(second, master(), wrong, true, false, now);
    expect(lapse.interval_days).toBe(1); expect(lapse.lapses).toBe(1); expect(lapse.reviews).toBe(2);
  });
  it("does not let practice postpone an overdue review", () => {
    const previous = { ...scheduleRevision(undefined, master(), correct, true, false, now), due_at: "2026-11-20T12:00:00.000Z" };
    expect(scheduleRevision(previous, master(), correct, false, false, now).due_at).toBe(previous.due_at);
  });
});

describe("monitoring authorization", () => {
  it("requires an accepted connection and explicit student agreement", () => {
    const approved = { status: "approved", student_approved_at: "today" };
    expect(monitoringAllowed(approved)).toBe(true);
    for (const status of ["pending_teacher", "pending_student", "pending_guardian", "rejected", "revoked"]) {
      expect(monitoringAllowed({ ...approved, status })).toBe(false);
    }
    expect(monitoringAllowed({ ...approved, student_approved_at: null })).toBe(false);
  });
});
