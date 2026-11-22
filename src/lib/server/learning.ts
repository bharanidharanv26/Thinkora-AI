import "server-only";
import { randomUUID } from "node:crypto";
import { admin } from "@/lib/supabase/server";
import type { Attempt, CourseState, Question } from "@/lib/types";
import { answerSchema } from "@/lib/learning/schemas";
import { applyMisconceptionEvidence, canAdvance, diagnosticComplete, diagnosticDifficulty, diagnosticResult, nextAction, nextDifficulty, normalizeEvaluation, scheduleRevision, selectDiagnosticConcept, selectLearningConcept, updateMastery } from "@/lib/learning/engine";
import { z } from "zod";
import { evaluateAnswer, fingerprint, generateStep } from "./ai";
import { loadState, ownedEnrollment, privateQuestion } from "./data";
import { HttpError, unwrap } from "./http";

async function withLease<T>(state: CourseState, work: (token: string) => Promise<T>) {
  const token = randomUUID();
  const claimed = unwrap<boolean>(await admin().rpc("claim_session", { p_enrollment: state.enrollment.id, p_token: token, p_version: state.session.version }));
  if (!claimed) throw new HttpError(409, "This session is being updated. Wait a moment, then reload to continue.");
  try { return await work(token); }
  finally { await admin().rpc("release_session", { p_enrollment: state.enrollment.id, p_token: token }); }
}

export async function prepareStep(studentId: string, id: string, revisionConcept?: string) {
  const enrollment = await ownedEnrollment(id, studentId);
  const state = await loadState(enrollment);
  if (state.question && !state.feedback) {
    if (revisionConcept && (state.question.kind !== "revision" || state.question.concept_id !== revisionConcept)) throw new HttpError(409, "Finish your saved question before starting a revision.");
    return state;
  }
  if (revisionConcept && enrollment.status === "diagnostic") throw new HttpError(409, "Complete your initial diagnostic before revising.");
  const kind = enrollment.status === "diagnostic" ? "diagnostic" : revisionConcept ? "revision" : "learning";
  const concept = revisionConcept ? state.concepts.find(c => c.id === revisionConcept) : kind === "diagnostic" ? selectDiagnosticConcept(state.concepts, state.attempts) : selectLearningConcept(state.concepts, state.prerequisites, state.mastery, state.misconceptions, enrollment.mode);
  if (!concept) return state;
  if (revisionConcept && !state.revisions.some(r => r.concept_id === revisionConcept)) throw new HttpError(400, "This concept has no revision scheduled yet.");
  const difficulty = kind === "diagnostic" ? diagnosticDifficulty(state.attempts) : nextDifficulty(state.mastery.find(m => m.concept_id === concept.id), state.attempts.filter(a => a.concept_id === concept.id).at(-1)?.evaluation);
  await withLease(state, async token => {
    const history = unwrap<Pick<Question, "prompt" | "fingerprint">[]>(await admin().from("questions").select("prompt,fingerprint").eq("enrollment_id", id).eq("concept_id", concept.id).order("created_at", { ascending: false }).limit(150));
    const references = unwrap<Pick<Question, "prompt" | "correct_answer" | "explanation" | "rubric">[]>(await admin().from("question_bank").select("prompt,correct_answer,explanation,rubric").eq("concept_id", concept.id).eq("difficulty", difficulty).limit(3));
    const generated = await generateStep(state, concept, difficulty, kind, history.map(q => q.prompt), references);
    unwrap(await admin().rpc("save_question", {
      p_enrollment: id, p_token: token,
      p_question: { ...generated.question, concept_id: concept.id, kind, difficulty, source: "ai", fingerprint: fingerprint(generated.question.prompt) },
      p_lesson: generated.lesson,
    }));
  });
  return loadState(await ownedEnrollment(id, studentId));
}

export async function submitAnswer(studentId: string, id: string, input: z.infer<typeof answerSchema>) {
  const enrollment = await ownedEnrollment(id, studentId);
  const state = await loadState(enrollment);
  if (state.attempts.some(a => a.question_id === input.question_id)) return state;
  if (state.question?.id !== input.question_id) throw new HttpError(409, "That question is no longer current. Reload your lesson.");
  await withLease(state, async token => {
    const question = await privateQuestion(input.question_id, id);
    const concept = state.concepts.find(c => c.id === question.concept_id)!;
    const known = state.misconceptions.filter(m => m.concept_id === concept.id);
    const raw = await evaluateAnswer(question, concept, input.answer, input.reasoning, input.dont_know, known);
    const evaluation = normalizeEvaluation(raw, input.dont_know, known);
    const mastery = updateMastery(state.mastery.find(m => m.concept_id === concept.id), evaluation, question.difficulty, input.dont_know, id, concept.id);
    const misconceptions = applyMisconceptionEvidence(state.misconceptions, evaluation, concept.id);
    const unresolved = misconceptions.some(m => m.concept_id === concept.id && m.status === "active");
    const action = nextAction(evaluation, mastery, unresolved, input.dont_know);
    const revision = scheduleRevision(state.revisions.find(r => r.concept_id === concept.id), mastery, evaluation, question.kind === "revision", unresolved);
    const masteries = [...state.mastery.filter(m => m.concept_id !== concept.id), mastery];
    const attempt: Attempt = { id: "pending", enrollment_id: id, concept_id: concept.id, question_id: question.id, answer: input.answer, reasoning: input.reasoning, dont_know: input.dont_know, evaluation, mastery_after: mastery.score, action, created_at: new Date().toISOString() };
    const diagnosticAttempts = [...state.attempts, attempt];
    const diagnostic = question.kind === "diagnostic" && diagnosticComplete(diagnosticAttempts) ? diagnosticResult(diagnosticAttempts, state.concepts, state.prerequisites, masteries, misconceptions) : null;
    const complete = question.kind !== "diagnostic" && state.concepts.every(c => canAdvance(masteries.find(m => m.concept_id === c.id), misconceptions));
    unwrap(await admin().rpc("commit_answer", {
      p_enrollment: id, p_question: question.id, p_token: token, p_answer: input.answer, p_reasoning: input.reasoning,
      p_dont_know: input.dont_know, p_evaluation: evaluation, p_mastery: mastery, p_revision: revision,
      p_action: action, p_diagnostic: diagnostic, p_complete: complete,
    }));
  });
  return loadState(await ownedEnrollment(id, studentId));
}
