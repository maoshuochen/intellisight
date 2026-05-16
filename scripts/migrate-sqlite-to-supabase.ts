import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import Database from "better-sqlite3";
import { config } from "dotenv";

config({ path: "apps/api/.env" });
config();

const sqlitePath = process.env.SQLITE_PATH ?? path.resolve("backend/database.db");
const projectName = process.env.MIGRATION_PROJECT_NAME ?? "Legacy IntelliSight Project";
let ownerUserId = process.env.MIGRATION_OWNER_USER_ID;
const ownerEmail = process.env.MIGRATION_OWNER_EMAIL;
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

if (!fs.existsSync(sqlitePath)) {
  throw new Error(`SQLite database not found: ${sqlitePath}`);
}

const sqlite = new Database(sqlitePath, { readonly: true });
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

if (!ownerUserId) {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  const user = ownerEmail ? data.users.find((item) => item.email === ownerEmail) : data.users[0];
  if (!user) {
    throw new Error("No Supabase Auth user found. Create/sign up a user first, or pass MIGRATION_OWNER_USER_ID.");
  }
  ownerUserId = user.id;
}

type Row = Record<string, unknown>;

function rows(table: string): Row[] {
  return sqlite.prepare(`select * from ${table}`).all() as Row[];
}

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .upsert({ user_id: ownerUserId, display_name: "Migrated owner" })
  .select("*")
  .single();
if (profileError) throw profileError;

const { data: project, error: projectError } = await supabase
  .from("projects")
  .insert({ name: projectName, created_by: profile.user_id })
  .select("*")
  .single();
if (projectError) throw projectError;

await supabase.from("project_members").insert({
  project_id: project.id,
  user_id: ownerUserId,
  role: "owner"
});

const groupIdMap = new Map<number, string>();
for (const group of rows("code_group")) {
  const { data, error } = await supabase
    .from("code_groups")
    .insert({
      project_id: project.id,
      name: String(group.name ?? "Group"),
      color: String(group.color ?? "blue"),
      sort_order: Number(group.id ?? 0)
    })
    .select("*")
    .single();
  if (error) throw error;
  groupIdMap.set(Number(group.id), data.id);
}

const codeIdMap = new Map<number, string>();
for (const code of rows("code")) {
  const groupId = groupIdMap.get(Number(code.code_group_id));
  if (!groupId) continue;
  const { data, error } = await supabase
    .from("codes")
    .insert({
      project_id: project.id,
      code_group_id: groupId,
      name: String(code.name ?? "Code"),
      owner: code.owner ? String(code.owner) : null
    })
    .select("*")
    .single();
  if (error) throw error;
  codeIdMap.set(Number(code.id), data.id);
}

const interviewRows = rows("interview");
const { data: interview, error: interviewError } = await supabase
  .from("interviews")
  .insert({
    project_id: project.id,
    name: String(interviewRows[0]?.name ?? "Migrated interview"),
    sample: interviewRows[0]?.sample ? String(interviewRows[0].sample) : null,
    owner: interviewRows[0]?.owner ? String(interviewRows[0].owner) : null,
    length: interviewRows[0]?.length ? String(interviewRows[0].length) : null
  })
  .select("*")
  .single();
if (interviewError) throw interviewError;

const paragraphIdMap = new Map<number, string>();
for (const paragraph of rows("paragraph")) {
  const { data, error } = await supabase
    .from("paragraphs")
    .insert({
      project_id: project.id,
      interview_id: interview.id,
      text: String(paragraph.text ?? ""),
      speaker: paragraph.speaker ? String(paragraph.speaker) : null,
      start_time: paragraph.start_time ? String(paragraph.start_time) : null,
      end_time: paragraph.end_time ? String(paragraph.end_time) : null,
      sort_order: Number(paragraph.id ?? 0)
    })
    .select("*")
    .single();
  if (error) throw error;
  paragraphIdMap.set(Number(paragraph.id), data.id);
}

const highlightMeta = new Map<number, Row>();
for (const meta of rows("highlight_meta")) {
  highlightMeta.set(Number(meta.id), meta);
}

const mergeRows = rows("annotation_code_merge");
for (const annotation of rows("annotation")) {
  const paragraphId = paragraphIdMap.get(Number(annotation.paragraph_id));
  if (!paragraphId) continue;
  const startMeta = highlightMeta.get(Number(annotation.start_meta_id));
  const endMeta = highlightMeta.get(Number(annotation.end_meta_id));
  const { data, error } = await supabase
    .from("annotations")
    .insert({
      project_id: project.id,
      paragraph_id: paragraphId,
      text: String(annotation.text ?? ""),
      start_offset: Number(startMeta?.text_offset ?? 0),
      end_offset: Number(endMeta?.text_offset ?? String(annotation.text ?? "").length),
      legacy_highlight: { startMeta, endMeta }
    })
    .select("*")
    .single();
  if (error) throw error;

  const links = mergeRows
    .filter((row) => Number(row.annotation_id) === Number(annotation.id))
    .map((row) => codeIdMap.get(Number(row.code_id)))
    .filter((id): id is string => Boolean(id))
    .map((codeId) => ({ project_id: project.id, annotation_id: data.id, code_id: codeId }));

  if (links.length) {
    const { error: linkError } = await supabase.from("annotation_codes").insert(links);
    if (linkError) throw linkError;
  }
}

console.log(`Migrated SQLite data into project ${project.id}`);
