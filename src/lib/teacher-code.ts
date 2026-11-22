export function teacherCodeFor(id: string) {
  return `THT-${id.replaceAll("-", "").slice(0, 10).toUpperCase()}`;
}
