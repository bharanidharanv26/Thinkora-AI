import type { Action, Attempt, Concept, Difficulty, Evaluation, Mastery, Misconception, Mode, Prerequisite, Revision } from "@/lib/types";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export const MASTERY_THRESHOLD = 0.8;
export const DIAGNOSTIC_QUESTION_COUNT = 3;

// Answer and reasoning are separate evidence channels. A lucky answer cannot establish mastery.
export function evidenceScore(e: Evaluation, dontKnow = false) {
  if (dontKnow || e.correctness === "unknown") return 0;
  const weighted = e.answer_score * 0.35 + e.reasoning_score * 0.65;
  if (e.reasoning_verdict === "flawed" || e.reasoning_score < 0.4) return Math.min(0.4, weighted);
  if (e.correctness === "incorrect") return Math.min(0.5, weighted);
  if (e.correctness === "partial") return Math.min(0.7, weighted);
  return clamp(weighted, 0, 1);
}

export function updateMastery(previous: Mastery | undefined, evaluation: Evaluation, difficulty: Difficulty, dontKnow: boolean, enrollmentId: string, conceptId: string, now = new Date()): Mastery {
  const evidence = evidenceScore(evaluation, dontKnow);
  const weight = { easy: 0.8, medium: 1.2, hard: 1.6 }[difficulty];
  // Beta(1,1) prior; 5% evidence decay lets later learning correct earlier failures.
  const alpha = 1 + ((previous?.alpha ?? 1) - 1) * 0.95 + evidence * weight;
  const beta = 1 + ((previous?.beta ?? 1) - 1) * 0.95 + (1 - evidence) * weight;
  const sound = !dontKnow && evaluation.correctness === "correct" && evaluation.reasoning_verdict === "sound" && evaluation.reasoning_score >= 0.75;
  return {
    enrollment_id: enrollmentId, concept_id: conceptId, alpha, beta, score: alpha / (alpha + beta),
    attempts: (previous?.attempts ?? 0) + 1,
    correct_count: (previous?.correct_count ?? 0) + Number(!dontKnow && evaluation.correctness === "correct"),
    sound_count: (previous?.sound_count ?? 0) + Number(sound),
    reasoning_total: (previous?.reasoning_total ?? 0) + (dontKnow ? 0 : evaluation.reasoning_score),
    last_difficulty: difficulty, updated_at: now.toISOString(),
  };
}

export function canAdvance(m: Mastery | undefined, misconceptions: Pick<Misconception, "concept_id" | "status">[] = []) {
  return !!m && m.score >= MASTERY_THRESHOLD && m.attempts >= 3 && m.sound_count >= 3 &&
    !misconceptions.some(x => x.concept_id === m.concept_id && x.status === "active");
}
export function masteryLabel(m: Mastery | undefined, misconceptions: Misconception[] = []) {
  if (!m) return "Not assessed";
  if (canAdvance(m, misconceptions)) return "Mastered";
  return m.score < 0.5 || misconceptions.some(x => x.concept_id === m.concept_id && x.status === "active") ? "Needs attention" : "Developing";
}
export function nextDifficulty(m: Mastery | undefined, last?: Evaluation): Difficulty {
  if (last && evidenceScore(last) < 0.45) return "easy";
  if (m && m.score >= 0.68 && (!last || evidenceScore(last) >= 0.75)) return "hard";
  if (m && m.score >= 0.45 && m.attempts > 0) return "medium";
  return "easy";
}
export function nextAction(e: Evaluation, m: Mastery, unresolved: boolean, dontKnow: boolean): Action {
  if (dontKnow || e.correctness === "unknown") return "teach";
  if (e.reasoning_verdict === "flawed" || evidenceScore(e) < 0.45 || e.misconceptions.length > 0) return "reteach";
  if (unresolved || !canAdvance(m) || e.reasoning_score < 0.75) return "retest";
  return "continue";
}

export function normalizeEvaluation(e: Evaluation, dontKnow: boolean, known: Misconception[]): Evaluation {
  const misconceptions = [...new Map(e.misconceptions.map(m => [m.key, m])).values()];
  const canResolve = !dontKnow && e.correctness === "correct" && e.reasoning_verdict === "sound" && e.reasoning_score >= 0.75;
  return {
    ...e, misconceptions,
    ...(dontKnow ? { answer_score: 0, reasoning_score: 0, correctness: "unknown" as const, reasoning_verdict: "unknown" as const, misconceptions: [] } : {}),
    resolved_misconceptions: canResolve ? [...new Set(e.resolved_misconceptions)].filter(key => known.some(m => m.key === key && m.status === "active") && !misconceptions.some(m => m.key === key)) : [],
  };
}
export function applyMisconceptionEvidence(existing: Misconception[], e: Evaluation, conceptId: string): Misconception[] {
  const next = existing.map(m => {
    if (m.concept_id !== conceptId) return m;
    if (e.misconceptions.some(x => x.key === m.key)) return { ...m, status: "active" as const, confirmations: 0 };
    if (m.status === "active" && e.resolved_misconceptions.includes(m.key)) return { ...m, confirmations: m.confirmations + 1, status: m.confirmations + 1 >= 2 ? "corrected" as const : "active" as const };
    return m;
  });
  for (const item of e.misconceptions) {
    if (!next.some(m => m.concept_id === conceptId && m.key === item.key)) next.push({ ...item, id: item.key, concept_id: conceptId, enrollment_id: "", status: "active", confirmations: 0, occurrences: 1, first_seen_at: "", last_seen_at: "" });
  }
  return next;
}

