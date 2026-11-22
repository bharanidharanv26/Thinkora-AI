// Creates one paste-ready SQL transaction for installations predating migration 005.
// Usage: node scripts/build-connection-upgrade.mjs
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const migrations = [
  "202611210005_teacher_ids_and_two_way_connections.sql",
  "202611210007_course_ownership_and_permissions.sql",
  "202611220008_direct_teacher_student_connections.sql",
];
const sections = await Promise.all(migrations.map(async name =>
  `-- ${name}\n${await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8")}`));
const output = new URL("../supabase/.temp/connection-flow-upgrade.sql", import.meta.url);
await mkdir(new URL("../supabase/.temp/", import.meta.url), { recursive: true });
await writeFile(output, `-- Run in the Thinkora AI project's Supabase SQL editor.\n-- Updates connection/course permissions and preserves saved learning records.\nbegin;\n\n${sections.join("\n\n")}\n\ncommit;\n`);
console.log(`SQL upgrade ready: ${fileURLToPath(output)}`);
