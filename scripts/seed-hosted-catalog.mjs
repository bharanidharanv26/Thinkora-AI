// Seeds the hosted project with every published course, concept and prerequisite.
// Usage: node --env-file=.env.local scripts/seed-hosted-catalog.mjs
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or a service role key.");

const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth; create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  grant usage on schema auth to authenticated, service_role;
  create schema storage;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
  grant usage on schema storage to authenticated, service_role;
  grant select on storage.objects to authenticated;
`);
const dir = new URL("../supabase/migrations/", import.meta.url);
const migrations = (await readdir(dir)).filter(file => file.endsWith(".sql")).sort();
for (const migration of migrations) await db.exec(await readFile(new URL(migration, dir), "utf8"));
await db.exec(await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8"));

const courses = (await db.query("select id,title,subject,grade,description,status from courses where status='published' order by grade,subject,title")).rows;
const concepts = (await db.query("select id,course_id,slug,title,summary,order_index,content from concepts where course_id in (select id from courses where status='published') order by course_id,order_index")).rows;
const prerequisites = (await db.query("select course_id,concept_id,prerequisite_id from prerequisites where course_id in (select id from courses where status='published')")).rows;
const questionBank = (await db.query("select concept_id,difficulty,prompt,options,correct_answer,explanation,rubric from question_bank")).rows;

async function upsert(table, rows, conflict) {
  for (let index = 0; index < rows.length; index += 100) {
    const chunk = rows.slice(index, index + 100);
    const response = await fetch(`${url}/rest/v1/${table}?on_conflict=${encodeURIComponent(conflict)}`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(chunk),
    });
    if (!response.ok) throw new Error(`${table} upsert failed (${response.status}): ${await response.text()}`);
  }
  console.log(`${table}: ${rows.length} rows upserted`);
}

await upsert("courses", courses, "id");
await upsert("concepts", concepts, "id");
await upsert("prerequisites", prerequisites, "concept_id,prerequisite_id");
await upsert("question_bank", questionBank, "concept_id,prompt");

for (const [table, expected] of [["courses", courses.length], ["concepts", concepts.length], ["prerequisites", prerequisites.length], ["question_bank", questionBank.length]]) {
  const filter = table === "courses" ? "status=eq.published" : "";
  const response = await fetch(`${url}/rest/v1/${table}?select=${table === "prerequisites" ? "concept_id" : "id"}${filter ? `&${filter}` : ""}&limit=1000`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" } });
  if (!response.ok) throw new Error(`${table} verification failed: ${await response.text()}`);
  const rows = await response.json();
  if (rows.length < expected) throw new Error(`${table}: hosted project has ${rows.length} rows, expected at least ${expected}`);
  console.log(`${table}: verified ${rows.length} rows`);
}
await db.close();
