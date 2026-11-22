export const MAX_SYLLABUS_BYTES = 10 * 1024 * 1024;
export const SYLLABUS_FORMATS: Record<string, string> = {
  pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp",
  txt: "text/plain", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function syllabusFormat(name: string) {
  const extension = name.split(".").at(-1)?.toLowerCase() ?? "";
  const mime = Object.hasOwn(SYLLABUS_FORMATS, extension) ? SYLLABUS_FORMATS[extension] : undefined;
  return mime ? { extension, mime } : null;
}

export type SignedSyllabusUpload = { path: string; token: string; ticket: string; contentType: string };
