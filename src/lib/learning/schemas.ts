import { z } from "zod";

export const evaluationSchema = z.object({
  answer_score: z.number().min(0).max(1), reasoning_score: z.number().min(0).max(1),
  correctness: z.enum(["correct", "partial", "incorrect", "unknown"]),
  reasoning_verdict: z.enum(["sound", "partial", "flawed", "unknown"]),
  feedback: z.string().min(1).max(3000), reasoning_feedback: z.string().min(1).max(3000),
  misconceptions: z.array(z.object({ key: z.string().min(1).max(80), description: z.string().min(1).max(500), evidence: z.string().min(1).max(1000) })).max(5),
  resolved_misconceptions: z.array(z.string().max(80)).max(10),
});
export const questionSchema = z.object({
  prompt: z.string().min(10).max(2000), options: z.array(z.string().min(1).max(500)).max(5),
  correct_answer: z.string().min(1).max(2000), explanation: z.string().min(10).max(3000),
  rubric: z.string().min(10).max(2000),
});
export const lessonSchema = z.object({
  title: z.string().min(1).max(200), explanation: z.string().min(20).max(5000),
  example: z.string().min(10).max(2000), approach: z.string().min(1).max(200), takeaway: z.string().min(1).max(500),
});
export const syllabusSchema = z.object({
  title: z.string().min(3).max(150), subject: z.string().min(1).max(80), grade: z.string().min(1).max(60),
  description: z.string().min(10).max(1000),
  concepts: z.array(z.object({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80), title: z.string().min(1).max(150),
    summary: z.string().min(5).max(600), prerequisites: z.array(z.string().max(80)).max(12),
    content: z.object({ explanation: z.string().min(30).max(6000),
      examples: z.array(z.object({ problem: z.string().min(1).max(1000), solution: z.string().min(1).max(2000) })).min(1).max(3),
      misconceptions: z.array(z.string().max(500)).max(6), revision_notes: z.string().min(10).max(2000),
    }),
  })).min(2).max(24),
});
export type SyllabusDraft = z.infer<typeof syllabusSchema>;
export const answerSchema = z.object({
  question_id: z.uuid(), answer: z.string().trim().max(3000),
  reasoning: z.string().trim().min(3, "Explain your thinking, or describe what you are unsure about.").max(4000),
  dont_know: z.boolean(),
}).refine(v => v.dont_know || v.answer.length > 0, { path: ["answer"], message: "Enter an answer or choose ‘I don’t know’." });

export function validateSyllabusGraph(syllabus: SyllabusDraft) {
  const map = new Map(syllabus.concepts.map(c => [c.slug, c]));
  if (map.size !== syllabus.concepts.length) throw new Error("The syllabus contains duplicate concept identifiers.");
  const visiting = new Set<string>(); const visited = new Set<string>();
  function visit(slug: string) {
    if (visiting.has(slug)) throw new Error("The syllabus has a circular prerequisite. Please regenerate it.");
    if (visited.has(slug)) return;
    const concept = map.get(slug);
    if (!concept) throw new Error("The syllabus references a missing prerequisite.");
    visiting.add(slug);
    if (new Set(concept.prerequisites).size !== concept.prerequisites.length) throw new Error("Duplicate prerequisite.");
    concept.prerequisites.forEach(visit);
    visiting.delete(slug); visited.add(slug);
  }
  syllabus.concepts.forEach(c => visit(c.slug));
  return syllabus;
}
