import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FinishReason, type GenerateContentParameters } from "@google/genai";
import { z } from "zod";
import { structured } from "@/lib/server/gemini";
import { evaluateAnswer, generateStep } from "@/lib/server/ai";
import { evidenceScore, nextAction, updateMastery } from "@/lib/learning/engine";
import { geminiError, geminiResponse, requestText } from "./fixtures/gemini";
import { currentConcept, currentQuestion, learningState } from "./fixtures/learning";

const mocks = vi.hoisted(() => ({ generateContent: vi.fn(), options: vi.fn() }));
vi.mock("@google/genai", async importOriginal => {
  const actual = await importOriginal<typeof import("@google/genai")>();
  return { ...actual, GoogleGenAI: class extends actual.GoogleGenAI {
    constructor(...args: ConstructorParameters<typeof actual.GoogleGenAI>) {
      super(...args);
      mocks.options(...args);
      this.models.generateContent = mocks.generateContent;
    }
  } };
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");
  vi.stubEnv("GEMINI_MODEL", "gemini-3.8-flash");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

const schema = z.object({ score: z.number().min(0).max(1), feedback: z.string().min(5).max(100) });
const valid = { score: 1, feedback: "Correct reasoning." };

describe("Gemini structured transport", () => {
  it("uses the configured server key and model with JSON-schema constrained output", async () => {
    vi.stubEnv("GEMINI_MODEL", " models/gemini-3.8-flash ");
    mocks.generateContent.mockResolvedValueOnce(geminiResponse(valid));
    await expect(structured(schema, "check", "Check the answer.", "Student data", 2000)).resolves.toEqual(valid);
    expect(mocks.options).toHaveBeenCalledWith(expect.objectContaining({ apiKey: "test-gemini-key", vertexai: false, httpOptions: expect.objectContaining({ retryOptions: expect.objectContaining({ attempts: 2, httpStatusCodes: [500, 502, 503, 504] }) }) }));
    const request = mocks.generateContent.mock.calls[0][0];
    expect(request.model).toBe("models/gemini-3.8-flash");
    expect(request.contents).toEqual([{ role: "user", parts: [{ text: "Student data" }] }]);
    expect(request.config).toMatchObject({ responseMimeType: "application/json", maxOutputTokens: 2000, store: false, automaticContinuation: false, candidateCount: 1 });
    expect(request.config.responseJsonSchema).toMatchObject({ type: "object", required: ["score", "feedback"] });
    expect(request.config.systemInstruction).toContain("untrusted DATA");
    expect(request.config.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it("sends only structural schema keywords so Gemini accepts dense schemas", async () => {
    mocks.generateContent.mockResolvedValueOnce(geminiResponse({ examples: ["step"], slug: "intro" }));
    const dense = z.object({ examples: z.array(z.string()).min(1).max(2), slug: z.string().min(1).max(10).regex(/^[a-z-]+$/) });
    await expect(structured(dense, "check", "Check.", "Data")).resolves.toEqual({ examples: ["step"], slug: "intro" });
    const sent = JSON.stringify(mocks.generateContent.mock.calls[0][0].config.responseJsonSchema);
    expect(sent).not.toMatch(/"(minLength|maxLength|pattern|minItems|maxItems)"/);
    expect(JSON.parse(sent).properties.examples).toMatchObject({ type: "array" });
  });

  it("requires an explicit model instead of silently choosing another provider or model", async () => {
    vi.stubEnv("GEMINI_MODEL", "");
    await expect(structured(schema, "check", "Check.", "Data")).rejects.toMatchObject({ status: 503, message: expect.stringContaining("GEMINI_MODEL") });
    expect(mocks.generateContent).not.toHaveBeenCalled();
  });

  it.each([
    { score: 5, feedback: "Too high a score." },
    { score: 0.5, feedback: "x" },
    { score: "1", feedback: "Wrong JSON type." },
    { score: 1 },
  ])("enforces the existing Zod constraints locally", async invalid => {
    mocks.generateContent.mockResolvedValueOnce(geminiResponse(invalid));
    await expect(structured(schema, "check", "Check.", "Data")).rejects.toMatchObject({ status: 503 });
  });

  it("rejects malformed JSON rather than coercing or repairing a learning result", async () => {
    const response = geminiResponse(valid);
    response.candidates![0].content!.parts = [{ text: "```json\n{score:1}\n```" }];
    mocks.generateContent.mockResolvedValueOnce(response);
    await expect(structured(schema, "check", "Check.", "Data")).rejects.toMatchObject({ status: 503 });
  });

  it.each([FinishReason.MAX_TOKENS, FinishReason.RECITATION, FinishReason.OTHER])("rejects non-completed output even when the JSON is valid (%s)", async finish => {
    mocks.generateContent.mockResolvedValueOnce(geminiResponse(valid, finish));
    await expect(structured(schema, "check", "Check.", "Data")).rejects.toMatchObject({ status: 503 });
  });

  it("handles a safety refusal without exposing the raw provider response", async () => {
    mocks.generateContent.mockResolvedValueOnce(geminiResponse(valid, FinishReason.SAFETY));
    await expect(structured(schema, "check", "Check.", "Data")).rejects.toMatchObject({ status: 422 });
  });

  it("does not accept thought text as the structured result", async () => {
    const response = geminiResponse(valid);
    response.candidates![0].content!.parts = [{ text: "Internal thought, not JSON.", thought: true }, { text: JSON.stringify(valid) }];
    mocks.generateContent.mockResolvedValueOnce(response);
    await expect(structured(schema, "check", "Check.", "Data")).resolves.toEqual(valid);
  });

  it("keeps secrets, submitted text and provider messages out of logs and returned errors", async () => {
    const privateDetails = "test-gemini-key private-student-data";
    mocks.generateContent.mockRejectedValueOnce(geminiError(403, privateDetails));
    await expect(structured(schema, "check", "Check.", privateDetails)).rejects.toMatchObject({ status: 503, message: expect.not.stringContaining(privateDetails) });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(privateDetails);
  });
});

const generatedQuestion = {
  prompt: currentQuestion.prompt, options: currentQuestion.options, correct_answer: currentQuestion.correct_answer,
  explanation: currentQuestion.explanation, rubric: currentQuestion.rubric,
};
const lesson = { title: "Charge flow", explanation: currentConcept.content.explanation, example: "If 9 C of charge passes in 3 s, the current is 3 A.", approach: "Conservation of charge", takeaway: "Current is not used up by a lamp." };

describe("Gemini learning contracts", () => {
  it.each(["diagnostic", "revision"] as const)("generates and independently checks a %s question without a teaching hint", async kind => {
    mocks.generateContent.mockResolvedValueOnce(geminiResponse({ question: generatedQuestion, lesson: null }));
    mocks.generateContent.mockResolvedValueOnce(geminiResponse({ valid: true, reason: "Independently solved." }));
    await expect(generateStep(learningState(), currentConcept, "easy", kind, [], [currentQuestion])).resolves.toEqual({ question: generatedQuestion, lesson: null });
    expect(mocks.generateContent).toHaveBeenCalledTimes(2);
    const context = JSON.parse(requestText(mocks.generateContent.mock.calls[0][0].contents));
    expect(context).toMatchObject({ kind, difficulty: "easy", includeLesson: false, validated_reference_questions: [currentQuestion] });
  });

  it.each(["scratch", "prior"] as const)("provides personalized teaching in %s mode when teaching is needed", async mode => {
    const state = learningState(); state.enrollment.mode = mode; state.session.next_action = "reteach";
    mocks.generateContent.mockResolvedValueOnce(geminiResponse({ question: generatedQuestion, lesson }));
    mocks.generateContent.mockResolvedValueOnce(geminiResponse({ valid: true, reason: "Correct and no answer leakage." }));
    await expect(generateStep(state, currentConcept, "medium", "learning", [])).resolves.toMatchObject({ lesson });
    const context = JSON.parse(requestText(mocks.generateContent.mock.calls[0][0].contents));
    expect(context).toMatchObject({ mode, difficulty: "medium", next_action: "reteach", includeLesson: true });
  });

  it("regenerates questions that fail independent verification", async () => {
    mocks.generateContent.mockResolvedValueOnce(geminiResponse({ question: generatedQuestion, lesson: null }));
    mocks.generateContent.mockResolvedValueOnce(geminiResponse({ valid: false, reason: "Ambiguous prompt." }));
    const revised = { ...generatedQuestion, prompt: "A series lamp has 3 A entering it in steady state. What current leaves it, and why?", correct_answer: "3 A" };
    mocks.generateContent.mockResolvedValueOnce(geminiResponse({ question: revised, lesson: null }));
    mocks.generateContent.mockResolvedValueOnce(geminiResponse({ valid: true, reason: "Valid." }));
    await expect(generateStep(learningState(), currentConcept, "easy", "diagnostic", [])).resolves.toMatchObject({ question: revised });
    expect(mocks.generateContent).toHaveBeenCalledTimes(4);
  });

  it("grades the answer and reasoning separately and preserves misconception-driven reteaching", async () => {
    const reasoning = "The lamp uses up electric current. I guessed that 2 A leaves.";
    mocks.generateContent.mockImplementation(async (request: GenerateContentParameters) => {
      const instructions = String(request.config?.systemInstruction);
      if (instructions.includes("Task: answer_evaluation")) return geminiResponse({ answer_score: 1, correctness: "correct", feedback: "The current is 2 A." });
      return geminiResponse({ reasoning_score: 0.1, reasoning_verdict: "flawed", reasoning_feedback: "A lamp transfers energy, but charge is conserved.", misconceptions: [{ key: "current-used-up", description: "Current is used up by a lamp.", evidence: "The lamp uses up electric current." }], resolved_misconceptions: [] });
    });
    const result = await evaluateAnswer(currentQuestion, currentConcept, "2 A", reasoning, false, []);
    expect(result).toMatchObject({ correctness: "correct", reasoning_verdict: "flawed", misconceptions: [{ key: "current-used-up" }] });
    const first = JSON.parse(requestText(mocks.generateContent.mock.calls[0][0].contents));
    const second = JSON.parse(requestText(mocks.generateContent.mock.calls[1][0].contents));
    expect(first).not.toHaveProperty("reasoning");
    expect(second.reasoning).toBe(reasoning);
    expect(evidenceScore(result)).toBeLessThanOrEqual(0.4);
    const mastery = updateMastery(undefined, result, "easy", false, currentQuestion.enrollment_id, currentConcept.id);
    expect(nextAction(result, mastery, true, false)).toBe("reteach");
  });

  it("rejects the whole evaluation if either evidence channel fails", async () => {
    mocks.generateContent.mockResolvedValueOnce(geminiResponse({ answer_score: 1, correctness: "correct", feedback: "Correct answer." }));
    mocks.generateContent.mockRejectedValueOnce(geminiError(429, "Quota exceeded", "RESOURCE_EXHAUSTED"));
    await expect(evaluateAnswer(currentQuestion, currentConcept, "2 A", "Charge is conserved.", false, [])).rejects.toMatchObject({ status: 503 });
  });
});
