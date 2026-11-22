import { writeFile } from "node:fs/promises";
import { defaultCourses } from "./catalog/index.mjs";

const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const json = value => `$c$${JSON.stringify(value)}$c$::jsonb`;
const seenCourses = new Set();
const seenConcepts = new Set();
const seenSlugs = new Set();
let conceptTotal = 0;
let prerequisiteTotal = 0;

const courseRows = [];
const conceptRows = [];
const prerequisiteRows = [];

for (const course of defaultCourses) {
  if (seenCourses.has(course.id)) throw new Error(`Duplicate course id ${course.id}`);
  seenCourses.add(course.id);
  courseRows.push(`(${[course.id, course.title, course.subject, course.grade, course.description, "published"].map(quote).join(",")})`);
  const bySlug = new Map();
  for (const [index, concept] of course.concepts.entries()) {
    if (index !== (concept.orderIndex ?? index)) throw new Error(`${course.title}: unexpected order for ${concept.slug}`);
    if (seenConcepts.has(concept.id)) throw new Error(`Duplicate concept id ${concept.id}`);
    seenConcepts.add(concept.id);
    const slugKey = `${course.id}:${concept.slug}`;
    if (seenSlugs.has(slugKey)) throw new Error(`Duplicate concept slug ${slugKey}`);
    seenSlugs.add(slugKey);
    if (concept.prerequisites.some(slug => !bySlug.has(slug))) throw new Error(`${course.title}/${concept.slug}: prerequisite must appear earlier in the course`);
    bySlug.set(concept.slug, concept);
    conceptRows.push(`(${[quote(concept.id), quote(course.id), quote(concept.slug), quote(concept.title), quote(concept.summary), String(index), json({ explanation: concept.explanation, examples: concept.examples, misconceptions: concept.misconceptions, revision_notes: concept.revisionNotes })].join(",")})`);
    conceptTotal += 1;
    for (const slug of concept.prerequisites) {
      const prerequisite = bySlug.get(slug);
      prerequisiteRows.push(`(${quote(course.id)},${quote(concept.id)},${quote(prerequisite.id)})`);
      prerequisiteTotal += 1;
    }
  }
}

const sql = `-- Default catalogue for Classes 10, 11 and 12 in all five subjects. Generated from scripts/catalog; idempotent.
-- Physics is shipped by migrations 002-004; this adds Chemistry, Mathematics, Biology and English.
insert into public.courses(id,title,subject,grade,description,status) values
${courseRows.join(",\n")}
on conflict (id) do nothing;

insert into public.concepts(id,course_id,slug,title,summary,order_index,content) values
${conceptRows.join(",\n")}
on conflict (id) do nothing;

insert into public.prerequisites(course_id,concept_id,prerequisite_id) values
${prerequisiteRows.join(",\n")}
on conflict do nothing;
`;

await writeFile(new URL("../supabase/migrations/202611210006_default_courses_all_subjects.sql", import.meta.url), sql);
console.log(`wrote migration: ${defaultCourses.length} courses, ${conceptTotal} concepts, ${prerequisiteTotal} prerequisites`);
