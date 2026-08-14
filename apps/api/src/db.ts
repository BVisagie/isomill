import pg from "pg";
import type { BuildStatus, MachineDefinition } from "@isomill/schema";

const { Pool } = pg;

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgres://isomill:isomill@localhost:5432/isomill",
});

export interface BuildRow {
  id: string;
  status: BuildStatus;
  definition: MachineDefinition;
  error: string | null;
  previous_fingerprint: string | null;
  observed_fingerprint: string | null;
  key_url: string | null;
  key_docs_url: string | null;
  publisher: string | null;
  iso_path: string | null;
  iso_sha256: string | null;
  provenance: unknown | null;
  created_at: Date;
  updated_at: Date;
}

export async function migrate(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS builds (
      id UUID PRIMARY KEY,
      status TEXT NOT NULL,
      definition JSONB NOT NULL,
      error TEXT,
      previous_fingerprint TEXT,
      observed_fingerprint TEXT,
      key_url TEXT,
      key_docs_url TEXT,
      publisher TEXT,
      iso_path TEXT,
      iso_sha256 TEXT,
      provenance JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS observed_keys (
      key_url TEXT PRIMARY KEY,
      fingerprint TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

export async function insertBuild(id: string, definition: MachineDefinition): Promise<BuildRow> {
  const { rows } = await pool.query<BuildRow>(
    `INSERT INTO builds (id, status, definition) VALUES ($1, 'QUEUED', $2)
     RETURNING *`,
    [id, definition],
  );
  return rows[0]!;
}

export async function getBuild(id: string): Promise<BuildRow | undefined> {
  const { rows } = await pool.query<BuildRow>(`SELECT * FROM builds WHERE id = $1`, [id]);
  return rows[0];
}

export async function claimQueued(): Promise<BuildRow | undefined> {
  const { rows } = await pool.query<BuildRow>(`
    UPDATE builds SET status = 'RESOLVING', updated_at = now()
    WHERE id = (
      SELECT id FROM builds WHERE status IN ('QUEUED', 'RESOLVING')
      AND status = 'QUEUED'
      ORDER BY created_at
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *
  `);
  return rows[0];
}

export async function updateBuild(
  id: string,
  fields: Partial<{
    status: BuildStatus;
    error: string | null;
    previous_fingerprint: string | null;
    observed_fingerprint: string | null;
    key_url: string | null;
    key_docs_url: string | null;
    publisher: string | null;
    iso_path: string | null;
    iso_sha256: string | null;
    provenance: unknown;
  }>,
): Promise<BuildRow> {
  const sets: string[] = ["updated_at = now()"];
  const values: unknown[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(fields)) {
    sets.push(`${k} = $${i++}`);
    values.push(v);
  }
  values.push(id);
  const { rows } = await pool.query<BuildRow>(
    `UPDATE builds SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
    values,
  );
  return rows[0]!;
}

export async function getObservedFingerprint(keyUrl: string): Promise<string | undefined> {
  const { rows } = await pool.query<{ fingerprint: string }>(
    `SELECT fingerprint FROM observed_keys WHERE key_url = $1`,
    [keyUrl],
  );
  return rows[0]?.fingerprint;
}

export async function setObservedFingerprint(keyUrl: string, fingerprint: string): Promise<void> {
  await pool.query(
    `INSERT INTO observed_keys (key_url, fingerprint, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (key_url) DO UPDATE SET fingerprint = $2, updated_at = now()`,
    [keyUrl, fingerprint],
  );
}
