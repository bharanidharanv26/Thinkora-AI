import type { Concept, CourseState, Question } from "@/lib/types";

export const currentConcept: Concept = {
  id: "20000000-0000-4000-8000-000000000001", course_id: "10000000-0000-4000-8000-000000000001",
  slug: "electric-current", title: "Electric current", summary: "Charge flow and conservation of current in a steady series circuit.", order_index: 0,
  content: {
    explanation: "Electric current is the rate of flow of charge, I = Q / t. In a steady series circuit the same current flows through every component because charge is conserved. A bulb transfers electrical energy, not charge.",
    examples: [{ problem: "If 6 C passes a point in 3 s, what is the current?", solution: "I = Q / t = 6 C / 3 s = 2 A." }],
    misconceptions: ["A bulb uses up current."], revision_notes: "Current is charge per unit time. Current is the same before and after a component in a steady series circuit.",
  },
};

export const currentQuestion: Question = {
  id: "50000000-0000-4000-8000-000000000001", enrollment_id: "30000000-0000-4000-8000-000000000001", concept_id: currentConcept.id,
  kind: "diagnostic", difficulty: "easy", prompt: "In a steady series circuit, a current of 2 A enters a lamp. What current leaves it? Explain your answer.",
  options: [], correct_answer: "2 A", explanation: "The same current leaves the lamp because charge is conserved. The lamp transfers energy but does not consume charge.",
  rubric: "Award correctness for 2 A. Sound reasoning explains that charge is conserved and current is not used up by the lamp.",
  source: "bank", fingerprint: "test-current", created_at: "2026-11-21T12:00:00Z",
};

export function learningState(): CourseState {
  return {
    course: { id: currentConcept.course_id, owner_id: null, course_kind: "predefined", title: "Class 10 Physics — Electricity", subject: "Physics", grade: "Class 10", description: "Electric current, voltage and resistance in simple circuits.", status: "published", source_path: null, deleted_at: null, published_at: "2026-11-21T12:00:00Z", created_at: "2026-11-21T12:00:00Z" },
    enrollment: { id: currentQuestion.enrollment_id, student_id: "40000000-0000-4000-8000-000000000001", course_id: currentConcept.course_id, mode: "scratch", status: "diagnostic", diagnostic_count: 0, created_at: "2026-11-21T12:00:00Z", updated_at: "2026-11-21T12:00:00Z" },
    concepts: [structuredClone(currentConcept)], prerequisites: [], mastery: [], misconceptions: [], revisions: [], attempts: [],
    session: { id: "60000000-0000-4000-8000-000000000001", enrollment_id: currentQuestion.enrollment_id, current_question_id: null, current_lesson: null, answer_draft: {}, next_action: "teach", last_attempt_id: null, revision_concept_id: null, version: 0, updated_at: "2026-11-21T12:00:00Z" },
    diagnostic: { enrollment_id: currentQuestion.enrollment_id, status: "in_progress", result: null, completed_at: null },
    question: null, feedback: null,
  };
}
