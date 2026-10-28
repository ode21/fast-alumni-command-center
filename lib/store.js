import { neon } from "@neondatabase/serverless";
let ready;
export function sqlClient() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url)
    throw Object.assign(
      Error("Database belum tersambung. Silakan hubungi pengelola."),
      { status: 503 },
    );
  return neon(url);
}
export function emptyWorkspace() {
  return {
    version: 3,
    chief: "Jendral Pemenangan",
    target: 100,
    chairs: [],
    pics: [],
    teams: [],
    orgs: [],
    voters: [],
    logs: [],
  };
}
export async function database() {
  const sql = sqlClient();
  if (!ready)
    ready = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS fast_workspace (id integer PRIMARY KEY CHECK(id=1), payload jsonb NOT NULL, revision integer NOT NULL DEFAULT 0)`;
      await sql`CREATE TABLE IF NOT EXISTS fast_registrations (id uuid PRIMARY KEY, phone text NOT NULL UNIQUE, alumni_key text NOT NULL UNIQUE, payload jsonb NOT NULL, status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now())`;
      await sql`CREATE TABLE IF NOT EXISTS fast_rate_limits (key text PRIMARY KEY, attempts integer NOT NULL DEFAULT 1, expires_at timestamptz NOT NULL)`;
      await sql`INSERT INTO fast_workspace (id,payload) VALUES (1,${JSON.stringify(emptyWorkspace())}::jsonb) ON CONFLICT DO NOTHING`;
    })().catch((e) => {
      ready = undefined;
      throw e;
    });
  await ready;
  return sql;
}
export async function workspace(sql) {
  return (await sql`SELECT payload,revision FROM fast_workspace WHERE id=1`)[0];
}
