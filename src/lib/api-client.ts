"use client";
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store",
    ...(body instanceof FormData ? { body } : body !== undefined ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  let data;
  try { data = await response.json(); } catch {
    if (response.status === 413) throw new Error("The upload is too large for this request. Refresh the page and try again using the direct file uploader.");
    if (response.status === 504) throw new Error("This request took too long. Reload your saved course before retrying.");
    if (response.status === 429) throw new Error("Too many requests. Please wait a moment and try again.");
    throw new Error("The server could not finish this request. Check your connection and try again.");
  }
  if (!response.ok) throw new Error(data.error || "The request could not be completed.");
  return data as T;
}
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Something went wrong. Please try again.";
