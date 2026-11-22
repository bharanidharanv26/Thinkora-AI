import { ApiError, FinishReason, GenerateContentResponse, type Content } from "@google/genai";

export function geminiResponse(value: unknown, finishReason = FinishReason.STOP) {
  const response = new GenerateContentResponse();
  response.responseId = "test-response";
  response.candidates = [{ finishReason, content: { role: "model", parts: [{ text: JSON.stringify(value) }] } }];
  return response;
}

export function geminiError(status: number, message: string, code = "PERMISSION_DENIED") {
  return new ApiError({ status, message: JSON.stringify({ error: { code: status, status: code, message } }) });
}

export function requestText(contents: Content[]) {
  return contents.flatMap(content => content.parts ?? []).map(part => part.text ?? "").join("\n");
}