export function scheduleRevision(previous: Revision | undefined, mastery: Mastery, evaluation: Evaluation, isReview: boolean, unresolved: boolean, now = new Date()): Revision {
  const evidence = evidenceScore(evaluation);
  const success = evidence >= 0.75 && !unresolved;
  const ease = clamp((previous?.ease ?? 2.2) + (success ? 0.1 : -0.2), 1.3, 2.8);
  let interval = !success || mastery.score < 0.5 ? 1 : mastery.score < 0.8 ? 3 : 7;
  if (isReview && previous && success) interval = Math.max(interval, Math.round(previous.interval_days * ease));
  interval = clamp(interval, 1, 90);
  const candidate = new Date(now.getTime() + interval * 86400000);
  // Practice cannot push an already-scheduled review into the future; only an actual review can.
  const due = !isReview && previous && new Date(previous.due_at) < candidate ? new Date(previous.due_at) : candidate;
  return {
    enrollment_id: mastery.enrollment_id, concept_id: mastery.concept_id, due_at: due.toISOString(), interval_days: interval, ease,
    reviews: (previous?.reviews ?? 0) + Number(isReview), lapses: (previous?.lapses ?? 0) + Number(isReview && !success),
    last_reviewed_at: isReview ? now.toISOString() : previous?.last_reviewed_at ?? null,
  };
}

export function diagnosticComplete(attempts: Pick<Attempt, "evaluation" | "dont_know">[]) {
  return attempts.length >= DIAGNOSTIC_QUESTION_COUNT;
}
export function diagnosticDifficulty(attempts: Pick<Attempt, "evaluation">[]): Difficulty {
  const last = attempts.at(-1)?.evaluation;
  return !last || evidenceScore(last) < 0.45 ? "easy" : "medium";
}
export function selectDiagnosticConcept(concepts: Concept[], attempts: Pick<Attempt, "concept_id" | "evaluation">[]): Concept {
  const counts = new Map<string, number>();
  attempts.forEach(a => counts.set(a.concept_id, (counts.get(a.concept_id) ?? 0) + 1));
  const untested = [...concepts].filter(c => !counts.has(c.id)).sort((a, b) => a.order_index - b.order_index);
  if (untested.length) return untested[0];
  return [...concepts].sort((a, b) => (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0) || a.order_index - b.order_index)[0];
}

export function selectLearningConcept(concepts: Concept[], prerequisites: Prerequisite[], mastery: Mastery[], misconceptions: Misconception[], mode: Mode): Concept | null {
  const byId = new Map(mastery.map(m => [m.concept_id, m]));
  const remaining = concepts.filter(c => !canAdvance(byId.get(c.id), misconceptions));
  if (!remaining.length) return null;
  const ready = remaining.filter(c => prerequisites.filter(p => p.concept_id === c.id).every(p => canAdvance(byId.get(p.prerequisite_id), misconceptions)));
  const candidates = ready.length ? ready : remaining;
  return candidates.sort((a, b) => mode === "scratch" ? a.order_index - b.order_index :
    (byId.get(a.id)?.score ?? 0) - (byId.get(b.id)?.score ?? 0) || a.order_index - b.order_index)[0];
}

export function diagnosticResult(attempts: Attempt[], concepts: Concept[], prerequisites: Prerequisite[], mastery: Mastery[], misconceptions: Misconception[]) {
  const average = attempts.reduce((sum, a) => sum + evidenceScore(a.evaluation, a.dont_know), 0) / Math.max(attempts.length, 1);
  const mode: Mode = average >= 0.7 ? "prior" : "scratch";
  const start = selectLearningConcept(concepts, prerequisites, mastery, misconceptions, mode) ?? concepts[0];
  return {
    recommended_mode: mode, starting_concept_id: start.id, question_count: attempts.length,
    summary: `Your ${attempts.length} answers and explanations suggest ${mode === "prior" ? "some existing understanding. We’ll use focused checks and work on gaps" : "a foundation-first approach with short explanations and worked examples"}. Start with ${start.title}. A single correct answer does not establish mastery; later questions will verify your understanding.`,
  };
}
