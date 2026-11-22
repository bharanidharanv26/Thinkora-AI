export type Role = "student" | "teacher";
export type Mode = "scratch" | "prior";
export type Difficulty = "easy" | "medium" | "hard";
export type Activity = "diagnostic" | "learning" | "revision";
export type Action = "teach" | "reteach" | "retest" | "continue";
export type CourseKind = "predefined" | "teacher" | "student";

export interface Profile {
  id: string; role: Role; display_name: string; student_code: string | null; teacher_code: string | null;
  age_band: "under18" | "adult" | null; guardian_email: string | null;
  grade: string | null; institution: string | null; created_at: string;
}
export interface Course {
  id: string; owner_id: string | null; course_kind: CourseKind; title: string; subject: string; grade: string;
  description: string; status: "draft" | "approved" | "published";
  source_path: string | null; deleted_at: string | null; published_at: string | null; created_at: string;
}
export interface Concept {
  id: string; course_id: string; slug: string; title: string; summary: string; order_index: number;
  content: { explanation: string; examples: { problem: string; solution: string }[]; misconceptions: string[]; revision_notes: string };
}
export interface Prerequisite { concept_id: string; prerequisite_id: string }
export interface Enrollment {
  id: string; student_id: string; course_id: string; mode: Mode;
  status: "diagnostic" | "learning" | "completed"; diagnostic_count: number;
  created_at: string; updated_at: string;
}
export interface Lesson { title: string; explanation: string; example: string; approach: string; takeaway: string }
export interface LearningSession {
  id: string; enrollment_id: string; current_question_id: string | null;
  current_lesson: Lesson | null; next_action: Action; last_attempt_id: string | null;
  answer_draft: { answer?: string; reasoning?: string; dont_know?: boolean };
  revision_concept_id: string | null; version: number; updated_at: string;
}
export interface Question {
  id: string; enrollment_id: string; concept_id: string; kind: Activity; difficulty: Difficulty;
  prompt: string; options: string[]; correct_answer: string; explanation: string;
  rubric: string; fingerprint: string; source: "bank" | "ai"; created_at: string;
}
export type PublicQuestion = Pick<Question, "id" | "concept_id" | "kind" | "difficulty" | "prompt" | "options">;
export interface Evaluation {
  answer_score: number; reasoning_score: number;
  correctness: "correct" | "partial" | "incorrect" | "unknown";
  reasoning_verdict: "sound" | "partial" | "flawed" | "unknown";
  feedback: string; reasoning_feedback: string;
  misconceptions: { key: string; description: string; evidence: string }[];
  resolved_misconceptions: string[];
}
export interface Attempt {
  id: string; enrollment_id: string; question_id: string; concept_id: string;
  answer: string; reasoning: string; dont_know: boolean; evaluation: Evaluation;
  mastery_after: number; action: Action; created_at: string;
  question?: Pick<Question, "prompt" | "difficulty" | "kind">;
}
export interface Mastery {
  enrollment_id: string; concept_id: string; score: number; alpha: number; beta: number;
  attempts: number; correct_count: number; sound_count: number; reasoning_total: number;
  last_difficulty: Difficulty; updated_at: string;
}
export interface Misconception {
  id: string; enrollment_id: string; concept_id: string; key: string; description: string;
  evidence: string; occurrences: number; confirmations: number; status: "active" | "corrected";
  first_seen_at: string; last_seen_at: string;
}
export interface Revision {
  enrollment_id: string; concept_id: string; due_at: string; interval_days: number;
  ease: number; reviews: number; lapses: number; last_reviewed_at: string | null;
}
export interface Diagnostic {
  enrollment_id: string; status: "in_progress" | "completed";
  result: { summary: string; recommended_mode: Mode; starting_concept_id: string; question_count: number } | null;
  completed_at: string | null;
}
export interface CourseState {
  enrollment: Enrollment; course: Course; concepts: Concept[]; prerequisites: Prerequisite[];
  session: LearningSession; mastery: Mastery[]; misconceptions: Misconception[];
  revisions: Revision[]; attempts: Attempt[]; diagnostic: Diagnostic;
  question: PublicQuestion | null; feedback: Attempt | null;
}
export interface Classroom { id: string; teacher_id: string; name: string; subject: string; created_at: string }
export interface Connection {
  id: string; class_id: string; teacher_id: string; student_id: string;
  status: "pending_teacher" | "pending_student" | "approved" | "rejected" | "revoked";
  initiated_by?: "teacher" | "student";
  student_approved_at: string | null; guardian_approved_at: string | null;
  created_at: string; class_name?: string; teacher_name?: string; student_name?: string; student_code?: string;
}
